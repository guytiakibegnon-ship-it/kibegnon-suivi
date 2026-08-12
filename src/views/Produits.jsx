import { useState, useMemo } from "react";
import {
  SprayCan, Package, Plus, Search, Pencil, Trash2, Check, AlertTriangle, TrendingDown,
  ArrowDownToLine, ArrowUpFromLine, ClipboardList, X, Printer, BarChart3, Building2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { PRODUCT_CATEGORY, RELEASE_PURPOSE, canSupervise } from "../constants";
import { fcfa, fr, qty, isoDate, monthIso, monthLabel } from "../helpers";
import { Modal, Field, Chip, StatCard, EmptyState, SectionCard, inputCls, inputStyle } from "../ui";

/* ---------------- Modale produit ---------------- */
function ProductModal({ initial, onSave, onClose }) {
  const [f, setF] = useState(() => ({ name: "", category: "entretien", unit: "unité", minQty: 0, price: 0, supplier: "", active: true, ...initial }));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => { setBusy(true); const r = await onSave(f); setBusy(false); if (r?.error) setErr(r.error); else onClose(); };
  return (
    <Modal title={f.id ? "Modifier le produit" : "Nouveau produit"} onClose={onClose}>
      <Field label="Désignation"><input className={inputCls} style={inputStyle} value={f.name} autoFocus onChange={(e) => set("name", e.target.value)} placeholder="Ex. Eau de Javel 5L" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Catégorie"><select className={inputCls} style={inputStyle} value={f.category} onChange={(e) => set("category", e.target.value)}>{Object.entries(PRODUCT_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
        <Field label="Unité"><input className={inputCls} style={inputStyle} value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="bidon, pièce, carton…" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prix unitaire (FCFA)"><input type="number" min={0} step={100} className={inputCls} style={inputStyle} value={f.price} onChange={(e) => set("price", e.target.value)} /></Field>
        <Field label="Seuil d'alerte" hint="Alerte quand le stock passe en dessous"><input type="number" min={0} className={inputCls} style={inputStyle} value={f.minQty} onChange={(e) => set("minQty", e.target.value)} /></Field>
      </div>
      <Field label="Fournisseur"><input className={inputCls} style={inputStyle} value={f.supplier} onChange={(e) => set("supplier", e.target.value)} /></Field>
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!f.name.trim() || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> Enregistrer</button></div>
    </Modal>
  );
}

/* ---------------- Modale approvisionnement ---------------- */
function StockEntryModal({ products, onSave, onClose }) {
  const [f, setF] = useState({ productId: products[0]?.id || "", qty: 1, price: products[0]?.price || 0, supplier: "", date: isoDate(new Date()), notes: "" });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => { setBusy(true); const r = await onSave(f); setBusy(false); if (r?.error) setErr(r.error); else onClose(); };
  return (
    <Modal title="Entrée de stock (approvisionnement)" onClose={onClose}>
      <Field label="Produit">
        <select className={inputCls} style={inputStyle} value={f.productId} onChange={(e) => {
          const p = products.find((x) => x.id === e.target.value);
          setF((s) => ({ ...s, productId: e.target.value, price: p?.price || 0 }));
        }}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Quantité"><input type="number" min={0.01} step="any" className={inputCls} style={inputStyle} value={f.qty} onChange={(e) => set("qty", e.target.value)} /></Field>
        <Field label="Prix unitaire"><input type="number" min={0} step={100} className={inputCls} style={inputStyle} value={f.price} onChange={(e) => set("price", e.target.value)} /></Field>
        <Field label="Date"><input type="date" className={inputCls} style={inputStyle} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
      </div>
      <Field label="Fournisseur"><input className={inputCls} style={inputStyle} value={f.supplier} onChange={(e) => set("supplier", e.target.value)} /></Field>
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!f.productId || Number(f.qty) <= 0 || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><ArrowDownToLine size={16} /> Ajouter au stock</button></div>
    </Modal>
  );
}

/* ---------------- Modale fiche de sortie ---------------- */
function ReleaseModal({ initial, initialLines, products, properties, onSave, onClose }) {
  const [f, setF] = useState(() => ({ propertyId: "", releasedTo: "", purpose: "nettoyage", date: isoDate(new Date()), zone: "", notes: "", ...initial }));
  const [lines, setLines] = useState(() => initialLines?.length ? initialLines : [{ productId: "", qty: 1, price: 0 }]);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setLine = (i, k, v) => setLines((p) => p.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const pickProduct = (i, id) => {
    const p = products.find((x) => x.id === id);
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, productId: id, price: p?.price || 0 } : l)));
  };
  const total = lines.reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);
  const valid = lines.some((l) => l.productId && Number(l.qty) > 0);
  const submit = async () => { setBusy(true); const r = await onSave(f, lines); setBusy(false); if (r?.error) setErr(r.error); else onClose(); };

  return (
    <Modal title={f.id ? `Fiche de sortie ${f.ref || ""}` : "Nouvelle fiche de sortie"} onClose={onClose} wide>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Bâtiment / bien concerné">
          <select className={inputCls} style={inputStyle} value={f.propertyId || ""} onChange={(e) => set("propertyId", e.target.value)}>
            <option value="">— Non rattaché —</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Remis à" hint="Agent d'entretien"><input className={inputCls} style={inputStyle} value={f.releasedTo} onChange={(e) => set("releasedTo", e.target.value)} placeholder="Nom de la personne" /></Field>
        <Field label="Date"><input type="date" className={inputCls} style={inputStyle} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Motif"><select className={inputCls} style={inputStyle} value={f.purpose} onChange={(e) => set("purpose", e.target.value)}>{Object.entries(RELEASE_PURPOSE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Zone concernée"><input className={inputCls} style={inputStyle} value={f.zone} onChange={(e) => set("zone", e.target.value)} placeholder="Parties communes, cage d'escalier…" /></Field>
      </div>

      <p className="text-xs font-medium mb-2 mt-1" style={{ color: "var(--muted)" }}>Produits sortis</p>
      <div className="space-y-2 mb-3">
        {lines.map((l, i) => {
          const prod = products.find((p) => p.id === l.productId);
          const insufficient = prod && Number(l.qty) > prod.stock;
          return (
            <div key={i} className="flex gap-2 items-start">
              <select className={inputCls + " flex-1"} style={inputStyle} value={l.productId} onChange={(e) => pickProduct(i, e.target.value)}>
                <option value="">— Choisir un produit —</option>
                {products.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name} (stock {qty(p.stock)} {p.unit})</option>)}
              </select>
              <div className="w-20 shrink-0">
                <input type="number" min={0.01} step="any" className={inputCls} style={{ ...inputStyle, borderColor: insufficient ? "#D81F26" : "var(--line)" }} value={l.qty} onChange={(e) => setLine(i, "qty", e.target.value)} />
                {insufficient && <span className="text-[10px] text-red-600">stock {qty(prod.stock)}</span>}
              </div>
              <input type="number" min={0} step={100} className={inputCls + " w-24 shrink-0"} style={inputStyle} value={l.price} onChange={(e) => setLine(i, "price", e.target.value)} title="Prix unitaire" />
              <button onClick={() => setLines((p) => p.filter((_, j) => j !== i))} className="p-2 rounded-lg text-slate-300 hover:text-red-500 shrink-0"><X size={15} /></button>
            </div>
          );
        })}
      </div>
      <button onClick={() => setLines((p) => [...p, { productId: "", qty: 1, price: 0 }])} className="kb-btn kb-btn-ghost text-sm mb-3"><Plus size={14} /> Ajouter un produit</button>

      <div className="flex items-center justify-between rounded-lg px-3 py-2 mb-3" style={{ background: "#F6F8FA" }}>
        <span className="text-sm font-medium">Valeur totale sortie</span>
        <span className="text-lg font-bold" style={{ color: "var(--brass)" }}>{fcfa(total)}</span>
      </div>
      <Field label="Observations"><textarea className={inputCls} style={inputStyle} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
        <button disabled={!valid || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> {busy ? "…" : "Valider la sortie"}</button></div>
    </Modal>
  );
}

