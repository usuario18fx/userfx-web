"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const tour = document.getElementById("home");
      if (!tour) return;
      const top = tour.getBoundingClientRect().top + window.scrollY;
      const range = Math.max(1, tour.offsetHeight - window.innerHeight);
      const y = window.scrollY;
      const protocol = document.getElementById("protocol");
      const access = document.getElementById("access");
      const faq = document.getElementById("faq");
      const cutoff = window.innerHeight * 0.35;
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
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const navigate = (index: number) => {
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
    <nav className="fx-story-stops" aria-label="USER FX section navigation">
      {STOPS.map((stop, index) => (
        <button type="button" key={stop.label} className={`fx-story-stop ${active === index ? "is-active" : ""}`} onClick={() => navigate(index)} aria-label={`Go to ${stop.label}`} aria-current={active === index ? "step" : undefined} title={stop.label}>
          <span className="fx-story-stop-label">
            {stop.label}
          </span>
          <span className="fx-story-stop-dot" aria-hidden="true" />
        </button>
      ))}
    </nav>
  );
}
