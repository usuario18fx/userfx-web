"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type Props = {
  onComplete: () => void;
  sceneReady: boolean;
};

const INTRO_DURATION_MS = 4200;
const RETREAT_DURATION_MS = 4100;

export default function FxSceneLoader({ onComplete, sceneReady }: Props) {
  const [percent, setPercent] = useState(1);
  const [leaving, setLeaving] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  // The percentage reaches 100 only once. We wait for the 3D corridor before retiring the loader.
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = Math.min(1, (now - start) / INTRO_DURATION_MS);
      setPercent(Math.min(100, Math.max(1, Math.round(1 + elapsed * 99))));
      if (elapsed < 1) raf = window.requestAnimationFrame(animate);
    };
    raf = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (percent < 100 || !sceneReady) return;
    setLeaving(true);
    const timer = window.setTimeout(() => completeRef.current(), RETREAT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [percent, sceneReady]);

  // The existing USER FX logo GLB is the hero in both the loader and the corridor.
  useEffect(() => {
    const mount = stageRef.current;
    if (!mount) return;
    let disposed = false;
    let raf = 0;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // setSize(..., false) no toca el CSS del canvas: lo forzamos a ocupar el stage
    // para que no se desborde (con pixelRatio 1.5 se veía 1.5x más grande y corrido).
    const canvas = renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    mount.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight("#d6edff", 2.3));
    const key = new THREE.DirectionalLight("#ffffff", 3);
    key.position.set(3, 5, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#168dff", 2.2);
    rim.position.set(-4, 2, -4);
    scene.add(rim);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
    const resize = () => {
      const w = mount.clientWidth || 600;
      const h = mount.clientHeight || 230;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const fitZ = 9 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
      camera.position.set(0, 0.88, Math.max(7.6, fitZ * 1.15));
      camera.lookAt(0, 0.88, 0);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let statue: THREE.Group | null = null;
    // Momento en que el logo aparece: el pulso de zoom cuenta desde aquí.
    let shownAt = 0;

    const loadAccent = (path: string, x: number, y: number, z: number, maxSize: number) => {
      new GLTFLoader().load(
        path,
        (gltf) => {
          if (disposed) return;
          const accent = gltf.scene;
          const bounds = new THREE.Box3().setFromObject(accent);
          const size = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());
          accent.position.sub(center);
          const scale = maxSize / Math.max(size.x, size.y, size.z, 0.001);
          const pivot = new THREE.Group();
          pivot.add(accent);
          pivot.scale.setScalar(scale);
          pivot.position.set(x, y, z);
          scene.add(pivot);
        },
        undefined,
        (err) => console.warn(`[FxSceneLoader] No se pudo cargar ${path}`, err),
      );
    };

    new GLTFLoader().load(
      "/logoFX.glb",
      (gltf) => {
        if (disposed) return;
        statue = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(statue);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        statue.position.sub(center);
        const fit = Math.min(
          7.1 / Math.max(size.x, 0.001),
          2.7 / Math.max(size.y, 0.001),
          2 / Math.max(size.z, 0.001),
        );
        const hero = new THREE.Group();
        hero.add(statue);
        hero.scale.setScalar(fit);
        hero.userData.baseScale = fit;
        statue = hero;
        scene.add(hero);
        shownAt = performance.now();
      },
      undefined,
      (err) => console.warn("[FxSceneLoader] No se pudo cargar /logoFX.glb", err),
    );

    const tick = (now: number) => {
      if (disposed) return;
      if (statue) {
        const t = Math.min(1, (now - shownAt) / INTRO_DURATION_MS);
        const zoom = 1 + 0.3 * Math.sin(Math.min(1, t * 1.6) * Math.PI);
        statue.scale.setScalar((statue.userData.baseScale as number) * zoom);
        renderer.render(scene, camera);
    }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className={"fx-scene-loader" + (leaving ? " is-leaving" : "")} role="status" aria-label="USER FX loading screen">
      <div className="fx-scene-loader-content">
        <div ref={stageRef} className="fx-scene-loader-stage" style={{ position: "relative", width: "100%", height: 230, overflow: "hidden" }} aria-hidden="true" />
        <div className="fx-scene-loader-subtitle">
          <span>
PRIVATE WORLD
</span>
        </div>
        <div className="fx-scene-loader-progress-row">
          <div className="fx-scene-loader-progress" role="progressbar" aria-label="USER FX opening sequence" aria-valuemin={1} aria-valuemax={100} aria-valuenow={percent} >
            <span className="fx-scene-loader-progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <output className="fx-scene-loader-percent" aria-live="off">
            {String(percent).padStart(2, "0")}%
          </output>
        </div>
      </div>
    </div>
  );
}