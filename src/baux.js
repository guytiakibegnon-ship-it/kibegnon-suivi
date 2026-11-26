/* ============================================================================
 *  ENTREPRISE KIBEGNON · SUIVI D'ÉQUIPE — registre des baux (version 38)
 *  Règles de suivi d'un bail : échéance, renouvellement, enregistrement,
 *  révision du loyer, cohérence avec la fiche du lot. Sans interface : ces
 *  règles servent au registre, au dossier du locataire et aux tests.
 * ==========================================================================*/

export const USAGES = { habitation: "Bail à usage d'habitation", professionnel: "Bail à usage professionnel" };
export const STATUTS_BAIL = {
  projet:    { label: "En préparation", color: "#64748B" },
  en_cours:  { label: "En cours",       color: "#2F6B1A" },
  renouvele: { label: "Renouvelé",      color: "#1F5C82" },
  resilie:   { label: "Résilié",        color: "#94A3B8" },
  expire:    { label: "Terminé",        color: "#94A3B8" },
};
export const NIVEAUX_BAIL = {
  rouge:  { label: "Urgent",      color: "#B5171D", bg: "#FDECEC", ordre: 0 },
  orange: { label: "À préparer",  color: "#B7791F", bg: "#FFF8EC", ordre: 1 },
  info:   { label: "À noter",     color: "#1F5C82", bg: "#EFF6FF", ordre: 2 },
};

const iso = (d) => { const x = d instanceof Date ? d : new Date(`${String(d).slice(0, 10)}T00:00:00Z`); return x.toISOString().slice(0, 10); };
export const jourIso = (t = new Date()) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
export const fmtDate = (x) => (x ? String(x).slice(0, 10).split("-").reverse().join("/") : "—");
/* Jours entre deux dates (b - a) */
export const joursEntre = (a, b) => Math.round((Date.parse(`${String(b).slice(0, 10)}T00:00:00Z`) - Date.parse(`${String(a).slice(0, 10)}T00:00:00Z`)) / 86400000);
/* Ajoute des mois à une date, en restant au dernier jour du mois si besoin (31/01 + 1 mois → 28 ou 29/02) */
export function ajouterMois(date, n) {
  const [y, m, d] = String(date).slice(0, 10).split("-").map(Number);
  const cible = new Date(Date.UTC(y, m - 1 + Number(n || 0), 1));
  const dernier = new Date(Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0)).getUTCDate();
  cible.setUTCDate(Math.min(d, dernier));
  return iso(cible);
}
export const ajouterJours = (date, n) => iso(new Date(Date.parse(`${String(date).slice(0, 10)}T00:00:00Z`) + Number(n || 0) * 86400000));
/* Fin d'un bail : veille de l'anniversaire (du 01/03/2026 pour 12 mois → 28/02/2027) */
export const finDuBail = (debut, mois) => (debut && Number(mois) > 0 ? ajouterJours(ajouterMois(debut, mois), -1) : "");

export const bailActif = (b) => ["en_cours", "projet"].includes(b?.status);

/* Lieu d'enregistrement du bail (pratique de l'agence) : aux impôts pour un bail
   professionnel ou un bail d'habitation dont le loyer mensuel atteint
   500 000 F CFA ; à la mairie pour les autres baux d'habitation. */
export const SEUIL_IMPOTS = 500000;
export const LIEUX_ENREGISTREMENT = { impots: "aux impôts", mairie: "à la mairie" };
export const lieuEnregistrement = (b) => (b?.usage === "professionnel" || (Number(b?.rent) || 0) >= SEUIL_IMPOTS ? "impots" : "mairie");

