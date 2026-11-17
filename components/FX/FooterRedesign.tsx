"use client";
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
    { label: "Get my code", href: "https://t.me/User18Fx_bot?start=getcode" },
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
};

function TelegramSignIn({ onVerified }: FooterProps) {
  return (
    <div className="min-w-0">
      <div id="fx-chat-footer-slot" className="fx-chat-footer-slot" aria-label="USER FX · CHAT · TELEGRAM" />
      <button type="button" onClick={onVerified} className="mt-4 rounded-lg border border-[#6fb8c8]/35 px-5 py-3 text-xs font-semibold tracking-wider text-[#91d5e6] transition-colors hover:border-[#6fb8c8] hover:text-white">
        ALREADY HAVE A CODE? ENTER THE ROOM
      </button>
    </div>
  );
}

export default function SiteFooter({ onVerified }: FooterProps) {
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
          <TelegramSignIn onVerified={openAccess} />
          <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="mb-6 text-[10px] uppercase tracking-[.28em] text-white/40">{col.title}</h3>
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
      <div aria-hidden="true" className="fx-footer-wordmark pointer-events-none select-none px-4 pb-0 text-center text-[26vw] font-semibold uppercase leading-[.75] tracking-[-0.06em] md:text-[19vw]"><span className="block translate-y-[8%] bg-gradient-to-b from-white/20 via-white/5 to-transparent bg-clip-text text-transparent">User FX</span></div>
    </footer>
  );
}
