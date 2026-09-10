import { FormEvent, useEffect, useId, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import "./FxAccessModal.css";

type AccessStep = "username" | "identity" | "access";
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
    document.cookie = `${USERNAME_COOKIE}=${encodeURIComponent(username)}; Path=/; SameSite=Lax; Max-Age=2592000`;
  } catch {}
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
  accessPlaceholder = "ACCESS KEY",
  inputRef,
}: FxAccessModalProps) {
  void accessCode;
  void onAccessCodeChange;
  void onAccessSubmit;
  void onGetCode;
  void accessLoading;
  void accessError;
  void accessPlaceholder;
  void inputRef;
  const generatedId = useId();
  const modalId = id ?? `fx-access-modal-${generatedId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const stageRef = useRef<HTMLDivElement>(null);
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const loadingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const [step, setStep] = useState<AccessStep>("username");
  const [username, setUsername] = useState("");
  const [identityCode, setIdentityCode] = useState("");
  const [identityLoading, setIdentityLoading] = useState(false);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [identityEntryReady, setIdentityEntryReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = identityLoading || privateLoading;
  useEffect(() => { loadingRef.current = busy; }, [busy]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
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
      returnToIdentity = params.get("identity") === "1" || localStorage.getItem(IDENTITY_RETURN_KEY) === "1";
      const saved = localStorage.getItem(USERNAME_COOKIE) || "";
        if (saved) {
        const normalizedSaved = normalizeUsername(saved);
        setUsername(normalizedSaved);
        if (returnToIdentity) {
          setIdentityEntryReady(true);
          setStep("identity");
  }}
        if (params.get("identity") === "1") {
        params.delete("identity");
        const query = params.toString();
        window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }} catch {}
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
        .catch(() => {})
        .finally(() => { if (!cancelled) setIdentityLoading(false); });

      return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
      if (!open) return;
    const timer = window.setTimeout(() => {
      if (step === "username" || step === "identity") {
        primaryInputRef.current?.focus();
  }}, 120);
      return () => window.clearTimeout(timer);
  }, [open, step, identityEntryReady]);

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
  }};
    window.addEventListener("keydown", handleKeyDown);
      return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      previouslyFocusedElement.current?.focus();
  };
  }, [open]);
  const handleClose = () => { if (!busy) onCloseRef.current(); };
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
      setIdentityEntryReady(false);
      setStep("access");
  } catch (submissionError) {
      setError(submissionError instanceof Error && submissionError.message ? submissionError.message : "IDENTITY CHECK DIDN'T GO THROUGH");
  } finally {setIdentityLoading(false);
  }};
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
  }};
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (busy) return;
      if (step === "username") return handleUsernameSubmit();
      if (step === "identity") {
      return handleIdentitySubmit();
  }
      await handlePrivateAccess();
  };
  const openTelegramIdentity = () => {
      try {
      localStorage.setItem(IDENTITY_RETURN_KEY, "1");
      persistUsername(normalizeUsername(username));
  } catch {}
      window.open(TELEGRAM_IDENTITY_URL, "_blank", "noopener,noreferrer");
  };
  const bubbleText = step === "username"
    ? "Hey sexy, if you already got your special code, drop it here."
    : step === "identity"
      ? `${username} · grab your special code on Telegram, copy it and bring it back here.`
      : `${username} · access cleared. you're good to get in.`;
  const titleText = step === "username" ? "WHO'S PULLING UP?" : step === "identity" ? "SPECIAL ACCESS" : "PRIVATE ACCESS";
  const stepLabel = step === "username" ? "STEP 1 · TELEGRAM USERNAME" : step === "identity" ? "STEP 2 · SPECIAL CODE" : "STEP 3 · ᴡᴇʟᴄᴏᴍᴇ ʏᴏᴜʀ ᴀᴄᴄᴇꜱꜱ ɪꜱ ᴜɴʟᴏᴄᴋᴇᴅ.";
      if (!open || typeof document === "undefined") return null;
      return createPortal(
          <div className="smkl-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) handleClose(); }}>
          <div className="smkl-modal__backdrop" />
          <div ref={stageRef} className="smkl-modal__stage" id={modalId} role="dialog" aria-modal="true" aria-labelledby={`${modalId}-title`} aria-busy={busy} onMouseDown={(event) => event.stopPropagation()}>
          <button type="button" className="smkl-modal__close" onClick={handleClose} aria-label="Close access" disabled={busy}>
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
          </strong><div className="smkl-modal__brand-line"/>
          </div>
          </div>
          <div className="smkl-robot" aria-hidden="true">
          <div className="smkl-robot__ear smkl-robot__ear--left" />
          <div className="smkl-robot__ear smkl-robot__ear--right" />
          <div className="smkl-robot__head">
    <RoseIcon className="smkl-robot__head-rose" />
          <div className="smkl-robot__face">
          <span className="smkl-robot__eye"/>
          <span className="smkl-robot__eye"/>
          <span className="smkl-robot__mouth"/>
          </div>
          </div>
          </div>
          <section className="smkl-panel">
          <div className="smkl-robot__hand smkl-robot__hand--left"><i/><i/><i/><i/></div>
          <div className="smkl-robot__hand smkl-robot__hand--right"><i/><i/><i/><i/></div>
    <RoseIcon className="smkl-panel__rose"/>
          <div className="smkl-modal__brand-line" />
          <h2 id={`${modalId}-title`}>
           {titleText}</h2>
          <div className="smkl-modal__brand-line" />
          <div className="smkl-panel__divider" aria-hidden="true">
          <span/>
    <RoseIcon/>
          <span/>
          </div>
          <form className="smkl-form" onSubmit={handleSubmit} noValidate>
          <p style={{margin:0,color:"#ffffff98",fontSize:".99rem",letterSpacing:".14em",transform:"translateY(-18px)"}}>
           {stepLabel}</p>
          <span className="smkl-step-unlock-icon" aria-hidden="true" />

          {step === "username" && (
          <div className="smkl-form__field smkl-form__field--username">
          <span className="smkl-form__icon smkl-form__icon--username">
      <UserIcon />
          </span>
          <label className="smkl-sr-only" htmlFor={`${modalId}-username`}>
            Telegram username
          </label>
          <input ref={primaryInputRef}
                 id={`${modalId}-username`}
                 type="text"
                 name="username"
                 placeholder="@username"
                 value={username}
                 onChange={(event) => {
                 setUsername(normalizeUsername(event.target.value));
                 setError(null);}}
                 autoComplete="username"
                 autoCapitalize="none"
                 autoCorrect="off"
                 spellCheck={false}
                 disabled={busy}
                 required/>
          </div>
          )}

          {step === "username" && (
          <button type="submit" className={`smkl-form__submit${busy ? " is-loading" : ""}`} disabled={busy}>
          <span>{busy ? "CHECKING..." : "KEEP GOING"}</span>
          </button>
          )}

          {step === "identity" && (
          <div className="smkl-identity-step">

          <div className="smkl-identity-combined">

          <span className="smkl-identity-combined__user">
            {username}
          </span>

          <span className="smkl-identity-combined__separator"/>

          <label className="smkl-sr-only" htmlFor={`${modalId}-identity-code`}>
            Special identity code
          </label>

          <div className="smkl-code-digits">
          {[0,1,2,3].map((index) => {
            const codePart = identityCode.replace(/^(SPCL|TGMX)-?/i, "");
            const filled = Boolean(codePart[index]);

            return (
              <span
                key={index}
                className={`smkl-code-digit${filled ? " is-filled" : ""}`}
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
                .slice(0,4);

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

          <button type="submit" className={`smkl-form__submit smkl-form__submit--inline${busy ? " is-loading" : ""}`} disabled={busy}>
          <span>{busy ? "CHECKING..." : "VERIFY"}</span>
          </button>

          {!identityEntryReady && (
          <button type="button" className="smkl-get-special-code" onClick={openTelegramIdentity} disabled={busy}>
          <span>GET SPECIAL CODE</span>
          </button>
          )}

          </div>
          )}

          {error && (
          <p className="smkl-form__error" id={`${modalId}-error`} role="alert">
          {error}
          </p>
          )}

          {step === "access" && (
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