"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type Props = { progress: number };

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (start: number, end: number, value: number) => {
  const x = clamp((value - start) / (end - start));
  return x * x * (3 - 2 * x);
};

// A single batched GPU point cloud, not one mesh / DOM element per fragment.
function buildCrownParticles(
  crown: THREE.Mesh,
  center: THREE.Vector3,
  count: number,
) {
  const attribute = crown.geometry.getAttribute("position");
  if (!attribute || !attribute.count) return null;

  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const tones = new Float32Array(count);
  const sample = new THREE.Vector3();
  const axis = new THREE.Vector3(1, 0, 0);

  // Deterministic random samples from the same vertices used by the real crown.
  let state = 1873149;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };

  for (let i = 0; i < count; i++) {
    const index = Math.min(attribute.count - 1, Math.floor(random() * attribute.count));
    sample.fromBufferAttribute(attribute, index);
    crown.localToWorld(sample);
    sample.sub(center).applyAxisAngle(axis, -Math.PI / 2);

    const p = i * 3;
    positions[p] = sample.x;
    positions[p + 1] = sample.y;
    positions[p + 2] = sample.z;

    const angle = random() * Math.PI * 2;
    const outward = 0.6 + random() * 1.3;
    velocities[p] = Math.cos(angle) * outward + sample.x * 0.26;
    velocities[p + 1] = 0.5 + random() * 1.7;
    velocities[p + 2] = Math.sin(angle) * outward + sample.z * 0.25;
    seeds[i] = random();
    tones[i] = random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aVelocity", new THREE.BufferAttribute(velocities, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aTone", new THREE.BufferAttribute(tones, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uSmash: { value: 0 },
      uFall: { value: 0 },
      uOpacity: { value: 0 },
      uHit: { value: 0 },
      uTime: { value: 0 },
      uDpr: { value: 1 },
    },
    vertexShader: `
      attribute vec3 aVelocity;
      attribute float aSeed;
      attribute float aTone;
      uniform float uSmash;
      uniform float uFall;
      uniform float uHit;
      uniform float uTime;
      uniform float uDpr;
      varying float vTone;
      varying float vAlpha;
      void main() {
        float delay = smoothstep(0.0, 1.0, uSmash * 1.22 - aSeed * 0.22);
        float burst = max(delay, uHit * (0.5 + aSeed * 0.5));
        vec3 transformed = position + aVelocity * burst * (1.0 + aSeed);
        transformed.x += sin(uTime * 1.8 + aSeed * 40.0) * 0.085 * burst;
        transformed.z += cos(uTime * 1.5 + aSeed * 27.0) * 0.085 * burst;
        transformed.y -= uFall * uFall * (3.4 + aSeed * 2.6);
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp((2.0 + aSeed * 2.2) * uDpr * (6.5 / max(0.5, -mvPosition.z)), 1.1, 8.0);
        vTone = aTone;
        vAlpha = 0.66 + 0.34 * aSeed;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying float vTone;
      varying float vAlpha;
      void main() {
        float r = length(gl_PointCoord - vec2(0.5));
        float sparkle = 1.0 - smoothstep(0.08, 0.50, r);
        float halo = 1.0 - smoothstep(0.05, 0.40, r);
        vec3 blue = vec3(0.03, 0.39, 1.0);
        vec3 cyan = vec3(0.33, 0.88, 1.0);
        vec3 silver = vec3(0.88, 0.94, 1.0);
        vec3 color = mix(blue, cyan, smoothstep(0.1, 0.78, vTone));
        color = mix(color, silver, smoothstep(0.88, 1.0, vTone));
        gl_FragColor = vec4(color, sparkle * halo * vAlpha * uOpacity);
      }
    `,
  });

  const particles = new THREE.Points(geometry, material);
  particles.frustumCulled = false;
  particles.renderOrder = 10;
  return { particles, material };
}

