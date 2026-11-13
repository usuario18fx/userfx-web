"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

const SOURCE = "/assets/logo.glb/rosa.glb";
const DESKTOP_PARTICLES = 24000;
const MOBILE_PARTICLES = 11500;

type RoseState = "loading" | "ready" | "error";

type RoseController = {
  explode: () => void;
  restore: () => void;
};

type RoseSurface = {
  mesh: THREE.Mesh;
  sampler: MeshSurfaceSampler;
  weight: number;
  material: THREE.MeshStandardMaterial;
  pixels?: { data: Uint8ClampedArray; width: number; height: number };
};

function texturePixels(texture: THREE.Texture | null | undefined) {
  if (!texture?.image || typeof document === "undefined") return undefined;
  const image = texture.image as CanvasImageSource & { width: number; height: number };
  const width = Math.min(1024, image.width ?? 0);
  const height = Math.min(1024, image.height ?? 0);
  if (!width || !height) return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return undefined;
  try {
    context.drawImage(image, 0, 0, width, height);
    return { data: context.getImageData(0, 0, width, height).data, width, height };
  } catch {
    return undefined;
  }
}

function sampleMaterialColor(surface: RoseSurface, uv: THREE.Vector2, out: THREE.Color) {
  out.copy(surface.material.color);
  if (!surface.pixels || !surface.material.map) return;
  const texUV = uv.clone();
  surface.material.map.updateMatrix();
  surface.material.map.transformUv(texUV);
  const { data, width, height } = surface.pixels;
  const x = THREE.MathUtils.clamp(Math.floor(texUV.x * width), 0, width - 1);
  const y = THREE.MathUtils.clamp(Math.floor(texUV.y * height), 0, height - 1);
  const index = (y * width + x) * 4;
  const texColor = new THREE.Color().setRGB(
    data[index] / 255,
    data[index + 1] / 255,
    data[index + 2] / 255,
    THREE.SRGBColorSpace
  );
  out.multiply(texColor);
}

function makeRoundSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(16, 16, 1, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.42, "rgba(255,255,255,.96)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

/** Samples actual GLB triangle surfaces; does not replace the rose with a flat image. */
export default function RoseGLBParticles() {
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<RoseController | null>(null);
  const [state, setState] = useState<RoseState>("loading");
  const [scattered, setScattered] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let alive = true;
    let raf = 0;
    let active = true;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    camera.position.set(0, 0, 9);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    const roseGroup = new THREE.Group();
    scene.add(roseGroup);
    let cloud: THREE.Points | undefined;
    let sprite: THREE.CanvasTexture | undefined;
    let goal: Float32Array | undefined;
    let velocity: Float32Array | undefined;
    let burst = false;
    let phase = 0;
    const clock = new THREE.Clock();
    const renderSize = () => {
      const { width, height } = mount.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resize = new ResizeObserver(renderSize);
    resize.observe(mount);
    renderSize();
    const observer = new IntersectionObserver((entries) => {
      active = !!entries[0]?.isIntersecting;
      if (active && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); }
    }, { threshold: 0.02 });
    observer.observe(mount);

    function frame() {
      raf = 0;
      if (!alive || !active) return;
      const dt = Math.min(clock.getDelta(), 0.035);
      phase += dt;
      if (cloud && goal && velocity) {
        const attr = cloud.geometry.getAttribute("position") as THREE.BufferAttribute;
        const array = attr.array as Float32Array;
        if (burst) {
          for (let i = 0; i < array.length; i += 3) {
            velocity[i + 1] -= dt * 3.0;
            for (let axis = 0; axis < 3; axis++) array[i + axis] += velocity[i + axis] * dt;
            if (array[i + 1] < -2.45) {
              array[i + 1] = -2.45;
              velocity[i + 1] *= -0.32;
              velocity[i] *= 0.93;
              velocity[i + 2] *= 0.93;
            }
          }
          attr.needsUpdate = true;
        } else {
          let moving = false;
          for (let i = 0; i < array.length; i++) {
            const diff = goal[i] - array[i];
            velocity[i] = (velocity[i] + diff * 15 * dt) * Math.exp(-7 * dt);
            array[i] += velocity[i] * dt;
            if (Math.abs(diff) > 0.0015 || Math.abs(velocity[i]) > 0.002) moving = true;
          }
          if (moving) attr.needsUpdate = true;
        }
      }
      if (!prefersReducedMotion) {
        roseGroup.rotation.y = Math.sin(phase * 0.38) * 0.10;
        roseGroup.rotation.x = Math.sin(phase * 0.22) * 0.028;
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }

    controllerRef.current = {
      explode() {
        if (!cloud || !velocity) return;
        burst = true;
        const array = cloud.geometry.getAttribute("position").array as Float32Array;
        for (let i = 0; i < array.length; i += 3) {
          const x = array[i], y = array[i + 1], z = array[i + 2];
          const length = Math.max(0.3, Math.hypot(x, y, z));
          const strength = 1.6 + Math.random() * 2.4;
          velocity[i] = (x / length) * strength + (Math.random() - 0.5) * 1.6;
          velocity[i + 1] = (y / length) * strength + 1.4 + Math.random() * 1.6;
          velocity[i + 2] = (z / length) * strength + (Math.random() - 0.5) * 3;
        }
      },
      restore() { burst = false; },
    };

    const loader = new GLTFLoader();
    loader.load(
      SOURCE,
      (gltf) => {
        if (!alive) return;
        const root = gltf.scene;
        root.updateMatrixWorld(true);
        const surfaces: RoseSurface[] = [];
        const bounds = new THREE.Box3();
        root.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) return;
          const geometry = node.geometry as THREE.BufferGeometry;
          if (!geometry?.getAttribute("position") || geometry.getAttribute("position").count < 3) return;
          const material = (Array.isArray(node.material) ? node.material[0] : node.material) as THREE.MeshStandardMaterial;
          if (!material || material.visible === false) return;
          geometry.computeBoundingBox();
          if (!geometry.boundingBox) return;
          const box = geometry.boundingBox.clone().applyMatrix4(node.matrixWorld);
          bounds.union(box);
          const size = box.getSize(new THREE.Vector3());
          const weight = Math.max(0.00005, size.x * size.y + size.y * size.z + size.z * size.x);
          try {
            surfaces.push({ mesh: node, sampler: new MeshSurfaceSampler(node).build(), weight, material, pixels: texturePixels(material.map) });
          } catch (error) {
            console.warn("FX Rose: mesh skipped", error);
          }
        });
        if (!surfaces.length || bounds.isEmpty()) {
          setState("error"); setReason("El GLB no contiene superficies triangulares utilizables."); return;
        }
        const size = bounds.getSize(new THREE.Vector3());
        const axes = [0, 1, 2].sort((a, b) => size.getComponent(b) - size.getComponent(a));
        const center = bounds.getCenter(new THREE.Vector3());
        const horizontalSize = size.getComponent(axes[0]);
        const verticalSize = size.getComponent(axes[1]);
        const scale = Math.min(5.35 / Math.max(horizontalSize, 0.001), 3.3 / Math.max(verticalSize, 0.001));
        const total = window.innerWidth < 760 ? MOBILE_PARTICLES : DESKTOP_PARTICLES;
        const weightSum = surfaces.reduce((sum, entry) => sum + entry.weight, 0);
        const counts = surfaces.map((entry) => Math.max(6, Math.round((entry.weight / weightSum) * total)));
        const length = counts.reduce((sum, count) => sum + count, 0) * 3;
        goal = new Float32Array(length);
        velocity = new Float32Array(length);
        const colors = new Float32Array(length);
        const world = new THREE.Vector3();
        const point = new THREE.Vector3();
        const uv = new THREE.Vector2();
        const color = new THREE.Color();
        let i = 0;
        surfaces.forEach((surface, index) => {
          for (let j = 0; j < counts[index]; j++) {
            surface.sampler.sample(point, undefined, undefined, uv);
            world.copy(point).applyMatrix4(surface.mesh.matrixWorld).sub(center);
            goal![i] = world.getComponent(axes[0]) * scale;
            goal![i + 1] = world.getComponent(axes[1]) * scale;
            goal![i + 2] = world.getComponent(axes[2]) * scale;
            sampleMaterialColor(surface, uv, color);
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
            i += 3;
          }
        });
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(goal.slice(), 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        sprite = makeRoundSprite();
        const material = new THREE.PointsMaterial({
          size: window.innerWidth < 760 ? 0.037 : 0.025,
          map: sprite,
          transparent: true,
          alphaTest: 0.025,
          opacity: 0.94,
          depthWrite: false,
          vertexColors: true,
          sizeAttenuation: true,
        });
        cloud = new THREE.Points(geometry, material);
        cloud.frustumCulled = false;
        roseGroup.add(cloud);
        setState("ready");
        renderSize();
      },
      undefined,
      (error) => { if (alive) { console.error("FX rose GLB", error); setState("error"); setReason(`No se pudo cargar ${SOURCE}`); } }
    );
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      resize.disconnect();
      observer.disconnect();
      controllerRef.current = null;
      cloud?.geometry.dispose();
      (cloud?.material as THREE.Material | undefined)?.dispose();
      sprite?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="fx-rose-particles-widget">
      <div ref={mountRef} className="fx-rose-particles-canvas" role="img" aria-label="Rosa tridimensional formada por miles de partículas rojas y verdes" />
      {state === "loading" && <span className="fx-rose-particles-status">FORMING ROSE...</span>}
      {state === "error" && <span className="fx-rose-particles-status" role="alert">{reason}</span>}
      {state === "ready" && (
        <button
          type="button"
          className="fx-rose-particles-trigger"
          onClick={() => {
            if (scattered) controllerRef.current?.restore();
            else controllerRef.current?.explode();
            setScattered(!scattered);
          }}
        >
          {scattered ? "REGENERATE ROSE" : "DISSOLVE ROSE"}
        </button>
      )}
    </div>
  );
}
