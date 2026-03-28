import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  CATEGORY_IN_USE,
  deleteCategory,
  fetchCategoriesForHousehold,
} from "../api/categories";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";
import type { Category } from "../types/ledger";

export function CategoriesPage() {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const location = useLocation();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!household?.id) return;
    setListLoading(true);
    setListError(null);
    const { data, error } = await fetchCategoriesForHousehold(household.id);
    if (error) {
      setListError(error.message);
      setCategories([]);
    } else {
      setCategories(data);
    }
    setListLoading(false);
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

  async function confirmDelete() {
    if (!pendingDelete || !household) return;
    setDeleteError(null);
    setDeleteBusy(true);
    const { error } = await deleteCategory(pendingDelete.id, household.id);
    setDeleteBusy(false);
    if (error) {
      if (error.message === CATEGORY_IN_USE) {
        setDeleteError("このカテゴリは収支で使用中のため削除できません。先に該当の収支を別カテゴリへ変更してください。");
      } else {
        setDeleteError(error.message);
      }
      return;
    }
    setPendingDelete(null);
    setNotice("カテゴリを削除しました");
    void load();
  }

  return (
    <div className="screen cat-page">
      <header className="form-screen__head">
        <Link to="/" className="form-back">
          ← ホーム
        </Link>
        <h1 className="form-screen__title">カテゴリ</h1>
        <p className="form-screen__sub muted small">{household.name}（共通）</p>
      </header>

      {notice ? (
        <p className="save-banner" role="status">
          {notice}
        </p>
      ) : null}

      <div className="cat-toolbar">
        <Link to="/categories/new" className="btn primary">
          ＋ カテゴリを追加
        </Link>
      </div>

      {listLoading ? (
        <p className="muted">読み込み中…</p>
      ) : listError ? (
        <p className="error" role="alert">
          {listError}
        </p>
      ) : categories.length === 0 ? (
        <div className="card cat-empty">
          <p className="muted">カテゴリがありません。</p>
          <p className="muted small">「カテゴリを追加」から登録してください。</p>
        </div>
      ) : (
        <ul className="cat-list" role="list">
          {categories.map((c) => (
            <li key={c.id} className="cat-row">
              <span className="cat-row__name">{c.name}</span>
              <div className="cat-row__actions">
                <Link to={`/categories/${c.id}/edit`} className="cat-row__link">
                  編集
                </Link>
                <button
                  type="button"
                  className="cat-row__del"
                  onClick={() => {
                    setDeleteError(null);
                    setPendingDelete(c);
                  }}
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="カテゴリを削除"
        description={
          pendingDelete
            ? `「${pendingDelete.name}」を削除しますか？この操作は取り消せません。`
            : ""
        }
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        destructive
        busy={deleteBusy}
        onCancel={() => {
          if (!deleteBusy) {
            setPendingDelete(null);
            setDeleteError(null);
          }
        }}
        onConfirm={() => void confirmDelete()}
      >
        {deleteError ? (
          <p className="error dialog-inline-error" role="alert">
            {deleteError}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
