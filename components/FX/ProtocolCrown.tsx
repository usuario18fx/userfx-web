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
  vx: number;
  vy: number;
  px: number;
  py: number;
  driftX: number;
  driftY: number;
  threshold: number;
  scatterX: number;
  scatterY: number;
  bounce: number;
  floorOffset: number;
  detached: boolean;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

// One seed keeps the shape, break and floor arrangement stable on every visit.
function buildParticles(count: number): Particle[] {
  let seed = 20261104;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const particles: Particle[] = [];
  const peakCount = 5;
  const segment = Math.PI * 2 / peakCount;

  for (let i = 0; i < count; i += 1) {
    const angle = random() * Math.PI * 2;
    const distance = Math.abs(((angle / segment + 0.5) % 1) - 0.5) * 2;
    const tip = 0.34 + Math.pow(1 - distance, 1.55) * 0.91;
    const outerBand = i % 7 === 0;
    const radius = outerBand ? 0.79 + random() * 0.08 : 0.73 + random() * 0.29;
    const high = random() * tip;
    const size = 0.42 + random() * 1.05;

    particles.push({
      x: Math.cos(angle) * radius,
      y: outerBand ? 0.05 + random() * 0.19 : high,
      z: Math.sin(angle) * radius,
      size,
      alpha: 0.45 + random() * 0.55,
      vx: 0,
      vy: 0,
      px: 0,
      py: 0,
      driftX: 0,
      driftY: 0,
      threshold: random(),
      scatterX: (random() - 0.5) * 2,
      scatterY: random() - 0.65,
      bounce: 0.14 + random() * 0.26,
      floorOffset: random() * 17,
      detached: false,
    });
  }
  return particles;
}

