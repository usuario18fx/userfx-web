import {useEffect} from "react";

import "./PrivateRoomNavigationController.css";

const HOME_URL = "https://user18fx.com";
const USER18FX_URL = "https://t.me/User18Fx";

type NavRole = "home" | "myroom" | "stage" | "gallery" | "mailbox";

const LABELS:Record<NavRole,string> = {
  home:"INICIO",
  myroom:"MYROOM",
  stage:"STAGE",
  gallery:"GALLERY",
  mailbox:"BUZON",
};

const ORIGINAL_ROLES = ["home","myroom","stage","hidden","gallery","mailbox"] as const;
const ORDER:NavRole[] = ["home","myroom","stage","gallery","mailbox"];

function setActiveRole(role:NavRole) {
  document.querySelectorAll<HTMLButtonElement>("[data-userfx-nav-role]").forEach((button) => {
    button.classList.toggle("is-active",button.dataset.userfxNavRole === role);
  });
}

function scrollToSelector(selector:string) {
  document.querySelector(selector)?.scrollIntoView({
    behavior:"smooth",
    block:"start",
  });
}

function cameraIsLive() {
  const indicator = document.querySelector<HTMLElement>(".pvr-account-online");
  return Boolean(indicator && !indicator.classList.contains("is-offline"));
}

function openProfileEditor() {
  const launcher = document.querySelector<HTMLButtonElement>(".pvr-account-launcher");
  if (!launcher) return;
  if (!launcher.classList.contains("is-open")) launcher.click();
}

