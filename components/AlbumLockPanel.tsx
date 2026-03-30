import React, { useMemo, useRef, useState } from "react";
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
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [message, setMessage] = useState("");
  const bookRef = useRef<HTMLDivElement | null>(null);

  const expectedCode = useMemo(
    () => code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4),
    [code]
  );

  const normalized = useMemo(
    () => value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4),
    [value]
  );

  const slots = Array.from({ length: 4 }, (_, i) => normalized[i] || "_");

  const applyUnlockState = (candidate: string) => {
    if (candidate.length !== 4) {
      setIsUnlocked(false);
      setMessage("");
      return;
    }

    if (candidate === expectedCode) {
      setIsUnlocked(true);
      setMessage("Unlocked");
      onUnlock?.(candidate);
      return;
    }

    setIsUnlocked(false);
    setMessage("Incorrect code");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    setValue(next);

    if (next.length < 4) {
      setIsUnlocked(false);
      setMessage("");
      return;
    }

    applyUnlockState(next);
  };

  const handleUnlockClick = () => {
    applyUnlockState(normalized);
  };

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = bookRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    const rotateY = (px - 0.5) * 18;
    const rotateX = (0.5 - py) * 14;

    el.style.setProperty("--rx", `${rotateX.toFixed(2)}deg`);
    el.style.setProperty("--ry", `${rotateY.toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(px * 100).toFixed(2)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(2)}%`);
  };

  const handleLeave = () => {
    const el = bookRef.current;
    if (!el) return;

    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
  };

  return (
    <section className={`fx-premiumSection ${isUnlocked ? "fx-sectionUnlocked" : ""}`}>
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

        <div className="right">
          <div
            className={`galeria-book-3d liquid-device ${isUnlocked ? "is-unlocked" : ""}`}
            id="book"
            ref={bookRef}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            tabIndex={0}
            role="img"
            aria-label="Premium content device preview"
          >
            <div className="device-bezel" />

            <div className="device-screen">
              <div className="screen-gradient" />

              <div className={`lock-overlay ${isUnlocked ? "lock-overlay-unlocked" : ""}`} id="lockOverlay">
                <div className={`fx-lockCardShell ${isUnlocked ? "fx-shellUnlocked" : ""}`}>
                  <article className="fx-lockCard">
                    <div className="fx-lockHead">{isUnlocked ? "UNLOCKED" : accessLabel}</div>

                    <div className="fx-lockUser">
                      {userLabel} <strong>{expectedCode}</strong>
                    </div>

                    <div className="fx-lockArrow">↙</div>

                    <div className="fx-codeDisplay" aria-label="Access code input">
                      {slots.map((char, i) => (
                        <span
                          key={i}
                          className={`fx-codeChar ${char !== "_" ? "fx-codeCharFilled" : ""}`}
                        >
                          {char}
                        </span>
                      ))}
                    </div>

                    <form
                      className="fx-codeForm"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleUnlockClick();
                      }}
                    >
                      <input
                        className="fx-codeInput"
                        type="text"
                        value={value}
                        maxLength={4}
                        inputMode="text"
                        autoComplete="off"
                        onChange={handleChange}
                        aria-label="Access code"
                      />

                      <div className="fx-lockHint">ENTER THE LAST 4 CHARACTERS</div>

                      <div className="fx-unlockTitle">UNLOCK ALBUM</div>

                      <button
                        type="submit"
                        className={`fx-lockOnlyBtn ${isUnlocked ? "fx-lockOnlyBtnUnlocked" : ""}`}
                        aria-label="Unlock album"
                      >
                        <span className="fx-lockEmoji" aria-hidden="true">
                          🔒
                        </span>
                      </button>
                    </form>

                    <p className={`fx-status ${message ? (isUnlocked ? "is-success" : "is-error") : ""}`}>
                      {message}
                    </p>
                  </article>
                </div>
              </div>

              <div className="hand-hint" aria-hidden="true">
                👆
              </div>
            </div>

            <div className="device-bottom-bar" />
            <div className="device-shadow" />
          </div>
        </div>
      </div>

      <footer className="fx-footer">
        | USER | 𝐅ㄨ🜲 2026 | © ALL RIGHTS RESERVED |
      </footer>
    </section>
  );
}
