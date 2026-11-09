"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion";
import { useFxSound } from "./use-fx-sound";
import "./Friends.css";
type Friend = { username: string; name: string; avatarUrl?: string; online: boolean };
type Data = { self: string; friends: Friend[]; requests: string[]; notices: { id: string; username: string; at: number; kind?: "private-room" }[]; syncPending?: boolean };
export default function Friends() {
  const [data, setData] = useState<Data | null>(null), [open, setOpen] = useState(false), [page, setPage] = useState(0);
  const [username, setUsername] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState(""), [working, setWorking] = useState(false);
  const client = useRef(""), sound = useFxSound(), reduced = useReducedMotion();
  const launcher = useRef<HTMLButtonElement>(null), input = useRef<HTMLInputElement>(null);
  const update = (next: Data) => {
    // Keep delivered notifications read across reloads; a recipient who was offline
    // can still see a PrivateRoom entry from the last 24 hours on next visit.
    const seenKey = `userfx:friend-notice-seen:${next.self}`;
    let lastSeenAt = 0;
    try { lastSeenAt = Number(localStorage.getItem(seenKey) || "0") || 0; } catch {}
    const entries = next.notices.filter((event) =>
      event.at > lastSeenAt &&
      event.at > Date.now() - (next.self === "user18fx" ? 86400000 : 60000) &&
      (next.self !== "user18fx" || event.kind === "private-room")
    );
    if (entries.length) {
      const latest = entries.sort((a, b) => b.at - a.at)[0];
      setNotice(latest.kind === "private-room"
        ? `@${latest.username} se ha conectado a PrivateRoom`
        : `@${latest.username} ha entrado a UserFX`);
      sound.play("message");
    }
    // A persisted timestamp avoids the original bug where first-load alerts
    // disappear and prevents showing the same alert on each poll.
    const newest = Math.max(lastSeenAt, ...next.notices.map((event) => event.at));
    if (newest > lastSeenAt) {
      try { localStorage.setItem(seenKey, String(newest)); } catch {}
    }
    setData(next);
  };
  // One heartbeat for the entire website, including the landing, with per-tab leases.
  useEffect(() => {
    client.current = crypto.randomUUID(); const controller = new AbortController(); let active = true, pending = false, retryAfter = 0;
    const url = `/api/room-live?op=contacts&client=${client.current}`;
    const leave = () => { void fetch(url, { method: "DELETE", credentials: "same-origin", keepalive: true }).catch(() => {}); };
    const refresh = async () => {
      if (!active || document.hidden || pending || Date.now() < retryAfter) return; pending = true;
      try {
        const response = await fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "heartbeat", inPrivateRoom: /^#\/private-room(?:[/?]|$)/.test(window.location.hash) }), signal: controller.signal });
        if (response.ok) { retryAfter = 0; const next = await response.json(); if (active) update(next); } else if (response.status === 429 || response.status === 503) { retryAfter = Date.now() + 60000; }
        else if (response.status === 401 || response.status === 403) { if (active) setData(null); }
      } catch {} finally { pending = false; }
    };
    const visibility = () => { if (document.hidden) leave(); else void refresh(); };
    void refresh(); const timer = setInterval(() => void refresh(), 30000);
    window.addEventListener("pagehide", leave); window.addEventListener("hashchange", refresh); window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", visibility);
    return () => { active = false; controller.abort(); clearInterval(timer); leave(); window.removeEventListener("pagehide", leave); window.removeEventListener("hashchange", refresh); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", visibility); };
  }, [sound.play]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 8000); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  async function act(action: string, target: string) {
    setWorking(true); setError("");
    try {
      const response = await fetch(`/api/room-live?op=contacts&client=${client.current}`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, username: target }) });
      const next = await response.json(); if (!response.ok) throw new Error(next.error || "No se pudo completar."); update(next);
      if (action === "request") { setUsername(""); setNotice("Solicitud de amistad enviada."); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Intenta de nuevo."); } finally { setWorking(false); }
  }
  if (!data) return null;
  const items = [...data.requests.map((user) => ({ username: user, name: `@${user}`, online: false, request: true })), ...data.friends.map((friend) => ({ ...friend, request: false }))];
  const total = Math.max(1, Math.ceil(items.length / 6)), current = Math.min(page, total - 1);
  const close = () => { setOpen(false); launcher.current?.focus(); };
  return <div className="fx-friends">
    {notice && <div className="fx-friend-notice" role="status">{notice}</div>}
    <button ref={launcher} className="fx-friends-launch" type="button" aria-expanded={open} aria-controls="fx-friends-panel" onClick={() => setOpen(!open)}><i aria-hidden="true" />AMIGOS <b>{data.friends.filter((friend) => friend.online).length}</b>{data.requests.length > 0 && <span>+{data.requests.length}</span>}</button>
    <AnimatePresence>{open && <motion.section id="fx-friends-panel" className="fx-friends-panel" aria-label="Amigos y solicitudes" initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }} transition={{ duration: reduced ? 0 : .25, ease: EASE }} onKeyDown={(event) => { if (event.key === "Escape") close(); }}>
      <header><div><small>USER FX · CONNECTIONS</small><h2>Tus amigos</h2></div><button type="button" aria-label="Cerrar amigos" onClick={close}>×</button></header>
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); void act("request", username); }}><input ref={input} aria-label="Usuario para agregar" placeholder="@username" required pattern="@?[A-Za-z0-9_]{3,32}" maxLength={33} value={username} onChange={(event) => setUsername(event.target.value)} /><button disabled={working} type="submit">Agregar</button></form>
      {error && <p role="alert">{error}</p>}{data.syncPending && <p role="status">Contactos del bot pendientes de sincronizar.</p>}
      <ul>{items.slice(current * 6, current * 6 + 6).map((friend) => <li key={`${friend.request}-${friend.username}`}><i className={friend.online ? "is-online" : ""} aria-hidden="true" /><div><strong>{friend.name}</strong><small>{friend.request ? "Quiere agregarte" : friend.online ? "Online · en UserFX" : "Offline"}</small></div>{friend.request && <><button disabled={working} type="button" onClick={() => void act("accept", friend.username)}>Aceptar</button><button disabled={working} type="button" aria-label={`Rechazar @${friend.username}`} onClick={() => void act("reject", friend.username)}>×</button></>}</li>)}</ul>
      {!items.length && <p>Agrega un usuario para conectar.</p>}
      <footer><button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>←</button><span>{current + 1} / {total}</span><button type="button" disabled={current + 1 >= total} onClick={() => setPage(current + 1)}>→</button></footer>
    </motion.section>}</AnimatePresence>
  </div>;
}
