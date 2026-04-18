import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "./AlbumLockPanel.module.css";

const CODE_LENGTH = 4;
const ACCESS_CODE = "FX01";
const PREFIXES = ["FX-USER01-", "AX01"];
const HERO_POSTER_URL = "/assets/userfx-poster.jpg";

export default function AlbumLockPanel({ onUnlock }) {
  const [chars, setChars] = useState(Array(CODE_LENGTH).fill(""));
  const [status, setStatus] = useState("locked");
  const [activeTab, setActiveTab] = useState("FX-USER01-");
  const inputsRef = useRef([]);

  const focusInput = useCallback((index) => {
    if (index < 0 || index >= CODE_LENGTH) return;
    inputsRef.current[index]?.focus();
    inputsRef.current[index]?.select?.();
  }, []);

  const resetInputs = useCallback(() => {
    setChars(Array(CODE_LENGTH).fill(""));
    setStatus("locked");
    focusInput(0);
  }, [focusInput]);

  const submitCode = useCallback(
    (value) => {
      if (value.length !== CODE_LENGTH) return;

      if (value === ACCESS_CODE) {
        setStatus("unlocked");
        window.setTimeout(() => {
          onUnlock?.();
        }, 480);
        return;
      }

      setStatus("error");
      window.setTimeout(() => {
        resetInputs();
      }, 680);
    },
    [onUnlock, resetInputs]
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
        return;
      }

      focusInput(pastedValue.length);
    },
    [focusInput, submitCode]
  );

  useEffect(() => {
    focusInput(0);
  }, [focusInput]);

  return (
    <section className={styles.page}>
      <div className={styles.backdrop}></div>
      <div className={styles.vignette}></div>

      <header className={styles.header}>
        <div className={styles.brandMeta}>
          <span className={styles.brandFx}>Ŧҳ</span>
          <span className={styles.brandDivider}>♛</span>
          <span className={styles.brandCopy}>EXCLUSIVE SPACE</span>
        </div>

        <a
          href="https://t.me/User18fx"
          target="_blank"
          rel="noreferrer"
          className={styles.contactBtn}
        >
          Contact Me →
        </a>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.posterFrame}>
            <img
              src={HERO_POSTER_URL}
              alt="UserFX metallic poster"
              className={styles.posterImage}
              draggable="false"
            />
          </div>
        </div>

        <div
          className={[
            styles.card,
            status === "error" ? styles.cardError : "",
            status === "unlocked" ? styles.cardUnlocked : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {status !== "unlocked" ? (
            <>
              <div className={styles.lockBadge}>
                <svg viewBox="0 0 24 24" width="34" height="34" fill="none" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"></rect>
                  <path
                    d="M8 11V7a4 4 0 0 1 8 0v4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  ></path>
                </svg>
              </div>

              <p className={styles.lockedLabel}>LOCKED ACCESS</p>

              <div className={styles.tabs}>
                {PREFIXES.map((tab) => (
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

              <p className={styles.helperText}>Enter the last 4 characters to continue.</p>

              {status === "error" ? (
                <p className={styles.errorMsg}>Incorrect code. Try again.</p>
              ) : null}

              <button
                type="button"
                className={styles.unlockBtn}
                onClick={() => submitCode(chars.join(""))}
              >
                UNLOCK ALBUM
              </button>
            </>
          ) : (
            <>
              <div className={styles.successIcon}>✓</div>
              <p className={styles.successMsg}>Album unlocked</p>

              <div className={styles.gallery}>
                <video
                  src="/videos/album.mp4"
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  className={styles.video}
                ></video>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className={styles.footer}>
        <span>
          𝐔𝐬𝐞𝐫| <span className={styles.footerFx}>Ŧҳ 🜲</span> | 2026 © ALL RIGHTS RESERVED
        </span>
        <span className={styles.footerBot}>@User18Fx_bot</span>
      </footer>
    </section>
  );
}
