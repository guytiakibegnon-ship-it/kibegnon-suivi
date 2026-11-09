/* ============================================================================
 * MOTEUR DE PAIE — DROIT IVOIRIEN
 * ============================================================================
 * Module de calcul pur pour SIRH. Aucune dépendance externe, aucun import.
 * Conçu pour être collé tel quel dans un App.jsx monolithique ou importé
 * comme module ES.
 *
 * Périmètre : paramètres légaux versionnés, bulletin de paie mensuel,
 * heures supplémentaires, prime d'ancienneté, droits et allocation de congés,
 * solde de tout compte, régularisation annuelle ITS, contrôles de conformité.
 *
 * ---------------------------------------------------------------------------
 * SOURCES DES PARAMÈTRES
 * ---------------------------------------------------------------------------
 * - Loi n°2015-532 du 20 juillet 2015 portant Code du travail
 * - Convention collective interprofessionnelle du 19 juillet 1977 (CCI)
 * - Ordonnance n°2023-719 du 13 septembre 2023 (réforme ITS)
 * - Note de service DGI n°00026/MFB/DGI-DLCD du 03 janvier 2024
 * - Décret n°2022-986 du 21 décembre 2022 (SMIG)
 * - Décret n°2024-898 du 16 octobre 2024 (durée du travail)
 * - Décret n°2024-900 du 16 octobre 2024 (essai)
 * - Code de prévoyance sociale (CNPS) ; arrêté n°0050/MEPS/CAB 2023 (barème SMCC)
 *
 * Tout paramètre portant `aValider: true` n'a PAS été confirmé sur texte
 * officiel : il doit être vérifié avant mise en production. Voir
 * `listerParametresAValider()`.
 *
 * CONVENTIONS
 * - Tous les montants sont des entiers en francs CFA.
 * - Toutes les dates sont des chaînes ISO 'YYYY-MM-DD'.
 * - Les fonctions sont pures : aucun effet de bord, aucune I/O.
 *
 * ---------------------------------------------------------------------------
 * INTÉGRATION AU MODULE RH DE « SUIVI D'ÉQUIPE » (version 36)
 * ---------------------------------------------------------------------------
 * - Les taux appliqués sont ceux de l'onglet « Paramètres légaux » : RH.jsx
 *   construit le jeu de paramètres du moteur à partir de hr_legal_params
 *   (fonction parametresMoteur) et le passe dans `e.params`. PARAMS_PAIE
 *   ci-dessous reste la RÉFÉRENCE : toute valeur de l'application qui s'en
 *   écarte est signalée dans l'onglet Paie.
 * - Chaque bulletin est calculé deux fois : par le calcul de l'application et
 *   par ce moteur (contre-calcul). Tout écart sur le brut, les retenues ou le
 *   net bloque la validation de la paie.
 * - Corrections apportées au fichier d'origine :
 *     · années d'ancienneté comptées à la date anniversaire (années révolues) ;
 *     · prime d'ancienneté proratisée comme le salaire en cas d'absence ;
 *     · articles cités : délai de paiement art. 32.3, bulletin art. 32.5 ;
 *     · contrôle annuel de l'ITS recalculé mois par mois (le barème est
 *       mensuel : lisser l'année sur un brut moyen n'a pas de base légale) ;
 *     · gratification du solde de tout compte proratisée depuis l'embauche
 *       si elle a lieu dans l'année ; préavis selon l'ancienneté quand la
 *       table de l'application est fournie ;
 *     · reclassement simulé sur la grille de l'application quand elle est
 *       fournie.
 * ========================================================================= */

/* ----------------------------------------------------------------------------
 * 1. UTILITAIRES
 * ------------------------------------------------------------------------- */

/** Arrondi à l'unité la plus proche (règle de paie retenue). */
export const arr = (n) => Math.round(n || 0);

/** Date ISO -> objet Date UTC (évite les décalages de fuseau). */
const d = (iso) => new Date(`${iso}T00:00:00Z`);

/** Nombre de jours calendaires entre deux dates (bornes incluses). */
export function joursEntre(debut, fin) {
  return Math.round((d(fin) - d(debut)) / 86400000) + 1;
}

/** Ancienneté en mois décimaux (base 30 jours pour la fraction). */
export function ancienneteMois(dateEmbauche, dateRef) {
  const a = d(dateEmbauche), b = d(dateRef);
  let mois = (b.getUTCFullYear() - a.getUTCFullYear()) * 12
           + (b.getUTCMonth() - a.getUTCMonth());
  const jours = b.getUTCDate() - a.getUTCDate() + 1;
  return mois + jours / 30;
}

/** Ancienneté en années révolues : l'année est acquise à la date anniversaire
 *  de l'embauche (embauche le 01/12/2024 → 2 ans le 01/12/2026, pas avant). */
export function ancienneteAnnees(dateEmbauche, dateRef) {
  if (!dateEmbauche || !dateRef) return 0;
  const [y1, m1, j1] = dateEmbauche.split('-').map(Number);
  const [y2, m2, j2] = dateRef.split('-').map(Number);
  const mois = (y2 - y1) * 12 + (m2 - m1) - (j2 < j1 ? 1 : 0);
  return Math.max(0, Math.floor(mois / 12));
}

/** Mois de présence du `debut` au `fin` inclus : mois entiers, puis jours
 *  restants sur 30 (01/01 → 31/10 = 10 ; 01/01 → 15/10 = 9,5). */
export function moisDePresence(debut, fin) {
  const lendemain = new Date(d(fin).getTime() + 86400000);
  const a = d(debut);
  let mois = (lendemain.getUTCFullYear() - a.getUTCFullYear()) * 12 + (lendemain.getUTCMonth() - a.getUTCMonth());
  if (lendemain.getUTCDate() < a.getUTCDate()) mois -= 1;
  const ancre = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + mois, a.getUTCDate()));
  const jours = Math.round((lendemain - ancre) / 86400000);
  return Math.round((mois + jours / 30) * 100) / 100;
}

/** Formatage monétaire français : 203 989 */
export const fcfa = (n) =>
  String(arr(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** Dernier jour du mois d'une date ISO. */
export function finDeMois(iso) {
  const x = d(iso);
  const f = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0));
  return f.toISOString().slice(0, 10);
}

/* --- Montant en toutes lettres (obligatoire sur bulletin et solde) -------- */
const _U = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit',
  'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf'];
const _D = { 20: 'vingt', 30: 'trente', 40: 'quarante', 50: 'cinquante',
  60: 'soixante', 70: 'soixante', 80: 'quatre-vingt', 90: 'quatre-vingt' };

function _lettres(n) {
  if (n === 0) return 'zéro';
  if (n < 20) return _U[n];
  if (n < 100) {
    const dz = Math.floor(n / 10) * 10, u = n % 10;
    if (dz === 70 || dz === 90) {
      const u2 = u + 10;
      return _D[dz] + (u2 === 11 && dz === 70 ? '-et-' : '-') + _U[u2];
    }
    if (u === 0) return _D[dz] + (dz === 80 ? 's' : '');
    return _D[dz] + (u === 1 && dz !== 80 ? '-et-' : '-') + _U[u];
  }
  if (n < 1000) {
    const c = Math.floor(n / 100), r = n % 100;
    const t = c === 1 ? 'cent' : `${_U[c]} cent`;
    return r === 0 ? t + (c > 1 ? 's' : '') : `${t} ${_lettres(r)}`;
  }
  if (n < 1e6) {
    const m = Math.floor(n / 1000), r = n % 1000;
    let t;
    if (m === 1) t = 'mille';
    else {
      let mm = _lettres(m);
      if (mm.endsWith('cents') || mm.endsWith('vingts')) mm = mm.slice(0, -1);
      t = `${mm} mille`;
    }
    return r === 0 ? t : `${t} ${_lettres(r)}`;
  }
  const m = Math.floor(n / 1e6), r = n % 1e6;
  const t = m === 1 ? 'un million' : `${_lettres(m)} millions`;
  return r === 0 ? t : `${t} ${_lettres(r)}`;
}

