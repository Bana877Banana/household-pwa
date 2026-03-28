-- =============================================================================
-- 固定費・繰り返し収支（recurring_transactions）
-- transactions.recurring_transaction_id で「その日の実レコードがルールを上書き」する想定
-- group_id 相当は household_id
-- =============================================================================

create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  type text not null,
  amount numeric(14, 2) not null,
  category_id uuid references public.categories (id) on delete set null,
  memo text not null default '',
  start_date date not null,
  end_date date,
  recurrence_type text not null,
  created_by uuid not null references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_type_check check (type in ('income', 'expense')),
  constraint recurring_amount_positive check (amount > 0),
  constraint recurring_recurrence_check check (
    recurrence_type in ('daily', 'weekly', 'monthly', 'yearly')
  ),
  constraint recurring_end_after_start check (end_date is null or end_date >= start_date)
);

create index recurring_transactions_household_idx
  on public.recurring_transactions (household_id);

create trigger recurring_transactions_set_updated_at
before update on public.recurring_transactions
for each row execute function public.set_updated_at();

comment on table public.recurring_transactions is '繰り返し収支ルール。表示時に期間内へ展開し、実レコードと合成する。';

alter table public.transactions
  add column if not exists recurring_transaction_id uuid references public.recurring_transactions (id) on delete set null;

create index if not exists transactions_recurring_id_idx
  on public.transactions (recurring_transaction_id)
  where recurring_transaction_id is not null;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table public.recurring_transactions enable row level security;

create policy "recurring_select_member"
on public.recurring_transactions for select to authenticated
using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = recurring_transactions.household_id
      and hm.user_id = (select auth.uid())
  )
);

create policy "recurring_insert_member"
on public.recurring_transactions for insert to authenticated
with check (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = recurring_transactions.household_id
      and hm.user_id = (select auth.uid())
  )
  and created_by = (select auth.uid())
);

create policy "recurring_update_member"
on public.recurring_transactions for update to authenticated
using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = recurring_transactions.household_id
      and hm.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = recurring_transactions.household_id
      and hm.user_id = (select auth.uid())
  )
);

create policy "recurring_delete_member"
on public.recurring_transactions for delete to authenticated
using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = recurring_transactions.household_id
      and hm.user_id = (select auth.uid())
  )
);

grant select, insert, update, delete on table public.recurring_transactions to authenticated;
revoke all on table public.recurring_transactions from anon;

-- -----------------------------------------------------------------------------
-- 例: 毎月1日の家賃（支出）。YOUR_* を差し替えて実行。
-- -----------------------------------------------------------------------------
-- insert into public.recurring_transactions (
--   household_id, type, amount, category_id, memo, start_date, end_date, recurrence_type, created_by
-- ) values (
--   'YOUR_HOUSEHOLD_ID'::uuid,
--   'expense',
--   85000,
--   (select id from public.categories where household_id = 'YOUR_HOUSEHOLD_ID'::uuid and name = '固定費' limit 1),
--   '家賃',
--   '2026-01-01',
--   null,
--   'monthly',
--   'YOUR_USER_ID'::uuid
-- );
--
-- 例外月だけ実レコードで上書きする例（同じ日に手入力し recurring_transaction_id をルールIDに設定）:
-- insert into public.transactions (
--   household_id, occurred_on, amount, type, category_id, memo, created_by, recurring_transaction_id
-- ) values (
--   'YOUR_HOUSEHOLD_ID'::uuid,
--   '2026-03-01',
--   80000,
--   'expense',
--   ...,
--   '家賃（キャンペーン）',
--   'YOUR_USER_ID'::uuid,
--   'RECURRING_RULE_ID'::uuid
-- );
