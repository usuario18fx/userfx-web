import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./AlbumLockPanel.module.css";
import wallpaper from "../assets/wallpaper.jpg";

const CODE_LENGTH = 4;

export default function AlbumLockPanel({
  onUnlock,
  accessCode = "FX01",
  videoSrc = "",
}) {
  const [chars, setChars] = useState(Array(CODE_LENGTH).fill(""));
  const [status, setStatus] = useState("locked");
  const [activeTab, setActiveTab] = useState("FX-USER01-");
  const inputsRef = useRef([]);

  const normalizedCode = useMemo(() => {
    return String(accessCode).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH);
  }, [accessCode]);

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
      const cleanValue = String(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (cleanValue.length !== CODE_LENGTH) return;
      if (cleanValue === normalizedCode) {
        setStatus("unlocked");
        window.setTimeout(() => { onUnlock?.(); }, 420);
        return;
      }
      setStatus("error");
      window.setTimeout(() => { resetInputs(); }, 760);
    },
    [normalizedCode, onUnlock, resetInputs]
  );

  const handleChange = useCallback(
    (index, rawValue) => {
      const value = rawValue.slice(-1).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const nextChars = [...chars];
      nextChars[index] = value;
      setChars(nextChars);
      if (value && index < CODE_LENGTH - 1) focusInput(index + 1);
      if (nextChars.every(Boolean)) submitCode(nextChars.join(""));
    },
    [chars, focusInput, submitCode]
  );

  const handleKeyDown = useCallback(
    (event, index) => {
      if (event.key === "Backspace") {
        event.preventDefault();
        const nextChars = [...chars];
        if (chars[index]) { nextChars[index] = ""; setChars(nextChars); return; }
        if (index > 0) { nextChars[index - 1] = ""; setChars(nextChars); focusInput(index - 1); }
        return;
      }
      if (event.key === "ArrowLeft") { event.preventDefault(); focusInput(index - 1); return; }
      if (event.key === "ArrowRight") { event.preventDefault(); focusInput(index + 1); return; }
      if (event.key === "Enter") { event.preventDefault(); submitCode(chars.join("")); }
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
      const nextChars = Array.from({ length: CODE_LENGTH }, (_, i) => pastedValue[i] || "");
      setChars(nextChars);
      if (nextChars.every(Boolean)) submitCode(nextChars.join(""));
      else focusInput(Math.min(pastedValue.length, CODE_LENGTH - 1));
    },
    [focusInput, submitCode]
  );

  useEffect(() => { focusInput(0); }, [focusInput]);

  return (
    <section
      className={styles.root}
      style={{ "--album-wallpaper": `url(${wallpaper})` }}
    >
      {/* Background */}
      <div className={styles.stage}>
        <div className={styles.wallpaper} />
        <div className={styles.globalVignette} />
        <div className={styles.globalNoise} />
      </div>

      {/* UI */}
      <div className={styles.content}>

        {/* Spacer: keeps panel below the logo (top ~65% of image) */}
        <div className={styles.logoZone} aria-hidden="true" />

        {/* Panel painted on the dark lower wall */}
        <div
          className={[
            styles.panel,
            status === "error"    ? styles.panelError    : "",
            status === "unlocked" ? styles.panelUnlocked : "",
          ].join(" ")}
        >
          {status !== "unlocked" ? (
            <>
              <div className={styles.panelTop}>
                <span className={styles.kicker}>EXCLUSIVE ACCESS</span>
                <span className={styles.statusPill}>USER FX</span>
              </div>

              <div className={styles.lockIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2.4" fill="currentColor" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              </div>

              <h2 className={styles.title}>LOCKED ACCESS</h2>

              <div className={styles.tabRow}>
                {["FX-USER01-", "AX01-"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`${styles.tabButton} ${activeTab === tab ? styles.tabButtonActive : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className={styles.codeStack} onPaste={handlePaste}>
                <div className={styles.prefixRow}>
                  <span className={styles.prefixLabel}>PREFIX</span>
                  <span className={styles.prefixValue}>{activeTab}</span>
                </div>
                <div className={styles.codeRow}>
                  {chars.map((char, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputsRef.current[index] = el; }}
                      type="text"
                      inputMode="text"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      value={char}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className={`${styles.codeBox} ${status === "error" ? styles.codeBoxError : ""}`}
                      aria-label={`Character ${index + 1} of ${CODE_LENGTH}`}
                    />
                  ))}
                </div>
              </div>

              {status === "error" && (
                <p className={styles.errorText}>Incorrect code. Try again.</p>
              )}

              <button
                type="button"
                className={styles.unlockButton}
                onClick={() => submitCode(chars.join(""))}
              >
                UNLOCK ALBUM
              </button>

              <div className={styles.bottomMeta}>
                <span className={styles.arrowHint}>↑</span>
                <span className={styles.bottomText}>Enter the last 4 characters</span>
              </div>
            </>
          ) : (
            <>
              <div className={styles.panelTop}>
                <span className={styles.kicker}>ACCESS GRANTED</span>
                <span className={`${styles.statusPill} ${styles.statusPillGreen}`}>UNLOCKED</span>
              </div>
              <div className={styles.successIcon}>✓</div>
              <h2 className={styles.title}>ALBUM UNLOCKED</h2>
              {videoSrc ? (
                <div className={styles.mediaFrame}>
                  <video src={videoSrc} controls autoPlay playsInline preload="metadata" className={styles.video} />
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <span className={styles.emptyStateTitle}>Ready</span>
                  <span className={styles.emptyStateText}>Pass your content via <code>videoSrc</code> prop.</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span className={styles.footerText}>
            USER | <span className={styles.footerFx}>FX♛</span> | 2026 © ALL RIGHTS RESERVED
          </span>
          <span className={styles.footerBot}>@User18Fx_bot</span>
        </div>
      </div>
    </section>
  );
}
