// The Tày village on the east bank: stilt houses on the terraces (plank walls, yin-yang tile hip roofs, a porch and
// a ladder), a bamboo water wheel lifting river water into a trough, the Phia Thắp incense yard, chestnut trees,
// and the yard where the then is sung at dusk round a fire.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { height, riverX, riverW, PADS, WATER_Y } from './land.js';
import { rng } from './noise.js';
import { makePerson, SKIN } from './figures.js';

export const THEN_AT = new THREE.Vector3(62, 0, 6);
export const INCENSE_AT = new THREE.Vector3(56, 0, -24);
PADS.push({ x: THEN_AT.x, z: THEN_AT.z, r: 12 }, { x: INCENSE_AT.x, z: INCENSE_AT.z, r: 9 });
const HOUSES = [[75, 6, 0], [71, -13, 0.15], [88, -27, -0.1], [92, -6, 0.1], [94, 17, -0.15], [76, 27, 0.2], [90, 38, 0], [107, 4, -0.05], [64, 42, 0.25], [106, -21, 0.1]];
const CHESTNUTS = [[50, 26], [45, 35], [56, 36], [44, -12], [101, 45], [111, 33], [113, -10]];
const INDIGO = 0x2c3a6a, DARK = 0x2e2e38;

const Y = new THREE.Vector3(0, 1, 0);
export const flat = (g) => (g.index ? g.toNonIndexed() : g);
export function beam(a, b, r, round = false) {
  const len = a.distanceTo(b), g = round ? new THREE.CylinderGeometry(r, r, len, 6) : new THREE.BoxGeometry(r, len, r);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, b.clone().sub(a).normalize()));
  const m = a.clone().add(b).multiplyScalar(0.5);
  return g.translate(m.x, m.y, m.z);
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
export function tex(w, h, draw, repeat = false) {
  const cv = Object.assign(document.createElement('canvas'), { width: w, height: h }), x = cv.getContext('2d');
  draw(x, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// wall atlas: left half is the front (door, two windows), right half a side (one window)
const WIN = [[30, 80], [176, 226]], WIN_V = [70, 140];
const wallTex = () => tex(512, 256, (x) => {
  for (let i = 0; i < 512; i += 16) { x.fillStyle = `hsl(28, ${38 + ((i * 7) % 10)}%, ${30 + ((i * 13) % 9)}%)`; x.fillRect(i, 0, 16, 256); x.fillStyle = 'rgba(20,10,4,.5)'; x.fillRect(i, 0, 1.5, 256); }
  x.fillStyle = '#2c1c10'; x.fillRect(0, 0, 512, 10); x.fillRect(0, 246, 512, 10);   // top and sill beams
  const win = (x0, x1) => { x.fillStyle = '#1a100a'; x.fillRect(x0, WIN_V[0], x1 - x0, WIN_V[1] - WIN_V[0]); x.fillStyle = '#6a4a2c'; for (let k = x0 + 8; k < x1; k += 10) x.fillRect(k, WIN_V[0], 3, WIN_V[1] - WIN_V[0]); x.strokeStyle = '#2c1c10'; x.lineWidth = 5; x.strokeRect(x0, WIN_V[0], x1 - x0, WIN_V[1] - WIN_V[0]); };
  WIN.forEach(([a, b]) => win(a, b)); win(359, 409); // the side's window, centred in the right half
  x.fillStyle = '#1e140c'; x.fillRect(98, 60, 60, 196); x.strokeStyle = '#3a2616'; x.lineWidth = 6; x.strokeRect(98, 60, 60, 196); // door
});
// âm dương tiles: concave and convex rows running down the slope, courses overlapping
export const tileTex = () => tex(128, 128, (x) => {
  x.fillStyle = '#4e4039'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 8; i++) { const g = x.createLinearGradient(i * 16, 0, i * 16 + 16, 0); const up = i % 2; g.addColorStop(0, up ? '#3a2e2a' : '#5e4c44'); g.addColorStop(0.5, up ? '#76625a' : '#4a3b35'); g.addColorStop(1, up ? '#3a2e2a' : '#5e4c44'); x.fillStyle = g; x.fillRect(i * 16, 0, 16, 128); }
  x.fillStyle = 'rgba(20,14,12,.55)'; for (let j = 0; j < 128; j += 21) x.fillRect(0, j, 128, 3);
}, true);

// curl lifts the four eave corners (a pagoda's upturned roof tips)
export function hipRoof(w, d, h, over, curl = 0) {
  const W = w / 2 + over, D = d / 2 + over, Wr = W - D * 0.85, t = 0.5; // uv: 2 m per tile repeat
  const pos = [], uv = [];
  const tri = (a, b, c, ua, ub, uc) => { pos.push(...a, ...b, ...c); uv.push(...ua, ...ub, ...uc); };
  const sl = Math.hypot(D, h);
  for (const s of [1, -1]) { // long sides
    const a = [-W, 0, s * D], b = [W, 0, s * D], c = [Wr, h, 0], e = [-Wr, h, 0];
    const uA = [-W * t, 0], uB = [W * t, 0], uC = [Wr * t, sl * t], uE = [-Wr * t, sl * t];
    if (s > 0) { tri(a, b, c, uA, uB, uC); tri(a, c, e, uA, uC, uE); } else { tri(b, a, e, uB, uA, uE); tri(b, e, c, uB, uE, uC); }
  }
  const sh = Math.hypot(W - Wr, h);
  for (const s of [1, -1]) { // hip ends
    const a = [s * W, 0, D], b = [s * W, 0, -D], c = [s * Wr, h, 0];
    if (s > 0) tri(b, c, a, [-D * t, 0], [0, sh * t], [D * t, 0]); else tri(a, c, b, [-D * t, 0], [0, sh * t], [D * t, 0]);
  }
  if (curl) for (let i = 0; i < pos.length; i += 3) if (pos[i + 1] === 0 && Math.abs(pos[i]) === W && Math.abs(pos[i + 2]) === D) pos[i + 1] = curl;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
// dry-laid stone: irregular grey blocks, dark joints
export const stoneTex = () => tex(256, 256, (x) => {
  x.fillStyle = '#3a3834'; x.fillRect(0, 0, 256, 256);
  let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < 256; y += 22) for (let xx = -(y % 44 ? 20 : 0); xx < 256; ) {
    const w = 26 + r() * 30, g = 110 + r() * 60 | 0;
    x.fillStyle = `rgb(${g},${g - 4},${g - 12})`; x.beginPath(); x.roundRect(xx + 2, y + 2, w - 4, 18, 6); x.fill();
    xx += w;
  }
}, true);
const uvRange = (g, u0, u1) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * (u1 - u0)); return g; };

