import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  deleteCheckedShoppingItems,
  deleteShoppingItem,
  fetchShoppingItemsForHousehold,
  insertShoppingItem,
  setShoppingItemChecked,
} from "../api/shoppingItems";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";
import {
  validateShoppingItemName,
  validateShoppingItemNote,
} from "../lib/shoppingValidation";
import type { ShoppingItem } from "../types/shopping";

type PendingAction =
  | { type: "delete"; item: ShoppingItem }
  | { type: "clearChecked" }
  | null;

export function ShoppingPage() {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [pending, setPending] = useState<PendingAction>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!household?.id) return;
    setListLoading(true);
    setListError(null);
    const { data, error } = await fetchShoppingItemsForHousehold(household.id);
    if (error) {
      setListError(error.message);
      setItems([]);
    } else {
      setItems(data);
    }
    setListLoading(false);
  }, [household?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const unchecked = useMemo(
    () => items.filter((i) => !i.isChecked),
    [items]
  );
  const checked = useMemo(() => items.filter((i) => i.isChecked), [items]);

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

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!household || !user) return;

    setFieldError(null);
    setSubmitError(null);

    const nameResult = validateShoppingItemName(name);
    if (!nameResult.ok) {
      setFieldError(nameResult.message);
      return;
    }
    const noteResult = validateShoppingItemNote(note);
    if (!noteResult.ok) {
      setFieldError(noteResult.message);
      return;
    }

    setSubmitting(true);
    const { error } = await insertShoppingItem({
      householdId: household.id,
      name: nameResult.name,
      note: noteResult.note,
      createdBy: user.id,
    });
    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setName("");
    setNote("");
    setShowNote(false);
    setNotice("追加しました");
    void load();
  }

  async function handleToggle(item: ShoppingItem) {
    if (!household || !user || togglingId) return;
    setActionError(null);
    setTogglingId(item.id);
    const nextChecked = !item.isChecked;
    // 楽観的に反映（片手操作の体感を良くする）
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id
          ? {
              ...row,
              isChecked: nextChecked,
              checkedBy: nextChecked ? user.id : null,
              checkedAt: nextChecked ? new Date().toISOString() : null,
            }
          : row
      )
    );
    const { error } = await setShoppingItemChecked({
      id: item.id,
      householdId: household.id,
      isChecked: nextChecked,
      userId: user.id,
    });
    setTogglingId(null);
    if (error) {
      setActionError(error.message);
      void load();
    }
  }

  async function confirmPending() {
    if (!pending || !household) return;
    setDialogError(null);
    setDialogBusy(true);

    if (pending.type === "delete") {
      const { error } = await deleteShoppingItem(pending.item.id, household.id);
      setDialogBusy(false);
      if (error) {
        setDialogError(error.message);
        return;
      }
      setPending(null);
      setNotice("削除しました");
      void load();
      return;
    }

    const { error } = await deleteCheckedShoppingItems(household.id);
    setDialogBusy(false);
    if (error) {
      setDialogError(error.message);
      return;
    }
    setPending(null);
    setNotice("チェック済みを削除しました");
    void load();
  }

  const dialogTitle =
    pending?.type === "delete"
      ? "メモを削除"
      : pending?.type === "clearChecked"
        ? "チェック済みを削除"
        : "";
  const dialogDescription =
    pending?.type === "delete"
      ? `「${pending.item.name}」を削除しますか？この操作は取り消せません。`
      : pending?.type === "clearChecked"
        ? `チェック済み ${checked.length} 件をまとめて削除しますか？この操作は取り消せません。`
        : "";

  return (
    <div className="screen shopping-page">
      <header className="form-screen__head">
        <Link to="/" className="form-back">
          ← ホーム
        </Link>
        <h1 className="form-screen__title">買い物メモ</h1>
        <p className="form-screen__sub muted small">
          {household.name}（2人で共有）
        </p>
      </header>

      {notice ? (
        <p className="save-banner" role="status">
          {notice}
        </p>
      ) : null}

      <form className="shopping-add card" onSubmit={(e) => void handleAdd(e)}>
        <label className="field">
          <span className="label">買いたいもの</span>
          <div className="shopping-add__row">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 牛乳"
              autoComplete="off"
              enterKeyHint="done"
              disabled={submitting}
              aria-invalid={Boolean(fieldError)}
            />
            <button
              type="submit"
              className="btn primary shopping-add__btn"
              disabled={submitting}
            >
              {submitting ? "…" : "追加"}
            </button>
          </div>
        </label>

        {showNote ? (
          <label className="field">
            <span className="label">メモ（任意）</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例: 低脂肪・1本"
              autoComplete="off"
              disabled={submitting}
            />
          </label>
        ) : (
          <button
            type="button"
            className="shopping-note-toggle"
            onClick={() => setShowNote(true)}
          >
            ＋ メモを追加（任意）
          </button>
        )}

        {fieldError ? (
          <p className="error" role="alert">
            {fieldError}
          </p>
        ) : null}
        {submitError ? (
          <p className="error" role="alert">
            {submitError}
          </p>
        ) : null}
      </form>

      {actionError ? (
        <p className="error" role="alert">
          {actionError}
        </p>
      ) : null}

      {listLoading ? (
        <p className="muted">読み込み中…</p>
      ) : listError ? (
        <div className="card">
          <p className="error" role="alert">
            {listError}
          </p>
          <button
            type="button"
            className="btn secondary"
            onClick={() => void load()}
          >
            再読み込み
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="card cat-empty">
          <p className="muted">買い物メモはまだありません。</p>
          <p className="muted small">上の入力欄から追加してください。</p>
        </div>
      ) : (
        <>
          {unchecked.length > 0 ? (
            <section aria-labelledby="shopping-todo-heading">
              <h2 id="shopping-todo-heading" className="shopping-section-title">
                買うもの（{unchecked.length}）
              </h2>
              <ul className="shopping-list" role="list">
                {unchecked.map((item) => (
                  <ShoppingRow
                    key={item.id}
                    item={item}
                    busy={togglingId === item.id}
                    onToggle={() => void handleToggle(item)}
                    onDelete={() => {
                      setDialogError(null);
                      setPending({ type: "delete", item });
                    }}
                  />
                ))}
              </ul>
            </section>
          ) : (
            <div className="card cat-empty">
              <p className="muted">未チェックのメモはありません。</p>
            </div>
          )}

          {checked.length > 0 ? (
            <section
              className="shopping-checked-section"
              aria-labelledby="shopping-done-heading"
            >
              <div className="shopping-checked-head">
                <h2 id="shopping-done-heading" className="shopping-section-title">
                  チェック済み（{checked.length}）
                </h2>
                <button
                  type="button"
                  className="shopping-clear-checked"
                  onClick={() => {
                    setDialogError(null);
                    setPending({ type: "clearChecked" });
                  }}
                >
                  まとめて削除
                </button>
              </div>
              <ul className="shopping-list" role="list">
                {checked.map((item) => (
                  <ShoppingRow
                    key={item.id}
                    item={item}
                    busy={togglingId === item.id}
                    onToggle={() => void handleToggle(item)}
                    onDelete={() => {
                      setDialogError(null);
                      setPending({ type: "delete", item });
                    }}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={dialogTitle}
        description={dialogDescription}
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        destructive
        busy={dialogBusy}
        onCancel={() => {
          if (!dialogBusy) {
            setPending(null);
            setDialogError(null);
          }
        }}
        onConfirm={() => void confirmPending()}
      >
        {dialogError ? (
          <p className="error dialog-inline-error" role="alert">
            {dialogError}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

function ShoppingRow({
  item,
  busy,
  onToggle,
  onDelete,
}: {
  item: ShoppingItem;
  busy: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className={
        item.isChecked ? "shopping-row shopping-row--checked" : "shopping-row"
      }
    >
      <button
        type="button"
        className="shopping-row__check"
        onClick={onToggle}
        disabled={busy}
        aria-pressed={item.isChecked}
        aria-label={
          item.isChecked
            ? `「${item.name}」のチェックを外す`
            : `「${item.name}」をチェック済みにする`
        }
      >
        <span className="shopping-row__box" aria-hidden>
          {item.isChecked ? "✓" : ""}
        </span>
        <span className="shopping-row__body">
          <span className="shopping-row__name">{item.name}</span>
          {item.note ? (
            <span className="shopping-row__note">{item.note}</span>
          ) : null}
        </span>
      </button>
      <button
        type="button"
        className="shopping-row__del"
        onClick={onDelete}
        aria-label={`「${item.name}」を削除`}
      >
        削除
      </button>
    </li>
  );
}
