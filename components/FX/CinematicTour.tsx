"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ENTER_AT, STOP_HOLD, STOP_T } from "./tourTimeline";
import "./CinematicTour.css";

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
 *  4 gallery   · LAPTOP (pantalla "MY GALLERY", clicable)
 *  5 videocall · TV mostrando la videollamada, vista desde la CAMA
 *  6 multimedia· TV mostrando multimedia (acercándose)
 *  7 stage     · TV con la pasarela (push-in)
 * Los frames "via-*" no son stops: solo reparten velocidad.
 */
const S = (i: number) => ({ t: STOP_T[i], hold: STOP_HOLD[i] || undefined });
const frames: Frame[] = [
  { id: "welcome",   ...S(0),              fov: 58, p: P( 0.00, 1.62, 14.50), l: P( 0.00, 1.78,  6.00) },
  { id: "inside",    ...S(1), drift: 0.06, fov: 56, p: P(-0.14, 1.64, 12.60), l: P( 0.95, 1.96,  8.90) },
  { id: "corridor",  ...S(2), drift: 0.06, fov: 56, p: P( 0.14, 1.66,  9.10), l: P(-0.95, 1.96,  5.60) },
  { id: "via-exit",  t: 0.357,             fov: 58, p: P( 0.00, 1.74,  5.60), l: P( 0.00, 1.62, -0.80) },
  { id: "enter",     ...S(3), drift: 0.03, fov: 60, p: P( 0.30, 1.82,  2.10), l: P(-0.30, 1.48, -3.60) },
  // LAPTOP centrada en el encuadre (pantalla en -0.40, 1.01, -3.77)
  { id: "gallery",   ...S(4), drift: 0.03, fov: 46, p: P(-0.40, 1.52, -1.15), l: P(-0.40, 1.03, -3.77) },
  // Desde la cama (cabecera al este) mirando la TV en la pared oeste
  { id: "videocall", ...S(5), drift: 0.03, fov: 34, p: P( 3.35, 1.48, -1.00), l: P(-4.58, 1.72, -2.00) },
  { id: "tv",        ...S(6),              fov: 48, p: P(-1.15, 1.72, -1.60), l: P(-4.58, 1.72, -2.00) },
  { id: "stage",     ...S(7),              fov: 44, p: P(-1.80, 1.72, -1.82), l: P(-4.58, 1.72, -2.00) },
];

const TV_MULTIMEDIA_AT = ENTER_AT[6]; // la TV cambia exactamente cuando cambia el texto
const TV_STAGE_AT = ENTER_AT[7];

// Ángulos alternativos dentro de la habitación (selector "ÁNGULO")
const angleCfg = {
  laptop: { p: P(-0.40, 1.30, -2.30), l: P(-0.40, 1.02, -3.77), fov: 36 },
  tv:     { p: P(-1.60, 1.62, -2.00), l: P(-4.58, 1.72, -2.00), fov: 44 },
} as const;
const angleWindow = (p: number) => smooth(0.52, 0.57, p) * (1 - smooth(0.8, 0.85, p));

