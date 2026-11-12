/* ══════════════════════════════════════════════════════════════════════
   Mandats de l'agence — modèles pré-remplis (droit ivoirien)
   · mandat de gestion locative
   · mandat de vente exclusif
   · mandat de vente non exclusif (simple)
   Références : loi n° 2019-576 du 26 juin 2019 instituant le Code de la
   Construction et de l'Habitat (CCH) — art. 467 à 471 (agence immobilière,
   mandat écrit, compte dédié, reçus), 481 à 491 (honoraires), 415, 416, 423,
   424, 440 (bail d'habitation), 513 à 518 (diagnostics) ; Code civil (mandat).
   Le texte produit reste modifiable avant impression. Un renseignement non
   saisi apparaît en pointillés, à compléter à la main.

   Balisage du texte : « # » titre, « ## » article, « - » énumération,
   « > » ligne centrée, « @@signatures A | B » bloc de signatures.
   ══════════════════════════════════════════════════════════════════════ */
export const MANDATS = {
  gestion: { label: "Mandat de gestion locative", court: "Gestion", titre: "MANDAT DE GESTION IMMOBILIÈRE" },
  vente_exclusif: { label: "Mandat de vente exclusif", court: "Vente — exclusif", titre: "MANDAT EXCLUSIF DE VENTE" },
  vente_simple: { label: "Mandat de vente non exclusif", court: "Vente — non exclusif", titre: "MANDAT SIMPLE DE VENTE (NON EXCLUSIF)" },
};
export const AGENCE_REPRESENTANT = "Madame OUATTARA TIÉMONGOH Ténin épouse ATCHADÉ, Gérante";

export const defautsMandat = (kind) => ({
  civilite: "Monsieur", agenceRepresentant: AGENCE_REPRESENTANT, lieu: "Abidjan", exemplaires: 2,
  ...(kind === "gestion"
    ? { duree: 2, dureeFerme: 1, preavis: 6, honoraires: 8, honorairesBase: "TTC", forfaitDeclaration: 50000, delaiDevis: 8, plafondUrgence: "", jourReversement: 10, periodicite: "mensuellement", tauxFoncier: 12, modeReversement: "virement bancaire" }
    : { duree: kind === "vente_exclusif" ? 3 : 6, preavis: kind === "vente_exclusif" ? 15 : 30, honoraires: 5, fai: true, suiteMois: 12 }),
});

const P = (n = 24) => "…".repeat(n);
const v = (x, n = 24) => (x === undefined || x === null || String(x).trim() === "" ? P(n) : String(x).trim());
const nb = (x) => Number(String(x ?? "").replace(/\s/g, "")) || 0;
const F = (x) => nb(x).toLocaleString("fr-FR").replace(new RegExp("[\\u202f\\u00a0]", "g"), " ");
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const dateLongue = (iso) => { if (!iso) return ""; const [y, m, j] = String(iso).slice(0, 10).split("-").map(Number); return `${j === 1 ? "1er" : j} ${MOIS[m - 1]} ${y}`; };
const CHIFFRES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf", "vingt", "vingt et un", "vingt-deux", "vingt-trois", "vingt-quatre"];
const enToutes = (x) => { const k = nb(x); return Number.isInteger(k) && k >= 0 && k < CHIFFRES.length ? `${CHIFFRES[k]} (${String(k).padStart(2, "0")})` : String(x); };

