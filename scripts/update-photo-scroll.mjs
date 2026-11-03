import fs from 'node:fs';
const path='components/FX/ScrollStory.tsx';
let source=fs.readFileSync(path,'utf8');
if (!source.includes('<PhotoScrollPanel />')) {
  const section=/<div id="spaces" ref=\{spacesRef\} className="fx-scroll-scenes(?: fx-photo-panel)?" aria-label="Explore UserFX spaces"\s*>[\s\S]*?<\/div>\s*<\/div>/g;
  if ([...source.matchAll(section)].length!==1) throw new Error('La sección de fotos no coincide. No se modificó ningún archivo.');
  source=source.replace(section,'<PhotoScrollPanel />');
  source=source.replace('"use client";', '"use client";\nimport PhotoScrollPanel from "./PhotoScrollPanel";');
  fs.writeFileSync(path,source,'utf8');
}
console.log('Fotos secuenciales con corona y rosa: actualizado.');
