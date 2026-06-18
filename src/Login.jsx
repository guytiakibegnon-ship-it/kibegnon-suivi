import { useState } from "react";
import { KeyRound, Eye, EyeOff, AtSign, Lock, AlertTriangle } from "lucide-react";
import { supabase, AUTH_DOMAIN } from "./supabaseClient";
import { LOGO } from "./constants";

const inputCls = "w-full px-3 py-2 rounded-lg border text-sm outline-none";
const inputStyle = { borderColor: "var(--line)" };

export default function Login() {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const submit = async () => {
    if (!u || !p) return;
    setBusy(true); setErr("");
    const email = `${u.trim().toLowerCase().replace(/\s/g, "")}@${AUTH_DOMAIN}`;
    const { error } = await supabase.auth.signInWithPassword({ email, password: p });
    setBusy(false);
    if (error) setErr("Identifiant ou mot de passe incorrect.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--ink)" }}>
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-6 pt-7 pb-5 text-center border-b" style={{ borderColor: "var(--line)" }}>
            <img src={LOGO} alt="Entreprise Kibegnon" className="h-16 w-auto mx-auto mb-3" />
            <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--ink)" }}>Suivi d'équipe</h1>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Connectez-vous à votre espace</p>
          </div>
          <div className="p-6">
            <label className="block mb-3">
              <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Identifiant</span>
              <div className="relative">
                <AtSign size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input className={inputCls + " pl-9"} style={inputStyle} value={u} autoFocus
                  onChange={(e) => { setU(e.target.value); setErr(""); }}
                  onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="votre identifiant" />
              </div>
            </label>
            <label className="block mb-3">
              <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Mot de passe</span>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input type={showPwd ? "text" : "password"} className={inputCls + " pl-9 pr-9"} style={inputStyle} value={p}
                  onChange={(e) => { setP(e.target.value); setErr(""); }}
                  onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••" />
                <button onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-2.5 text-slate-400">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            {err && <p className="text-xs text-red-600 mb-3 flex items-center gap-1"><AlertTriangle size={13} /> {err}</p>}
            <button onClick={submit} disabled={!u || !p || busy} className="kb-btn kb-btn-primary w-full justify-center disabled:opacity-40">
              <KeyRound size={16} /> {busy ? "Connexion…" : "Se connecter"}
            </button>
          </div>
        </div>
        <p className="text-center text-xs mt-4" style={{ color: "#7E8CA0" }}>Entreprise Kibegnon · Espace interne sécurisé</p>
      </div>
    </div>
  );
}
