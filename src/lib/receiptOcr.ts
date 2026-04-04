import type { Worker } from "tesseract.js";
import type { PreparedReceiptImage } from "./receiptImagePrep";

/**
 * クライアント側 OCR の戻り値。
 * 将来サーバーOCRや外部APIに差し替える場合も、この形を維持しやすい。
 */
export type ReceiptOcrResult = {
  /** 全文1回目のテキスト（画面の「全文」表示用） */
  fullText: string;
  /** キーワード近傍を切り出して再OCRしたテキスト（合計推定用に結合する） */
  refinementTexts: string[];
  /** 金額専用OCR（右側列・ホワイトリスト・キーワード枠の再読取）のテキスト */
  amountPassTexts: string[];
};

export type ReceiptOcrProgress = {
  status: string;
  /** 0–100 相当（利用可能なときのみ） */
  percent?: number;
};

type Bbox = { x0: number; y0: number; x1: number; y1: number };
type TessLine = { text: string | null; bbox: Bbox };
type TessPara = { lines: TessLine[] };
type TessBlock = { paragraphs: TessPara[] };

type Rect = { left: number; top: number; width: number; height: number };

/** 1回目OCRの行から、合計近傍として切り出す候補を作るキーワード */
const REGION_TRIGGERS: { needle: string; maxLineLen?: number; requireMoneyMark?: boolean }[] = [
  { needle: "総合計" },
  { needle: "税込合計" },
  { needle: "税込" },
  { needle: "お買上金額" },
  { needle: "お買上げ金額" },
  { needle: "お買上" },
  { needle: "合計" },
  { needle: "現計" },
  { needle: "ご利用金額" },
  { needle: "お支払い金額" },
  { needle: "お支払金額" },
  { needle: "領収金額" },
  { needle: "ご請求金額" },
  { needle: "お会計" },
  { needle: "小計" },
  { needle: "総額" },
  { needle: "AMOUNT" },
  { needle: "TOTAL" },
  { needle: "金額", maxLineLen: 36, requireMoneyMark: true },
];

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function collectLines(blocks: TessBlock[] | null): TessLine[] {
  if (!blocks?.length) return [];
  const out: TessLine[] = [];
  for (const b of blocks) {
    for (const p of b.paragraphs ?? []) {
      for (const l of p.lines ?? []) {
        out.push(l);
      }
    }
  }
  return out;
}

function lineTriggersRegion(text: string): boolean {
  const t = text.normalize("NFKC").trim();
  if (!t) return false;
  for (const rule of REGION_TRIGGERS) {
    if (!t.includes(rule.needle)) continue;
    if (rule.maxLineLen && t.length > rule.maxLineLen) {
      if (rule.requireMoneyMark && !/[¥￥円]/.test(t)) continue;
    }
    return true;
  }
  return false;
}

function expandLineRect(bbox: Bbox, imgW: number, imgH: number): Rect {
  const { x0, y0, x1, y1 } = bbox;
  const lh = Math.max(10, y1 - y0);
  const padX = Math.round(imgW * 0.04);
  const padY = Math.round(imgH * 0.022);
  const down = Math.round(lh * 1.45);
  const left = clamp(Math.floor(x0 - padX), 0, imgW - 1);
  const top = clamp(Math.floor(y0 - padY), 0, imgH - 1);
  const right = clamp(Math.ceil(x1 + padX), left + 2, imgW);
  const bottom = clamp(Math.ceil(y1 + down), top + 2, imgH);
  return { left, top, width: right - left, height: bottom - top };
}

function rectArea(r: Rect): number {
  return r.width * r.height;
}

function rectIoU(a: Rect, b: Rect): number {
  const x0 = Math.max(a.left, b.left);
  const y0 = Math.max(a.top, b.top);
  const x1 = Math.min(a.left + a.width, b.left + b.width);
  const y1 = Math.min(a.top + a.height, b.top + b.height);
  const iw = Math.max(0, x1 - x0);
  const ih = Math.max(0, y1 - y0);
  const inter = iw * ih;
  const u = rectArea(a) + rectArea(b) - inter;
  return u <= 0 ? 0 : inter / u;
}

function unionRect(a: Rect, b: Rect): Rect {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  const right = Math.max(a.left + a.width, b.left + b.width);
  const bottom = Math.max(a.top + a.height, b.top + b.height);
  return { left, top, width: right - left, height: bottom - top };
}

function mergeOverlappingRects(rects: Rect[], iouThreshold: number): Rect[] {
  let list = [...rects];
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (rectIoU(list[i], list[j]) >= iouThreshold) {
          const u = unionRect(list[i], list[j]);
          list = list.filter((_, k) => k !== i && k !== j);
          list.push(u);
          changed = true;
          break outer;
        }
      }
    }
  }
  return list;
}

const MAX_REGION_PASSES = 8;
const MAX_KEYWORD_AMOUNT_WHITELIST_PASSES = 6;

/**
 * 右寄せ金額列になりやすい領域（縦長レシート想定）。
 * - 画像の右 50% 全体
 * - 右 48% × 下 55%（合計行が乗りやすい帯）
 * - 右 52% × 下 45%（やや狭い右下）
 */
