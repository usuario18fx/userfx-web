"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";

type Props = {
  progress: MotionValue<number> | number;
  dissolveAt: number;
};

type Cloud = {
  geometry: THREE.BufferGeometry;
  points: THREE.Points;
  material: THREE.PointsMaterial;
  original: Float32Array;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** Original USER FX point-cloud geometry, embedded with a genuinely transparent canvas. */
export default function ProtocolCrown3D({ progress, dissolveAt }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const abort = new AbortController();
    const scene = new THREE.Scene();
    const crownGroup = new THREE.Group();
    const roseGroup = new THREE.Group();
    scene.add(crownGroup);
    scene.add(roseGroup);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    camera.position.set(0, 0, 4.7);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    el.appendChild(renderer.domElement);

    const clouds: Cloud[] = [];
    let destroyed = false;
    let pending = 0;
    let currentProgress =
      typeof progress === "number" ? clamp(progress) : clamp(progress.get());

    const addCloud = (coordinates: Float32Array, colors: Float32Array, size: number, opacity: number, target: THREE.Group) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(coordinates);
      geometry.setAttribute("position",
        new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const material = new THREE.PointsMaterial({
        size,
        sizeAttenuation: true,
        transparent: true,
        opacity,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      target.add(points);
      clouds.push({ geometry, points, material, original: coordinates });
    };

    const easeScroll = (value: number) => {
      const t = clamp(value);
      return t * t * (3 - 2 * t);
    };

    const draw = () => {
      if (destroyed) return;
      const p = currentProgress;
      const fall = easeScroll((p - dissolveAt) / Math.max(0.06, 1 - dissolveAt));
      const descent = easeScroll((p - 0.70) / 0.25);
      const orbit = easeScroll((p - 0.10) / 0.65);

      // Two independently moving shapes. The crown remains behind every photograph,
      // turns with the scroll, then follows a gentle arc down to the stage floor.
      crownGroup.position.set(
        0.72 - 0.93 * descent + Math.sin(orbit * Math.PI) * 0.16,
        0.20 - descent * 1.18,
        0,
      );
      crownGroup.rotation.y = -0.2 + p * Math.PI * 4.2;
      crownGroup.rotation.x = 0.04 + Math.sin(p * Math.PI * 2) * 0.13;
      crownGroup.rotation.z = -0.08 - descent * 0.28;

      // The rose is a separate particle object, not part of the crown geometry.
      roseGroup.position.set(
        -0.82 + Math.sin(p * Math.PI * 2) * 0.07,
        0.10 + Math.cos(p * Math.PI * 2) * 0.06,
        -0.20,
      );
      roseGroup.rotation.y = p * Math.PI * -2.1;
      roseGroup.rotation.z = p * 0.22;

      for (const cloud of clouds) {
        const position = cloud.geometry.getAttribute("position") as THREE.BufferAttribute;
        const coords = position.array as Float32Array;
        const original = cloud.original;
        for (let i = 0; i < coords.length / 3; i++) {
          const j = i * 3;
          const grain = Math.sin(i * 12.9898 + 8.2);
          const isCrown = cloud.points.parent === crownGroup;
          coords[j] = original[j] + (isCrown ? grain * fall * 0.7 : 0);
          coords[j + 1] = isCrown
            ? Math.max(-1.48 - crownGroup.position.y, original[j + 1] - fall * fall * (2.8 + (i % 23) * 0.045))
            : original[j + 1];
          coords[j + 2] = original[j + 2] + (isCrown ? Math.cos(i * 4.31) * fall * 0.5 : 0);
        }
        position.needsUpdate = true;
        cloud.material.opacity = (cloud.points.userData.baseOpacity as number) * (1 - (cloud.points.parent === crownGroup ? fall * 0.35 : 0));
      }
      renderer.render(scene, camera);
    };

    const requestDraw = (p: number) => {
      currentProgress = clamp(p);
      if (pending || destroyed) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        draw();
      });
    };

    const resize = () => {
      if (destroyed) return;
      const size = Math.max(1, Math.round(el.clientWidth));
      renderer.setSize(size, size, false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
      requestDraw(currentProgress);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    const stop = typeof progress === "number"
      ? undefined
      : progress.on("change", requestDraw);

    const load = async () => {
      const [res, rose] = await Promise.all([
        fetch("/corona/corona.bin", { signal: abort.signal }),
        new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("No se pudo cargar rosa1.png"));
          image.src = "/assets/iconos/rosa1.png";
        }),
      ]);
      if (!res.ok) throw new Error("No se pudo cargar corona.bin");
      const raw = new Float32Array(await res.arrayBuffer());
      if (destroyed || raw.length % 3 || raw.length === 0) return;

      // Reuse real original geometry, sampled for a small 3D overlay.
      const count = Math.min(12500, raw.length / 3);
      const crown = new Float32Array(count * 3);
      const blues = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const source = Math.floor(i * (raw.length / 3) / count) * 3;
        const j = i * 3;
        crown[j] = raw[source] * 0.66;
        crown[j + 1] = raw[source + 1] * 0.66;
        crown[j + 2] = raw[source + 2] * 0.66;
        blues[j] = 0.09;
        blues[j + 1] = 0.64 + (i % 7) * 0.035;
        blues[j + 2] = 1;
      }
      addCloud(crown, blues, 0.015, 0.80, crownGroup);
      clouds[clouds.length - 1].points.userData.baseOpacity = 0.8;

      // Real transparent rose pixels, no flat white disc or backdrop.
      const c = document.createElement("canvas");
      c.width = 220;
      c.height = Math.max(1, Math.round(220 * rose.naturalHeight / rose.naturalWidth));
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(rose, 0, 0, c.width, c.height);
        const pixels = ctx.getImageData(0, 0, c.width, c.height).data;
        const selected: number[] = [];
        for (let y = 0; y < c.height; y += 2) {
          for (let x = 0; x < c.width; x += 2) {
            const index = (y * c.width + x) * 4;
            if (pixels[index + 3] > 125) selected.push(x, y, index);
          }
        }
        const n = Math.min(4200, selected.length / 3);
        const red = new Float32Array(n * 3);
        const colors = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const source = Math.floor(i * (selected.length / 3) / n) * 3;
          const x = selected[source];
          const y = selected[source + 1];
          const k = selected[source + 2];
          const j = i * 3;
          red[j] = (x / c.width - 0.5) * 1.65;
          red[j + 1] = (0.5 - y / c.height) * 1.65 * c.height / c.width - 0.40;
          red[j + 2] = 0.16;
          colors[j] = pixels[k] / 255;
          colors[j + 1] = pixels[k + 1] / 255;
          colors[j + 2] = pixels[k + 2] / 255;
        }
        if (n) {
          addCloud(red, colors, 0.018, 0.9, roseGroup);
          clouds[clouds.length - 1].points.userData.baseOpacity = 0.9;
        }
      }
      requestDraw(currentProgress);
    };

    void load().catch((error: unknown) => {
      if (!abort.signal.aborted) console.error("[USER FX Crown]", error);
    });

    return () => {
      destroyed = true;
      abort.abort();
      stop?.();
      observer.disconnect();
      if (pending) cancelAnimationFrame(pending);
      for (const cloud of clouds) {
        cloud.geometry.dispose();
        cloud.material.dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [progress, dissolveAt]);

  return <div ref={host} className="fx-crown3d-stage" aria-hidden="true" />;
}
