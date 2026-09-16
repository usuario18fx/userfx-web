"use client";
import { useEffect, useRef, useState } from "react";

type MediaItem = {
  id: number;
  title: string;
  subtitle: string;
  src: string;
  poster?: string;
};

const MEDIA: MediaItem[] = [
  {
    id: 1,
    title: "LATEST UPDATE",
    subtitle: "PRIVATE COLLECTION",
    src: "/assets/videos/update01.mp4",
    poster: "/assets/album/PRVW/PRVW-01.jpg",
  },
  {
    id: 2,
    title: "VAULT NEWS",
    subtitle: "LATEST INFORMATION",
    src: "/assets/videos/update04.mp4",
    poster: "/assets/album/PRVW/PRVW-04.jpg",
  },
  {
    id: 3,
    title: "WHAT'S NEXT",
    subtitle: "COMING SOON",
    src: "/assets/videos/update05.mp4",
    poster: "/assets/album/PRVW/PRVW-05.jpg",
  },
];

const CSS = `
:root {
  --vault-gold: #d8ae55;
  --vault-gold-light: #f1d58b;
  --vault-gold-soft: rgba(216,174,85,.16);
  --vault-cream: #f4efe5;
  --vault-muted: rgba(244,239,229,.48);
  --vault-black: #08090a;
  --vault-panel: rgba(14,15,16,.86);
  --vault-border: rgba(216,174,85,.26);
  --vault-line: rgba(255,255,255,.1);
  --vault-radius: 18px;
}

.vinfo {
  width: min(92vw, 510px);
  margin: 42px auto;
  padding: 18px;
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(230px, .75fr);
  gap: 18px;
  position: relative;
  isolation: isolate;
  box-sizing: border-box;

  border: 1px solid rgba(216,174,85,.3);
  border-radius: 24px;
  background:
    linear-gradient(135deg, rgba(255,255,255,.045), transparent 34%),
    linear-gradient(160deg, rgba(25,25,27,.94), rgba(5,6,7,.96));
  box-shadow:
    0 28px 80px rgba(0,0,0,.62),
    inset 0 1px 0 rgba(255,255,255,.07);
}

.vinfo::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  border-radius: inherit;
  opacity: .2;
  background: url("/assets/damask.png") center / 480px repeat;
  mix-blend-mode: screen;
}

.vinfo::after {
  content: "";
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  height: 1px;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(216,174,85,.6),
    transparent
  );
}

.vinfo,
.vinfo * {
  box-sizing: border-box;
}

/* ─────────── VIDEO ─────────── */

.vinfo__screen {
  position: relative;
  min-width: 0;
  overflow: hidden;
  aspect-ratio: 16 / 16;
  transform: scale(.1.4);

  /* ↓ BAJA EL VIDEO DENTRO DEL DISPOSITIVO */
  margin-top: 40px;
  border: 1px solid rgba(216,174,85,.34);
  border-radius: 16px;
  background: #000;
  box-shadow:
    0 16px 36px rgba(0,0,0,.42),
    inset 0 0 0 1px rgba(255,255,255,.04);
}

.vinfo__screen::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.55) 0%,
      transparent 28%,
      transparent 68%,
      rgba(0,0,0,.38) 100%
    );
}
.vinfo__screen video {
  display: block !important;
  width: 120% !important;
  height: 120% !important;
  max-width: none !important;
  aspect-ratio: auto !important;
  object-fit: contain !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  background: #000 !important;
}

/* ─────────── VIDEO OVERLAY ─────────── */

.vinfo__overlay {
  position: absolute;
  top: 2px;
  left: 18px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: none;
}

.vinfo__overlay small {
  width: fit-content;
  padding: 6px 9px;
  border: 1px solid rgba(216,174,85,.45);
  border-radius: 999px;
  background: rgba(7,8,9,.62);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  color: var(--vault-gold-light);
  font: 800 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .25em;
}

.vinfo__overlay strong {
  color: var(--vault-cream);
  font: 800 clamp(15px, 2vw, 25px)/1.1 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .08em;
  text-shadow: 0 3px 18px rgba(0,0,0,.9);
}

/* ─────────── SIDE PANEL ─────────── */

.vinfo__buttons {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px;
}

.vinfo__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 42px;
  padding: 0 14px;
  margin-bottom: 3px;

  border-bottom: 1px solid var(--vault-border);
  color: var(--vault-gold-light);

  font: 800 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .28em;
  text-transform: uppercase;
}

.vinfo__title span {
  color: var(--vault-muted);
  font-size: 9px;
  letter-spacing: .12em;
}

/* ─────────── ITEM BUTTON ─────────── */

.vinfo__button {
  appearance: none !important;
  -webkit-appearance: none !important;

  position: relative;
  display: grid !important;
  grid-template-columns: 42px minmax(0, 1fr) 18px !important;
  align-items: center !important;
  gap: 12px !important;

  width: 100%;
  min-height: 72px;
  padding: 10px 13px !important;
  margin: 0 !important;

  border: 1px solid var(--vault-line) !important;
  border-radius: 14px !important;
  background:
    linear-gradient(
      115deg,
      rgba(255,255,255,.055),
      rgba(255,255,255,.015)
    ) !important;

  color: var(--vault-cream) !important;
  text-align: left !important;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.035) !important;

  transition:
    transform .22s ease,
    border-color .22s ease,
    background .22s ease,
    box-shadow .22s ease;
}

.vinfo__button::before {
  content: "";
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 0;
  width: 2px;
  border-radius: 99px;
  background: transparent;
  transition: background .22s ease;
}

.vinfo__button:hover {
  transform: translateX(-4px);
  border-color: rgba(216,174,85,.58) !important;
  background:
    linear-gradient(
      115deg,
      rgba(216,174,85,.13),
      rgba(255,255,255,.025)
    ) !important;
}

.vinfo__button.is-active {
  border-color: var(--vault-gold) !important;
  background:
    linear-gradient(
      115deg,
      rgba(216,174,85,.2),
      rgba(216,174,85,.04)
    ) !important;
  box-shadow:
    inset 0 0 0 1px rgba(216,174,85,.15),
    0 10px 24px rgba(0,0,0,.22) !important;
}

.vinfo__button.is-active::before {
  background: var(--vault-gold-light);
}

/* ─────────── NUMBER ─────────── */

.vinfo__num {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;

  border: 1px solid rgba(216,174,85,.35);
  border-radius: 11px;
  background: rgba(216,174,85,.14);

  color: var(--vault-gold-light);
  font: 800 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .1em;
}

.vinfo__button.is-active .vinfo__num {
  background: var(--vault-gold);
  color: #16130c;
}

/* ─────────── TEXT ─────────── */

.vinfo__copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vinfo__copy strong {
  overflow: hidden;
  color: var(--vault-cream);
  font: 800 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .06em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vinfo__copy small {
  overflow: hidden;
  color: var(--vault-muted);
  font: 600 9px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .07em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vinfo__arrow {
  color: var(--vault-gold-light);
  font: 300 25px/1 Arial, sans-serif;
  text-align: right;
  opacity: .55;
  transition:
    opacity .22s ease,
    transform .22s ease;
}

.vinfo__button:hover .vinfo__arrow,
.vinfo__button.is-active .vinfo__arrow {
  opacity: 1;
  transform: translateX(3px);
}

/* ─────────── TABLET ─────────── */

@media (max-width: 900px) {
  .vinfo__screen {
    margin-top: 18px;
  }

  .vinfo {
    grid-template-columns: 1fr;
    padding: 14px;
    margin: 28px auto;
  }

  .vinfo__screen {
    aspect-ratio: 16 / 9;
  }

  .vinfo__buttons {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .vinfo__title {
    grid-column: 1 / -1;
  }

  .vinfo__button {
    min-height: 66px;
  }
}

/* ─────────── MOBILE ─────────── */

@media (max-width: 600px) {
  .vinfo__screen {
    margin-top: 0;
  }

  .vinfo {
    width: calc(100% - 20px);
    padding: 10px;
    gap: 12px;
    margin: 20px auto;
    border-radius: 18px;
  }

  .vinfo::after {
    top: 13px;
    left: 13px;
    right: 13px;
  }

  .vinfo__screen {
    border-radius: 13px;
    aspect-ratio: 16 / 10;
  }

  .vinfo__overlay {
    top: 12px;
    left: 12px;
    gap: 5px;
  }

  .vinfo__overlay small {
    padding: 5px 7px;
    font-size: 7px;
  }

  .vinfo__overlay strong {
    font-size: 14px;
  }

  .vinfo__buttons {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .vinfo__title {
    min-height: 38px;
    font-size: 9px;
  }

  .vinfo__button {
    min-height: 62px;
    grid-template-columns: 36px minmax(0, 1fr) 16px !important;
    gap: 10px !important;
    padding: 9px 11px !important;
  }

  .vinfo__num {
    width: 34px;
    height: 34px;
  }

  .vinfo__copy strong {
    font-size: 10px;
  }

  .vinfo__copy small {
    font-size: 8px;
  }
}

/* ─────────── SMALL MOBILE ─────────── */

@media (max-width: 380px) {
  .vinfo {
    width: calc(100% - 12px);
    padding: 8px;
  }

  .vinfo__overlay strong {
    font-size: 12px;
  }

  .vinfo__button {
    min-height: 58px;
  }

  .vinfo__copy strong {
    font-size: 9px;
  }

  .vinfo__copy small {
    font-size: 7px;
  }
}

/* ─────────── ACCESSIBILITY ─────────── */

.vinfo__button:focus-visible {
  outline: 2px solid var(--vault-gold-light);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .vinfo__button,
  .vinfo__arrow,
  .vinfo__button::before {
    transition: none;
  }
}
`;

export default function VaultInfoDevice() {
  const [selected, setSelected] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const current = MEDIA[selected];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.load();
    video.currentTime = 0;
  }, [selected]);

  return (
    <>
      <style>{CSS}</style>

      <section className="vinfo" aria-label="USER FX media updates">
        <div className="vinfo__screen">
          <video
            ref={videoRef}
            key={current.id}
            src={current.src}
            poster={current.poster}
            controls
            playsInline
            preload="metadata"
          />

          <div className="vinfo__overlay">
            <small>USER 🜲 FX</small>
            <strong>{current.title}</strong>
          </div>
        </div>

        <aside className="vinfo__buttons">
          <div className="vinfo__title">
            LATEST UPDATES
            <span>{String(MEDIA.length).padStart(2, "0")}</span>
          </div>

          {MEDIA.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`vinfo__button ${selected === index ? "is-active" : ""}`}
              onClick={() => setSelected(index)}
              aria-pressed={selected === index}
            >
              <span className="vinfo__num">
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="vinfo__copy">
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
              </span>

              <span className="vinfo__arrow">›</span>
            </button>
          ))}
        </aside>
      </section>
    </>
  );
}