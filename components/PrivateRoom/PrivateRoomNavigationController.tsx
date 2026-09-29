import { useEffect } from "react";
import "./PrivateRoomNavigationController.css";

const HOME_URL = "https://user18fx.com";

type NavRole = "home" | "myroom" | "stage" | "gallery" | "mailbox";

const LABELS:Record<NavRole,string> = {
  home:"INICIO",
  myroom:"MYROOM",
  stage:"STAGE",
  gallery:"GALLERY",
  mailbox:"BUZON",
};

const ROUTES:Record<Exclude<NavRole,"home">,string> = {
  myroom:"#/private-room",
  stage:"#/private-room/stage",
  gallery:"#/private-room/gallery",
  mailbox:"#/private-room/buzon",
};

const ORIGINAL_ROLES = ["home","myroom","stage","hidden","gallery","mailbox"] as const;

function routeToRole() {
  const hash = window.location.hash;
  if (hash === ROUTES.stage) return "stage";
  if (hash === ROUTES.gallery) return "gallery";
  if (hash === ROUTES.mailbox) return "mailbox";
  return "myroom";
}

function setActiveRole(role:Exclude<NavRole,"home">) {
  document.querySelectorAll<HTMLButtonElement>("[data-userfx-nav-role]").forEach((button) => {
    button.classList.toggle("is-active",button.dataset.userfxNavRole === role);
  });
}

function assignNavRoles(nav:HTMLElement) {
  if (nav.dataset.userfxNavConfigured === "1") return;

  const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>(":scope > button")).filter((button) => !button.classList.contains("pvr-club-mobile-oncam"));
  if (buttons.length < 6) return;

  buttons.slice(0,6).forEach((button,index) => {
    const role = ORIGINAL_ROLES[index];
    button.classList.remove("is-active");

    if (role === "hidden") {
      button.dataset.userfxNavRole = "hidden";
      button.hidden = true;
      button.setAttribute("aria-hidden","true");
      return;
    }

    button.dataset.userfxNavRole = role;
    button.hidden = false;
    button.removeAttribute("aria-hidden");
    button.textContent = LABELS[role];
  });

  nav.dataset.userfxNavConfigured = "1";
  setActiveRole(routeToRole());
}

function configureNav(nav:HTMLElement) {
  assignNavRoles(nav);
  if (nav.dataset.userfxNavigationBound === "1") return;

  nav.addEventListener("click",(event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>("button[data-userfx-nav-role]");
    if (!button || !nav.contains(button)) return;

    const role = button.dataset.userfxNavRole as NavRole | "hidden" | undefined;
    if (!role || role === "hidden") return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (role === "home") {
      window.location.assign(HOME_URL);
      return;
    }

    window.location.hash = ROUTES[role];
  },true);

  nav.dataset.userfxNavigationBound = "1";
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

function applyPrivateRoomNavigation() {
  document.querySelectorAll<HTMLElement>(".pvr-club-tabs").forEach(configureNav);
  configureCameraStudio();
  setActiveRole(routeToRole());
}

export default function PrivateRoomNavigationController() {
  useEffect(() => {
    let frame = 0;

    applyPrivateRoomNavigation();

    const handleHashChange = () => {
      setActiveRole(routeToRole());
    };

    const observer = new MutationObserver((mutations) => {
      const structuralChange = mutations.some((mutation) => mutation.type === "childList" && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0));
      if (!structuralChange) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(applyPrivateRoomNavigation);
    });

    window.addEventListener("hashchange",handleHashChange);
    observer.observe(document.body,{childList:true,subtree:true});

    return () => {
      window.removeEventListener("hashchange",handleHashChange);
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  },[]);

  return null;
}
