"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import {
  BLOCKS,
  BLOCK_COUNT,
  STEPS,
  STOP_T as STOPS,
  blockIndexAt,
  capFor,
  keyFromHash,
  nearestStop,
  stageIndexAt,
  stepIndex,
  stepInBlock,
  unlockedBefore,
  type BlockId,
} from "./tourTimeline";
import "./RoomIntro.css";

const CinematicTour = dynamic(() => import("./CinematicTour"), {
  ssr: false,
  loading: () => <div className="fx-room-intro-loading">
    LOADING USER FX ROOM…
  </div>,
});

type Action = { title: string; sub: string; arrow: string; run: () => void };

// ── Enlaces (cambia aquí a dónde lleva cada botón) ──
const BOT_URL = "https://t.me/User18Fx_bot";
const LINKS = {
  gallery: "#/private-room/gallery", // botón "My gallery"
  gotCode: "#/private-room/gallery", // botón "Got code" (pantalla de username de Telegram)
  multimedia: "#/private-room/gallery", // botón "Multimedia" (enlace a tu galería dentro de priv room)
} as const;

// ── Intro (steps 0..2) ──
const INTRO = [
  { title: "WELCOME", accent: "MY ROOM",  sub: "A PRIVATE WORLD AWAITS",  body: "Comienza el recorrido. Cada paso revela una parte de USER FX." },
  { title: "THE",     accent: "CORRIDOR", sub: "THE JOURNEY CONTINUES",   body: "Un pasillo de arte, reflejos y luz cálida conduce a tu habitación." },
  { title: "ENTER",   accent: "MY ROOM",  sub: "WELCOME TO YOUR SPACE",   body: "Deja atrás el pasillo y descubre el interior de MY ROOM." },
] as const;

// ── Contenido de cada bloque (se muestra en su último step, el de botones) ──
const COPY: Record<BlockId, { short: string; badge: string; title: ReactNode; subtitle: string }> = {
  "laptop-gallery": {
    short: "GALLERY",
    badge: "01  PUBLIC ARCHIVE / LAPTOP 01",
    title: <>Mis fotos<br />públicas.</>,
    subtitle: "Una selección editorial abierta. Cambia de fotografía, amplía la imagen o continúa hacia la siguiente habitación.",
  },
  "tv-videocall": {
    short: "VIDEOCALL",
    badge: "02  ONE TO ONE / TV 01",
    title: <>ᴊᴜsᴛ 𝕐𝕆𝕌<br />🜲ᴀɴᴅ 𝕄𝔼</>,
    subtitle: "La cámara se traslada a la cama y mira hacia la pantalla. Las videollamadas y los canales se gestionan directamente desde Telegram.",
  },
  "laptop-multimedia": {
    short: "MULTIMEDIA",
    badge: "03  OTRA EXPERIENCIA / LAPTOP 01",
    title: <>ᴄᴏᴍᴍᴜɴɪᴛʏ<br />𝕄𝔼𝔻𝕀𝔸</>,
    subtitle: "Otra experiencia inmersiva para explorar contenido adicional dentro del recorrido.",
  },
  "tv-stage": {
    short: "STAGE",
    badge: "04  LIVE STAGE / TV 01",
    title: <>The room<br />is your 𝕊𝕋𝔸𝔾𝔼.</>,
    subtitle: "El recorrido termina frente a la pantalla principal, donde la pasarela se vuelve el foco.",
  },
};

const STEP_LABEL = (key: string, kind: string) =>
  kind === "focus" ? "ENFOQUE" : kind === "lock" ? "OPCIONES" : key.endsWith("-a") ? "ÁNGULO A" : "ÁNGULO B";

