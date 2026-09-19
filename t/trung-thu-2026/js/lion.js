// Múa lân at the gate: a Vietnamese lion (round painted head, forehead mirror and horn, blinking eyes, fur
// brows, clacking jaw, flapping ears, a cloth body over two dancers), Ông Địa with his palm-leaf fan, and the drum.
// Also exports makeLionHead() so a small mask can sit on the mâm cỗ.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex, glowTex } from './print.js';
import { tween, ease, lerp } from './tween.js';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const gold = new THREE.MeshStandardMaterial({ color: 0xe0b04a, metalness: 1, roughness: 0.3 });

function headTex(base) {
  return canvasTex(1024, 512, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(0,0,0,.25)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // painted flame curls and scale rows around the head, gold outlines
    x.lineWidth = 7; x.strokeStyle = '#f7d36b'; x.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const cx = (i + 0.5) * (w / 16), cy = h * 0.72;
      x.beginPath(); x.arc(cx, cy, 26, Math.PI, 0); x.stroke();
      x.beginPath(); x.arc(cx + w / 32, cy + 36, 26, Math.PI, 0); x.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const cx = (i + 0.5) * (w / 8);
      x.fillStyle = i % 2 ? '#2a8a4a' : '#1f5fae';
      x.beginPath(); x.moveTo(cx - 40, h * 0.5); x.quadraticCurveTo(cx - 20, h * 0.28, cx, h * 0.2); x.quadraticCurveTo(cx + 20, h * 0.28, cx + 40, h * 0.5); x.closePath(); x.fill();
      x.strokeStyle = '#f7d36b'; x.lineWidth = 5; x.stroke();
    }
    x.fillStyle = '#f7d36b';
    for (let i = 0; i < 60; i++) { x.beginPath(); x.arc(Math.random() * w, h * 0.1 + Math.random() * h * 0.15, 5, 0, 7); x.fill(); }
  }, 1);
}
function bodyTex() {
  return canvasTex(512, 1024, (x, w, h) => {
    x.fillStyle = '#e8b62a'; x.fillRect(0, 0, w, h);
    const cols = 8, rows = 18, cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows; r++) for (let c = -1; c <= cols; c++) {
      const cx = c * cw + (r % 2) * cw / 2 + cw / 2, cy = r * rh + rh * 0.3;
      x.fillStyle = r % 3 === 0 ? '#d8322a' : r % 3 === 1 ? '#f2c94a' : '#e87a2a';
      x.beginPath(); x.arc(cx, cy, cw * 0.48, 0, Math.PI); x.fill();
      x.strokeStyle = '#8a1a14'; x.lineWidth = 3; x.stroke();
    }
    // green spine stripe with pom-poms (u = 0.25 runs along the top)
    x.fillStyle = '#2a8a4a'; x.fillRect(w * 0.2, 0, w * 0.1, h);
    x.fillStyle = '#ffffff'; for (let y = 20; y < h; y += 64) { x.beginPath(); x.arc(w * 0.25, y, 14, 0, 7); x.fill(); }
  });
}
function faceTex() { // Ông Địa's mask: bald, huge laughing grin, closed crescent eyes, pink cheeks
  return canvasTex(512, 256, (x, w, h) => {
    x.fillStyle = '#f2c79a'; x.fillRect(0, 0, w, h);
    const cx = w * 0.25; // SphereGeometry faces +z at u = 0.25
    x.fillStyle = 'rgba(240,120,120,.55)';
    for (const s of [-1, 1]) { x.beginPath(); x.ellipse(cx + s * 60, h * 0.56, 26, 16, 0, 0, 7); x.fill(); }
    x.strokeStyle = '#3a2210'; x.lineWidth = 6; x.lineCap = 'round';
    for (const s of [-1, 1]) { x.beginPath(); x.arc(cx + s * 34, h * 0.44, 14, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); }
    x.fillStyle = '#7a1a1a'; x.beginPath(); x.moveTo(cx - 60, h * 0.6); x.quadraticCurveTo(cx, h * 0.95, cx + 60, h * 0.6); x.closePath(); x.fill();
    x.fillStyle = '#fff'; x.fillRect(cx - 44, h * 0.6, 88, 9);
    x.strokeStyle = '#3a2210'; x.lineWidth = 4; x.beginPath(); x.arc(cx, h * 0.52, 10, 0.2, Math.PI - 0.2); x.stroke();
  });
}

