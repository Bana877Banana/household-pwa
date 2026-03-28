import { Link } from "react-router-dom";
import { formatDisplayDate } from "../lib/formatDisplayDate";
import type { Transaction } from "../types/ledger";

type Props = {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
};

function typeLabel(type: Transaction["type"]): string {
  return type === "income" ? "入金" : "支出";
}

function isVirtualEntry(t: Transaction): boolean {
  return t.entrySource === "recurring_virtual" || t.id.startsWith("v:");
}

export function TransactionList({ transactions, loading, error, onRetry }: Props) {
  if (loading) {
    return (
      <div className="tx-list-state" aria-busy="true" aria-live="polite">
        <p className="tx-list-state__text">読み込み中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tx-list-state tx-list-state--error">
        <p className="error tx-list-state__text" role="alert">
          {error}
        </p>
        {onRetry ? (
          <button type="button" className="btn secondary tx-retry" onClick={onRetry}>
            もう一度読み込む
          </button>
        ) : null}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="tx-list-state">
        <p className="tx-list-empty">まだ登録がありません</p>
      </div>
    );
  }

  return (
    <ul className="tx-list" role="list">
      {transactions.map((t) => {
        const virtual = isVirtualEntry(t);
        const inner = (
          <>
            <div className="tx-card__head">
              <time className="tx-card__date" dateTime={t.date}>
                {formatDisplayDate(t.date)}
              </time>
              <span className={`tx-badge tx-badge--${t.type}`}>{typeLabel(t.type)}</span>
              {virtual ? (
                <span className="tx-badge tx-badge--recurring" title="繰り返しから展開">
                  固定費
                </span>
              ) : null}
              <span className="tx-card__amount" aria-label={`金額 ${t.amount}円`}>
                ¥{t.amount.toLocaleString("ja-JP")}
              </span>
            </div>
            <div className="tx-card__row">
              <span className="tx-card__key">カテゴリ</span>
              <span className="tx-card__val">{t.categoryName ?? "—"}</span>
            </div>
            <div className="tx-card__row">
              <span className="tx-card__key">メモ</span>
              <span className="tx-card__val tx-card__val--memo">
                {t.memo.trim() ? t.memo : "—"}
              </span>
            </div>
            {virtual ? (
              <p className="tx-card__hint muted small">固定費ルールの展開（編集はルールから）</p>
            ) : (
              <p className="tx-card__tap-hint muted small">タップして編集</p>
            )}
          </>
        );

        return (
          <li key={t.id} className="tx-list__item">
            {virtual ? (
              <div className="tx-card tx-card--virtual">{inner}</div>
            ) : (
              <Link to={`/transactions/${t.id}/edit`} className="tx-card tx-card--link">
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
