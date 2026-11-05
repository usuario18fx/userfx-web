"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MenuOverlay, MenuProvider, StickyHeader, useActiveSection } from "./Chrome";
import { ScrollProgress, SmoothScroll, setSmoothScroll } from "./Motion";
import ScrollStory from "./ScrollStory";
import TelegramIdentityFooter from "./TelegramIdentityFooter";
import RoomIntro from "./RoomIntro";
import { SectionFaq, SectionMethod, SectionPricing } from "./Sections";
import SiteFooter from "./FooterRedesign";
import { ENTER_URL } from "@/lib/content";

// All landing and footer presentation lives in this file.
// Tune the footer scroll brake in FooterBar(), and dimensions/colors below.
const LANDING_STYLES = String.raw`
/* Only the landing preview: prevent transforms / 3D canvases from growing document width. */
.fx-landing{position:relative;z-index:1;width:100%;max-width:100%;min-width:0;overflow-x:clip;background:#05070b;box-shadow:0 14px 38px rgba(0,0,0,.42)}
.fx-landing>main{width:100%;max-width:100%;min-width:0}
.fx-landing .ufx-footer,.fx-landing .ufx-footer-frame,.fx-landing .ufx-footer-hero{max-width:100%;min-width:0}
.fx-landing .ufx-footer-hero{grid-template-columns:minmax(0,1fr) minmax(0,.8fr)}
.fx-landing .ufx-footer-hero-copy,.fx-landing .ufx-footer-visual{min-width:0;max-width:100%}
.fx-landing .ufx-footer-title{max-width:100%;font-size:clamp(40px,5.7vw,94px);overflow-wrap:normal}
.fx-landing .ufx-footer-emblem-ring{max-width:min(100%,450px)}
@media(max-width:900px){.fx-landing .ufx-footer-hero{grid-template-columns:minmax(0,1fr)}.fx-landing .ufx-footer-title{font-size:clamp(38px,8vw,72px)}}

.fx-telegram-entry { padding: 3rem 1rem; text-align: center; }
.fx-telegram-entry input[type=submit] { cursor:pointer; border:0; border-radius:2rem; padding:.9rem 2rem; background:#3fd8d0; color:#08090d; font-weight:650; }
/* Room videos: a single 2x2 surface, zero space between tiles.
   Individual tiles are revealed in order by the section's scroll timeline. */
.fx-landing #identity.fx-room-video-section {
  position: relative;
  height: 455svh;
  padding: 0;
  margin: 0;
  scroll-margin-top: var(--fx-nav-h, 64px);
  background:
    radial-gradient(ellipse at 50% 70%, rgba(9, 31, 54, .46), transparent 72%),
    #05080d;
}

.fx-landing #identity .fx-room-video-stage {
  position: sticky;
  top: var(--fx-nav-h, 64px);
  display: grid;
  place-items: center;
  width: 100%;
  height: calc(100svh - var(--fx-nav-h, 64px));
  overflow: hidden;
}

.fx-landing #identity .fx-room-crown-debris {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  place-items: center;
  overflow: hidden;
  pointer-events: none;
}

.fx-landing #identity .fx-room-crown-debris .fx-crown3d-stage {
  position: relative;
  width: min(100%, 1440px);
  height: 100%;
  background: transparent;
  pointer-events: none;
}

.fx-landing #identity .fx-room-crown-debris .fx-crown3d-stage canvas {
  background: transparent;
  pointer-events: none;
}

.fx-landing-access-modal .pvr-direct-gate {
  background: rgba(3, 6, 13, .86);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.fx-landing #identity .fx-room-video-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 0;
  width: min(100%, 1440px, calc((100svh - var(--fx-nav-h, 64px) - 16px) * 1.77778));
  aspect-ratio: 16 / 9;
  margin: 0 auto;
  padding: 0;
  overflow: hidden;
  list-style: none;
}

.fx-landing #identity .fx-room-video-item {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  margin: 0;
  border: 0;
  outline: 1px solid rgba(83, 189, 203, .25);
  outline-offset: -1px;
  will-change: opacity, transform, clip-path;
}

.fx-landing #identity .fx-room-video-figure {
  position: relative;
  width: 100%;
  height: 100%;
  margin: 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #02050a;
}

.fx-landing #identity .fx-room-video-player {
  display: block;
  width: 100%;
  height: 100%;
  max-height: none;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  object-position: center;
  background: #02050a;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.fx-landing #identity .fx-room-code-card {
  position: absolute;
  z-index: 2;
  top: 10px;
  left: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: min(42%, 178px);
  min-height: 40px;
  margin: 0;
  padding: 5px 9px;
  border: 1px solid rgba(231, 219, 203, .20);
  border-radius: 9px;
  color: #f0eadf;
  background: rgba(7, 12, 19, .82);
  backdrop-filter: blur(7px);
  pointer-events: none;
}

.fx-landing #identity .fx-room-code-icon {
  display: block;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  object-fit: contain;
}

.fx-landing #identity .fx-room-code-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  line-height: 1.1;
}

.fx-landing #identity .fx-room-code-prefix {
  color: #f0eadf;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .08em;
}

.fx-landing #identity .fx-room-code-level {
  color: rgba(236, 228, 216, .72);
  font-size: 9px;
  letter-spacing: .09em;
  text-transform: uppercase;
}

.fx-landing #identity.is-reduced {
  height: auto;
  padding: 28px 0;
}

.fx-landing #identity.is-reduced .fx-room-video-stage {
  position: relative;
  top: auto;
  height: auto;
}

.fx-landing #identity.is-reduced .fx-room-video-item {
  will-change: auto;
}

@media (max-width: 600px) {
  .fx-landing #identity .fx-room-video-grid {
    width: 100%;
  }

  .fx-landing #identity .fx-room-code-card {
    top: 3px;
    left: 3px;
    gap: 3px;
    width: min(63%, 115px);
    min-height: 26px;
    padding: 3px 4px;
    border-radius: 5px;
  }

  .fx-landing #identity .fx-room-code-icon {
    width: 19px;
    height: 19px;
    flex-basis: 19px;
  }

  .fx-landing #identity .fx-room-code-prefix {
    font-size: 10px;
  }

  .fx-landing #identity .fx-room-code-level {
    font-size: 7px;
  }
}

@media(min-width:768px) {
 .fx-landing #access { scroll-margin-top:5rem; padding-block:clamp(.8rem,2vh,2rem); }
 .fx-landing #access h2 { font-size:clamp(2rem,6vh,4rem); max-width:none; line-height:1; }
 .fx-landing #access .mb-14 { margin-bottom:1.3rem; }
 .fx-landing #access .space-y-7 > * + * { margin-block-start:.65rem; }
 .fx-landing #access .fx-plan { gap:clamp(.25rem,.8vh,.7rem); padding:clamp(.7rem,1.6vh,1.2rem); }
}


/* Curtain reveal: page content slides over the fixed footer.
   The stage is sized by ResizeObserver, independently of viewport width. */
.fx-footer-reveal {
  position: relative;
  z-index: 0;
  height: calc(182px + 68svh);
  min-height: 540px;
  width: 100%;
}
.fx-footer-bar {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: 0;
  isolation: isolate;
  width: 100%;
  min-height: 182px;
  border-top: 1px solid rgba(179, 210, 191, 0.64);
  border-right: 1px solid rgba(179, 210, 191, 0.22);
  border-bottom: 1px solid rgba(179, 210, 191, 0.32);
  border-left: 1px solid rgba(179, 210, 191, 0.22);
  border-radius: 0 0 14px 14px;
  background: #020c0b;
  color: #f2eee2;
  box-shadow: 0 -20px 38px rgba(0, 0, 0, .16);
  transform: translate3d(0, 102%, 0);
  visibility: hidden;
  pointer-events: none;
  will-change: transform;
  backface-visibility: hidden;
}
.fx-footer-bar-actions {
  display: flex;
  align-items: center;
  justify-self: end;
  gap: clamp(16px, 2vw, 35px);
  min-width: 0;
}
.fx-footer-bar-rating {
  position: relative;
  flex: none;
}
.fx-footer-bar-rating-toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 4px;
  border: 0;
  background: transparent;
  color: #c6b88a;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(12px, .95vw, 16px);
  cursor: pointer;
}
.fx-footer-bar-rating-trigger-icon {
  width: 24px;
  height: 24px;
  color: #d3ba81;
}
.fx-footer-crown-rating {
  position: absolute;
  right: -40px;
  bottom: calc(100% + 18px);
  z-index: 8;
  width: max-content;
  max-width: calc(100vw - 24px);
  padding: 14px 16px;
  border: 1px solid rgba(179, 210, 191, .45);
  border-radius: 8px;
  background: #071210;
  box-shadow: 0 16px 42px rgba(0,0,0,.55);
  text-align: center;
}
.fx-footer-crown-rating-title {
  display: block;
  margin-bottom: 10px;
  color: #e7ddc6;
  font-family: "Syne", system-ui, sans-serif;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .18em;
}
.fx-footer-crown-rating-options {
  display: flex;
  justify-content: center;
  gap: 5px;
}
.fx-footer-rating-crown {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  padding: 5px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  transition: transform .2s ease, filter .2s ease;
}
.fx-footer-rating-crown svg {
  width: 28px;
  height: 28px;
  fill: currentColor;
  stroke: currentColor;
  stroke-width: 1.3;
  transition: color .2s ease;
}
.fx-footer-rating-crown.is-initial {
  color: #e8f400;
}
.fx-footer-rating-crown.is-selected {
  color: #0ba1ff;
}
.fx-footer-rating-crown.is-unselected {
  color: #85888b;
}
.fx-footer-rating-crown:hover,
.fx-footer-rating-crown:focus-visible {
  transform: translateY(-4px);
  filter: drop-shadow(0 0 8px #0ba1ff);
}
.fx-footer-crown-rating-caption {
  display: block;
  margin-top: 10px;
  color: #90b4ad;
  font-size: 9px;
  letter-spacing: .1em;
}
.fx-footer-bar-rating-toggle:focus-visible,
.fx-footer-rating-crown:focus-visible {
  outline: 2px solid #84e0bc;
  outline-offset: 3px;
}
.fx-footer-bar-inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1fr);
  align-items: center;
  column-gap: 28px;
  width: 100%;
  min-height: 180px;
  padding: 36px clamp(22px, 5.2vw, 105px);
}
.fx-footer-bar-brand {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: 19px;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}
.fx-footer-bar-crown {
  flex: none;
  width: 42px;
  height: 42px;
  color: #bfab81;
}
.fx-footer-bar-name {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 2px;
  font-family: "Syne", system-ui, sans-serif;
  font-size: clamp(11px, 1vw, 15px);
  letter-spacing: .1em;
  white-space: nowrap;
}
.fx-footer-bar-name strong {
  font-weight: 800;
}
.fx-footer-bar-name > span {
  font-weight: 400;
  letter-spacing: .04em;
}
.fx-footer-bar-motto {
  justify-self: center;
  margin: 0;
  color: #a9a58f;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(17px, 1.35vw, 25px);
  font-style: italic;
  font-weight: 400;
  text-align: center;
  white-space: nowrap;
}
.fx-footer-bar-return {
  display: inline-flex;
  align-items: center;
  justify-self: end;
  gap: 18px;
  padding: 12px 0 12px 10px;
  border: 0;
  background: transparent;
  color: #e1d5bd;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(12px, .95vw, 16px);
  cursor: pointer;
}
.fx-footer-bar-return svg {
  flex: none;
  color: #84e0bc;
  transition: transform .2s ease;
}
.fx-footer-bar-return:hover svg,
.fx-footer-bar-return:focus-visible svg {
  transform: translateY(-4px);
}
.fx-footer-bar-brand:focus-visible,
.fx-footer-bar-return:focus-visible {
  outline: 2px solid #84e0bc;
  outline-offset: 6px;
}
@media (max-width: 850px) {
  .fx-footer-bar-inner {
    grid-template-columns: 1fr auto;
    row-gap: 24px;
    min-height: 165px;
    padding: 28px 25px;
  }
  .fx-footer-bar-motto {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-self: start;
    white-space: normal;
  }
  .fx-footer-bar-actions {
    grid-column: 2;
    grid-row: 1;
    gap: 16px;
  }
  .fx-footer-bar-return {
    gap: 10px;
  }
}
@media (max-width: 460px) {
  .fx-footer-bar-name {
    flex-direction: column;
    gap: 2px;
    font-size: 10px;
  }
  .fx-footer-bar-crown {
    width: 33px;
    height: 33px;
  }
  .fx-footer-bar-brand {
    gap: 10px;
  }
  .fx-footer-bar-return,
  .fx-footer-bar-rating-toggle {
    font-size: 11px;
  }
  .fx-footer-bar-return > span {
    display: none;
  }
  .fx-footer-bar-actions {
    gap: 10px;
  }
  .fx-footer-crown-rating {
    right: 0;
  }
  .fx-footer-rating-crown {
    width: 35px;
    height: 35px;
  }
  .fx-footer-bar-motto {
    font-size: 20px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .fx-footer-bar-return svg,
  .fx-footer-rating-crown {
    transition: none;
  }
}

`;

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

