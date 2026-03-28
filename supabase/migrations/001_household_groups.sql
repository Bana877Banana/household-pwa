-- =============================================================================
-- 家計グループ（households + household_members）
-- Supabase SQL Editor で一括実行するか、`supabase db push` で適用してください。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- テーブル
-- -----------------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null,
  created_at timestamptz not null default now(),
  constraint households_name_not_empty check (length(trim(name)) > 0),
  constraint households_invite_code_format check (length(invite_code) >= 6)
);

create unique index households_invite_code_key on public.households (invite_code);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  constraint household_members_one_group_per_user unique (user_id)
);

create index household_members_user_id_idx on public.household_members (user_id);
create index household_members_household_id_idx on public.household_members (household_id);

comment on table public.households is '家計グループ。invite_code で2人目以降が参加する。';
comment on table public.household_members is 'ユーザーと家計の所属。MVPは user_id 一意で1グループのみ。';

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- 自分が所属する家計のみ読める
create policy "households_select_if_member"
on public.households
for select
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = households.id
      and hm.user_id = (select auth.uid())
  )
);

-- 自分の所属行だけ読める（同テーブルをサブクエリで参照しない＝RLS再帰を防ぐ）
-- 将来「同じ家計の全メンバー一覧」が必要なら SECURITY DEFINER のビュー/RPC で対応する
create policy "household_members_select_own_row"
on public.household_members
for select
to authenticated
using (user_id = (select auth.uid()));

-- INSERT/UPDATE/DELETE はクライアントから禁止（RPC の SECURITY DEFINER のみ）

grant select on table public.households to authenticated;
grant select on table public.household_members to authenticated;

revoke all on table public.households from anon;
revoke all on table public.household_members from anon;

-- -----------------------------------------------------------------------------
-- RPC: グループ作成（招待コード自動発行・自分をメンバーに追加）
-- -----------------------------------------------------------------------------

create or replace function public.create_household(p_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_household_id uuid;
  v_code text;
  n int := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if exists (select 1 from public.household_members where user_id = v_uid) then
    raise exception 'already_in_household';
  end if;

  if trim(p_name) is null or length(trim(p_name)) = 0 then
    raise exception 'invalid_name';
  end if;

  loop
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
    exit when not exists (select 1 from public.households h where h.invite_code = v_code);
    n := n + 1;
    if n > 20 then
      raise exception 'invite_code_generation_failed';
    end if;
  end loop;

  insert into public.households (name, invite_code)
  values (trim(p_name), v_code)
  returning id into v_household_id;

  insert into public.household_members (household_id, user_id)
  values (v_household_id, v_uid);

  return json_build_object(
    'household_id', v_household_id,
    'invite_code', v_code
  );
end;
$$;

comment on function public.create_household(text) is 'ログインユーザーが家計グループを1つ作成する。MVPは1ユーザー1グループ。';

-- -----------------------------------------------------------------------------
-- RPC: 招待コードで参加
-- -----------------------------------------------------------------------------

create or replace function public.join_household(p_invite_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_household_id uuid;
  v_normalized text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if exists (select 1 from public.household_members where user_id = v_uid) then
    raise exception 'already_in_household';
  end if;

  v_normalized := upper(trim(p_invite_code));
  if length(v_normalized) < 6 then
    raise exception 'invalid_invite_code';
  end if;

  select h.id into v_household_id
  from public.households h
  where h.invite_code = v_normalized;

  if v_household_id is null then
    raise exception 'invite_not_found';
  end if;

  insert into public.household_members (household_id, user_id)
  values (v_household_id, v_uid);

  return json_build_object('household_id', v_household_id);
end;
$$;

comment on function public.join_household(text) is '招待コードで家計グループに参加する。';

revoke all on function public.create_household(text) from public;
revoke all on function public.join_household(text) from public;

grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
