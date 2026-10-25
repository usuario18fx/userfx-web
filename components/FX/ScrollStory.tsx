"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ENTER_URL } from "@/lib/content";
import { useMenu } from "./Chrome";
import { AdminModeSwitch, useAdminMode } from "@/components/PrivateRoom/PR-AdminMode";
import "./ScrollStory.css";
import "./FinalFourPhotoSummary.css";

const PANELS = [
  { id: "gallery", label: "MY GALLERY", image: "/assets/album/PRVW/PRVW-01.jpg", href: "#/private-room/gallery", position: "center 39%" },
  { id: "videocall", label: "VIDEOCALL PRIVATE", image: "/assets/album/PRVW/PRVW-04.jpg", href: "#/private-room", position: "center 48%" },
  { id: "multimedia", label: "MULTIMEDIA", image: "/assets/album/PRVW/PRVW-02.jpg", href: null, position: "center 40%" },
  { id: "stage", label: "STAGE / PASARELA", image: "/assets/album/PRVW/PRVW-03.jpg", href: "#/private-room/stage", position: "center 62%" },
] as const;

export default function ScrollStory() {
  const menu = useMenu();
  const admin = useAdminMode();
  const reduced = useReducedMotion();
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
            <img src="/iconLogo.png" alt="FX emblem" width={110} height={110} loading="eager" />
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

      <div id="spaces" className="fx-final-four-grid" aria-label="Explore the four User FX spaces">
        {PANELS.map((panel, index) => {
          const photo = (
            <>
              <img src={panel.image} alt={panel.label} loading="lazy" decoding="async" draggable={false} style={{ objectPosition: panel.position }} />
              <span className="fx-final-four-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            </>
          );
          return panel.href ? (
            <a key={panel.id} className="fx-final-four-panel" href={panel.href} aria-label={panel.label}>
              {photo}
            </a>
          ) : (
            <div key={panel.id} className="fx-final-four-panel" aria-label={panel.label}>
              {photo}
            </div>
          );
        })}
      </div>

    </div>
  );
}
