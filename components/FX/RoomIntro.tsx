"use client";
import { useCallback, useEffect, useMemo, useRef, useState,
  type CSSProperties, type ReactNode, } from "react";
import dynamic from "next/dynamic";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { BLOCKS, BLOCK_COUNT, STEPS, STOP_T as STOPS, stepIndex, stepAt, type BlockId, type StepKey,
} from "./tourTimeline";
import { jumpToPosition } from "./Motion";
import "./RoomIntro.css"; // <--- IMPORTANTE: Sin esto, el texto se ve sin estilo
const CinematicTour = dynamic(() => import("./CinematicTour"), {
  ssr: false,
  loading: () => <div className="fx-room-intro-loading">
    LOADING USER FX ROOM…
  </div>,
});
type Action = { title: string; sub: string; arrow: string; run: () => void };
const BOT_URL = "https://t.me/User18Fx_bot";
const LINKS = {
  gotCode: "#/private-room/gallery",
  multimedia: "#/private-room/gallery",
} as const;
const COPY: Record<BlockId, { short: string; badge: string; title: ReactNode; subtitle: string }> =
           {
           gallery
           :{
           short: "GALLERY",
           badge: "01  PUBLIC ARCHIVE / LAPTOP 01",
           title: (
           <>
           My photos
           <br />
           on display.
           </>
           ),
           subtitle: "Explore the collection. Switch photos, zoom in, or keep moving through the room.",},
           videocall: {
           short: "VIDEOCALL",
           badge: "02  ONE TO ONE / TV 01",
           title: (
           <>
           ᴊᴜsᴛ 𝕐𝕆𝕌
           <br />
           🜲ᴀɴᴅ 𝕄𝔼
           </>
           ),
           subtitle:
           "Get closer. Video calls and private channels are handled directly through Telegram.",},
           multimedia: {
           short: "MULTIMEDIA",
           badge: "03  NEXT EXPERIENCE / LAPTOP 01",
           title: (
           <> 
           ᴄᴏᴍᴍᴜɴɪᴛʏ
           <br />
           𝕄𝔼𝔻𝕀𝔸
           </>
           ),
           subtitle: "A whole new angle. More visuals, more to explore.",},
           stage: { short: "STAGE",
           badge: "04  LIVE STAGE / TV 01",
           title: (
           <>
           The room
           <br />
           is your 𝕊𝕋𝔸𝔾𝔼.
           </>
           ),
           subtitle: "The final stop puts the spotlight on the main screen and the live stage.",
  },};
const STEP_LABEL = (key: string, kind: string) =>
  kind === "focus"
    ? "FOCUS"
    : kind === "lock"
      ? "OPTIONS"
      : key.endsWith("-a")
        ? "ANGLE A"
        : "ANGLE B";
const pv = (
  x: number,
  y: number,
  r: number,
  d: number,
  dOut: number,
  z: number,
  kx = 50,
): CSSProperties =>
  ({"--px": `${x}px`,
    "--py": `${y}px`,
    "--pr": `${r}deg`,
    "--pd": `${d}s`,
    "--pdo": `${dOut}s`,
    "--z": z,
    "--kx": `${kx}%`,
  }) as CSSProperties;
const SNAP_RANGE = 0.03;
const SNAP_DELAY = 140;
const UNLOCK_KEY = "fx-tour-unlocked";
const LockIcon = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-.5V4.5A3.5 3.5 0 0 0 8 1Zm-2 3.5a2 2 0 1 1 4 0V6H6V4.5Z" />
  </svg>
);
export default function RoomIntro() {
  const section = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const lastProgress = useRef(0);
  const [unlocked, setUnlocked] = useState(0);
  const unlockedRef = useRef(0);
  const [hintOn, setHintOn] = useState(false);
  const [shake, setShake] = useState(false);
  const hintTimer = useRef(0);
  const shakeTimer = useRef(0);
  const lastShake = useRef(0);
  const { scrollYProgress } = useScroll({
    target: section,
    offset: ["start start", "end end"],
  });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const p = Math.max(0, Math.min(1, v));
    if (Math.abs(p - lastProgress.current) < 0.0004 && p > 0 && p < 1) return;
    lastProgress.current = p;
    setProgress(p);
  });
// Datos derivados del step actual
  const currentStepObj = stepAt(progress);
  const index = currentStepObj.index;
  const step = STEPS[index];
