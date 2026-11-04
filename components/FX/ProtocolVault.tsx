"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import ProtocolCrown, { type CrownTL } from "./ProtocolCrown";
import "./ProtocolVault.css";

export type VaultStep = {
  title: string;
  text: ReactNode;
  cta: string;
  href: string;
  external?: boolean;
};

type Props = {
  id?: string;
  eyebrowIndex?: string;
  eyebrow: string;
  title: ReactNode;
  intro: ReactNode;
  steps: VaultStep[];
  photos?: readonly string[];
  rooms?: readonly string[];
  roomTags?: readonly string[];
};

const PHOTO_IMAGES = [
  "/assets/album/pic00.png",
  "/assets/album/pic01.png",
  "/assets/album/pic02.png",
  "/assets/album/pic03.png",
] as const;

const ROOM_VIDEOS = [
  "/assets/my-room/room1.mp4",
  "/assets/my-room/room2.mp4",
  "/assets/my-room/room3.mp4",
  "/assets/my-room/room4.mp4",
] as const;

const LEFT_HIDDEN = "inset(0% 100% 0% 0%)";
const RIGHT_HIDDEN = "inset(0% 0% 0% 100%)";
const VISIBLE = "inset(0% 0% 0% 0%)";
const ROOM_CORNERS = [
  "inset(0% 100% 100% 0%)",
  "inset(0% 0% 100% 100%)",
  "inset(100% 100% 0% 0%)",
  "inset(100% 0% 0% 100%)",
] as const;

const STEP_ANGLE = 32;
const STEP_SCROLL = 60;
const PHOTO_SCROLL = 45;
const VIDEO_STEP = 70;

const clamp = (n: number) => Math.max(0, Math.min(1, n));

function timeline(steps: number) {
  const textEnd = Math.max(1, steps - 1) * STEP_SCROLL;
  const photoEnd = textEnd + PHOTO_SCROLL * 4;
  const outroEnd = photoEnd + 40;
  const videoStart = outroEnd + 100;
  const D = videoStart + 80 + VIDEO_STEP * 3 + 45 + 65;
  const segment = (a: number, b: number): [number, number] => [a / D, b / D];
  return {
    D,
    stepEnd: textEnd / D,
    photosStart: textEnd / D,
    contentOut: segment(textEnd - 30, textEnd + 12),
    seam: segment(textEnd - 16, textEnd + 8),
    photos: [0, 1, 2, 3].map((i) => segment(textEnd + i * PHOTO_SCROLL, textEnd + (i + 1) * PHOTO_SCROLL)),
    descend: segment(textEnd + 95, textEnd + 125),
    outro: segment(photoEnd, outroEnd),
    rise: segment(outroEnd, videoStart + 40),
    breakStart: (videoStart + 40) / D,
    fade: segment(videoStart + 300, videoStart + 380),
    rooms: [0, 1, 2, 3].map((i) => segment(videoStart + 80 + i * VIDEO_STEP, videoStart + 80 + i * VIDEO_STEP + 45)),
  };
}

function ProtocolCard({ step, number }: { step: VaultStep; number: number }) {
  return (
    <>
      <div className="pv-card-head">
        <span className="pv-card-num">
          {String(number).padStart(2, "0")}
        </span>
        <span className="pv-card-rule" aria-hidden="true" />
      </div>
      <h3 className="pv-card-title">
        {step.title}
      </h3>
      <p className="pv-card-text">
        {step.text}
      </p>
      <a className="pv-card-cta" href={step.href} target={step.external ? "_blank" : undefined} rel={step.external ? "noopener noreferrer" : undefined}>
        <span>
          {step.cta}
        </span>
        <span aria-hidden="true">
          ↗
        </span>
      </a>
    </>
  );
}

function DrumStep({ step, index, active, selected, height, radius }: {
  step: VaultStep;
  index: number;
  active: MotionValue<number>;
  selected: boolean;
  height: number;
  radius: number;
}) {
  const opacity = useTransform(active, (value) => Math.max(0.07, 1 - Math.abs(value - index) * 0.62));
  return (
    <div className="pv-slot" style={{ height, marginTop: -height / 2, transform: "rotateX(" + (-index * STEP_ANGLE) + "deg) translateZ(" + radius + "px)" }}>
      <motion.article className={"pv-card" + (selected ? " is-active" : "")} aria-hidden={!selected} inert={!selected} style={{ opacity }}>
        <ProtocolCard step={step} number={index + 1} />
      </motion.article>
    </div>
  );
}