/** « Deux cent mille francs CFA » */
export function montantEnLettres(n) {
  const v = arr(n);
  const s = _lettres(Math.abs(v));
  /* « deux millions DE francs », « un franc », « zéro franc » */
  const unite = Math.abs(v) <= 1 ? ' franc CFA' : /millions?$/.test(s) ? ' de francs CFA' : ' francs CFA';
  const t = (v < 0 ? 'moins ' : '') + s;
  return t.charAt(0).toUpperCase() + t.slice(1) + unite;
}

/* ----------------------------------------------------------------------------
 * 2. PARAMÈTRES LÉGAUX VERSIONNÉS
 * ----------------------------------------------------------------------------
 * Table versionnée par date d'effet. Pour changer un taux, on AJOUTE une
 * version, on n'écrase jamais la précédente : les bulletins antérieurs doivent
 * rester reproductibles à l'identique en cas de contrôle.
 * ------------------------------------------------------------------------- */

export const PARAMS_PAIE = [
  {
    version: '2024.01',
    dateEffet: '2024-01-01',
    libelle: 'Réforme ITS (ord. 2023-719) + SMIG 75 000 + décret 2024-898',

    /* --- Salaire minimum ------------------------------------------------- */
    smig: 75000,                          // Décret n°2022-986 du 21/12/2022
    horaireMensuelLegal: 173.33,          // 40 h/sem — décret 2024-898 art. 2
    joursOuvrablesMois: 26,               // diviseur congés (usage CCI)

    /* --- ITS : barème mensuel progressif sur le brut, sans abattement ----- */
    /*     Ordonnance n°2023-719 ; note DGI n°00026 du 03/01/2024            */
    baremeITS: [
      { plafond: 75000, taux: 0.00 },
      { plafond: 240000, taux: 0.16 },
      { plafond: 800000, taux: 0.21 },
      { plafond: 2400000, taux: 0.24 },
      { plafond: 8000000, taux: 0.28 },
      { plafond: Infinity, taux: 0.32 },
    ],
    /* Réduction d'impôt pour charges de famille, par nombre de parts */
    ricf: { 1: 0, 1.5: 5500, 2: 11000, 2.5: 16500, 3: 22000, 3.5: 27500,
            4: 33000, 4.5: 38500, 5: 44000 },
    partsMax: 5,

    /* --- CNPS ------------------------------------------------------------- */
    cnps: {
      retraiteSalarie: 0.063,
      retraiteEmployeur: 0.077,
      plafondRetraite: 3375000,           // 45 × SMIG
      prestationsFamiliales: 0.05,
      assuranceMaternite: 0.0075,
      accidentTravailDefaut: 0.02,        // fourchette légale 2 % à 5 %
      plafondPF_AT: 70000,                // À CONFRONTER à l'appel de cotisation
      plafondPF_AT_aValider: true,
    },

    /* --- CMU : forfait 1 000 F/personne couverte, réparti par moitié ------ */
    cmu: { forfaitTotal: 1000, partSalariale: 500, partPatronale: 500 },

    /* --- Fiscalité patronale sur salaires -------------------------------- */
    /*     Total = 2,80 % du brut pour le personnel local, 12 % expatrié     */
    /*     (note DGI n°00026 du 03/01/2024, art. 146 CGI)                    */
    fiscalPatronal: {
      contributionEmployeurLocal: 0.012,
      contributionEmployeurExpatrie: 0.104,
      taxeApprentissage: 0.004,
      taxeFPC: 0.012,
      totalAttenduLocal: 0.028,
      totalAttenduExpatrie: 0.12,
      /* Si l'entreprise verse 0,6 % mensuel et régularise 0,6 % au 31/12,
         mettre taxeFPC à 0.006 et activer ce drapeau. */
      fpcFractionnee: false,
    },

    /* --- Heures supplémentaires — décret n°2024-898 art. 25 -------------- */
    heuresSup: {
      majorations: {
        tranche41a46: 0.15,
        audelaDe46: 0.50,
        nuit: 0.75,                       // nuit, jours ouvrables
        jourDimancheFerie: 0.75,
        nuitDimancheFerie: 1.00,
      },
      maxParSemaine: 15,                  // art. 27
      maxParAn: 120,                      // art. 27
      maxProlongationJournaliere: 3,      // art. 27
      forfaitInterditNonCadres: true,     // art. 28
    },

    /* --- Congés payés ----------------------------------------------------- */
    conges: {
      joursParMois: 2.2,                  // jours ouvrables
      prorataFractionDeMois: true,        // true = au prorata ; false = mois entiers
      /* Jours supplémentaires d'ancienneté — À VALIDER sur l'annexe de branche */
      bonusAnciennete: [
        { apresAnnees: 5, jours: 1 }, { apresAnnees: 10, jours: 2 },
        { apresAnnees: 15, jours: 3 }, { apresAnnees: 20, jours: 5 },
        { apresAnnees: 25, jours: 7 },
      ],
      bonusAnciennete_aValider: true,
      /* Mères salariées : jours par enfant à charge de moins de 14 ans */
      joursParEnfantMere: 2,
      joursParEnfantMere_aValider: true,
      /* Médaille d'Honneur du Travail : 1 jour/an (CCI, art. 69) */
      bonusMedailleTravail: 1,
      /* Le congé doit être pris dans les 12 mois suivant l'ouverture du droit.
         Au-delà du cumul autorisé, les droits cessent de s'accumuler et une
         anomalie est levée : c'est une obligation de l'employeur, pas une
         faculté du salarié. */
      dureeMaxCumulMois: 24,
      dureeMaxCumulMois_aValider: true,
    },

    /* --- Prime d'ancienneté — CCI art. 55 (vérifié sur texte) ------------ */
    anciennete: {
      tauxApres2Ans: 0.02,
      tauxParAnneeSupplementaire: 0.01,
      anneeMax: 25,
      /* Assiette : salaire MINIMUM de la catégorie de classement, pas le réel */
      assiette: 'salaireCategoriel',
    },

    /* --- Préavis (mois) — par collège ------------------------------------ */
    preavis: {
      horaireJournalier: 0.25,            // 8 jours
      ouvrierEmploye: 1,
      agentMaitriseTechnicien: 2,
      ingenieurCadre: 3,
      cadreSuperieur: 6,
      aValider: true,
    },

    /* --- Indemnité de licenciement --------------------------------------- */
    /*     % du salaire global mensuel moyen des 12 derniers mois, par année */
    licenciement: {
      ancienneteMinimaleAnnees: 1,
      tranches: [
        { jusquAnnee: 5, taux: 0.30 },
        { jusquAnnee: 10, taux: 0.35 },
        { jusquAnnee: Infinity, taux: 0.40 },
      ],
      imposable: false,                   // indemnité réparatrice : hors ITS/CNPS
      aValider: true,
    },

    /* --- Gratification / prime de fin d'année ----------------------------- */
    gratification: {
      active: true,
      base: 'salaireCategoriel',
      coefficient: 0.75,                  // 3/4 du minimum catégoriel
      prorataTemporis: true,
      aValider: true,
    },

    /* --- Indemnité de fin de CDD ------------------------------------------ */
    finCDD: { taux: 0, aValider: true },  // pas de prime de précarité générale

    /* --- Imposition du solde de tout compte -------------------------------
     * Le barème ITS est mensuel (note DGI n°00026). Appliquer tel quel le
     * barème à un solde qui couvre plusieurs mois propulse le salarié dans
     * les tranches hautes et sur-impose. Deux modes :
     *   'bareme_mensuel' : barème appliqué au solde entier (conservateur pour
     *                      l'employeur, défavorable au salarié) ;
     *   'etalement'      : l'imposition est calculée sur le salaire mensuel
     *                      moyen puis multipliée par le nombre de mois que
     *                      représente le solde.
     * À arbitrer avec le centre des impôts avant production.
     */
    soldeToutCompte: { modeImposition: 'bareme_mensuel', aValider: true },

    /* --- Exonérations ------------------------------------------------------ */
    exonerations: {
      /* Prime de transport : exonérée d'ITS et de CNPS dans la limite de
         30 000 F/mois/salarié (art. 116-10° CGI). Montants conventionnels :
         Abidjan 30 000, Bouaké 24 000, autres localités 20 000. */
      primeTransportPlafond: 30000,
      primeDePanierPlafond: 25000,
      primeDePanier_aValider: true,
      /* Indemnités de fonction : exonérées dans la limite de 10 % du brut
         global, plafonnées à 300 000 F (art. 116 CGI). */
      indemniteFonctionTauxBrut: 0.10,
      indemniteFonctionPlafond: 300000,
      indemniteFonction_aValider: true,
    },
  },
];

