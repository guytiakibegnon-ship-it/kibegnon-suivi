/* ============================================================================
 *  ENTREPRISE KIBEGNON · SUIVI D'ÉQUIPE — application complète (fichier unique)
 *  Modules : Tableau de bord · Tâches · Planning · Patrimoine · Devis artisans
 *            Documents · Produits & entretien · Messages · Temps · Administration
 *  Dépendances externes uniquement : react, lucide-react, recharts, ./supabaseClient
 * ==========================================================================*/
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  AlertTriangle, ArrowDownToLine, ArrowLeft, ArrowUpFromLine, AtSign, BadgeCheck, BarChart3, Building2, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Clock, Eye, EyeOff, FileSignature, FileText, Filter, Hammer, Home, Inbox, KeyRound, LayoutDashboard, ListChecks, Lock, LogOut, Mail, MapPin, MessageCircle, MessageSquare, Package, Pencil, Phone, Play, Plus, Printer, Receipt, RotateCcw, Search, Send, Settings, ShieldCheck, SprayCan, Square, Timer, Trash2, TrendingDown, UserPlus, UserRound, Users, Wallet, X, Zap,
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
const DOC_TYPE_ORDER = ["decompte_entree", "prestation", "facture_impayes", "quittance", "relance"];

const DOC_STATUS = {
  brouillon: { label: "Brouillon", color: "#94A3B8" },
  emis:      { label: "Émis",      color: "#2E78A8" },
  envoye:    { label: "Envoyé",    color: "#C58A1B" },
  regle:     { label: "Réglé",     color: "#4F9E2A" },
  annule:    { label: "Annulé",    color: "#D81F26" },
};
const DOC_STATUS_ORDER = ["brouillon", "emis", "envoye", "regle", "annule"];

const RELANCE_TONE = {
  rappel:  "Rappel amiable",
  relance: "Relance ferme",
  mise_en_demeure: "Mise en demeure",
};

/* ══════════════════════════════════════════════════════════════════════
   HELPERS (dates, montants, nombres en lettres)
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
const fmtDur = (sec) => {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
  if (m > 0) return `${m}m${String(s).padStart(2, "0")}`;
  return `${s}s`;
};
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

const StatCard = ({ icon: Icon, label, value, sub, tint = "var(--brass)" }) => (
  <div className="bg-white rounded-xl border p-4" style={{ borderColor: "var(--line)" }}>
    <div className="flex items-center gap-2 mb-2">
      <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: tint + "1A", color: tint }}><Icon size={15} /></span>
      <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</span>
    </div>
    <p className="text-2xl font-bold" style={{ color: "var(--ink)" }}>{value}</p>
    {sub && <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{sub}</p>}
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

/* ══════════════════════════════════════════════════════════════════════
   STORE (chargement, temps réel, actions Supabase)
   ══════════════════════════════════════════════════════════════════════ */
/* ---- mappers DB (snake_case) -> UI (camelCase) ---- */
const mProfile = (r) => ({ id: r.id, name: r.full_name, username: r.username, role: r.role, deptId: r.dept_id, color: r.color, active: r.active });
const mDept    = (r) => ({ id: r.id, name: r.name, color: r.color });
const mTask    = (r) => ({ id: r.id, title: r.title, description: r.description, deptId: r.dept_id, assigneeId: r.assignee_id, urgency: r.urgency, status: r.status, estMin: r.est_min, weekStart: r.week_start, day: r.day, dueDate: r.due_date, createdBy: r.created_by, createdAt: Date.parse(r.created_at), propertyId: r.property_id, ownerId: r.owner_id, nature: r.nature || "autre" });
const mEntry   = (r) => ({ id: r.id, taskId: r.task_id, userId: r.user_id, start: Date.parse(r.start_at), end: Date.parse(r.end_at), durationSeconds: r.duration_seconds, note: r.note });
const mTimer   = (r) => ({ userId: r.user_id, taskId: r.task_id, startedAt: Date.parse(r.started_at) });
const mChannel = (r) => ({ id: r.id, type: r.type, name: r.name });
const mCM      = (r) => ({ channelId: r.channel_id, userId: r.user_id, lastReadAt: Date.parse(r.last_read_at) });
const mMsg     = (r) => ({ id: r.id, channelId: r.channel_id, fromId: r.from_id, text: r.body, taskId: r.task_id, createdAt: Date.parse(r.created_at) });

