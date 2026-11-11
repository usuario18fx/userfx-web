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
  const palette = ["#09508b", "#087bb9", "#00a7e8", "#35caff", "#a0ecff", "#d6f8ff"];
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
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas, alpha: true, antialias: false, powerPreference: "high-performance",
      });
    } catch {
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
    camera.position.set(0, 0.25, 7.7);
    camera.lookAt(0, -0.05, 0);

    const group = new THREE.Group();
    scene.add(group);
    const isMobile = window.matchMedia("(max-width: 700px)").matches;
    const data = crownGeometry(isMobile ? 12000 : 30000);
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
    points.frustumCulled = false;
    group.add(points);

    // Separate, larger and dimmer grains create a soft cyan halo.
    const haloMaterial = new THREE.PointsMaterial({
      size: isMobile ? 0.055 : 0.047,
      vertexColors: true,
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Points(data.geometry, haloMaterial);
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
      renderer.setSize(w, h, false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const onVisibility = () => { visible = !document.hidden; };
    document.addEventListener("visibilitychange", onVisibility);

    const render = (ms: number) => {
      frame = requestAnimationFrame(render);
      if (!visible || !activeRef.current) return;
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
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
      data.geometry.dispose();
      material.dispose();
      haloMaterial.dispose();
      renderer.dispose();
    };
  }, [progress, timeline]);

  return <canvas ref={canvasRef} className={className ?? "pv-crown"} aria-hidden="true" />;
}
