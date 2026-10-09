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
  AlertTriangle, ArrowLeft, Briefcase, Building2, Check, CheckCircle2, ChevronDown, ChevronRight, ClipboardList,
  Eye, FileSignature, FileText, FolderOpen, History, Landmark, Layers, Pencil, Plus, Printer, Scale, Search,
  ShieldAlert, ShieldCheck, Trash2, Upload, UserPlus, UserRound, Users, X,
} from "lucide-react";
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
  hr_contracts: "Contrat", hr_contract_amendments: "Avenant", hr_documents: "Document", hr_registry_visas: "Registre — fascicule 3" };

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
  contactUrgence: r.contact_urgence || {}, banque: r.banque || "", numeroCompte: r.numero_compte || "", expatrie: !!r.expatrie, medailleTravail: !!r.medaille_travail, ippPlus40: !!r.ipp_plus_40 });
export const toDet = (f, employeeId) => ({ employee_id: employeeId, date_naissance: f.dateNaissance || null, lieu_naissance: f.lieuNaissance || "", nationalite: f.nationalite || "",
  piece_type: f.pieceType || "", piece_numero: f.pieceNumero || "", situation_famille: f.situationFamille || "celibataire", nb_enfants_charge: Math.max(0, Number(f.nbEnfantsCharge) || 0),
  enfants: (f.enfants || []).filter((x) => (x.prenom || "").trim() || x.date_naissance), cnps_numero: f.cnpsNumero || "", cmu_numero: f.cmuNumero || "", adresse: f.adresse || "",
  telephone: f.telephone || "", email: f.email || "", contact_urgence: f.contactUrgence || {}, banque: f.banque || "", numero_compte: f.numeroCompte || "",
  expatrie: !!f.expatrie, medaille_travail: !!f.medailleTravail, ipp_plus_40: !!f.ippPlus40 });

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
  contractId: r.contract_id || "", amendmentId: r.amendment_id || "", createdAt: Date.parse(r.created_at) || 0, createdBy: r.created_by });
/* La référence (RH-AAAA-NNNN) est attribuée par la base : elle est lue, jamais écrite */
export const toHrDoc = (f) => ({ employee_id: f.employeeId || null, categorie: f.categorie || "autre", libelle: f.libelle || "", file_path: f.filePath || "", file_name: f.fileName || "",
  file_type: f.fileType || "", file_size: Number(f.fileSize) || 0, date_document: f.dateDocument || null, date_peremption: f.datePeremption || null,
  confidentiel: f.confidentiel !== false, notes: f.notes || "", genere: !!f.genere, modele_code: f.modeleCode || "", contenu: f.contenu || "",
  signe: !!f.signe, contract_id: f.contractId || null, amendment_id: f.amendmentId || null });

export const mTpl = (r) => ({ id: r.id, code: r.code, titre: r.titre || r.code, categorie: r.categorie || "courrier", ordre: Number(r.ordre) || 0, confidentiel: !!r.confidentiel,
  applicable: r.applicable || { besoin: "aucun" }, champs: r.champs || [], corps: r.corps || "", corpsOrigine: r.corps_origine || "", actif: r.actif !== false, updatedAt: r.updated_at });
export const toTpl = (f) => ({ titre: (f.titre || "").trim(), corps: f.corps || "", actif: f.actif !== false });
const REGLAGES_VIDES = { signataireNom: "", signataireQualite: "", signataireFeminin: false, ville: "Abidjan", adressePostale: "", cnpsEmployeur: "" };
export const mSettings = (r) => (r ? { signataireNom: r.signataire_nom || "", signataireQualite: r.signataire_qualite || "", signataireFeminin: !!r.signataire_feminin,
  ville: r.ville || "", adressePostale: r.adresse_postale || "", cnpsEmployeur: r.cnps_employeur || "" } : { ...REGLAGES_VIDES });
export const toSettings = (f) => ({ signataire_nom: (f.signataireNom || "").trim(), signataire_qualite: (f.signataireQualite || "").trim(), signataire_feminin: !!f.signataireFeminin,
  ville: (f.ville || "").trim(), adresse_postale: (f.adressePostale || "").trim(), cnps_employeur: (f.cnpsEmployeur || "").trim() });

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

const mAudit = (r) => ({ id: r.id, at: r.at, acteur: r.acteur, action: r.action, table: r.table_name, recordId: r.record_id, avant: r.avant, apres: r.apres });

/* ══════════════════════════════════════════════════════════════════════
   6. DONNÉES ET ACTIONS
   ══════════════════════════════════════════════════════════════════════ */
const FILE_MAX = 10 * 1024 * 1024;
const FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export const isRH = (role) => role === "admin" || role === "gerante";

