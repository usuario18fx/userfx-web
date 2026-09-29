import { useEffect } from "react";
import "./PrivateRoomLogout.css";

const HOME_URL = "https://user18fx.com";

function clearLocalAccessState() {
  try {
    const sessionKeys = [
      "vault_unlocked",
      "vault_plan",
      "userfx_access_code",
      "memberAccess",
    ];

    sessionKeys.forEach((key) => sessionStorage.removeItem(key));

    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("userfx_browser_handoff:")) sessionStorage.removeItem(key);
    });
  } catch {
  }
}

async function logout() {
  try {
    await fetch("/api/access-session",{
      method:"DELETE",
      headers:{Accept:"application/json"},
      credentials:"same-origin",
      cache:"no-store",
    });
  } catch {
  }

  clearLocalAccessState();
  window.location.assign(HOME_URL);
}

function attachLogoutButton() {
  const membership = document.querySelector<HTMLButtonElement>(".pvr-club-membership");
  if (!membership || document.querySelector(".pvr-club-logout")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "pvr-club-logout";
  button.textContent = "LOG OUT";
  button.setAttribute("aria-label","Log out of Private Room");
  button.addEventListener("click",logout);

  membership.insertAdjacentElement("afterend",button);
}

export default function PrivateRoomLogout() {
  useEffect(() => {
    let frame = 0;

    attachLogoutButton();

    const observer = new MutationObserver((mutations) => {
      const structuralChange = mutations.some((mutation) => mutation.type === "childList" && mutation.addedNodes.length > 0);
      if (!structuralChange) return;

      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(attachLogoutButton);
    });

    observer.observe(document.body,{childList:true,subtree:true});

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      document.querySelector(".pvr-club-logout")?.remove();
    };
  },[]);

  return null;
}
