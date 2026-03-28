import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { insertTransaction } from "../api/transactions";
import { fetchCategoriesForHousehold } from "../api/categories";
import {
  TransactionFormFields,
  type TransactionFormFieldKey,
} from "../components/TransactionFormFields";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";
import { todayIsoDateLocal } from "../lib/formatDisplayDate";
import { validateTransactionForm } from "../lib/transactionValidation";
import type { Category, TransactionType } from "../types/ledger";
import type { TransactionFormPrefill } from "../types/transactionFormPrefill";

export function TransactionNewPage() {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const navigate = useNavigate();
  const location = useLocation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [date, setDate] = useState(() => todayIsoDateLocal());
  const [amountRaw, setAmountRaw] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [categoryId, setCategoryId] = useState("");
  const [memo, setMemo] = useState("");

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<TransactionFormFieldKey, string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const clearFieldError = useCallback((key: TransactionFormFieldKey) => {
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  useEffect(() => {
    if (!household?.id) {
      setCategories([]);
      setCategoriesLoading(false);
      return;
    }

    let cancelled = false;
    setCategoriesLoading(true);

    void fetchCategoriesForHousehold(household.id).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setCategories([]);
      } else {
        setCategories(data);
      }
      setCategoriesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [household?.id, location.key]);

  useEffect(() => {
    const st = location.state as { transactionFormPrefill?: TransactionFormPrefill } | undefined;
    const p = st?.transactionFormPrefill;
    if (!p) return;
    if (p.occurredOn) setDate(p.occurredOn);
    if (p.amountRaw) setAmountRaw(p.amountRaw);
    if (p.memo) setMemo(p.memo);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate]);

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

    const { error } = await insertTransaction({
      householdId: household.id,
      occurredOn: result.values.occurredOn,
      amount: result.values.amount,
      type: result.values.type,
      categoryId: result.values.categoryId,
      memo: result.values.memo,
      createdBy: user.id,
    });

    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    navigate("/", { state: { savedTx: true } });
  }

  return (
    <div className="screen form-screen">
      <header className="form-screen__head">
        <Link to="/" className="form-back">
          ← ホーム
        </Link>
        <h1 className="form-screen__title">収支を登録</h1>
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
        />

        <div className="form-sticky-actions">
          <button type="submit" className="btn primary btn-save" disabled={submitting}>
            {submitting ? "保存中…" : "保存する"}
          </button>
        </div>
      </form>
    </div>
  );
}
