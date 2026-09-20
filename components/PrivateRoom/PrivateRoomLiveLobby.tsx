import {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
} from "react";
import {createPortal} from "react-dom";
import "./PrivateRoomLiveLobby.css";

type LobbySection = "live" | "group" | "scheduled" | "members";

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
    const viewProfile = document.querySelector<HTMLButtonElement>(".pvr-account-view");
    viewProfile?.click();

    window.setTimeout(() => {
      const cameraButton = document.querySelector<HTMLButtonElement>(".pvr-profile-camera > button");
      cameraButton?.click();
    },80);
  },80);
}

export default function PrivateRoomLiveLobby():ReactElement | null {
  const [target,setTarget] = useState<HTMLElement | null>(null);
  const [cameraLive,setCameraLive] = useState(false);
  const [section,setSection] = useState<LobbySection>("live");

  /* ─────   MOUNT INTO VIDEOCALL STAGE ─────── */
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

  /* ─────   CAMERA STATUS ─────── */
  useEffect(() => {
    const readCameraState = () => {
      const indicator = document.querySelector<HTMLElement>(".pvr-account-online");
      setCameraLive(Boolean(indicator && !indicator.classList.contains("is-offline")));
    };

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

          <button type="button" disabled>
            SCHEDULED
          </button>
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
