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

/* ---- Formatage monétaire FCFA ---- */
export const fcfa = (n) => {
  const v = Number(n || 0);
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " F";
};
export const fcfaLong = (n) => {
  const v = Number(n || 0);
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " FCFA";
};
export const qty = (n) => {
  const v = Number(n || 0);
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
};
export const monthIso = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
};
export const monthLabel = (iso) =>
  new Date(iso + "-01T00:00:00").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });

/* ---- Montant en toutes lettres (français) ---- */
const UNITS = ["zéro","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix",
  "onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"];
const TENS = ["","","vingt","trente","quarante","cinquante","soixante","soixante","quatre-vingt","quatre-vingt"];

function below100(n) {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10), u = n % 10;
  if (t === 7 || t === 9) {
    if (t === 7 && u === 1) return "soixante-et-onze";
    return TENS[t] + "-" + UNITS[10 + u];
  }
  if (u === 0) return TENS[t] + (t === 8 ? "s" : "");
  if (u === 1 && t !== 8) return TENS[t] + "-et-un";
  return TENS[t] + "-" + UNITS[u];
}

/* followed = true si un mot d'échelle (mille/million) suit : "cent" reste invariable */
function below1000(n, followed) {
  if (n < 100) return below100(n);
  const c = Math.floor(n / 100), r = n % 100;
  const head = c === 1 ? "cent" : UNITS[c] + " cent";
  if (r === 0) return head + (c > 1 && !followed ? "s" : "");
  return head + " " + below100(r);
}

export function amountInWords(amount) {
  let n = Math.floor(Math.abs(Number(amount) || 0));
  if (n === 0) return "zéro franc CFA";
  const parts = [];
  const scales = [{ v: 1e9, s: "milliard" }, { v: 1e6, s: "million" }, { v: 1e3, s: "mille" }];
  for (const { v, s } of scales) {
    const q = Math.floor(n / v);
    if (q > 0) {
      if (s === "mille") parts.push(q === 1 ? "mille" : below1000(q, true) + " mille");
      else parts.push(below1000(q, true) + " " + s + (q > 1 ? "s" : ""));
      n -= q * v;
    }
  }
  if (n > 0) parts.push(below1000(n, false));
  const w = parts.join(" ");
  return w + (w.endsWith("franc") ? "" : "") + " francs CFA";
}
