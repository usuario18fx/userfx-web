import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import "./FxAccessModal.css";

type AccessStep = "username" | "identity" | "access";
type AccessMode = "plan" | "telegram";
type PlanKey = "BSIC" | "PRX0" | "VIPX";
type CheckState = "idle" | "approved" | "rejected";

type FxAccessModalProps = {
  id?: string;
  open: boolean;
  onClose: () => void;
  accessCode: string;
  onAccessCodeChange: (value: string) => void;
  onAccessSubmit: (event: FormEvent<HTMLFormElement>) => void;
  accessLoading?: boolean;
  accessError?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
};

const PLAN_DISPLAY: Record<PlanKey, { icon: string; name: string }> = {
  BSIC: { icon: "/assets/iconos/basic.png", name: "BASIC" },
  PRX0: { icon: "/assets/iconos/pro.png", name: "PRO" },
  VIPX: { icon: "/assets/iconos/vip.png", name: "VIP" },
};

const PLAN_KEYS: PlanKey[] = ["BSIC", "PRX0", "VIPX"];
const USERNAME_STORAGE_KEY = "userfx_telegram_username";
const IDENTITY_RETURN_KEY = "userfx_identity_return";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

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
    localStorage.setItem(USERNAME_STORAGE_KEY, username);
    document.cookie = `${USERNAME_STORAGE_KEY}=${encodeURIComponent(username)}; Path=/; SameSite=Lax; Max-Age=2592000`;
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}

function emitSpecialCodeState(enabled: boolean, visible: boolean) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("userfx:special-code-state", {
      detail: { enabled, visible },
    }),
  );
}

function RoseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M32 8c6 4 10 10 10 17 0 8-5 14-10 17-5-3-10-9-10-17 0-7 4-13 10-17Z" />
      <path
        d="M22 20c-3 4-4 9-2 14M42 20c3 4 4 9 2 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M32 42v14M28 50c-3 2-5 4-6 7M36 50c3 2 5 4 6 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
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

