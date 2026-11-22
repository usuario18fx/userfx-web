"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import * as THREE from "three";
import type { MotionValue } from "framer-motion";

export type CrownTL = {
  descend: [number, number];
  rise: [number, number];
  breakStart: number;
  fade: [number, number];
};

type Props =
  | { progress: MotionValue<number>; tl: CrownTL; active: boolean; step?: never; className?: string; interactive?: boolean }
  | { progress: number; step: number; className?: string; tl?: never; active?: never; interactive?: boolean };

const DEFAULT_TL: CrownTL = {
  descend: [0, 0.25],
  rise: [0.25, 0.6],
  breakStart: 0.72,
  fade: [0.85, 1],
};

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => {
  const x = clamp(v);
  return x * x * (3 - 2 * x);
};
const range = (v: number, [a, b]: [number, number]) =>
  ease((v - a) / Math.max(b - a, 0.000001));

function crownGeometry(count: number) {
  let seed = 714221;
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const scatter = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const color = new THREE.Color();
  const palette = ["#0b7775", "#149d98", "#22bdb8", "#39d3d0", "#3fd8d0", "#55e0d9"];
  const peak = (angle: number) =>
    Math.pow((Math.cos(7 * (angle - Math.PI / 2)) + 1) / 2, 5);
  const point = (index: number, x: number, y: number, z: number, highlight: number) => {
    const j = index * 3;
    positions[j] = x;
    positions[j + 1] = y;
    positions[j + 2] = z;
    phase[index] = rnd() * Math.PI * 2;
    const paletteIndex = highlight > 0.98 ? 5 : highlight > 0.87 ? 4 :
      highlight > 0.67 ? 3 : highlight > 0.36 ? 2 : highlight > 0.12 ? 1 : 0;
    color.set(palette[paletteIndex]);
    colors[j] = color.r;
    colors[j + 1] = color.g;
    colors[j + 2] = color.b;
    const angle = rnd() * Math.PI * 2;
    const radial = 1.0 + rnd() * 2.7;
    scatter[j] = Math.cos(angle) * radial;
    scatter[j + 1] = 0.65 + rnd() * 2.3;
    scatter[j + 2] = Math.sin(angle) * radial;
  };

  for (let i = 0; i < count; i++) {
    const theta = rnd() * Math.PI * 2;
    const c = Math.cos(theta), s = Math.sin(theta);
    const spike = peak(theta);
    const crownTop = 0.05 + 1.42 * spike;
    const mode = rnd();
    let y: number;
    let highlight = rnd() * 0.82;
    if (mode < 0.13) {
      // Sharp cyan contours across every peak.
      y = crownTop + (rnd() - 0.5) * 0.038;
      highlight = 0.75 + rnd() * 0.25;
    } else if (mode < 0.29) {
      // The heavy curved metal rim is also made entirely of grains.
      y = -1.04 + rnd() * 0.16;
      highlight = 0.73 + rnd() * 0.27;
    } else if (mode < 0.36) {
      y = -0.90 + rnd() * 0.04;
      highlight = 0.7 + rnd() * 0.29;
    } else {
      y = -0.95 + rnd() * (crownTop + 0.95);
    }
    // Two concentric particle layers give the crown real 3D thickness.
    const shell = rnd() < 0.16 ? 0.88 : 1;
    const rx = (1.79 + (rnd() - 0.5) * 0.065) * shell;
    const rz = (1.05 + (rnd() - 0.5) * 0.055) * shell;
    point(i, rx * c, y, rz * s, highlight);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return { geometry, original: positions.slice(), scatter, phase };
}

// FX_CROWN_PAINTED_OUTLINE_V1 · Contorno iluminado debajo de las particulas.
const CROWN_EDGE: ReadonlyArray<readonly [number, number]> = [
  [-1.79, -0.94], [-1.79, 0.44], [-1.37, -0.06],
  [-1.05, 0.79], [-0.43, 0.10], [0, 1.47],
  [0.43, 0.10], [1.05, 0.79], [1.37, -0.06],
  [1.79, 0.44], [1.79, -0.94], [-1.79, -0.94],
];

function makePaintedCrownOutline() {
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 1; i < CROWN_EDGE.length; i++) {
    const [ax, ay] = CROWN_EDGE[i - 1];
    const [bx, by] = CROWN_EDGE[i];
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(ax, ay, 1.07),
      new THREE.Vector3(bx, by, 1.07),
    ));
  }
  const glowGeometry = new THREE.TubeGeometry(path, 180, 0.042, 5, false);
  const edgeGeometry = new THREE.TubeGeometry(path, 180, 0.013, 5, false);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: "#3fd8d0", transparent: true, opacity: 0.20,
    depthTest: false, depthWrite: false, toneMapped: false,
    blending: THREE.AdditiveBlending,
  });
  const edgeMaterial = new THREE.MeshBasicMaterial({
    color: "#7afff5", transparent: true, opacity: 0.94,
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
  glow.renderOrder = 0;
  edge.renderOrder = 1;
  return {
    glow, edge, glowMaterial, edgeMaterial,
    dispose: () => {
      glowGeometry.dispose();
      edgeGeometry.dispose();
      glowMaterial.dispose();
      edgeMaterial.dispose();
    },
  };
}


// FX_CROWN_RESTORE_V3: contorno 3D independiente, pintado debajo de las particulas.
function createFxCrownContour() {
  const outline = new THREE.Group();
  const materials: THREE.LineBasicMaterial[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const add = (coordinates: number[], opacity: number, closed: boolean) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(coordinates, 3));
    const material = new THREE.LineBasicMaterial({
      color: '#49e6ee',
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const line = closed ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material);
    line.renderOrder = -1;
    outline.add(line);
    materials.push(material);
    geometries.push(geometry);
  };

  const crest: number[] = [];
  const rim: number[] = [];
  const orbit: number[] = [];
  for (let i = 0; i < 420; i++) {
    const a = (i / 420) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const peak = Math.pow((Math.cos(7 * (a - Math.PI / 2)) + 1) / 2, 5);
    crest.push(1.79 * c, 0.05 + 1.42 * peak, 1.05 * s);
    rim.push(1.79 * c, -1.0, 1.05 * s);
    orbit.push(2.08 * c, -1.2, 1.27 * s);
  }
  add(crest, 0.46, true);
  add(rim, 0.82, true);
  add(orbit, 0.40, true);
  return { outline, materials, geometries, baseOpacity: [0.46, 0.82, 0.40] };
}

type CrownInteraction = {
  hoverX: number;
  hoverY: number;
  targetX: number;
  targetY: number;
  dragX: number;
  dragY: number;
  velocityX: number;
  velocityY: number;
  posX: number;
  posY: number;
  pointerId: number | null;
  lastX: number;
  lastY: number;
};

function advanceInteraction(motion: CrownInteraction) {
  motion.hoverX += (motion.targetX - motion.hoverX) * 0.12;
  motion.hoverY += (motion.targetY - motion.hoverY) * 0.12;
  if (motion.pointerId === null) {
    motion.dragX = (motion.dragX + motion.velocityX) * 0.92;
    motion.dragY = (motion.dragY + motion.velocityY) * 0.92;
    motion.velocityX *= 0.84;
    motion.velocityY *= 0.84;
  }
}

export default function ProtocolCrown({ progress, tl, active, className, interactive = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active ?? true);
  const timeline = tl ?? DEFAULT_TL;
  const interactionRef = useRef<CrownInteraction>({
    hoverX: 0,
    hoverY: 0,
    targetX: 0,
    targetY: 0,
    dragX: 0,
    dragY: 0,
    velocityX: 0,
    velocityY: 0,
    posX: 0,
    posY: 0,
    pointerId: null,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    activeRef.current = active ?? true;
  }, [active]);

  // The actual WebGL crown is beneath the scroll narrative and has no
  // hit-testing of its own. Listen globally, but only react while it is visible.
  useEffect(() => {
    if (interactive) return;
    const motion = interactionRef.current;
    const moveTo = (clientX: number, clientY: number) => {
      if (!activeRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) {
        if (motion.pointerId === null) {
          motion.targetX = 0;
          motion.targetY = 0;
        }
        return;
      }
      motion.targetX = Math.max(-0.4, Math.min(0.4, (0.48 - y) * 0.8));
      motion.targetY = Math.max(-0.7, Math.min(0.7, (x - 0.55) * 1.2));
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!activeRef.current || (event.pointerType === "mouse" && event.button !== 0)) return;
      const target = event.target;
      if (!(target instanceof Element) ||
          !target.closest(".pv") ||
          target.closest('a, button, input, textarea, select, [role="button"]')) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (event.clientX - rect.left) / Math.max(1, rect.width);
      const y = (event.clientY - rect.top) / Math.max(1, rect.height);
      // Drag only near the visible crown, not over text/navigation elsewhere.
      if (Math.abs(x - 0.55) > 0.3 || Math.abs(y - 0.48) > 0.35) return;
      if (event.cancelable && event.pointerType === "mouse")
        event.preventDefault();
      motion.pointerId = event.pointerId;
      motion.velocityX = 0;
      motion.velocityY = 0;
      motion.lastX = event.clientX;
      motion.lastY = event.clientY;
    };
    const onPointerMove = (event: PointerEvent) => {
      moveTo(event.clientX, event.clientY);
      if (motion.pointerId !== event.pointerId) return;
      motion.velocityY = Math.max(-0.24, Math.min(0.24, (event.clientX - motion.lastX) * 0.017));
      motion.velocityX = Math.max(-0.16, Math.min(0.16, (event.clientY - motion.lastY) * 0.011));
      motion.dragY = THREE.MathUtils.clamp(motion.dragY + motion.velocityY, -1.35, 1.35);
      motion.dragX = THREE.MathUtils.clamp(motion.dragX + motion.velocityX, -0.65, 0.65);
      motion.lastX = event.clientX;
      motion.lastY = event.clientY;
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (motion.pointerId === event.pointerId) motion.pointerId = null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches.item(0);
      if (touch) moveTo(touch.clientX, touch.clientY);
    };
    const onPointerLeave = () => {
      if (motion.pointerId === null) {
        motion.targetX = 0;
        motion.targetY = 0;
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      window.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [interactive]);


  // Pointer capture is scoped to the dedicated crown stage only. No global drag or image ghost.
  const grab = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive || !activeRef.current || (event.pointerType === "mouse" && event.button !== 0)) return;
    const motion = interactionRef.current;
    motion.pointerId = event.pointerId;
    motion.lastX = event.clientX;
    motion.lastY = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.grabbing = "true";
    event.preventDefault();
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive || !activeRef.current) return;
    const motion = interactionRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width < 2 || rect.height < 2) return;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    motion.targetX = THREE.MathUtils.clamp((0.48 - y) * 0.8, -0.35, 0.35);
    motion.targetY = THREE.MathUtils.clamp((x - 0.55) * 1.05, -0.55, 0.55);
    if (motion.pointerId !== event.pointerId) return;
    const dx = event.clientX - motion.lastX;
    const dy = event.clientY - motion.lastY;
    const worldPerPixel = 5.4 / rect.height;
    motion.posX = THREE.MathUtils.clamp(motion.posX + dx * worldPerPixel, -2.2, 2.2);
    motion.posY = THREE.MathUtils.clamp(motion.posY - dy * worldPerPixel, -1.4, 1.4);
    motion.dragY = THREE.MathUtils.clamp(motion.dragY + dx * 0.009, -2.1, 2.1);
    motion.dragX = THREE.MathUtils.clamp(motion.dragX + dy * 0.006, -0.75, 0.75);
    motion.lastX = event.clientX;
    motion.lastY = event.clientY;
  };
  const release = (event: ReactPointerEvent<HTMLDivElement>) => {
    const motion = interactionRef.current;
    if (motion.pointerId !== event.pointerId) return;
    motion.pointerId = null;
    delete event.currentTarget.dataset.grabbing;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const leave = () => {
    if (interactionRef.current.pointerId === null) {
      interactionRef.current.targetX = 0;
      interactionRef.current.targetY = 0;
    }
  };
  const keys = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const motion = interactionRef.current;
    const amount = 0.18;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      const horizontal = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
      const vertical = event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0;
      if (event.shiftKey) {
        motion.dragY += horizontal * 0.2;
        motion.dragX -= vertical * 0.14;
      } else {
        motion.posX = THREE.MathUtils.clamp(motion.posX + horizontal * amount, -2.2, 2.2);
        motion.posY = THREE.MathUtils.clamp(motion.posY + vertical * amount, -1.4, 1.4);
      }
    }
    if (event.key === "Escape") { motion.posX = 0; motion.posY = 0; motion.dragX = 0; motion.dragY = 0; }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const fallbackCanvas = fallbackRef.current;
    if (!canvas || !fallbackCanvas) return;
    const fallbackContext = fallbackCanvas.getContext("2d", { alpha: true });
    if (!fallbackContext) return;

    // Draw the canvas 2D only when WebGL is unavailable; never overlay both particle layers.
    // This prevents an entirely blank Protocol background on GPU-limited devices.
    const fallbackData = crownGeometry(window.innerWidth < 700 ? 1200 : 2600);
    const fOriginal = fallbackData.original;
    const fScatter = fallbackData.scatter;
    const fColors = fallbackData.geometry.getAttribute("color").array as Float32Array;
    const fallbackPalette = ["#0b7775", "#149d98", "#22bdb8", "#39d3d0", "#3fd8d0", "#55e0d9"];
    let fallbackW = 1, fallbackH = 1;
    let useFallback = false;
    let lastFallbackFrame = -1000;
    const resizeFallback = () => {
      const rect = fallbackCanvas.getBoundingClientRect();
      fallbackW = Math.max(1, rect.width);
      fallbackH = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      fallbackCanvas.width = Math.round(fallbackW * dpr);
      fallbackCanvas.height = Math.round(fallbackH * dpr);
      fallbackContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const renderFallback = (ms: number) => {
      fallbackContext.clearRect(0, 0, fallbackW, fallbackH);
      const p = clamp(typeof progress === "number" ? progress : progress.get());
      const broken = ease((p - timeline.breakStart) / Math.max(0.0001, 1 - timeline.breakStart));
      const opacity = 1 - range(p, timeline.fade);
      if (opacity <= 0) return;
      const scale = Math.min(fallbackW * (fallbackW < 700 ? 0.29 : 0.22), fallbackH * 0.34);
      const motion = interactionRef.current;
      const cx = fallbackW * (fallbackW < 700 ? 0.51 : 0.56) + motion.posX * scale;
      const cy = fallbackH * 0.48 + (range(p, timeline.rise) - range(p, timeline.descend)) * scale * 0.25 - motion.posY * scale;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      advanceInteraction(motion);
      const turn = -0.20 + (reduced ? 0 : Math.sin(ms * 0.00055) * 0.10) + p * 0.30 + motion.hoverY + motion.dragY;
      const cos = Math.cos(turn), sin = Math.sin(turn);
      const free = broken * broken;
      fallbackContext.save();
      // Pintar el mismo borde antes que los puntos (modo sin WebGL).
      fallbackContext.beginPath();
      for (let j = 0; j < CROWN_EDGE.length; j++) {
        const [x, y] = CROWN_EDGE[j];
        const z = 1.07;
        const rx = x * cos - z * sin;
        const rz = x * sin + z * cos;
        const perspective = 5.8 / (5.8 - rz * 0.28);
        const px = cx + rx * scale * perspective;
        const py = cy - y * scale * perspective;
        if (j === 0) fallbackContext.moveTo(px, py);
        else fallbackContext.lineTo(px, py);
      }
      fallbackContext.strokeStyle = "#3fd8d0";
      fallbackContext.lineWidth = 2;
      fallbackContext.globalAlpha = opacity * (1 - broken);
      fallbackContext.shadowColor = "#39d3d0";
      fallbackContext.shadowBlur = 8;
      fallbackContext.stroke();
      fallbackContext.shadowBlur = 0;
      fallbackContext.globalCompositeOperation = "lighter";
      // Single 2D outline; ground-ring remains under the particles.
      fallbackContext.globalAlpha = opacity * 0.35;
      fallbackContext.strokeStyle = "#2db9bf";
      fallbackContext.beginPath();
      fallbackContext.ellipse(cx, cy + scale, scale * 1.95, scale * 0.2, 0, 0, Math.PI * 2);
      fallbackContext.stroke();

      for (let i = 0; i < fOriginal.length; i += 3) {
        const x = fOriginal[i] + fScatter[i] * free;
        const y = Math.max(-2.38 + ((i / 3) % 7) * 0.015, fOriginal[i + 1] + fScatter[i + 1] * free * 0.18 - 3.9 * free);
        const z = fOriginal[i + 2] + fScatter[i + 2] * free;
        const rx = x * cos - z * sin;
        const rz = x * sin + z * cos;
        const perspective = 5.8 / (5.8 - rz * 0.28);
        const px = cx + rx * scale * perspective;
        const py = cy - y * scale * perspective;
        if (px < -2 || px > fallbackW + 2 || py < -2 || py > fallbackH + 2) continue;
        const intensity = (fColors[i] + fColors[i + 1] + fColors[i + 2]) / 3;
        const shade = intensity > 0.73 ? 5 : intensity > 0.44 ? 4 : intensity > 0.27 ? 3 : intensity > 0.17 ? 2 : intensity > 0.11 ? 1 : 0;
        fallbackContext.globalAlpha = opacity * (shade >= 4 ? 0.88 : 0.58);
        fallbackContext.fillStyle = fallbackPalette[shade];
        const size = (shade >= 4 ? 1.5 : 1.0) * perspective;
        fallbackContext.fillRect(px, py, size, size);
      }
      fallbackContext.restore();
    };
    resizeFallback();
    const fallbackObserver = new ResizeObserver(resizeFallback);
    fallbackObserver.observe(fallbackCanvas);
    let fallbackFrame = 0;
    const fallbackLoop = (ms: number) => {
      fallbackFrame = requestAnimationFrame(fallbackLoop);
      if (useFallback && activeRef.current && !document.hidden && ms - lastFallbackFrame > 40) {
        lastFallbackFrame = ms;
        renderFallback(ms);
      }
    };
    fallbackFrame = requestAnimationFrame(fallbackLoop);
    const showFallback = () => {
      useFallback = true;
      fallbackCanvas.style.display = "block";
      fallbackCanvas.style.opacity = "1";
      canvas.style.display = "none";
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      showFallback();
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas, alpha: true, antialias: false, powerPreference: "high-performance",
      });
    } catch {
      showFallback();
      return () => {
        cancelAnimationFrame(fallbackFrame);
        fallbackObserver.disconnect();
        fallbackData.geometry.dispose();
        canvas.removeEventListener("webglcontextlost", onContextLost);
      };
    }
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
    camera.position.set(0, 0.25, 7.7);
    camera.lookAt(0, -0.05, 0);

    const group = new THREE.Group();
    scene.add(group);
    const fxContour = createFxCrownContour();
    group.add(fxContour.outline);
    const crownOutline = makePaintedCrownOutline();
    group.add(crownOutline.glow, crownOutline.edge);
    const isMobile = window.matchMedia("(max-width: 700px)").matches;
    const data = crownGeometry(isMobile ? 1200 : 2600);
    const material = new THREE.PointsMaterial({
      size: isMobile ? 0.022 : 0.017,
      vertexColors: true,
      transparent: true,
      opacity: 0.91,
      depthWrite: false,
      depthTest: true,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(data.geometry, material);
    points.renderOrder = 3;
    points.frustumCulled = false;
    group.add(points);

    // Separate, larger and dimmer grains create a soft cyan halo.
    const haloMaterial = new THREE.PointsMaterial({
      size: isMobile ? 0.055 : 0.047,
      vertexColors: true,
      transparent: true,
      opacity: 0.035,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Points(data.geometry, haloMaterial);
    halo.renderOrder = 2;
    halo.frustumCulled = false;
    group.add(halo);

    let w = 1, h = 1, frame = 0;
    let visible = !document.hidden;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      camera.aspect = w / h;
      camera.position.z = w < 700 ? 10.8 : 7.7;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5));
      renderer.setSize(w, h, false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const onVisibility = () => { visible = !document.hidden; };
    document.addEventListener("visibilitychange", onVisibility);

    const render = (ms: number) => {
      frame = requestAnimationFrame(render);
      if (!visible || !activeRef.current || useFallback) return;
      const p = clamp(typeof progress === "number" ? progress : progress.get());
      const broken = ease((p - timeline.breakStart) / Math.max(0.0001, 1 - timeline.breakStart));
      const descend = range(p, timeline.descend);
      const rise = range(p, timeline.rise);
      const opacity = 1 - range(p, timeline.fade);
      const time = ms * 0.001;
      const v = data.geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = v.array as Float32Array;
      const original = data.original;
      const scatter = data.scatter;

      // Purely independent motion: no spring, wobble or jelly interpolation.
      for (let i = 0; i < arr.length; i += 3) {
        const j = i / 3;
        const free = broken * broken;
        arr[i] = original[i] + scatter[i] * free;
        arr[i + 1] = Math.max(-2.38 + (j % 7) * 0.015,
          original[i + 1] + scatter[i + 1] * free * 0.18 - 3.9 * free);
        arr[i + 2] = original[i + 2] + scatter[i + 2] * free;
        if (!reduced && broken < 0.001) {
          arr[i + 1] += Math.sin(time * 0.55 + data.phase[j]) * 0.002;
        }
      }
      v.needsUpdate = true;
      // The previous 0.12-radian sway took ~45 seconds and looked static.
      // A continuous 20-second turn plus independent pointer tilt is visible.
      const motion = interactionRef.current;
      advanceInteraction(motion);
      group.rotation.y = -0.18 + (reduced ? 0 : Math.sin(time * 0.55) * 0.10) + p * 0.3 + motion.hoverY + motion.dragY;
      group.rotation.x = -0.055 + motion.hoverX + motion.dragX;
      group.rotation.z = -0.07;
      group.position.set((w < 700 ? 0 : 0.55) + motion.posX,
        (rise - descend) * 1.0 + motion.posY, 0);
      material.opacity = 0.92 * opacity;
      haloMaterial.opacity = 0.075 * opacity * (1 - broken);
      fxContour.materials.forEach((material, index) => {
        material.opacity = fxContour.baseOpacity[index] * opacity * (1 - broken * 0.9);
      });
      crownOutline.edgeMaterial.opacity = 0.94 * opacity * (1 - broken);
      crownOutline.glowMaterial.opacity = 0.20 * opacity * (1 - broken);
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
      cancelAnimationFrame(fallbackFrame);
      fallbackObserver.disconnect();
      fallbackData.geometry.dispose();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      data.geometry.dispose();
      material.dispose();
      haloMaterial.dispose();
      fxContour.geometries.forEach((geometry) => geometry.dispose());
      fxContour.materials.forEach((material) => material.dispose());
      crownOutline.dispose();
      renderer.dispose();
    };
  }, [progress, timeline]);

  return (
    <div className="pv-crown-layer" aria-hidden={interactive ? undefined : true} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <canvas ref={fallbackRef} className={className ?? "pv-crown"} style={{display: "none", opacity: 1, position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <canvas ref={canvasRef} className={className ?? "pv-crown"} style={{position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {interactive && <div className="fx-crown-playground-hit" role="button" tabIndex={0} aria-label="Drag to move and rotate the interactive crown. Arrow keys move, Shift and arrows rotate, Escape resets position." onPointerDown={grab} onPointerMove={move} onPointerUp={release} onPointerCancel={release} onPointerLeave={leave} onDragStart={(event) => event.preventDefault()} onKeyDown={keys} />}
    </div>
  );
}
