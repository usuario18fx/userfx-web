"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
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
  // Silueta frontal clara incluso cuando quedan pocas particulas.
  const front = [
    [-1.75, -0.96, 1.07], [-1.65, 0.30, 1.07],
    [-1.13, -0.12, 1.07], [-0.65, 1.08, 1.07],
    [-0.02, 0.23, 1.07], [0.42, 1.47, 1.07],
    [0.91, 0.20, 1.07], [1.44, 0.86, 1.07],
    [1.75, -0.96, 1.07],
  ].flat();
  add(crest, 0.46, true);
  add(rim, 0.82, true);
  add(front, 0.98, false);
  add(orbit, 0.40, true);
  return { outline, materials, geometries, baseOpacity: [0.46, 0.82, 0.98, 0.40] };
}

export default function ProtocolCrown({ progress, tl, active, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active ?? true);
  const timeline = tl ?? DEFAULT_TL;

  useEffect(() => {
    activeRef.current = active ?? true;
  }, [active]);

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
      const cx = fallbackW * (fallbackW < 700 ? 0.51 : 0.56);
      const cy = fallbackH * 0.48 + (range(p, timeline.rise) - range(p, timeline.descend)) * scale * 0.25;
      const turn = -0.20 + Math.sin(ms * 0.00012) * 0.11 + p * 0.30;
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
      // Borde 2D si WebGL no esta disponible.
      fallbackContext.globalAlpha = opacity * 0.94;
      fallbackContext.strokeStyle = '#49e6ee';
      fallbackContext.lineWidth = 2;
      fallbackContext.beginPath();
      const frontal = [
        [-1.75,-0.96],[-1.65,0.30],[-1.13,-0.12],[-0.65,1.08],
        [-0.02,0.23],[0.42,1.47],[0.91,0.20],[1.44,0.86],[1.75,-0.96]
      ];
      frontal.forEach(([x,y], index) => {
        if (index === 0) fallbackContext.moveTo(cx + x * scale, cy - y * scale);
        else fallbackContext.lineTo(cx + x * scale, cy - y * scale);
      });
      fallbackContext.stroke();
      fallbackContext.beginPath();
      fallbackContext.ellipse(cx, cy + scale, scale * 1.95, scale * 0.2, 0, 0, Math.PI * 2);
      fallbackContext.stroke();

      for (let i = 0; i < fOriginal.length; i += 3) {
        const x = fOriginal[i] + fScatter[i] * free;
        const y = fOriginal[i + 1] + fScatter[i + 1] * free * 0.35 - 5.5 * free * free;
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
        arr[i + 1] = original[i + 1] +
          scatter[i + 1] * free * 0.35 -
          5.5 * free * free;
        arr[i + 2] = original[i + 2] + scatter[i + 2] * free;
        if (!reduced && broken < 0.001) {
          arr[i + 1] += Math.sin(time * 0.55 + data.phase[j]) * 0.002;
        }
      }
      v.needsUpdate = true;
      group.rotation.y = -0.18 + (reduced ? 0 : Math.sin(time * 0.14) * 0.12) + p * 0.3;
      group.rotation.x = -0.055;
      group.rotation.z = -0.07;
      group.position.set(w < 700 ? 0 : 0.55,
        (rise - descend) * 1.0, 0);
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
    <div className="pv-crown-layer" aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <canvas ref={fallbackRef} className={className ?? "pv-crown"} style={{display: "none", opacity: 1, position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <canvas ref={canvasRef} className={className ?? "pv-crown"} style={{position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
}
