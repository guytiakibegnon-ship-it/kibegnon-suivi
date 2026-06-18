import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";

/* ---- mappers DB (snake_case) -> UI (camelCase) ---- */
const mProfile = (r) => ({ id: r.id, name: r.full_name, username: r.username, role: r.role, deptId: r.dept_id, color: r.color, active: r.active });
const mDept    = (r) => ({ id: r.id, name: r.name, color: r.color });
const mTask    = (r) => ({ id: r.id, title: r.title, description: r.description, deptId: r.dept_id, assigneeId: r.assignee_id, urgency: r.urgency, status: r.status, estMin: r.est_min, weekStart: r.week_start, day: r.day, dueDate: r.due_date, createdBy: r.created_by, createdAt: Date.parse(r.created_at) });
const mEntry   = (r) => ({ id: r.id, taskId: r.task_id, userId: r.user_id, start: Date.parse(r.start_at), end: Date.parse(r.end_at), durationSeconds: r.duration_seconds, note: r.note });
const mTimer   = (r) => ({ userId: r.user_id, taskId: r.task_id, startedAt: Date.parse(r.started_at) });
const mChannel = (r) => ({ id: r.id, type: r.type, name: r.name });
const mCM      = (r) => ({ channelId: r.channel_id, userId: r.user_id, lastReadAt: Date.parse(r.last_read_at) });
const mMsg     = (r) => ({ id: r.id, channelId: r.channel_id, fromId: r.from_id, text: r.body, taskId: r.task_id, createdAt: Date.parse(r.created_at) });

const upsertBy = (key, map) => (setter) => (row) =>
  setter((p) => { const v = map(row); const i = p.findIndex((x) => x[key] === v[key]); if (i >= 0) { const c = [...p]; c[i] = v; return c; } return [...p, v]; });
const removeBy = (key) => (setter) => (val) => setter((p) => p.filter((x) => x[key] !== val));

