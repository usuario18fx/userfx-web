import { useEffect, useMemo, useState } from "react";
import "./PrivateRoom.css";
/* ─────   LINKS ─────── */
const BOT_URL = "https://t.me/User18Fx_bot";
const GET_CODE_URL = "https://t.me/User18Fx_bot?start=getcode";
const VIDEOCALL_URL = "https://t.me/User18Fx_bot?start=videocall";
const SUPPORT_URL = "https://t.me/User18Fx_bot?start=support";
const USER_URL = "https://t.me/User18Fx";
const ACCESS_CODE_KEY = "userfx_access_code";
/* ─────   PRIVATE MEDIA ─────── */
const privatePhoto = (pathname) => `/api/private-media?pathname=${encodeURIComponent(pathname)}`;
const PRIVATE_PATHS = {
  basic: [
    "userfx-album/BSIC/BSIC-01.jpg",
    "userfx-album/BSIC/BSIC-02.jpg",
    "userfx-album/BSIC/BSIC-03.jpg",
    "userfx-album/BSIC/BSIC-04.jpg",
    "userfx-album/BSIC/BSIC-05.jpg",
  ],
  pro: [
    "userfx-album/PRX0/PRX0-01.jpg",
    "userfx-album/PRX0/PRX0-02.jpg",
    "userfx-album/PRX0/PRX0-03.jpg",
  ],
  vip: [
    "userfx-album/VIPX/VIPX-01.jpg",
    "userfx-album/VIPX/VIPX-02.jpg",
    "userfx-album/VIPX/VIPX-03.jpg",
    "userfx-album/VIPX/VIPX-04.jpg",
  ],
  };
/* ─────   ACCESS TYPES ─────── */
const ACCESS_META = {
  BSIC: { type: "basic",planId: "basic",accessMode: "code" },
  PRX0: { type: "pro",planId: "pro",accessMode: "code" },
  VIPX: { type: "vip",planId: "vip",accessMode: "code" },
  SPCL: { type: "spcl",planId: "vip",accessMode: "telegram_identity" },
};
/* ─────   ACCESS RULES ─────── */
const ACCESS_RULES = {
  basic: {
    videocall: true,
    upgrade: true,
    message: true,
    gallery: true,
    chat: true,
    profile: true,
    notes: true,
    report: true,
    telegramfx: true,
    priv: true,
    group: true,
    revoke: true,
  },
  pro: {
    videocall: true,
    upgrade: true,
    message: true,
    gallery: true,
    chat: true,
    profile: true,
    notes: true,
    report: true,
    telegramfx: true,
    priv: true,
    group: true,
    revoke: true,
  },
  vip: {
    videocall: true,
    upgrade: true,
    message: true,
    gallery: true,
    chat: true,
    profile: true,
    notes: true,
    report: true,
    telegramfx: true,
    priv: true,
    group: true,
    revoke: true,
  },
  spcl: {
    videocall: true,
    upgrade: true,
    message: true,
    gallery: true,
    chat: true,
    profile: true,
    notes: true,
    report: true,
    telegramfx: true,
    priv: true,
    group: true,
    revoke: true,
  },
  };
