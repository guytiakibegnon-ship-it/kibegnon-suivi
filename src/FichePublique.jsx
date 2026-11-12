/* ══════════════════════════════════════════════════════════════════════
   Formulaire public de renseignements (ouvert par QR code, sans connexion).
   Adresse : <site>/?fiche=locataire  ou  <site>/?fiche=proprietaire
   La fiche est déposée par la fonction kb_deposer_fiche : le public ne peut
   rien lire dans la base, seulement envoyer sa propre fiche.
   ══════════════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { supabase } from "./supabaseClient";
import { FICHES, CONSENTEMENT, validerFiche } from "./fiches-def.js";

const C = { ink: "#0F2742", red: "#D81F26", line: "#D5DBE3", muted: "#5B6573", bg: "#F4F6F8" };
const champ = { width: "100%", padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 16, background: "#fff", color: "#111827" };

export default function FichePublique({ kind }) {
  const def = FICHES[kind];
  const [d, setD] = useState({});
  const [err, setErr] = useState({});
  const [etat, setEtat] = useState("saisie");          // saisie | envoi | envoyee
  const [message, setMessage] = useState("");
  const [piege, setPiege] = useState("");               // champ invisible : rempli seulement par les robots
  if (!def) return (
    <Cadre><p style={{ fontSize: 16 }}>Ce lien n'est pas valide. Merci de scanner à nouveau le QR code remis par l'agence.</p></Cadre>
  );
  const set = (k, v) => { setD((x) => ({ ...x, [k]: v })); if (err[k]) setErr((x) => ({ ...x, [k]: undefined })); };
  const envoyer = async (ev) => {
    ev.preventDefault();
    const e = validerFiche(kind, d);
    setErr(e);
    if (Object.keys(e).length) { setMessage("Merci de compléter les renseignements signalés en rouge."); return; }
    if (piege) { setEtat("envoyee"); return; }
    setEtat("envoi"); setMessage("");
    const propre = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]).filter(([, v]) => v !== "" && v !== undefined && v !== null));
    const { error } = await supabase.rpc("kb_deposer_fiche", { p_kind: kind, p_data: { ...propre, consentement: true } });
    if (error) { setEtat("saisie"); setMessage(/kb_deposer_fiche|schema cache|function/i.test(error.message) ? "Le formulaire n'est pas encore en service. Merci de contacter l'agence." : `L'envoi n'a pas abouti : ${error.message}`); return; }
    setEtat("envoyee");
  };
  if (etat === "envoyee") return (
    <Cadre>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: C.ink, margin: "0 0 8px" }}>Merci, votre fiche est bien arrivée.</h1>
      <p style={{ fontSize: 16, lineHeight: 1.5 }}>L'Entreprise Kibegnon l'a reçue et vous contactera si un complément est nécessaire. Vous pouvez fermer cette page.</p>
    </Cadre>
  );
  return (
    <Cadre>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: C.ink, margin: "0 0 6px" }}>{def.titre}</h1>
      <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.5, margin: "0 0 4px" }}>{def.intro}</p>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 16px" }}>Les renseignements marqués d'une étoile (*) sont nécessaires. Le reste peut être complété plus tard avec l'agence.</p>
      <form onSubmit={envoyer} noValidate>
        {def.sections.map((s) => (
          <fieldset key={s.titre} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px 4px", margin: "0 0 14px", background: "#fff" }}>
            <legend style={{ padding: "0 6px", fontWeight: 700, color: C.ink, fontSize: 15 }}>{s.titre}</legend>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0 14px" }}>
              {s.champs.map((c) => (
                <label key={c.k} style={{ display: "block", marginBottom: 12, gridColumn: c.large ? "1 / -1" : "auto" }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{c.label}{c.requis ? " *" : ""}</span>
                  {c.type === "select" ? (
                    <select style={champ} value={d[c.k] || ""} onChange={(e) => set(c.k, e.target.value)}>
                      <option value="">— choisir —</option>{c.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : c.type === "textarea" ? (
                    <textarea rows={3} style={champ} value={d[c.k] || ""} onChange={(e) => set(c.k, e.target.value)} maxLength={1500} />
                  ) : (
                    <input style={{ ...champ, borderColor: err[c.k] ? C.red : C.line }} type={c.type === "number" ? "text" : c.type || "text"} inputMode={c.type === "number" ? "numeric" : c.type === "tel" ? "tel" : undefined}
                      autoComplete={c.k === "email" ? "email" : c.k === "telephone" ? "tel" : c.k === "nom" ? "name" : "off"} value={d[c.k] || ""} maxLength={200}
                      onChange={(e) => set(c.k, c.type === "number" ? e.target.value.replace(/[^\d]/g, "") : e.target.value)} />
                  )}
                  {c.aide && !err[c.k] && <span style={{ display: "block", fontSize: 12.5, color: C.muted, marginTop: 3 }}>{c.aide}</span>}
                  {err[c.k] && <span role="alert" style={{ display: "block", fontSize: 13, color: C.red, marginTop: 3 }}>{err[c.k]}</span>}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={piege} onChange={(e) => setPiege(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} name="site" />
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.45, margin: "4px 0 6px" }}>
          <input type="checkbox" checked={d.consentement === true} onChange={(e) => set("consentement", e.target.checked)} style={{ width: 20, height: 20, marginTop: 2, flex: "none" }} />
          <span>{CONSENTEMENT}</span>
        </label>
        {err.consentement && <p role="alert" style={{ color: C.red, fontSize: 13, margin: "0 0 8px" }}>{err.consentement}</p>}
        {message && <p role="alert" style={{ color: C.red, fontSize: 14, margin: "8px 0" }}>{message}</p>}
        <button type="submit" disabled={etat === "envoi"} style={{ width: "100%", padding: "13px 16px", borderRadius: 12, border: "none", background: C.red, color: "#fff", fontSize: 16, fontWeight: 700, marginTop: 8, opacity: etat === "envoi" ? 0.6 : 1 }}>
          {etat === "envoi" ? "Envoi en cours…" : "Envoyer ma fiche"}
        </button>
      </form>
    </Cadre>
  );
}

function Cadre({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "16px 12px 40px", color: "#111827", fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <img src="/logo.png" alt="Entreprise Kibegnon" style={{ height: 44, width: "auto", background: "#fff", borderRadius: 8, padding: 4 }} />
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.35 }}>
            <strong style={{ color: C.ink, fontSize: 15 }}>ENTREPRISE KIBEGNON</strong><br />Agence immobilière agréée — Cocody, Abidjan
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
