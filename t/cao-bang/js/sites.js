// The rest of Cao Bằng's well-known places, round the valley's rim: Trúc Lâm Bản Giốc pagoda on the hill by the falls,
// Ngườm Ngao cave in a karst tower, the stone village of Khuổi Ky, the Khau Cốc Chà pass, Pác Bó (the Lênin stream,
// Karl Marx mountain, Cốc Bó cave, the stone table), and Phja Oắc's pines above a sea of cloud.
// (Thang Hen lake and the Phong Nặm fields are shaped by the terrain itself, in land.js.)
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { height, PADS, PASS, passAt, LAKE, PACBO, PHJA, NGUOM, MARX, MBC, SO, TGM, DQ, riverX, riverW, WATER_Y } from './land.js';
import { houses, hipRoof, tileTex, stoneTex, tex, flat } from './village.js';
import { detail } from './detail.js';
import { rng, noise, fbm, ss } from './noise.js';

export const PAGODA = new THREE.Vector3(-95, 0, -80);
export const KHUOIKY = new THREE.Vector3(100, 0, 85);
PADS.push({ x: PAGODA.x, z: PAGODA.z, r: 16 }, { x: KHUOIKY.x, z: KHUOIKY.z, r: 24 }, { x: NGUOM.x, z: NGUOM.z + NGUOM.r + 9, r: 15 }); // the last: a forecourt before Ngườm Ngao
const KHUOI_HOUSES = [[91, 77, 0.3], [108, 75, 0.1], [98, 93, 0.25], [114, 91, -0.1], [85, 91, 0.4]];
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- Trúc Lâm Bản Giốc: a hall with a two-tier curled roof, a gate, a bell pavilion, on a stone terrace ----------
function pagoda() {
  const g = new THREE.Group(), gy = height(PAGODA.x, PAGODA.z);
  const wall = new THREE.MeshStandardMaterial({ color: 0xe0bd72, roughness: 0.8 }), col = new THREE.MeshStandardMaterial({ color: 0x7a2616, roughness: 0.6 });
  const roof = new THREE.MeshStandardMaterial({ map: tileTex(), color: 0xa89a90, roughness: 0.7, side: THREE.DoubleSide });
  const st = stoneTex(); st.repeat.set(4, 1);
  const stone = new THREE.MeshStandardMaterial({ map: st, roughness: 0.9 });
  const P = { wall: [], col: [], roof: [], stone: [] }, add = (k, geo) => P[k].push(flat(geo));
  add('stone', new THREE.BoxGeometry(26, 1.6, 20).translate(0, 0.2, 0));
  for (let i = 0; i < 5; i++) add('stone', new THREE.BoxGeometry(6, 0.3, 0.6).translate(0, 0.85 - i * 0.3, 10.3 + i * 0.6)); // steps
  // main hall
  add('wall', new THREE.BoxGeometry(12, 4, 8).translate(0, 3, -2));
  for (const x of [-6.6, -3.3, 0, 3.3, 6.6]) for (const z of [-6.6, 2.6]) add('col', new THREE.CylinderGeometry(0.22, 0.24, 4.6, 8).translate(x, 3.3, z));
  add('col', new THREE.BoxGeometry(2.2, 3, 0.1).translate(0, 2.5, 2.05)); // the doors
  add('roof', hipRoof(12, 8, 2.2, 1.6, 0.8).translate(0, 5.2, -2));
  add('wall', new THREE.BoxGeometry(7.4, 1.4, 4.8).translate(0, 7.2, -2));
  add('roof', hipRoof(7, 4.5, 2, 1.3, 0.7).translate(0, 7.9, -2));
  add('col', new THREE.BoxGeometry(3.6, 0.35, 0.3).translate(0, 9.95, -2)); // ridge
  // three-door gate
  add('wall', new THREE.BoxGeometry(6, 3, 1.6).translate(0, 2.5, 8));
  add('col', new THREE.BoxGeometry(1.6, 2.2, 1.7).translate(0, 2.1, 8));
  add('roof', hipRoof(6, 1.6, 1.3, 0.9, 0.45).translate(0, 4, 8));
  // bell pavilion
  for (const [x, z] of [[7, 3], [10, 3], [7, 6], [10, 6]]) add('col', new THREE.CylinderGeometry(0.14, 0.14, 3, 6).translate(x, 2.5, z));
  add('roof', hipRoof(3, 3, 1.5, 0.8, 0.5).translate(8.5, 4, 4.5));
  add('col', new THREE.SphereGeometry(0.55, 12, 8).scale(1, 1.3, 1).translate(8.5, 2.9, 4.5));
  for (const [k, m] of [['wall', wall], ['col', col], ['roof', roof], ['stone', stone]]) {
    const mesh = new THREE.Mesh(mergeGeometries(P[k]), m); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
  }
  g.position.set(PAGODA.x, gy, PAGODA.z);
  g.rotation.y = 0.6; // the gate looks south-east, down over the valley, the falls off to its left
  return g;
}

