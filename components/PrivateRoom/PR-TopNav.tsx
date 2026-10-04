          import { useCallback, useEffect, useState } from "react";

          type PrivateRoomMood = "cine" | "vintage" | "arcade";
          const MOOD_KEY = "userfx_private_room_mood";
          const MOODS: readonly PrivateRoomMood[] = ["cine", "vintage", "arcade"];

          function readMood(): PrivateRoomMood {
            try {
              const stored = localStorage.getItem(MOOD_KEY);
              return stored === "vintage" || stored === "arcade" ? stored : "cine";
            } catch {
              return "cine";
            }
          }

          function applyMood(mood: PrivateRoomMood) {
            document.documentElement.dataset.pvrMood = mood;
            try {
              localStorage.setItem(MOOD_KEY, mood);
            } catch {}
            window.dispatchEvent(new CustomEvent("userfx:private-room-mood", { detail: mood }));
          }
          import "./PR-TopNav.css";

          const HOME_URL = "https://user18fx.com";

          const NAV_ITEMS = [
            { label: "INICIO", route: HOME_URL, external: true },
            { label: "MYROOM", route: "#/private-room" },
            { label: "STAGE", route: "#/private-room/stage" },
            { label: "GALLERY", route: "#/private-room/gallery" },
            { label: "BUZON", route: "#/private-room/buzon" },
          ] as const;

          function cameraIsLive() {
            const indicator = document.querySelector<HTMLElement>(".pvr-account-online");
            return Boolean(indicator && !indicator.classList.contains("is-offline"));
          }

          function openProfile() {
            const launcher = document.querySelector<HTMLButtonElement>(".pvr-account-launcher");
            if (launcher && !launcher.classList.contains("is-open")) launcher.click();
          }

          function openCameraNow() {
            window.dispatchEvent(new CustomEvent("userfx:open-camera-studio"));
          }

          function openMembership() {
            document.querySelector<HTMLButtonElement>(".buttonupgrade")?.click();
          }

          function openRewards() {
            window.dispatchEvent(new CustomEvent("userfx:open-rewards"));
          }

          function clearLocalAccessState() {
            try {
              ["vault_unlocked", "vault_plan", "userfx_access_code", "memberAccess"].forEach((key) => sessionStorage.removeItem(key));
              Object.keys(sessionStorage).forEach((key) => {
                if (key.startsWith("userfx_browser_handoff:")) sessionStorage.removeItem(key);
              });
            } catch {}
          }

          function isExternalNavItem(item: (typeof NAV_ITEMS)[number]): item is Extract<(typeof NAV_ITEMS)[number], { external: true }> {
            return "external" in item && item.external;
          }

          async function logout() {
            try {
              await fetch("/api/access-session", {
                method: "DELETE",
                headers: { Accept: "application/json" },
                credentials: "same-origin",
                cache: "no-store",
              });
            } catch {}

            clearLocalAccessState();
            window.location.assign(HOME_URL);
          }

          async function openInBrowser() {
            try {
              const response = await fetch("/api/handoff", {
                method: "POST",
                headers: { Accept: "application/json" },
                credentials: "same-origin",
                cache: "no-store",
              });
              const data = await response.json().catch(() => ({}));
              if (!response.ok || !data?.url) return;
              const telegram = window.Telegram?.WebApp;
              if (typeof telegram?.openLink === "function") {
                telegram.openLink(data.url);
                return;
              }
              window.open(data.url, "_blank", "noopener,noreferrer");
            } catch {}
          }

          export default function PrivateRoomTopNav() {
            const [route, setRoute] = useState(() => window.location.hash || "#/private-room");
            const [accessCode, setAccessCode] = useState("PRIVATE ACCESS");
            const [cameraLive, setCameraLive] = useState(false);
            const [insideTelegram, setInsideTelegram] = useState(false);
            const [browserNoticeOpen, setBrowserNoticeOpen] = useState(false);
            const [mood, setMood] = useState<PrivateRoomMood>(() => readMood());

            useEffect(() => {
              applyMood(mood);
            }, [mood]);

            const readLiveState = useCallback(() => {
              const access = document.querySelector<HTMLElement>(".pvr-live-dot")?.textContent?.trim();
              if (access) setAccessCode(access);
              setCameraLive(cameraIsLive());
            }, []);

            useEffect(() => {
              const handleHashChange = () => setRoute(window.location.hash || "#/private-room");
              window.addEventListener("hashchange", handleHashChange);
              return () => window.removeEventListener("hashchange", handleHashChange);
            }, []);

            useEffect(() => {
              setInsideTelegram(Boolean(window.Telegram?.WebApp?.initData));
            }, []);

            useEffect(() => {
              readLiveState();
              const observer = new MutationObserver(readLiveState);
              observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class"] });
              return () => observer.disconnect();
            }, [readLiveState]);

            function requestCamera() {
              if (insideTelegram) {
                setBrowserNoticeOpen(true);
                return;
              }
              openCameraNow();
            }

            function continueCameraInTelegram() {
              setBrowserNoticeOpen(false);
              openCameraNow();
            }

            async function continueCameraInBrowser() {
              setBrowserNoticeOpen(false);
              await openInBrowser();
            }

            function navigate(item: (typeof NAV_ITEMS)[number]) {
              if (item.label === "GALLERY" && cameraLive) return;
              if (isExternalNavItem(item)) {
                window.location.assign(item.route);
                return;
              }
              window.location.hash = item.route;
            }

            return (
              <header className="pvr-club-nav pvr-club-nav--unified">
                <div className="pvr-club-nav-inner">
                  <button
                    type="button"
                    className="pvr-club-brand"
                    onClick={() => {
                      window.location.hash = "#/private-room";
                    }}>
                    <span className="pvr-club-brand-mark">
                    FX
                    </span>
                    <span className="pvr-club-brand-copy">
                      <strong>
                      MY ROOM
                      </strong>
                      <small>
                      PRIVATE CLUB
                      </small>
                    </span>
                  </button>
                  <nav className="pvr-club-tabs" aria-label="Private Room navigation">
                    {NAV_ITEMS.map((item) => {
                      const galleryLocked = item.label === "GALLERY" && cameraLive;
                      const isExternal = isExternalNavItem(item);
                      return (
                        <button key={item.label} type="button" className={`${!isExternal && route === item.route ? "is-active" : ""}${galleryLocked ? " is-camera-locked" : ""}`.trim()} onClick={() => navigate(item)} disabled={galleryLocked} title={galleryLocked ? "Turn camera off to open Gallery" : undefined}>
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="pvr-club-actions">
          <button type="button" className="pvr-club-code" onClick={openProfile}>
            <span>
            MEMBER ACCESS
            </span>
            <strong>{accessCode}</strong>
          </button>
          <button type="button" className={`pvr-club-cam ${cameraLive ? "is-live" : ""}`} onClick={requestCamera}>
            <span />
            {cameraLive ? "ONCAM" : "OFFCAM"}
          </button>
          <button type="button" className="pvr-club-reward" onClick={openRewards}>
            <span className="pvr-reward-icon-container">
              <svg className="pvr-reward-box-top" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 60 20" aria-hidden="true">
                <path strokeLinecap="round" strokeWidth="4" stroke="#6A8EF6" d="M2 18L58 18" />
                <circle strokeWidth="5" stroke="#6A8EF6" fill="#101218" r="7" cy="9.5" cx="20.5" />
                <circle strokeWidth="5" stroke="#6A8EF6" fill="#101218" r="7" cy="9.5" cx="38.5" />
              </svg>
              <svg className="pvr-reward-box-body" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 58 44" aria-hidden="true">
                <rect strokeWidth="4" stroke="#6A8EF6" fill="#101218" rx="3" x="2" y="2" width="54" height="40" />
                <line strokeWidth="6" stroke="#6A8EF6" y2="29" x2="58" y1="29" x1="0" />
                <path strokeLinecap="round" strokeWidth="5" stroke="#6A8EF6" d="M45.0005 20L36 3" />
                <path strokeLinecap="round" strokeWidth="5" stroke="#6A8EF6" d="M21 3L13.0002 19.9992" />
              </svg>
              <span className="pvr-reward-coin" />
            </span>
            <span className="pvr-reward-text">
            Rewards
            </span>
          </button>
          <button type="button" className="pvr-club-profile" onClick={openProfile}>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4.5 20c.7-4 3.2-6 7.5-6s6.8 2 7.5 6H4.5z" />
            </svg>
          </button>
          <button type="button" className="pvr-club-membership" onClick={openMembership}>
            <svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="m18 0 8 12 10-8-4 20H4L0 4l10 8 8-12z" />
            </svg>
          </button>
          {insideTelegram && (
            <button type="button" className="pvr-open-browser" onClick={openInBrowser}>
              OPEN IN BROWSER
            </button>
          )}
          <button type="button" className="pvr-club-logout" onClick={logout}>
            LOG OUT
          </button>
        </div>
      </div>
      <div className="pvr-global-mood-bar">
        <span>
VISUAL MODE
        </span>
        <div className="pvr-mood-switch" role="group" aria-label="Private Room visual mood">
          {MOODS.map((option) => (
            <button key={option} type="button" className={mood === option ? "is-active" : ""} onClick={() => setMood(option)}>
{option.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <nav className="pvr-club-mobile-tabs" aria-label="Private Room mobile navigation">
        {insideTelegram && (
          <button type="button" className="pvr-open-browser pvr-open-browser--mobile" onClick={openInBrowser}>
            OPEN IN BROWSER
          </button>
        )}
        {cameraLive && (
          <button type="button" className="pvr-club-mobile-oncam" onClick={requestCamera}>
            ● ONCAM
          </button>
        )}
        {NAV_ITEMS.map((item) => {
          const galleryLocked = item.label === "GALLERY" && cameraLive;
          const isExternal = isExternalNavItem(item);
          return (
            <button key={item.label} type="button" className={`${!isExternal && route === item.route ? "is-active" : ""}${galleryLocked ? " is-camera-locked" : ""}`.trim()} onClick={() => navigate(item)} disabled={galleryLocked}>
              {item.label}
            </button>
          );
        })}
      </nav>
        {browserNoticeOpen ? (
          <div className="pvr-browser-recommend" role="dialog" aria-modal="true" aria-label="Open in browser recommendation">
            <div className="pvr-browser-recommend-card">
              <span>
CAMERA EXPERIENCE
              </span>
              <strong>
BETTER IN YOUR BROWSER
              </strong>
              <p>
For a larger camera view and more stable controls, continue in your browser.
              </p>
              <div className="pvr-browser-recommend-actions">
                <button type="button" onClick={continueCameraInTelegram}>
CONTINUE HERE
                </button>
                <button type="button" onClick={continueCameraInBrowser}>
OPEN IN BROWSER
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </header>
  );
}
