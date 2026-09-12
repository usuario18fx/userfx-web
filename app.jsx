import { useEffect, useState } from "react";
import VaultHome from "./components/VaultHome/VaultHome";
import PrivateRoom from "./components/PrivateRoom/PrivateRoom";

function getRoute() {
  return typeof window !== "undefined" ? window.location.hash || "#/" : "#/";
}

function cleanHandoffParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete("handoff");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
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
          sessionStorage.setItem("vault_unlocked", "true");
          if (data?.planId) sessionStorage.setItem("vault_plan", data.planId);
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

      try {
        const sessionResponse = await fetch("/api/access-session", {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          cache: "no-store",
        });
        const session = await sessionResponse.json().catch(() => ({}));

        if (sessionResponse.ok && session?.authenticated && session?.expiresAt) {
          const syncKey = `userfx_browser_handoff:${session.expiresAt}`;
          if (sessionStorage.getItem(syncKey) === "1") return;

          const handoffResponse = await fetch("/api/handoff", {
            method: "POST",
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            cache: "no-store",
          });
          const handoff = await handoffResponse.json().catch(() => ({}));

          if (handoffResponse.ok && handoff?.url) {
            sessionStorage.setItem(syncKey, "1");
            if (typeof telegram.openLink === "function") {
              telegram.openLink(handoff.url);
            } else {
              window.open(handoff.url, "_blank", "noopener,noreferrer");
            }
            return;
          }
        }
      } catch {}

      if (!cancelled && attempts < 60) {
        timer = window.setTimeout(syncToBrowser, 1500);
      }
    };

    timer = window.setTimeout(syncToBrowser, 1000);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (route === "#/private-room") {
    return <PrivateRoom />;
  }

  return <VaultHome />;
}
