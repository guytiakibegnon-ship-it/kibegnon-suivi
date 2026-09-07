-- ============================================================================
--  ENTREPRISE KIBEGNON · Suivi d'équipe — MIGRATION v19
--  Traite la pratique de l'agence à l'entrée d'un locataire :
--
--    • MOIS D'ENTRÉE  : les 2 mois d'avance sont encaissés et reversés au
--      propriétaire dès ce mois-là. La ligne porte alors 2 mois de loyer,
--      et la prestation de l'agence se prélève sur l'ensemble.
--      → colonne "months"
--
--    • MOIS SUIVANT   : le locataire est à jour, mais l'argent a déjà été
--      reversé le mois précédent. La ligne est marquée « réglé d'avance » :
--      elle ne compte ni comme impayé, ni comme somme à reverser.
--      → colonne "prepaid"
--
--  ⚠️  MIGRATION ADDITIVE : n'efface aucune donnée existante.
--  À exécuter dans : SQL Editor (après la migration de vérification v18)
-- ============================================================================

alter table public.rent_lines add column if not exists months  integer not null default 1;
alter table public.rent_lines add column if not exists prepaid boolean not null default false;

comment on column public.rent_lines.months is
  'Nombre de mois de loyer portés par la ligne (2 au mois d''entrée avec avance)';
comment on column public.rent_lines.prepaid is
  'Mois couvert par une avance déjà reversée au propriétaire : ni impayé, ni nouveau versement';

-- ============================================================================
--  FIN DE LA MIGRATION v19
-- ============================================================================
