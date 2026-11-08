"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import "./FxChat.css";

const TERMS_VERSION = "2026-11-08-v1";
const BOT_LINK = "https://t.me/User18Fx_bot?start=webchat";

type ChatMessage = {
  id: string;
  role: "user" | "bot" | "support";
  text: string;
  source: string;
  at: string;
};
type ChatResponse = {
  linked?: boolean;
  messages?: ChatMessage[];
  error?: string;
};

async function callChat(method: "GET" | "POST" | "DELETE", body?: object): Promise<ChatResponse> {
  const res = await fetch("/api/fx-chat", {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await res.json().catch(() => ({})) as ChatResponse;
  if (!res.ok) throw new Error(result.error || "No se pudo conectar al chat");
  return result;
}

function clock(iso: string) {
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

export default function FxChat() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [linked, setLinked] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [linkCode, setLinkCode] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scroll = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void callChat("GET").then((response) => {
      if (cancelled) return;
      setLinked(Boolean(response.linked));
      setMessages(response.messages || []);
      setError("");
    }).catch((e) => {
      if (!cancelled) setError(e.message);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open || !linked) return;
    let alive = true;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void callChat("GET").then((response) => {
        if (!alive) return;
        if (!response.linked) {
          setLinked(false);
          setMessages([]);
        } else {
          setMessages(response.messages || []);
        }
      }).catch(() => {
        // Network interruptions should not clear an authenticated conversation.
      });
    }, 3500);
    return () => { alive = false; window.clearInterval(timer); };
  }, [open, linked]);

  useEffect(() => {
    if (open && linked) scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, linked]);

  async function handleLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accepted || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await callChat("POST", { action: "link", code: linkCode, accepted: true, termsVersion: TERMS_VERSION });
      setLinked(Boolean(result.linked));
      const fresh = await callChat("GET");
      setMessages(fresh.messages || []);
      setLinkCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Código inválido o caducado");
    } finally {
      setBusy(false);
    }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await callChat("POST", { action: "send", message });
      setMessages(result.messages || []);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (busy || !window.confirm("¿Desvincular Telegram y borrar el historial web sincronizado?")) return;
    setBusy(true);
    try {
      await callChat("DELETE");
      setLinked(false);
      setAccepted(false);
      setMessages([]);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo desvincular");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fx-web-chat" aria-label="USER FX chat">
      {!open && (
        <button type="button" className="fx-web-chat-launcher" onClick={() => setOpen(true)} aria-label="Abrir chat USER FX">
          <span className="fx-web-chat-symbol" aria-hidden="true">FX</span>
          <span>CHAT</span>
          <span className="fx-web-chat-pulse" aria-hidden="true" />
        </button>
      )}
      {open && (
        <section className="fx-web-chat-window" aria-label="Chat USER FX">
          <header className="fx-web-chat-header">
            <div className="fx-web-chat-header-mark">FX</div>
            <div className="fx-web-chat-heading">
              <strong>USER FX</strong>
              <small>{linked ? "BOT + TELEGRAM CONECTADOS" : "CHAT · TELEGRAM"}</small>
            </div>
            <button type="button" className="fx-web-chat-close" onClick={() => setOpen(false)} aria-label="Cerrar chat">×</button>
          </header>
          {loading ? (
            <div className="fx-web-chat-center" role="status">Conectando…</div>
          ) : !linked ? (
            <div className="fx-web-chat-gate">
              <strong>Conecta tu Telegram</strong>
              <p>Habla con el bot desde esta página y recibe respuestas también en Telegram. Debes vincular tu cuenta y aceptar las condiciones.</p>
              <div className="fx-web-chat-paths" aria-label="Dos formas de obtener tu código">
                <a href="https://t.me/User18Fx_bot?start=getcode" target="_blank" rel="noopener noreferrer">
                  <small>VÍA 01 · TELEGRAM STARS</small>
                  <strong>OBTENER CÓDIGO</strong>
                  <span>Pago real y entrega segura en Telegram</span>
                </a>
                <div>
                  <small>VÍA 02 · CHAT WEB</small>
                  <strong>HABLAR CON FX</strong>
                  <span>Chat real sincronizado tras vincular tu cuenta</span>
                </div>
              </div>
              <label className="fx-web-chat-consent">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                <span>Acepto la sincronización entre la web y Telegram, el almacenamiento de hasta 100 mensajes durante 30 días y el uso de mi identidad de Telegram para esta conversación. Puedo revocar el permiso cuando quiera. <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacidad y condiciones</a>.</span>
              </label>
              <a className={"fx-web-chat-telegram" + (!accepted ? " is-disabled" : "")}
                href={accepted ? BOT_LINK : undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!accepted}
                onClick={(e) => { if (!accepted) e.preventDefault(); }}>
                1. ABRIR @USER18FX_BOT
              </a>
              <p className="fx-web-chat-steps">Pulsa INICIAR en Telegram. El bot te enviará un código temporal FXCHAT, válido por 10 minutos.</p>
              <form onSubmit={handleLink} className="fx-web-chat-link-form">
                <input type="text" value={linkCode} onChange={(e) => setLinkCode(e.target.value.toUpperCase())} placeholder="FXCHAT-..." maxLength={27} aria-label="Código de vinculación" autoComplete="off" spellCheck={false} />
                <button type="submit" disabled={!accepted || busy || linkCode.trim().length < 27}>2. VINCULAR</button>
              </form>
            </div>
          ) : (
            <>
              <div className="fx-web-chat-message-list" ref={scroll} role="log" aria-live="polite" aria-relevant="additions">
                {messages.length === 0 && (
                  <p className="fx-web-chat-empty">Conexión verificada. Escribe para consultar planes, códigos o contactar con soporte.</p>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={"fx-web-chat-bubble " + (msg.role === "user" ? "is-user" : "is-bot")}>
                    <span className="fx-web-chat-author">{msg.role === "user" ? "TÚ" : msg.role === "support" ? "SOPORTE USER FX" : "FX BOT"}</span>
                    <p>{msg.text}</p>
                    <time dateTime={msg.at}>{clock(msg.at)}</time>
                  </div>
                ))}
              </div>
              <form className="fx-web-chat-compose" onSubmit={handleSend}>
                <input type="text" aria-label="Escribir mensaje" placeholder="Escribe tu mensaje…" value={draft} maxLength={1000} onChange={(e) => setDraft(e.target.value)} disabled={busy} />
                <button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar mensaje">➤</button>
              </form>
              <div className="fx-web-chat-bottom">
                <span>Mensajes sincronizados · No compartas códigos privados</span>
                <button type="button" onClick={disconnect} disabled={busy}>Desvincular</button>
              </div>
            </>
          )}
          {error && <p className="fx-web-chat-error" role="alert">{error}</p>}
        </section>
      )}
    </div>
  );
}
