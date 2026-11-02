"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion, type MotionValue } from "framer-motion";

type Props = {
  progress: MotionValue<number>;
  dissolveAt: number;
  spinEnd?: number;
  src?: string;
};

type Phase = "rising" | "idle" | "falling" | "ground";

const VERT = `
precision highp float;
attribute vec3 position;
attribute float grain;
uniform float aspect, scale, persp, size;
uniform vec2 offset;
varying float light;
void main() {
  float p = 1.0 / (1.0 - position.z * persp);
  gl_Position = vec4(position.xy * scale * vec2(1.0 / aspect, 1.0) * p + offset, -position.z * 0.2, 1.0);
  gl_PointSize = clamp((1.2 + grain * 1.4) * size * p, 1.0, 5.0 * size);
  light = clamp(0.38 + (position.z + 0.5) * 0.5 + grain * 0.38, 0.15, 1.0);
}`;

const FRAG = `
precision mediump float;
varying float light;
void main() {
  float r = length(gl_PointCoord - 0.5);
  if (r > 0.48) discard;
  gl_FragColor = vec4(vec3(0.22, 0.60, 1.0) * (0.5 + light * 0.8), 0.7 * (1.0 - r));
}`;

/** Dónde se dibuja la corona dentro del escenario (coordenadas NDC) */
function layout(w: number, h: number) {
  const aspect = w / h;
  // Escritorio: abajo a la izquierda, donde estaba el logo de FX
  if (aspect > 1.15) return { scale: 0.5, ox: -0.57, oy: -0.68 };
  // Móvil: arriba a la derecha, pequeña
  return { scale: 0.3, ox: 0.66, oy: 0.78 };
}

