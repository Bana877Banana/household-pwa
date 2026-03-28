-- =============================================================================
-- 確認用ダミーデータ投入の例
--
-- 手順:
-- 1) Supabase Table Editor で households / household_members を開き、
--    自分の家計の household_id と、created_by に使う user_id（auth.users）をメモする。
-- 2) 下の YOUR_HOUSEHOLD_ID / YOUR_USER_ID をその UUID に置き換える。
-- 3) SQL Editor で Run（RLS はバイパスされないため、INSERT ポリシーが効く＝
--    YOUR_USER_ID は「その家計のメンバーであるユーザー」と一致させること）
-- =============================================================================

-- カテゴリ
insert into public.categories (household_id, name, sort_order, created_by)
values
  ('YOUR_HOUSEHOLD_ID'::uuid, '食材', 10, 'YOUR_USER_ID'::uuid),
  ('YOUR_HOUSEHOLD_ID'::uuid, '固定費', 20, 'YOUR_USER_ID'::uuid);

-- 収支（日付の新しい順で並ぶよう日付をずらしています）
insert into public.transactions (
  household_id,
  occurred_on,
  amount,
  type,
  category_id,
  memo,
  created_by
)
values
  (
    'YOUR_HOUSEHOLD_ID'::uuid,
    '2026-03-28',
    1280,
    'expense',
    (select id from public.categories c where c.household_id = 'YOUR_HOUSEHOLD_ID'::uuid and c.name = '食材' limit 1),
    'スーパー',
    'YOUR_USER_ID'::uuid
  ),
  (
    'YOUR_HOUSEHOLD_ID'::uuid,
    '2026-03-27',
    350000,
    'income',
    null,
    '給与',
    'YOUR_USER_ID'::uuid
  ),
  (
    'YOUR_HOUSEHOLD_ID'::uuid,
    '2026-03-26',
    12000,
    'expense',
    (select id from public.categories c where c.household_id = 'YOUR_HOUSEHOLD_ID'::uuid and c.name = '固定費' limit 1),
    '電気代',
    'YOUR_USER_ID'::uuid
  );
