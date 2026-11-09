"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { EASE } from "@/lib/motion";

const ACCENT = "#6fb8c8";
const COLUMNS = [
  { title: "Spaces", links: [
    { label: "MyRoom", href: "#/myroom" },
    { label: "Stage", href: "#/stage" },
    { label: "Gallery", href: "#/gallery" },
    { label: "Buzón", href: "#/buzon" },
  ] },
  { title: "Access", links: [
    { label: "Get my code", href: "#/get-code" },
    { label: "Enter a code", href: "#/enter-code" },
    { label: "Compare access", href: "#/compare" },
  ] },
  { title: "Support", links: [
    { label: "Questions", href: "#/faq" },
    { label: "Contact", href: "#/contact" },
    { label: "Privacy", href: "/privacy" },
  ] },
] as const;
type TelegramUser = { id: string; first_name: string; username: string };
type TelegramPayload = TelegramUser & { auth_date: number; hash: string; last_name?: string; photo_url?: string };
type TelegramWindow = Window & { userFxTelegramAuth?: (data: TelegramPayload) => void };

function TelegramSignIn() {
  const mount = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/telegram-auth", { cache: "no-store", credentials: "same-origin" })
      .then(r => r.json())
      .then(data => {
        if (!active) return;
        setConfigured(Boolean(data.configured));
        if (data.authenticated && data.user) setUser(data.user as TelegramUser);
      })
      .catch(() => { if (active) setError("No fue posible verificar la sesión."); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready || !configured || user || !mount.current) return;
    const element = mount.current;
    const w = window as TelegramWindow;
    w.userFxTelegramAuth = async (data: TelegramPayload) => {
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/telegram-auth", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok || !result.authenticated) {
          throw new Error(result.error || "No se pudo verificar tu cuenta de Telegram.");
        }
        setUser(result.user as TelegramUser);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Error de autenticación.");
      } finally {
        setBusy(false);
      }
    };
    element.replaceChildren();
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", "User18Fx_bot");
    script.setAttribute("data-size", "large");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-radius", "6");
    script.setAttribute("data-onauth", "userFxTelegramAuth(user)");
    script.onerror = () => setError("El botón de Telegram no pudo cargarse.");
    element.appendChild(script);
    return () => {
      delete w.userFxTelegramAuth;
      element.replaceChildren();
    };
  }, [ready, configured, user]);

  async function logout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/telegram-auth", {
        method: "DELETE", credentials: "same-origin",
      });
      if (!response.ok) throw new Error("No se pudo cerrar sesión.");
      setUser(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error al cerrar sesión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md">
      <p className="mb-5 flex items-center gap-3 font-wide text-[10px] uppercase tracking-[.28em]" style={{ color: ACCENT }}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: ACCENT }} />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
        </span>
        The Inner Circle
      </p>
      <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-white md:text-5xl">
        Your private <span className="text-white/40">identity.</span>
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-white/55">
        Inicia sesión con Telegram para conectar tu identidad con USER FX.
      </p>
      <div className="mt-8 rounded-2xl border border-[#6fb8c8]/25 bg-white/[.035] p-5 backdrop-blur-md">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#6fb8c8]/30 bg-[#6fb8c8]/10">
            <svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true" fill="#73bed2"><path d="m21.4 4.6-3.2 15.1c-.2 1.1-.9 1.4-1.8.9l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.3l-11.2 7-4.8-1.5c-1-.3-1-1 .2-1.5L19.9 3c.9-.4 1.8.2 1.5 1.6Z"/></svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Telegram · USER FX</p>
            <p className="mt-1 text-xs text-white/45">{user ? "Identidad verificada" : "Acceso seguro con tu cuenta"}</p>
          </div>
        </div>
        {user ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-sm text-[#91d5e6]">{user.username ? `@${user.username}` : user.first_name || "Telegram conectado"}</p>
            <button type="button" onClick={() => void logout()} disabled={busy} className="rounded-lg border border-white/20 px-4 py-2 text-xs text-white/75 transition-colors hover:border-white/50 hover:text-white disabled:opacity-50">Cerrar sesión</button>
          </div>
        ) : (
          <div className="border-t border-white/10 pt-4">
            {!ready && <p className="text-xs text-white/45">Comprobando sesión…</p>}
            {ready && configured && <div ref={mount} className="min-h-[44px]" aria-label="Iniciar sesión con Telegram" />}
            {ready && !configured && <p className="text-xs text-amber-200/80">El inicio de sesión necesita configurar TELEGRAM_BOT_TOKEN en el servidor.</p>}
            <a href="https://t.me/User18Fx_bot" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs text-[#91d5e6] transition-colors hover:text-white">Abrir @User18Fx_bot <span aria-hidden="true">↗</span></a>
          </div>
        )}
        {busy && <p className="mt-3 text-xs text-white/55" role="status">Verificando con Telegram…</p>}
        {error && <p className="mt-3 text-xs text-red-300" role="alert">{error}</p>}
      </div>
      <p className="mt-3 pl-1 text-xs text-white/35">La sesión verifica tu identidad; el acceso privado sigue requiriendo un código válido.</p>
    </div>
  );
}

export default function SiteFooter() {
  return (
    <footer id="contact" className="relative overflow-hidden border-t border-white/10 bg-gradient-to-b from-transparent to-black/40">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-0 h-[480px] w-[480px] rounded-full opacity-[.12] blur-[120px]" style={{ background: ACCENT }} />
      <div className="relative mx-auto w-full max-w-[1440px] px-6 pb-10 pt-20 md:px-10 md:pt-28">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, ease: EASE }} className="grid gap-16 lg:grid-cols-[1.2fr_1fr]">
          <TelegramSignIn />
          <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="mb-6 font-wide text-[10px] uppercase tracking-[.28em] text-white/40">{col.title}</h3>
                <ul className="space-y-4">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="group relative inline-flex items-center gap-1 text-sm text-white/70 transition-colors duration-300 hover:text-white focus-visible:text-white focus-visible:outline-none">
                        <span className="relative">{link.label}<span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100" /></span>
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="-translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100" style={{ color: ACCENT }}><path d="M2 10 10 2M4 2h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </motion.div>
        <div className="mt-20 flex flex-col items-start justify-between gap-5 border-t border-white/10 pt-8 text-xs text-white/40 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} UserFX. All rights reserved.</p>
          <p className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />All systems operational</p>
          <a href="#home" className="group inline-flex items-center gap-2 transition-colors hover:text-white">Back to top <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-white/40"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 10V2M2.5 5.5 6 2l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg></span></a>
        </div>
      </div>
      <div aria-hidden="true" className="pointer-events-none select-none px-4 pb-0 text-center font-display text-[26vw] font-semibold uppercase leading-[.75] tracking-[-0.06em] md:text-[19vw]"><span className="block translate-y-[8%] bg-gradient-to-b from-white/20 via-white/5 to-transparent bg-clip-text text-transparent">User FX</span></div>
    </footer>
  );
}