// stone: Khuổi Ky's houses, the ground floor walled in stone and a stone fence round the yard
export function houses(list, stone = false) {
  const B = { wall: [], frame: [], roof: [], glow: [], stone: [] }, w = 10, d = 7, wallH = 2.6, P = 2.2;
  const doors = [];
  for (const [hx, hz, turn] of list) {
    const M = new THREE.Matrix4().makeRotationY(-Math.PI / 2 + turn).setPosition(hx, 0, hz), wp = new THREE.Vector3();
    const world = (lx, lz) => wp.set(lx, 0, lz).applyMatrix4(M);
    let top = -Infinity;
    for (const lx of [-w / 2, 0, w / 2]) for (const lz of [-d / 2, 0, d / 2 + 1.5]) { world(lx, lz); top = Math.max(top, height(wp.x, wp.z)); }
    const fy = top + P;
    const add = (bucket, g) => B[bucket].push(flat(g).applyMatrix4(M));
    // posts: to the ground under each one
    for (const lx of [-w / 2 + 0.3, -w / 6, w / 6, w / 2 - 0.3]) for (const lz of [-d / 2 + 0.3, 0, d / 2 - 0.3, d / 2 + 1.3]) {
      if (stone && lz < d / 2) continue; // the stone walls carry the house
      world(lx, lz); const g = height(wp.x, wp.z) - 0.4, tp = lz > d / 2 ? fy + 0.9 : fy + wallH;
      add('frame', new THREE.CylinderGeometry(0.14, 0.16, tp - g, 6).translate(lx, (g + tp) / 2, lz));
    }
    add('frame', new THREE.BoxGeometry(w + 0.8, 0.22, d + 1.9).translate(0, fy - 0.11, 0.75));                  // floor and porch
    if (stone) {
      const low = top - P - 1.2;
      add('stone', new THREE.BoxGeometry(w, fy - low, d).translate(0, (fy + low) / 2, 0));
      for (const [ax, az, bx, bz] of [[-w / 2 - 3, -d / 2 - 3, w / 2 + 3, -d / 2 - 3], [-w / 2 - 3, -d / 2 - 3, -w / 2 - 3, d / 2 + 5], [w / 2 + 3, -d / 2 - 3, w / 2 + 3, d / 2 + 5], [-w / 2 - 3, d / 2 + 5, -1.5, d / 2 + 5], [1.5, d / 2 + 5, w / 2 + 3, d / 2 + 5]]) {
        world((ax + bx) / 2, (az + bz) / 2); const gy = height(wp.x, wp.z);
        add('stone', new THREE.BoxGeometry(Math.abs(bx - ax) + 0.6, 1.1, Math.abs(bz - az) + 0.6).translate((ax + bx) / 2, gy + 0.3, (az + bz) / 2));
      }
    }
    add('frame', new THREE.BoxGeometry(w + 0.8, 0.1, 0.1).translate(0, fy + 0.85, d / 2 + 1.6));                // porch rail
    for (let k = -w / 2; k <= w / 2; k += 0.6) add('frame', new THREE.BoxGeometry(0.05, 0.85, 0.05).translate(k, fy + 0.42, d / 2 + 1.6));
    // walls from the atlas
    add('wall', uvRange(new THREE.PlaneGeometry(w, wallH), 0, 0.5).translate(0, fy + wallH / 2, d / 2));
    add('wall', uvRange(new THREE.PlaneGeometry(w, wallH), 0.5, 1).rotateY(Math.PI).translate(0, fy + wallH / 2, -d / 2));
    for (const s of [1, -1]) add('wall', uvRange(new THREE.PlaneGeometry(d, wallH), 0.5, 1).rotateY(s * Math.PI / 2).translate(s * w / 2, fy + wallH / 2, 0));
    // window glow (lit after dusk), matched to the atlas windows
    const wy = fy + (1 - (WIN_V[0] + WIN_V[1]) / 512) * wallH, wh = ((WIN_V[1] - WIN_V[0]) / 256) * wallH;
    for (const [a, b] of WIN) add('glow', new THREE.PlaneGeometry(((b - a) / 256) * w, wh).translate(((a + b) / 512 - 0.5) * w, wy, d / 2 + 0.03));
    add('glow', new THREE.PlaneGeometry((60 / 256) * w, (196 / 256) * wallH).translate((128 / 256 - 0.5) * w, fy + (98 / 256) * wallH, d / 2 + 0.02)); // open door
    add('roof', hipRoof(w, d, 3.1, 1.1).translate(0, fy + wallH, 0));
    // ladder down from the porch
    world(0, d / 2 + 1.5 + 2.2); const gl = height(wp.x, wp.z), run = Math.max(1, (fy - gl) * 0.65);
    for (const s of [-0.45, 0.45]) add('frame', beam(V(s, fy, d / 2 + 1.5), V(s, gl, d / 2 + 1.5 + run), 0.09));
    for (let k = 0.15; k < 1; k += 0.14) add('frame', new THREE.BoxGeometry(0.9, 0.05, 0.16).translate(0, fy + (gl - fy) * k, d / 2 + 1.5 + run * k));
    doors.push({ at: world(0, d / 2 + 1.5 + run + 1).clone().setY(gl), porch: V(0, fy + 1.4, d / 2 + 1).applyMatrix4(M), fy });
  }
  const g = new THREE.Group();
  const merge = (list, mat) => { const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  merge(B.wall, new THREE.MeshStandardMaterial({ map: wallTex(), roughness: 0.85 }));
  merge(B.frame, new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 0.8 }));
  merge(B.roof, new THREE.MeshStandardMaterial({ map: tileTex(), roughness: 0.75, side: THREE.DoubleSide }));
  if (B.stone.length) { const t = stoneTex(); t.repeat.set(3, 1.2); merge(B.stone, new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 })); }
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffa048, transparent: true, opacity: 0, depthWrite: false });
  const glow = merge(B.glow, glowMat); glow.castShadow = false; glow.renderOrder = 1;
  return { group: g, glowMat, doors };
}

