import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./AlbumLockPanel.module.css";

export default function AlbumLockPanel({ onUnlock }) {
  const [chars, setChars] = useState(["", "", "", ""]);
  const [state, setState] = useState("locked");
  const refs = useRef([]);

  const submit = (code) => {
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
  };

  const change = (i, v) => {
    const val = v.slice(-1).toUpperCase();
    const next = [...chars];
    next[i] = val;
    setChars(next);

    if (val && i < 3) refs.current[i + 1]?.focus();
    if (i === 3 && val) submit(next.join(""));
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        {state !== "unlocked" && (
          <div className={styles.row}>
            {chars.map((c, i) => (
              <input
                key={i}
                ref={(el) => (refs.current[i] = el)}
                value={c}
                onChange={(e) => change(i, e.target.value)}
                maxLength={1}
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
