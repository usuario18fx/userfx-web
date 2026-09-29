import { useState } from "react";
import { createPortal } from "react-dom";
import "./PrivateRoomRoutePage.css";

const STAGE_MEMBERS = [
  {name:"@User18Fx",status:"HOST · OFFLINE",initials:"FX"},
  {name:"@GreenGrower",status:"MEMBER · OFFLINE",initials:"GG"},
  {name:"@Dalyva",status:"MEMBER · OFFLINE",initials:"DA"},
];

export default function PrivateRoomStage() {
  const [target,setTarget] = useState<HTMLElement | null>(() => document.querySelector<HTMLElement>(".pvr-live-home"));

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
        <button type="button" onClick={() => document.querySelector<HTMLButtonElement>(".pvr-account-launcher")?.click()}>
          OPEN MY CAMERA
        </button>
      </section>
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
    </section>,
    target,
  );
}
