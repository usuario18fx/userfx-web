import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {createPortal} from "react-dom";
import PrivateRoomDirectGate from "./PrivateRoomDirectGate";
import PrivateRoomAccount from "./PrivateRoomAccount";
import "./PrivateRoomLiveLobby.css";
import "./PrivateRoomMyCamDock.css";
import "./PrivateRoomWelcomeTour.css";
import "./PrivateRoomLuxury.css";
import "./PrivateRoomUnified.css";


/* ═══════════ USER FX · LOCAL PRIVATE ROOM SESSION ═══════════ */

const DEV_ACCESS_PATH = "/api/access-session";
const DEV_SESSION = Object.freeze({
  ok:true,
  authenticated:true,
  accountId:"usr_DEV_USER18FX",
  telegramUsername:"@User18Fx",
  planId:"vip",
  accessMode:"telegram_identity",
  accessLabel:"SPCL",
  memberAccess:true,
  maxAccesses:null,
  usedAccesses:0,
  remainingAccesses:null,
  unlimitedAccess:true,
  expiresAt:null,
});

if (import.meta.env.DEV && typeof window !== "undefined") {
  const devWindow = window as typeof window & {
    __userfxPrivateRoomDevFetch?:boolean;
  };

  if (!devWindow.__userfxPrivateRoomDevFetch) {
    const nativeFetch = window.fetch.bind(window);

    const devFetch:typeof window.fetch = async (input,init) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      const requestMethod = String(
        init?.method || (input instanceof Request ? input.method : "GET"),
      ).toUpperCase();

      try {
        const url = new URL(requestUrl,window.location.origin);

        if (url.pathname === DEV_ACCESS_PATH && requestMethod === "GET") {
          return new Response(JSON.stringify(DEV_SESSION),{
            status:200,
            headers:{
              "Content-Type":"application/json",
              "Cache-Control":"no-store",
            },
          });
        }
      } catch {
        // Fall through to the real request.
      }

      return nativeFetch(input,init);
    };

    window.fetch = devFetch;
    devWindow.__userfxPrivateRoomDevFetch = true;
  }
}

type ClubTab = "salon" | "live" | "group" | "members" | "gallery" | "messages" | "profile";
type LobbySection = "live" | "group" | "scheduled" | "members";
type CameraVisibility = "private" | "public";
type DockPosition = {x:number;y:number};
type TourStep = {
  kicker:string;
  title:string;
  text:string;
  action?:string;
};

const POSITION_KEY = "userfx_mycam_position";
const EDGE_GAP = 10;
const TOUR_KEY = "userfx_pvr_onboarding_v2";

const STEPS:readonly TourStep[] = [
  {
    kicker:"WELCOME",
    title:"YOUR PRIVATE CLUB",
    text:"Salon, live camera, members, private gallery and your profile now live inside one private member space.",
  },
  {
    kicker:"MY CAM",
    title:"CAMERA AS DEFAULT VIEW",
    text:"Start your camera, choose PRIVATE or PUBLIC, then close the studio. Your live preview stays docked while you browse the club.",
    action:"OPEN CAMERA",
  },
  {
    kicker:"SALONS · 5",
    title:"BUILD A PRIVATE CIRCLE",
    text:"Your salon starts with you as host. Invite up to four members and keep the camera private to your group when the room layer is connected.",
    action:"VIEW SALON",
  },
  {
    kicker:"MEMBERS",
    title:"DISCOVER WHO IS ONLINE",
    text:"Member presence, public cameras and private requests will appear in the network as the live presence backend is connected.",
    action:"VIEW MEMBERS",
  },
  {
    kicker:"PRIVATE MEDIA",
    title:"YOUR GALLERY STAYS PROTECTED",
    text:"The existing private gallery, access rules and forensic watermark system remain part of the same PrivateRoom.",
    action:"VIEW GALLERY",
  },
  {
    kicker:"READY",
    title:"BROWSE WITHOUT LEAVING CAM",
    text:"Use the dock to manage visibility, reopen the camera studio, open your profile or turn the camera off at any time.",
  },
] as const;

/* ═══════════ SHARED PRIVATE ROOM HELPERS ═══════════ */

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

/* ========   PRIVATE CLUB NAV =========================== */

