"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { BOT_URL, ENTER_URL } from "@/lib/content";
import { useMenu } from "./Chrome";
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
];

function ScrollScene({ scene }: { scene: Scene }) {
  const section = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: section,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.1, 1.02, 1.1]);

  return (
    <section ref={section} className={"fx-scroll-scene fx-scroll-scene--" + scene.id} aria-labelledby={"fx-scene-" + scene.id}>
      <a href={scene.href} className="fx-scroll-scene-link" aria-label={"Open " + scene.title}>
        <motion.img src={scene.image} alt={scene.imageAlt} loading="lazy" decoding="async" draggable={false} className="fx-scroll-scene-image" style={reduced ? undefined : { y: imageY, scale: imageScale, objectPosition: scene.position }} />
        <span className="fx-scroll-scene-shade" aria-hidden="true">
        </span>
        <span className="fx-scroll-scene-index" aria-hidden="true">
          {scene.index}
        </span>
        <motion.span className="fx-scroll-scene-content" initial={reduced ? false : { opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <span className="fx-scroll-scene-kicker">
            {scene.index} / {scene.kicker}
          </span>
          <strong id={"fx-scene-" + scene.id}>
            {scene.title}
          </strong>
          <span className="fx-scroll-scene-subtitle">
            {scene.subtitle}
            <span aria-hidden="true">
              ↗
            </span>
          </span>
        </motion.span>
        <span className="fx-scroll-scene-watermark" aria-hidden="true">
          {scene.index}
        </span>
      </a>
    </section>
  );
}

export default function ScrollStory() {
  const menu = useMenu();
  const admin = useAdminMode();
  const reduced = useReducedMotion();

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
          <ScrollScene key={scene.id} scene={scene} />
        ))}
      </div>

      <section id="protocol" className="fx-scroll-interlude" aria-labelledby="fx-scroll-protocol-title">
        <span className="fx-scroll-interlude-line" aria-hidden="true">
        </span>
        <p className="fx-scroll-overline">
          YOUR PRIVATE CLUB
        </p>
        <h2 id="fx-scroll-protocol-title">
          One identity.
          <em>
            Endless moments.
          </em>
        </h2>
        <p>
          Your room. A shared stage. Your private collection. Every space begins with your own access.
        </p>
        <a href="#/private-room/buzon" className="fx-scroll-text-link">
          EXPLORE BUZÓN <span aria-hidden="true">↗</span>
        </a>
      </section>

      <section id="access" className="fx-scroll-access" aria-labelledby="fx-scroll-access-title">
        <div className="fx-scroll-access-intro">
          <p className="fx-scroll-overline">
            PRIVATE ACCESS
          </p>
          <h2 id="fx-scroll-access-title">
            YOUR KEY.
            <span>
              YOUR RULES.
            </span>
          </h2>
        </div>
        <div className="fx-scroll-code-line" aria-label="Access code types">
          <span className="fx-scroll-code-label">
            ACCESS CODE
          </span>
          <span>
            BASIC <b>/ BSIC</b>
          </span>
          <span>
            PRO <b>/ PRX0</b>
          </span>
          <span>
            VIP <b>/ VIPX</b>
          </span>
        </div>
        <div className="fx-scroll-access-links">
          <a href={BOT_URL} target="_blank" rel="noreferrer">
            GET MY CODE <span aria-hidden="true">↗</span>
          </a>
          <a href={ENTER_URL}>
            ENTER A CODE <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <footer id="contact" className="fx-scroll-footer">
        <div className="fx-scroll-footer-mark">
          <img src="/iconFX.png" alt="" width={66} height={66} loading="lazy" />
          <span>
            USER FX / 2026
          </span>
        </div>
        <div className="fx-scroll-footer-links" aria-label="Footer">
          <a href="#/private-room">
            MYROOM ↗
          </a>
          <a href="#/private-room/stage">
            STAGE ↗
          </a>
          <a href="#/private-room/gallery">
            GALLERY ↗
          </a>
          <a href="#/private-room/buzon">
            BUZÓN ↗
          </a>
          <a href={BOT_URL} target="_blank" rel="noreferrer">
            SUPPORT ↗
          </a>
          <a href="/privacy">
            PRIVACY ↗
          </a>
        </div>
        <p>
          PRIVATE ACCESS · AGE 18+ · PERSONAL AND NON-TRANSFERABLE
        </p>
      </footer>
    </div>
  );
}
