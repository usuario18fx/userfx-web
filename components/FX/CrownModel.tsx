"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";

export type CrownTL = {
  descend: [number, number];
  rise: [number, number];
  breakStart: number;
  fade: [number, number];
};

type Props = {
  progress: MotionValue<number>;
  tl: CrownTL;
  active: boolean;
};

type Particle = {
  // posición actual (coordenadas normalizadas al canvas)
  x: number;
  y: number;
  z: number;
  // posición objetivo del aro ("corona") durante la formación
  nx: number;
  ny: number;
  // estado físico
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

export default function CrownParticles({ progress, tl, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const activeRef = useRef(active);
  const particlesRef = useRef<Particle[]>([]);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const pointerRef = useRef({ x: 0.5, y: 0.5 });

  // Mantener `active` fuera del closure del loop
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // Inicialización de partículas (una vez)
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

    // FIX: antes `reduced` se calculaba y nunca se usaba. Ahora recorta la
    // física libre (repulsión, scatter, gravedad, estelas) para respetar
    // prefers-reduced-motion; la posición sigue ligada al scroll.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

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
    // FIX: antes se dividía clientX entre el ancho de la VENTANA, lo que
    // desalineaba la repulsión si el canvas no ocupa todo el viewport. Ahora
    // se mapea al rectángulo real del canvas.
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      pointerRef.current.x = (e.clientX - rect.left) / rect.width;
      pointerRef.current.y = (e.clientY - rect.top) / rect.height;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    let lastProgress = -1;
    let paused = false;
    // FIX: aquí NO se re-agenda un frame. El loop nunca se detiene: cuando la
    // pestaña se oculta simplemente early-returna. Re-agendar en
    // `visibilitychange` acumulaba un bucle rAF extra por cada hide/show, y al
    // desmontar sólo se cancelaba el último id (bucles fugados).
    const onVisibility = () => {
      paused = document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeInOut = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // --- Loop ---
    const frame = () => {
      rafRef.current = requestAnimationFrame(frame);
      if (paused) return;

      const { w, h } = sizeRef.current;
      if (w === 0 || h === 0) return;

      const p = progress.get();
      const tFade = range(p, tl.fade);

      // FIX: el chequeo de "estático" ahora también mira el desplazamiento real
      // del frame (x - px), porque la mezcla por fases mueve la posición sin
      // pasar por vx/vy y antes se congelaba a mitad de convergencia.
      const calm = particlesRef.current.every(
        (pt) =>
          Math.abs(pt.vx) < 0.002 &&
          Math.abs(pt.vy) < 0.002 &&
          Math.abs(pt.x - pt.px) < 0.0003 &&
          Math.abs(pt.y - pt.py) < 0.0003
      );
      const stationary =
        Math.abs(p - lastProgress) < 1e-5 &&
        tFade < 1 &&
        !activeRef.current &&
        calm;
      if (stationary) return;
      lastProgress = p;

      // --- Fases del timeline ---
      const tDescend = range(p, tl.descend);
      const tRise = range(p, tl.rise);
      const tBreak = clamp(
        (p - tl.breakStart) / Math.max(1e-6, 1 - tl.breakStart)
      );

      ctx.clearRect(0, 0, w, h);

      // FIX: si ya se desvaneció por completo, dejar de simular. Antes la
      // gravedad mantenía las velocidades vivas y el canvas se redibujaba en
      // alpha 0 para siempre.
      if (tFade >= 1) return;

      const ptr = pointerRef.current;
      const isActive = activeRef.current;

      const descendT = easeOut(tDescend);
      const riseT = easeInOut(tRise);
      // FIX: sin `+ tBreak * 0.3`. Ese término seguía atrayendo las partículas
      // a la formación DURANTE el break, anulando el scatter y la caída.
      const formT = riseT * (1 - tBreak);
      // FIX: atracción hacia el objetivo = 2% base (para que las partículas
      // siempre converjan a su target aunque no haya fase activa) + 8% de
      // formación durante `rise`. Se disuelve por completo en el break para
      // que la física (scatter + gravedad) mande.
      const pull = (1 - tBreak) * (0.02 + formT * 0.08);

      for (const pt of particlesRef.current) {
        // --- Física / animación ---
        // FIX: al hacer scroll hacia atrás (tBreak vuelve a 0) las partículas
        // se re-enganchan. La rama original era código muerto: la gravedad
        // mantenía vy ≈ 0.018–0.03, siempre por encima del umbral 0.01.
        if (tBreak === 0 && pt.detached) {
          pt.detached = false;
          pt.vx = pt.vy = pt.dvx = pt.dvy = 0;
        }

        // Posición previa: se captura UNA vez por frame. Antes se
        // sobreescribía más abajo y la estela sólo veía el último tramo.
        pt.px = pt.x;
        pt.py = pt.y;

        if (!reduced) {
          // Repulsión del puntero
          if (isActive && tBreak < 1) {
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

          // Caída por gravedad
          // FIX: 0.0006 → 0.005. Con el integrador v=(v+f)*0.98 la velocidad
          // terminal es ≈ 49·f; con 0.0006 la caída de ~0.3 del canvas tardaba
          // ~17–29 s (invisible). Ahora tarda ~2–3.5 s.
          if (pt.detached) {
            pt.vy += 0.005 * pt.bounce;
          }

          // Drift suave
          // FIX: 0.5 → 0.002. El integrador amplifica la fuerza ×49 en
          // régimen permanente: con 0.5 la deriva llegaba a ±0.245 del canvas
          // por frame (jitter violento). Con 0.002 queda ~0.1%/frame.
          pt.dvx += (Math.sin(pt.driftX * 10 + p * 6) * 0.002 - pt.dvx) * 0.02;
          pt.dvy += (Math.cos(pt.driftY * 10 + p * 6) * 0.002 - pt.dvy) * 0.02;

          pt.vx = (pt.vx + pt.dvx) * 0.98;
          pt.vy = (pt.vy + pt.dvy) * 0.98;

          pt.x += pt.vx * 0.01;
          pt.y += pt.vy * 0.01;

          // Rebote en el suelo (con perspectiva según floorDepth)
          const floorY = 0.85 + pt.floorDepth * 0.1;
          if (pt.detached && pt.y > floorY) {
            pt.y = floorY;
            pt.vy *= -0.4;
            pt.vx *= 0.9;
          }
        }

        // --- Interpolación por fases ---
        const targetX = lerp(pt.nx, 0.5 + pt.driftX * 0.3, descendT);
        const targetY = lerp(pt.ny, 0.5 + pt.driftY * 0.3, descendT);

        // FIX: mezcla invertida. Antes: `lerp(targetX, pt.x, formT * 0.1)`
        // dejaba la posición al 90% pegada al objetivo (97% con tBreak=1), así
        // que el scatter y la caída no se veían. Ahora la física manda y el
        // objetivo atrae un `pull` por frame.
        pt.x = lerp(pt.x, targetX, pull);
        pt.y = lerp(pt.y, targetY, pull);

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
        if (
          !reduced &&
          isActive &&
          (Math.abs(pt.vx) > 0.01 || Math.abs(pt.vy) > 0.01)
        ) {
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
    // Nota: si el padre recrea `tl` en cada render (objeto literal inline),
    // envuélvelo en useMemo para no resuscribir todo el loop en cada render.
  }, [progress, tl]);

  return (
    <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />
  );
}
