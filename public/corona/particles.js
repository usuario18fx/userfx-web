const canvas = document.querySelector('#c');
const status = document.querySelector('#status');
const button = document.querySelector('#burst');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelector('#enter-vault').addEventListener('click', (event) => {
  if (window.parent !== window) {
    event.preventDefault();
    window.parent.postMessage({ type: 'userfx:enter-vault' }, window.location.origin);
  }
});

async function main() {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
  if (!gl) throw new Error('Este navegador no permite WebGL.');
  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
    return result;
  }
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, `
    precision highp float;
    attribute vec3 position;
    attribute float grain;
    attribute vec3 color;
    varying vec3 grainColor;
    uniform float aspect, zoom, pixelRatio;
    varying float light;
    void main() {
      grainColor = color;
      float depth = 4.7-position.z;
      float offset = aspect>1.15 ? -.32 : 0.;
      gl_Position = vec4(position.x*2.7*zoom/aspect+offset*depth,
        position.y*2.7*zoom+(aspect>1.15?0.:.15)*depth, depth-.2, depth);
      gl_PointSize = clamp((1.3+grain*1.3)*pixelRatio*zoom*3.5/depth, 1., 4.5*pixelRatio);
      light = clamp(.32+(position.z+1.5)*.18+grain*.38, .15, 1.);
    }
  `));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    varying float light;
    varying vec3 grainColor;
    void main() {
      float r=length(gl_PointCoord-.5);
      if(r>.48) discard;
      gl_FragColor=vec4(grainColor*(.5+light*.8), .65*(1.-r));
    }
  `));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const response = await fetch('corona.bin');
  if (!response.ok) throw new Error('No se pudo cargar la corona.');
  const source = new Float32Array(await response.arrayBuffer());
  if (!source.length || source.length % 3) throw new Error('Datos de corona incompletos.');
  // Sample the actual transparent rose asset, retaining its red petals and green leaves.
  const rose = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar rosa1.png.'));
    image.src = '../assets/iconos/rosa1.png';
  });
  const samplingCanvas = document.createElement('canvas');
  samplingCanvas.width = 384;
  samplingCanvas.height = Math.max(1, Math.round(384 * rose.naturalHeight / rose.naturalWidth));
  const sampling = samplingCanvas.getContext('2d', { willReadFrequently: true });
  if (!sampling) throw new Error('No se pudo preparar la rosa.');
  sampling.drawImage(rose, 0, 0, samplingCanvas.width, samplingCanvas.height);
  const pixels = sampling.getImageData(0, 0, samplingCanvas.width, samplingCanvas.height).data;
  const rosePixels = [];
  for (let y = 0; y < samplingCanvas.height; y++) {
    for (let x = 0; x < samplingCanvas.width; x++) {
      const index = (y * samplingCanvas.width + x) * 4;
      if (pixels[index + 3] > 64) rosePixels.push([x, y, pixels[index], pixels[index + 1], pixels[index + 2]]);
    }
  }
  if (!rosePixels.length) throw new Error('La imagen de la rosa está vacía.');
  const crownCount = Math.min(source.length / 3, 22000);
  const roseCount = Math.min(rosePixels.length, 10000);
  const count = crownCount + roseCount;
  const colors = new Float32Array(count * 3);
  const home = new Float32Array(count * 3);
  const positions = new Float32Array(count * 3);
  const velocity = new Float32Array(count * 3);
  const grains = new Float32Array(count);
  const release = new Float32Array(count);
  let seed = 7123;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const FLOOR = -1.38;
  for (let i = 0; i < count; i++) {
    if (i < crownCount) {
      const index = Math.floor(i * (source.length / 3) / crownCount) * 3;
      home.set([source[index] * .66, source[index + 1] * .66, source[index + 2] * .66], i * 3);
      colors.set([.22, .60, 1], i * 3);
    } else {
      const pixel = rosePixels[Math.floor((i - crownCount) * rosePixels.length / roseCount)];
      const luminance = (pixel[2] + pixel[3] + pixel[4]) / 765;
      home.set([(pixel[0] / samplingCanvas.width - .5) * 1.9,
        (.5 - pixel[1] / samplingCanvas.height) * 1.9 * samplingCanvas.height / samplingCanvas.width,
        (luminance - .5) * .14 + (random() - .5) * .035], i * 3);
      colors.set([pixel[2] / 255, pixel[3] / 255, pixel[4] / 255], i * 3);
    }
    grains[i] = random();
    release[i] = random() * .65;
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * 1.8;
    positions.set([Math.cos(angle) * radius, FLOOR + random() * .035, Math.sin(angle) * radius * .7], i * 3);
  }
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
  const positionAttribute = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(positionAttribute);
  gl.vertexAttribPointer(positionAttribute, 3, gl.FLOAT, false, 0, 0);
  const grainBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, grainBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, grains, gl.STATIC_DRAW);
  const grainAttribute = gl.getAttribLocation(program, 'grain');
  gl.enableVertexAttribArray(grainAttribute);
  gl.vertexAttribPointer(grainAttribute, 1, gl.FLOAT, false, 0, 0);
  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
  const colorAttribute = gl.getAttribLocation(program, 'color');
  gl.enableVertexAttribArray(colorAttribute);
  gl.vertexAttribPointer(colorAttribute, 3, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(['aspect', 'zoom', 'pixelRatio'].map(name => [name, gl.getUniformLocation(program, name)]));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.clearColor(0, 0, 0, 0);
  const zoom = 1;
  let phase = 'rising', elapsed = 0, hold = 0, yaw = -.2, pitch = .08;
  let dragging = false, moved = false, lastX = 0, lastY = 0, active = true, raf = 0;
  const mouse = { x: 10, y: 10, dx: 0, dy: 0, energy: 0, inside: false };
  function sync() {
    button.textContent = phase === 'falling' || phase === 'ground' ? 'Regenerar corona y rosa' : 'Deshacer corona y rosa';
    button.setAttribute('aria-pressed', String(phase === 'falling' || phase === 'ground'));
    status.textContent = phase === 'ground' ? 'ARENA SUELTA · MUEVE EL MOUSE PARA DISPERSARLA' : phase === 'falling' ? 'GRANOS EN CAÍDA LIBRE' : phase === 'rising' ? 'REGENERANDO CORONA Y ROSA…' : `${count.toLocaleString('es')} GRANOS · PULSA PARA DESHACER`;
  }
  function transition(next) {
    phase = next; elapsed = 0; hold = 0;
    if (next === 'falling') {
      for (let i = 0; i < count; i++) {
        const j = i * 3, angle = random() * Math.PI * 2;
        velocity[j] = Math.cos(angle) * (.15 + random() * .7);
        velocity[j + 1] = .15 + random() * .7;
        velocity[j + 2] = Math.sin(angle) * (.15 + random() * .7);
      }
    }
    sync();
  }
  function toggle() { transition(phase === 'falling' || phase === 'ground' ? 'rising' : 'falling'); }
  button.onclick = toggle;
  document.querySelector('#reset').onclick = () => { yaw = -.2; pitch = .08; mouse.energy = 0; transition('rising'); };
  canvas.onpointerdown = event => {
    dragging = true; moved = false; lastX = event.clientX; lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  };
  canvas.onpointermove = event => {
    const x = event.clientX / innerWidth * 2 - 1;
    const y = 1 - event.clientY / innerHeight * 2;
    if (mouse.inside) {
      mouse.dx = x - mouse.x; mouse.dy = y - mouse.y;
      mouse.energy = Math.min(1, Math.hypot(mouse.dx, mouse.dy) * 40);
    }
    mouse.x = x; mouse.y = y; mouse.inside = true;
    if (phase === 'ground') hold = 0;
    if (!dragging) return;
    const dx = event.clientX - lastX, dy = event.clientY - lastY;
    if (Math.abs(event.clientX - lastX) + Math.abs(event.clientY - lastY) > 2) moved = true;
    if (phase === 'idle' || phase === 'rising') {
      yaw += dx * .008;
      pitch = Math.max(-1.4, Math.min(1.4, pitch + dy * .008));
    }
    lastX = event.clientX; lastY = event.clientY;
  };
  canvas.onpointerleave = () => { mouse.inside = false; mouse.energy = 0; };
  canvas.onpointerup = () => { dragging = false; if (!moved) toggle(); };
  canvas.onpointercancel = () => { dragging = false; mouse.inside = false; };
  document.addEventListener('keydown', event => {
    if (/^(BUTTON|A|INPUT)$/.test(event.target.tagName)) return;
    if (event.code === 'Space') { event.preventDefault(); toggle(); }
    if (event.key === 'Escape') document.querySelector('#reset').click();
  });
  function simulate(dt, now) {
    const aspect = innerWidth / innerHeight;
    const offsetX = aspect > 1.15 ? -.32 : 0;
    const offsetY = aspect > 1.15 ? 0 : .15;
    const angle = yaw + (reduced || dragging ? 0 : Math.sin(now * .00015) * .1);
    const crownRotation = [Math.cos(angle), Math.sin(angle), Math.cos(pitch), Math.sin(pitch)];
    const roseRotation = [Math.cos(angle * .3), Math.sin(angle * .3), Math.cos(pitch * .3), Math.sin(pitch * .3)];
    for (let i = 0; i < count; i++) {
      const j = i * 3;
      const isRose = i >= crownCount;
      const [cy, sy, cp, sp] = isRose ? roseRotation : crownRotation;
      const anchorX = isRose ? .92 : -.64;
      const anchorY = isRose ? -.48 : .18;
      const hx = home[j] * cy + home[j + 2] * sy + anchorX;
      const hz = -home[j] * sy + home[j + 2] * cy;
      const hy = home[j + 1] * cp - hz * sp + anchorY + (reduced ? 0 : Math.sin(now * .0007) * .025);
      const tz = home[j + 1] * sp + hz * cp;
      if (phase === 'idle' || (phase === 'falling' && elapsed < release[i])) {
        positions[j] = hx; positions[j + 1] = hy; positions[j + 2] = tz;
        continue;
      }
      if (phase === 'rising') {
        const strength = reduced ? 80 : 18 + grains[i] * 8;
        const damping = Math.exp(-8 * dt);
        velocity[j] = (velocity[j] + (hx - positions[j]) * strength * dt) * damping;
        velocity[j + 1] = (velocity[j + 1] + (hy - positions[j + 1]) * strength * dt) * damping;
        velocity[j + 2] = (velocity[j + 2] + (tz - positions[j + 2]) * strength * dt) * damping;
      } else {
        velocity[j + 1] -= (3.1 + grains[i] * 1.7) * dt;
        if (!reduced && mouse.inside && mouse.energy > .01) {
          const depth = Math.max(.4, 4.7 - positions[j + 2]);
          const sx = positions[j] * 2.7 * zoom / aspect / depth + offsetX;
          const syScreen = positions[j + 1] * 2.7 * zoom / depth + offsetY;
          const dx = (sx - mouse.x) * aspect, dy = syScreen - mouse.y;
          const distance = Math.hypot(dx, dy);
          if (distance < .21) {
            const force = (1 - distance / .21) * mouse.energy;
            const theta = grains[i] * Math.PI * 2;
            velocity[j] += ((distance > .001 ? dx / distance : Math.cos(theta)) * 15 + mouse.dx * 90) * force * dt;
            velocity[j + 2] += (Math.sin(theta) * 9 - mouse.dy * 55) * force * dt;
            velocity[j + 1] += force * 13 * dt;
          }
        }
        const drag = Math.exp(-.32 * dt);
        velocity[j] *= drag; velocity[j + 2] *= drag;
      }
      for (let k = 0; k < 3; k++) positions[j + k] += velocity[j + k] * dt;
      const floor = FLOOR + grains[i] * .025;
      if (positions[j + 1] < floor && phase !== 'rising') {
        positions[j + 1] = floor;
        velocity[j + 1] = Math.abs(velocity[j + 1]) > .18 ? -velocity[j + 1] * (.18 + grains[i] * .14) : 0;
        const friction = Math.exp(-6 * dt);
        velocity[j] *= friction; velocity[j + 2] *= friction;
      }
      // Keep scattered grains within the scene without wrapping or teleporting.
      if (Math.abs(positions[j]) > 3.7) { positions[j] = Math.sign(positions[j]) * 3.7; velocity[j] *= -.3; }
      if (Math.abs(positions[j + 2]) > 2.6) { positions[j + 2] = Math.sign(positions[j + 2]) * 2.6; velocity[j + 2] *= -.3; }
    }
    mouse.energy *= Math.exp(-9 * dt);
  }
  let last = 0;
  sync();
  function frame(now) {
    if (!active) return;
    const dt = Math.min((now - (last || now)) / 1000, .04);
    last = now; elapsed += dt;
    if (phase === 'falling' && elapsed > 3.2) transition('ground');
    if (phase === 'ground') { hold += dt; if (hold > 12 && !dragging) transition('rising'); }
    if (phase === 'rising' && elapsed > (reduced ? 1 : 5)) { velocity.fill(0); transition('idle'); }
    // Substeps keep impacts stable on slower displays.
    const steps = Math.max(1, Math.ceil(dt / .012));
    for (let step = 0; step < steps; step++) simulate(dt / steps, now);
    const ratio = Math.min(devicePixelRatio, 2);
    const width = Math.round(innerWidth * ratio), height = Math.round(innerHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height); }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
    gl.uniform1f(uniforms.aspect, width / height);
    gl.uniform1f(uniforms.zoom, zoom);
    gl.uniform1f(uniforms.pixelRatio, ratio);
    gl.drawArrays(gl.POINTS, 0, count);
    raf = requestAnimationFrame(frame);
  }
  window.addEventListener('pagehide', () => { active = false; cancelAnimationFrame(raf); });
  window.addEventListener('pageshow', () => { if (!active) { active = true; last = 0; raf = requestAnimationFrame(frame); } });
  raf = requestAnimationFrame(frame);
}

main().catch(error => { status.textContent = error.message; console.error(error); });
