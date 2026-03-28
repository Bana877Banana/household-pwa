import { supabase } from "../lib/supabase";
import { parseAmount } from "../types/ledger";
import type { RecurrenceType, RecurringTransactionRule } from "../types/recurring";

type Row = {
  id: string;
  household_id: string;
  type: "income" | "expense";
  amount: number | string;
  category_id: string | null;
  memo: string;
  start_date: string;
  end_date: string | null;
  recurrence_type: RecurrenceType;
};

export async function fetchRecurringRules(
  householdId: string
): Promise<{ data: RecurringTransactionRule[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("recurring_transactions")
    .select(
      "id, household_id, type, amount, category_id, memo, start_date, end_date, recurrence_type"
    )
    .eq("household_id", householdId);

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const rules = (data ?? []).map((r) => {
    const row = r as Row;
    return {
      id: row.id,
      household_id: row.household_id,
      type: row.type,
      amount: parseAmount(row.amount),
      category_id: row.category_id,
      memo: row.memo,
      start_date: row.start_date,
      end_date: row.end_date,
      recurrence_type: row.recurrence_type,
    } satisfies RecurringTransactionRule;
  });

  return { data: rules, error: null };
}
