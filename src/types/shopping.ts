/** PostgREST / Supabase から返る行（スネークケース） */
export type ShoppingItemRow = {
  id: string;
  household_id: string;
  name: string;
  note: string;
  is_checked: boolean;
  created_by: string;
  checked_by: string | null;
  created_at: string;
  updated_at: string;
  checked_at: string | null;
};

/** アプリ内で扱いやすい形（キャメルケース） */
export type ShoppingItem = {
  id: string;
  householdId: string;
  name: string;
  note: string;
  isChecked: boolean;
  createdBy: string;
  checkedBy: string | null;
  createdAt: string;
  updatedAt: string;
  checkedAt: string | null;
};

export function mapShoppingItemRow(row: ShoppingItemRow): ShoppingItem {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    note: row.note ?? "",
    isChecked: row.is_checked,
    createdBy: row.created_by,
    checkedBy: row.checked_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    checkedAt: row.checked_at,
  };
}

export const SHOPPING_ITEM_SELECT =
  "id, household_id, name, note, is_checked, created_by, checked_by, created_at, updated_at, checked_at";
