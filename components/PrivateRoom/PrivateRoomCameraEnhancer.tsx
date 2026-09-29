import { useEffect } from "react";
import "./PrivateRoomCameraEnhancer.css";

const DEFAULT_CAMERA_KEY = "userfx_default_camera_id";
let activeStream:MediaStream | null = null;
let cameraLive = false;
let flashEnabled = false;

function getStudioStream(studio:HTMLElement) {
  const video = studio.querySelector<HTMLVideoElement>(".pvr-camera-preview video");
  return video?.srcObject instanceof MediaStream ? video.srcObject : null;
}

function getVideoTrack(studio:HTMLElement) {
  return getStudioStream(studio)?.getVideoTracks()[0] || null;
}

function getStoredCameraId() {
  try {
    return localStorage.getItem(DEFAULT_CAMERA_KEY) || "";
  } catch {
    return "";
  }
}

function storeCameraId(deviceId:string) {
  try {
    if (deviceId) localStorage.setItem(DEFAULT_CAMERA_KEY,deviceId);
  } catch {
  }
}

async function applyCameraDevice(studio:HTMLElement,deviceId:string) {
  const track = getVideoTrack(studio);
  if (!track || !deviceId) return false;
  try {
    await track.applyConstraints({deviceId:{exact:deviceId}});
    studio.dataset.selectedCameraId = deviceId;
    return true;
  } catch {
    return false;
  }
}

async function populateCameraSelect(studio:HTMLElement,select:HTMLSelectElement) {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentId = getVideoTrack(studio)?.getSettings().deviceId || studio.dataset.selectedCameraId || getStoredCameraId();
    select.innerHTML = "";
    cameras.forEach((camera,index) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.textContent = camera.label || `CAMERA ${index + 1}`;
      if (camera.deviceId === currentId) option.selected = true;
      select.appendChild(option);
    });
    if (!select.value && cameras[0]) select.value = cameras[0].deviceId;
    if (select.value) studio.dataset.selectedCameraId = select.value;
  } catch {
  }
}

function supportsFlash(track:MediaStreamTrack | null) {
  if (!track) return false;
  const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & {torch?:boolean};
  return Boolean(capabilities?.torch);
}

async function toggleFlash(studio:HTMLElement,button:HTMLButtonElement) {
  const track = getVideoTrack(studio);
  if (!track || !supportsFlash(track)) return;
  const next = !flashEnabled;
  try {
    await track.applyConstraints({advanced:[{torch:next}]} as unknown as MediaTrackConstraints);
    flashEnabled = next;
    button.classList.toggle("is-active",next);
    button.setAttribute("aria-pressed",String(next));
  } catch {
  }
}

function getRoomMemberCount() {
  const users = Array.from(document.querySelectorAll<HTMLElement>(".pvr-myroom-online-user"));
  return users.filter((user) => {
    const role = user.querySelector<HTMLElement>("div:nth-child(2) span")?.textContent?.trim().toUpperCase();
    return role !== "HOST";
  }).length;
}

function ensureChannelPanel() {
  const right = document.querySelector<HTMLElement>(".pvr-myroom-right");
  const oncam = right?.querySelector<HTMLElement>(".pvr-myroom-oncam");
  if (!right || !oncam) return;

  let panel = right.querySelector<HTMLElement>(".pvr-myroom-channel-panel");
  if (!panel) {
    panel = document.createElement("section");
    panel.className = "pvr-myroom-panel pvr-myroom-channel-panel";
    panel.innerHTML = `<header><strong>YOUR ROOM</strong><span data-room-count>0 / 5</span></header><div class="pvr-myroom-channel-copy"><strong>PRIVATE MEETING</strong><span data-room-status>5 MEMBERS REQUIRED</span></div><div class="pvr-myroom-channel-progress"><span></span></div><button type="button" class="pvr-myroom-private-meeting" disabled>PRIVATE MEETING LOCKED</button>`;
    oncam.insertAdjacentElement("afterend",panel);
    panel.querySelector<HTMLButtonElement>(".pvr-myroom-private-meeting")?.addEventListener("click",() => {
      window.dispatchEvent(new CustomEvent("userfx:start-private-meeting"));
      window.location.hash = "#/private-room/stage";
    });
  }

  const count = getRoomMemberCount();
  const ready = count >= 5;
  const countNode = panel.querySelector<HTMLElement>("[data-room-count]");
  const statusNode = panel.querySelector<HTMLElement>("[data-room-status]");
  const progress = panel.querySelector<HTMLElement>(".pvr-myroom-channel-progress span");
  const button = panel.querySelector<HTMLButtonElement>(".pvr-myroom-private-meeting");

  if (countNode) countNode.textContent = `${count} / 5`;
  if (statusNode) statusNode.textContent = ready ? "PRIVATE MEETING READY" : `${5 - count} MORE MEMBER${5 - count === 1 ? "" : "S"} REQUIRED`;
  if (progress) progress.style.width = `${Math.min(100,(count / 5) * 100)}%`;
  if (button) {
    button.disabled = !ready;
    button.textContent = ready ? "START PRIVATE MEETING" : "PRIVATE MEETING LOCKED";
  }
  panel.classList.toggle("is-ready",ready);
}

