import {
  addDaysIsoLocal,
  compareIsoDate,
  isoDateFromLocal,
  parseIsoDateLocal,
} from "./formatDisplayDate";
import type { RecurringTransactionRule } from "../types/recurring";

function ruleActiveOnDate(rule: RecurringTransactionRule, iso: string): boolean {
  if (compareIsoDate(iso, rule.start_date) < 0) return false;
  if (rule.end_date && compareIsoDate(iso, rule.end_date) > 0) return false;
  return true;
}

function lastDayOfMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

/** ルールが range 内で発火する日付一覧（昇順） */
export function expandRecurringOccurrences(
  rule: RecurringTransactionRule,
  rangeStart: string,
  rangeEnd: string
): string[] {
  if (compareIsoDate(rangeStart, rangeEnd) > 0) return [];

  const effStart = compareIsoDate(rangeStart, rule.start_date) < 0 ? rule.start_date : rangeStart;
  const effEnd =
    rule.end_date && compareIsoDate(rule.end_date, rangeEnd) < 0 ? rule.end_date : rangeEnd;

  if (compareIsoDate(effStart, effEnd) > 0) return [];

  switch (rule.recurrence_type) {
    case "daily":
      return expandDaily(rule, effStart, effEnd);
    case "weekly":
      return expandWeekly(rule, effStart, effEnd);
    case "monthly":
      return expandMonthly(rule, effStart, effEnd);
    case "yearly":
      return expandYearly(rule, effStart, effEnd);
    default:
      return [];
  }
}

function expandDaily(rule: RecurringTransactionRule, effStart: string, effEnd: string): string[] {
  const out: string[] = [];
  let cur = effStart;
  while (compareIsoDate(cur, effEnd) <= 0) {
    if (ruleActiveOnDate(rule, cur)) out.push(cur);
    cur = addDaysIsoLocal(cur, 1);
  }
  return out;
}

function expandWeekly(rule: RecurringTransactionRule, effStart: string, effEnd: string): string[] {
  const wd = parseIsoDateLocal(rule.start_date).getDay();
  let d = effStart;
  while (compareIsoDate(d, effEnd) <= 0 && parseIsoDateLocal(d).getDay() !== wd) {
    d = addDaysIsoLocal(d, 1);
  }
  const out: string[] = [];
  while (compareIsoDate(d, effEnd) <= 0) {
    if (ruleActiveOnDate(rule, d)) out.push(d);
    d = addDaysIsoLocal(d, 7);
  }
  return out;
}

function expandMonthly(rule: RecurringTransactionRule, effStart: string, effEnd: string): string[] {
  const wantDom = parseIsoDateLocal(rule.start_date).getDate();
  const cur = new Date(
    parseIsoDateLocal(effStart).getFullYear(),
    parseIsoDateLocal(effStart).getMonth(),
    1
  );
  const end = parseIsoDateLocal(effEnd);
  const out: string[] = [];

  while (
    cur.getFullYear() < end.getFullYear() ||
    (cur.getFullYear() === end.getFullYear() && cur.getMonth() <= end.getMonth())
  ) {
    const y = cur.getFullYear();
    const m0 = cur.getMonth();
    const last = lastDayOfMonth(y, m0);
    const dom = Math.min(wantDom, last);
    const cand = isoDateFromLocal(new Date(y, m0, dom));
    if (
      compareIsoDate(cand, effStart) >= 0 &&
      compareIsoDate(cand, effEnd) <= 0 &&
      ruleActiveOnDate(rule, cand)
    ) {
      out.push(cand);
    }
    cur.setMonth(cur.getMonth() + 1);
  }

  return out;
}

function expandYearly(rule: RecurringTransactionRule, effStart: string, effEnd: string): string[] {
  const a = parseIsoDateLocal(rule.start_date);
  const month = a.getMonth();
  const day = a.getDate();

  const y0 = parseIsoDateLocal(effStart).getFullYear();
  const y1 = parseIsoDateLocal(effEnd).getFullYear();
  const out: string[] = [];

  for (let y = y0; y <= y1; y += 1) {
    const last = lastDayOfMonth(y, month);
    const dom = Math.min(day, last);
    const cand = isoDateFromLocal(new Date(y, month, dom));
    if (
      compareIsoDate(cand, effStart) >= 0 &&
      compareIsoDate(cand, effEnd) <= 0 &&
      ruleActiveOnDate(rule, cand)
    ) {
      out.push(cand);
    }
  }

  return out;
}
