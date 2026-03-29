import React, { useMemo, useRef, useState } from "react";

export default function AlbumLockPanel() {
  const bookRef = useRef(null);
  const [suffix, setSuffix] = useState("");
  const [message, setMessage] = useState("");

  const accessPrefix = "FX-USER01-";
  const validCode = "AX01";

  const fullCode = useMemo(() => {
    return `${accessPrefix}${suffix.toUpperCase()}`;
  }, [suffix]);

  const handleMove = (e) => {
    const card = bookRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const dx = x - xc;
    const dy = y - yc;

    card.style.transform = `perspective(1000px) rotateY(${dx / 18}deg) rotateX(${-dy / 18}deg)`;
  };

  const handleLeave = () => {
    const card = bookRef.current;
    if (!card) return;
    card.style.transform = "perspective(1000px) rotateY(0deg) rotateX(0deg)";
  };

  const handleChange = (e) => {
    const clean = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4);
    setSuffix(clean);
    if (message) setMessage("");
  };

  const handleUnlock = () => {
    if (suffix.length < 4) {
      setMessage("Enter the 4-character access key.");
      return;
    }

    if (suffix === validCode) {
      setMessage(`Access granted: ${fullCode}`);
    } else {
      setMessage("Invalid code. Try again.");
    }
  };

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div className="brand-text">
            <div className="name">Fx 🜲</div>
            <div className="tag">Exclusive Space</div>
          </div>
        </div>

        <nav className="actions">
          <a
            href="https://t.me/User18fx"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact Me ⌯⌲
          </a>
        </nav>
      </header>

      <main className="scene" id="galeria">
        <section className="content">
          <div className="left premium-panel">
            <span className="eyebrow">Exclusive gallery</span>

            <h1 className="sigil" aria-label="FX">
              Ŧҳ
            </h1>

            <p className="hint">PREMIUM CONTENT ACCESS</p>

            <p className="copy">
              Keep it lit, keep it real. Unlock a curated visual experience made
              for members only.
            </p>

            <div className="hero-actions">
              <a href="#unlockBox" className="btn btn-primary">
                Unlock access
              </a>
              <a href="#preview" className="btn btn-ghost">
                Preview vibe
              </a>
            </div>

            <ul className="meta" role="list">
              <li>Private visuals</li>
              <li>Members-only drops</li>
              <li>High-res access</li>
            </ul>
          </div>

          <div className="right">
            <div
              className="galeria-book-3d"
              id="book"
              ref={bookRef}
              onMouseMove={handleMove}
              onMouseLeave={handleLeave}
            >
              <div className="lock-overlay" id="lockOverlay">
                <div className="lock" />
                <p className="lock-title">LOCKED</p>

                <div id="unlockBox" className="unlock-box">
                  <label className="sr-only" htmlFor="accessCodeSuffix">
                    Access code suffix
                  </label>

                  <div className="unlock-codeRow">
                    <input
                      id="accessCodePrefix"
                      className="unlock-input unlock-input--prefix"
                      type="text"
                      value={accessPrefix}
                      readOnly
                      aria-label="Access code prefix"
                    />

                    <input
                      id="accessCodeSuffix"
                      className="unlock-input unlock-input--suffix"
                      type="text"
                      maxLength={4}
                      placeholder="AX01"
                      autoComplete="off"
                      value={suffix}
                      onChange={handleChange}
                      aria-describedby="unlockMsg"
                    />
                  </div>

                  <div className="unlock-hintRow" aria-hidden="true">
                    <span className="unlock-arrow">↳</span>
                  </div>

                  <button
                    id="unlockBtn"
                    className="unlock-btn"
                    type="button"
                    onClick={handleUnlock}
                  >
                    Unlock
                  </button>

                  <p
                    id="unlockMsg"
                    className={`unlock-msg ${
                      message.startsWith("Access granted") ? "is-success" : "is-error"
                    }`}
                  >
                    {message}
                  </p>
                </div>
              </div>

              <div className="hand-hint" aria-hidden="true">
                👆
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        USER | <span className="footer-mark">𝐅ㄨ🜲</span> | {new Date().getFullYear()} ©
        ALL RIGHTS RESERVED
      </footer>
    </>
  );
}
