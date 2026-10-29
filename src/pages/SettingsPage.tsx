import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";
export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { household } = useHousehold();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const copyInviteCode = useCallback(async () => {
    if (!household) return;
    try { await navigator.clipboard.writeText(household.inviteCode); setCopyState("copied"); }
    catch { setCopyState("error"); }
  }, [household]);
  return <main className="screen floral-page">
    <header className="floral-page__heading"><h1>設定・管理</h1><p className="muted small">家計簿の管理メニュー</p></header>
    <section className="card floral-settings__links">
      <Link className="btn secondary" to="/recurring">繰り返し収支（固定費）</Link>
      <Link className="btn secondary" to="/categories">カテゴリ管理</Link>
    </section>
    <section className="card">
      <p className="label">家計グループ</p><p className="email">{household?.name}</p>
      <p className="label invite-label">招待コード（共有用）</p>
      <div className="copy-row"><span className="invite-code-text">{household?.inviteCode}</span>
      <button className="btn secondary btn-copy" type="button" onClick={() => void copyInviteCode()}>{copyState === "copied" ? "コピーしました" : "コピー"}</button></div>
      {copyState === "error" ? <p className="error">コピーできませんでした。長押しで選択してください。</p> : null}
    </section>
    <section className="card"><p className="label">ログイン中</p><p className="email">{user?.email}</p><p className="muted small">ユーザーID: {user?.id}</p></section>
    <button className="btn secondary" type="button" onClick={() => void signOut()}>ログアウト</button>
  </main>;
}
