import { useEffect } from "react";
import "./PrivateRoomCameraEnhancer.css";

const DEFAULT_CAMERA_KEY = "userfx_default_camera_id";

function getVideoTrack(studio:HTMLElement) {
  const video = studio.querySelector<HTMLVideoElement>(".pvr-camera-preview video");
  const stream = video?.srcObject instanceof MediaStream ? video.srcObject : null;
  return stream?.getVideoTracks()[0] || null;
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

function syncCameraControls(controls:HTMLElement) {
  const cameraButton = document.querySelector<HTMLButtonElement>(".pvr-camera-device-controls button:nth-child(1)");
  const micButton = document.querySelector<HTMLButtonElement>(".pvr-camera-device-controls button:nth-child(2)");
  const play = controls.querySelector<HTMLButtonElement>("[data-camera-action='play']");
  const pause = controls.querySelector<HTMLButtonElement>("[data-camera-action='pause']");
  const mute = controls.querySelector<HTMLButtonElement>("[data-camera-action='mute']");
  const cameraOn = Boolean(cameraButton && !cameraButton.classList.contains("is-off"));
  const micOn = Boolean(micButton && !micButton.classList.contains("is-off"));

  play?.classList.toggle("is-active",cameraOn);
  pause?.classList.toggle("is-active",!cameraOn);
  mute?.classList.toggle("is-active",!micOn);
}

function configureCameraStudio() {
  const studio = document.querySelector<HTMLElement>(".pvr-camera-studio");
  if (!studio) return;

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
    void applyCameraDevice(studio,deviceId);
  });

  play.addEventListener("click",() => {
    const cameraButton = studio.querySelector<HTMLButtonElement>(".pvr-camera-device-controls button:nth-child(1)");
    if (cameraButton?.classList.contains("is-off")) cameraButton.click();

    const selectedId = cameraSelect.value || studio.dataset.selectedCameraId || getVideoTrack(studio)?.getSettings().deviceId || "";
    if (selectedId) storeCameraId(selectedId);

    window.setTimeout(() => {
      const enter = studio.querySelector<HTMLButtonElement>(".pvr-camera-enter");
      if (enter && !enter.disabled) enter.click();
      syncCameraControls(controls);
    },40);
  });

  pause.addEventListener("click",() => {
    const cameraButton = studio.querySelector<HTMLButtonElement>(".pvr-camera-device-controls button:nth-child(1)");
    if (cameraButton && !cameraButton.classList.contains("is-off")) cameraButton.click();
    window.setTimeout(() => syncCameraControls(controls),40);
  });

  mute.addEventListener("click",() => {
    studio.querySelector<HTMLButtonElement>(".pvr-camera-device-controls button:nth-child(2)")?.click();
    window.setTimeout(() => syncCameraControls(controls),40);
  });

  controls.append(play,pause,mute,settings);
  preview.append(controls,settingsPanel);

  const storedCameraId = getStoredCameraId();
  if (storedCameraId) {
    window.setTimeout(() => {
      void applyCameraDevice(studio,storedCameraId).then(() => populateCameraSelect(studio,cameraSelect));
    },100);
  } else {
    void populateCameraSelect(studio,cameraSelect);
  }

  syncCameraControls(controls);
}

export default function PrivateRoomCameraEnhancer() {
  useEffect(() => {
    let frame = 0;

    configureCameraStudio();

    const observer = new MutationObserver((mutations) => {
      const changed = mutations.some((mutation) => mutation.type === "childList" && mutation.addedNodes.length > 0);
      if (!changed) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(configureCameraStudio);
    });

    observer.observe(document.body,{childList:true,subtree:true});

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  },[]);

  return null;
}
