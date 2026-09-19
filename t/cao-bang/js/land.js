// The valley's ground: one height function drives the terrain, and everything else (houses, trees, peaks, labels)
// sits on it. Units are metres, squeezed: the real Bản Giốc is ~300 m wide, here it spans ~100 so the whole valley
// fits one diorama. North is -z. From north to south along the Quây Sơn: the falls on a horseshoe cliff (two tiers,
// river on the plateau above), the pool, then the river winds south through rice fields; the Tày village climbs the
// east bank in terraces, Mắt Thần rises from the fields on the west, haystack karst peaks ring everything.
import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, hash, noise, fbm, ss, lerp } from './noise.js';
import { detail, noiseTex } from './detail.js';

export const SIZE = 520;
export const FALLS = { c: new THREE.Vector2(-5, -40), r1: 80, r2: 86, th: 0.72, y1: 13, y2: 26 }; // arc centre, tier radii, half span, tier tops
export const WATER_Y = -0.4, UPPER_Y = FALLS.y2 - 0.5;
export const MATTHAN = new THREE.Vector3(-122, 0, 18), MATTHAN_TURN = 0.45; // the hole looks along (sin, 0, cos) of the turn
export const VILLAGE = { x0: 44, x1: 112, z0: -38, z1: 48 };
export const PADS = [];                  // flat yards: { x, z, r } (the then yard, the incense yard, …), filled by village.js / sites.js

// The rest of Cao Bằng's best-known places, drawn in round the valley's rim (squeezed together like the rest):
export const LAKE = { x: -180, z: 100 };                      // Thang Hen, a lake in a bowl of peaks
export const PACBO = { x: -160, z: -118, stream: [[-178, -128], [-168, -121], [-158, -116], [-147, -104]] }; // Pác Bó, the Lênin stream
export const PHJA = { x: -236, z: 18 };                       // Phja Oắc: the high massif on the western edge
export const NGUOM = { x: 72, z: -96, r: 17, h: 52 };          // the karst tower holding Ngườm Ngao cave
export const MARX = { x: -192, z: -128, r: 13, h: 44 };        // Karl Marx mountain at Pác Bó
export const MBC = { x: 152, z: 30 };                        // Thác Mẹ Bồng Con: a small falls in the eastern hills
export const SO = { x: 165, z: -35, r: 45 };                  // a hillside of white-flowering sở (tea-oil) trees
export const TGM = { x: 124, z: 160, r: 40 };                 // a slope of pink tam giác mạch (buckwheat)
export const DQ = { x: -152, z: 62 };                         // dã quỳ (wild sunflowers) on the way up to Phja Oắc
// places the random karst peaks keep clear of
export const CLEAR = [{ x: LAKE.x, z: LAKE.z, r: 48 }, { x: PACBO.x, z: PACBO.z, r: 26 }, { x: -140, z: 176, r: 62 }, { x: PHJA.x, z: PHJA.z, r: 75 }, { x: 100, z: 85, r: 36 }, { x: -95, z: -80, r: 26 }, { x: MBC.x, z: MBC.z, r: 32 }, { x: SO.x, z: SO.z, r: SO.r }, { x: TGM.x, z: TGM.z, r: TGM.r + 6 }, { x: DQ.x, z: DQ.z, r: 26 }];

// Khau Cốc Chà, the "14-tier" pass: 14 straight legs stacked up the south-west hillside, joined by hairpins
export const PASS = (() => {
  const S = new THREE.Vector2(-112, 140), a = new THREE.Vector2(-0.6, 0.8), p = new THREE.Vector2(0.8, 0.6), legs = 14, gap = 7, half = 18, pts = [];
  for (let i = 0; i < legs; i++) {
    const side = i % 2 ? -1 : 1, c = S.clone().addScaledVector(a, i * gap);
    const from = c.clone().addScaledVector(p, -side * half), to = c.clone().addScaledVector(p, side * half);
    if (i === 0) pts.push(from);
    for (let k = 1; k <= 8; k++) pts.push(from.clone().lerp(to, k / 8));
    if (i < legs - 1) { // a half circle up to the next leg
      const ctr = to.clone().addScaledVector(a, gap / 2);
      for (let k = 1; k < 8; k++) { const t = -Math.PI / 2 + (Math.PI * k) / 8; pts.push(ctr.clone().addScaledVector(a, (Math.sin(t) * gap) / 2).addScaledVector(p, (side * Math.cos(t) * gap) / 2)); }
    }
  }
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, len, total: len[len.length - 1], h0: 0, h1: 0 };
})();
// nearest point of the pass: distance to it and the road's height there (it climbs evenly from the valley to the top)
export function passAt(x, z) {
  if (x < -190 || x > -80 || z < 110 || z > 245) return null;
  if (!PASS.h1) { const P = PASS.pts; PASS.h0 = raw(P[0].x, P[0].y) + 0.3; PASS.h1 = raw(P[P.length - 1].x, P[P.length - 1].y) - 2; }
  let best = Infinity, s = 0;
  const P = PASS.pts;
  for (let i = 1; i < P.length; i++) {
    const ax = P[i - 1].x, az = P[i - 1].y, dx = P[i].x - ax, dz = P[i].y - az, l2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)), ex = ax + dx * t - x, ez = az + dz * t - z, d = ex * ex + ez * ez;
    if (d < best) { best = d; s = PASS.len[i - 1] + (PASS.len[i] - PASS.len[i - 1]) * t; }
  }
  return { d: Math.sqrt(best), h: lerp(PASS.h0, PASS.h1, s / PASS.total) };
}
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(ax + dx * t - x, az + dz * t - z); };
export const streamDist = (x, z) => { let d = Infinity; const S = PACBO.stream; for (let i = 1; i < S.length; i++) d = Math.min(d, segDist(x, z, S[i - 1], S[i])); return d; };

