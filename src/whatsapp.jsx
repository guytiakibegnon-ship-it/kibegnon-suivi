/* ============================================================================
 *  ENTREPRISE KIBEGNON · SUIVI D'ÉQUIPE — WhatsApp et e-mail (version 38)
 *  · Envoi d'un document (quittance, courrier, décompte…) par WhatsApp ou
 *    par e-mail, depuis les comptes WhatsApp du bureau, avec un message
 *    préparé selon la situation et le PDF au nom précis du document.
 *  · Relances de loyer par WhatsApp, mois par mois, avec historique.
 *  · Réglages : comptes WhatsApp du bureau, messages types modifiables.
 *  Les messages partent des applications WhatsApp ouvertes sur les
 *  ordinateurs du bureau : rien n'est envoyé sans le clic de l'agent.
 *  Tables : migration-v38.sql.
 * ==========================================================================*/
import { useState, useEffect, useMemo, useCallback } from "react";
import { AlertTriangle, Check, Copy, FileDown, Mail, MessageCircle, Pencil, Plus, RefreshCw, RotateCcw, Search, Send, Share2, Smartphone, Trash2 } from "lucide-react";
import { supabase } from "./supabaseClient";
import { Modal, Field, Chip, StatCard, SectionCard, EmptyState, fcfa, inputCls, inputStyle, AGENCY, nomFichier, nomDocument, periodLabel, lineDue, isVacantLine, fr } from "./App.jsx";
import { MODELES, MODELE_DU_DOCUMENT, VARIABLES, modelesEnVigueur, remplir, numeroWhatsApp, telLisible, lienWhatsApp, relanceConseillee } from "./messages-types.js";

const INSTALL = "WhatsApp n'est pas encore installé : exécutez migration-v38.sql dans Supabase.";
const msgErreur = (e) => (/does not exist|schema cache|Could not find/i.test(e?.message || "") ? INSTALL : e?.message || "Erreur inconnue");
const jour = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; };
const dateLongue = (iso) => (iso ? fr(String(iso).slice(0, 10) + "T00:00:00", { day: "numeric", month: "long", year: "numeric" }) : "");
const ajouterJours = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const moisCourant = () => jour().slice(0, 7);

/* Préférences propres à cet ordinateur : compte WhatsApp ouvert ici et façon de l'ouvrir */
const lirePref = (k, d) => { try { return localStorage.getItem(`kb_wa_${k}`) || d; } catch { return d; } };
const ecrirePref = (k, v) => { try { localStorage.setItem(`kb_wa_${k}`, v); } catch { /* navigation privée */ } };

/* ══ PDF DU DOCUMENT AFFICHÉ ══
   Le document à l'écran (zone d'impression) est converti en PDF A4, au nom
   précis du document. Les bibliothèques ne sont chargées qu'à ce moment. */
export async function pdfDeLaPage(nom) {
  const zone = document.getElementById("print-area");
  if (!zone) throw new Error("Ouvrez d'abord le document à envoyer.");
  const { html2canvas, jsPDF } = await import("./pdf-vendor.js");
  const canvas = await html2canvas(zone, {
    scale: 1.75, backgroundColor: "#ffffff", useCORS: true, logging: false,
    ignoreElements: (el) => el.classList?.contains("print:hidden"),
  });
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const marge = 10, largeur = 210 - marge * 2, hauteurPage = 297 - marge * 2;
  const pxParMm = canvas.width / largeur;
  const hauteurTranche = Math.floor(hauteurPage * pxParMm);
  for (let y = 0, page = 0; y < canvas.height; y += hauteurTranche, page += 1) {
    const h = Math.min(hauteurTranche, canvas.height - y);
    const tranche = document.createElement("canvas");
    tranche.width = canvas.width; tranche.height = h;
    const ctx = tranche.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, tranche.width, h);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (page > 0) pdf.addPage();
    pdf.addImage(tranche.toDataURL("image/jpeg", 0.86), "JPEG", marge, marge, largeur, h / pxParMm);
  }
  const nomPdf = `${nomFichier(nom || "Document Entreprise Kibegnon")}.pdf`;
  pdf.setProperties({ title: nomPdf.replace(/\.pdf$/, ""), author: "Entreprise Kibegnon", creator: "Suivi d'équipe Kibegnon" });
  const blob = pdf.output("blob");
  return { blob, nom: nomPdf, file: typeof File !== "undefined" ? new File([blob], nomPdf, { type: "application/pdf" }) : null };
}
export function telecharger(blob, nom) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
const ouvrir = (url) => { const w = window.open(url, "_blank", "noopener"); if (!w && url.startsWith("whatsapp:")) window.location.href = url; };
const copier = async (t) => { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } };

/* Comptes du bureau et messages types (chargés une fois) */
function useReglagesWA() {
  const [comptes, setComptes] = useState([]); const [surcharges, setSurcharges] = useState([]); const [erreur, setErreur] = useState("");
  const charger = useCallback(async () => {
    const [c, t] = await Promise.all([supabase.from("wa_accounts").select("*").order("position"), supabase.from("wa_templates").select("*")]);
    if (c.error) { setErreur(msgErreur(c.error)); return; }
    setComptes(c.data || []); setSurcharges(t.data || []); setErreur("");
  }, []);
  useEffect(() => { charger(); }, [charger]);
  const modeles = useMemo(() => modelesEnVigueur(surcharges), [surcharges]);
  return { comptes, modeles, surcharges, erreur, charger };
}
async function journaliser(row) {
  const { error } = await supabase.from("wa_log").insert(row);
  return error ? msgErreur(error) : "";
}

