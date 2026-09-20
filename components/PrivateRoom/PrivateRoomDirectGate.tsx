import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import "./PrivateRoomDirectGate.css";

const ACCESS_CODE_KEY = "userfx_access_code";
const STORAGE_KEY = "vault_unlocked";
const MAX_ATTEMPTS = 5;

type DirectGateProps = {
  children: ReactNode;
};

type SessionResponse = {
  authenticated?: boolean;
  planId?: "basic" | "pro" | "vip";
};

type VerifyResponse = {
  ok?: boolean;
  planId?: "basic" | "pro" | "vip";
  error?: string;
};

export default function PrivateRoomDirectGate({children}:DirectGateProps) {
  const [checking,setChecking] = useState(true);
  const [authenticated,setAuthenticated] = useState(false);
  const [prefix,setPrefix] = useState("");
  const [suffix,setSuffix] = useState("");
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [attempts,setAttempts] = useState(0);

  /* ─────   LOCAL DEV ACCESS ─────── */
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    setAuthenticated(true);
    setChecking(false);
  },[]);

  /* ─────   EXISTING ACCESS SESSION ─────── */
  useEffect(() => {
    if (import.meta.env.DEV) return;

    let cancelled = false;

    fetch("/api/access-session",{
      method:"GET",
      headers:{Accept:"application/json"},
      credentials:"same-origin",
      cache:"no-store",
    })
      .then((response) =>
        response.json().then((data:SessionResponse) => ({response,data})),
      )
      .then(({response,data}) => {
        if (cancelled) return;

        if (response.ok && data?.authenticated) {
          sessionStorage.setItem(STORAGE_KEY,"true");
          if (data.planId) sessionStorage.setItem("vault_plan",data.planId);
          setAuthenticated(true);
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
          setAuthenticated(false);
        }
      })
      .catch(() => {
        if (!cancelled) setAuthenticated(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {cancelled = true;};
  },[]);

  /* ─────   VERIFY CODE ─────── */
  async function handleSubmit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || attempts >= MAX_ATTEMPTS) return;

    const normalizedPrefix = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g,"");
    const normalizedSuffix = suffix.trim().toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,"");

    if (!/^(BSIC|PRX0|VIPX)$/.test(normalizedPrefix) || normalizedSuffix.length !== 4) {
      setError("ENTER YOUR COMPLETE ACCESS CODE");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/verify",{
        method:"POST",
        headers:{
          Accept:"application/json",
          "Content-Type":"application/json",
        },
        credentials:"same-origin",
        cache:"no-store",
        body:JSON.stringify({
          prefix:normalizedPrefix,
          suffix:normalizedSuffix,
        }),
      });

      const data:VerifyResponse = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok) {
        setAttempts((current) => current + 1);
        setSuffix("");
        setError(data?.error || "ACCESS CODE NOT VALID");
        return;
      }

      const fullCode = `${normalizedPrefix}-${normalizedSuffix}`;
      sessionStorage.setItem(STORAGE_KEY,"true");
      sessionStorage.setItem(ACCESS_CODE_KEY,fullCode);
      localStorage.setItem("vault_saved_code",fullCode);
      if (data.planId) sessionStorage.setItem("vault_plan",data.planId);
      setAuthenticated(true);
    } catch {
      setError("CONNECTION ERROR · TRY AGAIN");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="pvr-direct-checking">
        <span>USER FX</span>
        <strong>CHECKING PRIVATE ACCESS…</strong>
      </main>
    );
  }

  if (authenticated) return <>{children}</>;

  return (
    <main className="pvr-direct-gate">
      <section className="pvr-direct-card">
        {/* ========   DIRECT PRIVATE ROOM ACCESS =========================== */}
        <header className="pvr-direct-head">
          <span>USER FX · PRIVATE CLUB</span>
          <strong>PRIVATE ROOM</strong>
          <small>CODED ACCESS</small>
        </header>

        <div className="pvr-direct-mark" aria-hidden="true">FX</div>

        <div className="pvr-direct-copy">
          <span>ENTER YOUR KEY</span>
          <h1>ACCESS<br/><em>PRIVATE ROOM</em></h1>
          <p>Enter your private code to continue. Active member sessions enter automatically.</p>
        </div>

        <form className="pvr-direct-form" onSubmit={handleSubmit}>
          <div className="pvr-direct-inputs">
            <input
              type="text"
              value={prefix}
              onChange={(event) => setPrefix(event.target.value.toUpperCase())}
              placeholder="BSIC"
              maxLength={4}
              autoCapitalize="characters"
              autoComplete="off"
              disabled={loading || attempts >= MAX_ATTEMPTS}
              aria-label="Access code prefix"
            />
            <span>—</span>
            <input
              type="text"
              value={suffix}
              onChange={(event) => setSuffix(event.target.value.toUpperCase())}
              placeholder="CODE"
              maxLength={4}
              autoCapitalize="characters"
              autoComplete="off"
              disabled={loading || attempts >= MAX_ATTEMPTS}
              aria-label="Access code suffix"
            />
          </div>

          <button type="submit" disabled={loading || attempts >= MAX_ATTEMPTS}>
            {loading ? "VERIFYING…" : "ENTER PRIVATE ROOM"}
          </button>

          {error && <p className="pvr-direct-error" role="alert">{error}</p>}

          <small className="pvr-direct-attempts">
            {attempts >= MAX_ATTEMPTS
              ? "ACCESS TEMPORARILY LOCKED · REFRESH TO TRY AGAIN"
              : `${MAX_ATTEMPTS - attempts} ATTEMPTS AVAILABLE`}
          </small>
        </form>

        {/* ========   TELEGRAM + SPECIAL CODE =========================== */}
        <div className="pvr-direct-shortcuts">
          <a
            className="pvr-direct-shortcut"
            href="https://t.me/User18Fx_bot?start=getcode"
            target="_blank"
            rel="noreferrer"
            aria-label="Open Telegram bot"
          >
            <img src="/assets/iconos/telegram.png" alt="" aria-hidden="true"/>
            <span>
              <small>OPEN BOT</small>
              <strong>TELEGRAM</strong>
            </span>
          </a>

          <a
            className="pvr-direct-shortcut pvr-direct-shortcut--special"
            href="https://t.me/User18Fx_bot?start=identity"
            target="_blank"
            rel="noreferrer"
            aria-label="Get special code"
          >
            <img src="/assets/iconos/corona.png" alt="" aria-hidden="true"/>
            <span>
              <small>MEMBER IDENTITY</small>
              <strong>SPECIAL CODE</strong>
            </span>
          </a>
        </div>

        <footer className="pvr-direct-foot">
          <button type="button" onClick={() => {window.location.hash = "#/";}}>← BACK</button>
          <a href="https://t.me/User18Fx_bot?start=getcode" target="_blank" rel="noreferrer">GET A CODE</a>
        </footer>
      </section>
    </main>
  );
}
