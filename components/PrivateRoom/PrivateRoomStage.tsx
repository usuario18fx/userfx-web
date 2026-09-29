import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./PrivateRoomRoutePage.css";

const STAGE_MEMBERS = [
  {name:"@User18Fx",status:"HOST · OFFLINE",initials:"FX"},
  {name:"@GreenGrower",status:"MEMBER · OFFLINE",initials:"GG"},
  {name:"@Dalyva",status:"MEMBER · OFFLINE",initials:"DA"},
];

function cameraIsLive() {
  const indicator = document.querySelector<HTMLElement>(".pvr-account-online");
  return Boolean(indicator && !indicator.classList.contains("is-offline"));
}

function openCamera() {
  window.dispatchEvent(new CustomEvent("userfx:open-camera-studio"));
}

export default function PrivateRoomStage() {
  const [target,setTarget] = useState<HTMLElement | null>(() => document.querySelector<HTMLElement>(".pvr-live-home"));
  const [cameraLive,setCameraLive] = useState(false);

  useEffect(() => {
    const readCameraState = () => setCameraLive(cameraIsLive());
    readCameraState();
    const observer = new MutationObserver(readCameraState);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
    return () => observer.disconnect();
  },[]);

  if (!target) {
    window.requestAnimationFrame(() => setTarget(document.querySelector<HTMLElement>(".pvr-live-home")));
  }

  if (!target) return null;

  return createPortal(
    <section className="pvr-route-page pvr-stage-route" aria-label="Private Room Stage">
      <header className="pvr-route-page-head">
        <div>
          <span>
            USER FX · LIVE NETWORK
          </span>
          <h1>
            STAGE
          </h1>
        </div>
        <button type="button" onClick={() => { window.location.hash = "#/private-room"; }}>
          MYROOM
        </button>
      </header>
      <section className="pvr-stage-route-hero">
        <div>
          <span>
            PUBLIC CAMERAS
          </span>
          <strong>
            LIVE STAGE
          </strong>
          <p>
            Public member cameras will appear here when they go live.
          </p>
        </div>
        <button type="button" onClick={openCamera}>
          {cameraLive ? "MANAGE MY CAMERA" : "OPEN MY CAMERA"}
        </button>
      </section>
      <div className="pvr-stage-route-layout">
        <div className="pvr-stage-route-grid">
          {STAGE_MEMBERS.map((member) => (
            <article key={member.name} className="pvr-stage-route-card">
              <div className="pvr-stage-route-preview">
                <span>
                  {member.initials}
                </span>
              </div>
              <footer>
                <strong>
                  {member.name}
                </strong>
                <span>
                  {member.status}
                </span>
              </footer>
            </article>
          ))}
        </div>
        <aside className={`pvr-stage-oncam-base ${cameraLive ? "is-live" : ""}`} aria-label="My camera base">
          <header>
            <span>
              MY CAMERA
            </span>
            <strong>
              {cameraLive ? "ONCAM" : "OFFCAM"}
            </strong>
          </header>
          <div className="pvr-stage-oncam-preview">
            <span>
              FX
            </span>
          </div>
          <div className="pvr-stage-oncam-meta">
            <strong>
              @User18Fx
            </strong>
            <small>
              {cameraLive ? "CAMERA ACTIVE" : "READY TO GO LIVE"}
            </small>
          </div>
          <button type="button" onClick={openCamera}>
            {cameraLive ? "MANAGE CAMERA" : "OPEN CAMERA"}
          </button>
        </aside>
      </div>
    </section>,
    target,
  );
}
