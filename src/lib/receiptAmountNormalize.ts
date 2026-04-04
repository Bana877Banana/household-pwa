/**
 * 金額専用OCRの結果向け：記号・桁の誤認を寄せてから数値候補を拾う。
 */

/** よくある OCR 混同を直し、桁区切りのピリオドをカンマ扱いに寄せる */
export function normalizeAmountOcrRaw(s: string): string {
  let t = s.normalize("NFKC");
  t = t.replace(/[Ｏ○〇]/g, "0");
  t = t.replace(/[oｏ]/g, (ch, i, str) => {
    const prev = str[i - 1];
    const next = str[i + 1];
    if ((prev && /\d/.test(prev)) || (next && /\d/.test(next))) return "0";
    return ch;
  });
  t = t.replace(/[lｌ|｜]/g, (ch, i, str) => {
    const prev = str[i - 1];
    const next = str[i + 1];
    if ((prev && /[\d¥￥,.]/.test(prev)) || (next && /[\d¥￥,.]/.test(next))) return "1";
    return ch;
  });
  // 2.063 のようにピリオドが千区切りとして出た場合
  t = t.replace(/(\d)\.(?=\d{3}\b)/g, "$1,");
  return t;
}

/**
 * ¥2,06 のように最下位桁が欠けた表記から、あり得る円額を列挙（例: 2060〜2069）。
 */
export function collectIncompleteYenVariants(s: string): number[] {
  const n = normalizeAmountOcrRaw(s);
  const out = new Set<number>();
  const re = /[¥￥]\s*(\d{1,2})[,.](\d{2})(?!\d)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(n)) !== null) {
    const major = parseInt(m[1], 10);
    const minorStr = m[2];
    const minorNum = parseInt(minorStr, 10);
    if (minorStr.length !== 2) continue;
    if (minorNum < 10) {
      for (let d = 0; d <= 9; d++) {
        out.add(major * 1000 + minorNum * 10 + d);
      }
    } else {
      out.add(major * 1000 + minorNum);
    }
  }
  return [...out];
}