// ---------- a cave mouth: a rough arch of rock, darkness behind, stalactites hanging from the lip ----------
function cave(r, glow) {
  const g = new THREE.Group();
  let rim = new THREE.TorusGeometry(r, r * 0.45, 8, 28, Math.PI);
  rim.deleteAttribute('uv'); rim = mergeVertices(rim);
  const p = rim.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 1 + (noise(p.getX(i) * 0.9 + 5, p.getY(i) * 0.9) - 0.5) * 0.5; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * (1 + (k - 1) * 2)); }
  rim.computeVertexNormals();
  const rock = detail(new THREE.MeshStandardMaterial({ roughness: 0.92 }), 'rock');
  const rimM = new THREE.Mesh(rim, rock); rimM.castShadow = rimM.receiveShadow = true;
  const dark = new THREE.MeshBasicMaterial({ color: 0x060504, side: THREE.BackSide });
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 0.8, r * 4, 18, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).translate(0, 0, -r * 2), dark);
  const back = new THREE.Mesh(new THREE.CircleGeometry(r, 18, 0, Math.PI).translate(0, 0, -r * 3.9), new THREE.MeshBasicMaterial({ color: glow ?? 0x060504 }));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 4).rotateX(-Math.PI / 2).translate(0, 0.05, -r * 2), new THREE.MeshBasicMaterial({ color: 0x0c0a08 }));
  g.add(rimM, tunnel, back, floor);
  const cones = [];
  for (let i = 0; i < 9; i++) { const a = 0.35 + (i / 8) * (Math.PI - 0.7), l = r * (0.25 + ((i * 37) % 10) / 20); cones.push(flat(new THREE.ConeGeometry(r * 0.07, l, 5).rotateX(Math.PI).translate(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9 - l / 2, -r * 0.3))); }
  g.add(new THREE.Mesh(mergeGeometries(cones), new THREE.MeshStandardMaterial({ color: 0x8e8a7c, roughness: 0.8 })));
  return g;
}
function placeCave(c, x, z, y, face, g) {
  c.position.set(x, y, z); c.rotation.y = face; g.add(c);
  return c;
}

