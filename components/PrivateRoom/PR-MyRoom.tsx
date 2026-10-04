"use client";

import { useEffect, useState } from "react";
import "./PR-MyRoom.css";

export type Tab = "muro" | "gente" | "salas" | "perfil";
export type PrivateRoomMood = "cine" | "vintage" | "arcade";

export type PRFX5Props = {
  nick?: string;
  initialTab?: Tab;
  className?: string;
};

const MOOD_KEY = "userfx_private_room_mood";
const MOODS: readonly PrivateRoomMood[] = ["cine", "vintage", "arcade"];

function readMood(): PrivateRoomMood {
  try {
    const value = localStorage.getItem(MOOD_KEY);
    return value === "vintage" || value === "arcade" ? value : "cine";
  } catch {
    return "cine";
  }
}

function applyMood(mood: PrivateRoomMood) {
  document.documentElement.dataset.pvrMood = mood;
  try {
    localStorage.setItem(MOOD_KEY, mood);
  } catch {}
  window.dispatchEvent(new CustomEvent("userfx:private-room-mood", { detail: mood }));
}

function goTo(hash: string) {
  window.location.hash = hash;
}

export default function PRFX5({ nick = "@User18Fx", className = "" }: PRFX5Props) {
  const [mood, setMood] = useState<PrivateRoomMood>(() => readMood());
  const [friendRequested, setFriendRequested] = useState(false);
  const [albumRequested, setAlbumRequested] = useState(false);
  const [cameraLive, setCameraLive] = useState(false);

  useEffect(() => {
    applyMood(mood);
  }, [mood]);

  useEffect(() => {
    const readCamera = () => {
      const indicator = document.querySelector<HTMLElement>(".pvr-account-online");
      setCameraLive(Boolean(indicator && !indicator.classList.contains("is-offline")));
    };
    readCamera();
    const observer = new MutationObserver(readCamera);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <main className={`pvr-myroom-social ${className}`} aria-label="My Room profile">
      <header className="pvr-myroom-hero">
        <div className="pvr-myroom-hero-copy">
          <span className="pvr-myroom-kicker">
USER FX · PRIVATE CLUB
          </span>
          <h1>
MY ROOM
          </h1>
          <p>
Your profile, connections and private-room activity.
          </p>
        </div>
        <div className="pvr-myroom-mood-switch" role="group" aria-label="Private Room visual mood">
          {MOODS.map((option) => (
            <button key={option} type="button" className={mood === option ? "is-active" : ""} onClick={() => setMood(option)}>
{option.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <section className="pvr-myroom-layout">
        <article className="pvr-profile-card">
          <div className={`pvr-profile-visual ${cameraLive ? "is-live" : ""}`}>
            <div className="pvr-profile-avatar" aria-hidden="true">
FX
            </div>
            <span className="pvr-profile-state">
{cameraLive ? "ONCAM" : "ONLINE"}
            </span>
          </div>
          <div className="pvr-profile-body">
            <div className="pvr-profile-identity">
              <div>
                <span>
MEMBER PROFILE
                </span>
                <h2>
{nick}
                </h2>
              </div>
              <span className="pvr-profile-verified">
VERIFIED
              </span>
            </div>
            <p className="pvr-profile-bio">
Private member · Hamilton / Toronto network · here for good conversations, live rooms and selected connections.
            </p>
            <div className="pvr-profile-tags" aria-label="Profile interests">
              <span>
PRIVATE CLUB
              </span>
              <span>
LIVE
              </span>
              <span>
CREATOR
              </span>
            </div>
            <div className="pvr-profile-actions">
              <button type="button" className="is-primary" onClick={() => setFriendRequested(true)} disabled={friendRequested}>
{friendRequested ? "REQUEST SENT" : "ADD FRIEND"}
              </button>
              <button type="button" onClick={() => goTo("#/private-room/buzon")}>
MESSAGE
              </button>
              {cameraLive ? (
                <button type="button" className="is-live" onClick={() => goTo("#/private-room/stage")}>
JOIN LIVE
                </button>
              ) : null}
            </div>
            <dl className="pvr-profile-stats">
              <div>
                <dt>
FRIENDS
                </dt>
                <dd>
128
                </dd>
              </div>
              <div>
                <dt>
FOLLOWERS
                </dt>
                <dd>
418
                </dd>
              </div>
              <div>
                <dt>
JOINED
                </dt>
                <dd>
2026
                </dd>
              </div>
            </dl>
          </div>
        </article>

        <aside className="pvr-myroom-side">
          <article className="pvr-myroom-widget pvr-stage-widget">
            <header>
              <span>
STAGE WIDGET
              </span>
              <strong>
ROOMFX LIVE
              </strong>
            </header>
            <div className="pvr-stage-widget-screen">
              <span className={cameraLive ? "is-live" : ""}>
{cameraLive ? "LIVE" : "READY"}
              </span>
              <strong>
{cameraLive ? "Your camera is active" : "Stage is standing by"}
              </strong>
              <small>
Open the dedicated Stage for the full videocall experience.
              </small>
            </div>
            <button type="button" onClick={() => goTo("#/private-room/stage")}>
OPEN STAGE
            </button>
          </article>

          <article className="pvr-myroom-widget pvr-gallery-widget">
            <header>
              <span>
PHOTOS WIDGET
              </span>
              <strong>
PROFILE PHOTOS
              </strong>
            </header>
            <div className="pvr-photo-preview" aria-label="Profile photo previews">
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
            <div className="pvr-gallery-widget-actions">
              <button type="button" onClick={() => goTo("#/private-room/gallery")}>
VIEW GALLERY
              </button>
              <button type="button" className="is-secondary" onClick={() => setAlbumRequested(true)} disabled={albumRequested}>
{albumRequested ? "REQUEST SENT" : "REQUEST ALBUM"}
              </button>
            </div>
          </article>
        </aside>
      </section>

      <section className="pvr-myroom-lower">
        <article className="pvr-myroom-panel">
          <header>
            <span>
HIGHLIGHTS
            </span>
            <strong>
MEMBER SIGNALS
            </strong>
          </header>
          <div className="pvr-highlight-grid">
            <span>
EARLY MEMBER
            </span>
            <span>
ROOM HOST
            </span>
            <span>
7 DAY STREAK
            </span>
            <span>
VERIFIED
            </span>
          </div>
        </article>

        <article className="pvr-myroom-panel">
          <header>
            <span>
ACTIVITY
            </span>
            <strong>
RECENT SIGNALS
            </strong>
          </header>
          <div className="pvr-activity-list">
            <p>
<span>NOW</span> Profile online
            </p>
            <p>
<span>LIVE</span> Stage access ready
            </p>
            <p>
<span>NEW</span> Profile photo updated
            </p>
          </div>
        </article>

        <article className="pvr-myroom-panel pvr-connections-panel">
          <header>
            <span>
CONNECTIONS
            </span>
            <strong>
YOUR NETWORK
            </strong>
          </header>
          <div className="pvr-connection-row">
            <span>
MB
            </span>
            <span>
TK
            </span>
            <span>
VV
            </span>
            <span>
+12
            </span>
          </div>
          <button type="button" onClick={() => goTo("#/private-room/buzon")}>
OPEN MESSAGES
          </button>
        </article>
      </section>
    </main>
  );
}
