"use client";
import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import styles from "./Crown4D.module.css";

type CrownPose = { x: number; y: number; rx: number; ry: number; rz: number };
type CrownGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  startRX: number;
  startRY: number;
  lastX: number;
  lastY: number;
  lastTime: number;
  vx: number;
  vy: number;
};

const REST: CrownPose = { x: 0, y: 0, rx: 0, ry: 0, rz: 0 };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function Crown4D() {
const crownRef = useRef<HTMLDivElement>(null);
const frameRef = useRef<number | null>(null);
const poseRef = useRef<CrownPose>({ ...REST });
const gestureRef = useRef<CrownGesture | null>(null);

const cancelMotion = () => {
  if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  frameRef.current = null;
};

const applyPose = (next: CrownPose) => {
  poseRef.current = next;
  const element = crownRef.current;
  if (!element) return;
  element.style.setProperty("--dragX", `${next.x}px`);
  element.style.setProperty("--dragY", `${next.y}px`);
  element.style.setProperty("--rotateX", `${next.rx}deg`);
  element.style.setProperty("--rotateY", `${next.ry}deg`);
  element.style.setProperty("--rotateZ", `${next.rz}deg`);
};

const returnHome = (kickX = 0, kickY = 0) => {
  cancelMotion();
  const velocity: CrownPose = {
    x: clamp(kickX * 0.9, -24, 24),
    y: clamp(kickY * 0.9, -24, 24),
    rx: clamp(-kickY * 1.15, -32, 32),
    ry: clamp(kickX * 1.35, -38, 38),
    rz: clamp(kickX * 0.2, -8, 8),
  };
  let previous = 0;
  const tick = (now: number) => {
    const dt = previous ? clamp((now - previous) / 16.67, 0.5, 2) : 1;
    previous = now;
    const current = poseRef.current;
    const next = { ...current };
    let moving = false;
    for (const axis of ["x", "y", "rx", "ry", "rz"] as const) {
      velocity[axis] = (velocity[axis] - current[axis] * 0.048 * dt) * Math.pow(0.82, dt);
      next[axis] = current[axis] + velocity[axis] * dt;
      if (Math.abs(next[axis]) > 0.15 || Math.abs(velocity[axis]) > 0.12) moving = true;
    }
    applyPose(moving ? next : { ...REST });
    frameRef.current = moving ? requestAnimationFrame(tick) : null;
  };
  frameRef.current = requestAnimationFrame(tick);
};

const flipCrown = () => {
  if (gestureRef.current) return;
  cancelMotion();
  const start = { ...poseRef.current };
  let started = 0;
  const tick = (now: number) => {
    if (!started) started = now;
    const t = clamp((now - started) / 850, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    applyPose({
      x: start.x * (1 - eased),
      y: start.y * (1 - eased),
      rx: start.rx * (1 - eased),
      ry: start.ry + 360 * eased,
      rz: start.rz * (1 - eased),
    });
    if (t < 1) frameRef.current = requestAnimationFrame(tick);
    else {
      frameRef.current = null;
      applyPose({ ...REST });
    }
  };
  frameRef.current = requestAnimationFrame(tick);
};

const handleDown = (event: PointerEvent<HTMLDivElement>) => {
  if (gestureRef.current || (event.pointerType === "mouse" && event.button !== 0)) return;
  cancelMotion();
  const now = performance.now();
  gestureRef.current = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startRX: poseRef.current.rx,
    startRY: poseRef.current.ry,
    lastX: event.clientX,
    lastY: event.clientY,
    lastTime: now,
    vx: 0,
    vy: 0,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
  event.currentTarget.dataset.dragging = "true";
};

const handleMove = (event: PointerEvent<HTMLDivElement>) => {
  const element = crownRef.current;
  if (!element) return;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  element.style.setProperty("--lightX", `${x * 100}%`);
  element.style.setProperty("--lightY", `${y * 100}%`);
  const gesture = gestureRef.current;
  if (gesture && gesture.pointerId === event.pointerId) {
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    const now = performance.now();
    const elapsed = Math.max(1, now - gesture.lastTime);
    gesture.vx = clamp(((event.clientX - gesture.lastX) / elapsed) * 16.67, -24, 24);
    gesture.vy = clamp(((event.clientY - gesture.lastY) / elapsed) * 16.67, -24, 24);
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
    gesture.lastTime = now;
    applyPose({
      x: clamp(dx * 0.72, -135, 135),
      y: clamp(dy * 0.72, -135, 135),
      rx: gesture.startRX - dy * 1.1,
      ry: gesture.startRY + dx * 1.4,
      rz: dx * 0.1,
    });
    return;
  }
  if (!gesture) applyPose({ ...REST, rx: (0.5 - y) * 18, ry: (x - 0.5) * 24 });
};

const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
  const gesture = gestureRef.current;
  if (!gesture || gesture.pointerId !== event.pointerId) return;
  gestureRef.current = null;
  delete event.currentTarget.dataset.dragging;
  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  // A single tap on a phone triggers the 360° demonstration.
  // A drag keeps the existing spin-and-spring interaction.
  const distance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
  if (event.type === "pointerup" && event.pointerType !== "mouse" && distance < 9) {
    flipCrown();
    return;
  }
  returnHome(gesture.vx, gesture.vy);
};

const handleLeave = () => {
  if (!gestureRef.current) {
    const element = crownRef.current;
    element?.style.setProperty("--lightX", "50%");
    element?.style.setProperty("--lightY", "40%");
    returnHome();
  }
};

const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    flipCrown();
  }
  if (event.key === "Escape") returnHome();
};

useEffect(() => () => {
  if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
}, []);

return (
<div ref={crownRef} className={styles.scene} role="button" tabIndex={0} aria-label="Interactive crown. Drag to spin and throw, double-click or press Enter to flip." onDragStart={(event) => event.preventDefault()} onPointerDown={handleDown} onPointerMove={handleMove} onPointerUp={finishDrag} onPointerCancel={finishDrag} onPointerLeave={handleLeave} onDoubleClick={flipCrown} onKeyDown={handleKeyDown}>
<div className={styles.floating}>
<div className={styles.crown}>
<img src="/assets/iconos/corona.png" alt="Corona azul" className={styles.depth} draggable={false} />
<img src="/assets/iconos/corona.png" alt="" className={styles.image} draggable={false} />
<span className={styles.light} />
<span className={`${styles.spark} ${styles.spark1}`} />
<span className={`${styles.spark} ${styles.spark2}`} />
<span className={`${styles.spark} ${styles.spark3}`} />
<span className={`${styles.spark} ${styles.spark4}`} />
<span className={`${styles.spark} ${styles.spark5}`} />
</div>
</div>
</div>
);
}
