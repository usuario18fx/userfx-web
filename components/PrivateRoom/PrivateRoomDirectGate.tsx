import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import "./PrivateRoomDirectGate.css";

const ACCESS_CODE_KEY = "userfx_access_code";
const STORAGE_KEY = "vault_unlocked";
const USERNAME_STORAGE_KEY = "userfx_telegram_username";
const MAX_ATTEMPTS = 5;

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

function normalizeTelegramUsername(value:string) {
  const clean = String(value || "")
    .trim()
    .replace(/^@+/,"")
    .replace(/[^A-Za-z0-9_]/g,"")
    .slice(0,32);

  return clean ? `@${clean}` : "";
}

function normalizeSpecialSuffix(value:string) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/^SPCL-?/i,"")
    .replace(/[^A-HJ-NP-Z2-9]/g,"")
    .slice(0,4);
}

export default function PrivateRoomDirectGate({children}:DirectGateProps) {
  const gateRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const [checking,setChecking] = useState(true);
  const [authenticated,setAuthenticated] = useState(false);
  const [prefix,setPrefix] = useState("");
  const [suffix,setSuffix] = useState("");
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [attempts,setAttempts] = useState(0);

  const [telegramOpen,setTelegramOpen] = useState(false);
  const [telegramUsername,setTelegramUsername] = useState("");
  const [telegramVerified,setTelegramVerified] = useState(false);
  const [telegramLoading,setTelegramLoading] = useState(false);
  const [telegramError,setTelegramError] = useState("");
  const [specialCode,setSpecialCode] = useState("");
  const [specialLoading,setSpecialLoading] = useState(false);

  /* ─────   LOCAL DEV ACCESS ─────── */
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    setAuthenticated(true);
    setChecking(false);
  },[]);

  /* ─────   SAVED TELEGRAM USERNAME ─────── */
  useEffect(() => {
    try {
      const saved = normalizeTelegramUsername(
        localStorage.getItem(USERNAME_STORAGE_KEY) || "",
      );
      if (saved) setTelegramUsername(saved);
    } catch {
      // Storage unavailable.
    }
  },[]);

  /* ─────   EXISTING ACCESS SESSION ─────── */
  useEffect(() => {
    if (import.meta.env.DEV) return;

    let cancelled = false;

    fetch("/api/access-session",{
      method:"GET",
      headers:{Accept:"application/json"},
      credentials:"same-origin",
      cache:"no-store",
    })
      .then((response) =>
        response.json().then((data:SessionResponse) => ({response,data})),
      )
      .then(({response,data}) => {
        if (cancelled) return;

        if (response.ok && data?.authenticated) {
          sessionStorage.setItem(STORAGE_KEY,"true");
          if (data.planId) sessionStorage.setItem("vault_plan",data.planId);
          setAuthenticated(true);
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
          setAuthenticated(false);
        }
      })
      .catch(() => {
        if (!cancelled) setAuthenticated(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {cancelled = true;};
  },[]);

  /* ─────   FIT FULL GATE INSIDE VIEWPORT ─────── */
  useEffect(() => {
    if (checking || authenticated) return;

    const gate = gateRef.current;
    const card = cardRef.current;
    if (!gate || !card) return;

    const fitGate = () => {
      const gateStyles = window.getComputedStyle(gate);
      const horizontalPadding =
        Number.parseFloat(gateStyles.paddingLeft) +
        Number.parseFloat(gateStyles.paddingRight);
      const verticalPadding =
        Number.parseFloat(gateStyles.paddingTop) +
        Number.parseFloat(gateStyles.paddingBottom);
      const availableWidth = Math.max(1,gate.clientWidth - horizontalPadding);
      const availableHeight = Math.max(1,gate.clientHeight - verticalPadding);
      const cardWidth = Math.max(1,card.offsetWidth);
      const cardHeight = Math.max(1,card.scrollHeight);
      const scale = Math.min(.82,availableWidth / cardWidth,availableHeight / cardHeight);

      gate.style.setProperty("--pvr-direct-scale",String(Math.max(.25,scale)));
    };

    const animationFrame = window.requestAnimationFrame(fitGate);
    const resizeObserver = new ResizeObserver(fitGate);
    resizeObserver.observe(gate);
    resizeObserver.observe(card);
    window.addEventListener("resize",fitGate);
    window.visualViewport?.addEventListener("resize",fitGate);

    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize",fitGate);
      window.visualViewport?.removeEventListener("resize",fitGate);
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  },[checking,authenticated]);

  /* ─────   VERIFY CODE ─────── */
  async function handleSubmit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || attempts >= MAX_ATTEMPTS) return;

    const normalizedPrefix = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g,"");
    const normalizedSuffix = suffix.trim().toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,"");

    if (!/^(BSIC|PRX0|VIPX)$/.test(normalizedPrefix) || normalizedSuffix.length !== 4) {
      setError("ENTER YOUR COMPLETE ACCESS CODE");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/verify",{
        method:"POST",
        headers:{
          Accept:"application/json",
          "Content-Type":"application/json",
        },
        credentials:"same-origin",
        cache:"no-store",
        body:JSON.stringify({
          prefix:normalizedPrefix,
          suffix:normalizedSuffix,
        }),
      });

      const data:VerifyResponse = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok) {
        setAttempts((current) => current + 1);
        setSuffix("");
        setError(data?.error || "ACCESS CODE NOT VALID");
        return;
      }

      const fullCode = `${normalizedPrefix}-${normalizedSuffix}`;
      sessionStorage.setItem(STORAGE_KEY,"true");
      sessionStorage.setItem(ACCESS_CODE_KEY,fullCode);
      localStorage.setItem("vault_saved_code",fullCode);
      if (data.planId) sessionStorage.setItem("vault_plan",data.planId);
      setAuthenticated(true);
    } catch {
      setError("CONNECTION ERROR · TRY AGAIN");
    } finally {
      setLoading(false);
    }
  }

  /* ─────   TELEGRAM USERNAME CHECK ─────── */
  async function handleTelegramSubmit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (telegramLoading || specialLoading) return;

    const normalizedUsername = normalizeTelegramUsername(telegramUsername);

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
          method:"GET",
          headers:{Accept:"application/json"},
          credentials:"same-origin",
          cache:"no-store",
        },
      );

      const data:TelegramEligibilityResponse = await response.json().catch(() => ({}));

      if (!response.ok || !data?.eligible) {
        throw new Error(data?.error || "USERNAME IS NOT ACTIVE IN TELEGRAMFX");
      }

      const verifiedUsername = normalizeTelegramUsername(data.username || normalizedUsername);
      setTelegramUsername(verifiedUsername);
      setTelegramVerified(true);

      try {
        localStorage.setItem(USERNAME_STORAGE_KEY,verifiedUsername);
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

  /* ─────   SPECIAL CODE VERIFY ─────── */
  async function handleSpecialSubmit(event:FormEvent<HTMLFormElement>) {
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

      const identityResponse = await fetch("/api/identity",{
        method:"POST",
        headers:{
          Accept:"application/json",
          "Content-Type":"application/json",
        },
        credentials:"same-origin",
        cache:"no-store",
        body:JSON.stringify({
          username:normalizedUsername,
          code:`SPCL-${specialSuffix}`,
        }),
      });

      const identityData:IdentityResponse = await identityResponse.json().catch(() => ({}));

      if (!identityResponse.ok || !identityData?.verified) {
        throw new Error(identityData?.error || "IDENTITY VERIFICATION FAILED");
      }

      const sessionResponse = await fetch("/api/access-session",{
        method:"POST",
        headers:{Accept:"application/json"},
        credentials:"same-origin",
        cache:"no-store",
      });

      const sessionData:SessionResponse = await sessionResponse.json().catch(() => ({}));

      if (!sessionResponse.ok || !sessionData?.authenticated) {
        throw new Error(sessionData?.error || "PRIVATE SESSION COULD NOT BE CREATED");
      }

      sessionStorage.setItem(STORAGE_KEY,"true");
      sessionStorage.setItem("vault_plan","vip");
      sessionStorage.setItem(ACCESS_CODE_KEY,`SPCL-${specialSuffix}`);
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

  if (authenticated) return <>{children}</>;

  return (
    <main ref={gateRef} className="pvr-direct-gate">
      <section ref={cardRef} className="pvr-direct-card">
        {/* ========   DIRECT PRIVATE ROOM ACCESS =========================== */}
        <header className="pvr-direct-head">
          <span>USER FX · PRIVATE CLUB</span>
          <strong>PRIVATE ROOM</strong>
          <small>CODED ACCESS</small>
        </header>

        <div className="pvr-direct-mark" aria-hidden="true">FX</div>

        <div className="pvr-direct-copy">
          <span>ENTER YOUR KEY</span>
          <h1>ACCESS<br/><em>PRIVATE ROOM</em></h1>
          <p>Enter your private code to continue. Active member sessions enter automatically.</p>
        </div>

        <form className="pvr-direct-form" onSubmit={handleSubmit}>
          <div className="pvr-direct-inputs">
            <input
              type="text"
              value={prefix}
              onChange={(event) => setPrefix(event.target.value.toUpperCase())}
              placeholder="BSIC"
              maxLength={4}
              autoCapitalize="characters"
              autoComplete="off"
              disabled={loading || attempts >= MAX_ATTEMPTS}
              aria-label="Access code prefix"
            />
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

          {error && <p className="pvr-direct-error" role="alert">{error}</p>}

          <small className="pvr-direct-attempts">
            {attempts >= MAX_ATTEMPTS
              ? "ACCESS TEMPORARILY LOCKED · REFRESH TO TRY AGAIN"
              : `${MAX_ATTEMPTS - attempts} ATTEMPTS AVAILABLE`}
          </small>
        </form>

        {/* ========   TELEGRAM + SPECIAL CODE =========================== */}
        <div className="pvr-direct-method-label" aria-hidden="true">
          <span></span>
          <strong>ALTERNATIVE ACCESS</strong>
          <span></span>
        </div>

        <div className="pvr-direct-shortcuts">
          <button
            type="button"
            className={`pvr-direct-shortcut ${telegramOpen ? "is-active" : ""}`}
            onClick={() => {
              setTelegramOpen((current) => !current);
              setTelegramError("");
            }}
            aria-expanded={telegramOpen}
            aria-controls="pvr-direct-telegram-panel"
          >
            <img src="/assets/iconos/telegram.png" alt="" aria-hidden="true"/>
            <span>
              <small>STEP 01 · VERIFY</small>
              <strong>TELEGRAM USER</strong>
            </span>
          </button>

          <button
            type="button"
            className={`pvr-direct-shortcut pvr-direct-shortcut--special ${telegramVerified ? "is-ready" : ""}`}
            onClick={() => {
              if (!telegramVerified) {
                setTelegramOpen(true);
                setTelegramError("VERIFY YOUR TELEGRAM USERNAME FIRST");
                return;
              }
              window.open("https://t.me/User18Fx_bot?start=identity","_blank","noopener,noreferrer");
            }}
            aria-label="Get special code"
          >
            <img src="/assets/iconos/corona.png" alt="" aria-hidden="true"/>
            <span>
              <small>{telegramVerified ? "STEP 02 · GET CODE" : "STEP 02 · LOCKED"}</small>
              <strong>SPECIAL CODE</strong>
            </span>
          </button>
        </div>

        {telegramOpen && (
          <section id="pvr-direct-telegram-panel" className="pvr-direct-telegram-panel">
            <header>
              <span>STEP 01 · TELEGRAM IDENTITY</span>
              <strong>{telegramVerified ? "USERNAME VERIFIED" : "ENTER YOUR USERNAME"}</strong>
            </header>

            <form className="pvr-direct-telegram-form" onSubmit={handleTelegramSubmit}>
              <div className={`pvr-direct-username ${telegramVerified ? "is-verified" : ""}`}>
                <span>@</span>
                <input
                  type="text"
                  value={telegramUsername.replace(/^@/,"")}
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
                  aria-label="Telegram username"
                />
                <button type="submit" disabled={telegramLoading || specialLoading}>
                  {telegramLoading ? "CHECKING…" : telegramVerified ? "VERIFIED" : "VERIFY USER"}
                </button>
              </div>
            </form>

            {telegramVerified && (
              <form className="pvr-direct-special-form" onSubmit={handleSpecialSubmit}>
                <div className="pvr-direct-special-input">
                  <span>SPCL</span>
                  <i>—</i>
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
                </div>

                <button type="submit" disabled={specialLoading || specialCode.length !== 4}>
                  {specialLoading ? "VERIFYING…" : "VERIFY & ENTER"}
                </button>
              </form>
            )}

            {telegramError && (
              <p className="pvr-direct-telegram-error" role="alert">{telegramError}</p>
            )}
          </section>
        )}

        <footer className="pvr-direct-foot">
          <button type="button" onClick={() => {window.location.hash = "#/";}}>← BACK</button>
          <a href="https://t.me/User18Fx_bot?start=getcode" target="_blank" rel="noreferrer">GET A CODE</a>
        </footer>
      </section>
    </main>
  );
}