// ---------- the water wheel (cọn nước) ----------
function waterWheel() {
  const z = -4, x = riverX(z) + riverW(z) * 0.5 - 3.2, r = 4.6, cy = WATER_Y + 3.9;
  const bam = new THREE.MeshStandardMaterial({ color: 0xb59a5c, roughness: 0.75 }), parts = [];
  for (const s of [-0.6, 0.6]) parts.push(flat(new THREE.TorusGeometry(r, 0.07, 5, 48).rotateY(Math.PI / 2).translate(s, 0, 0)));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
    for (const s of [-0.6, 0.6]) parts.push(flat(beam(V(s * 0.3, 0, 0), V(s, sn * r, c * r), 0.05, true)));
    parts.push(flat(new THREE.BoxGeometry(1.3, 0.04, 0.7).rotateX(-a).translate(0, sn * (r + 0.2), c * (r + 0.2))));              // paddle
    parts.push(flat(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 6).rotateX(Math.PI / 2 - 0.5).rotateX(-a).translate(0.75, sn * r, c * r))); // bamboo bucket
  }
  parts.push(flat(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 8).rotateZ(Math.PI / 2)));
  const wheel = new THREE.Mesh(mergeGeometries(parts), bam);
  wheel.castShadow = true;
  wheel.position.set(x, cy, z);
  const g = new THREE.Group(); g.add(wheel);
  const fixed = [];
  for (const s of [-1.3, 1.3]) for (const dz of [-1.2, 1.2]) fixed.push(flat(beam(V(x + s, WATER_Y - 1.5, z + dz), V(x + s * 0.9, cy, z), 0.1, true)));
  const x1 = x + 16, y1 = height(x1, z) + 0.8; // the trough carries the water to the first terrace
  fixed.push(flat(beam(V(x + 0.8, cy + r - 0.4, z), V(x1, y1, z), 0.2, true)));
  for (let k = 0.3; k < 1; k += 0.3) { const px = x + 0.8 + (x1 - x - 0.8) * k, py = cy + r - 0.4 + (y1 - cy - r + 0.4) * k; fixed.push(flat(beam(V(px, height(px, z) - 0.5, z), V(px, py, z), 0.07, true))); }
  const f = new THREE.Mesh(mergeGeometries(fixed), bam); f.castShadow = true; g.add(f);
  return { group: g, wheel, at: V(x, cy, z) };
}

