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
  const cardRef = useRef<HTMLDivElement | null>(null);

  const normalized = useMemo(() => value.toUpperCase().slice(0, 4), [value]);
  const slots = Array.from({ length: 4 }, (_, i) => normalized[i] || "_");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    setValue(next);
    setMessage("");

    if (next.length === 4) {
      if (next === code) {
        setIsUnlocked(true);
        setMessage("Unlocked");
        onUnlock?.(next);
        cardRef.current?.classList.add("fx-cardUnlocked");
      } else {
        setIsUnlocked(false);
        setMessage("Incorrect code");
        cardRef.current?.classList.remove("fx-cardUnlocked");
      }
    } else {
      setIsUnlocked(false);
      cardRef.current?.classList.remove("fx-cardUnlocked");
    }
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

        <div className="fx-cardSide">
          <div
            ref={cardRef}
            className={`fx-lockCardShell ${isUnlocked ? "fx-shellUnlocked" : ""}`}
          >
            <article className="fx-lockCard">
              <div className="fx-lockHead">{isUnlocked ? "UNLOCKED" : accessLabel}</div>

              <div className="fx-lockUser">
                {userLabel} <strong>{code}</strong>
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
                type="button"
                className={`fx-lockOnlyBtn ${isUnlocked ? "fx-lockOnlyBtnUnlocked" : ""}`}
                aria-label="Unlock album"
                onClick={() => {
                  if (normalized === code) {
                    setIsUnlocked(true);
                    setMessage("Unlocked");
                    onUnlock?.(normalized);
                    cardRef.current?.classList.add("fx-cardUnlocked");
                  } else {
                    setMessage("Incorrect code");
                    setIsUnlocked(false);
                    cardRef.current?.classList.remove("fx-cardUnlocked");
                  }
                }}
              >
                <span className="fx-lockEmoji" aria-hidden="true">
                  🔒
                </span>
              </button>

              <p className={`fx-status ${isUnlocked ? "is-success" : "is-error"}`}>
                {message}
              </p>
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
