-- Multas: drop every app object and recreate an empty schema.
-- Paste this whole file into the Supabase SQL Editor (SQL → New query → Run).
-- This DESTROYS all teams, members, fines, sessions and PIN attempts.
-- Tables are left empty: no seed, demo, or real player/team rows.

-- ---------------------------------------------------------------------------
-- 1. Drop every object the app created
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.create_team(jsonb);
DROP FUNCTION IF EXISTS public.get_public_team(text);
DROP FUNCTION IF EXISTS public.open_session(text, text);
DROP FUNCTION IF EXISTS public.close_session(text);
DROP FUNCTION IF EXISTS public.get_private_team(text);
DROP FUNCTION IF EXISTS public.impose_fine(text, uuid, uuid, numeric);
DROP FUNCTION IF EXISTS public.mark_fine_paid(text, uuid);
DROP FUNCTION IF EXISTS public.void_fine(text, uuid);
DROP FUNCTION IF EXISTS public.update_team_settings(text, jsonb);
DROP FUNCTION IF EXISTS public.save_member(text, uuid, text, boolean);
DROP FUNCTION IF EXISTS public.save_catalog_item(text, uuid, text, numeric, boolean);
DROP FUNCTION IF EXISTS public.save_role(text, uuid, jsonb, text);
DROP FUNCTION IF EXISTS public.delete_role(text, uuid);
DROP FUNCTION IF EXISTS public._hash_pin(text);
DROP FUNCTION IF EXISTS public._assert_pin_unique(uuid, text, uuid);
DROP FUNCTION IF EXISTS public._slugify(text);
DROP FUNCTION IF EXISTS public._session_role(text);
DROP FUNCTION IF EXISTS public._require(boolean, text);
DROP FUNCTION IF EXISTS public._role_json(public.roles);
DROP FUNCTION IF EXISTS public._team_public_json(uuid);

DROP TABLE IF EXISTS fines CASCADE;
DROP TABLE IF EXISTS pin_attempts CASCADE;
DROP TABLE IF EXISTS role_sessions CASCADE;
DROP TABLE IF EXISTS fine_catalog CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS team_private CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- ---------------------------------------------------------------------------
-- 2. Recreate full structure (tables, FKs, indexes, RPCs, RLS, grants)
-- ---------------------------------------------------------------------------

-- Multas: multi-tenant sports team fines.
-- Empty schema only: no seed rows, COPY, or demo/player/team names.
--
-- Security model
--   * Every table has RLS enabled with NO policies and all privileges revoked
--     from anon/authenticated, so nothing is readable or writable directly with
--     the anon key.
--   * Clients only talk to SECURITY DEFINER RPCs:
--       - public:  create_team, get_public_team, open_session
--       - private: every other RPC requires a session token obtained by
--                  open_session(slug, pin); the role's permissions are re-read
--                  from the roles table on each call.
--   * PINs are stored as bcrypt hashes (pgcrypto) and never returned.
--   * Session tokens are stored as sha256 hashes and expire after 12h.
--   * Team rules (private notes) live in team_private and are only returned
--     to sessions whose role has can_manage_settings.
--   * Failed PIN attempts are throttled per team.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,46}[a-z0-9])$'),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  logo_url text check (logo_url is null or char_length(logo_url) <= 300000),
  primary_color text not null default '#2563eb' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  secondary_color text not null default '#f59e0b' check (secondary_color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now()
);

create table public.team_private (
  team_id uuid primary key references public.teams (id) on delete cascade,
  rules text not null default '' check (char_length(rules) <= 10000),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  pin_hash text not null,
  can_impose boolean not null default false,
  can_mark_paid boolean not null default false,
  can_delete_history boolean not null default false,
  can_manage_settings boolean not null default false,
  is_creator boolean not null default false,
  created_at timestamptz not null default now()
);
create index roles_team_id_idx on public.roles (team_id);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index members_team_id_idx on public.members (team_id);

create table public.fine_catalog (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 1 and 80),
  base_amount numeric(10, 2) not null check (base_amount >= 0 and base_amount <= 100000),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index fine_catalog_team_id_idx on public.fine_catalog (team_id);

