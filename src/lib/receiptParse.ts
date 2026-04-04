/**
 * OCR テキストから「合計らしき金額」と補助情報を推定する（自動確定しない前提のヒューリスティクス）。
 */

import { collectIncompleteYenVariants, normalizeAmountOcrRaw } from "./receiptAmountNormalize";

export type TotalAmountCandidate = {
  /** 円（整数） */
  yen: number;
  /** ユーザー向け説明 */
  reason: string;
  /** 大きいほど優先（候補の並び順） */
  score: number;
};

export type DateCandidate = {
  /** YYYY-MM-DD */
  iso: string;
  /** OCR上の表記 */
  label: string;
};

const TOTAL_LINE_HINTS: { needle: string; label: string; keywordWeight: number }[] = [
  { needle: "総合計", label: "総合計", keywordWeight: 125 },
  { needle: "税込合計", label: "税込合計", keywordWeight: 122 },
  { needle: "税込", label: "税込", keywordWeight: 98 },
  { needle: "お買上金額", label: "お買上金額", keywordWeight: 118 },
  { needle: "お買上げ金額", label: "お買上げ金額", keywordWeight: 118 },
  { needle: "お買上", label: "お買上", keywordWeight: 105 },
  { needle: "合計", label: "合計", keywordWeight: 108 },
  { needle: "現計", label: "現計", keywordWeight: 102 },
  { needle: "ご利用金額", label: "ご利用金額", keywordWeight: 112 },
  { needle: "お支払い金額", label: "お支払い金額", keywordWeight: 115 },
  { needle: "お支払金額", label: "お支払金額", keywordWeight: 115 },
  { needle: "領収金額", label: "領収金額", keywordWeight: 110 },
  { needle: "ご請求金額", label: "ご請求金額", keywordWeight: 110 },
  { needle: "お会計", label: "お会計", keywordWeight: 88 },
  { needle: "会計", label: "会計", keywordWeight: 72 },
  { needle: "小計", label: "小計", keywordWeight: 58 },
  { needle: "総額", label: "総額", keywordWeight: 100 },
  { needle: "AMOUNT", label: "AMOUNT", keywordWeight: 70 },
  { needle: "TOTAL", label: "TOTAL", keywordWeight: 70 },
  { needle: "金額", label: "金額", keywordWeight: 62 },
];

const YEAR_ONLY = /^(20[0-3]\d|19\d{2})$/;

/** 長い語を先にマッチ（「お会計」が「会計」に吸われないようにする） */
const TOTAL_LINE_HINTS_LONG_FIRST = [...TOTAL_LINE_HINTS].sort(
  (a, b) => b.needle.length - a.needle.length
);

type TokenHit = { yen: number; tokenScore: number; style: string };

const AMOUNT_PASS_BASE = 228;
const MIN_SCORE_TO_LIST = 8;

/**
 * 1行から金額らしきトークンを拾い、自然な ¥2,063 形式を高スコア、長い生数字列は低スコアにする。
 */