// Head built facing +z, pivot at the neck. Returns parts for animation.
export function makeLionHead(palette = { base: '#d8322a', trim: [0xf2c94a, 0xd8322a, 0x2a8a4a, 0xffffff] }) {
  const head = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 36, 24).scale(1.08, 0.88, 0.95), std(0xffffff, { map: headTex(palette.base), roughness: 0.45 }));
  shell.position.set(0, 0.1, 0);
  // brow ridge and snout: gold-edged bumps
  const brow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 12).scale(2.1, 0.55, 0.9), std(0x2a8a4a, { roughness: 0.4 }));
  brow.position.set(0, 0.26, 0.26);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14).scale(1.4, 0.9, 1), std(0xe8452a, { roughness: 0.4 }));
  snout.position.set(0, 0.02, 0.38);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), gold);
  nose.position.set(0, 0.06, 0.52);
  const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), new THREE.MeshStandardMaterial({ color: 0xeef4ff, metalness: 1, roughness: 0.05 }));
  mirror.position.set(0, 0.42, 0.3); mirror.rotation.x = -0.55;
  const mirrorRim = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.014, 6, 24), gold);
  mirrorRim.position.copy(mirror.position); mirrorRim.rotation.copy(mirror.rotation);
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 10), gold);
  horn.position.set(0, 0.5, 0.18); horn.rotation.x = -0.4;
  head.add(shell, brow, snout, nose, mirror, mirrorRim, horn);
  // eyes with lids
  const eyeMat = std(0xffffff, { roughness: 0.2 }), pupilMat = std(0x111111, { roughness: 0.1 });
  const lidMat = std(0xf2c94a, { roughness: 0.4 });
  const lids = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(s * 0.17, 0.2, 0.33);
    eye.add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 12), eyeMat));
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), pupilMat); pupil.position.z = 0.055; eye.add(pupil);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.092, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), lidMat);
    lid.rotation.x = -0.25; eye.add(lid); lids.push(lid);
    head.add(eye);
  }
  // fur: white brows and beard, a coloured pom-pom ring around the back of the head
  const fur = [];
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) fur.push(new THREE.IcosahedronGeometry(0.035, 1).translate(s * (0.07 + i * 0.035), 0.31 + Math.sin(i / 6 * Math.PI) * 0.04, 0.36 - i * 0.012));
  const furMesh = new THREE.Mesh(mergeGeometries(fur), std(0xffffff, { roughness: 0.95 }));
  head.add(furMesh);
  const ring = [];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2, g = new THREE.IcosahedronGeometry(0.06, 1).translate(Math.cos(a) * 0.44, 0.1 + Math.sin(a) * 0.38, -0.12);
    ring.push({ g, c: palette.trim[i % palette.trim.length] });
  }
  for (const c of new Set(ring.map((r) => r.c))) head.add(new THREE.Mesh(mergeGeometries(ring.filter((r) => r.c === c).map((r) => r.g)), std(c, { roughness: 0.95 })));
  // ears
  const ears = [-1, 1].map((s) => {
    const e = new THREE.Group(); e.position.set(s * 0.3, 0.38, 0.05);
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 10).scale(1, 1, 0.4), std(0xf2c94a)); m.position.y = 0.08; e.add(m);
    head.add(e); return e;
  });
  // jaw: hinged under the snout, dark mouth, a row of teeth, and the beard
  const jaw = new THREE.Group(); jaw.position.set(0, -0.08, 0.12);
  const jawShell = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.05, 0.45, 1.05), std(palette.base === '#d8322a' ? 0xe8452a : 0x2a6aae));
  jawShell.position.z = 0.12;
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.27, 24).rotateX(-Math.PI / 2).scale(1.05, 1, 1.05), std(0x5a0a0a));
  mouth.position.set(0, 0.005, 0.12);
  const teeth = new THREE.Mesh(mergeGeometries(Array.from({ length: 8 }, (_, i) => new THREE.ConeGeometry(0.018, 0.05, 6).translate(-0.14 + i * 0.04, 0.02, 0.36 - Math.abs(i - 3.5) * 0.015))), std(0xffffff, { roughness: 0.3 }));
  const beard = new THREE.Mesh(mergeGeometries(Array.from({ length: 9 }, (_, i) => new THREE.IcosahedronGeometry(0.05, 1).translate(-0.16 + i * 0.04, -0.14 - Math.sin(i / 8 * Math.PI) * 0.08, 0.3)).concat([new THREE.ConeGeometry(0.1, 0.3, 10).rotateX(Math.PI).translate(0, -0.25, 0.28).toNonIndexed()])), std(0xffffff, { roughness: 0.95 }));
  jaw.add(jawShell, mouth, teeth, beard);
  head.add(jaw);
  head.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return {
    head, jaw, lids, ears,
    // idle life: blink, ear flicks, jaw breathing. `clack` adds jaw snaps (0..1).
    animate(t, clack = 0) {
      const blink = (t % 3.7) < 0.14 ? 1 : 0;
      for (const l of lids) l.rotation.x = lerp(-0.25, 1.35, blink);
      ears.forEach((e, i) => (e.rotation.z = (i ? -1 : 1) * (0.2 + Math.sin(t * 3 + i) * 0.12 + clack * 0.3)));
      jaw.rotation.x = 0.08 + Math.max(0, Math.sin(t * 1.3)) * 0.06 + clack * 0.45;
    },
  };
}

