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

export const isAdmin = (role) => role === "admin";
export const canSupervise = (role) => role === "admin" || role === "gerante" || role === "responsable_admin";
