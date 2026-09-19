// Act 3: the lantern parade to the sân đình, the yard of the village communal house. A lane between low houses
// leads through the trụ biểu gate pillars into a brick yard; the đình stands at the back on its stone platform,
// red columns under a huge swept tile roof with two dragons facing the moon on the ridge (lưỡng long chầu
// nguyệt). Five-colour festival flags on bamboo poles, lanterns strung everywhere, the banyan with the old
// storyteller under it, a ring of children, the lion troupe and its drum, and a bunch of lộc hung on a pole.
import * as THREE from 'three';
import { bucket, box, tileRoof } from './arch.js';
import { terracotta, bakeGlow, withGlow, repeatMaps } from './tex.js';
import { canvasTex, glowTex } from './print.js';
import { rng, buildBucket, tint, taperTube } from './street.js';
import { lanternField, pickColor } from './lanterns.js';
import { makePerson, makeKid } from './figures.js';
import { makeBanyan } from './trees.js';
import { createLionDance } from './lion.js';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
export const EYE = 1.3;
export const LION_AT = new THREE.Vector3(0.6, 0, 0.5);
export const TELLER_AT = new THREE.Vector3(-7.4, 0, 1.6);

function flagTex(i) { // cờ ngũ sắc: a festival flag with a saw-toothed border in the five colours
  const cols = ['#d8202a', '#f2c230', '#2a8a3a', '#2a5ad8', '#f6f2ea'];
  return canvasTex(128, 256, (x, w, h) => {
    x.fillStyle = cols[(i + 1) % 5]; x.fillRect(0, 0, w, h);
    const b = 16;
    for (let k = 0; k < 16; k++) { x.fillStyle = cols[k % 5]; x.beginPath(); x.moveTo(0, k * 16); x.lineTo(b, k * 16 + 8); x.lineTo(0, k * 16 + 16); x.fill(); x.beginPath(); x.moveTo(w, k * 16); x.lineTo(w - b, k * 16 + 8); x.lineTo(w, k * 16 + 16); x.fill(); }
    x.fillStyle = cols[(i + 3) % 5]; x.beginPath(); x.arc(w / 2, h * 0.4, 26, 0, 7); x.fill();
  });
}
function boardTex() { // hoành phi over the middle bay
  return canvasTex(512, 128, (x, w, h) => {
    x.fillStyle = '#8a1010'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#e8c060'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16);
    x.fillStyle = '#f2d27a'; x.font = '700 58px "Playfair Display"'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('ĐÌNH LÀNG', w / 2, h / 2 + 4);
  });
}

