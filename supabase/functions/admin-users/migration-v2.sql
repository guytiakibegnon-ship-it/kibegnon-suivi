-- ============================================================================
--  ENTREPRISE KIBEGNON · Suivi d'équipe — MIGRATION v2
--  Ajoute : Propriétaires, Biens, Produits d'entretien, Stock,
--           Fiches de sortie de matériel, Devis artisans, Modèles de tâches.
--
--  ⚠️  MIGRATION ADDITIVE : n'efface aucune donnée existante.
--  À exécuter dans : Supabase Dashboard > SQL Editor > New query > Run
--  (après schema.sql, qui doit déjà avoir été exécuté)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROPRIÉTAIRES & BIENS
-- ----------------------------------------------------------------------------

create table if not exists public.owners (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  kind        text not null default 'particulier' check (kind in ('particulier','societe','indivision','succession')),
  phone       text not null default '',
  email       text not null default '',
  address     text not null default '',
  id_number   text not null default '',          -- CNI / RCCM
  notes       text not null default '',
  active      boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.properties (
  id           uuid primary key default gen_random_uuid(),
  ref          text not null default '',          -- référence interne agence
  name         text not null,                     -- ex. "Immeuble Les Rosiers"
  kind         text not null default 'immeuble'
               check (kind in ('immeuble','villa','appartement','studio','local_commercial','bureau','terrain','magasin')),
  address      text not null default '',
  commune      text not null default '',          -- Cocody, Yopougon, Marcory…
  quartier     text not null default '',
  owner_id     uuid references public.owners(id) on delete set null,
  lots_count   integer not null default 1,
  surface_m2   numeric(10,2),
  rent_amount  numeric(12,2),                     -- loyer mensuel de référence (FCFA)
  mandate_type text not null default 'gestion'
               check (mandate_type in ('gestion','vente','location','syndic','aucun')),
  status       text not null default 'actif'
               check (status in ('actif','vacant','en_travaux','vendu','archive')),
  notes        text not null default '',
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_prop_owner on public.properties(owner_id);

-- ----------------------------------------------------------------------------
-- 2. PRODUITS D'ENTRETIEN & SANITAIRES
-- ----------------------------------------------------------------------------

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null default 'entretien'
              check (category in ('entretien','sanitaire','desinfection','consommable','outillage','securite')),
  unit        text not null default 'unité',      -- litre, bidon, carton, pièce…
  stock_qty   numeric(12,2) not null default 0,   -- maintenu automatiquement
  min_qty     numeric(12,2) not null default 0,   -- seuil d'alerte
  unit_price  numeric(12,2) not null default 0,   -- prix unitaire FCFA
  supplier    text not null default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Entrées de stock (approvisionnements)
create table if not exists public.stock_entries (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  qty         numeric(12,2) not null check (qty > 0),
  unit_price  numeric(12,2) not null default 0,
  supplier    text not null default '',
  entry_date  date not null default current_date,
  notes       text not null default '',
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. FICHES DE SORTIE DE MATÉRIEL
-- ----------------------------------------------------------------------------

create table if not exists public.material_releases (
  id            uuid primary key default gen_random_uuid(),
  ref           text not null default '',         -- ex. FS-2026-001
  property_id   uuid references public.properties(id) on delete set null,
  released_to   text not null default '',         -- nom de l'agent d'entretien
  released_by   uuid references public.profiles(id) on delete set null,
  purpose       text not null default 'nettoyage'
                check (purpose in ('nettoyage','desinfection','entretien_courant','remise_en_etat','urgence','autre')),
  release_date  date not null default current_date,
  zone          text not null default '',         -- parties communes, cage d'escalier…
  notes         text not null default '',
  created_at    timestamptz not null default now()
);

create table if not exists public.material_release_lines (
  id          uuid primary key default gen_random_uuid(),
  release_id  uuid not null references public.material_releases(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete restrict,
  qty         numeric(12,2) not null check (qty > 0),
  unit_price  numeric(12,2) not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_mrl_release on public.material_release_lines(release_id);
create index if not exists idx_mrl_product on public.material_release_lines(product_id);
create index if not exists idx_mr_property  on public.material_releases(property_id);

-- ----------------------------------------------------------------------------
-- 4. DEVIS ARTISANS
-- ----------------------------------------------------------------------------

create table if not exists public.quotes (
  id            uuid primary key default gen_random_uuid(),
  ref           text not null default '',         -- ex. DV-2026-014
  artisan_name  text not null,                    -- paternité du devis
  artisan_trade text not null default '',         -- plomberie, électricité, peinture…
  artisan_phone text not null default '',
  property_id   uuid references public.properties(id) on delete set null,
  owner_id      uuid references public.owners(id) on delete set null,
  quote_date    date not null default current_date,
  source        text not null default 'whatsapp'
                check (source in ('papier','whatsapp','verbal','email','sms')),
  object        text not null default '',         -- objet des travaux
  total_amount  numeric(14,2) not null default 0, -- recalculé automatiquement
  status        text not null default 'recu'
                check (status in ('recu','en_validation','valide','refuse','execute','paye')),
  notes         text not null default '',
  recorded_by   uuid references public.profiles(id) on delete set null, -- qui a saisi
  created_at    timestamptz not null default now()
);

create table if not exists public.quote_lines (
  id          uuid primary key default gen_random_uuid(),
  quote_id    uuid not null references public.quotes(id) on delete cascade,
  label       text not null,
  qty         numeric(12,2) not null default 1,
  unit        text not null default 'u',
  unit_price  numeric(14,2) not null default 0,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_ql_quote     on public.quote_lines(quote_id);
create index if not exists idx_quote_prop   on public.quotes(property_id);
create index if not exists idx_quote_owner  on public.quotes(owner_id);

-- ----------------------------------------------------------------------------
-- 5. MODÈLES DE TÂCHES (saisie rapide)
-- ----------------------------------------------------------------------------

create table if not exists public.task_templates (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  nature      text not null default 'autre',
  dept_id     uuid references public.departments(id) on delete set null,
  urgency     text not null default 'normale' check (urgency in ('basse','normale','haute','urgente')),
  est_min     integer not null default 60,
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 6. ENRICHISSEMENT DE LA TABLE TASKS
-- ----------------------------------------------------------------------------

alter table public.tasks add column if not exists property_id uuid references public.properties(id) on delete set null;
alter table public.tasks add column if not exists owner_id    uuid references public.owners(id) on delete set null;
alter table public.tasks add column if not exists nature      text not null default 'autre';

create index if not exists idx_task_prop on public.tasks(property_id);

-- ----------------------------------------------------------------------------
-- 7. TRIGGERS : stock automatique & total des devis
-- ----------------------------------------------------------------------------

-- Stock : entrées (+)
create or replace function public.apply_stock_entry()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.products set stock_qty = stock_qty + new.qty where id = new.product_id;
  elsif tg_op = 'DELETE' then
    update public.products set stock_qty = stock_qty - old.qty where id = old.product_id;
  elsif tg_op = 'UPDATE' then
    update public.products set stock_qty = stock_qty - old.qty where id = old.product_id;
    update public.products set stock_qty = stock_qty + new.qty where id = new.product_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_stock_entry on public.stock_entries;
create trigger trg_stock_entry
  after insert or update or delete on public.stock_entries
  for each row execute function public.apply_stock_entry();

-- Stock : sorties (−)
create or replace function public.apply_stock_release()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.products set stock_qty = stock_qty - new.qty where id = new.product_id;
  elsif tg_op = 'DELETE' then
    update public.products set stock_qty = stock_qty + old.qty where id = old.product_id;
  elsif tg_op = 'UPDATE' then
    update public.products set stock_qty = stock_qty + old.qty where id = old.product_id;
    update public.products set stock_qty = stock_qty - new.qty where id = new.product_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_stock_release on public.material_release_lines;
create trigger trg_stock_release
  after insert or update or delete on public.material_release_lines
  for each row execute function public.apply_stock_release();

-- Total des devis recalculé depuis les lignes
create or replace function public.recompute_quote_total()
returns trigger language plpgsql security definer set search_path = public as $$
declare qid uuid := coalesce(new.quote_id, old.quote_id);
begin
  update public.quotes q
  set total_amount = coalesce((select sum(l.qty * l.unit_price) from public.quote_lines l where l.quote_id = qid), 0)
  where q.id = qid;
  return null;
end;
$$;

drop trigger if exists trg_quote_total on public.quote_lines;
create trigger trg_quote_total
  after insert or update or delete on public.quote_lines
  for each row execute function public.recompute_quote_total();

-- ----------------------------------------------------------------------------
-- 8. RÉFÉRENCES AUTOMATIQUES (FS-2026-001 / DV-2026-001)
-- ----------------------------------------------------------------------------

create or replace function public.next_ref(prefix text, tbl text)
returns text language plpgsql security definer set search_path = public as $$
declare n integer; y text := to_char(now(), 'YYYY');
begin
  execute format('select count(*) + 1 from public.%I where ref like %L', tbl, prefix || '-' || y || '-%') into n;
  return prefix || '-' || y || '-' || lpad(n::text, 3, '0');
end;
$$;

create or replace function public.set_release_ref()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.ref is null or new.ref = '' then
    new.ref := public.next_ref('FS', 'material_releases');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_release_ref on public.material_releases;
create trigger trg_release_ref before insert on public.material_releases
  for each row execute function public.set_release_ref();

create or replace function public.set_quote_ref()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.ref is null or new.ref = '' then
    new.ref := public.next_ref('DV', 'quotes');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_quote_ref on public.quotes;
create trigger trg_quote_ref before insert on public.quotes
  for each row execute function public.set_quote_ref();

-- ----------------------------------------------------------------------------
-- 9. RLS
-- ----------------------------------------------------------------------------
alter table public.owners                 enable row level security;
alter table public.properties             enable row level security;
alter table public.products               enable row level security;
alter table public.stock_entries          enable row level security;
alter table public.material_releases      enable row level security;
alter table public.material_release_lines enable row level security;
alter table public.quotes                 enable row level security;
alter table public.quote_lines            enable row level security;
alter table public.task_templates         enable row level security;

do $$
declare t text;
begin
  foreach t in array array['owners','properties','products','stock_entries','material_releases',
                           'material_release_lines','quotes','quote_lines','task_templates']
  loop
    -- lecture : tous les membres connectés
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_read', t);
    -- création : tous les membres connectés
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (true)', t || '_insert', t);
    -- modification : tous les membres connectés (traçabilité par created_by / recorded_by)
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (true) with check (true)', t || '_update', t);
    -- suppression : superviseurs uniquement
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for delete to authenticated using (is_supervisor())', t || '_delete', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 10. REALTIME
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['owners','properties','products','stock_entries','material_releases',
                           'material_release_lines','quotes','quote_lines','task_templates']
  loop
    execute format('alter table public.%I replica identity full', t);
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when others then null;
    end;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 11. DONNÉES DE DÉPART
-- ----------------------------------------------------------------------------

insert into public.products (name, category, unit, min_qty, unit_price) values
  ('Eau de Javel 5L',            'desinfection', 'bidon',   4,  2500),
  ('Détergent multi-surfaces 5L','entretien',    'bidon',   3,  4000),
  ('Savon liquide mains 1L',     'sanitaire',    'flacon',  6,  1500),
  ('Papier hygiénique',          'sanitaire',    'paquet', 10,  3000),
  ('Désodorisant WC',            'sanitaire',    'unité',   6,  1200),
  ('Balai coco',                 'outillage',    'pièce',   2,  2000),
  ('Serpillière',                'outillage',    'pièce',   4,  1500),
  ('Raclette vitre',             'outillage',    'pièce',   2,  3500),
  ('Sacs poubelle 100L',         'consommable',  'rouleau', 5,  2500),
  ('Gants de ménage',            'securite',     'paire',   6,  1000),
  ('Insecticide 500ml',          'desinfection', 'flacon',  3,  3500),
  ('Détartrant sanitaire 1L',    'sanitaire',    'flacon',  3,  3000)
on conflict do nothing;

insert into public.task_templates (label, nature, urgency, est_min, sort_order) values
  ('Rédaction compromis de vente', 'contrat',     'haute',   120, 1),
  ('Rédaction bail d''habitation', 'contrat',     'normale',  90, 2),
  ('Rédaction mandat de gestion',  'contrat',     'normale',  60, 3),
  ('Visite d''un bien',            'visite',      'normale',  60, 4),
  ('État des lieux entrée',        'etat_lieux',  'haute',    90, 5),
  ('État des lieux sortie',        'etat_lieux',  'haute',    90, 6),
  ('Relance loyer impayé',         'recouvrement','urgente',  30, 7),
  ('Encaissement loyer',           'recouvrement','normale',  20, 8),
  ('Rendez-vous notaire',          'notaire',     'haute',   120, 9),
  ('Analyse de solvabilité',       'client',      'normale',  45, 10),
  ('Nettoyage parties communes',   'entretien',   'normale',  120,11),
  ('Suivi de travaux',             'travaux',     'normale',  60, 12),
  ('Devis artisan à collecter',    'travaux',     'haute',    30, 13),
  ('Assemblée de copropriété',     'syndic',      'haute',   180, 14),
  ('Gestion de litige',            'litige',      'urgente',  90, 15),
  ('Publication annonce',          'marketing',   'normale',  45, 16)
on conflict do nothing;

-- ============================================================================
--  FIN DE LA MIGRATION v2
-- ============================================================================
