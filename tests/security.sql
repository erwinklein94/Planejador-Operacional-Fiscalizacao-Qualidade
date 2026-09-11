-- Database-owner regression checks for the deferred Auth registration guard.
-- Safe to repeat: synthetic accounts are rolled back and no real account is modified.
begin;
set local statement_timeout = '15s';
set local lock_timeout = '3s';

do $$
declare
  v_admin_created constant uuid := 'e9200000-0000-4000-8000-000000000001';
  v_unregistered constant uuid := 'e9200000-0000-4000-8000-000000000002';
  v_spoofed constant uuid := 'e9200000-0000-4000-8000-000000000003';
  v_anonymous constant uuid := 'e9200000-0000-4000-8000-000000000004';
  v_case integer;
  v_id uuid;
  v_rejected boolean;
begin
  if exists (
    select 1 from auth.users
    where id in (v_admin_created, v_unregistered, v_spoofed, v_anonymous)
  ) then
    raise exception 'Security fixture UUID is already in use; no account was changed.';
  end if;

  -- Match adminUserCreate: the initial INSERT has provider metadata only.
  insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v_admin_created, 'authenticated', 'authenticated', 'admin-created.guard-test@example.invalid',
    '{"provider":"email","providers":["email"]}', '{}', now(), now());
  if exists (select 1 from public.user_profiles where id = v_admin_created) then
    raise exception 'A profile was provisioned before administrative metadata existed.';
  end if;

  update auth.users
  set raw_app_meta_data = raw_app_meta_data || '{"planner_role":"fiscalizacao","planner_name":"Guard test reader"}'::jsonb
  where id = v_admin_created;
  if not exists (
    select 1 from public.user_profiles where id = v_admin_created and role = 'fiscalizacao' and active
  ) then
    raise exception 'Administrative two-step creation did not provision a profile.';
  end if;

  -- Force the deferred guard now: ROLLBACK alone would never exercise it.
  set constraints auth.require_registered_planner_account immediate;
  set constraints auth.require_registered_planner_account deferred;

  -- Unrelated Auth metadata updates must preserve an existing inactive profile.
  update public.user_profiles set active = false where id = v_admin_created;
  update auth.users
  set raw_app_meta_data = raw_app_meta_data || '{"planner_role":"editor","provider":"email"}'::jsonb
  where id = v_admin_created;
  if not exists (
    select 1 from public.user_profiles where id = v_admin_created and role = 'fiscalizacao' and not active
  ) then
    raise exception 'An Auth metadata update changed an existing profile role/active state.';
  end if;

  -- A removed membership must not be resurrected by an Auth provider metadata refresh.
  delete from public.user_profiles where id = v_admin_created;
  update auth.users set raw_app_meta_data = raw_app_meta_data || '{"providers":["email"]}'::jsonb
  where id = v_admin_created;
  if exists (select 1 from public.user_profiles where id = v_admin_created) then
    raise exception 'An Auth metadata refresh restored a removed membership.';
  end if;

  -- Each failed constraint is caught in a subtransaction, which removes its fixture.
  for v_case in 1..3 loop
    v_id := case v_case when 1 then v_unregistered when 2 then v_spoofed else v_anonymous end;
    v_rejected := false;
    begin
      insert into auth.users (
        id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
        is_anonymous, created_at, updated_at
      ) values (
        v_id, 'authenticated', 'authenticated', 'rejected-' || v_case || '.guard-test@example.invalid',
        case when v_case = 3 then '{"planner_role":"editor","planner_name":"Anonymous spoof"}'::jsonb else '{"provider":"email"}'::jsonb end,
        case when v_case = 2 then '{"planner_role":"editor","role":"editor","planner_name":"User metadata spoof"}'::jsonb else '{}'::jsonb end,
        v_case = 3, now(), now()
      );
      set constraints auth.require_registered_planner_account immediate;
    exception when insufficient_privilege then
      v_rejected := true;
    end;
    if not v_rejected then raise exception 'Deferred registration guard accepted invalid case %.', v_case; end if;
    if exists (select 1 from auth.users where id = v_id) then raise exception 'Rejected fixture survived its subtransaction.'; end if;
    if exists (select 1 from public.user_profiles where id = v_id) then raise exception 'Rejected fixture retained a profile.'; end if;
    set constraints auth.require_registered_planner_account deferred;
  end loop;
end;
$$;

rollback;

select
  'PASS: administrative two-step provisioning, existing membership preservation, and deferred signup rejection' as deferred_guard_checks,
  not exists (
    select 1 from auth.users where id in (
      'e9200000-0000-4000-8000-000000000001', 'e9200000-0000-4000-8000-000000000002',
      'e9200000-0000-4000-8000-000000000003', 'e9200000-0000-4000-8000-000000000004'
    )
  ) as synthetic_users_rolled_back;
