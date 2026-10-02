import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./PrivateRoomRoutePage.css";

const DEV_OWNER = import.meta.env.DEV;

type RuntimeState = {
  isOwner: boolean;
  stage: { live: boolean; startedAt: string | null };
  viewingStage: number;
};

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

function openCameraStudio() {
  window.dispatchEvent(new CustomEvent("userfx:open-camera-studio"));
}

export default function PrivateRoomStage() {
  const [target, setTarget] = useState<HTMLElement | null>(() => document.querySelector<HTMLElement>(".pvr-live-home"));
  const [cameraLive, setCameraLive] = useState(false);
  const [ownerCameraLive, setOwnerCameraLive] = useState(false);
  const [runtime, setRuntime] = useState<RuntimeState>({
    isOwner: DEV_OWNER,
    stage: { live: false, startedAt: null },
    viewingStage: 0,
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function applyRuntime(response: Response) {
    if (!response.ok) return;
    const data = await response.json();
    if (!data?.ok) return;
    setRuntime({
      isOwner: Boolean(data.isOwner),
      stage: {
        live: Boolean(data.stage?.live),
        startedAt: data.stage?.startedAt || null,
      },
      viewingStage: Number(data.viewingStage || 0),
    });
  }

  async function refreshRuntime() {
    try {
      const response = await fetch("/api/admin-runtime", { credentials: "include", cache: "no-store" });
      await applyRuntime(response);
    } catch {}
  }

  async function runtimeAction(action: string) {
    if (DEV_OWNER) {
      if (action === "stage-start") {
        setRuntime((current) => ({ ...current, isOwner: true, stage: { live: true, startedAt: new Date().toISOString() } }));
      } else if (action === "stage-stop") {
        setRuntime((current) => ({ ...current, isOwner: true, stage: { live: false, startedAt: null } }));
      }
      return;
    }

    try {
      const response = await fetch("/api/admin-runtime", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await applyRuntime(response);
    } catch {}
  }

  function getExistingCameraStream() {
    const candidates = Array.from(document.querySelectorAll<HTMLVideoElement>(".pvr-camera-preview video, .pvr-mycam-preview video"));
    for (const candidate of candidates) {
      if (candidate.srcObject instanceof MediaStream) return candidate.srcObject;
    }
    return null;
  }

  async function startOwnerCamera() {
    const existingStream = getExistingCameraStream();

    if (existingStream) {
      streamRef.current = existingStream;
      if (videoRef.current) videoRef.current.srcObject = existingStream;
      setOwnerCameraLive(true);
      setCameraLive(true);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) return;

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setOwnerCameraLive(true);
      setCameraLive(true);
    } catch {
      setOwnerCameraLive(false);
    }
  }

  function stopOwnerCamera() {
    const existingStream = getExistingCameraStream();
    if (streamRef.current && streamRef.current !== existingStream) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setOwnerCameraLive(false);
    setCameraLive(cameraIsLive());
  }

  useEffect(() => {
    const readCameraState = () => {
      if (!streamRef.current) setCameraLive(cameraIsLive());
    };

    readCameraState();
    refreshRuntime();

    if (cameraIsLive()) {
      const existingStream = getExistingCameraStream();
      if (existingStream) {
        streamRef.current = existingStream;
        setOwnerCameraLive(true);
        setCameraLive(true);
      }
    }

    const observer = new MutationObserver(readCameraState);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    runtimeAction("stage-heartbeat");
    const heartbeat = window.setInterval(() => runtimeAction("stage-heartbeat"), 25000);

    return () => {
      observer.disconnect();
      window.clearInterval(heartbeat);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [ownerCameraLive]);

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

      {runtime.isOwner ? (
        <section className="pvr-owner-console" aria-label="Owner stage controls">
          <div className="pvr-owner-console-copy">
            <span>
OWNER · @User18Fx
            </span>
            <strong>
ADMIN STAGE CONTROL
            </strong>
          </div>
          <div className="pvr-owner-console-metric">
            <span>
VIEWERS
            </span>
            <strong>
{runtime.viewingStage}
            </strong>
          </div>
          <div className="pvr-owner-console-actions">
            <button type="button" onClick={ownerCameraLive ? stopOwnerCamera : startOwnerCamera}>
{ownerCameraLive ? "STOP MAIN CAM" : "START MAIN CAM"}
            </button>
            <button type="button" className={runtime.stage.live ? "is-danger" : "is-live"} onClick={() => runtimeAction(runtime.stage.live ? "stage-stop" : "stage-start")} disabled={!ownerCameraLive && !runtime.stage.live}>
{runtime.stage.live ? "END PUBLIC STAGE" : "START PUBLIC STAGE"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="pvr-stage-scene" aria-label="Private meeting stage">
        <header className="pvr-stage-scene-head">
          <div>
            <span>
{runtime.stage.live ? "PUBLIC STAGE" : "PRIVATE STAGE"}
            </span>
            <strong>
ROOMFX LIVE
            </strong>
          </div>
          <div className={"pvr-stage-lumen " + (runtime.stage.live || cameraLive ? "is-live" : "")} role="status" aria-label={runtime.stage.live ? "Public stage live" : cameraLive ? "On camera" : "Camera ready"}>
            <div className="pvr-stage-lumen-panel">
              <span className="pvr-stage-lumen-dot" />
              <span className="pvr-stage-lumen-label">
{runtime.stage.live ? "LIVE" : cameraLive ? "ONCAM" : "READY"}
              </span>
            </div>
          </div>
        </header>

        <div className="pvr-stage-scene-grid">
          {STAGE_MEMBERS.map((member, index) => (
            <article key={member.name} className={"pvr-stage-camera-card " + (member.fixed ? "is-fixed " : "") + (index === 0 ? "is-host " : "") + (index === 1 ? "is-self" : "")}>
              <div className="pvr-stage-camera-screen">
                {index === 0 && runtime.isOwner && ownerCameraLive ? (
                  <video ref={videoRef} className="pvr-stage-owner-video" autoPlay muted playsInline />
                ) : (
                  <span className="pvr-stage-camera-initials">
{member.initials}
                  </span>
                )}
                <div className="pvr-stage-camera-watermark">
                  <strong>
{member.name}
                  </strong>
                  <small>
{index === 0 && runtime.isOwner ? "OWNER · MAIN CAM" : member.role}
                  </small>
                </div>
                {member.fixed ? (
                  <span className="pvr-stage-camera-fixed">
{index === 0 ? "MAIN CAM" : "FIXED CAM"}
                  </span>
                ) : null}
                {index === 0 && runtime.stage.live ? (
                  <span className="pvr-stage-camera-live">
PUBLIC LIVE
                  </span>
                ) : null}
                {index === 1 && cameraLive ? (
                  <div className="pvr-stage-camera-live-lumen" role="status" aria-label="User camera online">
                    <span className="pvr-stage-camera-live-dot" />
                    <span>
ONLINE
                    </span>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <footer className="pvr-stage-scene-footer">
          <div>
            <strong>
{runtime.isOwner ? "OWNER MAIN CAM" : "2 FIXED CAMS"}
            </strong>
            <span>
{runtime.isOwner ? "@User18Fx · " + runtime.viewingStage + " VIEWERS" : "HOST + YOUR CAMERA"}
            </span>
          </div>
          <button type="button" onClick={runtime.isOwner ? (ownerCameraLive ? stopOwnerCamera : startOwnerCamera) : openCameraStudio}>
{runtime.isOwner ? (ownerCameraLive ? "STOP MY CAMERA" : "OPEN MY CAMERA") : cameraLive ? "MANAGE MY CAMERA" : "OPEN MY CAMERA"}
          </button>
        </footer>
      </section>
    </section>,
    target,
  );
}
