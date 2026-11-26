/* ============================================================================
 *  ENTREPRISE KIBEGNON · SUIVI D'ÉQUIPE — messages types (version 38)
 *  Messages préparés qui accompagnent un envoi par WhatsApp ou par e-mail,
 *  selon la situation. La direction peut les modifier dans l'outil ; ceux-ci
 *  restent les modèles d'origine.
 * ==========================================================================*/

export const SIGNATURE = "\n\n{agent}\nEntreprise Kibegnon — Agent immobilier agréé AG-0456\n{telephones}";

export const MODELES = {
  /* Documents */
  quittance: { label: "Envoi d'une quittance", groupe: "Documents",
    body: "Bonjour {nom},\n\nVeuillez trouver ci-joint votre quittance de loyer n° {ref} pour {periode}, d'un montant de {montant}, concernant {bien}.\n\nNous vous remercions pour votre règlement." },
  decompte: { label: "Envoi d'un décompte d'entrée", groupe: "Documents",
    body: "Bonjour {nom},\n\nVeuillez trouver ci-joint le décompte d'entrée n° {ref} pour {bien}, d'un montant total de {montant} (mois d'avance, caution et frais).\n\nNous restons à votre disposition pour fixer la date de signature du bail et de remise des clés." },
  facture: { label: "Envoi d'une facture", groupe: "Documents",
    body: "Bonjour {nom},\n\nVeuillez trouver ci-joint la facture n° {ref} d'un montant de {montant}.\n\nNous vous en souhaitons bonne réception." },
  impayes: { label: "Envoi d'une facture d'impayés", groupe: "Documents",
    body: "Bonjour {nom},\n\nVeuillez trouver ci-joint le relevé n° {ref} des sommes restant dues pour {bien}, soit {montant}.\n\nNous vous remercions de bien vouloir régulariser votre situation dans les meilleurs délais ou de nous contacter pour convenir d'un échéancier." },
  courrier: { label: "Envoi d'un courrier", groupe: "Documents",
    body: "Bonjour {nom},\n\nVeuillez trouver ci-joint notre courrier n° {ref} relatif à : {objet}.\n\nNous restons à votre disposition pour tout renseignement." },
  relance_courrier: { label: "Envoi d'une lettre de relance", groupe: "Documents",
    body: "Bonjour {nom},\n\nVeuillez trouver ci-joint notre lettre n° {ref} concernant le loyer de {bien}, pour un montant de {montant}.\n\nMerci de nous contacter dès réception." },
  solde: { label: "Envoi d'un solde de tout compte", groupe: "Documents",
    body: "Bonjour {nom},\n\nVeuillez trouver ci-joint le solde de tout compte n° {ref} établi à votre départ de {bien}.\n\nNous restons à votre disposition pour toute précision." },
  decharge: { label: "Envoi d'une décharge", groupe: "Documents",
    body: "Bonjour {nom},\n\nVeuillez trouver ci-joint la décharge n° {ref} d'un montant de {montant}, pour vos archives." },
  prestation: { label: "Envoi d'une fiche de prestation", groupe: "Documents",
    body: "Bonjour {nom},\n\nVeuillez trouver ci-joint la fiche de prestation n° {ref} d'un montant de {montant}." },
  recu_charge: { label: "Envoi d'un reçu de charges au propriétaire", groupe: "Documents",
    body: "Bonjour {nom},\n\nVeuillez trouver ci-joint le reçu n° {ref} des charges réglées par l'agence pour {bien}, d'un montant de {montant}." },
  /* Loyers */
  rappel_echeance: { label: "Rappel avant l'échéance du loyer", groupe: "Relances de loyer",
    body: "Bonjour {nom},\n\nNous vous rappelons que le loyer de {periode} pour {bien}, d'un montant de {loyer}, est payable au plus tard le {echeance}.\n\nMerci de votre ponctualité." },
  relance_1: { label: "Relance amiable (1er rappel)", groupe: "Relances de loyer",
    body: "Bonjour {nom},\n\nSauf erreur de notre part, nous n'avons pas encore reçu le règlement de votre loyer de {periode} pour {bien}. Il reste {du} à régler.\n\nSi vous avez déjà payé, merci de ne pas tenir compte de ce message et de nous envoyer la preuve du paiement." },
  relance_2: { label: "Relance ferme (2e rappel)", groupe: "Relances de loyer",
    body: "Bonjour {nom},\n\nMalgré notre précédent rappel, votre loyer de {periode} pour {bien} reste impayé. Le montant dû s'élève à {du}.\n\nNous vous demandons de régulariser votre situation au plus tard le {date_limite}, ou de passer à l'agence pour convenir d'un échéancier." },
  dernier_avis: { label: "Dernier avis avant mise en demeure", groupe: "Relances de loyer",
    body: "Bonjour {nom},\n\nDernier avis : la somme de {du} reste due au titre de votre loyer pour {bien}, malgré nos rappels.\n\nÀ défaut de règlement au plus tard le {date_limite}, une mise en demeure vous sera adressée, conformément à votre contrat de bail. Nous préférons toutefois une solution amiable : contactez-nous sans tarder." },
  merci_paiement: { label: "Confirmation de paiement reçu", groupe: "Relances de loyer",
    body: "Bonjour {nom},\n\nNous accusons réception de votre paiement de {montant} pour {periode} ({bien}). Votre quittance vous sera transmise après validation.\n\nMerci pour votre confiance." },
  /* Baux et visites */
  fin_bail: { label: "Échéance du bail", groupe: "Baux et visites",
    body: "Bonjour {nom},\n\nVotre bail n° {code_bail} pour {bien} arrive à échéance le {fin_bail}. Merci de prendre contact avec l'agence pour convenir de la suite (renouvellement ou départ)." },
  visite_confirmation: { label: "Confirmation d'une visite", groupe: "Baux et visites",
    body: "Bonjour {nom},\n\nNous vous confirmons la visite de {bien} le {date_visite}. Notre agent {agent} vous accompagnera.\n\nEn cas d'empêchement, merci de nous prévenir." },
  libre: { label: "Message libre", groupe: "Autres", body: "Bonjour {nom},\n\n" },
};

