import { supabase } from "../lib/supabase";
import {
  SHOPPING_ITEM_SELECT,
  mapShoppingItemRow,
  type ShoppingItem,
  type ShoppingItemRow,
} from "../types/shopping";

export type FetchShoppingItemsResult = {
  data: ShoppingItem[];
  error: Error | null;
};

/** 指定家計の買い物メモ一覧。未チェック優先、同グループ内は新しい順。0件でも error は null。 */
export async function fetchShoppingItemsForHousehold(
  householdId: string
): Promise<FetchShoppingItemsResult> {
  const { data, error } = await supabase
    .from("shopping_items")
    .select(SHOPPING_ITEM_SELECT)
    .eq("household_id", householdId)
    .order("is_checked", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const rows = (data ?? []) as ShoppingItemRow[];
  return { data: rows.map(mapShoppingItemRow), error: null };
}

export async function insertShoppingItem(input: {
  householdId: string;
  name: string;
  note?: string;
  createdBy: string;
}): Promise<{ data: ShoppingItem | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("shopping_items")
    .insert({
      household_id: input.householdId,
      name: input.name,
      note: input.note ?? "",
      created_by: input.createdBy,
    })
    .select(SHOPPING_ITEM_SELECT)
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: mapShoppingItemRow(data as ShoppingItemRow), error: null };
}

export async function setShoppingItemChecked(input: {
  id: string;
  householdId: string;
  isChecked: boolean;
  userId: string;
}): Promise<{ error: Error | null }> {
  const patch = input.isChecked
    ? {
        is_checked: true,
        checked_by: input.userId,
        checked_at: new Date().toISOString(),
      }
    : {
        is_checked: false,
        checked_by: null,
        checked_at: null,
      };

  const { error } = await supabase
    .from("shopping_items")
    .update(patch)
    .eq("id", input.id)
    .eq("household_id", input.householdId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

export async function deleteShoppingItem(
  id: string,
  householdId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("shopping_items")
    .delete()
    .eq("id", id)
    .eq("household_id", householdId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/** チェック済みメモをまとめて削除 */
export async function deleteCheckedShoppingItems(
  householdId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("shopping_items")
    .delete()
    .eq("household_id", householdId)
    .eq("is_checked", true);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}