function buildFixedAmountColumnRects(imgW: number, imgH: number): Rect[] {
  const lh = Math.floor(0.5 * imgW);
  const r1: Rect = { left: lh, top: 0, width: imgW - lh, height: imgH };
  const l2 = Math.floor(0.48 * imgW);
  const t2 = Math.floor(0.45 * imgH);
  const r2: Rect = { left: l2, top: t2, width: imgW - l2, height: imgH - t2 };
  const l3 = Math.floor(0.52 * imgW);
  const t3 = Math.floor(0.55 * imgH);
  const r3: Rect = { left: l3, top: t3, width: imgW - l3, height: imgH - t3 };
  const merged = mergeOverlappingRects([r1, r2, r3], 0.5);
  return merged.filter((r) => r.width >= 28 && r.height >= 28);
}

async function restoreDefaultOcrParams(
  worker: Worker,
  psmAuto: import("tesseract.js").PSM
): Promise<void> {
  await worker.setParameters({
    tessedit_char_whitelist: "",
    tessedit_pageseg_mode: psmAuto,
  });
}

/**
 * 前処理済み画像に対し、全文OCR → キーワード近傍再OCR → 金額専用OCR（固定右列＋キーワード枠の数字優先読取）。
 * tesseract.js は動的 import。
 */
export async function runReceiptOcr(
  prepared: PreparedReceiptImage,
  onProgress?: (p: ReceiptOcrProgress) => void
): Promise<ReceiptOcrResult> {
  const { createWorker, PSM } = await import("tesseract.js");
  const image = prepared.blob;
  const imgW = prepared.width;
  const imgH = prepared.height;

  let worker: Worker | undefined;
  try {
    onProgress?.({ status: "OCRエンジンを準備しています…" });
    worker = await createWorker("jpn+eng", 1, {
      logger: (ev) => {
        if (ev.status === "loading tesseract core") {
          onProgress?.({ status: "OCRを読み込み中…（初回は数秒かかることがあります）" });
        } else if (ev.status === "loading language traineddata") {
          onProgress?.({ status: "言語データを読み込み中…" });
        } else if (ev.status === "initializing tesseract") {
          onProgress?.({ status: "OCRを初期化しています…" });
        } else if (ev.status === "recognizing text") {
          const pct =
            typeof ev.progress === "number" ? Math.min(100, Math.round(ev.progress * 100)) : undefined;
          onProgress?.({ status: "文字を認識しています…", percent: pct });
        }
      },
    });

    const { data: page } = await worker.recognize(image);
    const fullText = (page.text ?? "").trim();

    const lines = collectLines(page.blocks as TessBlock[] | null);
    const rects: Rect[] = [];
    for (const ln of lines) {
      const t = ln.text ?? "";
      if (!lineTriggersRegion(t)) continue;
      rects.push(expandLineRect(ln.bbox, imgW, imgH));
    }

    const merged = mergeOverlappingRects(rects, 0.42);
    merged.sort((a, b) => rectArea(b) - rectArea(a));
    const picked = merged.slice(0, MAX_REGION_PASSES);

    const refinementTexts: string[] = [];
    let ri = 0;
    for (const rect of picked) {
      ri += 1;
      onProgress?.({
        status: `合計付近を再読み取りしています…（${ri}/${picked.length}）`,
      });
      const { data: sub } = await worker.recognize(image, { rectangle: rect });
      const chunk = (sub.text ?? "").trim();
      if (chunk.length > 0) {
        refinementTexts.push(chunk);
      }
    }

    const amountPassTexts: string[] = [];
    const pushChunk = (t: string) => {
      const c = t.trim();
      if (c.length > 0) amountPassTexts.push(c);
    };

    await worker.setParameters({
      tessedit_char_whitelist: "0123456789¥￥,.+-円 ",
      // WorkerParams の PSM 型と実体（文字列）の整合
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK as unknown as import("tesseract.js").PSM,
    });

    const fixedRects = buildFixedAmountColumnRects(imgW, imgH);
    let ai = 0;
    const totalAmountSteps = fixedRects.length + Math.min(picked.length, MAX_KEYWORD_AMOUNT_WHITELIST_PASSES);
    for (const rect of fixedRects) {
      ai += 1;
      onProgress?.({ status: `金額列を読み取り中…（${ai}/${totalAmountSteps}）` });
      const { data: am } = await worker.recognize(image, { rectangle: rect });
      pushChunk(am.text ?? "");
    }

    for (let ki = 0; ki < Math.min(picked.length, MAX_KEYWORD_AMOUNT_WHITELIST_PASSES); ki++) {
      ai += 1;
      onProgress?.({ status: `金額列を読み取り中…（${ai}/${totalAmountSteps}）` });
      const { data: am } = await worker.recognize(image, { rectangle: picked[ki] });
      pushChunk(am.text ?? "");
    }

    await restoreDefaultOcrParams(worker, PSM.AUTO as unknown as import("tesseract.js").PSM);

    return { fullText, refinementTexts, amountPassTexts };
  } finally {
    if (worker) {
      await worker.terminate().catch(() => undefined);
    }
  }
}
