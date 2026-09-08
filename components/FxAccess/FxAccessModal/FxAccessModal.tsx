import {
  FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import "./FxAccessModal.css";

type AccessCredentials = {
  name: string;
  email: string;
  password: string;
};

type FxAccessModalProps = {
  id?: string;
  open: boolean;
  onClose: () => void;
  onSubmit?: (
    credentials: AccessCredentials,
  ) => void | Promise<void>;
};

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

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
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

function EyeIcon({ slashed }: { slashed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
      {slashed && <path d="m4 4 16 16" />}
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
  onSubmit,
}: FxAccessModalProps) {
  const generatedId = useId();
  const modalId =
    id ?? `fx-access-modal-${generatedId.replace(/[^a-zA-Z0-9]/g, "")}`;

  const stageRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const loadingRef = useRef(false);
  const onCloseRef = useRef(onClose);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<AccessCredentials>({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) return;
    setShowPassword(false);
    setLoading(false);
    setError(null);
    setCredentials((current) => ({ ...current, password: "" }));
  }, [open]);

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

    const focusTimer = window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 150);

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
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      previouslyFocusedElement.current?.focus();
    };
  }, [open]);

  const updateCredential = (
    field: keyof AccessCredentials,
    value: string,
  ) => {
    setCredentials((current) => ({ ...current, [field]: value }));
    if (error) setError(null);
  };

  const handleClose = () => {
    if (!loading) onCloseRef.current();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onSubmit || loading) return;

    const name = credentials.name.trim();
    const email = credentials.email.trim().toLowerCase();

    if (!name) {
      setError("Escribe tu nombre para continuar.");
      nameInputRef.current?.focus();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({ name, email, password: credentials.password });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error && submissionError.message
          ? submissionError.message
          : "Acceso denegado. Revisa tus datos e inténtalo de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="smkl-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div className="smkl-modal__backdrop" />

      <div
        ref={stageRef}
        className="smkl-modal__stage"
        id={modalId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${modalId}-title`}
        aria-describedby={`${modalId}-desc`}
        aria-busy={loading}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="smkl-modal__close"
          onClick={handleClose}
          aria-label="Cerrar acceso"
          disabled={loading}
        >
          <span />
          <span />
        </button>

        <header className="smkl-modal__brand">
          <div className="smkl-modal__brand-line" />
          <RoseIcon className="smkl-modal__brand-rose" />
          <div className="smkl-modal__brand-line" />
          <strong>fx</strong>
        </header>

        <div className="smkl-modal__bubble" id={`${modalId}-desc`}>
          Acceso privado. Identifícate.
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

          <RoseIcon className="smkl-panel__rose" />

          <h2 id={`${modalId}-title`}>¿QUIÉN ENTRA?</h2>

          <div className="smkl-panel__divider" aria-hidden="true">
            <span />
            <RoseIcon />
            <span />
          </div>

          <form className="smkl-form" onSubmit={handleSubmit}>
            <div className="smkl-form__field">
              <span className="smkl-form__icon">
                <UserIcon />
              </span>

              <label
                className="smkl-sr-only"
                htmlFor={`${modalId}-name`}
              >
                Tu nombre
              </label>

              <input
                ref={nameInputRef}
                id={`${modalId}-name`}
                type="text"
                name="name"
                placeholder="Tu nombre"
                value={credentials.name}
                onChange={(event) =>
                  updateCredential("name", event.target.value)
                }
                autoComplete="name"
                disabled={loading}
                required
              />
            </div>

            <div className="smkl-form__field">
              <span className="smkl-form__icon">
                <MailIcon />
              </span>

              <label
                className="smkl-sr-only"
                htmlFor={`${modalId}-email`}
              >
                Tu correo electrónico
              </label>

                          <input
                id={`${modalId}-email`}
                type="email"
                name="email"
                placeholder="Tu correo"
                value={credentials.email}
                onChange={(event) =>
                  updateCredential("email", event.target.value)
                }
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                disabled={loading}
                required
              />
            </div>

            <div className="smkl-form__field">
              <span className="smkl-form__icon">
                <LockIcon />
              </span>

              <label
                className="smkl-sr-only"
                htmlFor={`${modalId}-password`}
              >
                Contraseña
              </label>

              <input
                id={`${modalId}-password`}
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Contraseña"
                value={credentials.password}
                onChange={(event) =>
                  updateCredential("password", event.target.value)
                }
                autoComplete="current-password"
                disabled={loading}
                required
              />

              <button
                type="button"
                className="smkl-form__password-toggle"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                aria-label={
                  showPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                aria-pressed={showPassword}
                disabled={loading}
              >
                <EyeIcon slashed={!showPassword} />
              </button>
            </div>

            {error && (
              <p
                className="smkl-form__error"
                id={`${modalId}-error`}
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className={`smkl-form__submit${loading ? " is-loading" : ""}`}
              disabled={loading || !onSubmit}
            >
              <span>{loading ? "VERIFICANDO..." : "ENTRAR"}</span>
            </button>
          </form>
        </section>
      </div>
    </div>,
    document.body,
  );
}