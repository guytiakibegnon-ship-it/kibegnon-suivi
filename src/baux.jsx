/* ============================================================================
 *  ENTREPRISE KIBEGNON · SUIVI D'ÉQUIPE — registre des baux (version 38)
 *  · Chaque bail reçoit un code unique (BL-AAAA-NNNN) attribué par la base.
 *  · Alertes de suivi : échéance, renouvellement, bail professionnel,
 *    enregistrement, révision du loyer, locataire sans bail, incohérences
 *    avec la fiche du lot.
 *  · Section « Baux » du dossier de chaque locataire.
 *  Tables : migration-v38.sql. Règles : baux.js.
 * ==========================================================================*/
import { useState, useMemo } from "react";
import { AlertTriangle, Check, FileSignature, MessageCircle, Pencil, Plus, Printer, RefreshCw, Search, Trash2, Wand2, XCircle } from "lucide-react";
import { supabase } from "./supabaseClient";
import { Modal, Field, Chip, StatCard, SectionCard, EmptyState, PrintPage, PrintHead, printSheet, fcfa, inputCls, inputStyle, nomFichier } from "./App.jsx";
import { USAGES, STATUTS_BAIL, NIVEAUX_BAIL, mBail, versBase, validerBail, alertesBail, suiviBaux, bailDepuisLot, bailRenouvele, finDuBail, bailActif, fmtDate, jourIso } from "./baux.js";
import { EnvoiMessage } from "./WhatsApp.jsx";

const INSTALL = "Le registre des baux n'est pas encore installé : exécutez migration-v38.sql dans Supabase.";
const msgErreur = (e) => (/does not exist|schema cache|Could not find/i.test(e?.message || "") ? INSTALL : e?.message || "Erreur inconnue");
const SUP = ["admin", "gerante", "responsable_admin"];

/* Enregistre un bail ; un bail en cours met à jour les dates de la fiche du lot (tout concorde) */
export async function enregistrerBail(f) {
  const erreurs = validerBail(f);
  if (erreurs.length) return { error: erreurs.join(" ") };
  const row = versBase(f);
  const { data, error } = f.id ? await supabase.from("leases").update(row).eq("id", f.id).select().single()
    : await supabase.from("leases").insert(row).select().single();
  if (error) return { error: msgErreur(error) };
  /* Une date inconnue au bail n'efface jamais celle de la fiche */
  const dates = { ...(data.starts_on ? { lease_start: data.starts_on } : {}), ...(data.ends_on ? { lease_end: data.ends_on } : {}) };
  if (data.status === "en_cours" && data.unit_id && Object.keys(dates).length) await supabase.from("units").update(dates).eq("id", data.unit_id);
  if (f.previousId && data.status === "en_cours") await supabase.from("leases").update({ status: "renouvele" }).eq("id", f.previousId).neq("status", "renouvele");
  return { bail: mBail(data) };
}

