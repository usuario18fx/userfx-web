"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useAdminMode } from "@/components/PrivateRoom/PR-AdminMode";
import { SCENES, type Scene } from "./fxScenes";
import "./MediaScrollPanel.css";

const CrownRose = dynamic(() => import("./ProtocolCrown3D"), { ssr: false });
type Mode = "photos" | "videos";

function MediaTile({ scene, index, mode, progress }: {
  scene: Scene; index: number; mode: Mode; progress: MotionValue<number>;
}) {
  const reduced = useReducedMotion();
  const admin = useAdminMode();
  const link = useRef<HTMLAnchorElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const visible = useRef(false);
  const start = .04 + index * .22;
  const end = start + .15;
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const y = useTransform(progress, [start, end], [36, 0]);
  const clipPath = useTransform(progress, [start, end], ["inset(0% 0% 100% 0% round 16px)", "inset(0% 0% 0% 0% round 16px)"]);
  const poster = index === 0 ? "/assets/album/PRVW/PRVW-00.jpg" : scene.image;
  const feature = (scene.id === "videocall" ? "myroom" : scene.id) as Parameters<typeof admin.requestFeature>[0];

  const sync = useCallback((p: number) => {
    const shown = Boolean(reduced) || p > start;
    link.current?.toggleAttribute("inert", !shown);
    const el = video.current;
    if (!el) return;
    if (shown && visible.current && !document.hidden) void el.play().catch(() => {});
    else el.pause();
  }, [reduced, start]);
  useMotionValueEvent(progress, "change", sync);
  useEffect(() => {
    const el = link.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      sync(progress.get());
    });
    observer.observe(el);
    sync(progress.get());
    const pause = () => {
      if (document.hidden) video.current?.pause();
      else sync(progress.get());
    };
    document.addEventListener("visibilitychange", pause);
    const media = video.current;
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", pause); media?.pause(); };
  }, [progress, sync]);

  return <motion.a ref={link} className="fx-media-tile" href={scene.href}
    aria-label={`${scene.title} · ${scene.subtitle}`}
    style={reduced ? undefined : { opacity, y, clipPath }}
    onClick={event => { if (admin.requestFeature(feature)) event.preventDefault(); }}>
    {mode === "videos" ? <video ref={video} src={`/room${index + 1}.mp4`} poster={poster} muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1}/>
      : <img src={poster} alt={scene.imageAlt} loading="lazy" decoding="async" draggable={false}/>}
    <span className="fx-media-shade" aria-hidden="true"/>
    <span className="fx-media-top" aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span><i/><span className="fx-media-symbol">{mode === "videos" ? "▷" : "◇"}</span></span>
    <span className="fx-media-label"><strong>{scene.title}</strong><small>{scene.subtitle}</small></span>
  </motion.a>;
}

export default function MediaScrollPanel({ mode, id }: { mode: Mode; id: string }) {
  const section = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  return <section id={id} ref={section} className={`fx-media-sequence${reduced ? " is-reduced" : ""}`}
    aria-label={mode === "photos" ? "Explore UserFX spaces" : "Four UserFX room videos"}>
    <div className="fx-media-stage">
      <div className="fx-media-backdrop" aria-hidden="true"><CrownRose progress={scrollYProgress} dissolveAt={2}/></div>
      <div className="fx-media-grid">{SCENES.slice(0,4).map((scene,index) => <MediaTile key={scene.id} scene={scene} index={index} mode={mode} progress={scrollYProgress}/>)}</div>
    </div>
  </section>;
}