export const riverX = (z) => -5 + 18 * Math.sin((z + 100) * 0.016) * ss(-100, -40, z) + 10 * Math.sin(z * 0.007);
export const riverW = (z) => 20 + 6 * noise(z * 0.02, 3.3);
const polar = (x, z) => { const dx = x - FALLS.c.x, dz = z - FALLS.c.y; return { r: Math.hypot(dx, dz), th: Math.atan2(dx, -dz), dz }; };
// terraces: east bank only, between the falls' hills and the south
const eastW = (x, z) => ss(28, 50, x) * ss(142, 124, x) * ss(-75, -50, z) * ss(80, 55, z); // ends before Mẹ Bồng Con

function raw(x, z) {
  let h = 0.9 + fbm(x * 0.02, z * 0.02) * 1.1;
  const e = Math.hypot(x / 210, (z - 10) / 240);
  h += ss(0.72, 1.0, e) * (28 + fbm(x * 0.012 + 7, z * 0.012) * 45);
  const east = eastW(x, z);
  if (east > 0) {
    const t = Math.max(0, (x - 30) * 0.17 + (fbm(x * 0.04, z * 0.04) - 0.5) * 5), s = 1.3;
    h += east * (Math.floor(t / s) * s + ss(0.82, 1, (t / s) % 1) * s);
  }
  // Phja Oắc – Phja Đén: a high massif on the western edge
  h += 95 * Math.exp(-((Math.hypot(x - PHJA.x, z - PHJA.z) / 58) ** 2));
  // Thang Hen: a deep bowl among the peaks that the water fills
  const dl = Math.hypot((x - LAKE.x) / 38, (z - LAKE.z) / 26);
  if (dl < 2) h = lerp(h, -4.5, 1 - ss(0.75, 1.9, dl));
  const { r, th, dz } = polar(x, z);
  if (dz < 0) {
    const inArc = ss(FALLS.th + 0.14, FALLS.th, Math.abs(th));
    const isl = fbm(x * 0.05 + 3, z * 0.05) > 0.63 ? 2.6 : 0; // wooded islets in the river above the falls
    const tiers = ss(FALLS.r1 - 1, FALLS.r1 + 1, r) * (FALLS.y1 + fbm(x * 0.2, z * 0.2) * 1.2) +
      ss(FALLS.r2 - 1, FALLS.r2 + 1, r) * (FALLS.y2 - 1.5 - FALLS.y1 + isl);
    // the hills either side of the falls rise over ~35 m, not as a wall, and fade out before the village and fields
    const hills = ss(FALLS.th + 0.02, FALLS.th + 0.5, Math.abs(th)) * ss(-30, -80, z);
    h = Math.max(h, tiers * inArc + ss(FALLS.r1 - 34, FALLS.r1 + 12, r) * hills * (FALLS.y2 + 12 + fbm(x * 0.03, z * 0.03) * 16));
    const pool = ss(FALLS.r1 - 36, FALLS.r1 - 24, r) * (1 - ss(FALLS.r1 - 0.5, FALLS.r1 + 0.5, r)) * inArc;
    h = lerp(h, -2.5, pool);
    // the river arrives from the north, through the hills, onto the plateau
    if (r > FALLS.r2) h = lerp(h, Math.min(h, FALLS.y2 - 1.5), 1 - ss(14, 24, Math.abs(x - FALLS.c.x + 6 * Math.sin(z * 0.02))));
  }
  // the buckwheat slope is cut into narrow terraces
  const tg = Math.hypot(x - TGM.x, z - TGM.z);
  if (tg < TGM.r + 8) { const s = 1.8, q = Math.floor(h / s) * s + ss(0.8, 1, (h / s) % 1) * s; h = lerp(h, q, 1 - ss(TGM.r - 4, TGM.r + 8, tg)); }
  // Mẹ Bồng Con: a 20 m step in the eastern hills with a pool at its foot
  const mx = x - MBC.x, mz = z - MBC.z;
  if (Math.abs(mz) < 40 && mx > -30 && mx < 45) {
    const w = 1 - ss(18, 38, Math.abs(mz));
    h = lerp(h, Math.max(h, ss(-0.5, 1.5, mx) * (20 + fbm(x * 0.05, z * 0.05) * 2)), w);
    h = lerp(h, -3, (1 - ss(6, 11, Math.hypot(mx + 7, mz * 0.8))) * w);
  }
  // Pác Bó (last, so the hills round the falls don't fill it back in): a small flat valley under Karl Marx mountain, the Lênin stream running through it
  const db = Math.hypot(x - PACBO.x, z - PACBO.z);
  if (db < 42) { h = lerp(h, 2.6 + fbm(x * 0.08, z * 0.08) * 1.2, 1 - ss(20, 42, db)); h = lerp(h, -1.8, 1 - ss(2.6, 5.5, streamDist(x, z))); }
  return h;
}
function carve(x, z, h) {
  if (z > -112) {
    const d = Math.abs(x - riverX(z)), w = riverW(z) * 0.5;
    h = lerp(h, -2.2, 1 - ss(w, w + 5, d));
  }
  return h;
}
const padH = new Map();
export function height(x, z) {
  let h = raw(x, z);
  for (const p of PADS) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.r) { if (!padH.has(p)) padH.set(p, raw(p.x, p.z)); h = lerp(h, padH.get(p), 1 - ss(p.r * 0.6, p.r, d)); }
  }
  const road = passAt(x, z); // the pass cuts a shelf into the hillside
  if (road && road.d < 7) h = lerp(h, road.h, 1 - ss(2.6, 7, road.d));
  return carve(x, z, h);
}
export const riverDist = (x, z) => Math.abs(x - riverX(z)) - riverW(z) * 0.5;
export const inFalls = (x, z, pad = 0) => { const { r, th, dz } = polar(x, z); return dz < 0 && Math.abs(th) < FALLS.th + 0.2 && r > FALLS.r1 - 40 - pad && r < FALLS.r2 + 70 + pad; };
// weight of the flat rice fields on the valley floor (0 elsewhere)
function fieldW(x, z, h) {
  const e = Math.hypot(x / 210, (z - 10) / 240);
  return ss(0.7, 0.62, e) * (1 - eastW(x, z)) * ss(4.5, 3, h) * ss(0.2, 1, h) * ss(3, 8, riverDist(x, z)) * (inFalls(x, z, 10) ? 0 : 1) * (PADS.some((p) => Math.hypot(x - p.x, z - p.z) < p.r + 6) ? 0 : 1);
}

