"use client";

import "./FooterBar.css";

export default function FooterBar() {
  function backToBeginning() {
    const beginning = document.getElementById("home");
    if (beginning) {
      beginning.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="fx-footer-bar" aria-label="USER FX footer">
      <div className="fx-footer-bar-inner">
        <a className="fx-footer-bar-brand" href="#home" aria-label="USER FX, back to beginning">
          <svg className="fx-footer-bar-crown" viewBox="0 0 46 44" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 33 2 15l12 9L23 6l9 18 12-9-3 18H5Z" />
            <path d="M7 38h32M6 42h34" />
            <path d="M23 2v1M2 12v1M44 12v1" />
          </svg>
          <span className="fx-footer-bar-name">
            <strong>
              USER FX
            </strong>
            <span>
              PRIVATE VAULT
            </span>
          </span>
        </a>
        <p className="fx-footer-bar-motto">
          A private world. Entirely yours.
        </p>
        <button type="button" className="fx-footer-bar-return" onClick={backToBeginning}>
          <span>
            Back to the beginning
          </span>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20V4M6.5 9.5 12 4l5.5 5.5" />
          </svg>
        </button>
      </div>
    </footer>
  );
}
