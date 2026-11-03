import fs from 'node:fs';
const path = 'components/FX/ScrollStory.tsx';
const cssPath = 'components/FX/ScrollStory.css';
let source = fs.readFileSync(path, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');
const videoCssPath = 'components/FX/ProtocolVault.css';
let videoCss = fs.readFileSync(videoCssPath, 'utf8');
const imagePath = 'public/assets/album/PRVW/PRVW-00.jpg';
if (!fs.existsSync(imagePath)) throw new Error(`Falta ${imagePath}. Coloca la foto 00 junto a las demás antes de continuar.`);
if (!source.includes('fx-photo-grid')) {
  for (const anchor of ['className="fx-scroll-scenes"', 'className="fx-scroll-stage"', 'scene={scene}']) {
    if (source.split(anchor).length !== 2) throw new Error(`No se encontró un único ${anchor}. No se modificó ningún archivo.`);
  }
  source = source.replace('className="fx-scroll-scenes"', 'className="fx-scroll-scenes fx-photo-panel"')
    .replace('className="fx-scroll-stage"', 'className="fx-scroll-stage fx-photo-grid"')
    .replace('scene={scene}', 'scene={i === 0 ? { ...scene, image: "/assets/album/PRVW/PRVW-00.jpg", video: undefined } : scene}');
}
const marker = '/* FX PHOTO PANEL 2x2 */';
if (!css.includes(marker)) css += `\n${marker}
.fx-scroll-story .fx-scroll-scenes.fx-photo-panel { height:auto; min-height:0; }
.fx-scroll-story .fx-scroll-stage.fx-photo-grid { position:relative; top:auto; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); grid-template-rows:repeat(2,minmax(0,1fr)); height:clamp(480px,calc(100svh - 64px),1000px); gap:3px; padding:3px; background:#08090c; }
.fx-scroll-story .fx-photo-grid > .fx-scroll-scene { width:100%; height:100%; min-width:0; min-height:0!important; border:0; overflow:hidden; }
.fx-scroll-story .fx-photo-grid .fx-scroll-scene-link { position:relative; display:block; width:100%; height:100%; opacity:1!important; clip-path:none!important; }
.fx-scroll-story .fx-photo-grid .fx-scroll-scene-image { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transform:none!important; }
@media(max-width:700px){.fx-scroll-story .fx-scroll-stage.fx-photo-grid { height:clamp(480px,76svh,760px); gap:2px; padding:2px; }}
`;
const videoMarker = '/* FX VIDEO PANEL 2x2 */';
if (!videoCss.includes(videoMarker)) videoCss += `\n${videoMarker}
.pv .pv-quads, .pv--flat .pv-quads.pv-quads--flat { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); }
.pv-quads > .pv-quad { min-width:0; margin:0; }
@media(max-width:700px){
  .pv--flat .pv-quads.pv-quads--flat { grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
  .pv-quads.pv-quads--flat .pv-quad { aspect-ratio:3/4; border-radius:12px; }
  .pv-quads .pv-quad-text { padding:10px; }
  .pv-quads .pv-quad-label { padding:7px; }
  .pv-quads .pv-quad-label strong { font-size:clamp(14px,4vw,22px); }
  .pv-quads .pv-quad-label small { font-size:8px; letter-spacing:.04em; }
}
`;
fs.writeFileSync(path, source, 'utf8');
fs.writeFileSync(cssPath, css, 'utf8');
fs.writeFileSync(videoCssPath, videoCss, 'utf8');
console.log('Foto PRVW-00.jpg y paneles de fotos y videos 2 × 2 guardados.');
