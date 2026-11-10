"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MotionValue } from "framer-motion";

export type CrownTL = {
  descend: [number, number];
  rise: [number, number];
  breakStart: number;
  fade: [number, number];
};

type Props =
  | { progress: MotionValue<number>; tl: CrownTL; active: boolean; step?: never; className?: string }
  | { progress: number; step: number; className?: string; tl?: never; active?: never };

// Timeline de compatibilidad para ScrollStory; el timeline original de
// ProtocolVault sigue prevaleciendo cuando se pasa mediante `tl`.
const SCROLL_STORY_TL: CrownTL = {
  descend: [0, 0.25],
  rise: [0.25, 0.6],
  breakStart: 0.72,
  fade: [0.85, 1],
};

type Particle = {
  // posiciÃ³n base (coordenadas normalizadas al viewport)
  x: number;
  y: number;
  z: number;
  // posiciÃ³n "objetivo" durante la formaciÃ³n de la corona
  nx: number;
  ny: number;
  nz: number;
  // estado fÃ­sico
  size: number;
  alpha: number;
  vx: number;
  vy: number;
  px: number;
  py: number;
  driftX: number;
  driftY: number;
  dvx: number;
  dvy: number;
  threshold: number;
  scatterX: number;
  scatterY: number;
  bounce: number;
  floorDepth: number;
  detached: boolean;
};

const clamp = (v: number, min = 0, max = 1) =>
  v < min ? min : v > max ? max : v;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Progreso normalizado dentro de un rango [a, b] del timeline. */
const range = (v: number, [a, b]: [number, number]) =>
  clamp((v - a) / Math.max(1e-6, b - a));