// ---------- Phia Thắp incense: bundles fanned into circles to dry, and sheets of giấy bản on a rack ----------
function incense(R) {
  const parts = [], cols = [];
  const N = 44;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const hand = new THREE.BoxGeometry(0.02, 0.02, 0.45).translate(0, 0, 0.3).rotateX(-0.25).rotateY(a);
    const stick = new THREE.BoxGeometry(0.03, 0.03, 0.7).translate(0, 0, 0.85).rotateX(-0.25).rotateY(a);
    for (const [g, c] of [[hand, 0xd0203a], [stick, 0x7a4a2a]]) { const f = flat(g); parts.push(f); const cc = new THREE.Color(c); for (let k = 0; k < f.attributes.position.count; k++) cols.push(cc.r, cc.g, cc.b); }
  }
  const geo = mergeGeometries(parts.map((p) => { p.deleteAttribute('uv'); return p; }));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const spots = [];
  for (let i = 0; i < 18; i++) { const a = R() * Math.PI * 2, d = 1.5 + R() * 5.5; spots.push([INCENSE_AT.x + Math.cos(a) * d, INCENSE_AT.z + Math.sin(a) * d]); }
  const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  spots.forEach(([x, z], i) => im.setMatrixAt(i, m.compose(V(x, height(x, z) + 0.05, z), q.setFromAxisAngle(Y, R() * 6), V(1, 1, 1).multiplyScalar(1.3))));
  im.castShadow = true;
  const g = new THREE.Group(); g.add(im);
  const rack = [], rx = INCENSE_AT.x + 5, rz = INCENSE_AT.z - 6, gy = height(rx, rz);
  for (const dz of [-3, 3]) rack.push(flat(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 5).translate(rx, gy + 1.2, rz + dz)));
  rack.push(flat(beam(V(rx, gy + 2.3, rz - 3), V(rx, gy + 2.3, rz + 3), 0.05, true)));
  g.add(new THREE.Mesh(mergeGeometries(rack), new THREE.MeshStandardMaterial({ color: 0xb59a5c })));
  const paper = new THREE.MeshStandardMaterial({ color: 0xf0e8d4, roughness: 0.9, side: THREE.DoubleSide });
  for (let k = -2.5; k <= 2.5; k += 0.72) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.9), paper); s.position.set(rx, gy + 1.8, rz + k); s.rotation.y = Math.PI / 2 + (R() - 0.5) * 0.2; s.castShadow = true; g.add(s); }
  const w = makePerson({ girl: true, top: INDIGO, bottom: DARK, hair: 'khan', khan: INDIGO, skin: SKIN[2], outfit: 'aobaba' });
  w.sit(false); w.pose('L', -0.9, 0.1, -0.6); w.pose('R', -0.9, -0.1, -0.6);
  w.g.position.set(INCENSE_AT.x - 1, height(INCENSE_AT.x - 1, INCENSE_AT.z + 1) + w.g.position.y, INCENSE_AT.z + 1); w.g.rotation.y = 0.8;
  g.add(w.g);
  return g;
}

