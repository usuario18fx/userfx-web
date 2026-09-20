import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import "./PrivateRoomMyCamDock.css";

type CameraVisibility = "private" | "public";

function isCameraLive() {
  const indicator = document.querySelector<HTMLElement>(".pvr-account-online");
  return Boolean(indicator && !indicator.classList.contains("is-offline"));
}

function openProfileEditor() {
  const launcher = document.querySelector<HTMLButtonElement>(".pvr-account-launcher");
  if (!launcher) return;
  if (!launcher.classList.contains("is-open")) launcher.click();
}

function openCameraStudio() {
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

export default function PrivateRoomMyCamDock():ReactElement | null {
  const [cameraLive,setCameraLive] = useState(false);
  const [cameraEnabled,setCameraEnabled] = useState(false);
  const [visibility,setVisibility] = useState<CameraVisibility>("private");
  const [stream,setStream] = useState<MediaStream | null>(null);
  const [docked,setDocked] = useState(false);
  const [minimized,setMinimized] = useState(false);
  const [right,setRight] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const readCameraState = useCallback(() => {
    const live = isCameraLive();
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

  /* ─────   READ LIVE CAMERA STATE ─────── */
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

  /* ─────   SHARE ACTIVE MEDIASTREAM ─────── */
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    if (stream) void videoRef.current.play().catch(() => {});
  },[docked,minimized,stream]);

  /* ─────   DOCK CAMERA INSTEAD OF STOPPING IT ─────── */
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

  const handleManage = useCallback(() => {
    setDocked(false);
    document.body.classList.remove("pvr-camera-docked");
    openCameraStudio();
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

    const endButton = document.querySelector<HTMLButtonElement>(".pvr-camera-end");
    endButton?.click();

    window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>(".pvr-camera-head > button")?.click();
    },100);
  },[]);

  if (!cameraLive || !docked) return null;

  if (minimized) {
    return (
      <button
        type="button"
        className={`pvr-mycam-mini ${right ? "is-right" : "is-left"}`}
        onClick={() => setMinimized(false)}
      >
        <span className="pvr-mycam-mini-dot"></span>
        <span>
          <strong>MY CAM · ON</strong>
          <small>{visibility.toUpperCase()} · DEFAULT VIEW</small>
        </span>
      </button>
    );
  }

  return (
    <aside className={`pvr-mycam-dock ${right ? "is-right" : "is-left"}`} aria-label="My camera default view">
      {/* ─────   DOCK HEADER ─────── */}
      <header className="pvr-mycam-head">
        <div>
          <span className="pvr-mycam-live-dot"></span>
          <strong>MY CAM · DEFAULT</strong>
        </div>

        <div className="pvr-mycam-head-actions">
          <button type="button" onClick={() => setRight((current) => !current)} aria-label="Move camera dock">
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