// Cloth body over two dancers, deformed along a spine each frame. Spine points are in lion-local space.
function makeCloth() {
  const RINGS = 20, RAD = 16;
  const geo = new THREE.CylinderGeometry(1, 1, 1, RAD, RINGS - 1, true);
  const mat = std(0xffffff, { map: bodyTex(), side: THREE.DoubleSide, roughness: 0.8 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  const pos = geo.attributes.position, idx = [];
  // Cylinder vertices go ring by ring from the top (y = 0.5) down; remember each vertex's ring and angle.
  for (let i = 0; i < pos.count; i++) idx.push({ ring: Math.round((0.5 - pos.getY(i)) * (RINGS - 1)), a: Math.atan2(pos.getZ(i), pos.getX(i)) });
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
  const p = new THREE.Vector3(), tng = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3();
  const centers = [], frames = [];
  return {
    mesh,
    update(spine, t) {
      spine.forEach((s, i) => curve.points[i].copy(s));
      for (let r = 0; r < RINGS; r++) {
        const u = r / (RINGS - 1);
        curve.getPointAt(u, p); curve.getTangentAt(u, tng);
        side.set(tng.z, 0, -tng.x).normalize(); up.crossVectors(tng, side).normalize();
        centers[r] = p.clone(); frames[r] = [side.clone(), up.clone()];
      }
      for (let i = 0; i < pos.count; i++) {
        const { ring, a } = idx[i], u = ring / (RINGS - 1);
        const rx = 0.42 * (1 - u * 0.25), ry = 0.36 * (1 - u * 0.2) + (u > 0.9 ? -0.1 : 0);
        const sway = Math.sin(t * 5 + u * 6) * 0.015;
        const [sd, upv] = frames[ring], c = centers[ring];
        const ca = Math.cos(a), sa = Math.sin(a);
        // the bottom of the cloth hangs open (skirt): flatten the lower arc downward
        const drop = sa > 0.2 ? (sa - 0.2) * 0.35 : 0;
        pos.setXYZ(i, c.x + sd.x * ca * (rx + sway) + upv.x * (-sa * ry - drop), c.y + sd.y * ca * rx + upv.y * (-sa * ry - drop) - drop * 0.2, c.z + sd.z * ca * (rx + sway) + upv.z * (-sa * ry - drop));
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}

function makeLegs(color) {
  const g = new THREE.Group();
  const pants = std(color, { roughness: 0.8 }), shoe = std(0x1a1a1a), furM = std(0xffffff, { roughness: 0.95 });
  const legs = [-1, 1].map((s) => {
    const l = new THREE.Group(); l.position.set(s * 0.14, 0.72, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.5, 4, 8).translate(0, -0.33, 0), pants);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.035, 6, 12).rotateX(Math.PI / 2).translate(0, -0.6, 0), furM);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.22).translate(0, -0.7, 0.05), shoe);
    l.add(leg, cuff, foot);
    l.traverse((o) => (o.castShadow = true));
    g.add(l);
    return l;
  });
  return { g, legs };
}