export function extractScoredMoneyTokens(line: string): TokenHit[] {
  const n = line.normalize("NFKC");
  const hits: TokenHit[] = [];
  const seen = new Set<number>();

  const tryAdd = (yen: number, tokenScore: number, style: string) => {
    if (!Number.isFinite(yen) || yen < 1 || yen > 99_999_999) return;
    const rawLen = String(yen).length;
    if (rawLen >= 10) return;
    if (seen.has(yen)) return;
    seen.add(yen);
    hits.push({ yen, tokenScore, style });
  };

  // ¥2,063 / ￥1,234円（最優先）
  const reYen = /(¥|￥)\s*(\d{1,3}(?:,\d{3})+|\d{2,9})(?=\s*円|\s|$|[^\d,])/g;
  let m: RegExpExecArray | null;
  while ((m = reYen.exec(n)) !== null) {
    const digits = m[2].replace(/,/g, "");
    const yen = Number.parseInt(digits, 10);
    const commaStyle = /^\d{1,3}(?:,\d{3})+$/.test(m[2]);
    let ts = 88;
    if (commaStyle) ts += 72;
    const dl = digits.length;
    if (dl >= 4 && dl <= 7) ts += 28;
    if (dl >= 9) ts -= 45;
    tryAdd(yen, ts, commaStyle ? "¥表記+桁区切り" : "¥表記");
  }

  // 2,063円
  const reEn = /(\d{1,3}(?:,\d{3})+)\s*円/g;
  while ((m = reEn.exec(n)) !== null) {
    const yen = Number.parseInt(m[1].replace(/,/g, ""), 10);
    tryAdd(yen, 95 + 70, "桁区切り+円");
  }

  // 残り: 単独のカンマ付き数字（記号なし）
  const reCommaNum = /(?:^|[^\d,])(\d{1,3}(?:,\d{3})+)(?![\d,])/g;
  while ((m = reCommaNum.exec(n)) !== null) {
    const yen = Number.parseInt(m[1].replace(/,/g, ""), 10);
    tryAdd(yen, 55 + 70, "桁区切り");
  }

  // 会員番号・端末番号っぽい「カンマなしの長い生数字」は強く減点（除外まではしない）
  const reBareLong = /(?:^|[^\d])(\d{5,9})(?!\d)/g;
  while ((m = reBareLong.exec(n)) !== null) {
    const yen = Number.parseInt(m[1], 10);
    const len = m[1].length;
    if (len >= 10) continue;
    tryAdd(yen, len <= 4 ? 5 : -125, "生数字列（金額以外の可能性大）");
  }

  return hits;
}

/** @deprecated 互換用。スコアなしの数値一覧が必要な場合に使う */
export function extractYenNumbersFromLine(line: string): number[] {
  return extractScoredMoneyTokens(line).map((h) => h.yen);
}

function pickBestNeedle(line: string): { label: string; weight: number } | null {
  const t = line.normalize("NFKC");
  for (const { needle, label, keywordWeight } of TOTAL_LINE_HINTS_LONG_FIRST) {
    if (t.includes(needle)) {
      return { label, weight: keywordWeight };
    }
  }
  return null;
}

function applyAmountPassAndFallback(
  best: Map<number, { score: number; reason: string }>,
  amountPassTexts: string[],
  put: (yen: number, score: number, reason: string) => void
): void {
  for (const raw of amountPassTexts) {
    const norm = normalizeAmountOcrRaw(raw);
    for (const hit of extractScoredMoneyTokens(norm)) {
      put(hit.yen, AMOUNT_PASS_BASE + hit.tokenScore, `金額専用OCR（${hit.style}）`);
    }
    for (const v of collectIncompleteYenVariants(raw)) {
      if (v >= 1 && v <= 99_999_999) {
        put(v, AMOUNT_PASS_BASE - 15, "金額専用OCR（桁補完候補）");
      }
    }
  }

  const maxScore = best.size ? Math.max(...[...best.values()].map((v) => v.score)) : 0;
  if (maxScore >= 290) return;

  const joined = amountPassTexts.map(normalizeAmountOcrRaw).join("\n");
  if (!joined.trim()) return;

  let pick: { yen: number; ts: number } | null = null;
  for (const hit of extractScoredMoneyTokens(joined)) {
    if (hit.tokenScore < 100) continue;
    if (!pick || hit.yen > pick.yen) pick = { yen: hit.yen, ts: hit.tokenScore };
  }
  if (pick && pick.yen > 0) {
    put(pick.yen, 185 + pick.ts, "右側・金額列フォールバック");
  }
}

/**
 * 全文OCR＋領域再OCRを結合したテキストから、スコア順で複数候補を返す。
 * `amountPassTexts` は金額専用OCRの結果（右列・ホワイトリスト）で、ここを最優先に足し込む。
 */
