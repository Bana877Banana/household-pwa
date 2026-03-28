import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { CATEGORY_DUPLICATE_NAME, fetchCategoryById, updateCategory } from "../api/categories";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";
import { validateCategoryName } from "../lib/categoryValidation";

export function CategoryEditPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!categoryId || !household?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    void fetchCategoryById(categoryId, household.id).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setName("");
      } else if (!data) {
        setLoadError("カテゴリが見つかりません");
        setName("");
      } else {
        setName(data.name);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [categoryId, household?.id]);

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

  if (!categoryId) {
    return <Navigate to="/categories" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!categoryId || !household) return;
    setSubmitError(null);
    const v = validateCategoryName(name);
    if (!v.ok) {
      setNameError(v.message);
      return;
    }
    setNameError(null);
    setSubmitting(true);
    const { error } = await updateCategory({
      id: categoryId,
      householdId: household.id,
      name: v.name,
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
    navigate("/categories", { state: { notice: "カテゴリを更新しました" } });
  }

  if (loading) {
    return (
      <div className="screen">
        <p className="muted">読み込み中…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="screen">
        <header className="form-screen__head">
          <Link to="/categories" className="form-back">
            ← 一覧
          </Link>
        </header>
        <p className="error" role="alert">
          {loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="screen form-screen">
      <header className="form-screen__head">
        <Link to="/categories" className="form-back">
          ← 一覧
        </Link>
        <h1 className="form-screen__title">カテゴリを編集</h1>
      </header>

      <form className="form-screen__body" onSubmit={(e) => void onSubmit(e)}>
        <div className="card form-stack">
          <label className="field">
            <span className="label">名前</span>
            <input
              type="text"
              name="name"
              autoComplete="off"
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
