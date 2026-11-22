"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type Props = {
  /** Ruta del .glb dentro de /public, por ejemplo "/assets/rosaIcon.glb" */
  src: string;
  className?: string;
  /** Se aplica al contenedor (width, opacity, margin, filter, etc.). */
  style?: CSSProperties;
  /** Proporción del lienzo. Un <img> con height:auto la toma de la imagen; aquí hay que indicarla. */
  aspectRatio?: string;
  /** Balanceo suave en Y. Se desactiva solo si el sistema pide menos movimiento. */
  sway?: boolean;
  /** Amplitud del balanceo en radianes. */
  swayAmount?: number;
  /** Si es true no se renderiza (útil cuando el icono ya está invisible por opacity/visibility). */
  paused?: boolean;
  /** Allow visitors to rotate the real 3D model using mouse, touch or keyboard. */
  interactive?: boolean;
};

export default function FxGlbIcon({
  src,
  className,
  style,
  aspectRatio = "1 / 1",
  sway = true,
  swayAmount = 0.45,
  paused = false,
  interactive = false,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const spinRef = useRef({
    pointerId: null as number | null,
    lastX: 0,
    lastY: 0,
    yaw: 0,
    pitch: 0,
    velocityYaw: 0,
    velocityPitch: 0,
  });

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive || (event.pointerType === "mouse" && event.button !== 0)) return;
    const spin = spinRef.current;
    if (spin.pointerId !== null) return;
    spin.pointerId = event.pointerId;
    spin.lastX = event.clientX;
    spin.lastY = event.clientY;
    spin.velocityYaw = 0;
    spin.velocityPitch = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const spin = spinRef.current;
    if (!interactive || spin.pointerId !== event.pointerId) return;
    const dx = event.clientX - spin.lastX;
    const dy = event.clientY - spin.lastY;
    spin.lastX = event.clientX;
    spin.lastY = event.clientY;
    spin.yaw += dx * 0.014;
    spin.pitch = THREE.MathUtils.clamp(spin.pitch + dy * 0.008, -0.72, 0.72);
    spin.velocityYaw = dx * 0.010;
    spin.velocityPitch = dy * 0.004;
    event.preventDefault();
    event.stopPropagation();
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const spin = spinRef.current;
    if (spin.pointerId !== event.pointerId) return;
    spin.pointerId = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    event.stopPropagation();
  };

  const handleKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const spin = spinRef.current;
    switch (event.key) {
      case "ArrowLeft": spin.yaw -= 0.25; break;
      case "ArrowRight": spin.yaw += 0.25; break;
      case "ArrowUp": spin.pitch = THREE.MathUtils.clamp(spin.pitch - 0.20, -0.72, 0.72); break;
      case "ArrowDown": spin.pitch = THREE.MathUtils.clamp(spin.pitch + 0.20, -0.72, 0.72); break;
      case "Home": spin.yaw = 0; spin.pitch = 0; break;
      default: return;
    }
    spin.velocityYaw = 0;
    spin.velocityPitch = 0;
    event.preventDefault();
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let raf = 0;
    let visible = true;
    let model: THREE.Group | null = null;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    mount.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight("#ffffff", 2.2));
    const key = new THREE.DirectionalLight("#ffffff", 3);
    key.position.set(3, 5, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight("#9ac8ff", 1.2);
    fill.position.set(-4, 2, 3);
    scene.add(fill);

    const FOV = 35;
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
    // El modelo se normaliza a ~2 unidades; la cámara lo encuadra con un pequeño margen.
    camera.position.set(0, 0, (1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2))) * 1.25);
    camera.lookAt(0, 0, 0);

    const resize = () => {
      const w = mount.clientWidth || 200;
      const h = mount.clientHeight || 200;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    // Pausa el render cuando el icono no está en pantalla.
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(mount);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    new GLTFLoader().load(
      src,
      (gltf) => {
        if (disposed) return;
        const object = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(object);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        object.position.sub(center);
        const pivot = new THREE.Group();
        pivot.add(object);
        pivot.scale.setScalar(2 / Math.max(size.x, size.y, size.z, 0.001));
        scene.add(pivot);
        model = pivot;
      },
      undefined,
      (err) => console.warn(`[FxGlbIcon] No se pudo cargar ${src}`, err),
    );

    const start = performance.now();
    let lastFrame = start;
    const tick = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.06, Math.max(0, (now - lastFrame) / 1000));
      lastFrame = now;
      if (model && visible && !pausedRef.current) {
        const elapsed = (now - start) / 1000;
        if (interactive) {
          const spin = spinRef.current;
          if (spin.pointerId === null) {
            // Preserve drag interaction, then smoothly return the crown to its frontal pose.
            spin.yaw = THREE.MathUtils.damp(Math.atan2(Math.sin(spin.yaw + spin.velocityYaw), Math.cos(spin.yaw + spin.velocityYaw)), 0, 3.2, dt);
            spin.pitch = THREE.MathUtils.damp(THREE.MathUtils.clamp(spin.pitch + spin.velocityPitch, -0.72, 0.72), 0, 3.2, dt);
            spin.velocityYaw *= Math.exp(-10 * dt);
            spin.velocityPitch *= Math.exp(-10 * dt);
          }
          // Keep the GLB intact; rotate its pivot, not an overlaid image.
          const gentleSway = sway && !reduceMotion ? Math.sin(elapsed * 0.9) * Math.min(swayAmount, 0.14) : 0;
          model.rotation.y = spin.yaw + gentleSway;
          model.rotation.x = spin.pitch;
        } else if (sway && !reduceMotion) {
          model.rotation.y = Math.sin(elapsed * 0.9) * swayAmount;
        }
        renderer.render(scene, camera);
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [src, sway, swayAmount, interactive]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{
        aspectRatio,
        ...style,
        ...(interactive ? { pointerEvents: "auto" as const, touchAction: "none" as const, cursor: "grab" } : {}),
      }}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-hidden={interactive ? undefined : true}
      aria-label={interactive ? "Rotate the USER FX crown by dragging or using arrow keys" : undefined}
      onPointerDown={interactive ? handlePointerDown : undefined}
      onPointerMove={interactive ? handlePointerMove : undefined}
      onPointerUp={interactive ? finishPointer : undefined}
      onPointerCancel={interactive ? finishPointer : undefined}
      onLostPointerCapture={interactive ? finishPointer : undefined}
      onKeyDown={interactive ? handleKeyboard : undefined}
    />
  );
}