/* Ligne de base → forme de l'application */
export const mBail = (r) => ({
  id: r.id, ref: r.ref || "", unitId: r.unit_id || "", propertyId: r.property_id || "", tenantName: r.tenant_name || "", tenantPhone: r.tenant_phone || "",
  tenantEmail: r.tenant_email || "", usage: r.usage || "habitation", signedOn: r.signed_on || "", startsOn: r.starts_on || "", durationMonths: Number(r.duration_months) || 0,
  endsOn: r.ends_on || "", tacitRenewal: r.tacit_renewal !== false, rent: Number(r.rent) || 0, depositMonths: Number(r.deposit_months) || 0,
  advanceMonths: Number(r.advance_months) || 0, registeredOn: r.registered_on || "", registrationRef: r.registration_ref || "",
  lastRevisionOn: r.last_revision_on || "", status: r.status || "en_cours", endedOn: r.ended_on || "", previousId: r.previous_id || "",
  notes: r.notes || "", createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at,
});
export const versBase = (f) => ({
  unit_id: f.unitId || null, property_id: f.propertyId || null, tenant_name: (f.tenantName || "").trim(), tenant_phone: (f.tenantPhone || "").trim(),
  tenant_email: (f.tenantEmail || "").trim().toLowerCase(), usage: f.usage || "habitation", signed_on: f.signedOn || null, starts_on: f.startsOn || null,
  duration_months: Math.max(0, Math.round(Number(f.durationMonths) || 0)), ends_on: f.endsOn || null, tacit_renewal: f.tacitRenewal !== false,
  rent: Math.max(0, Number(f.rent) || 0), deposit_months: Math.max(0, Number(f.depositMonths) || 0), advance_months: Math.max(0, Number(f.advanceMonths) || 0),
  registered_on: f.registeredOn || null, registration_ref: (f.registrationRef || "").trim(), last_revision_on: f.lastRevisionOn || null,
  status: f.status || "en_cours", ended_on: f.endedOn || null, previous_id: f.previousId || null, notes: f.notes || "",
});

/* Contrôle d'un bail avant enregistrement */
export function validerBail(f) {
  const e = [];
  if (!(f.tenantName || "").trim()) e.push("Indiquez le nom du locataire.");
  if (!f.startsOn) e.push("Indiquez la date de prise d'effet du bail.");
  if (f.endsOn && f.startsOn && f.endsOn < f.startsOn) e.push("La date de fin est antérieure à la prise d'effet.");
  if (!(Number(f.rent) > 0)) e.push("Indiquez le loyer mensuel.");
  if (f.usage === "habitation" && (Number(f.depositMonths) > 2 || Number(f.advanceMonths) > 2))
    e.push("Bail d'habitation : la caution et l'avance ne peuvent dépasser deux mois de loyer chacune (Code de la Construction et de l'Habitat, art. 415 et 416).");
  return e;
}