export function extractTotalCandidates(
  mergedOcrText: string,
  amountPassTexts: string[] = []
): TotalAmountCandidate[] {
  const normalizedMain = normalizeAmountOcrRaw(mergedOcrText.normalize("NFKC"));
  const lines = normalizedMain.split(/\r?\n/).map((l) => l.trim());

  const best = new Map<number, { score: number; reason: string }>();

  const put = (yen: number, score: number, reason: string) => {
    if (!Number.isFinite(yen) || yen < 1 || yen > 99_999_999) return;
    const cur = best.get(yen);
    if (!cur || score > cur.score) {
      best.set(yen, { score, reason });
    }
  };

  let keywordHit = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (/^\d{5,9}$/.test(line)) continue;
    const needleHit = pickBestNeedle(line);
    if (!needleHit) continue;
    keywordHit = true;
    const kw = needleHit.weight;
    const label = needleHit.label;

    for (const hit of extractScoredMoneyTokens(line)) {
      const lineBonus = 22;
      put(hit.yen, kw + hit.tokenScore + lineBonus, `「${label}」付近（${hit.style}）`);
    }
    const next = lines[i + 1];
    if (next && !/^\d{5,9}$/.test(next)) {
      for (const hit of extractScoredMoneyTokens(next)) {
        put(hit.yen, Math.round(kw * 0.82) + hit.tokenScore, `「${label}」の次行（${hit.style}）`);
      }
    }
  }

  if (keywordHit && best.size > 0) {
    applyAmountPassAndFallback(best, amountPassTexts, put);
    return finalizeCandidates(best);
  }

  const fallback = new Map<number, { score: number; reason: string }>();

  for (const line of lines) {
    if (/^\d{5,9}$/.test(line)) continue;
    for (const hit of extractScoredMoneyTokens(line)) {
      if (YEAR_ONLY.test(String(hit.yen))) continue;
      if (hit.yen < 10) continue;
      const sc = hit.tokenScore + 15;
      const cur = fallback.get(hit.yen);
      if (!cur || sc > cur.score) {
        fallback.set(hit.yen, {
          score: sc,
          reason: `OCR内の数値（${hit.style}・合計と一致しない場合があります）`,
        });
      }
    }
  }

  for (const [yen, v] of fallback.entries()) {
    put(yen, v.score, v.reason);
  }

  applyAmountPassAndFallback(best, amountPassTexts, put);

  return finalizeCandidates(best);
}

function finalizeCandidates(m: Map<number, { score: number; reason: string }>): TotalAmountCandidate[] {
  return [...m.entries()]
    .filter(([, v]) => v.score >= MIN_SCORE_TO_LIST)
    .map(([yen, v]) => ({ yen, score: v.score, reason: v.reason }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.yen - a.yen;
    })
    .slice(0, 16);
}

export function extractDateCandidates(ocrText: string, max = 6): DateCandidate[] {
  const n = ocrText.normalize("NFKC");
  const re =
    /(20\d{2})[\s./\-年](0?[1-9]|1[0-2])[\s./\-月](0?[1-9]|[12]\d|3[01])(?:日)?/g;
  const seen = new Set<string>();
  const out: DateCandidate[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(n)) !== null) {
    const y = m[1];
    const mo = m[2].padStart(2, "0");
    const d = m[3].padStart(2, "0");
    const iso = `${y}-${mo}-${d}`;
    if (seen.has(iso)) continue;
    seen.add(iso);
    out.push({ iso, label: m[0].replace(/\s+/g, "") });
    if (out.length >= max) break;
  }
  return out;
}

/**
 * 店名らしき1行（先頭付近・参考表示用。精度は限定的）
 */
export function extractMerchantHint(ocrText: string): string | undefined {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const script = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/;
  for (const line of lines.slice(0, 6)) {
    if (line.length < 2 || line.length > 44) continue;
    if (!script.test(line)) continue;
    if (/^[\d,¥￥\s.\-–—/]+$/.test(line)) continue;
    if (/^\d{1,2}:\d{2}/.test(line)) continue;
    return line;
  }
  return undefined;
}
