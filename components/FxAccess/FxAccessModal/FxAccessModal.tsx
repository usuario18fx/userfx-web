import { FormEvent, useEffect, useId, useRef,useState,} from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import "./FxAccessModal.css";

type AccessStep = "username" | "identity" | "access";
type FxAccessModalProps = { id?: string;
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
const TELEGRAM_IDENTITY_URL = "https://t.me/User18Fx_bot?start=identity";

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
    document.cookie =
      `${USERNAME_COOKIE}=${encodeURIComponent(username)}; ` +
      "Path=/; SameSite=Lax; Max-Age=2592000";
  } catch {
    // Identity verification still uses the username sent to the API.
  }
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

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
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
  accessPlaceholder = "ACCESS KEY",
  inputRef,
}: FxAccessModalProps) {
  const generatedId = useId();
  const modalId =
    id ?? `fx-access-modal-${generatedId.replace(/[^a-zA-Z0-9]/g, "")}`;

  const stageRef = useRef<HTMLDivElement>(null);
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const loadingRef = useRef(false);
  const onCloseRef = useRef(onClose);

  const [step, setStep] = useState<AccessStep>("username");
  const [username, setUsername] = useState("");
  const [identityCode, setIdentityCode] = useState("");
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityEntryReady,setIdentityEntryReady]=useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = identityLoading || accessLoading;
  const visibleError = error || (step === "access" ? accessError : "");

  useEffect(() => {
    loadingRef.current = busy;
  }, [busy]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let returnToIdentity = false;

    setError(null);
    setIdentityCode("");
    setIdentityEntryReady(false);
    setStep("username");

    try {
      const params = new URLSearchParams(window.location.search);
      returnToIdentity =
        params.get("identity") === "1" ||
        localStorage.getItem(IDENTITY_RETURN_KEY) === "1";

      const saved = localStorage.getItem(USERNAME_COOKIE) || "";
      if (saved) {
        const normalizedSaved = normalizeUsername(saved);
        setUsername(normalizedSaved);
        if (returnToIdentity) {
          setIdentityEntryReady(true);
          setStep("identity");
        }
      }

      if (params.get("identity") === "1") {
        params.delete("identity");
        const query = params.toString();
        window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
      }
    } catch {
      // Ignore storage / URL failures.
    }

    setIdentityLoading(true);

    fetch("/api/identity", {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !data?.verified) return;

        const verifiedUsername = normalizeUsername(data.username || "");
        if (!verifiedUsername) return;

        setUsername(verifiedUsername);
        persistUsername(verifiedUsername);
        localStorage.removeItem(IDENTITY_RETURN_KEY);
        setIdentityEntryReady(false);
        setStep("access");
      })
      .catch(() => {
        // A missing identity session keeps the user in the current identity flow.
      })
      .finally(() => {
        if (!cancelled) setIdentityLoading(false);
      });
    return () => {
      cancelled = true;
    };}, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      if (step === "access") {
        inputRef?.current?.focus();
      } else if (step === "identity" && identityEntryReady) {
        primaryInputRef.current?.focus();
      } else if (step === "username") {
        primaryInputRef.current?.focus();
      }}, 120);
    return () => window.clearTimeout(timer);
  }, [open, step, identityEntryReady, inputRef]);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedElement.current =
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
        if (!loadingRef.current) onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const stage = stageRef.current;
      if (!stage) return;
      const focusableElements = Array.from(
        stage.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !== "true",
      );
      if (!focusableElements.length) {
        event.preventDefault();
        return;
      }
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      if (!stage.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
        return;
      }
      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }};
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

  const handleUsernameSubmit = () => {
    const normalized = normalizeUsername(username);
    const usernameBody = normalized.replace(/^@/, "");

    if (!/^[A-Za-z0-9_]{3,32}$/.test(usernameBody)) {
      setError("DROP YOUR TELEGRAM @USERNAME");
      primaryInputRef.current?.focus();
      return;
    }

    setUsername(normalized);
    persistUsername(normalized);
    setError(null);
    setIdentityEntryReady(false);
    setStep("identity");
  };

  const handleIdentitySubmit = async () => {
    const normalizedUsername = normalizeUsername(username);
    const normalizedCode = normalizeIdentityCode(identityCode);
    if (!/^TGMX-[A-HJ-NP-Z2-9]{4}$/.test(normalizedCode)) {
      setError("DROP THE FULL TGMX IDENTITY KEY");
      primaryInputRef.current?.focus();
      return;
    }
    try {setIdentityLoading(true);
         setError(null);
    const response = await fetch("/api/identity", {method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",body: JSON.stringify({
        username: normalizedUsername,
        code: normalizedCode,
  }),});
  const data = await response.json();
    if (!response.ok || !data?.verified) {
        throw new Error(data?.error || "IDENTITY CHECK DIDN'T GO THROUGH");
  }
  const verifiedUsername = normalizeUsername(data.username || normalizedUsername);
      setUsername(verifiedUsername);
      persistUsername(verifiedUsername);
      localStorage.removeItem(IDENTITY_RETURN_KEY);
      setIdentityCode("");
      setIdentityEntryReady(false);
      setStep("access");
  } catch (submissionError) {setError(submissionError instanceof Error && submissionError.message
          ? submissionError.message
          : "IDENTITY CHECK DIDN'T GO THROUGH",
  );
  } finally {
      setIdentityLoading(false);
  }};

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (step === "username") {handleUsernameSubmit();
      return;
  }
    if (step === "identity") {
      if (!identityEntryReady) return;
      await handleIdentitySubmit();
      return;
  }
    persistUsername(normalizeUsername(username));
    onAccessSubmit(event);
  };

  const openTelegramIdentity = () => {
    try {
      localStorage.setItem(IDENTITY_RETURN_KEY,"1");
      persistUsername(normalizeUsername(username));
    } catch {}
    window.open(TELEGRAM_IDENTITY_URL, "_blank", "noopener,noreferrer");
  };

  const bubbleText = step === "username"
      ? "Private access. Link up with Telegram."
      : step === "identity"
        ? `${username} · grab your special code on Telegram.`
        : `${username} · identity locked in.`;
  const titleText =
    step === "username"
      ? "WHO'S PULLING UP?"
      : step === "identity"
        ? "IDENTITY CHECK"
        : "PRIVATE ACCESS";
  const stepLabel = step === "username"
      ? "STEP 1 · TELEGRAM USERNAME"
      : step === "identity"
        ? "STEP 2 · IDENTITY"
        : "STEP 3 · PRIVATE ACCESS";

  if (!open || typeof document === "undefined") return null;
  return createPortal(
          <div className="smkl-modal" role="presentation" onMouseDown={(event) => {if (event.target === event.currentTarget) handleClose();}}>
          <style>{`
          .smkl-modal__stage{--smkl-button-height:40px;--smkl-button-font:.75rem;}
          .smkl-form__submit{min-height:var(--smkl-button-height)!important;height:var(--smkl-button-height)!important;}
          .smkl-form__submit span{font-size:var(--smkl-button-font)!important;}
          .smkl-typing-viewport{position:relative;z-index:3;width:100%;overflow:hidden;white-space:nowrap;text-align:left;}
          .smkl-typing-viewport .smkl-typing-text{display:inline-block;max-width:none!important;overflow:visible!important;white-space:nowrap;width:max-content!important;clip-path:inset(0 100% 0 0);animation:smklTypingReveal 9s steps(70,end) 1s forwards,smklTypingPan 14s ease-in-out 11s infinite alternate,robotMessageHide .5s ease 68.3s forwards!important;will-change:transform,clip-path;}
          .smkl-identity-user{margin:2px 0 10px;padding:10px 14px;border:1px solid #245a7866;border-radius:10px;background:#03070899;color:#dce7ed;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:.78rem;font-weight:600;letter-spacing:.06em;text-align:center;}
          @keyframes smklTypingReveal{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
          @keyframes smklTypingPan{0%,12%{transform:translateX(0)}88%,100%{transform:translateX(calc(-100% + min(72vw,330px)))}}
          @media(max-width:480px){.smkl-modal__stage{--smkl-button-height:36px;--smkl-button-font:.68rem;}}
          `}</style>
          <div className="smkl-modal__backdrop" />
          <div ref={stageRef}
               className="smkl-modal__stage"
               id={modalId}
               role="dialog"
               aria-modal="true"
               aria-labelledby={`${modalId}-title`}
               aria-busy={busy}
               onMouseDown={(event) => event.stopPropagation()}>
          <button type="button" className="smkl-modal__close" onClick={handleClose}  aria-label="Close access"  disabled={busy}>
          <span/>
          <span/>
          </button>
          <div className="smkl-modal__bubble smkl-modal__bubble--screen">
          <div className="smkl-typing-viewport">
          <span className="smkl-typing-text">
           {bubbleText}
          </span>
          </div>
          <div className="smkl-screen-userfx">
          <div className="smkl-modal__brand-line"/>
          <strong>
            USER🜲FX
          </strong>
           <div className="smkl-modal__brand-line"/>
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
          <div className="smkl-robot__hand smkl-robot__hand--left">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="smkl-robot__hand smkl-robot__hand--right">
            <i />
            <i />
            <i />
            <i />
          </div>
    <RoseIcon className="smkl-panel__rose"/>
          <div className="smkl-modal__brand-line" />
          <h2 id={`${modalId}-title`}>
            {titleText} 
          </h2>
          <div className="smkl-modal__brand-line" />
          <div className="smkl-panel__divider" aria-hidden="true">
          <span />
    <RoseIcon />
          <span />
          </div>
          <form className="smkl-form" onSubmit={handleSubmit} noValidate>
            <p style={{margin: "0",
                color: "#ffffff7a",
                fontSize: ".72rem",
                letterSpacing: ".16em",}}>
          {stepLabel}
          </p>

          {step === "identity" && (
          <p className="smkl-identity-user">
          {username}
          </p>
          )}

          {step === "username" && (
          <div className="smkl-form__field">
          <span className="smkl-form__icon"><UserIcon /></span>
          <label className="smkl-sr-only" htmlFor={`${modalId}-username`}>Telegram username</label>
          <input ref={primaryInputRef} id={`${modalId}-username`} type="text" name="username" placeholder="@username" value={username} onChange={(event) => {setUsername(normalizeUsername(event.target.value));setError(null);}} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={busy} required/>
          </div>
          )}

          {step === "identity" && identityEntryReady && (
          <div className="smkl-form__field">
          <span className="smkl-form__icon"><LockIcon /></span>
          <label className="smkl-sr-only" htmlFor={`${modalId}-identity-code`}>TGMX identity code</label>
          <input ref={primaryInputRef} id={`${modalId}-identity-code`} type="text" name="identity-code" placeholder="TGMX-XXXX" value={identityCode} onChange={(event) => {setIdentityCode(normalizeIdentityCode(event.target.value));setError(null);}} autoComplete="one-time-code" autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={9} disabled={busy} required/>
          </div>
          )}

          {step === "access" && (
          <div className="smkl-form__field">
          <span className="smkl-form__icon"><LockIcon /></span>
          <label className="smkl-sr-only" htmlFor={`${modalId}-access-code`}>Private access key</label>
          <input ref={inputRef} id={`${modalId}-access-code`} type="text" name="access-code" placeholder={accessPlaceholder} value={accessCode} onChange={(event) => onAccessCodeChange(event.target.value.toUpperCase())} autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={9} disabled={accessLoading} required/>
          </div>
          )}

          {visibleError && (
          <p className="smkl-form__error" id={`${modalId}-error`} role="alert" >
          {visibleError}
          </p>
          )}

          {step === "identity" && !identityEntryReady && (
          <button type="button" className="smkl-form__submit" onClick={openTelegramIdentity} disabled={busy}>
          <span>GET SPECIAL CODE</span>
          </button>
          )}

          {step === "access" && (
          <button type="button" className="smkl-form__submit" onClick={onGetCode} disabled={accessLoading}>
          <span>OPEN TELEGRAM FX</span>
          </button>
          )}

          {(step !== "identity" || identityEntryReady) && (
          <button type="submit" className={`smkl-form__submit${busy ? " is-loading" : ""}`} disabled={busy}>
          <span>
           {busy ? "CHECKING..."
                 : step === "username"
                   ? "KEEP GOING"
                   : step === "identity"
                     ? "VERIFY IDENTITY"
                     : "ENTER PRIVATE"}
          </span>
          </button>
          )}
          </form>
          </section>
          <header className="smkl-modal__brand smkl-modal__brand--bottom">
          </header>
          </div>
          </div>,
           document.body,
          );
          }
