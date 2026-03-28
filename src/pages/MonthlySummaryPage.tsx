import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { fetchMonthlySummary } from "../api/monthlySummary";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";
import { addMonthsYm, currentYmLocal, formatMonthLabelJa } from "../lib/monthYear";
import type { MonthlySummary } from "../types/summary";

function formatYen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export function MonthlySummaryPage() {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();

  const [ym, setYm] = useState(currentYmLocal);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!household?.id) {
      setSummary(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: err } = await fetchMonthlySummary(household.id, ym);

    if (err) {
      setError(err.message);
      setSummary(null);
    } else {
      setSummary(data);
    }

    setLoading(false);
  }, [household?.id, ym]);

  useEffect(() => {
    void load();
  }, [load]);

  if (authLoading || householdLoading) {
    return (
      <div className="screen">
        <p className="muted">読み込み中…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!household) {
    return <Navigate to="/household/setup" replace />;
  }

  const maxYm = currentYmLocal();
  const canGoNext = ym < maxYm;

  return (
    <div className="screen summary-page">
      <header className="form-screen__head">
        <Link to="/" className="form-back">
          ← ホーム
        </Link>
        <h1 className="form-screen__title">月次集計</h1>
        <p className="form-screen__sub muted small">
          {household.name} · 繰り返しルールを展開して集計
        </p>
      </header>

      <div className="summary-month-bar card">
        <button
          type="button"
          className="summary-month-bar__btn"
          onClick={() => setYm((y) => addMonthsYm(y, -1))}
          aria-label="前の月"
        >
          ‹
        </button>
        <div className="summary-month-bar__label" aria-live="polite">
          {formatMonthLabelJa(ym)}
        </div>
        <button
          type="button"
          className="summary-month-bar__btn"
          onClick={() => setYm((y) => addMonthsYm(y, 1))}
          disabled={!canGoNext}
          aria-label="次の月"
        >
          ›
        </button>
      </div>

      {loading ? (
        <p className="muted summary-state">集計を読み込み中…</p>
      ) : error ? (
        <p className="error summary-state" role="alert">
          {error}
        </p>
      ) : summary ? (
        <>
          <section className="card summary-totals" aria-labelledby="summary-totals-heading">
            <h2 id="summary-totals-heading" className="summary-section-title">
              合計
            </h2>
            <dl className="summary-totals__grid">
              <div className="summary-total-row">
                <dt className="summary-total-row__k">支出</dt>
                <dd className="summary-total-row__v summary-total-row__v--expense">
                  {formatYen(summary.expenseTotal)}
                </dd>
              </div>
              <div className="summary-total-row">
                <dt className="summary-total-row__k">入金</dt>
                <dd className="summary-total-row__v summary-total-row__v--income">
                  {formatYen(summary.incomeTotal)}
                </dd>
              </div>
              <div className="summary-total-row summary-total-row--balance">
                <dt className="summary-total-row__k">差額（入金 − 支出）</dt>
                <dd
                  className={`summary-total-row__v summary-balance ${
                    summary.balance < 0 ? "summary-balance--minus" : ""
                  }`}
                >
                  {formatYen(summary.balance)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="card summary-by-cat" aria-labelledby="summary-cat-heading">
            <h2 id="summary-cat-heading" className="summary-section-title">
              カテゴリ別（支出）
            </h2>
            {summary.categoryExpenses.length === 0 ? (
              <p className="muted small summary-empty">この月の支出はありません</p>
            ) : (
              <ul className="summary-cat-list" role="list">
                {summary.categoryExpenses.map((row) => {
                  const pct =
                    summary.expenseTotal > 0
                      ? Math.max(6, (row.total / summary.expenseTotal) * 100)
                      : 0;
                  return (
                    <li key={row.categoryId ?? "uncategorized"} className="summary-cat-row">
                      <div className="summary-cat-row__top">
                        <span className="summary-cat-row__name">{row.categoryName}</span>
                        <span className="summary-cat-row__amt">{formatYen(row.total)}</span>
                      </div>
                      <div className="summary-cat-row__track" aria-hidden>
                        <div className="summary-cat-row__bar" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
