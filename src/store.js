import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";

/* ---- mappers DB (snake_case) -> UI (camelCase) ---- */
const mProfile = (r) => ({ id: r.id, name: r.full_name, username: r.username, role: r.role, deptId: r.dept_id, color: r.color, active: r.active });
const mDept    = (r) => ({ id: r.id, name: r.name, color: r.color });
const mTask    = (r) => ({ id: r.id, title: r.title, description: r.description, deptId: r.dept_id, assigneeId: r.assignee_id, urgency: r.urgency, status: r.status, estMin: r.est_min, weekStart: r.week_start, day: r.day, dueDate: r.due_date, createdBy: r.created_by, createdAt: Date.parse(r.created_at), propertyId: r.property_id, ownerId: r.owner_id, nature: r.nature || "autre" });
const mEntry   = (r) => ({ id: r.id, taskId: r.task_id, userId: r.user_id, start: Date.parse(r.start_at), end: Date.parse(r.end_at), durationSeconds: r.duration_seconds, note: r.note });
const mTimer   = (r) => ({ userId: r.user_id, taskId: r.task_id, startedAt: Date.parse(r.started_at) });
const mChannel = (r) => ({ id: r.id, type: r.type, name: r.name });
const mCM      = (r) => ({ channelId: r.channel_id, userId: r.user_id, lastReadAt: Date.parse(r.last_read_at) });
const mMsg     = (r) => ({ id: r.id, channelId: r.channel_id, fromId: r.from_id, text: r.body, taskId: r.task_id, createdAt: Date.parse(r.created_at) });