/* ─────   SIDE ACTIONS ─────── */
const SIDE_ACTIONS = [
  { key: "chat",label: "Chat",description: "Open private chat" },
  { key: "videocall",label: "Videocall",description: "Jump back to the call stage" },
  { key: "profile",label: "Profile",description: "View the active private profile" },
  { key: "notes",label: "Notes",description: "Keep private notes for this file" },
  { key: "report",label: "Report",description: "Flag this file for review" },
];
/* ─────   HELPERS ─────── */
function openExternal(url) {
  window.open(url,"_blank","noopener,noreferrer");
}
function getStoredAccessCode() {
  try {
    return String(sessionStorage.getItem(ACCESS_CODE_KEY) || "").trim().toUpperCase();
  } catch {
    return "";
  }
}
function parseAccessCode(value) {
  const match = String(value || "").trim().toUpperCase().match(/^(BSIC|PRX0|VIPX|SPCL)-([A-HJ-NP-Z2-9]{4})$/);
    if (!match) return null;
  const meta = ACCESS_META[match[1]];
    return {
      ...meta,
      prefix: match[1],
      suffix: match[2],
      code: `${match[1]}-${match[2]}`,
    };
}
function getAccessType(planId,accessMode) {
  if (accessMode === "telegram_identity") return "spcl";
  if (planId === "vip") return "vip";
  if (planId === "pro") return "pro";
  return "basic";
}
function getFallbackCode(planId,accessMode) {
  if (accessMode === "telegram_identity") return "SPCL CODE";
  if (planId === "vip") return "VIPX CODE";
  if (planId === "pro") return "PRX0 CODE";
  return "BSIC CODE";
}
function getDisplayCode(planId,accessMode) {
  const stored = parseAccessCode(getStoredAccessCode());
  const type = getAccessType(planId,accessMode);
    if (!stored) return getFallbackCode(planId,accessMode);
    if (type === "spcl" && stored.prefix === "SPCL") return stored.code;
    if (type === "vip" && stored.prefix === "VIPX") return stored.code;
    if (type === "pro" && stored.prefix === "PRX0") return stored.code;
    if (type === "basic" && stored.prefix === "BSIC") return stored.code;
  return getFallbackCode(planId,accessMode);
}
function buildPrivateFiles(planId,accessMode) {
  const paths =
    accessMode === "telegram_identity" || planId === "vip"
      ? [...PRIVATE_PATHS.basic,...PRIVATE_PATHS.pro,...PRIVATE_PATHS.vip]
      : planId === "pro"
        ? [...PRIVATE_PATHS.basic,...PRIVATE_PATHS.pro]
        : planId === "basic"
          ? PRIVATE_PATHS.basic
          : [];
    return paths.map((pathname,index) => ({
      id: index + 1,
      src: privatePhoto(pathname),
      title: `PRIVATE FILE ${String(index + 1).padStart(2,"0")}`,
    }));
}
/* ─────   MESSAGE BUTTON ─────── */
function MessageButton({ onClick,disabled }) {
  return (
    <button id="btn-message" className="button-message" type="button" onClick={onClick} disabled={disabled}>
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
/* ─────   HEART BUTTON ─────── */
function HeartButton({ checked,onChange,count }) {
  return (
    <div className="pvr-heart-wrap">
    <div className="heart-container" title="Like">
    <input type="checkbox" className="checkbox" checked={checked} onChange={onChange} aria-label="Like private file"/>
    <div className="svg-container">
    <svg viewBox="0 0 24 24" className="svg-outline" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Zm-3.585,18.4a2.973,2.973,0,0,1-3.83,0C4.947,16.006,2,11.87,2,8.967a4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,11,8.967a1,1,0,0,0,2,0,4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,22,8.967C22,11.87,19.053,16.006,13.915,20.313Z" />
    </svg>
    <svg viewBox="0 0 24 24" className="svg-filled" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Z" />
    </svg>
    <svg className="svg-celebrate" width="100" height="100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <polygon points="10,10 20,20" />
    <polygon points="10,50 20,50" />
    <polygon points="20,80 30,70" />
    <polygon points="90,10 80,20" />
    <polygon points="90,50 80,50" />
    <polygon points="80,80 70,70" />
    </svg>
    </div>
    </div>
    <span>
      {count}
    </span>
    </div>
  );
  }
/* ─────   UPGRADE BUTTON ─────── */
function UpgradeButton({ onClick,disabled }) {
  return (
    <button className="buttonupgrade" type="button" onClick={onClick} disabled={disabled}>
    <svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="m18 0 8 12 10-8-4 20H4L0 4l10 8 8-12z" />
    </svg>
      Unlock Pro
    </button>
  );
}
/* ========   PRIVATE ROOM =========================== */
export default function PrivateRoom() {
  const [selected,setSelected] = useState(0);
  const [files,setFiles] = useState([]);
  const [sessionInfo,setSessionInfo] = useState({planId: "basic",accessMode: "code",accessCode: "BSIC CODE"});
  const [likes,setLikes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("userfx_private_likes") || "{}");
    } catch {
      return {};
    }});
  const [sessionReady,setSessionReady] = useState(false);
  /* ─────   ACCESS RULES ─────── */
  const accessType = getAccessType(sessionInfo.planId,sessionInfo.accessMode);
  const accessRules = ACCESS_RULES[accessType] || ACCESS_RULES.basic;
  const canUse = (feature) => accessRules[feature] !== false;

  /* ─────   PRIVATE ACCESS SESSION ─────── */
  useEffect(() => {
  /* ─────   LOCAL DEV ACCESS ─────── */
    if (import.meta.env.DEV) {
    const stored = parseAccessCode(getStoredAccessCode());
    const planId = stored?.planId || "vip";
    const accessMode = stored?.accessMode || "telegram_identity";
    const privateFiles = buildPrivateFiles(planId,accessMode);
      setFiles(privateFiles);
      setSelected(0);
      setSessionInfo({
        planId,
        accessMode,
        accessCode: stored?.code || getFallbackCode(planId,accessMode),
      });
      setSessionReady(true);
      return;
    }
  /* ─────   PRODUCTION ACCESS ─────── */
    let cancelled = false;
    fetch("/api/access-session", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.authenticated) {
          window.location.hash = "#/";
          return;
        }
    const privateFiles = buildPrivateFiles(data.planId,data.accessMode);
        if (!privateFiles.length) {
          window.location.hash = "#/";
          return;
        }
        setFiles(privateFiles);
        setSelected(0);
        setSessionInfo({
          planId: data.planId,
          accessMode: data.accessMode,
          accessCode: getDisplayCode(data.planId,data.accessMode),
        });
        setSessionReady(true);
      })
      .catch(() => {
        if (!cancelled) {window.location.hash = "#/";
        }});
    return () => {
      cancelled = true;
    };
  }, []);
  /* ─────   SAVE LIKES ─────── */
  useEffect(() => {
    localStorage.setItem("userfx_private_likes",JSON.stringify(likes));
  }, [likes]);

  /* ─────   SELECTED FILE ─────── */
  const selectedFile = files[selected] || null;
  const totalLikes = useMemo(() => Object.values(likes).filter(Boolean).length,[likes]);
  const handleVideocall = () => {
    if (!canUse("videocall")) return;
    openExternal(VIDEOCALL_URL);
  };
  const handleUpgrade = () => {
    if (!canUse("upgrade")) return;
    openExternal(GET_CODE_URL);
  };
  const handleMessage = () => {
    if (!canUse("message")) return;
    openExternal(USER_URL);
  };
  const handleNotes = () => {
    if (!canUse("notes") || !selectedFile) return;
  const noteKey = `userfx_private_note_${selectedFile.id}`;
  const currentNote = localStorage.getItem(noteKey) || "";
  const nextNote = window.prompt(`PRIVATE NOTE · ${selectedFile.title}`,currentNote);
    if (nextNote !== null) {
      localStorage.setItem(noteKey,nextNote);
    }};
  const handleSideAction = (key) => {
    if (!canUse(key)) return;
    if (key === "chat") {
      openExternal(USER_URL);
      return;
    }
    if (key === "videocall") {
      document.getElementById("videocall-stage")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
    });
      return;
    }
    if (key === "profile") {
      openExternal(USER_URL);
      return;
    }
    if (key === "notes") {
      handleNotes();
      return;
    }
    if (key === "report") {
      openExternal(SUPPORT_URL);
    }};
   const handlePermission = (key) => {
    if (!canUse(key)) return;
    if (key === "telegramfx") {
      openExternal(BOT_URL);
      return;
    }
    if (key === "gallery") {
      document.querySelector(".pvr-gallery-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    if (key === "chat" || key === "priv") {
      openExternal(USER_URL);
      return;
  }
    if (key === "group") {
      openExternal(`${BOT_URL}?start=group`);
  }
  };
  const handleRevoke = () => {
    if (!canUse("revoke")) return;
    if (!window.confirm("EXIT PRIVATE ROOM?")) return;
    try {
      sessionStorage.removeItem(ACCESS_CODE_KEY);
    } catch {
    }
    window.location.hash = "#/";
  };
  if (!sessionReady || !selectedFile) {
   return <main className="pvr-loading">CHECKING PRIVATE ACCESS…</main>;
  }
  return (
    <main className="pvr-page" data-access={accessType}>
    <header className="pvr-topbar">
    <button className="pvr-back" type="button" onClick={() => {window.location.hash = "#/";}}>
      ← USER FX
    </button>
    <span>
      PRIVATE ROOM · ID18
    </span>
    <span className="pvr-live-dot">
      {sessionInfo.accessCode}
    </span>
    </header>
{/* ========   VIDEOCALL =========================== */}
    <section className="pvr-call-stage" id="videocall-stage">
    <div className="pvr-call-copy">
    <span className="pvr-kicker">
      PRIVATE VIDEOCALL
    </span>
    <h1>
      YOUR ROOM.
    <br />
    <em>
      YOUR CALL.
    </em>
    </h1>
    <p>
      The videocall stage is the first thing inside. Start here, then move through the private files below.
    </p>
{/* ─────   CALL ACTIONS ─────── */}
    <div className="pvr-call-actions">
    <button className="pvr-get-in" type="button" onClick={handleVideocall} disabled={!canUse("videocall")}>
      GET IN
    </button>
    <UpgradeButton onClick={handleUpgrade} disabled={!canUse("upgrade")} />
    <MessageButton onClick={handleMessage} disabled={!canUse("message")} />
    </div>
    </div>
{/* ─────   VIDEO SCREEN ─────── */}
    <div className="pvr-video-shell">
    <div className="pvr-video-screen">
    <span className="pvr-video-status">
      READY
    </span>
    <div className="pvr-video-center">
    <div className="pvr-camera-ring">
    <span />
    </div>
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
{/* ========   PRIVATE COLLECTION =========================== */}
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
    <HeartButton checked={Boolean(likes[selectedFile.id])} onChange={() => setLikes((current) => ({...current,[selectedFile.id]: !current[selectedFile.id]}))} count={totalLikes} />
    </div>
{/* ─────   WORKSPACE ─────── */}
    <div className="pvr-workspace">
    <div className="pvr-carousel" role="list">
      {files.map((file,index) => (
    <button type="button" role="listitem" key={file.id} className={`pvr-photo-card${selected === index ? " is-selected" : ""}`} onClick={() => setSelected(index)} disabled={!canUse("gallery")}>
    <img src={file.src} alt={file.title} loading={index === 0 ? "eager" : "lazy"} />
    <span>
      {file.title}
    </span>
    </button>
      ))}
    </div>
{/* ─────   SIDE MENU ─────── */}
    <aside className="pvr-side-menu">
    <div className="pvr-selected-preview">
    <img src={selectedFile.src} alt={selectedFile.title} />
    <div>
    <span>
      SELECTED
    </span>
    <strong>
      {selectedFile.title}
    </strong>
    </div>
    </div>
{/* ─────   SIDE ACTIONS ─────── */}
    <div className="pvr-side-actions">
      {SIDE_ACTIONS.map((action) => (
    <button type="button" key={action.key} onClick={() => handleSideAction(action.key)} disabled={!canUse(action.key)}>
    <strong>
      {action.label}
    </strong>
    <span>
      {action.description}
    </span>
    </button>
      ))}
    </div>
{/* ─────   PERMISSION PANEL ─────── */}
    <div className="pvr-permission-panel">
    <button type="button" className="pvr-permission pvr-permission--wide" onClick={() => handlePermission("telegramfx")} disabled={!canUse("telegramfx")}>
      ᴛᴇʟᴇɢʀᴀᴍꜰx
    </button>
    <div className="pvr-permission-row">
    <button type="button" className="pvr-permission" onClick={() => handlePermission("gallery")} disabled={!canUse("gallery")}>
      ɢᴀʟʟᴇʀʏ 
    </button>
    <button type="button" className="pvr-permission" onClick={() => handlePermission("chat")} disabled={!canUse("chat")}>
      ʀᴇᴄᴏʀᴅɪɴɢ
    </button>
    </div>
    <div className="pvr-permission-row">
    <button type="button" className="pvr-permission" onClick={() => handlePermission("priv")} disabled={!canUse("priv")}>
      ᴘʀɪᴠ
    </button>
    <button type="button" className="pvr-permission" onClick={() => handlePermission("group")} disabled={!canUse("group")}>
      ɢʀᴏᴜᴘ
    </button>
    </div>
    </div>
    </aside>
    </div>
    </section>
    </main>
  );
}