"use client";

import { useEffect, useState } from "react";
import "./PR-MyRoom.css";

type PrivateRoomMood = "cine" | "vintage" | "arcade";
type ViewMode = "user" | "admin";

export type Tab = "muro" | "gente" | "salas" | "perfil";
export type PRFX5Props = {
  nick?: string;
  initialTab?: Tab;
  className?: string;
};

const CHAT_LINES = [
  { user: "@Luke", text: "Hey, good to see you online." },
  { user: "@GreenGrower", text: "Stage later?" },
  { user: "@VV", text: "Sent you a private message." },
];

function goTo(hash: string) {
  window.location.hash = hash;
}

function readMood(): PrivateRoomMood {
  const value = document.documentElement.dataset.pvrMood;
  return value === "vintage" || value === "arcade" ? value : "cine";
}

function readViewMode(): ViewMode {
  return document.documentElement.dataset.pvrViewMode === "admin" ? "admin" : "user";
}

function usePrivateRoomState() {
  const [mood, setMood] = useState<PrivateRoomMood>(() => readMood());
  const [viewMode, setViewMode] = useState<ViewMode>(() => readViewMode());
  const [cameraLive, setCameraLive] = useState(false);

  useEffect(() => {
    const readCamera = () => {
      const indicator = document.querySelector<HTMLElement>(".pvr-account-online");
      setCameraLive(Boolean(indicator && !indicator.classList.contains("is-offline")));
    };
    const handleMood = () => setMood(readMood());
    const handleViewMode = () => setViewMode(readViewMode());

    readCamera();
    const observer = new MutationObserver(readCamera);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    window.addEventListener("userfx:private-room-mood", handleMood);
    window.addEventListener("userfx:private-room-view-mode", handleViewMode);

    return () => {
      observer.disconnect();
      window.removeEventListener("userfx:private-room-mood", handleMood);
      window.removeEventListener("userfx:private-room-view-mode", handleViewMode);
    };
  }, []);

  return { mood, viewMode, cameraLive };
}

function CameraSpace({ cameraLive, label }: { cameraLive: boolean; label: string }) {
  return (
    <section className="pvr-room-camera" aria-label="My camera">
      <div className="pvr-room-camera-status">
        <span className={cameraLive ? "is-live" : ""}>
{cameraLive ? "● ONCAM" : "○ OFFCAM"}
        </span>
        <small>
{label}
        </small>
      </div>
      <div className="pvr-room-camera-center">
        <span>
FX
        </span>
        <strong>
{cameraLive ? "YOUR CAMERA IS LIVE" : "YOUR CAMERA SPACE"}
        </strong>
        <small>
{cameraLive ? "Your live profile camera is active." : "Go online when you want followers to see you."}
        </small>
      </div>
      <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("userfx:open-camera-studio"))}>
{cameraLive ? "MANAGE CAM" : "GO ON CAM"}
      </button>
    </section>
  );
}

function ProfileCard({ nick, friendRequested, onFriend }: { nick: string; friendRequested: boolean; onFriend: () => void }) {
  return (
    <section className="pvr-room-profile">
      <header>
        <span>
MEMBER PROFILE
        </span>
        <small>
VERIFIED
        </small>
      </header>
      <div className="pvr-room-profile-main">
        <div className="pvr-room-avatar">
FX
        </div>
        <div>
          <h1>
{nick}
          </h1>
          <p>
Private member · live rooms · selected connections.
          </p>
        </div>
      </div>
      <div className="pvr-room-tags">
        <span>
PRIVATE CLUB
        </span>
        <span>
CREATOR
        </span>
        <span>
LIVE
        </span>
      </div>
      <div className="pvr-room-actions">
        <button type="button" className="is-primary" onClick={onFriend} disabled={friendRequested}>
{friendRequested ? "REQUEST SENT" : "ADD FRIEND"}
        </button>
        <button type="button" onClick={() => goTo("#/private-room/buzon")}>
MESSAGE
        </button>
      </div>
      <div className="pvr-room-stats">
        <span>
<strong>128</strong> FRIENDS
        </span>
        <span>
<strong>418</strong> FOLLOWERS
        </span>
        <span>
<strong>2026</strong> JOINED
        </span>
      </div>
    </section>
  );
}