function syncRoomCamera() {
  const screen = document.querySelector<HTMLElement>(".pvr-myroom-oncam-screen");
  const panel = document.querySelector<HTMLElement>(".pvr-myroom-oncam");
  if (!screen || !panel) return;

  panel.classList.toggle("is-live",cameraLive);
  screen.classList.toggle("is-online",cameraLive);

  const label = screen.querySelector<HTMLElement>("span");
  const status = screen.querySelector<HTMLElement>("strong");
  const note = screen.querySelector<HTMLElement>("small");
  if (label) label.textContent = "YOUR CAMERA";
  if (status) status.textContent = cameraLive ? "ONLINE" : "OFFLINE";
  if (note) note.textContent = cameraLive ? "@User18Fx · LIVE ROOM" : "CAMERA PREVIEW";

  let mirror = screen.querySelector<HTMLVideoElement>(".pvr-myroom-oncam-live-video");
  if (cameraLive && activeStream) {
    if (!mirror) {
      mirror = document.createElement("video");
      mirror.className = "pvr-myroom-oncam-live-video";
      mirror.autoplay = true;
      mirror.muted = true;
      mirror.playsInline = true;
      screen.prepend(mirror);
    }
    if (mirror.srcObject !== activeStream) mirror.srcObject = activeStream;
    void mirror.play().catch(() => {});
  } else if (mirror) {
    mirror.srcObject = null;
    mirror.remove();
  }
}

function syncCameraControls(studio:HTMLElement,controls:HTMLElement) {
  const cameraButton = studio.querySelector<HTMLButtonElement>(".pvr-camera-device-controls button:nth-child(1)");
  const micButton = studio.querySelector<HTMLButtonElement>(".pvr-camera-device-controls button:nth-child(2)");
  const play = controls.querySelector<HTMLButtonElement>("[data-camera-action='play']");
  const pause = controls.querySelector<HTMLButtonElement>("[data-camera-action='pause']");
  const mute = controls.querySelector<HTMLButtonElement>("[data-camera-action='mute']");
  const flash = controls.querySelector<HTMLButtonElement>("[data-camera-action='flash']");
  const cameraOn = Boolean(cameraButton && !cameraButton.classList.contains("is-off"));
  const micOn = Boolean(micButton && !micButton.classList.contains("is-off"));

  play?.classList.toggle("is-active",cameraLive);
  pause?.classList.toggle("is-active",!cameraLive || !cameraOn);
  mute?.classList.toggle("is-active",!micOn);
  studio.classList.toggle("is-live-camera",cameraLive);

  if (flash) {
    const available = supportsFlash(getVideoTrack(studio));
    flash.disabled = !available;
    flash.classList.toggle("is-unavailable",!available);
    flash.title = available ? "FLASH" : "FLASH NOT AVAILABLE ON THIS CAMERA";
  }

  syncRoomCamera();
  ensureChannelPanel();
}

