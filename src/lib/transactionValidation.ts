import type { TransactionType } from "../types/ledger";

export type ValidatedTransactionForm = {
  occurredOn: string;
  amount: number;
  type: TransactionType;
  categoryId: string | null;
  memo: string;
};

export type TransactionFormFieldErrors = Partial<
  Record<"date" | "amount" | "type", string>
>;

/** カンマ区切り・前後空白を許容し、正の有限小数ならその値 */
export function parsePositiveAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** YYYY-MM-DD 形式（HTML date input 想定） */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return false;
  const d = new Date(value + "T12:00:00");
  return !Number.isNaN(d.getTime());
}

export function validateTransactionForm(input: {
  date: string;
  amountRaw: string;
  type: TransactionType | "";
  categoryId: string;
  memo: string;
}):
  | { ok: true; values: ValidatedTransactionForm }
  | { ok: false; errors: TransactionFormFieldErrors } {
  const errors: TransactionFormFieldErrors = {};

  const date = input.date.trim();
  if (!date) {
    errors.date = "日付を選んでください";
  } else if (!isValidIsoDate(date)) {
    errors.date = "日付の形式が正しくありません";
  }

  const amount = parsePositiveAmount(input.amountRaw);
  if (amount === null) {
    errors.amount = "金額は0より大きい数で入力してください";
  }

  if (input.type !== "income" && input.type !== "expense") {
    errors.type = "種別を選んでください";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const categoryId = input.categoryId.trim() === "" ? null : input.categoryId.trim();

  return {
    ok: true,
    values: {
      occurredOn: date,
      amount: amount!,
      type: input.type as TransactionType,
      categoryId,
      memo: input.memo.trim(),
    },
  };
}
