import { supabase } from "../lib/supabase";
import { mapCategoryRow, type Category, type CategoryRow } from "../types/ledger";

export type FetchCategoriesResult = {
  data: Category[];
  error: Error | null;
};

export const CATEGORY_IN_USE = "CATEGORY_IN_USE";
export const CATEGORY_DUPLICATE_NAME = "CATEGORY_DUPLICATE_NAME";

function mapInsertError(err: { message: string; code?: string }): Error {
  if (err.code === "23505") {
    return new Error(CATEGORY_DUPLICATE_NAME);
  }
  return new Error(err.message);
}

/** 指定家計のカテゴリ一覧（並び順）。0件でも error は null。 */
export async function fetchCategoriesForHousehold(
  householdId: string
): Promise<FetchCategoriesResult> {
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, household_id, name, sort_order, created_by, created_at, updated_at"
    )
    .eq("household_id", householdId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const rows = (data ?? []) as CategoryRow[];
  return { data: rows.map(mapCategoryRow), error: null };
}

export async function fetchCategoryById(
  categoryId: string,
  householdId: string
): Promise<{ data: Category | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, household_id, name, sort_order, created_by, created_at, updated_at"
    )
    .eq("id", categoryId)
    .eq("household_id", householdId)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return { data: mapCategoryRow(data as CategoryRow), error: null };
}

export async function insertCategory(input: {
  householdId: string;
  name: string;
  createdBy: string;
}): Promise<{ data: Category | null; error: Error | null }> {
  const { data: top, error: topErr } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("household_id", input.householdId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (topErr) {
    return { data: null, error: new Error(topErr.message) };
  }

  const nextSort = ((top as { sort_order?: number } | null)?.sort_order ?? -10) + 10;

  const { data, error } = await supabase
    .from("categories")
    .insert({
      household_id: input.householdId,
      name: input.name,
      sort_order: nextSort,
      created_by: input.createdBy,
    })
    .select(
      "id, household_id, name, sort_order, created_by, created_at, updated_at"
    )
    .single();

  if (error) {
    return { data: null, error: mapInsertError(error) };
  }

  return { data: mapCategoryRow(data as CategoryRow), error: null };
}

export async function updateCategory(input: {
  id: string;
  householdId: string;
  name: string;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("categories")
    .update({ name: input.name })
    .eq("id", input.id)
    .eq("household_id", input.householdId);

  if (error) {
    return { error: mapInsertError(error) };
  }

  return { error: null };
}

export async function countTransactionsUsingCategory(
  categoryId: string,
  householdId: string
): Promise<{ count: number; error: Error | null }> {
  const { count, error } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId)
    .eq("household_id", householdId);

  if (error) {
    return { count: 0, error: new Error(error.message) };
  }

  return { count: count ?? 0, error: null };
}

export async function deleteCategory(
  categoryId: string,
  householdId: string
): Promise<{ error: Error | null }> {
  const { count, error: countError } = await countTransactionsUsingCategory(
    categoryId,
    householdId
  );

  if (countError) {
    return { error: countError };
  }

  if (count > 0) {
    return { error: new Error(CATEGORY_IN_USE) };
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("household_id", householdId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}
