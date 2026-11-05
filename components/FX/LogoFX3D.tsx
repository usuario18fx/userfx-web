"use client";

import { useEffect, useRef, useState } from "react";
import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Group,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type Props = {
  fallback: string;
  className?: string;
};

// GLB files are served from the Next.js public directory.
const MODEL_URL = "/logoFX.glb";
const WIDTH = 52;
const HEIGHT = 36;

export default function LogoFX3D({ fallback, className = "" }: Props) {
  const host = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const target = host.current;
    if (!target) return;

    let disposed = false;
    let frame = 0;
    let renderer: WebGLRenderer | undefined;
    let scene: Scene | undefined;
    let model: Group | undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(WIDTH, HEIGHT);
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.setAttribute("aria-hidden", "true");
      renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
      target.appendChild(renderer.domElement);
    } catch {
      // Keep the existing PNG if WebGL is unavailable.
      return;
    }

    const webgl = renderer;
    scene = new Scene();
    const world = scene;
    const camera = new PerspectiveCamera(42, WIDTH / HEIGHT, 0.01, 100);
    camera.position.set(0, 0, 3.3);
    camera.lookAt(0, 0, 0);
    world.add(new AmbientLight(0xffffff, 2.2));
    const light = new DirectionalLight(0xffffff, 2.5);
    light.position.set(2, 3, 5);
    world.add(light);

    new GLTFLoader().load(
      MODEL_URL,
      ({ scene: root }) => {
        if (disposed) return;
        const box = new Box3().setFromObject(root);
        if (box.isEmpty()) return;
        const center = box.getCenter(new Vector3());
        const size = box.getSize(new Vector3());
        root.position.sub(center);

        model = new Group();
        model.add(root);
        model.scale.setScalar(1.8 / Math.max(size.x / 1.4, size.y, size.z, 0.01));
        world.add(model);
        setReady(true);

        const draw = (timestamp: number) => {
          if (disposed) return;
          if (model && !reducedMotion) model.rotation.y = Math.sin(timestamp * 0.0006) * 0.18;
          webgl.render(world, camera);
          if (!reducedMotion) frame = requestAnimationFrame(draw);
        };
        frame = requestAnimationFrame(draw);
      },
      undefined,
      () => {
        // Missing /public/logoFX.glb in this environment: preserve the old logo.
        if (!disposed) {
          webgl.domElement.remove();
          webgl.dispose();
        }
      },
    );

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      webgl.domElement.remove();
      webgl.dispose();
      world.clear();
    };
  }, []);

  return (
    <span
      ref={host}
      className={className}
      style={{ position: "relative", display: "inline-block", width: WIDTH, height: HEIGHT, flexShrink: 0 }}
      aria-hidden="true"
    >
      <img
        src={fallback}
        alt=""
        width={WIDTH}
        height={HEIGHT}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          opacity: ready ? 0 : 1,
          transition: "opacity .25s",
          pointerEvents: "none",
        }}
      />
    </span>
  );
}