/* Modèle conseillé pour chaque type de document de l'agence */
export const MODELE_DU_DOCUMENT = {
  quittance: "quittance", decompte_entree: "decompte", facture: "facture", facture_impayes: "impayes", courrier: "courrier",
  relance: "relance_courrier", solde_tout_compte: "solde", decharge: "decharge", prestation: "prestation", recu_charge: "recu_charge",
};

export const VARIABLES = [
  ["{nom}", "Nom du destinataire"], ["{bien}", "Bien et lot"], ["{periode}", "Mois concerné"], ["{montant}", "Montant du document"],
  ["{loyer}", "Loyer mensuel"], ["{du}", "Reste à payer"], ["{echeance}", "Date d'échéance du loyer"], ["{date_limite}", "Date limite accordée"],
  ["{ref}", "Référence du document"], ["{objet}", "Objet du courrier"], ["{code_bail}", "Code du bail"], ["{fin_bail}", "Fin du bail"],
  ["{date_visite}", "Date de la visite"], ["{agent}", "Nom de l'agent"], ["{telephones}", "Téléphones de l'agence"],
];

/* Modèles en vigueur : ceux de l'application, remplacés par ceux modifiés par la direction */
export function modelesEnVigueur(surcharges = []) {
  const m = Object.fromEntries(Object.entries(MODELES).map(([k, v]) => [k, { ...v, code: k, modifie: false }]));
  (surcharges || []).forEach((r) => {
    if (!r?.code) return;
    m[r.code] = { ...(m[r.code] || { groupe: "Modèles de l'agence" }), code: r.code, label: r.label || m[r.code]?.label || r.code, body: r.body || "", modifie: !!MODELES[r.code], perso: !MODELES[r.code] };
  });
  return m;
}

/* Remplit un modèle ; une information absente reste visible entre crochets pour être complétée */
export function remplir(texte, valeurs = {}, { signature = true } = {}) {
  const t = String(texte || "") + (signature && !/\{agent\}/.test(texte || "") ? SIGNATURE : "");
  return t.replace(/\{([a-z_]+)\}/g, (m, k) => {
    const v = valeurs[k];
    return v === undefined || v === null || String(v).trim() === "" ? `[${k.replace(/_/g, " ")}]` : String(v);
  }).replace(/\n{3,}/g, "\n\n").trim();
}

/* Numéro au format international pour WhatsApp (Côte d'Ivoire par défaut).
   « 07 87 84 33 68 », « +225 0787843368 », « 00225… » → « 2250787843368 ».
   Un ancien numéro à 8 chiffres n'est pas deviné : il doit être complété. */
export function numeroWhatsApp(tel) {
  const premier = String(tel || "").split(/[/,;]| ou /i).map((x) => x.trim()).find((x) => /\d/.test(x)) || "";
  let d = premier.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && /^0[157]|^2[157]/.test(d)) return `225${d}`;
  if (d.length === 13 && d.startsWith("225")) return d;
  if (d.length >= 11 && d.length <= 15 && !d.startsWith("225") && !d.startsWith("0")) return d;
  return "";
}
export const telLisible = (n) => (n && n.startsWith("225") && n.length === 13 ? `+225 ${n.slice(3).replace(/(\d{2})(?=\d)/g, "$1 ")}` : n ? `+${n}` : "");

/* Liens d'ouverture d'une discussion : application installée sur l'ordinateur, ou WhatsApp Web */
export function lienWhatsApp(numero, texte, mode = "application") {
  const t = encodeURIComponent(texte || "");
  if (mode === "web") return `https://web.whatsapp.com/send?phone=${numero}&text=${t}`;
  if (mode === "wa.me") return `https://wa.me/${numero}?text=${t}`;
  return `whatsapp://send?phone=${numero}&text=${t}`;
}

/* Niveau de relance conseillé selon le retard (jours après l'échéance) et les relances déjà faites */
export function relanceConseillee({ joursRetard = 0, dejaRelance = 0 } = {}) {
  if (joursRetard < 0) return "rappel_echeance";
  if (dejaRelance >= 2 || joursRetard > 30) return "dernier_avis";
  if (dejaRelance >= 1 || joursRetard > 10) return "relance_2";
  return "relance_1";
}
