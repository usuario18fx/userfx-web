"use client";

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import "./VaultActions.css";
import "./VaultMobileCenter.css";
import "./VaultIdentity.css";

import { FxAccessBtn } from "../FxAccess/FxAccessBtn";
import { FxAccessModal } from "../FxAccess/FxAccessModal/FxAccessModal";

type VaultActionsProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onGetCode: () => void;
  loading?: boolean;
  error?: string;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

const USERNAME_COOKIE = "userfx_telegram_username";

const IconKey = () => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="8" cy="15" r="4" />
    <path d="M10.8 12.2 20 3M17 6l2.5 2.5M14.5 8.5 17 11" />
  </svg>
);

const Spinner = ({
  size = 18,
}: {
  size?: number;
}) => (
  <svg
    className="va-spin"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" opacity=".22" />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      strokeLinecap="round"
    />
  </svg>
);

function normalizeUsername(value: string) {
  const clean = String(value || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/[^A-Za-z0-9_]/g, "")
    .slice(0, 32);

  return clean ? `@${clean}` : "";
}

export default function VaultActions({
  value,
  onChange,
  onSubmit,
  onGetCode,
  loading = false,
  error = "",
  placeholder = "BSIC-CODE",
  inputRef,
}: VaultActionsProps) {
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");

  const [fxAccessOpen, setFxAccessOpen] =
    useState(false);

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(USERNAME_COOKIE) || "";

      if (saved) {
        setUsername(normalizeUsername(saved));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const ripple = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const btn = e.currentTarget;
      const rect = btn.getBoundingClientRect();

      const diameter =
        Math.max(rect.width, rect.height) * 1.15;

      const span = document.createElement("span");

      span.className = "va-ripple";

      span.style.cssText = `
        width:${diameter}px;
        height:${diameter}px;
        left:${e.clientX - rect.left - diameter / 2}px;
        top:${e.clientY - rect.top - diameter / 2}px;
      `;

      btn.appendChild(span);

      span.addEventListener(
        "animationend",
        () => span.remove()
      );
    },
    []
  );

  const handleUsernameChange = (raw: string) => {
    const normalized = normalizeUsername(raw);

    setUsername(normalized);
    setUsernameError("");
  };

  const handleSubmit = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    const normalized = normalizeUsername(username);

    const usernameBody =
      normalized.replace(/^@/, "");

    if (
      !/^[A-Za-z0-9_]{3,32}$/.test(usernameBody)
    ) {
      e.preventDefault();

      setUsernameError(
        "ENTER YOUR TELEGRAM @USERNAME"
      );

      return;
    }

    setUsername(normalized);
    setUsernameError("");

    try {
      localStorage.setItem(
        USERNAME_COOKIE,
        normalized
      );

      document.cookie =
        `${USERNAME_COOKIE}=` +
        `${encodeURIComponent(normalized)}; ` +
        `Path=/; SameSite=Lax; Max-Age=2592000`;
    } catch {
      // continue verification
    }

    onSubmit(e);
  };

  const visibleError =
    usernameError || error;

  return (
    <>
      {/* =====================================================
          FX ACCESS BUTTON
          ===================================================== */}
      <div className="fx-access-launcher">
        <FxAccessBtn
          onOpen={() => setFxAccessOpen(true)}
          disabled={loading}
        />
      </div>

      {/* =====================================================
          FX ACCESS MODAL
          ===================================================== */}
      <FxAccessModal
        id="fx-access-modal"
        open={fxAccessOpen}
        onClose={() => setFxAccessOpen(false)}
      />

      {/* =====================================================
          VAULT ACCESS FORM
          ===================================================== */}
      <form
        className="va"
        onSubmit={handleSubmit}
        noValidate
      >
        {/* TELEGRAM USERNAME */}
        <div className="va-identity">
          <label
            className="va-identity__label"
            htmlFor="vault-telegram-username"
          >
            TELEGRAM USERNAME
          </label>

          <div
            className={
              `va-identity__shell${
                usernameError ? " is-error" : ""
              }`
            }
          >
            <span
              className="va-identity__at"
              aria-hidden="true"
            >
              @
            </span>

            <input
              id="vault-telegram-username"
              className="va-identity__input"
              type="text"
              inputMode="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(e) =>
                handleUsernameChange(e.target.value)
              }
              placeholder="username"
              disabled={loading}
              aria-label="Telegram username"
            />
          </div>
        </div>

        {/* GET CODE + ACCESS CODE */}
        <div className="va__row">
          <button
            type="button"
            className="va-btn va-btn--ghost"
            onClick={(e) => {
              ripple(e);
              onGetCode();
            }}
            disabled={loading}
            aria-busy={loading}
          >
            <span
              className="va-btn__shimmer"
              aria-hidden="true"
            />

            {loading ? (
              <Spinner />
            ) : (
              <IconKey />
            )}

            <span className="va-btn__label">
              Get my code
            </span>
          </button>

          <div className="va-modernField">
            <span className="va-modernField__label">
              ACCESS CODE
            </span>

            <div className="va-modernField__shell">
              <span
                className="
                  va-modernField__rail
                  va-modernField__rail--left
                "
                aria-hidden="true"
              />

              <div
                className="va-terminal"
                aria-hidden="true"
              >
                {Array.from({
                  length: 9,
                }).map((_, index) => {
                  const char =
                    value[index] || "";

                  return (
                    <span
                      key={index}
                      className={
                        `va-terminalCell${
                          char
                            ? " is-filled"
                            : ""
                        }`
                      }
                    >
                      {char ||
                        (index === 4
                          ? "-"
                          : "")}
                    </span>
                  );
                })}
              </div>

              <span
                className="
                  va-modernField__rail
                  va-modernField__rail--right
                "
                aria-hidden="true"
              />

              <input
                ref={inputRef}
                className="
                  va-field__input
                  va-field__input--terminal
                "
                type="text"
                inputMode="text"
                enterKeyHint="go"
                value={value}
                onChange={(e) =>
                  onChange(
                    e.target.value.toUpperCase()
                  )
                }
                placeholder={placeholder}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                autoCapitalize="characters"
                maxLength={9}
                disabled={loading}
                aria-label="Access code"
              />
            </div>
          </div>
        </div>

        {/* SUBMIT INVISIBLE */}
        <button
          type="submit"
          className="va-submitGhost"
          tabIndex={-1}
          aria-hidden="true"
        >
          Verify access
        </button>

        {/* ERROR */}
        <p
          id="va-error"
          className={
            `va-error${
              visibleError
                ? " is-visible"
                : ""
            }`
          }
          role="alert"
        >
          {visibleError}
        </p>
      </form>
    </>
  );
}