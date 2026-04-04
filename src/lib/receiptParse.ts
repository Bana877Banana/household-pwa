/**
 * OCR テキストから「合計らしき金額」と補助情報を推定する（自動確定しない前提のヒューリスティクス）。
 */

export type TotalAmountCandidate = {
  /** 円（整数） */
  yen: number;
  /** ユーザー向け説明 */
  reason: string;
};

export type DateCandidate = {
  /** YYYY-MM-DD */
  iso: string;
  /** OCR上の表記 */
  label: string;
};

const TOTAL_LINE_HINTS: { needle: string; label: string }[] = [
  { needle: "総合計", label: "総合計" },
  { needle: "税込合計", label: "税込合計" },
  { needle: "税込", label: "税込" },
  { needle: "お買上金額", label: "お買上金額" },
  { needle: "お買上げ金額", label: "お買上げ金額" },
  { needle: "お買上", label: "お買上" },
  { needle: "合計", label: "合計" },
  { needle: "現計", label: "現計" },
  { needle: "ご利用金額", label: "ご利用金額" },
  { needle: "お支払い金額", label: "お支払い金額" },
  { needle: "お支払金額", label: "お支払金額" },
  { needle: "領収金額", label: "領収金額" },
  { needle: "ご請求金額", label: "ご請求金額" },
  { needle: "お会計", label: "お会計" },
  { needle: "会計", label: "会計" },
  { needle: "小計", label: "小計" },
  { needle: "総額", label: "総額" },
  { needle: "AMOUNT", label: "AMOUNT" },
  { needle: "TOTAL", label: "TOTAL" },
];

const YEAR_ONLY = /^(20[0-3]\d|19\d{2})$/;

function normalizeDigits(s: string): string {
  return s.normalize("NFKC").replace(/,/g, "");
}

/** 文字列内の円らしき数値をすべて拾う */
export function extractYenNumbersFromLine(line: string): number[] {
  const n = normalizeDigits(line);
  const out: number[] = [];
  const re = /(?:¥|￥)?\s*(\d{1,3}(?:,\d{3})+|\d+)\s*(?:円)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(n)) !== null) {
    const raw = m[1].replace(/,/g, "");
    const v = Number.parseInt(raw, 10);
    if (Number.isFinite(v) && v > 0 && v <= 99_999_999) {
      out.push(v);
    }
  }
  return out;
}

function scoreForHint(label: string): number {
  if (label === "小計") return 50;
  if (label === "会計") return 60;
  return 100;
}

/**
 * キーワード行とその次行から金額候補を集める。同一金額はより強い根拠で上書き。
 */
export function extractTotalCandidates(ocrText: string): TotalAmountCandidate[] {
  const text = ocrText.normalize("NFKC");
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  const best = new Map<number, { score: number; reason: string }>();

  const put = (yen: number, score: number, reason: string) => {
    if (!Number.isFinite(yen) || yen < 1 || yen > 99_999_999) return;
    const cur = best.get(yen);
    if (!cur || score >= cur.score) {
      best.set(yen, { score, reason });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    for (const { needle, label } of TOTAL_LINE_HINTS) {
      if (!line.includes(needle)) continue;
      const base = scoreForHint(label);
      for (const y of extractYenNumbersFromLine(line)) {
        put(y, base + 5, `「${label}」の行に含まれる金額`);
      }
      const next = lines[i + 1];
      if (next) {
        for (const y of extractYenNumbersFromLine(next)) {
          put(y, base, `「${label}」の次の行の金額`);
        }
      }
    }
  }

  const keywordHits = [...best.entries()]
    .map(([yen, v]) => ({ yen, reason: v.reason }))
    .sort((a, b) => b.yen - a.yen);

  if (keywordHits.length > 0) {
    return keywordHits.slice(0, 12);
  }

  /** キーワードが無い場合: 文中の金額を多めに列挙（ユーザーが選ぶ） */
  const fallback = new Map<number, string>();
  for (const line of lines) {
    for (const y of extractYenNumbersFromLine(line)) {
      if (YEAR_ONLY.test(String(y))) continue;
      if (y < 10) continue;
      if (!fallback.has(y)) {
        fallback.set(y, "OCRテキスト内の数値（合計と一致しない場合があります）");
      }
    }
  }
  return [...fallback.entries()]
    .sort((a, b) => b[0] - a[0])
    .slice(0, 15)
    .map(([yen, reason]) => ({ yen, reason }));
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
