// Procedural surface textures (plaster, clay roof tiles, terracotta floor, wood, bark) with normal and
// roughness maps, plus "baked glow": lantern light stored per vertex and added as emissive, which gives warm
// light pools on walls and floors without paying for dozens of real lights.
import * as THREE from 'three';

const cv = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

// Tileable value noise: a tiny random grid with a 1px wrapped border, scaled up by the browser's bilinear filter.
function noiseLayer(nx, ny) {
  const c = cv(nx + 2, ny + 2), x = c.getContext('2d'), d = x.createImageData(nx + 2, ny + 2);
  const v = Array.from({ length: nx * ny }, () => Math.random() * 255);
  for (let j = 0; j < ny + 2; j++) for (let i = 0; i < nx + 2; i++) {
    const k = v[((j + ny - 1) % ny) * nx + ((i + nx - 1) % nx)], o = (j * (nx + 2) + i) * 4;
    d.data[o] = d.data[o + 1] = d.data[o + 2] = k; d.data[o + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  return c;
}
// Fractal noise drawn into a context. `sx`/`sy` stretch the grain (e.g. wood fibres), `op` blends it in.
export function fbm(x, w, h, { cells = 4, octaves = 5, alpha = 1, op = 'source-over', sx = 1, sy = 1 } = {}) {
  x.save();
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.globalCompositeOperation = op;
  for (let o = 0; o < octaves; o++) {
    const nx = Math.max(1, Math.round(cells * sx)) << o, ny = Math.max(1, Math.round(cells * sy)) << o;
    x.globalAlpha = alpha * (o === 0 ? 1 : 0.5);
    x.drawImage(noiseLayer(nx, ny), 1, 1, nx, ny, 0, 0, w, h);
  }
  x.restore();
}

// Tangent-space normal map from a grayscale height canvas (wrapping, so tiling stays seamless).
function normalFrom(hc, strength = 2) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = cv(w, h), ox = out.getContext('2d'), d = ox.createImageData(w, h);
  const H = (i, j) => src[(((j + h) % h) * w + ((i + w) % w)) * 4] / 255;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = (H(i + 1, j) - H(i - 1, j)) * strength, dy = (H(i, j + 1) - H(i, j - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), o = (j * w + i) * 4;
    d.data[o] = (-dx / l * 0.5 + 0.5) * 255; d.data[o + 1] = (dy / l * 0.5 + 0.5) * 255; d.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; d.data[o + 3] = 255;
  }
  ox.putImageData(d, 0, 0);
  return out;
}
function tex(c, { srgb = false, repeat = [1, 1] } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
}
const set = (maps, repeat) => { for (const k in maps) maps[k].repeat.set(...repeat); return maps; };

// Hội An lime plaster: ochre wash, mottling, grime rising from the ground, rain streaks, a few patches
// where the plaster has fallen away to brick.
export function plaster(tint = '#d9a441') {
  const S = 512, col = cv(S, S), hc = cv(S, S), x = col.getContext('2d'), y = hc.getContext('2d');
  fbm(y, S, S, { cells: 6, octaves: 6 });
  x.fillStyle = tint; x.fillRect(0, 0, S, S);
  fbm(x, S, S, { cells: 3, octaves: 4, op: 'multiply', alpha: 0.28 });
  fbm(x, S, S, { cells: 10, octaves: 3, op: 'soft-light', alpha: 0.3 });
  for (let i = 0; i < 90; i++) { // rain streaks from the eaves
    const sx = Math.random() * S, len = 60 + Math.random() * 260;
    const g = x.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0, 'rgba(70,45,20,.22)'); g.addColorStop(1, 'rgba(70,45,20,0)');
    x.fillStyle = g; x.fillRect(sx, 0, 1 + Math.random() * 3, len);
  }
  const grime = x.createLinearGradient(0, S, 0, S * 0.55);
  grime.addColorStop(0, 'rgba(45,30,15,.7)'); grime.addColorStop(1, 'rgba(45,30,15,0)');
  x.globalCompositeOperation = 'multiply'; x.fillStyle = grime; x.fillRect(0, 0, S, S); x.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 2; i++) { // small spalled patches, low on the wall: brick showing through
    const cx = Math.random() * S, cy = S * (0.6 + Math.random() * 0.3), r = 7 + Math.random() * 10, n = 22;
    const blob = new Path2D();
    let rr = r;
    for (let k = 0; k <= n; k++) { const a = (k / n) * Math.PI * 2; rr = rr * 0.6 + r * (0.5 + Math.random()) * 0.4; const px = cx + Math.cos(a) * rr * 1.8, py = cy + Math.sin(a) * rr; k ? blob.lineTo(px, py) : blob.moveTo(px, py); }
    x.fillStyle = 'rgba(150,90,62,.85)'; x.fill(blob);
    y.fillStyle = 'rgba(0,0,0,.5)'; y.fill(blob);
  }
  return { map: tex(col, { srgb: true }), normalMap: tex(normalFrom(hc, 3)) };
}

