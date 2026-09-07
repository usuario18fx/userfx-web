import { FormEvent, useEffect, useRef, useState,} from "react";
import { createPortal } from "react-dom";
import "./SmokelandiaAccessModal.css";

type AccessCredentials = {name: string;
                         email: string;
                         password: string;
};
type FxAccessModalProps = { id?: string;  
                            open: boolean; onClose: () => void; onSubmit?: (
                            credentials: AccessCredentials,
  ) => void | Promise<void>;
  };
function RoseIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 52C18 52 9 43 11 30c2-12 11-20 21-20s19 8 21 20c2 13-7 22-21 22Z" />
      <path d="M32 45c-9 0-15-6-14-15 1-7 7-13 14-13s13 6 14 13c1 9-5 15-14 15Z" />
      <path d="M32 39c-6 0-10-4-9-10 1-5 5-8 9-8s8 3 9 8c1 6-3 10-9 10Z" />
      <path d="M32 34c-3 0-6-3-6-6s3-6 6-6 6 3 6 6-3 6-6 6Z" />
      <path d="M12 28c8 0 13 3 17 9M52 28c-8 0-13 3-17 9M19 15c2 8 7 12 13 15M45 15c-2 8-7 12-13 15" />
    </svg>
  );
  }
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
  }
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 7 8 6 8-6" />
    </svg>
  );
  }
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="10" width="14" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </svg>
  );
  }
function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
      {hidden && <path d="m4 4 16 16" />}
    </svg>
  );
  }
export function FxAccessModal({
  id = "Fx-access-modal",
  open,
  onClose,
  onSubmit,
}: FxAccessModalProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] =
    useState<AccessCredentials>({
      name: "",
      email: "",
      password: "",
    });
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 450);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!onSubmit || loading) return;

    try {
      setLoading(true);
      await onSubmit(credentials);
    } finally {
      setLoading(false);
    }};
  if (!open || typeof document === "undefined") return null;
  return createPortal(
        <div className="smkl-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose();}}  >
        <div className="smkl-modal__backdrop" />
        <div className="smkl-modal__stage" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} id={id} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="smkl-modal__close" onClick={onClose}  aria-label="Cerrar acceso">
        <span />
        <span />
        </button>
        <header className="smkl-modal__brand">
          <div className="smkl-modal__brand-line" />
          <RoseIcon className="smkl-modal__brand-rose" />
          <div className="smkl-modal__brand-line" />
          <strong>SMOKELANDIA</strong>
        </header>
        <div className="smkl-modal__bubble">
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
          <div  className="smkl-robot__hand smkl-robot__hand--left" aria-hidden="true" >
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="smkl-robot__hand smkl-robot__hand--right" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <RoseIcon className="smkl-panel__rose" />
          <h2 id={`${id}-title`}>
           Who’s coming in?
          </h2>
          <div className="smkl-panel__divider">
            <span />
            <RoseIcon />
            <span />
          </div>
          <form className="smkl-form" onSubmit={handleSubmit}>
            <label className="smkl-form__field">
              <span className="smkl-form__icon">
                <UserIcon />
              </span>
              <span className="smkl-sr-only">
                Tu nombre
              </span>
              <input ref={nameInputRef} type="text" name="name" placeholder="Tu nombre" value={credentials.name} onChange={(event) => setCredentials((current) => ({ ...current,  name: event.target.value, }))} autoComplete="name" required/>
            </label>
            <label className="smkl-form__field">
              <span className="smkl-form__icon">
                <MailIcon />
              </span>
              <span className="smkl-sr-only">
                Tu correo
              </span>
              <input type="email" name="email" placeholder="Tu correo" value={credentials.email}  onChange={(event) =>
               setCredentials((current) => ({  ...current, email: event.target.value,}))} autoComplete="email" required/>
            </label>
            <label className="smkl-form__field">
              <span className="smkl-form__icon">
              <LockIcon />
              </span>
              <span className="smkl-sr-only">
                Contraseña
              </span>
              <input type={showPassword ? "text" : "password"} name="password" placeholder="Contraseña" value={credentials.password} onChange={(event) =>setCredentials((current) => ({...current, password: event.target.value, }))} autoComplete="current-password" required/>
              <button type="button"className="smkl-form__password-toggle" onClick={() =>setShowPassword((current) => !current)} aria-label={showPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"}>
                <EyeIcon hidden={showPassword} />
              </button>
            </label>
            <button type="submit" className="smkl-form__submit" disabled={loading}>
              <span>
                {loading ? "VERIFICANDO..." : "ENTRAR"}
              </span>
            </button>
          </form>
        </section>
      </div>
    </div>,
    document.body,
  );
}