/* Choix du compte WhatsApp du bureau ouvert sur cet ordinateur */
function CompteBureau({ comptes, value, onChange }) {
  if (!comptes.length) return <p className="text-[11px] mb-2" style={{ color: "var(--muted)" }}>Aucun compte WhatsApp du bureau enregistré (Pilotage › WhatsApp › Comptes et messages types).</p>;
  return (
    <Field label="Compte WhatsApp du bureau ouvert sur cet ordinateur" hint="Retenu pour cet ordinateur">
      <select className={inputCls} style={inputStyle} value={value} onChange={(e) => { onChange(e.target.value); ecrirePref("compte", e.target.value); }}>
        {comptes.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.label}{c.phone ? ` — ${c.phone}` : ""}</option>)}
      </select>
    </Field>
  );
}

/* ══ ENVOI D'UN MESSAGE (avec ou sans document) ══ */
export function EnvoiMessage({ titre, destinataires = [], modeleInitial = "libre", valeurs = {}, document: docNom, journal = {}, store, me, onClose, onEnvoye }) {
  const { comptes, modeles, erreur } = useReglagesWA();
  const [dest, setDest] = useState(0);
  const d = destinataires[dest] || { nom: "", telephone: "", email: "", kind: "tiers" };
  const [canal, setCanal] = useState(lirePref("canal", "whatsapp"));
  const [compteId, setCompteId] = useState(lirePref("compte", ""));
  const [mode, setMode] = useState(lirePref("mode", "application"));
  const [modele, setModele] = useState(modeleInitial);
  const [tel, setTel] = useState(d.telephone || "");
  const [mail, setMail] = useState(d.email || "");
  const [garderTel, setGarderTel] = useState(true);
  const [texte, setTexte] = useState("");
  const [objet, setObjet] = useState(docNom ? docNom.replace(/\.pdf$/, "") : titre || "");
  const [busy, setBusy] = useState(""); const [info, setInfo] = useState(""); const [err, setErr] = useState("");
  const compte = comptes.find((c) => c.id === compteId) || comptes.find((c) => c.active) || null;
  const vals = useMemo(() => ({ agent: me?.name || "", telephones: AGENCY.telephones, ...valeurs, nom: d.nom || valeurs.nom }), [valeurs, d.nom, me?.name]);
  /* Le message se réécrit quand on change de modèle ou de destinataire, jamais pendant la saisie */
  useEffect(() => { setTexte(remplir(modeles[modele]?.body || "", vals)); }, [modele, modeles, vals]);
  useEffect(() => { setTel(d.telephone || ""); setMail(d.email || ""); }, [dest]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!compteId && comptes.length) setCompteId(comptes.find((c) => c.active)?.id || ""); }, [comptes, compteId]);
  const numero = numeroWhatsApp(tel);
  const groupes = [...new Set(Object.values(modeles).map((m) => m.groupe || "Autres"))];
  const manquants = (texte.match(/\[[a-zé ]+\]/gi) || []);

  /* Enregistre le numéro ou l'adresse sur la fiche, s'il manquait */
  const memoriserContact = async () => {
    if (!garderTel || !d.fiche) return;
    const { table, id, champTel, champMail } = d.fiche;
    const maj = {};
    if (champTel && tel.trim() && tel.trim() !== (d.telephone || "")) maj[champTel] = tel.trim();
    if (champMail && mail.trim() && mail.trim().toLowerCase() !== (d.email || "").toLowerCase()) maj[champMail] = mail.trim().toLowerCase();
    if (Object.keys(maj).length) await supabase.from(table).update(maj).eq("id", id);
  };
  const tracer = async (extra) => {
    const e = await journaliser({ canal, account_label: canal === "whatsapp" ? (compte ? `${compte.label}${compte.phone ? ` (${compte.phone})` : ""}` : "") : (me?.contactEmail || me?.email || ""),
      recipient_kind: d.kind || "tiers", recipient_name: d.nom || "", phone: numero, email: mail.trim(), kind: modele, body: texte,
      doc_id: journal.docId || null, unit_id: journal.unitId || null, lease_id: journal.leaseId || null, period: journal.period || "", amount: Number(journal.amount) || 0, ...extra });
    await memoriserContact();
    onEnvoye?.();
    return e;
  };
  const fichier = async () => {
    if (!docNom) return null;
    setBusy("pdf"); setInfo("Préparation du PDF…");
    try { return await pdfDeLaPage(docNom.replace(/\.pdf$/, "")); }
    finally { setBusy(""); }
  };

  /* WhatsApp : partage du fichier avec le message, sinon discussion ouverte et PDF téléchargé */
  const partager = async () => {
    setErr(""); setInfo("");
    if (!numero) return setErr("Numéro WhatsApp manquant ou incomplet (10 chiffres, ex. 07 87 84 33 68).");
    try {
      const f = await fichier();
      if (f?.file && navigator.canShare?.({ files: [f.file] })) {
        await copier(texte);
        await navigator.share({ files: [f.file], text: texte, title: f.nom });
        await tracer({ file_name: f.nom });
        setInfo(`Partagé : choisissez WhatsApp puis ${telLisible(numero)}. Le message est aussi copié (Ctrl+V) si WhatsApp ne le reprend pas.`);
        return;
      }
      if (f) telecharger(f.blob, f.nom);
      ouvrir(lienWhatsApp(numero, texte, mode));
      await copier(texte);
      await tracer({ file_name: f?.nom || "" });
      setInfo(f ? `Discussion ouverte avec ${telLisible(numero)}. Le PDF « ${f.nom} » est dans vos Téléchargements : glissez-le dans la discussion, puis envoyez.` : `Discussion ouverte avec ${telLisible(numero)} : vérifiez le message puis envoyez.`);
    } catch (e) {
      if (e?.name === "AbortError") { setInfo("Partage annulé."); return; }
      setErr(e?.message || "Envoi impossible.");
    }
  };
  /* E-mail : messagerie ouverte avec le message, PDF téléchargé à joindre */
  const envoyerMail = async (via) => {
    setErr(""); setInfo("");
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(mail.trim())) return setErr("Adresse e-mail du destinataire invalide.");
    try {
      const f = await fichier();
      if (f) telecharger(f.blob, f.nom);
      const corps = texte;
      const url = via === "gmail"
        ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(mail.trim())}&su=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`
        : `mailto:${encodeURIComponent(mail.trim())}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`;
      if (via === "gmail") ouvrir(url); else window.location.href = url;
      await tracer({ file_name: f?.nom || "" });
      setInfo(f ? `Message préparé. Joignez le PDF « ${f.nom} » (dossier Téléchargements), puis envoyez.` : "Message préparé dans votre messagerie : vérifiez-le puis envoyez.");
    } catch (e) { setErr(e?.message || "Préparation impossible."); }
  };

  const onglet = (k, l, I) => (
    <button type="button" onClick={() => { setCanal(k); ecrirePref("canal", k); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium"
      style={{ background: canal === k ? (k === "whatsapp" ? "#128C4B" : "var(--ink)") : "#fff", color: canal === k ? "#fff" : "var(--ink)", border: "1px solid var(--line)" }}><I size={15} /> {l}</button>);

  return (
    <Modal title={titre || "Envoyer un message"} onClose={onClose} wide>
      {erreur && <p className="text-xs mb-2 rounded p-2" style={{ background: "#FFF8EC", color: "#8A6212" }}>{erreur}</p>}
      <div className="flex gap-2 mb-3">{onglet("whatsapp", "WhatsApp", MessageCircle)}{onglet("email", "E-mail", Mail)}</div>
      {destinataires.length > 1 && (
        <Field label="Destinataire">
          <div className="flex flex-wrap gap-1.5">{destinataires.map((x, i) => (
            <button key={i} type="button" onClick={() => setDest(i)} className="text-xs rounded-full px-3 py-1 border"
              style={{ background: dest === i ? "var(--ink)" : "#fff", color: dest === i ? "#fff" : "var(--ink)", borderColor: dest === i ? "transparent" : "var(--line)" }}>{x.libelle || x.nom}</button>))}</div>
        </Field>)}
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nom"><input className={inputCls} style={inputStyle} value={d.nom || ""} readOnly /></Field>
        {canal === "whatsapp"
          ? <Field label="Numéro WhatsApp" hint={numero ? `Envoi au ${telLisible(numero)}` : "10 chiffres, ex. 07 87 84 33 68"}><input className={inputCls} style={inputStyle} value={tel} onChange={(e) => setTel(e.target.value)} placeholder="07 00 00 00 00" aria-label="Numéro WhatsApp" /></Field>
          : <Field label="Adresse e-mail"><input type="email" className={inputCls} style={inputStyle} value={mail} onChange={(e) => setMail(e.target.value)} placeholder="nom@exemple.com" aria-label="Adresse e-mail du destinataire" /></Field>}
      </div>
      {d.fiche && ((canal === "whatsapp" && tel.trim() && tel.trim() !== (d.telephone || "")) || (canal === "email" && mail.trim() && mail.trim().toLowerCase() !== (d.email || "").toLowerCase())) && (
        <label className="flex items-center gap-2 text-xs mb-3 cursor-pointer"><input type="checkbox" checked={garderTel} onChange={(e) => setGarderTel(e.target.checked)} /> Enregistrer ce {canal === "whatsapp" ? "numéro" : "courriel"} sur la fiche de {d.nom}</label>)}
      {canal === "whatsapp" && <div className="grid sm:grid-cols-2 gap-3">
        <CompteBureau comptes={comptes} value={compte?.id || ""} onChange={setCompteId} />
        <Field label="Ouvrir WhatsApp avec" hint="Retenu pour cet ordinateur"><select className={inputCls} style={inputStyle} value={mode} onChange={(e) => { setMode(e.target.value); ecrirePref("mode", e.target.value); }}>
          <option value="application">L'application WhatsApp de l'ordinateur</option><option value="web">WhatsApp Web (navigateur)</option></select></Field>
      </div>}
      {canal === "email" && <Field label="Objet"><input className={inputCls} style={inputStyle} value={objet} onChange={(e) => setObjet(e.target.value)} /></Field>}
      <Field label="Message préparé" hint="Le texte reste modifiable avant l'envoi">
        <select className={inputCls} style={inputStyle} value={modele} onChange={(e) => setModele(e.target.value)} aria-label="Message type">
          {groupes.map((g) => <optgroup key={g} label={g}>{Object.values(modeles).filter((m) => (m.groupe || "Autres") === g).map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}</optgroup>)}
        </select>
      </Field>
      <textarea rows={9} className={inputCls} style={{ ...inputStyle, fontFamily: "inherit" }} value={texte} onChange={(e) => setTexte(e.target.value)} aria-label="Texte du message" />
      {manquants.length > 0 && <p className="text-[11px] mt-1" style={{ color: "#B7791F" }}><AlertTriangle size={11} className="inline mb-0.5" /> À compléter dans le message : {[...new Set(manquants)].join(", ")}</p>}
      {docNom && <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: "var(--muted)" }}><FileDown size={14} /> Pièce jointe : <strong style={{ color: "var(--ink)" }}>{docNom.endsWith(".pdf") ? docNom : `${docNom}.pdf`}</strong></p>}
      {err && <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#B5171D" }}><AlertTriangle size={13} /> {err}</p>}
      {info && <p className="text-xs mt-2 rounded-lg p-2" role="status" style={{ background: "#EAF6E3", color: "#2F6B1A" }}>{info}</p>}
      <div className="flex flex-wrap justify-end gap-2 mt-3">
        <button type="button" onClick={async () => setInfo((await copier(texte)) ? "Message copié." : "Copie impossible sur ce navigateur.")} className="kb-btn kb-btn-ghost text-sm"><Copy size={14} /> Copier le message</button>
        {canal === "whatsapp"
          ? <button type="button" disabled={!!busy} onClick={partager} className="kb-btn text-sm disabled:opacity-50" style={{ background: "#128C4B", color: "#fff" }}>
              {busy ? <RefreshCw size={14} className="animate-spin" /> : docNom ? <Share2 size={14} /> : <Send size={14} />} {busy ? "Préparation du PDF…" : docNom ? "Envoyer le PDF par WhatsApp" : "Ouvrir la discussion WhatsApp"}</button>
          : <>
              <button type="button" disabled={!!busy} onClick={() => envoyerMail("messagerie")} className="kb-btn kb-btn-ghost text-sm disabled:opacity-50"><Mail size={14} /> Messagerie de l'ordinateur</button>
              <button type="button" disabled={!!busy} onClick={() => envoyerMail("gmail")} className="kb-btn kb-btn-primary text-sm disabled:opacity-50"><Send size={14} /> {busy ? "Préparation du PDF…" : "Ouvrir dans Gmail"}</button>
            </>}
      </div>
    </Modal>
  );
}

/* ══ ENVOI D'UN DOCUMENT DE L'AGENCE ══ */
export function EnvoiDocument({ doc, store, me, onClose }) {
  const unit = (store?.units || []).find((u) => u.id === doc.unitId) || null;
  const property = (store?.properties || []).find((p) => p.id === (doc.propertyId || unit?.propertyId)) || null;
  const owner = (store?.owners || []).find((o) => o.id === (doc.ownerId || property?.ownerId)) || null;
  const bien = [property?.name, unit?.label].filter(Boolean).join(" — ");
  const destinataires = [];
  if (doc.clientName) destinataires.push({ libelle: doc.docType === "recu_charge" ? `${doc.clientName} (document)` : doc.clientName, nom: doc.clientName,
    telephone: doc.clientPhone || (unit && unit.tenantName === doc.clientName ? unit.tenantPhone : "") || "", email: doc.clientEmail || (unit && unit.tenantName === doc.clientName ? unit.tenantEmail : "") || "",
    kind: owner && owner.name === doc.clientName ? "proprietaire" : "locataire",
    fiche: unit && unit.tenantName === doc.clientName ? { table: "units", id: unit.id, champTel: "tenant_phone", champMail: "tenant_email" } : owner && owner.name === doc.clientName ? { table: "owners", id: owner.id, champTel: "phone", champMail: "email" } : null });
  if (unit?.tenantName && unit.tenantName !== doc.clientName) destinataires.push({ libelle: `${unit.tenantName} (locataire)`, nom: unit.tenantName, telephone: unit.tenantPhone, email: unit.tenantEmail, kind: "locataire", fiche: { table: "units", id: unit.id, champTel: "tenant_phone", champMail: "tenant_email" } });
  if (owner && owner.name !== doc.clientName) destinataires.push({ libelle: `${owner.name} (propriétaire)`, nom: owner.name, telephone: owner.phone, email: owner.email, kind: "proprietaire", fiche: { table: "owners", id: owner.id, champTel: "phone", champMail: "email" } });
  if (!destinataires.length) destinataires.push({ nom: "", telephone: "", email: "", kind: "tiers" });
  const valeurs = { ref: doc.ref, montant: doc.total ? fcfa(doc.total) : "", bien: bien || property?.name || "", objet: doc.object || "",
    periode: doc.periodIso ? periodLabel(doc.periodIso) : doc.fields?.periode || "", loyer: unit?.rent ? fcfa(unit.rent) : "" };
  return <EnvoiMessage titre={`Envoyer ${doc.ref || "le document"}`} destinataires={destinataires} modeleInitial={MODELE_DU_DOCUMENT[doc.docType] || "libre"}
    valeurs={valeurs} document={nomDocument(doc)} journal={{ docId: doc.id, unitId: unit?.id, period: doc.periodIso || "", amount: doc.total }} store={store} me={me} onClose={onClose} />;
}

/* ══ PAGE WHATSAPP : relances, historique, réglages ══ */
export function WhatsAppPage({ store, me }) {
  const [onglet, setOnglet] = useState("relances");
  const sup = ["admin", "gerante", "responsable_admin"].includes(me?.role);
  return (
    <div>
      <h1 className="text-xl font-bold flex items-center gap-2"><MessageCircle size={20} style={{ color: "#128C4B" }} /> WhatsApp</h1>
      <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>Relances de loyer et envois depuis les comptes WhatsApp du bureau. Chaque message s'ouvre tout prêt dans WhatsApp : l'agent le vérifie et l'envoie.</p>
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[["relances", "Relances de loyer"], ["historique", "Historique des envois"], ["reglages", "Comptes et messages types"]].map(([k, l]) => (
          <button key={k} onClick={() => setOnglet(k)} className="text-sm rounded-full px-3.5 py-1.5 border" style={{ background: onglet === k ? "var(--ink)" : "#fff", color: onglet === k ? "#fff" : "var(--ink)", borderColor: onglet === k ? "transparent" : "var(--line)" }}>{l}</button>))}
      </div>
      {onglet === "relances" && <Relances store={store} me={me} />}
      {onglet === "historique" && <Historique store={store} />}
      {onglet === "reglages" && <Reglages sup={sup} />}
    </div>
  );
}

/* Locataires à relancer pour un mois : reste à payer sur le tableau du mois */
export function aRelancer({ periode, scope, rentPeriods = [], rentLines = [], units = [], properties = [], journal = [], today = jour() }) {
  const tableaux = rentPeriods.filter((p) => p.period === periode && p.scope === scope);
  const out = [];
  tableaux.forEach((p) => {
    const prop = properties.find((x) => x.id === p.propertyId);
    rentLines.filter((l) => l.periodId === p.id && !isVacantLine(l) && lineDue(l) > 0.5).forEach((l) => {
      const u = units.find((x) => x.id === l.unitId) || units.find((x) => x.propertyId === p.propertyId && (x.label || "").trim().toLowerCase() === (l.unitLabel || "").trim().toLowerCase()) || null;
      const echeance = `${periode}-${String(Math.min(28, Math.max(1, Number(u?.dueDay) || 5))).padStart(2, "0")}`;
      const joursRetard = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${echeance}T00:00:00Z`)) / 86400000);
      const relances = journal.filter((j) => j.canal === "whatsapp" && j.period === periode && ((u && j.unit_id === u.id) || (!u && j.recipient_name === l.tenantName)) && /^(relance_|dernier_avis|rappel_echeance)/.test(j.kind || ""));
      const faites = relances.filter((j) => j.kind !== "rappel_echeance").length;
      out.push({ ligne: l, lot: u, bien: prop?.name || "", propertyId: p.propertyId, nom: l.tenantName, telephone: l.tenantPhone || u?.tenantPhone || "",
        loyer: Number(l.expected) || 0, du: lineDue(l), echeance, joursRetard, relances, derniere: relances[0]?.created_at || "",
        conseil: relanceConseillee({ joursRetard, dejaRelance: faites }) });
    });
  });
  return out.sort((a, b) => b.joursRetard - a.joursRetard || b.du - a.du || a.nom.localeCompare(b.nom));
}