export default function CrownModel({ progress }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(progress);
  const [ready, setReady] = useState(false);

  useEffect(() => { latest.current = progress; }, [progress]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    let disposed = false;
    let animation = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let pivot: THREE.Group | null = null;
    let materialCopies: THREE.Material[] = [];
    let particleField: ReturnType<typeof buildCrownParticles> = null;
    let flash = 0;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
    camera.position.set(0, 0, 7.4);

    const key = new THREE.DirectionalLight("#c5ddff", 4.2);
    key.position.set(-2, 5, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#317bff", 6);
    rim.position.set(3, 2, -3);
    scene.add(rim);
    scene.add(new THREE.AmbientLight("#a1bbff", 1.7));

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.8;
      element.appendChild(renderer.domElement);
    } catch {
      return;
    }
    const webgl = renderer;

    const resize = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;
      webgl.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    const onPointerDown = () => { flash = 1; };
    element.addEventListener("pointerdown", onPointerDown);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particleCount = reduceMotion ? 0 : window.innerWidth <= 680 ? 6500 : 24000;

    new GLTFLoader().load(
      "/assets/crown/CORONA-DARK-optimizada.glb",
      (gltf) => {
        if (disposed) return;
        const source = gltf.scene;
        const meshes: THREE.Mesh[] = [];
        source.traverse((object) => {
          if (object instanceof THREE.Mesh) meshes.push(object);
        });
        meshes.sort((a, b) =>
          (b.geometry.getAttribute("position")?.count ?? 0) -
          (a.geometry.getAttribute("position")?.count ?? 0));
        const crown = meshes[0];
        if (!crown) return;
        for (const extra of meshes.slice(1)) extra.parent?.remove(extra);
        source.updateMatrixWorld(true);

        const bounds = new THREE.Box3().setFromObject(crown);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z);
        if (maxSize < 0.0001) return;

        if (particleCount) particleField = buildCrownParticles(crown, center, particleCount);
        materialCopies = (Array.isArray(crown.material) ? crown.material : [crown.material])
          .map((original) => {
            const copied = original.clone();
            copied.transparent = true;
            copied.depthWrite = true;
            copied.opacity = 1;
            return copied;
          });
        crown.material = Array.isArray(crown.material) ? materialCopies : materialCopies[0];

        source.position.sub(center);
        const upright = new THREE.Group();
        upright.rotation.x = -Math.PI / 2;
        upright.add(source);
        const root = new THREE.Group();
        root.add(upright);
        if (particleField) root.add(particleField.particles);
        root.scale.setScalar(3.0 / maxSize);
        scene.add(root);
        pivot = root;
        setReady(true);
      },
      undefined,
      () => {},
    );

    let lastTime = 0;
    const draw = (timestamp: number) => {
      if (disposed) return;
      animation = requestAnimationFrame(draw);
      const t = clamp(latest.current);
      const delta = Math.min(0.05, lastTime ? (timestamp - lastTime) / 1000 : 0.016);
      lastTime = timestamp;
      flash = Math.max(0, flash - delta * 1.35);

      if (pivot) {
        const spin = clamp(t / 0.4);
        pivot.rotation.y = spin * Math.PI * 1.6;
        pivot.rotation.z = Math.sin(t * Math.PI * 2) * 0.04;
        pivot.position.y = t * 0.65 + Math.sin(timestamp * 0.0014) * 0.04;

        const smash = reduceMotion ? 0 : smoothstep(0.28, 0.51, t);
        const fall = reduceMotion ? 0 : smoothstep(0.44, 0.75, t);
        const dissolve = Math.max(smoothstep(0.29, 0.44, t), flash * 0.62);
        for (const material of materialCopies) {
          material.opacity = 1 - dissolve;
          material.depthWrite = dissolve < 0.95;
        }
        if (particleField) {
          const uniforms = particleField.material.uniforms;
          uniforms.uSmash.value = smash;
          uniforms.uFall.value = fall;
          uniforms.uHit.value = flash;
          uniforms.uTime.value = timestamp * 0.001;
          uniforms.uDpr.value = Math.min(window.devicePixelRatio || 1, 1.8);
          uniforms.uOpacity.value = Math.max(smoothstep(0.27, 0.40, t) * (1 - smoothstep(0.72, 0.83, t)), flash * 0.85);
        }
      }
      webgl.render(scene, camera);
    };
    animation = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      cancelAnimationFrame(animation);
      observer.disconnect();
      element.removeEventListener("pointerdown", onPointerDown);
      webgl.dispose();
      webgl.domElement.remove();
      if (particleField) {
        particleField.particles.geometry.dispose();
        particleField.material.dispose();
      }
      for (const material of materialCopies) material.dispose();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const mats = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of mats) if (!materialCopies.includes(material)) material.dispose();
      });
    };
  }, []);

  return (
    <div className="fx-crown-model-host" aria-label="Corona 3D con fragmentos de partículas interactivos">
      <div className="fx-crown-webgl" ref={host} style={{ opacity: ready ? 1 : 0 }} />
      {!ready && (
        <video autoPlay muted loop playsInline preload="metadata" aria-label="Animated blue USER FX crown">
          <source src="/assets/crown/CORONA-DARK.mp4" type="video/mp4" />
        </video>
      )}
    </div>
  );
}
