"use client";

import React, { useCallback } from "react";
import "./VaultActions.css";
import "./VaultMobileCenter.css";

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

const MAX = 9;

const IconKey = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
       stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="8" cy="15" r="4" />
    <path d="M10.8 12.2 20 3M17 6l2.5 2.5M14.5 8.5 17 11" />
  </svg>
);

const Spinner = ({ size = 18 }: { size?: number }) => (
  <svg className="va-spin" viewBox="0 0 24 24" width={size} height={size}
       fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
    <circle cx="12" cy="12" r="9" opacity=".22" />
    <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
  </svg>
);

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

  const ripple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const r = btn.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 1.15;
    const span = document.createElement("span");
    span.className = "va-ripple";
    span.style.cssText =
      `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    btn.appendChild(span);
    span.addEventListener("animationend", () => span.remove());
  }, []);

  return (
    <div className="va">
      <div className="va__row">
        {/* ═══ GET MY CODE ═══ */}
        <button
          type="button"
          className="va-btn va-btn--ghost"
          onClick={(e) => { ripple(e); onGetCode(); }}
          disabled={loading}
          aria-busy={loading}
        >
          <span className="va-btn__shimmer" aria-hidden="true" />
          {loading ? <Spinner /> : <IconKey />}
          <span className="va-btn__label">Get my code</span>
        </button>

        {/* ═══ INPUT 02 — MODERN FRAME ═══ */}
        <div className="va-modernField">
          <span className="va-modernField__label">ACCESS CODE</span>
          <div className="va-modernField__shell">
            <span className="va-modernField__rail va-modernField__rail--left" aria-hidden="true" />
            <div className="va-terminal">
              {Array.from({ length: 9 }).map((_, index) => {
                const char = value[index] || "";
                return (
                  <span
                    key={index}
                    className={`va-terminalCell${char ? " is-filled" : ""}`}
                  >
                    {char || (index === 4 ? "-" : "")}
                  </span>
                );
              })}
            </div>
            <span className="va-modernField__rail va-modernField__rail--right" aria-hidden="true" />
            <input
              ref={inputRef}
              className="va-field__input va-field__input--terminal"
              type="text"
              inputMode="text"
              value={value}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
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

      <p id="va-error" className={`va-error${error ? " is-visible" : ""}`} role="alert">
        {error}
      </p>
    </div>
  );
}
