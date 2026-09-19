// Act 1: Phố Hàng Mã at dusk, a week before the full moon. Hanoi tube houses (nhà ống): three and four storeys,
// French windows with green louvred shutters, iron balconies, shop signs over open shopfronts spilling lanterns
// onto the pavement, scooters parked on the kerb, cables looping between poles, and lanterns strung across the
// street. Five stalls along the way are the stops where the walk pauses (see stops.js).
import * as THREE from 'three';
import { bucket, box, tileRoof } from './arch.js';
import { plaster, terracotta, bakeGlow, withGlow, repeatMaps, fbm } from './tex.js';
import { canvasTex } from './print.js';
import { rng, buildBucket, tint } from './street.js';
import { lanternField, pickColor } from './lanterns.js';
import { makeKid, makePerson } from './figures.js';

export const FACADE = 3.5;          // house fronts at x = ±3.5
const ROAD = 2.3;                   // kerb at x = ±2.3
export const Z0 = 8, Z1 = -74;      // street from z = 8 (start) to the closing house
export const EYE = 1.3;
// Stops: the stall sits on the pavement in front of the shop on `side`.
export const STOPS = [
  { id: 'star', z: -6, side: -1 },
  { id: 'tohe', z: -18, side: 1 },
  { id: 'mask', z: -30, side: -1 },
  { id: 'cake', z: -42, side: 1 },
  { id: 'boat', z: -54, side: -1 },
];
const SIGNS = [
  ['ĐÈN ÔNG SAO · ĐÈN KÉO QUÂN', 'Số 12 · Hàng Mã', '#b3141f', '#f7d56a'],
  ['TÒ HE · ĐỒ CHƠI DÂN GIAN', 'Số 31 · Hàng Mã', '#1d4e9e', '#ffffff'],
  ['MẶT NẠ GIẤY BỒI', 'Số 20 · Hàng Mã', '#b3141f', '#ffffff'],
  ['BÁNH NƯỚNG · BÁNH DẺO', 'Số 47 · Hàng Mã', '#7a1a10', '#f7d56a'],
  ['ĐỒ CHƠI SẮT TÂY', 'Số 38 · Hàng Mã', '#1f6a3a', '#f7e7a0'],
  ['ĐỒ CHƠI TRUNG THU', 'Số 8 · Hàng Mã', '#b3141f', '#f7d56a'],
  ['ĐÈN LỒNG CÁC LOẠI', 'Số 15 · Hàng Mã', '#c4461a', '#fff4d0'],
  ['GIẤY MÀU · GIẤY BÓNG KÍNH', 'Số 26 · Hàng Mã', '#1d4e9e', '#ffe680'],
  ['TRỐNG · ĐẦU LÂN · MẶT NẠ', 'Số 33 · Hàng Mã', '#b3141f', '#f7d56a'],
  ['HÀNG MÃ · ĐỒ LỄ', 'Số 5 · Hàng Mã', '#8a1a1a', '#f7d56a'],
  ['TẠP HÓA', 'Số 41 · Hàng Mã', '#1f6a3a', '#ffffff'],
  ['ĐÈN ÔNG SAO SỈ & LẺ', 'Số 52 · Hàng Mã', '#b3141f', '#f7d56a'],
];
const PALETTE = [[1.05, 0.9, 0.55], [1.02, 0.84, 0.46], [0.82, 0.95, 0.78], [1, 0.98, 0.92], [1.05, 0.83, 0.78], [0.84, 0.86, 0.88], [0.8, 0.9, 1]].map((c) => new THREE.Color(...c));

