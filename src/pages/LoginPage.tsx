import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setSubmitting(true);
    const { error: err } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (err) setError(err.message);
  }

  return (
    <div className="screen login-screen">
      <header className="login-header">
        <h1 className="title">家計簿</h1>
        <p className="subtitle">ログイン</p>
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
          <span className="label">パスワード</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? "ログイン中…" : "ログイン"}
        </button>

        <p className="auth-switch">
          はじめての方は{" "}
          <Link to="/signup" className="link">
            アカウント作成
          </Link>
        </p>
      </form>
    </div>
  );
}
