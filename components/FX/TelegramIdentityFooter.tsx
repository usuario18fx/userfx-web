"use client";

import { useEffect, useState, type FormEvent } from "react";
import "./TelegramIdentityFooter.css";

type EligibilityResponse = {
  eligible?: boolean;
  username?: string;
  error?: string;
};

type Props = {
  onVerified: (username: string) => void;
};

const USERNAME_STORAGE_KEY = "userfx_telegram_username";

function normalizeTelegramUsername(value: string) {
  const clean = String(value || "").trim().replace(/^@+/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 32);
  return clean ? `@${clean}` : "";
}

export default function TelegramIdentityFooter({ onVerified }: Props) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setUsername(normalizeTelegramUsername(localStorage.getItem(USERNAME_STORAGE_KEY) || "").replace(/^@/, ""));
    } catch {
      // Private browsing can disable local storage.
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const normalized = normalizeTelegramUsername(username);
    if (!normalized || normalized.length < 6) {
      setError("ENTER A VALID TELEGRAM USERNAME");
      setMessage("");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/telegram-eligibility?username=${encodeURIComponent(normalized)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });
      const result: EligibilityResponse = await response.json().catch(() => ({}));
      if (!response.ok || !result.eligible) {
        throw new Error(result.error || "USERNAME IS NOT ACTIVE IN TELEGRAMFX");
      }

      const verified = normalizeTelegramUsername(result.username || normalized);
      setUsername(verified.replace(/^@/, ""));
      try {
        localStorage.setItem(USERNAME_STORAGE_KEY, verified);
      } catch {
        // No local storage; server verification still succeeds.
      }
      setMessage("USERNAME VERIFIED · CONTINUE TO VAULT");
      onVerified(verified);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "TELEGRAM VERIFICATION FAILED");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="telegram-identity" className="fx-identity-footer" aria-labelledby="fx-identity-title">
      <p className="fx-identity-intro">
        are you a special user? Enter a username, enjoy it!
      </p>
      <div className="fx-identity-panel">
        <header className="fx-identity-heading">
          <span className="fx-identity-pill">
            ·TELEGRAM IDENTITY·
          </span>
          <strong id="fx-identity-title">
            ENTER YOUR USERNAME
          </strong>
        </header>
        <form className="fx-identity-form" onSubmit={handleSubmit}>
          <span className="fx-identity-icon" aria-hidden="true">
            <img src="/assets/iconos/telegram.png" alt="" />
          </span>
          <span className="fx-identity-at" aria-hidden="true">
            @
          </span>
          <input type="text" value={username} onChange={(event) => { setUsername(event.target.value); setError(""); setMessage(""); }} placeholder="username" maxLength={32} autoCapitalize="none" autoCorrect="off" autoComplete="username" spellCheck={false} required disabled={loading} aria-label="Telegram username" />
          <button type="submit" disabled={loading}>
            {loading ? "CHECKING…" : "VERIFY USER"}
          </button>
        </form>
        {error && (
          <p className="fx-identity-feedback is-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="fx-identity-feedback" role="status">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
