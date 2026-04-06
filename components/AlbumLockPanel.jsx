import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./AlbumLockPanel.module.css";

export default function AlbumLockPanel({
  unlockCode = "FX01",
  albumTitle = "AX01",
  userPath = "FX/USER01",
  onUnlock,
}) {
  const [chars, setChars] = useState(["", "", "", ""]);
  const [panelState, setPanelState] = useState("locked");
  const [glitchActive, setGlitchActive] = useState(false);
  const [shaking, setShaking] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (panelState === "unlocked") return;
    const interval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [panelState]);

  const submit = useCallback(
    (code) => {
      if (code.toUpperCase() === unlockCode.toUpperCase()) {
        setPanelState("unlocked");
        setTimeout(() => onUnlock?.(), 900);
      } else {
        setPanelState("error");
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
        setTimeout(() => {
          setPanelState("locked");
          setChars(["", "", "", ""]);
          inputRefs.current[0]?.focus();
        }, 900);
      }
    },
    [unlockCode, onUnlock]
  );

  const handleChange = useCallback(
    (index, value) => {
      if (panelState !== "locked") return;
      const char = value.slice(-1).toUpperCase();
      const next = [...chars];
      next[index] = char;
      setChars(next);
      if (char && index < 3) inputRefs.current[index + 1]?.focus();
      if (index === 3 && char) {
        const code = [...next.slice(0, 3), char].join("");
        if (code.length === 4) submit(code);
      }
    },
    [chars, panelState, submit]
  );

  const handleKeyDown = useCallback(
    (index, e) => {
      if (e.key === "Backspace" && !chars[index] && index > 0)
        inputRefs.current[index - 1]?.focus();
      if (e.key === "Enter") {
        const code = chars.join("");
        if (code.length === 4) submit(code);
      }
    },
    [chars, submit]
  );

  const handlePaste = useCallback(
    (e) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").trim().toUpperCase().slice(0, 4);
      const next = ["", "", "", ""];
      pasted.split("").forEach((c, i) => { next[i] = c; });
      setChars(next);
      if (pasted.length === 4) submit(pasted);
      else inputRefs.current[pasted.length]?.focus();
    },
    [submit]
  );

  const resetPanel = () => {
    setPanelState("locked");
    setChars(["", "", "", ""]);
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  };

  return (
    <div className={styles.wrapper}>
      <div
        className={[
          styles.card,
          panelState === "error" ? styles.cardError : "",
          panelState === "unlocked" ? styles.cardUnlocked : "",
          styles.cardIn,
        ].join(" ")}
      >
        <div className={styles.topIcon}>
          <span className={panelState === "unlocked" ? styles.iconUnlocked : styles.iconCrown}>
            {panelState === "unlocked" ? "✦" : "♛"}
          </span>
        </div>

        <h1
          className={[
            styles.title,
            glitchActive ? styles.glitch : "",
            panelState === "unlocked" ? styles.titleUnlocked : "",
          ].join(" ")}
        >
          {panelState === "unlocked" ? "UNLOCKED" : "LOCKED"}
        </h1>

        <div className={styles.path}>
          <span className={styles.pathDim}>{userPath}/</span>
          <span className={styles.pathBold}>{albumTitle}</span>
        </div>

        <div className={styles.separator}>
          <span />
          <span className={styles.sepDot} />
          <span />
        </div>

        {panelState !== "unlocked" && (
          <div className={[styles.inputRow, shaking ? styles.shake : ""].join(" ")}>
            {chars.map((char, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                className={[
                  styles.charBox,
                  char ? styles.charBoxFilled : "",
                  panelState === "error" ? styles.charBoxError : "",
                ].join(" ")}
                maxLength={2}
                value={char}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                autoFocus={i === 0}
                autoComplete="off"
                spellCheck={false}
              />
            ))}
          </div>
        )}

        <p className={[
          styles.hint,
          panelState === "error" ? styles.hintError : "",
          panelState === "unlocked" ? styles.hintSuccess : "",
        ].join(" ")}>
          {panelState === "error"
            ? "CÓDIGO INCORRECTO"
            : panelState === "unlocked"
            ? "ACCESO CONCEDIDO"
            : "ENTER THE LAST 4 CHARACTERS"}
        </p>

        {panelState === "unlocked" ? (
          <button className={styles.btnSecondary} onClick={resetPanel}>
            ← VOLVER
          </button>
        ) : (
          <button
            className={[styles.btn, panelState === "error" ? styles.btnError : ""].join(" ")}
            onClick={() => {
              const code = chars.join("");
              if (code.length === 4) submit(code);
            }}
          >
            UNLOCK ALBUM
          </button>
        )}

        <div className={[styles.lockIcon, panelState === "unlocked" ? styles.lockPop : ""].join(" ")}>
          {panelState === "unlocked" ? "🔓" : "🔒"}
        </div>
      </div>
    </div>
  );
}