/* Désignation du mandant, selon qu'il s'agit d'une personne ou d'une société */
function mandant(d) {
  const feminin = /madame|mademoiselle/i.test(d.civilite || "");
  const societe = /soci|succession|indivision|association/i.test(d.civilite || "");
  const nom = `${societe ? "" : `${d.civilite || "Monsieur"} `}${v(d.nom, 30)}`;
  const ne = feminin ? "née" : "né";
  const id = societe
    ? `${nom}${d.forme ? `, ${d.forme}` : ""}, dont le siège est situé à ${v(d.domicile)}, immatriculée sous le numéro ${v(d.pieceNumero)}, représentée par ${v(d.representant)}, dûment habilité(e) à cet effet`
    : `${nom}, ${ne} le ${d.naissanceDate ? dateLongue(d.naissanceDate) : P(14)} à ${v(d.naissanceLieu, 16)}, de nationalité ${v(d.nationalite, 14)}, ${v(d.profession, 16)}, ${v(d.situation, 14)}, titulaire de la pièce d'identité suivante : ${d.pieceType ? d.pieceType.toLowerCase() : "…………"} n° ${v(d.pieceNumero, 16)}${d.pieceDelivree ? ` délivrée le ${dateLongue(d.pieceDelivree)}` : ""}${d.pieceValide ? ` et valable jusqu'au ${dateLongue(d.pieceValide)}` : ""}, ${feminin ? "domiciliée" : "domicilié"} à ${v(d.domicile)}`;
  const contact = `joignable au ${v(d.telephone, 16)}${d.email ? `, adresse électronique : ${d.email}` : ""}${d.compteContribuable ? `, compte contribuable n° ${d.compteContribuable}` : ""}`;
  return { feminin: feminin && !societe, texte: `${id}, ${contact}.`, signature: nom };
}
const agence = (d, A) => `L'${A.name === "ENTREPRISE KIBEGNON" ? "ENTREPRISE KIBEGNON" : A.name}, ${A.form}, agence immobilière agréée (${A.agrement.replace(/^N° agrément : /, "agrément n° ")}), immatriculée au registre du commerce sous le numéro ${A.rc.replace(/^RC : /, "")}, dont le siège social est situé à ${A.address.replace(" — ", ", ")}, membre de la Chambre du Droit des Affaires et de l'Immobilier (agent immobilier agréé n° AG-0456), représentée par ${v(d.agenceRepresentant)}, dûment habilitée, agissant en qualité d'administrateur de biens au sens de l'article 467 du Code de la Construction et de l'Habitat.`;

function designation(d) {
  return [
    `- Nature : ${v(d.bienNature, 30)} ;`,
    `- Situation : ${v(d.bienSituation, 40)} ;`,
    `- Références foncières (lot, îlot, titre foncier) : ${v(d.bienReference, 30)} ;`,
    `- Superficie : ${d.bienSuperficie ? `${F(d.bienSuperficie)} m²` : `${P(10)} m²`} ;`,
    `- Titre de propriété : ${v(d.bienTitre, 30)}.`,
  ].join("\n");
}
const fin = (d, m, A) => [
  `Fait à ${v(d.lieu, 12)}, le ${d.dateSignature ? dateLongue(d.dateSignature) : P(20)}, en ${enToutes(d.exemplaires || 2)} exemplaires originaux, dont un remis à chacune des Parties.`,
  "",
  `@@signatures ${m.feminin ? "LA MANDANTE" : "LE MANDANT"}\\n${m.signature}\\n(Signature précédée de la mention manuscrite « Lu et approuvé, bon pour mandat ») | LE MANDATAIRE\\n${A.name}\\n${v(d.agenceRepresentant)}\\n(Signature et cachet)`,
].join("\n");