function openProfileCamera() {
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

function showToast(message:string) {
  let toast = document.querySelector<HTMLElement>(".pvr-userfx-toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.className = "pvr-userfx-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("is-visible");

  window.setTimeout(() => {
    toast?.classList.remove("is-visible");
  },2400);
}

function assignNavRoles(nav:HTMLElement) {
  const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>(":scope > button"))
    .filter((button) => !button.classList.contains("pvr-club-mobile-oncam"));

  if (buttons.length < 6) return;

  buttons.slice(0,6).forEach((button,index) => {
    const role = ORIGINAL_ROLES[index];

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

  const byRole = new Map<NavRole,HTMLButtonElement>();

  buttons.forEach((button) => {
    const role = button.dataset.userfxNavRole as NavRole | "hidden" | undefined;
    if (role && role !== "hidden") byRole.set(role,button);
  });

  ORDER.forEach((role) => {
    const button = byRole.get(role);
    if (button) nav.appendChild(button);
  });
}

function bindNavAction(button:HTMLButtonElement,role:NavRole) {
  if (button.dataset.userfxNavigationBound === "1") return;

  const handleClick = (event:Event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    setActiveRole(role);

    if (role === "home") {
      window.location.assign(HOME_URL);
      return;
    }

    if (role === "myroom") {
      scrollToSelector(".pvr-myroom-section");
      return;
    }

    if (role === "stage") {
      scrollToSelector(".pvr-stage-hub");
      return;
    }

    if (role === "gallery") {
      scrollToSelector(".pvr-gallery-section");
      return;
    }

    scrollToSelector(".pvr-buzon-section");
  };

  button.addEventListener("click",handleClick,true);
  button.dataset.userfxNavigationBound = "1";
}

function configureNav(nav:HTMLElement) {
  assignNavRoles(nav);

  nav.querySelectorAll<HTMLButtonElement>(":scope > button[data-userfx-nav-role]").forEach((button) => {
    const role = button.dataset.userfxNavRole as NavRole | "hidden" | undefined;
    if (!role || role === "hidden") return;
    bindNavAction(button,role);
  });
}

function makeSectionHeader(kicker:string,title:string,meta:string) {
  const header = document.createElement("div");
  header.className = "pvr-userfx-section-head";

  const copy = document.createElement("div");
  const kickerNode = document.createElement("span");
  const titleNode = document.createElement("strong");
  const metaNode = document.createElement("small");

  kickerNode.textContent = kicker;
  titleNode.textContent = title;
  metaNode.textContent = meta;

  copy.append(kickerNode,titleNode);
  header.append(copy,metaNode);

  return header;
}

function buildMyRoomSection() {
  if (document.querySelector(".pvr-myroom-section")) return;

  const anchor = document.querySelector<HTMLElement>(".pvr-live-home");
  if (!anchor) return;

  const section = document.createElement("section");
  section.className = "pvr-userfx-section pvr-myroom-section";
  section.setAttribute("aria-label","MyRoom profile and posts");

  section.appendChild(makeSectionHeader("USER FX · PERSONAL ROOM","MYROOM","PROFILE + POSTS"));

  const grid = document.createElement("div");
  grid.className = "pvr-myroom-grid";

  const profile = document.createElement("article");
  profile.className = "pvr-myroom-profile";
  profile.innerHTML = [
    '<div class="pvr-myroom-avatar">FX<span></span></div>',
    '<div class="pvr-myroom-profile-copy">',
      '<span>YOUR PRIVATE PROFILE</span>',
      '<strong>@USER18FX</strong>',
      '<small>Share updates, photos, clips and private posts with your contacts.</small>',
    '</div>',
  ].join("");

  const profileAction = document.createElement("button");
  profileAction.type = "button";
  profileAction.className = "pvr-myroom-profile-action";
  profileAction.textContent = "OPEN PROFILE";
  profileAction.addEventListener("click",openProfileEditor);
  profile.appendChild(profileAction);

  const composer = document.createElement("article");
  composer.className = "pvr-myroom-composer";
  composer.innerHTML = [
    '<span>NEW POST</span>',
    '<strong>WHAT DO YOU WANT TO SHARE?</strong>',
    '<small>Publishing tools will connect here. Your profile stays private by default.</small>',
  ].join("");

  const cameraAction = document.createElement("button");
  cameraAction.type = "button";
  cameraAction.className = "pvr-myroom-camera-action";
  cameraAction.textContent = cameraIsLive() ? "MANAGE CAMERA" : "OPEN CAMERA";
  cameraAction.addEventListener("click",openProfileCamera);
  composer.appendChild(cameraAction);

  grid.append(profile,composer);
  section.appendChild(grid);

  const firstContent = anchor.querySelector(".pvr-live-home-head")?.nextElementSibling;
  if (firstContent) {
    firstContent.insertAdjacentElement("beforebegin",section);
  } else {
    anchor.appendChild(section);
  }
}

function buildStageHub() {
  if (document.querySelector(".pvr-stage-hub")) return;

  const liveGrid = document.querySelector<HTMLElement>(".pvr-live-grid");
  if (!liveGrid?.parentElement) return;

  const section = document.createElement("section");
  section.className = "pvr-userfx-section pvr-stage-hub";
  section.setAttribute("aria-label","Stage cameras");

  section.appendChild(makeSectionHeader("USER FX · LIVE NETWORK","STAGE","ALL CAMERAS"));

  const copy = document.createElement("p");
  copy.className = "pvr-userfx-section-copy";
  copy.textContent = "Public cameras appear on Stage. Cameras from your contacts are kept in a separate row below.";
  section.appendChild(copy);

  const contacts = document.createElement("div");
  contacts.className = "pvr-stage-contact-cams";

  const userCam = document.createElement("button");
  userCam.type = "button";
  userCam.className = "pvr-stage-contact-card";
  userCam.innerHTML = [
    '<span class="pvr-stage-contact-preview">FX</span>',
    '<strong>@USER18FX</strong>',
    '<small>CONTACT CAMERA · OFFLINE</small>',
  ].join("");
  userCam.addEventListener("click",() => window.open(USER18FX_URL,"_blank","noopener,noreferrer"));

  const empty = document.createElement("div");
  empty.className = "pvr-stage-contact-card is-empty";
  empty.innerHTML = [
    '<span class="pvr-stage-contact-preview">+</span>',
    '<strong>CONTACT CAMERAS</strong>',
    '<small>Your friends cameras will appear here.</small>',
  ].join("");

  contacts.append(userCam,empty);
  section.appendChild(contacts);

  liveGrid.insertAdjacentElement("beforebegin",section);
}

function buildBuzonSection() {
  if (document.querySelector(".pvr-buzon-section")) return;

  const members = document.querySelector<HTMLElement>(".pvr-live-members");
  const host = members?.parentElement || document.querySelector<HTMLElement>(".pvr-live-home");
  if (!host) return;

  const section = document.createElement("section");
  section.className = "pvr-userfx-section pvr-buzon-section";
  section.setAttribute("aria-label","Private mailbox");
  section.appendChild(makeSectionHeader("PRIVATE CONTACTS","BUZON","1 FRIEND"));

  const grid = document.createElement("div");
  grid.className = "pvr-buzon-grid";

  const message = document.createElement("button");
  message.type = "button";
  message.className = "pvr-buzon-contact";
  message.innerHTML = [
    '<span class="pvr-buzon-status"></span>',
    '<span class="pvr-buzon-copy">',
      '<strong>@USER18FX</strong>',
      '<small>FRIEND · PRIVATE MESSAGE</small>',
    '</span>',
    '<i>OPEN</i>',
  ].join("");
  message.addEventListener("click",() => window.open(USER18FX_URL,"_blank","noopener,noreferrer"));

  const friends = document.createElement("div");
  friends.className = "pvr-buzon-friends";
  friends.innerHTML = [
    '<span>YOUR FRIENDS</span>',
    '<strong>1 CONTACT</strong>',
    '<small>Messages and accepted contacts will be organized here.</small>',
  ].join("");

  grid.append(message,friends);
  section.appendChild(grid);

  if (members) {
    members.insertAdjacentElement("afterend",section);
  } else {
    host.appendChild(section);
  }
}

function configureGallery() {
  const gallery = document.querySelector<HTMLElement>(".pvr-gallery-section");
  if (!gallery) return;

  gallery.classList.add("pvr-userfx-gallery");

  const heading = gallery.querySelector<HTMLElement>("#gallery-heading");
  if (heading) heading.textContent = "GALLERY";

  const kicker = gallery.querySelector<HTMLElement>(".pvr-section-head > div > span");
  if (kicker) kicker.textContent = "USER FX · PRIVATE COLLECTION";
}

function syncCameraControlState(controls:HTMLElement) {
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

function bindCameraEnter() {
  const enter = document.querySelector<HTMLButtonElement>(".pvr-camera-enter");
  if (!enter || enter.dataset.userfxEnterBound === "1") return;

  enter.addEventListener("click",() => {
    let attempts = 0;

    const finish = () => {
      attempts += 1;

      if (cameraIsLive()) {
        document.body.classList.add("pvr-camera-docked");

        window.setTimeout(() => {
          document.querySelector<HTMLButtonElement>(".pvr-camera-head > button")?.click();
          showToast("CAM ACTIVE · DEFAULT PRIVATE MODE · OPEN MYROOM TO EXPAND");
        },180);

        return;
      }

      if (attempts < 20) {
        window.setTimeout(finish,150);
      }
    };

    window.setTimeout(finish,160);
  });

  enter.dataset.userfxEnterBound = "1";
}

function configureCameraStudio() {
  const studio = document.querySelector<HTMLElement>(".pvr-camera-studio");
  if (!studio) return;

  const privateMode = studio.querySelector<HTMLButtonElement>(".pvr-camera-visibility button:first-child");

  if (privateMode && !privateMode.classList.contains("is-active")) {
    privateMode.click();
  }

  const preview = studio.querySelector<HTMLElement>(".pvr-camera-preview");

  if (preview && !preview.querySelector(".pvr-camera-media-controls")) {
    const controls = document.createElement("div");
    controls.className = "pvr-camera-media-controls";
    controls.setAttribute("aria-label","Camera controls");

    const play = document.createElement("button");
    play.type = "button";
    play.dataset.cameraAction = "play";
    play.setAttribute("aria-label","Resume camera");
    play.innerHTML = "<span>▶</span>";

    const pause = document.createElement("button");
    pause.type = "button";
    pause.dataset.cameraAction = "pause";
    pause.setAttribute("aria-label","Pause camera");
    pause.innerHTML = "<span>Ⅱ</span>";

    const mute = document.createElement("button");
    mute.type = "button";
    mute.dataset.cameraAction = "mute";
    mute.setAttribute("aria-label","Mute microphone");
    mute.innerHTML = "<span>🔇</span>";

    play.addEventListener("click",() => {
      const camera = studio.querySelector<HTMLButtonElement>(".pvr-camera-device-controls button:nth-child(1)");
      if (camera?.classList.contains("is-off")) camera.click();
      window.setTimeout(() => syncCameraControlState(controls),40);
    });

    pause.addEventListener("click",() => {
      const camera = studio.querySelector<HTMLButtonElement>(".pvr-camera-device-controls button:nth-child(1)");
      if (camera && !camera.classList.contains("is-off")) camera.click();
      window.setTimeout(() => syncCameraControlState(controls),40);
    });

    mute.addEventListener("click",() => {
      studio.querySelector<HTMLButtonElement>(".pvr-camera-device-controls button:nth-child(2)")?.click();
      window.setTimeout(() => syncCameraControlState(controls),40);
    });

    controls.append(play,pause,mute);
    preview.appendChild(controls);
    syncCameraControlState(controls);
  }

  if (!studio.querySelector(".pvr-camera-guide")) {
    const guide = document.createElement("div");
    guide.className = "pvr-camera-guide";

    const copy = document.createElement("span");
    copy.textContent = "ENTER starts your camera in PRIVATE mode. The preview stays in MYROOM.";

    const expand = document.createElement("button");
    expand.type = "button";
    expand.textContent = "WHERE TO EXPAND ↗";
    expand.addEventListener("click",() => {
      showToast("AFTER ENTER: OPEN MYROOM → MANAGE CAMERA TO EXPAND");
    });

    guide.append(copy,expand);

    const layout = studio.querySelector(".pvr-camera-layout");
    layout?.insertAdjacentElement("beforebegin",guide);
  }

  const controls = studio.querySelector<HTMLElement>(".pvr-camera-media-controls");
  if (controls) syncCameraControlState(controls);

  bindCameraEnter();
}

function applyPrivateRoomNavigation() {
  const desktop = document.querySelector<HTMLElement>(".pvr-club-tabs");
  const mobile = document.querySelector<HTMLElement>(".pvr-club-mobile-tabs");

  if (desktop) configureNav(desktop);
  if (mobile) configureNav(mobile);

  buildMyRoomSection();
  buildStageHub();
  buildBuzonSection();
  configureGallery();
  configureCameraStudio();
}

export default function PrivateRoomNavigationController() {
  useEffect(() => {
    let frame = window.requestAnimationFrame(applyPrivateRoomNavigation);

    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(applyPrivateRoomNavigation);
    });

    observer.observe(document.body,{
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class"],
    });

    window.addEventListener("resize",applyPrivateRoomNavigation);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize",applyPrivateRoomNavigation);
    };
  },[]);

  return null;
}
