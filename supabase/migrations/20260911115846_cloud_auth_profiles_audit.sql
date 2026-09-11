-- Draft for a generated Supabase migration. Contains no accounts or operational seed data.
-- The private schema must remain outside the Data API exposed schemas.
-- Disable public signup and anonymous sign-ins in Supabase Auth separately.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique check (char_length(email) between 3 and 320),
  full_name text not null check (char_length(full_name) between 1 and 160),
  role text not null check (role in ('editor', 'fiscalizacao', 'coordenacao')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table private.planner_state (
  id boolean primary key default true check (id = true),
  payload jsonb,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

-- Every superseded committed snapshot is retained. The latest revision is in planner_state.
create table private.planner_revisions (
  revision bigint primary key check (revision > 0),
  payload jsonb not null,
  saved_at timestamptz not null,
  saved_by uuid references auth.users (id) on delete set null,
  archived_at timestamptz not null default now()
);

-- Identity fields are copied at access time to preserve the historical attribution.
-- No cascading user FK: deleting an account must not delete its access history.
create table private.access_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  email text not null,
  full_name text not null,
  role text not null check (role in ('fiscalizacao', 'coordenacao')),
  page text not null check (page in (
    'dashboard', 'planejamento', 'demandas', 'escala', 'fiscais',
    'fornecedores', 'materiais', 'risco', 'cobertura', 'rnc', 'historico', 'perfil'
  )),
  accessed_at timestamptz not null default now()
);

create index access_events_recent_idx
  on private.access_events (accessed_at desc, id desc);
create index planner_state_updated_by_idx
  on private.planner_state (updated_by) where updated_by is not null;
create index planner_revisions_saved_by_idx
  on private.planner_revisions (saved_by) where saved_by is not null;

alter table public.user_profiles enable row level security;
alter table private.planner_state enable row level security;
alter table private.planner_revisions enable row level security;
alter table private.access_events enable row level security;

revoke all on table public.user_profiles from public, anon, authenticated, service_role;
revoke all on table private.planner_state from public, anon, authenticated, service_role;
revoke all on table private.planner_revisions from public, anon, authenticated, service_role;
revoke all on table private.access_events from public, anon, authenticated, service_role;
revoke all on sequence private.access_events_id_seq from public, anon, authenticated, service_role;

grant select on table public.user_profiles to authenticated;
grant select, insert, update, delete on table public.user_profiles to service_role;
grant select on table private.planner_state to service_role;
grant select on table private.planner_revisions to service_role;
grant select on table private.access_events to service_role;

-- Private definer helper prevents recursion in the user_profiles SELECT policy.
create function private.is_active_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.user_profiles as profile
    where profile.id = auth.uid() and profile.active and profile.role = 'editor'
  );
$$;

revoke all on function private.is_active_editor() from public, anon, authenticated, service_role;
grant execute on function private.is_active_editor() to authenticated, service_role;

create policy user_profiles_select
on public.user_profiles
for select
to authenticated
using (
  (active and id = (select auth.uid()))
  or (select private.is_active_editor())
);

-- An Auth user becomes a registered planner user only through server-owned app metadata.
-- Inserting Auth users without this metadata does not grant application access.
create function private.provision_planner_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := new.raw_app_meta_data ->> 'planner_role';
  v_name text;
begin
  if v_role in ('editor', 'fiscalizacao', 'coordenacao') then
    v_name := coalesce(
      nullif(btrim(new.raw_app_meta_data ->> 'planner_name'), ''),
      split_part(new.email, '@', 1)
    );
    insert into public.user_profiles (id, email, full_name, role)
    values (new.id, lower(new.email), v_name, v_role);
  end if;
  return new;
end;
$$;

revoke all on function private.provision_planner_profile() from public, anon, authenticated, service_role;

create trigger provision_planner_profile
after insert on auth.users
for each row execute function private.provision_planner_profile();

