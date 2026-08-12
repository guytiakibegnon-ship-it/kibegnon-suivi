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
