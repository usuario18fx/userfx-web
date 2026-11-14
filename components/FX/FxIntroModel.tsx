"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type Props = {
  percent: number;
  onReady: () => void;
  onError: () => void;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export default function FxIntroModel({ percent, onReady, onError }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(percent);
  const readyRef = useRef(onReady);
  const errorRef = useRef(onError);

  progressRef.current = percent;
  readyRef.current = onReady;
  errorRef.current = onError;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let cancelled = false;
    let frame = 0;
    let resizeObserver: ResizeObserver | null = null;
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      errorRef.current();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.className = "fx-scene-loader-glb-canvas";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    const viewport = new THREE.Vector2(1, 1);
    const reveal = { value: 0 };
    const lineMaterials: THREE.LineBasicMaterial[] = [];
    const lines: THREE.LineSegments[] = [];
    const clonedMaterials: THREE.Material[] = [];
    let logo: THREE.Group | null = null;
    let loaded = false;

    scene.add(new THREE.AmbientLight(0xffffff, 2.3));
    const key = new THREE.DirectionalLight(0xc0e7ff, 2);
    key.position.set(-3, 5, 7);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.8);
    fill.position.set(4, -2, 3);
    scene.add(fill);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      renderer.getDrawingBufferSize(viewport);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const loader = new GLTFLoader();
    loader.load(
      "/userfx.glb",
      (gltf) => {
        if (cancelled) {
          gltf.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) object.geometry.dispose();
          });
          return;
        }

        logo = gltf.scene;
        const box = new THREE.Box3().setFromObject(logo);
        if (box.isEmpty()) {
          errorRef.current();
          return;
        }

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const span = Math.max(0.001, size.x, size.y, size.z);
        const scale = 4.2 / span;
        logo.position.sub(center);
        const normalized = new THREE.Group();
        normalized.add(logo);
        normalized.scale.setScalar(scale);
        scene.add(normalized);

        logo.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;

          const original = Array.isArray(object.material) ? object.material : [object.material];
          const materials = original.map((source) => {
            const material = source.clone();
            clonedMaterials.push(material);
            const previousCompile = material.onBeforeCompile;
            material.onBeforeCompile = (shader, rendererRef) => {
              previousCompile.call(material, shader, rendererRef);
              shader.uniforms.fxReveal = reveal;
              shader.uniforms.fxViewport = { value: viewport };
              shader.fragmentShader = "uniform float fxReveal;\nuniform vec2 fxViewport;\n" + shader.fragmentShader;
              shader.fragmentShader = shader.fragmentShader.replace(
                "void main() {",
                "void main() {\nvec2 fxUv = gl_FragCoord.xy / fxViewport - vec2(0.5);\nif (length(fxUv) > fxReveal * 0.73) discard;"
              );
            };
            material.needsUpdate = true;
            return material;
          });
          object.material = Array.isArray(object.material) ? materials : materials[0];

          if (!object.geometry?.attributes.position) return;
          const edgeGeometry = new THREE.EdgesGeometry(object.geometry, 28);
          const edgeMaterial = new THREE.LineBasicMaterial({
            color: 0x39d3d0,
            transparent: true,
            opacity: 0.95,
            depthTest: false
          });
          const edge = new THREE.LineSegments(edgeGeometry, edgeMaterial);
          edge.renderOrder = 8;
          object.add(edge);
          lineMaterials.push(edgeMaterial);
          lines.push(edge);
        });

        const finalBox = new THREE.Box3().setFromObject(normalized);
        const finalSize = finalBox.getSize(new THREE.Vector3());
        const radius = Math.max(finalSize.x, finalSize.y) / 2;
        const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
        const distance = Math.max(4, radius / Math.tan(halfFov) * 1.18);
        camera.position.set(0, 0.08, distance);
        camera.lookAt(0, 0, 0);
        loaded = true;
        readyRef.current();
      },
      undefined,
      () => {
        if (!cancelled) errorRef.current();
      }
    );

    const render = () => {
      if (cancelled) return;
      frame = window.requestAnimationFrame(render);

      if (loaded) {
        const value = progressRef.current;
        reveal.value = clamp01((value - 20) / 60);
        const borderProgress = clamp01(value / 20);
        const fade = value <= 20 ? 1 : clamp01((80 - value) / 60);
        for (const line of lines) {
          const count = line.geometry.getAttribute("position").count;
          line.geometry.setDrawRange(0, Math.floor(count * borderProgress / 2) * 2);
        }
        for (const material of lineMaterials) material.opacity = Math.min(1, borderProgress * 1.4) * fade * 0.88;
        renderer.render(scene, camera);
      }
    };
    render();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      for (const edge of lines) edge.geometry.dispose();
      for (const material of lineMaterials) material.dispose();
      for (const material of clonedMaterials) material.dispose();
      logo?.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={mountRef} className="fx-scene-loader-glb" aria-hidden="true" />
  );
}
