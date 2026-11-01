"use client";
import { useState, type FormEvent } from "react";
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
type Status = "idle" | "loading" | "success" | "error";

function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error("Subscription unavailable");
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

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
        A private <span className="text-white/40">signal.</span>
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-white/55">Occasional updates from UserFX. No noise.</p>
      <form onSubmit={submit} noValidate className="mt-8">
        <label htmlFor="footer-email" className="sr-only">Email address</label>
        <div className={`group flex items-center rounded-full border bg-white/[.03] p-1.5 pl-5 backdrop-blur-md transition-colors duration-300 focus-within:bg-white/[.06] ${status === "error" ? "border-red-400/60" : "border-white/10 focus-within:border-white/30"}`}>
          <input id="footer-email" type="email" inputMode="email" autoComplete="email" placeholder="you@domain.com" value={email} disabled={status === "loading"} aria-invalid={status === "error"} aria-describedby="footer-email-msg" onChange={(e) => { setEmail(e.target.value); if (status !== "idle") setStatus("idle"); }} className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none disabled:opacity-50" />
          <button type="submit" disabled={status === "loading"} className="flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-xs font-semibold text-[#06141a] transition-all duration-300 hover:brightness-110 active:scale-95 disabled:opacity-60" style={{ background: ACCENT }}>
            {status === "loading" ? "Sending…" : "Subscribe"}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 10 10 2M4 2h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <p id="footer-email-msg" role="status" aria-live="polite" className={`mt-3 pl-5 text-xs ${status === "error" ? "text-red-300" : status === "success" ? "text-[#6fb8c8]" : "text-white/35"}`}>
          {status === "error" ? "Please enter a valid email, or try again later." : status === "success" ? "Subscribed successfully." : "No spam. Unsubscribe anytime."}
        </p>
      </form>
    </div>
  );
}

export default function SiteFooter() {
  return (
    <footer id="contact" className="relative overflow-hidden border-t border-white/10 bg-gradient-to-b from-transparent to-black/40">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-0 h-[480px] w-[480px] rounded-full opacity-[.12] blur-[120px]" style={{ background: ACCENT }} />
      <div className="relative mx-auto w-full max-w-[1440px] px-6 pb-10 pt-20 md:px-10 md:pt-28">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, ease: EASE }} className="grid gap-16 lg:grid-cols-[1.2fr_1fr]">
          <Newsletter />
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