function ConversationPanel() {
  return (
    <section className="pvr-room-conversation">
      <header>
        <div>
          <span>
FOLLOWERS
          </span>
          <strong>
ROOM CHAT
          </strong>
        </div>
        <small>
8 ONLINE
        </small>
      </header>
      <div className="pvr-room-chat-tabs">
        <button type="button" className="is-active">
PUBLIC
        </button>
        <button type="button" onClick={() => goTo("#/private-room/buzon")}>
PRIVATE
        </button>
      </div>
      <div className="pvr-room-chat-feed">
        {CHAT_LINES.map((line) => (
          <p key={line.user}>
            <strong>
{line.user}
            </strong>
            <span>
{line.text}
            </span>
          </p>
        ))}
      </div>
      <div className="pvr-room-chat-compose">
        <input type="text" placeholder="Write to your room..." aria-label="Write to your room" />
        <button type="button">
SEND
        </button>
      </div>
    </section>
  );
}

function StageWidget({ cameraLive }: { cameraLive: boolean }) {
  return (
    <section className="pvr-room-widget pvr-room-stage-widget">
      <header>
        <span>
STAGE WIDGET
        </span>
        <strong>
ROOMFX LIVE
        </strong>
      </header>
      <div className="pvr-room-stage-preview">
        <span className={cameraLive ? "is-live" : ""}>
{cameraLive ? "LIVE" : "READY"}
        </span>
        <strong>
VIDEOCALL STAGE
        </strong>
        <small>
Host + members
        </small>
      </div>
      <button type="button" onClick={() => goTo("#/private-room/stage")}>
OPEN STAGE
      </button>
    </section>
  );
}

function GalleryWidget({ requested, onRequest }: { requested: boolean; onRequest: () => void }) {
  return (
    <section className="pvr-room-widget pvr-room-gallery-widget">
      <header>
        <span>
GALLERY WIDGET
        </span>
        <strong>
PHOTOS
        </strong>
      </header>
      <div className="pvr-room-photo-strip">
        <span>
01
        </span>
        <span>
02
        </span>
        <span>
03
        </span>
      </div>
      <div className="pvr-room-widget-actions">
        <button type="button" onClick={() => goTo("#/private-room/gallery")}>
VIEW GALLERY
        </button>
        <button type="button" onClick={onRequest} disabled={requested}>
{requested ? "REQUEST SENT" : "REQUEST ALBUM"}
        </button>
      </div>
    </section>
  );
}

function Signals() {
  return (
    <section className="pvr-room-signals">
      <article>
        <span>
HIGHLIGHTS
        </span>
        <strong>
MEMBER SIGNALS
        </strong>
        <div>
          <small>
EARLY MEMBER
          </small>
          <small>
ROOM HOST
          </small>
          <small>
7 DAY STREAK
          </small>
          <small>
VERIFIED
          </small>
        </div>
      </article>
      <article>
        <span>
ACTIVITY
        </span>
        <strong>
RECENT SIGNALS
        </strong>
        <p>
NOW · Profile online
        </p>
        <p>
LIVE · Stage access ready
        </p>
        <p>
NEW · Profile updated
        </p>
      </article>
      <article>
        <span>
CONNECTIONS
        </span>
        <strong>
YOUR NETWORK
        </strong>
        <div className="pvr-room-network">
          <small>
MB
          </small>
          <small>
TK
          </small>
          <small>
VV
          </small>
          <small>
+12
          </small>
        </div>
        <button type="button" onClick={() => goTo("#/private-room/buzon")}>
OPEN MESSAGES
        </button>
      </article>
    </section>
  );
}

