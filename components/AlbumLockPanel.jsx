import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./AlbumLockPanel.module.css";

const CODE_LENGTH = 4;
const ACCESS_CODE = "FX01";

export default function
  AlbumLockPanel({ onUnlock } ...
  const [chars, setChars] = useState(Array(CODE_LENGTH).fill(""));
  const [status, setStatus] = useState<"locked" | "error" | "unlocked">("locked");
  const [activeTab, setActiveTab] = useState<"FX-USER01-" | "AX01">("FX-USER01-");
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = useCallback((index: number) => {
    if (index >= 0 && index < CODE_LENGTH) {
      inputsRef.current[index]?.focus();
      inputsRef.current[index]?.select?.();
    }
  }, []);

  const resetInputs = useCallback(() => {
    setChars(Array(CODE_LENGTH).fill(""));
    setStatus("locked");
    focusInput(0);
  }, [focusInput]);

  const submitCode = useCallback(
    (value: string) => {
      if (value.length !== CODE_LENGTH) return;
      if (value === ACCESS_CODE) {
        setStatus("unlocked");
        setTimeout(() => { onUnlock?.(); }, 500);
      } else {
        setStatus("error");
        setTimeout(() => { resetInputs(); }, 700);
      }
    },
    [onUnlock, resetInputs]
  );

  const handleChange = useCallback(
    (index: number, rawValue: string) => {
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
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        const nextChars = [...chars];
        if (chars[index]) { nextChars[index] = ""; setChars(nextChars); return; }
        if (index > 0) { nextChars[index - 1] = ""; setChars(nextChars); focusInput(index - 1); }
        return;
      }
      if (e.key === "ArrowLeft") { e.preventDefault(); focusInput(index - 1); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); focusInput(index + 1); return; }
      if (e.key === "Enter") { e.preventDefault(); submitCode(chars.join("")); }
    },
    [chars, focusInput, submitCode]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pastedValue = e.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH);
      if (!pastedValue) return;
      const nextChars = Array(CODE_LENGTH).fill("");
      pastedValue.split("").forEach((char, i) => { nextChars[i] = char; });
      setChars(nextChars);
      if (nextChars.every(Boolean)) submitCode(nextChars.join(""));
      else focusInput(pastedValue.length);
    },
    [focusInput, submitCode]
  );

  useEffect(() => { focusInput(0); }, [focusInput]);

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoFx}>Ŧҳ</span>
          <span className={styles.logoCrown}>🜲</span>
          <span className={styles.logoSub}>EXCLUSIVE SPACE</span>
        </div>
        <a
          href="https://t.me/User18fx"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.contactBtn}
        >
          Contact Me ⇒
        </a>
      </header>

      {/* Card */}
      <main className={styles.main}>
        <div className={`${styles.card} ${status === "error" ? styles.cardError : ""} ${status === "unlocked" ? styles.cardUnlocked : ""}`}>

          {status !== "unlocked" ? (
            <>
              {/* Lock icon */}
              <div className={styles.lockIcon}>
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2" fill="#e8336d" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#e8336d" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              </div>

              <p className={styles.lockedLabel}>LOCKED</p>

              {/* Tabs */}
              <div className={styles.tabs}>
                {(["FX-USER01-", "AX01"] as const).map((tab) => (
                  <button
                    key={tab}
                    className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Code inputs */}
              <div className={styles.codeRow} onPaste={handlePaste}>
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

              {status === "error" && (
                <p className={styles.errorMsg}>Incorrect code. Try again.</p>
              )}

              {/* Unlock button */}
              <button
                className={styles.unlockBtn}
                onClick={() => submitCode(chars.join(""))}
              >
                UNLOCK ALBUM
              </button>

              {/* Finger hint */}
              <div className={styles.hint}>👆</div>
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
                />
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <span>𝐔𝐬𝐞𝐫| <span className={styles.footerFx}>Ŧҳ 🜲</span> | 2026 © ALL RIGHTS RESERVED</span>
        <span className={styles.footerBot}>@User18Fx_bot</span>
      </footer>
    </div>
  );
}
