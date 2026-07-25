-- =============================================================================
-- 買い物メモ（shopping_items）
-- 家計グループ（household_id）単位で共有。所属メンバーのみ CRUD（RLS）
-- =============================================================================

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  note text not null default '',
  is_checked boolean not null default false,
  created_by uuid not null references auth.users (id) default auth.uid(),
  checked_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  checked_at timestamptz,
  constraint shopping_items_name_not_empty check (length(trim(name)) > 0)
);

create index shopping_items_household_id_idx
  on public.shopping_items (household_id);

create index shopping_items_household_checked_created_idx
  on public.shopping_items (household_id, is_checked, created_at desc);

create trigger shopping_items_set_updated_at
before update on public.shopping_items
for each row execute function public.set_updated_at();

comment on table public.shopping_items is '家計グループ単位の買い物メモ。メンバー間で共有。';
comment on column public.shopping_items.household_id is '家計グループ（要件の group_id に相当）';
comment on column public.shopping_items.note is '任意の補足メモ';
comment on column public.shopping_items.is_checked is '購入済み（チェック済み）かどうか';
comment on column public.shopping_items.checked_by is 'チェックしたユーザー（未チェック時は null）';
comment on column public.shopping_items.checked_at is 'チェックした日時（未チェック時は null）';

-- -----------------------------------------------------------------------------
-- Row Level Security（household_members 経由。categories / transactions と同型）
-- -----------------------------------------------------------------------------

alter table public.shopping_items enable row level security;

create policy "shopping_items_select_member"
on public.shopping_items for select to authenticated
using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = shopping_items.household_id
      and hm.user_id = (select auth.uid())
  )
);

create policy "shopping_items_insert_member"
on public.shopping_items for insert to authenticated
with check (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = shopping_items.household_id
      and hm.user_id = (select auth.uid())
  )
  and created_by = (select auth.uid())
);

create policy "shopping_items_update_member"
on public.shopping_items for update to authenticated
using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = shopping_items.household_id
      and hm.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = shopping_items.household_id
      and hm.user_id = (select auth.uid())
  )
);

create policy "shopping_items_delete_member"
on public.shopping_items for delete to authenticated
using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = shopping_items.household_id
      and hm.user_id = (select auth.uid())
  )
);

grant select, insert, update, delete on table public.shopping_items to authenticated;
revoke all on table public.shopping_items from anon;