const C = (hex) => new THREE.Color(hex);
const PAL = {
  grass: C(0x7aa04a), forest: C(0x3c6a2c), forest2: C(0x58853a), rock: C(0x8f8f84), rock2: C(0x6f716a), sand: C(0xb9a57a),
  rice: C(0xbfa443), riceG: C(0x8aa84a), earth: C(0x8c7a55), riser: C(0x5e8a34), moss: C(0x5a8c3a), bed: C(0x3f5a44), tgm: C(0xe2a6c6), tgm2: C(0xbf8cb6),
};

// ---------- terrain ----------
export function createTerrain() {
  const seg = 260, geo = new THREE.PlaneGeometry(SIZE, SIZE, seg, seg).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, n = pos.count;
  const fw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = height(x, z);
    pos.setY(i, h); fw[i] = fieldW(x, z, h);
  }
  geo.computeVertexNormals();
  const nor = geo.attributes.normal, colors = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), up = nor.getY(i), v = noise(x * 0.15, z * 0.15);
    const e = Math.hypot(x / 210, (z - 10) / 240), east = eastW(x, z);
    c.copy(PAL.grass).lerp(PAL.forest2, v * 0.5);
    c.lerp(v > 0.5 ? PAL.forest : PAL.forest2, ss(0.66, 0.8, e));                    // wooded hills
    if (east > 0.5 && !inFalls(x, z)) { // terraces: the flats are rice (ripening), the risers grass
      const step = Math.floor(((x - 30) * 0.17 + (fbm(x * 0.04, z * 0.04) - 0.5) * 5) / 1.3);
      const rice = hash(step, Math.floor(z / 22)) > 0.35 ? PAL.rice : PAL.riceG;
      c.copy(up > 0.93 ? rice : PAL.riser);
      c.lerp(PAL.forest, ss(0.7, 0.85, e));
    }
    // among the houses: trodden earth and grass, not paddy
    if (x > VILLAGE.x0 - 4 && x < VILLAGE.x1 + 4 && z > VILLAGE.z0 - 4 && z < VILLAGE.z1 + 4) c.copy(PAL.grass).lerp(PAL.earth, ss(0.35, 0.75, noise(x * 0.12, z * 0.12)) * 0.8);
    if (inFalls(x, z)) c.copy(PAL.moss).lerp(PAL.forest, v);
    // tam giác mạch in flower: pink and violet drifts on the slope, green stems between
    const dt = Math.hypot(x - TGM.x, z - TGM.z);
    if (dt < TGM.r) { const n = noise(x * 0.15, z * 0.15); const fr = ((y % 1.8) + 1.8) % 1.8 / 1.8; c.copy(fr < 0.15 || fr > 0.9 ? (n > 0.5 ? PAL.tgm : n > 0.28 ? PAL.tgm2 : PAL.riceG) : PAL.riser).lerp(PAL.grass, ss(TGM.r * 0.8, TGM.r, dt)); } // flats in flower, grassy risers
    if (up < 0.62) c.lerp(v > 0.5 ? PAL.rock : PAL.rock2, ss(0.62, 0.4, up));     // cliffs show limestone
    if (y < 0.7 && y > -1.2 && riverDist(x, z) < 6) c.lerp(PAL.sand, 0.6);          // gravel banks
    if (y < WATER_Y) c.copy(PAL.sand).lerp(PAL.bed, ss(WATER_Y, WATER_Y - 1.6, y));  // the bed, seen through clear water
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('fieldW', new THREE.BufferAttribute(fw, 1));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, map: fieldsTexture() });
  // rice fields come from the map; everything else from vertex colours
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float fieldW; varying float vFieldW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFieldW = fieldW;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFieldW;')
      .replace('#include <map_fragment>', '')
      .replace('#include <color_fragment>', 'diffuseColor.rgb *= mix(vColor, texture2D(map, vMapUv).rgb, vFieldW);');
  };
  detail(mat, 'ground');
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

