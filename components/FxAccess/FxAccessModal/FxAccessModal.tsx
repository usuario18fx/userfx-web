import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PrivateRoomDirectGate from "../../PrivateRoom/PrivateRoomDirectGate";

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

function PrivateRoomRedirect({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    window.location.hash = "#/private-room";
    onClose();
  }, [onClose]);

  return null;
}

export function FxAccessModal({ open, onClose }: FxAccessModalProps) {
  const previousUrlRef = useRef("");
  const routePreparedRef = useRef(false);

  /* ───── TRUE MODAL MODE · KEEP VAULT HOME MOUNTED ─────
     replaceState does NOT emit hashchange, so App keeps rendering VaultHome.
     PrivateRoomDirectGate sees #/private-room-access on its FIRST render,
     starts with checking=false and shows the card immediately on mobile. */
  if (open && typeof window !== "undefined" && !routePreparedRef.current) {
    previousUrlRef.current =
      `${window.location.pathname}${window.location.search}${window.location.hash || "#/"}`;

    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${window.location.search}#/private-room-access`,
    );

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
        window.history.replaceState(
          {},
          "",
          previousUrlRef.current || `${window.location.pathname}${window.location.search}#/`,
        );
      }

      routePreparedRef.current = false;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <PrivateRoomDirectGate>
      <PrivateRoomRedirect onClose={onClose} />
    </PrivateRoomDirectGate>,
    document.body,
  );
}

export default FxAccessModal;
