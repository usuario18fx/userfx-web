import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import "./PrivateRoomDirectGate.css";

const ACCESS_CODE_KEY = "userfx_access_code";
const STORAGE_KEY = "vault_unlocked";
const USERNAME_STORAGE_KEY = "userfx_telegram_username";
const MAX_ATTEMPTS = 5;
const SESSION_CHECK_TIMEOUT_MS = 6000;

type DirectGateProps = {
  children: ReactNode;
};

type SessionResponse = {
  ok?: boolean;
  authenticated?: boolean;
  planId?: "basic" | "pro" | "vip";
  error?: string;
};

type VerifyResponse = {
  ok?: boolean;
  planId?: "basic" | "pro" | "vip";
  error?: string;
};

type TelegramEligibilityResponse = {
  ok?: boolean;
  eligible?: boolean;
  username?: string;
  error?: string;
};

type IdentityResponse = {
  ok?: boolean;
  verified?: boolean;
  username?: string;
  error?: string;
};

type AccessPlanId = "basic" | "pro" | "vip";
type SecondaryMode = "none" | "code" | "plans";

const ACCESS_PLANS: Array<{
  id: AccessPlanId;
  name: string;
  prefix: "BSIC" | "PRX0" | "VIPX";
  stars: number;
  emoji: string;
}> = [
  {
    id: "basic",
    name: "BASIC",
    prefix: "BSIC",
    stars: 350,
    emoji: "🌹",
  },
  {
    id: "pro",
    name: "PRO",
    prefix: "PRX0",
    stars: 750,
    emoji: "🔥",
  },
  {
    id: "vip",
    name: "VIP",
    prefix: "VIPX",
    stars: 1500,
    emoji: "👑",
  },
];

function normalizeTelegramUsername(value: string) {
  const clean = String(value || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/[^A-Za-z0-9_]/g, "")
    .slice(0, 32);

  return clean ? `@${clean}` : "";
}

function normalizeSpecialSuffix(value: string) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/^SPCL-?/i, "")
    .replace(/[^A-HJ-NP-Z2-9]/g, "")
    .slice(0, 4);
}