create function private.read_planner(p_page text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.user_profiles%rowtype;
  v_state private.planner_state%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Autenticacao obrigatoria.';
  end if;

  select profile.* into v_profile
  from public.user_profiles as profile
  where profile.id = auth.uid() and profile.active;
  if not found then
    raise exception using errcode = '42501', message = 'Conta sem cadastro ativo no planejador.';
  end if;

  if p_page is null or p_page not in (
    'dashboard', 'planejamento', 'demandas', 'escala', 'fiscais',
    'fornecedores', 'materiais', 'risco', 'cobertura', 'rnc', 'historico',
    'configuracoes', 'perfil', 'auditoria'
  ) then
    raise exception using errcode = '22023', message = 'Pagina invalida.';
  end if;

  if p_page in ('configuracoes', 'auditoria') and v_profile.role <> 'editor' then
    raise exception using errcode = '42501', message = 'Pagina exclusiva do editor.';
  end if;

  if v_profile.role <> 'editor' then
    insert into private.access_events (user_id, email, full_name, role, page, accessed_at)
    values (v_profile.id, v_profile.email, v_profile.full_name, v_profile.role, p_page, clock_timestamp());
  end if;

  select state.* into strict v_state from private.planner_state as state where state.id;
  return jsonb_build_object(
    'payload', v_state.payload,
    'revision', v_state.revision,
    'profile', to_jsonb(v_profile)
  );
end;
$$;

create function public.read_planner(p_page text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.read_planner(p_page); $$;

revoke all on function private.read_planner(text) from public, anon, authenticated, service_role;
revoke all on function public.read_planner(text) from public, anon, authenticated, service_role;
grant execute on function private.read_planner(text) to authenticated;
grant execute on function public.read_planner(text) to authenticated;

create function private.recent_accesses()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_events jsonb;
begin
  if auth.uid() is null or not private.is_active_editor() then
    raise exception using errcode = '42501', message = 'Auditoria exclusiva do editor.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(event) order by event.accessed_at desc, event.id desc), '[]'::jsonb)
  into v_events
  from (
    select access.id, access.user_id, access.email, access.full_name,
      access.role, access.page, access.accessed_at
    from private.access_events as access
    where access.role in ('fiscalizacao', 'coordenacao')
    order by access.accessed_at desc, access.id desc
    limit 100
  ) as event;
  return v_events;
end;
$$;

create function public.recent_accesses()
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.recent_accesses(); $$;

revoke all on function private.recent_accesses() from public, anon, authenticated, service_role;
revoke all on function public.recent_accesses() from public, anon, authenticated, service_role;
grant execute on function private.recent_accesses() to authenticated;
grant execute on function public.recent_accesses() to authenticated;

-- Only the Edge Function, after getUser() and complete domain validation, can call this RPC.
-- p_actor must be the verified calling user's ID, never an unchecked request field.
create function private.commit_planner(p_payload jsonb, p_expected_revision bigint, p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state private.planner_state%rowtype;
  v_collection text;
  v_updated_at timestamptz;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Gravacao permitida somente pelo servico autorizado.';
  end if;

  -- Hold the profile row until commit so a concurrent deactivation cannot race this write.
  perform 1 from public.user_profiles as profile
  where profile.id = p_actor and profile.active and profile.role = 'editor'
  for share;
  if not found then
    raise exception using errcode = '42501', message = 'Somente um editor ativo pode salvar.';
  end if;

  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception using errcode = '22023', message = 'Revisao invalida.';
  end if;

  if p_payload is null
    or jsonb_typeof(p_payload) is distinct from 'object'
    or p_payload -> 'schemaVersion' is distinct from '1'::jsonb
    or jsonb_typeof(p_payload -> 'settings') is distinct from 'object'
  then
    raise exception using errcode = '22023', message = 'Estrutura de dados invalida.';
  end if;

  foreach v_collection in array array[
    'inspectors', 'suppliers', 'materials', 'demands', 'allocations',
    'availability', 'rncs', 'occurrences', 'riskHistory', 'coverageHistory', 'auditLog'
  ] loop
    if jsonb_typeof(p_payload -> v_collection) is distinct from 'array' then
      raise exception using errcode = '22023', message = 'Colecao invalida: ' || v_collection;
    end if;
    if jsonb_array_length(p_payload -> v_collection) > 50000 then
      raise exception using errcode = '22023', message = 'Colecao acima do limite: ' || v_collection;
    end if;
  end loop;

  -- One row lock serializes CAS across every editor/session and revision archival.
  select state.* into strict v_state
  from private.planner_state as state
  where state.id
  for update;

  if v_state.revision <> p_expected_revision then
    raise exception using errcode = 'PT409',
      message = 'Os dados foram alterados em outra sessao. Recarregue antes de salvar.';
  end if;

  if v_state.payload is not null then
    insert into private.planner_revisions (revision, payload, saved_at, saved_by)
    values (v_state.revision, v_state.payload, v_state.updated_at, v_state.updated_by);
  end if;

  v_updated_at := clock_timestamp();
  update private.planner_state as state
  set payload = p_payload,
    revision = v_state.revision + 1,
    updated_at = v_updated_at,
    updated_by = p_actor
  where state.id;

  return jsonb_build_object('revision', v_state.revision + 1, 'payload', p_payload);
end;
$$;

create function public.commit_planner(p_payload jsonb, p_expected_revision bigint, p_actor uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.commit_planner(p_payload, p_expected_revision, p_actor); $$;

revoke all on function private.commit_planner(jsonb, bigint, uuid) from public, anon, authenticated, service_role;
revoke all on function public.commit_planner(jsonb, bigint, uuid) from public, anon, authenticated, service_role;
grant execute on function private.commit_planner(jsonb, bigint, uuid) to service_role;
grant execute on function public.commit_planner(jsonb, bigint, uuid) to service_role;

-- This is infrastructure state only. The first validated editor write initializes payload.
insert into private.planner_state (id) values (true);

comment on table public.user_profiles is 'Registered planner accounts; role and active state are server-managed.';
comment on table private.planner_state is 'Singleton shared planner snapshot; no direct browser access.';
comment on table private.planner_revisions is 'Superseded snapshots retained without client write/delete permissions.';
comment on table private.access_events is 'Server-attributed non-editor page accesses; readable only through the editor RPC.';
