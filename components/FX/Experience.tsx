"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AdminModeProvider } from "@/components/PrivateRoom/PR-AdminMode";
import Landing from "./Landing";
const Portal = dynamic(() => import("../../app.jsx").then((module) => module.UserFXApp), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-svh place-items-center text-gold" role="status">
      Opening your Vault…
    </div>
  ),
});
export default function Experience() {
  const [privateRoute, setPrivateRoute] = useState(false);
  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.has("code") && !window.location.hash.startsWith("#/private-room"))
        window.location.hash = "#/private-room-access";
      setPrivateRoute(window.location.hash.startsWith("#/private-room") || params.has("handoff"));
      if (window.location.hash.startsWith("#/")) window.scrollTo({ top: 0, behavior: "instant" });
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    let cancelled = false,
      timer: ReturnType<typeof setTimeout>,
      attempts = 0;
    const track = () => {
      if (cancelled) return;
      const telegram = window.Telegram?.WebApp;
      if (!telegram?.initData && ++attempts < 10) {
        timer = setTimeout(track, 500);
        return;
      }
      if (telegram?.initData) telegram.ready?.();
      void fetch("/api/miniapp-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: telegram?.initData || "" }),
      }).catch(() => {});
    };
    track();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  return (
    <AdminModeProvider>
      {privateRoute ? (
        <div className="fx-platform">
          <Portal />
        </div>
      ) : (
        <Landing />
      )}
    </AdminModeProvider>
  );
}