// A patchwork of paddies (ripe gold, still green, harvested stubble, a few flooded) with earth bunds between them.
function fieldsTexture() {
  const S = 2048, cv = Object.assign(document.createElement('canvas'), { width: S, height: S }), x = cv.getContext('2d');
  const k = S / SIZE, R = rng(7), a = 0.3, ca = Math.cos(a), sa = Math.sin(a);
  x.fillStyle = '#8aa845'; x.fillRect(0, 0, S, S);
  // ripe gold, turning, green, harvested stubble, flooded (mirrors the sky)
  const cols = [['#d2b040', '#b8962e'], ['#cdb34a', '#a99a38'], ['#b4b246', '#94993a'], ['#8fae42', '#6f9434'], ['#7ea23a', '#638a30'], ['#b39a64', '#98804e'], ['#9dbcb8', '#7fa29c']];
  const cw = 14, ch = 9, jit = (i, j) => [(hash(i, j) - 0.5) * 7, (hash(j + 99, i) - 0.5) * 5];
  const P = (i, j) => { const [jx, jy] = jit(i, j), u = i * cw + jx, v = j * ch + jy; return [(u * ca - v * sa + SIZE / 2) * k, (u * sa + v * ca + SIZE / 2) * k]; };
  x.lineJoin = 'round';
  const cells = [];
  for (let i = -29; i < 29; i++) for (let j = -44; j < 44; j++) cells.push([P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), hash(i * 7, j * 3), hash(j, i * 5)]);
  const quad = (a, b, c, d) => { x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.lineTo(...c); x.lineTo(...d); x.closePath(); };
  for (const [a, b, c, d, r, r2] of cells) {
    quad(a, b, c, d);
    const [c0, c1] = cols[Math.min(cols.length - 1, Math.floor((r * 0.85 + r2 * 0.15) * cols.length))];
    const g = x.createLinearGradient(a[0], a[1], c[0], c[1]); g.addColorStop(0, r2 > 0.5 ? c0 : c1); g.addColorStop(1, r2 > 0.5 ? c1 : c0);
    x.fillStyle = g; x.fill();
    if (r < 0.62) { // rows of rice plants
      x.save(); x.clip(); x.strokeStyle = 'rgba(70,80,25,.1)'; x.lineWidth = 1;
      for (let t = 0; t < 1; t += 0.1) { x.beginPath(); x.moveTo(a[0] + (d[0] - a[0]) * t, a[1] + (d[1] - a[1]) * t); x.lineTo(b[0] + (c[0] - b[0]) * t, b[1] + (c[1] - b[1]) * t); x.stroke(); }
      x.restore();
    }
  }
  // bunds: a shadowed earth ridge with grass on top
  for (const [w, st] of [[3, 'rgba(60,62,28,.35)'], [1.3, 'rgba(176,160,105,.7)']]) {
    x.strokeStyle = st; x.lineWidth = w;
    for (const [a, b, c, d] of cells) { quad(a, b, c, d); x.stroke(); }
  }
  // a few earth paths between the hamlets
  x.strokeStyle = 'rgba(190,165,115,.9)'; x.lineWidth = 4;
  for (let p = 0; p < 6; p++) { x.beginPath(); let px = R() * S, py = R() * S; x.moveTo(px, py); for (let s = 0; s < 12; s++) { px += (R() - 0.5) * 160; py += 60 + R() * 60; x.lineTo(px, py); } x.stroke(); }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// ---------- water: the river + pool, and the river on the plateau above the falls ----------
