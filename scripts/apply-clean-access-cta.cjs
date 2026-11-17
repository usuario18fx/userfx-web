"use strict";
const fs = require("fs");
const cp = require("child_process");

const cssFile = "components/FX/SectionsLayout.css";
const tsxFile = "components/FX/Sections.tsx";
const markerStart = "/* --- CTA BUTTON (Custom Image) --- */";
const markerEnd = "/* --- ACCESSIBILITY (FOCUS) --- */";
const jsxPattern = /<a href=\{[^\r\n]*User18Fx_bot\?start=[^\r\n]*[\s\S]*?<\/a>/g;
const fromGit = (file) => cp.execFileSync("git", ["show", "FETCH_HEAD:" + file], { encoding: "utf8" });

function uniqueMatch(content, pattern, file) {
  const found = [...content.matchAll(pattern)];
  if (found.length !== 1) throw Error("No se encontró exactamente un botón en " + file);
  return found[0][0];
}
function section(content, file) {
  const start = content.indexOf(markerStart);
  const end = content.indexOf(markerEnd);
  const newStyleStart = content.indexOf("/* --- USERFX ACCESS CTA");
  if (start >= 0 && end > start) return { start, end };
  if (newStyleStart >= 0 && end > newStyleStart) return { start: newStyleStart, end };
  throw Error("No se encontró el bloque CTA en " + file);
}

const backups = [];
try {
  const newCss = fromGit(cssFile);
  const newTsx = fromGit(tsxFile);
  const localCss = fs.readFileSync(cssFile, "utf8");
  const localTsx = fs.readFileSync(tsxFile, "utf8");
  const targetRange = section(newCss, cssFile);
  const cssSegment = newCss.slice(targetRange.start, targetRange.end);
  const cssRange = section(localCss, cssFile);
  const updatedCss = localCss.slice(0, cssRange.start) + cssSegment + localCss.slice(cssRange.end);
  const targetJsx = uniqueMatch(newTsx, jsxPattern, tsxFile);
  const currentJsx = uniqueMatch(localTsx, jsxPattern, tsxFile);
  const updatedTsx = localTsx.replace(currentJsx, targetJsx);

  if (updatedCss === localCss && updatedTsx === localTsx) {
    console.log("Botones ya actualizados.");
    process.exit(0);
  }

  const suffix = ".backup-" + Date.now();
  for (const [file, before, after] of [
    [cssFile, localCss, updatedCss],
    [tsxFile, localTsx, updatedTsx],
  ]) {
    if (before === after) continue;
    const backup = file + suffix;
    fs.copyFileSync(file, backup);
    backups.push([file, backup]);
    fs.writeFileSync(file, after);
  }
  console.log("Botones ACCESS actualizados. Respaldos creados.");
  console.log("Verifica con: npx tsc --noEmit");
} catch (error) {
  for (const [file, backup] of backups) fs.copyFileSync(backup, file);
  console.error("Sin cambios: " + error.message);
  process.exitCode = 1;
}
