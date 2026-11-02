"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ENTER_URL } from "@/lib/content";
import { useMenu } from "./Chrome";
import { AdminModeSwitch, useAdminMode } from "@/components/PrivateRoom/PR-AdminMode";
import { SCENES, type Scene } from "./fxScenes";
import "./ScrollStory.css";

/* Franja de imagen / video: SIN texto, números ni íconos.
   Sigue siendo un enlace (con el control de admin de siempre). */
function ScrollScene({
  scene,
  i,
  progress,
}: {
  scene: Scene;
  i: number;
  progress: MotionValue<number>;
}) {
  const reduced = useReducedMotion();
  const admin = useAdminMode();
  const featureId = (scene.id === "videocall" ? "myroom" : scene.id) as Parameters<
    typeof admin.requestFeature
  >[0];

  // Cada banda se revela en su propio tramo del scroll: 01 → 02 → 03 → 04.
  const start = i * 0.22;
  const end = start + 0.12;
  const clip = useTransform(progress, [start, end], ["inset(0% 0% 100% 0%)", "inset(0% 0% 0% 0%)"]);
  const fade = useTransform(progress, [start, end], [0, 1]);
  const mediaScale = useTransform(progress, [start, end], [1.18, 1.02]);
  const revealStyle = reduced || i === 0 ? undefined : { clipPath: clip, opacity: fade };
  const mediaStyle = reduced
    ? { objectPosition: scene.position }
    : { scale: mediaScale, objectPosition: scene.position };

  return (
    <section className={"fx-scroll-scene fx-scroll-scene--" + scene.id}>
      <motion.a href={scene.href} className="fx-scroll-scene-link" aria-label={scene.title + " · " + scene.subtitle} onClick={(event) => { if (admin.requestFeature(featureId)) event.preventDefault(); }} style={revealStyle} >
        {scene.video ? (
          <motion.video className="fx-scroll-scene-image" src={scene.video} poster={scene.image} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1} style={mediaStyle} />
        ) : (
          <motion.img className="fx-scroll-scene-image" src={scene.image} alt={scene.imageAlt} loading="lazy" decoding="async" draggable={false} style={mediaStyle} />
        )}
        <span className="fx-scroll-scene-shade" aria-hidden="true" />
      </motion.a>
    </section>
  );
}

export default function ScrollStory() {
  const menu = useMenu();
  const admin = useAdminMode();
  const reduced = useReducedMotion();
  const [online, setOnline] = useState(false);

  // Progreso de scroll de la sección de bandas (0 → 1)
  const spacesRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: spacesRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const refresh = () => setOnline(navigator.onLine);
    refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  return (
    <div className="fx-scroll-story">
      <section id="home" className="fx-scroll-hero" aria-labelledby="fx-scroll-title">
        <div className="fx-scroll-hero-media" aria-hidden="true">
          <img src="/assets/album/PRVW/PRVW-04.jpg" alt="" fetchPriority="high" decoding="async" />
        </div>
        <div className="fx-scroll-hero-veil" aria-hidden="true" />
        <header className="fx-scroll-topline">
          <div className="fx-scroll-brand-wrap">
            <button type="button" className="fx-scroll-brand" aria-label="UserFX · User/Admin" onClick={() => { if (!admin.revealSwitch()) window.location.hash = "#/"; }} >
              <img src="/assets/userfx-logo-sin.png" alt="" width={38} height={38} />
              <span>
USER FX
</span>
            </button>
            <AdminModeSwitch />
          </div>
          <nav className="fx-scroll-quick-nav" aria-label="Quick navigation">
            <a href="#contact">
CONTACT US
</a>
            <button type="button" aria-label="Open site menu" onClick={menu.toggle}>
              <span />
              <span />
            </button>
          </nav>
        </header>
        <motion.div className="fx-scroll-hero-title" initial={reduced ? false : { opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }} >
          <p className="fx-scroll-overline">
USER FX / PRIVATE ROOM
</p>
          <h1 id="fx-scroll-title">
            <span>
YOUR
</span>
            <span>
MOMENT
</span>
            <span className="fx-scroll-accent">
UNFILTERED
</span>
          </h1>
          <p className="fx-scroll-hero-subtitle">
LIVE · VIDEO CALLS · PRIVATE ROOMS
</p>
          <div className="fx-scroll-emblem">
            <img src="/iconLogo.png" alt="FX emblem" width={110} height={110} loading="eager" />
            <span className={"fx-scroll-connection " + (online ? "is-online" : "is-offline")} role="status" aria-live="polite" >
              <span className="fx-scroll-connection-dot" aria-hidden="true" />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="7.5" r="3" />
                <path d="M5 20v-2a7 7 0 0 1 14 0v2" />
              </svg>
              <span>
{online ? "YOU'RE ONLINE" : "OFFLINE"}
</span>
            </span>
          </div>
          <a href={ENTER_URL} className="fx-scroll-hero-enter">
            <span>
ENTER THE VAULT
</span>
            <span aria-hidden="true">
↗
</span>
          </a>
        </motion.div>
        <a href="#spaces" className="fx-scroll-cue" aria-label="Scroll to discover the spaces">
          <span>
SCROLL TO DISCOVER
</span>
          <span aria-hidden="true">
↓
</span>
        </a>
      </section>

      <div id="spaces" ref={spacesRef} className="fx-scroll-scenes" aria-label="Explore UserFX spaces" >
        <div className="fx-scroll-stage">
          {SCENES.map((scene: Scene, i) => (
            <ScrollScene key={scene.id} scene={scene} i={i} progress={scrollYProgress} />
          ))}
        </div>
      </div>
    </div>
  );
}