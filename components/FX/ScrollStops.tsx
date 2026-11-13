"use client";

import { useEffect, useRef, useState } from "react";
import { STOP_T, stepIndex, type StepKey } from "./tourTimeline";
import { travelToPosition } from "./Motion";
import "./ScrollStops.css";

const STOPS = [
  { label: "Welcome", key: "welcome" as StepKey },
  { label: "My Gallery", key: "gallery-lock" as StepKey },
  { label: "Videocall", key: "videocall-lock" as StepKey },
  { label: "Multimedia", key: "multimedia-lock" as StepKey },
  { label: "Pasarella", key: "stage-lock" as StepKey },
  { label: "Protocol Step 1", id: "protocol" },
  { label: "Your Access Level", id: "access" },
  { label: "Good Questions", id: "faq" },
] as const;

export default function ScrollStops() {
  const [active, setActive] = useState(0);
  const [compact, setCompact] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const tour = document.getElementById("home");
      if (!tour) return;
      const top = tour.getBoundingClientRect().top + window.scrollY;
      const range = Math.max(1, tour.offsetHeight - window.innerHeight);
      const y = window.scrollY;
      const roomRect = tour.getBoundingClientRect();
      const optionsVisible = roomRect.top <= window.innerHeight * 0.35 && roomRect.bottom > window.innerHeight * 0.35 && Boolean(tour.querySelector(".fx-puzzle.is-in .fx-pz-menu"));
      const protocol = document.getElementById("protocol");
      const access = document.getElementById("access");
      const faq = document.getElementById("faq");
      const cutoff = window.innerHeight * 0.35;
      const inContent = [protocol, access, faq].some((el) => el && el.getBoundingClientRect().top <= cutoff && el.getBoundingClientRect().bottom > 0);
      setCompact(optionsVisible || inContent);
      if (faq && faq.getBoundingClientRect().top <= cutoff) return setActive(7);
      if (access && access.getBoundingClientRect().top <= cutoff) return setActive(6);
      if (protocol && protocol.getBoundingClientRect().top <= cutoff) return setActive(5);
      const p = Math.max(0, Math.min(1, (y - top) / range));
      let current = 0;
      for (let i = 1; i < 5; i++) {
        const stop = STOPS[i];
        if ("key" in stop && p >= STOP_T[stepIndex(stop.key)] - 0.018) current = i;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const observer = new MutationObserver(onScroll);
    const tourElement = document.getElementById("home");
    if (tourElement) observer.observe(tourElement, { subtree: true, attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const closeOnOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !navRef.current?.contains(event.target)) setMobileOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutside);
    };
  }, [mobileOpen]);

  const navigate = (index: number) => {
    setMobileOpen(false);
    const stop = STOPS[index];
    setActive(index);
    if ("key" in stop) {
      window.dispatchEvent(new CustomEvent("fx:tour-jump", { detail: { key: stop.key, duration: Math.min(3.4, 1.25 + Math.abs(index - active) * 0.4) } }));
      return;
    }
    const element = document.getElementById(stop.id);
    if (!element) return;
    travelToPosition(element.getBoundingClientRect().top + window.scrollY - 72, Math.min(3.4, 1.25 + Math.abs(index - active) * 0.4));
  };


  return (
    <nav ref={navRef} className={`fx-story-stops${compact ? " is-compact" : ""}${mobileOpen ? " is-mobile-open" : ""}`} aria-label="USER FX section navigation">
      <button type="button" className="fx-story-stops-mobile-toggle" aria-label={`Navigate sections, currently ${STOPS[active].label}, ${active + 1} of ${STOPS.length}`} aria-expanded={mobileOpen} aria-controls="fx-story-stops-options" onClick={() => setMobileOpen((current) => !current)}>
        <span className="fx-story-stops-mobile-number">
          {String(active + 1).padStart(2, "0")}<span aria-hidden="true">/08</span>
        </span>
        <span className="fx-story-stops-mobile-arrow" aria-hidden="true">
          {mobileOpen ? "×" : "⌃"}
        </span>
      </button>
      <div id="fx-story-stops-options" className="fx-story-stops-list">
        {STOPS.map((stop, index) => (
          <button type="button" key={stop.label} className={`fx-story-stop ${active === index ? "is-active" : ""}`} onClick={() => navigate(index)} aria-label={`Go to ${stop.label}`} aria-current={active === index ? "step" : undefined} title={stop.label}>
            <span className="fx-story-stop-label">
              {stop.label}
            </span>
            <span className="fx-story-stop-dot" aria-hidden="true" />
          </button>
        ))}
      </div>
    </nav>
  );
}