const mOwner   = (r) => ({ id: r.id, name: r.full_name, kind: r.kind, phone: r.phone, email: r.email, address: r.address, idNumber: r.id_number, notes: r.notes, active: r.active });
const mProp    = (r) => ({ id: r.id, ref: r.ref, name: r.name, kind: r.kind, address: r.address, commune: r.commune, quartier: r.quartier, ownerId: r.owner_id, lotsCount: r.lots_count, surface: r.surface_m2, rent: r.rent_amount, mandate: r.mandate_type, status: r.status, notes: r.notes });
const mProduct = (r) => ({ id: r.id, name: r.name, category: r.category, unit: r.unit, stock: Number(r.stock_qty), minQty: Number(r.min_qty), price: Number(r.unit_price), supplier: r.supplier, active: r.active });
const mStockIn = (r) => ({ id: r.id, productId: r.product_id, qty: Number(r.qty), price: Number(r.unit_price), supplier: r.supplier, date: r.entry_date, notes: r.notes, createdBy: r.created_by });
const mRelease = (r) => ({ id: r.id, ref: r.ref, propertyId: r.property_id, releasedTo: r.released_to, releasedBy: r.released_by, purpose: r.purpose, date: r.release_date, zone: r.zone, notes: r.notes, createdAt: Date.parse(r.created_at) });
const mRelLine = (r) => ({ id: r.id, releaseId: r.release_id, productId: r.product_id, qty: Number(r.qty), price: Number(r.unit_price) });
const mQuote   = (r) => ({ id: r.id, ref: r.ref, artisanName: r.artisan_name, trade: r.artisan_trade, phone: r.artisan_phone, propertyId: r.property_id, ownerId: r.owner_id, date: r.quote_date, source: r.source, object: r.object, total: Number(r.total_amount), status: r.status, notes: r.notes, recordedBy: r.recorded_by, createdAt: Date.parse(r.created_at) });
const mQLine   = (r) => ({ id: r.id, quoteId: r.quote_id, label: r.label, qty: Number(r.qty), unit: r.unit, price: Number(r.unit_price), position: r.position });
const mTpl     = (r) => ({ id: r.id, label: r.label, nature: r.nature, deptId: r.dept_id, urgency: r.urgency, estMin: r.est_min, sortOrder: r.sort_order, active: r.active });

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
  const [owners, setOwners] = useState([]);
  const [properties, setProperties] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockEntries, setStockEntries] = useState([]);
  const [releases, setReleases] = useState([]);
  const [releaseLines, setReleaseLines] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [quoteLines, setQuoteLines] = useState([]);
  const [templates, setTemplates] = useState([]);

  const load = useCallback(async () => {
    const [dep, prof, tk, te, at, ch, cm, ms, ow, pr, pd, se, rl, rll, qt, ql, tpl] = await Promise.all([
      supabase.from("departments").select("*").order("created_at"),
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("tasks").select("*"),
      supabase.from("time_entries").select("*"),
      supabase.from("active_timers").select("*"),
      supabase.from("channels").select("*"),
      supabase.from("channel_members").select("*"),
      supabase.from("messages").select("*"),
      supabase.from("owners").select("*").order("full_name"),
      supabase.from("properties").select("*").order("name"),
      supabase.from("products").select("*").order("name"),
      supabase.from("stock_entries").select("*"),
      supabase.from("material_releases").select("*").order("release_date", { ascending: false }),
      supabase.from("material_release_lines").select("*"),
      supabase.from("quotes").select("*").order("quote_date", { ascending: false }),
      supabase.from("quote_lines").select("*").order("position"),
      supabase.from("task_templates").select("*").order("sort_order"),
    ]);
    setDepartments((dep.data || []).map(mDept));
    setMembers((prof.data || []).map(mProfile));
    setTasks((tk.data || []).map(mTask));
    setTimeEntries((te.data || []).map(mEntry));
    setActiveTimers((at.data || []).map(mTimer));
    setChannels((ch.data || []).map(mChannel));
    setChannelMembers((cm.data || []).map(mCM));
    setMessages((ms.data || []).map(mMsg));
    setOwners((ow.data || []).map(mOwner));
    setProperties((pr.data || []).map(mProp));
    setProducts((pd.data || []).map(mProduct));
    setStockEntries((se.data || []).map(mStockIn));
    setReleases((rl.data || []).map(mRelease));
    setReleaseLines((rll.data || []).map(mRelLine));
    setQuotes((qt.data || []).map(mQuote));
    setQuoteLines((ql.data || []).map(mQLine));
    setTemplates((tpl.data || []).map(mTpl));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ---- abonnement temps réel ---- */
  useEffect(() => {
    const upTask = upsertBy("id", mTask)(setTasks), rmTask = removeBy("id")(setTasks);
    const upEntry = upsertBy("id", mEntry)(setTimeEntries), rmEntry = removeBy("id")(setTimeEntries);
    const upTimer = upsertBy("userId", mTimer)(setActiveTimers), rmTimer = removeBy("userId")(setActiveTimers);
    const upProf = upsertBy("id", mProfile)(setMembers), rmProf = removeBy("id")(setMembers);
    const upDept = upsertBy("id", mDept)(setDepartments), rmDept = removeBy("id")(setDepartments);
    const upChan = upsertBy("id", mChannel)(setChannels);
    const upOwner = upsertBy("id", mOwner)(setOwners), rmOwner = removeBy("id")(setOwners);
    const upProp = upsertBy("id", mProp)(setProperties), rmProp = removeBy("id")(setProperties);
    const upProd = upsertBy("id", mProduct)(setProducts), rmProd = removeBy("id")(setProducts);
    const upSE = upsertBy("id", mStockIn)(setStockEntries), rmSE = removeBy("id")(setStockEntries);
    const upRel = upsertBy("id", mRelease)(setReleases), rmRel = removeBy("id")(setReleases);
    const upRL = upsertBy("id", mRelLine)(setReleaseLines), rmRL = removeBy("id")(setReleaseLines);
    const upQ = upsertBy("id", mQuote)(setQuotes), rmQ = removeBy("id")(setQuotes);
    const upQL = upsertBy("id", mQLine)(setQuoteLines), rmQL = removeBy("id")(setQuoteLines);
    const upTpl = upsertBy("id", mTpl)(setTemplates), rmTpl = removeBy("id")(setTemplates);
    const h = (up, rm, key = "id") => (p) => p.eventType === "DELETE" ? rm(p.old[key]) : up(p.new);

    const ch = supabase.channel("kibegnon-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, h(upTask, rmTask))
      .on("postgres_changes", { event: "*", schema: "public", table: "time_entries" }, h(upEntry, rmEntry))
      .on("postgres_changes", { event: "*", schema: "public", table: "active_timers" }, h(upTimer, rmTimer, "user_id"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
        setMessages((prev) => {
          const cleaned = prev.filter((m) => !(String(m.id).startsWith("tmp-") && m.fromId === p.new.from_id && m.text === p.new.body && (m.taskId || null) === (p.new.task_id || null)));
          if (cleaned.some((m) => m.id === p.new.id)) return cleaned;
          return [...cleaned, mMsg(p.new)];
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "channels" }, (p) => p.eventType !== "DELETE" && upChan(p.new))
      .on("postgres_changes", { event: "*", schema: "public", table: "channel_members" }, () => { supabase.from("channel_members").select("*").then(({ data }) => data && setChannelMembers(data.map(mCM))); })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, h(upProf, rmProf))
      .on("postgres_changes", { event: "*", schema: "public", table: "departments" }, h(upDept, rmDept))
      .on("postgres_changes", { event: "*", schema: "public", table: "owners" }, h(upOwner, rmOwner))
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, h(upProp, rmProp))
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, h(upProd, rmProd))
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_entries" }, h(upSE, rmSE))
      .on("postgres_changes", { event: "*", schema: "public", table: "material_releases" }, h(upRel, rmRel))
      .on("postgres_changes", { event: "*", schema: "public", table: "material_release_lines" }, h(upRL, rmRL))
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, h(upQ, rmQ))
      .on("postgres_changes", { event: "*", schema: "public", table: "quote_lines" }, h(upQL, rmQL))
      .on("postgres_changes", { event: "*", schema: "public", table: "task_templates" }, h(upTpl, rmTpl))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  /* ================= ACTIONS : TÂCHES ================= */
  const createTask = async (f) => {
    await supabase.from("tasks").insert({
      title: f.title, description: f.description || "", dept_id: f.deptId || null, assignee_id: f.assigneeId,
      urgency: f.urgency, status: f.status || "a_faire", est_min: f.estMin, week_start: f.weekStart,
      day: f.day ?? null, due_date: f.dueDate || null, created_by: userId,
      property_id: f.propertyId || null, owner_id: f.ownerId || null, nature: f.nature || "autre",
    });
  };
  const updateTask = async (id, patch) => {
    const map = { title: "title", description: "description", deptId: "dept_id", assigneeId: "assignee_id",
      urgency: "urgency", status: "status", estMin: "est_min", weekStart: "week_start", day: "day",
      dueDate: "due_date", propertyId: "property_id", ownerId: "owner_id", nature: "nature" };
    const row = {};
    Object.entries(map).forEach(([k, col]) => { if (k in patch) row[col] = patch[k] === "" ? null : patch[k]; });
    await supabase.from("tasks").update(row).eq("id", id);
  };
  const deleteTask = async (id) => { await supabase.from("tasks").delete().eq("id", id); };

  /* ================= ACTIONS : TEMPS ================= */
  const startTimer = async (taskId) => {
    setActiveTimers((p) => [...p.filter((t) => t.userId !== userId), { userId, taskId, startedAt: Date.now() }]);
    await supabase.from("active_timers").upsert({ user_id: userId, task_id: taskId, started_at: new Date().toISOString() });
  };
  const stopTimer = async () => {
    const mine = activeTimers.find((t) => t.userId === userId);
    if (!mine) return;
    const sec = Math.round((Date.now() - mine.startedAt) / 1000);
    setActiveTimers((p) => p.filter((t) => t.userId !== userId));
    if (sec > 1) {
      await supabase.from("time_entries").insert({ task_id: mine.taskId, user_id: userId, start_at: new Date(mine.startedAt).toISOString(), end_at: new Date().toISOString(), duration_seconds: sec, note: "" });
    }
    await supabase.from("active_timers").delete().eq("user_id", userId);
  };
  const addManualTime = async (taskId, min) => {
    await supabase.from("time_entries").insert({ task_id: taskId, user_id: userId, start_at: new Date(Date.now() - min * 60000).toISOString(), end_at: new Date().toISOString(), duration_seconds: min * 60, note: "saisie manuelle" });
  };
  const deleteEntry = async (id) => { await supabase.from("time_entries").delete().eq("id", id); };

  /* ================= ACTIONS : MESSAGERIE ================= */
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
    setMessages((p) => [...p, tmp]);
    await supabase.from("messages").insert({ channel_id: channelId, from_id: userId, body, task_id: taskId });
    markRead(channelId);
  };
  const markRead = async (channelId) => {
    setChannelMembers((p) => p.map((c) => (c.channelId === channelId && c.userId === userId ? { ...c, lastReadAt: Date.now() } : c)));
    await supabase.rpc("mark_channel_read", { cid: channelId });
  };

  /* ================= ACTIONS : ADMINISTRATION ================= */
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

  /* ================= ACTIONS : PROPRIÉTAIRES & BIENS ================= */
  const saveOwner = async (f) => {
    const row = { full_name: f.name, kind: f.kind, phone: f.phone || "", email: f.email || "",
      address: f.address || "", id_number: f.idNumber || "", notes: f.notes || "", active: f.active !== false };
    if (f.id) { const { error } = await supabase.from("owners").update(row).eq("id", f.id); return { error: error?.message }; }
    const { data, error } = await supabase.from("owners").insert({ ...row, created_by: userId }).select().single();
    if (data) setOwners((p) => p.some((x) => x.id === data.id) ? p : [...p, mOwner(data)]);
    return { error: error?.message, id: data?.id };
  };
  const deleteOwner = async (id) => { const { error } = await supabase.from("owners").delete().eq("id", id); return { error: error?.message }; };

  const saveProperty = async (f) => {
    const row = { ref: f.ref || "", name: f.name, kind: f.kind, address: f.address || "", commune: f.commune || "",
      quartier: f.quartier || "", owner_id: f.ownerId || null, lots_count: Number(f.lotsCount) || 1,
      surface_m2: f.surface ? Number(f.surface) : null, rent_amount: f.rent ? Number(f.rent) : null,
      mandate_type: f.mandate, status: f.status, notes: f.notes || "" };
    if (f.id) { const { error } = await supabase.from("properties").update(row).eq("id", f.id); return { error: error?.message }; }
    const { data, error } = await supabase.from("properties").insert({ ...row, created_by: userId }).select().single();
    if (data) setProperties((p) => p.some((x) => x.id === data.id) ? p : [...p, mProp(data)]);
    return { error: error?.message, id: data?.id };
  };
  const deleteProperty = async (id) => { const { error } = await supabase.from("properties").delete().eq("id", id); return { error: error?.message }; };

  /* ================= ACTIONS : PRODUITS & STOCK ================= */
  const saveProduct = async (f) => {
    const row = { name: f.name, category: f.category, unit: f.unit, min_qty: Number(f.minQty) || 0,
      unit_price: Number(f.price) || 0, supplier: f.supplier || "", active: f.active !== false };
    if (f.id) { const { error } = await supabase.from("products").update(row).eq("id", f.id); return { error: error?.message }; }
    const { data, error } = await supabase.from("products").insert(row).select().single();
    if (data) setProducts((p) => p.some((x) => x.id === data.id) ? p : [...p, mProduct(data)]);
    return { error: error?.message, id: data?.id };
  };
  const deleteProduct = async (id) => { const { error } = await supabase.from("products").delete().eq("id", id); return { error: error?.message }; };

  const addStockEntry = async (f) => {
    const { error } = await supabase.from("stock_entries").insert({
      product_id: f.productId, qty: Number(f.qty), unit_price: Number(f.price) || 0,
      supplier: f.supplier || "", entry_date: f.date, notes: f.notes || "", created_by: userId });
    if (!error) await refreshProducts();
    return { error: error?.message };
  };
  const refreshProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    if (data) setProducts(data.map(mProduct));
  };

  /* ---- Fiche de sortie : en-tête + lignes en une opération ---- */
  const saveRelease = async (f, lines) => {
    let releaseId = f.id;
    const row = { property_id: f.propertyId || null, released_to: f.releasedTo || "", purpose: f.purpose,
      release_date: f.date, zone: f.zone || "", notes: f.notes || "" };
    if (releaseId) {
      const { error } = await supabase.from("material_releases").update(row).eq("id", releaseId);
      if (error) return { error: error.message };
      await supabase.from("material_release_lines").delete().eq("release_id", releaseId);
    } else {
      const { data, error } = await supabase.from("material_releases")
        .insert({ ...row, released_by: userId }).select().single();
      if (error) return { error: error.message };
      releaseId = data.id;
      setReleases((p) => p.some((x) => x.id === data.id) ? p : [mRelease(data), ...p]);
    }
    const payload = lines.filter((l) => l.productId && Number(l.qty) > 0)
      .map((l) => ({ release_id: releaseId, product_id: l.productId, qty: Number(l.qty), unit_price: Number(l.price) || 0 }));
    if (payload.length) {
      const { error } = await supabase.from("material_release_lines").insert(payload);
      if (error) return { error: error.message };
    }
    await Promise.all([refreshProducts(), refreshReleaseLines()]);
    return {};
  };
  const refreshReleaseLines = async () => {
    const { data } = await supabase.from("material_release_lines").select("*");
    if (data) setReleaseLines(data.map(mRelLine));
  };
  const deleteRelease = async (id) => {
    const { error } = await supabase.from("material_releases").delete().eq("id", id);
    if (!error) await Promise.all([refreshProducts(), refreshReleaseLines()]);
    return { error: error?.message };
  };

  /* ================= ACTIONS : DEVIS ARTISANS ================= */
  const saveQuote = async (f, lines) => {
    let quoteId = f.id;
    const row = { artisan_name: f.artisanName, artisan_trade: f.trade || "", artisan_phone: f.phone || "",
      property_id: f.propertyId || null, owner_id: f.ownerId || null, quote_date: f.date,
      source: f.source, object: f.object || "", status: f.status, notes: f.notes || "" };
    if (quoteId) {
      const { error } = await supabase.from("quotes").update(row).eq("id", quoteId);
      if (error) return { error: error.message };
      await supabase.from("quote_lines").delete().eq("quote_id", quoteId);
    } else {
      const { data, error } = await supabase.from("quotes")
        .insert({ ...row, recorded_by: userId }).select().single();
      if (error) return { error: error.message };
      quoteId = data.id;
      setQuotes((p) => p.some((x) => x.id === data.id) ? p : [mQuote(data), ...p]);
    }
    const payload = lines.filter((l) => (l.label || "").trim())
      .map((l, i) => ({ quote_id: quoteId, label: l.label, qty: Number(l.qty) || 1, unit: l.unit || "u",
        unit_price: Number(l.price) || 0, position: i }));
    if (payload.length) {
      const { error } = await supabase.from("quote_lines").insert(payload);
      if (error) return { error: error.message };
    }
    await refreshQuotes();
    return { error: null, id: quoteId };
  };
  const refreshQuotes = async () => {
    const [q, l] = await Promise.all([
      supabase.from("quotes").select("*").order("quote_date", { ascending: false }),
      supabase.from("quote_lines").select("*").order("position"),
    ]);
    if (q.data) setQuotes(q.data.map(mQuote));
    if (l.data) setQuoteLines(l.data.map(mQLine));
  };
  const setQuoteStatus = async (id, status) => { await supabase.from("quotes").update({ status }).eq("id", id); };
  const deleteQuote = async (id) => {
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (!error) await refreshQuotes();
    return { error: error?.message };
  };

  return {
    loading, departments, members, tasks, timeEntries, activeTimers, channels, channelMembers, messages,
    owners, properties, products, stockEntries, releases, releaseLines, quotes, quoteLines, templates,
    actions: {
      createTask, updateTask, deleteTask, startTimer, stopTimer, addManualTime, deleteEntry,
      ensureDm, sendMessage, markRead, saveDept, deleteDept, updateProfile, adminUsers,
      saveOwner, deleteOwner, saveProperty, deleteProperty,
      saveProduct, deleteProduct, addStockEntry, saveRelease, deleteRelease,
      saveQuote, setQuoteStatus, deleteQuote, reload: load,
    },
  };
}