create table public.fines (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  member_id uuid not null references public.members (id),
  catalog_id uuid references public.fine_catalog (id),
  reason text not null check (char_length(btrim(reason)) between 1 and 80),
  amount numeric(10, 2) not null check (amount > 0 and amount <= 100000),
  status text not null default 'pending' check (status in ('pending', 'paid', 'void')),
  created_at timestamptz not null default now(),
  imposed_by_role_id uuid references public.roles (id) on delete set null,
  paid_at timestamptz,
  paid_by_role_id uuid references public.roles (id) on delete set null,
  voided_at timestamptz,
  voided_by_role_id uuid references public.roles (id) on delete set null,
  check ((status = 'paid') = (paid_at is not null) or status = 'void')
);
create index fines_team_status_idx on public.fines (team_id, status);
create index fines_member_id_idx on public.fines (member_id);

create table public.role_sessions (
  token_hash text primary key,
  role_id uuid not null references public.roles (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  expires_at timestamptz not null
);
create index role_sessions_role_id_idx on public.role_sessions (role_id);

create table public.pin_attempts (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.teams (id) on delete cascade,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index pin_attempts_team_created_idx on public.pin_attempts (team_id, created_at);

-- Lock everything down: no direct table access for API roles.
do $$
declare t text;
begin
  foreach t in array array['teams', 'team_private', 'roles', 'members', 'fine_catalog', 'fines', 'role_sessions', 'pin_attempts']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated, public', t);
  end loop;
end $$;
revoke all on sequence public.pin_attempts_id_seq from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- Internal helpers (not callable by API roles)
-- ---------------------------------------------------------------------------

create function public._hash_pin(p_pin text) returns text
language plpgsql
set search_path = public, extensions
as $$
begin
  if p_pin is null or p_pin !~ '^[0-9]{4,8}$' then
    raise exception 'El PIN debe tener entre 4 y 8 dígitos' using errcode = '22023';
  end if;
  return crypt(p_pin, gen_salt('bf', 8));
end $$;

-- Raises if another role of the team already uses this PIN (PIN identifies the role).
create function public._assert_pin_unique(p_team_id uuid, p_pin text, p_except_role uuid default null) returns void
language plpgsql
set search_path = public, extensions
as $$
begin
  if exists (
    select 1 from roles r
    where r.team_id = p_team_id
      and (p_except_role is null or r.id <> p_except_role)
      and r.pin_hash = crypt(p_pin, r.pin_hash)
  ) then
    raise exception 'Ese PIN ya lo usa otro rol del equipo' using errcode = '23505';
  end if;
end $$;

create function public._slugify(p_text text) returns text
language sql immutable
set search_path = public, extensions
as $$
  select left(
    btrim(regexp_replace(
      lower(translate(coalesce(p_text, ''),
        'ÁÀÄÂÃáàäâãÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔÕóòöôõÚÙÜÛúùüûÑñÇç',
        'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNnCc')),
      '[^a-z0-9]+', '-', 'g'), '-'),
    40)
$$;

-- Resolves a session token to its (current) role. Raises if invalid/expired.
create function public._session_role(p_token text) returns public.roles
language plpgsql
stable
set search_path = public, extensions
as $$
declare
  v_role roles;
begin
  select r.* into v_role
  from role_sessions s
  join roles r on r.id = s.role_id
  where s.token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and s.expires_at > now();
  if not found then
    raise exception 'Sesión no válida o caducada' using errcode = '28000';
  end if;
  return v_role;
end $$;

create function public._require(p_ok boolean, p_what text) returns void
language plpgsql
as $$
begin
  if not coalesce(p_ok, false) then
    raise exception 'Tu rol no tiene permiso para %', p_what using errcode = '42501';
  end if;
end $$;

create function public._role_json(r public.roles) returns jsonb
language sql stable
as $$
  select jsonb_build_object(
    'id', r.id,
    'name', r.name,
    'is_creator', r.is_creator,
    'can_impose', r.can_impose,
    'can_mark_paid', r.can_mark_paid,
    'can_delete_history', r.can_delete_history,
    'can_manage_settings', r.can_manage_settings
  )
$$;

create function public._team_public_json(p_team_id uuid) returns jsonb
language sql stable
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'id', t.id,
    'slug', t.slug,
    'name', t.name,
    'logo_url', t.logo_url,
    'primary_color', t.primary_color,
    'secondary_color', t.secondary_color,
    'total_collected', coalesce((select sum(f.amount) from fines f where f.team_id = t.id and f.status = 'paid'), 0),
    'total_pending', coalesce((select sum(f.amount) from fines f where f.team_id = t.id and f.status = 'pending'), 0),
    'debtors', coalesce((
      select jsonb_agg(d order by (d->>'pending_total')::numeric desc, d->>'name')
      from (
        select jsonb_build_object(
          'member_id', m.id,
          'name', m.name,
          'pending_total', sum(f.amount),
          'fines', jsonb_agg(jsonb_build_object(
            'id', f.id, 'reason', f.reason, 'amount', f.amount, 'created_at', f.created_at
          ) order by f.created_at desc)
        ) as d
        from members m
        join fines f on f.member_id = m.id and f.status = 'pending'
        where m.team_id = t.id
        group by m.id, m.name
        having sum(f.amount) > 0
      ) x
    ), '[]'::jsonb)
  )
  from teams t
  where t.id = p_team_id
$$;

-- ---------------------------------------------------------------------------
-- Public RPCs
-- ---------------------------------------------------------------------------

-- Creates a whole club from the setup wizard in one transaction.
-- p_payload: {
--   name, logo_url?, primary_color, secondary_color, rules?,
--   creator_role: { name, pin },
--   roles?: [{ name, pin, can_impose, can_mark_paid, can_delete_history, can_manage_settings }],
--   members?: [text], catalog?: [{ reason, base_amount }]
-- }
-- Returns { slug, token, role } so the creator is signed in right away.
create function public.create_team(p_payload jsonb) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_team teams;
  v_base text;
  v_slug text;
  v_creator roles;
  v_item jsonb;
  v_member text;
  v_token text;
begin
  v_base := _slugify(p_payload->>'name');
  if char_length(v_base) < 3 then
    v_base := 'equipo';
  end if;
  v_slug := v_base;
  while exists (select 1 from teams where slug = v_slug) loop
    v_slug := left(v_base, 35) || '-' || substr(md5(gen_random_uuid()::text), 1, 4);
  end loop;

  insert into teams (slug, name, logo_url, primary_color, secondary_color)
  values (
    v_slug,
    btrim(p_payload->>'name'),
    nullif(btrim(p_payload->>'logo_url'), ''),
    coalesce(p_payload->>'primary_color', '#2563eb'),
    coalesce(p_payload->>'secondary_color', '#f59e0b')
  )
  returning * into v_team;

  insert into team_private (team_id, rules)
  values (v_team.id, coalesce(p_payload->>'rules', ''));

  insert into roles (team_id, name, pin_hash, can_impose, can_mark_paid, can_delete_history, can_manage_settings, is_creator)
  values (
    v_team.id,
    btrim(p_payload->'creator_role'->>'name'),
    _hash_pin(p_payload->'creator_role'->>'pin'),
    true, true, true, true, true
  )
  returning * into v_creator;

  for v_item in select * from jsonb_array_elements(coalesce(p_payload->'roles', '[]'::jsonb)) loop
    perform _hash_pin(v_item->>'pin');
    perform _assert_pin_unique(v_team.id, v_item->>'pin');
    insert into roles (team_id, name, pin_hash, can_impose, can_mark_paid, can_delete_history, can_manage_settings)
    values (
      v_team.id,
      btrim(v_item->>'name'),
      _hash_pin(v_item->>'pin'),
      coalesce((v_item->>'can_impose')::boolean, false),
      coalesce((v_item->>'can_mark_paid')::boolean, false),
      coalesce((v_item->>'can_delete_history')::boolean, false),
      coalesce((v_item->>'can_manage_settings')::boolean, false)
    );
  end loop;

  for v_member in select jsonb_array_elements_text(coalesce(p_payload->'members', '[]'::jsonb)) loop
    if btrim(v_member) <> '' then
      insert into members (team_id, name) values (v_team.id, btrim(v_member));
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_payload->'catalog', '[]'::jsonb)) loop
    insert into fine_catalog (team_id, reason, base_amount)
    values (v_team.id, btrim(v_item->>'reason'), (v_item->>'base_amount')::numeric);
  end loop;

  v_token := encode(gen_random_bytes(32), 'hex');
  insert into role_sessions (token_hash, role_id, team_id, expires_at)
  values (encode(digest(v_token, 'sha256'), 'hex'), v_creator.id, v_team.id, now() + interval '12 hours');

  return jsonb_build_object('slug', v_team.slug, 'token', v_token, 'role', _role_json(v_creator));
