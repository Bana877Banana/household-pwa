import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { fetchCategoriesForHousehold } from "../api/categories";
import {
  deleteRecurringRule,
  fetchRecurringRuleById,
  insertRecurringRule,
  updateRecurringRule,
} from "../api/recurringTransactions";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";
import { RECURRENCE_OPTIONS } from "../lib/recurringRuleLabels";
import {
  validateRecurringRuleForm,
  type RecurringRuleFormErrors,
} from "../lib/recurringRuleValidation";
import type { TransactionType } from "../types/ledger";
import type { RecurrenceType } from "../types/recurring";

export function RecurringRuleEditorPage() {
  const { ruleId } = useParams<{ ruleId: string }>();
  const isNew = !ruleId;
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);

  const [type, setType] = useState<TransactionType | "">("expense");
  const [amountRaw, setAmountRaw] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [memo, setMemo] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDateRaw, setEndDateRaw] = useState("");
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("monthly");

  const [fieldErrors, setFieldErrors] = useState<RecurringRuleFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadBusy, setLoadBusy] = useState(!isNew);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!household?.id) {
      setCatsLoading(false);
      return;
    }
    let cancelled = false;
    setCatsLoading(true);
    void fetchCategoriesForHousehold(household.id).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setCategories([]);
      } else {
        setCategories(data);
      }
      setCatsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [household?.id]);

  useEffect(() => {
    if (isNew || !ruleId || !household?.id) {
      setLoadBusy(false);
      return;
    }
    let cancelled = false;
    setLoadBusy(true);
    setLoadError(null);
    void fetchRecurringRuleById(ruleId, household.id).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
      } else if (!data) {
        setLoadError("ルールが見つかりません");
      } else {
        setType(data.type);
        setAmountRaw(String(data.amount));
        setCategoryId(data.category_id ?? "");
        setMemo(data.memo);
        setStartDate(data.start_date);
        setEndDateRaw(data.end_date ?? "");
        setRecurrenceType(data.recurrence_type);
      }
      setLoadBusy(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isNew, ruleId, household?.id]);

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

  if (!isNew && !ruleId) {
    return <Navigate to="/recurring" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!household || !user) return;
    setSubmitError(null);
    const result = validateRecurringRuleForm({
      type,
      amountRaw,
      categoryId,
      memo,
      startDate,
      endDateRaw,
      recurrenceType,
    });
    if (!result.ok) {
      setFieldErrors(result.errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    if (isNew) {
      const { error } = await insertRecurringRule({
        householdId: household.id,
        type: result.values.type,
        amount: result.values.amount,
        categoryId: result.values.categoryId,
        memo: result.values.memo,
        startDate: result.values.startDate,
        endDate: result.values.endDate,
        recurrenceType: result.values.recurrenceType,
        createdBy: user.id,
      });
      setSubmitting(false);
      if (error) {
        setSubmitError(error.message);
        return;
      }
      navigate("/recurring", { state: { notice: "ルールを追加しました" } });
    } else {
      const { error } = await updateRecurringRule({
        ruleId: ruleId!,
        householdId: household.id,
        type: result.values.type,
        amount: result.values.amount,
        categoryId: result.values.categoryId,
        memo: result.values.memo,
        startDate: result.values.startDate,
        endDate: result.values.endDate,
        recurrenceType: result.values.recurrenceType,
      });
      setSubmitting(false);
      if (error) {
        setSubmitError(error.message);
        return;
      }
      navigate("/recurring", { state: { notice: "ルールを更新しました" } });
    }
  }

  async function onConfirmDelete() {
    if (!ruleId || !household) return;
    setDeleteError(null);
    setDeleteBusy(true);
    const { error } = await deleteRecurringRule(ruleId, household.id);
    setDeleteBusy(false);
    if (error) {
      setDeleteError(error.message);
      return;
    }
    setDeleteOpen(false);
    navigate("/recurring", { state: { notice: "ルールを削除しました" } });
  }

  if (!isNew && loadBusy) {
    return (
      <div className="screen">
        <p className="muted">読み込み中…</p>
      </div>
    );
  }

  if (!isNew && loadError) {
    return (
      <div className="screen form-screen">
        <header className="form-screen__head">
          <Link to="/recurring" className="form-back">
            ← 一覧
          </Link>
          <h1 className="form-screen__title">ルールを編集</h1>
        </header>
        <div className="form-screen__body">
          <p className="error" role="alert">
            {loadError}
          </p>
        </div>
      </div>
    );
  }

  const selectedRec = RECURRENCE_OPTIONS.find((o) => o.value === recurrenceType);

  return (
    <div className="screen form-screen">
      <header className="form-screen__head">
        <Link to="/recurring" className="form-back">
          ← 一覧
        </Link>
        <h1 className="form-screen__title">{isNew ? "ルールを追加" : "ルールを編集"}</h1>
        <p className="form-screen__sub muted small">
          ホームの一覧では期間内に自動で並びます。特定の日だけ実際の取引で上書きすることもできます。
        </p>
      </header>

      <form className="form-screen__body" onSubmit={(e) => void onSubmit(e)}>
        <div className="card form-stack">
          <fieldset className="field field--segment">
            <legend className="label">種別</legend>
            <div className="type-segment" role="group" aria-label="種別">
              <button
                type="button"
                className={`type-segment__btn ${type === "expense" ? "type-segment__btn--active" : ""}`}
                onClick={() => {
                  setType("expense");
                  setFieldErrors((p) => ({ ...p, type: undefined }));
                }}
              >
                支出
              </button>
              <button
                type="button"
                className={`type-segment__btn ${type === "income" ? "type-segment__btn--active" : ""}`}
                onClick={() => {
                  setType("income");
                  setFieldErrors((p) => ({ ...p, type: undefined }));
                }}
              >
                入金
              </button>
            </div>
            {fieldErrors.type ? (
              <p className="field-error" role="alert">
                {fieldErrors.type}
              </p>
            ) : null}
          </fieldset>

          <label className="field">
            <span className="label">金額</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="例：85000"
              value={amountRaw}
              onChange={(ev) => {
                setAmountRaw(ev.target.value);
                setFieldErrors((p) => ({ ...p, amount: undefined }));
              }}
            />
            {fieldErrors.amount ? (
              <p className="field-error" role="alert">
                {fieldErrors.amount}
              </p>
            ) : null}
          </label>

          <label className="field">
            <span className="label">カテゴリ</span>
            <select
              value={categoryId}
              onChange={(ev) => setCategoryId(ev.target.value)}
              disabled={catsLoading}
            >
              <option value="">未分類</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="muted small field-hint-below">
              <Link to="/categories" className="link">
                カテゴリを管理
              </Link>
            </p>
          </label>

          <label className="field">
            <span className="label">繰り返し</span>
            <select
              value={recurrenceType}
              onChange={(ev) => {
                const v = ev.target.value;
                if (
                  v === "daily" ||
                  v === "weekly" ||
                  v === "monthly" ||
                  v === "yearly"
                ) {
                  setRecurrenceType(v);
                  setFieldErrors((p) => ({ ...p, recurrence: undefined }));
                }
              }}
            >
              {RECURRENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {selectedRec ? (
              <p className="muted small field-hint-below">{selectedRec.hint}</p>
            ) : null}
            {fieldErrors.recurrence ? (
              <p className="field-error" role="alert">
                {fieldErrors.recurrence}
              </p>
            ) : null}
          </label>

          <label className="field">
            <span className="label">開始日（周期の基準にもなります）</span>
            <span className="field-date-shell">
              <input
                type="date"
                className="input-date"
                value={startDate}
                onChange={(ev) => {
                  setStartDate(ev.target.value);
                  setFieldErrors((p) => ({ ...p, startDate: undefined }));
                }}
              />
            </span>
            {fieldErrors.startDate ? (
              <p className="field-error" role="alert">
                {fieldErrors.startDate}
              </p>
            ) : null}
          </label>

          <label className="field">
            <span className="label">終了日（任意・空欄で無期限）</span>
            <span className="field-date-shell">
              <input
                type="date"
                className="input-date"
                value={endDateRaw}
                onChange={(ev) => {
                  setEndDateRaw(ev.target.value);
                  setFieldErrors((p) => ({ ...p, endDate: undefined }));
                }}
              />
            </span>
            {fieldErrors.endDate ? (
              <p className="field-error" role="alert">
                {fieldErrors.endDate}
              </p>
            ) : null}
          </label>

          <label className="field">
            <span className="label">メモ（任意）</span>
            <input
              type="text"
              autoComplete="off"
              placeholder="例：家賃"
              value={memo}
              onChange={(ev) => setMemo(ev.target.value)}
            />
          </label>

          {submitError ? (
            <p className="error" role="alert">
              {submitError}
            </p>
          ) : null}
        </div>

        <div className="form-sticky-actions form-sticky-actions--stack">
          <button type="submit" className="btn primary btn-save" disabled={submitting}>
            {submitting ? "保存中…" : "保存する"}
          </button>
          {!isNew ? (
            <button
              type="button"
              className="btn danger-outline"
              onClick={() => {
                setDeleteError(null);
                setDeleteOpen(true);
              }}
            >
              このルールを削除
            </button>
          ) : null}
        </div>
      </form>

      <ConfirmDialog
        open={deleteOpen}
        title="ルールを削除しますか？"
        description="削除後は、このルールからの仮想表示は出なくなります。すでに登録した取引データは消えません。"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        destructive
        busy={deleteBusy}
        onConfirm={() => void onConfirmDelete()}
        onCancel={() => {
          if (!deleteBusy) setDeleteOpen(false);
        }}
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
