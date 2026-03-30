import React, { useState } from "react";
import "./AlbumLockPanel.css";

export default function AlbumLockPanel() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  const fixedPrefix = "FX/USER01/";

  const handleUnlock = async () => {
    const suffix = value.trim().toUpperCase();

    if (suffix.length !== 4) {
      setUnlocked(false);
      setStatus("Enter 4 characters.");
      return;
    }

    try {
      setLoading(true);
      setStatus("");

      const res = await fetch("/api/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prefix: fixedPrefix,
          suffix,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setUnlocked(false);
        setStatus(data.error || "Invalid code.");
        return;
      }

      setUnlocked(true);
      setStatus("Access granted.");
    } catch {
      setUnlocked(false);
      setStatus("Server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="fx-premiumSection">
      <header className="fx-topbar">
        <div className="fx-brand">
          <div className="fx-brandTitle">Fx♕</div>
          <div className="fx-brandSub">EXCLUSIVE SPACE</div>
        </div>

        <a
          className="fx-contactBtn"
          href="https://t.me/User18fx"
          target="_blank"
          rel="noreferrer"
        >
          Contact Me ≡▹
        </a>
      </header>

      <div className="fx-premiumGrid">
        <div className="fx-copySide">
          <h2 className="fx-copyTitle">
            {unlocked ? "ACCESS GRANTED" : "PREMIUM CONTENT ACCESS"}
          </h2>

          <p className="fx-copyText">
            {unlocked
              ? "The album is now unlocked."
              : "Keep it lit, keep it real. Explore the visual experience."}
          </p>
        </div>

        <div className="fx-cardSide">
          <div
            className={`fx-lockCardShell ${unlocked ? "fx-shellUnlocked" : ""}`}
          >
            <article
              className={`fx-lockCard ${unlocked ? "fx-cardUnlocked" : ""}`}
            >
              <div className="fx-crown">♕</div>

              <div className="fx-lockHead">
                {unlocked ? "UNLOCKED" : "LOCKED"}
              </div>

              <div className="fx-lockUser">
                {fixedPrefix}
                <strong>{value || "AX01"}</strong>
              </div>

              <div className="fx-lockArrow">↙</div>

              <input
                className="fx-lockInput"
                type="text"
                value={value}
                maxLength={4}
                inputMode="text"
                autoComplete="off"
                placeholder="____"
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

              <div className="fx-unlockTitle">
                {loading ? "CHECKING..." : "UNLOCK ALBUM"}
              </div>

              <button
                type="button"
                className={`fx-lockOnlyBtn ${
                  unlocked ? "fx-lockOnlyBtnUnlocked" : ""
                }`}
                aria-label="Unlock album"
                onClick={handleUnlock}
                disabled={loading}
              >
                <span className="fx-lockEmoji">{unlocked ? "🔓" : "🔒"}</span>
              </button>

              {status ? <div className="fx-statusText">{status}</div> : null}
            </article>
          </div>
        </div>
      </div>

      <footer className="fx-footer">
        | USER | 𝐅ㄨ🜲 2026 | © ALL RIGHTS RESERVED |
      </footer>
    </section>
  );
}