/** Renvoie le jeu de paramètres applicable à une date donnée. */
export function getParams(dateISO) {
  const applicables = PARAMS_PAIE
    .filter((p) => p.dateEffet <= dateISO)
    .sort((a, b) => (a.dateEffet < b.dateEffet ? 1 : -1));
  if (!applicables.length) {
    throw new Error(`Aucun paramétrage de paie en vigueur au ${dateISO}`);
  }
  return applicables[0];
}

/** Inventaire des paramètres non confirmés sur texte officiel. */
export function listerParametresAValider(params = getParams('2026-01-01')) {
  const out = [];
  const walk = (obj, chemin) => {
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (k === 'aValider' && v === true) out.push(chemin || 'racine');
      else if (k.endsWith('_aValider') && v === true) {
        out.push(`${chemin ? chemin + '.' : ''}${k.replace('_aValider', '')}`);
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        walk(v, chemin ? `${chemin}.${k}` : k);
      }
    });
  };
  walk(params, '');
  return out;
}

/* ----------------------------------------------------------------------------
 * 3. GRILLE CATÉGORIELLE
 * ----------------------------------------------------------------------------
 * Branche « Commerce, Distribution, Négoce et Professions libérales »,
 * en vigueur depuis le 01/01/2023 (barème 2015 + 11 %, arrêté n°0050/MEPS/CAB).
 * SOURCE SECONDAIRE : à confronter à l'arrêté officiel avant production.
 * ------------------------------------------------------------------------- */

export const GRILLES_CATEGORIELLES = {
  commerce: {
    libelle: 'Commerce, Distribution, Négoce et Professions libérales',
    dateEffet: '2023-01-01',
    source: 'Barème 2015 + 11 % — arrêté n°0050/MEPS/CAB',
    aValider: true,
    categories: [
      { code: '1A', base: 75000, college: 'employe', cadre: false },
      { code: '1B', base: 83344, college: 'employe', cadre: false },
      { code: '2', base: 89375, college: 'employe', cadre: false },
      { code: '3', base: 92084, college: 'employe', cadre: false },
      { code: '4', base: 99506, college: 'employe', cadre: false },
      { code: '5', base: 118737, college: 'employe', cadre: false },
      { code: '6', base: 128907, college: 'maitrise', cadre: false, maitrise: 'M1' },
      { code: '7A', base: 129313, college: 'maitrise', cadre: false, maitrise: 'M2' },
      { code: '7B', base: 135942, college: 'maitrise', cadre: false, maitrise: 'M3' },
      { code: '8A', base: 135942, college: 'maitrise', cadre: false, maitrise: 'M4' },
      { code: '8B', base: 137955, college: 'maitrise', cadre: false, maitrise: 'M5' },
      { code: '8C', base: 137955, college: 'cadre', cadre: true },
      { code: '9A', base: 139660, college: 'cadre', cadre: true },
      { code: '9B', base: 157121, college: 'cadre', cadre: true },
      { code: '10A', base: 164938, college: 'cadre', cadre: true },
      { code: '10B', base: 184733, college: 'cadre', cadre: true },
      { code: '10C', base: 207824, college: 'cadre', cadre: true },
      { code: '11', base: 230918, college: 'cadre', cadre: true },
    ],
  },
};

/** Retrouve une catégorie dans une grille. */
export function getCategorie(grilleId, code) {
  const g = GRILLES_CATEGORIELLES[grilleId];
  if (!g) throw new Error(`Grille inconnue : ${grilleId}`);
  const c = g.categories.find((x) => x.code === String(code).toUpperCase());
  if (!c) throw new Error(`Catégorie ${code} absente de la grille ${grilleId}`);
  return c;
}

/** Durée de préavis en mois, à partir du collège. Si `params.preavisTable`
 *  est fourni (table de l'application, par ancienneté : [{ jusquMois, mois }]),
 *  elle prime : le préavis dépend de l'ancienneté (décret n°96-200, CCI). */
export function dureePreavisMois(college, params, moisAnciennete = null) {
  const t = params.preavisTable && params.preavisTable[college];
  if (t && moisAnciennete !== null) {
    const l = t.find((x) => x.jusquMois === null || moisAnciennete < x.jusquMois);
    if (l) return l.mois;
  }
  const p = params.preavis;
  return ({ horaire: p.horaireJournalier, ouvrier: p.ouvrierEmploye,
    employe: p.ouvrierEmploye, maitrise: p.agentMaitriseTechnicien,
    cadre: p.ingenieurCadre, cadreSuperieur: p.cadreSuperieur })[college]
    ?? p.ouvrierEmploye;
}

/* ----------------------------------------------------------------------------
 * 4. CALCULS ÉLÉMENTAIRES
 * ------------------------------------------------------------------------- */

/** ITS mensuel : barème progressif sur le brut imposable, moins la RICF. */
export function calculerITS(brutImposable, parts, params) {
  const base = Math.max(0, arr(brutImposable));
  let impot = 0, precedent = 0;
  for (const t of params.baremeITS) {
    if (base <= precedent) break;
    impot += (Math.min(base, t.plafond) - precedent) * t.taux;
    precedent = t.plafond;
  }
  const p = Math.min(Number(parts) || 1, params.partsMax);
  /* Réduction du nombre de parts immédiatement inférieur ou égal (parts forcées) */
  const cles = Object.keys(params.ricf).map(Number).filter((k) => k <= p).sort((a, b) => b - a);
  const reduction = cles.length ? params.ricf[cles[0]] : 0;
  const brut = arr(impot);
  return { impotBrut: brut, ricf: reduction, parts: p,
           montant: Math.max(0, brut - reduction) };
}

/**
 * Nombre de parts ITS selon la situation de famille.
 * @param {'celibataire'|'marie'|'divorce'|'veuf'} situation
 * @param {number} enfants nombre d'enfants à charge
 * @param {number} enfantsHandicapes comptent 1 part au lieu d'une demi-part
 */
