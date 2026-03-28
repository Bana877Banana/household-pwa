import { Link } from "react-router-dom";
import type { Category, TransactionType } from "../types/ledger";

export type TransactionFormFieldKey = "date" | "amount" | "type";

type Props = {
  date: string;
  setDate: (v: string) => void;
  amountRaw: string;
  setAmountRaw: (v: string) => void;
  type: TransactionType;
  setType: (v: TransactionType) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  memo: string;
  setMemo: (v: string) => void;
  categories: Category[];
  categoriesLoading: boolean;
  fieldErrors: Partial<Record<TransactionFormFieldKey, string>>;
  clearFieldError: (key: TransactionFormFieldKey) => void;
  submitError: string | null;
  submitErrorPrefix?: string;
  showCategoryManageLink?: boolean;
};

export function TransactionFormFields({
  date,
  setDate,
  amountRaw,
  setAmountRaw,
  type,
  setType,
  categoryId,
  setCategoryId,
  memo,
  setMemo,
  categories,
  categoriesLoading,
  fieldErrors,
  clearFieldError,
  submitError,
  submitErrorPrefix = "保存できませんでした。",
  showCategoryManageLink = true,
}: Props) {
  return (
    <div className="card form-stack">
      <fieldset className="field field--segment">
        <legend className="label">種別</legend>
        <div className="type-segment" role="group" aria-label="種別">
          <button
            type="button"
            className={`type-segment__btn ${type === "expense" ? "type-segment__btn--active" : ""}`}
            onClick={() => {
              setType("expense");
              clearFieldError("type");
            }}
          >
            支出
          </button>
          <button
            type="button"
            className={`type-segment__btn ${type === "income" ? "type-segment__btn--active" : ""}`}
            onClick={() => {
              setType("income");
              clearFieldError("type");
            }}
          >
            入金
          </button>
        </div>
        {fieldErrors.type ? (
          <p className="field-error" role="alert">
            {fieldErrors.type}
          </p>
        ) : null}
      </fieldset>

      <label className="field">
        <span className="label">日付</span>
        <span className="field-date-shell">
          <input
            type="date"
            name="occurred_on"
            className="input-date"
            required
            value={date}
            onChange={(ev) => {
              setDate(ev.target.value);
              clearFieldError("date");
            }}
          />
        </span>
        {fieldErrors.date ? (
          <p className="field-error" role="alert">
            {fieldErrors.date}
          </p>
        ) : null}
      </label>

      <label className="field">
        <span className="label">金額</span>
        <input
          type="text"
          name="amount"
          inputMode="decimal"
          autoComplete="transaction-amount"
          placeholder="例: 1200"
          value={amountRaw}
          onChange={(ev) => {
            setAmountRaw(ev.target.value);
            clearFieldError("amount");
          }}
        />
        {fieldErrors.amount ? (
          <p className="field-error" role="alert">
            {fieldErrors.amount}
          </p>
        ) : null}
      </label>

      <label className="field">
        <span className="label">カテゴリ（任意）</span>
        <select
          name="category_id"
          value={categoryId}
          onChange={(ev) => setCategoryId(ev.target.value)}
          disabled={categoriesLoading}
          aria-busy={categoriesLoading}
        >
          <option value="">未設定</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {categoriesLoading ? (
          <p className="muted small field-hint">カテゴリを読み込み中…</p>
        ) : categories.length === 0 ? (
          <p className="muted small field-hint">カテゴリは任意です（未作成でも保存できます）</p>
        ) : null}
        {showCategoryManageLink ? (
          <p className="field-hint">
            <Link to="/categories" className="link cat-manage-link">
              カテゴリの追加・編集
            </Link>
          </p>
        ) : null}
      </label>

      <label className="field">
        <span className="label">メモ（任意）</span>
        <textarea
          name="memo"
          rows={3}
          className="input-textarea"
          placeholder="店名・内容など"
          value={memo}
          onChange={(ev) => setMemo(ev.target.value)}
        />
      </label>

      {submitError ? (
        <p className="error" role="alert">
          {submitErrorPrefix}
          {submitError}
        </p>
      ) : null}
    </div>
  );
}