// Âm-dương clay roof tiles: rows of convex cover tiles over concave pan tiles, in courses down the slope.
// u runs across the roof (8 tile columns), v down the slope (4 courses).
export function roofTiles() {
  const W = 256, H = 256, col = cv(W, H), hc = cv(W, H), x = col.getContext('2d'), y = hc.getContext('2d');
  const cols = 8, rows = 4, cw = W / cols, rh = H / rows;
  y.fillStyle = '#444'; y.fillRect(0, 0, W, H);
  x.fillStyle = '#5e2c1c'; x.fillRect(0, 0, W, H);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x0 = c * cw, y0 = r * rh, hue = 0.8 + Math.random() * 0.35;
    // pan tile (dished) then cover tile (rounded) straddling the joint
    const pan = x.createLinearGradient(x0, 0, x0 + cw, 0);
    pan.addColorStop(0, `rgb(${70 * hue},${32 * hue},${22 * hue})`); pan.addColorStop(0.5, `rgb(${120 * hue},${58 * hue},${38 * hue})`); pan.addColorStop(1, `rgb(${70 * hue},${32 * hue},${22 * hue})`);
    x.fillStyle = pan; x.fillRect(x0, y0, cw, rh);
    const cov = x.createLinearGradient(x0 + cw * 0.6, 0, x0 + cw * 1.4, 0);
    cov.addColorStop(0, '#3a1a10'); cov.addColorStop(0.35, `rgb(${170 * hue},${86 * hue},${56 * hue})`); cov.addColorStop(0.6, `rgb(${140 * hue},${68 * hue},${44 * hue})`); cov.addColorStop(1, '#2a120a');
    x.fillStyle = cov; x.fillRect(x0 + cw * 0.62, y0, cw * 0.76, rh);
    const hg = y.createLinearGradient(x0 + cw * 0.62, 0, x0 + cw * 1.38, 0);
    hg.addColorStop(0, '#333'); hg.addColorStop(0.5, '#fff'); hg.addColorStop(1, '#333');
    y.fillStyle = hg; y.fillRect(x0 + cw * 0.62, y0, cw * 0.76, rh);
    // each course overlaps the one below: shadow line at the lower lip
    x.fillStyle = 'rgba(15,5,2,.75)'; x.fillRect(x0, y0 + rh - 5, cw, 5);
    x.fillStyle = 'rgba(255,190,140,.18)'; x.fillRect(x0, y0 + rh - 9, cw, 3);
    const lip = y.createLinearGradient(0, y0, 0, y0 + rh);
    lip.addColorStop(0, 'rgba(0,0,0,.5)'); lip.addColorStop(0.9, 'rgba(0,0,0,0)'); lip.addColorStop(1, 'rgba(0,0,0,.8)');
    y.fillStyle = lip; y.fillRect(x0, y0, cw, rh);
  }
  fbm(x, W, H, { cells: 4, octaves: 5, op: 'multiply', alpha: 0.55 }); // soot, lichen, age
  x.globalCompositeOperation = 'soft-light'; x.fillStyle = 'rgba(60,90,40,.35)';
  for (let i = 0; i < 40; i++) { x.beginPath(); x.arc(Math.random() * W, Math.random() * H, 2 + Math.random() * 8, 0, 7); x.fill(); }
  x.globalCompositeOperation = 'source-over';
  return { map: tex(col, { srgb: true }), normalMap: tex(normalFrom(hc, 5)) };
}

