# USER FX — Código completo de los últimos cambios

Rama fuente: `feature/userfx-crown-scroll-20261017`. Esta entrega copia los seis archivos completos; la aplicación original no se modifica.

Formato JSX: etiqueta de apertura completa, contenido en su propio renglón y etiqueta de cierre en otro. Las etiquetas autocerradas se dejan en un solo renglón.

## `components/FX/CinematicTour.tsx`

```tsx
"use client";
/**
 * CinematicTour — recorrido cinemático por scroll (versión mejorada).
 *
 * MEJORAS RESPECTO A LA VERSIÓN ANTERIOR
 * ──────────────────────────────────────
 * 1. SCROLL → CÁMARA: el damping exponencial se sustituye por un muelle
 *    crítico con memoria de velocidad (port de SmoothDamp de Unity).
 *    - El movimiento acumula y cede velocidad de forma continua: los scrolls
 *      bruscos no producen latigazos ni cambios de dirección secos.
 *    - Las llegadas al stop tienen ease-out natural (antes el "snap" final
 *      era pegajoso y dependía de un epsilon).
 *    - Velocidad máxima adaptativa: los saltos grandes de scroll alcanzan
 *      antes su destino sin perder la elegancia en los pequeños.
 * 2. STOPS / PAUSAS:
 *    - Hold asimétrico: la cámara FRENA al entrar al stop y sale con
 *      impulso (antes el drift dentro del hold era a velocidad constante).
 *    - "Vida" en las pausas: cuando el scroll se detiene sobre un stop, la
 *      cámara respira (bob vertical + balanceo lateral + micro-roll) y
 *      responde al puntero con un parallax sutil. Todo se desvanece a cero
 *      en cuanto se vuelve a hacer scroll.
 *    - El render bajo demanda se mantiene: el loop solo queda vivo mientras
 *      hay movimiento, hay vídeo en marcha o la respiración está visible.
 * 3. CÁMARA:
 *    - Anticipación de la mirada (look-ahead proporcional a la velocidad):
 *      la cámara mira hacia donde va y se asienta exactamente en el sujeto
 *      del stop al frenar.
 *    - FOV suavizado, sin overshoot de la spline y con un ligero "kick" de
 *      velocidad que ensancha el encuadre al acelerar.
 *    - Micro-roll sincronizado con la respiración (~0.15°).
 *    - Arranque coherente: si el componente monta con progreso ≠ 0
 *      (deep-link), la cámara nace ya en su pose.
 *    - prefers-reduced-motion ahora es reactivo (escucha cambios) y apaga
 *      respiración/parallax además de acortar las transiciones.
 *
 * Todos los valores finos están en TUNING, al final de este bloque.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ENTER_AT, STOP_HOLD, STOP_T } from "./tourTimeline";
import "./CinematicTour.css";

// ─── AJUSTES FINOS DE CÁMARA (afinar aquí, no hay que tocar el resto) ──────
const TUNING = {
  // Llegada del scroll (muelle amortiguado)
  smoothTime: 0.32,        // s: menor = más directo, mayor = más cinematográfico
  smoothTimeReduced: 0.06, // s: con prefers-reduced-motion (casi inmediato)
  baseSpeed: 0.6,          // progreso/s: velocidad base de crucero
  catchUp: 2.6,            // aceleración extra por unidad de distancia restante
  speedCap: 1.8,           // progreso/s: red de seguridad (no debería activarse)

  // Anticipación de la mirada (en unidades de keyframe, segmento = 1)
  lookAhead: 0.09,         // keyframes de adelanto por (u/s) de velocidad
  lookAheadMax: 0.22,      // tope de adelanto

  // FOV dinámico
  fovKick: 0.8,            // grados de ensanchamiento por (u/s)
  fovKickMax: 1.8,         // tope del kick

  // Vida en los stops (respiración + parallax); todo en metros salvo roll
  fadeIn: 2.2,             // lambda de aparición/desaparición al parar/mover
  breathSide: 0.006,       // bob lateral de la posición
  breathUp: 0.005,         // bob vertical de la posición
  lookSway: 0.035,         // balanceo del punto de mirada
  parallax: 0.09,          // desplazamiento del punto de mirada con el puntero
  roll: 0.0022,            // micro-roll (~0.13°) sincronizado con la respiración
} as const;

type RoomAngle = "bed" | "laptop" | "tv";
type TvMode = "videocall" | "multimedia" | "stage";
type Props = {
  progress: number;
  stageKey?: string;
  roomAngle?: RoomAngle;
  onModeChange?: (mode: TvMode) => void;
};

const P = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const damp = (cur: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.lerp(cur, target, 1 - Math.exp(-lambda * dt));

/**
 * Muelle amortiguado crítico con memoria de velocidad (port de SmoothDamp).
 * A diferencia del damping exponencial, la velocidad NO se reinicia con cada
 * cambio del objetivo: se acumula y se cede de forma continua. Resultado:
 * sin latigazos en cambios bruscos de dirección y con llegadas ease-out.
 */
const smoothDamp = (
  current: number,
  target: number,
  vel: { v: number },
  smoothTime: number,
  maxSpeed: number,
  dt: number
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
  // Evitar overshoot alrededor del objetivo
  if ((toTarget - current > 0) === output > toTarget) {
    output = toTarget;
    vel.v = (output - toTarget) / Math.max(dt, 1e-4);
  }
  return output;
};

type Frame = {
  id: string;
  t: number;
  p: THREE.Vector3;
  l: THREE.Vector3;
  fov: number;
  hold?: number;
  /** avance residual durante el hold (unidades de keyframe): el stop "respira" en vez de congelarse */
  drift?: number;
};

/**
 * TIMELINE DE CÁMARA — 8 stops definidos en ./tourTimeline (compartidos con RoomIntro).
 * Cada stop apunta al objeto que describe su texto en pantalla:
 *  0 welcome   · fondo del pasillo / puerta
 *  1 inside    · cuadro DERECHO del pasillo
 *  2 corridor  · cuadro IZQUIERDO del pasillo
 *  3 enter     · hero del dormitorio
 *  3 gallery   · LAPTOP (pantalla "MY GALLERY", clicable)
 *  4 videocall · TV mostrando la videollamada, vista desde la CAMA
 *  5 multimedia· TV mostrando multimedia (acercándose)
 *  6 stage     · TV con la pasarela (push-in)
 * Los frames "via-*" no son stops: solo reparten velocidad.
 */
const S = (i: number) => ({ t: STOP_T[i], hold: STOP_HOLD[i] || undefined });
const frames: Frame[] = [
  { id: "welcome",   ...S(0),              fov: 58, p: P( 0.00, 1.62, 14.50), l: P( 0.00, 1.78,  6.00) },
  { id: "corridor",  ...S(1), drift: 0.06, fov: 56, p: P( 0.14, 1.66,  9.10), l: P(-0.95, 1.96,  5.60) },
  { id: "via-exit",  t: 0.27,             fov: 58, p: P( 0.00, 1.74,  5.60), l: P( 0.00, 1.62, -0.80) },
  { id: "enter",     ...S(2), drift: 0.03, fov: 60, p: P( 0.30, 1.82,  2.10), l: P(-0.30, 1.48, -3.60) },
  // LAPTOP centrada en el encuadre (pantalla en -0.40, 1.01, -3.77)
  { id: "gallery",   ...S(3), drift: 0.03, fov: 46, p: P(-0.40, 1.52, -1.15), l: P(-0.40, 1.03, -3.77) },
  // Desde la cama (cabecera al este) mirando la TV en la pared oeste
  { id: "videocall", ...S(4), drift: 0.03, fov: 34, p: P( 3.35, 1.48, -1.00), l: P(-4.58, 1.72, -2.00) },
  { id: "tv",        ...S(5),              fov: 48, p: P(-1.15, 1.72, -1.60), l: P(-4.58, 1.72, -2.00) },
  { id: "stage",     ...S(6),              fov: 44, p: P(-1.80, 1.72, -1.82), l: P(-4.58, 1.72, -2.00) },
  { id: "stage-side",  ...S(7), drift: 0.018, fov: 47, p: P(-2.20, 2.35, -0.68), l: P(-4.58, 1.72, -2.00) },
  { id: "stage-close", ...S(8),              fov: 41, p: P(-3.25, 1.76, -1.75), l: P(-4.58, 1.72, -2.00) },
];

const TV_MULTIMEDIA_AT = ENTER_AT[5]; // la TV cambia exactamente cuando cambia el texto
const TV_STAGE_AT = ENTER_AT[6];

// Ángulos alternativos dentro de la habitación (selector "ÁNGULO")
const angleCfg = {
  laptop: { p: P(-0.40, 1.30, -2.30), l: P(-0.40, 1.02, -3.77), fov: 36 },
  tv:     { p: P(-1.60, 1.62, -2.00), l: P(-4.58, 1.72, -2.00), fov: 44 },
} as const;
const angleWindow = (p: number) => smooth(0.52, 0.57, p) * (1 - smooth(0.8, 0.85, p));

// ─── TIMELINE: scroll → u (índice de keyframe), monótona y C1 ──────────────
type Knot = { t: number; u: number; d: number | null };
// Perfil del hold: se entra frenando (HOLD_IN < 1) y se sale con impulso
// (HOLD_OUT > 1). Ambos quedan dentro del margen [0..3] de Fritsch–Carlson,
// así que la curva sigue siendo monótona (sin overshoot) y C1.
const HOLD_IN = 0.62;
const HOLD_OUT = 1.38;
const knots: Knot[] = [];
const LAST = frames.length - 1;
frames.forEach((f, i) => {
  const half = (f.hold ?? 0) / 2;
  if (half > 0) {
    const dr = i === 0 || i === LAST ? 0 : f.drift ?? 0;
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
  if (!a || !b) { k.d = 0; return; }
  const s0 = (k.u - a.u) / (k.t - a.t);
  const s1 = (b.u - k.u) / (b.t - k.t);
  k.d = s0 > 0 && s1 > 0 ? (2 * s0 * s1) / (s0 + s1) : 0;
});
if (process.env.NODE_ENV !== "production") {
  knots.forEach((k, i) => {
    if (i && k.t <= knots[i - 1].t) console.warn("[CinematicTour] holds solapados cerca de t =", k.t);
  });
}

const timeToU = (t: number) => {
  let i = 0;
  while (i < knots.length - 2 && t > knots[i + 1].t) i++;
  const a = knots[i], b = knots[i + 1];
  const h = b.t - a.t;
  const s = clamp((t - a.t) / h), s2 = s * s, s3 = s2 * s;
  return (
    (2 * s3 - 3 * s2 + 1) * a.u +
    (s3 - 2 * s2 + s) * h * (a.d as number) +
    (-2 * s3 + 3 * s2) * b.u +
    (s3 - s2) * h * (b.d as number)
  );
};

// ─── TRAYECTORIA: spline centrípeta (sin loops ni overshoot) ───────────────
const posCurve = new THREE.CatmullRomCurve3(frames.map((f) => f.p), false, "centripetal");
const lookCurve = new THREE.CatmullRomCurve3(frames.map((f) => f.l), false, "centripetal");
const SEGMENTS = frames.length - 1;

const fovAt = (u: number) => {
  const i = Math.max(0, Math.min(frames.length - 2, Math.floor(u)));
  const w = u - i;
  const f = (k: number) => frames[THREE.MathUtils.clamp(k, 0, frames.length - 1)].fov;
  const p0 = f(i - 1), p1 = f(i), p2 = f(i + 1), p3 = f(i + 2);
  const value = 0.5 * (
    2 * p1 + (-p0 + p2) * w +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * w * w +
    (-p0 + 3 * p1 - 3 * p2 + p3) * w * w * w
  );
  // Sin overshoot: la spline no inventa FOVs fuera del rango de los vecinos.
  const lo = Math.min(p0, p1, p2, p3);
  const hi = Math.max(p0, p1, p2, p3);
  return THREE.MathUtils.clamp(value, lo, hi);
};

/**
 * Muestrea la trayectoria en u. La MIRADA se muestrea `lead` keyframes por
 * delante: mientras la cámara recorre la ruta mira hacia donde va y, al
 * frenar en un stop (lead → 0), se asienta exactamente en el sujeto.
 */
const samplePath = (
  u: number,
  lead: number,
  position: THREE.Vector3,
  look: THREE.Vector3
) => {
  posCurve.getPoint(THREE.MathUtils.clamp(u / SEGMENTS, 0, 1), position);
  lookCurve.getPoint(THREE.MathUtils.clamp((u + lead) / SEGMENTS, 0, 1), look);
};

/**
 * 1 cerca de un stop (dentro de su hold, con un pequeño feather), 0 entre
 * stops. Gobierna la "vida" (respiración/parallax): solo respira donde hay
 * una pausa real, nunca en mitad de un travelling.
 */
const stopEnvelope = (p: number) => {
  let env = 0;
  const pad = 0.012;
  for (const f of frames) {
    const half = (f.hold ?? 0) / 2;
    if (half <= 0) continue;
    const e =
      smooth(f.t - half - pad, f.t - half + pad * 0.5, p) *
      (1 - smooth(f.t + half - pad * 0.5, f.t + half + pad, p));
    if (e > env) env = e;
  }
  return env;
};

// ─── COMPONENTE ────────────────────────────────────────────────────────────
export default function CinematicTour({
  progress,
  roomAngle = "bed",
  onModeChange,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const target = useRef(0);
  const current = useRef(0);
  const progressVel = useRef({ v: 0 });   // memoria de velocidad del muelle
  const uPrev = useRef(0);                // u del frame anterior
  const uSpeed = useRef(0);               // velocidad suavizada en u (keyframes/s)
  const fovSmooth = useRef(frames[0].fov);
  const life = useRef(0);                 // 0..1: intensidad de la respiración
  const clock = useRef(0);                // reloj acumulado (fases de respiración)
  const pointerTarget = useRef({ x: 0, y: 0 });
  const pointer = useRef({ x: 0, y: 0 });
  const angleRef = useRef<RoomAngle>(roomAngle);
  const wakeRender = useRef<(() => void) | null>(null);
  const onModeChangeRef = useRef(onModeChange);
  onModeChangeRef.current = onModeChange;

  useEffect(() => {
    target.current = clamp(progress);
    wakeRender.current?.();
  }, [progress]);

  useEffect(() => {
    angleRef.current = roomAngle;
    wakeRender.current?.();
  }, [roomAngle]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    // prefers-reduced-motion reactivo: si el usuario cambia la preferencia
    // en vivo, la cámara se adapta sin recargar.
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
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.55;
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    el.appendChild(renderer.domElement);

    // ── Interactivos (laptop + TV) ──
    const interactiveTargets: THREE.Object3D[] = [];
    const pickRay = new THREE.Raycaster();
    const pickPointer = new THREE.Vector2();
    const visitInteractive = (event: MouseEvent | PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return undefined;
      pickPointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1
      );
      pickRay.setFromCamera(pickPointer, camera);
      const hit = pickRay.intersectObjects(interactiveTargets, false)[0];
      if (!hit) return undefined;
      return hit.object.userData.fxDestination as string | undefined;
    };
    let retryTvPlayback = () => {};
    const onInteractiveClick = (event: MouseEvent) => {
      const destination = visitInteractive(event);
      if (!destination) return;
      event.preventDefault();
      event.stopPropagation();
      if (destination === "fx:play-tv") {
        retryTvPlayback();
        return;
      }
      if (destination.startsWith("https://")) {
        window.open(destination, "_blank", "noopener,noreferrer");
      } else {
        window.location.hash = destination;
      }
    };
    // El pointermove ahora también alimenta el parallax de las pausas.
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
      w: number, h: number, d: number,
      x: number, y: number, z: number,
      m: THREE.Material, parent: THREE.Object3D = scene
    ) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      o.position.set(x, y, z);
      parent.add(o);
      return o;
    };
    const canvas = (draw: (ctx: CanvasRenderingContext2D) => void, w = 512, h = 512) => {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
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
        map: canvas((ctx) => {
          const w = 1024, h = 640;
          const tv = heading === "PASARELA";
          const g = ctx.createLinearGradient(0, 0, w, h);
          g.addColorStop(0, "#07151e");
          g.addColorStop(0.58, tv ? "#102c49" : "#103d46");
          g.addColorStop(1, "#07131d");
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
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
            ctx.strokeStyle = "#70dcf1"; ctx.lineWidth = 3;
            ctx.strokeRect(628, 148, 265, 315);
          } else {
            for (let i = 0; i < 3; i++) {
              const x = 627 + i * 97;
              const c = ctx.createLinearGradient(x, 160, x + 77, 390);
              c.addColorStop(0, ["#2e7384", "#365b96", "#1e736b"][i]);
              c.addColorStop(1, "#071727");
              ctx.fillStyle = c; ctx.fillRect(x, 160 + (i % 2) * 23, 80, 230);
              ctx.strokeStyle = "rgba(182,240,239,.5)";
              ctx.strokeRect(x + 4, 164 + (i % 2) * 23, 72, 222);
            }
          }
          ctx.fillStyle = "#a7f2eb";
          ctx.font = "600 25px Arial"; ctx.textAlign = "left";
          ctx.fillText("U S E R  F X  /  PRIVATE WORLD", 65, 84);
          ctx.fillStyle = "#ffffff";
          ctx.font = tv ? "bold 83px Arial" : "bold 75px Arial";
          ctx.fillText(heading, 62, 264);
          ctx.font = "27px Arial"; ctx.fillStyle = "#b5d5e2";
          ctx.fillText(detail, 66, 319);
          ctx.fillStyle = tv ? "#2e82db" : "#178f91";
          ctx.beginPath(); ctx.roundRect(63, 422, 435, 101, 18); ctx.fill();
          ctx.fillStyle = "#ffffff"; ctx.textAlign = "center";
          ctx.font = "bold 32px Arial"; ctx.fillText(action, 280, 485);
          ctx.strokeStyle = "rgba(170,236,239,.36)"; ctx.lineWidth = 3;
          ctx.strokeRect(22, 20, 980, 600);
          ctx.fillStyle = "#86b1c2"; ctx.textAlign = "left";
          ctx.font = "21px Arial"; ctx.fillText("CLICK TO ENTER  /  ACCESS CONTROLLED", 66, 577);
        }, 1024, 640),
        side: THREE.DoubleSide,
        toneMapped: false,
      });

    const print = (title: string, subtitle: string, color = "#58c9e6") =>
      new THREE.MeshBasicMaterial({
        map: canvas((ctx) => {
          const g = ctx.createLinearGradient(0, 0, 512, 768);
          g.addColorStop(0, "#06121c");
          g.addColorStop(0.55, "#133f51");
          g.addColorStop(1, "#07101c");
          ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 768);
          ctx.strokeStyle = "rgba(135,218,234,.42)"; ctx.lineWidth = 4;
          ctx.strokeRect(24, 24, 464, 720);
          for (let i = 0; i < 11; i++) {
            ctx.strokeStyle = i % 2 ? "rgba(66,139,212,.16)" : "rgba(94,231,213,.22)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(256, 330, 64 + i * 23, 95 + i * 28, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.fillStyle = color; ctx.textAlign = "center";
          ctx.font = title === "USER" ? "bold 105px Arial" : "bold 170px Arial";
          ctx.fillText(title, 256, 368);
          ctx.fillStyle = "#edfaff"; ctx.font = "bold 48px Arial";
          ctx.fillText(subtitle, 256, 437);
          ctx.fillStyle = "#82acb9"; ctx.font = "22px Arial";
          ctx.fillText("PRIVATE WORLD  /  18", 256, 691);
        }, 512, 768),
        side: THREE.DoubleSide,
        toneMapped: false,
    });
// Sin PointLight por cuadro: los materiales son Basic y los apliques ya iluminan el marco.
    const pic = (
      x: number, y: number, z: number, rotate: number,
      material: THREE.Material, width = 1.05, height = 1.55
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
// Texturas originales del directorio public, con fallback al material existente.
    const applyImage = (material: THREE.MeshBasicMaterial, url: string) => {
      new THREE.TextureLoader().load(url, (texture) => {
        if (abort.signal.aborted) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace;
        material.map = texture;
        material.needsUpdate = true;
        wakeRender.current?.();
    }, undefined, () => {});
    };
// ── Corredor ──
    const bronze = mat("#15bcef", 0.32, 0.68);
    const lacquer = mat("#00aebb", 0.27, 0.34);
    const wallPattern = canvas((ctx) => {
      ctx.fillStyle = "#0b1320"; ctx.fillRect(0, 0, 512, 512);
      for (let y = 15; y < 512; y += 76)
        for (let x = 16; x < 512; x += 76) {
          ctx.strokeStyle = "#e0e9e838"; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.ellipse(x, y + 20, 17, 26, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x, y - 10);
          ctx.bezierCurveTo(x - 25, y + 13, x - 24, y + 40, x, y + 55);
          ctx.bezierCurveTo(x + 24, y + 40, x + 25, y + 13, x, y - 10); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(x, y + 20, 5, 18, 0, 0, Math.PI * 2); ctx.stroke();
    }});
    wallPattern.wrapS = THREE.RepeatWrapping;
    wallPattern.wrapT = THREE.RepeatWrapping;
    wallPattern.repeat.set(10, 2.8);
    const wallpaper = new THREE.MeshStandardMaterial({ map: wallPattern, roughness: 0.88 });
    const marbleTexture = canvas((ctx) => {
      ctx.fillStyle = "#090e0d"; ctx.fillRect(0, 0, 512, 512);
      for (let k = 0; k < 90; k++) {
        const x = (k * 97) % 512, y = (k * 61) % 512;
        ctx.strokeStyle = k % 4 === 0 ? "#67e1c29c" : "#b8bebd33";
        ctx.lineWidth = k % 7 === 0 ? 1.6 : 0.6;
        ctx.beginPath(); ctx.moveTo(x - 75, y + 42);
        ctx.bezierCurveTo(x - 10, y - 25, x + 25, y + 40, x + 135, y - 32); ctx.stroke();
    }});
    marbleTexture.wrapS = THREE.RepeatWrapping;
    marbleTexture.wrapT = THREE.RepeatWrapping;
    marbleTexture.repeat.set(2, 7);
    const marble = new THREE.MeshStandardMaterial({ map: marbleTexture, roughness: 0.13, metalness: 0.14 });
    box(3.7, 0.14, 14.7, 0, -0.1, 8.4, marble);
    box(0.18, 3.8, 13.35, -1.91, 1.83, 8.75, wallpaper);
    box(0.18, 3.8, 13.35, 1.91, 1.83, 8.75, wallpaper);
    box(3.85, 0.16, 13.35, 0, 3.77, 8.75, mat("#112c28", 0.66));
    for (const side of [-1, 1]) {
      const x = side * 1.78;
      box(0.13, 0.72, 13.35, x, 0.36, 8.75, lacquer);
      box(0.14, 0.11, 13.35, x, 0.77, 8.75, bronze);
      box(0.15, 0.13, 13.35, x, 3.56, 8.75, lacquer);
      box(0.17, 0.06, 13.35, x, 3.4, 8.75, bronze);
      for (const z of [12.45, 9.55, 6.65]) {
        const portrait = print(z === 12.45 ? "FX" : "USER", "ROOM");
// Último cuadro izquierdo, junto a la entrada de MY ROOM:
// selfie original con filtro mate y oscuro aplicado al archivo.
        const isLastLeft = side === -1 && z === 6.65;
        const isSecondRight = side === 1 && z === 9.55;
        const portraitUrl = isSecondRight
          ? "/assets/my-room/fx-ia.png"
          : isLastLeft
            ? "/portrait-pasillo.jpg"
            : z === 12.45
              ? (side === -1 ? "/wallpaper2.png" : "/wallpaperGeneral.png")
              : "/wallpaperGeneral.png";
        applyImage(portrait, portraitUrl);
        pic(side * 1.81, 2.06, z, side === -1 ? Math.PI / 2 : -Math.PI / 2,
          portrait, 1.13, 1.65);
        if (z === 12.45 && side === 1) {
          const iconMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
          applyImage(iconMaterial, "/iconFX.png");
          const emblem = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.68), iconMaterial);
          emblem.rotation.y = -Math.PI / 2;
          emblem.position.set(1.73, 2.10, z);
          scene.add(emblem);
    }
        const sconce = new THREE.PointLight("#3c5757", 2.6, 3.7);
        sconce.position.set(side * 1.48, 2.97, z);
        scene.add(sconce);
        box(0.15, 0.065, 0.38, side * 1.66, 2.97, z, bronze);
    }}
    for (const z of [3.95, 7.55, 11.15, 14.65]) {
      for (const x of [-1.79, 1.79]) box(0.1, 3.54, 0.1, x, 1.8, z, lacquer);
      box(3.63, 0.12, 0.12, 0, 3.49, z, lacquer);
      box(3.63, 0.035, 0.12, 0, 3.36, z, bronze);
    }
    const door = new THREE.Group(); scene.add(door);
    door.position.set(1.8, 0, 14.6);
    box(0.08, 3.45, 1.65, 0, 1.7, 0, lacquer, door).rotation.y = Math.PI / 2;
    box(0.1, 0.13, 0.2, -0.12, 1.65, -0.7, bronze, door);
    for (const z of [12.7, 8.5, 4.7]) {
      const light = new THREE.PointLight("#2a7777", 7, 6);
      light.position.set(0, 3.32, z); scene.add(light);
      box(0.3, 0.05, 0.3, 0, 3.69, z,
        new THREE.MeshStandardMaterial({ color: "#517a7a", emissive: "#44afaf", emissiveIntensity: 1.4 }));
    }
// ── Dormitorio ──
    box(10, 0.13, 9.8, 0, -0.11, -2.1, carpet);
    box(0.2, 4.6, 9.8, -5, 2.25, -2.1, mat("#172947"));
    box(0.2, 4.6, 9.8, 5, 2.25, -2.1, mat("#172947"));
    box(10, 0.2, 9.8, 0, 4.6, -2.1, mat("#101b31"));
    box(10, 4.6, 0.15, 0, 2.2, -6.95, mat("#162742"));
    box(2.4, 0.1, 2.0, -2.9, 0.03, -2.7, carpet);
    // Espejo vertical grande en la esquina izquierda, sin reemplazar la geometría.
    const mirrorFrame = mat("#1c2a40", 0.3, 0.5);
    const mirrorSurface = new THREE.MeshPhysicalMaterial({
      color: "#7c98ba", metalness: 0.82, roughness: 0.12,
      transparent: true, opacity: 0.78, side: THREE.DoubleSide
    });
    box(0.12, 3.25, 1.62, -4.84, 1.7, -5.52, mirrorFrame);
    box(0.014, 3.04, 1.43, -4.765, 1.7, -5.52, mirrorSurface);
    const zebraCanvas = canvas((ctx) => {
      ctx.fillStyle = "#0e1011"; ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = "#3c5757"; ctx.beginPath(); ctx.ellipse(230, 270, 150, 195, -0.36, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#14171a";
      for (let i = 0; i < 12; i++) {
        ctx.save();
        ctx.translate(115 + i * 21, 110 + i * 20);
        ctx.rotate(-0.38 + i * 0.055);
        ctx.beginPath(); ctx.ellipse(0, 0, 12, 113, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
      ctx.fillStyle = "#171217"; ctx.beginPath(); ctx.arc(338, 208, 12, 0, Math.PI * 2); ctx.fill();
    });
// Atenuar el blanco de la cebra sin oscurecer el resto de la habitación.
    const zebraMaterial = new THREE.MeshBasicMaterial({
      map: zebraCanvas,
      color: "#a0a0a0",
      side: THREE.DoubleSide,
      toneMapped: false
    });
    pic(1.55, 2.62, -6.83, 0, zebraMaterial, 2.4, 2.5);
    const sunset = canvas((ctx) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, "#253f87");
      grad.addColorStop(0.44, "#0075fc");
      grad.addColorStop(0.74, "#3c5757");
      grad.addColorStop(1, "#1d4147");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 30; i++) {
        const x = i * 18, top = 330 - ((i * 47) % 103);
        ctx.fillStyle = "#223d39"; ctx.fillRect(x, top, 16, 512 - top);
        ctx.fillStyle = "#3c5757";
        for (let yy = top + 12; yy < 490; yy += 22) ctx.fillRect(x + 5, yy, 3, 4);
    }
    });
    const sunsetPane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.25),
      new THREE.MeshBasicMaterial({ map: sunset })
    );
    sunsetPane.position.set(-2.30, 2.68, -6.824); scene.add(sunsetPane);
    for (const x of [-3.55, -2.30, -1.05]) box(0.075, 2.45, 0.09, x, 2.68, -6.74, dark);
    for (const y of [1.48, 3.89]) box(2.57, 0.075, 0.09, -2.3, y, -6.74, dark);
    const windowGlow = new THREE.PointLight("#003db6", 3.8, 5.5);
    windowGlow.position.set(-2.35, 2.6, -5.9); scene.add(windowGlow);
    const abort = new AbortController();
    new THREE.TextureLoader().load(
      "/assets/my-room/zebra.png",
      (texture) => {
        if (abort.signal.aborted) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace;
        zebraMaterial.map = texture;
        zebraMaterial.needsUpdate = true;
        wakeRender.current?.();
    },
      undefined,
      () => {}
    );
    const pink = new THREE.PointLight("#003db6", 16, 9);
    pink.position.set(-3.1, 3.1, -3.1); scene.add(pink);
    const amber = new THREE.PointLight("#186370", 20, 11);
    amber.position.set(3.1, 2.6, -1); scene.add(amber);
    scene.add(new THREE.AmbientLight("#4c7279", 1.4));

    const fabricTexture = (base: string, accent: string, frequency = 140) => {
      const tex = canvas((ctx) => {
        ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < frequency * 20; i++) {
          const x = (i * 97.83) % 512, y = (i * 71.31) % 512;
          ctx.fillStyle = i % 3 === 0 ? accent : "#ffffff08";
          ctx.fillRect(x, y, 0.8 + (i % 3), 1 + (i % 4));
    }});
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      return new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
    };
    const textureLoader = new THREE.TextureLoader();
    const polyHavenNormal = (
      material: THREE.MeshStandardMaterial, asset: string,
      rx: number, ry: number, strength: number
    ) => {
      const file = `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${asset}/${asset}_nor_gl_1k.jpg`;
      textureLoader.load(file, (texture) => {
        if (abort.signal.aborted) { texture.dispose(); return; }
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(rx, ry);
        texture.colorSpace = THREE.NoColorSpace;
        material.normalMap = texture;
        material.normalScale.set(strength, strength);
        material.needsUpdate = true;
        wakeRender.current?.();
    }, undefined, () => {});
    };
    const upholstery = fabricTexture("#3c795fa1", "#198b6f40");
    const duvet = fabricTexture("#891427", "#ba24391a");
    const sofaFabric = fabricTexture("#262e30", "#708b9029");
    const rugFabric = fabricTexture("#111616", "#52605f1a", 260);
    polyHavenNormal(duvet, "velour_velvet", 3, 3, 0.17);
    polyHavenNormal(upholstery, "fabric_leather_01", 2, 2, 0.27);
    polyHavenNormal(rugFabric, "dirty_carpet", 7, 7, 0.25);

    const roundBox = (
      w: number, h: number, d: number, r: number,
      x: number, y: number, z: number, m: THREE.Material
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
        depth: d, bevelEnabled: true,
        bevelSize: Math.min(r * 0.3, 0.06),
        bevelThickness: 0.03, bevelSegments: 3, steps: 1, curveSegments: 5,
      });
      geom.translate(0, 0, -d / 2);
      const mesh = new THREE.Mesh(geom, m);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    };
    box(9.7, 0.022, 9.5, 0, 0.017, -2.08, rugFabric);
    box(3.75, 0.045, 2.55, -0.55, 0.045, -3.23, sofaFabric);
    const sofaObjectsStart = scene.children.length;
    box(4.06, 0.3, 1.25, -0.55, 0.36, -5.2, dark);
    roundBox(4.05, 1.02, 0.24, 0.2, -0.55, 0.92, -5.77, sofaFabric);
    for (const sx of [-2.5, 1.39]) roundBox(0.31, 0.88, 1.28, 0.14, sx, 0.72, -5.2, sofaFabric);
    for (const sx of [-1.84, -0.57, 0.7]) {
      roundBox(1.16, 0.19, 0.9, 0.09, sx, 0.65, -5.08, sofaFabric);
      roundBox(1.1, 0.76, 0.19, 0.13, sx, 1.09, -5.56, sofaFabric);
    }
    for (const sx of [-1.58, 0.85]) {
      const cushion = roundBox(0.62, 0.55, 0.16, 0.13, sx, 1, -5.42,
        fabricTexture("#0a4c4e", "#9abcbe1f"));
      cushion.rotation.z = sx < 0 ? -0.18 : 0.19;
    }
    const sofaGroup = new THREE.Group();
    sofaGroup.position.set(4.3, 0, -4.8);
    sofaGroup.rotation.y = -Math.PI / 2;
    scene.add(sofaGroup);
    const sofaItems = scene.children.slice(sofaObjectsStart).filter((item) => item !== sofaGroup);
    for (const item of sofaItems) {
      scene.remove(item);
      sofaGroup.add(item);
      item.position.x += 0.55;
      item.position.z += 5.2;
    }
    const marbleMap = canvas((ctx) => {
      ctx.fillStyle = "#111017"; ctx.fillRect(0, 0, 512, 512);
      for (let k = 0; k < 35; k++) {
        ctx.strokeStyle = k % 4 === 0 ? "rgba(224,226,240,.5)" : "rgba(168,167,188,.16)";
        ctx.lineWidth = k % 5 === 0 ? 1.7 : 0.65;
        ctx.beginPath();
        const x = (k * 119) % 512, y = (k * 61) % 512;
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + 32, y - 24, x + 80, y + 32, x + 135, y - 25);
        ctx.stroke();
    }
    });
    marbleMap.wrapS = THREE.RepeatWrapping;
    marbleMap.wrapT = THREE.RepeatWrapping;
    box(2.2, 0.095, 1.12, -0.4, 0.47, -3.55,
      new THREE.MeshStandardMaterial({ map: marbleMap, roughness: 0.19, metalness: 0.16 }));
    for (const x of [-1.33, 0.5])
      for (const z of [-3.97, -3.12])
        box(0.042, 0.4, 0.042, x, 0.23, z, mat("#111018", 0.3, 0.5));
// Laptop
    const laptopDark = mat("#0b1020", 0.33, 0.12);
    const laptopMetal = mat("#68718c", 0.38, 0.45);
    box(1.26, 0.045, 0.79, -0.40, 0.55, -3.44, laptopMetal);
    box(1.13, 0.011, 0.62, -0.40, 0.578, -3.43, laptopDark);
    box(1.28, 0.83, 0.055, -0.40, 1.01, -3.80, laptopDark);
// Video de la pantalla 3D
    const laptopVideo = document.createElement("video");
    laptopVideo.src = "/assets/introFX.mp4";
    laptopVideo.muted = true;
    laptopVideo.defaultMuted = true;
    laptopVideo.autoplay = true;
    laptopVideo.loop = true;
    laptopVideo.playsInline = true;
    laptopVideo.preload = "auto";
    const laptopVideoTexture = new THREE.VideoTexture(laptopVideo);
    laptopVideoTexture.colorSpace = THREE.SRGBColorSpace;
    laptopVideoTexture.minFilter = THREE.LinearFilter;
    laptopVideoTexture.magFilter = THREE.LinearFilter;
    laptopVideoTexture.generateMipmaps = false;
    const laptopDisplay = new THREE.Mesh(
      new THREE.PlaneGeometry(1.16, 0.73),
      new THREE.MeshBasicMaterial({
        map: laptopVideoTexture,
        toneMapped: false,
        side: THREE.DoubleSide,
    }));
    laptopDisplay.position.set(-0.40, 1.01, -3.768);
    laptopDisplay.userData.fxDestination = "#/private-room/gallery";
    interactiveTargets.push(laptopDisplay);
    scene.add(laptopDisplay);
// Actualizar Three.js cuando cambien los fotogramas
    laptopVideo.addEventListener(
      "loadeddata",
    () => wakeRender.current?.(),
    { signal: abort.signal }
    );

    if ("requestVideoFrameCallback" in laptopVideo) {
      const refreshFrame = () => {
        if (abort.signal.aborted) return;
        wakeRender.current?.();
        laptopVideo.requestVideoFrameCallback(refreshFrame);
    };
      laptopVideo.requestVideoFrameCallback(refreshFrame);
    }
// Reproducción automática
    void laptopVideo.play().catch(() => {});
// Limpieza al desmontar la escena
    abort.signal.addEventListener("abort", () => {
      laptopVideo.pause();
      laptopVideo.removeAttribute("src");
      laptopVideo.load();
      laptopVideoTexture.dispose();
    }, { once: true });

    const softSurface = (
      w: number, d: number, x: number, y: number, z: number,
      material: THREE.Material, amplitude: number
    ) => {
      const geometry = new THREE.PlaneGeometry(w, d, 42, 52);
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const px = positions.getX(i), pz = -positions.getY(i);
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
      width: number, height: number, depth: number,
      x: number, y: number, z: number, material: THREE.Material
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
      const x = tuftPositions.getX(i), y = tuftPositions.getY(i);
      let inset = 0;
      for (let row = 0; row < 4; row++) {
        const cy = -0.62 + row * 0.41;
        for (let column = 0; column < 7; column++) {
          const cx = -1.36 + column * 0.455 + (row % 2 ? 0.225 : 0);
          const dx = (x - cx) / 0.19, dy = (y - cy) / 0.19;
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
      const seam = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.012, 6, 48), mat("#142a36", 1));
      seam.scale.set(1.48, 0.55, 1);
      seam.position.set(px, 1.085, -2.18);
      seam.rotation.x = Math.PI / 2;
      scene.add(seam);
    }
    const bedGroup = new THREE.Group();
    bedGroup.position.set(2.55, 0, -1.0);
    bedGroup.rotation.y = -Math.PI / 2;
    scene.add(bedGroup);
    const bedItems = scene.children.slice(bedObjectsStart).filter((item) => item !== bedGroup);
    for (const item of bedItems) {
      scene.remove(item);
      bedGroup.add(item);
      item.position.x -= 2.85;
      item.position.z += 1.0;
    }

    const consoleWood = mat("#3c5757", 0.45, 0.08);
    box(0.68, 0.48, 3.1, -4.42, 0.3, -2.0, consoleWood);
    box(0.74, 0.055, 3.2, -4.42, 0.57, -2.0, mat("#25202b", 0.23, 0.12));
    for (const z of [-2.96, -2.03, -1.1]) {
      box(0.018, 0.32, 0.82, -4.072, 0.31, z, mat("#26212d", 0.55));
    }
    box(0.1, 1.76, 2.82, -4.66, 1.72, -2.0, black);

    // TV 16:9: video completo, sin recortes, con transici├│n de fundido.
    const tvCanvas = document.createElement("canvas");
    tvCanvas.width = 1280;
    tvCanvas.height = 720;
    const tvCtx = tvCanvas.getContext("2d");
    const tvTexture = new THREE.CanvasTexture(tvCanvas);
    tvTexture.colorSpace = THREE.SRGBColorSpace;
    const makeVideo = (src: string) => {
      const video = document.createElement("video");
      video.src = src;
      video.muted = true;
      video.defaultMuted = true;
      video.autoplay = false;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      // Preload the source shown on the TV; keep the two other 3D clips lazy.
      video.preload = src.includes("Fx-2026-08-ROOM.mp4") ? "auto" : "metadata";
      for (const event of ["loadeddata", "canplay", "playing", "timeupdate", "seeked", "waiting", "stalled", "suspend"]) {
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
      video.addEventListener("error", () => {
        const code = video.error?.code;
        if (process.env.NODE_ENV !== "production") {
          console.warn("[CinematicTour] Video could not be decoded or loaded:", src, code);
        }
        wakeRender.current?.();
      }, { signal: abort.signal });
      return video;
    };
    const tvVideos: Record<TvMode, HTMLVideoElement> = {
      videocall: makeVideo("/assets/my-room/Fx-2026-08-ROOM.mp4"),
      multimedia: makeVideo("/assets/my-room/multimedia.mp4"),
      stage: makeVideo("/assets/my-room/pasarella2.mp4"),
    };
    const tvMaterial = new THREE.MeshBasicMaterial({
      map: tvTexture, toneMapped: false, side: THREE.DoubleSide,
    });
    const tvFace = new THREE.Mesh(new THREE.PlaneGeometry(2.70, 1.51875), tvMaterial);
    const tvBezel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.82, 1.64),
      new THREE.MeshBasicMaterial({ color: "#05080d", toneMapped: false, side: THREE.DoubleSide })
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
      if (abort.signal.aborted || document.hidden || !video.paused || pendingTvPlayback.has(video)) return;
      if (blockedTvPlayback.has(video) && !userGesture) return;
      pendingTvPlayback.add(video);
      void video.play().then(() => {
        blockedTvPlayback.delete(video);
        wakeRender.current?.();
      }).catch((error: unknown) => {
        if ((error as Error)?.name !== "AbortError") {
          blockedTvPlayback.add(video);
          if (process.env.NODE_ENV !== "production") {
            console.warn("[CinematicTour] TV playback could not start:", error);
          }
        }
      }).finally(() => {
        pendingTvPlayback.delete(video);
        wakeRender.current?.();
      });
    };
    retryTvPlayback = () => {
      if (current.current < ENTER_AT[4] - 0.025) return;
      blockedTvPlayback.delete(tvVideos[screenMode]);
      playTv(tvVideos[screenMode], true);
    };
    const resumeTvOnGesture = () => {
      if (tvVideos[screenMode].paused) retryTvPlayback();
    };
    window.addEventListener("pointerdown", resumeTvOnGesture, { signal: abort.signal });
    window.addEventListener("keydown", resumeTvOnGesture, { signal: abort.signal });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        for (const video of Object.values(tvVideos)) video.pause();
      } else {
        retryTvPlayback();
      }
      wakeRender.current?.();
    }, { signal: abort.signal });
    let transitionStart = -1;
    const previousFrame = document.createElement("canvas");
    previousFrame.width = 1280;
    previousFrame.height = 720;
    const previousCtx = previousFrame.getContext("2d");
    const drawTv = (now: number) => {
      if (!tvCtx) return;
      tvCtx.fillStyle = "#05080d";
      tvCtx.fillRect(0, 0, 1280, 720);
      const video = tvVideos[screenMode];
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        const factor = Math.min(1280 / video.videoWidth, 720 / video.videoHeight);
        const w = video.videoWidth * factor;
        const h = video.videoHeight * factor;
        tvCtx.drawImage(video, (1280 - w) / 2, (720 - h) / 2, w, h);
      }
      if (transitionStart >= 0 && previousCtx) {
        const alpha = Math.max(0, 1 - (now - transitionStart) / 450);
        if (alpha > 0) {
          tvCtx.globalAlpha = alpha;
          tvCtx.drawImage(previousFrame, 0, 0);
          tvCtx.globalAlpha = 1;
        } else transitionStart = -1;
      }
      // Camera-style HUD drawn on top of the playing video (not a real recording).
      tvCtx.save();
      const pulse = 0.7 + 0.3 * Math.sin(now * 0.005);
      const elapsed = Number.isFinite(video.currentTime) ? Math.floor(video.currentTime) : 0;
      const padTime = (value: number) => String(value).padStart(2, "0");
      const timer = `${padTime(Math.floor(elapsed / 3600))}:${padTime(Math.floor(elapsed / 60) % 60)}:${padTime(elapsed % 60)}`;

      // Four white corner markers, matching the supplied camera reference.
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

      // Top-left blinking record marker and live video timecode.
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

      // Camera-control labels match the reference; they are decorative.
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

      // Center focus reticle.
      tvCtx.beginPath();
      tvCtx.moveTo(618, 333);
      tvCtx.lineTo(667, 333);
      tvCtx.moveTo(642, 307);
      tvCtx.lineTo(642, 369);
      tvCtx.strokeStyle = "rgba(255,255,255,0.95)";
      tvCtx.lineWidth = 3;
      tvCtx.stroke();

      // Bottom exposure labels and level markings.
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
      const mode: TvMode = p >= TV_STAGE_AT ? "stage"
        : p >= TV_MULTIMEDIA_AT ? "multimedia" : "videocall";
      if (screenMode !== mode) {
        if (previousCtx) previousCtx.drawImage(tvCanvas, 0, 0);
        transitionStart = now;
        tvVideos[screenMode].pause();
        screenMode = mode;
        onModeChangeRef.current?.(mode);
      }
      const tvVisible = p >= ENTER_AT[4] - 0.025;
      for (const [key, video] of Object.entries(tvVideos)) {
        if (key === screenMode && tvVisible) {
          if (video.paused) playTv(video);
        } else if (!video.paused) {
          video.pause();
        }
      }
      const activeVideo = tvVideos[screenMode];
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
        } else if (!activeVideo.paused && activeVideo.currentTime > 0 && now - lastAdvanceAt > 3500 && streamRetryCount < 2) {
          // Recover a stalled MP4 stream; never restart continuously.
          streamRetryCount += 1;
          lastAdvanceAt = now;
          activeVideo.pause();
          blockedTvPlayback.delete(activeVideo);
          playTv(activeVideo, true);
        }
      }
      drawTv(now);
    };
    abort.signal.addEventListener("abort", () => {
      for (const video of Object.values(tvVideos)) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
      tvTexture.dispose();
      }, { once: true });
// La TV reproduce contenido visual; los clics corresponden al panel derecho.
    const tvFill = new THREE.PointLight("#003db6", 2.8, 4);
    tvFill.position.set(-3.9, 1.9, -2); scene.add(tvFill);
    // Luz de relleno del lateral izquierdo, dirigida a la TV sin blanquear las paredes.
    const leftRoomFill = new THREE.PointLight("#75dfff", 4.3, 7.5);
    leftRoomFill.position.set(-3.3, 2.6, 0.25); scene.add(leftRoomFill);
    const leftRoomBounce = new THREE.PointLight("#246aca", 2.6, 6.0);
    leftRoomBounce.position.set(-3.7, 1.45, -3.5); scene.add(leftRoomBounce);
    const leftFill = new THREE.PointLight("#33d9ff", 5.5, 8);
    leftFill.position.set(-7.2, 2.15, -1.4);
    scene.add(leftFill);
    const leftRim = new THREE.SpotLight("#1dcfff", 2.2, 11, Math.PI / 5, 0.45, 1.15);
    leftRim.position.set(-8.1, 3.0, -0.5);  
    leftRim.target.position.set(-4.6, 1.7, -2.0);
    scene.add(leftRim);
    scene.add(leftRim.target);
// Cuadro detrás de la cama: corona completa, centrada y con margen negro.
// Composición vertical 2:3; no estirar ni recortar la imagen original.
    const crownTexture = canvas((ctx) => {
      ctx.fillStyle = "#02040a";
      ctx.fillRect(0, 0, 640, 960);
    }, 640, 960);
    const crownPoster = new THREE.MeshBasicMaterial({
      map: crownTexture, side: THREE.DoubleSide, toneMapped: false
    });
    const crownImage = new Image();
    crownImage.onload = () => {
      if (abort.signal.aborted || !crownImage.naturalWidth || !crownImage.naturalHeight) return;
      const board = crownTexture.image as HTMLCanvasElement;
      const ctx = board.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#02040a";
      ctx.fillRect(0, 0, board.width, board.height);
      const maxWidth = board.width * 0.78;
      const maxHeight = board.height * 0.70;
      const scale = Math.min(maxWidth / crownImage.naturalWidth, maxHeight / crownImage.naturalHeight);
      const w = crownImage.naturalWidth * scale;
      const h = crownImage.naturalHeight * scale;
      ctx.drawImage(crownImage, (board.width - w) / 2, (board.height - h) / 2, w, h);
      crownTexture.needsUpdate = true;
      wakeRender.current?.();
    };
    crownImage.src = "/assets/my-room/crownCyan.png";
    pic(4.87, 2.65, -3.22, -Math.PI / 2, crownPoster, 1.6, 2.4);
    const neonPink = new THREE.PointLight("#2b66a8", 7, 3.9);
    neonPink.position.set(4.14, 2.85, -3.2); scene.add(neonPink);
    const neonBlue = new THREE.PointLight("#003db6", 5, 3.9);
    neonBlue.position.set(4.23, 2.24, -3.4); scene.add(neonBlue);

    for (const [x, z] of [[1.12, -2.48], [4.51, -2.45]]) {
      box(0.48, 0.58, 0.54, x, 0.33, z, mat("#1f1921", 0.45));
      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 20, 14),
        new THREE.MeshStandardMaterial({ color: "#fff1da", emissive: "#aa0a0a", emissiveIntensity: 2.2 })
      );
      globe.position.set(x, 0.76, z); scene.add(globe);
      const light = new THREE.PointLight("#186370", 6, 3.5);
      light.position.copy(globe.position); scene.add(light);
    }
    const redAccent = new THREE.PointLight("#003db6", 7, 5);
    redAccent.position.set(3.85, 1.68, -2.6); scene.add(redAccent);
    const coolAccent = new THREE.PointLight("#356bdb", 5, 5);
    coolAccent.position.set(-2.9, 2.2, -4.15); scene.add(coolAccent);
    const sofaFill = new THREE.PointLight("#f3dae7", 12, 5.2);
    sofaFill.position.set(-1.0, 2.5, -4.65); scene.add(sofaFill);

    // Modelos GLB de alta calidad (opcionales): añade el nombre a enabledModelSlots para activarlos.
    const modelLoader = new GLTFLoader();
    const modelSlots = [
      { name: "bed", file: "/assets/my-room/bed.glb", pos: [2.85, 0, -1.05], size: [3.3, 2.55, 3.9] },
      { name: "sofa", file: "/assets/my-room/sofa.glb", pos: [-0.55, 0, -5.12], size: [4.15, 1.65, 1.65] },
      { name: "mirror", file: "/assets/my-room/mirror.glb", pos: [-4.53, 0, -3.35], size: [1.3, 3, 0.4] },
    ] as const;
    const loadHighDetailModel = (
      file: string, position: readonly number[], bounds: readonly number[]
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
                position[2] - center.z
              );
              scene.add(object);
              wakeRender.current?.();
            },
            undefined,
            () => {}
          );
        })
        .catch(() => {});
    };
    const enabledModelSlots: readonly string[] = [];
    for (const slot of modelSlots) {
      if (enabledModelSlots.includes(slot.name)) loadHighDetailModel(slot.file, slot.pos, slot.size);
    }

    // ── Estado de cámara ──
    const position = frames[0].p.clone();
    const look = frames[0].l.clone();
    const lookSmooth = frames[0].l.clone();
    const camFwd = new THREE.Vector3();
    const camRight = new THREE.Vector3();
    const camUp = new THREE.Vector3();
    const worldUp = new THREE.Vector3(0, 1, 0);

    // Override por ángulo (selector de ángulo de RoomIntro)
    const angP = angleCfg.laptop.p.clone();
    const angL = angleCfg.laptop.l.clone();
    let angFov: number = angleCfg.laptop.fov;
    let angMix = 0;

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

    // Arranque coherente: si el componente monta con progreso ≠ 0 (deep-link,
    // restauración de scroll), la cámara nace YA en su pose en lugar de viajar
    // desde el pasillo hasta la habitación.
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

    // ── Loop de render bajo demanda ──
    // El loop queda vivo mientras: hay scroll en curso, la mirada aún se
    // está asentando, hay vídeo en pantalla O la respiración del stop es
    // visible (life > 0). Fuera de eso, se apaga como antes.
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = 0;
      const dt = THREE.MathUtils.clamp((now - last) / 1000, 1e-4, 0.05);
      last = now;
      clock.current += dt;

      // 1) PROGRESO — muelle con memoria de velocidad + aceleración adaptativa.
      //    Salto pequeño → llegada elegante; salto grande → alcanza antes
      //    sin perder el ease-out de llegada.
      const gap = target.current - current.current;
      const dist = Math.abs(gap);
      const smoothTime = reducedMotion ? TUNING.smoothTimeReduced : TUNING.smoothTime;
      const maxSpeed = reducedMotion ? 5 : Math.min(2.6, TUNING.baseSpeed + dist * TUNING.catchUp);
      let next = smoothDamp(current.current, target.current, progressVel.current, smoothTime, maxSpeed, dt);
      const capStep = TUNING.speedCap * dt; // red de seguridad
      next = current.current + THREE.MathUtils.clamp(next - current.current, -capStep, capStep);
      current.current = next;
      const scrollSettled = dist < 0.0004 && Math.abs(progressVel.current.v) < 0.003;
      if (scrollSettled) {
        current.current = target.current;
        progressVel.current.v = 0;
      }
// 2) RUTA — anticipación de la mirada proporcional a la velocidad.
      const u = timeToU(current.current);
      const rawUSpeed = (u - uPrev.current) / dt;
      uPrev.current = u;
      uSpeed.current = damp(uSpeed.current, scrollSettled ? 0 : rawUSpeed, 7, dt);
      const lead = THREE.MathUtils.clamp(
        uSpeed.current * TUNING.lookAhead,
        -TUNING.lookAheadMax,
        TUNING.lookAheadMax
      );
      let fov = fovAt(u) + Math.min(TUNING.fovKickMax, Math.abs(uSpeed.current) * TUNING.fovKick);
      samplePath(u, lead, position, look);
// 3) Ángulo alternativo (laptop / tv) solo dentro de la habitación
      const cfg = angleRef.current === "bed" ? null : angleCfg[angleRef.current];
      const mixTarget = cfg ? 1 : 0;
      if (cfg) {
        const k = 1 - Math.exp(-6 * dt);
        angP.lerp(cfg.p, k);
        angL.lerp(cfg.l, k);
        angFov = THREE.MathUtils.lerp(angFov, cfg.fov, k);
      }
      angMix = damp(angMix, mixTarget, 5, dt);
      const w = angMix * angleWindow(current.current);
      if (w > 0.0005) {
        position.lerp(angP, w);
        look.lerp(angL, w);
        fov = THREE.MathUtils.lerp(fov, angFov, w);
      }
      const angleSettled =
        Math.abs(angMix - mixTarget) < 0.002 &&
        (!cfg || (angP.distanceToSquared(cfg.p) < 1e-5 && Math.abs(angFov - cfg.fov) < 0.01));
// 4) VIDA EN LOS STOPS — respiración + parallax del puntero.
//    Solo cuando el scroll está parado sobre un stop (stopEnvelope ≈ 1)
//    y se desvanece a cero en cuanto se vuelve a mover.
      const settled = scrollSettled && angleSettled;
      const lifeTarget = reducedMotion ? 0 : settled ? stopEnvelope(current.current) : 0;
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
          .addScaledVector(camRight, (Math.sin(T * 0.63 + 0.6) * TUNING.lookSway + pointer.current.x * TUNING.parallax) * b)
          .addScaledVector(camUp, (Math.sin(T * 0.81) * TUNING.lookSway * 0.6 - pointer.current.y * TUNING.parallax * 0.6) * b);
      }
      lookSmooth.lerp(look, 1 - Math.exp(-12 * dt));
      camera.position.copy(position);
      camera.lookAt(lookSmooth);
      if (alive) {
// Micro-roll sincronizado con la respiración (~0.15°): da vida sin marear.
        camera.rotateZ((Math.sin(clock.current * 0.47) * TUNING.roll + pointer.current.x * 0.004) * life.current);
      }
// 5) FOV — suavizado (sin saltos al mezclar ángulos ni al frenar).
      fovSmooth.current = damp(fovSmooth.current, fov, 9, dt);
      if (Math.abs(camera.fov - fovSmooth.current) > 0.004) {
        camera.fov = fovSmooth.current;
        camera.updateProjectionMatrix();
      }
      updateTv(current.current, now);
      renderer.render(scene, camera);
      const lookSettled = lookSmooth.distanceToSquared(look) < 1e-6;
      const videoPlaying = !tvVideos[screenMode].paused || transitionStart >= 0;
      if (!scrollSettled || !lookSettled || !angleSettled || videoPlaying || life.current > 0.002) {
        raf = requestAnimationFrame(tick);
      }};
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
      const textureKeys = ["map", "normalMap", "emissiveMap", "roughnessMap", "metalnessMap"] as const;
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
  return <div ref={host} className="cinematic-tour" />;
      }
```

