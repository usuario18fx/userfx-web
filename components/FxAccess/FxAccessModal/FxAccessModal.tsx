import {useEffect, useId, useRef, useState,
  type ChangeEvent,type FormEvent,type RefObject,} from "react";
import { createPortal } from "react-dom";
import "./FxAccessModal.css";

type AccessMode = "menu" | "code" | "telegram";
type TelegramStep = "username" | "special" | "access";
type PlanKey = "BSIC" | "PRX0" | "VIPX";
type VisualState = "idle" | "approved" | "rejected";
type FxAccessModalProps = {
  id?: string;
  open: boolean;
  onClose: () => void;
  accessCode: string;
  onAccessCodeChange: (value: string) => void;
  onAccessSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  accessLoading?: boolean;
  accessError?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
};
/* ─────   PLAN DATA ─────── */
const PLAN_DISPLAY: Record<PlanKey,{name:string;icon:string}> = {
  BSIC: {name:"BASIC",icon:"/assets/iconos/basic.png"},
  PRX0: {name:"PRO",icon:"/assets/iconos/pro.png"},
  VIPX: {name:"VIP",icon:"/assets/iconos/vip.png"},
};
const PLAN_KEYS:PlanKey[] = ["BSIC","PRX0","VIPX"];
const USERNAME_STORAGE_KEY = "userfx_telegram_username";
/* ================= ICONOS ================= */
const ACCESS_ICONS = {
  lock: "/assets/iconos/candado.png",
  telegram: "/assets/iconos/telegram.png",
} as const;
const CrownIcon = () => (
  <svg width="22" height="18" viewBox="0 0 36 24" aria-hidden="true">
    <path d="m18 0 8 12 10-8-4 20H4L0 4l10 8 8-12z" fill="currentColor" />
  </svg>
);
/* ================= DECORACIONES ================= */
const Rose = ({size = 40}:{size?:number}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <radialGradient id="rosePetal" cx="42%" cy="35%" r="80%">
        <stop offset="0%" stopColor="#b34a5f" />
        <stop offset="55%" stopColor="#7c1e30" />
        <stop offset="100%" stopColor="#43060f" />
      </radialGradient>
    </defs>
    <g stroke="#26030a" strokeWidth="1.4">
      {[0,60,120,180,240,300].map((deg) => (
        <path key={deg} d="M50 50 C 38 34, 40 16, 50 10 C 60 16, 62 34, 50 50 Z" fill="url(#rosePetal)" transform={`rotate(${deg} 50 50)`} />
      ))}
    </g>
  <circle cx="50" cy="50" r="15" fill="#5c1120" stroke="#26030a" strokeWidth="1.4" />
    <path d="M50 41 a9 9 0 1 1 -9 9 a6.5 6.5 0 1 0 6.5 -6.5 a4 4 0 1 1 -4 4" fill="none" stroke="#a13b4e" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
const CornerFlourish = ({className = ""}:{className?:string}) => (
  <svg className={`sl-corner ${className}`} viewBox="0 0 80 80" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 72 C8 36 36 8 72 8" />
      <path d="M16 72 C16 43 43 16 72 16" opacity=".5" />
      <path d="M12 46 q10 2 12 12" />
      <path d="M46 12 q2 10 12 12" />
    </g>
    <circle cx="28" cy="52" r="3.4" fill="currentColor" />
    <circle cx="52" cy="28" r="3.4" fill="currentColor" />
  </svg>
);
/* ================= ROBOT ================= */
function Robot({state}:{state:VisualState}) {
  const eyeColor =
    state === "rejected"
      ? "#ff4165"
      : state === "approved"
        ? "#4dffab"
        : "#159dff";
  return (
    <div className={`sl-robot is-${state}`} aria-hidden="true">
      <svg className="sl-robot-svg" viewBox="0 0 240 168">
        {/* ─────   ROBOT DEFS ─────── */}
        <defs>
          <linearGradient id="helmetGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#555b64" />
            <stop offset="38%" stopColor="#292e35" />
            <stop offset="72%" stopColor="#171b21" />
            <stop offset="100%" stopColor="#0d1015" />
          </linearGradient>
          <linearGradient id="visorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10181c" />
            <stop offset="55%" stopColor="#070c0f" />
            <stop offset="100%" stopColor="#020507" />
          </linearGradient>
          <linearGradient id="robotMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3a3f46" />
            <stop offset="30%" stopColor="#4b515a" />
            <stop offset="58%" stopColor="#383c41" />
            <stop offset="78%" stopColor="#15191f" />
            <stop offset="100%" stopColor="#3b3f44" />
          </linearGradient>
          <filter id="eyeGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
{/* ─────   HEADPHONES ─────── */}
        <rect x="14" y="72" width="24" height="52" rx="12" fill="#20242a" stroke="#911d44"  strokeWidth="2" />
        <rect x="202" y="72" width="24" height="52" rx="12" fill="#20242a" stroke="#911d44" strokeWidth="2" />
        <circle cx="26" cy="98" r="5" fill="#460616" stroke="#911d44"  strokeWidth="1.5" />
        <circle cx="214" cy="98" r="5" fill="#e22850" stroke="#911d44" strokeWidth="1.5" />
{/* ─────   HELMET ─────── */}
        <rect x="34" y="18" width="172" height="132" rx="58" fill="url(#helmetGrad)" stroke="#911d44"  strokeWidth="2.5" />
        <rect x="88" y="6" width="64" height="20" rx="10" fill="#58001d" stroke="#911d44" strokeWidth="2" />
{/* ─────   VISOR ─────── */}
        <rect x="52" y="42" width="136" height="88" rx="38" fill="url(#visorGrad)" stroke="#661e36" strokeWidth="3" />
{/* ─────   FACE ─────── */}
        <g filter="url(#eyeGlow)">
          <ellipse className="sl-eye" cx="95" cy="82" rx="11" ry="18" fill={eyeColor} />
          <ellipse className="sl-eye" cx="145" cy="82" rx="11" ry="18" fill={eyeColor} />
          <rect x="111" y="108" width="18" height="5" rx="2.5" fill={eyeColor} />
        </g>
      </svg>
{/* ─────   HANDS ─────── */}
      {(["sl-hand-left","sl-hand-right"] as const).map((cls) => (
        <svg key={cls} className={`sl-hand ${cls}`} viewBox="0 0 96 60">
{/* ─────   FINGERS ─────── */}
          <g fill="url(#robotMetal)" stroke="#992350" strokeWidth="2">
            <rect x="6" y="8" width="16" height="44" rx="8" />
            <rect x="26" y="2" width="16" height="50" rx="8" />
            <rect x="46" y="4" width="16" height="48" rx="8" />
            <rect x="66" y="10" width="16" height="42" rx="8" />
          </g>
{/* ─────   HAND DETAILS ─────── */}
          <g fill="#776b6c">
            <rect x="9" y="24" width="10" height="6" rx="3" />
            <rect x="29" y="22" width="10" height="6" rx="3" />
            <rect x="49" y="24" width="10" height="6" rx="3" />
            <rect x="69" y="28" width="10" height="6" rx="3" />
          </g>
        </svg>
      ))}
    </div>
  );
  }
/* ================= HELPERS ================= */
function normalizeUsername(value:string) {
  const clean = String(value || "")
    .trim()
    .replace(/^@+/,"")
    .replace(/[^A-Za-z0-9_]/g,"")
    .slice(0,32);
  return clean ? `@${clean}` : "";
}
function normalizeSuffix(value:string) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-HJ-NP-Z2-9]/g,"")
    .slice(0,4);
}
/* ================= MODAL ================= */
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
}:FxAccessModalProps) {const generatedId = useId();

  const modalId = id ??
    `fx-access-modal-${generatedId.replace(/[^a-zA-Z0-9]/g,"")}`;

  const usernameRef = useRef<HTMLInputElement>(null);
  const specialCodeRef = useRef<HTMLInputElement>(null);

  /* ─────   STATE ─────── */
  const [mode,setMode] = useState<AccessMode>("menu");
  const [selectedPlan,setSelectedPlan] = useState<PlanKey>("PRX0");
  const [telegramStep,setTelegramStep] = useState<TelegramStep>("username");
  const [username,setUsername] = useState("");
  const [telegramAuthorized,setTelegramAuthorized] = useState(false);
  const [specialCode,setSpecialCode] = useState("");
  const [identityVerified,setIdentityVerified] = useState(false);
  const [identityLoading,setIdentityLoading] = useState(false);
  const [privateLoading,setPrivateLoading] = useState(false);
  const [error,setError] = useState<string | null>(null);
  const busy = accessLoading || identityLoading || privateLoading;
  const screenError = mode === "code"
      ? accessError || error
      : error;
  const visualState:VisualState = screenError
        ? "rejected"
        : telegramAuthorized || identityVerified
          ? "approved"
          : "idle";
  /* ─────   CODE VALUES ─────── */
  const accessSuffix = accessCode
    .toUpperCase()
    .replace(/^(BSIC|PRX0|VIPX)-?/i,"")
    .replace(/[^A-HJ-NP-Z2-9]/g,"")
    .slice(0,4);
  const specialSuffix = specialCode
    .toUpperCase()
    .replace(/^SPCL-?/i,"")
    .replace(/[^A-HJ-NP-Z2-9]/g,"")
    .slice(0,4);
  /* ─────   OPEN ─────── */
    useEffect(() => { if (!open) return;
  const detectedPlan = accessCode
      .trim()
      .toUpperCase()
      .match(/^(BSIC|PRX0|VIPX)/)?.[1] as PlanKey | undefined;
  if (detectedPlan) {setSelectedPlan(detectedPlan);
    }
  try {
  const savedUsername = normalizeUsername(
      localStorage.getItem(USERNAME_STORAGE_KEY) || "",
      );
    if (savedUsername) {setUsername(savedUsername);
      }
    } catch {
      // Storage unavailable.
    }
    setMode("menu");
    setTelegramStep("username");
    setTelegramAuthorized(false);
    setIdentityVerified(false);
    setSpecialCode("");
    setError(null);
  },[open]);
  /* ─────   KEYBOARD ─────── */
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event:KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        onClose();
      }};
    window.addEventListener("keydown",handleKeyDown);
    return () => {
      window.removeEventListener("keydown",handleKeyDown);
    };
  },[open,busy,onClose]);
  /* ─────   LOCK PAGE SCROLL ─────── */
  useEffect(() => {
    if (!open) return;
    const bodyOverflow =
      document.body.style.overflow;
    const htmlOverflow =
      document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  },[open]);
  /* ─────   CODE MODE ─────── */
  const openCodeMode = () => {
    if (busy) return;
    setMode("code");
    setError(null);
    if (!accessCode) {
      onAccessCodeChange(`${selectedPlan}-`);
    }
    window.setTimeout(() => {
      inputRef?.current?.focus();
    },100);
  };
  /* ─────   PLAN ─────── */
  const selectPlan = (plan:PlanKey) => {
    if (busy) return;
    setSelectedPlan(plan);
    setError(null);
    onAccessCodeChange(
      `${plan}-${accessSuffix}`,
    );
    window.setTimeout(() => {
      inputRef?.current?.focus();
    },80);
  };
  /* ─────   ACCESS CODE INPUT ─────── */
  const handleAccessCodeChange = (
    event:ChangeEvent<HTMLInputElement>,
  ) => {
    const suffix = normalizeSuffix(event.target.value);
    onAccessCodeChange(`${selectedPlan}-${suffix}`,
    );
    setError(null);
  };
  /* ─────   ACCESS CODE VERIFY ─────── */
  const handleAccessSubmit = async (
    event:FormEvent<HTMLFormElement>,
  ) => {
    if (busy) {
      event.preventDefault();
     return;
    }
    if (accessSuffix.length !== 4) {
      event.preventDefault();
      setError("DROP THE FULL ACCESS CODE");
      inputRef?.current?.focus();
      return;
    }
    setError(null);
    await onAccessSubmit(event);
  };
  /* ─────   TELEGRAM MODE ─────── */
  const openTelegramMode = () => {
    if (busy) return;
    setMode("telegram");
    setTelegramStep("username");
    setError(null);
    window.setTimeout(() => {
      usernameRef.current?.focus();
    },100);
  };
  /* ─────   USERNAME ─────── */
  const handleUsernameChange = (
    event:ChangeEvent<HTMLInputElement>,
  ) => {
    setUsername( normalizeUsername(event.target.value),
    );
    setTelegramAuthorized(false);
    setIdentityVerified(false);
    setError(null);
  };
  /* ─────   CHECK USER ─────── */
  const handleTelegramUsernameCheck = async (
    event:FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (busy) return;
    const normalizedUsername = normalizeUsername(username);
    const usernameBody = normalizedUsername.replace(/^@/,"");
    if (!/^[A-Za-z0-9_]{3,32}$/.test(usernameBody)) {
      setTelegramAuthorized(false);
      setError("DROP YOUR TELEGRAM @USERNAME");
      usernameRef.current?.focus();
      return;
    }
    try {
      setIdentityLoading(true);
      setTelegramAuthorized(false);
      setError(null);

      const response = await fetch(
        `/api/telegram-eligibility?username=${encodeURIComponent(normalizedUsername)}`,
        {
          method:"GET",
          headers:{
            Accept:"application/json",
          },
          credentials:"same-origin",
          cache:"no-store",
      },);
      const data =
        await response.json().catch(() => ({}));
      if (!response.ok || !data?.eligible) {
        throw new Error(
          data?.error ||
          "USERNAME IS NOT ACTIVE IN TELEGRAMFX",
        );
      }
      setUsername(normalizedUsername);
      setTelegramAuthorized(true);
      setError(null);
      try {
        localStorage.setItem(
          USERNAME_STORAGE_KEY,
          normalizedUsername,
        );
    } catch {
        // Storage unavailable.
      }} catch (submissionError) {
      setTelegramAuthorized(false);
      setError(
        submissionError instanceof Error &&
        submissionError.message
          ? submissionError.message
          : "USERNAME IS NOT ACTIVE IN TELEGRAMFX",
      );} finally {
      setIdentityLoading(false);
    }};
  /* ─────   OPEN SPECIAL CODE ─────── */
  const openSpecialCode = () => {
    if (!telegramAuthorized || busy) return;
    setTelegramStep("special");
    setSpecialCode("");
    setError(null);
    window.setTimeout(() => {specialCodeRef.current?.focus();
    },100);
  };
  /* ─────   SPECIAL CODE INPUT ─────── */
  const handleSpecialCodeChange = (
    event:ChangeEvent<HTMLInputElement>,
  ) => {
    const suffix =
    normalizeSuffix(event.target.value);
    setSpecialCode(
      suffix
        ? `SPCL-${suffix}`
        : "",
    );
    setError(null);
  };
  /* ─────   SPECIAL CODE VERIFY ─────── */
  const handleSpecialCodeSubmit = async (
    event:FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (busy) return;
    if (!telegramAuthorized) {
      setError(
        "VERIFY YOUR TELEGRAM USERNAME FIRST",
      );
      return;
    }
    const normalizedUsername =
      normalizeUsername(username);
    const normalizedCode =
      `SPCL-${specialSuffix}`;
    if (!/^SPCL-[A-HJ-NP-Z2-9]{4}$/.test(normalizedCode)) {
      setError(
        "DROP THE FULL SPECIAL CODE",
      );
      specialCodeRef.current?.focus();

      return;
    }

    try {
      setIdentityLoading(true);
      setIdentityVerified(false);
      setError(null);

      const response =
        await fetch("/api/identity",{
          method:"POST",
          headers:{
            Accept:"application/json",
            "Content-Type":"application/json",
          },
          credentials:"same-origin",
          cache:"no-store",
     body:JSON.stringify({
            username:normalizedUsername,
            code:normalizedCode,
        }), });
      const data =
        await response.json().catch(() => ({}));
      if (!response.ok || !data?.verified) {
        throw new Error(
          data?.error ||
          "IDENTITY CHECK DIDN'T GO THROUGH",
        );
      }
      const verifiedUsername =
        normalizeUsername(
          data.username ||
          normalizedUsername,
        );
      setUsername(verifiedUsername);
      setTelegramAuthorized(true);
      setIdentityVerified(true);
      setTelegramStep("access");
      setError(null);
      try {
        localStorage.setItem(
          USERNAME_STORAGE_KEY,
          verifiedUsername,
    );
    sessionStorage.setItem(
      "userfx_access_code", normalizedCode,
    );
    } catch {
      // Storage unavailable.
    }
    } catch (submissionError) {
      setIdentityVerified(false);
      setError(
        submissionError instanceof Error &&
        submissionError.message
          ? submissionError.message
          : "IDENTITY CHECK DIDN'T GO THROUGH",
    );
    } finally {
      setIdentityLoading(false);
    }};
  /* ─────   PRIVATE ROOM ─────── */
  const handlePrivateAccess = async (
    event:FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (
      busy || !telegramAuthorized || !identityVerified
    ) {
      return;
    }
    try {
      setPrivateLoading(true);
      setError(null);
      const response =
        await fetch("/api/access-session",{
          method:"POST",
          headers:{
          Accept:"application/json",
          },
          credentials:"same-origin",
          cache:"no-store",
        });
      const data =
        await response.json().catch(() => ({}));
      if (!response.ok || !data?.authenticated) {
        throw new Error(
          data?.error ||
          "PRIVATE ACCESS DIDN'T GO THROUGH",
      );
      }
      onClose();
      window.location.hash =
        "#/private-room";
    } catch (submissionError) {
      setError(
        submissionError instanceof Error &&
        submissionError.message
          ? submissionError.message
          : "PRIVATE ACCESS DIDN'T GO THROUGH",
      );
    } finally {
      setPrivateLoading(false);
    }};
  /* ─────   SCREEN TEXT ─────── */
  const screenMessage =
    screenError
      ? `ERROR · ${screenError.toUpperCase()}`
      : mode === "menu"
        ? "CHOOSE YOUR ACCESS PATH · CODE OR TELEGRAM."
        : mode === "code"
          ? `CODE ACCESS · ${selectedPlan} · ENTER YOUR PRIVATE KEY.`
          : telegramStep === "username" &&
              !telegramAuthorized
            ? "TELEGRAM ACCESS · ENTER YOUR @USERNAME TO CONTINUE."
            : telegramStep === "username" &&
                telegramAuthorized
              ? `${username} AUTHORIZED · SPECIAL CODE IS READY.`
              : telegramStep === "special"
                ? `${username} AUTHORIZED · ENTER YOUR SPECIAL CODE.`
                : `${username} VERIFIED · PRIVATE ACCESS READY.`;

  /* ─────   GUARD ─────── */

  if (
    !open ||
    typeof document === "undefined"
  ) {
    return null;
  }

  /* ================= UI ================= */

  return createPortal(
    <div className={`sl-overlay is-${visualState}`} onMouseDown={(event) => {if (event.target === event.currentTarget && !busy) onClose();}}>
      <div className="sl-smoke sl-smoke-a"></div>
      <div className="sl-smoke sl-smoke-b"></div>
      <div className="sl-arch"></div>

      <div className="sl-scene" id={modalId}>

        {/* ─────   HEADER ─────── */}

        <header className="sl-header">
          <div className="sl-top-ornament">
            <span className="sl-line"></span>
            <Rose size={30} />
            <span className="sl-line"></span>
          </div>

          <h1 className="sl-title">
            USER FX
          </h1>

          <div className="sl-header-rule"></div>
        </header>

        {/* ─────   TOP SCREEN ─────── */}

        <p className={`sl-bubble ${screenError ? "is-error" : ""}`}>
          {screenMessage}
        </p>

        <div className="sl-stage">

          {/* ─────   ROBOT ─────── */}

          <Robot state={visualState} />

          {/* ========   PRIVATE ACCESS =========================== */}

          <div className="sl-card">
            <CornerFlourish className="sl-corner-tl" />
            <CornerFlourish className="sl-corner-tr" />
            <CornerFlourish className="sl-corner-bl" />
            <CornerFlourish className="sl-corner-br" />

            <div className="sl-card-rose">
              <Rose size={54} />
            </div>

            <h2 className="sl-card-title">
              PRIVATE ACCESS
            </h2>
            {/* ========   ACCESS BODY =========================== */}
            <div className="sl-card-body">

              {/* ========   MENU =========================== */}
              {mode === "menu" && (
                <div className="sl-form">

                  {/* ─────   CODE ─────── */}
                  <div className="sl-btn-wrap">
                    <button type="button" className="sl-btn" onClick={openCodeMode} disabled={busy}>
                      <img src={ACCESS_ICONS.lock} alt="" className="sl-menu-icon" draggable={false} />
                      <span>CODE</span>
                    </button>
                  </div>

                  {/* ─────   TELEGRAM ─────── */}
                  <div className="sl-btn-wrap">
                    <button type="button" className="sl-btn sl-upgrade-btn sl-telegram-btn" style={{minWidth:0,width:"fit-content"}} onClick={openTelegramMode} disabled={busy} aria-label="Telegram">
                      <img src={ACCESS_ICONS.telegram} alt="" className="sl-menu-icon" draggable={false} />
                    </button>
                  </div>

                </div>
              )}

              {/* ========   CODE =========================== */}
              {mode === "code" && (
                <form className="sl-form" onSubmit={handleAccessSubmit}>

                  {/* ─────   PLANS ─────── */}
                  <div className="sl-plan-grid">
                    {PLAN_KEYS.map((plan) => (
                      <button key={plan} type="button" className={`sl-plan ${selectedPlan === plan ? "is-active" : ""}`} onClick={() => selectPlan(plan)} disabled={busy}>
                        <img src={PLAN_DISPLAY[plan].icon} alt="" aria-hidden="true" />
                        <span>{PLAN_DISPLAY[plan].name}</span>
                      </button>
                    ))}
                  </div>

                  {/* ─────   ACCESS CODE ─────── */}
                  <label className="sl-field">
                    <img src={ACCESS_ICONS.lock} alt="" className="sl-field-icon" draggable={false} />
                    <span className="sl-code-prefix">{selectedPlan}</span>
                    <input ref={inputRef} type="text" name="access-code" placeholder="XXXX" value={accessSuffix} onChange={handleAccessCodeChange} autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={4} disabled={busy} />
                  </label>

                  {/* ─────   VERIFY ACCESS ─────── */}
                  <div className="sl-btn-wrap">
                    <button type="submit" className="sl-btn" disabled={busy}>
                      {accessLoading ? "CHECKING..." : "VERIFY ACCESS"}
                    </button>
                  </div>

                  {/* ─────   BACK ─────── */}
                  <button type="button" className="sl-back-btn" onClick={() => {setMode("menu");setError(null);}} disabled={busy}>BACK</button>

                </form>
              )}

              {/* ========   TELEGRAM · USERNAME =========================== */}
              {mode === "telegram" && telegramStep === "username" && (
                <form className="sl-form" onSubmit={handleTelegramUsernameCheck}>

                  {/* ─────   USERNAME ─────── */}
                  <label className="sl-field">
                    <img src={ACCESS_ICONS.telegram} alt="" className="sl-field-icon" draggable={false} />
                    <span className="sl-code-prefix">@</span>
                    <input ref={usernameRef} type="text" name="username" placeholder="user18fx" value={username.replace(/^@/,"")} onChange={handleUsernameChange} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={busy} />
                  </label>

                  {/* ─────   TELEGRAM ACTIONS ─────── */}
                  <div className="sl-action-grid">
                    <button type="submit" className={`sl-btn sl-upgrade-btn sl-telegram-btn ${telegramAuthorized ? "is-approved" : ""}`} disabled={busy}>
                      <img src="/assets/iconos/ok.png" alt="" className="sl-check-icon" draggable={false} />
                      {identityLoading ? "CHECKING..." : telegramAuthorized ? "USER AUTHORIZED" : "CHECK USER"}
                    </button>

                    <button type="button" className={`sl-btn sl-upgrade-btn sl-special-btn ${telegramAuthorized ? "is-ready" : ""}`} style={{minWidth:0,width:"fit-content"}} onClick={openSpecialCode} disabled={!telegramAuthorized || busy} aria-label="Special code">
                      <CrownIcon />
                    </button>
                  </div>

                  {/* ─────   BACK ─────── */}
                  <button type="button" className="sl-back-btn" onClick={() => {setMode("menu");setError(null);}} disabled={busy}>BACK</button>

                </form>
              )}

              {/* ========   SPECIAL CODE =========================== */}
              {mode === "telegram" && telegramStep === "special" && (
                <form className="sl-form" onSubmit={handleSpecialCodeSubmit}>

                  {/* ─────   AUTHORIZED USER ─────── */}
                  <label className="sl-field">
                    <img src={ACCESS_ICONS.telegram} alt="" className="sl-field-icon" draggable={false} />
                    <input type="text" value={username} readOnly />
                    <span className="sl-verified-mark">✓</span>
                  </label>

                  {/* ─────   SPECIAL CODE ─────── */}
                  <label className="sl-field">
                    <CrownIcon />
                    <span className="sl-code-prefix">SPCL</span>
                    <input ref={specialCodeRef} type="text" name="special-code" placeholder="XXXX" value={specialSuffix} onChange={handleSpecialCodeChange} autoComplete="one-time-code" autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={4} disabled={busy} />
                  </label>

                  {/* ─────   VERIFY SPECIAL ─────── */}
                  <div className="sl-btn-wrap">
                    <button type="submit" className="sl-btn" disabled={busy}>
                      {identityLoading ? "VERIFYING..." : "VERIFY SPECIAL CODE"}
                    </button>
                  </div>

                  {/* ─────   BACK ─────── */}
                  <button type="button" className="sl-back-btn" onClick={() => {setTelegramStep("username");setError(null);}} disabled={busy}>BACK</button>

                </form>
              )}

              {/* ========   ACCESS READY =========================== */}
              {mode === "telegram" && telegramStep === "access" && (
                <form className="sl-form" onSubmit={handlePrivateAccess}>

                  {/* ─────   VERIFIED USER ─────── */}
                  <div className="sl-access-ready">
                    <img src={ACCESS_ICONS.telegram} alt="" className="sl-access-icon" draggable={false} />
                    <strong>{username}</strong>
                    <span>PRIVATE ACCESS READY</span>
                  </div>

                  {/* ─────   GET IN ─────── */}
                  <div className="sl-btn-wrap">
                    <button type="submit" className="sl-btn is-approved" disabled={busy || !identityVerified}>
                      {privateLoading ? "OPENING..." : "GET IN"}
                    </button>
                  </div>

                </form>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
export default FxAccessModal;
