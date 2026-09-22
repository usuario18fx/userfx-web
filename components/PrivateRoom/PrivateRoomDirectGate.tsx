import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
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
  const forceGate =
    typeof window !== "undefined" && window.location.hash === "#/private-room-access";
  const gateRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const [checking, setChecking] = useState(true);
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
  const [specialCode, setSpecialCode] = useState("");
  const [specialLoading, setSpecialLoading] = useState(false);

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
      // Storage unavailable.
    }
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

    fetch("/api/access-session", {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((response) => response.json().then((data: SessionResponse) => ({ response, data })))
      .then(({ response, data }) => {
        if (cancelled) return;

        if (response.ok && data?.authenticated) {
          sessionStorage.setItem(STORAGE_KEY, "true");
          if (data.planId) sessionStorage.setItem("vault_plan", data.planId);
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

    return () => {
      cancelled = true;
    };
  }, [forceGate]);

  useEffect(() => {
    function closePrefixMenu(event: MouseEvent) {
      if (prefixDropdownRef.current && !prefixDropdownRef.current.contains(event.target as Node)) {
        setPrefixMenuOpen(false);
      }
    }
    function closePrefixMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPrefixMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", closePrefixMenu);
    document.addEventListener("keydown", closePrefixMenuOnEscape);
    return () => {
      document.removeEventListener("mousedown", closePrefixMenu);
      document.removeEventListener("keydown", closePrefixMenuOnEscape);
    };
  }, []);
  /* ─────   FIT FULL GATE INSIDE VIEWPORT ─────── */
  useEffect(() => {
    if (checking || authenticated) return;

    const gate = gateRef.current;
    const card = cardRef.current;
    if (!gate || !card) return;

    const fitGate = () => {
      const gateStyles = window.getComputedStyle(gate);
      const horizontalPadding =
        Number.parseFloat(gateStyles.paddingLeft) + Number.parseFloat(gateStyles.paddingRight);
      const verticalPadding =
        Number.parseFloat(gateStyles.paddingTop) + Number.parseFloat(gateStyles.paddingBottom);
      const availableWidth = Math.max(1, gate.clientWidth - horizontalPadding);
      const availableHeight = Math.max(1, gate.clientHeight - verticalPadding);
      const cardWidth = Math.max(1, card.offsetWidth);
      const cardHeight = Math.max(1, card.scrollHeight);
      const scale = Math.min(1.1, availableWidth / cardWidth, availableHeight / cardHeight);

      gate.style.setProperty("--pvr-direct-scale", String(Math.max(0.25, scale)));
    };

    const animationFrame = window.requestAnimationFrame(fitGate);
    const resizeObserver = new ResizeObserver(fitGate);
    resizeObserver.observe(gate);
    resizeObserver.observe(card);
    window.addEventListener("resize", fitGate);
    window.visualViewport?.addEventListener("resize", fitGate);

    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", fitGate);
      window.visualViewport?.removeEventListener("resize", fitGate);
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
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

    if (!/^(BSIC|PRX0|VIPX)$/.test(normalizedPrefix) || normalizedSuffix.length !== 4) {
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
      sessionStorage.setItem(STORAGE_KEY, "true");
      sessionStorage.setItem(ACCESS_CODE_KEY, fullCode);
      localStorage.setItem("vault_saved_code", fullCode);
      if (data.planId) sessionStorage.setItem("vault_plan", data.planId);
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

      sessionStorage.setItem(STORAGE_KEY, "true");
      sessionStorage.setItem("vault_plan", "vip");
      sessionStorage.setItem(ACCESS_CODE_KEY, `SPCL-${specialSuffix}`);
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
    <main ref={gateRef} className="pvr-direct-gate">
      <section ref={cardRef} className="pvr-direct-card">
        {/* ========   DIRECT PRIVATE ROOM ACCESS =========================== */}
        <header className="pvr-direct-head">
          <span>USER FX · PRIVATE CLUB</span>
          <strong>PRIVATE ROOM</strong>
          <small>CODED ACCESS</small>
        </header>
        <div className="pvr-direct-copy">
          <div className="pvr-direct-wallfx-wrap" aria-hidden="true">
            <img src="/wallFX.png" alt="" className="pvr-direct-wallfx" draggable={false} />
          </div>
          <h1>
            ENTER WITH
            <br />
            <em>𝕋𝔼𝕃𝔼𝔾ℝ𝔸𝕄</em>
          </h1>
          <p>↓ 𝚊𝚛𝚎 𝚢𝚘𝚞 𝚊 𝚜𝚙𝚎𝚌𝚒𝚊𝚕 𝚞𝚜𝚎𝚛? 𝙴𝚗𝚝𝚎𝚛 𝚊 𝚞𝚜𝚎𝚛𝚗𝚊𝚖𝚎, 𝚎𝚗𝚓𝚘𝚢 𝚒𝚝.↓</p>
        </div>
        {/* ========   PRIMARY · TELEGRAM =========================== */}
        <section id="pvr-direct-telegram-panel" className="pvr-direct-telegram-panel is-primary">
          <header>
            <span>
              <b>·TELEGRAM IDENTITY</b>
            </span>
            <strong>{telegramVerified ? "USERNAME VERIFIED" : "ENTER YOUR USERNAME"}</strong>
          </header>
          <form className="pvr-direct-telegram-form" onSubmit={handleTelegramSubmit}>
            <div className={`pvr-direct-username ${telegramVerified ? "is-verified" : ""}`}>
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
                aria-label="Telegram username"
              />
              <button type="submit" disabled={telegramLoading || specialLoading}>
                {telegramLoading ? "CHECKING…" : telegramVerified ? "VERIFIED" : "VERIFY USER"}
              </button>
            </div>
          </form>
          {telegramVerified && (
            <div className="pvr-direct-special-step">
              <button
                type="button"
                className="pvr-direct-get-special"
                onClick={() => openTelegramLink("https://t.me/User18Fx_bot?start=identity")}>
                <img src="/assets/iconos/corona.png" alt="" aria-hidden="true" />
                <span>
                  <small>STEP 02</small>
                  <strong>GET SPECIAL CODE</strong>
                </span>
              </button>
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
            </div>
          )}
          {telegramError && (
            <p className="pvr-direct-telegram-error" role="alert">
              {telegramError}
            </p>
          )}
        </section>
        {/* ========   SECONDARY OPTIONS =========================== */}
        <div className="pvr-direct-method-label" aria-hidden="true">
          <span></span>
          <strong>MORE OPTIONS</strong>
          <span></span>
        </div>
        <div className="pvr-direct-secondary-actions">
          <button
            type="button"
            className={secondaryMode === "code" ? "is-active" : ""}
            onClick={() => toggleSecondaryMode("code")}
            aria-expanded={secondaryMode === "code"}>
            <span>I HAVE A CODE</span>
            <small>ENTER ACCESS KEY</small>
          </button>

          <button
            type="button"
            className={`pvr-direct-get-code ${secondaryMode === "plans" ? "is-active" : ""}`}
            onClick={() => toggleSecondaryMode("plans")}
            aria-expanded={secondaryMode === "plans"}>
            <span>GET MY CODE</span>
            <small>CHOOSE & PAY</small>
          </button>
        </div>
        {secondaryMode === "code" && (
          <form className="pvr-direct-form pvr-direct-secondary-panel" onSubmit={handleSubmit}>
            <div className="pvr-direct-inputs">
              <div
                ref={prefixDropdownRef}
                className={`pvr-direct-prefixes ${prefixMenuOpen ? "is-open" : ""}`}>
                <button
                  type="button"
                  className="pvr-direct-prefix"
                  onClick={() =>
                    !loading && attempts < MAX_ATTEMPTS && setPrefixMenuOpen((current) => !current)
                  }
                  disabled={loading || attempts >= MAX_ATTEMPTS}
                  aria-haspopup="listbox"
                  aria-expanded={prefixMenuOpen}
                  aria-label="Access code prefix">
                  <span>{prefix}</span>
                  <i aria-hidden="true" />
                </button>

                <div
                  className="pvr-direct-prefix-menu"
                  role="listbox"
                  aria-label="Access code prefix options">
                  {(["BSIC", "PRX0", "VIPX"] as const).map((plan) => (
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
                      }}>
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
          <section
            className="pvr-direct-plans pvr-direct-secondary-panel"
            aria-label="Choose access plan">
            {ACCESS_PLANS.map((plan) => (
              <article key={plan.id} className={`pvr-direct-plan is-${plan.id}`}>
                <span className="pvr-direct-plan-emoji" aria-hidden="true">
                  {plan.emoji}
                </span>
                <span>
                  <strong>{plan.name}</strong>
                  <small>
                    {plan.prefix} · ✦ {plan.stars}
                  </small>
                </span>
                <button
                  type="button"
                  onClick={() => openTelegramLink(`https://t.me/User18Fx_bot?start=pay_${plan.id}`)}
                  aria-label={`Pay ${plan.stars} Stars for ${plan.name}`}>
                  PAY
                </button>
              </article>
            ))}
          </section>
        )}
        <footer className="pvr-direct-foot">
          <button
            type="button"
            onClick={() => {
              window.location.hash = "#/";
            }}>
            ← BACK
          </button>
          <button
            type="button"
            onClick={() => openTelegramLink("https://t.me/User18Fx_bot?start=support")}>
            NEED HELP?
          </button>
        </footer>
      </section>
    </main>
  );
}