## `components/FX/Sections.tsx`

```tsx
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
  TRAINERS,
} from "@/lib/content";
import { EASE, maskWord, stagger, wipe } from "@/lib/motion";
import { useAdminMode } from "@/components/PrivateRoom/PR-AdminMode";
import { Brand } from "./Chrome";
import VisitorCounter from "@/components/VisitorCounter";
import { Glyph } from "./Glyph";
import { RollLabel } from "./Hero";
import { Drift, Magnetic, Reveal, RevealGroup, SplitText, Spotlight } from "./Motion";
import ProtocolVault, { type VaultStep } from "./ProtocolVault";

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
      <motion.span className="h-px w-10 origin-left bg-gold/50" variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.7, ease: EASE } }, }} />
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

export function SectionCourses() {
  const [selected, setSelected] = useState<string>(COURSES[0].id);
  const course = COURSES.find((c) => c.id === selected)!;
  const admin = useAdminMode();
  return (
    <Shell id="spaces">
      <Drift className="right-[8%] top-[18%] h-[26rem] w-[26rem]" />
      <RevealGroup className="mb-14 space-y-7">
        <SectionIndex index="01" label="What's inside" />
        <Title>
Four spaces. One identity.
</Title>
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
                <button type="button" aria-pressed={selected === c.id} onClick={() => setSelected(c.id)} className="group flex w-full items-center justify-between gap-6 border-b border-ink/10 py-6 text-left" >
                  <span className="text-xs tabular-nums text-gold/60">
0{i + 1}
</span>
                  <span className="flex flex-1 items-center gap-5 transition-transform duration-500 ease-out group-hover:translate-x-2">
                    <span className={`font-display text-2xl font-semibold uppercase leading-none tracking-[-.03em] transition-opacity sm:text-3xl ${selected === c.id ? "opacity-100" : "opacity-40 group-hover:opacity-75"}`}>
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

/* ---------------------------------------------------------------------------
   PROTOCOL (una sola secuencia por scroll):
   1) texto fijo a la izquierda + tambor de caja fuerte a la derecha
   2) corona de partículas (public/corona/corona.bin) que gira con el scroll
   3) en el último paso la corona se deshace
   4) se abren 4 cuadrantes de 1/4 de pantalla: ↖ ↗ ↙ ↘
--------------------------------------------------------------------------- */
export function SectionMethod() {
  const steps: VaultStep[] = METHOD.map((step) => ({
    title: step.title,
    text:
      step.step === "01" ? (
        <>
          {step.body.split("@User18Fx_bot")[0]}
          <a href={BOT_URL} target="_blank" rel="noreferrer" className="text-gold underline decoration-gold/50 underline-offset-4 hover:decoration-gold" >
            @User18Fx_bot
          </a>
          {step.body.split("@User18Fx_bot")[1]}
        </>
      ) : (
        step.body
      ),
    cta: step.cta,
    href: step.step === "01" ? BOT_URL : step.link,
    external: step.step === "01" || step.link.startsWith("https:"),
  }));

  return (
    <ProtocolVault id="protocol" eyebrowIndex="02" eyebrow="ACCESS PROTOCOL" title="How to unlock the Vault." intro="Start in Telegram. Choose your code. Enter your own world." steps={steps} quads={[]} crownSrc="/corona/corona.bin" />
  );
}

const ROOM_PREVIEWS = [
  { src: "/assets/my-room/room1.mp4", poster: "/room1.png" },
  { src: "/assets/my-room/room2.mp4", poster: "/room2.png" },
  { src: "/assets/my-room/room3D.mp4", poster: "/assets/album/PRVW/PRVW-03.jpg" },
  { src: "/assets/my-room/room4.mp4", poster: "/assets/album/PRVW/PRVW-04.jpg" },
] as const;

export function SectionTrainers() {
  return (
    <Shell id="identity">
      <h2 className="sr-only">
        Your prefix
      </h2>
      <RevealGroup>
        <ul className="fx-room-video-grid">
          {TRAINERS.map((t, index) => (
            <motion.li key={t.name} variants={wipe(24)} className="fx-room-video-item">
              <figure className="fx-room-video-figure">
                <video src={ROOM_PREVIEWS[index].src} poster={ROOM_PREVIEWS[index].poster} controls playsInline preload="metadata" aria-label={`Room ${index + 1} preview`} className="fx-room-video-player" />
                <figcaption className={`fx-room-code-card fx-room-code-card--${t.name.toLowerCase()}`}>
                  <img src={t.name === "SPCL" ? FX.special : t.name === "BSIC" ? FX.basic : t.name === "PRX0" ? FX.pro : FX.vip} alt="" loading="lazy" className="fx-room-code-icon" />
                  <span className="fx-room-code-text">
                    <strong className="fx-room-code-prefix">
                      {t.name}
                    </strong>
                    <small className="fx-room-code-level">
                      {t.role}
                    </small>
                  </span>
                </figcaption>
              </figure>
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
        <Title>
Your access. Your level.
</Title>
        <Reveal>
          <div role="radiogroup" aria-label="Compare access by" className="glass relative inline-flex rounded-full p-1" >
            {(["stars", "window"] as const).map((value, i) => (
              <button key={value} ref={(el) => { radios.current[i] = el; }} type="button" role="radio" aria-checked={view === value} tabIndex={view === value ? 0 : -1} onClick={() => setView(value)} onKeyDown={(e) => { if ( !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key) ) return; e.preventDefault(); const next = e.key === "Home" ? 0 : e.key === "End" ? 1 : 1 - i; setView(next === 0 ? "stars" : "window"); radios.current[next]?.focus(); }} className="relative rounded-full px-6 py-2.5 text-sm font-semibold" >
                {view === value && (
                  <motion.span layoutId="cycle-pill" className="absolute inset-0 rounded-full bg-gold text-sky" transition={{ duration: 0.4, ease: EASE }} />
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
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {PLANS.map((plan) => {
            const price = view === "stars" ? `✪ ${plan.stars}` : plan.window;
            return (
              <motion.li key={plan.id} variants={wipe(40)} whileHover={{ y: -10 }} transition={{ duration: 0.5, ease: EASE }} className={`fx-plan relative flex min-w-0 flex-col gap-3 rounded-[22px] p-[18px] ${plan.featured ? "fx-plan-featured text-sky" : "glass"}`}>
                {plan.featured && (
                  <span className="absolute right-8 top-8 rounded-full bg-sky/10 px-3 py-1 text-[.65rem] uppercase tracking-[.16em]">
                    PRO ACCESS
                  </span>
                )}
                <div className="space-y-3">
                  <img src={plan.id === "basic" ? FX.basic : plan.id === "pro" ? FX.pro : FX.vip} alt="" loading="lazy" className="fx-prefix-illustration h-[34px] w-[34px] object-contain" />
                  <h3 className="font-display text-base font-semibold uppercase tracking-[-.03em]">
                    {plan.name} <span className="text-[11px] opacity-50">
{plan.prefix}
</span>
                  </h3>
                  <p className="text-sm opacity-65">
{plan.tagline}
</p>
                </div>
                <div>
                  <motion.span key={`${plan.id}-${price}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="inline-block font-display text-4xl font-semibold leading-none tracking-[-.03em] tabular-nums sm:text-5xl">
                    {price}
                  </motion.span>
                  <p className="mt-3 text-sm opacity-55">
                    {view === "stars"
                      ? `${plan.window} active access`
                      : `✪ ${plan.stars} Telegram Stars`}
                  </p>
                </div>
                <ul className="flex flex-1 flex-col gap-[7px]">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-[11px] leading-relaxed">
                      <span aria-hidden className={`mt-2 h-1 w-1 shrink-0 rounded-full ${plan.featured ? "bg-sky/50" : "bg-gold/60"}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Magnetic strength={0.22}>
                  <a href={`https://t.me/User18Fx_bot?start=${plan.id}`} target="_blank" rel="noreferrer" className={`group flex items-center justify-between gap-4 rounded-full px-[14px] py-[10px] text-xs font-semibold transition-opacity hover:opacity-85 ${plan.featured ? "bg-sky text-gold" : "bg-gold text-sky"}`}>
                    <RollLabel>
{plan.cta}
</RollLabel>
                    <Glyph name="caret" className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
                  </a>
                </Magnetic>
              </motion.li>
            );
          })}
        </ul>
        <Reveal className="mt-7 flex flex-wrap items-center justify-between gap-4 text-sm text-ink/55">
          <span>
