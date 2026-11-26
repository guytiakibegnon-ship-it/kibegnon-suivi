/* ============================================================================
 *  ENTREPRISE KIBEGNON · SUIVI D'ÉQUIPE — fiches de visite (version 38)
 *  Visite d'un bien avec un prospect, en vue d'une location ou d'une vente :
 *  bien visité, critères du prospect, impressions, intérêt, offre et suite à
 *  donner. La fiche imprimée vaut bon de visite, signé par le prospect et
 *  l'agent. Le prospect suivi dans l'outil passe en « visite effectuée ».
 *  Tables : migration-v38.sql.
 * ==========================================================================*/
import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, ArrowLeft, Check, ClipboardList, Eye, MessageCircle, Pencil, Plus, Printer, Search, Trash2 } from "lucide-react";
import { supabase } from "./supabaseClient";
import { Modal, Field, Chip, StatCard, EmptyState, PrintPage, PrintHead, printSheet, fcfa, inputCls, inputStyle, nomFichier } from "./App.jsx";
import { EnvoiMessage } from "./WhatsApp.jsx";

const INSTALL = "Les fiches de visite ne sont pas encore installées : exécutez migration-v38.sql dans Supabase.";
const msgErreur = (e) => (/does not exist|schema cache|Could not find/i.test(e?.message || "") ? INSTALL : e?.message || "Erreur inconnue");
const jour = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; };
const fmt = (x) => (x ? String(x).slice(0, 10).split("-").reverse().join("/") : "—");
const SUP = ["admin", "gerante", "responsable_admin"];

export const OPERATIONS = { location: "Location", vente: "Vente" };
export const INTERETS = {
  tres_interesse: { label: "Très intéressé", color: "#2F6B1A" },
  interesse:      { label: "Intéressé",      color: "#1F5C82" },
  hesitant:       { label: "Hésitant",       color: "#B7791F" },
  pas_interesse:  { label: "Pas intéressé",  color: "#B5171D" },
};
export const STATUTS_VISITE = { programmee: { label: "Programmée", color: "#7C3AED" }, effectuee: { label: "Effectuée", color: "#2F6B1A" }, annulee: { label: "Annulée", color: "#94A3B8" } };
export const SUITES = {
  "": "— À décider —", rappeler: "Rappeler le prospect", deuxieme_visite: "Deuxième visite", dossier_location: "Constituer le dossier de location",
  offre_achat: "Offre d'achat à transmettre au propriétaire", reflexion: "Le prospect réfléchit", abandon: "Sans suite",
};
/* Points observés pendant la visite */
export const ASPECTS = [
  ["etat", "État général du bien"], ["proprete", "Propreté"], ["luminosite", "Luminosité, aération"], ["eau_electricite", "Eau et électricité"],
  ["securite", "Sécurité, gardiennage"], ["acces", "Accès, voirie, stationnement"], ["voisinage", "Voisinage, environnement"], ["prix", "Prix ou loyer"],
];
const NOTES = { "": "—", bien: "Satisfaisant", moyen: "Moyen", faible: "À revoir" };

export const mVisitePro = (r) => ({ id: r.id, ref: r.ref || "", operation: r.operation || "location", visitDate: r.visit_date || "", visitTime: r.visit_time || "",
  prospectId: r.prospect_id || "", prospectName: r.prospect_name || "", prospectPhone: r.prospect_phone || "", prospectEmail: r.prospect_email || "", prospectPiece: r.prospect_piece || "",
  propertyId: r.property_id || "", unitId: r.unit_id || "", bienLibelle: r.bien_libelle || "", adresse: r.adresse || "", prix: Number(r.prix) || 0, agentId: r.agent_id || "",
  interet: r.interet || "", data: r.data || {}, observations: r.observations || "", status: r.status || "effectuee", createdBy: r.created_by, createdAt: r.created_at });
