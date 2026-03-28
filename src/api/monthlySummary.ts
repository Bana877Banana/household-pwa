import { supabase } from "../lib/supabase";
import { monthRangeIso } from "../lib/monthYear";
import type { AggRowInput } from "../lib/mergeTransactionsWithRecurring";
import { mergeToAggRowsForRange } from "../lib/mergeTransactionsWithRecurring";
import {
  normalizeCategoryJoin,
  parseAmount,
  type CategoryJoin,
  type TransactionType,
} from "../types/ledger";
import type { CategoryExpenseTotal, MonthlySummary } from "../types/summary";
import { fetchCategoriesForHousehold } from "./categories";
import { fetchRecurringRules } from "./recurringTransactions";

type SummaryLine = {
  amount: number | string;
  type: TransactionType;
  category_id: string | null;
  categories: { id: string; name: string } | null;
};

function aggregateMonthly(lines: SummaryLine[], yearMonth: string): MonthlySummary {
  let expenseTotal = 0;
  let incomeTotal = 0;
  const expenseByKey = new Map<string, { name: string; total: number }>();

  for (const r of lines) {
    const amt = parseAmount(r.amount);
    if (r.type === "expense") {
      expenseTotal += amt;
      const key = r.category_id ?? "__uncategorized__";
      const name = r.categories?.name ?? "未分類";
      const prev = expenseByKey.get(key) ?? { name, total: 0 };
      expenseByKey.set(key, { name: prev.name, total: prev.total + amt });
    } else if (r.type === "income") {
      incomeTotal += amt;
    }
  }

  const categoryExpenses: CategoryExpenseTotal[] = Array.from(expenseByKey.entries())
    .map(([key, v]) => ({
      categoryId: key === "__uncategorized__" ? null : key,
      categoryName: v.name,
      total: v.total,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    yearMonth,
    expenseTotal,
    incomeTotal,
    balance: incomeTotal - expenseTotal,
    categoryExpenses,
  };
}

export type FetchMonthlySummaryResult = {
  data: MonthlySummary | null;
  error: Error | null;
};

/**
 * 指定月の実レコード + 繰り返し展開を合成して集計（同一ルール同一日は実レコードのみ）。
 */
export async function fetchMonthlySummary(
  householdId: string,
  yearMonth: string
): Promise<FetchMonthlySummaryResult> {
  const range = monthRangeIso(yearMonth);
  if (!range) {
    return { data: null, error: new Error("対象月の形式が正しくありません") };
  }

  const [txRes, rulesRes, catsRes] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "amount, type, category_id, recurring_transaction_id, occurred_on, categories ( id, name )"
      )
      .eq("household_id", householdId)
      .gte("occurred_on", range.start)
      .lte("occurred_on", range.end),
    fetchRecurringRules(householdId),
    fetchCategoriesForHousehold(householdId),
  ]);

  if (txRes.error) {
    return { data: null, error: new Error(txRes.error.message) };
  }
  if (rulesRes.error) {
    return { data: null, error: rulesRes.error };
  }
  if (catsRes.error) {
    return { data: null, error: catsRes.error };
  }

  const catMap = new Map(catsRes.data.map((c) => [c.id, c.name]));

  type RawRow = {
    amount: number | string;
    type: TransactionType;
    category_id: string | null;
    recurring_transaction_id?: string | null;
    occurred_on: string;
    categories: { id: string; name: string } | null;
  };

  const normalized: RawRow[] = (txRes.data ?? []).map((r) => ({
    amount: r.amount,
    type: r.type as TransactionType,
    category_id: r.category_id,
    recurring_transaction_id: r.recurring_transaction_id,
    occurred_on: r.occurred_on,
    categories: normalizeCategoryJoin(
      r.categories as CategoryJoin | CategoryJoin[] | null | undefined
    ),
  }));

  const merged: AggRowInput[] = mergeToAggRowsForRange(
    normalized,
    rulesRes.data,
    range.start,
    range.end,
    catMap
  );

  return {
    data: aggregateMonthly(merged, yearMonth),
    error: null,
  };
}