function CombinationDial({ active }: { active: MotionValue<number> }) {
  const rotate = useTransform(active, (value) => -value * 72);
  return (
    <div className="pv-dial" aria-hidden="true">
      <motion.svg viewBox="-200 -200 400 400" style={{ rotate }}>
        <circle r="190" className="pv-dial-ring" />
        <circle r="128" className="pv-dial-ring pv-dial-ring--inner" />
        {Array.from({ length: 60 }, (_, index) => (
          <line key={index} x1="0" x2="0" y1="-190" y2={index % 5 === 0 ? -170 : -180} transform={"rotate(" + index * 6 + ")"} className={index % 5 === 0 ? "pv-dial-tick pv-dial-tick--major" : "pv-dial-tick"} />
        ))}
        {Array.from({ length: 12 }, (_, index) => (
          <text key={index} x="0" y="-146" textAnchor="middle" transform={"rotate(" + index * 30 + ")"} className="pv-dial-num">
            {index}
          </text>
        ))}
      </motion.svg>
    </div>
  );
}

function PhotoPanel({ src, index, progress, range, flat }: {
  src: string;
  index: number;
  progress: MotionValue<number>;
  range: [number, number];
  flat: boolean;
}) {
  const clipPath = useTransform(progress, range, [index % 2 === 0 ? LEFT_HIDDEN : RIGHT_HIDDEN, VISIBLE]);
  const scale = useTransform(progress, range, [1.09, 1]);
  return (
    <motion.figure className="pv-pic" style={flat ? undefined : { clipPath }}>
      <motion.div className="pv-pic-zoom" style={flat ? undefined : { scale }}>
        <img src={src} alt={"USER FX photo " + (index + 1)} decoding="async" loading={index < 2 ? "eager" : "lazy"} draggable={false} />
      </motion.div>
    </motion.figure>
  );
}

function VideoQuadrant({ src, index, tag, progress, range, enabled, flat }: {
  src: string;
  index: number;
  tag: string;
  progress: MotionValue<number>;
  range: [number, number];
  enabled: boolean;
  flat: boolean;
}) {
  const clipPath = useTransform(progress, range, [ROOM_CORNERS[index], VISIBLE]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!enabled) {
      video.pause();
      return;
    }
    video.muted = true;
    void video.play().catch(() => {});
    return () => video.pause();
  }, [enabled]);

  return (
    <motion.figure className="pv-room" style={flat ? undefined : { clipPath }}>
      <div className="pv-room-media">
        <video ref={videoRef} src={src} className={"pv-room-video" + (ready ? " is-live" : "")} muted loop playsInline preload="auto" disablePictureInPicture onCanPlay={() => setReady(true)} aria-label={"Room " + (index + 1)} />
      </div>
      <div className="pv-room-shade" aria-hidden="true" />
      <figcaption className="pv-room-tag">
        <i>
          {String(index + 1).padStart(2, "0")}
        </i>
        <span>
          {tag}
        </span>
      </figcaption>
    </motion.figure>
  );
}