end $$;

create function public.get_public_team(p_slug text) returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select _team_public_json(t.id) from teams t where t.slug = lower(p_slug)
$$;

-- Exchanges a team PIN for a session token. The PIN alone identifies the role.
create function public.open_session(p_slug text, p_pin text) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_team_id uuid;
  v_role roles;
  v_token text;
begin
  select id into v_team_id from teams where slug = lower(p_slug);
  if v_team_id is null then
    raise exception 'Equipo no encontrado' using errcode = 'P0002';
  end if;

  if (select count(*) from pin_attempts
      where team_id = v_team_id and not success and created_at > now() - interval '15 minutes') >= 10 then
    raise exception 'Demasiados intentos fallidos. Espera unos minutos.' using errcode = '54000';
  end if;

  select r.* into v_role
  from roles r
  where r.team_id = v_team_id
    and p_pin ~ '^[0-9]{4,8}$'
    and r.pin_hash = crypt(p_pin, r.pin_hash)
  limit 1;

  insert into pin_attempts (team_id, success) values (v_team_id, v_role.id is not null);
  delete from pin_attempts where created_at < now() - interval '1 day';

  if v_role.id is null then
    return jsonb_build_object('ok', false);
  end if;

  delete from role_sessions where expires_at < now();
  v_token := encode(gen_random_bytes(32), 'hex');
  insert into role_sessions (token_hash, role_id, team_id, expires_at)
  values (encode(digest(v_token, 'sha256'), 'hex'), v_role.id, v_team_id, now() + interval '12 hours');

  return jsonb_build_object('ok', true, 'token', v_token, 'role', _role_json(v_role));
