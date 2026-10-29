import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AppIcon } from "../components/AppIcon";
import { FloralSprig } from "../components/FloralSprig";
import { fetchMonthlySummary } from "../api/monthlySummary";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";
import { useHouseholdTransactions } from "../hooks/useHouseholdTransactions";
import { currentYmLocal, formatMonthLabelJa } from "../lib/monthYear";
import type { MonthlySummary } from "../types/summary";

const yen = (value: number) => `${value.toLocaleString("ja-JP")}円`;
const shortcuts = [
  { to: "/transactions/new", icon: "pencil", label: "収支を登録", tone: "rose" },
  { to: "/shopping", icon: "shopping", label: "買い物メモ", tone: "honey" },
  { to: "/transactions", icon: "list", label: "収支の一覧", tone: "lilac" },
  { to: "/summary/month", icon: "chart", label: "集計・レポート", tone: "mint" },
];

export function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const { transactions, loading: txLoading, error: txError, refetch } = useHouseholdTransactions(household?.id);
  const location = useLocation();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<string | null>(null);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const ym = currentYmLocal();

  useEffect(() => {
    if (!household?.id) return;
    let cancelled = false;
    setSummaryLoading(true);
    setSummaryError(null);
    void fetchMonthlySummary(household.id, ym).then(({ data, error }) => {
      if (cancelled) return;
      setSummary(data);
      setSummaryError(error?.message ?? null);
      setSummaryLoading(false);
    });
    return () => { cancelled = true; };
  }, [household?.id, ym, transactions]);

  useEffect(() => {
    const st = location.state as { savedTx?: boolean; txUpdated?: boolean; txDeleted?: boolean } | undefined;
    if (!st?.savedTx && !st?.txUpdated && !st?.txDeleted) return;
    setNotice(st.savedTx ? "収支を保存しました" : st.txUpdated ? "収支を更新しました" : "収支を削除しました");
    refetch();
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate, refetch]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (authLoading || householdLoading) return <div className="screen"><p className="muted">読み込み中…</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!household) return <Navigate to="/household/setup" replace />;

  const recent = transactions.filter(t => t.type === "expense").slice(0, 3);
  return <main className="screen floral-home">
    {notice ? <p className="save-banner" role="status">{notice}</p> : null}
    <header className="floral-home__header">
      <span className="floral-home__brand"><FloralSprig /> <span>家計簿</span></span>
      <Link to="/settings" className="floral-home__settings" aria-label="設定"><AppIcon name="settings" size={22}/></Link>
    </header>
    <section className="card floral-balance" aria-label="今月の収支">
      <p className="floral-balance__month">{formatMonthLabelJa(ym)}</p>
      {summaryLoading ? <p className="muted">集計中…</p> :
        summaryError ? <p className="error" role="alert">{summaryError}</p> :
        summary ? <>
          <p className={`floral-balance__amount ${summary.balance < 0 ? "floral-balance__amount--negative" : ""}`}>{summary.balance > 0 ? "+" : summary.balance < 0 ? "−" : ""}{yen(Math.abs(summary.balance))}</p>
          <div className="floral-balance__totals"><div><span>収入</span><strong>{yen(summary.incomeTotal)}</strong></div><div><span>支出</span><strong>{yen(summary.expenseTotal)}</strong></div></div>
        </> : <p className="muted">集計データがありません</p>}
    </section>
    <nav className="floral-shortcuts" aria-label="よく使う機能">
      {shortcuts.map(s => <Link key={s.to} to={s.to} className={`floral-shortcut floral-shortcut--${s.tone}`}>
        <span className="floral-shortcut__icon" aria-hidden="true"><AppIcon name={s.icon as "pencil" | "shopping" | "list" | "chart"} size={26}/></span><span>{s.label}</span><span aria-hidden="true">›</span>
      </Link>)}
    </nav>
    <section className="card floral-recent" aria-labelledby="floral-recent-heading">
      <div className="floral-recent__head"><h2 id="floral-recent-heading">最近の支出</h2><Link to="/transactions">すべて見る ›</Link></div>
      {txLoading ? <p className="muted">読み込み中…</p> :
        txError ? <div><p className="error" role="alert">{txError}</p><button type="button" className="btn secondary" onClick={refetch}>再読み込み</button></div> :
        recent.length === 0 ? <p className="muted">最近の支出はありません</p> :
        <ul className="floral-recent__list">{recent.map(t => <li key={t.id}>
          {t.entrySource === "recurring_virtual" || t.id.startsWith("v:") ?
            <div className="floral-recent__item"><span className="floral-recent__item-main"><strong>{t.categoryName ?? "未分類"}（固定費）</strong><small>{t.date}</small></span><span className="floral-recent__price">− {yen(t.amount)}</span></div> :
            <Link to={`/transactions/${t.id}/edit`} className="floral-recent__item"><span className="floral-recent__item-main"><strong>{t.categoryName ?? "未分類"}</strong><small>{t.date}</small></span><span className="floral-recent__price">− {yen(t.amount)}</span></Link>}
        </li>)}</ul>}
    </section>
  </main>;
}
