import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./AlbumLockPanel.module.css";

const CODE_LENGTH = 4;
const ACCESS_CODE = "FX01";

export default function AlbumLockPanel({ onUnlock }) {
  const [chars, setChars] = useState(Array(CODE_LENGTH).fill(""));
  const [state, setState] = useState("locked");
  const refs = useRef([]);

  const focusInput = useCallback((index) => {
    if (index >= 0 && index < CODE_LENGTH) {
      refs.current[index]?.focus();
      refs.current[index]?.select?.();
    }
  }, []);

  const resetPanel = useCallback(() => {
    setChars(Array(CODE_LENGTH).fill(""));
    setState("locked");
    focusInput(0);
  }, [focusInput]);

  const submit = useCallback(
    (code) => {
      const normalized = code.toUpperCase();

      if (normalized.length < CODE_LENGTH) return;

      if (normalized === ACCESS_CODE) {
        setState("unlocked");
        setTimeout(() => onUnlock?.(), 500);
      } else {
        setState("error");
        setTimeout(() => {
          resetPanel();
        }, 700);
      }
    },
    [onUnlock, resetPanel]
  );

  const handleChange = useCallback(
    (index, value) => {
      const val = value.slice(-1).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const next = [...chars];
      next[index] = val;
      setChars(next);

      if (val && index < CODE_LENGTH - 1) {
        focusInput(index + 1);
      }

      if (next.every(Boolean)) {
        submit(next.join(""));
      }
    },
    [chars, focusInput, submit]
  );

  const handleKeyDown = useCallback(
    (e, index) => {
      if (e.key === "Backspace") {
        e.preventDefault();

        const next = [...chars];

        if (chars[index]) {
          next[index] = "";
          setChars(next);
          return;
        }

        if (index > 0) {
          next[index - 1] = "";
          setChars(next);
          focusInput(index - 1);
        }

        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        focusInput(index - 1);
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        focusInput(index + 1);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        submit(chars.join(""));
      }
    },
    [chars, focusInput, submit]
  );

  const handlePaste = useCallback(
    (e) => {
      e.preventDefault();

      const pasted = e.clipboardData
        .getData("text")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, CODE_LENGTH);

      if (!pasted) return;

      const next = Array(CODE_LENGTH).fill("");
      pasted.split("").forEach((char, index) => {
        next[index] = char;
      });

      setChars(next);

      if (next.every(Boolean)) {
        submit(next.join(""));
      } else {
        focusInput(pasted.length);
      }
    },
    [focusInput, submit]
  );

  useEffect(() => {
    focusInput(0);
  }, [focusInput]);

  return (
    <div className={`${styles.wrapper} ${styles[state] || ""}`}>
      <div className={styles.card}>
        <h2 className={styles.title}>Private Album</h2>

        {state !== "unlocked" && (
          <>
            <p className={styles.subtitle}>
              Enter the 4-character access code to unlock the album.
            </p>

            <div className={styles.row} onPaste={handlePaste}>
              {chars.map((char, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    refs.current[index] = el;
                  }}
                  type="text"
                  inputMode="text"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  value={char}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={styles.box}
                  aria-label={`Character ${index + 1} of ${CODE_LENGTH}`}
                />
              ))}
            </div>

            <p className={styles.message}>
              {state === "error" ? (
                <span className={styles.errorText}>
                  Incorrect code. Try again.
                </span>
              ) : (
                "Use letters and numbers only."
              )}
            </p>
          </>
        )}

        {state === "unlocked" && (
          <>
            <p className={`${styles.message} ${styles.successText}`}>
              Album unlocked successfully.
            </p>

            <div className={styles.gallery}>
              <video
                src="/videos/album.mp4"
                controls
                autoPlay
                playsInline
                preload="metadata"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