export function useHR(me) {
  const admin = me?.role === "admin";
  const autorise = isRH(me?.role);
  const [st, setSt] = useState({ loading: true, error: "", employees: [], details: [], contracts: [], amendments: [], documents: [], params: [], scale: [], visas: [], audit: [],
    templates: [], settings: { ...REGLAGES_VIDES } });
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
    ]);
    const err = res.find((r) => r.error)?.error;
    setSt({ loading: false, error: err ? (/relation .* does not exist|schema cache/.test(err.message) ? "Le module RH n'est pas entièrement installé dans la base : exécutez dans le SQL Editor de Supabase migration-v32.sql, puis migration-v32-1.sql et migration-v32-2.sql." : err.message) : "",
      employees: (res[0].data || []).map(mEmp), details: (res[1].data || []).map(mDet), contracts: (res[2].data || []).map(mCtr),
      amendments: (res[3].data || []).map(mAmend), documents: (res[4].data || []).map(mHrDoc), params: (res[5].data || []).map(mParam),
      scale: (res[6].data || []).map(mScale), visas: (res[7].data || []).map(mVisa), audit: (res[8].data || []).map(mAudit),
      templates: (res[9].data || []).map(mTpl), settings: mSettings((res[10].data || [])[0]) });
  }, [admin, autorise]);
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
export function buildDocContext({ emp, det, contract, amendment, contracts = [], amendments = [], params, settings, agency, extra = {}, champs = [], today }) {
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
    return esc(v);
  });
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
    if (b === "avenant") return false;                                  // proposé depuis la ligne de l'avenant
    if (b === "contrat") return !!contract && (!t.applicable.types || t.applicable.types.includes(contract.type));
    if (b === "essai") return !!contract && essaiStatus(contract, params, today).applicable;
    return true;
  });
}
/* Avertissements propres à un document — affichés à l'écran, jamais imprimés */
export function avertissementsDocument(code, { contract, params, today, extra, emp }) {
  const w = [];
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
   8. FENÊTRES DE SAISIE
   ══════════════════════════════════════════════════════════════════════ */
const EMP_VIDE = { nom: "", prenoms: "", sexe: "", poste: "", departmentId: "", managerId: "", dateEmbauche: "", statut: "actif", dateSortie: "", motifSortie: "", userId: "" };
const DET_VIDE = { dateNaissance: "", lieuNaissance: "", nationalite: "", pieceType: "", pieceNumero: "", situationFamille: "celibataire", nbEnfantsCharge: 0, enfants: [],
  cnpsNumero: "", cmuNumero: "", adresse: "", telephone: "", email: "", contactUrgence: { nom: "", lien: "", telephone: "" }, banque: "", numeroCompte: "",
  expatrie: false, medailleTravail: false, ippPlus40: false };

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

      <SectionCard title={`Documents (${docs.length})`} icon={FolderOpen} action={<button onClick={() => on.addDoc({ employeeId: emp.id })} className="kb-btn kb-btn-primary text-xs"><Upload size={13} /> Ajouter</button>} pad={false}>
        <DocTable docs={docs} employees={hr.employees} today={today} on={on} />
      </SectionCard>
    </div>
  );
}

