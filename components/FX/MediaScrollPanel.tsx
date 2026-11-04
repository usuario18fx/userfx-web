"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { SCENES, type Scene } from "./fxScenes";
import "./MediaScrollPanel.css";

const CrownRose = dynamic(() => import("./ProtocolCrown3D"), { ssr: false });

function PhotoSlide({ scene, index, count, progress, active, reduced }: {
  scene: Scene;
  index: number;
  count: number;
  progress: MotionValue<number>;
  active: boolean;
  reduced: boolean;
}) {
  const opacity = useTransform(progress, (value) => {
    const from = index / count;
    const to = (index + 1) / count;
    const transition = 0.045;
    const entering = index === 0 ? 1 : Math.max(0, Math.min(1, (value - from + transition) / (transition * 2)));
    const leaving = index === count - 1 ? 1 : Math.max(0, Math.min(1, (to + transition - value) / (transition * 2)));
    return Math.min(entering, leaving);
  });

  return (
    <motion.figure className="fx-media-photo" aria-hidden={!reduced && !active} style={reduced ? undefined : { opacity }}>
      <span className="fx-media-photo-frame">
        <img src={scene.image} alt={scene.imageAlt} className="fx-media-photo-image" loading={index === 0 ? "eager" : "lazy"} decoding="async" draggable={false} />
      </span>
    </motion.figure>
  );
}

export default function MediaScrollPanel({ id }: { id: string }) {
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const clamped = Math.min(0.999999, Math.max(0, value));
    const next = Math.floor(clamped * SCENES.length);
    setActiveIndex((current) => current === next ? current : next);
  });

  return (
    <section id={id} ref={section} className={`fx-media-sequence${reduced ? " is-reduced" : ""}`} aria-label="UserFX original photo gallery">
      <div className="fx-media-stage">
        <div className="fx-media-backdrop" aria-hidden="true">
          <CrownRose progress={scrollYProgress} dissolveAt={2} />
        </div>
        <div className="fx-media-photos">
          {SCENES.map((scene, index) => (
            <PhotoSlide key={scene.id} scene={scene} index={index} count={SCENES.length} progress={scrollYProgress} active={activeIndex === index} reduced={Boolean(reduced)} />
          ))}
        </div>
      </div>
    </section>
  );
}
