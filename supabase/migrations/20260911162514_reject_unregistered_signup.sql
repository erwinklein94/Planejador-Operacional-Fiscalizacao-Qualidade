-- Draft follow-up migration; no account identifiers or credentials.
-- Supabase Auth adminUserCreate INSERTs auth.users and later UPDATEs app_metadata
-- within the same transaction. Provisioning must observe the metadata UPDATE.
-- Source: https://github.com/supabase/auth/blob/master/internal/api/admin.go

create or replace function private.provision_planner_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := new.raw_app_meta_data ->> 'planner_role';
  v_name text;
begin
  -- Profiles remain the current authority after initial provisioning. Provider
  -- metadata updates must not recreate an intentionally removed membership.
  if tg_op = 'UPDATE'
    and (old.raw_app_meta_data ->> 'planner_role') in ('editor', 'fiscalizacao', 'coordenacao')
  then
    return new;
  end if;

  if v_role in ('editor', 'fiscalizacao', 'coordenacao')
    and not coalesce(new.is_anonymous, false)
  then
    v_name := coalesce(
      nullif(btrim(new.raw_app_meta_data ->> 'planner_name'), ''),
      split_part(new.email, '@', 1)
    );
    insert into public.user_profiles (id, email, full_name, role)
    values (new.id, lower(new.email), v_name, v_role)
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.provision_planner_profile()
from public, anon, authenticated, service_role;

drop trigger if exists provision_planner_profile on auth.users;
create trigger provision_planner_profile
after insert or update of raw_app_meta_data on auth.users
for each row execute function private.provision_planner_profile();

-- Recover only missing profiles already authorized through protected metadata.
-- Existing names, roles and active/inactive status remain untouched.
insert into public.user_profiles (id, email, full_name, role)
select
  account.id,
  lower(account.email),
  coalesce(
    nullif(btrim(account.raw_app_meta_data ->> 'planner_name'), ''),
    split_part(account.email, '@', 1)
  ),
  account.raw_app_meta_data ->> 'planner_role'
from auth.users as account
where (account.raw_app_meta_data ->> 'planner_role') in ('editor', 'fiscalizacao', 'coordenacao')
  and not coalesce(account.is_anonymous, false)
  and account.deleted_at is null
  and not exists (select 1 from public.user_profiles as profile where profile.id = account.id)
on conflict (id) do nothing;

-- Enforce invite-only account creation even while the Auth signup endpoint is enabled.
-- The final row must be inspected at COMMIT, not NEW from the initial INSERT.
-- A public signup can set user_metadata but cannot set app_metadata.planner_role.
-- See https://github.com/supabase/auth/blob/master/internal/api/user.go and
-- https://www.postgresql.org/docs/current/sql-createtrigger.html
create or replace function private.require_registered_planner_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_is_anonymous boolean;
begin
  select account.raw_app_meta_data ->> 'planner_role', account.is_anonymous
  into v_role, v_is_anonymous
  from auth.users as account
  where account.id = new.id;

  -- A row created and deleted within the same transaction grants no access.
  if not found then return new; end if;

  if v_role is null
    or v_role not in ('editor', 'fiscalizacao', 'coordenacao')
    or coalesce(v_is_anonymous, false)
    or not exists (select 1 from public.user_profiles as profile where profile.id = new.id)
  then
    raise exception using
      errcode = '42501',
      message = 'Cadastro publico desativado. Solicite sua conta ao editor responsavel.';
  end if;
  return new;
end;
$$;

revoke all on function private.require_registered_planner_account()
from public, anon, authenticated, service_role;

drop trigger if exists require_registered_planner_account on auth.users;
create constraint trigger require_registered_planner_account
after insert on auth.users
deferrable initially deferred
for each row execute function private.require_registered_planner_account();

comment on function private.require_registered_planner_account() is
  'Rejects newly created Auth accounts without protected planner metadata and a provisioned profile at transaction commit.';

-- Also disable public signup in Auth settings when management access is available.
-- This database guard fails closed but Auth may surface a generic creation error.
-- Existing accounts without a profile remain blocked by planner RPCs and RLS.
