"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./WebChat.css";

type Msg = {
  id: number;
  sender: "user" | "bot" | "system";
  source: "web" | "telegram";
  text: string;
  createdAt: string;
};

type SessionInfo = {
  consented: boolean;
  termsVersion: string;
  linked?: boolean;
  username?: string | null;
  linkUrl?: string;
};

const POLL_MS = 2500;
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

/**
 * Chat real web ↔ Telegram, con botón flotante.
 *   <WebChat />                       → botón abajo a la derecha
 *   <WebChat defaultOpen />           → abierto de inicio
 * También se abre con:  window.dispatchEvent(new CustomEvent("fx:chat-open"))
 */
export default function WebChat({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lastId = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("fx:chat-open", onOpen);
    return () => window.removeEventListener("fx:chat-open", onOpen);
  }, []);

  /* estado inicial (al abrir por primera vez) */
  useEffect(() => {
    if (!open || info) return;
    let alive = true;
    fetch("/api/chat/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: SessionInfo) => alive && setInfo(d))
      .catch(() => alive && setError("No se pudo conectar con el chat."));
    return () => {
      alive = false;
    };
  }, [open, info]);

  const merge = useCallback((incoming: Msg[]) => {
    if (!incoming.length) return;
    setMsgs((cur) => {
      const seen = new Set(cur.map((m) => m.id));
      const next = [...cur, ...incoming.filter((m) => !seen.has(m.id))];
      lastId.current = next[next.length - 1].id;
      return next;
    });
  }, []);

  /* polling: solo con el panel abierto, aceptado y la pestaña visible */
  const consented = info?.consented === true;
  useEffect(() => {
    if (!open || !consented) return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/chat/messages?after=${lastId.current}`, { cache: "no-store" });
        if (r.status === 401) {
          if (alive) setInfo({ consented: false, termsVersion: "" });
          return;
        }
        const d = (await r.json()) as { messages: Msg[]; linked: boolean };
        if (!alive) return;
        merge(d.messages);
        setInfo((i) => (i && i.linked !== d.linked ? { ...i, linked: d.linked } : i));
      } catch {
        /* reintenta en el siguiente ciclo */
      }
    };
    void tick();
    const id = window.setInterval(() => {
      if (!document.hidden) void tick();
    }, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [open, consented, merge]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  async function accept() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/chat/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept: true }),
      });
      if (!r.ok) throw new Error();
      setInfo((await r.json()) as SessionInfo);
    } catch {
      setError("No se pudo iniciar el chat. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      if (r.status === 429) throw new Error("Demasiados mensajes. Espera un momento.");
      if (!r.ok) throw new Error("No se pudo enviar.");
      merge([((await r.json()) as { message: Msg }).message]);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open && (
        <button type="button" className="fxc-fab" onClick={() => setOpen(true)} aria-label="Abrir chat">
          <span aria-hidden>
💬
</span> CHAT
        </button>
      )}

      {open && (
        <section className="fxc-panel" role="dialog" aria-label="Chat USER FX">
          <header className="fxc-head">
            <div>
              <strong>
USER FX · CHAT
</strong>
              <small>
{info?.linked ? `● Telegram vinculado ${info.username ?? ""}` : "○ Solo web"}
</small>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">
✕
</button>
          </header>

          {!info ? (
            <p className="fxc-center">
Conectando…
</p>
          ) : !consented ? (
            <div className="fxc-terms">
              <p className="fxc-kicker">
TÉRMINOS Y CONDICIONES
</p>
              <div className="fxc-terms-box">
                <p>
Antes de abrir el chat, acepta lo siguiente:
</p>
                <p>
• Tus mensajes se guardan para poder responderte y se reenvían al equipo a través de Telegram.
</p>
                <p>
• Si vinculas tu Telegram, el chat se sincroniza entre la web y la app. Solo guardamos tu @usuario y el ID del chat.
</p>
                <p>
• Una cookie técnica mantiene tu conversación en este navegador (30 días).
</p>
                <p>
• No compartas contraseñas ni datos de pago por aquí.
</p>
                <p>
• Debes ser mayor de edad. Podemos cerrar conversaciones que incumplan estas normas.
</p>
              </div>
              <label className="fxc-check">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                <span>
He leído y acepto los términos y condiciones del chat.
</span>
              </label>
              {error && <p className="fxc-error">✕ {error}</p>}
              <button type="button" className="fxc-btn" disabled={!accepted || busy} onClick={() => void accept()}>
                {busy ? "INICIANDO…" : "ACEPTAR Y ABRIR CHAT"}
              </button>
            </div>
          ) : (
            <>
              {!info.linked && info.linkUrl && (
                <a className="fxc-link" href={info.linkUrl} target="_blank" rel="noreferrer">
                  VINCULAR TELEGRAM ↗ <small>
(sincroniza el chat con tu app)
</small>
                </a>
              )}
              <div ref={box} className="fxc-msgs">
                {msgs.map((m) =>
                  m.sender === "system" ? (
                    <p key={m.id} className="fxc-sys">
{m.text}
</p>
                  ) : (
                    <div key={m.id} className={`fxc-row ${m.sender === "user" ? "me" : "them"}`}>
                      <div className="fxc-bubble">
{m.text}
</div>
                      <small>
                        {m.sender === "user" ? "TÚ" : "Ŧχ"} · {m.source === "telegram" ? "TELEGRAM" : "WEB"} · {hhmm(m.createdAt)}
                      </small>
                    </div>
                  ),
                )}
              </div>
              {error && <p className="fxc-error">✕ {error}</p>}
              <form className="fxc-form" onSubmit={(e) => void send(e)}>
                <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Escribe un mensaje…" autoComplete="off" />
                <button type="submit" disabled={!text.trim() || busy}>
ENVIAR
</button>
              </form>
            </>
          )}
        </section>
      )}
    </>
  );
}