end $$;

-- ---------------------------------------------------------------------------
-- Private RPCs (session token required)
-- ---------------------------------------------------------------------------

create function public.close_session(p_token text) returns void
language sql
security definer
set search_path = public, extensions
as $$
  delete from role_sessions where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
$$;

-- Everything the private dashboard needs. Rules and role list are only
-- included for roles that can manage settings.
create function public.get_private_team(p_token text) returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_role roles := _session_role(p_token);
  v_settings boolean := v_role.can_manage_settings;
begin
  return jsonb_build_object(
    'role', _role_json(v_role),
    'team', _team_public_json(v_role.team_id),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'active', m.active) order by m.name)
      from members m where m.team_id = v_role.team_id and (m.active or v_settings)
    ), '[]'::jsonb),
    'catalog', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'reason', c.reason, 'base_amount', c.base_amount, 'active', c.active) order by c.reason)
      from fine_catalog c where c.team_id = v_role.team_id and (c.active or v_settings)
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'member_id', f.member_id, 'member_name', m.name, 'reason', f.reason,
        'amount', f.amount, 'status', f.status, 'created_at', f.created_at,
        'paid_at', f.paid_at, 'voided_at', f.voided_at
      ) order by f.created_at desc)
      from (select * from fines where team_id = v_role.team_id order by created_at desc limit 300) f
      join members m on m.id = f.member_id
    ), '[]'::jsonb),
    'rules', case when v_settings then (select rules from team_private where team_id = v_role.team_id) end,
    'roles', case when v_settings then (
      select jsonb_agg(_role_json(r) order by r.is_creator desc, r.created_at)
      from roles r where r.team_id = v_role.team_id
    ) end
  );
end $$;

create function public.impose_fine(p_token text, p_member_id uuid, p_catalog_id uuid, p_amount numeric) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role roles := _session_role(p_token);
  v_reason text;
  v_id uuid;
