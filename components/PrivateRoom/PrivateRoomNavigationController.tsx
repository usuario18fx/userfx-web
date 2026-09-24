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
const ORIGINAL_ORDER:NavRole[] = ["home","live","stage","members","gallery","messages"];

function setActiveRole(role:NavRole) {
  document.querySelectorAll<HTMLButtonElement>("[data-userfx-nav-role]").forEach((button) => {
    button.classList.toggle("is-active",button.dataset.userfxNavRole === role);
  });
}

function assignRoles(nav:HTMLElement) {
  const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>(":scope > button"))
    .filter((button) => !button.classList.contains("pvr-club-mobile-oncam"));

  if (buttons.length < 6) return;

  buttons.slice(0,6).forEach((button,index) => {
    if (!button.dataset.userfxNavRole) {
      button.dataset.userfxNavRole = ORIGINAL_ORDER[index];
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
    if (button.textContent !== labels[role]) button.textContent = labels[role];
  });

  const orderedButtons = ORDER.map((role) => byRole.get(role)).filter(Boolean) as HTMLButtonElement[];
  const currentButtons = Array.from(nav.querySelectorAll<HTMLButtonElement>(":scope > button"))
    .filter((button) => !button.classList.contains("pvr-club-mobile-oncam"));

  const orderMatches =
    orderedButtons.length === currentButtons.length &&
    orderedButtons.every((button,index) => button === currentButtons[index]);

  if (!orderMatches) {
    orderedButtons.forEach((button) => nav.appendChild(button));
  }

  const home = byRole.get("home");
  if (home && home.dataset.userfxHomeBound !== "1") {
    const openHome = (event:Event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      window.location.assign(HOME_URL);
    };

    home.addEventListener("click",openHome,true);
    home.dataset.userfxHomeBound = "1";
  }

  const messages = byRole.get("messages");
  if (messages && messages.dataset.userfxMessagesBound !== "1") {
    const openMessages = (event:Event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setActiveRole("messages");
      document.querySelector(".pvr-live-messages")?.scrollIntoView({
        behavior:"smooth",
        block:"start",
      });
    };

    messages.addEventListener("click",openMessages,true);
    messages.dataset.userfxMessagesBound = "1";
  }
}

function styleContactButton(button:HTMLButtonElement) {
  button.style.appearance = "none";
  button.style.width = "100%";
  button.style.textAlign = "left";
  button.style.font = "inherit";
  button.style.cursor = "pointer";
}

function buildUser18FxContact(extraClass:string) {
  const contact = document.createElement("button");
  contact.type = "button";
  contact.className = `pvr-live-member-empty ${extraClass}`;
  contact.setAttribute("aria-label","Open @User18Fx contact");
  contact.innerHTML = [
    '<span class="pvr-live-member-dot is-online"></span>',
    '<strong>@USER18FX</strong>',
    '<small>DEFAULT FRIEND · PRIVATE CONTACT</small>',
  ].join("");
  styleContactButton(contact);
  contact.addEventListener("click",() => window.open(USER18FX_URL,"_blank","noopener,noreferrer"));
  return contact;
}

function configureDefaultFriend() {
  const grid = document.querySelector<HTMLElement>(".pvr-live-members-grid");
  if (!grid || grid.querySelector("[data-userfx-default-friend='1']")) return;

  const friend = buildUser18FxContact("pvr-live-default-friend");
  friend.dataset.userfxDefaultFriend = "1";
  grid.prepend(friend);
}

function configureMessagesSection() {
  if (document.querySelector(".pvr-live-messages")) return;

  const members = document.querySelector<HTMLElement>(".pvr-live-members");
  if (!members?.parentElement) return;

  const section = document.createElement("section");
  section.className = "pvr-live-members pvr-live-messages";
  section.setAttribute("aria-label","Private messages");
  section.innerHTML = [
    '<div class="pvr-live-section-head">',
      '<div>',
        '<span>PRIVATE CONTACTS</span>',
        '<strong>MESSAGES</strong>',
      '</div>',
      '<small>1 CONTACT</small>',
    '</div>',
    '<div class="pvr-live-members-grid pvr-live-messages-grid"></div>',
  ].join("");

  members.insertAdjacentElement("afterend",section);

  const grid = section.querySelector<HTMLElement>(".pvr-live-messages-grid");
  if (!grid) return;

  const contact = buildUser18FxContact("pvr-live-message-contact");
  contact.querySelector("small")!.textContent = "FRIEND · OPEN PRIVATE MESSAGE";
  grid.appendChild(contact);
}

function configureAlbum() {
  const gallery = document.querySelector<HTMLElement>(".pvr-gallery-section");
  if (!gallery) return;

  const heading = gallery.querySelector<HTMLElement>("#gallery-heading");
  if (heading && heading.textContent !== "MY ALBUM") heading.textContent = "MY ALBUM";

  const kicker = gallery.querySelector<HTMLElement>(".pvr-section-head > div > span");
  if (kicker && kicker.textContent !== "USER18FX · PRIVATE GALLERY") {
    kicker.textContent = "USER18FX · PRIVATE GALLERY";
  }
}

function configureStage() {
  const stage = document.querySelector<HTMLElement>(".pvr-live-group");
  if (!stage) return;

  const kicker = stage.querySelector<HTMLElement>(".pvr-live-section-head > div > span");
  const title = stage.querySelector<HTMLElement>(".pvr-live-section-head > div > strong");

  if (kicker && kicker.textContent !== "STAGE") kicker.textContent = "STAGE";
  if (title && title.textContent !== "PRIVATE GROUP · 5") title.textContent = "PRIVATE GROUP · 5";
}

function applyPrivateRoomNavigation() {
  const desktop = document.querySelector<HTMLElement>(".pvr-club-tabs");
  const mobile = document.querySelector<HTMLElement>(".pvr-club-mobile-tabs");

  if (desktop) configureNav(desktop,false);
  if (mobile) configureNav(mobile,true);

  configureDefaultFriend();
  configureMessagesSection();
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
