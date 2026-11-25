"use client";

import { useRef, useState, type FormEvent } from "react";
import { PLANS } from "@/lib/content";
import "./CodeAccessFooter.css";

type AccessMode = "telegram" | "paid" | "plans";
type PaidPrefix = "BSIC" | "PRX0" | "VIPX";
type Props = { onEnterCode: () => void; onGetCode: () => void };
const MAX_ATTEMPTS = 5;
const cleanSuffix = (value: string) =>
  value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 4);
async function json(response: Response): Promise<{ [key: string]: any }> {
  return response.json().catch(() => ({}));
}

export default function CodeAccessFooter({ onEnterCode, onGetCode }: Props) {
  const [mode, setMode] = useState<AccessMode>("telegram");
  const [username, setUsername] = useState("");
  const [telegramChecked, setTelegramChecked] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState("");
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [spcl, setSpcl] = useState("");
  const [spclBusy, setSpclBusy] = useState(false);
  const [prefix, setPrefix] = useState<PaidPrefix>("BSIC");
  const [suffix, setSuffix] = useState("");
  const [paidBusy, setPaidBusy] = useState(false);
  const [paidMessage, setPaidMessage] = useState("");
  const [attempts, setAttempts] = useState(0);
  const paidRef = useRef<HTMLInputElement>(null);

  function selectPlan(id: string) {
    const selected: PaidPrefix = id === "pro" ? "PRX0" : id === "vip" ? "VIPX" : "BSIC";
    setPrefix(selected);
    setSuffix("");
    setPaidMessage("");
    setMode("paid");
    window.setTimeout(() => paidRef.current?.focus(), 0);
  }

  function completeAccess(code: string, plan?: string) {
    try {
      sessionStorage.setItem("vault_unlocked", "true");
      sessionStorage.setItem("userfx_access_code", code);
      if (plan) sessionStorage.setItem("vault_plan", plan);
      if (!code.startsWith("SPCL-")) localStorage.setItem("vault_saved_code", code);
    } catch {
      // Server-authenticated session is authoritative.
    }
    window.location.hash = "#/private-room";
  }

  async function verifyTelegram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (telegramBusy) return;
    const clean = username.trim().replace(/^@+/, "");
    if (!/^[A-Za-z0-9_]{5,32}$/.test(clean)) {
      setTelegramMessage("ENTER A VALID TELEGRAM USERNAME");
      return;
    }
    setTelegramBusy(true);
    setTelegramChecked(false);
    setTelegramMessage("");
    setSpcl("");
    try {
      const response = await fetch("/api/telegram-eligibility?username=" + encodeURIComponent("@" + clean), {
        method: "GET", credentials: "same-origin", cache: "no-store",
        headers: { Accept: "application/json" }
      });
      const result = await json(response);
      if (!response.ok || result.eligible !== true)
        throw new Error(result.error || "TELEGRAM USERNAME NOT ELIGIBLE");
      setUsername(String(result.username || clean).replace(/^@+/, ""));
      setTelegramChecked(true);
      setTelegramMessage("USERNAME CHECKED · ENTER YOUR SPCL CODE");
      try { localStorage.setItem("userfx_telegram_username", "@" + clean); } catch {}
    } catch (error) {
      setTelegramMessage(error instanceof Error ? error.message : "TELEGRAM CHECK FAILED");
    } finally {
      setTelegramBusy(false);
    }
  }

  async function verifySpcl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!telegramChecked || spclBusy || spcl.length !== 4) return;
    setSpclBusy(true);
    setTelegramMessage("");
    try {
      const code = "SPCL-" + spcl;
      const response = await fetch("/api/identity", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username: "@" + username.replace(/^@+/, ""), code })
      });
      const result = await json(response);
      if (!response.ok || result.verified !== true)
        throw new Error(result.error || "IDENTITY VERIFICATION FAILED");
      const sessionResponse = await fetch("/api/access-session", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { Accept: "application/json" }
      });
      const session = await json(sessionResponse);
      if (!sessionResponse.ok || session.authenticated !== true)
        throw new Error(session.error || "PRIVATE SESSION NOT CREATED");
      completeAccess(code, "vip");
    } catch (error) {
      setSpcl("");
      setTelegramMessage(error instanceof Error ? error.message : "SIGN-IN FAILED");
    } finally {
      setSpclBusy(false);
    }
  }

  async function verifyPaid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (paidBusy || attempts >= MAX_ATTEMPTS || suffix.length !== 4) return;
    setPaidBusy(true);
    setPaidMessage("");
    try {
      const response = await fetch("/api/verify", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ prefix, suffix })
      });
      const result = await json(response);
      if (!response.ok || result.ok !== true) {
        setAttempts((count) => count + 1);
        setSuffix("");
        throw new Error(result.error || "ACCESS CODE NOT VALID");
      }
      const sessionResponse = await fetch("/api/access-session", {
        method: "GET", credentials: "same-origin", cache: "no-store",
        headers: { Accept: "application/json" }
      });
      const session = await json(sessionResponse);
      if (!sessionResponse.ok || session.authenticated !== true)
        throw new Error(session.error || "PRIVATE SESSION NOT CONFIRMED");
      completeAccess(prefix + "-" + suffix, typeof result.planId === "string" ? result.planId : undefined);
    } catch (error) {
      setPaidMessage(error instanceof Error ? error.message : "CODE CHECK FAILED");
    } finally {
      setPaidBusy(false);
    }
  }

  return (
    <section className="fx-code-access-section" aria-labelledby="fx-code-access-title">
      <div className="fx-code-access-panel">
        <aside className="fx-code-access-cinema" aria-label="USER FX private room">
          <video src="/assets/FX-Y24V01.mp4" poster="/wallpaperVideo.png"
            autoPlay loop muted playsInline preload="metadata" aria-hidden="true" />
          <div className="fx-code-access-cinema-shade" aria-hidden="true" />
          <img className="fx-code-access-lock" src="/assets/room-priv-user-lock.webp" alt="" />
          <div className="fx-code-access-cinema-copy">
            <strong>USER FX</strong><span>PRIVATE ROOM</span>
            <em>A private world.<br />Entirely yours.</em>
          </div>
        </aside>

        <div className="fx-code-access-content">
          <p className="fx-code-access-eyebrow">USER FX / PRIVATE ACCESS</p>
          <h2 id="fx-code-access-title">
            {mode === "telegram" ? "YOUR TELEGRAM IDENTITY." : mode === "paid" ? "YOUR PRIVATE CODE." : "CHOOSE YOUR ACCESS."}
          </h2>
          <p className="fx-code-access-description">
            {mode === "telegram" ? "Confirm your Telegram identity to continue to your private room."
              : mode === "paid" ? "Enter the code received after your Telegram Stars payment."
              : "BASIC, PRO or VIP. Choose your membership to get a private code."}
          </p>

          <div className="fx-code-access-actions" role="group" aria-label="Access method">
            <button type="button" className={"fx-code-access-choice" + (mode === "telegram" ? " is-active" : "")}
              aria-pressed={mode === "telegram"} onClick={() => setMode("telegram")}>
              <span className="fx-code-access-index">01</span>
              <img src="/assets/iconos/telegram.png" alt="" />
              <span><strong>TELEGRAM</strong><small>IDENTITY ACCESS</small></span>
            </button>
            <button type="button" className={"fx-code-access-choice fx-code-access-choice-paid" + (mode === "paid" ? " is-active" : "")}
              aria-pressed={mode === "paid"} onClick={() => setMode("paid")}>
              <span className="fx-code-access-index">02</span>
              <span className="fx-code-access-coin" aria-hidden="true">✪</span>
              <span><strong>GOT CODE</strong><small>PAID ACCESS</small></span>
            </button>
          </div>
          <button className={"fx-code-access-get-link" + (mode === "plans" ? " is-active" : "")}
            type="button" aria-pressed={mode === "plans"} onClick={() => setMode("plans")}>
            GET CODE <span aria-hidden="true">↗</span>
          </button>

          <div className="fx-code-access-mode">
            {mode === "telegram" && (
              <div className="fx-code-access-telegram">
                <div className="fx-code-access-zone-header">
                  <img src="/assets/iconos/telegram.png" alt="" />
                  <div><strong>TELEGRAM IDENTITY</strong><small>USERNAME + SPCL CODE</small></div>
                </div>
                <form onSubmit={verifyTelegram} className="fx-code-access-form">
                  <label htmlFor="fx-ca-username">YOUR TELEGRAM USERNAME</label>
                  <div className="fx-code-access-field">
                    <span aria-hidden="true">@</span>
                    <input id="fx-ca-username" value={username} maxLength={32} placeholder="username"
                      autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                      onChange={(event) => { setUsername(event.target.value.replace(/^@+/, "")); setTelegramChecked(false); setTelegramMessage(""); }}
                      disabled={telegramBusy || spclBusy} required />
                    <button type="submit" disabled={telegramBusy || spclBusy}>{telegramBusy ? "CHECKING…" : "VERIFY"}</button>
                  </div>
                </form>
                {telegramMessage && <p role="status" className={"fx-code-access-feedback" + (telegramChecked ? " is-success" : "")}>{telegramMessage}</p>}
                {telegramChecked && (
                  <form onSubmit={verifySpcl} className="fx-code-access-form fx-code-access-spcl-form">
                    <label htmlFor="fx-ca-spcl">COMPLETE YOUR SPCL SIGN-IN</label>
                    <div className="fx-code-access-field">
                      <span className="fx-code-access-prefix">SPCL —</span>
                      <input id="fx-ca-spcl" value={spcl} maxLength={4} autoComplete="off" placeholder="4 CHARACTERS"
                        onChange={(event) => setSpcl(cleanSuffix(event.target.value))} disabled={spclBusy} required />
                      <button type="submit" disabled={spclBusy || spcl.length !== 4}>{spclBusy ? "CHECKING…" : "SIGN IN"}</button>
                    </div>
                  </form>
                )}
                <a className="fx-code-access-support" href="https://t.me/User18Fx_bot?start=identity"
                  target="_blank" rel="noopener noreferrer">NEED ACCESS? OPEN TELEGRAM BOT ↗</a>
              </div>
            )}
            {mode === "paid" && (
              <div className="fx-code-access-paid">
                <div className="fx-code-access-zone-header">
                  <span className="fx-code-access-paid-emblem">✪</span>
                  <div><strong>PAID ACCESS CODE</strong><small>TELEGRAM STARS · PRIVATE CHECKOUT</small></div>
                </div>
                <form onSubmit={verifyPaid} className="fx-code-access-form">
                  <label htmlFor="fx-ca-paid">ENTER YOUR 4-CHARACTER CODE</label>
                  <div className="fx-code-access-field fx-code-access-paid-field">
                    <select value={prefix} onChange={(event) => { setPrefix(event.target.value as PaidPrefix); setSuffix(""); setPaidMessage(""); }}
                      aria-label="Membership prefix" disabled={paidBusy || attempts >= MAX_ATTEMPTS}>
                      <option value="BSIC">BSIC</option><option value="PRX0">PRX0</option><option value="VIPX">VIPX</option>
                    </select>
                    <span aria-hidden="true">—</span>
                    <input id="fx-ca-paid" ref={paidRef} value={suffix} maxLength={4} autoComplete="off" required
                      placeholder="CODE" disabled={paidBusy || attempts >= MAX_ATTEMPTS}
                      onChange={(event) => { setSuffix(cleanSuffix(event.target.value)); setPaidMessage(""); }} />
                    <button type="submit" disabled={paidBusy || attempts >= MAX_ATTEMPTS || suffix.length !== 4}>
                      {paidBusy ? "CHECKING…" : "ENTER"}
                    </button>
                  </div>
                  <small className="fx-code-access-attempts">
                    {attempts >= MAX_ATTEMPTS ? "CODE ENTRY PAUSED · CONTACT SUPPORT" : `${MAX_ATTEMPTS - attempts} ATTEMPTS AVAILABLE`}
                  </small>
                  {paidMessage && <p className="fx-code-access-feedback" role="alert">{paidMessage}</p>}
                </form>
                <button className="fx-code-access-support fx-code-access-secondary-link" type="button" onClick={onEnterCode}>FULL CODE ENTRY ↗</button>
              </div>
            )}
            {mode === "plans" && (
              <div className="fx-code-access-plan-grid" aria-label="Available memberships">
                {PLANS.map((plan) => (
                  <article className={"fx-code-access-plan fx-code-access-plan--" + plan.id} key={plan.id}>
                    {plan.id === "pro" ? (
                      <video src="/assets/FX-Y24V01.mp4" autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
                    ) : (
                      <img src={plan.id === "basic" ? "/assets/iconos/rosa.png" : "/assets/iconos/corona.png"} alt="" />
                    )}
                    <div className="fx-code-access-plan-shade" aria-hidden="true" />
                    <div className="fx-code-access-plan-content">
                      <div className="fx-code-access-plan-head"><div><strong>{plan.name.toUpperCase()}</strong><small>{plan.prefix}</small></div><b>✪ {plan.stars}</b></div>
                      <p>{plan.tagline}</p>
                      <small>{plan.window} validity · {plan.session}</small>
                      <div className="fx-code-access-plan-actions">
                        <button type="button" onClick={() => selectPlan(plan.id)}>GOT CODE</button>
                        <a href={`https://t.me/User18Fx_bot?start=pay_${plan.id}`}
                          target="_blank" rel="noopener noreferrer">JOIN ↗</a>
                      </div>
                    </div>
                  </article>
                ))}
                <button type="button" className="fx-code-access-all-plans" onClick={onGetCode}>VIEW ALL BENEFITS ↗</button>
              </div>
            )}
          </div>
          <p className="fx-code-access-note">SECURE ACCESS · SERVER VERIFICATION REQUIRED</p>
        </div>
      </div>
    </section>
  );
}