function signAtlas() {
  const W = 1024, RH = 128;
  return canvasTex(W, RH * SIGNS.length, (x) => {
    SIGNS.forEach(([t, sub, bg, fg], i) => {
      const y = i * RH;
      x.fillStyle = bg; x.fillRect(0, y, W, RH);
      x.strokeStyle = fg; x.globalAlpha = 0.8; x.lineWidth = 4; x.strokeRect(10, y + 10, W - 20, RH - 20); x.globalAlpha = 1;
      x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `700 ${t.length > 20 ? 54 : 64}px "Be Vietnam Pro"`;
      x.fillText(t, W / 2, y + RH * 0.42, W - 60);
      x.font = '400 24px "Be Vietnam Pro"'; x.globalAlpha = 0.85;
      x.fillText(sub, W / 2, y + RH * 0.8); x.globalAlpha = 1;
    });
  }, 1);
}
// Shop interiors, four kinds side by side: lantern shop, toy shelves, cake boxes, mask wall. A dim background
// (the 3D stock hangs in front of it), so it's painted dark and soft rather than bright.
function shopAtlas() {
  return canvasTex(2048, 512, (x) => {
    const r = rng(77);
    for (let k = 0; k < 4; k++) {
      const x0 = k * 512;
      x.save(); x.beginPath(); x.rect(x0, 0, 512, 512); x.clip();
      const g = x.createRadialGradient(x0 + 256, 180, 30, x0 + 256, 260, 420);
      g.addColorStop(0, '#8a5a34'); g.addColorStop(1, '#2a160c');
      x.fillStyle = g; x.fillRect(x0, 0, 512, 512);
      for (let s = 1; s < 4; s++) { // shelves: plank with a lit edge and a shadow below
        const y = s * 128;
        x.fillStyle = '#1a0c06'; x.fillRect(x0, y + 4, 512, 12);
        x.fillStyle = '#b07a4a'; x.fillRect(x0, y - 6, 512, 10);
      }
      for (let i = 0; i < 70; i++) {
        const row = Math.floor(r() * 4), px = x0 + 20 + r() * 472, base = row * 128 + 118;
        const hue = [2, 10, 40, 200, 135, 330][Math.floor(r() * 6)];
        const sh = (l) => `hsl(${hue},70%,${l}%)`;
        if (k === 0) { // hanging lanterns with a glow
          const R = 12 + r() * 12, cy = row * 128 + 30 + r() * 40;
          const gl = x.createRadialGradient(px, cy, 0, px, cy, R * 2.4); gl.addColorStop(0, `hsla(${hue},100%,70%,.55)`); gl.addColorStop(1, 'hsla(0,0%,0%,0)');
          x.fillStyle = gl; x.fillRect(px - R * 3, cy - R * 3, R * 6, R * 6);
          x.fillStyle = sh(55); x.beginPath(); for (let j = 0; j < 10; j++) { const a = Math.PI / 2 + (j * Math.PI) / 5, rr = j % 2 ? R * 0.42 : R; x.lineTo(px + Math.cos(a) * rr, cy - Math.sin(a) * rr); } x.fill();
        } else if (k === 1) { // boxed toys and drums
          const w = 22 + r() * 30, h = 22 + r() * 40;
          const gg = x.createLinearGradient(px, 0, px + w, 0); gg.addColorStop(0, sh(58)); gg.addColorStop(1, sh(32));
          x.fillStyle = gg; x.fillRect(px, base - h, w, h);
          x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(px + 3, base - h + 3, w * 0.3, 3);
        } else if (k === 2) { // cake boxes in red and gold
          const w = 44, h = 22 + r() * 8;
          x.fillStyle = r() < 0.55 ? '#9a1018' : '#b88a30'; x.fillRect(px, base - h, w, h);
          x.strokeStyle = '#e8c060'; x.lineWidth = 2; x.strokeRect(px + 3, base - h + 3, w - 6, h - 6);
        } else { // masks: pale faces with two eye holes
          const cy = row * 128 + 50 + r() * 30, fc = ['#f2c89a', '#f2a8b0', '#fbf6ee', '#c8322a'][Math.floor(r() * 4)];
          x.fillStyle = fc; x.beginPath(); x.ellipse(px, cy, 16, 20, 0, 0, 7); x.fill();
          x.fillStyle = '#1a0c06'; x.beginPath(); x.ellipse(px - 6, cy - 3, 3.5, 2.5, 0, 0, 7); x.ellipse(px + 6, cy - 3, 3.5, 2.5, 0, 0, 7); x.fill();
        }
      }
      const v = x.createRadialGradient(x0 + 256, 220, 150, x0 + 256, 256, 380); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
      x.fillStyle = v; x.fillRect(x0, 0, 512, 512);
      x.restore();
    }
  }, 1);
}
function louvreTex() {
  return canvasTex(64, 128, (x, w, h) => {
    x.fillStyle = '#2f7a5e'; x.fillRect(0, 0, w, h);
    for (let y = 8; y < h - 6; y += 6) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(5, y, w - 10, 2); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(5, y + 2, w - 10, 1); }
    x.strokeStyle = '#1f4f3e'; x.lineWidth = 5; x.strokeRect(2, 2, w - 4, h - 4);
    x.fillRect(0, h / 2 - 2, w, 4);
  });
}
function asphalt() {
  const S = 512, c = Object.assign(document.createElement('canvas'), { width: S, height: S }), x = c.getContext('2d');
  x.fillStyle = '#34322f'; x.fillRect(0, 0, S, S);
  fbm(x, S, S, { cells: 16, octaves: 4, op: 'overlay', alpha: 0.6 });
  fbm(x, S, S, { cells: 3, octaves: 3, op: 'multiply', alpha: 0.35 });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
const uvRect = (g, u0, v0, u1, v1) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, THREE.MathUtils.lerp(u0, u1, uv.getX(i)), THREE.MathUtils.lerp(v0, v1, uv.getY(i))); return g; };