// ---------- Khau Cốc Chà: the road ribbon along the pass, asphalt with edge lines and a dashed centre ----------
function passRoad() {
  const t = tex(64, 256, (x) => {
    x.fillStyle = '#56565a'; x.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},.06)`; x.fillRect(Math.random() * 64, Math.random() * 256, 2, 2); }
    x.fillStyle = '#e8e6de'; x.fillRect(3, 0, 3, 256); x.fillRect(58, 0, 3, 256);
    x.fillStyle = '#e0c040'; x.fillRect(30.5, 0, 3, 150);
  }, true);
  const pos = [], uv = [], idx = [], P = PASS.pts;
  let n = 0;
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b.x - a.x, dz = b.y - a.y, l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l;
    const y = passAt(P[i].x, P[i].y).h + 0.2;
    for (const s of [-1, 1]) { pos.push(P[i].x + nx * 2.3 * s, y, P[i].y + nz * 2.3 * s); uv.push(s < 0 ? 0 : 1, PASS.len[i] / 7); }
    if (i) idx.push(n - 2, n - 1, n, n - 1, n + 1, n);
    n += 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.receiveShadow = true;
  return m;
}

// ---------- Phja Oắc: pines on the heights and a sea of cloud below them ----------
function phja(R, density) {
  const g = new THREE.Group();
  const cone = new THREE.ConeGeometry(1, 4.4, 7).translate(0, 3.4, 0), trunk = new THREE.CylinderGeometry(0.1, 0.14, 1.4, 5).translate(0, 0.7, 0);
  const spots = [];
  for (let tries = 0; tries < 4000 && spots.length < 320 * density; tries++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 56, x = PHJA.x + Math.cos(a) * d, z = PHJA.z + Math.sin(a) * d, y = height(x, z);
    if (y > 50 && Math.abs(x) < 258 && Math.abs(z) < 258) spots.push([x, y, z, 1 + R() * 0.8]);
  }
  const pm = new THREE.InstancedMesh(cone, detail(new THREE.MeshStandardMaterial({ color: 0x2f5a34, roughness: 0.9 }), 'canopy'), spots.length);
  const tm = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: 0x4a3a2a }), spots.length);
  const m = new THREE.Matrix4();
  spots.forEach(([x, y, z, s], i) => { m.makeScale(s, s * (0.9 + R() * 0.4), s).setPosition(x, y - 0.3, z); pm.setMatrixAt(i, m); tm.setMatrixAt(i, m); });
  pm.castShadow = true;
  g.add(pm, tm);
  // the cloud sea: soft fbm clouds, fading at the rim, two layers drifting opposite ways
  const S = 256, cv = Object.assign(document.createElement('canvas'), { width: S, height: S }), x = cv.getContext('2d'), img = x.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const u = i / S - 0.5, v = j / S - 0.5, o = (j * S + i) * 4, a = ss(0.42, 0.66, fbm(i * 0.035, j * 0.035, 5)) * (1 - ss(0.3, 0.5, Math.hypot(u, v)));
    img.data[o] = img.data[o + 1] = img.data[o + 2] = 255; img.data[o + 3] = a * 235;
  }
  x.putImageData(img, 0, 0);
  const ct = new THREE.CanvasTexture(cv), clouds = [], mats = [];
  for (const [y, r] of [[32, 90], [37, 76]]) {
    const mat = new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const c = new THREE.Mesh(new THREE.CircleGeometry(r, 48).rotateX(-Math.PI / 2), mat);
    c.position.set(PHJA.x - 12, y, PHJA.z); c.renderOrder = 4;
    g.add(c); clouds.push(c); mats.push(mat);
  }
  return { group: g, mats, tick(dt) { clouds[0].rotation.y += dt * 0.006; clouds[1].rotation.y -= dt * 0.004; } };
}

// ---------- Thác Mẹ Bồng Con: a mossy cliff, one broad strand (the mother) and a slim one beside it (the child) ----------
function meBongCon(waterMat) {
  const g = new THREE.Group(), U = 40, Vn = 14, pos = [], idx = [];
  for (let j = 0; j <= Vn; j++) for (let i = 0; i <= U; i++) {
    const u = i / U, v = j / Vn, z = MBC.z - 17 + u * 34, y = -2 + v * 23.5;
    pos.push(MBC.x - 0.6 - fbm(z * 0.25, y * 0.2) * 1.2 + ss(0.85, 1, v) * 4, y, z);
  }
  for (let j = 0; j < Vn; j++) for (let i = 0; i < U; i++) { const a = j * (U + 1) + i, b = a + 1, c = a + U + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setIndex(idx); cg.computeVertexNormals();
  const cliff = new THREE.Mesh(cg, detail(new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), 'cliff'));
  cliff.castShadow = cliff.receiveShadow = true; g.add(cliff);
  const sp = [], su = [], si = [];
  let base = 0;
  for (const [z0, z1, s] of [[MBC.z - 6, MBC.z + 2, 3.3], [MBC.z + 5, MBC.z + 7.2, 17.9]]) {
    const Us = 8, Vs = 14;
    for (let j = 0; j <= Vs; j++) for (let i = 0; i <= Us; i++) {
      const u = i / Us, v = j / Vs;
      sp.push(MBC.x - 2 - Math.sin(v * Math.PI * 0.5) ** 0.6 * 1.6, 20.6 - v * 21.4, z0 + (z1 - z0) * u); su.push(u + s, v);
    }
    for (let j = 0; j < Vs; j++) for (let i = 0; i < Us; i++) { const a = base + j * (Us + 1) + i, b = a + 1, c = a + Us + 1, d = c + 1; si.push(a, c, b, b, c, d); }
    base += (Us + 1) * (Vs + 1);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(su, 2)); sg.setIndex(si);
  const strands = new THREE.Mesh(sg, waterMat); strands.renderOrder = 2; g.add(strands);
  return g;
}

// ---------- boulders along the river banks and in its shallows ----------
function boulders(R, density) {
  const geo = new THREE.DodecahedronGeometry(1, 1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.8 + noise(p.getX(i) * 2 + 3, p.getY(i) * 2 + p.getZ(i)) * 0.4; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k); }
  geo.computeVertexNormals();
  const list = [];
  for (let tries = 0; tries < 2000 && list.length < 260 * density; tries++) {
    const z = -100 + R() * 350, side = R() < 0.5 ? -1 : 1, x = riverX(z) + side * (riverW(z) * 0.5 + (R() - 0.6) * 5), y = height(x, z);
    if (y > WATER_Y - 1.2 && y < 1.5) list.push([x, y, z, 0.4 + R() ** 2 * 1.6]);
  }
  const im = new THREE.InstancedMesh(geo, detail(new THREE.MeshStandardMaterial({ roughness: 0.85 }), 'rock'), list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  list.forEach(([x, y, z, s], i) => im.setMatrixAt(i, m.compose(V(x, y - s * 0.25, z), q.setFromEuler(e.set(R(), R() * 6, R())), V(s, s, s))));
  im.castShadow = im.receiveShadow = true;
  return im;
}

// ---------- flowering trees: white sở blossom on its hillside, yellow dã quỳ below Phja Oắc (become tree spots) ----------
function flowerSpots(R, density) {
  const out = [];
  for (let n = 0; n < 420 * density; n++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * SO.r, x = SO.x + Math.cos(a) * d, z = SO.z + Math.sin(a) * d;
    if (Math.abs(x) < 255 && Math.abs(z) < 255) out.push({ x, z, y: height(x, z), s: 0.9 + R() * 0.6, color: [0xf6f3ea, 0xf6f3ea, 0xdfe6cf, 0xe9ecdc, 0x4d7a32][Math.floor(R() * 5)], rich: false }); // blossom among dark leaves
  }
  for (let n = 0; n < 300 * density; n++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 30, x = DQ.x + Math.cos(a) * d, z = DQ.z + Math.sin(a) * d, y = height(x, z);
    if (y > 1 && y < 70) out.push({ x, z, y, s: 0.8 + R() * 0.5, color: R() < 0.85 ? 0xf0b81c : 0x5a8a30, rich: true });
  }
  return out;
}

export function createSites(density = 1, waterMat = null) {
  const R = rng(61), g = new THREE.Group();
  g.add(pagoda(), houses(KHUOI_HOUSES, true).group, passRoad());
  // Ngườm Ngao: a big mouth low on the karst tower's south face, a path of stepping stones up to it
  const ngY = height(NGUOM.x, NGUOM.z + NGUOM.r * 1.2);
  const ng = placeCave(cave(5.5, 0x3a2412), NGUOM.x, NGUOM.z + NGUOM.r * 1.08, ngY - 0.6, 0, g);
  const steps = [];
  for (let i = 1; i < 10; i++) { const z = NGUOM.z + NGUOM.r * 1.1 + i * 2.2, x = NGUOM.x + Math.sin(i) * 0.8; steps.push(flat(new THREE.BoxGeometry(1.4, 0.25, 0.9).translate(x, height(x, z) + 0.05, z))); }
  const stepM = new THREE.Mesh(mergeGeometries(steps), new THREE.MeshStandardMaterial({ color: 0x8a8678, roughness: 0.9 })); stepM.receiveShadow = true; g.add(stepM);
  // Pác Bó: Cốc Bó cave at Karl Marx mountain's foot, facing the stream; the stone table beside the water
  const cbX = MARX.x + MARX.r * 1.05, cbZ = MARX.z + 3;
  placeCave(cave(1.8), cbX, cbZ, height(cbX + 2, cbZ) - 0.2, Math.PI / 2, g);
  const rockM = detail(new THREE.MeshStandardMaterial({ roughness: 0.9 }), 'rock');
  const [tx, tz] = [PACBO.stream[1][0] + 3, PACBO.stream[1][1] - 2.5], ty = height(tx, tz);
  const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0).scale(1.2, 0.6, 1), rockM); boulder.position.set(tx, ty + 0.2, tz);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.9), rockM); slab.position.set(tx, ty + 0.72, tz); slab.rotation.y = 0.4;
  const seat = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 0).scale(1, 0.7, 1), rockM); seat.position.set(tx + 1.1, ty + 0.2, tz + 0.6);
  for (const m of [boulder, slab, seat]) { m.castShadow = m.receiveShadow = true; g.add(m); }
  const ph = phja(R, density); g.add(ph.group);
  if (waterMat) g.add(meBongCon(waterMat));
  g.add(boulders(R, density));
  const P = PASS.pts, mid = P[Math.floor(P.length / 2)];
  const V3 = (x, z, dy = 0) => V(x, height(x, z) + dy, z);
  return {
    group: g, cloudMats: ph.mats, treeSpots: flowerSpots(R, density),
    tick(t, dt) { ph.tick(dt); },
    spots: {
      pagoda: V3(PAGODA.x, PAGODA.z, 5), nguom: ng.position.clone().setY(ng.position.y + 4), khuoiky: V3(KHUOIKY.x, KHUOIKY.z, 3),
      pass: V(mid.x, passAt(mid.x, mid.y).h, mid.y), lake: V(LAKE.x, 0, LAKE.z), pacbo: V3(PACBO.stream[1][0], PACBO.stream[1][1], 1),
      phja: V3(PHJA.x + 6, PHJA.z, 0), mbc: V(MBC.x - 2, 10, MBC.z), so: V3(SO.x, SO.z, 2), tgm: V3(TGM.x, TGM.z, 1), dq: V3(DQ.x, DQ.z, 1),
    },
  };
}
