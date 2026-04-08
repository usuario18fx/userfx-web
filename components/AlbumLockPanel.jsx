import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./AlbumLockPanel.module.css";

export default function AlbumLockPanel({ onUnlock }) {
  const [chars, setChars] = useState(["", "", "", ""]);
  const [state, setState] = useState("locked");
  const refs = useRef([]);

  const submit = useCallback((code) => {
    if (code === "FX01") {
      setState("unlocked");
      setTimeout(() => onUnlock?.(), 500);
    } else {
      setState("error");
      setTimeout(() => {
        setState("locked");
        setChars(["", "", "", ""]);
        refs.current[0]?.focus();
      }, 600);
    }
  }, [onUnlock]);

  const change = (i, v) => {
    const val = v.slice(-1).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const next = [...chars];
    next[i] = val;
    setChars(next);

    if (val && i < 3) refs.current[i + 1]?.focus();
    if (i === 3 && val) submit(next.join(""));
  };

  const handleKeyDown = (e, i) => {
    if (e.key === "Backspace") {
      if (!chars[i] && i > 0) {
        refs.current[i - 1]?.focus();
      }
    }

    if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    }

    if (e.key === "ArrowRight" && i < 3) {
      refs.current[i + 1]?.focus();
    }

    if (e.key === "Enter") {
      submit(chars.join(""));
    }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData
      .getData("text")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 4);

    if (!paste) return;

    const next = paste.split("");
    while (next.length < 4) next.push("");

    setChars(next);

    const lastIndex = next.findIndex((c) => c === "");
    if (lastIndex === -1) {
      submit(next.join(""));
    } else {
      refs.current[lastIndex]?.focus();
    }
  };

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        {state !== "unlocked" && (
          <div
            className={styles.row}
            onPaste={handlePaste}
          >
            {chars.map((c, i) => (
              <input
                key={i}
                ref={(el) => (refs.current[i] = el)}
                value={c}
                onChange={(e) => change(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                maxLength={1}
                inputMode="text"
                autoComplete="off"
                className={styles.box}
              />
            ))}
          </div>
        )}

        {state === "unlocked" && (
          <div className={styles.gallery}>
            <video src="/videos/album.mp4" controls autoPlay />
          </div>
        )}
      </div>
    </div>
  );
}
