import { useEffect } from "react";
import "./PrivateRoomCameraEnhancer.css";

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
  play.setAttribute("aria-label","Start or resume camera");
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

  play.addEventListener("click",() => {
    const cameraButton = studio.querySelector<HTMLButtonElement>(".pvr-camera-device-controls button:nth-child(1)");
    if (cameraButton?.classList.contains("is-off")) cameraButton.click();

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

  controls.append(play,pause,mute);
  preview.appendChild(controls);
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
