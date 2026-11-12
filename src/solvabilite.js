/* ══════════════════════════════════════════════════════════════════════
   Étude de solvabilité d'un candidat locataire — calcul pur, sans effet de bord.
   Deux grilles : bail à usage d'habitation et bail à usage professionnel.
   La note (sur 100) additionne des critères objectifs et vérifiables :
   capacité à payer, stabilité des revenus, pièces fournies, passé locatif,
   garanties. Aucun critère personnel (origine, sexe, religion, état de santé,
   situation de famille…) n'entre dans la note.
   La note éclaire la décision ; elle ne la remplace pas.
   ══════════════════════════════════════════════════════════════════════ */
const n = (x) => { const v = Number(String(x ?? "").replace(/\s/g, "")); return Number.isFinite(v) ? v : 0; };
const paliers = (valeur, grille, defaut = 0) => { for (const [seuil, pts] of grille) if (valeur <= seuil) return pts; return defaut; };
const paliersMin = (valeur, grille, defaut = 0) => { for (const [seuil, pts] of grille) if (valeur >= seuil) return pts; return defaut; };
const pc = (x) => `${(Math.round(x * 1000) / 10).toLocaleString("fr-FR")} %`;
const esp = (t) => t.replace(new RegExp("[\\u202f\\u00a0]", "g"), " ");
const F = (x) => `${esp(Math.round(x).toLocaleString("fr-FR"))} F`;

export const STATUTS_PRO = {
  fonctionnaire: { label: "Fonctionnaire ou agent de l'État", points: 20 },
  cdi: { label: "Salarié en CDI", points: 20 },
  cdd: { label: "Salarié en CDD", points: 12 },
  retraite: { label: "Retraité (pension)", points: 18 },
  liberal: { label: "Profession libérale", points: 14 },
  independant: { label: "Commerçant ou indépendant déclaré", points: 12 },
  informel: { label: "Activité non déclarée", points: 5 },
  etudiant: { label: "Étudiant", points: 3 },
  sans_emploi: { label: "Sans emploi", points: 0 },
};
export const HISTORIQUES = {
  bon_payeur: { label: "Bon payeur attesté (quittances ou attestation du bailleur)", hab: 10, pro: 5 },
  aucun: { label: "Pas d'historique connu (première location)", hab: 6, pro: 3 },
  retards: { label: "Retards de paiement signalés", hab: 3, pro: 1 },
  impayes: { label: "Impayés ou expulsion", hab: 0, pro: 0 },
};
export const GARANTIES = {
  aucune: "Aucune garantie",
  garant: "Garant (caution solidaire d'une personne)",
  caution_bancaire: "Caution bancaire ou garantie d'un organisme",
  depot_renforce: "Dépôt de garantie renforcé (bail professionnel seulement)",
};
export const PIECES_HAB = {
  identite: "Pièce d'identité en cours de validité",
  revenus: "Trois derniers bulletins de salaire ou justificatifs de revenus",
  emploi: "Attestation de travail, contrat, ou registre de commerce",
  releves: "Relevés bancaires ou mobile money des trois derniers mois",
  quittances: "Dernières quittances ou attestation de bon payeur",
};
export const PIECES_PRO = {
  identite: ["Pièce d'identité du dirigeant", 2],
  etats: ["États financiers ou déclaration fiscale du dernier exercice", 3],
  releves: ["Relevés bancaires de l'activité (trois derniers mois)", 3],
  regularite: ["Attestation de régularité fiscale", 2],
};
export const VERDICTS = {
  favorable: { label: "Favorable", color: "#2F6B1A", bg: "#EAF6E3", conseil: "Le dossier peut être accepté aux conditions habituelles." },
  garanties: { label: "Favorable avec garanties", color: "#1F5C82", bg: "#EAF3FA", conseil: "Le dossier peut être accepté si les garanties indiquées sont obtenues avant la signature." },
  reserve: { label: "Réservé", color: "#8A6212", bg: "#FFF6E3", conseil: "Risque de retards de paiement : n'accepter qu'avec une garantie solide, ou proposer un loyer plus bas." },
  defavorable: { label: "Défavorable", color: "#B5171D", bg: "#FDECEC", conseil: "La capacité à payer régulièrement ce loyer n'est pas établie." },
};
const ORDRE = ["defavorable", "reserve", "garanties", "favorable"];
const plafonner = (v, max) => (ORDRE.indexOf(v) > ORDRE.indexOf(max) ? max : v);