function waterNormals() {
  const S = 256, cv = Object.assign(document.createElement('canvas'), { width: S, height: S }), x = cv.getContext('2d'), img = x.createImageData(S, S);
  const W = [[3, 1, 0.3], [-2, 5, 1.1], [7, -3, 2.0], [1, 9, 0.7], [-11, 4, 2.6], [13, 7, 4.1]]; // integer frequencies → tiles seamlessly
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    let dx = 0, dy = 0;
    for (const [fx, fy, p] of W) { const a = ((i * fx + j * fy) / S) * Math.PI * 2 + p, amp = 1 / Math.hypot(fx, fy); dx += Math.cos(a) * fx * amp; dy += Math.cos(a) * fy * amp; }
    const l = Math.hypot(dx * 0.12, dy * 0.12, 1), o = (j * S + i) * 4;
    img.data[o] = (-dx * 0.12 / l * 0.5 + 0.5) * 255; img.data[o + 1] = (-dy * 0.12 / l * 0.5 + 0.5) * 255; img.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
export function createWater() {
  const nm = waterNormals();
  // depth under each sheet of water, baked once (4 m = 1): R under the river and pool, G under the plateau's river
  const S = 256, d = new Uint8Array(S * S * 4);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = -SIZE / 2 + ((i + 0.5) * SIZE) / S, z = -SIZE / 2 + ((j + 0.5) * SIZE) / S, h = height(x, z), o = (j * S + i) * 4;
    d[o] = Math.min(255, Math.max(0, ((WATER_Y - h) / 4) * 255)); d[o + 1] = Math.min(255, Math.max(0, ((UPPER_Y - h) / 4) * 255)); d[o + 3] = 255;
  }
  const depth = new THREE.DataTexture(d, S, S);
  depth.magFilter = depth.minFilter = THREE.LinearFilter; depth.needsUpdate = true;
  const time = { value: 0 };
  // jade where it's shallow and clear (you see the bed), dark green in the channel, foam where it laps the banks;
  // two scales of ripples so the tiling doesn't show
  const mk = (repeat, ch) => {
    const map = nm.clone(); map.repeat.set(repeat, repeat); map.needsUpdate = true;
    const m = new THREE.MeshStandardMaterial({ roughness: 0.05, metalness: 0, normalMap: map, normalScale: new THREE.Vector2(0.32, 0.32), transparent: true });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { depthTex: { value: depth }, cbNoise: { value: noiseTex }, time });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWW;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWW; uniform sampler2D depthTex, cbNoise; uniform float time;')
        .replace('#include <color_fragment>', `
          float wd = texture2D(depthTex, (vWW.xz + ${SIZE / 2}.0) / ${SIZE}.0).${ch};
          diffuseColor.rgb = mix(vec3(0.07, 0.34, 0.27), vec3(0.006, 0.06, 0.07), smoothstep(0.03, 0.75, wd));
          diffuseColor.a = mix(0.4, 0.95, smoothstep(0.0, 0.3, wd));
          float foam = smoothstep(0.07, 0.0, wd) * smoothstep(0.55, 0.8, texture2D(cbNoise, vWW.xz * 0.12 + vec2(time * 0.02, time * 0.013)).b + texture2D(cbNoise, vWW.xz * 0.05).g * 0.3);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.7, 0.75, 0.72), foam); diffuseColor.a = max(diffuseColor.a, foam);`)
        .replace('#include <normal_fragment_maps>', `
          vec3 wn1 = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
          vec3 wn2 = texture2D(normalMap, vNormalMapUv * 0.29 + vec2(0.31, 0.17) - vec2(time * 0.004, time * 0.009)).xyz * 2.0 - 1.0;
          normal = normalize(tbn * normalize(vec3((wn1.xy + wn2.xy) * normalScale, 1.0)));`);
    };
    m.customProgramCacheKey = () => 'water-' + ch;
    return m;
  };
  const lower = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE).rotateX(-Math.PI / 2), mk(46, 'r'));
  lower.position.y = WATER_Y;
  const upperGeo = new THREE.RingGeometry(FALLS.r2 - 1.4, 240, 64, 1, Math.PI / 2 - FALLS.th - 0.16, (FALLS.th + 0.16) * 2).rotateX(-Math.PI / 2);
  const upper = new THREE.Mesh(upperGeo, mk(20, 'g'));
  upper.position.set(FALLS.c.x, UPPER_Y, FALLS.c.y);
  lower.receiveShadow = upper.receiveShadow = true;
  const g = new THREE.Group(); g.add(lower, upper);
  return {
    group: g,
    tick(dt) {
      time.value += dt;
      lower.material.normalMap.offset.y += dt * 0.05; lower.material.normalMap.offset.x += dt * 0.004;
      upper.material.normalMap.offset.y -= dt * 0.06;
    },
  };
}

