export const getMonday = (d) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
};
export const isoDate = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const mondayIso = (d) => isoDate(getMonday(d));
export const fr = (d, opt) => new Date(d).toLocaleDateString("fr-FR", opt);
export const weekLabel = (iso) => {
  const m = new Date(iso + "T00:00:00");
  return `${fr(m, { day: "numeric", month: "short" })} – ${fr(addDays(m, 5), { day: "numeric", month: "short", year: "numeric" })}`;
};
export const fmtDur = (sec) => {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
  if (m > 0) return `${m}m${String(s).padStart(2, "0")}`;
  return `${s}s`;
};
export const fmtEst = (min) => {
  if (!min) return "—";
  if (min >= 60) { const h = Math.floor(min / 60), m = min % 60; return m ? `${h}h${m}` : `${h}h`; }
  return `${min}min`;
};
export const fmtTime = (ts) => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
