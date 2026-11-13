"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useMenu } from "./Chrome";
import { AdminModeSwitch, useAdminMode } from "@/components/PrivateRoom/PR-AdminMode";
import "./ScrollStory.css";

export default function ScrollStory({ onOpenTelegram }: { onOpenTelegram: () => void }) {
  const reduced = useReducedMotion();
  const menu = useMenu();
  const admin = useAdminMode();
  const hero = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: hero, offset: ["start start", "end start"] });
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const asideY = useTransform(scrollYProgress, [0, 1], [0, -36]);
  const asideOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <div className="fx-scroll-story">
      <section ref={hero} id="landing" className="fx-scroll-hero" aria-labelledby="fx-scroll-title">
        <span className="fx-scroll-axis" aria-hidden="true" />
        <header className="fx-scroll-topline">
          <div className="fx-scroll-brand-wrap">
            <button type="button" className="fx-scroll-brand" aria-label="USER FX home" onClick={() => { if (!admin.revealSwitch()) window.location.hash = "#/"; }}>
              <img src="/assets/userfx-logo-sin.png" alt="" width={34} height={34} />
              <span>
                USER FX
              </span>
            </button>
            <AdminModeSwitch />
          </div>
          <nav className="fx-scroll-quick-nav" aria-label="Landing navigation">
            <a href="#protocol">
              PROTOCOL
            </a>
            <a href="#spaces">
              INSIDE
            </a>
            <a href="#access">
              ACCESS
            </a>
            <button type="button" aria-label="Open full navigation" onClick={menu.toggle}>
              <span />
              <span />
            </button>
          </nav>
        </header>
        <div className="fx-scroll-hero-grid">
          <motion.div className="fx-scroll-parallax" style={reduced ? undefined : { y: titleY, opacity: titleOpacity }}>
            <motion.div className="fx-scroll-hero-title" initial={reduced ? false : { opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}>
              <p className="fx-scroll-overline">
                <b>
                  01
                </b>
                <i aria-hidden="true" />
                <span>
                  YOUR MOMENT
                </span>
              </p>
              <h1 id="fx-scroll-title">
                <span>
                  YOUR
                </span>
                <span>
                  PRIVATE
                </span>
                <span className="fx-scroll-accent">
                  ROOM
                </span>
              </h1>
              <p className="fx-scroll-hero-subtitle">
                unlocked with your code.
              </p>
              <button type="button" className="fx-telegram-launch fx-telegram-launch--hero" aria-label="Verify Telegram username" title="Telegram identity" onClick={onOpenTelegram}>
                <span role="img" aria-hidden="true">
                  👤
                </span>
              </button>
            </motion.div>
          </motion.div>
          <div className="fx-rose-stage">
            <div className="fx-rose-stage-particles">
              {/* Espacio reservado para la rosa de partículas de la portada. */}
            </div>
          </div>
          <motion.div className="fx-scroll-parallax fx-scroll-parallax--aside" style={reduced ? undefined : { y: asideY, opacity: asideOpacity }}>
            <motion.aside className="fx-scroll-hero-aside" initial={reduced ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25, duration: 0.85 }}>
              <strong>
                01
              </strong>
              <p>
                PRIVATE ACCESS
                <span>
                  USER FX
                </span>
                <span>
                  CONTROLLED BY YOUR SCROLL
                </span>
              </p>
              <a href="#protocol" className="fx-scroll-cue">
                <span>
                  SCROLL DOWN
                </span>
                <span aria-hidden="true">
                  ↓
                </span>
              </a>
            </motion.aside>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
