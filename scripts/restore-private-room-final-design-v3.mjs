import "./restore-private-room-final-design-v2.mjs";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const cssPath = path.join(root, "components", "PrivateRoom", "PrivateRoomDirectGate.css");

if (!fs.existsSync(cssPath)) {
  throw new Error(`Missing file: ${path.relative(root, cssPath)}`);
}

let css = fs.readFileSync(cssPath, "utf8");

const start = "/* ═══════════ ACCESS GRANTED · MOBILE RESPONSIVE ═══════════ */";
const end = "/* ═══════════ END ACCESS GRANTED · MOBILE RESPONSIVE ═══════════ */";

const mobileCss = `${start}
@media (max-width: 600px) {
  .pvr-direct-granted {
    width: min(330px, calc(100vw - 56px)) !important;
    max-width: calc(100vw - 56px) !important;
    min-height: 98px !important;
    margin: 10px auto 0 !important;
    padding: 14px 10px 12px !important;
    gap: 3px !important;
  }

  .pvr-direct-granted.is-code-entry {
    min-height: 136px !important;
  }

  .pvr-direct-granted-check {
    font-size: 38px !important;
  }

  .pvr-direct-granted > strong {
    font-size: 15px !important;
  }

  .pvr-direct-granted > span {
    font-size: 7px !important;
  }

  .pvr-direct-granted-special.buttonupgrade {
    width: 102px !important;
    min-width: 102px !important;
    height: 27px !important;
    min-height: 27px !important;
    margin-top: 7px !important;
  }

  .pvr-direct-granted-code {
    width: 100% !important;
    max-width: 270px !important;
    margin-top: 7px !important;
    gap: 5px !important;
  }

  .pvr-direct-granted-code-row {
    grid-template-columns: 31px 9px minmax(0, 1fr) !important;
    gap: 2px !important;
  }

  .pvr-direct-granted-code-row > b,
  .pvr-direct-granted-code-row > i {
    font-size: 6.5px !important;
  }

  .pvr-direct-granted-code-field input {
    height: 27px !important;
    min-height: 27px !important;
    padding: 0 40px 0 7px !important;
    font-size: 8px !important;
  }

  .pvr-direct-granted-paste {
    right: 3px !important;
    width: 34px !important;
    height: 20px !important;
    min-height: 20px !important;
    font-size: 4.2px !important;
  }

  .pvr-direct-granted-enter {
    width: 108px !important;
    height: 26px !important;
    min-height: 26px !important;
    font-size: 4.8px !important;
  }
}

@media (max-width: 380px) {
  .pvr-direct-granted {
    width: calc(100vw - 42px) !important;
    max-width: calc(100vw - 42px) !important;
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  .pvr-direct-granted.is-code-entry {
    min-height: 132px !important;
  }

  .pvr-direct-granted-check {
    font-size: 35px !important;
  }

  .pvr-direct-granted > strong {
    font-size: 14px !important;
  }

  .pvr-direct-granted-code {
    max-width: 250px !important;
  }

  .pvr-direct-granted-code-row {
    grid-template-columns: 29px 8px minmax(0, 1fr) !important;
  }
}
${end}`;

const oldStart = css.indexOf(start);

if (oldStart >= 0) {
  const oldEnd = css.indexOf(end, oldStart);

  if (oldEnd >= 0) {
    css =
      css.slice(0, oldStart) +
      mobileCss +
      css.slice(oldEnd + end.length);
  }
} else {
  css = `${css.trimEnd()}\n\n${mobileCss}\n`;
}

fs.writeFileSync(cssPath, css, "utf8");
console.log("DONE · Private Room ACCESS GRANTED mobile responsive applied.");