// ---------- karst: haystack peaks (4 shapes, instanced) and Mắt Thần ----------
function tint(geo, pick) {
  geo.computeVertexNormals();
  const p = geo.attributes.position, nr = geo.attributes.normal, a = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { pick(c, p.getX(i), p.getY(i), p.getZ(i), nr.getY(i)); a.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
const karstPaint = (c, x, y, z, up, s = 1) => {
  const v = noise(x * 3 * s + y * 2 * s, z * 3 * s);
  c.copy(v > 0.45 ? PAL.forest : PAL.forest2);
  if (up < 0.35 || v > 0.8) c.lerp(v > 0.6 ? PAL.rock : PAL.rock2, ss(0.35, 0.05, up) * 0.85 + (v > 0.8 ? 0.5 : 0));
};
function karstGeo(seed) {
  const R = rng(seed), prof = [], N = 16;
  for (let i = 0; i <= N; i++) { const t = i / N; prof.push(new THREE.Vector2(Math.max(0.001, (1 - t ** 2.6) ** 0.42 * (t < 0.12 ? 1.12 - t : 1)), t)); } // steep sides, a rounded crown
  let g = new THREE.LatheGeometry(prof, 30);
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g = mergeVertices(g);
  const p = g.attributes.position, lean = (R() - 0.5) * 0.5, ph = R() * 50;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x), d = 1 + (fbm(Math.cos(a) * 1.6 + ph, y * 3 + Math.sin(a) * 1.6) - 0.5) * 0.55 + (noise(a * 5 + ph, y * 9) - 0.5) * 0.12;
    x *= d; z *= d; x += lean * y * y;
    p.setXYZ(i, x, y * (1 + (noise(x * 4 + ph, z * 4) - 0.5) * 0.1), z);
  }
  return tint(g, (c, x, y, z, up) => karstPaint(c, x, y, z, up, 1));
}
export function createKarst() {
  const R = rng(21), shapes = [11, 12, 13, 14].map(karstGeo), picks = shapes.map(() => []);
  const mat = detail(new THREE.MeshStandardMaterial({ roughness: 0.92 }), 'rock');
  const peaks = [];
  const ax = Math.sin(MATTHAN_TURN), az = Math.cos(MATTHAN_TURN);
  const blocksEye = (x, z, r) => { const dx = x - MATTHAN.x, dz = z - MATTHAN.z, along = dx * ax + dz * az; return along > 0 && along < 240 && Math.abs(dx * az - dz * ax) < r + 34; };
  const ok = (x, z, r) => riverDist(x, z) > r + 8 && !inFalls(x, z, r) && Math.hypot(x - MATTHAN.x, z - MATTHAN.z) > r + 60 && !blocksEye(x, z, r) && CLEAR.every((c) => Math.hypot(x - c.x, z - c.z) > c.r + r * 0.3) &&
    !(x > VILLAGE.x0 - r - 12 && x < VILLAGE.x1 + r + 20 && z > VILLAGE.z0 - r - 10 && z < VILLAGE.z1 + r + 10) && peaks.every((p) => Math.hypot(p.x - x, p.z - z) > (p.r + r) * 0.8);
  // a few landmark peaks standing in the fields, then the ring round the valley
  const FEATURED = [[NGUOM.x, NGUOM.z, NGUOM.r, NGUOM.h], [MARX.x, MARX.z, MARX.r, MARX.h], [-52, 82, 16, 50], [-72, -28, 13, 42], [52, 128, 14, 46], [-68, 150, 17, 56], [-160, -60, 19, 62]];
  for (const [x, z, r, h] of FEATURED) if (ok(x, z, r)) peaks.push({ x, z, r, h });
  for (let tries = 0; tries < 3000 && peaks.length < 95; tries++) {
    const a = R() * Math.PI * 2, e = 0.55 + R() * 0.5, x = Math.sin(a) * 210 * e, z = 10 + Math.cos(a) * 240 * e;
    if (Math.abs(x) > 250 || Math.abs(z) > 250) continue;
    const r = 10 + R() * 14, h = r * (2.3 + R() * 1.5);
    if (ok(x, z, r)) peaks.push({ x, z, r, h });
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  peaks.forEach((p, i) => picks[i % 4].push(m.clone().compose(new THREE.Vector3(p.x, height(p.x, p.z) - 3, p.z), q.setFromAxisAngle(up, R() * 6.28).clone(), new THREE.Vector3(p.r, p.h, p.r))));
  // trees on the peaks' gentler slopes: real bumps on the skyline (vertices whose world normal points up enough)
  const treeSpots = [], wp = new THREE.Vector3(), wn = new THREE.Vector3(), sc = new THREE.Vector3();
  shapes.forEach((geo, k) => picks[k].forEach((mm) => {
    const pos = geo.attributes.position, nor = geo.attributes.normal;
    sc.setFromMatrixScale(mm);
    for (let n = 0, tries = 0; n < 16 && tries < 200; tries++) {
      const i = Math.floor(R() * pos.count);
      wn.set(nor.getX(i) / sc.x, nor.getY(i) / sc.y, nor.getZ(i) / sc.z).normalize();
      if (wn.y < 0.5 || pos.getY(i) < 0.08) continue;
      wp.fromBufferAttribute(pos, i).applyMatrix4(mm);
      treeSpots.push({ x: wp.x, z: wp.z, y: wp.y - 0.4, s: 1.4 + R() * 1.4 }); n++;
    }
  }));
  const g = new THREE.Group();
  shapes.forEach((geo, k) => {
    const im = new THREE.InstancedMesh(geo, mat, picks[k].length);
    picks[k].forEach((mm, i) => im.setMatrixAt(i, mm));
    im.castShadow = im.receiveShadow = true;
    im.computeBoundingSphere();
    g.add(im);
  });
  return { group: g, peaks, treeSpots };
}

// Mắt Thần (núi Thủng): a karst mountain with a round hole near the top that the sky shows through. Built as a
// rounded slab on a grid: thickest in the middle, thinning to the silhouette and round the hole, rock-rough all over.
export function createMatThan() {
  const W = 60, H = 86, D = 46, HOLE = { x: 4, y: 56, r: 17 }, st = 1.4;
  const top = (x) => { const u = Math.min(1, Math.abs(x) / W); return Math.sqrt(1 - u * u) ** 0.75 * H * (1 + (noise(x * 0.08, 2) - 0.5) * 0.2) * (1 - 0.12 * x / W); };
  const thick = (x, y) => {
    const e = Math.min(top(x) - y, Math.hypot(x - HOLE.x, y - HOLE.y) - HOLE.r, W - Math.abs(x));
    return e <= 0 ? 0 : D * ss(0, 16, e) ** 0.5;
  };
  const nx = Math.ceil((2 * W) / st), ny = Math.ceil((H + 8) / st), pos = [], idx = [], id = new Int32Array((nx + 1) * (ny + 1) * 2).fill(-1);
  const tk = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) tk.push(thick(-W + i * st, -8 + j * st));
  const T = (i, j) => tk[j * (nx + 1) + i];
  for (const side of [1, -1]) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    // only vertices touching solid rock
    let near = 0, sx = 0, sy = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a <= nx && b <= ny && T(a, b) > 0) { near++; sx += di; sy += dj; } }
    if (!near) continue;
    // a rim vertex (outside the rock) steps halfway toward the rock round it, which rounds off the grid's stair-steps
    const pull = T(i, j) > 0 ? 0 : 0.5 * st / Math.max(1, Math.hypot(sx, sy));
    const x = -W + i * st + sx * pull, y = -8 + j * st + sy * pull, z = side * T(i, j) / 2;
    // x/y wobble is shared by both faces and the depth wobble fades to 0 at the rim, so the faces meet without a seam
    const n = fbm(x * 0.07, y * 0.07) - 0.5, nz = fbm(x * 0.07 + side * 9, y * 0.07) - 0.5, m = noise(x * 0.3, y * 0.3 + side) - 0.5;
    id[(side > 0 ? 0 : 1) * (nx + 1) * (ny + 1) + j * (nx + 1) + i] = pos.length / 3;
    pos.push(x + n * 4, y + n * 3, z + side * (nz * 7 + m * 1.6) * Math.min(1, T(i, j) / 8));
  }
  for (const side of [0, 1]) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const o = side * (nx + 1) * (ny + 1), a = id[o + j * (nx + 1) + i], b = id[o + j * (nx + 1) + i + 1], c = id[o + (j + 1) * (nx + 1) + i], d = id[o + (j + 1) * (nx + 1) + i + 1];
    if (a < 0 || b < 0 || c < 0 || d < 0) continue;
    if (!(T(i, j) > 0 || T(i + 1, j) > 0 || T(i, j + 1) > 0 || T(i + 1, j + 1) > 0)) continue;
    if (side === 0) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  tint(g, (c, x, y, z, up) => karstPaint(c, x * 0.05, y * 0.05, z * 0.05, up + 0.12, 1));
  const mesh = new THREE.Mesh(g, detail(new THREE.MeshStandardMaterial({ roughness: 0.92, side: THREE.DoubleSide }), 'rock'));
  mesh.position.set(MATTHAN.x, height(MATTHAN.x, MATTHAN.z) - 4, MATTHAN.z);
  mesh.rotation.y = MATTHAN_TURN; // the hole faces the valley
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData.hole = new THREE.Vector3(HOLE.x, HOLE.y, 0);
  return mesh;
}

