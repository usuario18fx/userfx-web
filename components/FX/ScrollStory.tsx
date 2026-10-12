"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { COURSES, ENTER_URL } from "@/lib/content";
import { useMenu } from "./Chrome";
import { Glyph } from "./Glyph";
import { Spotlight } from "./Motion";
import { AdminModeSwitch, useAdminMode } from "@/components/PrivateRoom/PR-AdminMode";
import "./ScrollStory.css";

type Scene = {
  index: string;
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  href: string;
  image: string;
  imageAlt: string;
  position?: string;
};

const SCENES: Scene[] = [
  {
    index: "01",
    id: "videocall",
    kicker: "ONE TO ONE",
    title: "VIDEO CALLS",
    subtitle: "MyRoom · your private space",
    href: "#/private-room",
    image: "/assets/videocall.jpg",
    imageAlt: "UserFX original videocall preview",
    position: "center 48%",
  },
  {
    index: "02",
    id: "stage",
    kicker: "THE SHARED MOMENT",
    title: "STAGE",
    subtitle: "Live sessions · come as you are",
    href: "#/private-room/stage",
    image: "/assets/album/PRVW/PRVW-03.jpg",
    imageAlt: "UserFX original outdoor portrait",
    position: "center 62%",
  },
  {
    index: "03",
    id: "gallery",
    kicker: "YOUR PRIVATE COLLECTION",
    title: "GALLERY",
    subtitle: "Photography · private albums",
    href: "#/private-room/gallery",
    image: "/assets/album/PRVW/PRVW-01.jpg",
    imageAlt: "UserFX original photograph",
    position: "center 39%",
  },
  {
    index: "04",
    id: "buzon",
    kicker: "KEEP THE CONVERSATION",
    title: "BUZÓN",
    subtitle: "Private messages · get in touch",
    href: "#/private-room/buzon",
    image: "/assets/album/PRVW/PRVW-02.jpg",
    imageAlt: "UserFX original sunset portrait",
    position: "center 40%",
  },
];

function SceneIcon({ id }: { id: string }) {
  return (
    <span className={"fx-scroll-scene-icon fx-scroll-scene-icon--" + id} aria-hidden="true">
      {id === "videocall" && (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="15" width="23" height="18" rx="4">
          </rect>
          <path d="m31 20 9-5v18l-9-5">
          </path>
          <circle className="fx-icon-live-light" cx="14" cy="20" r="2.4" fill="#82d99e" stroke="none">
          </circle>
        </svg>
      )}
      {id === "stage" && (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <circle cx="24" cy="24" r="5">
          </circle>
          <path className="fx-icon-spotlight" d="M24 5v11 M24 32v11 M5 24h11 M32 24h11 M10.5 10.5l8 8 M29.5 29.5l8 8 M37.5 10.5l-8 8 M18.5 29.5l-8 8">
          </path>
        </svg>
      )}
      {id === "gallery" && (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="11" width="32" height="26" rx="3">
          </rect>
          <circle cx="17" cy="19" r="3">
          </circle>
          <path className="fx-icon-gallery-hill" d="m12 32 9-9 6 6 5-5 5 8">
          </path>
        </svg>
      )}
      {id === "buzon" && (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="14" width="32" height="22" rx="3">
          </rect>
          <path className="fx-icon-envelope" d="m9 17 15 11 15-11">
          </path>
          <path d="m9 34 11-10 M39 34 28 24">
          </path>
        </svg>
      )}
    </span>
  );
}

