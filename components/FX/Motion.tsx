"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  animate,
  motion,
  MotionConfig,
  useAnimationFrame,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  wrap,
} from "framer-motion";
import Lenis from "lenis";
import { EASE, maskWord, rise, stagger } from "@/lib/motion";

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ ease: EASE }}>
      {children}
    </MotionConfig>
  );
}
let instance: Lenis | null = null;
export function setSmoothScroll(enabled: boolean) {
  if (instance) enabled ? instance.start() : instance.stop();
}
export function jumpToPosition(top: number) {
  const target = Math.max(0, top);
  if (instance) instance.scrollTo(target, { immediate: true, force: true });
  else window.scrollTo({ top: target, behavior: "instant" });
}
export function travelToPosition(top: number, duration = 1.5) {
  const target = Math.max(0, top);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return jumpToPosition(target);
  if (instance) {
    instance.scrollTo(target, {
      duration,
      force: true,
      easing: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    });
  } else {
    window.scrollTo({ top: target, behavior: "smooth" });
  }
}


export function SmoothScroll() {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, touchMultiplier: 1.6 });
    instance = lenis;
    if (document.body.dataset.locked === "true") lenis.stop();
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    let frame = requestAnimationFrame(function loop(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(loop);
    });
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      const link = (event.target as HTMLElement)?.closest?.('a[href^="#"]');
      const href = link?.getAttribute("href");
      if (!href || href === "#" || href.startsWith("#/")) return;
      const target = document.getElementById(decodeURIComponent(href.slice(1)));
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: -8, duration: 1.15 });
    };
    document.addEventListener("click", click);
    return () => {
      document.removeEventListener("click", click);
      cancelAnimationFrame(frame);
      lenis.destroy();
      instance = null;
      document.documentElement.style.scrollBehavior = previous;
    };
  }, [reduced]);
  return null;
}
export function RevealGroup({
  children,
  className,
  step = 0.08,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={stagger(step, 0.05)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-12% 0px -12% 0px" }}>
      {children}
    </motion.div>
  );
}
export function Reveal({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  const Component = as === "article" ? motion.article : as === "li" ? motion.li : motion.div;
  return (
    <Component variants={rise} className={className}>
      {children}
    </Component>
  );
}
export function SplitText({
  text,
  className,
  step = 0.045,
}: {
  text: string;
  className?: string;
  step?: number;
}) {
  return (
    <motion.span className={className} variants={stagger(step, 0)} aria-label={text}>
      {text.split(" ").map((word, i) => (
        <span key={i} aria-hidden>
          <span className="inline-block overflow-hidden pb-[0.12em] align-bottom">
            <motion.span variants={maskWord} className="inline-block will-change-transform">
              {word}
            </motion.span>
          </span>{" "}
        </span>
      ))}
    </motion.span>
  );
}
export function Magnetic({
  children,
  strength = 0.3,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const x = useMotionValue(0),
    y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 170, damping: 16, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 170, damping: 16, mass: 0.4 });
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        if (reduced) return;
        const box = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - box.left - box.width / 2) * strength);
        y.set((e.clientY - box.top - box.height / 2) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}>
      {children}
    </motion.div>
  );
}
export function Spotlight({
  children,
  className,
  radius = 260,
}: {
  children: ReactNode;
  className?: string;
  radius?: number;
}) {
  const x = useMotionValue(-9999),
    y = useMotionValue(-9999);
  const background = useMotionTemplate`radial-gradient(${radius}px circle at ${x}px ${y}px, rgba(211,180,106,0.16), transparent 68%)`;
  const reduced = useReducedMotion();
  return (
    <div
      className={`group/spot relative ${className ?? ""}`}
      onMouseMove={(e) => {
        if (reduced) return;
        const box = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - box.left);
        y.set(e.clientY - box.top);
      }}
      onMouseLeave={() => {
        x.set(-9999);
        y.set(-9999);
      }}>
      <motion.span
        aria-hidden
        style={{ background }}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
      />
      {children}
    </div>
  );
}
export function Marquee({
  words,
  baseVelocity = -2.2,
  className = "",
}: {
  words: readonly string[];
  baseVelocity?: number;
  className?: string;
}) {
  const baseX = useMotionValue(0),
    direction = useRef(1);
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { damping: 50, stiffness: 400 });
  const factor = useTransform(smooth, [-1200, 0, 1200], [-2.4, 0, 2.4], { clamp: false });
  const x = useTransform(baseX, (v) => `${wrap(-25, 0, v)}%`);
  const reduced = useReducedMotion();
  useAnimationFrame((_, delta) => {
    if (reduced) return;
    let moveBy = (direction.current * baseVelocity * delta) / 1000;
    const scrolling = factor.get();
    if (scrolling < 0) direction.current = -1;
    else if (scrolling > 0) direction.current = 1;
    moveBy += direction.current * moveBy * Math.abs(scrolling);
    baseX.set(baseX.get() + moveBy);
  });
  return (
    <div
      aria-hidden
      className={`fx-marquee relative w-full overflow-hidden border-y border-ink/10 py-7 ${className}`}>
      <motion.div style={{ x }} className="flex w-max flex-nowrap">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="flex shrink-0 items-center">
            {words.map((word) => (
              <span key={word} className="flex shrink-0 items-center">
                <span className="px-8 font-display text-[7vw] font-semibold uppercase leading-none tracking-[-0.03em] text-ink/25 lg:text-[4vw]">
                  {word}
                </span>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold/50" />
              </span>
            ))}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 28, restDelta: 0.001 });
  const markerTop = useTransform(progress, v => `${Math.max(0, Math.min(100, v * 100))}%`);
  const percent = useTransform(progress, v => `${String(Math.round(Math.max(0, Math.min(1, v)) * 100)).padStart(2, "0")}%`);

  // Un solo indicador de lectura: sin lista de capítulos ni barra horizontal.
  return (
    <div aria-hidden="true" className="pointer-events-none fixed right-[10px] top-1/2 z-[60] flex -translate-y-1/2 flex-col items-center gap-3 sm:right-6">
      <div className="relative h-[122px] w-[3px] rounded-full bg-[#a7b7cc]/20 sm:h-[180px]">
        <motion.div
          style={{ scaleY: progress }}
          className="absolute inset-0 origin-top rounded-full bg-gradient-to-b from-[#b7c6d9] via-[#64baff] to-[#0370ff] shadow-[0_0_12px_rgba(76,163,255,.4)]"
        />
        <motion.span
          style={{ top: markerTop }}
          className="absolute left-1/2 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#c8dcee] bg-[#59baff] shadow-[0_0_12px_rgba(67,172,255,.65)]"
        />
      </div>
      <motion.span className="font-mono text-[9px] font-medium tracking-[.04em] text-[#afbdd3]/80">{percent}</motion.span>
    </div>
  );
}
export function Counter({ to, suffix }: { to: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null),
    inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const reduced = useReducedMotion(),
    [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(to);
      return;
    }
    const controls = animate(0, to, {
      duration: 1.6,
      ease: EASE,
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to, reduced]);
  return (
    <span ref={ref} className="tabular-nums">
      {value}
      {suffix}
    </span>
  );
}
export function Drift({ className, distance = 90 }: { className: string; distance?: number }) {
  const ref = useRef<HTMLDivElement>(null),
    reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [distance, -distance]);
  return (
    <div ref={ref} aria-hidden className={`pointer-events-none absolute ${className}`}>
      <motion.span
        style={{ y }}
        className="block h-full w-full rounded-full bg-gold/8 blur-[80px]"
      />
    </div>
  );
}
