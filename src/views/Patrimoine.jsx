import { useState, useMemo } from "react";
import {
  Building2, UserRound, Plus, Search, Pencil, Trash2, Check, MapPin, Phone, Mail,
  Home, Wallet, FileText, SprayCan, ListChecks, ArrowLeft, AlertTriangle,
} from "lucide-react";
import {
  PROPERTY_KIND, PROPERTY_STATUS, MANDATE, OWNER_KIND, COMMUNES,
  QUOTE_STATUS, STATUS, URGENCY, NATURE, canSupervise,
} from "../constants";
import { fcfa, fr, qty } from "../helpers";
import { Modal, Field, Chip, StatCard, EmptyState, SectionCard, inputCls, inputStyle } from "../ui";

/* ---------------- Modales ---------------- */
function OwnerModal({ initial, onSave, onClose }) {
  const [f, setF] = useState(() => ({ name: "", kind: "particulier", phone: "", email: "", address: "", idNumber: "", notes: "", active: true, ...initial }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => {
    setBusy(true); const r = await onSave(f); setBusy(false);
    if (r?.error) setErr(r.error); else onClose();
  };
  return (
    <Modal title={f.id ? "Modifier le propriétaire" : "Nouveau propriétaire"} onClose={onClose}>
      <Field label="Nom / Raison sociale"><input className={inputCls} style={inputStyle} value={f.name} autoFocus onChange={(e) => set("name", e.target.value)} placeholder="Ex. M. KOUAMÉ Yao" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Qualité"><select className={inputCls} style={inputStyle} value={f.kind} onChange={(e) => set("kind", e.target.value)}>{Object.entries(OWNER_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Téléphone"><input className={inputCls} style={inputStyle} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+225 07 ..." /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="E-mail"><input className={inputCls} style={inputStyle} value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="N° CNI / RCCM"><input className={inputCls} style={inputStyle} value={f.idNumber} onChange={(e) => set("idNumber", e.target.value)} /></Field>
      </div>
      <Field label="Adresse"><input className={inputCls} style={inputStyle} value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>
      <Field label="Notes"><textarea className={inputCls} style={inputStyle} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!f.name.trim() || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> Enregistrer</button></div>
    </Modal>
  );
}

function PropertyModal({ initial, owners, onSave, onClose, onNewOwner }) {
  const [f, setF] = useState(() => ({ ref: "", name: "", kind: "immeuble", address: "", commune: "Cocody", quartier: "", ownerId: "", lotsCount: 1, surface: "", rent: "", mandate: "gestion", status: "actif", notes: "", ...initial }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => {
    setBusy(true); const r = await onSave(f); setBusy(false);
    if (r?.error) setErr(r.error); else onClose();
  };
  return (
    <Modal title={f.id ? "Modifier le bien" : "Nouveau bien"} onClose={onClose} wide>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Désignation du bien"><input className={inputCls} style={inputStyle} value={f.name} autoFocus onChange={(e) => set("name", e.target.value)} placeholder="Ex. Immeuble Les Rosiers" /></Field>
        <Field label="Référence interne"><input className={inputCls} style={inputStyle} value={f.ref} onChange={(e) => set("ref", e.target.value)} placeholder="KB-001" /></Field>
        <Field label="Type"><select className={inputCls} style={inputStyle} value={f.kind} onChange={(e) => set("kind", e.target.value)}>{Object.entries(PROPERTY_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Commune"><select className={inputCls} style={inputStyle} value={f.commune} onChange={(e) => set("commune", e.target.value)}>{COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
        <Field label="Quartier"><input className={inputCls} style={inputStyle} value={f.quartier} onChange={(e) => set("quartier", e.target.value)} placeholder="Ex. Angré 8e tranche" /></Field>
        <Field label="Adresse / repère"><input className={inputCls} style={inputStyle} value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>
      </div>
      <Field label="Propriétaire">
        <div className="flex gap-2">
          <select className={inputCls} style={inputStyle} value={f.ownerId || ""} onChange={(e) => set("ownerId", e.target.value)}>
            <option value="">— Non renseigné —</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <button onClick={onNewOwner} className="kb-btn kb-btn-ghost shrink-0" title="Créer un propriétaire"><Plus size={15} /></button>
        </div>
      </Field>
      <div className="grid sm:grid-cols-4 gap-3">
        <Field label="Nombre de lots"><input type="number" min={1} className={inputCls} style={inputStyle} value={f.lotsCount} onChange={(e) => set("lotsCount", e.target.value)} /></Field>
        <Field label="Surface (m²)"><input type="number" min={0} className={inputCls} style={inputStyle} value={f.surface} onChange={(e) => set("surface", e.target.value)} /></Field>
        <Field label="Loyer mensuel (FCFA)"><input type="number" min={0} step={5000} className={inputCls} style={inputStyle} value={f.rent} onChange={(e) => set("rent", e.target.value)} /></Field>
        <Field label="Statut"><select className={inputCls} style={inputStyle} value={f.status} onChange={(e) => set("status", e.target.value)}>{Object.entries(PROPERTY_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
      </div>
      <Field label="Type de mandat"><select className={inputCls} style={inputStyle} value={f.mandate} onChange={(e) => set("mandate", e.target.value)}>{Object.entries(MANDATE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="Notes"><textarea className={inputCls} style={inputStyle} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!f.name.trim() || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> Enregistrer</button></div>
    </Modal>
  );
}

/* ---------------- Fiche détaillée d'un bien ---------------- */
function PropertyDetail({ property, owner, tasks, quotes, releases, releaseLines, products, members, onBack, onEdit }) {
  const pTasks = tasks.filter((t) => t.propertyId === property.id);
  const pQuotes = quotes.filter((q) => q.propertyId === property.id);
  const pReleases = releases.filter((r) => r.propertyId === property.id);
  const productById = Object.fromEntries(products.map((p) => [p.id, p]));
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

  const depQuotes = pQuotes.filter((q) => ["valide", "execute", "paye"].includes(q.status)).reduce((a, q) => a + q.total, 0);
  const consoValue = pReleases.reduce((a, r) => a + releaseLines.filter((l) => l.releaseId === r.id).reduce((s, l) => s + l.qty * l.price, 0), 0);
  const st = PROPERTY_STATUS[property.status];

  return (
    <div>
      <button onClick={onBack} className="kb-btn kb-btn-ghost mb-3 text-sm"><ArrowLeft size={15} /> Retour aux biens</button>
      <div className="bg-white rounded-xl border p-4 mb-4" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{property.name}</h1>
              <Chip color={st.color} dot>{st.label}</Chip>
              {property.ref && <Chip color="#64748B">{property.ref}</Chip>}
            </div>
            <p className="text-sm mt-1 flex items-center gap-1" style={{ color: "var(--muted)" }}>
              <MapPin size={13} /> {[property.quartier, property.commune].filter(Boolean).join(", ") || "Localisation non renseignée"} · {PROPERTY_KIND[property.kind]} · {property.lotsCount} lot(s)
            </p>
            {owner && <p className="text-sm mt-1 flex items-center gap-1"><UserRound size={13} style={{ color: "var(--brass)" }} /> {owner.name}{owner.phone && <span style={{ color: "var(--muted)" }}> · {owner.phone}</span>}</p>}
          </div>
          <button onClick={() => onEdit(property)} className="kb-btn kb-btn-ghost"><Pencil size={15} /> Modifier</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Wallet} label="Loyer de référence" value={property.rent ? fcfa(property.rent) : "—"} tint="#4F9E2A" />
        <StatCard icon={FileText} label="Dépenses artisans" value={fcfa(depQuotes)} sub={`${pQuotes.length} devis`} tint="var(--brass)" />
        <StatCard icon={SprayCan} label="Produits consommés" value={fcfa(consoValue)} sub={`${pReleases.length} sorties`} tint="#7C3AED" />
        <StatCard icon={ListChecks} label="Tâches ouvertes" value={pTasks.filter((t) => t.status !== "termine").length} sub={`${pTasks.length} au total`} tint="#2E78A8" />
      </div>

      <SectionCard title="Devis artisans rattachés" icon={FileText} pad={false}>
        {pQuotes.length ? <div className="divide-y" style={{ borderColor: "var(--line)" }}>
          {pQuotes.map((q) => <div key={q.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{q.object || q.artisanName}</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>{q.ref} · {q.artisanName}{q.trade ? ` (${q.trade})` : ""} · {fr(q.date + "T00:00:00", { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-semibold">{fcfa(q.total)}</span>
              <Chip color={QUOTE_STATUS[q.status].color}>{QUOTE_STATUS[q.status].label}</Chip>
            </div>
          </div>)}
        </div> : <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>Aucun devis rattaché à ce bien.</p>}
      </SectionCard>

      <SectionCard title="Sorties de matériel" icon={SprayCan} pad={false}>
        {pReleases.length ? <div className="divide-y" style={{ borderColor: "var(--line)" }}>
          {pReleases.map((r) => {
            const lines = releaseLines.filter((l) => l.releaseId === r.id);
            return <div key={r.id} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{r.ref} · {r.zone || "Zone non précisée"}</p>
                <span className="text-xs" style={{ color: "var(--muted)" }}>{fr(r.date + "T00:00:00", { day: "numeric", month: "short" })}</span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
                {lines.map((l) => `${productById[l.productId]?.name || "?"} ×${qty(l.qty)}`).join(" · ") || "Aucun produit"}
              </p>
            </div>;
          })}
        </div> : <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>Aucune sortie enregistrée pour ce bien.</p>}
      </SectionCard>

      <SectionCard title="Tâches liées" icon={ListChecks} pad={false}>
        {pTasks.length ? <div className="divide-y" style={{ borderColor: "var(--line)" }}>
          {pTasks.map((t) => <div key={t.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
            <div className="min-w-0">
              <p className="text-sm truncate">{t.title}</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>{memberById[t.assigneeId]?.name || "—"} · {NATURE[t.nature]?.label || "Autre"}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Chip color={URGENCY[t.urgency].color} bg={URGENCY[t.urgency].bg}>{URGENCY[t.urgency].label}</Chip>
              <Chip color={STATUS[t.status].color}>{STATUS[t.status].label}</Chip>
            </div>
          </div>)}
        </div> : <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>Aucune tâche liée à ce bien.</p>}
      </SectionCard>
    </div>
  );
}

/* ---------------- Vue principale ---------------- */
export default function Patrimoine({ store, me }) {
  const { owners, properties, tasks, quotes, releases, releaseLines, products, members, actions } = store;
  const [tab, setTab] = useState("biens");
  const [search, setSearch] = useState("");
  const [filterCommune, setFilterCommune] = useState("all");
  const [propModal, setPropModal] = useState(null);
  const [ownerModal, setOwnerModal] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const ownerById = useMemo(() => Object.fromEntries(owners.map((o) => [o.id, o])), [owners]);
  const detail = properties.find((p) => p.id === detailId);
  const sup = canSupervise(me.role);

  if (detail) {
    return <>
      <PropertyDetail property={detail} owner={ownerById[detail.ownerId]} tasks={tasks} quotes={quotes}
        releases={releases} releaseLines={releaseLines} products={products} members={members}
        onBack={() => setDetailId(null)} onEdit={setPropModal} />
      {propModal && <PropertyModal initial={propModal} owners={owners} onSave={actions.saveProperty}
        onClose={() => setPropModal(null)} onNewOwner={() => setOwnerModal({})} />}
      {ownerModal && <OwnerModal initial={ownerModal} onSave={actions.saveOwner} onClose={() => setOwnerModal(null)} />}
    </>;
  }

  const filteredProps = properties.filter((p) =>
    (filterCommune === "all" || p.commune === filterCommune) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.ref || "").toLowerCase().includes(search.toLowerCase()) ||
      (ownerById[p.ownerId]?.name || "").toLowerCase().includes(search.toLowerCase())));
  const filteredOwners = owners.filter((o) => !search || o.name.toLowerCase().includes(search.toLowerCase()) || (o.phone || "").includes(search));

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Patrimoine</h1>
        <button onClick={() => (tab === "biens" ? setPropModal({}) : setOwnerModal({}))} className="kb-btn kb-btn-primary">
          <Plus size={16} /> {tab === "biens" ? "Nouveau bien" : "Nouveau propriétaire"}
        </button>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Les biens et propriétaires servent de dossier central : tâches, devis et consommables s'y rattachent.</p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg border overflow-hidden" style={inputStyle}>
          {[["biens", `Biens (${properties.length})`], ["proprietaires", `Propriétaires (${owners.length})`]].map(([v, l]) =>
            <button key={v} onClick={() => setTab(v)} className="px-3 py-2 text-sm" style={{ background: tab === v ? "var(--ink)" : "#fff", color: tab === v ? "#fff" : "var(--muted)" }}>{l}</button>)}
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
        </div>
        {tab === "biens" && <select value={filterCommune} onChange={(e) => setFilterCommune(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Toutes communes</option>
          {[...new Set(properties.map((p) => p.commune).filter(Boolean))].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>}
      </div>

      {tab === "biens" ? (
        filteredProps.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProps.map((p) => {
            const st = PROPERTY_STATUS[p.status]; const o = ownerById[p.ownerId];
            const nQuotes = quotes.filter((q) => q.propertyId === p.id).length;
            const nOpen = tasks.filter((t) => t.propertyId === p.id && t.status !== "termine").length;
            return (
              <button key={p.id} onClick={() => setDetailId(p.id)} className="bg-white rounded-xl border p-3 text-left hover:shadow-md transition-shadow" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: st.color + "1A", color: st.color }}><Building2 size={17} /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-[11px] truncate" style={{ color: "var(--muted)" }}>{PROPERTY_KIND[p.kind]} · {p.commune || "—"}</p>
                    </div>
                  </div>
                  <Chip color={st.color} dot>{st.label}</Chip>
                </div>
                <p className="text-xs mt-2.5 truncate" style={{ color: "var(--muted)" }}><UserRound size={11} className="inline mb-0.5" /> {o?.name || "Propriétaire non renseigné"}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {p.rent ? <Chip color="#4F9E2A">{fcfa(p.rent)}/mois</Chip> : null}
                  {nQuotes > 0 && <Chip color="var(--brass)">{nQuotes} devis</Chip>}
                  {nOpen > 0 && <Chip color="#2E78A8">{nOpen} tâche(s)</Chip>}
                </div>
              </button>
            );
          })}
        </div> : <EmptyState icon={Building2} title="Aucun bien enregistré" sub="Commencez par ajouter un immeuble, une villa ou un local."
          action={<button onClick={() => setPropModal({})} className="kb-btn kb-btn-primary"><Plus size={15} /> Nouveau bien</button>} />
      ) : (
        filteredOwners.length ? <div className="bg-white rounded-xl border" style={{ borderColor: "var(--line)" }}>
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>
            {filteredOwners.map((o) => {
              const nProps = properties.filter((p) => p.ownerId === o.id).length;
              return <div key={o.id} className="flex items-center justify-between px-4 py-3 gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: "#2E78A8" }}><UserRound size={16} /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{o.name}</p>
                    <p className="text-[11px] flex items-center gap-2 flex-wrap" style={{ color: "var(--muted)" }}>
                      <span>{OWNER_KIND[o.kind]}</span>
                      {o.phone && <span className="flex items-center gap-0.5"><Phone size={10} />{o.phone}</span>}
                      {o.email && <span className="flex items-center gap-0.5"><Mail size={10} />{o.email}</span>}
                      <span className="flex items-center gap-0.5"><Home size={10} />{nProps} bien(s)</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setOwnerModal(o)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Pencil size={14} /></button>
                  {sup && <button onClick={async () => { if (confirm(`Supprimer ${o.name} ?`)) await actions.deleteOwner(o.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}
                </div>
              </div>;
            })}
          </div>
        </div> : <EmptyState icon={UserRound} title="Aucun propriétaire enregistré" sub="Ajoutez les propriétaires dont vous gérez les biens."
          action={<button onClick={() => setOwnerModal({})} className="kb-btn kb-btn-primary"><Plus size={15} /> Nouveau propriétaire</button>} />
      )}

      {propModal && <PropertyModal initial={propModal} owners={owners} onSave={actions.saveProperty}
        onClose={() => setPropModal(null)} onNewOwner={() => setOwnerModal({})} />}
      {ownerModal && <OwnerModal initial={ownerModal} onSave={actions.saveOwner} onClose={() => setOwnerModal(null)} />}
    </div>
  );
}