const versBase = (f) => ({ operation: f.operation, visit_date: f.visitDate || jour(), visit_time: f.visitTime || "", prospect_id: f.prospectId || null,
  prospect_name: (f.prospectName || "").trim(), prospect_phone: (f.prospectPhone || "").trim(), prospect_email: (f.prospectEmail || "").trim().toLowerCase(), prospect_piece: f.prospectPiece || "",
  property_id: f.propertyId || null, unit_id: f.unitId || null, bien_libelle: f.bienLibelle || "", adresse: f.adresse || "", prix: Number(f.prix) || 0,
  agent_id: f.agentId || null, interet: f.interet || "", data: f.data || {}, observations: f.observations || "", status: f.status || "effectuee" });
export function validerVisite(f) {
  const e = [];
  if (!(f.prospectName || "").trim()) e.push("Indiquez le nom du prospect.");
  if (!f.propertyId && !(f.bienLibelle || "").trim()) e.push("Indiquez le bien visité.");
  if (!f.visitDate) e.push("Indiquez la date de la visite.");
  return e;
}

/* Désignation du bien visité */
const designation = (v, store) => {
  const p = (store.properties || []).find((x) => x.id === v.propertyId);
  const u = (store.units || []).find((x) => x.id === v.unitId);
  return p ? [p.name, u?.label].filter(Boolean).join(" — ") : v.bienLibelle || "—";
};
const adresseDe = (v, store) => { const p = (store.properties || []).find((x) => x.id === v.propertyId); return v.adresse || (p ? [p.address, p.quartier, p.commune].filter(Boolean).join(", ") : ""); };

/* ══ Fiche imprimée (vaut bon de visite) ══ */
function FicheVisite({ v, store }) {
  const agent = (store.members || []).find((m) => m.id === v.agentId)?.name || "";
  const d = v.data || {};
  const Ligne = ({ k, children }) => <tr><td className="py-0.5 pr-3 text-xs align-top" style={{ color: "#4B5563", width: "34%" }}>{k}</td><td className="py-0.5 text-sm align-top">{children || "……………………………"}</td></tr>;
  const T = ({ children }) => <p className="text-[11px] font-bold mt-4 mb-1.5" style={{ color: "var(--brass)" }}>{children}</p>;
  return (<>
    <PrintHead title="FICHE DE VISITE" subtitle={v.ref} extra={<p className="text-[11px]" style={{ color: "var(--muted)" }}>{OPERATIONS[v.operation]} · {fmt(v.visitDate)}{v.visitTime ? ` à ${v.visitTime}` : ""}</p>} />
    <div className="grid grid-cols-2 gap-6">
      <div><T>LE BIEN VISITÉ</T>
        <table className="w-full"><tbody>
          <Ligne k="Bien">{designation(v, store)}</Ligne><Ligne k="Adresse">{adresseDe(v, store)}</Ligne>
          <Ligne k={v.operation === "vente" ? "Prix annoncé" : "Loyer annoncé"}>{v.prix ? fcfa(v.prix) : ""}</Ligne>
          <Ligne k="Agent">{agent}</Ligne></tbody></table></div>
      <div><T>LE PROSPECT</T>
        <table className="w-full"><tbody>
          <Ligne k="Nom et prénoms">{v.prospectName}</Ligne><Ligne k="Téléphone">{v.prospectPhone}</Ligne>
          {v.prospectEmail && <Ligne k="E-mail">{v.prospectEmail}</Ligne>}<Ligne k="Pièce d'identité">{v.prospectPiece}</Ligne>
          <Ligne k="Recherche">{d.criteres}</Ligne></tbody></table></div>
    </div>
    <T>IMPRESSIONS DE LA VISITE</T>
    <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}><tbody>
      {ASPECTS.map(([k, l]) => <tr key={k} style={{ borderBottom: "1px solid #E6E9EE" }}><td className="py-0.5 text-xs" style={{ width: "40%" }}>{l}</td><td className="py-0.5 text-xs">{NOTES[d.aspects?.[k] || ""]}</td><td className="py-0.5 text-xs" style={{ color: "#4B5563" }}>{d.remarques?.[k] || ""}</td></tr>)}
    </tbody></table>
    <table className="w-full mt-2"><tbody>
      <Ligne k="Points forts relevés">{d.pointsForts}</Ligne><Ligne k="Réserves du prospect">{d.pointsFaibles}</Ligne>
      <Ligne k="Intérêt du prospect">{INTERETS[v.interet]?.label}</Ligne>
      {(d.offre || v.operation === "vente") && <Ligne k={v.operation === "vente" ? "Offre de prix" : "Loyer proposé"}>{d.offre ? fcfa(d.offre) : ""}</Ligne>}
      <Ligne k="Suite à donner">{d.suite ? `${SUITES[d.suite]}${d.dateSuite ? ` — le ${fmt(d.dateSuite)}` : ""}` : ""}</Ligne>
      {v.observations && <Ligne k="Observations">{v.observations}</Ligne>}</tbody></table>
    <div className="rounded-lg p-3 mt-4 text-xs leading-relaxed" style={{ border: "1px solid #C9D1DA", background: "#FAFBFC", breakInside: "avoid" }}>
      <p className="font-bold mb-1">BON DE VISITE</p>
      Je soussigné(e) <strong>{v.prospectName || "…………………………"}</strong> reconnais avoir visité ce jour le bien désigné ci-dessus, qui m'a été présenté par
      l'Entreprise Kibegnon, agent immobilier agréé AG-0456. Si je donne suite à cette visite, je m'engage à traiter
      {v.operation === "vente" ? " l'acquisition" : " la location"} de ce bien par l'intermédiaire de l'agence.
    </div>
    <div className="grid grid-cols-2 gap-8 mt-5" style={{ breakInside: "avoid" }}>
      <div className="text-center"><p className="text-xs font-semibold">Le prospect</p><p className="text-[10px]" style={{ color: "var(--muted)" }}>Date et signature, précédées de « Lu et approuvé »</p><div style={{ height: 56 }} /><div className="border-t" style={{ borderColor: "var(--ink)" }} /></div>
      <div className="text-center"><p className="text-xs font-semibold">Pour l'agence</p><p className="text-[10px]" style={{ color: "var(--muted)" }}>{agent || "L'agent accompagnateur"}</p><div style={{ height: 56 }} /><div className="border-t" style={{ borderColor: "var(--ink)" }} /></div>
    </div>
  </>);
}

