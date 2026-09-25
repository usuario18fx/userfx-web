import { useEffect, useLayoutEffect, useRef, useState } from "react";
import PrivateRoomDirectGate from "../../PrivateRoom/PrivateRoomDirectGate";

/* ═══════════ USER FX · ACCESS MODAL BRIDGE ═══════════ */

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
    onClose();
    window.location.hash = "#/private-room";
  }, [onClose]);

  return null;
}

export function FxAccessModal({ open, onClose }: FxAccessModalProps) {
  const [ready, setReady] = useState(false);
  const previousUrlRef = useRef("");

  /* ───── KEEP VAULT HOME MOUNTED WHILE ACCESS MODAL IS OPEN ───── */
  useLayoutEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }

    previousUrlRef.current =
      `${window.location.pathname}${window.location.search}${window.location.hash || "#/"}`;

    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${window.location.search}#/private-room-access`,
    );

    setReady(true);

    return () => {
      if (window.location.hash === "#/private-room-access") {
        window.history.replaceState(
          {},
          "",
          previousUrlRef.current || `${window.location.pathname}${window.location.search}#/`,
        );
      }
    };
  }, [open]);

  /* ───── DIRECT GATE BACK BUTTON CLOSES THIS MODAL ───── */
  useEffect(() => {
    if (!open) return;

    const handleHashChange = () => {
      if (window.location.hash === "#/" || window.location.hash === "") {
        onClose();
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [open, onClose]);

  if (!open || !ready) return null;

  return (
    <PrivateRoomDirectGate>
      <PrivateRoomRedirect onClose={onClose} />
    </PrivateRoomDirectGate>
  );
}

export default FxAccessModal;
