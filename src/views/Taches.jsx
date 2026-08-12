import { useState, useMemo } from "react";
import {
  Plus, Search, Zap, Check, Trash2, Pencil, Play, Square, CheckCircle2, Send,
  Building2, UserRound, Timer, ChevronDown, ChevronRight, ListChecks, Inbox, Filter,
} from "lucide-react";
import {
  URGENCY, URGENCY_ORDER, STATUS, STATUS_ORDER, NATURE, NATURE_ORDER, DAYS, canSupervise,
} from "../constants";
import { fmtDur, fmtEst, mondayIso, isoDate, fr } from "../helpers";
import { Modal, Field, Chip, Avatar, EmptyState, inputCls, inputStyle } from "../ui";

/* ---------------- Modale tâche (repensée : essentiel d'abord) ---------------- */
export function TaskModal({ initial, departments, members, properties, owners, onSave, onClose, onDelete }) {
  const [f, setF] = useState(() => ({
    title: "", description: "", deptId: "", assigneeId: members[0]?.id, urgency: "normale", status: "a_faire",
    estMin: 60, day: null, weekStart: mondayIso(new Date()), nature: "autre", propertyId: "", ownerId: "",
    dueDate: "", ...initial,
  }));
  const [more, setMore] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const pickProperty = (id) => {
    const prop = properties.find((p) => p.id === id);
    setF((s) => ({ ...s, propertyId: id, ownerId: prop?.ownerId || s.ownerId }));
  };

  return (
    <Modal title={initial?.id ? "Modifier la tâche" : "Nouvelle tâche"} onClose={onClose} wide>
      <Field label="Que faut-il faire ?">
        <input className={inputCls} style={inputStyle} value={f.title} autoFocus onChange={(e) => set("title", e.target.value)} placeholder="Ex. Rédiger le bail de Mme KONÉ" />
      </Field>

      <Field label="Nature de la tâche">
        <div className="flex flex-wrap gap-1.5">
          {NATURE_ORDER.map((n) => (
            <button key={n} onClick={() => set("nature", n)} className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
              style={{ background: f.nature === n ? NATURE[n].color : "#fff", color: f.nature === n ? "#fff" : NATURE[n].color, border: `1px solid ${NATURE[n].color}55` }}>
              {NATURE[n].label}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Assignée à">
          <select className={inputCls} style={inputStyle} value={f.assigneeId} onChange={(e) => set("assigneeId", e.target.value)}>
            {members.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Urgence">
          <div className="flex gap-1">
            {URGENCY_ORDER.map((u) => (
              <button key={u} onClick={() => set("urgency", u)} className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ background: f.urgency === u ? URGENCY[u].color : URGENCY[u].bg, color: f.urgency === u ? "#fff" : URGENCY[u].color }}>
                {URGENCY[u].label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <Field label="Bien concerné" hint="Le propriétaire est rattaché automatiquement">
        <select className={inputCls} style={inputStyle} value={f.propertyId || ""} onChange={(e) => pickProperty(e.target.value)}>
          <option value="">— Aucun bien —</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}{p.commune ? ` · ${p.commune}` : ""}</option>)}
        </select>
      </Field>

      <button onClick={() => setMore((s) => !s)} className="flex items-center gap-1 text-xs font-medium mb-3" style={{ color: "var(--brass)" }}>
        {more ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Options complémentaires
      </button>

      {more && (
        <div className="rounded-lg border p-3 mb-3" style={{ borderColor: "var(--line)", background: "#FAFBFC" }}>
          <Field label="Détails / consignes"><textarea className={inputCls} style={inputStyle} rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Jour planifié">
              <select className={inputCls} style={inputStyle} value={f.day ?? ""} onChange={(e) => set("day", e.target.value === "" ? null : Number(e.target.value))}>
                <option value="">Non planifié</option>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </Field>
            <Field label="Durée estimée (min)"><input type="number" min={0} step={15} className={inputCls} style={inputStyle} value={f.estMin} onChange={(e) => set("estMin", Number(e.target.value))} /></Field>
            <Field label="Échéance"><input type="date" className={inputCls} style={inputStyle} value={f.dueDate || ""} onChange={(e) => set("dueDate", e.target.value)} /></Field>
            <Field label="Statut">
              <select className={inputCls} style={inputStyle} value={f.status} onChange={(e) => set("status", e.target.value)}>
                {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
              </select>
            </Field>
            <Field label="Propriétaire">
              <select className={inputCls} style={inputStyle} value={f.ownerId || ""} onChange={(e) => set("ownerId", e.target.value)}>
                <option value="">— Aucun —</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
            <Field label="Département">
              <select className={inputCls} style={inputStyle} value={f.deptId || ""} onChange={(e) => set("deptId", e.target.value)}>
                <option value="">— Aucun —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {initial?.id ? <button onClick={() => onDelete(initial.id)} className="kb-btn text-red-600 hover:bg-red-50"><Trash2 size={15} /> Supprimer</button> : <span />}
        <div className="flex gap-2">
          <button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button>
          <button disabled={!f.title.trim()} onClick={() => onSave(f)} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> Enregistrer</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Carte tâche compacte ---------------- */
export function TaskRow({ task, property, assignee, actualSec, isRunning, canTrack, onEdit, onToggleTimer, onAdvance, onShare }) {
  const u = URGENCY[task.urgency]; const nat = NATURE[task.nature] || NATURE.autre;
  const done = task.status === "termine";
  const overEst = task.estMin && actualSec > task.estMin * 60;
  return (
    <div className="bg-white rounded-xl border p-3" style={{ borderColor: isRunning ? "var(--live)" : "var(--line)", boxShadow: isRunning ? "0 0 0 1px var(--live)" : undefined }}>
      <div className="flex items-start gap-2.5">
        <button onClick={() => onAdvance(task)} title={done ? "Terminée" : "Faire avancer"}
          className="mt-0.5 shrink-0 rounded-full transition-colors"
          style={{ color: done ? "#4F9E2A" : "#CBD5E1" }}>
          <CheckCircle2 size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug" style={{ color: "var(--ink)", textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}>{task.title}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <Chip color={nat.color}>{nat.label}</Chip>
            <Chip color={u.color} bg={u.bg} dot>{u.label}</Chip>
            {property && <Chip color="#2E78A8"><Building2 size={10} /> {property.name}</Chip>}
            {!done && <Chip color={STATUS[task.status].color}>{STATUS[task.status].label}</Chip>}
          </div>
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {assignee && <Avatar member={assignee} size={20} />}
              <span className="text-[11px] truncate" style={{ color: "var(--muted)" }}>
                {fmtEst(task.estMin)} · <span style={{ color: overEst ? "#D81F26" : "var(--muted)", fontWeight: overEst ? 600 : 400 }}>{fmtDur(actualSec)}</span>
                {task.dueDate && ` · échéance ${fr(task.dueDate + "T00:00:00", { day: "numeric", month: "short" })}`}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onShare && <button onClick={() => onShare(task)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Envoyer"><Send size={13} /></button>}
              <button onClick={() => onEdit(task)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Modifier"><Pencil size={13} /></button>
              {canTrack && !done && <button onClick={() => onToggleTimer(task)} title={isRunning ? "Arrêter" : "Démarrer"} className="p-1.5 rounded-lg text-white" style={{ background: isRunning ? "#D81F26" : "var(--live)" }}>{isRunning ? <Square size={13} /> : <Play size={13} />}</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Vue principale ---------------- */
export default function Taches({ store, me, userId, liveSecForTask, isRunning, toggleTimer, advanceStatus, onShare, onEdit, onNew }) {
  const { tasks, members, properties, templates, actions } = store;
  const [quick, setQuick] = useState("");
  const [quickProp, setQuickProp] = useState("");
  const [scope, setScope] = useState("mine");
  const [search, setSearch] = useState("");
  const [filterNature, setFilterNature] = useState("all");
  const [showDone, setShowDone] = useState(false);
  const [view, setView] = useState("liste");

  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const propById = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p])), [properties]);

  /* --- Saisie rapide : une ligne, ça part --- */
  const quickAdd = async (tpl) => {
    const title = tpl ? tpl.label : quick.trim();
    if (!title) return;
    const prop = properties.find((p) => p.id === quickProp);
    await actions.createTask({
      title, description: "", deptId: tpl?.deptId || null, assigneeId: userId,
      urgency: tpl?.urgency || "normale", status: "a_faire", estMin: tpl?.estMin || 60,
      weekStart: mondayIso(new Date()), day: null, nature: tpl?.nature || "autre",
      propertyId: quickProp || null, ownerId: prop?.ownerId || null,
    });
    setQuick("");
  };

  const base = tasks.filter((t) => (scope === "all" || t.assigneeId === userId));
  const filtered = base.filter((t) =>
    (filterNature === "all" || t.nature === filterNature) &&
    (showDone || t.status !== "termine") &&
    (!search || t.title.toLowerCase().includes(search.toLowerCase()) ||
      (propById[t.propertyId]?.name || "").toLowerCase().includes(search.toLowerCase())));

  const sorted = [...filtered].sort((a, b) => {
    const uo = URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency);
    if (uo !== 0) return uo;
    return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
  });

  const openCount = base.filter((t) => t.status !== "termine").length;
  const urgentCount = base.filter((t) => t.status !== "termine" && (t.urgency === "urgente" || t.urgency === "haute")).length;
  const todayIso = isoDate(new Date());
  const dueToday = base.filter((t) => t.status !== "termine" && t.dueDate && t.dueDate <= todayIso);

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Tâches</h1>
        <button onClick={onNew} className="kb-btn kb-btn-primary"><Plus size={16} /> Nouvelle tâche</button>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        {openCount} en cours{urgentCount > 0 && ` · ${urgentCount} prioritaire(s)`}{dueToday.length > 0 && ` · ${dueToday.length} à échéance`}
      </p>

      {/* --- BARRE DE SAISIE RAPIDE --- */}
      <div className="bg-white rounded-xl border p-3 mb-4" style={{ borderColor: "var(--line)" }}>
        <div className="flex gap-2 mb-2.5">
          <input value={quick} onChange={(e) => setQuick(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") quickAdd(null); }}
            placeholder="Ajouter une tâche en une ligne, puis Entrée…"
            className="flex-1 px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
          <select value={quickProp} onChange={(e) => setQuickProp(e.target.value)}
            className="px-2 py-2 rounded-lg border text-sm bg-white max-w-[42%]" style={inputStyle} title="Rattacher à un bien">
            <option value="">Sans bien</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => quickAdd(null)} disabled={!quick.trim()} className="kb-btn kb-btn-primary disabled:opacity-40 px-3 shrink-0"><Plus size={16} /></button>
        </div>
        {templates.filter((t) => t.active).length > 0 && (
          <div>
            <p className="text-[11px] font-medium mb-1.5 flex items-center gap-1" style={{ color: "var(--muted)" }}><Zap size={11} style={{ color: "var(--brass)" }} /> Tâches courantes — un clic suffit</p>
            <div className="flex flex-wrap gap-1.5">
              {templates.filter((t) => t.active).map((t) => {
                const nat = NATURE[t.nature] || NATURE.autre;
                return <button key={t.id} onClick={() => quickAdd(t)} className="px-2.5 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                  style={{ background: nat.color + "14", color: nat.color, border: `1px solid ${nat.color}33` }}>+ {t.label}</button>;
              })}
            </div>
          </div>
        )}
      </div>

      {/* --- FILTRES --- */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg border overflow-hidden" style={inputStyle}>
          {[["mine", "Les miennes"], ["all", "Toute l'équipe"]].map(([v, l]) =>
            <button key={v} onClick={() => setScope(v)} className="px-3 py-2 text-sm" style={{ background: scope === v ? "var(--ink)" : "#fff", color: scope === v ? "#fff" : "var(--muted)" }}>{l}</button>)}
        </div>
        <div className="flex rounded-lg border overflow-hidden" style={inputStyle}>
          {[["liste", "Liste"], ["kanban", "Colonnes"]].map(([v, l]) =>
            <button key={v} onClick={() => setView(v)} className="px-3 py-2 text-sm" style={{ background: view === v ? "var(--ink)" : "#fff", color: view === v ? "#fff" : "var(--muted)" }}>{l}</button>)}
        </div>
        <div className="relative flex-1 min-w-[140px]">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
        </div>
        <select value={filterNature} onChange={(e) => setFilterNature(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}>
          <option value="all">Toutes natures</option>
          {NATURE_ORDER.map((n) => <option key={n} value={n}>{NATURE[n].label}</option>)}
        </select>
        <button onClick={() => setShowDone((s) => !s)} className="kb-btn kb-btn-ghost text-sm">
          {showDone ? "Masquer terminées" : "Voir terminées"}
        </button>
      </div>

      {/* --- LISTE --- */}
      {view === "liste" ? (
        sorted.length ? <div className="space-y-2">
          {sorted.map((t) => <TaskRow key={t.id} task={t} property={propById[t.propertyId]} assignee={memberById[t.assigneeId]}
            actualSec={liveSecForTask(t.id)} isRunning={isRunning(t.id)} canTrack={t.assigneeId === userId}
            onEdit={onEdit} onToggleTimer={toggleTimer} onAdvance={advanceStatus} onShare={onShare} />)}
        </div> : <EmptyState icon={Inbox} title="Rien à faire ici" sub="Utilisez la saisie rapide ci-dessus pour ajouter une tâche." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STATUS_ORDER.map((s) => {
            const col = filtered.filter((t) => t.status === s);
            return (
              <div key={s} className="bg-slate-50 rounded-xl p-2.5 border" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-sm font-semibold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: STATUS[s].color }} />{STATUS[s].label}</span>
                  <span className="text-xs px-1.5 rounded-full bg-white border" style={{ color: "var(--muted)", borderColor: "var(--line)" }}>{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map((t) => <TaskRow key={t.id} task={t} property={propById[t.propertyId]} assignee={memberById[t.assigneeId]}
                    actualSec={liveSecForTask(t.id)} isRunning={isRunning(t.id)} canTrack={t.assigneeId === userId}
                    onEdit={onEdit} onToggleTimer={toggleTimer} onAdvance={advanceStatus} onShare={onShare} />)}
                  {col.length === 0 && <p className="text-xs text-center py-4" style={{ color: "#B6BEC9" }}>—</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
