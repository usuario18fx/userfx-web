import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./AlbumLockPanel.module.css";

interface AlbumLockPanelProps {
  unlockCode?: string;           // The correct 4-char code
  albumTitle?: string;           // e.g. "AX01"
  userPath?: string;             // e.g. "FX/USER01"
  onUnlock?: () => void;         // Callback on success
}

type PanelState = "locked" | "error" | "unlocked";

export default function AlbumLockPanel({
  unlockCode = "FX01",
  albumTitle = "AX01",
  userPath = "FX/USER01",
  onUnlock,
}: AlbumLockPanelProps) {
  const [chars, setChars] = useState<string[]>(["", "", "", ""]);
  const [panelState, setPanelState] = useState<PanelState>("locked");
  const [glitchActive, setGlitchActive] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Periodic glitch on LOCKED text
  useEffect(() => {
    if (panelState === "unlocked") return;
    const interval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [panelState]);

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (panelState !== "locked") return;
      const char = value.slice(-1).toUpperCase();
      const next = [...chars];
      next[index] = char;
      setChars(next);

      if (char && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when last box filled
      if (index === 3 && char) {
        const code = [...next.slice(0, 3), char].join("");
        if (code.length === 4) submit(code, next);
      }
    },
    [chars, panelState]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !chars[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      if (e.key === "Enter") {
        const code = chars.join("");
        if (code.length === 4) submit(code, chars);
      }
    },
    [chars]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").trim().toUpperCase().slice(0, 4);
      const next = [...chars];
      pasted.split("").forEach((c, i) => { next[i] = c; });
      setChars(next);
      if (pasted.length === 4) submit(pasted, next);
      else inputRefs.current[pasted.length]?.focus();
    },
    [chars]
  );

  const submit = (code: string, currentChars: string[]) => {
    if (code === unlockCode.toUpperCase()) {
      setPanelState("unlocked");
      setTimeout(() => onUnlock?.(), 900);
    } else {
      setPanelState("error");
      setTimeout(() => {
        setPanelState("locked");
        setChars(["", "", "", ""]);
        inputRefs.current[0]?.focus();
      }, 900);
    }
  };

  const resetPanel = () => {
    setPanelState("locked");
    setChars(["", "", "", ""]);
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  };

  return (
    <div className={styles.wrapper}>
      <motion.div
        className={`${styles.card} ${panelState === "error" ? styles.cardError : ""} ${panelState === "unlocked" ? styles.cardUnlocked : ""}`}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Crown / lock icon */}
        <div className={styles.topIcon}>
          <AnimatePresence mode="wait">
            {panelState === "unlocked" ? (
              <motion.span
                key="unlocked"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300 }}
                className={styles.iconUnlocked}
              >
                ✦
              </motion.span>
            ) : (
              <motion.span key="crown" className={styles.iconCrown}>♛</motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Title */}
        <h1 className={`${styles.title} ${glitchActive ? styles.glitch : ""}`} data-text="LOCKED">
          <AnimatePresence mode="wait">
            {panelState === "unlocked" ? (
              <motion.span
                key="u"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.titleUnlocked}
              >
                UNLOCKED
              </motion.span>
            ) : (
              <motion.span key="l">LOCKED</motion.span>
            )}
          </AnimatePresence>
        </h1>

        {/* Album path */}
        <div className={styles.path}>
          <span className={styles.pathDim}>{userPath}/</span>
          <span className={styles.pathBold}>{albumTitle}</span>
        </div>

        {/* Separator */}
        <div className={styles.separator}>
          <span />
          <span className={styles.sepDot} />
          <span />
        </div>

        {/* 4-box input */}
        <AnimatePresence>
          {panelState !== "unlocked" && (
            <motion.div
              className={styles.inputRow}
              animate={panelState === "error" ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
            >
              {chars.map((char, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  className={`${styles.charBox} ${char ? styles.charBoxFilled : ""} ${panelState === "error" ? styles.charBoxError : ""}`}
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
            </motion.div>
          )}
        </AnimatePresence>

        <p className={styles.hint}>
          {panelState === "error"
            ? "CÓDIGO INCORRECTO"
            : panelState === "unlocked"
            ? "ACCESO CONCEDIDO"
            : "ENTER THE LAST 4 CHARACTERS"}
        </p>

        {/* Action button */}
        <AnimatePresence mode="wait">
          {panelState === "unlocked" ? (
            <motion.button
              key="back"
              className={styles.btnSecondary}
              onClick={resetPanel}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              ← VOLVER
            </motion.button>
          ) : (
            <motion.button
              key="unlock"
              className={`${styles.btn} ${panelState === "error" ? styles.btnError : ""}`}
              onClick={() => {
                const code = chars.join("");
                if (code.length === 4) submit(code, chars);
              }}
              whileTap={{ scale: 0.96 }}
            >
              UNLOCK ALBUM
            </motion.button>
          )}
        </AnimatePresence>

        {/* Lock icon */}
        <motion.div
          className={styles.lockIcon}
          animate={
            panelState === "unlocked"
              ? { rotate: [0, -15, 0], scale: [1, 1.2, 1] }
              : {}
          }
          transition={{ duration: 0.4 }}
        >
          {panelState === "unlocked" ? "🔓" : panelState === "error" ? "🔒" : "🔒"}
        </motion.div>
      </motion.div>
    </div>
  );
}
