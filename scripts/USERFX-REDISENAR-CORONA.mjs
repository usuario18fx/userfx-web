import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const file = "components/FX/ProtocolVault.tsx";
const component = "components/FX/ProtocolCrown3D.tsx";
const stylesheet = "components/FX/ProtocolCrown3D.css";

try {
  const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
  const remote = (p) => execFileSync("git", ["show", "FETCH_HEAD:" + p], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  });
  for (const asset of ["public/corona/corona.bin", "public/assets/iconos/rosa1.png"]) {
    if (!fs.existsSync(path.join(root, asset))) throw Error("Falta: " + asset);
  }
  const original = read(file);
  if (original.includes("ProtocolCrown3D") && !original.includes("function ProtocolCrown(")) {
    throw Error("El nuevo diseño ya está instalado; no se duplicó nada.");
  }
  const start = original.indexOf("function ProtocolCrown(");
  const finish = original.indexOf("/* ---------- Tarjetas del tambor ---------- */", start);
  if (start < 0 || finish < start) {
    throw Error("No reconocí el bloque antiguo; no cambié ningún archivo.");
  }

  const oldCall = /<ProtocolCrown\s+progress=\{smooth\}\s+dissolveAt=\{dissolveAt\}\s+src=\{crownSrc\}\s*\/>/;
  if (!oldCall.test(original)) {
    throw Error("No encontré el lugar exacto de la corona; no cambié ningún archivo.");
  }

  // All source content comes from the selected, already fetched GitHub branch.
  const nextComponent = remote(component);
  const nextStyles = remote(stylesheet);
  if (!nextComponent.includes("const renderer = new THREE.WebGLRenderer") ||
      !nextStyles.includes(".fx-crown3d-stage")) {
    throw Error("Archivos de diseño incompletos; no cambié nada.");
  }
  for (const [name, expected] of [[component, nextComponent], [stylesheet, nextStyles]]) {
    if (fs.existsSync(path.join(root, name)) && read(name) !== expected) {
      throw Error("Hay cambios locales en " + name + "; no se sobrescriben.");
    }
  }

  let updated = original.slice(0, start) + original.slice(finish);
  updated = updated.replace(oldCall, "<ProtocolCrown3D progress={smooth} dissolveAt={dissolveAt} />");
  updated = updated.replace(/^\s*crownSrc\s*=\s*["'][^"']+["'],?\s*$/m, "\n");
  updated = updated.replace(/^import "\.\/ProtocolCrown\.css";\s*$/m, "");
  updated = updated.replace('"use client";',
    '"use client";\nimport ProtocolCrown3D from "./ProtocolCrown3D";\nimport "./ProtocolCrown3D.css";');

  if (updated === original || updated.includes("function ProtocolCrown(") ||
      !updated.includes("<ProtocolCrown3D progress={smooth} dissolveAt={dissolveAt} />")) {
    throw Error("La validación no pasó; no cambié nada.");
  }

  fs.writeFileSync(path.join(root, component), nextComponent, "utf8");
  fs.writeFileSync(path.join(root, stylesheet), nextStyles, "utf8");
  fs.writeFileSync(path.join(root, file), updated, "utf8");

  // Delete only the redundant CSS created by our previous installer, not user CSS.
  const legacy = path.join(root, "components/FX/ProtocolCrown.css");
  if (fs.existsSync(legacy) &&
      fs.readFileSync(legacy, "utf8").startsWith("/* Corona de partículas original, sin panel ni controles")) {
    fs.unlinkSync(legacy);
  }

  console.log("CORONA REDISEÑADA: fondo transparente, menor escala, 3D real.");
  console.log("Archivos originales de MY ROOM y demás secciones intactos.");
} catch (error) {
  console.error("NO SE APLICÓ EL REDISEÑO:", error.message);
  process.exitCode = 1;
}
