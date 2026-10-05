          import { useEffect, useState } from "react";
          import VaultHome from "./components/VaultHome/VaultHome";
          import PrivateRoomLiveShell from "./components/PrivateRoom/PR-LiveShell";
import PrivateRoomDirectGate from "./components/PrivateRoom/PR-DirectGate";
          import PrivateRoomMyRoom from "./components/PrivateRoom/PR-MyRoom";
          import PrivateRoomStage from "./components/PrivateRoom/PR-Stage";
          import PrivateRoomGallery from "./components/PrivateRoom/PR-Gallery";
          import PrivateRoomBuzon from "./components/PrivateRoom/PR-Buzon";
          import PrivateRoomTopNav from "./components/PrivateRoom/PR-TopNav";
          import PrivateRoomCameraEnhancer from "./components/PrivateRoom/PR-CameraEnhancer";
          function getRoute() {
            return typeof window !== "undefined" ? window.location.hash || "#/" : "#/";
          }
          function cleanHandoffParam() {
            const url = new URL(window.location.href);
            url.searchParams.delete("handoff");
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}
function hasVerifiedSpecialCode() {
  try {
    return /^SPCL-[A-HJ-NP-Z2-9]{4}$/i.test(sessionStorage.getItem("userfx_access_code") || "");
  } catch {
    return false;
  }
}
function PrivateRoomRoute({ route }) {
  if (route.split("?")[0] === "#/private-room/stage") return (
<PrivateRoomStage />
);
  if (route === "#/private-room/gallery") return (
<PrivateRoomGallery />
);
  if (route.split("?")[0] === "#/private-room/buzon") return (
<PrivateRoomBuzon />
);
  return (
<PrivateRoomMyRoom />
);
}
export default function App() {
  const [route, setRoute] = useState(getRoute);
  useEffect(() => {
    const handleRouteChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", handleRouteChange);
    return () => window.removeEventListener("hashchange", handleRouteChange);
  }, []);
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const handoffToken = params.get("handoff");
    if (handoffToken) {
      fetch(`/api/handoff?token=${encodeURIComponent(handoffToken)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      })
        .then((response) => response.json().then((data) => ({ response, data })))
        .then(({ response, data }) => {
          if (cancelled) return;
          cleanHandoffParam();
          if (!response.ok || !data?.authenticated) return;
          try {
            sessionStorage.setItem("vault_unlocked", "true");
            if (data?.planId) sessionStorage.setItem("vault_plan", data.planId);
          } catch {}
          window.location.hash = "#/private-room";
        })
        .catch(() => {
          if (!cancelled) cleanHandoffParam();
        });
      return () => {
        cancelled = true;
      };
    }
    const telegram = window.Telegram?.WebApp;
    if (!telegram?.initData) return undefined;
    let attempts = 0;
    let timer;
    const syncToBrowser = async () => {
      if (cancelled) return;
      attempts += 1;
      if (!hasVerifiedSpecialCode()) {
        if (!cancelled && attempts < 60) timer = window.setTimeout(syncToBrowser, 1500);
        return;
      }
      try {
        const sessionResponse = await fetch("/api/access-session", {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          cache: "no-store",
        });
        const session = await sessionResponse.json().catch(() => ({}));
        if (sessionResponse.ok && session?.authenticated) {
          const sessionIdentity = session?.expiresAt || session?.telegramUsername || session?.accountId || session?.accessLabel || session?.planId || "spcl-active";
          const syncKey = `userfx_browser_handoff:${sessionIdentity}`;
          try {
            if (sessionStorage.getItem(syncKey) === "1") return;
          } catch {}
          const handoffResponse = await fetch("/api/handoff", {
            method: "POST",
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            cache: "no-store",
          });
          const handoff = await handoffResponse.json().catch(() => ({}));
          if (handoffResponse.ok && handoff?.url) {
            try {
              sessionStorage.setItem(syncKey, "1");
            } catch {}
            if (typeof telegram.openLink === "function") telegram.openLink(handoff.url);
            else window.open(handoff.url, "_blank", "noopener,noreferrer");
            return;
          }
        }
      } catch {}
      if (!cancelled && attempts < 60) timer = window.setTimeout(syncToBrowser, 1500);
    };
    timer = window.setTimeout(syncToBrowser, 1000);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);
  if (route === "#/private-room-access") {
    return (
<>
<PrivateRoomLiveShell />
</>
    );
  }
  if (route.startsWith("#/private-room") && route.split("?")[0] !== "#/private-room/gallery") {
    return (
<PrivateRoomDirectGate>
<PrivateRoomRoute key={route} route={route} />
</PrivateRoomDirectGate>
    );
  }
  if (route.startsWith("#/private-room")) {
    return (
<>
<PrivateRoomTopNav />
<PrivateRoomLiveShell />
<PrivateRoomRoute route={route} />
<PrivateRoomCameraEnhancer />
</>
    );
  }
  return (
<VaultHome />
);
}
