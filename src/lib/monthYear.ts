/** 今日が属する月 YYYY-MM（ローカル） */
export function currentYmLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** YYYY-MM の月初・月末（occurred_on 比較用、ローカル暦） */
export function monthRangeIso(ym: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const start = `${m[1]}-${m[2]}-01`;
  const endDate = new Date(y, mo, 0);
  const dd = String(endDate.getDate()).padStart(2, "0");
  const end = `${m[1]}-${m[2]}-${dd}`;
  return { start, end };
}

/** 表示用「2026年3月」 */
export function formatMonthLabelJa(ym: string): string {
  const r = monthRangeIso(ym);
  if (!r) return ym;
  const [ys, ms] = ym.split("-");
  return `${ys}年${Number(ms)}月`;
}

/** 月の加算（YYYY-MM） */
export function addMonthsYm(ym: string, delta: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return currentYmLocal();
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = new Date(y, mo - 1 + delta, 1);
  const ny = d.getFullYear();
  const nm = d.getMonth() + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}