function ScrollScene({ scene, expanded, onToggle }: { scene: Scene; expanded: boolean; onToggle: () => void }) {
  const section = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const admin = useAdminMode();
  const course = COURSES.find((item) => item.id === (scene.id === "videocall" ? "myroom" : scene.id));
  const panelId = "fx-scene-panel-" + scene.id;
  const { scrollYProgress } = useScroll({
    target: section,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.1, 1.02, 1.1]);

  return (
    <section ref={section} className={"fx-scroll-scene fx-scroll-scene--" + scene.id + (expanded ? " is-expanded" : "")} aria-labelledby={"fx-scene-" + scene.id}>
      <button type="button" className="fx-scroll-scene-link" aria-expanded={expanded} aria-controls={panelId} aria-label={(expanded ? "Close " : "Read about ") + scene.title} onClick={onToggle}>
        <motion.img src={scene.image} alt={scene.imageAlt} loading="lazy" decoding="async" draggable={false} className="fx-scroll-scene-image" style={reduced ? { objectPosition: scene.position } : { y: imageY, scale: imageScale, objectPosition: scene.position }} />
        <span className="fx-scroll-scene-shade" aria-hidden="true">
        </span>
        <span className="fx-scroll-scene-index" aria-hidden="true">
          {scene.index}
        </span>
        <SceneIcon id={scene.id} />
        <motion.span className="fx-scroll-scene-content" initial={reduced ? false : { opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <span className="fx-scroll-scene-kicker">
            {scene.index} / {scene.kicker}
          </span>
          <strong id={"fx-scene-" + scene.id}>
            {scene.title}
          </strong>
          <span className="fx-scroll-scene-subtitle">
            {scene.subtitle}
            <motion.span aria-hidden="true" animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: reduced ? 0 : 0.3 }}>
              ↓
            </motion.span>
          </span>
          <span className="fx-scroll-scene-discover" aria-hidden="true">
            {expanded ? "CLOSE DETAILS −" : "DISCOVER THE SPACE +"}
          </span>
        </motion.span>
        <span className="fx-scroll-scene-watermark" aria-hidden="true">
          {scene.index}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && course && (
          <motion.div key={scene.id} id={panelId} role="region" aria-label={"About " + scene.title} className="fx-scroll-scene-panel" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduced ? 0 : 0.46, ease: [0.22, 1, 0.36, 1] }} onAnimationComplete={() => {
            const panel = document.getElementById(panelId);
            if (panel && section.current?.classList.contains("is-expanded")) panel.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
          }}>
            <div className="fx-scroll-scene-panel-inner">
              <motion.div className="fx-scroll-protocol-reveal" initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: reduced ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}>
                <Spotlight className="glass fx-scroll-protocol-card">
                  <div className="fx-scroll-protocol-card-heading">
                    <span className="fx-scroll-protocol-step">
                      {scene.index}
                    </span>
                    <span className="fx-scroll-protocol-rule" aria-hidden="true">
                    </span>
                    <span className="fx-scroll-protocol-level">
                      {course.level}
                    </span>
                    <span className="fx-scroll-protocol-glyph" aria-hidden="true">
                      <Glyph name={course.glyph} />
                    </span>
                  </div>
                  <h3 className="fx-scroll-protocol-title">
                    {course.name}
                  </h3>
                  <p className="fx-scroll-protocol-description">
                    {course.blurb}
                  </p>
                  <dl className="fx-scroll-protocol-metrics">
                    {course.metrics.map((metric) => (
                      <div key={metric.label} className="glass-tile fx-scroll-protocol-metric">
                        <dt>
                          {metric.label}
                        </dt>
                        <dd>
                          {metric.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <a href={scene.href} className="fx-scroll-protocol-enter" onClick={(event) => { if (admin.requestFeature(course.id)) event.preventDefault(); }}>
                    <span>
                      OPEN {course.name.toUpperCase()}
                    </span>
                    <Glyph name="caret" />
                  </a>
                </Spotlight>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default function ScrollStory() {
  const menu = useMenu();
  const admin = useAdminMode();
  const reduced = useReducedMotion();
  const [expandedScene, setExpandedScene] = useState<string | null>(null);
  const [online, setOnline] = useState(false);

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
        <div className="fx-scroll-hero-veil" aria-hidden="true">
        </div>
        <header className="fx-scroll-topline">
          <div className="fx-scroll-brand-wrap">
            <button type="button" className="fx-scroll-brand" aria-label="UserFX · User/Admin" onClick={() => { if (!admin.revealSwitch()) window.location.hash = "#/"; }}>
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
              <span>
              </span>
              <span>
              </span>
            </button>
          </nav>
        </header>
        <motion.div className="fx-scroll-hero-title" initial={reduced ? false : { opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}>
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
            <img src="/iconFX.png" alt="FX emblem" width={106} height={106} loading="eager" />
            <span className={"fx-scroll-connection " + (online ? "is-online" : "is-offline")} role="status" aria-live="polite">
              <span className="fx-scroll-connection-dot" aria-hidden="true">
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="7.5" r="3">
                </circle>
                <path d="M5 20v-2a7 7 0 0 1 14 0v2">
                </path>
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

      <div id="spaces" className="fx-scroll-scenes" aria-label="Explore UserFX spaces">
        {SCENES.map((scene) => (
          <ScrollScene key={scene.id} scene={scene} expanded={expandedScene === scene.id} onToggle={() => setExpandedScene((current) => current === scene.id ? null : scene.id)} />
        ))}
      </div>

    </div>
  );
}
