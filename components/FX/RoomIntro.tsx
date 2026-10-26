"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { STOP_T as STOPS, nearestStop, stageIndexAt } from "./tourTimeline";
import "./RoomIntro.css";

const CinematicTour = dynamic(() => import("./CinematicTour"), {
  ssr: false,
  loading: () => <div className="fx-room-intro-loading">
    LOADING USER FX ROOM…
  </div>,
});
type RoomAngle = "bed" | "laptop" | "tv";
type Action = { title: string; sub: string; arrow: string; run: () => void };
const BOT_URL = "https://t.me/User18Fx_bot";
const STAGES = [
  { key: "welcome",    title: "WELCOME",   accent: "MY ROOM",   sub: "A PRIVATE WORLD AWAITS",        body: "Comienza el recorrido. Cada paso revela una parte de USER FX." },
  { key: "inside",     title: "STEP",      accent: "INSIDE",    sub: "FOLLOW THE LIGHT",              body: "Entra despacio. El ambiente y sus detalles marcan el camino." },
  { key: "corridor",   title: "THE",       accent: "CORRIDOR",  sub: "THE JOURNEY CONTINUES",         body: "Un pasillo de arte, reflejos y luz cálida conduce a tu habitación." },
  { key: "enter-room", title: "ENTER",     accent: "MY ROOM",   sub: "WELCOME TO YOUR SPACE",         body: "Deja atrás el pasillo y descubre el interior de MY ROOM." },
  { key: "gallery",    title: "MY",        accent: "GALLERY",   sub: "YOUR PRIVATE COLLECTION",       body: "Descubre tus fotos desde la laptop y recorre la selección." },
  { key: "videocall",  title: "VIDEO",     accent: "CALLS",     sub: "CONNECT IN PRIVATE",            body: "Un lugar para conversar, compartir y encontrarse." },
  { key: "multimedia", title: "MULTI",     accent: "MEDIA",     sub: "ANOTHER EXPERIENCE",            body: "Contenido visual y una experiencia más inmersiva." },
  { key: "stage",      title: "STAGE",     accent: "",          sub: "THE ROOM IS YOUR STAGE",        body: "Una perspectiva amplia, iluminación íntima y tu propio escenario." },
] as const;

