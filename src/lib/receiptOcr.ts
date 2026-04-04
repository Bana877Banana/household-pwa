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

/**
 * 前処理済み画像に対し、全文OCR後にキーワード行の近傍だけ再OCRする。
 * tesseract.js は動的 import。
 */
export async function runReceiptOcr(
  prepared: PreparedReceiptImage,
  onProgress?: (p: ReceiptOcrProgress) => void
): Promise<ReceiptOcrResult> {
  const { createWorker } = await import("tesseract.js");
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

    return { fullText, refinementTexts };
  } finally {
    if (worker) {
      await worker.terminate().catch(() => undefined);
    }
  }
}
