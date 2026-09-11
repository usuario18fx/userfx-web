import { useEffect, useMemo, useState } from "react";
import "./PrivateRoom.css";

const FILES = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  src: `/assets/album/PRVW/PRVW-${String((index % 3) + 1).padStart(2, "0")}.jpg`,
  title: `PRIVATE FILE ${String(index + 1).padStart(2, "0")}`,
}));

const SIDE_ACTIONS = [
  ["Chat", "Open private chat"],
  ["Videocall", "Jump back to the call stage"],
  ["Profile", "View the active private profile"],
  ["Notes", "Keep private notes for this file"],
  ["Report", "Flag this file for review"],
];

function MessageButton() {
  return (
      <button id="btn-message" className="button-message" type="button">
      <div className="content-avatar">
      <div className="status-user" />
      <div className="avatar">
      <svg className="user-img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12,12.5c-3.04,0-5.5,1.73-5.5,3.5s2.46,3.5,5.5,3.5,5.5-1.73,5.5-3.5-2.46-3.5-5.5-3.5Zm0-.5c1.66,0,3-1.34,3-3s-1.34-3-3-3-3,1.34-3,3,1.34,3,3,3Z" />
      </svg>
      </div>
      </div>
      <div className="notice-content">
      <div className="username">
        User FX
      </div>
      <div className="lable-message">
        Message
      <span className="number-message">
        3
      </span>
      </div>
      <div className="user-id">
        @User18Fx
      </div>
      </div>
      </button>
  );
}

function HeartButton({ checked, onChange, count }) {
  return (
    <div className="pvr-heart-wrap">
      <div className="heart-container" title="Like">
        <input type="checkbox" className="checkbox" checked={checked} onChange={onChange} aria-label="Like private file" />
        <div className="svg-container">
          <svg viewBox="0 0 24 24" className="svg-outline" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Zm-3.585,18.4a2.973,2.973,0,0,1-3.83,0C4.947,16.006,2,11.87,2,8.967a4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,11,8.967a1,1,0,0,0,2,0,4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,22,8.967C22,11.87,19.053,16.006,13.915,20.313Z" />
          </svg>
          <svg viewBox="0 0 24 24" className="svg-filled" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Z" />
          </svg>
          <svg className="svg-celebrate" width="100" height="100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <polygon points="10,10 20,20"/><polygon points="10,50 20,50"/><polygon points="20,80 30,70"/>
            <polygon points="90,10 80,20"/><polygon points="90,50 80,50"/><polygon points="80,80 70,70"/>
          </svg>
        </div>
      </div>
      <span>{count}</span>
    </div>
  );
}

function UpgradeButton() {
  return (
    <button className="buttonupgrade" type="button">
      <svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="m18 0 8 12 10-8-4 20H4L0 4l10 8 8-12z" />
      </svg>
      Unlock Pro
    </button>
  );
}

export default function PrivateRoom() {
  const [selected, setSelected] = useState(0);
  const [likes, setLikes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("userfx_private_likes") || "{}"); }
    catch { return {}; }
  });
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/access-session", { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.authenticated) {
          window.location.hash = "#/";
          return;
        }
        setSessionReady(true);
      })
      .catch(() => { if (!cancelled) window.location.hash = "#/"; });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    localStorage.setItem("userfx_private_likes", JSON.stringify(likes));
  }, [likes]);
  const selectedFile = FILES[selected];
  const totalLikes = useMemo(() => Object.values(likes).filter(Boolean).length, [likes]);
  if (!sessionReady) {
   return <main className="pvr-loading">
            CHECKING PRIVATE ACCESS…
          </main>;
  }

  return (
          <main className="pvr-page">
          <header className="pvr-topbar">
          <button className="pvr-back" type="button" onClick={() => { window.location.hash = "#/"; }}>
            ← USER FX
          </button>
          <span>
            PRIVATE ROOM · ID18
          </span>
          <span className="pvr-live-dot">
           ONLINE</span>
          </header>
          <section className="pvr-call-stage" id="videocall-stage">
          <div className="pvr-call-copy">
          <span className="pvr-kicker">
            PRIVATE VIDEOCALL
          </span>
          <h1>
           YOUR ROOM.
          <br/><em>
           YOUR CALL.
          </em></h1>
          <p>
           The videocall stage is the first thing inside. Start here, then move through the private files below. 
          </p>
          <div className="pvr-call-actions">
          <button className="pvr-get-in" type="button">GET IN</button>
    <UpgradeButton />
    <MessageButton />
          </div>
          </div>
          <div className="pvr-video-shell">
          <div className="pvr-video-screen">
          <span className="pvr-video-status">READY</span>
          <div className="pvr-video-center">
          <div className="pvr-camera-ring"><span /></div>
          <strong>
            VIDEOCALL STAGE
          </strong>
          <small>
            PRIVATE SESSION READY
          </small>
          </div>
          </div>
          </div>
          </section>
      <section className="pvr-gallery-section">
          <div className="pvr-section-head">
          <div>
          <span>
           PRIVATE COLLECTION
          </span>
          <h2>
            SELECT A FILE
          </h2>
          </div>
    <HeartButton checked={Boolean(likes[selectedFile.id])} onChange={() => setLikes((current) => ({ ...current, [selectedFile.id]: !current[selectedFile.id] }))} count={totalLikes}/>
          </div>
          <div className="pvr-workspace">
          <div className="pvr-carousel" role="list">
            {FILES.map((file, index) => (
          <button type="button" role="listitem" key={file.id} className={`pvr-photo-card${selected === index ? " is-selected" : ""}`} onClick={() => setSelected(index)}>
          <img src={file.src} alt={file.title} />
          <span>{file.title}</span>
          </button>
            ))}
          </div>
          <aside className="pvr-side-menu">
          <div className="pvr-selected-preview">
          <img src={selectedFile.src} alt={selectedFile.title} />
          <div><span>
           SELECTED
          </span>
          <strong>
            {selectedFile.title}
          </strong></div>
          </div>
          <div className="pvr-side-actions">
           {SIDE_ACTIONS.map(([label, description]) => (
          <button type="button" key={label}>
          <strong>
            {label}</strong>
          <span>
            {description}</span>
          </button>
            ))}
          </div>
          <div className="pvr-permission-panel">
          <button type="button" className="pvr-permission pvr-permission--wide">
            TelegramFX
          </button>
          <div className="pvr-permission-row"><button type="button" className="pvr-permission">
            Gallery
          </button><button type="button" className="pvr-permission">
            Chat
          </button></div>
          <div className="pvr-permission-row"><button type="button" className="pvr-permission">
            Priv
          </button><button type="button" className="pvr-permission">
            Group
          </button>
          <button type="button" className="pvr-permission pvr-permission--revoke">
            REVOKE ALL
          </button>
          </div>
          </div>
          </aside>
          </div>
          </section>
          </main>
  );
}
