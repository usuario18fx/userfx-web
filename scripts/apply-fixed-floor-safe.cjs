"use strict";
// Safe three-way install: only two crown files, no reset/stash/checkout/commit.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const root = process.cwd();
const baseRef = "origin/feature/mobile-cinematic-gallery-crown-20261126";
const targetRef = "origin/feature/fx-crown-static-floor-final-20261127";
const files = ["components/FX/ProtocolCrown.tsx", "components/FX/CrownPlayground.css"];
function git(...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 10000000 }); }
function normalize(v) { return v.replace(/\r\n/g, "\n"); }
function hash(v) { return crypto.createHash("sha256").update(v).digest("hex"); }
function merge(ours, base, theirs, dir, id) {
  const inp = path.join(dir, id + "-ours");
  const anc = path.join(dir, id + "-base");
  const out = path.join(dir, id + "-remote");
  fs.writeFileSync(inp, ours);
  fs.writeFileSync(anc, base);
  fs.writeFileSync(out, theirs);
  try {
    return execFileSync("git", ["merge-file", "-p", "-L", "LOCAL", "-L", "GITHUB-BASE", "-L", "FINAL", inp, anc, out],
      { cwd: root, encoding: "utf8", maxBuffer: 10000000 });
  } catch (err) {
    const output = String(err.stdout || "");
    if (output) fs.writeFileSync(path.join(dir, id + "-CONFLICT.txt"), output);
    throw new Error("Conflict in " + files[id] + ". Your source is unchanged. See backup: " + dir);
  }
}
const toplevel = git("rev-parse", "--show-toplevel").trim();
if (path.resolve(toplevel).toLowerCase() !== path.resolve(root).toLowerCase())
  throw new Error("Run this installer at the repository root: C:\\Projects\\userfx-web");
if (!/usuario18fx\/userfx-web(?:\.git)?/i.test(git("remote", "get-url", "origin").trim()))
  throw new Error("Wrong GitHub repository - refusing to patch");
git("rev-parse", "--verify", baseRef);
git("rev-parse", "--verify", targetRef);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const folder = path.join(os.homedir(), "FX-Backups", "crown-final-" + stamp);
fs.mkdirSync(folder, { recursive: true });
const pending = [];
const manifest = { created: stamp, baseRef, targetRef, files: [] };
for (let i = 0; i < files.length; i++) {
  const p = files[i];
  const absolute = path.join(root, p);
  if (!fs.existsSync(absolute)) throw new Error("Missing local file: " + p);
  const oursRaw = fs.readFileSync(absolute, "utf8");
  const ours = normalize(oursRaw);
  const base = normalize(git("show", baseRef + ":" + p));
  const theirs = normalize(git("show", targetRef + ":" + p));
  const result = ours === theirs ? ours : ours === base ? theirs : merge(ours, base, theirs, folder, i);
  const backupName = i + "-" + path.basename(p) + ".backup";
  fs.writeFileSync(path.join(folder, backupName), oursRaw);
  manifest.files.push({ path: p, backupName, oldHash: hash(oursRaw), newHash: hash(result) });
  if (/^(<<<<<<< |=======|>>>>>>> )/m.test(result)) throw new Error("Conflict markers detected in " + p);
  const lineEnd = (oursRaw.match(/\r\n/g) || []).length > 10 ? "\r\n" : "\n";
  pending.push({ absolute, old: oursRaw, next: lineEnd === "\r\n" ? result.replace(/\n/g, "\r\n") : result });
}
if (!pending[0].next.includes("scene.add(fxStageFloor)") ||
    !pending[0].next.includes("FX_FIXED_GROUND_V2") ||
    !pending[1].next.includes("FX_FIXED_GROUND_V2"))
  throw new Error("Ground-fix markers missing. No local files changed.");
fs.writeFileSync(path.join(folder, "manifest.json"), JSON.stringify(manifest, null, 2));
const changed = pending.filter(x => x.old !== x.next);
for (const item of changed) fs.writeFileSync(item.absolute, item.next);
if (changed.length > 0) {
  try {
    if (process.platform === "win32") {
      execFileSync("cmd.exe", ["/d", "/c", "npx tsc --noEmit"], { cwd: root, stdio: "inherit", timeout: 120000 });
    } else {
      execFileSync("npx", ["tsc", "--noEmit"], { cwd: root, stdio: "inherit", timeout: 120000 });
    }
  } catch (err) {
    for (const item of changed) fs.writeFileSync(item.absolute, item.old);
    throw new Error("TypeScript failed; restored both crown files. Backup: " + folder);
  }
}
console.log("FX CROWN FINAL INSTALLED: fixed floor + static background + moving outline/particles.");
console.log("Updated: " + (changed.map(x => path.relative(root, x.absolute)).join(", ") || "(already current)"));
console.log("Backup: " + folder);
console.log("Other local files and untracked files were not touched.");