export function calculerParts(situation, enfants = 0, enfantsHandicapes = 0) {
  const marie = situation === 'marie';
  const valides = Math.max(0, enfants - enfantsHandicapes);
  if (enfants === 0) return marie ? 2 : 1;
  let parts = marie || situation === 'veuf' ? 2.5 : 2;  // 1er enfant
  const restants = Math.max(0, valides - (enfantsHandicapes > 0 ? 0 : 1));
  parts += restants * 0.5 + enfantsHandicapes * 1;
  return Math.min(parts, 5);
}

/**
 * Heures supplémentaires. `lignes` : [{ type, heures }]
 * type ∈ 'tranche41a46' | 'audelaDe46' | 'nuit' | 'jourDimancheFerie' | 'nuitDimancheFerie'
 */
export function calculerHeuresSup(lignes, salaireMensuelBase, params) {
  const tauxHoraire = salaireMensuelBase / params.horaireMensuelLegal;
  const detail = (lignes || []).map((l) => {
    const maj = params.heuresSup.majorations[l.type];
    if (maj === undefined) throw new Error(`Type d'heure sup inconnu : ${l.type}`);
    const montant = arr(l.heures * tauxHoraire * (1 + maj));
    return { ...l, majoration: maj, tauxHoraire: arr(tauxHoraire), montant };
  });
  return {
    tauxHoraire: arr(tauxHoraire),
    totalHeures: detail.reduce((s, x) => s + x.heures, 0),
    montant: detail.reduce((s, x) => s + x.montant, 0),
    detail,
  };
}

/** Prime d'ancienneté — CCI art. 55, assise sur le salaire catégoriel. */
export function calculerPrimeAnciennete({ dateEmbauche, dateRef, salaireCategoriel }, params) {
  const ans = ancienneteAnnees(dateEmbauche, dateRef);
  const a = params.anciennete;
  const debut = a.debutAns ?? 2;
  if (ans < debut) return { annees: ans, taux: 0, montant: 0 };
  const plafonne = Math.min(ans, a.anneeMax);
  const taux = Math.round((a.tauxApres2Ans + (plafonne - debut) * a.tauxParAnneeSupplementaire) * 10000) / 10000;
  return { annees: ans, taux, montant: arr(salaireCategoriel * taux) };
}

/** Droits à congés acquis, en jours ouvrables. */
export function calculerDroitsConges({
  dateEmbauche, dateRef, joursDejaPris = 0, estMere = false,
  enfantsMoins14 = 0, medailleTravail = false,
  /* Début de la période d'acquisition en cours. À passer par l'application
     après chaque apurement annuel ; à défaut, l'acquisition court depuis
     l'embauche et le plafond de cumul s'applique. */
  dateDebutAcquisition = null,
}, params) {
  const c = params.conges;
  const depart = dateDebutAcquisition || dateEmbauche;
  const moisBruts = ancienneteMois(depart, dateRef);
  const plafonne = moisBruts > c.dureeMaxCumulMois;
  const mois = Math.min(moisBruts, c.dureeMaxCumulMois);
  const moisRetenus = c.prorataFractionDeMois ? mois : Math.floor(mois);
  const baseJours = moisRetenus * c.joursParMois;

  const ans = ancienneteAnnees(dateEmbauche, dateRef);
  let bonusAnc = 0;
  for (const b of c.bonusAnciennete) if (ans >= b.apresAnnees) bonusAnc = b.jours;

  const bonusEnfants = estMere ? enfantsMoins14 * c.joursParEnfantMere : 0;
  const bonusMedaille = medailleTravail ? c.bonusMedailleTravail : 0;

  const acquis = Math.round((baseJours + bonusAnc + bonusEnfants + bonusMedaille) * 100) / 100;
  return {
    debutAcquisition: depart,
    moisDeService: Math.round(mois * 100) / 100,
    moisBruts: Math.round(moisBruts * 100) / 100,
    plafonneParCumul: plafonne,
    joursBase: Math.round(baseJours * 100) / 100,
    bonusAnciennete: bonusAnc, bonusEnfants, bonusMedaille,
    acquis, pris: joursDejaPris,
    solde: Math.round((acquis - joursDejaPris) * 100) / 100,
    alerte: plafonne
      ? `Acquisition plafonnée à ${c.dureeMaxCumulMois} mois : ${Math.round((moisBruts - c.dureeMaxCumulMois) * 100) / 100} mois de droits non pris sont perdus ou doivent être régularisés. L'employeur doit faire prendre les congés.`
      : null,
  };
}

/** Allocation de congés : (salaire mensuel moyen / 26) × jours pris. */
export function calculerAllocationConges({ salaireMensuelMoyen, jours }, params) {
  const tauxJour = salaireMensuelMoyen / params.joursOuvrablesMois;
  return { tauxJournalier: arr(tauxJour), jours, montant: arr(tauxJour * jours) };
}

/* ----------------------------------------------------------------------------
 * 5. BULLETIN DE PAIE MENSUEL
 * ------------------------------------------------------------------------- */

/**
 * @param {object} e Entrée du bulletin.
 *   e.salarie  { matricule, nom, cnps, dateEmbauche, contrat, college,
 *                grilleId, categorie, echelon, expatrie, situationFamille,
 *                enfantsACharge, enfantsHandicapes, personnesCMU,
 *                salaireBase, sursalaire }
 *   e.periode  { du, au, datePaiement, modePaiement }
 *   e.variables{ heuresSup:[], primes:[], indemnites:[], retenues:[],
 *                avantagesNature:[], joursAbsenceNonPayes }
 *   e.entreprise { tauxAT }
 *   e.params     (facultatif) jeu de paramètres à appliquer — sinon PARAMS_PAIE
 *   e.conges     (facultatif) droits à congés déjà calculés par l'application
 *   s.salaireCategoriel (facultatif) minimum de la catégorie, lu dans la grille
 *                de l'application ; à défaut, la grille interne est consultée.
 */