export function evaluerSolvabilite(d = {}, { smig = 75000 } = {}) {
  const pro = d.usage === "professionnel";
  const loyer = n(d.loyer) + n(d.charges);
  const criteres = []; const alertes = []; const reco = [];
  const ajouter = (libelle, points, max, detail) => criteres.push({ libelle, points: Math.max(0, Math.min(max, Math.round(points))), max, detail });
  const pieces = d.pieces || {};
  const histo = HISTORIQUES[d.historique] || HISTORIQUES.aucun;
  let plafond = "favorable"; const chiffres = {};

  if (!pro) {
    /* ── Bail à usage d'habitation ── */
    const revenus = n(d.revenu) + n(d.autresRevenus) + n(d.revenuConjoint);
    const personnes = Math.max(1, n(d.personnes) || 1);
    const effort = revenus > 0 ? loyer / revenus : Infinity;
    const reste = revenus - loyer - n(d.engagements);
    const resteParTete = reste / personnes;
    Object.assign(chiffres, { revenus, effort, reste, resteParTete, loyerMax: Math.floor(revenus * 0.33 / 1000) * 1000 });
    ajouter("Poids du loyer dans les revenus", revenus > 0 ? paliers(effort, [[0.25, 35], [0.33, 28], [0.40, 18], [0.50, 8]], 0) : 0, 35,
      revenus > 0 ? `Loyer et charges : ${F(loyer)} pour ${F(revenus)} de revenus, soit ${pc(effort)} (repère : un tiers au plus).` : "Revenus non renseignés.");
    ajouter("Reste pour vivre après le loyer", revenus > 0 ? paliersMin(resteParTete, [[smig, 15], [smig * 0.66, 10], [smig * 0.4, 5]], 0) : 0, 15,
      revenus > 0 ? `${F(reste)} par mois après loyer et engagements, soit ${F(resteParTete)} par personne (${personnes} au foyer).` : "Revenus non renseignés.");
    const st = STATUTS_PRO[d.statut] || STATUTS_PRO.sans_emploi; let stab = st.points; const anc = n(d.ancienneteMois);
    let dStab = st.label;
    if (["cdi", "fonctionnaire"].includes(d.statut)) { if (d.essaiEnCours) { stab = 10; dStab += ", période d'essai en cours"; } else if (anc < 12) { stab = 15; dStab += ", moins d'un an d'ancienneté"; } }
    if (d.statut === "cdd") { const r = n(d.cddResteMois); stab = r >= 12 ? 14 : r >= 6 ? 12 : 7; dStab += r ? `, ${r} mois restants` : ", échéance non précisée"; }
    if (["independant", "liberal"].includes(d.statut)) { if (anc >= 36) stab += 3; else if (anc < 24) { stab = 7; dStab += ", moins de deux ans d'activité"; } }
    ajouter("Stabilité des revenus", stab, 20, `${dStab}.`);
    const nbP = Object.keys(PIECES_HAB).filter((k) => pieces[k]).length;
    ajouter("Pièces justificatives", nbP * 2, 10, `${nbP} pièce(s) sur ${Object.keys(PIECES_HAB).length} remise(s).`);
    ajouter("Passé locatif", histo.hab, 10, `${histo.label}.`);
    const rg = n(d.garantRevenu); let g = 0, dg = GARANTIES[d.garantie] || GARANTIES.aucune;
    if (d.garantie === "caution_bancaire") g = 10;
    else if (d.garantie === "garant") { g = rg >= loyer * 3 && loyer > 0 ? 10 : rg >= loyer * 2 && loyer > 0 ? 6 : 3; dg += rg ? `, revenus de ${F(rg)} (${rg >= loyer * 3 ? "au moins trois fois le loyer" : "moins de trois fois le loyer"})` : ", revenus non vérifiés"; }
    ajouter("Garanties", g, 10, `${dg}.`);

    if (!(revenus > 0)) { alertes.push("Les revenus ne sont pas renseignés : la capacité à payer ne peut pas être établie."); plafond = "defavorable"; }
    else {
      if (effort > 0.5) { alertes.push(`Le loyer absorbe ${pc(effort)} des revenus : au-delà de la moitié, le risque d'impayé est élevé.`); plafond = plafonner(plafond, "reserve"); }
      if (reste < 0) { alertes.push("Les revenus ne couvrent pas le loyer et les engagements déclarés."); plafond = "defavorable"; }
      if (effort > 0.33) reco.push(`Loyer conseillé pour ces revenus : ${F(chiffres.loyerMax)} au plus (un tiers des revenus).`);
    }
    if (d.historique === "impayes") { alertes.push("Antécédent d'impayés ou d'expulsion déclaré."); plafond = plafonner(plafond, "reserve"); }
    if (g < 10) reco.push("Demander un garant dont les revenus atteignent au moins trois fois le loyer, avec un acte de cautionnement solidaire écrit.");
    if (!pieces.revenus) reco.push("Obtenir les justificatifs de revenus des trois derniers mois avant toute signature.");
    reco.push("Privilégier un paiement par virement permanent ou mobile money à date fixe.");
    reco.push("Rappel légal : pour un bail d'habitation, l'avance ne peut dépasser deux mois de loyer et le dépôt de garantie deux mois de loyer (Code de la Construction et de l'Habitat, art. 415 et 416). Un risque plus élevé se couvre par un garant, pas par une caution plus forte.");
  } else {
    /* ── Bail à usage professionnel ── */
    const ca = n(d.ca); const poids = ca > 0 ? loyer / ca : Infinity;
    const excedent = ca - n(d.chargesExploitation) - n(d.engagements);
    const couverture = loyer > 0 ? excedent / loyer : 0;
    Object.assign(chiffres, { ca, poids, excedent, couverture, loyerMax: Math.floor(ca * 0.12 / 1000) * 1000 });
    ajouter("Poids du loyer dans le chiffre d'affaires", ca > 0 ? paliers(poids, [[0.08, 30], [0.12, 24], [0.18, 15], [0.25, 7]], 0) : 0, 30,
      ca > 0 ? `Loyer et charges : ${F(loyer)} pour ${F(ca)} de chiffre d'affaires mensuel, soit ${pc(poids)}.` : "Chiffre d'affaires non renseigné.");
    ajouter("Couverture du loyer par l'excédent d'exploitation", ca > 0 ? paliersMin(couverture, [[3, 20], [2, 15], [1.3, 8], [1, 3]], 0) : 0, 20,
      ca > 0 ? `Excédent mensuel avant loyer : ${F(excedent)}, soit ${(Math.round(couverture * 10) / 10).toLocaleString("fr-FR")} fois le loyer.` : "Chiffre d'affaires non renseigné.");
    const anc = n(d.ancienneteMois);
    ajouter("Ancienneté de l'activité", anc >= 36 ? 15 : anc >= 24 ? 12 : anc >= 12 ? 8 : anc >= 6 ? 4 : 2, 15, anc ? `${anc} mois d'activité.` : "Activité en création ou ancienneté non précisée.");
    ajouter("Existence légale", (d.rccm ? 5 : 0) + (d.dfe ? 5 : 0), 10, `Registre du commerce (RCCM) : ${d.rccm ? "oui" : "non"} · compte contribuable : ${d.dfe ? "oui" : "non"}.`);
    const ptsP = Object.entries(PIECES_PRO).reduce((t, [k, [, pts]]) => t + (pieces[k] ? pts : 0), 0);
    ajouter("Pièces justificatives", ptsP, 10, `${Object.keys(PIECES_PRO).filter((k) => pieces[k]).length} pièce(s) sur ${Object.keys(PIECES_PRO).length} remise(s).`);
    ajouter("Passé locatif", histo.pro, 5, `${histo.label}.`);
    const rg = n(d.garantRevenu); let g = 0, dg = GARANTIES[d.garantie] || GARANTIES.aucune;
    if (d.garantie === "caution_bancaire") g = 10;
    else if (d.garantie === "garant") { g = rg >= loyer * 3 && loyer > 0 ? 8 : 4; dg += rg ? `, revenus de ${F(rg)}` : ", revenus non vérifiés"; }
    else if (d.garantie === "depot_renforce") g = 6;
    ajouter("Garanties", g, 10, `${dg}.`);

    if (!(ca > 0)) { alertes.push("Le chiffre d'affaires n'est pas renseigné : la capacité à payer ne peut pas être établie."); plafond = "defavorable"; }
    else {
      if (poids > 0.25) { alertes.push(`Le loyer représente ${pc(poids)} du chiffre d'affaires : niveau difficile à tenir pour la plupart des activités.`); plafond = plafonner(plafond, "reserve"); }
      if (excedent < loyer) { alertes.push("L'excédent d'exploitation déclaré ne couvre pas le loyer."); plafond = "defavorable"; }
    }
    if (!d.rccm) { alertes.push("Activité non immatriculée au registre du commerce : le bail professionnel suppose un preneur identifié."); plafond = plafonner(plafond, "garanties"); }
    if (d.historique === "impayes") { alertes.push("Antécédent d'impayés ou d'expulsion déclaré."); plafond = plafonner(plafond, "reserve"); }
    if (g < 8) reco.push("Demander la caution personnelle et solidaire du dirigeant, ou une caution bancaire.");
    if (anc < 24) reco.push("Activité récente : prévoir un dépôt de garantie adapté et un suivi mensuel des paiements la première année.");
    reco.push("Insérer au bail une clause résolutoire pour défaut de paiement, conforme à l'Acte uniforme OHADA relatif au droit commercial général.");
  }

  const score = criteres.reduce((t, c) => t + c.points, 0);
  let verdict = score >= 75 ? "favorable" : score >= 60 ? "garanties" : score >= 45 ? "reserve" : "defavorable";
  verdict = plafonner(verdict, plafond);
  const incomplet = !pieces.identite || !(loyer > 0);
  if (!pieces.identite) alertes.unshift("Pièce d'identité non fournie : le dossier est incomplet, aucune signature possible.");
  if (!(loyer > 0)) alertes.unshift("Le loyer n'est pas renseigné.");
  return { usage: pro ? "professionnel" : "habitation", score, verdict, incomplet, criteres, alertes, recommandations: reco, loyer, chiffres };
}

