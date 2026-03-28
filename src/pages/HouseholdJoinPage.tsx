import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";

export function HouseholdJoinPage() {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading, joinHousehold } = useHousehold();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (household) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await joinHousehold(code);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <div className="screen login-screen">
      <header className="login-header">
        <h1 className="title">招待コードで参加</h1>
        <p className="subtitle">共有されたコードを入力してください</p>
      </header>

      <form className="card form" onSubmit={onSubmit}>
        <label className="field">
          <span className="label">招待コード</span>
          <input
            type="text"
            name="invite-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="8文字のコード"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={16}
          />
        </label>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? "参加中…" : "参加する"}
        </button>

        <p className="auth-switch">
          <Link to="/household/setup" className="link">
            戻る
          </Link>
        </p>
      </form>
    </div>
  );
}