export default function CrownParticles({ progress, tl, active, className }: Props) {
  const timeline = tl ?? SCROLL_STORY_TL;
  const isEnabled = active ?? true;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const activeRef = useRef(isEnabled);
  const particlesRef = useRef<Particle[]>([]);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const pointerRef = useRef({ x: 0.5, y: 0.5 });

  // Mantener `active` fuera del closure del loop
  useEffect(() => {
    activeRef.current = isEnabled;
  }, [isEnabled]);

  // InicializaciÃ³n de partÃ­culas (una vez)
  useEffect(() => {
    const N = 180;
    const particles: Particle[] = [];
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2;
      const r = 0.25 + Math.random() * 0.15;
      particles.push({
        x: 0.5 + Math.cos(angle) * r,
        y: 0.5 + Math.sin(angle) * r,
        z: Math.random(),
        nx: 0.5 + Math.cos(angle) * r,
        ny: 0.5 + Math.sin(angle) * r * 0.4,
        nz: Math.random(),
        size: 0.5 + Math.random() * 1.5,
        alpha: 1,
        vx: 0,
        vy: 0,
        px: 0,
        py: 0,
        driftX: (Math.random() - 0.5) * 0.2,
        driftY: (Math.random() - 0.5) * 0.2,
        dvx: 0,
        dvy: 0,
        threshold: Math.random(),
        scatterX: (Math.random() - 0.5) * 2,
        scatterY: (Math.random() - 0.5) * 2,
        bounce: 0.6 + Math.random() * 0.4,
        floorDepth: Math.random(),
        detached: false,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // --- Resize con DPR y ResizeObserver ---
    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? window.innerWidth;
      const h = parent?.clientHeight ?? window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h, dpr };
    };

    resize();

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(resize)
        : null;
    ro?.observe(canvas.parentElement ?? canvas);
    window.addEventListener("resize", resize);

    // --- Pointer ---
    const onPointerMove = (e: PointerEvent) => {
      const { w, h } = sizeRef.current;
      pointerRef.current.x = e.clientX / Math.max(1, w);
      pointerRef.current.y = e.clientY / Math.max(1, h);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    let lastProgress = -1;
    let paused = false;
    const onVisibility = () => {
      paused = document.hidden;
      if (!paused) rafRef.current = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVisibility);

    // --- Loop ---
    const frame = () => {
      rafRef.current = requestAnimationFrame(frame);
      if (paused) return;

      const { w, h } = sizeRef.current;
      if (w === 0 || h === 0) return;

      const p = typeof progress === "number" ? progress : progress.get();
      // Evitar redibujar si nada cambia (ahorra baterÃ­a)
      const stationary =
        Math.abs(p - lastProgress) < 1e-5 &&
        !activeRef.current &&
        particlesRef.current.every(
          (pt) => Math.abs(pt.vx) < 0.001 && Math.abs(pt.vy) < 0.001
        );
      if (stationary) return;
      lastProgress = p;

      // --- Fases del timeline ---
      const tDescend = range(p, timeline.descend);
      const tRise = range(p, timeline.rise);
      const tBreak = clamp((p - timeline.breakStart) / Math.max(1e-6, 1 - timeline.breakStart));
      const tFade = range(p, timeline.fade);

      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
      const easeInOut = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      ctx.clearRect(0, 0, w, h);

      const ptr = pointerRef.current;
      const isActive = activeRef.current;

      for (const pt of particlesRef.current) {
        // --- FÃ­sica / animaciÃ³n ---
        if (isActive && tBreak < 1) {
          // RepulsiÃ³n del puntero
          const dx = pt.x - ptr.x;
          const dy = pt.y - ptr.y;
          const dist2 = dx * dx + dy * dy;
          const force = 0.0008 / (dist2 + 0.001);
          pt.dvx += dx * force;
          pt.dvy += dy * force;
        }

        // Scatter al romper
        if (tBreak > 0.05 && !pt.detached) {
          if (Math.random() < 0.02 * tBreak || pt.threshold < tBreak) {
            pt.detached = true;
            pt.vx += pt.scatterX * (0.4 + Math.random() * 0.8);
            pt.vy += pt.scatterY * (0.4 + Math.random() * 0.8);
          }
        }

        // CaÃ­da por gravedad
        if (pt.detached) {
          pt.vy += 0.0006 * pt.bounce;
        }

        // Drift suave
        pt.dvx += (Math.sin(pt.driftX * 10 + p * 6) * 0.5 - pt.dvx) * 0.02;
        pt.dvy += (Math.cos(pt.driftY * 10 + p * 6) * 0.5 - pt.dvy) * 0.02;

        pt.vx = (pt.vx + pt.dvx) * 0.98;
        pt.vy = (pt.vy + pt.dvy) * 0.98;

        pt.px = pt.x;
        pt.py = pt.y;
        pt.x += pt.vx * 0.01;
        pt.y += pt.vy * 0.01;

        // Rebote en el suelo (con perspectiva segÃºn floorDepth)
        const floorY = 0.85 + pt.floorDepth * 0.1;
        if (pt.detached && pt.y > floorY) {
          pt.y = floorY;
          pt.vy *= -0.4;
          pt.vx *= 0.9;
        }

        // Re-enganche si estÃ¡ en reposo
        if (
          pt.detached &&
          Math.abs(pt.vx) < 0.01 &&
          Math.abs(pt.vy) < 0.01
        ) {
          pt.vx = pt.vy = pt.dvx = pt.dvy = 0;
          pt.x = lerp(pt.x, pt.nx, 0.02);
          pt.y = lerp(pt.y, pt.ny, 0.02);
        }

        // --- InterpolaciÃ³n por fases ---
        const descendT = easeOut(tDescend);
        const riseT = easeInOut(tRise);

        const targetX = lerp(pt.nx, 0.5 + pt.driftX * 0.3, descendT);
        const targetY = lerp(pt.ny, 0.5 + pt.driftY * 0.3, descendT);

        // Mezcla final segÃºn fase
        const formT = riseT * (1 - tBreak) + tBreak * 0.3;
        pt.px = pt.x;
        pt.py = pt.y;
        pt.x = lerp(targetX, pt.x, formT * 0.1);
        pt.y = lerp(targetY, pt.y, formT * 0.1);

        // Alpha por fade
        pt.alpha = 1 - tFade;

        // --- Render ---
        const screenX = pt.x * w;
        const screenY = pt.y * h;
        const size = pt.size * (1 - pt.z * 0.4);

        ctx.globalAlpha = clamp(pt.alpha);
        ctx.fillStyle = `hsl(${45 + pt.z * 20}, 90%, ${60 + pt.z * 20}%)`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
        ctx.fill();

        // Estela
        if (isActive && (Math.abs(pt.vx) > 0.01 || Math.abs(pt.vy) > 0.01)) {
          ctx.globalAlpha = clamp(pt.alpha * 0.25);
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = size * 0.6;
          ctx.beginPath();
          ctx.moveTo(pt.px * w, pt.py * h);
          ctx.lineTo(screenX, screenY);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
    };

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro?.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [progress, timeline]);

  return (
    <canvas ref={canvasRef} className={className ?? "pointer-events-none absolute inset-0"} aria-hidden="true" />
  );
}

