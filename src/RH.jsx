/* ============================================================================
 *  ENTREPRISE KIBEGNON · SUIVI D'ÉQUIPE — MODULE RESSOURCES HUMAINES
 *  Lot 1 : paramètres légaux, grille catégorielle, salariés, contrats,
 *          avenants, documents RH, registre d'employeur, journal d'audit.
 *
 *  Chargé à la demande (seulement à l'ouverture de l'onglet RH) depuis App.jsx.
 *  Les données RH ne passent JAMAIS par le chargement global de l'application :
 *  elles sont lues ici, et la base ne renvoie que ce que le compte a le droit
 *  de voir (règles d'accès de la migration v32).
 *
 *  Règle fondatrice : aucune valeur légale écrite en dur dans les calculs.
 *  Tout taux, seuil ou durée est lu dans hr_legal_params, à la date de référence.
 * ==========================================================================*/
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  AlertTriangle, ArrowLeft, Briefcase, Building2, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, ClipboardList,
  DoorOpen, Eye, FileSignature, FileText, FolderOpen, Gavel, HeartPulse, History, Landmark, Layers, Pencil, Plus, Printer, Scale, Search,
  ShieldAlert, ShieldCheck, Trash2, Upload, UserPlus, UserRound, Users, Wallet, X,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { supabase } from "./supabaseClient";
import {
  Modal, Field, Chip, StatCard, SectionCard, EmptyState, PrintPage, PrintHead, printSheet,
  fcfa, inputCls, inputStyle, AGENCY, amountInWords, LetterEditor,
} from "./App.jsx";

/* ══════════════════════════════════════════════════════════════════════
   1. LIBELLÉS
   ══════════════════════════════════════════════════════════════════════ */
export const QUALIFICATIONS = {
  horaire_journalier: "Payé à l'heure ou à la journée",
  employe_mensuel:    "Employé payé au mois",
  maitrise:           "Agent de maîtrise, technicien et assimilé",
  cadre:              "Ingénieur, cadre, technicien supérieur",
  cadre_superieur:    "Cadre supérieur",
};
export const MODES_PAIEMENT = { heure: "À l'heure", journee: "À la journée", semaine: "À la semaine", quinzaine: "À la quinzaine", mois: "Au mois" };
export const CONTRACT_TYPES = { CDI: "CDI", CDD: "CDD", stage: "Convention de stage", apprentissage: "Contrat d'apprentissage", temporaire: "Travail temporaire" };
const CONTRACT_STATUS = { brouillon: { label: "Brouillon", color: "#94A3B8" }, actif: { label: "En cours", color: "#4F9E2A" }, termine: { label: "Terminé", color: "#64748B" }, annule: { label: "Annulé", color: "#D81F26" } };
const EMP_STATUS = { actif: { label: "Actif", color: "#4F9E2A" }, suspendu: { label: "Suspendu", color: "#C58A1B" }, sorti: { label: "Sorti", color: "#94A3B8" } };
const SITUATIONS = { celibataire: "Célibataire", marie: "Marié(e)", divorce: "Divorcé(e)", veuf: "Veuf / veuve" };
export const HR_DOC_CATEGORIES = {
  contrat: "Contrat signé", avenant: "Avenant signé", piece_identite: "Pièce d'identité", diplome: "Diplôme / CV",
  cnps: "CNPS / CMU", visite_medicale: "Visite médicale", titre_sejour: "Titre de séjour / permis",
  reglement_interieur: "Règlement intérieur", declaration: "Déclaration (inspection, CNPS…)",
  accuse_reception: "Accusé de réception", attestation: "Attestation", certificat: "Certificat de travail",
  courrier: "Courrier RH", stage: "Stage (convention, attestation)", autre: "Autre",
};
const PARAM_CATEGORIES = {
  general: "Général", its: "Impôt sur les traitements et salaires (ITS)", cnps: "Cotisations CNPS", cmu: "Couverture maladie universelle (CMU)",
  fdfp: "Formation (FDFP)", temps: "Durée du travail et heures supplémentaires", conges: "Congés payés",
  permissions: "Permissions et absences exceptionnelles", contrat: "Contrat : essai et préavis", rupture: "Fin de contrat",
  primes: "Primes et indemnités conventionnelles", obligations: "Obligations déclaratives",
};
const VISA_NATURE = { visa: "Visa", mise_en_demeure: "Mise en demeure", observation: "Observation" };
const TABLE_LABELS = { hr_legal_params: "Paramètre légal", hr_salary_scale: "Grille catégorielle", hr_employees: "Salarié", hr_employee_details: "Données personnelles",
  hr_contracts: "Contrat", hr_contract_amendments: "Avenant", hr_documents: "Document", hr_registry_visas: "Registre — fascicule 3",
  hr_doc_templates: "Modèle de document", hr_company_settings: "Réglages des documents", hr_holidays: "Jour férié", hr_absences: "Absence", hr_leave_adjustments: "Ajustement de congés",
  hr_pay_elements: "Élément de paie", hr_pay_periods: "Paie du mois", hr_payslips: "Bulletin de paie", hr_terminations: "Fin de contrat", hr_job_openings: "Poste à pourvoir",
  hr_candidates: "Candidat", hr_disciplinary: "Procédure disciplinaire", hr_medical_visits: "Visite médicale", hr_work_accidents: "Accident du travail", hr_trainings: "Formation",
  hr_company_events: "Déclaration d'événement", hr_access: "Accès au module RH" };

/* ══════════════════════════════════════════════════════════════════════
   2. DATES (calculs en jours calendaires, sans dérive de fuseau horaire)
   ══════════════════════════════════════════════════════════════════════ */
const pad = (n) => String(n).padStart(2, "0");
const D = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const S = (dt) => dt.toISOString().slice(0, 10);
export const todayIso = () => { const t = new Date(); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`; };
export const plusJours = (iso, n) => { const x = D(iso); x.setUTCDate(x.getUTCDate() + n); return S(x); };
export const plusMois = (iso, n) => {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const dernier = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, dernier));
  return S(t);
};
export const addPeriod = (iso, n, unite) => (unite === "mois" ? plusMois(iso, n) : plusJours(iso, n));
export const ecartJours = (a, b) => Math.round((D(b) - D(a)) / 86400000);       // b − a, en jours
export const fmt = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "—");
const enJours = (n, unite) => (unite === "mois" ? n * 30 : n);
const libDuree = (n, unite) => `${n} ${unite === "mois" ? "mois" : n > 1 ? "jours" : "jour"}`;
/* Ancienneté en mois révolus, à compter de la date d'embauche (essai compris — décret 2024-900, art. 8) */
export function ancienneteMois(debut, ref) {
  if (!debut || !ref) return 0;
  const [y1, m1, d1] = debut.split("-").map(Number); const [y2, m2, d2] = ref.split("-").map(Number);
  return Math.max(0, (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0));
}
export const libAnciennete = (mois) => { const a = Math.floor(mois / 12), m = mois % 12;
  return [a ? `${a} an${a > 1 ? "s" : ""}` : "", m ? `${m} mois` : ""].filter(Boolean).join(" et ") || "moins d'un mois"; };

/* ══════════════════════════════════════════════════════════════════════
   3. MOTEUR DE PARAMÈTRES — le paramètre en vigueur À LA DATE de référence
   ══════════════════════════════════════════════════════════════════════ */
export function resolveParam(params, code, date) {
  return (params || []).filter((p) => p.code === code && p.dateEffet <= date && (!p.dateFin || p.dateFin >= date))
    .sort((a, b) => (a.dateEffet < b.dateEffet ? 1 : -1))[0] || null;
}
export const pval = (params, code, date) => resolveParam(params, code, date)?.valeur ?? null;

/* Durée maximale d'essai pour une qualification (décret 2024-900, art. 4) */
export function essaiMax(params, qualification, date) {
  return (pval(params, "PERIODE_ESSAI", date)?.durees || []).find((r) => r.qualification === qualification) || null;
}
/* Délai de prévenance du renouvellement (art. 5). Pour une durée d'essai qui
   ne figure pas au tableau, on retient le délai le plus prudent : celui de la
   première durée réglementaire égale ou supérieure. */
export function essaiPrevenance(params, duree, unite, date) {
  const rows = [...(pval(params, "PERIODE_ESSAI", date)?.durees || [])].sort((a, b) => enJours(a.duree, a.unite) - enJours(b.duree, b.unite));
  if (!rows.length) return null;
  const j = enJours(duree, unite);
  const r = rows.find((x) => enJours(x.duree, x.unite) >= j) || rows[rows.length - 1];
  return { n: r.prevenance, unite: r.prevenance_unite };
}
/* État de la période d'essai à une date donnée */
export function essaiStatus(contract, params, today) {
  if (!contract || contract.type === "stage" || !contract.essaiDuree) return { applicable: false, etat: "sans_objet" };
  const { dateDebut: debut, essaiDuree: n, essaiUnite: u } = contract;
  const finInitiale = plusJours(addPeriod(debut, n, u), -1);
  const prev = essaiPrevenance(params, n, u, debut);
  const limite = prev ? (prev.unite === "mois" ? plusMois(finInitiale, -prev.n) : plusJours(finInitiale, -prev.n)) : null;
  const finRenouvelee = plusJours(addPeriod(plusJours(finInitiale, 1), n, u), -1);
  const notifie = contract.essaiRenouvellementNotifieLe || "";
  const renouvellementValide = !!contract.essaiRenouvele && (!!contract.essaiConsentementSalarie || (!!notifie && !!limite && notifie <= limite));
  const finEffective = renouvellementValide ? finRenouvelee : finInitiale;
  const base = { applicable: true, finInitiale, limite, prevenance: prev, finRenouvelee, finEffective, renouvellementValide,
    joursAvantLimite: limite ? ecartJours(today, limite) : null, joursAvantFin: ecartJours(today, finEffective) };
  if (contract.essaiRenouvele && !renouvellementValide && today <= finRenouvelee)
    return { ...base, etat: "renouvellement_inoperant" };
  if (today > finEffective) return { ...base, etat: "termine" };
  if (renouvellementValide) return { ...base, etat: "renouvele" };
  if (limite && today > limite) return { ...base, etat: "limite_depassee" };
  return { ...base, etat: "en_cours" };
}
/* Préavis (décret 96-200 ; CCI art. 34) selon la catégorie, le mode de paiement et l'ancienneté */
export function preavisPour(params, contract, details, ancMois, date) {
  const v = pval(params, "PREAVIS", date);
  if (!v || !contract) return null;
  const groupe = Number(contract.categorie) >= 6 ? "categorie_3" : contract.modePaiement === "mois" ? "categorie_2" : "categorie_1";
  const ligne = (v[groupe] || []).find((r) => r.jusqu_mois === null || r.jusqu_mois === undefined || ancMois < r.jusqu_mois);
  if (!ligne) return null;
  let duree = ligne.duree; let note = "";
  if (details?.ippPlus40 && v.ipp_plus_40 && ancMois >= v.ipp_plus_40.apres_mois) { duree *= v.ipp_plus_40.multiplicateur; note = "doublé (incapacité permanente partielle > 40 %)"; }
  return { duree, unite: ligne.unite, groupe, libelle: libDuree(duree, ligne.unite), note };
}
/* Salaire minimum de la catégorie à une date (null si la grille ne le renseigne pas) */
export function minimumCategoriel(scale, categorie, echelon, date) {
  const rows = (scale || []).filter((r) => Number(r.categorie) === Number(categorie) && r.dateEffet <= date && (!r.dateFin || r.dateFin >= date));
  const r = rows.find((x) => (x.echelon || "") === (echelon || "")) || rows.find((x) => !(x.echelon || ""));
  return r && r.salaireMinimum !== null && r.salaireMinimum !== undefined ? Number(r.salaireMinimum) : null;
}
/* Rémunération mensuelle convenue = rubrique 100 (salaire catégoriel) + rubrique 200 (sursalaire) */
export const remunerationMensuelle = (c) => (Number(c?.salaireBase) || 0) + (Number(c?.sursalaire) || 0);
/* Plancher du salaire catégoriel : le minimum de la catégorie, ou — pour un travailleur
   physiquement diminué, avec accord écrit (CCI art. 50) — ce minimum réduit de l'écart maximal paramétré */
export function plancherCategoriel(params, minCat, contract, date) {
  if (minCat === null || minCat === undefined) return null;
  if (!contract?.clauses?.salaire_diminue) return minCat;
  const ecart = pval(params, "SALAIRE_DIMINUE", date)?.ecart_max_pct;
  return ecart === null || ecart === undefined ? minCat : Math.round(minCat * (1 - ecart / 100));
}
/* Salaire minimum légal pour l'horaire du contrat (SMIG proratisé à l'horaire) */
export function smigProrata(params, horaire, date) {
  const smig = pval(params, "SMIG_MENSUEL", date)?.montant; const legal = pval(params, "HORAIRE_LEGAL_HEBDO", date)?.heures;
  if (!smig || !legal) return null;
  return Math.round(smig * Math.min(1, (Number(horaire) || legal) / legal));
}

/* ══════════════════════════════════════════════════════════════════════
   4. ALERTES — calculées à partir des données, jamais saisies
   ══════════════════════════════════════════════════════════════════════ */
/* Durée cumulée de contrats successifs (bornes incluses) comparée à un maximum en mois */
export function dureeCumuleeDepasse(contrats, maxMois) {
  const cs = contrats.filter((x) => x.dateDebut && x.dateFin && x.dateFin >= x.dateDebut);
  if (!cs.length) return false;
  const premier = cs.map((x) => x.dateDebut).sort()[0];
  const jours = cs.reduce((t, x) => t + ecartJours(x.dateDebut, x.dateFin) + 1, 0);
  return jours > ecartJours(premier, plusMois(premier, maxMois));
}
export function computeAlerts({ employees, details, contracts, documents, params, scale }, today) {
  const A = []; const push = (a) => A.push({ id: `${a.code}-${a.employeeId || "ent"}-${A.length}`, ...a });
  const detOf = (id) => details.find((d) => d.employeeId === id);
  for (const e of employees.filter((x) => x.statut === "actif")) {
    const nom = `${e.nom} ${e.prenoms}`.trim();
    const c = contracts.find((x) => x.employeeId === e.id && x.statut === "actif");
    if (!c) { push({ code: "sans_contrat", niveau: "rouge", employeeId: e.id, titre: `${nom} : aucun contrat en cours`, detail: "Salarié actif sans contrat enregistré." }); continue; }
    if (!(detOf(e.id)?.cnpsNumero || "").trim() && c.type !== "stage")
      push({ code: "sans_cnps", niveau: "orange", employeeId: e.id, titre: `${nom} : numéro CNPS non renseigné`, detail: "Déclaration à la CNPS dans les délais prescrits (Code du Travail, art. 92.2)." });
    const es = essaiStatus(c, params, today);
    if (es.etat === "renouvellement_inoperant")
      push({ code: "essai_inoperant", niveau: "rouge", employeeId: e.id, titre: `${nom} : renouvellement d'essai inopérant`,
        detail: `Notifié hors délai (limite : ${fmt(es.limite)}) sans consentement écrit du salarié : l'essai a pris fin le ${fmt(es.finInitiale)} et l'engagement est définitif (décret 2024-900, art. 6).` });
    if (es.etat === "en_cours" && es.joursAvantLimite !== null && es.joursAvantLimite <= 7)
      push({ code: "essai_limite", niveau: es.joursAvantLimite <= 2 ? "rouge" : "orange", employeeId: e.id,
        titre: `${nom} : renouvellement de l'essai à notifier avant le ${fmt(es.limite)}`,
        detail: `${es.joursAvantLimite === 0 ? "Dernier jour" : `J-${es.joursAvantLimite}`}. Passé cette date, l'essai ne peut plus être renouvelé et prend fin le ${fmt(es.finInitiale)} (décret 2024-900, art. 5 et 6).` });
    if (es.etat === "limite_depassee")
      push({ code: "essai_limite_depassee", niveau: "orange", employeeId: e.id, titre: `${nom} : délai de renouvellement de l'essai dépassé`,
        detail: `L'essai prend fin le ${fmt(es.finInitiale)} ; maintenu en service au-delà, le salarié est définitivement engagé.` });
    if (["en_cours", "renouvele", "limite_depassee"].includes(es.etat) && es.joursAvantFin <= 7)
      push({ code: "essai_fin", niveau: "orange", employeeId: e.id, titre: `${nom} : fin de la période d'essai le ${fmt(es.finEffective)}`,
        detail: "Confirmer l'engagement ou notifier la rupture avant cette date." });
    if (c.type === "CDD" && c.dateFin) {
      const j = ecartJours(today, c.dateFin);
      if (j < 0) push({ code: "cdd_echu", niveau: "rouge", employeeId: e.id, titre: `${nom} : CDD échu le ${fmt(c.dateFin)} et toujours en cours`, detail: "Risque de requalification en contrat à durée indéterminée." });
      else if (j <= 30) push({ code: "cdd_fin", niveau: "orange", employeeId: e.id, titre: `${nom} : fin du CDD le ${fmt(c.dateFin)} (J-${j})`, detail: "Décider : renouvellement, CDI ou fin de contrat." });
      const regles = pval(params, "CDD_REGLES", today);
      if (regles && dureeCumuleeDepasse(contracts.filter((x) => x.employeeId === e.id && x.type === "CDD" && x.statut !== "annule"), regles.duree_max_mois))
        push({ code: "cdd_duree_max", niveau: "rouge", employeeId: e.id, titre: `${nom} : CDD au-delà de ${regles.duree_max_mois} mois`,
          detail: "La durée totale des CDD, renouvellements compris, dépasse le maximum légal : risque de requalification en CDI (Code du travail, art. 15.4 et 15.10)." });
    }
    if (c.type === "stage") {
      const regles = pval(params, "STAGE_QUALIFICATION", today);
      if (!c.dateFin) push({ code: "stage_sans_terme", niveau: "orange", employeeId: e.id, titre: `${nom} : stage sans date de fin`, detail: "La convention de stage doit fixer sa durée (Code du travail, art. 13.14 et 13.15)." });
      else {
        const j = ecartJours(today, c.dateFin);
        if (j < 0) push({ code: "stage_echu", niveau: "rouge", employeeId: e.id, titre: `${nom} : stage terminé le ${fmt(c.dateFin)} et toujours en cours`,
          detail: "Au-delà du terme, la relation risque d'être requalifiée en contrat de travail. Délivrez l'attestation de stage ou concluez un contrat." });
        else if (j <= 30) push({ code: "stage_fin", niveau: "orange", employeeId: e.id, titre: `${nom} : fin du stage le ${fmt(c.dateFin)} (J-${j})`,
          detail: "Préparer l'attestation de stage (qualification, objet, durée — art. 13.19) et décider de la suite." });
        if (regles && dureeCumuleeDepasse(contracts.filter((x) => x.employeeId === e.id && x.type === "stage" && x.statut !== "annule"), regles.duree_max_mois))
          push({ code: "stage_duree", niveau: "rouge", employeeId: e.id, titre: `${nom} : stage de plus de ${regles.duree_max_mois} mois`,
            detail: "La durée du stage, renouvellements compris, dépasse le maximum légal (Code du travail, art. 13.14)." });
      }
    }
    const minCat = minimumCategoriel(scale, c.categorie, c.echelon, today);
    const plancher = plancherCategoriel(params, minCat, c, today);
    if (c.type === "stage") { /* stagiaire : indemnité forfaitaire, pas de minimum catégoriel */ }
    else if (minCat === null) push({ code: "cat_sans_minimum", niveau: "orange", employeeId: e.id, titre: `${nom} : catégorie ${c.categorie}${c.echelon ? ` (${c.echelon})` : ""} sans salaire minimum dans la grille`,
      detail: "Prime d'ancienneté, gratification et contrôle du salaire restent inactifs tant que la grille n'est pas renseignée." });
    else if (c.type !== "stage" && Number(c.salaireBase) < plancher)
      push({ code: "sous_minimum", niveau: "rouge", employeeId: e.id, titre: `${nom} : salaire catégoriel inférieur au minimum de la catégorie`,
        detail: `Rubrique 100 : ${fcfa(c.salaireBase)} pour un minimum de ${fcfa(plancher)}${c.clauses?.salaire_diminue ? " (travailleur physiquement diminué, CCI art. 50)" : ""}. À porter au minimum par avenant ; le sursalaire n'est jamais réduit automatiquement.` });
    else if (c.type !== "stage" && !Number(c.sursalaire) && Number(c.salaireBase) > minCat)
      push({ code: "repartition", niveau: "info", employeeId: e.id, titre: `${nom} : répartition salaire catégoriel / sursalaire à vérifier`,
        detail: `Salaire catégoriel saisi : ${fcfa(c.salaireBase)} pour un minimum de ${fcfa(minCat)}, sans sursalaire. Si le montant saisi est le salaire global, corrigez le contrat : rubrique 100 = minimum de la catégorie, le complément en sursalaire.` });
    const smig = smigProrata(params, c.horaireHebdo, today);
    const total = remunerationMensuelle(c);
    if (smig && c.type !== "stage" && total < smig)
      push({ code: "sous_smig", niveau: "rouge", employeeId: e.id, titre: `${nom} : rémunération inférieure au SMIG`, detail: `${fcfa(total)} pour ${c.horaireHebdo} h/semaine ; minimum légal : ${fcfa(smig)}.` });
  }
  const regCdd = pval(params, "CDD_REGLES", today);
  const salaries = employees.filter((e) => e.statut === "actif").map((e) => contracts.find((x) => x.employeeId === e.id && x.statut === "actif")).filter((x) => x && x.type !== "stage");
  const nbCdd = salaries.filter((x) => x.type === "CDD").length;
  if (regCdd && salaries.length && nbCdd > salaries.length * regCdd.proportion_max_effectif)
    push({ code: "cdd_proportion", niveau: "orange", titre: `${nbCdd} CDD pour ${salaries.length} salariés`,
      detail: "Les salariés en CDD occupant un emploi permanent ne peuvent dépasser le tiers de l'effectif (Code du travail, art. 15.1)." });
  if (!documents.some((d) => d.categorie === "reglement_interieur"))
    push({ code: "sans_reglement", niveau: "orange", titre: "Aucun règlement intérieur enregistré", detail: "La durée hebdomadaire et l'horaire journalier doivent y être inscrits et affichés (décret 2024-898, art. 7)." });
  for (const d of documents.filter((x) => x.datePeremption)) {
    const j = ecartJours(today, d.datePeremption); const e = employees.find((x) => x.id === d.employeeId);
    if (j <= 30) push({ code: "doc_peremption", niveau: j < 0 ? "rouge" : "orange", employeeId: d.employeeId,
      titre: `${HR_DOC_CATEGORIES[d.categorie] || "Document"}${e ? ` de ${e.nom} ${e.prenoms}`.trimEnd() : ""} : ${j < 0 ? "périmé depuis le" : "expire le"} ${fmt(d.datePeremption)}`, detail: d.libelle || "" });
  }
  const decl = pval(params, "DECLARATION_ANNUELLE", today);
  if (decl && Number(today.slice(5, 7)) === decl.echeance_mois && Number(today.slice(8, 10)) <= decl.echeance_jour)
    push({ code: "declaration_annuelle", niveau: "orange", titre: `Déclaration annuelle de la main-d'œuvre avant le ${decl.echeance_jour}/${pad(decl.echeance_mois)}`,
      detail: "En double exemplaire : inspection du travail du ressort et organisme public de placement (décret 2024-902, art. 6)." });
  const aConfirmer = (params || []).filter((p) => !p.valide && p.actif && p.dateEffet <= today && (!p.dateFin || p.dateFin >= today));
  if (aConfirmer.length) push({ code: "params_a_valider", niveau: "info", titre: `${aConfirmer.length} paramètre(s) légal(aux) à confirmer`, detail: aConfirmer.map((p) => p.libelle).join(" · ") });
  const ordre = { rouge: 0, orange: 1, info: 2 };
  return A.sort((a, b) => ordre[a.niveau] - ordre[b.niveau]);
}

/* Fascicule 2 : historique du contrat reconstitué à partir des avenants (avant / après) */
export function contractHistory(contract, amendments) {
  const champs = ["salaireBase", "sursalaire", "horaireHebdo", "categorie", "echelon", "qualification", "lieuTravail", "dateFin"];
  const snake = { salaireBase: "salaire_base", sursalaire: "sursalaire", horaireHebdo: "horaire_hebdo", categorie: "categorie", echelon: "echelon", qualification: "qualification", lieuTravail: "lieu_travail", dateFin: "date_fin" };
  const avs = (amendments || []).filter((a) => a.contractId === contract.id).sort((a, b) => (a.dateEffet === b.dateEffet ? a.createdAt - b.createdAt : a.dateEffet < b.dateEffet ? -1 : 1));
  let etat = Object.fromEntries(champs.map((k) => [k, contract[k]]));
  for (const a of [...avs].reverse()) for (const k of champs) if (a.avant && snake[k] in a.avant) etat = { ...etat, [k]: a.avant[snake[k]] };
  const lignes = [{ date: contract.dateDebut, evenement: `${CONTRACT_TYPES[contract.type] || contract.type}${contract.type === "CDD" && etat.dateFin ? ` jusqu'au ${fmt(etat.dateFin)}` : ""}`, ...etat }];
  for (const a of avs) {
    for (const k of champs) if (a.apres && snake[k] in a.apres) etat = { ...etat, [k]: a.apres[snake[k]] };
    lignes.push({ date: a.dateEffet, evenement: `Avenant : ${a.objet}`, ...etat });
  }
  return lignes;
}

/* ══════════════════════════════════════════════════════════════════════
   5. CORRESPONDANCES BASE ⇄ APPLICATION (lecture et écriture côte à côte :
      chaque colonne écrite est relue — contrôlé par les tests)
   ══════════════════════════════════════════════════════════════════════ */
export const mEmp = (r) => ({ id: r.id, matricule: r.matricule || "", userId: r.user_id || "", nom: r.nom || "", prenoms: r.prenoms || "", sexe: r.sexe || "",
  poste: r.poste || "", departmentId: r.department_id || "", managerId: r.manager_id || "", dateEmbauche: r.date_embauche || "", statut: r.statut || "actif",
  dateSortie: r.date_sortie || "", motifSortie: r.motif_sortie || "", createdAt: Date.parse(r.created_at) || 0, updatedAt: r.updated_at, updatedBy: r.updated_by });
export const toEmp = (f) => ({ user_id: f.userId || null, nom: (f.nom || "").trim(), prenoms: (f.prenoms || "").trim(), sexe: f.sexe || "", poste: f.poste || "",
  department_id: f.departmentId || null, manager_id: f.managerId || null, date_embauche: f.dateEmbauche, statut: f.statut || "actif",
  date_sortie: f.dateSortie || null, motif_sortie: f.motifSortie || "" });

export const mDet = (r) => ({ employeeId: r.employee_id, dateNaissance: r.date_naissance || "", lieuNaissance: r.lieu_naissance || "", nationalite: r.nationalite || "",
  pieceType: r.piece_type || "", pieceNumero: r.piece_numero || "", situationFamille: r.situation_famille || "celibataire", nbEnfantsCharge: Number(r.nb_enfants_charge) || 0,
  enfants: r.enfants || [], cnpsNumero: r.cnps_numero || "", cmuNumero: r.cmu_numero || "", adresse: r.adresse || "", telephone: r.telephone || "", email: r.email || "",
  contactUrgence: r.contact_urgence || {}, banque: r.banque || "", numeroCompte: r.numero_compte || "", expatrie: !!r.expatrie, medailleTravail: !!r.medaille_travail, ippPlus40: !!r.ipp_plus_40,
  partsItsForce: r.parts_its_force === null || r.parts_its_force === undefined ? "" : Number(r.parts_its_force),
  cmuPersonnes: r.cmu_personnes === null || r.cmu_personnes === undefined ? "" : Number(r.cmu_personnes), conjointCmu: !!r.conjoint_cmu });
export const toDet = (f, employeeId) => ({ employee_id: employeeId, date_naissance: f.dateNaissance || null, lieu_naissance: f.lieuNaissance || "", nationalite: f.nationalite || "",
  piece_type: f.pieceType || "", piece_numero: f.pieceNumero || "", situation_famille: f.situationFamille || "celibataire", nb_enfants_charge: Math.max(0, Number(f.nbEnfantsCharge) || 0),
  enfants: (f.enfants || []).filter((x) => (x.prenom || "").trim() || x.date_naissance), cnps_numero: f.cnpsNumero || "", cmu_numero: f.cmuNumero || "", adresse: f.adresse || "",
  telephone: f.telephone || "", email: f.email || "", contact_urgence: f.contactUrgence || {}, banque: f.banque || "", numero_compte: f.numeroCompte || "",
  expatrie: !!f.expatrie, medaille_travail: !!f.medailleTravail, ipp_plus_40: !!f.ippPlus40,
  parts_its_force: f.partsItsForce === "" || f.partsItsForce === null || f.partsItsForce === undefined ? null : Number(f.partsItsForce),
  cmu_personnes: f.cmuPersonnes === "" || f.cmuPersonnes === null || f.cmuPersonnes === undefined ? null : Math.max(0, Math.round(Number(f.cmuPersonnes))), conjoint_cmu: !!f.conjointCmu });

export const mCtr = (r) => ({ id: r.id, employeeId: r.employee_id, type: r.type, dateDebut: r.date_debut || "", dateFin: r.date_fin || "", motifCdd: r.motif_cdd || "", objet: r.objet || "",
  categorie: Number(r.categorie) || 1, echelon: r.echelon || "", qualification: r.qualification || "employe_mensuel", modePaiement: r.mode_paiement || "mois",
  essaiDuree: r.essai_duree === null || r.essai_duree === undefined ? null : Number(r.essai_duree), essaiUnite: r.essai_unite || "mois", essaiRenouvele: !!r.essai_renouvele,
  essaiRenouvellementNotifieLe: r.essai_renouvellement_notifie_le || "", essaiConsentementSalarie: !!r.essai_consentement_salarie, salaireBase: Number(r.salaire_base) || 0,
  sursalaire: Number(r.sursalaire) || 0,
  horaireHebdo: Number(r.horaire_hebdo) || 40, repartition: r.repartition || "8h_5j", lieuTravail: r.lieu_travail || "", clauses: r.clauses || {}, statut: r.statut || "actif",
  documentId: r.document_id || "", createdAt: Date.parse(r.created_at) || 0 });
export const toCtr = (f) => ({ employee_id: f.employeeId, type: f.type, date_debut: f.dateDebut, date_fin: f.dateFin || null, motif_cdd: f.type === "CDD" ? (f.motifCdd || "").trim() : "",
  objet: f.objet || "", categorie: Number(f.categorie), echelon: f.echelon || "", qualification: f.qualification, mode_paiement: f.modePaiement || "mois",
  essai_duree: f.type === "stage" || !f.essaiDuree ? null : Number(f.essaiDuree), essai_unite: f.essaiUnite || "mois", essai_renouvele: !!f.essaiRenouvele,
  essai_renouvellement_notifie_le: f.essaiRenouvele ? (f.essaiRenouvellementNotifieLe || null) : null, essai_consentement_salarie: !!f.essaiRenouvele && !!f.essaiConsentementSalarie,
  salaire_base: Number(f.salaireBase) || 0, sursalaire: Number(f.sursalaire) || 0, horaire_hebdo: Number(f.horaireHebdo) || 40, repartition: f.repartition || "8h_5j", lieu_travail: (f.lieuTravail || "").trim(),
  clauses: f.clauses || {}, statut: f.statut || "actif", document_id: f.documentId || null });

export const mAmend = (r) => ({ id: r.id, contractId: r.contract_id, employeeId: r.employee_id, objet: r.objet || "", dateEffet: r.date_effet || "", avant: r.avant || {}, apres: r.apres || {},
  documentId: r.document_id || "", createdAt: Date.parse(r.created_at) || 0, createdBy: r.created_by });

export const mHrDoc = (r) => ({ id: r.id, employeeId: r.employee_id || "", categorie: r.categorie || "autre", libelle: r.libelle || "", filePath: r.file_path || "", fileName: r.file_name || "",
  fileType: r.file_type || "", fileSize: Number(r.file_size) || 0, dateDocument: r.date_document || "", datePeremption: r.date_peremption || "", confidentiel: r.confidentiel !== false,
  notes: r.notes || "", genere: !!r.genere, modeleCode: r.modele_code || "", contenu: r.contenu || "", reference: r.reference || "", signe: !!r.signe,
  contractId: r.contract_id || "", amendmentId: r.amendment_id || "", objetType: r.objet_type || "", objetId: r.objet_id || "", createdAt: Date.parse(r.created_at) || 0, createdBy: r.created_by });
/* La référence (RH-AAAA-NNNN) est attribuée par la base : elle est lue, jamais écrite */
export const toHrDoc = (f) => ({ employee_id: f.employeeId || null, categorie: f.categorie || "autre", libelle: f.libelle || "", file_path: f.filePath || "", file_name: f.fileName || "",
  file_type: f.fileType || "", file_size: Number(f.fileSize) || 0, date_document: f.dateDocument || null, date_peremption: f.datePeremption || null,
  confidentiel: f.confidentiel !== false, notes: f.notes || "", genere: !!f.genere, modele_code: f.modeleCode || "", contenu: f.contenu || "",
  signe: !!f.signe, contract_id: f.contractId || null, amendment_id: f.amendmentId || null, objet_type: f.objetType || "", objet_id: f.objetId || null });

export const mTpl = (r) => ({ id: r.id, code: r.code, titre: r.titre || r.code, categorie: r.categorie || "courrier", ordre: Number(r.ordre) || 0, confidentiel: !!r.confidentiel,
  applicable: r.applicable || { besoin: "aucun" }, champs: r.champs || [], corps: r.corps || "", corpsOrigine: r.corps_origine || "", actif: r.actif !== false, updatedAt: r.updated_at });
export const toTpl = (f) => ({ titre: (f.titre || "").trim(), corps: f.corps || "", actif: f.actif !== false });
const REGLAGES_VIDES = { signataireNom: "", signataireQualite: "", signataireFeminin: false, ville: "Abidjan", adressePostale: "", cnpsEmployeur: "", primeTransport: 30000, modePaiement: "Virement" };
export const mSettings = (r) => (r ? { signataireNom: r.signataire_nom || "", signataireQualite: r.signataire_qualite || "", signataireFeminin: !!r.signataire_feminin,
  ville: r.ville || "", adressePostale: r.adresse_postale || "", cnpsEmployeur: r.cnps_employeur || "",
  primeTransport: r.prime_transport === null || r.prime_transport === undefined ? 30000 : Number(r.prime_transport), modePaiement: r.mode_paiement || "Virement" } : { ...REGLAGES_VIDES });
export const toSettings = (f) => ({ signataire_nom: (f.signataireNom || "").trim(), signataire_qualite: (f.signataireQualite || "").trim(), signataire_feminin: !!f.signataireFeminin,
  ville: (f.ville || "").trim(), adresse_postale: (f.adressePostale || "").trim(), cnps_employeur: (f.cnpsEmployeur || "").trim(),
  prime_transport: Math.max(0, Number(f.primeTransport) || 0), mode_paiement: (f.modePaiement || "Virement").trim() });

export const mParam = (r) => ({ id: r.id, code: r.code, libelle: r.libelle || r.code, categorie: r.categorie || "general", valeur: r.valeur ?? {}, dateEffet: r.date_effet || "",
  dateFin: r.date_fin || "", baseLegale: r.base_legale || "", note: r.note || "", actif: r.actif !== false, valide: !!r.valide, validePar: r.valide_par || "", valideLe: r.valide_le || "" });
export const toParamFix = (f) => ({ valeur: f.valeur, base_legale: f.baseLegale || "", note: f.note || "", actif: f.actif !== false });

export const mScale = (r) => ({ id: r.id, categorie: Number(r.categorie) || 1, echelon: r.echelon || "", libelle: r.libelle || "", qualification: r.qualification || "employe_mensuel",
  salaireMinimum: r.salaire_minimum === null || r.salaire_minimum === undefined ? null : Number(r.salaire_minimum), secteur: r.secteur || "", dateEffet: r.date_effet || "",
  dateFin: r.date_fin || "", source: r.source || "", valide: !!r.valide });
export const toScale = (f) => ({ categorie: Number(f.categorie), echelon: f.echelon || "", libelle: f.libelle || "", qualification: f.qualification || "employe_mensuel",
  salaire_minimum: f.salaireMinimum === "" || f.salaireMinimum === null || f.salaireMinimum === undefined ? null : Number(f.salaireMinimum), secteur: f.secteur || "",
  date_effet: f.dateEffet, date_fin: f.dateFin || null, source: f.source || "", valide: !!f.valide });

export const mVisa = (r) => ({ id: r.id, dateVisite: r.date_visite || "", inspecteur: r.inspecteur || "", nature: r.nature || "visa", contenu: r.contenu || "", documentId: r.document_id || "" });
export const toVisa = (f) => ({ date_visite: f.dateVisite, inspecteur: f.inspecteur || "", nature: f.nature || "visa", contenu: f.contenu || "", document_id: f.documentId || null });

/* ---- Lots 2 à 6 ---- */
const nOuVide = (v) => (v === null || v === undefined ? "" : Number(v));
const nullSiVide = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
export const mHoliday = (r) => ({ id: r.id, date: r.date, libelle: r.libelle || "", type: r.type || "chome_paye", aConfirmer: !!r.a_confirmer, source: r.source || "" });
export const toHoliday = (f) => ({ date: f.date, libelle: (f.libelle || "").trim(), type: f.type || "chome_paye", a_confirmer: !!f.aConfirmer, source: f.source || "" });
export const mAbs = (r) => ({ id: r.id, employeeId: r.employee_id, type: r.type, evenement: r.evenement || "", dateDebut: r.date_debut, dateFin: r.date_fin,
  joursOuvrables: Number(r.jours_ouvrables) || 0, joursCalendaires: Number(r.jours_calendaires) || 0, dateReprise: r.date_reprise || "", remuneree: r.remuneree !== false,
  motif: r.motif || "", statut: r.statut || "demande", justificatifId: r.justificatif_id || "", decidePar: r.decide_par || "", decideLe: r.decide_le || "", notes: r.notes || "",
  createdAt: Date.parse(r.created_at) || 0 });
export const toAbs = (f) => ({ employee_id: f.employeeId, type: f.type, evenement: f.type === "permission" ? f.evenement || "" : "", date_debut: f.dateDebut, date_fin: f.dateFin,
  jours_ouvrables: Number(f.joursOuvrables) || 0, jours_calendaires: Number(f.joursCalendaires) || 0, date_reprise: f.dateReprise || null, remuneree: f.remuneree !== false,
  motif: f.motif || "", statut: f.statut || "demande", justificatif_id: f.justificatifId || null, notes: f.notes || "" });
export const mAdj = (r) => ({ id: r.id, employeeId: r.employee_id, dateEffet: r.date_effet, jours: Number(r.jours) || 0, motif: r.motif || "" });
export const toAdj = (f) => ({ employee_id: f.employeeId, date_effet: f.dateEffet, jours: Number(f.jours) || 0, motif: (f.motif || "").trim() });
export const mElem = (r) => ({ id: r.id, employeeId: r.employee_id, libelle: r.libelle || "", nature: r.nature || "gain", montant: Number(r.montant) || 0, prorata: r.prorata !== false,
  dateDebut: r.date_debut, dateFin: r.date_fin || "", actif: r.actif !== false });
export const toElem = (f) => ({ employee_id: f.employeeId, libelle: (f.libelle || "").trim(), nature: f.nature || "gain", montant: Math.max(0, Number(f.montant) || 0), prorata: f.prorata !== false,
  date_debut: f.dateDebut, date_fin: f.dateFin || null, actif: f.actif !== false });
export const mPeriod = (r) => ({ id: r.id, annee: Number(r.annee), mois: Number(r.mois), statut: r.statut || "ouverte", datePaiement: r.date_paiement || "", modePaiement: r.mode_paiement || "Virement",
  validePar: r.valide_par || "", valideLe: r.valide_le || "", notes: r.notes || "" });
export const toPeriod = (f) => ({ annee: Number(f.annee), mois: Number(f.mois), date_paiement: f.datePaiement || null, mode_paiement: f.modePaiement || "Virement", notes: f.notes || "" });
export const mSlip = (r) => ({ id: r.id, periodId: r.period_id, employeeId: r.employee_id, contractId: r.contract_id || "", numero: r.numero || "", statut: r.statut || "brouillon",
  variables: r.variables || {}, entete: r.entete || {}, lignes: r.lignes || [], brut: Number(r.brut) || 0, imposable: Number(r.imposable) || 0,
  cotisationsSalariales: Number(r.cotisations_salariales) || 0, cotisationsPatronales: Number(r.cotisations_patronales) || 0, netAPayer: Number(r.net_a_payer) || 0,
  coutTotal: Number(r.cout_total) || 0, validePar: r.valide_par || "", valideLe: r.valide_le || "", annulePar: r.annule_par || "", annuleLe: r.annule_le || "",
  motifAnnulation: r.motif_annulation || "", createdAt: Date.parse(r.created_at) || 0 });
export const toSlip = (f) => ({ period_id: f.periodId, employee_id: f.employeeId, contract_id: f.contractId || null, variables: f.variables || {}, entete: f.entete || {},
  lignes: f.lignes || [], brut: Number(f.brut) || 0, imposable: Number(f.imposable) || 0, cotisations_salariales: Number(f.cotisationsSalariales) || 0,
  cotisations_patronales: Number(f.cotisationsPatronales) || 0, net_a_payer: Number(f.netAPayer) || 0, cout_total: Number(f.coutTotal) || 0 });
export const mTerm = (r) => ({ id: r.id, employeeId: r.employee_id, contractId: r.contract_id || "", motif: r.motif, fauteLourde: !!r.faute_lourde, dateNotification: r.date_notification || "",
  dateSortie: r.date_sortie, preavisMode: r.preavis_mode || "effectue", salaireReference: nOuVide(r.salaire_reference), elements: r.elements || {}, checklist: r.checklist || {},
  total: Number(r.total) || 0, statut: r.statut || "brouillon", validePar: r.valide_par || "", valideLe: r.valide_le || "", notes: r.notes || "" });
export const toTerm = (f) => ({ employee_id: f.employeeId, contract_id: f.contractId || null, motif: f.motif, faute_lourde: !!f.fauteLourde, date_notification: f.dateNotification || null,
  date_sortie: f.dateSortie, preavis_mode: f.preavisMode || "effectue", salaire_reference: nullSiVide(f.salaireReference), elements: f.elements || {}, checklist: f.checklist || {},
  total: Number(f.total) || 0, notes: f.notes || "" });
export const mOpening = (r) => ({ id: r.id, intitule: r.intitule || "", typeContrat: r.type_contrat || "CDI", categorie: nOuVide(r.categorie), lieu: r.lieu || "", nbPostes: Number(r.nb_postes) || 1,
  description: r.description || "", profil: r.profil || "", canaux: r.canaux || "", dateOuverture: r.date_ouverture || "", dateLimite: r.date_limite || "", statut: r.statut || "ouvert" });
export const toOpening = (f) => ({ intitule: (f.intitule || "").trim(), type_contrat: f.typeContrat || "CDI", categorie: nullSiVide(f.categorie), lieu: f.lieu || "", nb_postes: Math.max(1, Number(f.nbPostes) || 1),
  description: f.description || "", profil: f.profil || "", canaux: f.canaux || "", date_ouverture: f.dateOuverture || todayIso(), date_limite: f.dateLimite || null, statut: f.statut || "ouvert" });
export const mCand = (r) => ({ id: r.id, openingId: r.opening_id || "", nom: r.nom || "", prenoms: r.prenoms || "", sexe: r.sexe || "", telephone: r.telephone || "", email: r.email || "",
  source: r.source || "", statut: r.statut || "recu", entretienLe: r.entretien_le || "", note: nOuVide(r.note), evaluation: r.evaluation || "", cvPath: r.cv_path || "",
  cvName: r.cv_name || "", cvType: r.cv_type || "", employeeId: r.employee_id || "", createdAt: Date.parse(r.created_at) || 0 });
export const toCand = (f) => ({ opening_id: f.openingId || null, nom: (f.nom || "").trim(), prenoms: (f.prenoms || "").trim(), sexe: f.sexe || "", telephone: f.telephone || "", email: f.email || "",
  source: f.source || "", statut: f.statut || "recu", entretien_le: f.entretienLe || null, note: nullSiVide(f.note), evaluation: f.evaluation || "", cv_path: f.cvPath || "",
  cv_name: f.cvName || "", cv_type: f.cvType || "", employee_id: f.employeeId || null });
export const mDisc = (r) => ({ id: r.id, employeeId: r.employee_id, faits: r.faits || "", dateFaits: r.date_faits, dateConnaissance: r.date_connaissance, demandeLe: r.demande_le || "",
  reponseLe: r.reponse_le || "", explications: r.explications || "", sanction: r.sanction || "", joursMiseAPied: nOuVide(r.jours_mise_a_pied), dateDecision: r.date_decision || "",
  notifieLe: r.notifie_le || "", inspectionLe: r.inspection_le || "", notes: r.notes || "", createdAt: Date.parse(r.created_at) || 0 });
export const toDisc = (f) => ({ employee_id: f.employeeId, faits: (f.faits || "").trim(), date_faits: f.dateFaits, date_connaissance: f.dateConnaissance || f.dateFaits, demande_le: f.demandeLe || null,
  reponse_le: f.reponseLe || null, explications: f.explications || "", sanction: f.sanction || "", jours_mise_a_pied: nullSiVide(f.joursMiseAPied), date_decision: f.dateDecision || null,
  notifie_le: f.notifieLe || null, inspection_le: f.inspectionLe || null, notes: f.notes || "" });
export const mVisit = (r) => ({ id: r.id, employeeId: r.employee_id, type: r.type || "periodique", dateVisite: r.date_visite, medecin: r.medecin || "", resultat: r.resultat || "apte",
  restrictions: r.restrictions || "", prochaineDate: r.prochaine_date || "", documentId: r.document_id || "" });
export const toVisit = (f) => ({ employee_id: f.employeeId, type: f.type || "periodique", date_visite: f.dateVisite, medecin: f.medecin || "", resultat: f.resultat || "apte",
  restrictions: f.restrictions || "", prochaine_date: f.prochaineDate || null, document_id: f.documentId || null });
export const mAcc = (r) => ({ id: r.id, employeeId: r.employee_id, dateAccident: r.date_accident || "", lieu: r.lieu || "", circonstances: r.circonstances || "", trajet: !!r.trajet,
  temoins: r.temoins || "", lesions: r.lesions || "", declareCnpsLe: r.declare_cnps_le || "", arretJours: Number(r.arret_jours) || 0, consolidationLe: r.consolidation_le || "", documentId: r.document_id || "" });
export const toAcc = (f) => ({ employee_id: f.employeeId, date_accident: f.dateAccident, lieu: f.lieu || "", circonstances: f.circonstances || "", trajet: !!f.trajet, temoins: f.temoins || "",
  lesions: f.lesions || "", declare_cnps_le: f.declareCnpsLe || null, arret_jours: Math.max(0, Number(f.arretJours) || 0), consolidation_le: f.consolidationLe || null, document_id: f.documentId || null });
export const mTraining = (r) => ({ id: r.id, intitule: r.intitule || "", organisme: r.organisme || "", dateDebut: r.date_debut, dateFin: r.date_fin || "", cout: Number(r.cout) || 0,
  financement: r.financement || "entreprise", participants: r.participants || [], evaluation: r.evaluation || "" });
export const toTraining = (f) => ({ intitule: (f.intitule || "").trim(), organisme: f.organisme || "", date_debut: f.dateDebut, date_fin: f.dateFin || null, cout: Math.max(0, Number(f.cout) || 0),
  financement: f.financement || "entreprise", participants: f.participants || [], evaluation: f.evaluation || "" });
export const mEvent = (r) => ({ id: r.id, type: r.type, dateEvenement: r.date_evenement, description: r.description || "", declareLe: r.declare_le || "", documentId: r.document_id || "" });
export const mAccess = (r) => ({ id: r.id, userId: r.user_id, niveau: r.niveau || "complet", note: r.note || "", createdAt: r.created_at || "", createdBy: r.created_by || "" });
export const toAccess = (f) => ({ user_id: f.userId, niveau: f.niveau === "gestion" ? "gestion" : "complet", note: (f.note || "").trim() });
export const toEvent = (f) => ({ type: f.type, date_evenement: f.dateEvenement, description: f.description || "", declare_le: f.declareLe || null, document_id: f.documentId || null });

const mAudit = (r) => ({ id: r.id, at: r.at, acteur: r.acteur, action: r.action, table: r.table_name, recordId: r.record_id, avant: r.avant, apres: r.apres });

/* ══════════════════════════════════════════════════════════════════════
   6. DONNÉES ET ACTIONS
   ══════════════════════════════════════════════════════════════════════ */
const FILE_MAX = 10 * 1024 * 1024;
const FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

/* L'accès au module ne dépend plus du rôle dans l'application : il est accordé par la base
   (propriétaire du module ou membre qu'il a désigné). Niveaux : proprietaire, complet, gestion. */
export const NIVEAUX_ACCES = { complet: "Accès complet", gestion: "Gestion courante" };
export const aAcces = (acces) => ["proprietaire", "complet", "gestion"].includes(acces);
export const accesComplet = (acces) => acces === "proprietaire" || acces === "complet";

export function useHR(acces) {
  const admin = accesComplet(acces);
  const autorise = aAcces(acces);
  const proprietaire = acces === "proprietaire";
  const [st, setSt] = useState({ loading: true, error: "", employees: [], details: [], contracts: [], amendments: [], documents: [], params: [], scale: [], visas: [], audit: [],
    templates: [], settings: { ...REGLAGES_VIDES }, holidays: [], absences: [], adjustments: [], elements: [], periods: [], payslips: [], terminations: [],
    openings: [], candidates: [], disciplinary: [], visits: [], accidents: [], trainings: [], events: [], acces: [] });
  const load = useCallback(async () => {
    /* Compte non autorisé : aucune requête RH n'est émise (aucun salaire ne transite, même vide) */
    if (!autorise) { setSt((s) => ({ ...s, loading: false })); return; }
    const q = (t, col, asc = true) => supabase.from(t).select("*").order(col, { ascending: asc });
    const res = await Promise.all([
      q("hr_employees", "nom"), q("hr_employee_details", "employee_id"), q("hr_contracts", "date_debut", false),
      q("hr_contract_amendments", "date_effet"), q("hr_documents", "created_at", false), q("hr_legal_params", "code"),
      q("hr_salary_scale", "categorie"), q("hr_registry_visas", "date_visite", false),
      admin ? supabase.from("hr_audit_log").select("*").order("at", { ascending: false }).range(0, 299) : Promise.resolve({ data: [] }),
      q("hr_doc_templates", "ordre"), supabase.from("hr_company_settings").select("*"),
      q("hr_holidays", "date"), q("hr_absences", "date_debut", false), q("hr_leave_adjustments", "date_effet"), q("hr_pay_elements", "date_debut"),
      q("hr_pay_periods", "annee", false), q("hr_payslips", "created_at"), q("hr_terminations", "date_sortie", false), q("hr_job_openings", "date_ouverture", false),
      q("hr_candidates", "created_at", false), q("hr_disciplinary", "date_faits", false), q("hr_medical_visits", "date_visite", false),
      q("hr_work_accidents", "date_accident", false), q("hr_trainings", "date_debut", false), q("hr_company_events", "date_evenement", false),
      proprietaire ? q("hr_access", "created_at") : Promise.resolve({ data: [] }),
    ]);
    const err = res.find((r) => r.error)?.error;
    setSt({ loading: false, error: err ? (/relation .* does not exist|schema cache/.test(err.message) ? "Le module RH n'est pas entièrement installé dans la base : exécutez dans le SQL Editor de Supabase, dans l'ordre, migration-v32.sql, migration-v32-1.sql, migration-v32-2.sql puis migration-v33.sql." : err.message) : "",
      employees: (res[0].data || []).map(mEmp), details: (res[1].data || []).map(mDet), contracts: (res[2].data || []).map(mCtr),
      amendments: (res[3].data || []).map(mAmend), documents: (res[4].data || []).map(mHrDoc), params: (res[5].data || []).map(mParam),
      scale: (res[6].data || []).map(mScale), visas: (res[7].data || []).map(mVisa), audit: (res[8].data || []).map(mAudit),
      templates: (res[9].data || []).map(mTpl), settings: mSettings((res[10].data || [])[0]),
      holidays: (res[11].data || []).map(mHoliday), absences: (res[12].data || []).map(mAbs), adjustments: (res[13].data || []).map(mAdj), elements: (res[14].data || []).map(mElem),
      periods: (res[15].data || []).map(mPeriod).sort((a, b) => b.annee - a.annee || b.mois - a.mois), payslips: (res[16].data || []).map(mSlip),
      terminations: (res[17].data || []).map(mTerm), openings: (res[18].data || []).map(mOpening), candidates: (res[19].data || []).map(mCand),
      disciplinary: (res[20].data || []).map(mDisc), visits: (res[21].data || []).map(mVisit), accidents: (res[22].data || []).map(mAcc),
      trainings: (res[23].data || []).map(mTraining), events: (res[24].data || []).map(mEvent), acces: (res[25].data || []).map(mAccess) });
  }, [admin, autorise, proprietaire]);
  useEffect(() => { load(); }, [load]);

  /* Une écriture n'est réussie que si la base renvoie la ligne : un refus
     silencieux des règles d'accès devient un message clair. */
  const refuse = "Action refusée : votre compte n'a pas les droits nécessaires.";
  const one = async (query) => { const { data, error } = await query.select(); if (error) return { error: error.message }; if (!data || !data.length) return { error: refuse }; return { row: data[0] }; };

  const actions = {
    reload: load,
    saveEmployee: async (f, det) => {
      if (!(f.nom || "").trim()) return { error: "Le nom est obligatoire." };
      if (!f.dateEmbauche) return { error: "La date d'embauche est obligatoire : l'ancienneté en dépend." };
      if (f.dateSortie && f.dateSortie < f.dateEmbauche) return { error: "La date de sortie ne peut pas précéder la date d'embauche." };
      const r = f.id ? await one(supabase.from("hr_employees").update(toEmp(f)).eq("id", f.id)) : await one(supabase.from("hr_employees").insert(toEmp(f)));
      if (r.error) return { error: /duplicate key.*user_id/.test(r.error) ? "Ce compte applicatif est déjà relié à un autre salarié." : r.error };
      const d = await one(supabase.from("hr_employee_details").upsert(toDet(det || {}, r.row.id), { onConflict: "employee_id" }));
      await load();
      if (d.error) return { id: r.row.id, error: `Fiche enregistrée, mais les données personnelles n'ont pas pu l'être : ${d.error}` };
      return { id: r.row.id, message: f.id ? "Dossier mis à jour" : `Dossier ${r.row.matricule} créé` };
    },
    deleteEmployee: async (id) => {
      const { data, error } = await supabase.rpc("hr_delete_employee_cascade", { p_employee: id });
      if (error) return { error: error.message };
      if (data?.length) await supabase.storage.from("rh").remove(data);
      await load();
      return { message: "Dossier supprimé" };
    },
    saveContract: async (f) => {
      const r = f.id ? await one(supabase.from("hr_contracts").update(toCtr(f)).eq("id", f.id)) : await one(supabase.from("hr_contracts").insert(toCtr(f)));
      if (r.error) {
        const m = r.error;
        return { error: /uq_hr_ctr_actif/.test(m) ? "Ce salarié a déjà un contrat en cours : terminez-le ou passez par un avenant."
          : /hr_ctr_cdd/.test(m) ? "Un CDD exige un motif et une date de fin." : /hr_ctr_essai/.test(m) ? "La clause de période d'essai est obligatoire (décret 2024-900, art. 3)." : m };
      }
      await load();
      return { id: r.row.id, message: f.id ? "Contrat mis à jour" : "Contrat enregistré" };
    },
    applyAmendment: async (contractId, objet, dateEffet, changes, documentId) => {
      const { error } = await supabase.rpc("hr_apply_amendment", { p_contract: contractId, p_objet: objet, p_date_effet: dateEffet, p_changes: changes, p_document: documentId || null });
      if (error) return { error: error.message };
      await load();
      return { message: "Avenant enregistré et appliqué au contrat" };
    },
    uploadDocument: async (file, meta) => {
      if (!file) return { error: "Choisissez un fichier." };
      if (!FILE_TYPES.includes(file.type)) return { error: "Format refusé : PDF, image (JPG, PNG, WEBP) ou Word uniquement." };
      if (file.size > FILE_MAX) return { error: `Fichier trop lourd (${(file.size / 1048576).toFixed(1)} Mo) : 10 Mo maximum.` };
      const path = `${meta.employeeId ? `employes/${meta.employeeId}` : "entreprise"}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("rh").upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) return { error: "Le fichier n'a pas pu être envoyé : " + up.error.message };
      const r = await one(supabase.from("hr_documents").insert(toHrDoc({ ...meta, filePath: path, fileName: file.name, fileType: file.type, fileSize: file.size })));
      if (r.error) { await supabase.storage.from("rh").remove([path]); return { error: r.error }; }
      await load();
      return { id: r.row.id, message: "Document enregistré" };
    },
    updateDocument: async (f) => {
      const r = await one(supabase.from("hr_documents").update(toHrDoc(f)).eq("id", f.id));
      if (r.error) return r; await load(); return { message: "Document mis à jour" };
    },
    /* w : onglet ouvert au moment du clic (sinon bloqué par le navigateur après l'attente) */
    openDocument: async (d, w) => {
      const { data, error } = await supabase.storage.from("rh").createSignedUrl(d.filePath, 300);   // lien valable 5 minutes
      if (error || !data?.signedUrl) { if (w) w.close(); return { error: "Le document n'a pas pu être ouvert : " + (error?.message || "lien indisponible") }; }
      if (w) { w.opener = null; w.location.href = data.signedUrl; } else window.open(data.signedUrl, "_blank", "noopener");
      return {};
    },
    deleteDocument: async (d) => {
      const { data, error } = await supabase.from("hr_documents").delete().eq("id", d.id).select();
      if (error) return { error: error.message };
      if (!data || !data.length) return { error: refuse };
      if (d.filePath) await supabase.storage.from("rh").remove([d.filePath]);
      await load();
      return { message: "Document supprimé" };
    },
    newParamVersion: async (code, valeur, dateEffet, baseLegale, note, valide) => {
      if (!dateEffet) return { error: "Indiquez la date d'effet de la nouvelle valeur." };
      const { error } = await supabase.rpc("hr_new_param_version", { p_code: code, p_valeur: valeur, p_date_effet: dateEffet, p_base_legale: baseLegale || "", p_note: note || "", p_valide: !!valide });
      if (error) return { error: error.message };
      await load(); return { message: "Nouvelle version enregistrée ; l'ancienne reste appliquée aux périodes antérieures" };
    },
    fixParam: async (p, f) => {
      const r = await one(supabase.from("hr_legal_params").update(toParamFix(f)).eq("id", p.id));
      if (r.error) return r; await load(); return { message: "Paramètre corrigé (modification tracée au journal)" };
    },
    validateParam: async (p, userId) => {
      const r = await one(supabase.from("hr_legal_params").update({ valide: true, valide_par: userId, valide_le: new Date().toISOString() }).eq("id", p.id));
      if (r.error) return r; await load(); return { message: "Paramètre confirmé" };
    },
    saveScale: async (f) => {
      if (!(Number(f.categorie) >= 1)) return { error: "Indiquez le numéro de catégorie." };
      if (!f.dateEffet) return { error: "Indiquez la date d'effet." };
      const r = f.id ? await one(supabase.from("hr_salary_scale").update(toScale(f)).eq("id", f.id)) : await one(supabase.from("hr_salary_scale").insert(toScale(f)));
      if (r.error) return r; await load(); return { message: "Grille mise à jour" };
    },
    deleteScale: async (id) => {
      const { data, error } = await supabase.from("hr_salary_scale").delete().eq("id", id).select();
      if (error) return { error: error.message }; if (!data?.length) return { error: refuse };
      await load(); return { message: "Ligne supprimée" };
    },
    saveVisa: async (f) => {
      if (!f.dateVisite) return { error: "Indiquez la date du passage de l'inspection." };
      if (!(f.contenu || "").trim()) return { error: "Recopiez le visa, la mise en demeure ou l'observation." };
      const r = f.id ? await one(supabase.from("hr_registry_visas").update(toVisa(f)).eq("id", f.id)) : await one(supabase.from("hr_registry_visas").insert(toVisa(f)));
      if (r.error) return r; await load(); return { message: "Inscription au fascicule 3 enregistrée" };
    },
    /* Enregistrement générique (lots 2 à 6) : la ligne doit revenir de la base */
    saveRow: async (table, row, id, message) => {
      const r = id ? await one(supabase.from(table).update(row).eq("id", id)) : await one(supabase.from(table).insert(row));
      if (r.error) return r; await load(); return { id: r.row.id, row: r.row, message: message || "Enregistré" };
    },
    deleteRow: async (table, id, message) => {
      const { data, error } = await supabase.from(table).delete().eq("id", id).select();
      if (error) return { error: error.message }; if (!data?.length) return { error: refuse };
      await load(); return { message: message || "Supprimé" };
    },
    rpc: async (fn, args, message) => {
      const { data, error } = await supabase.rpc(fn, args);
      if (error) return { error: error.message }; await load(); return { data, message };
    },
    uploadFile: async (file, dossier) => {
      if (!file) return { error: "Choisissez un fichier." };
      if (!FILE_TYPES.includes(file.type)) return { error: "Format refusé : PDF, image (JPG, PNG, WEBP) ou Word uniquement." };
      if (file.size > FILE_MAX) return { error: `Fichier trop lourd (${(file.size / 1048576).toFixed(1)} Mo) : 10 Mo maximum.` };
      const path = `${dossier}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("rh").upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) return { error: "Le fichier n'a pas pu être envoyé : " + up.error.message };
      return { path, name: file.name, type: file.type };
    },
    removeFile: async (path) => { if (path) await supabase.storage.from("rh").remove([path]); },
    /* Documents édités depuis les modèles */
    saveGeneratedDoc: async (f) => {
      const row = toHrDoc({ ...f, genere: true });
      const r = f.id ? await one(supabase.from("hr_documents").update(row).eq("id", f.id)) : await one(supabase.from("hr_documents").insert(row));
      if (r.error) return r;
      const ref = r.row.reference || "";
      await load();
      return { id: r.row.id, reference: ref, message: ref ? `Document ${ref} enregistré` : "Document enregistré" };
    },
    attachSigned: async (d, file) => {
      if (!file) return { error: "Choisissez le fichier de l'exemplaire signé." };
      if (!FILE_TYPES.includes(file.type)) return { error: "Format refusé : PDF, image (JPG, PNG, WEBP) ou Word uniquement." };
      if (file.size > FILE_MAX) return { error: `Fichier trop lourd (${(file.size / 1048576).toFixed(1)} Mo) : 10 Mo maximum.` };
      const path = `${d.employeeId ? `employes/${d.employeeId}` : "entreprise"}/signes/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("rh").upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) return { error: "Le fichier n'a pas pu être envoyé : " + up.error.message };
      const r = await one(supabase.from("hr_documents").update(toHrDoc({ ...d, filePath: path, fileName: file.name, fileType: file.type, fileSize: file.size, signe: true })).eq("id", d.id));
      if (r.error) { await supabase.storage.from("rh").remove([path]); return r; }
      if (d.filePath) await supabase.storage.from("rh").remove([d.filePath]);
      await load();
      return { message: "Exemplaire signé joint : le document est désormais verrouillé" };
    },
    saveTemplate: async (t, f) => {
      if (!(f.titre || "").trim()) return { error: "Le titre du modèle est obligatoire." };
      if (!(f.corps || "").trim()) return { error: "Le texte du modèle est vide." };
      const r = await one(supabase.from("hr_doc_templates").update(toTpl(f)).eq("id", t.id));
      if (r.error) return r; await load(); return { message: "Modèle enregistré" };
    },
    resetTemplate: async (t) => {
      const r = await one(supabase.from("hr_doc_templates").update(toTpl({ ...t, corps: t.corpsOrigine })).eq("id", t.id));
      if (r.error) return r; await load(); return { message: "Modèle d'origine rétabli" };
    },
    saveSettings: async (f) => {
      const r = await one(supabase.from("hr_company_settings").update(toSettings(f)).eq("id", 1));
      if (r.error) return r; await load(); return { message: "Réglages des documents enregistrés" };
    },
    /* Désignation des membres ayant accès au module (propriétaire uniquement, contrôlé par la base) */
    setAccess: async (userId, niveau, existant) => {
      if (!niveau) {
        if (!existant) return {};
        const { data, error } = await supabase.from("hr_access").delete().eq("id", existant.id).select();
        if (error) return { error: error.message }; if (!data?.length) return { error: refuse };
        await load(); return { message: "Accès retiré" };
      }
      const row = toAccess({ ...(existant || {}), userId, niveau });
      const r = existant ? await one(supabase.from("hr_access").update(row).eq("id", existant.id)) : await one(supabase.from("hr_access").insert(row));
      if (r.error) return r; await load(); return { message: `${NIVEAUX_ACCES[niveau]} accordé` };
    },
    deleteVisa: async (id) => {
      const { data, error } = await supabase.from("hr_registry_visas").delete().eq("id", id).select();
      if (error) return { error: error.message }; if (!data?.length) return { error: refuse };
      await load(); return { message: "Inscription supprimée" };
    },
  };
  return { ...st, actions };
}

/* ══════════════════════════════════════════════════════════════════════
   7. PETITS COMPOSANTS D'INTERFACE
   (tous définis au niveau du module : jamais à l'intérieur d'un autre
   composant, sinon les champs perdraient le focus à chaque frappe)
   ══════════════════════════════════════════════════════════════════════ */
const NIVEAU = {
  rouge:  { color: "#B5171D", bg: "#FDF2F2", border: "#F5C6C7", label: "Urgent" },
  orange: { color: "#8A6212", bg: "#FFF8EC", border: "#F3E2C6", label: "À traiter" },
  info:   { color: "#2E78A8", bg: "#EEF6FB", border: "#CFE3F0", label: "Information" },
};
const ESSAI_ETAT = {
  sans_objet: { label: "Sans période d'essai", color: "#94A3B8" },
  en_cours: { label: "Essai en cours", color: "#2E78A8" },
  renouvele: { label: "Essai renouvelé", color: "#7C3AED" },
  limite_depassee: { label: "Renouvellement impossible", color: "#C58A1B" },
  renouvellement_inoperant: { label: "Renouvellement inopérant", color: "#D81F26" },
  termine: { label: "Essai terminé", color: "#4F9E2A" },
};
const REPARTITIONS = { "8h_5j": "8 h sur 5 jours", "6h40_6j": "6 h 40 sur 6 jours", inegale: "Répartition inégale" };
const nomComplet = (e) => (e ? `${e.nom} ${e.prenoms}`.trim() : "—");
const nf = (n) => (n === null || n === undefined || n === "" ? "—" : Number(n).toLocaleString("fr-FR"));

function RhToast({ toast, onDone }) {
  useEffect(() => { if (!toast) return undefined; const t = setTimeout(onDone, 4500); return () => clearTimeout(t); }, [toast, onDone]);
  if (!toast) return null;
  const err = toast.kind === "error";
  return (
    <div role="status" className="fixed bottom-4 left-1/2 z-[60] rounded-xl px-4 py-2.5 text-sm shadow-lg flex items-center gap-2 print:hidden"
      style={{ transform: "translateX(-50%)", maxWidth: "92vw", background: err ? "#FDF2F2" : "#EAF6E3", color: err ? "#B5171D" : "#2F6B17", border: `1px solid ${err ? "#F5C6C7" : "#BBE3A6"}` }}>
      {err ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />} <span>{toast.text}</span>
      <button onClick={onDone} className="ml-1 opacity-60 hover:opacity-100" aria-label="Fermer"><X size={13} /></button>
    </div>
  );
}

function ErrLine({ err }) {
  if (!err) return null;
  return <p className="text-xs text-red-600 mb-2 flex items-start gap-1"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> <span>{err}</span></p>;
}
function WarnBox({ children, tone = "orange" }) {
  const n = NIVEAU[tone];
  return <div className="rounded-lg px-3 py-2 text-xs mb-3 flex items-start gap-2" style={{ background: n.bg, color: n.color, border: `1px solid ${n.border}` }}>
    <AlertTriangle size={14} className="mt-0.5 shrink-0" /><div>{children}</div></div>;
}
function Info({ label, children }) {
  return <div className="py-1.5"><p className="text-[11px]" style={{ color: "var(--muted)" }}>{label}</p><p className="text-sm" style={{ color: "var(--ink)" }}>{children || "—"}</p></div>;
}
function ModalFooter({ onClose, onSubmit, busy, disabled, label = "Enregistrer" }) {
  return <div className="flex justify-end gap-2 pt-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
    <button disabled={busy || disabled} onClick={onSubmit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> {busy ? "…" : label}</button></div>;
}
function ConfirmModal({ title, children, confirmLabel = "Supprimer", onConfirm, onClose }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const go = async () => { setBusy(true); setErr(""); const r = await onConfirm(); setBusy(false); if (r?.error) setErr(r.error); else onClose(); };
  return (
    <Modal title={title} onClose={onClose}>
      <div className="text-sm mb-4" style={{ color: "var(--ink)" }}>{children}</div>
      <ErrLine err={err} />
      <div className="flex justify-end gap-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={busy} onClick={go} className="kb-btn text-white disabled:opacity-40" style={{ background: "#D81F26" }}><Trash2 size={15} /> {busy ? "…" : confirmLabel}</button></div>
    </Modal>
  );
}
function AlertRow({ a, onClick }) {
  const n = NIVEAU[a.niveau];
  return (
    <button onClick={onClick} className="w-full text-left rounded-lg px-3 py-2.5 flex items-start gap-2.5 hover:shadow-sm transition-shadow"
      style={{ background: n.bg, border: `1px solid ${n.border}` }}>
      {a.niveau === "info" ? <ShieldCheck size={16} style={{ color: n.color }} className="mt-0.5 shrink-0" /> : <ShieldAlert size={16} style={{ color: n.color }} className="mt-0.5 shrink-0" />}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium" style={{ color: n.color }}>{a.titre}</span>
        {a.detail && <span className="block text-xs mt-0.5" style={{ color: "var(--ink)" }}>{a.detail}</span>}
      </span>
      <ChevronRight size={15} className="mt-0.5 shrink-0" style={{ color: n.color }} />
    </button>
  );
}

/* Affichage lisible d'une valeur de paramètre (objet, tableau, nombre…) */
const humanKey = (k) => { const s = String(k).replace(/_/g, " "); return s.charAt(0).toUpperCase() + s.slice(1); };
function ValueView({ v }) {
  if (v === null || v === undefined) return <span style={{ color: "var(--muted)" }}>—</span>;
  if (typeof v === "boolean") return <span>{v ? "Oui" : "Non"}</span>;
  if (typeof v === "number") return <span className="tabular-nums">{v.toLocaleString("fr-FR")}</span>;
  if (typeof v === "string") return <span>{v || "—"}</span>;
  if (Array.isArray(v)) {
    if (!v.length) return <span style={{ color: "var(--muted)" }}>(vide)</span>;
    if (v.every((x) => x && typeof x === "object" && !Array.isArray(x))) {
      const cols = [...new Set(v.flatMap((x) => Object.keys(x)))];
      return (
        <div className="overflow-x-auto"><table className="text-[11px] my-1 border-collapse">
          <thead><tr>{cols.map((c) => <th key={c} className="px-2 py-1 text-left font-semibold border" style={{ borderColor: "var(--line)", background: "#F6F8FA" }}>{humanKey(c)}</th>)}</tr></thead>
          <tbody>{v.map((x, i) => <tr key={i}>{cols.map((c) => <td key={c} className="px-2 py-1 border align-top" style={{ borderColor: "var(--line)" }}><ValueView v={x[c]} /></td>)}</tr>)}</tbody>
        </table></div>
      );
    }
    return <span>{v.map((x, i) => <span key={i}>{i ? ", " : ""}<ValueView v={x} /></span>)}</span>;
  }
  return (
    <dl className="text-xs">
      {Object.entries(v).map(([k, x]) => (
        <div key={k} className={x && typeof x === "object" ? "mb-1" : "flex gap-1.5"}>
          <dt className="font-medium shrink-0" style={{ color: "var(--muted)" }}>{humanKey(k)} :</dt>
          <dd className={x && typeof x === "object" ? "pl-3" : ""}><ValueView v={x} /></dd>
        </div>
      ))}
    </dl>
  );
}

/* Éditeur générique de valeur JSON : respecte la structure existante */
const blankLike = (x) => (Array.isArray(x) ? [] : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).map((k) => [k, blankLike(x[k])]))
  : typeof x === "number" ? 0 : typeof x === "boolean" ? false : typeof x === "string" ? "" : null);
function Scalar({ value, onChange }) {
  if (typeof value === "boolean") return <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />;
  if (typeof value === "string") return <input className={inputCls} style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)} />;
  return <input type="number" step="any" className={inputCls} style={inputStyle} value={value === null || value === undefined ? "" : value} placeholder="(vide)"
    onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />;
}
function JsonEditor({ value, onChange, depth = 0 }) {
  if (Array.isArray(value)) {
    return (
      <div className="space-y-2">
        {value.map((it, i) => (
          <div key={i} className="rounded-lg border p-2" style={{ borderColor: "var(--line)" }}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-semibold" style={{ color: "var(--muted)" }}>Ligne {i + 1}</span>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="p-1 rounded hover:bg-slate-100" aria-label="Retirer la ligne"><Trash2 size={13} /></button>
            </div>
            <JsonEditor value={it} depth={depth + 1} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} />
          </div>
        ))}
        <button type="button" onClick={() => onChange([...value, blankLike(value[0] ?? "")])} className="kb-btn kb-btn-ghost text-xs"><Plus size={13} /> Ajouter une ligne</button>
      </div>
    );
  }
  if (value && typeof value === "object") {
    return (
      <div className={depth ? "grid sm:grid-cols-2 gap-x-3" : ""}>
        {Object.keys(value).map((k) => (value[k] && typeof value[k] === "object"
          ? <div key={k} className="sm:col-span-2 mb-2"><p className="text-xs font-semibold mb-1">{humanKey(k)}</p>
              <div className="pl-3 border-l-2" style={{ borderColor: "var(--line)" }}><JsonEditor value={value[k]} depth={depth + 1} onChange={(v) => onChange({ ...value, [k]: v })} /></div></div>
          : <Field key={k} label={humanKey(k)}><Scalar value={value[k]} onChange={(v) => onChange({ ...value, [k]: v })} /></Field>))}
      </div>
    );
  }
  return <Scalar value={value} onChange={onChange} />;
}

/* ══════════════════════════════════════════════════════════════════════
   4 bis. DOCUMENTS RH — remplissage automatique des modèles
   ══════════════════════════════════════════════════════════════════════ */
const MOIS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
/* « 1er octobre 2026 » */
export function dateLongue(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return `${d === 1 ? "1er" : d} ${MOIS_LONG[m - 1]} ${y}`;
}
/* Durée d'une période, bornes incluses : { mois, jours, libelle } */
export function dureeEntre(debut, finIncluse) {
  if (!debut || !finIncluse || finIncluse < debut) return { mois: 0, jours: 0, libelle: "" };
  const lendemain = plusJours(finIncluse, 1);
  let mois = 0;
  while (plusMois(debut, mois + 1) <= lendemain) mois++;
  const jours = ecartJours(plusMois(debut, mois), lendemain);
  const lib = [mois ? `${mois} mois` : "", jours ? `${jours} jour${jours > 1 ? "s" : ""}` : ""].filter(Boolean).join(" et ");
  return { mois, jours, libelle: lib };
}
function depasseMois(d, max) { return d.mois > max || (d.mois === max && d.jours > 0); }

/* Libellés des variables : aide à la rédaction des modèles et liste des informations manquantes */
export const VARIABLES = [
  ["entreprise.raison_sociale", "Raison sociale"], ["entreprise.forme", "Forme juridique et capital"], ["entreprise.adresse", "Adresse du siège"],
  ["entreprise.adresse_postale", "Adresse postale (réglages des documents)"], ["entreprise.rccm", "N° RCCM"], ["entreprise.cc", "N° de compte contribuable"],
  ["entreprise.cnps", "N° d'employeur CNPS (réglages des documents)"], ["entreprise.telephone", "Téléphone de l'entreprise"],
  ["signataire.nom", "Nom du signataire (réglages des documents)"], ["signataire.qualite", "Qualité du signataire (réglages des documents)"], ["signataire.e", "« e » si la signataire est une femme"],
  ["doc.ville", "Ville (réglages des documents)"], ["doc.date", "Date du document"],
  ["salarie.civilite", "Civilité — renseignez le sexe dans le dossier"], ["salarie.madame_monsieur", "Madame / Monsieur"], ["salarie.nom_complet", "Nom et prénoms"],
  ["salarie.nom", "Nom"], ["salarie.prenoms", "Prénoms"], ["salarie.matricule", "Matricule"], ["salarie.e", "« e » si la salariée est une femme"], ["salarie.ne", "« né » ou « née »"],
  ["salarie.date_naissance", "Date de naissance (dossier)"], ["salarie.lieu_naissance", "Lieu de naissance (dossier)"], ["salarie.nationalite", "Nationalité (dossier)"],
  ["salarie.piece", "Pièce d'identité (dossier)"], ["salarie.adresse", "Adresse du salarié (dossier)"], ["salarie.telephone", "Téléphone du salarié"], ["salarie.cnps", "N° CNPS du salarié"],
  ["salarie.emploi", "Emploi occupé (dossier)"], ["salarie.date_embauche", "Date d'embauche"], ["salarie.date_sortie", "Date de sortie"], ["salarie.anciennete", "Ancienneté"],
  ["contrat.type_long", "Nature du contrat (« à durée indéterminée »…)"], ["contrat.date_debut", "Début du contrat"], ["contrat.date_fin", "Fin du contrat"], ["contrat.duree", "Durée du contrat"],
  ["contrat.motif_cdd", "Motif du CDD"], ["contrat.emploi", "Emploi (dossier)"], ["contrat.objet", "Fonctions (contrat)"], ["contrat.categorie", "Catégorie"], ["contrat.echelon", "Échelon"],
  ["contrat.qualification", "Qualification"], ["contrat.salaire_categoriel", "Salaire catégoriel"], ["contrat.sursalaire", "Sursalaire"], ["contrat.remuneration", "Rémunération mensuelle"],
  ["contrat.remuneration_lettres", "Rémunération en lettres"], ["contrat.horaire", "Horaire hebdomadaire"], ["contrat.repartition", "Répartition de l'horaire"], ["contrat.lieu_travail", "Lieu de travail"],
  ["contrat.mode_paiement", "Mode de paiement"], ["contrat.essai_duree", "Durée de l'essai"], ["contrat.essai_fin", "Fin de l'essai"], ["contrat.essai_limite", "Date limite de notification du renouvellement"],
  ["contrat.essai_fin_renouvelee", "Fin de l'essai renouvelé"], ["contrat.essai_fin_effective", "Fin effective de l'essai"], ["contrat.date_definitif", "Date de l'engagement définitif"],
  ["contrat.preavis", "Préavis applicable"], ["contrat.nc_duree", "Durée de la non-concurrence"], ["contrat.nc_contrepartie", "Contrepartie de la non-concurrence"],
  ["contrat.a_sursalaire", "(condition) le contrat comporte un sursalaire"], ["contrat.mobilite", "(condition) clause de mobilité"], ["contrat.confidentialite", "(condition) clause de confidentialité"],
  ["contrat.non_concurrence", "(condition) clause de non-concurrence"], ["contrat.cdd", "(condition) contrat à durée déterminée"], ["contrat.stage", "(condition) stage"],
  ["conges.jours_par_mois", "Jours de congé acquis par mois (paramètres)"], ["cdd.duree_max", "Durée maximale d'un CDD (paramètres)"], ["cdd.indemnite_fin_taux", "Taux de l'indemnité de fin de CDD (paramètres)"],
  ["stage.duree_max", "Durée maximale d'un stage (paramètres)"], ["stage.priorite_mois", "Priorité d'embauche après un stage, en mois (paramètres)"],
  ["avenant.numero", "Numéro de l'avenant"], ["avenant.objet", "Objet de l'avenant"], ["avenant.date_effet", "Date d'effet de l'avenant"], ["avenant.modifications", "Liste des modifications"],
  ["certificat.date_sortie", "Date de sortie (certificat)"], ["certificat.emplois", "Emplois successifs (certificat)"],
  ["absence.libelle", "Nature de l'absence"], ["absence.motif", "Motif de l'absence"], ["absence.date_debut", "Premier jour d'absence"], ["absence.date_fin", "Dernier jour d'absence"],
  ["absence.date_reprise", "Date de reprise"], ["absence.jours_ouvrables", "Jours ouvrables d'absence"], ["absence.jours_calendaires", "Jours calendaires d'absence"],
  ["absence.allocation", "Allocation de congé (estimation)"], ["absence.solde_apres", "Solde de congé après l'absence"],
  ["absence.permission", "(condition) permission exceptionnelle"], ["absence.remuneree", "(condition) absence rémunérée"],
  ["discipline.delai_reponse", "Délai de réponse aux explications (paramètres)"], ["sanction.faits", "Faits reprochés"], ["sanction.date_faits", "Date des faits"],
  ["sanction.date_demande", "Date de la demande d'explication"], ["sanction.date_reponse", "Date des explications"], ["sanction.date_notification", "Date de notification de la sanction"],
  ["sanction.libelle", "Sanction prononcée"], ["sanction.mise_a_pied", "(condition) mise à pied"],
  ["rupture.motif_libelle", "Motif de la rupture"], ["rupture.date_notification", "Date de notification de la rupture"], ["rupture.date_sortie", "Date de sortie"],
  ["rupture.preavis", "Durée du préavis"], ["rupture.date_fin_preavis", "Fin du préavis — renseignez la date de notification"],
  ["rupture.preavis_effectue", "(condition) préavis effectué"], ["rupture.preavis_dispense", "(condition) préavis dispensé"], ["rupture.faute_lourde", "(condition) faute lourde"],
  ["rupture.lignes", "Détail des sommes versées"], ["rupture.total", "Total des sommes de rupture"], ["rupture.net", "Net versé"], ["rupture.net_lettres", "Net versé en lettres"],
  ["candidat.civilite", "Civilité du candidat — renseignez le sexe"], ["candidat.madame_monsieur", "Madame / Monsieur (candidat)"], ["candidat.nom_complet", "Nom du candidat"],
  ["candidat.telephone", "Téléphone du candidat"], ["candidat.poste", "Poste à pourvoir"], ["candidat.entretien_date", "Date de l'entretien"], ["candidat.entretien_heure", "Heure de l'entretien"],
];
const LIBELLE_VARIABLE = Object.fromEntries(VARIABLES);
export const libelleVariable = (k) => LIBELLE_VARIABLE[k] || (k.startsWith("extra.") ? "Champ du document" : k);

/* Libellés des éléments modifiés, tels qu'ils apparaissent dans un avenant */
const AVENANT_DOC = {
  salaire_base: ["salaire catégoriel mensuel", (v) => fcfa(v)], sursalaire: ["sursalaire mensuel", (v) => fcfa(v)],
  horaire_hebdo: ["durée hebdomadaire du travail", (v) => `${nf(v)} heures`], repartition: ["répartition de l'horaire", (v) => REPARTITIONS[v] || v],
  categorie: ["catégorie professionnelle", (v) => `catégorie ${v}`], echelon: ["échelon", (v) => v || "sans échelon"],
  qualification: ["qualification", (v) => QUALIFICATIONS[v] || v], mode_paiement: ["mode de paiement", (v) => (MODES_PAIEMENT[v] || v).toLowerCase()],
  lieu_travail: ["lieu de travail", (v) => v], date_fin: ["terme du contrat", (v) => (v ? dateLongue(v) : "sans terme")],
  objet: ["fonctions", (v) => v], clauses: ["clauses particulières", () => "modifiées"],
};
export function lignesAvenant(a) {
  const keys = Object.keys(a?.apres || {});
  return keys.map((k, i) => {
    const [lib, show] = AVENANT_DOC[k] || [k, (v) => String(v ?? "")];
    return `- ${lib} : ${show(a.apres[k])}, au lieu de ${show(a.avant?.[k])}${i === keys.length - 1 ? "." : " ;"}`;
  }).join("\n");
}
/* Emplois successifs, pour le certificat de travail (CCI art. 41) */
export function emploisSuccessifs(emp, contracts, amendments, dateSortie) {
  const cs = contracts.filter((c) => c.employeeId === emp.id && c.statut !== "annule").sort((a, b) => (a.dateDebut < b.dateDebut ? -1 : 1));
  const segs = [];
  for (const c of cs) for (const l of contractHistory(c, amendments)) {
    const cle = `${l.categorie}|${l.echelon}|${l.qualification}`;
    if (segs.length && segs[segs.length - 1].cle === cle) continue;
    segs.push({ cle, debut: l.date, categorie: l.categorie, echelon: l.echelon, qualification: l.qualification });
  }
  return segs.map((s, i) => {
    const fin = i < segs.length - 1 ? plusJours(segs[i + 1].debut, -1) : dateSortie;
    return `- ${emp.poste || "emploi non renseigné"}, catégorie ${s.categorie}${s.echelon ? `, échelon ${s.echelon}` : ""} (${(QUALIFICATIONS[s.qualification] || "").toLowerCase()}), du ${dateLongue(s.debut)} au ${fin ? dateLongue(fin) : "…"}${i === segs.length - 1 ? "." : " ;"}`;
  }).join("\n");
}

const AGENCE_PROPRE = (s) => String(s || "").replace(/^(RC|CC)\s*:\s*/, "");
/* Toutes les valeurs disponibles pour un document, à partir du dossier */
export function buildDocContext({ emp, det, contract, amendment, contracts = [], amendments = [], params, settings, agency, extra = {}, champs = [], today, objetCtx = {} }) {
  const ctx = {};
  const set = (k, v) => { ctx[k] = v; };
  const g = emp?.sexe === "F" ? "F" : emp?.sexe === "M" ? "M" : "";
  set("entreprise.raison_sociale", agency?.name || ""); set("entreprise.forme", agency?.form || ""); set("entreprise.adresse", agency?.address || "");
  set("entreprise.adresse_postale", settings?.adressePostale || ""); set("entreprise.rccm", AGENCE_PROPRE(agency?.rc)); set("entreprise.cc", AGENCE_PROPRE(agency?.cc));
  set("entreprise.cnps", settings?.cnpsEmployeur || ""); set("entreprise.telephone", agency?.tel || "");
  set("signataire.nom", settings?.signataireNom || ""); set("signataire.qualite", settings?.signataireQualite || ""); set("signataire.e", settings?.signataireFeminin ? "e" : "");
  set("doc.ville", settings?.ville || ""); set("doc.date", dateLongue(today));
  if (emp) {
    set("salarie.civilite", g === "F" ? "Madame" : g === "M" ? "Monsieur" : ""); set("salarie.madame_monsieur", g === "F" ? "Madame" : g === "M" ? "Monsieur" : "Madame, Monsieur");
    set("salarie.nom_complet", nomComplet(emp)); set("salarie.nom", emp.nom); set("salarie.prenoms", emp.prenoms); set("salarie.matricule", emp.matricule);
    set("salarie.e", g === "F" ? "e" : ""); set("salarie.ne", g === "F" ? "née" : "né");
    set("salarie.emploi", emp.poste); set("salarie.date_embauche", dateLongue(emp.dateEmbauche)); set("salarie.date_sortie", dateLongue(emp.dateSortie));
    set("salarie.date_sortie_iso", emp.dateSortie || ""); set("salarie.anciennete", libAnciennete(ancienneteMois(emp.dateEmbauche, emp.dateSortie || today)));
  }
  if (det) {
    set("salarie.date_naissance", dateLongue(det.dateNaissance)); set("salarie.lieu_naissance", det.lieuNaissance); set("salarie.nationalite", det.nationalite);
    set("salarie.piece", det.pieceType && det.pieceNumero ? `${det.pieceType} n° ${det.pieceNumero}` : ""); set("salarie.adresse", det.adresse);
    set("salarie.telephone", det.telephone); set("salarie.cnps", det.cnpsNumero);
  }
  const conges = pval(params, "CONGES_ACQUISITION", today); set("conges.jours_par_mois", conges ? String(conges.jours_par_mois).replace(".", ",") : "");
  const cdd = pval(params, "CDD_REGLES", today); set("cdd.duree_max", cdd ? `${cdd.duree_max_mois} mois` : ""); set("cdd.indemnite_fin_taux", cdd ? String(cdd.indemnite_fin_taux).replace(".", ",") : "");
  const stg = pval(params, "STAGE_QUALIFICATION", today); set("stage.duree_max", stg ? `${stg.duree_max_mois} mois` : ""); set("stage.priorite_mois", stg ? String(stg.priorite_embauche_mois) : "");
  const c = contract;
  if (c) {
    const total = remunerationMensuelle(c);
    set("contrat.type_long", { CDI: "à durée indéterminée", CDD: "à durée déterminée", stage: "de stage", apprentissage: "d'apprentissage", temporaire: "de travail temporaire" }[c.type] || "");
    set("contrat.date_debut", dateLongue(c.dateDebut)); set("contrat.date_fin", dateLongue(c.dateFin)); set("contrat.date_fin_iso", c.dateFin || "");
    set("contrat.duree", c.dateFin ? dureeEntre(c.dateDebut, c.dateFin).libelle : ""); set("contrat.motif_cdd", c.motifCdd);
    set("contrat.emploi", emp?.poste || ""); set("contrat.objet", c.objet); set("contrat.categorie", String(c.categorie)); set("contrat.echelon", c.echelon);
    set("contrat.qualification", (QUALIFICATIONS[c.qualification] || "").toLowerCase());
    set("contrat.salaire_categoriel", fcfa(c.salaireBase)); set("contrat.sursalaire", fcfa(c.sursalaire)); set("contrat.a_sursalaire", Number(c.sursalaire) > 0);
    set("contrat.remuneration", fcfa(total)); set("contrat.remuneration_lettres", amountInWords(total));
    set("contrat.horaire", nf(c.horaireHebdo)); set("contrat.repartition", { "8h_5j": "à raison de 8 heures par jour sur 5 jours ouvrables", "6h40_6j": "à raison de 6 heures 40 par jour ouvrable", inegale: "de manière inégale, dans la limite de 8 heures par jour" }[c.repartition] || "");
    set("contrat.lieu_travail", c.lieuTravail); set("contrat.mode_paiement", (MODES_PAIEMENT[c.modePaiement] || "").toLowerCase());
    set("contrat.cdd", c.type === "CDD"); set("contrat.stage", c.type === "stage");
    set("contrat.mobilite", !!c.clauses?.mobilite); set("contrat.confidentialite", !!c.clauses?.confidentialite);
    const nc = c.clauses?.non_concurrence || {}; set("contrat.non_concurrence", !!nc.actif); set("contrat.nc_duree", nc.duree || ""); set("contrat.nc_contrepartie", nc.contrepartie || "");
    const es = essaiStatus(c, params, today);
    if (es.applicable) {
      set("contrat.essai", true); set("contrat.essai_duree", libDuree(c.essaiDuree, c.essaiUnite)); set("contrat.essai_fin", dateLongue(es.finInitiale));
      set("contrat.essai_limite", dateLongue(es.limite)); set("contrat.essai_fin_renouvelee", dateLongue(es.finRenouvelee));
      set("contrat.essai_fin_effective", dateLongue(es.finEffective)); set("contrat.date_definitif", dateLongue(plusJours(es.finEffective, 1)));
    }
    const pr = emp ? preavisPour(params, c, det, ancienneteMois(emp.dateEmbauche, today), today) : null; set("contrat.preavis", pr ? pr.libelle : "");
  }
  if (amendment) {
    const avs = amendments.filter((a) => a.contractId === amendment.contractId).sort((a, b) => (a.dateEffet === b.dateEffet ? a.createdAt - b.createdAt : a.dateEffet < b.dateEffet ? -1 : 1));
    set("avenant.numero", String(avs.findIndex((a) => a.id === amendment.id) + 1)); set("avenant.objet", amendment.objet);
    set("avenant.date_effet", dateLongue(amendment.dateEffet)); set("avenant.modifications", lignesAvenant(amendment));
  }
  Object.assign(ctx, objetCtx);                                         // absence, procédure, rupture ou candidat
  /* Champs propres au document (saisis dans l'éditeur) */
  for (const ch of champs) {
    const v = extra[ch.cle];
    set(`extra.${ch.cle}`, ch.type === "case" ? !!v : ch.type === "date" ? dateLongue(v) : (v ?? ""));
  }
  if (emp) {
    const sortie = extra.date_sortie || emp.dateSortie || "";
    set("certificat.date_sortie", dateLongue(sortie)); set("certificat.emplois", emploisSuccessifs(emp, contracts, amendments, sortie));
  }
  return ctx;
}
/* Valeur initiale des champs propres à un document */
export function champsInitiaux(champs, ctx, today) {
  return Object.fromEntries((champs || []).map((ch) => {
    let v = ch.defaut;
    if (ch.depuis && ctx[ch.depuis]) v = ctx[ch.depuis];
    if (v === "aujourdhui") v = today;
    return [ch.cle, ch.type === "case" ? !!v : v ?? ""];
  }));
}

/* ---- Rendu d'un modèle ---- */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const estVrai = (v) => v === true || (typeof v === "number" && v !== 0) || (typeof v === "string" && v.trim() !== "");
export function renderTemplate(corps, ctx) {
  const manquants = [];
  let t = esc(corps || "").replace(/\r\n/g, "\n");
  /* Blocs conditionnels, du plus intérieur au plus extérieur */
  const re = /\{\{#(si|non) ([\w.]+)\}\}((?:(?!\{\{#(?:si|non) )[\s\S])*?)\{\{\/\1\}\}/;
  for (let m = re.exec(t), n = 0; m && n < 500; m = re.exec(t), n++) {
    const vrai = estVrai(ctx[m[2]]);
    const [oui, non = ""] = m[3].split("{{sinon}}");
    t = t.slice(0, m.index) + (m[1] === "si" ? (vrai ? oui : non) : (vrai ? "" : oui)) + t.slice(m.index + m[0].length);
  }
  t = t.replace(/\{\{([\w.]+)\}\}/g, (_, k) => {
    const v = ctx[k];
    if (typeof v === "boolean") return "";
    if (v === undefined || v === null || v === "") {
      if (/\.e$/.test(k)) return "";                                   // accord féminin : vide au masculin
      if (!manquants.includes(k)) manquants.push(k);
      return `\u0001${k}\u0002`;
    }
    return `\u0003${esc(v)}`;
  });
  /* Élision devant une valeur qui commence par une voyelle : « de Agent » → « d'Agent » */
  t = t.replace(/(^|[\s(])(de|De|que|Que) \u0003(?=[AEIOUÉÈÊÂÎÔÛaeiouéèêâîôû])/g, (_, a, w) => `${a}${w.slice(0, -1)}'`).replace(/\u0003/g, "");
  t = t.replace(/\n{3,}/g, "\n\n");
  const html = markupToHtml(t).replace(/\u0001([\w.]+)\u0002/g, (_, k) => `<span class="rh-manque" data-champ="${k}" title="${esc(libelleVariable(k))}">……………………</span>`);
  return { html, manquants };
}
const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
export function markupToHtml(text) {
  const out = []; let ul = null; let droite = null; let art = 0;
  const flush = () => { if (ul) { out.push(`<ul>${ul.join("")}</ul>`); ul = null; } if (droite) { out.push(`<p class="rh-droite">${droite.join("<br>")}</p>`); droite = null; } };
  for (const brut of text.split("\n")) {
    const l = brut.trimEnd();
    if (l.startsWith("- ")) { if (droite) flush(); (ul = ul || []).push(`<li>${inline(l.slice(2))}</li>`); continue; }
    if (l.startsWith("&gt;&gt; ") || l === "&gt;&gt;") { if (ul) flush(); (droite = droite || []).push(inline(l.slice(9))); continue; }
    flush();
    if (!l.trim()) continue;
    if (l.startsWith("# ")) out.push(`<h1 class="rh-titre">${inline(l.slice(2))}</h1>`);
    else if (l.startsWith("### ")) out.push(`<p class="rh-centre"><strong>${inline(l.slice(4))}</strong></p>`);
    else if (l.startsWith("## ")) { const h = l.slice(3).replace(/^Article —/, () => `Article ${++art} —`); out.push(`<h2 class="rh-art">${inline(h)}</h2>`); }
    else if (/^\[\[signatures:/.test(l)) {
      const corps = l.replace(/^\[\[signatures:\s*/, "").replace(/\]\]$/, "");
      const cols = corps.split("|").map((c) => c.split("//").map((x) => inline(x.trim())).filter(Boolean).join("<br>"));
      /* Le bloc de signatures reste sur la même page que les dernières lignes du texte */
      const avant = [];
      while (avant.length < 2 && out.length && /^<p[ >]/.test(out[out.length - 1])) avant.unshift(out.pop());
      out.push(`<div class="rh-fin">${avant.join("\n")}<table class="rh-sign"><tbody><tr>${cols.map((c) => `<td>${c}</td>`).join("")}</tr></tbody></table></div>`);
    } else out.push(`<p>${inline(l)}</p>`);
  }
  flush();
  return out.join("\n");
}
/* Nettoyage du texte retouché avant enregistrement : aucun script ni attribut actif */
export function sanitizeHtml(html) {
  if (typeof DOMParser === "undefined") {
    return String(html || "").replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "").replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "")
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'\s>]*\2/gi, "");
  }
  const doc = new DOMParser().parseFromString(`<div>${html || ""}</div>`, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,link,meta,form,input,button").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((n) => {
    for (const a of [...n.attributes]) {
      if (/^on/i.test(a.name) || (/^(href|src|xlink:href)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name);
    }
  });
  return doc.body.firstChild.innerHTML;
}
/* Modèles proposés pour un salarié (et éventuellement un contrat) */
export function modelesDisponibles(templates, contract, params, today) {
  return (templates || []).filter((t) => t.actif).filter((t) => {
    const b = t.applicable?.besoin || "aucun";
    if (["avenant", "absence", "discipline", "rupture", "candidat"].includes(b)) return false;   // proposés depuis l'objet concerné
    if (b === "contrat") return !!contract && (!t.applicable.types || t.applicable.types.includes(contract.type));
    if (b === "essai") return !!contract && essaiStatus(contract, params, today).applicable;
    return true;
  });
}
/* Modèles proposés pour une absence, une procédure disciplinaire, une sortie ou un candidat */
export function modelesPourObjet(templates, type, row) {
  return (templates || []).filter((t) => t.actif).filter((t) => {
    const ap = t.applicable || {};
    if (type === "rupture" && t.code === "CERTIFICAT_TRAVAIL") return true;          // certificat de travail remis à la sortie
    if (ap.besoin !== type) return false;
    if (type === "absence") return !ap.types || ap.types.includes(row.type);
    if (type === "discipline") return !ap.sanctions || ap.sanctions.includes(row.sanction);
    if (type === "rupture") return !ap.motifs || ap.motifs.includes(row.motif);
    return true;
  });
}
/* Avertissements propres à un document — affichés à l'écran, jamais imprimés */
export function avertissementsDocument(code, { contract, params, today, extra, emp, objet, objetCtx = {} }) {
  const w = [];
  const r = objet?.row;
  if (code === "RECU_SOLDE" && !objetCtx["rupture.bulletin"]) w.push({ niveau: "orange", texte: "Aucun bulletin du mois de sortie : le net versé n'est pas connu. Préparez d'abord ce bulletin (onglet Paie) : il reprend le salaire du dernier mois, les sommes de rupture et les retenues." });
  if (code === "RECU_SOLDE") w.push({ niveau: "info", texte: "Le salarié écrit à la main « pour solde de tout compte » avant de signer. Conservez l'exemplaire signé avec le dossier." });
  if (code === "DEMANDE_EXPLICATION") w.push({ niveau: "info", texte: "À remettre contre décharge (ou lettre recommandée). Reportez la date de remise dans la procédure : le délai de réponse en part." });
  if (["NOTIFICATION_SANCTION", "TRANSMISSION_INSPECTION"].includes(code) && r && !r.demandeLe) w.push({ niveau: "rouge", texte: "Aucune demande d'explication enregistrée : une sanction ne peut être prononcée sans que le salarié ait été mis en mesure de s'expliquer (Code du travail, art. 17.5)." });
  if (code === "NOTIFICATION_SANCTION" && r && /^mise_a_pied/.test(r.sanction) && !extra.date_debut) w.push({ niveau: "orange", texte: "Indiquez les dates de la mise à pied (et inscrivez-la dans les absences pour la retenue de salaire)." });
  if (code === "LETTRE_LICENCIEMENT") w.push({ niveau: "info", texte: "Motif précis et vérifiable. Informez l'inspecteur du travail dans le même temps (Code du travail, art. 18.4) ; en cas de faute, la procédure disciplinaire (demande d'explication) doit avoir été suivie." });
  if (code === "CONVOCATION_ENTRETIEN" && r && !r.entretienLe) w.push({ niveau: "orange", texte: "Renseignez la date et l'heure de l'entretien dans la fiche du candidat." });
  if (code === "PROMESSE_EMBAUCHE") w.push({ niveau: "info", texte: "Une promesse précisant l'emploi, la rémunération et la date d'entrée engage l'entreprise : sa rétractation peut ouvrir droit à des dommages et intérêts." });
  const es = contract ? essaiStatus(contract, params, today) : null;
  if (code === "ESSAI_RENOUVELLEMENT" && es?.applicable) {
    if (contract.essaiRenouvele) w.push({ niveau: "rouge", texte: "L'essai a déjà été renouvelé : un second renouvellement n'est pas permis." });
    else if (es.limite && today > es.limite && !extra.accord) w.push({ niveau: "rouge", texte: `Délai de notification dépassé (limite : ${fmt(es.limite)}). Sans l'accord écrit du salarié, le renouvellement est inopérant et l'engagement devient définitif au ${fmt(plusJours(es.finInitiale, 1))} (décret 2024-900, art. 6). Cochez « accord écrit » seulement si le salarié l'accepte.` });
    else if (es.limite) w.push({ niveau: "info", texte: `À remettre au salarié au plus tard le ${fmt(es.limite)}, contre décharge.` });
  }
  if (code === "ESSAI_RUPTURE" && es?.applicable) {
    if (extra.date_fin && extra.date_fin > es.finEffective) w.push({ niveau: "rouge", texte: `La période d'essai prend fin le ${fmt(es.finEffective)} : après cette date, la rupture n'est plus une rupture d'essai mais un licenciement (préavis, motif, procédure).` });
    if (es.renouvellementValide && enJours(contract.essaiDuree, contract.essaiUnite) > 30) w.push({ niveau: "orange", texte: "Essai renouvelé pour plus d'un mois : la rupture ouvre droit à une indemnité de préavis (CCI, art. 14). Cochez la case correspondante." });
  }
  if (code === "CONTRAT_CDD" && contract?.dateFin) {
    const cdd = pval(params, "CDD_REGLES", today);
    if (cdd && depasseMois(dureeEntre(contract.dateDebut, contract.dateFin), cdd.duree_max_mois)) w.push({ niveau: "rouge", texte: `Durée supérieure à ${cdd.duree_max_mois} mois : un CDD à terme précis ne peut pas l'excéder (Code du travail, art. 15.4).` });
  }
  if (code === "CERTIFICAT_TRAVAIL") {
    if (!extra.date_sortie) w.push({ niveau: "orange", texte: "Indiquez la date de sortie : elle est obligatoire sur le certificat." });
    w.push({ niveau: "info", texte: "À remettre au moment du dernier paiement, accompagné du relevé nominatif de salaires de la CNPS (Code du travail, art. 18.18). Conservez la décharge de remise." });
  }
  if (code === "ATTESTATION_STAGE" || code === "CONVENTION_STAGE") {
    const stg = pval(params, "STAGE_QUALIFICATION", today);
    if (stg && contract?.dateFin && depasseMois(dureeEntre(contract.dateDebut, contract.dateFin), stg.duree_max_mois)) w.push({ niveau: "rouge", texte: `Stage de plus de ${stg.duree_max_mois} mois : durée maximale dépassée, renouvellements compris (Code du travail, art. 13.14).` });
  }
  if (emp && !emp.sexe) w.push({ niveau: "orange", texte: "Le sexe n'est pas renseigné dans le dossier : la civilité et les accords (né/née…) ne peuvent pas être écrits." });
  return w;
}

/* ══════════════════════════════════════════════════════════════════════
   4 ter. CONGÉS, ABSENCES, PAIE, SORTIES, DISCIPLINE — moteurs de calcul
   (aucune valeur légale en dur : tout vient de hr_legal_params)
   ══════════════════════════════════════════════════════════════════════ */
const fmt2 = (n) => (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
const maxIso = (a, b) => (a > b ? a : b);
const minIso = (a, b) => (a < b ? a : b);
const finDuMois = (annee, mois) => S(new Date(Date.UTC(annee, mois, 0)));
export const debutDuMois = (annee, mois) => `${annee}-${pad(mois)}-01`;
export const MOIS_NOMS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const libPeriode = (p) => (p ? `${MOIS_NOMS[p.mois - 1]} ${p.annee}` : "");
/* Âge révolu à une date */
export function ageAu(naissance, date) { return naissance ? Math.floor(ancienneteMois(naissance, date) / 12) : null; }

/* ---------- Jours fériés et jours ouvrables (lundi à samedi, hors fériés) ---------- */
const estDimanche = (iso) => D(iso).getUTCDay() === 0;
const feriesSet = (holidays) => new Set((holidays || []).map((h) => h.date));
export function joursOuvrables(debut, fin, holidays) {
  if (!debut || !fin || fin < debut) return 0;
  const f = feriesSet(holidays); let n = 0;
  for (let d = debut; d <= fin; d = plusJours(d, 1)) if (!estDimanche(d) && !f.has(d)) n++;
  return n;
}
export const joursCalendaires = (debut, fin) => (debut && fin && fin >= debut ? ecartJours(debut, fin) + 1 : 0);
export function prochainJourOuvrable(iso, holidays) {
  const f = feriesSet(holidays); let d = plusJours(iso, 1);
  while (estDimanche(d) || f.has(d)) d = plusJours(d, 1);
  return d;
}
/* Dernier jour d'un congé de n jours ouvrables commençant à « debut » */
export function finApresOuvrables(debut, n, holidays) {
  const f = feriesSet(holidays); let d = debut; let k = 0;
  if (!(n > 0)) return debut;
  for (let i = 0; i < 400; i++) { if (!estDimanche(d) && !f.has(d)) { k++; if (k >= n) return d; } d = plusJours(d, 1); }
  return d;
}
export function ajouterJoursOuvrables(iso, n, holidays) {
  const f = feriesSet(holidays); let d = iso; let k = 0;
  while (k < n) { d = plusJours(d, 1); if (!estDimanche(d) && !f.has(d)) k++; }
  return d;
}

export const ABSENCE_TYPES = {
  conge_paye:             { label: "Congé payé", remuneree: true, color: "#2E78A8" },
  permission:             { label: "Permission exceptionnelle", remuneree: true, color: "#7C3AED" },
  absence_exceptionnelle: { label: "Absence exceptionnelle (sans solde)", remuneree: false, color: "#C58A1B" },
  maladie:                { label: "Maladie", remuneree: true, color: "#0D9488" },
  accident_travail:       { label: "Accident du travail", remuneree: true, color: "#DB2777" },
  maternite:              { label: "Congé de maternité", remuneree: true, color: "#EA580C" },
  absence_autorisee:      { label: "Absence autorisée non payée", remuneree: false, color: "#64748B" },
  absence_injustifiee:    { label: "Absence injustifiée", remuneree: false, color: "#D81F26" },
  mise_a_pied:            { label: "Mise à pied disciplinaire", remuneree: false, color: "#991B1B" },
  formation:              { label: "Formation", remuneree: true, color: "#4F9E2A" },
  autre:                  { label: "Autre absence", remuneree: true, color: "#94A3B8" },
};
export const ABS_STATUT = { demande: { label: "Demandée", color: "#C58A1B" }, valide: { label: "Validée", color: "#4F9E2A" }, refuse: { label: "Refusée", color: "#D81F26" }, annule: { label: "Annulée", color: "#94A3B8" } };
const chevauche = (a, b) => a.dateDebut <= b.dateFin && b.dateDebut <= a.dateFin;

/* ---------- Solde de congés payés (Code du travail art. 25.1 à 25.5 ; CCI art. 68 à 70) ---------- */
export function soldeConges({ emp, det, contracts, absences, adjustments, params, today }) {
  if (!emp) return null;
  const cs = (contracts || []).filter((c) => c.employeeId === emp.id && c.statut !== "annule" && c.type !== "stage");
  if (!cs.length) return null;                                     // stagiaire : pas de congé payé de salarié
  const debut = emp.dateEmbauche || cs.map((c) => c.dateDebut).sort()[0];
  const fin = minIso(today, emp.dateSortie || today);
  if (!debut || fin < debut) return { debut, acquisBase: 0, majorations: 0, ajustements: 0, pris: 0, solde: 0, droitOuvert: false, lignesMaj: [], moisEffectifs: 0 };
  const acq = Number(pval(params, "CONGES_ACQUISITION", fin)?.jours_par_mois) || 0;
  const assim = pval(params, "CONGES_ASSIMILATION", fin) || { types: [], maladie_limite_mois: 6 };
  const abs = (absences || []).filter((a) => a.employeeId === emp.id && a.statut === "valide");
  let nonAssim = 0;
  for (const a of abs) {
    const d1 = maxIso(a.dateDebut, debut), d2 = minIso(a.dateFin, fin);
    if (d2 < d1) continue;
    const j = ecartJours(d1, d2) + 1;
    if (!(assim.types || []).includes(a.type)) nonAssim += j;
    else if (a.type === "maladie") { const lim = (Number(assim.maladie_limite_mois) || 6) * 30; if (j > lim) nonAssim += j - lim; }
  }
  const dur = dureeEntre(debut, fin);
  const moisEffectifs = Math.max(0, dur.mois + dur.jours / 30 - nonAssim / 30);
  const acquisBase = r2(moisEffectifs * acq);
  let majorations = 0; const lignesMaj = [];
  for (let k = 1; k <= Math.floor(dur.mois / 12); k++) {
    const anniv = plusMois(debut, 12 * k);
    let j = 0;
    const pal = [...(pval(params, "CONGES_MAJ_ANCIENNETE", anniv)?.paliers || [])].filter((p) => k >= p.apres_ans).sort((a, b) => b.apres_ans - a.apres_ans)[0];
    if (pal) j += pal.jours;
    const pe = pval(params, "CONGES_MAJ_ENFANTS", anniv); const n = Number(det?.nbEnfantsCharge) || 0;
    if (pe && n && det?.dateNaissance) {
      const age = ageAu(det.dateNaissance, plusJours(anniv, -1)); let e = 0;
      if (age < 21) e = Math.max(e, (pe.salarie_moins_21_ans?.jours_par_enfant || 0) * n);
      if (age > 18) e = Math.max(e, (pe.salarie_plus_18_ans?.jours_par_enfant || 0) * Math.max(0, n - ((pe.salarie_plus_18_ans?.a_partir_du_rang || 1) - 1)));
      j += e;
    }
    if (det?.medailleTravail) j += Number(pval(params, "CONGES_MAJ_AUTRES", anniv)?.medaille_travail_jours) || 0;
    if (j) { majorations += j; lignesMaj.push({ date: anniv, jours: j }); }
  }
  const conges = abs.filter((a) => a.type === "conge_paye" && a.dateDebut <= fin);
  const pris = r2(conges.reduce((t, a) => t + (Number(a.joursOuvrables) || 0), 0));
  const ajustements = r2((adjustments || []).filter((x) => x.employeeId === emp.id && x.dateEffet <= fin).reduce((t, x) => t + (Number(x.jours) || 0), 0));
  const regles = pval(params, "CONGES_REGLES", today) || { ouverture_mois: 12, prise_dans_mois: 12 };
  const dernierRetour = conges.filter((a) => a.dateFin < today).map((a) => plusJours(a.dateFin, 1)).sort().pop() || debut;
  const droitOuvert = fin >= plusMois(debut, regles.ouverture_mois);
  const echeance = plusMois(dernierRetour, (regles.ouverture_mois || 12) + (regles.prise_dans_mois || 12));
  const solde = r2(acquisBase + majorations + ajustements - pris);
  return { debut, moisEffectifs: r2(moisEffectifs), acquisBase, majorations, lignesMaj, ajustements, pris, solde, droitOuvert,
    ouverture: plusMois(debut, regles.ouverture_mois || 12), dernierRetour, echeance, enRetard: droitOuvert && today > echeance && solde >= 1 };
}

/* ---------- Contrôles d'une absence avant enregistrement ---------- */
export function controleAbsence({ absence: a, emp, absences, params, holidays, solde, today }) {
  const msgs = [];                                              // { niveau: "bloquant" | "orange" | "info", texte }
  if (!a.dateDebut || !a.dateFin) return [{ niveau: "bloquant", texte: "Indiquez les dates de début et de fin." }];
  if (a.dateFin < a.dateDebut) return [{ niveau: "bloquant", texte: "La date de fin précède la date de début." }];
  const autres = (absences || []).filter((x) => x.id !== a.id && x.employeeId === a.employeeId && ["demande", "valide"].includes(x.statut) && chevauche(x, a));
  if (autres.length) msgs.push({ niveau: "bloquant", texte: `Chevauchement avec : ${autres.map((x) => `${ABSENCE_TYPES[x.type]?.label} du ${fmt(x.dateDebut)} au ${fmt(x.dateFin)}`).join(" ; ")}.` });
  if (emp?.dateEmbauche && a.dateDebut < emp.dateEmbauche) msgs.push({ niveau: "bloquant", texte: "L'absence commence avant la date d'embauche." });
  const jo = joursOuvrables(a.dateDebut, a.dateFin, holidays);
  if (a.type === "conge_paye") {
    if (solde && !solde.droitOuvert) msgs.push({ niveau: "orange", texte: `Droit de jouissance ouvert seulement le ${fmt(solde.ouverture)} (un an de service effectif — Code du travail, art. 25.4). Un congé anticipé suppose l'accord écrit du salarié.` });
    /* Une absence déjà validée est comptée dans le solde : on la rajoute pour la contrôler */
    const deja = a.id ? Number((absences || []).find((x) => x.id === a.id && x.statut === "valide" && x.type === "conge_paye")?.joursOuvrables) || 0 : 0;
    if (solde && jo > solde.solde + deja + 0.001) msgs.push({ niveau: "orange", texte: `${jo} jours ouvrables demandés pour un solde de ${fmt2(solde.solde + deja)} jours.` });
    const org = pval(params, "CONGES_ORGANISATION", today);
    if (org && a.statut === "demande" && ecartJours(today, a.dateDebut) < org.prevenance_jours) msgs.push({ niveau: "orange", texte: `Départ dans moins de ${org.prevenance_jours} jours : la date doit être communiquée au salarié au moins ${org.prevenance_jours} jours à l'avance (CCI, art. 70).` });
  }
  if (a.type === "permission") {
    const p = pval(params, "PERMISSIONS_EXCEPTIONNELLES", a.dateDebut);
    if (p) {
      if (emp?.dateEmbauche && ancienneteMois(emp.dateEmbauche, a.dateDebut) < p.anciennete_min_mois) msgs.push({ niveau: "orange", texte: `Ancienneté inférieure à ${p.anciennete_min_mois} mois : la permission exceptionnelle n'est pas due (CCI, art. 25).` });
      const ev = (p.evenements || []).find((x) => x.code === a.evenement);
      if (!ev) msgs.push({ niveau: "bloquant", texte: "Choisissez l'événement familial." });
      else if (jo > ev.jours) msgs.push({ niveau: "orange", texte: `${ev.libelle} : ${ev.jours} jour(s) ouvrable(s) au plus. Les jours au-delà relèvent d'une autre absence (délais de route non rémunérés, congé ou absence non payée).` });
      const an = a.dateDebut.slice(0, 4);
      const deja = (absences || []).filter((x) => x.id !== a.id && x.employeeId === a.employeeId && x.type === "permission" && x.statut === "valide" && x.dateDebut.slice(0, 4) === an)
        .reduce((t, x) => t + (Number(x.joursOuvrables) || 0), 0);
      if (deja + jo > p.plafond_annuel_jours) msgs.push({ niveau: "orange", texte: `Plafond annuel de ${p.plafond_annuel_jours} jours de permission dépassé (${deja} déjà accordés en ${an}).` });
    }
  }
  if (a.type === "maladie" && !a.justificatifId) msgs.push({ niveau: "info", texte: "Certificat médical à produire dans les 8 jours francs (CCI, art. 28)." });
  if (a.type === "mise_a_pied" && jo > (Number(pval(params, "DISCIPLINE", a.dateDebut)?.mise_a_pied_max_jours) || 8)) msgs.push({ niveau: "bloquant", texte: "Une mise à pied ne peut pas dépasser 8 jours (Code du travail, art. 17.3)." });
  return msgs;
}

/* ══════════════════════ PAIE ══════════════════════ */
/* Nombre de parts pour la réduction d'ITS (annexe A.1.5) */
export function partsITS(det, params, date) {
  if (det?.partsItsForce !== null && det?.partsItsForce !== undefined && det?.partsItsForce !== "") return Number(det.partsItsForce);
  const p = pval(params, "ITS_PARTS", date); if (!p) return 1;
  const s = det?.situationFamille || "celibataire"; const n = Number(det?.nbEnfantsCharge) || 0;
  const v = n === 0 ? (p.sans_enfant?.[s] ?? 1) : (p.avec_enfants_base?.[s] ?? 1.5) + (p.par_enfant || 0.5) * n;
  return Math.min(p.plafond || 5, v);
}
export function personnesCMU(det, params, date) {
  if (det?.cmuPersonnes !== null && det?.cmuPersonnes !== undefined && det?.cmuPersonnes !== "") return Number(det.cmuPersonnes);
  const plafond = Number(pval(params, "CMU_PLAFOND_ENFANTS", date)?.nombre) || 0;
  return 1 + (det?.conjointCmu ? 1 : 0) + Math.min(Number(det?.nbEnfantsCharge) || 0, plafond);
}
const arrondi = (x, mode) => (mode === "superieur" ? Math.ceil(x - 1e-9) : mode === "inferieur" ? Math.floor(x + 1e-9) : Math.round(x + 1e-9));
export function itsBrut(imposable, params, date) {
  const t = pval(params, "ITS_BAREME", date)?.tranches || [];
  return t.reduce((s, x) => s + Math.max(0, Math.min(imposable, x.plafond ?? Infinity) - x.plancher) * x.taux / 100, 0);
}
export function reductionITS(parts, params, date) {
  const rows = pval(params, "ITS_REDUCTION_FAMILLE", date)?.reductions || [];
  const r = [...rows].filter((x) => x.parts <= parts).sort((a, b) => b.parts - a.parts)[0];
  return r ? r.mensuel : 0;
}
export function calcITS(imposable, parts, params, date) {
  const mode = pval(params, "ARRONDIS_PAIE", date)?.its || "plus_proche";
  return Math.max(0, arrondi(itsBrut(imposable, params, date) - reductionITS(parts, params, date), mode));
}
/* Prime d'ancienneté : taux selon les années révolues (CCI art. 55) */
export function tauxAnciennete(annees, params, date) {
  const p = pval(params, "PRIME_ANCIENNETE", date); if (!p || annees < p.debut_ans) return 0;
  return Math.min(p.plafond_taux, p.taux_initial + (annees - p.debut_ans) * p.increment_par_an);
}
/* Jours payés sur une base de 30, entrée ou sortie en cours de mois (pratique constatée sur les bulletins) */
export function joursBase30(debutMois, finMois, debut, fin) {
  const d1 = maxIso(debutMois, debut), d2 = minIso(finMois, fin || finMois);
  if (d2 < d1) return 0;
  if (d1 === debutMois && d2 === finMois) return 30;
  const j1 = Number(d1.slice(8, 10)); const j2 = d2 === finMois ? 30 : Math.min(30, Number(d2.slice(8, 10)));
  return Math.max(0, j2 - j1 + 1);
}
/* Salaire mensuel moyen des 12 derniers bulletins validés (CCI art. 71 ; remboursements de frais exclus) */
export function salaireMoyen12(historique, avant, defaut) {
  const bs = (historique || []).filter((b) => b.statut === "valide" && b.periodeFin && b.periodeFin < avant).sort((a, b) => (a.periodeFin < b.periodeFin ? 1 : -1)).slice(0, 12);
  if (!bs.length) return { montant: r2(defaut), source: "rémunération mensuelle actuelle (aucun bulletin antérieur)", mois: 0 };
  const total = bs.reduce((t, b) => t + Number(b.brut || 0) - (b.lignes || []).filter((l) => ["2500", "2600"].includes(l.code)).reduce((s, l) => s + (l.gain || 0), 0), 0);
  return { montant: r2(total / bs.length), source: `moyenne de ${bs.length} bulletin(s) validé(s)`, mois: bs.length };
}
export const RUB = {
  base: "100", surs: "200", anc: "1000", hs: { h41_46: "1500", h47_plus: "1510", nuit: "1520", dim_ferie_jour: "1530", dim_ferie_nuit: "1540" },
  conges: "2500", compCong: "2600", grat: "3150", preavis: "3500", its: "4300", cnps: "4400", retraite: "4700", pf: "4800", at: "4900",
  itsPat: "5000", ta: "5200", fpc: "5300", cmu: "6500", transport: "7050", panier: "7060", licenciement: "7200", finCdd: "7210", retraiteInd: "7220",
  deces: "7230", funeraires: "7240", avance: "8000",
};
/* Rémunération mensuelle de référence (salaire + sursalaire + ancienneté + gains fixes), pour les estimations */
export function remunerationReference({ emp, contract, elements, params, scale, date }) {
  if (!contract) return 0;
  const minCat = minimumCategoriel(scale, contract.categorie, contract.echelon, date);
  const anc = tauxAnciennete(Math.floor(ancienneteMois(emp?.dateEmbauche || contract.dateDebut, date) / 12), params, date);
  const gains = (elements || []).filter((e) => e.employeeId === emp?.id && e.actif && e.nature === "gain" && e.dateDebut <= date && (!e.dateFin || e.dateFin >= date)).reduce((t, e) => t + Number(e.montant), 0);
  return remunerationMensuelle(contract) + Math.round((minCat ?? contract.salaireBase) * anc / 100) + gains;
}

/* Calcul complet d'un bulletin. Toutes les rubriques et tous les taux viennent des paramètres. */
export function calcBulletin({ emp, det, contract, period, params, scale, settings, elements = [], absences = [], historique = [], termination = null, variables = {} }) {
  const v = variables || {};
  const debutM = debutDuMois(period.annee, period.mois), finM = finDuMois(period.annee, period.mois);
  const lignes = []; const anomalies = [];
  const out = { lignes, anomalies, brut: 0, imposable: 0, cotisationsSalariales: 0, cotisationsPatronales: 0, cmu: 0, indemnites: 0, retenues: 0, net: 0, cout: 0, joursPayes: 0, heures: 0, parts: 1 };
  if (!contract) { anomalies.push({ niveau: "bloquant", texte: "Aucun contrat couvrant ce mois." }); return out; }
  if (contract.type === "stage") anomalies.push({ niveau: "orange", texte: "Stagiaire : l'indemnité de stage n'est pas un salaire ; vérifiez son traitement avant de valider." });
  const debutC = maxIso(contract.dateDebut, emp.dateEmbauche || contract.dateDebut);
  const finC = [contract.dateFin, emp.dateSortie].filter(Boolean).sort()[0] || null;
  const jc = joursBase30(debutM, finM, debutC, finC);
  if (!jc) { anomalies.push({ niveau: "bloquant", texte: "Le contrat ne couvre aucun jour de ce mois." }); return out; }
  const d1 = maxIso(debutM, debutC), d2 = minIso(finM, finC || finM);
  /* Absences validées du mois : jours retirés du salaire (le congé payé est réglé par l'allocation) */
  const absMois = absences.filter((a) => a.employeeId === emp.id && a.statut === "valide" && a.dateDebut <= d2 && a.dateFin >= d1);
  let deduction = 0; const detailsAbs = [];
  const mat = pval(params, "MATERNITE", finM);
  const maladiePar = maladieMaintien({ emp, contract, absences, params, annee: period.annee, jusqua: d1 });
  for (const a of absMois) {
    const j = joursCalendaires(maxIso(a.dateDebut, d1), minIso(a.dateFin, d2));
    if (a.type === "conge_paye") { deduction += j; detailsAbs.push(`${j} j de congé payé`); }
    else if (a.type === "maternite") { const pe = Number(mat?.part_employeur ?? 1); deduction += j * (1 - pe); detailsAbs.push(`${j} j de maternité (${Math.round(pe * 100)} % à la charge de l'employeur)`); }
    else if (a.type === "maladie") { const r = maladiePar(j); deduction += r.deduction; detailsAbs.push(`${j} j de maladie${r.deduction ? ` dont ${fmt2(r.deduction)} non maintenu(s)` : ""}`); }
    else if (!a.remuneree) { deduction += j; detailsAbs.push(`${j} j ${ABSENCE_TYPES[a.type]?.label.toLowerCase() || "d'absence"}`); }
    if (a.type === "accident_travail") anomalies.push({ niveau: "info", texte: "Accident du travail : salaire maintenu par l'employeur ; déduisez les indemnités journalières CNPS si elles lui sont versées." });
  }
  deduction += Number(v.joursAbsence) || 0;
  const jp = Math.max(0, Math.min(jc, r2(jc - deduction)));
  out.joursPayes = jp; out.detailsAbsences = detailsAbs;
  const prorata = (m) => Math.round(m * jp / 30);
  const gain = (code, libelle, nombre, base, taux, montant, soumis = true) => { if (!montant) return; lignes.push({ code, libelle, nombre, base, taux, gain: montant, section: soumis ? "gain" : "apres", soumis }); };
  /* Salaire */
  const salaireBase = Number(contract.salaireBase) || 0;
  const surs = v.sursalaire !== undefined && v.sursalaire !== "" && v.sursalaire !== null ? Number(v.sursalaire) : Number(contract.sursalaire) || 0;
  gain(RUB.base, contract.type === "stage" ? "INDEMNITÉ DE STAGE" : "SALAIRE DE BASE", jp, salaireBase, null, prorata(salaireBase));
  gain(RUB.surs, "SURSALAIRE", jp, surs, null, prorata(surs));
  /* Prime d'ancienneté sur le minimum de la catégorie (à défaut : salaire catégoriel du contrat) */
  const annees = Math.floor(ancienneteMois(emp.dateEmbauche || contract.dateDebut, finM) / 12);
  const taux = contract.type === "stage" ? 0 : tauxAnciennete(annees, params, finM);
  const minCat = minimumCategoriel(scale, contract.categorie, contract.echelon, finM);
  if (taux) {
    const baseAnc = minCat ?? salaireBase;
    if (minCat === null) anomalies.push({ niveau: "orange", texte: `Minimum de la catégorie ${contract.categorie} absent de la grille : prime d'ancienneté calculée sur le salaire catégoriel du contrat.` });
    gain(RUB.anc, "PRIME D'ANCIENNETÉ", jp, baseAnc, taux, Math.round(baseAnc * taux / 100 * jp / 30));
  }
  /* Éléments fixes du salarié */
  const fixes = elements.filter((e) => e.employeeId === emp.id && e.actif && e.dateDebut <= finM && (!e.dateFin || e.dateFin >= debutM));
  fixes.filter((e) => e.nature === "gain").forEach((e, i) => gain(String(1100 + i), e.libelle.toUpperCase(), e.prorata ? jp : null, Number(e.montant), null, e.prorata ? prorata(Number(e.montant)) : Number(e.montant)));
  /* Heures supplémentaires (décret 2024-898, art. 25) */
  const div = Number(pval(params, "DIVISEUR_HORAIRE_MENSUEL", finM)?.heures) || 173.33;
  const tauxHoraire = (salaireBase + surs) / div;
  const maj = pval(params, "HS_MAJORATIONS", finM)?.majorations || [];
  for (const m of maj) {
    const h = Number(v.heuresSup?.[m.code]) || 0; if (!h) continue;
    gain(RUB.hs[m.code] || "1590", `HEURES SUP. ${m.libelle.toUpperCase()}`, h, r2(tauxHoraire), 100 + m.taux, Math.round(h * tauxHoraire * (100 + m.taux) / 100));
  }
  const plafHS = pval(params, "HS_PLAFONDS", finM);
  const totalHS = Object.values(v.heuresSup || {}).reduce((t, x) => t + (Number(x) || 0), 0);
  if (plafHS && totalHS > plafHS.hebdo * 5) anomalies.push({ niveau: "orange", texte: `${totalHS} heures supplémentaires dans le mois : vérifiez les plafonds (${plafHS.hebdo} h par semaine, ${plafHS.annuel} h par an).` });
  /* Allocation de congé (CCI art. 71) : congés commençant dans le mois */
  const conges = absences.filter((a) => a.employeeId === emp.id && a.statut === "valide" && a.type === "conge_paye" && a.dateDebut >= debutM && a.dateDebut <= finM);
  const joursAlloc = v.allocationJours !== undefined && v.allocationJours !== "" ? Number(v.allocationJours) : conges.reduce((t, a) => t + joursCalendaires(a.dateDebut, a.dateFin), 0);
  if (joursAlloc > 0 || (v.allocationMontant !== undefined && v.allocationMontant !== "")) {
    const smm = salaireMoyen12(historique, conges[0]?.dateDebut || debutM, remunerationReference({ emp, contract, elements, params, scale, date: finM }));
    const montant = v.allocationMontant !== undefined && v.allocationMontant !== "" ? Number(v.allocationMontant) : Math.round(smm.montant / 30 * joursAlloc);
    gain(RUB.conges, "ALLOCATION DE CONGÉ", joursAlloc, smm.montant, null, montant);
    out.allocation = { jours: joursAlloc, smm };
  }
  /* Gratification (CCI art. 53) */
  if (v.gratification) {
    const g = pval(params, "GRATIFICATION", finM);
    const debutAn = `${period.annee}-01-01`; const finServ = minIso(finM, finC || finM);
    const du = dureeEntre(maxIso(debutAn, emp.dateEmbauche || debutC), finServ);
    const fraction = Math.min(12, du.mois + du.jours / 30) / 12;
    const montant = v.gratificationMontant !== undefined && v.gratificationMontant !== "" ? Number(v.gratificationMontant)
      : Math.round((Number(g?.fraction_minimum_categoriel) || 0) * (minCat ?? salaireBase) * (g?.prorata === false ? 1 : fraction));
    gain(RUB.grat, "GRATIFICATION", null, minCat ?? salaireBase, null, montant);
  }
  /* Éléments de sortie (fin de contrat validée ou en préparation) */
  const sortie = v.inclureSortie !== false && termination && termination.dateSortie >= debutM && termination.dateSortie <= finM ? termination.calcul : null;
  if (sortie) for (const l of sortie.lignes) {
    if (!l.montant) continue;
    if (l.retenue) continue;
    gain(l.code, l.libelle.toUpperCase(), null, null, null, Math.round(l.montant), l.soumis);
  }
  /* Primes ponctuelles */
  (v.primes || []).forEach((p, i) => { const m = Number(p.montant) || 0; if (m && (p.libelle || "").trim()) gain(String(1900 + i), p.libelle.toUpperCase(), null, null, null, Math.round(m), p.soumis !== false); });
  /* Indemnité de transport : non soumise jusqu'au plafond, l'excédent est imposable */
  const transportPlein = v.transport !== undefined && v.transport !== "" ? Number(v.transport) : contract.type === "stage" ? 0 : Number(settings?.primeTransport) || 0;
  const transport = prorata(transportPlein);
  const plafT = Number(pval(params, "INDEMNITE_TRANSPORT", finM)?.plafond_exoneration) || 0;
  const plafProrata = Math.round(plafT * jp / 30);
  if (transport > plafProrata && plafT) gain("1950", "TRANSPORT (PART IMPOSABLE)", null, null, null, transport - plafProrata);
  /* Totaux soumis */
  const brut = lignes.filter((l) => l.soumis && l.gain).reduce((t, l) => t + l.gain, 0);
  out.brut = brut; out.imposable = brut;
  /* Retenues salariales et charges patronales */
  const parts = partsITS(det, params, finM); out.parts = parts;
  const its = calcITS(brut, parts, params, finM);
  const cot = (code, libelle, base, tauxS, tauxP) => {
    const ret = tauxS ? Math.round(base * tauxS / 100 + 1e-9) : 0; const pat = tauxP ? Math.round(base * tauxP / 100 + 1e-9) : 0;
    lignes.push({ code, libelle, base, taux: tauxS || null, retenue: ret, tauxPat: tauxP || null, pat, section: "cotisation" });
    return { ret, pat };
  };
  lignes.push({ code: RUB.its, libelle: "ITS", base: brut, taux: null, retenue: its, section: "cotisation", detail: `${parts} part(s)` });
  const ret = pval(params, "CNPS_RETRAITE", finM) || {}; const pf = pval(params, "CNPS_PRESTATIONS_FAMILIALES", finM) || {};
  const matP = pval(params, "CNPS_MATERNITE", finM) || {}; const at = pval(params, "CNPS_AT_MP", finM) || {};
  const exp = !!det?.expatrie;
  const assRet = Math.min(brut, Number(ret.plafond) || Infinity);
  const c1 = cot(RUB.cnps, "C.N.P.S (retraite)", assRet, Number(ret.salarie) || 0, 0);
  const c2 = cot(RUB.retraite, "RETRAITE GÉNÉRALE", assRet, 0, Number(ret.employeur) || 0);
  const tauxPF = (Number(pf.employeur) || 0) + (pf.bulletin_ligne_unique_avec_maternite ? Number(matP.employeur) || 0 : 0);
  const c3 = cot(RUB.pf, "PRESTATIONS FAMILIALES", Math.min(brut, Number(pf.plafond) || Infinity), 0, tauxPF);
  const c3b = pf.bulletin_ligne_unique_avec_maternite ? { pat: 0 } : cot("4810", "ASSURANCE MATERNITÉ", Math.min(brut, Number(matP.plafond) || Infinity), 0, Number(matP.employeur) || 0);
  const c4 = cot(RUB.at, "ACCIDENT DU TRAVAIL", Math.min(brut, Number(at.plafond) || Infinity), 0, Number(at.employeur) || 0);
  const c5 = cot(RUB.itsPat, "PART PATRONALE I.S LOCAUX", brut, 0, Number(pval(params, "ITS_PART_PATRONALE", finM)?.local) || 0);
  const c6 = cot(RUB.ta, "TAXE D'APPRENTISSAGE", brut, 0, Number(pval(params, "FDFP_TAXE_APPRENTISSAGE", finM)?.taux) || 0);
  const c7 = cot(RUB.fpc, "TAXE F.P.C", brut, 0, Number(pval(params, "FDFP_FORMATION_CONTINUE", finM)?.taux) || 0);
  if (exp) anomalies.push({ niveau: "orange", texte: "Salarié expatrié : la contribution employeur est de 12 % ; vérifiez les taux appliqués." });
  out.cotisationsSalariales = its + c1.ret;
  out.cotisationsPatronales = c1.pat + c2.pat + c3.pat + c3b.pat + c4.pat + c5.pat + c6.pat + c7.pat;
  /* Après cotisations : CMU, indemnités non soumises, retenues diverses */
  const cmuPers = personnesCMU(det, params, finM);
  const cmu = cmuPers * (Number(pval(params, "CMU_SALARIE", finM)?.montant_par_personne) || 0);
  if (cmu) lignes.push({ code: RUB.cmu, libelle: "CMU", nombre: cmuPers, retenue: cmu, section: "apres" });
  out.cmu = cmu;
  const indem = [];
  if (transport) indem.push({ code: RUB.transport, libelle: "PRIME DE TRANSPORT", nombre: jp, base: transportPlein, gain: Math.min(transport, plafT ? plafProrata : transport) });
  const paniers = Number(v.paniers) || 0;
  if (paniers) { const smigh = (Number(pval(params, "SMIG_MENSUEL", finM)?.montant) || 0) / div; const mult = Number(pval(params, "PRIME_PANIER", finM)?.multiple_smig_horaire) || 0;
    indem.push({ code: RUB.panier, libelle: "PRIME DE PANIER", nombre: paniers, base: Math.round(smigh * mult), gain: Math.round(paniers * smigh * mult) }); }
  fixes.filter((e) => e.nature === "indemnite").forEach((e, i) => indem.push({ code: String(7100 + i), libelle: e.libelle.toUpperCase(), nombre: e.prorata ? jp : null, base: Number(e.montant), gain: e.prorata ? prorata(Number(e.montant)) : Number(e.montant) }));
  lignes.filter((l) => l.section === "apres" && l.gain).forEach((l) => indem.push(l));
  for (let i = lignes.length - 1; i >= 0; i--) if (lignes[i].section === "apres" && lignes[i].gain) lignes.splice(i, 1);
  indem.forEach((l) => lignes.push({ ...l, section: "apres" }));
  out.indemnites = indem.reduce((t, l) => t + (l.gain || 0), 0);
  const retenues = [];
  fixes.filter((e) => e.nature === "retenue").forEach((e, i) => retenues.push({ code: String(8100 + i), libelle: e.libelle.toUpperCase(), retenue: Number(e.montant) }));
  (v.retenues || []).forEach((r, i) => { const m = Number(r.montant) || 0; if (m && (r.libelle || "").trim()) retenues.push({ code: String(8000 + i), libelle: r.libelle.toUpperCase(), retenue: Math.round(m) }); });
  if (sortie) sortie.lignes.filter((l) => l.retenue && l.montant).forEach((l) => retenues.push({ code: l.code, libelle: l.libelle.toUpperCase(), retenue: Math.round(Math.abs(l.montant)) }));
  retenues.forEach((l) => lignes.push({ ...l, section: "apres" }));
  out.retenues = retenues.reduce((t, l) => t + l.retenue, 0);
  out.net = brut - out.cotisationsSalariales - cmu + out.indemnites - out.retenues;
  out.cout = brut + out.cotisationsPatronales + out.indemnites;
  out.heures = Math.round(div * (Number(contract.horaireHebdo) || 40) / 40 * jp / 30);
  /* Contrôles */
  if (out.net < 0) anomalies.push({ niveau: "bloquant", texte: "Net à payer négatif." });
  const plancher = plancherCategoriel(params, minCat, contract, finM);
  if (contract.type !== "stage" && plancher !== null && salaireBase < plancher) anomalies.push({ niveau: "bloquant", texte: `Salaire catégoriel (${fcfa(salaireBase)}) inférieur au minimum de la catégorie (${fcfa(plancher)}).` });
  const smig = smigProrata(params, contract.horaireHebdo, finM);
  if (contract.type !== "stage" && smig && salaireBase + surs < smig) anomalies.push({ niveau: "bloquant", texte: `Rémunération inférieure au SMIG (${fcfa(smig)}).` });
  if (!det) anomalies.push({ niveau: "orange", texte: "Données personnelles absentes : 1 part fiscale et 1 personne CMU retenues par défaut." });
  return out;
}

/* Maintien du salaire pendant la maladie (CCI art. 29, ouvriers et employés), par année civile */
function maladieMaintien({ emp, contract, absences, params, annee, jusqua }) {
  const p = pval(params, "MALADIE_INDEMNISATION", jusqua);
  const anc = ancienneteMois(emp.dateEmbauche || contract.dateDebut, jusqua);
  const pal = (p?.paliers || []).find((x) => x.jusqu_mois === null || x.jusqu_mois === undefined || anc < x.jusqu_mois);
  const plein = (pal?.plein_mois || 0) * 30; const demi = (pal?.demi_mois || 0) * 30;
  let deja = (absences || []).filter((a) => a.employeeId === emp.id && a.statut === "valide" && a.type === "maladie" && a.dateFin < jusqua && a.dateFin >= `${annee}-01-01`)
    .reduce((t, a) => t + joursCalendaires(maxIso(a.dateDebut, `${annee}-01-01`), a.dateFin), 0);
  return (j) => {
    let deduction = 0;
    for (let k = 0; k < j; k++) { deja++; if (deja > plein + demi) deduction += 1; else if (deja > plein) deduction += 0.5; }
    return { deduction };
  };
}

/* Calcul à l'envers : sursalaire donnant le net visé (le net croît avec le sursalaire) */
export function sursalairePourNet(args, netCible) {
  const net = (s) => calcBulletin({ ...args, variables: { ...(args.variables || {}), sursalaire: s } }).net;
  const cible = Number(netCible); if (!(cible > 0)) return null;
  let lo = 0, hi = Math.max(1000, cible * 4);
  if (net(lo) >= cible) return { sursalaire: 0, net: net(0) };
  for (let i = 0; i < 60 && hi - lo > 1; i++) { const mid = Math.floor((lo + hi) / 2); if (net(mid) >= cible) hi = mid; else lo = mid; }
  const nHi = net(hi), nLo = net(lo);
  const choix = Math.abs(nLo - cible) < Math.abs(nHi - cible) ? lo : hi;
  return { sursalaire: choix, net: net(choix) };
}

/* ══════════════════════ FIN DE CONTRAT ══════════════════════ */
export const MOTIFS_SORTIE = {
  demission: "Démission", licenciement_personnel: "Licenciement pour motif personnel", licenciement_economique: "Licenciement pour motif économique",
  fin_cdd: "Fin de CDD", rupture_essai: "Rupture de la période d'essai", retraite: "Départ à la retraite", deces: "Décès",
  accord_parties: "Rupture d'un commun accord", fin_stage: "Fin de stage", autre: "Autre",
};
export const PREAVIS_MODES = { effectue: "Préavis effectué", dispense_employeur: "Dispensé par l'employeur (indemnité versée)", non_effectue_salarie: "Non effectué du fait du salarié", sans_objet: "Sans objet" };
/* Indemnité progressive par tranches d'années (décret 2017-210, art. 4 ; CCI art. 39) */
export function indemniteProgressive(moisAnciennete, salaireRef, tranches) {
  const annees = Math.floor(moisAnciennete) / 12; let reste = annees; let prec = 0; let total = 0; const detail = [];
  for (const t of tranches || []) {
    const borne = t.jusqu_annee === null || t.jusqu_annee === undefined ? Infinity : t.jusqu_annee;
    const part = Math.max(0, Math.min(reste, borne - prec));
    if (part > 0) { total += salaireRef * part * t.taux / 100; detail.push(`${fmt2(r2(part))} an(s) × ${t.taux} %`); }
    reste -= part; prec = borne; if (reste <= 0) break;
  }
  return { montant: Math.round(total), detail: detail.join(" + ") };
}
export function calcSortie({ emp, det, contract, t, params, scale, payslips = [], absences = [], adjustments = [], contracts = [], elements = [] }) {
  const date = t.dateSortie; const lignes = []; const alertes = [];
  if (!emp || !date) return { lignes, alertes, total: 0 };
  const anc = ancienneteMois(emp.dateEmbauche, date); const ancLib = libAnciennete(anc);
  const mensuel = remunerationReference({ emp, contract, elements, params, scale, date });
  const hist = payslips.filter((b) => b.employeeId === emp.id && b.statut === "valide").map((b) => ({ ...b }));
  const sgmCalc = salaireMoyen12(hist, plusJours(date, 1), mensuel);
  const sgm = t.salaireReference !== null && t.salaireReference !== undefined && t.salaireReference !== "" ? Number(t.salaireReference) : sgmCalc.montant;
  const minCat = contract ? minimumCategoriel(scale, contract.categorie, contract.echelon, date) : null;
  const motif = t.motif; const licenc = ["licenciement_personnel", "licenciement_economique"].includes(motif);
  const add = (code, libelle, montant, soumis, calcul, extra = {}) => lignes.push({ code, libelle, montant: Math.round(montant), soumis, calcul, ...extra });
  /* Préavis (décret 96-200 ; CCI art. 34 et 35) */
  let preavis = null;
  if (contract && ["demission", ...["licenciement_personnel", "licenciement_economique"], "retraite"].includes(motif) && !t.fauteLourde) {
    preavis = preavisPour(params, contract, det, anc, date);
    if (preavis) {
      const mois = preavis.unite === "mois" ? preavis.duree : preavis.duree / 30;
      preavis.dateFin = t.dateNotification ? plusJours(addPeriod(t.dateNotification, preavis.duree, preavis.unite), -1) : null;
      if (t.preavisMode === "dispense_employeur") add(RUB.preavis, "Indemnité compensatrice de préavis", mensuel * mois, true, `${preavis.libelle} × ${fcfa(mensuel)} par mois`);
      if (t.preavisMode === "non_effectue_salarie") add("8500", "Indemnité de préavis due par le salarié", -mensuel * mois, true, `${preavis.libelle} non effectué — retenue possible, à apprécier`, { retenue: true });
    }
  }
  const tr = pval(params, "INDEMNITE_LICENCIEMENT", date);
  const fisc = pval(params, "INDEMNITES_RUPTURE_FISCAL", date) || { soumises_its: false };
  const soumisRupt = !!fisc.soumises_its;
  if (licenc && !t.fauteLourde) {
    if (anc >= (Number(tr?.anciennete_min_ans) || 1) * 12) {
      const ind = indemniteProgressive(anc, sgm, tr?.tranches);
      add(RUB.licenciement, "Indemnité de licenciement", ind.montant, soumisRupt, `${ind.detail} de ${fcfa(sgm)}`);
    } else alertes.push({ niveau: "info", texte: "Moins d'un an d'ancienneté : pas d'indemnité de licenciement." });
  }
  if (motif === "retraite") {
    const ind = indemniteProgressive(anc, sgm, tr?.tranches); const r = pval(params, "INDEMNITE_RETRAITE", date);
    const smigh = (Number(pval(params, "SMIG_MENSUEL", date)?.montant) || 0) / (Number(pval(params, "DIVISEUR_HORAIRE_MENSUEL", date)?.heures) || 173.33);
    const plafond = r ? r.plafond_multiple_smig * smigh * r.base_heures_annuelles : Infinity;
    add(RUB.retraiteInd, "Indemnité de départ à la retraite", Math.min(ind.montant, plafond), soumisRupt, `${ind.detail} de ${fcfa(sgm)}${ind.montant > plafond ? ` — plafonnée à ${fcfa(Math.round(plafond))}` : ""}`);
  }
  if (motif === "deces") {
    if (anc >= 12) { const ind = indemniteProgressive(anc, sgm, tr?.tranches); add(RUB.deces, "Indemnité de décès (équivalente à l'indemnité de licenciement)", ind.montant, soumisRupt, `${ind.detail} de ${fcfa(sgm)}`); }
    const f = pval(params, "DECES_FRAIS_FUNERAIRES", date); const ans = anc / 12;
    const pal = (f?.tranches || []).find((x) => x.jusqu_annee === null || x.jusqu_annee === undefined || ans <= x.jusqu_annee);
    if (pal) { const base = minCat ?? contract?.salaireBase ?? 0; add(RUB.funeraires, "Participation aux frais funéraires", pal.multiple_minimum_categoriel * base, soumisRupt, `${pal.multiple_minimum_categoriel} × ${fcfa(base)}${minCat === null ? " (salaire catégoriel faute de grille)" : ""}`); }
    alertes.push({ niveau: "orange", texte: "Versement aux ayants droit en présence de l'inspecteur du travail, qui en dresse procès-verbal (décret 2017-210, art. 7)." });
  }
  if (motif === "fin_cdd" && contract?.type === "CDD") {
    const c = pval(params, "CDD_REGLES", date);
    const bruts = hist.filter((b) => b.contractId === contract.id).reduce((s, b) => s + Number(b.brut || 0), 0);
    const estime = !bruts; const base = bruts || mensuel * (dureeEntre(contract.dateDebut, date).mois + dureeEntre(contract.dateDebut, date).jours / 30);
    if (c) add(RUB.finCdd, "Indemnité de fin de contrat", base * c.indemnite_fin_taux / 100, soumisRupt, `${c.indemnite_fin_taux} % de ${fcfa(Math.round(base))}${estime ? " (estimation : aucun bulletin validé)" : ""}`);
  }
  /* Congés acquis non pris (CCI art. 71 et 72) */
  if (contract?.type !== "stage") {
    const s = soldeConges({ emp: { ...emp, dateSortie: date }, det, contracts, absences, adjustments, params, today: date });
    const fact = Number(pval(params, "CONVERSION_JOURS_CONGE", date)?.facteur) || 1;
    if (s && s.solde > 0) { const jcal = r2(s.solde * fact); add(RUB.compCong, "Indemnité compensatrice de congés payés", sgm / 30 * jcal, true, `${fmt2(s.solde)} j ouvrables × ${fact} = ${fmt2(jcal)} j calendaires × ${fcfa(sgm)} ÷ 30`); }
  }
  /* Gratification au prorata (CCI art. 53) */
  const g = pval(params, "GRATIFICATION", date);
  if (g && contract && contract.type !== "stage" && !t.fauteLourde) {
    const debutAn = `${date.slice(0, 4)}-01-01`;
    const deja = hist.some((b) => (b.lignes || []).some((l) => l.code === RUB.grat) && b.periodeFin >= debutAn);
    if (!deja) { const du = dureeEntre(maxIso(debutAn, emp.dateEmbauche), date); const base = minCat ?? contract.salaireBase;
      add(RUB.grat, "Gratification au prorata", g.fraction_minimum_categoriel * base * Math.min(12, du.mois + du.jours / 30) / 12, true, `${g.fraction_minimum_categoriel * 100} % de ${fcfa(base)} × ${du.libelle || "0 jour"} / 12`); }
  }
  /* Rupture pendant ou autour du congé (CCI art. 36) */
  const ag = pval(params, "AGGRAVATION_PREAVIS_CONGE", date);
  if (ag && licenc && t.dateNotification) {
    const pres = absences.some((a) => a.employeeId === emp.id && a.statut === "valide" && a.type === "conge_paye"
      && plusJours(a.dateDebut, -ag.jours_avant_apres) <= t.dateNotification && t.dateNotification <= plusJours(a.dateFin, ag.jours_avant_apres));
    if (pres) { const m = contract?.modePaiement === "mois" ? ag.mois_mensuel : ag.mois_horaire; add("3510", "Indemnité supplémentaire (rupture autour du congé)", mensuel * m, true, `${m} mois de salaire (CCI, art. 36)`);
      alertes.push({ niveau: "orange", texte: "Licenciement notifié pendant le congé ou dans les 15 jours avant ou après : indemnité supplémentaire due (CCI, art. 36)." }); }
  }
  if (t.fauteLourde) alertes.push({ niveau: "orange", texte: "Faute lourde : ni préavis, ni indemnité de licenciement, ni gratification. L'allocation de congé acquise reste due." });
  if (licenc) alertes.push({ niveau: "info", texte: "Notification écrite et motivée ; inspecteur du travail informé dans le même temps (Code du travail, art. 17.4 et 18.4)." });
  if (motif === "licenciement_economique") alertes.push({ niveau: "orange", texte: "Licenciement économique : réunion d'information avec les délégués sous la présidence de l'inspecteur, dossier transmis 15 jours ouvrables avant (art. 18.10 et 18.11) ; priorité de réembauche de 2 ans." });
  const total = lignes.reduce((s, l) => s + l.montant, 0);
  return { lignes, alertes, total, sgm, sgmSource: t.salaireReference ? "montant saisi" : sgmCalc.source, mensuel, anc, ancLib, preavis };
}

/* ══════════════════════ DISCIPLINE (Code du travail, art. 17.1 à 17.5) ══════════════════════ */
export const SANCTIONS = { avertissement: "Avertissement écrit", mise_a_pied_1_3: "Mise à pied de 1 à 3 jours", mise_a_pied_4_8: "Mise à pied de 4 à 8 jours", licenciement: "Licenciement", classement: "Classement sans suite" };
export function etatDiscipline(d, params, holidays, today) {
  const p = pval(params, "DISCIPLINE", d.dateFaits || today) || {};
  const r = { etape: "", alertes: [] };
  const prescription = d.dateConnaissance && p.prescription_faits_mois ? plusMois(d.dateConnaissance, p.prescription_faits_mois) : null;
  r.prescription = prescription;
  if (!d.demandeLe) { r.etape = "Demande d'explication à adresser"; if (prescription && today > prescription) r.alertes.push({ niveau: "rouge", texte: `Faits connus depuis plus de ${p.prescription_faits_mois} mois : ils ne peuvent plus être sanctionnés (à confirmer).` }); return r; }
  r.echeanceReponse = plusJours(d.demandeLe, Math.ceil((Number(p.reponse_heures) || 72) / 24));
  if (!d.sanction) {
    const depart = d.reponseLe || r.echeanceReponse;
    r.echeanceDecision = ajouterJoursOuvrables(depart, Number(p.notification_jours_ouvrables) || 15, holidays);
    r.etape = d.reponseLe ? "Décision à prendre" : today > r.echeanceReponse ? "Délai de réponse écoulé — décision à prendre" : "En attente des explications";
    if (today > r.echeanceDecision) r.alertes.push({ niveau: "rouge", texte: `Délai de notification dépassé (${fmt(r.echeanceDecision)}) : la sanction ne peut plus être notifiée (art. 17.5).` });
    else if (d.reponseLe || today > r.echeanceReponse) r.alertes.push({ niveau: "orange", texte: `Sanction à notifier au plus tard le ${fmt(r.echeanceDecision)} (15 jours ouvrables).` });
    return r;
  }
  if (d.sanction === "classement") { r.etape = "Classée sans suite"; return r; }
  r.etape = !d.notifieLe ? "Sanction à notifier" : !d.inspectionLe && d.sanction !== "classement" ? "Copie à adresser à l'inspecteur du travail" : "Procédure close";
  if (d.notifieLe && !d.inspectionLe) r.alertes.push({ niveau: "orange", texte: "Copie de la décision, de la demande et des explications à adresser à l'inspecteur du travail et au délégué (art. 17.5)." });
  if (d.notifieLe) r.invocableJusqua = plusMois(d.notifieLe, Number(p.invocation_mois) || 6);
  return r;
}

/* ══════════════════════ INDICATEURS ET DÉCLARATION ANNUELLE ══════════════════════ */
export function contratA(contracts, empId, date) {
  return (contracts || []).filter((c) => c.employeeId === empId && c.statut !== "annule" && c.dateDebut <= date && (!c.dateFin || c.dateFin >= date))
    .sort((a, b) => (a.dateDebut < b.dateDebut ? 1 : -1))[0] || null;
}
export function effectifA(employees, contracts, date) {
  return (employees || []).filter((e) => e.dateEmbauche && e.dateEmbauche <= date && (!e.dateSortie || e.dateSortie >= date)).filter((e) => { const c = contratA(contracts, e.id, date); return c && c.type !== "stage"; });
}
export function declarationAnnuelle({ employees, details, contracts }, annee) {
  const d1 = `${annee}-01-01`, d2 = `${annee}-12-31`;
  const debut = effectifA(employees, contracts, d1), fin = effectifA(employees, contracts, d2);
  const entrees = employees.filter((e) => e.dateEmbauche >= d1 && e.dateEmbauche <= d2);
  const sorties = employees.filter((e) => e.dateSortie && e.dateSortie >= d1 && e.dateSortie <= d2);
  const det = (id) => details.find((x) => x.employeeId === id) || {};
  const repartir = (liste, cle) => liste.reduce((m, e) => { const k = cle(e) || "Non renseigné"; m[k] = (m[k] || 0) + 1; return m; }, {});
  return {
    annee, effectifDebut: debut.length, effectifFin: fin.length, entrees, sorties,
    motifsSortie: repartir(sorties, (e) => e.motifSortie),
    parSexe: repartir(fin, (e) => (e.sexe === "F" ? "Femmes" : e.sexe === "M" ? "Hommes" : "")),
    parNationalite: repartir(fin, (e) => det(e.id).nationalite),
    parCategorie: repartir(fin, (e) => { const c = contratA(contracts, e.id, d2); return c ? `Catégorie ${c.categorie}` : ""; }),
    parContrat: repartir(fin, (e) => CONTRACT_TYPES[contratA(contracts, e.id, d2)?.type]),
  };
}

/* ══════════════════════ DOCUMENTS LIÉS AUX OBJETS ET ALERTES DE SUIVI ══════════════════════ */
/* « INDEMNITÉ DE CONGÉ » → « Indemnité de congé », sigles conservés (CNPS, ITS, CMU…) */
const SIGLES = /^(C\.?N\.?P\.?S\.?|CMU|ITS|IGR|FPC|F\.P\.C|IS|I\.S|AT|HS|SMIG)$/;
const casseLibelle = (s) => String(s || "").split(" ").map((w, i) => (SIGLES.test(w.replace(/[(),:;]/g, "")) ? w : i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join(" ");
const listeMontants = (lignes) => lignes.map((l, i) => `- ${l.libelle} : ${l.montant < 0 ? "moins " : ""}${fcfa(Math.abs(l.montant))}${i === lignes.length - 1 ? "." : " ;"}`).join("\n");
const libSanction = (d) => (d.sanction === "avertissement" ? "avertissement écrit" : /^mise_a_pied/.test(d.sanction)
  ? `mise à pied de ${Number(d.joursMiseAPied) || "…"} jour${Number(d.joursMiseAPied) > 1 ? "s" : ""}` : d.sanction === "licenciement" ? "licenciement" : "");
/* Valeurs propres à l'objet du document. sortieUI : calcul des sommes de rupture (calculSortieUI). */
export function contexteObjet(objet, { hr, today, sortieUI }) {
  const o = {}; if (!objet?.row) return { ctx: o, extra: {} };
  const r = objet.row; const extra = {};
  if (objet.type === "absence") {
    const ev = r.type === "permission" ? (pval(hr.params, "PERMISSIONS_EXCEPTIONNELLES", r.dateDebut)?.evenements || []).find((x) => x.code === r.evenement) : null;
    o["absence.libelle"] = ev ? `permission exceptionnelle — ${ev.libelle.charAt(0).toLowerCase()}${ev.libelle.slice(1)}` : (ABSENCE_TYPES[r.type]?.label || "").toLowerCase();
    o["absence.motif"] = r.motif || ""; o["absence.date_debut"] = dateLongue(r.dateDebut); o["absence.date_fin"] = dateLongue(r.dateFin);
    o["absence.date_reprise"] = dateLongue(r.dateReprise || prochainJourOuvrable(r.dateFin, hr.holidays));
    o["absence.jours_ouvrables"] = fmt2(r.joursOuvrables); o["absence.jours_calendaires"] = String(r.joursCalendaires || joursCalendaires(r.dateDebut, r.dateFin));
    o["absence.permission"] = r.type === "permission"; o["absence.remuneree"] = !!r.remuneree;
    if (r.type === "conge_paye") {
      const emp = hr.employees.find((e) => e.id === r.employeeId); const det = hr.details.find((d) => d.employeeId === r.employeeId) || null;
      const s = emp && r.statut === "valide" ? soldeConges({ emp, det, contracts: hr.contracts, absences: hr.absences, adjustments: hr.adjustments, params: hr.params, today: r.dateFin }) : null;
      o["absence.solde_apres"] = s ? fmt2(s.solde) : "";
      /* Estimation affichée seulement si au moins un bulletin validé sert de base (jamais d'invention) */
      const hist = hr.payslips.filter((b) => b.employeeId === r.employeeId && b.statut === "valide")
        .map((b) => { const p = hr.periods.find((x) => x.id === b.periodId); return { ...b, periodeFin: p ? finDuMois(p.annee, p.mois) : "" }; });
      if (emp && hist.length) {
        const ctr = contratA(hr.contracts, emp.id, r.dateDebut);
        const sm = salaireMoyen12(hist, r.dateDebut, remunerationReference({ emp, contract: ctr, elements: hr.elements, params: hr.params, scale: hr.scale, date: r.dateDebut }));
        const div = Number(pval(hr.params, "FORMULE_ALLOCATION_CONGE", r.dateDebut)?.diviseur_journalier) || 30;
        const jc = Number(r.joursCalendaires) || joursCalendaires(r.dateDebut, r.dateFin);
        o["absence.allocation"] = fcfa(Math.round(sm.montant / div * jc));
      } else o["absence.allocation"] = "";
    }
  }
  if (objet.type === "discipline") {
    const p = pval(hr.params, "DISCIPLINE", r.dateFaits || today);
    o["discipline.delai_reponse"] = p?.reponse_heures ? `${p.reponse_heures} heures` : "";
    o["sanction.faits"] = r.faits; o["sanction.date_faits"] = dateLongue(r.dateFaits); o["sanction.date_demande"] = dateLongue(r.demandeLe);
    o["sanction.date_reponse"] = dateLongue(r.reponseLe); o["sanction.date_notification"] = dateLongue(r.notifieLe);
    o["sanction.libelle"] = libSanction(r); o["sanction.mise_a_pied"] = /^mise_a_pied/.test(r.sanction || "");
    if (o["sanction.mise_a_pied"]) {
      const map = hr.absences.find((a) => a.employeeId === r.employeeId && a.type === "mise_a_pied" && ["demande", "valide"].includes(a.statut) && (!r.dateDecision || a.dateDebut >= r.dateDecision));
      if (map) { extra.date_debut = map.dateDebut; extra.date_fin = map.dateFin; extra.date_reprise = prochainJourOuvrable(map.dateFin, hr.holidays); }
    }
  }
  if (objet.type === "rupture") {
    const calc = sortieUI?.calc;
    o["rupture.motif_libelle"] = (MOTIFS_SORTIE[r.motif] || "").toLowerCase(); o["rupture.date_notification"] = dateLongue(r.dateNotification);
    o["rupture.date_sortie"] = dateLongue(r.dateSortie); o["rupture.faute_lourde"] = !!r.fauteLourde;
    o["rupture.preavis"] = calc?.preavis?.libelle || ""; o["rupture.date_fin_preavis"] = dateLongue(calc?.preavis?.dateFin);
    o["rupture.preavis_effectue"] = !!calc?.preavis && r.preavisMode === "effectue"; o["rupture.preavis_dispense"] = !!calc?.preavis && r.preavisMode === "dispense_employeur";
    /* Montant net : celui du bulletin du mois de sortie (salaire du mois + sommes de rupture − retenues) */
    const [y, m] = String(r.dateSortie || "").split("-").map(Number);
    const per = hr.periods.find((p) => p.annee === y && p.mois === m);
    const slip = per ? hr.payslips.find((b) => b.periodId === per.id && b.employeeId === r.employeeId && b.statut !== "annule") : null;
    if (slip) {
      const L = slip.lignes || [];
      const gains = L.filter((l) => (l.section === "gain" || l.section === "apres") && l.gain).map((l) => ({ libelle: casseLibelle(l.libelle), montant: l.gain }));
      const ret = L.filter((l) => l.section === "apres" && l.retenue).map((l) => ({ libelle: casseLibelle(l.libelle), montant: -l.retenue }));
      const lignes = [...gains, ...(slip.cotisationsSalariales ? [{ libelle: "Retenues sociales et fiscales (CNPS, ITS)", montant: -slip.cotisationsSalariales }] : []), ...ret];
      o["rupture.lignes"] = listeMontants(lignes); o["rupture.net"] = fcfa(slip.netAPayer); o["rupture.net_lettres"] = amountInWords(slip.netAPayer);
      o["rupture.total"] = fcfa(calc?.total || 0); o["rupture.bulletin"] = true;
    } else if (calc) {
      o["rupture.lignes"] = listeMontants(calc.lignes); o["rupture.total"] = fcfa(calc.total); o["rupture.net"] = ""; o["rupture.net_lettres"] = "";
    }
    extra.date_sortie = r.dateSortie || "";
  }
  if (objet.type === "candidat") {
    const g = r.sexe === "F" ? "Madame" : r.sexe === "M" ? "Monsieur" : "";
    o["candidat.civilite"] = g; o["candidat.madame_monsieur"] = g || "Madame, Monsieur"; o["candidat.nom_complet"] = `${r.nom} ${r.prenoms}`.trim();
    o["candidat.telephone"] = r.telephone || ""; o["candidat.poste"] = hr.openings.find((x) => x.id === r.openingId)?.intitule || "";
    if (r.entretienLe) {
      const d = new Date(r.entretienLe);
      o["candidat.entretien_date"] = dateLongue(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      o["candidat.entretien_heure"] = `${d.getHours()} h ${pad(d.getMinutes())}`;
    } else { o["candidat.entretien_date"] = ""; o["candidat.entretien_heure"] = ""; }
  }
  return { ctx: o, extra };
}
/* Alertes des lots 2 à 6 : congés, paie, sorties, discipline, santé, déclarations.
   Chaque alerte porte l'onglet où la traiter (tab). */
export function alertesSuivi(hr, today) {
  const A = []; const push = (a) => A.push({ id: `${a.code}-${a.ref || a.employeeId || "ent"}-${A.length}`, ...a });
  const nomDe = (id) => nomComplet(hr.employees.find((e) => e.id === id));
  const actifs = hr.employees.filter((e) => e.statut !== "sorti");
  /* Congés */
  for (const e of actifs) {
    const s = soldeConges({ emp: e, det: hr.details.find((d) => d.employeeId === e.id), contracts: hr.contracts, absences: hr.absences, adjustments: hr.adjustments, params: hr.params, today });
    if (s?.enRetard) push({ code: "conges_retard", niveau: "orange", employeeId: e.id, tab: "conges", titre: `${nomDe(e.id)} : ${fmt2(s.solde)} jours de congé à prendre (échéance dépassée le ${fmt(s.echeance)})`,
      detail: "Le congé doit être pris dans l'année qui suit l'ouverture du droit ; il ne peut pas être remplacé par une indemnité en cours de contrat (Code du travail, art. 25.5 et 25.11)." });
  }
  const demandes = hr.absences.filter((a) => a.statut === "demande");
  if (demandes.length) push({ code: "absences_demandes", niveau: demandes.some((a) => a.dateDebut <= plusJours(today, 7)) ? "orange" : "info", tab: "conges",
    titre: `${demandes.length} demande(s) d'absence ou de congé à traiter`, detail: demandes.slice(0, 4).map((a) => `${nomDe(a.employeeId)} — ${ABSENCE_TYPES[a.type]?.label} du ${fmt(a.dateDebut)}`).join(" · ") });
  for (const a of hr.absences.filter((x) => x.type === "maladie" && x.statut === "valide" && x.dateDebut <= today && x.dateFin >= today)) {
    let debut = a.dateDebut;
    for (let k = 0; k < 50; k++) { const prec = hr.absences.find((x) => x.employeeId === a.employeeId && x.type === "maladie" && x.statut === "valide" && x.dateFin < debut && x.dateFin >= plusJours(debut, -1)); if (!prec) break; debut = prec.dateDebut; }
    const e = hr.employees.find((x) => x.id === a.employeeId); const p = pval(hr.params, "MALADIE_SUSPENSION", today);
    if (!e || !p) continue;
    const ans = ancienneteMois(e.dateEmbauche, debut) / 12;
    const mois = [...(p.paliers || [])].filter((x) => ans >= x.des_ans).sort((x, y) => y.des_ans - x.des_ans)[0]?.mois || p.mois;
    const lim = plusMois(debut, mois);
    if (a.dateFin >= plusJours(lim, -30)) push({ code: "maladie_longue", niveau: a.dateFin >= lim ? "orange" : "info", employeeId: e.id, tab: "conges",
      titre: `${nomDe(e.id)} : arrêt maladie depuis le ${fmt(debut)}`, detail: `Le contrat est suspendu jusqu'au ${fmt(lim)} au plus (${mois} mois, CCI art. 28). Au-delà, l'employeur peut prendre acte de la rupture par lettre recommandée (CCI art. 37) ; maintien du salaire selon CCI art. 29.` });
  }
  /* Paie du mois précédent */
  if (hr.periods.length) {
    const [y, m] = today.split("-").map(Number); const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
    const p = hr.periods.find((x) => x.annee === py && x.mois === pm);
    if (!p || p.statut !== "validee") {
      const limite = plusJours(finDuMois(py, pm), 8);
      push({ code: "paie_a_valider", niveau: today > limite ? "rouge" : "orange", tab: "paie", ref: `${py}-${pm}`,
        titre: `Paie de ${MOIS_NOMS[pm - 1]} ${py} ${p ? "non validée" : "non ouverte"}`, detail: `Le salaire mensuel est payé au plus tard 8 jours après la fin du mois, soit le ${fmt(limite)} (Code du travail, art. 32.3).` });
    }
  }
  /* Sorties en préparation dont la date est passée */
  for (const t of hr.terminations.filter((x) => x.statut !== "valide" && x.dateSortie && x.dateSortie <= today))
    push({ code: "sortie_a_valider", niveau: "orange", tab: "sorties", ref: t.id, titre: `${nomDe(t.employeeId)} : sortie du ${fmt(t.dateSortie)} à valider`,
      detail: "Validez la sortie : le salarié passe « sorti », le contrat est terminé et le registre d'employeur est mis à jour." });
  /* Discipline */
  for (const d of hr.disciplinary) {
    const et = etatDiscipline(d, hr.params, hr.holidays, today);
    for (const x of et.alertes) push({ code: "discipline", niveau: x.niveau, tab: "discipline", ref: d.id, titre: `${nomDe(d.employeeId)} : procédure disciplinaire — ${et.etape.toLowerCase()}`, detail: x.texte });
  }
  /* Santé et sécurité */
  for (const a of hr.accidents.filter((x) => !x.declareCnpsLe)) {
    const h = Number(pval(hr.params, "AT_DECLARATION", today)?.delai_heures) || 48;
    const lim = a.dateAccident ? new Date(new Date(a.dateAccident).getTime() + h * 3600000) : null;
    push({ code: "at_non_declare", niveau: "rouge", tab: "sante", ref: a.id, titre: `${nomDe(a.employeeId)} : accident du travail non déclaré à la CNPS`,
      detail: `Déclaration dans les ${h} heures${lim ? `, soit avant le ${lim.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}` : ""}.` });
  }
  for (const e of actifs) {
    const vs = hr.visits.filter((v) => v.employeeId === e.id).sort((a, b) => (a.dateVisite < b.dateVisite ? 1 : -1));
    const der = vs[0];
    if (der?.prochaineDate && ecartJours(today, der.prochaineDate) <= 30) push({ code: "visite_medicale", niveau: der.prochaineDate < today ? "orange" : "info", employeeId: e.id, tab: "sante",
      titre: `${nomDe(e.id)} : visite médicale ${der.prochaineDate < today ? "en retard" : "à prévoir"} (${fmt(der.prochaineDate)})`, detail: "Date de prochaine visite fixée lors de la dernière visite." });
    if (der?.resultat === "inapte") push({ code: "inaptitude", niveau: "orange", employeeId: e.id, tab: "sante", titre: `${nomDe(e.id)} : déclaré inapte le ${fmt(der.dateVisite)}`, detail: "Rechercher un reclassement adapté avant toute autre décision." });
  }
  /* Déclarations à l'inspection */
  for (const ev of hr.events.filter((x) => !x.declareLe)) {
    const lim = plusJours(ev.dateEvenement, Number(pval(hr.params, "DECLARATION_CHANGEMENT", ev.dateEvenement)?.delai_jours) || 8);
    push({ code: "evenement_a_declarer", niveau: today > lim ? "rouge" : "orange", tab: "registre", ref: ev.id, titre: `Changement à déclarer à l'inspection du travail avant le ${fmt(lim)}`, detail: ev.description || "" });
  }
  /* Jours fériés de l'année */
  const an = today.slice(0, 4);
  if (!hr.holidays.some((h) => h.date.startsWith(an))) push({ code: "feries_absents", niveau: "orange", tab: "conges", titre: `Aucun jour férié saisi pour ${an}`, detail: "Les jours fériés ne sont pas décomptés des congés : saisissez le calendrier de l'année (Congés › Jours fériés)." });
  const aConf = hr.holidays.filter((h) => h.aConfirmer && h.date >= today && h.date <= plusJours(today, 60));
  if (aConf.length) push({ code: "feries_a_confirmer", niveau: "info", tab: "conges", titre: `Date à confirmer : ${aConf.map((h) => `${h.libelle} (${fmt(h.date)})`).join(", ")}`, detail: "Mettez à jour la date dès la publication du communiqué officiel." });
  if (today.slice(5, 7) === "12" && !hr.holidays.some((h) => h.date.startsWith(String(Number(an) + 1)))) push({ code: "feries_annee_suivante", niveau: "info", tab: "conges", titre: `Jours fériés de ${Number(an) + 1} à saisir`, detail: "" });
  return A;
}

/* ══════════════════════════════════════════════════════════════════════
   8. FENÊTRES DE SAISIE
   ══════════════════════════════════════════════════════════════════════ */
const EMP_VIDE = { nom: "", prenoms: "", sexe: "", poste: "", departmentId: "", managerId: "", dateEmbauche: "", statut: "actif", dateSortie: "", motifSortie: "", userId: "" };
const DET_VIDE = { dateNaissance: "", lieuNaissance: "", nationalite: "", pieceType: "", pieceNumero: "", situationFamille: "celibataire", nbEnfantsCharge: 0, enfants: [],
  cnpsNumero: "", cmuNumero: "", adresse: "", telephone: "", email: "", contactUrgence: { nom: "", lien: "", telephone: "" }, banque: "", numeroCompte: "",
  expatrie: false, medailleTravail: false, ippPlus40: false, partsItsForce: "", cmuPersonnes: "", conjointCmu: false };

function EmployeeModal({ initial, initialDet, employees, members, departments, onSave, onClose }) {
  const [f, setF] = useState(() => ({ ...EMP_VIDE, ...initial }));
  const [d, setD] = useState(() => ({ ...DET_VIDE, ...(initialDet || {}), contactUrgence: { ...DET_VIDE.contactUrgence, ...(initialDet?.contactUrgence || {}) } }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setDet = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const lies = new Set(employees.filter((e) => e.userId && e.id !== f.id).map((e) => e.userId));
  const comptes = members.filter((m) => m.active !== false && !lies.has(m.id));
  const submit = async () => {
    setBusy(true); setErr("");
    const r = await onSave(f, d); setBusy(false);
    /* Fiche créée mais données personnelles refusées : on garde l'identifiant
       pour qu'un nouvel essai mette à jour la fiche au lieu d'en créer une seconde */
    if (r?.error) { if (r.id && !f.id) set("id", r.id); setErr(r.error); } else onClose(r);
  };
  const enfant = (i, k, v) => setDet("enfants", d.enfants.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <Modal title={f.id ? `Dossier ${f.matricule || ""} — ${nomComplet(f)}` : "Nouveau dossier salarié"} onClose={() => onClose()} wide>
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--brass)" }}>Identité et poste</p>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Nom *"><input className={inputCls} style={inputStyle} value={f.nom} onChange={(e) => set("nom", e.target.value.toUpperCase())} /></Field>
        <Field label="Prénoms"><input className={inputCls} style={inputStyle} value={f.prenoms} onChange={(e) => set("prenoms", e.target.value)} /></Field>
        <Field label="Sexe"><select className={inputCls} style={inputStyle} value={f.sexe} onChange={(e) => set("sexe", e.target.value)}><option value="">—</option><option value="F">Féminin</option><option value="M">Masculin</option></select></Field>
        <Field label="Emploi occupé"><input className={inputCls} style={inputStyle} value={f.poste} onChange={(e) => set("poste", e.target.value)} placeholder="Ex. : Agent de recouvrement" /></Field>
        <Field label="Département"><select className={inputCls} style={inputStyle} value={f.departmentId} onChange={(e) => set("departmentId", e.target.value)}>
          <option value="">—</option>{departments.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Responsable hiérarchique" hint="Il verra le nom et le poste du salarié, jamais son salaire ni ses données personnelles.">
          <select className={inputCls} style={inputStyle} value={f.managerId} onChange={(e) => set("managerId", e.target.value)}>
            <option value="">—</option>{employees.filter((e) => e.id !== f.id && e.statut !== "sorti").map((e) => <option key={e.id} value={e.id}>{nomComplet(e)}</option>)}</select></Field>
        <Field label="Date d'embauche *" hint="Point de départ de l'ancienneté (période d'essai comprise)."><input type="date" className={inputCls} style={inputStyle} value={f.dateEmbauche} onChange={(e) => set("dateEmbauche", e.target.value)} /></Field>
        <Field label="Compte de l'application" hint="Permettra au salarié de consulter son propre dossier (lots suivants).">
          <select className={inputCls} style={inputStyle} value={f.userId} onChange={(e) => set("userId", e.target.value)}>
            <option value="">— Aucun —</option>{comptes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
        <Field label="Situation"><select className={inputCls} style={inputStyle} value={f.statut} onChange={(e) => set("statut", e.target.value)}>
          {Object.entries(EMP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
        {f.statut === "sorti" && <>
          <Field label="Date de sortie"><input type="date" className={inputCls} style={inputStyle} value={f.dateSortie} onChange={(e) => set("dateSortie", e.target.value)} /></Field>
          <Field label="Motif de sortie"><input className={inputCls} style={inputStyle} value={f.motifSortie} onChange={(e) => set("motifSortie", e.target.value)} /></Field>
        </>}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide mt-3 mb-2" style={{ color: "var(--brass)" }}>Données personnelles (confidentielles)</p>
      <div className="grid sm:grid-cols-3 gap-x-3">
        <Field label="Date de naissance"><input type="date" className={inputCls} style={inputStyle} value={d.dateNaissance} onChange={(e) => setDet("dateNaissance", e.target.value)} /></Field>
        <Field label="Lieu de naissance"><input className={inputCls} style={inputStyle} value={d.lieuNaissance} onChange={(e) => setDet("lieuNaissance", e.target.value)} /></Field>
        <Field label="Nationalité"><input className={inputCls} style={inputStyle} value={d.nationalite} onChange={(e) => setDet("nationalite", e.target.value)} /></Field>
        <Field label="Pièce d'identité"><input className={inputCls} style={inputStyle} value={d.pieceType} onChange={(e) => setDet("pieceType", e.target.value)} placeholder="CNI, passeport…" /></Field>
        <Field label="Numéro de la pièce"><input className={inputCls} style={inputStyle} value={d.pieceNumero} onChange={(e) => setDet("pieceNumero", e.target.value)} /></Field>
        <Field label="Situation de famille"><select className={inputCls} style={inputStyle} value={d.situationFamille} onChange={(e) => setDet("situationFamille", e.target.value)}>
          {Object.entries(SITUATIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="N° CNPS"><input className={inputCls} style={inputStyle} value={d.cnpsNumero} onChange={(e) => setDet("cnpsNumero", e.target.value)} /></Field>
        <Field label="N° CMU"><input className={inputCls} style={inputStyle} value={d.cmuNumero} onChange={(e) => setDet("cmuNumero", e.target.value)} /></Field>
        <Field label="Enfants à charge (nombre)"><input type="number" min="0" className={inputCls} style={inputStyle} value={d.nbEnfantsCharge} onChange={(e) => setDet("nbEnfantsCharge", e.target.value)} /></Field>
        <Field label="Adresse"><input className={inputCls} style={inputStyle} value={d.adresse} onChange={(e) => setDet("adresse", e.target.value)} /></Field>
        <Field label="Téléphone"><input className={inputCls} style={inputStyle} value={d.telephone} onChange={(e) => setDet("telephone", e.target.value)} /></Field>
        <Field label="E-mail"><input type="email" className={inputCls} style={inputStyle} value={d.email} onChange={(e) => setDet("email", e.target.value)} /></Field>
        <Field label="Banque"><input className={inputCls} style={inputStyle} value={d.banque} onChange={(e) => setDet("banque", e.target.value)} /></Field>
        <Field label="Numéro de compte"><input className={inputCls} style={inputStyle} value={d.numeroCompte} onChange={(e) => setDet("numeroCompte", e.target.value)} /></Field>
      </div>
      <div className="mb-3">
        <p className="text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Enfants (prénom, date de naissance)</p>
        {d.enfants.map((x, i) => (
          <div key={i} className="flex gap-2 mb-1.5">
            <input className={inputCls} style={inputStyle} placeholder="Prénom" value={x.prenom || ""} onChange={(e) => enfant(i, "prenom", e.target.value)} />
            <input type="date" className={inputCls} style={inputStyle} value={x.date_naissance || ""} onChange={(e) => enfant(i, "date_naissance", e.target.value)} />
            <button type="button" onClick={() => setDet("enfants", d.enfants.filter((_, j) => j !== i))} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Retirer l'enfant"><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" onClick={() => setDet("enfants", [...d.enfants, { prenom: "", date_naissance: "" }])} className="kb-btn kb-btn-ghost text-xs"><Plus size={13} /> Ajouter un enfant</button>
      </div>
      <div className="grid sm:grid-cols-3 gap-x-3">
        <Field label="Personne à prévenir"><input className={inputCls} style={inputStyle} value={d.contactUrgence.nom || ""} onChange={(e) => setDet("contactUrgence", { ...d.contactUrgence, nom: e.target.value })} /></Field>
        <Field label="Lien"><input className={inputCls} style={inputStyle} value={d.contactUrgence.lien || ""} onChange={(e) => setDet("contactUrgence", { ...d.contactUrgence, lien: e.target.value })} /></Field>
        <Field label="Téléphone"><input className={inputCls} style={inputStyle} value={d.contactUrgence.telephone || ""} onChange={(e) => setDet("contactUrgence", { ...d.contactUrgence, telephone: e.target.value })} /></Field>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={d.expatrie} onChange={(e) => setDet("expatrie", e.target.checked)} /> Salarié expatrié</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={d.medailleTravail} onChange={(e) => setDet("medailleTravail", e.target.checked)} /> Médaille du travail</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={d.ippPlus40} onChange={(e) => setDet("ippPlus40", e.target.checked)} /> Incapacité permanente partielle &gt; 40 %</label>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide mt-3 mb-2" style={{ color: "var(--brass)" }}>Paie</p>
      <div className="grid sm:grid-cols-3 gap-x-3">
        <Field label="Parts ITS (forcées)" hint="Vide : calcul automatique selon la situation de famille et les enfants à charge. À forcer seulement sur justificatif.">
          <input type="number" min="1" max="5" step="0.5" className={inputCls} style={inputStyle} value={d.partsItsForce} onChange={(e) => setDet("partsItsForce", e.target.value)} /></Field>
        <Field label="Personnes couvertes CMU (forcé)" hint="Vide : le salarié, le conjoint couvert et les enfants à charge">
          <input type="number" min="0" step="1" className={inputCls} style={inputStyle} value={d.cmuPersonnes} onChange={(e) => setDet("cmuPersonnes", e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm mb-3 self-end"><input type="checkbox" checked={d.conjointCmu} onChange={(e) => setDet("conjointCmu", e.target.checked)} /> Conjoint couvert par la CMU de l'entreprise</label>
      </div>
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={submit} busy={busy} disabled={!f.nom.trim() || !f.dateEmbauche} />
    </Modal>
  );
}

/* Contrat : création ou correction d'une erreur de saisie */
function ContractModal({ initial, emp, params, scale, autres = [], onSave, onClose }) {
  const today = todayIso();
  const [f, setF] = useState(() => {
    const base = { type: "CDI", dateDebut: emp.dateEmbauche || today, dateFin: "", motifCdd: "", objet: "", categorie: 1, echelon: "", qualification: "employe_mensuel",
      modePaiement: "mois", essaiDuree: "", essaiUnite: "mois", essaiRenouvele: false, essaiRenouvellementNotifieLe: "", essaiConsentementSalarie: false,
      salaireBase: "", sursalaire: "", horaireHebdo: 40, repartition: "8h_5j", lieuTravail: "", clauses: {}, statut: "actif" };
    const x = { ...base, ...initial, employeeId: emp.id };
    if (!x.id && !x.essaiDuree) { const m = essaiMax(params, x.qualification, x.dateDebut); if (m) { x.essaiDuree = m.duree; x.essaiUnite = m.unite; } }
    if (!x.id && x.salaireBase === "") { const m = minimumCategoriel(scale, x.categorie, x.echelon, x.dateDebut); if (m !== null) x.salaireBase = m; }
    return x;
  });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setClause = (k, v) => setF((x) => ({ ...x, clauses: { ...x.clauses, [k]: v } }));
  const nc = f.clauses.non_concurrence || { actif: false, duree: "", contrepartie: "" };
  /* Catégorie ou échelon modifié : le salaire catégoriel suit le minimum de la grille,
     sauf s'il a été saisi à la main à un autre montant */
  const changeCat = (k, v) => setF((x) => {
    const avant = minimumCategoriel(scale, x.categorie, x.echelon, x.dateDebut);
    const n = { ...x, [k]: v };
    const apres = minimumCategoriel(scale, n.categorie, n.echelon, n.dateDebut);
    if (apres !== null && (x.salaireBase === "" || Number(x.salaireBase) === avant)) n.salaireBase = apres;
    return n;
  });
  const changeQualif = (q) => setF((x) => {
    const m = essaiMax(params, q, x.dateDebut);
    return m && !x.id ? { ...x, qualification: q, essaiDuree: m.duree, essaiUnite: m.unite } : { ...x, qualification: q };
  });
  const essai = f.type !== "stage";
  const max = essai ? essaiMax(params, f.qualification, f.dateDebut) : null;
  const pe = pval(params, "PERIODE_ESSAI", f.dateDebut);
  const renouvPossible = (pe?.renouvellements_max ?? 0) >= 1;
  const tropLong = essai && max && f.essaiDuree && enJours(Number(f.essaiDuree), f.essaiUnite) > enJours(max.duree, max.unite);
  const es = essai && f.essaiDuree && f.dateDebut ? essaiStatus({ ...f, essaiDuree: Number(f.essaiDuree) }, params, today) : null;
  const minCat = minimumCategoriel(scale, f.categorie, f.echelon, f.dateDebut);
  const smig = smigProrata(params, f.horaireHebdo, f.dateDebut);
  const salaire = Number(f.salaireBase);
  const total = salaire + (Number(f.sursalaire) || 0);
  const plancher = plancherCategoriel(params, minCat, f, f.dateDebut);
  const sousSmig = ["CDI", "CDD", "temporaire"].includes(f.type) && smig && f.salaireBase !== "" && total < smig;
  const sousMin = f.type !== "stage" && plancher !== null && f.salaireBase !== "" && salaire < plancher;
  const stage = f.type === "stage";
  const duree = f.dateDebut && f.dateFin && f.dateFin >= f.dateDebut ? dureeEntre(f.dateDebut, f.dateFin) : null;
  const regCdd = pval(params, "CDD_REGLES", f.dateDebut); const regStage = pval(params, "STAGE_QUALIFICATION", f.dateDebut);
  const cumul = (type) => [...autres.filter((x) => x.id !== f.id && x.type === type && x.statut !== "annule"), f];
  const cddTropLong = f.type === "CDD" && regCdd && duree && dureeCumuleeDepasse(cumul("CDD"), regCdd.duree_max_mois);
  const stageTropLong = stage && regStage && duree && dureeCumuleeDepasse(cumul("stage"), regStage.duree_max_mois);
  const echelons = [...new Set(scale.filter((r) => Number(r.categorie) === Number(f.categorie)).map((r) => r.echelon).filter(Boolean))];

  const submit = async () => {
    setErr("");
    if (!f.dateDebut) return setErr("Indiquez la date de début.");
    if (f.type === "CDD" && (!f.dateFin || !(f.motifCdd || "").trim())) return setErr("Un CDD exige un motif et une date de fin.");
    if (f.dateFin && f.dateFin < f.dateDebut) return setErr("La date de fin précède la date de début.");
    if (stage && !f.dateFin) return setErr("Une convention de stage doit fixer sa date de fin (Code du travail, art. 13.14).");
    if (!f.id && cddTropLong) return setErr(`Durée totale des CDD supérieure à ${regCdd.duree_max_mois} mois, renouvellements compris (Code du travail, art. 15.4) : concluez un CDI.`);
    if (!f.id && stageTropLong) return setErr(`Durée totale du stage supérieure à ${regStage.duree_max_mois} mois, renouvellements compris (Code du travail, art. 13.14).`);
    if (essai && !(Number(f.essaiDuree) > 0)) return setErr("La clause de période d'essai est obligatoire (décret 2024-900, art. 3).");
    if (tropLong) return setErr(`Durée d'essai supérieure au maximum réglementaire pour cette qualification (${libDuree(max.duree, max.unite)}).`);
    if (f.essaiRenouvele && !f.essaiRenouvellementNotifieLe && !f.essaiConsentementSalarie) return setErr("Indiquez la date de notification du renouvellement, ou cochez le consentement écrit du salarié.");
    if (!(Number(f.categorie) >= 1)) return setErr("Indiquez la catégorie professionnelle.");
    if (f.salaireBase === "" || !(salaire >= 0)) return setErr(stage ? "Indiquez l'indemnité de stage." : "Indiquez le salaire catégoriel (rubrique 100).");
    if (f.sursalaire !== "" && !(Number(f.sursalaire) >= 0)) return setErr("Le sursalaire ne peut pas être négatif.");
    if (sousMin) return setErr(`Salaire catégoriel inférieur au minimum de la catégorie (${fcfa(plancher)}).`);
    if (sousSmig) return setErr(`Rémunération inférieure au SMIG pour ${f.horaireHebdo} h/semaine (${fcfa(smig)}).`);
    if (!(Number(f.horaireHebdo) > 0)) return setErr("Indiquez l'horaire hebdomadaire.");
    if (!(f.lieuTravail || "").trim()) return setErr("Indiquez le lieu de travail.");
    setBusy(true);
    const r = await onSave({ ...f, essaiDuree: essai ? Number(f.essaiDuree) : null }); setBusy(false);
    if (r?.error) setErr(r.error); else onClose(r);
  };

  return (
    <Modal title={f.id ? "Corriger le contrat" : `Nouveau contrat — ${nomComplet(emp)}`} onClose={() => onClose()} wide>
      {f.id && <WarnBox tone="info">« Corriger » sert aux erreurs de saisie (la correction est tracée au journal). Pour une évolution — augmentation, changement de poste, d'horaire… — utilisez « Avenant » : elle sera inscrite au fascicule 2 du registre.</WarnBox>}
      <div className="grid sm:grid-cols-3 gap-x-3">
        <Field label="Type de contrat"><select className={inputCls} style={inputStyle} value={f.type} onChange={(e) => set("type", e.target.value)}>
          {Object.entries(CONTRACT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Date de début *"><input type="date" className={inputCls} style={inputStyle} value={f.dateDebut} onChange={(e) => set("dateDebut", e.target.value)} /></Field>
        <Field label={f.type === "CDD" || stage ? "Date de fin *" : "Date de fin (le cas échéant)"} hint={duree?.libelle ? `Durée : ${duree.libelle}` : undefined}>
          <input type="date" className={inputCls} style={inputStyle} value={f.dateFin} onChange={(e) => set("dateFin", e.target.value)} /></Field>
      </div>
      {f.type === "CDD" && <Field label="Motif du recours au CDD *"><input className={inputCls} style={inputStyle} value={f.motifCdd} onChange={(e) => set("motifCdd", e.target.value)} placeholder="Ex. : surcroît temporaire d'activité" /></Field>}
      <div className="grid sm:grid-cols-3 gap-x-3">
        <Field label="Qualification professionnelle"><select className={inputCls} style={inputStyle} value={f.qualification} onChange={(e) => changeQualif(e.target.value)}>
          {Object.entries(QUALIFICATIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Catégorie *"><input type="number" min="1" className={inputCls} style={inputStyle} value={f.categorie} onChange={(e) => changeCat("categorie", e.target.value)} /></Field>
        <Field label="Échelon"><input className={inputCls} style={inputStyle} list="rh-echelons" value={f.echelon} onChange={(e) => changeCat("echelon", e.target.value)} />
          <datalist id="rh-echelons">{echelons.map((x) => <option key={x} value={x} />)}</datalist></Field>
        <Field label="Mode de paiement"><select className={inputCls} style={inputStyle} value={f.modePaiement} onChange={(e) => set("modePaiement", e.target.value)}>
          {Object.entries(MODES_PAIEMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        {stage ? <Field label="Indemnité forfaitaire mensuelle (FCFA) *" hint="Le stagiaire n'est pas salarié (Code du travail, art. 13.17)">
            <input type="number" min="0" className={inputCls} style={inputStyle} value={f.salaireBase} onChange={(e) => set("salaireBase", e.target.value)} /></Field>
          : <>
          <Field label="Salaire catégoriel — rubrique 100 (FCFA) *" hint={minCat !== null ? `Minimum de la catégorie : ${fcfa(minCat)}` : "Minimum de la catégorie inconnu"}>
            <input type="number" min="0" className={inputCls} style={inputStyle} value={f.salaireBase} onChange={(e) => set("salaireBase", e.target.value)} /></Field>
          <Field label="Sursalaire — rubrique 200 (FCFA)" hint="Complément convenu, hors minimum de la catégorie">
            <input type="number" min="0" className={inputCls} style={inputStyle} value={f.sursalaire} onChange={(e) => set("sursalaire", e.target.value)} /></Field>
          <Field label="Rémunération mensuelle convenue"><p className="px-3 py-2 rounded-lg text-sm font-semibold tabular-nums" style={{ background: "#F6F8FA" }}>{fcfa(total)}</p></Field>
          </>}
        <Field label="Horaire hebdomadaire (h)"><input type="number" min="1" step="0.5" className={inputCls} style={inputStyle} value={f.horaireHebdo} onChange={(e) => set("horaireHebdo", e.target.value)} /></Field>
        <Field label="Répartition de l'horaire"><select className={inputCls} style={inputStyle} value={f.repartition} onChange={(e) => set("repartition", e.target.value)}>
          {Object.entries(REPARTITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <div className="sm:col-span-2"><Field label="Lieu de travail *"><input className={inputCls} style={inputStyle} value={f.lieuTravail} onChange={(e) => set("lieuTravail", e.target.value)} placeholder="Ex. : siège, Cocody — Abidjan" /></Field></div>
      </div>
      {cddTropLong && <WarnBox tone="rouge">Durée totale des CDD supérieure à {regCdd.duree_max_mois} mois, renouvellements compris : au-delà, le contrat est réputé à durée indéterminée (Code du travail, art. 15.4 et 15.10).</WarnBox>}
      {stageTropLong && <WarnBox tone="rouge">Durée totale du stage supérieure à {regStage.duree_max_mois} mois, renouvellements compris (Code du travail, art. 13.14).</WarnBox>}
      {minCat === null && f.type !== "stage" && <WarnBox>La grille ne donne pas de salaire minimum pour la catégorie {f.categorie}{f.echelon ? ` (${f.echelon})` : ""} : le contrôle du salaire est impossible. Complétez la grille catégorielle.</WarnBox>}
      {f.type !== "stage" && minCat !== null && <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={!!f.clauses.salaire_diminue} onChange={(e) => setClause("salaire_diminue", e.target.checked)} />
        Travailleur physiquement diminué : salaire catégoriel réduit convenu par écrit (CCI, art. 50)</label>}
      {sousMin && <WarnBox tone="rouge">Salaire catégoriel inférieur au minimum de la catégorie ({fcfa(plancher)}) : enregistrement impossible.</WarnBox>}
      {sousSmig && <WarnBox tone="rouge">Rémunération inférieure au SMIG pour cet horaire ({fcfa(smig)}) : enregistrement impossible.</WarnBox>}
      <Field label="Objet / fonctions"><textarea rows={2} className={inputCls} style={inputStyle} value={f.objet} onChange={(e) => set("objet", e.target.value)} /></Field>

      {essai && (
        <div className="rounded-xl border p-3 mb-3" style={{ borderColor: "var(--line)" }}>
          <p className="text-sm font-semibold mb-2">Période d'essai</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3">
            <Field label="Durée *" hint={max ? `Maximum : ${libDuree(max.duree, max.unite)}` : "Maximum non paramétré"}>
              <input type="number" min="1" className={inputCls} style={inputStyle} value={f.essaiDuree ?? ""} onChange={(e) => set("essaiDuree", e.target.value)} /></Field>
            <Field label="Unité"><select className={inputCls} style={inputStyle} value={f.essaiUnite} onChange={(e) => set("essaiUnite", e.target.value)}><option value="jours">Jours</option><option value="mois">Mois</option></select></Field>
          </div>
          {tropLong && <WarnBox tone="rouge">Durée supérieure au maximum réglementaire ({libDuree(max.duree, max.unite)}).</WarnBox>}
          {es?.applicable && <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>Fin de l'essai : <b>{fmt(es.finInitiale)}</b>{es.limite && <> · renouvellement à notifier au plus tard le <b>{fmt(es.limite)}</b></>}</p>}
          {renouvPossible && <label className="flex items-center gap-2 text-sm mb-2"><input type="checkbox" checked={f.essaiRenouvele} onChange={(e) => set("essaiRenouvele", e.target.checked)} /> L'essai a été renouvelé</label>}
          {f.essaiRenouvele && (
            <div className="grid sm:grid-cols-2 gap-x-3">
              <Field label="Date de notification du renouvellement"><input type="date" className={inputCls} style={inputStyle} value={f.essaiRenouvellementNotifieLe || ""} onChange={(e) => set("essaiRenouvellementNotifieLe", e.target.value)} /></Field>
              <label className="flex items-center gap-2 text-sm mt-6"><input type="checkbox" checked={f.essaiConsentementSalarie} onChange={(e) => set("essaiConsentementSalarie", e.target.checked)} /> Accord écrit du salarié</label>
            </div>
          )}
          {f.essaiRenouvele && es && !es.renouvellementValide && <WarnBox tone="rouge">Notifié après le {fmt(es.limite)} sans accord écrit du salarié : le renouvellement est inopérant et l'engagement devient définitif à la fin de l'essai initial.</WarnBox>}
        </div>
      )}

      <div className="rounded-xl border p-3 mb-3" style={{ borderColor: "var(--line)" }}>
        <p className="text-sm font-semibold mb-2">Clauses particulières</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm mb-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.clauses.confidentialite} onChange={(e) => setClause("confidentialite", e.target.checked)} /> Confidentialité</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.clauses.mobilite} onChange={(e) => setClause("mobilite", e.target.checked)} /> Mobilité</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!nc.actif} onChange={(e) => setClause("non_concurrence", { ...nc, actif: e.target.checked })} /> Non-concurrence</label>
        </div>
        {nc.actif && <div className="grid sm:grid-cols-2 gap-x-3">
          <Field label="Durée de la non-concurrence"><input className={inputCls} style={inputStyle} value={nc.duree || ""} onChange={(e) => setClause("non_concurrence", { ...nc, duree: e.target.value })} /></Field>
          <Field label="Contrepartie prévue"><input className={inputCls} style={inputStyle} value={nc.contrepartie || ""} onChange={(e) => setClause("non_concurrence", { ...nc, contrepartie: e.target.value })} /></Field>
        </div>}
      </div>
      {f.id && <Field label="État du contrat"><select className={inputCls} style={inputStyle} value={f.statut} onChange={(e) => set("statut", e.target.value)}>
        {Object.entries(CONTRACT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>}
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={submit} busy={busy} />
    </Modal>
  );
}

/* Avenant : seuls les éléments cochés sont modifiés ; « avant » est relevé par la base */
const AVENANT_CHAMPS = [
  { k: "salaire_base", f: "salaireBase", label: "Salaire catégoriel (100)", type: "number", show: (v) => fcfa(v) },
  { k: "sursalaire", f: "sursalaire", label: "Sursalaire (200)", type: "number", show: (v) => fcfa(v) },
  { k: "horaire_hebdo", f: "horaireHebdo", label: "Horaire hebdomadaire", type: "number", show: (v) => `${v} h` },
  { k: "repartition", f: "repartition", label: "Répartition de l'horaire", options: REPARTITIONS },
  { k: "categorie", f: "categorie", label: "Catégorie", type: "number" },
  { k: "echelon", f: "echelon", label: "Échelon" },
  { k: "qualification", f: "qualification", label: "Qualification", options: QUALIFICATIONS },
  { k: "mode_paiement", f: "modePaiement", label: "Mode de paiement", options: MODES_PAIEMENT },
  { k: "lieu_travail", f: "lieuTravail", label: "Lieu de travail" },
  { k: "date_fin", f: "dateFin", label: "Date de fin (CDD)", type: "date", show: fmt, cdd: true },
];
function AmendmentModal({ contract, documents, onApply, onClose }) {
  const [objet, setObjet] = useState(""); const [dateEffet, setDateEffet] = useState(todayIso()); const [docId, setDocId] = useState("");
  const [sel, setSel] = useState({}); const [vals, setVals] = useState(() => Object.fromEntries(AVENANT_CHAMPS.map((c) => [c.k, contract[c.f] ?? ""])));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const champs = AVENANT_CHAMPS.filter((c) => !c.cdd || contract.type === "CDD");
  const submit = async () => {
    setErr("");
    const changes = {};
    for (const c of champs) if (sel[c.k]) {
      const v = vals[c.k];
      if (c.type === "number") { if (v === "" || !(Number(v) >= 0)) return setErr(`Valeur invalide : ${c.label}.`); changes[c.k] = Number(v); }
      else if (c.k === "lieu_travail" && !String(v).trim()) return setErr("Le lieu de travail ne peut pas être vide.");
      else changes[c.k] = c.type === "date" ? (v || null) : v;
    }
    if (!Object.keys(changes).length) return setErr("Cochez au moins un élément modifié.");
    if (!objet.trim()) return setErr("Indiquez l'objet de l'avenant.");
    if (!dateEffet) return setErr("Indiquez la date d'effet.");
    setBusy(true);
    const r = await onApply(contract.id, objet.trim(), dateEffet, changes, docId); setBusy(false);
    if (r?.error) setErr(r.error); else onClose(r);
  };
  return (
    <Modal title="Avenant au contrat" onClose={() => onClose()} wide>
      <div className="grid sm:grid-cols-3 gap-x-3">
        <div className="sm:col-span-2"><Field label="Objet de l'avenant *"><input className={inputCls} style={inputStyle} value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Ex. : revalorisation du salaire" /></Field></div>
        <Field label="Date d'effet *"><input type="date" className={inputCls} style={inputStyle} value={dateEffet} onChange={(e) => setDateEffet(e.target.value)} /></Field>
      </div>
      <div className="rounded-xl border divide-y mb-3" style={{ borderColor: "var(--line)" }}>
        {champs.map((c) => (
          <div key={c.k} className="flex flex-wrap items-center gap-2 px-3 py-2">
            <label className="flex items-center gap-2 text-sm w-52 shrink-0"><input type="checkbox" checked={!!sel[c.k]} onChange={(e) => setSel((x) => ({ ...x, [c.k]: e.target.checked }))} /> {c.label}</label>
            <span className="text-xs w-40" style={{ color: "var(--muted)" }}>Actuel : {c.options ? c.options[contract[c.f]] || "—" : c.show ? c.show(contract[c.f]) : contract[c.f] || "—"}</span>
            {sel[c.k] && (c.options
              ? <select className={`${inputCls} flex-1 min-w-[10rem]`} style={inputStyle} value={vals[c.k]} onChange={(e) => setVals((x) => ({ ...x, [c.k]: e.target.value }))}>
                  {Object.entries(c.options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              : <input type={c.type || "text"} className={`${inputCls} flex-1 min-w-[10rem]`} style={inputStyle} value={vals[c.k] ?? ""} aria-label={`Nouvelle valeur : ${c.label}`}
                  onChange={(e) => setVals((x) => ({ ...x, [c.k]: e.target.value }))} />)}
          </div>
        ))}
      </div>
      <Field label="Avenant signé (document déjà enregistré)"><select className={inputCls} style={inputStyle} value={docId} onChange={(e) => setDocId(e.target.value)}>
        <option value="">— Aucun pour l'instant —</option>{documents.map((d) => <option key={d.id} value={d.id}>{HR_DOC_CATEGORIES[d.categorie]} — {d.libelle || d.fileName}</option>)}</select></Field>
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={submit} busy={busy} label="Appliquer l'avenant" />
    </Modal>
  );
}

function DocModal({ initial, employees, onUpload, onUpdate, onClose }) {
  const [f, setF] = useState(() => ({ employeeId: "", categorie: "autre", libelle: "", dateDocument: todayIso(), datePeremption: "", confidentiel: true, notes: "", ...initial }));
  const [file, setFile] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    setBusy(true); setErr("");
    const r = f.id ? await onUpdate(f) : await onUpload(file, f); setBusy(false);
    if (r?.error) setErr(r.error); else onClose(r);
  };
  return (
    <Modal title={f.id ? "Modifier le document" : "Ajouter un document RH"} onClose={() => onClose()}>
      {!f.id && <Field label="Fichier * (PDF, image ou Word — 10 Mo maximum)"><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" className="text-sm" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field>}
      <Field label="Salarié concerné"><select className={inputCls} style={inputStyle} value={f.employeeId} onChange={(e) => set("employeeId", e.target.value)} disabled={!!f.id}>
        <option value="">— Document de l'entreprise —</option>{employees.map((e) => <option key={e.id} value={e.id}>{nomComplet(e)} ({e.matricule})</option>)}</select></Field>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Catégorie"><select className={inputCls} style={inputStyle} value={f.categorie} onChange={(e) => set("categorie", e.target.value)}>
          {Object.entries(HR_DOC_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Intitulé"><input className={inputCls} style={inputStyle} value={f.libelle} onChange={(e) => set("libelle", e.target.value)} /></Field>
        <Field label="Date du document"><input type="date" className={inputCls} style={inputStyle} value={f.dateDocument} onChange={(e) => set("dateDocument", e.target.value)} /></Field>
        <Field label="Date d'expiration" hint="Pièce d'identité, titre de séjour, visite médicale…"><input type="date" className={inputCls} style={inputStyle} value={f.datePeremption} onChange={(e) => set("datePeremption", e.target.value)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={f.confidentiel} onChange={(e) => set("confidentiel", e.target.checked)} /> Confidentiel (invisible du salarié lui-même)</label>
      <Field label="Notes"><textarea rows={2} className={inputCls} style={inputStyle} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={submit} busy={busy} disabled={!f.id && !file} />
    </Modal>
  );
}

/* Paramètre légal : nouvelle version datée, ou correction de la version affichée */
function ParamModal({ mode, param, onNewVersion, onFix, onClose }) {
  const [valeur, setValeur] = useState(() => JSON.parse(JSON.stringify(param.valeur ?? {})));
  const [texte, setTexte] = useState(false); const [raw, setRaw] = useState(() => JSON.stringify(param.valeur ?? {}, null, 2));
  const [dateEffet, setDateEffet] = useState(""); const [baseLegale, setBaseLegale] = useState(param.baseLegale); const [note, setNote] = useState(param.note);
  const [valide, setValide] = useState(mode === "fix" ? param.valide : false); const [actif, setActif] = useState(param.actif);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const basculer = () => {
    if (texte) { try { setValeur(JSON.parse(raw)); setTexte(false); setErr(""); } catch { setErr("Texte JSON invalide : corrigez-le avant de revenir au formulaire."); } }
    else { setRaw(JSON.stringify(valeur, null, 2)); setTexte(true); }
  };
  const submit = async () => {
    setErr("");
    let v = valeur;
    if (texte) { try { v = JSON.parse(raw); } catch { return setErr("Texte JSON invalide."); } }
    if (mode === "new" && !dateEffet) return setErr("Indiquez la date d'effet de la nouvelle valeur.");
    if (mode === "new" && dateEffet <= param.dateEffet) return setErr(`La nouvelle version doit prendre effet après le ${fmt(param.dateEffet)} (date d'effet de la version actuelle).`);
    setBusy(true);
    const r = mode === "new" ? await onNewVersion(param.code, v, dateEffet, baseLegale, note, valide) : await onFix(param, { valeur: v, baseLegale, note, actif });
    setBusy(false);
    if (r?.error) setErr(r.error); else onClose(r);
  };
  return (
    <Modal title={`${mode === "new" ? "Nouvelle version" : "Corriger"} — ${param.libelle}`} onClose={() => onClose()} wide>
      {mode === "new"
        ? <WarnBox tone="info">La version actuelle reste appliquée jusqu'à la veille de la date d'effet ; les périodes passées ne sont jamais recalculées avec la nouvelle valeur.</WarnBox>
        : <WarnBox>La correction remplace la valeur de la version en vigueur depuis le {fmt(param.dateEffet)}, y compris pour les périodes passées. À réserver aux erreurs de saisie (tracé au journal).</WarnBox>}
      {mode === "new" && <Field label="Date d'effet *"><input type="date" className={inputCls} style={inputStyle} value={dateEffet} onChange={(e) => setDateEffet(e.target.value)} /></Field>}
      <div className="flex justify-between items-center mb-2"><p className="text-sm font-semibold">Valeur</p>
        <button type="button" onClick={basculer} className="text-xs underline" style={{ color: "var(--brass)" }}>{texte ? "Revenir au formulaire" : "Mode texte (JSON)"}</button></div>
      <div className="rounded-xl border p-3 mb-3" style={{ borderColor: "var(--line)" }}>
        {texte ? <textarea rows={12} className={`${inputCls} font-mono text-xs`} style={inputStyle} value={raw} onChange={(e) => setRaw(e.target.value)} />
          : <JsonEditor value={valeur} onChange={setValeur} />}
      </div>
      <Field label="Base légale"><input className={inputCls} style={inputStyle} value={baseLegale} onChange={(e) => setBaseLegale(e.target.value)} /></Field>
      <Field label="Note"><textarea rows={2} className={inputCls} style={inputStyle} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      {mode === "new"
        ? <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={valide} onChange={(e) => setValide(e.target.checked)} /> Valeur vérifiée sur le texte officiel</label>
        : <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} /> Paramètre actif</label>}
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={submit} busy={busy} />
    </Modal>
  );
}

function ScaleModal({ initial, onSave, onClose }) {
  const [f, setF] = useState(() => ({ categorie: "", echelon: "", libelle: "", qualification: "employe_mensuel", salaireMinimum: "", secteur: "", dateEffet: todayIso(), dateFin: "", source: "", valide: false, ...initial,
    salaireMinimum: initial?.salaireMinimum ?? "" }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => { setBusy(true); setErr(""); const r = await onSave(f); setBusy(false); if (r?.error) setErr(r.error); else onClose(r); };
  return (
    <Modal title={f.id ? "Modifier une ligne de la grille" : "Nouvelle ligne de la grille"} onClose={() => onClose()}>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Catégorie *"><input type="number" min="1" className={inputCls} style={inputStyle} value={f.categorie} onChange={(e) => set("categorie", e.target.value)} /></Field>
        <Field label="Échelon"><input className={inputCls} style={inputStyle} value={f.echelon} onChange={(e) => set("echelon", e.target.value)} /></Field>
        <Field label="Qualification"><select className={inputCls} style={inputStyle} value={f.qualification} onChange={(e) => set("qualification", e.target.value)}>
          {Object.entries(QUALIFICATIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Salaire minimum mensuel (FCFA)" hint="Laisser vide si inconnu : la ligne sera signalée."><input type="number" min="0" className={inputCls} style={inputStyle} value={f.salaireMinimum} onChange={(e) => set("salaireMinimum", e.target.value)} /></Field>
        <Field label="Libellé"><input className={inputCls} style={inputStyle} value={f.libelle} onChange={(e) => set("libelle", e.target.value)} /></Field>
        <Field label="Secteur"><input className={inputCls} style={inputStyle} value={f.secteur} onChange={(e) => set("secteur", e.target.value)} /></Field>
        <Field label="Date d'effet *"><input type="date" className={inputCls} style={inputStyle} value={f.dateEffet} onChange={(e) => set("dateEffet", e.target.value)} /></Field>
        <Field label="Date de fin"><input type="date" className={inputCls} style={inputStyle} value={f.dateFin} onChange={(e) => set("dateFin", e.target.value)} /></Field>
      </div>
      <Field label="Source (texte, accord, barème…)"><input className={inputCls} style={inputStyle} value={f.source} onChange={(e) => set("source", e.target.value)} /></Field>
      <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={f.valide} onChange={(e) => set("valide", e.target.checked)} /> Montant vérifié sur la grille officielle</label>
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={submit} busy={busy} />
    </Modal>
  );
}

function VisaModal({ initial, onSave, onClose }) {
  const [f, setF] = useState(() => ({ dateVisite: todayIso(), inspecteur: "", nature: "visa", contenu: "", documentId: "", ...initial }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => { setBusy(true); setErr(""); const r = await onSave(f); setBusy(false); if (r?.error) setErr(r.error); else onClose(r); };
  return (
    <Modal title={f.id ? "Modifier l'inscription" : "Inscription au fascicule 3"} onClose={() => onClose()}>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Date du passage *"><input type="date" className={inputCls} style={inputStyle} value={f.dateVisite} onChange={(e) => set("dateVisite", e.target.value)} /></Field>
        <Field label="Nature"><select className={inputCls} style={inputStyle} value={f.nature} onChange={(e) => set("nature", e.target.value)}>
          {Object.entries(VISA_NATURE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      </div>
      <Field label="Inspecteur / contrôleur"><input className={inputCls} style={inputStyle} value={f.inspecteur} onChange={(e) => set("inspecteur", e.target.value)} /></Field>
      <Field label="Contenu (recopié intégralement) *"><textarea rows={5} className={inputCls} style={inputStyle} value={f.contenu} onChange={(e) => set("contenu", e.target.value)} /></Field>
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={submit} busy={busy} />
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   9. ÉCRANS
   ══════════════════════════════════════════════════════════════════════ */
/* Propose nom / prénoms à partir du nom affiché d'un compte (« TIA Guy Esdin ») */
export function decouperNom(name) {
  const w = String(name || "").trim().split(/\s+/).filter(Boolean);
  const maj = w.filter((x) => x.length > 1 && x === x.toUpperCase() && /[A-ZÀ-Ý]/.test(x));
  if (maj.length && maj.length < w.length) return { nom: maj.join(" "), prenoms: w.filter((x) => !maj.includes(x)).join(" ") };
  return { nom: (w[0] || "").toUpperCase(), prenoms: w.slice(1).join(" ") };
}
const contratActif = (contracts, empId) => contracts.find((c) => c.employeeId === empId && c.statut === "actif") || null;
const libChange = (k, v) => { const c = AVENANT_CHAMPS.find((x) => x.k === k); if (!c) return String(v ?? "—");
  return c.options ? c.options[v] || v || "—" : c.show ? c.show(v) : v === "" || v === null || v === undefined ? "—" : String(v); };

function Dashboard({ hr, alerts, today, onAlert }) {
  const actifs = hr.employees.filter((e) => e.statut === "actif");
  const ctrs = actifs.map((e) => contratActif(hr.contracts, e.id)).filter(Boolean);
  const essais = ctrs.filter((c) => ["en_cours", "renouvele", "limite_depassee"].includes(essaiStatus(c, hr.params, today).etat)).length;
  const masse = ctrs.reduce((a, c) => a + remunerationMensuelle(c), 0);
  const rouges = alerts.filter((a) => a.niveau === "rouge").length;
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Users} label="Effectif actif" value={actifs.length} sub={`${ctrs.filter((c) => c.type === "CDI").length} CDI · ${ctrs.filter((c) => c.type === "CDD").length} CDD · ${ctrs.filter((c) => !["CDI", "CDD"].includes(c.type)).length} autres`} />
        <StatCard icon={FileSignature} label="Périodes d'essai en cours" value={essais} tint="#2E78A8" />
        <StatCard icon={Landmark} label="Rémunérations mensuelles convenues" value={fcfa(masse)} sub="Salaire catégoriel + sursalaire, hors primes et charges" tint="#4F9E2A" />
        <StatCard icon={ShieldAlert} label="Alertes urgentes" value={rouges} sub={`${alerts.length} alerte(s) au total`} tint="#D81F26" />
      </div>
      <SectionCard title="Alertes et échéances" icon={AlertTriangle}>
        {alerts.length === 0 ? <EmptyState icon={CheckCircle2} title="Aucune alerte" sub="Contrats, essais, salaires minimums et documents sont à jour." />
          : <div className="space-y-2">{alerts.map((a) => <AlertRow key={a.id} a={a} onClick={() => onAlert(a)} />)}</div>}
      </SectionCard>
      <Indicateurs hr={hr} today={today} />
    </div>
  );
}

function EmployeeList({ hr, members, alerts, onOpen, onNew }) {
  const [q, setQ] = useState(""); const [sortis, setSortis] = useState(false);
  const nb = (id) => alerts.filter((a) => a.employeeId === id).length;
  const liste = hr.employees.filter((e) => (sortis || e.statut !== "sorti") &&
    `${e.matricule} ${e.nom} ${e.prenoms} ${e.poste}`.toLowerCase().includes(q.trim().toLowerCase()));
  const lies = new Set(hr.employees.map((e) => e.userId).filter(Boolean));
  const sansDossier = members.filter((m) => m.active !== false && !lies.has(m.id));
  const today = todayIso();
  return (
    <div>
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <div className="relative flex-1 min-w-[12rem]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
          <input className={`${inputCls} pl-9`} style={inputStyle} placeholder="Rechercher (nom, matricule, poste)…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sortis} onChange={(e) => setSortis(e.target.checked)} /> Afficher les sortis</label>
        <button onClick={() => onNew({})} className="kb-btn kb-btn-primary"><UserPlus size={16} /> Nouveau dossier</button>
      </div>
      <SectionCard title={`Salariés (${liste.length})`} icon={Users} pad={false}>
        {liste.length === 0 ? <EmptyState icon={Users} title="Aucun dossier" sub="Créez le premier dossier salarié." /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-xs" style={{ color: "var(--muted)", background: "#F8FAFC" }}>
              <th className="px-3 py-2">Matricule</th><th className="px-3 py-2">Nom et prénoms</th><th className="px-3 py-2">Emploi</th>
              <th className="px-3 py-2">Contrat</th><th className="px-3 py-2">Ancienneté</th><th className="px-3 py-2">Situation</th><th className="px-3 py-2"></th></tr></thead>
            <tbody>{liste.map((e) => { const c = contratActif(hr.contracts, e.id); const n = nb(e.id); const s = EMP_STATUS[e.statut];
              return (
                <tr key={e.id} onClick={() => onOpen(e.id)} className="border-t cursor-pointer hover:bg-slate-50" style={{ borderColor: "var(--line)" }}>
                  <td className="px-3 py-2 font-mono text-xs">{e.matricule}</td>
                  <td className="px-3 py-2 font-medium">{nomComplet(e)}</td>
                  <td className="px-3 py-2">{e.poste || "—"}</td>
                  <td className="px-3 py-2">{c ? `${CONTRACT_TYPES[c.type]}${c.type === "CDD" && c.dateFin ? ` → ${fmt(c.dateFin)}` : ""}` : <span className="text-red-600">Aucun</span>}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{libAnciennete(ancienneteMois(e.dateEmbauche, e.dateSortie || today))}</td>
                  <td className="px-3 py-2"><Chip color={s.color} dot>{s.label}</Chip></td>
                  <td className="px-3 py-2 text-right">{n > 0 && <Chip color="#B5171D" bg="#FDF2F2">{n} alerte{n > 1 ? "s" : ""}</Chip>}</td>
                </tr>); })}</tbody>
          </table></div>
        )}
      </SectionCard>
      {sansDossier.length > 0 && (
        <SectionCard title={`Comptes de l'application sans dossier RH (${sansDossier.length})`} icon={UserRound}>
          <div className="flex flex-wrap gap-2">{sansDossier.map((m) => (
            <button key={m.id} onClick={() => onNew({ ...decouperNom(m.name), userId: m.id })} className="kb-btn kb-btn-ghost text-sm"><Plus size={14} /> {m.name}</button>
          ))}</div>
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>Cliquez sur un nom pour ouvrir son dossier prérempli et relié à son compte.</p>
        </SectionCard>
      )}
    </div>
  );
}

function EmployeeDetail({ emp, hr, members, departments, admin, alerts, today, on }) {
  const det = hr.details.find((d) => d.employeeId === emp.id) || null;
  const ctrs = hr.contracts.filter((c) => c.employeeId === emp.id).sort((a, b) => (a.dateDebut < b.dateDebut ? 1 : -1));
  const c = ctrs.find((x) => x.statut === "actif") || null;
  const docs = hr.documents.filter((d) => d.employeeId === emp.id);
  const anc = ancienneteMois(emp.dateEmbauche, emp.dateSortie || today);
  const es = c ? essaiStatus(c, hr.params, today) : null;
  const preavis = c ? preavisPour(hr.params, c, det, anc, today) : null;
  const minCat = c ? minimumCategoriel(hr.scale, c.categorie, c.echelon, today) : null;
  const smig = c ? smigProrata(hr.params, c.horaireHebdo, today) : null;
  const mesAlertes = alerts.filter((a) => a.employeeId === emp.id);
  const manager = hr.employees.find((e) => e.id === emp.managerId);
  const compte = members.find((m) => m.id === emp.userId);
  const s = EMP_STATUS[emp.statut];
  const cu = det?.contactUrgence || {};
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={on.back} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour à la liste</button>
        <div className="flex-1" />
        <button onClick={() => on.newDoc(emp)} className="kb-btn kb-btn-primary text-sm"><FileSignature size={14} /> Éditer un document</button>
        <button onClick={() => on.fiche(emp)} className="kb-btn kb-btn-ghost text-sm"><Printer size={14} /> Fiche du salarié</button>
        <button onClick={() => on.edit(emp, det)} className="kb-btn kb-btn-ghost text-sm"><Pencil size={14} /> Modifier le dossier</button>
        {admin && <button onClick={() => on.remove(emp)} className="kb-btn kb-btn-ghost text-sm" style={{ color: "#D81F26" }}><Trash2 size={14} /> Supprimer</button>}
      </div>
      <div className="bg-white rounded-xl border p-4 mb-4 flex flex-wrap items-center gap-3" style={{ borderColor: "var(--line)" }}>
        <span className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold" style={{ background: "var(--brass)" }}>{(emp.nom[0] || "?") + (emp.prenoms[0] || "")}</span>
        <div className="min-w-0 flex-1"><p className="font-semibold text-lg leading-tight">{nomComplet(emp)}</p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>{emp.matricule} · {emp.poste || "Emploi non renseigné"} · {libAnciennete(anc)} d'ancienneté</p></div>
        <Chip color={s.color} dot>{s.label}</Chip>
      </div>
      {mesAlertes.length > 0 && <div className="space-y-2 mb-4">{mesAlertes.map((a) => <AlertRow key={a.id} a={a} onClick={() => {}} />)}</div>}

      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title="Contrat en cours" icon={FileSignature} action={c
          ? <div className="flex gap-1.5"><button onClick={() => on.amend(c)} className="kb-btn kb-btn-primary text-xs"><Layers size={13} /> Avenant</button>
              <button onClick={() => on.contract(c)} className="kb-btn kb-btn-ghost text-xs"><Pencil size={13} /> Corriger</button></div>
          : <button onClick={() => on.contract({})} className="kb-btn kb-btn-primary text-xs"><Plus size={13} /> Nouveau contrat</button>}>
          {!c ? <EmptyState icon={FileSignature} title="Aucun contrat en cours" /> : (
            <div>
              <div className="grid grid-cols-2 gap-x-4">
                <Info label="Type">{CONTRACT_TYPES[c.type]}{c.type === "CDD" ? ` — ${c.motifCdd}` : ""}</Info>
                <Info label="Période">{fmt(c.dateDebut)}{c.dateFin ? ` → ${fmt(c.dateFin)}` : " — durée indéterminée"}</Info>
                <Info label="Catégorie / échelon">{c.categorie}{c.echelon ? ` / ${c.echelon}` : ""}</Info>
                <Info label="Qualification">{QUALIFICATIONS[c.qualification]}</Info>
                <Info label="Salaire catégoriel (100) + sursalaire (200)">{fcfa(c.salaireBase)} + {fcfa(c.sursalaire)}</Info>
                <Info label="Rémunération mensuelle convenue"><b>{fcfa(remunerationMensuelle(c))}</b> <span className="text-xs" style={{ color: "var(--muted)" }}>({MODES_PAIEMENT[c.modePaiement]?.toLowerCase()})</span></Info>
                <Info label="Minimum de la catégorie / SMIG">{minCat === null ? "Grille non renseignée" : fcfa(minCat)} / {smig ? fcfa(smig) : "—"}</Info>
                <Info label="Horaire">{nf(c.horaireHebdo)} h/semaine — {REPARTITIONS[c.repartition]}</Info>
                <Info label="Lieu de travail">{c.lieuTravail}</Info>
                <Info label="Préavis applicable aujourd'hui">{preavis ? `${preavis.libelle}${preavis.note ? ` (${preavis.note})` : ""}` : "Non paramétré"}</Info>
                <Info label="Clauses">{[c.clauses.confidentialite && "confidentialité", c.clauses.mobilite && "mobilité", c.clauses.non_concurrence?.actif && "non-concurrence"].filter(Boolean).join(", ") || "Aucune"}</Info>
              </div>
              {es?.applicable && (
                <div className="rounded-lg border p-3 mt-2" style={{ borderColor: "var(--line)" }}>
                  <div className="flex items-center justify-between mb-1"><p className="text-sm font-semibold">Période d'essai : {libDuree(c.essaiDuree, c.essaiUnite)}</p>
                    <Chip color={ESSAI_ETAT[es.etat].color} dot>{ESSAI_ETAT[es.etat].label}</Chip></div>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Fin initiale : <b>{fmt(es.finInitiale)}</b>
                    {es.limite && <> · renouvellement à notifier au plus tard le <b>{fmt(es.limite)}</b> ({libDuree(es.prevenance.n, es.prevenance.unite)} avant)</>}
                    {es.renouvellementValide && <> · fin après renouvellement : <b>{fmt(es.finRenouvelee)}</b></>}</p>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Identité et données personnelles" icon={UserRound}>
          <div className="grid grid-cols-2 gap-x-4">
            <Info label="Sexe">{emp.sexe === "F" ? "Féminin" : emp.sexe === "M" ? "Masculin" : ""}</Info>
            <Info label="Département">{departments.find((d) => d.id === emp.departmentId)?.name}</Info>
            <Info label="Date d'embauche">{fmt(emp.dateEmbauche)}</Info>
            <Info label="Responsable">{manager ? nomComplet(manager) : ""}</Info>
            <Info label="Naissance">{det?.dateNaissance ? `${fmt(det.dateNaissance)}${det.lieuNaissance ? ` à ${det.lieuNaissance}` : ""}` : ""}</Info>
            <Info label="Nationalité">{det?.nationalite}</Info>
            <Info label="Pièce d'identité">{det?.pieceType ? `${det.pieceType} ${det.pieceNumero}` : ""}</Info>
            <Info label="Situation de famille">{det ? `${SITUATIONS[det.situationFamille]} · ${det.nbEnfantsCharge} enfant(s) à charge` : ""}</Info>
            <Info label="N° CNPS">{det?.cnpsNumero}</Info>
            <Info label="N° CMU">{det?.cmuNumero}</Info>
            <Info label="Téléphone / e-mail">{[det?.telephone, det?.email].filter(Boolean).join(" · ")}</Info>
            <Info label="Adresse">{det?.adresse}</Info>
            <Info label="Banque">{det?.banque ? `${det.banque} ${det.numeroCompte}` : ""}</Info>
            <Info label="Personne à prévenir">{cu.nom ? `${cu.nom}${cu.lien ? ` (${cu.lien})` : ""} ${cu.telephone || ""}` : ""}</Info>
            <Info label="Compte de l'application">{compte?.name}</Info>
            <Info label="Particularités">{[det?.expatrie && "expatrié", det?.medailleTravail && "médaille du travail", det?.ippPlus40 && "IPP > 40 %"].filter(Boolean).join(", ")}</Info>
          </div>
          {emp.statut === "sorti" && <Info label="Sortie">{fmt(emp.dateSortie)} — {emp.motifSortie}</Info>}
        </SectionCard>
      </div>

      <SectionCard title="Historique des contrats et avenants" icon={History}>
        {ctrs.length === 0 ? <p className="text-sm" style={{ color: "var(--muted)" }}>Aucun contrat enregistré.</p> : ctrs.map((x) => {
          const avs = hr.amendments.filter((a) => a.contractId === x.id).sort((a, b) => (a.dateEffet < b.dateEffet ? 1 : -1));
          const st = CONTRACT_STATUS[x.statut];
          return (
            <div key={x.id} className="border-b last:border-0 py-2" style={{ borderColor: "var(--line)" }}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium flex-1">{CONTRACT_TYPES[x.type]} — du {fmt(x.dateDebut)}{x.dateFin ? ` au ${fmt(x.dateFin)}` : ""} · cat. {x.categorie} · {fcfa(remunerationMensuelle(x))}</p>
                <Chip color={st.color} dot>{st.label}</Chip>
                {x.statut !== "actif" && <button onClick={() => on.contract(x)} className="p-1 rounded hover:bg-slate-100" aria-label="Corriger ce contrat"><Pencil size={13} /></button>}
              </div>
              {avs.map((a) => (
                <div key={a.id} className="ml-4 mt-1 text-xs" style={{ color: "var(--ink)" }}>
                  <span className="font-medium">Avenant du {fmt(a.dateEffet)}</span> — {a.objet} :{" "}
                  {Object.keys(a.apres).map((k) => `${AVENANT_CHAMPS.find((ch) => ch.k === k)?.label || k} ${libChange(k, a.avant[k])} → ${libChange(k, a.apres[k])}`).join(" ; ")}
                  {" "}<button onClick={() => on.docAvenant(a, x)} className="underline font-medium" style={{ color: "var(--brass)" }}>Éditer l'avenant</button>
                </div>
              ))}
            </div>
          );
        })}
      </SectionCard>

      <EmployeeSuivi emp={emp} det={det} hr={hr} today={today} on={on} />

      <SectionCard title={`Documents (${docs.length})`} icon={FolderOpen} action={<button onClick={() => on.addDoc({ employeeId: emp.id })} className="kb-btn kb-btn-primary text-xs"><Upload size={13} /> Ajouter</button>} pad={false}>
        <DocTable docs={docs} employees={hr.employees} today={today} on={on} />
      </SectionCard>
    </div>
  );
}

/* Congés, éléments de paie fixes et bulletins d'un salarié */
function EmployeeSuivi({ emp, det, hr, today, on }) {
  const solde = soldeConges({ emp, det, contracts: hr.contracts, absences: hr.absences, adjustments: hr.adjustments, params: hr.params, today });
  const abs = hr.absences.filter((a) => a.employeeId === emp.id).slice(0, 8);
  const elems = hr.elements.filter((e) => e.employeeId === emp.id);
  const slips = hr.payslips.filter((b) => b.employeeId === emp.id).map((b) => ({ b, p: hr.periods.find((x) => x.id === b.periodId) }))
    .filter((x) => x.p).sort((x, y) => y.p.annee - x.p.annee || y.p.mois - x.p.mois).slice(0, 12);
  const NAT = { gain: "Gain soumis", indemnite: "Indemnité non soumise", retenue: "Retenue" };
  return (
    <>
      <SectionCard title="Congés et absences" icon={CalendarDays} pad={false} action={<div className="flex gap-1.5">
        <button onClick={() => on.absence({ employeeId: emp.id })} className="kb-btn kb-btn-primary text-xs"><Plus size={13} /> Absence</button>
        {solde && <button onClick={() => on.adjust(emp)} className="kb-btn kb-btn-ghost text-xs">Ajuster le solde</button>}</div>}>
        {solde ? <p className="text-sm px-4 pt-3">Solde de congés : <b>{fmt2(solde.solde)}</b> jours ouvrables <span className="text-xs" style={{ color: "var(--muted)" }}>(acquis {fmt2(solde.acquisBase)} + majorations {fmt2(solde.majorations)} + ajustements {fmt2(solde.ajustements)} − pris {fmt2(solde.pris)})
          {solde.droitOuvert ? ` · à prendre avant le ${fmt(solde.echeance)}` : ` · droit ouvert le ${fmt(solde.ouverture)}`}</span></p>
          : <p className="text-xs px-4 pt-3" style={{ color: "var(--muted)" }}>Pas de congé payé de salarié (aucun contrat de travail).</p>}
        <div className="mt-2"><AbsencesTable liste={abs} hr={hr} on={on} compact /></div>
      </SectionCard>
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title="Éléments de paie fixes" icon={Landmark} pad={false} action={<button onClick={() => on.element({}, emp)} className="kb-btn kb-btn-ghost text-xs"><Plus size={13} /> Ajouter</button>}>
          {elems.length === 0 ? <p className="text-xs px-4 py-3" style={{ color: "var(--muted)" }}>Aucun élément fixe (prime de responsabilité, indemnité de logement, remboursement de prêt…). Le salaire et le sursalaire viennent du contrat ; la prime de transport des réglages.</p>
            : <div className="divide-y" style={{ borderColor: "var(--line)" }}>{elems.map((x) => (
              <div key={x.id} className="px-4 py-2 flex flex-wrap items-center gap-2 text-sm" style={{ opacity: x.actif ? 1 : 0.5 }}>
                <span className="flex-1">{x.libelle} <span className="text-xs" style={{ color: "var(--muted)" }}>— {NAT[x.nature]}{x.dateFin ? ` jusqu'au ${fmt(x.dateFin)}` : ""}</span></span>
                <span className="tabular-nums">{fcfa(x.montant)}</span>
                <button onClick={() => on.element(x, emp)} className="p-1.5 rounded hover:bg-slate-100" aria-label="Modifier l'élément de paie"><Pencil size={13} /></button>
                <button onClick={() => on.removeRow("hr_pay_elements", x.id, `l'élément « ${x.libelle} »`)} className="p-1.5 rounded hover:bg-slate-100" style={{ color: "#D81F26" }} aria-label="Supprimer l'élément de paie"><Trash2 size={13} /></button>
              </div>))}</div>}
        </SectionCard>
        <SectionCard title="Bulletins de paie" icon={FileText} pad={false}>
          {slips.length === 0 ? <p className="text-xs px-4 py-3" style={{ color: "var(--muted)" }}>Aucun bulletin. Les bulletins se préparent dans l'onglet « Paie ».</p>
            : <div className="divide-y" style={{ borderColor: "var(--line)" }}>{slips.map(({ b, p }) => (
              <button key={b.id} onClick={() => on.gotoSlip(b)} className="w-full text-left px-4 py-2 flex flex-wrap items-center gap-2 text-sm hover:bg-slate-50">
                <span className="flex-1 capitalize">{libPeriode(p)}</span><span className="tabular-nums">net {fcfa(b.netAPayer)}</span>
                <Chip color={b.statut === "valide" ? "#4F9E2A" : b.statut === "annule" ? "#D81F26" : "#C58A1B"} dot>{b.statut === "valide" ? b.numero : b.statut === "annule" ? "Annulé" : "Brouillon"}</Chip></button>))}</div>}
        </SectionCard>
      </div>
    </>
  );
}

function DocTable({ docs, employees, candidates = [], today, on, showEmployee }) {
  if (!docs.length) return <EmptyState icon={FolderOpen} title="Aucun document" />;
  return (
    <div className="overflow-x-auto"><table className="w-full text-sm">
      <thead><tr className="text-left text-xs" style={{ color: "var(--muted)", background: "#F8FAFC" }}>
        <th className="px-3 py-2">Catégorie</th><th className="px-3 py-2">Intitulé</th>{showEmployee && <th className="px-3 py-2">Salarié</th>}
        <th className="px-3 py-2">Date</th><th className="px-3 py-2">Expiration</th><th className="px-3 py-2"></th></tr></thead>
      <tbody>{docs.map((d) => { const j = d.datePeremption ? ecartJours(today, d.datePeremption) : null; const e = employees.find((x) => x.id === d.employeeId);
        return (
          <tr key={d.id} className="border-t" style={{ borderColor: "var(--line)" }}>
            <td className="px-3 py-2 whitespace-nowrap">{HR_DOC_CATEGORIES[d.categorie] || d.categorie}{d.confidentiel && <span title="Confidentiel" className="ml-1 text-[10px]" style={{ color: "var(--muted)" }}>🔒</span>}</td>
            <td className="px-3 py-2">{d.libelle || d.fileName}
              {d.genere && <span className="ml-1.5 inline-flex gap-1 align-middle">{d.reference && <Chip color="#2E78A8">{d.reference}</Chip>}
                {d.signe ? <Chip color="#4F9E2A" dot>Signé</Chip> : <Chip color="#C58A1B" dot>À faire signer</Chip>}</span>}</td>
            {showEmployee && <td className="px-3 py-2">{e ? nomComplet(e) : d.objetType === "candidat" ? (() => { const c = candidates.find((x) => x.id === d.objetId); return c ? `${c.nom} ${c.prenoms} (candidat)` : "Candidat"; })() : "Entreprise"}</td>}
            <td className="px-3 py-2 whitespace-nowrap">{fmt(d.dateDocument)}</td>
            <td className="px-3 py-2 whitespace-nowrap" style={{ color: j === null ? undefined : j < 0 ? "#B5171D" : j <= 30 ? "#8A6212" : undefined }}>{fmt(d.datePeremption)}</td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              {d.genere && <button onClick={() => on.openGenerated(d)} className="p-1.5 rounded hover:bg-slate-100" aria-label="Voir et imprimer le document édité" title="Voir et imprimer"><FileText size={14} /></button>}
              {d.genere && !d.signe && <button onClick={() => on.sign(d)} className="p-1.5 rounded hover:bg-slate-100" aria-label="Joindre l'exemplaire signé" title="Joindre l'exemplaire signé"><Upload size={14} /></button>}
              {d.filePath && <button onClick={() => on.openDoc(d)} className="p-1.5 rounded hover:bg-slate-100" aria-label="Ouvrir le document" title="Ouvrir le fichier (lien valable 5 minutes)"><Eye size={14} /></button>}
              <button onClick={() => on.editDoc(d)} className="p-1.5 rounded hover:bg-slate-100" aria-label="Modifier le document"><Pencil size={14} /></button>
              <button onClick={() => on.removeDoc(d)} className="p-1.5 rounded hover:bg-slate-100" aria-label="Supprimer le document" style={{ color: "#D81F26" }}><Trash2 size={14} /></button>
            </td>
          </tr>); })}</tbody>
    </table></div>
  );
}

/* ---------------- Registre d'employeur ---------------- */
function RegistreTab({ hr, admin, on, today }) {
  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        {[["f1", "Fascicule 1", "Identité et emploi de chaque salarié", Users], ["f2", "Fascicule 2", "Contrats et leurs modifications", FileSignature], ["f3", "Fascicule 3", "Visas et observations de l'inspection", ClipboardList]].map(([k, t, sub, Icon]) => (
          <button key={k} onClick={() => on.print(k)} className="bg-white rounded-xl border p-4 text-left hover:shadow-md transition-shadow" style={{ borderColor: "var(--line)" }}>
            <Icon size={18} style={{ color: "var(--brass)" }} /><p className="font-semibold mt-2">{t}</p><p className="text-xs" style={{ color: "var(--muted)" }}>{sub}</p>
            <p className="text-xs mt-2 font-medium flex items-center gap-1" style={{ color: "var(--brass)" }}><Printer size={12} /> Afficher et imprimer</p>
          </button>
        ))}
      </div>
      <SectionCard title="Fascicule 3 — inscriptions de l'inspection du travail" icon={ClipboardList}
        action={admin && <button onClick={() => on.visa({})} className="kb-btn kb-btn-primary text-xs"><Plus size={13} /> Inscrire</button>}>
        {hr.visas.length === 0 ? <EmptyState icon={ClipboardList} title="Aucune inscription" /> : hr.visas.map((v) => (
          <div key={v.id} className="border-b last:border-0 py-2 flex gap-2" style={{ borderColor: "var(--line)" }}>
            <div className="flex-1"><p className="text-sm font-medium">{fmt(v.dateVisite)} — {VISA_NATURE[v.nature]}{v.inspecteur ? ` · ${v.inspecteur}` : ""}</p>
              <p className="text-xs whitespace-pre-line" style={{ color: "var(--ink)" }}>{v.contenu}</p></div>
            {admin && <div className="shrink-0"><button onClick={() => on.visa(v)} className="p-1.5 rounded hover:bg-slate-100" aria-label="Modifier l'inscription"><Pencil size={14} /></button>
              <button onClick={() => on.removeVisa(v)} className="p-1.5 rounded hover:bg-slate-100" style={{ color: "#D81F26" }} aria-label="Supprimer l'inscription"><Trash2 size={14} /></button></div>}
          </div>
        ))}
        {!admin && <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>Inscriptions réservées à l'administrateur.</p>}
      </SectionCard>
      <DeclarationsSection hr={hr} on={on} today={today} />
    </div>
  );
}

function RegistrePrint({ kind, hr, onBack }) {
  const emps = [...hr.employees].sort((a, b) => (a.dateEmbauche === b.dateEmbauche ? (a.matricule < b.matricule ? -1 : 1) : a.dateEmbauche < b.dateEmbauche ? -1 : 1));
  const det = (id) => hr.details.find((d) => d.employeeId === id) || {};
  const dernier = (id) => hr.contracts.filter((c) => c.employeeId === id && c.statut !== "annule").sort((a, b) => (a.dateDebut < b.dateDebut ? 1 : -1))[0];
  const titre = { f1: "Registre d'employeur — Fascicule 1", f2: "Registre d'employeur — Fascicule 2", f3: "Registre d'employeur — Fascicule 3" }[kind];
  const sous = { f1: "Salariés de l'entreprise", f2: "Contrats de travail et modifications", f3: "Visas, mises en demeure et observations de l'inspection du travail" }[kind];
  const th = "px-1.5 py-1 text-left font-semibold border";
  const td = "px-1.5 py-1 border align-top";
  const bc = { borderColor: "#C9D1DA" };
  return (
    <div>
      <div className="flex items-center justify-between mb-3 print:hidden gap-2 flex-wrap">
        <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour</button>
        <button onClick={() => printSheet("landscape")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF (paysage)</button>
      </div>
      <p className="text-xs mb-3 print:hidden" style={{ color: "var(--muted)" }}>Établi à partir des dossiers saisis : vérifiez les informations avant de l'imprimer.</p>
      <PrintPage className="bg-white rounded-xl border p-6" style={{ borderColor: "var(--line)" }}>
        <PrintHead title={titre} subtitle={sous} extra={<p className="text-[11px]" style={{ color: "var(--muted)" }}>Édité le {fmt(todayIso())}</p>} />
        {kind === "f1" && (
          <table className="w-full text-[10px] mt-4 border-collapse">
            <thead><tr style={{ background: "#F1F3F5" }}>{["Matricule", "Nom et prénoms", "Sexe", "Date et lieu de naissance", "Nationalité", "Emploi", "Qualification / catégorie", "Entrée", "Sortie", "Motif de sortie", "N° CNPS"].map((h) => <th key={h} className={th} style={bc}>{h}</th>)}</tr></thead>
            <tbody>{emps.map((e) => { const d = det(e.id); const c = dernier(e.id); return (
              <tr key={e.id}>
                <td className={td} style={bc}>{e.matricule}</td><td className={td} style={bc}>{nomComplet(e)}</td><td className={td} style={bc}>{e.sexe}</td>
                <td className={td} style={bc}>{fmt(d.dateNaissance)}{d.lieuNaissance ? ` — ${d.lieuNaissance}` : ""}</td><td className={td} style={bc}>{d.nationalite || ""}</td>
                <td className={td} style={bc}>{e.poste}</td><td className={td} style={bc}>{c ? `${QUALIFICATIONS[c.qualification]} — cat. ${c.categorie}${c.echelon ? `/${c.echelon}` : ""}` : ""}</td>
                <td className={td} style={bc}>{fmt(e.dateEmbauche)}</td><td className={td} style={bc}>{e.dateSortie ? fmt(e.dateSortie) : ""}</td>
                <td className={td} style={bc}>{e.motifSortie}</td><td className={td} style={bc}>{d.cnpsNumero || ""}</td>
              </tr>); })}</tbody>
          </table>
        )}
        {kind === "f2" && (
          <table className="w-full text-[10px] mt-4 border-collapse">
            <thead><tr style={{ background: "#F1F3F5" }}>{["Date", "Événement", "Catégorie", "Qualification", "Salaire catégoriel", "Sursalaire", "Total", "Horaire", "Lieu de travail"].map((h) => <th key={h} className={th} style={bc}>{h}</th>)}</tr></thead>
            {emps.map((e) => {
              const cs = hr.contracts.filter((c) => c.employeeId === e.id && c.statut !== "annule").sort((a, b) => (a.dateDebut < b.dateDebut ? -1 : 1));
              if (!cs.length) return null;
              return (
                <tbody key={e.id}>
                  <tr style={{ background: "#F8FAFC" }}><td colSpan={9} className={`${td} font-semibold`} style={bc}>{e.matricule} — {nomComplet(e)}</td></tr>
                  {cs.flatMap((c) => contractHistory(c, hr.amendments).map((l, i) => (
                    <tr key={`${c.id}-${i}`}>
                      <td className={td} style={bc}>{fmt(l.date)}</td><td className={td} style={bc}>{l.evenement}</td>
                      <td className={td} style={bc}>{l.categorie}{l.echelon ? `/${l.echelon}` : ""}</td><td className={td} style={bc}>{QUALIFICATIONS[l.qualification] || l.qualification}</td>
                      <td className={`${td} text-right tabular-nums`} style={bc}>{fcfa(l.salaireBase)}</td>
                      <td className={`${td} text-right tabular-nums`} style={bc}>{fcfa(l.sursalaire)}</td>
                      <td className={`${td} text-right tabular-nums`} style={bc}>{fcfa(remunerationMensuelle(l))}</td><td className={td} style={bc}>{nf(l.horaireHebdo)} h</td><td className={td} style={bc}>{l.lieuTravail}</td>
                    </tr>)))}
                </tbody>
              );
            })}
          </table>
        )}
        {kind === "f3" && (
          <table className="w-full text-[10px] mt-4 border-collapse">
            <thead><tr style={{ background: "#F1F3F5" }}>{["Date", "Nature", "Inspecteur / contrôleur", "Contenu"].map((h) => <th key={h} className={th} style={bc}>{h}</th>)}</tr></thead>
            <tbody>{[...hr.visas].sort((a, b) => (a.dateVisite < b.dateVisite ? -1 : 1)).map((v) => (
              <tr key={v.id}><td className={td} style={bc}>{fmt(v.dateVisite)}</td><td className={td} style={bc}>{VISA_NATURE[v.nature]}</td>
                <td className={td} style={bc}>{v.inspecteur}</td><td className={`${td} whitespace-pre-line`} style={bc}>{v.contenu}</td></tr>))}</tbody>
          </table>
        )}
        {kind === "f3" && hr.visas.length === 0 && <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>Aucune inscription.</p>}
      </PrintPage>
    </div>
  );
}

/* ---------------- Paramètres légaux ---------------- */
function ParamsTab({ hr, admin, today, on }) {
  const [q, setQ] = useState(""); const [seulement, setSeulement] = useState(false); const [ouverts, setOuverts] = useState({});
  const codes = [...new Set(hr.params.map((p) => p.code))];
  const fiches = codes.map((code) => {
    const versions = hr.params.filter((p) => p.code === code).sort((a, b) => (a.dateEffet < b.dateEffet ? 1 : -1));
    const courant = resolveParam(hr.params, code, today) || versions[versions.length - 1];
    return { code, versions, courant };
  }).filter((x) => (!seulement || !x.courant.valide) && `${x.code} ${x.courant.libelle}`.toLowerCase().includes(q.trim().toLowerCase()));
  const groupes = Object.keys(PARAM_CATEGORIES).map((g) => [g, fiches.filter((x) => (x.courant.categorie || "general") === g)])
    .concat([["autres", fiches.filter((x) => !PARAM_CATEGORIES[x.courant.categorie || "general"])]]).filter(([, l]) => l.length);
  const aConfirmer = codes.filter((code) => !(resolveParam(hr.params, code, today) || {}).valide).length;
  return (
    <div>
      {aConfirmer > 0 && <WarnBox>{aConfirmer} paramètre(s) restent « à confirmer » : leur valeur n'a pas encore été vérifiée sur le texte officiel. Ils sont utilisés tels quels par les calculs — vérifiez-les avant la première paie.</WarnBox>}
      {!admin && <WarnBox tone="info">Consultation seule : les paramètres légaux sont modifiés par l'administrateur.</WarnBox>}
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <div className="relative flex-1 min-w-[12rem]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
          <input className={`${inputCls} pl-9`} style={inputStyle} placeholder="Rechercher un paramètre…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={seulement} onChange={(e) => setSeulement(e.target.checked)} /> À confirmer seulement</label>
      </div>
      {groupes.map(([g, liste]) => (
        <SectionCard key={g} title={PARAM_CATEGORIES[g] || "Autres"} icon={Scale}>
          <div className="space-y-3">{liste.map(({ code, versions, courant: p }) => (
            <div key={code} className="rounded-lg border p-3" style={{ borderColor: p.valide ? "var(--line)" : "#F3E2C6", background: p.valide ? "#fff" : "#FFFCF5" }}>
              <div className="flex flex-wrap items-start gap-2">
                <div className="flex-1 min-w-[12rem]">
                  <p className="text-sm font-semibold">{p.libelle} <span className="font-mono text-[10px] font-normal" style={{ color: "var(--muted)" }}>{code}</span></p>
                  <p className="text-[11px]" style={{ color: "var(--muted)" }}>En vigueur depuis le {fmt(p.dateEffet)}{p.dateFin ? ` jusqu'au ${fmt(p.dateFin)}` : ""}{p.baseLegale ? ` · ${p.baseLegale}` : ""}{!p.actif ? " · inactif" : ""}</p>
                </div>
                {p.valide ? <Chip color="#4F9E2A" dot>Validé</Chip> : <Chip color="#C58A1B" bg="#FFF3DC" dot>À confirmer</Chip>}
              </div>
              <div className="mt-2 text-sm"><ValueView v={p.valeur} /></div>
              {p.note && <p className="text-xs mt-1 italic" style={{ color: "var(--muted)" }}>{p.note}</p>}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {versions.length > 1 && <button onClick={() => setOuverts((x) => ({ ...x, [code]: !x[code] }))} className="kb-btn kb-btn-ghost text-xs">
                  {ouverts[code] ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Historique ({versions.length} versions)</button>}
                {admin && <>
                  <button onClick={() => on.param("new", versions[0])} className="kb-btn kb-btn-ghost text-xs"><Plus size={13} /> Nouvelle version</button>
                  <button onClick={() => on.param("fix", p)} className="kb-btn kb-btn-ghost text-xs"><Pencil size={13} /> Corriger</button>
                  {!p.valide && <button onClick={() => on.validate(p)} className="kb-btn kb-btn-primary text-xs"><Check size={13} /> Confirmer la valeur</button>}
                </>}
              </div>
              {ouverts[code] && <div className="mt-2 border-t pt-2 space-y-2" style={{ borderColor: "var(--line)" }}>{versions.map((v) => (
                <div key={v.id} className="text-xs"><p className="font-medium">Du {fmt(v.dateEffet)}{v.dateFin ? ` au ${fmt(v.dateFin)}` : " à aujourd'hui"} {v.valide ? "· validé" : "· à confirmer"}</p><ValueView v={v.valeur} /></div>
              ))}</div>}
            </div>
          ))}</div>
        </SectionCard>
      ))}
      {fiches.length === 0 && <EmptyState icon={Scale} title="Aucun paramètre" />}
    </div>
  );
}

/* ---------------- Grille catégorielle ---------------- */
function GrilleTab({ hr, admin, on }) {
  const rows = [...hr.scale].sort((a, b) => a.categorie - b.categorie || (a.echelon < b.echelon ? -1 : a.echelon > b.echelon ? 1 : a.dateEffet < b.dateEffet ? 1 : -1));
  return (
    <SectionCard title="Grille des salaires minimums par catégorie" icon={Layers} pad={false}
      action={admin && <button onClick={() => on.scale({})} className="kb-btn kb-btn-primary text-xs"><Plus size={13} /> Ajouter une ligne</button>}>
      <p className="text-xs px-4 pt-3" style={{ color: "var(--muted)" }}>Catégorie et qualification sont deux informations distinctes. Les catégories sans montant restent signalées dans les alertes tant que la grille officielle n'est pas saisie.</p>
      {rows.length === 0 ? <EmptyState icon={Layers} title="Grille vide" /> : (
        <div className="overflow-x-auto"><table className="w-full text-sm mt-2">
          <thead><tr className="text-left text-xs" style={{ color: "var(--muted)", background: "#F8FAFC" }}>
            <th className="px-3 py-2">Catégorie</th><th className="px-3 py-2">Échelon</th><th className="px-3 py-2">Qualification</th><th className="px-3 py-2 text-right">Minimum mensuel</th>
            <th className="px-3 py-2">Période</th><th className="px-3 py-2">Source</th><th className="px-3 py-2"></th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t" style={{ borderColor: "var(--line)" }}>
              <td className="px-3 py-2 font-medium">{r.categorie}{r.libelle ? ` — ${r.libelle}` : ""}</td><td className="px-3 py-2">{r.echelon || "—"}</td>
              <td className="px-3 py-2">{QUALIFICATIONS[r.qualification]}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.salaireMinimum === null ? <span className="text-red-600">non renseigné</span> : fcfa(r.salaireMinimum)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{fmt(r.dateEffet)}{r.dateFin ? ` → ${fmt(r.dateFin)}` : ""}</td>
              <td className="px-3 py-2 text-xs">{r.source} {r.valide ? <Chip color="#4F9E2A" dot>Validé</Chip> : <Chip color="#C58A1B" dot>À confirmer</Chip>}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">{admin && <>
                <button onClick={() => on.scale(r)} className="p-1.5 rounded hover:bg-slate-100" aria-label="Modifier la ligne"><Pencil size={14} /></button>
                <button onClick={() => on.removeScale(r)} className="p-1.5 rounded hover:bg-slate-100" style={{ color: "#D81F26" }} aria-label="Supprimer la ligne"><Trash2 size={14} /></button></>}</td>
            </tr>))}</tbody>
        </table></div>
      )}
    </SectionCard>
  );
}

/* ---------------- Journal d'audit (administrateur) ---------------- */
const IGNORES = new Set(["updated_at", "updated_by", "created_at", "created_by"]);
function AuditTab({ hr, members }) {
  const [table, setTable] = useState(""); const [ouvert, setOuvert] = useState(null);
  const nom = (id) => members.find((m) => m.id === id)?.name || (id ? "Compte supprimé" : "Système");
  const rows = hr.audit.filter((a) => !table || a.table === table);
  const diff = (a) => {
    const av = a.avant || {}, ap = a.apres || {};
    return [...new Set([...Object.keys(av), ...Object.keys(ap)])].filter((k) => !IGNORES.has(k) && JSON.stringify(av[k]) !== JSON.stringify(ap[k]));
  };
  const v = (x) => (x === null || x === undefined ? "—" : typeof x === "object" ? JSON.stringify(x) : String(x));
  return (
    <SectionCard title="Journal d'audit (300 dernières opérations)" icon={History} pad={false}
      action={<select className="px-2 py-1 rounded-lg border text-xs" style={inputStyle} value={table} onChange={(e) => setTable(e.target.value)} aria-label="Filtrer par élément">
        <option value="">Tous les éléments</option>{Object.entries(TABLE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}>
      {rows.length === 0 ? <EmptyState icon={History} title="Aucune opération" /> : (
        <div className="divide-y" style={{ borderColor: "var(--line)" }}>{rows.map((a) => { const ks = diff(a); const o = ouvert === a.id;
          return (
            <div key={a.id} className="px-4 py-2">
              <button onClick={() => setOuvert(o ? null : a.id)} className="w-full text-left flex flex-wrap items-center gap-2 text-sm">
                {o ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="tabular-nums text-xs" style={{ color: "var(--muted)" }}>{new Date(a.at).toLocaleString("fr-FR")}</span>
                <span className="font-medium">{nom(a.acteur)}</span>
                <Chip color={a.action === "DELETE" ? "#D81F26" : a.action === "INSERT" ? "#4F9E2A" : "#2E78A8"}>{a.action === "DELETE" ? "Suppression" : a.action === "INSERT" ? "Création" : "Modification"}</Chip>
                <span>{TABLE_LABELS[a.table] || a.table}</span>
                {a.action === "UPDATE" && <span className="text-xs" style={{ color: "var(--muted)" }}>{ks.join(", ")}</span>}
              </button>
              {o && <div className="overflow-x-auto mt-2"><table className="text-xs w-full">
                <thead><tr className="text-left" style={{ color: "var(--muted)" }}><th className="pr-3 py-1">Champ</th><th className="pr-3 py-1">Avant</th><th className="py-1">Après</th></tr></thead>
                <tbody>{ks.map((k) => <tr key={k} className="border-t align-top" style={{ borderColor: "var(--line)" }}><td className="pr-3 py-1 font-mono">{k}</td>
                  <td className="pr-3 py-1 break-all">{v(a.avant?.[k])}</td><td className="py-1 break-all">{v(a.apres?.[k])}</td></tr>)}</tbody>
              </table></div>}
            </div>); })}</div>
      )}
    </SectionCard>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   9 bis. DOCUMENTS RH — édition, impression, modèles, réglages
   ══════════════════════════════════════════════════════════════════════ */
const DOC_CSS = `
.rh-doc{font-family:Calibri,'Segoe UI',Arial,sans-serif;font-size:13.5px;line-height:1.55;color:#111827}
.rh-doc h1.rh-titre{text-align:center;font-size:17px;font-weight:700;text-transform:uppercase;letter-spacing:.02em;margin:4px 0 14px}
.rh-doc h2.rh-art{font-size:13.5px;font-weight:700;margin:13px 0 4px;page-break-after:avoid;break-after:avoid}
.rh-doc p{margin:0 0 6px;text-align:justify}
.rh-doc p.rh-centre{text-align:center;margin:10px 0}
.rh-doc p.rh-droite{text-align:right;margin:6px 0 12px}
.rh-doc ul{margin:2px 0 8px 22px;list-style:disc}
.rh-doc li{margin:1px 0;text-align:justify}
.rh-doc .rh-fin{page-break-inside:avoid;break-inside:avoid}
.rh-doc table.rh-sign{width:100%;margin-top:20px;border-collapse:collapse;page-break-inside:avoid;break-inside:avoid}
.rh-doc table.rh-sign td{width:50%;vertical-align:top;padding:4px 8px 72px;text-align:center;font-size:12.5px;border:none}
.rh-doc .rh-manque{background:#FFF1B8;border-bottom:1px dashed #C58A1B;color:#8A6212}
@media print{.rh-doc .rh-manque{background:none;border:none;color:inherit}}
`;
function DocStyles() { return <style>{DOC_CSS}</style>; }

/* Choix du document à éditer pour un salarié */
function DocChooserModal({ emp, contracts, templates, params, today, onPick, onClose }) {
  const cs = contracts.filter((c) => c.employeeId === emp.id && c.statut !== "annule").sort((a, b) => (a.dateDebut < b.dateDebut ? 1 : -1));
  const [cid, setCid] = useState(() => (cs.find((c) => c.statut === "actif") || cs[0])?.id || "");
  const contract = cs.find((c) => c.id === cid) || null;
  const liste = modelesDisponibles(templates, contract, params, today);
  return (
    <Modal title={`Éditer un document — ${nomComplet(emp)}`} onClose={onClose}>
      {cs.length > 1 && <Field label="Contrat concerné"><select className={inputCls} style={inputStyle} value={cid} onChange={(e) => setCid(e.target.value)}>
        {cs.map((c) => <option key={c.id} value={c.id}>{CONTRACT_TYPES[c.type]} du {fmt(c.dateDebut)}{c.dateFin ? ` au ${fmt(c.dateFin)}` : ""} — {CONTRACT_STATUS[c.statut].label}</option>)}</select></Field>}
      {!cs.length && <WarnBox tone="info">Aucun contrat enregistré : seuls les documents qui n'en dépendent pas sont proposés.</WarnBox>}
      {liste.length === 0 ? <EmptyState icon={FileText} title="Aucun modèle disponible" sub="Les modèles sont gérés dans Documents › Modèles." /> : (
        <div className="space-y-1.5">{liste.map((t) => (
          <button key={t.id} onClick={() => onPick(t, contract)} className="w-full text-left rounded-lg border px-3 py-2.5 flex items-center gap-2 hover:bg-slate-50" style={{ borderColor: "var(--line)" }}>
            <FileText size={15} style={{ color: "var(--brass)" }} /><span className="flex-1 text-sm font-medium">{t.titre}</span><ChevronRight size={15} style={{ color: "var(--muted)" }} />
          </button>))}</div>
      )}
      <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>L'avenant s'édite depuis l'historique du contrat (lien « Éditer l'avenant »).</p>
    </Modal>
  );
}

/* Joindre l'exemplaire signé (scanné) d'un document édité : il est alors verrouillé */
function SignModal({ doc, onAttach, onClose }) {
  const [file, setFile] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const go = async () => { setBusy(true); setErr(""); const r = await onAttach(doc, file); setBusy(false); if (r?.error) setErr(r.error); else onClose(r); };
  return (
    <Modal title={`Exemplaire signé — ${doc.reference || doc.libelle}`} onClose={() => onClose()}>
      <p className="text-sm mb-3">Joignez le document signé par les deux parties (scan ou photo). Le texte du document sera ensuite verrouillé.</p>
      <Field label="Fichier (PDF, image ou Word — 10 Mo maximum)"><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" className="text-sm" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field>
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={go} busy={busy} disabled={!file} label="Joindre" />
    </Modal>
  );
}

/* Éditeur d'un document : remplissage automatique, retouche, enregistrement, impression */
function DocumentEditor({ tpl, emp, contract, amendment, objet, doc, hr, actions, today, onBack, say }) {
  const det = hr.details.find((d) => d.employeeId === emp?.id) || null;
  const champs = tpl?.champs || [];
  const obj = useMemo(() => contexteObjet(objet, { hr, today, sortieUI: objet?.type === "rupture" ? calculSortieUI(hr, objet.row) : null }), [objet, hr, today]);
  const contexte = useCallback((extra) => buildDocContext({ emp, det, contract, amendment, contracts: hr.contracts, amendments: hr.amendments,
    params: hr.params, settings: hr.settings, agency: AGENCY, extra, champs, today, objetCtx: obj.ctx }), [emp, det, contract, amendment, hr.contracts, hr.amendments, hr.params, hr.settings, champs, today, obj]);
  const [extra, setExtra] = useState(() => { const init = champsInitiaux(champs, contexte({}), today);
    for (const ch of champs) if (obj.extra[ch.cle] && !init[ch.cle]) init[ch.cle] = obj.extra[ch.cle];
    return init; });
  const ctx = useMemo(() => contexte(extra), [contexte, extra]);
  const rendu = useMemo(() => (tpl ? renderTemplate(tpl.corps, ctx) : { html: "", manquants: [] }), [tpl, ctx]);
  const [html, setHtml] = useState(doc ? doc.contenu : null);          // null : texte généré depuis le dossier
  const [edition, setEdition] = useState(false);
  const [saved, setSaved] = useState(doc || null);
  const [majContrat, setMajContrat] = useState(true);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const verrouille = !!saved?.signe;
  const texte = html ?? rendu.html;
  const restants = (texte.match(/class="rh-manque"/g) || []).length;
  const avert = tpl ? avertissementsDocument(tpl.code, { contract, params: hr.params, today, extra, emp, objet, objetCtx: obj.ctx }) : [];
  const titulaire = emp ? nomComplet(emp) : objet?.type === "candidat" ? `${objet.row.nom} ${objet.row.prenoms}`.trim() : "Entreprise";
  const setX = (k, v) => setExtra((x) => ({ ...x, [k]: v }));

  const enregistrer = async () => {
    setBusy(true); setErr("");
    for (const ch of champs) if (ch.obligatoire && (extra[ch.cle] === "" || extra[ch.cle] === null || extra[ch.cle] === undefined) && html === null) {
      setBusy(false); setErr(`Renseignez : ${ch.libelle}.`); return null;
    }
    const r = await actions.saveGeneratedDoc({ id: saved?.id, employeeId: emp?.id || "", categorie: tpl?.categorie || saved?.categorie || "courrier",
      libelle: tpl?.titre || saved?.libelle || "Document", modeleCode: tpl?.code || saved?.modeleCode || "", contenu: sanitizeHtml(texte),
      contractId: contract?.id || "", amendmentId: amendment?.id || "", objetType: objet?.type || saved?.objetType || "", objetId: objet?.row?.id || saved?.objetId || "",
      dateDocument: saved?.dateDocument || today,
      confidentiel: tpl ? tpl.confidentiel : saved?.confidentiel, notes: saved?.notes || "" });
    if (r.error) { setBusy(false); setErr(r.error); return null; }
    if (tpl?.code === "ESSAI_RENOUVELLEMENT" && majContrat && contract && !contract.essaiRenouvele) {
      const r2 = await actions.saveContract({ ...contract, essaiRenouvele: true, essaiRenouvellementNotifieLe: today, essaiConsentementSalarie: !!extra.accord });
      if (r2.error) setErr(`Document enregistré, mais le contrat n'a pas pu être mis à jour : ${r2.error}`);
    }
    setBusy(false);
    const s = { ...(saved || {}), id: r.id, reference: r.reference || saved?.reference || "", signe: false, dateDocument: saved?.dateDocument || today };
    setSaved(s); say(r);
    return s;
  };
  const imprimer = async () => {
    setEdition(false);
    const s = verrouille ? saved : await enregistrer();
    if (s) setTimeout(() => printSheet("portrait"), 60);
  };

  return (
    <div>
      <DocStyles />
      <div className="flex flex-wrap items-center gap-2 mb-3 print:hidden">
        <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour</button>
        <p className="font-semibold flex-1 min-w-[12rem]">{tpl?.titre || saved?.libelle} — {titulaire}</p>
        {saved?.reference && <Chip color="#2E78A8">Réf. {saved.reference}</Chip>}
        {verrouille && <Chip color="#4F9E2A" dot>Signé — verrouillé</Chip>}
        {!verrouille && (edition
          ? <button onClick={() => setEdition(false)} className="kb-btn kb-btn-ghost text-sm"><Check size={14} /> Terminer la modification</button>
          : <button onClick={() => { setHtml(texte); setEdition(true); }} className="kb-btn kb-btn-ghost text-sm"><Pencil size={14} /> Modifier le texte</button>)}
        {!verrouille && html !== null && tpl && <button onClick={() => { setHtml(null); setEdition(false); }} className="kb-btn kb-btn-ghost text-sm">Régénérer depuis le dossier</button>}
        {!verrouille && <button disabled={busy} onClick={enregistrer} className="kb-btn kb-btn-ghost text-sm disabled:opacity-40"><Check size={14} /> {busy ? "…" : "Enregistrer"}</button>}
        <button disabled={busy} onClick={imprimer} className="kb-btn kb-btn-primary text-sm disabled:opacity-40"><Printer size={15} /> Imprimer / PDF</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[18rem_1fr] print:block">
        <aside className="print:hidden space-y-3">
          {err && <WarnBox tone="rouge">{err}</WarnBox>}
          {avert.map((w, i) => <WarnBox key={i} tone={w.niveau}>{w.texte}</WarnBox>)}
          {!verrouille && champs.length > 0 && (
            <div className="bg-white rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
              <p className="text-sm font-semibold mb-2">Informations du document</p>
              {html !== null && tpl && <p className="text-[11px] mb-2" style={{ color: "#8A6212" }}>Texte modifié à la main : ces informations ne s'appliquent qu'après « Régénérer depuis le dossier ».</p>}
              {champs.map((ch) => (ch.type === "case"
                ? <label key={ch.cle} className="flex items-start gap-2 text-sm mb-2"><input type="checkbox" className="mt-1" checked={!!extra[ch.cle]} onChange={(e) => setX(ch.cle, e.target.checked)} /> {ch.libelle}</label>
                : <Field key={ch.cle} label={`${ch.libelle}${ch.obligatoire ? " *" : ""}`}>
                    {ch.type === "zone" ? <textarea rows={3} className={inputCls} style={inputStyle} value={extra[ch.cle] || ""} onChange={(e) => setX(ch.cle, e.target.value)} />
                      : <input type={ch.type === "date" ? "date" : "text"} className={inputCls} style={inputStyle} value={extra[ch.cle] || ""} onChange={(e) => setX(ch.cle, e.target.value)} />}
                  </Field>))}
            </div>
          )}
          {tpl?.code === "ESSAI_RENOUVELLEMENT" && !verrouille && contract && !contract.essaiRenouvele && (
            <label className="flex items-start gap-2 text-sm bg-white rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
              <input type="checkbox" className="mt-1" checked={majContrat} onChange={(e) => setMajContrat(e.target.checked)} />
              Inscrire le renouvellement au contrat à l'enregistrement (notification datée d'aujourd'hui{extra.accord ? ", avec l'accord du salarié" : ""})</label>
          )}
          {restants > 0 && (
            <div className="rounded-xl p-3 text-xs" style={{ background: "#FFF8EC", border: "1px solid #F3E2C6", color: "#8A6212" }}>
              <p className="font-semibold mb-1">{restants} information(s) manquante(s) — imprimées en pointillés à compléter à la main :</p>
              {html === null && <ul className="list-disc ml-4">{rendu.manquants.map((k) => <li key={k}>{libelleVariable(k)}</li>)}</ul>}
              <p className="mt-1">Complétez le dossier du salarié, le contrat ou les réglages des documents (Documents › Réglages), puis revenez sur ce document.</p>
            </div>
          )}
        </aside>
        <div>
          {edition
            ? <div className="rh-doc"><LetterEditor value={html} onChange={setHtml} placeholder="Texte du document" /></div>
            : (
              <PrintPage className="bg-white rounded-xl border p-8 max-w-3xl mx-auto" style={{ borderColor: "var(--line)" }}>
                <PrintHead extra={<p className="text-[11px]" style={{ color: "var(--muted)" }}>Réf. {saved?.reference || "attribuée à l'enregistrement"}</p>} />
                <div className="rh-doc mt-5" dangerouslySetInnerHTML={{ __html: sanitizeHtml(texte) }} />
              </PrintPage>
            )}
        </div>
      </div>
    </div>
  );
}

/* Fiche individuelle du salarié (impression) */
function L({ k, v }) { return <tr><td className="py-1 pr-3 align-top w-56" style={{ color: "var(--muted)" }}>{k}</td><td className="py-1 align-top font-medium">{v || "—"}</td></tr>; }
function Bloc({ titre, children }) {
  return <div className="mt-4"><p className="text-xs font-bold uppercase tracking-wide pb-1 mb-1 border-b" style={{ color: "var(--brass)", borderColor: "var(--line)" }}>{titre}</p>
    <table className="w-full text-[12px]"><tbody>{children}</tbody></table></div>;
}
function FicheSalarie({ emp, hr, members, departments, today, onBack }) {
  const det = hr.details.find((d) => d.employeeId === emp.id) || {};
  const cs = hr.contracts.filter((c) => c.employeeId === emp.id && c.statut !== "annule").sort((a, b) => (a.dateDebut < b.dateDebut ? -1 : 1));
  const c = cs.find((x) => x.statut === "actif") || cs[cs.length - 1] || null;
  const manager = hr.employees.find((e) => e.id === emp.managerId);
  const cu = det.contactUrgence || {};
  return (
    <div>
      <div className="flex items-center justify-between mb-3 print:hidden gap-2 flex-wrap">
        <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour</button>
        <button onClick={() => printSheet("portrait")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF</button>
      </div>
      <PrintPage className="bg-white rounded-xl border p-7 max-w-3xl mx-auto" style={{ borderColor: "var(--line)" }}>
        <PrintHead title="Fiche individuelle du salarié" subtitle={`${nomComplet(emp)} — ${emp.matricule}`} extra={<p className="text-[11px]" style={{ color: "var(--muted)" }}>Confidentiel — édité le {fmt(today)}</p>} />
        <Bloc titre="Identité">
          <L k="Nom et prénoms" v={nomComplet(emp)} /><L k="Matricule" v={emp.matricule} /><L k="Sexe" v={emp.sexe === "F" ? "Féminin" : emp.sexe === "M" ? "Masculin" : ""} />
          <L k="Date et lieu de naissance" v={det.dateNaissance ? `${fmt(det.dateNaissance)}${det.lieuNaissance ? ` à ${det.lieuNaissance}` : ""}` : ""} />
          <L k="Nationalité" v={det.nationalite} /><L k="Pièce d'identité" v={det.pieceType ? `${det.pieceType} n° ${det.pieceNumero}` : ""} />
          <L k="Situation de famille" v={det.situationFamille ? `${SITUATIONS[det.situationFamille]} — ${det.nbEnfantsCharge || 0} enfant(s) à charge` : ""} />
          <L k="Enfants" v={(det.enfants || []).map((x) => `${x.prenom || "?"}${x.date_naissance ? ` (${fmt(x.date_naissance)})` : ""}`).join(", ")} />
        </Bloc>
        <Bloc titre="Coordonnées">
          <L k="Adresse" v={det.adresse} /><L k="Téléphone" v={det.telephone} /><L k="E-mail" v={det.email} />
          <L k="Personne à prévenir" v={cu.nom ? `${cu.nom}${cu.lien ? ` (${cu.lien})` : ""} ${cu.telephone || ""}` : ""} />
        </Bloc>
        <Bloc titre="Emploi">
          <L k="Emploi occupé" v={emp.poste} /><L k="Département" v={departments.find((d) => d.id === emp.departmentId)?.name} />
          <L k="Responsable hiérarchique" v={manager ? nomComplet(manager) : ""} /><L k="Date d'embauche" v={fmt(emp.dateEmbauche)} />
          <L k="Ancienneté" v={libAnciennete(ancienneteMois(emp.dateEmbauche, emp.dateSortie || today))} />
          <L k="Situation" v={`${EMP_STATUS[emp.statut].label}${emp.dateSortie ? ` — sortie le ${fmt(emp.dateSortie)}${emp.motifSortie ? ` (${emp.motifSortie})` : ""}` : ""}`} />
          <L k="Compte de l'application" v={members.find((m) => m.id === emp.userId)?.name} />
        </Bloc>
        {c && <Bloc titre="Contrat">
          <L k="Nature" v={`${CONTRACT_TYPES[c.type]}${c.type === "CDD" ? ` — ${c.motifCdd}` : ""}`} /><L k="Période" v={`${fmt(c.dateDebut)}${c.dateFin ? ` → ${fmt(c.dateFin)}` : ""}`} />
          <L k="Catégorie / qualification" v={`${c.categorie}${c.echelon ? ` / ${c.echelon}` : ""} — ${QUALIFICATIONS[c.qualification]}`} />
          <L k={c.type === "stage" ? "Indemnité de stage" : "Salaire catégoriel + sursalaire"} v={c.type === "stage" ? fcfa(c.salaireBase) : `${fcfa(c.salaireBase)} + ${fcfa(c.sursalaire)} = ${fcfa(remunerationMensuelle(c))}`} />
          <L k="Horaire" v={`${nf(c.horaireHebdo)} h/semaine — ${REPARTITIONS[c.repartition]}`} /><L k="Lieu de travail" v={c.lieuTravail} />
        </Bloc>}
        <Bloc titre="Protection sociale et paiement">
          <L k="N° CNPS" v={det.cnpsNumero} /><L k="N° CMU" v={det.cmuNumero} /><L k="Banque et compte" v={det.banque ? `${det.banque} ${det.numeroCompte}` : ""} />
        </Bloc>
      </PrintPage>
    </div>
  );
}

/* Modèles de documents : consultation (gérante) et modification (administrateur) */
const EXEMPLE = {
  emp: { id: "exemple", nom: "KOUAMÉ", prenoms: "Aya Marie", sexe: "F", matricule: "EMP-2026-001", poste: "Agent commercial", dateEmbauche: "2026-10-01", dateSortie: "", statut: "actif" },
  det: { employeeId: "exemple", dateNaissance: "1996-04-12", lieuNaissance: "Bouaké", nationalite: "ivoirienne", pieceType: "CNI", pieceNumero: "CI000123456", adresse: "Cocody Angré", cnpsNumero: "123456789" },
  contract: { id: "exemple-c", employeeId: "exemple", type: "CDI", dateDebut: "2026-10-01", dateFin: "", categorie: 2, echelon: "", qualification: "employe_mensuel", modePaiement: "mois",
    essaiDuree: 1, essaiUnite: "mois", salaireBase: 75000, sursalaire: 45000, horaireHebdo: 40, repartition: "8h_5j", lieuTravail: "Cocody, Abidjan", clauses: {}, statut: "actif", objet: "", motifCdd: "" },
};
function TemplatesPanel({ hr, admin, actions, today, say }) {
  const [selId, setSelId] = useState("");
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const t = hr.templates.find((x) => x.id === selId) || hr.templates[0] || null;
  const reel = hr.employees.find((e) => e.statut === "actif" && hr.contracts.some((c) => c.employeeId === e.id && c.statut === "actif"));
  const ex = reel ? { emp: reel, det: hr.details.find((d) => d.employeeId === reel.id), contract: hr.contracts.find((c) => c.employeeId === reel.id && c.statut === "actif") } : EXEMPLE;
  const corps = f ? f.corps : t?.corps || "";
  const apercu = useMemo(() => {
    if (!t) return { html: "", manquants: [] };
    const base = { ...ex, contracts: hr.contracts, amendments: hr.amendments, params: hr.params, settings: hr.settings, agency: AGENCY, today, champs: t.champs };
    const c1 = buildDocContext(base);
    return renderTemplate(corps, buildDocContext({ ...base, extra: champsInitiaux(t.champs, c1, today) }));
  }, [t, corps, ex, hr.contracts, hr.amendments, hr.params, hr.settings, today]);
  if (!t) return <EmptyState icon={FileText} title="Aucun modèle" sub="Exécutez migration-v32-2.sql pour installer les modèles." />;
  const choisir = (id) => { setSelId(id); setF(null); setErr(""); };
  const enregistrer = async () => { setBusy(true); setErr(""); const r = await actions.saveTemplate(t, f); setBusy(false); if (r.error) setErr(r.error); else { setF(null); say(r); } };
  const retablir = async () => { setBusy(true); const r = await actions.resetTemplate(t); setBusy(false); if (r.error) setErr(r.error); else { setF(null); say(r); } };
  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <div className="bg-white rounded-xl border p-2 h-fit" style={{ borderColor: "var(--line)" }}>
        {hr.templates.map((x) => (
          <button key={x.id} onClick={() => choisir(x.id)} className="w-full text-left rounded-lg px-2.5 py-2 text-sm flex items-center gap-1.5"
            style={{ background: x.id === t.id ? "#F1F5F9" : "transparent", opacity: x.actif ? 1 : 0.5 }}>
            <span className="flex-1">{x.titre}</span>{x.corps !== x.corpsOrigine && <Chip color="#7C3AED">modifié</Chip>}
          </button>))}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <p className="font-semibold flex-1">{t.titre}</p>
          {admin && !f && <button onClick={() => setF({ titre: t.titre, corps: t.corps, actif: t.actif })} className="kb-btn kb-btn-ghost text-sm"><Pencil size={14} /> Modifier le modèle</button>}
          {admin && !f && t.corps !== t.corpsOrigine && <button disabled={busy} onClick={retablir} className="kb-btn kb-btn-ghost text-sm">Rétablir le modèle d'origine</button>}
        </div>
        {!admin && <WarnBox tone="info">Consultation seule : les modèles sont modifiés par l'administrateur.</WarnBox>}
        {f && (
          <div className="bg-white rounded-xl border p-3 mb-3" style={{ borderColor: "var(--line)" }}>
            <div className="grid sm:grid-cols-[1fr_auto] gap-x-3 items-end">
              <Field label="Titre du modèle"><input className={inputCls} style={inputStyle} value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm mb-4"><input type="checkbox" checked={f.actif} onChange={(e) => setF({ ...f, actif: e.target.checked })} /> Proposé à l'édition</label>
            </div>
            <Field label="Texte du modèle" hint="# titre · ## Article — intertitre (numéroté automatiquement) · - puce · >> aligné à droite · **gras** · {{variable}} · {{#si variable}} … {{sinon}} … {{/si}}">
              <textarea rows={18} className={`${inputCls} font-mono text-xs`} style={inputStyle} value={f.corps} onChange={(e) => setF({ ...f, corps: e.target.value })} /></Field>
            <details className="mb-3"><summary className="text-xs cursor-pointer" style={{ color: "var(--brass)" }}>Variables disponibles</summary>
              <div className="grid sm:grid-cols-2 gap-x-4 text-[11px] mt-2">{VARIABLES.map(([k, l]) => <p key={k}><code>{`{{${k}}}`}</code> — {l}</p>)}
                {t.champs.map((ch) => <p key={ch.cle}><code>{`{{extra.${ch.cle}}}`}</code> — {ch.libelle}</p>)}</div></details>
            <ErrLine err={err} />
            <ModalFooter onClose={() => { setF(null); setErr(""); }} onSubmit={enregistrer} busy={busy} />
          </div>
        )}
        <DocStyles />
        <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>Aperçu {reel ? `avec le dossier de ${nomComplet(reel)}` : "avec un salarié fictif"}</p>
        <div className="bg-white rounded-xl border p-6" style={{ borderColor: "var(--line)" }}><div className="rh-doc" dangerouslySetInnerHTML={{ __html: apercu.html }} /></div>
      </div>
    </div>
  );
}

function SettingsPanel({ hr, admin, actions, say }) {
  const [f, setF] = useState(() => ({ ...hr.settings }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const go = async () => { setBusy(true); setErr(""); const r = await actions.saveSettings(f); setBusy(false); if (r.error) setErr(r.error); else say(r); };
  return (
    <SectionCard title="Réglages des documents" icon={Building2}>
      {!admin && <WarnBox tone="info">Consultation seule : les réglages sont modifiés par l'administrateur.</WarnBox>}
      <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>Raison sociale, adresse, RCCM et compte contribuable sont repris de l'en-tête de l'agence. Complétez ici ce qui est propre aux documents RH.</p>
      <fieldset disabled={!admin}>
        <div className="grid sm:grid-cols-2 gap-x-3">
          <Field label="Nom du signataire"><input className={inputCls} style={inputStyle} value={f.signataireNom} onChange={(e) => set("signataireNom", e.target.value)} placeholder="Ex. : Mme KOFFI Aya" /></Field>
          <Field label="Qualité du signataire"><input className={inputCls} style={inputStyle} value={f.signataireQualite} onChange={(e) => set("signataireQualite", e.target.value)} placeholder="Ex. : Gérante" /></Field>
          <Field label="Ville où les documents sont signés"><input className={inputCls} style={inputStyle} value={f.ville} onChange={(e) => set("ville", e.target.value)} /></Field>
          <Field label="Adresse postale"><input className={inputCls} style={inputStyle} value={f.adressePostale} onChange={(e) => set("adressePostale", e.target.value)} /></Field>
          <Field label="N° d'employeur CNPS"><input className={inputCls} style={inputStyle} value={f.cnpsEmployeur} onChange={(e) => set("cnpsEmployeur", e.target.value)} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={f.signataireFeminin} onChange={(e) => set("signataireFeminin", e.target.checked)} /> La signataire est une femme (« Je soussignée »)</label>
      </fieldset>
      <ErrLine err={err} />
      {admin && <div className="flex justify-end"><button disabled={busy} onClick={go} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> {busy ? "…" : "Enregistrer"}</button></div>}
    </SectionCard>
  );
}

function DocumentsTab({ hr, admin, actions, today, on, say }) {
  const [vue, setVue] = useState("liste");
  const onglets = [["liste", "Documents"], ["modeles", "Modèles"], ["reglages", "Réglages"]];
  return (
    <div>
      <div className="flex gap-1 mb-3">{onglets.map(([k, l]) => (
        <button key={k} onClick={() => setVue(k)} className="px-3 py-1.5 rounded-lg text-sm" style={{ background: vue === k ? "#1F2937" : "#fff", color: vue === k ? "#fff" : "var(--ink)", border: "1px solid var(--line)" }}>{l}</button>))}</div>
      {vue === "liste" && (
        <SectionCard title={`Documents RH (${hr.documents.length})`} icon={FolderOpen} pad={false}
          action={<button onClick={() => on.addDoc({})} className="kb-btn kb-btn-primary text-xs"><Upload size={13} /> Ajouter</button>}>
          <p className="text-xs px-4 pt-3" style={{ color: "var(--muted)" }}>Fichiers stockés dans un espace privé ; chaque ouverture crée un lien valable 5 minutes. Les documents édités depuis un dossier salarié portent une référence RH-AAAA-NNNN.</p>
          <DocTable docs={hr.documents} employees={hr.employees} candidates={hr.candidates} today={today} on={on} showEmployee />
        </SectionCard>
      )}
      {vue === "modeles" && <TemplatesPanel hr={hr} admin={admin} actions={actions} today={today} say={say} />}
      {vue === "reglages" && <SettingsPanel key={JSON.stringify(hr.settings)} hr={hr} admin={admin} actions={actions} say={say} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   11. CONGÉS, PERMISSIONS ET ABSENCES (lot 2)
   ══════════════════════════════════════════════════════════════════════ */
function EmpSelect({ employees, value, onChange, label = "Salarié *", inclureSortis = false, disabled }) {
  const liste = employees.filter((e) => inclureSortis || e.statut !== "sorti" || e.id === value);
  return <Field label={label}><select className={inputCls} style={inputStyle} value={value || ""} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
    <option value="">— Choisir —</option>{liste.map((e) => <option key={e.id} value={e.id}>{nomComplet(e)} ({e.matricule})</option>)}</select></Field>;
}
function Msgs({ msgs }) {
  if (!msgs?.length) return null;
  return <div className="space-y-1.5 mb-3">{msgs.map((m, i) => <WarnBox key={i} tone={m.niveau === "bloquant" ? "rouge" : m.niveau}>{m.texte}</WarnBox>)}</div>;
}

function AbsenceModal({ initial, hr, actions, me, today, onClose }) {
  const [f, setF] = useState(() => ({ employeeId: "", type: "conge_paye", evenement: "", dateDebut: today, dateFin: today, remuneree: true, motif: "", justificatifId: "", notes: "", statut: "demande", ...initial }));
  const [nbOuvrables, setNb] = useState("");
  const [valider, setValider] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const emp = hr.employees.find((e) => e.id === f.employeeId);
  const det = hr.details.find((d) => d.employeeId === f.employeeId);
  const perm = pval(hr.params, "PERMISSIONS_EXCEPTIONNELLES", f.dateDebut || today);
  const jo = joursOuvrables(f.dateDebut, f.dateFin, hr.holidays);
  const jc = joursCalendaires(f.dateDebut, f.dateFin);
  const reprise = f.dateFin ? prochainJourOuvrable(f.dateFin, hr.holidays) : "";
  const solde = emp ? soldeConges({ emp, det, contracts: hr.contracts, absences: hr.absences, adjustments: hr.adjustments, params: hr.params, today: f.dateDebut || today }) : null;
  const msgs = f.employeeId ? controleAbsence({ absence: { ...f, joursOuvrables: initial?.joursOuvrables }, emp, absences: hr.absences, params: hr.params, holidays: hr.holidays, solde, today }) : [];
  const bloquant = msgs.some((m) => m.niveau === "bloquant");
  const changeType = (t) => setF((x) => ({ ...x, type: t, remuneree: ABSENCE_TYPES[t]?.remuneree !== false }));
  const parNombre = (n) => { setNb(n); const k = Number(n); if (k > 0 && f.dateDebut) set("dateFin", finApresOuvrables(f.dateDebut, k, hr.holidays)); };
  const choisirEvenement = (code) => { const ev = (perm?.evenements || []).find((x) => x.code === code); setF((x) => ({ ...x, evenement: code, dateFin: ev && x.dateDebut ? finApresOuvrables(x.dateDebut, ev.jours, hr.holidays) : x.dateFin })); };
  const docs = hr.documents.filter((d) => d.employeeId === f.employeeId);
  const submit = async () => {
    setErr("");
    if (!f.employeeId) return setErr("Choisissez le salarié.");
    if (bloquant) return setErr("Corrigez d'abord les points bloquants signalés.");
    setBusy(true);
    const row = toAbs({ ...f, joursOuvrables: jo, joursCalendaires: jc, dateReprise: reprise, statut: valider ? "valide" : f.statut });
    const r = await actions.saveRow("hr_absences", valider ? { ...row, decide_par: me.id, decide_le: new Date().toISOString() } : row, f.id,
      f.id ? "Absence mise à jour" : valider ? "Absence enregistrée et validée" : "Demande enregistrée");
    setBusy(false);
    if (r.error) setErr(r.error); else onClose(r);
  };
  return (
    <Modal title={f.id ? "Modifier l'absence" : "Nouvelle absence ou demande de congé"} onClose={() => onClose()} wide>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <EmpSelect employees={hr.employees} value={f.employeeId} onChange={(v) => set("employeeId", v)} disabled={!!f.id} />
        <Field label="Nature de l'absence"><select className={inputCls} style={inputStyle} value={f.type} onChange={(e) => changeType(e.target.value)}>
          {Object.entries(ABSENCE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
      </div>
      {f.type === "permission" && <Field label="Événement familial *"><select className={inputCls} style={inputStyle} value={f.evenement} onChange={(e) => choisirEvenement(e.target.value)}>
        <option value="">— Choisir —</option>{(perm?.evenements || []).map((x) => <option key={x.code} value={x.code}>{x.libelle} ({x.jours} j)</option>)}</select></Field>}
      <div className="grid sm:grid-cols-3 gap-x-3">
        <Field label="Premier jour d'absence *"><input type="date" className={inputCls} style={inputStyle} value={f.dateDebut} onChange={(e) => set("dateDebut", e.target.value)} /></Field>
        {f.type === "conge_paye" && <Field label="Ou nombre de jours ouvrables" hint="Calcule le dernier jour"><input type="number" min="1" className={inputCls} style={inputStyle} value={nbOuvrables} onChange={(e) => parNombre(e.target.value)} /></Field>}
        <Field label="Dernier jour d'absence *"><input type="date" className={inputCls} style={inputStyle} value={f.dateFin} onChange={(e) => set("dateFin", e.target.value)} /></Field>
      </div>
      <p className="text-sm mb-3"><b>{jo}</b> jour(s) ouvrable(s) · {jc} jour(s) calendaire(s){reprise && <> · reprise le <b>{fmt(reprise)}</b></>}</p>
      {f.type === "conge_paye" && solde && <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>Solde de congés au {fmt(f.dateDebut)} : <b>{fmt2(solde.solde)}</b> jours ouvrables{!solde.droitOuvert && ` — droit de jouissance ouvert le ${fmt(solde.ouverture)}`}.</p>}
      <Msgs msgs={msgs} />
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Motif ou précisions"><input className={inputCls} style={inputStyle} value={f.motif} onChange={(e) => set("motif", e.target.value)} /></Field>
        <Field label="Justificatif (document déjà enregistré)"><select className={inputCls} style={inputStyle} value={f.justificatifId} onChange={(e) => set("justificatifId", e.target.value)}>
          <option value="">— Aucun —</option>{docs.map((d) => <option key={d.id} value={d.id}>{HR_DOC_CATEGORIES[d.categorie]} — {d.libelle || d.fileName}</option>)}</select></Field>
      </div>
      {f.type === "autre" && <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={f.remuneree} onChange={(e) => set("remuneree", e.target.checked)} /> Absence rémunérée</label>}
      {!f.id && <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={valider} onChange={(e) => setValider(e.target.checked)} /> Valider immédiatement</label>}
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={submit} busy={busy} disabled={bloquant} />
    </Modal>
  );
}

function AdjustModal({ emp, actions, today, onClose }) {
  const [f, setF] = useState({ employeeId: emp.id, dateEffet: today, jours: "", motif: "" });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const go = async () => {
    setErr(""); if (!Number(f.jours)) return setErr("Indiquez un nombre de jours (négatif pour retirer).");
    if (!f.motif.trim()) return setErr("Le motif est obligatoire.");
    setBusy(true); const r = await actions.saveRow("hr_leave_adjustments", toAdj(f), null, "Solde ajusté"); setBusy(false);
    if (r.error) setErr(r.error); else onClose(r);
  };
  return (
    <Modal title={`Ajuster le solde de congés — ${nomComplet(emp)}`} onClose={() => onClose()}>
      <WarnBox tone="info">Pour reprendre un solde existant (congés acquis avant l'utilisation du logiciel), un rappel de congé ou une correction. Chaque ajustement est tracé au journal.</WarnBox>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Jours ouvrables (+ ou −)"><input type="number" step="0.01" className={inputCls} style={inputStyle} value={f.jours} onChange={(e) => setF({ ...f, jours: e.target.value })} /></Field>
        <Field label="Date d'effet"><input type="date" className={inputCls} style={inputStyle} value={f.dateEffet} onChange={(e) => setF({ ...f, dateEffet: e.target.value })} /></Field>
      </div>
      <Field label="Motif *"><input className={inputCls} style={inputStyle} value={f.motif} onChange={(e) => setF({ ...f, motif: e.target.value })} placeholder="Ex. : reprise du solde du bulletin d'août 2026" /></Field>
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={go} busy={busy} />
    </Modal>
  );
}

function HolidayModal({ initial, actions, onClose }) {
  const [f, setF] = useState(() => ({ date: "", libelle: "", type: "chome_paye", aConfirmer: false, source: "", ...initial }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const go = async () => {
    if (!f.date || !f.libelle.trim()) return setErr("Date et libellé obligatoires.");
    setBusy(true); const r = await actions.saveRow("hr_holidays", toHoliday(f), f.id, "Jour férié enregistré"); setBusy(false);
    if (r.error) setErr(/duplicate/.test(r.error) ? "Un jour férié existe déjà à cette date." : r.error); else onClose(r);
  };
  return (
    <Modal title={f.id ? "Modifier le jour férié" : "Ajouter un jour férié"} onClose={() => onClose()}>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Date *"><input type="date" className={inputCls} style={inputStyle} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Régime"><select className={inputCls} style={inputStyle} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
          <option value="chome_paye">Férié, chômé et payé</option><option value="chome">Férié et chômé</option></select></Field>
      </div>
      <Field label="Libellé *"><input className={inputCls} style={inputStyle} value={f.libelle} onChange={(e) => setF({ ...f, libelle: e.target.value })} /></Field>
      <Field label="Source (décret, communiqué)"><input className={inputCls} style={inputStyle} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} /></Field>
      <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={f.aConfirmer} onChange={(e) => setF({ ...f, aConfirmer: e.target.checked })} /> Date à confirmer</label>
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={go} busy={busy} />
    </Modal>
  );
}

function AbsencesTable({ liste, hr, on, compact }) {
  if (!liste.length) return <EmptyState icon={ClipboardList} title="Aucune absence" />;
  return (
    <div className="overflow-x-auto"><table className="w-full text-sm">
      <thead><tr className="text-left text-xs" style={{ color: "var(--muted)", background: "#F8FAFC" }}>
        {!compact && <th className="px-3 py-2">Salarié</th>}<th className="px-3 py-2">Nature</th><th className="px-3 py-2">Période</th><th className="px-3 py-2">Jours</th><th className="px-3 py-2">État</th><th className="px-3 py-2"></th></tr></thead>
      <tbody>{liste.map((a) => { const e = hr.employees.find((x) => x.id === a.employeeId); const t = ABSENCE_TYPES[a.type]; const st = ABS_STATUT[a.statut];
        const ev = a.type === "permission" ? (pval(hr.params, "PERMISSIONS_EXCEPTIONNELLES", a.dateDebut)?.evenements || []).find((x) => x.code === a.evenement) : null;
        return (
          <tr key={a.id} className="border-t" style={{ borderColor: "var(--line)" }}>
            {!compact && <td className="px-3 py-2">{nomComplet(e)}</td>}
            <td className="px-3 py-2"><span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: t?.color }} />{t?.label}{ev ? ` — ${ev.libelle}` : ""}{!a.remuneree && <span className="text-[11px] ml-1" style={{ color: "var(--muted)" }}>(non payée)</span>}</td>
            <td className="px-3 py-2 whitespace-nowrap">{fmt(a.dateDebut)} → {fmt(a.dateFin)}</td>
            <td className="px-3 py-2 whitespace-nowrap">{fmt2(a.joursOuvrables)} j ouvr.</td>
            <td className="px-3 py-2"><Chip color={st.color} dot>{st.label}</Chip></td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              {a.statut === "demande" && <><button onClick={() => on.decideAbsence(a, "valide")} className="kb-btn kb-btn-primary text-xs mr-1">Valider</button>
                <button onClick={() => on.decideAbsence(a, "refuse")} className="kb-btn kb-btn-ghost text-xs mr-1">Refuser</button></>}
              {a.statut === "valide" && ["conge_paye", "permission", "absence_autorisee", "absence_exceptionnelle", "formation", "autre"].includes(a.type) &&
                <button onClick={() => on.docAbsence(a)} className="p-1.5 rounded hover:bg-slate-100" aria-label="Éditer le document de l'absence" title={a.type === "conge_paye" ? "Titre de congé" : "Autorisation d'absence"}><FileText size={14} /></button>}
              {["demande", "valide"].includes(a.statut) && <button onClick={() => on.absence(a)} className="p-1.5 rounded hover:bg-slate-100" aria-label="Modifier l'absence"><Pencil size={14} /></button>}
              {["demande", "valide"].includes(a.statut) && <button onClick={() => on.decideAbsence(a, "annule")} className="p-1.5 rounded hover:bg-slate-100" aria-label="Annuler l'absence" title="Annuler" style={{ color: "#D81F26" }}><X size={14} /></button>}
            </td>
          </tr>); })}</tbody>
    </table></div>
  );
}

function Planning({ hr, mois, setMois }) {
  const [a, m] = mois.split("-").map(Number);
  const nbJours = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const jours = Array.from({ length: nbJours }, (_, i) => `${mois}-${pad(i + 1)}`);
  const feries = feriesSet(hr.holidays);
  const emps = hr.employees.filter((e) => e.statut !== "sorti" || (e.dateSortie && e.dateSortie >= `${mois}-01`));
  const cell = (e, d) => hr.absences.find((x) => x.employeeId === e.id && ["demande", "valide"].includes(x.statut) && x.dateDebut <= d && x.dateFin >= d);
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 print:hidden">
        <input type="month" className="px-3 py-1.5 rounded-lg border text-sm" style={inputStyle} value={mois} onChange={(e) => e.target.value && setMois(e.target.value)} aria-label="Mois du planning" />
        <button onClick={() => printSheet("landscape")} className="kb-btn kb-btn-ghost text-sm"><Printer size={14} /> Imprimer (à afficher)</button>
      </div>
      <PrintPage className="bg-white rounded-xl border p-4 overflow-x-auto" style={{ borderColor: "var(--line)" }}>
        <p className="font-semibold mb-2 capitalize">Planning des absences — {MOIS_NOMS[m - 1]} {a}</p>
        <table className="text-[10px] border-collapse">
          <thead><tr><th className="px-2 py-1 text-left border" style={{ borderColor: "var(--line)" }}>Salarié</th>
            {jours.map((d) => <th key={d} className="w-6 py-1 border text-center" style={{ borderColor: "var(--line)", background: estDimanche(d) || feries.has(d) ? "#EEF1F5" : undefined }}>{Number(d.slice(8))}</th>)}</tr></thead>
          <tbody>{emps.map((e) => (
            <tr key={e.id}><td className="px-2 py-1 border whitespace-nowrap" style={{ borderColor: "var(--line)" }}>{nomComplet(e)}</td>
              {jours.map((d) => { const x = cell(e, d); const t = x ? ABSENCE_TYPES[x.type] : null;
                return <td key={d} className="w-6 h-6 border" title={x ? `${t.label} (${ABS_STATUT[x.statut].label})` : ""}
                  style={{ borderColor: "var(--line)", background: x ? (x.statut === "valide" ? t.color : `${t.color}55`) : estDimanche(d) || feries.has(d) ? "#EEF1F5" : undefined }} />; })}
            </tr>))}</tbody>
        </table>
        <div className="flex flex-wrap gap-3 mt-3 text-[10px]">{Object.values(ABSENCE_TYPES).map((t) => <span key={t.label} className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: t.color }} />{t.label}</span>)}
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "#EEF1F5" }} />Dimanche ou jour férié</span><span>Teinte claire : demande non validée</span></div>
      </PrintPage>
    </div>
  );
}

function CongesTab({ hr, today, on, admin }) {
  const [vue, setVue] = useState("absences");
  const [filtre, setFiltre] = useState("ouvertes");
  const [mois, setMois] = useState(today.slice(0, 7));
  const [annee, setAnnee] = useState(Number(today.slice(0, 4)));
  const liste = hr.absences.filter((a) => (filtre === "toutes" ? true : filtre === "demandes" ? a.statut === "demande" : ["demande", "valide"].includes(a.statut) && a.dateFin >= plusJours(today, -60)));
  const salaries = hr.employees.filter((e) => e.statut !== "sorti");
  const onglets = [["absences", "Absences et demandes"], ["soldes", "Soldes de congés"], ["planning", "Planning"], ["feries", "Jours fériés"]];
  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-3 print:hidden">{onglets.map(([k, l]) => (
        <button key={k} onClick={() => setVue(k)} className="px-3 py-1.5 rounded-lg text-sm" style={{ background: vue === k ? "#1F2937" : "#fff", color: vue === k ? "#fff" : "var(--ink)", border: "1px solid var(--line)" }}>{l}</button>))}
        <div className="flex-1" />
        <button onClick={() => on.absence({})} className="kb-btn kb-btn-primary text-sm"><Plus size={15} /> Nouvelle absence</button>
      </div>
      {vue === "absences" && (
        <SectionCard title="Absences, congés et permissions" icon={ClipboardList} pad={false}
          action={<select className="px-2 py-1 rounded-lg border text-xs" style={inputStyle} value={filtre} onChange={(e) => setFiltre(e.target.value)} aria-label="Filtrer les absences">
            <option value="ouvertes">En cours et à venir</option><option value="demandes">Demandes à traiter</option><option value="toutes">Toutes</option></select>}>
          <AbsencesTable liste={liste} hr={hr} on={on} />
        </SectionCard>
      )}
      {vue === "soldes" && (
        <SectionCard title="Soldes de congés payés" icon={CalendarDays} pad={false}>
          <p className="text-xs px-4 pt-3" style={{ color: "var(--muted)" }}>Acquisition : {String(pval(hr.params, "CONGES_ACQUISITION", today)?.jours_par_mois ?? "—").replace(".", ",")} jours ouvrables par mois de service effectif, majorations d'ancienneté, d'enfants et de médaille à chaque année de service. Le congé doit être pris dans les 12 mois qui suivent l'ouverture du droit.</p>
          <div className="overflow-x-auto"><table className="w-full text-sm mt-2">
            <thead><tr className="text-left text-xs" style={{ color: "var(--muted)", background: "#F8FAFC" }}>
              <th className="px-3 py-2">Salarié</th><th className="px-3 py-2 text-right">Acquis</th><th className="px-3 py-2 text-right">Majorations</th><th className="px-3 py-2 text-right">Ajustements</th>
              <th className="px-3 py-2 text-right">Pris</th><th className="px-3 py-2 text-right">Solde</th><th className="px-3 py-2">Échéance de prise</th><th className="px-3 py-2"></th></tr></thead>
            <tbody>{salaries.map((e) => { const s = soldeConges({ emp: e, det: hr.details.find((d) => d.employeeId === e.id), contracts: hr.contracts, absences: hr.absences, adjustments: hr.adjustments, params: hr.params, today });
              if (!s) return null;
              return (
                <tr key={e.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                  <td className="px-3 py-2">{nomComplet(e)}</td><td className="px-3 py-2 text-right tabular-nums">{fmt2(s.acquisBase)}</td><td className="px-3 py-2 text-right tabular-nums">{fmt2(s.majorations)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt2(s.ajustements)}</td><td className="px-3 py-2 text-right tabular-nums">{fmt2(s.pris)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt2(s.solde)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{!s.droitOuvert ? <span style={{ color: "var(--muted)" }}>droit ouvert le {fmt(s.ouverture)}</span> : s.enRetard ? <Chip color="#D81F26" bg="#FDF2F2">dépassée ({fmt(s.echeance)})</Chip> : fmt(s.echeance)}</td>
                  <td className="px-3 py-2 text-right"><button onClick={() => on.adjust(e)} className="kb-btn kb-btn-ghost text-xs">Ajuster</button></td>
                </tr>); })}</tbody>
          </table></div>
        </SectionCard>
      )}
      {vue === "planning" && <Planning hr={hr} mois={mois} setMois={setMois} />}
      {vue === "feries" && (
        <SectionCard title="Jours fériés" icon={CalendarDays} pad={false} action={<div className="flex gap-2 items-center">
          <input type="number" className="w-24 px-2 py-1 rounded-lg border text-xs" style={inputStyle} value={annee} onChange={(e) => setAnnee(Number(e.target.value))} aria-label="Année" />
          <button onClick={() => on.holiday({})} className="kb-btn kb-btn-primary text-xs"><Plus size={13} /> Ajouter</button></div>}>
          <p className="text-xs px-4 pt-3" style={{ color: "var(--muted)" }}>Les dates des fêtes musulmanes sont fixées chaque année par communiqué : saisissez-les dès leur annonce. Un jour férié n'est pas décompté dans les jours ouvrables de congé.</p>
          <div className="divide-y mt-2" style={{ borderColor: "var(--line)" }}>{hr.holidays.filter((h) => h.date.startsWith(String(annee))).map((h) => (
            <div key={h.id} className="px-4 py-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="w-28 tabular-nums">{fmt(h.date)}</span><span className="flex-1">{h.libelle}</span>
              <Chip color={h.type === "chome_paye" ? "#4F9E2A" : "#64748B"}>{h.type === "chome_paye" ? "chômé et payé" : "chômé"}</Chip>
              {h.aConfirmer && <Chip color="#C58A1B" dot>à confirmer</Chip>}
              <button onClick={() => on.holiday(h)} className="p-1.5 rounded hover:bg-slate-100" aria-label="Modifier le jour férié"><Pencil size={14} /></button>
              {admin && <button onClick={() => on.removeRow("hr_holidays", h.id, `le jour férié du ${fmt(h.date)}`)} className="p-1.5 rounded hover:bg-slate-100" style={{ color: "#D81F26" }} aria-label="Supprimer le jour férié"><Trash2 size={14} /></button>}
            </div>))}</div>
          {!hr.holidays.some((h) => h.date.startsWith(String(annee))) && <EmptyState icon={CalendarDays} title={`Aucun jour férié saisi pour ${annee}`} />}
        </SectionCard>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   12. PAIE (lot 3) — bulletins, validation, livre de paie, état des charges
   ══════════════════════════════════════════════════════════════════════ */
const nfr = (n) => (n === null || n === undefined || n === "" ? "" : Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 }));
const periodeDe = (hr, id) => hr.periods.find((p) => p.id === id);
const contratDuMois = (contracts, empId, debutM, finM) => contracts.filter((c) => c.employeeId === empId && c.statut !== "annule" && c.dateDebut <= finM && (!c.dateFin || c.dateFin >= debutM))
  .sort((a, b) => (a.statut === "actif" ? -1 : b.statut === "actif" ? 1 : a.dateDebut < b.dateDebut ? 1 : -1))[0] || null;
export function salariesDuMois(hr, period) {
  const d1 = debutDuMois(period.annee, period.mois), d2 = finDuMois(period.annee, period.mois);
  return hr.employees.filter((e) => e.dateEmbauche && e.dateEmbauche <= d2 && (!e.dateSortie || e.dateSortie >= d1))
    .filter((e) => { const c = contratDuMois(hr.contracts, e.id, d1, d2); return c && c.type !== "stage"; });
}
/* Données nécessaires au calcul d'un bulletin, à partir de l'état du module */
export function argsBulletin(hr, emp, period, variables = {}, slipId = null) {
  const d1 = debutDuMois(period.annee, period.mois), d2 = finDuMois(period.annee, period.mois);
  const contract = contratDuMois(hr.contracts, emp.id, d1, d2);
  const det = hr.details.find((d) => d.employeeId === emp.id) || null;
  const historique = hr.payslips.filter((b) => b.employeeId === emp.id && b.statut === "valide" && b.id !== slipId)
    .map((b) => { const p = periodeDe(hr, b.periodId); return { ...b, periodeFin: p ? finDuMois(p.annee, p.mois) : "" }; });
  const t = hr.terminations.find((x) => x.employeeId === emp.id && x.dateSortie >= d1 && x.dateSortie <= d2);
  let termination = null;
  if (t) {
    const calcul = calcSortie({ emp, det, contract, t, params: hr.params, scale: hr.scale, payslips: historique, absences: hr.absences, adjustments: hr.adjustments, contracts: hr.contracts, elements: hr.elements });
    (t.elements?.ajustements || []).forEach((x, i) => { if (Number(x.montant)) calcul.lignes.push({ code: String(3900 + i), libelle: x.libelle || "Ajustement", montant: Number(x.montant), soumis: x.soumis !== false, retenue: Number(x.montant) < 0 }); });
    termination = { dateSortie: t.dateSortie, calcul };
  }
  return { emp, det, contract, period, params: hr.params, scale: hr.scale, settings: hr.settings, elements: hr.elements, absences: hr.absences, historique, termination, variables };
}
export function calculerBulletin(hr, emp, period, variables, slipId) {
  const args = argsBulletin(hr, emp, period, variables, slipId);
  const res = calcBulletin(args);
  const d2 = finDuMois(period.annee, period.mois);
  const solde = soldeConges({ emp, det: args.det, contracts: hr.contracts, absences: hr.absences, adjustments: hr.adjustments, params: hr.params, today: d2 });
  const annee = hr.payslips.filter((b) => b.employeeId === emp.id && b.statut === "valide" && b.id !== slipId).filter((b) => { const p = periodeDe(hr, b.periodId); return p && p.annee === period.annee && p.mois < period.mois; });
  const cum = (k) => annee.reduce((t, b) => t + (Number(b[k]) || 0), 0);
  const c = args.contract;
  const entete = {
    nom: nomComplet(emp), civilite: emp.sexe === "F" ? "Mme" : emp.sexe === "M" ? "M." : "", matricule: emp.matricule, emploi: emp.poste,
    categorie: c ? `${c.categorie}${c.echelon ? ` / ${c.echelon}` : ""}` : "", qualification: c ? QUALIFICATIONS[c.qualification] : "", typeContrat: c ? CONTRACT_TYPES[c.type] : "",
    dateEmbauche: emp.dateEmbauche, anciennete: libAnciennete(ancienneteMois(emp.dateEmbauche, d2)), cnps: args.det?.cnpsNumero || "", adresse: args.det?.adresse || "",
    horaire: res.heures ? r2(173.33 * (Number(c?.horaireHebdo) || 40) / 40) : 0, parts: res.parts, joursPayes: res.joursPayes, absences: res.detailsAbsences || [],
    conges: solde ? { acquis: r2(solde.acquisBase + solde.majorations + solde.ajustements), pris: solde.pris, solde: solde.solde } : null,
    cumuls: { brut: cum("brut") + res.brut, imposable: cum("imposable") + res.imposable, salariales: cum("cotisationsSalariales") + res.cotisationsSalariales,
      patronales: cum("cotisationsPatronales") + res.cotisationsPatronales, net: cum("netAPayer") + res.net, heures: annee.reduce((t, b) => t + (Number(b.entete?.heuresPeriode) || 0), 0) + res.heures },
    heuresPeriode: res.heures, anomalies: res.anomalies,
  };
  return { res, entete, contract: c };
}

function BulletinSheet({ slip, period, settings, sautApres }) {
  const e = slip.entete || {}; const L = slip.lignes || [];
  const gains = L.filter((l) => l.section === "gain"); const cot = L.filter((l) => l.section === "cotisation"); const apres = L.filter((l) => l.section === "apres");
  const d1 = debutDuMois(period.annee, period.mois), d2 = finDuMois(period.annee, period.mois);
  const td = "px-1.5 py-0.5 align-top"; const tdr = `${td} text-right tabular-nums`;
  const Row = ({ l }) => (
    <tr><td className={td}>{l.code}</td><td className={td}>{l.libelle}{l.detail ? <span style={{ color: "var(--muted)" }}> — {l.detail}</span> : ""}</td>
      <td className={tdr}>{nfr(l.nombre)}</td><td className={tdr}>{nfr(l.base)}</td><td className={tdr}>{l.taux ? nfr(l.taux) : ""}</td>
      <td className={tdr}>{l.gain ? nfr(l.gain) : ""}</td><td className={tdr}>{l.retenue ? nfr(l.retenue) : ""}</td>
      <td className={tdr}>{l.tauxPat ? nfr(l.tauxPat) : ""}</td><td className={tdr}>{l.pat ? nfr(l.pat) : ""}</td></tr>
  );
  const box = { border: "1px solid #9AA6B5" };
  return (
    <div className="text-[10.5px] leading-snug" style={{ pageBreakAfter: sautApres ? "always" : "auto", breakAfter: sautApres ? "page" : "auto", color: "#111827" }}>
      <table className="w-full border-collapse" style={box}><tbody><tr>
        <td className="p-2 align-top w-1/2" style={box}><p className="text-base font-bold">BULLETIN DE PAIE</p>
          <p className="font-semibold">{AGENCY.name}</p><p>{AGENCY.address}</p>{settings?.adressePostale && <p>{settings.adressePostale}</p>}
          <p>N° employeur CNPS : {settings?.cnpsEmployeur || "…………"}</p></td>
        <td className="p-2 align-top" style={box}>
          <p>Période du <b>{fmt(d1)}</b> au <b>{fmt(d2)}</b></p>
          <p>Paiement le <b>{fmt(slip.datePaiement) || "…………"}</b> par <b>{slip.modePaiement || settings?.modePaiement || "…"}</b></p>
          {slip.numero && <p>N° {slip.numero}</p>}{slip.statut === "brouillon" && <p className="font-bold" style={{ color: "#C58A1B" }}>PROJET — NON VALIDÉ</p>}
          {slip.statut === "annule" && <p className="font-bold" style={{ color: "#D81F26" }}>BULLETIN ANNULÉ — {slip.motifAnnulation}</p>}
          <p className="mt-2 font-semibold">{e.civilite} {e.nom}</p>{e.adresse && <p>{e.adresse}</p>}</td>
      </tr></tbody></table>
      <table className="w-full border-collapse mt-1" style={box}><tbody><tr>
        {[["Matricule", e.matricule], ["Emploi", e.emploi], ["Catégorie", e.categorie], ["Qualification", e.qualification], ["Contrat", e.typeContrat],
          ["Embauche", fmt(e.dateEmbauche)], ["Ancienneté", e.anciennete], ["N° CNPS", e.cnps || "—"], ["Horaire", nfr(e.horaire)], ["Parts ITS", nfr(e.parts)]].map(([k, v]) => (
          <td key={k} className="px-1.5 py-1 align-top" style={box}><p style={{ color: "var(--muted)" }}>{k}</p><p className="font-medium">{v || "—"}</p></td>))}
      </tr></tbody></table>
      {e.conges && <p className="mt-1">Congés (jours ouvrables) — acquis : <b>{nfr(e.conges.acquis)}</b> · pris : <b>{nfr(e.conges.pris)}</b> · reste à prendre : <b>{nfr(e.conges.solde)}</b>{e.absences?.length ? ` · Absences du mois : ${e.absences.join(", ")}` : ""}</p>}
      <table className="w-full border-collapse mt-1" style={box}>
        <thead><tr style={{ background: "#F1F3F5" }}>{["N°", "Désignation", "Nombre", "Base", "Taux", "Gain", "Retenue", "Taux pat.", "Part patronale"].map((h) => <th key={h} className="px-1.5 py-1 text-left font-semibold" style={box}>{h}</th>)}</tr></thead>
        <tbody>
          {gains.map((l, i) => <Row key={`g${i}`} l={l} />)}
          <tr style={{ background: "#F8FAFC" }}><td /><td className={`${td} font-semibold`}>Total brut</td><td /><td /><td /><td className={`${tdr} font-semibold`}>{nfr(slip.brut)}</td><td /><td /><td /></tr>
          {cot.map((l, i) => <Row key={`c${i}`} l={l} />)}
          <tr style={{ background: "#F8FAFC" }}><td /><td className={`${td} font-semibold`}>Total cotisations</td><td /><td /><td /><td /><td className={`${tdr} font-semibold`}>{nfr(slip.cotisationsSalariales)}</td><td /><td className={`${tdr} font-semibold`}>{nfr(slip.cotisationsPatronales)}</td></tr>
          {apres.map((l, i) => <Row key={`a${i}`} l={l} />)}
        </tbody>
      </table>
      <table className="w-full border-collapse mt-1" style={box}>
        <thead><tr style={{ background: "#F1F3F5" }}>{["Cumuls", "Salaire brut", "Net imposable", "Charges salariales", "Charges patronales", "Heures travaillées", "NET À PAYER"].map((h) => <th key={h} className="px-1.5 py-1 text-left font-semibold" style={box}>{h}</th>)}</tr></thead>
        <tbody>
          <tr><td className={td} style={box}>Période</td><td className={tdr} style={box}>{nfr(slip.brut)}</td><td className={tdr} style={box}>{nfr(slip.imposable)}</td><td className={tdr} style={box}>{nfr(slip.cotisationsSalariales)}</td>
            <td className={tdr} style={box}>{nfr(slip.cotisationsPatronales)}</td><td className={tdr} style={box}>{nfr(e.heuresPeriode)}</td><td className={`${tdr} text-sm font-bold`} style={box} rowSpan={2}>{nfr(slip.netAPayer)}</td></tr>
          <tr><td className={td} style={box}>Année</td><td className={tdr} style={box}>{nfr(e.cumuls?.brut)}</td><td className={tdr} style={box}>{nfr(e.cumuls?.imposable)}</td><td className={tdr} style={box}>{nfr(e.cumuls?.salariales)}</td>
            <td className={tdr} style={box}>{nfr(e.cumuls?.patronales)}</td><td className={tdr} style={box}>{nfr(e.cumuls?.heures)}</td></tr>
        </tbody>
      </table>
      <p className="mt-1 text-[9px]" style={{ color: "var(--muted)" }}>Net à payer en lettres : {amountInWords(slip.netAPayer)}. En cas de contestation, le salarié peut demander la justification des éléments du bulletin.</p>
    </div>
  );
}

function slipPourAffichage(base, res, entete, period) {
  return { ...base, entete, lignes: res.lignes, brut: res.brut, imposable: res.imposable, cotisationsSalariales: res.cotisationsSalariales,
    cotisationsPatronales: res.cotisationsPatronales, netAPayer: res.net, coutTotal: res.cout, datePaiement: base.datePaiement || period.datePaiement, modePaiement: period.modePaiement };
}

function PayslipEditor({ slip, hr, actions, admin, period, onBack, say }) {
  const emp = hr.employees.find((e) => e.id === slip.employeeId);
  const [v, setV] = useState(() => ({ primes: [], retenues: [], heuresSup: {}, ...(slip.variables || {}) }));
  const [netCible, setNetCible] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [annul, setAnnul] = useState(false); const [motif, setMotif] = useState("");
  const lecture = slip.statut !== "brouillon";
  const calc = useMemo(() => (emp ? calculerBulletin(hr, emp, period, v, slip.id) : null), [hr, emp, period, v, slip.id]);
  if (!emp || !calc) return <EmptyState icon={Users} title="Salarié introuvable" />;
  const affiche = lecture ? { ...slip, datePaiement: period.datePaiement, modePaiement: period.modePaiement } : slipPourAffichage(slip, calc.res, calc.entete, period);
  const set = (k, val) => setV((x) => ({ ...x, [k]: val }));
  const setListe = (k, i, champ, val) => setV((x) => ({ ...x, [k]: x[k].map((it, j) => (j === i ? { ...it, [champ]: val } : it)) }));
  const hsDefs = pval(hr.params, "HS_MAJORATIONS", finDuMois(period.annee, period.mois))?.majorations || [];
  const enregistrer = async () => {
    setBusy(true); setErr("");
    const row = toSlip({ periodId: slip.periodId, employeeId: slip.employeeId, contractId: calc.contract?.id, variables: v, entete: calc.entete, lignes: calc.res.lignes,
      brut: calc.res.brut, imposable: calc.res.imposable, cotisationsSalariales: calc.res.cotisationsSalariales, cotisationsPatronales: calc.res.cotisationsPatronales,
      netAPayer: calc.res.net, coutTotal: calc.res.cout });
    const r = await actions.saveRow("hr_payslips", row, slip.id, "Bulletin enregistré");
    setBusy(false); if (r.error) { setErr(r.error); return false; } say(r); return true;
  };
  const imprimer = async () => { if (!lecture && !(await enregistrer())) return; setTimeout(() => printSheet("portrait"), 60); };
  const calculerNet = () => {
    const r = sursalairePourNet(argsBulletin(hr, emp, period, v, slip.id), netCible);
    if (!r) return setErr("Indiquez un net cible.");
    set("sursalaire", r.sursalaire); say({ message: `Sursalaire du mois : ${fcfa(r.sursalaire)} — net obtenu ${fcfa(r.net)}` });
  };
  const annuler = async () => {
    if (!motif.trim()) return setErr("Indiquez le motif de l'annulation.");
    setBusy(true); const r = await actions.saveRow("hr_payslips", { statut: "annule", motif_annulation: motif.trim() }, slip.id, "Bulletin annulé"); setBusy(false);
    if (r.error) setErr(r.error); else { say(r); onBack(); }
  };
  const num = (k, label, hint) => <Field label={label} hint={hint}><input type="number" step="any" className={inputCls} style={inputStyle} value={v[k] ?? ""} onChange={(e) => set(k, e.target.value)} disabled={lecture} /></Field>;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3 print:hidden">
        <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour à la paie</button>
        <p className="font-semibold flex-1">{nomComplet(emp)} — {libPeriode(period)}</p>
        <Chip color={slip.statut === "valide" ? "#4F9E2A" : slip.statut === "annule" ? "#D81F26" : "#C58A1B"} dot>{slip.statut === "valide" ? `Validé ${slip.numero}` : slip.statut === "annule" ? "Annulé" : "Brouillon"}</Chip>
        {!lecture && <button disabled={busy} onClick={enregistrer} className="kb-btn kb-btn-ghost text-sm disabled:opacity-40"><Check size={14} /> Enregistrer</button>}
        <button disabled={busy} onClick={imprimer} className="kb-btn kb-btn-primary text-sm disabled:opacity-40"><Printer size={15} /> Imprimer</button>
        {admin && slip.statut === "valide" && <button onClick={() => setAnnul(true)} className="kb-btn kb-btn-ghost text-sm" style={{ color: "#D81F26" }}>Annuler le bulletin</button>}
      </div>
      <div className="grid gap-4 lg:grid-cols-[19rem_1fr] print:block">
        <aside className="print:hidden space-y-3">
          {err && <WarnBox tone="rouge">{err}</WarnBox>}
          {annul && <div className="bg-white rounded-xl border p-3" style={{ borderColor: "#F5C6C7" }}>
            <p className="text-sm font-semibold mb-2">Annuler ce bulletin validé</p>
            <Field label="Motif *"><input className={inputCls} style={inputStyle} value={motif} onChange={(e) => setMotif(e.target.value)} /></Field>
            <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>Le bulletin reste au livre de paie avec la mention « annulé ». Un nouveau bulletin pourra être établi pour ce mois.</p>
            <div className="flex gap-2"><button onClick={() => setAnnul(false)} className="kb-btn kb-btn-ghost text-xs">Fermer</button><button disabled={busy} onClick={annuler} className="kb-btn text-xs text-white" style={{ background: "#D81F26" }}>Confirmer l'annulation</button></div>
          </div>}
          {!lecture && (calc.res.anomalies || []).map((a, i) => <WarnBox key={i} tone={a.niveau === "bloquant" ? "rouge" : a.niveau}>{a.texte}</WarnBox>)}
          {!lecture && (
            <div className="bg-white rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
              <p className="text-sm font-semibold mb-2">Éléments du mois</p>
              <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>{calc.res.joursPayes} jour(s) payé(s) sur 30{calc.entete.absences.length ? ` — ${calc.entete.absences.join(", ")}` : ""}. Les absences validées sont reprises automatiquement.</p>
              {num("joursAbsence", "Jours supplémentaires à retenir", "Absence non saisie dans les congés et absences")}
              <p className="text-xs font-semibold mb-1">Heures supplémentaires</p>
              <div className="grid grid-cols-2 gap-x-2">{hsDefs.map((m) => <Field key={m.code} label={`${m.libelle} (+${m.taux} %)`}>
                <input type="number" step="any" min="0" className={inputCls} style={inputStyle} value={v.heuresSup?.[m.code] ?? ""} onChange={(e) => set("heuresSup", { ...v.heuresSup, [m.code]: e.target.value })} /></Field>)}</div>
              {num("paniers", "Primes de panier (nombre)")}
              <p className="text-xs font-semibold mb-1">Primes ponctuelles</p>
              {v.primes.map((p, i) => <div key={i} className="flex gap-1 mb-1.5 items-center">
                <input className={inputCls} style={inputStyle} placeholder="Libellé" value={p.libelle} onChange={(e) => setListe("primes", i, "libelle", e.target.value)} />
                <input type="number" className={`${inputCls} w-28`} style={inputStyle} placeholder="Montant" value={p.montant} onChange={(e) => setListe("primes", i, "montant", e.target.value)} />
                <label className="text-[10px] flex items-center gap-1" title="Soumise aux cotisations et à l'ITS"><input type="checkbox" checked={p.soumis !== false} onChange={(e) => setListe("primes", i, "soumis", e.target.checked)} />soumise</label>
                <button onClick={() => set("primes", v.primes.filter((_, j) => j !== i))} className="p-1" aria-label="Retirer la prime"><Trash2 size={13} /></button></div>)}
              <button onClick={() => set("primes", [...v.primes, { libelle: "", montant: "", soumis: true }])} className="kb-btn kb-btn-ghost text-xs mb-3"><Plus size={12} /> Ajouter une prime</button>
              <label className="flex items-center gap-2 text-sm mb-2"><input type="checkbox" checked={!!v.gratification} onChange={(e) => set("gratification", e.target.checked)} /> Verser la gratification de fin d'année</label>
              {v.gratification && num("gratificationMontant", "Montant de la gratification (vide : calcul conventionnel)")}
              {num("allocationJours", "Allocation de congé : jours calendaires", "Vide : congés validés commençant ce mois")}
              {num("allocationMontant", "Allocation de congé : montant forcé")}
              {num("transport", "Prime de transport du mois (plein)", `Par défaut : ${fcfa(hr.settings.primeTransport)}`)}
              {num("sursalaire", "Sursalaire de ce mois (forcé)", calc.contract ? `Contrat : ${fcfa(calc.contract.sursalaire)}` : "")}
              <div className="flex gap-1 items-end mb-3"><Field label="Net cible"><input type="number" className={inputCls} style={inputStyle} value={netCible} onChange={(e) => setNetCible(e.target.value)} /></Field>
                <button onClick={calculerNet} className="kb-btn kb-btn-ghost text-xs mb-3">Calculer</button></div>
              <p className="text-xs font-semibold mb-1">Avances, acomptes et retenues</p>
              {v.retenues.map((p, i) => <div key={i} className="flex gap-1 mb-1.5">
                <input className={inputCls} style={inputStyle} placeholder="Libellé" value={p.libelle} onChange={(e) => setListe("retenues", i, "libelle", e.target.value)} />
                <input type="number" className={`${inputCls} w-28`} style={inputStyle} placeholder="Montant" value={p.montant} onChange={(e) => setListe("retenues", i, "montant", e.target.value)} />
                <button onClick={() => set("retenues", v.retenues.filter((_, j) => j !== i))} className="p-1" aria-label="Retirer la retenue"><Trash2 size={13} /></button></div>)}
              <button onClick={() => set("retenues", [...v.retenues, { libelle: "Avance sur salaire", montant: "" }])} className="kb-btn kb-btn-ghost text-xs"><Plus size={12} /> Ajouter une retenue</button>
            </div>
          )}
        </aside>
        <PrintPage className="bg-white rounded-xl border p-5 max-w-4xl" style={{ borderColor: "var(--line)" }}>
          <BulletinSheet slip={affiche} period={period} settings={hr.settings} />
        </PrintPage>
      </div>
    </div>
  );
}

/* Rubriques du livre de paie : une ligne par rubrique et par nature (gain, retenue salariale, part patronale) */
const NATURE_LIVRE = { "1gain": "Gains", "2ret": "Retenues salariales", "3pat": "Charges patronales", "4ret": "Autres retenues" };
function rubriquesLivre(actifs) {
  const codes = []; const lib = {};
  const nature = (l) => [l.gain ? "1gain" : null, l.retenue ? (l.section === "apres" ? "4ret" : "2ret") : null, l.pat ? "3pat" : null].filter(Boolean);
  actifs.forEach((b) => (b.lignes || []).forEach((l) => nature(l).forEach((n) => { const k = `${n}|${l.code}`; if (!lib[k]) { codes.push(k); lib[k] = l.libelle; } })));
  codes.sort((a, b) => a.split("|")[0].localeCompare(b.split("|")[0]) || Number(a.split("|")[1]) - Number(b.split("|")[1]));
  const val = (b, k) => { const [n, code] = k.split("|"); const champ = n === "1gain" ? "gain" : n === "3pat" ? "pat" : "retenue";
    return (b.lignes || []).filter((x) => x.code === code && nature(x).includes(n)).reduce((t, x) => t + (x[champ] || 0), 0); };
  for (let i = codes.length - 1; i >= 0; i--) if (!actifs.some((b) => val(b, codes[i]))) codes.splice(i, 1);
  return { codes, lib, val };
}
function LivreDePaie({ period, slips, hr }) {
  const actifs = slips.filter((b) => b.statut !== "annule");
  const emps = actifs.map((b) => ({ b, e: hr.employees.find((x) => x.id === b.employeeId) }));
  const { codes, lib, val } = rubriquesLivre(actifs);
  const totaux = [["Brut", "brut"], ["Cotisations salariales", "cotisationsSalariales"], ["Cotisations patronales", "cotisationsPatronales"], ["Net à payer", "netAPayer"], ["Coût total", "coutTotal"]];
  const groupes = []; for (let i = 0; i < emps.length; i += 8) groupes.push(emps.slice(i, i + 8));
  const th = "px-1.5 py-1 border text-right font-semibold"; const bc = { borderColor: "#C9D1DA" };
  return (
    <div>
      {groupes.map((g, gi) => (
        <div key={gi} style={{ pageBreakAfter: gi < groupes.length - 1 ? "always" : "auto" }} className="mb-4">
          <p className="font-bold">Livre de paie mensuel — période du {fmt(debutDuMois(period.annee, period.mois))} au {fmt(finDuMois(period.annee, period.mois))}</p>
          <p className="text-[10px] mb-2" style={{ color: "var(--muted)" }}>{AGENCY.name} · N° employeur CNPS : {hr.settings.cnpsEmployeur || "—"} · édité le {fmt(todayIso())} · {period.statut === "validee" ? `paie validée, payée le ${fmt(period.datePaiement)}` : "AVANT VALIDATION"}{groupes.length > 1 ? ` · feuillet ${gi + 1}/${groupes.length}` : ""}</p>
          <table className="w-full text-[9.5px] border-collapse">
            <thead><tr style={{ background: "#F1F3F5" }}><th className="px-1.5 py-1 border text-left" style={bc}>Rubriques</th>
              {g.map(({ b, e }) => <th key={b.id} className={th} style={bc}>{e?.matricule}<br />{nomComplet(e)}</th>)}
              {gi === groupes.length - 1 && <th className={th} style={bc}>Total</th>}</tr></thead>
            <tbody>
              {codes.map((k, i) => [
                (i === 0 || codes[i - 1].split("|")[0] !== k.split("|")[0]) && <tr key={`t${k}`}><td colSpan={g.length + (gi === groupes.length - 1 ? 2 : 1)} className="px-1.5 pt-1.5 pb-0.5 border font-semibold" style={{ ...bc, background: "#FAFBFC" }}>{NATURE_LIVRE[k.split("|")[0]]}</td></tr>,
                <tr key={k}><td className="px-1.5 py-0.5 border" style={bc}>{k.split("|")[1]} {lib[k]}</td>
                  {g.map(({ b }) => <td key={b.id} className="px-1.5 py-0.5 border text-right tabular-nums" style={bc}>{val(b, k) ? nfr(val(b, k)) : ""}</td>)}
                  {gi === groupes.length - 1 && <td className="px-1.5 py-0.5 border text-right tabular-nums font-semibold" style={bc}>{nfr(actifs.reduce((t, b) => t + val(b, k), 0))}</td>}</tr>])}
              {totaux.map(([l, k]) => (
                <tr key={k} style={{ background: "#F8FAFC" }}><td className="px-1.5 py-0.5 border font-semibold" style={bc}>{l}</td>
                  {g.map(({ b }) => <td key={b.id} className="px-1.5 py-0.5 border text-right tabular-nums font-semibold" style={bc}>{nfr(b[k])}</td>)}
                  {gi === groupes.length - 1 && <td className="px-1.5 py-0.5 border text-right tabular-nums font-bold" style={bc}>{nfr(actifs.reduce((t, b) => t + (Number(b[k]) || 0), 0))}</td>}</tr>))}
            </tbody>
          </table>
        </div>
      ))}
      <p className="text-[10px]">Nombre de salariés : {actifs.length}</p>
    </div>
  );
}

const montantLigne = (b, code, champ) => (b.lignes || []).filter((l) => l.code === code).reduce((t, l) => t + (l[champ] || 0), 0);
function EtatCharges({ period, slips, hr }) {
  const actifs = slips.filter((b) => b.statut !== "annule");
  const cols = [["Brut", (b) => b.brut], ["ITS", (b) => montantLigne(b, "4300", "retenue")], ["CNPS salarié", (b) => montantLigne(b, "4400", "retenue")],
    ["Retraite employeur", (b) => montantLigne(b, "4700", "pat")], ["Prest. familiales", (b) => montantLigne(b, "4800", "pat") + montantLigne(b, "4810", "pat")],
    ["Accident du travail", (b) => montantLigne(b, "4900", "pat")], ["Part patronale IS", (b) => montantLigne(b, "5000", "pat")],
    ["Taxe d'apprentissage", (b) => montantLigne(b, "5200", "pat")], ["Taxe FPC", (b) => montantLigne(b, "5300", "pat")], ["CMU", (b) => montantLigne(b, "6500", "retenue")]];
  const tot = (f) => actifs.reduce((t, b) => t + (f(b) || 0), 0);
  const cnps = tot(cols[2][1]) + tot(cols[3][1]) + tot(cols[4][1]) + tot(cols[5][1]);
  const dgi = tot(cols[1][1]) + tot(cols[6][1]); const fdfp = tot(cols[7][1]) + tot(cols[8][1]);
  const bc = { borderColor: "#C9D1DA" };
  return (
    <div>
      <p className="font-bold">État des charges sociales et fiscales — {libPeriode(period)}</p>
      <p className="text-[10px] mb-2" style={{ color: "var(--muted)" }}>{AGENCY.name} · N° employeur CNPS : {hr.settings.cnpsEmployeur || "—"} · édité le {fmt(todayIso())}</p>
      <table className="w-full text-[9.5px] border-collapse">
        <thead><tr style={{ background: "#F1F3F5" }}><th className="px-1.5 py-1 border text-left" style={bc}>Salarié</th>{cols.map(([l]) => <th key={l} className="px-1.5 py-1 border text-right" style={bc}>{l}</th>)}</tr></thead>
        <tbody>{actifs.map((b) => { const e = hr.employees.find((x) => x.id === b.employeeId); return (
          <tr key={b.id}><td className="px-1.5 py-0.5 border" style={bc}>{e?.matricule} {nomComplet(e)}</td>{cols.map(([l, f]) => <td key={l} className="px-1.5 py-0.5 border text-right tabular-nums" style={bc}>{nfr(f(b))}</td>)}</tr>); })}
          <tr style={{ background: "#F8FAFC" }}><td className="px-1.5 py-0.5 border font-bold" style={bc}>Total</td>{cols.map(([l, f]) => <td key={l} className="px-1.5 py-0.5 border text-right tabular-nums font-bold" style={bc}>{nfr(tot(f))}</td>)}</tr>
        </tbody>
      </table>
      <table className="text-[11px] mt-4 border-collapse"><tbody>
        <tr><td className="px-2 py-1 border" style={bc}>À verser à la CNPS (retraite, prestations familiales, accident du travail)</td><td className="px-2 py-1 border text-right font-bold tabular-nums" style={bc}>{nfr(cnps)}</td></tr>
        <tr><td className="px-2 py-1 border" style={bc}>À verser aux impôts (ITS retenu + part patronale)</td><td className="px-2 py-1 border text-right font-bold tabular-nums" style={bc}>{nfr(dgi)}</td></tr>
        <tr><td className="px-2 py-1 border" style={bc}>FDFP (taxe d'apprentissage + taxe FPC)</td><td className="px-2 py-1 border text-right font-bold tabular-nums" style={bc}>{nfr(fdfp)}</td></tr>
        <tr><td className="px-2 py-1 border" style={bc}>CMU retenue sur les salariés</td><td className="px-2 py-1 border text-right font-bold tabular-nums" style={bc}>{nfr(tot(cols[9][1]))}</td></tr>
      </tbody></table>
    </div>
  );
}
function exporterCSV(period, slips, hr) {
  const actifs = slips.filter((b) => b.statut !== "annule");
  const { codes, lib, val } = rubriquesLivre(actifs);
  const tete = ["Rubrique", ...actifs.map((b) => { const e = hr.employees.find((x) => x.id === b.employeeId); return `${e?.matricule} ${nomComplet(e)}`; }), "Total"];
  const somme = (f) => actifs.reduce((t, b) => t + (Number(f(b)) || 0), 0);
  const rows = [tete, ...codes.map((k) => [`${NATURE_LIVRE[k.split("|")[0]]} — ${k.split("|")[1]} ${lib[k]}`, ...actifs.map((b) => val(b, k)), somme((b) => val(b, k))]),
    ...[["Brut", "brut"], ["Cotisations salariales", "cotisationsSalariales"], ["Cotisations patronales", "cotisationsPatronales"], ["Net à payer", "netAPayer"], ["Coût total", "coutTotal"]]
      .map(([l, k]) => [l, ...actifs.map((b) => b[k]), somme((b) => b[k])])];
  const csv = "﻿" + rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = `livre-de-paie-${period.annee}-${pad(period.mois)}.csv`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PaieTab({ hr, actions, admin, today, say, focus }) {
  const [periodId, setPeriodId] = useState(focus?.periodId || "");
  const [slipId, setSlipId] = useState(focus?.slipId || "");
  const [impression, setImpression] = useState(null);
  const [nouv, setNouv] = useState(() => { if (focus?.annee) return { annee: focus.annee, mois: focus.mois }; const [y, m] = today.split("-").map(Number); return { annee: y, mois: m }; });
  const [datePaiement, setDatePaiement] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const period = hr.periods.find((p) => p.id === periodId) || null;
  const slips = period ? hr.payslips.filter((b) => b.periodId === period.id) : [];
  const ouvrir = async () => {
    setErr(""); const ex = hr.periods.find((p) => p.annee === Number(nouv.annee) && p.mois === Number(nouv.mois));
    if (ex) { setPeriodId(ex.id); return; }
    setBusy(true); const r = await actions.saveRow("hr_pay_periods", toPeriod({ ...nouv, modePaiement: hr.settings.modePaiement }), null, `Paie de ${MOIS_NOMS[nouv.mois - 1]} ${nouv.annee} ouverte`); setBusy(false);
    if (r.error) setErr(r.error); else { say(r); setPeriodId(r.id); }
  };
  if (slipId) { const s = hr.payslips.find((b) => b.id === slipId); const p = s && periodeDe(hr, s.periodId);
    if (s && p) return <PayslipEditor key={s.id + s.statut} slip={s} hr={hr} actions={actions} admin={admin} period={p} onBack={() => setSlipId("")} say={say} />; }
  if (impression && period) {
    const liste = slips.filter((b) => b.statut !== "annule");
    return (
      <div>
        <div className="flex items-center justify-between mb-3 print:hidden gap-2 flex-wrap">
          <button onClick={() => setImpression(null)} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour</button>
          <div className="flex gap-2">{impression !== "bulletins" && <button onClick={() => exporterCSV(period, slips, hr)} className="kb-btn kb-btn-ghost text-sm">Exporter (Excel, CSV)</button>}
            <button onClick={() => printSheet(impression === "bulletins" ? "portrait" : "landscape")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF</button></div>
        </div>
        <PrintPage className="bg-white rounded-xl border p-5" style={{ borderColor: "var(--line)" }}>
          {impression === "bulletins" && liste.map((b, i) => <BulletinSheet key={b.id} slip={{ ...b, datePaiement: period.datePaiement, modePaiement: period.modePaiement }} period={period} settings={hr.settings} sautApres={i < liste.length - 1} />)}
          {impression === "livre" && <LivreDePaie period={period} slips={slips} hr={hr} />}
          {impression === "etat" && <EtatCharges period={period} slips={slips} hr={hr} />}
        </PrintPage>
      </div>
    );
  }
  if (!period) {
    return (
      <div>
        <SectionCard title="Ouvrir la paie d'un mois" icon={Landmark}>
          <div className="flex flex-wrap gap-2 items-end">
            <Field label="Mois"><select className={inputCls} style={inputStyle} value={nouv.mois} onChange={(e) => setNouv({ ...nouv, mois: Number(e.target.value) })}>
              {MOIS_NOMS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></Field>
            <Field label="Année"><input type="number" className={inputCls} style={inputStyle} value={nouv.annee} onChange={(e) => setNouv({ ...nouv, annee: Number(e.target.value) })} /></Field>
            <button disabled={busy} onClick={ouvrir} className="kb-btn kb-btn-primary mb-3 disabled:opacity-40"><Plus size={15} /> Ouvrir la paie</button>
          </div>
          <ErrLine err={err} />
        </SectionCard>
        <SectionCard title="Paies" icon={Layers} pad={false}>
          {hr.periods.length === 0 ? <EmptyState icon={Landmark} title="Aucune paie" sub="Ouvrez la paie du mois pour préparer les bulletins." /> : (
            <div className="divide-y" style={{ borderColor: "var(--line)" }}>{hr.periods.map((p) => { const bs = hr.payslips.filter((b) => b.periodId === p.id && b.statut !== "annule");
              return (
                <button key={p.id} onClick={() => setPeriodId(p.id)} className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-slate-50">
                  <span className="font-medium capitalize flex-1">{libPeriode(p)}</span>
                  <span className="text-sm" style={{ color: "var(--muted)" }}>{bs.length} bulletin(s) · net {fcfa(bs.reduce((t, b) => t + b.netAPayer, 0))}</span>
                  <Chip color={p.statut === "validee" ? "#4F9E2A" : "#C58A1B"} dot>{p.statut === "validee" ? "Validée" : "Ouverte"}</Chip><ChevronRight size={15} />
                </button>); })}</div>
          )}
        </SectionCard>
      </div>
    );
  }
  const eligibles = salariesDuMois(hr, period);
  const manquants = eligibles.filter((e) => !slips.some((b) => b.employeeId === e.id && b.statut !== "annule"));
  const brouillons = slips.filter((b) => b.statut === "brouillon");
  const preparer = async () => {
    setBusy(true); setErr("");
    for (const e of manquants) {
      const c = calculerBulletin(hr, e, period, {}, null);
      const r = await actions.saveRow("hr_payslips", toSlip({ periodId: period.id, employeeId: e.id, contractId: c.contract?.id, variables: {}, entete: c.entete, lignes: c.res.lignes,
        brut: c.res.brut, imposable: c.res.imposable, cotisationsSalariales: c.res.cotisationsSalariales, cotisationsPatronales: c.res.cotisationsPatronales, netAPayer: c.res.net, coutTotal: c.res.cout }), null, "");
      if (r.error) { setBusy(false); setErr(`${nomComplet(e)} : ${r.error}`); return; }
    }
    setBusy(false); say({ message: `${manquants.length} bulletin(s) préparé(s)` });
  };
  const recalculer = async () => {
    setBusy(true); setErr("");
    for (const b of brouillons) {
      const e = hr.employees.find((x) => x.id === b.employeeId); if (!e) continue;
      const c = calculerBulletin(hr, e, period, b.variables, b.id);
      const r = await actions.saveRow("hr_payslips", toSlip({ periodId: period.id, employeeId: e.id, contractId: c.contract?.id, variables: b.variables, entete: c.entete, lignes: c.res.lignes,
        brut: c.res.brut, imposable: c.res.imposable, cotisationsSalariales: c.res.cotisationsSalariales, cotisationsPatronales: c.res.cotisationsPatronales, netAPayer: c.res.net, coutTotal: c.res.cout }), b.id, "");
      if (r.error) { setBusy(false); setErr(`${nomComplet(e)} : ${r.error}`); return; }
    }
    setBusy(false); say({ message: "Bulletins recalculés avec les données à jour" });
  };
  const bloquants = brouillons.flatMap((b) => (b.entete?.anomalies || []).filter((a) => a.niveau === "bloquant").map((a) => `${b.entete?.nom} : ${a.texte}`));
  const valider = async () => {
    setErr("");
    if (!brouillons.length) return setErr("Aucun bulletin en brouillon à valider.");
    if (bloquants.length) return setErr(`Validation impossible : ${bloquants.join(" ; ")}`);
    if (!datePaiement) return setErr("Indiquez la date de paiement (mention obligatoire du bulletin).");
    setBusy(true); const r = await actions.rpc("hr_validate_period", { p_period: period.id, p_date_paiement: datePaiement }, "Paie validée : les bulletins sont verrouillés"); setBusy(false);
    if (r.error) setErr(r.error); else say(r);
  };
  const tot = (k) => slips.filter((b) => b.statut !== "annule").reduce((t, b) => t + (Number(b[k]) || 0), 0);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={() => setPeriodId("")} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Toutes les paies</button>
        <p className="font-semibold capitalize flex-1">Paie de {libPeriode(period)}</p>
        <Chip color={period.statut === "validee" ? "#4F9E2A" : "#C58A1B"} dot>{period.statut === "validee" ? `Validée — paiement le ${fmt(period.datePaiement)}` : "Ouverte"}</Chip>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Users} label="Bulletins" value={slips.filter((b) => b.statut !== "annule").length} sub={`${brouillons.length} brouillon(s)`} />
        <StatCard icon={Landmark} label="Masse salariale brute" value={fcfa(tot("brut"))} tint="#2E78A8" />
        <StatCard icon={Scale} label="Charges patronales" value={fcfa(tot("cotisationsPatronales"))} tint="#C58A1B" />
        <StatCard icon={CheckCircle2} label="Net à payer" value={fcfa(tot("netAPayer"))} tint="#4F9E2A" />
      </div>
      {err && <WarnBox tone="rouge">{err}</WarnBox>}
      <div className="flex flex-wrap gap-2 mb-3">
        {manquants.length > 0 && <button disabled={busy} onClick={preparer} className="kb-btn kb-btn-primary text-sm disabled:opacity-40"><Plus size={14} /> Préparer {manquants.length} bulletin(s)</button>}
        {brouillons.length > 0 && <button disabled={busy} onClick={recalculer} className="kb-btn kb-btn-ghost text-sm disabled:opacity-40">Recalculer les brouillons</button>}
        <button onClick={() => setImpression("bulletins")} className="kb-btn kb-btn-ghost text-sm"><Printer size={14} /> Bulletins</button>
        <button onClick={() => setImpression("livre")} className="kb-btn kb-btn-ghost text-sm"><ClipboardList size={14} /> Livre de paie</button>
        <button onClick={() => setImpression("etat")} className="kb-btn kb-btn-ghost text-sm"><Scale size={14} /> État des charges</button>
      </div>
      {brouillons.length > 0 && (
        <div className="bg-white rounded-xl border p-3 mb-4 flex flex-wrap items-end gap-2" style={{ borderColor: "var(--line)" }}>
          <Field label="Date de paiement *" hint="Au plus tard 8 jours après la fin du mois (Code du travail, art. 32.3)"><input type="date" className={inputCls} style={inputStyle} value={datePaiement} onChange={(e) => setDatePaiement(e.target.value)} /></Field>
          <button disabled={busy} onClick={valider} className="kb-btn kb-btn-primary mb-3 disabled:opacity-40"><ShieldCheck size={15} /> Valider la paie ({brouillons.length})</button>
          {bloquants.length > 0 && <p className="text-xs mb-3" style={{ color: "#B5171D" }}>{bloquants.length} point(s) bloquant(s) à corriger.</p>}
        </div>
      )}
      <SectionCard title="Bulletins du mois" icon={FileText} pad={false}>
        {slips.length === 0 ? <EmptyState icon={FileText} title="Aucun bulletin" sub={manquants.length ? "Cliquez sur « Préparer les bulletins »." : "Aucun salarié sous contrat ce mois-ci."} /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-xs" style={{ color: "var(--muted)", background: "#F8FAFC" }}>
              <th className="px-3 py-2">Salarié</th><th className="px-3 py-2 text-right">Jours</th><th className="px-3 py-2 text-right">Brut</th><th className="px-3 py-2 text-right">Retenues</th><th className="px-3 py-2 text-right">Net</th><th className="px-3 py-2">État</th><th className="px-3 py-2">Contrôles</th></tr></thead>
            <tbody>{slips.map((b) => { const an = b.entete?.anomalies || []; const bl = an.filter((a) => a.niveau === "bloquant").length;
              return (
                <tr key={b.id} onClick={() => setSlipId(b.id)} className="border-t cursor-pointer hover:bg-slate-50" style={{ borderColor: "var(--line)", opacity: b.statut === "annule" ? 0.55 : 1 }}>
                  <td className="px-3 py-2">{b.entete?.nom}<span className="text-xs ml-1" style={{ color: "var(--muted)" }}>{b.entete?.matricule}</span></td>
                  <td className="px-3 py-2 text-right">{b.entete?.joursPayes}</td><td className="px-3 py-2 text-right tabular-nums">{nfr(b.brut)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{nfr(b.cotisationsSalariales)}</td><td className="px-3 py-2 text-right tabular-nums font-semibold">{nfr(b.netAPayer)}</td>
                  <td className="px-3 py-2"><Chip color={b.statut === "valide" ? "#4F9E2A" : b.statut === "annule" ? "#D81F26" : "#C58A1B"} dot>{b.statut === "valide" ? b.numero : b.statut === "annule" ? "Annulé" : "Brouillon"}</Chip></td>
                  <td className="px-3 py-2">{bl ? <Chip color="#B5171D" bg="#FDF2F2">{bl} bloquant(s)</Chip> : an.length ? <Chip color="#8A6212">{an.length} remarque(s)</Chip> : <Chip color="#4F9E2A">OK</Chip>}</td>
                </tr>); })}</tbody>
          </table></div>
        )}
      </SectionCard>
      {admin && period.statut === "ouverte" && !slips.some((b) => b.statut !== "brouillon") && slips.length === 0 &&
        <button onClick={async () => { const r = await actions.deleteRow("hr_pay_periods", period.id, "Paie supprimée"); if (r.error) setErr(r.error); else { say(r); setPeriodId(""); } }} className="kb-btn kb-btn-ghost text-sm mt-2" style={{ color: "#D81F26" }}><Trash2 size={14} /> Supprimer cette paie vide</button>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   13. FINS DE CONTRAT (lot 4)
   ══════════════════════════════════════════════════════════════════════ */
const CHECKLIST_SORTIE = [
  ["notification", "Rupture notifiée par écrit (remise contre décharge ou lettre recommandée)"],
  ["inspection", "Inspecteur du travail informé (licenciement)"],
  ["gestion", "Gestion rendue : procès-verbal de remise (caisse, fonds, reçus, clés, matériel)"],
  ["solde", "Solde de tout compte payé et reçu signé"],
  ["certificat", "Certificat de travail remis"],
  ["releve", "Relevé nominatif de salaires CNPS remis"],
  ["cnps", "Sortie déclarée à la CNPS"],
];
const historiquePaie = (hr, empId) => hr.payslips.filter((b) => b.employeeId === empId && b.statut === "valide")
  .map((b) => { const p = periodeDe(hr, b.periodId); return { ...b, periodeFin: p ? finDuMois(p.annee, p.mois) : "" }; });
export function calculSortieUI(hr, f) {
  const emp = hr.employees.find((e) => e.id === f.employeeId); if (!emp) return null;
  const det = hr.details.find((d) => d.employeeId === emp.id) || null;
  const contract = hr.contracts.find((c) => c.id === f.contractId) || hr.contracts.find((c) => c.employeeId === emp.id && c.statut === "actif") || null;
  const calc = calcSortie({ emp, det, contract, t: f, params: hr.params, scale: hr.scale, payslips: historiquePaie(hr, emp.id), absences: hr.absences, adjustments: hr.adjustments, contracts: hr.contracts, elements: hr.elements });
  (f.elements?.ajustements || []).forEach((x, i) => { if (Number(x.montant)) calc.lignes.push({ code: String(3900 + i), libelle: x.libelle || "Ajustement", montant: Math.round(Number(x.montant)), soumis: x.soumis !== false, calcul: "saisi", retenue: Number(x.montant) < 0 }); });
  calc.total = calc.lignes.reduce((s, l) => s + l.montant, 0);
  return { emp, det, contract, calc };
}

function NouvelleSortieModal({ hr, actions, initial, onClose }) {
  const [f, setF] = useState(() => ({ employeeId: "", motif: "demission", dateSortie: todayIso(), dateNotification: todayIso(), preavisMode: "effectue", ...initial }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const go = async () => {
    if (!f.employeeId) return setErr("Choisissez le salarié.");
    const c = hr.contracts.find((x) => x.employeeId === f.employeeId && x.statut === "actif");
    setBusy(true); const r = await actions.saveRow("hr_terminations", toTerm({ ...f, contractId: c?.id || "" }), null, "Fin de contrat créée"); setBusy(false);
    if (r.error) setErr(r.error); else onClose(r);
  };
  return (
    <Modal title="Nouvelle fin de contrat" onClose={() => onClose()}>
      <EmpSelect employees={hr.employees.filter((e) => e.statut !== "sorti")} value={f.employeeId} onChange={(v) => setF({ ...f, employeeId: v })} />
      <Field label="Motif"><select className={inputCls} style={inputStyle} value={f.motif} onChange={(e) => setF({ ...f, motif: e.target.value })}>
        {Object.entries(MOTIFS_SORTIE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={go} busy={busy} label="Créer" />
    </Modal>
  );
}

function TerminationEditor({ t, hr, actions, admin, on, say, onBack }) {
  const [f, setF] = useState(() => ({ ...t, elements: { ajustements: [], ...(t.elements || {}) }, checklist: { ...(t.checklist || {}) } }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const verrou = t.statut === "valide";
  const r = useMemo(() => calculSortieUI(hr, f), [hr, f]);
  if (!r) return <EmptyState icon={Users} title="Salarié introuvable" />;
  const { emp, calc } = r;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const aj = f.elements.ajustements || [];
  const setAj = (liste) => setF((x) => ({ ...x, elements: { ...x.elements, ajustements: liste } }));
  const enregistrer = async () => {
    setBusy(true); setErr("");
    const res = await actions.saveRow("hr_terminations", toTerm({ ...f, total: calc.total, elements: { ...f.elements, lignes: calc.lignes, preavis: calc.preavis || null, sgm: calc.sgm } }), f.id, "Fin de contrat enregistrée");
    setBusy(false); if (res.error) { setErr(res.error); return false; } say(res); return true;
  };
  const valider = async () => {
    if (!(await enregistrer())) return;
    const res = await actions.rpc("hr_validate_termination", { p_id: f.id }, "Sortie validée : salarié « sorti », contrat terminé, registre à jour");
    if (res.error) setErr(res.error); else { say(res); onBack(); }
  };
  const [y, m] = (f.dateSortie || todayIso()).split("-").map(Number);
  const periode = hr.periods.find((p) => p.annee === y && p.mois === m);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour</button>
        <p className="font-semibold flex-1">{MOTIFS_SORTIE[f.motif]} — {nomComplet(emp)}</p>
        <Chip color={verrou ? "#4F9E2A" : "#C58A1B"} dot>{verrou ? "Sortie validée" : "En préparation"}</Chip>
        {!verrou && <button disabled={busy} onClick={enregistrer} className="kb-btn kb-btn-ghost text-sm"><Check size={14} /> Enregistrer</button>}
        <button onClick={() => on.docRupture(t)} className="kb-btn kb-btn-ghost text-sm"><FileText size={14} /> Documents</button>
        {!verrou && <button disabled={busy} onClick={valider} className="kb-btn kb-btn-primary text-sm"><ShieldCheck size={14} /> Valider la sortie</button>}
      </div>
      {err && <WarnBox tone="rouge">{err}</WarnBox>}
      {calc.alertes.map((a, i) => <WarnBox key={i} tone={a.niveau}>{a.texte}</WarnBox>)}
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title="Rupture" icon={FileSignature}>
          <fieldset disabled={verrou}>
            <div className="grid sm:grid-cols-2 gap-x-3">
              <Field label="Motif"><select className={inputCls} style={inputStyle} value={f.motif} onChange={(e) => set("motif", e.target.value)}>
                {Object.entries(MOTIFS_SORTIE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <Field label="Date de notification" hint="Point de départ du préavis"><input type="date" className={inputCls} style={inputStyle} value={f.dateNotification || ""} onChange={(e) => set("dateNotification", e.target.value)} /></Field>
              <Field label="Préavis"><select className={inputCls} style={inputStyle} value={f.preavisMode} onChange={(e) => set("preavisMode", e.target.value)}>
                {Object.entries(PREAVIS_MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <Field label="Date de sortie (dernier jour) *" hint={calc.preavis?.dateFin ? `Fin du préavis : ${fmt(calc.preavis.dateFin)}` : undefined}>
                <input type="date" className={inputCls} style={inputStyle} value={f.dateSortie} onChange={(e) => set("dateSortie", e.target.value)} /></Field>
              <Field label="Salaire mensuel moyen de référence" hint={`Calculé : ${fcfa(calc.sgm)} (${calc.sgmSource})`}>
                <input type="number" className={inputCls} style={inputStyle} value={f.salaireReference ?? ""} placeholder={String(calc.sgm)} onChange={(e) => set("salaireReference", e.target.value)} /></Field>
            </div>
            {["licenciement_personnel", "licenciement_economique"].includes(f.motif) && <label className="flex items-center gap-2 text-sm mb-2"><input type="checkbox" checked={f.fauteLourde} onChange={(e) => set("fauteLourde", e.target.checked)} /> Faute lourde</label>}
            {calc.preavis?.dateFin && f.preavisMode === "effectue" && f.dateSortie !== calc.preavis.dateFin && <button type="button" onClick={() => set("dateSortie", calc.preavis.dateFin)} className="kb-btn kb-btn-ghost text-xs mb-2">Sortie à la fin du préavis ({fmt(calc.preavis.dateFin)})</button>}
            <p className="text-xs" style={{ color: "var(--muted)" }}>Ancienneté à la sortie : {calc.ancLib}{calc.preavis ? ` · préavis : ${calc.preavis.libelle}${calc.preavis.note ? ` (${calc.preavis.note})` : ""}` : ""}.</p>
            <Field label="Notes"><textarea rows={2} className={inputCls} style={inputStyle} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
          </fieldset>
        </SectionCard>
        <SectionCard title="Sommes dues à la sortie" icon={Landmark}>
          <table className="w-full text-sm"><tbody>
            {calc.lignes.map((l, i) => (
              <tr key={i} className="border-b" style={{ borderColor: "var(--line)" }}><td className="py-1.5 pr-2">{l.libelle}<p className="text-[11px]" style={{ color: "var(--muted)" }}>{l.calcul}{l.soumis ? " · soumis aux cotisations et à l'ITS" : " · hors cotisations et ITS"}</p></td>
                <td className="py-1.5 text-right tabular-nums whitespace-nowrap" style={{ color: l.montant < 0 ? "#B5171D" : undefined }}>{fcfa(l.montant)}</td></tr>))}
            <tr><td className="py-2 font-semibold">Total (hors salaire du dernier mois)</td><td className="py-2 text-right font-bold tabular-nums">{fcfa(calc.total)}</td></tr>
          </tbody></table>
          {!verrou && <div className="mt-2">
            <p className="text-xs font-semibold mb-1">Ajustements (montant négatif pour une retenue)</p>
            {aj.map((x, i) => <div key={i} className="flex gap-1 mb-1.5 items-center">
              <input className={inputCls} style={inputStyle} placeholder="Libellé" value={x.libelle} onChange={(e) => setAj(aj.map((y2, j) => (j === i ? { ...y2, libelle: e.target.value } : y2)))} />
              <input type="number" className={`${inputCls} w-28`} style={inputStyle} value={x.montant} onChange={(e) => setAj(aj.map((y2, j) => (j === i ? { ...y2, montant: e.target.value } : y2)))} />
              <label className="text-[10px] flex items-center gap-1"><input type="checkbox" checked={x.soumis !== false} onChange={(e) => setAj(aj.map((y2, j) => (j === i ? { ...y2, soumis: e.target.checked } : y2)))} />soumis</label>
              <button onClick={() => setAj(aj.filter((_, j) => j !== i))} className="p-1" aria-label="Retirer l'ajustement"><Trash2 size={13} /></button></div>)}
            <button onClick={() => setAj([...aj, { libelle: "", montant: "", soumis: true }])} className="kb-btn kb-btn-ghost text-xs"><Plus size={12} /> Ajouter</button>
          </div>}
          <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>Ces sommes s'ajoutent automatiquement au bulletin du mois de sortie, avec le salaire des jours travaillés.</p>
          <button onClick={() => on.gotoPaie(y, m, periode?.id)} className="kb-btn kb-btn-ghost text-xs mt-2"><Landmark size={13} /> Paie de {MOIS_NOMS[m - 1]} {y}</button>
        </SectionCard>
      </div>
      <SectionCard title="Formalités de sortie" icon={ClipboardList}>
        {CHECKLIST_SORTIE.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm mb-1.5"><input type="checkbox" disabled={verrou} checked={!!f.checklist[k]} onChange={(e) => set("checklist", { ...f.checklist, [k]: e.target.checked })} /> {l}</label>)}
      </SectionCard>
      {admin && !verrou && <button onClick={() => on.removeRow("hr_terminations", f.id, "cette fin de contrat", onBack)} className="kb-btn kb-btn-ghost text-sm" style={{ color: "#D81F26" }}><Trash2 size={14} /> Supprimer ce brouillon</button>}
    </div>
  );
}

function SortiesTab({ hr, actions, admin, on, say }) {
  const [sel, setSel] = useState("");
  const [nouv, setNouv] = useState(false);
  const t = hr.terminations.find((x) => x.id === sel);
  if (t) return <TerminationEditor key={t.id + t.statut} t={t} hr={hr} actions={actions} admin={admin} on={on} say={say} onBack={() => setSel("")} />;
  return (
    <div>
      <div className="flex justify-end mb-3"><button onClick={() => setNouv(true)} className="kb-btn kb-btn-primary text-sm"><Plus size={15} /> Nouvelle fin de contrat</button></div>
      <SectionCard title="Fins de contrat" icon={FileSignature} pad={false}>
        {hr.terminations.length === 0 ? <EmptyState icon={FileSignature} title="Aucune fin de contrat" /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-xs" style={{ color: "var(--muted)", background: "#F8FAFC" }}><th className="px-3 py-2">Salarié</th><th className="px-3 py-2">Motif</th><th className="px-3 py-2">Sortie</th><th className="px-3 py-2 text-right">Sommes dues</th><th className="px-3 py-2">État</th></tr></thead>
            <tbody>{hr.terminations.map((x) => { const e = hr.employees.find((y) => y.id === x.employeeId); return (
              <tr key={x.id} onClick={() => setSel(x.id)} className="border-t cursor-pointer hover:bg-slate-50" style={{ borderColor: "var(--line)" }}>
                <td className="px-3 py-2">{nomComplet(e)}</td><td className="px-3 py-2">{MOTIFS_SORTIE[x.motif]}</td><td className="px-3 py-2">{fmt(x.dateSortie)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fcfa(x.total)}</td><td className="px-3 py-2"><Chip color={x.statut === "valide" ? "#4F9E2A" : "#C58A1B"} dot>{x.statut === "valide" ? "Validée" : "En préparation"}</Chip></td>
              </tr>); })}</tbody>
          </table></div>
        )}
      </SectionCard>
      {nouv && <NouvelleSortieModal hr={hr} actions={actions} onClose={(r) => { setNouv(false); if (r?.id) { say(r); setSel(r.id); } }} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   14. RECRUTEMENT (lot 5)
   ══════════════════════════════════════════════════════════════════════ */
export const CAND_STATUTS = { recu: ["Reçue", "#64748B"], preselection: ["Présélection", "#2E78A8"], entretien: ["Entretien", "#7C3AED"], test: ["Test", "#0D9488"],
  retenu: ["Retenu", "#4F9E2A"], refuse: ["Refusé", "#D81F26"], desiste: ["Désisté", "#94A3B8"], embauche: ["Embauché", "#1F2937"] };
const OPENING_STATUTS = { ouvert: "Ouvert", suspendu: "Suspendu", pourvu: "Pourvu", clos: "Clos" };

function OpeningModal({ initial, actions, onClose }) {
  const [f, setF] = useState(() => ({ intitule: "", typeContrat: "CDI", categorie: "", lieu: "Cocody, Abidjan", nbPostes: 1, description: "", profil: "", canaux: "", dateOuverture: todayIso(), dateLimite: "", statut: "ouvert", ...initial }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const go = async () => { if (!f.intitule.trim()) return setErr("Indiquez l'intitulé du poste."); setBusy(true); const r = await actions.saveRow("hr_job_openings", toOpening(f), f.id, "Poste enregistré"); setBusy(false); if (r.error) setErr(r.error); else onClose(r); };
  return (
    <Modal title={f.id ? "Modifier le poste" : "Nouveau poste à pourvoir"} onClose={() => onClose()} wide>
      <div className="grid sm:grid-cols-3 gap-x-3">
        <div className="sm:col-span-2"><Field label="Intitulé du poste *"><input className={inputCls} style={inputStyle} value={f.intitule} onChange={(e) => set("intitule", e.target.value)} /></Field></div>
        <Field label="État"><select className={inputCls} style={inputStyle} value={f.statut} onChange={(e) => set("statut", e.target.value)}>{Object.entries(OPENING_STATUTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Contrat"><select className={inputCls} style={inputStyle} value={f.typeContrat} onChange={(e) => set("typeContrat", e.target.value)}>{Object.entries(CONTRACT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Catégorie"><input type="number" min="1" className={inputCls} style={inputStyle} value={f.categorie} onChange={(e) => set("categorie", e.target.value)} /></Field>
        <Field label="Nombre de postes"><input type="number" min="1" className={inputCls} style={inputStyle} value={f.nbPostes} onChange={(e) => set("nbPostes", e.target.value)} /></Field>
        <Field label="Lieu"><input className={inputCls} style={inputStyle} value={f.lieu} onChange={(e) => set("lieu", e.target.value)} /></Field>
        <Field label="Ouverture"><input type="date" className={inputCls} style={inputStyle} value={f.dateOuverture} onChange={(e) => set("dateOuverture", e.target.value)} /></Field>
        <Field label="Date limite"><input type="date" className={inputCls} style={inputStyle} value={f.dateLimite} onChange={(e) => set("dateLimite", e.target.value)} /></Field>
      </div>
      <Field label="Missions"><textarea rows={3} className={inputCls} style={inputStyle} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <Field label="Profil recherché"><textarea rows={2} className={inputCls} style={inputStyle} value={f.profil} onChange={(e) => set("profil", e.target.value)} /></Field>
      <Field label="Canaux de diffusion"><input className={inputCls} style={inputStyle} value={f.canaux} onChange={(e) => set("canaux", e.target.value)} placeholder="Educarriere, AGEPE, LinkedIn, groupes WhatsApp…" /></Field>
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={go} busy={busy} />
    </Modal>
  );
}

function CandidateModal({ initial, hr, actions, onClose }) {
  const [f, setF] = useState(() => ({ openingId: "", nom: "", prenoms: "", sexe: "", telephone: "", email: "", source: "", statut: "recu", entretienLe: "", note: "", evaluation: "", ...initial,
    entretienLe: initial?.entretienLe ? String(initial.entretienLe).slice(0, 16) : "" }));
  const [file, setFile] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const go = async () => {
    if (!f.nom.trim()) return setErr("Indiquez le nom du candidat.");
    setBusy(true); setErr(""); let cv = {};
    if (file) { const u = await actions.uploadFile(file, "recrutement"); if (u.error) { setBusy(false); return setErr(u.error); } cv = { cvPath: u.path, cvName: u.name, cvType: u.type }; }
    const r = await actions.saveRow("hr_candidates", toCand({ ...f, ...cv, entretienLe: f.entretienLe ? new Date(f.entretienLe).toISOString() : "" }), f.id, "Candidat enregistré");
    if (r.error && cv.cvPath) await actions.removeFile(cv.cvPath);
    if (!r.error && cv.cvPath && initial?.cvPath) await actions.removeFile(initial.cvPath);
    setBusy(false); if (r.error) setErr(r.error); else onClose(r);
  };
  return (
    <Modal title={f.id ? `Candidat — ${f.nom} ${f.prenoms}` : "Nouveau candidat"} onClose={() => onClose()} wide>
      <div className="grid sm:grid-cols-3 gap-x-3">
        <Field label="Nom *"><input className={inputCls} style={inputStyle} value={f.nom} onChange={(e) => set("nom", e.target.value.toUpperCase())} /></Field>
        <Field label="Prénoms"><input className={inputCls} style={inputStyle} value={f.prenoms} onChange={(e) => set("prenoms", e.target.value)} /></Field>
        <Field label="Sexe"><select className={inputCls} style={inputStyle} value={f.sexe} onChange={(e) => set("sexe", e.target.value)}><option value="">—</option><option value="F">Féminin</option><option value="M">Masculin</option></select></Field>
        <Field label="Téléphone"><input className={inputCls} style={inputStyle} value={f.telephone} onChange={(e) => set("telephone", e.target.value)} /></Field>
        <Field label="E-mail"><input className={inputCls} style={inputStyle} value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Source"><input className={inputCls} style={inputStyle} value={f.source} onChange={(e) => set("source", e.target.value)} placeholder="Annonce, recommandation…" /></Field>
        <Field label="Poste"><select className={inputCls} style={inputStyle} value={f.openingId} onChange={(e) => set("openingId", e.target.value)}>
          <option value="">Candidature spontanée</option>{hr.openings.map((o) => <option key={o.id} value={o.id}>{o.intitule}</option>)}</select></Field>
        <Field label="Étape"><select className={inputCls} style={inputStyle} value={f.statut} onChange={(e) => set("statut", e.target.value)}>{Object.entries(CAND_STATUTS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Entretien le"><input type="datetime-local" className={inputCls} style={inputStyle} value={f.entretienLe} onChange={(e) => set("entretienLe", e.target.value)} /></Field>
        <Field label="Note (sur 20)"><input type="number" min="0" max="20" step="0.5" className={inputCls} style={inputStyle} value={f.note} onChange={(e) => set("note", e.target.value)} /></Field>
      </div>
      <Field label="Évaluation"><textarea rows={3} className={inputCls} style={inputStyle} value={f.evaluation} onChange={(e) => set("evaluation", e.target.value)} /></Field>
      <Field label={f.cvName ? `CV (actuel : ${f.cvName})` : "CV (PDF, image ou Word — 10 Mo)"}><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" className="text-sm" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field>
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={go} busy={busy} />
    </Modal>
  );
}

function RecrutementTab({ hr, actions, on, say }) {
  const [sel, setSel] = useState("tous");
  const [modal, setModal] = useState(null);
  const liste = hr.candidates.filter((c) => sel === "tous" || (sel === "spontanees" ? !c.openingId : c.openingId === sel));
  const changerEtape = async (c, statut) => say(await actions.saveRow("hr_candidates", { statut }, c.id, "Étape mise à jour"));
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3 justify-end">
        <button onClick={() => setModal({ kind: "opening", initial: {} })} className="kb-btn kb-btn-ghost text-sm"><Plus size={14} /> Nouveau poste</button>
        <button onClick={() => setModal({ kind: "cand", initial: { openingId: !["tous", "spontanees"].includes(sel) ? sel : "" } })} className="kb-btn kb-btn-primary text-sm"><UserPlus size={14} /> Ajouter un candidat</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[17rem_1fr]">
        <div className="bg-white rounded-xl border p-2 h-fit" style={{ borderColor: "var(--line)" }}>
          {[["tous", "Tous les candidats"], ["spontanees", "Candidatures spontanées"]].map(([k, l]) => (
            <button key={k} onClick={() => setSel(k)} className="w-full text-left rounded-lg px-2.5 py-2 text-sm" style={{ background: sel === k ? "#F1F5F9" : "transparent" }}>{l}</button>))}
          <p className="text-[11px] font-semibold uppercase px-2.5 mt-2 mb-1" style={{ color: "var(--muted)" }}>Postes</p>
          {hr.openings.map((o) => (
            <div key={o.id} className="flex items-center rounded-lg" style={{ background: sel === o.id ? "#F1F5F9" : "transparent" }}>
              <button onClick={() => setSel(o.id)} className="flex-1 text-left px-2.5 py-2 text-sm">{o.intitule}<span className="block text-[11px]" style={{ color: "var(--muted)" }}>{OPENING_STATUTS[o.statut]} · {hr.candidates.filter((c) => c.openingId === o.id).length} candidat(s)</span></button>
              <button onClick={() => setModal({ kind: "opening", initial: o })} className="p-1.5" aria-label="Modifier le poste"><Pencil size={13} /></button>
            </div>))}
          {!hr.openings.length && <p className="text-xs px-2.5 py-2" style={{ color: "var(--muted)" }}>Aucun poste ouvert.</p>}
        </div>
        <SectionCard title={`Candidats (${liste.length})`} icon={Users} pad={false}>
          {liste.length === 0 ? <EmptyState icon={Users} title="Aucun candidat" /> : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-left text-xs" style={{ color: "var(--muted)", background: "#F8FAFC" }}><th className="px-3 py-2">Candidat</th><th className="px-3 py-2">Poste</th><th className="px-3 py-2">Étape</th><th className="px-3 py-2">Entretien</th><th className="px-3 py-2">Note</th><th className="px-3 py-2"></th></tr></thead>
              <tbody>{liste.map((c) => { const o = hr.openings.find((x) => x.id === c.openingId); return (
                <tr key={c.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                  <td className="px-3 py-2"><button onClick={() => setModal({ kind: "cand", initial: c })} className="text-left font-medium underline-offset-2 hover:underline">{c.nom} {c.prenoms}</button><span className="block text-[11px]" style={{ color: "var(--muted)" }}>{c.telephone} {c.email}</span></td>
                  <td className="px-3 py-2">{o?.intitule || "Spontanée"}</td>
                  <td className="px-3 py-2"><select className="px-2 py-1 rounded-lg border text-xs" style={{ ...inputStyle, color: CAND_STATUTS[c.statut][1] }} value={c.statut} disabled={c.statut === "embauche"} onChange={(e) => changerEtape(c, e.target.value)} aria-label="Étape du candidat">
                    {Object.entries(CAND_STATUTS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></td>
                  <td className="px-3 py-2 whitespace-nowrap">{c.entretienLe ? new Date(c.entretienLe).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                  <td className="px-3 py-2">{c.note === "" ? "—" : `${c.note}/20`}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {c.cvPath && <button onClick={() => on.openDoc({ filePath: c.cvPath })} className="p-1.5 rounded hover:bg-slate-100" aria-label="Ouvrir le CV" title="CV"><Eye size={14} /></button>}
                    <button onClick={() => on.docCandidat(c)} className="p-1.5 rounded hover:bg-slate-100" aria-label="Courriers au candidat" title="Convocation, réponse, promesse d'embauche"><FileText size={14} /></button>
                    {c.statut === "retenu" && <button onClick={() => on.hire(c)} className="kb-btn kb-btn-primary text-xs ml-1">Embaucher</button>}
                    {c.statut === "embauche" && c.employeeId && <button onClick={() => on.openEmployee(c.employeeId)} className="kb-btn kb-btn-ghost text-xs ml-1">Dossier</button>}
                    <button onClick={() => on.removeRow("hr_candidates", c.id, `la candidature de ${c.nom}`, null, c.cvPath)} className="p-1.5 rounded hover:bg-slate-100" style={{ color: "#D81F26" }} aria-label="Supprimer le candidat"><Trash2 size={14} /></button>
                  </td>
                </tr>); })}</tbody>
            </table></div>
          )}
        </SectionCard>
      </div>
      {modal?.kind === "opening" && <OpeningModal initial={modal.initial} actions={actions} onClose={(r) => { setModal(null); if (r) say(r); }} />}
      {modal?.kind === "cand" && <CandidateModal initial={modal.initial} hr={hr} actions={actions} onClose={(r) => { setModal(null); if (r) say(r); }} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   15. DISCIPLINE (lot 6) — Code du travail art. 17.1 à 17.5 ; CCI art. 22
   ══════════════════════════════════════════════════════════════════════ */
function DisciplineModal({ initial, hr, actions, today, on, onClose }) {
  const [f, setF] = useState(() => ({ employeeId: "", faits: "", dateFaits: today, dateConnaissance: today, demandeLe: "", reponseLe: "", explications: "", sanction: "",
    joursMiseAPied: "", dateDecision: "", notifieLe: "", inspectionLe: "", notes: "", ...initial }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const etat = etatDiscipline(f, hr.params, hr.holidays, today);
  const ctr = hr.contracts.find((c) => c.employeeId === f.employeeId && c.statut === "actif");
  const map = f.sanction === "mise_a_pied_1_3" ? [1, 3] : f.sanction === "mise_a_pied_4_8" ? [4, 8] : null;
  const go = async () => {
    setErr("");
    if (!f.employeeId) return setErr("Choisissez le salarié.");
    if (!f.faits.trim()) return setErr("Décrivez les faits reprochés.");
    if (map && !(Number(f.joursMiseAPied) >= map[0] && Number(f.joursMiseAPied) <= map[1])) return setErr(`Durée de mise à pied : de ${map[0]} à ${map[1]} jours.`);
    if (f.sanction && !["classement"].includes(f.sanction) && !f.demandeLe) return setErr("Aucune sanction sans demande d'explication préalable (Code du travail, art. 17.5).");
    setBusy(true); const r = await actions.saveRow("hr_disciplinary", toDisc({ ...f, joursMiseAPied: map ? f.joursMiseAPied : "" }), f.id, "Procédure enregistrée"); setBusy(false);
    if (r.error) setErr(r.error); else onClose(r);
  };
  return (
    <Modal title={f.id ? "Procédure disciplinaire" : "Nouvelle procédure disciplinaire"} onClose={() => onClose()} wide>
      {ctr?.type === "stage" && <WarnBox>Stagiaire : il n'est pas salarié (Code du travail, art. 13.17). Les sanctions disciplinaires ne s'appliquent pas ; privilégiez un recadrage ou la fin anticipée de la convention.</WarnBox>}
      {etat.etape && <WarnBox tone="info">Étape : {etat.etape}{etat.echeanceReponse ? ` · explications attendues le ${fmt(etat.echeanceReponse)}` : ""}{etat.echeanceDecision ? ` · décision au plus tard le ${fmt(etat.echeanceDecision)}` : ""}{etat.invocableJusqua ? ` · invocable jusqu'au ${fmt(etat.invocableJusqua)}` : ""}</WarnBox>}
      {etat.alertes.map((a, i) => <WarnBox key={i} tone={a.niveau}>{a.texte}</WarnBox>)}
      <EmpSelect employees={hr.employees} value={f.employeeId} onChange={(v) => set("employeeId", v)} disabled={!!f.id} />
      <Field label="Faits reprochés *" hint="Faits précis, datés, vérifiables"><textarea rows={3} className={inputCls} style={inputStyle} value={f.faits} onChange={(e) => set("faits", e.target.value)} /></Field>
      <div className="grid sm:grid-cols-4 gap-x-3">
        <Field label="Date des faits"><input type="date" className={inputCls} style={inputStyle} value={f.dateFaits} onChange={(e) => set("dateFaits", e.target.value)} /></Field>
        <Field label="Connus le"><input type="date" className={inputCls} style={inputStyle} value={f.dateConnaissance} onChange={(e) => set("dateConnaissance", e.target.value)} /></Field>
        <Field label="Demande d'explication le"><input type="date" className={inputCls} style={inputStyle} value={f.demandeLe} onChange={(e) => set("demandeLe", e.target.value)} /></Field>
        <Field label="Explications reçues le"><input type="date" className={inputCls} style={inputStyle} value={f.reponseLe} onChange={(e) => set("reponseLe", e.target.value)} /></Field>
      </div>
      <Field label="Explications du salarié (résumé ou transcription)"><textarea rows={2} className={inputCls} style={inputStyle} value={f.explications} onChange={(e) => set("explications", e.target.value)} /></Field>
      <div className="grid sm:grid-cols-4 gap-x-3">
        <Field label="Décision"><select className={inputCls} style={inputStyle} value={f.sanction} onChange={(e) => set("sanction", e.target.value)}>
          <option value="">— En cours —</option>{Object.entries(SANCTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        {map && <Field label="Jours de mise à pied"><input type="number" min={map[0]} max={map[1]} className={inputCls} style={inputStyle} value={f.joursMiseAPied} onChange={(e) => set("joursMiseAPied", e.target.value)} /></Field>}
        <Field label="Décidée le"><input type="date" className={inputCls} style={inputStyle} value={f.dateDecision} onChange={(e) => set("dateDecision", e.target.value)} /></Field>
        <Field label="Notifiée le"><input type="date" className={inputCls} style={inputStyle} value={f.notifieLe} onChange={(e) => set("notifieLe", e.target.value)} /></Field>
        <Field label="Copie à l'inspection le"><input type="date" className={inputCls} style={inputStyle} value={f.inspectionLe} onChange={(e) => set("inspectionLe", e.target.value)} /></Field>
      </div>
      {f.sanction === "licenciement" && <WarnBox tone="info">Le licenciement se prépare dans l'onglet « Sorties » (préavis, indemnités, lettre de licenciement).</WarnBox>}
      <Field label="Notes internes"><textarea rows={2} className={inputCls} style={inputStyle} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      {f.id && <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={() => on.docDiscipline(f)} className="kb-btn kb-btn-ghost text-xs"><FileText size={13} /> Courriers de la procédure</button>
        {map && <button onClick={() => on.absence({ employeeId: f.employeeId, type: "mise_a_pied", dateDebut: today, dateFin: today, motif: "Mise à pied disciplinaire" })} className="kb-btn kb-btn-ghost text-xs">Inscrire la mise à pied dans les absences</button>}
      </div>}
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={go} busy={busy} />
    </Modal>
  );
}

function DisciplineTab({ hr, today, on }) {
  return (
    <div>
      <div className="flex justify-end mb-3"><button onClick={() => on.discipline({})} className="kb-btn kb-btn-primary text-sm"><Plus size={15} /> Nouvelle procédure</button></div>
      <WarnBox tone="info">Demande d'explication écrite ; 72 heures pour répondre ; sanction notifiée dans les 15 jours ouvrables suivant les explications ; copie à l'inspecteur du travail et au délégué ; une même faute ne peut être sanctionnée deux fois ; aucune sanction pécuniaire (Code du travail, art. 17.1 à 17.5).</WarnBox>
      <SectionCard title="Procédures disciplinaires" icon={ShieldAlert} pad={false}>
        {hr.disciplinary.length === 0 ? <EmptyState icon={ShieldAlert} title="Aucune procédure" /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-xs" style={{ color: "var(--muted)", background: "#F8FAFC" }}><th className="px-3 py-2">Salarié</th><th className="px-3 py-2">Faits</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Décision</th><th className="px-3 py-2">Étape</th></tr></thead>
            <tbody>{hr.disciplinary.map((d) => { const e = hr.employees.find((x) => x.id === d.employeeId); const et = etatDiscipline(d, hr.params, hr.holidays, today); return (
              <tr key={d.id} onClick={() => on.discipline(d)} className="border-t cursor-pointer hover:bg-slate-50" style={{ borderColor: "var(--line)" }}>
                <td className="px-3 py-2">{nomComplet(e)}</td><td className="px-3 py-2 max-w-xs truncate">{d.faits}</td><td className="px-3 py-2 whitespace-nowrap">{fmt(d.dateFaits)}</td>
                <td className="px-3 py-2">{d.sanction ? SANCTIONS[d.sanction] : "—"}</td>
                <td className="px-3 py-2">{et.alertes.some((a) => a.niveau === "rouge") ? <Chip color="#B5171D" bg="#FDF2F2">{et.etape}</Chip> : et.etape}</td>
              </tr>); })}</tbody>
          </table></div>
        )}
      </SectionCard>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   16. SANTÉ, SÉCURITÉ ET FORMATION (lot 6)
   ══════════════════════════════════════════════════════════════════════ */
const VISITE_TYPES = { embauche: "Visite d'embauche", periodique: "Visite périodique", reprise: "Visite de reprise", autre: "Autre visite" };
const VISITE_RESULTATS = { apte: "Apte", apte_reserve: "Apte avec réserves", inapte: "Inapte", en_attente: "En attente" };
function VisitModal({ initial, hr, actions, onClose }) {
  const [f, setF] = useState(() => ({ employeeId: "", type: "periodique", dateVisite: todayIso(), medecin: "", resultat: "apte", restrictions: "", prochaineDate: "", documentId: "", ...initial }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const go = async () => { if (!f.employeeId || !f.dateVisite) return setErr("Salarié et date obligatoires."); setBusy(true); const r = await actions.saveRow("hr_medical_visits", toVisit(f), f.id, "Visite enregistrée"); setBusy(false); if (r.error) setErr(r.error); else onClose(r); };
  return (
    <Modal title={f.id ? "Visite médicale" : "Nouvelle visite médicale"} onClose={() => onClose()}>
      <EmpSelect employees={hr.employees} value={f.employeeId} onChange={(v) => set("employeeId", v)} />
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Type"><select className={inputCls} style={inputStyle} value={f.type} onChange={(e) => set("type", e.target.value)}>{Object.entries(VISITE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Date"><input type="date" className={inputCls} style={inputStyle} value={f.dateVisite} onChange={(e) => set("dateVisite", e.target.value)} /></Field>
        <Field label="Médecin ou centre"><input className={inputCls} style={inputStyle} value={f.medecin} onChange={(e) => set("medecin", e.target.value)} /></Field>
        <Field label="Résultat"><select className={inputCls} style={inputStyle} value={f.resultat} onChange={(e) => set("resultat", e.target.value)}>{Object.entries(VISITE_RESULTATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Prochaine visite"><input type="date" className={inputCls} style={inputStyle} value={f.prochaineDate} onChange={(e) => set("prochaineDate", e.target.value)} /></Field>
      </div>
      <Field label="Réserves ou restrictions"><input className={inputCls} style={inputStyle} value={f.restrictions} onChange={(e) => set("restrictions", e.target.value)} /></Field>
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={go} busy={busy} />
    </Modal>
  );
}
function AccidentModal({ initial, hr, actions, on, onClose }) {
  const [f, setF] = useState(() => ({ employeeId: "", dateAccident: "", lieu: "", circonstances: "", trajet: false, temoins: "", lesions: "", declareCnpsLe: "", arretJours: 0, consolidationLe: "", ...initial,
    dateAccident: initial?.dateAccident ? String(initial.dateAccident).slice(0, 16) : "", declareCnpsLe: initial?.declareCnpsLe ? String(initial.declareCnpsLe).slice(0, 16) : "" }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const delai = Number(pval(hr.params, "AT_DECLARATION", todayIso())?.delai_heures) || 48;
  const limite = f.dateAccident ? new Date(new Date(f.dateAccident).getTime() + delai * 3600000) : null;
  const go = async () => {
    if (!f.employeeId || !f.dateAccident) return setErr("Salarié, date et heure de l'accident obligatoires.");
    setBusy(true); const r = await actions.saveRow("hr_work_accidents", toAcc({ ...f, dateAccident: new Date(f.dateAccident).toISOString(), declareCnpsLe: f.declareCnpsLe ? new Date(f.declareCnpsLe).toISOString() : "" }), f.id, "Accident enregistré"); setBusy(false);
    if (r.error) setErr(r.error); else onClose(r);
  };
  return (
    <Modal title={f.id ? "Accident du travail" : "Déclarer un accident du travail"} onClose={() => onClose()} wide>
      {limite && !f.declareCnpsLe && <WarnBox tone={new Date() > limite ? "rouge" : "orange"}>Déclaration à la CNPS dans les {delai} heures : au plus tard le {limite.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}. Joindre le certificat médical initial ; procès-verbal de police ou de gendarmerie pour un accident de trajet.</WarnBox>}
      <div className="grid sm:grid-cols-2 gap-x-3">
        <EmpSelect employees={hr.employees} value={f.employeeId} onChange={(v) => set("employeeId", v)} />
        <Field label="Date et heure de l'accident *"><input type="datetime-local" className={inputCls} style={inputStyle} value={f.dateAccident} onChange={(e) => set("dateAccident", e.target.value)} /></Field>
        <Field label="Lieu"><input className={inputCls} style={inputStyle} value={f.lieu} onChange={(e) => set("lieu", e.target.value)} /></Field>
        <Field label="Témoins"><input className={inputCls} style={inputStyle} value={f.temoins} onChange={(e) => set("temoins", e.target.value)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={f.trajet} onChange={(e) => set("trajet", e.target.checked)} /> Accident de trajet</label>
      <Field label="Circonstances"><textarea rows={2} className={inputCls} style={inputStyle} value={f.circonstances} onChange={(e) => set("circonstances", e.target.value)} /></Field>
      <Field label="Lésions"><input className={inputCls} style={inputStyle} value={f.lesions} onChange={(e) => set("lesions", e.target.value)} /></Field>
      <div className="grid sm:grid-cols-3 gap-x-3">
        <Field label="Déclaré à la CNPS le"><input type="datetime-local" className={inputCls} style={inputStyle} value={f.declareCnpsLe} onChange={(e) => set("declareCnpsLe", e.target.value)} /></Field>
        <Field label="Jours d'arrêt"><input type="number" min="0" className={inputCls} style={inputStyle} value={f.arretJours} onChange={(e) => set("arretJours", e.target.value)} /></Field>
        <Field label="Consolidation le"><input type="date" className={inputCls} style={inputStyle} value={f.consolidationLe} onChange={(e) => set("consolidationLe", e.target.value)} /></Field>
      </div>
      {f.id && Number(f.arretJours) > 0 && <button onClick={() => on.absence({ employeeId: f.employeeId, type: "accident_travail", dateDebut: String(f.dateAccident).slice(0, 10), dateFin: plusJours(String(f.dateAccident).slice(0, 10), Number(f.arretJours) - 1), motif: "Arrêt consécutif à l'accident du travail" })} className="kb-btn kb-btn-ghost text-xs mb-3">Inscrire l'arrêt dans les absences</button>}
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={go} busy={busy} />
    </Modal>
  );
}
function TrainingModal({ initial, hr, actions, onClose }) {
  const [f, setF] = useState(() => ({ intitule: "", organisme: "", dateDebut: todayIso(), dateFin: "", cout: 0, financement: "entreprise", participants: [], evaluation: "", ...initial }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const tog = (id) => set("participants", f.participants.includes(id) ? f.participants.filter((x) => x !== id) : [...f.participants, id]);
  const go = async () => { if (!f.intitule.trim()) return setErr("Indiquez l'intitulé."); setBusy(true); const r = await actions.saveRow("hr_trainings", toTraining(f), f.id, "Formation enregistrée"); setBusy(false); if (r.error) setErr(r.error); else onClose(r); };
  return (
    <Modal title={f.id ? "Formation" : "Nouvelle formation"} onClose={() => onClose()} wide>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Intitulé *"><input className={inputCls} style={inputStyle} value={f.intitule} onChange={(e) => set("intitule", e.target.value)} /></Field>
        <Field label="Organisme"><input className={inputCls} style={inputStyle} value={f.organisme} onChange={(e) => set("organisme", e.target.value)} /></Field>
        <Field label="Début"><input type="date" className={inputCls} style={inputStyle} value={f.dateDebut} onChange={(e) => set("dateDebut", e.target.value)} /></Field>
        <Field label="Fin"><input type="date" className={inputCls} style={inputStyle} value={f.dateFin} onChange={(e) => set("dateFin", e.target.value)} /></Field>
        <Field label="Coût (FCFA)"><input type="number" min="0" className={inputCls} style={inputStyle} value={f.cout} onChange={(e) => set("cout", e.target.value)} /></Field>
        <Field label="Financement"><select className={inputCls} style={inputStyle} value={f.financement} onChange={(e) => set("financement", e.target.value)}><option value="entreprise">Entreprise</option><option value="fdfp">FDFP</option><option value="autre">Autre</option></select></Field>
      </div>
      <p className="text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Participants</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">{hr.employees.filter((e) => e.statut !== "sorti").map((e) => <label key={e.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={f.participants.includes(e.id)} onChange={() => tog(e.id)} />{nomComplet(e)}</label>)}</div>
      <Field label="Évaluation"><textarea rows={2} className={inputCls} style={inputStyle} value={f.evaluation} onChange={(e) => set("evaluation", e.target.value)} /></Field>
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={go} busy={busy} />
    </Modal>
  );
}
function SanteTab({ hr, on }) {
  const nom = (id) => nomComplet(hr.employees.find((e) => e.id === id));
  return (
    <div>
      <SectionCard title="Visites médicales" icon={ShieldCheck} pad={false} action={<button onClick={() => on.visit({})} className="kb-btn kb-btn-primary text-xs"><Plus size={13} /> Ajouter</button>}>
        {hr.visits.length === 0 ? <EmptyState icon={ShieldCheck} title="Aucune visite enregistrée" /> : <div className="divide-y" style={{ borderColor: "var(--line)" }}>{hr.visits.map((v) => (
          <button key={v.id} onClick={() => on.visit(v)} className="w-full text-left px-4 py-2 text-sm flex flex-wrap gap-2 hover:bg-slate-50">
            <span className="w-24">{fmt(v.dateVisite)}</span><span className="flex-1">{nom(v.employeeId)} — {VISITE_TYPES[v.type]}</span><Chip color={v.resultat === "inapte" ? "#D81F26" : v.resultat === "apte" ? "#4F9E2A" : "#C58A1B"}>{VISITE_RESULTATS[v.resultat]}</Chip>
            {v.prochaineDate && <span className="text-xs" style={{ color: "var(--muted)" }}>prochaine : {fmt(v.prochaineDate)}</span>}</button>))}</div>}
      </SectionCard>
      <SectionCard title="Accidents du travail" icon={AlertTriangle} pad={false} action={<button onClick={() => on.accident({})} className="kb-btn kb-btn-primary text-xs"><Plus size={13} /> Déclarer</button>}>
        {hr.accidents.length === 0 ? <EmptyState icon={AlertTriangle} title="Aucun accident enregistré" /> : <div className="divide-y" style={{ borderColor: "var(--line)" }}>{hr.accidents.map((a) => (
          <button key={a.id} onClick={() => on.accident(a)} className="w-full text-left px-4 py-2 text-sm flex flex-wrap gap-2 hover:bg-slate-50">
            <span className="w-24">{fmt(String(a.dateAccident).slice(0, 10))}</span><span className="flex-1">{nom(a.employeeId)}{a.trajet ? " — accident de trajet" : ""}</span>
            {a.declareCnpsLe ? <Chip color="#4F9E2A">déclaré à la CNPS</Chip> : <Chip color="#D81F26" bg="#FDF2F2">non déclaré</Chip>}</button>))}</div>}
      </SectionCard>
      <SectionCard title="Formations" icon={Briefcase} pad={false} action={<button onClick={() => on.training({})} className="kb-btn kb-btn-primary text-xs"><Plus size={13} /> Ajouter</button>}>
        {hr.trainings.length === 0 ? <EmptyState icon={Briefcase} title="Aucune formation" /> : <div className="divide-y" style={{ borderColor: "var(--line)" }}>{hr.trainings.map((t) => (
          <button key={t.id} onClick={() => on.training(t)} className="w-full text-left px-4 py-2 text-sm flex flex-wrap gap-2 hover:bg-slate-50">
            <span className="w-24">{fmt(t.dateDebut)}</span><span className="flex-1">{t.intitule}{t.organisme ? ` — ${t.organisme}` : ""}</span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>{t.participants.length} participant(s) · {fcfa(t.cout)}</span></button>))}</div>}
      </SectionCard>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   17. DÉCLARATIONS ET INDICATEURS (lot 6)
   ══════════════════════════════════════════════════════════════════════ */
const EVENT_TYPES = { cessation: "Cessation (partielle ou totale) d'activité", reprise: "Reprise d'activité", fermeture: "Fermeture définitive", statut: "Changement de statut juridique", transfert: "Transfert d'emplacement", activite: "Changement d'activité" };
function EventModal({ initial, actions, onClose }) {
  const [f, setF] = useState(() => ({ type: "transfert", dateEvenement: todayIso(), description: "", declareLe: "", ...initial }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const go = async () => { setBusy(true); const r = await actions.saveRow("hr_company_events", toEvent(f), f.id, "Événement enregistré"); setBusy(false); if (r.error) setErr(r.error); else onClose(r); };
  return (
    <Modal title="Événement à déclarer à l'inspection du travail" onClose={() => onClose()}>
      <WarnBox tone="info">Déclaration à l'inspecteur du travail du ressort, préalablement à l'événement ou au plus tard 8 jours après, par tout moyen laissant une preuve (décret 2024-902, art. 4 et 5). Conservez l'accusé de réception dans les documents.</WarnBox>
      <Field label="Événement"><select className={inputCls} style={inputStyle} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Date de l'événement"><input type="date" className={inputCls} style={inputStyle} value={f.dateEvenement} onChange={(e) => setF({ ...f, dateEvenement: e.target.value })} /></Field>
        <Field label="Déclaré le"><input type="date" className={inputCls} style={inputStyle} value={f.declareLe} onChange={(e) => setF({ ...f, declareLe: e.target.value })} /></Field>
      </div>
      <Field label="Description"><textarea rows={2} className={inputCls} style={inputStyle} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={go} busy={busy} />
    </Modal>
  );
}
function DeclarationAnnuellePrint({ hr, annee, onBack }) {
  const d = declarationAnnuelle(hr, annee);
  const Rep = ({ titre, m }) => <div className="mt-3"><p className="font-semibold text-xs mb-1">{titre}</p><table className="text-[11px] border-collapse"><tbody>
    {Object.entries(m).map(([k, v]) => <tr key={k}><td className="px-2 py-0.5 border" style={{ borderColor: "#C9D1DA" }}>{k}</td><td className="px-2 py-0.5 border text-right" style={{ borderColor: "#C9D1DA" }}>{v}</td></tr>)}
    {!Object.keys(m).length && <tr><td className="px-2 py-0.5">—</td></tr>}</tbody></table></div>;
  return (
    <div>
      <div className="flex items-center justify-between mb-3 print:hidden"><button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour</button>
        <button onClick={() => printSheet("portrait")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF</button></div>
      <p className="text-xs mb-3 print:hidden" style={{ color: "var(--muted)" }}>À reporter sur l'imprimé réglementaire et à déposer en deux exemplaires avant le 31 janvier : inspection du travail du ressort et organisme public de placement (décret 2024-902, art. 6 et 7).</p>
      <PrintPage className="bg-white rounded-xl border p-7 max-w-3xl mx-auto" style={{ borderColor: "var(--line)" }}>
        <PrintHead title="Déclaration annuelle de la main-d'œuvre" subtitle={`Année ${annee}`} />
        <table className="text-[12px] mt-4 border-collapse"><tbody>
          {[["Effectif au 1er janvier", d.effectifDebut], ["Effectif au 31 décembre", d.effectifFin], ["Entrées dans l'année", d.entrees.length], ["Sorties dans l'année", d.sorties.length]].map(([k, v]) =>
            <tr key={k}><td className="px-2 py-1 border" style={{ borderColor: "#C9D1DA" }}>{k}</td><td className="px-2 py-1 border text-right font-semibold" style={{ borderColor: "#C9D1DA" }}>{v}</td></tr>)}</tbody></table>
        <div className="grid grid-cols-2 gap-x-6">
          <Rep titre="Motifs de sortie" m={d.motifsSortie} /><Rep titre="Répartition par sexe (31 décembre)" m={d.parSexe} />
          <Rep titre="Par nationalité (31 décembre)" m={d.parNationalite} /><Rep titre="Par catégorie professionnelle (31 décembre)" m={d.parCategorie} />
          <Rep titre="Par nature de contrat (31 décembre)" m={d.parContrat} />
        </div>
        <p className="font-semibold text-xs mt-4 mb-1">Entrées</p>
        <p className="text-[11px]">{d.entrees.map((e) => `${nomComplet(e)} (${fmt(e.dateEmbauche)})`).join(" ; ") || "—"}</p>
        <p className="font-semibold text-xs mt-3 mb-1">Sorties</p>
        <p className="text-[11px]">{d.sorties.map((e) => `${nomComplet(e)} (${fmt(e.dateSortie)} — ${e.motifSortie || "motif non renseigné"})`).join(" ; ") || "—"}</p>
      </PrintPage>
    </div>
  );
}
function DeclarationsSection({ hr, on, today }) {
  const [annee, setAnnee] = useState(Number(today.slice(0, 4)) - (Number(today.slice(5, 7)) <= 1 ? 1 : 0));
  return (
    <SectionCard title="Déclarations à l'inspection du travail" icon={Landmark}>
      <div className="flex flex-wrap items-end gap-2 mb-3">
        <Field label="Déclaration annuelle de la main-d'œuvre — année"><input type="number" className={inputCls} style={inputStyle} value={annee} onChange={(e) => setAnnee(Number(e.target.value))} /></Field>
        <button onClick={() => on.declarationAnnuelle(annee)} className="kb-btn kb-btn-primary mb-3"><Printer size={15} /> Préparer</button>
      </div>
      <div className="flex items-center justify-between mb-2"><p className="text-sm font-semibold">Événements à déclarer dans les 8 jours</p>
        <button onClick={() => on.event({})} className="kb-btn kb-btn-ghost text-xs"><Plus size={13} /> Déclarer un changement</button></div>
      {hr.events.length === 0 ? <p className="text-xs" style={{ color: "var(--muted)" }}>Aucun événement (déménagement, changement de statut, cessation ou reprise d'activité…).</p> :
        hr.events.map((ev) => { const lim = plusJours(ev.dateEvenement, Number(pval(hr.params, "DECLARATION_CHANGEMENT", ev.dateEvenement)?.delai_jours) || 8);
          return <button key={ev.id} onClick={() => on.event(ev)} className="w-full text-left text-sm py-1.5 flex flex-wrap gap-2 border-b" style={{ borderColor: "var(--line)" }}>
            <span className="w-24">{fmt(ev.dateEvenement)}</span><span className="flex-1">{EVENT_TYPES[ev.type]}</span>
            {ev.declareLe ? <Chip color="#4F9E2A">déclaré le {fmt(ev.declareLe)}</Chip> : <Chip color={today > lim ? "#D81F26" : "#C58A1B"}>à déclarer avant le {fmt(lim)}</Chip>}</button>; })}
    </SectionCard>
  );
}

function Indicateurs({ hr, today }) {
  const mois = Array.from({ length: 12 }, (_, i) => plusMois(`${today.slice(0, 7)}-01`, i - 11));
  const effectif = mois.map((m) => { const [y, mo] = m.split("-").map(Number); const fin = finDuMois(y, mo);
    const p = hr.periods.find((x) => x.annee === y && x.mois === mo);
    const masse = p ? hr.payslips.filter((b) => b.periodId === p.id && b.statut === "valide").reduce((t, b) => t + b.brut, 0) : 0;
    return { mois: `${MOIS_NOMS[mo - 1].slice(0, 4)}. ${String(y).slice(2)}`, effectif: effectifA(hr.employees, hr.contracts, fin).length, masse }; });
  const an = today.slice(0, 4);
  const abs = Object.entries(ABSENCE_TYPES).map(([k, t]) => ({ nature: t.label, jours: hr.absences.filter((a) => a.type === k && a.statut === "valide" && a.dateDebut.startsWith(an)).reduce((s, a) => s + a.joursOuvrables, 0) })).filter((x) => x.jours);
  const actifs = effectifA(hr.employees, hr.contracts, today);
  const sorties = hr.employees.filter((e) => e.dateSortie && e.dateSortie.startsWith(an)).length;
  const turnover = actifs.length ? Math.round(sorties / actifs.length * 100) : 0;
  return (
    <SectionCard title="Indicateurs" icon={Layers}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Users} label="Femmes / hommes" value={`${actifs.filter((e) => e.sexe === "F").length} / ${actifs.filter((e) => e.sexe === "M").length}`} />
        <StatCard icon={CalendarDays} label={`Jours d'absence ${an}`} value={fmt2(abs.reduce((t, x) => t + x.jours, 0))} tint="#0D9488" />
        <StatCard icon={FileSignature} label={`Sorties ${an}`} value={sorties} sub={`Rotation : ${turnover} %`} tint="#C58A1B" />
        <StatCard icon={Briefcase} label={`Formations ${an}`} value={hr.trainings.filter((t) => t.dateDebut.startsWith(an)).length} tint="#7C3AED" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div><p className="text-xs font-semibold mb-1">Effectif salarié (12 mois)</p>
          <div style={{ width: "100%", height: 200 }}><ResponsiveContainer><BarChart data={effectif}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="mois" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={30} /><Tooltip /><Bar dataKey="effectif" name="Effectif" fill="#2E78A8" /></BarChart></ResponsiveContainer></div></div>
        <div><p className="text-xs font-semibold mb-1">Masse salariale brute validée (12 mois)</p>
          <div style={{ width: "100%", height: 200 }}><ResponsiveContainer><BarChart data={effectif}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="mois" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} width={60} tickFormatter={(v) => `${Math.round(v / 1000)} k`} /><Tooltip formatter={(v) => fcfa(v)} /><Bar dataKey="masse" name="Brut" fill="#4F9E2A" /></BarChart></ResponsiveContainer></div></div>
        <div className="lg:col-span-2"><p className="text-xs font-semibold mb-1">Absences {an} par nature (jours ouvrables)</p>
          {abs.length ? <div style={{ width: "100%", height: 180 }}><ResponsiveContainer><BarChart data={abs} layout="vertical" margin={{ left: 40 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="nature" tick={{ fontSize: 10 }} width={170} /><Tooltip /><Bar dataKey="jours" name="Jours" fill="#0D9488" /></BarChart></ResponsiveContainer></div>
            : <p className="text-xs" style={{ color: "var(--muted)" }}>Aucune absence validée cette année.</p>}</div>
      </div>
    </SectionCard>
  );
}

/* Choix d'un modèle pour un objet (absence, procédure, sortie, candidat) */
function ModelChooser({ titre, modeles, onPick, onClose }) {
  return (
    <Modal title={titre} onClose={onClose}>
      {modeles.length === 0 ? <EmptyState icon={FileText} title="Aucun modèle disponible" /> : <div className="space-y-1.5">{modeles.map((t) => (
        <button key={t.id || t.code} onClick={() => onPick(t)} className="w-full text-left rounded-lg border px-3 py-2.5 flex items-center gap-2 hover:bg-slate-50" style={{ borderColor: "var(--line)" }}>
          <FileText size={15} style={{ color: "var(--brass)" }} /><span className="flex-1 text-sm font-medium">{t.titre}</span><ChevronRight size={15} style={{ color: "var(--muted)" }} /></button>))}</div>}
    </Modal>
  );
}

function ElementModal({ initial, emp, actions, onClose }) {
  const [f, setF] = useState(() => ({ employeeId: emp.id, libelle: "", nature: "gain", montant: "", prorata: true, dateDebut: todayIso(), dateFin: "", actif: true, ...initial }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const go = async () => { if (!f.libelle.trim() || !(Number(f.montant) > 0)) return setErr("Libellé et montant obligatoires."); setBusy(true); const r = await actions.saveRow("hr_pay_elements", toElem(f), f.id, "Élément de paie enregistré"); setBusy(false); if (r.error) setErr(r.error); else onClose(r); };
  return (
    <Modal title={`Élément de paie fixe — ${nomComplet(emp)}`} onClose={() => onClose()}>
      <Field label="Libellé *"><input className={inputCls} style={inputStyle} value={f.libelle} onChange={(e) => set("libelle", e.target.value)} placeholder="Ex. : prime de responsabilité, indemnité de logement, remboursement de prêt" /></Field>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Nature"><select className={inputCls} style={inputStyle} value={f.nature} onChange={(e) => set("nature", e.target.value)}>
          <option value="gain">Gain soumis (cotisations et ITS)</option><option value="indemnite">Indemnité non soumise (remboursement de frais)</option><option value="retenue">Retenue sur le net</option></select></Field>
        <Field label="Montant mensuel *"><input type="number" min="0" className={inputCls} style={inputStyle} value={f.montant} onChange={(e) => set("montant", e.target.value)} /></Field>
        <Field label="À partir du"><input type="date" className={inputCls} style={inputStyle} value={f.dateDebut} onChange={(e) => set("dateDebut", e.target.value)} /></Field>
        <Field label="Jusqu'au (facultatif)"><input type="date" className={inputCls} style={inputStyle} value={f.dateFin} onChange={(e) => set("dateFin", e.target.value)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm mb-2"><input type="checkbox" checked={f.prorata} onChange={(e) => set("prorata", e.target.checked)} /> Réduit au prorata en cas de mois incomplet</label>
      <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={f.actif} onChange={(e) => set("actif", e.target.checked)} /> Actif</label>
      <ErrLine err={err} />
      <ModalFooter onClose={() => onClose()} onSubmit={go} busy={busy} />
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   10. MODULE
   ══════════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: "dashboard", label: "Tableau de bord", icon: Briefcase },
  { id: "salaries", label: "Salariés", icon: Users },
  { id: "conges", label: "Congés et absences", icon: CalendarDays },
  { id: "paie", label: "Paie", icon: Wallet },
  { id: "sorties", label: "Sorties", icon: DoorOpen },
  { id: "recrutement", label: "Recrutement", icon: UserPlus },
  { id: "discipline", label: "Discipline", icon: Gavel },
  { id: "sante", label: "Santé et formation", icon: HeartPulse },
  { id: "registre", label: "Registre et déclarations", icon: ClipboardList },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "params", label: "Paramètres légaux", icon: Scale },
  { id: "grille", label: "Grille catégorielle", icon: Layers },
  { id: "audit", label: "Journal d'audit", icon: History, admin: true },
  { id: "acces", label: "Accès au module", icon: ShieldCheck, proprietaire: true },
];
const ROLES_APP = { admin: "Administrateur", gerante: "Gérante", responsable_admin: "Responsable administratif", comptable: "Comptable", juriste: "Juriste", agent: "Agent" };

/* Onglet du propriétaire : qui a accès au module RH, et à quel niveau */
function AccesTab({ hr, members, me, actions, say }) {
  const [busy, setBusy] = useState("");
  const liste = members.filter((m) => m.id !== me.id && (m.active !== false || hr.acces.some((a) => a.userId === m.id)))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const changer = async (m, niveau) => {
    setBusy(m.id); const r = await actions.setAccess(m.id, niveau, hr.acces.find((a) => a.userId === m.id)); setBusy(""); say(r);
  };
  return (
    <div>
      <WarnBox tone="info">Seuls les comptes désignés ci-dessous accèdent au module, quel que soit leur rôle dans l'application. Le contrôle est fait par la base de données : un compte non désigné ne reçoit aucune donnée RH. Le membre désigné doit actualiser l'application pour voir apparaître le module.</WarnBox>
      <div className="grid sm:grid-cols-2 gap-3 mb-4 text-sm">
        <div className="bg-white rounded-xl border p-3" style={{ borderColor: "var(--line)" }}><p className="font-semibold mb-1">Accès complet</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Tout le module : dossiers, paie, sorties, documents, et aussi les paramètres légaux, la grille, les modèles de documents, les suppressions, l'annulation d'un bulletin validé et le journal d'audit.</p></div>
        <div className="bg-white rounded-xl border p-3" style={{ borderColor: "var(--line)" }}><p className="font-semibold mb-1">Gestion courante</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Dossiers, contrats, congés, préparation et validation de la paie, sorties, recrutement, discipline, santé et documents. Sans les actions réservées de l'accès complet.</p></div>
      </div>
      <SectionCard title="Membres de l'équipe" icon={ShieldCheck} pad={false}>
        <div className="px-4 py-3 flex flex-wrap items-center gap-2 text-sm border-b" style={{ borderColor: "var(--line)" }}>
          <span className="flex-1 font-medium">{me.name || "Vous"}</span><Chip color="#1F2937">Propriétaire du module — accès de droit</Chip></div>
        {liste.length === 0 ? <EmptyState icon={Users} title="Aucun autre membre" /> : <div className="divide-y" style={{ borderColor: "var(--line)" }}>{liste.map((m) => {
          const a = hr.acces.find((x) => x.userId === m.id);
          return (
            <div key={m.id} className="px-4 py-2.5 flex flex-wrap items-center gap-2 text-sm">
              <span className="flex-1 min-w-[10rem]">{m.name}<span className="text-xs ml-1.5" style={{ color: "var(--muted)" }}>{ROLES_APP[m.role] || m.role}{m.active === false ? " · compte désactivé : accès suspendu" : ""}</span></span>
              <select className="px-2 py-1.5 rounded-lg border text-sm" style={{ ...inputStyle, color: a ? "var(--ink)" : "var(--muted)" }} value={a?.niveau || ""} disabled={busy === m.id}
                onChange={(e) => changer(m, e.target.value)} aria-label={`Accès de ${m.name}`}>
                <option value="">Aucun accès</option><option value="gestion">Gestion courante</option><option value="complet">Accès complet</option></select>
            </div>); })}</div>}
      </SectionCard>
    </div>
  );
}
const TITRE_CHOIX = { absence: "Document de l'absence", discipline: "Courriers de la procédure", rupture: "Documents de sortie", candidat: "Courriers au candidat" };

export default function RH({ store, me, acces }) {
  /* Tous les hooks AVANT tout retour anticipé */
  const hr = useHR(acces);
  const autorise = aAcces(acces);
  const admin = accesComplet(acces);
  const proprietaire = acces === "proprietaire";
  const [tab, setTab] = useState("dashboard");
  const [empId, setEmpId] = useState(null);
  const [modal, setModal] = useState(null);
  const [print, setPrint] = useState(null);
  const [toast, setToast] = useState(null);
  const [editor, setEditor] = useState(null);       // document en cours d'édition
  const [fiche, setFiche] = useState(null);         // fiche individuelle à imprimer
  const [focusPaie, setFocusPaie] = useState(null); // { periodId, slipId, n } : ouverture directe d'une paie ou d'un bulletin
  const today = todayIso();
  const { employees, details, contracts, documents, params, scale } = hr;
  const alerts = useMemo(() => {
    const ordre = { rouge: 0, orange: 1, info: 2 };
    return [...computeAlerts({ employees, details, contracts, documents, params, scale }, today), ...alertesSuivi(hr, today)].sort((a, b) => ordre[a.niveau] - ordre[b.niveau]);
  }, [hr, employees, details, contracts, documents, params, scale, today]);
  const closeToast = useCallback(() => setToast(null), []);

  if (acces === "a_installer") return <WarnBox tone="rouge">Le contrôle d'accès du module RH n'est pas installé : exécutez migration-v33-1.sql dans le SQL Editor de Supabase, puis actualisez l'application.</WarnBox>;
  if (!autorise) return <EmptyState icon={ShieldAlert} title="Accès réservé" sub="Le module Ressources humaines est réservé aux membres désignés par son propriétaire." />;

  const members = store?.members || [];
  const departments = store?.departments || [];
  const a = hr.actions;
  const say = (r) => { if (r?.error) setToast({ kind: "error", text: r.error }); else if (r?.message) setToast({ kind: "ok", text: r.message }); };
  const fermer = (r) => { setModal(null); say(r); };
  const ouvrirDoc = async (d) => {
    const w = window.open("about:blank", "_blank");          // ouvert tout de suite : sinon bloqué par le navigateur
    const r = await a.openDocument(d, w); say(r);
  };
  const aller = (t) => { setTab(t); setEmpId(null); setPrint(null); };
  /* Document lié à un objet : choix du modèle (ouverture directe s'il n'y en a qu'un) */
  const editerObjet = (type, row, emp, contract) => {
    const modeles = modelesPourObjet(hr.templates, type, row);
    const ouvrir = (tpl) => { setModal(null); setEditor({ tpl, emp: emp || null, contract: contract || null, amendment: null, objet: { type, row } }); };
    if (modeles.length === 1) ouvrir(modeles[0]);
    else setModal({ kind: "choose-model", titre: TITRE_CHOIX[type], modeles, onPick: ouvrir });
  };
  const empDe = (id) => employees.find((e) => e.id === id) || null;
  const on = {
    back: () => setEmpId(null),
    edit: (emp, det) => setModal({ kind: "emp", initial: emp, det }),
    remove: (emp) => setModal({ kind: "confirm", title: "Supprimer le dossier", label: "Supprimer définitivement",
      body: <>Le dossier de <b>{nomComplet(emp)}</b> ({emp.matricule}), ses contrats, avenants, absences et documents seront supprimés définitivement. À réserver à un dossier créé par erreur : pour un départ, passez par l'onglet « Sorties ».</>,
      run: async () => { const r = await a.deleteEmployee(emp.id); if (!r.error) { setEmpId(null); say(r); } return r; } }),
    contract: (c) => setModal({ kind: "ctr", initial: c }),
    amend: (c) => setModal({ kind: "amend", contract: c }),
    addDoc: (init) => setModal({ kind: "doc", initial: init }),
    editDoc: (d) => setModal({ kind: "doc", initial: d }),
    openDoc: ouvrirDoc,
    removeDoc: (d) => setModal({ kind: "confirm", title: "Supprimer le document", body: <>Supprimer « {d.libelle || d.fileName} » et son fichier ?</>,
      run: async () => { const r = await a.deleteDocument(d); if (!r.error) say(r); return r; } }),
    print: (k) => setPrint(k),
    visa: (v) => setModal({ kind: "visa", initial: v }),
    removeVisa: (v) => setModal({ kind: "confirm", title: "Supprimer l'inscription", body: <>Supprimer l'inscription du {fmt(v.dateVisite)} ?</>,
      run: async () => { const r = await a.deleteVisa(v.id); if (!r.error) say(r); return r; } }),
    param: (mode, p) => setModal({ kind: "param", mode, param: p }),
    validate: async (p) => say(await a.validateParam(p, me.id)),
    scale: (r) => setModal({ kind: "scale", initial: r }),
    newDoc: (emp) => setModal({ kind: "choose-doc", emp }),
    fiche: (emp) => setFiche(emp.id),
    docAvenant: (amend, ctr) => {
      const tpl = hr.templates.find((t) => t.code === "AVENANT" && t.actif);
      if (!tpl) { setToast({ kind: "error", text: "Le modèle d'avenant est désactivé ou absent (Documents › Modèles)." }); return; }
      setEditor({ tpl, emp: employees.find((e) => e.id === amend.employeeId), contract: ctr, amendment: amend });
    },
    openGenerated: (d) => {
      const listes = { absence: hr.absences, discipline: hr.disciplinary, rupture: hr.terminations, candidat: hr.candidates };
      const row = d.objetType ? (listes[d.objetType] || []).find((x) => x.id === d.objetId) : null;
      setEditor({ doc: d, tpl: hr.templates.find((t) => t.code === d.modeleCode) || null, emp: employees.find((e) => e.id === d.employeeId) || null,
        contract: contracts.find((c) => c.id === d.contractId) || null, amendment: hr.amendments.find((x) => x.id === d.amendmentId) || null,
        objet: row ? { type: d.objetType, row } : null });
    },
    sign: (d) => setModal({ kind: "sign", doc: d }),
    removeScale: (r) => setModal({ kind: "confirm", title: "Supprimer la ligne", body: <>Supprimer la catégorie {r.categorie}{r.echelon ? ` / ${r.echelon}` : ""} de la grille ?</>,
      run: async () => { const r2 = await a.deleteScale(r.id); if (!r2.error) say(r2); return r2; } }),
    /* Lots 2 à 6 */
    removeRow: (table, id, libelle, apres, filePath) => setModal({ kind: "confirm", title: "Supprimer", body: <>Supprimer {libelle} ? Cette suppression est tracée au journal d'audit.</>,
      run: async () => { const r = await a.deleteRow(table, id, "Supprimé"); if (!r.error) { if (filePath) await a.removeFile(filePath); say(r); if (apres) apres(); } return r; } }),
    absence: (init) => setModal({ kind: "absence", initial: init || {} }),
    decideAbsence: (abs, statut) => {
      if (statut === "valide") {
        const emp = empDe(abs.employeeId);
        const solde = soldeConges({ emp, det: details.find((d) => d.employeeId === abs.employeeId), contracts, absences: hr.absences, adjustments: hr.adjustments, params, today: abs.dateDebut });
        const msgs = controleAbsence({ absence: { ...abs, statut: "valide" }, emp, absences: hr.absences, params, holidays: hr.holidays, solde, today });
        const bloq = msgs.filter((m) => m.niveau === "bloquant");
        if (bloq.length) { setToast({ kind: "error", text: `Validation impossible : ${bloq.map((m) => m.texte).join(" ")}` }); return; }
        const autres = msgs.filter((m) => m.niveau === "orange");
        const go = async () => say(await a.saveRow("hr_absences", { statut: "valide", decide_par: me.id, decide_le: new Date().toISOString() }, abs.id, "Absence validée"));
        if (!autres.length) { go(); return; }
        setModal({ kind: "confirm", title: "Valider malgré les remarques ?", label: "Valider", body: <ul className="list-disc ml-5 space-y-1">{autres.map((m, i) => <li key={i}>{m.texte}</li>)}</ul>,
          run: async () => { const r = await a.saveRow("hr_absences", { statut: "valide", decide_par: me.id, decide_le: new Date().toISOString() }, abs.id, "Absence validée"); if (!r.error) say(r); return r; } });
        return;
      }
      const lib = statut === "refuse" ? "Refuser" : "Annuler";
      setModal({ kind: "confirm", title: `${lib} l'absence`, label: lib, body: <>{lib} l'absence de {nomComplet(empDe(abs.employeeId))} du {fmt(abs.dateDebut)} au {fmt(abs.dateFin)} ?</>,
        run: async () => { const r = await a.saveRow("hr_absences", { statut, decide_par: me.id, decide_le: new Date().toISOString() }, abs.id, statut === "refuse" ? "Demande refusée" : "Absence annulée"); if (!r.error) say(r); return r; } });
    },
    docAbsence: (abs) => editerObjet("absence", abs, empDe(abs.employeeId), contratA(contracts, abs.employeeId, abs.dateDebut)),
    adjust: (emp) => setModal({ kind: "adjust", emp }),
    holiday: (h) => setModal({ kind: "holiday", initial: h }),
    element: (x, emp) => setModal({ kind: "element", initial: x, emp }),
    gotoSlip: (b) => { setFocusPaie({ periodId: b.periodId, slipId: b.id, n: Date.now() }); aller("paie"); },
    gotoPaie: (y, m, periodId) => { setFocusPaie({ periodId: periodId || "", slipId: "", n: Date.now(), annee: y, mois: m }); aller("paie"); },
    docRupture: (t) => editerObjet("rupture", t, empDe(t.employeeId), contracts.find((c) => c.id === t.contractId) || contratA(contracts, t.employeeId, t.dateSortie)),
    openEmployee: (id) => { aller("salaries"); setEmpId(id); },
    docCandidat: (c) => editerObjet("candidat", c, null, null),
    hire: (c) => setModal({ kind: "emp", initial: { nom: c.nom, prenoms: c.prenoms, sexe: c.sexe, poste: hr.openings.find((o) => o.id === c.openingId)?.intitule || "", dateEmbauche: today },
      det: { telephone: c.telephone, email: c.email }, candidat: c }),
    discipline: (d) => setModal({ kind: "discipline", initial: d }),
    docDiscipline: (d) => { setModal(null); editerObjet("discipline", d, empDe(d.employeeId), contratA(contracts, d.employeeId, d.dateFaits)); },
    visit: (v) => setModal({ kind: "visit", initial: v }),
    accident: (x) => setModal({ kind: "accident", initial: x }),
    training: (t) => setModal({ kind: "training", initial: t }),
    event: (ev) => setModal({ kind: "event", initial: ev }),
    declarationAnnuelle: (annee) => setPrint({ kind: "declaration", annee }),
  };
  const ouvrirAlerte = (al) => {
    if (al.tab) { aller(al.tab); return; }
    if (al.employeeId) { aller("salaries"); setEmpId(al.employeeId); return; }
    aller(al.code === "params_a_valider" ? "params" : al.code === "declaration_annuelle" ? "registre" : al.code === "cdd_proportion" ? "salaries" : "documents");
  };
  const emp = empId ? employees.find((e) => e.id === empId) : null;
  const modalEmp = modal?.kind === "ctr" || modal?.kind === "amend" ? emp : null;
  /* Fin de la création du dossier depuis un candidat retenu */
  const apresEmbauche = async (r, cand) => {
    if (r?.id && cand) {
      const r2 = await a.saveRow("hr_candidates", { statut: "embauche", employee_id: r.id }, cand.id, "");
      if (r2.error) setToast({ kind: "error", text: `Dossier créé, mais la candidature n'a pas pu être mise à jour : ${r2.error}` });
    }
  };

  if (print?.kind === "declaration") return <DeclarationAnnuellePrint hr={hr} annee={print.annee} onBack={() => setPrint(null)} />;
  if (print) return <RegistrePrint kind={print} hr={hr} onBack={() => setPrint(null)} />;
  if (editor) return (
    <>
      <DocumentEditor key={editor.doc?.id || `${editor.tpl?.code}-${editor.objet?.row?.id || editor.amendment?.id || editor.contract?.id || ""}`} {...editor} hr={hr} actions={a} today={today}
        onBack={() => setEditor(null)} say={say} />
      <RhToast toast={toast} onDone={closeToast} />
    </>
  );
  const empFiche = fiche ? employees.find((e) => e.id === fiche) : null;
  if (empFiche) return <FicheSalarie emp={empFiche} hr={hr} members={members} departments={departments} today={today} onBack={() => setFiche(null)} />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 print:hidden">
        <div><h1 className="text-xl font-bold flex items-center gap-2"><Briefcase size={20} style={{ color: "var(--brass)" }} /> Ressources humaines</h1>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Données confidentielles — visibles uniquement par l'administrateur et la gérante.</p></div>
        <button onClick={a.reload} className="kb-btn kb-btn-ghost text-sm">Actualiser</button>
      </div>
      <div className="flex gap-1 overflow-x-auto mb-4 pb-1 print:hidden" role="tablist">
        {TABS.filter((t) => (!t.admin || admin) && (!t.proprietaire || proprietaire)).map((t) => { const Icon = t.icon; const sel = tab === t.id;
          const n = t.id === "dashboard" ? 0 : alerts.filter((x) => x.tab === t.id && x.niveau !== "info").length;
          return <button key={t.id} role="tab" aria-selected={sel} onClick={() => { setTab(t.id); if (t.id !== "salaries") setEmpId(null); if (t.id === "paie") setFocusPaie(null); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap" style={{ background: sel ? "var(--brass)" : "#fff", color: sel ? "#fff" : "var(--ink)", border: "1px solid var(--line)" }}>
            <Icon size={14} /> {t.label}{t.id === "dashboard" && alerts.some((x) => x.niveau === "rouge") && <span className="w-2 h-2 rounded-full" style={{ background: sel ? "#fff" : "#D81F26" }} />}
            {n > 0 && <span className="text-[10px] px-1.5 rounded-full" style={{ background: sel ? "#fff" : "#FDF2F2", color: "#B5171D" }}>{n}</span>}</button>; })}
      </div>

      {hr.loading ? <p className="text-sm py-10 text-center" style={{ color: "var(--muted)" }}>Chargement du module RH…</p>
        : hr.error ? <div><WarnBox tone="rouge">{hr.error}</WarnBox><button onClick={a.reload} className="kb-btn kb-btn-ghost text-sm">Réessayer</button></div>
        : <>
          {tab === "dashboard" && <Dashboard hr={hr} alerts={alerts} today={today} onAlert={ouvrirAlerte} />}
          {tab === "salaries" && (emp
            ? <EmployeeDetail emp={emp} hr={hr} members={members} departments={departments} admin={admin} alerts={alerts} today={today} on={on} />
            : <EmployeeList hr={hr} members={members} alerts={alerts} onOpen={setEmpId} onNew={(init) => setModal({ kind: "emp", initial: init, det: null })} />)}
          {tab === "conges" && <CongesTab hr={hr} today={today} on={on} admin={admin} />}
          {tab === "paie" && <PaieTab key={focusPaie?.n || "paie"} hr={hr} actions={a} admin={admin} today={today} say={say} focus={focusPaie} />}
          {tab === "sorties" && <SortiesTab hr={hr} actions={a} admin={admin} on={on} say={say} />}
          {tab === "recrutement" && <RecrutementTab hr={hr} actions={a} on={on} say={say} />}
          {tab === "discipline" && <DisciplineTab hr={hr} today={today} on={on} />}
          {tab === "sante" && <SanteTab hr={hr} on={on} />}
          {tab === "registre" && <RegistreTab hr={hr} admin={admin} on={on} today={today} />}
          {tab === "documents" && <DocumentsTab hr={hr} admin={admin} actions={a} today={today} on={on} say={say} />}
          {tab === "params" && <ParamsTab hr={hr} admin={admin} today={today} on={on} />}
          {tab === "grille" && <GrilleTab hr={hr} admin={admin} on={on} />}
          {tab === "audit" && admin && <AuditTab hr={hr} members={members} />}
          {tab === "acces" && proprietaire && <AccesTab hr={hr} members={members} me={me} actions={a} say={say} />}
        </>}

      {modal?.kind === "emp" && <EmployeeModal initial={modal.initial} initialDet={modal.det} employees={employees} members={members} departments={departments}
        onSave={a.saveEmployee} onClose={async (r) => { const nouveau = !modal.initial?.id; const cand = modal.candidat; if (r?.id && cand) await apresEmbauche(r, cand); fermer(r); if (r?.id && nouveau) { setTab("salaries"); setEmpId(r.id); } }} />}
      {modal?.kind === "ctr" && modalEmp && <ContractModal initial={modal.initial} emp={modalEmp} params={params} scale={scale} autres={contracts.filter((c) => c.employeeId === modalEmp.id)} onSave={a.saveContract} onClose={fermer} />}
      {modal?.kind === "amend" && modalEmp && <AmendmentModal contract={modal.contract} documents={documents.filter((d) => d.employeeId === modalEmp.id)} onApply={a.applyAmendment} onClose={fermer} />}
      {modal?.kind === "doc" && <DocModal initial={modal.initial} employees={employees} onUpload={a.uploadDocument} onUpdate={a.updateDocument} onClose={fermer} />}
      {modal?.kind === "param" && <ParamModal mode={modal.mode} param={modal.param} onNewVersion={a.newParamVersion} onFix={a.fixParam} onClose={fermer} />}
      {modal?.kind === "scale" && <ScaleModal initial={modal.initial} onSave={a.saveScale} onClose={fermer} />}
      {modal?.kind === "visa" && <VisaModal initial={modal.initial} onSave={a.saveVisa} onClose={fermer} />}
      {modal?.kind === "choose-doc" && <DocChooserModal emp={modal.emp} contracts={contracts} templates={hr.templates} params={params} today={today}
        onPick={(tpl, contract) => { setModal(null); setEditor({ tpl, emp: modal.emp, contract, amendment: null }); }} onClose={() => setModal(null)} />}
      {modal?.kind === "choose-model" && <ModelChooser titre={modal.titre} modeles={modal.modeles} onPick={modal.onPick} onClose={() => setModal(null)} />}
      {modal?.kind === "sign" && <SignModal doc={modal.doc} onAttach={a.attachSigned} onClose={fermer} />}
      {modal?.kind === "absence" && <AbsenceModal initial={modal.initial} hr={hr} actions={a} me={me} today={today} onClose={fermer} />}
      {modal?.kind === "adjust" && <AdjustModal emp={modal.emp} actions={a} today={today} onClose={fermer} />}
      {modal?.kind === "holiday" && <HolidayModal initial={modal.initial} actions={a} onClose={fermer} />}
      {modal?.kind === "element" && <ElementModal initial={modal.initial} emp={modal.emp} actions={a} onClose={fermer} />}
      {modal?.kind === "discipline" && <DisciplineModal initial={modal.initial} hr={hr} actions={a} today={today} on={on} onClose={fermer} />}
      {modal?.kind === "visit" && <VisitModal initial={modal.initial} hr={hr} actions={a} onClose={fermer} />}
      {modal?.kind === "accident" && <AccidentModal initial={modal.initial} hr={hr} actions={a} on={on} onClose={fermer} />}
      {modal?.kind === "training" && <TrainingModal initial={modal.initial} hr={hr} actions={a} onClose={fermer} />}
      {modal?.kind === "event" && <EventModal initial={modal.initial} actions={a} onClose={fermer} />}
      {modal?.kind === "confirm" && <ConfirmModal title={modal.title} confirmLabel={modal.label} onConfirm={modal.run} onClose={() => setModal(null)}>{modal.body}</ConfirmModal>}
      <RhToast toast={toast} onDone={closeToast} />
    </div>
  );
}