function Relances({ store, me }) {
  const isAdminUser = me?.role === "admin";
  const [periode, setPeriode] = useState(moisCourant());
  const [scope, setScope] = useState(isAdminUser ? "comptable" : "commercial");
  const [journal, setJournal] = useState([]); const [q, setQ] = useState("");
  const [envoi, setEnvoi] = useState(null);
  const chargerJournal = useCallback(async () => {
    const { data } = await supabase.from("wa_log").select("*").eq("period", periode).order("created_at", { ascending: false }).limit(2000);
    setJournal(data || []);
  }, [periode]);
  useEffect(() => { chargerJournal(); }, [chargerJournal]);
  const mois = useMemo(() => [...new Set((store.rentPeriods || []).map((p) => p.period))].sort().reverse(), [store.rentPeriods]);
  const liste = useMemo(() => aRelancer({ periode, scope, rentPeriods: store.rentPeriods, rentLines: store.rentLines, units: store.units, properties: store.properties, journal })
    .filter((x) => !q.trim() || `${x.nom} ${x.bien} ${x.ligne.unitLabel}`.toLowerCase().includes(q.trim().toLowerCase())), [periode, scope, store.rentPeriods, store.rentLines, store.units, store.properties, journal, q]);
  const total = liste.reduce((s, x) => s + x.du, 0);
  const sansNumero = liste.filter((x) => !numeroWhatsApp(x.telephone)).length;
  const ouvrirEnvoi = (x) => setEnvoi({
    titre: `Relance — ${x.nom}`,
    destinataires: [{ nom: x.nom, telephone: x.telephone, email: x.lot?.tenantEmail || "", kind: "locataire", fiche: x.lot ? { table: "units", id: x.lot.id, champTel: "tenant_phone", champMail: "tenant_email" } : null }],
    modeleInitial: x.conseil,
    valeurs: { bien: [x.bien, x.ligne.unitLabel].filter(Boolean).join(" — "), periode: periodLabel(periode), loyer: fcfa(x.loyer), du: fcfa(x.du), montant: fcfa(x.du),
      echeance: dateLongue(x.echeance), date_limite: dateLongue(ajouterJours(jour(), 8)) },
    journal: { unitId: x.lot?.id, period: periode, amount: x.du },
  });
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3 items-end">
        <Field label="Mois"><select className={inputCls} style={inputStyle} value={periode} onChange={(e) => setPeriode(e.target.value)} aria-label="Mois à relancer">
          {[...new Set([moisCourant(), ...mois])].map((m) => <option key={m} value={m}>{periodLabel(m)}</option>)}</select></Field>
        <Field label="Tableau"><select className={inputCls} style={inputStyle} value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="commercial">Suivi commercial</option>{isAdminUser && <option value="comptable">État comptable</option>}</select></Field>
        <div className="relative flex-1 min-w-[200px] mb-3"><Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Locataire, bâtiment, lot…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} /></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={AlertTriangle} label="Locataires à relancer" value={liste.length} tint="#D81F26" />
        <StatCard icon={MessageCircle} label="Reste à payer" value={fcfa(total)} tint="#B7791F" />
        <StatCard icon={Check} label="Déjà relancés ce mois" value={liste.filter((x) => x.relances.length).length} tint="#128C4B" />
        <StatCard icon={Smartphone} label="Sans numéro valable" value={sansNumero} tint="#64748B" />
      </div>
      {!liste.length ? <EmptyState icon={Check} title="Personne à relancer" sub={`Aucun reste à payer sur les tableaux de ${periodLabel(periode)} (${scope === "comptable" ? "état comptable" : "suivi commercial"}).`} /> : (
        <SectionCard title={`À relancer — ${periodLabel(periode)}`} icon={MessageCircle} pad={false}>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-xs" style={{ color: "var(--muted)" }}>
              <th className="px-3 py-2 font-medium">Locataire</th><th className="px-3 py-2 font-medium">Bien</th><th className="px-3 py-2 font-medium text-right">Reste à payer</th>
              <th className="px-3 py-2 font-medium">Échéance</th><th className="px-3 py-2 font-medium">Relances</th><th className="px-3 py-2" /></tr></thead>
            <tbody>{liste.map((x) => (
              <tr key={x.ligne.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                <td className="px-3 py-2"><p className="font-medium">{x.nom}</p><p className="text-[11px]" style={{ color: numeroWhatsApp(x.telephone) ? "var(--muted)" : "#B5171D" }}>{numeroWhatsApp(x.telephone) ? telLisible(numeroWhatsApp(x.telephone)) : "numéro à compléter"}</p></td>
                <td className="px-3 py-2 text-xs">{x.bien}<br /><span style={{ color: "var(--muted)" }}>{x.ligne.unitLabel}</span></td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ color: "#B5171D" }}>{fcfa(x.du)}</td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">{x.echeance.split("-").reverse().join("/")}<br /><span style={{ color: x.joursRetard > 0 ? "#B5171D" : "var(--muted)" }}>{x.joursRetard > 0 ? `${x.joursRetard} j de retard` : x.joursRetard === 0 ? "aujourd'hui" : `dans ${-x.joursRetard} j`}</span></td>
                <td className="px-3 py-2 text-xs">{x.relances.length ? <>{x.relances.length} envoi(s)<br /><span style={{ color: "var(--muted)" }}>dernier le {new Date(x.derniere).toLocaleDateString("fr-FR")}</span></> : <span style={{ color: "var(--muted)" }}>aucune</span>}</td>
                <td className="px-3 py-2 text-right"><button onClick={() => ouvrirEnvoi(x)} className="kb-btn text-xs whitespace-nowrap" style={{ background: "#128C4B", color: "#fff" }}><MessageCircle size={13} /> {MODELES[x.conseil]?.label.split(" (")[0] || "Relancer"}</button></td>
              </tr>))}</tbody>
          </table></div>
        </SectionCard>)}
      {envoi && <EnvoiMessage {...envoi} store={store} me={me} onClose={() => setEnvoi(null)} onEnvoye={chargerJournal} />}
    </div>
  );
}

