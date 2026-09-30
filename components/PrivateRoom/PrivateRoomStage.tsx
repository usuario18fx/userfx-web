          import { useEffect, useState } from "react";
          import { createPortal } from "react-dom";
          import "./PrivateRoomRoutePage.css";

          const STAGE_MEMBERS = [
            { name: "@User18Fx", role: "HOST", initials: "FX", fixed: true },
            { name: "@YOU", role: "YOU", initials: "ME", fixed: true },
            { name: "@GreenGrower", role: "MEMBER", initials: "GG", fixed: false },
            { name: "@Dalyva", role: "MEMBER", initials: "DA", fixed: false },
            { name: "@420Fresh", role: "MEMBER", initials: "42", fixed: false },
          ] as const;

          function cameraIsLive() {
            const indicator = document.querySelector<HTMLElement>(".pvr-account-online");
            return Boolean(indicator && !indicator.classList.contains("is-offline"));
          }

          function openCamera() {
            window.dispatchEvent(new CustomEvent("userfx:open-camera-studio"));
          }

          export default function PrivateRoomStage() {
            const [target, setTarget] = useState<HTMLElement | null>(() => document.querySelector<HTMLElement>(".pvr-live-home"));
            const [cameraLive, setCameraLive] = useState(false);

            useEffect(() => {
              const readCameraState = () => setCameraLive(cameraIsLive());
              readCameraState();
              const observer = new MutationObserver(readCameraState);
              observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
              return () => observer.disconnect();
            }, []);

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
                  <button
                    type="button"
                    onClick={() => {
                      window.location.hash = "#/private-room";
                    }}>
                    MYROOM
                  </button>
                </header>

                <section className="pvr-stage-scene" aria-label="Private meeting stage">
                  <header className="pvr-stage-scene-head">
                    <div>
                      <span>
                      PRIVATE STAGE
                      </span>
                      <strong>
                      ROOMFX LIVE
                      </strong>
                    </div>
                    <div className={`pvr-stage-lumen ${cameraLive ? "is-live" : ""}`} role="status" aria-label={cameraLive ? "On camera" : "Camera ready"}>
            <div className="pvr-stage-lumen-panel">
              <span className="pvr-stage-lumen-dot"></span>
              <span className="pvr-stage-lumen-label">{cameraLive ? "ONCAM" : "READY"}</span>
            </div>
          </div>
        </header>

        <div className="pvr-stage-scene-grid">
          {STAGE_MEMBERS.map((member, index) => (
            <article key={member.name} className={`pvr-stage-camera-card ${member.fixed ? "is-fixed" : ""} ${index === 0 ? "is-host" : ""} ${index === 1 ? "is-self" : ""}`}>
              <div className="pvr-stage-camera-screen">
                <span className="pvr-stage-camera-initials">{member.initials}</span>
                <div className="pvr-stage-camera-watermark">
                  <strong>{member.name}</strong>
                  <small>{member.role}</small>
                </div>
                {member.fixed && <span className="pvr-stage-camera-fixed">FIXED CAM</span>}
                {index === 1 && cameraLive && (
                  <div className="pvr-stage-camera-live-lumen" role="status" aria-label="User camera online">
                    <span className="pvr-stage-camera-live-dot"></span>
                    <span>
                    ONLINE
                    </span>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        <footer className="pvr-stage-scene-footer">
          <div>
            <strong>
            2 FIXED CAMS
            </strong>
            <span>
            HOST + YOUR CAMERA
            </span>
          </div>
          <button type="button" onClick={openCamera}>
            {cameraLive ? "MANAGE MY CAMERA" : "OPEN MY CAMERA"}
          </button>
        </footer>
      </section>
    </section>,
    target,
  );
}