// Gạch bát: square terracotta pavers with grout, per-brick tone, worn edges, and polished/damp patches
// (low roughness) that catch the lantern light.
const made = new Map(); // same pavers in several places: build once, hand out clones (they share the image)
export function terracotta(bricks = 4) {
  if (!made.has(bricks)) made.set(bricks, makeTerracotta(bricks));
  const t = made.get(bricks), out = {};
  for (const k in t) out[k] = t[k].clone();
  return out;
}
function makeTerracotta(bricks) {
  const S = 512, b = S / bricks, col = cv(S, S), hc = cv(S, S), rc = cv(S, S);
  const x = col.getContext('2d'), y = hc.getContext('2d'), r = rc.getContext('2d');
  x.fillStyle = '#3c2419'; x.fillRect(0, 0, S, S);
  y.fillStyle = '#000'; y.fillRect(0, 0, S, S);
  r.fillStyle = '#f0f0f0'; r.fillRect(0, 0, S, S);
  for (let i = 0; i < bricks; i++) for (let j = 0; j < bricks; j++) {
    const k = 0.78 + Math.random() * 0.3, g = 4 + Math.random() * 2, x0 = i * b + g, y0 = j * b + g, s = b - g * 2;
    x.fillStyle = `rgb(${176 * k},${86 * k},${58 * k})`; x.fillRect(x0, y0, s, s);
    const bev = y.createRadialGradient(x0 + s / 2, y0 + s / 2, s * 0.35, x0 + s / 2, y0 + s / 2, s * 0.72);
    bev.addColorStop(0, '#fff'); bev.addColorStop(1, '#777');
    y.fillStyle = bev; y.fillRect(x0, y0, s, s);
    r.fillStyle = `rgb(${160 + Math.random() * 40},0,0)`; r.fillRect(x0, y0, s, s);
  }
  fbm(x, S, S, { cells: 8, octaves: 5, op: 'multiply', alpha: 0.5 });
  fbm(x, S, S, { cells: 2, octaves: 3, op: 'soft-light', alpha: 0.5 });
  fbm(y, S, S, { cells: 16, octaves: 3, op: 'multiply', alpha: 0.35 });
  // worn, polished paths: darken roughness where low-frequency noise is high
  const wear = cv(S, S), wx = wear.getContext('2d');
  fbm(wx, S, S, { cells: 2, octaves: 4 });
  r.globalCompositeOperation = 'multiply'; r.globalAlpha = 0.9; r.drawImage(wear, 0, 0); r.globalAlpha = 1;
  // roughness lives in G for three.js: copy R→G
  const rd = r.getImageData(0, 0, S, S); for (let i = 0; i < rd.data.length; i += 4) { const v = Math.min(255, 70 + rd.data[i] * 0.85); rd.data[i + 1] = v; } r.putImageData(rd, 0, 0);
  return { map: tex(col, { srgb: true }), normalMap: tex(normalFrom(hc, 4)), roughnessMap: tex(rc) };
}

// Weathered granite embankment blocks in running bond (4 blocks × 3 courses per tile), dark and wet low down.
export function stoneWall() {
  const W = 512, H = 256, col = cv(W, H), hc = cv(W, H), x = col.getContext('2d'), y = hc.getContext('2d');
  x.fillStyle = '#1e1a18'; x.fillRect(0, 0, W, H); y.fillStyle = '#000'; y.fillRect(0, 0, W, H);
  const rows = 3, bw = W / 4, bh = H / rows;
  for (let r = 0; r < rows; r++) for (let c = -1; c < 5; c++) {
    const x0 = c * bw + (r % 2) * bw / 2 + 3, y0 = r * bh + 3, k = 0.7 + Math.random() * 0.35;
    x.fillStyle = `rgb(${98 * k},${92 * k},${86 * k})`; x.fillRect(x0, y0, bw - 6, bh - 6);
    y.fillStyle = '#ccc'; y.fillRect(x0 + 2, y0 + 2, bw - 10, bh - 10);
  }
  fbm(x, W, H, { cells: 8, octaves: 5, op: 'multiply', alpha: 0.6 });
  fbm(y, W, H, { cells: 16, octaves: 3, op: 'multiply', alpha: 0.5 });
  const wet = x.createLinearGradient(0, H, 0, H * 0.4);
  wet.addColorStop(0, 'rgba(10,20,15,.8)'); wet.addColorStop(1, 'rgba(10,20,15,0)');
  x.globalCompositeOperation = 'multiply'; x.fillStyle = wet; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
  return { map: tex(col, { srgb: true }), normalMap: tex(normalFrom(hc, 4)) };
}

