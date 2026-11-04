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
  x: number;
  y: number;
  z: number;
  size: number;
  alpha: number;
  speed: number;
  angle: number;
  target: number;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};

function buildParticles(): Particle[] {
  let seed = 20261104;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const particles: Particle[] = [];
  const peakCount = 5;

  for (let i = 0; i < 1900; i++) {
    const angle = random() * Math.PI * 2;
    const segment = Math.PI * 2 / peakCount;
    const distance = Math.abs(((angle / segment + 0.5) % 1) - 0.5) * 2;
    const tip = 0.33 + Math.pow(1 - distance, 1.45) * 0.74;
    const height = random() * tip;
    const band = i % 6 === 0;
    const radius = band ? 0.80 + random() * 0.10 : 0.75 + random() * 0.28;

    particles.push({
      x: Math.cos(angle) * radius,
      y: band ? random() * 0.25 : height,
      z: Math.sin(angle) * radius,
      size: 0.7 + random() * 1.45,
      alpha: 0.32 + random() * 0.62,
      speed: 0.3 + random() * 0.55,
      angle: random() * Math.PI * 2,
      target: 0.12 + random() * 0.32,
    });
  }
  return particles;
}

const PARTICLES = buildParticles();

export default function ProtocolCrown({ progress, tl, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    let width = 1;
    let height = 1;
    let pixelRatio = 1;
    let frame = 0;
    let previous = 0;
    let rotation = 0;
    let fall = 0;

    const resize = () => {
      pixelRatio = Math.min(1.7, window.devicePixelRatio || 1);
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const delta = Math.min(0.05, (now - (previous || now)) / 1000);
      previous = now;

      if (!activeRef.current) {
        context.clearRect(0, 0, width, height);
        return;
      }

      const position = progress.get();
      rotation += delta * 0.27;
      const spin = rotation + Math.min(position, tl.breakStart) * 4.2;
      const falling = Math.max(0, (position - tl.breakStart) * 7.2);
      fall += (falling - fall) * Math.min(1, delta * 8);
      const fade = 1 - ease((position - tl.fade[0]) / Math.max(0.001, tl.fade[1] - tl.fade[0]));

      let offset = 0;
      if (position >= tl.descend[1]) offset = 1;
      else if (position > tl.descend[0]) {
        offset = ease((position - tl.descend[0]) / (tl.descend[1] - tl.descend[0]));
      }
      if (position > tl.rise[0]) {
        offset = 1 - ease((position - tl.rise[0]) / (tl.rise[1] - tl.rise[0]));
      }

      context.clearRect(0, 0, width, height);
      if (fade <= 0 || (offset > 0.995 && fall < 0.01)) return;

      const radius = Math.min(height * 0.33, width * 0.28);
      const centerX = width * 0.50;
      const centerY = height * 0.44 + offset * height * 0.98;
      const cos = Math.cos(spin);
      const sin = Math.sin(spin);
      const floor = height - 3;

      context.globalCompositeOperation = "lighter";

      for (const part of PARTICLES) {
        const rx = part.x * cos + part.z * sin;
        const rz = part.z * cos - part.x * sin;
        const perspective = 3.7 / (3.7 + rz * 0.37);
        let x = centerX + rx * radius * perspective;
        let y = centerY - (part.y - 0.45) * radius * perspective;

        if (fall > 0) {
          const burst = Math.min(fall, 0.52) * height * 0.23;
          x += Math.cos(part.angle) * burst;
          y += Math.sin(part.angle) * burst * 0.4;
          x += (width * part.target - x) * ease((fall - 0.25) / 1.20);
          y += 0.5 * 1.45 * fall * fall * height;
          if (y > floor) y = floor - part.speed * 3;
        }

        if (x < -20 || x > width + 20 || y < -20 || y > height + 20) continue;

        const alpha = part.alpha * fade;
        context.fillStyle = "rgba(58,200,252," + (alpha * 0.22).toFixed(3) + ")";
        context.fillRect(x - part.size * 2.3, y - part.size * 2.3, part.size * 4.6, part.size * 4.6);
        context.fillStyle = "rgba(92,224,255," + alpha.toFixed(3) + ")";
        context.fillRect(x, y, part.size, part.size);
      }

      context.globalCompositeOperation = "source-over";
    };

    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [progress, tl]);

  return (
    <canvas ref={canvasRef} className="pv-crown" aria-hidden="true" />
  );
}
