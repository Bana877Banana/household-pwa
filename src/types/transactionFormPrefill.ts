/**
 * 収支登録フォームへの事前入力。ナビゲーション state で渡す場合に使用。
 */
export type TransactionFormPrefill = {
  /** YYYY-MM-DD */
  occurredOn?: string;
  amountRaw?: string;
  memo?: string;
};
