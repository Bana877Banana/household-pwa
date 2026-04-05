import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { TransactionList } from "../components/TransactionList";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";
import { useHouseholdTransactions } from "../hooks/useHouseholdTransactions";

export function HomePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const { transactions, loading: txLoading, error: txError, refetch } =
    useHouseholdTransactions(household?.id);
  const location = useLocation();
  const navigate = useNavigate();

  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [listNotice, setListNotice] = useState<string | null>(null);

  const copyInviteCode = useCallback(async () => {
    if (!household) return;
    try {
      await navigator.clipboard.writeText(household.inviteCode);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 3000);
    }
  }, [household]);

  useEffect(() => {
    const st = location.state as
      | { savedTx?: boolean; txUpdated?: boolean; txDeleted?: boolean }
      | undefined;
    if (!st?.savedTx && !st?.txUpdated && !st?.txDeleted) return;
    const msg = st.savedTx
      ? "収支を保存しました"
      : st.txUpdated
        ? "収支を更新しました"
        : "収支を削除しました";
    setListNotice(msg);
    refetch();
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate, refetch]);

  useEffect(() => {
    if (!listNotice) return;
    const t = window.setTimeout(() => setListNotice(null), 4500);
    return () => window.clearTimeout(t);
  }, [listNotice]);

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
    <div className="screen home-screen">
      {listNotice ? (
        <p className="save-banner" role="status">
          {listNotice}
        </p>
      ) : null}

      <header className="home-header">
        <h1 className="title">ホーム</h1>
        <p className="subtitle">{household.name}</p>
      </header>

      <section className="card home-tools">
        <p className="label">管理</p>
        <div className="home-tools__stack">
          <Link to="/recurring" className="btn secondary home-tools__btn">
            繰り返し収支（固定費）
          </Link>
          <Link to="/summary/month" className="btn secondary home-tools__btn">
            月次集計
          </Link>
          <Link to="/categories" className="btn secondary home-tools__btn">
            カテゴリ管理
          </Link>
        </div>
      </section>

      <section className="card tx-list-section" aria-labelledby="tx-list-heading">
        <div className="tx-list-section__head tx-list-section__head--row">
          <div>
            <h2 id="tx-list-heading" className="tx-list-title">
              収支一覧
            </h2>
            <p className="tx-list-caption muted small">
              日付の新しい順 · 直近120日を合成 · 最新100件 · 行をタップで編集（固定費は展開のみ）
            </p>
          </div>
          <Link to="/transactions/new" className="btn primary btn-add-tx">
            ＋ 登録
          </Link>
        </div>
        <TransactionList
          transactions={transactions}
          loading={txLoading}
          error={txError}
          onRetry={refetch}
        />
      </section>

      <section className="card">
        <p className="label">家計グループ</p>
        <p className="email">{household.name}</p>

        <p className="label invite-label">招待コード（共有用）</p>
        <div className="copy-row">
          <span className="invite-code-text" aria-live="polite">
            {household.inviteCode}
          </span>
          <button
            type="button"
            className="btn secondary btn-copy"
            onClick={() => void copyInviteCode()}
          >
            {copyState === "copied" ? "コピーしました" : "コピー"}
          </button>
        </div>
        {copyState === "error" ? (
          <p className="error copy-hint" role="alert">
            コピーできませんでした。コードを長押しで選択してください。
          </p>
        ) : (
          <p className="muted small copy-hint left">
            もう一人の方にこのコードを伝えて「招待コードで参加」から入力してもらってください。
          </p>
        )}
      </section>

      <section className="card">
        <p className="label">ログイン中</p>
        <p className="email">{user.email}</p>
        <p className="muted small">ユーザーID: {user.id}</p>
      </section>

      <button type="button" className="btn secondary" onClick={() => signOut()}>
        ログアウト
      </button>
    </div>
  );
}