// ---------- chestnut trees (Trùng Khánh), heavy with spiky burrs ----------
function chestnuts(R) {
  const g = new THREE.Group();
  const crown = new THREE.IcosahedronGeometry(1, 2), cp = crown.attributes.position;
  for (let i = 0; i < cp.count; i++) { const k = 0.85 + ((Math.sin(i * 12.9898) * 43758.5) % 1 + 1) % 1 * 0.3; cp.setXYZ(i, cp.getX(i) * k, cp.getY(i) * k * 0.8, cp.getZ(i) * k); }
  crown.computeVertexNormals();
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x4e3b2c, roughness: 0.9 }), leafM = new THREE.MeshStandardMaterial({ color: 0x48742e, roughness: 0.85, flatShading: true });
  const burrs = [], bq = new THREE.Matrix4();
  for (const [x, z] of CHESTNUTS) {
    const y = height(x, z), s = 4.2 + R() * 1.4;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, s * 0.9, 7).translate(0, s * 0.45, 0), trunkM);
    const c = new THREE.Mesh(crown, leafM); c.scale.set(s, s, s); c.position.y = s * 1.2;
    const tree = new THREE.Group(); tree.add(t, c); tree.position.set(x, y - 0.2, z);
    t.castShadow = c.castShadow = true; c.receiveShadow = true;
    g.add(tree);
    for (let k = 0; k < 40; k++) { // burrs sit on the crown's surface
      const v = new THREE.Vector3(R() - 0.5, R() * 0.9 - 0.3, R() - 0.5).normalize();
      burrs.push(bq.clone().makeTranslation(x + v.x * s * 0.98, y - 0.2 + s * 1.2 + v.y * s * 0.8, z + v.z * s * 0.98));
    }
  }
  const burr = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.2, 0), new THREE.MeshStandardMaterial({ color: 0xb8c24a, roughness: 0.7, flatShading: true }), burrs.length);
  burrs.forEach((m, i) => burr.setMatrixAt(i, m));
  g.add(burr);
  return { group: g, at: V(CHESTNUTS[0][0], height(...CHESTNUTS[0]) + 5, CHESTNUTS[0][1]) };
}