begin
  perform _require(v_role.can_impose, 'imponer multas');
  if not exists (select 1 from members where id = p_member_id and team_id = v_role.team_id and active) then
    raise exception 'Jugador no válido' using errcode = '22023';
  end if;
  select reason into v_reason from fine_catalog
  where id = p_catalog_id and team_id = v_role.team_id and active;
  if v_reason is null then
    raise exception 'Motivo no válido' using errcode = '22023';
  end if;
  insert into fines (team_id, member_id, catalog_id, reason, amount, imposed_by_role_id)
  values (v_role.team_id, p_member_id, p_catalog_id, v_reason, round(p_amount, 2), v_role.id)
  returning id into v_id;
  return v_id;
end $$;

create function public.mark_fine_paid(p_token text, p_fine_id uuid) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role roles := _session_role(p_token);
begin
  perform _require(v_role.can_mark_paid, 'marcar multas como pagadas');
  update fines set status = 'paid', paid_at = now(), paid_by_role_id = v_role.id
  where id = p_fine_id and team_id = v_role.team_id and status = 'pending';
  if not found then
    raise exception 'La multa no existe o ya no está pendiente' using errcode = 'P0002';
  end if;
end $$;

-- "Borrar historial": soft-voids a fine (pending or paid). The row is kept for
-- auditing; voided fines no longer count as pending nor as collected.
create function public.void_fine(p_token text, p_fine_id uuid) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role roles := _session_role(p_token);
begin
  perform _require(v_role.can_delete_history, 'borrar historial');
  update fines set status = 'void', voided_at = now(), voided_by_role_id = v_role.id
  where id = p_fine_id and team_id = v_role.team_id and status <> 'void';
  if not found then
    raise exception 'La multa no existe o ya está anulada' using errcode = 'P0002';
  end if;
end $$;

-- p_patch: any of { name, logo_url, primary_color, secondary_color, rules }
create function public.update_team_settings(p_token text, p_patch jsonb) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role roles := _session_role(p_token);
begin
  perform _require(v_role.can_manage_settings, 'modificar los ajustes del equipo');
  update teams set
    name = case when p_patch ? 'name' then btrim(p_patch->>'name') else name end,
    logo_url = case when p_patch ? 'logo_url' then nullif(btrim(p_patch->>'logo_url'), '') else logo_url end,
    primary_color = case when p_patch ? 'primary_color' then p_patch->>'primary_color' else primary_color end,
    secondary_color = case when p_patch ? 'secondary_color' then p_patch->>'secondary_color' else secondary_color end
  where id = v_role.team_id;
  if p_patch ? 'rules' then
    update team_private set rules = coalesce(p_patch->>'rules', ''), updated_at = now()
    where team_id = v_role.team_id;
  end if;
end $$;

-- Create (p_id null) or rename a member; p_active=false hides it (history kept).
create function public.save_member(p_token text, p_id uuid, p_name text, p_active boolean default true) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role roles := _session_role(p_token);
  v_id uuid;
begin
  perform _require(v_role.can_manage_settings, 'modificar la plantilla');
  if p_id is null then
    insert into members (team_id, name, active) values (v_role.team_id, btrim(p_name), coalesce(p_active, true))
    returning id into v_id;
  else
    update members set name = btrim(p_name), active = coalesce(p_active, true)
    where id = p_id and team_id = v_role.team_id
    returning id into v_id;
    if v_id is null then raise exception 'Jugador no encontrado' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end $$;

create function public.save_catalog_item(p_token text, p_id uuid, p_reason text, p_base_amount numeric, p_active boolean default true) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role roles := _session_role(p_token);
  v_id uuid;
begin
  perform _require(v_role.can_manage_settings, 'modificar el catálogo');
  if p_id is null then
    insert into fine_catalog (team_id, reason, base_amount, active)
    values (v_role.team_id, btrim(p_reason), round(p_base_amount, 2), coalesce(p_active, true))
    returning id into v_id;
  else
    update fine_catalog set reason = btrim(p_reason), base_amount = round(p_base_amount, 2), active = coalesce(p_active, true)
    where id = p_id and team_id = v_role.team_id
    returning id into v_id;
    if v_id is null then raise exception 'Motivo no encontrado' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end $$;

