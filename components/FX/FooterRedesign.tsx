"use client";
import { useEffect, useState } from "react";
import "./FooterTelegramCard.css";
import { useMenu } from "./Chrome";
import { motion } from "framer-motion";
import { EASE } from "@/lib/motion";
const ACCENT = "#6fb8c8";
const COLUMNS = [
  { title: "Spaces", links: [
    { label: "MyRoom", href: "#/private-room" },
    { label: "Stage", href: "#/private-room/stage" },
    { label: "Gallery", href: "#/private-room/gallery" },
    { label: "Inbox", href: "#/private-room/buzon" },
  ] },
  { title: "Access", links: [
    { label: "Get my code", href: "#/private-room-access/plans" },
    { label: "Enter a code", href: "#/private-room-access" },
    { label: "Compare access", href: "#access" },
  ] },
  { title: "Support", links: [
    { label: "Questions", href: "#faq" },
    { label: "Contact", href: "https://t.me/User18fx" },
    { label: "Privacy", href: "/privacy" },
  ] },
] as const;
type FooterProps = {
  onVerified: () => void;
  onEnterCode?: () => void;
  onGetCode?: () => void;
};
type TelegramUser = {
  id: string;
  first_name: string;
  username: string;
};

function TelegramSignIn({ onVerified, onEnterCode, onGetCode }: FooterProps) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/telegram-auth", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not check your Telegram session.");
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        if (data.authenticated && data.user) setUser(data.user as TelegramUser);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Telegram connection unavailable.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, []);

  async function logout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/telegram-auth", {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("Could not disconnect Telegram.");
      setUser(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign out failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fx-footer-telegram-area">
      <p className="mb-5 flex items-center gap-3 font-wide text-[10px] uppercase tracking-[.28em]" style={{ color: ACCENT }}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: ACCENT }} />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
        </span>
        THE INNER CIRCLE
      </p>
      <h2 className="fx-footer-heading text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-white md:text-5xl">
        Your private <span className="text-white/40">identity.</span>
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-white/55">
        Your account, your space. Enter with your private code.
      </p>
      <section className="fx-footer-tg-card" aria-label="USER FX Telegram access">
        <div className="fx-footer-tg-head">
          <div className="fx-footer-tg-avatar">
            <img src="/assets/room-priv-user-lock.webp" alt="" />
          </div>
          <div className="fx-footer-tg-heading">
            <span className="fx-footer-tg-kicker">USER FX · PRIVATE IDENTITY</span>
            <strong>Private Access</strong>
            <small>{user ? "Secure Telegram session connected" : "Your code. Your private access."}</small>
          </div>
          <span className="fx-footer-tg-state">{user ? "CONNECTED" : "PRIVATE"}</span>
        </div>

        {user && (
          <div className="fx-footer-tg-session">
            <span>{user.username ? "@" + user.username : user.first_name || "Telegram connected"}</span>
            <button type="button" onClick={() => void logout()} disabled={busy}>SIGN OUT</button>
          </div>
        )}

        <div className="fx-footer-tg-actions" role="group" aria-label="Private access options">
          <button type="button" onClick={onGetCode || (() => { window.location.hash = "#/private-room-access/plans"; })} className="fx-footer-tg-primary" aria-label="Choose BASIC, PRO or VIP access plan">
            <img src="/assets/iconos/telegram.png" alt="" />
            GET CODE
            <span aria-hidden="true">↗</span>
          </button>
          <button type="button" className="fx-footer-tg-secondary" onClick={onEnterCode || onVerified}>
            GOT CODE
          </button>
        </div>

        {!ready && <p className="fx-footer-tg-message" role="status">CHECKING YOUR SESSION…</p>}
        {busy && <p className="fx-footer-tg-message" role="status">DISCONNECTING TELEGRAM…</p>}
        {error && <p className="fx-footer-tg-error" role="alert">{error}</p>}
        <p className="fx-footer-tg-disclaimer">
          A valid access code is required to unlock your private room.
        </p>
      </section>
    </div>
  );
}

export default function SiteFooter({ onVerified, onEnterCode, onGetCode }: FooterProps) {
  const { close } = useMenu();
  const openAccess = () => {
    close();
    onVerified();
  };
  return (
             <footer id="contact" className="fx-site-footer relative overflow-hidden border-t border-white/10 bg-gradient-to-b from-transparent to-black/40">
            <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-0 h-[480px] w-[480px] rounded-full opacity-[.12] blur-[120px]" style={{ background: ACCENT }} />
            <div className="relative mx-auto w-full max-w-[1440px] px-6 pb-10 pt-20 md:px-10 md:pt-28">
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, ease: EASE }} className="grid gap-16 lg:grid-cols-[1.2fr_1fr]">
            <TelegramSignIn onVerified={openAccess} onEnterCode={onEnterCode ? () => { close(); onEnterCode(); } : openAccess} onGetCode={onGetCode ? () => { close(); onGetCode(); } : undefined} />
            <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3">
            {COLUMNS.map((col) => (
            <div key={col.title}>
            <h3 className="mb-6 text-[10px] uppercase tracking-[.28em] text-white/40">
             {col.title}
            </h3>
            <ul className="space-y-4">
                  {col.links.map((link) => (
            <li key={link.label}>
            <a href={link.href} className="group relative inline-flex items-center gap-1 text-sm text-white/70 transition-colors duration-300 hover:text-white focus-visible:text-white focus-visible:outline-none">
          <span className="relative">
{link.label}
          <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100" />
          </span>
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="-translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100" style={{ color: ACCENT }}>
          <path d="M2 10 10 2M4 2h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          </a>
          </li>
          ))}
          </ul>
          </div>
            ))}
          </nav>
          </motion.div>
          <div className="mt-20 flex flex-col items-start justify-between gap-5 border-t border-white/10 pt-8 text-xs text-white/40 sm:flex-row sm:items-center">
          <p>
          © {new Date().getFullYear()}
           UserFX. All rights reserved.
          </p>
          <p className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>
          All systems operational
          </p>
          <a href="#home" className="group inline-flex items-center gap-2 transition-colors hover:text-white">
          Back to top 
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-white/40">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M6 10V2M2.5 5.5 6 2l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          </span>
          </a>
          </div>
          </div>
          <div aria-hidden="true" className="fx-footer-wordmark pointer-events-none select-none px-4 pb-0 text-center text-[26vw] font-semibold uppercase leading-[.75] tracking-[-0.06em] md:text-[19vw]">
         <span className="block translate-y-[8%] bg-gradient-to-b from-white/20 via-white/5 to-transparent bg-clip-text text-transparent">
         User FX
         </span>
         </div>
         </footer>
         );
         }