// ---------- the then yard: a mat, a fire, the singer with her đàn tính, two with bell chains, the neighbours ----------
function thenYard(R) {
  const g = new THREE.Group(), gy = height(THEN_AT.x, THEN_AT.z);
  const fire = V(THEN_AT.x - 2, gy, THEN_AT.z);
  const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.22, 0), new THREE.MeshStandardMaterial({ color: 0x77736a, roughness: 0.9, flatShading: true }), 12);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; stones.setMatrixAt(i, m.makeTranslation(fire.x + Math.cos(a) * 0.75, gy + 0.08, fire.z + Math.sin(a) * 0.75)); }
  g.add(stones);
  const logM = new THREE.MeshStandardMaterial({ color: 0x3a2618 });
  for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.1, 5), logM); l.position.set(fire.x, gy + 0.2, fire.z); l.rotation.set(1.2, (i / 4) * Math.PI * 2, 0); g.add(l); }
  const flameM = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const flames = [0, 1, 2].map((i) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.28 - i * 0.06, 0.9 + i * 0.3, 7, 1, true), flameM); f.position.set(fire.x + (i - 1) * 0.12, gy + 0.6, fire.z); g.add(f); return f; });
  const light = new THREE.PointLight(0xff9a48, 0, 26, 1.4); light.position.set(fire.x, gy + 2.6, fire.z); g.add(light);

  const mat = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xb8964e, roughness: 0.95 }));
  mat.position.set(THEN_AT.x + 1.6, gy + 0.03, THEN_AT.z); mat.receiveShadow = true; g.add(mat);
  const face = (p, target) => Math.atan2(target.x - p.x, target.z - p.z);
  const place = (p, x, z, look) => { p.g.position.set(x, height(x, z) + p.g.position.y, z); p.g.rotation.y = face(p.g.position, look); g.add(p.g); return p; };

  // the singer (then): indigo gown, red sash, the đàn tính (a gourd body on a long neck) across her lap
  const singer = makePerson({ girl: true, outfit: 'robe', top: INDIGO, sash: 0xb8282a, hair: 'khan', khan: 0x2a1f3a, skin: SKIN[1] });
  singer.sit(true);
  const dan = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0xa8743a, roughness: 0.5 });
  const gourd = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12).scale(1, 1, 0.6), wood);
  const board = new THREE.Mesh(new THREE.CircleGeometry(0.15, 18), new THREE.MeshStandardMaterial({ color: 0xe0c38a })); board.position.z = 0.1;
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.0, 0.03).translate(0, 0.62, 0.06), new THREE.MeshStandardMaterial({ color: 0x3a2214 }));
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.05).translate(0, 1.16, 0.04), neck.material);
  dan.add(gourd, board, neck, head);
  dan.position.set(0.2, singer.B.hip + 0.15, 0.24); dan.rotation.set(0.15, 0, 0.95);
  singer.g.add(dan);
  singer.holding = true;
  singer.pose('L', -1.15, 0.55, -1.05); singer.pose('R', -0.55, 0.15, -1.25);
  place(singer, THEN_AT.x + 1.6, THEN_AT.z, fire);

  const bells = [];
  for (const dz of [-1.5, 1.5]) { // xóc nhạc: a ring of small bells on a string, shaken in time
    const p = makePerson({ girl: true, outfit: 'robe', top: INDIGO, hair: 'khan', khan: INDIGO, skin: SKIN[0] });
    p.sit(true); p.holding = true; p.pose('R', -1.2, -0.2, -0.6);
    const b = new THREE.Group();
    for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: 0xe8c050, metalness: 0.9, roughness: 0.3 })); s.position.set(Math.cos(i) * 0.06, -0.05 - i * 0.03, Math.sin(i) * 0.06); b.add(s); }
    b.position.copy(p.arms[1].hand); p.arms[1].el.add(b);
    place(p, THEN_AT.x + 1.4, THEN_AT.z + dz, fire);
    bells.push(p);
  }
  const audience = [];
  for (let i = 0; i < 7; i++) { // neighbours on the far side of the fire
    const a = Math.PI * (0.62 + (i / 6) * 0.76), r = 3.4 + (i % 2) * 0.6, kid = i % 3 === 2, elder = i === 3;
    const p = makePerson({ age: kid ? 'kid' : 'adult', girl: R() < 0.6, elder, top: [INDIGO, DARK, 0x2a3a5a, 0x3a2a4a][i % 4], bottom: DARK, hair: elder ? 'khan' : kid ? 'short' : R() < 0.5 ? 'khan' : 'bun', khan: [INDIGO, 0x4a2a5a, 0x2a4a6a][i % 3], skin: SKIN[i % 3], outfit: 'aobaba' });
    p.sit(true);
    place(p, fire.x + Math.cos(a) * r, fire.z + Math.sin(a) * r, fire);
    audience.push(p);
  }
  // lamps on bamboo poles round the yard
  const lamps = [], lampM = new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.15 });
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (-0.45 + (i / 5) * 0.9), x = THEN_AT.x + 2 + Math.cos(a) * 7, z = THEN_AT.z + Math.sin(a) * 8, y = height(x, z); // behind the singer
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3, 5).translate(0, 1.5, 0), new THREE.MeshStandardMaterial({ color: 0xb59a5c }));
    pole.position.set(x, y, z); g.add(pole);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8).scale(1, 1.25, 1), lampM); l.position.set(x, y + 3.1, z); g.add(l); lamps.push(l);
  }
  return {
    group: g, fire, light, lampM, singer,
    tick(t, tod) {
      flames.forEach((f, i) => { f.scale.set(1, 0.85 + Math.sin(t * 9 + i * 2) * 0.12 + Math.sin(t * 23 + i) * 0.06, 1); f.rotation.y = t * (1 + i); });
      flameM.opacity = 0.55 + tod * 0.45;
      light.intensity = (4 + tod * 26) * (0.9 + Math.sin(t * 13) * 0.06 + Math.sin(t * 7.3) * 0.05);
      lampM.opacity = 0.15 + tod * 0.85;
      const play = tod > 0.5;
      singer.arms[1].el.rotation.x = -1.25 + (play ? Math.sin(t * 9) * 0.12 : 0);
      bells.forEach((p, i) => (p.arms[1].el.rotation.x = -0.6 + (play ? Math.sin(t * 6 + i * 1.3) * 0.25 : 0)));
      audience.forEach((p, i) => (p.body.rotation.y = Math.sin(t * 0.6 + i) * 0.05));
    },
  };
}

