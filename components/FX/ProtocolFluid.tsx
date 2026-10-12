"use client";

import { useEffect, useRef } from "react";

type ProtocolFluidProps = {
  variant: number;
};

const VERTEX = String.raw`
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT = String.raw`
precision mediump float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;
uniform vec3 uTint;

float random2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(random2(i), random2(i + vec2(1.0, 0.0)), u.x),
    mix(random2(i + vec2(0.0, 1.0)), random2(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float turbulence(vec2 p) {
  float total = 0.0;
  float amp = 0.58;
  for (int i = 0; i < 4; i++) {
    total += noise2(p) * amp;
    p = p * 1.98 + vec2(13.1, 7.7);
    amp *= 0.49;
  }
  return total;
}
void main() {
  vec2 p = vUv;
  p.x *= uResolution.x / max(uResolution.y, 1.0);
  float t = uTime * 0.12;
  vec2 flow = vec2(
    turbulence(p * 1.7 + vec2(t, t * 0.4)),
    turbulence(p * 1.7 + vec2(-t * 0.6, t))
  );
  vec2 q = p + (flow - 0.48) * 0.75;
  vec2 pointer = vec2(uPointer.x * (uResolution.x / max(uResolution.y, 1.0)), uPointer.y);
  float influence = exp(-length(q - pointer) * 2.1) * 0.45;
  q += (pointer - q) * influence * 0.16;
  float wave = turbulence(q * 2.5 + vec2(t * 0.35, -t * 0.45));
  float curl = sin(q.x * 5.1 + q.y * 4.7 + flow.x * 5.0 - t * 1.4);
  float plume = smoothstep(0.39, 0.78, wave * 0.80 + curl * 0.20 + influence * 0.18);
  float veil = smoothstep(0.19, 0.91, turbulence(q * 1.3 + vec2(3.8, t * 0.2)));
  float edge = 1.0 - smoothstep(0.29, 1.17, length(vUv - vec2(0.70, 0.42)) * 1.2);
  vec3 first = uTint * (0.45 + veil * 0.36);
  vec3 second = vec3(0.14, 0.37, 0.71) * (0.22 + flow.y * 0.65);
  vec3 third = vec3(0.47, 0.15, 0.50) * max(0.0, curl * 0.27);
  vec3 pigment = mix(first, second, clamp(flow.x * 0.54, 0.0, 1.0)) + third;
  float alpha = clamp(plume * 0.37 + veil * 0.11, 0.0, 0.48) * (0.40 + edge * 0.60);
  gl_FragColor = vec4(pigment, alpha);
}
`;

const TINTS: [number, number, number][] = [
  [0.27, 0.65, 0.79],
  [0.31, 0.46, 0.93],
  [0.69, 0.34, 0.77],
  [0.69, 0.57, 0.32],
];

function createShader(gl: WebGLRenderingContext, kind: number, source: string) {
  const shader = gl.createShader(kind);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

export default function ProtocolFluid({ variant }: ProtocolFluidProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vertex = createShader(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vertex || !fragment) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      return;
    }
    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    const buffer = gl.createBuffer();
    if (!buffer) {
      gl.deleteProgram(program);
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, "aPosition");
    const resolution = gl.getUniformLocation(program, "uResolution");
    const pointerUniform = gl.getUniformLocation(program, "uPointer");
    const time = gl.getUniformLocation(program, "uTime");
    const tint = gl.getUniformLocation(program, "uTint");
    const color = TINTS[variant] ?? TINTS[0];
    const parent = canvas.parentElement;

    let visible = false;
    let alive = true;
    let paused = document.hidden;
    let frame = 0;
    let lastFrame = 0;
    const started = performance.now();
    const pointer = { x: 0.7, y: 0.35 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const density = Math.min(window.devicePixelRatio || 1, 1.25);
      const width = Math.max(1, Math.min(640, Math.round(rect.width * density)));
      const height = Math.max(1, Math.min(360, Math.round(rect.height * density)));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
    };

    const draw = (timestamp: number) => {
      if (!alive || !visible || paused) return;
      frame = requestAnimationFrame(draw);
      if (timestamp - lastFrame < 50) return;
      lastFrame = timestamp;
      resize();
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(attribute);
      gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform2f(pointerUniform, pointer.x, pointer.y);
      gl.uniform1f(time, (timestamp - started) / 1000);
      gl.uniform3f(tint, color[0], color[1], color[2]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const start = () => {
      if (!alive || !visible || paused || frame) return;
      frame = requestAnimationFrame(draw);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const onPointer = (event: PointerEvent) => {
      const box = parent?.getBoundingClientRect();
      if (!box) return;
      pointer.x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
      pointer.y = Math.max(0, Math.min(1, 1 - (event.clientY - box.top) / box.height));
    };
    const onVisibility = () => {
      paused = document.hidden;
      if (paused) stop();
      else start();
    };
    const observer = new IntersectionObserver((entries) => {
      visible = Boolean(entries[0]?.isIntersecting);
      if (visible) start();
      else stop();
    }, { threshold: 0.01 });

    observer.observe(canvas);
    parent?.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      stop();
      visible = false;
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    start();
    return () => {
      alive = false;
      stop();
      observer.disconnect();
      parent?.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [variant]);

  return (
    <canvas ref={canvasRef} className="fx-protocol-fluid" aria-hidden="true" />
  );
}
