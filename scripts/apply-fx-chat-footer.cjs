"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const branch = "origin/feature/restore-embedded-fx-chat-footer-20261117";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
const base = git("merge-base", "origin/main", branch).trim();
const candidate = new Map();
const backups = [];

function fromGit(ref, filename) {
  return git("show", ref + ":" + filename);
}
function mergeFile(filename) {
  const local = fs.readFileSync(filename, "utf8");
  const original = fromGit(base, filename);
  const proposed = fromGit(branch, filename);
  if (local === proposed) return;
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "userfx-merge-"));
  try {
    const a = path.join(folder, "local");
    const b = path.join(folder, "base");
    const c = path.join(folder, "proposed");
    fs.writeFileSync(a, local);
    fs.writeFileSync(b, original);
    fs.writeFileSync(c, proposed);
    const result = spawnSync("git", ["merge-file", "-p", a, b, c], { encoding: "utf8" });
    if (result.status !== 0) {
      throw new Error("Conflicto al integrar " + filename + ". No se cambiaron archivos.");
    }
    if (result.stdout !== local) candidate.set(filename, result.stdout);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
}
function updateFooter() {
  const filename = "components/FX/FooterRedesign.tsx";
  const local = fs.readFileSync(filename, "utf8");
  if (local.includes('id="fx-chat-footer-slot"')) return;
  const reference = fromGit(branch, filename);
  const regex = /function TelegramSignIn\(\{ onVerified \}: FooterProps\) \{[\s\S]*?(?=export default function SiteFooter)/;
  const block = reference.match(regex);
  if (!block || !regex.test(local)) {
    throw new Error("FooterRedesign.tsx no coincide. No se cambiaron archivos.");
  }
  let text = local.replace(regex, block[0]);
  text = text.replace(/^import TelegramIdentityFooter from ["']\.\/TelegramIdentityFooter["'];?\r?\n/m, "");
  text = text.replace(/type TelegramUser\s*=\s*\{[\s\S]*?\};\s*type TelegramPayload\s*=\s*TelegramUser\s*&\s*\{[\s\S]*?\};\s*type TelegramWindow\s*=\s*Window\s*&\s*\{[\s\S]*?\};\s*/m, "");
  text = text.replace(/^import\s*\{\s*([^}]+)\s*\}\s*from\s*["']react["'];?\r?\n/m, (line, imports) => {
    const rest = text.replace(line, "");
    const kept = imports.split(",").map(x => x.trim()).filter(name =>
      new RegExp("\\b" + name + "\\b").test(rest));
    return kept.length ? 'import { ' + kept.join(", ") + ' } from "react";\n' : "";
  });
  if (text !== local) candidate.set(filename, text);
}

try {
  mergeFile("components/FX/FxChat.tsx");
  mergeFile("components/FX/FxChat.css");
  updateFooter();
  if (candidate.size === 0) {
    console.log("Panel USER FX CHAT ya restaurado.");
    process.exit(0);
  }
  const suffix = ".backup-" + Date.now();
  for (const [filename, text] of candidate) {
    const backup = filename + suffix;
    fs.copyFileSync(filename, backup);
    backups.push([filename, backup]);
    fs.writeFileSync(filename, text);
  }
  const verify = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsc", "--noEmit"], {
    stdio: "inherit", shell: process.platform === "win32"
  });
  if (verify.status !== 0) throw new Error("Fallo la comprobacion TypeScript");
  console.log("Panel restaurado con exito. Respaldos creados.");
} catch (error) {
  for (const [filename, backup] of backups) fs.copyFileSync(backup, filename);
  console.error("No aplicado: " + error.message);
  if (backups.length) console.error("Archivos locales restaurados.");
  process.exitCode = 1;
}
