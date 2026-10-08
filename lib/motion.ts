"use client";
import { useEffect, useRef } from "react";
import {
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
export const EASE: [number, number, number, number] = [0.22, 0.61, 0.36, 1];
export const stagger = (staggerChildren = 0.07, delayChildren = 0.1): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
});
export const rise: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE } },
};
export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 1.1, ease: EASE } },
};
export const bloom: Variants = {
  hidden: { opacity: 0, scale: 1.05 },
  show: { opacity: 1, scale: 1, transition: { duration: 1.4, ease: EASE } },
};
export const wipe = (radius = 40): Variants => ({
  hidden: { opacity: 0, y: 34, clipPath: `inset(16% 0% 0% 0% round ${radius}px)` },
  show: {
    opacity: 1,
    y: 0,
    clipPath: `inset(0% 0% 0% 0% round ${radius}px)`,
    transition: { duration: 1, ease: EASE },
  },
});
export const maskWord: Variants = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: 0.95, ease: EASE } },
};
const PLANES = { far: 132, mid: 86, brain: 48, near: -34, front: -66 } as const;
export function useHeroParallax(cols: number) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const unit = useMotionValue(1);
  const reduced = useReducedMotion();
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const read = () => unit.set(stage.clientWidth / cols);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [cols, unit]);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 24, restDelta: 0.0005 });
  const far = useTransform([smooth, unit], ([p, un]: number[]) =>
    reduced ? 0 : p * PLANES.far * un,
  );
  const mid = useTransform([smooth, unit], ([p, un]: number[]) =>
    reduced ? 0 : p * PLANES.mid * un,
  );
  const brain = useTransform([smooth, unit], ([p, un]: number[]) =>
    reduced ? 0 : p * PLANES.brain * un,
  );
  const near = useTransform([smooth, unit], ([p, un]: number[]) =>
    reduced ? 0 : p * PLANES.near * un,
  );
  const front = useTransform([smooth, unit], ([p, un]: number[]) =>
    reduced ? 0 : p * PLANES.front * un,
  );
  return { sectionRef, stageRef, y: { far, mid, brain, near, front }, progress: smooth, reduced };
}