/* Alertes de suivi d'UN bail à une date donnée */
export function alertesBail(b, today = jourIso()) {
  const out = [];
  const push = (code, niveau, titre, detail) => out.push({ code, niveau, titre, detail, bailId: b.id, ref: b.ref, nom: b.tenantName });
  if (!bailActif(b)) return out;
  if (b.status === "projet") push("projet", "orange", "Bail en préparation, pas encore signé", "Faites-le signer avant l'entrée dans les lieux, puis passez-le « en cours ».");
  if (!b.endsOn) push("fin_inconnue", "orange", "Date de fin non renseignée", "Indiquez la durée ou la date de fin pour que l'échéance soit suivie.");
  else {
    const j = joursEntre(today, b.endsOn);
    if (j < 0) push("echu", "rouge", `Bail échu depuis le ${fmtDate(b.endsOn)}`,
      b.tacitRenewal ? "Reconduit tacitement faute de congé : enregistrez le renouvellement (nouveau bail) ou la fin du bail pour tenir le dossier à jour."
        : "Renouvelez-le ou constatez la fin du bail et le départ du locataire.");
    else if (j <= 30) push("fin_30", "rouge", `Fin du bail dans ${j} jour(s), le ${fmtDate(b.endsOn)}`, "Décidez du renouvellement avec le propriétaire et prévenez le locataire.");
    else if (j <= 90) push("fin_90", "orange", `Fin du bail le ${fmtDate(b.endsOn)} (dans ${j} jours)`, "Préparez le renouvellement : accord du propriétaire, loyer, nouveau contrat.");
    /* Bail professionnel (OHADA) : le preneur demande le renouvellement au plus tard trois mois avant l'échéance */
    if (b.usage === "professionnel" && j >= 0 && j <= 180)
      push("pro_renouvellement", j <= 90 ? "rouge" : "orange", "Bail professionnel : renouvellement à demander",
        `Le preneur qui veut le renouvellement doit le demander au plus tard trois mois avant l'échéance, soit avant le ${fmtDate(ajouterMois(b.endsOn, -3))} (Acte uniforme OHADA relatif au droit commercial général, art. 124).`);
  }
  if (!b.signedOn) push("non_signe", b.status === "projet" ? "info" : "orange", "Date de signature non renseignée", "Indiquez la date de signature du contrat.");
  if (!b.registeredOn && b.status === "en_cours") {
    const lieu = lieuEnregistrement(b);
    push("non_enregistre", "orange", `Enregistrement ${LIEUX_ENREGISTREMENT[lieu]} non renseigné`,
      lieu === "impots"
        ? `${b.usage === "professionnel" ? "Bail professionnel" : `Bail d'habitation à ${SEUIL_IMPOTS.toLocaleString("fr-FR")} F CFA de loyer ou plus`} : indiquez la date et la référence de son enregistrement aux impôts.`
        : `Bail d'habitation à moins de ${SEUIL_IMPOTS.toLocaleString("fr-FR")} F CFA de loyer : indiquez la date et la référence de son enregistrement à la mairie.`);
  }
  /* Habitation : loyer révisable tous les trois ans, avec un préavis de trois mois (CCH, art. 423 et 424) */
  if (b.usage === "habitation" && b.startsOn) {
    const depuis = b.lastRevisionOn || b.startsOn;
    const echeance = ajouterMois(depuis, 36);
    const j = joursEntre(today, echeance);
    if (j <= 90) push("revision", "info", j <= 0 ? "Révision du loyer possible" : `Révision du loyer possible à partir du ${fmtDate(echeance)}`,
      "Le loyer d'habitation ne peut être révisé que tous les trois ans, avec un préavis de trois mois (Code de la Construction et de l'Habitat, art. 423 et 424).");
  }
  return out;
}

