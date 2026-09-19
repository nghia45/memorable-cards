// Vietnamese architecture kit: curved tile roofs with swept-up corners, Hội An shophouses, and wooden boats.
// Builders push geometry into per-material buckets so a whole street merges into a handful of draw calls.
import * as THREE from 'three';

export const bucket = () => ({ plaster: [], wood: [], tiles: [], lit: [], dark: [], shutter: [], lanterns: [], lights: [] });

// Box with enough segments for baked lighting to vary across it, UV-mapped by position (box projection) so
// textures keep one scale whatever the box size: `su` metres per tile across, `sv` metres per tile up.
export function box(w, h, d, x, y, z, seg = 0.5, su = 2.5, sv = 3.3) {
  const g = new THREE.BoxGeometry(w, h, d, Math.ceil(w / seg), Math.ceil(h / seg), Math.ceil(d / seg)).translate(x, y, z);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const u = ax > 0.5 ? p.getZ(i) : p.getX(i), v = ay > 0.5 ? p.getZ(i) : p.getY(i);
    uv.setXY(i, u / su, v / sv);
  }
  return g;
}

// Tile roof: ridge along x at height h, concave slopes down to eaves overhanging the walls, corners swept up
// and the ridge rising at its ends. `single` makes a lean-to (one slope, ridge against a wall).
// Returns the roof geometry, ridge geometry, the gable-end fill, and `wallY`: roof height above the eave
// where it crosses the wall line (so the caller can sit it on a wall top).
export function tileRoof({ w, d, h, over = 0.35, lift = 0.22, single = false, segU = 24, segV = 8 }) {
  const half = single ? d : d / 2, reach = half + over;
  const X = (u) => u * (w / 2 + over);
  const Y = (u, v) => h * (1 - v) ** 1.35 + lift * Math.abs(u) ** 6 * v * v + lift * 0.25 * u * u * v + 0.1 * Math.abs(u) ** 4 * (1 - v);
  const slopeLen = Math.hypot(reach, h) * 1.05;
  const pos = [], uv = [], idx = [];
  for (const side of single ? [1] : [1, -1]) {
    const base = pos.length / 3;
    for (let j = 0; j <= segV; j++) for (let i = 0; i <= segU; i++) {
      const u = (i / segU) * 2 - 1, v = j / segV;
      pos.push(X(u), Y(u, v), side * v * reach - (single ? 0 : 0));
      uv.push((X(u) + 50) / 0.8, (v * slopeLen) / 1.2);
    }
    for (let j = 0; j < segV; j++) for (let i = 0; i < segU; i++) {
      const a = base + j * (segU + 1) + i, b = a + segU + 1;
      if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const roof = new THREE.BufferGeometry();
  roof.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  roof.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  roof.setIndex(idx);
  roof.computeVertexNormals();
  const vWall = half / reach, uWall = (w / 2) / (w / 2 + over);
  // Ridge: a rounded beam following the raised ends, capped with small curls.
  const ridgePts = Array.from({ length: 13 }, (_, i) => { const u = (i / 12) * 2 - 1; return new THREE.Vector3(X(u) * 0.97, Y(u, 0) + 0.035, 0); });
  const ridge = [new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ridgePts), 24, 0.055, 6)];
  for (const s of [-1, 1]) ridge.push(new THREE.TorusGeometry(0.09, 0.03, 6, 10, Math.PI * 1.3).rotateZ(s > 0 ? -0.3 : Math.PI + 0.3 - Math.PI * 0.3)
    .translate(ridgePts[s > 0 ? 12 : 0].x - s * 0.02, ridgePts[s > 0 ? 12 : 0].y + 0.08, 0));
  // Gable fill under the roof at each end wall (x = ±w/2), following the roof's profile.
  const gable = [];
  if (!single) for (const s of [-1, 1]) {
    const shape = new THREE.Shape();
    const n = 10;
    for (let k = 0; k <= n; k++) { const v = vWall * (1 - k / n); const p = [-v * reach, Y(s * uWall, v) - 0.02]; k ? shape.lineTo(...p) : shape.moveTo(...p); }
    for (let k = 1; k <= n; k++) { const v = vWall * (k / n); shape.lineTo(v * reach, Y(s * uWall, v) - 0.02); }
    shape.lineTo(half, Y(s * uWall, vWall) - 0.4); shape.lineTo(-half, Y(s * uWall, vWall) - 0.4);
    gable.push(new THREE.ShapeGeometry(shape, 2).rotateY(s * Math.PI / 2).translate(s * w / 2, 0, 0));
  }
  return { roof, ridge, gable, wallY: Y(0, vWall) };
}

const LANTERN_COLORS = [0xff2a1a, 0xff2a1a, 0xff6a10, 0xffb21a, 0xff3d6e, 0xb04bff, 0x2fc76a, 0x2a9dff];
export const lanternColor = (r) => new THREE.Color(LANTERN_COLORS[Math.floor(r * LANTERN_COLORS.length)]);

