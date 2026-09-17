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

/* =========================================================
   USER FX · PRIVATE ACCESS MODAL
   MENU → CODE / TELEGRAM
   ========================================================= */

type AccessMode = "menu" | "plan" | "telegram";
type AccessStep = "username" | "identity" | "access";
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

/* =========================================================
   PLANS
   ========================================================= */

const PLAN_DISPLAY: Record<PlanKey, { icon: string; name: string }> = {
  BSIC: {
    icon: "/assets/iconos/basic.png",
    name: "BASIC",
  },
  PRX0: {
    icon: "/assets/iconos/pro.png",
    name: "PRO",
  },
  VIPX: {
    icon: "/assets/iconos/vip.png",
    name: "VIP",
  },
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

/* =========================================================
   HELPERS
   ========================================================= */

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
    document.cookie =
      `${USERNAME_STORAGE_KEY}=${encodeURIComponent(username)}; ` +
      "Path=/; SameSite=Lax; Max-Age=2592000";
  } catch {
    // Storage unavailable.
  }
}

/* =========================================================
   ROSE ICON
   ========================================================= */

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

/* =========================================================
   USER ICON
   ========================================================= */

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

/* =========================================================
   TELEGRAM ICON
   ========================================================= */

function TelegramIcon() {
  return (
    <svg
      className="smkl-telegram-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="11" fill="#229ED9" />
      <path
        d="M17.9 6.75 15.8 17.1c-.16.73-.57.91-1.16.57l-3.2-2.36-1.54 1.49c-.17.17-.31.31-.64.31l.23-3.26 5.94-5.37c.26-.23-.06-.36-.4-.13l-7.34 4.62-3.16-.99c-.69-.21-.7-.69.14-1.02l12.35-4.76c.57-.21 1.07.14.88.55Z"
        fill="#fff"
      />
    </svg>
  );
}