export function calculerBulletin(e) {
  const params = e.params || getParams(e.periode.au);
  const s = e.salarie;
  const v = e.variables || {};
  const cat = s.salaireCategoriel === undefined && s.grilleId && s.categorie
    ? getCategorie(s.grilleId, s.categorie) : null;
  const salaireCategoriel = s.salaireCategoriel ?? (cat ? cat.base : s.salaireBase);

  /* --- Proratisation pour absences non rémunérées --------------------- */
  const joursAbs = v.joursAbsenceNonPayes || 0;
  const coefPresence = joursAbs > 0 ? Math.max(0, (30 - joursAbs) / 30) : 1;

  /* --- Gains ------------------------------------------------------------ */
  const gains = [];
  gains.push({ code: '100', libelle: 'Salaire de base',
    montant: arr(s.salaireBase * coefPresence), imposable: true, cotisable: true });
  if (s.sursalaire > 0) {
    gains.push({ code: '200', libelle: 'Sursalaire',
      montant: arr(s.sursalaire * coefPresence), imposable: true, cotisable: true });
  }

  const anc = calculerPrimeAnciennete(
    { dateEmbauche: s.dateEmbauche, dateRef: e.periode.au, salaireCategoriel }, params);
  if (anc.montant > 0) {
    /* Proratisée comme le salaire : la prime suit les jours payés. */
    anc.montant = arr(salaireCategoriel * anc.taux * coefPresence);
    gains.push({ code: '210',
      libelle: `Prime d'ancienneté (${(anc.taux * 100).toFixed(0)} %)`,
      montant: anc.montant, imposable: true, cotisable: true });
  }

  let hs = null;
  if (v.heuresSup && v.heuresSup.length) {
    hs = calculerHeuresSup(v.heuresSup, s.salaireBase + (s.sursalaire || 0), params);
    hs.detail.forEach((h, i) => gains.push({ code: `3${i}0`,
      libelle: `Heures sup. ${h.type} — ${h.heures} h (+${h.majoration * 100} %)`,
      montant: h.montant, imposable: true, cotisable: true }));
  }

  (v.primes || []).forEach((p) => gains.push({
    code: p.code || '400', libelle: p.libelle, montant: arr(p.montant),
    imposable: p.imposable !== false, cotisable: p.cotisable !== false }));

  (v.avantagesNature || []).forEach((a) => gains.push({
    code: a.code || '450', libelle: `Avantage en nature — ${a.libelle}`,
    montant: arr(a.montant), imposable: true, cotisable: true, avantageNature: true }));

  /* --- Éléments exonérés ------------------------------------------------ */
  const exoneres = [];
  (v.indemnites || []).forEach((ind) => {
    let plafond = Infinity;
    if (ind.nature === 'transport') plafond = params.exonerations.primeTransportPlafond;
    if (ind.nature === 'panier') plafond = params.exonerations.primeDePanierPlafond;
    if (ind.plafond !== undefined && ind.plafond !== null) plafond = ind.plafond;
    const exo = Math.min(arr(ind.montant), plafond);
    const reintegre = arr(ind.montant) - exo;
    exoneres.push({ code: ind.code || '7050', libelle: ind.libelle,
      montant: exo, nature: ind.nature });
    if (reintegre > 0) {
      gains.push({ code: (ind.code || '7050') + 'R',
        libelle: `${ind.libelle} — fraction imposable`,
        montant: reintegre, imposable: true, cotisable: true });
    }
  });

  /* --- Assiettes -------------------------------------------------------- */
  const brutImposable = gains.filter((g) => g.imposable)
    .reduce((t, g) => t + g.montant, 0);
  const brutCotisable = gains.filter((g) => g.cotisable)
    .reduce((t, g) => t + g.montant, 0);
  const brutTotal = gains.reduce((t, g) => t + g.montant, 0);

  /* --- Retenues salariales --------------------------------------------- */
  const parts = s.parts ?? calculerParts(
    s.situationFamille || 'celibataire', s.enfantsACharge || 0, s.enfantsHandicapes || 0);
  const its = calculerITS(brutImposable, parts, params);

  const assietteRetraite = Math.min(brutCotisable, params.cnps.plafondRetraite);
  const cnpsSalarie = arr(assietteRetraite * params.cnps.retraiteSalarie);
  const nbCMU = s.personnesCMU || 1;
  const cmuSalarie = params.cmu.partSalariale * nbCMU;

  const retenues = [
    { code: '4300', libelle: `I.T.S. — barème progressif (${parts} part${parts > 1 ? 's' : ''})`,
      base: brutImposable, montant: its.montant },
    { code: '4400', libelle: 'Retraite C.N.P.S. — part salariale',
      base: assietteRetraite, taux: params.cnps.retraiteSalarie, montant: cnpsSalarie },
    { code: '6500', libelle: `C.M.U. — part salariale (${nbCMU} pers.)`,
      base: null, montant: cmuSalarie },
  ];
  (v.retenues || []).forEach((r) => retenues.push({
    code: r.code || '8000', libelle: r.libelle, montant: arr(r.montant) }));

  const totalRetenues = retenues.reduce((t, r) => t + r.montant, 0);
  const totalExonere = exoneres.reduce((t, x) => t + x.montant, 0);
  const avantagesNature = gains.filter((g) => g.avantageNature)
    .reduce((t, g) => t + g.montant, 0);

  /* Les avantages en nature sont imposés mais non versés : on les déduit. */
  const netAPayer = brutTotal - totalRetenues + totalExonere - avantagesNature;

  /* --- Charges patronales ---------------------------------------------- */
  const plafPF = Math.min(brutCotisable, params.cnps.plafondPF_AT);
  /* Plafonds distincts possibles (paramètres de l'application) */
  const plafMat = Math.min(brutCotisable, params.cnps.plafondMaternite ?? params.cnps.plafondPF_AT);
  const plafAT = Math.min(brutCotisable, params.cnps.plafondAT ?? params.cnps.plafondPF_AT);
  const tauxAT = (e.entreprise && e.entreprise.tauxAT) ?? params.cnps.accidentTravailDefaut;
  const fp = params.fiscalPatronal;
  const tauxCE = s.expatrie ? fp.contributionEmployeurExpatrie : fp.contributionEmployeurLocal;

  const chargesPatronales = [
    { code: '4700', libelle: 'Retraite C.N.P.S. — part patronale',
      base: assietteRetraite, taux: params.cnps.retraiteEmployeur,
      montant: arr(assietteRetraite * params.cnps.retraiteEmployeur) },
    { code: '4800', libelle: 'Prestations familiales',
      base: plafPF, taux: params.cnps.prestationsFamiliales,
      montant: arr(plafPF * params.cnps.prestationsFamiliales) },
    { code: '4850', libelle: 'Assurance maternité',
      base: plafMat, taux: params.cnps.assuranceMaternite,
      montant: arr(plafMat * params.cnps.assuranceMaternite) },
    { code: '4900', libelle: 'Accidents du travail / maladies professionnelles',
      base: plafAT, taux: tauxAT, montant: arr(plafAT * tauxAT) },
    { code: '6501', libelle: `C.M.U. — part patronale (${nbCMU} pers.)`,
      base: null, montant: params.cmu.partPatronale * nbCMU },
    { code: '5000', libelle: `Contribution employeur — personnel ${s.expatrie ? 'expatrié' : 'local'}`,
      base: brutImposable, taux: tauxCE, montant: arr(brutImposable * tauxCE) },
    { code: '5200', libelle: "Taxe d'apprentissage (FDFP)",
      base: brutImposable, taux: fp.taxeApprentissage,
      montant: arr(brutImposable * fp.taxeApprentissage) },
    { code: '5300', libelle: 'Taxe additionnelle F.P.C. (FDFP)',
      base: brutImposable, taux: fp.taxeFPC, montant: arr(brutImposable * fp.taxeFPC) },
  ];
  const totalPatronal = chargesPatronales.reduce((t, c) => t + c.montant, 0);

  const bulletin = {
    type: 'BULLETIN_DE_PAIE',
    versionParams: params.version,
    salarie: { ...s, salaireCategoriel, categorieLibelle: cat ? cat.code : null,
      cadre: cat ? cat.cadre : null },
    periode: e.periode,
    gains, exoneres, retenues, chargesPatronales,
    totaux: {
      brutImposable, brutCotisable, brutTotal, totalRetenues, totalExonere,
      avantagesNature, netAPayer, totalPatronal,
      coutEmployeur: brutTotal + totalExonere - avantagesNature + totalPatronal,
    },
    its, parts, heuresSup: hs, primeAnciennete: anc,
    conges: e.conges || calculerDroitsConges({
      dateEmbauche: s.dateEmbauche, dateRef: e.periode.au,
      dateDebutAcquisition: s.dateDebutAcquisitionConges,
      joursDejaPris: s.congesPris || 0, estMere: s.estMere,
      enfantsMoins14: s.enfantsMoins14 || 0, medailleTravail: s.medailleTravail,
    }, params),
    netEnLettres: montantEnLettres(netAPayer),
  };
  bulletin.anomalies = controlerBulletin(bulletin, params, { brouillon: !!e.brouillon });
  return bulletin;
}

/* ----------------------------------------------------------------------------
 * 6. CONTRÔLES DE CONFORMITÉ
 * ------------------------------------------------------------------------- */