const mOwner   = (r) => ({ id: r.id, name: r.full_name, kind: r.kind, phone: r.phone, email: r.email, address: r.address, idNumber: r.id_number, notes: r.notes, active: r.active });
const mProp    = (r) => ({ id: r.id, ref: r.ref, name: r.name, kind: r.kind, address: r.address, commune: r.commune, quartier: r.quartier, ownerId: r.owner_id, lotsCount: r.lots_count, surface: r.surface_m2, rent: r.rent_amount, mandate: r.mandate_type, status: r.status, notes: r.notes });
const mProduct = (r) => ({ id: r.id, name: r.name, category: r.category, unit: r.unit, stock: Number(r.stock_qty), minQty: Number(r.min_qty), price: Number(r.unit_price), supplier: r.supplier, active: r.active });
const mStockIn = (r) => ({ id: r.id, productId: r.product_id, qty: Number(r.qty), price: Number(r.unit_price), supplier: r.supplier, date: r.entry_date, notes: r.notes, createdBy: r.created_by });
const mRelease = (r) => ({ id: r.id, ref: r.ref, propertyId: r.property_id, releasedTo: r.released_to, releasedBy: r.released_by, purpose: r.purpose, date: r.release_date, zone: r.zone, notes: r.notes, createdAt: Date.parse(r.created_at) });
const mRelLine = (r) => ({ id: r.id, releaseId: r.release_id, productId: r.product_id, qty: Number(r.qty), price: Number(r.unit_price) });
const mQuote   = (r) => ({ id: r.id, ref: r.ref, artisanName: r.artisan_name, trade: r.artisan_trade, phone: r.artisan_phone, propertyId: r.property_id, ownerId: r.owner_id, date: r.quote_date, source: r.source, object: r.object, total: Number(r.total_amount), status: r.status, notes: r.notes, recordedBy: r.recorded_by, createdAt: Date.parse(r.created_at) });
const mQLine   = (r) => ({ id: r.id, quoteId: r.quote_id, label: r.label, qty: Number(r.qty), unit: r.unit, price: Number(r.unit_price), position: r.position });
const mDoc     = (r) => ({ id: r.id, ref: r.ref, docType: r.doc_type, date: r.doc_date, propertyId: r.property_id, ownerId: r.owner_id, clientName: r.client_name, clientPhone: r.client_phone, clientEmail: r.client_email, clientAddr: r.client_addr, object: r.object, body: r.body, lines: r.lines || [], fields: r.fields || {}, total: Number(r.total_amount), status: r.status, notes: r.notes, createdBy: r.created_by, createdAt: Date.parse(r.created_at) });
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

  const load = useCallback(async () => {
    const [dep, prof, tk, te, at, ch, cm, ms, ow, pr, pd, se, rl, rll, qt, ql, tpl, doc] = await Promise.all([
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
    const h = (up, rm, key = "id") => (p) => p.eventType === "DELETE" ? rm(p.old[key]) : up(p.new);

    const ch = supabase.channel("kibegnon-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, h(upTask, rmTask))
      .on("postgres_changes", { event: "*", schema: "public", table: "time_entries" }, h(upEntry, rmEntry))
      .on("postgres_changes", { event: "*", schema: "public", table: "active_timers" }, h(upTimer, rmTimer, "user_id"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
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
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  /* ================= ACTIONS : TÂCHES ================= */
  const createTask = async (f) => {
    await supabase.from("tasks").insert({
      title: f.title, description: f.description || "", dept_id: f.deptId || null, assignee_id: f.assigneeId,
      urgency: f.urgency, status: f.status || "a_faire", est_min: f.estMin, week_start: f.weekStart,
      day: f.day ?? null, due_date: f.dueDate || null, created_by: userId,
      property_id: f.propertyId || null, owner_id: f.ownerId || null, nature: f.nature || "autre",
    });
  };
  const updateTask = async (id, patch) => {
    const map = { title: "title", description: "description", deptId: "dept_id", assigneeId: "assignee_id",
      urgency: "urgency", status: "status", estMin: "est_min", weekStart: "week_start", day: "day",
      dueDate: "due_date", propertyId: "property_id", ownerId: "owner_id", nature: "nature" };
    const row = {};
    Object.entries(map).forEach(([k, col]) => { if (k in patch) row[col] = patch[k] === "" ? null : patch[k]; });
    await supabase.from("tasks").update(row).eq("id", id);
  };
  const deleteTask = async (id) => { await supabase.from("tasks").delete().eq("id", id); };

  /* ================= ACTIONS : TEMPS ================= */
  const startTimer = async (taskId) => {
    setActiveTimers((p) => [...p.filter((t) => t.userId !== userId), { userId, taskId, startedAt: Date.now() }]);
    await supabase.from("active_timers").upsert({ user_id: userId, task_id: taskId, started_at: new Date().toISOString() });
  };
  const stopTimer = async () => {
    const mine = activeTimers.find((t) => t.userId === userId);
    if (!mine) return;
    const sec = Math.round((Date.now() - mine.startedAt) / 1000);
    setActiveTimers((p) => p.filter((t) => t.userId !== userId));
    if (sec > 1) {
      await supabase.from("time_entries").insert({ task_id: mine.taskId, user_id: userId, start_at: new Date(mine.startedAt).toISOString(), end_at: new Date().toISOString(), duration_seconds: sec, note: "" });
    }
    await supabase.from("active_timers").delete().eq("user_id", userId);
  };
  const addManualTime = async (taskId, min) => {
    await supabase.from("time_entries").insert({ task_id: taskId, user_id: userId, start_at: new Date(Date.now() - min * 60000).toISOString(), end_at: new Date().toISOString(), duration_seconds: min * 60, note: "saisie manuelle" });
  };
  const deleteEntry = async (id) => { await supabase.from("time_entries").delete().eq("id", id); };

  /* ================= ACTIONS : MESSAGERIE ================= */
  const ensureDm = async (otherId) => {
    const { data, error } = await supabase.rpc("get_or_create_dm", { other_user: otherId });
    if (error) { console.error(error); return null; }
    await supabase.from("channel_members").select("*").then(({ data: cm }) => cm && setChannelMembers(cm.map(mCM)));
    await supabase.from("channels").select("*").then(({ data: c }) => c && setChannels(c.map(mChannel)));
    return data;
  };
  const sendMessage = async (channelId, text, taskId = null) => {
    const body = (text || "").trim();
    if (!body && !taskId) return;
    const tmp = { id: "tmp-" + Date.now(), channelId, fromId: userId, text: body, taskId, createdAt: Date.now() };
    setMessages((p) => [...p, tmp]);
    await supabase.from("messages").insert({ channel_id: channelId, from_id: userId, body, task_id: taskId });
    markRead(channelId);
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
      mandate_type: f.mandate, status: f.status, notes: f.notes || "" };
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

  /* ================= ACTIONS : DOCUMENTS ================= */
  const saveDocument = async (f) => {
    const total = (f.lines || []).reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);
    const row = {
      doc_type: f.docType, doc_date: f.date, property_id: f.propertyId || null, owner_id: f.ownerId || null,
      client_name: f.clientName || "", client_phone: f.clientPhone || "", client_email: f.clientEmail || "",
      client_addr: f.clientAddr || "", object: f.object || "", body: f.body || "",
      lines: f.lines || [], fields: f.fields || {}, total_amount: total,
      status: f.status || "brouillon", notes: f.notes || "",
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
    actions: {
      createTask, updateTask, deleteTask, startTimer, stopTimer, addManualTime, deleteEntry,
      ensureDm, sendMessage, markRead, saveDept, deleteDept, updateProfile, adminUsers,
      saveOwner, deleteOwner, saveProperty, deleteProperty,
      saveProduct, deleteProduct, addStockEntry, saveRelease, deleteRelease,
      saveQuote, setQuoteStatus, deleteQuote,
      saveDocument, setDocumentStatus, deleteDocument, reload: load,
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
function DocModal({ initial, properties, owners, onSave, onClose }) {
  const cfg = DOC_TYPES[initial.docType];
  const [f, setF] = useState(() => ({
    docType: initial.docType, date: isoDate(new Date()), propertyId: "", ownerId: "",
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

  const total = linesTotal(lines);
  const isLetter = cfg.layout === "lettre";
  const valid = f.clientName.trim();
  const submit = async () => {
    setBusy(true);
    const r = await onSave({ ...f, lines });
    setBusy(false);
    if (r?.error) setErr(r.error); else onClose();
  };

  return (
    <Modal title={f.id ? `${cfg.label} ${f.ref || ""}` : cfg.label} onClose={onClose} wide>
      <div className="rounded-lg p-3 mb-4 text-xs" style={{ background: cfg.color + "12", color: cfg.color }}>
        {cfg.desc} · Département : <strong>{cfg.dept}</strong>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={cfg.clientLabel}><input className={inputCls} style={inputStyle} value={f.clientName} autoFocus onChange={(e) => set("clientName", e.target.value)} placeholder="Ex. Mme SAKOUA BADE" /></Field>
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
      {(f.docType === "quittance" || f.docType === "facture_impayes") && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Période concernée"><input className={inputCls} style={inputStyle} value={f.fields.periode || ""} onChange={(e) => setField("periode", e.target.value)} placeholder="Ex. Janvier à Mars 2026" /></Field>
          {f.docType === "quittance" && <Field label="Date de règlement"><input type="date" className={inputCls} style={inputStyle} value={f.fields.paidOn || ""} onChange={(e) => setField("paidOn", e.target.value)} /></Field>}
          {f.docType === "facture_impayes" && <Field label="Échéance de paiement"><input type="date" className={inputCls} style={inputStyle} value={f.fields.dueDate || ""} onChange={(e) => setField("dueDate", e.target.value)} /></Field>}
        </div>
      )}

      {isLetter && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
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

      <p className="text-xs font-semibold mb-2 mt-1" style={{ color: "var(--ink)" }}>
        {isLetter ? "Sommes réclamées" : "Détail du document"}
      </p>
      <LineEditor lines={lines} setLines={setLines} showUnit={f.docType !== "decompte_entree"}
        labelPlaceholder={f.docType === "decompte_entree" ? "Ex. 2 MOIS D'AVANCE" : "Désignation"} />

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
  const cfg = DOC_TYPES[doc.docType];
  const st = DOC_STATUS[doc.status];
  const isLetter = cfg.layout === "lettre";
  const body = doc.body?.trim() || (isLetter ? relanceBody(doc, property) : "");

  return (
    <div>
      <div className="flex items-center justify-between mb-3 print:hidden gap-2 flex-wrap">
        <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour aux documents</button>
        <button onClick={() => window.print()} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF</button>
      </div>

      <div id="print-area" className="bg-white rounded-xl border p-7 max-w-3xl mx-auto" style={{ borderColor: "var(--line)" }}>
        {/* En-tête */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="Entreprise Kibegnon" className="h-14 w-auto" />
            <div>
              <p className="font-bold text-sm" style={{ color: "var(--ink)" }}>ENTREPRISE KIBEGNON</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>Agence immobilière · Cocody, Abidjan</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>entreprisekibegnon.com</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>Abidjan, le {fr(doc.date + "T00:00:00", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
            <p className="text-base font-bold mt-1" style={{ color: cfg.color }}>{doc.ref}</p>
          </div>
        </div>

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
          <h2 className="text-lg font-bold tracking-wide" style={{ color: "var(--ink)" }}>{cfg.title}</h2>
          {doc.object && <p className="text-sm font-semibold mt-1 uppercase">{doc.object}</p>}
          {doc.fields?.periode && <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Période : {doc.fields.periode}</p>}
        </div>

        {/* Bien concerné */}
        {property && (
          <p className="text-xs mb-3 pb-3 border-b" style={{ color: "var(--muted)", borderColor: "var(--line)" }}>
            <strong style={{ color: "var(--ink)" }}>Bien :</strong> {property.name}
            {property.quartier || property.commune ? ` — ${[property.quartier, property.commune].filter(Boolean).join(", ")}` : ""}
            {owner ? ` · Propriétaire : ${owner.name}` : ""}
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
            <p className="text-xs font-semibold pb-10">Visa Client</p>
            <div className="border-t" style={{ borderColor: "var(--ink)" }} />
          </div>
          <div className="text-center" style={{ minWidth: 180 }}>
            <p className="text-xs font-semibold pb-10">Pour l'Agence</p>
            <div className="border-t" style={{ borderColor: "var(--ink)" }} />
            <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>Entreprise Kibegnon</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 mt-4 border-t" style={{ borderColor: "var(--line)" }}>
          <p className="text-[10px]" style={{ color: "var(--muted)" }}>Document établi par {author?.name || "—"} · Entreprise Kibegnon SARL · Cocody, Abidjan</p>
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold print:hidden" style={{ background: st.color + "1A", color: st.color }}>{st.label}</span>
        </div>
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

  const sheet = documents.find((d) => d.id === sheetId);
  if (sheet) {
    return <DocSheet doc={sheet} property={propById[sheet.propertyId]} owner={ownerById[sheet.ownerId]}
      author={memberById[sheet.createdBy]} onBack={() => setSheetId(null)} />;
  }

  const list = documents.filter((d) =>
    (filterType === "all" || d.docType === filterType) &&
    (filterStatus === "all" || d.status === filterStatus) &&
    (!search || d.clientName.toLowerCase().includes(search.toLowerCase()) ||
      (d.ref || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.object || "").toLowerCase().includes(search.toLowerCase())));

  const encaisse = documents.filter((d) => d.status === "regle").reduce((a, d) => a + d.total, 0);
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
        <StatCard icon={Wallet} label="Montants réglés" value={fcfa(encaisse)} tint="#4F9E2A" />
        <StatCard icon={AlertTriangle} label="En attente de règlement" value={attente.length} sub={fcfa(attente.reduce((a, d) => a + d.total, 0))} tint="#EA580C" />
        <StatCard icon={Receipt} label="Brouillons" value={documents.filter((d) => d.status === "brouillon").length} tint="#94A3B8" />
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

      {list.length ? <div className="space-y-2">
        {list.map((d) => {
          const cfg = DOC_TYPES[d.docType]; const st = DOC_STATUS[d.status];
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
                  <span className="text-base font-bold tabular-nums" style={{ color: cfg.color }}>{fcfa(d.total)}</span>
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

      {modal && <DocModal initial={modal} properties={properties} owners={owners}
        onSave={actions.saveDocument} onClose={() => setModal(null)} />}
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
        <button onClick={() => window.print()} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF</button>
      </div>

      <div id="print-area" className="bg-white rounded-xl border p-6 max-w-3xl mx-auto" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-start justify-between gap-4 pb-4 border-b" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="Entreprise Kibegnon" className="h-12 w-auto" />
            <div>
              <p className="font-bold text-sm" style={{ color: "var(--ink)" }}>ENTREPRISE KIBEGNON</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>Agence immobilière · Cocody, Abidjan</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color: "var(--brass)" }}>{quote.ref}</p>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>Fiche de devis artisan</p>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>{fr(quote.date + "T00:00:00", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>

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
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>Devis saisi par {recorder?.name || "—"} · Entreprise Kibegnon</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>Document interne établi d'après le devis original de l'artisan, conservé au dossier du propriétaire.</p>
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: st.color + "1A", color: st.color }}>{st.label}</span>
        </div>
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
   MODULE PATRIMOINE (biens & propriétaires)
   ══════════════════════════════════════════════════════════════════════ */
/* ---------------- Modales ---------------- */
function OwnerModal({ initial, onSave, onClose }) {
  const [f, setF] = useState(() => ({ name: "", kind: "particulier", phone: "", email: "", address: "", idNumber: "", notes: "", active: true, ...initial }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => {
    setBusy(true); const r = await onSave(f); setBusy(false);
    if (r?.error) setErr(r.error); else onClose();
  };
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

function PropertyModal({ initial, owners, onSave, onClose, onNewOwner }) {
  const [f, setF] = useState(() => ({ ref: "", name: "", kind: "immeuble", address: "", commune: "Cocody", quartier: "", ownerId: "", lotsCount: 1, surface: "", rent: "", mandate: "gestion", status: "actif", notes: "", ...initial }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => {
    setBusy(true); const r = await onSave(f); setBusy(false);
    if (r?.error) setErr(r.error); else onClose();
  };
  return (
    <Modal title={f.id ? "Modifier le bien" : "Nouveau bien"} onClose={onClose} wide>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Désignation du bien"><input className={inputCls} style={inputStyle} value={f.name} autoFocus onChange={(e) => set("name", e.target.value)} placeholder="Ex. Immeuble Les Rosiers" /></Field>
        <Field label="Référence interne"><input className={inputCls} style={inputStyle} value={f.ref} onChange={(e) => set("ref", e.target.value)} placeholder="KB-001" /></Field>
        <Field label="Type"><select className={inputCls} style={inputStyle} value={f.kind} onChange={(e) => set("kind", e.target.value)}>{Object.entries(PROPERTY_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Commune"><select className={inputCls} style={inputStyle} value={f.commune} onChange={(e) => set("commune", e.target.value)}>{COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
        <Field label="Quartier"><input className={inputCls} style={inputStyle} value={f.quartier} onChange={(e) => set("quartier", e.target.value)} placeholder="Ex. Angré 8e tranche" /></Field>
        <Field label="Adresse / repère"><input className={inputCls} style={inputStyle} value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>
      </div>
      <Field label="Propriétaire">
        <div className="flex gap-2">
          <select className={inputCls} style={inputStyle} value={f.ownerId || ""} onChange={(e) => set("ownerId", e.target.value)}>
            <option value="">— Non renseigné —</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <button onClick={onNewOwner} className="kb-btn kb-btn-ghost shrink-0" title="Créer un propriétaire"><Plus size={15} /></button>
        </div>
      </Field>
      <div className="grid sm:grid-cols-4 gap-3">
        <Field label="Nombre de lots"><input type="number" min={1} className={inputCls} style={inputStyle} value={f.lotsCount} onChange={(e) => set("lotsCount", e.target.value)} /></Field>
        <Field label="Surface (m²)"><input type="number" min={0} className={inputCls} style={inputStyle} value={f.surface} onChange={(e) => set("surface", e.target.value)} /></Field>
        <Field label="Loyer mensuel (FCFA)"><input type="number" min={0} step={5000} className={inputCls} style={inputStyle} value={f.rent} onChange={(e) => set("rent", e.target.value)} /></Field>
        <Field label="Statut"><select className={inputCls} style={inputStyle} value={f.status} onChange={(e) => set("status", e.target.value)}>{Object.entries(PROPERTY_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
      </div>
      <Field label="Type de mandat"><select className={inputCls} style={inputStyle} value={f.mandate} onChange={(e) => set("mandate", e.target.value)}>{Object.entries(MANDATE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="Notes"><textarea className={inputCls} style={inputStyle} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!f.name.trim() || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> Enregistrer</button></div>
    </Modal>
  );
}

/* ---------------- Fiche détaillée d'un bien ---------------- */
function PropertyDetail({ property, owner, tasks, quotes, releases, releaseLines, products, members, onBack, onEdit }) {
  const pTasks = tasks.filter((t) => t.propertyId === property.id);
  const pQuotes = quotes.filter((q) => q.propertyId === property.id);
  const pReleases = releases.filter((r) => r.propertyId === property.id);
  const productById = Object.fromEntries(products.map((p) => [p.id, p]));
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

  const depQuotes = pQuotes.filter((q) => ["valide", "execute", "paye"].includes(q.status)).reduce((a, q) => a + q.total, 0);
  const consoValue = pReleases.reduce((a, r) => a + releaseLines.filter((l) => l.releaseId === r.id).reduce((s, l) => s + l.qty * l.price, 0), 0);
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
            </div>
            <p className="text-sm mt-1 flex items-center gap-1" style={{ color: "var(--muted)" }}>
              <MapPin size={13} /> {[property.quartier, property.commune].filter(Boolean).join(", ") || "Localisation non renseignée"} · {PROPERTY_KIND[property.kind]} · {property.lotsCount} lot(s)
            </p>
            {owner && <p className="text-sm mt-1 flex items-center gap-1"><UserRound size={13} style={{ color: "var(--brass)" }} /> {owner.name}{owner.phone && <span style={{ color: "var(--muted)" }}> · {owner.phone}</span>}</p>}
          </div>
          <button onClick={() => onEdit(property)} className="kb-btn kb-btn-ghost"><Pencil size={15} /> Modifier</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Wallet} label="Loyer de référence" value={property.rent ? fcfa(property.rent) : "—"} tint="#4F9E2A" />
        <StatCard icon={FileText} label="Dépenses artisans" value={fcfa(depQuotes)} sub={`${pQuotes.length} devis`} tint="var(--brass)" />
        <StatCard icon={SprayCan} label="Produits consommés" value={fcfa(consoValue)} sub={`${pReleases.length} sorties`} tint="#7C3AED" />
        <StatCard icon={ListChecks} label="Tâches ouvertes" value={pTasks.filter((t) => t.status !== "termine").length} sub={`${pTasks.length} au total`} tint="#2E78A8" />
      </div>

      <SectionCard title="Devis artisans rattachés" icon={FileText} pad={false}>
        {pQuotes.length ? <div className="divide-y" style={{ borderColor: "var(--line)" }}>
          {pQuotes.map((q) => <div key={q.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{q.object || q.artisanName}</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>{q.ref} · {q.artisanName}{q.trade ? ` (${q.trade})` : ""} · {fr(q.date + "T00:00:00", { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-semibold">{fcfa(q.total)}</span>
              <Chip color={QUOTE_STATUS[q.status].color}>{QUOTE_STATUS[q.status].label}</Chip>
            </div>
          </div>)}
        </div> : <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>Aucun devis rattaché à ce bien.</p>}
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
              <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
                {lines.map((l) => `${productById[l.productId]?.name || "?"} ×${qty(l.qty)}`).join(" · ") || "Aucun produit"}
              </p>
            </div>;
          })}
        </div> : <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>Aucune sortie enregistrée pour ce bien.</p>}
      </SectionCard>

      <SectionCard title="Tâches liées" icon={ListChecks} pad={false}>
        {pTasks.length ? <div className="divide-y" style={{ borderColor: "var(--line)" }}>
          {pTasks.map((t) => <div key={t.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
            <div className="min-w-0">
              <p className="text-sm truncate">{t.title}</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>{memberById[t.assigneeId]?.name || "—"} · {NATURE[t.nature]?.label || "Autre"}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Chip color={URGENCY[t.urgency].color} bg={URGENCY[t.urgency].bg}>{URGENCY[t.urgency].label}</Chip>
              <Chip color={STATUS[t.status].color}>{STATUS[t.status].label}</Chip>
            </div>
          </div>)}
        </div> : <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>Aucune tâche liée à ce bien.</p>}
      </SectionCard>
    </div>
  );
}

/* ---------------- Vue principale ---------------- */
function Patrimoine({ store, me }) {
  const { owners, properties, tasks, quotes, releases, releaseLines, products, members, actions } = store;
  const [tab, setTab] = useState("biens");
  const [search, setSearch] = useState("");
  const [filterCommune, setFilterCommune] = useState("all");
  const [propModal, setPropModal] = useState(null);
  const [ownerModal, setOwnerModal] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const ownerById = useMemo(() => Object.fromEntries(owners.map((o) => [o.id, o])), [owners]);
  const detail = properties.find((p) => p.id === detailId);
  const sup = canSupervise(me.role);

  if (detail) {
    return <>
      <PropertyDetail property={detail} owner={ownerById[detail.ownerId]} tasks={tasks} quotes={quotes}
        releases={releases} releaseLines={releaseLines} products={products} members={members}
        onBack={() => setDetailId(null)} onEdit={setPropModal} />
      {propModal && <PropertyModal initial={propModal} owners={owners} onSave={actions.saveProperty}
        onClose={() => setPropModal(null)} onNewOwner={() => setOwnerModal({})} />}
      {ownerModal && <OwnerModal initial={ownerModal} onSave={actions.saveOwner} onClose={() => setOwnerModal(null)} />}
    </>;
  }

  const filteredProps = properties.filter((p) =>
    (filterCommune === "all" || p.commune === filterCommune) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.ref || "").toLowerCase().includes(search.toLowerCase()) ||
      (ownerById[p.ownerId]?.name || "").toLowerCase().includes(search.toLowerCase())));
  const filteredOwners = owners.filter((o) => !search || o.name.toLowerCase().includes(search.toLowerCase()) || (o.phone || "").includes(search));

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Patrimoine</h1>
        <button onClick={() => (tab === "biens" ? setPropModal({}) : setOwnerModal({}))} className="kb-btn kb-btn-primary">
          <Plus size={16} /> {tab === "biens" ? "Nouveau bien" : "Nouveau propriétaire"}
        </button>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Les biens et propriétaires servent de dossier central : tâches, devis et consommables s'y rattachent.</p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg border overflow-hidden" style={inputStyle}>
          {[["biens", `Biens (${properties.length})`], ["proprietaires", `Propriétaires (${owners.length})`]].map(([v, l]) =>
            <button key={v} onClick={() => setTab(v)} className="px-3 py-2 text-sm" style={{ background: tab === v ? "var(--ink)" : "#fff", color: tab === v ? "#fff" : "var(--muted)" }}>{l}</button>)}
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
        </div>
        {tab === "biens" && <select value={filterCommune} onChange={(e) => setFilterCommune(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Toutes communes</option>
          {[...new Set(properties.map((p) => p.commune).filter(Boolean))].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>}
      </div>

      {tab === "biens" ? (
        filteredProps.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProps.map((p) => {
            const st = PROPERTY_STATUS[p.status]; const o = ownerById[p.ownerId];
            const nQuotes = quotes.filter((q) => q.propertyId === p.id).length;
            const nOpen = tasks.filter((t) => t.propertyId === p.id && t.status !== "termine").length;
            return (
              <button key={p.id} onClick={() => setDetailId(p.id)} className="bg-white rounded-xl border p-3 text-left hover:shadow-md transition-shadow" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: st.color + "1A", color: st.color }}><Building2 size={17} /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-[11px] truncate" style={{ color: "var(--muted)" }}>{PROPERTY_KIND[p.kind]} · {p.commune || "—"}</p>
                    </div>
                  </div>
                  <Chip color={st.color} dot>{st.label}</Chip>
                </div>
                <p className="text-xs mt-2.5 truncate" style={{ color: "var(--muted)" }}><UserRound size={11} className="inline mb-0.5" /> {o?.name || "Propriétaire non renseigné"}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {p.rent ? <Chip color="#4F9E2A">{fcfa(p.rent)}/mois</Chip> : null}
                  {nQuotes > 0 && <Chip color="var(--brass)">{nQuotes} devis</Chip>}
                  {nOpen > 0 && <Chip color="#2E78A8">{nOpen} tâche(s)</Chip>}
                </div>
              </button>
            );
          })}
        </div> : <EmptyState icon={Building2} title="Aucun bien enregistré" sub="Commencez par ajouter un immeuble, une villa ou un local."
          action={<button onClick={() => setPropModal({})} className="kb-btn kb-btn-primary"><Plus size={15} /> Nouveau bien</button>} />
      ) : (
        filteredOwners.length ? <div className="bg-white rounded-xl border" style={{ borderColor: "var(--line)" }}>
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>
            {filteredOwners.map((o) => {
              const nProps = properties.filter((p) => p.ownerId === o.id).length;
              return <div key={o.id} className="flex items-center justify-between px-4 py-3 gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: "#2E78A8" }}><UserRound size={16} /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{o.name}</p>
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
          action={<button onClick={() => setOwnerModal({})} className="kb-btn kb-btn-primary"><Plus size={15} /> Nouveau propriétaire</button>} />
      )}

      {propModal && <PropertyModal initial={propModal} owners={owners} onSave={actions.saveProperty}
        onClose={() => setPropModal(null)} onNewOwner={() => setOwnerModal({})} />}
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
function ReleaseModal({ initial, initialLines, products, properties, onSave, onClose }) {
  const [f, setF] = useState(() => ({ propertyId: "", releasedTo: "", purpose: "nettoyage", date: isoDate(new Date()), zone: "", notes: "", ...initial }));
  const [lines, setLines] = useState(() => initialLines?.length ? initialLines : [{ productId: "", qty: 1, price: 0 }]);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setLine = (i, k, v) => setLines((p) => p.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
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
      <button onClick={() => setLines((p) => [...p, { productId: "", qty: 1, price: 0 }])} className="kb-btn kb-btn-ghost text-sm mb-3"><Plus size={14} /> Ajouter un produit</button>

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
        <StatCard icon={ClipboardList} label="Fiches de sortie" value={releases.length} sub={`${recentReleases.length} sur ${months} mois`} tint="var(--brass)" />
        <StatCard icon={TrendingDown} label="Consommé (période)" value={fcfa(recentLines.reduce((a, l) => a + l.qty * l.price, 0))} tint="#7C3AED" />
        <StatCard icon={AlertTriangle} label="Alertes de stock" value={lowStock.length} tint="#D81F26" />
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
        onSave={actions.saveRelease} onClose={() => setRelModal(null)} />}
    </div>
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
    dueDate: "", ...initial,
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
        <Field label="Assignée à">
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
            <Field label="Jour planifié">
              <select className={inputCls} style={inputStyle} value={f.day ?? ""} onChange={(e) => set("day", e.target.value === "" ? null : Number(e.target.value))}>
                <option value="">Non planifié</option>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </Field>
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
function TaskRow({ task, property, assignee, actualSec, isRunning, canTrack, onEdit, onToggleTimer, onAdvance, onShare }) {
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
                {fmtEst(task.estMin)} · <span style={{ color: overEst ? "#D81F26" : "var(--muted)", fontWeight: overEst ? 600 : 400 }}>{fmtDur(actualSec)}</span>
                {task.dueDate && ` · échéance ${fr(task.dueDate + "T00:00:00", { day: "numeric", month: "short" })}`}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onShare && <button onClick={() => onShare(task)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Envoyer"><Send size={13} /></button>}
              <button onClick={() => onEdit(task)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Modifier"><Pencil size={13} /></button>
              {canTrack && !done && <button onClick={() => onToggleTimer(task)} title={isRunning ? "Arrêter" : "Démarrer"} className="p-1.5 rounded-lg text-white" style={{ background: isRunning ? "#D81F26" : "var(--live)" }}>{isRunning ? <Square size={13} /> : <Play size={13} />}</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Vue principale ---------------- */
function Taches({ store, me, userId, liveSecForTask, isRunning, toggleTimer, advanceStatus, onShare, onEdit, onNew }) {
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

  const base = tasks.filter((t) => (scope === "all" || t.assigneeId === userId));
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
            onEdit={onEdit} onToggleTimer={toggleTimer} onAdvance={advanceStatus} onShare={onShare} />)}
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
                    onEdit={onEdit} onToggleTimer={toggleTimer} onAdvance={advanceStatus} onShare={onShare} />)}
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
   APPLICATION (Root + Workspace + vues restantes)
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
button{cursor:pointer}
@media print{
  body{background:#fff}
  header,nav,.print\\:hidden{display:none!important}
  main{padding:0!important;max-width:100%!important}
  #print-area{border:none!important;box-shadow:none!important;padding:0!important;max-width:100%!important}
  @page{margin:14mm}
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
    owners, properties, products, releases, releaseLines, quotes, actions } = store;

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
  const sendDraft = () => { if (!activeChannel) return; actions.sendMessage(activeChannel, msgDraft, attachTaskId || null); setMsgDraft(""); setAttachTaskId(""); };
  const doShare = async ({ dest, note, reassign }) => {
    const text = note || "Je vous partage cette tâche.";
    if (dest === "group") await actions.sendMessage(GENERAL_CHANNEL_ID, text, shareTask.id);
    else { const cid = await actions.ensureDm(dest); if (cid) await actions.sendMessage(cid, text, shareTask.id); if (reassign) await actions.updateTask(shareTask.id, { assigneeId: dest }); }
    setShareTask(null);
  };
  const unreadTotal = useMemo(() => {
    const dmIds = channels.filter((c) => c.type === "dm" && channelMembers.some((cm) => cm.channelId === c.id && cm.userId === userId)).map((c) => c.id);
    return [GENERAL_CHANNEL_ID, ...dmIds].filter((ch) => hasUnread(ch)).length;
  }, [channels, channelMembers, messages, userId]);

  if (loading || !me) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}><p style={{ color: "var(--muted)" }}>Chargement de votre espace…</p></div>;

  const NAV = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "board", label: "Tâches", icon: ListChecks },
    { id: "planner", label: "Planning", icon: CalendarDays },
    { id: "patrimoine", label: "Patrimoine", icon: Building2 },
    { id: "devis", label: "Devis artisans", icon: FileText },
    { id: "documents", label: "Documents", icon: FileSignature },
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
            {myTimer && <button onClick={actions.stopTimer} className="hidden sm:flex items-center gap-2 rounded-full pl-3 pr-2 py-1.5 text-sm font-medium" style={{ background: "var(--live)" }}><span className="w-2 h-2 rounded-full bg-white animate-pulse" />{fmtDur((now - myTimer.startedAt) / 1000)}<span className="bg-white/25 rounded-full p-0.5"><Square size={12} /></span></button>}
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

      {myTimer && <button onClick={actions.stopTimer} className="sm:hidden w-full flex items-center justify-center gap-2 py-2 text-white text-sm font-medium" style={{ background: "var(--live)" }}><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> En cours · {fmtDur((now - myTimer.startedAt) / 1000)} — toucher pour arrêter</button>}

      <main className="max-w-6xl mx-auto px-4 py-5">
        {view === "dashboard" && Dashboard()}
        {view === "planner" && Planner()}
        {view === "board" && (
          <Taches store={store} me={me} userId={userId}
            liveSecForTask={liveSecForTask} isRunning={isRunning}
            toggleTimer={toggleTimer} advanceStatus={advanceStatus}
            onShare={setShareTask} onEdit={setTaskModal}
            onNew={() => setTaskModal({ prefill: { assigneeId: userId, weekStart: viewWeek } })} />
        )}
        {view === "patrimoine" && <Patrimoine store={store} me={me} />}
        {view === "devis" && <Devis store={store} me={me} />}
        {view === "documents" && <Documents store={store} me={me} />}
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
    const myTasks = tasks.filter((t) => t.assigneeId === userId);
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
        {runningTask && <div className="rounded-xl p-4 mb-4 text-white flex items-center justify-between" style={{ background: "linear-gradient(100deg,#3d7d20,#4F9E2A)" }}><div className="min-w-0"><p className="text-xs opacity-90 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Chrono en cours</p><p className="font-medium truncate">{runningTask.title}</p></div><div className="flex items-center gap-3"><span className="text-2xl font-bold tabular-nums">{fmtDur((now - myTimer.startedAt) / 1000)}</span><button onClick={actions.stopTimer} className="bg-white/20 hover:bg-white/30 rounded-lg p-2"><Square size={18} /></button></div></div>}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <StatCard icon={ListChecks} label="Mes tâches ouvertes" value={myOpen.length} sub={`${myTasks.length} au total`} tint="#2E78A8" />
          <StatCard icon={Clock} label="Temps suivi aujourd'hui" value={fmtDur(todaySec)} tint="#4F9E2A" />
          <StatCard icon={BarChart3} label="Temps suivi cette semaine" value={fmtDur(weekSec)} tint="var(--brass)" />
          <StatCard icon={AlertTriangle} label="Tâches urgentes" value={myOpen.filter((t) => t.urgency === "urgente" || t.urgency === "haute").length} tint="#D81F26" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard icon={Building2} label="Biens gérés" value={properties.length} sub={`${owners.length} propriétaire(s)`} tint="#2E78A8" />
          <StatCard icon={FileText} label="Devis en attente" value={quotes.filter((q) => ["recu", "en_validation"].includes(q.status)).length} sub={fcfa(quotes.filter((q) => ["recu", "en_validation"].includes(q.status)).reduce((a, q) => a + q.total, 0))} tint="#EA580C" />
          <StatCard icon={Wallet} label="Dépenses engagées" value={fcfa(quotes.filter((q) => ["valide", "execute", "paye"].includes(q.status)).reduce((a, q) => a + q.total, 0))} tint="#4F9E2A" />
          <StatCard icon={SprayCan} label="Alertes de stock" value={products.filter((p) => p.active && p.stock <= p.minQty).length} sub={`${products.length} produits`} tint="#7C3AED" />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <section className="bg-white rounded-xl border p-4" style={{ borderColor: "var(--line)" }}>
            <h2 className="font-semibold mb-3 flex items-center gap-2"><CalendarDays size={16} style={{ color: "var(--brass)" }} /> Mes prochaines tâches</h2>
            <div className="space-y-2">{myOpen.slice(0, 5).map((t) => <TaskRow key={t.id} task={t} property={propById[t.propertyId]} assignee={memberById[t.assigneeId]} actualSec={liveSecForTask(t.id)} isRunning={isRunning(t.id)} canTrack onEdit={setTaskModal} onToggleTimer={toggleTimer} onAdvance={advanceStatus} onShare={setShareTask} />)}{myOpen.length === 0 && <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>Aucune tâche en attente.</p>}</div>
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
                <div className="p-2 space-y-2 min-h-[60px]">{dts.map((t) => <TaskRow key={t.id} task={t} property={propById[t.propertyId]} assignee={memberById[t.assigneeId]} actualSec={liveSecForTask(t.id)} isRunning={isRunning(t.id)} canTrack={who === userId} onEdit={setTaskModal} onToggleTimer={toggleTimer} onAdvance={advanceStatus} onShare={setShareTask} />)}{dts.length === 0 && <p className="text-xs text-center py-3" style={{ color: "#B6BEC9" }}>—</p>}</div>
              </div>
            );
          })}
        </div>
        {unplanned.length > 0 && <div className="mt-4 bg-white rounded-xl border p-3" style={{ borderColor: "var(--line)" }}><p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><AlertTriangle size={14} style={{ color: "#EA580C" }} /> À planifier cette semaine</p><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{unplanned.map((t) => <TaskRow key={t.id} task={t} property={propById[t.propertyId]} assignee={memberById[t.assigneeId]} actualSec={liveSecForTask(t.id)} isRunning={isRunning(t.id)} canTrack={who === userId} onEdit={setTaskModal} onToggleTimer={toggleTimer} onAdvance={advanceStatus} onShare={setShareTask} />)}</div></div>}
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
                  {refTask && <div className="mt-2 rounded-lg p-2 text-left" style={{ background: mine ? "rgba(255,255,255,.15)" : "#fff", border: mine ? "none" : "1px solid var(--line)" }}><p className="text-[11px] flex items-center gap-1 mb-0.5" style={{ color: mine ? "rgba(255,255,255,.85)" : "var(--muted)" }}><ListChecks size={11} /> Tâche partagée</p><p className="text-sm font-medium" style={{ color: mine ? "#fff" : "var(--ink)" }}>{refTask.title}</p><p className="text-[11px] mt-0.5" style={{ color: mine ? "rgba(255,255,255,.85)" : "var(--muted)" }}>{URGENCY[refTask.urgency].label} · {STATUS[refTask.status].label}</p></div>}
                </div>
                <span className="text-[10px] mt-0.5 px-1" style={{ color: "var(--muted)" }}>{fmtTime(m.createdAt)}</span>
              </div>
            </div>
          ); })}
          {channelMessages(current.chId).length === 0 && <p className="text-sm text-center py-10" style={{ color: "var(--muted)" }}>Aucun message. Écrivez le premier.</p>}
        </div>
        {attachTaskId && <div className="px-3 pt-2 flex items-center gap-2"><Chip color="var(--brass)" bg="#FDEAEA"><ListChecks size={11} /> {tasks.find((t) => t.id === attachTaskId)?.title?.slice(0, 40)}</Chip><button onClick={() => setAttachTaskId("")} className="text-slate-400"><X size={14} /></button></div>}
        <div className="p-2.5 border-t flex items-center gap-2" style={{ borderColor: "var(--line)" }}>
          <select value={attachTaskId} onChange={(e) => setAttachTaskId(e.target.value)} className="text-xs px-2 py-2 rounded-lg border bg-white shrink-0" style={{ ...inputStyle, width: 46 }} title="Joindre une tâche"><option value="">📎</option>{myTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
          <input value={msgDraft} onChange={(e) => setMsgDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDraft(); } }} placeholder="Écrire un message…" className="flex-1 px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
          <button onClick={sendDraft} disabled={!msgDraft.trim() && !attachTaskId} className="kb-btn kb-btn-primary disabled:opacity-40 px-3"><Send size={16} /></button>
        </div>
      </div>
    );

    return (
      <div>
        <h1 className="text-xl font-bold mb-1">Messagerie d'équipe</h1>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Échangez en privé, en groupe, et partagez des tâches en un geste.</p>
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
