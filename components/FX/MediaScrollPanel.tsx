"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import "./MediaScrollPanel.css";

const CrownRose = dynamic(() => import("./ProtocolCrown3D"), { ssr: false });

const PHOTOS = [
  "/assets/album/pic00.png",
  "/assets/album/pic01.png",
  "/assets/album/pic02.png",
  "/assets/album/pic03.png",
] as const;

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

const TIMELINE = {
  desktop: [
    { enter: [0.05, 0.14], leave: [0.47, 0.59] },
    { enter: [0.21, 0.31], leave: [0.61, 0.72] },
    { enter: [0.49, 0.59], leave: [0.96, 1.00] },
    { enter: [0.65, 0.74], leave: [0.96, 1.00] },
  ],
  mobile: [
    { enter: [0.05, 0.15], leave: [0.21, 0.27] },
    { enter: [0.27, 0.37], leave: [0.43, 0.49] },
    { enter: [0.49, 0.59], leave: [0.64, 0.70] },
    { enter: [0.70, 0.80], leave: [0.83, 0.90] },
  ],
} as const;

function PhotoScene({ src, index, progress, compact, reduced }: {
  src: string;
  index: number;
  progress: MotionValue<number>;
  compact: boolean;
  reduced: boolean;
}) {
  const step = (compact ? TIMELINE.mobile : TIMELINE.desktop)[index];
  const [entryStart, entryEnd] = step.enter;
  const [exitStart, exitEnd] = step.leave;
  const appear = (value: number) => smooth((value - entryStart) / (entryEnd - entryStart));
  const depart = (value: number) => smooth((value - exitStart) / (exitEnd - exitStart));

  const opacity = useTransform(progress, (value) => appear(value) * (1 - depart(value)));
  const translateY = useTransform(progress, (value) => (1 - appear(value)) * 58 - depart(value) * 27);
  const scale = useTransform(progress, (value) => 0.94 + appear(value) * 0.06 - depart(value) * 0.025);
  // Reference ZIP: once the fourth photo settles, the two halves slide apart
  // to reveal the still-rotating crown underneath.
  const split = useTransform(progress, (value) => {
    if (index < 2) return 0;
    return smooth((value - 0.84) / 0.13) * (index % 2 === 0 ? -1 : 1) * 112;
  });
  const clipPath = useTransform(progress, (value) => {
    const hidden = (1 - appear(value)) * 100;
    return index % 2 === 0
      ? `inset(0 ${hidden.toFixed(2)}% 0 0)`
      : `inset(0 0 0 ${hidden.toFixed(2)}%)`;
  });

  return (
    <motion.figure className={`fx-media-photo fx-media-photo--${index % 2 === 0 ? "left" : "right"}`} style={reduced ? undefined : { opacity, y: translateY, scale, x: split, clipPath }}>
      <img src={src} alt={`UserFX original photograph ${index + 1}`} className="fx-media-photo-image" loading={index < 2 ? "eager" : "lazy"} decoding="async" draggable={false} />
    </motion.figure>
  );
}

export default function MediaScrollPanel({ id }: { id: string }) {
  const section = useRef<HTMLElement>(null);
  const reduced = Boolean(useReducedMotion());
  const [compact, setCompact] = useState(false);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return (
    <section id={id} ref={section} className={`fx-media-sequence${reduced ? " is-reduced" : ""}`} aria-label="USER FX photo story controlled by scrolling">
      <div className="fx-media-stage">
        <div className="fx-media-backdrop" aria-hidden="true">
          <CrownRose progress={scrollYProgress} dissolveAt={2} />
        </div>
        <div className="fx-media-photos">
          {[0, 2].map((start) => (
            <div key={start} className="fx-media-photo-pair">
              {PHOTOS.slice(start, start + 2).map((src, offset) => (
                <PhotoScene key={src} src={src} index={start + offset} progress={scrollYProgress} compact={compact} reduced={reduced} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
