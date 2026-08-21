-- ============================================================================
--  ENTREPRISE KIBEGNON · Suivi d'équipe — MIGRATION v3
--  Ajoute : module DOCUMENTS (décomptes d'entrée, prestations de services,
--           factures d'impayés, relances locataires, quittances de loyer).
--
--  ⚠️  MIGRATION ADDITIVE : n'efface aucune donnée existante.
--  À exécuter dans : Supabase Dashboard > SQL Editor > New query > Run
--  (après schema.sql puis migration-v2.sql)
-- ============================================================================

create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  ref          text not null default '',
  doc_type     text not null default 'decompte_entree'
               check (doc_type in ('decompte_entree','prestation','facture_impayes','relance','quittance')),
  doc_date     date not null default current_date,

  -- Rattachement au dossier
  property_id  uuid references public.properties(id) on delete set null,
  owner_id     uuid references public.owners(id) on delete set null,

  -- Destinataire (locataire, client, prestataire…)
  client_name  text not null default '',
  client_phone text not null default '',
  client_email text not null default '',
  client_addr  text not null default '',

  object       text not null default '',      -- objet du document
  body         text not null default '',      -- corps de lettre (relances)
  lines        jsonb not null default '[]'::jsonb,  -- [{label, qty, unit, price}]
  fields       jsonb not null default '{}'::jsonb,  -- champs spécifiques au type
  total_amount numeric(14,2) not null default 0,

  status       text not null default 'brouillon'
               check (status in ('brouillon','emis','envoye','regle','annule')),
  notes        text not null default '',
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_doc_property on public.documents(property_id);
create index if not exists idx_doc_owner    on public.documents(owner_id);
create index if not exists idx_doc_type     on public.documents(doc_type);

-- ----------------------------------------------------------------------------
-- Référence automatique par type : DE-2026-001, PS-…, FI-…, RL-…, QL-…
-- ----------------------------------------------------------------------------
create or replace function public.set_document_ref()
returns trigger language plpgsql security definer set search_path = public as $$
declare p text; n integer; y text := to_char(now(), 'YYYY');
begin
  if new.ref is null or new.ref = '' then
    p := case new.doc_type
           when 'decompte_entree' then 'DE'
           when 'prestation'      then 'PS'
           when 'facture_impayes' then 'FI'
           when 'relance'         then 'RL'
           when 'quittance'       then 'QL'
           else 'DOC' end;
    select count(*) + 1 into n from public.documents
      where ref like p || '-' || y || '-%';
    new.ref := p || '-' || y || '-' || lpad(n::text, 3, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_document_ref on public.documents;
create trigger trg_document_ref before insert on public.documents
  for each row execute function public.set_document_ref();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.documents enable row level security;

drop policy if exists documents_read on public.documents;
create policy documents_read   on public.documents for select to authenticated using (true);
drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents for insert to authenticated with check (true);
drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents for update to authenticated using (true) with check (true);
drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents for delete to authenticated using (is_supervisor());

-- ----------------------------------------------------------------------------
-- Realtime
-- ----------------------------------------------------------------------------
alter table public.documents replica identity full;
do $$ begin
  begin alter publication supabase_realtime add table public.documents; exception when others then null; end;
end $$;

-- ============================================================================
--  FIN DE LA MIGRATION v3
-- ============================================================================
