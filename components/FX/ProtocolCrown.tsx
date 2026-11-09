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
  u: number;
  v: number;
  depth: number;
  size: number;
  alpha: number;
  delay: number;
  scatterX: number;
  scatterY: number;
  floorDepth: number;
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const smoothstep = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

const phase = (value: number, start: number, end: number) =>
  clamp((value - start) / Math.max(0.0001, end - start));

// Five distinct crown points, two side wings and an elliptical lower rim.
const PEAKS: readonly [number, number][] = [
  [-1, 0.1],
  [-0.88, -0.52],
  [-0.66, -0.08],
  [-0.47, -0.82],
  [-0.24, -0.2],
  [0, -1.1],
  [0.24, -0.2],
  [0.47, -0.82],
  [0.66, -0.08],
  [0.88, -0.52],
  [1, 0.1],
];

function crownTop(u: number) {
  for (let i = 1; i < PEAKS.length; i += 1) {
    const left = PEAKS[i - 1];
    const right = PEAKS[i];
    if (u <= right[0]) {
      const t = clamp((u - left[0]) / (right[0] - left[0]));
      return left[1] + (right[1] - left[1]) * t;
    }
  }
  return PEAKS[PEAKS.length - 1][1];
}

function createParticles(count: number): Particle[] {
  let seed = 0x18fcb4;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  return Array.from({ length: count }, (_, i) => {
    const band = i % 5 === 0;
    const edge = i % 7 === 0;
    return {
      u: random() * 2 - 1,
      v: band ? 0.83 + random() * 0.17 : edge ? random() * 0.05 : random(),
      depth: random() * 2 - 1,
      size: 0.65 + random() * 1.2,
      alpha: 0.38 + random() * 0.62,
      delay: random() * 0.32,
      scatterX: (random() * 2 - 1) * (0.58 + random() * 0.42),
      scatterY: random(),
      floorDepth: random(),
    };
  });
}

export default function ProtocolCrown({ progress, tl, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef(0);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let lastProgress = -1;
    let wasVisible = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = createParticles(width < 680 ? 1500 : 3600);
      lastProgress = -1;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const frame = () => {
      animationRef.current = window.requestAnimationFrame(frame);
      if (document.hidden || !activeRef.current) {
        wasVisible = false;
        return;
      }

      const p = clamp(progress.get());
      if (wasVisible && Math.abs(p - lastProgress) < 0.0001) return;
      lastProgress = p;
      wasVisible = true;

      context.clearRect(0, 0, width, height);

      const appears = smoothstep(phase(p, tl.descend[0] - 0.06, tl.rise[0] + 0.06));
      const fades = 1 - smoothstep(phase(p, tl.fade[0], tl.fade[1]));
      const opacity = appears * fades;
      if (opacity <= 0.002) return;

      // The fourth chapter begins precisely at breakStart. The scroll controls
      // both the three-dimensional rotation and the destruction of the crown.
      const turn = clamp(p / Math.max(0.01, tl.breakStart)) * Math.PI * 2.25;
      const spinCos = Math.cos(turn);
      const spinSin = Math.sin(turn);
      const destruction = smoothstep(phase(p, tl.breakStart, tl.fade[0]));
      const centerX = width * (width < 680 ? 0.5 : 0.61);
      const centerY = height * (width < 680 ? 0.54 : 0.55);
      const scaleX = Math.min(width * (width < 680 ? 0.45 : 0.31), 430);
      const scaleY = Math.min(width * (width < 680 ? 0.29 : 0.2), 235);
      const groundY = height * 0.88;

      if (destruction > 0.5) {
        context.save();
        context.globalAlpha = opacity * Math.min(0.25, destruction * 0.25);
        context.fillStyle = "#168bcc";
        context.beginPath();
        context.ellipse(centerX, groundY + 5, scaleX * 0.92, 8, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }

      for (let i = 0; i < particles.length; i += 1) {
        const pt = particles[i];
        const top = crownTop(pt.u);
        const lower = 0.25 + 0.08 * (1 - pt.u * pt.u);
        const localY = top + (lower - top) * pt.v;
        const depth = pt.depth * 0.32;
        const rotatedX = pt.u * spinCos + depth * spinSin;
        const rotatedZ = depth * spinCos - pt.u * spinSin;
        const perspective = 1 + rotatedZ * 0.17;

        const startX = centerX + rotatedX * perspective * scaleX;
        const startY = centerY + (localY + pt.depth * 0.045) * scaleY;
        const release = reducedMotion
          ? (destruction > 0 ? 1 : 0)
          : smoothstep(phase(destruction, pt.delay, Math.min(1, pt.delay + 0.64)));

        // Deterministic gravity: scroll backward reconstructs the same crown
        // without a second physics loop, random jumps or stuck particles.
        const spread = (1 - Math.pow(1 - release, 2)) * scaleX * 0.36;
        const x = startX + pt.scatterX * spread;
        const floor = groundY + pt.floorDepth * height * 0.04;
        const fall = release * release;
        const bounce = release > 0.65
          ? Math.abs(Math.sin(release * Math.PI * 5)) * Math.pow(1 - release, 2) * height * 0.025
          : 0;
        const y = Math.min(floor, startY + (floor - startY) * fall - bounce + pt.scatterY * 3 * release);

        const depthShade = 0.65 + Math.max(-0.5, Math.min(0.5, rotatedZ)) * 0.4;
        const alpha = opacity * pt.alpha * depthShade;
        const size = pt.size * (width < 680 ? 0.9 : 1.1);
        if (alpha <= 0.015) continue;

        context.globalAlpha = alpha;
        context.fillStyle = i % 11 === 0 ? "#a6edff" : i % 3 === 0 ? "#39caff" : "#008fe5";
        if (i % 17 === 0) {
          context.beginPath();
          context.arc(x, y, size * 1.65, 0, Math.PI * 2);
          context.fill();
        } else {
          context.fillRect(x, y, size, size);
        }
      }

      context.globalAlpha = 1;
    };

    animationRef.current = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(animationRef.current);
      observer.disconnect();
    };
  }, [progress, tl]);

  return (
    <canvas ref={canvasRef} className="pv-crown" aria-hidden="true" />
  );
}
