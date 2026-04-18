import React from "react";
import styles from "./UserFxHero.module.css";

function CrownSVG() {
  return (
    <svg
      viewBox="0 0 80 60"
      width="54"
      height="40"
      fill="none"
      className={styles.crownSvg}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="crownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c8e6ff" />
          <stop offset="40%" stopColor="#6aaee8" />
          <stop offset="100%" stopColor="#1a3f6e" />
        </linearGradient>

        <linearGradient id="crownShine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <filter id="crownGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect
        x="8"
        y="38"
        width="64"
        height="14"
        rx="3"
        fill="url(#crownGrad)"
        filter="url(#crownGlow)"
      />
      <rect
        x="8"
        y="38"
        width="64"
        height="14"
        rx="3"
        fill="url(#crownShine)"
      />

      {[18, 32, 48, 62].map((x) => (
        <circle
          key={x}
          cx={x}
          cy="45"
          r="3"
          fill="#4a90d9"
          stroke="#a8d4ff"
          strokeWidth="0.8"
        />
      ))}

      <polygon
        points="8,38 20,10 32,28"
        fill="url(#crownGrad)"
        filter="url(#crownGlow)"
      />
      <polygon
        points="24,38 40,4 56,38"
        fill="url(#crownGrad)"
        filter="url(#crownGlow)"
      />
      <polygon
        points="48,38 60,10 72,38"
        fill="url(#crownGrad)"
        filter="url(#crownGlow)"
      />

      <circle
        cx="20"
        cy="11"
        r="4"
        fill="#a8d4ff"
        stroke="#ffffff"
        strokeWidth="0.8"
        opacity="0.9"
      />
      <circle
        cx="40"
        cy="5"
        r="5"
        fill="#7ec0ff"
        stroke="#ffffff"
        strokeWidth="1"
        opacity="0.95"
      />
      <circle
        cx="60"
        cy="11"
        r="4"
        fill="#a8d4ff"
        stroke="#ffffff"
        strokeWidth="0.8"
        opacity="0.9"
      />

      <polygon points="24,38 40,4 56,38" fill="url(#crownShine)" opacity="0.5" />
    </svg>
  );
}

function RoseSVG() {
  return (
    <svg
      viewBox="0 0 160 100"
      width="180"
      height="110"
      className={styles.roseSvg}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="petalCenter" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff3d6b" />
          <stop offset="100%" stopColor="#9b0026" />
        </radialGradient>

        <radialGradient id="petalOuter" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#e8335a" />
          <stop offset="100%" stopColor="#7a001e" />
        </radialGradient>

        <filter id="roseGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M 75 95 Q 72 70 68 55"
        stroke="#2d6e30"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      <ellipse
        cx="58"
        cy="72"
        rx="18"
        ry="9"
        fill="#2d6e30"
        transform="rotate(-35 58 72)"
        opacity="0.9"
      />
      <ellipse
        cx="80"
        cy="78"
        rx="14"
        ry="7"
        fill="#3a8c3e"
        transform="rotate(20 80 78)"
        opacity="0.85"
      />
      <path d="M 58 72 Q 68 66 75 68" stroke="#1a4d1c" strokeWidth="1" fill="none" />
      <path d="M 80 78 Q 78 70 75 70" stroke="#1a4d1c" strokeWidth="1" fill="none" />

      <ellipse
        cx="62"
        cy="42"
        rx="18"
        ry="14"
        fill="#8b001e"
        transform="rotate(-20 62 42)"
        opacity="0.8"
        filter="url(#roseGlow)"
      />
      <ellipse
        cx="88"
        cy="40"
        rx="18"
        ry="14"
        fill="#8b001e"
        transform="rotate(20 88 40)"
        opacity="0.8"
      />
      <ellipse cx="75" cy="35" rx="14" ry="18" fill="#7a001e" opacity="0.7" />

      <ellipse
        cx="58"
        cy="48"
        rx="20"
        ry="15"
        fill="url(#petalOuter)"
        transform="rotate(-15 58 48)"
      />
      <ellipse
        cx="92"
        cy="46"
        rx="20"
        ry="15"
        fill="url(#petalOuter)"
        transform="rotate(15 92 46)"
      />
      <ellipse cx="75" cy="42" rx="16" ry="20" fill="#c8002f" opacity="0.9" />

      <ellipse
        cx="63"
        cy="52"
        rx="17"
        ry="13"
        fill="url(#petalOuter)"
        transform="rotate(-8 63 52)"
        opacity="0.95"
      />
      <ellipse
        cx="87"
        cy="52"
        rx="17"
        ry="13"
        fill="url(#petalOuter)"
        transform="rotate(8 87 52)"
        opacity="0.95"
      />

      <ellipse cx="75" cy="50" rx="13" ry="11" fill="url(#petalCenter)" />
      <ellipse cx="75" cy="50" rx="8" ry="7" fill="#ff1a4f" opacity="0.9" />
      <ellipse cx="73" cy="48" rx="4" ry="3" fill="#ff6b8a" opacity="0.5" />
      <ellipse
        cx="68"
        cy="45"
        rx="5"
        ry="3"
        fill="#ff8fa8"
        opacity="0.4"
        transform="rotate(-20 68 45)"
      />
    </svg>
  );
}

export default function UserFxHero() {
  return (
    <section className={styles.heroBrand}>
      <div className={styles.heroInner}>
        <div className={styles.heroLeft}>
          <span className={styles.heroUser}>USER</span>
        </div>

        <div className={styles.heroRight}>
          <div className={styles.crownWrap}>
            <CrownSVG />
          </div>
          <span className={styles.heroFx}>FX</span>
        </div>

        <div className={styles.roseWrap}>
          <RoseSVG />
        </div>
      </div>
    </section>
  );
}