const SNAP_RANGE = 0.035;
const SNAP_DELAY = 140;
const ANGLES: RoomAngle[] = ["bed", "laptop", "tv"];
const BADGES: Record<string, string> = {
  gallery: "01  PUBLIC ARCHIVE / LAPTOP 01",
  videocall: "02  ONE TO ONE / FROM THE BED",
  multimedia: "03  OTRA EXPERIENCIA",
  stage: "04  LIVE STAGE / TV 01",
};
const COUNTERS: Record<string, string> = { gallery: "01", videocall: "02", multimedia: "03", stage: "04" };
const TITLES: Record<string, ReactNode> = {
  gallery: <>Mis fotos<br />públicas.</>,
  videocall: <>Solo tú<br />y yo.</>,
  multimedia: <>Contenido<br />multimedia.</>,
  stage: <>The room<br />is your stage.</>,
};
const SUBTITLES: Record<string, string> = {
  gallery: "Una selección editorial abierta. Cambia de fotografía, amplía la imagen o continúa hacia la siguiente habitación.",
  videocall: "La cámara se traslada a la cama y mira hacia la pantalla. Las videollamadas y los canales se gestionan directamente desde Telegram.",
  multimedia: "Otra experiencia inmersiva para explorar contenido adicional dentro del recorrido.",
  stage: "El recorrido termina frente a la pantalla principal, donde la pasarela se vuelve el foco.",
};
const PRIMARY_LABEL: Record<string, string> = {
  gallery: "Abrir colección",
  videocall: "Abrir acceso privado",
  multimedia: "Abrir multimedia",
  stage: "Entrar a Stage",
};
export default function RoomIntro() {
  const section = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [roomAngle, setRoomAngle] = useState<RoomAngle>("bed");
  const lastProgress = useRef(0);
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
  // El texto cambia cuando la camara llega al hold del stop (misma fuente que la cámara).
  const index = stageIndexAt(progress);
  const stage = STAGES[index];
  const showRoomOverlay = ["gallery", "videocall", "multimedia", "stage"].includes(stage.key);
  // ── Scroll programático a un punto del recorrido ──
  const scrollToProgress = useCallback((t: number) => {
    const el = section.current;
    if (!el) return;
    const range = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY + Math.max(0, Math.min(1, t)) * range;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  }, []);
  const goNext = useCallback(
    () => scrollToProgress(STOPS[Math.min(STOPS.length - 1, index + 1)]),
    [index, scrollToProgress]
  );
  const openBot = useCallback(() => window.open(BOT_URL, "_blank", "noopener,noreferrer"), []);
  const goHash = useCallback((h: string) => { window.location.hash = h; }, []);
  // ── Acciones por stage (menú derecho, atajos 1/2/3, botón principal) ──
  const actions: Action[] = useMemo(() => {
    switch (stage.key) {
      case "gallery":
        return [
          { title: "Avanzar", sub: "Entrar en Videopriv", arrow: "→", run: goNext },
          { title: "Gotcode", sub: "Ya tengo un código-terminal BBC", arrow: "↗", run: () => goHash("#/private-room/gallery") },
          { title: "Get code", sub: "Solicitarlo en el bot de Telegram", arrow: "↗", run: openBot },
        ];
      case "videocall":
        return [
          { title: "Avanzar", sub: "Continuar hacia Multimedia", arrow: "→", run: goNext },
          { title: "Videocall", sub: "Abrir videollamada en mi bot", arrow: "↗", run: openBot },
          { title: "Channels", sub: "Consultar canales en Telegram", arrow: "↗", run: openBot },
        ];
      case "multimedia":
        return [
          { title: "Avanzar", sub: "Ir a Stage", arrow: "→", run: goNext },
          { title: "Multimedia", sub: "Reproducir experiencia", arrow: "↗", run: () => goHash("#/private-room/stage") },
          { title: "Get code", sub: "Solicitar acceso", arrow: "↗", run: openBot },
        ];
      case "stage":
        return [
          { title: "Entrar", sub: "Abrir Stage", arrow: "→", run: () => goHash("#/private-room/stage") },
          { title: "Pasarela", sub: "Reproducir preview", arrow: "↗", run: () => goHash("#/private-room/stage") },
          { title: "Telegram", sub: "Ir al bot", arrow: "↗", run: openBot },
        ];
      default:
        return [];
    }
  }, [stage.key, goNext, goHash, openBot]);

  const primaryAction = useMemo(() => {
    switch (stage.key) {
      case "gallery": return () => goHash("#/private-room/gallery");
      case "videocall": return openBot;
      default: return () => goHash("#/private-room/stage");
    }}, [stage.key, goHash, openBot]);
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
  // ── Atajos de teclado: C ángulo · 1/2/3 opción · Enter confirmar ──
  const live = useRef({ actions, showRoomOverlay, primaryAction });
  live.current = { actions, showRoomOverlay, primaryAction };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = section.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top > 0 || r.bottom < window.innerHeight * 0.5) return;
      const { actions: acts, showRoomOverlay: overlay, primaryAction: primary } = live.current;
      if (!overlay) return;
      if (e.key === "c" || e.key === "C") {
        setRoomAngle((a) => ANGLES[(ANGLES.indexOf(a) + 1) % ANGLES.length]);
      } else if (e.key === "1" || e.key === "2" || e.key === "3") {
        acts[Number(e.key) - 1]?.run();
      } else if (e.key === "Enter" && !(t && (t.tagName === "BUTTON" || t.tagName === "A"))) {
        primary();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  return (
    <section className="fx-room-intro" ref={section} id="home" aria-label="USER FX continuous cinematic 3D tour">
        <div className="fx-room-intro-sticky">
        <CinematicTour progress={progress} stageKey={stage.key} roomAngle={roomAngle}/>
        <div className="fx-room-intro-shade" aria-hidden="true" />
        {!showRoomOverlay && (
        <>
        <div className="fx-room-intro-head">
        <span>
          USER FX / PRIVATE WORLD
        </span>
        <nav aria-label="Tour sections">
          GALLERY / STAGE / CALLS / PROTOCOL
        </nav>
        </div>
        <div className="fx-room-intro-copy" key={index}>
        <small>
          {String(index + 1).padStart(2, "0")}
          / CINEMATIC JOURNEY
        </small>
        <h1>
          {stage.title} <strong>{stage.accent}
        </strong>
        </h1>
        <p>
          {stage.sub}
        </p>
        <p className="fx-room-intro-description">
          {stage.body}
        </p>
        </div>
        <div className="fx-room-intro-index" aria-hidden="true">
         {String(index + 1).padStart(2, "0")}
        </div>
        </>
        )}
        {showRoomOverlay && (
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
        <button className={`nav-item ${stage.key === "gallery" ? "active" : ""}`} onClick={() => scrollToProgress(STOPS[4])}>01 Gallery</button>
        <button className={`nav-item ${stage.key === "videocall" ? "active" : ""}`} onClick={() => scrollToProgress(STOPS[5])}>02 Videopriv</button>
        <button className={`nav-item ${stage.key === "stage" || stage.key === "multimedia" ? "active" : ""}`} onClick={() => scrollToProgress(STOPS[7])}>03 Stage</button>
        </div>
        <div className="fx-nav-right">
        <button className="nav-icon" onClick={openBot}>
          Ayuda
        </button>
        <button className="nav-icon" onClick={toggleFullscreen}>Pantalla completa</button>
        </div>
        </header>
        <div className="fx-content-left" key={stage.key}>
        <span className="fx-badge">
          {BADGES[stage.key]}
        </span>
        <h2 className="fx-title">
          {TITLES[stage.key]}
        </h2>
        <p className="fx-subtitle">
          {SUBTITLES[stage.key]}
        </p>
        <button className="fx-btn-primary" onClick={primaryAction}>
        {PRIMARY_LABEL[stage.key]}
        </button>
        </div>
        <aside className="fx-menu-right" key={`menu-${stage.key}`}>
        <div className="fx-menu-header">
        <span>
          SELECCIONA UNA OPCIÓN
        </span>
        <span className="fx-menu-counter">{COUNTERS[stage.key]} / 04</span>
        </div>
        <div className="fx-menu-list">
          {actions.map((a, i) => (
        <button key={a.title} className={`fx-menu-item ${i === 0 ? "active" : ""}`} onClick={a.run}>
        <span className="menu-num">
          {String(i + 1).padStart(2, "0")}
        </span>
        <span className="menu-text">
        <strong>
          {a.title}
        </strong>
        <small>{a.sub}</small>
        </span>
        <span className="menu-arrow">
          {a.arrow}
        </span>
        </button>
        ))}
        </div>
        </aside>
        <div className="fx-footer-angles">
        <div className="angles-header">
        <span>
          ÁNGULO
        </span>
        <span className="key-hint">
          C
        </span>
        </div>
        <div className="angles-list">
        {([
          ["bed", "01", "Cama"],
          ["laptop", "02", "Cerca"],
          ["tv", "03", "TV"],
        ] as const).map(([id, num, label]) => (
        <button key={id} className={`angle-item ${roomAngle === id ? "active" : ""}`} onClick={() => setRoomAngle(id)}>
        <span className="angle-num">
          {num}
        </span>
        <strong>
          {label}
        </strong>
        </button>
        ))}
        </div>
        </div>
        <div className="fx-footer-controls">
        <span>SCROLL PARA AVANZAR</span>
        <span>
        <kbd>
          1
        </kbd>
        <kbd>
          2
        </kbd>
        <kbd>
          3
        </kbd> 
         PARA ELEGIR
        </span>
        <span>
        <kbd>
          ↵
        </kbd> 
         CONFIRMAR
        </span>
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