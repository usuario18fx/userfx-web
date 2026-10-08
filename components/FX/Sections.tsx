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
  METRICS,
  PLANS,
  TRAINERS,
} from "@/lib/content";
import { EASE, maskWord, stagger, wipe } from "@/lib/motion";
import { useAdminMode } from "@/components/PrivateRoom/PR-AdminMode";
import { Brand } from "./Chrome";
import VisitorCounter from "@/components/VisitorCounter";
import { Glyph } from "./Glyph";
import { RollLabel } from "./Hero";
import { Counter, Drift, Magnetic, Reveal, RevealGroup, SplitText, Spotlight } from "./Motion";

function Shell({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section
      id={id}
      className="fx-section relative w-full scroll-mt-24 border-t border-ink/10 py-20 md:py-28 lg:py-36">
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 md:px-10">{children}</div>
    </section>
  );
}
function SectionIndex({ index, label }: { index: string; label: string }) {
  return (
    <Reveal className="flex items-center gap-5">
      <span className="font-display text-sm font-semibold uppercase tracking-[-.03em] text-gold">
        {index}
      </span>
      <motion.span
        className="h-px w-10 origin-left bg-gold/50"
        variants={{
          hidden: { scaleX: 0 },
          show: { scaleX: 1, transition: { duration: 0.7, ease: EASE } },
        }}
      />
      <span className="text-xs uppercase tracking-[.18em] text-ink/60">{label}</span>
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
      <p className="max-w-[46ch] text-base leading-[1.6] text-ink/65">{children}</p>
    </Reveal>
  );
}
export function SectionCourses() {
  const [selected, setSelected] = useState<string>(COURSES[0].id);
  const course = COURSES.find((c) => c.id === selected)!;
  const admin = useAdminMode();
  return (
    <Shell id="spaces">
      <Drift className="right-[8%] top-[18%] h-[26rem] w-[26rem]" />
      <RevealGroup className="mb-14 space-y-7">
        <SectionIndex index="01" label="What's inside" />
        <Title>Four spaces. One identity.</Title>
        <Lede>
          Choose your moment. A room that belongs to you, a stage to share, and a collection that
          stays private.
        </Lede>
      </RevealGroup>
      <RevealGroup className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <Reveal>
          <ul className="flex flex-col">
            {COURSES.map((c, i) => (
              <li key={c.id} className="relative">
                <button
                  type="button"
                  aria-pressed={selected === c.id}
                  onClick={() => setSelected(c.id)}
                  className="group flex w-full items-center justify-between gap-6 border-b border-ink/10 py-6 text-left">
                  <span className="text-xs tabular-nums text-gold/60">0{i + 1}</span>
                  <span className="flex flex-1 items-center gap-5 transition-transform duration-500 ease-out group-hover:translate-x-2">
                    <span
                      className={`font-display text-2xl font-semibold uppercase leading-none tracking-[-.03em] transition-opacity sm:text-3xl ${selected === c.id ? "opacity-100" : "opacity-40 group-hover:opacity-75"}`}>
                      {c.name}
                    </span>
                  </span>
                  <span className="hidden text-xs uppercase tracking-[.16em] text-ink/40 sm:block">
                    {c.level}
                  </span>
                  <motion.span
                    animate={{
                      rotate: selected === c.id ? 90 : 0,
                      opacity: selected === c.id ? 1 : 0.35,
                    }}
                    transition={{ duration: 0.4, ease: EASE }}>
                    <Glyph name="caret" className="h-5 w-5" />
                  </motion.span>
                </button>
                {selected === c.id && (
                  <motion.span
                    layoutId="course-rule"
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-px bg-gold"
                    transition={{ duration: 0.45, ease: EASE }}
                  />
                )}
              </li>
            ))}
          </ul>
        </Reveal>
        <motion.div variants={wipe(40)}>
          <Spotlight className="glass flex h-full min-h-[24rem] flex-col justify-between overflow-hidden rounded-[40px] p-8 sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/8 blur-2xl" />
            <AnimatePresence mode="wait">
              <motion.div
                key={course.id}
                className="relative flex flex-1 flex-col gap-7"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: EASE }}>
                <div className="grid h-14 w-14 place-items-center rounded-full bg-orb text-sky">
                  <Glyph name={course.glyph} className="h-6 w-6" />
                </div>
                <h3 className="font-display text-3xl font-semibold uppercase leading-none tracking-[-.03em]">
                  {course.name}
                </h3>
                <p className="max-w-[42ch] text-base leading-[1.6] text-ink/65">{course.blurb}</p>
                <dl className="mt-auto flex flex-wrap gap-3">
                  {course.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="glass-tile flex min-w-[9.5rem] flex-1 flex-col gap-1 rounded-2xl px-5 py-4">
                      <dt className="order-2 text-xs font-light text-ink/50">{m.label}</dt>
                      <dd className="order-1 text-xl font-semibold tracking-[-.02em]">{m.value}</dd>
                    </div>
                  ))}
                </dl>
                <a
                  href={course.route}
                  onClick={(e) => {
                    if (admin.requestFeature(course.id)) e.preventDefault();
                  }}
                  className="flex items-center justify-between border-t border-ink/10 pt-5 text-sm text-gold">
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
export function SectionMethod() {
  return (
    <Shell id="protocol">
      <Drift className="-left-[6%] top-[30%] h-[30rem] w-[30rem]" distance={130} />
      <RevealGroup className="grid gap-14 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="space-y-7 lg:sticky lg:top-28 lg:self-start">
          <SectionIndex index="02" label="Access protocol" />
          <Title>How to unlock the Vault.</Title>
          <Lede>Start in Telegram. Choose your code. Enter your own world.</Lede>
          <Reveal>
            <img
              src={FX.foliage}
              alt=""
              loading="lazy"
              className="fx-protocol-ornament mt-8 w-52 max-w-full object-contain opacity-70"
            />
          </Reveal>
        </div>
        <ol className="flex flex-col gap-4">
          {METHOD.map((step) => (
            <motion.li key={step.step} variants={wipe(32)}>
              <Spotlight className="glass flex flex-col gap-5 overflow-hidden rounded-[32px] p-8 sm:p-10">
                <div className="relative flex items-center gap-5">
                  <span className="font-display text-5xl font-semibold leading-none text-gold/35">
                    {step.step}
                  </span>
                  <span className="h-px flex-1 bg-gold/15" />
                </div>
                <h3 className="relative font-display text-2xl font-semibold uppercase leading-none tracking-[-.03em]">
                  {step.title}
                </h3>
                <p className="relative max-w-[52ch] text-base leading-[1.6] text-ink/65">
                  {step.body}
                </p>
                <a
                  href={step.link}
                  target={step.link.startsWith("https:") ? "_blank" : undefined}
                  rel={step.link.startsWith("https:") ? "noreferrer" : undefined}
                  className="relative mt-2 flex items-center justify-between text-sm text-gold">
                  {step.cta}
                  <Glyph name="caret" className="h-4 w-4" />
                </a>
              </Spotlight>
            </motion.li>
          ))}
        </ol>
      </RevealGroup>
      <RevealGroup className="mt-16 lg:mt-24" step={0.1}>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[40px] bg-ink/10 lg:grid-cols-4">
          {METRICS.map((m) => (
            <Reveal
              key={m.label}
              className="group flex flex-col gap-2 bg-sky px-6 py-9 transition-colors duration-500 hover:bg-white/5 sm:px-8">
              <dd className="font-display text-4xl uppercase leading-none tracking-[-.03em] transition-transform duration-500 ease-out group-hover:-translate-y-1 sm:text-5xl">
                <Counter to={m.value} suffix={m.suffix} />
              </dd>
              <dt className="text-sm font-light text-ink/50">{m.label}</dt>
            </Reveal>
          ))}
        </dl>
      </RevealGroup>
    </Shell>
  );
}
export function SectionTrainers() {
  return (
    <Shell id="identity">
      <Drift className="right-[2%] bottom-[10%] h-[24rem] w-[24rem]" distance={70} />
      <RevealGroup className="mb-14 space-y-7">
        <SectionIndex index="03" label="Your prefix" />
        <Title>Every code has its place.</Title>
        <Lede>Your prefix defines your access. Each collection respects its own code.</Lede>
      </RevealGroup>
      <RevealGroup>
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {TRAINERS.map((t) => (
            <motion.li key={t.name} variants={wipe(32)}>
              <Spotlight className="glass group flex h-full flex-col gap-6 overflow-hidden rounded-[32px] p-7 transition-colors duration-500 hover:bg-white/5">
                <div className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-gold/15 bg-sky text-3xl">
                  <img
                    src={
                      t.name === "SPCL"
                        ? FX.special
                        : t.name === "BSIC"
                          ? FX.basic
                          : t.name === "PRX0"
                            ? FX.pro
                            : FX.vip
                    }
                    alt=""
                    loading="lazy"
                    className="h-12 w-12 object-contain grayscale transition-[filter,transform] duration-700 ease-out group-hover:scale-110 group-hover:grayscale-0"
                  />
                </div>
                <div className="relative space-y-2">
                  <h3 className="font-display text-xl font-semibold uppercase tracking-[-.03em]">
                    {t.name}
                  </h3>
                  <p className="text-xs uppercase tracking-[.16em] text-gold/70">{t.role}</p>
                </div>
                <span
                  aria-hidden
                  className="h-px w-full origin-left scale-x-0 bg-gold/30 transition-transform duration-700 ease-out group-hover:scale-x-100"
                />
                <p className="relative text-sm leading-[1.6] text-ink/60">{t.line}</p>
              </Spotlight>
            </motion.li>
          ))}
        </ul>
      </RevealGroup>
    </Shell>
  );
}
export function SectionPricing() {
  // Existing FX pricing is Stars per access, not a fictitious monthly subscription.
  const [view, setView] = useState<"stars" | "window">("stars");
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <Shell id="access">
      <Drift className="left-[30%] top-[6%] h-[28rem] w-[28rem]" distance={110} />
      <RevealGroup className="mb-14 space-y-7">
        <SectionIndex index="04" label="Choose your code" />
        <Title>Your access. Your level.</Title>
        <Reveal>
          <div
            role="radiogroup"
            aria-label="Compare access by"
            className="glass relative inline-flex rounded-full p-1">
            {(["stars", "window"] as const).map((value, i) => (
              <button
                key={value}
                ref={(el) => {
                  radios.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={view === value}
                tabIndex={view === value ? 0 : -1}
                onClick={() => setView(value)}
                onKeyDown={(e) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(
                      e.key,
                    )
                  )
                    return;
                  e.preventDefault();
                  const next = e.key === "Home" ? 0 : e.key === "End" ? 1 : 1 - i;
                  setView(next === 0 ? "stars" : "window");
                  radios.current[next]?.focus();
                }}
                className="relative rounded-full px-6 py-2.5 text-sm font-semibold">
                {view === value && (
                  <motion.span
                    layoutId="cycle-pill"
                    className="absolute inset-0 rounded-full bg-gold text-sky"
                    transition={{ duration: 0.4, ease: EASE }}
                  />
                )}
                <span className={`relative ${view === value ? "text-sky" : "opacity-50"}`}>
                  {value === "stars" ? "Telegram Stars" : "Access window"}
                </span>
              </button>
            ))}
          </div>
        </Reveal>
      </RevealGroup>
      <RevealGroup>
        <ul className="grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const price = view === "stars" ? `✪ ${plan.stars}` : plan.window;
            return (
              <motion.li
                key={plan.id}
                variants={wipe(40)}
                whileHover={{ y: -10 }}
                transition={{ duration: 0.5, ease: EASE }}
                className={`fx-plan relative flex flex-col gap-8 rounded-[40px] p-8 sm:p-10 ${plan.featured ? "fx-plan-featured text-sky" : "glass"}`}>
                {plan.featured && (
                  <span className="absolute right-8 top-8 rounded-full bg-sky/10 px-3 py-1 text-[.65rem] uppercase tracking-[.16em]">
                    PRO ACCESS
                  </span>
                )}
                <div className="space-y-3">
                  <img
                    src={plan.id === "basic" ? FX.basic : plan.id === "pro" ? FX.pro : FX.vip}
                    alt=""
                    loading="lazy"
                    className="fx-prefix-illustration h-16 w-16 object-contain"
                  />
                  <h3 className="font-display text-xl font-semibold uppercase tracking-[-.03em]">
                    {plan.name} <span className="text-sm opacity-50">{plan.prefix}</span>
                  </h3>
                  <p className="text-sm opacity-65">{plan.tagline}</p>
                </div>
                <div>
                  <motion.span
                    key={`${plan.id}-${price}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="inline-block font-display text-4xl font-semibold leading-none tracking-[-.03em] tabular-nums sm:text-5xl">
                    {price}
                  </motion.span>
                  <p className="mt-3 text-sm opacity-55">
                    {view === "stars"
                      ? `${plan.window} active access`
                      : `✪ ${plan.stars} Telegram Stars`}
                  </p>
                </div>
                <ul className="flex flex-1 flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed">
                      <span
                        aria-hidden
                        className={`mt-2 h-1 w-1 shrink-0 rounded-full ${plan.featured ? "bg-sky/50" : "bg-gold/60"}`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Magnetic strength={0.22}>
                  <a
                    href={`https://t.me/User18Fx_bot?start=${plan.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`group flex items-center justify-between gap-4 rounded-full px-6 py-4 text-sm font-semibold transition-opacity hover:opacity-85 ${plan.featured ? "bg-sky text-gold" : "bg-gold text-sky"}`}>
                    <RollLabel>{plan.cta}</RollLabel>
                    <Glyph
                      name="caret"
                      className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1"
                    />
                  </a>
                </Magnetic>
              </motion.li>
            );
          })}
        </ul>
        <Reveal className="mt-7 flex flex-wrap items-center justify-between gap-4 text-sm text-ink/55">
          <span>Need identity access? Start with SPCL.</span>
          <a className="text-gold" href={BOT_URL} target="_blank" rel="noreferrer">
            Get my code ↗
          </a>
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
          <Title>Good questions. Clear answers.</Title>
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
                  onClick={() => setExpanded((current) => (current === i ? null : i))}>
                  <span className="mt-1.5 text-xs tabular-nums text-gold/50">0{i + 1}</span>
                  <span className="flex-1 font-display text-lg font-semibold uppercase leading-tight tracking-[-.02em] transition-transform duration-500 group-hover:translate-x-2 sm:text-xl">
                    {item.q}
                  </span>
                  <span aria-hidden className="relative mt-2 block h-3 w-3 shrink-0">
                    <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gold" />
                    <motion.span
                      className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gold"
                      animate={{ scaleY: expanded === i ? 0 : 1 }}
                      transition={{ duration: 0.35, ease: EASE }}
                    />
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
                      className="overflow-hidden">
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
  const [email, setEmail] = useState(""),
    [state, setState] = useState<"idle" | "invalid" | "sending" | "sent" | "error">("idle");
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setState("invalid");
      return;
    }
    setState("sending");
    const controller = new AbortController();
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
      setState("error");
    } finally {
      clearTimeout(timer);
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
    <footer id="contact" className="fx-footer relative scroll-mt-20 border-t border-ink/10">
      <div className="mx-auto w-full max-w-[1440px] px-6 md:px-10">
        <RevealGroup className="flex flex-col gap-10 py-20 md:py-28 lg:flex-row lg:items-end lg:justify-between">
          <motion.p
            variants={stagger(0.1, 0)}
            className="font-display text-[13vw] font-semibold uppercase leading-[.88] tracking-[-.03em] sm:text-[8vw] lg:text-[5.4vw]">
            {HERO.badge.map((line) => (
              <span key={line} className="block overflow-hidden">
                <motion.span
                  variants={maskWord}
                  className="block whitespace-nowrap will-change-transform">
                  {line}
                </motion.span>
              </span>
            ))}
          </motion.p>
          <Reveal className="flex flex-col items-start gap-6 lg:items-end">
            <motion.img
              src={FX.emblem}
              alt=""
              className="h-28 w-28 object-contain"
              animate={{ y: reduced ? 0 : [0, -10, 0] }}
              transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
            />
            <Magnetic strength={0.3}>
              <a
                href={ENTER_URL}
                className="group flex items-center gap-5 rounded-full bg-gold py-4 pl-7 pr-5 text-sm font-semibold text-sky">
                <RollLabel>Enter the Vault</RollLabel>
                <Glyph name="caret" className="h-4 w-4" />
              </a>
            </Magnetic>
          </Reveal>
        </RevealGroup>
        <RevealGroup className="grid gap-12 border-t border-ink/10 py-16 md:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,.6fr))] lg:gap-10">
          <Reveal className="space-y-8">
            <Brand />
            <form onSubmit={submit} noValidate className="flex w-full max-w-md flex-col gap-3">
              <label
                htmlFor="newsletter-email"
                className="text-xs uppercase tracking-[.18em] text-gold/60">
                Inside UserFX
              </label>
              <div
                className={`flex items-center gap-3 rounded-full border bg-white/5 py-2 pl-6 pr-2 transition-colors ${state === "invalid" ? "border-rose" : "border-ink/10"}`}>
                <input
                  id="newsletter-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder="you@domain.com"
                  value={email}
                  disabled={state === "sending"}
                  aria-invalid={state === "invalid"}
                  aria-describedby="newsletter-note"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setState("idle");
                  }}
                  className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-ink/40"
                />
                <button
                  type="submit"
                  disabled={state === "sending"}
                  aria-label="Subscribe"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-sky disabled:opacity-40">
                  <Glyph name="caret" className="h-4 w-4" />
                </button>
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={note}
                  id="newsletter-note"
                  role={state === "invalid" || state === "error" ? "alert" : "status"}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="text-xs leading-relaxed text-ink/50">
                  {note}
                </motion.p>
              </AnimatePresence>
            </form>
          </Reveal>
          {FOOTER.columns.map((column) => (
            <Reveal key={column.title} className="space-y-6">
              <h3 className="text-xs uppercase tracking-[.18em] text-gold/60">{column.title}</h3>
              <ul className="flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      className="group inline-block text-sm text-ink/65"
                      href={link.href}
                      target={link.href.startsWith("https:") ? "_blank" : undefined}
                      rel={link.href.startsWith("https:") ? "noreferrer" : undefined}>
                      <RollLabel>{link.label}</RollLabel>
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </RevealGroup>
        <div className="flex flex-col gap-4 border-t border-ink/10 py-8 md:flex-row md:items-center md:justify-between">
          <p className="max-w-[60ch] text-xs leading-relaxed text-ink/40">
            Private access, personal codes. Your permissions are verified before protected content
            opens.
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