/* Antécédents connus de l'agence : même nom ou même téléphone qu'un locataire actuel ou sorti */
const cle = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const tel = (s) => String(s || "").replace(/\D/g, "").slice(-8);
export function antecedentsAgence(candidat, telephone, { units = [], formerTenants = [], properties = [] } = {}) {
  const c = cle(candidat), t = tel(telephone); const out = [];
  if (c.length < 5 && t.length < 8) return out;
  const bien = (id) => properties.find((p) => p.id === id)?.name || "";
  units.filter((u) => (u.tenantName || "").trim()).forEach((u) => {
    if ((c.length >= 5 && cle(u.tenantName) === c) || (t.length === 8 && tel(u.tenantPhone) === t))
      out.push({ type: "actuel", texte: `Déjà locataire de l'agence : ${u.tenantName} — ${bien(u.propertyId)} ${u.label || ""}`.trim(), unitId: u.id });
  });
  formerTenants.forEach((f) => {
    const nom = f.name || ""; const ph = f.phone || "";
    if ((c.length >= 5 && cle(nom) === c) || (t.length === 8 && tel(ph) === t))
      out.push({ type: "ancien", texte: `Ancien locataire de l'agence : ${nom}${f.departureDate ? `, sorti le ${String(f.departureDate).slice(0, 10).split("-").reverse().join("/")}` : ""}${Number(f.balanceDue) > 0 ? ` — solde dû à la sortie : ${F(Number(f.balanceDue))}` : ""}` });
  });
  return out;
}