/* ───────────────────────── Mandat de gestion ───────────────────────── */
function gestion(d, A, lettres) {
  const m = mandant(d); const M = m.feminin ? "la Mandante" : "le Mandant"; const Mm = m.feminin ? "La Mandante" : "Le Mandant";
  const lots = (d.lots || "").trim() ? d.lots.trim().split("\n").filter((l) => l.trim()).map((l, i, a) => `- ${l.trim().replace(/\s*[;.]$/, "")}${i === a.length - 1 ? "." : " ;"}`).join("\n") : `- ${P(60)} ;\n- ${P(60)}.`;
  return [
    `# ${MANDATS.gestion.titre}`,
    "> Établi en application de l'article 469 de la loi n° 2019-576 du 26 juin 2019 instituant le Code de la Construction et de l'Habitat et des règles du Code civil relatives au mandat.",
    "", "ENTRE LES SOUSSIGNÉS :", "",
    `${m.feminin ? "LA MANDANTE" : "LE MANDANT"} (le « Propriétaire ») : ${m.texte}`, "", "> D'UNE PART,", "", "ET :", "",
    `LE MANDATAIRE (l'« Agence ») : ${agence(d, A)}`, "", "> D'AUTRE PART,", "",
    "IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :", "",
    "## ARTICLE 1 – OBJET DU MANDAT",
    `${Mm} confie à l'Agence, qui l'accepte, le mandat exclusif de louer, gérer et administrer les biens immobiliers désignés à l'article 2. Pendant la durée du mandat, ${M} s'interdit de confier la gestion ou la location de ces biens à un tiers.`,
    "", "## ARTICLE 2 – DÉSIGNATION DES BIENS", designation(d), "",
    "Locaux confiés en gestion :", lots, "",
    `${Mm} déclare être propriétaire de ces biens en vertu d'un titre régulier, dont une copie est remise à l'Agence, et qu'aucune saisie, hypothèque ou procédure n'en empêche la location.`,
    "", "## ARTICLE 3 – DURÉE",
    `Le mandat est consenti pour une durée de ${enToutes(d.duree)} an(s) à compter de sa signature. Il se renouvelle par tacite reconduction pour des périodes de même durée. Il ne peut être rompu avant la fin de la première période de ${enToutes(d.dureeFerme)} an(s). Passé ce délai, chaque Partie peut y mettre fin à tout moment, moyennant un préavis de ${enToutes(d.preavis)} mois notifié par lettre remise contre décharge ou par acte extrajudiciaire.`,
    "", "## ARTICLE 4 – POUVOIRS ET MISSIONS DE L'AGENCE",
    "L'Agence agit au nom et dans l'intérêt du Propriétaire. Elle a pouvoir de :",
    "- rechercher les locataires, faire visiter les locaux et vérifier la solvabilité des candidats ;",
    "- conclure, renouveler et résilier les baux, donner et recevoir congé, faire dresser les états des lieux ;",
    "- encaisser les loyers, charges, avances et dépôts de garantie, en délivrer quittance ou reçu ;",
    "- relancer et mettre en demeure les locataires en retard, et recouvrer les loyers impayés ;",
    "- réviser les loyers dans le respect du bail et de la loi ;",
    "- faire exécuter les réparations dans les conditions de l'article 8 ;",
    "- représenter le Propriétaire auprès des administrations, des concessionnaires d'eau et d'électricité et du syndic.",
    "L'Agence conseille le Propriétaire sur le montant du loyer, les risques et la réglementation applicable. Les actes de disposition (vente, hypothèque) sont exclus du présent mandat.",
    "", "## ARTICLE 5 – ENCAISSEMENT DES SOMMES",
    "Conformément à l'article 469 du Code de la Construction et de l'Habitat, le Propriétaire autorise expressément l'Agence à recevoir pour son compte toutes les sommes dues par les locataires. Ces sommes sont encaissées sur le compte bancaire ouvert au nom de l'Agence et réservé à ses opérations (article 470). Tout paiement donne lieu à la délivrance immédiate d'un reçu ; au-delà de cinq cent mille (500 000) francs CFA, il est fait par chèque ou par virement bancaire (article 471).",
    "", "## ARTICLE 6 – RÉMUNÉRATION",
    "En contrepartie de sa gestion, l'Agence perçoit :",
    `- ${v(d.honoraires, 4)} % ${d.honorairesBase || "TTC"} des loyers et charges encaissés, prélevés sur chaque relevé de gestion ;`,
    `- ${nb(d.forfaitDeclaration) ? `${F(d.forfaitDeclaration)} francs CFA TTC` : `${P(12)} francs CFA TTC`} pour l'établissement de chaque déclaration foncière annuelle, lorsque l'Agence en est chargée.`,
    "Les honoraires de location et de rédaction de bail sont à la charge des locataires, selon les usages et les textes en vigueur. Les frais avancés par l'Agence pour le compte du Propriétaire lui sont remboursés sur justificatifs.",
    "", "## ARTICLE 7 – REDDITION DES COMPTES ET REVERSEMENT",
    `L'Agence rend compte de sa gestion ${v(d.periodicite, 14)} par un état détaillé des sommes encaissées et dépensées, accompagné des justificatifs. Les loyers encaissés, déduction faite des honoraires, des dépenses et des retenues légales, sont reversés au Propriétaire au plus tard le ${v(d.jourReversement, 3)} de chaque mois, par ${v(d.modeReversement, 16)}.`,
    "", "## ARTICLE 8 – TRAVAUX ET DEVIS",
    `L'Agence informe le Propriétaire des réparations à sa charge et lui soumet les devis. Le Propriétaire donne ou refuse son accord dans un délai de ${enToutes(d.delaiDevis)} jours ; passé ce délai, il est réputé avoir accepté et l'Agence fait exécuter les travaux à ses frais. Les réparations urgentes (rupture de canalisation, court-circuit, danger pour les occupants) peuvent être engagées sans attendre${nb(d.plafondUrgence) ? `, dans la limite de ${F(d.plafondUrgence)} francs CFA par intervention` : ""}, si le Propriétaire est injoignable ; l'Agence l'en informe aussitôt.`,
    "", "## ARTICLE 9 – DÉPÔT DE GARANTIE",
    "L'Agence détient le dépôt de garantie versé par chaque locataire et le restitue dans les délais et conditions du bail. Pour les baux d'habitation, il ne peut dépasser deux mois de loyer, de même que l'avance (articles 415 et 416 du Code de la Construction et de l'Habitat). À la fin du mandat, les dépôts sont remis à l'agence qui reprend la gestion ou, à défaut, au Propriétaire, qui en devient redevable envers les locataires.",
    "", "## ARTICLE 10 – OBLIGATIONS DU PROPRIÉTAIRE",
    "Le Propriétaire s'engage à :",
    "- remettre à l'Agence les titres, plans, baux en cours et tout document utile à la gestion ;",
    "- ne pas traiter directement avec les locataires sans la présence de l'Agence ;",
    "- assurer les biens et en justifier à première demande ;",
    "- payer les honoraires convenus et rembourser les frais engagés pour son compte ;",
    "- respecter les engagements pris en son nom par l'Agence dans la limite du présent mandat ;",
    "- informer l'Agence de tout fait touchant aux biens (vente, succession, litige, travaux).",
    "", "## ARTICLE 11 – IMPAYÉS ET PROCÉDURES",
    "L'Agence est tenue d'une obligation de moyens. Elle n'est pas responsable du non-paiement des loyers lorsqu'elle a accompli les diligences utiles, notamment les relances et la mise en demeure. Lorsque les démarches amiables ont échoué, le Propriétaire, informé par l'Agence, fait engager la procédure de recouvrement ou d'expulsion par un professionnel du droit ; les frais de procédure sont à sa charge.",
    "", "## ARTICLE 12 – REPRISE DU BIEN ET RÉVISION DU LOYER",
    "Le Propriétaire qui souhaite reprendre un local ou réviser un loyer en informe l'Agence par écrit, en indiquant son motif. Pour les baux d'habitation, la reprise suppose un congé donné au moins trois mois à l'avance (article 440) et le loyer ne peut être révisé que tous les trois ans, avec un préavis de trois mois (articles 423 et 424). Pour les baux professionnels, la révision suit le bail et l'Acte uniforme OHADA relatif au droit commercial général.",
    "", "## ARTICLE 13 – ENTRETIEN ET GARDIENNAGE",
    "Avec l'accord du Propriétaire, l'Agence peut recruter le personnel d'entretien et de gardiennage de l'immeuble, fixer et payer sa rémunération pour le compte du Propriétaire, qui en demeure l'employeur, le remplacer ou mettre fin à son engagement.",
    "", "## ARTICLE 14 – IMPÔT FONCIER",
    `L'Agence retient sur les loyers encaissés et reverse à l'administration fiscale, pour le compte du Propriétaire, l'impôt foncier au taux en vigueur (${v(d.tauxFoncier, 3)} % des loyers à la date des présentes), conformément au Code général des impôts. Elle en remet les quittances au Propriétaire.`,
    "", "## ARTICLE 15 – RESPONSABILITÉ",
    "L'Agence répond des fautes commises dans l'exécution de sa mission (négligence, erreur, omission ou retard). Les surcoûts qui en résultent sont à sa charge.",
    "", "## ARTICLE 16 – FIN DU MANDAT",
    "Le mandat prend fin à son terme en cas de dénonciation, par la vente des biens, ou par résiliation pour manquement grave de l'une des Parties, trente jours après une mise en demeure restée sans effet. L'Agence remet alors au Propriétaire les comptes arrêtés, les baux, les dépôts de garantie et les documents en sa possession.",
    "", "## ARTICLE 17 – DONNÉES PERSONNELLES",
    "Les données personnelles recueillies pour l'exécution du mandat sont traitées conformément à la loi n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel. Elles ne servent qu'à la gestion des biens.",
    "", "## ARTICLE 18 – LITIGES ET ÉLECTION DE DOMICILE",
    "Le présent mandat est soumis au droit ivoirien. À défaut d'accord amiable dans un délai de trente jours, tout différend est porté devant les juridictions compétentes d'Abidjan. Les Parties élisent domicile aux adresses indiquées en tête des présentes.",
    "", fin(d, m, A),
  ].join("\n");
}

