"use client";

import { useEffect, useState } from "react";
import "./FooterBar.css";

const RATING_STORAGE_KEY = "userfx_landing_crown_rating";

function CrownIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 46 44" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 33 2 15l12 9L23 6l9 18 12-9-3 18H5Z" />
      <path d="M7 38h32M6 42h34" />
      <path d="M23 2v1M2 12v1M44 12v1" />
    </svg>
  );
}

export default function FooterBar() {
  const [hidden, setHidden] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(RATING_STORAGE_KEY));
      if (Number.isInteger(stored) && stored >= 1 && stored <= 5) setRating(stored);
    } catch {
      // Browsers with disabled storage can still use the rating control.
    }

    let lastY = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        const movement = y - lastY;
        if (Math.abs(movement) > 3) {
          // Show on downward scroll, tuck behind the bottom on upward scroll.
          setHidden(movement < 0 && y > 80);
          lastY = y;
        }
        frame = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  function backToBeginning() {
    setRatingOpen(false);
    setHidden(false);
    const beginning = document.getElementById("home");
    if (beginning) {
      beginning.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectRating(value: number) {
    setRating(value);
    try {
      localStorage.setItem(RATING_STORAGE_KEY, String(value));
    } catch {
      // Rating remains available for this session.
    }
  }

  return (
    <footer className={`fx-footer-bar${hidden ? " is-hidden" : ""}`} aria-label="USER FX footer">
      <div className="fx-footer-bar-inner">
        <a className="fx-footer-bar-brand" href="#home" aria-label="USER FX, back to beginning">
          <CrownIcon className="fx-footer-bar-crown" />
          <span className="fx-footer-bar-name">
            <strong>
              USER FX
            </strong>
            <span>
              PRIVATE ROOM
            </span>
          </span>
        </a>
        <p className="fx-footer-bar-motto">
          A private world. Entirely yours.
        </p>
        <div className="fx-footer-bar-actions">
          <div className="fx-footer-bar-rating">
            <button type="button" className="fx-footer-bar-rating-toggle" aria-expanded={ratingOpen} aria-controls="fx-footer-crown-rating" aria-label="Rate USER FX with crowns" onClick={() => setRatingOpen((open) => !open)}>
              <CrownIcon className="fx-footer-bar-rating-trigger-icon" />
              <span>
                Rate
              </span>
            </button>
            {ratingOpen && (
              <div id="fx-footer-crown-rating" className="fx-footer-crown-rating" role="group" aria-label="Rate USER FX from one to five crowns">
                <span className="fx-footer-crown-rating-title">
                  RATE USER FX
                </span>
                <div className="fx-footer-crown-rating-options" onMouseLeave={() => setHoverRating(0)}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button key={value} type="button" className={`fx-footer-rating-crown ${rating === 0 && hoverRating === 0 ? "is-initial" : value <= (hoverRating || rating) ? "is-selected" : "is-unselected"}`} onMouseEnter={() => setHoverRating(value)} onFocus={() => setHoverRating(value)} onBlur={() => setHoverRating(0)} onClick={() => selectRating(value)} aria-label={`Rate ${value} out of 5`} aria-pressed={rating === value}>
                      <CrownIcon />
                    </button>
                  ))}
                </div>
                <span className="fx-footer-crown-rating-caption" role="status">
                  {rating ? `${rating} / 5 · RATING SAVED` : "SELECT YOUR RATING"}
                </span>
              </div>
            )}
          </div>
          <button type="button" className="fx-footer-bar-return" onClick={backToBeginning}>
            <span>
              Back to the beginning
            </span>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20V4M6.5 9.5 12 4l5.5 5.5" />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
}
