import { useState, useMemo } from "react";
import {
  FileText, Plus, Search, Pencil, Trash2, Check, X, Printer, Hammer, Building2,
  UserRound, AlertTriangle, Wallet, MessageCircle, ArrowLeft, BadgeCheck,
} from "lucide-react";
import { QUOTE_SOURCE, QUOTE_STATUS, QUOTE_STATUS_ORDER, TRADES, canSupervise } from "../constants";
import { fcfa, fcfaLong, fr, qty, isoDate, amountInWords } from "../helpers";
import { Modal, Field, Chip, StatCard, EmptyState, inputCls, inputStyle } from "../ui";
import { LineEditor } from "./Documents.jsx";
import { LOGO } from "../constants";

/* ---------------- Modale de saisie ---------------- */
function QuoteModal({ initial, initialLines, properties, owners, onSave, onClose }) {
  const [f, setF] = useState(() => ({
    artisanName: "", trade: "", phone: "", propertyId: "", ownerId: "", date: isoDate(new Date()),
    source: "whatsapp", object: "", status: "recu", notes: "", ...initial,
  }));
  const [lines, setLines] = useState(() => initialLines?.length ? initialLines : [{ label: "", qty: 1, unit: "u", price: 0 }]);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setLine = (i, k, v) => setLines((p) => p.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  /* auto-remplissage du propriétaire depuis le bien */
  const pickProperty = (id) => {
    const prop = properties.find((p) => p.id === id);
    setF((s) => ({ ...s, propertyId: id, ownerId: prop?.ownerId || s.ownerId }));
  };

  const total = lines.reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);
  const valid = f.artisanName.trim() && lines.some((l) => (l.label || "").trim());
  const submit = async () => { setBusy(true); const r = await onSave(f, lines); setBusy(false); if (r?.error) setErr(r.error); else onClose(); };

  return (
    <Modal title={f.id ? `Devis ${f.ref || ""}` : "Reproduire un devis artisan"} onClose={onClose} wide>
      <div className="rounded-lg p-3 mb-4 text-xs" style={{ background: "#F6F8FA", color: "var(--muted)" }}>
        Recopiez ici le devis reçu sur papier ou par WhatsApp. L'artisan reste l'auteur du devis : son nom est conservé comme <strong>paternité</strong>, et la fiche sert de justificatif au propriétaire.
      </div>

      <p className="text-xs font-semibold mb-2" style={{ color: "var(--ink)" }}>Auteur du devis</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Nom de l'artisan"><input className={inputCls} style={inputStyle} value={f.artisanName} autoFocus onChange={(e) => set("artisanName", e.target.value)} placeholder="Ex. M. TRAORÉ Ibrahim" /></Field>
        <Field label="Corps de métier">
          <input list="trades-list" className={inputCls} style={inputStyle} value={f.trade} onChange={(e) => set("trade", e.target.value)} placeholder="Plomberie…" />
          <datalist id="trades-list">{TRADES.map((t) => <option key={t} value={t} />)}</datalist>
        </Field>
        <Field label="Téléphone"><input className={inputCls} style={inputStyle} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+225 07 ..." /></Field>
      </div>

      <p className="text-xs font-semibold mb-2 mt-1" style={{ color: "var(--ink)" }}>Rattachement</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Bien concerné">
          <select className={inputCls} style={inputStyle} value={f.propertyId || ""} onChange={(e) => pickProperty(e.target.value)}>
            <option value="">— Non rattaché —</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Propriétaire (dossier)" hint="Rempli automatiquement depuis le bien">
          <select className={inputCls} style={inputStyle} value={f.ownerId || ""} onChange={(e) => set("ownerId", e.target.value)}>
            <option value="">— Non rattaché —</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Date du devis"><input type="date" className={inputCls} style={inputStyle} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
        <Field label="Reçu par"><select className={inputCls} style={inputStyle} value={f.source} onChange={(e) => set("source", e.target.value)}>{Object.entries(QUOTE_SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Statut"><select className={inputCls} style={inputStyle} value={f.status} onChange={(e) => set("status", e.target.value)}>{QUOTE_STATUS_ORDER.map((k) => <option key={k} value={k}>{QUOTE_STATUS[k].label}</option>)}</select></Field>
      </div>
      <Field label="Objet des travaux"><input className={inputCls} style={inputStyle} value={f.object} onChange={(e) => set("object", e.target.value)} placeholder="Ex. Réfection plomberie salle de bain 2e étage" /></Field>

      <p className="text-xs font-semibold mb-2 mt-1" style={{ color: "var(--ink)" }}>Détail du devis</p>
      <LineEditor lines={lines} setLines={setLines} labelPlaceholder="Ex. Fourniture et pose de robinetterie" />
      <div className="mb-3" />
      <Field label="Observations"><textarea className={inputCls} style={inputStyle} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Conditions, délai annoncé, garantie…" /></Field>
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!valid || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> {busy ? "…" : "Enregistrer le devis"}</button>
      </div>
    </Modal>
  );
}

/* ---------------- Fiche imprimable ---------------- */
function QuoteSheet({ quote, lines, property, owner, recorder, onBack }) {
  const st = QUOTE_STATUS[quote.status];
  return (
    <div>
      <div className="flex items-center justify-between mb-3 print:hidden gap-2 flex-wrap">
        <button onClick={onBack} className="kb-btn kb-btn-ghost text-sm"><ArrowLeft size={15} /> Retour aux devis</button>
        <button onClick={() => window.print()} className="kb-btn kb-btn-primary"><Printer size={16} /> Imprimer / PDF</button>
      </div>

      <div id="print-area" className="bg-white rounded-xl border p-6 max-w-3xl mx-auto" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-start justify-between gap-4 pb-4 border-b" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="Entreprise Kibegnon" className="h-12 w-auto" />
            <div>
              <p className="font-bold text-sm" style={{ color: "var(--ink)" }}>ENTREPRISE KIBEGNON</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>Agence immobilière · Cocody, Abidjan</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color: "var(--brass)" }}>{quote.ref}</p>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>Fiche de devis artisan</p>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>{fr(quote.date + "T00:00:00", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: "var(--muted)" }}>Auteur du devis</p>
            <p className="text-sm font-semibold">{quote.artisanName}</p>
            {quote.trade && <p className="text-xs" style={{ color: "var(--muted)" }}>{quote.trade}</p>}
            {quote.phone && <p className="text-xs" style={{ color: "var(--muted)" }}>{quote.phone}</p>}
            <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>Devis transmis par : {QUOTE_SOURCE[quote.source]}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: "var(--muted)" }}>Dossier</p>
            {property && <p className="text-sm font-semibold">{property.name}</p>}
            {property && <p className="text-xs" style={{ color: "var(--muted)" }}>{[property.quartier, property.commune].filter(Boolean).join(", ")}</p>}
            {owner && <p className="text-xs mt-1">Propriétaire : <strong>{owner.name}</strong></p>}
            {!property && !owner && <p className="text-xs" style={{ color: "var(--muted)" }}>Non rattaché</p>}
          </div>
        </div>

        {quote.object && <div className="pb-3">
          <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: "var(--muted)" }}>Objet des travaux</p>
          <p className="text-sm">{quote.object}</p>
        </div>}

        <table className="w-full text-sm mb-4">
          <thead><tr style={{ background: "#F6F8FA" }}>
            <th className="text-left px-3 py-2 font-medium">Désignation</th>
            <th className="text-right px-2 py-2 font-medium w-16">Qté</th>
            <th className="text-left px-2 py-2 font-medium w-14">Unité</th>
            <th className="text-right px-2 py-2 font-medium w-28">P. unitaire</th>
            <th className="text-right px-3 py-2 font-medium w-28">Montant</th>
          </tr></thead>
          <tbody>{lines.map((l) => (
            <tr key={l.id} className="border-b" style={{ borderColor: "var(--line)" }}>
              <td className="px-3 py-2">{l.label}</td>
              <td className="px-2 py-2 text-right">{qty(l.qty)}</td>
              <td className="px-2 py-2">{l.unit}</td>
              <td className="px-2 py-2 text-right">{fcfa(l.price)}</td>
              <td className="px-3 py-2 text-right font-medium">{fcfa(l.qty * l.price)}</td>
            </tr>
          ))}</tbody>
          <tfoot><tr>
            <td colSpan={4} className="px-3 py-3 text-right font-semibold">TOTAL</td>
            <td className="px-3 py-3 text-right text-lg font-bold" style={{ color: "var(--brass)" }}>{fcfa(quote.total)}</td>
          </tr></tfoot>
        </table>

        {quote.total > 0 && <p className="text-sm italic mb-4">Arrêté le présent devis à la somme de <strong>{amountInWords(quote.total)}</strong>.</p>}

        {quote.notes && <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: "var(--muted)" }}>Observations</p>
          <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
        </div>}

        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--line)" }}>
          <div>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>Devis saisi par {recorder?.name || "—"} · Entreprise Kibegnon</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>Document interne établi d'après le devis original de l'artisan, conservé au dossier du propriétaire.</p>
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: st.color + "1A", color: st.color }}>{st.label}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Vue principale ---------------- */
export default function Devis({ store, me }) {
  const { quotes, quoteLines, properties, owners, members, actions } = store;
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProp, setFilterProp] = useState("all");
  const [modal, setModal] = useState(null);
  const [sheetId, setSheetId] = useState(null);

  const propById = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p])), [properties]);
  const ownerById = useMemo(() => Object.fromEntries(owners.map((o) => [o.id, o])), [owners]);
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const sup = canSupervise(me.role);

  const sheet = quotes.find((q) => q.id === sheetId);
  if (sheet) {
    return <QuoteSheet quote={sheet} lines={quoteLines.filter((l) => l.quoteId === sheet.id)}
      property={propById[sheet.propertyId]} owner={ownerById[sheet.ownerId]}
      recorder={memberById[sheet.recordedBy]} onBack={() => setSheetId(null)} />;
  }

  const list = quotes.filter((q) =>
    (filterStatus === "all" || q.status === filterStatus) &&
    (filterProp === "all" || q.propertyId === filterProp) &&
    (!search || q.artisanName.toLowerCase().includes(search.toLowerCase()) ||
      (q.object || "").toLowerCase().includes(search.toLowerCase()) ||
      (q.ref || "").toLowerCase().includes(search.toLowerCase()) ||
      (q.trade || "").toLowerCase().includes(search.toLowerCase())));

  const engaged = quotes.filter((q) => ["valide", "execute", "paye"].includes(q.status)).reduce((a, q) => a + q.total, 0);
  const pending = quotes.filter((q) => ["recu", "en_validation"].includes(q.status));

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Devis artisans</h1>
        <button onClick={() => setModal({})} className="kb-btn kb-btn-primary"><Plus size={16} /> Nouveau devis</button>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Recopiez les devis reçus sur papier ou par WhatsApp : chaque fiche conserve la paternité de l'artisan et sert de preuve de dépense au dossier du propriétaire.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={FileText} label="Devis enregistrés" value={quotes.length} tint="var(--brass)" />
        <StatCard icon={Wallet} label="Dépenses engagées" value={fcfa(engaged)} sub="validés, exécutés, payés" tint="#4F9E2A" />
        <StatCard icon={AlertTriangle} label="En attente de décision" value={pending.length} sub={fcfa(pending.reduce((a, q) => a + q.total, 0))} tint="#EA580C" />
        <StatCard icon={Hammer} label="Artisans sollicités" value={new Set(quotes.map((q) => q.artisanName.toLowerCase())).size} tint="#2E78A8" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Artisan, objet, référence…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Tous statuts</option>
          {QUOTE_STATUS_ORDER.map((k) => <option key={k} value={k}>{QUOTE_STATUS[k].label}</option>)}
        </select>
        <select value={filterProp} onChange={(e) => setFilterProp(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Tous les biens</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {list.length ? <div className="space-y-2">
        {list.map((q) => {
          const st = QUOTE_STATUS[q.status]; const prop = propById[q.propertyId]; const own = ownerById[q.ownerId];
          return (
            <div key={q.id} className="bg-white rounded-xl border p-3 hover:shadow-md transition-shadow" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: "#F1F3F5", color: "var(--muted)" }}>{q.ref}</span>
                    <p className="text-sm font-semibold truncate">{q.object || "Travaux non précisés"}</p>
                  </div>
                  <p className="text-xs mt-1 flex items-center gap-1 flex-wrap" style={{ color: "var(--muted)" }}>
                    <BadgeCheck size={12} style={{ color: "var(--brass)" }} />
                    <strong style={{ color: "var(--ink)" }}>{q.artisanName}</strong>
                    {q.trade && <span>· {q.trade}</span>}
                    <span>· {QUOTE_SOURCE[q.source]}</span>
                    <span>· {fr(q.date + "T00:00:00", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {prop && <Chip color="#2E78A8"><Building2 size={10} /> {prop.name}</Chip>}
                    {own && <Chip color="#DB2777"><UserRound size={10} /> {own.name}</Chip>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-base font-bold" style={{ color: "var(--brass)" }}>{fcfa(q.total)}</span>
                  <select value={q.status} onChange={(e) => actions.setQuoteStatus(q.id, e.target.value)}
                    className="text-xs px-2 py-1 rounded-lg border bg-white" style={{ borderColor: st.color + "55", color: st.color }}>
                    {QUOTE_STATUS_ORDER.map((k) => <option key={k} value={k}>{QUOTE_STATUS[k].label}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <button onClick={() => setSheetId(q.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Voir la fiche imprimable"><Printer size={14} /></button>
                    <button onClick={() => setModal({ ...q, _lines: quoteLines.filter((l) => l.quoteId === q.id) })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Modifier"><Pencil size={14} /></button>
                    {sup && <button onClick={async () => { if (confirm(`Supprimer le devis ${q.ref} ?`)) await actions.deleteQuote(q.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div> : <EmptyState icon={FileText} title="Aucun devis enregistré"
        sub="Recopiez ici les devis papier ou WhatsApp de vos artisans."
        action={<button onClick={() => setModal({})} className="kb-btn kb-btn-primary"><Plus size={15} /> Nouveau devis</button>} />}

      {modal && <QuoteModal initial={modal} initialLines={modal._lines} properties={properties} owners={owners}
        onSave={actions.saveQuote} onClose={() => setModal(null)} />}
    </div>
  );
}
