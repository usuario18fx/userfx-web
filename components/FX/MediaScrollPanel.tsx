"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useAdminMode } from "@/components/PrivateRoom/PR-AdminMode";
import { SCENES, type Scene } from "./fxScenes";
import "./MediaScrollPanel.css";

const CrownRose = dynamic(() => import("./ProtocolCrown3D"), { ssr: false });
const PHOTO_COUNT = 4;
const PHOTO_FADE = 0.06;
type Mode = "photos" | "videos";

function MediaTile({ scene, index, mode, progress }: {
  scene: Scene;
  index: number;
  mode: Mode;
  progress: MotionValue<number>;
}) {
  const reduced = useReducedMotion();
  const admin = useAdminMode();
  const link = useRef<HTMLAnchorElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const visible = useRef(false);
  const videoStart = 0.04 + index * 0.22;
  const videoEnd = videoStart + 0.15;
  const videoOpacity = useTransform(progress, [videoStart, videoEnd], [0, 1]);
  const videoY = useTransform(progress, [videoStart, videoEnd], [36, 0]);
  const videoClip = useTransform(progress, [videoStart, videoEnd], [
    "inset(0% 0% 100% 0% round 16px)",
    "inset(0% 0% 0% 0% round 16px)",
  ]);
  const photoOpacity = useTransform(progress, (position) => {
    const from = index / PHOTO_COUNT;
    const to = (index + 1) / PHOTO_COUNT;
    const entering = index === 0 ? 1 : Math.min(1, Math.max(0, (position - from + PHOTO_FADE) / PHOTO_FADE));
    const leaving = index === PHOTO_COUNT - 1 ? 1 : Math.min(1, Math.max(0, (to - position) / PHOTO_FADE));
    return Math.min(entering, leaving);
  });
  const feature = (scene.id === "videocall" ? "myroom" : scene.id) as Parameters<typeof admin.requestFeature>[0];

  const sync = useCallback((position: number) => {
    const shown = Boolean(reduced) || (mode === "photos"
      ? position >= index / PHOTO_COUNT - PHOTO_FADE && (index === PHOTO_COUNT - 1 || position < (index + 1) / PHOTO_COUNT)
      : position > videoStart);
    link.current?.toggleAttribute("inert", !shown);
    const element = video.current;
    if (!element) return;
    if (shown && visible.current && !document.hidden) void element.play().catch(() => {});
    else element.pause();
  }, [index, mode, reduced, videoStart]);

  useMotionValueEvent(progress, "change", sync);

  useEffect(() => {
    const element = link.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      sync(progress.get());
    });
    observer.observe(element);
    sync(progress.get());

    const handleVisibility = () => {
      if (document.hidden) video.current?.pause();
      else sync(progress.get());
    };
    document.addEventListener("visibilitychange", handleVisibility);
    const currentVideo = video.current;
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      currentVideo?.pause();
    };
  }, [progress, sync]);

  return (
    <motion.a ref={link} className="fx-media-tile" href={scene.href} aria-label={`${scene.title} · ${scene.subtitle}`} style={reduced ? undefined : mode === "photos" ? { opacity: photoOpacity } : { opacity: videoOpacity, y: videoY, clipPath: videoClip }} onClick={(event) => { if (admin.requestFeature(feature)) event.preventDefault(); }}>
      {mode === "videos" ? (
        <video ref={video} src={`/room${index + 1}.mp4`} poster={scene.image} muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1} />
      ) : (
        <img src={scene.image} alt={scene.imageAlt} loading={index === 0 ? "eager" : "lazy"} decoding="async" draggable={false} />
      )}
      {mode === "videos" ? (
        <>
          <span className="fx-media-shade" aria-hidden="true" />
          <span className="fx-media-top" aria-hidden="true">
            <span>
              {String(index + 1).padStart(2, "0")}
            </span>
            <i />
            <span className="fx-media-symbol">
              ▷
            </span>
          </span>
          <span className="fx-media-label">
            <strong>
              {scene.title}
            </strong>
            <small>
              {scene.subtitle}
            </small>
          </span>
        </>
      ) : null}
    </motion.a>
  );
}

export default function MediaScrollPanel({ mode, id }: { mode: Mode; id: string }) {
  const section = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });

  return (
    <section id={id} ref={section} className={`fx-media-sequence fx-media-sequence--${mode}${reduced ? " is-reduced" : ""}`} aria-label={mode === "photos" ? "Explore UserFX spaces" : "Four UserFX room videos"}>
      <div className="fx-media-stage">
        <div className="fx-media-backdrop" aria-hidden="true">
          <CrownRose progress={scrollYProgress} dissolveAt={2} />
        </div>
        <div className={`fx-media-grid fx-media-grid--${mode}`}>
          {SCENES.slice(0, PHOTO_COUNT).map((scene, index) => (
            <MediaTile key={scene.id} scene={scene} index={index} mode={mode} progress={scrollYProgress} />
          ))}
        </div>
      </div>
    </section>
  );
}
