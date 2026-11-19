"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
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
};

export default function FxGlbIcon({
  src,
  className,
  style,
  aspectRatio = "1 / 1",
  sway = true,
  swayAmount = 0.45,
  paused = false,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

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
    const tick = (now: number) => {
      if (disposed) return;
      if (model && visible && !pausedRef.current) {
        if (sway && !reduceMotion) {
          model.rotation.y = Math.sin(((now - start) / 1000) * 0.9) * swayAmount;
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
  }, [src, sway, swayAmount]);

  return (
    <div ref={mountRef} className={className} style={{ aspectRatio, ...style }} aria-hidden="true" />
  );
}