/* ══ Formulaire d'un bail ══ */
export function BailModal({ initial, store, onClose, onSaved }) {
  const [f, setF] = useState(() => ({ usage: "habitation", durationMonths: 12, tacitRenewal: true, depositMonths: 2, advanceMonths: 2, status: "en_cours", ...initial,
    endsOn: initial?.endsOn || finDuBail(initial?.startsOn, initial?.durationMonths ?? 12) }));
  const [finManuelle, setFinManuelle] = useState(!!initial?.id);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => {
    const n = { ...p, [k]: v };
    if (!finManuelle && (k === "startsOn" || k === "durationMonths")) n.endsOn = finDuBail(n.startsOn, n.durationMonths);
    return n;
  });
  const lots = (store?.units || []).map((u) => ({ u, p: (store?.properties || []).find((x) => x.id === u.propertyId) }))
    .sort((a, b) => `${a.p?.name}${a.u.label}`.localeCompare(`${b.p?.name}${b.u.label}`));
  const choisirLot = (id) => {
    const u = (store?.units || []).find((x) => x.id === id);
    setF((p) => ({ ...p, unitId: id, propertyId: u?.propertyId || "", ...(u && !p.id ? { tenantName: u.tenantName || p.tenantName, tenantPhone: u.tenantPhone || p.tenantPhone, tenantEmail: u.tenantEmail || p.tenantEmail, rent: u.rent || p.rent } : {}) }));
  };
  const erreurs = validerBail(f);
  const enregistrer = async () => {
    setBusy(true); setErr("");
    const r = await enregistrerBail(f);
    setBusy(false);
    if (r.error) return setErr(r.error);
    onSaved?.(r.bail); onClose(r.bail);
  };
  const num = (k, props = {}) => <input type="number" min={0} className={inputCls} style={inputStyle} value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} {...props} />;
  return (
    <Modal title={f.id ? `Bail ${f.ref}` : f.previousId ? "Renouvellement du bail" : "Nouveau bail"} onClose={() => onClose()} wide>
      {!f.id && <p className="text-xs mb-3 rounded-lg p-2" style={{ background: "#EFF6FF", color: "#1F5C82" }}>Le code du bail (BL-année-numéro) est attribué à l'enregistrement et ne change plus.</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Lot loué"><select className={inputCls} style={inputStyle} value={f.unitId || ""} onChange={(e) => choisirLot(e.target.value)} aria-label="Lot loué">
          <option value="">— Choisir le lot —</option>
          {lots.map(({ u, p }) => <option key={u.id} value={u.id}>{p?.name || "?"} — {u.label}{u.tenantName ? ` (${u.tenantName})` : " (vacant)"}</option>)}</select></Field>
        <Field label="Usage"><select className={inputCls} style={inputStyle} value={f.usage} onChange={(e) => set("usage", e.target.value)}>
          {Object.entries(USAGES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Locataire (nom et prénoms) *"><input className={inputCls} style={inputStyle} value={f.tenantName || ""} onChange={(e) => set("tenantName", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Téléphone"><input className={inputCls} style={inputStyle} value={f.tenantPhone || ""} onChange={(e) => set("tenantPhone", e.target.value)} /></Field>
          <Field label="E-mail"><input type="email" className={inputCls} style={inputStyle} value={f.tenantEmail || ""} onChange={(e) => set("tenantEmail", e.target.value)} /></Field>
        </div>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2 mt-1" style={{ color: "var(--muted)" }}>Durée</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Signé le"><input type="date" className={inputCls} style={inputStyle} value={f.signedOn || ""} onChange={(e) => set("signedOn", e.target.value)} /></Field>
        <Field label="Prise d'effet *"><input type="date" className={inputCls} style={inputStyle} value={f.startsOn || ""} onChange={(e) => set("startsOn", e.target.value)} aria-label="Prise d'effet" /></Field>
        <Field label="Durée (mois)"><select className={inputCls} style={inputStyle} value={f.durationMonths} onChange={(e) => set("durationMonths", Number(e.target.value))}>
          {[[6, "6 mois"], [12, "1 an"], [24, "2 ans"], [36, "3 ans"], [60, "5 ans"], [72, "6 ans"], [108, "9 ans"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          {![6, 12, 24, 36, 60, 72, 108].includes(Number(f.durationMonths)) && <option value={f.durationMonths}>{f.durationMonths} mois</option>}</select></Field>
        <Field label="Fin du bail" hint={finManuelle ? <button type="button" className="underline" onClick={() => { setFinManuelle(false); set("endsOn", finDuBail(f.startsOn, f.durationMonths)); }}>recalculer</button> : "calculée"}>
          <input type="date" className={inputCls} style={inputStyle} value={f.endsOn || ""} onChange={(e) => { setFinManuelle(true); setF((p) => ({ ...p, endsOn: e.target.value })); }} aria-label="Fin du bail" /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer"><input type="checkbox" checked={f.tacitRenewal !== false} onChange={(e) => set("tacitRenewal", e.target.checked)} /> Reconduction tacite prévue au contrat</label>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--muted)" }}>Conditions financières</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Loyer mensuel (F CFA) *">{num("rent", { step: 5000, "aria-label": "Loyer mensuel du bail" })}</Field>
        <Field label="Caution (mois)">{num("depositMonths", { step: 0.5 })}</Field>
        <Field label="Avance (mois)">{num("advanceMonths", { step: 0.5 })}</Field>
        <Field label="Dernière révision du loyer"><input type="date" className={inputCls} style={inputStyle} value={f.lastRevisionOn || ""} onChange={(e) => set("lastRevisionOn", e.target.value)} /></Field>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--muted)" }}>Enregistrement et état</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Enregistré aux impôts le"><input type="date" className={inputCls} style={inputStyle} value={f.registeredOn || ""} onChange={(e) => set("registeredOn", e.target.value)} /></Field>
        <Field label="Référence d'enregistrement"><input className={inputCls} style={inputStyle} value={f.registrationRef || ""} onChange={(e) => set("registrationRef", e.target.value)} placeholder="N° de quittance, folio…" /></Field>
        <Field label="État du bail"><select className={inputCls} style={inputStyle} value={f.status} onChange={(e) => set("status", e.target.value)}>
          {Object.entries(STATUTS_BAIL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
        {["resilie", "expire"].includes(f.status) && <Field label="Fin effective le"><input type="date" className={inputCls} style={inputStyle} value={f.endedOn || ""} onChange={(e) => set("endedOn", e.target.value)} /></Field>}
      </div>
      <Field label="Observations"><textarea rows={2} className={inputCls} style={inputStyle} value={f.notes || ""} onChange={(e) => set("notes", e.target.value)} /></Field>
      {erreurs.length > 0 && <div className="text-xs rounded-lg p-2 mb-2" style={{ background: "#FFF8EC", color: "#8A6212" }}>{erreurs.map((e) => <p key={e}>• {e}</p>)}</div>}
      {err && <p className="text-xs mb-2 flex items-center gap-1" style={{ color: "#B5171D" }}><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={() => onClose()} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={busy || erreurs.length > 0} onClick={enregistrer} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={15} /> {busy ? "Enregistrement…" : "Enregistrer le bail"}</button>
      </div>
    </Modal>
  );
}

/* Fin d'un bail : à l'échéance ou par résiliation */
function FinBailModal({ bail, onClose }) {
  const [statut, setStatut] = useState("expire"); const [date, setDate] = useState(bail.endsOn && bail.endsOn <= jourIso() ? bail.endsOn : jourIso());
  const [motif, setMotif] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const go = async () => {
    setBusy(true);
    const { error } = await supabase.from("leases").update({ status: statut, ended_on: date, notes: [bail.notes, motif && `Fin : ${motif}`].filter(Boolean).join("\n") }).eq("id", bail.id);
    setBusy(false);
    if (error) setErr(msgErreur(error)); else onClose(true);
  };
  return (
    <Modal title={`Fin du bail ${bail.ref}`} onClose={() => onClose(false)}>
      <Field label="Le bail prend fin"><select className={inputCls} style={inputStyle} value={statut} onChange={(e) => setStatut(e.target.value)}>
        <option value="expire">À son échéance (congé, non-renouvellement)</option><option value="resilie">Par résiliation (départ anticipé, décision de justice…)</option></select></Field>
      <Field label="Date de fin effective"><input type="date" className={inputCls} style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Motif (facultatif)"><input className={inputCls} style={inputStyle} value={motif} onChange={(e) => setMotif(e.target.value)} /></Field>
      <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>Le départ du locataire (solde de tout compte, caution, archivage) se fait dans Locataires.</p>
      {err && <p className="text-xs mb-2" style={{ color: "#B5171D" }}>{err}</p>}
      <div className="flex justify-end gap-2"><button onClick={() => onClose(false)} className="kb-btn kb-btn-ghost">Annuler</button><button disabled={busy} onClick={go} className="kb-btn kb-btn-primary"><Check size={15} /> Enregistrer la fin</button></div>
    </Modal>
  );
}

const PastilleAlerte = ({ a }) => { const n = NIVEAUX_BAIL[a.niveau]; return <span className="inline-block text-[10px] font-semibold rounded-full px-2 py-0.5 mr-1 mb-1" style={{ background: n.bg, color: n.color }} title={a.detail}>{a.titre}</span>; };

/* Envoi WhatsApp ou e-mail au locataire au sujet de son bail */
const envoiBail = (b, bien) => ({ titre: `Bail ${b.ref} — ${b.tenantName}`, modeleInitial: "fin_bail",
  destinataires: [{ nom: b.tenantName, telephone: b.tenantPhone, email: b.tenantEmail, kind: "locataire", fiche: b.unitId ? { table: "units", id: b.unitId, champTel: "tenant_phone", champMail: "tenant_email" } : null }],
  valeurs: { code_bail: b.ref, fin_bail: fmtDate(b.endsOn), bien, loyer: fcfa(b.rent) }, journal: { unitId: b.unitId, leaseId: b.id } });

/* ══ REGISTRE DES BAUX ══ */
export function RegistreBaux({ store, me, onOpenDossier }) {
  const baux = useMemo(() => (store.leases || []), [store.leases]);
  const sup = SUP.includes(me?.role);
  const [filtre, setFiltre] = useState("suivre"); const [q, setQ] = useState("");
  const [modal, setModal] = useState(null); const [fin, setFin] = useState(null); const [envoi, setEnvoi] = useState(null);
  const [imprimer, setImprimer] = useState(false); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const propName = (id) => (store.properties || []).find((p) => p.id === id)?.name || "";
  const lotLabel = (id) => (store.units || []).find((u) => u.id === id)?.label || "";
  const suivi = useMemo(() => suiviBaux({ baux, units: store.units || [], properties: store.properties || [] }), [baux, store.units, store.properties]);
  const recharger = async () => { await store.actions?.reloadLeases?.(); };
  const fermer = async (ok) => { setModal(null); setFin(null); if (ok) await recharger(); };
  const sansBail = suivi.filter((a) => a.code === "sans_bail");
  const creerManquants = async () => {
    if (!window.confirm(`Créer ${sansBail.length} bail(s) à partir des fiches des lots occupés ?\n\nLes dates reprises de la fiche sont à vérifier ; la signature et l'enregistrement restent à compléter.`)) return;
    setBusy(true); let n = 0; const ko = [];
    for (const a of sansBail) {
      const u = (store.units || []).find((x) => x.id === a.unitId);
      const f = bailDepuisLot(u);
      if (!f.startsOn) { ko.push(`${u.tenantName} (${u.label}) : date d'entrée inconnue`); continue; }
      const r = await enregistrerBail(f);
      if (r.error) ko.push(`${u.tenantName} : ${r.error}`); else n += 1;
    }
    setBusy(false); await recharger();
    setMsg(`${n} bail(s) créé(s).${ko.length ? ` À créer à la main (${ko.length}) : ${ko.slice(0, 5).join(" ; ")}${ko.length > 5 ? "…" : ""}` : ""}`);
  };
  const supprimer = async (b) => {
    if (!window.confirm(`Supprimer définitivement le bail ${b.ref} ?`)) return;
    const { data, error } = await supabase.from("leases").delete().eq("id", b.id).select();
    if (error || !data?.length) setMsg(error ? msgErreur(error) : "Suppression réservée à la direction."); else recharger();
  };
  const alertesDe = (b) => suivi.filter((a) => a.bailId === b.id);
  const liste = baux.filter((b) => (filtre === "tous" || (filtre === "suivre" ? alertesDe(b).some((a) => a.niveau !== "info") : filtre === "actifs" ? bailActif(b) : !bailActif(b)))
    && (!q.trim() || `${b.ref} ${b.tenantName} ${propName(b.propertyId)} ${lotLabel(b.unitId)}`.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => (a.endsOn || "9999").localeCompare(b.endsOn || "9999"));
  const rouges = suivi.filter((a) => a.niveau === "rouge").length;
  const aRenouveler = baux.filter((b) => alertesBail(b).some((a) => ["fin_30", "fin_90", "echu"].includes(a.code))).length;
  const nonEnreg = suivi.filter((a) => a.code === "non_enregistre").length;

  if (imprimer) return (
    <div>
      <div className="flex justify-between mb-3 print:hidden"><button onClick={() => setImprimer(false)} className="kb-btn kb-btn-ghost text-sm">Retour</button>
        <button onClick={() => printSheet("landscape")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF</button></div>
      <PrintPage className="bg-white rounded-xl border p-5" style={{ borderColor: "var(--line)" }} nom={nomFichier("Registre des baux", fmtDate(jourIso()).replace(/\//g, "-"))}>
        <PrintHead title="REGISTRE DES BAUX" subtitle={`Arrêté au ${fmtDate(jourIso())}`} />
        <table className="w-full text-[11px] mt-3"><thead><tr style={{ background: "#F1F3F5" }}>
          {["Code", "Locataire", "Bien — lot", "Usage", "Effet", "Fin", "Loyer", "Caution / avance", "Enregistrement", "État"].map((h) => <th key={h} className="text-left px-1.5 py-1.5 font-semibold">{h}</th>)}</tr></thead>
          <tbody>{baux.slice().sort((a, b) => a.ref.localeCompare(b.ref)).map((b) => (
            <tr key={b.id} className="border-b" style={{ borderColor: "var(--line)" }}>
              <td className="px-1.5 py-1 font-mono">{b.ref}</td><td className="px-1.5 py-1">{b.tenantName}</td><td className="px-1.5 py-1">{propName(b.propertyId)} — {lotLabel(b.unitId)}</td>
              <td className="px-1.5 py-1">{b.usage === "professionnel" ? "Pro." : "Hab."}</td><td className="px-1.5 py-1">{fmtDate(b.startsOn)}</td><td className="px-1.5 py-1">{fmtDate(b.endsOn)}</td>
              <td className="px-1.5 py-1 text-right tabular-nums">{fcfa(b.rent)}</td><td className="px-1.5 py-1">{b.depositMonths} / {b.advanceMonths} mois</td>
              <td className="px-1.5 py-1">{b.registeredOn ? `${fmtDate(b.registeredOn)} ${b.registrationRef}` : "—"}</td><td className="px-1.5 py-1">{STATUTS_BAIL[b.status]?.label}</td></tr>))}</tbody></table>
      </PrintPage>
    </div>
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
        <div><h1 className="text-xl font-bold flex items-center gap-2"><FileSignature size={20} style={{ color: "var(--brass)" }} /> Registre des baux</h1>
          <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>Un code unique par bail, ses dates et ses alertes : chaque dossier locataire est suivi jusqu'au renouvellement.</p></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setImprimer(true)} className="kb-btn kb-btn-ghost text-sm"><Printer size={15} /> Imprimer le registre</button>
          <button onClick={() => setModal({})} className="kb-btn kb-btn-primary text-sm"><Plus size={15} /> Nouveau bail</button>
        </div>
      </div>
      {store.leasesError && <p className="text-sm rounded p-3 mb-3" style={{ background: "#FFF8EC", color: "#8A6212" }}>{store.leasesError}</p>}
      {msg && <p className="text-sm rounded p-2 mb-3" role="status" style={{ background: "#EFF6FF", color: "#1F5C82" }}>{msg}</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={FileSignature} label="Baux en cours" value={baux.filter((b) => b.status === "en_cours").length} tint="#2F6B1A" onClick={() => setFiltre("actifs")} />
        <StatCard icon={AlertTriangle} label="Points urgents" value={rouges} tint="#B5171D" onClick={() => setFiltre("suivre")} />
        <StatCard icon={RefreshCw} label="À renouveler (90 jours)" value={aRenouveler} tint="#B7791F" onClick={() => setFiltre("suivre")} />
        <StatCard icon={XCircle} label="Non enregistrés" value={nonEnreg} tint="#64748B" />
      </div>
      {sansBail.length > 0 && (
        <div className="rounded-xl border p-3 mb-4" style={{ borderColor: "#F5C6C7", background: "#FDF2F2" }}>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="text-sm" style={{ color: "#B5171D" }}><AlertTriangle size={14} className="inline mb-0.5" /> <strong>{sansBail.length} locataire(s) en place sans bail au registre</strong> : {sansBail.slice(0, 6).map((a) => a.nom).join(", ")}{sansBail.length > 6 ? "…" : ""}.</p>
            {sup && <button disabled={busy} onClick={creerManquants} className="kb-btn kb-btn-primary text-xs disabled:opacity-40"><Wand2 size={13} /> {busy ? "Création…" : "Créer les baux depuis les fiches des lots"}</button>}
          </div>
        </div>)}
      <div className="flex flex-wrap gap-2 mb-3">
        {[["suivre", "À suivre"], ["actifs", "En cours"], ["termines", "Terminés"], ["tous", "Tous"]].map(([k, l]) => (
          <button key={k} onClick={() => setFiltre(k)} className="text-sm rounded-full px-3 py-1 border" style={{ background: filtre === k ? "var(--ink)" : "#fff", color: filtre === k ? "#fff" : "var(--ink)", borderColor: filtre === k ? "transparent" : "var(--line)" }}>{l}</button>))}
        <div className="relative flex-1 min-w-[200px]"><Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code, locataire, bâtiment, lot…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} /></div>
      </div>
      {!liste.length ? <EmptyState icon={FileSignature} title={baux.length ? "Aucun bail pour ce filtre" : "Aucun bail enregistré"} sub={baux.length ? "Changez de filtre pour voir les autres baux." : "Créez les baux des locataires en place pour suivre leurs échéances."} /> : (
        <div className="bg-white rounded-xl border overflow-x-auto" style={{ borderColor: "var(--line)" }}><table className="w-full text-sm">
          <thead><tr className="text-left text-xs" style={{ color: "var(--muted)" }}>
            <th className="px-3 py-2 font-medium">Code</th><th className="px-3 py-2 font-medium">Locataire</th><th className="px-3 py-2 font-medium">Bien</th>
            <th className="px-3 py-2 font-medium">Période</th><th className="px-3 py-2 font-medium text-right">Loyer</th><th className="px-3 py-2 font-medium">Suivi</th><th className="px-3 py-2" /></tr></thead>
          <tbody>{liste.map((b) => { const st = STATUTS_BAIL[b.status]; const al = alertesDe(b);
            return (
              <tr key={b.id} className="border-t align-top" style={{ borderColor: "var(--line)" }}>
                <td className="px-3 py-2 text-xs whitespace-nowrap"><span className="font-mono font-semibold">{b.ref}</span><br /><Chip color={st.color}>{st.label}</Chip></td>
                <td className="px-3 py-2"><p className="font-medium">{b.tenantName}</p><p className="text-[11px]" style={{ color: "var(--muted)" }}>{USAGES[b.usage]}</p></td>
                <td className="px-3 py-2 text-xs">{propName(b.propertyId)}<br /><span style={{ color: "var(--muted)" }}>{lotLabel(b.unitId)}</span></td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">du {fmtDate(b.startsOn)}<br />au {fmtDate(b.endsOn)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-xs">{fcfa(b.rent)}</td>
                <td className="px-3 py-2 max-w-[22rem]">{al.length ? al.map((a, i) => <PastilleAlerte key={i} a={a} />) : <span className="text-xs" style={{ color: "#2F6B1A" }}><Check size={12} className="inline" /> à jour</span>}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <div className="flex gap-1 justify-end flex-wrap">
                    <button onClick={() => setModal(b)} className="p-1.5 rounded hover:bg-slate-100" title="Ouvrir le bail" aria-label={`Ouvrir le bail ${b.ref}`}><Pencil size={14} /></button>
                    {bailActif(b) && <button onClick={() => setModal(bailRenouvele(b))} className="p-1.5 rounded hover:bg-slate-100" title="Renouveler" aria-label={`Renouveler le bail ${b.ref}`}><RefreshCw size={14} /></button>}
                    {bailActif(b) && <button onClick={() => setFin(b)} className="p-1.5 rounded hover:bg-slate-100" title="Fin du bail" aria-label={`Fin du bail ${b.ref}`}><XCircle size={14} /></button>}
                    <button onClick={() => setEnvoi(envoiBail(b, [propName(b.propertyId), lotLabel(b.unitId)].filter(Boolean).join(" — ")))} className="p-1.5 rounded hover:bg-slate-100" title="Écrire au locataire (WhatsApp, e-mail)" aria-label={`Écrire à ${b.tenantName}`}><MessageCircle size={14} style={{ color: "#128C4B" }} /></button>
                    {onOpenDossier && b.unitId && <button onClick={() => onOpenDossier(b.unitId)} className="text-xs underline px-1" style={{ color: "#2E78A8" }}>dossier</button>}
                    {sup && <button onClick={() => supprimer(b)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Supprimer" aria-label={`Supprimer le bail ${b.ref}`}><Trash2 size={14} /></button>}
                  </div></td>
              </tr>); })}</tbody></table></div>)}
      {suivi.filter((a) => !a.bailId && a.code !== "sans_bail").length > 0 && (
        <SectionCard title="Autres points de cohérence" icon={AlertTriangle}>
          {suivi.filter((a) => !a.bailId && a.code !== "sans_bail").map((a, i) => <p key={i} className="text-sm mb-1"><PastilleAlerte a={a} /> <span className="text-xs" style={{ color: "var(--muted)" }}>{a.detail}</span></p>)}
        </SectionCard>)}
      {modal && <BailModal initial={modal} store={store} onClose={fermer} onSaved={() => setMsg("Bail enregistré.")} />}
      {fin && <FinBailModal bail={fin} onClose={fermer} />}
      {envoi && <EnvoiMessage {...envoi} store={store} me={me} onClose={() => setEnvoi(null)} />}
    </div>
  );
}

/* ══ Section « Baux » du dossier d'un locataire ══ */
export function BauxDuLot({ store, me, unit, property }) {
  const baux = (store.leases || []).filter((b) => b.unitId === unit?.id).sort((a, b) => (b.startsOn || "").localeCompare(a.startsOn || ""));
  const [modal, setModal] = useState(null); const [envoi, setEnvoi] = useState(null);
  const fermer = async (ok) => { setModal(null); if (ok) await store.actions?.reloadLeases?.(); };
  const actif = baux.find(bailActif);
  return (
    <SectionCard title={`Baux (${baux.length})`} icon={FileSignature} action={<button onClick={() => setModal(actif ? bailRenouvele(actif) : bailDepuisLot(unit))} className="kb-btn kb-btn-ghost text-xs"><Plus size={13} /> {actif ? "Renouveler" : "Nouveau bail"}</button>}>
      {store.leasesError && <p className="text-xs mb-2" style={{ color: "#8A6212" }}>{store.leasesError}</p>}
      {!baux.length ? <p className="text-sm" style={{ color: "#B5171D" }}><AlertTriangle size={14} className="inline mb-0.5" /> Aucun bail au registre pour ce locataire : créez-le pour suivre son échéance.</p> : (
        <div className="divide-y" style={{ borderColor: "var(--line)" }}>{baux.map((b) => { const al = alertesBail(b); const st = STATUTS_BAIL[b.status];
          return (
            <div key={b.id} className="py-2 flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm"><span className="font-mono font-semibold">{b.ref}</span> <Chip color={st.color}>{st.label}</Chip> <span className="text-xs" style={{ color: "var(--muted)" }}>{USAGES[b.usage]}</span></p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Du {fmtDate(b.startsOn)} au {fmtDate(b.endsOn)} · loyer {fcfa(b.rent)} · caution {b.depositMonths} mois · avance {b.advanceMonths} mois{b.registeredOn ? ` · enregistré le ${fmtDate(b.registeredOn)}` : ""}</p>
                <div className="mt-1">{al.map((a, i) => <PastilleAlerte key={i} a={a} />)}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setModal(b)} className="kb-btn kb-btn-ghost text-xs"><Pencil size={12} /> Ouvrir</button>
                <button onClick={() => setEnvoi(envoiBail(b, [property?.name, unit?.label].filter(Boolean).join(" — ")))} className="kb-btn kb-btn-ghost text-xs" style={{ color: "#128C4B" }}><MessageCircle size={12} /> Écrire</button>
              </div>
            </div>); })}</div>)}
      {modal && <BailModal initial={modal} store={store} onClose={fermer} />}
      {envoi && <EnvoiMessage {...envoi} store={store} me={me} onClose={() => setEnvoi(null)} />}
    </SectionCard>
  );
}
