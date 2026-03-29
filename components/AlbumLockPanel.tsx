import React, { useState } from "react";
import "./AlbumLockPanel.css";

type AlbumLockPanelProps = {
  code?: string;
  userLabel?: string;
  accessLabel?: string;
  onUnlock?: (value: string) => void;
};

export default function AlbumLockPanel({
  code = "AX01",
  userLabel = "FX/USER01/",
  accessLabel = "LOCKED",
  onUnlock,
}: AlbumLockPanelProps) {
  const [value, setValue] = useState("");

  const handleUnlock = () => {
    if (onUnlock) onUnlock(value);
  };

  return (
    <section className="fx-premiumSection">
      <header className="fx-topbar">
        <div className="fx-brand">
          <div className="fx-brandTitle">Fx♕</div>
          <div className="fx-brandSub">EXCLUSIVE SPACE</div>
        </div>

        <button type="button" className="fx-contactBtn">
          Contact Me ≡▹
        </button>
      </header>

      <div className="fx-premiumGrid">
        <div className="fx-copySide">
          <h2 className="fx-copyTitle">PREMIUM CONTENT ACCESS</h2>
          <p className="fx-copyText">
            Keep it lit, keep it real. Explore the visual experience.
          </p>
        </div>

        <div className="fx-cardSide">
          <div className="fx-lockCardShell">
            <article className="fx-lockCard">
              <div className="fx-crown">♕</div>

              <div className="fx-lockHead">{accessLabel}</div>

              <div className="fx-lockUser">
                {userLabel} <strong>{code}</strong>
              </div>

              <div className="fx-lockArrow">↙</div>

              <input
                className="fx-lockInput"
                type="text"
                value={value}
                maxLength={4}
                inputMode="text"
                autoComplete="off"
                onChange={(e) =>
                  setValue(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 4)
                  )
                }
              />

              <div className="fx-lockHint">ENTER THE LAST 4 CHARACTERS</div>

              <div className="fx-unlockTitle">UNLOCK ALBUM</div>

              <button
                type="button"
                className="fx-lockOnlyBtn"
                aria-label="Unlock album"
                onClick={handleUnlock}
              >
                <span className="fx-lockEmoji">🔒</span>
              </button>
            </article>
          </div>
        </div>
      </div>

      <footer className="fx-footer">| USER | 𝐅ㄨ🜲 2026 | © ALL RIGHTS RESERVED |</footer>
    </section>
  );
}
