import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  deleteTransaction,
  fetchTransactionById,
  updateTransaction,
} from "../api/transactions";
import { fetchCategoriesForHousehold } from "../api/categories";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  TransactionFormFields,
  type TransactionFormFieldKey,
} from "../components/TransactionFormFields";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";
import { validateTransactionForm } from "../lib/transactionValidation";
import type { Category, TransactionType } from "../types/ledger";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function TransactionEditPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const navigate = useNavigate();
  const location = useLocation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [txLoading, setTxLoading] = useState(true);

  const [date, setDate] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [categoryId, setCategoryId] = useState("");
  const [memo, setMemo] = useState("");

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<TransactionFormFieldKey, string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const clearFieldError = useCallback((key: TransactionFormFieldKey) => {
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  useEffect(() => {
    if (!household?.id || !transactionId || !UUID_RE.test(transactionId)) {
      setCategories([]);
      setCategoriesLoading(false);
      return;
    }

    let cancelled = false;
    setCategoriesLoading(true);
    setTxLoading(true);
    setLoadError(null);

    void Promise.all([
      fetchCategoriesForHousehold(household.id),
      fetchTransactionById(transactionId, household.id),
    ]).then(([cats, txRes]) => {
      if (cancelled) return;

      if (cats.error) {
        setCategories([]);
      } else {
        setCategories(cats.data);
      }
      setCategoriesLoading(false);

      if (txRes.error) {
        setLoadError(txRes.error.message);
        setTxLoading(false);
        return;
      }
      if (!txRes.data) {
        setLoadError("収支が見つかりません");
        setTxLoading(false);
        return;
      }

      const t = txRes.data;
      setDate(t.date);
      setAmountRaw(String(t.amount));
      setType(t.type);
      setCategoryId(t.categoryId ?? "");
      setMemo(t.memo);
      setTxLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [household?.id, transactionId, location.key]);

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

  if (!transactionId || !UUID_RE.test(transactionId)) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!transactionId || !household) return;
    setSubmitError(null);

    const result = validateTransactionForm({
      date,
      amountRaw,
      type,
      categoryId,
      memo,
    });

    if (!result.ok) {
      setFieldErrors(result.errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    const { error } = await updateTransaction({
      transactionId,
      householdId: household.id,
      occurredOn: result.values.occurredOn,
      amount: result.values.amount,
      type: result.values.type,
      categoryId: result.values.categoryId,
      memo: result.values.memo,
    });

    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    navigate("/", { state: { txUpdated: true } });
  }

  async function confirmDelete() {
    if (!household || !transactionId) return;
    setDeleteError(null);
    setDeleteBusy(true);
    const { error } = await deleteTransaction(transactionId, household.id);
    setDeleteBusy(false);
    if (error) {
      setDeleteError(error.message);
      return;
    }
    setDeleteOpen(false);
    navigate("/", { state: { txDeleted: true } });
  }

  if (txLoading) {
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
          <Link to="/" className="form-back">
            ← ホーム
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
        <Link to="/" className="form-back">
          ← ホーム
        </Link>
        <h1 className="form-screen__title">収支を編集</h1>
        <p className="form-screen__sub muted small">{household.name}</p>
      </header>

      <form className="form-screen__body" onSubmit={(e) => void onSubmit(e)}>
        <TransactionFormFields
          date={date}
          setDate={setDate}
          amountRaw={amountRaw}
          setAmountRaw={setAmountRaw}
          type={type}
          setType={setType}
          categoryId={categoryId}
          setCategoryId={setCategoryId}
          memo={memo}
          setMemo={setMemo}
          categories={categories}
          categoriesLoading={categoriesLoading}
          fieldErrors={fieldErrors}
          clearFieldError={clearFieldError}
          submitError={submitError}
          submitErrorPrefix="更新できませんでした。"
        />

        <div className="card tx-edit-actions">
          <button
            type="button"
            className="btn danger-outline"
            onClick={() => {
              setDeleteError(null);
              setDeleteOpen(true);
            }}
          >
            削除
          </button>
        </div>

        <div className="form-sticky-actions">
          <button type="submit" className="btn primary btn-save" disabled={submitting}>
            {submitting ? "保存中…" : "変更を保存"}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={deleteOpen}
        title="収支を削除"
        description="この取引を削除しますか？取り消せません。"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        destructive
        busy={deleteBusy}
        onCancel={() => {
          if (!deleteBusy) {
            setDeleteOpen(false);
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
