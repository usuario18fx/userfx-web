"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { FX } from "@/lib/assets";
import { NAV, ENTER_URL } from "@/lib/content";
import { EASE } from "@/lib/motion";
import { AdminModeSwitch, useAdminMode } from "@/components/PrivateRoom/PR-AdminMode";
import { setSmoothScroll } from "./Motion";

const Context = createContext({ open: false, toggle: () => {}, close: () => {} });
export function useMenu() {
  return useContext(Context);
}
export function MenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const previous = document.body.dataset.locked;
    document.body.dataset.locked = String(open);
    setSmoothScroll(!open);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      setSmoothScroll(true);
      if (previous === undefined) delete document.body.dataset.locked;
      else document.body.dataset.locked = previous;
    };
  }, [open]);
  return (
    <Context.Provider
      value={{ open, toggle: () => setOpen((v) => !v), close: () => setOpen(false) }}>
      {children}
    </Context.Provider>
  );
}
export function Brand({ style }: { style?: CSSProperties }) {
  const admin = useAdminMode();
  return (
    <div className="flex items-center gap-3" style={style}>
      <button
        type="button"
        className="fx-brand flex items-center gap-2"
        aria-label="UserFX · PRIV Vault · User/Admin"
        onClick={() => {
          if (!admin.revealSwitch()) window.location.hash = "#/";
        }}>
        <img src={FX.logo} alt="" width={32} height={26} className="object-contain" />
        <span className="font-wide text-[10px] uppercase tracking-[-.06em]">USER FX</span>
      </button>
      <AdminModeSwitch />
    </div>
  );
}
export function MenuButton({
  width,
  gap,
  className = "",
}: {
  width: string;
  gap: string;
  className?: string;
}) {
  const { open, toggle } = useMenu();
  return (
    <button
      className={`group relative flex flex-col justify-center ${className}`}
      style={{ width, gap, height: `calc(${gap} + 2px)` }}
      type="button"
      onClick={toggle}
      aria-expanded={open}
      aria-controls="site-menu"
      aria-label={open ? "Close menu" : "Open menu"}>
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="block h-px w-full origin-center bg-ink"
          animate={
            open
              ? { rotate: i === 0 ? 45 : -45, y: i === 0 ? "50%" : "-50%" }
              : { rotate: 0, y: "0%" }
          }
          transition={{ duration: 0.4, ease: EASE }}
        />
      ))}
    </button>
  );
}
export function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    const read = () => {
      const line = window.innerHeight / 3;
      let current = ids[0];
      for (const section of sections)
        if (section.getBoundingClientRect().top <= line) current = section.id;
      setActive(current);
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [ids]);
  return active;
}
export function StickyHeader({ active }: { active: string }) {
  const { open } = useMenu(),
    { scrollY } = useScroll();
  const [shown, setShown] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setShown(y > window.innerHeight * 0.75));
  return (
    <AnimatePresence>
      {shown && !open && (
        <motion.header
          initial={{ y: "-100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="fixed inset-x-0 top-0 z-40 border-b border-ink/10 bg-sky/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-6 md:px-10">
            <Brand />
            <nav aria-label="Main navigation" className="hidden items-center gap-10 md:flex">
              {NAV.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  aria-current={active === item.id ? "page" : undefined}
                  className={`font-display text-xs transition-opacity hover:opacity-100 ${active === item.id ? "opacity-100" : "opacity-40"}`}>
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-6">
              <a
                href={ENTER_URL}
                className="hidden rounded-full bg-gold px-5 py-2 text-xs font-semibold text-sky sm:block">
                Enter the Vault
              </a>
              <MenuButton width="22.76px" gap="4.56px" />
            </div>
          </div>
        </motion.header>
      )}
    </AnimatePresence>
  );
}
const panel = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.4, ease: EASE, staggerChildren: 0.05, delayChildren: 0.12 },
  },
  exit: { opacity: 0, transition: { duration: 0.28, ease: EASE, when: "afterChildren" as const } },
};
const row = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  exit: { opacity: 0, y: 12, transition: { duration: 0.2, ease: EASE } },
};
export function MenuOverlay() {
  const { open, close } = useMenu();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() =>
      ref.current?.querySelector<HTMLAnchorElement>("nav a")?.focus(),
    );
    return () => {
      cancelAnimationFrame(frame);
      previous?.focus();
    };
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          id="site-menu"
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-sky/98 px-6 backdrop-blur-2xl md:px-10"
          variants={panel}
          initial="hidden"
          animate="show"
          exit="exit"
          onKeyDown={(e) => {
            if (e.key !== "Tab") return;
            const nodes = Array.from(
              ref.current?.querySelectorAll<HTMLElement>("a[href],button:not([disabled])") ?? [],
            );
            const first = nodes[0],
              last = nodes.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }}>
          <div className="flex min-h-24 items-center justify-between">
            <Brand />
            <MenuButton width="25px" gap="6px" />
          </div>
          <nav
            className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center"
            aria-label="Site menu navigation">
            {NAV.map((item, i) => (
              <motion.a
                key={item.id}
                variants={row}
                href={`#${item.id}`}
                onClick={close}
                className="group flex items-baseline justify-between border-b border-ink/12 py-5 md:py-7">
                <span className="font-display text-[13vw] font-semibold uppercase leading-[.9] tracking-[-.03em] transition-opacity group-hover:opacity-55 md:text-[7vw]">
                  {item.label}
                </span>
                <span className="text-xs tracking-[.2em] text-gold">0{i + 1}</span>
              </motion.a>
            ))}
          </nav>
          <motion.div
            variants={row}
            className="mx-auto flex w-full max-w-[1200px] justify-between gap-8 py-10">
            <p className="max-w-[34ch] text-sm leading-relaxed text-ink/60">
              Your room, the shared stage, your private collection. One verified identity.
            </p>
            <a href="#contact" onClick={close} className="text-xs uppercase tracking-widest">
              Contact us
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
