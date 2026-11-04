"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { SCENES, type Scene } from "./fxScenes";
import "./MediaScrollPanel.css";

const CrownRose = dynamic(() => import("./ProtocolCrown3D"), { ssr: false });

const ease = (value: number) => {
  const progress = Math.max(0, Math.min(1, value));
  return progress * progress * (3 - 2 * progress);
};

function PhotoSlide({ scene, index, progress, compact, reduced }: {
  scene: Scene;
  index: number;
  progress: MotionValue<number>;
  compact: boolean;
  reduced: boolean;
}) {
  // Desktop: reveal left, then right; transition to the second pair.
  // Mobile: reveal all four individually in one centered column.
  const start = compact
    ? [0, 0.18, 0.43, 0.68][index]
    : [0, 0.17, 0.51, 0.72][index];
  const finish = compact
    ? [0.02, 0.28, 0.53, 0.78][index]
    : [0.02, 0.29, 0.64, 0.84][index];
  const leaveStart = compact ? (index + 1) / SCENES.length - 0.05 : 0.46;
  const leaveEnd = compact ? (index + 1) / SCENES.length + 0.055 : 0.60;
  const leaves = compact ? index < SCENES.length - 1 : index < 2;

  const entering = (value: number) => index === 0 ? 1 : ease((value - start) / (finish - start));
  const leaving = (value: number) => leaves ? 1 - ease((value - leaveStart) / (leaveEnd - leaveStart)) : 1;

  const opacity = useTransform(progress, (value) => entering(value) * leaving(value));
  const y = useTransform(progress, (value) => {
    const reveal = entering(value);
    const exit = leaving(value);
    return (1 - reveal) * 52 - (1 - exit) * 36;
  });
  const scale = useTransform(progress, (value) => 0.94 + entering(value) * 0.06 - (1 - leaving(value)) * 0.025);
  const clipPath = useTransform(progress, (value) => {
    const hidden = (1 - entering(value)) * 100;
    return index % 2 === 0
      ? `inset(0 ${hidden.toFixed(2)}% 0 0 round 14px)`
      : `inset(0 0 0 ${hidden.toFixed(2)}% round 14px)`;
  });

  return (
    <motion.figure className={`fx-media-photo fx-media-photo--${index % 2 === 0 ? "left" : "right"}`} style={reduced ? undefined : { opacity, y, scale, clipPath }}>
      <span className="fx-media-photo-frame">
        <img src={scene.image} alt={scene.imageAlt} className="fx-media-photo-image" loading={index < 2 ? "eager" : "lazy"} decoding="async" draggable={false} onError={(event) => { if (index === 0 && !event.currentTarget.dataset.fallback) { event.currentTarget.dataset.fallback = "true"; event.currentTarget.src = "/assets/album/PRVW/PRVW-04.jpg"; } }} />
      </span>
    </motion.figure>
  );
}

export default function MediaScrollPanel({ id }: { id: string }) {
  const section = useRef<HTMLElement>(null);
  const reduced = Boolean(useReducedMotion());
  const [compact, setCompact] = useState(false);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });

  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const sync = () => setCompact(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <section id={id} ref={section} className={`fx-media-sequence${reduced ? " is-reduced" : ""}`} aria-label="USER FX photographs revealed by scrolling">
      <div className="fx-media-stage">
        <div className="fx-media-backdrop" aria-hidden="true">
          <CrownRose progress={scrollYProgress} dissolveAt={2} />
        </div>
        <div className="fx-media-photos">
          {SCENES.map((scene, index) => (
            <PhotoSlide key={scene.id} scene={scene} index={index} progress={scrollYProgress} compact={compact} reduced={reduced} />
          ))}
        </div>
      </div>
    </section>
  );
}