/* `brouillon` : bulletin en préparation — la date de paiement n'est fixée
   qu'à la validation de la paie, son absence n'est donc pas une anomalie. */
export function controlerBulletin(b, params = getParams(b.periode.au), { brouillon = false } = {}) {
  const a = [];
  const push = (gravite, code, message) => a.push({ gravite, code, message });
  const t = b.totaux;

  /* Bouclage arithmétique */
  const attendu = t.brutTotal - t.totalRetenues + t.totalExonere - t.avantagesNature;
  if (attendu !== t.netAPayer) {
    push('bloquant', 'NET_INCOHERENT',
      `Le net (${fcfa(t.netAPayer)}) ne correspond pas au calcul (${fcfa(attendu)}).`);
  }

  /* Clé fiscale patronale : 2,80 % du brut pour un local */
  const fiscal = b.chargesPatronales
    .filter((c) => ['5000', '5200', '5300'].includes(c.code))
    .reduce((s, c) => s + c.montant, 0);
  const cible = b.salarie.expatrie
    ? params.fiscalPatronal.totalAttenduExpatrie
    : params.fiscalPatronal.totalAttenduLocal;
  const reel = t.brutImposable ? fiscal / t.brutImposable : 0;
  if (Math.abs(reel - cible) > 0.0005 && !params.fiscalPatronal.fpcFractionnee) {
    push('majeur', 'FISCAL_PATRONAL',
      `Fiscalité patronale à ${(reel * 100).toFixed(2)} % du brut au lieu de ${(cible * 100).toFixed(2)} % (note DGI n°00026).`);
  }

  /* SMIG */
  if (b.salarie.salaireBase < params.smig) {
    push('bloquant', 'SOUS_SMIG',
      `Salaire de base ${fcfa(b.salarie.salaireBase)} inférieur au SMIG (${fcfa(params.smig)}).`);
  }

  /* Minimum conventionnel */
  if (b.salarie.salaireCategoriel && b.salarie.salaireBase < b.salarie.salaireCategoriel) {
    push('bloquant', 'SOUS_CATEGORIEL',
      `Salaire de base ${fcfa(b.salarie.salaireBase)} inférieur au minimum de la catégorie ${b.salarie.categorieLibelle} (${fcfa(b.salarie.salaireCategoriel)}).`);
  }

  /* Structure base / sursalaire */
  if (b.salarie.sursalaire > b.salarie.salaireBase) {
    push('avertissement', 'SURSALAIRE_DOMINANT',
      `Le sursalaire (${fcfa(b.salarie.sursalaire)}) dépasse le salaire de base : vérifier le classement catégoriel.`);
  }

  /* Heures supplémentaires */
  if (b.heuresSup) {
    const sem = b.heuresSup.totalHeures / 4.33;
    if (sem > params.heuresSup.maxParSemaine) {
      push('majeur', 'HS_HEBDO',
        `≈ ${sem.toFixed(1)} h sup./semaine : plafond légal ${params.heuresSup.maxParSemaine} h (décret n°2024-898).`);
    }
    if (params.heuresSup.forfaitInterditNonCadres
      && b.salarie.college && b.salarie.college !== 'cadre'
      && b.salarie.college !== 'cadreSuperieur' && b.variablesForfaitHS) {
      push('bloquant', 'FORFAIT_HS_NUL',
        'Clause de forfait d\'heures supplémentaires nulle pour ce collège (décret n°2024-898).');
    }
  }

  /* Congés non pris accumulés */
  if (b.conges && b.conges.plafonneParCumul) {
    push('majeur', 'CONGES_NON_APURES', b.conges.alerte);
  } else if (b.conges && b.conges.solde > 26) {
    push('avertissement', 'CONGES_CUMULES',
      `${String(b.conges.solde).replace('.', ',')} jours de congés non pris : organiser le départ en congé.`);
  }

  /* Mentions du bulletin (Code du travail, art. 32.5 : bulletin individuel
     remis au moment du paiement, présentation fixée par voie réglementaire) */
  const manquants = [];
  if (!b.salarie.cnps) manquants.push('n° CNPS du salarié');
  if (!b.salarie.dateEmbauche) manquants.push("date d'embauche");
  if (!b.salarie.categorie) manquants.push('catégorie');
  if (!brouillon && !b.periode.datePaiement) manquants.push('date de paiement');
  if (manquants.length) {
    push('majeur', 'MENTIONS_MANQUANTES',
      `Mentions absentes du bulletin : ${manquants.join(', ')} (Code du travail, art. 32.5).`);
  }

  /* Délai de paiement : au plus tard 8 jours après la fin du mois (art. 32.3) */
  if (b.periode.datePaiement && b.periode.au) {
    const retard = joursEntre(b.periode.au, b.periode.datePaiement) - 1;
    if (retard > 8) {
      push('majeur', 'DELAI_PAIEMENT',
        `Paiement ${retard} jours après la fin du mois : maximum légal 8 jours (Code du travail, art. 32.3).`);
    }
  }
  return a;
}

/* ----------------------------------------------------------------------------
 * 7. SOLDE DE TOUT COMPTE
 * ------------------------------------------------------------------------- */

/** Indemnité de licenciement : % du salaire global moyen, par tranche d'années. */
export function calculerIndemniteLicenciement({ anneesAnciennete, salaireGlobalMoyen }, params) {
  const L = params.licenciement;
  if (anneesAnciennete < L.ancienneteMinimaleAnnees) {
    return { montant: 0, detail: [], motifExclusion: 'Ancienneté inférieure à 1 an' };
  }
  const detail = [];
  let restant = anneesAnciennete, borneBasse = 0, montant = 0;
  for (const t of L.tranches) {
    if (restant <= 0) break;
    const largeur = Math.min(restant, t.jusquAnnee - borneBasse);
    if (largeur > 0) {
      const m = arr(salaireGlobalMoyen * t.taux * largeur);
      detail.push({ annees: Math.round(largeur * 100) / 100, taux: t.taux, montant: m });
      montant += m;
      restant -= largeur;
    }
    borneBasse = t.jusquAnnee;
  }
  return { montant, detail, salaireGlobalMoyen: arr(salaireGlobalMoyen) };
}

/**
 * Solde de tout compte.
 * @param {object} e
 *   e.salarie            idem bulletin (+ college, salaireCategoriel)
 *   e.rupture { date, motif, preavisEffectue, fauteLourde }
 *     motif ∈ 'licenciement'|'demission'|'finCDD'|'ruptureConventionnelle'|
 *             'retraite'|'deces'|'rupturePeriodeEssai'
 *   e.historique { salaireGlobalMoyen12Mois, joursCongesNonPris, salairesDus }
 */