export function FxAccessModal({
  id,
  open,
  onClose,
  accessCode,
  onAccessCodeChange,
  onAccessSubmit,
  accessLoading = false,
  accessError = "",
  inputRef,
}: FxAccessModalProps) {
  const generatedId = useId();
  const modalId =
    id ?? `fx-access-modal-${generatedId.replace(/[^a-zA-Z0-9]/g, "")}`;

  const stageRef = useRef<HTMLDivElement>(null);
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const loadingRef = useRef(false);

  const [mode, setMode] = useState<AccessMode>("plan");
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("PRX0");
  const [step, setStep] = useState<AccessStep>("username");
  const [username, setUsername] = useState("");
  const [identityCode, setIdentityCode] = useState("");
  const [telegramAuthorized, setTelegramAuthorized] = useState(false);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [typedText, setTypedText] = useState("");

  const busy = identityLoading || privateLoading || accessLoading;
  const visualState: CheckState =
    mode === "plan" && accessError ? "rejected" : checkState;
  const isUsernameGuidance =
    mode === "telegram" && step === "username" && !telegramAuthorized;
  const isSpecialGuidance =
    mode === "telegram" && step === "username" && telegramAuthorized;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    loadingRef.current = busy;
  }, [busy]);

  useEffect(() => {
    if (!open) {
      emitSpecialCodeState(false, false);
      return;
    }

    let cancelled = false;

    setMode("plan");
    setStep("username");
    setIdentityCode("");
    setTelegramAuthorized(false);
    setCheckState("idle");
    setError(null);

    const restoreIdentity = async () => {
      let savedUsername = "";
      let returnToIdentity = false;

      try {
        const params = new URLSearchParams(window.location.search);

        returnToIdentity =
          params.get("identity") === "1" ||
          localStorage.getItem(IDENTITY_RETURN_KEY) === "1";

        savedUsername = normalizeUsername(
          localStorage.getItem(USERNAME_STORAGE_KEY) || "",
        );

        if (savedUsername) {
          setUsername(savedUsername);
        }

        if (params.get("identity") === "1") {
          params.delete("identity");

          const query = params.toString();

          window.history.replaceState(
            {},
            "",
            `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
          );
        }
      } catch {
        // Normal plan access remains available if browser storage is unavailable.
      }

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

          setMode("telegram");
          setStep("access");
          setTelegramAuthorized(true);
          setCheckState("approved");
          return;
        }

        if (!returnToIdentity || !savedUsername) return;

        const eligibilityResponse = await fetch(
          `/api/telegram-eligibility?username=${encodeURIComponent(savedUsername)}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            cache: "no-store",
          },
        );

        const eligibility = await eligibilityResponse.json().catch(() => ({}));

        if (!cancelled && eligibilityResponse.ok && eligibility?.eligible) {
          setMode("telegram");
          setStep("identity");
          setTelegramAuthorized(true);
          setCheckState("approved");
        }
      } catch {
        // Normal plan access remains available if the identity API is unavailable.
      } finally {
        if (!cancelled) {
          setIdentityLoading(false);
        }
      }
    };

    void restoreIdentity();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    const ready =
      open && mode === "telegram" && telegramAuthorized && step === "identity";
    const visible = open && step !== "access";

    emitSpecialCodeState(ready, visible);
  }, [open, mode, step, telegramAuthorized]);

  useEffect(() => {
    if (!open || mode !== "telegram" || step === "access") return;

    const timer = window.setTimeout(() => {
      primaryInputRef.current?.focus();
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, mode, step]);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!loadingRef.current) {
          onCloseRef.current();
        }

        return;
      }

      if (event.key !== "Tab") return;

      const stage = stageRef.current;
      if (!stage) return;

      const focusableItems = Array.from(
        stage.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !== "true",
      );

      if (!focusableItems.length) return;

      const firstItem = focusableItems[0];
      const lastItem = focusableItems[focusableItems.length - 1];

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      }

      if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      previouslyFocusedElementRef.current?.focus();
    };
  }, [open]);

  const handleClose = () => {
    if (!busy) {
      onCloseRef.current();
    }
  };

  const switchToPlan = (plan: PlanKey) => {
    if (busy) return;

    setMode("plan");
    setSelectedPlan(plan);
    setStep("username");
    setIdentityCode("");
    setTelegramAuthorized(false);
    setCheckState("idle");
    setError(null);
    onAccessCodeChange("");
  };

  const switchToTelegram = () => {
    if (busy) return;

    if (mode === "telegram") {
      switchToPlan(selectedPlan);
      return;
    }

    setMode("telegram");
    setStep("username");
    setIdentityCode("");
    setTelegramAuthorized(false);
    setCheckState("idle");
    setError(null);

    window.setTimeout(() => {
      primaryInputRef.current?.focus();
    }, 120);
  };

  const handleTelegramUsernameCheck = async () => {
    const normalizedUsername = normalizeUsername(username);
    const usernameBody = normalizedUsername.replace(/^@/, "");

    if (!/^[A-Za-z0-9_]{3,32}$/.test(usernameBody)) {
      setCheckState("rejected");
      setError("DROP YOUR TELEGRAM @USERNAME");
      primaryInputRef.current?.focus();
      return;
    }

    try {
      setIdentityLoading(true);
      setError(null);
      setTelegramAuthorized(false);
      setCheckState("idle");

      const response = await fetch(
        `/api/telegram-eligibility?username=${encodeURIComponent(normalizedUsername)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.eligible) {
        throw new Error(
          data?.error || "USERNAME IS NOT ACTIVE IN TELEGRAMFX",
        );
      }

      setUsername(normalizedUsername);
      persistUsername(normalizedUsername);
      setTelegramAuthorized(true);
      setCheckState("approved");
    } catch (submissionError) {
      setTelegramAuthorized(false);
      setCheckState("rejected");
      setError(
        submissionError instanceof Error && submissionError.message
          ? submissionError.message
          : "USERNAME IS NOT ACTIVE IN TELEGRAMFX",
      );
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
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          username: normalizedUsername,
          code: normalizedCode,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.verified) {
        throw new Error(
          data?.error || "IDENTITY CHECK DIDN'T GO THROUGH",
        );
      }

      const verifiedUsername = normalizeUsername(
        data.username || normalizedUsername,
      );

      setUsername(verifiedUsername);
      persistUsername(verifiedUsername);

      try {
        localStorage.removeItem(IDENTITY_RETURN_KEY);
      } catch {
        // Nothing else is required when local storage is unavailable.
      }

      setIdentityCode("");
      setCheckState("approved");
      setStep("access");
    } catch (submissionError) {
      setCheckState("rejected");
      setError(
        submissionError instanceof Error && submissionError.message
          ? submissionError.message
          : "IDENTITY CHECK DIDN'T GO THROUGH",
      );
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

      if (!response.ok || !data?.authenticated) {
        throw new Error(
          data?.error || "PRIVATE ACCESS DIDN'T GO THROUGH",
        );
      }

      onCloseRef.current();
      window.location.hash = "#/private-room";
    } catch (submissionError) {
      setError(
        submissionError instanceof Error && submissionError.message
          ? submissionError.message
          : "PRIVATE ACCESS DIDN'T GO THROUGH",
      );
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

    if (step === "username") {
      await handleTelegramUsernameCheck();
      return;
    }

    if (step === "identity") {
      await handleIdentitySubmit();
      return;
    }

    await handlePrivateAccess();
  };

  const bubbleText =
    mode === "plan"
      ? `Choose ${selectedPlan}, then enter your private access key.`
      : isSpecialGuidance
        ? `${username} AUTHORIZED. TAP SPECIAL CODE TO GET YOUR CODE.`
        : step === "username"
          ? "If you were selected, enter your @username to become a member."
          : step === "identity"
            ? `${username} verified. Enter your SPECIAL CODE to continue.`
            : "ACCESS CONFIRMED. WELCOME TO THE PRIVATE ROOM.";

  useEffect(() => {
    if (!open) {
      setTypedText("");
      return;
    }

    let characterIndex = 0;
    setTypedText("");

    const typingTimer = window.setInterval(() => {
      characterIndex += 1;
      setTypedText(bubbleText.slice(0, characterIndex));

      if (characterIndex >= bubbleText.length) {
        window.clearInterval(typingTimer);
      }
    }, 48);

    return () => {
      window.clearInterval(typingTimer);
    };
  }, [open, bubbleText]);

  const titleText =
    mode === "plan"
      ? "PRIVATE ACCESS"
      : step === "username"
        ? "TELEGRAM ACCESS"
        : step === "identity"
          ? "SPECIAL ACCESS"
          : "PRIVATE ACCESS";

  const stepLabel =
    step === "username"
      ? "TELEGRAM USERNAME"
      : step === "identity"
        ? "SPECIAL CODE"
        : "WELCOME · ACCESS UNLOCKED";

  if (!open || typeof document === "undefined") {
    return null;}
  return createPortal(
    <div className="smkl-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { handleClose();}}}>
      <div className="smkl-modal__backdrop" />
      <div ref={stageRef} className={`smkl-modal__stage is-${visualState}`} id={modalId} role="dialog" aria-modal="true" aria-labelledby={`${modalId}-title`} aria-busy={busy} data-access-mode={mode} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="smkl-modal__close"  onClick={handleClose} aria-label="Close access" disabled={busy}  >
          <span />
          <span />
        </button>

        <div className="smkl-modal__bubble smkl-modal__bubble--screen">
          <div className="smkl-typing-viewport">
            <span className="smkl-typing-text">
              {typedText}
            </span>
          </div>
        </div>
        <div  className={["smkl-robot", `is-${visualState}`,  isUsernameGuidance ? "is-guiding" : "", isSpecialGuidance ? "is-special-guiding" : "",]
            .filter(Boolean)
            .join(" ")} aria-hidden="true">
          <div className="smkl-robot__ear smkl-robot__ear--left" />
          <div className="smkl-robot__ear smkl-robot__ear--right" />
          <div className="smkl-robot__head">
            <RoseIcon className="smkl-robot__head-rose" />
            <div className="smkl-robot__face">
              <div className="smkl-robot__eyes">
                <span className="smkl-robot__eye" />
                <span className="smkl-robot__eye" />
              </div>
              <span className="smkl-robot__mouth" />
            </div>
          </div>
        </div>

        <section className="smkl-panel">
          <div className="smkl-robot__hand smkl-robot__hand--left">
            <i />
            <i />
            <i />
            <i />
          </div>

          <div className={["smkl-robot__hand", "smkl-robot__hand--right",isUsernameGuidance || isSpecialGuidance ? "is-pointing" : "", isSpecialGuidance ? "is-special-pointing" : "",]
              .filter(Boolean)
              .join(" ")}>
            <i />
            <i />
            <i />
            <i />
          </div>

          <RoseIcon className="smkl-panel__rose" />
          <div className="smkl-modal__brand-line" />
          <h2 id={`${modalId}-title`}>{titleText}</h2>
          <div className="smkl-modal__brand-line" />

          <div className="smkl-panel__divider" aria-hidden="true">
            <span />
            <RoseIcon />
            <span />
          </div>

          {mode === "plan" && (
            <div className="smkl-plan-switcher">
              {PLAN_KEYS.map((plan) => (
                <button key={plan} type="button" className={`smkl-plan-pill${selectedPlan === plan ? " is-active" : ""}`} onClick={() => switchToPlan(plan)} disabled={busy}>
                  <img className="smkl-plan-pill__icon" src={PLAN_DISPLAY[plan].icon}  alt="" aria-hidden="true" draggable={false}/>
                  <span className="smkl-plan-pill__name">
                    {PLAN_DISPLAY[plan].name}
                  </span>
                </button>
              ))}
            </div>
          )}

          <form className="smkl-form" onSubmit={handleSubmit} noValidate>
            {mode === "telegram" && (
              <p className="smkl-step-label">{stepLabel}</p>
            )}

            {mode === "plan" && (
              <>
                <div className="smkl-plan-access-field">
                  <input ref={inputRef} type="text"  name="access-code" placeholder={`${selectedPlan}-XXXX`}  value={accessCode} onChange={(event) => {  onAccessCodeChange(event.target.value.toUpperCase());}} autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false}  disabled={busy}  required/>
                </div>

                {accessError && (
                  <p className="smkl-form__error" role="alert">
                    {accessError}
                  </p>
                )}

                <button   type="submit"
                  className={[
                    "smkl-form__submit",
                    "smkl-form__submit--verify",
                    busy ? "is-loading" : "",
                    visualState === "approved" ? "is-approved" : "",
                    visualState === "rejected" ? "is-rejected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={busy}
                >
                  <span>{busy ? "CHECKING..." : "VERIFY ACCESS"}</span>
                </button>
              </>
            )}

            {mode === "telegram" && step === "username" && (
              <>
                <div className="smkl-form__field smkl-form__field--username">
                  <span className="smkl-form__icon smkl-form__icon--username">
                    <UserIcon />
                  </span>

                  <label className="smkl-sr-only"  htmlFor={`${modalId}-username`} >
                    Telegram username
                  </label>

                  <span className="smkl-username-at" aria-hidden="true">
                    @
                  </span>

                  <input
                    ref={primaryInputRef}
                    id={`${modalId}-username`}
                    type="text"
                    name="username"
                    placeholder="username"
                    value={username.replace(/^@/, "")}
                    onChange={(event) => {
                      setUsername(normalizeUsername(event.target.value));
                      setTelegramAuthorized(false);
                      setCheckState("idle");
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

                <p className="smkl-telegram-check-note">
                  SPECIAL CODE unlocks only after TelegramFX confirms this username.
                </p>

                <button
                  type="submit"
                  className={[
                    "smkl-form__submit",
                    "smkl-form__submit--telegram-check",
                    busy ? "is-loading" : "",
                    checkState === "approved" ? "is-approved" : "",
                    checkState === "rejected" ? "is-rejected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={busy}
                >
                  <span>
                    {busy
                      ? "CHECKING..."
                      : checkState === "approved"
                        ? "USER AUTHORIZED"
                        : checkState === "rejected"
                          ? "USER REJECTED"
                          : "CHECK USER"}
                  </span>
                </button>
              </>
            )}

            {mode === "telegram" && step === "identity" && (
              <>
                <div className="smkl-identity-combined">
                  <span className="smkl-identity-combined__user">
                    {username}
                  </span>

                  <span className="smkl-identity-combined__separator" />

                  <label
                    className="smkl-sr-only"
                    htmlFor={`${modalId}-identity-code`}
                  >
                    Special identity code
                  </label>

                  <div className="smkl-code-digits">
                    {[0, 1, 2, 3].map((index) => {
                      const codePart = identityCode.replace(
                        /^(SPCL|TGMX)-?/i,
                        "",
                      );

                      return (
                        <span
                          key={index}
                          className={`smkl-code-digit${
                            codePart[index] ? " is-filled" : ""
                          }`}
                        />
                      );
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
                      required/>
                  </div>
                </div>
                <p className="smkl-telegram-check-note is-ready">
                  USERNAME ACTIVE · SPECIAL CODE READY
                </p>
                <button type="submit" className={`smkl-form__submit smkl-form__submit--inline${ busy ? " is-loading" : ""}`} disabled={busy}>
                  <span>{busy ? "CHECKING..." : "VERIFY"}</span>
                </button>
              </>
            )}
            {error && (
              <p className="smkl-form__error" id={`${modalId}-error`} role="alert">
                {error}
              </p>
            )}
            {mode === "telegram" && step === "access" && (
              <button  type="submit"  className={`smkl-form__submit smkl-form__submit--get-in${
                  busy ? " is-loading" : ""  }`}   disabled={busy} >
                <span>{busy ? "CHECKING..." : "GET IN"}</span>
              </button>
            )}
          </form>

          {step !== "access" && (
            <div className="smkl-panel__bottom-actions">
              <button
                type="button"
                className={`smkl-telegram-mode-btn${
                  mode === "telegram" ? " is-active" : ""
                }`}
                onClick={switchToTelegram}
                aria-label={
                  mode === "telegram"
                    ? "Return to plan access"
                    : "Telegram access"
                }
                disabled={busy}
              >
                <span className="smkl-panel__action-label">
                  {mode === "telegram" ? "PLAN ACCESS" : "TELEGRAM ACCESS"}
                </span>
              </button>

              {mode === "telegram" && (
                <button
                  type="button"
                  className={[
                    "smkl-special-code-fab",
                    telegramAuthorized ? "is-ready" : "is-locked",
                    isSpecialGuidance ? "is-awaiting-click" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    if (!telegramAuthorized || busy) return;

                    setStep("identity");
                    setError(null);
                    setCheckState("approved");
                  }}
                  aria-label={
                    telegramAuthorized
                      ? "Open special code"
                      : "Verify username first"
                  }
                  disabled={!telegramAuthorized || busy}>
                  <span aria-hidden="true">♛</span>
                  <small>
                    {telegramAuthorized
                      ? "SPECIAL CODE"
                      : "VERIFY USERNAME FIRST"}
                  </small>
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>,
    document.body,
  );
}
