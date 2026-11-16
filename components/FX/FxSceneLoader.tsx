"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type Props = {
  onComplete: () => void;
  sceneReady: boolean;
};

const INTRO_DURATION_MS = 4200;
const RETREAT_DURATION_MS = 950;

export default function FxSceneLoader({ onComplete, sceneReady }: Props) {
  const [percent, setPercent] = useState(1);
  const [leaving, setLeaving] = useState(false);
  const [modelReady, setModelReady] = useState(false);
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

  // Render the real GLB typography on the loading screen. The same model is fixed to the
  // floor at the back of the corridor, so the transition reads as one continuous object.
  useEffect(() => {
    const mount = stageRef.current;
    if (!mount) return;
    let disposed = false;
    let raf = 0;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

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
      camera.position.set(0, .88, Math.max(7.6, fitZ * 1.15));
      camera.lookAt(0, .88, 0);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    let statue: THREE.Group | null = null;
    new GLTFLoader().load(
      "/assets/welcome-statue.glb",
      (gltf) => {
        if (disposed) return;
        statue = gltf.scene;
        scene.add(statue);
        setModelReady(true);
      },
      undefined,
      () => {},
    );
    const start = performance.now();
    const tick = (now: number) => {
      if (disposed) return;
      if (statue) {
        const t = Math.min(1, (now - start) / INTRO_DURATION_MS);
        const zoom = 1 + 0.30 * Math.sin(Math.min(1, t * 1.6) * Math.PI);
        statue.scale.setScalar(zoom);
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
        <h1 className="fx-scene-loader-brand" aria-label="USER FX">
          <span className="fx-scene-loader-brand-user">
            USER
          </span>
          <span className="fx-scene-loader-brand-fx">
            FX
          </span>
        </h1>
        <div ref={stageRef} className="fx-scene-loader-3d" aria-hidden="true">
          {!modelReady && (
            <span className="fx-scene-loader-3d-fallback">
              WELCOME
            </span>
          )}
        </div>
        <div className="fx-scene-loader-subtitle">
          <span>
            PRIVATE WORLD
          </span>
        </div>
        <div className="fx-scene-loader-progress-row">
          <div className="fx-scene-loader-progress" role="progressbar" aria-label="USER FX opening sequence" aria-valuemin={1} aria-valuemax={100} aria-valuenow={percent}>
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
