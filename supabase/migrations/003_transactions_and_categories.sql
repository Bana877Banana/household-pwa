-- =============================================================================
-- カテゴリ・収支（transactions）
-- 所属メンバーのみ、同一 household_id の行を読み書き可能（RLS）
-- group_id 相当のカラムは既存スキーマに合わせ household_id を使用
-- 日付カラムは SQL の date 型、名前は occurred_on（アプリ層で日付として扱う）
-- =============================================================================

-- -----------------------------------------------------------------------------
-- updated_at 共通トリガ
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- categories
-- -----------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_by uuid not null references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_empty check (length(trim(name)) > 0),
  constraint categories_household_name_unique unique (household_id, name)
);

create index categories_household_id_idx on public.categories (household_id);
create index categories_household_sort_idx on public.categories (household_id, sort_order);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

comment on table public.categories is '家計グループ単位のカテゴリマスタ。';

-- -----------------------------------------------------------------------------
-- transactions（収支）
-- -----------------------------------------------------------------------------

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  occurred_on date not null,
  amount numeric(14, 2) not null,
  type text not null,
  category_id uuid references public.categories (id) on delete set null,
  memo text not null default '',
  created_by uuid not null references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_amount_positive check (amount > 0),
  constraint transactions_type_check check (type in ('income', 'expense'))
);

create index transactions_household_occurred_idx
  on public.transactions (household_id, occurred_on desc);
create index transactions_household_category_idx
  on public.transactions (household_id, category_id);

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

comment on table public.transactions is '収支エントリ。amount は正の数、種別は type で income / expense。';
comment on column public.transactions.occurred_on is '計上日（アプリ要件の date に相当）';
comment on column public.transactions.household_id is '家計グループ（要件の group_id に相当）';

-- -----------------------------------------------------------------------------
-- Row Level Security（household_members は再帰しない既存ポリシーを利用）
-- -----------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.transactions enable row level security;

-- categories
create policy "categories_select_member"
on public.categories for select to authenticated
using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = categories.household_id
      and hm.user_id = (select auth.uid())
  )
);

create policy "categories_insert_member"
on public.categories for insert to authenticated
with check (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = categories.household_id
      and hm.user_id = (select auth.uid())
  )
  and created_by = (select auth.uid())
);

create policy "categories_update_member"
on public.categories for update to authenticated
using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = categories.household_id
      and hm.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = categories.household_id
      and hm.user_id = (select auth.uid())
  )
);

create policy "categories_delete_member"
on public.categories for delete to authenticated
using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = categories.household_id
      and hm.user_id = (select auth.uid())
  )
);

-- transactions
create policy "transactions_select_member"
on public.transactions for select to authenticated
using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = transactions.household_id
      and hm.user_id = (select auth.uid())
  )
);

create policy "transactions_insert_member"
on public.transactions for insert to authenticated
with check (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = transactions.household_id
      and hm.user_id = (select auth.uid())
  )
  and created_by = (select auth.uid())
);

create policy "transactions_update_member"
on public.transactions for update to authenticated
using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = transactions.household_id
      and hm.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = transactions.household_id
      and hm.user_id = (select auth.uid())
  )
);

create policy "transactions_delete_member"
on public.transactions for delete to authenticated
using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = transactions.household_id
      and hm.user_id = (select auth.uid())
  )
);

grant select, insert, update, delete on table public.categories to authenticated;
grant select, insert, update, delete on table public.transactions to authenticated;

revoke all on table public.categories from anon;
revoke all on table public.transactions from anon;
