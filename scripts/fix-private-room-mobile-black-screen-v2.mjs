import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const gatePath = path.join(root,"components","PrivateRoom","PrivateRoomDirectGate.tsx");
const modalPath = path.join(root,"components","FxAccess","FxAccessModal","FxAccessModal.tsx");

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing file: ${path.relative(root,file)}`);
  return fs.readFileSync(file,"utf8");
}

function save(file,before,after) {
  if (before === after) {
    console.log(`UNCHANGED  ${path.relative(root,file)}`);
    return;
  }
  fs.writeFileSync(file,after,"utf8");
  console.log(`UPDATED    ${path.relative(root,file)}`);
}

/* ═══════════ DIRECT GATE · SUPPORT TRUE MODAL MODE ═══════════ */
let gate = read(gatePath);
const gateBefore = gate;

gate = gate.replace(
`type DirectGateProps = {
  children: ReactNode;
};`,
`type DirectGateProps = {
  children: ReactNode;
  forceOpen?: boolean;
  onRequestClose?: () => void;
};`,
);

gate = gate.replace(
`export default function PrivateRoomDirectGate({ children }: DirectGateProps) {
  const forceGate = typeof window !== "undefined" && window.location.hash === "#/private-room-access";`,
`export default function PrivateRoomDirectGate({
  children,
  forceOpen = false,
  onRequestClose,
}: DirectGateProps) {
  const routeForceGate =
    typeof window !== "undefined" && window.location.hash === "#/private-room-access";
  const forceGate = forceOpen || routeForceGate;`,
);

gate = gate.replace(
`        } else {
        window.location.hash = "#/";
        }
        }}>
        ← BACK`,
`        } else if (onRequestClose) {
        onRequestClose();
        } else {
        window.location.hash = "#/";
        }
        }}>
        ← BACK`,
);

save(gatePath,gateBefore,gate);

/* ═══════════ FX ACCESS MODAL · BODY PORTAL, NO HASH HACK ═══════════ */
const modalBefore = read(modalPath);
const modal = `import { useEffect } from "react";
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
`;

save(modalPath,modalBefore,modal);

console.log("DONE · Access modal now renders directly in document.body and no longer depends on the mobile hash-route stacking context.");
