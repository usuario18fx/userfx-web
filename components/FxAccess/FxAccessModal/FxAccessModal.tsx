import { useEffect } from "react";
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
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <PrivateRoomDirectGate forceOpen onRequestClose={onClose}>
      <PrivateRoomRedirect onClose={onClose} />
    </PrivateRoomDirectGate>,
    document.body,
  );
}

export default FxAccessModal;
