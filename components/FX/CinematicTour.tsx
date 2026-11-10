"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import {
  ENTER_AT, stepAt, stepIndex, STEPS, STOP_T,
  type StepKey, type StepPhase,
} from "./tourTimeline";
import "./CinematicTour.css";
const LAPTOP_VIDEOS = {
  gallery: "/assets/introFX.mp4", multimedia: "/assets/my-room/multimedia.mp4",
} as const;
type LaptopMode = keyof typeof LAPTOP_VIDEOS;
const TUNING = { smoothTime: 0.58, smoothTimeReduced: 0.06, baseSpeed: 0.38, catchUp: 2.0, speedCeil: 2.1, speedCap: 1.8, entryEase: 0.02, lookAhead: 0.11, lookAheadMax: 0.3, fovKick: 1.05, fovKickMax: 2.4, fadeIn: 1.6, breathSide: 0.006, breathUp: 0.005, lookSway: 0.035, parallax: 0.09, roll: 0.0022, bank: 0.05, bankLambda: 3.0, barMax: 72, barSpeed: 1.1, barLambda: 5.5, vignetteIdle: 0.2, vignetteSpeed: 0.45, lookSettle: 9, } as const;
const CINE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@700&family=Krona+One&family=Orbitron:wght@700&display=swap');

/* ── CAPAS DE AMBIENTE ─────────────────────────────────────────────────── */
.cinematic-tour .ct-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  background: radial-gradient(120% 92% at 50% 46%, rgba(0, 0, 0, 0) 44%, rgba(1, 3, 7, .92) 100%);
}

.cinematic-tour .ct-grain {
  position: absolute;
  inset: -48px;
  pointer-events: none;
  z-index: 3;
  opacity: .055;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='190' height='190'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='190' height='190' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 190px 190px;
  will-change: transform;
  animation: ct-grain .8s steps(5) infinite;
}

@keyframes ct-grain {
  0%   { transform: translate3d(0, 0, 0); }
  20%  { transform: translate3d(-14px, 9px, 0); }
  40%  { transform: translate3d(11px, -13px, 0); }
  60%  { transform: translate3d(-9px, -7px, 0); }
  80%  { transform: translate3d(13px, 11px, 0); }
  100% { transform: translate3d(0, 0, 0); }
}

.cinematic-tour .ct-bar {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 0;
  background: #000;
  pointer-events: none;
  z-index: 4;
  box-shadow: inset 0 1px 0 rgba(140, 220, 255, .10);
}
.cinematic-tour .ct-bar-bottom {
  top: auto;
  bottom: 0;
  box-shadow: inset 0 -1px 0 rgba(140, 220, 255, .10);
}
/* PORTADA */
.cinematic-tour .ct-cover {
  --ct-title: clamp(40px, 10vw, 140px);
  position: absolute !important;
  inset: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  box-sizing: border-box !important;
  padding: 0 4vw !important;
  pointer-events: none !important;
  z-index: 5 !important;
  text-align: center !important;
  transition: opacity .4s ease, visibility .4s ease;
  will-change: opacity;
}
/* El letter-spacing añade espacio tras la última letra y descentra el texto:
   se compensa con padding-left igual al tracking. */
