import { FormEvent, useEffect, useId, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import "./FxAccessModal.css";
import "./FxAccessModalV2.css";

type AccessStep = "username" | "identity" | "access";
type AccessMode = "plan" | "telegram";
type PlanKey = "BSIC" | "PRX0" | "VIPX";

type FxAccessModalProps = {
  id?: string;
  open: boolean;
  onClose: () => void;
  accessCode: string;
  onAccessCodeChange: (value: string) => void;
  onAccessSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onGetCode: () => void;
  accessLoading?: boolean;
  accessError?: string;
  accessPlaceholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
};

const USERNAME_COOKIE = "userfx_telegram_username";
const IDENTITY_RETURN_KEY = "userfx_identity_return";
const PLAN_KEYS: PlanKey[] = ["BSIC", "PRX0", "VIPX"];

function normalizeUsername(value: string) {
  const clean = String(value || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/[^A-Za-z0-9_]/g, "")
    .slice(0, 32);
  return clean ? `@${clean}` : "";
}

function normalizeIdentityCode(value: string) {
  const compact = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  if (compact.length <= 4) return compact;
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

function persistUsername(username: string) {
  try {
    localStorage.setItem(USERNAME_COOKIE, username);
    document.cookie = `${USERNAME_COOKIE}=${encodeURIComponent(username)}; Path=/; SameSite=Lax; Max-Age=2592000`;
  } catch {}
}

function emitSpecialCodeState(enabled: boolean, visible = true) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("userfx:special-code-state", {
      detail: { enabled, visible },
    }),
  );
}

function RoseIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M32 8c6 4 10 10 10 17 0 8-5 14-10 17-5-3-10-9-10-17 0-7 4-13 10-17Z" />
      <path d="M22 20c-3 4-4 9-2 14M42 20c3 4 4 9 2 14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M32 42v14M28 50c-3 2-5 4-6 7M36 50c3 2 5 4 6 7" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function FxAccessModal({
  id,
  open,
  onClose,
  accessCode,
  onAccessCodeChange,
  onAccessSubmit,
  onGetCode,
  accessLoading = false,
  accessError = "",
  inputRef,
}: FxAccessModalProps) {
  const generatedId = useId();
  const modalId = id ?? `fx-access-modal-${generatedId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const stageRef = useRef<HTMLDivElement>(null);
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const loadingRef = useRef(false);
  const onCloseRef = useRef(onClose);

  const [mode, setMode] = useState<AccessMode>("plan");
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("PRX0");
  const [step, setStep] = useState<AccessStep>("username");
  const [username, setUsername] = useState("");
  const [identityCode, setIdentityCode] = useState("");
  const [telegramAuthorized, setTelegramAuthorized] = useState(false);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = identityLoading || privateLoading || accessLoading;

  useEffect(() => { loadingRef.current = busy; }, [busy]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) {
      emitSpecialCodeState(false, false);
      return;
    }

    let cancelled = false;
    setError(null);
    setIdentityCode("");
    setTelegramAuthorized(false);
    setMode("plan");
    setStep("username");

    const restore = async () => {
      let returnToIdentity = false;
      let savedUsername = "";

      try {
        const params = new URLSearchParams(window.location.search);
        returnToIdentity = params.get("identity") === "1" || localStorage.getItem(IDENTITY_RETURN_KEY) === "1";
        savedUsername = normalizeUsername(localStorage.getItem(USERNAME_COOKIE) || "");
        if (savedUsername) setUsername(savedUsername);

        if (params.get("identity") === "1") {
          params.delete("identity");
          const query = params.toString();
          window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
        }
      } catch {}

      try {
        setIdentityLoading(true);
        const response = await fetch("/api/identity", {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;

        if (data?.verified) {
          const verifiedUsername = normalizeUsername(data.username || "");
          if (verifiedUsername) {
            setUsername(verifiedUsername);
            persistUsername(verifiedUsername);
          }
          setTelegramAuthorized(true);
          setMode("telegram");
          setStep("access");
          return;
        }

        if (returnToIdentity && savedUsername) {
          const check = await fetch(`/api/telegram-eligibility?username=${encodeURIComponent(savedUsername)}`, {
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            cache: "no-store",
          });
          const eligibility = await check.json().catch(() => ({}));
          if (!cancelled && check.ok && eligibility?.eligible) {
            setTelegramAuthorized(true);
            setMode("telegram");
            setStep("identity");
          }
        }
      } catch {
        // Keep plan access available even if Telegram status cannot be restored.
      } finally {
        if (!cancelled) setIdentityLoading(false);
      }
    };

    void restore();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    const ready = open && mode === "telegram" && telegramAuthorized && step === "identity";
    const visible = open && step !== "access";
    emitSpecialCodeState(ready, visible);
  }, [open, mode, telegramAuthorized, step]);

  useEffect(() => {
    if (!open || mode !== "telegram") return;
    const timer = window.setTimeout(() => {
      if (step === "username" || step === "identity") primaryInputRef.current?.focus();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [open, mode, step]);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedElement.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!loadingRef.current) onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const stage = stageRef.current;
      if (!stage) return;
      const items = Array.from(stage.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true",
      );
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      previouslyFocusedElement.current?.focus();
    };
  }, [open]);

  const handleClose = () => {
    if (!busy) onCloseRef.current();
  };

  const switchToPlan = (plan: PlanKey) => {
    setMode("plan");
    setSelectedPlan(plan);
    setError(null);
    setTelegramAuthorized(false);
    setStep("username");
    onAccessCodeChange("");
  };

  const switchToTelegram = () => {
    setMode("telegram");
    setStep("username");
    setTelegramAuthorized(false);
    setIdentityCode("");
    setError(null);
  };

  const handleTelegramUsernameCheck = async () => {
    const normalized = normalizeUsername(username);
    const usernameBody = normalized.replace(/^@/, "");

    if (!/^[A-Za-z0-9_]{3,32}$/.test(usernameBody)) {
      setError("DROP YOUR TELEGRAM @USERNAME");
      primaryInputRef.current?.focus();
      return;
    }

    try {
      setIdentityLoading(true);
      setError(null);
      setTelegramAuthorized(false);

      const response = await fetch(`/api/telegram-eligibility?username=${encodeURIComponent(normalized)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.eligible) {
        throw new Error(data?.error || "USERNAME IS NOT ACTIVE IN TELEGRAMFX");
      }

      setUsername(normalized);
      persistUsername(normalized);
      setTelegramAuthorized(true);
      setStep("identity");
      setError(null);
    } catch (submissionError) {
      setTelegramAuthorized(false);
      setError(submissionError instanceof Error && submissionError.message ? submissionError.message : "USERNAME IS NOT ACTIVE IN TELEGRAMFX");
    } finally {
      setIdentityLoading(false);
    }
  };

  const handleIdentitySubmit = async () => {
    if (!telegramAuthorized) {
      setError("VERIFY YOUR TELEGRAM USERNAME FIRST");
      return;
    }

    const normalizedUsername = normalizeUsername(username);
    const normalizedCode = normalizeIdentityCode(identityCode);

    if (!/^(SPCL|TGMX)-[A-HJ-NP-Z2-9]{4}$/.test(normalizedCode)) {
      setError("DROP THE FULL SPECIAL CODE");
      primaryInputRef.current?.focus();
      return;
    }

    try {
      setIdentityLoading(true);
      setError(null);
      const response = await fetch("/api/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username: normalizedUsername, code: normalizedCode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.verified) throw new Error(data?.error || "IDENTITY CHECK DIDN'T GO THROUGH");

      const verifiedUsername = normalizeUsername(data.username || normalizedUsername);
      setUsername(verifiedUsername);
      persistUsername(verifiedUsername);
      localStorage.removeItem(IDENTITY_RETURN_KEY);
      setIdentityCode("");
      setStep("access");
    } catch (submissionError) {
      setError(submissionError instanceof Error && submissionError.message ? submissionError.message : "IDENTITY CHECK DIDN'T GO THROUGH");
    } finally {
      setIdentityLoading(false);
    }
  };

  const handlePrivateAccess = async () => {
    try {
      setPrivateLoading(true);
      setError(null);
      persistUsername(normalizeUsername(username));

      const response = await fetch("/api/access-session", {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.authenticated) throw new Error(data?.error || "PRIVATE ACCESS DIDN'T GO THROUGH");

      onCloseRef.current();
      window.location.hash = "#/private-room";
    } catch (submissionError) {
      setError(submissionError instanceof Error && submissionError.message ? submissionError.message : "PRIVATE ACCESS DIDN'T GO THROUGH");
    } finally {
      setPrivateLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    if (mode === "plan") {
      onAccessSubmit(event);
      return;
    }

    event.preventDefault();
    if (busy) return;
    if (step === "username") return handleTelegramUsernameCheck();
    if (step === "identity") return handleIdentitySubmit();
    await handlePrivateAccess();
  };

  const bubbleText = mode === "plan"
    ? `Pick ${selectedPlan}, drop your private key, and unlock your access.`
    : step === "username"
      ? "Drop your Telegram username. If it's active, the crown wakes up."
      : step === "identity"
        ? `${username} is active. Tap the crown if you need a special code, then bring it back here.`
        : `${username} · access cleared. you're good to get in.`;

  const titleText = mode === "plan"
    ? "PRIVATE ACCESS"
    : step === "username"
      ? "TELEGRAM ACCESS"
      : step === "identity"
        ? "SPECIAL ACCESS"
        : "PRIVATE ACCESS";

  const stepLabel = mode === "plan"
    ? `${selectedPlan} · PRIVATE KEY`
    : step === "username"
      ? "TELEGRAM USERNAME"
      : step === "identity"
        ? "SPECIAL CODE"
        : "WELCOME · ACCESS UNLOCKED";

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="smkl-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) handleClose(); }}>
      <div className="smkl-modal__backdrop" />
      <div
        ref={stageRef}
        className="smkl-modal__stage"
        id={modalId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${modalId}-title`}
        aria-busy={busy}
        data-access-mode={mode}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="smkl-modal__close" onClick={handleClose} aria-label="Close access" disabled={busy}>
          <span />
          <span />
        </button>

        <div className="smkl-modal__bubble smkl-modal__bubble--screen">
          <div className="smkl-typing-viewport">
            <span className="smkl-typing-text" key={`${mode}-${step}-${selectedPlan}`}>{bubbleText}</span>
          </div>
          <div className="smkl-screen-userfx">
            <div className="smkl-modal__brand-line" />
            <strong>USER🜲FX</strong>
            <div className="smkl-modal__brand-line" />
          </div>
        </div>

        <div className="smkl-robot" aria-hidden="true">
          <div className="smkl-robot__ear smkl-robot__ear--left" />
          <div className="smkl-robot__ear smkl-robot__ear--right" />
          <div className="smkl-robot__head">
            <RoseIcon className="smkl-robot__head-rose" />
            <div className="smkl-robot__face">
              <span className="smkl-robot__eye" />
              <span className="smkl-robot__eye" />
              <span className="smkl-robot__mouth" />
            </div>
          </div>
        </div>

        <section className="smkl-panel">
          <div className="smkl-robot__hand smkl-robot__hand--left"><i/><i/><i/><i/></div>
          <div className="smkl-robot__hand smkl-robot__hand--right"><i/><i/><i/><i/></div>
          <RoseIcon className="smkl-panel__rose" />
          <div className="smkl-modal__brand-line" />
          <h2 id={`${modalId}-title`}>{titleText}</h2>
          <div className="smkl-modal__brand-line" />
          <div className="smkl-panel__divider" aria-hidden="true">
            <span />
            <RoseIcon />
            <span />
          </div>

          <div className="smkl-access-mode-switch">
            <div className="smkl-plan-tabs" aria-label="Access plans">
              {PLAN_KEYS.map((plan) => (
                <button
                  key={plan}
                  type="button"
                  className={`smkl-plan-tab${mode === "plan" && selectedPlan === plan ? " is-active" : ""}`}
                  onClick={() => switchToPlan(plan)}
                  disabled={busy}
                >
                  {plan}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`smkl-telegram-mode-btn${mode === "telegram" ? " is-active" : ""}`}
              onClick={switchToTelegram}
              aria-label="Telegram access"
              title="Telegram access"
              disabled={busy}
            >
              ✈️
            </button>
          </div>

          <form className="smkl-form" onSubmit={handleSubmit} noValidate>
            <p style={{ margin: 0, color: "#ffffff98", fontSize: ".78rem", letterSpacing: ".14em" }}>
              {stepLabel}
            </p>

            {mode === "plan" && (
              <>
                <div className="smkl-plan-access-field">
                  <span className="smkl-plan-prefix">{selectedPlan}</span>
                  <input
                    ref={inputRef}
                    type="text"
                    name="access-code"
                    placeholder={`${selectedPlan}-XXXX`}
                    value={accessCode}
                    onChange={(event) => onAccessCodeChange(event.target.value.toUpperCase())}
                    autoComplete="off"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={busy}
                    required
                  />
                </div>

                {accessError && <p className="smkl-form__error" role="alert">{accessError}</p>}

                <button type="submit" className={`smkl-form__submit${busy ? " is-loading" : ""}`} disabled={busy}>
                  <span>{busy ? "CHECKING..." : "VERIFY ACCESS"}</span>
                </button>

                <button type="button" className="smkl-get-special-code" style={{ display: "flex" }} onClick={onGetCode} disabled={busy}>
                  <span>{`GET ${selectedPlan} CODE`}</span>
                </button>
              </>
            )}

            {mode === "telegram" && step === "username" && (
              <>
                <div className="smkl-form__field smkl-form__field--username">
                  <span className="smkl-form__icon smkl-form__icon--username"><UserIcon /></span>
                  <label className="smkl-sr-only" htmlFor={`${modalId}-username`}>Telegram username</label>
                  <input
                    ref={primaryInputRef}
                    id={`${modalId}-username`}
                    type="text"
                    name="username"
                    placeholder="@username"
                    value={username}
                    onChange={(event) => {
                      setUsername(normalizeUsername(event.target.value));
                      setTelegramAuthorized(false);
                      setError(null);
                    }}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={busy}
                    required
                  />
                </div>

                <p className="smkl-telegram-check-note">SPECIAL CODE unlocks only after TelegramFX confirms this username.</p>

                <button type="submit" className={`smkl-form__submit smkl-form__submit--telegram-check${busy ? " is-loading" : ""}`} disabled={busy}>
                  <span>{busy ? "CHECKING..." : "CHECK USER"}</span>
                </button>
              </>
            )}

            {mode === "telegram" && step === "identity" && (
              <>
                <div className="smkl-identity-combined">
                  <span className="smkl-identity-combined__user">{username}</span>
                  <span className="smkl-identity-combined__separator" />
                  <label className="smkl-sr-only" htmlFor={`${modalId}-identity-code`}>Special identity code</label>

                  <div className="smkl-code-digits">
                    {[0, 1, 2, 3].map((index) => {
                      const codePart = identityCode.replace(/^(SPCL|TGMX)-?/i, "");
                      return <span key={index} className={`smkl-code-digit${codePart[index] ? " is-filled" : ""}`} />;
                    })}

                    <input
                      ref={primaryInputRef}
                      id={`${modalId}-identity-code`}
                      className="smkl-code-real-input"
                      type="text"
                      name="identity-code"
                      value={identityCode}
                      onChange={(event) => {
                        const raw = event.target.value
                          .toUpperCase()
                          .replace(/^SPCL-?/i, "")
                          .replace(/^TGMX-?/i, "")
                          .replace(/[^A-HJ-NP-Z2-9]/g, "")
                          .slice(0, 4);
                        setIdentityCode(raw ? `SPCL-${raw}` : "");
                        setError(null);
                      }}
                      autoComplete="one-time-code"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={9}
                      disabled={busy}
                      required
                    />
                  </div>
                </div>

                <p className="smkl-telegram-check-note is-ready">USERNAME ACTIVE · SPECIAL CODE READY</p>

                <button type="submit" className={`smkl-form__submit smkl-form__submit--inline${busy ? " is-loading" : ""}`} disabled={busy}>
                  <span>{busy ? "CHECKING..." : "VERIFY"}</span>
                </button>
              </>
            )}

            {error && <p className="smkl-form__error" id={`${modalId}-error`} role="alert">{error}</p>}

            {mode === "telegram" && step === "access" && (
              <button type="submit" className={`smkl-form__submit smkl-form__submit--get-in${busy ? " is-loading" : ""}`} disabled={busy}>
                <span>{busy ? "CHECKING..." : "GET IN"}</span>
              </button>
            )}
          </form>
        </section>
      </div>
    </div>,
    document.body,
  );
}
