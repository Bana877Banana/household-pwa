import { expandRecurringOccurrences } from "./expandRecurring";
import { compareIsoDate } from "./formatDisplayDate";
import { parseAmount, type Transaction } from "../types/ledger";
import type { RecurringTransactionRule } from "../types/recurring";

/** 実レコードが recurring_transaction_id + occurred_on でルール日を上書きしたら仮想を出さない */
function buildDedupeKeys(actuals: Transaction[]): Set<string> {
  const keys = new Set<string>();
  for (const a of actuals) {
    if (a.recurringTransactionId) {
      keys.add(`${a.recurringTransactionId}:${a.date}`);
    }
  }
  return keys;
}

function virtualTransaction(
  rule: RecurringTransactionRule,
  date: string,
  categoryNameById: Map<string, string>,
  householdId: string
): Transaction {
  return {
    id: `v:${rule.id}:${date}`,
    householdId,
    date,
    amount: rule.amount,
    type: rule.type,
    categoryId: rule.category_id,
    categoryName: rule.category_id ? categoryNameById.get(rule.category_id) ?? null : null,
    memo: rule.memo,
    createdBy: "",
    createdAt: "",
    updatedAt: "",
    recurringTransactionId: rule.id,
    entrySource: "recurring_virtual",
  };
}

/**
 * 期間内の実レコード + 繰り返し仮想をマージ（同一ルール同一日は実レコード優先）。
 * 返却は occurred_on 降順、同一日内は実レコードを先に。
 */
export function mergeTransactionsWithRecurring(
  actuals: Transaction[],
  rules: RecurringTransactionRule[],
  rangeStart: string,
  rangeEnd: string,
  categoryNameById: Map<string, string>,
  householdId: string
): Transaction[] {
  const dedupe = buildDedupeKeys(actuals);

  const virtuals: Transaction[] = [];
  for (const rule of rules) {
    if (rule.household_id !== householdId) continue;
    const dates = expandRecurringOccurrences(rule, rangeStart, rangeEnd);
    for (const d of dates) {
      const k = `${rule.id}:${d}`;
      if (dedupe.has(k)) continue;
      virtuals.push(virtualTransaction(rule, d, categoryNameById, householdId));
    }
  }

  const inRange = (t: Transaction) =>
    compareIsoDate(t.date, rangeStart) >= 0 && compareIsoDate(t.date, rangeEnd) <= 0;

  const act = actuals.filter(inRange);

  const all = [...act, ...virtuals];
  all.sort((a, b) => {
    const c = compareIsoDate(b.date, a.date);
    if (c !== 0) return c;
    const av = a.entrySource === "recurring_virtual" ? 1 : 0;
    const bv = b.entrySource === "recurring_virtual" ? 1 : 0;
    if (av !== bv) return av - bv;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });

  return all;
}

/** 月次集計用の行（categories 形を aggregate に合わせる） */
export type AggRowInput = {
  amount: number;
  type: "income" | "expense";
  category_id: string | null;
  categories: { id: string; name: string } | null;
};

export function mergeToAggRowsForRange(
  actualRows: {
    amount: number | string;
    type: "income" | "expense";
    category_id: string | null;
    categories: { id: string; name: string } | null;
    recurring_transaction_id?: string | null;
    occurred_on: string;
  }[],
  rules: RecurringTransactionRule[],
  rangeStart: string,
  rangeEnd: string,
  categoryNameById: Map<string, string>
): AggRowInput[] {
  const dedupe = new Set<string>();
  for (const r of actualRows) {
    if (r.recurring_transaction_id) {
      dedupe.add(`${r.recurring_transaction_id}:${r.occurred_on}`);
    }
  }

  const out: AggRowInput[] = [];

  for (const r of actualRows) {
    if (
      compareIsoDate(r.occurred_on, rangeStart) >= 0 &&
      compareIsoDate(r.occurred_on, rangeEnd) <= 0
    ) {
      out.push({
        amount: parseAmount(r.amount),
        type: r.type,
        category_id: r.category_id,
        categories: r.categories,
      });
    }
  }

  for (const rule of rules) {
    const dates = expandRecurringOccurrences(rule, rangeStart, rangeEnd);
    for (const d of dates) {
      if (dedupe.has(`${rule.id}:${d}`)) continue;
      const name = rule.category_id ? categoryNameById.get(rule.category_id) ?? "未分類" : "未分類";
      out.push({
        amount: rule.amount,
        type: rule.type,
        category_id: rule.category_id,
        categories: rule.category_id
          ? { id: rule.category_id, name }
          : null,
      });
    }
  }

  return out;
}
