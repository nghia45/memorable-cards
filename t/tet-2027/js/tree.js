// Acts 2 & 4: the courtyard and its potted hoa mai tree. The tree blooms a little more with every
// memory opened; memory buds glow on branch tips; opened memories hang as polaroids; at dawn a lì xì hangs.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex, glowTex, printMat, latticeTex } from './print.js';
import { lanternString } from './world.js';
import { bucket, box, tileRoof } from './arch.js';
import { buildBucket, tint } from './river.js';
import { terracotta, stoneWall, bark, withGlow, bakeGlow, repeatMaps } from './tex.js';

const LX_W = 0.36, LX_H = 0.63; // hanging lì xì, same 9:16-ish proportion as the full envelope
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

// Tube along a curve whose radius tapers from r0 to r1 (TubeGeometry only does constant radius).
function taperTube(curve, r0, r1, segs = 10, radial = 7) {
  const frames = curve.computeFrenetFrames(segs, false), len = curve.getLength();
  const pos = [], nor = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, p = curve.getPointAt(t), r = THREE.MathUtils.lerp(r0, r1, t);
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const n = new THREE.Vector3(c * N.x + s * B.x, c * N.y + s * B.y, c * N.z + s * B.z);
      pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
      nor.push(n.x, n.y, n.z);
      uv.push((j / radial) * Math.max(1, Math.round(r0 * 20)), t * len * 3);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// Hoa mai flower: five cupped petals around an orange heart, vertex-coloured (deeper gold at the centre).
function blossomGeo(r = 0.075) {
  const parts = [], inner = new THREE.Color(0xf29a1c), outer = new THREE.Color(0xffd94a), c = new THREE.Color();
  const paint = (g, fn) => {
    const p = g.attributes.position, col = new Float32Array(p.count * 3);
    for (let k = 0; k < p.count; k++) { fn(c, Math.hypot(p.getX(k), p.getY(k)) / r); col.set([c.r, c.g, c.b], k * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  };
  for (let i = 0; i < 5; i++) {
    const g = new THREE.CircleGeometry(r * 0.5, 7).scale(0.85, 1.12, 1).translate(0, r * 0.55, 0);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const d = Math.hypot(p.getX(k), p.getY(k)) / r; p.setZ(k, d * d * r * 0.45); }
    g.rotateZ((i / 5) * Math.PI * 2);
    parts.push(paint(g, (cc, d) => cc.copy(inner).lerp(outer, Math.min(1, d * 1.6))));
  }
  parts.push(paint(new THREE.SphereGeometry(r * 0.2, 6, 3).scale(1, 1, 0.6).translate(0, 0, r * 0.05), (cc) => cc.set(0xb8560f)));
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  g.computeVertexNormals();
  return g;
}

// Blue-and-white glaze: lotus-petal panels at the foot, a flowering branch around the belly, a cloud collar at
// the shoulder, key-fret at the rim. u wraps around, v is height (0 foot → 1 rim).
function potTex() {
  return canvasTex(2048, 512, (x, w, h) => {
    const Y = (v) => (1 - v) * h, cob = '#1b3585', wash = 'rgba(40,78,170,.32)';
    x.fillStyle = '#eef2f3'; x.fillRect(0, 0, w, h);
    const band = (v0, v1) => { x.fillStyle = cob; x.fillRect(0, Y(v1), w, Y(v0) - Y(v1)); };
    const line = (v, lw = 3) => { x.fillStyle = cob; x.fillRect(0, Y(v) - lw / 2, w, lw); };
    band(0, 0.035); line(0.06);
    // lotus-petal panels
    x.lineWidth = 4; x.strokeStyle = cob;
    for (let i = 0; i < 24; i++) {
      const cx = (i + 0.5) * (w / 24), pw = w / 24 * 0.44, b = Y(0.075), t = Y(0.24);
      const petal = new Path2D();
      petal.moveTo(cx - pw, b); petal.bezierCurveTo(cx - pw, t + 30, cx - pw * 0.3, t, cx, t - 6); petal.bezierCurveTo(cx + pw * 0.3, t, cx + pw, t + 30, cx + pw, b);
      x.fillStyle = wash; x.fill(petal); x.stroke(petal);
      x.beginPath(); x.moveTo(cx, b - 8); x.quadraticCurveTo(cx - pw * 0.4, (b + t) / 2, cx, t + 22); x.stroke();
    }
    line(0.255, 4); line(0.27, 2);
    // flowering mai branches with rocks, twice around
    for (let k = 0; k < 2; k++) {
      const ox = k * w / 2;
      x.fillStyle = wash;
      x.beginPath(); x.moveTo(ox + 60, Y(0.28)); x.bezierCurveTo(ox + 120, Y(0.42), ox + 260, Y(0.36), ox + 330, Y(0.28)); x.fill();
      x.lineCap = 'round';
      const branch = (pts, w0) => { for (let i = 1; i < pts.length; i++) { x.lineWidth = w0 * (1 - i / pts.length) + 2; x.beginPath(); x.moveTo(...pts[i - 1]); x.lineTo(...pts[i]); x.stroke(); } };
      x.strokeStyle = cob;
      branch([[ox + 150, Y(0.3)], [ox + 230, Y(0.4)], [ox + 300, Y(0.48)], [ox + 420, Y(0.55)], [ox + 560, Y(0.6)], [ox + 700, Y(0.58)]], 16);
      branch([[ox + 300, Y(0.48)], [ox + 360, Y(0.6)], [ox + 470, Y(0.65)]], 8);
      branch([[ox + 420, Y(0.55)], [ox + 520, Y(0.48)], [ox + 640, Y(0.47)], [ox + 760, Y(0.42)]], 8);
      for (let i = 0; i < 16; i++) {
        const bx = ox + 250 + ((i * 97) % 520), by = Y(0.4 + ((i * 37) % 24) / 100), r = 16 + (i % 3) * 5;
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2 + i;
          x.beginPath(); x.arc(bx + Math.cos(a) * r * 0.6, by + Math.sin(a) * r * 0.6, r * 0.45, 0, 7);
          x.fillStyle = 'rgba(40,78,170,.18)'; x.fill(); x.lineWidth = 2.5; x.stroke();
        }
        x.fillStyle = cob; x.beginPath(); x.arc(bx, by, 3.5, 0, 7); x.fill();
      }
    }
    // cloud collar (ruyi lobes) at the shoulder
    line(0.7, 4);
    for (let i = 0; i < 12; i++) {
      const cx = (i + 0.5) * (w / 12), lw = w / 12 * 0.46, top = Y(0.7), bot = Y(0.6);
      const lobe = new Path2D();
      lobe.moveTo(cx - lw, top); lobe.bezierCurveTo(cx - lw, bot + 10, cx - 20, bot + 30, cx, bot); lobe.bezierCurveTo(cx + 20, bot + 30, cx + lw, bot + 10, cx + lw, top);
      x.fillStyle = wash; x.fill(lobe); x.lineWidth = 4; x.stroke(lobe);
      x.beginPath(); x.arc(cx, bot + 22, 9, 0, 7); x.stroke();
    }
    // key-fret at the rim
    band(0.74, 0.76); band(0.9, 1);
    x.strokeStyle = cob; x.lineWidth = 4;
    for (let i = 0; i < w; i += 36) {
      const a = Y(0.77), b = Y(0.885);
      x.beginPath(); x.moveTo(i, b); x.lineTo(i, a); x.lineTo(i + 26, a); x.lineTo(i + 26, (a + b) / 2 + 6); x.lineTo(i + 12, (a + b) / 2 + 6); x.stroke();
    }
  });
}

// Câu đối: a red board with gold words stacked vertically.
function coupletTex(words) {
  return canvasTex(128, 640, (x, w, h) => {
    x.fillStyle = '#a3101c'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#e2b457'; x.lineWidth = 5; x.strokeRect(8, 8, w - 16, h - 16);
    x.fillStyle = '#f3cf6e'; x.font = '600 38px "Playfair Display"'; x.textAlign = 'center'; x.textBaseline = 'middle';
    words.forEach((wd, i) => x.fillText(wd, w / 2, 70 + i * ((h - 140) / (words.length - 1))));
  });
}

export function createCourtyard({ memoryCount, envelopeTex, mats }) {
  const group = new THREE.Group();
  const rand = rng(20270206);
  const b = bucket();
  const yellow = new THREE.Color(1, 0.96, 0.86);

  // ---------- ground: gạch bát pavers, with lantern light baked in ----------
  const tc = repeatMaps(terracotta(4), [15, 12]);
  const groundGeo = new THREE.PlaneGeometry(24, 19, 60, 48).rotateX(-Math.PI / 2).translate(0, 0, -2.8);
  const ground = new THREE.Mesh(groundGeo, withGlow(new THREE.MeshStandardMaterial({ ...tc, roughness: 1 })));
  ground.receiveShadow = true;
  group.add(ground);
  const stoneMat = new THREE.MeshStandardMaterial({ ...repeatMaps(stoneWall(), [3, 0.4]), roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 0.55), stoneMat);
    step.position.set(0, -0.1 - i * 0.2, 6.75 + i * 0.5);
    step.receiveShadow = true;
    group.add(step);
  }

  // ---------- side walls with a small tile coping ----------
  for (const s of [-1, 1]) {
    const before = b.plaster.length;
    b.plaster.push(box(0.35, 1.5, 13, s * 6.5, 0.75, -0.5, 0.5));
    tint(b.plaster.slice(before), yellow);
    const cop = tileRoof({ w: 13, d: 0.5, h: 0.16, over: 0.12, lift: 0.04, segU: 30, segV: 3 });
    const m = new THREE.Matrix4().makeTranslation(s * 6.5, 1.5 - cop.wallY + 0.02, -0.5).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
    b.tiles.push(cop.roof.applyMatrix4(m));
  }

  // ---------- gate (cổng) at the top of the steps ----------
  const gate = new THREE.Group();
  const gb = bucket();
  {
    const before = gb.plaster.length;
    for (const s of [-1, 1]) gb.plaster.push(box(0.5, 3.0, 0.5, s * 2.2, 1.5, 0), box(0.66, 0.16, 0.66, s * 2.2, 3.08, 0));
    tint(gb.plaster.slice(before), yellow);
    gb.wood.push(box(4.9, 0.26, 0.36, 0, 3.28, 0, 0.5));
    const r = tileRoof({ w: 4.6, d: 1.0, h: 0.55, over: 0.45, lift: 0.34 });
    const m = new THREE.Matrix4().makeTranslation(0, 3.41 - r.wallY, 0);
    gb.tiles.push(r.roof.applyMatrix4(m), ...r.ridge.map((g) => g.applyMatrix4(m)));
    gb.lights.push({ p: new THREE.Vector3(-1.2, 2.7, 0.2), c: new THREE.Color(0xff6a30), r: 3, i: 1.4 }, { p: new THREE.Vector3(1.2, 2.7, 0.2), c: new THREE.Color(0xff6a30), r: 3, i: 1.4 });
  }
  buildBucket(gb, mats, gate);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.42), new THREE.MeshStandardMaterial({
    map: canvasTex(512, 134, (x, w, h) => {
      x.fillStyle = '#7a0d16'; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#e8c064'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16);
      x.fillStyle = '#f1cf77'; x.font = '600 50px "Playfair Display"'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('Cung Chúc Tân Xuân', w / 2, h / 2 + 4);
    }, 2), roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.12,
  }));
  sign.material.emissiveMap = sign.material.map;
  sign.position.set(0, 2.82, 0.2);
  gate.add(sign);
  gate.position.set(0, 0, 5.9);
  group.add(gate);

  // ---------- house at the back: veranda, red columns, lattice doors, big curved roof ----------
  const HZ = -6.2, FRONT = HZ + 1.25; // facade plane, column line
  const veranda = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.32, 1.9), stoneMat);
  veranda.position.set(0, 0.16, HZ + 0.75);
  veranda.receiveShadow = veranda.castShadow = true;
  group.add(veranda);
  b.wood.push(box(13, 3.0, 0.22, 0, 0.32 + 1.5, HZ - 0.1, 0.5)); // timber facade behind the doors
  for (let i = -2; i <= 2; i++) {
    b.lit.push(new THREE.PlaneGeometry(1.35, 2.25).translate(i * 2.3, 0.32 + 1.13, HZ + 0.02));
    b.wood.push(box(1.55, 0.1, 0.08, i * 2.3, 0.32 + 2.3, HZ + 0.03, 0.5), box(1.55, 0.1, 0.08, i * 2.3, 0.37, HZ + 0.03, 0.5));
    b.lights.push({ p: new THREE.Vector3(i * 2.3, 1.3, HZ + 0.6), c: new THREE.Color(0xff9848), r: 4.5, i: 1.3 });
  }
  const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x8e1712, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const colGeo = new THREE.CylinderGeometry(0.13, 0.14, 3.05, 16);
  for (const x of [-5.75, -3.45, -1.15, 1.15, 3.45, 5.75]) { // six columns framing the five doors
    const c = new THREE.Mesh(colGeo, lacquer);
    c.position.set(x, 0.32 + 1.52, FRONT);
    c.castShadow = true;
    group.add(c);
  }
  for (const [x, words] of [[-1.15, ['Phúc', 'Lộc', 'Đầy', 'Nhà']], [1.15, ['Xuân', 'Sang', 'Như', 'Ý']]]) {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 1.35), new THREE.MeshStandardMaterial({ map: coupletTex(words), roughness: 0.5 }));
    board.position.set(x, 1.95, FRONT + 0.145);
    group.add(board);
  }
  {
    const r = tileRoof({ w: 13.2, d: 3.4, h: 1.75, over: 0.75, lift: 0.55, segU: 40, segV: 12 });
    const m = new THREE.Matrix4().makeTranslation(0, 3.4 - r.wallY, FRONT - 1.7);
    b.tiles.push(r.roof.applyMatrix4(m), ...r.ridge.map((g) => g.applyMatrix4(m)));
    b.wood.push(box(13.2, 0.2, 0.2, 0, 3.32, FRONT, 0.5)); // eave beam on the columns
  }

  // Lantern strings across the courtyard and in the gate.
  const strings = [
    lanternString(new THREE.Vector3(-6.4, 3.9, -2.4), new THREE.Vector3(6.4, 3.9, -2.4), 8, 0.55),
    lanternString(new THREE.Vector3(-5.6, 3.4, 4.2), new THREE.Vector3(-5.6, 3.4, -4.6), 5, 0.4),
    lanternString(new THREE.Vector3(5.6, 3.4, 4.2), new THREE.Vector3(5.6, 3.4, -4.6), 5, 0.4),
    lanternString(new THREE.Vector3(-2.0, 3.05, 5.9), new THREE.Vector3(2.0, 3.05, 5.9), 2, 0.25), // even count keeps the centre clear for the camera
  ];
  group.add(...strings);
  const lanternLights = [];
  for (const s of strings) s.traverse((o) => { if (o.isSprite) lanternLights.push({ p: o.getWorldPosition(new THREE.Vector3()), c: new THREE.Color(0xff5a28), r: 3.8, i: 1.1 }); });
  buildBucket(b, mats, group, lanternLights);
  bakeGlow(groundGeo, [...b.lights, ...lanternLights, ...gb.lights.map((l) => ({ ...l, p: l.p.clone().add(gate.position) }))]);

  // ---------- pot ----------
  const potProfile = [[0.36, 0], [0.5, 0.06], [0.62, 0.2], [0.68, 0.36], [0.7, 0.5], [0.67, 0.64], [0.62, 0.74], [0.6, 0.8], [0.66, 0.84], [0.66, 0.88], [0.58, 0.88]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const potGeo = new THREE.LatheGeometry(potProfile, 64);
  { const p = potGeo.attributes.position, uv = potGeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setY(i, p.getY(i) / 0.9); }
  const pot = new THREE.Mesh(potGeo, new THREE.MeshPhysicalMaterial({ map: potTex(), roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 }));
  pot.castShadow = true; pot.receiveShadow = true;
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.58, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x241810, roughness: 1 }));
  soil.position.y = 0.84;
  group.add(pot, soil);
  // moss and pebbles on the soil
  const pebbles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.03, 1).scale(1, 0.5, 1), new THREE.MeshStandardMaterial({ color: 0x8a8278, roughness: 0.8 }), 40);
  for (let i = 0; i < 40; i++) {
    const a = rand() * 6.28, r = 0.15 + rand() * 0.38;
    pebbles.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * r, 0.845, Math.sin(a) * r), new THREE.Quaternion(), new THREE.Vector3().setScalar(0.6 + rand())));
  }
  group.add(pebbles);

  // ---------- procedural mai tree ----------
  const barkGeos = [], twigPts = [], tips = [];
  function branch(start, dir, len, r, depth) {
    const pts = [start.clone()];
    const d = dir.clone().normalize();
    for (let i = 1; i <= 3; i++) {
      d.x += (rand() - 0.5) * 0.5; d.z += (rand() - 0.5) * 0.5; d.y += (rand() - 0.35) * 0.3;
      d.normalize();
      pts.push(pts[i - 1].clone().addScaledVector(d, len / 3));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const rEnd = depth >= 4 ? r * 0.35 : r * 0.62;
    barkGeos.push(taperTube(curve, r, rEnd, depth < 2 ? 14 : 6, depth < 2 ? 12 : 5));
    const end = pts[3];
    if (depth >= 4) { // twig: blossoms along it, tip for memory buds
      for (let i = 0; i < 9; i++) twigPts.push({ p: curve.getPointAt(0.25 + rand() * 0.75), d: d.clone() });
      tips.push({ p: end.clone(), d: d.clone() });
      return;
    }
    if (depth >= 2) for (let i = 0; i < 4; i++) twigPts.push({ p: curve.getPointAt(0.4 + rand() * 0.6), d: d.clone() });
    const kids = depth === 0 ? 5 : depth === 1 ? 3 : 2 + (rand() < 0.6 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const a = (k / kids) * Math.PI * 2 + rand() * 1.2;
      const spread = depth === 0 ? 1.15 : 0.7;
      const nd = d.clone().multiplyScalar(0.7).add(new THREE.Vector3(Math.cos(a) * spread, 0.25 + rand() * 0.35, Math.sin(a) * spread));
      branch(end, nd, len * (depth === 0 ? 0.9 : 0.7), rEnd, depth + 1);
    }
  }
  branch(new THREE.Vector3(0, 0.84, 0), new THREE.Vector3(0.12, 1, 0.05), 0.85, 0.15, 0);
  const bk = bark();
  const barkMat = new THREE.MeshStandardMaterial({ ...bk, roughness: 0.95, normalScale: new THREE.Vector2(1.5, 1.5) });
  const barkMesh = new THREE.Mesh(mergeGeometries(barkGeos), barkMat);
  barkMesh.castShadow = true; barkMesh.receiveShadow = true;
  group.add(barkMesh);

  // Blossoms (and their buds). Each has a bloom threshold; `bloom` 0..1 opens them progressively.
  const flowerGeo = blossomGeo(0.075);
  const flowerMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide, emissive: 0x3a2000 });
  const flowers = [];
  for (const tp of twigPts) for (let i = 0; i < 3; i++) {
    const p = tp.p.clone().add(new THREE.Vector3((rand() - 0.5) * 0.14, (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.14));
    // face outward from the trunk axis and a little up, with random roll
    const out = new THREE.Vector3(p.x, 0.6, p.z).normalize().add(tp.d.clone().multiplyScalar(0.4)).add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.6)).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), out);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rand() * 6));
    flowers.push({ p, q, s: 0.7 + rand() * 0.6, at: rand() });
  }
  const N = flowers.length;
  const blossoms = new THREE.InstancedMesh(flowerGeo, flowerMat, N);
  const buds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.016, 0).scale(1, 1, 1.5), new THREE.MeshStandardMaterial({ color: 0x5a4a1c, roughness: 0.7 }), N);
  blossoms.castShadow = true;
  const tintC = new THREE.Color();
  flowers.forEach((f, i) => blossoms.setColorAt(i, tintC.setHSL(0.13 + rand() * 0.02, 1, 0.82 + rand() * 0.12)));
  group.add(blossoms, buds);
  const m4 = new THREE.Matrix4(), sv = new THREE.Vector3();
  let bloomShown = -1;
  function applyBloom(bl) {
    flowers.forEach((f, i) => {
      const k = THREE.MathUtils.smoothstep(bl, f.at * 0.92, f.at * 0.92 + 0.08);
      blossoms.setMatrixAt(i, m4.compose(f.p, f.q, sv.setScalar(f.s * (0.15 + 0.85 * k) * (k > 0.001 ? 1 : 0))));
      buds.setMatrixAt(i, m4.compose(f.p, f.q, sv.setScalar(1 - k)));
    });
    blossoms.instanceMatrix.needsUpdate = true;
    buds.instanceMatrix.needsUpdate = true;
  }

  // ---------- memory buds: glowing, clickable, spread across the camera-facing side ----------
  const front = tips.filter((t) => t.p.z > 0.25 && t.p.y > 1.5 && t.p.y < 3.2).sort((a, c) => a.p.x - c.p.x);
  const slots = [];
  const score = (t, want) => Math.abs(t.p.x - want) + Math.abs(t.p.y - 2.4) * 0.5 - t.p.z * 0.3;
  for (let i = 0; i < memoryCount; i++) {
    const want = memoryCount === 1 ? 0 : -1.1 + (2.2 * i) / (memoryCount - 1);
    const free = front.filter((t) => slots.every((s) => s.p.distanceTo(t.p) > 0.55));
    const best = (free.length ? free : front).reduce((a, t) => (!a || score(t, want) < score(a, want) ? t : a), null);
    slots.push(best || tips[i]);
  }
  const budGeo = new THREE.LatheGeometry(Array.from({ length: 12 }, (_, i) => {
    const t = i / 11; return new THREE.Vector2(Math.sin(t * Math.PI) ** 0.8 * 0.11 * (1 - t * 0.35), t * 0.3 - 0.09);
  }), 16);
  const memoryBuds = slots.map((s, i) => {
    const g = new THREE.Group();
    g.position.copy(s.p);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffc94a, emissive: 0xffa21a, emissiveIntensity: 1.2, roughness: 0.4 });
    const bud = new THREE.Mesh(budGeo, mat);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd070, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    glow.scale.setScalar(1.4);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.memory = i;
    // opened state: one large blossom that stays, marking the memory
    const open = new THREE.Mesh(flowerGeo, new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffa21a, emissiveIntensity: 0.35, side: THREE.DoubleSide }));
    open.scale.setScalar(0.001);
    open.lookAt(new THREE.Vector3(0, 2, 8).sub(s.p)); // face the viewer's side
    g.add(bud, glow, hit, open);
    group.add(g);
    return { g, bud, glow, hit, open, mat, opened: false, polaroid: null };
  });

  // ---------- hanging things: polaroids for opened memories, and the lì xì at dawn ----------
  const thread = new THREE.LineBasicMaterial({ color: 0xc9a24a });
  const hangers = [];
  function hang(obj, at, drop) {
    const pivot = new THREE.Group();
    pivot.position.copy(at);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, -drop, 0)]), thread);
    obj.position.y = -drop;
    pivot.add(line, obj);
    group.add(pivot);
    hangers.push({ pivot, ph: rand() * 6 });
    return pivot;
  }
  function makePolaroid(polTex) { // the same print as in the pop-up (photo + handwritten date)
    const g = new THREE.Group();
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.285, 0.004), new THREE.MeshStandardMaterial({ color: 0xf6f1e6, roughness: 0.8 }));
    const print = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.285), new THREE.MeshStandardMaterial({ map: polTex, roughness: 0.6 }));
    card.position.y = -0.1425; // hang from the top edge
    print.position.set(0, -0.1425, 0.0025);
    card.castShadow = true;
    g.add(card, print);
    return g;
  }
  let lixi = null, lixiHit = null, lixiEnv = null, lixiGlow = null;
  const LX_DROP = 0.5;

  const tmp = new THREE.Vector3();
  return {
    group, gate,
    FOCUS: new THREE.Vector3(0, 1.9, 0),
    memoryBuds,
    hitTargets: () => memoryBuds.filter((mb) => !mb.opened).map((mb) => mb.hit).concat(lixiHit ? [lixiHit] : []),
    budWorld(i) { return memoryBuds[i].g.getWorldPosition(new THREE.Vector3()); },
    set bloom(bl) { if (Math.abs(bl - bloomShown) > 1e-3) { bloomShown = bl; applyBloom(bl); } },
    // Bud → open blossom. `k` 0..1 drives the unfurl so main.js can sync it with the camera.
    setBudOpen(i, k) {
      const mb = memoryBuds[i];
      mb.bud.scale.set(1 + k * 0.6, Math.max(0.001, 1 - k), 1 + k * 0.6);
      mb.open.scale.setScalar(Math.max(0.001, k * 2.2));
      mb.glow.scale.setScalar(1.4 + k * 1.6);
      mb.glow.material.opacity = 1 - k * 0.6;
      if (k >= 1) { mb.opened = true; mb.bud.visible = false; }
    },
    hangPolaroid(i, polTex) {
      const mb = memoryBuds[i];
      mb.polaroid = hang(makePolaroid(polTex), mb.g.position.clone().add(new THREE.Vector3(0, -0.06, 0.02)), 0.22);
      mb.polaroid.scale.setScalar(0.001);
      return mb.polaroid;
    },
    showLixi() {
      const env = new THREE.Group();
      const face = new THREE.Mesh(new THREE.PlaneGeometry(LX_W, LX_H), printMat(envelopeTex));
      const backMat = new THREE.MeshStandardMaterial({ color: 0x9a0c1e, roughness: 0.6 });
      const backside = new THREE.Mesh(new THREE.PlaneGeometry(LX_W, LX_H), backMat);
      backside.rotation.y = Math.PI; backside.position.z = -0.002;
      env.add(face, backside);
      env.children.forEach((c) => { c.position.y -= LX_H / 2; c.castShadow = true; });
      // front and centre on a long thread, so it hangs below the blossoms against the dark trunk and doors
      const want = new THREE.Vector3(0.1, 2.1, 1.0);
      const spot = tips.filter((t) => slots.every((s) => s.p.distanceTo(t.p) > 0.45))
        .reduce((a, t) => (!a || t.p.distanceTo(want) < a.p.distanceTo(want) ? t : a), null) || tips[0];
      lixi = hang(env, spot.p.clone().add(new THREE.Vector3(0, -0.04, 0.12)), LX_DROP);
      lixi.scale.setScalar(0.001);
      lixiEnv = env;
      lixiHit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.4), new THREE.MeshBasicMaterial({ visible: false }));
      lixiHit.position.y = -LX_DROP - LX_H / 2;
      lixiHit.userData.lixi = true;
      lixi.add(lixiHit);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd9a0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.8 }));
      glow.scale.setScalar(1.5); glow.position.set(0, -LX_DROP - LX_H / 2, -0.05);
      lixi.add(glow);
      lixiGlow = glow;
      return lixi;
    },
    get lixi() { return lixi; },
    hideLixi() { if (lixi) { lixi.visible = false; lixiHit = null; } },
    // Where the lì xì currently is, and its hanging scale relative to the full envelope (0.35 / 2.8).
    lixiPose() { return { pos: lixi.children[1].localToWorld(tmp.set(0, -LX_H / 2, 0)).clone(), scale: LX_H / 2.8 }; },
    tick(t, dt, ambient) {
      memoryBuds.forEach((mb, i) => {
        if (mb.opened) return;
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.3);
        mb.mat.emissiveIntensity = 0.8 + pulse * 0.9;
        mb.glow.material.opacity = 0.55 + pulse * 0.45;
      });
      if (lixiEnv) { // slow twirl catches the foil; a breathing halo says "tap me"
        lixiEnv.rotation.y = Math.sin(t * 0.9) * 0.45 * ambient;
        lixiGlow.material.opacity = 0.55 + 0.45 * Math.sin(t * 2.4);
      }
      hangers.forEach((h) => (h.pivot.rotation.z = Math.sin(t * 1.1 + h.ph) * 0.07 * ambient));
      strings.forEach((s) => s.userData.tick(t));
    },
  };
}
