-- ============================================================================
--  ENTREPRISE KIBEGNON · Suivi d'équipe — Schéma Supabase (PostgreSQL)
--  À exécuter dans : Supabase Dashboard > SQL Editor > New query
--  Idempotent autant que possible. Exécuter en une seule fois.
-- ============================================================================

-- Identifiant fixe du canal de discussion "Général" (connu côté front).
-- GENERAL_CHANNEL_ID = 00000000-0000-0000-0000-000000000001

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text not null default '#2E78A8',
  created_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  full_name   text not null default '',
  role        text not null default 'agent'
              check (role in ('admin','gerante','responsable_admin','comptable','juriste','agent')),
  dept_id     uuid references public.departments(id) on delete set null,
  color       text not null default '#2E78A8',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  dept_id     uuid references public.departments(id) on delete set null,
  assignee_id uuid references public.profiles(id) on delete set null,
  urgency     text not null default 'normale' check (urgency in ('basse','normale','haute','urgente')),
  status      text not null default 'a_faire' check (status in ('a_faire','en_cours','en_revue','termine')),
  est_min     integer not null default 60,
  week_start  date not null default (date_trunc('week', now())::date),
  day         smallint,                       -- 0=Lundi .. 5=Samedi, ou NULL
  due_date    date,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.time_entries (
  id               uuid primary key default gen_random_uuid(),
  task_id          uuid references public.tasks(id) on delete cascade,
  user_id          uuid references public.profiles(id) on delete cascade,
  start_at         timestamptz not null,
  end_at           timestamptz not null default now(),
  duration_seconds integer not null,
  note             text not null default '',
  created_at       timestamptz not null default now()
);

-- Un chrono actif par utilisateur (sert au "qui travaille en ce moment").
create table if not exists public.active_timers (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  task_id     uuid not null references public.tasks(id) on delete cascade,
  started_at  timestamptz not null default now()
);

create table if not exists public.channels (
  id          uuid primary key default gen_random_uuid(),
  type        text not null default 'dm' check (type in ('group','dm')),
  name        text,
  created_at  timestamptz not null default now()
);