/* ══ Formulaire ══ */
function VisiteModal({ initial, store, me, onClose }) {
  const [f, setF] = useState(() => ({ operation: "location", visitDate: jour(), visitTime: "", status: "effectuee", agentId: me?.id || "", data: {}, ...initial }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setD = (k, v) => setF((p) => ({ ...p, data: { ...(p.data || {}), [k]: v } }));
  const setAspect = (k, v) => setF((p) => ({ ...p, data: { ...(p.data || {}), aspects: { ...(p.data?.aspects || {}), [k]: v } } }));
  const setRemarque = (k, v) => setF((p) => ({ ...p, data: { ...(p.data || {}), remarques: { ...(p.data?.remarques || {}), [k]: v } } }));
  const prospects = (store.prospects || []).filter((p) => !["converti", "perdu"].includes(p.status) || p.id === f.prospectId);
  const choisirProspect = (id) => {
    const p = (store.prospects || []).find((x) => x.id === id);
    setF((s) => ({ ...s, prospectId: id, ...(p ? { prospectName: p.name, prospectPhone: p.phone || "", prospectEmail: p.email || "", operation: p.operation || s.operation,
      propertyId: s.propertyId || p.propertyId || "", unitId: s.unitId || p.unitId || "" } : {}) }));
  };
  const biens = store.properties || [];
  const lots = (store.units || []).filter((u) => u.propertyId === f.propertyId);
  const choisirBien = (id) => {
    const p = biens.find((x) => x.id === id);
    setF((s) => ({ ...s, propertyId: id, unitId: "", prix: s.prix || (s.operation === "vente" ? p?.salePrice : p?.rent) || "" }));
  };
  const erreurs = validerVisite(f);
  const enregistrer = async () => {
    setBusy(true); setErr("");
    const row = versBase(f);
    const { data, error } = f.id ? await supabase.from("prospect_visits").update(row).eq("id", f.id).select().single() : await supabase.from("prospect_visits").insert(row).select().single();
    if (error) { setBusy(false); return setErr(msgErreur(error)); }
    /* Le prospect suivi dans l'outil avance : visite programmée ou effectuée, avec une trace dans son historique */
    const p = (store.prospects || []).find((x) => x.id === f.prospectId);
    if (p && f.status !== "annulee") {
      const ordre = ["nouveau", "a_contacter", "contacte", "visite_programmee", "visite_effectuee", "dossier_depose", "converti", "perdu"];
      const cible = f.status === "effectuee" ? "visite_effectuee" : "visite_programmee";
      const statut = ordre.indexOf(p.status) < ordre.indexOf(cible) ? cible : p.status;
      const deja = (p.contacts || []).some((c) => c.ref === data.ref);
      const contacts = deja ? p.contacts : [...(p.contacts || []), { date: f.visitDate, channel: "visite", result: `Fiche de visite ${data.ref} — ${designation(f, store)}${f.interet ? ` — ${INTERETS[f.interet].label.toLowerCase()}` : ""}`, by: me?.name || "", ref: data.ref }];
      await store.actions?.saveProspect?.({ ...p, status: statut, contacts });
    }
    setBusy(false); onClose(mVisitePro(data));
  };
  const d = f.data || {};
  return (
    <Modal title={f.id ? `Fiche de visite ${f.ref}` : "Nouvelle fiche de visite"} onClose={() => onClose()} wide>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Opération"><select className={inputCls} style={inputStyle} value={f.operation} onChange={(e) => set("operation", e.target.value)}>{Object.entries(OPERATIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Date *"><input type="date" className={inputCls} style={inputStyle} value={f.visitDate} onChange={(e) => set("visitDate", e.target.value)} /></Field>
        <Field label="Heure"><input type="time" className={inputCls} style={inputStyle} value={f.visitTime} onChange={(e) => set("visitTime", e.target.value)} /></Field>
        <Field label="État"><select className={inputCls} style={inputStyle} value={f.status} onChange={(e) => set("status", e.target.value)}>{Object.entries(STATUTS_VISITE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--muted)" }}>Prospect</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Prospect suivi dans l'outil" hint="Facultatif : reprend ses coordonnées et met son suivi à jour"><select className={inputCls} style={inputStyle} value={f.prospectId || ""} onChange={(e) => choisirProspect(e.target.value)} aria-label="Prospect suivi">
          <option value="">— Prospect non enregistré —</option>{prospects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.phone ? ` · ${p.phone}` : ""}</option>)}</select></Field>
        <Field label="Nom et prénoms *"><input className={inputCls} style={inputStyle} value={f.prospectName || ""} onChange={(e) => set("prospectName", e.target.value)} aria-label="Nom du prospect" /></Field>
        <Field label="Téléphone"><input className={inputCls} style={inputStyle} value={f.prospectPhone || ""} onChange={(e) => set("prospectPhone", e.target.value)} /></Field>
        <Field label="E-mail"><input type="email" className={inputCls} style={inputStyle} value={f.prospectEmail || ""} onChange={(e) => set("prospectEmail", e.target.value)} /></Field>
        <Field label="Pièce d'identité présentée" hint="Type et numéro"><input className={inputCls} style={inputStyle} value={f.prospectPiece || ""} onChange={(e) => set("prospectPiece", e.target.value)} placeholder="CNI n° …" /></Field>
        <Field label="Ce qu'il recherche"><input className={inputCls} style={inputStyle} value={d.criteres || ""} onChange={(e) => setD("criteres", e.target.value)} placeholder="Budget, nombre de pièces, quartier…" /></Field>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--muted)" }}>Bien visité</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Bien du patrimoine"><select className={inputCls} style={inputStyle} value={f.propertyId || ""} onChange={(e) => choisirBien(e.target.value)} aria-label="Bien visité">
          <option value="">— Bien hors patrimoine —</option>{biens.map((p) => <option key={p.id} value={p.id}>{p.name}{p.commune ? ` · ${p.commune}` : ""}</option>)}</select></Field>
        {f.propertyId ? <Field label="Lot"><select className={inputCls} style={inputStyle} value={f.unitId || ""} onChange={(e) => { const u = lots.find((x) => x.id === e.target.value); setF((s) => ({ ...s, unitId: e.target.value, prix: s.operation === "location" && u?.rent ? u.rent : s.prix })); }}>
            <option value="">— Tout le bien —</option>{lots.map((u) => <option key={u.id} value={u.id}>{u.label}{u.tenantName ? " (occupé)" : ""}</option>)}</select></Field>
          : <Field label="Désignation du bien *"><input className={inputCls} style={inputStyle} value={f.bienLibelle || ""} onChange={(e) => set("bienLibelle", e.target.value)} placeholder="Ex. Villa 4 pièces, Riviera 3" /></Field>}
        <Field label={f.operation === "vente" ? "Prix annoncé (F CFA)" : "Loyer annoncé (F CFA)"}><input type="number" min={0} className={inputCls} style={inputStyle} value={f.prix || ""} onChange={(e) => set("prix", e.target.value)} /></Field>
      </div>
      {!f.propertyId && <Field label="Adresse"><input className={inputCls} style={inputStyle} value={f.adresse || ""} onChange={(e) => set("adresse", e.target.value)} /></Field>}
      {f.status !== "programmee" && <>
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--muted)" }}>Impressions de la visite</p>
        <div className="rounded-lg border divide-y mb-3" style={{ borderColor: "var(--line)" }}>{ASPECTS.map(([k, l]) => (
          <div key={k} className="grid grid-cols-12 gap-2 items-center px-2 py-1.5">
            <span className="col-span-12 sm:col-span-4 text-xs">{l}</span>
            <select className="col-span-5 sm:col-span-3 rounded border text-xs px-1.5 py-1" style={inputStyle} value={d.aspects?.[k] || ""} onChange={(e) => setAspect(k, e.target.value)} aria-label={l}>
              {Object.entries(NOTES).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
            <input className="col-span-7 sm:col-span-5 rounded border text-xs px-1.5 py-1" style={inputStyle} value={d.remarques?.[k] || ""} onChange={(e) => setRemarque(k, e.target.value)} placeholder="Remarque" aria-label={`Remarque : ${l}`} />
          </div>))}</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Points forts relevés"><textarea rows={2} className={inputCls} style={inputStyle} value={d.pointsForts || ""} onChange={(e) => setD("pointsForts", e.target.value)} /></Field>
          <Field label="Réserves du prospect"><textarea rows={2} className={inputCls} style={inputStyle} value={d.pointsFaibles || ""} onChange={(e) => setD("pointsFaibles", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Intérêt"><select className={inputCls} style={inputStyle} value={f.interet || ""} onChange={(e) => set("interet", e.target.value)} aria-label="Intérêt du prospect"><option value="">—</option>{Object.entries(INTERETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          <Field label={f.operation === "vente" ? "Offre de prix" : "Loyer proposé"}><input type="number" min={0} className={inputCls} style={inputStyle} value={d.offre || ""} onChange={(e) => setD("offre", e.target.value)} /></Field>
          <Field label="Suite à donner"><select className={inputCls} style={inputStyle} value={d.suite || ""} onChange={(e) => setD("suite", e.target.value)}>{Object.entries(SUITES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Pour le"><input type="date" className={inputCls} style={inputStyle} value={d.dateSuite || ""} onChange={(e) => setD("dateSuite", e.target.value)} /></Field>
        </div>
      </>}
      <Field label="Observations"><textarea rows={2} className={inputCls} style={inputStyle} value={f.observations || ""} onChange={(e) => set("observations", e.target.value)} /></Field>
      {erreurs.length > 0 && <div className="text-xs rounded-lg p-2 mb-2" style={{ background: "#FFF8EC", color: "#8A6212" }}>{erreurs.map((e) => <p key={e}>• {e}</p>)}</div>}
      {err && <p className="text-xs mb-2 flex items-center gap-1" style={{ color: "#B5171D" }}><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2"><button onClick={() => onClose()} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={busy || erreurs.length > 0} onClick={enregistrer} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={15} /> {busy ? "Enregistrement…" : "Enregistrer la fiche"}</button></div>
    </Modal>
  );
}

/* ══ Liste des fiches de visite ══ */
export function BonsVisite({ store, me }) {
  const [rows, setRows] = useState([]); const [etat, setEtat] = useState("chargement"); const [erreur, setErreur] = useState("");
  const [modal, setModal] = useState(null); const [vue, setVue] = useState(null); const [envoi, setEnvoi] = useState(null);
  const [q, setQ] = useState(""); const [op, setOp] = useState(""); const [msg, setMsg] = useState("");
  const sup = SUP.includes(me?.role);
  const charger = useCallback(async () => {
    const { data, error } = await supabase.from("prospect_visits").select("*").order("visit_date", { ascending: false }).limit(1000);
    if (error) { setErreur(msgErreur(error)); setEtat("erreur"); return; }
    setRows((data || []).map(mVisitePro)); setEtat("pret");
  }, []);
  useEffect(() => { charger(); }, [charger]);
  const liste = rows.filter((v) => (!op || v.operation === op) && (!q.trim() || `${v.ref} ${v.prospectName} ${designation(v, store)}`.toLowerCase().includes(q.trim().toLowerCase())));
  const ceMois = rows.filter((v) => (v.visitDate || "").slice(0, 7) === jour().slice(0, 7) && v.status === "effectuee").length;
  const fermer = async (v) => { setModal(null); if (v) { setMsg(`Fiche ${v.ref} enregistrée.`); await charger(); } };
  const supprimer = async (v) => {
    if (!window.confirm(`Supprimer la fiche de visite ${v.ref} ?`)) return;
    const { data, error } = await supabase.from("prospect_visits").delete().eq("id", v.id).select();
    if (error || !data?.length) setMsg(error ? msgErreur(error) : "Suppression réservée à la direction."); else { setVue(null); charger(); }
  };
  const confirmer = (v) => setEnvoi({ titre: `Visite ${v.ref} — ${v.prospectName}`, modeleInitial: "visite_confirmation",
    destinataires: [{ nom: v.prospectName, telephone: v.prospectPhone, email: v.prospectEmail, kind: "prospect" }],
    valeurs: { bien: designation(v, store), date_visite: `${fmt(v.visitDate)}${v.visitTime ? ` à ${v.visitTime}` : ""}`, agent: (store.members || []).find((m) => m.id === v.agentId)?.name || me?.name || "" } });

  if (vue) return (
    <div>
      <div className="flex justify-between gap-2 flex-wrap mb-3 print:hidden">
        <button onClick={() => setVue(null)} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour aux fiches de visite</button>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setModal(vue)} className="kb-btn kb-btn-ghost text-sm"><Pencil size={15} /> Modifier</button>
          <button onClick={() => confirmer(vue)} className="kb-btn text-sm" style={{ background: "#128C4B", color: "#fff" }}><MessageCircle size={15} /> Écrire au prospect</button>
          <button onClick={() => printSheet("portrait")} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF</button>
        </div>
      </div>
      <PrintPage className="bg-white rounded-xl border p-6 max-w-3xl mx-auto" style={{ borderColor: "var(--line)" }}
        nom={nomFichier(`Fiche de visite ${vue.ref}`, vue.prospectName, designation(vue, store), fmt(vue.visitDate).replace(/\//g, "-"))}>
        <FicheVisite v={vue} store={store} />
      </PrintPage>
      {modal && <VisiteModal initial={modal} store={store} me={me} onClose={async (v) => { setModal(null); if (v) { setVue(v); await charger(); } }} />}
      {envoi && <EnvoiMessage {...envoi} store={store} me={me} onClose={() => setEnvoi(null)} />}
    </div>
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div><h1 className="text-xl font-bold flex items-center gap-2"><Eye size={20} style={{ color: "var(--brass)" }} /> Visites avec les prospects</h1>
          <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>Une fiche par visite de bien, en location ou en vente. Imprimée, elle vaut bon de visite signé par le prospect.</p></div>
        <button onClick={() => setModal({})} className="kb-btn kb-btn-primary text-sm"><Plus size={15} /> Nouvelle fiche de visite</button>
      </div>
      {etat === "erreur" && <p className="text-sm rounded p-3 mb-3" style={{ background: "#FFF8EC", color: "#8A6212" }}>{erreur}</p>}
      {msg && <p className="text-sm rounded p-2 mb-3" role="status" style={{ background: "#EAF6E3", color: "#2F6B1A" }}>{msg}</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Eye} label="Visites ce mois-ci" value={ceMois} tint="var(--brass)" />
        <StatCard icon={ClipboardList} label="Programmées" value={rows.filter((v) => v.status === "programmee").length} tint="#7C3AED" />
        <StatCard icon={Check} label="Prospects très intéressés" value={rows.filter((v) => v.interet === "tres_interesse").length} tint="#2F6B1A" />
        <StatCard icon={ClipboardList} label="Fiches enregistrées" value={rows.length} tint="#2E78A8" />
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <select value={op} onChange={(e) => setOp(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} aria-label="Opération"><option value="">Location et vente</option>{Object.entries(OPERATIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <div className="relative flex-1 min-w-[200px]"><Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Prospect, bien, référence…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} /></div>
      </div>
      {etat === "pret" && !liste.length ? <EmptyState icon={Eye} title="Aucune fiche de visite" sub="Créez une fiche à chaque visite d'un bien avec un prospect." /> : (
        <div className="bg-white rounded-xl border overflow-x-auto" style={{ borderColor: "var(--line)" }}><table className="w-full text-sm">
          <thead><tr className="text-left text-xs" style={{ color: "var(--muted)" }}><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Réf.</th><th className="px-3 py-2 font-medium">Prospect</th>
            <th className="px-3 py-2 font-medium">Bien visité</th><th className="px-3 py-2 font-medium">Intérêt</th><th className="px-3 py-2 font-medium">Suite</th><th className="px-3 py-2" /></tr></thead>
          <tbody>{liste.map((v) => (
            <tr key={v.id} className="border-t hover:bg-slate-50 cursor-pointer" style={{ borderColor: "var(--line)" }} onClick={() => setVue(v)}>
              <td className="px-3 py-2 whitespace-nowrap text-xs">{fmt(v.visitDate)}{v.visitTime ? ` ${v.visitTime}` : ""}<br /><Chip color={STATUTS_VISITE[v.status].color}>{STATUTS_VISITE[v.status].label}</Chip></td>
              <td className="px-3 py-2 font-mono text-xs">{v.ref}<br /><span style={{ color: "var(--muted)" }}>{OPERATIONS[v.operation]}</span></td>
              <td className="px-3 py-2"><p className="font-medium">{v.prospectName}</p><p className="text-[11px]" style={{ color: "var(--muted)" }}>{v.prospectPhone}</p></td>
              <td className="px-3 py-2 text-xs">{designation(v, store)}{v.prix ? <><br /><span style={{ color: "var(--muted)" }}>{fcfa(v.prix)}</span></> : null}</td>
              <td className="px-3 py-2">{v.interet ? <Chip color={INTERETS[v.interet].color}>{INTERETS[v.interet].label}</Chip> : "—"}</td>
              <td className="px-3 py-2 text-xs">{SUITES[v.data?.suite || ""]}{v.data?.dateSuite ? <><br />{fmt(v.data.dateSuite)}</> : null}</td>
              <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>{sup && <button onClick={() => supprimer(v)} className="p-1.5 rounded hover:bg-red-50 text-red-500" aria-label={`Supprimer la fiche ${v.ref}`}><Trash2 size={14} /></button>}</td>
            </tr>))}</tbody></table></div>)}
      {modal && <VisiteModal initial={modal} store={store} me={me} onClose={async (v) => { await fermer(v); if (v) setVue(v); }} />}
      {envoi && <EnvoiMessage {...envoi} store={store} me={me} onClose={() => setEnvoi(null)} />}
    </div>
  );
}