// Dark lacquered hardwood planks, vertical grain.
export function wood(tone = '#4a2616', planks = 4) {
  const W = 256, H = 512, col = cv(W, H), hc = cv(W, H), x = col.getContext('2d'), y = hc.getContext('2d');
  x.fillStyle = tone; x.fillRect(0, 0, W, H);
  fbm(x, W, H, { cells: 8, sx: 3, sy: 0.25, octaves: 4, op: 'multiply', alpha: 0.4 });
  fbm(x, W, H, { cells: 2, octaves: 3, op: 'soft-light', alpha: 0.5 });
  fbm(y, W, H, { cells: 8, sx: 3, sy: 0.25, octaves: 4 });
  for (let i = 1; i < planks; i++) { x.fillStyle = 'rgba(10,4,2,.8)'; x.fillRect((W * i) / planks - 1, 0, 2, H); y.fillStyle = '#000'; y.fillRect((W * i) / planks - 1, 0, 2, H); }
  return { map: tex(col, { srgb: true }), normalMap: tex(normalFrom(hc, 1.5)) };
}

// Mai bark: grey-brown with vertical fissures and pale lichen flecks.
export function bark() {
  const W = 256, H = 256, col = cv(W, H), hc = cv(W, H), x = col.getContext('2d'), y = hc.getContext('2d');
  fbm(y, W, H, { cells: 10, sx: 1, sy: 0.2, octaves: 5 });
  x.fillStyle = '#4a3a30'; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'multiply'; x.drawImage(hc, 0, 0); x.globalCompositeOperation = 'source-over';
  fbm(x, W, H, { cells: 3, octaves: 3, op: 'soft-light', alpha: 0.7 });
  x.fillStyle = 'rgba(160,170,140,.35)';
  for (let i = 0; i < 60; i++) { x.beginPath(); x.ellipse(Math.random() * W, Math.random() * H, 1 + Math.random() * 4, 1 + Math.random() * 3, 0, 0, 7); x.fill(); }
  return { map: tex(col, { srgb: true }), normalMap: tex(normalFrom(hc, 6)) };
}
export { set as repeatMaps };

// ---------- baked lantern glow ----------
export const glowScale = { value: 1 }; // dims every baked glow together as the dawn comes up

// Store lantern light per vertex: lights = [{ p: Vector3, c: Color, r: reach, i: intensity }].
export function bakeGlow(geo, lights) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, out = new Float32Array(pos.count * 3);
  const p = new THREE.Vector3(), n = new THREE.Vector3(), d = new THREE.Vector3();
  // Bin lights by z so each vertex only tests its neighbours (the street runs along z).
  const R = Math.max(...lights.map((L) => L.r), 1), bins = new Map(), bin = (z) => Math.floor(z / R);
  for (const L of lights) { const k = bin(L.p.z); if (!bins.has(k)) bins.set(k, []); bins.get(k).push(L); }
  for (let v = 0; v < pos.count; v++) {
    p.fromBufferAttribute(pos, v); n.fromBufferAttribute(nor, v);
    const k = bin(p.z);
    for (const L of [...(bins.get(k - 1) || []), ...(bins.get(k) || []), ...(bins.get(k + 1) || [])]) {
      d.subVectors(L.p, p);
      const dist = d.length();
      if (dist > L.r) continue;
      const facing = 0.3 + 0.7 * Math.max(0, n.dot(d) / (dist || 1)); // wrapped: soft, not a hard terminator
      const k = L.i * (1 - dist / L.r) ** 2 * facing / (1 + dist * dist * 1.5);
      out[v * 3] += L.c.r * k; out[v * 3 + 1] += L.c.g * k; out[v * 3 + 2] += L.c.b * k;
    }
  }
  geo.setAttribute('glow', new THREE.BufferAttribute(out, 3));
  return geo;
}
// Material that adds the baked glow (times its own albedo) to its emissive light.
export function withGlow(mat) {
  mat.onBeforeCompile = (s) => {
    s.uniforms.glowScale = glowScale;
    s.vertexShader = 'attribute vec3 glow;\nvarying vec3 vGlow;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = glow;');
    s.fragmentShader = 'uniform float glowScale;\nvarying vec3 vGlow;\n' + s.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vGlow * diffuseColor.rgb * glowScale;');
  };
  mat.customProgramCacheKey = () => 'glow';
  return mat;
}
