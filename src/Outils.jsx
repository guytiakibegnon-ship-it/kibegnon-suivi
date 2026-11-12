/* ============================================================================
 *  ENTREPRISE KIBEGNON · SUIVI D'ÉQUIPE — outils commerciaux (version 37)
 *  · Solvabilité : étude du dossier d'un candidat locataire (habitation ou
 *    professionnel), note sur 100, avis, fiche imprimable.
 *  · Fiches de renseignements : deux QR codes (locataire, propriétaire),
 *    réponses reçues du formulaire public, suivi de leur traitement.
 *  · Mandats : gestion, vente exclusif, vente non exclusif, pré-remplis.
 *  · Courriels : écrire à un locataire ou à un propriétaire depuis sa fiche.
 *  Chargé à la demande depuis App.jsx. Tables : migration-v37.sql.
 * ==========================================================================*/
import { useState, useEffect, useMemo, useCallback } from "react";
import { AlertTriangle, ArrowLeft, Check, Copy, ExternalLink, FileSignature, Mail, Pencil, Plus, Printer, QrCode, RefreshCw, Search, Send, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { supabase } from "./supabaseClient";
import { Modal, Field, Chip, StatCard, SectionCard, EmptyState, PrintPage, PrintHead, printSheet, fcfa, inputCls, inputStyle, AGENCY, amountInWords, LOGO, LOGO_AGREMENT } from "./App.jsx";
import { evaluerSolvabilite, antecedentsAgence, STATUTS_PRO, HISTORIQUES, GARANTIES, PIECES_HAB, PIECES_PRO, VERDICTS } from "./solvabilite.js";
import { FICHES } from "./fiches-def.js";
import { MANDATS, defautsMandat, redigerMandat, blocsMandat, echeanceMandat, dateLongue } from "./mandats-modeles.js";
import { matriceQR } from "./qr.js";

const fmt = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "—");
const today = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; };
const milliers = (x) => Math.round(Number(x) || 0).toLocaleString("fr-FR").replace(new RegExp("[\\u202f\\u00a0]", "g"), " ");
const INSTALL = "Cet outil n'est pas encore installé : exécutez migration-v37.sql dans Supabase.";
const msgErreur = (e) => (/does not exist|schema cache|Could not find/i.test(e?.message || "") ? INSTALL : e?.message || "Erreur inconnue");
const Avis = ({ tone = "orange", children }) => { const c = { orange: ["#FFF8EC", "#F3E2C6", "#8A6212"], rouge: ["#FDECEC", "#F5C6C7", "#B5171D"], info: ["#EFF6FF", "#BFDBFE", "#1F5C82"], vert: ["#EAF6E3", "#CDE7C0", "#2F6B1A"] }[tone];
  return <div className="rounded-lg border px-3 py-2 text-sm mb-3" style={{ background: c[0], borderColor: c[1], color: c[2] }}>{children}</div>; };
const Barre = ({ onBack, children }) => (
  <div className="flex flex-wrap items-center justify-between mb-3 print:hidden gap-2">
    <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour</button>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);
/* Chargement d'une table avec ses actions courantes */
function useTable(table, ordre = "created_at") {
  const [rows, setRows] = useState([]); const [etat, setEtat] = useState("chargement"); const [erreur, setErreur] = useState("");
  const charger = useCallback(async () => {
    const { data, error } = await supabase.from(table).select("*").order(ordre, { ascending: false }).limit(1000);
    if (error) { setErreur(msgErreur(error)); setEtat("erreur"); return; }
    setRows(data || []); setErreur(""); setEtat("pret");
  }, [table, ordre]);
  useEffect(() => { charger(); }, [charger]);
  return { rows, etat, erreur, charger };
}
const Num = ({ value, onChange, ...p }) => <input className={inputCls} style={inputStyle} inputMode="numeric" value={value ?? ""} onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))} {...p} />;
const Txt = ({ value, onChange, ...p }) => <input className={inputCls} style={inputStyle} value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...p} />;
const Sel = ({ value, onChange, options, vide, ...p }) => (
  <select className={inputCls} style={inputStyle} value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...p}>
    {vide !== undefined && <option value="">{vide}</option>}
    {(Array.isArray(options) ? options.map((o) => (Array.isArray(o) ? o : [o, o])) : Object.entries(options)).map(([k, l]) => <option key={k} value={k}>{typeof l === "string" ? l : l.label}</option>)}
  </select>
);

/* ══════════════════════════════════════════════════════════════════════
   1. SOLVABILITÉ
   ══════════════════════════════════════════════════════════════════════ */
const DECISIONS = { en_etude: { label: "En étude", color: "#64748B" }, accepte: { label: "Dossier accepté", color: "#2F6B1A" }, accepte_garanties: { label: "Accepté avec garanties", color: "#1F5C82" },
  refuse: { label: "Dossier refusé", color: "#B5171D" }, sans_suite: { label: "Sans suite", color: "#94A3B8" } };
const dossierVide = () => ({ usage: "habitation", candidat: "", telephone: "", email: "", loyer: "", charges: "", personnes: 1, statut: "cdi", historique: "aucun", garantie: "aucune", pieces: {}, consentement: false });

