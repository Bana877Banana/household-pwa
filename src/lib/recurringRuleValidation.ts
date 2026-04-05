import type { TransactionType } from "../types/ledger";
import type { RecurrenceType } from "../types/recurring";
import { compareIsoDate } from "./formatDisplayDate";
import { isValidIsoDate, parsePositiveAmount } from "./transactionValidation";

const RECURRENCE_TYPES: RecurrenceType[] = ["daily", "weekly", "monthly", "yearly"];

export function isRecurrenceType(v: string): v is RecurrenceType {
  return (RECURRENCE_TYPES as string[]).includes(v);
}

export type RecurringRuleFormErrors = Partial<
  Record<"startDate" | "endDate" | "amount" | "type" | "recurrence", string>
>;

export type ValidatedRecurringRuleForm = {
  type: TransactionType;
  amount: number;
  categoryId: string | null;
  memo: string;
  startDate: string;
  endDate: string | null;
  recurrenceType: RecurrenceType;
};

export function validateRecurringRuleForm(input: {
  type: TransactionType | "";
  amountRaw: string;
  categoryId: string;
  memo: string;
  startDate: string;
  endDateRaw: string;
  recurrenceType: string;
}):
  | { ok: true; values: ValidatedRecurringRuleForm }
  | { ok: false; errors: RecurringRuleFormErrors } {
  const errors: RecurringRuleFormErrors = {};

  if (input.type !== "income" && input.type !== "expense") {
    errors.type = "種別を選んでください";
  }

  const amount = parsePositiveAmount(input.amountRaw);
  if (amount === null) {
    errors.amount = "金額は0より大きい数で入力してください";
  }

  const start = input.startDate.trim();
  if (!start) {
    errors.startDate = "開始日を選んでください";
  } else if (!isValidIsoDate(start)) {
    errors.startDate = "日付の形式が正しくありません";
  }

  const endTrim = input.endDateRaw.trim();
  let endDate: string | null = null;
  if (endTrim !== "") {
    if (!isValidIsoDate(endTrim)) {
      errors.endDate = "終了日の形式が正しくありません";
    } else if (start && isValidIsoDate(start) && compareIsoDate(endTrim, start) < 0) {
      errors.endDate = "終了日は開始日以降にしてください";
    } else {
      endDate = endTrim;
    }
  }

  if (!isRecurrenceType(input.recurrenceType)) {
    errors.recurrence = "繰り返しの周期を選んでください";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const categoryId = input.categoryId.trim() === "" ? null : input.categoryId.trim();

  return {
    ok: true,
    values: {
      type: input.type as TransactionType,
      amount: amount!,
      categoryId,
      memo: input.memo.trim(),
      startDate: start,
      endDate,
      recurrenceType: input.recurrenceType as RecurrenceType,
    },
  };
}
