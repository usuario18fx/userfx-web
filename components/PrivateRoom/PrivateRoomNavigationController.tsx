import {useEffect} from "react";

const HOME_URL = "https://user18fx.com";
const USER18FX_URL = "https://t.me/User18Fx";

type NavRole = "home" | "live" | "stage" | "members" | "gallery" | "messages";

const DESKTOP_LABELS:Record<NavRole,string> = {
  home:"INICIO",
  live:"LIVE CAM",
  stage:"STAGE",
  gallery:"GALLERY",
  members:"MEMBERS",
  messages:"MESSAGES",
};

const MOBILE_LABELS:Record<NavRole,string> = {
  home:"INICIO",
  live:"LIVE CAM",
  stage:"STAGE",
  gallery:"GALLERY",
  members:"MEMBERS",
  messages:"MESSAGES",
};

const ORDER:NavRole[] = ["home","live","stage","gallery","members","messages"];

function assignRoles(nav:HTMLElement) {
  const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>(":scope > button"))
    .filter((button) => !button.classList.contains("pvr-club-mobile-oncam"));

  if (buttons.length < 6) return;

  const originalRoles:NavRole[] = ["home","live","stage","members","gallery","messages"];

  buttons.slice(0,6).forEach((button,index) => {
    if (!button.dataset.userfxNavRole) {
      button.dataset.userfxNavRole = originalRoles[index];
    }
  });
}

function configureNav(nav:HTMLElement,mobile:boolean) {
  assignRoles(nav);

  const labels = mobile ? MOBILE_LABELS : DESKTOP_LABELS;
  const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>(":scope > button"));
  const byRole = new Map<NavRole,HTMLButtonElement>();

  buttons.forEach((button) => {
    const role = button.dataset.userfxNavRole as NavRole | undefined;
    if (role) byRole.set(role,button);
  });

  ORDER.forEach((role) => {
    const button = byRole.get(role);
    if (!button) return;
    button.textContent = labels[role];
    nav.appendChild(button);
  });

  const home = byRole.get("home");
  if (home && home.dataset.userfxHomeBound !== "1") {
    const openHome = (event:Event) => {
      event.preventDefault();
      event.stopPropagation();
      if ("stopImmediatePropagation" in event) event.stopImmediatePropagation();
      window.location.assign(HOME_URL);
    };

    home.addEventListener("click",openHome,true);
    home.dataset.userfxHomeBound = "1";
  }
}

function configureDefaultFriend() {
  const grid = document.querySelector<HTMLElement>(".pvr-live-members-grid");
  if (!grid || grid.querySelector("[data-userfx-default-friend='1']")) return;

  const friend = document.createElement("button");
  friend.type = "button";
  friend.className = "pvr-live-member-empty pvr-live-default-friend";
  friend.dataset.userfxDefaultFriend = "1";
  friend.setAttribute("aria-label","Open @User18Fx contact");
  friend.innerHTML = [
    '<span class="pvr-live-member-dot is-online"></span>',
    '<strong>@USER18FX</strong>',
    '<small>DEFAULT FRIEND · PRIVATE CONTACT</small>',
  ].join("");
  friend.addEventListener("click",() => window.open(USER18FX_URL,"_blank","noopener,noreferrer"));

  grid.prepend(friend);
}

function configureAlbum() {
  const gallery = document.querySelector<HTMLElement>(".pvr-gallery-section");
  if (!gallery) return;

  const heading = gallery.querySelector<HTMLElement>("#gallery-heading");
  if (heading) heading.textContent = "MY ALBUM";

  const kicker = gallery.querySelector<HTMLElement>(".pvr-section-head > div > span");
  if (kicker) kicker.textContent = "USER18FX · PRIVATE GALLERY";
}

function configureStage() {
  const stage = document.querySelector<HTMLElement>(".pvr-live-group");
  if (!stage) return;

  const kicker = stage.querySelector<HTMLElement>(".pvr-live-section-head > div > span");
  const title = stage.querySelector<HTMLElement>(".pvr-live-section-head > div > strong");

  if (kicker) kicker.textContent = "STAGE";
  if (title) title.textContent = "PRIVATE GROUP · 5";
}

function applyPrivateRoomNavigation() {
  const desktop = document.querySelector<HTMLElement>(".pvr-club-tabs");
  const mobile = document.querySelector<HTMLElement>(".pvr-club-mobile-tabs");

  if (desktop) configureNav(desktop,false);
  if (mobile) configureNav(mobile,true);

  configureDefaultFriend();
  configureAlbum();
  configureStage();
}

export default function PrivateRoomNavigationController() {
  useEffect(() => {
    let frame = window.requestAnimationFrame(applyPrivateRoomNavigation);

    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(applyPrivateRoomNavigation);
    });

    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener("resize",applyPrivateRoomNavigation);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize",applyPrivateRoomNavigation);
    };
  },[]);

  return null;
}
