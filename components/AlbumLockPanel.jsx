import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "./UserFxAccessPanel.module.css";

const CODE_LENGTH = 4;

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
        <linearGradient id="ufx-crown-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c8e6ff" />
          <stop offset="40%" stopColor="#6aaee8" />
          <stop offset="100%" stopColor="#1a3f6e" />
        </linearGradient>

        <linearGradient id="ufx-crown-shine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <filter id="ufx-crown-glow">
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
        fill="url(#ufx-crown-grad)"
        filter="url(#ufx-crown-glow)"
      />
      <rect
        x="8"
        y="38"
        width="64"
        height="14"
        rx="3"
        fill="url(#ufx-crown-shine)"
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
        fill="url(#ufx-crown-grad)"
        filter="url(#ufx-crown-glow)"
      />
      <polygon
        points="24,38 40,4 56,38"
        fill="url(#ufx-crown-grad)"
        filter="url(#ufx-crown-glow)"
      />
      <polygon
        points="48,38 60,10 72,38"
        fill="url(#ufx-crown-grad)"
        filter="url(#ufx-crown-glow)"
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

      <polygon
        points="24,38 40,4 56,38"
        fill="url(#ufx-crown-shine)"
        opacity="0.5"
      />
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
        <radialGradient id="ufx-petal-center" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff3d6b" />
          <stop offset="100%" stopColor="#9b0026" />
        </radialGradient>

        <radialGradient id="ufx-petal-outer" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#e8335a" />
          <stop offset="100%" stopColor="#7a001e" />
        </radialGradient>

        <filter id="ufx-rose-glow">
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
        filter="url(#ufx-rose-glow)"
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
        fill="url(#ufx-petal-outer)"
        transform="rotate(-15 58 48)"
      />
      <ellipse
        cx="92"
        cy="46"
        rx="20"
        ry="15"
        fill="url(#ufx-petal-outer)"
        transform="rotate(15 92 46)"
      />
      <ellipse cx="75" cy="42" rx="16" ry="20" fill="#c8002f" opacity="0.9" />

      <ellipse
        cx="63"
        cy="52"
        rx="17"
        ry="13"
        fill="url(#ufx-petal-outer)"
        transform="rotate(-8 63 52)"
        opacity="0.95"
      />
      <ellipse
        cx="87"
        cy="52"
        rx="17"
        ry="13"
        fill="url(#ufx-petal-outer)"
        transform="rotate(8 87 52)"
        opacity="0.95"
      />

      <ellipse cx="75" cy="50" rx="13" ry="11" fill="url(#ufx-petal-center)" />
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

export default function UserFxAccessPanel({
  onUnlock,
  accessCode = "FX01",
  videoSrc = "/videos/album.mp4",
}) {
  const [chars, setChars] = useState(Array(CODE_LENGTH).fill(""));
  const [status, setStatus] = useState("locked");
  const [activeTab, setActiveTab] = useState("FX-USER01-");
  const inputsRef = useRef([]);

  const focusInput = useCallback((index) => {
    if (index < 0 || index >= CODE_LENGTH) return;
    const input = inputsRef.current[index];
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const resetInputs = useCallback(() => {
    setChars(Array(CODE_LENGTH).fill(""));
    setStatus("locked");
    focusInput(0);
  }, [focusInput]);

  const submitCode = useCallback(
    (value) => {
      if (value.length !== CODE_LENGTH) return;

      if (value === String(accessCode).toUpperCase()) {
        setStatus("unlocked");
        window.setTimeout(() => {
          if (onUnlock) onUnlock();
        }, 450);
        return;
      }

      setStatus("error");
      window.setTimeout(() => {
        resetInputs();
      }, 700);
    },
    [accessCode, onUnlock, resetInputs]
  );

  const handleChange = useCallback(
    (index, rawValue) => {
      const value = rawValue.slice(-1).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const nextChars = [...chars];
      nextChars[index] = value;
      setChars(nextChars);

      if (value && index < CODE_LENGTH - 1) {
        focusInput(index + 1);
      }

      if (nextChars.every(Boolean)) {
        submitCode(nextChars.join(""));
      }
    },
    [chars, focusInput, submitCode]
  );

  const handleKeyDown = useCallback(
    (event, index) => {
      if (event.key === "Backspace") {
        event.preventDefault();
        const nextChars = [...chars];

        if (chars[index]) {
          nextChars[index] = "";
          setChars(nextChars);
          return;
        }

        if (index > 0) {
          nextChars[index - 1] = "";
          setChars(nextChars);
          focusInput(index - 1);
        }
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        focusInput(index - 1);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        focusInput(index + 1);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        submitCode(chars.join(""));
      }
    },
    [chars, focusInput, submitCode]
  );

  const handlePaste = useCallback(
    (event) => {
      event.preventDefault();

      const pastedValue = event.clipboardData
        .getData("text")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, CODE_LENGTH);

      if (!pastedValue) return;

      const nextChars = Array(CODE_LENGTH).fill("");
      pastedValue.split("").forEach((char, index) => {
        nextChars[index] = char;
      });

      setChars(nextChars);

      if (nextChars.every(Boolean)) {
        submitCode(nextChars.join(""));
      } else {
        focusInput(Math.min(pastedValue.length, CODE_LENGTH - 1));
      }
    },
    [focusInput, submitCode]
  );

  useEffect(() => {
    focusInput(0);
  }, [focusInput]);

  return (
    <section className={styles.root}>
      <div className={styles.heroBrand}>
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
      </div>

      <div className={styles.cardWrap}>
        <div
          className={[
            styles.card,
            status === "error" ? styles.cardError : "",
            status === "unlocked" ? styles.cardUnlocked : "",
          ].join(" ")}
        >
          {status !== "unlocked" ? (
            <>
              <div className={styles.lockIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2" fill="#e8336d" />
                  <path
                    d="M8 11V7a4 4 0 0 1 8 0v4"
                    stroke="#e8336d"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </div>

              <p className={styles.lockedLabel}>LOCKED ACCESS</p>

              <div className={styles.tabs}>
                {["FX-USER01-", "AX01"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className={styles.codeRow} onPaste={handlePaste}>
                {chars.map((char, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      inputsRef.current[index] = element;
                    }}
                    type="text"
                    inputMode="text"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={1}
                    value={char}
                    onChange={(event) => handleChange(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                    className={`${styles.codeBox} ${status === "error" ? styles.codeBoxError : ""}`}
                    aria-label={`Character ${index + 1} of ${CODE_LENGTH}`}
                  />
                ))}
              </div>

              {status === "error" && (
                <p className={styles.errorMsg}>Incorrect code. Try again.</p>
              )}

              <button
                type="button"
                className={styles.unlockBtn}
                onClick={() => submitCode(chars.join(""))}
              >
                UNLOCK ALBUM
              </button>

              <div className={styles.hint}>👆</div>
            </>
          ) : (
            <>
              <div className={styles.successIcon}>✓</div>
              <p className={styles.successMsg}>Album unlocked</p>

              <div className={styles.gallery}>
                <video
                  src={videoSrc}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  className={styles.video}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
