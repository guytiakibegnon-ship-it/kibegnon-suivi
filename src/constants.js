export const LOGO = "/logo.png";
export const GENERAL_CHANNEL_ID = "00000000-0000-0000-0000-000000000001";

export const URGENCY = {
  basse:   { label: "Basse",   color: "#64748B", bg: "#F1F5F9" },
  normale: { label: "Normale", color: "#2E78A8", bg: "#E8F2F8" },
  haute:   { label: "Haute",   color: "#EA580C", bg: "#FFF0E6" },
  urgente: { label: "Urgente", color: "#D81F26", bg: "#FDEAEA" },
};
export const URGENCY_ORDER = ["urgente", "haute", "normale", "basse"];

export const STATUS = {
  a_faire:  { label: "À faire",  color: "#64748B" },
  en_cours: { label: "En cours", color: "#2E78A8" },
  en_revue: { label: "En revue", color: "#C58A1B" },
  termine:  { label: "Terminé",  color: "#4F9E2A" },
};
export const STATUS_ORDER = ["a_faire", "en_cours", "en_revue", "termine"];

export const ROLES = {
  admin: "Administrateur",
  gerante: "Gérante",
  responsable_admin: "Responsable administratif",
  comptable: "Comptable",
  juriste: "Juriste",
  agent: "Agent",
};
export const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
export const DEPT_PALETTE = ["#D81F26", "#2E78A8", "#4F9E2A", "#C58A1B", "#7C3AED", "#0D9488", "#EA580C", "#DB2777"];

/* ---- Métier immobilier ---- */
export const NATURE = {
  contrat:      { label: "Contrat",        color: "#2E78A8" },
  visite:       { label: "Visite",         color: "#0D9488" },
  etat_lieux:   { label: "État des lieux", color: "#7C3AED" },
  recouvrement: { label: "Recouvrement",   color: "#D81F26" },
  notaire:      { label: "Notaire",        color: "#C58A1B" },
  client:       { label: "Client",         color: "#DB2777" },
  entretien:    { label: "Entretien",      color: "#4F9E2A" },
  travaux:      { label: "Travaux",        color: "#EA580C" },
  syndic:       { label: "Syndic",         color: "#6366F1" },
  litige:       { label: "Litige",         color: "#B91C1C" },
  marketing:    { label: "Marketing",      color: "#0891B2" },
  autre:        { label: "Autre",          color: "#64748B" },
};
export const NATURE_ORDER = Object.keys(NATURE);

export const PROPERTY_KIND = {
  immeuble:         "Immeuble",
  villa:            "Villa",
  appartement:      "Appartement",
  studio:           "Studio",
  local_commercial: "Local commercial",
  bureau:           "Bureau",
  terrain:          "Terrain",
  magasin:          "Magasin",
};
export const PROPERTY_STATUS = {
  actif:      { label: "Actif",      color: "#4F9E2A" },
  vacant:     { label: "Vacant",     color: "#C58A1B" },
  en_travaux: { label: "En travaux", color: "#EA580C" },
  vendu:      { label: "Vendu",      color: "#2E78A8" },
  archive:    { label: "Archivé",    color: "#94A3B8" },
};
export const MANDATE = {
  gestion:  "Mandat de gestion",
  vente:    "Mandat de vente",
  location: "Mandat de location",
  syndic:   "Syndic de copropriété",
  aucun:    "Aucun mandat",
};
export const OWNER_KIND = {
  particulier: "Particulier",
  societe:     "Société",
  indivision:  "Indivision",
  succession:  "Succession",
};

export const PRODUCT_CATEGORY = {
  entretien:    { label: "Entretien",    color: "#4F9E2A" },
  sanitaire:    { label: "Sanitaire",    color: "#2E78A8" },
  desinfection: { label: "Désinfection", color: "#7C3AED" },
  consommable:  { label: "Consommable",  color: "#C58A1B" },
  outillage:    { label: "Outillage",    color: "#EA580C" },
  securite:     { label: "Sécurité",     color: "#D81F26" },
};

export const RELEASE_PURPOSE = {
  nettoyage:         "Nettoyage",
  desinfection:      "Désinfection",
  entretien_courant: "Entretien courant",
  remise_en_etat:    "Remise en état",
  urgence:           "Intervention urgente",
  autre:             "Autre",
};

export const QUOTE_SOURCE = {
  papier:   "Papier",
  whatsapp: "WhatsApp",
  verbal:   "Verbal",
  email:    "E-mail",
  sms:      "SMS",
};
export const QUOTE_STATUS = {
  recu:          { label: "Reçu",          color: "#64748B" },
  en_validation: { label: "En validation", color: "#C58A1B" },
  valide:        { label: "Validé",        color: "#2E78A8" },
  refuse:        { label: "Refusé",        color: "#D81F26" },
  execute:       { label: "Exécuté",       color: "#7C3AED" },
  paye:          { label: "Payé",          color: "#4F9E2A" },
};
export const QUOTE_STATUS_ORDER = ["recu", "en_validation", "valide", "refuse", "execute", "paye"];

