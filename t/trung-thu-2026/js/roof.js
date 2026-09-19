// Act 2: sân thượng, the flat roof of the family's tube house, where Hanoi families set the moon-watching tray.
// A tiled terrace with a low parapet and iron railing, the stairwell hut (lit door, water tank on top), potted
// bougainvillea, a string of bulbs; the family on a woven mat around a low table; neighbours' rooftops all round
// with their own lanterns, lit windows and tanks, the city beyond. The tray's items appear as the viewer sets them.
import * as THREE from 'three';
import { bucket, box, tileRoof } from './arch.js';
import { terracotta, bakeGlow, withGlow, repeatMaps } from './tex.js';
import { canvasTex, glowTex } from './print.js';
import { rng, buildBucket, tint } from './street.js';
import { lanternField, pickColor } from './lanterns.js';
import { makePerson, makeKid } from './figures.js';

export const TABLE_TOP = 0.34;
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const PALETTE = [[1.05, 0.9, 0.55], [1, 0.98, 0.92], [0.82, 0.95, 0.78], [1.05, 0.83, 0.78], [0.84, 0.86, 0.88]].map((c) => new THREE.Color(...c));

function matTex() { // chiếu cói: woven sedge with red and green bands
  return canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#d8c08a'; x.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) { x.fillStyle = y % 8 ? 'rgba(120,90,40,.18)' : 'rgba(255,240,200,.2)'; x.fillRect(0, y, w, 2); }
    for (const [y, c] of [[40, '#b3141f'], [60, '#2a6a3a'], [452, '#2a6a3a'], [472, '#b3141f']]) { x.fillStyle = c; x.fillRect(0, y, w, 12); }
    x.strokeStyle = '#b3141f'; x.lineWidth = 6;
    for (let i = 0; i < 6; i++) { const cx = 90 + i * 66; x.beginPath(); x.moveTo(cx, 230); x.lineTo(cx + 22, 256); x.lineTo(cx, 282); x.lineTo(cx - 22, 256); x.closePath(); x.stroke(); }
  });
}
function windowsTex() { // far city blocks: a grid of windows, some lit
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#1a1c2a'; x.fillRect(0, 0, w, h);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 8; i++) {
      const on = Math.random() < 0.35;
      x.fillStyle = on ? ['#ffcf88', '#ffe6b0', '#f2a860', '#cfe0ff'][Math.floor(Math.random() * 4)] : '#11131c';
      x.fillRect(i * 32 + 8, j * 16 + 4, 16, 8);
    }
  });
}

// ---------- tray items ----------
function plate(r = 0.13) {
  const g = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.7, 0.02, 32), std(0xf6f2ea, { roughness: 0.25 }));
  g.position.y = 0.01; g.castShadow = g.receiveShadow = true;
  return g;
}
function fruitPlate() {
  const g = new THREE.Group();
  g.add(plate(0.15));
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16).scale(1, 0.95, 1), std(0xb8c040, { roughness: 0.5 }));
  pom.position.y = 0.09;
  const na = (x, z) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.036, 1), std(0x8ab04a, { flatShading: true, roughness: 0.7 })); m.position.set(x, 0.05, z); return m; };
  const hong = (x, z) => {
    const f = new THREE.Group(); f.position.set(x, 0.045, z);
    f.add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12).scale(1, 0.75, 1), std(0xf07a1a, { roughness: 0.35 })));
    const sep = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.01, 4), std(0x3a5a1a)); sep.position.y = 0.027; f.add(sep);
    return f;
  };
  const cam = (x, z, c = 0xf09a1a) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), std(c, { roughness: 0.55 })); m.position.set(x, 0.045, z); return m; };
  const luu = (x, z) => {
    const f = new THREE.Group(); f.position.set(x, 0.045, z);
    f.add(new THREE.Mesh(new THREE.SphereGeometry(0.033, 14, 10), std(0xc8202a, { roughness: 0.4 })));
    const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.015, 6), std(0x9a1a1a)); cr.position.y = 0.035; f.add(cr);
    return f;
  };
  const banana = new THREE.Group();
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.013, 6, 12, 1.4), std(0xf2d24a, { roughness: 0.5 })); b.rotation.set(Math.PI / 2 - 0.3, 0, -0.7 + i * 0.06); b.position.set(-0.02 + i * 0.012, 0.03 + i * 0.004, 0.02); banana.add(b); }
  banana.position.set(0.02, 0.0, -0.1);
  g.add(pom, na(-0.08, 0.05), na(0.09, -0.02), hong(0.08, 0.07), hong(-0.09, -0.06), cam(0.02, 0.1), cam(-0.03, -0.1, 0xf2b01a), luu(0.1, 0.02 - 0.08), banana);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}