// ---------- trees: round-crowned broadleaf and bamboo clumps ----------
// crowns of three lumps, smooth-shaded and darker underneath; leafy detail comes from the canopy shader
// (the richer five-lump crown is only for trees you can fly up to: banks, village, the falls' ledge)
// [x, y, z, radius, detail]: far trees (hills, karst) are only ever seen small, so their side lumps are coarse (120 tris)
const LUMPS = [[[0, 1.9, 0, 1, 1], [0.6, 1.55, 0.25, 0.72, 0], [-0.5, 1.6, -0.3, 0.7, 0]],
  [[0, 2.0, 0, 0.8, 1], [0.65, 1.7, 0.2, 0.6, 1], [-0.6, 1.75, -0.25, 0.6, 1], [0.15, 2.6, -0.2, 0.55, 1], [-0.2, 1.5, 0.6, 0.55, 1]]];
function crownGeo(set) {
  const lumps = set.map(([x, y, z, r, dt]) => { const q = new THREE.IcosahedronGeometry(r, dt); q.deleteAttribute('uv'); return q.translate(x, y, z); });
  const g = mergeVertices(mergeGeometries(lumps)), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 1 + (noise(p.getX(i) * 2.3 + p.getZ(i), p.getY(i) * 2.3) - 0.5) * 0.28; p.setXYZ(i, p.getX(i) * k, 1.8 + (p.getY(i) - 1.8) * k, p.getZ(i) * k); }
  g.computeVertexNormals();
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const v = 0.4 + 0.6 * ss(0.9, 2.7, p.getY(i)); col.set([v, v, v], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
// density: 1 on desktops, less on phones
export function createTrees(extra = [], density = 1) {
  const R = rng(5), trunk = new THREE.CylinderGeometry(0.1, 0.18, 1.5, 5).translate(0, 0.75, 0);
  const spots = extra.filter(() => R() < density), want = spots.length + 2400 * density;
  for (let tries = 0; tries < 26000 * density && spots.length < want; tries++) {
    const x = (R() - 0.5) * SIZE * 0.96, z = (R() - 0.5) * SIZE * 0.96, h = height(x, z);
    const e = Math.hypot(x / 210, (z - 10) / 240), rd = riverDist(x, z);
    let p = 0;
    if (e > 0.7) p = 0.6;                                      // wooded hills
    if (rd > 1 && rd < 9 && h > 0.2) p = 0.55;                 // river banks
    if (inFalls(x, z) && h > FALLS.y1 - 1 && !(h > UPPER_Y - 1.2 && h < UPPER_Y + 0.3)) p = 0.75; // the ledge and islets
    if (x > VILLAGE.x0 - 8 && x < VILLAGE.x1 + 20 && z > VILLAGE.z0 - 10 && z < VILLAGE.z1 + 10) p = x > VILLAGE.x1 ? 0.5 : 0.05;
    if (h < 0.2 || (h > UPPER_Y - 1.4 && h < UPPER_Y + 0.4 && inFalls(x, z))) p = 0;
    if (Math.hypot(x - TGM.x, z - TGM.z) < TGM.r || Math.hypot(x - MBC.x + 14, z - MBC.z) < 20) p = 0; // the flower slope and the pool's approach stay open
    if ((passAt(x, z)?.d ?? 99) < 5 || Math.hypot(x - PACBO.x, z - PACBO.z) < 24 || PADS.some((q) => Math.hypot(x - q.x, z - q.z) < q.r)) p = 0; // off the road, the stream, the yards
    if (R() < p) spots.push({ x, z, y: h, s: 1.3 + R() * 1.6, rich: e <= 0.7 });
  }
  const g = new THREE.Group(), leafM = detail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 }), 'canopy');
  const tm = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9 }), spots.filter((sp) => sp.rich).length); // far trees' trunks never show
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  const greens = [0x3d6b2a, 0x4b7630, 0x35602a, 0x557d34, 0x5f7a30, 0x44692b, 0x6a7d34];
  const crowns = [0, 1].map((k) => { const list = spots.filter((sp) => !!sp.rich === !!k); return { list, im: new THREE.InstancedMesh(crownGeo(LUMPS[k]), leafM, list.length) }; });
  let n = 0;
  for (const [k, { list, im }] of crowns.entries()) {
    list.forEach((sp, i) => {
      m.compose(new THREE.Vector3(sp.x, sp.y - 0.2, sp.z), q.setFromAxisAngle(up, R() * 6.28), new THREE.Vector3(sp.s, sp.s * (0.85 + R() * 0.45), sp.s));
      im.setMatrixAt(i, m); if (k) tm.setMatrixAt(n++, m);
      im.setColorAt(i, c.setHex(sp.color ?? greens[Math.floor(R() * greens.length)]));
    });
    im.castShadow = im.receiveShadow = true;
    g.add(im);
  }
  tm.castShadow = true;
  g.add(tm);
  return g;
}
export function bambooClumps(spots) {
  const parts = [], R = rng(9);
  for (let i = 0; i < 14; i++) {
    const a = R() * 6.28, l = 0.3 + R() * 0.5, len = 6 + R() * 4;
    const c = new THREE.CylinderGeometry(0.04, 0.08, len, 4, 1, true).translate(0, len / 2, 0).rotateZ(0.12 + R() * 0.25).rotateY(a);
    c.translate(Math.cos(a) * l, 0, Math.sin(a) * l); parts.push(c);
    const leaf = new THREE.ConeGeometry(0.9, len * 0.55, 5).translate(0, len * 0.75, 0).rotateZ(0.15 + R() * 0.2).rotateY(a);
    leaf.translate(Math.cos(a) * l, 0, Math.sin(a) * l); parts.push(leaf);
  }
  const col = [];
  parts.forEach((p, i) => { p = parts[i] = p.toNonIndexed(); const n = p.attributes.position.count, cc = new THREE.Color(i % 2 ? 0x6c9a3a : 0x9aa656); for (let k = 0; k < n; k++) col.push(cc.r, cc.g, cc.b); p.deleteAttribute('uv'); });
  const geo = mergeAll(parts); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true, side: THREE.DoubleSide }), spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  spots.forEach((s, i) => im.setMatrixAt(i, m.compose(new THREE.Vector3(s.x, height(s.x, s.z) - 0.2, s.z), q.setFromAxisAngle(up, R() * 6.28), new THREE.Vector3(1, 1, 1).multiplyScalar(0.8 + R() * 0.5))));
  im.castShadow = true;
  return im;
}
function mergeAll(parts) {
  const pos = [], nor = [];
  for (const p of parts) { const g = p.index ? p.toNonIndexed() : p; g.computeVertexNormals(); pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

// ---------- the far ranges: two rings of karst silhouettes in the haze ----------
export function createRanges() {
  const g = new THREE.Group(), layers = [];
  [[760, 150, 31, 0.9], [900, 230, 32, 0.75]].forEach(([rad, hgt, seed, hk]) => {
    const R = rng(seed), W = 2048, Hc = 256, cv = Object.assign(document.createElement('canvas'), { width: W, height: Hc }), x = cv.getContext('2d');
    x.fillStyle = '#fff';
    for (let i = 0; i < 70; i++) {
      const cx = R() * W, w = 30 + R() * 70, h = Hc * (0.3 + R() * 0.6) * hk;
      x.beginPath(); x.moveTo(cx - w, Hc);
      x.bezierCurveTo(cx - w * 0.9, Hc - h * 0.9, cx - w * 0.45, Hc - h, cx, Hc - h);
      x.bezierCurveTo(cx + w * 0.45, Hc - h, cx + w * 0.9, Hc - h * 0.9, cx + w, Hc);
      x.fill();
      for (const o of [-W, W]) if (cx + o > -w && cx + o < W + w) { x.save(); x.translate(o, 0); x.beginPath(); x.moveTo(cx - w, Hc); x.bezierCurveTo(cx - w * 0.9, Hc - h * 0.9, cx - w * 0.45, Hc - h, cx, Hc - h); x.bezierCurveTo(cx + w * 0.45, Hc - h, cx + w * 0.9, Hc - h * 0.9, cx + w, Hc); x.fill(); x.restore(); }
    }
    const t = new THREE.CanvasTexture(cv);
    const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, fog: false, depthWrite: false, side: THREE.BackSide });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, hgt, 64, 1, true), mat);
    m.position.y = hgt / 2 - 30; m.renderOrder = -1;
    g.add(m); layers.push(mat);
  });
  return { group: g, layers };
}
