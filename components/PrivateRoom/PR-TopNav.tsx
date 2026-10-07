          import { useEffect, useState } from "react";
import "./PR-TopNav.css";
import { Icon } from "./RoomFX/shared";
import { AdminModeSwitch, useAdminMode } from "./PR-AdminMode";

          const NAV_ITEMS = [
            { label: "INICIO", route: "#/", scope: "membership" },
            { label: "MYROOM", route: "#/private-room", scope: "myroom" },
            { label: "STAGE", route: "#/private-room/stage", scope: "stage" },
            { label: "GALLERY", route: "#/private-room/gallery", scope: "gallery" },
            { label: "BUZON", route: "#/private-room/buzon", scope: "buzon" },
            { label: "PROFILES", route: "#/private-room/profiles", scope: "profiles" },
          ] as const;

          type TopNavProps = {
            cameraLive: boolean;
            accessLabel: string;
            onCamera: () => void;
            onProfile: () => void;
            onMembership: () => void;
            onRewards: () => void;
            onLogout: () => void;
          };

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

          export default function PrivateRoomTopNav({ cameraLive, accessLabel, onCamera, onProfile, onMembership, onRewards, onLogout }: TopNavProps) {
            const admin = useAdminMode();
            const [route, setRoute] = useState(() => window.location.hash || "#/private-room");
            const [insideTelegram, setInsideTelegram] = useState(false);
            const [browserNoticeOpen, setBrowserNoticeOpen] = useState(false);

            useEffect(() => {
              const handleHashChange = () => setRoute(window.location.hash || "#/private-room");
              window.addEventListener("hashchange", handleHashChange);
              return () => window.removeEventListener("hashchange", handleHashChange);
            }, []);

            useEffect(() => {
              setInsideTelegram(Boolean(window.Telegram?.WebApp?.initData));
            }, []);

            function requestCamera() {
              if (admin.requestFeature("camera")) return;
              if (insideTelegram) {
                setBrowserNoticeOpen(true);
                return;
              }
              onCamera();
            }

            function continueCameraInTelegram() {
              setBrowserNoticeOpen(false);
              onCamera();
            }

            async function continueCameraInBrowser() {
              setBrowserNoticeOpen(false);
              await openInBrowser();
            }

            function navigate(item: (typeof NAV_ITEMS)[number]) {
              if (admin.requestFeature(item.scope)) return;
              window.location.hash = item.route;
            }

            return (
              <header className="pvr-club-nav pvr-club-nav--unified">
                <div className="pvr-club-nav-inner">
                  <div className="pvr-admin-brand-controls">
                  <button
                    type="button"
                    className="pvr-club-brand"
                    aria-label="UserFX · MyRoom"
                    onClick={() => {
                      if (admin.revealSwitch()) return;
                      window.location.hash = "#/private-room";
                    }}>
                    <span className="pvr-club-brand-mark">
                      <img src="/assets/userfx-logo-sin.png" alt="USER FX" />
                    </span>
                    <span className="pvr-club-brand-live" aria-hidden="true" />
                    <span className="pvr-club-brand-copy">| PRIV⭑VAULT |</span>
                  </button>
                  <AdminModeSwitch />
                  </div>
                  <nav className="pvr-club-tabs" aria-label="Private Room navigation">
                    {NAV_ITEMS.map((item) => {

                      return (
                        <button key={item.label} type="button" className={route.split("?")[0] === item.route ? "is-active" : ""} aria-current={route.split("?")[0] === item.route ? "page" : undefined} onClick={() => navigate(item)}>
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="pvr-club-actions">
          <button type="button" className="pvr-club-code" onClick={() => { if (!admin.requestFeature("membership")) onProfile(); }}>
            <span>
            MEMBER ACCESS
            </span>
            <strong>{accessLabel}</strong>
          </button>
          <button type="button" className={`pvr-club-cam ${cameraLive ? "is-live" : ""}`} onClick={requestCamera}>
            <span className="pvr-cam-icon" aria-hidden="true"><Icon name="camera" size={16} /></span>
            <span className="pvr-cam-label">{cameraLive ? "ONCAM" : "OFFCAM"}</span>
            <span className="pvr-cam-dot" aria-hidden="true" />
          </button>
          <button type="button" className="pvr-club-reward" aria-label="Rewards" onClick={onRewards}>
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
            <span className="pvr-reward-star" aria-hidden="true">✦</span>
          </button>
          <button type="button" className="pvr-club-profile" aria-label="Edit your profile" onClick={() => { if (!admin.requestFeature("profiles")) onProfile(); }}>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4.5 20c.7-4 3.2-6 7.5-6s6.8 2 7.5 6H4.5z" />
            </svg>
          </button>
          <button type="button" className="pvr-club-membership" aria-label="Your membership" onClick={() => { if (!admin.requestFeature("membership")) onMembership(); }}>
            <svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="m18 0 8 12 10-8-4 20H4L0 4l10 8 8-12z" />
            </svg>
          </button>
          {insideTelegram && (
            <button type="button" className="pvr-open-browser" onClick={openInBrowser}>
              OPEN IN BROWSER
            </button>
          )}
          <button type="button" className="pvr-club-logout" onClick={() => { if (admin.mode === "admin") void admin.userMode(); onLogout(); }}>
            <span className="pvr-logout-dot" aria-hidden="true" />
            <span>LOG OUT</span>
            <span className="pvr-logout-icon" aria-hidden="true"><Icon name="leave" size={15} /></span>
          </button>
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

          return (
            <button key={item.label} type="button" className={route.split("?")[0] === item.route ? "is-active" : ""} aria-current={route.split("?")[0] === item.route ? "page" : undefined} onClick={() => navigate(item)}>
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
