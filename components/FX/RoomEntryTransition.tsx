"use client";
import { useEffect, useState, type FormEvent } from "react";
import "./RoomEntryTransition.css";

type Session = { authenticated?: boolean; telegramUsername?: string; accessMode?: string; planId?: string; error?: string };
type Identity = { verified?: boolean; username?: string; error?: string };
const normalizeUsername = (value: string) => value.trim().replace(/^@+/, "").toLowerCase();
const normalizeCode = (value: string) => value.trim().toUpperCase().replace(/^SPCL-?/, "").replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 4);

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json", ...options.headers },
  });
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Couldn't verify your private access. Try again.");
  return data;
}

export default function RoomEntryTransition({ username, onClose }: { username: string; onClose: () => void }) {
  const [phase, setPhase] = useState<"preparing" | "identity">("preparing");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const normalized = normalizeUsername(username);
    async function prepare() {
      try {
        // Eligibility is not proof of Telegram ownership. Trust server sessions only.
        const access = await requestJson<Session>("/api/access-session");
        if (cancelled) return;
        if (access.authenticated && (!access.telegramUsername || normalizeUsername(access.telegramUsername) === normalized)) {
          window.location.hash = "#/private-room";
          return;
        }
        const identity = await requestJson<Identity>("/api/identity");
        if (cancelled) return;
        if (identity.verified && identity.username && normalizeUsername(identity.username) === normalized) {
          const created = await requestJson<Session>("/api/access-session", { method: "POST" });
          if (cancelled) return;
          if (created.authenticated && normalizeUsername(created.telegramUsername || "") === normalized) {
            window.location.hash = "#/private-room";
            return;
          }
        }
      } catch {
        // Unauthenticated; request the SPCL identity key without another username dialog.
      }
      if (!cancelled) setPhase("identity");
    }
    void prepare();
    return () => { cancelled = true; };
  }, [username]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  async function verifyIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || code.length !== 4) return;
    setSubmitting(true);
    setError("");
    try {
      const identity = await requestJson<Identity>("/api/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, code: `SPCL-${code}` }),
      });
      if (!identity.verified || normalizeUsername(identity.username || "") !== normalizeUsername(username)) {
        throw new Error("That identity key wasn't verified.");
      }
      const session = await requestJson<Session>("/api/access-session", { method: "POST" });
      if (!session.authenticated || normalizeUsername(session.telegramUsername || "") !== normalizeUsername(username)) {
        throw new Error("Your private session could not be confirmed.");
      }
      try {
        sessionStorage.setItem("vault_unlocked", "true");
        sessionStorage.setItem("vault_plan", session.planId || "vip");
        sessionStorage.setItem("userfx_access_code", `SPCL-${code}`);
      } catch {
        // The authenticated server cookie is authoritative.
      }
      setPhase("preparing");
      window.location.hash = "#/private-room";
    } catch (reason) {
      setCode("");
      setError(reason instanceof Error ? reason.message : "Identity verification failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fx-room-entry-scrim" role="dialog" aria-modal="true" aria-label="Private room entry">
      <section className="fx-room-entry-card">
        <button type="button" className="fx-room-entry-close" onClick={onClose} aria-label="Close room entry">×</button>
        <div className="fx-room-entry-crown" aria-hidden="true">♛</div>
        <span className="fx-room-entry-kicker">USER FX · PRIVATE ROOM</span>
        {phase === "preparing" ? (
          <div className="fx-room-entry-loading" role="status" aria-live="polite">
            <span className="fx-room-entry-spinner" aria-hidden="true" />
            <h2>ᴘʀᴇᴘᴀʀɪɴɢ ʏᴏᴜʀ ʀᴏᴏᴍ…</h2>
            <p>Getting your private space ready.</p>
          </div>
        ) : (
          <>
            <h2>One last identity check.</h2>
            <p className="fx-room-entry-description">
              {username} is eligible. To protect your room, confirm it's really you with your one-time Telegram identity key.
            </p>
            <form onSubmit={verifyIdentity} className="fx-room-entry-form">
              <label htmlFor="fx-room-entry-code">SPECIAL IDENTITY KEY</label>
              <div className="fx-room-entry-input-wrap">
                <span>SPCL-</span>
                <input id="fx-room-entry-code" autoFocus value={code} onChange={(event) => { setCode(normalizeCode(event.target.value)); setError(""); }} placeholder="CODE" maxLength={9} autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} aria-label="Special identity code" disabled={submitting} />
              </div>
              {error && <p className="fx-room-entry-error" role="alert">{error}</p>}
              <button type="submit" disabled={submitting || code.length !== 4}>{submitting ? "VERIFYING…" : "VERIFY & ENTER"}</button>
            </form>
            <a href="https://t.me/User18Fx_bot?start=identity" target="_blank" rel="noopener noreferrer" className="fx-room-entry-telegram">
              Get my identity key on Telegram ↗
            </a>
          </>
        )}
      </section>
    </div>
  );
}
