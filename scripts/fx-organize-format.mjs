import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();

const files = {
  app: path.join(ROOT, "app.jsx"),
  main: path.join(ROOT, "main.jsx"),
  vaultCss: path.join(ROOT, "components", "VaultHome", "VaultHome.css"),
  vaultMobile: path.join(ROOT, "components", "VaultHome", "mobile-polish.css"),
  deviceTsx: path.join(ROOT, "components", "VaultDevice", "VaultDevice.tsx"),
  deviceCss: path.join(ROOT, "components", "VaultDevice", "VaultDevice.css"),
  deviceMobile: path.join(ROOT, "components", "VaultDevice", "VaultDevice.mobile.css"),
  privateRoomLiveShell: path.join(ROOT, "components", "PrivateRoom", "PrivateRoomLiveShell.tsx"),
  privateRoomLuxury: path.join(ROOT, "components", "PrivateRoom", "PrivateRoomLuxury.css"),
  privateRoomUnified: path.join(ROOT, "components", "PrivateRoom", "PrivateRoomUnified.css"),
  directGateCss: path.join(ROOT, "components", "PrivateRoom", "PrivateRoomDirectGate.css"),
  directGateButtons: path.join(ROOT, "components", "PrivateRoom", "PrivateRoomDirectGateButtons.css"),
  legacyAccessModal: path.join(ROOT, "components", "FxAccess", "FxAccessModal"),
};

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function write(file, content) {
  fs.writeFileSync(file, content.replace(/\r\n/g, "\n").trimEnd() + "\n", "utf8");
}

function appendCss(target, source, title) {
  if (!exists(target) || !exists(source)) return false;

  const targetContent = read(target);
  const sourceContent = read(source);
  const marker = `/* USER FX · MERGED · ${title} */`;

  if (!targetContent.includes(marker)) {
    write(
      target,
      `${targetContent.trimEnd()}\n\n/*=============================================*/\n${marker}\n/*=============================================*/\n${sourceContent.trim()}\n`,
    );
  }

  fs.rmSync(source);
  return true;
}

function removeImport(file, importPath) {
  if (!exists(file)) return;
  const content = read(file);
  const escaped = importPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const next = content.replace(new RegExp(`^\\s*import\\s+["']${escaped}["'];?\\s*$`, "gm"), "");
  write(file, next.replace(/\n{3,}/g, "\n\n"));
}

function compactCss(content) {
  const directionFor = (property) => {
    if (property === "top" || property === "bottom") return "⬆️⬇️";
    if (property === "left" || property === "right") return "⬅️➡️";
    if (["width", "min-width", "max-width"].includes(property)) return "↔️";
    if (["height", "min-height", "max-height"].includes(property)) return "↕️";
    if (property === "transform" || property === "transform-origin") return "↗️";
    if (property === "font-size") return "↗️ tamaño";
    if (property === "margin" || property.startsWith("margin-")) return "↔️↕️";
    if (property === "padding" || property.startsWith("padding-")) return "↔️↕️";
    return "";
  };

  return content
    .split("\n")
    .map((line) => {
      let next = line.replace(/\s+$/g, "");

      if (!next.trim().startsWith("/*") && !next.trim().startsWith("//")) {
        next = next.replace(/^(\s*[.#\w\[\]:>,+~*][^{]*?)\s+\{$/, "$1{");
      }

      const match = next.match(
        /^(\s*)(--?[A-Za-z][A-Za-z0-9-]*|[A-Za-z][A-Za-z0-9-]*):\s*(.+?);\s*(\/\*.*\*\/)?$/,
      );
      if (!match) return next;

      const [, indent, property, value, existingComment] = match;
      const icon = directionFor(property);
      const comment = existingComment || (icon ? `/* ${icon} */` : "");
      return `${indent}${property}:${value};${comment ? ` ${comment}` : ""}`;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

function walk(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", ".vercel"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, result);
    else result.push(full);
  }
  return result;
}

console.log("USER FX · 1/4 · Unifying component CSS...");
appendCss(files.vaultCss, files.vaultMobile, "MOBILE POLISH → VaultHome.css");
appendCss(files.deviceCss, files.deviceMobile, "MOBILE → VaultDevice.css");
appendCss(files.privateRoomLuxury, files.privateRoomUnified, "UNIFIED UPDATES → PrivateRoomLuxury.css");
appendCss(files.directGateCss, files.directGateButtons, "IDENTITY → PrivateRoomDirectGate.css");

removeImport(files.app, "./components/VaultHome/mobile-polish.css");
removeImport(files.deviceTsx, "./VaultDevice.mobile.css");
removeImport(files.privateRoomLiveShell, "./PrivateRoomUnified.css");
removeImport(files.privateRoomLiveShell, "./PrivateRoomDirectGateButtons.css");

if (exists(files.legacyAccessModal)) {
  fs.rmSync(files.legacyAccessModal, { recursive: true, force: true });
  console.log("Removed legacy FxAccessModal robot implementation");
}

console.log("USER FX · 2/4 · Running Prettier across project code...");
execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "prettier",
    "--write",
    "app.jsx",
    "main.jsx",
    "index.html",
    "global.css",
    "components/**/*.{ts,tsx,js,jsx,css}",
    "api/**/*.{ts,js}",
    "lib/**/*.{ts,js}",
    "public/**/*.{css,js,html}",
    "scripts/**/*.{js,mjs,ts}",
    "*.{js,ts,json}",
  ],
  { cwd: ROOT, stdio: "inherit" },
);

console.log("USER FX · 3/4 · Applying compact COOL CSS format + adjustment markers...");
for (const file of walk(ROOT)) {
  if (!file.endsWith(".css")) continue;
  write(file, compactCss(read(file)));
}

console.log("USER FX · 4/4 · Done.");
console.log("Unified:");
console.log("  mobile-polish.css → components/VaultHome/VaultHome.css");
console.log("  VaultDevice.mobile.css → components/VaultDevice/VaultDevice.css");
console.log("  PrivateRoomUnified.css → components/PrivateRoom/PrivateRoomLuxury.css");
console.log("  PrivateRoomDirectGateButtons.css → components/PrivateRoom/PrivateRoomDirectGate.css");
console.log("Removed stale:");
console.log("  components/FxAccess/FxAccessModal/");
console.log("Formatted:");
console.log("  TS / TSX / JS / JSX / CSS / HTML across the project");
console.log("Next: npm run build");