export const TRADES = ["Plomberie", "Électricité", "Peinture", "Maçonnerie", "Menuiserie", "Carrelage",
  "Climatisation", "Étanchéité", "Serrurerie", "Jardinage", "Nettoyage", "Vitrerie", "Autre"];

export const COMMUNES = ["Cocody", "Plateau", "Yopougon", "Marcory", "Treichville", "Adjamé", "Abobo",
  "Koumassi", "Port-Bouët", "Attécoubé", "Bingerville", "Songon", "Anyama", "Autre"];

export const isAdmin = (role) => role === "admin";
export const canSupervise = (role) => role === "admin" || role === "gerante" || role === "responsable_admin";

/* ---- Documents par département ---- */
export const DOC_TYPES = {
  decompte_entree: {
    label: "Décompte d'entrée",
    short: "Décompte",
    prefix: "DE",
    dept: "Gestion locative",
    layout: "facture",
    title: "DÉCOMPTE D'ENTRÉE",
    color: "#2E78A8",
    desc: "Somme à régler par le locataire à l'entrée dans les lieux (avance, caution, agence, frais).",
    clientLabel: "Locataire entrant",
    preset: [
      { label: "2 MOIS D'AVANCE", qty: 1, unit: "u", price: 0 },
      { label: "CAUTION : 2 MOIS", qty: 1, unit: "u", price: 0 },
      { label: "AGENCE : 1 MOIS", qty: 1, unit: "u", price: 0 },
      { label: "ACHAT ET ENREGISTREMENT DE CONTRATS", qty: 1, unit: "u", price: 50000 },
      { label: "FRAIS DE DOSSIER", qty: 1, unit: "u", price: 0 },
    ],
  },
  prestation: {
    label: "Fiche de prestation de services",
    short: "Prestation",
    prefix: "PS",
    dept: "Direction & Gérance",
    layout: "facture",
    title: "FICHE DE PRESTATION DE SERVICES",
    color: "#4F9E2A",
    desc: "Détail des prestations réalisées par l'agence pour un client ou un propriétaire.",
    clientLabel: "Client",
    preset: [{ label: "", qty: 1, unit: "u", price: 0 }],
  },
  facture_impayes: {
    label: "Facture d'impayés",
    short: "Impayés",
    prefix: "FI",
    dept: "Comptabilité & Recouvrement",
    layout: "facture",
    title: "FACTURE D'IMPAYÉS",
    color: "#D81F26",
    desc: "Récapitulatif des loyers et charges impayés à recouvrer auprès d'un locataire.",
    clientLabel: "Locataire débiteur",
    preset: [{ label: "Loyer impayé", qty: 1, unit: "mois", price: 0 }],
  },
  quittance: {
    label: "Quittance de loyer",
    short: "Quittance",
    prefix: "QL",
    dept: "Gestion locative",
    layout: "facture",
    title: "QUITTANCE DE LOYER",
    color: "#7C3AED",
    desc: "Reçu attestant du paiement intégral du loyer et des charges pour une période donnée.",
    clientLabel: "Locataire",
    preset: [
      { label: "Loyer", qty: 1, unit: "mois", price: 0 },
      { label: "Charges", qty: 1, unit: "mois", price: 0 },
    ],
  },
  relance: {
    label: "Relance locataire",
    short: "Relance",
    prefix: "RL",
    dept: "Comptabilité & Recouvrement",
    layout: "lettre",
    title: "LETTRE DE RELANCE",
    color: "#EA580C",
    desc: "Courrier de rappel amiable ou de mise en demeure adressé à un locataire en retard.",
    clientLabel: "Locataire",
    preset: [{ label: "Loyer impayé", qty: 1, unit: "mois", price: 0 }],
  },
};
export const DOC_TYPE_ORDER = ["decompte_entree", "prestation", "facture_impayes", "quittance", "relance"];

export const DOC_STATUS = {
  brouillon: { label: "Brouillon", color: "#94A3B8" },
  emis:      { label: "Émis",      color: "#2E78A8" },
  envoye:    { label: "Envoyé",    color: "#C58A1B" },
  regle:     { label: "Réglé",     color: "#4F9E2A" },
  annule:    { label: "Annulé",    color: "#D81F26" },
};
export const DOC_STATUS_ORDER = ["brouillon", "emis", "envoye", "regle", "annule"];

export const RELANCE_TONE = {
  rappel:  "Rappel amiable",
  relance: "Relance ferme",
  mise_en_demeure: "Mise en demeure",
};