function PrivateRoomLuxuryNav():ReactElement {
  const [active,setActive] = useState<ClubTab>("salon");
  const [accessCode,setAccessCode] = useState("PRIVATE ACCESS");
  const [cameraLive,setCameraLive] = useState(false);

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

/* ========   LIVE LOBBY =========================== */

function PrivateRoomLiveLobby():ReactElement | null {
  const [target,setTarget] = useState<HTMLElement | null>(null);
  const [cameraLive,setCameraLive] = useState(false);
  const [section,setSection] = useState<LobbySection>("live");

  useEffect(() => {
    const resolveTarget = () => {
      const node = document.getElementById("videocall-stage");
      if (node) setTarget(node);
    };

    resolveTarget();

    const observer = new MutationObserver(resolveTarget);
    observer.observe(document.body,{childList:true,subtree:true});

    return () => observer.disconnect();
  },[]);

  useEffect(() => {
    const readCameraState = () => setCameraLive(cameraIsLive());
    readCameraState();

    const observer = new MutationObserver(readCameraState);
    observer.observe(document.body,{
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class"],
    });

    return () => observer.disconnect();
  },[]);

  const handleSection = useCallback((next:LobbySection) => {
    setSection(next);
    const selector =
      next === "group"
        ? ".pvr-live-group"
        : next === "scheduled"
          ? ".pvr-live-upcoming"
          : next === "members"
            ? ".pvr-live-members"
            : ".pvr-live-feature";

    document.querySelector(selector)?.scrollIntoView({
      behavior:"smooth",
      block:"nearest",
    });
  },[]);

  if (!target) return null;

  return createPortal(
    <div className="pvr-live-home">
      {/* ========   LIVE HOME HEADER =========================== */}
      <header className="pvr-live-home-head">
        <div>
          <span>USER FX · PRIVATE VIDEO NETWORK</span>
          <h1>LIVE ROOM</h1>
        </div>

        <div className="pvr-live-network-status">
          <span></span>
          NETWORK READY
        </div>
      </header>

      {cameraLive && (
        <div className="pvr-live-oncam">
          <div className="pvr-live-oncam-copy">
            <span className="pvr-live-oncam-icon">CAM</span>
            <div>
              <strong>You are on camera</strong>
              <small>Your active camera is visible to the network according to the privacy mode you selected.</small>
            </div>
          </div>
          <button type="button" onClick={openProfileCamera}>MANAGE CAMERA</button>
        </div>
      )}

      {/* ─────   LIVE + MY CAMERA ─────── */}
      <div className="pvr-live-grid">
        <section className="pvr-live-feature" aria-label="Live now">
          <div className="pvr-live-section-head">
            <div>
              <span>LIVE NOW</span>
              <strong>PUBLIC CAMS</strong>
            </div>
            <small>0 LIVE</small>
          </div>

          <div className="pvr-live-feature-screen">
            <div className="pvr-live-signal-ring" aria-hidden="true">
              <span></span>
            </div>
            <strong>NO PUBLIC CAMS LIVE</strong>
            <p>When a member starts a public camera, the stream will appear here.</p>
            <div className="pvr-live-signal-meta">
              <span>WEBRTC</span>
              <span>PRIVATE NETWORK</span>
              <span>READY</span>
            </div>
          </div>
        </section>

        <aside className={`pvr-live-self ${cameraLive ? "is-live" : ""}`} aria-label="Your camera">
          <div className="pvr-live-self-head">
            <span>YOUR CAMERA</span>
            <small>{cameraLive ? "● ON CAM" : "○ OFFLINE"}</small>
          </div>

          <div className="pvr-live-self-avatar">
            FX
            <span className={cameraLive ? "is-live" : ""}></span>
          </div>

          <strong>@User18Fx</strong>
          <p>
            {cameraLive
              ? "Your profile camera is active."
              : "Start your camera and choose private or public visibility."}
          </p>

          <button type="button" className="pvr-live-go-online" onClick={openProfileCamera}>
            {cameraLive ? "MANAGE CAM" : "GO ONLINE"}
          </button>

          <button type="button" className="pvr-live-profile-link" onClick={openProfileEditor}>
            PROFILE
          </button>
        </aside>
      </div>

      {/* ─────   PEOPLE ONLINE ─────── */}
      <section className="pvr-live-members" aria-label="People online">
        <div className="pvr-live-section-head">
          <div>
            <span>PEOPLE ONLINE</span>
            <strong>MEMBER NETWORK</strong>
          </div>
          <small>0 DISCOVERABLE</small>
        </div>

        <div className="pvr-live-members-grid">
          <div className="pvr-live-member-empty">
            <span className="pvr-live-member-dot"></span>
            <strong>MEMBER PRESENCE</strong>
            <small>Online members will appear here.</small>
          </div>
          <div className="pvr-live-member-empty">
            <span className="pvr-live-member-dot"></span>
            <strong>PUBLIC CAMS</strong>
            <small>Watch buttons appear when streams are available.</small>
          </div>
          <div className="pvr-live-member-empty">
            <span className="pvr-live-member-dot"></span>
            <strong>PRIVATE REQUESTS</strong>
            <small>Invite-only cameras stay protected.</small>
          </div>
        </div>
      </section>

      {/* ========   GROUP SALON =========================== */}
      <section className="pvr-live-group" aria-label="Group salon">
        <div className="pvr-live-section-head">
          <div>
            <span>PRIVATE SALON</span>
            <strong>GROUP OF FIVE</strong>
          </div>
          <small>1 / 5 SEATS</small>
        </div>

        <div className="pvr-group-layout">
          <div className="pvr-group-stage">
            <div className="pvr-group-grid">
              <div className={`pvr-group-seat is-host ${cameraLive ? "is-oncam" : ""}`}>
                <span className="pvr-group-avatar">FX</span>
                <strong>YOU · HOST</strong>
                <small>{cameraLive ? "ON CAM" : "OFF CAM"}</small>
              </div>

              {[1,2,3,4].map((seat) => (
                <div className="pvr-group-seat" key={seat}>
                  <span className="pvr-group-avatar">+</span>
                  <strong>OPEN SEAT</strong>
                  <small>INVITE MEMBER</small>
                </div>
              ))}
            </div>
          </div>

          <aside className="pvr-group-builder">
            <span>GROUP SESSION</span>
            <strong>Build your salon</strong>
            <p>Invite up to four members. The room becomes available when the group circle is complete.</p>

            <div className="pvr-group-progress-head">
              <span>TEAM PROGRESS</span>
              <strong>1 / 5</strong>
            </div>
            <div className="pvr-group-progress"><span></span></div>

            <div className="pvr-group-actions">
              <button type="button" className="pvr-group-invite" onClick={() => handleSection("members")}>
                INVITE MEMBERS
              </button>
              <button type="button" className="pvr-group-camera" onClick={openProfileCamera}>
                {cameraLive ? "MANAGE CAMERA" : "GO ON CAM"}
              </button>
            </div>

            <div className="pvr-group-waiting">WAITING FOR 4 MEMBERS</div>
          </aside>
        </div>
      </section>

      {/* ─────   UPCOMING ─────── */}
      <section className="pvr-live-upcoming" aria-label="Upcoming rooms">
        <div className="pvr-live-section-head">
          <div>
            <span>UPCOMING</span>
            <strong>SCHEDULED ROOMS</strong>
          </div>
          <small>NEXT ROOM</small>
        </div>

        <div className="pvr-live-event">
          <div className="pvr-live-event-date">
            <span>FRI</span>
            <strong>22:00</strong>
            <small>UTC</small>
          </div>

          <div className="pvr-live-event-copy">
            <span>USER FX ROOM</span>
            <strong>PRIVATE FRIDAY SESSION</strong>
            <small>Scheduled room · member access</small>
          </div>

          <button type="button" disabled>SCHEDULED</button>
        </div>
      </section>

      {/* ─────   LIVE NAV ─────── */}
      <nav className="pvr-live-nav" aria-label="Video network navigation">
        <button type="button" className={section === "live" ? "is-active" : ""} onClick={() => handleSection("live")}>LIVE</button>
        <button type="button" className={section === "group" ? "is-active" : ""} onClick={() => handleSection("group")}>GROUP</button>
        <button type="button" className={section === "scheduled" ? "is-active" : ""} onClick={() => handleSection("scheduled")}>SCHEDULED</button>
        <button type="button" className={section === "members" ? "is-active" : ""} onClick={() => handleSection("members")}>MEMBERS</button>
        <button type="button" disabled>CHAT · SOON</button>
        <button type="button" onClick={openProfileEditor}>PROFILE</button>
      </nav>
    </div>,
    target,
  );
}

/* ========   MY CAM DOCK =========================== */

function PrivateRoomMyCamDock():ReactElement | null {
  const [cameraLive,setCameraLive] = useState(false);
  const [cameraEnabled,setCameraEnabled] = useState(false);
  const [visibility,setVisibility] = useState<CameraVisibility>("private");
  const [stream,setStream] = useState<MediaStream | null>(null);
  const [docked,setDocked] = useState(false);
  const [minimized,setMinimized] = useState(false);
  const [right,setRight] = useState(false);
  const [position,setPosition] = useState<DockPosition | null>(null);
  const [dragging,setDragging] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dockRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{
    pointerId:number;
    startX:number;
    startY:number;
    originX:number;
    originY:number;
  } | null>(null);
  const dragMovedRef = useRef(false);

  const savePosition = useCallback((next:DockPosition) => {
    try {localStorage.setItem(POSITION_KEY,JSON.stringify(next));} catch {/* noop */}
  },[]);

  const clampPosition = useCallback((x:number,y:number):DockPosition => {
    const node = dockRef.current;
    const width = node?.offsetWidth || (minimized ? 190 : 250);
    const height = node?.offsetHeight || (minimized ? 48 : 280);
    const maxX = Math.max(EDGE_GAP,window.innerWidth - width - EDGE_GAP);
    const maxY = Math.max(EDGE_GAP,window.innerHeight - height - EDGE_GAP);

    return {
      x:Math.min(Math.max(EDGE_GAP,x),maxX),
      y:Math.min(Math.max(EDGE_GAP,y),maxY),
    };
  },[minimized]);

  const readCameraState = useCallback(() => {
    const live = cameraIsLive();
    setCameraLive(live);

    const activeVisibility = Array.from(
      document.querySelectorAll<HTMLButtonElement>(".pvr-camera-visibility button"),
    ).find((button) => button.classList.contains("is-active"));

    const visibilityText = activeVisibility?.textContent?.trim().toLowerCase();
    if (visibilityText === "public" || visibilityText === "private") {
      setVisibility(visibilityText);
    }

    const studioVideo = document.querySelector<HTMLVideoElement>(".pvr-camera-preview video");
    const source = studioVideo?.srcObject;

    if (source instanceof MediaStream) {
      setStream(source);
      setCameraEnabled(source.getVideoTracks().some((track) => track.enabled && track.readyState === "live"));
    } else if (!live) {
      setStream(null);
      setCameraEnabled(false);
    }

    const isDocked = document.body.classList.contains("pvr-camera-docked");
    setDocked(isDocked);

    if (!live && isDocked) {
      document.body.classList.remove("pvr-camera-docked");
      setDocked(false);
    }
  },[]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
      if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) {
        setPosition({x:Number(saved.x),y:Number(saved.y)});
      }
    } catch {/* noop */}
  },[]);

  useEffect(() => {
    if (!docked) return;

    const fit = () => {
      setPosition((current) => {
        if (!current) return current;
        const next = clampPosition(current.x,current.y);
        savePosition(next);
        return next;
      });
    };

    const frame = window.requestAnimationFrame(fit);
    window.addEventListener("resize",fit);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize",fit);
    };
  },[clampPosition,docked,minimized,savePosition]);

  useEffect(() => {
    readCameraState();

    const observer = new MutationObserver(readCameraState);
    observer.observe(document.body,{
      childList:true,
      subtree:true,
      attributes:true,
      characterData:true,
      attributeFilter:["class"],
    });

    const interval = window.setInterval(readCameraState,350);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      document.body.classList.remove("pvr-camera-docked");
    };
  },[readCameraState]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    if (stream) void videoRef.current.play().catch(() => {});
  },[docked,minimized,stream]);

  useEffect(() => {
    const handleClick = (event:MouseEvent) => {
      if (!cameraLive) return;
      const target = event.target as HTMLElement | null;
      const closingCamera = target?.closest(".pvr-camera-head > button,.pvr-camera-backdrop");
      if (!closingCamera) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      document.body.classList.add("pvr-camera-docked");
      setDocked(true);
    };

    const handleEscape = (event:KeyboardEvent) => {
      if (event.key !== "Escape" || !cameraLive || !document.querySelector(".pvr-camera-studio")) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      document.body.classList.add("pvr-camera-docked");
      setDocked(true);
    };

    document.addEventListener("click",handleClick,true);
    window.addEventListener("keydown",handleEscape,true);

    return () => {
      document.removeEventListener("click",handleClick,true);
      window.removeEventListener("keydown",handleEscape,true);
    };
  },[cameraLive]);

  const handleDragStart = useCallback((event:ReactPointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    const nestedButton = target?.closest("button");
    if (nestedButton && nestedButton !== event.currentTarget) return;

    const node = dockRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    dragRef.current = {
      pointerId:event.pointerId,
      startX:event.clientX,
      startY:event.clientY,
      originX:rect.left,
      originY:rect.top,
    };
    dragMovedRef.current = false;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  },[]);

  const handleDragMove = useCallback((event:ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) dragMovedRef.current = true;

    setPosition(clampPosition(drag.originX + deltaX,drag.originY + deltaY));
  },[clampPosition]);

  const handleDragEnd = useCallback((event:ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const next = clampPosition(
      drag.originX + event.clientX - drag.startX,
      drag.originY + event.clientY - drag.startY,
    );

    setPosition(next);
    setRight(next.x > window.innerWidth / 2);
    savePosition(next);
    dragRef.current = null;
    setDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  },[clampPosition,savePosition]);

  const handleSnapSide = useCallback(() => {
    const node = dockRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const nextRight = !right;
    const next = clampPosition(
      nextRight ? window.innerWidth - rect.width - EDGE_GAP : EDGE_GAP,
      rect.top,
    );

    setRight(nextRight);
    setPosition(next);
    savePosition(next);
  },[clampPosition,right,savePosition]);

  const handleManage = useCallback(() => {
    setDocked(false);
    document.body.classList.remove("pvr-camera-docked");
    openProfileCamera();
  },[]);

  const handleVisibility = useCallback(() => {
    const next:CameraVisibility = visibility === "public" ? "private" : "public";
    const button = Array.from(
      document.querySelectorAll<HTMLButtonElement>(".pvr-camera-visibility button"),
    ).find((candidate) => candidate.textContent?.trim().toLowerCase() === next);

    button?.click();
    setVisibility(next);
  },[visibility]);

  const handleStop = useCallback(() => {
    document.body.classList.remove("pvr-camera-docked");
    setDocked(false);

    document.querySelector<HTMLButtonElement>(".pvr-camera-end")?.click();

    window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>(".pvr-camera-head > button")?.click();
    },100);
  },[]);

  if (!cameraLive || !docked) return null;

  const dockStyle = position
    ? {left:`${position.x}px`,top:`${position.y}px`,right:"auto",bottom:"auto"}
    : undefined;

  if (minimized) {
    return (
      <button
        ref={(node) => {dockRef.current = node;}}
        type="button"
        className={`pvr-mycam-mini ${right ? "is-right" : "is-left"}${dragging ? " is-dragging" : ""}`}
        style={dockStyle}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        onClick={() => {
          if (dragMovedRef.current) {
            dragMovedRef.current = false;
            return;
          }
          setMinimized(false);
        }}
      >
        <span className="pvr-mycam-mini-dot"></span>
        <span>
          <strong>MY CAM · ON</strong>
          <small>{visibility.toUpperCase()} · DRAG ANYWHERE</small>
        </span>
      </button>
    );
  }

  return (
    <aside
      ref={(node) => {dockRef.current = node;}}
      className={`pvr-mycam-dock ${right ? "is-right" : "is-left"}${dragging ? " is-dragging" : ""}`}
      style={dockStyle}
      aria-label="My camera default view"
    >
      {/* ─────   DRAG HANDLE ─────── */}
      <header
        className="pvr-mycam-head"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
      >
        <div>
          <span className="pvr-mycam-live-dot"></span>
          <strong>MY CAM · DRAG ANYWHERE</strong>
        </div>

        <div className="pvr-mycam-head-actions">
          <button type="button" onClick={handleSnapSide} aria-label="Snap camera dock to opposite side">
            {right ? "◀" : "▶"}
          </button>
          <button type="button" onClick={() => setMinimized(true)} aria-label="Minimize camera dock">—</button>
        </div>
      </header>

      {/* ─────   CAMERA PREVIEW ─────── */}
      <button type="button" className="pvr-mycam-preview" onClick={handleManage}>
        {stream && cameraEnabled ? (
          <video ref={videoRef} autoPlay muted playsInline></video>
        ) : (
          <span className="pvr-mycam-placeholder">FX</span>
        )}

        <span className="pvr-mycam-preview-meta">
          <strong>@User18Fx</strong>
          <small>{visibility.toUpperCase()}</small>
        </span>
      </button>

      {/* ─────   CAMERA CONTROLS ─────── */}
      <div className="pvr-mycam-controls">
        <button type="button" onClick={handleVisibility}>
          {visibility === "public" ? "PUBLIC" : "PRIVATE"}
        </button>
        <button type="button" onClick={handleManage}>MANAGE</button>
        <button type="button" onClick={openProfileEditor}>PROFILE</button>
        <button type="button" className="is-end" onClick={handleStop}>OFF</button>
      </div>
    </aside>
  );
}

