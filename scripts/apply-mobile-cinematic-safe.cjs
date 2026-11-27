#!/usr/bin/env node
"use strict";
// FX / mobile cinematic installer.
// Merges five feature files without discarding local edits or staging anything.
// Designed for Windows PowerShell with Node.js and Git.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const cp = require("node:child_process");

function git(args, opts = {}) {
  const r = cp.spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: null,
    maxBuffer: 20 * 1024 * 1024,
    ...opts,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    const detail = (r.stderr || Buffer.alloc(0)).toString("utf8").trim();
    throw new Error("git " + args.join(" ") + " failed: " + detail);
  }
  return r.stdout;
}

function gitTry(args) {
  return cp.spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: null,
    maxBuffer: 20 * 1024 * 1024,
  });
}

const root = git(["rev-parse", "--show-toplevel"]).toString("utf8").trim();
process.chdir(root);
const origin = git(["remote", "get-url", "origin"]).toString("utf8").trim();
if (!/usuario18fx[\/\\]userfx-web(\.git)?$/i.test(origin) &&
    !/usuario18fx\/userfx-web(\.git)?$/i.test(origin)) {
  throw new Error("Wrong Git repository: " + origin);
}

const base = "origin/main";
const feature = "origin/feature/mobile-cinematic-gallery-crown-20261126";
if (gitTry(["merge-base", "--is-ancestor", base, feature]).status !== 0) {
  throw new Error("Branch does not descend from origin/main; merge manually.");
}

const files = [
  "components/FX/CinematicTour.css",
  "components/FX/CinematicTour.tsx",
  "components/FX/ProtocolCrown.tsx",
  "components/FX/ProtocolVault.css",
  "components/FX/ProtocolVault.tsx",
];

const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
const backup = path.join(root, "FX-LOCAL-BACKUP-MOBILE-" + stamp);
fs.mkdirSync(backup, { recursive: true });
const pending = [];
const conflicts = [];
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fx-merge-"));

try {
  for (const name of files) {
    const abs = path.join(root, name);
    if (!fs.existsSync(abs)) throw new Error("Missing local file: " + name);
    const current = fs.readFileSync(abs);
    const previous = git(["show", base + ":" + name]);
    const incoming = git(["show", feature + ":" + name]);

    const saved = path.join(backup, name);
    fs.mkdirSync(path.dirname(saved), { recursive: true });
    fs.copyFileSync(abs, saved);

    let candidate = current;
    let state = "UNCHANGED";
    if (current.equals(incoming)) {
      state = "ALREADY APPLIED";
    } else if (incoming.equals(previous)) {
      state = "NO FEATURE CHANGE";
    } else if (name.endsWith(".css") &&
               incoming.toString("utf8").startsWith(previous.toString("utf8"))) {
      // The branch only appends a mobile CSS block. Keep all existing local
      // CSS rules and add the feature block, even if its old patch context moved.
      const addition = incoming.toString("utf8").slice(previous.toString("utf8").length);
      const original = current.toString("utf8");
      const marker = name.includes("CinematicTour")
        ? "FX_MOBILE_SCROLL_SWIPE_V1" : "FX_MOBILE_SINGLE_PHOTOS_V1";
      if (original.includes(marker)) {
        if (original.includes(addition.trim())) {
          state = "ALREADY APPLIED";
        } else {
          conflicts.push(name + " (mobile block already exists but differs)");
          continue;
        }
      } else {
        const newline = original.includes("\r\n") ? "\r\n" : "\n";
        const block = addition.replace(/\r?\n/g, newline);
        const separator = /[\r\n]$/.test(original) ? "" : newline;
        candidate = Buffer.from(original + separator + block, "utf8");
        state = "APPENDED MOBILE CSS";
      }
    } else {
      const folder = path.join(dir, String(pending.length) + "-" + name.replace(/[\\/]/g, "_"));
      fs.mkdirSync(folder, { recursive: true });
      const localFile = path.join(folder, "local");
      const baseFile = path.join(folder, "base");
      const incomingFile = path.join(folder, "incoming");
      fs.writeFileSync(localFile, current);
      fs.writeFileSync(baseFile, previous);
      fs.writeFileSync(incomingFile, incoming);
      const merged = gitTry([
        "merge-file", "-p", "-L", "LOCAL", "-L", "BASE", "-L", "FEATURE",
        localFile, baseFile, incomingFile,
      ]);
      if (merged.status !== 0) {
        const preview = path.join(backup, name + ".MERGE-PREVIEW");
        fs.writeFileSync(preview, merged.stdout || Buffer.alloc(0));
        conflicts.push(name + " (conflict preview saved to backup)");
        continue;
      }
      candidate = merged.stdout;
      state = "THREE-WAY MERGED";
    }
    pending.push({ name, abs, candidate, state });
  }

  if (conflicts.length) {
    console.error("MERGE CONFLICT: no project files were changed.");
    conflicts.forEach((item) => console.error("  " + item));
    console.error("Your originals and merge previews are saved at: " + backup);
    process.exitCode = 2;
  } else {
    let written = [];
    try {
      for (const item of pending) {
        if (!fs.readFileSync(item.abs).equals(item.candidate)) {
          fs.writeFileSync(item.abs, item.candidate);
          written.push(item);
        }
        console.log(item.state + ": " + item.name);
      }
      const css1 = fs.readFileSync(path.join(root, files[0]), "utf8");
      const css2 = fs.readFileSync(path.join(root, files[3]), "utf8");
      if (!css1.includes("FX_MOBILE_SCROLL_SWIPE_V1") ||
          !css2.includes("FX_MOBILE_SINGLE_PHOTOS_V1")) {
        throw new Error("Expected mobile styles not installed.");
      }
      console.log("SUCCESS: all five feature files integrated; local changes preserved.");
      console.log("BACKUP: " + backup);
      console.log("NEXT: run your project build and visually inspect mobile layout.");
    } catch (e) {
      for (const item of written) {
        const original = path.join(backup, item.name);
        fs.copyFileSync(original, item.abs);
      }
      throw e;
    }
  }
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