export function createLionDance() {
  const group = new THREE.Group();
  const lion = new THREE.Group();
  group.add(lion);
  const { head, jaw, animate } = makeLionHead();
  const neck = new THREE.Group(); // head carrier: the front dancer lifts, bobs and turns it
  neck.position.set(0, 1.05, 0.25);
  neck.add(head);
  lion.add(neck);
  const cloth = makeCloth();
  lion.add(cloth.mesh);
  const front = makeLegs(0xd8322a), back = makeLegs(0xd8322a);
  front.g.position.z = 0.05; back.g.position.z = -1.3;
  lion.add(front.g, back.g);
  const tail = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), std(0xf2c94a, { roughness: 0.95 }));
  lion.add(tail);

  // Ông Địa: round belly, big laughing mask, palm-leaf fan
  const ongDia = new THREE.Group();
  const robe = std(0xc9822a, { roughness: 0.85 });
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 16).scale(1, 1.05, 0.95), std(0xf0c090, { roughness: 0.7 }));
  belly.position.y = 0.62;
  const shirt = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 16, Math.PI * 0.8, Math.PI * 1.4).scale(1.05, 1.15, 1.05), robe); // open robe: the belly shows
  shirt.position.y = 0.66;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), std(0xffffff, { map: faceTex(), roughness: 0.6 }));
  face.position.y = 1.12;
  const legsOD = makeLegs(0x7a4a22); legsOD.g.scale.setScalar(0.62);
  const fanPivot = new THREE.Group(); fanPivot.position.set(0.34, 0.8, 0.12);
  const fanShape = new THREE.Shape(); fanShape.moveTo(0, 0); fanShape.quadraticCurveTo(0.26, 0.05, 0.3, 0.3); fanShape.quadraticCurveTo(0.1, 0.36, -0.05, 0.28); fanShape.quadraticCurveTo(-0.04, 0.1, 0, 0);
  const fan = new THREE.Mesh(new THREE.ShapeGeometry(fanShape, 8), std(0xd8b070, { side: THREE.DoubleSide, roughness: 0.9 }));
  fanPivot.add(fan, new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.22, 3, 6).rotateZ(1.2).translate(-0.1, -0.02, 0), robe));
  ongDia.add(legsOD.g, belly, shirt, face, fanPivot);
  ongDia.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  ongDia.position.set(1.25, 0, 0.5);
  ongDia.rotation.y = -0.5;
  group.add(ongDia);

  // drum on a little wooden cart, off to the side
  const drum = new THREE.Group();
  const drumBody = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.42, 28, 1, true), std(0xb3141f, { roughness: 0.4, side: THREE.DoubleSide }));
  const skinMat = std(0xe8d8b0, { roughness: 0.7 });
  const skins = [0.21, -0.21].map((y) => { const s = new THREE.Mesh(new THREE.CircleGeometry(0.34, 28).rotateX(y > 0 ? -Math.PI / 2 : Math.PI / 2), skinMat); s.position.y = y; return s; });
  const studs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 6, 4), gold, 56);
  for (let i = 0; i < 56; i++) { const a = (i / 28) * Math.PI * 2, y = i < 28 ? 0.19 : -0.19; studs.setMatrixAt(i, new THREE.Matrix4().makeTranslation(Math.cos(a) * 0.345, y, Math.sin(a) * 0.345)); }
  const drumTop = new THREE.Group(); drumTop.add(drumBody, ...skins, studs);
  drumTop.rotation.x = 0.35; drumTop.position.y = 0.72;
  const cart = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.6).translate(0, 0.4, 0), std(0x5a3322));
  const wheels = [-1, 1].map((s) => new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 16).rotateY(Math.PI / 2).translate(s * 0.42, 0.18, 0), std(0x3a2418)));
  const sticks = [-1, 1].map((s) => { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6).translate(0, 0.21, 0), std(0xc8a060)); k.position.set(s * 0.12, 0.95, -0.25); return k; });
  drum.add(drumTop, cart, ...wheels, ...sticks);
  drum.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  drum.position.set(-1.35, 0, 0.1);
  drum.rotation.y = 0.5;
  group.add(drum);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd9a0, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 }));
  halo.scale.setScalar(2.4); halo.position.set(0, 1.2, 0.6);
  group.add(halo);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 2.0), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 0.8, -0.4);
  hit.userData.lion = true;
  group.add(hit);

  // ---------- motion state: the director tweens these; update() turns them into a pose ----------
  const s = { lift: 0, turn: 0, tilt: 0, bow: 0, hop: 0, clack: 0, step: 0, walk: 0, drum: 0, dancing: false };
  const spine = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  let hits = [];

  function dance(sfx) { // ~7 s: sniff low, rear up, shake, clack with the drum, a hop, and a bow to the viewer
    s.dancing = true; halo.visible = false;
    const beats = [0, 0.45, 0.9, 1.2, 1.5, 1.95, 2.4, 2.7, 3.0, 3.45, 3.9, 4.2, 4.5, 4.95, 5.4, 5.7, 6.0, 6.3];
    hits = beats.map((b) => ({ at: b, done: false }));
    let tt = 0;
    return new Promise((resolve) => tween(7, (k) => {
      tt = k * 7;
      for (const h of hits) if (!h.done && tt >= h.at) { h.done = true; sfx('drum', h.at % 1.5 < 0.1 ? 1 : 0.7); if (h.at % 3 < 0.1) sfx('cymbal'); s.drum = 1; }
      const seg = (a, b) => THREE.MathUtils.clamp((tt - a) / (b - a), 0, 1);
      const bell = (a, b) => Math.sin(seg(a, b) * Math.PI);
      s.bow = bell(0, 1.6) * 0.9 + bell(5.8, 7) * 0.8;            // sniff the ground, final bow
      s.lift = bell(1.4, 3.4) * 0.75;                              // front dancer lifts the head high
      s.turn = Math.sin(tt * 2.4) * 0.5 * bell(2.8, 5.2);          // shake side to side
      s.tilt = Math.sin(tt * 3.1) * 0.25 * bell(1.5, 5.5);
      s.clack = Math.max(0, Math.sin(tt * Math.PI * 2 / 0.45)) * bell(0.5, 6.5);
      s.hop = Math.max(0, Math.sin(seg(4.4, 5.4) * Math.PI)) * 0.35;
      s.step = tt * 2.5;
    }, () => { s.dancing = false; s.clack = 0; resolve(); }));
  }

  function update(t, dt, ambient) {
    const idle = s.dancing ? 0 : 1;
    const lift = s.lift, bow = s.bow;
    neck.position.set(0, 1.05 + lift * 0.9 - bow * 0.55 + s.hop + Math.sin(t * 1.4) * 0.03 * idle * ambient, 0.25 + bow * 0.2);
    neck.rotation.set(-lift * 0.35 + bow * 0.6 + Math.sin(t * 0.9) * 0.05 * idle, s.turn + Math.sin(t * 0.7) * 0.2 * idle * ambient, s.tilt);
    animate(t, s.clack);
    // legs: stepping during the dance / walk, planted otherwise
    const stepK = s.dancing ? 1 : s.walk;
    const ph = s.dancing ? s.step * Math.PI : t * 7;
    front.legs.forEach((l, i) => (l.rotation.x = Math.sin(ph + i * Math.PI) * 0.45 * stepK - bow * 0.3));
    back.legs.forEach((l, i) => (l.rotation.x = Math.sin(ph + i * Math.PI + 1) * 0.45 * stepK));
    front.g.position.y = s.hop; back.g.position.y = s.hop * 0.6;
    // cloth spine: from behind the head, over the back dancer's rump, down to the tail
    spine[0].set(0, neck.position.y - 0.05, neck.position.z - 0.25);
    spine[1].set(Math.sin(t * 2 + 1) * 0.05 + s.turn * 0.2, 0.95 - bow * 0.1 + lift * 0.3 + s.hop, -0.45);
    spine[2].set(Math.sin(t * 2.3) * 0.06 - s.turn * 0.1, 0.92 + s.hop * 0.6, -1.15);
    spine[3].set(Math.sin(t * 2.7) * 0.08, 0.72 + s.hop * 0.5, -1.65);
    cloth.update(spine, t);
    tail.position.copy(spine[3]).add(new THREE.Vector3(0, 0.05, -0.1));
    // Ông Địa: waddles, fans, laughs
    ongDia.position.y = Math.abs(Math.sin(t * (s.dancing ? 5 : 2))) * 0.05;
    ongDia.rotation.z = Math.sin(t * (s.dancing ? 5 : 2)) * 0.08;
    fanPivot.rotation.z = Math.sin(t * (s.dancing ? 9 : 3)) * 0.5;
    legsOD.legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 5 + i * Math.PI) * 0.3 * (s.dancing ? 1 : s.walk)));
    // drum: skin thumps and the sticks swing on the beat
    s.drum = Math.max(0, s.drum - dt * 6);
    drumTop.scale.setScalar(1 + s.drum * 0.03);
    sticks.forEach((k, i) => (k.rotation.x = -0.6 - (i ? s.drum : Math.max(0, s.drum - 0.3)) * 0.9));
    halo.material.opacity = 0.35 + 0.25 * Math.sin(t * 2.4);
  }

  return { group, lion, ongDia, drum, hit, state: s, dance, update, halo };
}
