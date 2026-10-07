import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ACCESS_LEVELS, benefitDescription } from "../../lib/admin-benefits.js";
import { Avatar, Icon } from "./RoomFX/shared";
import "./PR-AdminMode.css";

type Scope = "membership" | "myroom" | "stage" | "gallery" | "buzon" | "profiles" | "camera" | "chat";
type Prefix = "SPCL" | "VIPX" | "PRX0" | "BSIC";
type Status = { ownerEligible: boolean; mode: "user" | "admin"; email?: string; linked?: boolean; googleEnabled?: boolean };
type Member = { username: string; name: string; avatarUrl?: string; active: boolean; grants: Partial<Record<Scope, { prefix: Prefix; expiresAt: string | null }>> };
const LABELS: Record<Scope, string> = { membership: "Membresía", myroom: "MyRoom", stage: "Stage", gallery: "Gallery", buzon: "Buzón", profiles: "Perfiles", camera: "OnCam", chat: "Chat" };
const initial: Status = { ownerEligible: false, mode: "user" };
const AdminContext = createContext<Status & { revealed: boolean; revealSwitch: () => boolean; requestFeature: (scope: Scope) => boolean; login: () => void; userMode: () => Promise<void> }>({ ...initial, revealed: false, revealSwitch: () => false, requestFeature: (_scope: Scope) => false, login: () => {}, userMode: async () => {} });
export const useAdminMode = () => useContext(AdminContext);
async function request<T>(op: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/admin-runtime?op=${op}`, { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", signal,
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || "No se pudo completar la acción."), { status: response.status });
  return data;
}

export function AdminModeProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(initial);
  const [revealed, setRevealed] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scope, setScope] = useState<Scope | null>(null);
  const [notice, setNotice] = useState("");
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++revision.current;
    try { const next = await request<Status>("admin-session"); if (current === revision.current) setStatus(next); }
    catch { if (current === revision.current) setStatus(initial); }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60000);
    window.addEventListener("hashchange", refresh);
    window.addEventListener("focus", refresh);
    const params = new URLSearchParams(window.location.search);
    if (params.has("admin")) {
      setRevealed(true);
      if (params.get("admin") === "error") setNotice("No se completó Google. Vuelve a iniciar sesión.");
      params.delete("admin");
      const search = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`);
    }
    return () => { revision.current++; clearInterval(timer); window.removeEventListener("hashchange", refresh); window.removeEventListener("focus", refresh); };
  }, [refresh]);
  useEffect(() => { if (status.mode !== "admin") setScope(null); }, [status.mode]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 6000); return () => clearTimeout(timer); }, [notice]);
  const userMode = useCallback(async () => {
    try { await request("admin-user-mode", {}); revision.current++; setStatus((current) => ({ ...current, mode: "user" })); setScope(null); }
    catch (error) { setNotice((error as Error).message); }
  }, []);
  const requestFeature = useCallback((feature: Scope) => {
    if (!status.ownerEligible || status.mode !== "admin") return false;
    setScope(feature); return true;
  }, [status.ownerEligible, status.mode]);
  const expired = useCallback(() => { revision.current++; setStatus((current) => ({ ...current, mode: "user" })); setScope(null); setLoginOpen(true); }, []);
  function revealSwitch() { if (!status.ownerEligible) return false; setRevealed(true); return true; }
  return <AdminContext.Provider value={{ ...status, revealed, revealSwitch, requestFeature, login: () => setLoginOpen(true), userMode }}>
    {children}
    {notice && <div className="pvr-admin-toast" role="status">{notice}</div>}
    {loginOpen && status.ownerEligible && <AdminLogin status={status} onClose={() => setLoginOpen(false)} onComplete={(next) => { revision.current++; setStatus((current) => ({ ...current, ...next })); setLoginOpen(false); setRevealed(true); }} />}
    {scope && status.mode === "admin" && <AdminBenefits scope={scope} onClose={() => setScope(null)} onExpired={expired} />}
  </AdminContext.Provider>;
}
export function AdminModeSwitch() {
  const admin = useAdminMode();
  if (!admin.ownerEligible || !admin.revealed) return null;
  return <div className="pvr-admin-switch" role="group" aria-label="Modo de plataforma">
    <button type="button" aria-pressed={admin.mode === "user"} onClick={() => { if (admin.mode !== "user") void admin.userMode(); }}>USER</button>
    <button type="button" aria-pressed={admin.mode === "admin"} onClick={() => { if (admin.mode !== "admin") admin.login(); }}><Icon name="shield" size={12} />ADMIN</button>
  </div>;
}
function AdminDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const previous = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => { ref.current?.showModal(); return () => previous.current?.focus(); }, []);
  return <dialog ref={ref} className="pvr-admin-dialog" aria-labelledby="pvr-admin-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); } }}>
    <header><span>USER FX · ADMIN</span><button type="button" aria-label="Cerrar" onClick={onClose}><Icon name="close" /></button></header>
    <h2 id="pvr-admin-title">{title}</h2>
    {children}
  </dialog>;
}
function AdminLogin({ status, onClose, onComplete }: { status: Status; onClose: () => void; onComplete: (status: Status) => void }) {
  const [email, setEmail] = useState(status.email || "");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setWorking(true); setError("");
    try {
      const next = await request<Status & { confirmationRequired?: boolean }>(signup ? "admin-signup" : "admin-login", { email, password });
      setPassword("");
      if (next.confirmationRequired) { setConfirmation(true); setSignup(false); } else onComplete(next);
    } catch (cause) { setError((cause as Error).message); } finally { setWorking(false); }
  }
  async function google() {
    setWorking(true); setError("");
    try { const data = await request<{ url: string }>("admin-google", {}); window.location.assign(data.url); }
    catch (cause) { setError((cause as Error).message); setWorking(false); }
  }
  return <AdminDialog title={signup ? "Crear tu acceso Admin" : "Iniciar sesión como Admin"} onClose={onClose}>
    <p className="pvr-admin-caption">@User18Fx · Tu plataforma, tus controles.</p>
    <form onSubmit={submit}>
      <label>Correo<input autoFocus type="email" autoComplete="username" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Contraseña<input type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 12 : 1} maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {confirmation && <p className="pvr-admin-success" role="status">Revisa tu correo, confirma el acceso y vuelve a iniciar sesión.</p>}
      {error && <p className="pvr-admin-error" role="alert">{error}</p>}
      <button className="pvr-admin-primary" disabled={working}>{working ? "VERIFICANDO…" : signup ? "CREAR ACCESO" : "ENTRAR COMO ADMIN"}</button>
    </form>
    <button type="button" className="pvr-admin-google" disabled={working || !status.googleEnabled} onClick={() => void google()}><span aria-hidden="true">G</span> Continuar con Google</button>
    {!status.googleEnabled && <p className="pvr-admin-caption">Google pendiente de activación.</p>}
    {!status.linked && <button type="button" className="pvr-admin-text" disabled={working} onClick={() => { setSignup((value) => !value); setError(""); }}>{signup ? "Ya tengo acceso · Iniciar sesión" : "Primera vez · Crear acceso"}</button>}
  </AdminDialog>;
}
function AdminBenefits({ scope, onClose, onExpired }: { scope: Scope; onClose: () => void; onExpired: () => void }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [prefix, setPrefix] = useState<Prefix | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const normalized = query.trim().replace(/^@/, "");
    setUsers([]); setError("");
    if (!/^[A-Za-z0-9_]{3,32}$/.test(normalized)) { setLoading(false); return; }
    const controller = new AbortController(); setLoading(true);
    const timer = window.setTimeout(() => {
      request<{ users: Member[] }>(`admin-users&q=${encodeURIComponent(normalized)}`, undefined, controller.signal)
        .then((data) => setUsers(data.users)).catch((cause) => { if (!controller.signal.aborted) { if (cause.status === 401) onExpired(); else setError(cause.message); } })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, onExpired]);
  async function save() {
    if (!selected || !prefix || saving) return;
    setSaving(true); setError("");
    try { await request("admin-grant", { username: selected.username, scope, prefix }); setSaved(true); window.dispatchEvent(new Event("userfx-benefits-updated")); }
    catch (cause) { if ((cause as { status?: number }).status === 401) onExpired(); else setError((cause as Error).message); }
    finally { setSaving(false); }
  }
  const level = prefix ? ACCESS_LEVELS[prefix] : null;
  return <AdminDialog title={`Beneficios · ${LABELS[scope]}`} onClose={onClose}>
    {!selected ? <>
      <label className="pvr-admin-search">Buscar usuario<div><span>@</span><input autoFocus type="search" autoComplete="off" maxLength={33} placeholder="usuario" value={query} onChange={(event) => setQuery(event.target.value)} /></div></label>
      <div className="pvr-admin-users" aria-live="polite">
        {loading ? <p>Buscando…</p> : users.map((member) => <button type="button" key={member.username} disabled={!member.active} onClick={() => { setSelected(member); const grant = member.grants[scope]; setPrefix(grant && (grant.expiresAt === null || Date.parse(grant.expiresAt) > Date.now()) ? grant.prefix : null); }}>
          <Avatar name={member.name} src={member.avatarUrl} /><span><strong>{member.name}</strong><small>@{member.username}{!member.active ? " · identidad inactiva" : ""}</small></span><Icon name="arrow" size={16} />
        </button>)}
        {!loading && query.replace(/^@/, "").length >= 3 && !users.length && !error && <p>No hay coincidencias. Busca su usuario de Telegram.</p>}
        {!query && <p>Escribe al menos tres letras para encontrar un usuario.</p>}
      </div>
    </> : <>
      <div className="pvr-admin-selected"><Avatar name={selected.name} src={selected.avatarUrl} /><span><strong>{selected.name}</strong><small>@{selected.username}</small></span><button type="button" disabled={saving} onClick={() => { setSelected(null); setPrefix(null); setSaved(false); }}>Cambiar</button></div>
      <div className="pvr-admin-levels" role="group" aria-label="Prefijo y beneficios">
        {(["SPCL", "VIPX", "PRX0", "BSIC"] as Prefix[]).map((value) => <button key={value} type="button" className={`pvr-admin-level pvr-admin-level--${value.toLowerCase()}`} aria-label={`${ACCESS_LEVELS[value].label} · ${value}`} aria-pressed={prefix === value} disabled={saving} onClick={() => { setPrefix(value); setSaved(false); }}>
          <span className="pvr-admin-orb" aria-hidden="true"><PrefixIcon prefix={value} /></span><strong>{value}</strong>
        </button>)}
      </div>
      <div className="pvr-admin-benefit-summary" aria-live="polite"><strong>{prefix ? `${LABELS[scope]} · ${prefix}` : "Elige un prefijo"}</strong><p>{prefix ? benefitDescription(prefix, scope) : "Selecciona el nivel que quieres asignar."}</p>{level && <small>{level.days ? `${level.duration} desde la asignación` : level.duration}</small>}</div>
      {scope === "membership" && <p className="pvr-admin-caption">Las asignaciones de cada sección prevalecen sobre la membresía.</p>}
      {saved && <p className="pvr-admin-success" role="status"><Icon name="check" size={16} /> Beneficios guardados para @{selected.username}.</p>}
      <button type="button" className="pvr-admin-primary" disabled={!prefix || saving || saved} onClick={() => void save()}>{saving ? "GUARDANDO…" : saved ? "GUARDADO" : "GUARDAR BENEFICIOS"}</button>
    </>}
    {error && <p className="pvr-admin-error" role="alert">{error}</p>}
  </AdminDialog>;
}
function PrefixIcon({ prefix }: { prefix: Prefix }) {
  if (prefix === "SPCL") return <svg viewBox="0 0 36 24"><path d="m18 0 8 12 10-8-4 20H4L0 4l10 8 8-12z" /></svg>;
  if (prefix === "VIPX") return <svg viewBox="0 0 44 36" fill="none">
    <defs><linearGradient id="pvr-admin-gold" x1="5" y1="5" x2="36" y2="33" gradientUnits="userSpaceOnUse"><stop stopColor="#fffacb" /><stop offset=".36" stopColor="#ffe887" /><stop offset=".68" stopColor="#cf8109" /><stop offset="1" stopColor="#ffdf67" /></linearGradient></defs>
    <path d="m5 27-3-18 11 10L22 3l9 16L42 9l-3 18v6H5z" fill="url(#pvr-admin-gold)" stroke="#915007" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M5 27h34M8 31h28M22 7v13" stroke="#fff7b8" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="22" cy="24" r="2.5" fill="#d53935" stroke="#fff3a9" /><circle cx="11" cy="24" r="1.5" fill="#50b8a5" /><circle cx="33" cy="24" r="1.5" fill="#50b8a5" />
  </svg>;
  return <img src={prefix === "PRX0" ? "/assets/iconos/fuego.png" : "/assets/iconos/basic.png"} alt="" draggable={false} />;
}
