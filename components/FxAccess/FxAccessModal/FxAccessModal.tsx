import { useEffect } from "react";

/* ═══════════ USER FX · LEGACY ACCESS BRIDGE ═══════════ */

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

export function FxAccessModal({ open, onClose }: FxAccessModalProps) {
  useEffect(() => {
    if (!open) return;

    onClose();
    window.location.hash = "#/private-room-access";
  }, [open, onClose]);

  return null;
}

export default FxAccessModal;
