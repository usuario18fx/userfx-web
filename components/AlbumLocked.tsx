"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./AlbumLockPanel.module.css";

const CODE_LENGTH = 4;
const TABS = ["BS02-", "PX01-", "VX03-"] as const;

const LOGO = "/assets/userfx-logo.png";
const BRICK = "/assets/brick-wall.png";

type Status = "locked" | "verifying" | "error" | "unlocked";
type ErrKind = "invalid" | "used" | "ratelimit";
type TabId = (typeof TABS)[number];

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

function formatUtcClock(date: Date) {
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} UTC`;
}

function Corner({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path d="M1 9V1h8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 12V5h7" stroke="currentColor" strokeWidth="0.75" opacity="0.45" />
    </svg>
  );
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
  const [activeTab, setActiveTab] = useState<TabId>("BS02-");
  const [clock, setClock] = useState("--:--:-- UTC");

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const consumedPrefill = useRef<string | null>(null);

  void accessCode;
  void videoSrc;

  useEffect(() => {
    const tick = () => setClock(formatUtcClock(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

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
      ) {
        return;
      }

      setStatus("verifying");

      try {
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: clean,
            prefix: activeTab,
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
        setTimeout(() => resetInputs(), 900);
      }
    },
    [status, resetInputs, onUnlock, activeTab]
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
      if (value && index < CODE_LENGTH - 1) focusInput(index + 1);
      if (next.every(Boolean)) submitCode(next.join(""));
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
      if (!pasted) return;
      const next = Array.from(
        { length: CODE_LENGTH },
        (_, i) => pasted[i] || ""
      );
      setChars(next);
      if (next.every(Boolean)) submitCode(next.join(""));
      else focusInput(Math.min(pasted.length, CODE_LENGTH - 1));
    },
    [focusInput, submitCode]
  );

  useEffect(() => {
    focusInput(0);
  }, [focusInput]);

  useEffect(() => {
    if (!prefill || consumedPrefill.current === prefill) return;
    consumedPrefill.current = prefill;
    const clean = prefill
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, CODE_LENGTH);
    if (!clean) return;
    const next = Array.from(
      { length: CODE_LENGTH },
      (_, i) => clean[i] || ""
    );
    setChars(next);
    if (next.every(Boolean)) submitCode(next.join(""));
    else {
      setTimeout(() => {
        focusInput(Math.min(clean.length, CODE_LENGTH - 1));
      }, 0);
    }
  }, [prefill, focusInput, submitCode]);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = setInterval(() => {
      setRetryAfter((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAfter]);

  if (status === "unlocked") {
    return (
      <section className={styles.shell}>
        <div className={styles.scanlines} />
        <div className={styles.noise} />
        <div className={styles.vignette} />
        <div className={styles.unlockedWrap}>
          <p className={styles.monoKicker}>𝐔𝐒𝐄𝐑🜲𝓕𝐗 · PRIVATE VAULT</p>
          <h2 className={styles.unlockedTitle}>ACCESS GRANTED</h2>
          <p className={styles.dim}>
            Llave verificada. El Vault oficial sigue en pre-lanzamiento.
          </p>
          <button
            type="button"
            className={styles.unlockBtn}
            onClick={() => onUnlock?.()}
          >
            CONTINUAR
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.shell}>
      <div className={styles.scanlines} />
      <div className={styles.noise} />
      <div className={styles.vignette} />

      <header className={styles.header}>
        <a href="#top" className={styles.headerBrand}>
          <img src={LOGO} alt="USER FX" className={styles.headerLogo} />
          <span className={styles.headerLive}>
            <span className={styles.liveDot} />
            <span>BÓVEDA PRIVADA · Nº07</span>
          </span>
        </a>
        <div className={styles.headerRight}>
          <time className={styles.clock}>{clock}</time>
          <span className={styles.lockedPill}>🜲 LOCKED</span>
        </div>
      </header>

      <div className={styles.hero}>
        <div className={styles.heroWash}>
          <img src={BRICK} alt="" className={styles.brick} />
          <div className={styles.blobBlue} />
          <div className={styles.blobRose} />
          <div className={styles.blobGold} />
          <div className={styles.heroFade} />
        </div>

        <div className={styles.grid}>
          <div>
            <div className={styles.logoWrap}>
              <div className={styles.logoGlow} />
              <img
                src={LOGO}
                alt="𝐔𝐒𝐄𝐑🜲𝓕𝐗"
                className={styles.heroLogo}
              />
              <div className={styles.logoLine} />
            </div>

            <p className={styles.kicker}>
              <span className={styles.kickerRule} />
              𝐔𝐒𝐄𝐑🜲𝓕𝐗 · PRIVATE VAULT · Nº𝟬𝟭 NOCTURNA
            </p>

            <h1 className={styles.title}>
              <span className={styles.titleAccess}>ACCESS</span>
              <span className={styles.titleRestricted}>
                ℝ𝔼𝕊𝕋ℝ𝕀ℂ𝕋𝔼𝔻<span className={styles.dotBlue}>.</span>
              </span>
            </h1>

            <p className={styles.dim}>
              There are images that were never meant to be seen.
            </p>
            <p className={styles.dim}>
              <span className={styles.bone}>
                𝐔𝐒𝐄𝐑 🜲 𝓕𝐗 — Private Vault
              </span>{" "}
              is a reserved space for those who want to go a little
              further. The official site is in pre-launch.
            </p>
            <p className={styles.dim}>
              Access is not public. You&apos;ll need a{" "}
              <em className={styles.em}>private key.</em>
            </p>

            <dl className={styles.spec}>
              <div>
                <dt>BRAND</dt>
                <dd>𝐔𝐒𝐄𝐑 🜲𝓕𝐗</dd>
              </div>
              <div>
                <dt>STATUS</dt>
                <dd>PRE-LAUNCH</dd>
              </div>
              <div>
                <dt>NEXT DROP</dt>
                <dd>FRIDAY · 22:00 UTC</dd>
              </div>
              <div>
                <dt>ACCESS</dt>
                <dd>PRIVATE KEY</dd>
              </div>
              <div>
                <dt>CODE</dt>
                <dd>🜲 ∣ {activeTab} ∣ ····</dd>
              </div>
            </dl>
          </div>

          <div className={styles.gateOuter}>
            <div className={styles.frameBlue} />
            <div className={styles.frameRose} />

            <section className={styles.gate}>
              <div className={styles.corners} aria-hidden>
                <Corner className={styles.cTL} />
                <Corner className={styles.cTR} />
                <Corner className={styles.cBL} />
                <Corner className={styles.cBR} />
              </div>

              <div className={styles.gateBrick}>
                <img src={BRICK} alt="" />
              </div>
              <div className={styles.gateWash} />

              <div className={styles.gateHead}>
                <img src={LOGO} alt="" className={styles.gateLogo} />
                <h2 className={styles.gateTitle}>LOCKED ACCESS</h2>
              </div>

              <div
                className={`${styles.panel} ${
                  status === "error" ? styles.panelError : ""
                }`}
              >
                <div className={styles.tabs}>
                  {TABS.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`${styles.tab} ${
                        activeTab === tab ? styles.tabOn : ""
                      }`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                  <span className={styles.tabGhost}>BS02-</span>
                </div>

                <div className={styles.codes}>
                  {chars.map((char, i) => (
                    <input
                      key={i}
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
                      disabled={status === "verifying"}
                      onChange={(e) => handleChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, i)}
                      onPaste={handlePaste}
                      className={`${styles.box} ${
                        status === "error" ? styles.boxErr : ""
                      }`}
                    />
                  ))}
                </div>

                {status === "error" && (
                  <p className={styles.err}>
                    {errKind === "ratelimit"
                      ? `Espera ${retryAfter}s`
                      : ERR_TEXT[errKind]}
                  </p>
                )}

                <button
                  type="button"
                  className={styles.unlockBtn}
                  disabled={status === "verifying" || retryAfter > 0}
                  onClick={() => submitCode(chars.join(""))}
                >
                  {status === "verifying" ? "VERIFYING..." : "UNLOCK ALBUM"}
                </button>

                <p className={styles.hint}>
                  ᴇɴᴛʀᴀ ʟᴏꜱ úʟᴛɪᴍᴏꜱ 4 ᴄᴀʀᴀᴄᴛᴇʀᴇꜱ ᴅᴇ ᴛᴜ ᴄóᴅɪɢᴏ
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
