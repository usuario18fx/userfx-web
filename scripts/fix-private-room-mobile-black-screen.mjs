import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const gatePath = path.join(root, "components", "PrivateRoom", "PrivateRoomDirectGate.tsx");
const cssPath = path.join(root, "components", "PrivateRoom", "PrivateRoomDirectGate.css");

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing file: ${path.relative(root, file)}`);
  return fs.readFileSync(file, "utf8");
}

function save(file, before, after) {
  if (before === after) {
    console.log(`UNCHANGED  ${path.relative(root, file)}`);
    return;
  }

  fs.writeFileSync(file, after, "utf8");
  console.log(`UPDATED    ${path.relative(root, file)}`);
}

/* ═══════════ REMOVE BLACK CHECKING FRAME ON DIRECT GATE ═══════════ */
let gate = read(gatePath);
const gateBefore = gate;

gate = gate.replace(
  "const [checking, setChecking] = useState(true);",
  "const [checking, setChecking] = useState(!forceGate);",
);

save(gatePath, gateBefore, gate);

/* ═══════════ MOBILE · FORCE ACCESS CARD VISIBLE ═══════════ */
let css = read(cssPath);
const cssBefore = css;

const start = "/* ═══════════ MOBILE GATE · BLACK SCREEN FIX ═══════════ */";
const end = "/* ═══════════ END MOBILE GATE · BLACK SCREEN FIX ═══════════ */";

const block = `${start}
@media (max-width: 650px) {
  .pvr-direct-gate {
    --pvr-direct-scale: 1 !important;

    position: fixed !important;
    inset: 0 !important;
    z-index: 12000 !important;

    width: 100vw !important;
    height: 100dvh !important;
    min-height: 100svh !important;

    display: grid !important;
    place-items: center !important;

    padding:
      max(8px, env(safe-area-inset-top))
      8px
      max(8px, env(safe-area-inset-bottom)) !important;

    overflow-x: hidden !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch !important;

    background:
      radial-gradient(ellipse at 18% 0%, #c4a57414, transparent 40%),
      radial-gradient(ellipse at 82% 12%, #7a2e3a14, transparent 34%),
      linear-gradient(180deg, #0c0b0a, #080706) !important;
  }

  .pvr-direct-card {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    z-index: 2 !important;

    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;

    width: min(430px, calc(100vw - 16px)) !important;
    max-width: calc(100vw - 16px) !important;
    height: 420px !important;
    min-height: 420px !important;

    margin: auto !important;
    transform: none !important;
    transform-origin: center !important;
  }
}

@media (max-width: 430px) {
  .pvr-direct-card {
    width: calc(100vw - 12px) !important;
    max-width: calc(100vw - 12px) !important;
  }
}

@media (max-height: 520px) and (max-width: 650px) {
  .pvr-direct-gate {
    place-items: start center !important;
  }

  .pvr-direct-card {
    margin: 8px auto !important;
  }
}
${end}`;

const startIndex = css.indexOf(start);

if (startIndex >= 0) {
  const endIndex = css.indexOf(end, startIndex);

  if (endIndex >= 0) {
    css =
      css.slice(0, startIndex) +
      block +
      css.slice(endIndex + end.length);
  }
} else {
  css = `${css.trimEnd()}\n\n${block}\n`;
}

save(cssPath, cssBefore, css);

console.log("DONE · Mobile Private Room gate no longer renders the black checking frame and the access card is forced visible inside the viewport.");
