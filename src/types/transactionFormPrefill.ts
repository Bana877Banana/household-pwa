/**
 * 収支登録フォームへの事前入力（将来: OCR など複数ソースで共通化）
 * MVP では手入力のみ。ナビゲーション state で渡す場合に使用。
 */
export type TransactionFormPrefillSource = "manual" | "ocr";

export type TransactionFormPrefill = {
  source: TransactionFormPrefillSource;
  /** YYYY-MM-DD */
  occurredOn?: string;
  amountRaw?: string;
  memo?: string;
  /** 将来 OCR パイプラインで使う生テキスト（未使用可） */
  rawText?: string;
};