// people at work in the fields below
function farmers(R) {
  const g = new THREE.Group();
  for (const [x, z] of [[-30, 30], [-62, 58], [36, 96], [-24, -52]]) {
    const p = makePerson({ top: [INDIGO, 0x4a5a6a, 0x6a3a2a][Math.floor(R() * 3)], bottom: DARK, hat: 'non', hair: 'short', skin: SKIN[2] });
    p.body.rotation.x = 0.6; p.pose('L', -1.3, 0.1, 0); p.pose('R', -1.3, -0.1, 0);
    p.g.position.set(x, height(x, z), z); p.g.rotation.y = R() * 6;
    g.add(p.g);
  }
  return g;
}

export function createVillage() {
  const R = rng(17), g = new THREE.Group();
  const h = houses(HOUSES), wheel = waterWheel(), ch = chestnuts(R), yard = thenYard(R);
  g.add(h.group, wheel.group, incense(R), ch.group, yard.group, farmers(R));
  return {
    group: g, yard,
    spots: {
      house: h.doors[3].porch, wheel: wheel.at, incense: INCENSE_AT.clone().setY(height(INCENSE_AT.x, INCENSE_AT.z) + 0.5),
      chestnut: ch.at, then: V(THEN_AT.x, height(THEN_AT.x, THEN_AT.z) + 1, THEN_AT.z),
    },
    bamboo: [[46, -32], [50, 44], [60, -40], [100, 50], [84, -40], [44, 10], [30, 60], [26, -60], [-34, -8], [-40, 44], [12, 130]].map(([x, z]) => ({ x, z })),
    tick(t, dt, tod) {
      wheel.wheel.rotation.x -= dt * 0.35;
      h.glowMat.opacity = tod * 0.95;
      yard.tick(t, tod);
    },
  };
}
