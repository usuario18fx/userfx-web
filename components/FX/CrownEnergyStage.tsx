"use client";

import { useEffect, useRef, useState } from "react";
import type { MotionValue } from "framer-motion";

type Props = { progress: MotionValue<number>; active: boolean };
type Particle = {
  x: number; y: number; z: number; floorX: number; floorZ: number;
  tx: number; ty: number; phase: number; size: number; shade: number;
  dx: number; dy: number; vx: number; vy: number;
};
const EDGE = [
  [-1.79, -.94], [-1.79, .44], [-1.37, -.06], [-1.05, .79],
  [-.43, .10], [0, 1.47], [.43, .10], [1.05, .79],
  [1.37, -.06], [1.79, .44], [1.79, -.94], [-1.79, -.94],
] as const;
const PALETTES = [
  [177, 187, 194], [220, 252, 276], [164, 183, 208], [288, 317, 345],
];
const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const smooth = (a: number, b: number, x: number) => {
  const v = clamp((x - a) / (b - a));
  return v * v * (3 - 2 * v);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function makeParticles(count: number): Particle[] {
  const mask = document.createElement("canvas");
  mask.width = 720;
  mask.height = 180;
  const ctx = mask.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.font = '900 132px Arial, Helvetica, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText("USERFX", 360, 96, 650);
  const pixels = ctx.getImageData(0, 0, 720, 180).data;
  const targets: { x: number; y: number }[] = [];
  for (let y = 0; y < 180; y += 2) {
    for (let x = 0; x < 720; x += 2) {
      if (pixels[(y * 720 + x) * 4 + 3] > 150) targets.push({ x: (x - 360) / 720 * 3.18, y: -.45 - (y - 90) / 180 * .70 });
    }
  }
  let seed = 714221;
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [targets[i], targets[j]] = [targets[j], targets[i]];
  }
  return Array.from({ length: count }, (_, i) => {
    const angle = rnd() * Math.PI * 2;
    const peak = Math.pow((Math.cos(7 * (angle - Math.PI / 2)) + 1) / 2, 5);
    const top = .05 + 1.42 * peak;
    const y = -.94 + rnd() * (top + .94);
    const target = targets[Math.floor(i * targets.length / count)] ?? { x: 0, y: -.45 };
    return {
      x: Math.cos(angle) * 1.79, y, z: Math.sin(angle) * 1.58,
      floorX: (rnd() - .5) * 5.0, floorZ: (rnd() - .5) * 1.3,
      tx: target.x, ty: target.y, phase: rnd() * Math.PI * 2,
      size: .65 + rnd() * 1.1, shade: Math.floor(rnd() * 3),
      dx: 0, dy: 0, vx: 0, vy: 0,
    };
  });
}