-- Create (p_id null) or update a role. p_pin may be null on update to keep the current PIN.
-- p_role: { name, can_impose, can_mark_paid, can_delete_history, can_manage_settings }
create function public.save_role(p_token text, p_id uuid, p_role jsonb, p_pin text default null) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role roles := _session_role(p_token);
  v_target roles;
  v_id uuid;
begin
  perform _require(v_role.can_manage_settings, 'gestionar roles');
  if p_id is null then
    perform _hash_pin(p_pin);
    perform _assert_pin_unique(v_role.team_id, p_pin);
    insert into roles (team_id, name, pin_hash, can_impose, can_mark_paid, can_delete_history, can_manage_settings)
    values (
      v_role.team_id, btrim(p_role->>'name'), _hash_pin(p_pin),
      coalesce((p_role->>'can_impose')::boolean, false),
      coalesce((p_role->>'can_mark_paid')::boolean, false),
      coalesce((p_role->>'can_delete_history')::boolean, false),
      coalesce((p_role->>'can_manage_settings')::boolean, false)
    )
    returning id into v_id;
    return v_id;
  end if;

  select * into v_target from roles where id = p_id and team_id = v_role.team_id;
  if v_target.id is null then raise exception 'Rol no encontrado' using errcode = 'P0002'; end if;

  if nullif(p_pin, '') is not null then
    perform _hash_pin(p_pin);
    perform _assert_pin_unique(v_role.team_id, p_pin, p_id);
  end if;

  update roles set
    name = btrim(p_role->>'name'),
    pin_hash = case when nullif(p_pin, '') is not null then _hash_pin(p_pin) else pin_hash end,
    -- the creator role always keeps full permissions so the club can't lock itself out
    can_impose = is_creator or coalesce((p_role->>'can_impose')::boolean, false),
    can_mark_paid = is_creator or coalesce((p_role->>'can_mark_paid')::boolean, false),
    can_delete_history = is_creator or coalesce((p_role->>'can_delete_history')::boolean, false),
    can_manage_settings = is_creator or coalesce((p_role->>'can_manage_settings')::boolean, false)
  where id = p_id;

  if nullif(p_pin, '') is not null then
    delete from role_sessions where role_id = p_id and p_id <> v_role.id;
  end if;
  return p_id;
end $$;

create function public.delete_role(p_token text, p_id uuid) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role roles := _session_role(p_token);
begin
  perform _require(v_role.can_manage_settings, 'gestionar roles');
  if exists (select 1 from roles where id = p_id and team_id = v_role.team_id and is_creator) then
    raise exception 'El rol creador no se puede eliminar' using errcode = '42501';
  end if;
  delete from roles where id = p_id and team_id = v_role.team_id;
  if not found then raise exception 'Rol no encontrado' using errcode = 'P0002'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke all on function
  public._hash_pin(text),
  public._assert_pin_unique(uuid, text, uuid),
  public._slugify(text),
  public._session_role(text),
  public._require(boolean, text),
  public._role_json(public.roles),
  public._team_public_json(uuid),
  public.create_team(jsonb),
  public.get_public_team(text),
  public.open_session(text, text),
  public.close_session(text),
  public.get_private_team(text),
  public.impose_fine(text, uuid, uuid, numeric),
  public.mark_fine_paid(text, uuid),
  public.void_fine(text, uuid),
  public.update_team_settings(text, jsonb),
  public.save_member(text, uuid, text, boolean),
  public.save_catalog_item(text, uuid, text, numeric, boolean),
  public.save_role(text, uuid, jsonb, text),
  public.delete_role(text, uuid)
from public, anon, authenticated;

grant execute on function
  public.create_team(jsonb),
  public.get_public_team(text),
  public.open_session(text, text),
  public.close_session(text),
  public.get_private_team(text),
  public.impose_fine(text, uuid, uuid, numeric),
  public.mark_fine_paid(text, uuid),
  public.void_fine(text, uuid),
  public.update_team_settings(text, jsonb),
  public.save_member(text, uuid, text, boolean),
  public.save_catalog_item(text, uuid, text, numeric, boolean),
  public.save_role(text, uuid, jsonb, text),
  public.delete_role(text, uuid)
to anon, authenticated;