function DocTable({ docs, employees, today, on, showEmployee }) {
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
            {showEmployee && <td className="px-3 py-2">{e ? nomComplet(e) : "Entreprise"}</td>}
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
function RegistreTab({ hr, admin, on }) {
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
function DocumentEditor({ tpl, emp, contract, amendment, doc, hr, actions, today, onBack, say }) {
  const det = hr.details.find((d) => d.employeeId === emp?.id) || null;
  const champs = tpl?.champs || [];
  const contexte = useCallback((extra) => buildDocContext({ emp, det, contract, amendment, contracts: hr.contracts, amendments: hr.amendments,
    params: hr.params, settings: hr.settings, agency: AGENCY, extra, champs, today }), [emp, det, contract, amendment, hr.contracts, hr.amendments, hr.params, hr.settings, champs, today]);
  const [extra, setExtra] = useState(() => champsInitiaux(champs, contexte({}), today));
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
  const avert = tpl ? avertissementsDocument(tpl.code, { contract, params: hr.params, today, extra, emp }) : [];
  const setX = (k, v) => setExtra((x) => ({ ...x, [k]: v }));

  const enregistrer = async () => {
    setBusy(true); setErr("");
    for (const ch of champs) if (ch.obligatoire && (extra[ch.cle] === "" || extra[ch.cle] === null || extra[ch.cle] === undefined) && html === null) {
      setBusy(false); setErr(`Renseignez : ${ch.libelle}.`); return null;
    }
    const r = await actions.saveGeneratedDoc({ id: saved?.id, employeeId: emp?.id || "", categorie: tpl?.categorie || saved?.categorie || "courrier",
      libelle: tpl?.titre || saved?.libelle || "Document", modeleCode: tpl?.code || saved?.modeleCode || "", contenu: sanitizeHtml(texte),
      contractId: contract?.id || "", amendmentId: amendment?.id || "", dateDocument: saved?.dateDocument || today,
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
        <p className="font-semibold flex-1 min-w-[12rem]">{tpl?.titre || saved?.libelle} — {nomComplet(emp)}</p>
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
          <DocTable docs={hr.documents} employees={hr.employees} today={today} on={on} showEmployee />
        </SectionCard>
      )}
      {vue === "modeles" && <TemplatesPanel hr={hr} admin={admin} actions={actions} today={today} say={say} />}
      {vue === "reglages" && <SettingsPanel key={JSON.stringify(hr.settings)} hr={hr} admin={admin} actions={actions} say={say} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   10. MODULE
   ══════════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: "dashboard", label: "Tableau de bord", icon: Briefcase },
  { id: "salaries", label: "Salariés", icon: Users },
  { id: "registre", label: "Registre d'employeur", icon: ClipboardList },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "params", label: "Paramètres légaux", icon: Scale },
  { id: "grille", label: "Grille catégorielle", icon: Layers },
  { id: "audit", label: "Journal d'audit", icon: History, admin: true },
];

export default function RH({ store, me }) {
  /* Tous les hooks AVANT tout retour anticipé */
  const hr = useHR(me);
  const autorise = isRH(me?.role);
  const admin = me?.role === "admin";
  const [tab, setTab] = useState("dashboard");
  const [empId, setEmpId] = useState(null);
  const [modal, setModal] = useState(null);
  const [print, setPrint] = useState(null);
  const [toast, setToast] = useState(null);
  const [editor, setEditor] = useState(null);       // document en cours d'édition
  const [fiche, setFiche] = useState(null);         // fiche individuelle à imprimer
  const today = todayIso();
  const { employees, details, contracts, documents, params, scale } = hr;
  const alerts = useMemo(() => computeAlerts({ employees, details, contracts, documents, params, scale }, today), [employees, details, contracts, documents, params, scale, today]);
  const closeToast = useCallback(() => setToast(null), []);

  if (!autorise) return <EmptyState icon={ShieldAlert} title="Accès réservé" sub="Le module Ressources humaines est réservé à l'administrateur et à la gérante." />;

  const members = store?.members || [];
  const departments = store?.departments || [];
  const a = hr.actions;
  const say = (r) => { if (r?.error) setToast({ kind: "error", text: r.error }); else if (r?.message) setToast({ kind: "ok", text: r.message }); };
  const fermer = (r) => { setModal(null); say(r); };
  const ouvrirDoc = async (d) => {
    const w = window.open("about:blank", "_blank");          // ouvert tout de suite : sinon bloqué par le navigateur
    const r = await a.openDocument(d, w); say(r);
  };
  const on = {
    back: () => setEmpId(null),
    edit: (emp, det) => setModal({ kind: "emp", initial: emp, det }),
    remove: (emp) => setModal({ kind: "confirm", title: "Supprimer le dossier", label: "Supprimer définitivement",
      body: <>Le dossier de <b>{nomComplet(emp)}</b> ({emp.matricule}), ses contrats, avenants et documents seront supprimés définitivement. À réserver à un dossier créé par erreur : pour un départ, passez la situation à « Sorti ».</>,
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
    openGenerated: (d) => setEditor({ doc: d, tpl: hr.templates.find((t) => t.code === d.modeleCode) || null, emp: employees.find((e) => e.id === d.employeeId) || null,
      contract: contracts.find((c) => c.id === d.contractId) || null, amendment: hr.amendments.find((x) => x.id === d.amendmentId) || null }),
    sign: (d) => setModal({ kind: "sign", doc: d }),
    removeScale: (r) => setModal({ kind: "confirm", title: "Supprimer la ligne", body: <>Supprimer la catégorie {r.categorie}{r.echelon ? ` / ${r.echelon}` : ""} de la grille ?</>,
      run: async () => { const r2 = await a.deleteScale(r.id); if (!r2.error) say(r2); return r2; } }),
  };
  const ouvrirAlerte = (al) => {
    if (al.employeeId) { setTab("salaries"); setEmpId(al.employeeId); return; }
    setTab(al.code === "params_a_valider" ? "params" : al.code === "declaration_annuelle" ? "registre" : al.code === "cdd_proportion" ? "salaries" : "documents");
  };
  const emp = empId ? employees.find((e) => e.id === empId) : null;
  const modalEmp = modal?.kind === "ctr" || modal?.kind === "amend" ? emp : null;

  if (print) return <RegistrePrint kind={print} hr={hr} onBack={() => setPrint(null)} />;
  if (editor) return (
    <>
      <DocumentEditor key={editor.doc?.id || `${editor.tpl?.code}-${editor.amendment?.id || editor.contract?.id || ""}`} {...editor} hr={hr} actions={a} today={today}
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
        {TABS.filter((t) => !t.admin || admin).map((t) => { const Icon = t.icon; const sel = tab === t.id;
          return <button key={t.id} role="tab" aria-selected={sel} onClick={() => { setTab(t.id); if (t.id !== "salaries") setEmpId(null); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap" style={{ background: sel ? "var(--brass)" : "#fff", color: sel ? "#fff" : "var(--ink)", border: "1px solid var(--line)" }}>
            <Icon size={14} /> {t.label}{t.id === "dashboard" && alerts.some((x) => x.niveau === "rouge") && <span className="w-2 h-2 rounded-full" style={{ background: sel ? "#fff" : "#D81F26" }} />}</button>; })}
      </div>

      {hr.loading ? <p className="text-sm py-10 text-center" style={{ color: "var(--muted)" }}>Chargement du module RH…</p>
        : hr.error ? <div><WarnBox tone="rouge">{hr.error}</WarnBox><button onClick={a.reload} className="kb-btn kb-btn-ghost text-sm">Réessayer</button></div>
        : <>
          {tab === "dashboard" && <Dashboard hr={hr} alerts={alerts} today={today} onAlert={ouvrirAlerte} />}
          {tab === "salaries" && (emp
            ? <EmployeeDetail emp={emp} hr={hr} members={members} departments={departments} admin={admin} alerts={alerts} today={today} on={on} />
            : <EmployeeList hr={hr} members={members} alerts={alerts} onOpen={setEmpId} onNew={(init) => setModal({ kind: "emp", initial: init, det: null })} />)}
          {tab === "registre" && <RegistreTab hr={hr} admin={admin} on={on} />}
          {tab === "documents" && <DocumentsTab hr={hr} admin={admin} actions={a} today={today} on={on} say={say} />}
          {tab === "params" && <ParamsTab hr={hr} admin={admin} today={today} on={on} />}
          {tab === "grille" && <GrilleTab hr={hr} admin={admin} on={on} />}
          {tab === "audit" && admin && <AuditTab hr={hr} members={members} />}
        </>}

      {modal?.kind === "emp" && <EmployeeModal initial={modal.initial} initialDet={modal.det} employees={employees} members={members} departments={departments}
        onSave={a.saveEmployee} onClose={(r) => { const nouveau = !modal.initial?.id; fermer(r); if (r?.id && nouveau) { setTab("salaries"); setEmpId(r.id); } }} />}
      {modal?.kind === "ctr" && modalEmp && <ContractModal initial={modal.initial} emp={modalEmp} params={params} scale={scale} autres={contracts.filter((c) => c.employeeId === modalEmp.id)} onSave={a.saveContract} onClose={fermer} />}
      {modal?.kind === "amend" && modalEmp && <AmendmentModal contract={modal.contract} documents={documents.filter((d) => d.employeeId === modalEmp.id)} onApply={a.applyAmendment} onClose={fermer} />}
      {modal?.kind === "doc" && <DocModal initial={modal.initial} employees={employees} onUpload={a.uploadDocument} onUpdate={a.updateDocument} onClose={fermer} />}
      {modal?.kind === "param" && <ParamModal mode={modal.mode} param={modal.param} onNewVersion={a.newParamVersion} onFix={a.fixParam} onClose={fermer} />}
      {modal?.kind === "scale" && <ScaleModal initial={modal.initial} onSave={a.saveScale} onClose={fermer} />}
      {modal?.kind === "visa" && <VisaModal initial={modal.initial} onSave={a.saveVisa} onClose={fermer} />}
      {modal?.kind === "choose-doc" && <DocChooserModal emp={modal.emp} contracts={contracts} templates={hr.templates} params={params} today={today}
        onPick={(tpl, contract) => { setModal(null); setEditor({ tpl, emp: modal.emp, contract, amendment: null }); }} onClose={() => setModal(null)} />}
      {modal?.kind === "sign" && <SignModal doc={modal.doc} onAttach={a.attachSigned} onClose={fermer} />}
      {modal?.kind === "confirm" && <ConfirmModal title={modal.title} confirmLabel={modal.label} onConfirm={modal.run} onClose={() => setModal(null)}>{modal.body}</ConfirmModal>}
      <RhToast toast={toast} onDone={closeToast} />
    </div>
  );
}