export function calculerSoldeToutCompte(e) {
  const params = getParams(e.rupture.date);
  const s = e.salarie;
  const r = e.rupture;
  const h = e.historique || {};

  const ans = ancienneteMois(s.dateEmbauche, r.date) / 12;
  const smm = h.salaireGlobalMoyen12Mois
    ?? (s.salaireBase + (s.sursalaire || 0));

  const rubriques = [];

  /* 1. Salaire du mois de départ ---------------------------------------- */
  if (h.salairesDus) {
    rubriques.push({ code: 'STC-100', libelle: 'Salaire du mois de départ',
      montant: arr(h.salairesDus), imposable: true, cotisable: true });
  }

  /* 2. Indemnité compensatrice de préavis -------------------------------- */
  const moisPreavis = dureePreavisMois(s.college, params, ancienneteMois(s.dateEmbauche, r.date));
  const droitPreavis = ['licenciement', 'retraite'].includes(r.motif)
    && !r.fauteLourde && !r.preavisEffectue;
  if (droitPreavis) {
    rubriques.push({ code: 'STC-200',
      libelle: `Indemnité compensatrice de préavis (${moisPreavis} mois)`,
      montant: arr(smm * moisPreavis), imposable: true, cotisable: true });
  }

  /* 3. Indemnité compensatrice de congés payés --------------------------- */
  const droitsConges = calculerDroitsConges({
    dateEmbauche: s.dateEmbauche, dateRef: r.date,
    dateDebutAcquisition: s.dateDebutAcquisitionConges,
    joursDejaPris: s.congesPris || 0, estMere: s.estMere,
    enfantsMoins14: s.enfantsMoins14 || 0, medailleTravail: s.medailleTravail,
  }, params);
  const jours = h.joursCongesNonPris ?? droitsConges.solde;
  if (jours > 0) {
    const al = calculerAllocationConges({ salaireMensuelMoyen: smm, jours }, params);
    rubriques.push({ code: 'STC-300',
      libelle: `Indemnité compensatrice de congés payés (${jours} j ouvrables)`,
      montant: al.montant, imposable: true, cotisable: true, detail: al });
  }

  /* 4. Gratification au prorata ------------------------------------------ */
  if (params.gratification.active && !r.fauteLourde) {
    const base = params.gratification.base === 'salaireCategoriel'
      ? (s.salaireCategoriel || s.salaireBase) : smm;
    /* Prorata du temps de présence dans l'année : depuis le 1er janvier, ou
       depuis l'embauche si elle a eu lieu dans l'année de la rupture. */
    const debutAnnee = `${r.date.slice(0, 4)}-01-01`;
    const depuis = s.dateEmbauche > debutAnnee ? s.dateEmbauche : debutAnnee;
    const moisAnneeCourante = Math.min(12, moisDePresence(depuis, r.date));
    const prorata = params.gratification.prorataTemporis ? moisAnneeCourante / 12 : 1;
    const m = arr(base * params.gratification.coefficient * prorata);
    if (m > 0) {
      rubriques.push({ code: 'STC-400',
        libelle: `Gratification au prorata (${String(moisAnneeCourante).replace('.', ',')}/12)`,
        montant: m, imposable: true, cotisable: true });
    }
  }

  /* 5. Indemnité de licenciement — non imposable -------------------------- */
  let indLic = { montant: 0, detail: [] };
  if (r.motif === 'licenciement' && !r.fauteLourde) {
    indLic = calculerIndemniteLicenciement(
      { anneesAnciennete: ans, salaireGlobalMoyen: smm }, params);
    if (indLic.montant > 0) {
      rubriques.push({ code: 'STC-500', libelle: "Indemnité de licenciement",
        montant: indLic.montant,
        imposable: params.licenciement.imposable,
        cotisable: params.licenciement.imposable, detail: indLic.detail });
    }
  }

  /* 6. Indemnité de fin de CDD -------------------------------------------- */
  if (r.motif === 'finCDD' && params.finCDD.taux > 0) {
    rubriques.push({ code: 'STC-550', libelle: 'Indemnité de fin de contrat',
      montant: arr(smm * ans * 12 * params.finCDD.taux),
      imposable: true, cotisable: true });
  }

  /* 7. Retenues ----------------------------------------------------------- */
  const assietteImposable = rubriques.filter((x) => x.imposable)
    .reduce((t, x) => t + x.montant, 0);
  const assietteCotisable = rubriques.filter((x) => x.cotisable)
    .reduce((t, x) => t + x.montant, 0);

  const parts = s.parts ?? calculerParts(
    s.situationFamille || 'celibataire', s.enfantsACharge || 0, s.enfantsHandicapes || 0);

  let its;
  if (params.soldeToutCompte.modeImposition === 'etalement' && smm > 0) {
    const moisEquivalents = Math.max(1, assietteImposable / smm);
    const itsMensuel = calculerITS(smm, parts, params);
    its = { ...itsMensuel, moisEquivalents: Math.round(moisEquivalents * 100) / 100,
      mode: 'etalement', montant: arr(itsMensuel.montant * moisEquivalents) };
  } else {
    its = { ...calculerITS(assietteImposable, parts, params), mode: 'bareme_mensuel' };
  }

  const cnpsSal = arr(Math.min(assietteCotisable, params.cnps.plafondRetraite)
    * params.cnps.retraiteSalarie);

  const retenues = [
    { code: '4300', libelle: 'I.T.S.', montant: its.montant },
    { code: '4400', libelle: 'Retraite C.N.P.S. — part salariale', montant: cnpsSal },
  ];
  (e.retenuesDiverses || []).forEach((x) => retenues.push({
    code: x.code || '8000', libelle: x.libelle, montant: arr(x.montant) }));

  const brut = rubriques.reduce((t, x) => t + x.montant, 0);
  const totalRetenues = retenues.reduce((t, x) => t + x.montant, 0);
  const net = brut - totalRetenues;

  return {
    type: 'SOLDE_DE_TOUT_COMPTE',
    versionParams: params.version,
    salarie: s, rupture: r,
    anciennete: { annees: Math.round(ans * 100) / 100,
      mois: Math.round(ancienneteMois(s.dateEmbauche, r.date) * 100) / 100 },
    salaireGlobalMoyen: arr(smm),
    preavis: { moisDus: moisPreavis, effectue: !!r.preavisEffectue, indemnise: droitPreavis },
    congesNonPris: jours, droitsConges,
    indemniteLicenciement: indLic,
    rubriques, retenues,
    totaux: { brut, assietteImposable, assietteCotisable, totalRetenues, net },
    netEnLettres: montantEnLettres(net),
    mentionLegale:
      "Reçu pour solde de tout compte. Conformément à l'article 32.6 du Code du "
      + "travail, la mention « pour solde de tout compte » n'est pas opposable au "
      + "travailleur et ne vaut pas renonciation à ses droits.",
  };
}

/* ----------------------------------------------------------------------------
 * 8. ÉTAT DE SOLDE POUR CONGÉS
 * ------------------------------------------------------------------------- */

/**
 * Établissement de solde pour départ en congés.
 * Le salarié perçoit l'allocation de congés AVANT son départ (usage CCI).
 */
export function calculerSoldeConges(e) {
  const params = getParams(e.depart.dateDebut);
  const s = e.salarie;
  const smm = e.salaireMensuelMoyen ?? (s.salaireBase + (s.sursalaire || 0));

  const droits = calculerDroitsConges({
    dateEmbauche: s.dateEmbauche, dateRef: e.depart.dateDebut,
    dateDebutAcquisition: s.dateDebutAcquisitionConges,
    joursDejaPris: s.congesPris || 0, estMere: s.estMere,
    enfantsMoins14: s.enfantsMoins14 || 0, medailleTravail: s.medailleTravail,
  }, params);

  const jours = e.depart.joursPris ?? droits.solde;
  if (jours > droits.solde + 0.01) {
    throw new Error(
      `Jours demandés (${jours}) supérieurs au solde acquis (${droits.solde}).`);
  }

  const allocation = calculerAllocationConges(
    { salaireMensuelMoyen: smm, jours }, params);

  const parts = s.parts ?? calculerParts(
    s.situationFamille || 'celibataire', s.enfantsACharge || 0, s.enfantsHandicapes || 0);
  const its = calculerITS(allocation.montant, parts, params);
  const cnps = arr(Math.min(allocation.montant, params.cnps.plafondRetraite)
    * params.cnps.retraiteSalarie);
  const net = allocation.montant - its.montant - cnps;

  return {
    type: 'ETAT_DE_SOLDE_POUR_CONGES',
    versionParams: params.version,
    salarie: s,
    depart: e.depart,
    droits, allocation,
    retenues: [
      { code: '4300', libelle: 'I.T.S.', montant: its.montant },
      { code: '4400', libelle: 'Retraite C.N.P.S. — part salariale', montant: cnps },
    ],
    totaux: { brut: allocation.montant, totalRetenues: its.montant + cnps, net },
    soldeApresDepart: Math.round((droits.solde - jours) * 100) / 100,
    netEnLettres: montantEnLettres(net),
  };
}

