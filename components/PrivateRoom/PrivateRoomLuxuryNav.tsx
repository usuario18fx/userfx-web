import {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
} from "react";

type ClubTab = "salon" | "live" | "members" | "gallery" | "messages" | "profile";

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

function openProfileEditor() {
  const launcher = document.querySelector<HTMLButtonElement>(".pvr-account-launcher");
  if (!launcher) return;
  if (!launcher.classList.contains("is-open")) launcher.click();
}

function openProfileCamera() {
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

  /* ─────   ACCESS BADGE ─────── */
  useEffect(() => {
    const readAccess = () => {
      const source = document.querySelector<HTMLElement>(".pvr-live-dot");
      const value = source?.textContent?.trim();
      if (value) setAccessCode(value);
    };

    readAccess();

    const observer = new MutationObserver(readAccess);
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});

    return () => observer.disconnect();
  },[]);

  const goSalon = useCallback(() => {
    setActive("salon");
    scrollToSelector("#videocall-stage");
  },[]);

  const goLive = useCallback(() => {
    setActive("live");
    openProfileCamera();
  },[]);

  const goMembers = useCallback(() => {
    setActive("members");
    scrollToSelector(".pvr-live-members");
  },[]);

  const goGallery = useCallback(() => {
    setActive("gallery");
    scrollToSelector(".pvr-gallery-section");
  },[]);

  const goMessages = useCallback(() => {
    setActive("messages");
    clickSideAction("Chat");
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
          <button type="button" className={active === "members" ? "is-active" : ""} onClick={goMembers}>MEMBERS</button>
          <button type="button" className={active === "gallery" ? "is-active" : ""} onClick={goGallery}>GALLERY</button>
          <button type="button" className={active === "messages" ? "is-active" : ""} onClick={goMessages}>MESSAGES</button>
        </nav>

        {/* ─────   ACCESS ─────── */}
        <div className="pvr-club-actions">
          <button type="button" className="pvr-club-code" onClick={goProfile}>
            <span>MEMBER ACCESS</span>
            <strong>{accessCode}</strong>
          </button>
          <button type="button" className="pvr-club-profile" onClick={goProfile}>PROFILE</button>
          <button type="button" className="pvr-club-membership" onClick={() => clickButton(".buttonupgrade")}>MEMBERSHIP</button>
        </div>
      </div>

      {/* ─────   MOBILE NAV ─────── */}
      <nav className="pvr-club-mobile-tabs" aria-label="Private club mobile navigation">
        <button type="button" className={active === "salon" ? "is-active" : ""} onClick={goSalon}>SALON</button>
        <button type="button" className={active === "live" ? "is-active" : ""} onClick={goLive}>LIVE</button>
        <button type="button" className={active === "members" ? "is-active" : ""} onClick={goMembers}>MEMBERS</button>
        <button type="button" className={active === "gallery" ? "is-active" : ""} onClick={goGallery}>GALLERY</button>
        <button type="button" className={active === "profile" ? "is-active" : ""} onClick={goProfile}>PROFILE</button>
      </nav>
    </header>
  );
}