// ─── TIMELINE: scroll → u (índice de keyframe), monótona y C1 ──────────────
type Knot = { t: number; u: number; d: number | null };
const knots: Knot[] = [];
const LAST = frames.length - 1;
frames.forEach((f, i) => {
  const half = (f.hold ?? 0) / 2;
  if (half > 0) {
    const dr = i === 0 || i === LAST ? 0 : f.drift ?? 0;
    const slope = dr / half;
    knots.push({ t: Math.max(0, f.t - half), u: i - dr, d: slope });
    knots.push({ t: Math.min(1, f.t + half), u: i + dr, d: slope });
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
  return 0.5 * (
    2 * p1 + (-p0 + p2) * w +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * w * w +
    (-p0 + 3 * p1 - 3 * p2 + p3) * w * w * w
  );
};

const samplePath = (prog: number, position: THREE.Vector3, look: THREE.Vector3) => {
  const u = timeToU(clamp(prog));
  posCurve.getPoint(u / SEGMENTS, position);
  lookCurve.getPoint(u / SEGMENTS, look);
  return fovAt(u);
};

const damp = (cur: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.lerp(cur, target, 1 - Math.exp(-lambda * dt));

const MAX_SPEED = 0.6; // progreso/seg: un scroll brusco no produce latigazos

// ─── COMPONENTE ────────────────────────────────────────────────────────────
export default function CinematicTour({
  progress,
  roomAngle = "bed",
  onModeChange,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const target = useRef(0);
  const current = useRef(0);
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

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

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
    const onInteractiveClick = (event: MouseEvent) => {
      const destination = visitInteractive(event);
      if (!destination) return;
      event.preventDefault();
      event.stopPropagation();
      if (destination.startsWith("https://")) {
        window.open(destination, "_blank", "noopener,noreferrer");
      } else {
        window.location.hash = destination;
      }
    };
    const onInteractiveMove = (event: PointerEvent) => {
      renderer.domElement.style.cursor = visitInteractive(event) ? "pointer" : "";
    };
    renderer.domElement.addEventListener("click", onInteractiveClick);
    renderer.domElement.addEventListener("pointermove", onInteractiveMove);

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

    // ── Corredor ──
    const bronze = mat("#8b6038", 0.32, 0.68);
    const lacquer = mat("#0c120f", 0.27, 0.34);
    const wallPattern = canvas((ctx) => {
      ctx.fillStyle = "#153231"; ctx.fillRect(0, 0, 512, 512);
      for (let y = 15; y < 512; y += 76)
        for (let x = 16; x < 512; x += 76) {
          ctx.strokeStyle = "#5fd7cd38"; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.ellipse(x, y + 20, 17, 26, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x, y - 10);
          ctx.bezierCurveTo(x - 25, y + 13, x - 24, y + 40, x, y + 55);
          ctx.bezierCurveTo(x + 24, y + 40, x + 25, y + 13, x, y - 10); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(x, y + 20, 5, 18, 0, 0, Math.PI * 2); ctx.stroke();
        }
    });
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
      }
    });
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
        pic(side * 1.81, 2.06, z, side === -1 ? Math.PI / 2 : -Math.PI / 2,
          print(z === 12.45 ? "FX" : "USER", "ROOM"), 1.13, 1.65);
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
    const zebraMaterial = new THREE.MeshBasicMaterial({ map: zebraCanvas, side: THREE.DoubleSide });
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
      "/assets/my-room/zebra.jpg",
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
        }
      });
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
    const duvet = fabricTexture("#183a3a", "#2191911a");
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
    const laptopDisplay = new THREE.Mesh(
      new THREE.PlaneGeometry(1.16, 0.73),
      interfaceScreen("MY GALLERY", "PRIVATE COLLECTION", "OPEN GALLERY")
    );
    laptopDisplay.position.set(-0.40, 1.01, -3.768);
    laptopDisplay.userData.fxDestination = "#/private-room/gallery";
    interactiveTargets.push(laptopDisplay);
    scene.add(laptopDisplay);

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

    // TV + pantalla
    const tvCanvas = document.createElement("canvas");
    tvCanvas.width = 1280;
    tvCanvas.height = 720;
    const tvCtx = tvCanvas.getContext("2d");
    const videoCallTexture = new THREE.CanvasTexture(tvCanvas);
    videoCallTexture.colorSpace = THREE.SRGBColorSpace;
    const drawVideoCall = (picture?: HTMLImageElement) => {
      if (!tvCtx) return;
      tvCtx.fillStyle = "#07142b";
      tvCtx.fillRect(0, 0, 1280, 720);
      if (picture && picture.naturalWidth > 0) {
        const cropWidth = Math.floor(picture.naturalWidth * 0.62);
        tvCtx.drawImage(picture, 0, 0, cropWidth, picture.naturalHeight, 0, 0, 1280, 720);
      }
      videoCallTexture.needsUpdate = true;
    };
    drawVideoCall();
    const videoCallImg = new Image();
    videoCallImg.onload = () => {
      if (!abort.signal.aborted) { drawVideoCall(videoCallImg); wakeRender.current?.(); }
    };
    videoCallImg.src = "/assets/my-room/videocall.png";

    const makeVideo = (src: string) => {
      const video = document.createElement("video");
      video.src = src;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "metadata";
      const texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      return { video, texture };
    };
    const multi = makeVideo("/assets/my-room/multimedia.mp4");
    const stage = makeVideo("/assets/my-room/pasarella2.mp4");
    const tvMaterial = new THREE.MeshBasicMaterial({ map: videoCallTexture, toneMapped: false, side: THREE.DoubleSide });
    const tvFace = new THREE.Mesh(new THREE.PlaneGeometry(2.71, 1.64), tvMaterial);
    let screenMode: TvMode = "videocall";
    const updateTv = (p: number) => {
      const mode: TvMode =
        p >= TV_STAGE_AT ? "stage" :
        p >= TV_MULTIMEDIA_AT ? "multimedia" : "videocall";
      if (screenMode !== mode) {
        screenMode = mode;
        tvMaterial.map = mode === "stage" ? stage.texture : mode === "multimedia" ? multi.texture : videoCallTexture;
        tvMaterial.needsUpdate = true;
        tvFace.userData.fxDestination = mode === "stage" ? "#/private-room/stage" : undefined;
        onModeChangeRef.current?.(mode);
      }
      for (const item of [multi, stage]) {
        const active = (item === multi && mode === "multimedia") || (item === stage && mode === "stage");
        if (active && item.video.paused) void item.video.play().catch(() => {});
        else if (!active && !item.video.paused) item.video.pause();
      }
    };
    tvFace.userData.fxDestination = undefined;
    tvFace.position.set(-4.58, 1.72, -2.0);
    tvFace.rotation.y = Math.PI / 2;
    scene.add(tvFace);
    interactiveTargets.push(tvFace);

    const tvFill = new THREE.PointLight("#003db6", 2.8, 4);
    tvFill.position.set(-3.9, 1.9, -2); scene.add(tvFill);

    pic(4.87, 2.65, -3.22, -Math.PI / 2, print("FX", "ROOM", "#0075fc"), 1.6, 1.6);
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

    // ── Loop de render bajo demanda ──
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Damping suave (sin salto de lambda) + límite de velocidad.
      const dist = Math.abs(target.current - current.current);
      const lambda = reducedMotion ? 22 : THREE.MathUtils.lerp(14, 8, clamp(dist / 0.03));
      let next = damp(current.current, target.current, lambda, dt);
      const maxStep = MAX_SPEED * dt;
      next = current.current + THREE.MathUtils.clamp(next - current.current, -maxStep, maxStep);
      current.current = next;
      const scrollSettled = Math.abs(target.current - current.current) < 0.0002;
      if (scrollSettled) current.current = target.current;

      let fov = samplePath(current.current, position, look);

      // Ángulo alternativo (laptop / tv) solo dentro de la habitación
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

      lookSmooth.lerp(look, 1 - Math.exp(-11 * dt));
      camera.position.copy(position);
      camera.lookAt(lookSmooth);
      if (Math.abs(camera.fov - fov) > 0.005) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }

      updateTv(current.current);
      renderer.render(scene, camera);

      const lookSettled = lookSmooth.distanceToSquared(look) < 1e-6;
      const videoPlaying = screenMode !== "videocall";
      if (!scrollSettled || !lookSettled || !angleSettled || videoPlaying) raf = requestAnimationFrame(tick);
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
      window.removeEventListener("resize", resize);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("click", onInteractiveClick);
      renderer.domElement.removeEventListener("pointermove", onInteractiveMove);

      for (const item of [multi, stage]) {
        item.video.pause();
        item.video.removeAttribute("src");
        item.video.load();
        item.texture.dispose();
      }
      videoCallTexture.dispose();
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