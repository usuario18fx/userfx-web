"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./AlbumLockPanel.module.css";
const CODE_LENGTH = 4;
type Status = "locked" | "verifying" | "error" | "unlocked";
type ErrKind = "invalid" | "used" | "ratelimit";

type AlbumLockPanelProps = {
  onUnlock?: () => void;
  accessCode?: string;
  videoSrc?: string;
  prefill?: string | null;
};

const ERR_TEXT: Record<ErrKind, string> = {
  invalid: "✕ CÓDIGO INCORRECTO — intenta de nuevo",
  used: "✕ CÓDIGO YA USADO — cada llave abre una sola vez",
  ratelimit: "✕ DEMASIADOS INTENTOS — espera unos segundos",
};

function getFingerprint(): string {
  try {
    const raw = [
      navigator.userAgent,
      screen.width,
      screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ].join("|");

    let h = 5381;
    for (let i = 0; i < raw.length; i++) {
      h = ((h << 5) + h + raw.charCodeAt(i)) | 0;
    }

    return `fp_${(h >>> 0).toString(36)}`;
  } catch {
    return "fp_anon";
  }
}

export default function AlbumLockPanel({
  onUnlock,
  accessCode = "",
  videoSrc = "",
  prefill = null,
}: AlbumLockPanelProps) {
  const [chars, setChars] = useState<string[]>(
    Array(CODE_LENGTH).fill("")
  );
  const [status, setStatus] = useState<Status>("locked");
  const [errKind, setErrKind] = useState<ErrKind>("invalid");
  const [retryAfter, setRetryAfter] = useState(0);
  const [activeTab, setActiveTab] = useState("FX-USER01-");

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const consumedPrefill = useRef<string | null>(null);

  const focusInput = useCallback((index: number) => {
    if (index < 0 || index >= CODE_LENGTH) return;
    inputsRef.current[index]?.focus();
    inputsRef.current[index]?.select();
  }, []);

  const resetInputs = useCallback(() => {
    setChars(Array(CODE_LENGTH).fill(""));
    setStatus("locked");
    setRetryAfter(0);
    setTimeout(() => focusInput(0), 0);
  }, [focusInput]);

  const submitCode = useCallback(
    async (value: string) => {
      const clean = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(-CODE_LENGTH);

      if (
        clean.length !== CODE_LENGTH ||
        status === "verifying" ||
        status === "unlocked"
      ) return;
      setStatus("verifying");
      try {
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: clean,
            fingerprint: getFingerprint(),
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          const kind: ErrKind =
            data.error === "used"
              ? "used"
              : data.error === "ratelimit"
              ? "ratelimit"
              : "invalid";

          setErrKind(kind);

          if (kind === "ratelimit") {
            setRetryAfter(Number(data.retryAfter ?? 60));
          }

          setStatus("error");

          setTimeout(() => {
            if (kind !== "ratelimit") resetInputs();
          }, 900);

          return;
        }

        setStatus("unlocked");
        window.dispatchEvent(new Event("vault:unlocked"));

        setTimeout(() => onUnlock?.(), 420);
      } catch {
        setErrKind("invalid");
        setStatus("error");
        setTimeout(resetInputs, 900);
      }
    },
    [status, resetInputs, onUnlock]
  );

  const handleChange = useCallback(
    (index: number, raw: string) => {
      const value = raw
        .slice(-1)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

      const next = [...chars];
      next[index] = value;
      setChars(next);

      if (value && index < CODE_LENGTH - 1) {
        focusInput(index + 1);
      }

      if (next.every(Boolean)) {
        submitCode(next.join(""));
      }
    },
    [chars, focusInput, submitCode]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
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
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        focusInput(index - 1);
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        focusInput(index + 1);
      }

      if (e.key === "Enter") {
        e.preventDefault();
        submitCode(chars.join(""));
      }
    },
    [chars, focusInput, submitCode]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();

      const pasted = e.clipboardData
        .getData("text")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(-CODE_LENGTH);

      if (!pasted) return;

      const next = Array.from({ length: CODE_LENGTH }, (_, i) => pasted[i] || "");
      setChars(next);

      if (next.every(Boolean)) {
        submitCode(next.join(""));
      } else {
        focusInput(Math.min(pasted.length, CODE_LENGTH - 1));
      }
    },
    [focusInput, submitCode]
  );

  useEffect(() => {
    focusInput(0);
  }, [focusInput]);

  useEffect(() => {
    if (retryAfter <= 0) return;

    const timer = setInterval(() => {
      setRetryAfter((v) => (v <= 1 ? 0 : v - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [retryAfter]);

  // 🔓 UNLOCKED VIEW
  if (status === "unlocked") {
    return (
      <section className={styles.unlocked}>
        <div className={styles.unlockedInner}>
          <div className={styles.unlockedLabel}>
            ✦ USER FX · ACCESS GRANTED
          </div>

          {videoSrc ? (
            <video
              src={videoSrc}
              controls
              autoPlay
              playsInline
              className={styles.video}
            />
          ) : (
            <button
              className={styles.enterButton}
              onClick={() => onUnlock?.()}
            >
              ENTRAR →
            </button>
          )}
        </div>
      </section>
    );
  }

  // 🔒 LOCKED VIEW
  return (
    <section className={styles.root}>
      <div className={styles.content}>
        <h1 className={styles.title}>LOCKED ACCESS</h1>

        <div className={styles.codeRow}>
          {chars.map((char, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              value={char}
              maxLength={1}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onPaste={handlePaste}
              className={styles.codeBox}
            />
          ))}
        </div>

        {status === "error" && (
          <p className={styles.errorText}>
            {errKind === "ratelimit"
              ? `Espera ${retryAfter}s`
              : ERR_TEXT[errKind]}
          </p>
        )}

        <button
          onClick={() => submitCode(chars.join(""))}
          className={styles.unlockBtn}
        >
          UNLOCK
        </button>
      </div>
    </section>
  );
}