function Historique({ store }) {
  const [rows, setRows] = useState([]); const [err, setErr] = useState(""); const [q, setQ] = useState(""); const [vue, setVue] = useState(null);
  useEffect(() => { (async () => { const { data, error } = await supabase.from("wa_log").select("*").order("created_at", { ascending: false }).limit(500); if (error) setErr(msgErreur(error)); else setRows(data || []); })(); }, []);
  const nom = (id) => (store.members || []).find((m) => m.id === id)?.name || "—";
  const liste = rows.filter((r) => !q.trim() || `${r.recipient_name} ${r.phone} ${r.email} ${r.kind} ${r.file_name}`.toLowerCase().includes(q.trim().toLowerCase()));
  if (err) return <p className="text-sm rounded p-3" style={{ background: "#FFF8EC", color: "#8A6212" }}>{err}</p>;
  return (
    <div>
      <div className="relative mb-3 max-w-md"><Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Destinataire, numéro, document…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} /></div>
      {!liste.length ? <EmptyState icon={MessageCircle} title="Aucun envoi" sub="Les envois par WhatsApp et par e-mail préparés depuis l'outil apparaîtront ici." /> : (
        <div className="bg-white rounded-xl border overflow-x-auto" style={{ borderColor: "var(--line)" }}><table className="w-full text-sm">
          <thead><tr className="text-left text-xs" style={{ color: "var(--muted)" }}><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Canal</th><th className="px-3 py-2 font-medium">Destinataire</th>
            <th className="px-3 py-2 font-medium">Message</th><th className="px-3 py-2 font-medium">Pièce jointe</th><th className="px-3 py-2 font-medium">Par</th></tr></thead>
          <tbody>{liste.map((r) => (
            <tr key={r.id} className="border-t cursor-pointer hover:bg-slate-50" style={{ borderColor: "var(--line)" }} onClick={() => setVue(r)}>
              <td className="px-3 py-2 whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
              <td className="px-3 py-2"><Chip color={r.canal === "whatsapp" ? "#128C4B" : "#1F5C82"} bg={r.canal === "whatsapp" ? "#E7F6EE" : "#EFF6FF"}>{r.canal === "whatsapp" ? "WhatsApp" : "E-mail"}</Chip></td>
              <td className="px-3 py-2">{r.recipient_name}<br /><span className="text-[11px]" style={{ color: "var(--muted)" }}>{r.canal === "whatsapp" ? telLisible(r.phone) : r.email}</span></td>
              <td className="px-3 py-2 text-xs">{MODELES[r.kind]?.label || r.kind}</td>
              <td className="px-3 py-2 text-xs">{r.file_name || "—"}</td>
              <td className="px-3 py-2 text-xs">{nom(r.sender_id)}{r.account_label ? <><br /><span style={{ color: "var(--muted)" }}>{r.account_label}</span></> : null}</td>
            </tr>))}</tbody></table></div>)}
      {vue && <Modal title={`${vue.canal === "whatsapp" ? "WhatsApp" : "E-mail"} — ${vue.recipient_name}`} onClose={() => setVue(null)}>
        <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>{new Date(vue.created_at).toLocaleString("fr-FR")} · {vue.canal === "whatsapp" ? telLisible(vue.phone) : vue.email}{vue.file_name ? ` · ${vue.file_name}` : ""}</p>
        <pre className="whitespace-pre-wrap text-sm" style={{ fontFamily: "inherit" }}>{vue.body}</pre></Modal>}
    </div>
  );
}