// Calculamos el bloque (0 a 3). Si index < 3, es la intro (corredor).
  const blockIdx = Math.max(0, Math.floor((index - 3) / 4));
  const block = BLOCKS[blockIdx] || null;
// MOSTRAR UI SOLO CUANDO ENTRAMOS A LA HABITACIÓN (index >= 3)
  const showRoomUI = index >= 3 && block !== null;
  const isLockStep = step.kind === "lock";
  const locked = isLockStep && unlocked <= blockIdx;
  const scrollToProgress = useCallback((t: number, behavior?: "auto" | "smooth") => {
    const el = section.current;
    if (!el) return;
    const range = el.offsetHeight - window.innerHeight;
    const top =
      el.getBoundingClientRect().top + window.scrollY + Math.max(0, Math.min(1, t)) * range;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: behavior ?? (reduced ? "auto" : "smooth") });
  }, []);
  const leaveSection = useCallback(() => {
    const el = section.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY + el.offsetHeight;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  }, []);
  const unlock = useCallback((n: number) => {
    const next = Math.max(unlockedRef.current, Math.min(BLOCK_COUNT, n));
    if (next === unlockedRef.current) return;
    unlockedRef.current = next;
    setUnlocked(next);
    setHintOn(false);
    try {
      window.sessionStorage.setItem(UNLOCK_KEY, String(next));
    } catch {
/* ignore */
    }}, []);
  useEffect(() => {
    try {
      const saved = Number(window.sessionStorage.getItem(UNLOCK_KEY));
      if (Number.isFinite(saved) && saved > 0) {
        unlockedRef.current = Math.min(BLOCK_COUNT, Math.floor(saved));
        setUnlocked(unlockedRef.current);
      }} catch {
/* ignore */
    }}, []);
  const nudge = useCallback(() => {
    setHintOn(true);
    window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHintOn(false), 2600);
    const now = performance.now();
    if (now - lastShake.current > 700) {
      lastShake.current = now;
      setShake(true);
      window.clearTimeout(shakeTimer.current);
      shakeTimer.current = window.setTimeout(() => setShake(false), 480);
    }}, []);
  useEffect(
    () => () => {
      window.clearTimeout(hintTimer.current);
      window.clearTimeout(shakeTimer.current);
    },[],);
  // Bloqueo de scroll
  useEffect(() => {
    const read = () => {
    const el = section.current;
      if (!el) return null;
    const r = el.getBoundingClientRect();
    const range = el.offsetHeight - window.innerHeight;
      if (range <= 0) return null;
      return { r, range, p: -r.top / range };
    };
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY <= 0 || e.ctrlKey) return;
      const s = read();
      if (!s || s.r.top > 0) return;
      const currentBlock = BLOCKS[Math.max(0, Math.floor((stepAt(s.p).index - 3) / 4))];
      if (
        currentBlock &&
        s.p >= STOPS[currentBlock.lock] - 0.0015 &&
        unlockedRef.current <= currentBlock.number - 1
      ) {
        e.preventDefault();
        nudge();
  }};
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [nudge]);
  const goToStep = useCallback(
    (key: string, opts?: { force?: boolean; behavior?: "auto" | "smooth" }) => {
      if (!STEPS.some((s) => s.key === key)) return;
      const i = stepIndex(key as StepKey);
      if (opts?.force) unlock(unlockedRef.current + 1);
      scrollToProgress(STOPS[i], opts?.behavior);
  },[scrollToProgress, unlock],
  );
  useEffect(() => {
    const fromHash = (behavior: "auto" | "smooth") => {
      const match = /^#\/?tour\/([^/?#]+)/.exec(window.location.hash);
      let key: string | null = null;
      if (match) {
        try {
          const decoded = decodeURIComponent(match[1]);
          key = STEPS.some((s) => s.key === decoded) ? decoded : null;
    } catch { key = null;
    }}
      if (key) goToStep(key, { force: true, behavior });
    };
    const onHash = () => fromHash("smooth");
    const raf = window.requestAnimationFrame(() => fromHash("auto"));
    window.addEventListener("hashchange", onHash);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("hashchange", onHash);
  };
  }, [goToStep]);
  useEffect(() => {
    const jump = (event: Event) => {
      const key = (event as CustomEvent<{ key?: string }>).detail?.key;
      if (!key || !STEPS.some((item) => item.key === key)) return;
      const target = STEPS[stepIndex(key as StepKey)];
      const targetBlock = BLOCKS.find((item) => item.id === target.block);
      if (targetBlock) unlock(targetBlock.number);
      const el = section.current;
      if (!el) return;
      const range = Math.max(0, el.offsetHeight - window.innerHeight);
      const top = el.getBoundingClientRect().top + window.scrollY + STOP_T[stepIndex(key as StepKey)] * range;
      jumpToPosition(top);
    };
    window.addEventListener("fx:tour-jump", jump);
    return () => window.removeEventListener("fx:tour-jump", jump);
  }, [unlock]);
  const openBot = useCallback(() => window.open(BOT_URL, "_blank", "noopener,noreferrer"), []);
  const openBotCommand = useCallback(
    (command: "gallery" | "getcode" | "videocall" | "channels") => {
      window.open(BOT_URL + "?start=" + command, "_blank", "noopener,noreferrer");
  },[],);
  const goHash = useCallback((h: string) => {
    window.location.hash = h;
  }, []);
  const advance = useCallback(() => {
    if (!block) return;
    unlock(blockIdx + 1);
    if (blockIdx >= BLOCK_COUNT - 1) leaveSection();
    else scrollToProgress(STOPS[block.lock + 1] || 1);
  }, [block, blockIdx, unlock, leaveSection, scrollToProgress]);
  const actions: Action[] = useMemo(() => {
    if (!block) return [];
    switch (block.id) {
      case "gallery":
        return [
          { title: "Continue", sub: "Up next: Video Call", arrow: "⬆️", run: advance },
          { title: "Get code",
            sub: "Get your code from the Telegram bot",
            arrow: "↗",
            run: () => openBotCommand("getcode"),},
          { title: "My gallery",
            sub: "Open the public gallery in Telegram",
            arrow: "↗",
            run: () => openBotCommand("gallery"),},
        ];
      case "videocall":
        return [
          { title: "Continue", sub: "Up next: Multimedia", arrow: "⬆️→", run: advance },
          { title: "Videocall",
            sub: "Start a video call in Telegram",
            arrow: "↗",
            run: () => openBotCommand("videocall"),},
          { title: "Channels",
            sub: "Browse Telegram channels",
            arrow: "↗",
            run: () => openBotCommand("channels"),},
        ];
      case "multimedia":
        return [
          { title: "Continue", sub: "Up next: Stage", arrow: "⬆️", run: advance },
          { title: "Get code",
            sub: "Get access through the bot",
            arrow: "↗",
            run: () => openBotCommand("getcode"),},
          { title: "Multimedia",
            sub: "Launch the experience",
            arrow: "↗",
            run: () => goHash(LINKS.multimedia),},
        ];
      case "stage":
        return [
          { title: "Keep scrolling", sub: "Explore what's next", arrow: "⬆️", run: advance },
          { title: "Get code",
            sub: "Get your code from the Telegram bot",
            arrow: "↗",
            run: () => openBotCommand("getcode"),},
          { title: "Got code",
            sub: "Already have a code? Enter here",
            arrow: "↗",
            run: () => goHash(LINKS.gotCode),},
  ];
      default:
      return [];
  }
  }, [block, advance, openBotCommand, goHash]);
  const [puzzle, setPuzzle] = useState<{ block: number; phase: "in" | "out" } | null>(null);
  const outTimer = useRef(0);
  useEffect(() => {
    window.clearTimeout(outTimer.current);
    if (step.kind === "lock" && blockIdx >= 0) {
      setPuzzle({ block: blockIdx, phase: "in" });
  } else {
      setPuzzle((p) => (p ? { ...p, phase: "out" } : p));
      outTimer.current = window.setTimeout(() => setPuzzle(null), 900);
  }
    return () => window.clearTimeout(outTimer.current);
  }, [index, step.kind, blockIdx]);
  const pzBlock = puzzle ? BLOCKS[puzzle.block] : null;
  const pzCopy = pzBlock ? COPY[pzBlock.id] : null;
  const pzActions = puzzle && block && puzzle.block === blockIdx ? actions : [];
  const pzActionsRef = useRef<Action[]>([]);
  if (pzActions.length) pzActionsRef.current = pzActions;
  const pzList = pzActions.length ? pzActions : pzActionsRef.current;
  const pzLocked = puzzle ? unlocked <= puzzle.block : false;
  const live = useRef({ actions, active: isLockStep });
  live.current = { actions, active: isLockStep };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const { actions: acts, active } = live.current;
      if (!active) return;
      if (e.key === "1" || e.key === "2" || e.key === "3") acts[Number(e.key) - 1]?.run();
      else if (e.key === "Enter" && !(t && (t.tagName === "BUTTON" || t.tagName === "A")))
        acts[0]?.run();
  };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void document.documentElement.requestFullscreen?.().catch(() => { });
  }, []);
        return (
               <section className={`fx-room-intro${locked ? " is-locked" : ""}`} ref={section} id="home" aria-label="USER FX continuous cinematic 3D tour"  data-step={step.key}>
               <div className="fx-room-intro-sticky">
               <CinematicTour progress={progress} />
               <div className="fx-room-intro-shade" aria-hidden="true" />
                {showRoomUI && block && (
               <div className="fx-room-ui">
               <header className="fx-header">
               <div className="fx-logo">
               <strong>
                  USER FX
               </strong>
               <span>
                  PRIVATE ROOM
               </span>
               </div>
               <div className="fx-nav-center">
               {BLOCKS.map((b, i) => (
               <button key={b.id} className={`nav-item ${blockIdx === i ? "active" : ""}`} onClick={() => scrollToProgress(STOPS[b.first])}>
               {String(b.number).padStart(2, "0")}{" "}
               {COPY[b.id].short.charAt(0) + COPY[b.id].short.slice(1).toLowerCase()}
              </button>
                ))}
              </div>
              <div className="fx-nav-right">
              <button className="nav-icon" onClick={openBot}>
               Ayuda
              </button>
              <button className="nav-icon" onClick={toggleFullscreen}>
               Pantalla completa
              </button>
              </div>
              </header>
               {!isLockStep && (
              <div className="fx-step-tag" key={step.key}>
              <span className="fx-step-tag-block">
                {COPY[block.id].short}
              </span>
              <span className="fx-step-tag-label">
               {STEP_LABEL(step.key, step.kind)}
              </span>
              </div>
               )}
               {puzzle && pzCopy && pzBlock && (
              <div className={`fx-puzzle is-${puzzle.phase} ${pzLocked ? "is-locked" : "is-open"}${shake ? " is-shake" : ""}`} key={`pz-${puzzle.block}`}>
              <div className="fx-pz-left">
              <div className="fx-piece fx-piece--knob fx-piece--title" style={pv(-150, -40, -8, 0, 0.1, 3, 68)}>
              <span className="fx-badge">
              {pzCopy.badge}
              </span>
              <h2 className="fx-title">
              {pzCopy.title}
              </h2>
              </div>
              <div className="fx-piece fx-piece--sub" style={pv(-120, 90, 6, 0.1, 0, 2)}>
              <p className="fx-subtitle">
              {pzCopy.subtitle}
              </p>
              </div>
              </div>
              <aside className="fx-pz-menu">
              <div className="fx-piece fx-piece--knob fx-piece--head" style={pv(130, -70, 7, 0.05, 0.3, 8, 72)}>
              <span>      
               CHOOSE YOUR NEXT MOVE
              </span>
              <span className="fx-lock-chip">
              <LockIcon /> {pzLocked ? "SCROLL LOCKED" : "FREE SCROLL"}
              </span>
              </div>
               {pzList.map((a, i) => (
              <button key={a.title} className={`fx-piece fx-piece--item${i < pzList.length - 1 ? " fx-piece--knob" : ""}${i === 0 ? " is-primary" : ""}`} style={pv( 170, i % 2 ? 50 : -30, i % 2 ? -6 : 5, 0.13 + i * 0.09,0.2 - i * 0.07, 7 - i,i % 2 ? 26 : 74, )} onClick={a.run} tabIndex={puzzle.phase === "in" ? 0 : -1}>
              <span className="menu-num">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="menu-text">
              <strong>
                {a.title}
              </strong>
              <small>
                {a.sub}
              </small>
              </span>
              <span className={`menu-arrow${a.title === "Continue" ? " menu-arrow--continue" : " menu-arrow--right"}`}/>
              </button>
                ))}
              </aside>
              </div>
               )}
              <div className={`fx-lock-hint${hintOn && locked ? " is-on" : ""}`} role="status">
              <LockIcon />
              <span>
              <strong>
                  Choose an option to keep going
              </strong>
              <small>Ready for what's next? Select “{actions[0]?.title ?? "Continue"}”</small>
              </span>
              </div>
              <button className="fx-btn-exit" onClick={() => scrollToProgress(0)}>
               SALIR
              </button>
              </div>
               )}
              </div>
              </section>
               );
               }
 