export default function ProtocolCrown({ progress, dissolveAt, spinEnd, src = "/corona/corona.bin" }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const reducedRef = useRef(!!reduced);
  reducedRef.current = !!reduced;
  const progressRef = useRef(0);
  const statusRef = useRef<HTMLSpanElement>(null);
  const dev = process.env.NODE_ENV !== "production";

  useEffect(() => {
    progressRef.current = progress.get();
    return progress.on("change", (v) => {
      progressRef.current = v;
    });
  }, [progress]);

  useEffect(() => {
    // Indicador de carga (solo en desarrollo): dice si la corona cargó o por qué no
    const say = (text: string) => {
      if (dev && statusRef.current) statusRef.current.textContent = text;
    };
    const canvasOrNull = ref.current;
    if (!canvasOrNull) return;
    // Tipos explícitos (no nulos): así TypeScript no los "pierde" dentro de frame()
    const canvas: HTMLCanvasElement = canvasOrNull;
    const glOrNull = canvas.getContext("webgl", { alpha: true, antialias: true });
    if (!glOrNull) {
      say("corona: WebGL no disponible en este navegador");
      return;
    }
    const gl: WebGLRenderingContext = glOrNull;

    let disposed = false;
    let raf = 0;
    let visible = true;
    const cleanups: Array<() => void> = [];

    const compile = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };

    (async () => {
      try {
        const program = gl.createProgram()!;
        gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link");
        gl.useProgram(program);
        cleanups.push(() => gl.deleteProgram(program));

        say("corona: cargando " + src + "…");
        const response = await fetch(src);
        if (!response.ok) throw new Error("no se pudo cargar " + src + " (HTTP " + response.status + ")");
        const source = new Float32Array(await response.arrayBuffer());
        if (disposed) return;
        if (!source.length || source.length % 3) throw new Error("Datos de corona incompletos");

        // ---- Muestreo y normalización: la corona mide 1 de alto y queda centrada ----
        const total = source.length / 3;
        const mobile = window.matchMedia("(max-width: 900px)").matches;
        const count = Math.min(total, mobile ? 12000 : 22000);
        let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (let i = 0; i < count; i++) {
          const s = Math.floor((i * total) / count) * 3;
          const x = source[s], y = source[s + 1], z = source[s + 2];
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
        const k = 1 / Math.max(maxY - minY, 1e-6);

        const home = new Float32Array(count * 3);
        const positions = new Float32Array(count * 3);
        const velocity = new Float32Array(count * 3);
        const grains = new Float32Array(count);
        const release = new Float32Array(count);
        let seed = 7123;
        const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

        // El piso de arena depende de la posición de la corona en pantalla
        const floorFor = (oy: number, scale: number) => (-0.93 - oy) / scale;
        const lay0 = layout(canvas.clientWidth || 1200, canvas.clientHeight || 700);
        const floor0 = floorFor(lay0.oy, lay0.scale);

        for (let i = 0; i < count; i++) {
          const s = Math.floor((i * total) / count) * 3;
          home[i * 3] = (source[s] - cx) * k;
          home[i * 3 + 1] = (source[s + 1] - cy) * k;
          home[i * 3 + 2] = (source[s + 2] - cz) * k;
          grains[i] = random();
          release[i] = random() * 0.65;
          // Empieza como arena en el piso y se arma sola
          const a = random() * Math.PI * 2;
          const r = Math.sqrt(random()) * 1.6;
          positions[i * 3] = Math.cos(a) * r;
          positions[i * 3 + 1] = floor0 + random() * 0.035;
          positions[i * 3 + 2] = Math.sin(a) * r * 0.7;
        }

        say("corona: OK · " + count.toLocaleString("es") + " partículas");
        const clearSay = window.setTimeout(() => say(""), 4000);
        cleanups.push(() => window.clearTimeout(clearSay));

        const positionBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
        const positionLoc = gl.getAttribLocation(program, "position");
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

        const grainBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, grainBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, grains, gl.STATIC_DRAW);
        const grainLoc = gl.getAttribLocation(program, "grain");
        gl.enableVertexAttribArray(grainLoc);
        gl.vertexAttribPointer(grainLoc, 1, gl.FLOAT, false, 0, 0);
        cleanups.push(() => {
          gl.deleteBuffer(positionBuffer);
          gl.deleteBuffer(grainBuffer);
        });

        const u = {
          aspect: gl.getUniformLocation(program, "aspect"),
          scale: gl.getUniformLocation(program, "scale"),
          persp: gl.getUniformLocation(program, "persp"),
          size: gl.getUniformLocation(program, "size"),
          offset: gl.getUniformLocation(program, "offset"),
        };
        const PERSP = 0.12;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.clearColor(0, 0, 0, 0);

        // ---- Mouse: dispersa la arena cuando ya cayó ----
        const mouse = { x: 10, y: 10, dx: 0, dy: 0, energy: 0, inside: false };
        const onMove = (e: PointerEvent) => {
          const r = canvas.getBoundingClientRect();
          if (!r.width || !r.height) return;
          const x = ((e.clientX - r.left) / r.width) * 2 - 1;
          const y = 1 - ((e.clientY - r.top) / r.height) * 2;
          const inside = x >= -1 && x <= 1 && y >= -1 && y <= 1;
          if (inside && mouse.inside) {
            mouse.dx = x - mouse.x;
            mouse.dy = y - mouse.y;
            mouse.energy = Math.min(1, Math.hypot(mouse.dx, mouse.dy) * 40);
          }
          mouse.x = x; mouse.y = y; mouse.inside = inside;
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        cleanups.push(() => window.removeEventListener("pointermove", onMove));

        // ---- Solo se anima mientras la sección está en pantalla ----
        const io = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible && !raf && !disposed) raf = requestAnimationFrame(frame);
        });
        io.observe(canvas);
        cleanups.push(() => io.disconnect());

        let phase: Phase = "rising";
        let elapsed = 0;
        let last = 0;
        const spinTo = spinEnd ?? dissolveAt;

        const go = (next: Phase) => {
          phase = next;
          elapsed = 0;
          if (next === "falling") {
            for (let i = 0; i < count; i++) {
              const j = i * 3, a = random() * Math.PI * 2;
              velocity[j] = Math.cos(a) * (0.15 + random() * 0.7);
              velocity[j + 1] = 0.15 + random() * 0.7;
              velocity[j + 2] = Math.sin(a) * (0.15 + random() * 0.7);
            }
          }
        };

        const simulate = (dt: number, now: number, aspect: number, lay: ReturnType<typeof layout>, yaw: number) => {
          const pitch = 0.1;
          const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
          const floorBase = floorFor(lay.oy, lay.scale);
          const bob = reducedRef.current ? 0 : Math.sin(now * 0.0007) * 0.012;
          for (let i = 0; i < count; i++) {
            const j = i * 3;
            const hx = home[j] * cy + home[j + 2] * sy;
            const hz = -home[j] * sy + home[j + 2] * cy;
            const hy = home[j + 1] * cp - hz * sp + bob;
            const tz = home[j + 1] * sp + hz * cp;

            if (phase === "idle" || (phase === "falling" && elapsed < release[i])) {
              positions[j] = hx; positions[j + 1] = hy; positions[j + 2] = tz;
              continue;
            }
            if (phase === "rising") {
              const strength = 18 + grains[i] * 8;
              const damping = Math.exp(-8 * dt);
              velocity[j] = (velocity[j] + (hx - positions[j]) * strength * dt) * damping;
              velocity[j + 1] = (velocity[j + 1] + (hy - positions[j + 1]) * strength * dt) * damping;
              velocity[j + 2] = (velocity[j + 2] + (tz - positions[j + 2]) * strength * dt) * damping;
            } else {
              velocity[j + 1] -= (3.1 + grains[i] * 1.7) * dt;
              if (mouse.inside && mouse.energy > 0.01) {
                const p = 1 / (1 - positions[j + 2] * PERSP);
                const sx = ((positions[j] * lay.scale) / aspect) * p + lay.ox;
                const sY = positions[j + 1] * lay.scale * p + lay.oy;
                const dx = (sx - mouse.x) * aspect, dy = sY - mouse.y;
                const distance = Math.hypot(dx, dy);
                if (distance < 0.21) {
                  const force = (1 - distance / 0.21) * mouse.energy;
                  const theta = grains[i] * Math.PI * 2;
                  velocity[j] += ((distance > 0.001 ? dx / distance : Math.cos(theta)) * 9 + mouse.dx * 60) * force * dt;
                  velocity[j + 2] += (Math.sin(theta) * 6 - mouse.dy * 40) * force * dt;
                  velocity[j + 1] += force * 9 * dt;
                }
              }
              const drag = Math.exp(-0.32 * dt);
              velocity[j] *= drag; velocity[j + 2] *= drag;
            }
            for (let c = 0; c < 3; c++) positions[j + c] += velocity[j + c] * dt;

            const floor = floorBase + grains[i] * 0.02;
            if (positions[j + 1] < floor && phase !== "rising") {
              positions[j + 1] = floor;
              velocity[j + 1] = Math.abs(velocity[j + 1]) > 0.18 ? -velocity[j + 1] * (0.18 + grains[i] * 0.14) : 0;
              const friction = Math.exp(-6 * dt);
              velocity[j] *= friction; velocity[j + 2] *= friction;
            }
            if (Math.abs(positions[j]) > 3.7) { positions[j] = Math.sign(positions[j]) * 3.7; velocity[j] *= -0.3; }
            if (Math.abs(positions[j + 2]) > 2.6) { positions[j + 2] = Math.sign(positions[j + 2]) * 2.6; velocity[j + 2] *= -0.3; }
          }
          mouse.energy *= Math.exp(-9 * dt);
        };

        function frame(now: number) {
          raf = 0;
          if (disposed || !visible) return;
          const dt = Math.min((now - (last || now)) / 1000, 0.04);
          last = now;
          elapsed += dt;

          const p = progressRef.current;
          const dissolved = p >= dissolveAt;
          const isReduced = reducedRef.current;

          if (!isReduced) {
            if (dissolved && (phase === "idle" || phase === "rising")) go("falling");
            else if (!dissolved && (phase === "falling" || phase === "ground")) go("rising");
            if (phase === "falling" && elapsed > 3.2) go("ground");
            if (phase === "rising" && elapsed > 3) { velocity.fill(0); phase = "idle"; }
          } else {
            phase = "idle";
          }

          const ratio = Math.min(window.devicePixelRatio || 1, 2);
          const cw = canvas.clientWidth, ch = canvas.clientHeight;
          const w = Math.round(cw * ratio), h = Math.round(ch * ratio);
          if (w > 0 && h > 0) {
            if (canvas.width !== w || canvas.height !== h) {
              canvas.width = w; canvas.height = h;
              gl.viewport(0, 0, w, h);
            }
            const aspect = w / h;
            const lay = layout(cw, ch);
            // La corona gira con el scroll
            const spin = Math.min(1, p / Math.max(spinTo, 1e-6));
            const yaw = -0.3 + spin * Math.PI * 2 * 1.1;

            const steps = Math.max(1, Math.ceil(dt / 0.012));
            for (let s = 0; s < steps; s++) simulate(dt / steps, now, aspect, lay, yaw);

            gl.clear(gl.COLOR_BUFFER_BIT);
            if (!(isReduced && dissolved)) {
              gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
              gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
              gl.uniform1f(u.aspect, aspect);
              gl.uniform1f(u.scale, lay.scale);
              gl.uniform1f(u.persp, PERSP);
              gl.uniform1f(u.size, ratio * Math.min(1.3, Math.max(0.7, ch / 800)));
              gl.uniform2f(u.offset, lay.ox, lay.oy);
              gl.drawArrays(gl.POINTS, 0, count);
            }
          }
          raf = requestAnimationFrame(frame);
        }

        raf = requestAnimationFrame(frame);
      } catch (error) {
        say("corona: ERROR · " + (error instanceof Error ? error.message : String(error)));
        console.warn("ProtocolCrown:", error);
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanups.forEach((fn) => fn());
    };
  }, [dissolveAt, spinEnd, src]);

  return (
    <>
      <canvas ref={ref} className="pv-crown" aria-hidden="true" />
      {dev ? <span ref={statusRef} className="pv-crown-status" aria-hidden="true" /> : null}
    </>
  );
}