function cakePlate() {
  const g = new THREE.Group();
  g.add(plate(0.13));
  const bump = canvasTex(128, 128, (x, w) => { x.fillStyle = '#888'; x.fillRect(0, 0, w, w); x.strokeStyle = '#fff'; x.lineWidth = 4; x.beginPath(); x.arc(64, 64, 54, 0, 7); x.stroke(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; x.beginPath(); x.ellipse(64 + Math.cos(a) * 26, 64 + Math.sin(a) * 26, 12, 5, a, 0, 7); x.stroke(); } });
  const baked = std(0xb8702a, { roughness: 0.35, bumpMap: bump, bumpScale: 5 }), side = std(0xa8621e, { roughness: 0.45 });
  const deo = std(0xf7f3ea, { roughness: 0.75, bumpMap: bump, bumpScale: 3 });
  const geo = new THREE.CylinderGeometry(0.05, 0.052, 0.035, 28);
  const c1 = new THREE.Mesh(geo, [side, baked, side]); c1.position.set(-0.045, 0.037, 0.01);
  const c2 = new THREE.Mesh(geo, [deo, deo, deo]); c2.position.set(0.055, 0.037, -0.02);
  const c3 = new THREE.Mesh(geo, [side, baked, side]); c3.position.set(0.02, 0.07, 0.03); c3.rotation.z = 0.15;
  g.add(c1, c2, c3);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  g.userData.cakes = [c1, c2, c3];
  return g;
}
function pigCakes() { // bánh dẻo con lợn and a golden carp cake, for the little ones
  const g = new THREE.Group();
  g.add(plate(0.1));
  const white = std(0xf8f4ea, { roughness: 0.7 }), pink = std(0xf2a0a8, { roughness: 0.7 });
  const pig = new THREE.Group();
  pig.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12).scale(1.2, 0.8, 1), white));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 10), white); head.position.set(0.045, 0.012, 0); pig.add(head);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.011, 0.012, 10).rotateZ(Math.PI / 2), pink); snout.position.set(0.07, 0.008, 0); pig.add(snout);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.016, 4), pink); e.position.set(0.045, 0.036, s * 0.013); pig.add(e); }
  pig.position.set(-0.025, 0.04, 0.02);
  const fish = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10).scale(1.7, 0.6, 0.8), std(0xc0782a, { roughness: 0.4 }));
  fish.position.set(0.035, 0.035, -0.04); fish.rotation.y = 0.6;
  g.add(pig, fish);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}
function teaSet() {
  const g = new THREE.Group();
  const clay = std(0x6a2a1a, { roughness: 0.4 });
  const pot = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.04, 0.005], [0.05, 0.03], [0.045, 0.055], [0.022, 0.065], [0.024, 0.07], [0.001, 0.075]].map(([a, b]) => new THREE.Vector2(a, b)), 20), clay);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.05, 8).rotateZ(-0.9).translate(0.06, 0.04, 0), clay);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 6, 12, Math.PI * 1.2).rotateZ(Math.PI / 2 - 0.2).translate(-0.052, 0.035, 0), clay);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6).translate(0, 0.079, 0), clay);
  g.add(pot, spout, handle, knob);
  for (let i = 0; i < 3; i++) { const a = -0.6 + i * 0.6; const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.013, 0.025, 14, 1, true), std(0xf6f2ea, { roughness: 0.3, side: THREE.DoubleSide })); cup.position.set(Math.cos(a) * 0.1 + 0.03, 0.0125, Math.sin(a) * 0.1 + 0.02); g.add(cup); }
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}
// Ông tiến sĩ giấy: red paper robe with gold bands, the winged hat of a laureate, a scroll in hand, on a little stand.
function tienSi() {
  const g = new THREE.Group();
  const red = std(0xc8161e, { roughness: 0.55 }), gold = std(0xf2c24a, { roughness: 0.4, metalness: 0.3 }), black = std(0x141414, { roughness: 0.5 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.08), std(0x2a6a3a)); base.position.y = 0.015;
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.055, 0.15, 12), red); robe.position.y = 0.105;
  const band = (y, r) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.012, 12, 1, true), gold); b.position.y = y; return b; };
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.024, 14, 12), std(0xf7dcc0, { roughness: 0.6 })); face.position.y = 0.205;
  const faceTex = canvasTex(128, 64, (x) => { x.fillStyle = '#f7dcc0'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#222'; x.fillRect(22, 26, 8, 3); x.fillRect(38, 26, 8, 3); x.fillStyle = '#c83a3a'; x.fillRect(29, 40, 10, 3); x.fillStyle = 'rgba(230,120,120,.5)'; x.beginPath(); x.arc(20, 36, 5, 0, 7); x.arc(48, 36, 5, 0, 7); x.fill(); });
  face.material = std(0xffffff, { map: faceTex, roughness: 0.6 });
  face.rotation.y = -Math.PI / 2 - 0.35;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.03, 12), black); hat.position.y = 0.232;
  const wings = [-1, 1].map((s) => { const w = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 6).scale(1.4, 0.35, 0.2), black); w.position.set(s * 0.045, 0.232, -0.01); w.rotation.z = s * 0.2; return w; });
  const arms = [-1, 1].map((s) => { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.07, 8), red); a.position.set(s * 0.035, 0.14, 0.02); a.rotation.x = -0.9; return a; });
  const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 8).rotateZ(Math.PI / 2), gold); scroll.position.set(0, 0.13, 0.05);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.035).translate(0.025, 0, 0), std(0xffd24a, { side: THREE.DoubleSide, emissive: 0x442200 })); flag.position.set(0.02, 0.27, -0.02);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.13, 4), std(0x8a5a2a)); pole.position.set(0.02, 0.23, -0.02);
  g.add(base, robe, band(0.07, 0.049), band(0.12, 0.04), face, hat, ...wings, ...arms, scroll, flag, pole);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}