export default function CrownEnergyStage({ progress, active }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const pointer = useRef({ x: -9999, y: -9999, inside: false });
  const pulse = useRef({ at: -10000, palette: 0 });
  const [phase, setPhase] = useState(0);
  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const update = (p: number) => setPhase(p < .20 ? 0 : p < .44 ? 1 : p < .76 ? 2 : 3);
    update(progress.get());
    return progress.on("change", update);
  }, [progress]);

  useEffect(() => {
    const node = canvas.current;
    const root = host.current;
    if (!node || !root) return;
    const ctx = node.getContext("2d", { alpha: true });
    if (!ctx) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const particles = makeParticles(window.innerWidth < 700 ? 1500 : 2800);
    let w = 1, h = 1, frame = 0, last = 0;
    const resize = () => {
      const rect = root.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      node.width = Math.round(w * dpr);
      node.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    resize();
    observer.observe(root);
    const draw = (ms: number) => {
      frame = requestAnimationFrame(draw);
      if (!activeRef.current || document.hidden || ms - last < 1000 / 40) return;
      last = ms;
      const reduced = media.matches;
      const p = reduced ? 1 : clamp(progress.get());
      const time = reduced ? 0 : ms * .001;
      const mobile = w < 700;
      // Stable screen-space silhouette: never inherits drag, time or scroll.
      const scale = Math.min(w * (mobile ? .84 : .38) / 3.58, h * .66 / 2.41);
      const cx = w * (mobile ? .5 : .56);
      const cy = h * .49;
      const floor = cy + scale * 1.48;
      const fall = smooth(.04, .32, p);
      const form = smooth(.36, .79, p);
      const settle = smooth(.65, .94, p);
      const kick = reduced ? 0 : Math.exp(-Math.max(0, ms - pulse.current.at) / 500);
      const palette = PALETTES[(pulse.current.palette + (p >= .22 ? 1 : 0)) % PALETTES.length];
      const mx = pointer.current.x;
      const my = pointer.current.y;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.strokeStyle = "#7afff5";
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      EDGE.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(cx + x * scale, cy - y * scale);
        else ctx.lineTo(cx + x * scale, cy - y * scale);
      });
      ctx.shadowColor = "#31d9d3";
      ctx.shadowBlur = 12;
      ctx.globalAlpha = .23;
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = .94;
      ctx.lineWidth = 2.1;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const q of particles) {
        const perspective = 1 + q.z * .035;
        const originalX = cx + (q.x - q.z * .10) * scale * perspective;
        const originalY = cy - q.y * scale * perspective + q.z * scale * .05;
        const floorX = cx + q.floorX * scale;
        const floorY = floor + q.floorZ * scale * .22;
        const targetX = cx + q.tx * scale;
        const targetY = cy - q.ty * scale;
        const energy = (1 - settle) * Math.sin(form * Math.PI);
        const swirl = q.phase + time * 2.1 + form * 5.4;
        const wave = reduced ? 0 : energy * scale * .24;
        let x = mix(mix(originalX, floorX, fall), targetX, form) + Math.cos(swirl) * wave;
        let y = mix(mix(originalY, floorY, fall), targetY, form) + Math.sin(swirl) * wave - Math.sin(form * Math.PI) * scale * .45;
        const burst = kick * scale * .16;
        x += Math.cos(q.phase) * burst;
        y += Math.sin(q.phase) * burst;
        if (!reduced && pointer.current.inside) {
          const ax = x + q.dx - mx, ay = y + q.dy - my;
          const distance = Math.hypot(ax, ay);
          const radius = Math.max(28, scale * .38);
          if (distance < radius) {
            const force = (1 - distance / radius) * 2.9;
            const angle = distance < .01 ? q.phase : Math.atan2(ay, ax);
            q.vx += Math.cos(angle) * force;
            q.vy += Math.sin(angle) * force;
          }
        }
        // Settled grains stay on the floor; formed energy is springy and self-healing.
        const onFloor = fall > .98 && form < .01;
        q.vx = (q.vx - q.dx * (onFloor ? 0 : .045)) * .81;
        q.vy = (q.vy - q.dy * (onFloor ? .09 : .045)) * .81;
        q.dx = clamp(q.dx + q.vx, -scale * .45, scale * .45);
        q.dy = clamp(q.dy + q.vy * (onFloor ? .25 : 1), -scale * (onFloor ? .12 : .45), scale * (onFloor ? .12 : .45));
        const hue = mix(181 + q.shade * 5, palette[q.shade], fall);
        ctx.fillStyle = "hsl(" + hue + " 92% " + mix(51 + q.shade * 9, 75 + q.shade * 6, settle) + "%)";
        ctx.globalAlpha = mix(.44, .91, settle);
        const size = Math.max(.55, q.size * (mobile ? .78 : 1) * mix(.82, 1.15, settle));
        ctx.fillRect(x + q.dx, y + q.dy, size, size);
        if (!reduced && energy > .14 && q.shade === 2) {
          ctx.globalAlpha = energy * .21;
          ctx.fillRect(x + q.dx - Math.cos(swirl) * 4, y + q.dy - Math.sin(swirl) * 4, size * 2, size);
        }
      }
      ctx.restore();
      // A restrained, readable energy core appears only after the grains assemble.
      if (settle > .12) {
        ctx.save();
        ctx.translate(cx, cy + .45 * scale);
        ctx.font = "900 " + (.55 * scale) + "px Arial, Helvetica, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const textWidth = ctx.measureText("USERFX").width;
        ctx.scale(Math.min(1, 2.78 * scale / Math.max(1, textWidth)), 1);
        ctx.globalAlpha = settle * .13;
        ctx.fillStyle = "#d9ffff";
        ctx.shadowColor = "#7beaff";
        ctx.shadowBlur = 11;
        ctx.fillText("USERFX", 0, 0);
        ctx.restore();
      }
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [progress]);

  const triggerPulse = () => {
    pulse.current = { at: performance.now(), palette: pulse.current.palette + 1 };
  };
  const labels = ["ᴄʀᴏᴡɴ ᴜɴʟᴏᴄᴋᴇᴅ", "ᴇɴᴇʀɢʏ ʀᴇʟᴇᴀꜱᴇᴅ", "ᴜꜱᴇʀꜰx ɪꜱ ꜰᴏʀᴍɪɴɢ", "ᴜꜱᴇʀꜰx ᴏɴʟɪɴᴇ"];
  return (
    <div ref={host} className="fx-crown-energy-stage" onPointerMove={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      pointer.current = { x: event.clientX - rect.left, y: event.clientY - rect.top, inside: true };
    }} onPointerLeave={() => { pointer.current.inside = false; }} onPointerUp={(event) => {
      if (event.pointerType !== "mouse") pointer.current.inside = false;
    }} onPointerCancel={() => { pointer.current.inside = false; }}>
      <canvas ref={canvas} className="fx-crown-energy-canvas" aria-label="Fixed crown outline; energy particles fall and assemble into USERFX as you scroll." onClick={triggerPulse} />
      <div className="fx-crown-playground-info">
        <span>{labels[phase]}</span>
        <small>{phase === 3 ? "ᴘʟᴀʏ ᴡɪᴛʜ ᴛʜᴇ ᴇɴᴇʀɢʏ · ꜱᴄʀᴏʟʟ ᴛᴏ ɢᴇᴛ ɪɴ" : "ꜱᴄʀᴏʟʟ ᴛᴏ ᴛʀᴀɴꜱꜰᴏʀᴍ · ᴍᴏᴠᴇ ᴛᴏ ᴘʟᴀʏ"}</small>
        <button className="fx-crown-energy-pulse" type="button" onClick={triggerPulse} aria-label="Pulse energy and change particle color">ᴘᴜʟꜱᴇ ᴇɴᴇʀɢʏ</button>
      </div>
    </div>
  );
}
