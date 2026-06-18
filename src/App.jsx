import { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard, CalendarDays, ListChecks, Clock, Users, Settings,
  Play, Square, Plus, Search, ChevronLeft, ChevronRight, X, Check,
  LogOut, Timer, Pencil, Trash2, CheckCircle2, BarChart3, MessageSquare,
  AlertTriangle, RotateCcw, Send, ArrowLeft, UserPlus, ShieldCheck,
  Eye, EyeOff, AtSign,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, CartesianGrid,
} from "recharts";
import { supabase } from "./supabaseClient";
import { useStore } from "./store";
import Login from "./Login.jsx";
import {
  LOGO, GENERAL_CHANNEL_ID, URGENCY, URGENCY_ORDER, STATUS, STATUS_ORDER, ROLES, DAYS,
  DEPT_PALETTE, isAdmin, canSupervise,
} from "./constants";
import { getMonday, isoDate, addDays, mondayIso, fr, weekLabel, fmtDur, fmtEst, fmtTime } from "./helpers";

const inputCls = "w-full px-3 py-2 rounded-lg border text-sm outline-none";
const inputStyle = { borderColor: "var(--line)" };

/* ====================== Présentation ====================== */
const Avatar = ({ member, size = 34 }) => {
  const initials = (member?.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return <div style={{ width: size, height: size, background: member?.color || "#94A3B8", fontSize: size * 0.38 }}
    className="rounded-full flex items-center justify-center text-white font-semibold shrink-0">{initials}</div>;
};
const Chip = ({ color, bg, children, dot }) => (
  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
    style={{ color, background: bg || "transparent", border: bg ? "none" : `1px solid ${color}33` }}>
    {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}{children}
  </span>
);
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(15,23,42,.55)" }} onClick={onClose}>
      <div className={`bg-white w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--line)" }}>
          <h3 className="font-semibold" style={{ color: "var(--ink)" }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
const Field = ({ label, children }) => (
  <label className="block mb-3"><span className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>{label}</span>{children}</label>
);
const StatCard = ({ icon: Icon, label, value, sub, tint = "var(--brass)" }) => (
  <div className="bg-white rounded-xl border p-4" style={{ borderColor: "var(--line)" }}>
    <div className="flex items-center gap-2 mb-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: tint + "1A", color: tint }}><Icon size={15} /></span><span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</span></div>
    <p className="text-2xl font-bold" style={{ color: "var(--ink)" }}>{value}</p>
    {sub && <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{sub}</p>}
  </div>
);
function TaskCard({ task, dept, assignee, actualSec, isRunning, canEdit, canTrack, onEdit, onToggleTimer, onAdvance, onShare, compact }) {
  const u = URGENCY[task.urgency];
  const overEst = task.estMin && actualSec > task.estMin * 60;
  return (
    <div className="bg-white rounded-xl border p-3 hover:shadow-md transition-shadow" style={{ borderColor: isRunning ? "var(--live)" : "var(--line)", boxShadow: isRunning ? "0 0 0 1px var(--live)" : undefined }}>
      <div className="flex items-start gap-2">
        <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: dept?.color || "#cbd5e1" }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-medium leading-snug" style={{ color: "var(--ink)" }}>{task.title}</p>
            <div className="flex shrink-0">
              {onShare && <button onClick={() => onShare(task)} className="p-1 rounded hover:bg-slate-100 text-slate-400" title="Envoyer à un membre"><Send size={13} /></button>}
              {canEdit && <button onClick={() => onEdit(task)} className="p-1 rounded hover:bg-slate-100 text-slate-400" title="Modifier"><Pencil size={13} /></button>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Chip color={u.color} bg={u.bg} dot>{u.label}</Chip>
            {!compact && dept && <Chip color={dept.color}>{dept.name.split(" ")[0]}</Chip>}
            <Chip color={STATUS[task.status].color}>{STATUS[task.status].label}</Chip>
          </div>
          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-2 min-w-0">
              {assignee && <Avatar member={assignee} size={22} />}
              <span className="text-xs truncate" style={{ color: "var(--muted)" }}>
                <Timer size={11} className="inline mb-0.5" /> {fmtEst(task.estMin)} · <span style={{ color: overEst ? "#D81F26" : "var(--muted)", fontWeight: overEst ? 600 : 400 }}>réel {fmtDur(actualSec)}</span>
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {task.status !== "termine" && <button onClick={() => onAdvance(task)} title="Avancer le statut" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><CheckCircle2 size={15} /></button>}
              {canTrack && task.status !== "termine" && <button onClick={() => onToggleTimer(task)} title={isRunning ? "Arrêter" : "Démarrer le chrono"} className="p-1.5 rounded-lg text-white" style={{ background: isRunning ? "#D81F26" : "var(--live)" }}>{isRunning ? <Square size={14} /> : <Play size={14} />}</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================== Modales ====================== */
function TaskModal({ initial, departments, members, onSave, onClose, onDelete }) {
  const [f, setF] = useState(() => ({ title: "", description: "", deptId: departments[0]?.id, assigneeId: members[0]?.id, urgency: "normale", status: "a_faire", estMin: 60, day: null, weekStart: mondayIso(new Date()), ...initial }));
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal title={initial?.id ? "Modifier la tâche" : "Nouvelle tâche"} onClose={onClose} wide>
      <Field label="Intitulé de la tâche"><input className={inputCls} style={inputStyle} value={f.title} autoFocus onChange={(e) => set("title", e.target.value)} placeholder="Ex. Rédiger un bail d'habitation" /></Field>
      <Field label="Description / consignes"><textarea className={inputCls} style={inputStyle} rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Détails, bien concerné, client…" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Département"><select className={inputCls} style={inputStyle} value={f.deptId} onChange={(e) => set("deptId", e.target.value)}>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Assignée à"><select className={inputCls} style={inputStyle} value={f.assigneeId} onChange={(e) => set("assigneeId", e.target.value)}>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
        <Field label="Urgence"><select className={inputCls} style={inputStyle} value={f.urgency} onChange={(e) => set("urgency", e.target.value)}>{URGENCY_ORDER.map((x) => <option key={x} value={x}>{URGENCY[x].label}</option>)}</select></Field>
        <Field label="Statut"><select className={inputCls} style={inputStyle} value={f.status} onChange={(e) => set("status", e.target.value)}>{STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}</select></Field>
        <Field label="Durée estimée (minutes)"><input type="number" min={0} step={5} className={inputCls} style={inputStyle} value={f.estMin} onChange={(e) => set("estMin", Number(e.target.value))} /></Field>
        <Field label="Jour planifié"><select className={inputCls} style={inputStyle} value={f.day ?? ""} onChange={(e) => set("day", e.target.value === "" ? null : Number(e.target.value))}><option value="">Non planifié</option>{DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></Field>
      </div>
      <div className="flex items-center justify-between gap-2 mt-2">
        {initial?.id ? <button onClick={() => onDelete(initial.id)} className="kb-btn text-red-600 hover:bg-red-50"><Trash2 size={15} /> Supprimer</button> : <span />}
        <div className="flex gap-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button><button disabled={!f.title.trim()} onClick={() => onSave(f)} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> Enregistrer</button></div>
      </div>
    </Modal>
  );
}
function ShareTaskModal({ task, members, currentUserId, onSend, onClose }) {
  const others = members.filter((m) => m.id !== currentUserId && m.active);
  const [dest, setDest] = useState("group");
  const [note, setNote] = useState("");
  const [reassign, setReassign] = useState(false);
  return (
    <Modal title="Envoyer la tâche" onClose={onClose}>
      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: "var(--line)", background: "#FAFAFB" }}><p className="text-sm font-medium">{task.title}</p></div>
      <Field label="Destinataire"><select className={inputCls} style={inputStyle} value={dest} onChange={(e) => setDest(e.target.value)}><option value="group">Toute l'équipe (canal Général)</option>{others.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
      <Field label="Message (facultatif)"><textarea className={inputCls} style={inputStyle} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. Merci de traiter en priorité." /></Field>
      {dest !== "group" && <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer"><input type="checkbox" checked={reassign} onChange={(e) => setReassign(e.target.checked)} /> Réattribuer cette tâche à ce destinataire</label>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button><button onClick={() => onSend({ dest, note, reassign })} className="kb-btn kb-btn-primary"><Send size={15} /> Envoyer</button></div>
    </Modal>
  );
}
function MemberModal({ initial, departments, members, onSubmit, onClose }) {
  const isNew = !initial?.id;
  const [f, setF] = useState(() => ({ name: "", role: "agent", deptId: departments[0]?.id, color: DEPT_PALETTE[Math.floor(Math.random() * DEPT_PALETTE.length)], username: "", password: "", active: true, ...initial }));
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const dupUser = isNew && members.some((m) => m.username?.toLowerCase() === f.username.trim().toLowerCase());
  const valid = f.name.trim() && (!isNew || (f.username.trim() && f.password.trim() && !dupUser));
  const submit = async () => {
    setBusy(true); setErr("");
    const res = await onSubmit(f, isNew);
    setBusy(false);
    if (res?.error) setErr(res.error); else onClose();
  };
  return (
    <Modal title={isNew ? "Créer un compte" : "Modifier le compte"} onClose={onClose}>
      <Field label="Nom complet"><input className={inputCls} style={inputStyle} value={f.name} autoFocus onChange={(e) => set("name", e.target.value)} placeholder="Ex. Aïssata KONÉ" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Identifiant de connexion"><input disabled={!isNew} className={inputCls + (isNew ? "" : " opacity-60")} style={inputStyle} value={f.username} onChange={(e) => set("username", e.target.value.replace(/\s/g, ""))} placeholder="aissata" /></Field>
        <Field label={isNew ? "Mot de passe" : "Nouveau mot de passe (option.)"}><div className="relative"><input type={showPwd ? "text" : "password"} className={inputCls + " pr-9"} style={inputStyle} value={f.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••" /><button onClick={() => setShowPwd((s) => !s)} className="absolute right-2 top-2 text-slate-400">{showPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></Field>
      </div>
      {dupUser && <p className="text-xs text-red-600 -mt-1 mb-2">Cet identifiant est déjà utilisé.</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Rôle"><select className={inputCls} style={inputStyle} value={f.role} onChange={(e) => set("role", e.target.value)}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Département"><select className={inputCls} style={inputStyle} value={f.deptId || ""} onChange={(e) => set("deptId", e.target.value)}>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
      </div>
      <Field label="Couleur"><div className="flex flex-wrap gap-2">{DEPT_PALETTE.map((c) => <button key={c} onClick={() => set("color", c)} className="w-7 h-7 rounded-full" style={{ background: c, outline: f.color === c ? "2px solid var(--ink)" : "none", outlineOffset: 2 }} />)}</div></Field>
      <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer"><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} /> Compte actif (peut se connecter)</label>
      {err && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
      <div className="flex justify-end gap-2 mt-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button><button disabled={!valid || busy} onClick={submit} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> {busy ? "…" : "Enregistrer"}</button></div>
    </Modal>
  );
}
function DeptModal({ initial, onSave, onClose }) {
  const [f, setF] = useState(() => ({ name: "", color: DEPT_PALETTE[0], ...initial }));
  return (
    <Modal title={initial?.id ? "Modifier le département" : "Nouveau département"} onClose={onClose}>
      <Field label="Nom du département"><input className={inputCls} style={inputStyle} value={f.name} autoFocus onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} placeholder="Ex. Gestion locative" /></Field>
      <Field label="Couleur"><div className="flex flex-wrap gap-2">{DEPT_PALETTE.map((c) => <button key={c} onClick={() => setF((p) => ({ ...p, color: c }))} className="w-7 h-7 rounded-full" style={{ background: c, outline: f.color === c ? "2px solid var(--ink)" : "none", outlineOffset: 2 }} />)}</div></Field>
      <div className="flex justify-end gap-2 mt-2"><button onClick={onClose} className="kb-btn kb-btn-ghost">Annuler</button><button disabled={!f.name.trim()} onClick={() => onSave(f)} className="kb-btn kb-btn-primary disabled:opacity-40"><Check size={16} /> Enregistrer</button></div>
    </Modal>
  );
}

/* ====================== ROOT (session) ====================== */
export default function Root() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  if (session === undefined) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}><p style={{ color: "var(--muted)" }}>Chargement…</p></div>;
  if (!session) return <Login />;
  return <Workspace userId={session.user.id} />;
}

/* ====================== WORKSPACE ====================== */
function Workspace({ userId }) {
  const store = useStore(userId);
  const { loading, departments, members, tasks, timeEntries, activeTimers, channels, channelMembers, messages, actions } = store;

  const [view, setView] = useState("dashboard");
  const [viewWeek, setViewWeek] = useState(mondayIso(new Date()));
  const [now, setNow] = useState(Date.now());
  const [taskModal, setTaskModal] = useState(null);
  const [shareTask, setShareTask] = useState(null);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterUrg, setFilterUrg] = useState("all");
  const [boardScope, setBoardScope] = useState("all");
  const [superMember, setSuperMember] = useState("all");
  const [manualTask, setManualTask] = useState("");
  const [manualMin, setManualMin] = useState(30);
  const [memberModal, setMemberModal] = useState(null);
  const [deptModal, setDeptModal] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [msgDraft, setMsgDraft] = useState("");
  const [attachTaskId, setAttachTaskId] = useState("");
  const threadRef = useRef(null);

  useEffect(() => { if (activeTimers.length === 0) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [activeTimers.length]);
  useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [activeChannel, messages]);

  const me = members.find((m) => m.id === userId);
  const deptById = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d])), [departments]);
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const baseSecByTask = useMemo(() => { const m = {}; timeEntries.forEach((e) => { m[e.taskId] = (m[e.taskId] || 0) + e.durationSeconds; }); return m; }, [timeEntries]);

  const myTimer = activeTimers.find((t) => t.userId === userId) || null;
  const isRunning = (taskId) => activeTimers.some((t) => t.taskId === taskId && t.userId === userId);
  const liveSecForTask = (taskId) => { let s = baseSecByTask[taskId] || 0; const tm = activeTimers.find((t) => t.taskId === taskId); if (tm) s += Math.round((now - tm.startedAt) / 1000); return s; };

  const toggleTimer = async (task) => {
    if (isRunning(task.id)) { await actions.stopTimer(); return; }
    if (myTimer) await actions.stopTimer();
    if (task.status === "a_faire") await actions.updateTask(task.id, { status: "en_cours" });
    await actions.startTimer(task.id);
  };
  const advanceStatus = async (task) => { const i = STATUS_ORDER.indexOf(task.status); const next = STATUS_ORDER[Math.min(i + 1, 3)]; if (next === "termine" && isRunning(task.id)) await actions.stopTimer(); await actions.updateTask(task.id, { status: next }); };
  const saveTask = async (f) => { if (f.id) await actions.updateTask(f.id, f); else await actions.createTask(f); setTaskModal(null); };
  const removeTask = async (id) => { await actions.deleteTask(id); setTaskModal(null); };

  const entryWeek = (e) => mondayIso(e.start);
  const secForUserWeek = (u, wk) => timeEntries.filter((e) => e.userId === u && entryWeek(e) === wk).reduce((a, e) => a + e.durationSeconds, 0);
  const secForUserDay = (u, di) => timeEntries.filter((e) => e.userId === u && isoDate(e.start) === di).reduce((a, e) => a + e.durationSeconds, 0);

  /* ---- messagerie ---- */
  const dmChannelFor = (otherId) => channels.find((c) => c.type === "dm" && channelMembers.some((cm) => cm.channelId === c.id && cm.userId === userId) && channelMembers.some((cm) => cm.channelId === c.id && cm.userId === otherId))?.id;
  const channelMessages = (chId) => messages.filter((m) => m.channelId === chId).sort((a, b) => a.createdAt - b.createdAt);
  const lastMessage = (chId) => { const l = channelMessages(chId); return l[l.length - 1]; };
  const lastRead = (chId) => channelMembers.find((c) => c.channelId === chId && c.userId === userId)?.lastReadAt || 0;
  const hasUnread = (chId) => { const lr = lastRead(chId); return messages.some((m) => m.channelId === chId && m.fromId !== userId && m.createdAt > lr); };
  const openGeneral = () => { setActiveChannel(GENERAL_CHANNEL_ID); actions.markRead(GENERAL_CHANNEL_ID); };
  const openDm = async (otherId) => { const cid = await actions.ensureDm(otherId); if (cid) { setActiveChannel(cid); actions.markRead(cid); } };
  const sendDraft = () => { if (!activeChannel) return; actions.sendMessage(activeChannel, msgDraft, attachTaskId || null); setMsgDraft(""); setAttachTaskId(""); };
  const doShare = async ({ dest, note, reassign }) => {
    const text = note || "Je vous partage cette tâche.";
    if (dest === "group") await actions.sendMessage(GENERAL_CHANNEL_ID, text, shareTask.id);
    else { const cid = await actions.ensureDm(dest); if (cid) await actions.sendMessage(cid, text, shareTask.id); if (reassign) await actions.updateTask(shareTask.id, { assigneeId: dest }); }
    setShareTask(null);
  };
  const unreadTotal = useMemo(() => {
    const dmIds = channels.filter((c) => c.type === "dm" && channelMembers.some((cm) => cm.channelId === c.id && cm.userId === userId)).map((c) => c.id);
    return [GENERAL_CHANNEL_ID, ...dmIds].filter((ch) => hasUnread(ch)).length;
  }, [channels, channelMembers, messages, userId]);

  if (loading || !me) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}><p style={{ color: "var(--muted)" }}>Chargement de votre espace…</p></div>;

  const NAV = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "planner", label: "Planning", icon: CalendarDays },
    { id: "board", label: "Tâches", icon: ListChecks },
    { id: "messages", label: "Messages", icon: MessageSquare, badge: unreadTotal },
    { id: "time", label: "Suivi du temps", icon: Clock },
    ...(canSupervise(me.role) ? [{ id: "team", label: "Supervision", icon: Users }] : []),
    ...(isAdmin(me.role) ? [{ id: "settings", label: "Administration", icon: Settings }] : []),
  ];

  const FloatingAdd = ({ prefill } = {}) => <button onClick={() => setTaskModal({ prefill: { assigneeId: userId, weekStart: viewWeek, ...prefill } })} className="kb-btn kb-btn-primary"><Plus size={16} /> Nouvelle tâche</button>;
  const WeekNav = ({ extra }) => (
    <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <button onClick={() => setViewWeek(mondayIso(addDays(viewWeek + "T00:00:00", -7)))} className="kb-btn kb-btn-ghost p-2"><ChevronLeft size={16} /></button>
        <div className="text-center min-w-[160px]"><p className="text-sm font-semibold">{weekLabel(viewWeek)}</p>{viewWeek === mondayIso(new Date()) && <p className="text-[11px]" style={{ color: "var(--brass)" }}>Semaine en cours</p>}</div>
        <button onClick={() => setViewWeek(mondayIso(addDays(viewWeek + "T00:00:00", 7)))} className="kb-btn kb-btn-ghost p-2"><ChevronRight size={16} /></button>
        {viewWeek !== mondayIso(new Date()) && <button onClick={() => setViewWeek(mondayIso(new Date()))} className="kb-btn kb-btn-ghost text-xs">Aujourd'hui</button>}
      </div>
      {extra}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <header style={{ background: "var(--ink)" }} className="text-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="bg-white rounded-md px-1.5 py-1 flex items-center shrink-0"><img src={LOGO} alt="Entreprise Kibegnon" className="h-6 w-auto" /></span>
            <div className="min-w-0 hidden xs:block"><p className="font-semibold leading-tight tracking-tight truncate">Suivi d'équipe</p><p className="text-[11px] leading-tight" style={{ color: "#9AA4B2" }}>Entreprise Kibegnon</p></div>
          </div>
          <div className="flex items-center gap-2">
            {myTimer && <button onClick={actions.stopTimer} className="hidden sm:flex items-center gap-2 rounded-full pl-3 pr-2 py-1.5 text-sm font-medium" style={{ background: "var(--live)" }}><span className="w-2 h-2 rounded-full bg-white animate-pulse" />{fmtDur((now - myTimer.startedAt) / 1000)}<span className="bg-white/25 rounded-full p-0.5"><Square size={12} /></span></button>}
            <div className="flex items-center gap-2 pl-1">
              <Avatar member={me} size={30} />
              <div className="hidden sm:block leading-tight"><p className="text-sm font-medium flex items-center gap-1">{me.name}{isAdmin(me.role) && <ShieldCheck size={13} style={{ color: "#9ED27E" }} />}</p><p className="text-[11px]" style={{ color: "#9AA4B2" }}>{ROLES[me.role]}</p></div>
              <button onClick={async () => { await actions.stopTimer(); supabase.auth.signOut(); }} title="Se déconnecter" className="p-2 rounded-lg hover:bg-white/10"><LogOut size={16} /></button>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-2">
          <nav className="flex gap-1 overflow-x-auto no-scrollbar">
            {NAV.map((n) => { const active = view === n.id; return (
              <button key={n.id} onClick={() => setView(n.id)} className="relative flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors" style={{ borderColor: active ? "var(--brass)" : "transparent", color: active ? "#fff" : "#9AA4B2", fontWeight: active ? 600 : 400 }}>
                <n.icon size={15} /> {n.label}
                {n.badge > 0 && <span className="ml-0.5 text-[10px] font-bold text-white rounded-full px-1.5 py-0.5 leading-none" style={{ background: "var(--brass)" }}>{n.badge}</span>}
              </button>
            ); })}
          </nav>
        </div>
      </header>

      {myTimer && <button onClick={actions.stopTimer} className="sm:hidden w-full flex items-center justify-center gap-2 py-2 text-white text-sm font-medium" style={{ background: "var(--live)" }}><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> En cours · {fmtDur((now - myTimer.startedAt) / 1000)} — toucher pour arrêter</button>}

      <main className="max-w-6xl mx-auto px-4 py-5">
        {view === "dashboard" && Dashboard()}
        {view === "planner" && Planner()}
        {view === "board" && Board()}
        {view === "messages" && Messages()}
        {view === "time" && TimeView()}
        {view === "team" && canSupervise(me.role) && Team()}
        {view === "settings" && isAdmin(me.role) && SettingsView()}
      </main>

      {taskModal && <TaskModal initial={taskModal.id ? taskModal : taskModal.prefill || {}} departments={departments} members={members} onSave={saveTask} onClose={() => setTaskModal(null)} onDelete={removeTask} />}
      {shareTask && <ShareTaskModal task={shareTask} members={members} currentUserId={userId} onSend={doShare} onClose={() => setShareTask(null)} />}
      {memberModal && <MemberModal initial={memberModal} departments={departments} members={members} onClose={() => setMemberModal(null)}
        onSubmit={async (f, isNew) => {
          if (isNew) return await actions.adminUsers({ action: "create", username: f.username, password: f.password, full_name: f.name, role: f.role, dept_id: f.deptId, color: f.color });
          await actions.updateProfile(f.id, { name: f.name, role: f.role, deptId: f.deptId, color: f.color, active: f.active });
          if (f.password?.trim()) { const r = await actions.adminUsers({ action: "reset_password", user_id: f.id, password: f.password }); if (r?.error) return r; }
          return {};
        }} />}
      {deptModal && <DeptModal initial={deptModal} onClose={() => setDeptModal(null)} onSave={async (f) => { await actions.saveDept(f); setDeptModal(null); }} />}
    </div>
  );

  /* ---------- Vues ---------- */
  function Dashboard() {
    const wk = mondayIso(new Date()), today = isoDate(new Date());
    const myTasks = tasks.filter((t) => t.assigneeId === userId);
    const myOpen = myTasks.filter((t) => t.status !== "termine");
    const live = myTimer ? Math.round((now - myTimer.startedAt) / 1000) : 0;
    const todaySec = secForUserDay(userId, today) + live;
    const weekSec = secForUserWeek(userId, wk);
    const runningTask = myTimer ? tasks.find((t) => t.id === myTimer.taskId) : null;
    const sup = canSupervise(me.role);
    const teamHours = members.filter((m) => m.active).map((m) => ({ name: m.name.split(" ")[0], h: +(secForUserWeek(m.id, wk) / 3600).toFixed(2), color: m.color }));
    const activeNow = activeTimers.map((t) => memberById[t.userId]).filter(Boolean);
    return (
      <div>
        <div className="flex items-center justify-between mb-4"><div><h1 className="text-xl font-bold">Bonjour {me.name.split(" ")[0]} 👋</h1><p className="text-sm" style={{ color: "var(--muted)" }}>{fr(new Date(), { weekday: "long", day: "numeric", month: "long" })}</p></div><FloatingAdd /></div>
        {runningTask && <div className="rounded-xl p-4 mb-4 text-white flex items-center justify-between" style={{ background: "linear-gradient(100deg,#3d7d20,#4F9E2A)" }}><div className="min-w-0"><p className="text-xs opacity-90 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Chrono en cours</p><p className="font-medium truncate">{runningTask.title}</p></div><div className="flex items-center gap-3"><span className="text-2xl font-bold tabular-nums">{fmtDur((now - myTimer.startedAt) / 1000)}</span><button onClick={actions.stopTimer} className="bg-white/20 hover:bg-white/30 rounded-lg p-2"><Square size={18} /></button></div></div>}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard icon={ListChecks} label="Mes tâches ouvertes" value={myOpen.length} sub={`${myTasks.length} au total`} tint="#2E78A8" />
          <StatCard icon={Clock} label="Temps suivi aujourd'hui" value={fmtDur(todaySec)} tint="#4F9E2A" />
          <StatCard icon={BarChart3} label="Temps suivi cette semaine" value={fmtDur(weekSec)} tint="var(--brass)" />
          <StatCard icon={AlertTriangle} label="Tâches urgentes" value={myOpen.filter((t) => t.urgency === "urgente" || t.urgency === "haute").length} tint="#D81F26" />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <section className="bg-white rounded-xl border p-4" style={{ borderColor: "var(--line)" }}>
            <h2 className="font-semibold mb-3 flex items-center gap-2"><CalendarDays size={16} style={{ color: "var(--brass)" }} /> Mes prochaines tâches</h2>
            <div className="space-y-2">{myOpen.slice(0, 5).map((t) => <TaskCard key={t.id} task={t} dept={deptById[t.deptId]} assignee={memberById[t.assigneeId]} actualSec={liveSecForTask(t.id)} isRunning={isRunning(t.id)} canEdit canTrack compact onEdit={setTaskModal} onToggleTimer={toggleTimer} onAdvance={advanceStatus} onShare={setShareTask} />)}{myOpen.length === 0 && <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>Aucune tâche en attente.</p>}</div>
          </section>
          {sup ? (
            <section className="bg-white rounded-xl border p-4" style={{ borderColor: "var(--line)" }}>
              <h2 className="font-semibold mb-1 flex items-center gap-2"><Users size={16} style={{ color: "var(--brass)" }} /> Activité de l'équipe</h2>
              <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>Heures suivies cette semaine</p>
              <ResponsiveContainer width="100%" height={170}><BarChart data={teamHours} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F5" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} /><Tooltip formatter={(v) => [`${v} h`, "Temps"]} /><Bar dataKey="h" radius={[5, 5, 0, 0]}>{teamHours.map((d, i) => <Cell key={i} fill={d.color} />)}</Bar></BarChart></ResponsiveContainer>
              <div className="mt-3 pt-3 border-t text-sm flex items-center gap-2" style={{ borderColor: "var(--line)" }}><span className="w-2 h-2 rounded-full" style={{ background: activeNow.length ? "var(--live)" : "#CBD5E1" }} />{activeNow.length ? <span>{activeNow.map((m) => m.name.split(" ")[0]).join(", ")} en train de travailler</span> : <span style={{ color: "var(--muted)" }}>Personne ne suit de tâche actuellement</span>}</div>
            </section>
          ) : (
            <section className="bg-white rounded-xl border p-4" style={{ borderColor: "var(--line)" }}>
              <h2 className="font-semibold mb-3 flex items-center gap-2"><BarChart3 size={16} style={{ color: "var(--brass)" }} /> Ma répartition par statut</h2>
              <div className="space-y-2.5">{STATUS_ORDER.map((s) => { const n = myTasks.filter((t) => t.status === s).length; const pct = myTasks.length ? (n / myTasks.length) * 100 : 0; return <div key={s}><div className="flex justify-between text-xs mb-1"><span>{STATUS[s].label}</span><span style={{ color: "var(--muted)" }}>{n}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full" style={{ width: `${pct}%`, background: STATUS[s].color }} /></div></div>; })}</div>
            </section>
          )}
        </div>
      </div>
    );
  }

  function Planner() {
    const sup = canSupervise(me.role);
    const who = sup && superMember !== "all" ? superMember : userId;
    const planMember = memberById[who];
    const weekTasks = tasks.filter((t) => t.weekStart === viewWeek && t.assigneeId === who);
    const unplanned = weekTasks.filter((t) => t.day === null || t.day === undefined);
    const estTotal = weekTasks.reduce((a, t) => a + (t.estMin || 0), 0);
    const realTotal = weekTasks.reduce((a, t) => a + liveSecForTask(t.id), 0);
    return (
      <div>
        <div className="flex items-center justify-between mb-1 gap-2 flex-wrap"><h1 className="text-xl font-bold">Planning hebdomadaire</h1><FloatingAdd prefill={{ assigneeId: who, day: 0 }} /></div>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>{planMember?.name} · Estimé {fmtEst(estTotal)} · Suivi {fmtDur(realTotal)}</p>
        <WeekNav extra={sup && <select className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} value={superMember} onChange={(e) => setSuperMember(e.target.value)}><option value="all">Mon planning ({me.name.split(" ")[0]})</option>{members.filter((m) => m.id !== userId && m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DAYS.map((day, i) => {
            const dayIso = isoDate(addDays(viewWeek + "T00:00:00", i));
            const dts = weekTasks.filter((t) => t.day === i);
            const isToday = dayIso === isoDate(new Date());
            return (
              <div key={i} className="bg-white rounded-xl border" style={{ borderColor: isToday ? "var(--brass)" : "var(--line)" }}>
                <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "var(--line)" }}><div><p className="text-sm font-semibold">{day}</p><p className="text-[11px]" style={{ color: "var(--muted)" }}>{fr(addDays(viewWeek + "T00:00:00", i), { day: "numeric", month: "short" })} · {fmtDur(secForUserDay(who, dayIso))}</p></div><button onClick={() => setTaskModal({ prefill: { assigneeId: who, weekStart: viewWeek, day: i } })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Plus size={15} /></button></div>
                <div className="p-2 space-y-2 min-h-[60px]">{dts.map((t) => <TaskCard key={t.id} task={t} dept={deptById[t.deptId]} assignee={memberById[t.assigneeId]} actualSec={liveSecForTask(t.id)} isRunning={isRunning(t.id)} canEdit canTrack={who === userId} compact onEdit={setTaskModal} onToggleTimer={toggleTimer} onAdvance={advanceStatus} onShare={setShareTask} />)}{dts.length === 0 && <p className="text-xs text-center py-3" style={{ color: "#B6BEC9" }}>—</p>}</div>
              </div>
            );
          })}
        </div>
        {unplanned.length > 0 && <div className="mt-4 bg-white rounded-xl border p-3" style={{ borderColor: "var(--line)" }}><p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><AlertTriangle size={14} style={{ color: "#EA580C" }} /> À planifier cette semaine</p><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{unplanned.map((t) => <TaskCard key={t.id} task={t} dept={deptById[t.deptId]} assignee={memberById[t.assigneeId]} actualSec={liveSecForTask(t.id)} isRunning={isRunning(t.id)} canEdit canTrack={who === userId} compact onEdit={setTaskModal} onToggleTimer={toggleTimer} onAdvance={advanceStatus} onShare={setShareTask} />)}</div></div>}
      </div>
    );
  }

  function Board() {
    const list = tasks.filter((t) => (boardScope === "all" || t.assigneeId === userId) && (filterDept === "all" || t.deptId === filterDept) && (filterUrg === "all" || t.urgency === filterUrg) && (!search || t.title.toLowerCase().includes(search.toLowerCase())));
    return (
      <div>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap"><h1 className="text-xl font-bold">Tâches de l'agence</h1><FloatingAdd /></div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[160px]"><Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une tâche…" className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} /></div>
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}><option value="all">Tous départements</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <select value={filterUrg} onChange={(e) => setFilterUrg(e.target.value)} className="px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}><option value="all">Toutes urgences</option>{URGENCY_ORDER.map((u) => <option key={u} value={u}>{URGENCY[u].label}</option>)}</select>
          <div className="flex rounded-lg border overflow-hidden" style={inputStyle}>{[["all", "Toute l'équipe"], ["mine", "Mes tâches"]].map(([v, l]) => <button key={v} onClick={() => setBoardScope(v)} className="px-3 py-2 text-sm" style={{ background: boardScope === v ? "var(--ink)" : "#fff", color: boardScope === v ? "#fff" : "var(--muted)" }}>{l}</button>)}</div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STATUS_ORDER.map((s) => { const col = list.filter((t) => t.status === s); return (
            <div key={s} className="bg-slate-50 rounded-xl p-2.5 border" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center justify-between px-1 mb-2"><span className="text-sm font-semibold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: STATUS[s].color }} />{STATUS[s].label}</span><span className="text-xs px-1.5 rounded-full bg-white border" style={{ color: "var(--muted)", borderColor: "var(--line)" }}>{col.length}</span></div>
              <div className="space-y-2">{col.map((t) => <TaskCard key={t.id} task={t} dept={deptById[t.deptId]} assignee={memberById[t.assigneeId]} actualSec={liveSecForTask(t.id)} isRunning={isRunning(t.id)} canEdit={canSupervise(me.role) || t.assigneeId === userId} canTrack={t.assigneeId === userId} onEdit={setTaskModal} onToggleTimer={toggleTimer} onAdvance={advanceStatus} onShare={setShareTask} />)}{col.length === 0 && <p className="text-xs text-center py-4" style={{ color: "#B6BEC9" }}>Aucune tâche</p>}</div>
            </div>
          ); })}
        </div>
      </div>
    );
  }

  function Messages() {
    const others = members.filter((m) => m.active);
    const convos = [{ chId: GENERAL_CHANNEL_ID, name: "Général", group: true }, ...others.filter((m) => m.id !== userId).map((m) => ({ chId: dmChannelFor(m.id), name: m.name, member: m, group: false }))];
    const current = activeChannel ? (activeChannel === GENERAL_CHANNEL_ID ? { chId: GENERAL_CHANNEL_ID, name: "Général", group: true } : convos.find((c) => c.chId === activeChannel)) : null;
    const myTasks = tasks.filter((t) => t.assigneeId === userId);

    const ConvoList = (
      <div className={`${activeChannel ? "hidden md:block" : "block"} md:w-72 shrink-0 bg-white rounded-xl border overflow-hidden`} style={{ borderColor: "var(--line)" }}>
        <p className="text-sm font-semibold px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}>Conversations</p>
        <div className="divide-y max-h-[70vh] overflow-y-auto" style={{ borderColor: "var(--line)" }}>
          {convos.map((c) => { const lm = c.chId ? lastMessage(c.chId) : null; const unread = c.chId ? hasUnread(c.chId) : false; const open = c.group ? openGeneral : () => openDm(c.member.id); return (
            <button key={c.member?.id || "gen"} onClick={open} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50" style={{ background: activeChannel === c.chId && c.chId ? "#F6F8FA" : "#fff" }}>
              {c.group ? <span className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: "var(--brass)" }}><Users size={16} /></span> : <Avatar member={c.member} size={36} />}
              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate flex items-center gap-1">{c.name}{unread && <span className="w-2 h-2 rounded-full" style={{ background: "var(--brass)" }} />}</p><p className="text-[11px] truncate" style={{ color: "var(--muted)" }}>{lm ? `${lm.fromId === userId ? "Vous : " : ""}${lm.taskId ? "📋 " : ""}${lm.text || "Tâche partagée"}` : "Démarrer la conversation"}</p></div>
            </button>
          ); })}
        </div>
      </div>
    );

    const Thread = current && (
      <div className="flex-1 bg-white rounded-xl border flex flex-col min-h-[60vh] max-h-[78vh]" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: "var(--line)" }}><button onClick={() => setActiveChannel(null)} className="md:hidden p-1.5 rounded-lg hover:bg-slate-100"><ArrowLeft size={17} /></button>{current.group ? <span className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: "var(--brass)" }}><Users size={15} /></span> : <Avatar member={current.member} size={32} />}<div><p className="text-sm font-semibold">{current.name}</p><p className="text-[11px]" style={{ color: "var(--muted)" }}>{current.group ? `${others.length} membres` : ROLES[current.member.role]}</p></div></div>
        <div ref={threadRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {channelMessages(current.chId).map((m) => { const mine = m.fromId === userId; const from = memberById[m.fromId]; const refTask = m.taskId ? tasks.find((t) => t.id === m.taskId) : null; return (
            <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <Avatar member={from} size={28} />
              <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                <div className="px-3 py-2 rounded-2xl text-sm" style={{ background: mine ? "var(--brass)" : "#F1F3F5", color: mine ? "#fff" : "var(--ink)", borderTopRightRadius: mine ? 4 : 16, borderTopLeftRadius: mine ? 16 : 4 }}>
                  {!mine && current.group && <p className="text-[11px] font-semibold mb-0.5" style={{ color: from?.color }}>{from?.name}</p>}
                  {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                  {refTask && <div className="mt-2 rounded-lg p-2 text-left" style={{ background: mine ? "rgba(255,255,255,.15)" : "#fff", border: mine ? "none" : "1px solid var(--line)" }}><p className="text-[11px] flex items-center gap-1 mb-0.5" style={{ color: mine ? "rgba(255,255,255,.85)" : "var(--muted)" }}><ListChecks size={11} /> Tâche partagée</p><p className="text-sm font-medium" style={{ color: mine ? "#fff" : "var(--ink)" }}>{refTask.title}</p><p className="text-[11px] mt-0.5" style={{ color: mine ? "rgba(255,255,255,.85)" : "var(--muted)" }}>{URGENCY[refTask.urgency].label} · {STATUS[refTask.status].label}</p></div>}
                </div>
                <span className="text-[10px] mt-0.5 px-1" style={{ color: "var(--muted)" }}>{fmtTime(m.createdAt)}</span>
              </div>
            </div>
          ); })}
          {channelMessages(current.chId).length === 0 && <p className="text-sm text-center py-10" style={{ color: "var(--muted)" }}>Aucun message. Écrivez le premier.</p>}
        </div>
        {attachTaskId && <div className="px-3 pt-2 flex items-center gap-2"><Chip color="var(--brass)" bg="#FDEAEA"><ListChecks size={11} /> {tasks.find((t) => t.id === attachTaskId)?.title?.slice(0, 40)}</Chip><button onClick={() => setAttachTaskId("")} className="text-slate-400"><X size={14} /></button></div>}
        <div className="p-2.5 border-t flex items-center gap-2" style={{ borderColor: "var(--line)" }}>
          <select value={attachTaskId} onChange={(e) => setAttachTaskId(e.target.value)} className="text-xs px-2 py-2 rounded-lg border bg-white shrink-0" style={{ ...inputStyle, width: 46 }} title="Joindre une tâche"><option value="">📎</option>{myTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
          <input value={msgDraft} onChange={(e) => setMsgDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDraft(); } }} placeholder="Écrire un message…" className="flex-1 px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle} />
          <button onClick={sendDraft} disabled={!msgDraft.trim() && !attachTaskId} className="kb-btn kb-btn-primary disabled:opacity-40 px-3"><Send size={16} /></button>
        </div>
      </div>
    );

    return (
      <div>
        <h1 className="text-xl font-bold mb-1">Messagerie d'équipe</h1>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Échangez en privé, en groupe, et partagez des tâches en un geste.</p>
        <div className="flex gap-4">{ConvoList}{activeChannel ? Thread : <div className="hidden md:flex flex-1 bg-white rounded-xl border items-center justify-center text-sm min-h-[60vh]" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>Sélectionnez une conversation</div>}</div>
      </div>
    );
  }

  function TimeView() {
    const myEntries = [...timeEntries].filter((e) => e.userId === userId).sort((a, b) => b.start - a.start);
    const todaySec = secForUserDay(userId, isoDate(new Date()));
    const weekSec = secForUserWeek(userId, mondayIso(new Date()));
    const trackable = tasks.filter((t) => t.assigneeId === userId && t.status !== "termine");
    return (
      <div>
        <h1 className="text-xl font-bold mb-1">Suivi du temps</h1>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Chronométrez vos tâches en temps réel, ou saisissez le temps manuellement.</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-5"><StatCard icon={Clock} label="Aujourd'hui" value={fmtDur(todaySec)} tint="#4F9E2A" /><StatCard icon={BarChart3} label="Cette semaine" value={fmtDur(weekSec)} tint="var(--brass)" /></div>
        <div className="bg-white rounded-xl border p-4 mb-4" style={{ borderColor: "var(--line)" }}>
          <p className="text-sm font-semibold mb-2">Lancer un chrono</p>
          <div className="grid sm:grid-cols-2 gap-2">{trackable.map((t) => <div key={t.id} className="flex items-center justify-between gap-2 border rounded-lg px-3 py-2" style={{ borderColor: isRunning(t.id) ? "var(--live)" : "var(--line)" }}><span className="text-sm truncate">{t.title}</span><div className="flex items-center gap-2 shrink-0"><span className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>{fmtDur(liveSecForTask(t.id))}</span><button onClick={() => toggleTimer(t)} className="p-1.5 rounded-lg text-white" style={{ background: isRunning(t.id) ? "#D81F26" : "var(--live)" }}>{isRunning(t.id) ? <Square size={13} /> : <Play size={13} />}</button></div></div>)}{trackable.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>Aucune tâche active à chronométrer.</p>}</div>
          <div className="border-t mt-4 pt-3" style={{ borderColor: "var(--line)" }}>
            <p className="text-sm font-semibold mb-2">Saisie manuelle</p>
            <div className="flex flex-wrap gap-2 items-center"><select value={manualTask} onChange={(e) => setManualTask(e.target.value)} className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border text-sm bg-white" style={inputStyle}><option value="">Choisir une tâche…</option>{tasks.filter((t) => t.assigneeId === userId).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select><input type="number" min={5} step={5} value={manualMin} onChange={(e) => setManualMin(Number(e.target.value))} className="w-24 px-3 py-2 rounded-lg border text-sm" style={inputStyle} /> <span className="text-sm" style={{ color: "var(--muted)" }}>min</span><button disabled={!manualTask} onClick={() => { actions.addManualTime(manualTask, manualMin); setManualTask(""); }} className="kb-btn kb-btn-primary disabled:opacity-40"><Plus size={15} /> Ajouter</button></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border" style={{ borderColor: "var(--line)" }}>
          <p className="text-sm font-semibold px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}>Mes sessions enregistrées</p>
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>{myEntries.slice(0, 40).map((e) => { const t = tasks.find((x) => x.id === e.taskId); return <div key={e.id} className="flex items-center justify-between px-4 py-2.5 gap-2"><div className="min-w-0"><p className="text-sm truncate">{t?.title || "Tâche supprimée"}</p><p className="text-[11px]" style={{ color: "var(--muted)" }}>{fr(e.start, { weekday: "short", day: "numeric", month: "short" })} · {fmtTime(e.start)}{e.note ? ` · ${e.note}` : ""}</p></div><div className="flex items-center gap-2 shrink-0"><span className="text-sm font-medium tabular-nums">{fmtDur(e.durationSeconds)}</span><button onClick={() => actions.deleteEntry(e.id)} className="p-1 rounded text-slate-300 hover:text-red-500"><Trash2 size={14} /></button></div></div>; })}{myEntries.length === 0 && <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>Aucune session pour le moment.</p>}</div>
        </div>
      </div>
    );
  }

  function Team() {
    const wk = viewWeek;
    const rows = members.filter((m) => m.active).map((m) => { const mTasks = tasks.filter((t) => t.assigneeId === m.id); const open = mTasks.filter((t) => t.status !== "termine"); const est = tasks.filter((t) => t.assigneeId === m.id && t.weekStart === wk).reduce((a, t) => a + (t.estMin || 0), 0); return { m, open: open.length, done: mTasks.filter((t) => t.status === "termine").length, urgent: open.filter((t) => t.urgency === "urgente" || t.urgency === "haute").length, estMin: est, realSec: secForUserWeek(m.id, wk), active: activeTimers.some((t) => t.userId === m.id) }; });
    const deptTime = departments.map((d) => { const sec = timeEntries.filter((e) => entryWeek(e) === wk && tasks.find((t) => t.id === e.taskId)?.deptId === d.id).reduce((a, e) => a + e.durationSeconds, 0); return { name: d.name.split(" ")[0], value: +(sec / 3600).toFixed(2), color: d.color }; }).filter((d) => d.value > 0);
    const teamWeekSec = rows.reduce((a, r) => a + r.realSec, 0);
    return (
      <div>
        <h1 className="text-xl font-bold mb-1">Supervision de l'équipe</h1>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Qui fait quoi, et combien de temps chaque tâche prend réellement.</p>
        <WeekNav />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard icon={Clock} label="Temps total équipe" value={fmtDur(teamWeekSec)} tint="var(--brass)" />
          <StatCard icon={ListChecks} label="Tâches ouvertes" value={tasks.filter((t) => t.status !== "termine").length} tint="#2E78A8" />
          <StatCard icon={CheckCircle2} label="Tâches terminées" value={tasks.filter((t) => t.status === "termine").length} tint="#4F9E2A" />
          <StatCard icon={AlertTriangle} label="Urgences ouvertes" value={tasks.filter((t) => t.status !== "termine" && (t.urgency === "urgente" || t.urgency === "haute")).length} tint="#D81F26" />
        </div>
        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          <section className="bg-white rounded-xl border p-4" style={{ borderColor: "var(--line)" }}><h2 className="font-semibold mb-3 text-sm">Heures suivies par personne</h2><ResponsiveContainer width="100%" height={200}><BarChart data={rows.map((r) => ({ name: r.m.name.split(" ")[0], h: +(r.realSec / 3600).toFixed(2), color: r.m.color }))} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F5" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} /><Tooltip formatter={(v) => [`${v} h`, "Temps"]} /><Bar dataKey="h" radius={[5, 5, 0, 0]}>{rows.map((r, i) => <Cell key={i} fill={r.m.color} />)}</Bar></BarChart></ResponsiveContainer></section>
          <section className="bg-white rounded-xl border p-4" style={{ borderColor: "var(--line)" }}><h2 className="font-semibold mb-3 text-sm">Répartition du temps par département</h2>{deptTime.length ? <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={deptTime} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>{deptTime.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie><Tooltip formatter={(v, n) => [`${v} h`, n]} /></PieChart></ResponsiveContainer> : <p className="text-sm text-center py-12" style={{ color: "var(--muted)" }}>Pas encore de temps suivi cette semaine.</p>}<div className="flex flex-wrap gap-2 mt-2 justify-center">{deptTime.map((d) => <Chip key={d.name} color={d.color} dot>{d.name}</Chip>)}</div></section>
        </div>
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left" style={{ color: "var(--muted)" }}><th className="px-4 py-2.5 font-medium">Membre</th><th className="px-3 py-2.5 font-medium">Ouvertes</th><th className="px-3 py-2.5 font-medium">Terminées</th><th className="px-3 py-2.5 font-medium">Urgences</th><th className="px-3 py-2.5 font-medium">Estimé (sem.)</th><th className="px-3 py-2.5 font-medium">Suivi (sem.)</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.m.id} className="border-t" style={{ borderColor: "var(--line)" }}><td className="px-4 py-2.5"><div className="flex items-center gap-2"><Avatar member={r.m} size={28} /><div className="min-w-0"><p className="font-medium flex items-center gap-1.5">{r.m.name}{r.active && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--live)" }} />}</p><p className="text-[11px]" style={{ color: "var(--muted)" }}>{ROLES[r.m.role]}</p></div></div></td><td className="px-3 py-2.5">{r.open}</td><td className="px-3 py-2.5">{r.done}</td><td className="px-3 py-2.5">{r.urgent > 0 ? <Chip color="#D81F26" bg="#FDEAEA">{r.urgent}</Chip> : "—"}</td><td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>{fmtEst(r.estMin)}</td><td className="px-3 py-2.5 font-medium">{fmtDur(r.realSec)}</td></tr>)}</tbody>
        </table></div></div>
      </div>
    );
  }

  function SettingsView() {
    return (
      <div>
        <div className="flex items-center gap-2 mb-1"><h1 className="text-xl font-bold">Administration</h1><Chip color="var(--brass)" bg="#FDEAEA"><ShieldCheck size={12} /> Accès complet</Chip></div>
        <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>Créez les comptes de l'équipe, définissez les rôles et gérez les départements.</p>
        <section className="bg-white rounded-xl border mb-4" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}><h2 className="font-semibold flex items-center gap-2"><Users size={16} style={{ color: "var(--brass)" }} /> Comptes utilisateurs</h2><button onClick={() => setMemberModal({})} className="kb-btn kb-btn-primary text-sm"><UserPlus size={14} /> Créer un compte</button></div>
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>{members.map((m) => <div key={m.id} className="flex items-center justify-between px-4 py-2.5"><div className="flex items-center gap-2.5"><Avatar member={m} size={34} /><div><p className="text-sm font-medium flex items-center gap-1.5">{m.name}{!m.active && <Chip color="#94A3B8">désactivé</Chip>}</p><p className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--muted)" }}><AtSign size={11} />{m.username} · {ROLES[m.role]} · {deptById[m.deptId]?.name || "—"}</p></div></div><div className="flex gap-1"><button onClick={() => setMemberModal(m)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Pencil size={14} /></button>{m.id !== userId && <button onClick={async () => { if (confirm(`Supprimer le compte de ${m.name} ?`)) await actions.adminUsers({ action: "delete", user_id: m.id }); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}</div></div>)}</div>
        </section>
        <section className="bg-white rounded-xl border mb-4" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}><h2 className="font-semibold flex items-center gap-2"><BarChart3 size={16} style={{ color: "var(--brass)" }} /> Départements</h2><button onClick={() => setDeptModal({})} className="kb-btn kb-btn-ghost text-sm"><Plus size={14} /> Ajouter</button></div>
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>{departments.map((d) => <div key={d.id} className="flex items-center justify-between px-4 py-2.5"><div className="flex items-center gap-2.5"><span className="w-4 h-4 rounded" style={{ background: d.color }} /><p className="text-sm font-medium">{d.name}</p></div><div className="flex gap-1"><button onClick={() => setDeptModal(d)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Pencil size={14} /></button>{departments.length > 1 && <button onClick={() => actions.deleteDept(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}</div></div>)}</div>
        </section>
      </div>
    );
  }
}
