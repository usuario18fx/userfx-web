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
  instanceId?: string;
};

const USERNAME_STORAGE_KEY = "userfx_telegram_username";

function normalizeTelegramUsername(value: string) {
  const clean = String(value || "").trim().replace(/^@+/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 32);
  return clean ? `@${clean}` : "";
}

export default function TelegramIdentityFooter({ onVerified, instanceId = "telegram-identity" }: Props) {
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
      setMessage("USERNAME ELIGIBLE · ENTER YOUR ACCESS CODE");
      onVerified(verified);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "TELEGRAM VERIFICATION FAILED");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id={instanceId} className="fx-identity-footer" aria-labelledby={`${instanceId}-title`}>
      <p className="fx-identity-intro">
        Are you a special user? Enter a username, enjoy it!
      </p>
      <div className="mx-auto w-full max-w-[720px] rounded-xl border border-cyan-400/40 bg-black/70 px-4 py-5 backdrop-blur-md">
  <div className="mb-4 text-center text-[12px] tracking-[0.22em] text-cyan-300">??????????????????? ??????????????????</div>
  <div className="grid grid-cols-2 gap-3">
    <a href="https://t.me/User18Fx_bot?start=getcode" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-cyan-400/60 bg-cyan-500/15 p-4 text-center text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/25">???????? ????????????</a>
    <a href="/vault" className="rounded-lg border border-white/30 bg-white/5 p-4 text-center text-sm font-semibold text-white transition hover:bg-white/10">???????? ????????????</a>
  </div>
</div>
    </section>
  );
}
