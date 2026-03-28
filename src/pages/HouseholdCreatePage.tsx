import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";

export function HouseholdCreatePage() {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading, createHousehold } = useHousehold();
  const navigate = useNavigate();
  const [name, setName] = useState("");
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
    const { error: err } = await createHousehold(name);
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
        <h1 className="title">グループ作成</h1>
        <p className="subtitle">家計簿の名前を決めます</p>
      </header>

      <form className="card form" onSubmit={onSubmit}>
        <label className="field">
          <span className="label">グループ名</span>
          <input
            type="text"
            name="household-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：山田家の家計"
            autoComplete="organization"
          />
        </label>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? "作成中…" : "作成する"}
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
