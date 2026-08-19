"use client";

import React, {
  useCallback,
  useEffect,
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
  invalid: "✕ LLAVE INVÁLIDA — verifica e intenta de nuevo",
  used: "✕ LLAVE YA USADA — cada acceso es de un solo uso",
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

  const [errKind, setErrKind] =
    useState<ErrKind>("invalid");

  const [retryAfter, setRetryAfter] = useState(0);

  const [activeTab, setActiveTab] =
    useState("VAULT");

  const inputsRef = useRef<
    Array<HTMLInputElement | null>
  >([]);

  const consumedPrefill = useRef<string | null>(null);

  void accessCode;
  void videoSrc;

  const focusInput = useCallback((index: number) => {
    if (index < 0 || index >= CODE_LENGTH) {
      return;
    }

    inputsRef.current[index]?.focus();
    inputsRef.current[index]?.select();
  }, []);

  const resetInputs = useCallback(() => {
    setChars(Array(CODE_LENGTH).fill(""));
    setStatus("locked");
    setRetryAfter(0);

    setTimeout(() => {
      focusInput(0);
    }, 0);
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
      ) {
        return;
      }

      setStatus("verifying");

      try {
        const res = await fetch("/api/verify", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

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
            setRetryAfter(
              Number(data.retryAfter ?? 60)
            );
          }

          setStatus("error");

          setTimeout(() => {
            if (kind !== "ratelimit") {
              resetInputs();
            }
          }, 900);

          return;
        }

        setStatus("unlocked");

        window.dispatchEvent(
          new Event("vault:unlocked")
        );

        setTimeout(() => {
          onUnlock?.();
        }, 420);
      } catch {
        setErrKind("invalid");
        setStatus("error");

        setTimeout(() => {
          resetInputs();
        }, 900);
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

      if (
        value &&
        index < CODE_LENGTH - 1
      ) {
        focusInput(index + 1);
      }

      if (next.every(Boolean)) {
        submitCode(next.join(""));
      }
    },
    [chars, focusInput, submitCode]
  );

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement>,
      index: number
    ) => {
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

      if (!pasted) {
        return;
      }

      const next = Array.from(
        { length: CODE_LENGTH },
        (_, i) => pasted[i] || ""
      );

      setChars(next);

      if (next.every(Boolean)) {
        submitCode(next.join(""));
      } else {
        focusInput(
          Math.min(
            pasted.length,
            CODE_LENGTH - 1
          )
        );
      }
    },
    [focusInput, submitCode]
  );

  useEffect(() => {
    focusInput(0);
  }, [focusInput]);

  useEffect(() => {
    if (!prefill) {
      return;
    }

    if (consumedPrefill.current === prefill) {
      return;
    }

    consumedPrefill.current = prefill;

    const clean = prefill
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, CODE_LENGTH);

    if (!clean) {
      return;
    }

    const next = Array.from(
      { length: CODE_LENGTH },
      (_, i) => clean[i] || ""
    );

    setChars(next);

    if (next.every(Boolean)) {
      submitCode(next.join(""));
    } else {
      setTimeout(() => {
        focusInput(
          Math.min(
            clean.length,
            CODE_LENGTH - 1
          )
        );
      }, 0);
    }
  }, [prefill, focusInput, submitCode]);

  useEffect(() => {
    if (retryAfter <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRetryAfter((value) =>
        value <= 1 ? 0 : value - 1
      );
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [retryAfter]);

  if (status === "unlocked") {
    return (
      <section className={styles.unlockedRoot}>
        <div className={styles.grid} />
        <div className={styles.unlockedGlow} />

        <header className={styles.unlockedHeader}>
          <div className={styles.unlockedBadge}>
            ✦ USER FX VAULT · ACCESS GRANTED
          </div>
        </header>

        <div className={styles.unlockedEmpty}>
          <div className={styles.mark}>
            <span>🜲</span>
          </div>

          <div className={styles.unlockedEmptyTitle}>
            VAULT UNLOCKED
          </div>

          <p className={styles.unlockedEmptyText}>
            Acceso verificado. El sitio oficial sigue
            en pre-lanzamiento. Tu llave quedó
            registrada para cuando el Vault abra
            por completo.
          </p>

          <div className={styles.infoRow}>
            <span>BASIC</span>
            <span>PRO</span>
            <span>VIP</span>
          </div>

          <button
            type="button"
            className={styles.enterButton}
            onClick={() => onUnlock?.()}
          >
            CONTINUAR →
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.root}>
      <div className={styles.void} />
      <div className={styles.grid} />
      <div className={styles.orb} />
      <div className={styles.vignette} />
      <div className={styles.scanlines} />

      <header className={styles.hud}>
        <div className={styles.hudLeft}>
          <span className={styles.hudDot} />
          <span className={styles.hudLabel}>
            USER FX · OFFICIAL PRE
          </span>
        </div>

        <span className={styles.hudPill}>
          {activeTab}
        </span>
      </header>

      <div className={styles.lockBadge}>
        <div className={styles.brandBlock}>
          <div className={styles.lockIconWrap}>
            <span className={styles.lockPulse} />
            <svg
              className={styles.lockSvg}
              width="25"
              height="25"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect
                x="4"
                y="10"
                width="16"
                height="11"
                rx="2"
              />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </div>

          <p className={styles.kicker}>
            OFFICIAL WEBSITE · PRE-LAUNCH
          </p>

          <h1 className={styles.lockTitle}>
            USER FX VAULT
          </h1>

          <p className={styles.lede}>
            Espacio privado. Sin galería pública.
            Entra con tu llave de 4 caracteres
            mientras el Vault oficial se termina.
          </p>
        </div>
      </div>

      <div
        className={`${styles.inputPanel} ${
          status === "error"
            ? styles.inputPanelError
            : ""
        }`}
      >
        <div className={styles.panelTopLine} />

        <div className={styles.tabRow}>
          <button
            type="button"
            className={`${styles.tab} ${
              activeTab === "VAULT"
                ? styles.tabActive
                : ""
            }`}
            onClick={() => setActiveTab("VAULT")}
          >
            <span className={styles.tabDot} />
            VAULT
          </button>

          <button
            type="button"
            className={`${styles.tab} ${
              activeTab === "FX-USER01-"
                ? styles.tabActive
                : ""
            }`}
            onClick={() =>
              setActiveTab("FX-USER01-")
            }
          >
            FX-USER01-
          </button>

          <span className={styles.tabSpacer} />

          <span className={styles.tabPrefix}>
            ACCESS
          </span>
        </div>

        <div className={styles.codeRow}>
          {chars.map((char, i) => (
            <div
              key={i}
              className={styles.codeCell}
            >
              <input
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={char}
                maxLength={1}
                aria-label={`Código ${i + 1}`}
                disabled={
                  status === "verifying"
                }
                onChange={(e) =>
                  handleChange(
                    i,
                    e.target.value
                  )
                }
                onKeyDown={(e) =>
                  handleKeyDown(e, i)
                }
                onPaste={handlePaste}
                className={`${styles.codeBox} ${
                  status === "error"
                    ? styles.codeBoxError
                    : ""
                }`}
              />

              {char && (
                <span
                  className={styles.cellGlow}
                />
              )}
            </div>
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
          type="button"
          onClick={() =>
            submitCode(chars.join(""))
          }
          className={styles.unlockBtn}
          disabled={
            status === "verifying" ||
            retryAfter > 0
          }
        >
          <span className={styles.unlockBtnShine} />
          <span className={styles.unlockBtnText}>
            {status === "verifying"
              ? "VERIFYING..."
              : "ENTER VAULT"}
          </span>
        </button>

        <p className={styles.hint}>
          Introduce la llave de acceso de 4 caracteres.
          Sin pagos en esta pre.
        </p>
      </div>

      <footer className={styles.footer}>
        <div>
          <span className={styles.footerFx}>
            🜲 USER FX
          </span>{" "}
          · OFFICIAL VAULT PRE
        </div>
        <div className={styles.footerBot}>
          SESSION ENCRYPTED · ONE-TIME KEY · NO PUBLIC MEDIA
        </div>
      </footer>
    </section>
  );
}