/* ───────────────────────── Mandats de vente ───────────────────────── */
function vente(kind, d, A, lettres) {
  const exclusif = kind === "vente_exclusif";
  const m = mandant(d); const M = m.feminin ? "la Mandante" : "le Mandant"; const Mm = m.feminin ? "La Mandante" : "Le Mandant";
  const prix = nb(d.prix); const taux = nb(d.honoraires); const hon = Math.round(prix * taux / 100);
  const txtPrix = prix ? `${F(prix)} francs CFA${lettres ? ` (${lettres(prix).replace(/ francs? CFA$/i, "")} francs CFA)` : ""}` : `${P(20)} francs CFA`;
  const articles = [
    ["OBJET DU MANDAT", `${Mm} confie au Mandataire, qui l'accepte, un mandat ${exclusif ? "exclusif" : "simple, non exclusif,"} de vente portant sur le bien désigné à l'article 2 (le « Bien »), conformément à l'article 469 du Code de la Construction et de l'Habitat, qui impose à l'agence immobilière de détenir un mandat écrit précisant l'étendue de ses pouvoirs, son autorisation à recevoir des sommes et le montant de sa rémunération.`],
    ["DÉSIGNATION DU BIEN", `${designation(d)}\n\nOrigine de propriété : ${v(d.bienOrigine, 36)}\n\n${Mm} déclare être ${d.indivision ? "propriétaire indivis du Bien et agir avec l'accord écrit de tous les indivisaires, annexé aux présentes" : m.feminin ? "seule et pleine propriétaire du Bien" : "seul et plein propriétaire du Bien"}, ${v(d.bienOccupation || "libre de toute occupation", 20)}, et qu'aucune hypothèque, saisie ou inscription n'en empêche la vente${d.bienCharges ? `, sous la réserve suivante : ${d.bienCharges}` : ""}. Tant que le titre de propriété n'a pas été remis et vérifié, le Mandataire peut diffuser le Bien et organiser des visites, mais ne reçoit aucun acompte et ne fait signer aucun avant-contrat.`],
    ["PRIX DE VENTE", `Le Bien est proposé à la vente au prix de ${txtPrix}${d.fai === false ? ", honoraires de l'agence en sus" : ", frais d'agence inclus"}. Toute modification du prix fait l'objet d'un avenant écrit signé des Parties.`],
    ["POUVOIRS DU MANDATAIRE", `Le présent mandat, exprès et spécial, donne au Mandataire le pouvoir de :\n- rechercher et présenter des acquéreurs ;\n- faire visiter le Bien ;\n- en assurer la publicité par tout moyen approprié (annonces, portails immobiliers, panneaux, réseaux professionnels) ;\n- négocier les conditions de la vente dans la limite du prix fixé à l'article 3, sauf instruction écrite contraire ;\n- recueillir les offres d'achat et les soumettre à ${M} ;\n- préparer l'avant-contrat et assister ${M} jusqu'à la signature de l'acte de vente.\nLe Mandataire ne peut signer l'acte de vente au nom de ${M} sans une procuration notariée distincte.`],
    ["AUTORISATION DE PERCEVOIR DES SOMMES", `${Mm} autorise expressément le Mandataire à recevoir pour son compte les sommes versées par un acquéreur à titre d'acompte ou de dépôt de garantie (article 469). Ces sommes sont encaissées sur le compte bancaire ouvert au nom du Mandataire et réservé à ses opérations (article 470). Tout paiement donne lieu à la délivrance immédiate d'un reçu ; au-delà de cinq cent mille (500 000) francs CFA, il est fait par chèque ou par virement bancaire (article 471).`],
    ["RÉMUNÉRATION DU MANDATAIRE", `Le Mandataire perçoit des honoraires de ${v(d.honoraires, 3)} % hors taxes du prix de vente${prix && taux ? `, soit ${F(hon)} francs CFA hors taxes sur la base du prix de l'article 3` : ""}${d.fai === false ? ", à la charge de l'acquéreur" : `, compris dans le prix${prix && taux ? ` ; la somme revenant à ${M} s'établit ainsi à ${F(prix - hon)} francs CFA avant taxes sur honoraires, débours et impôts dus au titre de la cession` : ""}`}.\n\nLa rémunération est acquise à la signature de la vente et exigible dans les trois jours qui suivent l'encaissement (article 491). Elle est prélevée sur le prix lors de la répartition des fonds, sur présentation d'une note d'honoraires. Aucun honoraire n'est dû pour une affaire rendue nulle ou inutile par la faute du Mandataire (article 489). Lorsque deux agences interviennent dans la même affaire, les honoraires ne sont pas augmentés et se partagent par moitié (article 486).`],
    ["DURÉE DU MANDAT", exclusif
      ? `Le mandat est consenti pour une durée ferme de ${enToutes(d.duree)} mois à compter de sa signature. À l'issue de cette période, il se poursuit par tacite reconduction pour des périodes d'un mois, chaque Partie pouvant alors y mettre fin à tout moment, moyennant un préavis de ${enToutes(d.preavis)} jours notifié par lettre remise contre décharge ou par acte extrajudiciaire.`
      : `Le mandat est consenti pour une durée de ${enToutes(d.duree)} mois à compter de sa signature. Il se renouvelle par tacite reconduction pour des périodes de même durée, sauf dénonciation notifiée par lettre remise contre décharge ou par acte extrajudiciaire au moins ${enToutes(d.preavis)} jours avant l'échéance.`],
    exclusif
      ? ["EXCLUSIVITÉ", `Pendant la durée du mandat, ${M} s'interdit de vendre le Bien par ${m.feminin ? "elle" : "lui"}-même ou par un autre intermédiaire, et dirige vers le Mandataire toute personne intéressée. En contrepartie, le Mandataire s'engage à mettre en œuvre un plan de commercialisation renforcé et à rendre compte de ses démarches au moins une fois par mois.\n\nSi le Bien est vendu pendant le mandat sans le concours du Mandataire, ${M} lui verse, à titre de clause pénale, une indemnité égale aux honoraires prévus à l'article 6.`]
      : ["NON-EXCLUSIVITÉ", `${Mm} conserve la faculté de confier la vente à d'autres agences et de vendre ${m.feminin ? "elle" : "lui"}-même le Bien. ${m.feminin ? "Elle" : "Il"} informe le Mandataire par écrit, sans délai, de tout autre mandat consenti et de toute vente conclue. Les honoraires ne sont dus au Mandataire que si la vente est conclue avec un acquéreur qu'il a présenté ou fait visiter pendant la durée du mandat.`],
    [`OBLIGATIONS ${m.feminin ? "DE LA MANDANTE" : "DU MANDANT"}`, `${Mm} s'engage à :\n- remettre au Mandataire les documents nécessaires à la vente : titre de propriété, état foncier récent, plan, pièce d'identité, justificatifs de situation matrimoniale ou successorale, quitus d'impôt foncier et de charges, et les éléments utiles aux diagnostics techniques prévus aux articles 513 à 518 du Code de la Construction et de l'Habitat ;\n- garantir l'exactitude des informations transmises ;\n- signaler sans délai tout changement touchant le Bien ou sa situation juridique ;\n- laisser visiter le Bien aux heures convenues ;\n- ne pas traiter directement avec un acquéreur présenté par le Mandataire sans l'en informer.`],
    ["OBLIGATIONS DU MANDATAIRE", `Le Mandataire s'engage à :\n- mettre en œuvre les moyens utiles à la recherche d'un acquéreur ;\n- faire figurer sur ses documents et correspondances le numéro et la date de son agrément ainsi que le nom de son administrateur de biens (article 468) ;\n- rendre compte régulièrement des visites effectuées et des offres reçues ;\n- agir avec diligence et loyauté, dans l'intérêt de ${M} ;\n- restituer en fin de mandat les documents remis.`],
    ["ACTE DE VENTE", `La vente est constatée par acte authentique dressé par un notaire, seul habilité à accomplir les formalités de mutation, d'enregistrement et de publicité foncière. Le Mandataire assiste ${M} dans la préparation de cet acte, sans se substituer au notaire. Les frais d'acte et droits de mutation sont répartis conformément à la loi et à l'acte de vente.`],
    ["FIN DU MANDAT", `Le mandat prend fin à son terme, par la vente du Bien, ou par la dénonciation prévue à l'article 7. Si le Bien est vendu dans les ${enToutes(d.suiteMois)} mois qui suivent la fin du mandat à un acquéreur présenté par le Mandataire ou ayant visité le Bien par son entremise, les honoraires de l'article 6 restent dus.`],
    ["CONFIDENTIALITÉ ET DONNÉES PERSONNELLES", "Les Parties gardent confidentielles les informations échangées. Les données personnelles sont traitées conformément à la loi n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel et ne servent qu'à la vente du Bien."],
    ["LITIGES ET ÉLECTION DE DOMICILE", "Le présent mandat est soumis au droit ivoirien. À défaut d'accord amiable dans un délai de trente jours, tout différend est porté devant les juridictions compétentes d'Abidjan. Les Parties élisent domicile aux adresses indiquées en tête des présentes."],
  ];
  return [
    `# ${MANDATS[kind].titre}`,
    "> Établi en application des articles 469 à 471 et 481 à 491 de la loi n° 2019-576 du 26 juin 2019 instituant le Code de la Construction et de l'Habitat et des règles du Code civil relatives au mandat.",
    "", "ENTRE LES SOUSSIGNÉS :", "",
    `${m.feminin ? "LA MANDANTE (la « Venderesse »)" : "LE MANDANT (le « Vendeur »)"} : ${m.texte}`, "", "> D'UNE PART,", "", "ET :", "",
    `LE MANDATAIRE (l'« Agence ») : ${agence(d, A)}`, "", "> D'AUTRE PART,", "",
    "IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :", "",
    ...articles.flatMap(([t, c], i) => [`## ARTICLE ${i + 1} – ${t}`, c, ""]),
    fin(d, m, A),
  ].join("\n");
}

/* Texte complet d'un mandat. `A` : identité de l'agence ; `lettres` : montant en toutes lettres */
export function redigerMandat(kind, d, A, lettres) {
  return kind === "gestion" ? gestion(d, A, lettres) : vente(kind, d, A, lettres);
}

/* Échéance du mandat à partir de la date de signature */
export function echeanceMandat(kind, d) {
  if (!d.dateSignature || !nb(d.duree)) return null;
  const [y, m, j] = d.dateSignature.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1 + (kind === "gestion" ? nb(d.duree) * 12 : nb(d.duree)), j));
  x.setUTCDate(x.getUTCDate() - 1);
  return x.toISOString().slice(0, 10);
}

