"use client";

import { useEffect, useRef, useState, type ReactNode, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FX } from "@/lib/assets";
import {
  BOT_URL,
  COURSES,
  ENTER_URL,
  FAQS,
  FOOTER,
  HERO,
  METHOD,
  PLANS,
} from "@/lib/content";
import { EASE, maskWord, stagger, wipe } from "@/lib/motion";
import { useAdminMode } from "@/components/PrivateRoom/PR-AdminMode";
import "./SectionsLayout.css";
import VisitorCounter from "@/components/VisitorCounter";
import { Glyph } from "./Glyph";
import { RollLabel } from "./Hero";
import { Drift, Magnetic, Reveal, RevealGroup, SplitText, Spotlight } from "./Motion";
import ProtocolVault, { type VaultStep } from "./ProtocolVault";

/* ---------- Plan hover videos (typed) ---------- */
const PLAN_HOVER_VIDEOS = {
  basic: "/assets/my-room/room1.mp4",
  pro: "/assets/FX-Y24V01.mp4",
  vip: "/assets/my-room/room3.mp4",
} as const;

type PlanId = keyof typeof PLAN_HOVER_VIDEOS;

function getPlanVideo(id: string) {
  return PLAN_HOVER_VIDEOS[id as PlanId] ?? PLAN_HOVER_VIDEOS.basic;
}

function setPlanPreview(card: HTMLElement, playing: boolean) {
  const video = card.querySelector<HTMLVideoElement>(".fx-plan-hover-video");
  if (!video || video.autoplay) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (playing && !reduced) {
    video.muted = true;
    void video.play().catch(() => {});
    return;
  }

  video.pause();
  if (video.readyState > 0) video.currentTime = 0;
}

/* ---------- Reusable shell ---------- */
function Shell({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id} className="fx-section relative w-full scroll-mt-24 border-t border-ink/10 py-20 md:py-28 lg:py-36" >
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 md:px-10">
        {children}
      </div>
    </section>
  );
}

function SectionIndex({ index, label }: { index: string; label: string }) {
  return (
    <Reveal className="flex items-center gap-5">
      <span className="font-display text-sm font-semibold uppercase tracking-[-.03em] text-gold">
        {index}
      </span>
      <motion.span className="h-px w-10 origin-left bg-gold/50" variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.7, ease: EASE }, }, }} />
      <span className="text-xs uppercase tracking-[.18em] text-ink/60">
        {label}
      </span>
    </Reveal>
  );
}

function Title({ children }: { children: string }) {
  return (
    <h2 className="max-w-[18ch] font-display text-[10vw] font-semibold uppercase leading-[.9] tracking-[-.03em] sm:text-[7vw] lg:text-[4.4vw]">
      <SplitText text={children} />
    </h2>
  );
}

function Lede({ children }: { children: string }) {
  return (
    <Reveal>
      <p className="max-w-[46ch] text-base leading-[1.6] text-ink/65">
        {children}
      </p>
    </Reveal>
  );
}

