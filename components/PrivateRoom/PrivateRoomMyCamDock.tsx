import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type PointerEvent as ReactPointerEvent,
} from "react";
import "./PrivateRoomMyCamDock.css";

type CameraVisibility = "private" | "public";
type DockPosition = {x:number;y:number};

const POSITION_KEY = "userfx_mycam_position";
const EDGE_GAP = 10;

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

  /* ─────   SAVED DOCK POSITION ─────── */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
      if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) {
        setPosition({x:Number(saved.x),y:Number(saved.y)});
      }
    } catch {/* noop */}
  },[]);

  /* ─────   KEEP DOCK INSIDE VIEWPORT ─────── */
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

  /* ========   DRAGGABLE MY CAM =========================== */
  const handleDragStart = useCallback((event:ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement | null)?.closest("button")) return;

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