/* Découpe le texte balisé en blocs pour l'affichage et l'impression */
export function blocsMandat(texte) {
  const blocs = []; let para = []; let liste = null;
  const vider = () => { if (para.length) { blocs.push({ type: "p", texte: para.join(" ") }); para = []; } if (liste) { blocs.push({ type: "liste", items: liste }); liste = null; } };
  String(texte || "").split("\n").forEach((brut) => {
    const l = brut.trimEnd();
    if (!l.trim()) return vider();
    if (l.startsWith("## ")) { vider(); blocs.push({ type: "article", texte: l.slice(3) }); }
    else if (l.startsWith("# ")) { vider(); blocs.push({ type: "titre", texte: l.slice(2) }); }
    else if (l.startsWith("> ")) { vider(); blocs.push({ type: "centre", texte: l.slice(2) }); }
    else if (l.startsWith("@@signatures ")) { vider(); blocs.push({ type: "signatures", colonnes: l.slice(13).split(" | ").map((c) => c.split("\\n")) }); }
    else if (l.startsWith("- ")) { if (para.length) { blocs.push({ type: "p", texte: para.join(" ") }); para = []; } (liste = liste || []).push(l.slice(2)); }
    else { if (liste) { blocs.push({ type: "liste", items: liste }); liste = null; } if (para.length) { blocs.push({ type: "p", texte: para.join(" ") }); para = []; } para.push(l); }
  });
  vider();
  return blocs;
}
