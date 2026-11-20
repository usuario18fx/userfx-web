"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import "./FxChat.css";

const TERMS_VERSION = "2026-11-08-v1";
const BOT_LINK = "https://t.me/User18Fx_bot?start=webchat";
const PROFILE_IMAGE = "/assets/my-room/chat.png";
const FALLBACK_PROFILE_IMAGE = "/assets/my-room/profileChat.png";

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
  unread?: number;
  error?: string;
};
type FxChatProps = { placement?: "header" | "floating" };
async function callChat(method: "GET" | "POST" | "DELETE", body?: object): Promise<ChatResponse> {
  const res = await fetch("/api/fx-chat", {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await res.json().catch(() => ({})) as ChatResponse;
  if (!res.ok) throw new Error(result.error || "Couldn't reach the chat. Try again.");
  return result;
}
function clock(iso: string) {
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}
function profileFallback(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  if (img.dataset.fallback !== "1") {
    img.dataset.fallback = "1";
    img.src = FALLBACK_PROFILE_IMAGE;
  } else {
    img.style.opacity = "0";
  }}
export default function FxChat({ placement = "header" }: FxChatProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linked, setLinked] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [linkCode, setLinkCode] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const scroll = useRef<HTMLDivElement>(null);
  const readInFlight = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let cancelled = false;
    if (open) setLoading(true);
    void callChat("GET").then((response) => {
      if (cancelled) return;
      setLinked(Boolean(response.linked));
      setMessages(response.messages || []);
      setUnread(response.linked ? (response.unread || 0) : 0);
      setError("");
    }).catch((e) => {
      if (!cancelled && open) setError(e instanceof Error ? e.message : "Connection unavailable");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!linked || confirmDelete) return;
    let alive = true;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void callChat("GET").then((response) => {
        if (!alive) return;
        if (!response.linked) {
          setLinked(false);
          setMessages([]);
          setUnread(0);
        } else {
          setMessages(response.messages || []);
          setUnread(response.unread || 0);
        }
      }).catch(() => {
        // Preserve the conversation during temporary network errors.
      });
    }, open ? 3500 : 9000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [open, linked, confirmDelete]);

  useEffect(() => {
    if (open && linked) scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, linked]);

  useEffect(() => {
    if (!open) setConfirmDelete(false);
  }, [open]);

  useEffect(() => {
    if (!open || !linked || loading || unread === 0 || confirmDelete || readInFlight.current) return;
    const latestVisible = messages.reduce((last, msg) => {
      if (msg.role === "user") return last;
      const at = Date.parse(msg.at);
      return Number.isFinite(at) ? Math.max(last, at) : last;
    }, 0);
    if (!latestVisible) return;
    readInFlight.current = true;
    void callChat("POST", { action: "read", seenAt: latestVisible })
      .then((response) => { setUnread(response.unread || 0); })
      .catch(() => { /* Retry on the next successful sync. */ })
      .finally(() => { readInFlight.current = false; });
  }, [open, linked, loading, unread, confirmDelete, messages]);

  async function handleLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accepted || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await callChat("POST", { action: "link", code: linkCode, accepted: true, termsVersion: TERMS_VERSION });
      const fresh = await callChat("GET");
      setLinked(Boolean(fresh.linked ?? result.linked));
      setMessages(fresh.messages || []);
      setUnread(fresh.unread || 0);
      setLinkCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid or expired code");
    } finally {
      setBusy(false);
    }}
  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setBusy(true);
    setSending(true);
    setError("");
    try {
      const result = await callChat("POST", { action: "send", message });
      setMessages(result.messages || []);
      setUnread(result.unread || 0);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Message couldn't be sent");
    } finally {
      setSending(false);
      setBusy(false);
    }}
  async function deleteConversation() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await callChat("DELETE");
      setLinked(false);
      setAccepted(false);
      setMessages([]);
      setUnread(0);
      setSending(false);
      setLinkCode("");
      setDraft("");
      setConfirmDelete(false);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete the chat");
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }}
  const windowContent = open ? (
        <section id="fx-web-chat-panel" className="fx-web-chat-window" aria-label="USER FX chat" data-lenis-prevent>
        <header className="fx-web-chat-header">
        <img className="fx-web-chat-header-avatar" src={PROFILE_IMAGE} alt="USER FX" onError={profileFallback} />
        <div className="fx-web-chat-heading">
        <strong>
          ᴜꜱᴇʀ Ŧх
        </strong>
        <small>
        <span className={"fx-web-chat-status-dot" + (linked ? " is-connected" : "")} />
        {linked 
          ? "ꜱʏɴᴄᴇᴅ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ" 
          : "ᴘʀɪᴠᴀᴛᴇ ᴄʜᴀᴛ"}
        </small>
        </div>
        <div className="fx-web-chat-header-actions">
        <button type="button" className="fx-web-chat-minimize" onClick={() => setOpen(false)} aria-label="Minimize chat" title="Minimize chat">
         −
        </button>
        <button type="button" className="fx-web-chat-close" onClick={() => setConfirmDelete(true)} aria-label="Delete chat and disconnect" title="Delete chat">
        ×
        </button>
        </div>
        </header>
        {loading ? (
        <div className="fx-web-chat-center" role="status">
         ᴄᴏɴɴᴇᴄᴛɪɴɢ…
        </div>
         ) : !linked ? (
        <div className="fx-web-chat-gate">
        <strong>
         ᴄᴏɴɴᴇᴄᴛ ʏᴏᴜʀ ᴛᴇʟᴇɢʀᴀᴍ
        </strong>
        <p>
ꜱʏɴᴄ ʏᴏᴜʀ ᴄʜᴀᴛ ᴡɪᴛʜ ᴜꜱᴇʀ Ŧх. ʟɪɴᴋ ʏᴏᴜʀ ᴀᴄᴄᴏᴜɴᴛ ᴛᴏ ꜱᴛᴀʀᴛ.
</p>
          <div className="fx-web-chat-paths" aria-label="Two ways to get your code">
            <a href="https://t.me/User18Fx_bot?start=getcode" target="_blank" rel="noopener noreferrer">
              <small>
ᴏᴘᴛɪᴏɴ 01 · ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ
</small>
              <strong>
ɢᴇᴛ ᴀ ᴄᴏᴅᴇ
</strong>
              <span>
ꜱᴇᴄᴜʀᴇ ᴄʜᴇᴄᴋᴏᴜᴛ ᴏɴ ᴛᴇʟᴇɢʀᴀᴍ
</span>
            </a>
            <div>
              <small>
ᴏᴘᴛɪᴏɴ 02 · ᴡᴇʙ ᴄʜᴀᴛ
</small>
              <strong>
ᴄʜᴀᴛ ᴡɪᴛʜ ꜰx
</strong>
              <span>
ʟɪᴠᴇ ᴄʜᴀᴛ ᴀꜰᴛᴇʀ ᴄᴏɴɴᴇᴄᴛɪɴɢ
</span>
            </div>
          </div>
          <label className="fx-web-chat-consent">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span>I agree to sync this chat with Telegram, store up to 100 messages for 30 days, and use my Telegram identity for this conversation. I can withdraw permission at any time. <a href="/chat-terms" target="_blank" rel="noopener noreferrer">
Chat terms
</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer">
privacy
</a>.</span>
          </label>
          <a className={"fx-web-chat-telegram" + (!accepted ? " is-disabled" : "")} href={accepted ? BOT_LINK : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!accepted} onClick={(e) => { if (!accepted) e.preventDefault(); }}>
            01 · ᴏᴘᴇɴ @ᴜꜱᴇʀ18ꜰx_ʙᴏᴛ
          </a>
          <p className="fx-web-chat-steps">
ᴛᴀᴘ ꜱᴛᴀʀᴛ ᴛᴏ ɢᴇᴛ ʏᴏᴜʀ 10-ᴍɪɴᴜᴛᴇ ʟɪɴᴋ ᴄᴏᴅᴇ.
</p>
          <form onSubmit={handleLink} className="fx-web-chat-link-form">
            <input type="text" value={linkCode} onChange={(e) => setLinkCode(e.target.value.toUpperCase())} placeholder="FXCHAT-..." maxLength={27} aria-label="Link code" autoComplete="off" spellCheck={false} />
            <button type="submit" disabled={!accepted || busy || linkCode.trim().length < 27}>
02 · ʟɪɴᴋ ᴀᴄᴄᴏᴜɴᴛ
</button>
          </form>
        </div>
      ) : (
        <>
          <div className="fx-web-chat-message-list" ref={scroll} role="log" aria-live="polite" aria-relevant="additions">
            {messages.length === 0 && (
              <p className="fx-web-chat-empty">
ʜᴇʏ, ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴜꜱᴇʀ Ŧх. ᴛʜᴇ ᴄʜᴀᴛ'ꜱ ᴀʟʟ ʏᴏᴜʀꜱ.
</p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={"fx-web-chat-message-row " + (msg.role === "user" ? "is-user" : "is-received")}>
                {msg.role !== "user" && <img className="fx-web-chat-message-avatar" src={PROFILE_IMAGE} alt="" onError={profileFallback} />}
                <div className={"fx-web-chat-bubble " + (msg.role === "user" ? "is-user" : msg.role === "support" ? "is-support" : "is-bot")}>
                  {msg.role !== "user" && <span className="fx-web-chat-author">
{msg.role === "support" ? "ᴜꜱᴇʀ Ŧх · ꜱᴜᴘᴘᴏʀᴛ" : "ᴜꜱᴇʀ Ŧх · ʙᴏᴛ"}
</span>}
                  <p>
{msg.text}
</p>
                  <time dateTime={msg.at}>
{clock(msg.at)}{msg.role === "user" ? " ✓✓" : ""}
</time>
                </div>
              </div>
            ))}
            {sending && (
              <div className="fx-web-chat-message-row is-received fx-web-chat-typing-row" role="status" aria-label="FX is typing">
                <img className="fx-web-chat-message-avatar" src={PROFILE_IMAGE} alt="" onError={profileFallback} />
                <div className="fx-web-chat-bubble is-bot fx-web-chat-typing-bubble">
                  <span className="fx-web-chat-author">
ꜰx ɪꜱ ᴛʏᴘɪɴɢ
</span>
                  <span className="fx-web-chat-typing-dots" aria-hidden="true">
<i />
<i />
<i />
</span>
                </div>
              </div>
            )}
          </div>
          <form className="fx-web-chat-compose" onSubmit={handleSend}>
            <input type="text" aria-label="Type a message" placeholder="ᴡʀɪᴛᴇ ᴀ ᴍᴇꜱꜱᴀɢᴇ…" value={draft} maxLength={1000} onChange={(e) => setDraft(e.target.value)} disabled={busy} />
            <button type="submit" disabled={busy || !draft.trim()} aria-label="Send message">
➤
</button>
          </form>
          <div className="fx-web-chat-bottom">
<span>
ʟɪᴠᴇ ᴄʜᴀᴛ · ᴛᴇʟᴇɢʀᴀᴍ ꜱʏɴᴄ ᴀᴄᴛɪᴠᴇ
</span>
</div>
        </>
      )}
      {error && <p className="fx-web-chat-error" role="alert">
{error}
</p>}
      {confirmDelete && (
        <div className="fx-web-chat-confirm-backdrop">
          <div className="fx-web-chat-confirm" role="dialog" aria-modal="true" aria-labelledby="fx-chat-delete-title" onKeyDown={(e) => { if (e.key === "Escape") setConfirmDelete(false); }}>
            <strong id="fx-chat-delete-title">
ᴅᴇʟᴇᴛᴇ ᴛʜɪꜱ ᴄʜᴀᴛ?
</strong>
            <p>
ʏᴏᴜʀ ᴡᴇʙ ᴄʜᴀᴛ ʜɪꜱᴛᴏʀʏ ᴡɪʟʟ ʙᴇ ᴅᴇʟᴇᴛᴇᴅ ᴀɴᴅ ᴛᴇʟᴇɢʀᴀᴍ ᴡɪʟʟ ʙᴇ ᴅɪꜱᴄᴏɴɴᴇᴄᴛᴇᴅ. ᴍᴇꜱꜱᴀɢᴇꜱ ɪɴ ᴛᴇʟᴇɢʀᴀᴍ ᴡɪʟʟ ʀᴇᴍᴀɪɴ ᴛʜᴇʀᴇ. ᴄᴏɴᴛɪɴᴜᴇ?
</p>
            <div className="fx-web-chat-confirm-actions">
              <button type="button" autoFocus onClick={() => setConfirmDelete(false)} disabled={busy}>
ᴋᴇᴇᴘ ᴄʜᴀᴛ
</button>
              <button type="button" className="is-danger" onClick={() => { void deleteConversation(); }} disabled={busy}>
{busy ? "ᴅᴇʟᴇᴛɪɴɢ…" : "ᴅᴇʟᴇᴛᴇ & ʀᴇꜱᴛᴀʀᴛ"}
</button>
            </div>
          </div>
        </div>
      )}
    </section>
  ) : null;

  return (
    <div id="fx-chat-dock" className={"fx-web-chat" + (open ? " is-open" : "") + (linked ? " is-active" : "")} data-placement={placement} aria-label="USER FX chat">
      <button type="button" className="fx-web-chat-launcher" onClick={() => setOpen((current) => !current)} aria-label={open ? "Minimize USER FX chat" : unread > 0 ? `Open USER FX chat, ${unread} unread messages` : "Open USER FX chat"} aria-expanded={open} aria-controls="fx-web-chat-panel" title={unread > 0 ? `${unread} unread messages` : "USER FX chat"}>
        <img className="fx-web-chat-launcher-image" src={PROFILE_IMAGE} alt="" onError={profileFallback} />
        {linked && <span className="fx-web-chat-pulse" aria-hidden="true" />}
        {!open && linked && unread > 0 && (
          <span className="fx-web-chat-unread" aria-hidden="true">
{unread > 99 ? "99+" : unread}
</span>
        )}
      </button>
      {mounted && windowContent ? createPortal(windowContent, document.body) : null}
    </div>
  );
}