function Reglages({ sup }) {
  const { comptes, modeles, surcharges, erreur, charger } = useReglagesWA();
  const [compte, setCompte] = useState(null); const [modele, setModele] = useState(null); const [err, setErr] = useState(""); const [ok, setOk] = useState("");
  const enregistrerCompte = async () => {
    setErr("");
    if (!compte.label.trim()) return setErr("Donnez un nom au compte (ex. Bureau — gestion locative).");
    if (!numeroWhatsApp(compte.phone)) return setErr("Numéro WhatsApp invalide (10 chiffres).");
    const row = { label: compte.label.trim(), phone: compte.phone.trim(), active: compte.active !== false, position: Number(compte.position) || 0 };
    const { error } = compte.id ? await supabase.from("wa_accounts").update(row).eq("id", compte.id) : await supabase.from("wa_accounts").insert(row);
    if (error) return setErr(msgErreur(error));
    setCompte(null); setOk("Compte enregistré."); charger();
  };
  const enregistrerModele = async () => {
    setErr("");
    if (!modele.body.trim()) return setErr("Le message est vide.");
    const code = modele.code || `agence_${Date.now().toString(36)}`;
    const { error } = await supabase.from("wa_templates").upsert({ code, label: modele.label.trim() || code, body: modele.body, updated_at: new Date().toISOString() });
    if (error) return setErr(msgErreur(error));
    setModele(null); setOk("Message type enregistré."); charger();
  };
  const retablir = async (code) => {
    if (!window.confirm("Revenir au message d'origine de l'application ?")) return;
    const { error } = await supabase.from("wa_templates").delete().eq("code", code);
    if (error) setErr(msgErreur(error)); else { setOk("Message d'origine rétabli."); charger(); }
  };
  const supprimerCompte = async (c) => {
    if (!window.confirm(`Supprimer le compte « ${c.label} » ?`)) return;
    const { error } = await supabase.from("wa_accounts").delete().eq("id", c.id);
    if (error) setErr(msgErreur(error)); else charger();
  };
  const groupes = [...new Set(Object.values(modeles).map((m) => m.groupe || "Autres"))];
  return (
    <div>
      {erreur && <p className="text-sm rounded p-3 mb-3" style={{ background: "#FFF8EC", color: "#8A6212" }}>{erreur}</p>}
      {ok && <p className="text-sm rounded p-2 mb-3" role="status" style={{ background: "#EAF6E3", color: "#2F6B1A" }}>{ok}</p>}
      {err && <p className="text-sm mb-3 flex items-center gap-1" style={{ color: "#B5171D" }}><AlertTriangle size={14} /> {err}</p>}
      <SectionCard title="Comptes WhatsApp du bureau" icon={Smartphone} action={sup && <button onClick={() => setCompte({ label: "", phone: "", active: true, position: comptes.length })} className="kb-btn kb-btn-ghost text-xs"><Plus size={13} /> Ajouter un compte</button>}>
        <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>Les comptes WhatsApp (ou WhatsApp Business) ouverts sur les ordinateurs du bureau. Sur chaque ordinateur, l'agent choisit une fois le compte qui y est ouvert ; les envois sont tracés avec ce compte.</p>
        {!comptes.length ? <p className="text-sm" style={{ color: "var(--muted)" }}>Aucun compte enregistré.{sup ? " Ajoutez les deux comptes du bureau." : " La direction les enregistre."}</p> : (
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>{comptes.map((c) => (
            <div key={c.id} className="py-2 flex items-center justify-between gap-2">
              <div><p className="text-sm font-medium">{c.label} {!c.active && <Chip color="#64748B" bg="#F1F5F9">inactif</Chip>}</p><p className="text-xs" style={{ color: "var(--muted)" }}>{telLisible(numeroWhatsApp(c.phone)) || c.phone}</p></div>
              {sup && <div className="flex gap-1"><button onClick={() => setCompte({ ...c })} className="p-1.5 rounded hover:bg-slate-100" aria-label={`Modifier ${c.label}`}><Pencil size={14} /></button>
                <button onClick={() => supprimerCompte(c)} className="p-1.5 rounded hover:bg-red-50 text-red-500" aria-label={`Supprimer ${c.label}`}><Trash2 size={14} /></button></div>}
            </div>))}</div>)}
      </SectionCard>
      <SectionCard title="Messages types" icon={MessageCircle} action={sup && <button onClick={() => setModele({ code: "", label: "", body: "Bonjour {nom},\n\n" })} className="kb-btn kb-btn-ghost text-xs"><Plus size={13} /> Nouveau message type</button>}>
        <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>Ils accompagnent chaque envoi selon la situation. Les mots entre accolades sont remplacés automatiquement (nom, bien, montant…). La signature de l'agent et les téléphones de l'agence sont ajoutés à la fin.</p>
        {groupes.map((g) => (
          <div key={g} className="mb-3"><p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>{g}</p>
            <div className="divide-y rounded-lg border" style={{ borderColor: "var(--line)" }}>{Object.values(modeles).filter((m) => (m.groupe || "Autres") === g).map((m) => (
              <div key={m.code} className="px-3 py-2 flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="text-sm font-medium">{m.label} {m.modifie && <Chip color="#B7791F" bg="#FFF8EC">modifié</Chip>}{m.perso && <Chip color="#1F5C82" bg="#EFF6FF">propre à l'agence</Chip>}</p>
                  <p className="text-xs truncate" style={{ color: "var(--muted)", maxWidth: 560 }}>{m.body.replace(/\n+/g, " ")}</p></div>
                {sup && <div className="flex gap-1 shrink-0"><button onClick={() => setModele({ code: m.code, label: m.label, body: m.body })} className="p-1.5 rounded hover:bg-slate-100" aria-label={`Modifier ${m.label}`}><Pencil size={14} /></button>
                  {(m.modifie || m.perso) && <button onClick={() => retablir(m.code)} className="p-1.5 rounded hover:bg-slate-100" title={m.perso ? "Supprimer" : "Revenir au message d'origine"} aria-label={`Rétablir ${m.label}`}>{m.perso ? <Trash2 size={14} /> : <RotateCcw size={14} />}</button>}</div>}
              </div>))}</div></div>))}
        {!sup && <p className="text-xs" style={{ color: "var(--muted)" }}>Seule la direction modifie les messages types. {surcharges.length ? `${surcharges.length} message(s) personnalisé(s) par l'agence.` : ""}</p>}
      </SectionCard>
      {compte && <Modal title={compte.id ? "Modifier le compte WhatsApp" : "Nouveau compte WhatsApp du bureau"} onClose={() => setCompte(null)}>
        <Field label="Nom du compte *"><input className={inputCls} style={inputStyle} value={compte.label} onChange={(e) => setCompte((c) => ({ ...c, label: e.target.value }))} placeholder="Ex. Bureau — gestion locative" /></Field>
        <Field label="Numéro WhatsApp *" hint={numeroWhatsApp(compte.phone) ? telLisible(numeroWhatsApp(compte.phone)) : "10 chiffres"}><input className={inputCls} style={inputStyle} value={compte.phone} onChange={(e) => setCompte((c) => ({ ...c, phone: e.target.value }))} placeholder="07 00 00 00 00" /></Field>
        <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={compte.active !== false} onChange={(e) => setCompte((c) => ({ ...c, active: e.target.checked }))} /> Compte en service</label>
        <div className="flex justify-end gap-2"><button onClick={() => setCompte(null)} className="kb-btn kb-btn-ghost">Annuler</button><button onClick={enregistrerCompte} className="kb-btn kb-btn-primary"><Check size={15} /> Enregistrer</button></div>
      </Modal>}
      {modele && <Modal title={modele.code ? `Modifier : ${modele.label}` : "Nouveau message type"} onClose={() => setModele(null)} wide>
        <Field label="Nom du message"><input className={inputCls} style={inputStyle} value={modele.label} onChange={(e) => setModele((m) => ({ ...m, label: e.target.value }))} /></Field>
        <Field label="Texte" hint="La signature de l'agent est ajoutée automatiquement"><textarea rows={9} className={inputCls} style={{ ...inputStyle, fontFamily: "inherit" }} value={modele.body} onChange={(e) => setModele((m) => ({ ...m, body: e.target.value }))} /></Field>
        <p className="text-[11px] mb-1" style={{ color: "var(--muted)" }}>Cliquez pour insérer :</p>
        <div className="flex flex-wrap gap-1 mb-3">{VARIABLES.map(([v, l]) => <button key={v} type="button" title={l} onClick={() => setModele((m) => ({ ...m, body: `${m.body}${v}` }))} className="text-[11px] rounded border px-1.5 py-0.5 hover:bg-slate-100" style={{ borderColor: "var(--line)" }}>{v}</button>)}</div>
        <div className="flex justify-end gap-2"><button onClick={() => setModele(null)} className="kb-btn kb-btn-ghost">Annuler</button><button onClick={enregistrerModele} className="kb-btn kb-btn-primary"><Check size={15} /> Enregistrer</button></div>
      </Modal>}
    </div>
  );
}

/* Bouton « Envoyer » des documents : WhatsApp ou e-mail */
export function BoutonEnvoyer({ doc, store, me }) {
  const [ouvert, setOuvert] = useState(false);
  return (<>
    <button onClick={() => setOuvert(true)} className="kb-btn text-sm" style={{ background: "#128C4B", color: "#fff" }}><Send size={15} /> Envoyer (WhatsApp, e-mail)</button>
    {ouvert && <EnvoiDocument doc={doc} store={store} me={me} onClose={() => setOuvert(false)} />}
  </>);
}