// ---------- scooter (xe máy) parked on the kerb, merged, vertex-coloured ----------
function scooter(rand) {
  const c = [0xb3141f, 0x1d4e9e, 0xe8e2d6, 0x222222, 0x2f7a5e][Math.floor(rand() * 5)];
  const parts = [];
  const add = (geo, hex) => { const g = geo.toNonIndexed(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); const cc = new THREE.Color(hex), a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) a.set([cc.r, cc.g, cc.b], i); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); parts.push(g); };
  for (const z of [-0.62, 0.62]) add(new THREE.TorusGeometry(0.2, 0.06, 6, 14).rotateY(Math.PI / 2).translate(0, 0.25, z), 0x151515);
  add(new THREE.BoxGeometry(0.28, 0.22, 0.9).translate(0, 0.42, -0.15), c);
  add(new THREE.BoxGeometry(0.26, 0.1, 0.62).translate(0, 0.6, -0.2), 0x1a1a1a);
  add(new THREE.BoxGeometry(0.24, 0.62, 0.14).rotateX(-0.25).translate(0, 0.62, 0.5), c);
  add(new THREE.CylinderGeometry(0.018, 0.018, 0.62, 5).rotateZ(Math.PI / 2).translate(0, 0.98, 0.56), 0x333333);
  add(new THREE.BoxGeometry(0.14, 0.1, 0.06).translate(0, 0.9, 0.64), 0xf2f0e0);
  return parts;
}