function AdminControl() {
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    try {
      return { telegramfx: true, gallery: true, chat: false, priv: false, group: false, ...JSON.parse(localStorage.getItem("userfx_admin_permissions") || "{}") };
    } catch {
      return { telegramfx: true, gallery: true, chat: false, priv: false, group: false };
    }
  });
  const [saved, setSaved] = useState(true);

  function togglePermission(key: string) {
    setSaved(false);
    setPermissions((current) => {
      const next = { ...current, [key]: !current[key] };
      try {
        localStorage.setItem("userfx_admin_permissions", JSON.stringify(next));
      } catch {}
      window.setTimeout(() => setSaved(true), 180);
      return next;
    });
  }

  return (
    <section className="pvr-room-admin pvr-admin-only" aria-label="Admin control">
      <header>
        <span>
ADMIN · CONTROL
        </span>
        <strong>
MEMBER PERMISSIONS
        </strong>
      </header>
      <div className="pvr-room-admin-permissions">
        {["telegramfx", "gallery", "chat", "priv", "group"].map((key) => (
          <button key={key} type="button" className={permissions[key] ? "is-on" : ""} onClick={() => togglePermission(key)}>
{key.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="pvr-room-admin-requests">
        <span>
REQUESTS
        </span>
        <button type="button">
ACCEPT FRIEND
        </button>
        <button type="button">
REJECT
        </button>
        <button type="button">
GRANT ALBUM
        </button>
      </div>
      <small>
{saved ? "STATE SAVED" : "SAVING..."}
      </small>
    </section>
  );
}

function CineRoom({ nick, cameraLive, friendRequested, albumRequested, onFriend, onAlbum }: RoomLayoutProps) {
  return (
    <div className="pvr-room-layout pvr-room-layout--cine">
      <div className="pvr-cine-primary">
        <CameraSpace cameraLive={cameraLive} label="CINEMA PROFILE CAM" />
        <ConversationPanel />
      </div>
      <div className="pvr-cine-profile">
        <ProfileCard nick={nick} friendRequested={friendRequested} onFriend={onFriend} />
      </div>
      <div className="pvr-cine-widgets">
        <StageWidget cameraLive={cameraLive} />
        <GalleryWidget requested={albumRequested} onRequest={onAlbum} />
      </div>
      <Signals />
      <AdminControl />
    </div>
  );
}

function VintageRoom({ nick, cameraLive, friendRequested, albumRequested, onFriend, onAlbum }: RoomLayoutProps) {
  return (
    <div className="pvr-room-layout pvr-room-layout--vintage">
      <div className="pvr-vintage-intro">
        <ProfileCard nick={nick} friendRequested={friendRequested} onFriend={onFriend} />
        <CameraSpace cameraLive={cameraLive} label="PRIVATE STUDIO" />
      </div>
      <div className="pvr-vintage-lounge">
        <ConversationPanel />
        <div className="pvr-vintage-widgets">
          <GalleryWidget requested={albumRequested} onRequest={onAlbum} />
          <StageWidget cameraLive={cameraLive} />
        </div>
      </div>
      <Signals />
      <AdminControl />
    </div>
  );
}

function ArcadeRoom({ nick, cameraLive, friendRequested, albumRequested, onFriend, onAlbum }: RoomLayoutProps) {
  return (
    <div className="pvr-room-layout pvr-room-layout--arcade">
      <div className="pvr-arcade-console">
        <CameraSpace cameraLive={cameraLive} label="PLAYER CAM" />
        <ConversationPanel />
      </div>
      <div className="pvr-arcade-rail">
        <ProfileCard nick={nick} friendRequested={friendRequested} onFriend={onFriend} />
        <StageWidget cameraLive={cameraLive} />
        <GalleryWidget requested={albumRequested} onRequest={onAlbum} />
      </div>
      <AdminControl />
      <Signals />
    </div>
  );
}

type RoomLayoutProps = {
  nick: string;
  cameraLive: boolean;
  friendRequested: boolean;
  albumRequested: boolean;
  onFriend: () => void;
  onAlbum: () => void;
};

export default function PRFX5({ nick = "@User18Fx", className = "" }: PRFX5Props) {
  const { mood, viewMode, cameraLive } = usePrivateRoomState();
  const [friendRequested, setFriendRequested] = useState(false);
  const [albumRequested, setAlbumRequested] = useState(false);

  const props: RoomLayoutProps = {
    nick,
    cameraLive,
    friendRequested,
    albumRequested,
    onFriend: () => setFriendRequested(true),
    onAlbum: () => setAlbumRequested(true),
  };

  return (
    <main className={`pvr-myroom-experience pvr-myroom-experience--${mood} pvr-view-${viewMode} ${className}`} aria-label="My Room">
      {mood === "cine" ? (
        <CineRoom {...props} />
      ) : mood === "vintage" ? (
        <VintageRoom {...props} />
      ) : (
        <ArcadeRoom {...props} />
      )}
    </main>
  );
}
