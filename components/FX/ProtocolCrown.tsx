"use client";

import { useEffect, useRef } from "react";
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

type Speck = {
  x: number;
  y: number;
  z: number;
  radius: number;
  shine: number;
  side: number;
  dx: number;
  dy: number;
  phase: number;
};

const DEFAULT_TL: CrownTL = {
  descend: [0, 0.25],
  rise: [0.25, 0.6],
  breakStart: 0.72,
  fade: [0.85, 1],
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const x = clamp(value);
  return x * x * (3 - 2 * x);
};
const phase = (value: number, [start, end]: [number, number]) =>
  smooth((value - start) / Math.max(0.000001, end - start));

function makeSpecks(): Speck[] {
  let seed = 41829;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Crown outline: five peaks, sloping toward a curved metallic band.
  const outline: [number, number][] = [
    [-0.98, 0.01], [-0.94, -0.70], [-0.65, -0.38],
    [-0.52, -0.96], [-0.17, -0.54], [0, -1.16],
    [0.21, -0.50], [0.54, -0.90], [0.64, -0.37],
    [0.94, -0.68], [0.98, 0.05], [0.84, 0.19],
    [0.39, 0.26], [0, 0.29], [-0.42, 0.22], [-0.86, 0.14],
  ];
  const inside = (x: number, y: number) => {
    let hit = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const a = outline[i];
      const b = outline[j];
      if ((a[1] > y) !== (b[1] > y) &&
        x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
    }
    return hit;
  };
  const points: Speck[] = [];
  let attempts = 0;
  while (points.length < 8500 && attempts++ < 28000) {
    const x = random() * 2 - 1;
    const y = random() * 1.55 - 1.18;
    if (!inside(x, y)) continue;
    const z = random();
    points.push({
      x, y, z,
      radius: 0.35 + random() * 0.8,
      shine: random(),
      side: random(),
      dx: (random() - 0.5) * (1.6 + random() * 1.3),
      dy: -(random() * 1.05) + 0.1,
      phase: random() * Math.PI * 2,
    });
  }
  // Concentrated contour grains keep the iconic crown geometry sharp.
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 850);
    for (let k = 0; k < n; k++) {
      const t = (k + random()) / n;
      points.push({
        x: a[0] + (b[0] - a[0]) * t + (random() - 0.5) * 0.013,
        y: a[1] + (b[1] - a[1]) * t + (random() - 0.5) * 0.013,
        z: random() * 0.25,
        radius: 0.55 + random() * 0.85,
        shine: 0.7 + random() * 0.3,
        side: random(),
        dx: (random() - 0.5) * 2.5,
        dy: -random(),
        phase: random() * Math.PI * 2,
      });
    }
  }
  return points;
}

const SPECKS = makeSpecks();

export default function ProtocolCrown({ progress, tl, active, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active ?? true);
  const timeline = tl ?? DEFAULT_TL;

  useEffect(() => {
    activeRef.current = active ?? true;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let w = 0;
    let h = 0;
    let visible = !document.hidden;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const onVisibility = () => { visible = !document.hidden; };
    document.addEventListener("visibilitychange", onVisibility);

    const render = (timestamp: number) => {
      raf = window.requestAnimationFrame(render);
      if (!visible || !activeRef.current || !w || !h) return;

      const p = clamp(typeof progress === "number" ? progress : progress.get());
      const descend = phase(p, timeline.descend);
      const rise = phase(p, timeline.rise);
      const broken = smooth((p - timeline.breakStart) / Math.max(0.00001, 1 - timeline.breakStart));
      const fade = 1 - phase(p, timeline.fade);
      context.clearRect(0, 0, w, h);
      if (fade <= 0) return;

      const mobile = w < 680;
      const scale = Math.min(w * (mobile ? 0.42 : 0.31), h * (mobile ? 0.31 : 0.37));
      const cx = w * (mobile ? 0.53 : 0.59);
      const cy = h * (mobile ? 0.47 : 0.54) + (descend - rise) * h * 0.19;
      const seconds = timestamp * 0.001;

      context.save();
      context.globalCompositeOperation = "lighter";

      // A faint blue reflection under the crown, behind the protocol cards.
      const aura = context.createRadialGradient(cx, cy + scale * 0.52, 0, cx, cy + scale * 0.52, scale * 1.4);
      aura.addColorStop(0, "rgba(0,166,255,0.22)");
      aura.addColorStop(0.5, "rgba(0,77,156,0.07)");
      aura.addColorStop(1, "rgba(0,77,156,0)");
      context.globalAlpha = fade * (1 - broken);
      context.fillStyle = aura;
      context.beginPath();
      context.ellipse(cx, cy + scale * 0.5, scale * 1.4, scale * 0.5, 0, 0, Math.PI * 2);
      context.fill();

      const colors = ["#0b477d", "#12659b", "#138bce", "#19bdff", "#72dbff", "#c2efff"];
      for (let i = 0; i < SPECKS.length; i++) {
        const dot = SPECKS[i];
        const depth = 0.86 + dot.z * 0.22;
        const tremor = reduceMotion ? 0 : Math.sin(seconds * 1.1 + dot.phase) * 0.0015;
        const falling = broken * broken;
        const x = dot.x + tremor + dot.dx * falling;
        const y = dot.y + (falling * dot.dy + falling * falling * 2.5);
        // Perspective tilt and gentle curvature of a real crown's rim.
        const sx = cx + (x + dot.y * 0.13) * scale * depth;
        const sy = cy + (y * 0.76 + dot.x * 0.10 + dot.x * dot.x * 0.105) * scale * depth;
        if (sx < -5 || sx > w + 5 || sy < -5 || sy > h + 5) continue;
        const highlight = dot.shine > 0.965;
        const colorIndex = highlight ? 5 : Math.min(4, Math.floor((dot.shine * 0.68 + (1 - dot.z) * 0.32) * 5));
        context.fillStyle = colors[colorIndex];
        context.globalAlpha = fade * (highlight ? 0.85 : 0.32 + dot.shine * 0.52);
        const radius = dot.radius * (mobile ? 0.68 : 0.94) * (highlight ? 1.35 : 1);
        context.fillRect(sx, sy, radius, radius);
      }

      if (!reduceMotion && broken < 0.9) {
        context.globalAlpha = fade * (1 - broken) * 0.8;
        context.strokeStyle = "rgba(24,182,255,0.36)";
        context.lineWidth = Math.max(0.6, scale * 0.003);
        context.beginPath();
        context.ellipse(cx, cy + scale * 0.24, scale * 0.98, scale * 0.105, 0.1, 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();
    };
    raf = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [progress, timeline]);

  return <canvas ref={canvasRef} className={className ?? "pv-crown"} aria-hidden="true" />;
}