function FooterBar() {
  const revealRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
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

    const stage = revealRef.current;
    const footer = footerRef.current;
    if (!stage || !footer) return;

    // Reserve a real scrolling track. The footer begins entirely below the
    // viewport and reveals only as the final track is scrolled through.
    // This produces the reference's slowed "brake" instead of a static footer.
    let travel = 1;
    let frame = 0;
    const measure = () => {
      const footerHeight = footer.getBoundingClientRect().height;
      travel = Math.max(360, Math.round(window.innerHeight * 0.68));
      stage.style.height = `${Math.ceil(footerHeight + travel)}px`;
      update();
    };
    const update = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const top = stage.getBoundingClientRect().top;
        const raw = Math.max(0, Math.min(1, (window.innerHeight - top) / travel));
        // Ease-out gives the final part of the reveal a visible braking effect.
        const eased = 1 - Math.pow(1 - raw, 3);
        footer.style.transform = `translate3d(0, ${((1 - eased) * 102).toFixed(3)}%, 0)`;
        footer.style.pointerEvents = raw > 0.9 ? "auto" : "none";
        footer.style.visibility = raw <= 0 ? "hidden" : "visible";
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(footer);
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", update);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  function backToBeginning() {
    setRatingOpen(false);
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
    <div className="fx-footer-reveal" ref={revealRef}>
      <footer ref={footerRef} className="fx-footer-bar" aria-label="USER FX footer">
      <div className="fx-footer-bar-inner">
        <a className="fx-footer-bar-brand" href="#home" aria-label="USER FX, back to beginning">
          <CrownIcon className="fx-footer-bar-crown" />
          <span className="fx-footer-bar-name">
            <strong>
              USER FX
            </strong>
            <span>
              PRIVATE VAULT
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
    </div>
  );
}


