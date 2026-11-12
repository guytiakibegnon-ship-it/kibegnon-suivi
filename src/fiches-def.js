/* ══════════════════════════════════════════════════════════════════════
   Fiches de renseignements — définition des deux formulaires publics
   (locataire, propriétaire). Utilisée par le formulaire en ligne
   (FichePublique.jsx) et par l'écran de suivi (Outils.jsx).
   Un champ : { k, label, type, options, requis, aide, large }
   ══════════════════════════════════════════════════════════════════════ */
const PIECES = ["Carte nationale d'identité", "Passeport", "Carte consulaire", "Carte de résident", "Permis de conduire", "Attestation d'identité"];
const SITUATIONS = ["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf / veuve"];

export const FICHES = {
  locataire: {
    titre: "Fiche de renseignements — Locataire",
    intro: "Merci de compléter cette fiche. Elle permet à l'agence de préparer votre dossier de location et de vous joindre facilement.",
    sections: [
      { titre: "Votre identité", champs: [
        { k: "civilite", label: "Civilité", type: "select", options: ["M.", "Mme", "Mlle"] },
        { k: "nom", label: "Nom et prénoms", requis: true, large: true },
        { k: "date_naissance", label: "Date de naissance", type: "date" },
        { k: "lieu_naissance", label: "Lieu de naissance" },
        { k: "nationalite", label: "Nationalité" },
        { k: "situation", label: "Situation de famille", type: "select", options: SITUATIONS },
        { k: "piece_type", label: "Pièce d'identité", type: "select", options: PIECES },
        { k: "piece_numero", label: "Numéro de la pièce" },
      ] },
      { titre: "Vos coordonnées", champs: [
        { k: "telephone", label: "Téléphone", type: "tel", requis: true },
        { k: "whatsapp", label: "WhatsApp (si différent)", type: "tel" },
        { k: "email", label: "Adresse e-mail", type: "email" },
        { k: "adresse", label: "Adresse actuelle (commune, quartier)", large: true },
      ] },
      { titre: "Votre activité", champs: [
        { k: "profession", label: "Profession" },
        { k: "statut_pro", label: "Statut", type: "select", options: ["Salarié du privé", "Fonctionnaire ou agent de l'État", "Commerçant ou indépendant", "Profession libérale", "Retraité", "Étudiant", "Sans emploi", "Autre"] },
        { k: "employeur", label: "Employeur ou nom de l'activité" },
        { k: "employeur_adresse", label: "Lieu de travail" },
        { k: "anciennete", label: "Depuis quand ? (année)" },
        { k: "revenu", label: "Revenu mensuel net (FCFA)", type: "number", aide: "Salaire ou revenu moyen du mois." },
        { k: "autres_revenus", label: "Autres revenus mensuels (FCFA)", type: "number" },
      ] },
      { titre: "Le logement ou le local", champs: [
        { k: "usage", label: "Usage du bail", type: "select", options: ["Habitation", "Professionnel (bureau, commerce)"] },
        { k: "bien", label: "Bien concerné (résidence, appartement, local)", large: true, aide: "Si vous êtes déjà locataire, indiquez votre résidence et votre porte." },
        { k: "personnes", label: "Nombre de personnes qui occuperont le logement", type: "number" },
        { k: "loyer_souhaite", label: "Loyer mensuel prévu (FCFA)", type: "number" },
      ] },
      { titre: "Personnes à contacter", champs: [
        { k: "urgence_nom", label: "Personne à prévenir en cas d'urgence" },
        { k: "urgence_tel", label: "Son téléphone", type: "tel" },
        { k: "garant_nom", label: "Garant (personne qui se porte caution), s'il y en a un" },
        { k: "garant_tel", label: "Téléphone du garant", type: "tel" },
        { k: "garant_profession", label: "Profession du garant" },
      ] },
      { titre: "Précisions", champs: [
        { k: "observations", label: "Autres informations utiles", type: "textarea", large: true },
      ] },
    ],
  },
  proprietaire: {
    titre: "Fiche de renseignements — Propriétaire",
    intro: "Merci de compléter cette fiche. Elle permet à l'agence de préparer votre dossier (mandat de gestion, de location ou de vente) et de vous joindre facilement.",
    sections: [
      { titre: "Votre identité", champs: [
        { k: "qualite", label: "Vous êtes", type: "select", options: ["Un particulier", "Une société", "Une succession ou une indivision", "Une association ou autre"] },
        { k: "nom", label: "Nom et prénoms, ou dénomination sociale", requis: true, large: true },
        { k: "representant", label: "Représentant (si société, succession…)" },
        { k: "date_naissance", label: "Date de naissance", type: "date" },
        { k: "nationalite", label: "Nationalité" },
        { k: "profession", label: "Profession" },
        { k: "situation", label: "Situation de famille", type: "select", options: SITUATIONS },
        { k: "piece_type", label: "Pièce d'identité", type: "select", options: PIECES },
        { k: "piece_numero", label: "Numéro de la pièce (ou RCCM de la société)" },
        { k: "compte_contribuable", label: "Numéro de compte contribuable" },
      ] },
      { titre: "Vos coordonnées", champs: [
        { k: "telephone", label: "Téléphone", type: "tel", requis: true },
        { k: "whatsapp", label: "WhatsApp (si différent)", type: "tel" },
        { k: "email", label: "Adresse e-mail", type: "email" },
        { k: "adresse", label: "Domicile ou siège (commune, quartier)", large: true },
      ] },
      { titre: "Votre bien", champs: [
        { k: "bien_type", label: "Type de bien", type: "select", options: ["Villa", "Appartement", "Immeuble", "Studio(s)", "Magasin ou local commercial", "Bureau", "Terrain", "Autre"] },
        { k: "bien_situation", label: "Situation (commune, quartier, repère)", large: true },
        { k: "bien_lots", label: "Nombre de logements ou de locaux", type: "number" },
        { k: "bien_superficie", label: "Superficie du terrain (m²)", type: "number" },
        { k: "titre", label: "Titre de propriété détenu", type: "select", options: ["Arrêté de concession définitive (ACD)", "Titre foncier / certificat de propriété", "Certificat de mutation de propriété foncière", "Attestation villageoise", "Lettre d'attribution", "Acte notarié de vente", "Autre", "Je ne sais pas"] },
        { k: "reference_fonciere", label: "Références (lot, îlot, titre foncier)", aide: "Si vous les connaissez." },
        { k: "occupation", label: "Le bien est", type: "select", options: ["Libre", "Occupé par des locataires", "Occupé par le propriétaire", "En travaux"] },
      ] },
      { titre: "Votre projet", champs: [
        { k: "operation", label: "Vous souhaitez", type: "select", options: ["Confier la gestion locative", "Trouver un locataire", "Vendre le bien", "Un conseil"] },
        { k: "montant", label: "Loyer ou prix souhaité (FCFA)", type: "number" },
        { k: "reversement", label: "Mode de reversement préféré", type: "select", options: ["Virement bancaire", "Chèque", "Mobile money", "Espèces contre reçu"] },
        { k: "banque", label: "Banque ou opérateur", aide: "Le relevé d'identité bancaire sera remis à l'agence lors de la signature." },
      ] },
      { titre: "Personne à contacter en votre absence", champs: [
        { k: "contact_nom", label: "Nom et prénoms" },
        { k: "contact_tel", label: "Téléphone", type: "tel" },
        { k: "contact_lien", label: "Lien avec vous" },
      ] },
      { titre: "Précisions", champs: [
        { k: "observations", label: "Autres informations utiles", type: "textarea", large: true },
      ] },
    ],
  },
};

export const CONSENTEMENT = "J'accepte que l'Entreprise Kibegnon enregistre ces informations pour la gestion de mon dossier, conformément à la loi n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel. Je peux demander à les consulter, les corriger ou les faire supprimer auprès de l'agence.";

export const champsDe = (kind) => (FICHES[kind]?.sections || []).flatMap((s) => s.champs);

/* Contrôle d'une fiche avant envoi : champs requis, formats simples */
export function validerFiche(kind, d) {
  const err = {};
  champsDe(kind).forEach((c) => {
    const v = String(d[c.k] ?? "").trim();
    if (c.requis && !v) err[c.k] = "Ce renseignement est nécessaire.";
    else if (v && c.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) err[c.k] = "Adresse e-mail incomplète.";
    else if (v && c.type === "tel" && v.replace(/\D/g, "").length < 8) err[c.k] = "Numéro trop court.";
    else if (v && c.type === "number" && !(Number(v) >= 0)) err[c.k] = "Indiquez un nombre.";
  });
  if (d.consentement !== true) err.consentement = "Merci de cocher la case pour envoyer la fiche.";
  return err;
}
