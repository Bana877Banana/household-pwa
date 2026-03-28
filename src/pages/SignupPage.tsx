import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function SignupPage() {
  const { user, loading, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="screen">
        <p className="muted">読み込み中…</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password !== passwordConfirm) {
      setError("パスワードが一致しません");
      return;
    }

    if (password.length < 6) {
      setError("パスワードは6文字以上にしてください");
      return;
    }

    setSubmitting(true);
    const { error: err, needsEmailConfirmation } = await signUp(email.trim(), password);
    setSubmitting(false);

    if (err) {
      setError(err.message);
      return;
    }

    if (needsEmailConfirmation) {
      setInfo("登録しました。届いたメールのリンクを開いて確認してください。");
    }
  }

  return (
    <div className="screen login-screen">
      <header className="login-header">
        <h1 className="title">家計簿</h1>
        <p className="subtitle">アカウント作成</p>
      </header>

      <form className="card form" onSubmit={onSubmit}>
        <label className="field">
          <span className="label">メールアドレス</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label className="field">
          <span className="label">パスワード（6文字以上）</span>
          <input
            type="password"
            name="new-password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        <label className="field">
          <span className="label">パスワード（確認）</span>
          <input
            type="password"
            name="new-password-confirm"
            autoComplete="new-password"
            required
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        {info ? (
          <p className="info" role="status">
            {info}
          </p>
        ) : null}

        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? "登録中…" : "登録する"}
        </button>

        <p className="auth-switch">
          すでにアカウントがある方は{" "}
          <Link to="/login" className="link">
            ログイン
          </Link>
        </p>
      </form>
    </div>
  );
}