/* ---------------- Vue principale ---------------- */
export default function Produits({ store, me }) {
  const { products, properties, releases, releaseLines, stockEntries, members, actions } = store;
  const [tab, setTab] = useState("sorties");
  const [search, setSearch] = useState("");
  const [prodModal, setProdModal] = useState(null);
  const [entryModal, setEntryModal] = useState(false);
  const [relModal, setRelModal] = useState(null);
  const [months, setMonths] = useState(6);

  const productById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const propById = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p])), [properties]);
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const sup = canSupervise(me.role);

  const lowStock = products.filter((p) => p.active && p.stock <= p.minQty);
  const stockValue = products.reduce((a, p) => a + p.stock * p.price, 0);
  const releaseTotal = (rid) => releaseLines.filter((l) => l.releaseId === rid).reduce((a, l) => a + l.qty * l.price, 0);

  /* --- Analyse de consommation --- */
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - months);
  const recentReleases = releases.filter((r) => new Date(r.date + "T00:00:00") >= cutoff);
  const recentIds = new Set(recentReleases.map((r) => r.id));
  const recentLines = releaseLines.filter((l) => recentIds.has(l.releaseId));

  const byProduct = useMemo(() => {
    const m = {};
    recentLines.forEach((l) => {
      const p = productById[l.productId]; if (!p) return;
      m[l.productId] = m[l.productId] || { name: p.name, qty: 0, value: 0, times: 0, unit: p.unit, color: PRODUCT_CATEGORY[p.category]?.color || "#64748B" };
      m[l.productId].qty += l.qty; m[l.productId].value += l.qty * l.price; m[l.productId].times += 1;
    });
    return Object.values(m).sort((a, b) => b.qty - a.qty);
  }, [recentLines, productById]);

  const byProperty = useMemo(() => {
    const m = {};
    recentReleases.forEach((r) => {
      const key = r.propertyId || "none";
      const name = propById[r.propertyId]?.name || "Non rattaché";
      m[key] = m[key] || { name, sorties: 0, value: 0 };
      m[key].sorties += 1; m[key].value += releaseTotal(r.id);
    });
    return Object.values(m).sort((a, b) => b.value - a.value);
  }, [recentReleases, propById, releaseLines]);

  const byMonth = useMemo(() => {
    const m = {};
    recentReleases.forEach((r) => {
      const k = monthIso(r.date + "T00:00:00");
      m[k] = m[k] || { key: k, name: monthLabel(k), value: 0, sorties: 0 };
      m[k].value += releaseTotal(r.id); m[k].sorties += 1;
    });
    return Object.values(m).sort((a, b) => a.key.localeCompare(b.key));
  }, [recentReleases, releaseLines]);

  const filteredProducts = products.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const filteredReleases = releases.filter((r) => !search ||
    (r.ref || "").toLowerCase().includes(search.toLowerCase()) ||
    (propById[r.propertyId]?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.releasedTo || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Produits & entretien</h1>
        <div className="flex gap-2">
          <button onClick={() => setEntryModal(true)} className="kb-btn kb-btn-ghost"><ArrowDownToLine size={15} /> Entrée</button>
          <button onClick={() => setRelModal({})} className="kb-btn kb-btn-primary"><ArrowUpFromLine size={16} /> Fiche de sortie</button>
        </div>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Stock des produits sanitaires, fiches de sortie par bâtiment et analyse des consommations.</p>

      {lowStock.length > 0 && (
        <div className="rounded-xl border p-3 mb-4 flex items-start gap-2" style={{ borderColor: "#F5C6C7", background: "#FDF2F2" }}>
          <AlertTriangle size={16} style={{ color: "#D81F26" }} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium" style={{ color: "#B5171D" }}>{lowStock.length} produit(s) sous le seuil d'alerte</p>
            <p className="text-xs mt-0.5" style={{ color: "#B5171D" }}>{lowStock.map((p) => `${p.name} (${qty(p.stock)} ${p.unit})`).join(" · ")}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Package} label="Valeur du stock" value={fcfa(stockValue)} sub={`${products.filter((p) => p.active).length} références`} tint="#4F9E2A" />
        <StatCard icon={ClipboardList} label="Fiches de sortie" value={releases.length} sub={`${recentReleases.length} sur ${months} mois`} tint="var(--brass)" />
        <StatCard icon={TrendingDown} label="Consommé (période)" value={fcfa(recentLines.reduce((a, l) => a + l.qty * l.price, 0))} tint="#7C3AED" />
        <StatCard icon={AlertTriangle} label="Alertes de stock" value={lowStock.length} tint="#D81F26" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg border overflow-hidden" style={inputStyle}>
          {[["sorties", "Fiches de sortie"], ["stock", "Stock"], ["analyse", "Analyse"]].map(([v, l]) =>
            <button key={v} onClick={() => setTab(v)} className="px-3 py-2 text-sm whitespace-nowrap" style={{ background: tab === v ? "var(--ink)" : "#fff", color: tab === v ? "#fff" : "var(--muted)" }}>{l}</button>)}
        </div>
        {tab !== "analyse" && <div className="relative flex-1 min-w-[160px]">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
        </div>}
        {tab === "analyse" && <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value={3}>3 derniers mois</option><option value={6}>6 derniers mois</option><option value={12}>12 derniers mois</option>
        </select>}
        {tab === "stock" && <button onClick={() => setProdModal({})} className="kb-btn kb-btn-ghost text-sm"><Plus size={14} /> Produit</button>}
      </div>

      {/* ---- FICHES DE SORTIE ---- */}
      {tab === "sorties" && (filteredReleases.length ? (
        <div className="space-y-2">
          {filteredReleases.map((r) => {
            const lines = releaseLines.filter((l) => l.releaseId === r.id);
            return (
              <div key={r.id} className="bg-white rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{r.ref}</p>
                      <Chip color="#7C3AED">{RELEASE_PURPOSE[r.purpose]}</Chip>
                      {r.propertyId && <Chip color="#2E78A8"><Building2 size={10} /> {propById[r.propertyId]?.name || "—"}</Chip>}
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
                      {fr(r.date + "T00:00:00", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                      {r.releasedTo && ` · remis à ${r.releasedTo}`}
                      {r.zone && ` · ${r.zone}`}
                      {r.releasedBy && ` · saisi par ${memberById[r.releasedBy]?.name || "—"}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold" style={{ color: "var(--brass)" }}>{fcfa(releaseTotal(r.id))}</span>
                    <button onClick={() => setRelModal({ ...r, _lines: lines })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Pencil size={14} /></button>
                    {sup && <button onClick={async () => { if (confirm(`Supprimer la fiche ${r.ref} ? Le stock sera recrédité.`)) await actions.deleteRelease(r.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: "var(--line)" }}>
                  {lines.map((l) => <Chip key={l.id} color="#64748B">{productById[l.productId]?.name || "?"} × {qty(l.qty)}</Chip>)}
                  {lines.length === 0 && <span className="text-xs" style={{ color: "var(--muted)" }}>Aucun produit</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : <EmptyState icon={ClipboardList} title="Aucune fiche de sortie" sub="Enregistrez les produits remis aux agents d'entretien."
        action={<button onClick={() => setRelModal({})} className="kb-btn kb-btn-primary"><Plus size={15} /> Nouvelle fiche</button>} />)}

      {/* ---- STOCK ---- */}
      {tab === "stock" && (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left" style={{ color: "var(--muted)" }}>
              <th className="px-4 py-2.5 font-medium">Produit</th><th className="px-3 py-2.5 font-medium">Catégorie</th>
              <th className="px-3 py-2.5 font-medium">Stock</th><th className="px-3 py-2.5 font-medium">Seuil</th>
              <th className="px-3 py-2.5 font-medium">P.U.</th><th className="px-3 py-2.5 font-medium">Valeur</th><th /></tr></thead>
            <tbody>{filteredProducts.map((p) => {
              const cat = PRODUCT_CATEGORY[p.category]; const low = p.stock <= p.minQty;
              return <tr key={p.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                <td className="px-4 py-2.5"><p className="font-medium">{p.name}</p>{p.supplier && <p className="text-[11px]" style={{ color: "var(--muted)" }}>{p.supplier}</p>}</td>
                <td className="px-3 py-2.5"><Chip color={cat.color}>{cat.label}</Chip></td>
                <td className="px-3 py-2.5"><span className="font-semibold" style={{ color: low ? "#D81F26" : "var(--ink)" }}>{qty(p.stock)}</span> <span className="text-xs" style={{ color: "var(--muted)" }}>{p.unit}</span>{low && <AlertTriangle size={12} className="inline ml-1 mb-0.5" style={{ color: "#D81F26" }} />}</td>
                <td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>{qty(p.minQty)}</td>
                <td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>{fcfa(p.price)}</td>
                <td className="px-3 py-2.5 font-medium">{fcfa(p.stock * p.price)}</td>
                <td className="px-3 py-2.5"><div className="flex gap-1 justify-end">
                  <button onClick={() => setProdModal(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Pencil size={14} /></button>
                  {sup && <button onClick={async () => { if (confirm(`Supprimer ${p.name} ?`)) await actions.deleteProduct(p.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}
                </div></td>
              </tr>;
            })}</tbody>
          </table></div>
          {filteredProducts.length === 0 && <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>Aucun produit.</p>}
        </div>
      )}

      {/* ---- ANALYSE ---- */}
      {tab === "analyse" && (
        recentReleases.length ? <>
          <SectionCard title={`Produits les plus utilisés (${months} derniers mois)`} icon={BarChart3}>
            <ResponsiveContainer width="100%" height={Math.max(180, byProduct.length * 34)}>
              <BarChart data={byProduct.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEF1F5" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n, p) => [`${qty(v)} ${p.payload.unit} · ${p.payload.times} sortie(s)`, "Consommé"]} />
                <Bar dataKey="qty" radius={[0, 5, 5, 0]}>{byProduct.slice(0, 10).map((d, i) => <Cell key={i} fill={d.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <div className="grid lg:grid-cols-2 gap-4">
            <SectionCard title="Consommation par bâtiment" icon={Building2} pad={false}>
              <div className="divide-y" style={{ borderColor: "var(--line)" }}>
                {byProperty.map((b, i) => <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div><p className="text-sm font-medium">{b.name}</p><p className="text-[11px]" style={{ color: "var(--muted)" }}>{b.sorties} sortie(s) sur la période</p></div>
                  <span className="text-sm font-semibold">{fcfa(b.value)}</span>
                </div>)}
              </div>
            </SectionCard>

            <SectionCard title="Évolution mensuelle" icon={TrendingDown}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byMonth} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F5" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v, n, p) => [`${fcfa(v)} · ${p.payload.sorties} sortie(s)`, "Consommé"]} />
                  <Bar dataKey="value" radius={[5, 5, 0, 0]} fill="#7C3AED" />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          <SectionCard title="Détail par produit" icon={Package} pad={false}>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-left" style={{ color: "var(--muted)" }}>
                <th className="px-4 py-2.5 font-medium">Produit</th><th className="px-3 py-2.5 font-medium">Quantité</th>
                <th className="px-3 py-2.5 font-medium">Fréquence</th><th className="px-3 py-2.5 font-medium">Valeur</th></tr></thead>
              <tbody>{byProduct.map((p, i) => <tr key={i} className="border-t" style={{ borderColor: "var(--line)" }}>
                <td className="px-4 py-2.5 font-medium">{p.name}</td>
                <td className="px-3 py-2.5">{qty(p.qty)} {p.unit}</td>
                <td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>{p.times} sortie(s) · {(p.times / months).toFixed(1)}/mois</td>
                <td className="px-3 py-2.5 font-medium">{fcfa(p.value)}</td>
              </tr>)}</tbody>
            </table></div>
          </SectionCard>
        </> : <EmptyState icon={BarChart3} title="Pas encore de données d'analyse" sub="Enregistrez des fiches de sortie pour visualiser les consommations." />
      )}

      {prodModal && <ProductModal initial={prodModal} onSave={actions.saveProduct} onClose={() => setProdModal(null)} />}
      {entryModal && <StockEntryModal products={products.filter((p) => p.active)} onSave={actions.addStockEntry} onClose={() => setEntryModal(false)} />}
      {relModal && <ReleaseModal initial={relModal} initialLines={relModal._lines} products={products} properties={properties}
        onSave={actions.saveRelease} onClose={() => setRelModal(null)} />}
    </div>
  );
}
