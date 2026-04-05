import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { fetchCategoriesForHousehold } from "../api/categories";
import { fetchRecurringRules } from "../api/recurringTransactions";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";
import { formatDisplayDate } from "../lib/formatDisplayDate";
import { recurrenceShortLabel } from "../lib/recurringRuleLabels";
import type { RecurringTransactionRule } from "../types/recurring";

export function RecurringRulesListPage() {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const location = useLocation();
  const navigate = useNavigate();

  const [notice, setNotice] = useState<string | null>(null);
  const [rules, setRules] = useState<RecurringTransactionRule[]>([]);
  const [categoryNames, setCategoryNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!household?.id) return;
    setLoading(true);
    setError(null);
    const [rulesRes, catsRes] = await Promise.all([
      fetchRecurringRules(household.id),
      fetchCategoriesForHousehold(household.id),
    ]);
    if (rulesRes.error) {
      setError(rulesRes.error.message);
      setRules([]);
    } else {
      setRules(rulesRes.data);
    }
    if (!catsRes.error) {
      setCategoryNames(new Map(catsRes.data.map((c) => [c.id, c.name])));
    }
    setLoading(false);
  }, [household?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const st = location.state as { notice?: string } | undefined;
    if (st?.notice) {
      setNotice(st.notice);
      void load();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, load]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

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

  return (
    <div className="screen recurring-list-screen">
      {notice ? (
        <p className="save-banner" role="status">
          {notice}
        </p>
      ) : null}
      <header className="form-screen__head">
        <Link to="/" className="form-back">
          ← ホーム
        </Link>
        <h1 className="form-screen__title">繰り返し収支（固定費）</h1>
        <p className="form-screen__sub muted small">
          一覧・ホームではルールを期間内に展開して表示します。実レコードで上書きすることもできます。
        </p>
      </header>

      <div className="form-screen__body recurring-list-screen__body">
        <div className="recurring-list-screen__actions">
          <Link to="/recurring/new" className="btn primary">
            ＋ ルールを追加
          </Link>
        </div>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="muted">読み込み中…</p>
        ) : rules.length === 0 ? (
          <div className="card recurring-list-screen__empty">
            <p className="muted">まだルールがありません。「ルールを追加」から登録できます。</p>
          </div>
        ) : (
          <ul className="recurring-rule-list" role="list">
            {rules.map((r) => {
              const cat = r.category_id ? categoryNames.get(r.category_id) ?? "—" : "未分類";
              const typeLabel = r.type === "income" ? "入金" : "支出";
              const end =
                r.end_date == null ? "なし" : formatDisplayDate(r.end_date);
              return (
                <li key={r.id} className="recurring-rule-list__item">
                  <Link to={`/recurring/${r.id}/edit`} className="recurring-rule-card">
                    <div className="recurring-rule-card__head">
                      <span className={`tx-badge tx-badge--${r.type}`}>{typeLabel}</span>
                      <span className="recurring-rule-card__amount" aria-label={`金額 ${r.amount}円`}>
                        ¥{r.amount.toLocaleString("ja-JP")}
                      </span>
                    </div>
                    <p className="recurring-rule-card__line">
                      <span className="muted small">カテゴリ</span> {cat}
                    </p>
                    <p className="recurring-rule-card__line">
                      <span className="muted small">周期</span>{" "}
                      {recurrenceShortLabel(r.recurrence_type, r.start_date)}
                    </p>
                    <p className="recurring-rule-card__line">
                      <span className="muted small">開始</span> {formatDisplayDate(r.start_date)}{" "}
                      <span className="muted small">· 終了</span> {end}
                    </p>
                    {r.memo.trim() ? (
                      <p className="recurring-rule-card__memo muted small">{r.memo}</p>
                    ) : null}
                    <p className="recurring-rule-card__tap muted small">タップして編集</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