create table if not exists public.channel_members (
  channel_id   uuid references public.channels(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references public.channels(id) on delete cascade,
  from_id     uuid references public.profiles(id) on delete set null,
  body        text not null default '',
  task_id     uuid references public.tasks(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_tasks_assignee   on public.tasks(assignee_id);
create index if not exists idx_tasks_week        on public.tasks(week_start);
create index if not exists idx_time_user         on public.time_entries(user_id);
create index if not exists idx_msg_channel       on public.messages(channel_id, created_at);

-- Canal Général (id fixe) ----------------------------------------------------
insert into public.channels (id, type, name)
values ('00000000-0000-0000-0000-000000000001', 'group', 'Général')
on conflict (id) do nothing;

-- Départements de départ (modifiables ensuite dans l'app) --------------------
insert into public.departments (name, color) values
  ('Direction & Gérance', '#D81F26'),
  ('Administratif & Juridique', '#2E78A8'),
  ('Gestion locative', '#4F9E2A'),
  ('Commercial (Location & Vente)', '#C58A1B'),
  ('Comptabilité & Recouvrement', '#7C3AED'),
  ('Syndic de copropriété', '#0D9488'),
  ('Technique & Travaux', '#EA580C')
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 2. FONCTIONS UTILITAIRES (SECURITY DEFINER)
-- ----------------------------------------------------------------------------

create or replace function public.my_role()
returns text language sql security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_supervisor()
returns boolean language sql security definer set search_path = public as $$
  select coalesce((select role in ('admin','gerante','responsable_admin')
                   from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_channel_member(cid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.channel_members
                 where channel_id = cid and user_id = auth.uid());
$$;

-- Création / récupération d'une conversation privée entre 2 personnes --------
create or replace function public.get_or_create_dm(other_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select c.id into cid
  from public.channels c
  join public.channel_members a on a.channel_id = c.id and a.user_id = auth.uid()
  join public.channel_members b on b.channel_id = c.id and b.user_id = other_user
  where c.type = 'dm'
  limit 1;

  if cid is null then
    insert into public.channels (type) values ('dm') returning id into cid;
    insert into public.channel_members (channel_id, user_id) values (cid, auth.uid()), (cid, other_user);
  end if;
  return cid;
end;
$$;

create or replace function public.mark_channel_read(cid uuid)
returns void language sql security definer set search_path = public as $$
  update public.channel_members set last_read_at = now()
  where channel_id = cid and user_id = auth.uid();
$$;

-- Création automatique du profil à l'inscription (alimenté par la fonction Edge)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, username, full_name, role, dept_id, color, active)
  values (
    new.id,
    coalesce(m->>'username', split_part(new.email,'@',1)),
    coalesce(m->>'full_name', split_part(new.email,'@',1)),
    coalesce(m->>'role', 'agent'),
    nullif(m->>'dept_id','')::uuid,
    coalesce(m->>'color', '#2E78A8'),
    coalesce((m->>'active')::boolean, true)
  )
  on conflict (id) do nothing;

  -- Ajout automatique au canal Général
  insert into public.channel_members (channel_id, user_id)
  values ('00000000-0000-0000-0000-000000000001', new.id)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. RLS (Row Level Security)
-- ----------------------------------------------------------------------------
alter table public.departments     enable row level security;
alter table public.profiles        enable row level security;
alter table public.tasks           enable row level security;
alter table public.time_entries    enable row level security;
alter table public.active_timers   enable row level security;
alter table public.channels        enable row level security;
alter table public.channel_members enable row level security;
alter table public.messages        enable row level security;

-- DEPARTMENTS : lecture pour tous les connectés, écriture admin
drop policy if exists dep_read on public.departments;
create policy dep_read   on public.departments for select to authenticated using (true);
drop policy if exists dep_write on public.departments;
create policy dep_write  on public.departments for all to authenticated using (is_admin()) with check (is_admin());

-- PROFILES : lecture par tous (annuaire), modification admin, ou soi-même (champs limités via app)
drop policy if exists prof_read on public.profiles;
create policy prof_read   on public.profiles for select to authenticated using (true);
drop policy if exists prof_update on public.profiles;
create policy prof_update on public.profiles for update to authenticated
  using (is_admin() or id = auth.uid()) with check (is_admin() or id = auth.uid());
drop policy if exists prof_admin_write on public.profiles;
create policy prof_admin_write on public.profiles for insert to authenticated with check (is_admin());
drop policy if exists prof_admin_delete on public.profiles;
create policy prof_admin_delete on public.profiles for delete to authenticated using (is_admin());

-- TASKS : tout le monde voit (transparence interne) ; création libre ;
--         édition par l'assigné, le créateur ou un superviseur ; suppression créateur/admin
drop policy if exists task_read on public.tasks;
create policy task_read   on public.tasks for select to authenticated using (true);
drop policy if exists task_insert on public.tasks;
create policy task_insert on public.tasks for insert to authenticated with check (created_by = auth.uid() or is_supervisor());
drop policy if exists task_update on public.tasks;
create policy task_update on public.tasks for update to authenticated
  using (assignee_id = auth.uid() or created_by = auth.uid() or is_supervisor());
drop policy if exists task_delete on public.tasks;
create policy task_delete on public.tasks for delete to authenticated
  using (created_by = auth.uid() or is_admin());

-- TIME ENTRIES : superviseurs voient tout, sinon les siennes ; écriture des siennes
drop policy if exists te_read on public.time_entries;
create policy te_read   on public.time_entries for select to authenticated using (user_id = auth.uid() or is_supervisor());
drop policy if exists te_write on public.time_entries;
create policy te_write  on public.time_entries for insert to authenticated with check (user_id = auth.uid());
drop policy if exists te_del on public.time_entries;
create policy te_del    on public.time_entries for delete to authenticated using (user_id = auth.uid() or is_supervisor());

-- ACTIVE TIMERS : lecture par tous les connectés (qui travaille), écriture des siens
drop policy if exists at_read on public.active_timers;
create policy at_read   on public.active_timers for select to authenticated using (true);
drop policy if exists at_write on public.active_timers;
create policy at_write  on public.active_timers for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- CHANNELS : visibles si membre ; création libre (DM via RPC)
drop policy if exists ch_read on public.channels;
create policy ch_read   on public.channels for select to authenticated using (is_channel_member(id));
drop policy if exists ch_insert on public.channels;
create policy ch_insert on public.channels for insert to authenticated with check (true);

-- CHANNEL MEMBERS : on voit/gère ses propres lignes ; superviseurs voient tout
drop policy if exists cm_read on public.channel_members;
create policy cm_read   on public.channel_members for select to authenticated using (user_id = auth.uid() or is_channel_member(channel_id));
drop policy if exists cm_write on public.channel_members;
create policy cm_write  on public.channel_members for all to authenticated using (user_id = auth.uid()) with check (true);

-- MESSAGES : lecture/écriture pour les membres du canal
drop policy if exists msg_read on public.messages;
create policy msg_read   on public.messages for select to authenticated using (is_channel_member(channel_id));
drop policy if exists msg_insert on public.messages;
create policy msg_insert on public.messages for insert to authenticated with check (from_id = auth.uid() and is_channel_member(channel_id));

-- ----------------------------------------------------------------------------
-- 4. REALTIME (synchronisation live)
-- ----------------------------------------------------------------------------
alter table public.active_timers   replica identity full;
alter table public.channel_members replica identity full;
alter table public.time_entries    replica identity full;
alter table public.tasks           replica identity full;
alter table public.messages        replica identity full;

do $$
begin
  begin alter publication supabase_realtime add table public.tasks;           exception when others then null; end;
  begin alter publication supabase_realtime add table public.time_entries;    exception when others then null; end;
  begin alter publication supabase_realtime add table public.active_timers;   exception when others then null; end;
  begin alter publication supabase_realtime add table public.messages;        exception when others then null; end;
  begin alter publication supabase_realtime add table public.channel_members; exception when others then null; end;
  begin alter publication supabase_realtime add table public.profiles;        exception when others then null; end;
  begin alter publication supabase_realtime add table public.departments;     exception when others then null; end;
end $$;

-- ============================================================================
--  FIN DU SCHÉMA. Voir README.md pour la création du premier administrateur.
-- ============================================================================