function FicheSolvabilite({ f, r, bien, auteur }) {
  const V = VERDICTS[r.verdict]; const td = "px-2 py-1 border align-top"; const bc = { borderColor: "#C9D1DA" };
  const D = DECISIONS[f.decision || "en_etude"];
  return (
    <div className="text-[11.5px]" style={{ color: "#111827" }}>
      <PrintHead title="ÉTUDE DE SOLVABILITÉ" subtitle={`${r.usage === "professionnel" ? "Bail à usage professionnel" : "Bail à usage d'habitation"}${f.ref ? ` — ${f.ref}` : ""}`} />
      <table className="w-full border-collapse mt-3"><tbody>
        <tr><td className={td} style={{ ...bc, width: "32%" }}>Candidat</td><td className={`${td} font-semibold`} style={bc}>{f.candidat || "—"}{f.telephone ? ` — ${f.telephone}` : ""}{f.email ? ` — ${f.email}` : ""}</td></tr>
        <tr><td className={td} style={bc}>Bien demandé</td><td className={td} style={bc}>{bien || "—"}</td></tr>
        <tr><td className={td} style={bc}>Loyer et charges mensuels</td><td className={td} style={bc}>{fcfa(r.loyer)}</td></tr>
        {r.usage === "habitation"
          ? <tr><td className={td} style={bc}>Revenus mensuels retenus</td><td className={td} style={bc}>{fcfa(r.chiffres.revenus || 0)} — loyer conseillé au plus : {fcfa(r.chiffres.loyerMax || 0)}</td></tr>
          : <tr><td className={td} style={bc}>Chiffre d'affaires mensuel</td><td className={td} style={bc}>{fcfa(r.chiffres.ca || 0)} — excédent avant loyer : {fcfa(r.chiffres.excedent || 0)}</td></tr>}
      </tbody></table>
      <div className="flex items-center gap-4 mt-3 p-3 rounded-lg" style={{ background: V.bg, border: `1px solid ${V.color}33`, breakInside: "avoid" }}>
        <div className="text-center" style={{ minWidth: 92 }}><p className="text-[30px] font-bold leading-none" style={{ color: V.color }}>{r.score}</p><p className="text-[10px]" style={{ color: V.color }}>sur 100</p></div>
        <div><p className="text-[14px] font-bold" style={{ color: V.color }}>Avis : {V.label}{r.incomplet ? " — dossier incomplet" : ""}</p><p>{V.conseil}</p></div>
      </div>
      <p className="font-semibold mt-3 mb-1">Détail de la note</p>
      <table className="w-full border-collapse"><thead><tr style={{ background: "#F1F3F5" }}><th className={`${td} text-left`} style={bc}>Critère</th><th className={`${td} text-right`} style={{ ...bc, width: 70 }}>Points</th><th className={`${td} text-left`} style={bc}>Constat</th></tr></thead>
        <tbody>{r.criteres.map((c) => <tr key={c.libelle}><td className={td} style={bc}>{c.libelle}</td><td className={`${td} text-right tabular-nums`} style={bc}>{c.points} / {c.max}</td><td className={td} style={bc}>{c.detail}</td></tr>)}</tbody></table>
      {r.alertes.length > 0 && <><p className="font-semibold mt-3 mb-1">Points d'attention</p><ul className="list-disc pl-5">{r.alertes.map((a) => <li key={a}>{a}</li>)}</ul></>}
      <p className="font-semibold mt-3 mb-1">Recommandations</p><ul className="list-disc pl-5">{r.recommandations.map((a) => <li key={a}>{a}</li>)}</ul>
      <p className="mt-3"><b>Décision de l'agence :</b> {D.label}{f.decisionNote ? ` — ${f.decisionNote}` : ""}</p>
      <p className="mt-2 text-[10px]" style={{ color: "#4B5563" }}>Note établie sur les déclarations et les pièces remises par le candidat, selon des critères identiques pour tous : capacité à payer, stabilité des revenus, pièces, passé locatif, garanties. Elle éclaire la décision de l'agence et du propriétaire ; elle ne la remplace pas. Données traitées avec l'accord du candidat (loi n° 2013-450 du 19 juin 2013).</p>
      <div className="grid grid-cols-2 gap-10 mt-6 text-center" style={{ breakInside: "avoid" }}>
        <div><p className="font-semibold">Dossier étudié par</p><p className="text-[10px]" style={{ color: "#4B5563" }}>{auteur || "…"} — le {fmt(today())}</p><div className="h-14" /></div>
        <div><p className="font-semibold">Visa de la direction</p><div className="h-14" /></div>
      </div>
    </div>
  );
}

export function Solvabilite({ store, me, prefill, onPrefillConsumed }) {
  const { rows, etat, erreur, charger } = useTable("solvency_files");
  const [edit, setEdit] = useState(null); const [q, setQ] = useState(""); const [toast, setToast] = useState("");
  useEffect(() => { if (prefill) { setEdit({ ...dossierVide(), ...prefill }); onPrefillConsumed?.(); } }, [prefill, onPrefillConsumed]);
  const admin = ["admin", "gerante", "responsable_admin"].includes(me.role);
  if (edit) return <EtudeSolvabilite initial={edit} store={store} me={me} admin={admin} onClose={async (m) => { setEdit(null); if (m) { setToast(m); await charger(); } }} />;
  const liste = rows.filter((r) => `${r.ref} ${r.candidate} ${r.phone}`.toLowerCase().includes(q.trim().toLowerCase()));
  const bien = (r) => { const p = store.properties.find((x) => x.id === r.property_id); const u = store.units.find((x) => x.id === r.unit_id); return [p?.name, u?.label].filter(Boolean).join(" — ") || r.data?.bienLibre || "—"; };
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div><h1 className="text-2xl font-bold">Solvabilité</h1><p className="text-sm" style={{ color: "var(--muted)" }}>Étude du dossier des candidats locataires : capacité à payer le loyer et niveau de risque.</p></div>
        <button onClick={() => setEdit(dossierVide())} className="kb-btn kb-btn-primary"><Plus size={16} /> Nouvelle étude</button>
      </div>
      {toast && <Avis tone="vert">{toast}</Avis>}
      {etat === "erreur" && <Avis tone="rouge">{erreur}</Avis>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={ShieldCheck} label="Études" value={rows.length} />
        <StatCard icon={Check} label="Avis favorables" value={rows.filter((r) => ["favorable", "garanties"].includes(r.verdict)).length} tint="#4F9E2A" />
        <StatCard icon={AlertTriangle} label="Réservés ou défavorables" value={rows.filter((r) => ["reserve", "defavorable"].includes(r.verdict)).length} tint="#C58A1B" />
        <StatCard icon={Search} label="En étude" value={rows.filter((r) => r.decision === "en_etude").length} tint="#2E78A8" />
      </div>
      <SectionCard title="Dossiers étudiés" icon={ShieldCheck} pad={false}
        action={<input className="px-3 py-1.5 rounded-lg border text-sm" style={inputStyle} placeholder="Rechercher un candidat…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un candidat" />}>
        {etat === "chargement" ? <p className="p-4 text-sm" style={{ color: "var(--muted)" }}>Chargement…</p> : liste.length === 0 ? <EmptyState icon={ShieldCheck} title="Aucune étude" sub="Créez une étude pour chaque candidat avant de signer un bail." /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-xs" style={{ color: "var(--muted)", background: "#F8FAFC" }}>{["Référence", "Candidat", "Bail", "Bien", "Loyer", "Note", "Avis", "Décision", "Date"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
            <tbody>{liste.map((r) => { const V = VERDICTS[r.verdict] || VERDICTS.reserve; const D = DECISIONS[r.decision] || DECISIONS.en_etude; return (
              <tr key={r.id} className="border-t cursor-pointer hover:bg-slate-50" style={{ borderColor: "var(--line)" }} onClick={() => setEdit({ ...dossierVide(), ...r.data, id: r.id, ref: r.ref, decision: r.decision, decisionNote: r.decision_note, propertyId: r.property_id || "", unitId: r.unit_id || "", formId: r.form_id || null })}>
                <td className="px-3 py-2 font-mono text-xs">{r.ref}</td><td className="px-3 py-2 font-medium">{r.candidate}<span className="block text-xs font-normal" style={{ color: "var(--muted)" }}>{r.phone}</span></td>
                <td className="px-3 py-2">{r.usage === "professionnel" ? "Professionnel" : "Habitation"}</td><td className="px-3 py-2">{bien(r)}</td>
                <td className="px-3 py-2 tabular-nums whitespace-nowrap">{fcfa(r.rent)}</td><td className="px-3 py-2 tabular-nums font-semibold">{r.score}</td>
                <td className="px-3 py-2"><Chip color={V.color} bg={V.bg}>{V.label}</Chip></td><td className="px-3 py-2"><Chip color={D.color} dot>{D.label}</Chip></td>
                <td className="px-3 py-2 whitespace-nowrap">{fmt(r.created_at)}</td>
              </tr>); })}</tbody>
          </table></div>)}
      </SectionCard>
    </div>
  );
}

function EtudeSolvabilite({ initial, store, me, admin, onClose }) {
  const [f, setF] = useState(initial); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [apercu, setApercu] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setPiece = (k, v) => setF((x) => ({ ...x, pieces: { ...x.pieces, [k]: v } }));
  const pro = f.usage === "professionnel";
  const r = useMemo(() => evaluerSolvabilite(f), [f]);
  const V = VERDICTS[r.verdict];
  const antecedents = useMemo(() => antecedentsAgence(f.candidat, f.telephone, { units: store.units, formerTenants: store.formerTenants || [], properties: store.properties }), [f.candidat, f.telephone, store.units, store.formerTenants, store.properties]);
  const lots = store.units.filter((u) => u.propertyId === f.propertyId);
  const choisirLot = (id) => { const u = store.units.find((x) => x.id === id); setF((x) => ({ ...x, unitId: id, ...(u && !Number(x.loyer) ? { loyer: String(Math.round(u.rent || 0)), charges: String(Math.round(u.charges || 0)) } : {}) })); };
  const bien = [store.properties.find((p) => p.id === f.propertyId)?.name, store.units.find((u) => u.id === f.unitId)?.label].filter(Boolean).join(" — ") || f.bienLibre || "";
  const enregistrer = async () => {
    if (!(f.candidat || "").trim()) return setErr("Indiquez le nom du candidat.");
    if (!f.consentement) return setErr("Cochez l'accord du candidat : son dossier ne peut être étudié et conservé qu'avec son consentement.");
    setBusy(true); setErr("");
    const { id, ref, decision, decisionNote, propertyId, unitId, formId, ...data } = f;
    const row = { usage: f.usage, candidate: f.candidat.trim(), phone: f.telephone || "", property_id: propertyId || null, unit_id: unitId || null, rent: r.loyer, data, result: r, score: r.score, verdict: r.verdict,
      decision: decision || "en_etude", decision_note: decisionNote || "", form_id: formId || null };
    const q = id ? supabase.from("solvency_files").update(row).eq("id", id).select().single() : supabase.from("solvency_files").insert(row).select().single();
    const { data: saved, error } = await q; setBusy(false);
    if (error) return setErr(msgErreur(error));
    setF((x) => ({ ...x, id: saved.id, ref: saved.ref }));
    return saved;
  };
  const supprimer = async () => {
    if (!window.confirm(`Supprimer définitivement l'étude ${f.ref} ?`)) return;
    const { data, error } = await supabase.from("solvency_files").delete().eq("id", f.id).select();
    if (error || !data?.length) return setErr(error ? msgErreur(error) : "Suppression réservée à la direction.");
    onClose("Étude supprimée.");
  };
  if (apercu) return (
    <div>
      <Barre onBack={() => setApercu(false)}><button onClick={() => printSheet("portrait")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF</button></Barre>
      <PrintPage className="bg-white rounded-xl border p-6 max-w-3xl" style={{ borderColor: "var(--line)" }}><FicheSolvabilite f={f} r={r} bien={bien} auteur={me.name} /></PrintPage>
    </div>
  );
  return (
    <div>
      <Barre onBack={() => onClose(f.id ? "Étude enregistrée." : "")}>
        {f.id && admin && <button onClick={supprimer} className="kb-btn kb-btn-ghost text-sm" style={{ color: "#D81F26" }}><Trash2 size={14} /> Supprimer</button>}
        <button onClick={async () => { const s = await enregistrer(); if (s) setApercu(true); }} disabled={busy} className="kb-btn kb-btn-ghost text-sm"><Printer size={14} /> Enregistrer et imprimer la fiche</button>
        <button onClick={async () => { const s = await enregistrer(); if (s) onClose(`Étude ${s.ref} enregistrée.`); }} disabled={busy} className="kb-btn kb-btn-primary"><Check size={16} /> {busy ? "Enregistrement…" : "Enregistrer"}</button>
      </Barre>
      <h1 className="text-xl font-bold mb-3">{f.ref ? `Étude ${f.ref}` : "Nouvelle étude de solvabilité"}</h1>
      {err && <Avis tone="rouge">{err}</Avis>}
      <div className="grid lg:grid-cols-[1fr_22rem] gap-4 items-start">
        <div>
          <SectionCard title="Candidat et bail" icon={UserPlus}>
            <div className="grid sm:grid-cols-2 gap-x-3">
              <Field label="Usage du bail"><Sel value={f.usage} onChange={(v) => set("usage", v)} options={{ habitation: "Habitation", professionnel: "Professionnel (bureau, commerce)" }} /></Field>
              <Field label={pro ? "Nom du candidat ou de l'entreprise *" : "Nom et prénoms du candidat *"}><Txt value={f.candidat} onChange={(v) => set("candidat", v)} /></Field>
              <Field label="Téléphone"><Txt value={f.telephone} onChange={(v) => set("telephone", v)} /></Field>
              <Field label="Adresse e-mail"><Txt value={f.email} onChange={(v) => set("email", v)} /></Field>
              <Field label="Bâtiment demandé"><Sel value={f.propertyId} onChange={(v) => setF((x) => ({ ...x, propertyId: v, unitId: "" }))} vide="— hors patrimoine ou à préciser —" options={store.properties.map((p) => [p.id, p.name])} /></Field>
              {f.propertyId ? <Field label="Lot"><Sel value={f.unitId} onChange={choisirLot} vide="— choisir —" options={lots.map((u) => [u.id, `${u.label}${u.rent ? ` — ${fcfa(u.rent)}` : ""}`])} /></Field>
                : <Field label="Bien (texte libre)"><Txt value={f.bienLibre} onChange={(v) => set("bienLibre", v)} placeholder="Ex. : 3 pièces, Angré 8e tranche" /></Field>}
              <Field label="Loyer mensuel (FCFA) *"><Num value={f.loyer} onChange={(v) => set("loyer", v)} /></Field>
              <Field label="Charges mensuelles (FCFA)"><Num value={f.charges} onChange={(v) => set("charges", v)} /></Field>
            </div>
            {antecedents.map((a) => <Avis key={a.texte} tone="info">{a.texte}</Avis>)}
          </SectionCard>
          {!pro ? (
            <SectionCard title="Revenus et situation" icon={ShieldCheck}>
              <div className="grid sm:grid-cols-2 gap-x-3">
                <Field label="Revenu net mensuel du candidat (FCFA)" hint="Salaire net, pension ou revenu moyen justifié"><Num value={f.revenu} onChange={(v) => set("revenu", v)} /></Field>
                <Field label="Autres revenus réguliers (FCFA)"><Num value={f.autresRevenus} onChange={(v) => set("autresRevenus", v)} /></Field>
                <Field label="Revenu du conjoint ou du colocataire signataire (FCFA)"><Num value={f.revenuConjoint} onChange={(v) => set("revenuConjoint", v)} /></Field>
                <Field label="Crédits et autres engagements mensuels (FCFA)"><Num value={f.engagements} onChange={(v) => set("engagements", v)} /></Field>
                <Field label="Personnes au foyer" hint="Sert au calcul du reste pour vivre, pas à la note du candidat lui-même"><Num value={f.personnes} onChange={(v) => set("personnes", v)} /></Field>
                <Field label="Activité"><Sel value={f.statut} onChange={(v) => set("statut", v)} options={STATUTS_PRO} /></Field>
                <Field label="Ancienneté dans l'emploi ou l'activité (mois)"><Num value={f.ancienneteMois} onChange={(v) => set("ancienneteMois", v)} /></Field>
                {f.statut === "cdd" && <Field label="Mois restants avant la fin du CDD"><Num value={f.cddResteMois} onChange={(v) => set("cddResteMois", v)} /></Field>}
                {["cdi", "fonctionnaire"].includes(f.statut) && <label className="flex items-center gap-2 text-sm mb-3 sm:col-span-2"><input type="checkbox" checked={!!f.essaiEnCours} onChange={(e) => set("essaiEnCours", e.target.checked)} /> Période d'essai en cours</label>}
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="Activité de l'entreprise" icon={ShieldCheck}>
              <div className="grid sm:grid-cols-2 gap-x-3">
                <Field label="Chiffre d'affaires mensuel moyen (FCFA)"><Num value={f.ca} onChange={(v) => set("ca", v)} /></Field>
                <Field label="Charges d'exploitation mensuelles, hors loyer (FCFA)" hint="Salaires, achats, impôts, électricité…"><Num value={f.chargesExploitation} onChange={(v) => set("chargesExploitation", v)} /></Field>
                <Field label="Crédits et autres engagements mensuels (FCFA)"><Num value={f.engagements} onChange={(v) => set("engagements", v)} /></Field>
                <Field label="Ancienneté de l'activité (mois)"><Num value={f.ancienneteMois} onChange={(v) => set("ancienneteMois", v)} /></Field>
                <Field label="Activité exercée"><Txt value={f.activite} onChange={(v) => set("activite", v)} /></Field>
                <Field label="Dirigeant"><Txt value={f.dirigeant} onChange={(v) => set("dirigeant", v)} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm mb-2"><input type="checkbox" checked={!!f.rccm} onChange={(e) => set("rccm", e.target.checked)} /> Immatriculée au registre du commerce (RCCM vérifié)</label>
              <label className="flex items-center gap-2 text-sm mb-2"><input type="checkbox" checked={!!f.dfe} onChange={(e) => set("dfe", e.target.checked)} /> Compte contribuable (déclaration fiscale d'existence)</label>
            </SectionCard>
          )}
          <SectionCard title="Pièces, passé locatif et garanties" icon={FileSignature}>
            <p className="text-sm font-semibold mb-1">Pièces remises</p>
            {Object.entries(pro ? PIECES_PRO : PIECES_HAB).map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm mb-1.5"><input type="checkbox" checked={!!f.pieces?.[k]} onChange={(e) => setPiece(k, e.target.checked)} /> {Array.isArray(l) ? l[0] : l}</label>)}
            <div className="grid sm:grid-cols-2 gap-x-3 mt-3">
              <Field label="Passé locatif"><Sel value={f.historique} onChange={(v) => set("historique", v)} options={HISTORIQUES} /></Field>
              <Field label="Garantie proposée"><Sel value={f.garantie} onChange={(v) => set("garantie", v)} options={Object.entries(GARANTIES).filter(([k]) => pro || k !== "depot_renforce")} /></Field>
              {f.garantie === "garant" && <><Field label="Nom du garant"><Txt value={f.garantNom} onChange={(v) => set("garantNom", v)} /></Field>
                <Field label="Revenu net mensuel du garant (FCFA)" hint="Justifié par ses bulletins de salaire"><Num value={f.garantRevenu} onChange={(v) => set("garantRevenu", v)} /></Field></>}
            </div>
            <label className="flex items-start gap-2 text-sm mt-1"><input type="checkbox" className="mt-1" checked={!!f.consentement} onChange={(e) => set("consentement", e.target.checked)} />
              <span>Le candidat a donné son accord pour l'étude et la conservation de son dossier (loi n° 2013-450 sur la protection des données personnelles). *</span></label>
          </SectionCard>
          <SectionCard title="Décision de l'agence" icon={Check}>
            <div className="grid sm:grid-cols-2 gap-x-3">
              <Field label="Décision"><Sel value={f.decision || "en_etude"} onChange={(v) => set("decision", v)} options={DECISIONS} /></Field>
              <Field label="Motif ou conditions"><Txt value={f.decisionNote} onChange={(v) => set("decisionNote", v)} placeholder="Ex. : accepté avec garant" /></Field>
            </div>
          </SectionCard>
        </div>
        <aside className="lg:sticky lg:top-4 space-y-3">
          <div className="rounded-xl border p-4" style={{ background: V.bg, borderColor: `${V.color}44` }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: V.color }}>Note de solvabilité</p>
            <p className="text-5xl font-bold leading-tight" style={{ color: V.color }}>{r.score}<span className="text-lg font-semibold"> / 100</span></p>
            <p className="text-base font-bold" style={{ color: V.color }}>{V.label}{r.incomplet ? " — dossier incomplet" : ""}</p>
            <p className="text-sm mt-1" style={{ color: "#374151" }}>{V.conseil}</p>
          </div>
          <div className="bg-white rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
            <p className="text-sm font-semibold mb-2">Détail</p>
            {r.criteres.map((c) => (
              <div key={c.libelle} className="mb-2">
                <div className="flex justify-between text-xs"><span>{c.libelle}</span><span className="tabular-nums font-semibold">{c.points} / {c.max}</span></div>
                <div className="h-1.5 rounded-full mt-1" style={{ background: "#E5E7EB" }}><div className="h-1.5 rounded-full" style={{ width: `${(c.points / c.max) * 100}%`, background: c.points / c.max >= 0.7 ? "#4F9E2A" : c.points / c.max >= 0.4 ? "#C58A1B" : "#D81F26" }} /></div>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{c.detail}</p>
              </div>))}
          </div>
          {r.alertes.length > 0 && <div className="rounded-xl border p-3 text-sm" style={{ background: "#FDECEC", borderColor: "#F5C6C7", color: "#8E1216" }}><p className="font-semibold mb-1">Points d'attention</p><ul className="list-disc pl-4 space-y-1">{r.alertes.map((a) => <li key={a}>{a}</li>)}</ul></div>}
          <div className="bg-white rounded-xl border p-3 text-sm" style={{ borderColor: "var(--line)" }}><p className="font-semibold mb-1">Recommandations</p><ul className="list-disc pl-4 space-y-1">{r.recommandations.map((a) => <li key={a}>{a}</li>)}</ul></div>
        </aside>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   2. FICHES DE RENSEIGNEMENTS (QR codes et réponses)
   ══════════════════════════════════════════════════════════════════════ */
export function QRCode({ texte, taille = 180, marge = 4 }) {
  const m = useMemo(() => matriceQR(texte), [texte]); const n = m.length + marge * 2;
  const d = m.flatMap((row, r) => row.map((noir, c) => (noir ? `M${c + marge} ${r + marge}h1v1h-1z` : ""))).join("");
  return <svg role="img" aria-label={`QR code : ${texte}`} width={taille} height={taille} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges"><rect width={n} height={n} fill="#fff" /><path d={d} fill="#000" /></svg>;
}
export const lienFiche = (kind) => `${typeof window !== "undefined" ? window.location.origin : ""}/?fiche=${kind}`;
const STATUTS_FICHE = { nouveau: { label: "Nouvelle", color: "#D81F26" }, en_cours: { label: "En cours", color: "#C58A1B" }, traite: { label: "Traitée", color: "#4F9E2A" }, ecarte: { label: "Écartée", color: "#94A3B8" } };
const QUI = { locataire: "Locataire", proprietaire: "Propriétaire" };

function AfficheQR({ kind }) {
  const def = FICHES[kind];
  return (
    <div className="text-center" style={{ color: "#111827" }}>
      <div className="flex items-center justify-between">
        <img src={LOGO} alt="Entreprise Kibegnon" style={{ height: 64 }} /><img src={LOGO_AGREMENT} alt="Agent immobilier agréé n° AG-0456" style={{ height: 78 }} />
      </div>
      <p className="mt-8 text-[15px] tracking-[0.2em] font-semibold" style={{ color: "#D81F26" }}>{kind === "locataire" ? "LOCATAIRES" : "PROPRIÉTAIRES"}</p>
      <h1 className="text-[30px] font-bold leading-tight mt-1" style={{ color: "#0F2742" }}>Votre fiche de renseignements<br />en deux minutes</h1>
      <div className="inline-block mt-6 p-3 rounded-2xl" style={{ border: "3px solid #0F2742" }}><QRCode texte={lienFiche(kind)} taille={300} /></div>
      <ol className="text-left inline-block mt-6 text-[15px] leading-relaxed">
        <li><b>1.</b> Ouvrez l'appareil photo de votre téléphone.</li>
        <li><b>2.</b> Visez ce carré : un lien s'affiche, touchez-le.</li>
        <li><b>3.</b> Remplissez la fiche et appuyez sur « Envoyer ma fiche ».</li>
      </ol>
      <p className="mt-4 text-[13px]">{def.intro}</p>
      <p className="mt-2 text-[12px] break-all" style={{ color: "#4B5563" }}>Sans appareil photo : {lienFiche(kind)}</p>
      <p className="mt-6 text-[11px]" style={{ color: "#4B5563" }}>{AGENCY.name} — {AGENCY.agrement} — {AGENCY.address} — {AGENCY.tel}</p>
    </div>
  );
}
function FicheRecue({ fiche }) {
  const def = FICHES[fiche.kind]; const d = fiche.data || {}; const td = "px-2 py-1 border align-top"; const bc = { borderColor: "#C9D1DA" };
  return (
    <div className="text-[11.5px]" style={{ color: "#111827" }}>
      <PrintHead title={def.titre.toUpperCase()} subtitle={`Reçue le ${new Date(fiche.created_at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}`} />
      {def.sections.map((s) => { const remplis = s.champs.filter((c) => String(d[c.k] ?? "").trim() !== ""); if (!remplis.length) return null; return (
        <div key={s.titre} style={{ breakInside: "avoid" }}><p className="font-semibold mt-3 mb-1">{s.titre}</p>
          <table className="w-full border-collapse"><tbody>{remplis.map((c) => <tr key={c.k}><td className={td} style={{ ...bc, width: "42%" }}>{c.label}</td>
            <td className={`${td} font-medium`} style={bc}>{c.type === "number" ? Number(d[c.k]).toLocaleString("fr-FR") : c.type === "date" ? fmt(d[c.k]) : String(d[c.k])}</td></tr>)}</tbody></table></div>); })}
      <p className="mt-3 text-[10px]" style={{ color: "#4B5563" }}>Fiche remplie en ligne par l'intéressé(e), qui a donné son accord pour l'enregistrement de ces informations (loi n° 2013-450 du 19 juin 2013).</p>
    </div>
  );
}

export function Fiches({ store, me, onEtude, onMandat }) {
  const { rows, etat, erreur, charger } = useTable("info_forms");
  const [affiche, setAffiche] = useState(null); const [ouverte, setOuverte] = useState(null); const [imprimer, setImprimer] = useState(null);
  const [filtre, setFiltre] = useState({ kind: "", status: "" }); const [toast, setToast] = useState(""); const [copie, setCopie] = useState("");
  const admin = ["admin", "gerante", "responsable_admin"].includes(me.role);
  const maj = async (f, patch) => {
    const { data, error } = await supabase.from("info_forms").update({ ...patch, processed_by: me.id, processed_at: new Date().toISOString() }).eq("id", f.id).select().single();
    if (error) return setToast(msgErreur(error));
    setOuverte((o) => (o?.id === f.id ? data : o)); await charger();
  };
  const creerProprietaire = async (f) => {
    const d = f.data || {};
    const existe = store.owners.find((o) => (o.phone || "").replace(/\D/g, "").slice(-8) === (f.phone || "").replace(/\D/g, "").slice(-8) && (f.phone || "").replace(/\D/g, "").length >= 8);
    if (existe) return setToast(`Un propriétaire porte déjà ce numéro : ${existe.name}. Aucune fiche créée.`);
    const r = await store.actions.saveOwner({ name: f.full_name, kind: /soci/i.test(d.qualite || "") ? "entreprise" : "particulier", phone: f.phone, email: f.email, address: d.adresse || "", idNumber: d.piece_numero || "",
      notes: [d.compte_contribuable && `Compte contribuable : ${d.compte_contribuable}`, d.bien_situation && `Bien : ${d.bien_type || ""} ${d.bien_situation}`, d.operation && `Projet : ${d.operation}`].filter(Boolean).join(" · ") });
    if (r?.error) return setToast(r.error);
    await maj(f, { status: "traite", note: [f.note, "Propriétaire créé dans le patrimoine."].filter(Boolean).join(" ") });
    setToast(`${f.full_name} a été ajouté(e) aux propriétaires.`);
  };
  const supprimer = async (f) => {
    if (!window.confirm(`Supprimer définitivement la fiche de ${f.full_name} ?`)) return;
    const { data, error } = await supabase.from("info_forms").delete().eq("id", f.id).select();
    if (error || !data?.length) return setToast(error ? msgErreur(error) : "Suppression réservée à la direction.");
    setOuverte(null); await charger();
  };
  const copier = async (kind) => { try { await navigator.clipboard.writeText(lienFiche(kind)); setCopie(kind); setTimeout(() => setCopie(""), 2000); } catch { setToast(lienFiche(kind)); } };
  if (affiche) return (
    <div><Barre onBack={() => setAffiche(null)}><button onClick={() => printSheet("portrait")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer l'affiche</button></Barre>
      <PrintPage className="kb-affiche bg-white rounded-xl border p-8 max-w-2xl" style={{ borderColor: "var(--line)" }}><style>{"#print-area.kb-affiche .kb-foot, #print-area.kb-affiche .kb-foot-space { display: none !important; }"}</style><AfficheQR kind={affiche} /></PrintPage></div>
  );
  if (imprimer) return (
    <div><Barre onBack={() => setImprimer(null)}><button onClick={() => printSheet("portrait")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF</button></Barre>
      <PrintPage className="bg-white rounded-xl border p-6 max-w-3xl" style={{ borderColor: "var(--line)" }}><FicheRecue fiche={imprimer} /></PrintPage></div>
  );
  const liste = rows.filter((r) => (!filtre.kind || r.kind === filtre.kind) && (!filtre.status || r.status === filtre.status));
  const prefillEtude = (f) => { const d = f.data || {}; return { usage: /prof/i.test(d.usage || "") ? "professionnel" : "habitation", candidat: f.full_name, telephone: f.phone, email: f.email, bienLibre: d.bien || "",
    loyer: d.loyer_souhaite || "", revenu: d.revenu || "", autresRevenus: d.autres_revenus || "", personnes: d.personnes || 1, garantNom: d.garant_nom || "", garantie: d.garant_nom ? "garant" : "aucune",
    statut: { "Salarié du privé": "cdi", "Fonctionnaire ou agent de l'État": "fonctionnaire", "Commerçant ou indépendant": "independant", "Profession libérale": "liberal", "Retraité": "retraite", "Étudiant": "etudiant", "Sans emploi": "sans_emploi" }[d.statut_pro] || "cdi",
    consentement: true, formId: f.id }; };
  const prefillMandat = (f) => { const d = f.data || {}; return { kind: /vend/i.test(d.operation || "") ? "vente_simple" : "gestion", data: { civilite: /soci/i.test(d.qualite || "") ? "La société" : "Monsieur", nom: f.full_name, telephone: f.phone, email: f.email,
    domicile: d.adresse || "", nationalite: d.nationalite || "", profession: d.profession || "", situation: (d.situation || "").toLowerCase(), pieceType: d.piece_type || "", pieceNumero: d.piece_numero || "", naissanceDate: d.date_naissance || "",
    compteContribuable: d.compte_contribuable || "", representant: d.representant || "", bienNature: d.bien_type || "", bienSituation: d.bien_situation || "", bienReference: d.reference_fonciere || "", bienSuperficie: d.bien_superficie || "",
    bienTitre: d.titre || "", prix: /vend/i.test(d.operation || "") ? d.montant || "" : "", modeReversement: (d.reversement || "").toLowerCase() || undefined } }; };
  return (
    <div>
      <div className="mb-4"><h1 className="text-2xl font-bold">Fiches de renseignements</h1><p className="text-sm" style={{ color: "var(--muted)" }}>Le locataire ou le propriétaire scanne le QR code avec son téléphone, remplit sa fiche, et elle arrive ici.</p></div>
      {toast && <Avis tone="info">{toast}</Avis>}
      {etat === "erreur" && <Avis tone="rouge">{erreur}</Avis>}
      <div className="grid md:grid-cols-2 gap-4 mb-4">{Object.keys(FICHES).map((kind) => (
        <div key={kind} className="bg-white rounded-xl border p-4 flex gap-4 items-center" style={{ borderColor: "var(--line)" }}>
          <QRCode texte={lienFiche(kind)} taille={132} />
          <div className="min-w-0">
            <p className="font-semibold">Formulaire {QUI[kind].toLowerCase()}</p>
            <p className="text-xs break-all mb-2" style={{ color: "var(--muted)" }}>{lienFiche(kind)}</p>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setAffiche(kind)} className="kb-btn kb-btn-primary text-xs"><Printer size={13} /> Affiche à imprimer</button>
              <button onClick={() => copier(kind)} className="kb-btn kb-btn-ghost text-xs"><Copy size={13} /> {copie === kind ? "Lien copié" : "Copier le lien"}</button>
              <a href={lienFiche(kind)} target="_blank" rel="noreferrer" className="kb-btn kb-btn-ghost text-xs"><ExternalLink size={13} /> Ouvrir</a>
            </div>
          </div>
        </div>))}</div>
      <SectionCard title={`Fiches reçues (${rows.filter((r) => r.status === "nouveau").length} nouvelle(s))`} icon={QrCode} pad={false}
        action={<span className="flex gap-1.5 items-center">
          <select className="px-2 py-1 rounded-lg border text-xs" style={inputStyle} value={filtre.kind} onChange={(e) => setFiltre((x) => ({ ...x, kind: e.target.value }))} aria-label="Filtrer par type"><option value="">Tous</option>{Object.entries(QUI).map(([k, l]) => <option key={k} value={k}>{l}s</option>)}</select>
          <select className="px-2 py-1 rounded-lg border text-xs" style={inputStyle} value={filtre.status} onChange={(e) => setFiltre((x) => ({ ...x, status: e.target.value }))} aria-label="Filtrer par état"><option value="">Tous les états</option>{Object.entries(STATUTS_FICHE).map(([k, l]) => <option key={k} value={k}>{l.label}</option>)}</select>
          <button onClick={charger} className="kb-btn kb-btn-ghost text-xs" aria-label="Actualiser la liste"><RefreshCw size={13} /></button></span>}>
        {etat === "chargement" ? <p className="p-4 text-sm" style={{ color: "var(--muted)" }}>Chargement…</p> : liste.length === 0 ? <EmptyState icon={QrCode} title="Aucune fiche reçue" sub="Imprimez l'affiche et placez-la à l'accueil, ou envoyez le lien par WhatsApp." /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-xs" style={{ color: "var(--muted)", background: "#F8FAFC" }}>{["Reçue le", "Type", "Nom", "Téléphone", "E-mail", "État"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
            <tbody>{liste.map((f) => <tr key={f.id} className="border-t cursor-pointer hover:bg-slate-50" style={{ borderColor: "var(--line)" }} onClick={() => setOuverte(f)}>
              <td className="px-3 py-2 whitespace-nowrap">{new Date(f.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td><td className="px-3 py-2">{QUI[f.kind]}</td>
              <td className="px-3 py-2 font-medium">{f.full_name}</td><td className="px-3 py-2">{f.phone}</td><td className="px-3 py-2">{f.email || "—"}</td>
              <td className="px-3 py-2"><Chip color={STATUTS_FICHE[f.status].color} dot>{STATUTS_FICHE[f.status].label}</Chip></td></tr>)}</tbody>
          </table></div>)}
      </SectionCard>
      {ouverte && (
        <Modal title={`${FICHES[ouverte.kind].titre} — ${ouverte.full_name}`} onClose={() => setOuverte(null)} wide>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ouverte.kind === "locataire" && <button onClick={() => { onEtude(prefillEtude(ouverte)); }} className="kb-btn kb-btn-primary text-xs"><ShieldCheck size={13} /> Étudier la solvabilité</button>}
            {ouverte.kind === "proprietaire" && <><button onClick={() => creerProprietaire(ouverte)} className="kb-btn kb-btn-primary text-xs"><UserPlus size={13} /> Créer le propriétaire</button>
              <button onClick={() => onMandat(prefillMandat(ouverte))} className="kb-btn kb-btn-ghost text-xs"><FileSignature size={13} /> Préparer un mandat</button></>}
            <button onClick={() => { setImprimer(ouverte); setOuverte(null); }} className="kb-btn kb-btn-ghost text-xs"><Printer size={13} /> Imprimer</button>
            {admin && <button onClick={() => supprimer(ouverte)} className="kb-btn kb-btn-ghost text-xs" style={{ color: "#D81F26" }}><Trash2 size={13} /> Supprimer</button>}
          </div>
          <div className="grid sm:grid-cols-2 gap-x-3">
            <Field label="État du traitement"><Sel value={ouverte.status} onChange={(v) => maj(ouverte, { status: v })} options={STATUTS_FICHE} /></Field>
            <Field label="Note de suivi"><input className={inputCls} style={inputStyle} defaultValue={ouverte.note} onBlur={(e) => e.target.value !== ouverte.note && maj(ouverte, { note: e.target.value })} placeholder="Ex. : rappelé le 12/11, rendez-vous jeudi" /></Field>
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: "var(--line)" }}><FicheRecueSimple fiche={ouverte} /></div>
        </Modal>)}
    </div>
  );
}
function FicheRecueSimple({ fiche }) {
  const def = FICHES[fiche.kind]; const d = fiche.data || {};
  return def.sections.map((s) => { const remplis = s.champs.filter((c) => String(d[c.k] ?? "").trim() !== ""); if (!remplis.length) return null; return (
    <div key={s.titre} className="mb-3"><p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>{s.titre}</p>
      <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">{remplis.map((c) => <div key={c.k} className={c.large ? "sm:col-span-2" : ""}><dt className="text-xs" style={{ color: "var(--muted)" }}>{c.label}</dt>
        <dd className="font-medium">{c.type === "number" ? Number(d[c.k]).toLocaleString("fr-FR") : c.type === "date" ? fmt(d[c.k]) : String(d[c.k])}</dd></div>)}</dl></div>); });
}

/* ══════════════════════════════════════════════════════════════════════
   3. MANDATS
   ══════════════════════════════════════════════════════════════════════ */
const STATUTS_MANDAT = { projet: { label: "Projet", color: "#64748B" }, signe: { label: "Signé", color: "#2F6B1A" }, expire: { label: "Expiré", color: "#C58A1B" }, resilie: { label: "Résilié", color: "#B5171D" } };
const lettres = (x) => { try { return amountInWords(x); } catch { return ""; } };

export function TexteMandat({ texte }) {
  return (
    <div className="kb-mandat" lang="fr" style={{ fontFamily: "Cambria, 'Times New Roman', Georgia, serif", fontSize: "11.5pt", lineHeight: 1.5, color: "#111827", hyphens: "auto" }}>
      {blocsMandat(texte).map((b, i) => {
        if (b.type === "titre") return <h1 key={i} style={{ textAlign: "center", fontSize: "15pt", fontWeight: 700, letterSpacing: "0.06em", borderTop: "1.5px solid #0F2742", borderBottom: "1.5px solid #0F2742", padding: "7px 0", margin: "10px 0 8px", color: "#0F2742" }}>{b.texte}</h1>;
        if (b.type === "article") return <h2 key={i} style={{ fontSize: "11.5pt", fontWeight: 700, fontVariant: "small-caps", letterSpacing: "0.03em", borderBottom: "0.5px solid #9AA6B5", margin: "13px 0 5px", paddingBottom: 2, color: "#0F2742", breakAfter: "avoid" }}>{b.texte}</h2>;
        if (b.type === "centre") return <p key={i} style={{ textAlign: "center", fontStyle: /PART/.test(b.texte) ? "normal" : "italic", fontWeight: /PART/.test(b.texte) ? 700 : 400, margin: "5px 0" }}>{b.texte}</p>;
        if (b.type === "liste") return <ul key={i} style={{ margin: "3px 0 6px", paddingLeft: "1.6cm", listStyle: "none" }}>{b.items.map((x, j) => <li key={j} style={{ textAlign: "left", textIndent: "-0.5cm" }}>—&nbsp;&nbsp;{x}</li>)}</ul>;
        if (b.type === "signatures") return <div key={i} style={{ display: "grid", gridTemplateColumns: `repeat(${b.colonnes.length}, 1fr)`, gap: "1.2cm", marginTop: "0.9cm", breakInside: "avoid" }}>{b.colonnes.map((c, j) => (
          <div key={j} style={{ textAlign: "center" }}>{c.map((l, k) => <p key={k} style={{ margin: 0, fontWeight: k === 0 ? 700 : 400, fontVariant: k === 0 ? "small-caps" : "normal", fontSize: /^\(/.test(l) ? "9.5pt" : undefined, fontStyle: /^\(/.test(l) ? "italic" : "normal" }}>{l}</p>)}<div style={{ height: "2.4cm" }} /></div>))}</div>;
        const label = /^[A-ZÀÉÈ' ]{6,} ?:?$/.test(b.texte) || /^(ENTRE LES|ET :|IL A ÉTÉ)/.test(b.texte);
        return <p key={i} style={{ textAlign: label ? "left" : "justify", textIndent: label ? 0 : "1cm", fontWeight: label ? 700 : 400, margin: "5px 0" }}>{b.texte}</p>;
      })}
    </div>
  );
}

export function Mandats({ store, me, prefill, onPrefillConsumed }) {
  const { rows, etat, erreur, charger } = useTable("mandates");
  const [edit, setEdit] = useState(null); const [choix, setChoix] = useState(false); const [toast, setToast] = useState("");
  useEffect(() => { if (prefill) { setEdit({ kind: prefill.kind, data: { ...defautsMandat(prefill.kind), ...Object.fromEntries(Object.entries(prefill.data || {}).filter(([, v]) => v !== undefined)) }, body: "", status: "projet" }); onPrefillConsumed?.(); } }, [prefill, onPrefillConsumed]);
  const admin = ["admin", "gerante", "responsable_admin"].includes(me.role);
  if (edit) return <EditeurMandat initial={edit} store={store} admin={admin} onClose={async (m) => { setEdit(null); if (m) { setToast(m); await charger(); } }} />;
  const t = today();
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div><h1 className="text-2xl font-bold">Mandats</h1><p className="text-sm" style={{ color: "var(--muted)" }}>Mandats de gestion et de vente pré-remplis à partir des fiches du propriétaire et du bien.</p></div>
        <button onClick={() => setChoix(true)} className="kb-btn kb-btn-primary"><Plus size={16} /> Nouveau mandat</button>
      </div>
      {toast && <Avis tone="vert">{toast}</Avis>}
      {etat === "erreur" && <Avis tone="rouge">{erreur}</Avis>}
      <SectionCard title="Mandats établis" icon={FileSignature} pad={false}>
        {etat === "chargement" ? <p className="p-4 text-sm" style={{ color: "var(--muted)" }}>Chargement…</p> : rows.length === 0 ? <EmptyState icon={FileSignature} title="Aucun mandat" sub="Créez un mandat : il se remplit avec les informations déjà saisies dans le patrimoine." /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-xs" style={{ color: "var(--muted)", background: "#F8FAFC" }}>{["Référence", "Type", "Mandant", "Bien", "État", "Signé le", "Échéance"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => { const S = STATUTS_MANDAT[r.status === "signe" && r.ends_on && r.ends_on < t && r.kind !== "gestion" ? "expire" : r.status]; return (
              <tr key={r.id} className="border-t cursor-pointer hover:bg-slate-50" style={{ borderColor: "var(--line)" }} onClick={() => setEdit({ id: r.id, ref: r.ref, kind: r.kind, data: { ...defautsMandat(r.kind), ...r.data }, body: r.body, status: r.status, ownerId: r.owner_id || "", propertyId: r.property_id || "" })}>
                <td className="px-3 py-2 font-mono text-xs">{r.ref}</td><td className="px-3 py-2">{MANDATS[r.kind].court}</td><td className="px-3 py-2 font-medium">{r.mandant}</td>
                <td className="px-3 py-2">{store.properties.find((p) => p.id === r.property_id)?.name || r.data?.bienSituation || "—"}</td>
                <td className="px-3 py-2"><Chip color={S.color} dot>{S.label}</Chip></td><td className="px-3 py-2">{fmt(r.signed_on)}</td><td className="px-3 py-2">{fmt(r.ends_on)}</td></tr>); })}</tbody>
          </table></div>)}
      </SectionCard>
      {choix && <Modal title="Quel mandat voulez-vous établir ?" onClose={() => setChoix(false)}>
        <div className="space-y-2">{Object.entries(MANDATS).map(([k, m]) => (
          <button key={k} onClick={() => { setChoix(false); setEdit({ kind: k, data: defautsMandat(k), body: "", status: "projet" }); }} className="w-full text-left rounded-lg border p-3 hover:bg-slate-50" style={{ borderColor: "var(--line)" }}>
            <p className="font-semibold">{m.label}</p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>{k === "gestion" ? "Le propriétaire confie à l'agence la location et la gestion de ses biens." : k === "vente_exclusif" ? "L'agence est seule chargée de vendre le bien pendant la durée du mandat." : "Le propriétaire peut aussi vendre lui-même ou par d'autres agences."}</p>
          </button>))}</div></Modal>}
    </div>
  );
}

function EditeurMandat({ initial, store, admin, onClose }) {
  const [m, setM] = useState(initial); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [apercu, setApercu] = useState(false);
  const [libre, setLibre] = useState(() => !!initial.body && initial.body !== redigerMandat(initial.kind, initial.data, AGENCY, lettres));
  const d = m.data; const gestion = m.kind === "gestion";
  const set = (k, v) => setM((x) => ({ ...x, data: { ...x.data, [k]: v } }));
  const texte = libre ? m.body : redigerMandat(m.kind, d, AGENCY, lettres);
  const choisirProprietaire = (id) => { const o = store.owners.find((x) => x.id === id);
    setM((x) => ({ ...x, ownerId: id, data: o ? { ...x.data, civilite: o.kind === "entreprise" ? "La société" : x.data.civilite, nom: o.name || "", telephone: o.phone || "", email: o.email || "", domicile: o.address || x.data.domicile || "", pieceNumero: o.idNumber || x.data.pieceNumero || "" } : x.data })); };
  const choisirBien = (id) => { const p = store.properties.find((x) => x.id === id); const us = store.units.filter((u) => u.propertyId === id);
    setM((x) => ({ ...x, propertyId: id, ...(p && !x.ownerId && p.ownerId ? { ownerId: p.ownerId } : {}), data: p ? { ...x.data, bienNature: x.data.bienNature || `${p.kind ? p.kind.charAt(0).toUpperCase() + p.kind.slice(1) : "Immeuble"} « ${p.name} »`, bienSituation: [p.address, p.quartier, p.commune].filter(Boolean).join(", ") || x.data.bienSituation || "",
      bienSuperficie: x.data.bienSuperficie || p.surface || "", ...(gestion && !x.data.lots ? { lots: us.map((u) => `${u.label}${u.rooms ? ` — ${u.rooms} pièce(s)` : ""}${u.rent ? ` — loyer mensuel ${milliers(u.rent)} francs CFA` : ""}`).join("\n") } : {}),
      ...(!gestion && !x.data.prix && p.salePrice ? { prix: String(Math.round(p.salePrice)) } : {}) } : x.data }));
    if (p?.ownerId && !m.ownerId) setTimeout(() => choisirProprietaire(p.ownerId), 0); };
  const enregistrer = async () => {
    if (!(d.nom || "").trim()) return setErr("Indiquez le nom du mandant.");
    if (m.status === "signe" && !d.dateSignature) return setErr("Indiquez la date de signature du mandat signé.");
    setBusy(true); setErr("");
    const row = { kind: m.kind, owner_id: m.ownerId || null, property_id: m.propertyId || null, mandant: d.nom.trim(), data: d, body: texte, status: m.status, signed_on: d.dateSignature || null, ends_on: echeanceMandat(m.kind, d) };
    const { data, error } = await (m.id ? supabase.from("mandates").update(row).eq("id", m.id).select().single() : supabase.from("mandates").insert(row).select().single());
    setBusy(false);
    if (error) return setErr(msgErreur(error));
    setM((x) => ({ ...x, id: data.id, ref: data.ref, body: texte }));
    return data;
  };
  const supprimer = async () => {
    if (!window.confirm(`Supprimer définitivement le mandat ${m.ref} ?`)) return;
    const { data, error } = await supabase.from("mandates").delete().eq("id", m.id).select();
    if (error || !data?.length) return setErr(error ? msgErreur(error) : "Suppression réservée à la direction.");
    onClose("Mandat supprimé.");
  };
  if (apercu) return (
    <div><Barre onBack={() => setApercu(false)}><button onClick={() => printSheet("portrait")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF</button></Barre>
      <PrintPage className="bg-white rounded-xl border p-8 max-w-3xl" style={{ borderColor: "var(--line)" }}>
        <PrintHead title="" subtitle={m.ref ? `Réf. ${m.ref}` : ""} /><TexteMandat texte={texte} /></PrintPage></div>
  );
  const societe = /soci|succession|indivision|association/i.test(d.civilite || "");
  return (
    <div>
      <Barre onBack={() => onClose(m.id ? "Mandat enregistré." : "")}>
        {m.id && admin && <button onClick={supprimer} className="kb-btn kb-btn-ghost text-sm" style={{ color: "#D81F26" }}><Trash2 size={14} /> Supprimer</button>}
        <button onClick={async () => { const s = await enregistrer(); if (s) setApercu(true); }} disabled={busy} className="kb-btn kb-btn-ghost text-sm"><Printer size={14} /> Enregistrer et imprimer</button>
        <button onClick={async () => { const s = await enregistrer(); if (s) onClose(`Mandat ${s.ref} enregistré.`); }} disabled={busy} className="kb-btn kb-btn-primary"><Check size={16} /> {busy ? "Enregistrement…" : "Enregistrer"}</button>
      </Barre>
      <h1 className="text-xl font-bold mb-1">{MANDATS[m.kind].label}{m.ref ? ` — ${m.ref}` : ""}</h1>
      <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>Ce qui n'est pas saisi reste en pointillés sur le document, à compléter à la main.</p>
      {err && <Avis tone="rouge">{err}</Avis>}
      <div className="grid xl:grid-cols-2 gap-4 items-start">
        <div>
          <SectionCard title={gestion ? "Le propriétaire (mandant)" : "Le vendeur (mandant)"} icon={UserPlus}>
            <Field label="Reprendre un propriétaire du patrimoine"><Sel value={m.ownerId} onChange={choisirProprietaire} vide="— saisie libre —" options={store.owners.map((o) => [o.id, o.name])} /></Field>
            <div className="grid sm:grid-cols-2 gap-x-3">
              <Field label="Qualité"><Sel value={d.civilite} onChange={(v) => set("civilite", v)} options={["Monsieur", "Madame", "Mademoiselle", "La société", "La succession"]} /></Field>
              <Field label={societe ? "Dénomination *" : "Nom et prénoms *"}><Txt value={d.nom} onChange={(v) => set("nom", v)} /></Field>
              {societe ? <><Field label="Forme et capital"><Txt value={d.forme} onChange={(v) => set("forme", v)} placeholder="SARL au capital de …" /></Field>
                <Field label="Représentant (nom et qualité)"><Txt value={d.representant} onChange={(v) => set("representant", v)} /></Field>
                <Field label="Numéro RCCM"><Txt value={d.pieceNumero} onChange={(v) => set("pieceNumero", v)} /></Field></>
              : <><Field label="Date de naissance"><input type="date" className={inputCls} style={inputStyle} value={d.naissanceDate || ""} onChange={(e) => set("naissanceDate", e.target.value)} /></Field>
                <Field label="Lieu de naissance"><Txt value={d.naissanceLieu} onChange={(v) => set("naissanceLieu", v)} /></Field>
                <Field label="Nationalité"><Txt value={d.nationalite} onChange={(v) => set("nationalite", v)} placeholder="ivoirienne" /></Field>
                <Field label="Profession"><Txt value={d.profession} onChange={(v) => set("profession", v)} /></Field>
                <Field label="Situation de famille"><Txt value={d.situation} onChange={(v) => set("situation", v)} placeholder="marié(e), célibataire, veuf(ve)…" /></Field>
                <Field label="Pièce d'identité"><Sel value={d.pieceType} onChange={(v) => set("pieceType", v)} vide="— choisir —" options={["Carte nationale d'identité", "Passeport", "Carte consulaire", "Carte de résident", "Permis de conduire"]} /></Field>
                <Field label="Numéro de la pièce"><Txt value={d.pieceNumero} onChange={(v) => set("pieceNumero", v)} /></Field>
                <Field label="Délivrée le"><input type="date" className={inputCls} style={inputStyle} value={d.pieceDelivree || ""} onChange={(e) => set("pieceDelivree", e.target.value)} /></Field>
                <Field label="Valable jusqu'au"><input type="date" className={inputCls} style={inputStyle} value={d.pieceValide || ""} onChange={(e) => set("pieceValide", e.target.value)} /></Field></>}
              <Field label={societe ? "Siège social" : "Domicile"}><Txt value={d.domicile} onChange={(v) => set("domicile", v)} /></Field>
              <Field label="Téléphone"><Txt value={d.telephone} onChange={(v) => set("telephone", v)} /></Field>
              <Field label="Adresse e-mail"><Txt value={d.email} onChange={(v) => set("email", v)} /></Field>
              <Field label="Compte contribuable"><Txt value={d.compteContribuable} onChange={(v) => set("compteContribuable", v)} /></Field>
            </div>
          </SectionCard>
          <SectionCard title="Le bien" icon={FileSignature}>
            <Field label="Reprendre un bien du patrimoine"><Sel value={m.propertyId} onChange={choisirBien} vide="— saisie libre —" options={store.properties.map((p) => [p.id, p.name])} /></Field>
            <div className="grid sm:grid-cols-2 gap-x-3">
              <Field label="Nature"><Txt value={d.bienNature} onChange={(v) => set("bienNature", v)} placeholder="Ex. : villa de 5 pièces avec son terrain" /></Field>
              <Field label="Situation"><Txt value={d.bienSituation} onChange={(v) => set("bienSituation", v)} placeholder="Commune, quartier, lotissement" /></Field>
              <Field label="Références foncières"><Txt value={d.bienReference} onChange={(v) => set("bienReference", v)} placeholder="Lot, îlot, titre foncier n°" /></Field>
              <Field label="Superficie (m²)"><Num value={d.bienSuperficie} onChange={(v) => set("bienSuperficie", v)} /></Field>
              <Field label="Titre de propriété"><Txt value={d.bienTitre} onChange={(v) => set("bienTitre", v)} placeholder="ACD n° …, certificat de propriété…" /></Field>
              {!gestion && <Field label="Occupation"><Txt value={d.bienOccupation} onChange={(v) => set("bienOccupation", v)} placeholder="libre de toute occupation" /></Field>}
            </div>
            {gestion ? <Field label="Locaux confiés en gestion (un par ligne)"><textarea rows={5} className={inputCls} style={inputStyle} value={d.lots || ""} onChange={(e) => set("lots", e.target.value)} placeholder="Appartement A1 — 3 pièces — loyer mensuel 150 000 francs CFA" /></Field>
              : <><Field label="Origine de propriété"><textarea rows={2} className={inputCls} style={inputStyle} value={d.bienOrigine || ""} onChange={(e) => set("bienOrigine", e.target.value)} placeholder="Acquis de … par acte reçu le … par Maître …, notaire à …" /></Field>
                <Field label="Charges ou réserves à signaler (facultatif)"><Txt value={d.bienCharges} onChange={(v) => set("bienCharges", v)} /></Field>
                <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={!!d.indivision} onChange={(e) => set("indivision", e.target.checked)} /> Bien en indivision ou en succession (accord de tous les ayants droit annexé)</label></>}
          </SectionCard>
          <SectionCard title="Conditions du mandat" icon={Check}>
            <div className="grid sm:grid-cols-3 gap-x-3">
              {gestion ? <>
                <Field label="Durée (années)"><Num value={d.duree} onChange={(v) => set("duree", v)} /></Field>
                <Field label="Période ferme (années)"><Num value={d.dureeFerme} onChange={(v) => set("dureeFerme", v)} /></Field>
                <Field label="Préavis (mois)"><Num value={d.preavis} onChange={(v) => set("preavis", v)} /></Field>
                <Field label="Honoraires (% des loyers)"><Txt value={d.honoraires} onChange={(v) => set("honoraires", v.replace(/[^\d.,]/g, "").replace(",", "."))} /></Field>
                <Field label="Base"><Sel value={d.honorairesBase} onChange={(v) => set("honorairesBase", v)} options={["TTC", "hors taxes"]} /></Field>
                <Field label="Déclaration foncière (FCFA)"><Num value={d.forfaitDeclaration} onChange={(v) => set("forfaitDeclaration", v)} /></Field>
                <Field label="Réponse aux devis (jours)"><Num value={d.delaiDevis} onChange={(v) => set("delaiDevis", v)} /></Field>
                <Field label="Plafond des travaux urgents (FCFA)" hint="Facultatif"><Num value={d.plafondUrgence} onChange={(v) => set("plafondUrgence", v)} /></Field>
                <Field label="Reversement le … du mois"><Num value={d.jourReversement} onChange={(v) => set("jourReversement", v)} /></Field>
                <Field label="Compte rendu"><Sel value={d.periodicite} onChange={(v) => set("periodicite", v)} options={["mensuellement", "trimestriellement"]} /></Field>
                <Field label="Mode de reversement"><Sel value={d.modeReversement} onChange={(v) => set("modeReversement", v)} options={["virement bancaire", "chèque", "mobile money", "espèces contre reçu"]} /></Field>
                <Field label="Impôt foncier retenu (%)"><Txt value={d.tauxFoncier} onChange={(v) => set("tauxFoncier", v.replace(/[^\d.,]/g, "").replace(",", "."))} /></Field>
              </> : <>
                <Field label="Prix de vente (FCFA)"><Num value={d.prix} onChange={(v) => set("prix", v)} /></Field>
                <Field label="Honoraires (% hors taxes)"><Txt value={d.honoraires} onChange={(v) => set("honoraires", v.replace(/[^\d.,]/g, "").replace(",", "."))} /></Field>
                <Field label="Honoraires"><Sel value={d.fai === false ? "sus" : "inclus"} onChange={(v) => set("fai", v === "inclus")} options={{ inclus: "Inclus dans le prix", sus: "En sus, à la charge de l'acquéreur" }} /></Field>
                <Field label="Durée (mois)"><Num value={d.duree} onChange={(v) => set("duree", v)} /></Field>
                <Field label="Préavis (jours)"><Num value={d.preavis} onChange={(v) => set("preavis", v)} /></Field>
                <Field label="Honoraires dus après le mandat (mois)"><Num value={d.suiteMois} onChange={(v) => set("suiteMois", v)} /></Field>
              </>}
              <Field label="Fait à"><Txt value={d.lieu} onChange={(v) => set("lieu", v)} /></Field>
              <Field label="Date de signature"><input type="date" className={inputCls} style={inputStyle} value={d.dateSignature || ""} onChange={(e) => set("dateSignature", e.target.value)} /></Field>
              <Field label="État"><Sel value={m.status} onChange={(v) => setM((x) => ({ ...x, status: v }))} options={STATUTS_MANDAT} /></Field>
            </div>
            <Field label="Représentant de l'agence"><Txt value={d.agenceRepresentant} onChange={(v) => set("agenceRepresentant", v)} /></Field>
          </SectionCard>
        </div>
        <div className="xl:sticky xl:top-4">
          <SectionCard title="Texte du mandat" icon={FileSignature}
            action={libre ? <button onClick={() => { if (window.confirm("Reprendre le texte du modèle ? Vos retouches seront perdues.")) setLibre(false); }} className="kb-btn kb-btn-ghost text-xs"><RefreshCw size={13} /> Reprendre le modèle</button>
              : <button onClick={() => { setM((x) => ({ ...x, body: redigerMandat(x.kind, x.data, AGENCY, lettres) })); setLibre(true); }} className="kb-btn kb-btn-ghost text-xs"><Pencil size={13} /> Retoucher le texte</button>}>
            {libre ? <><Avis tone="info">Texte retouché à la main : il ne suit plus le formulaire. « # » titre, « ## » article, « - » énumération.</Avis>
              <textarea rows={30} className={`${inputCls} text-[13px] leading-relaxed`} style={{ ...inputStyle, fontFamily: "Cambria, Georgia, serif" }} value={m.body} onChange={(e) => setM((x) => ({ ...x, body: e.target.value }))} aria-label="Texte du mandat" /></>
              : <div className="rounded-lg border p-5 max-h-[75vh] overflow-y-auto" style={{ borderColor: "var(--line)", background: "#fff" }}><TexteMandat texte={texte} /></div>}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   4. COURRIELS — écrire à un locataire ou à un propriétaire
   ══════════════════════════════════════════════════════════════════════ */
const emailValide = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || "").trim());
const MODELES_MAIL = {
  libre: { label: "Message libre", objet: "", corps: "" },
  rappel: { label: "Rappel de loyer", objet: "Rappel — loyer du mois", corps: "Nous vous rappelons que le loyer du mois en cours n'a pas encore été enregistré à ce jour.\n\nNous vous remercions de bien vouloir procéder à son règlement dans les meilleurs délais, ou de nous indiquer la date à laquelle il interviendra. Si votre paiement vient d'être effectué, merci de ne pas tenir compte de ce message." },
  quittance: { label: "Envoi de quittance", objet: "Votre quittance de loyer", corps: "Veuillez trouver ci-joint votre quittance de loyer.\n\nNous restons à votre disposition pour tout renseignement." },
  passage: { label: "Avis de passage", objet: "Avis de passage dans votre logement", corps: "Nous vous informons qu'un passage est prévu dans votre logement le ………… à …… h, pour …………\n\nMerci de nous confirmer votre présence ou de nous proposer un autre créneau." },
  gestion: { label: "Compte rendu de gestion (propriétaire)", objet: "Votre compte rendu de gestion", corps: "Veuillez trouver ci-joint le compte rendu de gestion de vos biens pour la période écoulée, avec le détail des loyers encaissés, des dépenses et du montant reversé.\n\nNous restons à votre disposition pour toute précision." },
  devis: { label: "Devis à valider (propriétaire)", objet: "Devis de travaux à valider", corps: "Veuillez trouver ci-joint un devis pour des travaux à réaliser dans votre bien : …………\n\nConformément à votre mandat de gestion, merci de nous faire part de votre accord ou de votre refus dans un délai de huit jours." },
};

export function Courriels({ store, me }) {
  const { rows, etat, erreur, charger } = useTable("mail_log");
  const [monMail, setMonMail] = useState(""); const [saisieMail, setSaisieMail] = useState(""); const [mailEtat, setMailEtat] = useState("");
  const [f, setF] = useState({ kind: "locataire", id: "", to: "", nom: "", modele: "libre", objet: "", corps: "" });
  const [q, setQ] = useState(""); const [msg, setMsg] = useState(null); const [vue, setVue] = useState(null);
  useEffect(() => { (async () => {
    const { data, error } = await supabase.from("profiles").select("contact_email").eq("id", me.id).maybeSingle();
    if (error) return setMailEtat(msgErreur(error));
    setMonMail(data?.contact_email || ""); setSaisieMail(data?.contact_email || "");
  })(); }, [me.id]);
  const enregistrerMonMail = async () => {
    const { data, error } = await supabase.rpc("kb_set_contact_email", { p_email: saisieMail });
    if (error) return setMailEtat(msgErreur(error));
    setMonMail(data || ""); setSaisieMail(data || ""); setMailEtat("Adresse enregistrée.");
  };
  const personnes = useMemo(() => {
    const prop = (id) => store.properties.find((p) => p.id === id)?.name || "";
    return f.kind === "locataire"
      ? store.units.filter((u) => (u.tenantName || "").trim()).map((u) => ({ id: u.id, nom: u.tenantName, detail: `${prop(u.propertyId)} — ${u.label}`, email: u.tenantEmail || "" }))
      : f.kind === "proprietaire" ? store.owners.map((o) => ({ id: o.id, nom: o.name, detail: `${store.properties.filter((p) => p.ownerId === o.id).length} bien(s)`, email: o.email || "" })) : [];
  }, [f.kind, store.units, store.owners, store.properties]);
  const visibles = personnes.filter((p) => `${p.nom} ${p.detail}`.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => a.nom.localeCompare(b.nom));
  const choisi = personnes.find((p) => p.id === f.id);
  const choisir = (p) => setF((x) => ({ ...x, id: p.id, nom: p.nom, to: p.email }));
  const appliquerModele = (k) => setF((x) => ({ ...x, modele: k, objet: MODELES_MAIL[k].objet || x.objet, corps: MODELES_MAIL[k].corps || x.corps }));
  const signature = `Cordialement,\n\n${me.name}\n${AGENCY.name} — ${AGENCY.agrement}\n${AGENCY.address}\n${AGENCY.tel}${monMail ? `\n${monMail}` : ""}`;
  const corpsComplet = `${f.kind === "tiers" ? "Bonjour," : `Bonjour ${f.nom || ""},`.replace(" ,", ",")}\n\n${f.corps.trim()}\n\n${signature}`;
  const enregistrerAdresse = async () => {
    if (!emailValide(f.to) || !choisi || choisi.email === f.to.trim()) return null;
    const adresse = f.to.trim().toLowerCase();
    const { error } = f.kind === "locataire" ? await supabase.from("units").update({ tenant_email: adresse }).eq("id", f.id) : await supabase.from("owners").update({ email: adresse }).eq("id", f.id);
    if (error) return error.message;
    await store.actions.reload?.();
    return null;
  };
  const envoyer = async (canal) => {
    setMsg(null);
    if (!emailValide(monMail)) return setMsg({ tone: "rouge", texte: "Enregistrez d'abord votre adresse e-mail professionnelle (une seule fois)." });
    if (!emailValide(f.to)) return setMsg({ tone: "rouge", texte: "L'adresse e-mail du destinataire est manquante ou incomplète." });
    if (!f.objet.trim() || !f.corps.trim()) return setMsg({ tone: "rouge", texte: "Indiquez l'objet et le message." });
    const eAdr = await enregistrerAdresse();
    const { error } = await supabase.from("mail_log").insert({ sender_email: monMail, recipient_kind: f.kind, recipient_id: f.kind === "tiers" ? null : f.id || null, recipient_name: f.nom || "", to_email: f.to.trim().toLowerCase(), subject: f.objet.trim(), body: corpsComplet });
    if (error) return setMsg({ tone: "rouge", texte: msgErreur(error) });
    const to = encodeURIComponent(f.to.trim()), su = encodeURIComponent(f.objet.trim()), body = encodeURIComponent(corpsComplet);
    const url = canal === "gmail" ? `https://mail.google.com/mail/?view=cm&fs=1&authuser=${encodeURIComponent(monMail)}&to=${to}&su=${su}&body=${body}` : `mailto:${f.to.trim()}?subject=${su}&body=${body}`;
    window.open(url, canal === "gmail" ? "_blank" : "_self", "noopener");
    setMsg({ tone: eAdr ? "orange" : "vert", texte: eAdr ? `Message préparé, mais l'adresse n'a pas pu être enregistrée sur la fiche : ${eAdr}` : "Message préparé dans votre messagerie : vérifiez-le, joignez vos pièces et cliquez sur Envoyer. Il est noté dans l'historique." });
    await charger();
  };
  return (
    <div>
      <div className="mb-4"><h1 className="text-2xl font-bold">Courriels</h1><p className="text-sm" style={{ color: "var(--muted)" }}>Écrire à un locataire ou à un propriétaire. Son adresse est reprise de sa fiche ; si elle manque, saisissez-la ici et elle y sera enregistrée.</p></div>
      {etat === "erreur" && <Avis tone="rouge">{erreur}</Avis>}
      <SectionCard title="Mon adresse e-mail professionnelle" icon={Mail}>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[16rem]"><Field label="Adresse utilisée pour écrire aux clients" hint="À saisir une seule fois. Elle figure dans votre signature et sélectionne votre boîte Gmail."><input type="email" className={inputCls} style={inputStyle} value={saisieMail} onChange={(e) => { setSaisieMail(e.target.value); setMailEtat(""); }} placeholder="prenom.nom@gmail.com" /></Field></div>
          <button onClick={enregistrerMonMail} disabled={saisieMail.trim().toLowerCase() === monMail} className="kb-btn kb-btn-primary mb-3"><Check size={15} /> Enregistrer</button>
        </div>
        {mailEtat && <p className="text-sm" style={{ color: /enregistrée/.test(mailEtat) ? "#2F6B1A" : "#B5171D" }}>{mailEtat}</p>}
      </SectionCard>
      <div className="grid lg:grid-cols-[20rem_1fr] gap-4 items-start">
        <SectionCard title="Destinataire" icon={UserPlus}>
          <Field label="Écrire à"><Sel value={f.kind} onChange={(v) => { setF((x) => ({ ...x, kind: v, id: "", nom: "", to: "" })); setQ(""); }} options={{ locataire: "Un locataire", proprietaire: "Un propriétaire", tiers: "Une autre personne" }} /></Field>
          {f.kind === "tiers" ? <Field label="Nom"><Txt value={f.nom} onChange={(v) => setF((x) => ({ ...x, nom: v }))} /></Field> : <>
            <div className="relative mb-2"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} /><input className={`${inputCls} pl-8`} style={inputStyle} placeholder="Rechercher un nom…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un destinataire" /></div>
            <div className="max-h-64 overflow-y-auto rounded-lg border" style={{ borderColor: "var(--line)" }}>{visibles.length === 0 ? <p className="p-3 text-sm" style={{ color: "var(--muted)" }}>Aucun nom trouvé.</p> : visibles.map((p) => (
              <button key={p.id} onClick={() => choisir(p)} className="w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-slate-50" style={{ borderColor: "var(--line)", background: f.id === p.id ? "#EFF6FF" : undefined }}>
                <p className="text-sm font-medium">{p.nom}</p><p className="text-xs" style={{ color: p.email ? "var(--muted)" : "#B7791F" }}>{p.detail} · {p.email || "adresse e-mail à saisir"}</p></button>))}</div></>}
          <div className="mt-3"><Field label="Adresse e-mail du destinataire *" hint={choisi && !choisi.email ? "Elle sera enregistrée sur sa fiche à l'envoi." : choisi && f.to.trim() && f.to.trim() !== choisi.email ? "Adresse modifiée : la fiche sera mise à jour à l'envoi." : undefined}>
            <input type="email" className={inputCls} style={inputStyle} value={f.to} onChange={(e) => setF((x) => ({ ...x, to: e.target.value }))} placeholder="adresse@exemple.com" /></Field></div>
        </SectionCard>
        <SectionCard title="Message" icon={Send}>
          <div className="grid sm:grid-cols-2 gap-x-3">
            <Field label="Modèle"><Sel value={f.modele} onChange={appliquerModele} options={MODELES_MAIL} /></Field>
            <Field label="Objet *"><Txt value={f.objet} onChange={(v) => setF((x) => ({ ...x, objet: v }))} /></Field>
          </div>
          <Field label="Message *" hint="La formule d'appel et votre signature sont ajoutées automatiquement."><textarea rows={8} className={inputCls} style={inputStyle} value={f.corps} onChange={(e) => setF((x) => ({ ...x, corps: e.target.value }))} /></Field>
          <details className="mb-3 text-sm"><summary className="cursor-pointer" style={{ color: "var(--muted)" }}>Aperçu du message complet</summary><pre className="mt-2 p-3 rounded-lg border whitespace-pre-wrap text-[13px]" style={{ borderColor: "var(--line)", fontFamily: "inherit" }}>{corpsComplet}</pre></details>
          {msg && <Avis tone={msg.tone}>{msg.texte}</Avis>}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => envoyer("gmail")} className="kb-btn kb-btn-primary"><Send size={15} /> Ouvrir dans Gmail</button>
            <button onClick={() => envoyer("mailto")} className="kb-btn kb-btn-ghost"><Mail size={15} /> Ouvrir dans ma messagerie</button>
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>Le message s'ouvre tout rédigé dans votre boîte : il part de votre adresse, et vous pouvez y joindre une quittance ou un document avant de l'envoyer.</p>
        </SectionCard>
      </div>
      <SectionCard title="Historique des messages préparés" icon={Mail} pad={false}>
        {rows.length === 0 ? <EmptyState icon={Mail} title="Aucun message" /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-xs" style={{ color: "var(--muted)", background: "#F8FAFC" }}>{["Date", "Agent", "Destinataire", "Adresse", "Objet"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id} className="border-t cursor-pointer hover:bg-slate-50" style={{ borderColor: "var(--line)" }} onClick={() => setVue(r)}>
              <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
              <td className="px-3 py-2">{store.members.find((m) => m.id === r.sender_id)?.name || r.sender_email}</td>
              <td className="px-3 py-2 font-medium">{r.recipient_name || "—"}<span className="font-normal text-xs" style={{ color: "var(--muted)" }}> · {{ locataire: "locataire", proprietaire: "propriétaire", tiers: "autre" }[r.recipient_kind]}</span></td>
              <td className="px-3 py-2">{r.to_email}</td><td className="px-3 py-2">{r.subject}</td></tr>)}</tbody>
          </table></div>)}
      </SectionCard>
      {vue && <Modal title={vue.subject} onClose={() => setVue(null)}><p className="text-sm mb-2" style={{ color: "var(--muted)" }}>De {vue.sender_email} à {vue.to_email} — {new Date(vue.created_at).toLocaleString("fr-FR")}</p><pre className="whitespace-pre-wrap text-sm" style={{ fontFamily: "inherit" }}>{vue.body}</pre></Modal>}
    </div>
  );
}

export { dateLongue };