/* ----------------------------------------------------------------------------
 * 9. RÉGULARISATION ANNUELLE ET ÉTATS DÉCLARATIFS
 * ------------------------------------------------------------------------- */

/**
 * Contrôle annuel de l'ITS. Le barème est MENSUEL (note DGI n°00026) : l'impôt
 * dû pour l'année est la somme des impôts dus chaque mois sur le brut de ce
 * mois. Recalculer l'année sur un brut moyen (« lissage ») ferait apparaître
 * un trop-perçu fictif dès qu'un mois comporte une prime : ce n'est pas une
 * régularisation prévue par les textes. Chaque mois est donc recalculé avec
 * ses propres paramètres et ses propres parts ; un écart révèle une erreur de
 * bulletin, à régulariser au mois suivant.
 * @param {Array} mois [{ periode, brutImposable, parts, itsRetenu, params? }]
 */
export function controleAnnuelITS(mois, annee) {
  const detail = (mois || []).map((m) => {
    const params = m.params || getParams(`${m.periode}-28`);
    const du = calculerITS(m.brutImposable, m.parts, params).montant;
    return { periode: m.periode, brutImposable: arr(m.brutImposable), parts: m.parts,
      itsRetenu: arr(m.itsRetenu), itsDu: du, ecart: du - arr(m.itsRetenu) };
  });
  const somme = (k) => detail.reduce((t, x) => t + x[k], 0);
  const ecart = somme('ecart');
  return {
    annee, nbBulletins: detail.length, brutAnnuel: somme('brutImposable'),
    itsRetenu: somme('itsRetenu'), itsDu: somme('itsDu'), ecart, detail,
    sens: ecart > 0 ? 'complement_a_retenir' : ecart < 0 ? 'trop_percu_a_restituer' : 'conforme',
  };
}

/** Ancien nom, conservé : il applique désormais le contrôle mois par mois.
 *  Accepte des bulletins issus de calculerBulletin. */
export function regularisationAnnuelleITS(bulletins, annee) {
  return controleAnnuelITS(bulletins.map((b) => ({
    periode: String(b.periode.au).slice(0, 7), brutImposable: b.totaux.brutImposable, parts: b.parts,
    itsRetenu: (b.retenues.find((r) => r.code === '4300') || {}).montant || 0,
    params: getParams(b.periode.au),
  })), annee);
}

/** Récapitulatif mensuel pour la déclaration CNPS et DGI. */
export function etatDeclaratifMensuel(bulletins, periode) {
  const l = (code) => bulletins.reduce((t, b) => {
    const c = b.chargesPatronales.find((x) => x.code === code);
    return t + (c ? c.montant : 0);
  }, 0);
  const r = (code) => bulletins.reduce((t, b) => {
    const x = b.retenues.find((y) => y.code === code);
    return t + (x ? x.montant : 0);
  }, 0);

  return {
    periode, effectif: bulletins.length,
    masseSalarialeBrute: bulletins.reduce((t, b) => t + b.totaux.brutImposable, 0),
    cnps: {
      retraiteSalariale: r('4400'), retraitePatronale: l('4700'),
      prestationsFamiliales: l('4800'), maternite: l('4850'),
      accidentTravail: l('4900'),
      cmu: r('6500') + l('6501'),
      total: r('4400') + l('4700') + l('4800') + l('4850') + l('4900')
             + r('6500') + l('6501'),
    },
    dgi: { its: r('4300'), contributionEmployeur: l('5000'),
           total: r('4300') + l('5000') },
    fdfp: { taxeApprentissage: l('5200'), taxeFPC: l('5300'),
            total: l('5200') + l('5300') },
    coutTotal: bulletins.reduce((t, b) => t + b.totaux.coutEmployeur, 0),
  };
}

/** Livre de paie — art. 32.2 al. 3 du Code du travail. */
export function livreDePaie(bulletins, periode) {
  return {
    periode,
    lignes: bulletins.map((b) => ({
      matricule: b.salarie.matricule, nom: b.salarie.nom, cnps: b.salarie.cnps,
      emploi: b.salarie.emploi, categorie: b.salarie.categorieLibelle,
      brut: b.totaux.brutImposable, retenues: b.totaux.totalRetenues,
      net: b.totaux.netAPayer, datePaiement: b.periode.datePaiement,
    })),
    totaux: {
      brut: bulletins.reduce((t, b) => t + b.totaux.brutImposable, 0),
      retenues: bulletins.reduce((t, b) => t + b.totaux.totalRetenues, 0),
      net: bulletins.reduce((t, b) => t + b.totaux.netAPayer, 0),
    },
  };
}

/* ----------------------------------------------------------------------------
 * 10. OUTIL DE CLASSEMENT — répartition base / sursalaire à brut constant
 * ------------------------------------------------------------------------- */

/**
 * Simule un reclassement catégoriel sans toucher au brut : indique la nouvelle
 * ventilation base/sursalaire et l'impact différé sur la prime d'ancienneté.
 */
export function simulerReclassement({ grilleId, categories, brutActuel, dateEmbauche, dateRef, params: p }) {
  const params = p || getParams(dateRef || '2026-01-01');
  /* `categories` : grille de l'application ([{ code, base, college, cadre }]) ;
     à défaut, grille interne `grilleId`. */
  const liste = categories || GRILLES_CATEGORIELLES[grilleId].categories;
  return liste.map((c) => {
    const possible = c.base <= brutActuel;
    const anc = calculerPrimeAnciennete(
      { dateEmbauche, dateRef, salaireCategoriel: c.base }, params);
    return {
      categorie: c.code, college: c.college, cadre: c.cadre,
      salaireBase: c.base,
      sursalaire: possible ? brutActuel - c.base : null,
      possibleABrutConstant: possible,
      augmentationRequise: possible ? 0 : c.base - brutActuel,
      primeAncienneteA2Ans: arr(c.base * params.anciennete.tauxApres2Ans),
      primeAncienneteActuelle: anc.montant,
    };
  });
}

/* ----------------------------------------------------------------------------
 * 11. EXPORT GROUPÉ (pratique pour un App.jsx monolithique)
 * ------------------------------------------------------------------------- */

export const PaieEngine = {
  PARAMS_PAIE, GRILLES_CATEGORIELLES, getParams, getCategorie,
  listerParametresAValider,
  calculerITS, calculerParts, calculerHeuresSup, calculerPrimeAnciennete,
  calculerDroitsConges, calculerAllocationConges,
  calculerBulletin, controlerBulletin,
  calculerSoldeToutCompte, calculerIndemniteLicenciement, calculerSoldeConges,
  regularisationAnnuelleITS, controleAnnuelITS, etatDeclaratifMensuel, livreDePaie,
  simulerReclassement, dureePreavisMois,
  montantEnLettres, fcfa, arr, ancienneteMois, ancienneteAnnees, joursEntre,
  finDeMois, moisDePresence,
};

export default PaieEngine;
