import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Feature = "oncam" | "rec" | "chat" | "multimedia";
type Permissions = Record<Feature, boolean>;
type Access = { ready: boolean; authenticated: boolean; features: Permissions };
const NONE: Permissions = { oncam: false, rec: false, chat: false, multimedia: false };
const AccessContext = createContext<Access>({ ready: false, authenticated: false, features: NONE });

export function usePrivatePermissions() {
  return useContext(AccessContext);
}

export function PrivatePermissionsProvider({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<Access>({ ready: false, authenticated: false, features: NONE });
  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      controller?.abort();
      controller = new AbortController();
      const current = controller;
      try {
        const response = await fetch("/api/access-session", { credentials: "same-origin", cache: "no-store", signal: current.signal });
        const data = await response.json();
        if (!active || current.signal.aborted) return;
        const authenticated = response.ok && data.authenticated === true;
        const features = Object.fromEntries(Object.keys(NONE).map((key) => [key, authenticated && data.features?.[key] === true])) as Permissions;
        setAccess({ ready: true, authenticated, features });
        clearTimeout(expiryTimer);
        if (authenticated && data.expiresAt) {
          const delay = Date.parse(data.expiresAt) - Date.now();
          if (Number.isFinite(delay)) expiryTimer = setTimeout(() => {
            setAccess({ ready: true, authenticated: false, features: NONE });
            void refresh();
          }, Math.max(0, Math.min(delay, 2147483647)));
        }
      } catch {
        if (active && !current.signal.aborted) setAccess({ ready: true, authenticated: false, features: NONE });
      }
    };
    const onRefresh = () => { void refresh(); };
    void refresh();
    const interval = setInterval(onRefresh, 30000);
    window.addEventListener("userfx:access-changed", onRefresh);
    window.addEventListener("focus", onRefresh);
    return () => {
      active = false;
      controller?.abort();
      clearTimeout(expiryTimer);
      clearInterval(interval);
      window.removeEventListener("userfx:access-changed", onRefresh);
      window.removeEventListener("focus", onRefresh);
    };
  }, []);
  return (
    <AccessContext.Provider value={access}>
    {children}
    </AccessContext.Provider>
  );
}

export function PrivateFeatureGate({ feature, children, quiet = false }: { feature: Feature; children: ReactNode; quiet?: boolean }) {
  const access = usePrivatePermissions();
  if (!access.ready || !access.authenticated) return null;
  if (!access.features[feature]) {
    if (quiet) return null;
    return (
      <section className="pvr-route-page" role="status" aria-live="polite" style={{ position: "relative", zIndex: 30, margin: "100px auto", padding: 24, maxWidth: 520, background: "#101010", color: "white" }}>
        <h2>
        ACCESS RESTRICTED
        </h2>
        <p>
        {feature === "chat" ? "CHAT is not included in your access." : "Available with PRX0, VIPX or SPCL access."}
        </p>
        <a href="#/private-room">
        BACK TO MYROOM
        </a>
      </section>
    );
  }
  return <>{children}</>;
}