// Puzzle: desde dónde llega cada pieza (x, y en px · rotación en grados · retardo de entrada / salida en s · z)
const pv = (x: number, y: number, r: number, d: number, dOut: number, z: number, kx = 50): CSSProperties =>
  ({
    "--px": `${x}px`, "--py": `${y}px`, "--pr": `${r}deg`,
    "--pd": `${d}s`, "--pdo": `${dOut}s`, "--z": z, "--kx": `${kx}%`,
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

  // Bloques desbloqueados (0..3). La referencia la leen los listeners sin re-suscribirse.
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

  // El step cambia cuando la cámara llega a la pausa (misma fuente que la cámara).
  const index = stageIndexAt(progress);
  const step = STEPS[index];
  const blockIdx = blockIndexAt(index);
  const block = blockIdx >= 0 ? BLOCKS[blockIdx] : null;
  const showRoomUI = blockIdx >= 0;
  const isLockStep = step.kind === "lock";
  const locked = isLockStep && unlocked <= blockIdx;

  // ── Scroll programático ──
  const scrollToProgress = useCallback((t: number, behavior?: "auto" | "smooth") => {
    const el = section.current;
    if (!el) return;
    const range = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY + Math.max(0, Math.min(1, t)) * range;
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

  // ── Bloqueo ──
  const unlock = useCallback((n: number) => {
    const next = Math.max(unlockedRef.current, Math.min(BLOCK_COUNT, n));
    if (next === unlockedRef.current) return;
    unlockedRef.current = next;
    setUnlocked(next);
    setHintOn(false);
    try { window.sessionStorage.setItem(UNLOCK_KEY, String(next)); } catch { /* sin storage */ }
  }, []);

  // Restaurar el progreso desbloqueado ANTES de registrar el clamp (orden de efectos).
  useEffect(() => {
    try {
      const saved = Number(window.sessionStorage.getItem(UNLOCK_KEY));
      if (Number.isFinite(saved) && saved > 0) {
        unlockedRef.current = Math.min(BLOCK_COUNT, Math.floor(saved));
        setUnlocked(unlockedRef.current);
      }
    } catch { /* sin storage */ }
  }, []);

  // Leyenda + sacudida cuando el usuario intenta pasar del step bloqueado.
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
    }
  }, []);

  useEffect(() => () => {
    window.clearTimeout(hintTimer.current);
    window.clearTimeout(shakeTimer.current);
  }, []);

  // El tope de scroll: mientras un bloque siga bloqueado no se puede pasar de su step de botones.
  useEffect(() => {
    const read = () => {
      const el = section.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const range = el.offsetHeight - window.innerHeight;
      if (range <= 0) return null;
      return { r, range, p: -r.top / range };
    };
    const clampNow = () => {
      const cap = capFor(unlockedRef.current);
      if (!Number.isFinite(cap)) return;
      const s = read();
      if (!s) return;
      // Si ya está muy por debajo de la sección (ancla, recarga) no lo arrastramos de vuelta.
      const farBelow = s.r.bottom < -window.innerHeight * 0.5;
      if (s.r.top <= 0 && !farBelow && s.p > cap + 0.0008) {
        const top = s.r.top + window.scrollY + cap * s.range;
        window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
        nudge();
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY <= 0 || e.ctrlKey) return;
      const cap = capFor(unlockedRef.current);
      if (!Number.isFinite(cap)) return;
      const s = read();
      if (!s || s.r.top > 0) return;
      if (s.p >= cap - 0.0015) {
        e.preventDefault();
        nudge();
      }
    };
    clampNow();
    window.addEventListener("scroll", clampNow, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("scroll", clampNow);
      window.removeEventListener("wheel", onWheel);
    };
  }, [nudge]);

  // ── Ir a un step (enlaces) ──
  const goToStep = useCallback((key: string, opts?: { force?: boolean; behavior?: "auto" | "smooth" }) => {
    const i = stepIndex(key);
    if (i < 0) return;
    if (opts?.force) unlock(unlockedBefore(i));
    scrollToProgress(STOPS[i], opts?.behavior);
  }, [scrollToProgress, unlock]);

  // Enlaces: #tour/<key> y el evento "fx:tour-goto" ({ detail: { key } }).
  useEffect(() => {
    const fromHash = (behavior: "auto" | "smooth") => {
      const key = keyFromHash(window.location.hash);
      if (key) goToStep(key, { force: true, behavior });
    };
    const onHash = () => fromHash("smooth");
    const onGoto = (e: Event) => {
      const key = (e as CustomEvent<{ key?: string }>).detail?.key;
      if (key) goToStep(key, { force: true });
    };
    const raf = window.requestAnimationFrame(() => fromHash("auto"));
    window.addEventListener("hashchange", onHash);
    window.addEventListener("fx:tour-goto", onGoto);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("fx:tour-goto", onGoto);
    };
  }, [goToStep]);

  // ── Acciones ──
  const openBot = useCallback(() => window.open(BOT_URL, "_blank", "noopener,noreferrer"), []);
  const goHash = useCallback((h: string) => { window.location.hash = h; }, []);

  // "Continuar": libera el bloque y avanza al siguiente step (o sale de la sección).
  const advance = useCallback(() => {
    if (!block) return;
    unlock(blockIdx + 1);
    if (blockIdx >= BLOCK_COUNT - 1) leaveSection();
    else scrollToProgress(STOPS[block.lock + 1]);
  }, [block, blockIdx, unlock, leaveSection, scrollToProgress]);

  const actions: Action[] = useMemo(() => {
    if (!block) return [];
    switch (block.id) {
      case "laptop-gallery":
        return [
          { title: "Continuar", sub: "Seguir hacia Videocall", arrow: "→", run: advance },
          { title: "Get code", sub: "Solicitarlo en el bot de Telegram", arrow: "↗", run: openBot },
          { title: "My gallery", sub: "Abrir mi galería privada", arrow: "↗", run: () => goHash(LINKS.gallery) },
        ];
      case "tv-videocall":
        return [
          { title: "Continuar", sub: "Seguir hacia Multimedia", arrow: "→", run: advance },
          { title: "Videocall", sub: "Abrir videollamada en mi bot", arrow: "↗", run: openBot },
          { title: "Channels", sub: "Consultar canales en Telegram", arrow: "↗", run: openBot },
        ];
      case "laptop-multimedia":
        return [
          { title: "Continuar", sub: "Seguir hacia Stage", arrow: "→", run: advance },
          { title: "Get code", sub: "Solicitar acceso en el bot", arrow: "↗", run: openBot },
          { title: "Multimedia", sub: "Reproducir experiencia", arrow: "↗", run: () => goHash(LINKS.multimedia) },
        ];
      case "tv-stage":
        return [
          { title: "Continuar scroll", sub: "Seguir bajando", arrow: "↓", run: advance },
          { title: "Get code", sub: "Solicitarlo en el bot de Telegram", arrow: "↗", run: openBot },
          { title: "Got code", sub: "Ya tengo mi código · abrir acceso", arrow: "↗", run: () => goHash(LINKS.gotCode) },
        ];
    }
  }, [block, advance, openBot, goHash]);

  // ── Puzzle: se arma al llegar al step de botones y se desarma al salir ──
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

  // El puzzle se dibuja con los datos de SU bloque (también mientras se desarma).
  const pzBlock = puzzle ? BLOCKS[puzzle.block] : null;
  const pzCopy = pzBlock ? COPY[pzBlock.id] : null;
  const pzActions: Action[] = puzzle && block && puzzle.block === blockIdx ? actions : [];
  const pzActionsRef = useRef<Action[]>([]);
  if (pzActions.length) pzActionsRef.current = pzActions;
  const pzList = pzActions.length ? pzActions : pzActionsRef.current;
  const pzLocked = puzzle ? unlocked <= puzzle.block : false;

  // ── Magnetismo: al dejar de hacer scroll, asienta en el stop cercano ──
  useEffect(() => {
    let timer = 0;
    let pointerDown = false;
    const inRange = () => {
      const el = section.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const range = el.offsetHeight - window.innerHeight;
      if (range <= 0 || r.top > 0 || r.bottom < window.innerHeight) return null;
      return Math.max(0, Math.min(1, -r.top / range));
    };
    const fire = () => {
      if (pointerDown) { timer = window.setTimeout(fire, SNAP_DELAY); return; }
      const p = inRange();
      if (p === null) return;
      const i = nearestStop(p);
      if (i === 0 || i === STOPS.length - 1) return; // no pelear con la salida de la sección
      const d = Math.abs(STOPS[i] - p);
      if (d > 0.002 && d < SNAP_RANGE) scrollToProgress(STOPS[i]);
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(fire, SNAP_DELAY);
    };
    const down = () => { pointerDown = true; };
    const up = () => { pointerDown = false; };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("pointercancel", up, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [scrollToProgress]);

  // ── Atajos: 1/2/3 opción · Enter continuar (solo en el step de botones) ──
  const live = useRef({ actions, active: false });
  live.current = { actions, active: isLockStep };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = section.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top > 0 || r.bottom < window.innerHeight * 0.5) return;
      const { actions: acts, active } = live.current;
      if (!active) return;
      if (e.key === "1" || e.key === "2" || e.key === "3") {
        acts[Number(e.key) - 1]?.run();
      } else if (e.key === "Enter" && !(t && (t.tagName === "BUTTON" || t.tagName === "A"))) {
        acts[0]?.run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const intro = INTRO[Math.min(index, INTRO.length - 1)];

  return (
    <section
      className={`fx-room-intro${locked ? " is-locked" : ""}`}
      ref={section}
      id="home"
      aria-label="USER FX continuous cinematic 3D tour"
      data-step={step.key}
    >
      <div className="fx-room-intro-sticky">
        <CinematicTour progress={progress} />
        <div className="fx-room-intro-shade" aria-hidden="true" />

        {!showRoomUI && (
          <>
            <div className="fx-room-intro-head">
              <span>
USER FX / PRIVATE WORLD
</span>
              <nav aria-label="Tour sections">
GALLERY / STAGE / CALLS / PROTOCOL
</nav>
            </div>
            {index !== 1 && (
              <div className="fx-room-intro-copy" key={index}>
                <small>{String(index + 1).padStart(2, "0")} / CINEMATIC JOURNEY</small>
                <h1>
                  <span className="fx-t-chrome">
{intro.title}
</span>{" "}
                  <strong>
{intro.accent}
</strong>
                </h1>
                <p>
{intro.sub}
</p>
                <p className="fx-room-intro-description">
{intro.body}
</p>
              </div>
            )}
            {index > 0 && index !== 1 && (
              <div className="fx-room-intro-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </div>
            )}
          </>
        )}

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
                  <button
                    key={b.id}
                    className={`nav-item ${blockIdx === i ? "active" : ""}`}
                    onClick={() => scrollToProgress(STOPS[b.first])}
                  >
                    {String(b.number).padStart(2, "0")} {COPY[b.id].short.charAt(0) + COPY[b.id].short.slice(1).toLowerCase()}
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

            {/* Steps vacíos y de enfoque: solo una etiqueta discreta */}
            {!isLockStep && (
              <div className="fx-step-tag" key={step.key}>
                <span className="fx-step-tag-block">
{COPY[block.id].short}
</span>
                <span className="fx-step-tag-label">
{STEP_LABEL(step.key, step.kind)}
</span>
                <span className="fx-step-tag-count">
                  {String(stepInBlock(index)).padStart(2, "0")} / 04
                </span>
              </div>
            )}

            {/* Navegación cinematográfica por capítulos, sin la columna de 12 puntos. */}
            <nav className="fx-step-rail" aria-label="Capítulos del recorrido">
              <span className="fx-rail-caption">EXPLORE / 03</span>
              {BLOCKS.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  className={`fx-chapter-item${blockIdx === i ? " is-active" : ""}`}
                  onClick={() => goToStep(STEPS[b.first].key)}
                  aria-label={`Ir a ${COPY[b.id].short}`}
                  aria-current={blockIdx === i ? "step" : undefined}
                >
                  <span className="fx-chapter-number">{String(i + 1).padStart(2, "0")}</span>
                  <span className="fx-chapter-label">{COPY[b.id].short}</span>
                  <span className="fx-chapter-track" aria-hidden="true">
                    <span style={{ width: `${blockIdx > i ? 100 : blockIdx === i ? stepInBlock(index) * 25 : 0}%` }} />
                  </span>
                </button>
              ))}
              <span className="fx-rail-caption fx-rail-caption--foot">SCROLL TO EXPLORE</span>
            </nav>

            {/* Step de botones: texto y botones como piezas que encajan */}
            {puzzle && pzCopy && pzBlock && (
              <div
                className={`fx-puzzle is-${puzzle.phase} ${pzLocked ? "is-locked" : "is-open"}${shake ? " is-shake" : ""}`}
                key={`pz-${puzzle.block}`}
                role="group"
                aria-label={`${pzCopy.short} — opciones`}
              >
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
SELECCIONA UNA OPCIÓN
</span>
                    <span className="fx-menu-counter">
                      {String(pzBlock.number).padStart(2, "0")} / {String(BLOCK_COUNT).padStart(2, "0")}
                    </span>
                    <span className="fx-lock-chip">
                      <LockIcon />
                      {pzLocked ? "SCROLL BLOQUEADO" : "SCROLL LIBRE"}
                    </span>
                  </div>
                  {pzList.map((a, i) => (
                    <button
                      key={a.title}
                      className={`fx-piece fx-piece--item${i < pzList.length - 1 ? " fx-piece--knob" : ""}${i === 0 ? " is-primary" : ""}`}
                      style={pv(170, i % 2 ? 50 : -30, i % 2 ? -6 : 5, 0.13 + i * 0.09, 0.2 - i * 0.07, 7 - i, i % 2 ? 26 : 74)}
                      onClick={a.run}
                      tabIndex={puzzle.phase === "in" ? 0 : -1}
                    >
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
                      <span className="menu-arrow">
{a.arrow}
</span>
                    </button>
                  ))}
                </aside>
              </div>
            )}

            <div className={`fx-lock-hint${hintOn && locked ? " is-on" : ""}`} role="status" aria-live="polite">
              <LockIcon />
              <span>
                <strong>
Presiona un botón para continuar
</strong>
                <small>¿Deseas avanzar? Elige «{actions[0]?.title ?? "Continuar"}»</small>
              </span>
            </div>

            <div className="fx-footer-controls">
              {locked ? (
                <span className="is-locked-text">
SCROLL BLOQUEADO · PULSA CONTINUAR
</span>
              ) : (
                <span>
SCROLL PARA AVANZAR
</span>
              )}
              {isLockStep && (
                <>
                  <span><kbd>
1
</kbd>
<kbd>
2
</kbd>
<kbd>
3
</kbd> PARA ELEGIR</span>
                  <span><kbd>
↵
</kbd> CONTINUAR</span>
                </>
              )}
            </div>
            <button className="fx-btn-exit" onClick={() => scrollToProgress(0)}>
SALIR
</button>
          </div>
        )}

        <div className="fx-room-intro-progress" aria-hidden="true">
          <motion.div style={{ scaleX: scrollYProgress }} />
        </div>
      </div>
    </section>
  );
}