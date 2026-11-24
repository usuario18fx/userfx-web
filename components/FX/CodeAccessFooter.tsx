"use client";

import "./CodeAccessFooter.css";

type CodeAccessFooterProps = {
  onEnterCode: () => void;
  onGetCode: () => void;
};

/** Landing-only access choices. This does not authenticate the user. */
export default function CodeAccessFooter({ onEnterCode, onGetCode }: CodeAccessFooterProps) {
  return (
    <section className="fx-code-access-section" aria-labelledby="fx-code-access-title">
      <div className="fx-code-access-panel">
        <p className="fx-code-access-eyebrow">USER FX / PRIVATE ACCESS</p>
        <h2 id="fx-code-access-title">YOUR PRIVATE CODE.</h2>
        <p className="fx-code-access-description">
          Get your access code or enter the code you already have.
        </p>
        <div className="fx-code-access-actions">
          <button
            type="button"
            className="fx-code-access-option fx-code-access-option--get"
            onClick={onGetCode}
            aria-label="Choose BASIC, PRO, or VIP access plan"
          >
            <span className="fx-code-access-number" aria-hidden="true">01</span>
            <strong>GET CODE</strong>
            <small>CHOOSE ACCESS PLAN</small>
            <span className="fx-code-access-arrow" aria-hidden="true">↗</span>
          </button>
          <button
            className="fx-code-access-option fx-code-access-option--got"
            type="button"
            onClick={onEnterCode}
            aria-label="Enter your existing private access code"
          >
            <span className="fx-code-access-number" aria-hidden="true">02</span>
            <strong>GOT CODE</strong>
            <small>ENTER PRIVATE CODE</small>
            <span className="fx-code-access-arrow" aria-hidden="true">→</span>
          </button>
        </div>
        <p className="fx-code-access-note">A valid code is required to unlock your private room.</p>
      </div>
    </section>
  );
}