/* ========   WELCOME TOUR =========================== */

function PrivateRoomWelcomeTour():ReactElement {
  const [open,setOpen] = useState(false);
  const [step,setStep] = useState(0);

  useEffect(() => {
    let completed = false;
    try {completed = localStorage.getItem(TOUR_KEY) === "1";} catch {/* noop */}
    if (completed) return;

    const timer = window.setTimeout(() => setOpen(true),700);
    return () => window.clearTimeout(timer);
  },[]);

  const finish = useCallback(() => {
    try {localStorage.setItem(TOUR_KEY,"1");} catch {/* noop */}
    setOpen(false);
    setStep(0);
  },[]);

  const replay = useCallback(() => {
    setStep(0);
    setOpen(true);
  },[]);

  const handleAction = useCallback(() => {
    const action = STEPS[step]?.action;
    if (action === "OPEN CAMERA") openProfileCamera();
    if (action === "VIEW SALON") scrollToSelector(".pvr-live-group");
    if (action === "VIEW MEMBERS") scrollToSelector(".pvr-live-members");
    if (action === "VIEW GALLERY") scrollToSelector(".pvr-gallery-section");
    if (action) setOpen(false);
  },[step]);

  const current = STEPS[step];

  return (
    <>
      <button type="button" className="pvr-tour-launcher" onClick={replay}>GUIDE</button>

      {open && (
        <div className="pvr-tour-layer" role="dialog" aria-modal="true" aria-label="USER FX PrivateRoom guide">
          <button type="button" className="pvr-tour-backdrop" onClick={finish} aria-label="Close guide"></button>

          <section className="pvr-tour-card">
            <header className="pvr-tour-head">
              <div>
                <span>USER FX · PRIVATE ROOM</span>
                <strong>{String(step + 1).padStart(2,"0")} / {String(STEPS.length).padStart(2,"0")}</strong>
              </div>
              <button type="button" onClick={finish} aria-label="Close guide">✕</button>
            </header>

            <div className="pvr-tour-body">
              <span className="pvr-tour-kicker">{current.kicker}</span>
              <h2>{current.title}</h2>
              <p>{current.text}</p>

              {current.action && (
                <button type="button" className="pvr-tour-action" onClick={handleAction}>
                  {current.action}
                </button>
              )}
            </div>

            <div className="pvr-tour-progress">
              {STEPS.map((_,index) => (
                <span key={index} className={index <= step ? "is-active" : ""}></span>
              ))}
            </div>

            <footer className="pvr-tour-footer">
              <button type="button" className="pvr-tour-skip" onClick={finish}>SKIP TOUR</button>
              <div>
                <button type="button" disabled={step === 0} onClick={() => setStep((currentStep) => Math.max(0,currentStep - 1))}>BACK</button>
                <button
                  type="button"
                  className="is-next"
                  onClick={() => {
                    if (step >= STEPS.length - 1) finish();
                    else setStep((currentStep) => currentStep + 1);
                  }}
                >
                  {step >= STEPS.length - 1 ? "ENTER CLUB" : "NEXT"}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

/* ========   PRIVATE ROOM SHELL =========================== */

export default function PrivateRoomLiveShell() {
  return (
    <PrivateRoomDirectGate>
      <PrivateRoomLuxuryNav />
      <PrivateRoomAccount />
      <PrivateRoomLiveLobby />
      <PrivateRoomMyCamDock />
      <PrivateRoomWelcomeTour />
    </PrivateRoomDirectGate>
  );
}
