import { supabase } from "../lib/supabase";
import { parseAmount, type TransactionType } from "../types/ledger";
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
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const rules = (data ?? []).map((r) => mapRow(r as Row));

  return { data: rules, error: null };
}

function mapRow(r: Row): RecurringTransactionRule {
  return {
    id: r.id,
    household_id: r.household_id,
    type: r.type,
    amount: parseAmount(r.amount),
    category_id: r.category_id,
    memo: r.memo,
    start_date: r.start_date,
    end_date: r.end_date,
    recurrence_type: r.recurrence_type,
  };
}

export async function fetchRecurringRuleById(
  ruleId: string,
  householdId: string
): Promise<{ data: RecurringTransactionRule | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("recurring_transactions")
    .select(
      "id, household_id, type, amount, category_id, memo, start_date, end_date, recurrence_type"
    )
    .eq("id", ruleId)
    .eq("household_id", householdId)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  if (!data) {
    return { data: null, error: null };
  }
  return { data: mapRow(data as Row), error: null };
}

export type InsertRecurringRuleInput = {
  householdId: string;
  type: TransactionType;
  amount: number;
  categoryId: string | null;
  memo: string;
  startDate: string;
  endDate: string | null;
  recurrenceType: RecurrenceType;
  createdBy: string;
};

export async function insertRecurringRule(
  input: InsertRecurringRuleInput
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("recurring_transactions").insert({
    household_id: input.householdId,
    type: input.type,
    amount: input.amount,
    category_id: input.categoryId,
    memo: input.memo,
    start_date: input.startDate,
    end_date: input.endDate,
    recurrence_type: input.recurrenceType,
    created_by: input.createdBy,
  });

  return { error: error ? new Error(error.message) : null };
}

export type UpdateRecurringRuleInput = {
  ruleId: string;
  householdId: string;
  type: TransactionType;
  amount: number;
  categoryId: string | null;
  memo: string;
  startDate: string;
  endDate: string | null;
  recurrenceType: RecurrenceType;
};

export async function updateRecurringRule(
  input: UpdateRecurringRuleInput
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("recurring_transactions")
    .update({
      type: input.type,
      amount: input.amount,
      category_id: input.categoryId,
      memo: input.memo,
      start_date: input.startDate,
      end_date: input.endDate,
      recurrence_type: input.recurrenceType,
    })
    .eq("id", input.ruleId)
    .eq("household_id", input.householdId);

  return { error: error ? new Error(error.message) : null };
}

export async function deleteRecurringRule(
  ruleId: string,
  householdId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("recurring_transactions")
    .delete()
    .eq("id", ruleId)
    .eq("household_id", householdId);

  return { error: error ? new Error(error.message) : null };
}
