import { useState, useRef, useEffect, useCallback } from "react";
import styles from "componentes/AlbumLockPanel.module.css";

const CODE_LENGTH = 4;
const ACCESS_CODE = "FX01";

export default function AlbumLockPanel({ onUnlock }) {
  const [chars, setChars] = useState(Array(CODE_LENGTH).fill(""));
  const [status, setStatus] = useState("locked");
  const inputsRef = useRef([]);

  const focusInput = useCallback((index) => {
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
    (value) => {
      if (value.length !== CODE_LENGTH) return;

      if (value === ACCESS_CODE) {
        setStatus("unlocked");
        setTimeout(() => {
          onUnlock?.();
        }, 500);
      } else {
        setStatus("error");
        setTimeout(() => {
          resetInputs();
        }, 700);
      }
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
      } else {
        focusInput(pastedValue.length);
      }
    },
    [focusInput, submitCode]
  );

  useEffect(() => {
    focusInput(0);
  }, [focusInput]);

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.card} ${styles[status] || ""}`}>
        <h2 className={styles.title}>Private Album</h2>

        {status !== "unlocked" && (
          <>
            <p className={styles.subtitle}>
              Enter the 4-character access code to unlock the album.
            </p>

            <div className={styles.row} onPaste={handlePaste}>
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
                  className={styles.box}
                  aria-label={`Character ${index + 1} of ${CODE_LENGTH}`}
                />
              ))}
            </div>

            <p className={styles.message}>
              {status === "error" ? (
                <span className={styles.errorText}>
                  Incorrect code. Try again.
                </span>
              ) : (
                "Use letters and numbers only."
              )}
            </p>
          </>
        )}

        {status === "unlocked" && (
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
