"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { SCENES, type Scene } from "./fxScenes";
import "./MediaScrollPanel.css";

const CrownRose = dynamic(() => import("./ProtocolCrown3D"), { ssr: false });

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

function PhotoSlide({ scene, index, count, progress, active, reduced }: {
  scene: Scene;
  index: number;
  count: number;
  progress: MotionValue<number>;
  active: boolean;
  reduced: boolean;
}) {
  const start = index / count;
  const end = (index + 1) / count;
  const span = end - start;
  const blend = span * 0.2;

  // All transitions are derived from scroll position. No timer or autoplay.
  const opacity = useTransform(progress, (position) => {
    const entering = index === 0 ? 1 : smooth((position - start + blend) / (blend * 2));
    const leaving = index === count - 1 ? 1 : 1 - smooth((position - end + blend) / (blend * 2));
    return entering * leaving;
  });

  const y = useTransform(progress, (position) => {
    const phase = (position - start) / span;
    const incoming = index === 0 ? 0 : (1 - smooth(phase / 0.3)) * 35;
    const outgoing = index === count - 1 ? 0 : smooth((phase - 0.7) / 0.3) * -26;
    return incoming + outgoing;
  });

  const scale = useTransform(progress, (position) => {
    const phase = (position - start) / span;
    const incoming = index === 0 ? 0 : (1 - smooth(phase / 0.3)) * 0.055;
    const outgoing = index === count - 1 ? 0 : smooth((phase - 0.75) / 0.25) * 0.025;
    return 1 - incoming - outgoing;
  });

  const rotate = useTransform(progress, (position) => {
    const phase = (position - start) / span;
    const direction = index % 2 === 0 ? -1 : 1;
    const incoming = index === 0 ? 0 : (1 - smooth(phase / 0.35)) * direction * 1.2;
    const outgoing = index === count - 1 ? 0 : smooth((phase - 0.7) / 0.3) * direction * -0.65;
    return incoming + outgoing;
  });

  const blur = useTransform(progress, (position) => {
    const phase = (position - start) / span;
    const incoming = index === 0 ? 0 : (1 - smooth(phase / 0.3)) * 4;
    const outgoing = index === count - 1 ? 0 : smooth((phase - 0.75) / 0.25) * 3;
    return `blur(${(incoming + outgoing).toFixed(2)}px)`;
  });

  return (
    <motion.figure className="fx-media-photo" aria-hidden={!reduced && !active} style={reduced ? undefined : { opacity, y, scale, rotate, filter: blur }}>
      <span className="fx-media-photo-frame">
        <img src={scene.image} alt={scene.imageAlt} className="fx-media-photo-image" loading={index === 0 ? "eager" : "lazy"} decoding="async" draggable={false} onError={(event) => { if (index === 0 && !event.currentTarget.dataset.fallback) { event.currentTarget.dataset.fallback = "true"; event.currentTarget.src = "/assets/album/PRVW/PRVW-04.jpg"; } }} />
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
    const position = Math.min(0.999999, Math.max(0, value));
    const next = Math.floor(position * SCENES.length);
    setActiveIndex((current) => current === next ? current : next);
  });

  return (
    <section id={id} ref={section} className={`fx-media-sequence${reduced ? " is-reduced" : ""}`} aria-label="Original USER FX photographs, revealed by scrolling">
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