/* USER FX — más claro y con halo oscuro: antes se perdía contra la luz del techo */
.cinematic-tour .ct-cover-eyebrow {
  margin: 0 0 .0em !important;
  font-family: 'Orbitron', system-ui, sans-serif !important;
  font-weight: 900 !important;
  font-size: clamp(13px, 1.8vw, 25px) !important;
  letter-spacing: .5em !important;
  padding-left: .5em !important;
  color: #008ace !important;
  text-transform: uppercase !important;
  text-shadow:
    0 0 10px rgba(0, 102, 197, 0.85),
    0 2px 3px rgb(0, 35, 87),
    0 0 22px rgba(0, 8, 20, .95) !important;
}
.cinematic-tour .ct-cover-title {
  margin: 0 !important;
  font-family: 'Fredoka', system-ui, sans-serif !important;
  font-weight: 700 !important;
  font-size: var(--ct-title) !important;
  line-height: 0.95 !important;
  text-transform: uppercase !important;
  letter-spacing: -.02em !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  max-width: 100% !important;
}
/* ((WELCOME)) — cromo (trazo y sombras en em para que escalen con el tamaño) */
.cinematic-tour .ct-chrome {
  display: block !important;
  width: fit-content !important;
  max-width: 100% !important;
  background: linear-gradient(210deg, #ffffff 0%, #e9eff6 20%, #8b98a7 40%, #f6f9fc 50%, #5d6978 70%, #c8d2dd 90%, #ffffff 100%) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  color: transparent !important;
  -webkit-text-stroke: .02em rgba(10, 18, 30, 0.95) !important;
  paint-order: stroke fill !important;
  filter: drop-shadow(0 .04em 0 #18202c) drop-shadow(0 .1em .2em rgba(0, 0, 0, 1)) !important;
}
/* ((PRIVATE WORLD)) — azul acero luminoso */
.cinematic-tour .ct-blue {
  display: block !important;
  width: fit-content !important;
  max-width: 100% !important;
  margin-top: .06em !important;
  font-family: 'Orbitron', system-ui, sans-serif !important;
  font-weight: 700 !important;
  font-size: 0.32em !important;
  letter-spacing: .12em !important;
  padding-left: .12em !important;
  background:
    url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .2 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"),
   linear-gradient(180deg, #129bf0 0%, #0c5ca3 55%, #0a3b7c 100%);
  -webkit-background-clip: text !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  color: transparent !important;
  -webkit-text-stroke: .045em #05223a !important;
  paint-order: stroke fill !important;
  filter:
    drop-shadow(0 .05em 0 #041b2e)
    drop-shadow(0 0 .25em rgba(0, 160, 255, .35))
    drop-shadow(0 .25em .45em rgba(0, 0, 0, .9)) !important;
}
/* ((Desplázate para entrar)) */
.cinematic-tour .ct-cover-hint {
  margin: clamp(2px, 3vh, 9px) 0 0 !important;
  max-width: 92vw !important;
  font-family: 'Orbitron', system-ui, sans-serif !important;
  font-weight: 700 !important;
  font-size: clamp(7px, .8vw, 16px) !important;
  letter-spacing: .22em !important;
  padding-left: .22em !important;
  color: #fcfeff7d !important;
  text-shadow: 0 0 10px rgba(0, 168, 255, 0.5), 0 3px 12px rgba(0, 0, 0, 1) !important;
  text-transform: uppercase !important;
  text-wrap: balance;
}
/* Fundido único para todos los textos */
.cinematic-tour .ct-cover-eyebrow,
.cinematic-tour .ct-chrome,
.cinematic-tour .ct-blue,
.cinematic-tour .ct-cover-hint {
  opacity: 1;
  transition: opacity .3s ease !important;
}

@media (prefers-reduced-motion: reduce) {
  .cinematic-tour .ct-grain { animation: none !important; }
  .cinematic-tour .ct-cover,
  .cinematic-tour .ct-cover-eyebrow,
  .cinematic-tour .ct-chrome,
  .cinematic-tour .ct-blue,
  .cinematic-tour .ct-cover-hint {
    transition: none !important;
    animation: none !important;
  }
}
@keyframes ct-pulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.02);}}
@media (prefers-reduced-motion:reduce){
  .cinematic-tour .ct-grain{animation:none !important;}
  .cinematic-tour .ct-cover-hint{animation:none !important;}}`;
type TvMode = "videocall" | "stage";
type Props = {
  progress: number;
  onModeChange?: (mode: TvMode) => void;
  onStepChange?: (step: StepKey, phase: StepPhase, index: number) => void;
};
const P = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const damp = (cur: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.lerp(cur, target, 1 - Math.exp(-lambda * dt));
const smoothDamp = (
  current: number,
  target: number,
  vel: { v: number },
  smoothTime: number,
  maxSpeed: number,
  dt: number,
) => {
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const toTarget = target;
  let change = current - toTarget;
  const maxChange = maxSpeed * smoothTime;
  change = THREE.MathUtils.clamp(change, -maxChange, maxChange);
  target = current - change;
  const temp = (vel.v + omega * change) * dt;
  vel.v = (vel.v - omega * temp) * exp;
  let output = target + (change + temp) * exp;
  if (toTarget - current > 0 === output > toTarget) { output = toTarget; vel.v = (output - toTarget) / Math.max(dt, 1e-4); }
  return output;
};
type Frame = {
  id: string;
  t: number;
  p: THREE.Vector3;
  l: THREE.Vector3;
  fov: number;
  hold?: number;
  drift?: number;
  life: number;
  via?: boolean;
};
type Cam = { p: THREE.Vector3; l: THREE.Vector3; fov: number };
const TV_LOOK = P(-4.58, 1.72, -2.0);
const LAPTOP_LOOK = P(1.76, 0.97, -1.2);
const CAMERAS: Record<StepKey, Cam> = {
  welcome: { fov: 58, p: P(0.0, 1.62, 14.5), l: P(0.0, 1.78, 6.0) },
  corridor: { fov: 56, p: P(0.14, 1.66, 9.1), l: P(-0.95, 1.96, 5.6) },
  "enter-room": { fov: 60, p: P(0.3, 1.82, 2.1), l: P(-0.3, 1.48, -3.6) },
  "gallery-a": { fov: 44, p: P(2.82, 1.68, -0.1), l: LAPTOP_LOOK },
  "gallery-b": { fov: 42, p: P(2.75, 1.63, -2.2), l: LAPTOP_LOOK },
  "gallery-focus": { fov: 39, p: P(2.98, 1.1, -1.2), l: LAPTOP_LOOK },
  "gallery-lock": { fov: 49, p: P(3.18, 1.1, -1.2), l: LAPTOP_LOOK },
  "videocall-a": { fov: 34, p: P(3.35, 1.48, -4.55), l: TV_LOOK },
  "videocall-b": { fov: 42, p: P(-0.2, 2.2, 0.9), l: TV_LOOK },
  "videocall-focus": { fov: 40, p: P(-1.75, 1.72, -2.0), l: TV_LOOK },
  "videocall-lock": { fov: 50, p: P(-0.7, 1.72, -2.0), l: TV_LOOK },
  "multimedia-a": { fov: 46, p: P(1.55, 1.72, -2.45), l: LAPTOP_LOOK },
  "multimedia-b": { fov: 41, p: P(3.3, 2.05, -0.15), l: LAPTOP_LOOK },
  "multimedia-focus": { fov: 37, p: P(2.72, 1.02, -1.42), l: LAPTOP_LOOK },
  "multimedia-lock": { fov: 52, p: P(2.92, 1.02, -1.42), l: LAPTOP_LOOK },
  "stage-a": { fov: 46, p: P(-2.3, 2.4, -0.4), l: TV_LOOK },
  "stage-b": { fov: 46, p: P(-2.5, 1.55, -3.0), l: TV_LOOK },
  "stage-focus": { fov: 40, p: P(-1.75, 1.72, -2.0), l: TV_LOOK },
  "stage-lock": { fov: 50, p: P(-0.7, 1.72, -2.0), l: TV_LOOK },
};
type ViaDef = {
  id: string;
  from: StepKey;
  to: StepKey;
  fov: number;
  p: THREE.Vector3;
  l: THREE.Vector3;
  at?: number;
};
const VIAS: ViaDef[] = [
  {
    id: "via-cross",
    from: "multimedia-lock",
    to: "stage-a",
    at: 0.5,
    fov: 53,
    p: P(0.35, 2.55, -0.55),
    l: P(-2.4, 1.75, -2.0),
  },
  {
    id: "via-exit",
    from: "corridor",
    to: "enter-room",
    at: 0.5,
    fov: 58,
    p: P(0.0, 1.74, 5.6),
    l: P(0.0, 1.62, -0.8),
  },
];
const frames: Frame[] = [];
STEPS.forEach((s) => {
  const via = VIAS.find((v) => v.to === s.key);
  if (via) {
    const tPrev = frames.length ? frames[frames.length - 1].t : 0;
    const t = tPrev + (s.t - tPrev) * (via.at ?? 0.5);
    frames.push({ id: via.id, t, fov: via.fov, p: via.p, l: via.l, life: 1, via: true });
  }
  const cam = CAMERAS[s.key];
  frames.push({
    id: s.key,
    t: s.t,
    hold: s.hold || undefined,
    fov: cam.fov,
    p: cam.p,
    l: cam.l,
    drift: s.drift || undefined,
    life: s.life,
  });
});
const TV_STAGE_AT =
  (STOP_T[stepIndex("multimedia-focus")] + STOP_T[stepIndex("multimedia-lock")]) / 2;
const LAPTOP_MULTIMEDIA_AT = STOP_T[stepIndex("videocall-lock")];
const TV_ACTIVE_FROM = ENTER_AT[stepIndex("enter-room")];

type Knot = { t: number; u: number; d: number | null };
const HOLD_IN = 0.62;
const HOLD_OUT = 1.38;
const knots: Knot[] = [];
const LAST = frames.length - 1;
frames.forEach((f, i) => {
  const half = (f.hold ?? 0) / 2;
  if (half > 0) {
    const dr = i === 0 || i === LAST ? 0 : (f.drift ?? 0);
    const slope = dr / half;
    knots.push({ t: Math.max(0, f.t - half), u: i - dr, d: slope * HOLD_IN });
    knots.push({ t: Math.min(1, f.t + half), u: i + dr, d: slope * HOLD_OUT });
  } else {
    knots.push({ t: f.t, u: i, d: i === LAST ? 0 : null });
  }
});
knots.forEach((k, i) => {
  if (k.d !== null) return;
  const a = knots[i - 1], b = knots[i + 1];
  if (!a || !b) {
    k.d = 0;
    return;
  }
  const s0 = (k.u - a.u) / (k.t - a.t);
  const s1 = (b.u - k.u) / (b.t - k.t);
  k.d = s0 > 0 && s1 > 0 ? (2 * s0 * s1) / (s0 + s1) : 0;
});
const timeToU = (t: number) => {
  let i = 0;
  while (i < knots.length - 2 && t > knots[i + 1].t) i++;
  const a = knots[i],
    b = knots[i + 1];
  const h = b.t - a.t;
  if (h <= 1e-6) return a.u;
  const s = clamp((t - a.t) / h),
    s2 = s * s,
    s3 = s2 * s;
  return (
    (2 * s3 - 3 * s2 + 1) * a.u +
    (s3 - 2 * s2 + s) * h * (a.d as number) +
    (-2 * s3 + 3 * s2) * b.u +
    (s3 - s2) * h * (b.d as number)
  );
};
const posCurve = new THREE.CatmullRomCurve3(
  frames.map((f) => f.p),
  false,
  "centripetal",
);
const lookCurve = new THREE.CatmullRomCurve3(
  frames.map((f) => f.l),
  false,
  "centripetal",
);
const SEGMENTS = frames.length - 1;
const fovAt = (u: number) => {
  const i = Math.max(0, Math.min(frames.length - 2, Math.floor(u)));
  const w = u - i;
  const f = (k: number) => frames[THREE.MathUtils.clamp(k, 0, frames.length - 1)].fov;
  const p0 = f(i - 1),
    p1 = f(i),
    p2 = f(i + 1),
    p3 = f(i + 2);
  const value =
    0.5 *
    (2 * p1 +
      (-p0 + p2) * w +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * w * w +
      (-p0 + 3 * p1 - 3 * p2 + p3) * w * w * w);
  const lo = Math.min(p0, p1, p2, p3);
  const hi = Math.max(p0, p1, p2, p3);
  return THREE.MathUtils.clamp(value, lo, hi);
};
const samplePath = (u: number, lead: number, position: THREE.Vector3, look: THREE.Vector3) => {
  posCurve.getPoint(THREE.MathUtils.clamp(u / SEGMENTS, 0, 1), position);
  lookCurve.getPoint(THREE.MathUtils.clamp((u + lead) / SEGMENTS, 0, 1), look);
};
const HOLD_PAD = 0.012;
const stopWindows = frames
  .map((f, i) => ({ i, t: f.t, half: (f.hold ?? 0) / 2 }))
  .filter((w) => w.half > 0);
const probeStop = (p: number): { env: number; frame: number } => {
  let env = 0;
  let frame = -1;
  for (const w of stopWindows) {
    const e =
      smooth(w.t - w.half - HOLD_PAD, w.t - w.half + HOLD_PAD * 0.5, p) *
      (1 - smooth(w.t + w.half - HOLD_PAD * 0.5, w.t + w.half + HOLD_PAD, p));
    if (e > env) {
      env = e;
      frame = w.i;
    }
  }
  return { env, frame };
};

const lifeAt = (u: number) => {
  const i = Math.max(0, Math.min(frames.length - 2, Math.floor(u)));
  const w = THREE.MathUtils.clamp(u - i, 0, 1);
  const a = THREE.MathUtils.clamp(frames[i].life, 0, 1.5);
  const b = THREE.MathUtils.clamp(frames[i + 1].life, 0, 1.5);
  return a * (1 - w) + b * w;
};
export default function CinematicTour({ progress, onModeChange, onStepChange }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const target = useRef(0);
  const current = useRef(0);
  const progressVel = useRef({ v: 0 });
  const uPrev = useRef(0);
  const uSpeed = useRef(0);
  const fovSmooth = useRef(frames[0].fov);
  const life = useRef(0);
  const clock = useRef(0);
  const pointerTarget = useRef({ x: 0, y: 0 });
  const pointer = useRef({ x: 0, y: 0 });
  const wakeRender = useRef<(() => void) | null>(null);

  const onModeChangeRef = useRef(onModeChange);
  onModeChangeRef.current = onModeChange;
  const onStepChangeRef = useRef(onStepChange);
  onStepChangeRef.current = onStepChange;
  const stepReported = useRef("");

  const bank = useRef(0);
  const yawPrev = useRef(0);
  const yawInit = useRef(false);
  const barPx = useRef(0);
  const barTopRef = useRef<HTMLDivElement>(null);
  const barBottomRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  // Nuevas referencias:
  const coverTopRef = useRef<HTMLDivElement>(null);
  const coverHintRef = useRef<HTMLDivElement>(null);

  const coverWelcomeRef = useRef<HTMLSpanElement>(null);
  const coverUserRef = useRef<HTMLParagraphElement>(null);
  const coverPrivateRef = useRef<HTMLSpanElement>(null);

     useEffect(() => {
    target.current = clamp(progress);
    // 1. "WELCOME" (Desaparece del 1% al 2.5% del scroll)
    if (coverWelcomeRef.current) {
      const fade = 1 - clamp((progress - 0.01) / 0.015);
      coverWelcomeRef.current.style.opacity = fade.toFixed(3);
    }
    // 2. "Desplázate para entrar" (Desaparece del 3% al 4.5% del scroll)
    if (coverHintRef.current) {
      const fade = 1 - clamp((progress - 0.03) / 0.015);
      coverHintRef.current.style.opacity = fade.toFixed(3);
    }
    // 3. "USER FX" (Desaparece del 5% al 6.5% del scroll)
    if (coverUserRef.current) {
      const fade = 1 - clamp((progress - 0.05) / 0.015);
      coverUserRef.current.style.opacity = fade.toFixed(3);
    }
    // 4. "PRIVATE WORLD" (Desaparece del 7% al 8.5% del scroll)
    if (coverPrivateRef.current) {
      const fade = 1 - clamp((progress - 0.07) / 0.015);
      coverPrivateRef.current.style.opacity = fade.toFixed(3);
    }
    // Al final, ocultamos el contenedor general (del 9% al 10%)
    if (coverRef.current) {
      const fadeContainer = 1 - clamp((progress - 0.09) / 0.01);
      coverRef.current.style.visibility = fadeContainer <= 0 ? "hidden" : "visible";
      coverRef.current.style.pointerEvents = fadeContainer <= 0 ? "none" : "auto";
    }
    wakeRender.current?.();
    }, [progress]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const mql = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let reducedMotion = mql?.matches ?? false;
    const onReducedMotionChange = () => {
      reducedMotion = mql?.matches ?? false;
      wakeRender.current?.();
    };
    mql?.addEventListener?.("change", onReducedMotionChange);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#14121c");
    const camera = new THREE.PerspectiveCamera(frames[0].fov, 1, 0.08, 70);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.55;
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    el.appendChild(renderer.domElement);
    const interactiveTargets: THREE.Object3D[] = [];
    const pickRay = new THREE.Raycaster();
    const pickPointer = new THREE.Vector2();
    const visitInteractive = (event: MouseEvent | PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return undefined;
      pickPointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      pickRay.setFromCamera(pickPointer, camera);
      const hit = pickRay.intersectObjects(interactiveTargets, false)[0];
      if (!hit) return undefined;
      return hit.object.userData.fxDestination as string | undefined;
    };
    let retryTvPlayback = () => { };
    const onInteractiveClick = (event: MouseEvent) => {
      const destination = visitInteractive(event);
      if (!destination) return;
      event.preventDefault();
      event.stopPropagation();
      if (destination === "fx:play-tv") {
        retryTvPlayback();
        return;
      }
      if (destination.startsWith("https://"))
        window.open(destination, "_blank", "noopener,noreferrer");
      else window.location.hash = destination;
    };
    const onInteractiveMove = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      if (bounds.width && bounds.height) {
        pointerTarget.current.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        pointerTarget.current.y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
        if (life.current > 0.002) wakeRender.current?.();
      }
      renderer.domElement.style.cursor = visitInteractive(event) ? "pointer" : "";
    };
    const onPointerLeave = () => {
      pointerTarget.current.x = 0;
      pointerTarget.current.y = 0;
      wakeRender.current?.();
    };
    renderer.domElement.addEventListener("click", onInteractiveClick);
    renderer.domElement.addEventListener("pointermove", onInteractiveMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    const mat = (color: string, roughness = 0.8, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const dark = mat("#151919");
    const carpet = mat("#111817", 1);
    const black = mat("#0c1312");
    const box = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      m: THREE.Material,
      parent: THREE.Object3D = scene,
    ) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      o.position.set(x, y, z);
      parent.add(o);
      return o;
    };
    const canvas = (draw: (ctx: CanvasRenderingContext2D) => void, w = 512, h = 512) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) throw Error("Canvas unsupported");
      draw(ctx);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    };

    const interfaceScreen = (heading: string, detail: string, action: string) =>
      new THREE.MeshBasicMaterial({
        map: canvas(
          (ctx) => {
            const w = 1024,
              h = 640;
            const tv = heading === "PASARELA";
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, "#07151e");
            g.addColorStop(0.58, tv ? "#102c49" : "#103d46");
            g.addColorStop(1, "#07131d");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            ctx.save();
            ctx.globalAlpha = 0.13;
            for (let i = 0; i < 18; i++) {
              ctx.strokeStyle = i % 3 === 0 ? "#7ce9e2" : "#5794ed";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(w * 0.52 + i * 36, -50);
              ctx.lineTo(w * 0.12 + i * 52, h + 50);
              ctx.stroke();
            }
            ctx.restore();
            if (tv) {
              ctx.fillStyle = "#183955";
              ctx.fillRect(628, 148, 265, 315);
              ctx.fillStyle = "#0b1925";
              for (let i = 0; i < 5; i++) {
                const x = 651 + i * 49;
                ctx.fillRect(x, 290 - (i % 2) * 38, 32, 165 + (i % 2) * 38);
                ctx.fillStyle = "#63b5d8";
                ctx.fillRect(x + 6, 294 - (i % 2) * 38, 20, 5);
                ctx.fillStyle = "#0b1925";
              }
              ctx.strokeStyle = "#70dcf1";
              ctx.lineWidth = 3;
              ctx.strokeRect(628, 148, 265, 315);
            } else {
              for (let i = 0; i < 3; i++) {
                const x = 627 + i * 97;
                const c = ctx.createLinearGradient(x, 160, x + 77, 390);
                c.addColorStop(0, ["#2e7384", "#365b96", "#1e736b"][i]);
                c.addColorStop(1, "#071727");
                ctx.fillStyle = c;
                ctx.fillRect(x, 160 + (i % 2) * 23, 80, 230);
                ctx.strokeStyle = "rgba(182,240,239,.5)";
                ctx.strokeRect(x + 4, 164 + (i % 2) * 23, 72, 222);
              }
            }
            ctx.fillStyle = "#a7f2eb";
            ctx.font = "600 25px Arial";
            ctx.textAlign = "left";
            ctx.fillText("U S E R  F X  /  PRIVATE WORLD", 65, 84);
            ctx.fillStyle = "#ffffff";
            ctx.font = tv ? "bold 83px Arial" : "bold 75px Arial";
            ctx.fillText(heading, 62, 264);
            ctx.font = "27px Arial";
            ctx.fillStyle = "#b5d5e2";
            ctx.fillText(detail, 66, 319);
            ctx.fillStyle = tv ? "#2e82db" : "#178f91";
            ctx.beginPath();
            ctx.roundRect(63, 422, 435, 101, 18);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.font = "bold 32px Arial";
            ctx.fillText(action, 280, 485);
            ctx.strokeStyle = "rgba(170,236,239,.36)";
            ctx.lineWidth = 3;
            ctx.strokeRect(22, 20, 980, 600);
            ctx.fillStyle = "#86b1c2";
            ctx.textAlign = "left";
            ctx.font = "21px Arial";
            ctx.fillText("SCROLL TO EXPLORE  /  ACCESS CONTROLLED", 66, 577);
          },
          1024,
          640,
        ),
        side: THREE.DoubleSide,
        toneMapped: false,
      });

    const print = (title: string, subtitle: string, color = "#58c9e6", big = false) =>
      new THREE.MeshBasicMaterial({
        map: canvas(
          (ctx) => {
            const g = ctx.createLinearGradient(0, 0, 512, 768);
            g.addColorStop(0, "#06121c");
            g.addColorStop(0.55, "#133f51");
            g.addColorStop(1, "#07101c");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 512, 768);
            ctx.strokeStyle = "rgba(135,218,234,.42)";
            ctx.lineWidth = 4;
            ctx.strokeRect(24, 24, 464, 720);
            for (let i = 0; i < 11; i++) {
              ctx.strokeStyle = i % 2 ? "rgba(66,139,212,.16)" : "rgba(94,231,213,.22)";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.ellipse(256, 330, 64 + i * 23, 95 + i * 28, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.fillStyle = color;
            ctx.textAlign = "center";
            ctx.font = big ? "bold 170px Arial" : "bold 105px Arial";
            ctx.fillText(title, 256, 368);
            ctx.fillStyle = "#edfaff";
            ctx.font = "bold 48px Arial";
            ctx.fillText(subtitle, 256, 437);
            ctx.fillStyle = "#82acb9";
            ctx.font = "22px Arial";
            ctx.fillText("PRIVATE WORLD  /  26", 256, 691);
          },
          512,
          768,
        ),
        side: THREE.DoubleSide,
        toneMapped: false,
      });

    const pic = (
      x: number,
      y: number,
      z: number,
      rotate: number,
      material: THREE.Material,
      width = 1.05,
      height = 1.55,
    ) => {
      const group = new THREE.Group();
      group.position.set(x, y, z);
      group.rotation.y = rotate;
      scene.add(group);
      box(width + 0.13, height + 0.14, 0.07, 0, 0, 0, dark, group);
      const art = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
      art.position.z = 0.044;
      group.add(art);
    };

    const applyImage = (material: THREE.MeshBasicMaterial, url: string) => {
      new THREE.TextureLoader().load(
        url,
        (texture) => {
          if (abort.signal.aborted) {
            texture.dispose();
            return;
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          material.map = texture;
          material.needsUpdate = true;
          wakeRender.current?.();
        },
        undefined,
        () => { },
      );
    };

    // ── Corredor ──
    const bronze = mat("#15bcef", 0.32, 0.68);
    const lacquer = mat("#00aebb", 0.27, 0.34);
    const wallPattern = canvas((ctx) => {
      ctx.fillStyle = "#0b1320";
      ctx.fillRect(0, 0, 512, 512);
      for (let y = 15; y < 512; y += 76)
        for (let x = 16; x < 512; x += 76) {
          ctx.strokeStyle = "#e0e9e838";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.ellipse(x, y + 20, 17, 26, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, y - 10);
          ctx.bezierCurveTo(x - 25, y + 13, x - 24, y + 40, x, y + 55);
          ctx.bezierCurveTo(x + 24, y + 40, x + 25, y + 13, x, y - 10);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(x, y + 20, 5, 18, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
    });
    wallPattern.wrapS = THREE.RepeatWrapping;
    wallPattern.wrapT = THREE.RepeatWrapping;
    wallPattern.repeat.set(10, 2.8);
    const wallpaper = new THREE.MeshStandardMaterial({ map: wallPattern, roughness: 0.88 });
    const marbleTexture = canvas((ctx) => {
      ctx.fillStyle = "#090e0d";
      ctx.fillRect(0, 0, 512, 512);
      for (let k = 0; k < 90; k++) {
        const x = (k * 97) % 512,
          y = (k * 61) % 512;
        ctx.strokeStyle = k % 4 === 0 ? "#67e1c29c" : "#b8bebd33";
        ctx.lineWidth = k % 7 === 0 ? 1.6 : 0.6;
        ctx.beginPath();
        ctx.moveTo(x - 75, y + 42);
        ctx.bezierCurveTo(x - 10, y - 25, x + 25, y + 40, x + 135, y - 32);
        ctx.stroke();
      }
    });
    marbleTexture.wrapS = THREE.RepeatWrapping;
    marbleTexture.wrapT = THREE.RepeatWrapping;
    marbleTexture.repeat.set(2, 7);
    const marble = new THREE.MeshStandardMaterial({
      map: marbleTexture,
      roughness: 0.3,
      metalness: 0.1,
    });
    box(3.7, 0.14, 14.7, 0, -0.1, 8.4, marble);
    box(0.18, 3.8, 13.35, -1.91, 1.83, 8.75, wallpaper);
    box(0.18, 3.8, 13.35, 1.91, 1.83, 8.75, wallpaper);
    box(3.85, 0.16, 13.35, 0, 3.77, 8.75, mat("#112c28", 0.66));
    const wallLogoLoader = new GLTFLoader();
    let wallLogo: THREE.Group | null = null;
    const LOGO_Y = 2.06;
    for (const side of [-1, 1]) {
      const x = side * 1.78;
      box(0.13, 0.72, 13.35, x, 0.36, 8.75, lacquer);
      box(0.14, 0.11, 13.35, x, 0.77, 8.75, bronze);
      box(0.15, 0.13, 13.35, x, 3.56, 8.75, lacquer);
      box(0.17, 0.06, 13.35, x, 3.4, 8.75, bronze);
      for (const z of [12.45, 9.55, 6.65]) {
        const isRightWallLogo = side === 1 && z === 12.45;

        if (isRightWallLogo) {
          const panelMat = print("USER", "ROOM", "#58c9e6", false);
          const PANEL_W = 1.13,
            PANEL_H = 1.65;
          new THREE.TextureLoader().load(
            "/wallpaper2.png",
            (texture) => {
              if (abort.signal.aborted) {
                texture.dispose();
                return;
              }
              texture.colorSpace = THREE.SRGBColorSpace;
              const img = texture.image as { width: number; height: number };
              const imgAspect = img.width / img.height;
              const target = PANEL_W / PANEL_H;
              if (imgAspect > target) {
                texture.repeat.x = target / imgAspect;
                texture.offset.x = (1 - texture.repeat.x) / 2;
              } else {
                texture.repeat.y = imgAspect / target;
                texture.offset.y = (1 - texture.repeat.y) / 2;
              }
              texture.anisotropy = 8;
              (panelMat as THREE.MeshBasicMaterial).map = texture;
              panelMat.needsUpdate = true;
              wakeRender.current?.();
            },
            undefined,
            () => { },
          );
          pic(side * 1.81, LOGO_Y, z, -Math.PI / 2, panelMat, PANEL_W, PANEL_H);

          wallLogoLoader.load(
            "/logoFX.glb",
            (gltf) => {
              if (abort.signal.aborted) return;
              const root = gltf.scene;
              root.traverse((o) => {
                const mesh = o as THREE.Mesh;
                if (!mesh.isMesh) return;
                const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                const lit = list.map((m) => {
                  const std = m as THREE.MeshStandardMaterial;
                  if (!std.map) return m;
                  std.map.anisotropy = 8;
                  const basic = new THREE.MeshBasicMaterial({
                    map: std.map,
                    side: std.side,
                    toneMapped: false,
                  });
                  std.dispose();
                  return basic;
                });
                mesh.material = Array.isArray(mesh.material) ? lit : lit[0];
              });
              root.updateMatrixWorld(true);
              const box3 = new THREE.Box3().setFromObject(root);
              if (box3.isEmpty()) return;
              const size = box3.getSize(new THREE.Vector3());
              const center = box3.getCenter(new THREE.Vector3());
              root.position.sub(center);
              const oriented = new THREE.Group();
              oriented.add(root);
              if (size.y < size.z * 0.55 && size.y < size.x * 0.55) {
                oriented.rotation.x = -Math.PI / 2;
              } else if (size.x < size.z * 0.55 && size.x < size.y * 0.55) {
                oriented.rotation.y = Math.PI / 2;
              }
              const logo = new THREE.Group();
              logo.add(oriented);
              logo.rotation.y = -Math.PI / 2;
              logo.updateMatrixWorld(true);
              const wallBounds = new THREE.Box3().setFromObject(logo);
              const wallSize = wallBounds.getSize(new THREE.Vector3());
              const fit = Math.min(
                0.16 / Math.max(wallSize.x, 0.001),
                0.86 / Math.max(wallSize.y, 0.001),
                0.96 / Math.max(wallSize.z, 0.001),
              );
              logo.scale.setScalar(fit);
              logo.position.set(1.67, LOGO_Y, z);
              scene.add(logo);
              wallLogo = logo;
              wakeRender.current?.();
            },
            undefined,
            () => { },
          );
        } else {
          const portrait = print(z === 12.45 ? "FX" : "USER", "ROOM", "#58c9e6", false);
          const isLastLeft = side === -1 && z === 6.65;
          const isSecondRight = side === 1 && z === 9.55;
          const portraitUrl = isSecondRight
            ? "/assets/my-room/fx-ia.png"
            : isLastLeft
              ? "/portrait-pasillo.jpg"
              : z === 12.45
                ? "/wallpaper2.png"
                : "/wallpaperGeneral.png";
          applyImage(portrait, portraitUrl);
          pic(side * 1.81, 2.06, z, side === -1 ? Math.PI / 2 : -Math.PI / 2, portrait, 1.13, 1.65);
        }
        const sconce = new THREE.PointLight("#3c5757", 2.6, 3.7);
        sconce.position.set(side * 1.48, 2.97, z);
        scene.add(sconce);
        box(0.15, 0.065, 0.38, side * 1.66, 2.97, z, bronze);
      }
    }
    for (const z of [3.95, 7.55, 11.15, 14.65]) {
      for (const x of [-1.79, 1.79]) box(0.1, 3.54, 0.1, x, 1.8, z, lacquer);
      box(3.63, 0.12, 0.12, 0, 3.49, z, lacquer);
      box(3.63, 0.035, 0.12, 0, 3.36, z, bronze);
    }
    const door = new THREE.Group();
    scene.add(door);
    door.position.set(1.8, 0, 14.6);
    box(0.08, 3.45, 1.65, 0, 1.7, 0, lacquer, door).rotation.y = Math.PI / 2;
    box(0.1, 0.13, 0.2, -0.12, 1.65, -0.7, bronze, door);
    for (const z of [12.7, 8.5, 4.7]) {
      const light = new THREE.PointLight("#2a7777", 7, 6);
      light.position.set(0, 3.32, z);
      scene.add(light);
      box(
        0.3,
        0.05,
        0.3,
        0,
        3.69,
        z,
        new THREE.MeshStandardMaterial({
          color: "#517a7a",
          emissive: "#44afaf",
          emissiveIntensity: 1.4,
        }),
      );
    }

    // ── Dormitorio ──
    box(10, 0.13, 9.8, 0, -0.11, -2.1, carpet);
    box(0.2, 4.6, 9.8, -5, 2.25, -2.1, mat("#172947"));
    box(0.2, 4.6, 9.8, 5, 2.25, -2.1, mat("#172947"));
    box(10, 0.2, 9.8, 0, 4.6, -2.1, mat("#101b31"));
    box(10, 4.6, 0.15, 0, 2.2, -6.95, mat("#162742"));
    box(2.4, 0.1, 2.0, -2.9, 0.03, -2.7, carpet);
    const mirrorFrame = mat("#0b0d12", 0.35, 0.45);
    const mirrorAssembly = new THREE.Group();
    mirrorAssembly.position.set(-4.27, 1.72, -5.47);
    mirrorAssembly.rotation.y = 0.88;
    scene.add(mirrorAssembly);
    box(1.72, 3.35, 0.12, 0, 0, -0.09, mirrorFrame, mirrorAssembly);
    const mirrorReflection = new Reflector(new THREE.PlaneGeometry(1.49, 3.1), {
      color: 0xcbd7eb,
      textureWidth: window.innerWidth < 768 ? 256 : 512,
      textureHeight: window.innerWidth < 768 ? 512 : 1024,
      clipBias: 0.003,
    });
    mirrorReflection.position.z = 0.015;
    mirrorAssembly.add(mirrorReflection);
    const mirrorTrim = mat("#050608", 0.25, 0.2);
    box(1.67, 0.075, 0.08, 0, 1.615, 0.016, mirrorTrim, mirrorAssembly);
    box(1.67, 0.075, 0.08, 0, -1.615, 0.016, mirrorTrim, mirrorAssembly);
    box(0.075, 3.16, 0.08, -0.805, 0, 0.016, mirrorTrim, mirrorAssembly);
    box(0.075, 3.16, 0.08, 0.805, 0, 0.016, mirrorTrim, mirrorAssembly);

    const lampBlack = mat("#11161f", 0.35, 0.45);
    const lampShadeMaterial = new THREE.MeshStandardMaterial({
      color: "#f1e7d2",
      emissive: "#ffdca8",
      emissiveIntensity: 0.9,
      roughness: 0.9,
      metalness: 0.02,
    });
    const floorLamp = new THREE.Group();
    floorLamp.position.set(4.48, 0, 1.38);
    scene.add(floorLamp);
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.05, 28), lampBlack);
    lampBase.position.set(0, 0.025, 0);
    floorLamp.add(lampBase);
    const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 2.25, 18), lampBlack);
    lampPole.position.set(0, 1.14, 0);
    floorLamp.add(lampPole);
    const lampShade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.42, 0.58, 28, 1, true),
      lampShadeMaterial,
    );
    lampShade.position.set(0, 2.28, 0);
    floorLamp.add(lampShade);
    const lampTop = new THREE.Mesh(new THREE.CircleGeometry(0.34, 28), lampShadeMaterial);
    lampTop.rotation.x = -Math.PI / 2;
    lampTop.position.set(0, 2.57, 0);
    floorLamp.add(lampTop);
    const lampBottom = new THREE.Mesh(new THREE.CircleGeometry(0.42, 28), lampShadeMaterial);
    lampBottom.rotation.x = Math.PI / 2;
    lampBottom.position.set(0, 1.99, 0);
    floorLamp.add(lampBottom);
    const lampBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 18, 14),
      new THREE.MeshStandardMaterial({
        color: "#fff5df",
        emissive: "#ffdca8",
        emissiveIntensity: 2.4,
        roughness: 0.2,
        metalness: 0,
      }),
    );
    lampBulb.position.set(0, 2.25, 0);
    floorLamp.add(lampBulb);
    const lampRoomLight = new THREE.PointLight("#ffd7a0", 14, 8.5);
    lampRoomLight.position.set(4.48, 2.24, 1.38);
    scene.add(lampRoomLight);
    const lampFillLight = new THREE.PointLight("#fff0cf", 7, 10);
    lampFillLight.position.set(3.1, 2.5, 0.7);
    scene.add(lampFillLight);
    const keyboardGlow = new THREE.PointLight("#ffffff", 2.0, 1.2);
    const zebraCanvas = canvas((ctx) => {
      ctx.fillStyle = "#0e1011";
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = "#3c5757";
      ctx.beginPath();
      ctx.ellipse(230, 270, 150, 195, -0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#14171a";
      for (let i = 0; i < 12; i++) {
        ctx.save();
        ctx.translate(115 + i * 21, 110 + i * 20);
        ctx.rotate(-0.38 + i * 0.055);
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 113, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = "#171217";
      ctx.beginPath();
      ctx.arc(338, 208, 12, 0, Math.PI * 2);
      ctx.fill();
    });
    const zebraMaterial = new THREE.MeshBasicMaterial({
      map: zebraCanvas,
      color: "#a0a0a0",
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    pic(1.55, 2.62, -6.83, 0, zebraMaterial, 2.4, 2.5);
    const sunset = canvas((ctx) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, "#253f87");
      grad.addColorStop(0.44, "#0075fc");
      grad.addColorStop(0.74, "#3c5757");
      grad.addColorStop(1, "#1d4147");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 30; i++) {
        const x = i * 18,
          top = 330 - ((i * 47) % 103);
        ctx.fillStyle = "#223d39";
        ctx.fillRect(x, top, 16, 512 - top);
        ctx.fillStyle = "#3c5757";
        for (let yy = top + 12; yy < 490; yy += 22) ctx.fillRect(x + 5, yy, 3, 4);
      }
    });
    const sunsetPane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.25),
      new THREE.MeshBasicMaterial({ map: sunset }),
    );
    sunsetPane.position.set(-2.3, 2.68, -6.824);
    scene.add(sunsetPane);
    for (const x of [-3.55, -2.3, -1.05]) box(0.075, 2.45, 0.09, x, 2.68, -6.74, dark);
    for (const y of [1.48, 3.89]) box(2.57, 0.075, 0.09, -2.3, y, -6.74, dark);
    const windowGlow = new THREE.PointLight("#003db6", 3.8, 5.5);
    windowGlow.position.set(-2.35, 2.6, -5.9);
    scene.add(windowGlow);
    const abort = new AbortController();
    abort.signal.addEventListener("abort", () => mirrorReflection.getRenderTarget().dispose(), {
      once: true,
    });
    new THREE.TextureLoader().load(
      "/assets/my-room/zebra.png",
      (texture) => {
        if (abort.signal.aborted) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        zebraMaterial.map = texture;
        zebraMaterial.needsUpdate = true;
        wakeRender.current?.();
      },
      undefined,
      () => { },
    );
    const pink = new THREE.PointLight("#003db6", 16, 9);
    pink.position.set(-3.1, 3.1, -3.1);
    scene.add(pink);
    const amber = new THREE.PointLight("#186370", 20, 11);
    amber.position.set(3.1, 2.6, -1);
    scene.add(amber);
    scene.add(new THREE.AmbientLight("#4c7279", 1.4));

    const fabricTexture = (base: string, accent: string, frequency = 140) => {
      const tex = canvas((ctx) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < frequency * 20; i++) {
          const x = (i * 97.83) % 512,
            y = (i * 71.31) % 512;
          ctx.fillStyle = i % 3 === 0 ? accent : "#ffffff08";
          ctx.fillRect(x, y, 0.8 + (i % 3), 1 + (i % 4));
        }
      });
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      return new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
    };
    const textureLoader = new THREE.TextureLoader();
    const polyHavenNormal = (
      material: THREE.MeshStandardMaterial,
      asset: string,
      rx: number,
      ry: number,
      strength: number,
    ) => {
      const file = `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${asset}/${asset}_nor_gl_1k.jpg`;
      textureLoader.load(
        file,
        (texture) => {
          if (abort.signal.aborted) {
            texture.dispose();
            return;
          }
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(rx, ry);
          texture.colorSpace = THREE.NoColorSpace;
          material.normalMap = texture;
          material.normalScale.set(strength, strength);
          material.needsUpdate = true;
          wakeRender.current?.();
        },
        undefined,
        () => { },
      );
    };
    const upholstery = fabricTexture("#111115", "#45424a32");
    upholstery.roughness = 0.52;
    const duvet = fabricTexture("#ac112b", "#ef435d25");
    const sofaFabric = fabricTexture("#101014", "#45404922");
    sofaFabric.roughness = 0.52;
    const sofaAccent = fabricTexture("#9e1029", "#ec3c5130");
    const rugFabric = fabricTexture("#111616", "#52605f1a", 260);
    polyHavenNormal(duvet, "velour_velvet", 3, 3, 0.17);
    polyHavenNormal(upholstery, "fabric_leather_01", 2, 2, 0.27);
    polyHavenNormal(rugFabric, "dirty_carpet", 7, 7, 0.25);

    const roundBox = (
      w: number,
      h: number,
      d: number,
      r: number,
      x: number,
      y: number,
      z: number,
      m: THREE.Material,
    ) => {
      const sh = new THREE.Shape();
      sh.moveTo(-w / 2 + r, -h / 2);
      sh.lineTo(w / 2 - r, -h / 2);
      sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      sh.lineTo(w / 2, h / 2 - r);
      sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
      sh.lineTo(-w / 2 + r, h / 2);
      sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      sh.lineTo(-w / 2, -h / 2 + r);
      sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      const geom = new THREE.ExtrudeGeometry(sh, {
        depth: d,
        bevelEnabled: true,
        bevelSize: Math.min(r * 0.3, 0.06),
        bevelThickness: 0.03,
        bevelSegments: 3,
        steps: 1,
        curveSegments: 5,
      });
      geom.translate(0, 0, -d / 2);
      const mesh = new THREE.Mesh(geom, m);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    };
    box(3.65, 0.022, 2.85, 1.5, 0.017, -1.12, rugFabric);

    const sofaGroup = new THREE.Group();
    sofaGroup.position.set(4.2, 0, -1.2);
    sofaGroup.rotation.y = -Math.PI / 2;
    scene.add(sofaGroup);
    const sofaBack = new THREE.Group();
    sofaGroup.add(sofaBack);
    sofaBack.position.set(0.55, 0, 5.2);
    const sofaBox = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      material: THREE.Material,
    ) => box(w, h, d, x, y, z, material, sofaBack);
    const sofaRound = (
      w: number,
      h: number,
      d: number,
      radius: number,
      x: number,
      y: number,
      z: number,
      material: THREE.Material,
    ) => {
      const item = roundBox(w, h, d, radius, x, y, z, material);
      scene.remove(item);
      sofaBack.add(item);
      return item;
    };
    sofaBox(2.3, 0.3, 1.22, -0.55, 0.36, -5.2, dark);
    sofaRound(2.32, 1.02, 0.24, 0.2, -0.55, 0.92, -5.77, sofaFabric);
    for (const x of [-1.56, 0.46]) {
      sofaRound(0.29, 0.88, 1.28, 0.14, x, 0.72, -5.2, sofaFabric);
    }
    for (const x of [-1.09, -0.01]) {
      sofaRound(1.0, 0.2, 0.9, 0.09, x, 0.65, -5.08, sofaFabric);
      sofaRound(1.0, 0.76, 0.19, 0.13, x, 1.09, -5.56, sofaFabric);
    }
    for (const x of [-1.22, 0.11]) {
      const cushion = sofaRound(0.5, 0.51, 0.16, 0.12, x, 1.0, -5.42, sofaAccent);
      cushion.rotation.z = x < -0.5 ? -0.16 : 0.16;
    }

    const marbleMap = canvas((ctx) => {
      ctx.fillStyle = "#111017";
      ctx.fillRect(0, 0, 512, 512);
      for (let k = 0; k < 35; k++) {
        ctx.strokeStyle = k % 4 === 0 ? "rgba(224,226,240,.5)" : "rgba(168,167,188,.16)";
        ctx.lineWidth = k % 5 === 0 ? 1.7 : 0.65;
        ctx.beginPath();
        const x = (k * 119) % 512,
          y = (k * 61) % 512;
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + 32, y - 24, x + 80, y + 32, x + 135, y - 25);
        ctx.stroke();
      }
    });
    marbleMap.wrapS = THREE.RepeatWrapping;
    marbleMap.wrapT = THREE.RepeatWrapping;
    const tableTop = new THREE.MeshStandardMaterial({
      map: marbleMap,
      roughness: 0.19,
      metalness: 0.16,
    });
    const tableMetal = mat("#101016", 0.3, 0.5);
    box(1.75, 0.095, 1.17, 2.08, 0.47, -1.2, tableTop);
    for (const x of [1.3, 2.86]) {
      for (const z of [-1.72, -0.68]) {
        box(0.042, 0.4, 0.042, x, 0.23, z, tableMetal);
      }
    }
    box(1.6, 0.035, 1.02, 2.08, 0.13, -1.2, tableMetal);

    const laptopGroup = new THREE.Group();
    laptopGroup.position.set(2.08, 0, -1.2);
    laptopGroup.rotation.y = Math.PI / 2 + 0.55;
    scene.add(laptopGroup);

    const laptopDark = mat("#0b1020", 0.33, 0.12);
    const laptopMetal = mat("#8c9bae", 0.31, 0.52);
    box(1.26, 0.045, 0.79, 0, 0.555, 0, laptopMetal, laptopGroup);
    box(1.13, 0.011, 0.62, 0, 0.584, -0.025, laptopDark, laptopGroup);
    const keyboardTexture = canvas(
      (ctx) => {
        ctx.fillStyle = "#080c16";
        ctx.fillRect(0, 0, 1024, 512);
        const rows = [14, 14, 13, 12, 8];
        rows.forEach((count, row) => {
          const left = 36;
          const gap = 5;
          const cellW = (952 - gap * (count - 1)) / count;
          const top = 42 + row * 78;
          for (let col = 0; col < count; col++) {
            const x = left + col * (cellW + gap);
            const shade = col % 3 === 0 ? "#24dcff" : col % 3 === 1 ? "#4d86ff" : "#9eeaff";
            ctx.fillStyle = "rgba(13, 26, 45, .98)";
            ctx.fillRect(x, top, cellW, 62);
            ctx.strokeStyle = shade;
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 2, top + 2, cellW - 4, 58);
            ctx.fillStyle = "#e2f8ff";
            ctx.font = "bold 23px monospace";
            ctx.fillText(
              row === 4 && col === 3 ? "SPACE" : "FX1234567890QWERTY"[(row * 3 + col) % 18],
              x + 9,
              top + 34,
            );
          }
        });
      },
      1024,
      512,
    );
    const keyboardTop = new THREE.Mesh(
      new THREE.PlaneGeometry(1.08, 0.46),
      new THREE.MeshBasicMaterial({
        map: keyboardTexture,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    keyboardTop.rotation.x = -Math.PI / 2;
    keyboardTop.position.set(0, 0.592, -0.11);
    laptopGroup.add(keyboardTop);

    box(0.27, 0.005, 0.13, 0, 0.595, 0.258, mat("#a4afc1", 0.24, 0.28), laptopGroup);
  
    const laptopLidBack = new THREE.MeshStandardMaterial({
      color: "#9caaba",
      metalness: 0.42,
      roughness: 0.37,
      emissive: "#526173",
      emissiveIntensity: 0.07,
    });
    const laptopLidSide = mat("#8d9bae", 0.28, 0.52);
    const laptopLid = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.83, 0.055), [
      laptopLidSide,
      laptopLidSide,
      laptopLidSide,
      laptopLidSide,
      laptopDark,
      laptopLidBack,
    ]);
    laptopLid.position.set(0, 1.0, -0.365);
    laptopGroup.add(laptopLid);

    const fxLogoTexture = new THREE.TextureLoader().load(
      "/assets/userfx-logo-sin.png",
      () => wakeRender.current?.(),
      undefined,
      () => console.warn("[CinematicTour] No se encontro /assets/userfx-logo-sin.png"),
    );
    fxLogoTexture.colorSpace = THREE.SRGBColorSpace;
    const fxBackLogo = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.44),
      new THREE.MeshBasicMaterial({
        map: fxLogoTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    fxBackLogo.position.set(0, 1.035, -0.401);
    fxBackLogo.rotation.y = Math.PI;
    laptopGroup.add(fxBackLogo);

    const makeLaptopVideo = (src: string) => {
      const v = document.createElement("video");
      v.crossOrigin = "anonymous";
      v.src = `${src}?v=${encodeURIComponent(process.env.NEXT_PUBLIC_FX_VIDEO_VERSION || "fx-20261105-refresh")}`;
      v.muted = true;
      v.defaultMuted = true;
      v.autoplay = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = "auto";
      return v;
    };
    const laptopVideos: Record<LaptopMode, HTMLVideoElement> = {
      gallery: makeLaptopVideo(LAPTOP_VIDEOS.gallery),
      multimedia: makeLaptopVideo(LAPTOP_VIDEOS.multimedia),
    };
    let laptopMode: LaptopMode = "gallery";
    const laptopCanvas = document.createElement("canvas");
    laptopCanvas.width = 512;
    laptopCanvas.height = 320;
    const laptopCtx = laptopCanvas.getContext("2d", { willReadFrequently: true });
    const laptopVideoTexture = new THREE.CanvasTexture(laptopCanvas);
    laptopVideoTexture.colorSpace = THREE.SRGBColorSpace;
    laptopVideoTexture.minFilter = THREE.LinearFilter;
    laptopVideoTexture.magFilter = THREE.LinearFilter;
    laptopVideoTexture.generateMipmaps = false;
    let unsafeLaptopVideo = false;
    const updateLaptopVideo = () => {
      const laptopVideo = laptopVideos[laptopMode];
      if (!laptopCtx || unsafeLaptopVideo || laptopVideo.readyState < 2) return;
      try {
        laptopCtx.drawImage(laptopVideo, 0, 0, laptopCanvas.width, laptopCanvas.height);
        laptopCtx.getImageData(0, 0, 1, 1);
        laptopVideoTexture.needsUpdate = true;
      } catch (error) {
        unsafeLaptopVideo = true;
        laptopCanvas.width = 512;
        laptopCanvas.height = 320;
        laptopCtx.fillStyle = "#05080d";
        laptopCtx.fillRect(0, 0, 512, 320);
        laptopVideoTexture.needsUpdate = true;
        if (process.env.NODE_ENV !== "production") {
          console.warn("[CinematicTour] Laptop video is not origin-clean:", error);
        }
      }
    };
    const laptopDisplay = new THREE.Mesh(
      new THREE.PlaneGeometry(0.97, 0.65),
      new THREE.MeshBasicMaterial({
        map: laptopVideoTexture,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    laptopDisplay.position.set(0, 0.97, -0.327);
    laptopDisplay.userData.fxDestination = "#/private-room/gallery";
    interactiveTargets.push(laptopDisplay);
    laptopGroup.add(laptopDisplay);
    for (const [mode, video] of Object.entries(laptopVideos) as [LaptopMode, HTMLVideoElement][]) {
      video.addEventListener(
        "loadeddata",
        () => {
          if (mode === laptopMode) updateLaptopVideo();
          wakeRender.current?.();
        },
        { signal: abort.signal },
      );
      if ("requestVideoFrameCallback" in video) {
        const refreshFrame = () => {
          if (abort.signal.aborted) return;
          if (mode === laptopMode) {
            updateLaptopVideo();
            wakeRender.current?.();
          }
          video.requestVideoFrameCallback(refreshFrame);
        };
        video.requestVideoFrameCallback(refreshFrame);
      }
      video.addEventListener(
        "ended",
        () => {
          video.currentTime = 0;
          void video.play().catch(() => { });
        },
        { signal: abort.signal },
      );
      void video.play().catch(() => { });
    }
    abort.signal.addEventListener(
      "abort",
      () => {
        for (const video of Object.values(laptopVideos)) {
          video.pause();
          video.removeAttribute("src");
          video.load();
        }
        laptopVideoTexture.dispose();
      },
      { once: true },
    );

    const softSurface = (
      w: number,
      d: number,
      x: number,
      y: number,
      z: number,
      material: THREE.Material,
      amplitude: number,
    ) => {
      const geometry = new THREE.PlaneGeometry(w, d, 42, 52);
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const px = positions.getX(i),
          pz = -positions.getY(i);
        const edge =
          Math.pow(Math.max(0, 1 - Math.abs(px) / (w * 0.5)), 0.35) *
          Math.pow(Math.max(0, 1 - Math.abs(pz) / (d * 0.5)), 0.3);
        const ripples =
          Math.sin(pz * 5.7 + px * 1.25) * 0.48 +
          Math.sin(px * 9.3 - pz * 2.4) * 0.24 +
          Math.sin(pz * 15.1 + px * 2) * 0.1;
        positions.setZ(i, amplitude * ripples * edge);
      }
      geometry.computeVertexNormals();
      geometry.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    };
    const paddedShape = (
      width: number,
      height: number,
      depth: number,
      x: number,
      y: number,
      z: number,
      material: THREE.Material,
    ) => {
      const geometry = new THREE.SphereGeometry(1, 24, 18);
      geometry.scale(width * 0.5, height * 0.5, depth * 0.5);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    };
    const bedObjectsStart = scene.children.length;
    box(3.36, 0.31, 3.78, 2.85, 0.31, -1.03, black);
    box(3.32, 0.31, 3.7, 2.85, 0.53, -1.03, upholstery);
    roundBox(3.58, 2.04, 0.32, 0.24, 2.85, 1.54, -2.97, upholstery);
    const tuftGeometry = new THREE.PlaneGeometry(3.22, 1.68, 72, 42);
    const tuftPositions = tuftGeometry.attributes.position;
    for (let i = 0; i < tuftPositions.count; i++) {
      const x = tuftPositions.getX(i),
        y = tuftPositions.getY(i);
      let inset = 0;
      for (let row = 0; row < 4; row++) {
        const cy = -0.62 + row * 0.41;
        for (let column = 0; column < 7; column++) {
          const cx = -1.36 + column * 0.455 + (row % 2 ? 0.225 : 0);
          const dx = (x - cx) / 0.19,
            dy = (y - cy) / 0.19;
          inset += 0.052 * Math.exp(-1.45 * (dx * dx + dy * dy));
        }
      }
      const broadPuff = 0.014 * Math.cos(x * 13.8) * Math.cos(y * 15.2);
      tuftPositions.setZ(i, 0.035 + broadPuff - inset);
    }
    tuftGeometry.computeVertexNormals();
    const tuftedPanel = new THREE.Mesh(tuftGeometry, upholstery);
    tuftedPanel.position.set(2.85, 1.54, -2.783);
    scene.add(tuftedPanel);
    const buttonMaterial = mat("#0b0a0e", 0.85);
    const studGeometry = new THREE.SphereGeometry(0.009, 10, 8);
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 7; column++) {
        const x = -1.36 + column * 0.455 + (row % 2 ? 0.225 : 0);
        if (Math.abs(x) > 1.55) continue;
        const stud = new THREE.Mesh(studGeometry, buttonMaterial);
        stud.position.set(2.85 + x, 1.54 - 0.62 + row * 0.41, -2.815);
        scene.add(stud);
      }
    }
    roundBox(3.24, 0.22, 3.6, 0.1, 2.85, 0.73, -0.99, mat("#11121b", 1));
    roundBox(3.23, 0.31, 3.05, 0.16, 2.85, 0.79, -0.51, duvet);
    softSurface(3.12, 2.95, 2.85, 0.952, -0.51, duvet, 0.014);
    for (const px of [2.13, 3.57]) {
      const pillow = paddedShape(1.27, 0.29, 0.78, px, 1.08, -2.18, upholstery);
      pillow.rotation.y = px < 3 ? -0.07 : 0.07;
      const seam = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.012, 6, 48), mat("#0a0a0e", 1));
      seam.scale.set(1.48, 0.55, 1);
      seam.position.set(px, 1.085, -2.18);
      seam.rotation.x = Math.PI / 2;
      scene.add(seam);
    }
    const bedGroup = new THREE.Group();
    bedGroup.position.set(2.73, 0, -4.87);
    bedGroup.rotation.y = -Math.PI / 2;
    scene.add(bedGroup);
    const bedItems = scene.children.slice(bedObjectsStart).filter((item) => item !== bedGroup);
    for (const item of bedItems) {
      scene.remove(item);
      bedGroup.add(item);
      item.position.x -= 2.85;
      item.position.z += 1.0;
    }

    const consoleWood = mat("#171619", 0.45, 0.08);
    box(0.68, 0.48, 3.1, -4.42, 0.3, -2.0, consoleWood);
    box(0.74, 0.055, 3.2, -4.42, 0.57, -2.0, mat("#25202b", 0.23, 0.12));
    for (const z of [-2.96, -2.03, -1.1]) {
      box(0.018, 0.32, 0.82, -4.072, 0.31, z, mat("#26212d", 0.55));
    }
    box(0.1, 1.76, 2.82, -4.66, 1.72, -2.0, black);

    const tvCanvas = document.createElement("canvas");
    tvCanvas.width = 1280;
    tvCanvas.height = 720;
    const tvCtx = tvCanvas.getContext("2d", { willReadFrequently: true });
    // FX_VIDEO_STABILITY_PATCH_V1: conservar imagen si el video se queda sin fotogramas.
    if (tvCtx) {
      tvCtx.fillStyle = "#05080d";
      tvCtx.fillRect(0, 0, tvCanvas.width, tvCanvas.height);
    }
    const tvTexture = new THREE.CanvasTexture(tvCanvas);
    const unsafeTvVideos = new WeakSet<HTMLVideoElement>();
    tvTexture.colorSpace = THREE.SRGBColorSpace;
    const makeVideo = (src: string) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.src = `${src}?v=${encodeURIComponent(process.env.NEXT_PUBLIC_FX_VIDEO_VERSION || "fx-20261105-refresh")}`;
      video.muted = true;
      video.defaultMuted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.preload = "auto";
      for (const event of [
        "loadeddata",
        "canplay",
        "playing",
        "timeupdate",
        "seeked",
        "waiting",
        "stalled",
        "suspend",
      ]) {
        video.addEventListener(event, () => wakeRender.current?.(), { signal: abort.signal });
      }
      if ("requestVideoFrameCallback" in video) {
        const onVideoFrame = () => {
          if (abort.signal.aborted) return;
          wakeRender.current?.();
          video.requestVideoFrameCallback(onVideoFrame);
        };
        video.requestVideoFrameCallback(onVideoFrame);
      }
      video.addEventListener(
        "ended",
        () => {
          video.currentTime = 0;
          playTv(video, true);
        },
        { signal: abort.signal },
      );
      video.addEventListener(
        "error",
        () => {
          const code = video.error?.code;
          if (process.env.NODE_ENV !== "production") {
            console.warn("[CinematicTour] Video could not be decoded or loaded:", src, code);
          }
          wakeRender.current?.();
        },
        { signal: abort.signal },
      );
      return video;
    };
    const tvVideos: Record<TvMode, HTMLVideoElement> = {
      videocall: makeVideo("/assets/my-room/Fx-2026-08-ROOM.mp4"),
      stage: makeVideo("/assets/my-room/pasarella2.mp4"),
    };
    const tvMaterial = new THREE.MeshBasicMaterial({
      map: tvTexture,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const tvFace = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.51875), tvMaterial);
    const tvBezel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.82, 1.64),
      new THREE.MeshBasicMaterial({ color: "#05080d", toneMapped: false, side: THREE.DoubleSide }),
    );
    tvBezel.position.set(-4.595, 1.72, -2.0);
    tvBezel.rotation.y = Math.PI / 2;
    scene.add(tvBezel);
    tvFace.position.set(-4.58, 1.72, -2.0);
    tvFace.rotation.y = Math.PI / 2;
    tvFace.userData.fxDestination = "fx:play-tv";
    interactiveTargets.push(tvFace);
    scene.add(tvFace);

    let screenMode: TvMode = "videocall";
    let lastFrameTime = 0;
    let lastAdvanceAt = 0;
    let streamRetryCount = 0;
    let lastVideoMode: TvMode = "videocall";
    const pendingTvPlayback = new WeakSet<HTMLVideoElement>();
    const blockedTvPlayback = new WeakSet<HTMLVideoElement>();
    const playTv = (video: HTMLVideoElement, userGesture = false) => {
      if (abort.signal.aborted || !video.paused || pendingTvPlayback.has(video)) return;
      if (blockedTvPlayback.has(video) && !userGesture) return;
      pendingTvPlayback.add(video);
      void video
        .play()
        .then(() => {
          blockedTvPlayback.delete(video);
          wakeRender.current?.();
        })
        .catch((error: unknown) => {
          if ((error as Error)?.name !== "AbortError") {
            blockedTvPlayback.add(video);
            if (process.env.NODE_ENV !== "production") {
              console.warn("[CinematicTour] TV playback could not start:", error);
            }
          }
        })
        .finally(() => {
          pendingTvPlayback.delete(video);
          wakeRender.current?.();
        });
    };
    retryTvPlayback = () => {
      const video = tvVideos[screenMode];
      blockedTvPlayback.delete(video);
      if (video.paused) playTv(video, true);
      for (const video of Object.values(laptopVideos))
        if (video.paused) void video.play().catch(() => { });
    };
    const resumeTvOnGesture = () => {
      retryTvPlayback();
    };
    window.addEventListener("pointerdown", resumeTvOnGesture, { signal: abort.signal });
    window.addEventListener("keydown", resumeTvOnGesture, { signal: abort.signal });
    document.addEventListener(
      "visibilitychange",
      () => {
        if (!document.hidden) retryTvPlayback();
        wakeRender.current?.();
      },
      { signal: abort.signal },
    );
    // Solo decodificar el video activo, no los dos simultaneamente.
    playTv(tvVideos.videocall);
    let transitionStart = -1;
    const previousFrame = document.createElement("canvas");
    previousFrame.width = 1280;
    previousFrame.height = 720;
    const previousCtx = previousFrame.getContext("2d");
    const drawTv = (now: number) => {
      if (!tvCtx) return;
      // No borrar la textura en cada render: retener el ultimo fotograma valido.
      const video = tvVideos[screenMode];
      if (
        !unsafeTvVideos.has(video) &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        try {
          const factor = Math.min(1280 / video.videoWidth, 720 / video.videoHeight);
          const w = video.videoWidth * factor;
          const h = video.videoHeight * factor;
          // Limpiar bandas solo cuando tenemos un fotograma listo.
          tvCtx.fillStyle = "#05080d";
          tvCtx.fillRect(0, 0, 1280, 720);
          tvCtx.drawImage(video, (1280 - w) / 2, (720 - h) / 2, w, h);
          tvCtx.getImageData(0, 0, 1, 1);
        } catch (error) {
          unsafeTvVideos.add(video);
          tvCanvas.width = 1280;
          tvCanvas.height = 720;
          tvCtx.fillStyle = "#05080d";
          tvCtx.fillRect(0, 0, 1280, 720);
          previousFrame.width = 1280;
          previousFrame.height = 720;
          transitionStart = -1;
          if (process.env.NODE_ENV !== "production") {
            console.warn("[CinematicTour] Skipping unsafe TV video frame:", error);
          }
        }
      }
      if (transitionStart >= 0 && previousCtx) {
        const alpha = Math.max(0, 1 - (now - transitionStart) / 450);
        if (alpha > 0) {
          tvCtx.globalAlpha = alpha;
          tvCtx.drawImage(previousFrame, 0, 0);
          tvCtx.globalAlpha = 1;
        } else transitionStart = -1;
      }
      // HUD de cámara sobre el vídeo
      tvCtx.save();
      const pulse = 0.7 + 0.3 * Math.sin(now * 0.005);
      const elapsed = Number.isFinite(video.currentTime) ? Math.floor(video.currentTime) : 0;
      const padTime = (value: number) => String(value).padStart(2, "0");
      const timer = `${padTime(Math.floor(elapsed / 3600))}:${padTime(Math.floor(elapsed / 60) % 60)}:${padTime(elapsed % 60)}`;
      const corner = (x: number, y: number, dx: number, dy: number) => {
        tvCtx.beginPath();
        tvCtx.moveTo(x + dx * 96, y);
        tvCtx.lineTo(x, y);
        tvCtx.lineTo(x, y + dy * 98);
        tvCtx.stroke();
      };
      tvCtx.lineWidth = 7;
      tvCtx.lineCap = "round";
      tvCtx.lineJoin = "round";
      tvCtx.strokeStyle = "#fafafa";
      corner(142, 112, 1, 1);
      corner(1138, 112, -1, 1);
      corner(142, 563, 1, -1);
      corner(1138, 563, -1, -1);
      tvCtx.beginPath();
      tvCtx.arc(70, 55, 12, 0, Math.PI * 2);
      tvCtx.fillStyle = `rgba(255, 62, 80, ${pulse})`;
      tvCtx.fill();
      tvCtx.fillStyle = "#ffffff";
      tvCtx.beginPath();
      tvCtx.roundRect(93, 32, 86, 46, 10);
      tvCtx.fill();
      tvCtx.textBaseline = "middle";
      tvCtx.textAlign = "left";
      tvCtx.fillStyle = "#25252a";
      tvCtx.font = "bold 32px monospace";
      tvCtx.fillText("REC", 105, 55);
      tvCtx.fillStyle = "#ffffff";
      tvCtx.font = "bold 32px monospace";
      tvCtx.fillText(timer, 205, 56);
      tvCtx.fillStyle = "#ffffff";
      tvCtx.font = "bold 29px monospace";
      tvCtx.fillText("FPS60", 896, 56);
      tvCtx.fillText("HD", 1030, 56);
      tvCtx.beginPath();
      tvCtx.roundRect(1098, 31, 62, 48, 9);
      tvCtx.fill();
      tvCtx.fillStyle = "#24242a";
      tvCtx.fillText("4K", 1107, 56);
      tvCtx.fillStyle = "#ffffff";
      tvCtx.fillText("8K", 1175, 56);
      tvCtx.beginPath();
      tvCtx.moveTo(618, 333);
      tvCtx.lineTo(667, 333);
      tvCtx.moveTo(642, 307);
      tvCtx.lineTo(642, 369);
      tvCtx.strokeStyle = "rgba(255,255,255,0.95)";
      tvCtx.lineWidth = 3;
      tvCtx.stroke();
      tvCtx.fillStyle = "#ffffff";
      tvCtx.font = "bold 30px monospace";
      tvCtx.fillText("ISO100", 84, 630);
      tvCtx.fillText("F3.5", 253, 630);
      tvCtx.lineWidth = 3;
      tvCtx.strokeStyle = "#ffffff";
      tvCtx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const x = 467 + i * 8;
        const height = i % 5 === 0 ? 23 : i % 2 === 0 ? 16 : 9;
        tvCtx.moveTo(x, 635);
        tvCtx.lineTo(x, 635 - height);
      }
      tvCtx.stroke();
      tvCtx.beginPath();
      tvCtx.moveTo(626, 656);
      tvCtx.lineTo(640, 643);
      tvCtx.lineTo(654, 656);
      tvCtx.closePath();
      tvCtx.fill();
      tvCtx.font = "bold 28px monospace";
      tvCtx.fillText("L", 861, 631);
      tvCtx.fillText("R", 1055, 631);
      tvCtx.beginPath();
      for (let i = 0; i < 11; i++) {
        const xL = 894 + i * 12;
        const xR = 1087 + i * 12;
        tvCtx.moveTo(xL, 611);
        tvCtx.lineTo(xL, 633);
        tvCtx.moveTo(xR, 611);
        tvCtx.lineTo(xR, 633);
      }
      tvCtx.stroke();
      tvCtx.restore();
      tvTexture.needsUpdate = true;
    };
    const updateTv = (p: number, now: number) => {
      const mode: TvMode = p >= TV_STAGE_AT ? "stage" : "videocall";
      if (screenMode !== mode) {
        if (previousCtx) {
          try {
            previousCtx.drawImage(tvCanvas, 0, 0);
            previousCtx.getImageData(0, 0, 1, 1);
          } catch {
            previousFrame.width = 1280;
            previousFrame.height = 720;
          }
        }
        transitionStart = now;
        screenMode = mode;
        onModeChangeRef.current?.(mode);
      }
      const tvVisible = p >= TV_ACTIVE_FROM;
      for (const [modeName, video] of Object.entries(tvVideos) as [TvMode, HTMLVideoElement][]) {
        if (modeName !== screenMode && !video.paused) video.pause();
      }
      const activeVideo = tvVideos[screenMode];
      if (!document.hidden && activeVideo.paused) playTv(activeVideo);
      if (screenMode !== lastVideoMode) {
        lastVideoMode = screenMode;
        lastFrameTime = activeVideo.currentTime;
        lastAdvanceAt = now;
        streamRetryCount = 0;
      }
      if (tvVisible && !document.hidden && activeVideo.readyState >= 2) {
        const advanced = Math.abs(activeVideo.currentTime - lastFrameTime) >= 0.06;
        if (advanced) {
          lastFrameTime = activeVideo.currentTime;
          lastAdvanceAt = now;
          streamRetryCount = 0;
        } else if (
          !activeVideo.paused &&
          activeVideo.currentTime > 0 &&
          now - lastAdvanceAt > 3500 &&
          streamRetryCount < 2
        ) {
          // No reiniciar un video que esta esperando decodificacion:
          // pausar/reproducir forzadamente provoca parpadeo negro.
          streamRetryCount += 1;
          lastAdvanceAt = now;
          if (process.env.NODE_ENV !== "production") {
            console.warn("[CinematicTour] TV video stalled", screenMode, activeVideo.readyState);
          }
        }
      }
      drawTv(now);
    };
    abort.signal.addEventListener(
      "abort",
      () => {
        for (const video of Object.values(tvVideos)) {
          video.pause();
          video.removeAttribute("src");
          video.load();
        }
        tvTexture.dispose();
      },
      { once: true },
    );

    const tvFill = new THREE.PointLight("#003db6", 2.8, 4);
    tvFill.position.set(-3.9, 1.9, -2);
    scene.add(tvFill);
    const leftRoomFill = new THREE.PointLight("#75dfff", 4.3, 7.5);
    leftRoomFill.position.set(-3.3, 2.6, 0.25);
    scene.add(leftRoomFill);
    const leftRoomBounce = new THREE.PointLight("#246aca", 2.6, 6.0);
    leftRoomBounce.position.set(-3.7, 1.45, -3.5);
    scene.add(leftRoomBounce);
    const leftFill = new THREE.PointLight("#33d9ff", 5.5, 8);
    leftFill.position.set(-7.2, 2.15, -1.4);
    scene.add(leftFill);
    const leftRim = new THREE.SpotLight("#1dcfff", 2.2, 11, Math.PI / 5, 0.45, 1.15);
    leftRim.position.set(-8.1, 3.0, -0.5);
    leftRim.target.position.set(-4.6, 1.7, -2.0);
    scene.add(leftRim);
    scene.add(leftRim.target);

    const crownTexture = canvas(
      (ctx) => {
        ctx.fillStyle = "#02040a";
        ctx.fillRect(0, 0, 640, 960);
      },
      640,
      960,
    );
    const crownPoster = new THREE.MeshBasicMaterial({
      map: crownTexture,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const crownImage = new Image();
    crownImage.crossOrigin = "anonymous";
    crownImage.onload = () => {
      if (abort.signal.aborted || !crownImage.naturalWidth || !crownImage.naturalHeight) return;
      const board = crownTexture.image as HTMLCanvasElement;
      const ctx = board.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#02040a";
      ctx.fillRect(0, 0, board.width, board.height);
      const maxWidth = board.width * 0.78;
      const maxHeight = board.height * 0.7;
      const scale = Math.min(
        maxWidth / crownImage.naturalWidth,
        maxHeight / crownImage.naturalHeight,
      );
      const w = crownImage.naturalWidth * scale;
      const h = crownImage.naturalHeight * scale;
      ctx.drawImage(crownImage, (board.width - w) / 2, (board.height - h) / 2, w, h);
      crownTexture.needsUpdate = true;
      wakeRender.current?.();
    };
    crownImage.src = "/assets/my-room/crownCyan.png";
    pic(4.87, 2.65, -3.22, -Math.PI / 2, crownPoster, 1.6, 2.4);
    const neonPink = new THREE.PointLight("#2b66a8", 7, 3.9);
    neonPink.position.set(4.14, 2.85, -3.2);
    scene.add(neonPink);
    const neonBlue = new THREE.PointLight("#003db6", 5, 3.9);
    neonBlue.position.set(4.23, 2.24, -3.4);
    scene.add(neonBlue);
    const coolAccent = new THREE.PointLight("#356bdb", 2.5, 4); // Intensidad bajada de 5 a 2.5
    coolAccent.position.set(-2.9, 2.8, -4.15); // Altura subida de 2.2 a 2.8
    scene.add(coolAccent);
    const sofaFill = new THREE.PointLight("#f3dae7", 12, 5.2);
    sofaFill.position.set(-1.0, 2.5, -4.65);
    scene.add(sofaFill);
    const modelLoader = new GLTFLoader();
    const modelSlots = [
      {
        name: "bed",
        file: "/assets/my-room/bed.glb",
        pos: [2.73, 0, -4.87],
        size: [3.9, 2.55, 3.6],
      },
      {
        name: "sofa",
        file: "/assets/my-room/sofa.glb",
        pos: [4.2, 0, -1.2],
        size: [1.8, 1.65, 2.4],
      },
      {
        name: "mirror",
        file: "/assets/my-room/mirror.glb",
        pos: [-4.53, 0, -3.35],
        size: [1.3, 3, 0.4],
      },
    ] as const;
    const loadHighDetailModel = (
      file: string,
      position: readonly number[],
      bounds: readonly number[],
    ) => {
      fetch(file, { method: "HEAD", signal: abort.signal })
        .then((response) => {
          if (!response.ok || abort.signal.aborted) return;
          modelLoader.load(
            file,
            (gltf) => {
              if (abort.signal.aborted) return;
              const object = gltf.scene;
              object.updateMatrixWorld(true);
              const cube = new THREE.Box3().setFromObject(object);
              const cur = new THREE.Vector3();
              cube.getSize(cur);
              if (cur.x <= 0 || cur.y <= 0 || cur.z <= 0) return;
              const factor = Math.min(bounds[0] / cur.x, bounds[1] / cur.y, bounds[2] / cur.z);
              object.scale.multiplyScalar(factor);
              object.updateMatrixWorld(true);
              const aligned = new THREE.Box3().setFromObject(object);
              const center = new THREE.Vector3();
              aligned.getCenter(center);
              object.position.set(
                position[0] - center.x,
                position[1] - aligned.min.y,
                position[2] - center.z,
              );
              scene.add(object);
              wakeRender.current?.();
            },
            undefined,
            () => { },
          );
        })
        .catch(() => { });
    };
    const enabledModelSlots: readonly string[] = [];
    for (const slot of modelSlots) {
      if (enabledModelSlots.includes(slot.name))
        loadHighDetailModel(slot.file, slot.pos, slot.size);
    }

    // ── Estado de cámara ──
    const position = frames[0].p.clone();
    const look = frames[0].l.clone();
    const lookSmooth = frames[0].l.clone();
    const camFwd = new THREE.Vector3();
    const camRight = new THREE.Vector3();
    const camUp = new THREE.Vector3();
    const worldUp = new THREE.Vector3(0, 1, 0);

    const resize = () => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      wakeRender.current?.();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(el);
    window.addEventListener("resize", resize);

    // Arranque coherente si el componente monta con progreso ≠ 0 (deep-link).
    current.current = clamp(target.current);
    const u0 = timeToU(current.current);
    samplePath(u0, 0, position, look);
    lookSmooth.copy(look);
    fovSmooth.current = fovAt(u0);
    uPrev.current = u0;
    camera.position.copy(position);
    camera.lookAt(lookSmooth);
    camera.fov = fovSmooth.current;
    camera.updateProjectionMatrix();

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = 0;
      const dt = THREE.MathUtils.clamp((now - last) / 1000, 1e-4, 0.05);
      last = now;
      clock.current += dt;
      if (wallLogo && !reducedMotion) {
        const T = clock.current;
        wallLogo.rotation.y = -Math.PI / 2 + Math.sin(T * 0.55) * 0.09;
        wallLogo.position.y = LOGO_Y + Math.sin(T * 0.9) * 0.01;
      }

      // 1) PROGRESO — muelle con memoria de velocidad + aceleración adaptativa.
      const gap = target.current - current.current;
      const dist = Math.abs(gap);
      const smoothTime = reducedMotion ? TUNING.smoothTimeReduced : TUNING.smoothTime;
      const maxSpeed = reducedMotion
        ? 5
        : Math.min(TUNING.speedCeil, TUNING.baseSpeed + dist * TUNING.catchUp);
      let next = smoothDamp(
        current.current,
        target.current,
        progressVel.current,
        smoothTime,
        maxSpeed,
        dt,
      );
      const capStep = TUNING.speedCap * dt;
      next = current.current + THREE.MathUtils.clamp(next - current.current, -capStep, capStep);
      current.current = next;
      const scrollSettled = dist < 0.0004 && Math.abs(progressVel.current.v) < 0.003;
      if (scrollSettled) {
        current.current = target.current;
        progressVel.current.v = 0;
      }
      // 1) RUTA — anticipación de la mirada + ease-in de arranque (v6).
      const eased =
        reducedMotion || current.current >= TUNING.entryEase
          ? current.current
          : (current.current * current.current) / (TUNING.entryEase * 2);
      const u = timeToU(eased);
      const rawUSpeed = (u - uPrev.current) / dt;
      uPrev.current = u;
      uSpeed.current = damp(uSpeed.current, scrollSettled ? 0 : rawUSpeed, 7, dt);
      const lead = THREE.MathUtils.clamp(
        uSpeed.current * TUNING.lookAhead,
        -TUNING.lookAheadMax,
        TUNING.lookAheadMax,
      );
      const fov = fovAt(u) + Math.min(TUNING.fovKickMax, Math.abs(uSpeed.current) * TUNING.fovKick);
      samplePath(u, lead, position, look);
      // 2) PELÍCULA — banking + letterbox + viñeta.
      const yaw = Math.atan2(look.x - position.x, look.z - position.z);
      if (!yawInit.current) {
        yawPrev.current = yaw;
        yawInit.current = true;
      }
      let dyaw = yaw - yawPrev.current;
      if (dyaw > Math.PI) dyaw -= Math.PI * 2;
      else if (dyaw < -Math.PI) dyaw += Math.PI * 2;
      yawPrev.current = yaw;
      const bankTarget = reducedMotion
        ? 0
        : THREE.MathUtils.clamp((dyaw / dt) * TUNING.bank, -TUNING.bank, TUNING.bank);
      bank.current = damp(bank.current, bankTarget, TUNING.bankLambda, dt);
      const speed01 = THREE.MathUtils.clamp(Math.abs(uSpeed.current) / TUNING.barSpeed, 0, 1);
      const barTarget = reducedMotion ? 0 : TUNING.barMax * speed01 * speed01;
      barPx.current = damp(barPx.current, barTarget, TUNING.barLambda, dt);
      if (barTopRef.current) barTopRef.current.style.height = `${barPx.current.toFixed(2)}px`;
      if (barBottomRef.current) barBottomRef.current.style.height = `${barPx.current.toFixed(2)}px`;
      if (vignetteRef.current) {
        vignetteRef.current.style.opacity = (
          reducedMotion ? TUNING.vignetteIdle : TUNING.vignetteIdle + TUNING.vignetteSpeed * speed01
        ).toFixed(3);
      }
      // 3) VIDA EN LOS STOPS — respiración + parallax del puntero.
      const probe = probeStop(current.current);
      const lifeTarget = reducedMotion || !scrollSettled ? 0 : probe.env * lifeAt(u);
      life.current = damp(life.current, lifeTarget, TUNING.fadeIn, dt);
      pointer.current.x = damp(pointer.current.x, pointerTarget.current.x, 4, dt);
      pointer.current.y = damp(pointer.current.y, pointerTarget.current.y, 4, dt);
      const alive = life.current > 0.0015;
      if (alive) {
        const T = clock.current;
        camFwd.subVectors(look, position).normalize();
        camRight.crossVectors(camFwd, worldUp).normalize();
        camUp.crossVectors(camRight, camFwd);
        const b = life.current;
        position
          .addScaledVector(camRight, Math.sin(T * 0.9) * TUNING.breathSide * b)
          .addScaledVector(camUp, Math.sin(T * 1.7 + 1.3) * TUNING.breathUp * b);
        look
          .addScaledVector(
            camRight,
            (Math.sin(T * 0.63 + 0.6) * TUNING.lookSway + pointer.current.x * TUNING.parallax) * b,
          )
          .addScaledVector(
            camUp,
            (Math.sin(T * 0.81) * TUNING.lookSway * 0.6 -
              pointer.current.y * TUNING.parallax * 0.6) *
            b,
          );
      }
      lookSmooth.lerp(look, 1 - Math.exp(-TUNING.lookSettle * dt));
      camera.position.copy(position);
      camera.lookAt(lookSmooth);
      if (alive) {
        camera.rotateZ(
          (Math.sin(clock.current * 0.47) * TUNING.roll + pointer.current.x * 0.004) * life.current,
        );
      }
      if (!reducedMotion && Math.abs(bank.current) > 1e-5) {
        camera.rotateZ(bank.current);
      }
      // 4) STEP ACTIVO — notifica a la UI solo cuando cambia step o fase.
      const stepInfo = stepAt(current.current);
      const stepPhase: StepPhase = probe.env > 0.5 ? "hold" : "travel";
      const stepStamp = `${stepInfo.index}:${stepPhase}`;
      if (stepStamp !== stepReported.current) {
        stepReported.current = stepStamp;
        onStepChangeRef.current?.(stepInfo.key, stepPhase, stepInfo.index);
      }
      // 5) FOV — suavizado.
      fovSmooth.current = damp(fovSmooth.current, fov, 9, dt);
      if (Math.abs(camera.fov - fovSmooth.current) > 0.004) {
        camera.fov = fovSmooth.current;
        camera.updateProjectionMatrix();
      }
      const wantLaptop: LaptopMode =
        current.current >= LAPTOP_MULTIMEDIA_AT ? "multimedia" : "gallery";
      if (wantLaptop !== laptopMode) {
        laptopMode = wantLaptop;
        updateLaptopVideo();
        wakeRender.current?.();
      }
      updateTv(current.current, now);
      renderer.render(scene, camera);
      const lookSettled = lookSmooth.distanceToSquared(look) < 1e-6;
      const videoPlaying =
        Object.values(tvVideos).some((video) => !video.paused) ||
        Object.values(laptopVideos).some((video) => !video.paused) ||
        transitionStart >= 0;
      if (
        !scrollSettled ||
        !lookSettled ||
        videoPlaying ||
        life.current > 0.002 ||
        barPx.current > 0.5 ||
        (wallLogo && !reducedMotion && current.current < 0.2)
      ) {
        raf = requestAnimationFrame(tick);
      }
    };
    const wake = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    wakeRender.current = wake;
    wake();
    return () => {
      abort.abort();
      wakeRender.current = null;
      if (raf) cancelAnimationFrame(raf);
      mql?.removeEventListener?.("change", onReducedMotionChange);
      window.removeEventListener("resize", resize);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("click", onInteractiveClick);
      renderer.domElement.removeEventListener("pointermove", onInteractiveMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      const textureKeys = [
        "map",
        "normalMap",
        "emissiveMap",
        "roughnessMap",
        "metalnessMap",
      ] as const;
      scene.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) {
          for (const key of textureKeys) {
            const tex = (material as THREE.MeshStandardMaterial)[key];
            if (tex) tex.dispose();
          }
          material.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);
  return (
      <div ref={host} className="cinematic-tour">
      <style dangerouslySetInnerHTML={{ __html: CINE_CSS }} />
      <div ref={vignetteRef} className="ct-vignette" aria-hidden="true" style={{ opacity: TUNING.vignetteIdle }} />
      <div className="ct-grain" aria-hidden="true" />
      <div ref={barTopRef} className="ct-bar" aria-hidden="true" />
      <div ref={barBottomRef} className="ct-bar ct-bar-bottom" aria-hidden="true" />      
{/* Portada */}
      <div ref={coverRef} className="ct-cover">
      <p ref={coverUserRef} className="ct-cover-eyebrow">
       USER FX
      </p>
      <div className="ct-cover-title">
      <span ref={coverWelcomeRef} className="ct-chrome">
       WELCOME
      </span>
      <span ref={coverPrivateRef} className="ct-blue">
       PRIVATE WORLD 
      </span>
      </div>
      <p ref={coverHintRef} className="ct-cover-hint">
       Desplázate para entrar
      </p>
      </div>
      </div>
      );
      }