export default function ProtocolCrown({ progress, tl, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    const particles = buildParticles(mobile ? 1900 : 4500);
    const mouse = { x: -10000, y: -10000, pressed: false, lastX: -10000, lastY: -10000 };

    let width = 1;
    let height = 1;
    let pixelRatio = 1;
    let frame = 0;
    let previous = 0;
    let rotation = 0;
    let settle = 0;
    let lastBreak = false;

    const resize = () => {
      pixelRatio = Math.min(mobile ? 1.35 : 1.7, window.devicePixelRatio || 1);
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const pointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.lastX = mouse.x;
      mouse.lastY = mouse.y;
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    };
    const pointerExit = () => {
      mouse.pressed = false;
      mouse.x = -10000;
      mouse.y = -10000;
    };
    const pointerDown = (event: PointerEvent) => {
      pointerMove(event);
      mouse.pressed = true;
    };
    const pointerUp = () => {
      mouse.pressed = false;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("pointermove", pointerMove, { passive: true });
    window.addEventListener("pointerdown", pointerDown, { passive: true });
    window.addEventListener("pointerup", pointerUp, { passive: true });
    window.addEventListener("blur", pointerExit);
    resize();

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const delta = Math.min(0.04, (now - (previous || now)) / 1000);
      previous = now;
      context.clearRect(0, 0, width, height);
      if (!activeRef.current) return;

      const position = progress.get();
      const fracture = clamp((position - tl.breakStart) / 0.105);
      const breaking = fracture > 0.001;
      const fade = 1 - ease((position - tl.fade[0]) / Math.max(0.001, tl.fade[1] - tl.fade[0]));

      let offset = 0;
      if (position >= tl.descend[1]) offset = 1;
      else if (position > tl.descend[0]) {
        offset = ease((position - tl.descend[0]) / (tl.descend[1] - tl.descend[0]));
      }
      if (position > tl.rise[0]) {
        offset = 1 - ease((position - tl.rise[0]) / (tl.rise[1] - tl.rise[0]));
      }

      if (!breaking && lastBreak) {
        // Rewind the story: the five-point crown assembles back into place.
        settle = 1;
      }
      lastBreak = breaking;
      settle += (0 - settle) * Math.min(1, delta * 3.5);
      if (fade <= 0 && !breaking) return;

      rotation += reducedMotion ? 0 : delta * 0.22;
      const spin = rotation + Math.min(position, tl.breakStart) * 4.2;
      const cos = Math.cos(spin);
      const sin = Math.sin(spin);
      const radius = Math.min(height * 0.40, width * 0.32);
      const centerX = width * 0.50;
      const centerY = height * 0.42 + offset * height * 0.82;
      const floorY = height - 7;
      const pointerRadius = mouse.pressed ? 155 : 106;
      const pointerRadiusSq = pointerRadius * pointerRadius;
      const step = Math.min(1.7, Math.max(0.4, delta * 60));

      // Lower-glow surface: fragments land at the same ground level.
      if (breaking && fracture > 0.4) {
        const opacity = Math.min(0.22, (fracture - 0.4) * 0.18) * fade;
        context.fillStyle = `rgba(55,196,245,${opacity.toFixed(3)})`;
        context.fillRect(0, floorY, width, 1);
      }

      context.globalCompositeOperation = "lighter";

      for (const part of particles) {
        const rx = part.x * cos + part.z * sin;
        const rz = part.z * cos - part.x * sin;
        const perspective = 3.5 / (3.5 + rz * 0.4);
        const homeX = centerX + rx * radius * perspective;
        const homeY = centerY - (part.y - 0.43) * radius * perspective;

        const dx = homeX + part.driftX - mouse.x;
        const dy = homeY + part.driftY - mouse.y;
        const distanceSq = dx * dx + dy * dy;

        if (!breaking || reducedMotion) {
          // Mouse pushes the intact crown as a springy particle mesh.
          if (!reducedMotion && distanceSq < pointerRadiusSq) {
            const force = (1 - Math.sqrt(distanceSq) / pointerRadius) * (mouse.pressed ? 11 : 5.4);
            const inv = 1 / Math.sqrt(distanceSq + 1);
            part.driftX += dx * inv * force * step;
            part.driftY += dy * inv * force * step;
          }
          part.driftX *= Math.pow(0.87, step);
          part.driftY *= Math.pow(0.87, step);
          part.px = homeX + part.driftX;
          part.py = homeY + part.driftY;
          part.vx = 0;
          part.vy = 0;
          part.detached = false;
        } else {
          // Each fragment has its own activation time, initial impulse,
          // gravity, collision rebound and floor-rest position.
          const onset = part.threshold * 0.67;
          if (!part.detached && fracture >= onset) {
            part.detached = true;
            part.px = homeX + part.driftX;
            part.py = homeY + part.driftY;
            part.vx = part.scatterX * (1.2 + fracture * 3.5);
            part.vy = -2.1 - Math.abs(part.scatterY) * 4.8;
            part.driftX = 0;
            part.driftY = 0;
          }
          if (part.detached) {
            const px = part.px - mouse.x;
            const py = part.py - mouse.y;
            const r2 = px * px + py * py;
            if (r2 < pointerRadiusSq) {
              const force = (1 - Math.sqrt(r2) / pointerRadius) * (mouse.pressed ? 3.8 : 1.7) * step;
              const inv = 1 / Math.sqrt(r2 + 1);
              part.vx += px * inv * force;
              part.vy += py * inv * force - force * 0.28;
            }
            part.vx += part.scatterX * fracture * 0.03 * step;
            part.vy += 0.19 * step;
            part.vx *= Math.pow(0.988, step);
            part.vy *= Math.pow(0.997, step);
            part.px += part.vx * step;
            part.py += part.vy * step;

            const ground = floorY - part.floorOffset;
            if (part.py > ground) {
              part.py = ground;
              if (part.vy > 0.6) {
                part.vy = -part.vy * part.bounce;
                part.vx *= 0.77;
              } else {
                part.vy = 0;
                part.vx *= 0.90;
              }
            }
            if (part.px < 3 || part.px > width - 3) {
              part.px = Math.max(3, Math.min(width - 3, part.px));
              part.vx *= -0.35;
            }
          } else {
            part.px = homeX + part.driftX;
            part.py = homeY + part.driftY;
          }
        }

        if (part.px < -10 || part.px > width + 10 || part.py < -10 || part.py > height + 10) continue;
        const alpha = part.alpha * fade;
        const size = part.size * (0.8 + perspective * 0.2);
        context.fillStyle = `rgba(38,169,252,${(alpha * 0.16).toFixed(3)})`;
        context.fillRect(part.px - size * 2, part.py - size * 2, size * 4, size * 4);
        context.fillStyle = `rgba(115,228,255,${alpha.toFixed(3)})`;
        context.fillRect(part.px, part.py, size, size);
      }

      context.globalCompositeOperation = "source-over";
    };

    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("blur", pointerExit);
    };
  }, [progress, tl]);

  return (
    <canvas ref={canvasRef} className="pv-crown" aria-hidden="true" />
  );
}