function configureCameraStudio() {
  const studio = document.querySelector<HTMLElement>(".pvr-camera-studio");
  if (!studio) {
    ensureChannelPanel();
    syncRoomCamera();
    return;
  }

  const privateMode = studio.querySelector<HTMLButtonElement>(".pvr-camera-visibility button:first-child");
  if (privateMode && !privateMode.classList.contains("is-active")) privateMode.click();

  const preview = studio.querySelector<HTMLElement>(".pvr-camera-preview");
  if (!preview || preview.querySelector(".pvr-camera-media-controls")) return;

  const controls = document.createElement("div");
  controls.className = "pvr-camera-media-controls";
  controls.setAttribute("aria-label","Camera controls");

  const play = document.createElement("button");
  play.type = "button";
  play.dataset.cameraAction = "play";
  play.setAttribute("aria-label","Start camera and save selected camera as default");
  play.innerHTML = "<span>▶</span>";

  const pause = document.createElement("button");
  pause.type = "button";
  pause.dataset.cameraAction = "pause";
  pause.setAttribute("aria-label","Pause camera");
  pause.innerHTML = "<span>Ⅱ</span>";

  const mute = document.createElement("button");
  mute.type = "button";
  mute.dataset.cameraAction = "mute";
  mute.setAttribute("aria-label","Toggle microphone");
  mute.innerHTML = "<span>🔇</span>";

  const flash = document.createElement("button");
  flash.type = "button";
  flash.dataset.cameraAction = "flash";
  flash.setAttribute("aria-label","Flash");
  flash.setAttribute("aria-pressed","false");
  flash.innerHTML = "<span>⚡</span>";

  const settings = document.createElement("button");
  settings.type = "button";
  settings.dataset.cameraAction = "settings";
  settings.setAttribute("aria-label","Video settings");
  settings.innerHTML = "<span>⚙</span>";

  const settingsPanel = document.createElement("div");
  settingsPanel.className = "pvr-camera-device-menu";
  settingsPanel.hidden = true;

  const settingsLabel = document.createElement("span");
  settingsLabel.textContent = "VIDEO SOURCE";

  const cameraSelect = document.createElement("select");
  cameraSelect.setAttribute("aria-label","Choose camera");

  const defaultNote = document.createElement("small");
  defaultNote.textContent = "PRESS PLAY TO SAVE AS DEFAULT";

  settingsPanel.append(settingsLabel,cameraSelect,defaultNote);

  settings.addEventListener("click",() => {
    settingsPanel.hidden = !settingsPanel.hidden;
    settings.classList.toggle("is-active",!settingsPanel.hidden);
    if (!settingsPanel.hidden) void populateCameraSelect(studio,cameraSelect);
  });

  cameraSelect.addEventListener("change",() => {
    const deviceId = cameraSelect.value;
    void applyCameraDevice(studio,deviceId).then(() => syncCameraControls(studio,controls));
  });

  flash.addEventListener("click",() => {
    void toggleFlash(studio,flash);
  });

  play.addEventListener("click",() => {
    const cameraButton = studio.querySelector<HTMLButtonElement>(".pvr-camera-device-controls button:nth-child(1)");
    if (cameraButton?.classList.contains("is-off")) cameraButton.click();

    const selectedId = cameraSelect.value || studio.dataset.selectedCameraId || getVideoTrack(studio)?.getSettings().deviceId || "";
    if (selectedId) storeCameraId(selectedId);

    window.setTimeout(() => {
      const enter = studio.querySelector<HTMLButtonElement>(".pvr-camera-enter");
      if (enter && !enter.disabled) enter.click();
      activeStream = getStudioStream(studio);
      cameraLive = Boolean(activeStream?.getVideoTracks().some((track) => track.enabled && track.readyState === "live"));
      activeStream?.getVideoTracks().forEach((track) => {
        track.addEventListener("ended",() => {
          cameraLive = false;
          activeStream = null;
          syncCameraControls(studio,controls);
        },{once:true});
      });
      syncCameraControls(studio,controls);
    },60);
  });

  pause.addEventListener("click",() => {
    const cameraButton = studio.querySelector<HTMLButtonElement>(".pvr-camera-device-controls button:nth-child(1)");
    if (cameraButton && !cameraButton.classList.contains("is-off")) cameraButton.click();
    cameraLive = false;
    flashEnabled = false;
    window.setTimeout(() => syncCameraControls(studio,controls),40);
  });

  mute.addEventListener("click",() => {
    studio.querySelector<HTMLButtonElement>(".pvr-camera-device-controls button:nth-child(2)")?.click();
    window.setTimeout(() => syncCameraControls(studio,controls),40);
  });

  controls.append(play,pause,mute,flash,settings);
  preview.append(controls,settingsPanel);

  const storedCameraId = getStoredCameraId();
  if (storedCameraId) {
    window.setTimeout(() => {
      void applyCameraDevice(studio,storedCameraId).then(() => populateCameraSelect(studio,cameraSelect)).then(() => syncCameraControls(studio,controls));
    },100);
  } else {
    void populateCameraSelect(studio,cameraSelect).then(() => syncCameraControls(studio,controls));
  }
}

export default function PrivateRoomCameraEnhancer() {
  useEffect(() => {
    let frame = 0;

    configureCameraStudio();
    ensureChannelPanel();

    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        configureCameraStudio();
        ensureChannelPanel();
        syncRoomCamera();
      });
    });

    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  },[]);

  return null;
}