/* ---------- Courses ---------- */
export function SectionCourses() {
  const initialCourse = COURSES[0];
  const [selected, setSelected] = useState<string>(initialCourse?.id ?? "");
  const course = COURSES.find((c) => c.id === selected) ?? initialCourse;
  const admin = useAdminMode();

  if (!course) return null;

  return (
    <Shell id="spaces">
      <Drift className="right-[8%] top-[18%] h-[26rem] w-[26rem]" />

      <RevealGroup className="mb-14 space-y-7">
        <SectionIndex index="01" label="What's inside" />
        <Title>
Four spaces. One identity.
</Title>
        <Lede>
          Choose your moment. A room that belongs to you, a stage to share, and
          a collection that stays private.
        </Lede>
      </RevealGroup>

      <RevealGroup className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <Reveal>
          <ul className="flex flex-col">
            {COURSES.map((c, i) => (
              <li key={c.id} className="relative">
                <button type="button" aria-pressed={selected === c.id} onClick={() => setSelected(c.id)} className="group flex w-full items-center justify-between gap-6 border-b border-ink/10 py-6 text-left" >
                  <span className="text-xs tabular-nums text-gold/60">
                    0{i + 1}
                  </span>

                  <span className="flex flex-1 items-center gap-5 transition-transform duration-500 ease-out group-hover:translate-x-2">
                    <span
                      className={`font-display text-2xl font-semibold uppercase leading-none tracking-[-.03em] transition-opacity sm:text-3xl ${
                        selected === c.id
                          ? "opacity-100"
                          : "opacity-40 group-hover:opacity-75"
                      }`}
                    >
                      {c.name}
                    </span>
                  </span>

                  <span className="hidden text-xs uppercase tracking-[.16em] text-ink/40 sm:block">
                    {c.level}
                  </span>

                  <motion.span animate={{ rotate: selected === c.id ? 90 : 0, opacity: selected === c.id ? 1 : 0.35, }} transition={{ duration: 0.4, ease: EASE }} >
                    <Glyph name="caret" className="h-5 w-5" />
                  </motion.span>
                </button>

                {selected === c.id && (
                  <motion.span layoutId="course-rule" aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gold" transition={{ duration: 0.45, ease: EASE }} />
                )}
              </li>
            ))}
          </ul>
        </Reveal>

        <motion.div variants={wipe(40)}>
          <Spotlight className="glass flex h-full min-h-[24rem] flex-col justify-between overflow-hidden rounded-[40px] p-8 sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/8 blur-2xl" />

            <AnimatePresence mode="wait">
              <motion.div key={course.id} className="relative flex flex-1 flex-col gap-7" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: EASE }} >
                <div className="grid h-14 w-14 place-items-center rounded-full bg-orb text-sky">
                  <Glyph name={course.glyph} className="h-6 w-6" />
                </div>

                <h3 className="font-display text-3xl font-semibold uppercase leading-none tracking-[-.03em]">
                  {course.name}
                </h3>

                <p className="max-w-[42ch] text-base leading-[1.6] text-ink/65">
                  {course.blurb}
                </p>

                <dl className="mt-auto flex flex-wrap gap-3">
                  {course.metrics.map((m) => (
                    <div key={m.label} className="glass-tile flex min-w-[9.5rem] flex-1 flex-col gap-1 rounded-2xl px-5 py-4" >
                      <dt className="order-2 text-xs font-light text-ink/50">
                        {m.label}
                      </dt>
                      <dd className="order-1 text-xl font-semibold tracking-[-.02em]">
                        {m.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <a href={course.route} onClick={(e) => { if (admin.requestFeature(course.id)) e.preventDefault(); }} className="flex items-center justify-between border-t border-ink/10 pt-5 text-sm text-gold" >
                  Open {course.name}
                  <Glyph name="caret" className="h-4 w-4" />
                </a>
              </motion.div>
            </AnimatePresence>
          </Spotlight>
        </motion.div>
      </RevealGroup>
    </Shell>
  );
}

/* ---------- Method / Protocol vault ---------- */
export function SectionMethod() {
  const steps: VaultStep[] = METHOD.map((step) => {
    const href = step.step === "01" ? BOT_URL : step.link;

    return {
      title: step.title,
      text: step.body,
      cta: step.cta || "Continue",
      href,
      external: step.step === "01" || href.startsWith("https:"),
    };
  });

  steps.push({
    title: "Unlock",
    text: "Enter your personal code to unlock the USER FX private ROOM.",
    cta: "Enter the Vault",
    href: ENTER_URL,
    external: false,
  });

  const methodTitle = (
    <>
      {" "}
      <span className="pv-title-line">
 GET 
</span>
      IN
      <span className="pv-title-line" />
      {" "}
    </>
  );

  return (
    <ProtocolVault id="protocol" eyebrowIndex="02" eyebrow="ACCESS PROTOCOL" title={methodTitle} intro="Four steps. Four photographs. The crown turns behind everything and falls into the four private rooms." steps={steps} roomTags={["SPCL", "BSIC", "PRX0", "VIPX"]} />
  );
}

/* ---------- Pricing Card Component ---------- */
function PricingCard({ plan, view }: { plan: any, view: "stars" | "window" }) {
  const videoSrc = getPlanVideo(plan.id);
  const price = view === "stars" ? `✪ ${plan.stars}` : plan.window;
  const sub = view === "stars" ? `${plan.window} code validity` : `✪ ${plan.stars} Stars`;

  return (
    <motion.li
      variants={wipe(40)}
      whileHover={{ y: -6, scale: 1.02 }}
      onMouseEnter={(e) => setPlanPreview(e.currentTarget, true)}
      onMouseLeave={(e) => setPlanPreview(e.currentTarget, false)}
      onFocusCapture={(e) => setPlanPreview(e.currentTarget, true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPlanPreview(e.currentTarget, false);
        }
      }}
      transition={{ duration: 0.3, ease: EASE }}
      className={`fx-plan-card ${plan.featured ? "is-featured" : ""}`}
    >
      {/* Fondo de video */}
      <div className="fx-plan-bg">
        {videoSrc && (
          <video src={videoSrc} className="fx-plan-hover-video" muted loop playsInline autoPlay={plan.id === "pro"} preload={plan.id === "pro" ? "auto" : "metadata"} aria-hidden="true" />
        )}
        <div className="fx-plan-video-shade" />
      </div>

      {/* Contenido de la tarjeta */}
      <div className="fx-plan-content">
        
        {/* HEADER: Icono y Título */}
        <div className="fx-plan-header">
          <div className="fx-plan-icon-wrap">
            <img src={plan.id === "basic" ? FX.basic : plan.id === "pro" ? FX.pro : FX.vip} alt="" loading="lazy" className="fx-prefix-illustration" />
          </div>
          <div className="fx-plan-title-group">
            <h3 className="fx-plan-name">
{plan.name}
</h3>
            <span className="fx-plan-prefix">
{plan.prefix}
</span>
          </div>
        </div>

        {/* BODY: Descripción y Precio */}
        <div className="fx-plan-body">
          <p className="fx-plan-tagline">
{plan.tagline}
</p>
          
          <div className="fx-plan-price-wrap">
            <motion.span
              key={`${plan.id}-${price}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="fx-plan-price"
            >
              {price}
            </motion.span>
            <span className="fx-plan-meta">
              {sub} · {plan.session}
            </span>
          </div>
        </div>

        {/* FOOTER: Beneficios y Botón */}
        <div className="fx-plan-footer">
          <details className="fx-plan-details group">
            <summary className="fx-plan-summary">
              <span>
BENEFITS
</span>
              <span aria-hidden="true" className="group-open:rotate-45 transition-transform">
+
</span>
            </summary>
            <ul className="fx-plan-features">
              {plan.features.map((feature: string) => (
                <li key={feature}>
                  <span className="bullet">
•
</span>
                  <span>
{feature}
</span>
                </li>
              ))}
            </ul>
          </details>

          <Magnetic strength={0.1}>
            <a
              href={`https://t.me/User18Fx_bot?start=${plan.id}`}
              target="_blank"
              rel="noreferrer noopener"
              className="fx-plan-cta group"
            >
              <RollLabel>
{plan.cta}
</RollLabel>
              <Glyph name="caret" className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
            </a>
          </Magnetic>
        </div>

      </div>
    </motion.li>
  );
}

export function SectionPricing() {
  const radioValues = ["stars", "window"] as const;
  const [view, setView] = useState<(typeof radioValues)[number]>("stars");
  const radios = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <Shell id="access">
      <Drift className="left-[30%] top-[6%] h-[28rem] w-[28rem]" distance={110} />

      <RevealGroup className="mb-8 space-y-5">
        <SectionIndex index="04" label="Choose your code" />
        <Title>
         Your access. Your level.
</Title>

        <Reveal>
          <div role="radiogroup" aria-label="Compare access by" className="glass relative inline-flex rounded-full p-1" >
            {radioValues.map((value, i) => (
              <button key={value} ref={(element) => { radios.current[i] = element; }} type="button" role="radio" aria-checked={view === value} tabIndex={view === value ? 0 : -1} onClick={() => setView(value)} onKeyDown={(event) => { const isPrev = event.key === "ArrowLeft" || event.key === "ArrowUp"; const isNext = event.key === "ArrowRight" || event.key === "ArrowDown";  if (!isPrev && !isNext && event.key !== "Home" && event.key !== "End") { return; }  event.preventDefault();  const next = event.key === "Home" ? 0 : event.key === "End" ? radioValues.length - 1 : isPrev ? (i - 1 + radioValues.length) % radioValues.length : (i + 1) % radioValues.length;  setView(radioValues[next]); radios.current[next]?.focus(); }} className="relative rounded-full px-6 py-2.5 text-sm font-semibold" >
                {view === value && (
                  <motion.span layoutId="cycle-pill" className="absolute inset-0 rounded-full bg-gold text-sky" transition={{ duration: 0.4, ease: EASE }} />
                )}
                <span
                  className={`relative ${
                    view === value ? "text-sky" : "opacity-50"
                  }`}
                >
                  {value === "stars" ? "Telegram Stars" : "Code validity"}
                </span>
              </button>
            ))}
          </div>
        </Reveal>
      </RevealGroup>

      <RevealGroup>
        <ul className="fx-pricing-grid">
          {PLANS.map((plan) => (
            <PricingCard key={plan.id} plan={plan} view={view} />
          ))}
        </ul>

        <Reveal className="mt-7 flex flex-wrap items-center justify-between gap-4 text-sm text-ink/55">
          <span>
          🜲 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 ▪ 𒅂 🜲
          </span>
        </Reveal>
      </RevealGroup>
    </Shell>
  );
}

export function SectionFaq() {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <Shell id="faq">
      <Drift className="-right-[4%] top-[20%] h-[22rem] w-[22rem]" distance={80} />

      <RevealGroup className="grid gap-12 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <div className="space-y-7 lg:sticky lg:top-28 lg:self-start">
          <SectionIndex index="05" label="Before you get in" />
          <Title>
Good questions. Clear answers.
</Title>
        </div>

        <Reveal>
          <ul className="fx-faq relative">
            {FAQS.map((item, i) => (
              <li key={item.q} className="group border-b border-ink/12 first:border-t">
                <button
                  id={`faq-trigger-${i}`}
                  type="button"
                  aria-expanded={expanded === i}
                  aria-controls={`faq-panel-${i}`}
                  className="flex w-full items-start justify-between gap-8 py-6 text-left"
                  onClick={() =>
                    setExpanded((current) => (current === i ? null : i))
                  }
                >
                  <span className="mt-1.5 text-xs tabular-nums text-gold/50">
                    0{i + 1}
                  </span>

                  <span className="flex-1 font-display text-lg font-semibold uppercase leading-tight tracking-[-.02em] transition-transform duration-500 group-hover:translate-x-2 sm:text-xl">
                    {item.q}
                  </span>

                  <span aria-hidden className="relative mt-2 block h-3 w-3 shrink-0" >
                    <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gold" />
                    <motion.span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gold" animate={{ scaleY: expanded === i ? 0 : 1 }} transition={{ duration: 0.35, ease: EASE }} />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {expanded === i && (
                    <motion.div
                      id={`faq-panel-${i}`}
                      role="region"
                      aria-labelledby={`faq-trigger-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-[62ch] pb-7 pl-10 text-base leading-[1.65] text-ink/60">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        </Reveal>
      </RevealGroup>
    </Shell>
  );
}

export function SiteFooter() {
  const reduced = useReducedMotion();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<
    "idle" | "invalid" | "sending" | "sent" | "error"
  >("idle");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      abortRef.current = null;
    },
    [],
  );

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (state === "sending") return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setState("invalid");
      return;
    }

    setState("sending");

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("Unable to subscribe");

      setState("sent");
      setEmail("");
    } catch {
      if (abortRef.current === controller) {
        setState("error");
      }
    } finally {
      clearTimeout(timer);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }

  const note = {
    idle: "Occasional UserFX updates. Unsubscribe whenever you want.",
    invalid: "That address does not look right.",
    sending: "Saving your subscription…",
    sent: "You are on the list. Your subscription is saved.",
    error: "We could not save your subscription. Try again later.",
  }[state];

  return (
    <footer id="contact" className="fx-footer relative scroll-mt-20 border-t border-ink/10" >
      <div className="mx-auto w-full max-w-[1440px] px-6 md:px-10">
        <RevealGroup className="flex flex-col gap-10 py-20 md:py-28 lg:flex-row lg:items-end lg:justify-between">
          <motion.p variants={stagger(0.1, 0)} className="font-display text-[13vw] font-semibold uppercase leading-[.88] tracking-[-.03em] sm:text-[8vw] lg:text-[5.4vw]" >
            {HERO.headline.map((line) => (
              <span key={line} className="block overflow-hidden">
                <motion.span variants={maskWord} className="block whitespace-nowrap will-change-transform" >
                  {line}
                </motion.span>
              </span>
            ))}
          </motion.p>

          <Reveal className="flex flex-col items-start gap-6 lg:items-end">
            <motion.img src={FX.emblem} alt="" className="h-28 w-28 object-contain" animate={{ y: reduced ? 0 : [0, -10, 0] }} transition={{ duration: 6, ease: "easeInOut", repeat: Infinity, }} />

            <Magnetic strength={0.3}>
              <a href={ENTER_URL} className="group flex items-center gap-5 rounded-full bg-gold py-4 pl-7 pr-5 text-sm font-semibold text-sky" >
                <RollLabel>
Enter the Vault
</RollLabel>
                <Glyph name="caret" className="h-4 w-4" />
              </a>
            </Magnetic>
          </Reveal>
        </RevealGroup>

        <RevealGroup className="grid gap-10 border-t border-gold/15 py-10 md:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,.65fr))] lg:gap-8">
          <Reveal className="space-y-5">
            <form onSubmit={submit} noValidate className="flex w-full max-w-md flex-col gap-3">
              <label htmlFor="newsletter-email" className="text-xs uppercase tracking-[.18em] text-gold/60" >
                Inside UserFX
              </label>

              <div
                className={`flex items-center gap-3 rounded-full border bg-white/[0.035] py-1.5 pl-5 pr-1.5 transition-colors focus-within:border-gold/60 ${
                  state === "invalid" ? "border-rose" : "border-gold/20"
                }`}
              >
                <input id="newsletter-email" type="email" inputMode="email" autoComplete="email" maxLength={254} placeholder="you@domain.com" value={email} disabled={state === "sending"} aria-invalid={state === "invalid"} aria-describedby="newsletter-note" onChange={(e) => { setEmail(e.target.value); setState("idle"); }} className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-ink/40" />

                <button type="submit" disabled={state === "sending"} aria-label="Subscribe" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold text-sky transition-transform hover:scale-105 disabled:opacity-40" >
                  <Glyph name="caret" className="h-4 w-4" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                <motion.p key={note} id="newsletter-note" role={state === "invalid" || state === "error" ? "alert" : "status"} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }} className="text-xs leading-relaxed text-ink/50" >
                  {note}
                </motion.p>
              </AnimatePresence>
            </form>
          </Reveal>

          {FOOTER.columns.map((column) => (
            <Reveal key={column.title} className="space-y-4">
              <h3 className="text-xs uppercase tracking-[.18em] text-gold/60">
                {column.title}
              </h3>

              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a className="group inline-flex items-center border-b border-transparent py-1 text-sm text-ink/65 transition-colors hover:border-gold/40 hover:text-gold focus-visible:text-gold" href={link.href} target={link.href.startsWith("https:") ? "_blank" : undefined} rel={ link.href.startsWith("https:") ? "noreferrer noopener" : undefined } >
                      <RollLabel>
{link.label}
</RollLabel>
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </RevealGroup>

        <div className="flex flex-col gap-4 border-t border-gold/10 py-5 md:flex-row md:items-center md:justify-between">
          <p className="max-w-[60ch] text-xs leading-relaxed text-ink/40">
            Private access, personal codes. Your permissions are verified before
            protected content opens.
          </p>

          <VisitorCounter />

          <p className="text-xs text-ink/40">
            © {new Date().getFullYear()} USER FX. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}