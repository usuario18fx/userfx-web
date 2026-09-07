import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
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

export function FxAccessModal({
  id = "fx-access-modal",
  open,
  onClose,
  onSubmit,
}: FxAccessModalProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<AccessCredentials>({
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
    }, 300);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onSubmit || loading) return;

    try {
      setLoading(true);
      await onSubmit(credentials);
    } finally {
      setLoading(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="smkl-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="smkl-modal__artwork"
        role="dialog"
        aria-modal="true"
        aria-label="Acceso privado Smokelandia"
        id={id}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <img
          className="smkl-modal__image"
          src="/assets/iconos/rosa.png"
          alt=""
          aria-hidden="true"
          draggable={false}
        />

        <button
          type="button"
          className="smkl-modal__close"
          onClick={onClose}
          aria-label="Cerrar acceso"
        >
          ×
        </button>

        <form className="smkl-modal__form" onSubmit={handleSubmit}>
          <label className="smkl-modal__field smkl-modal__field--name">
            <span className="smkl-sr-only">Tu nombre</span>
            <input
              ref={nameInputRef}
              type="text"
              name="name"
              value={credentials.name}
              onChange={(event) =>
                setCredentials((current) => ({ ...current, name: event.target.value }))
              }
              autoComplete="name"
              placeholder="Tu nombre"
              required
            />
          </label>

          <label className="smkl-modal__field smkl-modal__field--email">
            <span className="smkl-sr-only">Tu correo</span>
            <input
              type="email"
              name="email"
              value={credentials.email}
              onChange={(event) =>
                setCredentials((current) => ({ ...current, email: event.target.value }))
              }
              autoComplete="email"
              placeholder="Tu correo"
              required
            />
          </label>

          <label className="smkl-modal__field smkl-modal__field--password">
            <span className="smkl-sr-only">Contraseña</span>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={credentials.password}
              onChange={(event) =>
                setCredentials((current) => ({ ...current, password: event.target.value }))
              }
              autoComplete="current-password"
              placeholder="Contraseña"
              required
            />
            <button
              type="button"
              className="smkl-modal__eye"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              ◉
            </button>
          </label>

          <button
            type="submit"
            className="smkl-modal__submit"
            disabled={loading}
            aria-label="Entrar"
          >
            <span>{loading ? "VERIFICANDO..." : "ENTRAR"}</span>
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
