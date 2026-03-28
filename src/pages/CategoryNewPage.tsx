import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { CATEGORY_DUPLICATE_NAME, insertCategory } from "../api/categories";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";
import { validateCategoryName } from "../lib/categoryValidation";

export function CategoryNewPage() {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!household || !user) return;
    setSubmitError(null);
    const v = validateCategoryName(name);
    if (!v.ok) {
      setNameError(v.message);
      return;
    }
    setNameError(null);
    setSubmitting(true);
    const { error } = await insertCategory({
      householdId: household.id,
      name: v.name,
      createdBy: user.id,
    });
    setSubmitting(false);
    if (error) {
      if (error.message === CATEGORY_DUPLICATE_NAME) {
        setSubmitError("同じ名前のカテゴリがすでにあります");
      } else {
        setSubmitError(error.message);
      }
      return;
    }
    navigate("/categories", { state: { notice: "カテゴリを追加しました" } });
  }

  return (
    <div className="screen form-screen">
      <header className="form-screen__head">
        <Link to="/categories" className="form-back">
          ← 一覧
        </Link>
        <h1 className="form-screen__title">カテゴリを追加</h1>
      </header>

      <form className="form-screen__body" onSubmit={(e) => void onSubmit(e)}>
        <div className="card form-stack">
          <label className="field">
            <span className="label">名前</span>
            <input
              type="text"
              name="name"
              autoComplete="off"
              placeholder="例：食材"
              value={name}
              onChange={(ev) => {
                setName(ev.target.value);
                setNameError(null);
              }}
            />
            {nameError ? (
              <p className="field-error" role="alert">
                {nameError}
              </p>
            ) : null}
          </label>
          {submitError ? (
            <p className="error" role="alert">
              {submitError}
            </p>
          ) : null}
        </div>
        <div className="form-sticky-actions">
          <button type="submit" className="btn primary btn-save" disabled={submitting}>
            {submitting ? "保存中…" : "保存する"}
          </button>
        </div>
      </form>
    </div>
  );
}
