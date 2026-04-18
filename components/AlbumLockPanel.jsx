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
    inputsRef.current[index]?.focus();
    inputsRef.current[index]?.select();
  }, []);

  const resetInputs = useCallback(() => {
    setChars(Array(CODE_LENGTH).fill(""));
    setStatus("locked");
    focusInput(0);
  }, [focusInput]);

  const submitCode = useCallback((value) => {
    const clean = String(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length !== CODE_LENGTH) return;
    if (clean === normalizedCode) {
      setStatus("unlocked");
      window.setTimeout(() => onUnlock?.(), 420);
      return;
    }
    setStatus("error");
    window.setTimeout(() => resetInputs(), 760);
  }, [normalizedCode, onUnlock, resetInputs]);

  const handleChange = useCallback((index, raw) => {
    const v = raw.slice(-1).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const next = [...chars]; next[index] = v; setChars(next);
    if (v && index < CODE_LENGTH - 1) focusInput(index + 1);
    if (next.every(Boolean)) submitCode(next.join(""));
  }, [chars, focusInput, submitCode]);

  const handleKeyDown = useCallback((e, index) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...chars];
      if (chars[index]) { next[index] = ""; setChars(next); return; }
      if (index > 0) { next[index - 1] = ""; setChars(next); focusInput(index - 1); }
      return;
    }
    if (e.key === "ArrowLeft")  { e.preventDefault(); focusInput(index - 1); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); focusInput(index + 1); return; }
    if (e.key === "Enter")      { e.preventDefault(); submitCode(chars.join("")); }
  }, [chars, focusInput, submitCode]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const p = e.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH);
    if (!p) return;
    const next = Array.from({ length: CODE_LENGTH }, (_, i) => p[i] || "");
    setChars(next);
    if (next.every(Boolean)) submitCode(next.join(""));
    else focusInput(Math.min(p.length, CODE_LENGTH - 1));
  }, [focusInput, submitCode]);

  useEffect(() => { focusInput(0); }, [focusInput]);

  /* ── UNLOCKED: full screen video ── */
  if (status === "unlocked") {
    return (
      <div className={styles.unlockedRoot}>
        <div className={styles.unlockedBadge}>
          <span className={styles.unlockedKicker}>ACCESS GRANTED</span>
        </div>
        {videoSrc ? (
          <video
            src={videoSrc}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className={styles.unlockedVideo}
          />
        ) : (
          <div className={styles.unlockedEmpty}>
            <span className={styles.unlockedEmptyTitle}>ALBUM UNLOCKED</span>
            <span className={styles.unlockedEmptyText}>
              Pass your content via <code>videoSrc</code> prop.
            </span>
          </div>
        )}
      </div>
    );
  }

  /* ── LOCKED: overlay on wallpaper ── */
  return (
    <section
      className={styles.root}
      style={{ "--album-wallpaper": `url(${wallpaper})` }}
    >
      {/* Wallpaper */}
      <div className={styles.wallpaper} />
      <div className={styles.vignette} />

      {/* ── TOP ZONE: "EXCLUSIVE ACCESS" label over brick area ── */}
      <div className={styles.topZone}>
        <span className={styles.topKicker}>EXCLUSIVE ACCESS</span>
        <span className={styles.topPill}>USER FX</span>
      </div>

      {/* ── MID ZONE: code prefix label — sits on the dark "F" bar ── */}
      <div className={styles.midZone}>
        <span className={styles.midPrefix}>FX-USER01-</span>
      </div>

      {/* ── BOTTOM ZONE: below the rose / dark steps area ── */}
      <div className={styles.bottomZone}>

        {/* Lock + title */}
        <div className={styles.lockRow}>
          <div className={styles.lockIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2.2" fill="currentColor" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          <h2 className={styles.title}>LOCKED ACCESS</h2>
        </div>

        {/* Tabs */}
        <div className={styles.tabRow}>
          {["FX-USER01-", "AX01-"].map((tab) => (
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

        {/* Code inputs */}
        <div className={styles.codeRow} onPaste={handlePaste}>
          {chars.map((char, i) => (
            <input
              key={i}
              ref={(el) => { inputsRef.current[i] = el; }}
              type="text"
              inputMode="text"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={char}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={`${styles.codeBox} ${status === "error" ? styles.codeBoxError : ""}`}
              aria-label={`Character ${i + 1} of ${CODE_LENGTH}`}
            />
          ))}
        </div>

        {status === "error" && (
          <p className={styles.errorText}>Incorrect code. Try again.</p>
        )}

        {/* CTA */}
        <button
          type="button"
          className={styles.unlockBtn}
          onClick={() => submitCode(chars.join(""))}
        >
          UNLOCK ALBUM
        </button>

        <p className={styles.hint}>↑ Enter the last 4 characters</p>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span>USER | <span className={styles.footerFx}>FX♛</span> | 2026 © ALL RIGHTS RESERVED</span>
        <span className={styles.footerBot}>@User18Fx_bot</span>
      </div>
    </section>
  );
}
