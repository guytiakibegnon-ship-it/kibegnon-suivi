/* ============================================================================
 *  ENTREPRISE KIBEGNON · SUIVI D'ÉQUIPE — application complète (fichier unique)
 *  Modules : Tableau de bord · Tâches · Planning · Patrimoine · Devis artisans
 *            Documents · Recouvrement · Transport · Produits · Messages · Temps
 *  Dépendances externes uniquement : react, lucide-react, recharts, ./supabaseClient
 * ==========================================================================*/
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  AlertTriangle, ArrowDownToLine, ArrowLeft, ArrowUpFromLine, AtSign, BadgeCheck, Banknote, BarChart3, Bell, BellOff, BellRing, Briefcase, Building2, CalendarClock, CalendarDays, CalendarOff, Car, Check, CheckCheck, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Clock, DoorClosed, DoorOpen, Download, Eye, EyeOff, FileSignature, FileSpreadsheet, FileText, FileUp, Filter, FolderOpen, Hammer, Home, Image, Inbox, KeyRound, Landmark, Layers, LayoutDashboard, ListChecks, Lock, LogOut, Mail, MapPin, MessageCircle, MessageCircleWarning, MessageSquare, Package, Paperclip, Pause, Pencil, Phone, Play, Plus, Printer, Receipt, RotateCcw, Search, Send, Settings, ShieldAlert, ShieldCheck, SprayCan, Square, Stamp, Store, ThumbsDown, ThumbsUp, Timer, Trash2, TrendingDown, TrendingUp, UserPlus, UserRound, Users, Wallet, X, Zap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, CartesianGrid,
} from "recharts";
import { supabase, AUTH_DOMAIN } from "./supabaseClient";


/* ══════════════════════════════════════════════════════════════════════
   CONSTANTES
   ══════════════════════════════════════════════════════════════════════ */
const LOGO = "/logo.png";
const GENERAL_CHANNEL_ID = "00000000-0000-0000-0000-000000000001";

const URGENCY = {
  basse:   { label: "Basse",   color: "#64748B", bg: "#F1F5F9" },
  normale: { label: "Normale", color: "#2E78A8", bg: "#E8F2F8" },
  haute:   { label: "Haute",   color: "#EA580C", bg: "#FFF0E6" },
  urgente: { label: "Urgente", color: "#D81F26", bg: "#FDEAEA" },
};
const URGENCY_ORDER = ["urgente", "haute", "normale", "basse"];

const STATUS = {
  a_faire:  { label: "À faire",  color: "#64748B" },
  en_cours: { label: "En cours", color: "#2E78A8" },
  en_revue: { label: "En revue", color: "#C58A1B" },
  termine:  { label: "Terminé",  color: "#4F9E2A" },
};
const STATUS_ORDER = ["a_faire", "en_cours", "en_revue", "termine"];

const ROLES = {
  admin: "Administrateur",
  gerante: "Gérante",
  responsable_admin: "Responsable administratif",
  comptable: "Comptable",
  juriste: "Juriste",
  agent: "Agent",
};
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const DEPT_PALETTE = ["#D81F26", "#2E78A8", "#4F9E2A", "#C58A1B", "#7C3AED", "#0D9488", "#EA580C", "#DB2777"];

/* ---- Métier immobilier ---- */
const NATURE = {
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
const NATURE_ORDER = Object.keys(NATURE);

const PROPERTY_KIND = {
  immeuble:         "Immeuble",
  villa:            "Villa",
  appartement:      "Appartement",
  studio:           "Studio",
  local_commercial: "Local commercial",
  bureau:           "Bureau",
  terrain:          "Terrain",
  magasin:          "Magasin",
};
const PROPERTY_STATUS = {
  actif:      { label: "Actif",      color: "#4F9E2A" },
  vacant:     { label: "Vacant",     color: "#C58A1B" },
  en_travaux: { label: "En travaux", color: "#EA580C" },
  vendu:      { label: "Vendu",      color: "#2E78A8" },
  archive:    { label: "Archivé",    color: "#94A3B8" },
};
const MANDATE = {
  gestion:  "Mandat de gestion",
  vente:    "Mandat de vente",
  location: "Mandat de location",
  syndic:   "Syndic de copropriété",
  aucun:    "Aucun mandat",
};
const OWNER_KIND = {
  particulier: "Particulier",
  societe:     "Société",
  indivision:  "Indivision",
  succession:  "Succession",
};

const PRODUCT_CATEGORY = {
  entretien:    { label: "Entretien",    color: "#4F9E2A" },
  sanitaire:    { label: "Sanitaire",    color: "#2E78A8" },
  desinfection: { label: "Désinfection", color: "#7C3AED" },
  consommable:  { label: "Consommable",  color: "#C58A1B" },
  outillage:    { label: "Outillage",    color: "#EA580C" },
  securite:     { label: "Sécurité",     color: "#D81F26" },
};

const RELEASE_PURPOSE = {
  nettoyage:         "Nettoyage",
  desinfection:      "Désinfection",
  entretien_courant: "Entretien courant",
  remise_en_etat:    "Remise en état",
  urgence:           "Intervention urgente",
  autre:             "Autre",
};

const QUOTE_SOURCE = {
  papier:   "Papier",
  whatsapp: "WhatsApp",
  verbal:   "Verbal",
  email:    "E-mail",
  sms:      "SMS",
};
const QUOTE_STATUS = {
  recu:          { label: "Reçu",          color: "#64748B" },
  en_validation: { label: "En validation", color: "#C58A1B" },
  valide:        { label: "Validé",        color: "#2E78A8" },
  refuse:        { label: "Refusé",        color: "#D81F26" },
  execute:       { label: "Exécuté",       color: "#7C3AED" },
  paye:          { label: "Payé",          color: "#4F9E2A" },
};
const QUOTE_STATUS_ORDER = ["recu", "en_validation", "valide", "refuse", "execute", "paye"];

const TRADES = ["Plomberie", "Électricité", "Peinture", "Maçonnerie", "Menuiserie", "Carrelage",
  "Climatisation", "Étanchéité", "Serrurerie", "Jardinage", "Nettoyage", "Vitrerie", "Autre"];

const COMMUNES = ["Cocody", "Plateau", "Yopougon", "Marcory", "Treichville", "Adjamé", "Abobo",
  "Koumassi", "Port-Bouët", "Attécoubé", "Bingerville", "Songon", "Anyama", "Autre"];

const isAdmin = (role) => role === "admin";
const canSupervise = (role) => role === "admin" || role === "gerante" || role === "responsable_admin";

/* ---- Documents par département ---- */
const DOC_TYPES = {
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
  recu_charge: {
    label: "Reçu de paiement de charges",
    short: "Reçu charges",
    prefix: "RC",
    dept: "Comptabilité & Recouvrement",
    layout: "facture",
    title: "REÇU DE PAIEMENT DE CHARGES",
    color: "#0891B2",
    desc: "Facture réglée par l'agence pour un bien : CIE, SODECI, parties communes, entretien pendant une vacance. Sert de preuve au propriétaire.",
    clientLabel: "Payé à (fournisseur)",
    preset: [{ label: "Facture CIE", qty: 1, unit: "u", price: 0 }],
  },
  decharge: {
    label: "Décharge de fonds",
    short: "Décharge",
    prefix: "DC",
    dept: "Comptabilité & Recouvrement",
    layout: "decharge",
    title: "DÉCHARGE",
    color: "#B91C1C",
    desc: "Remise ou versement de fonds : atteste qu'une personne a reçu ou versé une somme entre les mains de l'agence.",
    clientLabel: "Déclarant(e)",
    preset: [],
  },
  courrier: {
    label: "Courrier libre",
    short: "Courrier",
    prefix: "CR",
    dept: "Direction & Gérance",
    layout: "lettre",
    title: "",
    color: "#0D9488",
    desc: "Tout courrier de l'agence : convocation, mise au point, information, attestation, réponse à un client…",
    clientLabel: "Destinataire",
    preset: [],
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
const DOC_TYPE_ORDER = ["decompte_entree", "prestation", "facture_impayes", "quittance", "recu_charge", "decharge", "relance", "courrier"];

const DOC_STATUS = {
  brouillon: { label: "Brouillon", color: "#94A3B8" },
  emis:      { label: "Émis",      color: "#2E78A8" },
  envoye:    { label: "Envoyé",    color: "#C58A1B" },
  regle:     { label: "Réglé",     color: "#4F9E2A" },
  annule:    { label: "Annulé",    color: "#D81F26" },
};
const DOC_APPROVAL = {
  non_requise: { label: "—",                  color: "#94A3B8" },
  en_attente:  { label: "En attente de validation", color: "#C58A1B" },
  approuve:    { label: "Validée",            color: "#4F9E2A" },
  refuse:      { label: "Refusée",            color: "#D81F26" },
};
const DOC_STATUS_ORDER = ["brouillon", "emis", "envoye", "regle", "annule"];

const COURRIER_MODELS = {
  vide:         { label: "Page blanche", object: "", body: "" },
  convocation:  { label: "Convocation", object: "Convocation",
    body: "Madame, Monsieur,\n\nNous vous prions de bien vouloir vous présenter à nos bureaux, sis à Cocody Rue du Lycée Technique, le [date] à [heure], afin d'échanger sur [objet de la rencontre].\n\nVotre présence est vivement souhaitée.\n\nVeuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées." },
  information:  { label: "Note d'information", object: "Information aux occupants",
    body: "Madame, Monsieur,\n\nNous vous informons que [objet de l'information].\n\nNous vous remercions par avance de votre compréhension et restons à votre disposition pour tout complément.\n\nVeuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées." },
  attestation:  { label: "Attestation", object: "Attestation",
    body: "Je soussigné, représentant de l'Entreprise Kibegnon SARL, atteste par la présente que [contenu de l'attestation].\n\nLa présente attestation est délivrée pour servir et valoir ce que de droit." },
  reponse:      { label: "Réponse à une réclamation", object: "Réponse à votre réclamation",
    body: "Madame, Monsieur,\n\nNous accusons réception de votre réclamation relative à [objet] et vous remercions de nous en avoir informés.\n\nAprès examen, [suite donnée].\n\nNous restons à votre disposition et vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées." },
  preavis:      { label: "Accusé de préavis", object: "Accusé de réception de préavis",
    body: "Madame, Monsieur,\n\nNous accusons réception de votre préavis de départ concernant le logement que vous occupez, avec effet au [date].\n\nUn état des lieux de sortie sera organisé le [date]. Le solde de tout compte sera établi après cet état des lieux, déduction faite des éventuelles réparations locatives.\n\nVeuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées." },
  travaux:      { label: "Annonce de travaux", object: "Annonce de travaux",
    body: "Madame, Monsieur,\n\nNous vous informons que des travaux de [nature des travaux] seront réalisés dans l'immeuble du [date de début] au [date de fin].\n\nNous mettons tout en œuvre pour limiter la gêne occasionnée et vous remercions de votre compréhension.\n\nVeuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées." },
};

const RELANCE_TONE = {
  rappel:  "Rappel amiable",
  relance: "Relance ferme",
  mise_en_demeure: "Mise en demeure",
};

/* ---- Lots (appartements, magasins d'un immeuble) ---- */
const UNIT_KIND = {
  appartement: "Appartement",
  studio:      "Studio",
  magasin:     "Magasin",
  bureau:      "Bureau",
  villa:       "Villa",
  entrepot:    "Entrepôt",
  parking:     "Parking",
};
const UNIT_STATUS = {
  occupe:  { label: "Occupé",     color: "#4F9E2A" },
  vacant:  { label: "Vacant",     color: "#EA580C" },
  travaux: { label: "En travaux", color: "#C58A1B" },
  reserve: { label: "Réservé",    color: "#2E78A8" },
};
const AVAILABLE_FOR = {
  aucun:          "Non disponible",
  location:       "À louer",
  vente:          "À vendre",
  location_vente: "À louer ou à vendre",
};

/* ---- Recouvrement ---- */
const RENT_SCOPE = {
  commercial: { label: "Suivi commercial", color: "#2E78A8", desc: "Saisie des commerciaux sur le terrain" },
  comptable:  { label: "État comptable",   color: "#4F9E2A", desc: "Version définitive établie par la comptabilité" },
};
const RENT_STATUS = {
  brouillon: { label: "Brouillon", color: "#94A3B8" },
  soumis:    { label: "Soumis",    color: "#C58A1B" },
  valide:    { label: "Validé",    color: "#4F9E2A" },
};
const PAY_STATUS = {
  paye:    { label: "PAYÉ",    color: "#4F9E2A", bg: "#EAF6E3" },
  partiel: { label: "PARTIEL", color: "#EA580C", bg: "#FFF0E6" },
  impaye:  { label: "IMPAYÉ",  color: "#D81F26", bg: "#FDEAEA" },
  vacant:  { label: "VACANT",  color: "#64748B", bg: "#F1F5F9" },
};
/* Un lot vacant n'est pas un impayé : il n'a ni locataire ni loyer attendu.
   Il est donc écarté des compteurs, des arriérés et du taux de recouvrement. */
const isVacantLine = (line) => {
  if (line?.vacant) return true;                       // marqué à la main
  return !((line?.tenantName || "").trim());           // aucun locataire = lot vacant
};
const payStatusOf = (expected, collected, vacant = false) => {
  if (vacant) return "vacant";
  const e = Number(expected) || 0, c = Number(collected) || 0;
  if (e === 0 && c === 0) return "vacant";
  if (c <= 0) return "impaye";
  if (c >= e) return "paye";
  return "partiel";
};
const DEFAULT_CHARGES = ["Électricité", "Eau", "Réparation", "Entretien", "Autres charges"];
/* Sommes qui s'AJOUTENT au versement dû au propriétaire */
/* ---- Impôt foncier ---- */
const TAX_MODE = { "": "—", "Chèque": "Chèque", "Espèces": "Espèces", "Virement": "Virement" };
const RECEIPTS = {
  oui:        { label: "Oui",        color: "#4F9E2A" },
  non:        { label: "Non",        color: "#D81F26" },
  en_attente: { label: "En attente", color: "#C58A1B" },
};
const TRANCHE_LABELS = ["1re tranche", "2e tranche", "3e tranche", "4e tranche"];
const TRANCHE_MONTHS = [2, 5, 8, 11]; // 15 mars, 15 juin, 15 septembre, 15 décembre
/* Quatre fractions égales aux échéances légales de l'année d'imposition */
const buildInstallments = (year, taxed, existing = []) => {
  const part = Math.round((Number(taxed) || 0) / 4);
  return TRANCHE_MONTHS.map((m, i) => {
    const prev = existing[i] || {};
    const d = new Date(year, m, 15);
    return {
      dueDate: `${d.getFullYear()}-${String(m + 1).padStart(2, "0")}-15`,
      amountDue: part,
      mode: prev.mode || "",
      chequeNo: prev.chequeNo || "",
      amountPaid: prev.amountPaid ?? "",
      paidAt: prev.paidAt || "",
    };
  });
};
const taxTotals = (rec) => {
  const paid = (rec.installments || []).reduce((a, t) => a + (Number(t.amountPaid) || 0), 0);
  const taxed = Number(rec.taxedAmount) || 0;
  return { paid, taxed, remaining: Math.max(0, taxed - paid), settled: paid >= taxed && taxed > 0 };
};
const isLate = (t) => {
  if (!t?.dueDate) return false;
  return !Number(t.amountPaid) && new Date(t.dueDate + "T23:59:59") < new Date();
};

const SUPPLEMENT_PRESETS = [
  "Caution encaissée à reverser",
  "Avance sur loyer encaissée",
  "Reliquat du mois précédent",
  "Remboursement de trop-perçu",
  "Régularisation de charges",
  "Arriéré recouvré d'un mois antérieur",
  "Indemnité d'occupation",
  "Autre versement",
];
const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

/* ---- Transport & permissions ---- */
const REQ_TYPE = {
  transport: { label: "Frais de transport", color: "#2E78A8" },
  absence:   { label: "Permission d'absence", color: "#7C3AED" },
};
const TRANSPORT_MODE = {
  taxi:           "Taxi",
  woro_woro:      "Woro-woro",
  gbaka:          "Gbaka",
  bus:            "Bus (SOTRA)",
  vehicule_perso: "Véhicule personnel",
  moto:           "Moto",
  autre:          "Autre",
};
const ABSENCE_TYPE = {
  personnelle:    "Personnelle",
  maladie:        "Maladie",
  familiale:      "Familiale",
  administrative: "Démarche administrative",
  autre:          "Autre",
};
const REQ_STATUS = {
  en_attente: { label: "En attente", color: "#C58A1B" },
  approuve:   { label: "Approuvé",   color: "#4F9E2A" },
  refuse:     { label: "Refusé",     color: "#D81F26" },
};
const canValidate = (role) => role === "admin" || role === "gerante" || role === "responsable_admin";
const isAccountant = (role) => role === "comptable" || role === "admin";

/* ══════════════════════════════════════════════════════════════════════
   HELPERS (dates, montants, durées, nombres en lettres)
   ══════════════════════════════════════════════════════════════════════ */
const getMonday = (d) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
};
const isoDate = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mondayIso = (d) => isoDate(getMonday(d));
const fr = (d, opt) => new Date(d).toLocaleDateString("fr-FR", opt);
const weekLabel = (iso) => {
  const m = new Date(iso + "T00:00:00");
  return `${fr(m, { day: "numeric", month: "short" })} – ${fr(addDays(m, 5), { day: "numeric", month: "short", year: "numeric" })}`;
};
/* Durées exprimées en heures et minutes (jamais en secondes) */
const fmtDur = (sec) => {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
};
/* Chronomètre en cours : hh:mm:ss */
const fmtClock = (sec) => {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const two = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
};
/* Heures décimales pour les graphiques et exports */
const hoursOf = (sec) => +(Math.max(0, sec) / 3600).toFixed(2);
const fmtEst = (min) => {
  if (!min) return "—";
  if (min >= 60) { const h = Math.floor(min / 60), m = min % 60; return m ? `${h}h${m}` : `${h}h`; }
  return `${min}min`;
};
const fmtTime = (ts) => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/* ---- Formatage monétaire FCFA ---- */
const fcfa = (n) => {
  const v = Number(n || 0);
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " F";
};
const fcfaLong = (n) => {
  const v = Number(n || 0);
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " FCFA";
};
const qty = (n) => {
  const v = Number(n || 0);
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
};
const monthIso = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (iso) =>
  new Date(iso + "-01T00:00:00").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });

/* ---- Montant en toutes lettres (français) ---- */
const UNITS = ["zéro","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix",
  "onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"];
const TENS = ["","","vingt","trente","quarante","cinquante","soixante","soixante","quatre-vingt","quatre-vingt"];

function below100(n) {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10), u = n % 10;
  if (t === 7 || t === 9) {
    if (t === 7 && u === 1) return "soixante-et-onze";
    return TENS[t] + "-" + UNITS[10 + u];
  }
  if (u === 0) return TENS[t] + (t === 8 ? "s" : "");
  if (u === 1 && t !== 8) return TENS[t] + "-et-un";
  return TENS[t] + "-" + UNITS[u];
}

/* followed = true si un mot d'échelle (mille/million) suit : "cent" reste invariable */
function below1000(n, followed) {
  if (n < 100) return below100(n);
  const c = Math.floor(n / 100), r = n % 100;
  const head = c === 1 ? "cent" : UNITS[c] + " cent";
  if (r === 0) return head + (c > 1 && !followed ? "s" : "");
  return head + " " + below100(r);
}

function amountInWords(amount) {
  let n = Math.floor(Math.abs(Number(amount) || 0));
  if (n === 0) return "zéro franc CFA";
  const parts = [];
  const scales = [{ v: 1e9, s: "milliard" }, { v: 1e6, s: "million" }, { v: 1e3, s: "mille" }];
  for (const { v, s } of scales) {
    const q = Math.floor(n / v);
    if (q > 0) {
      if (s === "mille") parts.push(q === 1 ? "mille" : below1000(q, true) + " mille");
      else parts.push(below1000(q, true) + " " + s + (q > 1 ? "s" : ""));
      n -= q * v;
    }
  }
  if (n > 0) parts.push(below1000(n, false));
  const w = parts.join(" ");
  return w + (w.endsWith("franc") ? "" : "") + " francs CFA";
}



/* Hauteur du vide à insérer avant le pied de page pour qu'il termine
   exactement au bas de la dernière page. On complète la dernière page
   entamée ; epsilon évite qu'un arrondi du navigateur ne renvoie le pied
   sur une page supplémentaire. */
function printSpacerHeight(contentH, usableH, footH = 0, epsilon = 8) {
  if (!(contentH > 0) || !(usableH > 0)) return 0;
  const reste = contentH % usableH;
  if (reste === 0) return 0;                     // finit déjà en bas de page
  const gap = usableH - reste - epsilon;         // vide pour finir la page pile
  if (gap <= 12) return 0;                       // trop peu : on ne touche à rien
  /* Sécurité : le pied doit rester sur la page qui porte déjà du texte.
     Si le contenu hors pied ne tient pas sur cette page, on n'ajoute rien —
     mieux vaut un pied un peu haut qu'un pied seul sur une page blanche. */
  const texteAvantPied = reste - footH;
  if (texteAvantPied <= 0) return 0;
  return gap;
}

/* Dimensions utiles d'une page A4, en pixels CSS (96 dpi) */
function pageBox(orientation) {
  const MM = 96 / 25.4;
  const marge = orientation === "landscape" ? 8 : 12;      // identique au @page
  const largeurMm = orientation === "landscape" ? 297 : 210;
  const hauteurMm = orientation === "landscape" ? 210 : 297;
  return { w: (largeurMm - 2 * marge) * MM, h: (hauteurMm - 2 * marge) * MM };
}

/* Impression : force l'orientation de la page (portrait ou paysage).
   @page ne pouvant pas être ciblé par une classe, on injecte la règle juste avant d'imprimer. */
function printSheet(orientation = "portrait") {
  const id = "kb-page-orientation";
  document.getElementById(id)?.remove();
  const el = document.createElement("style");
  el.id = id;
  el.media = "print";
  el.textContent = `@page { size: A4 ${orientation}; margin: ${orientation === "landscape" ? "8mm" : "12mm"}; }`;
  document.head.appendChild(el);

  /* On mesure le document à la largeur réelle d'impression, puis on insère
     un vide juste avant le pied de page pour qu'il tombe au bas de la
     dernière page — et non au milieu. */
  const area = document.getElementById("print-area");
  const box = pageBox(orientation);
  let spacer = null;
  if (area) {
    document.getElementById("kb-spacer")?.remove();
    const clone = area.cloneNode(true);
    clone.style.cssText = `position:absolute;left:-10000px;top:0;width:${box.w}px;`
      + "border:none;padding:0;margin:0;box-shadow:none;";
    document.body.appendChild(clone);
    const h = clone.scrollHeight;

    const footEl = clone.querySelector(".kb-foot");
    const footH = footEl ? footEl.getBoundingClientRect().height : 0;
    const gap = printSpacerHeight(h, box.h, footH);
    document.body.removeChild(clone);
    if (gap > 12) {
      spacer = document.createElement("div");
      spacer.id = "kb-spacer";
      spacer.setAttribute("aria-hidden", "true");
      spacer.style.cssText = `height:${gap}px;flex:none;`;
      const foot = area.querySelector(".kb-foot");
      if (foot) area.insertBefore(spacer, foot); else spacer = null;
    }
  }

  const cleanup = () => {
    document.getElementById(id)?.remove();
    document.getElementById("kb-spacer")?.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  setTimeout(() => window.print(), 80);
}

/* ══════════════════════════════════════════════════════════════════════
   COMPOSANTS D'INTERFACE PARTAGÉS
   ══════════════════════════════════════════════════════════════════════ */
const inputCls = "w-full px-3 py-2 rounded-lg border text-sm outline-none";
const inputStyle = { borderColor: "var(--line)" };

const Avatar = ({ member, size = 34 }) => {
  const initials = (member?.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return <div style={{ width: size, height: size, background: member?.color || "#94A3B8", fontSize: size * 0.38 }}
    className="rounded-full flex items-center justify-center text-white font-semibold shrink-0">{initials}</div>;
};

const Chip = ({ color, bg, children, dot }) => (
  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
    style={{ color, background: bg || "transparent", border: bg ? "none" : `1px solid ${color}33` }}>
    {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}{children}
  </span>
);

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(15,23,42,.55)" }} onClick={onClose}>
      <div className={`bg-white w-full ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"} sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10" style={{ borderColor: "var(--line)" }}>
          <h3 className="font-semibold" style={{ color: "var(--ink)" }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const Field = ({ label, children, hint }) => (
  <label className="block mb-3">
    <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>{label}</span>
    {children}
    {hint && <span className="block text-[11px] mt-1" style={{ color: "var(--muted)" }}>{hint}</span>}
  </label>
);

const StatCard = ({ icon: Icon, label, value, sub, tint = "var(--brass)", onClick, hint }) => (
  <div onClick={onClick} title={onClick ? (hint || "Voir le détail") : undefined}
    className={`bg-white rounded-xl border p-4 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
    style={{ borderColor: "var(--line)" }}>
    <div className="flex items-center gap-2 mb-2">
      <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: tint + "1A", color: tint }}><Icon size={15} /></span>
      <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</span>
    </div>
    <p className="text-2xl font-bold" style={{ color: "var(--ink)" }}>{value}</p>
    {sub && <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{sub}</p>}
    {onClick && <p className="text-[11px] mt-1.5 font-medium flex items-center gap-0.5" style={{ color: tint }}>Voir <ChevronRight size={11} /></p>}
  </div>
);

const EmptyState = ({ icon: Icon, title, sub, action }) => (
  <div className="text-center py-12">
    {Icon && <Icon size={30} className="mx-auto mb-3" style={{ color: "#C7CDD6" }} />}
    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{title}</p>
    {sub && <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{sub}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

const SectionCard = ({ title, icon: Icon, action, children, pad = true }) => (
  <section className="bg-white rounded-xl border mb-4" style={{ borderColor: "var(--line)" }}>
    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}>
      <h2 className="font-semibold flex items-center gap-2 text-sm">
        {Icon && <Icon size={16} style={{ color: "var(--brass)" }} />}{title}
      </h2>
      {action}
    </div>
    <div className={pad ? "p-4" : ""}>{children}</div>
  </section>
);

/* Encre du tampon */
const STAMP_RED = "#C8322F";
/* Logo de l'agence détouré et colorisé en rouge encre (fond transparent),
   préparé pour le tampon — un filtre CSS sur le logo couleur donnerait
   un aplat rouge, le fond blanc étant lui aussi noirci par le filtre. */
const LOGO_STAMP = "data:image/png;base64,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";

/* ══════════════════════════════════════════════════════════════════════
   SITUATION DE PAIEMENT D'UN LOCATAIRE
   Croise les tableaux de recouvrement et les quittances émises, afin que
   l'état affiché soit le même partout : Locataires, portefeuille, dossier.
   ══════════════════════════════════════════════════════════════════════ */

/* Un mois est identifié par 'YYYY-MM'. On retient, pour chaque mois,
   le montant attendu et le montant réellement encaissé. */
function paymentHistory(unit, { rentPeriods, rentLines, documents }) {
  if (!unit) return [];
  const months = {};
  const sameUnit = (l) => l.unitId === unit.id
    || (l.unitLabel || "").toLowerCase() === (unit.label || "").toLowerCase()
    || (unit.tenantName && (l.tenantName || "").toLowerCase() === unit.tenantName.toLowerCase());

  /* 1. Tableaux de recouvrement — l'état comptable prime sur le suivi commercial */
  ["commercial", "comptable"].forEach((scope) => {
    rentPeriods.filter((p) => p.propertyId === unit.propertyId && p.scope === scope).forEach((p) => {
      const line = rentLines.find((l) => l.periodId === p.id && sameUnit(l));
      if (!line) return;
      if (isVacantLine(line)) { delete months[p.period]; return; }   // lot vacant ce mois-là
      months[p.period] = {
        period: p.period,
        expected: Number(line.expected) || 0,
        collected: Number(line.collected) || 0,
        paidAt: line.paidAt || "",
        source: scope === "comptable" ? "État comptable" : "Suivi commercial",
        comment: line.comment || "",
      };
    });
  });

  /* 2. Quittances émises — une quittance validée fait foi du paiement */
  (documents || []).filter((d) => d.docType === "quittance" && d.periodIso
    && (d.unitId === unit.id
      || (unit.tenantName && (d.clientName || "").toLowerCase() === unit.tenantName.toLowerCase())))
    .forEach((d) => {
      const prev = months[d.periodIso];
      const collected = Math.max(Number(d.total) || 0, prev?.collected || 0);
      months[d.periodIso] = {
        period: d.periodIso,
        expected: prev?.expected || unit.rent || Number(d.total) || 0,
        collected,
        paidAt: d.fields?.paidOn || d.date,
        source: `Quittance ${d.ref}`,
        comment: prev?.comment || "",
      };
    });

  return Object.values(months).sort((a, b) => a.period.localeCompare(b.period));
}

/* Synthèse : arriérés (mois impayés), reliquats (mois partiellement réglés),
   en incluant l'arriéré éventuellement repris à la main. */
function arrearsOf(unit, data) {
  const hist = paymentHistory(unit, data);
  const unpaid = [], partial = [];
  hist.forEach((m) => {
    const due = (Number(m.expected) || 0) - (Number(m.collected) || 0);
    if (due <= 0) return;
    (m.collected > 0 ? partial : unpaid).push({ ...m, due });
  });

  const manualAmount = Number(unit?.arrearsAmount) || 0;
  const manualMonths = Number(unit?.arrearsMonths) || 0;
  const computed = [...unpaid, ...partial].reduce((a, m) => a + m.due, 0);

  return {
    history: hist,
    unpaidMonths: unpaid,          // mois entièrement impayés
    partialMonths: partial,        // reliquats à verser
    months: unpaid.length + partial.length + manualMonths,
    total: computed + manualAmount,
    computed, manualAmount, manualMonths,
    manualNote: unit?.arrearsNote || "",
    last: hist.length ? hist[hist.length - 1] : null,
    hasArrears: computed + manualAmount > 0,
  };
}

/* Libellé court : « 3 mois · 240 000 F » */
const arrearsLabel = (a) => `${a.months} mois · ${fcfa(a.total)}`;

/* ---- Papier à en-tête de l'agence ---- */
const AGENCY = {
  name: "ENTREPRISE KIBEGNON",
  form: "SARL au capital de 5 000 000 FCFA",
  address: "Cocody, Rue du Lycée Technique — Abidjan, Côte d'Ivoire",
  agrement: "N° agrément : AB 0005262",
  regime: "Régime d'imposition : TEE",
  centre: "Centre des impôts : Cocody",
  tel: "+225 07 87 84 33 68 / +225 01 51 96 60 67",
  rc: "RC : CI-ABJ-03-2020-B13-02665",
  cc: "CC : 2011466 M",
  bank: "BANK OF AFRICA CI — CI032 01016 008298970007 71",
  email: "Entreprisekibegnon@gmail.com",
  site: "www.entreprisekibegnon.com",
};
/* Logo « Agent Immobilier Agréé » intégré au fichier (aucun asset à déposer) */
const LOGO_AGREMENT = "data:image/png;base64,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";

/* En-tête commun à tous les documents imprimés */
function PrintHead({ title, subtitle, extra }) {
  return (
    <div className="pb-3 border-b" style={{ borderColor: "var(--line)" }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={LOGO} alt="Entreprise Kibegnon" className="h-14 w-auto" />
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--ink)" }}>{AGENCY.name}</p>
            <p className="text-[10px] leading-snug" style={{ color: "var(--muted)" }}>{AGENCY.address}</p>
            <p className="text-[10px] leading-snug" style={{ color: "var(--muted)" }}>{AGENCY.agrement} · {AGENCY.form}</p>
            <p className="text-[10px] leading-snug" style={{ color: "var(--muted)" }}>{AGENCY.regime} · {AGENCY.centre}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right">
            {title && <p className="text-base font-bold" style={{ color: "var(--brass)" }}>{title}</p>}
            {subtitle && <p className="text-sm font-semibold">{subtitle}</p>}
            {extra}
          </div>
          <img src={LOGO_AGREMENT} alt="Agent immobilier agréé" className="h-14 w-auto shrink-0" />
        </div>
      </div>
    </div>
  );
}

/* Pied de page légal, repris sur chaque document imprimé */
function PrintFoot({ note }) {
  return (
    <div className="kb-foot mt-5 pt-2 border-t text-center" style={{ borderColor: "var(--line)" }}>
      {note && <p className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>{note}</p>}
      <p className="text-[9px] leading-relaxed" style={{ color: "var(--muted)" }}>
        {AGENCY.name} — {AGENCY.form} — {AGENCY.address}<br />
        Tél : {AGENCY.tel} — {AGENCY.rc} — {AGENCY.cc} — {AGENCY.agrement}<br />
        {AGENCY.bank}<br />
        {AGENCY.email} — {AGENCY.site}
      </p>
    </div>
  );
}


/* ---- Notifications sur l'appareil (messagerie) ---- */
const NOTIF_KEY = "kb_notifications";
function notifAllowed() {
  return typeof Notification !== "undefined" && Notification.permission === "granted"
    && localStorage.getItem(NOTIF_KEY) !== "off";
}
async function askNotifications() {
  if (typeof Notification === "undefined") return "unsupported";
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm === "granted") localStorage.setItem(NOTIF_KEY, "on");
  return perm;
}
function notify(title, body, onClick) {
  if (!notifAllowed()) return;
  try {
    /* Un tag unique par notification : sans cela, les navigateurs
       remplacent silencieusement la précédente et on croit n'avoir rien reçu. */
    const n = new Notification(title, {
      body, icon: LOGO, badge: LOGO,
      tag: "kb-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      requireInteraction: false,
    });
    n.onclick = () => { window.focus(); n.close(); onClick?.(); };
    setTimeout(() => { try { n.close(); } catch {} }, 15000);
  } catch { /* certaines plateformes exigent un service worker */ }
}
/* Bandeau d'activation présent dans toute l'application, pas seulement
   dans la messagerie : une seule autorisation couvre messages, rappels de
   tâches, validations de quittances et remises de caisse. */
function NotifBanner() {
  const [perm, setPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const [hidden, setHidden] = useState(() => localStorage.getItem("kb_notif_hidden") === "1");
  if (perm !== "default" || hidden) return null;
  return (
    <div className="rounded-xl border p-3 mb-4 flex items-center justify-between gap-3 flex-wrap"
      style={{ borderColor: "#BFDBFE", background: "#EFF6FF" }}>
      <p className="text-xs" style={{ color: "#1F5C82" }}>
        <BellRing size={13} className="inline mb-0.5" /> Activez les notifications sur cet appareil : messages de l'équipe,
        rappels de tâches, quittances à valider et remises de caisse vous parviendront même dans un autre onglet.
      </p>
      <div className="flex gap-2">
        <button onClick={() => { setHidden(true); localStorage.setItem("kb_notif_hidden", "1"); }} className="kb-btn kb-btn-ghost text-sm">Plus tard</button>
        <button onClick={async () => setPerm(await askNotifications())} className="kb-btn kb-btn-primary text-sm">
          <Bell size={14} /> Activer
        </button>
      </div>
    </div>
  );
}

/* Pastille de non-lus dans le titre de l'onglet */
function useTitleBadge(count) {
  useEffect(() => {
    const base = "Kibegnon · Suivi d'équipe";
    document.title = count > 0 ? `(${count}) ${base}` : base;
  }, [count]);
}

/* ══════════════════════════════════════════════════════════════════════
   STORE (chargement, temps réel, actions Supabase)
   ══════════════════════════════════════════════════════════════════════ */
/* ---- mappers DB (snake_case) -> UI (camelCase) ---- */
const mProfile = (r) => ({ id: r.id, name: r.full_name, username: r.username, role: r.role, deptId: r.dept_id, color: r.color, active: r.active });
const mDept    = (r) => ({ id: r.id, name: r.name, color: r.color });
const mTask    = (r) => ({ id: r.id, title: r.title, description: r.description, deptId: r.dept_id, assigneeId: r.assignee_id, urgency: r.urgency, status: r.status, estMin: r.est_min, weekStart: r.week_start, day: r.day, dueDate: r.due_date, createdBy: r.created_by, createdAt: Date.parse(r.created_at), propertyId: r.property_id, ownerId: r.owner_id, nature: r.nature || "autre", assigneeIds: r.assignee_ids || [], startTime: r.start_time || "", reminderMin: Number(r.reminder_min) || 0 });
const mEntry   = (r) => ({ id: r.id, taskId: r.task_id, userId: r.user_id, start: Date.parse(r.start_at), end: Date.parse(r.end_at), durationSeconds: r.duration_seconds, note: r.note });
const mTimer   = (r) => ({ userId: r.user_id, taskId: r.task_id, startedAt: Date.parse(r.started_at) });
const mChannel = (r) => ({ id: r.id, type: r.type, name: r.name });
const mCM      = (r) => ({ channelId: r.channel_id, userId: r.user_id, lastReadAt: Date.parse(r.last_read_at) });
const mMsg     = (r) => ({ id: r.id, channelId: r.channel_id, fromId: r.from_id, text: r.body, taskId: r.task_id, createdAt: Date.parse(r.created_at), fileUrl: r.file_url || "", fileName: r.file_name || "", fileType: r.file_type || "", fileSize: r.file_size || 0 });

const mOwner   = (r) => ({ id: r.id, name: r.full_name, kind: r.kind, phone: r.phone, email: r.email, address: r.address, idNumber: r.id_number, notes: r.notes, active: r.active });
const mProp    = (r) => ({ id: r.id, ref: r.ref, name: r.name, kind: r.kind, address: r.address, commune: r.commune, quartier: r.quartier, ownerId: r.owner_id, lotsCount: r.lots_count, surface: r.surface_m2, rent: r.rent_amount, mandate: r.mandate_type, status: r.status, notes: r.notes, agentId: r.agent_id, salePrice: r.sale_price, availableFor: r.available_for || 'aucun' });
const mProduct = (r) => ({ id: r.id, name: r.name, category: r.category, unit: r.unit, stock: Number(r.stock_qty), minQty: Number(r.min_qty), price: Number(r.unit_price), supplier: r.supplier, active: r.active });
const mStockIn = (r) => ({ id: r.id, productId: r.product_id, qty: Number(r.qty), price: Number(r.unit_price), supplier: r.supplier, date: r.entry_date, notes: r.notes, createdBy: r.created_by });
const mRelease = (r) => ({ id: r.id, ref: r.ref, propertyId: r.property_id, releasedTo: r.released_to, releasedBy: r.released_by, purpose: r.purpose, date: r.release_date, zone: r.zone, notes: r.notes, createdAt: Date.parse(r.created_at) });
const mRelLine = (r) => ({ id: r.id, releaseId: r.release_id, productId: r.product_id, qty: Number(r.qty), price: Number(r.unit_price) });
const mQuote   = (r) => ({ id: r.id, ref: r.ref, artisanName: r.artisan_name, trade: r.artisan_trade, phone: r.artisan_phone, propertyId: r.property_id, ownerId: r.owner_id, date: r.quote_date, source: r.source, object: r.object, total: Number(r.total_amount), status: r.status, notes: r.notes, recordedBy: r.recorded_by, createdAt: Date.parse(r.created_at) });
const mQLine   = (r) => ({ id: r.id, quoteId: r.quote_id, label: r.label, qty: Number(r.qty), unit: r.unit, price: Number(r.unit_price), position: r.position });
const mUnit    = (r) => ({ id: r.id, propertyId: r.property_id, label: r.label, kind: r.kind, floor: r.floor, rooms: r.rooms, surface: r.surface_m2, rent: Number(r.rent_amount), charges: Number(r.charges_amount), status: r.status, tenantName: r.tenant_name, tenantPhone: r.tenant_phone, leaseStart: r.lease_start, notes: r.notes, tenantEmail: r.tenant_email || "", leaseEnd: r.lease_end, dueDay: r.due_day || 5, deposit: Number(r.deposit) || 0 });
const mPeriod  = (r) => ({ id: r.id, propertyId: r.property_id, period: r.period, scope: r.scope, rate: Number(r.agency_rate), status: r.status, notes: r.notes, createdBy: r.created_by, createdAt: Date.parse(r.created_at) });
const mRLine   = (r) => ({ id: r.id, periodId: r.period_id, unitId: r.unit_id, unitLabel: r.unit_label, tenantName: r.tenant_name, tenantPhone: r.tenant_phone, expected: Number(r.expected), collected: Number(r.collected), paidAt: r.paid_at, charges: Number(r.charges), comment: r.comment, position: r.position, vacant: !!r.vacant });
const mRCharge = (r) => ({ id: r.id, periodId: r.period_id, label: r.label, amount: Number(r.amount), observation: r.observation, position: r.position, kind: r.kind || "charge" });
const mCash     = (r) => ({ id: r.id, date: r.entry_date, direction: r.direction, amount: Number(r.amount), label: r.label, category: r.category, method: r.method, propertyId: r.property_id, ownerId: r.owner_id, reference: r.reference, notes: r.notes, createdBy: r.created_by, createdAt: Date.parse(r.created_at) });
const mHandover = (r) => ({ id: r.id, date: r.handover_date, amount: Number(r.amount), fromUser: r.from_user, toUser: r.to_user, status: r.status, approvedAt: r.approved_at, note: r.note, responseNote: r.response_note, createdAt: Date.parse(r.created_at) });
const mFolderFile = (r) => ({ id: r.id, scope: r.scope, unitId: r.unit_id, ownerId: r.owner_id, propertyId: r.property_id, category: r.category, label: r.label, fileUrl: r.file_url, fileName: r.file_name, fileType: r.file_type, fileSize: Number(r.file_size) || 0, notes: r.notes, uploadedBy: r.uploaded_by, createdAt: Date.parse(r.created_at) });
const mComplaint = (r) => ({ id: r.id, ref: r.ref, propertyId: r.property_id, unitId: r.unit_id, tenantName: r.tenant_name, tenantPhone: r.tenant_phone, category: r.category, cause: r.cause, priority: r.priority, description: r.description, reportedAt: r.reported_at, channel: r.channel, status: r.status, assignedTo: r.assigned_to, quoteId: r.quote_id, cost: Number(r.cost) || 0, resolution: r.resolution, resolvedAt: r.resolved_at, createdBy: r.created_by });
const mTax     = (r) => ({ id: r.id, propertyId: r.property_id, unitId: r.unit_id, customLabel: r.custom_label, ownerId: r.owner_id, ownerLabel: r.owner_label, taxYear: r.tax_year, noticeNumber: r.notice_number, taxedAmount: Number(r.taxed_amount), installments: r.installments || [], receipts: r.receipts, declarationNext: r.declaration_next, notes: r.notes, createdBy: r.created_by, ncc: r.ncc || "", declarationDate: r.declaration_date, nextBase: r.next_base });
const mReq     = (r) => ({ id: r.id, reqType: r.req_type, userId: r.user_id, date: r.req_date, amount: Number(r.amount), destination: r.destination, mode: r.transport_mode, propertyId: r.property_id, startDate: r.start_date, endDate: r.end_date, absenceType: r.absence_type, motif: r.motif, status: r.status, decidedBy: r.decided_by, decidedAt: r.decided_at, decisionNote: r.decision_note, createdAt: Date.parse(r.created_at) });
const mDoc     = (r) => ({ id: r.id, ref: r.ref, docType: r.doc_type, date: r.doc_date, propertyId: r.property_id, ownerId: r.owner_id, clientName: r.client_name, clientPhone: r.client_phone, clientEmail: r.client_email, clientAddr: r.client_addr, object: r.object, body: r.body, lines: r.lines || [], fields: r.fields || {}, total: Number(r.total_amount), status: r.status, notes: r.notes, createdBy: r.created_by, createdAt: Date.parse(r.created_at), unitId: r.unit_id, paidStamp: !!r.paid_stamp, stampedBy: r.stamped_by, period: r.period || "", approval: r.approval || "non_requise", approvedBy: r.approved_by, approvedAt: r.approved_at, approvalNote: r.approval_note || "", periodIso: r.period_iso || "", direction: r.direction || "encaissement" });
const mTpl     = (r) => ({ id: r.id, label: r.label, nature: r.nature, deptId: r.dept_id, urgency: r.urgency, estMin: r.est_min, sortOrder: r.sort_order, active: r.active });

const upsertBy = (key, map) => (setter) => (row) =>
  setter((p) => { const v = map(row); const i = p.findIndex((x) => x[key] === v[key]); if (i >= 0) { const c = [...p]; c[i] = v; return c; } return [...p, v]; });
const removeBy = (key) => (setter) => (val) => setter((p) => p.filter((x) => x[key] !== val));

function useStore(userId) {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [activeTimers, setActiveTimers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [channelMembers, setChannelMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [owners, setOwners] = useState([]);
  const [properties, setProperties] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockEntries, setStockEntries] = useState([]);
  const [releases, setReleases] = useState([]);
  const [releaseLines, setReleaseLines] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [quoteLines, setQuoteLines] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [units, setUnits] = useState([]);
  const [rentPeriods, setRentPeriods] = useState([]);
  const [rentLines, setRentLines] = useState([]);
  const [rentCharges, setRentCharges] = useState([]);
  const [requests, setRequests] = useState([]);
  const [taxRecords, setTaxRecords] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [folderFiles, setFolderFiles] = useState([]);
  const [cashEntries, setCashEntries] = useState([]);
  const [handovers, setHandovers] = useState([]);

  /* Référence vivante des membres, utilisée par les notifications */
  const membersRef = useRef([]);
  useEffect(() => { membersRef.current = members; }, [members]);

  const load = useCallback(async () => {
    const [dep, prof, tk, te, at, ch, cm, ms, ow, pr, pd, se, rl, rll, qt, ql, tpl, doc, un, rp, rlin, rch, rq, tax, cp, ff, ce, ho] = await Promise.all([
      supabase.from("departments").select("*").order("created_at"),
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("tasks").select("*"),
      supabase.from("time_entries").select("*"),
      supabase.from("active_timers").select("*"),
      supabase.from("channels").select("*"),
      supabase.from("channel_members").select("*"),
      supabase.from("messages").select("*"),
      supabase.from("owners").select("*").order("full_name"),
      supabase.from("properties").select("*").order("name"),
      supabase.from("products").select("*").order("name"),
      supabase.from("stock_entries").select("*"),
      supabase.from("material_releases").select("*").order("release_date", { ascending: false }),
      supabase.from("material_release_lines").select("*"),
      supabase.from("quotes").select("*").order("quote_date", { ascending: false }),
      supabase.from("quote_lines").select("*").order("position"),
      supabase.from("task_templates").select("*").order("sort_order"),
      supabase.from("documents").select("*").order("doc_date", { ascending: false }),
      supabase.from("units").select("*").order("label"),
      supabase.from("rent_periods").select("*").order("period", { ascending: false }),
      supabase.from("rent_lines").select("*").order("position"),
      supabase.from("rent_charges").select("*").order("position"),
      supabase.from("requests").select("*").order("req_date", { ascending: false }),
      supabase.from("tax_records").select("*").order("tax_year", { ascending: false }),
      supabase.from("complaints").select("*").order("reported_at", { ascending: false }),
      supabase.from("folder_files").select("*").order("created_at", { ascending: false }),
      supabase.from("cash_entries").select("*").order("entry_date", { ascending: false }),
      supabase.from("cash_handovers").select("*").order("handover_date", { ascending: false }),
    ]);
    setDepartments((dep.data || []).map(mDept));
    setMembers((prof.data || []).map(mProfile));
    setTasks((tk.data || []).map(mTask));
    setTimeEntries((te.data || []).map(mEntry));
    setActiveTimers((at.data || []).map(mTimer));
    setChannels((ch.data || []).map(mChannel));
    setChannelMembers((cm.data || []).map(mCM));
    setMessages((ms.data || []).map(mMsg));
    setOwners((ow.data || []).map(mOwner));
    setProperties((pr.data || []).map(mProp));
    setProducts((pd.data || []).map(mProduct));
    setStockEntries((se.data || []).map(mStockIn));
    setReleases((rl.data || []).map(mRelease));
    setReleaseLines((rll.data || []).map(mRelLine));
    setQuotes((qt.data || []).map(mQuote));
    setQuoteLines((ql.data || []).map(mQLine));
    setTemplates((tpl.data || []).map(mTpl));
    setDocuments((doc.data || []).map(mDoc));
    setUnits((un.data || []).map(mUnit));
    setRentPeriods((rp.data || []).map(mPeriod));
    setRentLines((rlin.data || []).map(mRLine));
    setRentCharges((rch.data || []).map(mRCharge));
    setRequests((rq.data || []).map(mReq));
    setTaxRecords((tax.data || []).map(mTax));
    setComplaints((cp.data || []).map(mComplaint));
    setFolderFiles((ff.data || []).map(mFolderFile));
    setCashEntries((ce.data || []).map(mCash));
    setHandovers((ho.data || []).map(mHandover));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ---- abonnement temps réel ---- */
  useEffect(() => {
    const upTask = upsertBy("id", mTask)(setTasks), rmTask = removeBy("id")(setTasks);
    const upEntry = upsertBy("id", mEntry)(setTimeEntries), rmEntry = removeBy("id")(setTimeEntries);
    const upTimer = upsertBy("userId", mTimer)(setActiveTimers), rmTimer = removeBy("userId")(setActiveTimers);
    const upProf = upsertBy("id", mProfile)(setMembers), rmProf = removeBy("id")(setMembers);
    const upDept = upsertBy("id", mDept)(setDepartments), rmDept = removeBy("id")(setDepartments);
    const upChan = upsertBy("id", mChannel)(setChannels);
    const upOwner = upsertBy("id", mOwner)(setOwners), rmOwner = removeBy("id")(setOwners);
    const upProp = upsertBy("id", mProp)(setProperties), rmProp = removeBy("id")(setProperties);
    const upProd = upsertBy("id", mProduct)(setProducts), rmProd = removeBy("id")(setProducts);
    const upSE = upsertBy("id", mStockIn)(setStockEntries), rmSE = removeBy("id")(setStockEntries);
    const upRel = upsertBy("id", mRelease)(setReleases), rmRel = removeBy("id")(setReleases);
    const upRL = upsertBy("id", mRelLine)(setReleaseLines), rmRL = removeBy("id")(setReleaseLines);
    const upQ = upsertBy("id", mQuote)(setQuotes), rmQ = removeBy("id")(setQuotes);
    const upQL = upsertBy("id", mQLine)(setQuoteLines), rmQL = removeBy("id")(setQuoteLines);
    const upTpl = upsertBy("id", mTpl)(setTemplates), rmTpl = removeBy("id")(setTemplates);
    const upDoc = upsertBy("id", mDoc)(setDocuments), rmDoc = removeBy("id")(setDocuments);
    const upUnit = upsertBy("id", mUnit)(setUnits), rmUnit = removeBy("id")(setUnits);
    const upRP = upsertBy("id", mPeriod)(setRentPeriods), rmRP = removeBy("id")(setRentPeriods);
    const upRL2 = upsertBy("id", mRLine)(setRentLines), rmRL2 = removeBy("id")(setRentLines);
    const upRC = upsertBy("id", mRCharge)(setRentCharges), rmRC = removeBy("id")(setRentCharges);
    const upReq = upsertBy("id", mReq)(setRequests), rmReq = removeBy("id")(setRequests);
    const upTax = upsertBy("id", mTax)(setTaxRecords), rmTax = removeBy("id")(setTaxRecords);
    const upCp = upsertBy("id", mComplaint)(setComplaints), rmCp = removeBy("id")(setComplaints);
    const upFf = upsertBy("id", mFolderFile)(setFolderFiles), rmFf = removeBy("id")(setFolderFiles);
    const upCe = upsertBy("id", mCash)(setCashEntries), rmCe = removeBy("id")(setCashEntries);
    const upHo = upsertBy("id", mHandover)(setHandovers), rmHo = removeBy("id")(setHandovers);
    const h = (up, rm, key = "id") => (p) => p.eventType === "DELETE" ? rm(p.old[key]) : up(p.new);

    const ch = supabase.channel("kibegnon-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, h(upTask, rmTask))
      .on("postgres_changes", { event: "*", schema: "public", table: "time_entries" }, h(upEntry, rmEntry))
      .on("postgres_changes", { event: "*", schema: "public", table: "active_timers" }, h(upTimer, rmTimer, "user_id"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
        if (p.new.from_id !== userId) {
          const author = membersRef.current.find((m) => m.id === p.new.from_id);
          const preview = p.new.body?.trim() || (p.new.file_name ? `📎 ${p.new.file_name}` : "Tâche partagée");
          notify(author?.name || "Nouveau message", preview);
        }
        setMessages((prev) => {
          const cleaned = prev.filter((m) => !(String(m.id).startsWith("tmp-") && m.fromId === p.new.from_id && m.text === p.new.body && (m.taskId || null) === (p.new.task_id || null)));
          if (cleaned.some((m) => m.id === p.new.id)) return cleaned;
          return [...cleaned, mMsg(p.new)];
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "channels" }, (p) => p.eventType !== "DELETE" && upChan(p.new))
      .on("postgres_changes", { event: "*", schema: "public", table: "channel_members" }, () => { supabase.from("channel_members").select("*").then(({ data }) => data && setChannelMembers(data.map(mCM))); })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, h(upProf, rmProf))
      .on("postgres_changes", { event: "*", schema: "public", table: "departments" }, h(upDept, rmDept))
      .on("postgres_changes", { event: "*", schema: "public", table: "owners" }, h(upOwner, rmOwner))
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, h(upProp, rmProp))
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, h(upProd, rmProd))
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_entries" }, h(upSE, rmSE))
      .on("postgres_changes", { event: "*", schema: "public", table: "material_releases" }, h(upRel, rmRel))
      .on("postgres_changes", { event: "*", schema: "public", table: "material_release_lines" }, h(upRL, rmRL))
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, h(upQ, rmQ))
      .on("postgres_changes", { event: "*", schema: "public", table: "quote_lines" }, h(upQL, rmQL))
      .on("postgres_changes", { event: "*", schema: "public", table: "task_templates" }, h(upTpl, rmTpl))
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, h(upDoc, rmDoc))
      .on("postgres_changes", { event: "*", schema: "public", table: "units" }, h(upUnit, rmUnit))
      .on("postgres_changes", { event: "*", schema: "public", table: "rent_periods" }, h(upRP, rmRP))
      .on("postgres_changes", { event: "*", schema: "public", table: "rent_lines" }, h(upRL2, rmRL2))
      .on("postgres_changes", { event: "*", schema: "public", table: "rent_charges" }, h(upRC, rmRC))
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, h(upReq, rmReq))
      .on("postgres_changes", { event: "*", schema: "public", table: "tax_records" }, h(upTax, rmTax))
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, h(upCp, rmCp))
      .on("postgres_changes", { event: "*", schema: "public", table: "folder_files" }, h(upFf, rmFf))
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_entries" }, h(upCe, rmCe))
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_handovers" }, (p) => {
        if (p.eventType === "DELETE") return rmHo(p.old.id);
        /* Le gardien du solde est prévenu dès qu'une remise lui est adressée */
        if (p.eventType === "INSERT" && p.new.to_user === userId) {
          notify("Remise de caisse à certifier",
            `${fcfa(Number(p.new.amount))} du ${p.new.handover_date} — à confirmer dans l'onglet Caisse.`);
        }
        upHo(p.new);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "documents" }, (p) => {
        /* L'auteur est prévenu dès qu'un administrateur valide sa quittance */
        if (p.new.created_by === userId && p.old?.approval !== "approuve" && p.new.approval === "approuve") {
          notify("Quittance validée", `${p.new.ref} approuvée — vous pouvez l'imprimer et la remettre au client.`);
        }
        if (p.new.created_by === userId && p.old?.approval !== "refuse" && p.new.approval === "refuse") {
          notify("Quittance refusée", `${p.new.ref} : ${p.new.approval_note || "voir le motif dans Documents"}`);
        }
      })
      .subscribe();

    /* Filet de sécurité : si la connexion temps réel se coupe (veille du
       téléphone, perte de réseau, onglet en arrière-plan), on resynchronise
       au retour sur l'application et périodiquement. Plus besoin d'actualiser. */
    const resync = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("online", resync);
    window.addEventListener("focus", resync);
    const timer = setInterval(resync, 60000);

    return () => {
      supabase.removeChannel(ch);
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("online", resync);
      window.removeEventListener("focus", resync);
      clearInterval(timer);
    };
  }, [load]);

  /* ================= ACTIONS : TÂCHES ================= */
  const createTask = async (f) => {
    const { data, error } = await supabase.from("tasks").insert({
      title: f.title, description: f.description || "", dept_id: f.deptId || null, assignee_id: f.assigneeId,
      urgency: f.urgency, status: f.status || "a_faire", est_min: f.estMin, week_start: f.weekStart,
      day: f.day ?? null, due_date: f.dueDate || null, created_by: userId,
      property_id: f.propertyId || null, owner_id: f.ownerId || null, nature: f.nature || "autre",
      assignee_ids: f.assigneeIds || [], start_time: f.startTime || null,
      reminder_min: Number(f.reminderMin) || 0,
    }).select().single();
    // Affichage immédiat sans attendre l'écho temps réel
    if (data) setTasks((p) => (p.some((t) => t.id === data.id) ? p : [...p, mTask(data)]));
    return { error: error?.message };
  };
  const updateTask = async (id, patch) => {
    const map = { title: "title", description: "description", deptId: "dept_id", assigneeId: "assignee_id",
      urgency: "urgency", status: "status", estMin: "est_min", weekStart: "week_start", day: "day",
      dueDate: "due_date", propertyId: "property_id", ownerId: "owner_id", nature: "nature",
      assigneeIds: "assignee_ids", startTime: "start_time", reminderMin: "reminder_min" };
    const row = {};
    Object.entries(map).forEach(([k, col]) => { if (k in patch) row[col] = patch[k] === "" ? null : patch[k]; });
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, ...patch } : t)));  // immédiat
    const { data } = await supabase.from("tasks").update(row).eq("id", id).select().single();
    if (data) setTasks((p) => p.map((t) => (t.id === id ? mTask(data) : t)));
  };
  const deleteTask = async (id) => {
    setTasks((p) => p.filter((t) => t.id !== id));  // immédiat
    await supabase.from("tasks").delete().eq("id", id);
  };

  /* ================= ACTIONS : TEMPS ================= */
  const startTimer = async (taskId) => {
    setActiveTimers((p) => [...p.filter((t) => t.userId !== userId), { userId, taskId, startedAt: Date.now() }]);
    await supabase.from("active_timers").upsert({ user_id: userId, task_id: taskId, started_at: new Date().toISOString() });
  };
  /* Arrête le chrono et enregistre la session (= mise en pause) */
  const stopTimer = async (note = "") => {
    const mine = activeTimers.find((t) => t.userId === userId);
    if (!mine) return null;
    const sec = Math.round((Date.now() - mine.startedAt) / 1000);
    setActiveTimers((p) => p.filter((t) => t.userId !== userId));
    if (sec > 1) {
      const { data } = await supabase.from("time_entries").insert({ task_id: mine.taskId, user_id: userId,
        start_at: new Date(mine.startedAt).toISOString(), end_at: new Date().toISOString(),
        duration_seconds: sec, note }).select().single();
      if (data) setTimeEntries((p) => (p.some((e) => e.id === data.id) ? p : [...p, mEntry(data)]));
    }
    await supabase.from("active_timers").delete().eq("user_id", userId);
    return mine.taskId;
  };
  /* Met la tâche en pause : le chrono s'arrête, le statut repasse à "en cours" */
  const pauseTask = async () => {
    const taskId = await stopTimer("pause");
    if (taskId) await updateTask(taskId, { status: "en_cours" });
  };
  /* Termine la tâche : arrête le chrono et bascule le statut sur "terminé" */
  const finishTask = async (taskId) => {
    const mine = activeTimers.find((t) => t.userId === userId);
    if (mine && (!taskId || mine.taskId === taskId)) await stopTimer("");
    if (taskId) await updateTask(taskId, { status: "termine" });
  };
  const addManualTime = async (taskId, min) => {
    const { data } = await supabase.from("time_entries").insert({ task_id: taskId, user_id: userId, start_at: new Date(Date.now() - min * 60000).toISOString(), end_at: new Date().toISOString(), duration_seconds: min * 60, note: "saisie manuelle" }).select().single();
    if (data) setTimeEntries((p) => (p.some((e) => e.id === data.id) ? p : [...p, mEntry(data)]));
  };
  const deleteEntry = async (id) => {
    setTimeEntries((p) => p.filter((e) => e.id !== id));
    await supabase.from("time_entries").delete().eq("id", id);
  };

  /* ================= ACTIONS : MESSAGERIE ================= */
  const ensureDm = async (otherId) => {
    const { data, error } = await supabase.rpc("get_or_create_dm", { other_user: otherId });
    if (error) { console.error(error); return null; }
    await supabase.from("channel_members").select("*").then(({ data: cm }) => cm && setChannelMembers(cm.map(mCM)));
    await supabase.from("channels").select("*").then(({ data: c }) => c && setChannels(c.map(mChannel)));
    return data;
  };
  const sendMessage = async (channelId, text, taskId = null, file = null) => {
    const body = (text || "").trim();
    if (!body && !taskId && !file) return;
    const tmp = { id: "tmp-" + Date.now(), channelId, fromId: userId, text: body, taskId, createdAt: Date.now(),
      fileUrl: "", fileName: file?.fileName || "", fileType: file?.fileType || "", fileSize: file?.fileSize || 0 };
    setMessages((p) => [...p, tmp]);
    await supabase.from("messages").insert({ channel_id: channelId, from_id: userId, body, task_id: taskId,
      file_url: file?.fileUrl || "", file_name: file?.fileName || "", file_type: file?.fileType || "", file_size: file?.fileSize || 0 });
    markRead(channelId);
  };
  /* Envoi d'un fichier dans la messagerie (Supabase Storage) */
  const uploadAttachment = async (file) => {
    if (!file) return { error: "Aucun fichier" };
    if (file.size > 15 * 1024 * 1024) return { error: "Fichier trop volumineux (15 Mo maximum)." };
    const safe = file.name.replace(/[^\w.\-]/g, "_");
    const path = `${userId}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from("pieces-jointes").upload(path, file, { upsert: false });
    if (error) return { error: error.message };
    const { data } = supabase.storage.from("pieces-jointes").getPublicUrl(path);
    return { fileUrl: data.publicUrl, fileName: file.name, fileType: file.type, fileSize: file.size };
  };
  const markRead = async (channelId) => {
    setChannelMembers((p) => p.map((c) => (c.channelId === channelId && c.userId === userId ? { ...c, lastReadAt: Date.now() } : c)));
    await supabase.rpc("mark_channel_read", { cid: channelId });
  };

  /* ================= ACTIONS : ADMINISTRATION ================= */
  const saveDept = async (f) => {
    if (f.id) await supabase.from("departments").update({ name: f.name, color: f.color }).eq("id", f.id);
    else await supabase.from("departments").insert({ name: f.name, color: f.color });
  };
  const deleteDept = async (id) => { await supabase.from("departments").delete().eq("id", id); };
  const updateProfile = async (id, patch) => {
    const row = {};
    if ("name" in patch) row.full_name = patch.name;
    if ("role" in patch) row.role = patch.role;
    if ("deptId" in patch) row.dept_id = patch.deptId;
    if ("color" in patch) row.color = patch.color;
    if ("active" in patch) row.active = patch.active;
    await supabase.from("profiles").update(row).eq("id", id);
  };
  const adminUsers = async (payload) => {
    const { data, error } = await supabase.functions.invoke("admin-users", { body: payload });
    if (error) return { error: error.message };
    await load();
    return data || {};
  };

  /* ================= ACTIONS : PROPRIÉTAIRES & BIENS ================= */
  const saveOwner = async (f) => {
    const row = { full_name: f.name, kind: f.kind, phone: f.phone || "", email: f.email || "",
      address: f.address || "", id_number: f.idNumber || "", notes: f.notes || "", active: f.active !== false };
    if (f.id) { const { error } = await supabase.from("owners").update(row).eq("id", f.id); return { error: error?.message }; }
    const { data, error } = await supabase.from("owners").insert({ ...row, created_by: userId }).select().single();
    if (data) setOwners((p) => p.some((x) => x.id === data.id) ? p : [...p, mOwner(data)]);
    return { error: error?.message, id: data?.id };
  };
  const deleteOwner = async (id) => { const { error } = await supabase.from("owners").delete().eq("id", id); return { error: error?.message }; };

  const saveProperty = async (f) => {
    const row = { ref: f.ref || "", name: f.name, kind: f.kind, address: f.address || "", commune: f.commune || "",
      quartier: f.quartier || "", owner_id: f.ownerId || null, lots_count: Number(f.lotsCount) || 1,
      surface_m2: f.surface ? Number(f.surface) : null, rent_amount: f.rent ? Number(f.rent) : null,
      mandate_type: f.mandate, status: f.status, notes: f.notes || "", agent_id: f.agentId || null, sale_price: f.salePrice ? Number(f.salePrice) : null, available_for: f.availableFor || 'aucun' };
    if (f.id) { const { error } = await supabase.from("properties").update(row).eq("id", f.id); return { error: error?.message }; }
    const { data, error } = await supabase.from("properties").insert({ ...row, created_by: userId }).select().single();
    if (data) setProperties((p) => p.some((x) => x.id === data.id) ? p : [...p, mProp(data)]);
    return { error: error?.message, id: data?.id };
  };
  const deleteProperty = async (id) => { const { error } = await supabase.from("properties").delete().eq("id", id); return { error: error?.message }; };

  /* ================= ACTIONS : PRODUITS & STOCK ================= */
  const saveProduct = async (f) => {
    const row = { name: f.name, category: f.category, unit: f.unit, min_qty: Number(f.minQty) || 0,
      unit_price: Number(f.price) || 0, supplier: f.supplier || "", active: f.active !== false };
    if (f.id) { const { error } = await supabase.from("products").update(row).eq("id", f.id); return { error: error?.message }; }
    const { data, error } = await supabase.from("products").insert(row).select().single();
    if (data) setProducts((p) => p.some((x) => x.id === data.id) ? p : [...p, mProduct(data)]);
    return { error: error?.message, id: data?.id };
  };
  const deleteProduct = async (id) => { const { error } = await supabase.from("products").delete().eq("id", id); return { error: error?.message }; };

  const addStockEntry = async (f) => {
    const { error } = await supabase.from("stock_entries").insert({
      product_id: f.productId, qty: Number(f.qty), unit_price: Number(f.price) || 0,
      supplier: f.supplier || "", entry_date: f.date, notes: f.notes || "", created_by: userId });
    if (!error) await refreshProducts();
    return { error: error?.message };
  };
  const refreshProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    if (data) setProducts(data.map(mProduct));
  };

  /* ---- Fiche de sortie : en-tête + lignes en une opération ---- */
  const saveRelease = async (f, lines) => {
    let releaseId = f.id;
    const row = { property_id: f.propertyId || null, released_to: f.releasedTo || "", purpose: f.purpose,
      release_date: f.date, zone: f.zone || "", notes: f.notes || "" };
    if (releaseId) {
      const { error } = await supabase.from("material_releases").update(row).eq("id", releaseId);
      if (error) return { error: error.message };
      await supabase.from("material_release_lines").delete().eq("release_id", releaseId);
    } else {
      const { data, error } = await supabase.from("material_releases")
        .insert({ ...row, released_by: userId }).select().single();
      if (error) return { error: error.message };
      releaseId = data.id;
      setReleases((p) => p.some((x) => x.id === data.id) ? p : [mRelease(data), ...p]);
    }
    const payload = lines.filter((l) => l.productId && Number(l.qty) > 0)
      .map((l) => ({ release_id: releaseId, product_id: l.productId, qty: Number(l.qty), unit_price: Number(l.price) || 0 }));
    if (payload.length) {
      const { error } = await supabase.from("material_release_lines").insert(payload);
      if (error) return { error: error.message };
    }
    await Promise.all([refreshProducts(), refreshReleaseLines()]);
    return {};
  };
  const refreshReleaseLines = async () => {
    const { data } = await supabase.from("material_release_lines").select("*");
    if (data) setReleaseLines(data.map(mRelLine));
  };
  const deleteRelease = async (id) => {
    const { error } = await supabase.from("material_releases").delete().eq("id", id);
    if (!error) await Promise.all([refreshProducts(), refreshReleaseLines()]);
    return { error: error?.message };
  };

  /* ================= ACTIONS : DEVIS ARTISANS ================= */
  const saveQuote = async (f, lines) => {
    let quoteId = f.id;
    const row = { artisan_name: f.artisanName, artisan_trade: f.trade || "", artisan_phone: f.phone || "",
      property_id: f.propertyId || null, owner_id: f.ownerId || null, quote_date: f.date,
      source: f.source, object: f.object || "", status: f.status, notes: f.notes || "" };
    if (quoteId) {
      const { error } = await supabase.from("quotes").update(row).eq("id", quoteId);
      if (error) return { error: error.message };
      await supabase.from("quote_lines").delete().eq("quote_id", quoteId);
    } else {
      const { data, error } = await supabase.from("quotes")
        .insert({ ...row, recorded_by: userId }).select().single();
      if (error) return { error: error.message };
      quoteId = data.id;
      setQuotes((p) => p.some((x) => x.id === data.id) ? p : [mQuote(data), ...p]);
    }
    const payload = lines.filter((l) => (l.label || "").trim())
      .map((l, i) => ({ quote_id: quoteId, label: l.label, qty: Number(l.qty) || 1, unit: l.unit || "u",
        unit_price: Number(l.price) || 0, position: i }));
    if (payload.length) {
      const { error } = await supabase.from("quote_lines").insert(payload);
      if (error) return { error: error.message };
    }
    await refreshQuotes();
    return { error: null, id: quoteId };
  };
  const refreshQuotes = async () => {
    const [q, l] = await Promise.all([
      supabase.from("quotes").select("*").order("quote_date", { ascending: false }),
      supabase.from("quote_lines").select("*").order("position"),
    ]);
    if (q.data) setQuotes(q.data.map(mQuote));
    if (l.data) setQuoteLines(l.data.map(mQLine));
  };
  const setQuoteStatus = async (id, status) => { await supabase.from("quotes").update({ status }).eq("id", id); };
  const deleteQuote = async (id) => {
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (!error) await refreshQuotes();
    return { error: error?.message };
  };

  /* ================= ACTIONS : LOTS ================= */
  const saveUnit = async (f) => {
    const row = { property_id: f.propertyId, label: f.label, kind: f.kind, floor: f.floor || "",
      rooms: (f.rooms === "" || f.rooms === null || f.rooms === undefined) ? null : Number(f.rooms), surface_m2: f.surface ? Number(f.surface) : null,
      rent_amount: Number(f.rent) || 0, charges_amount: Number(f.charges) || 0, status: f.status,
      tenant_name: f.tenantName || "", tenant_phone: f.tenantPhone || "",
      lease_start: f.leaseStart || null, notes: f.notes || "",
      tenant_email: f.tenantEmail || "", lease_end: f.leaseEnd || null,
      due_day: Number(f.dueDay) || 5, deposit: Number(f.deposit) || 0,
      advance_months: Number(f.advanceMonths) || 0, advance_start: f.advanceStart || null,
      arrears_amount: Number(f.arrearsAmount) || 0, arrears_months: Number(f.arrearsMonths) || 0,
      arrears_note: f.arrearsNote || "" };
    if (f.id) {
      setUnits((p) => p.map((u) => (u.id === f.id ? { ...u, ...f } : u)));
      const { error } = await supabase.from("units").update(row).eq("id", f.id);
      return { error: error?.message };
    }
    const { data, error } = await supabase.from("units").insert(row).select().single();
    if (data) setUnits((p) => (p.some((u) => u.id === data.id) ? p : [...p, mUnit(data)]));
    return { error: error?.message, id: data?.id };
  };
  const deleteUnit = async (id) => {
    setUnits((p) => p.filter((u) => u.id !== id));
    const { error } = await supabase.from("units").delete().eq("id", id);
    return { error: error?.message };
  };
  /* Création de plusieurs lots d'un coup (ex. Appt A1 → A8) */
  const bulkCreateUnits = async (propertyId, rows) => {
    const payload = rows.filter((r) => (r.label || "").trim()).map((r) => ({
      property_id: propertyId, label: r.label, kind: r.kind || "appartement",
      rent_amount: Number(r.rent) || 0, status: r.status || "vacant",
    }));
    if (!payload.length) return {};
    const { data, error } = await supabase.from("units").insert(payload).select();
    if (data) setUnits((p) => [...p, ...data.map(mUnit).filter((u) => !p.some((x) => x.id === u.id))]);
    return { error: error?.message };
  };

  /* ================= ACTIONS : RECOUVREMENT ================= */
  const savePeriod = async (f) => {
    const row = { property_id: f.propertyId, period: f.period, scope: f.scope,
      agency_rate: Number(f.rate) || 0, status: f.status || "brouillon", notes: f.notes || "" };
    if (f.id) {
      setRentPeriods((p) => p.map((x) => (x.id === f.id ? { ...x, ...f } : x)));
      const { error } = await supabase.from("rent_periods").update(row).eq("id", f.id);
      return { error: error?.message, id: f.id };
    }
    const { data, error } = await supabase.from("rent_periods")
      .insert({ ...row, created_by: userId }).select().single();
    if (data) setRentPeriods((p) => (p.some((x) => x.id === data.id) ? p : [mPeriod(data), ...p]));
    return { error: error?.message, id: data?.id };
  };
  const deletePeriod = async (id) => {
    setRentPeriods((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from("rent_periods").delete().eq("id", id);
    return { error: error?.message };
  };
  /* Remplace en bloc les lignes et charges d'une période */
  const savePeriodContent = async (periodId, lines, charges) => {
    await supabase.from("rent_lines").delete().eq("period_id", periodId);
    await supabase.from("rent_charges").delete().eq("period_id", periodId);
    const lPayload = lines.filter((l) => (l.tenantName || l.unitLabel || "").trim()).map((l, i) => {
      const vac = !!l.vacant || !((l.tenantName || "").trim());
      return { period_id: periodId, unit_id: l.unitId || null, unit_label: l.unitLabel || "",
        tenant_name: l.tenantName || "", tenant_phone: l.tenantPhone || "",
        expected: vac ? 0 : (Number(l.expected) || 0), collected: vac ? 0 : (Number(l.collected) || 0),
        paid_at: vac ? null : (l.paidAt || null), charges: vac ? 0 : (Number(l.charges) || 0),
        comment: l.comment || "", position: i, vacant: vac };
    });
    const cPayload = charges.filter((c) => (c.label || "").trim()).map((c, i) => ({
      period_id: periodId, label: c.label, amount: Number(c.amount) || 0,
      observation: c.observation || "", position: i, kind: c.kind || "charge" }));
    let err = null;
    if (lPayload.length) { const { error } = await supabase.from("rent_lines").insert(lPayload); err = err || error; }
    if (cPayload.length) { const { error } = await supabase.from("rent_charges").insert(cPayload); err = err || error; }
    const [l, c] = await Promise.all([
      supabase.from("rent_lines").select("*").order("position"),
      supabase.from("rent_charges").select("*").order("position"),
    ]);
    if (l.data) setRentLines(l.data.map(mRLine));
    if (c.data) setRentCharges(c.data.map(mRCharge));
    return { error: err?.message };
  };
  const setPeriodStatus = async (id, status) => {
    setRentPeriods((p) => p.map((x) => (x.id === id ? { ...x, status } : x)));
    await supabase.from("rent_periods").update({ status }).eq("id", id);
  };

  /* ================= ACTIONS : TRANSPORT & PERMISSIONS ================= */
  const saveRequest = async (f) => {
    const row = { req_type: f.reqType, req_date: f.date, amount: Number(f.amount) || 0,
      destination: f.destination || "", transport_mode: f.mode || "taxi",
      property_id: f.propertyId || null, start_date: f.startDate || null, end_date: f.endDate || null,
      absence_type: f.absenceType || "personnelle", motif: f.motif || "" };
    if (f.id) {
      setRequests((p) => p.map((x) => (x.id === f.id ? { ...x, ...f } : x)));
      const { error } = await supabase.from("requests").update(row).eq("id", f.id);
      return { error: error?.message };
    }
    const { data, error } = await supabase.from("requests")
      .insert({ ...row, user_id: userId, status: "en_attente" }).select().single();
    if (data) setRequests((p) => (p.some((x) => x.id === data.id) ? p : [mReq(data), ...p]));
    return { error: error?.message, id: data?.id };
  };
  const decideRequest = async (id, status, note = "") => {
    setRequests((p) => p.map((x) => (x.id === id ? { ...x, status, decisionNote: note, decidedBy: userId } : x)));
    const { error } = await supabase.from("requests")
      .update({ status, decision_note: note, decided_by: userId, decided_at: new Date().toISOString() })
      .eq("id", id);
    return { error: error?.message };
  };
  const deleteRequest = async (id) => {
    setRequests((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from("requests").delete().eq("id", id);
    return { error: error?.message };
  };

  /* ================= ACTIONS : CAISSE ================= */
  const saveCashEntry = async (f) => {
    const row = { entry_date: f.date, direction: f.direction, amount: Number(f.amount) || 0,
      label: f.label || "", category: f.category, method: f.method,
      property_id: f.propertyId || null, owner_id: f.ownerId || null,
      reference: f.reference || "", notes: f.notes || "" };
    if (f.id) {
      setCashEntries((p) => p.map((x) => (x.id === f.id ? { ...x, ...f } : x)));
      const { error } = await supabase.from("cash_entries").update(row).eq("id", f.id);
      return { error: error?.message };
    }
    const { data, error } = await supabase.from("cash_entries")
      .insert({ ...row, created_by: userId }).select().single();
    if (data) setCashEntries((p) => (p.some((x) => x.id === data.id) ? p : [mCash(data), ...p]));
    return { error: error?.message, id: data?.id };
  };
  const deleteCashEntry = async (id) => {
    setCashEntries((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from("cash_entries").delete().eq("id", id);
    return { error: error?.message };
  };
  /* Remise du solde journalier : le gardien désigné devra la certifier */
  const createHandover = async (f) => {
    const { data, error } = await supabase.from("cash_handovers").insert({
      handover_date: f.date, amount: Number(f.amount) || 0,
      from_user: userId, to_user: f.toUser, note: f.note || "", status: "en_attente",
    }).select().single();
    if (data) setHandovers((p) => (p.some((x) => x.id === data.id) ? p : [mHandover(data), ...p]));
    return { error: error?.message };
  };
  const answerHandover = async (id, ok, responseNote = "") => {
    const row = { status: ok ? "approuve" : "conteste", approved_at: new Date().toISOString(), response_note: responseNote };
    setHandovers((p) => p.map((x) => (x.id === id ? { ...x, ...row, status: row.status, responseNote } : x)));
    const { error } = await supabase.from("cash_handovers").update(row).eq("id", id);
    return { error: error?.message };
  };

  /* ================= ACTIONS : DOSSIERS NUMÉRIQUES ================= */
  const uploadFolderFile = async (file, meta) => {
    if (!file) return { error: "Aucun fichier" };
    if (file.size > 20 * 1024 * 1024) return { error: "Fichier trop volumineux (20 Mo maximum)." };
    const safe = file.name.replace(/[^\w.\-]/g, "_");
    const folder = meta.unitId || meta.ownerId || meta.propertyId || "divers";
    const path = `${folder}/${Date.now()}-${safe}`;
    const up = await supabase.storage.from("dossiers").upload(path, file, { upsert: false });
    if (up.error) return { error: up.error.message };
    const { data: pub } = supabase.storage.from("dossiers").getPublicUrl(path);
    const { data, error } = await supabase.from("folder_files").insert({
      scope: meta.scope, unit_id: meta.unitId || null, owner_id: meta.ownerId || null,
      property_id: meta.propertyId || null, category: meta.category || "autre",
      label: meta.label || file.name, file_url: pub.publicUrl, file_name: file.name,
      file_type: file.type, file_size: file.size, uploaded_by: userId,
    }).select().single();
    if (data) setFolderFiles((p) => (p.some((x) => x.id === data.id) ? p : [mFolderFile(data), ...p]));
    return { error: error?.message };
  };
  const deleteFolderFile = async (id) => {
    setFolderFiles((p) => p.filter((f) => f.id !== id));
    const { error } = await supabase.from("folder_files").delete().eq("id", id);
    return { error: error?.message };
  };

  /* ---- Report d'une quittance validée dans le tableau de recouvrement ----
     Le montant est inscrit sur la ligne du locataire pour le mois quittancé.
     La saisie manuelle reste possible : on n'écrase jamais un encaissement
     déjà supérieur, et le tableau demeure entièrement modifiable. */
  const applyReceiptToRent = async (doc) => {
    if (!doc?.periodIso || !doc.propertyId) return { skipped: "période ou bien non précisé" };
    const period = rentPeriods.find((p) => p.propertyId === doc.propertyId
      && p.period === doc.periodIso && p.scope === "comptable");
    if (!period) return { skipped: `aucun état comptable pour ${doc.periodIso}` };

    const unit = units.find((u) => u.id === doc.unitId);
    const line = rentLines.find((l) => l.periodId === period.id
      && (l.unitId === doc.unitId
        || (unit && (l.unitLabel || "").toLowerCase() === (unit.label || "").toLowerCase())
        || (l.tenantName || "").toLowerCase() === (doc.clientName || "").toLowerCase()));
    const paidOn = doc.fields?.paidOn || doc.date;

    if (line) {
      const already = Number(line.collected) || 0;
      if (already >= Number(doc.total)) return { skipped: "encaissement déjà enregistré" };
      const { error } = await supabase.from("rent_lines")
        .update({ collected: Number(doc.total), paid_at: paidOn,
          comment: `Quittance ${doc.ref}` }).eq("id", line.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("rent_lines").insert({
        period_id: period.id, unit_id: doc.unitId || null,
        unit_label: unit?.label || "", tenant_name: doc.clientName || "",
        tenant_phone: doc.clientPhone || "", expected: unit?.rent || Number(doc.total),
        collected: Number(doc.total), paid_at: paidOn, charges: 0,
        comment: `Quittance ${doc.ref}`, position: 999,
      });
      if (error) return { error: error.message };
    }
    const { data } = await supabase.from("rent_lines").select("*").order("position");
    if (data) setRentLines(data.map(mRLine));
    return { ok: true };
  };

  /* Validation d'une quittance par un administrateur */
  const approveDocument = async (id, approve, note = "") => {
    const doc = documents.find((d) => d.id === id);
    const row = approve
      ? { approval: "approuve", paid_stamp: true, approved_by: userId,
          approved_at: new Date().toISOString(), approval_note: note,
          stamped_by: userId, stamped_at: new Date().toISOString() }
      : { approval: "refuse", paid_stamp: false, approved_by: userId,
          approved_at: new Date().toISOString(), approval_note: note };
    setDocuments((p) => p.map((d) => (d.id === id ? { ...d, ...(approve
      ? { approval: "approuve", paidStamp: true, approvedBy: userId, approvalNote: note }
      : { approval: "refuse", paidStamp: false, approvedBy: userId, approvalNote: note }) } : d)));
    const { error } = await supabase.from("documents").update(row).eq("id", id);
    if (error) return { error: error.message };
    if (approve && doc?.docType === "quittance") return await applyReceiptToRent(doc);
    return {};
  };

  /* ================= ACTIONS : PLAINTES ================= */
  const saveComplaint = async (f) => {
    const row = { property_id: f.propertyId || null, unit_id: f.unitId || null,
      tenant_name: f.tenantName || "", tenant_phone: f.tenantPhone || "",
      category: f.category, cause: f.cause, priority: f.priority, description: f.description || "",
      reported_at: f.reportedAt, channel: f.channel, status: f.status,
      assigned_to: f.assignedTo || null, quote_id: f.quoteId || null,
      cost: Number(f.cost) || 0, resolution: f.resolution || "", resolved_at: f.resolvedAt || null };
    if (f.id) {
      setComplaints((p) => p.map((x) => (x.id === f.id ? { ...x, ...f } : x)));
      const { error } = await supabase.from("complaints").update(row).eq("id", f.id);
      return { error: error?.message, id: f.id };
    }
    const { data, error } = await supabase.from("complaints").insert({ ...row, created_by: userId }).select().single();
    if (data) setComplaints((p) => (p.some((x) => x.id === data.id) ? p : [mComplaint(data), ...p]));
    return { error: error?.message, id: data?.id };
  };
  const deleteComplaint = async (id) => {
    setComplaints((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from("complaints").delete().eq("id", id);
    return { error: error?.message };
  };

  /* ================= ACTIONS : IMPÔT FONCIER ================= */
  const saveTaxRecord = async (f) => {
    const row = { property_id: f.propertyId || null, unit_id: f.unitId || null,
      custom_label: f.customLabel || "", owner_id: f.ownerId || null, owner_label: f.ownerLabel || "",
      tax_year: Number(f.taxYear), notice_number: f.noticeNumber || "",
      taxed_amount: Number(f.taxedAmount) || 0, installments: f.installments || [],
      receipts: f.receipts || "non", declaration_next: f.declarationNext || "non", notes: f.notes || "",
      ncc: f.ncc || "", declaration_date: f.declarationDate || null,
      next_base: f.nextBase ? Number(f.nextBase) : null };
    if (f.id) {
      setTaxRecords((p) => p.map((x) => (x.id === f.id ? { ...x, ...f } : x)));
      const { error } = await supabase.from("tax_records").update(row).eq("id", f.id);
      return { error: error?.message, id: f.id };
    }
    const { data, error } = await supabase.from("tax_records")
      .insert({ ...row, created_by: userId }).select().single();
    if (data) setTaxRecords((p) => (p.some((x) => x.id === data.id) ? p : [mTax(data), ...p]));
    return { error: error?.message, id: data?.id };
  };
  const deleteTaxRecord = async (id) => {
    setTaxRecords((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from("tax_records").delete().eq("id", id);
    return { error: error?.message };
  };

  /* ================= ACTIONS : DOCUMENTS ================= */
  const saveDocument = async (f) => {
    const total = (f.lines || []).reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);
    const row = {
      doc_type: f.docType, doc_date: f.date, property_id: f.propertyId || null, owner_id: f.ownerId || null,
      client_name: f.clientName || "", client_phone: f.clientPhone || "", client_email: f.clientEmail || "",
      client_addr: f.clientAddr || "", object: f.object || "", body: f.body || "",
      lines: f.lines || [], fields: f.fields || {}, total_amount: total,
      status: f.status || "brouillon", notes: f.notes || "",
      unit_id: f.unitId || null, period: f.period || "", period_iso: f.periodIso || "",
      approval: f.approval || "non_requise", direction: f.direction || "encaissement",
      paid_stamp: f.approval === "approuve" ? !!f.paidStamp : false,
      stamped_by: f.approval === "approuve" && f.paidStamp ? userId : null,
      stamped_at: f.approval === "approuve" && f.paidStamp ? new Date().toISOString() : null,
    };
    if (f.id) {
      const { error } = await supabase.from("documents").update(row).eq("id", f.id);
      if (!error) setDocuments((p) => p.map((d) => (d.id === f.id ? { ...d, ...f, total } : d)));
      return { error: error?.message, id: f.id };
    }
    const { data, error } = await supabase.from("documents").insert({ ...row, created_by: userId }).select().single();
    if (data) setDocuments((p) => p.some((x) => x.id === data.id) ? p : [mDoc(data), ...p]);
    return { error: error?.message, id: data?.id };
  };
  const setDocumentStatus = async (id, status) => {
    setDocuments((p) => p.map((d) => (d.id === id ? { ...d, status } : d)));
    await supabase.from("documents").update({ status }).eq("id", id);
  };
  const deleteDocument = async (id) => {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (!error) setDocuments((p) => p.filter((d) => d.id !== id));
    return { error: error?.message };
  };

  return {
    loading, departments, members, tasks, timeEntries, activeTimers, channels, channelMembers, messages,
    owners, properties, products, stockEntries, releases, releaseLines, quotes, quoteLines, templates, documents,
    units, rentPeriods, rentLines, rentCharges, requests, taxRecords, complaints, folderFiles,
    cashEntries, handovers,
    actions: {
      createTask, updateTask, deleteTask, startTimer, stopTimer, pauseTask, finishTask, addManualTime, deleteEntry,
      ensureDm, sendMessage, markRead, saveDept, deleteDept, updateProfile, adminUsers,
      saveOwner, deleteOwner, saveProperty, deleteProperty,
      saveProduct, deleteProduct, addStockEntry, saveRelease, deleteRelease,
      saveQuote, setQuoteStatus, deleteQuote,
      saveDocument, setDocumentStatus, deleteDocument,
      saveUnit, deleteUnit, bulkCreateUnits,
      savePeriod, deletePeriod, savePeriodContent, setPeriodStatus,
      saveRequest, decideRequest, deleteRequest,
      saveTaxRecord, deleteTaxRecord, saveComplaint, deleteComplaint, uploadAttachment,
      uploadFolderFile, deleteFolderFile, approveDocument, applyReceiptToRent,
      saveCashEntry, deleteCashEntry, createHandover, answerHandover, reload: load,
    },
  };
}

/* ══════════════════════════════════════════════════════════════════════
   PAGE DE CONNEXION
   ══════════════════════════════════════════════════════════════════════ */
const loginInputCls = "w-full px-3 py-2 rounded-lg border text-sm outline-none";
const loginInputStyle = { borderColor: "var(--line)" };

function Login() {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const submit = async () => {
    if (!u || !p) return;
    setBusy(true); setErr("");
    const email = `${u.trim().toLowerCase().replace(/\s/g, "")}@${AUTH_DOMAIN}`;
    const { error } = await supabase.auth.signInWithPassword({ email, password: p });
    setBusy(false);
    if (error) setErr("Identifiant ou mot de passe incorrect.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--ink)" }}>
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-6 pt-7 pb-5 text-center border-b" style={{ borderColor: "var(--line)" }}>
            <img src={LOGO} alt="Entreprise Kibegnon" className="h-16 w-auto mx-auto mb-3" />
            <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--ink)" }}>Suivi d'équipe</h1>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Connectez-vous à votre espace</p>
          </div>
          <div className="p-6">
            <label className="block mb-3">
              <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Identifiant</span>
              <div className="relative">
                <AtSign size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input className={loginInputCls + " pl-9"} style={loginInputStyle} value={u} autoFocus
                  onChange={(e) => { setU(e.target.value); setErr(""); }}
                  onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="votre identifiant" />
              </div>
            </label>
            <label className="block mb-3">
              <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Mot de passe</span>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input type={showPwd ? "text" : "password"} className={loginInputCls + " pl-9 pr-9"} style={loginInputStyle} value={p}
                  onChange={(e) => { setP(e.target.value); setErr(""); }}
                  onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••" />
                <button onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-2.5 text-slate-400">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            {err && <p className="text-xs text-red-600 mb-3 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
            <button onClick={submit} disabled={!u || !p || busy} className="kb-btn kb-btn-primary w-full justify-center disabled:opacity-40">
              <KeyRound size={16} /> {busy ? "Connexion…" : "Se connecter"}
            </button>
          </div>
        </div>
        <p className="text-center text-xs mt-4" style={{ color: "#7E8CA0" }}>Entreprise Kibegnon · Espace interne sécurisé</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODULE DOCUMENTS
   ══════════════════════════════════════════════════════════════════════ */
const lineTotal = (l) => (Number(l.qty) || 0) * (Number(l.price) || 0);
const linesTotal = (ls) => (ls || []).reduce((a, l) => a + lineTotal(l), 0);

/* ================= Éditeur de lignes (désignation / quantité / montant) ================= */
function LineEditor({ lines, setLines, labelPlaceholder = "Désignation de la prestation", showUnit = true }) {
  const setLine = (i, k, v) => setLines((p) => p.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const total = linesTotal(lines);
  return (
    <div>
      {/* En-têtes (desktop) */}
      <div className="hidden sm:grid gap-2 mb-1.5 px-1" style={{ gridTemplateColumns: showUnit ? "1fr 68px 68px 116px 116px 32px" : "1fr 68px 116px 116px 32px" }}>
        <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>Désignation</span>
        <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>Qté</span>
        {showUnit && <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>Unité</span>}
        <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>P. unitaire</span>
        <span className="text-[11px] font-medium text-right" style={{ color: "var(--muted)" }}>Montant</span>
        <span />
      </div>

      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="sm:grid flex flex-wrap gap-2 items-center rounded-lg sm:rounded-none p-2 sm:p-0"
            style={{ gridTemplateColumns: showUnit ? "1fr 68px 68px 116px 116px 32px" : "1fr 68px 116px 116px 32px" }}>
            <input className={inputCls + " w-full min-w-[140px] flex-1 sm:flex-none"} style={inputStyle} value={l.label}
              onChange={(e) => setLine(i, "label", e.target.value)} placeholder={labelPlaceholder} />
            <input type="number" min={0} step="any" className={inputCls + " w-16 sm:w-full"} style={inputStyle} value={l.qty}
              onChange={(e) => setLine(i, "qty", e.target.value)} placeholder="Qté" title="Quantité" />
            {showUnit && <input className={inputCls + " w-16 sm:w-full"} style={inputStyle} value={l.unit || ""}
              onChange={(e) => setLine(i, "unit", e.target.value)} placeholder="u" title="Unité" />}
            <input type="number" min={0} step={500} className={inputCls + " w-28 sm:w-full"} style={inputStyle} value={l.price}
              onChange={(e) => setLine(i, "price", e.target.value)} placeholder="Prix" title="Prix unitaire" />
            <div className="w-28 sm:w-full text-right px-2 py-2 rounded-lg text-sm font-semibold tabular-nums"
              style={{ background: "#F6F8FA", color: lineTotal(l) ? "var(--ink)" : "#B6BEC9" }}>{fcfa(lineTotal(l))}</div>
            <button onClick={() => setLines((p) => p.filter((_, j) => j !== i))}
              className="p-2 rounded-lg text-slate-300 hover:text-red-500 shrink-0"><X size={15} /></button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-2.5">
        <button onClick={() => setLines((p) => [...p, { label: "", qty: 1, unit: "u", price: 0 }])} className="kb-btn kb-btn-ghost text-sm">
          <Plus size={14} /> Ajouter une ligne
        </button>
        <div className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: "#F6F8FA" }}>
          <span className="text-sm font-medium">TOTAL</span>
          <span className="text-lg font-bold tabular-nums" style={{ color: "var(--brass)" }}>{fcfa(total)}</span>
        </div>
      </div>
      {total > 0 && <p className="text-[11px] mt-1.5 italic" style={{ color: "var(--muted)" }}>Arrêté à la somme de {amountInWords(total)}.</p>}
    </div>
  );
}

/* ================= Modale de saisie ================= */
function DocModal({ initial, properties, owners, units, isAdminUser, onSave, onClose }) {
  const cfg = DOC_TYPES[initial.docType];
  const defaultDirection = ["recu_charge"].includes(initial.docType) ? "decaissement"
    : ["relance", "courrier"].includes(initial.docType) ? "neutre" : "encaissement";
  const [f, setF] = useState(() => ({
    docType: initial.docType, date: isoDate(new Date()), direction: defaultDirection, propertyId: "", ownerId: "",
    clientName: "", clientPhone: "", clientEmail: "", clientAddr: "", object: "", body: "",
    fields: {}, status: "brouillon", notes: "", ...initial,
  }));
  const [lines, setLines] = useState(() => initial.lines?.length ? initial.lines : cfg.preset.map((l) => ({ ...l })));
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setField = (k, v) => setF((p) => ({ ...p, fields: { ...p.fields, [k]: v } }));

  const pickProperty = (id) => {
    const prop = properties.find((p) => p.id === id);
    setF((s) => ({ ...s, propertyId: id, ownerId: prop?.ownerId || s.ownerId }));
    /* Décompte d'entrée : pré-calcul depuis le loyer du bien */
    if (prop?.rent && f.docType === "decompte_entree") {
      const r = Number(prop.rent);
      setLines((ls) => ls.map((l) => {
        const t = l.label.toUpperCase();
        if (t.includes("AVANCE")) return { ...l, price: r * 2 };
        if (t.includes("CAUTION")) return { ...l, price: r * 2 };
        if (t.includes("AGENCE")) return { ...l, price: r };
        if (t.includes("FRAIS DE DOSSIER")) return { ...l, price: Math.round(r * 0.1) };
        return l;
      }));
    }
    if (prop?.rent && (f.docType === "quittance" || f.docType === "facture_impayes")) {
      setLines((ls) => ls.map((l) => (l.label.toLowerCase().includes("loyer") ? { ...l, price: Number(prop.rent) } : l)));
    }
  };

  const tenantOptions = useMemo(() => (units || [])
    .filter((u) => (u.tenantName || "").trim())
    .map((u) => {
      const p = properties.find((x) => x.id === u.propertyId);
      return { key: u.id, name: u.tenantName, phone: u.tenantPhone, email: u.tenantEmail,
        unitId: u.id, propertyId: u.propertyId, ownerId: p?.ownerId,
        detail: `${p?.name || ""} — ${u.label}` };
    }), [units, properties]);
  const ownerOptions = useMemo(() => owners.map((o) => ({ key: o.id, name: o.name, phone: o.phone,
    email: o.email, ownerId: o.id, detail: OWNER_KIND[o.kind] || "" })), [owners]);

  const total = linesTotal(lines);
  const isLetter = cfg.layout === "lettre";
  const isDecharge = cfg.layout === "decharge";
  const valid = f.clientName.trim();
  const submit = async () => {
    setBusy(true);
    const approval = (f.docType === "recu_charge" && f.paidStamp)
      ? (isAdminUser ? "approuve" : "en_attente")
      : (f.approval || "non_requise");
    const r = await onSave({ ...f, lines, approval });
    setBusy(false);
    if (r?.error) setErr(r.error); else onClose();
  };

  return (
    <Modal title={f.id ? `${cfg.label} ${f.ref || ""}` : cfg.label} onClose={onClose} wide>
      <div className="rounded-lg p-3 mb-4 text-xs" style={{ background: cfg.color + "12", color: cfg.color }}>
        {cfg.desc} · Département : <strong>{cfg.dept}</strong>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <PersonPicker label={cfg.clientLabel} hint="Choisissez un locataire connu ou saisissez un nom libre"
          value={f.clientName} options={tenantOptions} placeholder="Ex. Mme SAKOUA BADE"
          onPick={(v, hit) => setF((p) => ({ ...p, clientName: v,
            ...(hit ? { clientPhone: hit.phone || p.clientPhone, clientEmail: hit.email || p.clientEmail,
              unitId: hit.unitId, propertyId: hit.propertyId || p.propertyId, ownerId: hit.ownerId || p.ownerId } : {}) }))} />
        <Field label="Téléphone"><input className={inputCls} style={inputStyle} value={f.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} placeholder="+225 07 ..." /></Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Bien concerné" hint="Le propriétaire et le loyer sont repris automatiquement">
          <select className={inputCls} style={inputStyle} value={f.propertyId || ""} onChange={(e) => pickProperty(e.target.value)}>
            <option value="">— Aucun bien —</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}{p.commune ? ` · ${p.commune}` : ""}</option>)}
          </select>
        </Field>
        <Field label="Date du document"><input type="date" className={inputCls} style={inputStyle} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
      </div>

      <Field label="Objet"><input className={inputCls} style={inputStyle} value={f.object} onChange={(e) => set("object", e.target.value)} placeholder={f.docType === "decompte_entree" ? "Ex. DÉCOMPTE ENTRÉE APPARTEMENT DJOROGOBITÉ" : "Objet du document"} /></Field>

      {/* Champs spécifiques */}
      {f.docType === "quittance" && (
        <Field label="Mois quittancé" hint="Sert au report automatique dans le tableau de recouvrement">
          <input type="month" className={inputCls} style={inputStyle} value={f.periodIso || ""}
            onChange={(e) => {
              const iso = e.target.value;
              const [y, mo] = iso.split("-");
              setF((p) => ({ ...p, periodIso: iso, period: iso ? `${MONTHS_FR[Number(mo) - 1]} ${y}` : p.period }));
            }} />
        </Field>
      )}

      {(f.docType === "quittance" || f.docType === "facture_impayes") && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Période concernée"><input className={inputCls} style={inputStyle} value={f.fields.periode || ""} onChange={(e) => setField("periode", e.target.value)} placeholder="Ex. Janvier à Mars 2026" /></Field>
          {f.docType === "quittance" && <Field label="Date de règlement"><input type="date" className={inputCls} style={inputStyle} value={f.fields.paidOn || ""} onChange={(e) => setField("paidOn", e.target.value)} /></Field>}
          {f.docType === "facture_impayes" && <Field label="Échéance de paiement"><input type="date" className={inputCls} style={inputStyle} value={f.fields.dueDate || ""} onChange={(e) => setField("dueDate", e.target.value)} /></Field>}
        </div>
      )}

      {f.docType === "courrier" && (
        <Field label="Modèle de courrier" hint="Sert de point de départ, le texte reste modifiable">
          <select className={inputCls} style={inputStyle} value=""
            onChange={(e) => {
              const m = COURRIER_MODELS[e.target.value];
              if (m) setF((p) => ({ ...p, object: m.object || p.object, body: m.body }));
            }}>
            <option value="">— Choisir un modèle —</option>
            {Object.entries(COURRIER_MODELS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
        </Field>
      )}

      {isLetter && (
        <>
          <div className="grid sm:grid-cols-2 gap-3" style={{ display: f.docType === "courrier" ? "none" : undefined }}>
            <Field label="Ton du courrier">
              <select className={inputCls} style={inputStyle} value={f.fields.tone || "rappel"} onChange={(e) => setField("tone", e.target.value)}>
                {Object.entries(RELANCE_TONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Délai accordé (jours)"><input type="number" min={0} className={inputCls} style={inputStyle} value={f.fields.delay || 8} onChange={(e) => setField("delay", e.target.value)} /></Field>
          </div>
          <Field label="Corps du courrier" hint="Laissez vide pour utiliser le texte type généré automatiquement">
            <textarea className={inputCls} style={inputStyle} rows={5} value={f.body} onChange={(e) => set("body", e.target.value)} placeholder="Texte personnalisé du courrier…" />
          </Field>
        </>
      )}

      {isDecharge && (
        <div className="rounded-xl border p-3 mb-3" style={{ borderColor: "var(--line)", background: "#FAFBFC" }}>
          <p className="text-xs font-semibold mb-2">Identité du déclarant</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Agissant en qualité de"><input className={inputCls} style={inputStyle} value={f.fields.qualite || ""} onChange={(e) => setField("qualite", e.target.value)} placeholder="Ex. Gérant, mandataire, locataire…" /></Field>
            <Field label="Pour le compte de"><input className={inputCls} style={inputStyle} value={f.fields.pourCompte || ""} onChange={(e) => setField("pourCompte", e.target.value)} /></Field>
            <Field label="Demeurant à"><input className={inputCls} style={inputStyle} value={f.fields.demeurant || ""} onChange={(e) => setField("demeurant", e.target.value)} /></Field>
            <Field label="Type de pièce d'identité"><input className={inputCls} style={inputStyle} value={f.fields.pieceType || ""} onChange={(e) => setField("pieceType", e.target.value)} placeholder="CNI, passeport, attestation…" /></Field>
            <Field label="N° de la pièce"><input className={inputCls} style={inputStyle} value={f.fields.pieceNum || ""} onChange={(e) => setField("pieceNum", e.target.value)} /></Field>
            <Field label="Délivrée le"><input className={inputCls} style={inputStyle} value={f.fields.pieceDate || ""} onChange={(e) => setField("pieceDate", e.target.value)} placeholder="jj/mm/aaaa" /></Field>
            <Field label="Délivrée à"><input className={inputCls} style={inputStyle} value={f.fields.pieceLieu || ""} onChange={(e) => setField("pieceLieu", e.target.value)} /></Field>
            <Field label="Par (autorité)"><input className={inputCls} style={inputStyle} value={f.fields.pieceAutorite || ""} onChange={(e) => setField("pieceAutorite", e.target.value)} /></Field>
          </div>
          <Field label="Sens de l'opération">
            <div className="flex gap-2">
              {[["recu", "A REÇU des mains de l'agence"], ["verse", "A VERSÉ entre les mains de l'agence"]].map(([k, l]) => (
                <button key={k} onClick={() => setField("sens", k)} className="flex-1 py-2 rounded-lg text-xs font-medium"
                  style={{ background: f.fields.sens === k ? "#B91C1C" : "#fff", color: f.fields.sens === k ? "#fff" : "#B91C1C", border: "1px solid #B91C1C55" }}>{l}</button>
              ))}
            </div>
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Période / référence concernée"><input className={inputCls} style={inputStyle} value={f.fields.reference || ""} onChange={(e) => setField("reference", e.target.value)} placeholder="Ex. Loyer août 2026 — Appt A1" /></Field>
            <Field label="Fait à"><input className={inputCls} style={inputStyle} value={f.fields.faitA || "Abidjan"} onChange={(e) => setField("faitA", e.target.value)} /></Field>
          </div>
        </div>
      )}

      <p className="text-xs font-semibold mb-2 mt-1" style={{ color: "var(--ink)" }}>
        {isDecharge ? "Montant de la décharge" : isLetter ? "Sommes réclamées" : "Détail du document"}
      </p>
      <LineEditor lines={lines} setLines={setLines} showUnit={f.docType !== "decompte_entree"}
        labelPlaceholder={f.docType === "decompte_entree" ? "Ex. 2 MOIS D'AVANCE" : "Désignation"} />

      {f.docType === "recu_charge" && (
        <div className="rounded-xl border p-3 mb-3" style={{ borderColor: "#BAE6FD", background: "#F0F9FF" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: "#0369A1" }}>Règlement effectué par l'agence</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Date du règlement"><input type="date" className={inputCls} style={inputStyle} value={f.fields.paidOn || ""} onChange={(e) => setField("paidOn", e.target.value)} /></Field>
            <Field label="Moyen de paiement">
              <select className={inputCls} style={inputStyle} value={f.fields.mode || "Espèces"} onChange={(e) => setField("mode", e.target.value)}>
                {["Espèces", "Chèque", "Virement", "Mobile Money"].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Référence de la facture"><input className={inputCls} style={inputStyle} value={f.fields.reference || ""} onChange={(e) => setField("reference", e.target.value)} placeholder="Ex. Facture CIE n° 4478521 — compteur 021456" /></Field>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!f.paidStamp} onChange={(e) => set("paidStamp", e.target.checked)} />
            <span>Apposer la mention <strong style={{ color: STAMP_RED }}>PAYÉ</strong></span>
          </label>
          <p className="text-[11px] mt-1.5" style={{ color: "#0369A1" }}>
            Comme pour les quittances, le tampon n'apparaîtra qu'après validation par un administrateur.
          </p>
        </div>
      )}

      <button onClick={() => setMore((s) => !s)} className="flex items-center gap-1 text-xs font-medium mt-4 mb-2" style={{ color: "var(--brass)" }}>
        {more ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Coordonnées et options
      </button>
      {more && (
        <div className="rounded-lg border p-3 mb-3" style={{ borderColor: "var(--line)", background: "#FAFBFC" }}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="E-mail"><input className={inputCls} style={inputStyle} value={f.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} /></Field>
            <Field label="Adresse"><input className={inputCls} style={inputStyle} value={f.clientAddr} onChange={(e) => set("clientAddr", e.target.value)} /></Field>
            <Field label="Propriétaire (dossier)">
              <select className={inputCls} style={inputStyle} value={f.ownerId || ""} onChange={(e) => set("ownerId", e.target.value)}>
                <option value="">— Aucun —</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
            <Field label="Statut">
              <select className={inputCls} style={inputStyle} value={f.status} onChange={(e) => set("status", e.target.value)}>
                {DOC_STATUS_ORDER.map((k) => <option key={k} value={k}>{DOC_STATUS[k].label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Notes internes"><textarea className={inputCls} style={inputStyle} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        </div>
      )}

      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2 mt-3">
        <button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!valid || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> {busy ? "…" : "Enregistrer"}</button>
      </div>
    </Modal>
  );
}

/* ================= Texte type des relances ================= */
function relanceBody(doc, property) {
  const tone = doc.fields?.tone || "rappel";
  const delay = doc.fields?.delay || 8;
  const bien = property ? `le bien « ${property.name} »${property.commune ? ` sis à ${property.commune}` : ""}` : "le bien que vous occupez";
  const somme = `${fcfa(doc.total)} (${amountInWords(doc.total)})`;
  if (tone === "mise_en_demeure") {
    return `Madame, Monsieur,

Malgré nos précédentes relances demeurées sans effet, nous constatons que votre dette locative concernant ${bien} demeure impayée à ce jour, pour un montant total de ${somme}.

Par la présente, nous vous mettons formellement en demeure de régler l'intégralité de cette somme dans un délai de ${delay} jours à compter de la réception du présent courrier.

À défaut de règlement dans ce délai, nous nous verrons contraints, conformément aux stipulations du contrat de bail et aux dispositions légales en vigueur, d'engager toute procédure utile en recouvrement, sans nouvel avertissement.

Nous vous invitons vivement à régulariser votre situation afin d'éviter cette issue.

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.`;
  }
  if (tone === "relance") {
    return `Madame, Monsieur,

Sauf erreur ou omission de notre part, nous n'avons pas enregistré le règlement des sommes dues au titre de ${bien}, dont le montant s'élève à ce jour à ${somme}.

Un premier rappel vous a déjà été adressé et est resté sans réponse. Nous vous prions donc de bien vouloir procéder au règlement de cette somme sous ${delay} jours.

Si le paiement a été effectué entre-temps, nous vous remercions de nous transmettre le justificatif correspondant et de ne pas tenir compte du présent courrier.

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.`;
  }
  return `Madame, Monsieur,

Nous nous permettons d'attirer votre attention sur le fait que le règlement des sommes dues au titre de ${bien} ne nous est pas encore parvenu, pour un montant de ${somme}.

Il s'agit très probablement d'un simple oubli. Nous vous saurions gré de bien vouloir procéder à la régularisation de votre situation dans un délai de ${delay} jours.

Si le paiement a déjà été effectué, nous vous remercions de ne pas tenir compte de ce courrier.

Restant à votre disposition pour tout échange, veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.`;
}

/* ================= Fiche imprimable ================= */
function DocSheet({ doc, property, owner, author, onBack }) {
  const cfg = DOC_TYPES[doc.docType] || DOC_TYPES.courrier;
  if (cfg.layout === "decharge") return <DechargeSheet doc={doc} author={author} onBack={onBack} />;
  const st = DOC_STATUS[doc.status] || DOC_STATUS.brouillon;
  const isLetter = cfg.layout === "lettre";
  const body = doc.body?.trim() || (doc.docType === "relance" ? relanceBody(doc, property) : "");

  return (
    <div>
      <div className="flex items-center justify-between mb-3 print:hidden gap-2 flex-wrap">
        <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour aux documents</button>
        <button onClick={() => printSheet("portrait")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF</button>
      </div>

      <div id="print-area" className="bg-white rounded-xl border p-7 max-w-3xl mx-auto" style={{ borderColor: "var(--line)" }}>
        {/* En-tête */}
        <PrintHead title={doc.ref} extra={
          <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>Abidjan, le {fr(doc.date + "T00:00:00", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
        } />

        {/* Destinataire */}
        <div className="flex justify-end py-4">
          <div className="text-right">
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>À l'attention de</p>
            <p className="text-sm font-semibold">{doc.clientName}</p>
            {doc.clientAddr && <p className="text-xs" style={{ color: "var(--muted)" }}>{doc.clientAddr}</p>}
            {doc.clientPhone && <p className="text-xs" style={{ color: "var(--muted)" }}>{doc.clientPhone}</p>}
          </div>
        </div>

        {/* Titre */}
        <div className="text-center py-3">
          <h2 className="text-lg font-bold tracking-wide" style={{ color: "var(--ink)" }}>{cfg.title || (doc.docType === "courrier" ? "" : cfg.label)}</h2>
          {doc.object && <p className="text-sm font-semibold mt-1 uppercase">{doc.object}</p>}
          {doc.fields?.periode && <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Période : {doc.fields.periode}</p>}
        </div>

        {/* Bien concerné */}
        {property && (
          <p className="text-xs mb-3 pb-3 border-b" style={{ color: "var(--muted)", borderColor: "var(--line)" }}>
            <strong style={{ color: "var(--ink)" }}>Bien :</strong> {property.name}
            {property.quartier || property.commune ? ` — ${[property.quartier, property.commune].filter(Boolean).join(", ")}` : ""}

          </p>
        )}

        {/* Corps de lettre */}
        {isLetter && body && <p className="text-sm whitespace-pre-wrap leading-relaxed mb-5">{body}</p>}

        {/* Tableau */}
        {doc.lines?.length > 0 && (
          <table className="w-full text-sm mb-4">
            <thead><tr style={{ background: "#F1F3F5" }}>
              <th className="text-left px-3 py-2 font-semibold">DÉSIGNATIONS</th>
              {doc.docType !== "decompte_entree" && <th className="text-right px-2 py-2 font-semibold w-16">QTÉ</th>}
              {doc.docType !== "decompte_entree" && <th className="text-left px-2 py-2 font-semibold w-16">UNITÉ</th>}
              {doc.docType !== "decompte_entree" && <th className="text-right px-2 py-2 font-semibold w-28">P. UNITAIRE</th>}
              <th className="text-right px-3 py-2 font-semibold w-32">MONTANT</th>
            </tr></thead>
            <tbody>{doc.lines.filter((l) => (l.label || "").trim()).map((l, i) => (
              <tr key={i} className="border-b" style={{ borderColor: "var(--line)" }}>
                <td className="px-3 py-2">{l.label}</td>
                {doc.docType !== "decompte_entree" && <td className="px-2 py-2 text-right">{qty(l.qty)}</td>}
                {doc.docType !== "decompte_entree" && <td className="px-2 py-2">{l.unit}</td>}
                {doc.docType !== "decompte_entree" && <td className="px-2 py-2 text-right">{fcfa(l.price)}</td>}
                <td className="px-3 py-2 text-right font-medium tabular-nums">{fcfa(lineTotal(l))}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{ background: "#F1F3F5" }}>
              <td colSpan={doc.docType !== "decompte_entree" ? 4 : 1} className="px-3 py-2.5 font-bold">TOTAL À PAYER</td>
              <td className="px-3 py-2.5 text-right text-base font-bold tabular-nums" style={{ color: cfg.color }}>{fcfa(doc.total)}</td>
            </tr></tfoot>
          </table>
        )}

        {/* Arrêté en toutes lettres */}
        {doc.total > 0 && !isLetter && (
          <p className="text-sm italic mb-5">
            Arrêté{doc.docType === "quittance" ? "e" : ""} la présente {doc.docType === "quittance" ? "quittance" : "facture"} à la somme de <strong>{amountInWords(doc.total)}</strong>.
          </p>
        )}

        {doc.docType === "quittance" && (
          <p className="text-sm mb-5">
            Le présent document vaut quittance pour la période indiquée et libère le locataire de toute obligation de paiement à ce titre
            {doc.fields?.paidOn ? `, le règlement étant intervenu le ${fr(doc.fields.paidOn + "T00:00:00", { day: "numeric", month: "long", year: "numeric" })}` : ""}.
          </p>
        )}

        {doc.fields?.dueDate && doc.docType === "facture_impayes" && (
          <p className="text-sm mb-5" style={{ color: "#B5171D" }}>
            <strong>Règlement attendu au plus tard le {fr(doc.fields.dueDate + "T00:00:00", { day: "numeric", month: "long", year: "numeric" })}.</strong>
          </p>
        )}

        {/* Signatures */}
        <div className="flex justify-between items-end pt-8 mt-6">
          <div className="text-center" style={{ minWidth: 180 }}>
            <p className="text-xs font-semibold pb-24">Visa Client</p>
            <div className="border-t" style={{ borderColor: "var(--ink)" }} />
          </div>
          <div className="text-center" style={{ minWidth: 180 }}>
            <p className="text-xs font-semibold pb-24">Pour l'Agence</p>
            <div className="border-t" style={{ borderColor: "var(--ink)" }} />
            <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>Entreprise Kibegnon</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 mt-4 border-t" style={{ borderColor: "var(--line)" }}>
          <p className="text-[10px]" style={{ color: "var(--muted)" }}>Document établi par {author?.name || "—"}</p>
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold print:hidden" style={{ background: st.color + "1A", color: st.color }}>{st.label}</span>
        </div>
        <PrintFoot />
      </div>
    </div>
  );
}

/* ================= Vue principale ================= */
function Documents({ store, me }) {
  const { documents, properties, owners, members, actions } = store;
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [modal, setModal] = useState(null);
  const [sheetId, setSheetId] = useState(null);
  const [picker, setPicker] = useState(false);

  const propById = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p])), [properties]);
  const ownerById = useMemo(() => Object.fromEntries(owners.map((o) => [o.id, o])), [owners]);
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const sup = canSupervise(me.role);
  /* Quittances et décharges en attente de validation par un administrateur */
  const pendingApproval = documents.filter((d) => d.approval === "en_attente");

  const sheet = documents.find((d) => d.id === sheetId);
  if (sheet) {
    return <DocumentSheet doc={sheet} unit={store.units.find((u) => u.id === sheet.unitId)}
      property={propById[sheet.propertyId]} owner={ownerById[sheet.ownerId]}
      author={memberById[sheet.createdBy]} validator={memberById[sheet.approvedBy]}
      onBack={() => setSheetId(null)} />;
  }

  const list = documents.filter((d) =>
    (filterType === "all" || d.docType === filterType) &&
    (filterStatus === "all" || d.status === filterStatus) &&
    (!search || d.clientName.toLowerCase().includes(search.toLowerCase()) ||
      (d.ref || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.object || "").toLowerCase().includes(search.toLowerCase())));

  const regles = documents.filter((d) => d.status === "regle");
  const encaisse = regles.filter((d) => d.direction === "encaissement").reduce((a, d) => a + d.total, 0);
  const decaisse = regles.filter((d) => d.direction === "decaissement").reduce((a, d) => a + d.total, 0);
  const attente = documents.filter((d) => ["emis", "envoye"].includes(d.status));

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Documents</h1>
        <button onClick={() => setPicker(true)} className="kb-btn kb-btn-primary"><Plus size={16} /> Nouveau document</button>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Modèles types par département : décomptes d'entrée, prestations, impayés, quittances et relances — imprimables en PDF.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={FileText} label="Documents établis" value={documents.length} tint="var(--brass)" />
        <StatCard icon={ArrowDownToLine} label="Encaissé des clients" value={fcfa(encaisse)} sub="quittances, décomptes, prestations" tint="#4F9E2A" onClick={() => setFilterStatus("regle")} />
        <StatCard icon={ArrowUpFromLine} label="Déboursé par l'agence" value={fcfa(decaisse)} sub="charges, CIE, SODECI, artisans" tint="#D81F26" onClick={() => setFilterType("recu_charge")} />
        <StatCard icon={AlertTriangle} label="En attente de règlement" value={attente.length} sub={fcfa(attente.reduce((a, d) => a + d.total, 0))} tint="#EA580C" />
        <StatCard icon={Wallet} label="Solde des documents" value={fcfa(encaisse - decaisse)} sub={`${documents.filter((d) => d.status === "brouillon").length} brouillon(s)`} tint="var(--brass)" onClick={() => setFilterStatus("brouillon")} />
      </div>

      {/* Modèles disponibles */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-5">
        {DOC_TYPE_ORDER.map((k) => {
          const c = DOC_TYPES[k];
          const n = documents.filter((d) => d.docType === k).length;
          return (
            <button key={k} onClick={() => setModal({ docType: k })}
              className="bg-white rounded-xl border p-3 text-left hover:shadow-md transition-shadow" style={{ borderColor: "var(--line)" }}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: c.color + "1A", color: c.color }}>
                {c.layout === "lettre" ? <Mail size={16} /> : <FileSignature size={16} />}
              </span>
              <p className="text-sm font-semibold leading-tight">{c.short}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{c.dept}</p>
              <p className="text-[11px] mt-1" style={{ color: c.color }}>{n} établi{n > 1 ? "s" : ""}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[150px]">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Client, référence, objet…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Tous les modèles</option>
          {DOC_TYPE_ORDER.map((k) => <option key={k} value={k}>{DOC_TYPES[k].short}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Tous statuts</option>
          {DOC_STATUS_ORDER.map((k) => <option key={k} value={k}>{DOC_STATUS[k].label}</option>)}
        </select>
      </div>

      {pendingApproval.length > 0 && (
        <SectionCard title={`En attente de validation (${pendingApproval.length})`} icon={ShieldAlert} pad={false}>
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>
            {pendingApproval.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-4 py-3 gap-2 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.ref} · {d.clientName} · {d.period || "—"}</p>
                  <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                    {DOC_TYPES[d.docType]?.short} de {fcfa(d.total)} — établie par {memberById[d.createdBy]?.name || "—"}
                    {" le "}{fr(d.date + "T00:00:00", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => setSheetId(d.id)} className="kb-btn kb-btn-ghost text-xs"><Eye size={13} /> Vérifier</button>
                  {isAdmin(me.role) ? <>
                    <button onClick={async () => {
                      const r = await actions.approveDocument(d.id, true);
                      if (r?.error) alert(r.error);
                      else if (r?.skipped) alert(`Quittance validée. Report dans le recouvrement non effectué : ${r.skipped}.`);
                    }} className="kb-btn text-xs px-2.5 py-1.5" style={{ background: "#4F9E2A", color: "#fff" }}><ThumbsUp size={13} /> Valider</button>
                    <button onClick={async () => {
                      const note = prompt("Motif du refus :", "");
                      if (note !== null) await actions.approveDocument(d.id, false, note);
                    }} className="kb-btn text-xs px-2.5 py-1.5" style={{ background: "#fff", color: "#D81F26", border: "1px solid #D81F2655" }}><ThumbsDown size={13} /> Refuser</button>
                  </> : <Chip color="#C58A1B" dot>en attente</Chip>}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {list.length ? <div className="space-y-2">
        {list.map((d) => {
          const cfg = DOC_TYPES[d.docType] || DOC_TYPES.courrier; const st = DOC_STATUS[d.status] || DOC_STATUS.brouillon;
          const prop = propById[d.propertyId];
          return (
            <div key={d.id} className="bg-white rounded-xl border p-3 hover:shadow-md transition-shadow" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: cfg.color + "1A", color: cfg.color }}>{d.ref}</span>
                    <p className="text-sm font-semibold truncate">{d.object || cfg.label}</p>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                    <UserRound size={11} className="inline mb-0.5" /> <strong style={{ color: "var(--ink)" }}>{d.clientName}</strong>
                    {" · "}{cfg.short}{" · "}{fr(d.date + "T00:00:00", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  {prop && <div className="mt-2"><Chip color="#2E78A8"><Building2 size={10} /> {prop.name}</Chip></div>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    {d.approval === "approuve" && d.paidStamp && <Chip color={STAMP_RED} bg="#FDEAEA">PAYÉ</Chip>}
                    {d.approval === "en_attente" && <Chip color="#C58A1B" dot>à valider</Chip>}
                    {d.approval === "refuse" && <Chip color="#D81F26">refusée</Chip>}
                    {d.total > 0 && d.direction !== "neutre" && (
                      <Chip color={d.direction === "encaissement" ? "#4F9E2A" : "#D81F26"}>
                        {d.direction === "encaissement" ? "encaissé" : "déboursé"}
                      </Chip>
                    )}
                    <span className="text-base font-bold tabular-nums" style={{ color: cfg.color }}>{fcfa(d.total)}</span>
                  </div>
                  <select value={d.status} onChange={(e) => actions.setDocumentStatus(d.id, e.target.value)}
                    className="text-xs px-2 py-1 rounded-lg border bg-white" style={{ borderColor: st.color + "55", color: st.color }}>
                    {DOC_STATUS_ORDER.map((k) => <option key={k} value={k}>{DOC_STATUS[k].label}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <button onClick={() => setSheetId(d.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Imprimer / PDF"><Printer size={14} /></button>
                    <button onClick={() => setModal(d)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Modifier"><Pencil size={14} /></button>
                    {sup && <button onClick={async () => { if (confirm(`Supprimer le document ${d.ref} ?`)) await actions.deleteDocument(d.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div> : <EmptyState icon={FileText} title="Aucun document établi" sub="Choisissez un modèle ci-dessus pour créer votre premier document." />}

      {picker && (
        <Modal title="Choisir un modèle" onClose={() => setPicker(false)}>
          <div className="space-y-2">
            {DOC_TYPE_ORDER.map((k) => {
              const c = DOC_TYPES[k];
              return (
                <button key={k} onClick={() => { setPicker(false); setModal({ docType: k }); }}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border text-left hover:shadow-md transition-shadow" style={{ borderColor: "var(--line)" }}>
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.color + "1A", color: c.color }}>
                    {c.layout === "lettre" ? <Mail size={17} /> : <FileSignature size={17} />}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{c.label}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{c.desc}</p>
                    <p className="text-[11px] mt-1" style={{ color: c.color }}>{c.dept}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {modal && <DocModal initial={modal} properties={properties} owners={owners} units={store.units}
        isAdminUser={isAdmin(me.role)} onSave={actions.saveDocument} onClose={() => setModal(null)} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODULE DEVIS ARTISANS
   ══════════════════════════════════════════════════════════════════════ */
/* ---------------- Modale de saisie ---------------- */
function QuoteModal({ initial, initialLines, properties, owners, onSave, onClose }) {
  const [f, setF] = useState(() => ({
    artisanName: "", trade: "", phone: "", propertyId: "", ownerId: "", date: isoDate(new Date()),
    source: "whatsapp", object: "", status: "recu", notes: "", ...initial,
  }));
  const [lines, setLines] = useState(() => initialLines?.length ? initialLines : [{ label: "", qty: 1, unit: "u", price: 0 }]);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setLine = (i, k, v) => setLines((p) => p.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  /* auto-remplissage du propriétaire depuis le bien */
  const pickProperty = (id) => {
    const prop = properties.find((p) => p.id === id);
    setF((s) => ({ ...s, propertyId: id, ownerId: prop?.ownerId || s.ownerId }));
  };

  const total = lines.reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);
  const valid = f.artisanName.trim() && lines.some((l) => (l.label || "").trim());
  const submit = async () => { setBusy(true); const r = await onSave(f, lines); setBusy(false); if (r?.error) setErr(r.error); else onClose(); };

  return (
    <Modal title={f.id ? `Devis ${f.ref || ""}` : "Reproduire un devis artisan"} onClose={onClose} wide>
      <div className="rounded-lg p-3 mb-4 text-xs" style={{ background: "#F6F8FA", color: "var(--muted)" }}>
        Recopiez ici le devis reçu sur papier ou par WhatsApp. L'artisan reste l'auteur du devis : son nom est conservé comme <strong>paternité</strong>, et la fiche sert de justificatif au propriétaire.
      </div>

      <p className="text-xs font-semibold mb-2" style={{ color: "var(--ink)" }}>Auteur du devis</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Nom de l'artisan"><input className={inputCls} style={inputStyle} value={f.artisanName} autoFocus onChange={(e) => set("artisanName", e.target.value)} placeholder="Ex. M. TRAORÉ Ibrahim" /></Field>
        <Field label="Corps de métier">
          <input list="trades-list" className={inputCls} style={inputStyle} value={f.trade} onChange={(e) => set("trade", e.target.value)} placeholder="Plomberie…" />
          <datalist id="trades-list">{TRADES.map((t) => <option key={t} value={t} />)}</datalist>
        </Field>
        <Field label="Téléphone"><input className={inputCls} style={inputStyle} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+225 07 ..." /></Field>
      </div>

      <p className="text-xs font-semibold mb-2 mt-1" style={{ color: "var(--ink)" }}>Rattachement</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Bien concerné">
          <select className={inputCls} style={inputStyle} value={f.propertyId || ""} onChange={(e) => pickProperty(e.target.value)}>
            <option value="">— Non rattaché —</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Propriétaire (dossier)" hint="Rempli automatiquement depuis le bien">
          <select className={inputCls} style={inputStyle} value={f.ownerId || ""} onChange={(e) => set("ownerId", e.target.value)}>
            <option value="">— Non rattaché —</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Date du devis"><input type="date" className={inputCls} style={inputStyle} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
        <Field label="Reçu par"><select className={inputCls} style={inputStyle} value={f.source} onChange={(e) => set("source", e.target.value)}>{Object.entries(QUOTE_SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Statut"><select className={inputCls} style={inputStyle} value={f.status} onChange={(e) => set("status", e.target.value)}>{QUOTE_STATUS_ORDER.map((k) => <option key={k} value={k}>{QUOTE_STATUS[k].label}</option>)}</select></Field>
      </div>
      <Field label="Objet des travaux"><input className={inputCls} style={inputStyle} value={f.object} onChange={(e) => set("object", e.target.value)} placeholder="Ex. Réfection plomberie salle de bain 2e étage" /></Field>

      <p className="text-xs font-semibold mb-2 mt-1" style={{ color: "var(--ink)" }}>Détail du devis</p>
      <LineEditor lines={lines} setLines={setLines} labelPlaceholder="Ex. Fourniture et pose de robinetterie" />
      <div className="mb-3" />
      <Field label="Observations"><textarea className={inputCls} style={inputStyle} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Conditions, délai annoncé, garantie…" /></Field>
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!valid || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> {busy ? "…" : "Enregistrer le devis"}</button>
      </div>
    </Modal>
  );
}

/* ---------------- Fiche imprimable ---------------- */
function QuoteSheet({ quote, lines, property, owner, recorder, onBack }) {
  const st = QUOTE_STATUS[quote.status];
  return (
    <div>
      <div className="flex items-center justify-between mb-3 print:hidden gap-2 flex-wrap">
        <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour aux devis</button>
        <button onClick={() => printSheet("portrait")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF</button>
      </div>

      <div id="print-area" className="bg-white rounded-xl border p-6 max-w-3xl mx-auto" style={{ borderColor: "var(--line)" }}>
        <PrintHead title={quote.ref} subtitle="Fiche de devis artisan" extra={
          <p className="text-[11px]" style={{ color: "var(--muted)" }}>{fr(quote.date + "T00:00:00", { day: "numeric", month: "long", year: "numeric" })}</p>
        } />

        <div className="grid sm:grid-cols-2 gap-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: "var(--muted)" }}>Auteur du devis</p>
            <p className="text-sm font-semibold">{quote.artisanName}</p>
            {quote.trade && <p className="text-xs" style={{ color: "var(--muted)" }}>{quote.trade}</p>}
            {quote.phone && <p className="text-xs" style={{ color: "var(--muted)" }}>{quote.phone}</p>}
            <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>Devis transmis par : {QUOTE_SOURCE[quote.source]}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: "var(--muted)" }}>Dossier</p>
            {property && <p className="text-sm font-semibold">{property.name}</p>}
            {property && <p className="text-xs" style={{ color: "var(--muted)" }}>{[property.quartier, property.commune].filter(Boolean).join(", ")}</p>}
            {owner && <p className="text-xs mt-1">Propriétaire : <strong>{owner.name}</strong></p>}
            {!property && !owner && <p className="text-xs" style={{ color: "var(--muted)" }}>Non rattaché</p>}
          </div>
        </div>

        {quote.object && <div className="pb-3">
          <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: "var(--muted)" }}>Objet des travaux</p>
          <p className="text-sm">{quote.object}</p>
        </div>}

        <table className="w-full text-sm mb-4">
          <thead><tr style={{ background: "#F6F8FA" }}>
            <th className="text-left px-3 py-2 font-medium">Désignation</th>
            <th className="text-right px-2 py-2 font-medium w-16">Qté</th>
            <th className="text-left px-2 py-2 font-medium w-14">Unité</th>
            <th className="text-right px-2 py-2 font-medium w-28">P. unitaire</th>
            <th className="text-right px-3 py-2 font-medium w-28">Montant</th>
          </tr></thead>
          <tbody>{lines.map((l) => (
            <tr key={l.id} className="border-b" style={{ borderColor: "var(--line)" }}>
              <td className="px-3 py-2">{l.label}</td>
              <td className="px-2 py-2 text-right">{qty(l.qty)}</td>
              <td className="px-2 py-2">{l.unit}</td>
              <td className="px-2 py-2 text-right">{fcfa(l.price)}</td>
              <td className="px-3 py-2 text-right font-medium">{fcfa(l.qty * l.price)}</td>
            </tr>
          ))}</tbody>
          <tfoot><tr>
            <td colSpan={4} className="px-3 py-3 text-right font-semibold">TOTAL</td>
            <td className="px-3 py-3 text-right text-lg font-bold" style={{ color: "var(--brass)" }}>{fcfa(quote.total)}</td>
          </tr></tfoot>
        </table>

        {quote.total > 0 && <p className="text-sm italic mb-4">Arrêté le présent devis à la somme de <strong>{amountInWords(quote.total)}</strong>.</p>}

        {quote.notes && <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: "var(--muted)" }}>Observations</p>
          <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
        </div>}

        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--line)" }}>
          <div>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>Devis saisi par {recorder?.name || "—"}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>Document interne établi d'après le devis original de l'artisan, conservé au dossier du propriétaire.</p>
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: st.color + "1A", color: st.color }}>{st.label}</span>
        </div>
        <PrintFoot />
      </div>
    </div>
  );
}

/* ---------------- Vue principale ---------------- */
function Devis({ store, me }) {
  const { quotes, quoteLines, properties, owners, members, actions } = store;
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProp, setFilterProp] = useState("all");
  const [modal, setModal] = useState(null);
  const [sheetId, setSheetId] = useState(null);

  const propById = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p])), [properties]);
  const ownerById = useMemo(() => Object.fromEntries(owners.map((o) => [o.id, o])), [owners]);
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const sup = canSupervise(me.role);

  const sheet = quotes.find((q) => q.id === sheetId);
  if (sheet) {
    return <QuoteSheet quote={sheet} lines={quoteLines.filter((l) => l.quoteId === sheet.id)}
      property={propById[sheet.propertyId]} owner={ownerById[sheet.ownerId]}
      recorder={memberById[sheet.recordedBy]} onBack={() => setSheetId(null)} />;
  }

  const list = quotes.filter((q) =>
    (filterStatus === "all" || q.status === filterStatus) &&
    (filterProp === "all" || q.propertyId === filterProp) &&
    (!search || q.artisanName.toLowerCase().includes(search.toLowerCase()) ||
      (q.object || "").toLowerCase().includes(search.toLowerCase()) ||
      (q.ref || "").toLowerCase().includes(search.toLowerCase()) ||
      (q.trade || "").toLowerCase().includes(search.toLowerCase())));

  const engaged = quotes.filter((q) => ["valide", "execute", "paye"].includes(q.status)).reduce((a, q) => a + q.total, 0);
  const pending = quotes.filter((q) => ["recu", "en_validation"].includes(q.status));

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Devis artisans</h1>
        <button onClick={() => setModal({})} className="kb-btn kb-btn-primary"><Plus size={16} /> Nouveau devis</button>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Recopiez les devis reçus sur papier ou par WhatsApp : chaque fiche conserve la paternité de l'artisan et sert de preuve de dépense au dossier du propriétaire.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={FileText} label="Devis enregistrés" value={quotes.length} tint="var(--brass)" />
        <StatCard icon={Wallet} label="Dépenses engagées" value={fcfa(engaged)} sub="validés, exécutés, payés" tint="#4F9E2A" />
        <StatCard icon={AlertTriangle} label="En attente de décision" value={pending.length} sub={fcfa(pending.reduce((a, q) => a + q.total, 0))} tint="#EA580C" />
        <StatCard icon={Hammer} label="Artisans sollicités" value={new Set(quotes.map((q) => q.artisanName.toLowerCase())).size} tint="#2E78A8" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Artisan, objet, référence…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Tous statuts</option>
          {QUOTE_STATUS_ORDER.map((k) => <option key={k} value={k}>{QUOTE_STATUS[k].label}</option>)}
        </select>
        <select value={filterProp} onChange={(e) => setFilterProp(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Tous les biens</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {list.length ? <div className="space-y-2">
        {list.map((q) => {
          const st = QUOTE_STATUS[q.status]; const prop = propById[q.propertyId]; const own = ownerById[q.ownerId];
          return (
            <div key={q.id} className="bg-white rounded-xl border p-3 hover:shadow-md transition-shadow" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: "#F1F3F5", color: "var(--muted)" }}>{q.ref}</span>
                    <p className="text-sm font-semibold truncate">{q.object || "Travaux non précisés"}</p>
                  </div>
                  <p className="text-xs mt-1 flex items-center gap-1 flex-wrap" style={{ color: "var(--muted)" }}>
                    <BadgeCheck size={12} style={{ color: "var(--brass)" }} />
                    <strong style={{ color: "var(--ink)" }}>{q.artisanName}</strong>
                    {q.trade && <span>· {q.trade}</span>}
                    <span>· {QUOTE_SOURCE[q.source]}</span>
                    <span>· {fr(q.date + "T00:00:00", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {prop && <Chip color="#2E78A8"><Building2 size={10} /> {prop.name}</Chip>}
                    {own && <Chip color="#DB2777"><UserRound size={10} /> {own.name}</Chip>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-base font-bold" style={{ color: "var(--brass)" }}>{fcfa(q.total)}</span>
                  <select value={q.status} onChange={(e) => actions.setQuoteStatus(q.id, e.target.value)}
                    className="text-xs px-2 py-1 rounded-lg border bg-white" style={{ borderColor: st.color + "55", color: st.color }}>
                    {QUOTE_STATUS_ORDER.map((k) => <option key={k} value={k}>{QUOTE_STATUS[k].label}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <button onClick={() => setSheetId(q.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Voir la fiche imprimable"><Printer size={14} /></button>
                    <button onClick={() => setModal({ ...q, _lines: quoteLines.filter((l) => l.quoteId === q.id) })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Modifier"><Pencil size={14} /></button>
                    {sup && <button onClick={async () => { if (confirm(`Supprimer le devis ${q.ref} ?`)) await actions.deleteQuote(q.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div> : <EmptyState icon={FileText} title="Aucun devis enregistré"
        sub="Recopiez ici les devis papier ou WhatsApp de vos artisans."
        action={<button onClick={() => setModal({})} className="kb-btn kb-btn-primary"><Plus size={15} /> Nouveau devis</button>} />}

      {modal && <QuoteModal initial={modal} initialLines={modal._lines} properties={properties} owners={owners}
        onSave={actions.saveQuote} onClose={() => setModal(null)} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODULE PATRIMOINE (biens, lots, vacants)
   ══════════════════════════════════════════════════════════════════════ */
/* ---------------- Modale propriétaire ---------------- */
function OwnerModal({ initial, onSave, onClose }) {
  const [f, setF] = useState(() => ({ name: "", kind: "particulier", phone: "", email: "", address: "", idNumber: "", notes: "", active: true, ...initial }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => { setBusy(true); const r = await onSave(f); setBusy(false); if (r?.error) setErr(r.error); else onClose(); };
  return (
    <Modal title={f.id ? "Modifier le propriétaire" : "Nouveau propriétaire"} onClose={onClose}>
      <Field label="Nom / Raison sociale"><input className={inputCls} style={inputStyle} value={f.name} autoFocus onChange={(e) => set("name", e.target.value)} placeholder="Ex. M. KOUAMÉ Yao" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Qualité"><select className={inputCls} style={inputStyle} value={f.kind} onChange={(e) => set("kind", e.target.value)}>{Object.entries(OWNER_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Téléphone"><input className={inputCls} style={inputStyle} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+225 07 ..." /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="E-mail"><input className={inputCls} style={inputStyle} value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="N° CNI / RCCM"><input className={inputCls} style={inputStyle} value={f.idNumber} onChange={(e) => set("idNumber", e.target.value)} /></Field>
      </div>
      <Field label="Adresse"><input className={inputCls} style={inputStyle} value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>
      <Field label="Notes"><textarea className={inputCls} style={inputStyle} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!f.name.trim() || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> Enregistrer</button></div>
    </Modal>
  );
}

/* ---------------- Modale bien (avec lots) ---------------- */
function PropertyModal({ initial, owners, members, units, onSave, onSaveUnits, onClose, onNewOwner }) {
  const [f, setF] = useState(() => ({
    ref: "", name: "", kind: "immeuble", address: "", commune: "Cocody", quartier: "", ownerId: "",
    lotsCount: 1, surface: "", rent: "", mandate: "gestion", status: "actif", notes: "",
    agentId: "", salePrice: "", availableFor: "aucun", ...initial,
  }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const isMulti = f.kind === "immeuble";
  const [lots, setLots] = useState(() => (initial?.id ? units.filter((u) => u.propertyId === initial.id).map((u) => ({ ...u })) : []));
  const [gen, setGen] = useState({ prefix: "Appt A", count: 4, kind: "appartement", rent: "", rooms: "" });

  const setLot = (i, k, v) => setLots((p) => p.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const addLot = () => setLots((p) => [...p, { label: "", kind: isMulti ? "appartement" : (f.kind === "villa" ? "villa" : "appartement"), rent: f.rent || 0, status: "vacant", tenantName: "" }]);
  const generate = () => {
    const n = Math.max(1, Math.min(60, Number(gen.count) || 1));
    setLots((p) => [...p, ...Array.from({ length: n }, (_, i) => ({
      label: `${gen.prefix}${i + 1}`, kind: gen.kind, rent: Number(gen.rent) || Number(f.rent) || 0,
      rooms: gen.rooms ? Number(gen.rooms) : null, status: "vacant", tenantName: "",
    }))]);
  };

  const submit = async () => {
    setBusy(true);
    const r = await onSave({ ...f, lotsCount: isMulti ? Math.max(lots.length, 1) : 1 });
    if (r?.error) { setBusy(false); setErr(r.error); return; }
    const pid = f.id || r.id;
    if (pid) await onSaveUnits(pid, lots);
    setBusy(false); onClose();
  };

  return (
    <Modal title={f.id ? "Modifier le bien" : "Nouveau bien"} onClose={onClose} wide>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Désignation du bien"><input className={inputCls} style={inputStyle} value={f.name} autoFocus onChange={(e) => set("name", e.target.value)} placeholder="Ex. Résidence TIA" /></Field>
        <Field label="Référence interne"><input className={inputCls} style={inputStyle} value={f.ref} onChange={(e) => set("ref", e.target.value)} placeholder="KB-001" /></Field>
        <Field label="Type de bien" hint="Immeuble = plusieurs lots">
          <select className={inputCls} style={inputStyle} value={f.kind} onChange={(e) => set("kind", e.target.value)}>
            {Object.entries(PROPERTY_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Commune"><select className={inputCls} style={inputStyle} value={f.commune} onChange={(e) => set("commune", e.target.value)}>{COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
        <Field label="Quartier"><input className={inputCls} style={inputStyle} value={f.quartier} onChange={(e) => set("quartier", e.target.value)} placeholder="Ex. Danga" /></Field>
        <Field label="Adresse / repère"><input className={inputCls} style={inputStyle} value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Propriétaire">
          <div className="flex gap-2">
            <select className={inputCls} style={inputStyle} value={f.ownerId || ""} onChange={(e) => set("ownerId", e.target.value)}>
              <option value="">— Non renseigné —</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <button onClick={onNewOwner} className="kb-btn kb-btn-ghost shrink-0" title="Créer un propriétaire"><Plus size={15} /></button>
          </div>
        </Field>
        <Field label="Agent / commercial en charge">
          <select className={inputCls} style={inputStyle} value={f.agentId || ""} onChange={(e) => set("agentId", e.target.value)}>
            <option value="">— Non attribué —</option>
            {members.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-4 gap-3">
        <Field label="Surface (m²)"><input type="number" min={0} className={inputCls} style={inputStyle} value={f.surface} onChange={(e) => set("surface", e.target.value)} /></Field>
        <Field label={isMulti ? "Loyer type d'un lot" : "Loyer mensuel (FCFA)"}><input type="number" min={0} step={5000} className={inputCls} style={inputStyle} value={f.rent} onChange={(e) => set("rent", e.target.value)} /></Field>
        <Field label="Prix de vente (FCFA)"><input type="number" min={0} step={100000} className={inputCls} style={inputStyle} value={f.salePrice} onChange={(e) => set("salePrice", e.target.value)} /></Field>
        <Field label="Statut"><select className={inputCls} style={inputStyle} value={f.status} onChange={(e) => set("status", e.target.value)}>{Object.entries(PROPERTY_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Type de mandat"><select className={inputCls} style={inputStyle} value={f.mandate} onChange={(e) => set("mandate", e.target.value)}>{Object.entries(MANDATE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Disponibilité commerciale" hint="Alimente le tableau des biens vacants">
          <select className={inputCls} style={inputStyle} value={f.availableFor} onChange={(e) => set("availableFor", e.target.value)}>
            {Object.entries(AVAILABLE_FOR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>

      <div className="rounded-xl border p-3 mb-3" style={{ borderColor: "var(--line)", background: "#FAFBFC" }}>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <p className="text-xs font-semibold flex items-center gap-1.5"><Layers size={13} style={{ color: "var(--brass)" }} />
            {isMulti ? "Lots de l'immeuble (appartements, magasins…)" : "Lot unique (facultatif)"}
            <span className="font-normal" style={{ color: "var(--muted)" }}>— pièces = chambres + salons</span>
          </p>
          <button onClick={addLot} className="kb-btn kb-btn-ghost text-xs"><Plus size={12} /> Ajouter un lot</button>
        </div>

        {isMulti && (
          <div className="flex flex-wrap items-end gap-2 mb-3 pb-3 border-b" style={{ borderColor: "var(--line)" }}>
            <div><span className="block text-[11px] mb-1" style={{ color: "var(--muted)" }}>Préfixe</span>
              <input className="px-2 py-1.5 rounded border text-xs w-28" style={inputStyle} value={gen.prefix} onChange={(e) => setGen((p) => ({ ...p, prefix: e.target.value }))} /></div>
            <div><span className="block text-[11px] mb-1" style={{ color: "var(--muted)" }}>Nombre</span>
              <input type="number" min={1} max={60} className="px-2 py-1.5 rounded border text-xs w-16" style={inputStyle} value={gen.count} onChange={(e) => setGen((p) => ({ ...p, count: e.target.value }))} /></div>
            <div><span className="block text-[11px] mb-1" style={{ color: "var(--muted)" }}>Type</span>
              <select className="px-2 py-1.5 rounded border text-xs" style={inputStyle} value={gen.kind} onChange={(e) => setGen((p) => ({ ...p, kind: e.target.value }))}>
                {Object.entries(UNIT_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            <div><span className="block text-[11px] mb-1" style={{ color: "var(--muted)" }}>Pièces</span>
              <input type="number" min={0} max={20} className="px-2 py-1.5 rounded border text-xs w-16" style={inputStyle} value={gen.rooms} onChange={(e) => setGen((p) => ({ ...p, rooms: e.target.value }))} placeholder="3" /></div>
            <div><span className="block text-[11px] mb-1" style={{ color: "var(--muted)" }}>Loyer</span>
              <input type="number" min={0} step={5000} className="px-2 py-1.5 rounded border text-xs w-24" style={inputStyle} value={gen.rent} onChange={(e) => setGen((p) => ({ ...p, rent: e.target.value }))} placeholder={f.rent || "0"} /></div>
            <button onClick={generate} className="kb-btn kb-btn-ghost text-xs">Générer la série</button>
          </div>
        )}

        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {lots.map((l, i) => (
            <div key={i} className="flex flex-wrap gap-1.5 items-center">
              <input className="px-2 py-1.5 rounded border text-xs w-24" style={inputStyle} value={l.label} onChange={(e) => setLot(i, "label", e.target.value)} placeholder="Appt A1" />
              <select className="px-2 py-1.5 rounded border text-xs w-28" style={inputStyle} value={l.kind} onChange={(e) => setLot(i, "kind", e.target.value)}>
                {Object.entries(UNIT_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="number" min={0} max={20} className="px-2 py-1.5 rounded border text-xs w-16 text-center" style={inputStyle} value={l.rooms ?? ""} onChange={(e) => setLot(i, "rooms", e.target.value)} title="Nombre de pièces (chambres + salons)" placeholder="pièces" />
              <input type="number" min={0} step={5000} className="px-2 py-1.5 rounded border text-xs w-24 text-right" style={inputStyle} value={l.rent} onChange={(e) => setLot(i, "rent", e.target.value)} title="Loyer" />
              <select className="px-2 py-1.5 rounded border text-xs w-24" style={inputStyle} value={l.status} onChange={(e) => setLot(i, "status", e.target.value)}>
                {Object.entries(UNIT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <input className="px-2 py-1.5 rounded border text-xs flex-1 min-w-[110px]" style={inputStyle} value={l.tenantName || ""} onChange={(e) => setLot(i, "tenantName", e.target.value)} placeholder="Locataire (si occupé)" />
              <button onClick={() => setLots((p) => p.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500 px-1"><X size={14} /></button>
            </div>
          ))}
          {lots.length === 0 && <p className="text-xs text-center py-3" style={{ color: "#B6BEC9" }}>Aucun lot. {isMulti ? "Générez la série ou ajoutez-les un par un." : "Facultatif pour une villa ou un appartement indépendant."}</p>}
        </div>
        {lots.length > 0 && <p className="text-[11px] mt-2" style={{ color: "var(--muted)" }}>
          {lots.length} lot(s) · {lots.filter((l) => l.status === "vacant").length} vacant(s) · loyer cumulé {fcfa(lots.reduce((a, l) => a + (Number(l.rent) || 0), 0))}
        </p>}
      </div>

      <Field label="Notes"><textarea className={inputCls} style={inputStyle} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!f.name.trim() || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> {busy ? "…" : "Enregistrer"}</button></div>
    </Modal>
  );
}

/* ---------------- Registre imprimable ---------------- */
function Register({ title, subtitle, columns, rows, onBack, footer }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3 print:hidden gap-2 flex-wrap">
        <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour</button>
        <button onClick={() => printSheet("landscape")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF (paysage)</button>
      </div>
      <div id="print-area" className="bg-white rounded-xl border p-6" style={{ borderColor: "var(--line)" }}>
        <PrintHead title={title} subtitle={subtitle} extra={
          <p className="text-[11px]" style={{ color: "var(--muted)" }}>Édité le {fr(new Date(), { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
        } />
        <table className="w-full text-[11px] mt-4">
          <thead><tr style={{ background: "#F1F3F5" }}>
            {columns.map((c, i) => <th key={i} className={`px-2 py-1.5 font-semibold ${c.right ? "text-right" : "text-left"}`}>{c.label}</th>)}
          </tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={i} className="border-b" style={{ borderColor: "var(--line)" }}>
              {columns.map((c, j) => <td key={j} className={`px-2 py-1.5 ${c.right ? "text-right tabular-nums" : ""}`}>{c.render(r)}</td>)}
            </tr>
          ))}</tbody>
        </table>
        {rows.length === 0 && <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>Aucune ligne.</p>}
        {footer && <div className="mt-4 pt-3 border-t text-xs" style={{ borderColor: "var(--line)" }}>{footer}</div>}
        <PrintFoot />
      </div>
    </div>
  );
}

/* ---------------- Fiche d'un bien ---------------- */
function PropertyDetail({ property, owner, agent, units, tasks, quotes, releases, releaseLines, products, members, onBack, onEdit }) {
  const pUnits = units.filter((u) => u.propertyId === property.id);
  const pTasks = tasks.filter((t) => t.propertyId === property.id);
  const pQuotes = quotes.filter((q) => q.propertyId === property.id);
  const pReleases = releases.filter((r) => r.propertyId === property.id);
  const productById = Object.fromEntries(products.map((p) => [p.id, p]));
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

  const depQuotes = pQuotes.filter((q) => ["valide", "execute", "paye"].includes(q.status)).reduce((a, q) => a + q.total, 0);
  const consoValue = pReleases.reduce((a, r) => a + releaseLines.filter((l) => l.releaseId === r.id).reduce((s, l) => s + l.qty * l.price, 0), 0);
  const rentTotal = pUnits.length ? pUnits.reduce((a, u) => a + u.rent, 0) : (property.rent || 0);
  const occupied = pUnits.filter((u) => u.status === "occupe").length;
  const st = PROPERTY_STATUS[property.status];

  return (
    <div>
      <button onClick={onBack} className="kb-btn kb-btn-ghost mb-3 text-sm"><ArrowLeft size={15} /> Retour aux biens</button>
      <div className="bg-white rounded-xl border p-4 mb-4" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{property.name}</h1>
              <Chip color={st.color} dot>{st.label}</Chip>
              {property.ref && <Chip color="#64748B">{property.ref}</Chip>}
              {property.availableFor !== "aucun" && <Chip color="#EA580C">{AVAILABLE_FOR[property.availableFor]}</Chip>}
            </div>
            <p className="text-sm mt-1 flex items-center gap-1" style={{ color: "var(--muted)" }}>
              <MapPin size={13} /> {[property.quartier, property.commune].filter(Boolean).join(", ") || "Localisation non renseignée"} · {PROPERTY_KIND[property.kind]}
              {pUnits.length > 0 && ` · ${pUnits.length} lot(s)`}
            </p>
            <div className="flex flex-wrap gap-3 mt-1.5 text-sm">
              {owner && <span className="flex items-center gap-1"><UserRound size={13} style={{ color: "var(--brass)" }} /> {owner.name}</span>}
              {agent && <span className="flex items-center gap-1"><BadgeCheck size={13} style={{ color: "#2E78A8" }} /> {agent.name}</span>}
            </div>
          </div>
          <button onClick={() => onEdit(property)} className="kb-btn kb-btn-ghost"><Pencil size={15} /> Modifier</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Wallet} label="Loyer mensuel cumulé" value={rentTotal ? fcfa(rentTotal) : "—"} sub={pUnits.length ? `${occupied}/${pUnits.length} occupé(s)` : undefined} tint="#4F9E2A" />
        <StatCard icon={FileText} label="Dépenses artisans" value={fcfa(depQuotes)} sub={`${pQuotes.length} devis`} tint="var(--brass)" />
        <StatCard icon={SprayCan} label="Produits consommés" value={fcfa(consoValue)} sub={`${pReleases.length} sorties`} tint="#7C3AED" />
        <StatCard icon={ListChecks} label="Tâches ouvertes" value={pTasks.filter((t) => t.status !== "termine").length} tint="#2E78A8" />
      </div>

      {pUnits.length > 0 && (
        <SectionCard title={`Lots (${pUnits.length})`} icon={Layers} pad={false}>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left" style={{ color: "var(--muted)" }}>
              <th className="px-4 py-2.5 font-medium">Lot</th><th className="px-3 py-2.5 font-medium">Type</th>
              <th className="px-3 py-2.5 font-medium">Pièces</th>
              <th className="px-3 py-2.5 font-medium">Locataire</th><th className="px-3 py-2.5 font-medium">Loyer</th>
              <th className="px-3 py-2.5 font-medium">Avance</th>
              <th className="px-3 py-2.5 font-medium">Statut</th></tr></thead>
            <tbody>{pUnits.map((u) => {
              const us = UNIT_STATUS[u.status];
              return <tr key={u.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                <td className="px-4 py-2.5 font-medium">{u.label}</td>
                <td className="px-3 py-2.5">{UNIT_KIND[u.kind]}</td>
                <td className="px-3 py-2.5">{u.rooms ? `${u.rooms} pièce${u.rooms > 1 ? "s" : ""}` : <span style={{ color: "var(--muted)" }}>—</span>}</td>
                <td className="px-3 py-2.5" style={{ color: u.tenantName ? "var(--ink)" : "var(--muted)" }}>{u.tenantName || "—"}</td>
                <td className="px-3 py-2.5 tabular-nums">{fcfa(u.rent)}</td>
                <td className="px-3 py-2.5">{Number(u.advanceMonths) > 0
                  ? <Chip color="#2E78A8">{u.advanceMonths} mois</Chip>
                  : <span className="text-xs" style={{ color: "var(--muted)" }}>—</span>}</td>
                <td className="px-3 py-2.5"><Chip color={us.color} dot>{us.label}</Chip></td>
              </tr>;
            })}</tbody>
          </table></div>
        </SectionCard>
      )}

      <SectionCard title="Devis artisans rattachés" icon={FileText} pad={false}>
        {pQuotes.length ? <div className="divide-y" style={{ borderColor: "var(--line)" }}>
          {pQuotes.map((q) => <div key={q.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
            <div className="min-w-0"><p className="text-sm font-medium truncate">{q.object || q.artisanName}</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>{q.ref} · {q.artisanName} · {fr(q.date + "T00:00:00", { day: "numeric", month: "short", year: "numeric" })}</p></div>
            <div className="flex items-center gap-2 shrink-0"><span className="text-sm font-semibold">{fcfa(q.total)}</span>
              <Chip color={QUOTE_STATUS[q.status].color}>{QUOTE_STATUS[q.status].label}</Chip></div>
          </div>)}
        </div> : <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>Aucun devis rattaché.</p>}
      </SectionCard>

      <SectionCard title="Sorties de matériel" icon={SprayCan} pad={false}>
        {pReleases.length ? <div className="divide-y" style={{ borderColor: "var(--line)" }}>
          {pReleases.map((r) => {
            const lines = releaseLines.filter((l) => l.releaseId === r.id);
            return <div key={r.id} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{r.ref} · {r.zone || "Zone non précisée"}</p>
                <span className="text-xs" style={{ color: "var(--muted)" }}>{fr(r.date + "T00:00:00", { day: "numeric", month: "short" })}</span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{lines.map((l) => `${productById[l.productId]?.name || "?"} ×${qty(l.qty)}`).join(" · ") || "Aucun produit"}</p>
            </div>;
          })}
        </div> : <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>Aucune sortie enregistrée.</p>}
      </SectionCard>

      <SectionCard title="Tâches liées" icon={ListChecks} pad={false}>
        {pTasks.length ? <div className="divide-y" style={{ borderColor: "var(--line)" }}>
          {pTasks.map((t) => <div key={t.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
            <div className="min-w-0"><p className="text-sm truncate">{t.title}</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>{memberById[t.assigneeId]?.name || "—"} · {NATURE[t.nature]?.label || "Autre"}</p></div>
            <div className="flex gap-1.5 shrink-0"><Chip color={URGENCY[t.urgency].color} bg={URGENCY[t.urgency].bg}>{URGENCY[t.urgency].label}</Chip>
              <Chip color={STATUS[t.status].color}>{STATUS[t.status].label}</Chip></div>
          </div>)}
        </div> : <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>Aucune tâche liée.</p>}
      </SectionCard>
    </div>
  );
}

/* ---------------- Vue principale ---------------- */
function Patrimoine({ store, me }) {
  const { owners, properties, units, tasks, quotes, releases, releaseLines, products, members, actions } = store;
  const [tab, setTab] = useState("biens");
  const [search, setSearch] = useState("");
  const [filterCommune, setFilterCommune] = useState("all");
  const [propModal, setPropModal] = useState(null);
  const [ownerModal, setOwnerModal] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [register, setRegister] = useState(null);
  const [ownerFolder, setOwnerFolder] = useState(null);

  const ownerById = useMemo(() => Object.fromEntries(owners.map((o) => [o.id, o])), [owners]);
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const detail = properties.find((p) => p.id === detailId);
  const sup = canSupervise(me.role);

  const saveUnitsFor = async (propertyId, lots) => {
    const existing = units.filter((u) => u.propertyId === propertyId);
    const keptIds = lots.filter((l) => l.id).map((l) => l.id);
    for (const u of existing) if (!keptIds.includes(u.id)) await actions.deleteUnit(u.id);
    for (const l of lots) {
      if (!(l.label || "").trim()) continue;
      await actions.saveUnit({ ...l, propertyId });
    }
  };

  const vacantRows = useMemo(() => {
    const rows = [];
    units.filter((u) => u.status === "vacant").forEach((u) => {
      const p = properties.find((x) => x.id === u.propertyId);
      if (!p) return;
      rows.push({ key: u.id, property: p, label: u.label, kind: UNIT_KIND[u.kind], rooms: u.rooms, rent: u.rent,
        commune: p.commune, quartier: p.quartier, agent: memberById[p.agentId],
        forWhat: p.availableFor !== "aucun" ? AVAILABLE_FOR[p.availableFor] : "À louer" });
    });
    properties.filter((p) => p.availableFor !== "aucun" && !units.some((u) => u.propertyId === p.id)).forEach((p) => {
      rows.push({ key: p.id, property: p, label: "Bien entier", kind: PROPERTY_KIND[p.kind], rooms: null,
        rent: p.availableFor === "vente" ? (p.salePrice || 0) : (p.rent || 0),
        commune: p.commune, quartier: p.quartier, agent: memberById[p.agentId], forWhat: AVAILABLE_FOR[p.availableFor] });
    });
    return rows;
  }, [units, properties, memberById]);

  if (ownerFolder) {
    return <Dossier store={store} me={me} userId={me.id} scope="proprietaire" owner={ownerFolder}
      onBack={() => setOwnerFolder(null)} onOpenDoc={() => setOwnerFolder(null)} />;
  }

  if (register === "biens") {
    return <Register title="REGISTRE DES BIENS" subtitle={`${properties.length} bien(s) en gestion`} onBack={() => setRegister(null)}
      columns={[
        { label: "Réf.", render: (p) => p.ref || "—" },
        { label: "Désignation", render: (p) => p.name },
        { label: "Type", render: (p) => PROPERTY_KIND[p.kind] },
        { label: "Localisation", render: (p) => [p.quartier, p.commune].filter(Boolean).join(", ") || "—" },
        { label: "Propriétaire", render: (p) => ownerById[p.ownerId]?.name || "—" },
        { label: "Agent en charge", render: (p) => memberById[p.agentId]?.name || "— non attribué —" },
        { label: "Lots", right: true, render: (p) => units.filter((u) => u.propertyId === p.id).length || "—" },
        { label: "Mandat", render: (p) => MANDATE[p.mandate] },
        { label: "Loyer", right: true, render: (p) => {
          const us = units.filter((u) => u.propertyId === p.id);
          return fcfa(us.length ? us.reduce((a, u) => a + u.rent, 0) : (p.rent || 0));
        } },
        { label: "Statut", render: (p) => PROPERTY_STATUS[p.status].label },
      ]}
      rows={properties}
      footer={<span>Total lots : <strong>{units.length}</strong> · Biens sans agent attribué : <strong>{properties.filter((p) => !p.agentId).length}</strong></span>} />;
  }

  if (register === "vacants") {
    return <Register title="BIENS DISPONIBLES" subtitle={`${vacantRows.length} lot(s) / bien(s) libre(s)`} onBack={() => setRegister(null)}
      columns={[
        { label: "Bâtiment / bien", render: (r) => r.property.name },
        { label: "Lot", render: (r) => r.label },
        { label: "Type", render: (r) => r.kind },
        { label: "Pièces", render: (r) => (r.rooms ? `${r.rooms}` : "—") },
        { label: "Commune", render: (r) => r.commune || "—" },
        { label: "Quartier", render: (r) => r.quartier || "—" },
        { label: "Disponible pour", render: (r) => r.forWhat },
        { label: "Loyer / prix", right: true, render: (r) => fcfa(r.rent) },
        { label: "Agent en charge", render: (r) => r.agent?.name || "— non attribué —" },
      ]}
      rows={vacantRows}
      footer={<span>Loyer potentiel mensuel : <strong>{fcfa(vacantRows.reduce((a, r) => a + (r.rent || 0), 0))}</strong></span>} />;
  }

  if (detail) {
    return <>
      <PropertyDetail property={detail} owner={ownerById[detail.ownerId]} agent={memberById[detail.agentId]}
        units={units} tasks={tasks} quotes={quotes} releases={releases} releaseLines={releaseLines}
        products={products} members={members} onBack={() => setDetailId(null)} onEdit={setPropModal} />
      {propModal && <PropertyModal initial={propModal} owners={owners} members={members} units={units}
        onSave={actions.saveProperty} onSaveUnits={saveUnitsFor} onClose={() => setPropModal(null)} onNewOwner={() => setOwnerModal({})} />}
      {ownerModal && <OwnerModal initial={ownerModal} onSave={actions.saveOwner} onClose={() => setOwnerModal(null)} />}
    </>;
  }

  const filteredProps = properties.filter((p) =>
    (filterCommune === "all" || p.commune === filterCommune) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.ref || "").toLowerCase().includes(search.toLowerCase()) ||
      (ownerById[p.ownerId]?.name || "").toLowerCase().includes(search.toLowerCase())));
  const filteredOwners = owners.filter((o) => !search || o.name.toLowerCase().includes(search.toLowerCase()) || (o.phone || "").includes(search));
  const filteredVacants = vacantRows.filter((r) => (filterCommune === "all" || r.commune === filterCommune) &&
    (!search || r.property.name.toLowerCase().includes(search.toLowerCase()) || r.label.toLowerCase().includes(search.toLowerCase())));

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Patrimoine</h1>
        <div className="flex gap-2">
          <button onClick={() => setRegister(tab === "vacants" ? "vacants" : "biens")} className="kb-btn kb-btn-ghost"><Printer size={15} /> {tab === "vacants" ? "Imprimer les vacants" : "Registre des biens"}</button>
          <button onClick={() => (tab === "proprietaires" ? setOwnerModal({}) : setPropModal({}))} className="kb-btn kb-btn-primary">
            <Plus size={16} /> {tab === "proprietaires" ? "Propriétaire" : "Bien"}
          </button>
        </div>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Immeubles et leurs lots, villas et appartements indépendants — avec l'agent en charge de chaque bien.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Building2} label="Biens en gestion" value={properties.length} sub={`${owners.length} propriétaire(s)`} tint="#2E78A8" onClick={() => setTab("biens")} />
        <StatCard icon={Layers} label="Lots au total" value={units.length} sub={`${units.filter((u) => u.status === "occupe").length} occupé(s)`} tint="#4F9E2A" />
        <StatCard icon={DoorOpen} label="Disponibles" value={vacantRows.length} sub="à louer ou à vendre" tint="#EA580C" onClick={() => setTab("vacants")} />
        <StatCard icon={Wallet} label="Loyer potentiel" value={fcfa(units.reduce((a, u) => a + u.rent, 0) || properties.reduce((a, p) => a + (p.rent || 0), 0))} sub="tous lots confondus" tint="var(--brass)" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg border overflow-hidden" style={inputStyle}>
          {[["biens", `Biens (${properties.length})`], ["vacants", `Vacants (${vacantRows.length})`], ["proprietaires", `Propriétaires (${owners.length})`]].map(([v, l]) =>
            <button key={v} onClick={() => setTab(v)} className="px-3 py-2 text-sm whitespace-nowrap" style={{ background: tab === v ? "var(--ink)" : "#fff", color: tab === v ? "#fff" : "var(--muted)" }}>{l}</button>)}
        </div>
        <div className="relative flex-1 min-w-[150px]">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
        </div>
        {tab !== "proprietaires" && <select value={filterCommune} onChange={(e) => setFilterCommune(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Toutes communes</option>
          {[...new Set(properties.map((p) => p.commune).filter(Boolean))].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>}
      </div>

      {tab === "biens" && (filteredProps.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredProps.map((p) => {
          const st = PROPERTY_STATUS[p.status]; const o = ownerById[p.ownerId]; const ag = memberById[p.agentId];
          const pu = units.filter((u) => u.propertyId === p.id);
          const vac = pu.filter((u) => u.status === "vacant").length;
          return (
            <button key={p.id} onClick={() => setDetailId(p.id)} className="bg-white rounded-xl border p-3 text-left hover:shadow-md transition-shadow" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: st.color + "1A", color: st.color }}>
                    {p.kind === "immeuble" ? <Building2 size={17} /> : (p.kind === "magasin" || p.kind === "local_commercial") ? <Store size={17} /> : p.kind === "bureau" ? <Briefcase size={17} /> : <Home size={17} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-[11px] truncate" style={{ color: "var(--muted)" }}>{PROPERTY_KIND[p.kind]} · {p.commune || "—"}</p>
                  </div>
                </div>
                <Chip color={st.color} dot>{st.label}</Chip>
              </div>
              <p className="text-xs mt-2.5 truncate" style={{ color: "var(--muted)" }}><UserRound size={11} className="inline mb-0.5" /> {o?.name || "Propriétaire non renseigné"}</p>
              <p className="text-xs mt-1 truncate" style={{ color: ag ? "#2E78A8" : "#B6BEC9" }}><BadgeCheck size={11} className="inline mb-0.5" /> {ag?.name || "Aucun agent attribué"}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {pu.length > 0 && <Chip color="#64748B">{pu.length} lot(s)</Chip>}
                {vac > 0 && <Chip color="#EA580C">{vac} vacant(s)</Chip>}
                {p.availableFor !== "aucun" && <Chip color="#D81F26">{AVAILABLE_FOR[p.availableFor]}</Chip>}
              </div>
            </button>
          );
        })}
      </div> : <EmptyState icon={Building2} title="Aucun bien enregistré" sub="Ajoutez un immeuble, une villa ou un appartement indépendant."
        action={<button onClick={() => setPropModal({})} className="kb-btn kb-btn-primary"><Plus size={15} /> Nouveau bien</button>} />)}

      {tab === "vacants" && (filteredVacants.length ? (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left" style={{ color: "var(--muted)" }}>
              <th className="px-4 py-2.5 font-medium">Bâtiment / bien</th><th className="px-3 py-2.5 font-medium">Lot</th>
              <th className="px-3 py-2.5 font-medium">Type</th><th className="px-3 py-2.5 font-medium">Pièces</th>
              <th className="px-3 py-2.5 font-medium">Localisation</th>
              <th className="px-3 py-2.5 font-medium">Disponible pour</th><th className="px-3 py-2.5 font-medium">Loyer / prix</th>
              <th className="px-3 py-2.5 font-medium">Agent</th></tr></thead>
            <tbody>{filteredVacants.map((r) => (
              <tr key={r.key} className="border-t hover:bg-slate-50 cursor-pointer" style={{ borderColor: "var(--line)" }} onClick={() => setDetailId(r.property.id)}>
                <td className="px-4 py-2.5 font-medium">{r.property.name}</td>
                <td className="px-3 py-2.5">{r.label}</td>
                <td className="px-3 py-2.5">{r.kind}</td>
                <td className="px-3 py-2.5 font-medium">{r.rooms ? `${r.rooms} pièce${r.rooms > 1 ? "s" : ""}` : <span style={{ color: "#D81F26" }}>à préciser</span>}</td>
                <td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>{[r.quartier, r.commune].filter(Boolean).join(", ") || "—"}</td>
                <td className="px-3 py-2.5"><Chip color="#EA580C">{r.forWhat}</Chip></td>
                <td className="px-3 py-2.5 font-medium tabular-nums">{fcfa(r.rent)}</td>
                <td className="px-3 py-2.5" style={{ color: r.agent ? "var(--ink)" : "#B6BEC9" }}>{r.agent?.name || "non attribué"}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <div className="px-4 py-2.5 border-t text-xs" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
            Loyer potentiel mensuel : <strong style={{ color: "var(--ink)" }}>{fcfa(filteredVacants.reduce((a, r) => a + (r.rent || 0), 0))}</strong>
          </div>
        </div>
      ) : <EmptyState icon={DoorOpen} title="Aucun bien disponible" sub="Les lots marqués « vacant » et les biens disponibles apparaissent ici." />)}

      {tab === "proprietaires" && (filteredOwners.length ? <div className="bg-white rounded-xl border" style={{ borderColor: "var(--line)" }}>
        <div className="divide-y" style={{ borderColor: "var(--line)" }}>
          {filteredOwners.map((o) => {
            const nProps = properties.filter((p) => p.ownerId === o.id).length;
            return <div key={o.id} className="flex items-center justify-between px-4 py-3 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: "#2E78A8" }}><UserRound size={16} /></span>
                <div className="min-w-0">
                  <button onClick={() => setOwnerFolder(o)} className="text-sm font-medium truncate hover:underline flex items-center gap-1.5" style={{ color: "#2E78A8" }}>
                    <FolderOpen size={13} /> {o.name}
                  </button>
                  <p className="text-[11px] flex items-center gap-2 flex-wrap" style={{ color: "var(--muted)" }}>
                    <span>{OWNER_KIND[o.kind]}</span>
                    {o.phone && <span className="flex items-center gap-0.5"><Phone size={10} />{o.phone}</span>}
                    {o.email && <span className="flex items-center gap-0.5"><Mail size={10} />{o.email}</span>}
                    <span className="flex items-center gap-0.5"><Home size={10} />{nProps} bien(s)</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setOwnerModal(o)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Pencil size={14} /></button>
                {sup && <button onClick={async () => { if (confirm(`Supprimer ${o.name} ?`)) await actions.deleteOwner(o.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}
              </div>
            </div>;
          })}
        </div>
      </div> : <EmptyState icon={UserRound} title="Aucun propriétaire enregistré" sub="Ajoutez les propriétaires dont vous gérez les biens."
        action={<button onClick={() => setOwnerModal({})} className="kb-btn kb-btn-primary"><Plus size={15} /> Nouveau propriétaire</button>} />)}

      {propModal && <PropertyModal initial={propModal} owners={owners} members={members} units={units}
        onSave={actions.saveProperty} onSaveUnits={saveUnitsFor} onClose={() => setPropModal(null)} onNewOwner={() => setOwnerModal({})} />}
      {ownerModal && <OwnerModal initial={ownerModal} onSave={actions.saveOwner} onClose={() => setOwnerModal(null)} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODULE PRODUITS & ENTRETIEN
   ══════════════════════════════════════════════════════════════════════ */
/* ---------------- Modale produit ---------------- */
function ProductModal({ initial, onSave, onClose }) {
  const [f, setF] = useState(() => ({ name: "", category: "entretien", unit: "unité", minQty: 0, price: 0, supplier: "", active: true, ...initial }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => { setBusy(true); const r = await onSave(f); setBusy(false); if (r?.error) setErr(r.error); else onClose(); };
  return (
    <Modal title={f.id ? "Modifier le produit" : "Nouveau produit"} onClose={onClose}>
      <Field label="Désignation"><input className={inputCls} style={inputStyle} value={f.name} autoFocus onChange={(e) => set("name", e.target.value)} placeholder="Ex. Eau de Javel 5L" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Catégorie"><select className={inputCls} style={inputStyle} value={f.category} onChange={(e) => set("category", e.target.value)}>{Object.entries(PRODUCT_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
        <Field label="Unité"><input className={inputCls} style={inputStyle} value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="bidon, pièce, carton…" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prix unitaire (FCFA)"><input type="number" min={0} step={100} className={inputCls} style={inputStyle} value={f.price} onChange={(e) => set("price", e.target.value)} /></Field>
        <Field label="Seuil d'alerte" hint="Alerte quand le stock passe en dessous"><input type="number" min={0} className={inputCls} style={inputStyle} value={f.minQty} onChange={(e) => set("minQty", e.target.value)} /></Field>
      </div>
      <Field label="Fournisseur"><input className={inputCls} style={inputStyle} value={f.supplier} onChange={(e) => set("supplier", e.target.value)} /></Field>
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!f.name.trim() || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> Enregistrer</button></div>
    </Modal>
  );
}

/* ---------------- Modale approvisionnement ---------------- */
function StockEntryModal({ products, onSave, onClose }) {
  const [f, setF] = useState({ productId: products[0]?.id || "", qty: 1, price: products[0]?.price || 0, supplier: "", date: isoDate(new Date()), notes: "" });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => { setBusy(true); const r = await onSave(f); setBusy(false); if (r?.error) setErr(r.error); else onClose(); };
  return (
    <Modal title="Entrée de stock (approvisionnement)" onClose={onClose}>
      <Field label="Produit">
        <select className={inputCls} style={inputStyle} value={f.productId} onChange={(e) => {
          const p = products.find((x) => x.id === e.target.value);
          setF((s) => ({ ...s, productId: e.target.value, price: p?.price || 0 }));
        }}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Quantité"><input type="number" min={0.01} step="any" className={inputCls} style={inputStyle} value={f.qty} onChange={(e) => set("qty", e.target.value)} /></Field>
        <Field label="Prix unitaire"><input type="number" min={0} step={100} className={inputCls} style={inputStyle} value={f.price} onChange={(e) => set("price", e.target.value)} /></Field>
        <Field label="Date"><input type="date" className={inputCls} style={inputStyle} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
      </div>
      <Field label="Fournisseur"><input className={inputCls} style={inputStyle} value={f.supplier} onChange={(e) => set("supplier", e.target.value)} /></Field>
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!f.productId || Number(f.qty) <= 0 || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><ArrowDownToLine size={16} /> Ajouter au stock</button></div>
    </Modal>
  );
}

/* ---------------- Modale fiche de sortie ---------------- */
function ReleaseModal({ initial, initialLines, products, properties, onSave, onClose, onQuickProduct }) {
  const [f, setF] = useState(() => ({ propertyId: "", releasedTo: "", purpose: "nettoyage", date: isoDate(new Date()), zone: "", notes: "", ...initial }));
  const [lines, setLines] = useState(() => initialLines?.length ? initialLines : [{ productId: "", qty: 1, price: 0 }]);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [newProd, setNewProd] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setLine = (i, k, v) => setLines((p) => p.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  /* Ajoute un produit inexistant au catalogue, puis le place sur une ligne */
  const quickAdd = async () => {
    const name = newProd.trim();
    if (!name) return;
    const r = await onQuickProduct(name);
    if (r?.error) { setErr(r.error); return; }
    if (r?.id) setLines((p) => [...p, { productId: r.id, qty: 1, price: 0 }]);
    setNewProd("");
  };
  const pickProduct = (i, id) => {
    const p = products.find((x) => x.id === id);
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, productId: id, price: p?.price || 0 } : l)));
  };
  const total = lines.reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);
  const valid = lines.some((l) => l.productId && Number(l.qty) > 0);
  const submit = async () => { setBusy(true); const r = await onSave(f, lines); setBusy(false); if (r?.error) setErr(r.error); else onClose(); };

  return (
    <Modal title={f.id ? `Fiche de sortie ${f.ref || ""}` : "Nouvelle fiche de sortie"} onClose={onClose} wide>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Bâtiment / bien concerné">
          <select className={inputCls} style={inputStyle} value={f.propertyId || ""} onChange={(e) => set("propertyId", e.target.value)}>
            <option value="">— Non rattaché —</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Remis à" hint="Agent d'entretien"><input className={inputCls} style={inputStyle} value={f.releasedTo} onChange={(e) => set("releasedTo", e.target.value)} placeholder="Nom de la personne" /></Field>
        <Field label="Date"><input type="date" className={inputCls} style={inputStyle} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Motif"><select className={inputCls} style={inputStyle} value={f.purpose} onChange={(e) => set("purpose", e.target.value)}>{Object.entries(RELEASE_PURPOSE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Zone concernée"><input className={inputCls} style={inputStyle} value={f.zone} onChange={(e) => set("zone", e.target.value)} placeholder="Parties communes, cage d'escalier…" /></Field>
      </div>

      <p className="text-xs font-medium mb-2 mt-1" style={{ color: "var(--muted)" }}>Produits sortis</p>
      <div className="space-y-2 mb-3">
        {lines.map((l, i) => {
          const prod = products.find((p) => p.id === l.productId);
          const insufficient = prod && Number(l.qty) > prod.stock;
          return (
            <div key={i} className="flex gap-2 items-start">
              <select className={inputCls + " flex-1"} style={inputStyle} value={l.productId} onChange={(e) => pickProduct(i, e.target.value)}>
                <option value="">— Choisir un produit —</option>
                {products.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name} (stock {qty(p.stock)} {p.unit})</option>)}
              </select>
              <div className="w-20 shrink-0">
                <input type="number" min={0.01} step="any" className={inputCls} style={{ ...inputStyle, borderColor: insufficient ? "#D81F26" : "var(--line)" }} value={l.qty} onChange={(e) => setLine(i, "qty", e.target.value)} />
                {insufficient && <span className="text-[10px] text-red-600">stock {qty(prod.stock)}</span>}
              </div>
              <input type="number" min={0} step={100} className={inputCls + " w-24 shrink-0"} style={inputStyle} value={l.price} onChange={(e) => setLine(i, "price", e.target.value)} title="Prix unitaire" />
              <button onClick={() => setLines((p) => p.filter((_, j) => j !== i))} className="p-2 rounded-lg text-slate-300 hover:text-red-500 shrink-0"><X size={15} /></button>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <button onClick={() => setLines((p) => [...p, { productId: "", qty: 1, price: 0 }])} className="kb-btn kb-btn-ghost text-sm"><Plus size={14} /> Ajouter un produit</button>
        <span className="text-xs" style={{ color: "var(--muted)" }}>ou</span>
        <input className="px-2 py-2 rounded-lg border text-sm flex-1 min-w-[150px]" style={inputStyle} value={newProd}
          onChange={(e) => setNewProd(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); quickAdd(); } }}
          placeholder="Nouveau produit non catalogué…" />
        <button onClick={quickAdd} disabled={!newProd.trim()} className="kb-btn kb-btn-ghost text-sm disabled:opacity-40"><Package size={14} /> Créer et ajouter</button>
      </div>

      <div className="flex items-center justify-between rounded-lg px-3 py-2 mb-3" style={{ background: "#F6F8FA" }}>
        <span className="text-sm font-medium">Valeur totale sortie</span>
        <span className="text-lg font-bold" style={{ color: "var(--brass)" }}>{fcfa(total)}</span>
      </div>
      <Field label="Observations"><textarea className={inputCls} style={inputStyle} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!valid || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> {busy ? "…" : "Valider la sortie"}</button></div>
    </Modal>
  );
}

/* ---------------- Vue principale ---------------- */
function Produits({ store, me }) {
  const { products, properties, releases, releaseLines, stockEntries, members, actions } = store;
  const [tab, setTab] = useState("sorties");
  const [search, setSearch] = useState("");
  const [prodModal, setProdModal] = useState(null);
  const [entryModal, setEntryModal] = useState(false);
  const [relModal, setRelModal] = useState(null);
  const [months, setMonths] = useState(6);

  const productById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const propById = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p])), [properties]);
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const sup = canSupervise(me.role);

  const lowStock = products.filter((p) => p.active && p.stock <= p.minQty);
  const stockValue = products.reduce((a, p) => a + p.stock * p.price, 0);
  const releaseTotal = (rid) => releaseLines.filter((l) => l.releaseId === rid).reduce((a, l) => a + l.qty * l.price, 0);

  /* --- Analyse de consommation --- */
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - months);
  const recentReleases = releases.filter((r) => new Date(r.date + "T00:00:00") >= cutoff);
  const recentIds = new Set(recentReleases.map((r) => r.id));
  const recentLines = releaseLines.filter((l) => recentIds.has(l.releaseId));

  const byProduct = useMemo(() => {
    const m = {};
    recentLines.forEach((l) => {
      const p = productById[l.productId]; if (!p) return;
      m[l.productId] = m[l.productId] || { name: p.name, qty: 0, value: 0, times: 0, unit: p.unit, color: PRODUCT_CATEGORY[p.category]?.color || "#64748B" };
      m[l.productId].qty += l.qty; m[l.productId].value += l.qty * l.price; m[l.productId].times += 1;
    });
    return Object.values(m).sort((a, b) => b.qty - a.qty);
  }, [recentLines, productById]);

  const byProperty = useMemo(() => {
    const m = {};
    recentReleases.forEach((r) => {
      const key = r.propertyId || "none";
      const name = propById[r.propertyId]?.name || "Non rattaché";
      m[key] = m[key] || { name, sorties: 0, value: 0 };
      m[key].sorties += 1; m[key].value += releaseTotal(r.id);
    });
    return Object.values(m).sort((a, b) => b.value - a.value);
  }, [recentReleases, propById, releaseLines]);

  const byMonth = useMemo(() => {
    const m = {};
    recentReleases.forEach((r) => {
      const k = monthIso(r.date + "T00:00:00");
      m[k] = m[k] || { key: k, name: monthLabel(k), value: 0, sorties: 0 };
      m[k].value += releaseTotal(r.id); m[k].sorties += 1;
    });
    return Object.values(m).sort((a, b) => a.key.localeCompare(b.key));
  }, [recentReleases, releaseLines]);

  const filteredProducts = products.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const filteredReleases = releases.filter((r) => !search ||
    (r.ref || "").toLowerCase().includes(search.toLowerCase()) ||
    (propById[r.propertyId]?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.releasedTo || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Produits & entretien</h1>
        <div className="flex gap-2">
          <button onClick={() => setEntryModal(true)} className="kb-btn kb-btn-ghost"><ArrowDownToLine size={15} /> Entrée</button>
          <button onClick={() => setRelModal({})} className="kb-btn kb-btn-primary"><ArrowUpFromLine size={16} /> Fiche de sortie</button>
        </div>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Stock des produits sanitaires, fiches de sortie par bâtiment et analyse des consommations.</p>

      {lowStock.length > 0 && (
        <div className="rounded-xl border p-3 mb-4 flex items-start gap-2" style={{ borderColor: "#F5C6C7", background: "#FDF2F2" }}>
          <AlertTriangle size={16} style={{ color: "#D81F26" }} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium" style={{ color: "#B5171D" }}>{lowStock.length} produit(s) sous le seuil d'alerte</p>
            <p className="text-xs mt-0.5" style={{ color: "#B5171D" }}>{lowStock.map((p) => `${p.name} (${qty(p.stock)} ${p.unit})`).join(" · ")}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Package} label="Valeur du stock" value={fcfa(stockValue)} sub={`${products.filter((p) => p.active).length} références`} tint="#4F9E2A" />
        <StatCard icon={ClipboardList} label="Fiches de sortie" value={releases.length} sub={`${recentReleases.length} sur ${months} mois`} tint="var(--brass)" onClick={() => setTab("sorties")} />
        <StatCard icon={TrendingDown} label="Consommé (période)" value={fcfa(recentLines.reduce((a, l) => a + l.qty * l.price, 0))} tint="#7C3AED" />
        <StatCard icon={AlertTriangle} label="Alertes de stock" value={lowStock.length} tint="#D81F26" onClick={() => setTab("stock")} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg border overflow-hidden" style={inputStyle}>
          {[["sorties", "Fiches de sortie"], ["stock", "Stock"], ["analyse", "Analyse"]].map(([v, l]) =>
            <button key={v} onClick={() => setTab(v)} className="px-3 py-2 text-sm whitespace-nowrap" style={{ background: tab === v ? "var(--ink)" : "#fff", color: tab === v ? "#fff" : "var(--muted)" }}>{l}</button>)}
        </div>
        {tab !== "analyse" && <div className="relative flex-1 min-w-[160px]">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
        </div>}
        {tab === "analyse" && <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value={3}>3 derniers mois</option><option value={6}>6 derniers mois</option><option value={12}>12 derniers mois</option>
        </select>}
        {tab === "stock" && <button onClick={() => setProdModal({})} className="kb-btn kb-btn-ghost text-sm"><Plus size={14} /> Produit</button>}
      </div>

      {/* ---- FICHES DE SORTIE ---- */}
      {tab === "sorties" && (filteredReleases.length ? (
        <div className="space-y-2">
          {filteredReleases.map((r) => {
            const lines = releaseLines.filter((l) => l.releaseId === r.id);
            return (
              <div key={r.id} className="bg-white rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{r.ref}</p>
                      <Chip color="#7C3AED">{RELEASE_PURPOSE[r.purpose]}</Chip>
                      {r.propertyId && <Chip color="#2E78A8"><Building2 size={10} /> {propById[r.propertyId]?.name || "—"}</Chip>}
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
                      {fr(r.date + "T00:00:00", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                      {r.releasedTo && ` · remis à ${r.releasedTo}`}
                      {r.zone && ` · ${r.zone}`}
                      {r.releasedBy && ` · saisi par ${memberById[r.releasedBy]?.name || "—"}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold" style={{ color: "var(--brass)" }}>{fcfa(releaseTotal(r.id))}</span>
                    <button onClick={() => setRelModal({ ...r, _lines: lines })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Pencil size={14} /></button>
                    {sup && <button onClick={async () => { if (confirm(`Supprimer la fiche ${r.ref} ? Le stock sera recrédité.`)) await actions.deleteRelease(r.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: "var(--line)" }}>
                  {lines.map((l) => <Chip key={l.id} color="#64748B">{productById[l.productId]?.name || "?"} × {qty(l.qty)}</Chip>)}
                  {lines.length === 0 && <span className="text-xs" style={{ color: "var(--muted)" }}>Aucun produit</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : <EmptyState icon={ClipboardList} title="Aucune fiche de sortie" sub="Enregistrez les produits remis aux agents d'entretien."
        action={<button onClick={() => setRelModal({})} className="kb-btn kb-btn-primary"><Plus size={15} /> Nouvelle fiche</button>} />)}

      {/* ---- STOCK ---- */}
      {tab === "stock" && (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left" style={{ color: "var(--muted)" }}>
              <th className="px-4 py-2.5 font-medium">Produit</th><th className="px-3 py-2.5 font-medium">Catégorie</th>
              <th className="px-3 py-2.5 font-medium">Stock</th><th className="px-3 py-2.5 font-medium">Seuil</th>
              <th className="px-3 py-2.5 font-medium">P.U.</th><th className="px-3 py-2.5 font-medium">Valeur</th><th /></tr></thead>
            <tbody>{filteredProducts.map((p) => {
              const cat = PRODUCT_CATEGORY[p.category]; const low = p.stock <= p.minQty;
              return <tr key={p.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                <td className="px-4 py-2.5"><p className="font-medium">{p.name}</p>{p.supplier && <p className="text-[11px]" style={{ color: "var(--muted)" }}>{p.supplier}</p>}</td>
                <td className="px-3 py-2.5"><Chip color={cat.color}>{cat.label}</Chip></td>
                <td className="px-3 py-2.5"><span className="font-semibold" style={{ color: low ? "#D81F26" : "var(--ink)" }}>{qty(p.stock)}</span> <span className="text-xs" style={{ color: "var(--muted)" }}>{p.unit}</span>{low && <AlertTriangle size={12} className="inline ml-1 mb-0.5" style={{ color: "#D81F26" }} />}</td>
                <td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>{qty(p.minQty)}</td>
                <td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>{fcfa(p.price)}</td>
                <td className="px-3 py-2.5 font-medium">{fcfa(p.stock * p.price)}</td>
                <td className="px-3 py-2.5"><div className="flex gap-1 justify-end">
                  <button onClick={() => setProdModal(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Pencil size={14} /></button>
                  {sup && <button onClick={async () => { if (confirm(`Supprimer ${p.name} ?`)) await actions.deleteProduct(p.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}
                </div></td>
              </tr>;
            })}</tbody>
          </table></div>
          {filteredProducts.length === 0 && <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>Aucun produit.</p>}
        </div>
      )}

      {/* ---- ANALYSE ---- */}
      {tab === "analyse" && (
        recentReleases.length ? <>
          <SectionCard title={`Produits les plus utilisés (${months} derniers mois)`} icon={BarChart3}>
            <ResponsiveContainer width="100%" height={Math.max(180, byProduct.length * 34)}>
              <BarChart data={byProduct.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEF1F5" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n, p) => [`${qty(v)} ${p.payload.unit} · ${p.payload.times} sortie(s)`, "Consommé"]} />
                <Bar dataKey="qty" radius={[0, 5, 5, 0]}>{byProduct.slice(0, 10).map((d, i) => <Cell key={i} fill={d.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <div className="grid lg:grid-cols-2 gap-4">
            <SectionCard title="Consommation par bâtiment" icon={Building2} pad={false}>
              <div className="divide-y" style={{ borderColor: "var(--line)" }}>
                {byProperty.map((b, i) => <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div><p className="text-sm font-medium">{b.name}</p><p className="text-[11px]" style={{ color: "var(--muted)" }}>{b.sorties} sortie(s) sur la période</p></div>
                  <span className="text-sm font-semibold">{fcfa(b.value)}</span>
                </div>)}
              </div>
            </SectionCard>

            <SectionCard title="Évolution mensuelle" icon={TrendingDown}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byMonth} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F5" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v, n, p) => [`${fcfa(v)} · ${p.payload.sorties} sortie(s)`, "Consommé"]} />
                  <Bar dataKey="value" radius={[5, 5, 0, 0]} fill="#7C3AED" />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          <SectionCard title="Détail par produit" icon={Package} pad={false}>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-left" style={{ color: "var(--muted)" }}>
                <th className="px-4 py-2.5 font-medium">Produit</th><th className="px-3 py-2.5 font-medium">Quantité</th>
                <th className="px-3 py-2.5 font-medium">Fréquence</th><th className="px-3 py-2.5 font-medium">Valeur</th></tr></thead>
              <tbody>{byProduct.map((p, i) => <tr key={i} className="border-t" style={{ borderColor: "var(--line)" }}>
                <td className="px-4 py-2.5 font-medium">{p.name}</td>
                <td className="px-3 py-2.5">{qty(p.qty)} {p.unit}</td>
                <td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>{p.times} sortie(s) · {(p.times / months).toFixed(1)}/mois</td>
                <td className="px-3 py-2.5 font-medium">{fcfa(p.value)}</td>
              </tr>)}</tbody>
            </table></div>
          </SectionCard>
        </> : <EmptyState icon={BarChart3} title="Pas encore de données d'analyse" sub="Enregistrez des fiches de sortie pour visualiser les consommations." />
      )}

      {prodModal && <ProductModal initial={prodModal} onSave={actions.saveProduct} onClose={() => setProdModal(null)} />}
      {entryModal && <StockEntryModal products={products.filter((p) => p.active)} onSave={actions.addStockEntry} onClose={() => setEntryModal(false)} />}
      {relModal && <ReleaseModal initial={relModal} initialLines={relModal._lines} products={products} properties={properties}
        onSave={actions.saveRelease} onClose={() => setRelModal(null)}
        onQuickProduct={(name) => actions.saveProduct({ name, category: "entretien", unit: "unité", minQty: 0, price: 0, supplier: "", active: true })} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODULE RECOUVREMENT
   ══════════════════════════════════════════════════════════════════════ */
const periodLabel = (p) => {
  const [y, m] = (p || "").split("-");
  return `${MONTHS_FR[Number(m) - 1] || ""} ${y || ""}`;
};
const currentPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

/* Totaux d'une période, à l'identique du fichier Excel */
function periodTotals(lines, charges, rate) {
  const vacantLines = lines.filter(isVacantLine);
  const active = lines.filter((l) => !isVacantLine(l));   // lots réellement loués
  const expected = active.reduce((a, l) => a + (Number(l.expected) || 0), 0);
  const collected = active.reduce((a, l) => a + (Number(l.collected) || 0), 0);
  const arrears = active.reduce((a, l) => a + Math.max(0, (Number(l.expected) || 0) - (Number(l.collected) || 0)), 0);
  const deducted = lines.reduce((a, l) => a + (Number(l.charges) || 0), 0);
  const netAfter = collected - deducted;
  const chargeRows = charges.filter((c) => (c.kind || "charge") === "charge");
  const supplementRows = charges.filter((c) => c.kind === "supplement");
  const chargesTotal = chargeRows.reduce((a, c) => a + (Number(c.amount) || 0), 0);
  /* Sommes à verser en plus du loyer : caution reversée, reliquat du mois
     précédent, remboursement… Elles s'ajoutent au net dû au propriétaire. */
  const supplementsTotal = supplementRows.reduce((a, c) => a + (Number(c.amount) || 0), 0);
  const fee = Math.round(collected * (Number(rate) || 0));
  /* NET PROPRIÉTAIRE = encaissé
       − charges retenues sur les locataires (colonne "Charges" du tableau)
       − charges du mois supportées par l'immeuble (électricité, eau, entretien…)
       − prestation de l'agence
       + sommes à verser en plus (caution, reliquat, remboursement…) */
  const netOwner = collected - deducted - chargesTotal - fee + supplementsTotal;
  const nPaid = active.filter((l) => payStatusOf(l.expected, l.collected) === "paye").length;
  const nPartial = active.filter((l) => payStatusOf(l.expected, l.collected) === "partiel").length;
  const nUnpaid = active.filter((l) => payStatusOf(l.expected, l.collected) === "impaye").length;
  const nVacant = vacantLines.length;
  const nActive = active.length;
  const rateCollected = expected > 0 ? collected / expected : 0;
  return { expected, collected, arrears, deducted, netAfter, chargesTotal, supplementsTotal, chargeRows, supplementRows, fee, netOwner, nPaid, nPartial, nUnpaid, nVacant, nActive, rateCollected, vacantLines, activeLines: active };
}


/* ---- Avance versée à l'entrée du locataire ----
   Renvoie le rang du mois dans l'avance (1..n) si la période est couverte, sinon 0. */
function advanceRank(unit, period) {
  const n = Number(unit?.advanceMonths) || 0;
  const start = unit?.advanceStart || unit?.leaseStart;
  if (!n || !start || !period) return 0;
  const [sy, sm] = start.slice(0, 7).split("-").map(Number);
  const [py, pm] = period.split("-").map(Number);
  const diff = (py - sy) * 12 + (pm - sm);
  return diff >= 0 && diff < n ? diff + 1 : 0;
}

/* ---- Amorçage d'un tableau mensuel ----
   On repart du mois précédent du même bâtiment (locataires, loyers, charges),
   à défaut des lots du patrimoine. Les encaissements repartent à zéro,
   les arriérés sont rappelés en commentaire, et les mois couverts par
   l'avance d'entrée sont marqués comme déjà réglés. */
function seedPeriod({ period, rentPeriods, rentLines, rentCharges, units }) {
  const unitById = Object.fromEntries(units.map((u) => [u.id, u]));
  const findUnit = (l) => unitById[l.unitId]
    || units.find((u) => u.propertyId === period.propertyId
        && (u.label || "").toLowerCase() === (l.unitLabel || "").toLowerCase());

  const applyAdvance = (line, unit) => {
    const rank = advanceRank(unit, period.period);
    if (!rank) return line;
    const n = Number(unit.advanceMonths) || 0;
    return { ...line, collected: line.expected,
      paidAt: (unit.advanceStart || unit.leaseStart || "").slice(0, 10),
      comment: `Avance versée à l'entrée (mois ${rank}/${n})` };
  };

  const prev = rentPeriods
    .filter((p) => p.propertyId === period.propertyId && p.scope === period.scope && p.period < period.period)
    .sort((a, b) => b.period.localeCompare(a.period))[0];

  if (prev) {
    const lines = rentLines.filter((l) => l.periodId === prev.id)
      .sort((a, b) => a.position - b.position)
      .map((l) => {
        const u = findUnit(l);
        const arrear = Math.max(0, (Number(l.expected) || 0) - (Number(l.collected) || 0));
        /* Un lot devenu vacant repart sans loyer attendu ; un lot reloué reprend le sien */
        const vacantNow = u ? (u.status === "vacant" || !(u.tenantName || "").trim()) : isVacantLine(l);
        const base = { unitId: l.unitId || u?.id || null, unitLabel: l.unitLabel,
          tenantName: vacantNow ? (u ? "" : l.tenantName) : (u?.tenantName || l.tenantName),
          tenantPhone: vacantNow ? "" : (u?.tenantPhone || l.tenantPhone),
          expected: vacantNow ? 0 : (u?.rent || l.expected), collected: 0, paidAt: "",
          charges: vacantNow ? 0 : l.charges, vacant: vacantNow,
          comment: vacantNow ? "Lot vacant" : (arrear > 0 ? `Arriéré ${prev.period} : ${fcfa(arrear)}` : "") };
        return (u && !vacantNow) ? applyAdvance(base, u) : base;
      });
    const charges = rentCharges.filter((c) => c.periodId === prev.id && (c.kind || "charge") === "charge")
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ label: c.label, amount: c.amount, observation: c.observation || "", kind: "charge" }));
    return { lines, charges, source: `report de ${prev.period}` };
  }

  const us = units.filter((u) => u.propertyId === period.propertyId);
  const lines = us.map((u) => {
    const vacant = u.status === "vacant" || !(u.tenantName || "").trim();
    const base = { unitId: u.id, unitLabel: u.label, tenantName: u.tenantName || "", tenantPhone: u.tenantPhone || "",
      expected: vacant ? 0 : (u.rent || 0), collected: 0, paidAt: "", charges: 0,
      vacant, comment: vacant ? "Lot vacant" : "" };
    return vacant ? base : applyAdvance(base, u);
  });
  return { lines, charges: DEFAULT_CHARGES.map((label) => ({ label, amount: 0, observation: "", kind: "charge" })),
    source: us.length ? "lots du bâtiment" : "" };
}

/* ================= Éditeur d'une période ================= */
function PeriodEditor({ period, property, owner, units, lines0, charges0, seed, readOnly, onSave, onClose }) {
  /* Tableau vierge : on l'amorce depuis le mois précédent, sinon depuis les lots */
  const isNew = lines0.length === 0 && charges0.length === 0;
  const [lines, setLines] = useState(() => lines0.length ? lines0.map((l) => ({ ...l })) : (isNew ? seed.lines : []));
  const [charges, setCharges] = useState(() => {
    if (charges0.length) return charges0.map((c) => ({ ...c, kind: c.kind || "charge" }));
    if (isNew) return seed.charges;
    return DEFAULT_CHARGES.map((label) => ({ label, amount: 0, observation: "", kind: "charge" }));
  });
  /* Index réels dans le tableau `charges`, pour éditer chaque bloc séparément */
  const chargeIdx = charges.map((c, i) => [c, i]).filter(([c]) => (c.kind || "charge") === "charge");
  const supplementIdx = charges.map((c, i) => [c, i]).filter(([c]) => c.kind === "supplement");
  const [rate, setRate] = useState(period.rate);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");

  /* Pré-remplissage depuis les lots du bâtiment */
  const loadFromUnits = () => {
    const us = units.filter((u) => u.propertyId === period.propertyId);
    if (!us.length) { setErr("Aucun lot enregistré pour ce bâtiment. Ajoutez-les dans Patrimoine."); return; }
    setLines(us.map((u) => {
      const vacant = u.status === "vacant" || !(u.tenantName || "").trim();
      const base = { unitId: u.id, unitLabel: u.label, tenantName: u.tenantName || "", tenantPhone: u.tenantPhone || "",
        expected: vacant ? 0 : (u.rent || 0), collected: 0, paidAt: "", charges: 0,
        vacant, comment: vacant ? "Lot vacant" : "" };
      if (vacant) return base;
      const rank = advanceRank(u, period.period);
      if (!rank) return base;
      return { ...base, collected: base.expected, paidAt: (u.advanceStart || u.leaseStart || "").slice(0, 10),
        comment: `Avance versée à l'entrée (mois ${rank}/${u.advanceMonths})` };
    }));
    setErr("");
  };

  const setLine = (i, k, v) => setLines((p) => p.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const setCharge = (i, k, v) => setCharges((p) => p.map((c, j) => (j === i ? { ...c, [k]: v } : c)));
  const t = periodTotals(lines, charges, rate);

  const submit = async () => {
    setBusy(true);
    const r = await onSave({ ...period, rate }, lines, charges);
    setBusy(false);
    if (r?.error) setErr(r.error); else onClose();
  };

  return (
    <Modal title={`${RENT_SCOPE[period.scope].label} — ${property?.name || ""} · ${periodLabel(period.period)}`} onClose={onClose} wide>
      {readOnly && (
        <div className="rounded-lg p-3 mb-4 text-xs flex items-center gap-2" style={{ background: "#F1F3F5", color: "var(--muted)" }}>
          <Eye size={14} /> {period.scope === "comptable"
            ? "Lecture seule — l'état comptable est consultable par toute l'équipe, mais seul l'administrateur peut le modifier."
            : "Lecture seule — ce tableau appartient à son auteur. Seuls celui-ci et l'administrateur peuvent le modifier."}
        </div>
      )}

      {isNew && seed.source && !readOnly && (
        <div className="rounded-lg p-3 mb-3 text-xs flex items-start gap-2" style={{ background: "#EFF6FF", color: "#1F5C82" }}>
          <RotateCcw size={14} className="mt-0.5 shrink-0" />
          <span>
            Tableau pré-rempli par <strong>{seed.source}</strong> : locataires, loyers et charges repris tels quels,
            encaissements remis à zéro. Les arriérés du mois précédent sont rappelés en commentaire et les mois couverts
            par l'avance d'entrée sont déjà marqués comme réglés. Adaptez librement avant d'enregistrer.
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--muted)" }}>Taux de prestation agence</span>
          <input type="number" min={0} max={1} step={0.01} disabled={readOnly} className="w-20 px-2 py-1 rounded-lg border text-sm"
            style={inputStyle} value={rate} onChange={(e) => setRate(e.target.value)} />
          <span className="text-xs font-medium">{(Number(rate) * 100).toFixed(0)} %</span>
        </div>
        {!readOnly && <button onClick={loadFromUnits} className="kb-btn kb-btn-ghost text-sm"><Users size={14} /> Charger les lots du bâtiment</button>}
      </div>

      {/* Tableau des locataires */}
      <div className="overflow-x-auto -mx-1 mb-2">
        <table className="w-full text-xs" style={{ minWidth: 860 }}>
          <thead><tr style={{ background: "#F1F3F5" }}>
            <th className="text-left px-2 py-2 font-semibold">Locataire</th>
            <th className="text-left px-2 py-2 font-semibold w-24">Lot</th>
            <th className="text-right px-2 py-2 font-semibold w-28">Loyer prévu</th>
            <th className="text-right px-2 py-2 font-semibold w-28">Encaissé</th>
            <th className="text-left px-2 py-2 font-semibold w-32">Date paiement</th>
            <th className="text-center px-2 py-2 font-semibold w-20">Statut</th>
            <th className="text-right px-2 py-2 font-semibold w-24">Arriéré</th>
            <th className="text-right px-2 py-2 font-semibold w-24">Charges</th>
            <th className="text-left px-2 py-2 font-semibold w-32">Commentaire</th>
            {!readOnly && <th className="w-8" />}
          </tr></thead>
          <tbody>{lines.map((l, i) => {
            const vacant = isVacantLine(l);
            const st = PAY_STATUS[payStatusOf(l.expected, l.collected, vacant)];
            const arr = vacant ? 0 : Math.max(0, (Number(l.expected) || 0) - (Number(l.collected) || 0));
            return (
              <tr key={i} className="border-b" style={{ borderColor: "var(--line)" }}>
                <td className="px-1 py-1"><input disabled={readOnly} className="w-full px-2 py-1.5 rounded border text-xs" style={inputStyle} value={l.tenantName} onChange={(e) => setLine(i, "tenantName", e.target.value)} placeholder="Nom du locataire" /></td>
                <td className="px-1 py-1"><input disabled={readOnly} className="w-full px-2 py-1.5 rounded border text-xs" style={inputStyle} value={l.unitLabel} onChange={(e) => setLine(i, "unitLabel", e.target.value)} placeholder="Appt A1" /></td>
                <td className="px-1 py-1"><input disabled={readOnly || vacant} type="number" min={0} step={5000} className="w-full px-2 py-1.5 rounded border text-xs text-right" style={inputStyle} value={vacant ? 0 : l.expected} onChange={(e) => setLine(i, "expected", e.target.value)} /></td>
                <td className="px-1 py-1"><input disabled={readOnly || vacant} type="number" min={0} step={5000} className="w-full px-2 py-1.5 rounded border text-xs text-right" style={inputStyle} value={vacant ? 0 : l.collected} onChange={(e) => setLine(i, "collected", e.target.value)} /></td>
                <td className="px-1 py-1"><input disabled={readOnly} type="date" className="w-full px-2 py-1.5 rounded border text-xs" style={inputStyle} value={l.paidAt || ""} onChange={(e) => setLine(i, "paidAt", e.target.value)} /></td>
                <td className="px-1 py-1 text-center">
                  <button disabled={readOnly} title={readOnly ? "" : "Cliquer pour basculer entre lot vacant et lot loué"}
                    onClick={() => setLines((p) => p.map((x, j) => (j === i
                      ? { ...x, vacant: !isVacantLine(x), ...(isVacantLine(x) ? {} : { expected: 0, collected: 0, paidAt: "", charges: 0, comment: "Lot vacant" }) }
                      : x)))}
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: st.bg, color: st.color, border: "none" }}>{st.label}</button>
                </td>
                <td className="px-2 py-1 text-right font-medium tabular-nums" style={{ color: arr > 0 ? "#D81F26" : "var(--muted)" }}>{fcfa(arr)}</td>
                <td className="px-1 py-1"><input disabled={readOnly} type="number" min={0} step={1000} className="w-full px-2 py-1.5 rounded border text-xs text-right" style={inputStyle} value={l.charges} onChange={(e) => setLine(i, "charges", e.target.value)} /></td>
                <td className="px-1 py-1"><input disabled={readOnly} className="w-full px-2 py-1.5 rounded border text-xs" style={inputStyle} value={l.comment} onChange={(e) => setLine(i, "comment", e.target.value)} /></td>
                {!readOnly && <td className="px-1"><button onClick={() => setLines((p) => p.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500"><X size={13} /></button></td>}
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {!readOnly && <button onClick={() => setLines((p) => [...p, { unitLabel: "", tenantName: "", expected: 0, collected: 0, charges: 0, comment: "" }])} className="kb-btn kb-btn-ghost text-sm mb-4"><Plus size={14} /> Ajouter un locataire</button>}

      {/* Bilan + charges + règlement */}
      <div className="grid lg:grid-cols-2 gap-4 mb-3">
        <div className="rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
          <p className="text-xs font-bold mb-2">BILAN DU MOIS</p>
          {[["Lots du bâtiment", lines.length], ["Lots vacants (non comptés)", t.nVacant],
            ["Locataires concernés", t.nActive], ["Ayant payé intégralement", t.nPaid],
            ["Reliquats à verser", t.nPartial], ["Impayés", t.nUnpaid],
            ["Locataires en arriéré", t.nPartial + t.nUnpaid]].map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs py-1"><span style={{ color: "var(--muted)" }}>{k}</span><span className="font-semibold">{v}</span></div>
          ))}
          <div className="border-t my-1.5" style={{ borderColor: "var(--line)" }} />
          {[["Total loyers prévus", t.expected], ["Total encaissé", t.collected], ["Total arriérés", t.arrears],
            ["Charges prélevées", t.deducted], ["Net après charges", t.netAfter]].map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs py-1"><span style={{ color: "var(--muted)" }}>{k}</span><span className="font-semibold tabular-nums">{fcfa(v)}</span></div>
          ))}
        </div>

        <div className="rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
          <p className="text-xs font-bold mb-2">CHARGES DU MOIS</p>
          <div className="space-y-1.5">
            {chargeIdx.map(([c, i]) => (
              <div key={i} className="flex gap-1.5">
                <input disabled={readOnly} className="flex-1 px-2 py-1.5 rounded border text-xs" style={inputStyle} value={c.label} onChange={(e) => setCharge(i, "label", e.target.value)} placeholder="Désignation" />
                <input disabled={readOnly} type="number" min={0} step={1000} className="w-24 px-2 py-1.5 rounded border text-xs text-right" style={inputStyle} value={c.amount} onChange={(e) => setCharge(i, "amount", e.target.value)} />
                {!readOnly && <button onClick={() => setCharges((p) => p.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500 px-1"><X size={13} /></button>}
              </div>
            ))}
          </div>
          {!readOnly && <button onClick={() => setCharges((p) => [...p, { label: "", amount: 0, observation: "", kind: "charge" }])} className="kb-btn kb-btn-ghost text-xs mt-2"><Plus size={12} /> Ligne</button>}
          <div className="flex justify-between text-xs pt-2 mt-2 border-t font-bold" style={{ borderColor: "var(--line)" }}>
            <span>TOTAL CHARGES</span><span className="tabular-nums">{fcfa(t.chargesTotal)}</span>
          </div>
        </div>
      </div>

      {/* --- Sommes à verser EN PLUS du loyer --- */}
      <div className="rounded-xl border p-3 mb-3" style={{ borderColor: "#4F9E2A55", background: "#F6FBF3" }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold" style={{ color: "#3d7d20" }}>SOMMES À VERSER EN PLUS DU LOYER</p>
          {!readOnly && (
            <select className="text-xs px-2 py-1 rounded border bg-white" style={inputStyle} value=""
              onChange={(e) => { if (e.target.value) setCharges((p) => [...p, { label: e.target.value, amount: 0, observation: "", kind: "supplement" }]); }}>
              <option value="">+ Ajouter…</option>
              {SUPPLEMENT_PRESETS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
        </div>
        <p className="text-[11px] mb-2" style={{ color: "var(--muted)" }}>Caution encaissée à reverser, reliquat du mois précédent, remboursement…</p>
        <div className="space-y-1.5">
          {supplementIdx.map(([c, i]) => (
            <div key={i} className="flex gap-1.5">
              <input disabled={readOnly} className="flex-1 px-2 py-1.5 rounded border text-xs" style={inputStyle} value={c.label} onChange={(e) => setCharge(i, "label", e.target.value)} placeholder="Désignation" />
              <input disabled={readOnly} className="w-32 px-2 py-1.5 rounded border text-xs" style={inputStyle} value={c.observation || ""} onChange={(e) => setCharge(i, "observation", e.target.value)} placeholder="Observation" />
              <input disabled={readOnly} type="number" min={0} step={1000} className="w-24 px-2 py-1.5 rounded border text-xs text-right" style={inputStyle} value={c.amount} onChange={(e) => setCharge(i, "amount", e.target.value)} />
              {!readOnly && <button onClick={() => setCharges((p) => p.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500 px-1"><X size={13} /></button>}
            </div>
          ))}
          {supplementIdx.length === 0 && <p className="text-[11px] text-center py-2" style={{ color: "#B6BEC9" }}>Aucune somme supplémentaire ce mois-ci.</p>}
        </div>
        {!readOnly && <button onClick={() => setCharges((p) => [...p, { label: "", amount: 0, observation: "", kind: "supplement" }])} className="kb-btn kb-btn-ghost text-xs mt-2"><Plus size={12} /> Ligne libre</button>}
        {supplementIdx.length > 0 && (
          <div className="flex justify-between text-xs pt-2 mt-2 border-t font-bold" style={{ borderColor: "#4F9E2A33" }}>
            <span>TOTAL À VERSER EN PLUS</span><span className="tabular-nums" style={{ color: "#3d7d20" }}>+ {fcfa(t.supplementsTotal)}</span>
          </div>
        )}
      </div>

      <div className="rounded-xl p-3 mb-3" style={{ background: "#F6F8FA" }}>
        <p className="text-xs font-bold mb-2">RÈGLEMENT PROPRIÉTAIRE</p>
        {[["Loyers encaissés (base)", t.collected, ""],
          ...(t.deducted ? [["Charges retenues sur locataires", t.deducted, "-"]] : []),
          ...(t.chargesTotal ? [["Charges du mois (immeuble)", t.chargesTotal, "-"]] : []),
          [`Prestation agence (${(Number(rate) * 100).toFixed(0)} %)`, t.fee, "-"],
          ...(t.supplementsTotal ? [["Sommes à verser en plus", t.supplementsTotal, "+"]] : [])].map(([k, v, sign]) => (
          <div key={k} className="flex justify-between text-xs py-1">
            <span style={{ color: "var(--muted)" }}>{k}</span>
            <span className="font-semibold tabular-nums" style={{ color: sign === "+" ? "#3d7d20" : sign === "-" ? "#B5171D" : "var(--ink)" }}>{sign} {fcfa(v)}</span>
          </div>
        ))}
        <div className="flex justify-between items-center pt-2 mt-1 border-t" style={{ borderColor: "var(--line)" }}>
          <span className="text-sm font-bold">NET À PAYER AU PROPRIÉTAIRE</span>
          <span className="text-lg font-bold tabular-nums" style={{ color: "var(--brass)" }}>{fcfa(t.netOwner)}</span>
        </div>
      </div>

      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="kb-btn kb-btn-ghost">{readOnly ? "Fermer" : "Annuler"}</button>
        {!readOnly && <button disabled={busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> {busy ? "…" : "Enregistrer"}</button>}
      </div>
    </Modal>
  );
}

/* ================= État imprimable ================= */
function PeriodSheet({ period, property, owner, lines, charges, author, onBack }) {
  const t = periodTotals(lines, charges, period.rate);
  const sc = RENT_SCOPE[period.scope] || RENT_SCOPE.commercial;
  const arrearsRows = lines
    .filter((l) => !isVacantLine(l))          // un lot vacant n'est pas un impayé
    .map((l) => ({ ...l, due: Math.max(0, (Number(l.expected) || 0) - (Number(l.collected) || 0)) }))
    .filter((l) => l.due > 0)
    .sort((a, b) => b.due - a.due);
  return (
    <div>
      <div className="flex items-center justify-between mb-3 print:hidden gap-2 flex-wrap">
        <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour</button>
        <button onClick={() => printSheet("landscape")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF (paysage)</button>
      </div>

      <div id="print-area" className="bg-white rounded-xl border p-6" style={{ borderColor: "var(--line)" }}>
        <PrintHead title={sc.label} subtitle={periodLabel(period.period)} extra={
          <p className="text-[11px]" style={{ color: "var(--muted)" }}>Édité le {fr(new Date(), { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
        } />

        <div className="grid sm:grid-cols-4 gap-3 py-3 text-xs">
          <div><p style={{ color: "var(--muted)" }}>Propriétaire</p><p className="font-semibold">{owner?.name || "—"}</p></div>
          <div><p style={{ color: "var(--muted)" }}>Immeuble</p><p className="font-semibold">{property?.name || "—"}</p></div>
          <div><p style={{ color: "var(--muted)" }}>Adresse</p><p className="font-semibold">{[property?.quartier, property?.commune].filter(Boolean).join(", ") || "—"}</p></div>
          <div><p style={{ color: "var(--muted)" }}>Locataires</p><p className="font-semibold">{t.nActive}{t.nVacant > 0 ? ` (+${t.nVacant} vacant${t.nVacant > 1 ? "s" : ""})` : ""}</p></div>
        </div>

        <table className="w-full text-[11px] mb-4">
          <thead><tr style={{ background: "#F1F3F5" }}>
            <th className="text-left px-2 py-1.5 font-semibold">N°</th>
            <th className="text-left px-2 py-1.5 font-semibold">Locataire</th>
            <th className="text-left px-2 py-1.5 font-semibold">Lot</th>
            <th className="text-right px-2 py-1.5 font-semibold">Loyer prévu</th>
            <th className="text-right px-2 py-1.5 font-semibold">Encaissé</th>
            <th className="text-left px-2 py-1.5 font-semibold">Date</th>
            <th className="text-center px-2 py-1.5 font-semibold">Statut</th>
            <th className="text-right px-2 py-1.5 font-semibold">Arriéré</th>
            <th className="text-right px-2 py-1.5 font-semibold">Charges</th>
            <th className="text-right px-2 py-1.5 font-semibold">Net</th>
          </tr></thead>
          <tbody>{lines.map((l, i) => {
            const vacant = isVacantLine(l);
            const st = PAY_STATUS[payStatusOf(l.expected, l.collected, vacant)];
            const arr = vacant ? 0 : Math.max(0, (Number(l.expected) || 0) - (Number(l.collected) || 0));
            return (
              <tr key={i} className="border-b" style={{ borderColor: "var(--line)" }}>
                <td className="px-2 py-1.5">{i + 1}</td>
                <td className="px-2 py-1.5 font-medium">{l.tenantName || (vacant ? "— lot vacant —" : "—")}</td>
                <td className="px-2 py-1.5">{l.unitLabel}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fcfa(l.expected)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fcfa(l.collected)}</td>
                <td className="px-2 py-1.5">{l.paidAt ? fr(l.paidAt + "T00:00:00", { day: "2-digit", month: "2-digit" }) : "—"}</td>
                <td className="px-2 py-1.5 text-center"><span className="font-bold" style={{ color: st.color }}>{st.label}</span></td>
                <td className="px-2 py-1.5 text-right tabular-nums" style={{ color: arr > 0 ? "#D81F26" : "inherit" }}>{vacant ? "—" : fcfa(arr)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fcfa(l.charges)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums font-medium">{fcfa((Number(l.collected) || 0) - (Number(l.charges) || 0))}</td>
              </tr>
            );
          })}</tbody>
          <tfoot><tr style={{ background: "#F1F3F5" }}>
            <td colSpan={3} className="px-2 py-2 font-bold">TOTAUX</td>
            <td className="px-2 py-2 text-right font-bold tabular-nums">{fcfa(t.expected)}</td>
            <td className="px-2 py-2 text-right font-bold tabular-nums">{fcfa(t.collected)}</td>
            <td colSpan={2} />
            <td className="px-2 py-2 text-right font-bold tabular-nums">{fcfa(t.arrears)}</td>
            <td className="px-2 py-2 text-right font-bold tabular-nums">{fcfa(t.deducted)}</td>
            <td className="px-2 py-2 text-right font-bold tabular-nums">{fcfa(t.netAfter)}</td>
          </tr></tfoot>
        </table>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold mb-1.5">CHARGES DU MOIS</p>
            <table className="w-full text-[11px]">
              <tbody>{t.chargeRows.filter((c) => c.label).map((c, i) => (
                <tr key={i} className="border-b" style={{ borderColor: "var(--line)" }}>
                  <td className="px-2 py-1">{c.label}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{fcfa(c.amount)}</td>
                </tr>
              ))}</tbody>
              <tfoot><tr style={{ background: "#F1F3F5" }}>
                <td className="px-2 py-1.5 font-bold">TOTAL CHARGES</td>
                <td className="px-2 py-1.5 text-right font-bold tabular-nums">{fcfa(t.chargesTotal)}</td>
              </tr></tfoot>
            </table>

            {t.supplementRows.length > 0 && <>
              <p className="text-xs font-bold mb-1.5 mt-3">SOMMES À VERSER EN PLUS</p>
              <table className="w-full text-[11px]">
                <tbody>{t.supplementRows.filter((c) => c.label).map((c, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: "var(--line)" }}>
                    <td className="px-2 py-1">{c.label}{c.observation ? ` — ${c.observation}` : ""}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fcfa(c.amount)}</td>
                  </tr>
                ))}</tbody>
                <tfoot><tr style={{ background: "#F1F3F5" }}>
                  <td className="px-2 py-1.5 font-bold">TOTAL SUPPLÉMENTS</td>
                  <td className="px-2 py-1.5 text-right font-bold tabular-nums">{fcfa(t.supplementsTotal)}</td>
                </tr></tfoot>
              </table>
            </>}
          </div>
          <div>
            <p className="text-xs font-bold mb-1.5">RÈGLEMENT PROPRIÉTAIRE</p>
            <table className="w-full text-[11px]">
              <tbody>
                <tr className="border-b" style={{ borderColor: "var(--line)" }}><td className="px-2 py-1">Loyers encaissés</td><td className="px-2 py-1 text-right tabular-nums">{fcfa(t.collected)}</td></tr>
                <tr className="border-b" style={{ borderColor: "var(--line)" }}><td className="px-2 py-1">Charges retenues sur locataires</td><td className="px-2 py-1 text-right tabular-nums">− {fcfa(t.deducted)}</td></tr>
                <tr className="border-b" style={{ borderColor: "var(--line)" }}><td className="px-2 py-1">Charges du mois (immeuble)</td><td className="px-2 py-1 text-right tabular-nums">− {fcfa(t.chargesTotal)}</td></tr>
                <tr className="border-b" style={{ borderColor: "var(--line)" }}><td className="px-2 py-1">Prestation agence ({(period.rate * 100).toFixed(0)} %)</td><td className="px-2 py-1 text-right tabular-nums">− {fcfa(t.fee)}</td></tr>
                {t.supplementsTotal > 0 && <tr className="border-b" style={{ borderColor: "var(--line)" }}>
                  <td className="px-2 py-1" style={{ color: "#3d7d20" }}>Sommes à verser en plus</td>
                  <td className="px-2 py-1 text-right tabular-nums" style={{ color: "#3d7d20" }}>+ {fcfa(t.supplementsTotal)}</td>
                </tr>}
              </tbody>
              <tfoot><tr style={{ background: "#F1F3F5" }}>
                <td className="px-2 py-2 font-bold">NET À PAYER</td>
                <td className="px-2 py-2 text-right font-bold tabular-nums" style={{ color: "var(--brass)" }}>{fcfa(t.netOwner)}</td>
              </tr></tfoot>
            </table>
          </div>
        </div>

        {t.netOwner > 0 && <p className="text-[11px] italic mt-3">Arrêté le présent état à la somme de <strong>{amountInWords(t.netOwner)}</strong> à verser au propriétaire.</p>}

        {arrearsRows.length > 0 && (
          <p className="text-[11px] italic mt-3 print:hidden" style={{ color: "var(--muted)" }}>
            {arrearsRows.length} locataire(s) en arriéré pour {fcfa(t.arrears)} — l'état des arriérés s'édite séparément.
          </p>
        )}

        <div className="kb-sign flex justify-end pt-10 mt-6">
          <div className="text-center" style={{ minWidth: 210 }}>
            <p className="text-[11px] font-semibold pb-20">Pour l'Agence</p>
            <div className="border-t" style={{ borderColor: "var(--ink)" }} />
          </div>
        </div>
        <PrintFoot note={`État établi par ${author?.name || "—"} · Taux de recouvrement du mois : ${(t.rateCollected * 100).toFixed(1)} %`} />
      </div>
    </div>
  );
}


/* ---------------- État des arriérés (document distinct, à la demande) ---------------- */
function ArrearsSheet({ period, property, owner, lines, author, onBack }) {
  const rows = lines
    .filter((l) => !isVacantLine(l))
    .map((l) => ({ ...l, due: Math.max(0, (Number(l.expected) || 0) - (Number(l.collected) || 0)) }))
    .filter((l) => l.due > 0)
    .sort((a, b) => b.due - a.due);
  const total = rows.reduce((a, r) => a + r.due, 0);
  const nPartial = rows.filter((r) => Number(r.collected) > 0).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 print:hidden gap-2 flex-wrap">
        <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour</button>
        <button onClick={() => printSheet("landscape")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF (paysage)</button>
      </div>

      <div id="print-area" className="bg-white rounded-xl border p-6" style={{ borderColor: "var(--line)" }}>
        <PrintHead title="ÉTAT DES ARRIÉRÉS" subtitle={periodLabel(period.period)} extra={
          <p className="text-[11px]" style={{ color: "var(--muted)" }}>Édité le {fr(new Date(), { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
        } />

        <div className="grid sm:grid-cols-4 gap-3 py-3 text-xs">
          <div><p style={{ color: "var(--muted)" }}>Propriétaire</p><p className="font-semibold">{owner?.name || "—"}</p></div>
          <div><p style={{ color: "var(--muted)" }}>Immeuble</p><p className="font-semibold">{property?.name || "—"}</p></div>
          <div><p style={{ color: "var(--muted)" }}>Adresse</p><p className="font-semibold">{[property?.quartier, property?.commune].filter(Boolean).join(", ") || "—"}</p></div>
          <div><p style={{ color: "var(--muted)" }}>Locataires en arriéré</p><p className="font-semibold">{rows.length}{nPartial > 0 ? ` (dont ${nPartial} reliquat${nPartial > 1 ? "s" : ""})` : ""}</p></div>
        </div>

        {rows.length ? (
          <table className="w-full text-[11px]">
            <thead><tr style={{ background: "#FDEAEA" }}>
              <th className="text-left px-2 py-1.5 font-semibold">N°</th>
              <th className="text-left px-2 py-1.5 font-semibold">Locataire</th>
              <th className="text-left px-2 py-1.5 font-semibold">Lot</th>
              <th className="text-left px-2 py-1.5 font-semibold">Contact</th>
              <th className="text-right px-2 py-1.5 font-semibold">Loyer prévu</th>
              <th className="text-right px-2 py-1.5 font-semibold">Encaissé</th>
              <th className="text-right px-2 py-1.5 font-semibold">Reste dû</th>
              <th className="text-left px-2 py-1.5 font-semibold">Situation</th>
              <th className="text-left px-2 py-1.5 font-semibold">Observation</th>
            </tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={i} className="border-b" style={{ borderColor: "var(--line)" }}>
                <td className="px-2 py-1.5">{i + 1}</td>
                <td className="px-2 py-1.5 font-medium">{r.tenantName || "—"}</td>
                <td className="px-2 py-1.5">{r.unitLabel}</td>
                <td className="px-2 py-1.5">{r.tenantPhone || "—"}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fcfa(r.expected)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fcfa(r.collected)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums font-bold" style={{ color: "#D81F26" }}>{fcfa(r.due)}</td>
                <td className="px-2 py-1.5">{Number(r.collected) > 0 ? "Reliquat à verser" : "Impayé"}</td>
                <td className="px-2 py-1.5">{r.comment || ""}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{ background: "#FDEAEA" }}>
              <td colSpan={6} className="px-2 py-2 font-bold">TOTAL DES ARRIÉRÉS</td>
              <td className="px-2 py-2 text-right font-bold tabular-nums" style={{ color: "#D81F26" }}>{fcfa(total)}</td>
              <td colSpan={2} />
            </tr></tfoot>
          </table>
        ) : (
          <p className="text-sm text-center py-10" style={{ color: "#3d7d20" }}>
            Aucun arriéré sur la période : tous les loyers dus ont été encaissés.
          </p>
        )}

        {total > 0 && <p className="text-[11px] italic mt-3">
          Arrêté le présent état des arriérés à la somme de <strong>{amountInWords(total)}</strong>, restant due par les locataires.
        </p>}
        <p className="text-[10px] mt-2" style={{ color: "var(--muted)" }}>
          Ces sommes ne sont pas encaissées : elles n'entrent pas dans le règlement du propriétaire.
          Les lots vacants ne figurent pas dans cet état.
        </p>

        <div className="kb-sign flex justify-end pt-10">
          <div className="text-center" style={{ minWidth: 210 }}>
            <p className="text-[11px] font-semibold pb-20">Pour l'Agence</p>
            <div className="border-t" style={{ borderColor: "var(--ink)" }} />
          </div>
        </div>
        <PrintFoot note={author ? `État établi par ${author.name}` : undefined} />
      </div>
    </div>
  );
}

/* ================= Vue principale ================= */
function Recouvrement({ store, me, userId }) {
  const { properties, owners, units, rentPeriods, rentLines, rentCharges, members, actions } = store;
  const [scope, setScope] = useState("commercial");
  const [filterProp, setFilterProp] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState(currentPeriod());
  const [editor, setEditor] = useState(null);
  const [sheetId, setSheetId] = useState(null);
  const [arrearsId, setArrearsId] = useState(null);
  const [creator, setCreator] = useState(false);

  const propById = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p])), [properties]);
  const ownerById = useMemo(() => Object.fromEntries(owners.map((o) => [o.id, o])), [owners]);
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  /* Suivi commercial : modifiable par son auteur (et l'administrateur).
     État comptable : lecture pour tous, modification réservée aux administrateurs. */
  const canEditPeriod = (p) => p.scope === "comptable"
    ? isAdmin(me.role)
    : (p.createdBy === userId || isAdmin(me.role));

  const arrSheet = rentPeriods.find((p) => p.id === arrearsId);
  if (arrSheet) {
    return <ArrearsSheet period={arrSheet} property={propById[arrSheet.propertyId]}
      owner={ownerById[propById[arrSheet.propertyId]?.ownerId]}
      lines={rentLines.filter((l) => l.periodId === arrSheet.id)}
      author={memberById[arrSheet.createdBy]} onBack={() => setArrearsId(null)} />;
  }

  const sheet = rentPeriods.find((p) => p.id === sheetId);
  if (sheet) {
    return <PeriodSheet period={sheet} property={propById[sheet.propertyId]} owner={ownerById[propById[sheet.propertyId]?.ownerId]}
      lines={rentLines.filter((l) => l.periodId === sheet.id)} charges={rentCharges.filter((c) => c.periodId === sheet.id)}
      author={memberById[sheet.createdBy]} onBack={() => setSheetId(null)} />;
  }

  const list = rentPeriods.filter((p) => p.scope === scope &&
    (filterProp === "all" || p.propertyId === filterProp) &&
    (filterPeriod === "all" || p.period === filterPeriod));

  /* Consolidé du mois affiché */
  const global = list.reduce((acc, p) => {
    const t = periodTotals(rentLines.filter((l) => l.periodId === p.id), rentCharges.filter((c) => c.periodId === p.id), p.rate);
    return { expected: acc.expected + t.expected, collected: acc.collected + t.collected,
      arrears: acc.arrears + t.arrears, fee: acc.fee + t.fee };
  }, { expected: 0, collected: 0, arrears: 0, fee: 0 });
  const globalRate = global.expected > 0 ? (global.collected / global.expected) * 100 : 0;

  const periodOptions = [...new Set(rentPeriods.map((p) => p.period))].sort().reverse();

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Recouvrement</h1>
        <button onClick={() => setCreator(true)} className="kb-btn kb-btn-primary"><Plus size={16} /> Nouveau tableau</button>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Un tableau par bâtiment et par mois. Chaque auteur modifie ses propres tableaux ; la direction consulte l'ensemble.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Wallet} label="Loyers prévus" value={fcfa(global.expected)} sub={periodLabel(filterPeriod === "all" ? currentPeriod() : filterPeriod)} tint="#2E78A8" />
        <StatCard icon={TrendingUp} label="Encaissé" value={fcfa(global.collected)} sub={`${globalRate.toFixed(1)} % de recouvrement`} tint="#4F9E2A" />
        <StatCard icon={AlertTriangle} label="Arriérés" value={fcfa(global.arrears)} tint="#D81F26" />
        <StatCard icon={BarChart3} label="Prestation agence" value={fcfa(global.fee)} tint="var(--brass)" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg border overflow-hidden" style={inputStyle}>
          {Object.entries(RENT_SCOPE).map(([k, v]) => (
            <button key={k} onClick={() => setScope(k)} className="px-3 py-2 text-sm whitespace-nowrap"
              style={{ background: scope === k ? v.color : "#fff", color: scope === k ? "#fff" : "var(--muted)" }}>{v.label}</button>
          ))}
        </div>
        <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Tous les mois</option>
          {[...new Set([currentPeriod(), ...periodOptions])].sort().reverse().map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}
        </select>
        <select value={filterProp} onChange={(e) => setFilterProp(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Tous les bâtiments</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
        {RENT_SCOPE[scope].desc}
        {scope === "comptable" && " — consultable par toute l'équipe ; modification réservée à l'administrateur."}
      </p>

      {list.length ? <div className="space-y-2">
        {list.map((p) => {
          const lines = rentLines.filter((l) => l.periodId === p.id);
          const charges = rentCharges.filter((c) => c.periodId === p.id);
          const t = periodTotals(lines, charges, p.rate);
          const prop = propById[p.propertyId];
          const st = RENT_STATUS[p.status];
          const mine = canEditPeriod(p);
          return (
            <div key={p.id} className="bg-white rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{prop?.name || "Bâtiment supprimé"}</p>
                    <Chip color={RENT_SCOPE[p.scope].color}>{periodLabel(p.period)}</Chip>
                    <Chip color={st.color} dot>{st.label}</Chip>
                    {!mine && <Chip color="#94A3B8"><Lock size={10} /> lecture</Chip>}
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
                    {t.nActive} locataire(s){t.nVacant > 0 ? ` · ${t.nVacant} lot(s) vacant(s)` : ""} · {t.nPaid} à jour ·{" "}
                    <strong style={{ color: (t.nPartial + t.nUnpaid) > 0 ? "#D81F26" : "var(--muted)" }}>
                      {t.nPartial + t.nUnpaid} en arriéré
                    </strong>{t.nPartial > 0 ? ` (dont ${t.nPartial} reliquat(s))` : ""}
                    {" · "}établi par {memberById[p.createdBy]?.name || "—"}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs">
                    <span style={{ color: "var(--muted)" }}>Prévu <strong style={{ color: "var(--ink)" }}>{fcfa(t.expected)}</strong></span>
                    <span style={{ color: "var(--muted)" }}>Encaissé <strong style={{ color: "#4F9E2A" }}>{fcfa(t.collected)}</strong></span>
                    <span style={{ color: "var(--muted)" }}>Arriérés <strong style={{ color: t.arrears > 0 ? "#D81F26" : "var(--ink)" }}>{fcfa(t.arrears)}</strong></span>
                    <span style={{ color: "var(--muted)" }}>Net propriétaire <strong style={{ color: "var(--brass)" }}>{fcfa(t.netOwner)}</strong></span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden" style={{ maxWidth: 260 }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, t.rateCollected * 100)}%`, background: t.rateCollected >= 0.9 ? "#4F9E2A" : t.rateCollected >= 0.6 ? "#C58A1B" : "#D81F26" }} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {mine && <select value={p.status} onChange={(e) => actions.setPeriodStatus(p.id, e.target.value)}
                    className="text-xs px-2 py-1 rounded-lg border bg-white" style={{ borderColor: st.color + "55", color: st.color }}>
                    {Object.entries(RENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>}
                  <div className="flex gap-1">
                    <button onClick={() => setSheetId(p.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="État de recouvrement (PDF)"><Printer size={14} /></button>
                    {(t.nPartial + t.nUnpaid) > 0 && (
                      <button onClick={() => setArrearsId(p.id)} className="p-1.5 rounded-lg hover:bg-red-50" style={{ color: "#D81F26" }} title="État des arriérés (document séparé)"><AlertTriangle size={14} /></button>
                    )}
                    <button onClick={() => setEditor({ period: p, readOnly: !mine })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title={mine ? "Modifier" : "Consulter"}>{mine ? <Pencil size={14} /> : <Eye size={14} />}</button>
                    {isAdmin(me.role) && <button onClick={async () => { if (confirm("Supprimer ce tableau ?")) await actions.deletePeriod(p.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div> : <EmptyState icon={FileSpreadsheet} title="Aucun tableau pour ce filtre"
        sub="Créez le tableau du mois pour un bâtiment."
        action={<button onClick={() => setCreator(true)} className="kb-btn kb-btn-primary"><Plus size={15} /> Nouveau tableau</button>} />}

      {creator && <CreatorModal properties={properties} scope={isAdmin(me.role) ? scope : "commercial"} existing={rentPeriods} isAdminUser={isAdmin(me.role)}
        onCreate={async (f) => { const r = await actions.savePeriod(f); if (!r.error && r.id) { setCreator(false); const np = { ...f, id: r.id, createdBy: userId }; setEditor({ period: np, readOnly: false }); } return r; }}
        onClose={() => setCreator(false)} />}

      {editor && <PeriodEditor period={editor.period} property={propById[editor.period.propertyId]}
        owner={ownerById[propById[editor.period.propertyId]?.ownerId]} units={units}
        lines0={rentLines.filter((l) => l.periodId === editor.period.id)}
        charges0={rentCharges.filter((c) => c.periodId === editor.period.id)}
        seed={seedPeriod({ period: editor.period, rentPeriods, rentLines, rentCharges, units })}
        readOnly={editor.readOnly}
        onSave={async (p, lines, charges) => {
          const r1 = await actions.savePeriod(p);
          if (r1.error) return r1;
          return await actions.savePeriodContent(p.id, lines, charges);
        }}
        onClose={() => setEditor(null)} />}
    </div>
  );
}

function CreatorModal({ properties, scope, existing, onCreate, onClose, isAdminUser }) {
  const [f, setF] = useState({ propertyId: properties[0]?.id || "", period: currentPeriod(), scope, rate: 0.07, status: "brouillon" });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const dup = existing.some((p) => p.propertyId === f.propertyId && p.period === f.period && p.scope === f.scope);
  const submit = async () => {
    setBusy(true); const r = await onCreate(f); setBusy(false);
    if (r?.error) setErr(r.error);
  };
  const [y, m] = f.period.split("-");
  return (
    <Modal title="Nouveau tableau de recouvrement" onClose={onClose}>
      <Field label="Type de tableau">
        <select className={inputCls} style={inputStyle} value={f.scope} onChange={(e) => setF((p) => ({ ...p, scope: e.target.value }))}>
          {Object.entries(RENT_SCOPE)
            .filter(([k]) => k !== "comptable" || isAdminUser)
            .map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </Field>
      <Field label="Bâtiment">
        <select className={inputCls} style={inputStyle} value={f.propertyId} onChange={(e) => setF((p) => ({ ...p, propertyId: e.target.value }))}>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Mois">
          <select className={inputCls} style={inputStyle} value={Number(m)} onChange={(e) => setF((p) => ({ ...p, period: `${y}-${String(e.target.value).padStart(2, "0")}` }))}>
            {MONTHS_FR.map((mo, i) => <option key={i} value={i + 1}>{mo}</option>)}
          </select>
        </Field>
        <Field label="Année"><input type="number" className={inputCls} style={inputStyle} value={y} onChange={(e) => setF((p) => ({ ...p, period: `${e.target.value}-${m}` }))} /></Field>
        <Field label="Taux agence"><input type="number" min={0} max={1} step={0.01} className={inputCls} style={inputStyle} value={f.rate} onChange={(e) => setF((p) => ({ ...p, rate: e.target.value }))} /></Field>
      </div>
      {dup && <p className="text-xs mb-2" style={{ color: "#EA580C" }}>Un tableau existe déjà pour ce bâtiment, ce mois et ce type.</p>}
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!f.propertyId || dup || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> Créer et remplir</button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODULE TRANSPORT & ABSENCES
   ══════════════════════════════════════════════════════════════════════ */
const trCurrentPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const trPeriodLabel = (p) => { const [y, m] = (p || "").split("-"); return `${MONTHS_FR[Number(m) - 1] || ""} ${y || ""}`; };
const daysBetween = (a, b) => {
  if (!a || !b) return 1;
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000) + 1);
};

/* ================= Modale de demande ================= */
function RequestModal({ initial, properties, onSave, onClose }) {
  const [f, setF] = useState(() => ({
    reqType: "transport", date: isoDate(new Date()), amount: "", destination: "", mode: "taxi",
    propertyId: "", startDate: isoDate(new Date()), endDate: isoDate(new Date()),
    absenceType: "personnelle", motif: "", ...initial,
  }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const isTransport = f.reqType === "transport";
  const valid = f.motif.trim() && (!isTransport || Number(f.amount) > 0);
  const submit = async () => { setBusy(true); const r = await onSave(f); setBusy(false); if (r?.error) setErr(r.error); else onClose(); };

  return (
    <Modal title={f.id ? "Modifier la demande" : "Nouvelle demande"} onClose={onClose}>
      <Field label="Type de demande">
        <div className="flex gap-2">
          {Object.entries(REQ_TYPE).map(([k, v]) => (
            <button key={k} onClick={() => set("reqType", k)} className="flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
              style={{ background: f.reqType === k ? v.color : "#fff", color: f.reqType === k ? "#fff" : v.color, border: `1px solid ${v.color}55` }}>
              {k === "transport" ? <Car size={15} /> : <CalendarOff size={15} />} {v.label}
            </button>
          ))}
        </div>
      </Field>

      {isTransport ? (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Montant demandé (FCFA)"><input type="number" min={0} step={500} className={inputCls} style={inputStyle} value={f.amount} autoFocus onChange={(e) => set("amount", e.target.value)} placeholder="Ex. 3000" /></Field>
            <Field label="Date du déplacement"><input type="date" className={inputCls} style={inputStyle} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Moyen de transport">
              <select className={inputCls} style={inputStyle} value={f.mode} onChange={(e) => set("mode", e.target.value)}>
                {Object.entries(TRANSPORT_MODE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Destination"><input className={inputCls} style={inputStyle} value={f.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Ex. Yopougon Niangon" /></Field>
          </div>
          <Field label="Bien concerné (facultatif)">
            <select className={inputCls} style={inputStyle} value={f.propertyId || ""} onChange={(e) => set("propertyId", e.target.value)}>
              <option value="">— Aucun —</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </>
      ) : (
        <>
          <Field label="Nature de l'absence">
            <select className={inputCls} style={inputStyle} value={f.absenceType} onChange={(e) => set("absenceType", e.target.value)}>
              {Object.entries(ABSENCE_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Du"><input type="date" className={inputCls} style={inputStyle} value={f.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
            <Field label="Au"><input type="date" className={inputCls} style={inputStyle} value={f.endDate} onChange={(e) => set("endDate", e.target.value)} /></Field>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>Durée : <strong>{daysBetween(f.startDate, f.endDate)} jour(s)</strong></p>
        </>
      )}

      <Field label="Motif" hint="Expliquez brièvement la raison de votre demande">
        <textarea className={inputCls} style={inputStyle} rows={3} value={f.motif} onChange={(e) => set("motif", e.target.value)}
          placeholder={isTransport ? "Ex. Visite de l'immeuble avec un client" : "Ex. Rendez-vous administratif à la mairie"} />
      </Field>

      <div className="rounded-lg p-3 mb-3 text-xs" style={{ background: "#F6F8FA", color: "var(--muted)" }}>
        Votre demande sera transmise à la direction pour validation. Vous serez informé de la décision dans cette même page.
      </div>

      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!valid || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> Envoyer la demande</button>
      </div>
    </Modal>
  );
}

/* ================= Récapitulatif mensuel imprimable ================= */
function RecapSheet({ period, requests, members, properties, onBack }) {
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
  const propById = Object.fromEntries(properties.map((p) => [p.id, p]));
  const list = requests.filter((r) => r.reqType === "transport" && monthIso(r.date + "T00:00:00") === period && r.status === "approuve");
  const total = list.reduce((a, r) => a + r.amount, 0);

  const byUser = {};
  list.forEach((r) => {
    const n = memberById[r.userId]?.name || "—";
    byUser[n] = byUser[n] || { name: n, total: 0, count: 0 };
    byUser[n].total += r.amount; byUser[n].count += 1;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3 print:hidden gap-2 flex-wrap">
        <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour</button>
        <button onClick={() => printSheet("landscape")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF (paysage)</button>
      </div>

      <div id="print-area" className="bg-white rounded-xl border p-6" style={{ borderColor: "var(--line)" }}>
        <PrintHead title="FRAIS DE TRANSPORT" subtitle={trPeriodLabel(period)} />

        <table className="w-full text-[11px] my-4">
          <thead><tr style={{ background: "#F1F3F5" }}>
            <th className="text-left px-2 py-1.5 font-semibold">Date</th>
            <th className="text-left px-2 py-1.5 font-semibold">Collaborateur</th>
            <th className="text-left px-2 py-1.5 font-semibold">Destination</th>
            <th className="text-left px-2 py-1.5 font-semibold">Moyen</th>
            <th className="text-left px-2 py-1.5 font-semibold">Motif</th>
            <th className="text-right px-2 py-1.5 font-semibold">Montant</th>
          </tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r.id} className="border-b" style={{ borderColor: "var(--line)" }}>
              <td className="px-2 py-1.5">{fr(r.date + "T00:00:00", { day: "2-digit", month: "2-digit" })}</td>
              <td className="px-2 py-1.5 font-medium">{memberById[r.userId]?.name || "—"}</td>
              <td className="px-2 py-1.5">{r.destination || (propById[r.propertyId]?.name) || "—"}</td>
              <td className="px-2 py-1.5">{TRANSPORT_MODE[r.mode]}</td>
              <td className="px-2 py-1.5">{r.motif}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{fcfa(r.amount)}</td>
            </tr>
          ))}</tbody>
          <tfoot><tr style={{ background: "#F1F3F5" }}>
            <td colSpan={5} className="px-2 py-2 font-bold">TOTAL DU MOIS</td>
            <td className="px-2 py-2 text-right font-bold tabular-nums" style={{ color: "var(--brass)" }}>{fcfa(total)}</td>
          </tr></tfoot>
        </table>

        {total > 0 && <p className="text-[11px] italic mb-4">Arrêté le présent état à la somme de <strong>{amountInWords(total)}</strong>.</p>}

        <p className="text-xs font-bold mb-1.5">RÉPARTITION PAR COLLABORATEUR</p>
        <table className="w-full text-[11px] mb-4">
          <tbody>{Object.values(byUser).sort((a, b) => b.total - a.total).map((u, i) => (
            <tr key={i} className="border-b" style={{ borderColor: "var(--line)" }}>
              <td className="px-2 py-1">{u.name}</td>
              <td className="px-2 py-1 text-right" style={{ color: "var(--muted)" }}>{u.count} déplacement(s)</td>
              <td className="px-2 py-1 text-right tabular-nums font-medium">{fcfa(u.total)}</td>
            </tr>
          ))}</tbody>
        </table>

        <div className="kb-sign flex justify-between items-end pt-10">
          <div className="text-center" style={{ minWidth: 170 }}><p className="text-[11px] font-semibold pb-20">La Comptabilité</p><div className="border-t" style={{ borderColor: "var(--ink)" }} /></div>
          <div className="text-center" style={{ minWidth: 170 }}><p className="text-[11px] font-semibold pb-20">La Direction</p><div className="border-t" style={{ borderColor: "var(--ink)" }} /></div>
        </div>
        <PrintFoot />
      </div>
    </div>
  );
}

/* ================= Vue principale ================= */
function Transport({ store, me, userId }) {
  const { requests, members, properties, actions } = store;
  const [tab, setTab] = useState("mes");
  const [modal, setModal] = useState(null);
  const [period, setPeriod] = useState(trCurrentPeriod());
  const [recap, setRecap] = useState(false);
  const [decideOn, setDecideOn] = useState(null);

  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const propById = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p])), [properties]);
  const validator = canValidate(me.role);

  const mine = requests.filter((r) => r.userId === userId);
  const pending = requests.filter((r) => r.status === "en_attente");
  const monthReqs = requests.filter((r) => monthIso(r.date + "T00:00:00") === period);
  const monthTransport = monthReqs.filter((r) => r.reqType === "transport" && r.status === "approuve");
  const monthTotal = monthTransport.reduce((a, r) => a + r.amount, 0);

  const list = tab === "mes" ? mine : tab === "attente" ? pending : monthReqs;

  /* Analyse : 6 derniers mois */
  const trend = useMemo(() => {
    const m = {};
    requests.filter((r) => r.reqType === "transport" && r.status === "approuve").forEach((r) => {
      const k = monthIso(r.date + "T00:00:00");
      m[k] = m[k] || { key: k, name: monthLabel(k), value: 0 };
      m[k].value += r.amount;
    });
    return Object.values(m).sort((a, b) => a.key.localeCompare(b.key)).slice(-6);
  }, [requests]);

  const byUserMonth = useMemo(() => {
    const m = {};
    monthTransport.forEach((r) => {
      const n = memberById[r.userId]?.name?.split(" ")[0] || "—";
      m[n] = m[n] || { name: n, value: 0, color: memberById[r.userId]?.color || "#64748B" };
      m[n].value += r.amount;
    });
    return Object.values(m).sort((a, b) => b.value - a.value);
  }, [monthTransport, memberById]);

  /* Tous les hooks sont appelés avant tout retour anticipé */
  if (recap) return <RecapSheet period={period} requests={requests} members={members} properties={properties} onBack={() => setRecap(false)} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Transport & absences</h1>
        <button onClick={() => setModal({})} className="kb-btn kb-btn-primary"><Plus size={16} /> Nouvelle demande</button>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Demandes de frais de transport et de permission d'absence, validées par la direction.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Wallet} label={`Transport ${trPeriodLabel(period)}`} value={fcfa(monthTotal)} sub={`${monthTransport.length} déplacement(s)`} tint="#2E78A8" />
        <StatCard icon={Clock} label="En attente de décision" value={pending.length} tint="#C58A1B" onClick={() => setTab("attente")} />
        <StatCard icon={Car} label="Mes demandes" value={mine.length} sub={`${mine.filter((r) => r.status === "approuve").length} approuvée(s)`} tint="#4F9E2A" onClick={() => setTab("mes")} />
        <StatCard icon={CalendarOff} label="Absences du mois" value={monthReqs.filter((r) => r.reqType === "absence" && r.status === "approuve").length} tint="#7C3AED" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg border overflow-hidden" style={inputStyle}>
          {[["mes", "Mes demandes"], ...(validator ? [["attente", `À valider (${pending.length})`]] : []), ["mois", "Le mois"]].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} className="px-3 py-2 text-sm whitespace-nowrap"
              style={{ background: tab === v ? "var(--ink)" : "#fff", color: tab === v ? "#fff" : "var(--muted)" }}>{l}</button>
          ))}
        </div>
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
        {validator && <button onClick={() => setRecap(true)} className="kb-btn kb-btn-ghost text-sm"><Printer size={14} /> Récapitulatif du mois</button>}
      </div>

      {/* Analyse (direction) */}
      {validator && tab === "mois" && trend.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          <SectionCard title="Évolution des frais de transport" icon={BarChart3}>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={trend} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F5" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [fcfa(v), "Transport"]} />
                <Bar dataKey="value" radius={[5, 5, 0, 0]} fill="#2E78A8" />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
          <SectionCard title={`Par collaborateur — ${trPeriodLabel(period)}`} icon={Users} pad={false}>
            <div className="divide-y" style={{ borderColor: "var(--line)" }}>
              {byUserMonth.length ? byUserMonth.map((u, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm">{u.name}</span>
                  <span className="text-sm font-semibold tabular-nums">{fcfa(u.value)}</span>
                </div>
              )) : <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>Aucun frais approuvé ce mois.</p>}
            </div>
          </SectionCard>
        </div>
      )}

      {list.length ? <div className="space-y-2">
        {list.map((r) => {
          const cfg = REQ_TYPE[r.reqType]; const st = REQ_STATUS[r.status];
          const author = memberById[r.userId];
          const isTransport = r.reqType === "transport";
          const own = r.userId === userId;
          return (
            <div key={r.id} className="bg-white rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: cfg.color + "1A", color: cfg.color }}>
                    {isTransport ? <Car size={17} /> : <CalendarOff size={17} />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{isTransport ? fcfa(r.amount) : `${daysBetween(r.startDate, r.endDate)} jour(s)`}</p>
                      <Chip color={cfg.color}>{cfg.label}</Chip>
                      <Chip color={st.color} dot>{st.label}</Chip>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                      {author?.name || "—"} ·{" "}
                      {isTransport
                        ? `${TRANSPORT_MODE[r.mode]}${r.destination ? ` → ${r.destination}` : ""} · ${fr(r.date + "T00:00:00", { day: "numeric", month: "short" })}`
                        : `${ABSENCE_TYPE[r.absenceType]} · du ${fr(r.startDate + "T00:00:00", { day: "numeric", month: "short" })} au ${fr(r.endDate + "T00:00:00", { day: "numeric", month: "short" })}`}
                    </p>
                    <p className="text-xs mt-1">{r.motif}</p>
                    {r.decisionNote && <p className="text-[11px] mt-1 italic" style={{ color: st.color }}>Décision : {r.decisionNote}</p>}
                    {r.propertyId && <div className="mt-1.5"><Chip color="#2E78A8"><Building2 size={10} /> {propById[r.propertyId]?.name}</Chip></div>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {validator && r.status === "en_attente" && (
                    <div className="flex gap-1">
                      <button onClick={() => actions.decideRequest(r.id, "approuve", "")} className="kb-btn text-xs px-2.5 py-1.5" style={{ background: "#4F9E2A", color: "#fff" }}><ThumbsUp size={13} /> Approuver</button>
                      <button onClick={() => setDecideOn(r)} className="kb-btn text-xs px-2.5 py-1.5" style={{ background: "#fff", color: "#D81F26", border: "1px solid #D81F2655" }}><ThumbsDown size={13} /> Refuser</button>
                    </div>
                  )}
                  <div className="flex gap-1">
                    {own && r.status === "en_attente" && <button onClick={() => setModal(r)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Pencil size={14} /></button>}
                    {(own && r.status === "en_attente") || isAdmin(me.role) ? (
                      <button onClick={async () => { if (confirm("Supprimer cette demande ?")) await actions.deleteRequest(r.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div> : <EmptyState icon={Car} title="Aucune demande" sub={tab === "attente" ? "Aucune demande en attente de validation." : "Créez votre première demande de transport ou d'absence."}
        action={tab !== "attente" ? <button onClick={() => setModal({})} className="kb-btn kb-btn-primary"><Plus size={15} /> Nouvelle demande</button> : null} />}

      {modal && <RequestModal initial={modal} properties={properties} onSave={actions.saveRequest} onClose={() => setModal(null)} />}

      {decideOn && <RefuseModal request={decideOn}
        onConfirm={async (note) => { await actions.decideRequest(decideOn.id, "refuse", note); setDecideOn(null); }}
        onClose={() => setDecideOn(null)} />}
    </div>
  );
}

function RefuseModal({ request, onConfirm, onClose }) {
  const [note, setNote] = useState("");
  return (
    <Modal title="Refuser la demande" onClose={onClose}>
      <p className="text-sm mb-3">Indiquez le motif du refus. Il sera visible par le demandeur.</p>
      <Field label="Motif du refus"><textarea className={inputCls} style={inputStyle} rows={3} value={note} autoFocus onChange={(e) => setNote(e.target.value)} placeholder="Ex. Budget transport du mois déjà atteint." /></Field>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button onClick={() => onConfirm(note)} className="kb-btn" style={{ background: "#D81F26", color: "#fff" }}><ThumbsDown size={15} /> Confirmer le refus</button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODULE TÂCHES
   ══════════════════════════════════════════════════════════════════════ */
/* ---------------- Modale tâche (repensée : essentiel d'abord) ---------------- */
function TaskModal({ initial, departments, members, properties, owners, onSave, onClose, onDelete }) {
  const [f, setF] = useState(() => ({
    title: "", description: "", deptId: "", assigneeId: members[0]?.id, urgency: "normale", status: "a_faire",
    estMin: 60, day: null, weekStart: mondayIso(new Date()), nature: "autre", propertyId: "", ownerId: "",
    dueDate: "", assigneeIds: [], startTime: "", reminderMin: 0, ...initial,
  }));
  const [more, setMore] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const pickProperty = (id) => {
    const prop = properties.find((p) => p.id === id);
    setF((s) => ({ ...s, propertyId: id, ownerId: prop?.ownerId || s.ownerId }));
  };

  return (
    <Modal title={initial?.id ? "Modifier la tâche" : "Nouvelle tâche"} onClose={onClose} wide>
      <Field label="Que faut-il faire ?">
        <input className={inputCls} style={inputStyle} value={f.title} autoFocus onChange={(e) => set("title", e.target.value)} placeholder="Ex. Rédiger le bail de Mme KONÉ" />
      </Field>

      <Field label="Nature de la tâche">
        <div className="flex flex-wrap gap-1.5">
          {NATURE_ORDER.map((n) => (
            <button key={n} onClick={() => set("nature", n)} className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
              style={{ background: f.nature === n ? NATURE[n].color : "#fff", color: f.nature === n ? "#fff" : NATURE[n].color, border: `1px solid ${NATURE[n].color}55` }}>
              {NATURE[n].label}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Responsable de la tâche">
          <select className={inputCls} style={inputStyle} value={f.assigneeId} onChange={(e) => set("assigneeId", e.target.value)}>
            {members.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Urgence">
          <div className="flex gap-1">
            {URGENCY_ORDER.map((u) => (
              <button key={u} onClick={() => set("urgency", u)} className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ background: f.urgency === u ? URGENCY[u].color : URGENCY[u].bg, color: f.urgency === u ? "#fff" : URGENCY[u].color }}>
                {URGENCY[u].label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <Field label="Autres intervenants" hint="Cliquez pour ajouter ou retirer — ils verront la tâche dans leur liste">
        <div className="flex flex-wrap gap-1.5">
          {members.filter((m) => m.active && m.id !== f.assigneeId).map((m) => {
            const on = (f.assigneeIds || []).includes(m.id);
            return (
              <button key={m.id} onClick={() => set("assigneeIds", on
                ? f.assigneeIds.filter((x) => x !== m.id)
                : [...(f.assigneeIds || []), m.id])}
                className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                style={{ background: on ? m.color : "#fff", color: on ? "#fff" : "var(--muted)", border: `1px solid ${on ? m.color : "var(--line)"}` }}>
                {on && <Check size={11} />} {m.name}
              </button>
            );
          })}
        </div>
      </Field>

      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Jour">
          <select className={inputCls} style={inputStyle} value={f.day ?? ""} onChange={(e) => set("day", e.target.value === "" ? null : Number(e.target.value))}>
            <option value="">Non planifié</option>
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </Field>
        <Field label="Heure prévue"><input type="time" className={inputCls} style={inputStyle} value={f.startTime || ""} onChange={(e) => set("startTime", e.target.value)} /></Field>
        <Field label="Rappel" hint="Notification avant l'heure">
          <select className={inputCls} style={inputStyle} value={f.reminderMin} onChange={(e) => set("reminderMin", Number(e.target.value))}>
            <option value={0}>Aucun rappel</option>
            <option value={5}>5 minutes avant</option>
            <option value={15}>15 minutes avant</option>
            <option value={30}>30 minutes avant</option>
            <option value={60}>1 heure avant</option>
            <option value={1440}>La veille</option>
          </select>
        </Field>
      </div>

      <Field label="Bien concerné" hint="Le propriétaire est rattaché automatiquement">
        <select className={inputCls} style={inputStyle} value={f.propertyId || ""} onChange={(e) => pickProperty(e.target.value)}>
          <option value="">— Aucun bien —</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}{p.commune ? ` · ${p.commune}` : ""}</option>)}
        </select>
      </Field>

      <button onClick={() => setMore((s) => !s)} className="flex items-center gap-1 text-xs font-medium mb-3" style={{ color: "var(--brass)" }}>
        {more ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Options complémentaires
      </button>

      {more && (
        <div className="rounded-lg border p-3 mb-3" style={{ borderColor: "var(--line)", background: "#FAFBFC" }}>
          <Field label="Détails / consignes"><textarea className={inputCls} style={inputStyle} rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Durée estimée (min)"><input type="number" min={0} step={15} className={inputCls} style={inputStyle} value={f.estMin} onChange={(e) => set("estMin", Number(e.target.value))} /></Field>
            <Field label="Échéance"><input type="date" className={inputCls} style={inputStyle} value={f.dueDate || ""} onChange={(e) => set("dueDate", e.target.value)} /></Field>
            <Field label="Statut">
              <select className={inputCls} style={inputStyle} value={f.status} onChange={(e) => set("status", e.target.value)}>
                {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
              </select>
            </Field>
            <Field label="Propriétaire">
              <select className={inputCls} style={inputStyle} value={f.ownerId || ""} onChange={(e) => set("ownerId", e.target.value)}>
                <option value="">— Aucun —</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
            <Field label="Département">
              <select className={inputCls} style={inputStyle} value={f.deptId || ""} onChange={(e) => set("deptId", e.target.value)}>
                <option value="">— Aucun —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {initial?.id ? <button onClick={() => onDelete(initial.id)} className="kb-btn text-red-600 hover:bg-red-50"><Trash2 size={15} /> Supprimer</button> : <span />}
        <div className="flex gap-2">
          <button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
          <button disabled={!f.title.trim()} onClick={() => onSave(f)} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> Enregistrer</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Carte tâche compacte ---------------- */
function TaskRow({ task, property, assignee, actualSec, isRunning, canTrack, onEdit, onToggleTimer, onAdvance, onShare, onPause, onFinish }) {
  const u = URGENCY[task.urgency]; const nat = NATURE[task.nature] || NATURE.autre;
  const done = task.status === "termine";
  const overEst = task.estMin && actualSec > task.estMin * 60;
  return (
    <div className="bg-white rounded-xl border p-3" style={{ borderColor: isRunning ? "var(--live)" : "var(--line)", boxShadow: isRunning ? "0 0 0 1px var(--live)" : undefined }}>
      <div className="flex items-start gap-2.5">
        <button onClick={() => onAdvance(task)} title={done ? "Terminée" : "Faire avancer"}
          className="mt-0.5 shrink-0 rounded-full transition-colors"
          style={{ color: done ? "#4F9E2A" : "#CBD5E1" }}>
          <CheckCircle2 size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug" style={{ color: "var(--ink)", textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}>{task.title}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <Chip color={nat.color}>{nat.label}</Chip>
            <Chip color={u.color} bg={u.bg} dot>{u.label}</Chip>
            {property && <Chip color="#2E78A8"><Building2 size={10} /> {property.name}</Chip>}
            {!done && <Chip color={STATUS[task.status].color}>{STATUS[task.status].label}</Chip>}
          </div>
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {assignee && <Avatar member={assignee} size={20} />}
              <span className="text-[11px] truncate" style={{ color: "var(--muted)" }}>
                {task.startTime ? <><Clock size={10} className="inline mb-0.5" /> {task.startTime.slice(0, 5)} · </> : null}
                {fmtEst(task.estMin)} · <span style={{ color: overEst ? "#D81F26" : "var(--muted)", fontWeight: overEst ? 600 : 400 }}>{fmtDur(actualSec)}</span>
                {task.dueDate && ` · échéance ${fr(task.dueDate + "T00:00:00", { day: "numeric", month: "short" })}`}
                {(task.assigneeIds || []).length > 0 && ` · +${task.assigneeIds.length} intervenant(s)`}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onShare && <button onClick={() => onShare(task)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Envoyer"><Send size={13} /></button>}
              <button onClick={() => onEdit(task)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Modifier"><Pencil size={13} /></button>
              {canTrack && !done && isRunning && onPause && (
                <button onClick={() => onPause(task)} title="Mettre en pause" className="p-1.5 rounded-lg text-white" style={{ background: "#C58A1B" }}><Pause size={13} /></button>
              )}
              {canTrack && !done && (
                <button onClick={() => onToggleTimer(task)} title={isRunning ? "Arrêter le chrono" : "Démarrer le chrono"} className="p-1.5 rounded-lg text-white" style={{ background: isRunning ? "#D81F26" : "var(--live)" }}>{isRunning ? <Square size={13} /> : <Play size={13} />}</button>
              )}
              {!done && onFinish && (
                <button onClick={() => onFinish(task)} title="Terminer la tâche" className="p-1.5 rounded-lg text-white" style={{ background: "#4F9E2A" }}><CheckCheck size={13} /></button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Vue principale ---------------- */
function Taches({ store, me, userId, liveSecForTask, isRunning, toggleTimer, advanceStatus, onShare, onEdit, onNew, onPause, onFinish }) {
  const { tasks, members, properties, templates, actions } = store;
  const [quick, setQuick] = useState("");
  const [quickProp, setQuickProp] = useState("");
  const [scope, setScope] = useState("mine");
  const [search, setSearch] = useState("");
  const [filterNature, setFilterNature] = useState("all");
  const [showDone, setShowDone] = useState(false);
  const [view, setView] = useState("liste");

  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const propById = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p])), [properties]);

  /* --- Saisie rapide : une ligne, ça part --- */
  const quickAdd = async (tpl) => {
    const title = tpl ? tpl.label : quick.trim();
    if (!title) return;
    const prop = properties.find((p) => p.id === quickProp);
    await actions.createTask({
      title, description: "", deptId: tpl?.deptId || null, assigneeId: userId,
      urgency: tpl?.urgency || "normale", status: "a_faire", estMin: tpl?.estMin || 60,
      weekStart: mondayIso(new Date()), day: null, nature: tpl?.nature || "autre",
      propertyId: quickProp || null, ownerId: prop?.ownerId || null,
    });
    setQuick("");
  };

  /* Une tâche m'appartient si j'en suis responsable ou intervenant */
  const isMine = (t) => t.assigneeId === userId || (t.assigneeIds || []).includes(userId);
  const base = tasks.filter((t) => (scope === "all" || isMine(t)));
  const filtered = base.filter((t) =>
    (filterNature === "all" || t.nature === filterNature) &&
    (showDone || t.status !== "termine") &&
    (!search || t.title.toLowerCase().includes(search.toLowerCase()) ||
      (propById[t.propertyId]?.name || "").toLowerCase().includes(search.toLowerCase())));

  const sorted = [...filtered].sort((a, b) => {
    const uo = URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency);
    if (uo !== 0) return uo;
    return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
  });

  const openCount = base.filter((t) => t.status !== "termine").length;
  const urgentCount = base.filter((t) => t.status !== "termine" && (t.urgency === "urgente" || t.urgency === "haute")).length;
  const todayIso = isoDate(new Date());
  const dueToday = base.filter((t) => t.status !== "termine" && t.dueDate && t.dueDate <= todayIso);

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Tâches</h1>
        <button onClick={onNew} className="kb-btn kb-btn-primary"><Plus size={16} /> Nouvelle tâche</button>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        {openCount} en cours{urgentCount > 0 && ` · ${urgentCount} prioritaire(s)`}{dueToday.length > 0 && ` · ${dueToday.length} à échéance`}
      </p>

      {/* --- BARRE DE SAISIE RAPIDE --- */}
      <div className="bg-white rounded-xl border p-3 mb-4" style={{ borderColor: "var(--line)" }}>
        <div className="flex gap-2 mb-2.5">
          <input value={quick} onChange={(e) => setQuick(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") quickAdd(null); }}
            placeholder="Ajouter une tâche en une ligne, puis Entrée…"
            className="flex-1 px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
          <select value={quickProp} onChange={(e) => setQuickProp(e.target.value)}
            className="px-2 py-2 rounded-lg border text-sm bg-white max-w-[42%]" style={inputStyle} title="Rattacher à un bien">
            <option value="">Sans bien</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => quickAdd(null)} disabled={!quick.trim()} className="kb-btn kb-btn-primary disabled:opacity-40 px-3 shrink-0"><Plus size={16} /></button>
        </div>
        {templates.filter((t) => t.active).length > 0 && (
          <div>
            <p className="text-[11px] font-medium mb-1.5 flex items-center gap-1" style={{ color: "var(--muted)" }}><Zap size={11} style={{ color: "var(--brass)" }} /> Tâches courantes — un clic suffit</p>
            <div className="flex flex-wrap gap-1.5">
              {templates.filter((t) => t.active).map((t) => {
                const nat = NATURE[t.nature] || NATURE.autre;
                return <button key={t.id} onClick={() => quickAdd(t)} className="px-2.5 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                  style={{ background: nat.color + "14", color: nat.color, border: `1px solid ${nat.color}33` }}>+ {t.label}</button>;
              })}
            </div>
          </div>
        )}
      </div>

      {/* --- FILTRES --- */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg border overflow-hidden" style={inputStyle}>
          {[["mine", "Les miennes"], ["all", "Toute l'équipe"]].map(([v, l]) =>
            <button key={v} onClick={() => setScope(v)} className="px-3 py-2 text-sm" style={{ background: scope === v ? "var(--ink)" : "#fff", color: scope === v ? "#fff" : "var(--muted)" }}>{l}</button>)}
        </div>
        <div className="flex rounded-lg border overflow-hidden" style={inputStyle}>
          {[["liste", "Liste"], ["kanban", "Colonnes"]].map(([v, l]) =>
            <button key={v} onClick={() => setView(v)} className="px-3 py-2 text-sm" style={{ background: view === v ? "var(--ink)" : "#fff", color: view === v ? "#fff" : "var(--muted)" }}>{l}</button>)}
        </div>
        <div className="relative flex-1 min-w-[140px]">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
        </div>
        <select value={filterNature} onChange={(e) => setFilterNature(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Toutes natures</option>
          {NATURE_ORDER.map((n) => <option key={n} value={n}>{NATURE[n].label}</option>)}
        </select>
        <button onClick={() => setShowDone((s) => !s)} className="kb-btn kb-btn-ghost text-sm">
          {showDone ? "Masquer terminées" : "Voir terminées"}
        </button>
      </div>

      {/* --- LISTE --- */}
      {view === "liste" ? (
        sorted.length ? <div className="space-y-2">
          {sorted.map((t) => <TaskRow key={t.id} task={t} property={propById[t.propertyId]} assignee={memberById[t.assigneeId]}
            actualSec={liveSecForTask(t.id)} isRunning={isRunning(t.id)} canTrack={t.assigneeId === userId}
            onEdit={onEdit} onToggleTimer={toggleTimer} onAdvance={advanceStatus} onShare={onShare}
            onPause={onPause} onFinish={onFinish} />)}
        </div> : <EmptyState icon={Inbox} title="Rien à faire ici" sub="Utilisez la saisie rapide ci-dessus pour ajouter une tâche." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STATUS_ORDER.map((s) => {
            const col = filtered.filter((t) => t.status === s);
            return (
              <div key={s} className="bg-slate-50 rounded-xl p-2.5 border" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-sm font-semibold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: STATUS[s].color }} />{STATUS[s].label}</span>
                  <span className="text-xs px-1.5 rounded-full bg-white border" style={{ color: "var(--muted)", borderColor: "var(--line)" }}>{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map((t) => <TaskRow key={t.id} task={t} property={propById[t.propertyId]} assignee={memberById[t.assigneeId]}
                    actualSec={liveSecForTask(t.id)} isRunning={isRunning(t.id)} canTrack={t.assigneeId === userId}
                    onEdit={onEdit} onToggleTimer={toggleTimer} onAdvance={advanceStatus} onShare={onShare}
                    onPause={onPause} onFinish={onFinish} />)}
                  {col.length === 0 && <p className="text-xs text-center py-4" style={{ color: "#B6BEC9" }}>—</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODULE IMPÔT FONCIER
   ══════════════════════════════════════════════════════════════════════ */

/* Libellé du bien suivi : lot > bien du patrimoine > libellé libre */
function taxLabel(rec, propById, unitById) {
  if (rec.customLabel) return rec.customLabel;
  const u = rec.unitId ? unitById[rec.unitId] : null;
  const p = rec.propertyId ? propById[rec.propertyId] : null;
  if (u && p) return `${p.name} — ${u.label}`;
  if (u) return u.label;
  if (p) return p.name;
  return "Bien non précisé";
}
function taxOwnerLabel(rec, ownerById, propById) {
  if (rec.ownerLabel) return rec.ownerLabel;
  const direct = rec.ownerId ? ownerById[rec.ownerId] : null;
  if (direct) return direct.name;
  const p = rec.propertyId ? propById[rec.propertyId] : null;
  const o = p?.ownerId ? ownerById[p.ownerId] : null;
  return o?.name || "—";
}

/* ---------------- Modale de saisie ---------------- */
function TaxModal({ initial, properties, units, owners, onSave, onClose }) {
  const [f, setF] = useState(() => ({
    propertyId: "", unitId: "", customLabel: "", ownerId: "", ownerLabel: "",
    taxYear: new Date().getFullYear(), noticeNumber: "", taxedAmount: "", ncc: "",
    receipts: "non", declarationNext: "non", declarationDate: "", nextBase: "", notes: "", ...initial,
  }));
  const [inst, setInst] = useState(() =>
    initial?.installments?.length ? initial.installments.map((t) => ({ ...t }))
      : buildInstallments(initial?.taxYear || new Date().getFullYear(), initial?.taxedAmount || 0));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setT = (i, k, v) => setInst((p) => p.map((t, j) => (j === i ? { ...t, [k]: v } : t)));

  /* Recalcule les quatre échéances quand l'année ou la somme imposée change */
  const recompute = (year, taxed) => setInst((prev) => buildInstallments(year, taxed, prev));

  const propUnits = units.filter((u) => u.propertyId === f.propertyId);
  const totals = taxTotals({ ...f, installments: inst });
  const valid = (f.propertyId || f.customLabel.trim()) && Number(f.taxedAmount) > 0;

  const submit = async () => {
    setBusy(true);
    const r = await onSave({ ...f, installments: inst });
    setBusy(false);
    if (r?.error) setErr(r.error); else onClose();
  };

  return (
    <Modal title={f.id ? "Modifier le suivi d'impôt foncier" : "Nouveau bien à suivre"} onClose={onClose} wide>
      <div className="rounded-lg p-3 mb-4 text-xs" style={{ background: "#EAF2F8", color: "#1F5C82" }}>
        L'impôt est réparti en quatre fractions égales, exigibles les 15 mars, 15 juin, 15 septembre et 15 décembre.
        Les dates et montants dus se calculent automatiquement à partir de la somme imposée.
      </div>

      <p className="text-xs font-semibold mb-2" style={{ color: "var(--ink)" }}>Identification du bien</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Bien du patrimoine">
          <select className={inputCls} style={inputStyle} value={f.propertyId || ""}
            onChange={(e) => setF((p) => ({ ...p, propertyId: e.target.value, unitId: "" }))}>
            <option value="">— Hors patrimoine (libellé libre) —</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Lot concerné" hint="Pour une villa ou un lot imposé séparément">
          <select className={inputCls} style={inputStyle} value={f.unitId || ""} onChange={(e) => set("unitId", e.target.value)} disabled={!f.propertyId}>
            <option value="">— Le bien entier —</option>
            {propUnits.map((u) => <option key={u.id} value={u.id}>{u.label} ({UNIT_KIND[u.kind]})</option>)}
          </select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Libellé libre" hint="Si le bien n'est pas au patrimoine, ou pour préciser la désignation">
          <input className={inputCls} style={inputStyle} value={f.customLabel} onChange={(e) => set("customLabel", e.target.value)} placeholder="Ex. Villa Deux Plateaux" />
        </Field>
        <Field label="Propriétaire redevable" hint="Repris du bien si laissé vide">
          <select className={inputCls} style={inputStyle} value={f.ownerId || ""} onChange={(e) => set("ownerId", e.target.value)}>
            <option value="">— Propriétaire du bien —</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </Field>
      </div>

      <p className="text-xs font-semibold mb-2 mt-1" style={{ color: "var(--ink)" }}>Avis d'imposition</p>
      <div className="grid sm:grid-cols-4 gap-3">
        <Field label="Année d'imposition">
          <input type="number" min={2000} max={2100} className={inputCls} style={inputStyle} value={f.taxYear}
            onChange={(e) => { set("taxYear", e.target.value); recompute(e.target.value, f.taxedAmount); }} />
        </Field>
        <Field label="N° de l'avis"><input className={inputCls} style={inputStyle} value={f.noticeNumber} onChange={(e) => set("noticeNumber", e.target.value)} placeholder="AV-2026-004471" /></Field>
        <Field label="Somme imposée (FCFA)">
          <input type="number" min={0} step={1000} className={inputCls} style={inputStyle} value={f.taxedAmount}
            onChange={(e) => { set("taxedAmount", e.target.value); recompute(f.taxYear, e.target.value); }} />
        </Field>
        <Field label="NCC du propriétaire" hint="Numéro de Compte Contribuable">
          <input className={inputCls} style={inputStyle} value={f.ncc} onChange={(e) => set("ncc", e.target.value)} placeholder="Ex. 1234567 A" />
        </Field>
      </div>

      <p className="text-xs font-semibold mb-2 mt-1" style={{ color: "var(--ink)" }}>Versements par tranche</p>
      <div className="overflow-x-auto -mx-1 mb-3">
        <table className="w-full text-xs" style={{ minWidth: 720 }}>
          <thead><tr style={{ background: "#F1F3F5" }}>
            <th className="text-left px-2 py-2 font-semibold w-24">Tranche</th>
            <th className="text-left px-2 py-2 font-semibold w-32">Date limite</th>
            <th className="text-right px-2 py-2 font-semibold w-28">Montant dû</th>
            <th className="text-left px-2 py-2 font-semibold w-28">Mode</th>
            <th className="text-left px-2 py-2 font-semibold w-28">N° chèque / réf.</th>
            <th className="text-right px-2 py-2 font-semibold w-28">Somme versée</th>
            <th className="text-left px-2 py-2 font-semibold w-32">Date versement</th>
          </tr></thead>
          <tbody>{inst.map((t, i) => {
            const late = isLate(t);
            return (
              <tr key={i} className="border-b" style={{ borderColor: "var(--line)" }}>
                <td className="px-2 py-1.5 font-medium">{TRANCHE_LABELS[i]}</td>
                <td className="px-1 py-1"><input type="date" className="w-full px-2 py-1.5 rounded border text-xs" style={{ ...inputStyle, borderColor: late ? "#D81F26" : "var(--line)", color: late ? "#D81F26" : "var(--ink)" }} value={t.dueDate || ""} onChange={(e) => setT(i, "dueDate", e.target.value)} /></td>
                <td className="px-1 py-1"><input type="number" min={0} step={1000} className="w-full px-2 py-1.5 rounded border text-xs text-right" style={inputStyle} value={t.amountDue} onChange={(e) => setT(i, "amountDue", e.target.value)} /></td>
                <td className="px-1 py-1">
                  <select className="w-full px-2 py-1.5 rounded border text-xs" style={inputStyle} value={t.mode || ""} onChange={(e) => setT(i, "mode", e.target.value)}>
                    {Object.entries(TAX_MODE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1"><input className="w-full px-2 py-1.5 rounded border text-xs" style={inputStyle} value={t.chequeNo || ""} onChange={(e) => setT(i, "chequeNo", e.target.value)} placeholder="0045123" /></td>
                <td className="px-1 py-1"><input type="number" min={0} step={1000} className="w-full px-2 py-1.5 rounded border text-xs text-right" style={inputStyle} value={t.amountPaid} onChange={(e) => setT(i, "amountPaid", e.target.value)} /></td>
                <td className="px-1 py-1"><input type="date" className="w-full px-2 py-1.5 rounded border text-xs" style={inputStyle} value={t.paidAt || ""} onChange={(e) => setT(i, "paidAt", e.target.value)} /></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Quittances reçues">
          <select className={inputCls} style={inputStyle} value={f.receipts} onChange={(e) => set("receipts", e.target.value)}>
            {Object.entries(RECEIPTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label={`Déclaration ${Number(f.taxYear) + 1} déposée`}>
          <select className={inputCls} style={inputStyle} value={f.declarationNext} onChange={(e) => set("declarationNext", e.target.value)}>
            <option value="non">Non</option><option value="oui">Oui</option>
          </select>
        </Field>
        <div className="rounded-lg p-2.5" style={{ background: totals.settled ? "#EAF6E3" : "#FDEAEA" }}>
          <p className="text-[11px]" style={{ color: "var(--muted)" }}>Total versé</p>
          <p className="text-sm font-bold tabular-nums">{fcfa(totals.paid)}</p>
          <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>Reste à payer</p>
          <p className="text-sm font-bold tabular-nums" style={{ color: totals.settled ? "#4F9E2A" : "#D81F26" }}>{fcfa(totals.remaining)}</p>
        </div>
      </div>

      <div className="rounded-xl border p-3 mb-3" style={{ borderColor: "var(--line)", background: "#FAFBFC" }}>
        <p className="text-xs font-semibold mb-1">Déclaration foncière de fin d'année</p>
        <p className="text-[11px] mb-2" style={{ color: "var(--muted)" }}>
          Déposée en fin d'année, elle fixe la base imposable de {Number(f.taxYear) + 1}.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Date de dépôt"><input type="date" className={inputCls} style={inputStyle} value={f.declarationDate || ""} onChange={(e) => set("declarationDate", e.target.value)} /></Field>
          <Field label={`Nouvelle base imposable ${Number(f.taxYear) + 1} (FCFA)`}>
            <input type="number" min={0} step={1000} className={inputCls} style={inputStyle} value={f.nextBase ?? ""} onChange={(e) => set("nextBase", e.target.value)} />
          </Field>
        </div>
      </div>

      <Field label="Observations"><textarea className={inputCls} style={inputStyle} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>

      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!valid || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> {busy ? "…" : "Enregistrer"}</button>
      </div>
    </Modal>
  );
}

/* ---------------- État imprimable (paysage) ---------------- */
function TaxSheet({ records, year, title, propById, unitById, ownerById, onBack }) {
  const grand = records.reduce((a, r) => {
    const t = taxTotals(r);
    return { taxed: a.taxed + t.taxed, paid: a.paid + t.paid, remaining: a.remaining + t.remaining };
  }, { taxed: 0, paid: 0, remaining: 0 });

  const nccs = [...new Set(records.map((r) => r.ncc).filter(Boolean))];
  const multiYear = new Set(records.map((r) => r.taxYear)).size > 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 print:hidden gap-2 flex-wrap">
        <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour</button>
        <button onClick={() => printSheet("landscape")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF (paysage)</button>
      </div>

      <div id="print-area" className="bg-white rounded-xl border p-6" style={{ borderColor: "var(--line)" }}>
        <PrintHead title="ÉTAT DE L'IMPÔT FONCIER" subtitle={multiYear ? "Toutes années confondues" : `Année ${year}`} extra={
          <p className="text-[11px]" style={{ color: "var(--muted)" }}>Édité le {fr(new Date(), { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
        } />

        {(title || nccs.length > 0) && (
          <div className="flex items-center justify-between gap-4 mt-3">
            {title && <p className="text-sm font-semibold">{title}</p>}
            {nccs.length > 0 && <p className="text-xs" style={{ color: "var(--muted)" }}>NCC : <strong style={{ color: "var(--ink)" }}>{nccs.join(" · ")}</strong></p>}
          </div>
        )}

        <table className="w-full text-[10px] mt-3">
          <thead>
            <tr style={{ background: "#E8EDF2" }}>
              {multiYear && <th className="text-left px-1.5 py-1.5 font-semibold" rowSpan={2}>Année</th>}
              <th className="text-left px-1.5 py-1.5 font-semibold" rowSpan={2}>Bien</th>
              <th className="text-left px-1.5 py-1.5 font-semibold" rowSpan={2}>N° avis</th>
              <th className="text-right px-1.5 py-1.5 font-semibold" rowSpan={2}>Somme imposée</th>
              {TRANCHE_LABELS.map((l, i) => (
                <th key={l} className="text-center px-1.5 py-1 font-semibold border-l" style={{ borderColor: "#fff" }} colSpan={2}>{`Tranche ${i + 1}`}</th>
              ))}
              <th className="text-right px-1.5 py-1.5 font-semibold border-l" style={{ borderColor: "#fff" }} rowSpan={2}>Total versé</th>
              <th className="text-right px-1.5 py-1.5 font-semibold" rowSpan={2}>Reste à payer</th>
              <th className="text-center px-1.5 py-1.5 font-semibold" rowSpan={2}>Quittances</th>
            </tr>
            <tr style={{ background: "#F1F3F5" }}>
              {TRANCHE_LABELS.map((l) => [
                <th key={l + "d"} className="text-left px-1.5 py-1 font-medium border-l" style={{ borderColor: "#fff" }}>Date versement</th>,
                <th key={l + "p"} className="text-right px-1.5 py-1 font-medium">Montant versé</th>,
              ])}
            </tr>
          </thead>
          <tbody>{records.map((r) => {
            const t = taxTotals(r);
            return (
              <tr key={r.id} className="border-b" style={{ borderColor: "var(--line)" }}>
                {multiYear && <td className="px-1.5 py-1.5 font-medium">{r.taxYear}</td>}
                <td className="px-1.5 py-1.5 font-medium">{taxLabel(r, propById, unitById)}</td>
                <td className="px-1.5 py-1.5">{r.noticeNumber || "—"}</td>
                <td className="px-1.5 py-1.5 text-right tabular-nums">{fcfa(r.taxedAmount)}</td>
                {Array.from({ length: 4 }, (_, i) => (r.installments || [])[i] || {}).map((tr, i) => {
                  const paid = Number(tr.amountPaid) || 0;
                  return [
                    <td key={i + "d"} className="px-1.5 py-1.5 border-l" style={{ borderColor: "var(--line)" }}>
                      {tr.paidAt ? fr(tr.paidAt + "T00:00:00", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"}
                    </td>,
                    <td key={i + "p"} className="px-1.5 py-1.5 text-right tabular-nums" style={{ color: paid > 0 ? "#3d7d20" : "var(--muted)" }}>
                      {paid > 0 ? fcfa(paid) : "non versé"}
                    </td>,
                  ];
                })}
                <td className="px-1.5 py-1.5 text-right tabular-nums font-medium border-l" style={{ borderColor: "var(--line)" }}>{fcfa(t.paid)}</td>
                <td className="px-1.5 py-1.5 text-right tabular-nums font-bold" style={{ color: t.settled ? "#4F9E2A" : "#D81F26" }}>{fcfa(t.remaining)}</td>
                <td className="px-1.5 py-1.5 text-center" style={{ color: RECEIPTS[r.receipts].color, fontWeight: 600 }}>{RECEIPTS[r.receipts].label}</td>
              </tr>
            );
          })}</tbody>
          <tfoot><tr style={{ background: "#E8EDF2" }}>
            <td colSpan={multiYear ? 3 : 2} className="px-1.5 py-2 font-bold">TOTAUX</td>
            <td className="px-1.5 py-2 text-right font-bold tabular-nums">{fcfa(grand.taxed)}</td>
            <td colSpan={8} />
            <td className="px-1.5 py-2 text-right font-bold tabular-nums">{fcfa(grand.paid)}</td>
            <td className="px-1.5 py-2 text-right font-bold tabular-nums" style={{ color: grand.remaining > 0 ? "#D81F26" : "#4F9E2A" }}>{fcfa(grand.remaining)}</td>
            <td />
          </tr></tfoot>
        </table>

        {grand.remaining > 0
          ? <p className="text-[11px] italic mt-3">Reste à payer : <strong>{amountInWords(grand.remaining)}</strong>.</p>
          : <p className="text-[11px] italic mt-3" style={{ color: "#3d7d20" }}>Impôt intégralement réglé pour la période présentée.</p>}

        {/* Déclarations de fin d'année */}
        {records.some((r) => r.declarationNext === "oui" || r.nextBase) && (
          <div className="mt-4">
            <p className="text-xs font-bold mb-1.5">DÉCLARATION FONCIÈRE DE FIN D'ANNÉE</p>
            <table className="w-full text-[10px]">
              <thead><tr style={{ background: "#F1F3F5" }}>
                <th className="text-left px-1.5 py-1 font-semibold">Bien</th>
                <th className="text-left px-1.5 py-1 font-semibold">Année déclarée</th>
                <th className="text-left px-1.5 py-1 font-semibold">Date de dépôt</th>
                <th className="text-right px-1.5 py-1 font-semibold">Nouvelle base imposable</th>
              </tr></thead>
              <tbody>{records.filter((r) => r.declarationNext === "oui" || r.nextBase).map((r) => (
                <tr key={r.id} className="border-b" style={{ borderColor: "var(--line)" }}>
                  <td className="px-1.5 py-1">{taxLabel(r, propById, unitById)}</td>
                  <td className="px-1.5 py-1">{r.taxYear + 1}</td>
                  <td className="px-1.5 py-1">{r.declarationDate ? fr(r.declarationDate + "T00:00:00", { day: "2-digit", month: "2-digit", year: "numeric" }) : "non déposée"}</td>
                  <td className="px-1.5 py-1 text-right tabular-nums">{r.nextBase ? fcfa(r.nextBase) : "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        <div className="kb-sign flex justify-between items-end pt-10 mt-4">
          <div className="text-center" style={{ minWidth: 180 }}><p className="text-[11px] font-semibold pb-20">Le Propriétaire</p><div className="border-t" style={{ borderColor: "var(--ink)" }} /></div>
          <div className="text-center" style={{ minWidth: 180 }}><p className="text-[11px] font-semibold pb-20">Pour l'Agence</p><div className="border-t" style={{ borderColor: "var(--ink)" }} /></div>
        </div>
        <PrintFoot />
      </div>
    </div>
  );
}

/* ---------------- Vue principale ---------------- */
function ImpotFoncier({ store, me }) {
  const { taxRecords, properties, units, owners, actions } = store;
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [filterOwner, setFilterOwner] = useState("all");
  const [filterProp, setFilterProp] = useState("all");
  const [modal, setModal] = useState(null);
  const [sheet, setSheet] = useState(null);

  const propById = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p])), [properties]);
  const unitById = useMemo(() => Object.fromEntries(units.map((u) => [u.id, u])), [units]);
  const ownerById = useMemo(() => Object.fromEntries(owners.map((o) => [o.id, o])), [owners]);
  const canEdit = isAdmin(me.role) || me.role === "comptable";

  const allYears = year === "all";
  const yearRecords = taxRecords.filter((r) => allYears || r.taxYear === Number(year));
  const list = yearRecords.filter((r) => {
    const ownerId = r.ownerId || propById[r.propertyId]?.ownerId;
    return (filterOwner === "all" || ownerId === filterOwner) &&
      (filterProp === "all" || r.propertyId === filterProp) &&
      (!search || taxLabel(r, propById, unitById).toLowerCase().includes(search.toLowerCase()) ||
        taxOwnerLabel(r, ownerById, propById).toLowerCase().includes(search.toLowerCase()) ||
        (r.noticeNumber || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.ncc || "").toLowerCase().includes(search.toLowerCase()));
  }).sort((a, b) => b.taxYear - a.taxYear);

  /* Résumé pluriannuel : un bloc par propriétaire ou par bâtiment */
  const summary = useMemo(() => {
    const m = {};
    list.forEach((r) => {
      const ownerId = r.ownerId || propById[r.propertyId]?.ownerId;
      const key = filterProp !== "all" ? (r.propertyId || "autre") : (ownerId || "autre");
      const name = filterProp !== "all" ? taxLabel(r, propById, unitById) : taxOwnerLabel(r, ownerById, propById);
      const t = taxTotals(r);
      m[key] = m[key] || { key, name, years: new Set(), taxed: 0, paid: 0, remaining: 0, count: 0, ncc: r.ncc };
      m[key].years.add(r.taxYear); m[key].taxed += t.taxed; m[key].paid += t.paid;
      m[key].remaining += t.remaining; m[key].count += 1;
      if (r.ncc) m[key].ncc = r.ncc;
    });
    return Object.values(m).sort((a, b) => b.remaining - a.remaining);
  }, [list, propById, unitById, ownerById, filterProp]);

  if (sheet) {
    return <TaxSheet records={sheet.records} year={allYears ? "toutes années" : year} title={sheet.title}
      propById={propById} unitById={unitById} ownerById={ownerById} onBack={() => setSheet(null)} />;
  }

  const totals = list.reduce((a, r) => {
    const t = taxTotals(r);
    return { taxed: a.taxed + t.taxed, paid: a.paid + t.paid, remaining: a.remaining + t.remaining };
  }, { taxed: 0, paid: 0, remaining: 0 });
  const lateCount = list.filter((r) => (r.installments || []).some(isLate)).length;
  const years = [...new Set([new Date().getFullYear(), ...taxRecords.map((r) => r.taxYear)])].sort((a, b) => b - a);

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Impôt foncier</h1>
        <div className="flex gap-2">
          <button onClick={() => setSheet({ records: list, title: filterProp !== "all" ? `Bâtiment : ${propById[filterProp]?.name || ""}` : filterOwner !== "all" ? `Propriétaire : ${ownerById[filterOwner]?.name || ""}` : "" })}
            className="kb-btn kb-btn-ghost"><Printer size={15} /> Imprimer l'état</button>
          {canEdit && <button onClick={() => setModal({ taxYear: allYears ? new Date().getFullYear() : year })} className="kb-btn kb-btn-primary"><Plus size={16} /> Bien à suivre</button>}
        </div>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        Suivi des quatre tranches annuelles par bien.
        {!canEdit && " Consultation seule — la gestion est assurée par la comptabilité et l'administrateur."}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Landmark} label="Total imposé" value={fcfa(totals.taxed)} sub={`${list.length} avis · ${new Set(list.map((r) => r.taxYear)).size} année(s)`} tint="#2E78A8" />
        <StatCard icon={Wallet} label="Total versé" value={fcfa(totals.paid)} sub={totals.taxed ? `${((totals.paid / totals.taxed) * 100).toFixed(0)} % réglé` : undefined} tint="#4F9E2A" />
        <StatCard icon={AlertTriangle} label="Reste à payer" value={fcfa(totals.remaining)} tint="#D81F26" />
        <StatCard icon={Clock} label="Échéances dépassées" value={lateCount} sub="biens concernés" tint="#EA580C" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={year} onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Toutes les années</option>
          {years.map((y) => <option key={y} value={y}>Année {y}</option>)}
        </select>
        <div className="relative flex-1 min-w-[150px]">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Bien, propriétaire, n° d'avis…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
        </div>
        <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Tous les propriétaires</option>
          {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={filterProp} onChange={(e) => setFilterProp(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Tous les bâtiments</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {summary.length > 1 || allYears ? (
        <SectionCard title={filterProp !== "all" ? "Résumé par bien" : "Résumé par propriétaire"} icon={Landmark} pad={false}>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left" style={{ color: "var(--muted)" }}>
              <th className="px-4 py-2.5 font-medium">{filterProp !== "all" ? "Bien" : "Propriétaire"}</th>
              <th className="px-3 py-2.5 font-medium">NCC</th>
              <th className="px-3 py-2.5 font-medium">Années</th>
              <th className="px-3 py-2.5 font-medium text-right">Imposé</th>
              <th className="px-3 py-2.5 font-medium text-right">Versé</th>
              <th className="px-3 py-2.5 font-medium text-right">Reste</th>
            </tr></thead>
            <tbody>{summary.map((g) => (
              <tr key={g.key} className="border-t" style={{ borderColor: "var(--line)" }}>
                <td className="px-4 py-2.5 font-medium">{g.name}</td>
                <td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>{g.ncc || "—"}</td>
                <td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>{[...g.years].sort().join(", ")}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fcfa(g.taxed)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fcfa(g.paid)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold" style={{ color: g.remaining > 0 ? "#D81F26" : "#4F9E2A" }}>{fcfa(g.remaining)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </SectionCard>
      ) : null}

      {list.length ? <div className="space-y-2">
        {list.map((r) => {
          const t = taxTotals(r);
          const late = (r.installments || []).filter(isLate).length;
          const pct = t.taxed ? Math.min(100, (t.paid / t.taxed) * 100) : 0;
          return (
            <div key={r.id} className="bg-white rounded-xl border p-3" style={{ borderColor: late ? "#F5C6C7" : "var(--line)" }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{taxLabel(r, propById, unitById)}</p>
                    <Chip color="#2E78A8">{r.taxYear}</Chip>
                    {r.noticeNumber && <Chip color="#64748B">{r.noticeNumber}</Chip>}
                    {r.ncc && <Chip color="#7C3AED">NCC {r.ncc}</Chip>}
                    <Chip color={RECEIPTS[r.receipts].color} dot>Quittances : {RECEIPTS[r.receipts].label}</Chip>
                    {late > 0 && <Chip color="#D81F26" bg="#FDEAEA">{late} échéance(s) dépassée(s)</Chip>}
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
                    {taxOwnerLabel(r, ownerById, propById)} · imposé {fcfa(r.taxedAmount)} · déclaration N+1 :{" "}
                    <span style={{ color: r.declarationNext === "oui" ? "#4F9E2A" : "#D81F26", fontWeight: 600 }}>{r.declarationNext === "oui" ? "faite" : "non faite"}</span>
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(r.installments || []).slice(0, 4).map((tr, i) => {
                      const paid = Number(tr.amountPaid) || 0;
                      const lateT = isLate(tr);
                      const color = paid > 0 ? "#4F9E2A" : lateT ? "#D81F26" : "#94A3B8";
                      return (
                        <span key={i} className="rounded-lg px-2 py-1 text-[10px] font-medium" style={{ background: color + "14", color, border: `1px solid ${color}33` }}>
                          T{i + 1} · {paid > 0 ? fcfa(paid) : (tr.dueDate ? fr(tr.dueDate + "T00:00:00", { day: "2-digit", month: "2-digit" }) : "—")}
                        </span>
                      );
                    })}
                  </div>

                  <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden" style={{ maxWidth: 260 }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.settled ? "#4F9E2A" : pct > 50 ? "#C58A1B" : "#D81F26" }} />
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-[11px]" style={{ color: "var(--muted)" }}>Reste à payer</p>
                    <p className="text-base font-bold tabular-nums" style={{ color: t.settled ? "#4F9E2A" : "#D81F26" }}>{fcfa(t.remaining)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setSheet({ records: [r], title: `${taxLabel(r, propById, unitById)} — ${taxOwnerLabel(r, ownerById, propById)}` })}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="État pour le propriétaire"><Printer size={14} /></button>
                    {canEdit && <button onClick={() => setModal(r)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Modifier"><Pencil size={14} /></button>}
                    {canEdit && <button onClick={async () => { if (confirm("Supprimer ce suivi ?")) await actions.deleteTaxRecord(r.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div> : <EmptyState icon={Landmark} title={allYears ? "Aucun bien suivi" : `Aucun bien suivi pour ${year}`}
        sub="Ajoutez les biens de vos propriétaires soumis à l'impôt foncier."
        action={canEdit ? <button onClick={() => setModal({ taxYear: allYears ? new Date().getFullYear() : year })} className="kb-btn kb-btn-primary"><Plus size={15} /> Bien à suivre</button> : null} />}

      {modal && <TaxModal initial={modal} properties={properties} units={units} owners={owners}
        onSave={actions.saveTaxRecord} onClose={() => setModal(null)} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   LOCATAIRES · QUITTANCES · PLAINTES · PORTEFEUILLE COMMERCIAL
   ══════════════════════════════════════════════════════════════════════ */

const COMPLAINT_CATEGORY = {
  reparation_plomberie:     { label: "Plomberie",              color: "#2E78A8", group: "Réparation" },
  reparation_electricite:   { label: "Électricité",            color: "#C58A1B", group: "Réparation" },
  infiltration_toiture:     { label: "Infiltration / toiture", color: "#0D9488", group: "Réparation" },
  degat_eaux:               { label: "Dégât des eaux",         color: "#2E78A8", group: "Réparation" },
  serrurerie:               { label: "Serrurerie",             color: "#64748B", group: "Réparation" },
  climatisation:            { label: "Climatisation",          color: "#0891B2", group: "Réparation" },
  menuiserie:               { label: "Menuiserie",             color: "#EA580C", group: "Réparation" },
  peinture_revetement:      { label: "Peinture / revêtement",  color: "#DB2777", group: "Réparation" },
  parties_communes:         { label: "Parties communes",       color: "#7C3AED", group: "Immeuble" },
  ascenseur:                { label: "Ascenseur",              color: "#6366F1", group: "Immeuble" },
  insalubrite_ordures:      { label: "Insalubrité / ordures",  color: "#4F9E2A", group: "Immeuble" },
  eau_electricite_compteur: { label: "Compteur eau / élec.",   color: "#C58A1B", group: "Immeuble" },
  nuisances_sonores:        { label: "Nuisances sonores",      color: "#EA580C", group: "Voisinage" },
  conflit_voisinage:        { label: "Conflit de voisinage",   color: "#D81F26", group: "Voisinage" },
  securite_effraction:      { label: "Sécurité / effraction",  color: "#B91C1C", group: "Voisinage" },
  charges_facturation:      { label: "Charges / facturation",  color: "#7C3AED", group: "Administratif" },
  autre:                    { label: "Autre diligence",        color: "#64748B", group: "Administratif" },
};
const COMPLAINT_CAUSE = {
  vetuste:              "Vétusté",
  defaut_entretien:     "Défaut d'entretien",
  mauvaise_utilisation: "Mauvaise utilisation",
  intemperies:          "Intempéries",
  malfacon:             "Malfaçon",
  fait_de_tiers:        "Fait d'un tiers",
  indetermine:          "Cause indéterminée",
};
const COMPLAINT_STATUS = {
  signale:    { label: "Signalée",   color: "#D81F26" },
  en_cours:   { label: "En cours",   color: "#2E78A8" },
  en_attente: { label: "En attente", color: "#C58A1B" },
  resolu:     { label: "Résolue",    color: "#4F9E2A" },
  clos:       { label: "Clôturée",   color: "#64748B" },
  rejete:     { label: "Rejetée",    color: "#94A3B8" },
};
const COMPLAINT_STATUS_ORDER = ["signale", "en_cours", "en_attente", "resolu", "clos", "rejete"];
const COMPLAINT_CHANNEL = { telephone: "Téléphone", whatsapp: "WhatsApp", visite: "Visite au bureau", courrier: "Courrier", email: "E-mail", autre: "Autre" };

/* ---------------- Modale locataire ---------------- */
function TenantModal({ unit, property, onSave, onClose }) {
  const [f, setF] = useState(() => ({ ...unit }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => {
    setBusy(true);
    const r = await onSave({ ...f, status: f.tenantName?.trim() ? (f.status === "vacant" ? "occupe" : f.status) : "vacant" });
    setBusy(false);
    if (r?.error) setErr(r.error); else onClose();
  };
  return (
    <Modal title={`Locataire — ${property?.name || ""} · ${unit.label}`} onClose={onClose}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nom du locataire"><input className={inputCls} style={inputStyle} value={f.tenantName || ""} autoFocus onChange={(e) => set("tenantName", e.target.value)} placeholder="Ex. Mme DIALLO Aminata" /></Field>
        <Field label="Téléphone"><input className={inputCls} style={inputStyle} value={f.tenantPhone || ""} onChange={(e) => set("tenantPhone", e.target.value)} placeholder="+225 07 ..." /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="E-mail"><input className={inputCls} style={inputStyle} value={f.tenantEmail || ""} onChange={(e) => set("tenantEmail", e.target.value)} /></Field>
        <Field label="Statut du lot">
          <select className={inputCls} style={inputStyle} value={f.status} onChange={(e) => set("status", e.target.value)}>
            {Object.entries(UNIT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Début du bail"><input type="date" className={inputCls} style={inputStyle} value={f.leaseStart || ""} onChange={(e) => set("leaseStart", e.target.value)} /></Field>
        <Field label="Fin du bail"><input type="date" className={inputCls} style={inputStyle} value={f.leaseEnd || ""} onChange={(e) => set("leaseEnd", e.target.value)} /></Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Loyer mensuel"><input type="number" min={0} step={5000} className={inputCls} style={inputStyle} value={f.rent || 0} onChange={(e) => set("rent", e.target.value)} /></Field>
        <Field label="Charges"><input type="number" min={0} step={1000} className={inputCls} style={inputStyle} value={f.charges || 0} onChange={(e) => set("charges", e.target.value)} /></Field>
        <Field label="Loyer dû le" hint="Jour du mois"><input type="number" min={1} max={31} className={inputCls} style={inputStyle} value={f.dueDay || 5} onChange={(e) => set("dueDay", e.target.value)} /></Field>
      </div>
      <div className="rounded-xl border p-3 mb-3" style={{ borderColor: "#BFDBFE", background: "#EFF6FF" }}>
        <p className="text-xs font-semibold mb-1" style={{ color: "#1F5C82" }}>Versements d'entrée</p>
        <p className="text-[11px] mb-2" style={{ color: "var(--muted)" }}>
          Se saisit une seule fois, à l'entrée du locataire. Les mois d'avance seront automatiquement
          marqués comme réglés dans les tableaux de recouvrement concernés.
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Caution versée"><input type="number" min={0} step={5000} className={inputCls} style={inputStyle} value={f.deposit || 0} onChange={(e) => set("deposit", e.target.value)} /></Field>
          <Field label="Mois d'avance payés" hint="2 en général, parfois 1">
            <select className={inputCls} style={inputStyle} value={f.advanceMonths || 0} onChange={(e) => set("advanceMonths", Number(e.target.value))}>
              {[0, 1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n === 0 ? "Aucune avance" : `${n} mois`}</option>)}
            </select>
          </Field>
          <Field label="Premier mois couvert" hint="Début du bail par défaut">
            <input type="date" className={inputCls} style={inputStyle} value={f.advanceStart || f.leaseStart || ""} onChange={(e) => set("advanceStart", e.target.value)} />
          </Field>
        </div>
        {Number(f.advanceMonths) > 0 && (
          <p className="text-[11px]" style={{ color: "#1F5C82" }}>
            Soit <strong>{fcfa((Number(f.rent) || 0) * Number(f.advanceMonths))}</strong> d'avance couvrant {Number(f.advanceMonths)} mois
            à partir de {(f.advanceStart || f.leaseStart) ? fr((f.advanceStart || f.leaseStart) + "T00:00:00", { month: "long", year: "numeric" }) : "…"}.
          </p>
        )}
      </div>
      <div className="rounded-xl border p-3 mb-3" style={{ borderColor: "#F5C6C7", background: "#FDF2F2" }}>
        <p className="text-xs font-semibold mb-1" style={{ color: "#B5171D" }}>Arriérés antérieurs à l'outil</p>
        <p className="text-[11px] mb-2" style={{ color: "var(--muted)" }}>
          À ne remplir que pour une dette constituée <strong>avant</strong> l'utilisation de la plateforme.
          Les arriérés nés dans l'outil se calculent tout seuls à partir des tableaux de recouvrement.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Montant repris (FCFA)"><input type="number" min={0} step={5000} className={inputCls} style={inputStyle} value={f.arrearsAmount || 0} onChange={(e) => set("arrearsAmount", e.target.value)} /></Field>
          <Field label="Nombre de mois concernés"><input type="number" min={0} max={60} className={inputCls} style={inputStyle} value={f.arrearsMonths || 0} onChange={(e) => set("arrearsMonths", e.target.value)} /></Field>
        </div>
        <Field label="Origine / accord d'échelonnement"><input className={inputCls} style={inputStyle} value={f.arrearsNote || ""} onChange={(e) => set("arrearsNote", e.target.value)} placeholder="Ex. Impayés janvier à mars 2026, échelonnement convenu le 12/04" /></Field>
      </div>

      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> Enregistrer</button>
      </div>
    </Modal>
  );
}

/* ---------------- Quittance de loyer (modèle soigné + tampon PAYÉ) ---------------- */
function ReceiptModal({ initial, unit, property, owner, isAdminUser, onSave, onClose }) {
  const now = new Date();
  const [f, setF] = useState(() => ({
    docType: "quittance", date: isoDate(now),
    clientName: unit?.tenantName || "", clientPhone: unit?.tenantPhone || "", clientEmail: unit?.tenantEmail || "",
    propertyId: property?.id || "", unitId: unit?.id || "", ownerId: property?.ownerId || "",
    object: "", period: `${MONTHS_FR[now.getMonth()]} ${now.getFullYear()}`,
    fields: { mode: "Espèces", paidOn: isoDate(now), dueOn: "" },
    periodIso: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    status: "emis", notes: "", paidStamp: true, ...initial,
  }));
  const [lines, setLines] = useState(() => initial?.lines?.length ? initial.lines : [
    { label: "Loyer", qty: 1, unit: "mois", price: unit?.rent || 0 },
    ...(unit?.charges ? [{ label: "Charges", qty: 1, unit: "mois", price: unit.charges }] : []),
  ]);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setField = (k, v) => setF((p) => ({ ...p, fields: { ...p.fields, [k]: v } }));
  const total = linesTotal(lines);
  const submit = async () => {
    setBusy(true);
    const approval = f.paidStamp ? (isAdminUser ? "approuve" : "en_attente") : "non_requise";
    const r = await onSave({ ...f, lines, approval });
    setBusy(false);
    if (r?.error) setErr(r.error); else onClose();
  };
  return (
    <Modal title={f.id ? `Quittance ${f.ref || ""}` : "Nouvelle quittance de loyer"} onClose={onClose} wide>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Locataire"><input className={inputCls} style={inputStyle} value={f.clientName} onChange={(e) => set("clientName", e.target.value)} /></Field>
        <Field label="Téléphone"><input className={inputCls} style={inputStyle} value={f.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} /></Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Mois quittancé" hint="Reporté dans le recouvrement">
          <input type="month" className={inputCls} style={inputStyle} value={f.periodIso || ""}
            onChange={(e) => {
              const iso = e.target.value; const [y, mo] = iso.split("-");
              setF((p) => ({ ...p, periodIso: iso, period: iso ? `${MONTHS_FR[Number(mo) - 1]} ${y}` : p.period }));
            }} />
        </Field>
        <Field label="Date d'échéance"><input type="date" className={inputCls} style={inputStyle} value={f.fields.dueOn || ""} onChange={(e) => setField("dueOn", e.target.value)} /></Field>
        <Field label="Date de paiement"><input type="date" className={inputCls} style={inputStyle} value={f.fields.paidOn || ""} onChange={(e) => setField("paidOn", e.target.value)} /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Mode de paiement">
          <select className={inputCls} style={inputStyle} value={f.fields.mode || "Espèces"} onChange={(e) => setField("mode", e.target.value)}>
            {["Espèces", "Chèque", "Virement", "Mobile Money : Wave", "Mobile Money : Orange Money", "Mobile Money : MTN", "Mobile Money : Moov"].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Solde restant dû (FCFA)"><input type="number" min={0} step={1000} className={inputCls} style={inputStyle} value={f.fields.balance ?? 0} onChange={(e) => setField("balance", e.target.value)} /></Field>
      </div>

      <p className="text-xs font-semibold mb-2 mt-1" style={{ color: "var(--ink)" }}>Détail encaissé</p>
      <LineEditor lines={lines} setLines={setLines} labelPlaceholder="Ex. Loyer" />

      <div className="rounded-lg p-3 mt-4 mb-3" style={{ background: isAdminUser ? "#FDEAEA" : "#FFF8EC" }}>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={!!f.paidStamp} onChange={(e) => set("paidStamp", e.target.checked)} />
          <span>Apposer la mention <strong style={{ color: STAMP_RED }}>PAYÉ</strong> (tampon de l'agence)</span>
        </label>
        <p className="text-[11px] mt-1.5" style={{ color: isAdminUser ? "#B5171D" : "#8A6212" }}>
          {isAdminUser
            ? "Vous êtes administrateur : le tampon sera apposé dès l'enregistrement, et le paiement reporté dans le tableau de recouvrement du mois."
            : "La quittance partira en attente de validation. Un administrateur vérifiera puis apposera le tampon ; vous serez notifié et pourrez alors l'imprimer."}
        </p>
      </div>

      <Field label="Message au locataire"><textarea className={inputCls} style={inputStyle} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Merci pour votre paiement. Veuillez conserver cette quittance." /></Field>
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">Total : <strong style={{ color: "var(--brass)" }}>{fcfa(total)}</strong></span>
        <div className="flex gap-2">
          <button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
          <button disabled={!f.clientName.trim() || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> Enregistrer</button>
        </div>
      </div>
    </Modal>
  );
}

/* Quittance imprimable — modèle soigné */
function ReceiptSheet({ doc, unit, property, owner, author, validator, onBack }) {
  const total = doc.total || linesTotal(doc.lines || []);
  const balance = Number(doc.fields?.balance) || 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-3 print:hidden gap-2 flex-wrap">
        <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour</button>
        <button onClick={() => printSheet("portrait")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF</button>
      </div>

      {doc.approval === "en_attente" && (
        <div className="print:hidden rounded-xl border p-3 mb-3 max-w-3xl mx-auto flex items-start gap-2" style={{ borderColor: "#FCD9A6", background: "#FFF8EC" }}>
          <ShieldAlert size={16} style={{ color: "#C58A1B" }} className="mt-0.5 shrink-0" />
          <p className="text-xs" style={{ color: "#8A6212" }}>
            Quittance <strong>en attente de validation</strong> par un administrateur. Le tampon « PAYÉ » n'apparaîtra
            qu'après approbation : ne la remettez pas au client avant.
          </p>
        </div>
      )}
      {doc.approval === "refuse" && (
        <div className="print:hidden rounded-xl border p-3 mb-3 max-w-3xl mx-auto flex items-start gap-2" style={{ borderColor: "#F5C6C7", background: "#FDF2F2" }}>
          <AlertTriangle size={16} style={{ color: "#D81F26" }} className="mt-0.5 shrink-0" />
          <p className="text-xs" style={{ color: "#B5171D" }}>Quittance refusée{doc.approvalNote ? ` : ${doc.approvalNote}` : ""}.</p>
        </div>
      )}

      <div id="print-area" className="bg-white rounded-xl border p-6 max-w-3xl mx-auto relative overflow-hidden" style={{ borderColor: "var(--line)" }}>
        <PrintHead title={doc.ref} subtitle="Reçu de paiement de loyer" extra={
          <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>Abidjan, le {fr(doc.date + "T00:00:00", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
        } />

        <div className="text-center py-4">
          <h2 className="text-lg font-bold tracking-wide" style={{ color: "#3d7d20" }}>QUITTANCE DE LOYER</h2>
          <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--muted)" }}>Période : {doc.period || doc.fields?.periode || "—"}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div className="rounded-lg overflow-hidden border" style={{ borderColor: "var(--line)" }}>
            <p className="text-[11px] font-bold px-3 py-1.5" style={{ background: "#EAF6E3", color: "#3d7d20" }}>LOCATAIRE</p>
            <div className="p-3 text-sm">
              <p className="font-semibold">{doc.clientName}</p>
              {doc.clientPhone && <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{doc.clientPhone}</p>}
              {doc.clientEmail && <p className="text-xs" style={{ color: "var(--muted)" }}>{doc.clientEmail}</p>}
              {doc.clientAddr && <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{doc.clientAddr}</p>}
            </div>
          </div>
          <div className="rounded-lg overflow-hidden border" style={{ borderColor: "var(--line)" }}>
            <p className="text-[11px] font-bold px-3 py-1.5" style={{ background: "#EAF6E3", color: "#3d7d20" }}>BAIL</p>
            <div className="p-3 text-sm">
              <p><span style={{ color: "var(--muted)" }}>Propriété :</span> <strong>{property?.name || "—"}</strong></p>
              {unit && <p><span style={{ color: "var(--muted)" }}>Lot :</span> <strong>{unit.label}</strong></p>}
              {unit?.leaseStart && <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                Bail du {fr(unit.leaseStart + "T00:00:00", { day: "2-digit", month: "2-digit", year: "numeric" })}
                {unit.leaseEnd ? ` au ${fr(unit.leaseEnd + "T00:00:00", { day: "2-digit", month: "2-digit", year: "numeric" })}` : ""}
              </p>}
              {unit?.rent ? <p className="text-xs mt-1"><span style={{ color: "var(--muted)" }}>Loyer (dû le {unit.dueDay || 5} de chaque mois) :</span> <strong>{fcfa(unit.rent)}</strong></p> : null}
              <p className="text-xs mt-1"><span style={{ color: "var(--muted)" }}>Agence :</span> Entreprise Kibegnon — {AGENCY.tel}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg overflow-hidden border mb-3" style={{ borderColor: "var(--line)" }}>
          <p className="text-[11px] font-bold px-3 py-1.5" style={{ background: "#EAF6E3", color: "#3d7d20" }}>PAIEMENT</p>
          <div className="p-3">
            <table className="w-full text-sm mb-3">
              <thead><tr style={{ background: "#F6F8FA" }}>
                <th className="text-left px-2 py-1.5 font-semibold">Désignation</th>
                <th className="text-right px-2 py-1.5 font-semibold w-16">Qté</th>
                <th className="text-right px-2 py-1.5 font-semibold w-28">P. unitaire</th>
                <th className="text-right px-2 py-1.5 font-semibold w-28">Montant</th>
              </tr></thead>
              <tbody>{(doc.lines || []).filter((l) => (l.label || "").trim()).map((l, i) => (
                <tr key={i} className="border-b" style={{ borderColor: "var(--line)" }}>
                  <td className="px-2 py-1.5">{l.label}</td>
                  <td className="px-2 py-1.5 text-right">{qty(l.qty)} {l.unit}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fcfa(l.price)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-medium">{fcfa(lineTotal(l))}</td>
                </tr>
              ))}</tbody>
              <tfoot><tr style={{ background: "#F6F8FA" }}>
                <td colSpan={3} className="px-2 py-2 font-bold">MONTANT PAYÉ</td>
                <td className="px-2 py-2 text-right text-base font-bold tabular-nums" style={{ color: "#3d7d20" }}>{fcfa(total)}</td>
              </tr></tfoot>
            </table>

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <p><span style={{ color: "var(--muted)" }}>Date d'échéance :</span> <strong>{doc.fields?.dueOn ? fr(doc.fields.dueOn + "T00:00:00", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}</strong></p>
              <p><span style={{ color: "var(--muted)" }}>Date de paiement :</span> <strong>{doc.fields?.paidOn ? fr(doc.fields.paidOn + "T00:00:00", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}</strong></p>
              <p><span style={{ color: "var(--muted)" }}>Mode de paiement :</span> <strong>{doc.fields?.mode || "—"}</strong></p>
              <p><span style={{ color: "var(--muted)" }}>Solde restant dû :</span> <strong style={{ color: balance > 0 ? "#D81F26" : "#3d7d20" }}>{fcfa(balance)}</strong></p>
            </div>
          </div>
        </div>

        <p className="text-sm italic mb-3">Arrêtée la présente quittance à la somme de <strong>{amountInWords(total)}</strong>.</p>

        {doc.notes && (
          <div className="rounded-lg overflow-hidden border mb-3" style={{ borderColor: "var(--line)" }}>
            <p className="text-[11px] font-bold px-3 py-1.5" style={{ background: "#EAF6E3", color: "#3d7d20" }}>MESSAGE</p>
            <p className="p-3 text-sm whitespace-pre-wrap">{doc.notes}</p>
          </div>
        )}

        <div className="kb-sign flex justify-between items-start pt-8 gap-6" style={{ minHeight: 200 }}>
          <div style={{ minWidth: 250, paddingTop: 6 }}>
            {doc.paidStamp && doc.approval === "approuve" && (
              <PaidStamp date={doc.fields?.paidOn || doc.date} />
            )}
          </div>
          <div className="text-center shrink-0" style={{ minWidth: 190 }}>
            <p className="text-[11px] font-semibold pb-24">Pour l'Agence</p>
            <div className="border-t" style={{ borderColor: "var(--ink)" }} />
            <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>{author?.name || ""}</p>
            {doc.approval === "approuve" && validator && (
              <p className="text-[9px] mt-0.5" style={{ color: "var(--muted)" }}>Mention « PAYÉ » validée par {validator.name}</p>
            )}
          </div>
        </div>

        <PrintFoot note="Cette quittance atteste du paiement des sommes ci-dessus pour la période indiquée. À conserver sans limitation de durée." />
      </div>
    </div>
  );
}


/* Rendu d'un document : la mise en forme dépend de son type, jamais de
   l'endroit d'où on l'ouvre (Documents, Locataires, dossier, portefeuille). */
function DocumentSheet({ doc, unit, property, owner, author, validator, onBack }) {
  const cfg = DOC_TYPES[doc.docType] || DOC_TYPES.courrier;
  if (doc.docType === "quittance") {
    return <ReceiptSheet doc={doc} unit={unit} property={property} owner={owner} author={author} validator={validator} onBack={onBack} />;
  }
  if (cfg.layout === "decharge") {
    return <DechargeSheet doc={doc} author={author} onBack={onBack} />;
  }
  return <DocSheet doc={doc} property={property} owner={owner} author={author} onBack={onBack} />;
}

/* ---------------- Module LOCATAIRES ---------------- */
function Locataires({ store, me, userId }) {
  const { units, properties, owners, documents, members, rentPeriods, rentLines, actions } = store;
  const [search, setSearch] = useState("");
  const [filterProp, setFilterProp] = useState("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyArrears, setOnlyArrears] = useState(false);
  const [tenantModal, setTenantModal] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);
  const [sheetId, setSheetId] = useState(null);
  const [dossier, setDossier] = useState(null);

  const propById = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p])), [properties]);
  const ownerById = useMemo(() => Object.fromEntries(owners.map((o) => [o.id, o])), [owners]);
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const unitById = useMemo(() => Object.fromEntries(units.map((u) => [u.id, u])), [units]);
  const canStamp = isAdmin(me.role) || me.role === "comptable";
  /* Quittances en attente de validation, mises en avant dès l'ouverture */
  const pendingReceipts = documents.filter((d) => d.docType === "quittance" && d.approval === "en_attente");

  const sheetDoc = documents.find((d) => d.id === sheetId);
  if (sheetDoc) {
    return <DocumentSheet doc={sheetDoc} unit={unitById[sheetDoc.unitId]} property={propById[sheetDoc.propertyId]}
      owner={ownerById[sheetDoc.ownerId]} author={memberById[sheetDoc.createdBy]}
      validator={memberById[sheetDoc.approvedBy]} onBack={() => setSheetId(null)} />;
  }
  if (dossier) {
    return <Dossier store={store} me={me} userId={userId} scope="locataire" unit={dossier.unit}
      property={dossier.property} onBack={() => setDossier(null)} onOpenDoc={(d) => { setDossier(null); setSheetId(d.id); }} />;
  }

  /* Situation de paiement : tableaux de recouvrement + quittances émises */
  const situation = (u) => arrearsOf(u, store);
  const lastPayment = (u) => {
    const last = situation(u).last;
    return last ? { period: last.period, status: payStatusOf(last.expected, last.collected),
      collected: last.collected, expected: last.expected } : null;
  };

  const tenants = units.filter((u) => (u.tenantName || "").trim() || u.status === "occupe");
  const list = tenants.filter((u) => {
    const p = propById[u.propertyId];
    return (filterProp === "all" || u.propertyId === filterProp) &&
      (!onlyMine || p?.agentId === userId) &&
      (!onlyArrears || situation(u).hasArrears) &&
      (!search || (u.tenantName || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.tenantPhone || "").includes(search) || (u.label || "").toLowerCase().includes(search.toLowerCase()) ||
        (p?.name || "").toLowerCase().includes(search.toLowerCase()));
  });

  const withoutPhone = list.filter((u) => !(u.tenantPhone || "").trim()).length;
  const rentRoll = list.reduce((a, u) => a + (u.rent || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Locataires</h1>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Recensement des locataires par lot, coordonnées et quittances de loyer.</p>

      {pendingReceipts.length > 0 && (
        <div className="rounded-xl border p-3 mb-4" style={{ borderColor: "#FCD9A6", background: "#FFF8EC" }}>
          <p className="text-sm font-semibold mb-2" style={{ color: "#8A6212" }}>
            <ShieldAlert size={15} className="inline mb-0.5" /> {pendingReceipts.length} quittance(s) en attente de validation
            {!canStamp && " — un administrateur doit apposer la mention PAYÉ"}
          </p>
          <div className="divide-y" style={{ borderColor: "#F3E2C6" }}>
            {pendingReceipts.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 flex-wrap py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.ref} · {d.clientName} · {d.period || "—"}</p>
                  <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                    {fcfa(d.total)} — établie par {memberById[d.createdBy]?.name || "—"}
                    {" le "}{fr(d.date + "T00:00:00", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => setSheetId(d.id)} className="kb-btn kb-btn-ghost text-xs"><Eye size={13} /> Vérifier</button>
                  {isAdmin(me.role) && <>
                    <button onClick={async () => {
                      const r = await actions.approveDocument(d.id, true);
                      if (r?.error) alert(r.error);
                      else if (r?.skipped) alert(`Quittance validée. Report dans le recouvrement non effectué : ${r.skipped}.`);
                    }} className="kb-btn text-xs px-2.5 py-1.5" style={{ background: "#4F9E2A", color: "#fff" }}><ThumbsUp size={13} /> Valider</button>
                    <button onClick={async () => { const n = prompt("Motif du refus :", ""); if (n !== null) await actions.approveDocument(d.id, false, n); }}
                      className="kb-btn text-xs px-2.5 py-1.5" style={{ background: "#fff", color: "#D81F26", border: "1px solid #D81F2655" }}><ThumbsDown size={13} /> Refuser</button>
                  </>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Users} label="Locataires recensés" value={list.length} sub={`${units.length} lot(s) au total`} tint="#2E78A8" onClick={() => { setOnlyArrears(false); setSearch(""); }} />
        <StatCard icon={Wallet} label="Loyer mensuel cumulé" value={fcfa(rentRoll)} tint="#4F9E2A" />
        <StatCard icon={AlertTriangle} label="Locataires en arriéré" onClick={() => setOnlyArrears(true)}
          value={tenants.filter((u) => situation(u).hasArrears).length}
          sub={fcfa(tenants.reduce((a, u) => a + situation(u).total, 0))} tint="#D81F26" />
        <StatCard icon={Receipt} label="Quittances émises" value={documents.filter((d) => d.docType === "quittance").length} tint="var(--brass)" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[150px]">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, téléphone, lot, bâtiment…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
        </div>
        <select value={filterProp} onChange={(e) => setFilterProp(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Tous les bâtiments</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={() => setOnlyMine((s) => !s)} className="kb-btn kb-btn-ghost text-sm" style={onlyMine ? { background: "var(--ink)", color: "#fff" } : undefined}>
          <BadgeCheck size={14} /> Mes biens
        </button>
        <button onClick={() => setOnlyArrears((s) => !s)} className="kb-btn kb-btn-ghost text-sm"
          style={onlyArrears ? { background: "#D81F26", color: "#fff" } : undefined}>
          <AlertTriangle size={14} /> En arriéré ({tenants.filter((u) => situation(u).hasArrears).length})
        </button>
      </div>

      {list.length ? (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left" style={{ color: "var(--muted)" }}>
              <th className="px-4 py-2.5 font-medium">Locataire</th>
              <th className="px-3 py-2.5 font-medium">Téléphone</th>
              <th className="px-3 py-2.5 font-medium">Bâtiment / lot</th>
              <th className="px-3 py-2.5 font-medium">Loyer</th>
              <th className="px-3 py-2.5 font-medium">Avance d'entrée</th>
              <th className="px-3 py-2.5 font-medium">Arriérés / reliquats</th>
              <th className="px-3 py-2.5 font-medium">Dernier paiement</th>
              <th className="px-3 py-2.5 font-medium">Agent</th>
              <th />
            </tr></thead>
            <tbody>{list.map((u) => {
              const p = propById[u.propertyId];
              const pay = lastPayment(u);
              const st = pay ? PAY_STATUS[pay.status] : null;
              const a = situation(u);
              return (
                <tr key={u.id} className="border-t" style={{ borderColor: a.hasArrears ? "#F5C6C7" : "var(--line)", background: a.hasArrears ? "#FEF7F7" : undefined }}>
                  <td className="px-4 py-2.5">
                    {u.tenantName
                      ? <button onClick={() => setDossier({ unit: u, property: p })} className="font-medium hover:underline text-left flex items-center gap-1.5" style={{ color: "#2E78A8" }}>
                          <FolderOpen size={13} /> {u.tenantName}
                        </button>
                      : <span style={{ color: "#B6BEC9" }}>non renseigné</span>}
                    {u.tenantEmail && <p className="text-[11px]" style={{ color: "var(--muted)" }}>{u.tenantEmail}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    {u.tenantPhone
                      ? <a href={`tel:${u.tenantPhone}`} className="hover:underline" style={{ color: "#2E78A8" }}>{u.tenantPhone}</a>
                      : <span style={{ color: "#D81F26" }}>à compléter</span>}
                  </td>
                  <td className="px-3 py-2.5"><span style={{ color: "var(--muted)" }}>{p?.name || "—"}</span> · <strong>{u.label}</strong></td>
                  <td className="px-3 py-2.5 tabular-nums">{fcfa(u.rent)}</td>
                  <td className="px-3 py-2.5">
                    {Number(u.advanceMonths) > 0
                      ? <Chip color="#2E78A8">{u.advanceMonths} mois{(u.advanceStart || u.leaseStart) ? ` dès ${fr((u.advanceStart || u.leaseStart) + "T00:00:00", { month: "short", year: "2-digit" })}` : ""}</Chip>
                      : <span className="text-xs" style={{ color: "var(--muted)" }}>—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {a.hasArrears ? (
                      <div>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "#FDEAEA", color: "#D81F26" }}>
                          {arrearsLabel(a)}
                        </span>
                        {a.partialMonths.length > 0 && (
                          <p className="text-[10px] mt-0.5" style={{ color: "#EA580C" }}>
                            dont {a.partialMonths.length} reliquat(s) · {fcfa(a.partialMonths.reduce((x, m) => x + m.due, 0))}
                          </p>
                        )}
                      </div>
                    ) : <span className="text-xs" style={{ color: "#4F9E2A" }}>à jour</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {pay ? <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label} · {pay.period}</span>
                         : <span className="text-xs" style={{ color: "var(--muted)" }}>aucun relevé</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: p?.agentId ? "var(--ink)" : "#B6BEC9" }}>{memberById[p?.agentId]?.name || "non attribué"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setReceiptModal({ unit: u, property: p })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Établir une quittance"><Receipt size={14} /></button>
                      <button onClick={() => setTenantModal({ unit: u, property: p })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Modifier le locataire"><Pencil size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table></div>
        </div>
      ) : <EmptyState icon={Users} title="Aucun locataire recensé"
        sub="Les locataires se saisissent sur les lots, dans Patrimoine ou directement ici." />}

      {/* Quittances déjà émises */}
      {documents.filter((d) => d.docType === "quittance").length > 0 && (
        <SectionCard title="Quittances émises" icon={Receipt} pad={false}>
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>
            {documents.filter((d) => d.docType === "quittance").slice(0, 12).map((d) => (
              <div key={d.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.clientName} · {d.period || "—"}</p>
                  <p className="text-[11px]" style={{ color: "var(--muted)" }}>{d.ref} · {fr(d.date + "T00:00:00", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {d.paidStamp && d.approval === "approuve" && (
                    <Chip color={STAMP_RED} bg="#FDEAEA">PAYÉ · validé par {memberById[d.approvedBy]?.name?.split(" ")[0] || "—"}</Chip>
                  )}
                  {d.approval === "en_attente" && <Chip color="#C58A1B" dot>à valider</Chip>}
                  <span className="text-sm font-semibold tabular-nums">{fcfa(d.total)}</span>
                  <button onClick={() => setSheetId(d.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Imprimer"><Printer size={14} /></button>
                  {canStamp && <button onClick={() => setReceiptModal({ doc: d, unit: unitById[d.unitId], property: propById[d.propertyId] })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Pencil size={14} /></button>}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {tenantModal && <TenantModal unit={tenantModal.unit} property={tenantModal.property}
        onSave={actions.saveUnit} onClose={() => setTenantModal(null)} />}

      {receiptModal && <ReceiptModal initial={receiptModal.doc} unit={receiptModal.unit} property={receiptModal.property}
        owner={ownerById[receiptModal.property?.ownerId]} isAdminUser={isAdmin(me.role)}
        onSave={async (f) => { const r = await actions.saveDocument(f); if (!r.error && r.id) setSheetId(r.id); return r; }}
        onClose={() => setReceiptModal(null)} />}
    </div>
  );
}

/* ---------------- Module PLAINTES ---------------- */
function ComplaintModal({ initial, properties, units, members, quotes, onSave, onClose }) {
  const [f, setF] = useState(() => ({
    propertyId: "", unitId: "", tenantName: "", tenantPhone: "",
    category: "reparation_plomberie", cause: "indetermine", priority: "normale",
    description: "", reportedAt: isoDate(new Date()), channel: "telephone",
    status: "signale", assignedTo: "", quoteId: "", cost: "", resolution: "", resolvedAt: "", ...initial,
  }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const propUnits = units.filter((u) => u.propertyId === f.propertyId);

  const pickUnit = (id) => {
    const u = units.find((x) => x.id === id);
    setF((s) => ({ ...s, unitId: id, tenantName: u?.tenantName || s.tenantName, tenantPhone: u?.tenantPhone || s.tenantPhone }));
  };
  const submit = async () => {
    setBusy(true);
    const r = await onSave({ ...f, resolvedAt: ["resolu", "clos"].includes(f.status) ? (f.resolvedAt || isoDate(new Date())) : null });
    setBusy(false);
    if (r?.error) setErr(r.error); else onClose();
  };

  const groups = [...new Set(Object.values(COMPLAINT_CATEGORY).map((c) => c.group))];

  return (
    <Modal title={f.id ? `Plainte ${f.ref || ""}` : "Enregistrer une plainte"} onClose={onClose} wide>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Bâtiment concerné">
          <select className={inputCls} style={inputStyle} value={f.propertyId || ""} onChange={(e) => setF((p) => ({ ...p, propertyId: e.target.value, unitId: "" }))}>
            <option value="">— Non précisé —</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Lot / appartement">
          <select className={inputCls} style={inputStyle} value={f.unitId || ""} onChange={(e) => pickUnit(e.target.value)} disabled={!f.propertyId}>
            <option value="">— Non précisé —</option>
            {propUnits.map((u) => <option key={u.id} value={u.id}>{u.label}{u.tenantName ? ` — ${u.tenantName}` : ""}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Locataire plaignant"><input className={inputCls} style={inputStyle} value={f.tenantName} onChange={(e) => set("tenantName", e.target.value)} /></Field>
        <Field label="Téléphone"><input className={inputCls} style={inputStyle} value={f.tenantPhone} onChange={(e) => set("tenantPhone", e.target.value)} /></Field>
      </div>

      <Field label="Nature de la plainte">
        <select className={inputCls} style={inputStyle} value={f.category} onChange={(e) => set("category", e.target.value)}>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {Object.entries(COMPLAINT_CATEGORY).filter(([, c]) => c.group === g).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
            </optgroup>
          ))}
        </select>
      </Field>

      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Cause identifiée" hint="Détermine qui supporte les frais">
          <select className={inputCls} style={inputStyle} value={f.cause} onChange={(e) => set("cause", e.target.value)}>
            {Object.entries(COMPLAINT_CAUSE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Priorité">
          <select className={inputCls} style={inputStyle} value={f.priority} onChange={(e) => set("priority", e.target.value)}>
            {URGENCY_ORDER.map((u) => <option key={u} value={u}>{URGENCY[u].label}</option>)}
          </select>
        </Field>
        <Field label="Reçue par">
          <select className={inputCls} style={inputStyle} value={f.channel} onChange={(e) => set("channel", e.target.value)}>
            {Object.entries(COMPLAINT_CHANNEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Description de la plainte">
        <textarea className={inputCls} style={inputStyle} rows={3} value={f.description} onChange={(e) => set("description", e.target.value)}
          placeholder="Ex. Fuite au niveau du lavabo de la salle de bain depuis deux jours." />
      </Field>

      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Date du signalement"><input type="date" className={inputCls} style={inputStyle} value={f.reportedAt} onChange={(e) => set("reportedAt", e.target.value)} /></Field>
        <Field label="Statut">
          <select className={inputCls} style={inputStyle} value={f.status} onChange={(e) => set("status", e.target.value)}>
            {COMPLAINT_STATUS_ORDER.map((k) => <option key={k} value={k}>{COMPLAINT_STATUS[k].label}</option>)}
          </select>
        </Field>
        <Field label="Traitée par">
          <select className={inputCls} style={inputStyle} value={f.assignedTo || ""} onChange={(e) => set("assignedTo", e.target.value)}>
            <option value="">— Non attribuée —</option>
            {members.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="rounded-xl border p-3 mb-3" style={{ borderColor: "var(--line)", background: "#FAFBFC" }}>
        <p className="text-xs font-semibold mb-2">Traitement et règlement</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Devis artisan lié">
            <select className={inputCls} style={inputStyle} value={f.quoteId || ""} onChange={(e) => set("quoteId", e.target.value)}>
              <option value="">— Aucun —</option>
              {quotes.filter((q) => !f.propertyId || q.propertyId === f.propertyId).map((q) => (
                <option key={q.id} value={q.id}>{q.ref} — {q.artisanName} ({fcfa(q.total)})</option>
              ))}
            </select>
          </Field>
          <Field label="Coût du règlement (FCFA)"><input type="number" min={0} step={1000} className={inputCls} style={inputStyle} value={f.cost} onChange={(e) => set("cost", e.target.value)} /></Field>
        </div>
        <Field label="Suite donnée / résolution">
          <textarea className={inputCls} style={inputStyle} rows={2} value={f.resolution} onChange={(e) => set("resolution", e.target.value)}
            placeholder="Ex. Intervention du plombier le 12/08, joint remplacé, fuite arrêtée." />
        </Field>
        {["resolu", "clos"].includes(f.status) && (
          <Field label="Date de règlement"><input type="date" className={inputCls} style={inputStyle} value={f.resolvedAt || ""} onChange={(e) => set("resolvedAt", e.target.value)} /></Field>
        )}
      </div>

      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!f.description.trim() || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> Enregistrer</button>
      </div>
    </Modal>
  );
}

function Plaintes({ store, me, userId }) {
  const { complaints, properties, units, members, quotes, actions } = store;
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ouvertes");
  const [filterProp, setFilterProp] = useState("all");
  const [modal, setModal] = useState(null);

  const propById = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p])), [properties]);
  const unitById = useMemo(() => Object.fromEntries(units.map((u) => [u.id, u])), [units]);
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);

  const open = complaints.filter((c) => ["signale", "en_cours", "en_attente"].includes(c.status));
  const list = complaints.filter((c) =>
    (filterStatus === "all" || (filterStatus === "ouvertes" ? ["signale", "en_cours", "en_attente"].includes(c.status) : c.status === filterStatus)) &&
    (filterProp === "all" || c.propertyId === filterProp) &&
    (!search || (c.tenantName || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.ref || "").toLowerCase().includes(search.toLowerCase())));

  const delay = (c) => {
    const end = c.resolvedAt ? new Date(c.resolvedAt) : new Date();
    return Math.max(0, Math.round((end - new Date(c.reportedAt)) / 86400000));
  };
  const byCategory = useMemo(() => {
    const m = {};
    complaints.forEach((c) => {
      const cfg = COMPLAINT_CATEGORY[c.category] || COMPLAINT_CATEGORY.autre;
      m[c.category] = m[c.category] || { name: cfg.label, value: 0, color: cfg.color };
      m[c.category].value += 1;
    });
    return Object.values(m).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [complaints]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Plaintes des locataires</h1>
        <button onClick={() => setModal({})} className="kb-btn kb-btn-primary"><Plus size={16} /> Enregistrer une plainte</button>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Du signalement au règlement : nature, cause, traitement et suite donnée.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={AlertTriangle} label="Plaintes ouvertes" value={open.length} sub={`${complaints.length} au total`} tint="#D81F26" onClick={() => setFilterStatus("ouvertes")} />
        <StatCard icon={Clock} label="Urgentes" value={open.filter((c) => c.priority === "urgente" || c.priority === "haute").length} tint="#EA580C" />
        <StatCard icon={CheckCircle2} label="Résolues" value={complaints.filter((c) => ["resolu", "clos"].includes(c.status)).length} tint="#4F9E2A" onClick={() => setFilterStatus("resolu")} />
        <StatCard icon={Wallet} label="Coût des règlements" value={fcfa(complaints.reduce((a, c) => a + (Number(c.cost) || 0), 0))} tint="var(--brass)" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[150px]">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Locataire, description, référence…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="ouvertes">Plaintes ouvertes</option>
          <option value="all">Toutes</option>
          {COMPLAINT_STATUS_ORDER.map((k) => <option key={k} value={k}>{COMPLAINT_STATUS[k].label}</option>)}
        </select>
        <select value={filterProp} onChange={(e) => setFilterProp(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Tous les bâtiments</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {byCategory.length > 0 && (
        <SectionCard title="Motifs les plus fréquents" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={Math.max(150, byCategory.length * 28)}>
            <BarChart data={byCategory} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEF1F5" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [`${v} plainte(s)`, "Total"]} />
              <Bar dataKey="value" radius={[0, 5, 5, 0]}>{byCategory.map((d, i) => <Cell key={i} fill={d.color} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {list.length ? <div className="space-y-2">
        {list.map((c) => {
          const cfg = COMPLAINT_CATEGORY[c.category] || COMPLAINT_CATEGORY.autre;
          const st = COMPLAINT_STATUS[c.status];
          const ur = URGENCY[c.priority];
          const u = unitById[c.unitId];
          const openDays = delay(c);
          return (
            <div key={c.id} className="bg-white rounded-xl border p-3" style={{ borderColor: st.color + "33" }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: "#F1F3F5", color: "var(--muted)" }}>{c.ref}</span>
                    <Chip color={cfg.color} dot>{cfg.label}</Chip>
                    <Chip color={ur.color} bg={ur.bg}>{ur.label}</Chip>
                    <Chip color={st.color}>{st.label}</Chip>
                  </div>
                  <p className="text-sm mt-1.5">{c.description}</p>
                  <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
                    {c.tenantName || "Locataire non précisé"}{c.tenantPhone ? ` · ${c.tenantPhone}` : ""}
                    {propById[c.propertyId] ? ` · ${propById[c.propertyId].name}` : ""}{u ? ` — ${u.label}` : ""}
                    {" · "}signalée le {fr(c.reportedAt + "T00:00:00", { day: "numeric", month: "short", year: "numeric" })} ({COMPLAINT_CHANNEL[c.channel]})
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
                    Cause : <strong style={{ color: "var(--ink)" }}>{COMPLAINT_CAUSE[c.cause]}</strong>
                    {c.assignedTo ? ` · traitée par ${memberById[c.assignedTo]?.name || "—"}` : " · non attribuée"}
                    {" · "}
                    <span style={{ color: ["resolu", "clos"].includes(c.status) ? "#4F9E2A" : openDays > 7 ? "#D81F26" : "var(--muted)" }}>
                      {["resolu", "clos"].includes(c.status) ? `réglée en ${openDays} jour(s)` : `ouverte depuis ${openDays} jour(s)`}
                    </span>
                  </p>
                  {c.resolution && <p className="text-[11px] mt-1.5 italic p-2 rounded" style={{ background: "#F6FBF3", color: "#3d7d20" }}>{c.resolution}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {Number(c.cost) > 0 && <span className="text-sm font-bold tabular-nums" style={{ color: "var(--brass)" }}>{fcfa(c.cost)}</span>}
                  <select value={c.status} onChange={(e) => actions.saveComplaint({ ...c, status: e.target.value, resolvedAt: ["resolu", "clos"].includes(e.target.value) ? (c.resolvedAt || isoDate(new Date())) : null })}
                    className="text-xs px-2 py-1 rounded-lg border bg-white" style={{ borderColor: st.color + "55", color: st.color }}>
                    {COMPLAINT_STATUS_ORDER.map((k) => <option key={k} value={k}>{COMPLAINT_STATUS[k].label}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <button onClick={() => setModal(c)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Pencil size={14} /></button>
                    {canSupervise(me.role) && <button onClick={async () => { if (confirm(`Supprimer la plainte ${c.ref} ?`)) await actions.deleteComplaint(c.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div> : <EmptyState icon={AlertTriangle} title="Aucune plainte" sub="Enregistrez les signalements des locataires pour en assurer le suivi."
        action={<button onClick={() => setModal({})} className="kb-btn kb-btn-primary"><Plus size={15} /> Enregistrer une plainte</button>} />}

      {modal && <ComplaintModal initial={modal} properties={properties} units={units} members={members} quotes={quotes}
        onSave={actions.saveComplaint} onClose={() => setModal(null)} />}
    </div>
  );
}

/* ---------------- Module MON PORTEFEUILLE (agent commercial) ---------------- */
function Portefeuille({ store, me, userId }) {
  const { properties, units, owners, members, rentPeriods, rentLines, complaints, tasks, quotes } = store;
  const [agentId, setAgentId] = useState(userId);
  const [search, setSearch] = useState("");
  const sup = canSupervise(me.role);
  const who = sup ? agentId : userId;

  const ownerById = useMemo(() => Object.fromEntries(owners.map((o) => [o.id, o])), [owners]);
  const mine = properties.filter((p) => p.agentId === who);
  const mineIds = new Set(mine.map((p) => p.id));
  const myUnits = units.filter((u) => mineIds.has(u.propertyId));
  const myTenants = myUnits.filter((u) => (u.tenantName || "").trim());
  const myComplaints = complaints.filter((c) => mineIds.has(c.propertyId) && ["signale", "en_cours", "en_attente"].includes(c.status));

  const situation = (u) => arrearsOf(u, store);
  const lastPayment = (u) => {
    const last = situation(u).last;
    return last ? { period: last.period, status: payStatusOf(last.expected, last.collected),
      collected: last.collected, expected: last.expected } : null;
  };

  const payments = myTenants.map((u) => ({ u, pay: lastPayment(u), arr: situation(u) }));
  const q = search.trim().toLowerCase();
  const filteredPayments = q
    ? payments.filter(({ u }) => (u.tenantName || "").toLowerCase().includes(q)
        || (u.tenantPhone || "").includes(q)
        || (u.label || "").toLowerCase().includes(q)
        || (properties.find((p) => p.id === u.propertyId)?.name || "").toLowerCase().includes(q))
    : payments;
  /* Regroupement par bâtiment, comme dans le patrimoine */
  const byBuilding = mine
    .map((p) => ({ property: p, rows: filteredPayments.filter(({ u }) => u.propertyId === p.id) }))
    .filter((g) => g.rows.length > 0);
  const unpaid = payments.filter((x) => x.arr.hasArrears);
  const expectedTotal = myUnits.reduce((a, u) => a + (u.rent || 0), 0);
  const vacants = myUnits.filter((u) => u.status === "vacant");

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Mon portefeuille</h1>
        {sup && (
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
            {members.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Les biens qui vous sont attribués, leurs locataires et leur état de paiement.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Building2} label="Biens attribués" value={mine.length} sub={`${myUnits.length} lot(s)`} tint="#2E78A8" />
        <StatCard icon={Users} label="Locataires suivis" value={myTenants.length} tint="#4F9E2A" />
        <StatCard icon={Wallet} label="Loyer mensuel attendu" value={fcfa(expectedTotal)} tint="var(--brass)" />
        <StatCard icon={AlertTriangle} label="Points d'attention" value={unpaid.length + vacants.length + myComplaints.length}
          sub={`${unpaid.length} en arriéré · ${vacants.length} vacant(s) · ${myComplaints.length} plainte(s)`} tint="#D81F26" />
      </div>

      {mine.length === 0 ? (
        <EmptyState icon={BadgeCheck} title="Aucun bien attribué"
          sub="L'attribution se fait dans Patrimoine, sur la fiche de chaque bien (champ « Agent en charge »)." />
      ) : (
        <>
          {unpaid.length > 0 && (
            <SectionCard title={`À relancer (${unpaid.length})`} icon={AlertTriangle} pad={false}>
              <div className="divide-y" style={{ borderColor: "var(--line)" }}>
                {unpaid.map(({ u, arr }) => (
                  <div key={u.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.tenantName} · {u.label}</p>
                      <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                        {properties.find((p) => p.id === u.propertyId)?.name}
                        {u.tenantPhone ? ` · ${u.tenantPhone}` : ""}
                        {arr.unpaidMonths.length > 0 ? ` · impayés : ${arr.unpaidMonths.map((m) => m.period).join(", ")}` : ""}
                        {arr.partialMonths.length > 0 ? ` · reliquats : ${arr.partialMonths.map((m) => m.period).join(", ")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "#FDEAEA", color: "#D81F26" }}>{arrearsLabel(arr)}</span>
                      {u.tenantPhone && <a href={`tel:${u.tenantPhone}`} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Phone size={14} /></a>}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard title={`Mes biens (${mine.length})`} icon={Building2} pad={false}>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-left" style={{ color: "var(--muted)" }}>
                <th className="px-4 py-2.5 font-medium">Bien</th>
                <th className="px-3 py-2.5 font-medium">Propriétaire</th>
                <th className="px-3 py-2.5 font-medium">Lots</th>
                <th className="px-3 py-2.5 font-medium">Occupation</th>
                <th className="px-3 py-2.5 font-medium">Loyer attendu</th>
              </tr></thead>
              <tbody>{mine.map((p) => {
                const pu = units.filter((u) => u.propertyId === p.id);
                const occ = pu.filter((u) => u.status === "occupe").length;
                return (
                  <tr key={p.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                    <td className="px-4 py-2.5"><p className="font-medium">{p.name}</p><p className="text-[11px]" style={{ color: "var(--muted)" }}>{[p.quartier, p.commune].filter(Boolean).join(", ")}</p></td>
                    <td className="px-3 py-2.5">{ownerById[p.ownerId]?.name || "—"}</td>
                    <td className="px-3 py-2.5">{pu.length || "—"}</td>
                    <td className="px-3 py-2.5">{pu.length ? `${occ}/${pu.length}` : "—"}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fcfa(pu.reduce((a, u) => a + (u.rent || 0), 0) || p.rent || 0)}</td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          </SectionCard>

          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <h2 className="font-semibold text-sm flex items-center gap-2"><Users size={16} style={{ color: "var(--brass)" }} /> Mes locataires ({filteredPayments.length}{search ? ` sur ${payments.length}` : ""})</h2>
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un locataire, un lot, un téléphone…"
                className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
            </div>
          </div>

          {byBuilding.length === 0 ? (
            <EmptyState icon={Users} title="Aucun locataire trouvé" sub="Essayez un autre terme de recherche." />
          ) : byBuilding.map((grp) => (
            <SectionCard key={grp.property.id} title={`${grp.property.name} — ${grp.rows.length} locataire(s)`} icon={Building2} pad={false}
              action={<span className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>{fcfa(grp.rows.reduce((a, x) => a + (x.u.rent || 0), 0))}/mois</span>}>
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="text-left" style={{ color: "var(--muted)" }}>
                  <th className="px-4 py-2.5 font-medium">Lot</th>
                  <th className="px-3 py-2.5 font-medium">Locataire</th>
                  <th className="px-3 py-2.5 font-medium">Téléphone</th>
                  <th className="px-3 py-2.5 font-medium">Loyer</th>
                  <th className="px-3 py-2.5 font-medium">Avance</th>
                  <th className="px-3 py-2.5 font-medium">Arriérés</th>
                  <th className="px-3 py-2.5 font-medium">Dernier paiement</th>
                </tr></thead>
                <tbody>{grp.rows.map(({ u, pay, arr }) => {
                  const st = pay ? PAY_STATUS[pay.status] : null;
                  return (
                    <tr key={u.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                      <td className="px-4 py-2.5 font-medium">{u.label}</td>
                      <td className="px-3 py-2.5">{u.tenantName}</td>
                      <td className="px-3 py-2.5">{u.tenantPhone
                        ? <a href={`tel:${u.tenantPhone}`} className="hover:underline" style={{ color: "#2E78A8" }}>{u.tenantPhone}</a>
                        : <span style={{ color: "#D81F26" }}>à compléter</span>}</td>
                      <td className="px-3 py-2.5 tabular-nums">{fcfa(u.rent)}</td>
                      <td className="px-3 py-2.5">{Number(u.advanceMonths) > 0
                        ? <Chip color="#2E78A8">{u.advanceMonths} mois</Chip>
                        : <span className="text-xs" style={{ color: "var(--muted)" }}>—</span>}</td>
                      <td className="px-3 py-2.5">{arr.hasArrears
                        ? <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "#FDEAEA", color: "#D81F26" }}>{arrearsLabel(arr)}</span>
                        : <span className="text-xs" style={{ color: "#4F9E2A" }}>à jour</span>}</td>
                      <td className="px-3 py-2.5">{pay
                        ? <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label} · {pay.period}</span>
                        : <span className="text-xs" style={{ color: "var(--muted)" }}>aucun relevé</span>}</td>
                    </tr>
                  );
                })}</tbody>
              </table></div>
            </SectionCard>
          ))}

          {myComplaints.length > 0 && (
            <SectionCard title={`Plaintes en cours (${myComplaints.length})`} icon={AlertTriangle} pad={false}>
              <div className="divide-y" style={{ borderColor: "var(--line)" }}>
                {myComplaints.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{c.description}</p>
                      <p className="text-[11px]" style={{ color: "var(--muted)" }}>{c.ref} · {c.tenantName} · {properties.find((p) => p.id === c.propertyId)?.name}</p>
                    </div>
                    <Chip color={COMPLAINT_STATUS[c.status].color} dot>{COMPLAINT_STATUS[c.status].label}</Chip>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════
   TAMPON « PAYÉ » · DÉCHARGES · SÉLECTEUR DE PERSONNE · DOSSIERS NUMÉRIQUES
   ══════════════════════════════════════════════════════════════════════ */

/* Tampon encreur reprenant celui de l'agence : PAYÉ · logo · téléphone · date */
function PaidStamp({ date, angle = -8, scale = 1 }) {
  return (
    <div style={{ height: 150 * scale, width: 250 * scale, position: "relative" }}>
      <div style={{ transform: `rotate(${angle}deg) scale(${scale})`, transformOrigin: "left top",
        display: "inline-block", position: "absolute", left: 8, top: 8 }}>
      <div style={{
        border: `3px solid ${STAMP_RED}`, borderRadius: 10, padding: "8px 18px 6px",
        color: STAMP_RED, textAlign: "center", opacity: 0.88, minWidth: 210,
        boxShadow: `inset 0 0 0 1px ${STAMP_RED}22`,
      }}>
        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 6, lineHeight: 1, marginBottom: 2 }}>PAYÉ</div>
        <div style={{ borderTop: `1.5px solid ${STAMP_RED}`, margin: "4px 0 3px" }} />
        <img src={LOGO_STAMP} alt="" style={{ height: 22, width: "auto", display: "block", margin: "0 auto" }} />
        <div style={{ borderTop: `1.5px solid ${STAMP_RED}`, margin: "3px 0 3px" }} />
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.2 }}>Tél : 07 87 84 33 68 / 01 51 96 60 67</div>
        {date && <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, marginTop: 3 }}>
          {fr(date + "T00:00:00", { day: "2-digit", month: "2-digit", year: "numeric" })}
        </div>}
      </div>
      </div>
    </div>
  );
}

/* ---------------- Sélecteur de personne (locataire / propriétaire) ----------------
   Propose les noms connus au fil de la frappe, sans empêcher la saisie libre. */
function PersonPicker({ label, hint, value, onPick, options, placeholder }) {
  const listId = useRef("pp-" + Math.random().toString(36).slice(2, 9)).current;
  return (
    <Field label={label} hint={hint}>
      <input list={listId} className={inputCls} style={inputStyle} value={value || ""}
        onChange={(e) => {
          const v = e.target.value;
          const hit = options.find((o) => o.name.toLowerCase() === v.toLowerCase());
          onPick(v, hit || null);
        }}
        placeholder={placeholder} />
      <datalist id={listId}>
        {options.map((o) => <option key={o.key} value={o.name}>{o.detail}</option>)}
      </datalist>
    </Field>
  );
}

/* ---------------- Décharge (remise ou versement de fonds) ---------------- */
function DechargeSheet({ doc, author, onBack }) {
  const f = doc.fields || {};
  const line = (w = "100%") => (
    <span style={{ display: "inline-block", borderBottom: "1px dotted #94A3B8", minWidth: w, verticalAlign: "bottom" }}>&nbsp;</span>
  );
  const val = (v, w) => v
    ? <span style={{ fontWeight: 600 }}>{v}</span>
    : line(w);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 print:hidden gap-2 flex-wrap">
        <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour</button>
        <button onClick={() => printSheet("portrait")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF</button>
      </div>

      <div id="print-area" className="bg-white rounded-xl border p-7 max-w-3xl mx-auto" style={{ borderColor: "var(--line)" }}>
        <PrintHead extra={
          <p className="text-[10px] leading-snug" style={{ color: "var(--muted)" }}>
            Par l'État suivant arrêté<br />ministériel n° AB 0005262<br />du 15 JAN. 2026
          </p>
        } />

        <div className="text-center py-5">
          <h2 className="text-2xl font-bold tracking-wide" style={{ color: "var(--ink)" }}>DÉCHARGE</h2>
          <p className="text-sm italic" style={{ color: "var(--muted)" }}>(Remise ou versement de fonds)</p>
          <p className="text-sm mt-1">N° {doc.ref || "…"} / {new Date(doc.date + "T00:00:00").getFullYear()}</p>
        </div>

        <div className="text-sm leading-8" style={{ color: "var(--ink)" }}>
          <p>Je soussigné(e), M./Mme {val(f.declarant || doc.clientName, "62%")}</p>
          <p>Agissant en qualité de {val(f.qualite, "68%")}</p>
          <p>Agissant, le cas échéant, pour le compte de {val(f.pourCompte, "52%")}</p>
          <p>Demeurant à {val(f.demeurant || doc.clientAddr, "34%")} &nbsp; Téléphone : {val(f.telephone || doc.clientPhone, "30%")}</p>
          <p>Pièce d'identité — Type : {val(f.pieceType, "24%")} &nbsp; N° : {val(f.pieceNum, "30%")}</p>
          <p>Délivrée le {val(f.pieceDate, "18%")} à {val(f.pieceLieu, "22%")} par {val(f.pieceAutorite, "26%")}</p>

          <p className="mt-3 font-semibold">
            reconnais avoir :&nbsp;
            <span style={{ marginRight: 14 }}>{f.sens === "recu" ? "☑" : "☐"} REÇU des mains de</span>
            <span>{f.sens === "verse" ? "☑" : "☐"} VERSÉ entre les mains de</span> l'agence
          </p>
          <p className="font-semibold">ENTREPRISE KIBEGNON, la somme de :</p>

          <p>En chiffres : {doc.total ? <span style={{ fontWeight: 700 }}>{Number(doc.total).toLocaleString("fr-FR")}</span> : line("40%")} F CFA</p>
          <p>En lettres : {doc.total ? <span style={{ fontWeight: 600, fontStyle: "italic" }}>{amountInWords(doc.total)}</span> : line("72%")}</p>
          <p>Au titre de (motif) : {val(doc.object, "60%")}</p>
          <p>Période / référence concernée : {val(f.reference, "50%")}</p>
        </div>

        <div className="border p-2 my-4 text-center" style={{ borderColor: "var(--ink)" }}>
          <p className="text-xs italic font-medium">La photocopie de la pièce d'identité présentée est annexée au dos de la présente décharge.</p>
        </div>

        <p className="text-sm leading-7">
          En foi de quoi, la présente décharge est établie pour servir et valoir ce que de droit, et vaut
          quittance définitive à concurrence du montant ci-dessus.
        </p>

        <p className="text-sm mt-4">
          Fait à {val(f.faitA || "Abidjan", "22%")}, le {doc.date ? <span style={{ fontWeight: 600 }}>{fr(doc.date + "T00:00:00", { day: "2-digit", month: "2-digit", year: "numeric" })}</span> : line("18%")}
        </p>

        <div className="kb-sign flex justify-between items-start mt-8 gap-6">
          <div className="text-center" style={{ minWidth: 230 }}>
            <p className="text-sm font-bold">Le/La déclarant(e)</p>
            <p className="text-[11px] italic" style={{ color: "var(--muted)" }}>(mention « Lu et approuvé », nom et signature)</p>
            <div style={{ height: 130 }} />
            <div className="border-t mx-6" style={{ borderColor: "var(--ink)" }} />
          </div>
          <div className="text-center relative" style={{ minWidth: 230 }}>
            <p className="text-sm font-bold">Pour l'ENTREPRISE KIBEGNON</p>
            <p className="text-[11px] italic" style={{ color: "var(--muted)" }}>(nom, qualité, cachet et signature)</p>
            <div style={{ height: 130 }}>
              {doc.paidStamp && doc.approval === "approuve" && (
                <div style={{ position: "absolute", left: 18, top: 26 }}>
                  <PaidStamp date={doc.fields?.paidOn || doc.date} scale={0.7} />
                </div>
              )}
            </div>
            <div className="border-t mx-6" style={{ borderColor: "var(--ink)" }} />
          </div>
        </div>

        <p className="text-[11px] italic text-center mt-5" style={{ color: "var(--muted)" }}>
          Décharge à conserver par l'ENTREPRISE KIBEGNON SARL — photocopie de la pièce au dos.
        </p>
        <PrintFoot note={author ? `Établie par ${author.name}` : undefined} />
      </div>
    </div>
  );
}

/* ---------------- Dossier numérique d'une personne ---------------- */
const FOLDER_CATEGORY = {
  contrat:          "Contrat / bail",
  piece_identite:   "Pièce d'identité",
  etat_des_lieux:   "État des lieux",
  justificatif:     "Justificatif",
  correspondance:   "Correspondance",
  photo:            "Photo",
  titre_propriete:  "Titre de propriété",
  fiscal:           "Document fiscal",
  autre:            "Autre",
};

function Dossier({ store, me, userId, scope, unit, owner, property, onBack, onOpenDoc }) {
  const { documents, folderFiles, members, actions } = store;
  const [openDoc, setOpenDoc] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [category, setCategory] = useState("autre");
  const fileRef = useRef(null);
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const arr = scope === "locataire" ? arrearsOf(unit, store) : null;

  if (openDoc) {
    return <DocumentSheet doc={openDoc} unit={unit}
      property={property || store.properties.find((p) => p.id === openDoc.propertyId)}
      owner={owner || store.owners.find((o) => o.id === openDoc.ownerId)}
      author={memberById[openDoc.createdBy]} onBack={() => setOpenDoc(null)} />;
  }

  const person = scope === "locataire"
    ? { name: unit?.tenantName || "Locataire", phone: unit?.tenantPhone, email: unit?.tenantEmail,
        sub: `${property?.name || ""}${unit ? ` — ${unit.label}` : ""}` }
    : { name: owner?.name || "Propriétaire", phone: owner?.phone, email: owner?.email,
        sub: `${OWNER_KIND[owner?.kind] || ""}` };

  /* Documents produits dans l'outil */
  const docs = documents.filter((d) => scope === "locataire"
    ? (unit && (d.unitId === unit.id || (d.clientName || "").toLowerCase() === (unit.tenantName || "").toLowerCase()))
    : (owner && d.ownerId === owner.id));

  /* Pièces importées depuis l'appareil */
  const files = folderFiles.filter((f) => scope === "locataire" ? f.unitId === unit?.id : f.ownerId === owner?.id);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true); setErr("");
    const r = await actions.uploadFolderFile(file, {
      scope, unitId: scope === "locataire" ? unit?.id : null,
      ownerId: scope === "proprietaire" ? owner?.id : null,
      propertyId: property?.id || null, category,
    });
    setBusy(false);
    if (r?.error) setErr(r.error);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <button onClick={onBack} className="kb-btn kb-btn-ghost mb-3 text-sm"><ArrowLeft size={15} /> Retour</button>

      <div className="bg-white rounded-xl border p-4 mb-4" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0"
              style={{ background: scope === "locataire" ? "#2E78A8" : "var(--brass)" }}>
              {scope === "locataire" ? <Users size={20} /> : <UserRound size={20} />}
            </span>
            <div>
              <h1 className="text-xl font-bold">{person.name}</h1>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Dossier {scope === "locataire" ? "locataire" : "propriétaire"}{person.sub ? ` · ${person.sub}` : ""}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                {person.phone || "téléphone non renseigné"}{person.email ? ` · ${person.email}` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
              {Object.entries(FOLDER_CATEGORY).map(([k, v]) => <option key={k} value={v === "" ? k : k}>{v}</option>)}
            </select>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="kb-btn kb-btn-primary disabled:opacity-40">
              <FileUp size={16} /> {busy ? "Import…" : "Importer une pièce"}
            </button>
          </div>
        </div>
        {err && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      </div>

      {arr?.hasArrears && (
        <div className="rounded-xl border p-3 mb-4" style={{ borderColor: "#F5C6C7", background: "#FDF2F2" }}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} style={{ color: "#D81F26" }} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: "#B5171D" }}>
                Locataire en arriéré — {arrearsLabel(arr)}
              </p>
              <p className="text-xs mt-1" style={{ color: "#B5171D" }}>
                {arr.unpaidMonths.length > 0 && `${arr.unpaidMonths.length} mois impayé(s) : ${arr.unpaidMonths.map((m) => m.period).join(", ")}. `}
                {arr.partialMonths.length > 0 && `${arr.partialMonths.length} reliquat(s) à verser : ${arr.partialMonths.map((m) => `${m.period} (${fcfa(m.due)})`).join(", ")}. `}
                {arr.manualAmount > 0 && `Arriéré repris manuellement : ${fcfa(arr.manualAmount)}${arr.manualMonths ? ` sur ${arr.manualMonths} mois` : ""}. `}
              </p>
              {arr.manualNote && <p className="text-[11px] mt-1 italic" style={{ color: "var(--muted)" }}>{arr.manualNote}</p>}
            </div>
          </div>
        </div>
      )}

      {arr && arr.history.length > 0 && (
        <SectionCard title="Historique des paiements" icon={Wallet} pad={false}>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left" style={{ color: "var(--muted)" }}>
              <th className="px-4 py-2.5 font-medium">Mois</th>
              <th className="px-3 py-2.5 font-medium">Loyer prévu</th>
              <th className="px-3 py-2.5 font-medium">Encaissé</th>
              <th className="px-3 py-2.5 font-medium">Reste dû</th>
              <th className="px-3 py-2.5 font-medium">Source</th>
            </tr></thead>
            <tbody>{arr.history.map((m) => {
              const due = m.expected - m.collected;
              const stt = PAY_STATUS[payStatusOf(m.expected, m.collected)];
              return (
                <tr key={m.period} className="border-t" style={{ borderColor: "var(--line)" }}>
                  <td className="px-4 py-2.5 font-medium">{m.period}</td>
                  <td className="px-3 py-2.5 tabular-nums">{fcfa(m.expected)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{fcfa(m.collected)}</td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {due > 0
                      ? <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: stt.bg, color: stt.color }}>{fcfa(due)}</span>
                      : <span style={{ color: "#4F9E2A" }}>soldé</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: "var(--muted)" }}>{m.source}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        </SectionCard>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={FileText} label="Documents émis" value={docs.length} sub="depuis l'outil" tint="var(--brass)" />
        <StatCard icon={Paperclip} label="Pièces importées" value={files.length} tint="#2E78A8" />
        <StatCard icon={Receipt} label="Quittances" value={docs.filter((d) => d.docType === "quittance").length} tint="#4F9E2A" />
        <StatCard icon={Wallet} label="Montant des pièces" value={fcfa(docs.reduce((a, d) => a + (d.total || 0), 0))} tint="#7C3AED" />
      </div>

      <SectionCard title={`Documents établis par l'agence (${docs.length})`} icon={FileText} pad={false}>
        {docs.length ? <div className="divide-y" style={{ borderColor: "var(--line)" }}>
          {docs.map((d) => {
            const cfg = DOC_TYPES[d.docType] || DOC_TYPES.courrier;
            return (
              <div key={d.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.object || cfg.label}</p>
                  <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                    {d.ref} · {cfg.short} · {fr(d.date + "T00:00:00", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {d.paidStamp && d.approval === "approuve" && <Chip color={STAMP_RED} bg="#FDEAEA">PAYÉ</Chip>}
                  {d.approval === "en_attente" && <Chip color="#C58A1B" dot>à valider</Chip>}
                  {d.total > 0 && <span className="text-sm font-semibold tabular-nums">{fcfa(d.total)}</span>}
                  <button onClick={() => setOpenDoc(d)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Ouvrir"><Printer size={14} /></button>
                </div>
              </div>
            );
          })}
        </div> : <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>Aucun document établi pour cette personne.</p>}
      </SectionCard>

      <SectionCard title={`Pièces du dossier (${files.length})`} icon={Paperclip} pad={false}>
        {files.length ? <div className="divide-y" style={{ borderColor: "var(--line)" }}>
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#F1F3F5", color: "var(--muted)" }}>
                  {/^image\//.test(f.fileType) ? <Image size={16} /> : <FileText size={16} />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{f.label || f.fileName}</p>
                  <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                    {FOLDER_CATEGORY[f.category]} · {Math.round(f.fileSize / 1024)} Ko ·
                    {" "}importée par {memberById[f.uploadedBy]?.name || "—"} le {fr(f.createdAt, { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a href={f.fileUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Ouvrir"><Download size={14} /></a>
                {(f.uploadedBy === userId || canSupervise(me.role)) && (
                  <button onClick={async () => { if (confirm(`Supprimer « ${f.label || f.fileName} » ?`)) await actions.deleteFolderFile(f.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                )}
              </div>
            </div>
          ))}
        </div> : <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>
          Aucune pièce importée. Utilisez « Importer une pièce » pour ajouter un contrat scanné, une pièce d'identité, un état des lieux…
        </p>}
      </SectionCard>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   CAISSE — réservée aux administrateurs
   ══════════════════════════════════════════════════════════════════════ */

const CASH_CATEGORY = {
  loyer:         { label: "Loyer encaissé",     color: "#4F9E2A", sens: "entree" },
  caution:       { label: "Caution",            color: "#2E78A8", sens: "entree" },
  commission:    { label: "Commission agence",  color: "#7C3AED", sens: "entree" },
  charges:       { label: "Charges / factures", color: "#EA580C", sens: "sortie" },
  fournitures:   { label: "Fournitures",        color: "#C58A1B", sens: "sortie" },
  transport:     { label: "Transport",          color: "#2E78A8", sens: "sortie" },
  salaire:       { label: "Salaire / avance",   color: "#DB2777", sens: "sortie" },
  artisan:       { label: "Artisan / travaux",  color: "#B91C1C", sens: "sortie" },
  impot:         { label: "Impôt / taxe",       color: "#6366F1", sens: "sortie" },
  remboursement: { label: "Remboursement",      color: "#0D9488", sens: "sortie" },
  autre:         { label: "Autre",              color: "#64748B", sens: "entree" },
};
const CASH_METHOD = { especes: "Espèces", cheque: "Chèque", virement: "Virement", mobile_money: "Mobile Money" };
const HANDOVER_STATUS = {
  en_attente: { label: "En attente de certification", color: "#C58A1B" },
  approuve:   { label: "Reçu certifié",               color: "#4F9E2A" },
  conteste:   { label: "Contesté",                    color: "#D81F26" },
};

/* Solde d'une journée : entrées − sorties */
function dayBalance(entries, day) {
  const rows = entries.filter((e) => e.date === day);
  const inflow = rows.filter((e) => e.direction === "entree").reduce((a, e) => a + e.amount, 0);
  const outflow = rows.filter((e) => e.direction === "sortie").reduce((a, e) => a + e.amount, 0);
  return { rows, inflow, outflow, balance: inflow - outflow };
}

/* ---------------- Modale : mouvement de caisse ---------------- */
function CashModal({ initial, properties, owners, onSave, onClose }) {
  const [f, setF] = useState(() => ({
    date: isoDate(new Date()), direction: "entree", amount: "", label: "",
    category: "loyer", method: "especes", propertyId: "", ownerId: "", reference: "", notes: "", ...initial,
  }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.label.trim() && Number(f.amount) > 0;
  const submit = async () => { setBusy(true); const r = await onSave(f); setBusy(false); if (r?.error) setErr(r.error); else onClose(); };

  return (
    <Modal title={f.id ? "Modifier le mouvement" : "Nouveau mouvement de caisse"} onClose={onClose}>
      <Field label="Sens de l'opération">
        <div className="flex gap-2">
          {[["entree", "Entrée en caisse", "#4F9E2A"], ["sortie", "Sortie de caisse", "#D81F26"]].map(([k, l, c]) => (
            <button key={k} onClick={() => set("direction", k)} className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: f.direction === k ? c : "#fff", color: f.direction === k ? "#fff" : c, border: `1px solid ${c}55` }}>
              {k === "entree" ? "↓ " : "↑ "}{l}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Montant (FCFA)"><input type="number" min={0} step={500} className={inputCls} style={inputStyle} value={f.amount} autoFocus onChange={(e) => set("amount", e.target.value)} /></Field>
        <Field label="Date"><input type="date" className={inputCls} style={inputStyle} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
      </div>

      <Field label="Libellé"><input className={inputCls} style={inputStyle} value={f.label} onChange={(e) => set("label", e.target.value)} placeholder="Ex. Loyer août — Appt A1, M. DIALLO" /></Field>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nature">
          <select className={inputCls} style={inputStyle} value={f.category} onChange={(e) => set("category", e.target.value)}>
            {Object.entries(CASH_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Moyen">
          <select className={inputCls} style={inputStyle} value={f.method} onChange={(e) => set("method", e.target.value)}>
            {Object.entries(CASH_METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Bien concerné">
          <select className={inputCls} style={inputStyle} value={f.propertyId || ""} onChange={(e) => set("propertyId", e.target.value)}>
            <option value="">— Aucun —</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Pièce justificative" hint="N° de quittance, décharge, facture…">
          <input className={inputCls} style={inputStyle} value={f.reference} onChange={(e) => set("reference", e.target.value)} placeholder="QL-2026-004" />
        </Field>
      </div>

      <Field label="Observations"><textarea className={inputCls} style={inputStyle} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!valid || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> Enregistrer</button>
      </div>
    </Modal>
  );
}

/* ---------------- Modale : remise du solde ---------------- */
function HandoverModal({ day, amount, members, userId, onSend, onClose }) {
  const [toUser, setToUser] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const submit = async () => {
    setBusy(true);
    const r = await onSend({ date: day, amount, toUser, note });
    setBusy(false);
    if (r?.error) setErr(r.error); else onClose();
  };
  return (
    <Modal title="Remise du solde journalier" onClose={onClose}>
      <div className="rounded-lg p-3 mb-4 text-center" style={{ background: "#F6F8FA" }}>
        <p className="text-xs" style={{ color: "var(--muted)" }}>Solde du {fr(day + "T00:00:00", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--brass)" }}>{fcfa(amount)}</p>
        <p className="text-[11px] mt-1 italic" style={{ color: "var(--muted)" }}>{amountInWords(amount)}</p>
      </div>

      <Field label="Remis en mains propres à" hint="La personne recevra une notification et devra certifier la réception">
        <select className={inputCls} style={inputStyle} value={toUser} onChange={(e) => setToUser(e.target.value)}>
          <option value="">— Choisir la personne —</option>
          {members.filter((m) => m.active && m.id !== userId).map((m) => <option key={m.id} value={m.id}>{m.name} — {ROLES[m.role]}</option>)}
        </select>
      </Field>
      <Field label="Précision (facultatif)"><input className={inputCls} style={inputStyle} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. dont 300 000 F en espèces, reste en chèques" /></Field>

      <div className="rounded-lg p-3 mb-3 text-xs" style={{ background: "#EFF6FF", color: "#1F5C82" }}>
        Tant que le destinataire n'a pas certifié la réception, la remise reste « en attente ».
        La certification est horodatée et nominative : elle vaut décharge.
      </div>

      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!toUser || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Send size={16} /> Transmettre pour certification</button>
      </div>
    </Modal>
  );
}

/* ---------------- Journal de caisse imprimable ---------------- */
function CashSheet({ day, data, members, handover, onBack }) {
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
  return (
    <div>
      <div className="flex items-center justify-between mb-3 print:hidden gap-2 flex-wrap">
        <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour</button>
        <button onClick={() => printSheet("portrait")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF</button>
      </div>
      <div id="print-area" className="bg-white rounded-xl border p-6" style={{ borderColor: "var(--line)" }}>
        <PrintHead title="JOURNAL DE CAISSE" subtitle={fr(day + "T00:00:00", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />

        <table className="w-full text-[11px] mt-4">
          <thead><tr style={{ background: "#F1F3F5" }}>
            <th className="text-left px-2 py-1.5 font-semibold">N°</th>
            <th className="text-left px-2 py-1.5 font-semibold">Libellé</th>
            <th className="text-left px-2 py-1.5 font-semibold">Nature</th>
            <th className="text-left px-2 py-1.5 font-semibold">Moyen</th>
            <th className="text-left px-2 py-1.5 font-semibold">Pièce</th>
            <th className="text-right px-2 py-1.5 font-semibold">Entrée</th>
            <th className="text-right px-2 py-1.5 font-semibold">Sortie</th>
            <th className="text-left px-2 py-1.5 font-semibold">Saisi par</th>
          </tr></thead>
          <tbody>{data.rows.map((e, i) => (
            <tr key={e.id} className="border-b" style={{ borderColor: "var(--line)" }}>
              <td className="px-2 py-1.5">{i + 1}</td>
              <td className="px-2 py-1.5 font-medium">{e.label}</td>
              <td className="px-2 py-1.5">{CASH_CATEGORY[e.category]?.label}</td>
              <td className="px-2 py-1.5">{CASH_METHOD[e.method]}</td>
              <td className="px-2 py-1.5">{e.reference || "—"}</td>
              <td className="px-2 py-1.5 text-right tabular-nums" style={{ color: "#3d7d20" }}>{e.direction === "entree" ? fcfa(e.amount) : ""}</td>
              <td className="px-2 py-1.5 text-right tabular-nums" style={{ color: "#B5171D" }}>{e.direction === "sortie" ? fcfa(e.amount) : ""}</td>
              <td className="px-2 py-1.5">{memberById[e.createdBy]?.name || "—"}</td>
            </tr>
          ))}</tbody>
          <tfoot><tr style={{ background: "#F1F3F5" }}>
            <td colSpan={5} className="px-2 py-2 font-bold">TOTAUX</td>
            <td className="px-2 py-2 text-right font-bold tabular-nums" style={{ color: "#3d7d20" }}>{fcfa(data.inflow)}</td>
            <td className="px-2 py-2 text-right font-bold tabular-nums" style={{ color: "#B5171D" }}>{fcfa(data.outflow)}</td>
            <td />
          </tr></tfoot>
        </table>

        <div className="flex justify-end mt-4">
          <div className="rounded-lg px-4 py-3" style={{ background: "#F6F8FA", minWidth: 280 }}>
            <div className="flex justify-between text-sm"><span style={{ color: "var(--muted)" }}>Total des entrées</span><span className="font-semibold tabular-nums">{fcfa(data.inflow)}</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: "var(--muted)" }}>Total des sorties</span><span className="font-semibold tabular-nums">− {fcfa(data.outflow)}</span></div>
            <div className="flex justify-between items-center pt-2 mt-2 border-t" style={{ borderColor: "var(--line)" }}>
              <span className="text-sm font-bold">SOLDE DU JOUR</span>
              <span className="text-lg font-bold tabular-nums" style={{ color: "var(--brass)" }}>{fcfa(data.balance)}</span>
            </div>
          </div>
        </div>

        {data.balance > 0 && <p className="text-[11px] italic mt-3">Arrêté le présent journal à la somme de <strong>{amountInWords(data.balance)}</strong>.</p>}

        {handover && (
          <div className="rounded-lg border p-3 mt-4" style={{ borderColor: handover.status === "approuve" ? "#BBE3A6" : "#FCD9A6", background: handover.status === "approuve" ? "#F6FBF3" : "#FFF8EC" }}>
            <p className="text-xs font-bold mb-1">REMISE DU SOLDE</p>
            <p className="text-xs">
              Somme de <strong>{fcfa(handover.amount)}</strong> remise par <strong>{memberById[handover.fromUser]?.name || "—"}</strong>
              {" à "}<strong>{memberById[handover.toUser]?.name || "—"}</strong>.
            </p>
            <p className="text-xs mt-1" style={{ color: HANDOVER_STATUS[handover.status].color, fontWeight: 600 }}>
              {handover.status === "approuve"
                ? `Réception certifiée en mains propres le ${fr(handover.approvedAt, { day: "2-digit", month: "2-digit", year: "numeric" })} à ${fmtTime(handover.approvedAt)}.`
                : HANDOVER_STATUS[handover.status].label}
            </p>
            {handover.note && <p className="text-[11px] mt-1 italic" style={{ color: "var(--muted)" }}>{handover.note}</p>}
          </div>
        )}

        <div className="kb-sign flex justify-between items-end pt-10 mt-4">
          <div className="text-center" style={{ minWidth: 200 }}>
            <p className="text-[11px] font-semibold pb-20">Le Caissier</p>
            <div className="border-t" style={{ borderColor: "var(--ink)" }} />
          </div>
          <div className="text-center" style={{ minWidth: 200 }}>
            <p className="text-[11px] font-semibold pb-20">Le Dépositaire du solde</p>
            <div className="border-t" style={{ borderColor: "var(--ink)" }} />
          </div>
        </div>
        <PrintFoot />
      </div>
    </div>
  );
}

/* ---------------- Vue principale ---------------- */
function Caisse({ store, me, userId }) {
  const { cashEntries, handovers, members, properties, owners, actions } = store;
  const [day, setDay] = useState(isoDate(new Date()));
  const [modal, setModal] = useState(null);
  const [handoverModal, setHandoverModal] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [search, setSearch] = useState("");

  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const data = useMemo(() => dayBalance(cashEntries, day), [cashEntries, day]);
  const dayHandover = handovers.find((h) => h.date === day);

  /* Remises qui m'attendent, quel que soit le jour affiché */
  const toCertify = handovers.filter((h) => h.toUser === userId && h.status === "en_attente");

  const monthIsoOf = (d) => (d || "").slice(0, 7);
  const monthRows = cashEntries.filter((e) => monthIsoOf(e.date) === monthIsoOf(day));
  const monthIn = monthRows.filter((e) => e.direction === "entree").reduce((a, e) => a + e.amount, 0);
  const monthOut = monthRows.filter((e) => e.direction === "sortie").reduce((a, e) => a + e.amount, 0);

  const rows = data.rows.filter((e) => !search
    || e.label.toLowerCase().includes(search.toLowerCase())
    || (e.reference || "").toLowerCase().includes(search.toLowerCase()));

  if (sheet) return <CashSheet day={day} data={data} members={members} handover={dayHandover} onBack={() => setSheet(false)} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Caisse</h1>
        <div className="flex gap-2">
          <button onClick={() => setSheet(true)} className="kb-btn kb-btn-ghost"><Printer size={15} /> Journal du jour</button>
          <button onClick={() => setModal({ date: day })} className="kb-btn kb-btn-primary"><Plus size={16} /> Mouvement</button>
        </div>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Entrées et sorties, solde journalier et remise certifiée en mains propres.</p>

      {/* Remises à certifier — priorité absolue */}
      {toCertify.length > 0 && (
        <div className="rounded-xl border p-3 mb-4" style={{ borderColor: "#FCD9A6", background: "#FFF8EC" }}>
          <p className="text-sm font-semibold mb-2" style={{ color: "#8A6212" }}>
            <ShieldAlert size={15} className="inline mb-0.5" /> {toCertify.length} remise(s) de caisse à certifier
          </p>
          {toCertify.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-2 flex-wrap py-2 border-t" style={{ borderColor: "#F3E2C6" }}>
              <div>
                <p className="text-sm">
                  <strong>{fcfa(h.amount)}</strong> remis par <strong>{memberById[h.fromUser]?.name || "—"}</strong>
                  {" — "}{fr(h.date + "T00:00:00", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                {h.note && <p className="text-[11px] italic" style={{ color: "var(--muted)" }}>{h.note}</p>}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => actions.answerHandover(h.id, true)} className="kb-btn text-xs px-2.5 py-1.5" style={{ background: "#4F9E2A", color: "#fff" }}>
                  <ThumbsUp size={13} /> Je certifie avoir reçu cette somme
                </button>
                <button onClick={async () => { const n = prompt("Motif de la contestation :", ""); if (n !== null) await actions.answerHandover(h.id, false, n); }}
                  className="kb-btn text-xs px-2.5 py-1.5" style={{ background: "#fff", color: "#D81F26", border: "1px solid #D81F2655" }}>
                  <ThumbsDown size={13} /> Contester
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={ArrowDownToLine} label="Entrées du jour" value={fcfa(data.inflow)} sub={`${data.rows.filter((e) => e.direction === "entree").length} mouvement(s)`} tint="#4F9E2A" />
        <StatCard icon={ArrowUpFromLine} label="Sorties du jour" value={fcfa(data.outflow)} sub={`${data.rows.filter((e) => e.direction === "sortie").length} mouvement(s)`} tint="#D81F26" />
        <StatCard icon={Wallet} label="Solde du jour" value={fcfa(data.balance)} tint="var(--brass)" />
        <StatCard icon={BarChart3} label="Solde du mois" value={fcfa(monthIn - monthOut)} sub={`${fcfa(monthIn)} entrés · ${fcfa(monthOut)} sortis`} tint="#2E78A8" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
        <div className="relative flex-1 min-w-[150px]">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Libellé, pièce justificative…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
        </div>
        {data.balance > 0 && !dayHandover && (
          <button onClick={() => setHandoverModal(true)} className="kb-btn kb-btn-primary text-sm"><Send size={14} /> Remettre le solde</button>
        )}
      </div>

      {/* État de la remise du jour */}
      {dayHandover && (
        <div className="rounded-xl border p-3 mb-4 flex items-start gap-2"
          style={{ borderColor: dayHandover.status === "approuve" ? "#BBE3A6" : dayHandover.status === "conteste" ? "#F5C6C7" : "#FCD9A6",
                   background: dayHandover.status === "approuve" ? "#F6FBF3" : dayHandover.status === "conteste" ? "#FDF2F2" : "#FFF8EC" }}>
          <BadgeCheck size={16} className="mt-0.5 shrink-0" style={{ color: HANDOVER_STATUS[dayHandover.status].color }} />
          <div>
            <p className="text-sm font-medium" style={{ color: HANDOVER_STATUS[dayHandover.status].color }}>
              {HANDOVER_STATUS[dayHandover.status].label} — {fcfa(dayHandover.amount)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Remis par {memberById[dayHandover.fromUser]?.name || "—"} à {memberById[dayHandover.toUser]?.name || "—"}
              {dayHandover.approvedAt ? ` · certifié le ${fr(dayHandover.approvedAt, { day: "numeric", month: "long", year: "numeric" })} à ${fmtTime(dayHandover.approvedAt)}` : ""}
            </p>
            {dayHandover.responseNote && <p className="text-[11px] mt-1 italic" style={{ color: "#B5171D" }}>{dayHandover.responseNote}</p>}
          </div>
        </div>
      )}

      {rows.length ? (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left" style={{ color: "var(--muted)" }}>
              <th className="px-4 py-2.5 font-medium">Libellé</th>
              <th className="px-3 py-2.5 font-medium">Nature</th>
              <th className="px-3 py-2.5 font-medium">Moyen</th>
              <th className="px-3 py-2.5 font-medium">Pièce</th>
              <th className="px-3 py-2.5 font-medium text-right">Entrée</th>
              <th className="px-3 py-2.5 font-medium text-right">Sortie</th>
              <th className="px-3 py-2.5 font-medium">Saisi par</th>
              <th />
            </tr></thead>
            <tbody>{rows.map((e) => {
              const cat = CASH_CATEGORY[e.category] || CASH_CATEGORY.autre;
              return (
                <tr key={e.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                  <td className="px-4 py-2.5"><p className="font-medium">{e.label}</p>{e.notes && <p className="text-[11px]" style={{ color: "var(--muted)" }}>{e.notes}</p>}</td>
                  <td className="px-3 py-2.5"><Chip color={cat.color}>{cat.label}</Chip></td>
                  <td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>{CASH_METHOD[e.method]}</td>
                  <td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>{e.reference || "—"}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium" style={{ color: "#4F9E2A" }}>{e.direction === "entree" ? fcfa(e.amount) : ""}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium" style={{ color: "#D81F26" }}>{e.direction === "sortie" ? fcfa(e.amount) : ""}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: "var(--muted)" }}>{memberById[e.createdBy]?.name || "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setModal(e)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Pencil size={14} /></button>
                      <button onClick={async () => { if (confirm(`Supprimer « ${e.label} » ?`)) await actions.deleteCashEntry(e.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table></div>
          <div className="flex justify-end px-4 py-3 border-t gap-6" style={{ borderColor: "var(--line)" }}>
            <span className="text-sm" style={{ color: "var(--muted)" }}>Entrées <strong style={{ color: "#4F9E2A" }}>{fcfa(data.inflow)}</strong></span>
            <span className="text-sm" style={{ color: "var(--muted)" }}>Sorties <strong style={{ color: "#D81F26" }}>{fcfa(data.outflow)}</strong></span>
            <span className="text-sm font-bold">Solde <span style={{ color: "var(--brass)" }}>{fcfa(data.balance)}</span></span>
          </div>
        </div>
      ) : <EmptyState icon={Wallet} title="Aucun mouvement ce jour"
        sub="Enregistrez les entrées et sorties d'espèces de la journée."
        action={<button onClick={() => setModal({ date: day })} className="kb-btn kb-btn-primary"><Plus size={15} /> Nouveau mouvement</button>} />}

      {modal && <CashModal initial={modal} properties={properties} owners={owners} onSave={actions.saveCashEntry} onClose={() => setModal(null)} />}
      {handoverModal && <HandoverModal day={day} amount={data.balance} members={members} userId={userId}
        onSend={actions.createHandover} onClose={() => setHandoverModal(false)} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   APPLICATION (Root + Workspace)
   ══════════════════════════════════════════════════════════════════════ */
/* ====================== Modales ====================== */
function ShareTaskModal({ task, members, currentUserId, onSend, onClose }) {
  const others = members.filter((m) => m.id !== currentUserId && m.active);
  const [dest, setDest] = useState("group");
  const [note, setNote] = useState("");
  const [reassign, setReassign] = useState(false);
  return (
    <Modal title="Envoyer la tâche" onClose={onClose}>
      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: "var(--line)", background: "#FAFAFB" }}><p className="text-sm font-medium">{task.title}</p></div>
      <Field label="Destinataire"><select className={inputCls} style={inputStyle} value={dest} onChange={(e) => setDest(e.target.value)}><option value="group">Toute l'équipe (canal Général)</option>{others.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
      <Field label="Message (facultatif)"><textarea className={inputCls} style={inputStyle} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. Merci de traiter en priorité." /></Field>
      {dest !== "group" && <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer"><input type="checkbox" checked={reassign} onChange={(e) => setReassign(e.target.checked)} /> Réattribuer cette tâche à ce destinataire</label>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button><button onClick={() => onSend({ dest, note, reassign })} className="kb-btn kb-btn-primary"><Send size={15} /> Envoyer</button></div>
    </Modal>
  );
}
function MemberModal({ initial, departments, members, onSubmit, onClose }) {
  const isNew = !initial?.id;
  const [f, setF] = useState(() => ({ name: "", role: "agent", deptId: departments[0]?.id, color: DEPT_PALETTE[Math.floor(Math.random() * DEPT_PALETTE.length)], username: "", password: "", active: true, ...initial }));
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const dupUser = isNew && members.some((m) => m.username?.toLowerCase() === f.username.trim().toLowerCase());
  const valid = f.name.trim() && (!isNew || (f.username.trim() && f.password.trim() && !dupUser));
  const submit = async () => {
    setBusy(true); setErr("");
    const res = await onSubmit(f, isNew);
    setBusy(false);
    if (res?.error) setErr(res.error); else onClose();
  };
  return (
    <Modal title={isNew ? "Créer un compte" : "Modifier le compte"} onClose={onClose}>
      <Field label="Nom complet"><input className={inputCls} style={inputStyle} value={f.name} autoFocus onChange={(e) => set("name", e.target.value)} placeholder="Ex. Aïssata KONÉ" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Identifiant de connexion"><input disabled={!isNew} className={inputCls + (isNew ? "" : " opacity-60")} style={inputStyle} value={f.username} onChange={(e) => set("username", e.target.value.replace(/\s/g, ""))} placeholder="aissata" /></Field>
        <Field label={isNew ? "Mot de passe" : "Nouveau mot de passe (option.)"}><div className="relative"><input type={showPwd ? "text" : "password"} className={inputCls + " pr-9"} style={inputStyle} value={f.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••" /><button onClick={() => setShowPwd((s) => !s)} className="absolute right-2 top-2 text-slate-400">{showPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></Field>
      </div>
      {dupUser && <p className="text-xs text-red-600 -mt-1 mb-2">Cet identifiant est déjà utilisé.</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Rôle"><select className={inputCls} style={inputStyle} value={f.role} onChange={(e) => set("role", e.target.value)}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Département"><select className={inputCls} style={inputStyle} value={f.deptId || ""} onChange={(e) => set("deptId", e.target.value)}>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
      </div>
      <Field label="Couleur"><div className="flex flex-wrap gap-2">{DEPT_PALETTE.map((c) => <button key={c} onClick={() => set("color", c)} className="w-7 h-7 rounded-full" style={{ background: c, outline: f.color === c ? "2px solid var(--ink)" : "none", outlineOffset: 2 }} />)}</div></Field>
      <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer"><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} /> Compte actif (peut se connecter)</label>
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2 mt-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button><button disabled={!valid || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> {busy ? "…" : "Enregistrer"}</button></div>
    </Modal>
  );
}
function DeptModal({ initial, onSave, onClose }) {
  const [f, setF] = useState(() => ({ name: "", color: DEPT_PALETTE[0], ...initial }));
  return (
    <Modal title={initial?.id ? "Modifier le département" : "Nouveau département"} onClose={onClose}>
      <Field label="Nom du département"><input className={inputCls} style={inputStyle} value={f.name} autoFocus onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} placeholder="Ex. Gestion locative" /></Field>
      <Field label="Couleur"><div className="flex flex-wrap gap-2">{DEPT_PALETTE.map((c) => <button key={c} onClick={() => setF((p) => ({ ...p, color: c }))} className="w-7 h-7 rounded-full" style={{ background: c, outline: f.color === c ? "2px solid var(--ink)" : "none", outlineOffset: 2 }} />)}</div></Field>
      <div className="flex justify-end gap-2 mt-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button><button disabled={!f.name.trim()} onClick={() => onSave(f)} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> Enregistrer</button></div>
    </Modal>
  );
}

/* ====================== ROOT (session) ====================== */

/* Styles injectés : variables de marque + impression (indépendants de index.css) */
const KB_STYLES = `
:root{--ink:#1A1C20;--brass:#D81F26;--brass-d:#B5171D;--live:#4F9E2A;--blue:#2E78A8;--bg:#F3F4F6;--line:#E6E9EE;--muted:#6B7280;}
body{margin:0;background:var(--bg);font-family:Inter,system-ui,sans-serif;}
.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
.tabular-nums{font-variant-numeric:tabular-nums}
.kb-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;font-size:14px;font-weight:500;transition:all .15s;cursor:pointer;border:none}
.kb-btn-primary{background:var(--brass);color:#fff}.kb-btn-primary:hover{background:var(--brass-d)}
.kb-btn-ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}.kb-btn-ghost:hover{background:#F8FAFC}
select,input,textarea{font-family:inherit;color:var(--ink);background:#fff}
select:focus,input:focus,textarea:focus{border-color:var(--brass)!important;outline:none}
select:disabled,input:disabled{background:#F6F8FA;color:#6B7280}
button{cursor:pointer}
@media print{
  body{background:#fff}
  header,nav,.print\:hidden{display:none!important}
  main{padding:0!important;max-width:100%!important}
  #print-area{border:none!important;box-shadow:none!important;padding:0!important;max-width:100%!important;
    display:flex;flex-direction:column;min-height:100vh}
  /* Le pied est repoussé en bas de page et n'est jamais coupé */
  .kb-foot{margin-top:auto;break-inside:avoid;page-break-inside:avoid}
  .kb-sign{break-inside:avoid;page-break-inside:avoid}
  table{page-break-inside:auto}tr{page-break-inside:avoid}
  /* L'en-tête se répète en haut de chaque page, mais les totaux ne doivent
     apparaître qu'une seule fois, à la fin réelle du tableau. */
  thead{display:table-header-group}
  tfoot{display:table-row-group}
  @page{margin:12mm;size:A4}
}
`;
function KbStyles() {
  useEffect(() => {
    if (document.getElementById("kb-styles")) return;
    const el = document.createElement("style");
    el.id = "kb-styles"; el.textContent = KB_STYLES;
    document.head.appendChild(el);
  }, []);
  return null;
}

export default function Root() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  if (session === undefined) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}><p style={{ color: "var(--muted)" }}>Chargement…</p></div>;
  if (!session) return <><KbStyles /><Login /></>;
  return <><KbStyles /><Workspace userId={session.user.id} /></>;
}

/* ====================== WORKSPACE ====================== */
function Workspace({ userId }) {
  const store = useStore(userId);
  const { loading, departments, members, tasks, timeEntries, activeTimers, channels, channelMembers, messages,
    owners, properties, products, releases, releaseLines, quotes, units, requests, complaints, documents,
    cashEntries, handovers, folderFiles, rentPeriods, rentLines, actions } = store;

  const [view, setView] = useState("dashboard");
  const [viewWeek, setViewWeek] = useState(mondayIso(new Date()));
  const [now, setNow] = useState(Date.now());
  const [taskModal, setTaskModal] = useState(null);
  const [shareTask, setShareTask] = useState(null);
  const [superMember, setSuperMember] = useState("all");
  const [manualTask, setManualTask] = useState("");
  const [manualMin, setManualMin] = useState(30);
  const [memberModal, setMemberModal] = useState(null);
  const [deptModal, setDeptModal] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [msgDraft, setMsgDraft] = useState("");
  const [attachTaskId, setAttachTaskId] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [notifPerm, setNotifPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const fileRef = useRef(null);
  const threadRef = useRef(null);

  useEffect(() => { if (activeTimers.length === 0) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [activeTimers.length]);
  useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [activeChannel, messages]);

  const me = members.find((m) => m.id === userId);
  const deptById = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d])), [departments]);
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const propById = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p])), [properties]);
  const baseSecByTask = useMemo(() => { const m = {}; timeEntries.forEach((e) => { m[e.taskId] = (m[e.taskId] || 0) + e.durationSeconds; }); return m; }, [timeEntries]);

  const myTimer = activeTimers.find((t) => t.userId === userId) || null;
  const isRunning = (taskId) => activeTimers.some((t) => t.taskId === taskId && t.userId === userId);
  const liveSecForTask = (taskId) => { let s = baseSecByTask[taskId] || 0; const tm = activeTimers.find((t) => t.taskId === taskId); if (tm) s += Math.round((now - tm.startedAt) / 1000); return s; };

  const toggleTimer = async (task) => {
    if (isRunning(task.id)) { await actions.stopTimer(); return; }
    if (myTimer) await actions.stopTimer();
    if (task.status === "a_faire") await actions.updateTask(task.id, { status: "en_cours" });
    await actions.startTimer(task.id);
  };
  const pauseTask = async (task) => { await actions.pauseTask(); };
  const finishTask = async (task) => { await actions.finishTask(task.id); };
  const advanceStatus = async (task) => { const i = STATUS_ORDER.indexOf(task.status); const next = STATUS_ORDER[Math.min(i + 1, 3)]; if (next === "termine" && isRunning(task.id)) await actions.stopTimer(); await actions.updateTask(task.id, { status: next }); };
  const saveTask = async (f) => { if (f.id) await actions.updateTask(f.id, f); else await actions.createTask(f); setTaskModal(null); };
  const removeTask = async (id) => { await actions.deleteTask(id); setTaskModal(null); };

  const entryWeek = (e) => mondayIso(e.start);
  const secForUserWeek = (u, wk) => timeEntries.filter((e) => e.userId === u && entryWeek(e) === wk).reduce((a, e) => a + e.durationSeconds, 0);
  const secForUserDay = (u, di) => timeEntries.filter((e) => e.userId === u && isoDate(e.start) === di).reduce((a, e) => a + e.durationSeconds, 0);

  /* ---- messagerie ---- */
  const dmChannelFor = (otherId) => channels.find((c) => c.type === "dm" && channelMembers.some((cm) => cm.channelId === c.id && cm.userId === userId) && channelMembers.some((cm) => cm.channelId === c.id && cm.userId === otherId))?.id;
  const channelMessages = (chId) => messages.filter((m) => m.channelId === chId).sort((a, b) => a.createdAt - b.createdAt);
  const lastMessage = (chId) => { const l = channelMessages(chId); return l[l.length - 1]; };
  const lastRead = (chId) => channelMembers.find((c) => c.channelId === chId && c.userId === userId)?.lastReadAt || 0;
  const hasUnread = (chId) => { const lr = lastRead(chId); return messages.some((m) => m.channelId === chId && m.fromId !== userId && m.createdAt > lr); };
  const openGeneral = () => { setActiveChannel(GENERAL_CHANNEL_ID); actions.markRead(GENERAL_CHANNEL_ID); };
  const openDm = async (otherId) => { const cid = await actions.ensureDm(otherId); if (cid) { setActiveChannel(cid); actions.markRead(cid); } };
  const sendDraft = async () => {
    if (!activeChannel) return;
    let file = null;
    if (pendingFile) {
      setUploading(true);
      const r = await actions.uploadAttachment(pendingFile);
      setUploading(false);
      if (r.error) { alert(r.error); return; }
      file = r;
    }
    await actions.sendMessage(activeChannel, msgDraft, attachTaskId || null, file);
    setMsgDraft(""); setAttachTaskId(""); setPendingFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };
  const doShare = async ({ dest, note, reassign }) => {
    const text = note || "Je vous partage cette tâche.";
    if (dest === "group") await actions.sendMessage(GENERAL_CHANNEL_ID, text, shareTask.id);
    else { const cid = await actions.ensureDm(dest); if (cid) await actions.sendMessage(cid, text, shareTask.id); if (reassign) await actions.updateTask(shareTask.id, { assigneeId: dest }); }
    setShareTask(null);
  };
  const pendingHandovers = useMemo(
    () => handovers.filter((h) => h.toUser === userId && h.status === "en_attente").length,
    [handovers, userId]);

  const openComplaints = useMemo(
    () => complaints.filter((c) => ["signale", "en_cours", "en_attente"].includes(c.status)).length,
    [complaints]);

  const pendingReq = useMemo(
    () => (canValidate(me?.role) ? requests.filter((r) => r.status === "en_attente").length : 0),
    [requests, me]);

  const unreadTotal = useMemo(() => {
    const dmIds = channels.filter((c) => c.type === "dm" && channelMembers.some((cm) => cm.channelId === c.id && cm.userId === userId)).map((c) => c.id);
    return [GENERAL_CHANNEL_ID, ...dmIds].filter((ch) => hasUnread(ch)).length;
  }, [channels, channelMembers, messages, userId]);

  useTitleBadge(unreadTotal);   // pastille de non-lus dans le titre de l'onglet

  /* Rappels des tâches planifiées : vérifiés chaque minute, une seule
     notification par tâche et par session. */
  const remindedRef = useRef(new Set());
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const today = isoDate(now);
      const monday = mondayIso(now);
      tasks.forEach((t) => {
        if (t.status === "termine" || !t.startTime || !t.reminderMin) return;
        if (!(t.assigneeId === userId || (t.assigneeIds || []).includes(userId))) return;
        if (t.weekStart !== monday || t.day === null || t.day === undefined) return;
        const dayIso = isoDate(addDays(t.weekStart + "T00:00:00", t.day));
        if (dayIso !== today) return;
        const due = new Date(`${dayIso}T${t.startTime}`);
        const fire = new Date(due.getTime() - t.reminderMin * 60000);
        if (now >= fire && now <= due && !remindedRef.current.has(t.id)) {
          remindedRef.current.add(t.id);
          const mins = Math.max(0, Math.round((due - now) / 60000));
          notify("Rappel de tâche", `${t.title} — ${mins > 0 ? `dans ${mins} min` : "maintenant"} (${t.startTime.slice(0, 5)})`);
        }
      });
    };
    check();
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, [tasks, userId]);

  if (loading || !me) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}><p style={{ color: "var(--muted)" }}>Chargement de votre espace…</p></div>;

  const NAV = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "board", label: "Tâches", icon: ListChecks },
    { id: "planner", label: "Planning", icon: CalendarDays },
    { id: "patrimoine", label: "Patrimoine", icon: Building2 },
    { id: "locataires", label: "Locataires", icon: Users },
    { id: "portefeuille", label: "Mon portefeuille", icon: BadgeCheck },
    { id: "plaintes", label: "Plaintes", icon: MessageCircleWarning, badge: openComplaints },
    { id: "devis", label: "Devis artisans", icon: FileText },
    { id: "documents", label: "Documents", icon: FileSignature },
    { id: "recouvrement", label: "Recouvrement", icon: Wallet },
    ...(isAdmin(me.role) ? [{ id: "caisse", label: "Caisse", icon: Banknote, badge: pendingHandovers }] : []),
    ...(canSupervise(me.role) || me.role === "comptable" ? [{ id: "impots", label: "Impôt foncier", icon: Landmark }] : []),
    { id: "transport", label: "Transport", icon: Car, badge: pendingReq },
    { id: "produits", label: "Produits", icon: SprayCan },
    { id: "messages", label: "Messages", icon: MessageSquare, badge: unreadTotal },
    { id: "time", label: "Suivi du temps", icon: Clock },
    ...(canSupervise(me.role) ? [{ id: "team", label: "Supervision", icon: Users }] : []),
    ...(isAdmin(me.role) ? [{ id: "settings", label: "Administration", icon: Settings }] : []),
  ];

  const FloatingAdd = ({ prefill } = {}) => <button onClick={() => setTaskModal({ prefill: { assigneeId: userId, weekStart: viewWeek, ...prefill } })} className="kb-btn kb-btn-primary"><Plus size={16} /> Nouvelle tâche</button>;
  const WeekNav = ({ extra }) => (
    <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <button onClick={() => setViewWeek(mondayIso(addDays(viewWeek + "T00:00:00", -7)))} className="kb-btn kb-btn-ghost p-2"><ChevronLeft size={16} /></button>
        <div className="text-center min-w-[160px]"><p className="text-sm font-semibold">{weekLabel(viewWeek)}</p>{viewWeek === mondayIso(new Date()) && <p className="text-[11px]" style={{ color: "var(--brass)" }}>Semaine en cours</p>}</div>
        <button onClick={() => setViewWeek(mondayIso(addDays(viewWeek + "T00:00:00", 7)))} className="kb-btn kb-btn-ghost p-2"><ChevronRight size={16} /></button>
        {viewWeek !== mondayIso(new Date()) && <button onClick={() => setViewWeek(mondayIso(new Date()))} className="kb-btn kb-btn-ghost text-xs">Aujourd'hui</button>}
      </div>
      {extra}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <header style={{ background: "var(--ink)" }} className="text-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="bg-white rounded-md px-1.5 py-1 flex items-center shrink-0"><img src={LOGO} alt="Entreprise Kibegnon" className="h-6 w-auto" /></span>
            <div className="min-w-0 hidden xs:block"><p className="font-semibold leading-tight tracking-tight truncate">Suivi d'équipe</p><p className="text-[11px] leading-tight" style={{ color: "#9AA4B2" }}>Entreprise Kibegnon</p></div>
          </div>
          <div className="flex items-center gap-2">
            {myTimer && <button onClick={actions.stopTimer} className="hidden sm:flex items-center gap-2 rounded-full pl-3 pr-2 py-1.5 text-sm font-medium" style={{ background: "var(--live)" }}><span className="w-2 h-2 rounded-full bg-white animate-pulse" />{fmtClock((now - myTimer.startedAt) / 1000)}<span className="bg-white/25 rounded-full p-0.5"><Square size={12} /></span></button>}
            <div className="flex items-center gap-2 pl-1">
              <Avatar member={me} size={30} />
              <div className="hidden sm:block leading-tight"><p className="text-sm font-medium flex items-center gap-1">{me.name}{isAdmin(me.role) && <ShieldCheck size={13} style={{ color: "#9ED27E" }} />}</p><p className="text-[11px]" style={{ color: "#9AA4B2" }}>{ROLES[me.role]}</p></div>
              <button onClick={async () => { await actions.stopTimer(); supabase.auth.signOut(); }} title="Se déconnecter" className="p-2 rounded-lg hover:bg-white/10"><LogOut size={16} /></button>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-2">
          <nav className="flex gap-1 overflow-x-auto no-scrollbar">
            {NAV.map((n) => { const active = view === n.id; return (
              <button key={n.id} onClick={() => setView(n.id)} className="relative flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors" style={{ borderColor: active ? "var(--brass)" : "transparent", color: active ? "#fff" : "#9AA4B2", fontWeight: active ? 600 : 400 }}>
                <n.icon size={15} /> {n.label}
                {n.badge > 0 && <span className="ml-0.5 text-[10px] font-bold text-white rounded-full px-1.5 py-0.5 leading-none" style={{ background: "var(--brass)" }}>{n.badge}</span>}
              </button>
            ); })}
          </nav>
        </div>
      </header>

      {myTimer && <button onClick={actions.stopTimer} className="sm:hidden w-full flex items-center justify-center gap-2 py-2 text-white text-sm font-medium" style={{ background: "var(--live)" }}><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> En cours · {fmtClock((now - myTimer.startedAt) / 1000)} — toucher pour arrêter</button>}

      <main className="max-w-6xl mx-auto px-4 py-5">
        <NotifBanner />
        {view === "dashboard" && Dashboard()}
        {view === "planner" && Planner()}
        {view === "board" && (
          <Taches store={store} me={me} userId={userId}
            liveSecForTask={liveSecForTask} isRunning={isRunning}
            toggleTimer={toggleTimer} advanceStatus={advanceStatus}
            onShare={setShareTask} onEdit={setTaskModal}
            onPause={pauseTask} onFinish={finishTask}
            onNew={() => setTaskModal({ prefill: { assigneeId: userId, weekStart: viewWeek } })} />
        )}
        {view === "patrimoine" && <Patrimoine store={store} me={me} />}
        {view === "locataires" && <Locataires store={store} me={me} userId={userId} />}
        {view === "portefeuille" && <Portefeuille store={store} me={me} userId={userId} />}
        {view === "plaintes" && <Plaintes store={store} me={me} userId={userId} />}
        {view === "devis" && <Devis store={store} me={me} />}
        {view === "documents" && <Documents store={store} me={me} />}
        {view === "recouvrement" && <Recouvrement store={store} me={me} userId={userId} />}
        {view === "caisse" && isAdmin(me.role) && <Caisse store={store} me={me} userId={userId} />}
        {view === "impots" && (canSupervise(me.role) || me.role === "comptable") && <ImpotFoncier store={store} me={me} />}
        {view === "transport" && <Transport store={store} me={me} userId={userId} />}
        {view === "produits" && <Produits store={store} me={me} />}
        {view === "messages" && Messages()}
        {view === "time" && TimeView()}
        {view === "team" && canSupervise(me.role) && Team()}
        {view === "settings" && isAdmin(me.role) && SettingsView()}
      </main>

      {taskModal && <TaskModal initial={taskModal.id ? taskModal : taskModal.prefill || {}} departments={departments} members={members} properties={properties} owners={owners} onSave={saveTask} onClose={() => setTaskModal(null)} onDelete={removeTask} />}
      {shareTask && <ShareTaskModal task={shareTask} members={members} currentUserId={userId} onSend={doShare} onClose={() => setShareTask(null)} />}
      {memberModal && <MemberModal initial={memberModal} departments={departments} members={members} onClose={() => setMemberModal(null)}
        onSubmit={async (f, isNew) => {
          if (isNew) return await actions.adminUsers({ action: "create", username: f.username, password: f.password, full_name: f.name, role: f.role, dept_id: f.deptId, color: f.color });
          await actions.updateProfile(f.id, { name: f.name, role: f.role, deptId: f.deptId, color: f.color, active: f.active });
          if (f.password?.trim()) { const r = await actions.adminUsers({ action: "reset_password", user_id: f.id, password: f.password }); if (r?.error) return r; }
          return {};
        }} />}
      {deptModal && <DeptModal initial={deptModal} onClose={() => setDeptModal(null)} onSave={async (f) => { await actions.saveDept(f); setDeptModal(null); }} />}
    </div>
  );

  /* ---------- Vues ---------- */
  function Dashboard() {
    const wk = mondayIso(new Date()), today = isoDate(new Date());
    const myTasks = tasks.filter((t) => t.assigneeId === userId || (t.assigneeIds || []).includes(userId));
    const myOpen = myTasks.filter((t) => t.status !== "termine");
    const live = myTimer ? Math.round((now - myTimer.startedAt) / 1000) : 0;
    const todaySec = secForUserDay(userId, today) + live;
    const weekSec = secForUserWeek(userId, wk);
    const runningTask = myTimer ? tasks.find((t) => t.id === myTimer.taskId) : null;
    const sup = canSupervise(me.role);
    const teamHours = members.filter((m) => m.active).map((m) => ({ name: m.name.split(" ")[0], h: +(secForUserWeek(m.id, wk) / 3600).toFixed(2), color: m.color }));
    const activeNow = activeTimers.map((t) => memberById[t.userId]).filter(Boolean);
    return (
      <div>
        <div className="flex items-center justify-between mb-4"><div><h1 className="text-xl font-bold">Bonjour {me.name.split(" ")[0]} 👋</h1><p className="text-sm" style={{ color: "var(--muted)" }}>{fr(new Date(), { weekday: "long", day: "numeric", month: "long" })}</p></div><FloatingAdd /></div>
        {runningTask && <div className="rounded-xl p-4 mb-4 text-white flex items-center justify-between" style={{ background: "linear-gradient(100deg,#3d7d20,#4F9E2A)" }}><div className="min-w-0"><p className="text-xs opacity-90 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Chrono en cours</p><p className="font-medium truncate">{runningTask.title}</p></div><div className="flex items-center gap-3"><span className="text-2xl font-bold tabular-nums">{fmtClock((now - myTimer.startedAt) / 1000)}</span><button onClick={actions.stopTimer} className="bg-white/20 hover:bg-white/30 rounded-lg p-2"><Square size={18} /></button></div></div>}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <StatCard icon={ListChecks} label="Mes tâches ouvertes" value={myOpen.length} sub={`${myTasks.length} au total`} tint="#2E78A8" onClick={() => setView("board")} />
          <StatCard icon={Clock} label="Temps suivi aujourd'hui" value={fmtDur(todaySec)} tint="#4F9E2A" onClick={() => setView("time")} />
          <StatCard icon={BarChart3} label="Temps suivi cette semaine" value={fmtDur(weekSec)} tint="var(--brass)" onClick={() => setView("time")} />
          <StatCard icon={AlertTriangle} label="Tâches urgentes" value={myOpen.filter((t) => t.urgency === "urgente" || t.urgency === "haute").length} tint="#D81F26" onClick={() => setView("board")} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard icon={Building2} label="Biens gérés" value={properties.length} sub={`${owners.length} propriétaire(s)`} tint="#2E78A8" onClick={() => setView("patrimoine")} />
          <StatCard icon={FileText} label="Devis en attente" value={quotes.filter((q) => ["recu", "en_validation"].includes(q.status)).length} sub={fcfa(quotes.filter((q) => ["recu", "en_validation"].includes(q.status)).reduce((a, q) => a + q.total, 0))} tint="#EA580C" onClick={() => setView("devis")} />
          <StatCard icon={Wallet} label="Dépenses engagées" value={fcfa(quotes.filter((q) => ["valide", "execute", "paye"].includes(q.status)).reduce((a, q) => a + q.total, 0))} tint="#4F9E2A" onClick={() => setView("devis")} />
          <StatCard icon={SprayCan} label="Alertes de stock" value={products.filter((p) => p.active && p.stock <= p.minQty).length} sub={`${products.length} produits`} tint="#7C3AED" onClick={() => setView("produits")} />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <section className="bg-white rounded-xl border p-4" style={{ borderColor: "var(--line)" }}>
            <h2 className="font-semibold mb-3 flex items-center gap-2"><CalendarDays size={16} style={{ color: "var(--brass)" }} /> Mes prochaines tâches</h2>
            <div className="space-y-2">{myOpen.slice(0, 5).map((t) => <TaskRow key={t.id} task={t} property={propById[t.propertyId]} assignee={memberById[t.assigneeId]} actualSec={liveSecForTask(t.id)} isRunning={isRunning(t.id)} canTrack onEdit={setTaskModal} onToggleTimer={toggleTimer} onAdvance={advanceStatus} onShare={setShareTask} onPause={pauseTask} onFinish={finishTask} />)}{myOpen.length === 0 && <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>Aucune tâche en attente.</p>}</div>
          </section>
          {sup ? (
            <section className="bg-white rounded-xl border p-4" style={{ borderColor: "var(--line)" }}>
              <h2 className="font-semibold mb-1 flex items-center gap-2"><Users size={16} style={{ color: "var(--brass)" }} /> Activité de l'équipe</h2>
              <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>Heures suivies cette semaine</p>
              <ResponsiveContainer width="100%" height={170}><BarChart data={teamHours} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F5" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} /><Tooltip formatter={(v) => [`${v} h`, "Temps"]} /><Bar dataKey="h" radius={[5, 5, 0, 0]}>{teamHours.map((d, i) => <Cell key={i} fill={d.color} />)}</Bar></BarChart></ResponsiveContainer>
              <div className="mt-3 pt-3 border-t text-sm flex items-center gap-2" style={{ borderColor: "var(--line)" }}><span className="w-2 h-2 rounded-full" style={{ background: activeNow.length ? "var(--live)" : "#CBD5E1" }} />{activeNow.length ? <span>{activeNow.map((m) => m.name.split(" ")[0]).join(", ")} en train de travailler</span> : <span style={{ color: "var(--muted)" }}>Personne ne suit de tâche actuellement</span>}</div>
            </section>
          ) : (
            <section className="bg-white rounded-xl border p-4" style={{ borderColor: "var(--line)" }}>
              <h2 className="font-semibold mb-3 flex items-center gap-2"><BarChart3 size={16} style={{ color: "var(--brass)" }} /> Ma répartition par statut</h2>
              <div className="space-y-2.5">{STATUS_ORDER.map((s) => { const n = myTasks.filter((t) => t.status === s).length; const pct = myTasks.length ? (n / myTasks.length) * 100 : 0; return <div key={s}><div className="flex justify-between text-xs mb-1"><span>{STATUS[s].label}</span><span style={{ color: "var(--muted)" }}>{n}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full" style={{ width: `${pct}%`, background: STATUS[s].color }} /></div></div>; })}</div>
            </section>
          )}
        </div>
      </div>
    );
  }

  function Planner() {
    const sup = canSupervise(me.role);
    const who = sup && superMember !== "all" ? superMember : userId;
    const planMember = memberById[who];
    const weekTasks = tasks.filter((t) => t.weekStart === viewWeek && t.assigneeId === who);
    const unplanned = weekTasks.filter((t) => t.day === null || t.day === undefined);
    const estTotal = weekTasks.reduce((a, t) => a + (t.estMin || 0), 0);
    const realTotal = weekTasks.reduce((a, t) => a + liveSecForTask(t.id), 0);
    return (
      <div>
        <div className="flex items-center justify-between mb-1 gap-2 flex-wrap"><h1 className="text-xl font-bold">Planning hebdomadaire</h1><FloatingAdd prefill={{ assigneeId: who, day: 0 }} /></div>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>{planMember?.name} · Estimé {fmtEst(estTotal)} · Suivi {fmtDur(realTotal)}</p>
        <WeekNav extra={sup && <select className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} value={superMember} onChange={(e) => setSuperMember(e.target.value)}><option value="all">Mon planning ({me.name.split(" ")[0]})</option>{members.filter((m) => m.id !== userId && m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DAYS.map((day, i) => {
            const dayIso = isoDate(addDays(viewWeek + "T00:00:00", i));
            const dts = weekTasks.filter((t) => t.day === i);
            const isToday = dayIso === isoDate(new Date());
            return (
              <div key={i} className="bg-white rounded-xl border" style={{ borderColor: isToday ? "var(--brass)" : "var(--line)" }}>
                <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "var(--line)" }}><div><p className="text-sm font-semibold">{day}</p><p className="text-[11px]" style={{ color: "var(--muted)" }}>{fr(addDays(viewWeek + "T00:00:00", i), { day: "numeric", month: "short" })} · {fmtDur(secForUserDay(who, dayIso))}</p></div><button onClick={() => setTaskModal({ prefill: { assigneeId: who, weekStart: viewWeek, day: i } })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Plus size={15} /></button></div>
                <div className="p-2 space-y-2 min-h-[60px]">{dts.map((t) => <TaskRow key={t.id} task={t} property={propById[t.propertyId]} assignee={memberById[t.assigneeId]} actualSec={liveSecForTask(t.id)} isRunning={isRunning(t.id)} canTrack={who === userId} onEdit={setTaskModal} onToggleTimer={toggleTimer} onAdvance={advanceStatus} onShare={setShareTask} onPause={pauseTask} onFinish={finishTask} />)}{dts.length === 0 && <p className="text-xs text-center py-3" style={{ color: "#B6BEC9" }}>—</p>}</div>
              </div>
            );
          })}
        </div>
        {unplanned.length > 0 && <div className="mt-4 bg-white rounded-xl border p-3" style={{ borderColor: "var(--line)" }}><p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><AlertTriangle size={14} style={{ color: "#EA580C" }} /> À planifier cette semaine</p><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{unplanned.map((t) => <TaskRow key={t.id} task={t} property={propById[t.propertyId]} assignee={memberById[t.assigneeId]} actualSec={liveSecForTask(t.id)} isRunning={isRunning(t.id)} canTrack={who === userId} onEdit={setTaskModal} onToggleTimer={toggleTimer} onAdvance={advanceStatus} onShare={setShareTask} onPause={pauseTask} onFinish={finishTask} />)}</div></div>}
      </div>
    );
  }

  function Messages() {
    const others = members.filter((m) => m.active);
    const convos = [{ chId: GENERAL_CHANNEL_ID, name: "Général", group: true }, ...others.filter((m) => m.id !== userId).map((m) => ({ chId: dmChannelFor(m.id), name: m.name, member: m, group: false }))];
    const current = activeChannel ? (activeChannel === GENERAL_CHANNEL_ID ? { chId: GENERAL_CHANNEL_ID, name: "Général", group: true } : convos.find((c) => c.chId === activeChannel)) : null;
    const myTasks = tasks.filter((t) => t.assigneeId === userId);

    const ConvoList = (
      <div className={`${activeChannel ? "hidden md:block" : "block"} md:w-72 shrink-0 bg-white rounded-xl border overflow-hidden`} style={{ borderColor: "var(--line)" }}>
        <p className="text-sm font-semibold px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}>Conversations</p>
        <div className="divide-y max-h-[70vh] overflow-y-auto" style={{ borderColor: "var(--line)" }}>
          {convos.map((c) => { const lm = c.chId ? lastMessage(c.chId) : null; const unread = c.chId ? hasUnread(c.chId) : false; const open = c.group ? openGeneral : () => openDm(c.member.id); return (
            <button key={c.member?.id || "gen"} onClick={open} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50" style={{ background: activeChannel === c.chId && c.chId ? "#F6F8FA" : "#fff" }}>
              {c.group ? <span className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: "var(--brass)" }}><Users size={16} /></span> : <Avatar member={c.member} size={36} />}
              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate flex items-center gap-1">{c.name}{unread && <span className="w-2 h-2 rounded-full" style={{ background: "var(--brass)" }} />}</p><p className="text-[11px] truncate" style={{ color: "var(--muted)" }}>{lm ? `${lm.fromId === userId ? "Vous : " : ""}${lm.taskId ? "📋 " : ""}${lm.text || "Tâche partagée"}` : "Démarrer la conversation"}</p></div>
            </button>
          ); })}
        </div>
      </div>
    );

    const Thread = current && (
      <div className="flex-1 bg-white rounded-xl border flex flex-col min-h-[60vh] max-h-[78vh]" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: "var(--line)" }}><button onClick={() => setActiveChannel(null)} className="md:hidden p-1.5 rounded-lg hover:bg-slate-100"><ArrowLeft size={17} /></button>{current.group ? <span className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: "var(--brass)" }}><Users size={15} /></span> : <Avatar member={current.member} size={32} />}<div><p className="text-sm font-semibold">{current.name}</p><p className="text-[11px]" style={{ color: "var(--muted)" }}>{current.group ? `${others.length} membres` : ROLES[current.member.role]}</p></div></div>
        <div ref={threadRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {channelMessages(current.chId).map((m) => { const mine = m.fromId === userId; const from = memberById[m.fromId]; const refTask = m.taskId ? tasks.find((t) => t.id === m.taskId) : null; return (
            <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <Avatar member={from} size={28} />
              <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                <div className="px-3 py-2 rounded-2xl text-sm" style={{ background: mine ? "var(--brass)" : "#F1F3F5", color: mine ? "#fff" : "var(--ink)", borderTopRightRadius: mine ? 4 : 16, borderTopLeftRadius: mine ? 16 : 4 }}>
                  {!mine && current.group && <p className="text-[11px] font-semibold mb-0.5" style={{ color: from?.color }}>{from?.name}</p>}
                  {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                  {m.fileUrl && (
                    /^image\//.test(m.fileType)
                      ? <a href={m.fileUrl} target="_blank" rel="noreferrer" className="block mt-1.5">
                          <img src={m.fileUrl} alt={m.fileName} className="rounded-lg max-h-52 w-auto" />
                        </a>
                      : <a href={m.fileUrl} target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 mt-1.5 px-2.5 py-2 rounded-lg"
                          style={{ background: mine ? "rgba(255,255,255,.18)" : "#fff", border: mine ? "none" : "1px solid var(--line)", color: mine ? "#fff" : "var(--ink)" }}>
                          <Paperclip size={14} />
                          <span className="text-xs truncate max-w-[180px]">{m.fileName}</span>
                          <Download size={13} className="ml-auto shrink-0" />
                        </a>
                  )}
                  {String(m.id).startsWith("tmp-") && m.fileName && !m.fileUrl && (
                    <p className="text-[11px] mt-1 opacity-80">📎 {m.fileName} — envoi…</p>
                  )}
                  {refTask && <div className="mt-2 rounded-lg p-2 text-left" style={{ background: mine ? "rgba(255,255,255,.15)" : "#fff", border: mine ? "none" : "1px solid var(--line)" }}><p className="text-[11px] flex items-center gap-1 mb-0.5" style={{ color: mine ? "rgba(255,255,255,.85)" : "var(--muted)" }}><ListChecks size={11} /> Tâche partagée</p><p className="text-sm font-medium" style={{ color: mine ? "#fff" : "var(--ink)" }}>{refTask.title}</p><p className="text-[11px] mt-0.5" style={{ color: mine ? "rgba(255,255,255,.85)" : "var(--muted)" }}>{URGENCY[refTask.urgency].label} · {STATUS[refTask.status].label}</p></div>}
                </div>
                <span className="text-[10px] mt-0.5 px-1" style={{ color: "var(--muted)" }}>{fmtTime(m.createdAt)}</span>
              </div>
            </div>
          ); })}
          {channelMessages(current.chId).length === 0 && <p className="text-sm text-center py-10" style={{ color: "var(--muted)" }}>Aucun message. Écrivez le premier.</p>}
        </div>
        {attachTaskId && <div className="px-3 pt-2 flex items-center gap-2"><Chip color="var(--brass)" bg="#FDEAEA"><ListChecks size={11} /> {tasks.find((t) => t.id === attachTaskId)?.title?.slice(0, 40)}</Chip><button onClick={() => setAttachTaskId("")} className="text-slate-400"><X size={14} /></button></div>}
        {pendingFile && <div className="px-3 pt-2 flex items-center gap-2">
          <Chip color="#2E78A8" bg="#E8F2F8"><Paperclip size={11} /> {pendingFile.name} ({Math.round(pendingFile.size / 1024)} Ko)</Chip>
          <button onClick={() => { setPendingFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-slate-400"><X size={14} /></button>
        </div>}
        <div className="p-2.5 border-t flex items-center gap-2" style={{ borderColor: "var(--line)" }}>
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => setPendingFile(e.target.files?.[0] || null)} />
          <button onClick={() => fileRef.current?.click()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 shrink-0" title="Joindre un fichier"><Paperclip size={17} /></button>
          <select value={attachTaskId} onChange={(e) => setAttachTaskId(e.target.value)} className="text-xs px-2 py-2 rounded-lg border bg-white shrink-0" style={{ ...inputStyle, width: 46 }} title="Joindre une tâche"><option value="">📋</option>{myTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
          <input value={msgDraft} onChange={(e) => setMsgDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDraft(); } }} placeholder="Écrire un message…" className="flex-1 px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
          <button onClick={sendDraft} disabled={(!msgDraft.trim() && !attachTaskId && !pendingFile) || uploading} className="kb-btn kb-btn-primary disabled:opacity-40 px-3">
            {uploading ? <span className="text-xs">…</span> : <Send size={16} />}
          </button>
        </div>
      </div>
    );

    return (
      <div>
        <h1 className="text-xl font-bold mb-1">Messagerie d'équipe</h1>
        <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>Échangez en privé, en groupe, partagez des fichiers et des tâches.</p>
        {notifPerm === "denied" && (
          <p className="text-[11px] mb-3" style={{ color: "var(--muted)" }}>
            <BellOff size={12} className="inline mb-0.5" /> Notifications bloquées pour ce site — réactivez-les dans les réglages du navigateur (icône à gauche de l'adresse).
          </p>
        )}
        <div className="flex gap-4">{ConvoList}{activeChannel ? Thread : <div className="hidden md:flex flex-1 bg-white rounded-xl border items-center justify-center text-sm min-h-[60vh]" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>Sélectionnez une conversation</div>}</div>
      </div>
    );
  }

  function TimeView() {
    const myEntries = [...timeEntries].filter((e) => e.userId === userId).sort((a, b) => b.start - a.start);
    const todaySec = secForUserDay(userId, isoDate(new Date()));
    const weekSec = secForUserWeek(userId, mondayIso(new Date()));
    const trackable = tasks.filter((t) => t.assigneeId === userId && t.status !== "termine");
    return (
      <div>
        <h1 className="text-xl font-bold mb-1">Suivi du temps</h1>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Chronométrez vos tâches en temps réel, ou saisissez le temps manuellement.</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-5"><StatCard icon={Clock} label="Aujourd'hui" value={fmtDur(todaySec)} tint="#4F9E2A" /><StatCard icon={BarChart3} label="Cette semaine" value={fmtDur(weekSec)} tint="var(--brass)" /></div>
        <div className="bg-white rounded-xl border p-4 mb-4" style={{ borderColor: "var(--line)" }}>
          <p className="text-sm font-semibold mb-2">Lancer un chrono</p>
          <div className="grid sm:grid-cols-2 gap-2">{trackable.map((t) => <div key={t.id} className="flex items-center justify-between gap-2 border rounded-lg px-3 py-2" style={{ borderColor: isRunning(t.id) ? "var(--live)" : "var(--line)" }}><span className="text-sm truncate">{t.title}</span><div className="flex items-center gap-2 shrink-0"><span className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>{fmtDur(liveSecForTask(t.id))}</span><button onClick={() => toggleTimer(t)} className="p-1.5 rounded-lg text-white" style={{ background: isRunning(t.id) ? "#D81F26" : "var(--live)" }}>{isRunning(t.id) ? <Square size={13} /> : <Play size={13} />}</button></div></div>)}{trackable.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>Aucune tâche active à chronométrer.</p>}</div>
          <div className="border-t mt-4 pt-3" style={{ borderColor: "var(--line)" }}>
            <p className="text-sm font-semibold mb-2">Saisie manuelle</p>
            <div className="flex flex-wrap gap-2 items-center"><select value={manualTask} onChange={(e) => setManualTask(e.target.value)} className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}><option value="">Choisir une tâche…</option>{tasks.filter((t) => t.assigneeId === userId).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select><input type="number" min={5} step={5} value={manualMin} onChange={(e) => setManualMin(Number(e.target.value))} className="w-24 px-3 py-2 rounded-lg border text-sm" style={inputStyle} /> <span className="text-sm" style={{ color: "var(--muted)" }}>min</span><button disabled={!manualTask} onClick={() => { actions.addManualTime(manualTask, manualMin); setManualTask(""); }} className="kb-btn kb-btn-primary disabled:opacity-40"><Plus size={15} /> Ajouter</button></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border" style={{ borderColor: "var(--line)" }}>
          <p className="text-sm font-semibold px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}>Mes sessions enregistrées</p>
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>{myEntries.slice(0, 40).map((e) => { const t = tasks.find((x) => x.id === e.taskId); return <div key={e.id} className="flex items-center justify-between px-4 py-2.5 gap-2"><div className="min-w-0"><p className="text-sm truncate">{t?.title || "Tâche supprimée"}</p><p className="text-[11px]" style={{ color: "var(--muted)" }}>{fr(e.start, { weekday: "short", day: "numeric", month: "short" })} · {fmtTime(e.start)}{e.note ? ` · ${e.note}` : ""}</p></div><div className="flex items-center gap-2 shrink-0"><span className="text-sm font-medium tabular-nums">{fmtDur(e.durationSeconds)}</span><button onClick={() => actions.deleteEntry(e.id)} className="p-1 rounded text-slate-300 hover:text-red-500"><Trash2 size={14} /></button></div></div>; })}{myEntries.length === 0 && <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>Aucune session pour le moment.</p>}</div>
        </div>
      </div>
    );
  }

  function Team() {
    const wk = viewWeek;
    const rows = members.filter((m) => m.active).map((m) => { const mTasks = tasks.filter((t) => t.assigneeId === m.id); const open = mTasks.filter((t) => t.status !== "termine"); const est = tasks.filter((t) => t.assigneeId === m.id && t.weekStart === wk).reduce((a, t) => a + (t.estMin || 0), 0); return { m, open: open.length, done: mTasks.filter((t) => t.status === "termine").length, urgent: open.filter((t) => t.urgency === "urgente" || t.urgency === "haute").length, estMin: est, realSec: secForUserWeek(m.id, wk), active: activeTimers.some((t) => t.userId === m.id) }; });
    const deptTime = departments.map((d) => { const sec = timeEntries.filter((e) => entryWeek(e) === wk && tasks.find((t) => t.id === e.taskId)?.deptId === d.id).reduce((a, e) => a + e.durationSeconds, 0); return { name: d.name.split(" ")[0], value: +(sec / 3600).toFixed(2), color: d.color }; }).filter((d) => d.value > 0);
    const teamWeekSec = rows.reduce((a, r) => a + r.realSec, 0);
    return (
      <div>
        <h1 className="text-xl font-bold mb-1">Supervision de l'équipe</h1>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Qui fait quoi, et combien de temps chaque tâche prend réellement.</p>
        <WeekNav />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard icon={Clock} label="Temps total équipe" value={fmtDur(teamWeekSec)} tint="var(--brass)" />
          <StatCard icon={ListChecks} label="Tâches ouvertes" value={tasks.filter((t) => t.status !== "termine").length} tint="#2E78A8" />
          <StatCard icon={CheckCircle2} label="Tâches terminées" value={tasks.filter((t) => t.status === "termine").length} tint="#4F9E2A" />
          <StatCard icon={AlertTriangle} label="Urgences ouvertes" value={tasks.filter((t) => t.status !== "termine" && (t.urgency === "urgente" || t.urgency === "haute")).length} tint="#D81F26" />
        </div>
        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          <section className="bg-white rounded-xl border p-4" style={{ borderColor: "var(--line)" }}><h2 className="font-semibold mb-3 text-sm">Heures suivies par personne</h2><ResponsiveContainer width="100%" height={200}><BarChart data={rows.map((r) => ({ name: r.m.name.split(" ")[0], h: +(r.realSec / 3600).toFixed(2), color: r.m.color }))} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F5" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} /><Tooltip formatter={(v) => [`${v} h`, "Temps"]} /><Bar dataKey="h" radius={[5, 5, 0, 0]}>{rows.map((r, i) => <Cell key={i} fill={r.m.color} />)}</Bar></BarChart></ResponsiveContainer></section>
          <section className="bg-white rounded-xl border p-4" style={{ borderColor: "var(--line)" }}><h2 className="font-semibold mb-3 text-sm">Répartition du temps par département</h2>{deptTime.length ? <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={deptTime} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>{deptTime.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie><Tooltip formatter={(v, n) => [`${v} h`, n]} /></PieChart></ResponsiveContainer> : <p className="text-sm text-center py-12" style={{ color: "var(--muted)" }}>Pas encore de temps suivi cette semaine.</p>}<div className="flex flex-wrap gap-2 mt-2 justify-center">{deptTime.map((d) => <Chip key={d.name} color={d.color} dot>{d.name}</Chip>)}</div></section>
        </div>
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left" style={{ color: "var(--muted)" }}><th className="px-4 py-2.5 font-medium">Membre</th><th className="px-3 py-2.5 font-medium">Ouvertes</th><th className="px-3 py-2.5 font-medium">Terminées</th><th className="px-3 py-2.5 font-medium">Urgences</th><th className="px-3 py-2.5 font-medium">Estimé (sem.)</th><th className="px-3 py-2.5 font-medium">Suivi (sem.)</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.m.id} className="border-t" style={{ borderColor: "var(--line)" }}><td className="px-4 py-2.5"><div className="flex items-center gap-2"><Avatar member={r.m} size={28} /><div className="min-w-0"><p className="font-medium flex items-center gap-1.5">{r.m.name}{r.active && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--live)" }} />}</p><p className="text-[11px]" style={{ color: "var(--muted)" }}>{ROLES[r.m.role]}</p></div></div></td><td className="px-3 py-2.5">{r.open}</td><td className="px-3 py-2.5">{r.done}</td><td className="px-3 py-2.5">{r.urgent > 0 ? <Chip color="#D81F26" bg="#FDEAEA">{r.urgent}</Chip> : "—"}</td><td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>{fmtEst(r.estMin)}</td><td className="px-3 py-2.5 font-medium">{fmtDur(r.realSec)}</td></tr>)}</tbody>
        </table></div></div>
      </div>
    );
  }

  function SettingsView() {
    return (
      <div>
        <div className="flex items-center gap-2 mb-1"><h1 className="text-xl font-bold">Administration</h1><Chip color="var(--brass)" bg="#FDEAEA"><ShieldCheck size={12} /> Accès complet</Chip></div>
        <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>Créez les comptes de l'équipe, définissez les rôles et gérez les départements.</p>
        <section className="bg-white rounded-xl border mb-4" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}><h2 className="font-semibold flex items-center gap-2"><Users size={16} style={{ color: "var(--brass)" }} /> Comptes utilisateurs</h2><button onClick={() => setMemberModal({})} className="kb-btn kb-btn-primary text-sm"><UserPlus size={14} /> Créer un compte</button></div>
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>{members.map((m) => <div key={m.id} className="flex items-center justify-between px-4 py-2.5"><div className="flex items-center gap-2.5"><Avatar member={m} size={34} /><div><p className="text-sm font-medium flex items-center gap-1.5">{m.name}{!m.active && <Chip color="#94A3B8">désactivé</Chip>}</p><p className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--muted)" }}><AtSign size={11} />{m.username} · {ROLES[m.role]} · {deptById[m.deptId]?.name || "—"}</p></div></div><div className="flex gap-1"><button onClick={() => setMemberModal(m)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Pencil size={14} /></button>{m.id !== userId && <button onClick={async () => { if (confirm(`Supprimer le compte de ${m.name} ?`)) await actions.adminUsers({ action: "delete", user_id: m.id }); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}</div></div>)}</div>
        </section>
        <section className="bg-white rounded-xl border mb-4" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}><h2 className="font-semibold flex items-center gap-2"><BarChart3 size={16} style={{ color: "var(--brass)" }} /> Départements</h2><button onClick={() => setDeptModal({})} className="kb-btn kb-btn-ghost text-sm"><Plus size={14} /> Ajouter</button></div>
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>{departments.map((d) => <div key={d.id} className="flex items-center justify-between px-4 py-2.5"><div className="flex items-center gap-2.5"><span className="w-4 h-4 rounded" style={{ background: d.color }} /><p className="text-sm font-medium">{d.name}</p></div><div className="flex gap-1"><button onClick={() => setDeptModal(d)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Pencil size={14} /></button>{departments.length > 1 && <button onClick={() => actions.deleteDept(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}</div></div>)}</div>
        </section>
      </div>
    );
  }
}