export function createRooftop(mats) {
  const group = new THREE.Group();
  const rand = rng(88);
  const b = bucket();
  // ---------- our terrace: x -5..5, z -4..4; the stair hut behind the viewer ----------
  const HX = 5, HZ = 4;
  b.lights.push({ p: new THREE.Vector3(0, 2.2, 0.2), c: new THREE.Color(0xffb070), r: 5, i: 1.4 }); // bulb string over the mat
  b.lights.push({ p: new THREE.Vector3(-2.6, 1.6, 2.2), c: new THREE.Color(0xffa050), r: 3.5, i: 1.8 }); // the open door
  const par = [];
  for (const [w, d, x, z] of [[HX * 2, 0.2, 0, -HZ], [0.2, HZ * 2, -HX, 0], [0.2, HZ * 2, HX, 0], [HX * 2 - 4, 0.2, 2, HZ]]) par.push(box(w, 1.0, d, x, 0.5, z, 0.5), box(w + 0.1, 0.08, d + 0.12, x, 1.04, z, 0.5));
  tint(par, new THREE.Color(1, 0.96, 0.9)); b.plaster.push(...par);
  // iron railing on the front parapet
  for (let x = -HX + 0.3; x < HX - 0.2; x += 0.16) b.dark.push(box(0.02, 0.5, 0.02, x, 1.33, -HZ, 1));
  b.dark.push(box(HX * 2, 0.04, 0.04, 0, 1.58, -HZ, 1));
  // stair hut: walls, a lit doorway, a small tiled roof, the water tank on its roof
  const hut = [box(3.2, 2.6, 0.2, -3.4, 1.3, 1.6), box(0.2, 2.6, 2.4, -1.9, 1.3, 2.8), box(0.2, 2.6, 2.4, -4.9, 1.3, 2.8), box(3.2, 0.2, 2.6, -3.4, 2.6, 2.8)];
  tint(hut, new THREE.Color(1.02, 0.9, 0.62)); b.plaster.push(...hut);
  b.lit.push(new THREE.PlaneGeometry(0.9, 2.0).translate(-2.6, 1.0, 1.72));
  b.wood.push(box(1.1, 0.1, 0.12, -2.6, 2.05, 1.72), box(0.08, 2.0, 0.12, -3.1, 1.0, 1.72), box(0.08, 2.0, 0.12, -2.1, 1.0, 1.72));
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.4, 20).rotateZ(Math.PI / 2), std(0xd8dade, { metalness: 0.9, roughness: 0.3 }));
  tank.position.set(-3.6, 3.35, 2.9); tank.castShadow = true;
  group.add(tank);
  // floor
  const tc = repeatMaps(terracotta(4), [HX * 2 / 1.6, HZ * 2 / 1.6]);
  const floorGeo = new THREE.PlaneGeometry(HX * 2, HZ * 2, 30, 24).rotateX(-Math.PI / 2);
  const floorMat = withGlow(new THREE.MeshStandardMaterial({ ...tc, roughness: 0.75 }));

  // ---------- neighbours: rooftops all around at other heights, with their own lanterns and tanks ----------
  const lanterns = { star: [], ball: [] };
  const neighbours = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rand() * 0.2, rr = 9 + rand() * 12;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (z > 3 && Math.abs(x) < 8) continue; // keep it open behind the hut
    const w = 4 + rand() * 5, d = 5 + rand() * 6;
    const moonSide = z < -3 && x > -12 && x < 5; // keep the view to the rising moon open
    const top = moonSide ? -4.5 + rand() * 2 : -3 + rand() * 6.5;
    neighbours.push({ x, z, w, d, top, ry: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + (rand() - 0.5) * 0.3 });
  }
  for (const n of neighbours) {
    const m = new THREE.Matrix4().makeRotationY(n.ry).setPosition(n.x, 0, n.z);
    const parts = { plaster: [box(n.w, n.top + 14, n.d, 0, (n.top - 14) / 2, 0, 1.5)], lit: [], dark: [], tiles: [] };
    if (rand() < 0.3) { // an old tiled roof instead of a flat terrace
      const r = tileRoof({ w: n.w, d: n.d, h: 1.6, over: 0.3, lift: 0.15, segU: 10, segV: 4 });
      parts.tiles.push(r.roof.translate(0, n.top - r.wallY + 0.05, 0), ...r.ridge.map((g) => g.translate(0, n.top - r.wallY + 0.05, 0)));
      parts.plaster.push(...r.gable.map((g) => g.translate(0, n.top - r.wallY + 0.05, 0)));
    } else {
      parts.plaster.push(box(n.w, 0.9, 0.15, 0, n.top + 0.45, n.d / 2), box(n.w, 0.9, 0.15, 0, n.top + 0.45, -n.d / 2), box(0.15, 0.9, n.d, n.w / 2, n.top + 0.45, 0), box(0.15, 0.9, n.d, -n.w / 2, n.top + 0.45, 0));
      if (rand() < 0.6) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 14).rotateZ(Math.PI / 2), tank.material); t.position.set(n.x + (rand() - 0.5) * n.w * 0.5, n.top + 0.9, n.z + (rand() - 0.5) * n.d * 0.5); group.add(t); }
      if (rand() < 0.55) { // their own lantern string across the terrace
        const y = n.top + 2.1, p0 = new THREE.Vector3(-n.w / 2 + 0.3, y, (rand() - 0.5) * n.d * 0.6), p1 = new THREE.Vector3(n.w / 2 - 0.3, y, (rand() - 0.5) * n.d * 0.6);
        for (let k = 0; k < 6; k++) { const kind = rand() < 0.6 ? 'star' : 'ball'; lanterns[kind].push({ p: p0.clone().lerp(p1, (k + 0.5) / 6).setY(y - Math.sin(((k + 0.5) / 6) * Math.PI) * 0.4).applyMatrix4(m), c: pickColor(kind, rand()), s: 1.3, ry: rand() * 6, drop: 0.2 }); }
        b.lights.push({ p: new THREE.Vector3(0, y - 0.6, 0).applyMatrix4(m), c: new THREE.Color(0xff8a50), r: 5, i: 1.2 });
      }
    }
    // windows on the faces toward us
    for (let f = 0; f < 4; f++) for (let y = n.top - 2.2; y > n.top - 12; y -= 2.8) {
      if (rand() < 0.45) continue;
      const half = f % 2 ? n.w / 2 : n.d / 2, span = f % 2 ? n.d : n.w;
      const pl = new THREE.PlaneGeometry(0.9, 1.4).translate((rand() - 0.5) * (span - 1.5), y, half + 0.02).rotateY((f * Math.PI) / 2);
      parts[rand() < 0.55 ? 'lit' : 'dark'].push(pl);
    }
    const tintC = PALETTE[Math.floor(rand() * PALETTE.length)];
    tint(parts.plaster, tintC);
    for (const k in parts) for (const g of parts[k]) b[k].push(g.applyMatrix4(m));
  }
  // far city: tall blocks with window grids, and a few dark tree crowns in between
  const wt = windowsTex(); wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
  const cityMat = new THREE.MeshBasicMaterial({ map: wt, color: new THREE.Color(0.85, 0.8, 0.75), fog: true });
  const cityGeos = [];
  for (let i = 0; i < 40; i++) {
    const a = rand() * Math.PI * 2, rr = 40 + rand() * 60, w = 8 + rand() * 14, h = 6 + rand() * (rand() < 0.2 ? 40 : 16);
    const g = new THREE.BoxGeometry(w, h, w * 0.8).translate(0, h / 2 - 12, 0);
    const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * w / 8, uv.getY(k) * h / 16);
    g.rotateY(rand() * 3).translate(Math.cos(a) * rr, 0, Math.sin(a) * rr);
    cityGeos.push(g);
  }
  group.add(new THREE.Mesh(mergeGeometries(cityGeos), cityMat));
  const treeMat = std(0x1e3a22, { flatShading: true, roughness: 0.9 });
  for (let i = 0; i < 6; i++) { const a = rand() * Math.PI * 2, rr = 11 + rand() * 10; const t = new THREE.Mesh(new THREE.IcosahedronGeometry(2.5 + rand() * 1.5, 1), treeMat); t.position.set(Math.cos(a) * rr, -1 + rand() * 2, Math.sin(a) * rr); t.scale.y = 0.8; group.add(t); }

  buildBucket(b, mats, group);
  bakeGlow(floorGeo, b.lights);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.receiveShadow = true;
  group.add(floor);
  group.add(lanternField('star', lanterns.star, { halo: 1.0, haloOpacity: 0.3 }), lanternField('ball', lanterns.ball, { halo: 0.9, haloOpacity: 0.3 }));
  const lanternFields = group.children.slice(-2);

  // bulb string over the mat, from the hut to the railing
  const bulbs = [], wire = [];
  const w0 = new THREE.Vector3(-1.9, 2.4, 1.8), w1 = new THREE.Vector3(3.5, 1.7, -3.9);
  for (let i = 0; i <= 20; i++) { const t = i / 20; wire.push(w0.clone().lerp(w1, t).setY(THREE.MathUtils.lerp(w0.y, w1.y, t) - Math.sin(t * Math.PI) * 0.35)); }
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wire), new THREE.LineBasicMaterial({ color: 0x1a1410 })));
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.9) });
  for (let i = 2; i < 20; i += 2) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), bulbMat); m.position.copy(wire[i]).y -= 0.06; group.add(m); bulbs.push(m); }
  const lamp = new THREE.PointLight(0xffb070, 3.2, 7, 1.6);
  lamp.position.set(0.4, 2.1, 0.2);
  group.add(lamp);
  // bougainvillea in pots along the parapet
  const potMat = std(0x9a4a2a, { roughness: 0.8 }), leaf = std(0x2a5a2a, { flatShading: true }), flower = std(0xe0409a, { flatShading: true, roughness: 0.6 });
  for (const [x, z] of [[4.3, -3.4], [3.2, -3.5], [-4.3, -3.3], [4.4, 1.5], [-4.4, -1]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.4, 12), potMat); p.position.set(x, 0.2, z);
    const bush = new THREE.Group(); bush.position.set(x, 0.75, z);
    for (let k = 0; k < 7; k++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 + rand() * 0.15, 0), rand() < 0.55 ? flower : leaf); s.position.set((rand() - 0.5) * 0.5, (rand() - 0.2) * 0.5, (rand() - 0.5) * 0.5); bush.add(s); }
    group.add(p, bush);
  }

  // ---------- the mat, the low table, the family ----------
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.2).rotateX(-Math.PI / 2), std(0xffffff, { map: matTex(), roughness: 0.85 }));
  mat.position.set(0, 0.006, 0.1); mat.receiveShadow = true;
  const table = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.04, 40), std(0x7a1a14, { roughness: 0.3, metalness: 0.1 }));
  top.position.y = TABLE_TOP - 0.02;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.02, 6, 40).rotateX(Math.PI / 2), std(0xd9a843, { metalness: 0.8, roughness: 0.3 })); rim.position.y = TABLE_TOP;
  table.add(top, rim);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, TABLE_TOP - 0.04, 0.05), std(0x5a1a10)); l.position.set(Math.cos(a) * 0.42, (TABLE_TOP - 0.04) / 2, Math.sin(a) * 0.42); table.add(l); }
  table.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.add(mat, table);
  const family = [];
  const seat = (p, x, z, face) => { p.sit(true); p.g.position.x = x; p.g.position.z = z; p.g.rotation.y = face; group.add(p.g); family.push(p); return p; };
  const toCentre = (x, z) => Math.atan2(-x, -z);
  const grandpa = seat(makePerson({ elder: true, glasses: true, top: 0x3a3a4a, bottom: 0x2a2a30, outfit: 'shirt', hat: 'khanxep', beard: true }), -0.35, -0.95, toCentre(-0.35, -0.95));
  const grandma = seat(makePerson({ elder: true, girl: true, top: 0x6a3a5a, bottom: 0x1a1a1a, outfit: 'aobaba', hair: 'khan', khan: 0x2a1a2a }), 0.45, -0.9, toCentre(0.45, -0.9));
  const mum = seat(makePerson({ girl: true, top: 0xe88a9a, bottom: 0x2a2e3a, hair: 'long', outfit: 'shirt' }), 1.0, 0.05, toCentre(1.0, 0.05));
  const dad = seat(makePerson({ top: 0xf2f0e8, bottom: 0x3a4050, hair: 'short', outfit: 'shirt' }), -1.0, -0.15, toCentre(-1.0, -0.15));
  const sis = seat(makePerson({ age: 'kid', girl: true, top: 0xf2c14e, bottom: 0x3a5a8a, hair: 'bob' }), -0.85, 0.75, toCentre(-0.85, 0.75));
  grandpa.pose('L', -0.5, 0.2, -1.2); grandpa.pose('R', -0.5, 0.2, -1.2);
  grandma.pose('L', -0.6, 0.1, -1.4); grandma.pose('R', -0.4, 0.2, -1.0);
  mum.pose('L', -0.3, 0.3, -0.8); dad.pose('R', -0.3, 0.2, -0.8);
  // two kids waiting with their lanterns by the railing
  const kids = [makeKid(rand, 'carp'), makeKid(rand, 'star')];
  kids[0].g.position.set(1.8, 0, -2.4); kids[0].g.rotation.y = 2.6;
  kids[1].g.position.set(2.5, 0, -2.0); kids[1].g.rotation.y = -2.4;
  group.add(...kids.map((k) => k.g));

  // ---------- tray slots: each becomes an item when the viewer sets it ----------
  const SLOTS = [
    { id: 'tiensi', at: [0, -0.2], make: tienSi, line: '<b>Ông tiến sĩ giấy</b> ngồi giữa mâm: mong con chăm học.' },
    { id: 'fruit', at: [-0.28, -0.12], make: fruitPlate, line: '<b>Mâm ngũ quả</b>: bưởi, na, hồng, cam, lựu, chuối.' },
    { id: 'cake', at: [0.28, -0.08], make: cakePlate, line: '<b>Bánh nướng, bánh dẻo</b>, cắt ra chia cả nhà.' },
    { id: 'pig', at: [0.2, 0.24], make: pigCakes, line: '<b>Bánh con lợn, con cá</b> cho các cháu nhỏ.' },
    { id: 'tea', at: [-0.05, 0.3], make: teaSet, line: '<b>Ấm trà sen</b> cho ông bà ngắm trăng.' },
  ];
  const DOG_AT = new THREE.Vector3(-0.3, TABLE_TOP, 0.2);
  const slots = SLOTS.map((s) => {
    const item = s.make();
    item.position.set(s.at[0], TABLE_TOP, s.at[1]);
    if (s.id === 'tiensi') item.scale.setScalar(1.3);
    item.visible = false;
    group.add(item);
    const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff0b0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    spark.scale.setScalar(0.3); spark.position.set(s.at[0], TABLE_TOP + 0.06, s.at[1]);
    group.add(spark);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(spark.position); hit.userData.slot = s.id;
    group.add(hit);
    return { ...s, item, spark, hit, set: false };
  });

  return {
    group, family, kids, slots, lamp, DOG_AT, grandpa, grandma, tableTop: TABLE_TOP,
    board: new THREE.Vector3(0.55, 0.006, 0.8), keoAt: new THREE.Vector3(1.55, 0.006, -0.85),
    tick(t, dt, ambient) {
      for (const f of lanternFields) f.userData.tick(t * ambient);
      for (const s of slots) if (!s.set && s.spark.userData.on) s.spark.material.opacity = 0.45 + 0.3 * Math.sin(t * 3 + s.at[0] * 5);
      family.forEach((p, i) => { p.body.rotation.y = Math.sin(t * 0.4 + i * 1.3) * 0.08; p.body.rotation.x = Math.sin(t * 0.3 + i) * 0.02; });
      kids.forEach((k) => k.tick(t, 0));
      lamp.intensity = 3.2 * (0.97 + Math.sin(t * 2.3) * 0.03);
    },
  };
}
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