/* Suivi de l'ensemble : alertes de chaque bail et cohérence avec les lots */
export function suiviBaux({ baux = [], units = [], properties = [], today = jourIso() }) {
  const out = [];
  const propName = (id) => properties.find((p) => p.id === id)?.name || "";
  const actifs = baux.filter(bailActif);
  baux.forEach((b) => alertesBail(b, today).forEach((a) => out.push({ ...a, unitId: b.unitId, propertyId: b.propertyId, bien: propName(b.propertyId) })));
  const norm = (x) => String(x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  units.forEach((u) => {
    const occupe = (u.tenantName || "").trim() && u.status !== "vacant";
    const duLot = actifs.filter((b) => b.unitId === u.id);
    if (occupe && !duLot.length)
      out.push({ code: "sans_bail", niveau: "rouge", titre: `${u.tenantName} (${u.label}) : aucun bail enregistré`, detail: "Locataire en place sans bail dans le registre : créez son bail pour suivre son dossier.",
        unitId: u.id, propertyId: u.propertyId, bien: propName(u.propertyId), nom: u.tenantName });
    if (duLot.length > 1)
      out.push({ code: "deux_baux", niveau: "rouge", titre: `${u.label} : ${duLot.length} baux en cours`, detail: `${duLot.map((b) => b.ref).join(", ")} : un seul bail peut être en cours sur un lot. Clôturez l'ancien.`,
        unitId: u.id, propertyId: u.propertyId, bien: propName(u.propertyId), nom: u.tenantName });
    duLot.forEach((b) => {
      if (occupe && norm(b.tenantName) !== norm(u.tenantName))
        out.push({ code: "nom_different", niveau: "orange", titre: `${b.ref} : locataire différent de la fiche du lot`, detail: `« ${b.tenantName} » au bail, « ${u.tenantName} » sur la fiche du lot ${u.label}.`,
          bailId: b.id, ref: b.ref, unitId: u.id, propertyId: u.propertyId, bien: propName(u.propertyId), nom: b.tenantName });
      if (!occupe)
        out.push({ code: "lot_vacant", niveau: "orange", titre: `${b.ref} en cours sur un lot vacant`, detail: `Le lot ${u.label} est vacant : constatez la fin du bail de ${b.tenantName}.`,
          bailId: b.id, ref: b.ref, unitId: u.id, propertyId: u.propertyId, bien: propName(u.propertyId), nom: b.tenantName });
      if (Number(u.rent) > 0 && Math.abs(Number(u.rent) - b.rent) > 0.5)
        out.push({ code: "loyer_different", niveau: "info", titre: `${b.ref} : loyer différent de la fiche du lot`, detail: `${b.rent.toLocaleString("fr-FR")} F CFA au bail, ${Number(u.rent).toLocaleString("fr-FR")} F CFA sur la fiche (révision à reporter ?).`,
          bailId: b.id, ref: b.ref, unitId: u.id, propertyId: u.propertyId, bien: propName(u.propertyId), nom: b.tenantName });
    });
  });
  return out.sort((a, b) => NIVEAUX_BAIL[a.niveau].ordre - NIVEAUX_BAIL[b.niveau].ordre || (a.bien || "").localeCompare(b.bien || ""));
}

/* Bail proposé pour un lot occupé qui n'en a pas encore (reprise de l'existant) */
export function bailDepuisLot(u) {
  const debut = u.leaseStart ? String(u.leaseStart).slice(0, 10) : "";
  const fin = u.leaseEnd ? String(u.leaseEnd).slice(0, 10) : "";
  return {
    unitId: u.id, propertyId: u.propertyId, tenantName: u.tenantName || "", tenantPhone: u.tenantPhone || "", tenantEmail: u.tenantEmail || "",
    usage: ["bureau", "magasin", "local_commercial", "commerce", "entrepot"].includes(u.kind) ? "professionnel" : "habitation",
    startsOn: debut, durationMonths: debut && fin ? Math.max(1, Math.round(joursEntre(debut, ajouterJours(fin, 1)) / 30.4375)) : 12, endsOn: fin,
    tacitRenewal: true, rent: Number(u.rent) || 0, depositMonths: u.deposit && Number(u.rent) ? Math.round((Number(u.deposit) / Number(u.rent)) * 10) / 10 : 2,
    advanceMonths: Number(u.advanceMonths) || 2, status: "en_cours", notes: "Bail repris de la fiche du lot : vérifiez les dates et complétez la signature et l'enregistrement.",
  };
}

/* Renouvellement : nouveau bail qui commence le lendemain de la fin du précédent */
export function bailRenouvele(b, { rent, durationMonths } = {}) {
  const debut = b.endsOn ? ajouterJours(b.endsOn, 1) : jourIso();
  const mois = Number(durationMonths || b.durationMonths || 12);
  return {
    unitId: b.unitId, propertyId: b.propertyId, tenantName: b.tenantName, tenantPhone: b.tenantPhone, tenantEmail: b.tenantEmail, usage: b.usage,
    startsOn: debut, durationMonths: mois, endsOn: finDuBail(debut, mois), tacitRenewal: b.tacitRenewal, rent: Number(rent ?? b.rent) || 0,
    depositMonths: b.depositMonths, advanceMonths: b.advanceMonths, lastRevisionOn: Number(rent ?? b.rent) !== b.rent ? debut : b.lastRevisionOn,
    status: "projet", previousId: b.id, notes: `Renouvellement du bail ${b.ref}.`,
  };
}
