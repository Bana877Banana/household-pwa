/**
 * 家計の収支・カテゴリ型（DB / アプリ共通の意味合い）
 * DB カラム household_id は要件の group_id に相当。
 * DB カラム occurred_on は要件の date（計上日）に相当。
 */

export type TransactionType = "income" | "expense";

/** PostgREST / Supabase から返る行（スネークケース） */
export type TransactionRow = {
  id: string;
  household_id: string;
  occurred_on: string;
  amount: number | string;
  type: TransactionType;
  category_id: string | null;
  memo: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  recurring_transaction_id?: string | null;
};

export type CategoryRow = {
  id: string;
  household_id: string;
  name: string;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

/** `categories (...)` 結合の 1 行分（PostgREST は単一行でも配列でも返しうる） */
export type CategoryJoin = { id: string; name: string };

/** 取引＋任意でカテゴリ名（一覧取得用・Supabase select 行） */
export type TransactionWithCategory = TransactionRow & {
  categories: CategoryJoin | CategoryJoin[] | null;
};

export function normalizeCategoryJoin(
  c: CategoryJoin | CategoryJoin[] | null | undefined
): CategoryJoin | null {
  if (c == null) return null;
  return Array.isArray(c) ? (c[0] ?? null) : c;
}

/** 実レコード or 繰り返しの画面合成行 */
export type TransactionEntrySource = "actual" | "recurring_virtual";

/** アプリ内で扱いやすい形（キャメルケース） */
export type Transaction = {
  id: string;
  /** 家計グループID（= group_id） */
  householdId: string;
  /** 計上日 YYYY-MM-DD（= date） */
  date: string;
  amount: number;
  type: TransactionType;
  categoryId: string | null;
  categoryName: string | null;
  memo: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** 紐づく繰り返しルールID（実レコードの上書き・仮想行の元） */
  recurringTransactionId?: string | null;
  /** 一覧合成時: 繰り返しからの仮想行 */
  entrySource?: TransactionEntrySource;
};

export type Category = {
  id: string;
  householdId: string;
  name: string;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export function parseAmount(value: number | string): number {
  if (typeof value === "number") {
    return value;
  }
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTransactionRow(row: TransactionWithCategory): Transaction {
  const cat = normalizeCategoryJoin(row.categories);
  return {
    id: row.id,
    householdId: row.household_id,
    date: row.occurred_on,
    amount: parseAmount(row.amount),
    type: row.type,
    categoryId: row.category_id,
    categoryName: cat?.name ?? null,
    memo: row.memo,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    recurringTransactionId: row.recurring_transaction_id ?? null,
    entrySource: "actual",
  };
}
