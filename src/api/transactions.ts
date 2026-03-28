import { addDaysIsoLocal, todayIsoDateLocal } from "../lib/formatDisplayDate";
import { mergeTransactionsWithRecurring } from "../lib/mergeTransactionsWithRecurring";
import { supabase } from "../lib/supabase";
import { fetchCategoriesForHousehold } from "./categories";
import { fetchRecurringRules } from "./recurringTransactions";
import {
  mapTransactionRow,
  type Transaction,
  type TransactionType,
  type TransactionWithCategory,
} from "../types/ledger";

export type FetchTransactionsResult = {
  data: Transaction[];
  error: Error | null;
};

const TX_SELECT = `
      id,
      household_id,
      occurred_on,
      amount,
      type,
      category_id,
      memo,
      created_by,
      created_at,
      updated_at,
      recurring_transaction_id,
      categories ( id, name )
    `;

/**
 * 指定家計の収支一覧（新しい計上日順）。繰り返しは含めない。0件でも error は null。
 */
export async function fetchTransactionsForHousehold(
  householdId: string,
  options?: { limit?: number }
): Promise<FetchTransactionsResult> {
  const limit = options?.limit ?? 100;

  const { data, error } = await supabase
    .from("transactions")
    .select(TX_SELECT)
    .eq("household_id", householdId)
    .order("occurred_on", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const rows = (data ?? []) as TransactionWithCategory[];
  return {
    data: rows.map(mapTransactionRow),
    error: null,
  };
}

/**
 * 直近 lookbackDays 日の実レコードを取得し、同一期間の繰り返しを展開して合成（実レコード優先）。
 */
export async function fetchMergedTransactionsForHome(
  householdId: string,
  options?: { lookbackDays?: number; limit?: number }
): Promise<FetchTransactionsResult> {
  const lookback = options?.lookbackDays ?? 120;
  const limit = options?.limit ?? 100;
  const rangeEnd = todayIsoDateLocal();
  const rangeStart = addDaysIsoLocal(rangeEnd, -(lookback - 1));

  const [txRes, rulesRes, catsRes] = await Promise.all([
    supabase
      .from("transactions")
      .select(TX_SELECT)
      .eq("household_id", householdId)
      .gte("occurred_on", rangeStart)
      .lte("occurred_on", rangeEnd)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(400),
    fetchRecurringRules(householdId),
    fetchCategoriesForHousehold(householdId),
  ]);

  if (txRes.error) {
    return { data: [], error: new Error(txRes.error.message) };
  }
  if (rulesRes.error) {
    return { data: [], error: rulesRes.error };
  }
  if (catsRes.error) {
    return { data: [], error: catsRes.error };
  }

  const catMap = new Map(catsRes.data.map((c) => [c.id, c.name]));
  const rows = (txRes.data ?? []) as TransactionWithCategory[];
  const actuals = rows.map(mapTransactionRow);

  const merged = mergeTransactionsWithRecurring(
    actuals,
    rulesRes.data,
    rangeStart,
    rangeEnd,
    catMap,
    householdId
  );

  return {
    data: merged.slice(0, limit),
    error: null,
  };
}

export type InsertTransactionInput = {
  householdId: string;
  occurredOn: string;
  amount: number;
  type: TransactionType;
  categoryId: string | null;
  memo: string;
  createdBy: string;
};

export async function insertTransaction(
  input: InsertTransactionInput
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("transactions").insert({
    household_id: input.householdId,
    occurred_on: input.occurredOn,
    amount: input.amount,
    type: input.type,
    category_id: input.categoryId,
    memo: input.memo,
    created_by: input.createdBy,
  });

  return { error: error ? new Error(error.message) : null };
}

export async function fetchTransactionById(
  transactionId: string,
  householdId: string
): Promise<{ data: Transaction | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("transactions")
    .select(TX_SELECT)
    .eq("id", transactionId)
    .eq("household_id", householdId)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return {
    data: mapTransactionRow(data as TransactionWithCategory),
    error: null,
  };
}

export type UpdateTransactionInput = {
  transactionId: string;
  householdId: string;
  occurredOn: string;
  amount: number;
  type: TransactionType;
  categoryId: string | null;
  memo: string;
};

export async function updateTransaction(
  input: UpdateTransactionInput
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("transactions")
    .update({
      occurred_on: input.occurredOn,
      amount: input.amount,
      type: input.type,
      category_id: input.categoryId,
      memo: input.memo,
    })
    .eq("id", input.transactionId)
    .eq("household_id", input.householdId);

  return { error: error ? new Error(error.message) : null };
}

export async function deleteTransaction(
  transactionId: string,
  householdId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("household_id", householdId);

  return { error: error ? new Error(error.message) : null };
}