Need identity access? Start with SPCL.
</span>
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
          <Title>
Good questions. Clear answers.
</Title>
        </div>
        <Reveal>
          <ul className="fx-faq relative">
            {FAQS.map((item, i) => (
              <li key={item.q} className="group border-b border-ink/12 first:border-t">
                <button id={`faq-trigger-${i}`} type="button" aria-expanded={expanded === i} aria-controls={`faq-panel-${i}`} className="flex w-full items-start justify-between gap-8 py-6 text-left" onClick={() => setExpanded((current) => (current === i ? null : i))}>
                  <span className="mt-1.5 text-xs tabular-nums text-gold/50">
0{i + 1}
</span>
                  <span className="flex-1 font-display text-lg font-semibold uppercase leading-tight tracking-[-.02em] transition-transform duration-500 group-hover:translate-x-2 sm:text-xl">
                    {item.q}
                  </span>
                  <span aria-hidden className="relative mt-2 block h-3 w-3 shrink-0">
                    <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gold" />
                    <motion.span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gold" animate={{ scaleY: expanded === i ? 0 : 1 }} transition={{ duration: 0.35, ease: EASE }} />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {expanded === i && (
                    <motion.div id={`faq-panel-${i}`} role="region" aria-labelledby={`faq-trigger-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden">
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
          <motion.p variants={stagger(0.1, 0)} className="font-display text-[13vw] font-semibold uppercase leading-[.88] tracking-[-.03em] sm:text-[8vw] lg:text-[5.4vw]" >
            {HERO.headline.map((line) => (
              <span key={line} className="block overflow-hidden">
                <motion.span variants={maskWord} className="block whitespace-nowrap will-change-transform">
                  {line}
                </motion.span>
              </span>
            ))}
          </motion.p>
          <Reveal className="flex flex-col items-start gap-6 lg:items-end">
            <motion.img src={FX.emblem} alt="" className="h-28 w-28 object-contain" animate={{ y: reduced ? 0 : [0, -10, 0] }} transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }} />
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
              <div className={`flex items-center gap-3 rounded-full border bg-white/[0.035] py-1.5 pl-5 pr-1.5 transition-colors focus-within:border-gold/60 ${state === "invalid" ? "border-rose" : "border-gold/20"}`}>
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
                    <a className="group inline-flex items-center border-b border-transparent py-1 text-sm text-ink/65 transition-colors hover:border-gold/40 hover:text-gold focus-visible:text-gold" href={link.href} target={link.href.startsWith("https:") ? "_blank" : undefined} rel={link.href.startsWith("https:") ? "noreferrer" : undefined} >
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
```

## `components/FX/Landing.tsx`

```tsx
"use client";
import { MenuOverlay, MenuProvider, StickyHeader, useActiveSection } from "./Chrome";
import { ScrollProgress, SmoothScroll } from "./Motion";
import ScrollStory from "./ScrollStory";
import { SectionFaq, SectionMethod, SectionPricing, SectionTrainers } from "./Sections";
import SiteFooter from "./FooterRedesign";
import RoomIntro from "./RoomIntro";
import "./LandingWidthFix.css";
const SECTION_IDS=["home","spaces","protocol","access"] as const;
export default function Landing(){
 const active=useActiveSection(SECTION_IDS);
 return (
 <MenuProvider>
 <SmoothScroll />
 <ScrollProgress />
 <StickyHeader active={active} />
 <MenuOverlay>
<SiteFooter />
</MenuOverlay>
 <div className="fx-landing">
 <main>
 <RoomIntro />
 <ScrollStory />
 <SectionMethod />
 <SectionTrainers />
 <SectionPricing />

 <SectionFaq />
 <form className="fx-telegram-entry" action="https://t.me/User18Fx_bot">
   <input type="hidden" name="startapp" value="vault" />
   <input type="submit" value="Enter with Telegram" />
 </form>
 </main>
 </div>
 </MenuProvider>
 );
}
```

## `components/FX/LandingWidthFix.css`

```css
/* Only the landing preview: prevent transforms / 3D canvases from growing document width. */
.fx-landing{width:100%;max-width:100%;min-width:0;overflow-x:clip}
.fx-landing>main{width:100%;max-width:100%;min-width:0}
.fx-landing .ufx-footer,.fx-landing .ufx-footer-frame,.fx-landing .ufx-footer-hero{max-width:100%;min-width:0}
.fx-landing .ufx-footer-hero{grid-template-columns:minmax(0,1fr) minmax(0,.8fr)}
.fx-landing .ufx-footer-hero-copy,.fx-landing .ufx-footer-visual{min-width:0;max-width:100%}
.fx-landing .ufx-footer-title{max-width:100%;font-size:clamp(40px,5.7vw,94px);overflow-wrap:normal}
.fx-landing .ufx-footer-emblem-ring{max-width:min(100%,450px)}
@media(max-width:900px){.fx-landing .ufx-footer-hero{grid-template-columns:minmax(0,1fr)}.fx-landing .ufx-footer-title{font-size:clamp(38px,8vw,72px)}}

.fx-telegram-entry { padding: 3rem 1rem; text-align: center; }
.fx-telegram-entry input[type=submit] { cursor:pointer; border:0; border-radius:2rem; padding:.9rem 2rem; background:#3fd8d0; color:#08090d; font-weight:650; }
/* Four room videos, two per row. Prefix cards stay compact and separate. */
.fx-landing #identity {
  padding-block: clamp(28px, 6vh, 72px);
}
.fx-landing #identity .fx-room-video-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(14px, 2.2vw, 28px);
  width: min(100%, 1220px);
  margin: 0 auto;
  padding: 0;
  list-style: none;
}
.fx-landing #identity .fx-room-video-item,
.fx-landing #identity .fx-room-video-figure {
  min-width: 0;
  margin: 0;
}
.fx-landing #identity .fx-room-video-figure {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}
.fx-landing #identity .fx-room-video-player {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  height: auto;
  max-height: 370px;
  object-fit: contain;
  background: #05070b;
  border: 1px solid rgba(83, 189, 203, 0.28);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, .2);
}
.fx-landing #identity .fx-room-code-card {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 54px;
  width: min(100%, 216px);
  padding: 8px 12px;
  border: 1px solid rgba(231, 219, 203, .18);
  border-radius: 12px;
  background: rgba(15, 18, 25, .85);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .14);
}
.fx-landing #identity .fx-room-code-icon {
  display: block;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  object-fit: contain;
}
.fx-landing #identity .fx-room-code-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  line-height: 1.1;
}
.fx-landing #identity .fx-room-code-prefix {
  color: #f0eadf;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: .1em;
}
.fx-landing #identity .fx-room-code-level {
  color: rgba(236, 228, 216, .62);
  font-size: 10px;
  letter-spacing: .12em;
  text-transform: uppercase;
}
@media (max-width: 600px) {
  .fx-landing #identity .fx-room-video-grid {
    gap: 18px 10px;
  }
  .fx-landing #identity .fx-room-video-figure {
    gap: 8px;
  }
  .fx-landing #identity .fx-room-video-player {
    border-radius: 9px;
  }
  .fx-landing #identity .fx-room-code-card {
    width: min(100%, 155px);
    min-height: 42px;
    padding: 6px;
    gap: 6px;
    border-radius: 8px;
  }
  .fx-landing #identity .fx-room-code-icon {
    width: 26px;
    height: 26px;
    flex-basis: 26px;
  }
  .fx-landing #identity .fx-room-code-prefix {
    font-size: 12px;
  }
  .fx-landing #identity .fx-room-code-level {
    font-size: 9px;
  }
}
@media(min-width:768px) {
 .fx-landing #access { scroll-margin-top:5rem; padding-block:clamp(.8rem,2vh,2rem); }
 .fx-landing #access h2 { font-size:clamp(2rem,6vh,4rem); max-width:none; line-height:1; }
 .fx-landing #access .mb-14 { margin-bottom:1.3rem; }
 .fx-landing #access .space-y-7 > * + * { margin-block-start:.65rem; }
 .fx-landing #access .fx-plan { gap:clamp(.25rem,.8vh,.7rem); padding:clamp(.7rem,1.6vh,1.2rem); }
}
```

## `components/FX/MediaScrollPanel.tsx`

```tsx
"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useAdminMode } from "@/components/PrivateRoom/PR-AdminMode";
import { SCENES, type Scene } from "./fxScenes";
import "./MediaScrollPanel.css";

const CrownRose = dynamic(() => import("./ProtocolCrown3D"), { ssr: false });
const PHOTO_COUNT = 4;
const PHOTO_FADE = 0.06;
type Mode = "photos" | "videos";

function MediaTile({ scene, index, mode, progress }: {
  scene: Scene;
  index: number;
  mode: Mode;
  progress: MotionValue<number>;
}) {
  const reduced = useReducedMotion();
  const admin = useAdminMode();
  const link = useRef<HTMLAnchorElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const visible = useRef(false);
  const videoStart = 0.04 + index * 0.22;
  const videoEnd = videoStart + 0.15;
  const videoOpacity = useTransform(progress, [videoStart, videoEnd], [0, 1]);
  const videoY = useTransform(progress, [videoStart, videoEnd], [36, 0]);
  const videoClip = useTransform(progress, [videoStart, videoEnd], [
    "inset(0% 0% 100% 0% round 16px)",
    "inset(0% 0% 0% 0% round 16px)",
  ]);
  const photoOpacity = useTransform(progress, (position) => {
    const from = index / PHOTO_COUNT;
    const to = (index + 1) / PHOTO_COUNT;
    const entering = index === 0 ? 1 : Math.min(1, Math.max(0, (position - from + PHOTO_FADE) / PHOTO_FADE));
    const leaving = index === PHOTO_COUNT - 1 ? 1 : Math.min(1, Math.max(0, (to - position) / PHOTO_FADE));
    return Math.min(entering, leaving);
  });
  const feature = (scene.id === "videocall" ? "myroom" : scene.id) as Parameters<typeof admin.requestFeature>[0];

  const sync = useCallback((position: number) => {
    const shown = Boolean(reduced) || (mode === "photos"
      ? position >= index / PHOTO_COUNT - PHOTO_FADE && (index === PHOTO_COUNT - 1 || position < (index + 1) / PHOTO_COUNT)
      : position > videoStart);
    link.current?.toggleAttribute("inert", !shown);
    const element = video.current;
    if (!element) return;
    if (shown && visible.current && !document.hidden) void element.play().catch(() => {});
    else element.pause();
  }, [index, mode, reduced, videoStart]);

  useMotionValueEvent(progress, "change", sync);

  useEffect(() => {
    const element = link.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      sync(progress.get());
    });
    observer.observe(element);
    sync(progress.get());

    const handleVisibility = () => {
      if (document.hidden) video.current?.pause();
      else sync(progress.get());
    };
    document.addEventListener("visibilitychange", handleVisibility);
    const currentVideo = video.current;
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      currentVideo?.pause();
    };
  }, [progress, sync]);

  return (
    <motion.a ref={link} className="fx-media-tile" href={scene.href} aria-label={`${scene.title} · ${scene.subtitle}`} style={reduced ? undefined : mode === "photos" ? { opacity: photoOpacity } : { opacity: videoOpacity, y: videoY, clipPath: videoClip }} onClick={(event) => { if (admin.requestFeature(feature)) event.preventDefault(); }}>
      {mode === "videos" ? (
        <video ref={video} src={`/room${index + 1}.mp4`} poster={scene.image} muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1} />
      ) : (
        <img src={scene.image} alt={scene.imageAlt} loading={index === 0 ? "eager" : "lazy"} decoding="async" draggable={false} />
      )}
      {mode === "videos" ? (
        <>
          <span className="fx-media-shade" aria-hidden="true" />
          <span className="fx-media-top" aria-hidden="true">
            <span>
              {String(index + 1).padStart(2, "0")}
            </span>
            <i />
            <span className="fx-media-symbol">
              ▷
            </span>
          </span>
          <span className="fx-media-label">
            <strong>
              {scene.title}
            </strong>
            <small>
              {scene.subtitle}
            </small>
          </span>
        </>
      ) : null}
    </motion.a>
  );
}

export default function MediaScrollPanel({ mode, id }: { mode: Mode; id: string }) {
  const section = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });

  return (
    <section id={id} ref={section} className={`fx-media-sequence fx-media-sequence--${mode}${reduced ? " is-reduced" : ""}`} aria-label={mode === "photos" ? "Explore UserFX spaces" : "Four UserFX room videos"}>
      <div className="fx-media-stage">
        <div className="fx-media-backdrop" aria-hidden="true">
          <CrownRose progress={scrollYProgress} dissolveAt={2} />
        </div>
        <div className={`fx-media-grid fx-media-grid--${mode}`}>
          {SCENES.slice(0, PHOTO_COUNT).map((scene, index) => (
            <MediaTile key={scene.id} scene={scene} index={index} mode={mode} progress={scrollYProgress} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

## `components/FX/MediaScrollPanel.css`

```css
.fx-media-sequence {
  position: relative;
  height: 420svh;
  background: #06090f;
  isolation: isolate;
  scroll-margin-top: 64px;
}
.fx-media-stage {
  position: sticky;
  top: var(--fx-nav-h, 64px);
  height: calc(100svh - var(--fx-nav-h, 64px));
  overflow: hidden;
  isolation: isolate;
  background: radial-gradient(ellipse at 50% 55%, #0e2345 0%, #070b15 50%, #03060b 100%);
}
.fx-media-backdrop {
  position: absolute;
  z-index: 0;
  left: 50%;
  top: 50%;
  width: min(100vw, 100svh);
  height: min(100vw, 100svh);
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: fx-media-float 8s ease-in-out infinite;
}
.fx-media-backdrop > div {
  width: 100%;
  height: 100%;
}
.fx-media-backdrop canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
}
.fx-media-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  height: 100%;
  gap: 8px;
  padding: 8px;
}
.fx-media-tile {
  position: relative;
  display: block;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #f6ead01f;
  border-radius: 16px;
  background: transparent;
  color: #f6f1e8;
}
.fx-media-tile > img,
.fx-media-tile > video {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
.fx-media-tile[inert] {
  pointer-events: none;
}
.fx-media-tile:focus-visible {
  outline: 3px solid #34ccd1;
  outline-offset: -4px;
}

/* One original photo per scroll phase, with no labels or cropping. */
.fx-media-grid--photos {
  display: block;
  width: min(100%, 1240px);
  height: 100%;
  margin-inline: auto;
  padding: 0;
}
.fx-media-grid--photos .fx-media-tile {
  position: absolute;
  inset: clamp(16px, 4svh, 48px) clamp(12px, 4vw, 56px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(52, 204, 209, 0.32);
  border-radius: 18px;
  background: rgba(3, 9, 19, 0.20);
  box-shadow: 0 18px 65px rgba(0, 0, 0, 0.20);
}
.fx-media-grid--photos .fx-media-tile > img {
  position: relative;
  inset: auto;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}
.fx-media-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, #05070b9c 0%, transparent 58%);
  pointer-events: none;
}
.fx-media-top {
  position: absolute;
  top: 16px;
  left: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: #d9b97e;
  font: 500 11px/1 system-ui;
  letter-spacing: 0.16em;
}
.fx-media-top i {
  height: 1px;
  flex: 1;
  background: linear-gradient(90deg, #d9b97e88, transparent);
}
.fx-media-symbol {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid #d9b97e66;
  border-radius: 50%;
  font-size: 18px;
}
.fx-media-label {
  position: absolute;
  left: 20px;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: calc(100% - 40px);
  padding: 14px 18px;
  border: 1px solid #f6ead02a;
  border-radius: 16px;
  background: #090b127a;
  backdrop-filter: blur(10px);
}
.fx-media-label strong {
  font: 400 clamp(24px, 3.2vw, 56px)/1 Georgia, "Times New Roman", serif;
  letter-spacing: -0.045em;
  text-transform: uppercase;
}
.fx-media-label small {
  font: 500 clamp(10px, 1vw, 15px)/1.4 system-ui, sans-serif;
  letter-spacing: 0.1em;
  color: #f6f1e8cc;
}
.fx-media-sequence.is-reduced {
  height: auto;
}
.fx-media-sequence.is-reduced .fx-media-stage {
  position: relative;
  top: auto;
}
.fx-media-sequence--photos.is-reduced .fx-media-stage {
  height: auto;
}
.fx-media-sequence--photos.is-reduced .fx-media-grid {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 24px 12px;
}
.fx-media-sequence--photos.is-reduced .fx-media-tile {
  position: relative;
  inset: auto;
  width: 100%;
  height: min(78svh, 780px);
}
@keyframes fx-media-float {
  0%, 100% { transform: translate(-50%, -50%) rotate(-3deg); }
  50% { transform: translate(-50%, -53%) rotate(3deg); }
}
@media (max-width: 700px) {
  .fx-media-grid {
    gap: 5px;
    padding: 5px;
  }
  .fx-media-grid--photos {
    gap: 0;
    padding: 0;
  }
  .fx-media-grid--photos .fx-media-tile {
    inset: 16px 8px;
    border-radius: 12px;
  }
  .fx-media-label {
    left: 8px;
    bottom: 10px;
    max-width: calc(100% - 16px);
    padding: 8px;
    border-radius: 11px;
    gap: 5px;
  }
  .fx-media-label strong {
    font-size: clamp(17px, 4.8vw, 30px);
  }
  .fx-media-label small {
    font-size: 9px;
    letter-spacing: 0.03em;
  }
  .fx-media-top {
    top: 10px;
    left: 10px;
    right: 10px;
    gap: 8px;
    font-size: 9px;
  }
  .fx-media-symbol {
    width: 26px;
    height: 26px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .fx-media-backdrop {
    animation: none;
  }
}
```