export function useStore(userId) {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [activeTimers, setActiveTimers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [channelMembers, setChannelMembers] = useState([]);
  const [messages, setMessages] = useState([]);

  const load = useCallback(async () => {
    const [dep, prof, tk, te, at, ch, cm, ms] = await Promise.all([
      supabase.from("departments").select("*").order("created_at"),
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("tasks").select("*"),
      supabase.from("time_entries").select("*"),
      supabase.from("active_timers").select("*"),
      supabase.from("channels").select("*"),
      supabase.from("channel_members").select("*"),
      supabase.from("messages").select("*"),
    ]);
    setDepartments((dep.data || []).map(mDept));
    setMembers((prof.data || []).map(mProfile));
    setTasks((tk.data || []).map(mTask));
    setTimeEntries((te.data || []).map(mEntry));
    setActiveTimers((at.data || []).map(mTimer));
    setChannels((ch.data || []).map(mChannel));
    setChannelMembers((cm.data || []).map(mCM));
    setMessages((ms.data || []).map(mMsg));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ---- abonnement temps réel ---- */
  useEffect(() => {
    const upTask = upsertBy("id", mTask)(setTasks), rmTask = removeBy("id")(setTasks);
    const upEntry = upsertBy("id", mEntry)(setTimeEntries), rmEntry = removeBy("id")(setTimeEntries);
    const upTimer = upsertBy("userId", mTimer)(setActiveTimers), rmTimer = removeBy("userId")(setActiveTimers);
    const upMsg = upsertBy("id", mMsg)(setMessages);
    const upProf = upsertBy("id", mProfile)(setMembers), rmProf = removeBy("id")(setMembers);
    const upDept = upsertBy("id", mDept)(setDepartments), rmDept = removeBy("id")(setDepartments);
    const upChan = upsertBy("id", mChannel)(setChannels);

    const ch = supabase.channel("kibegnon-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (p) => p.eventType === "DELETE" ? rmTask(p.old.id) : upTask(p.new))
      .on("postgres_changes", { event: "*", schema: "public", table: "time_entries" }, (p) => p.eventType === "DELETE" ? rmEntry(p.old.id) : upEntry(p.new))
      .on("postgres_changes", { event: "*", schema: "public", table: "active_timers" }, (p) => p.eventType === "DELETE" ? rmTimer(p.old.user_id) : upTimer(p.new))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
        setMessages((prev) => {
          // remplace un éventuel message optimiste (tmp) identique
          const cleaned = prev.filter((m) => !(String(m.id).startsWith("tmp-") && m.fromId === p.new.from_id && m.text === p.new.body && (m.taskId || null) === (p.new.task_id || null)));
          if (cleaned.some((m) => m.id === p.new.id)) return cleaned;
          return [...cleaned, mMsg(p.new)];
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "channels" }, (p) => p.eventType !== "DELETE" && upChan(p.new))
      .on("postgres_changes", { event: "*", schema: "public", table: "channel_members" }, () => { /* recharge légère */ supabase.from("channel_members").select("*").then(({ data }) => data && setChannelMembers(data.map(mCM))); })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (p) => p.eventType === "DELETE" ? rmProf(p.old.id) : upProf(p.new))
      .on("postgres_changes", { event: "*", schema: "public", table: "departments" }, (p) => p.eventType === "DELETE" ? rmDept(p.old.id) : upDept(p.new))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  /* ================= ACTIONS ================= */
  const createTask = async (f) => {
    await supabase.from("tasks").insert({
      title: f.title, description: f.description || "", dept_id: f.deptId, assignee_id: f.assigneeId,
      urgency: f.urgency, status: f.status, est_min: f.estMin, week_start: f.weekStart,
      day: f.day ?? null, due_date: f.dueDate ?? null, created_by: userId,
    });
  };
  const updateTask = async (id, patch) => {
    const row = {};
    if ("title" in patch) row.title = patch.title;
    if ("description" in patch) row.description = patch.description;
    if ("deptId" in patch) row.dept_id = patch.deptId;
    if ("assigneeId" in patch) row.assignee_id = patch.assigneeId;
    if ("urgency" in patch) row.urgency = patch.urgency;
    if ("status" in patch) row.status = patch.status;
    if ("estMin" in patch) row.est_min = patch.estMin;
    if ("weekStart" in patch) row.week_start = patch.weekStart;
    if ("day" in patch) row.day = patch.day;
    if ("dueDate" in patch) row.due_date = patch.dueDate;
    await supabase.from("tasks").update(row).eq("id", id);
  };
  const deleteTask = async (id) => { await supabase.from("tasks").delete().eq("id", id); };

  const startTimer = async (taskId) => {
    setActiveTimers((p) => [...p.filter((t) => t.userId !== userId), { userId, taskId, startedAt: Date.now() }]); // optimiste
    await supabase.from("active_timers").upsert({ user_id: userId, task_id: taskId, started_at: new Date().toISOString() });
  };
  const stopTimer = async () => {
    const mine = activeTimers.find((t) => t.userId === userId);
    if (!mine) return;
    const sec = Math.round((Date.now() - mine.startedAt) / 1000);
    setActiveTimers((p) => p.filter((t) => t.userId !== userId)); // optimiste
    if (sec > 1) {
      await supabase.from("time_entries").insert({ task_id: mine.taskId, user_id: userId, start_at: new Date(mine.startedAt).toISOString(), end_at: new Date().toISOString(), duration_seconds: sec, note: "" });
    }
    await supabase.from("active_timers").delete().eq("user_id", userId);
  };
  const addManualTime = async (taskId, min) => {
    const end = new Date();
    await supabase.from("time_entries").insert({ task_id: taskId, user_id: userId, start_at: new Date(Date.now() - min * 60000).toISOString(), end_at: end.toISOString(), duration_seconds: min * 60, note: "saisie manuelle" });
  };
  const deleteEntry = async (id) => { await supabase.from("time_entries").delete().eq("id", id); };

  const ensureDm = async (otherId) => {
    const { data, error } = await supabase.rpc("get_or_create_dm", { other_user: otherId });
    if (error) { console.error(error); return null; }
    await supabase.from("channel_members").select("*").then(({ data: cm }) => cm && setChannelMembers(cm.map(mCM)));
    await supabase.from("channels").select("*").then(({ data: c }) => c && setChannels(c.map(mChannel)));
    return data;
  };
  const sendMessage = async (channelId, text, taskId = null) => {
    const body = (text || "").trim();
    if (!body && !taskId) return;
    const tmp = { id: "tmp-" + Date.now(), channelId, fromId: userId, text: body, taskId, createdAt: Date.now() };
    setMessages((p) => [...p, tmp]); // optimiste
    await supabase.from("messages").insert({ channel_id: channelId, from_id: userId, body, task_id: taskId });
    markRead(channelId);
  };
  const markRead = async (channelId) => {
    setChannelMembers((p) => p.map((c) => (c.channelId === channelId && c.userId === userId ? { ...c, lastReadAt: Date.now() } : c)));
    await supabase.rpc("mark_channel_read", { cid: channelId });
  };

  const saveDept = async (f) => {
    if (f.id) await supabase.from("departments").update({ name: f.name, color: f.color }).eq("id", f.id);
    else await supabase.from("departments").insert({ name: f.name, color: f.color });
  };
  const deleteDept = async (id) => { await supabase.from("departments").delete().eq("id", id); };

  const updateProfile = async (id, patch) => {
    const row = {};
    if ("name" in patch) row.full_name = patch.name;
    if ("role" in patch) row.role = patch.role;
    if ("deptId" in patch) row.dept_id = patch.deptId;
    if ("color" in patch) row.color = patch.color;
    if ("active" in patch) row.active = patch.active;
    await supabase.from("profiles").update(row).eq("id", id);
  };
  const adminUsers = async (payload) => {
    const { data, error } = await supabase.functions.invoke("admin-users", { body: payload });
    if (error) return { error: error.message };
    await load();
    return data || {};
  };

  return {
    loading, departments, members, tasks, timeEntries, activeTimers, channels, channelMembers, messages,
    actions: { createTask, updateTask, deleteTask, startTimer, stopTimer, addManualTime, deleteEntry, ensureDm, sendMessage, markRead, saveDept, deleteDept, updateProfile, adminUsers, reload: load },
  };
}
