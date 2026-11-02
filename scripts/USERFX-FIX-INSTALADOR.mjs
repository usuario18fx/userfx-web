import fs from 'node:fs';
const target = process.argv[2];
if (!target || !fs.existsSync(target)) throw Error('No encuentro el instalador temporal.');
let s = fs.readFileSync(target, 'utf8');
const start = s.indexOf('  room = replaceOnce(room,\n    \'  stage: "04');
const end = s.indexOf('  room = replaceOnce(room,\n    \'["gallery"', start);
if (start < 0 || end < 0) throw Error('El instalador no tiene la version esperada; archivo intacto.');
const replacement = String.raw`  // Conservar los titulos existentes de Stage: solo agregar las dos etapas nuevas.
  const appendProps = (src, name, additions) => {
    const re = new RegExp('const\\s+' + name + '\\b[^=]*=\\s*\\{([\\s\\S]*?)\\};');
    const match = re.exec(src);
    if (!match) throw new Error('No se encontro el mapa ' + name);
    const body = match[1];
    if (!/(?:^|[,{\n])\s*stage\s*:/.test(body)) throw new Error('Falta Stage en ' + name);
    if (/['"]stage-close['"]\s*:/.test(body)) return src;
    const old = match[0];
    const head = old.slice(0, old.length - body.length - 2);
    let before = body.trimEnd();
    if (!before.endsWith(',')) before += ',';
    const changed = head + before + '\n' + additions + '\n};';
    return src.slice(0, match.index) + changed + src.slice(match.index + old.length);
  };
  room = appendProps(room, 'BADGES', '  "stage-side": "05  LIVE STAGE / ANGLE 02",\n  "stage-close": "06  LIVE STAGE / ANGLE 03",');
  room = appendProps(room, 'COUNTERS', '  "stage-side": "05",\n  "stage-close": "06",');
  room = appendProps(room, 'TITLES', '  "stage-side": <>Stage<br />lateral.</>,\n  "stage-close": <>Stage<br />detail.</>,');
  room = appendProps(room, 'SUBTITLES', '  "stage-side": "Perspectiva lateral para apreciar la pasarela.",\n  "stage-close": "Vista cercana de la pantalla y del video.",');
  room = appendProps(room, 'PRIMARY_LABEL', '  "stage-side": "Siguiente angulo",\n  "stage-close": "Entrar a Stage",');
`;
s = s.slice(0, start) + replacement + s.slice(end);
const a = s.indexOf('  room = replaceRe(room,\n    /case "stage":');
const b = s.indexOf('    `case "stage":', a);
if (a < 0 || b < 0) throw Error('No se pudo flexibilizar Stage; archivo intacto.');
s = s.slice(0, a) + String.raw`  room = replaceRe(room,
    /case "stage":\s*return\s*\[[\s\S]*?\];/g,
` + s.slice(b);
fs.writeFileSync(target, s, 'utf8');
console.log('INSTALADOR CORREGIDO: respeta los titulos actuales del sitio.');