export function createHangMa(mats) {
  const group = new THREE.Group();
  const rand = rng(2026);
  const b = bucket();
  b.shop = []; b.sign = []; b.cloth = []; b.bike = [];
  const items = { star: [], carp: [], ball: [] };
  const stopAt = (z) => STOPS.find((s) => Math.abs(s.z - z) < 2.2);
  const signFor = new Map([['star', 0], ['tohe', 1], ['mask', 2], ['cake', 3], ['boat', 4]]);
  const shopFor = new Map([['star', 0], ['tohe', 1], ['mask', 3], ['cake', 2], ['boat', 1]]);
  let signIdx = 5;

  // ---------- nhà ống: front on z = 0 facing +z (local), going back to -d ----------
  function house(m, { w, floors, sign, shop, stall }) {
    const P = { plaster: [], trim: [], wood: [], tiles: [], shutter: [], dark: [], lit: [], shop: [], sign: [], cloth: [] };
    const g = 3.1, f = 2.75, top = g + f * (floors - 1), d = 7;
    // shell and ground floor: piers, sign band, open shopfront with its lit interior, rolled-up shutter
    P.plaster.push(box(0.24, top, d, -w / 2 + 0.12, top / 2, -d / 2), box(0.24, top, d, w / 2 - 0.12, top / 2, -d / 2));
    P.plaster.push(box(0.3, g, 0.3, -w / 2 + 0.15, g / 2, 0), box(0.3, g, 0.3, w / 2 - 0.15, g / 2, 0));
    P.trim.push(box(w + 0.04, 0.72, 0.34, 0, g - 0.36, 0));
    const sg = new THREE.PlaneGeometry(w - 0.5, 0.56).translate(0, g - 0.36, 0.18);
    P.sign.push(uvRect(sg, 0, 1 - (sign + 1) / SIGNS.length, 1, 1 - sign / SIGNS.length));
    const shopG = new THREE.PlaneGeometry(w - 0.6, g - 0.75).translate(0, (g - 0.75) / 2, -2.4);
    P.shop.push(uvRect(shopG, shop / 4, 0, (shop + 1) / 4, 1));
    P.plaster.push(box(w - 0.5, 0.12, 2.5, 0, g - 0.78, -1.25)); // ceiling of the shop
    P.dark.push(box(w - 0.55, 0.22, 0.24, 0, g - 0.86, 0.02)); // rolled shutter drum
    for (const s of [-1, 1]) { // interior side walls, stocked too
      const sw = new THREE.PlaneGeometry(2.4, g - 0.75).rotateY(-s * Math.PI / 2).translate(s * (w / 2 - 0.3), (g - 0.75) / 2, -1.2);
      P.shop.push(uvRect(sw, shop / 4 + (s > 0 ? 0.15 : 0), 0, shop / 4 + (s > 0 ? 0.25 : 0.1), 1));
    }
    P.plaster.push(box(w, 0.12, 0.6, 0, 0.06, -0.2));
    // upper floors
    for (let i = 1; i < floors; i++) {
      const y0 = g + f * (i - 1);
      P.plaster.push(box(w, f, 0.24, 0, y0 + f / 2, 0));
      P.trim.push(box(w + 0.08, 0.14, 0.38, 0, y0 + 0.02, 0), box(w + 0.02, 0.08, 0.3, 0, y0 + f - 0.35, 0));
      const balcony = rand() < 0.4;
      if (balcony) {
        const bw = w - 0.5, dw = Math.min(1.3, w * 0.4);
        P.trim.push(box(bw, 0.1, 0.8, 0, y0 + 0.08, 0.45));
        P.dark.push(box(bw, 0.04, 0.04, 0, y0 + 1.08, 0.82), box(0.04, 1.0, 0.04, -bw / 2, y0 + 0.6, 0.82), box(0.04, 1.0, 0.04, bw / 2, y0 + 0.6, 0.82));
        for (let x = -bw / 2 + 0.12; x < bw / 2 - 0.05; x += 0.12) P.dark.push(box(0.018, 0.96, 0.018, x, y0 + 0.6, 0.82, 1));
        for (const s of [-1, 1]) P.dark.push(box(0.02, 0.02, 0.8, s * (bw / 2 - 0.2), y0 + 0.62, 0.45, 1));
        P[rand() < 0.75 ? 'lit' : 'dark'].push(new THREE.PlaneGeometry(dw, 2.0).translate(0, y0 + 1.15, 0.13));
        P.wood.push(box(dw + 0.12, 0.1, 0.08, 0, y0 + 2.2, 0.14));
        for (const s of [-1, 1]) P.shutter.push(new THREE.BoxGeometry(dw / 2, 2.0, 0.03).translate(s * dw / 4, 0, 0).rotateY(-s * (1.35 + rand() * 0.2)).translate(s * dw / 2, y0 + 1.15, 0.16));
        if (rand() < 0.7) for (let k = 0; k < 3; k++) { // potted plants on the balcony
          const px = -bw / 2 + 0.3 + rand() * (bw - 0.6);
          P.cloth.push(new THREE.CylinderGeometry(0.1, 0.08, 0.2, 8).translate(px, y0 + 0.23, 0.6));
          P.cloth.push(new THREE.IcosahedronGeometry(0.18 + rand() * 0.1, 0).translate(px, y0 + 0.48, 0.6));
        }
      } else {
        const n = w > 3.4 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const x = n === 1 ? 0 : (k - 0.5) * w * 0.48, ww = 0.8, wh = 1.7, y = y0 + 1.25;
          P.wood.push(box(ww + 0.16, 0.08, 0.1, x, y + wh / 2 + 0.04, 0.14), box(ww + 0.2, 0.08, 0.16, x, y - wh / 2 - 0.04, 0.16));
          const open = rand();
          P[open < 0.6 ? 'lit' : 'dark'].push(new THREE.PlaneGeometry(ww, wh).translate(x, y, 0.125));
          for (const s of [-1, 1]) {
            const a = open < 0.75 ? 1.3 + rand() * 0.3 : 0.05; // flung open against the wall, or closed
            P.shutter.push(new THREE.BoxGeometry(ww / 2, wh, 0.03).translate(s * ww / 4, 0, 0).rotateY(-s * a).translate(x + s * ww / 2, y, 0.15));
          }
        }
        if (rand() < 0.3) P.trim.push(box(0.7, 0.45, 0.28, (rand() - 0.5) * (w - 1), y0 + 2.3, 0.25)); // air conditioner
      }
    }
    // top: parapet with a moulded cap, or an old tiled lean-to roof
    if (rand() < 0.7) {
      P.plaster.push(box(w, 0.9, 0.22, 0, top + 0.45, 0));
      P.trim.push(box(w + 0.1, 0.1, 0.32, 0, top + 0.95, 0));
      if (rand() < 0.5) P.trim.push(box(Math.min(1.4, w * 0.4), 0.4, 0.26, 0, top + 1.2, 0));
    } else {
      // old-style: a tiled roof over the front rooms, ridge parallel to the street
      const r = tileRoof({ w: w + 0.02, d: 3.6, h: 1.0, over: 0.3, lift: 0.1, segU: 12, segV: 4 });
      P.tiles.push(r.roof.applyMatrix4(new THREE.Matrix4().makeTranslation(0, top - r.wallY + 0.1, -1.8)));
      P.plaster.push(...r.gable.map((gg) => gg.applyMatrix4(new THREE.Matrix4().makeTranslation(0, top - r.wallY + 0.1, -1.8))));
    }
    P.plaster.push(box(w, 0.2, d, 0, top, -d / 2)); // roof slab
    const tintC = PALETTE[Math.floor(rand() * PALETTE.length)];
    tint(P.plaster, tintC);
    tint(P.trim, tintC.clone().lerp(new THREE.Color(1.1, 1.1, 1.05), 0.6));
    for (const k in P) for (const geo of P[k]) (k === 'trim' ? b.plaster : b[k]).push(geo.applyMatrix4(m));

    // lanterns spilling out of the shop: two rows on a bar over the pavement, unless a stall sits here
    const bar = new THREE.Vector3();
    if (!stall && shop !== 2) {
      for (const row of [0.55, 1.05]) {
        for (let x = -w / 2 + 0.35; x < w / 2 - 0.2; x += 0.34 + rand() * 0.08) {
          const kind = rand() < 0.62 ? 'star' : rand() < 0.5 ? 'carp' : 'ball';
          const p = new THREE.Vector3(x, 2.55 - (row > 1 ? 0.25 : 0) + rand() * 0.08, row).applyMatrix4(m);
          items[kind].push({ p, c: pickColor(kind, rand()), s: kind === 'star' ? 1.1 + rand() * 0.4 : 1 + rand() * 0.3, ry: (rand() - 0.5) * 0.8, drop: 0.15 + rand() * 0.2 });
        }
      }
      b.dark.push(box(w - 0.3, 0.03, 0.03, 0, 2.62, 1.05).applyMatrix4(m));
    }
    for (let x = -w / 2 + 0.6; x < w / 2 - 0.5; x += 0.45) for (const zz of [-0.7, -1.5]) { // stock hanging inside the shop
      if (rand() < 0.3) continue;
      const kind = shop === 0 || rand() < 0.5 ? 'star' : 'ball';
      items[kind].push({ p: new THREE.Vector3(x + (rand() - 0.5) * 0.1, 2.2, zz).applyMatrix4(m), c: pickColor(kind, rand()), s: 0.9 + rand() * 0.3, ry: rand() * 6, drop: 0.1 + rand() * 0.25 });
    }
    b.lights.push({ p: bar.set(0, 1.6, 0.9).applyMatrix4(m), c: new THREE.Color(0xff9a50), r: 4.2, i: 2.2 });
    b.lights.push({ p: new THREE.Vector3(0, 1.5, -1).applyMatrix4(m), c: new THREE.Color(0xffb070), r: 3.2, i: 1.4 });
  }

  // ---------- both sides of the street ----------
  for (const side of [-1, 1]) {
    const r = new THREE.Matrix4().makeRotationY(side < 0 ? Math.PI / 2 : -Math.PI / 2);
    for (let z = Z0 + 6; z > Z1 + 3;) {
      let w = 3.0 + rand() * 1.6, zc = z - w / 2, stop = null;
      // a stall's shop is centred on the stall: put a filler house before it if needed
      const next = STOPS.find((st) => st.side === side && st.z < z && st.z > z - w - 2.4);
      if (next) {
        const need = z - next.z;
        if (need > 2.3 + 1.2) { w = need - 2.2; zc = z - w / 2; }
        else { w = need * 2; zc = next.z; stop = next; }
      }
      const m = new THREE.Matrix4().makeTranslation(side * FACADE, 0, zc).multiply(r);
      const sign = stop ? signFor.get(stop.id) : (signIdx++ - 5) % (SIGNS.length - 5) + 5;
      house(m, { w, floors: 3 + (rand() < 0.45 ? 1 : 0), sign, shop: stop ? shopFor.get(stop.id) : Math.floor(rand() * 4), stall: !!stop });
      z -= w + 0.02;
    }
  }
  // the street ends at a house across it: ours, door open, light on
  {
    const m = new THREE.Matrix4().makeTranslation(0, 0, Z1 - 0.5);
    house(m, { w: FACADE * 2 + 0.4, floors: 4, sign: 9, shop: 1, stall: true });
  }

  // ---------- lanterns strung across the street between the upper floors ----------
  const lines = [];
  for (let z = Z0 - 2; z > Z1 + 4; z -= 3.2 + rand() * 1.2) {
    const y = 4.4 + rand() * 0.5;
    const a = new THREE.Vector3(-FACADE, y, z + (rand() - 0.5)), c = new THREE.Vector3(FACADE, y + (rand() - 0.5) * 0.3, z + (rand() - 0.5));
    const sag = 0.5 + rand() * 0.3, pt = (k) => new THREE.Vector3().lerpVectors(a, c, k).setY(THREE.MathUtils.lerp(a.y, c.y, k) - Math.sin(k * Math.PI) * sag);
    for (let i = 0; i < 16; i++) lines.push(pt(i / 16), pt((i + 1) / 16));
    const n = 7 + Math.floor(rand() * 3), kind = rand() < 0.65 ? 'star' : 'ball';
    for (let i = 0; i < n; i++) {
      const p = pt((i + 0.5) / n);
      items[kind].push({ p, c: pickColor(kind, rand()), s: kind === 'star' ? 1.5 : 1.3, ry: rand() * 6, drop: 0.2 });
    }
    b.lights.push({ p: pt(0.5).setY(y - 0.9), c: new THREE.Color(0xff8a50), r: 3.5, i: 0.8 });
  }
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x6a6660, roughness: 0.8 });
  // power cables: sagging bundles along both kerbs between poles, a few crossing
  for (const side of [-1, 1]) {
    for (let z = Z0; z > Z1 + 6; z -= 12) {
      group.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 7.5, 8).translate(side * (ROAD + 0.35), 3.75, z), poleMat), { castShadow: true }));
      for (let k = 0; k < 4; k++) {
        const y = 6.2 - k * 0.18, a = new THREE.Vector3(side * (ROAD + 0.35), y, z), c = new THREE.Vector3(side * (ROAD + 0.35), y, z - 12);
        for (let i = 0; i < 12; i++) { const p = (t) => new THREE.Vector3().lerpVectors(a, c, t).setY(y - Math.sin(t * Math.PI) * (0.6 + k * 0.15)); lines.push(p(i / 12), p((i + 1) / 12)); }
      }
      if (side > 0 && rand() < 0.6) { const a = new THREE.Vector3(-ROAD - 0.35, 6, z), c = new THREE.Vector3(ROAD + 0.35, 5.9, z - 1); for (let i = 0; i < 8; i++) { const p = (t) => new THREE.Vector3().lerpVectors(a, c, t).setY(6 - Math.sin(t * Math.PI) * 0.4); lines.push(p(i / 8), p((i + 1) / 8)); } }
    }
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines), new THREE.LineBasicMaterial({ color: 0x14100e })));

  // scooters parked along the kerb, away from the stops
  for (const side of [-1, 1]) for (let z = Z0 - 1; z > Z1 + 6; z -= 1.1 + rand() * 2.5) {
    if (STOPS.some((s) => s.side === side && Math.abs(s.z - z) < 3.5) || rand() < 0.35) continue;
    const m = new THREE.Matrix4().makeRotationY(side * (Math.PI / 2 - 0.3) + (rand() - 0.5) * 0.2).setPosition(side * (ROAD + 0.55), 0.15, z);
    for (const p of scooter(rand)) b.bike.push(p.applyMatrix4(m));
  }

  // ---------- merge and bake ----------
  const louvre = withGlow(new THREE.MeshStandardMaterial({ map: louvreTex(), roughness: 0.6 }));
  buildBucket(b, { ...mats, shutter: louvre }, group);
  const shopMat = new THREE.MeshBasicMaterial({ map: shopAtlas(), color: new THREE.Color(1.3, 1.15, 1.0) });
  const signTex = signAtlas();
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.55, roughness: 0.5 });
  const clothMat = withGlow(new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.9, flatShading: true }));
  const bikeMat = withGlow(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.2 }));
  const merged = (list, material) => { if (!list.length) return; const geo = mergeAll(list); if (material.onBeforeCompile && material.customProgramCacheKey?.() === 'glow') bakeGlow(geo, b.lights); const me = new THREE.Mesh(geo, material); me.receiveShadow = true; group.add(me); return me; };
  merged(b.shop, shopMat); merged(b.sign, signMat); merged(b.cloth, clothMat);
  const bikes = merged(b.bike, bikeMat); if (bikes) bikes.castShadow = true;

  const fields = ['star', 'carp', 'ball'].map((k) => lanternField(k, items[k], { halo: k === 'star' ? 0.7 : 0.6, haloOpacity: 0.22 }));
  group.add(...fields);

  // ---------- ground: asphalt road, tiled pavements, kerbs ----------
  const len = Z0 - Z1 + 6, midZ = (Z0 + Z1) / 2;
  const at = asphalt(); at.repeat.set(ROAD * 2 / 4, len / 4);
  const roadGeo = new THREE.PlaneGeometry(ROAD * 2, len, 10, 120).rotateX(-Math.PI / 2).translate(0, 0.0, midZ);
  bakeGlow(roadGeo, b.lights);
  group.add(Object.assign(new THREE.Mesh(roadGeo, withGlow(new THREE.MeshStandardMaterial({ map: at, roughness: 0.75 }))), { receiveShadow: true }));
  const tc = repeatMaps(terracotta(4), [(FACADE - ROAD) / 1.2, len / 1.2]);
  const pavMat = withGlow(new THREE.MeshStandardMaterial({ ...tc, color: 0xc8b8a8, roughness: 0.85 }));
  for (const s of [-1, 1]) {
    const pw = FACADE - ROAD + 0.2, pg = new THREE.PlaneGeometry(pw, len, 6, 120).rotateX(-Math.PI / 2).translate(s * (ROAD + pw / 2 - 0.1), 0.15, midZ);
    bakeGlow(pg, b.lights);
    group.add(Object.assign(new THREE.Mesh(pg, pavMat), { receiveShadow: true }));
    const kerb = box(0.18, 0.16, len, s * (ROAD + 0.08), 0.07, midZ, 1);
    bakeGlow(kerb, b.lights);
    group.add(Object.assign(new THREE.Mesh(kerb, withGlow(new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 0.8 }))), { receiveShadow: true }));
  }

  // ---------- people: children parading with lanterns, parents, vendors on plastic stools ----------
  const walkers = [], standers = [];
  for (let i = 0; i < 12; i++) {
    const kind = rand() < 0.6 ? 'star' : rand() < 0.6 ? 'carp' : 'ball';
    const kid = makeKid(rand, kind);
    const dir = rand() < 0.65 ? -1 : 1;
    walkers.push({ p: kid, x: (rand() < 0.5 ? -1 : 1) * (0.5 + rand() * 1.4), z: Z0 - rand() * (Z0 - Z1 - 8), v: (0.5 + rand() * 0.3) * dir, ph: rand() * 6 });
    group.add(kid.g);
  }
  for (let i = 0; i < 5; i++) { // grown-ups strolling with them
    const girl = rand() < 0.5;
    const p = makePerson({ girl, top: [0xf2efe6, 0x6a8ab8, 0xd8a8a0, 0x3a4a5a, 0xe8d8b0][i], bottom: 0x2a2e38, hair: girl ? 'long' : 'short', outfit: 'shirt' });
    const dir = rand() < 0.65 ? -1 : 1;
    walkers.push({ p, adult: true, x: (rand() < 0.5 ? -1 : 1) * (0.6 + rand() * 1.2), z: Z0 - rand() * (Z0 - Z1 - 8), v: 0.55 * dir, ph: rand() * 6 });
    group.add(p.g);
  }
  const stoolMat = new THREE.MeshStandardMaterial({ color: 0xc8202a, roughness: 0.5 });
  for (const [side, z] of [[1, -9.5], [-1, -23], [1, -35], [-1, -47], [1, -60]]) {
    const p = makePerson({ elder: rand() < 0.5, girl: rand() < 0.5, top: [0xa87a5a, 0x4a6a8a, 0xd8c8a8][Math.floor(rand() * 3)], bottom: 0x2a2a30, hair: 'short', outfit: 'shirt' });
    p.sit(false);
    p.legs.forEach((l) => { l.hp.rotation.x = -1.25; l.kn.rotation.x = 1.9; });
    p.g.position.set(side * (FACADE - 0.6), p.g.position.y + 0.36, z);
    p.g.rotation.y = -side * Math.PI / 2 + (rand() - 0.5) * 0.6;
    p.pose('L', -0.6, 0, -1.0); p.pose('R', -0.5, 0, -1.1);
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.3, 4).rotateY(Math.PI / 4).translate(0, 0.15, 0), stoolMat);
    stool.position.set(p.g.position.x, 0.15, z); stool.castShadow = true;
    group.add(p.g, stool);
    standers.push(p);
  }

  // ---------- the walk: down the middle, a child's eye height ----------
  const pts = [new THREE.Vector3(0, EYE, Z0 - 1)];
  for (let z = Z0 - 6; z > Z1 + 6; z -= 6) pts.push(new THREE.Vector3(Math.sin(z * 0.37) * 0.35, EYE, z));
  pts.push(new THREE.Vector3(0, EYE, Z1 + 5));
  const path = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const zToU = (z) => THREE.MathUtils.clamp((Z0 - 1 - z) / (Z0 - 1 - (Z1 + 5)), 0, 1);
  const heading = (u) => { const t = path.getTangentAt(THREE.MathUtils.clamp(u, 0.001, 0.999)); return Math.atan2(-t.x, -t.z); };

  return {
    group, path, heading, zToU, lights: b.lights,
    tick(t, dt, ambient, cam) {
      for (const f of fields) f.userData.tick(t * ambient);
      for (const w of walkers) {
        w.z += w.v * dt * ambient * -1;
        if (w.z < Z1 + 5) w.z = Z0 - 1; if (w.z > Z0) w.z = Z1 + 6;
        w.p.g.position.set(w.x + Math.sin(t * 0.5 + w.ph) * 0.1, 0, w.z);
        w.p.g.rotation.y = (w.v > 0 ? Math.PI : 0) + Math.sin(t * 0.5 + w.ph) * 0.08;
        w.p.g.visible = !cam || Math.hypot(w.p.g.position.x - cam.x, w.p.g.position.z - cam.z) > 1; // ponytail: pop, not fade — it's out of frame by then
        if (w.adult) w.p.walk(t * 6 + w.ph, ambient); else w.p.tick(t, ambient);
      }
      for (const p of standers) p.body.rotation.y = Math.sin(t * 0.3 + p.g.position.z) * 0.1;
    },
  };
}
function mergeAll(list) { return mergeGeometries(list.map((g) => { const n = g.index ? g.toNonIndexed() : g; if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; }).map((g) => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k); return g; })); }
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