// Hội An shophouse, front facing +z, frontage w along x, depth d back to -z. Pushes into bucket `b`
// already transformed by `m` (so parts can be merged per material).
export function shophouse(b, m, { w, d = 3.2, storeys = 2, g = 1.75, up = 1.45, rand, balcony = false }) {
  const parts = { plaster: [], wood: [], tiles: [], lit: [], dark: [], shutter: [] };
  const top = storeys === 2 ? g + up : g + 0.3;
  // shell: side walls, back wall, recessed shop wall behind a timber arcade
  parts.plaster.push(box(0.16, top, d, -w / 2 + 0.08, top / 2, -d / 2), box(0.16, top, d, w / 2 - 0.08, top / 2, -d / 2), box(w, top, 0.16, 0, top / 2, -d));
  parts.plaster.push(box(w - 0.3, g, 0.14, 0, g / 2, -0.62));
  const bays = w > 2.8 ? 4 : 3, bw = (w - 0.36) / bays;
  for (let i = 0; i < bays; i++) {
    const x = -w / 2 + 0.18 + bw * (i + 0.5);
    if (rand() < 0.62) parts.lit.push(new THREE.PlaneGeometry(bw * 0.86, g * 0.78).translate(x, g * 0.39 + 0.05, -0.54));
    else parts.wood.push(box(bw * 0.9, g * 0.8, 0.05, x, g * 0.4 + 0.05, -0.54, 0.5));
  }
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1, ...(w > 2.8 ? [0] : [])]) parts.wood.push(box(0.13, g, 0.13, x, g / 2, -0.07, 0.5));
  parts.wood.push(box(w, 0.16, 0.7, 0, g - 0.02, -0.34, 0.5)); // floor beam over the arcade
  if (storeys === 2) {
    parts.plaster.push(box(w, up, 0.16, 0, g + up / 2, 0));
    if (balcony) {
      parts.wood.push(box(w - 0.2, 0.06, 0.08, 0, g + 0.62, 0.34, 0.5), box(w - 0.2, 0.05, 0.36, 0, g + 0.06, 0.2, 0.5));
      for (let x = -w / 2 + 0.14; x <= w / 2 - 0.14; x += 0.14) parts.wood.push(box(0.035, 0.56, 0.035, x, g + 0.34, 0.36, 1));
      const dw = w * 0.55;
      parts[rand() < 0.7 ? 'lit' : 'dark'].push(new THREE.PlaneGeometry(dw, up * 0.66).translate(0, g + up * 0.42, 0.085));
      parts.wood.push(box(dw + 0.12, 0.08, 0.06, 0, g + up * 0.78, 0.1, 0.5));
    } else {
      for (const s of (w > 2.6 ? [-1, 1] : [0])) {
        const x = s * w * 0.24, ww = 0.56, wh = 0.72, y = g + up * 0.52;
        parts.wood.push(box(ww + 0.1, 0.07, 0.07, x, y - wh / 2 - 0.03, 0.1, 0.5), box(ww + 0.1, 0.07, 0.07, x, y + wh / 2 + 0.03, 0.1, 0.5));
        parts[rand() < 0.65 ? 'lit' : 'dark'].push(new THREE.PlaneGeometry(ww, wh).translate(x, y, 0.085));
        for (const k of [-1, 1]) { // teal shutters swung open against the wall
          const open = 1.25 + rand() * 0.3;
          parts.shutter.push(new THREE.BoxGeometry(ww / 2, wh, 0.03).translate(k * ww / 4, 0, 0).rotateY(-k * open).translate(x + k * ww / 2, y, 0.1));
        }
      }
    }
    const awn = tileRoof({ w: w + 0.08, d: 0.72, h: 0.3, over: 0.08, lift: 0.08, single: true, segU: 12, segV: 4 });
    const lean = new THREE.Matrix4().makeTranslation(0, g + 0.06, 0.02);
    parts.tiles.push(awn.roof.applyMatrix4(lean), ...awn.ridge.slice(0, 1).map((r) => r.applyMatrix4(lean)));
  }
  const main = tileRoof({ w: w + 0.02, d: d + 0.02, h: 0.95 + rand() * 0.25, over: 0.38, lift: 0.14 });
  const onTop = new THREE.Matrix4().makeTranslation(0, top - main.wallY, -d / 2);
  parts.tiles.push(main.roof.applyMatrix4(onTop), ...main.ridge.map((r) => r.applyMatrix4(onTop)));
  parts.plaster.push(...main.gable.map((gg) => gg.applyMatrix4(onTop)));
  for (const k in parts) for (const geo of parts[k]) b[k].push(geo.applyMatrix4(m));
  // lanterns hanging under the front eave / awning, and the warm light spilling from the shop
  const ly = storeys === 2 ? g - 0.32 : g - 0.1, n = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const p = new THREE.Vector3(-w / 2 + ((i + 0.5) / n) * w, ly - rand() * 0.15, 0.42).applyMatrix4(m);
    const c = lanternColor(rand());
    b.lanterns.push({ p, c, s: 0.5 + rand() * 0.15, drop: 0.2 });
    b.lights.push({ p, c: c.clone().lerp(new THREE.Color(0xffa060), 0.5), r: 3.2, i: 1.6 });
  }
  b.lights.push({ p: new THREE.Vector3(0, g * 0.55, 0.1).applyMatrix4(m), c: new THREE.Color(0xff9a4a), r: 3.5, i: 0.9 });
}

// Wooden river boat with painted eyes on the bow (Hội An style), bow toward +z. Returns geometry parts.
export function boatHull(len = 2.6, beam = 0.62, depth = 0.34) {
  const segU = 20, segV = 10, pos = [], uv = [], idx = [];
  for (let i = 0; i <= segU; i++) for (let j = 0; j <= segV; j++) {
    const u = (i / segU) * 2 - 1, a = (j / segV) * Math.PI; // half-round section
    const width = beam / 2 * Math.sqrt(Math.max(0, 1 - u ** 4)) * (1 - 0.1 * u);
    const sheer = 0.18 * u ** 4; // bow and stern sweep up
    pos.push(-Math.cos(a) * width, -Math.sin(a) * depth * (0.3 + 0.7 * Math.sqrt(Math.max(0, 1 - u * u))) + sheer, u * len / 2);
    uv.push((u + 1) / 2, j / segV);
  }
  for (let i = 0; i < segU; i++) for (let j = 0; j < segV; j++) {
    const a = i * (segV + 1) + j, b = a + segV + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