/* =========================================================
   COMPONENT
   ========================================================= */

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
    id ??
    `fx-access-modal-${generatedId.replace(/[^a-zA-Z0-9]/g, "")}`;

  const stageRef = useRef<HTMLDivElement>(null);
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const loadingRef = useRef(false);

  /* =========================================================
     STATE
     ========================================================= */

  const [mode, setMode] = useState<AccessMode>("menu");
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

  /* =========================================================
     STATUS
     ========================================================= */

  const busy =
    identityLoading ||
    privateLoading ||
    accessLoading;

  const visualState: CheckState =
    mode === "plan" && accessError
      ? "rejected"
      : checkState;

  const isUsernameGuidance =
    mode === "telegram" &&
    step === "username" &&
    !telegramAuthorized;

  const isSpecialGuidance =
    mode === "telegram" &&
    step === "username" &&
    telegramAuthorized;

  /* =========================================================
     REFERENCES
     ========================================================= */

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    loadingRef.current = busy;
  }, [busy]);

  /* =========================================================
     OPEN · RESTORE TELEGRAM STATE
     ========================================================= */

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    setMode("menu");
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
        // Keep normal access available.
      }

      try {
        const response = await fetch("/api/identity", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          credentials: "same-origin",
          cache: "no-store",
        });

        const data = await response
          .json()
          .catch(() => ({}));

        if (cancelled) return;

        /* ─────────────────────────────────────
           FULL IDENTITY ALREADY VERIFIED
           ───────────────────────────────────── */

        if (data?.verified) {
          const verifiedUsername = normalizeUsername(
            data.username || savedUsername,
          );

          if (verifiedUsername) {
            setUsername(verifiedUsername);
            persistUsername(verifiedUsername);
          }

          setTelegramAuthorized(true);
          setStep("access");
          setCheckState("idle");

          return;
        }

        /* ─────────────────────────────────────
           RETURN TO SPECIAL CODE
           ───────────────────────────────────── */

        if (!returnToIdentity || !savedUsername) {
          return;
        }

        const eligibilityResponse = await fetch(
          `/api/telegram-eligibility?username=${encodeURIComponent(
            savedUsername,
          )}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            credentials: "same-origin",
            cache: "no-store",
          },
        );

        const eligibility = await eligibilityResponse
          .json()
          .catch(() => ({}));

        if (
          !cancelled &&
          eligibilityResponse.ok &&
          eligibility?.eligible
        ) {
          setMode("telegram");
          setStep("identity");
          setTelegramAuthorized(true);
          setCheckState("approved");
        }
      } catch {
        // Main menu remains available.
      }
    };

    void restoreIdentity();

    return () => {
      cancelled = true;
    };
  }, [open]);

  /* =========================================================
     TELEGRAM AUTO FOCUS
     ========================================================= */

  useEffect(() => {
    if (
      !open ||
      mode !== "telegram" ||
      step === "access"
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      primaryInputRef.current?.focus();
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, mode, step]);

  /* =========================================================
     KEYBOARD · SCROLL LOCK
     ========================================================= */

  useEffect(() => {
    if (!open) return;

    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow =
      document.body.style.overflow;

    const previousPaddingRight =
      document.body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth -
      document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight =
        `${scrollbarWidth}px`;
    }

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
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
        stage.querySelectorAll<HTMLElement>(
          focusableSelector,
        ),
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !== "true",
      );

      if (!focusableItems.length) return;

      const firstItem = focusableItems[0];

      const lastItem =
        focusableItems[
          focusableItems.length - 1
        ];

      if (
        event.shiftKey &&
        document.activeElement === firstItem
      ) {
        event.preventDefault();
        lastItem.focus();
      }

      if (
        !event.shiftKey &&
        document.activeElement === lastItem
      ) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.body.style.overflow =
        previousOverflow;

      document.body.style.paddingRight =
        previousPaddingRight;

      previouslyFocusedElementRef.current?.focus();
    };
  }, [open]);

  /* =========================================================
     CLOSE
     ========================================================= */

  const handleClose = () => {
    if (!busy) {
      onCloseRef.current();
    }
  };

  /* =========================================================
     CODE PATH
     ========================================================= */

  const switchToPlan = (
    plan: PlanKey,
  ) => {
    if (busy) return;

    const planChanged =
      selectedPlan !== plan;

    setMode("plan");
    setSelectedPlan(plan);
    setCheckState("idle");
    setError(null);

    if (planChanged) {
      onAccessCodeChange("");
    }

    window.setTimeout(() => {
      inputRef?.current?.focus();
    }, 120);
  };

  /* =========================================================
     TELEGRAM PATH
     ========================================================= */

  const switchToTelegram = () => {
    if (busy) return;

    setMode("telegram");
    setError(null);

    if (
      telegramAuthorized &&
      step === "access"
    ) {
      setCheckState("approved");
      return;
    }

    if (
      telegramAuthorized &&
      step === "identity"
    ) {
      setCheckState("approved");

      window.setTimeout(() => {
        primaryInputRef.current?.focus();
      }, 120);

      return;
    }

    setStep("username");
    setCheckState(
      telegramAuthorized
        ? "approved"
        : "idle",
    );

    window.setTimeout(() => {
      primaryInputRef.current?.focus();
    }, 120);
  };

  /* =========================================================
     TELEGRAM · CHECK USERNAME
     ========================================================= */

  const handleTelegramUsernameCheck =
    async () => {
      const normalizedUsername =
        normalizeUsername(username);

      const usernameBody =
        normalizedUsername.replace(
          /^@/,
          "",
        );

      if (
        !/^[A-Za-z0-9_]{3,32}$/.test(
          usernameBody,
        )
      ) {
        setCheckState("rejected");

        setError(
          "DROP YOUR TELEGRAM @USERNAME",
        );

        primaryInputRef.current?.focus();

        return;
      }

      try {
        setIdentityLoading(true);
        setError(null);
        setTelegramAuthorized(false);
        setCheckState("idle");

        const response = await fetch(
          `/api/telegram-eligibility?username=${encodeURIComponent(
            normalizedUsername,
          )}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            credentials: "same-origin",
            cache: "no-store",
          },
        );

        const data = await response
          .json()
          .catch(() => ({}));

        if (
          !response.ok ||
          !data?.eligible
        ) {
          throw new Error(
            data?.error ||
              "USERNAME IS NOT ACTIVE IN TELEGRAMFX",
          );
        }

        setUsername(
          normalizedUsername,
        );

        persistUsername(
          normalizedUsername,
        );

        setTelegramAuthorized(true);
        setCheckState("approved");
        setError(null);
      } catch (submissionError) {
        setTelegramAuthorized(false);
        setCheckState("rejected");

        setError(
          submissionError instanceof Error &&
            submissionError.message
            ? submissionError.message
            : "USERNAME IS NOT ACTIVE IN TELEGRAMFX",
        );
      } finally {
        setIdentityLoading(false);
      }
    };

  /* =========================================================
     TELEGRAM · SPECIAL CODE
     ========================================================= */

  const handleIdentitySubmit =
    async () => {
      if (!telegramAuthorized) {
        setError(
          "VERIFY YOUR TELEGRAM USERNAME FIRST",
        );

        return;
      }

      const normalizedUsername =
        normalizeUsername(username);

      const normalizedCode =
        normalizeIdentityCode(
          identityCode,
        );

      if (
        !/^(SPCL|TGMX)-[A-HJ-NP-Z2-9]{4}$/.test(
          normalizedCode,
        )
      ) {
        setError(
          "DROP THE FULL SPECIAL CODE",
        );

        primaryInputRef.current?.focus();

        return;
      }

      try {
        setIdentityLoading(true);
        setError(null);

        const response = await fetch(
          "/api/identity",
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type":
                "application/json",
            },
            credentials: "same-origin",
            cache: "no-store",
            body: JSON.stringify({
              username:
                normalizedUsername,
              code:
                normalizedCode,
            }),
          },
        );

        const data = await response
          .json()
          .catch(() => ({}));

        if (
          !response.ok ||
          !data?.verified
        ) {
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

        setUsername(
          verifiedUsername,
        );

        persistUsername(
          verifiedUsername,
        );

        try {
          localStorage.removeItem(
            IDENTITY_RETURN_KEY,
          );
        } catch {
          // Nothing else required.
        }

        setIdentityCode("");
        setTelegramAuthorized(true);
        setCheckState("approved");
        setStep("access");
      } catch (submissionError) {
        setCheckState("rejected");

        setError(
          submissionError instanceof Error &&
            submissionError.message
            ? submissionError.message
            : "IDENTITY CHECK DIDN'T GO THROUGH",
        );
      } finally {
        setIdentityLoading(false);
      }
    };

  /* =========================================================
     TELEGRAM · PRIVATE ROOM
     ========================================================= */

  const handlePrivateAccess =
    async () => {
      try {
        setPrivateLoading(true);
        setError(null);

        persistUsername(
          normalizeUsername(username),
        );

        const response = await fetch(
          "/api/access-session",
          {
            method: "POST",
            headers: {
              Accept: "application/json",
            },
            credentials: "same-origin",
            cache: "no-store",
          },
        );

        const data = await response
          .json()
          .catch(() => ({}));

        if (
          !response.ok ||
          !data?.authenticated
        ) {
          throw new Error(
            data?.error ||
              "PRIVATE ACCESS DIDN'T GO THROUGH",
          );
        }

        onCloseRef.current();

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
      }
    };

  /* =========================================================
     FORM SUBMIT
     ========================================================= */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    if (mode === "plan") {
      onAccessSubmit(event);
      return;
    }

    event.preventDefault();

    if (
      busy ||
      mode !== "telegram"
    ) {
      return;
    }

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

  /* =========================================================
     TOP ROBOT SCREEN TEXT
     ========================================================= */

  const bubbleText =
    mode === "menu"
      ? "CHOOSE YOUR ACCESS PATH · CODE OR TELEGRAM."
      : mode === "plan"
        ? `CODE ACCESS · Choose ${selectedPlan}, then enter your private key.`
        : step === "username" &&
            !telegramAuthorized
          ? "TELEGRAM ACCESS · Enter your @username to continue."
          : step === "username" &&
              telegramAuthorized
            ? `${username} AUTHORIZED · SPECIAL CODE IS READY.`
            : step === "identity"
              ? `${username} AUTHORIZED · ENTER YOUR SPECIAL CODE.`
              : `${username} VERIFIED · PRIVATE ACCESS READY.`;

  /* =========================================================
     TYPEWRITER
     ========================================================= */

  useEffect(() => {
    if (!open) {
      setTypedText("");
      return;
    }

    let characterIndex = 0;

    setTypedText("");

    const typingTimer =
      window.setInterval(() => {
        characterIndex += 1;

        setTypedText(
          bubbleText.slice(
            0,
            characterIndex,
          ),
        );

        if (
          characterIndex >=
          bubbleText.length
        ) {
          window.clearInterval(
            typingTimer,
          );
        }
      }, 38);

    return () => {
      window.clearInterval(
        typingTimer,
      );
    };
  }, [open, bubbleText]);

  /* =========================================================
     RENDER GUARD
     ========================================================= */

  if (
    !open ||
    typeof document === "undefined"
  ) {
    return null;
  }

  /* =========================================================
     INPUT VALUES
     ========================================================= */

  const planCodeSuffix =
    accessCode
      .toUpperCase()
      .replace(
        /^(BSIC|PRX0|VIPX)-?/i,
        "",
      )
      .replace(
        /[^A-HJ-NP-Z2-9]/g,
        "",
      )
      .slice(0, 4);

  const identitySuffix =
    identityCode
      .toUpperCase()
      .replace(
        /^(SPCL|TGMX)-?/i,
        "",
      )
      .replace(
        /[^A-HJ-NP-Z2-9]/g,
        "",
      )
      .slice(0, 4);

  /* =========================================================
     PORTAL
     ========================================================= */

  return createPortal(
    <div
      className="smkl-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          handleClose();
        }
      }}
    >
      {/* ─────────────────────────────────────
          BACKDROP
          ───────────────────────────────────── */}

      <div className="smkl-modal__backdrop" />

      {/* ─────────────────────────────────────
          STAGE
          ───────────────────────────────────── */}

      <div
        ref={stageRef}
        id={modalId}
        className={`smkl-modal__stage is-${visualState}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${modalId}-title`}
        aria-busy={busy}
        data-access-mode={mode}
        data-access-step={step}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        {/* ─────────────────────────────────────
            CLOSE
            ───────────────────────────────────── */}

        <button
          type="button"
          className="smkl-modal__close"
          onClick={handleClose}
          aria-label="Close access"
          disabled={busy}
        >
          <span />
          <span />
        </button>

        {/* ─────────────────────────────────────
            TOP SCREEN
            ───────────────────────────────────── */}

        <div className="smkl-modal__bubble smkl-modal__bubble--screen">
          <div className="smkl-typing-viewport">
            <span className="smkl-typing-text">
              {typedText}
            </span>
          </div>
        </div>

        {/* ─────────────────────────────────────
            ROBOT
            ───────────────────────────────────── */}

        <div
          className={[
            "smkl-robot",
            `is-${visualState}`,
            isUsernameGuidance
              ? "is-guiding"
              : "",
            isSpecialGuidance
              ? "is-special-guiding"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        >
          <div className="smkl-robot__antenna" />

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

        {/* =========================================================
            PANEL
            ========================================================= */}

        <section className="smkl-panel">
          {/* ─────────────────────────────────────
              ROBOT HAND · LEFT
              ───────────────────────────────────── */}

          <div
            className={[
              "smkl-robot__hand",
              "smkl-robot__hand--left",
              mode === "telegram"
                ? "is-supporting"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
            <i />
            <i />
            <i />
            <i />
          </div>

          {/* ─────────────────────────────────────
              ROBOT HAND · RIGHT
              ───────────────────────────────────── */}

          <div
            className={[
              "smkl-robot__hand",
              "smkl-robot__hand--right",
              isSpecialGuidance
                ? "is-pointing-special"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
            <i />
            <i />
            <i />
            <i />
          </div>

          {/* =========================================================
              PRIVATE ACCESS HEADER
              ========================================================= */}

          <RoseIcon className="smkl-panel__rose" />

          <div className="smkl-modal__brand-line" />

          <h2 id={`${modalId}-title`}>
            PRIVATE ACCESS
          </h2>

          <div className="smkl-modal__brand-line" />

          <div
            className="smkl-panel__divider"
            aria-hidden="true"
          >
            <span />
            <RoseIcon />
            <span />
          </div>

          {/* =========================================================
              MAIN MENU
              ========================================================= */}

          <div className="smkl-panel__mode-switch">
            <button
              type="button"
              className={[
                "smkl-main-mode",
                "smkl-main-mode--code",
                mode === "plan"
                  ? "is-active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() =>
                switchToPlan(
                  selectedPlan,
                )
              }
              aria-pressed={
                mode === "plan"
              }
              disabled={busy}
            >
              CODE
            </button>

            <button
              type="button"
              className={[
                "smkl-main-mode",
                "smkl-main-mode--telegram",
                mode === "telegram"
                  ? "is-active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={
                switchToTelegram
              }
              aria-label="Telegram access"
              aria-pressed={
                mode === "telegram"
              }
              disabled={busy}
            >
              <TelegramIcon />

              <span>
                TELEGRAM
              </span>
            </button>
          </div>

          {/* =========================================================
              CODE PATH
              ========================================================= */}

          {mode === "plan" && (
            <div className="smkl-access-drawer smkl-access-drawer--code">
              <div className="smkl-access-drawer__head">
                <span className="smkl-access-drawer__kicker">
                  SELECT ACCESS
                </span>

                <span className="smkl-access-drawer__state">
                  {selectedPlan}
                </span>
              </div>

              {/* ─────────────────────────────────────
                  BASIC / PRO / VIP
                  ───────────────────────────────────── */}

              <div className="smkl-plan-switcher smkl-plan-switcher--drawer">
                {PLAN_KEYS.map(
                  (plan) => (
                    <button
                      key={plan}
                      type="button"
                      className={[
                        "smkl-plan-pill",
                        selectedPlan ===
                        plan
                          ? "is-active"
                          : "",
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(" ")}
                      onClick={() =>
                        switchToPlan(
                          plan,
                        )
                      }
                      disabled={
                        busy
                      }
                      aria-pressed={
                        selectedPlan ===
                        plan
                      }
                    >
                      <img
                        className="smkl-plan-pill__icon"
                        src={
                          PLAN_DISPLAY[
                            plan
                          ].icon
                        }
                        alt=""
                        aria-hidden="true"
                        draggable={
                          false
                        }
                      />

                      <span className="smkl-plan-pill__name">
                        {
                          PLAN_DISPLAY[
                            plan
                          ].name
                        }
                      </span>
                    </button>
                  ),
                )}
              </div>

              {/* ─────────────────────────────────────
                  CODE FORM
                  ───────────────────────────────────── */}

              <form
                className="smkl-form"
                onSubmit={
                  handleSubmit
                }
                noValidate
              >
                <label
                  className="smkl-sr-only"
                  htmlFor={`${modalId}-access-code`}
                >
                  Private access code
                </label>

                <div className="smkl-access-code-shell">
                  <span className="smkl-access-code-shell__prefix">
                    {
                      selectedPlan
                    }
                  </span>

                  <input
                    ref={inputRef}
                    id={`${modalId}-access-code`}
                    type="text"
                    name="access-code"
                    placeholder="XXXX"
                    value={
                      planCodeSuffix
                    }
                    onChange={(
                      event,
                    ) => {
                      const raw =
                        event.target.value
                          .toUpperCase()
                          .replace(
                            /[^A-HJ-NP-Z2-9]/g,
                            "",
                          )
                          .slice(
                            0,
                            4,
                          );

                      onAccessCodeChange(
                        raw
                          ? `${selectedPlan}-${raw}`
                          : `${selectedPlan}-`,
                      );
                    }}
                    autoComplete="off"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={
                      false
                    }
                    maxLength={4}
                    disabled={
                      busy
                    }
                    required
                  />
                </div>

                {accessError && (
                  <p
                    className="smkl-form__error"
                    role="alert"
                  >
                    {
                      accessError
                    }
                  </p>
                )}

                <button
                  type="submit"
                  className={[
                    "smkl-form__submit",
                    "smkl-form__submit--verify",
                    accessLoading
                      ? "is-loading"
                      : "",
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(" ")}
                  disabled={
                    busy
                  }
                >
                  <span>
                    {accessLoading
                      ? "CHECKING..."
                      : "VERIFY ACCESS"}
                  </span>
                </button>
              </form>
            </div>
          )}

          {/* =========================================================
              TELEGRAM PATH
              ========================================================= */}

          {mode === "telegram" && (
            <div className="smkl-access-drawer smkl-access-drawer--telegram">
              <div className="smkl-access-drawer__head">
                <span className="smkl-access-drawer__kicker">
                  TELEGRAM ACCESS
                </span>

                <span className="smkl-access-drawer__state">
                  {step === "access"
                    ? "READY"
                    : telegramAuthorized
                      ? "AUTHORIZED"
                      : "CHECK USER"}
                </span>
              </div>

              {/* ─────────────────────────────────────
                  USERNAME / SPECIAL CODE
                  ───────────────────────────────────── */}

              {step !== "access" && (
                <div className="smkl-telegram-sub-switch">
                  <button
                    type="button"
                    className={[
                      "smkl-telegram-submode",
                      step ===
                      "username"
                        ? "is-active"
                        : "",
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(" ")}
                    onClick={() => {
                      if (busy) return;

                      setStep(
                        "username",
                      );

                      setError(
                        null,
                      );
                    }}
                    disabled={
                      busy
                    }
                  >
                    USERNAME
                  </button>

                  <button
                    type="button"
                    className={[
                      "smkl-telegram-submode",
                      step ===
                      "identity"
                        ? "is-active"
                        : "",
                      telegramAuthorized
                        ? "is-ready"
                        : "",
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(" ")}
                    onClick={() => {
                      if (
                        !telegramAuthorized ||
                        busy
                      ) {
                        return;
                      }

                      setStep(
                        "identity",
                      );

                      setError(
                        null,
                      );

                      setCheckState(
                        "approved",
                      );

                      window.setTimeout(
                        () => {
                          primaryInputRef.current?.focus();
                        },
                        120,
                      );
                    }}
                    disabled={
                      !telegramAuthorized ||
                      busy
                    }
                  >
                    SPECIAL CODE
                  </button>
                </div>
              )}

              {/* =========================================================
                  TELEGRAM · USERNAME
                  ========================================================= */}

              {step === "username" && (
                <form
                  className="smkl-form"
                  onSubmit={
                    handleSubmit
                  }
                  noValidate
                >
                  <label
                    className="smkl-sr-only"
                    htmlFor={`${modalId}-username`}
                  >
                    Telegram username
                  </label>

                  <div className="smkl-username-shell">
                    <span className="smkl-form__icon smkl-form__icon--username">
                      <UserIcon />
                    </span>

                    <span
                      className="smkl-username-at"
                      aria-hidden="true"
                    >
                      @
                    </span>

                    <input
                      ref={
                        primaryInputRef
                      }
                      id={`${modalId}-username`}
                      type="text"
                      name="username"
                      placeholder="user18fx"
                      value={
                        username.replace(
                          /^@/,
                          "",
                        )
                      }
                      onChange={(
                        event,
                      ) => {
                        setUsername(
                          normalizeUsername(
                            event
                              .target
                              .value,
                          ),
                        );

                        setTelegramAuthorized(
                          false,
                        );

                        setStep(
                          "username",
                        );

                        setCheckState(
                          "idle",
                        );

                        setError(
                          null,
                        );
                      }}
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={
                        false
                      }
                      disabled={
                        busy
                      }
                      required
                    />
                  </div>

                  {error && (
                    <p
                      className="smkl-form__error"
                      role="alert"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    className={[
                      "smkl-form__submit",
                      "smkl-form__submit--telegram-check",
                      identityLoading
                        ? "is-loading"
                        : "",
                      checkState ===
                      "approved"
                        ? "is-approved"
                        : "",
                      checkState ===
                      "rejected"
                        ? "is-rejected"
                        : "",
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(" ")}
                    disabled={
                      busy
                    }
                  >
                    <span>
                      {identityLoading
                        ? "CHECKING..."
                        : checkState === "approved"
                          ? "USER AUTHORIZED"
                          : checkState === "rejected"
                            ? "USER REJECTED"
                            : "CHECK USER"}
                    </span>
                  </button>
                </form>
              )}

              {/* =========================================================
                  TELEGRAM · SPECIAL CODE
                  ========================================================= */}

              {step === "identity" && (
                <form
                  className="smkl-form"
                  onSubmit={
                    handleSubmit
                  }
                  noValidate
                >
                  <label
                    className="smkl-sr-only"
                    htmlFor={`${modalId}-identity-code`}
                  >
                    Special identity code
                  </label>

                  <div className="smkl-access-code-shell smkl-access-code-shell--special">
                    <span className="smkl-access-code-shell__prefix">
                      SPCL
                    </span>

                    <input
                      ref={
                        primaryInputRef
                      }
                      id={`${modalId}-identity-code`}
                      type="text"
                      name="identity-code"
                      placeholder="XXXX"
                      value={
                        identitySuffix
                      }
                      onChange={(
                        event,
                      ) => {
                        const raw =
                          event.target.value
                            .toUpperCase()
                            .replace(
                              /[^A-HJ-NP-Z2-9]/g,
                              "",
                            )
                            .slice(
                              0,
                              4,
                            );

                        setIdentityCode(
                          raw
                            ? `SPCL-${raw}`
                            : "",
                        );

                        setError(
                          null,
                        );
                      }}
                      autoComplete="one-time-code"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={
                        false
                      }
                      maxLength={4}
                      disabled={
                        busy
                      }
                      required
                    />
                  </div>

                  {error && (
                    <p
                      className="smkl-form__error"
                      role="alert"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    className={[
                      "smkl-form__submit",
                      "smkl-form__submit--special",
                      identityLoading
                        ? "is-loading"
                        : "",
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(" ")}
                    disabled={
                      busy
                    }
                  >
                    <span>
                      {identityLoading
                        ? "VERIFYING..."
                        : "VERIFY SPECIAL CODE"}
                    </span>
                  </button>
                </form>
              )}

              {/* =========================================================
                  TELEGRAM · PRIVATE ACCESS READY
                  ========================================================= */}

              {step === "access" && (
                <form
                  className="smkl-form"
                  onSubmit={
                    handleSubmit
                  }
                  noValidate
                >
                  <div className="smkl-access-confirmed">
                    <span className="smkl-access-confirmed__dot" />

                    <strong>
                      {username}
                    </strong>

                    <small>
                      PRIVATE ACCESS READY
                    </small>
                  </div>

                  {error && (
                    <p
                      className="smkl-form__error"
                      role="alert"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    className={[
                      "smkl-form__submit",
                      "smkl-form__submit--get-in",
                      privateLoading
                        ? "is-loading"
                        : "",
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(" ")}
                    disabled={
                      busy
                    }
                  >
                    <span>
                      {privateLoading
                        ? "OPENING..."
                        : "GET IN"}
                    </span>
                  </button>
                </form>
              )}
            </div>
          )}
        </section>
      </div>
    </div>,
    document.body,
  );
}