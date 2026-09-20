import {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
} from "react";

type ClubTab = "salon" | "live" | "group" | "members" | "gallery" | "messages" | "profile";

function clickButton(selector:string) {
  document.querySelector<HTMLButtonElement>(selector)?.click();
}

function scrollToSelector(selector:string) {
  document.querySelector(selector)?.scrollIntoView({
    behavior:"smooth",
    block:"start",
  });
}

function clickSideAction(label:string) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".pvr-side-actions button"));
  const target = buttons.find((button) =>
    button.querySelector("strong")?.textContent?.trim().toUpperCase() === label.toUpperCase(),
  );
  target?.click();
}

function cameraIsLive() {
  const indicator = document.querySelector<HTMLElement>(".pvr-account-online");
  return Boolean(indicator && !indicator.classList.contains("is-offline"));
}

function dockCameraForBrowse() {
  if (!cameraIsLive()) return;
  document.querySelector<HTMLButtonElement>(".pvr-camera-head > button")?.click();
}

function openProfileEditor() {
  dockCameraForBrowse();
  const launcher = document.querySelector<HTMLButtonElement>(".pvr-account-launcher");
  if (!launcher) return;
  if (!launcher.classList.contains("is-open")) launcher.click();
}

function openProfileCamera() {
  document.body.classList.remove("pvr-camera-docked");

  if (document.querySelector(".pvr-camera-studio")) return;

  const launcher = document.querySelector<HTMLButtonElement>(".pvr-account-launcher");
  if (!launcher) return;

  if (!launcher.classList.contains("is-open")) launcher.click();

  window.setTimeout(() => {
    document.querySelector<HTMLButtonElement>(".pvr-account-view")?.click();

    window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>(".pvr-profile-camera > button")?.click();
    },80);
  },80);
}

export default function PrivateRoomLuxuryNav():ReactElement {
  const [active,setActive] = useState<ClubTab>("salon");
  const [accessCode,setAccessCode] = useState("PRIVATE ACCESS");
  const [cameraLive,setCameraLive] = useState(false);

  /* ─────   ACCESS BADGE + CAMERA STATUS ─────── */
  useEffect(() => {
    const readState = () => {
      const source = document.querySelector<HTMLElement>(".pvr-live-dot");
      const value = source?.textContent?.trim();
      if (value) setAccessCode(value);
      setCameraLive(cameraIsLive());
    };

    readState();

    const observer = new MutationObserver(readState);
    observer.observe(document.body,{
      childList:true,
      subtree:true,
      characterData:true,
      attributes:true,
      attributeFilter:["class"],
    });

    return () => observer.disconnect();
  },[]);

  const goSalon = useCallback(() => {
    setActive("salon");
    dockCameraForBrowse();
    window.setTimeout(() => scrollToSelector("#videocall-stage"),30);
  },[]);

  const goLive = useCallback(() => {
    setActive("live");
    openProfileCamera();
  },[]);

  const goGroup = useCallback(() => {
    setActive("group");
    dockCameraForBrowse();
    window.setTimeout(() => scrollToSelector(".pvr-live-group"),30);
  },[]);

  const goMembers = useCallback(() => {
    setActive("members");
    dockCameraForBrowse();
    window.setTimeout(() => scrollToSelector(".pvr-live-members"),30);
  },[]);

  const goGallery = useCallback(() => {
    setActive("gallery");
    dockCameraForBrowse();
    window.setTimeout(() => scrollToSelector(".pvr-gallery-section"),30);
  },[]);

  const goMessages = useCallback(() => {
    setActive("messages");
    dockCameraForBrowse();
    window.setTimeout(() => clickSideAction("Chat"),30);
  },[]);

  const goProfile = useCallback(() => {
    setActive("profile");
    openProfileEditor();
  },[]);

  return (
    <header className="pvr-club-nav">
      <div className="pvr-club-nav-inner">
        {/* ─────   BRAND ─────── */}
        <button type="button" className="pvr-club-brand" onClick={goSalon}>
          <span className="pvr-club-brand-mark">FX</span>
          <span className="pvr-club-brand-copy">
            <strong>USER <i>FX</i></strong>
            <small>PRIVATE CLUB</small>
          </span>
        </button>

        {/* ─────   DESKTOP NAV ─────── */}
        <nav className="pvr-club-tabs" aria-label="Private club navigation">
          <button type="button" className={active === "salon" ? "is-active" : ""} onClick={goSalon}>SALON</button>
          <button type="button" className={active === "live" ? "is-active" : ""} onClick={goLive}>LIVE CAM</button>
          <button type="button" className={active === "group" ? "is-active" : ""} onClick={goGroup}>SALONS · 5</button>
          <button type="button" className={active === "members" ? "is-active" : ""} onClick={goMembers}>MEMBERS</button>
          <button type="button" className={active === "gallery" ? "is-active" : ""} onClick={goGallery}>GALLERY</button>
          <button type="button" className={active === "messages" ? "is-active" : ""} onClick={goMessages}>MESSAGES</button>
        </nav>

        {/* ─────   ACCESS + MY CAM ─────── */}
        <div className="pvr-club-actions">
          <button type="button" className="pvr-club-code" onClick={goProfile}>
            <span>MEMBER ACCESS</span>
            <strong>{accessCode}</strong>
          </button>

          <button
            type="button"
            className={`pvr-club-cam ${cameraLive ? "is-live" : ""}`}
            onClick={goLive}
          >
            <span></span>
            {cameraLive ? "ONCAM" : "OFFCAM"}
          </button>

          <button type="button" className="pvr-club-profile" onClick={goProfile}>PROFILE</button>
          <button type="button" className="pvr-club-membership" onClick={() => clickButton(".buttonupgrade")}>MEMBERSHIP</button>
        </div>
      </div>

      {/* ─────   MOBILE NAV ─────── */}
      <nav className="pvr-club-mobile-tabs" aria-label="Private club mobile navigation">
        {cameraLive && <button type="button" className="pvr-club-mobile-oncam" onClick={goLive}>● ONCAM</button>}
        <button type="button" className={active === "salon" ? "is-active" : ""} onClick={goSalon}>SALON</button>
        <button type="button" className={active === "live" ? "is-active" : ""} onClick={goLive}>LIVE</button>
        <button type="button" className={active === "group" ? "is-active" : ""} onClick={goGroup}>SALONS · 5</button>
        <button type="button" className={active === "members" ? "is-active" : ""} onClick={goMembers}>MEMBERS</button>
        <button type="button" className={active === "gallery" ? "is-active" : ""} onClick={goGallery}>GALLERY</button>
        <button type="button" className={active === "messages" ? "is-active" : ""} onClick={goMessages}>CHAT</button>
      </nav>
    </header>
  );
}