export default function PrivateRoomDirectGate({ children }: DirectGateProps) {
  const forceGate = typeof window !== "undefined" && window.location.hash === "#/private-room-access";
  const [checking, setChecking] = useState(!forceGate);
  const [authenticated, setAuthenticated] = useState(false);
  const [prefix, setPrefix] = useState("BSIC");
  const [suffix, setSuffix] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const prefixDropdownRef = useRef<HTMLDivElement>(null);
  const [prefixMenuOpen, setPrefixMenuOpen] = useState(false);
  const [secondaryMode, setSecondaryMode] = useState<SecondaryMode>("none");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [telegramVerified, setTelegramVerified] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramError, setTelegramError] = useState("");
  const [verifiedStage, setVerifiedStage] = useState<"idle" | "granted" | "actions">("idle");
  const [selectedPlan, setSelectedPlan] = useState<AccessPlanId | null>(null);
  const [specialCode, setSpecialCode] = useState("");
  const [specialLoading, setSpecialLoading] = useState(false);
  const returningIdentityRef = useRef(false);

  function openTelegramLink(url: string) {
    const telegram = window.Telegram?.WebApp as
      { openTelegramLink?: (telegramUrl: string) => void } | undefined;
    if (typeof telegram?.openTelegramLink === "function") {
      telegram.openTelegramLink(url);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function toggleSecondaryMode(nextMode: Exclude<SecondaryMode, "none">) {
    setSecondaryMode((current) => (current === nextMode ? "none" : nextMode));
    setError("");
  }

  async function handleFastPaste() {
    try {
      const clipboard = await navigator.clipboard.readText();
      const clean = String(clipboard || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
      const fullCode = clean.match(
        /^(BSIC|PRX0|VIPX|SPCL)-?([A-HJ-NP-Z2-9]{4})$/,
      );
      if (fullCode) {
        setPrefix(fullCode[1]);
        setSuffix(fullCode[2]);
      } else {
        const lastFour = clean
          .replace(/[^A-HJ-NP-Z2-9]/g, "")
          .slice(-4);
        setSuffix(lastFour);
      }
      setError("");
    } catch {
      setError("ALLOW CLIPBOARD ACCESS TO PASTE");
    }}
  /* ─────   LOCAL DEV ACCESS ─────── */
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const previewGate =
      new URLSearchParams(window.location.search).get("preview") === "gate" || forceGate;
    setAuthenticated(!previewGate);
    setChecking(false);
  }, [forceGate]);
  /* ─────   SAVED TELEGRAM USERNAME ─────── */
  useEffect(() => {
    try {
      const saved = normalizeTelegramUsername(localStorage.getItem(USERNAME_STORAGE_KEY) || "");
      if (saved) setTelegramUsername(saved);
    } catch {
    }
    }, []);
  /* ═══════════ VERIFIED TRANSITION ═══════════ */
  useEffect(() => {
    if (!telegramVerified) {
      setVerifiedStage("idle");
      return;
    }
    setSecondaryMode("none");
    setVerifiedStage("granted");
  }, [telegramVerified]);
  /* ─────   RETURN FROM TELEGRAM · SPECIAL CODE ─────── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("identity") !== "1") return;
    let savedUsername = "";
    try {savedUsername = normalizeTelegramUsername(
        params.get("username") || localStorage.getItem(USERNAME_STORAGE_KEY) || "",
      );
    } catch {
      savedUsername = normalizeTelegramUsername( params.get("username") || "",);
    }
    if (!savedUsername) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS);
    returningIdentityRef.current = true;
    async function restoreTelegramIdentity() {
      try {
        setTelegramLoading(true);
        setTelegramError("");
        const response = await fetch(
          `/api/telegram-eligibility?username=${encodeURIComponent(savedUsername)}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data: TelegramEligibilityResponse =
          await response.json().catch(() => ({}));
        if (!response.ok || !data?.eligible) {
          throw new Error(
            data?.error || "USERNAME IS NOT ACTIVE IN TELEGRAMFX",
          );
        }
        if (cancelled) return;
        const verifiedUsername = normalizeTelegramUsername(
          data.username || savedUsername,
        );
        setTelegramUsername(verifiedUsername);
        setTelegramVerified(true);
        setPrefix("SPCL");
        setSuffix("");
        setSpecialCode("");
        setSecondaryMode("none");

        try {
          localStorage.setItem(USERNAME_STORAGE_KEY, verifiedUsername);
        } catch {
          /* storage unavailable */
        }
      } catch (returnError) {
        if (!cancelled) {
          returningIdentityRef.current = false;
          setTelegramVerified(false);
          setTelegramError(
            returnError instanceof Error && returnError.name === "AbortError"
              ? "CONNECTION TIMED OUT · TRY AGAIN"
              : returnError instanceof Error && returnError.message
                ? returnError.message
                : "TELEGRAM IDENTITY CHECK FAILED",
          );
        }
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) {
          setTelegramLoading(false);

          const cleanParams = new URLSearchParams(window.location.search);
          cleanParams.delete("identity");
          cleanParams.delete("username");

          const query = cleanParams.toString();

          window.history.replaceState(
            {},
            "",
            `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
        );
        }}}
    void restoreTelegramIdentity();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);
  /* ─────   EXISTING ACCESS SESSION ─────── */
  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (forceGate) {
      setAuthenticated(false);
      setChecking(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS);
    fetch("/api/access-session", {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => response.json().then((data: SessionResponse) => ({ response, data })))
      .then(({ response, data }) => {
        if (cancelled) return;
        if (response.ok && data?.authenticated) {
          try {
            sessionStorage.setItem(STORAGE_KEY, "true");
            if (data.planId) sessionStorage.setItem("vault_plan", data.planId);
          } catch {
          }
          setAuthenticated(true);
        } else {
          try {
            sessionStorage.removeItem(STORAGE_KEY);
          } catch {
          }
          setAuthenticated(false);
        }
      })
      .catch(() => {
        // Cubre tanto fallos de red como el abort por timeout:
        // nunca dejamos "checking" colgado indefinidamente.
        if (!cancelled) setAuthenticated(false);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [forceGate]);
  useEffect(() => {
    function closePrefixMenu(event: MouseEvent) {
      if (prefixDropdownRef.current && !prefixDropdownRef.current.contains(event.target as Node)) {
        setPrefixMenuOpen(false);
      }}
    function closePrefixMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPrefixMenuOpen(false);
      }}
    document.addEventListener("mousedown", closePrefixMenu);
    document.addEventListener("keydown", closePrefixMenuOnEscape);
    return () => {
      document.removeEventListener("mousedown", closePrefixMenu);
      document.removeEventListener("keydown", closePrefixMenuOnEscape);
    };
    }, []);
  /* ─────   LOCK PRIVATE GATE VIEWPORT ─────── */
useEffect(() => {
  if (checking || authenticated) return;
  if (typeof window === "undefined") return;
  const isMobile = window.innerWidth <= 650;
  if (isMobile) return; // en móvil no bloqueamos overflow
  const bodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = bodyOverflow;
  };
}, [checking, authenticated]);
  /* ─────   VERIFY CODE ─────── */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || attempts >= MAX_ATTEMPTS) return;
    const normalizedPrefix = prefix
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const normalizedSuffix = suffix
      .trim()
      .toUpperCase()
      .replace(/[^A-HJ-NP-Z2-9]/g, "");
    if (!/^(BSIC|PRX0|VIPX|SPCL)$/.test(normalizedPrefix) || normalizedSuffix.length !== 4) {
      setError("ENTER YOUR COMPLETE ACCESS CODE");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          prefix: normalizedPrefix,
          suffix: normalizedSuffix,
        }),
      });
      const data: VerifyResponse = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        setAttempts((current) => current + 1);
        setSuffix("");
        setError(data?.error || "ACCESS CODE NOT VALID");
        return;
      }
      const fullCode = `${normalizedPrefix}-${normalizedSuffix}`;
      try {
        sessionStorage.setItem(STORAGE_KEY, "true");
        sessionStorage.setItem(ACCESS_CODE_KEY, fullCode);
        if (data.planId) sessionStorage.setItem("vault_plan", data.planId);
      } catch {
        // Storage unavailable.
      }
      try {
        localStorage.setItem("vault_saved_code", fullCode);
      } catch {
        // Storage unavailable.
      }
      setAuthenticated(true);
    } catch {
      setError("CONNECTION ERROR · TRY AGAIN");
    } finally {
      setLoading(false);
    }
  }

  /* ─────   TELEGRAM USERNAME CHECK ─────── */
  async function handleTelegramSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (telegramLoading || specialLoading) return;

    const normalizedUsername = normalizeTelegramUsername(telegramUsername);
    /* reset Telegram-return mode for manual checks */
    returningIdentityRef.current = false;

    /* ───── LOCAL DEV TELEGRAM VERIFY ───── */
    if (import.meta.env.DEV && normalizedUsername.toLowerCase() === "@user18fx") {
      setTelegramUsername(normalizedUsername);
      setTelegramVerified(true);
      setTelegramError("");
      setSpecialCode("");
      return;
    }
    if (!normalizedUsername) {
      setTelegramError("ENTER A VALID TELEGRAM USERNAME");
      setTelegramVerified(false);
      return;
    }
    try {
      setTelegramLoading(true);
      setTelegramError("");
      setTelegramVerified(false);
      setSpecialCode("");
      const response = await fetch(
        `/api/telegram-eligibility?username=${encodeURIComponent(normalizedUsername)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          cache: "no-store",
        },
      );
      const data: TelegramEligibilityResponse = await response.json().catch(() => ({}));
      if (!response.ok || !data?.eligible) {
        throw new Error(data?.error || "USERNAME IS NOT ACTIVE IN TELEGRAMFX");
      }
      const verifiedUsername = normalizeTelegramUsername(data.username || normalizedUsername);
      setTelegramUsername(verifiedUsername);
      setTelegramVerified(true);
      try {
        localStorage.setItem(USERNAME_STORAGE_KEY, verifiedUsername);
      } catch {
        // Storage unavailable.
      }
    } catch (telegramCheckError) {
      setTelegramError(
        telegramCheckError instanceof Error && telegramCheckError.message
          ? telegramCheckError.message
          : "TELEGRAMFX CHECK FAILED",
      );
    } finally {
      setTelegramLoading(false);
    }
  }

  /* ─────   SPECIAL CODE · FAST PASTE ─────── */
  async function handleSpecialPaste() {
    try {
      const clipboard = await navigator.clipboard.readText();

      const pastedCode = normalizeSpecialSuffix(clipboard);

      setSpecialCode(pastedCode);
      setTelegramError("");
    } catch {
      setTelegramError("ALLOW CLIPBOARD ACCESS TO PASTE");
    }
  }

  /* ─────   SPECIAL CODE VERIFY ─────── */
  async function handleSpecialSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!telegramVerified || specialLoading || telegramLoading) return;
    const normalizedUsername = normalizeTelegramUsername(telegramUsername);
    const specialSuffix = normalizeSpecialSuffix(specialCode);
    if (!normalizedUsername || specialSuffix.length !== 4) {
      setTelegramError("ENTER YOUR COMPLETE SPCL CODE");
      return;
    }
    try {
      setSpecialLoading(true);
      setTelegramError("");
      const identityResponse = await fetch("/api/identity", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          username: normalizedUsername,
          code: `SPCL-${specialSuffix}`,
        }),
      });
      const identityData: IdentityResponse = await identityResponse.json().catch(() => ({}));
      if (!identityResponse.ok || !identityData?.verified) {
        throw new Error(identityData?.error || "IDENTITY VERIFICATION FAILED");
      }
      const sessionResponse = await fetch("/api/access-session", {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });
      const sessionData: SessionResponse = await sessionResponse.json().catch(() => ({}));
      if (!sessionResponse.ok || !sessionData?.authenticated) {
        throw new Error(sessionData?.error || "PRIVATE SESSION COULD NOT BE CREATED");
      }
      try {
        sessionStorage.setItem(STORAGE_KEY, "true");
        sessionStorage.setItem("vault_plan", "vip");
        sessionStorage.setItem(ACCESS_CODE_KEY, `SPCL-${specialSuffix}`);
      } catch {
        // Mobile WebViews can block client storage.
      }
      setAuthenticated(true);
    } catch (specialError) {
      setSpecialCode("");
      setTelegramError(
        specialError instanceof Error && specialError.message
          ? specialError.message
          : "SPECIAL CODE VERIFICATION FAILED",
      );
    } finally {
      setSpecialLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="pvr-direct-checking">
        <span>USER FX</span>
        <strong>CHECKING PRIVATE ACCESS…</strong>
      </main>
    );
  }

  if (authenticated) {
    return <>{children}</>;
  }

  return (
    <main className="pvr-direct-gate">
      <section className="pvr-direct-card">
        <div className="direct-icon" aria-hidden="true" />
        <div className="direct-icon3" aria-hidden="true" />
        <div className="direct-icon4" aria-hidden="true" />

        {/* ========   DIRECT PRIVATE ROOM ACCESS =========================== */}
        <header className="pvr-direct-head">
          <span>USER FX · PRIVATE CLUB</span>
          <strong>PRIVATE ROOM</strong>
          <small>CODED ACCESS</small>
        </header>

        <div className="pvr-direct-copy">
          <div className="pvr-direct-fondo-wrap" aria-hidden="true">
            <img src="/wallpaperModal.png" alt="" className="pvr-direct-fondo" draggable={false} />
            <img src="/icon.png" alt="" className="pvr-direct-fondo" draggable={false} />
          </div>
          <h1>
            ᴇɴᴛᴇʀ ᴡʜɪᴛ
            <br />
            <em>𝕋𝐄𝐋𝐄𝐆𝐑𝐀𝐌</em>
          </h1>
          <p>𝚊𝚛𝚎 𝚢𝚘𝚞 𝚊 𝚜𝚙𝚎𝚌𝚒𝚊𝚕 𝚞𝚜𝚎𝚛? 𝙴𝚗𝚝𝚎𝚛 𝚊 𝚞𝚜𝚎𝚛𝚗𝚊𝚖𝚎, 𝚎𝚗𝚓𝚘𝚢 𝚒𝚝.↓</p>
        </div>

        {/* ========   PRIMARY · TELEGRAM / ACCESS FLOW =========================== */}
        {!telegramVerified ? (
          <section className="pvr-direct-verified-zone">
            {/* ========   TELEGRAM IDENTITY =========================== */}
            <section id="pvr-direct-telegram-panel" className="pvr-direct-telegram-panel is-primary">
              <header>
                <span>
                  <b>·TELEGRAM IDENTITY·</b>
                </span>
                <strong>ENTER YOUR USERNAME</strong>
              </header>
              <form className="pvr-direct-telegram-form" onSubmit={handleTelegramSubmit}>
                <div className="pvr-direct-username">
                  <span>@</span>
                  <input
                    type="text"
                    value={telegramUsername.replace(/^@/, "")}
                    onChange={(event) => {
                      setTelegramUsername(event.target.value);
                      setTelegramVerified(false);
                      setSpecialCode("");
                      setTelegramError("");
                    }}
                    placeholder="username"
                    maxLength={32}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={telegramLoading || specialLoading}
                    aria-label="Telegram username"  />
                  <button type="submit" disabled={telegramLoading || specialLoading}>
                    {telegramLoading ? "CHECKING…" : "VERIFY USER"}
                  </button>
                </div>
              </form>
              {telegramError && (
                <p className="pvr-direct-telegram-error" role="alert">
                  {telegramError}
                </p>
              )}
            </section>
{/* ========   MORE OPTIONS =========================== */}
            <div className="pvr-direct-method-label" aria-hidden="true">
              <span />
              <strong>
                MORE OPTIONS</strong>
              <span />
            </div>
            <div className="pvr-direct-secondary-actions">
              <button type="button" className={secondaryMode === "code" ? "is-active" : ""}onClick={() => toggleSecondaryMode("code")}  aria-expanded={secondaryMode === "code"} >
                <span>
                  I HAVE A CODE</span>
                <small>
                  ENTER ACCESS KEY</small>
              </button>
              <button type="button" className={`pvr-direct-get-code ${secondaryMode === "plans" ? "is-active" : ""}`} onClick={() => toggleSecondaryMode("plans")} aria-expanded={secondaryMode === "plans"}  >
                <span>
                  GET MY CODE</span>
                <small>
                  CHOOSE & PAY</small>
              </button>
            </div>
          </section>
        ) : verifiedStage === "granted" ? (
          <section  className={`pvr-direct-granted ${returningIdentityRef.current ? "is-code-entry" : ""}`} aria-live="polite"  >
            <div className="pvr-direct-granted-check">
              <img src="/assets/iconos/ok.png" alt="" aria-hidden="true" />
            </div>
            <strong>YOU'VE BEEN SELECTED</strong>
            <span className="pvr-direct-granted-user">WELCOME {telegramUsername}</span>
            <p className="pvr-direct-granted-message">
              You were selected for early access to our new videocall platform. Tap the green
              button below to get your FREE access code.
            </p>
            {returningIdentityRef.current ? (
              <form className="pvr-direct-granted-code" onSubmit={handleSpecialSubmit}>
                <div className="pvr-direct-granted-code-row">
                  <b>
                    SPCL</b>
                  <i>
                    —</i>
                  <div className="pvr-direct-granted-code-field">
                    <input  type="text" value={specialCode}  onChange={(event) => {
                        setSpecialCode(normalizeSpecialSuffix(event.target.value));
                        setTelegramError("");  }}  placeholder="CODE" maxLength={4} autoCapitalize="characters" autoComplete="off" disabled={specialLoading} aria-label="Special access code"  />
                    <button type="button" className="pvr-direct-granted-paste" onClick={handleSpecialPaste} disabled={specialLoading} >
                      PASTE
                    </button>
                  </div>
                </div>
                <button type="submit" className="pvr-direct-granted-enter"disabled={specialLoading || specialCode.length !== 4}>
                  {specialLoading ? "VERIFYING…" : "VERIFY & ENTER"}
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="pvr-direct-granted-special buttonupgrade"
                onClick={() => openTelegramLink("https://t.me/User18Fx_bot?start=identity")}
              >
                <svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="m18 0 8 12 10-8-4 20H4L0 4l10 8 8-12z"></path>
                </svg>
                <span>
                  ꜱᴘᴇᴄɪᴀʟ
                  <br />
                  ᴄᴏᴅᴇ
                </span>
              </button>
            )}

            {telegramError && (
              <p className="pvr-direct-granted-error" role="alert">
                {telegramError}
              </p>
            )}
          </section>
        ) : (
          <section className="pvr-direct-verified-zone">
            {/* ========   VERIFIED TELEGRAM =========================== */}
            <section className="pvr-direct-telegram-panel is-primary is-verified-panel">
              <header>
                <span>
                  <b>·TELEGRAM IDENTITY·</b>
                </span>
                <strong>USERNAME VERIFIED</strong>
              </header>
              <div className="pvr-direct-username is-verified">
                <span>@</span>
                <input
                  type="text"
                  value={telegramUsername.replace(/^@/, "")}
                  readOnly
                  aria-label="Verified Telegram username"
                />
                <button type="button" disabled>
                  VERIFIED
                </button>
              </div>
            </section>
  {/* ========   SPECIAL ACCESS =========================== */}
            <div className="pvr-direct-special-access">
              <button
                type="button"
                className="pvr-direct-special-launcher"
                onClick={() => openTelegramLink("https://t.me/User18Fx_bot?start=identity")}
              >
                <img src="/assets/iconos/corona.png" alt="" aria-hidden="true" />
                <span>
                  <small>STEP 02 · TELEGRAM</small>
                  <strong>GET SPECIAL CODE</strong>
                </span>
                <i>↗</i>
              </button>
              <form className="pvr-direct-special-form" onSubmit={handleSpecialSubmit}>
                <div className="pvr-direct-special-input">
                  <span>SPCL</span>
                  <i>—</i>
                  <div className="pvr-direct-special-code-field">
                    <input
                      type="text"
                      value={specialCode}
                      onChange={(event) => {
                        setSpecialCode(normalizeSpecialSuffix(event.target.value));
                        setTelegramError("");
                      }}
                      placeholder="CODE"
                      maxLength={4}
                      autoCapitalize="characters"
                      autoComplete="off"
                      disabled={specialLoading}
                      aria-label="Special access code"
                    />
                    <button
                      type="button"
                      className="pvr-direct-special-paste"
                      onClick={handleSpecialPaste}
                      disabled={specialLoading}>
                      PASTE
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={specialLoading || specialCode.length !== 4}>
                  {specialLoading ? "VERIFYING…" : "VERIFY & ENTER"}
                </button>
              </form>
            </div>
            {telegramError && (
              <p className="pvr-direct-telegram-error" role="alert">
                {telegramError}
              </p>
            )}
          </section>
        )}

        {/* ═════════ SECONDARY FIXED STAGE ═════════ */}
        <div className={`pvr-direct-secondary-stage ${secondaryMode !== "none" ? "is-open" : ""}`}>
          {secondaryMode === "code" && (
            <form className="pvr-direct-form pvr-direct-secondary-panel" onSubmit={handleSubmit}>
              <div className="pvr-direct-inputs" data-prefix={prefix}>
                <div
                  ref={prefixDropdownRef}
                  className={`pvr-direct-prefixes ${prefixMenuOpen ? "is-open" : ""}`}
                >
                  <button
                    type="button"
                    className="pvr-direct-prefix"
                    onClick={() => !loading && attempts < MAX_ATTEMPTS && setPrefixMenuOpen((current) => !current)}
                    disabled={loading || attempts >= MAX_ATTEMPTS}
                    aria-haspopup="listbox"
                    aria-expanded={prefixMenuOpen}
                    aria-label="Access code prefix"
                  >
                    <span>{prefix}</span>
                    <i aria-hidden="true" />
                  </button>
                  <div className="pvr-direct-prefix-menu" role="listbox" aria-label="Access code prefix options">
                    {(["BSIC", "PRX0", "VIPX", "SPCL"] as const)
                      .filter((plan) => plan !== prefix)
                      .map((plan) => (
                        <button
                          key={plan}
                          type="button"
                          role="option"
                          aria-selected={prefix === plan}
                          className={prefix === plan ? "is-selected" : ""}
                          onClick={() => {
                            setPrefix(plan);
                            setPrefixMenuOpen(false);
                            setError("");
                          }} >
                          {plan}
                        </button>
                      ))}
                  </div>
                </div>
                <span>—</span>
                <input
                  type="text"
                  value={suffix}
                  onChange={(event) => setSuffix(event.target.value.toUpperCase())}
                  placeholder="CODE"
                  maxLength={4}
                  autoCapitalize="characters"
                  autoComplete="off"
                  disabled={loading || attempts >= MAX_ATTEMPTS}
                  aria-label="Access code suffix"
                />
              </div>
              <button type="submit" disabled={loading || attempts >= MAX_ATTEMPTS}>
                {loading ? "VERIFYING…" : "ENTER WITH ACCESS CODE"}
              </button>
              {error && (
                <p className="pvr-direct-error" role="alert">
                  {error}
                </p>
              )}
              <small className="pvr-direct-attempts">
                {attempts >= MAX_ATTEMPTS
                  ? "ACCESS TEMPORARILY LOCKED · REFRESH TO TRY AGAIN"
                  : `${MAX_ATTEMPTS - attempts} ATTEMPTS AVAILABLE`}
              </small>
            </form>
          )}
          {secondaryMode === "plans" && (
            <section className="pvr-direct-plans pvr-direct-secondary-panel" aria-label="Choose access plan">
              {ACCESS_PLANS.map((plan) => (
                <article
                  key={plan.id}
                  className={`pvr-direct-plan is-${plan.id} ${selectedPlan === plan.id ? "is-selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedPlan(plan.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedPlan(plan.id);
                    }
                  }}
                >
                  <span className="pvr-direct-plan-emoji" aria-hidden="true" />
                  <span className="pvr-direct-plan-info">
                    <strong>{plan.name}</strong>
                    <small className="pvr-direct-plan-prefix">{plan.prefix}</small>
                    <small className="pvr-direct-plan-price">✦ {plan.stars}</small>
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedPlan(plan.id);
                      openTelegramLink(`https://t.me/User18Fx_bot?start=pay_${plan.id}`);
                    }}
                  >
                    PAY
                  </button>
                </article>
              ))}
            </section>
          )}
        </div>

        {/* ========   FOOTER =========================== */}
        <footer className="pvr-direct-foot">
          <button
            type="button"
            onClick={() => {
              if (telegramVerified) {
                setTelegramVerified(false);
                setVerifiedStage("idle");
                setSpecialCode("");
                setTelegramError("");
                setSecondaryMode("none");
              } else {
                window.location.hash = "#/";
              }
            }}
          >
            ← BACK
          </button>
          <button type="button" onClick={() => openTelegramLink("https://t.me/User18Fx_bot?start=support")}>
            NEED HELP?
          </button>
        </footer>
      </section>
    </main>
  );
}