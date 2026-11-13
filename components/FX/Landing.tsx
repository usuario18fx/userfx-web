"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { MenuOverlay, MenuProvider, StickyHeader, useActiveSection } from "./Chrome";
import { SmoothScroll, setSmoothScroll } from "./Motion";
import ScrollStops from "./ScrollStops";
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

/* Telegram profile button · gold/orange star control from PrivateRoom, with user glyph only. */
.fx-telegram-launch {
  display: inline-grid;
  position: relative;
  place-items: center;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(15deg,#ffc014,#ffa600,#ff7b00,#754200,#ffc014,#ffa600,#ff7b00,#ffa705) no-repeat;
  background-size: 350% 350%;
  background-position: left center;
  box-shadow: 0 3px 1px 0 #ff7b00, inset 0 1px 0 rgba(255,255,255,.35),0 0 20px rgba(255,149,0,.17);
  color: #10141a;
  font-size: 23px;
  line-height: 1;
  cursor: pointer;
  transition: background-position .35s ease,transform .25s ease,box-shadow .25s ease;
}
.fx-telegram-launch:hover {
  background-position: right center;
  transform: translateY(-2px);
  box-shadow: 0 5px 1px #ff7b00,0 0 25px rgba(255,149,0,.36);
}
.fx-telegram-launch:active { transform: translateY(1px); box-shadow: 0 1px 0 #ff7b00; }
.fx-telegram-launch:focus-visible { outline: 2px solid #3fd8d0; outline-offset: 4px; }
.fx-telegram-launch--hero { width: 56px; height: 56px; margin-top: 20px; font-size: 27px; }
.fx-telegram-dialog-scrim {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(2,5,12,.82);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.fx-telegram-dialog {
  position: relative;
  width: min(100%,430px);
  max-height: min(90dvh,650px);
  overflow-y: auto;
  padding: clamp(22px,5vw,36px);
  border: 1px solid rgba(63,216,208,.38);
  border-radius: 15px;
  background: radial-gradient(circle at 15% 0%,rgba(63,216,208,.12),transparent 57%),linear-gradient(155deg,#131c29,#070a11 75%);
  box-shadow: 0 25px 100px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.06);
  color: #f1f6ff;
  font-family: "Syne","Funnel Display",system-ui,sans-serif;
}
.fx-telegram-dialog-close {
  position: absolute;
  top: 15px;
  right: 15px;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 8px;
  background: rgba(255,255,255,.04);
  color: #f4f6f8;
  font-size: 20px;
  cursor: pointer;
}
.fx-telegram-dialog-icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  margin-bottom: 16px;
  border: 1px solid rgba(63,216,208,.5);
  border-radius: 12px;
  background: rgba(63,216,208,.1);
  font-size: 26px;
}
.fx-telegram-dialog-kicker { color: #3fd8d0; font-size: 10px; font-weight: 800; letter-spacing: .22em; }
.fx-telegram-dialog h2 { margin: 10px 0 8px; font-size: clamp(22px,5vw,30px); font-weight: 750; line-height: 1.1; }
.fx-telegram-dialog-desc { margin: 0 0 25px; color: #a7b7c7; font-size: 13px; line-height: 1.6; }
.fx-telegram-dialog-form { display: flex; flex-direction: column; gap: 11px; }
.fx-telegram-dialog-form label { color: #9db8c8; font-size: 10px; font-weight: 700; letter-spacing: .15em; }
.fx-telegram-dialog-field {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 52px;
  padding: 0 15px;
  border: 1px solid rgba(75,174,210,.55);
  border-radius: 8px;
  background: rgba(2,9,16,.8);
}
.fx-telegram-dialog-field:focus-within { border-color: #3fd8d0; box-shadow: 0 0 0 2px rgba(63,216,208,.15); }
.fx-telegram-dialog-field span { color: #3fd8d0; font-size: 20px; font-weight: 800; }
.fx-telegram-dialog-field input {
  flex: 1;
  width: 100%;
  min-width: 0;
  height: 50px;
  border: 0;
  outline: 0;
  background: transparent;
  color: #f6f7fa;
  font: 600 16px "IBM Plex Mono",ui-monospace,monospace;
}
.fx-telegram-dialog-field input::placeholder { color: #66869c; }
.fx-telegram-dialog-submit {
  min-height: 48px;
  margin-top: 4px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(125deg,#3fd8d0,#1596bb);
  color: #051016;
  font: 800 12px "Syne",system-ui,sans-serif;
  letter-spacing: .1em;
  cursor: pointer;
}
.fx-telegram-dialog-submit:disabled { opacity: .55; cursor: progress; }
.fx-telegram-dialog-error { margin: 0; color: #ff929e; font-size: 12px; line-height: 1.5; }
.fx-telegram-dialog-bot { display: inline-block; margin-top: 20px; color: #87c4e8; font-size: 12px; text-decoration: underline; text-underline-offset: 4px; }

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
/* Four experiments: editorial still images with video-on-hover / tap. */
.fx-footer-experiments {
  width: 100%;
  max-width: 1540px;
  margin: 0 auto;
  padding: 26px clamp(22px, 5.2vw, 105px) 8px;
}
.fx-footer-experiments-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
  color: #e1d5bd;
}
.fx-footer-experiments-heading strong {
  font: 500 clamp(17px, 1.6vw, 24px)/1.2 "Syne", sans-serif;
  letter-spacing: .025em;
}
.fx-footer-experiments-heading span {
  color: #87aaa6;
  font: 10px/1.4 "IBM Plex Mono", monospace;
  letter-spacing: .14em;
  text-transform: uppercase;
}
.fx-footer-experiments-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(8px, 1.2vw, 18px);
}
.fx-footer-experiment {
  position: relative;
  display: block;
  aspect-ratio: 1.32;
  min-width: 0;
  overflow: hidden;
  isolation: isolate;
  padding: 0;
  border: 1px solid rgba(165, 215, 215, .22);
  border-radius: 2px;
  background: radial-gradient(circle at 55% 38%, #153b49 0%, #111a25 44%, #05090d 100%);
  color: #e8f6f6;
  text-align: left;
  transition: border-color .3s, transform .3s;
}
.fx-footer-experiment:nth-child(2) { background: radial-gradient(circle at 60% 45%, #30343d, #080a0e 78%); }
.fx-footer-experiment:nth-child(3) { background: radial-gradient(circle at 52% 42%, #3b202b, #0b0b10 78%); }
.fx-footer-experiment:nth-child(4) { background: radial-gradient(circle at 52% 42%, #10565b, #061012 78%); }
.fx-footer-experiment:hover,
.fx-footer-experiment:focus-within {
  border-color: rgba(69, 213, 219, .8);
  transform: translateY(-3px);
}
.fx-footer-experiment:focus-visible { outline: 2px solid #47d7de; outline-offset: 3px; }
.fx-footer-experiment-poster,
.fx-footer-experiment-video {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.fx-footer-experiment-poster { z-index: 1; }
.fx-footer-experiment-video { z-index: 2; opacity: 0; transition: opacity .35s; pointer-events: none; }
.fx-footer-experiment-video.is-primary.is-ready { opacity: 1; }
.fx-footer-experiment-video.is-secondary-video { z-index: 3; }
.fx-footer-experiment.is-secondary .fx-footer-experiment-video.is-secondary-video.is-ready { opacity: 1; }
.fx-footer-experiment-switch {
  position: absolute;
  z-index: 6;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.fx-footer-experiment-switch:focus-visible { outline: 2px solid #47d7de; outline-offset: -4px; }
.fx-footer-experiment-switch .fx-footer-experiment-index,
.fx-footer-experiment-switch .fx-footer-experiment-action { z-index: 7; }
.fx-footer-experiment::after {
  content: "";
  position: absolute;
  z-index: 3;
  inset: 45% 0 0;
  background: linear-gradient(transparent, rgba(0,0,0,.68));
  pointer-events: none;
}
.fx-footer-experiment-index,
.fx-footer-experiment-title,
.fx-footer-experiment-action {
  position: absolute;
  z-index: 4;
  pointer-events: none;
}
.fx-footer-experiment-index {
  top: 13px;
  left: 14px;
  font: 10px/1 "IBM Plex Mono", monospace;
  letter-spacing: .08em;
  color: #b5e4e2;
}
.fx-footer-experiment-title {
  bottom: 15px;
  left: 15px;
  font: 700 clamp(12px, 1.05vw, 15px)/1.2 "Syne", sans-serif;
  letter-spacing: .04em;
}
.fx-footer-experiment-action {
  bottom: 15px;
  right: 15px;
  font: 10px/1.3 "IBM Plex Mono", monospace;
  color: #9fdfdf;
}
@media (max-width: 760px) {
  .fx-footer-experiments { padding: 17px 20px 8px; }
  .fx-footer-experiments-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
  .fx-footer-experiment { aspect-ratio: 1.35; }
  .fx-footer-experiments-heading span { font-size: 9px; }
}
@media (max-width: 400px) {
  .fx-footer-experiments { padding-inline: 13px; }
  .fx-footer-experiment-title { font-size: 11px; left: 9px; bottom: 10px; }
  .fx-footer-experiment-action { font-size: 9px; right: 8px; bottom: 10px; }
  .fx-footer-experiment-index { top: 9px; left: 9px; }
}
@media (prefers-reduced-motion: reduce) {
  .fx-footer-experiment,
  .fx-footer-experiment-poster,
  .fx-footer-experiment-video { transition: none; }
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

const FOOTER_EXPERIMENTS = [
  { id: 1, title: "EXPERIMENT 01", poster: "/assets/footer/footer1.png", video: "/assets/my-room/room1.mp4" },
  { id: 2, title: "EXPERIMENT 02", poster: "/assets/footer/footer2.png", video: "/assets/my-room/room2.mp4" },
  { id: 3, title: "EXPERIMENT 03", poster: "/assets/footer/footer3-3.png", video: "/assets/footer/footer3.mp4" },
  { id: 4, title: "EXPERIMENT 04", poster: "/assets/footer/footer4.png", video: "/assets/my-room/room2.mp4" },
] as const;

function FooterExperiment({ item }: { item: (typeof FOOTER_EXPERIMENTS)[number] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  const start = () => {
    const video = videoRef.current;
    if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    requestedRef.current = true;
    setFailed(false);
    video.muted = true;
    video.loop = true;
    if (video.readyState === 0) video.load();
    void video.play().catch(() => {
      // A browser may defer play until the first frame is ready.
      if (video.error) {
        setFailed(true);
        requestedRef.current = false;
        console.warn("[USER FX] Experiment video unavailable:", item.video, video.error);
      }
    });
  };

  const stop = () => {
    requestedRef.current = false;
    const video = videoRef.current;
    if (video) {
      video.pause();
      try { video.currentTime = 0; } catch {}
    }
    setPlaying(false);
  };

  return (
    <div
      className="fx-footer-experiment"
      role="button"
      tabIndex={0}
      aria-label={`Preview ${item.title}`}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      onClick={() => playing ? stop() : start()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          playing ? stop() : start();
        }
      }}
    >
      <img
        className="fx-footer-experiment-poster"
        src={item.poster}
        alt={item.title}
        loading="lazy"
        style={{ opacity: playing ? 0 : 1, transition: "opacity .25s ease" }}
      />
      <video
        ref={videoRef}
        className="fx-footer-experiment-video"
        src={item.video}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        onCanPlay={() => {
          if (requestedRef.current && videoRef.current?.paused) {
            void videoRef.current.play().catch(() => {});
          }
        }}
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => {
          requestedRef.current = false;
          setFailed(true);
          setPlaying(false);
          console.warn("[USER FX] Experiment video failed:", item.video);
        }}
        style={{ opacity: playing && !failed ? 1 : 0, transition: "opacity .25s ease" }}
      />
      <span className="fx-footer-experiment-index">
        {String(item.id).padStart(2, "0")} / 04
      </span>
      <span className="fx-footer-experiment-title">{item.title}</span>
      <span className="fx-footer-experiment-action">
        {failed ? "VIDEO UNAVAILABLE" : playing ? "PLAYING" : "PREVIEW"}
      </span>
    </div>
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
      <section className="fx-footer-experiments" aria-label="USER FX experiments">
        <div className="fx-footer-experiments-heading">
          <strong>
            Experiments
          </strong>
          <span>
            HOVER OR TAP TO PREVIEW
          </span>
        </div>
        <div className="fx-footer-experiments-grid">
          {FOOTER_EXPERIMENTS.map((item) => (
            <FooterExperiment key={item.id} item={item} />
          ))}
        </div>
      </section>
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
    </div>
  );
}


const AccessGate = dynamic(() => import("@/components/PrivateRoom/PR-DirectGate"), { ssr: false });


type TelegramDialogProps = {
  onClose: () => void;
  onVerified: (username: string) => void;
};

function TelegramIdentityDialog({ onClose, onVerified }: TelegramDialogProps) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      setUsername((localStorage.getItem("userfx_telegram_username") || "").replace(/^@+/, ""));
    } catch {
      // Storage may be disabled by the browser.
    }
    inputRef.current?.focus();
    const dialog = dialogRef.current;
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialog?.querySelectorAll<HTMLElement>("button:not([disabled]),input:not([disabled]),a[href]") || []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog?.addEventListener("keydown", trapFocus);
    return () => dialog?.removeEventListener("keydown", trapFocus);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    const clean = username.trim().replace(/^@+/, "");
    if (!/^[A-Za-z0-9_]{5,32}$/.test(clean)) {
      setError("ENTER A VALID TELEGRAM USERNAME (5–32 CHARACTERS)");
      return;
    }
    const normalized = "@" + clean;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/telegram-eligibility?username=" + encodeURIComponent(normalized), {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const result: { eligible?: boolean; username?: string; error?: string } = await response.json().catch(() => ({}));
      if (!response.ok || !result.eligible) {
        throw new Error(result.error || "USERNAME IS NOT ACTIVE IN TELEGRAMFX");
      }
      const candidate = (result.username || normalized).replace(/^@+/, "");
      const verified = "@" + (/^[A-Za-z0-9_]{5,32}$/.test(candidate) ? candidate : clean);
      try {
        localStorage.setItem("userfx_telegram_username", verified);
      } catch {
        // The access gate can still continue without local storage.
      }
      onVerified(verified);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "TELEGRAM VERIFICATION FAILED");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fx-telegram-dialog-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="fx-telegram-dialog" role="dialog" aria-modal="true" aria-labelledby="fx-telegram-dialog-title">
        <button type="button" className="fx-telegram-dialog-close" onClick={onClose} aria-label="Close Telegram username input">
          ×
        </button>
        <div className="fx-telegram-dialog-icon" aria-hidden="true">👤</div>
        <span className="fx-telegram-dialog-kicker">USER FX · TELEGRAM IDENTITY</span>
        <h2 id="fx-telegram-dialog-title">Your Telegram username</h2>
        <p className="fx-telegram-dialog-desc">Enter your @username to check access and continue to the private room.</p>
        <form className="fx-telegram-dialog-form" onSubmit={handleSubmit}>
          <label htmlFor="fx-telegram-dialog-username">TELEGRAM USERNAME</label>
          <div className="fx-telegram-dialog-field">
            <span aria-hidden="true">@</span>
            <input ref={inputRef} id="fx-telegram-dialog-username" type="text" value={username} onChange={(event) => { setUsername(event.target.value.replace(/^@+/, "")); setError(""); }} placeholder="username" maxLength={33} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required disabled={loading} />
          </div>
          {error && <p className="fx-telegram-dialog-error" role="alert">{error}</p>}
          <button className="fx-telegram-dialog-submit" type="submit" disabled={loading}>
            {loading ? "CHECKING…" : "VERIFY USER"}
          </button>
        </form>
        <a className="fx-telegram-dialog-bot" href="https://t.me/User18Fx_bot?start=getcode" target="_blank" rel="noopener noreferrer">
          Need access? Open Telegram bot ↗
        </a>
      </section>
    </div>
  );
}

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
  const [telegramOpen, setTelegramOpen] = useState(false);
  const openTelegram = () => setTelegramOpen(true);

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
    if (!accessOpen && !telegramOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    setSmoothScroll(false);

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (telegramOpen) setTelegramOpen(false);
        else setAccessOpen(false);
      }
    };
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = previousOverflow;
      setSmoothScroll(true);
      previousFocus?.focus();
    };
  }, [accessOpen, telegramOpen]);

  return (
    <MenuProvider>
      <style>
{LANDING_STYLES}
</style>
      <SmoothScroll />
      <ScrollStops />
      <StickyHeader active={active} onOpenTelegram={openTelegram} />
      <MenuOverlay>
        <SiteFooter />
      </MenuOverlay>
      <div className="fx-landing">
        <main>
          <RoomIntro />
          <ScrollStory onOpenTelegram={openTelegram} />
          <SectionMethod />
          <SectionPricing />
          <SectionFaq />
          <TelegramIdentityFooter onVerified={() => setAccessOpen(true)} />
        </main>
      </div>
      <FooterBar />
      {telegramOpen && (
        <TelegramIdentityDialog onClose={() => setTelegramOpen(false)} onVerified={() => { setTelegramOpen(false); setAccessOpen(true); }} />
      )}
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
