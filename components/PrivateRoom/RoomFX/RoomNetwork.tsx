import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createClientId, requestedRoom, roomLink, roomRequest, RoomError, type Invitation, type Message, type Mood, type Profile, type RoomState } from "./client";
import { AudioStream, Avatar, Icon, MoodPicker, VideoStream } from "./shared";
import { useRoomCall } from "./use-room-call";
import Preview from "./Preview";
import "./RoomNetwork.css";
type Space = "myroom" | "stage" | "buzon";
type Bootstrap = { profile: Profile; myRoom: { id: string }; iceServers: RTCIceServer[] };
export default function RoomNetwork({ space }: { space: Space }) {
  const [client] = useState(createClientId);
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    roomRequest<Bootstrap>(client, "", "bootstrap", { signal: controller.signal }).then(setData).catch((cause) => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [client, attempt]);
  if (!data) return (
<section className="ufx-network ufx-loading" aria-live="polite">
<span className="ufx-wordmark">
USER FX
</span>
<h1>
{error ? "Connection paused." : "Opening your space."}
</h1>
<p>
{error || "Your private network is getting ready."}
</p>
{error &&
<button type="button" className="ufx-primary" onClick={() => setAttempt((value) => value + 1)}>
TRY AGAIN
</button>
}
<a href="#/private-room-access">
VERIFY ACCESS
</a>
</section>
  );
  const roomId = space === "stage" ? "stage" : requestedRoom() || data.myRoom.id;
  return (
<NetworkSurface key={`${space}:${roomId}`} space={space} roomId={roomId} client={client} initial={data} />
);
}
function NetworkSurface({ space, roomId, client, initial }: { space: Space; roomId: string; client: string; initial: Bootstrap }) {
  const [profile, setProfile] = useState(initial.profile);
  const [state, setState] = useState<RoomState | null>(null);
  const [mood, setMood] = useState<Mood>(() => { try { const value = localStorage.getItem("userfx_room_mood"); return value === "arcade" || value === "vintage" ? value : "cine"; } catch { return "cine"; } });
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [preview, setPreview] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ displayName: profile.name, bio: profile.bio });
  const [selected, setSelected] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [working, setWorking] = useState("");
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [unlocked, setUnlocked] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const frame = useRef<HTMLDivElement>(null);
  const chat = useRef<HTMLDivElement>(null);
  const editor = useRef<HTMLDialogElement>(null);
  const apiError = useRef("");
  const call = useRoomCall(client, roomId, profile.id, initial.iceServers);
  const isStage = space === "stage";
  const isInbox = space === "buzon";
  const approved = state?.room.approved || false;
  const myRoom = initial.myRoom.id;
  const notify = useCallback((message: string) => setToast(message), []);
  const onBlocked = useCallback(() => setSoundBlocked(true), []);
  useEffect(() => { try { localStorage.setItem("userfx_room_mood", mood); } catch {} }, [mood]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 4000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (editing) editor.current?.showModal(); }, [editing]);
  useEffect(() => {
    let active = true;
    let pending = false;
    const controller = new AbortController();
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const next = await roomRequest<RoomState>(client, roomId, "state", { signal: controller.signal });
        if (!active) return;
        setState(next);
        if (apiError.current) { setError(""); apiError.current = ""; }
        if (next.room.approved && profile.paidChat) {
          const result = await roomRequest<{ messages: Message[] }>(client, roomId, "messages", { signal: controller.signal });
          if (active) setMessages(result.messages);
        }
        if (isInbox || next.room.isOwner) {
          const result = await roomRequest<{ items: Invitation[] }>(client, "", "inbox", { signal: controller.signal });
          if (active) setInvitations(result.items);
        }
      } catch (cause) {
        if (!active) return;
        const message = cause instanceof Error ? cause.message : "Connection interrupted.";
        apiError.current = message; setError(message);
        if (cause instanceof RoomError && cause.status === 401) void call.leave();
      } finally { pending = false; }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => { active = false; controller.abort(); clearInterval(timer); };
  }, [client, roomId, profile.paidChat, isInbox, refreshToken, call.leave]);
  useEffect(() => { if (chat.current) chat.current.scrollTop = chat.current.scrollHeight; }, [messages.length]);
  async function copyInvite() {
    try { await navigator.clipboard.writeText(isStage ? `${window.location.origin}${window.location.pathname}#/private-room/stage` : roomLink(roomId)); notify("Invitation copied."); }
    catch { notify("Copy this invitation from your browser address bar."); }
  }
  async function requestEntrance() {
    if (working) return;
    setWorking("request"); setError("");
    try { await roomRequest(client, roomId, "request", { method: "POST", body: {} }); setRefreshToken((value) => value + 1); notify("Request sent. Your host will approve your entrance."); }
    catch (cause) { setError((cause as Error).message); }
    finally { setWorking(""); }
  }
  async function decide(item: Invitation, allow: boolean) {
    setWorking(item.id); setError("");
    try { await roomRequest(client, item.roomId, "approve", { method: "POST", body: { accountId: item.accountId, approved: allow } }); setRefreshToken((value) => value + 1); notify(allow ? "Entrance approved." : "Request declined."); }
    catch (cause) { setError((cause as Error).message); }
    finally { setWorking(""); }
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true); setError("");
    try {
      const result = await roomRequest<{ message: Message }>(client, roomId, "messages", { method: "POST", body: { content: text.trim() } });
      setMessages((current) => current.some((item) => item.id === result.message.id) ? current : [...current, result.message]); setText("");
    } catch (cause) { setError((cause as Error).message); }
    finally { setSending(false); }
  }
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    try {
      const response = await fetch("/api/account", { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile: draft }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save your profile.");
      setProfile((current) => ({ ...current, name: result.account.profile.displayName || current.name, bio: result.account.profile.bio })); setEditing(false); notify("Profile updated.");
    } catch (cause) { notify((cause as Error).message); }
    finally { setSaving(false); }
  }
  async function logout() {
    await call.leave();
    try {
      const response = await fetch("/api/access-session", { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) throw new Error();
      for (const name of ["vault_unlocked", "vault_plan", "userfx_access_code", "memberAccess"]) sessionStorage.removeItem(name);
      window.location.hash = "#/";
    } catch { notify("Unable to sign out. Please try again."); }
  }
  const people = call.joined ? call.participants : state?.participants || [];
  const self = { id: profile.id, name: profile.name, cameraOn: call.cameraOn, micOn: call.micOn };
  const available = people.filter((person) => person.cameraOn && (person.id === profile.id ? call.localStream?.getVideoTracks().length : call.remoteStreams[person.id]?.getVideoTracks().length));
  const spotlight = available.find((person) => person.id === selected) || available.find((person) => person.id !== profile.id) || (call.cameraOn ? self : null);
  const spotlightStream = spotlight?.id === profile.id ? call.localStream : spotlight ? call.remoteStreams[spotlight.id] : null;
  const status = state?.room.status;
  const waiting = state?.waiting || [];
  const canMessage = approved && profile.paidChat;
  return (
<div className={`ufx-network ufx-mood-${mood}`}>
<aside className="ufx-sidebar">
<a href="#/private-room" className="ufx-brand" aria-label="UserFX MyRoom">
<span className="ufx-brand-mark">
FX
</span>
<span>
<strong>
USER FX
</strong>
<small>
PRIVATE CONNECTIONS
</small>
</span>
</a>
<div className="ufx-nav-caption">
YOUR UNIVERSE
</div>
<nav aria-label="Private Room navigation">
{([{ name: "myroom", title: "MyRoom", subtitle: "Your space. Your rules.", href: "#/private-room", icon: "home" }, { name: "stage", title: "Stage", subtitle: "Meet in the moment.", href: "#/private-room/stage", icon: "stage" }, { name: "gallery", title: "Gallery", subtitle: "Inside the vault.", href: "#/private-room/gallery", icon: "gallery" }, { name: "buzon", title: "Buzón", subtitle: "Invitations & conversations.", href: "#/private-room/buzon", icon: "inbox" }]).map((item) => (
<a key={item.name} href={item.href} className={space === item.name ? "is-active" : ""} aria-current={space === item.name ? "page" : undefined}>
<Icon name={item.icon} size={20} />
<span>
<strong>
{item.title}
</strong>
<small>
{item.subtitle}
</small>
</span>
{space === item.name &&
<i />
}
</a>
    ))}
</nav>
<div className="ufx-sidebar-note">
<Icon name="shield" size={24} />
<strong>
By invitation.
<br />
By connection.
</strong>
<p>
Your room opens only to guests you approve.
</p>
<button type="button" onClick={() => void navigator.clipboard.writeText(roomLink(myRoom)).then(() => notify("Your room invitation copied.")).catch(() => notify("Clipboard unavailable."))}>
INVITE SOMEONE
<Icon name="arrow" size={14} />
</button>
</div>
<button type="button" className="ufx-account" onClick={() => { setDraft({ displayName: profile.name, bio: profile.bio }); setEditing(true); }}>
<Avatar name={profile.name} />
<span>
<strong>
{profile.name}
</strong>
<small>
{profile.planId.toUpperCase()}
· EDIT PROFILE
</small>
</span>
<Icon name="profile" size={16} />
</button>
<div className="ufx-sidebar-links">
<a href="https://user18fx.com">
HOME ↗
</a>
<button type="button" onClick={() => void logout()}>
SIGN OUT
</button>
</div>
</aside>
<div className="ufx-body">
<header className="ufx-topbar">
<span>
PRIVATE CLUB
<i>
/
</i>
{isStage ? "STAGE" : isInbox ? "BUZÓN" : "MYROOM"}
</span>
<div>
<span className={`ufx-live-status${call.joined ? " is-live" : ""}`}>
<i />
{call.joined ? "CONNECTED" : "YOUR SPACE"}
</span>
<button type="button" onClick={() => void copyInvite()}>
<Icon name="link" size={16} />
<span>
SHARE ROOM
</span>
</button>
</div>
</header>
<main className="ufx-main">
<section className="ufx-intro">
<div>
<span className="ufx-eyebrow">
USER FX ·
{isStage ? "MAKE AN ENTRANCE" : isInbox ? "YOUR PRIVATE LINE" : "ENTER YOUR ELEMENT"}
</span>
<h1>
{isStage ?
<>
A little closer.
<br />
<em>
A little more you.
</em>
</>
 : isInbox ?
<>
Every connection
<br />
<em>
starts somewhere.
</em>
</>
 :
<>
Your space.
<br />
<em>
Your rules.
</em>
</>
}
</h1>
<p>
{isStage ? "Faces, voices, and the unexpected. Take your place on Stage." : isInbox ? "Manage invitations and continue conversations inside an approved room." : "A room for your people. A mood for your moment. Let them in on your terms."}
</p>
</div>
<MoodPicker mood={mood} onChange={setMood} />
</section>
{(error || call.error) &&
<div className="ufx-warning" role="alert">
{error || call.error}
</div>
}
{isInbox ? (
<section className="ufx-mailbox">
<div className="ufx-section-head">
<div>
<span>
PRIVATE INVITATIONS
</span>
<h2>
Your Buzón
</h2>
</div>
<span>
{invitations.length}
REQUESTS
</span>
</div>
{!invitations.length &&
<div className="ufx-mail-empty">
<Icon name="inbox" size={40} />
<h3>
A little quiet for now.
</h3>
<p>
Share your room link. New entrance requests will appear here.
</p>
<button type="button" className="ufx-primary" onClick={() => void navigator.clipboard.writeText(roomLink(myRoom)).then(() => notify("Invitation copied.")).catch(() => notify("Clipboard unavailable."))}>
INVITE SOMEONE
</button>
</div>
}
{invitations.map((item) => (
<article key={item.id} className="ufx-invitation">
<Avatar name={item.direction === "incoming" ? item.name : item.hostName} />
<div>
<strong>
{item.direction === "incoming" ? item.name : item.hostName}
</strong>
<p>
{item.direction === "incoming" ? "Would like to enter your room" : "Your entrance request"}
</p>
<small>
{new Date(item.createdAt).toLocaleString()}
</small>
</div>
<span className={`ufx-request-status is-${item.status}`}>
{item.status.toUpperCase()}
</span>
{item.direction === "incoming" && item.status === "pending" ?
<div className="ufx-request-actions">
<button type="button" disabled={!!working} onClick={() => void decide(item, true)}>
APPROVE
</button>
<button type="button" disabled={!!working} onClick={() => void decide(item, false)}>
DECLINE
</button>
</div>
 : item.status === "approved" ?
<a href={`#/private-room?room=${item.roomId}`} className="ufx-text-link">
OPEN ROOM
<Icon name="arrow" size={15} />
</a>
 : null}
</article>
      ))}
{!profile.paidChat &&
<div className="ufx-membership-note">
<Icon name="shield" />
<p>
Your invitations are available. Private chat requires a paid membership.
</p>
<a href="https://t.me/User18Fx_bot?start=getcode" target="_blank" rel="noreferrer">
GET MY CODE ↗
</a>
</div>
}
</section>
    ) : (
<>
<section className="ufx-room-strip">
<div className="ufx-room-icon">
<Icon name={isStage ? "stage" : "home"} size={24} />
</div>
<div>
<span>
{isStage ? "MEMBER STAGE" : "PRIVATE ROOM · HOST APPROVAL"}
</span>
<h2>
{isStage ? "The Stage" : state?.room.ownerName || "MyRoom"}
</h2>
<p>
{isStage ? "Up to 6 people, one shared moment." : `${state?.room.capacity || 5} seats. One invitation at a time.`}
</p>
</div>
<span className="ufx-room-count">
<i />
{people.length}
IN ROOM
</span>
{call.joined ?
<span className="ufx-connected">
<Icon name="check" size={15} />
YOU'RE IN
</span>
 :
<button type="button" className="ufx-primary" disabled={!!working || call.connecting || !state || status === "pending" || status === "rejected"} onClick={() => approved ? setPreview(true) : void requestEntrance()}>
{call.connecting ? "CONNECTING…" : status === "pending" ? "WAITING FOR HOST" : status === "rejected" ? "REQUEST DECLINED" : approved ? "PREPARE ENTRANCE" : "REQUEST ENTRANCE"}
<Icon name="arrow" size={16} />
</button>
}
</section>
{!approved && state &&
<div className="ufx-waiting-note">
<Icon name="shield" />
<span>
{status === "pending" ? "Your host has your request. This page will update when you're approved." : "Send an entrance request to join this private room."}
</span>
</div>
}
<div className="ufx-work-grid">
<div className="ufx-main-column">
<div className={`ufx-stage-frame${spotlightStream && spotlight ? " has-video" : ""}`} ref={frame}>
{spotlightStream && spotlight ?
<VideoStream stream={spotlightStream} mirrored={spotlight.id === profile.id} />
 :
<div className="ufx-scene">
<div className="ufx-orbit ufx-orbit-one" />
<div className="ufx-orbit ufx-orbit-two" />
<div className="ufx-scene-mark">
FX
</div>
<span>
{call.joined ? "YOUR CAMERA IS OFF" : "THE MOMENT IS YOURS"}
</span>
<h2>
{isStage ?
<>
See you
<br />
<em>
on Stage.
</em>
</>
 :
<>
Make yourself
<br />
<em>
at home.
</em>
</>
}
</h2>
<p>
{call.joined ? "Turn on your camera or let the conversation come to you." : "Preview your camera. Choose your mood. Enter when you're ready."}
</p>
</div>
}
<div className="ufx-frame-top">
<span>
<i className={call.joined ? "is-live" : ""} />
{call.joined ? "LIVE CONNECTION" : "PRIVATE SPACE"}
</span>
<button type="button" aria-label="Enter fullscreen" onClick={() => void frame.current?.requestFullscreen?.().catch(() => notify("Fullscreen isn't available in this browser."))}>
<Icon name="expand" />
</button>
</div>
{spotlight &&
<div className="ufx-frame-bottom">
<Avatar name={spotlight.name} />
<strong>
{spotlight.name}{spotlight.id === profile.id ? " · YOU" : ""}
</strong>
<span>
ON STAGE
</span>
</div>
}
</div>
<div className="ufx-call-toolbar">
<div>
<button type="button" className={call.micOn ? "is-on" : ""} disabled={!call.joined} aria-pressed={call.micOn} onClick={() => void call.toggleMedia("audio")}>
<Icon name="mic" />
<span>
{call.micOn ? "MIC ON" : "MIC OFF"}
</span>
</button>
<button type="button" className={call.cameraOn ? "is-on" : ""} disabled={!call.joined} aria-pressed={call.cameraOn} onClick={() => void call.toggleMedia("video")}>
<Icon name="camera" />
<span>
{call.cameraOn ? "CAM ON" : "CAM OFF"}
</span>
</button>
</div>
<div>
<button type="button" onClick={() => void copyInvite()}>
<Icon name="link" />
<span>
INVITE
</span>
</button>
{call.joined ?
<button type="button" className="ufx-leave" onClick={() => void call.leave()}>
<Icon name="leave" />
LEAVE
</button>
 :
<button type="button" disabled={!approved || call.connecting} onClick={() => setPreview(true)}>
<Icon name="camera" />
PREVIEW
</button>
}
</div>
</div>
{soundBlocked &&
<button type="button" className="ufx-audio-unlock" onClick={() => { setUnlocked((value) => value + 1); setSoundBlocked(false); }}>
TAP TO ENABLE CALL AUDIO
</button>
}
<section className="ufx-people">
<div className="ufx-section-head">
<div>
<span>
{isStage ? "THE MOMENT WE MAKE TOGETHER" : "YOUR INNER CIRCLE"}
</span>
<h3>
In the room
<small>
{people.length}
</small>
</h3>
</div>
<span>
{state?.room.capacity || (isStage ? 6 : 5)}
SEATS
</span>
</div>
{people.length ?
<div className="ufx-people-grid">
{people.map((person) => { const personStream = person.id === profile.id ? call.localStream : call.remoteStreams[person.id]; return (
<button type="button" key={person.id} className={selected === person.id ? "is-selected" : ""} onClick={() => setSelected(person.id)}>
<span className="ufx-person-visual">
{personStream && person.cameraOn ?
<VideoStream stream={personStream} mirrored={person.id === profile.id} />
 :
<Avatar name={person.name} />
}
</span>
<strong>
{person.name}
</strong>
<span>
{person.micOn ? "MIC ON" : "MIC OFF"}
</span>
</button>
); })}
</div>
 :
<div className="ufx-people-empty">
<Icon name="stage" size={25} />
<p>
No one on camera yet.
<br />
<span>
The next good conversation starts with you.
</span>
</p>
</div>
}
</section>
{state?.room.isOwner && waiting.length > 0 &&
<section className="ufx-waiting-room">
<div className="ufx-section-head">
<div>
<span>
ON YOUR TERMS
</span>
<h3>
Waiting room
<small>
{waiting.length}
</small>
</h3>
</div>
</div>
{waiting.map((item) =>
<article key={item.id}>
<Avatar name={item.name} />
<strong>
{item.name}
</strong>
<button type="button" disabled={!!working} onClick={() => void decide(item, true)}>
LET IN
</button>
<button type="button" disabled={!!working} onClick={() => void decide(item, false)}>
DECLINE
</button>
</article>
)}
</section>
}
{!isStage &&
<section className="ufx-profile-card">
<Avatar name={state?.room.isOwner ? profile.name : state?.room.ownerName || "HOST"} large />
<div>
<span>
BEHIND THE CAMERA
</span>
<h3>
{state?.room.isOwner ? profile.name : state?.room.ownerName}
</h3>
<p>
{state?.room.isOwner ? profile.bio || "A private space for a good conversation." : "You're a guest in this private room."}
</p>
</div>
{state?.room.isOwner &&
<button type="button" onClick={() => setEditing(true)}>
<Icon name="profile" />
EDIT
</button>
}
</section>
}
</div>
<aside className="ufx-chat-panel">
<header>
<span className="ufx-chat-icon">
<Icon name="inbox" />
</span>
<div>
<h3>
Room chat
</h3>
<p>
A little more connection.
</p>
</div>
<i />
</header>
<div className="ufx-chat-messages" ref={chat} aria-live="polite" aria-relevant="additions">
<div className="ufx-chat-day">
THE CONVERSATION STARTS HERE
</div>
<div className="ufx-chat-welcome">
<span>
✦ WELCOME TO YOUR ELEMENT
</span>
<p>
{isStage ? "Say hello. Share a little. See where the moment goes." : "Your private conversation stays inside this approved room."}
</p>
</div>
{!canMessage ?
<div className="ufx-chat-locked">
<Icon name="shield" size={28} />
<strong>
{!approved ? "HOST APPROVAL REQUIRED" : "MEMBERSHIP REQUIRED"}
</strong>
<p>
{!approved ? "You'll see the chat when your host approves your entrance." : "SPCL opens the room. A paid membership opens private chat."}
</p>
{approved &&
<a href="https://t.me/User18Fx_bot?start=getcode" target="_blank" rel="noreferrer">
GET MY CODE ↗
</a>
}
</div>
 : messages.map((message) =>
<article key={message.id} className={`ufx-chat-message${message.authorId === profile.accountId ? " is-own" : ""}`}>
<Avatar name={message.authorName} />
<div>
<header>
<strong>
{message.authorId === profile.accountId ? "YOU" : message.authorName}
</strong>
<time dateTime={message.createdAt}>
{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
</time>
</header>
<p>
{message.content}
</p>
</div>
</article>
)}
</div>
<form className="ufx-compose" onSubmit={(event) => void send(event)}>
<input type="text" value={text} onChange={(event) => setText(event.target.value)} maxLength={500} placeholder={canMessage ? "Say something…" : "Chat is locked"} disabled={!canMessage || sending} aria-label="Room message" />
<button type="submit" disabled={!canMessage || !text.trim() || sending} aria-label="Send message">
<Icon name="send" />
</button>
</form>
<footer>
PRIVATE ACCESS · PERSONAL CONNECTION
</footer>
</aside>
</div>
</>
    )}
<footer className="ufx-page-footer">
<span>
USER FX · MADE FOR YOUR MOMENT
</span>
<a href="https://t.me/User18Fx_bot" target="_blank" rel="noreferrer">
@User18Fx_bot ↗
</a>
</footer>
</main>
</div>
<div className="ufx-audio-sources">
{Object.entries(call.remoteStreams).map(([id, stream]) =>
<AudioStream key={id} stream={stream} onBlocked={onBlocked} unlocked={unlocked} />
)}
</div>
{toast &&
<div className="ufx-toast" role="status">
<Icon name="check" />
{toast}
<button type="button" aria-label="Dismiss notification" onClick={() => setToast("")}>
<Icon name="close" size={14} />
</button>
</div>
}
{preview &&
<Preview onClose={() => setPreview(false)} onJoin={(options) => { setPreview(false); void call.join(options); }} />
}
{editing &&
<dialog ref={editor} className="ufx-dialog" onCancel={() => setEditing(false)} aria-labelledby="ufx-profile-title">
<form onSubmit={(event) => void saveProfile(event)}>
<div className="ufx-dialog-head">
<span>
YOUR USER FX PROFILE
</span>
<button type="button" aria-label="Close profile editor" onClick={() => setEditing(false)}>
<Icon name="close" />
</button>
</div>
<h2 id="ufx-profile-title">
A little more you.
</h2>
<p>
Your existing account. Your personal touch.
</p>
<label>
DISPLAY NAME
<input type="text" required minLength={2} maxLength={40} value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} />
</label>
<label>
ABOUT YOU
<textarea rows={4} maxLength={280} value={draft.bio} onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))} />
</label>
<button type="submit" className="ufx-primary ufx-wide" disabled={saving}>
{saving ? "SAVING…" : "SAVE PROFILE"}
<Icon name="check" />
</button>
</form>
</dialog>
}
</div>
  );
}
