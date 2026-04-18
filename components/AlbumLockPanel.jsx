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

  const normalizedCode = useMemo(() =>
    String(accessCode).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH),
    [accessCode]
  );

  const focusInput = useCallback((i) => {
    if (i < 0 || i >= CODE_LENGTH) return;
    inputsRef.current[i]?.focus();
    inputsRef.current[i]?.select();
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

  const handleChange = useCallback((i, raw) => {
    const v = raw.slice(-1).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const next = [...chars]; next[i] = v; setChars(next);
    if (v && i < CODE_LENGTH - 1) focusInput(i + 1);
    if (next.every(Boolean)) submitCode(next.join(""));
  }, [chars, focusInput, submitCode]);

  const handleKeyDown = useCallback((e, i) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...chars];
      if (chars[i]) { next[i] = ""; setChars(next); return; }
      if (i > 0) { next[i - 1] = ""; setChars(next); focusInput(i - 1); }
      return;
    }
    if (e.key === "ArrowLeft")  { e.preventDefault(); focusInput(i - 1); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); focusInput(i + 1); return; }
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

  /* ── UNLOCKED ── */
  if (status === "unlocked") {
    return (
      <div className={styles.unlockedRoot}>
        <div className={styles.unlockedGlow} />
        <div className={styles.unlockedHeader}>
          <span className={styles.unlockedBadge}>✦ ACCESS GRANTED</span>
        </div>
        {videoSrc ? (
          <video
            src={videoSrc}
            controls autoPlay playsInline preload="metadata"
            className={styles.unlockedVideo}
          />
        ) : (
          <div className={styles.unlockedEmpty}>
            <div className={styles.unlockedEmptyIcon}>♛</div>
            <span className={styles.unlockedEmptyTitle}>ALBUM UNLOCKED</span>
            <span className={styles.unlockedEmptyText}>Pass your content via <code>videoSrc</code> prop.</span>
          </div>
        )}
      </div>
    );
  }

  /* ── LOCKED ── */
  return (
    <section
      className={styles.root}
      style={{ "--wp": `url(${wallpaper})` }}
    >
      {/* — Background — */}
      <div className={styles.wp} />
      <div className={styles.vignette} />
      <div className={styles.scanlines} />

      {/* — Top HUD — */}
      <div className={styles.hud}>
        <div className={styles.hudLeft}>
          <span className={styles.hudDot} />
          <span className={styles.hudLabel}>EXCLUSIVE ACCESS</span>
        </div>
        <div className={styles.hudRight}>
          <span className={styles.hudPill}>USER FX</span>
        </div>
      </div>

      {/* — Lock badge + title: sits over the logo center — */}
      <div className={styles.lockBadge}>
        <div className={styles.lockIconWrap}>
          <div className={styles.lockPulse} />
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" className={styles.lockSvg}>
            <rect x="5" y="11" width="14" height="10" rx="2.2" fill="currentColor" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <h2 className={styles.lockTitle}>LOCKED ACCESS</h2>
      </div>

      {/* — Input panel: dark steps below the rose — */}
      <div className={`${styles.inputPanel} ${status === "error" ? styles.inputPanelError : ""}`}>

        {/* Decorative top line */}
        <div className={styles.panelTopLine} />

        {/* Tabs */}
        <div className={styles.tabRow}>
          {["FX-USER01-", "AX01-"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {activeTab === tab && <span className={styles.tabDot} />}
              {tab}
            </button>
          ))}
          <span className={styles.tabSpacer} />
          <span className={styles.tabPrefix}>{activeTab}</span>
        </div>

        {/* Code row */}
        <div className={styles.codeRow} onPaste={handlePaste}>
          {chars.map((char, i) => (
            <div key={i} className={styles.codeCell}>
              <input
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
              {/* Glow under focused/filled cell */}
              {char && <div className={styles.cellGlow} />}
            </div>
          ))}
        </div>

        {status === "error" && (
          <p className={styles.errorText}>✕ Incorrect code — try again</p>
        )}

        {/* CTA button */}
        <button
          type="button"
          className={styles.unlockBtn}
          onClick={() => submitCode(chars.join(""))}
        >
          <span className={styles.unlockBtnShine} />
          <span className={styles.unlockBtnText}>UNLOCK ALBUM</span>
        </button>

        <p className={styles.hint}>Enter the last 4 characters of your code</p>
      </div>

      {/* — Footer — */}
      <div className={styles.footer}>
        <span>USER | <span className={styles.footerFx}>FX♛</span> | 2026 © ALL RIGHTS RESERVED</span>
        <span className={styles.footerBot}>@User18Fx_bot</span>
      </div>
    </section>
  );
}
