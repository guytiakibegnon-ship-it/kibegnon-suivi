import { X } from "lucide-react";

export const inputCls = "w-full px-3 py-2 rounded-lg border text-sm outline-none";
export const inputStyle = { borderColor: "var(--line)" };

export const Avatar = ({ member, size = 34 }) => {
  const initials = (member?.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return <div style={{ width: size, height: size, background: member?.color || "#94A3B8", fontSize: size * 0.38 }}
    className="rounded-full flex items-center justify-center text-white font-semibold shrink-0">{initials}</div>;
};

export const Chip = ({ color, bg, children, dot }) => (
  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
    style={{ color, background: bg || "transparent", border: bg ? "none" : `1px solid ${color}33` }}>
    {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}{children}
  </span>
);

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(15,23,42,.55)" }} onClick={onClose}>
      <div className={`bg-white w-full ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"} sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10" style={{ borderColor: "var(--line)" }}>
          <h3 className="font-semibold" style={{ color: "var(--ink)" }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export const Field = ({ label, children, hint }) => (
  <label className="block mb-3">
    <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>{label}</span>
    {children}
    {hint && <span className="block text-[11px] mt-1" style={{ color: "var(--muted)" }}>{hint}</span>}
  </label>
);

export const StatCard = ({ icon: Icon, label, value, sub, tint = "var(--brass)" }) => (
  <div className="bg-white rounded-xl border p-4" style={{ borderColor: "var(--line)" }}>
    <div className="flex items-center gap-2 mb-2">
      <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: tint + "1A", color: tint }}><Icon size={15} /></span>
      <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</span>
    </div>
    <p className="text-2xl font-bold" style={{ color: "var(--ink)" }}>{value}</p>
    {sub && <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{sub}</p>}
  </div>
);

export const EmptyState = ({ icon: Icon, title, sub, action }) => (
  <div className="text-center py-12">
    {Icon && <Icon size={30} className="mx-auto mb-3" style={{ color: "#C7CDD6" }} />}
    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{title}</p>
    {sub && <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{sub}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const SectionCard = ({ title, icon: Icon, action, children, pad = true }) => (
  <section className="bg-white rounded-xl border mb-4" style={{ borderColor: "var(--line)" }}>
    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}>
      <h2 className="font-semibold flex items-center gap-2 text-sm">
        {Icon && <Icon size={16} style={{ color: "var(--brass)" }} />}{title}
      </h2>
      {action}
    </div>
    <div className={pad ? "p-4" : ""}>{children}</div>
  </section>
);
