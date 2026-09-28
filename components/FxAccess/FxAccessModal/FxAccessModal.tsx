import { useEffect, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import PrivateRoomDirectGate from "../../PrivateRoom/PrivateRoomDirectGate";
import "./FxAccessModal.css";

/* ═══════════ USER FX · ACCESS MODAL PORTAL ═══════════ */

type FxAccessModalProps = {
  id?: string;
  open: boolean;
  onClose: () => void;
  accessCode?: string;
  onAccessCodeChange?: (value: string) => void;
  onAccessSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  accessLoading?: boolean;
  accessError?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

const CONFETTI = [
  [6, 8, -18, 14, 0.02, 0],
  [12, 18, 22, 12, 0.09, 1],
  [18, 5, -32, 16, 0.16, 2],
  [24, 21, 35, 13, 0.24, 0],
  [31, 10, -24, 15, 0.31, 1],
  [37, 2, 28, 11, 0.38, 2],
  [44, 17, -36, 14, 0.46, 1],
  [50, 7, 31, 16, 0.53, 0],
  [56, 1, -26, 12, 0.61, 2],
  [62, 15, 38, 14, 0.68, 1],
  [68, 4, -30, 16, 0.76, 0],
  [74, 19, 27, 12, 0.83, 2],
  [81, 6, -34, 15, 0.91, 1],
  [87, 16, 30, 13, 0.98, 0],
  [93, 3, -22, 16, 1.06, 2],
  [9, 31, 32, 12, 1.14, 1],
  [20, 27, -28, 14, 1.21, 0],
  [33, 34, 37, 13, 1.29, 2],
  [47, 29, -31, 15, 1.36, 1],
  [59, 36, 26, 12, 1.43, 0],
  [71, 30, -35, 16, 1.51, 2],
  [84, 35, 29, 13, 1.58, 1],
  [95, 28, -27, 15, 1.66, 0],
] as const;

function getGrantedUsername() {
  try {
    return String(localStorage.getItem("userfx_telegram_username") || "USER18FX")
      .replace(/^@/, "")
      .toUpperCase();
  } catch {
    return "USER18FX";
  }
}

function PrivateRoomAccessGranted({ onClose }: { onClose: () => void }) {
  const username = getGrantedUsername();

  function proceedToPrivateRoom() {
    window.location.hash = "#/private-room";
    onClose();
  }

  return (
    <div className="fx-access-granted" role="dialog" aria-modal="true" aria-labelledby="fx-access-granted-title">
      <div className="fx-access-granted-confetti" aria-hidden="true">
        {CONFETTI.map(([left, top, rotate, size, delay, tone], index) => (
          <i key={`${left}-${top}-${index}`} className={`is-tone-${tone}`} style={{ "--left": `${left}%`, "--top": `${top}%`, "--rotate": `${rotate}deg`, "--size": `${size}px`, "--delay": `${delay}s` } as CSSProperties} />
        ))}
      </div>
      <section className="fx-access-granted-card">
        <header className="fx-access-granted-head">
          <span>
            USER FX · PRIVATE CLUB
          </span>
          <strong>
            PRIVATE ROOM
          </strong>
        </header>
        <div className="fx-access-granted-check" aria-hidden="true">
          ✓
        </div>
        <h2 id="fx-access-granted-title">
          ACCESS GRANTED
        </h2>
        <p>
          WELCOME, {username}
        </p>
        <button type="button" onClick={proceedToPrivateRoom}>
          PROCEED TO PRIVATE ROOM
        </button>
      </section>
    </div>
  );
}

export function FxAccessModal({ open, onClose }: FxAccessModalProps) {
  const previousUrlRef = useRef("");
  const routePreparedRef = useRef(false);

  /* ───── TRUE MODAL MODE · KEEP VAULT HOME MOUNTED ─────
     replaceState does NOT emit hashchange, so App keeps rendering VaultHome.
     PrivateRoomDirectGate sees #/private-room-access on its FIRST render,
     starts with checking=false and shows the card immediately on mobile. */
  if (open && typeof window !== "undefined" && !routePreparedRef.current) {
    previousUrlRef.current = `${window.location.pathname}${window.location.search}${window.location.hash || "#/"}`;

    window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}#/private-room-access`);

    routePreparedRef.current = true;
  }

  useEffect(() => {
    if (!open) {
      routePreparedRef.current = false;
      return;
    }

    const handleHashChange = () => {
      if (window.location.hash === "#/" || window.location.hash === "") {
        onClose();
      }
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);

      if (window.location.hash === "#/private-room-access") {
        window.history.replaceState({}, "", previousUrlRef.current || `${window.location.pathname}${window.location.search}#/`);
      }

      routePreparedRef.current = false;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <PrivateRoomDirectGate>
      <PrivateRoomAccessGranted onClose={onClose} />
    </PrivateRoomDirectGate>,
    document.body,
  );
}

export default FxAccessModal;