export default function ProtocolVault({
  id = "protocol",
  eyebrowIndex = "02",
  eyebrow,
  title,
  intro,
  steps,
  photos = PHOTO_IMAGES,
  rooms = ROOM_VIDEOS,
  roomTags = ["SPCL", "BSIC", "PRX0", "VIPX"],
}: Props) {
  const reduced = Boolean(useReducedMotion());
  const host = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const config = useMemo(() => timeline(steps.length), [steps.length]);
  const { scrollYProgress } = useScroll({ target: host, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.35 });

  const active = useTransform(smooth, [0, config.stepEnd], [0, steps.length - 1]);
  const drumRotation = useTransform(smooth, [0, config.stepEnd], [0, (steps.length - 1) * STEP_ANGLE]);
  const contentOpacity = useTransform(smooth, config.contentOut, [1, 0]);
  const seamOpacity = useTransform(smooth, config.seam, [0, 1]);
  const roseScale = useTransform(smooth, [0, 1], [1.05, 1.18]);
  const roseOpacity = useTransform(smooth, [0, config.photosStart, config.rise[0], 1], [0.70, 0.55, 0.65, 0.50]);
  const photoLift = useTransform(smooth, config.outro, ["0%", "-5%"]);
  const [selected, setSelected] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [inView, setInView] = useState(false);
  const revealedRef = useRef(0);

  useMotionValueEvent(active, "change", (value) => {
    const next = Math.round(value);
    setSelected((last) => last === next ? last : next);
  });

  useMotionValueEvent(smooth, "change", (value) => {
    let count = 0;
    for (const range of config.rooms) if (value >= range[0]) count++;
    if (count !== revealedRef.current) {
      revealedRef.current = count;
      setRevealed(count);
    }
  });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "10% 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    contentRef.current?.toggleAttribute("inert", selected >= steps.length - 1 && smooth.get() > config.contentOut[1]);
  }, [selected, smooth, config]);

  const crownTL: CrownTL = useMemo(() => ({
    descend: config.descend,
    rise: config.rise,
    breakStart: config.breakStart,
    fade: config.fade,
  }), [config]);

  const height = 400;
  const radius = Math.round(height / 2 / Math.tan((STEP_ANGLE / 2) * (Math.PI / 180)));
  const flat = reduced;

  const head = (
    <div className="pv-left">
      <p className="pv-eyebrow">
        <b>
          {eyebrowIndex}
        </b>
        <i aria-hidden="true" />
        <span>
          {eyebrow}
        </span>
      </p>
      <h2 className="pv-title">
        {title}
      </h2>
      <p className="pv-intro">
        {intro}
      </p>
      <p className="pv-counter" aria-live="polite">
        <b>
          {String(selected + 1).padStart(2, "0")}
        </b>
        {" / " + String(steps.length).padStart(2, "0")}
      </p>
    </div>
  );

  return (
    <section id={id} ref={host} className={"pv pv--reference" + (flat ? " pv--flat" : "")} style={flat ? undefined : { height: "calc(100svh + " + config.D + "svh)" }}>
      <div id="spaces" className="pv-inside-anchor" style={{ top: "calc(100svh + " + (config.D * config.photosStart) + "svh)" }} aria-hidden="true" />
      <div className="pv-bg" aria-hidden="true" style={flat ? undefined : { visibility: inView ? "visible" : "hidden" }}>
        <motion.div className="pv-rose" style={flat ? undefined : { scale: roseScale, opacity: roseOpacity }}>
          <img src="/assets/iconos/rosa1.png" alt="" draggable={false} />
        </motion.div>
        {!flat && (
          <div className="pv-crown-wrap">
            <ProtocolCrown progress={smooth} tl={crownTL} active={inView} />
          </div>
        )}
        <motion.span className="pv-seam" style={flat ? undefined : { opacity: seamOpacity }} />
        <span className="pv-vignette" />
      </div>
      <div className="pv-stage">
        <motion.div ref={contentRef} className="pv-content" style={flat ? undefined : { opacity: contentOpacity }}>
          {head}
          {flat ? (
            <div className="pv-flat-list">
              {steps.map((step, index) => (
                <article key={index} className="pv-card is-active">
                  <ProtocolCard step={step} number={index + 1} />
                </article>
              ))}
            </div>
          ) : (
            <div className="pv-right">
              <CombinationDial active={active} />
              <span className="pv-pointer" aria-hidden="true" />
              <div className="pv-viewport">
                <motion.div className="pv-drum" style={{ rotateX: drumRotation, z: -radius }}>
                  {steps.map((step, index) => (
                    <DrumStep key={index} step={step} index={index} active={active} selected={selected === index} height={height} radius={radius} />
                  ))}
                </motion.div>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div className="pv-pics" style={flat ? undefined : { y: photoLift }}>
          <div className="pv-pics-half pv-pics-half--left">
            <PhotoPanel src={photos[0]} index={0} progress={smooth} range={config.photos[0]} flat={flat} />
            <PhotoPanel src={photos[2]} index={2} progress={smooth} range={config.photos[2]} flat={flat} />
          </div>
          <div className="pv-pics-half pv-pics-half--right">
            <PhotoPanel src={photos[1]} index={1} progress={smooth} range={config.photos[1]} flat={flat} />
            <PhotoPanel src={photos[3]} index={3} progress={smooth} range={config.photos[3]} flat={flat} />
          </div>
        </motion.div>
      </div>
      <section id="rooms" className="pv-rooms" aria-label="USER FX private room previews">
        <div className="pv-rooms-inner">
          {rooms.slice(0, 4).map((src, index) => (
            <VideoQuadrant key={src} src={src} index={index} tag={roomTags[index] || ""} progress={smooth} range={config.rooms[index]} enabled={flat || (inView && revealed > index)} flat={flat} />
          ))}
          <span className="pv-rooms-cross" aria-hidden="true" />
        </div>
      </section>
    </section>
  );
}
