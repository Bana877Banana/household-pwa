-- =============================================================================
-- 修正: household_members の SELECT ポリシーが自分自身を再帰参照していたため
-- 「infinite recursion detected in policy for relation household_members」が発生する。
-- 既に 001 を適用済みのプロジェクトは本ファイルを SQL Editor で実行してください。
-- =============================================================================

drop policy if exists "household_members_select_if_same_household" on public.household_members;
drop policy if exists "household_members_select_own_row" on public.household_members;

create policy "household_members_select_own_row"
on public.household_members
for select
to authenticated
using (user_id = (select auth.uid()));
