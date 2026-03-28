import type { TransactionType } from "./ledger";

export type RecurrenceType = "daily" | "weekly" | "monthly" | "yearly";

export type RecurringTransactionRule = {
  id: string;
  household_id: string;
  type: TransactionType;
  amount: number;
  category_id: string | null;
  memo: string;
  start_date: string;
  end_date: string | null;
  recurrence_type: RecurrenceType;
};
