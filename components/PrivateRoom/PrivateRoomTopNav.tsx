import { useCallback, useEffect, useState } from "react";
import "./PrivateRoomTopNav.css";

const HOME_URL = "https://user18fx.com";

const NAV_ITEMS = [
  {label:"INICIO",route:HOME_URL,external:true},
  {label:"MYROOM",route:"#/private-room"},
  {label:"STAGE",route:"#/private-room/stage"},
  {label:"GALLERY",route:"#/private-room/gallery"},
  {label:"BUZON",route:"#/private-room/buzon"},
] as const;

function cameraIsLive() {
  const indicator = document.querySelector<HTMLElement>(".pvr-account-online");
  return Boolean(indicator && !indicator.classList.contains("is-offline"));
}

function openProfile() {
  const launcher = document.querySelector<HTMLButtonElement>(".pvr-account-launcher");
  if (launcher && !launcher.classList.contains("is-open")) launcher.click();
}

function openCamera() {
  window.dispatchEvent(new CustomEvent("userfx:open-camera-studio"));
}

function openMembership() {
  document.querySelector<HTMLButtonElement>(".buttonupgrade")?.click();
}

function clearLocalAccessState() {
  try {
    ["vault_unlocked","vault_plan","userfx_access_code","memberAccess"].forEach((key) => sessionStorage.removeItem(key));
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("userfx_browser_handoff:")) sessionStorage.removeItem(key);
    });
  } catch {
  }
}

async function logout() {
  try {
    await fetch("/api/access-session",{
      method:"DELETE",
      headers:{Accept:"application/json"},
      credentials:"same-origin",
      cache:"no-store",
    });
  } catch {
  }

  clearLocalAccessState();
  window.location.assign(HOME_URL);
}

export default function PrivateRoomTopNav() {
  const [route,setRoute] = useState(() => window.location.hash || "#/private-room");
  const [accessCode,setAccessCode] = useState("PRIVATE ACCESS");
  const [cameraLive,setCameraLive] = useState(false);

  const readLiveState = useCallback(() => {
    const access = document.querySelector<HTMLElement>(".pvr-live-dot")?.textContent?.trim();
    if (access) setAccessCode(access);
    setCameraLive(cameraIsLive());
  },[]);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash || "#/private-room");
    window.addEventListener("hashchange",handleHashChange);
    return () => window.removeEventListener("hashchange",handleHashChange);
  },[]);

  useEffect(() => {
    readLiveState();
    const observer = new MutationObserver(readLiveState);
    observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["class"]});
    return () => observer.disconnect();
  },[readLiveState]);

  function navigate(item:(typeof NAV_ITEMS)[number]) {
    if (item.external) {
      window.location.assign(item.route);
      return;
    }
    window.location.hash = item.route;
  }

  return (
    <header className="pvr-club-nav pvr-club-nav--unified">
      <div className="pvr-club-nav-inner">
        <button type="button" className="pvr-club-brand" onClick={() => { window.location.hash = "#/private-room"; }}>
          <span className="pvr-club-brand-mark">
            FX
          </span>
          <span className="pvr-club-brand-copy">
            <strong>
              USER <i>FX</i>
            </strong>
            <small>
              PRIVATE CLUB
            </small>
          </span>
        </button>
        <nav className="pvr-club-tabs" aria-label="Private Room navigation">
          {NAV_ITEMS.map((item) => (
            <button key={item.label} type="button" className={!item.external && route === item.route ? "is-active" : ""} onClick={() => navigate(item)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="pvr-club-actions">
          <button type="button" className="pvr-club-code" onClick={openProfile}>
            <span>
              MEMBER ACCESS
            </span>
            <strong>
              {accessCode}
            </strong>
          </button>
          <button type="button" className={`pvr-club-cam ${cameraLive ? "is-live" : ""}`} onClick={openCamera}>
            <span />
            {cameraLive ? "ONCAM" : "OFFCAM"}
          </button>
          <button type="button" className="pvr-club-profile" onClick={openProfile}>
            PROFILE
          </button>
          <button type="button" className="pvr-club-membership" onClick={openMembership}>
            <svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="m18 0 8 12 10-8-4 20H4L0 4l10 8 8-12z" />
            </svg>
            <span>
              ᴍᴇᴍʙᴇʀꜱʜɪᴘ
            </span>
          </button>
          <button type="button" className="pvr-club-logout" onClick={logout}>
            LOG OUT
          </button>
        </div>
      </div>
      <nav className="pvr-club-mobile-tabs" aria-label="Private Room mobile navigation">
        {cameraLive && (
          <button type="button" className="pvr-club-mobile-oncam" onClick={openCamera}>
            ● ONCAM
          </button>
        )}
        {NAV_ITEMS.map((item) => (
          <button key={item.label} type="button" className={!item.external && route === item.route ? "is-active" : ""} onClick={() => navigate(item)}>
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
