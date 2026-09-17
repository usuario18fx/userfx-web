"use client";

import { useEffect, useRef, useState } from "react";
import "./VaultInfoDevice.css";

/* =========================================================
   USER FX · DOSSIER VIDEO DEVICE
   ========================================================= */

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
    src: "/assets/introFX.mp4",
    poster: "/assets/album/PRVW/PRVW-01.jpg",
  },
  {
    id: 2,
    title: "NEW DROP",
    subtitle: "NOW AVAILABLE",
      src: "/assets/introFX.mp4",
    poster: "/assets/album/PRVW/PRVW-02.jpg",
  },
  {
    id: 3,
    title: "VAULT NEWS",
    subtitle: "LATEST INFORMATION",
    src: "/assets/introFX.mp4",
    poster: "/assets/album/PRVW/PRVW-04.jpg",
  },
];

export default function VaultInfoDevice() {
  const [selected, setSelected] = useState(0);

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const current = MEDIA[selected];

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    video.pause();
    video.currentTime = 0;
    video.load();
  }, [selected]);

  return (
    <section
      className="vinfo"
      aria-label="USER FX media dossier"
    >
      {/* ─────────────────────────────────────
          VIDEO
          ───────────────────────────────────── */}

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

          <strong>
            {current.title}
          </strong>
        </div>
      </div>

      {/* ─────────────────────────────────────
          LATEST UPDATES
          ───────────────────────────────────── */}

      <aside className="vinfo__buttons">
        <div className="vinfo__title">
          LATEST UPDATES
        </div>

        {MEDIA.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={[
              "vinfo__button",
              selected === index
                ? "is-active"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setSelected(index)}
            aria-pressed={selected === index}
          >
            <span className="vinfo__num">
              {String(index + 1).padStart(
                2,
                "0",
              )}
            </span>

            <span className="vinfo__copy">
              <strong>
                {item.title}
              </strong>

              <small>
                {item.subtitle}
              </small>
            </span>

            <span
              className="vinfo__arrow"
              aria-hidden="true"
            >
              ›
            </span>
          </button>
        ))}
      </aside>
    </section>
  );
}