const AccessGate = dynamic(() => import("@/components/PrivateRoom/PR-DirectGate"), { ssr: false });

const SECTION_IDS = ["home", "protocol", "spaces", "access"] as const;

function EnterAuthorizedRoom() {
  useEffect(() => {
    window.location.hash = "#/private-room";
  }, []);

  return null;
}

export default function Landing() {
  const active = useActiveSection(SECTION_IDS);
  const [accessOpen, setAccessOpen] = useState(false);

  useEffect(() => {
    const onAccessClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (link?.getAttribute("href") !== ENTER_URL) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      event.preventDefault();
      event.stopPropagation();
      setAccessOpen(true);
    };

    document.addEventListener("click", onAccessClick, true);
    return () => document.removeEventListener("click", onAccessClick, true);
  }, []);

  useEffect(() => {
    if (!accessOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    setSmoothScroll(false);

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccessOpen(false);
    };
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = previousOverflow;
      setSmoothScroll(true);
      previousFocus?.focus();
    };
  }, [accessOpen]);

  return (
    <MenuProvider>
      <style>{LANDING_STYLES}</style>
      <SmoothScroll />
      <ScrollProgress />
      <StickyHeader active={active} />
      <MenuOverlay>
        <SiteFooter />
      </MenuOverlay>
      <div className="fx-landing">
        <main>
          <RoomIntro />
          <ScrollStory />
          <SectionMethod />
          <SectionPricing />
          <SectionFaq />
          <TelegramIdentityFooter onVerified={() => setAccessOpen(true)} />
        </main>
      </div>
      <FooterBar />
      {accessOpen && (
        <div className="fx-landing-access-modal" role="dialog" aria-modal="true" aria-label="Vault access">
          <AccessGate forceOpen onRequestClose={() => setAccessOpen(false)}>
            <EnterAuthorizedRoom />
          </AccessGate>
        </div>
      )}
    </MenuProvider>
  );
}
