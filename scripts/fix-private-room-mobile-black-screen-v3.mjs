import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const gatePath = path.join(root,"components","PrivateRoom","PrivateRoomDirectGate.tsx");
const modalPath = path.join(root,"components","FxAccess","FxAccessModal","FxAccessModal.tsx");

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing file: ${path.relative(root,file)}`);
  return fs.readFileSync(file,"utf8");
}

function write(file,content) {
  fs.writeFileSync(file,content,"utf8");
  console.log(`UPDATED    ${path.relative(root,file)}`);
}

/* ═══════════ DIRECT GATE · TRUE MODAL MODE ═══════════ */
let gate = read(gatePath);

if (!gate.includes("forceOpen?: boolean;")) {
  const next = gate.replace(
    /type DirectGateProps = \{\s*children:\s*ReactNode;\s*\};/,
    `type DirectGateProps = {\n  children: ReactNode;\n  forceOpen?: boolean;\n  onRequestClose?: () => void;\n};`,
  );

  if (next === gate) {
    throw new Error("Could not patch DirectGateProps. Stop: file shape changed.");
  }

  gate = next;
}

if (!gate.includes("forceOpen = false")) {
  const next = gate.replace(
    /export default function PrivateRoomDirectGate\(\{\s*children\s*\}: DirectGateProps\) \{\s*const forceGate = typeof window !== "undefined" && window\.location\.hash === "#\/private-room-access";/,
    `export default function PrivateRoomDirectGate({\n  children,\n  forceOpen = false,\n  onRequestClose,\n}: DirectGateProps) {\n  const routeForceGate =\n    typeof window !== "undefined" && window.location.hash === "#/private-room-access";\n  const forceGate = forceOpen || routeForceGate;`,
  );

  if (next === gate) {
    throw new Error("Could not patch PrivateRoomDirectGate signature. Stop: file shape changed.");
  }

  gate = next;
}

if (!gate.includes("} else if (onRequestClose) {")) {
  const next = gate.replace(
    `        } else {\n        window.location.hash = "#/";\n        }\n        }}>\n        ← BACK`,
    `        } else if (onRequestClose) {\n        onRequestClose();\n        } else {\n        window.location.hash = "#/";\n        }\n        }}>\n        ← BACK`,
  );

  if (next === gate) {
    throw new Error("Could not patch BACK handler. Stop: file shape changed.");
  }

  gate = next;
}

write(gatePath,gate);

/* ═══════════ MODAL · PORTAL OVER VAULT, NO HASH ON OPEN ═══════════ */
const modal = `import { useEffect } from "react";\nimport { createPortal } from "react-dom";\nimport PrivateRoomDirectGate from "../../PrivateRoom/PrivateRoomDirectGate";\n\n/* ═══════════ USER FX · ACCESS MODAL PORTAL ═══════════ */\n\ntype FxAccessModalProps = {\n  id?: string;\n  open: boolean;\n  onClose: () => void;\n  accessCode?: string;\n  onAccessCodeChange?: (value: string) => void;\n  onAccessSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;\n  accessLoading?: boolean;\n  accessError?: string;\n  inputRef?: React.RefObject<HTMLInputElement | null>;\n};\n\nfunction PrivateRoomRedirect({ onClose }: { onClose: () => void }) {\n  useEffect(() => {\n    onClose();\n    window.location.hash = "#/private-room";\n  }, [onClose]);\n\n  return null;\n}\n\nexport function FxAccessModal({ open, onClose }: FxAccessModalProps) {\n  if (!open || typeof document === "undefined") return null;\n\n  return createPortal(\n    <PrivateRoomDirectGate forceOpen onRequestClose={onClose}>\n      <PrivateRoomRedirect onClose={onClose} />\n    </PrivateRoomDirectGate>,\n    document.body,\n  );\n}\n\nexport default FxAccessModal;\n`;

write(modalPath,modal);

console.log("DONE · forceOpen is now implemented by PrivateRoomDirectGate, so mobile opening cannot fall through to the dev/session redirect before the access modal is shown.");