export function createDinh(mats) {
  const group = new THREE.Group();
  const rand = rng(1515);
  const b = bucket();
  const lan = { star: [], carp: [], ball: [] };

  // ---------- the đình: platform, columns, lattice doors, the great roof ----------
  const DZ = -9, W = 16, D = 9, PH = 0.8, CH = 3.0;
  b.plaster.push(box(W + 1, PH, D + 1, 0, PH / 2, DZ, 1));
  for (let i = 0; i < 4; i++) b.plaster.push(box(4, 0.2, 0.4, 0, PH - 0.2 * (i + 1) + 0.1, DZ + D / 2 + 0.7 + i * 0.4, 1)); // steps
  tint(b.plaster, new THREE.Color(0.75, 0.74, 0.72));
  const redCol = [];
  for (const z of [DZ + D / 2 - 0.5, DZ + D / 2 - 3.2]) for (let i = 0; i < 8; i++) {
    const x = -W / 2 + 0.9 + i * ((W - 1.8) / 7);
    redCol.push(new THREE.CylinderGeometry(0.19, 0.22, CH, 14).translate(x, PH + CH / 2, z));
    redCol.push(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 12).translate(x, PH + 0.08, z)); // stone plinth
  }
  const back = [box(W, CH, 0.25, 0, PH + CH / 2, DZ - D / 2 + 0.6), box(0.25, CH, D - 1, -W / 2 + 0.2, PH + CH / 2, DZ), box(0.25, CH, D - 1, W / 2 - 0.2, PH + CH / 2, DZ)];
  tint(back, new THREE.Color(0.9, 0.78, 0.6)); b.plaster.push(...back);
  for (let i = 0; i < 5; i++) b.lit.push(new THREE.PlaneGeometry(2.0, 2.4).translate(-5 + i * 2.5, PH + 1.3, DZ - D / 2 + 0.75)); // lattice doors, lit inside
  b.wood.push(box(W, 0.3, 0.3, 0, PH + CH, DZ + D / 2 - 0.5), box(W, 0.3, 0.3, 0, PH + CH, DZ + D / 2 - 3.2)); // beams
  const roof = tileRoof({ w: W + 0.4, d: D + 0.4, h: 3.6, over: 1.4, lift: 1.1, segU: 32, segV: 10 });
  const onTop = new THREE.Matrix4().makeTranslation(0, PH + CH + 0.15 - roof.wallY, DZ);
  b.tiles.push(roof.roof.applyMatrix4(onTop), ...roof.ridge.map((r) => r.applyMatrix4(onTop)));
  const gables = roof.gable.map((g) => g.applyMatrix4(onTop)); tint(gables, new THREE.Color(0.9, 0.78, 0.6)); b.plaster.push(...gables);
  const ridgeY = PH + CH + 0.15 - roof.wallY + 3.6;
  b.lights.push({ p: new THREE.Vector3(0, PH + 1.5, DZ - 1), c: new THREE.Color(0xff9a50), r: 7, i: 2.2 });
  // lưỡng long chầu nguyệt: two dragons on the ridge, facing a moon disc
  const dragonMat = std(0x3a8a6a, { roughness: 0.4, metalness: 0.3 });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), new THREE.MeshStandardMaterial({ color: 0xffe8b0, emissive: 0xffd080, emissiveIntensity: 0.8 }));
  orb.position.set(0, ridgeY + 0.55, DZ);
  group.add(orb);
  for (const s of [-1, 1]) {
    const pts = Array.from({ length: 9 }, (_, i) => { const t = i / 8; return new THREE.Vector3(s * (0.45 + t * 2.4), ridgeY + 0.3 + Math.sin(t * Math.PI * 2.2) * 0.22 + (1 - t) * 0.35, DZ + Math.cos(t * 7) * 0.05); });
    const body = new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts), 0.13, 0.03, 30, 8), dragonMat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10).scale(1.4, 1, 0.9), dragonMat); head.position.copy(pts[0]).add(new THREE.Vector3(-s * 0.1, 0.1, 0));
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 5), dragonMat); horn.position.copy(head.position).add(new THREE.Vector3(s * 0.05, 0.18, 0)); horn.rotation.z = s * 0.5;
    group.add(body, head, horn);
  }
  // hoành phi
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), std(0xffffff, { map: boardTex(), roughness: 0.4, emissive: 0x331100 }));
  board.position.set(0, PH + CH - 0.45, DZ + D / 2 - 0.3);
  group.add(board);

  // ---------- the yard: brick, the trụ biểu gate pillars, low walls, the lane outside ----------
  const pillars = [];
  for (const [x, h] of [[-2.6, 6.2], [2.6, 6.2], [-6.4, 4.6], [6.4, 4.6]]) {
    pillars.push(box(0.75, h, 0.75, x, h / 2, 12, 0.5), box(1.0, 0.25, 1.0, x, h + 0.1, 12, 0.5), box(0.6, 0.7, 0.6, x, h + 0.55, 12, 0.5));
    b.tiles.push(new THREE.ConeGeometry(0.55, 0.45, 4).rotateY(Math.PI / 4).translate(x, h + 1.12, 12));
    b.lights.push({ p: new THREE.Vector3(x, h + 0.6, 12.4), c: new THREE.Color(0xffa060), r: 3, i: 1 });
  }
  for (const s of [-1, 1]) pillars.push(box(4.4, 1.8, 0.35, s * 8.8, 0.9, 12, 0.5), box(0.35, 1.8, 24, s * 11, 0.9, 0, 0.5));
  tint(pillars, new THREE.Color(1.0, 0.95, 0.85));
  b.plaster.push(...pillars);
  // houses along the lane outside the gate
  for (const s of [-1, 1]) for (let z = 14; z < 30; z += 3.4 + rand()) {
    const w = 3.2, h = 2.6 + rand() * 0.8, x = s * (4.2 + rand() * 0.5);
    const parts = [box(3.0, h, w, x + s * 1.5, h / 2, z + w / 2, 0.5)];
    tint(parts, new THREE.Color(1.02, 0.92, 0.7).lerp(new THREE.Color(0.85, 0.9, 0.85), rand()));
    b.plaster.push(...parts);
    const r = tileRoof({ w: w + 0.2, d: 3.4, h: 1.2, over: 0.4, lift: 0.2, segU: 10, segV: 4 });
    const m = new THREE.Matrix4().makeTranslation(x + s * 1.5, h - r.wallY + 0.1, z + w / 2).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
    b.tiles.push(r.roof.applyMatrix4(m), ...r.ridge.map((g) => g.applyMatrix4(m)));
    b.lit.push(new THREE.PlaneGeometry(0.9, 1.5).rotateY(-s * Math.PI / 2).translate(x - s * 0.01, 1.0, z + w / 2));
    b.lights.push({ p: new THREE.Vector3(x - s * 0.6, 1.2, z + w / 2), c: new THREE.Color(0xff9a50), r: 3, i: 1.1 });
    for (let k = 0; k < 2; k++) lan[rand() < 0.6 ? 'star' : 'ball'].push({ p: new THREE.Vector3(x - s * 0.4, 2.3, z + 0.8 + k * 1.6), c: pickColor('star', rand()), s: 1.1, ry: rand() * 6, drop: 0.15 });
  }
  // lantern strings: across the lane, and from the gate to the đình
  const lines = [];
  const string = (a, c, n, sag, kind) => {
    const pt = (k) => new THREE.Vector3().lerpVectors(a, c, k).setY(THREE.MathUtils.lerp(a.y, c.y, k) - Math.sin(k * Math.PI) * sag);
    for (let i = 0; i < 16; i++) lines.push(pt(i / 16), pt((i + 1) / 16));
    for (let i = 0; i < n; i++) { const k2 = kind || (rand() < 0.55 ? 'star' : rand() < 0.5 ? 'carp' : 'ball'); const p = pt((i + 0.5) / n); lan[k2].push({ p, c: pickColor(k2, rand()), s: k2 === 'star' ? 1.4 : 1.2, ry: rand() * 6, drop: 0.2 }); }
    b.lights.push({ p: pt(0.5).setY(pt(0.5).y - 0.8), c: new THREE.Color(0xff8a50), r: 5, i: 1.0 });
  };
  for (let z = 15; z < 30; z += 3.5) string(new THREE.Vector3(-4, 3.2, z), new THREE.Vector3(4, 3.2, z + 0.5), 7, 0.5);
  for (const x of [-6.4, -2.6, 2.6, 6.4]) string(new THREE.Vector3(x, x * x > 20 ? 4.6 : 6, 12), new THREE.Vector3(x * 1.2, PH + CH + 0.2, DZ + D / 2 - 0.5), 12, 1.3);
  string(new THREE.Vector3(-11, 3.6, 6), new THREE.Vector3(11, 3.6, 6.5), 14, 1.0);
  string(new THREE.Vector3(-11, 3.6, 0), new THREE.Vector3(11, 3.6, -0.5), 14, 1.0);
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines), new THREE.LineBasicMaterial({ color: 0x1a120c })));
  // festival flags on bamboo poles along both sides
  const poleMat = std(0xc8a060);
  for (const s of [-1, 1]) for (const z of [8, 2, -4]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 7.5, 6), poleMat); pole.position.set(s * 10.2, 3.75, z); pole.castShadow = true;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2, 1, 8), std(0xffffff, { map: flagTex(z + s * 3), side: THREE.DoubleSide, roughness: 0.8 }));
    flag.geometry.translate(0, -1.1, 0);
    flag.position.set(s * 10.2, 7.2, z); flag.rotation.y = Math.PI / 2 * s;
    group.add(pole, flag);
  }
  buildBucket(b, mats, group);
  group.add(new THREE.Mesh(mergeAll(redCol), std(0xa8161a, { roughness: 0.35 })));
  const fields = ['star', 'carp', 'ball'].map((k) => lanternField(k, lan[k], { halo: 1.0, haloOpacity: 0.28 }));
  group.add(...fields);
  const tc = repeatMaps(terracotta(4), [26 / 1.6, 44 / 1.6]);
  const yardGeo = new THREE.PlaneGeometry(26, 44, 40, 70).rotateX(-Math.PI / 2).translate(0, 0, 6);
  bakeGlow(yardGeo, b.lights);
  group.add(Object.assign(new THREE.Mesh(yardGeo, withGlow(new THREE.MeshStandardMaterial({ ...tc, roughness: 0.9 }))), { receiveShadow: true }));

  // ---------- the banyan, and the storyteller under it ----------
  const banyan = makeBanyan({ rand, lean: new THREE.Vector3(1, 0, 0.2) });
  banyan.position.set(-8.6, 0, -0.4);
  group.add(banyan);
  const teller = makePerson({ elder: true, top: 0x2a2a3a, bottom: 0x2a2a30, outfit: 'shirt', hat: 'khanxep', beard: true, glasses: false, closedEyes: true });
  teller.sit(false);
  teller.legs.forEach((l) => { l.hp.rotation.x = -1.3; l.kn.rotation.x = 1.8; });
  teller.g.position.set(TELLER_AT.x, teller.g.position.y + 0.42, TELLER_AT.z);
  teller.g.rotation.y = 1.2;
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.4, 6).translate(0, 0.7, 0), std(0x6a4a2a));
  staff.position.copy(teller.arms[1].hand); staff.rotation.x = 0.2;
  teller.pose('R', -0.9, 0.1, -0.4);
  teller.arms[1].el.add(staff);
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.42, 8).translate(0, 0.21, 0), std(0x6a3f22)); stool.position.copy(TELLER_AT);
  group.add(teller.g, stool);
  const listeners = [];
  for (let i = 0; i < 5; i++) {
    const k = makeKid(rand, i % 2 ? 'star' : null);
    k.sit(true);
    const a = 1.2 + (i - 2) * 0.35, r = 1.4;
    k.g.position.set(TELLER_AT.x + Math.sin(a) * r, k.g.position.y, TELLER_AT.z + Math.cos(a) * r);
    k.g.rotation.y = a + Math.PI;
    if (k.lantern) { k.pose('R', -1.6, 0.1, -0.2); }
    group.add(k.g); listeners.push(k);
  }
  const tellerHit = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.8, 8), new THREE.MeshBasicMaterial({ visible: false }));
  tellerHit.position.copy(TELLER_AT).setY(0.9);
  group.add(tellerHit);

  // ---------- the lion troupe, the drum, the lộc on its pole, and a ring of children ----------
  const lion = createLionDance();
  lion.group.position.copy(LION_AT);
  lion.group.rotation.y = 0.15;
  group.add(lion.group);
  lion.halo.visible = false;
  const drumHit = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
  group.add(drumHit);
  const loc = new THREE.Group();
  const lp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 3.4, 6).translate(0, 1.7, 0), poleMat);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 5).rotateZ(Math.PI / 2).translate(-0.4, 3.35, 0), poleMat);
  const env = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.02), std(0xd8141e, { emissive: 0x440000 })); env.position.set(-0.78, 2.75, 0);
  const lettuce = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 1), std(0x5aa83a, { flatShading: true })); lettuce.position.set(-0.78, 3.0, 0);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.4, 3).translate(-0.78, 3.15, 0), std(0xd8141e));
  loc.add(lp, arm, env, lettuce, cord);
  loc.position.set(LION_AT.x + 1.9, 0, LION_AT.z - 2.2);
  loc.rotation.y = -0.6;
  loc.traverse((o) => o.isMesh && (o.castShadow = true));
  group.add(loc);
  const ring = [];
  for (let i = 0; i < 14; i++) {
    const a = -0.5 + (i / 13) * 2.7 + (rand() - 0.5) * 0.1, r = 4.2 + rand() * 0.8;
    const k = makeKid(rand, rand() < 0.6 ? 'star' : rand() < 0.5 ? 'carp' : 'ball');
    k.g.position.set(LION_AT.x + Math.sin(a) * r, 0, LION_AT.z + Math.cos(a) * r);
    k.g.rotation.y = a + Math.PI;
    group.add(k.g); ring.push({ k, a, r, ph: rand() * 6 });
  }
  const adults = [];
  for (let i = 0; i < 6; i++) {
    const girl = rand() < 0.5, a = -0.4 + i * 0.5, r = 6 + rand() * 0.8;
    const p = makePerson({ girl, top: [0xf2efe6, 0x6a8ab8, 0xd8a8a0, 0x3a4a5a, 0xe8d8b0, 0xb05a4a][i], bottom: 0x2a2e38, hair: girl ? 'long' : 'short', outfit: 'shirt' });
    p.g.position.set(LION_AT.x + Math.sin(a) * r, 0, LION_AT.z + Math.cos(a) * r); p.g.rotation.y = a + Math.PI;
    group.add(p.g); adults.push(p);
  }

  // ---------- the parade: children walking the lane with the viewer ----------
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0, EYE, 29), new THREE.Vector3(0.3, EYE, 22), new THREE.Vector3(-0.2, EYE, 15), new THREE.Vector3(0, EYE, 10), new THREE.Vector3(0.4, EYE, 6.5)], false, 'centripetal');
  const paraders = [];
  for (let i = 0; i < 14; i++) {
    const k = makeKid(rand, i === 3 ? 'carp' : rand() < 0.55 ? 'star' : rand() < 0.5 ? 'carp' : 'ball');
    paraders.push({ k, lead: 1.2 + i * 0.75 + rand() * 0.4, side: (i % 2 ? 1 : -1) * (0.6 + rand() * 0.6) });
    group.add(k.g);
  }
  const carpKid = paraders[3];

  // ---------- the bridge of moonlight (hidden until the staff is thrown) ----------
  const bridge = new THREE.Group();
  const shimmer = canvasTex(64, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.2, 'rgba(210,225,255,.8)'); g.addColorStop(0.5, 'rgba(255,250,235,1)'); g.addColorStop(0.8, 'rgba(210,225,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(Math.random() * w, Math.random() * h, 2, 6); }
  });
  shimmer.wrapT = THREE.RepeatWrapping; shimmer.colorSpace = THREE.SRGBColorSpace;
  const bridgeMat = new THREE.MeshBasicMaterial({ map: shimmer, color: new THREE.Color(1.6, 1.6, 1.7), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  group.add(bridge);

  return {
    group, lion, drumHit, loc, env, lettuce, teller, staff, tellerHit, banyan, ring, path, paraders, carpKid, bridge, bridgeMat, listeners,
    // build the bridge along a world-space curve (called once the moon direction is known)
    buildBridge(curve) {
      const N = 300, pos = [], uv = [], idx = [];
      const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3();
      for (let i = 0; i <= N; i++) {
        const t = i / N, p = curve.getPointAt(t), tg = curve.getTangentAt(t), w = 0.9 + t * 4;
        side.crossVectors(tg, up).normalize();
        const l = group.worldToLocal(p.clone().addScaledVector(side, -w)), r = group.worldToLocal(p.clone().addScaledVector(side, w));
        pos.push(l.x, l.y, l.z, r.x, r.y, r.z); uv.push(0, t * 30, 1, t * 30);
      }
      for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      bridge.clear();
      const m = new THREE.Mesh(g, bridgeMat); m.frustumCulled = false; m.renderOrder = 5;
      bridge.add(m);
    },
    // the parade walks with the viewer; `u` is the viewer's progress on the lane
    tickParade(u, t, speed) {
      const len = path.getLength();
      for (const p of paraders) {
        const uu = THREE.MathUtils.clamp(u + p.lead / len, 0, 1);
        const pt = path.getPointAt(uu), tg = path.getTangentAt(Math.min(uu, 0.999));
        const sideV = new THREE.Vector3(-tg.z, 0, tg.x).normalize();
        p.k.g.position.set(pt.x + sideV.x * p.side, 0, pt.z + sideV.z * p.side);
        p.k.g.rotation.y = Math.atan2(tg.x, tg.z);
        p.k.tick(t, speed);
      }
    },
    tick(t, dt, ambient) {
      for (const f of fields) f.userData.tick(t * ambient);
      for (const r of ring) { r.k.tick(t, 0); r.k.body.position.y = Math.abs(Math.sin(t * 3 + r.ph)) * 0.02; }
      for (const l of listeners) l.tick(t, 0);
      bridgeMat.map.offset.y = -t * 0.4;
      loc.rotation.z = Math.sin(t * 0.8) * 0.01;
      // the lion's drum sits in the lion group: keep its hit sphere on it
      lion.drum.getWorldPosition(drumHit.position); group.worldToLocal(drumHit.position); drumHit.position.y = 0.75;
    },
  };
}
function mergeAll(list) { return mergeGeometries(list.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n; })); }
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
