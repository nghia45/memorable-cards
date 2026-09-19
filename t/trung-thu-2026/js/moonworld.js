// Act 4: the moon, a small world you walk round. The viewer stays on top and the moon turns under their feet
// (walking = rotating the sphere about x), so the camera rig keeps world-up. Along the path: three painted
// boards telling Cuội's story in the Đông Hồ woodblock style, the Quảng Hàn palace with Hằng Nga and the jade
// rabbit at its mortar, the Nghê Thường dancers circling a lotus, and last, Cuội himself under the banyan,
// with his buffalo grazing nearby. The Earth hangs in a black sky.
import * as THREE from 'three';
import { canvasTex, glowTex } from './print.js';
import { fbm } from './tex.js';
import { rng } from './street.js';
import { makePerson } from './figures.js';
import { makeBanyan } from './trees.js';
import { tileRoof } from './arch.js';

export const R = 16;              // moon radius (it's a storybook moon)
export const EYE = 1.35;
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
// where things stand along the walk (angle round the moon from the start)
export const SPOTS = { cuoi1: 0.17, cuoi2: 0.27, cuoi3: 0.37, hang: 0.55, dancers: 0.75, cuoi4: 0.97 };
export const END = 1.02;

// ---------- Đông Hồ style boards: điệp paper, black outlines, flat natural colours ----------
const INK = '#1a120c', RED = '#b3241c', YEL = '#e2a92a', GRN = '#3c7a3a', IND = '#2a3a6a', SKIN = '#f0c8a0', BRN = '#8a5a2a';
function paper(x, w, h) {
  x.fillStyle = '#f0e0bc'; x.fillRect(0, 0, w, h);
  fbm(x, w, h, { cells: 6, octaves: 4, op: 'multiply', alpha: 0.12 });
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.4})`; x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); } // shell sparkle of giấy điệp
  x.strokeStyle = RED; x.lineWidth = 10; x.strokeRect(14, 14, w - 28, h - 28);
  x.strokeStyle = INK; x.lineWidth = 3; x.strokeRect(26, 26, w - 52, h - 52);
}
const shape = (x, fill, draw, lw = 5) => { x.beginPath(); draw(); x.fillStyle = fill; x.fill(); x.lineWidth = lw; x.strokeStyle = INK; x.stroke(); };
function title(x, w, t) {
  x.fillStyle = RED; x.fillRect(w / 2 - 190, 40, 380, 56); x.strokeStyle = INK; x.lineWidth = 3; x.strokeRect(w / 2 - 190, 40, 380, 56);
  x.fillStyle = '#f7e3b0'; x.font = '700 30px "Be Vietnam Pro"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, w / 2, 69);
}
function tree(x, cx, by, s = 1) {
  shape(x, BRN, () => { x.moveTo(cx - 22 * s, by); x.quadraticCurveTo(cx - 8 * s, by - 90 * s, cx - 14 * s, by - 170 * s); x.lineTo(cx + 14 * s, by - 170 * s); x.quadraticCurveTo(cx + 8 * s, by - 90 * s, cx + 22 * s, by); x.closePath(); });
  for (const [dx, dy, r] of [[0, -230, 80], [-80, -190, 60], [80, -190, 60], [-45, -270, 55], [50, -265, 55]]) shape(x, GRN, () => x.arc(cx + dx * s, by + dy * s, r * s, 0, 7));
  x.strokeStyle = INK; x.lineWidth = 3; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(cx - 60 * s + i * 24 * s, by - 180 * s); x.lineTo(cx - 62 * s + i * 24 * s, by - 110 * s); x.stroke(); } // aerial roots
}
function person(x, cx, by, { top = IND, s = 1, knot = true, arm = 0, female = false } = {}) {
  shape(x, female ? RED : BRN, () => { x.moveTo(cx - 26 * s, by); x.lineTo(cx - 20 * s, by - 70 * s); x.lineTo(cx + 20 * s, by - 70 * s); x.lineTo(cx + 26 * s, by); x.closePath(); });
  shape(x, top, () => { x.moveTo(cx - 28 * s, by - 60 * s); x.lineTo(cx - 22 * s, by - 130 * s); x.lineTo(cx + 22 * s, by - 130 * s); x.lineTo(cx + 28 * s, by - 60 * s); x.closePath(); });
  shape(x, SKIN, () => x.arc(cx, by - 152 * s, 24 * s, 0, 7));
  shape(x, INK, () => x.arc(cx, by - 162 * s, 22 * s, Math.PI, 0));
  if (knot) shape(x, INK, () => x.arc(cx, by - 184 * s, 10 * s, 0, 7));
  if (female) shape(x, INK, () => x.ellipse(cx + 16 * s, by - 150 * s, 10 * s, 26 * s, 0, 0, 7));
  x.strokeStyle = INK; x.lineWidth = 12 * s; x.lineCap = 'round';
  x.beginPath(); x.moveTo(cx + 18 * s, by - 120 * s); x.lineTo(cx + (40 + arm * 20) * s, by - (90 + arm * 50) * s); x.stroke();
  x.fillStyle = INK; x.beginPath(); x.arc(cx - 8 * s, by - 152 * s, 3, 0, 7); x.arc(cx + 8 * s, by - 152 * s, 3, 0, 7); x.fill();
}
function tiger(x, cx, by, s = 1, flip = 1) {
  x.save(); x.translate(cx, by); x.scale(flip * s, s);
  shape(x, '#e8862a', () => x.ellipse(0, -50, 90, 40, 0, 0, 7));
  shape(x, '#e8862a', () => x.arc(88, -75, 36, 0, 7));
  for (const lx of [-60, -30, 40, 65]) shape(x, '#e8862a', () => x.rect(lx, -30, 16, 30));
  x.strokeStyle = INK; x.lineWidth = 7; for (let i = -60; i < 60; i += 20) { x.beginPath(); x.moveTo(i, -88); x.quadraticCurveTo(i + 8, -60, i, -40); x.stroke(); }
  x.beginPath(); x.moveTo(-88, -60); x.quadraticCurveTo(-130, -110, -110, -130); x.stroke();
  x.fillStyle = INK; x.beginPath(); x.arc(98, -84, 4, 0, 7); x.fill();
  x.restore();
}
const BOARDS = {
  cuoi1: (x, w, h) => {
    title(x, w, 'Cây thuốc thần');
    tree(x, 560, 560, 1);
    tiger(x, 330, 610, 1.1, 1);
    tiger(x, 520, 640, 0.45, -1); tiger(x, 610, 650, 0.4, -1);
    x.fillStyle = GRN; for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(440 + i * 14, 590 - i * 8, 10, 5, 0.4, 0, 7); x.fill(); }
    person(x, 150, 650, { top: BRN, arm: 0.6 }); // Cuội hiding with his axe
    x.strokeStyle = INK; x.lineWidth = 8; x.beginPath(); x.moveTo(190, 540); x.lineTo(230, 470); x.stroke(); shape(x, '#bbb', () => { x.moveTo(222, 460); x.lineTo(252, 470); x.lineTo(238, 492); x.closePath(); });
  },
  cuoi2: (x, w, h) => {
    title(x, w, 'Chữa bệnh cứu người');
    tree(x, 620, 560, 0.7);
    shape(x, '#c8a878', () => x.rect(150, 560, 280, 30)); // the sick girl on a bed
    shape(x, RED, () => x.ellipse(290, 545, 110, 22, 0, 0, 7));
    shape(x, SKIN, () => x.arc(170, 540, 22, 0, 7));
    person(x, 370, 650, { top: BRN, arm: 0.2 });
    x.fillStyle = GRN; for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(260 + i * 22, 510 - i * 6, 12, 6, 0.5, 0, 7); x.fill(); }
    person(x, 520, 660, { top: YEL, female: true, knot: false, s: 0.8 }); // the rich man, grateful
  },
  cuoi3: (x, w, h) => {
    title(x, w, 'Cây đa bay lên trời');
    x.save(); x.translate(470, 470); x.rotate(-0.25); tree(x, 0, 0, 0.8); x.restore(); // the tree tearing free
    x.strokeStyle = INK; x.lineWidth = 5; for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(440 + i * 10, 470); x.quadraticCurveTo(430 + i * 14, 530, 420 + i * 20, 560); x.stroke(); }
    person(x, 400, 720, { top: BRN, arm: 1.2 }); // Cuội, clinging on with the axe
    person(x, 180, 700, { top: RED, female: true, knot: false, s: 0.8 }); // his wife with her bucket
    shape(x, BRN, () => x.rect(215, 600, 40, 36));
    shape(x, '#f7ecc8', () => x.arc(720, 170, 70, 0, 7));
    x.strokeStyle = IND; x.lineWidth = 4; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(470, 470, 180 + i * 30, -2.4, -2.0); x.stroke(); } // wind lines
  },
};
function boardTex(id) { return canvasTex(900, 780, (x, w, h) => { paper(x, w, h); BOARDS[id](x, w, h); }); }

function earthTex() {
  return canvasTex(1024, 512, (x, w, h) => {
    x.fillStyle = '#1d4e9e'; x.fillRect(0, 0, w, h);
    fbm(x, w, h, { cells: 4, octaves: 4, op: 'overlay', alpha: 0.5 });
    const land = document.createElement('canvas'); land.width = w; land.height = h; const l = land.getContext('2d');
    fbm(l, w, h, { cells: 5, octaves: 5 });
    const d = l.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) { const v = d.data[i]; const on = v > 150; d.data[i] = on ? 70 + (v - 150) : 0; d.data[i + 1] = on ? 110 + (v - 150) * 0.6 : 0; d.data[i + 2] = on ? 50 : 0; d.data[i + 3] = on ? 255 : 0; }
    l.putImageData(d, 0, 0); x.drawImage(land, 0, 0);
    x.globalAlpha = 0.6; fbm(x, w, h, { cells: 8, octaves: 4, op: 'screen', alpha: 0.35 }); x.globalAlpha = 1;
  });
}

export function createMoonWorld() {
  const group = new THREE.Group();     // fixed in the world (its origin is the moon's centre)
  const planet = new THREE.Group();    // turns under the viewer
  group.add(planet);
  const rand = rng(2012);
  // ---------- the ground: a bumpy silver sphere with craters ----------
  const geo = new THREE.IcosahedronGeometry(R, 40);
  const pos = geo.attributes.position, v = new THREE.Vector3();
  const craters = Array.from({ length: 50 }, () => ({ c: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(), r: 0.05 + rand() * 0.18 }));
  const path = (p) => Math.abs(p.x) / R; // keep the walking path (x ≈ 0) smooth
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let h = Math.sin(v.x * 9 + v.z * 7) * 0.12 + Math.sin(v.y * 13 - v.x * 5) * 0.08;
    for (const c of craters) { const d = v.angleTo(c.c) / c.r; if (d < 1.3) h += d < 1 ? -0.5 * (1 - d * d) * c.r * 4 : Math.sin((d - 1) / 0.3 * Math.PI) * 0.25 * c.r * 4; }
    h *= Math.min(1, path(v.clone().multiplyScalar(R)) * 6 + 0.15);
    v.multiplyScalar(R + h);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const groundTex = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#b8bcc8'; x.fillRect(0, 0, w, h); fbm(x, w, h, { cells: 8, octaves: 6, op: 'multiply', alpha: 0.35 }); });
  groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xc8ccd8, map: groundTex, roughness: 0.95, emissive: 0x2a3050, emissiveIntensity: 0.35 }));
  ground.receiveShadow = true;
  planet.add(ground);
  // rocks
  const rockGeo = new THREE.DodecahedronGeometry(0.3, 0);
  const rocks = new THREE.InstancedMesh(rockGeo, std(0x9a9ea8, { flatShading: true }), 140);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < 140; i++) {
    let d; do { d = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(); } while (Math.abs(d.x) < 0.1);
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    rocks.setMatrixAt(i, m4.compose(d.clone().multiplyScalar(R), q, new THREE.Vector3(1, 0.6, 1).multiplyScalar(0.4 + rand() * 1.6)));
  }
  rocks.castShadow = rocks.receiveShadow = true;
  planet.add(rocks);

  // place a group standing on the moon at angle `a` along the walk, `x` metres to the side
  const place = (obj, a, x = 0, turn = 0) => {
    const holder = new THREE.Group();
    holder.rotation.x = -a;
    obj.position.set(x, R, 0);
    obj.rotation.y = turn;
    holder.add(obj);
    planet.add(holder);
    return obj;
  };

  // ---------- Cuội's story boards ----------
  const boards = {};
  ['cuoi1', 'cuoi2', 'cuoi3'].forEach((id, i) => {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.66, 0.06), std(0x5a2a14, { roughness: 0.6 }));
    frame.position.y = 1.5;
    const art = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 1.52), new THREE.MeshStandardMaterial({ map: boardTex(id), roughness: 0.85, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0 }));
    art.material.emissiveMap = art.material.map; art.material.emissiveIntensity = 0.35;
    art.position.set(0, 1.5, 0.035);
    const legs = [-0.7, 0.7].map((lx) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.8, 0.07), frame.material); l.position.set(lx, 0.4, 0); return l; });
    g.add(frame, art, ...legs);
    g.traverse((o) => o.isMesh && (o.castShadow = true));
    const hit = new THREE.Mesh(new THREE.BoxGeometry(2, 2.4, 0.4), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1.3; g.add(hit);
    const side = i % 2 ? 1 : -1;
    place(g, SPOTS[id], side * 1.7, side * -0.5);
    boards[id] = { g, hit, art };
  });

  // ---------- Quảng Hàn palace, Hằng Nga, the jade rabbit ----------
  const palace = new THREE.Group();
  const jade = std(0xdfeaf0, { roughness: 0.4, emissive: 0x405070, emissiveIntensity: 0.25 });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 3.4), jade); plinth.position.y = 0.2;
  palace.add(plinth);
  for (const x of [-2, -0.7, 0.7, 2]) for (const z of [-1.2, 1.2]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.4, 10), std(0xf4f0f8, { roughness: 0.3 })); c.position.set(x, 1.6, z); palace.add(c); }
  const r = tileRoof({ w: 5.2, d: 3.6, h: 1.4, over: 0.6, lift: 0.6, segU: 20, segV: 6 });
  const roofMat = std(0x8aa8c8, { roughness: 0.35, metalness: 0.4, emissive: 0x203050, emissiveIntensity: 0.3 });
  const rm = new THREE.Mesh(r.roof, roofMat); rm.position.y = 2.8 - r.wallY + 0.1; palace.add(rm);
  for (const rg of r.ridge) { const m = new THREE.Mesh(rg, roofMat); m.position.y = rm.position.y; palace.add(m); }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: canvasTex(512, 128, (x, w, h) => { x.fillStyle = '#2a3a6a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e8c060'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16); x.fillStyle = '#f2d27a'; x.font = '700 54px "Playfair Display"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Quảng Hàn Cung', w / 2, h / 2 + 3); }) }));
  sign.position.set(0, 2.6, 1.25); palace.add(sign);
  palace.traverse((o) => o.isMesh && (o.castShadow = true, o.receiveShadow = true));
  place(palace, SPOTS.hang - 0.09, -3.2, 0.9);
  const hang = makePerson({ girl: true, outfit: 'gown', top: 0xf2e8f8, sleeveCol: 0xe8a8c8, hair: 'hang', sash: 0xe86a9a });
  hang.pose('L', -0.5, 0.5, -0.8); hang.pose('R', -0.9, 0.3, -1.2);
  place(hang.g, SPOTS.hang, -1.2, 0.7);
  // the rabbit at its mortar
  const rabbit = new THREE.Group();
  const fur = std(0xfbf8f2, { roughness: 0.9 }), pinkM = std(0xf2a8b8);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12).scale(1, 1.1, 1.1), fur); body.position.y = 0.2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), fur); head.position.set(0, 0.45, 0.08);
  const ears = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.22, 3, 8), fur); e.position.set(s * 0.05, 0.64, 0.02); e.rotation.z = s * 0.15; const ie = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.18, 3, 6), pinkM); ie.position.z = 0.02; e.add(ie); return e; });
  const eyes = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), std(0xc8202a)); e.position.set(s * 0.06, 0.48, 0.19); return e; });
  const pestleArm = new THREE.Group(); pestleArm.position.set(0, 0.3, 0.15);
  const pestle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.5, 8), std(0xa87a4a)); pestle.position.set(0, 0.1, 0.22); pestleArm.add(pestle);
  const mortar = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.16, 0], [0.19, 0.2], [0.14, 0.22], [0.12, 0.08], [0.001, 0.06]].map(([a, b]) => new THREE.Vector2(a, b)), 20), std(0x8a8e98));
  mortar.position.set(0, 0, 0.42);
  rabbit.add(body, head, ...ears, ...eyes, pestleArm, mortar);
  rabbit.traverse((o) => o.isMesh && (o.castShadow = true));
  place(rabbit, SPOTS.hang + 0.02, 0.9, -0.9);
  const hangHit = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hangHit.position.y = 1; hang.g.add(hangHit);
  const rabbitHit = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); rabbitHit.position.y = 0.4; rabbit.add(rabbitHit);

  // ---------- Nghê Thường: fairies in rainbow skirts circling a glowing lotus ----------
  const dance = new THREE.Group();
  const lotus = new THREE.Group();
  for (let i = 0; i < 12; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.45, 1.3, 0.8), new THREE.MeshStandardMaterial({ color: 0xf8b8d0, emissive: 0xf87aa8, emissiveIntensity: 0.6, side: THREE.DoubleSide })); const a = (i / 12) * Math.PI * 2; p.position.set(Math.cos(a) * 0.2, 0.05, Math.sin(a) * 0.2); p.rotation.set(0, -a, (i % 2 ? 0.5 : 0.25)); p.rotation.order = 'YXZ'; lotus.add(p); }
  const heart = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffe0f0, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); heart.scale.setScalar(2); heart.position.y = 0.4; lotus.add(heart);
  dance.add(lotus);
  const fairies = [0xe84a5a, 0xf2a22a, 0xf2e04a, 0x4ab86a, 0x4a8ae8, 0x9a5ae8].map((c, i) => {
    const f = makePerson({ girl: true, outfit: 'gown', top: c, sleeveCol: 0xffffff, hair: 'hang', sash: 0xffffff });
    const pivot = new THREE.Group(); pivot.rotation.y = (i / 6) * Math.PI * 2;
    f.g.position.set(0, 0, 1.6); f.g.rotation.y = Math.PI / 2;
    pivot.add(f.g); dance.add(pivot);
    return { f, pivot, ph: i };
  });
  place(dance, SPOTS.dancers, 3, 0); // beside the path: the ring of fairies must not sweep through the viewer
  const danceHit = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 2, 10), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })); danceHit.position.y = 1; dance.add(danceHit);

  // ---------- Cuội under his banyan, the buffalo grazing ----------
  const banyan = makeBanyan({ rand, per: 300, hue: 0.42, sat: 0.35, light: 0.35, barkColor: 0xb8b8c8, glow: 0.25, roots: false });
  banyan.scale.setScalar(1.25);
  place(banyan, SPOTS.cuoi4 + 0.05, 1.8, 0);
  const cuoi = makePerson({ top: 0x8a5a2a, bottom: 0x4a3a2a, hair: 'topknot', outfit: 'shirt' });
  cuoi.sit(false);
  cuoi.legs.forEach((l) => { l.hp.rotation.x = -1.4; l.kn.rotation.x = 1.6; });
  cuoi.g.position.y += 0.35;
  cuoi.pose('L', -0.6, 0.2, -1.0); cuoi.pose('R', -0.5, 0.3, -0.9);
  const axe = new THREE.Group();
  axe.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), std(0x7a5a3a)));
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.02), std(0xaab0b8, { metalness: 0.8, roughness: 0.3 })); blade.position.set(0.07, 0.3, 0); axe.add(blade);
  axe.position.set(0.35, 0.3, 0.25); axe.rotation.z = -0.3;
  const cuoiG = new THREE.Group(); cuoiG.add(cuoi.g, axe);
  const root = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.35, 8), std(0xb8b8c8)); root.position.y = 0.17; cuoiG.add(root);
  place(cuoiG, SPOTS.cuoi4, 0.9, -0.5);
  const cuoiHit = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); cuoiHit.position.y = 0.8; cuoiG.add(cuoiHit);
  const buffalo = new THREE.Group();
  const hide = std(0x4a4a54, { roughness: 0.85 });
  const bb = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.9, 4, 10).rotateX(Math.PI / 2), hide); bb.position.y = 0.85;
  const bh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10).scale(0.9, 0.9, 1.3), hide); bh.position.set(0, 0.55, 0.85);
  const horns = [-1, 1].map((s) => { const h = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 6, 12, Math.PI * 0.8), std(0xd8d0c0)); h.position.set(s * 0.12, 0.75, 0.8); h.rotation.set(0, Math.PI / 2, s * 0.9); return h; });
  buffalo.add(bb, bh, ...horns);
  for (const [x, z] of [[-0.22, 0.45], [0.22, 0.45], [-0.22, -0.45], [0.22, -0.45]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.6, 8), hide); l.position.set(x, 0.3, z); buffalo.add(l); }
  buffalo.traverse((o) => o.isMesh && (o.castShadow = true));
  place(buffalo, SPOTS.cuoi4 + 0.1, -2.6, 2.2);
  // the leaf Cuội sends home (one falls to earth each year, the story says)
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(0.09, 0.09, 0.24, 0.02); leafShape.lineTo(0.29, 0); leafShape.lineTo(0.24, -0.02); leafShape.quadraticCurveTo(0.09, -0.09, 0, 0);
  const leaf = new THREE.Mesh(new THREE.ShapeGeometry(leafShape, 6).translate(-0.14, 0, 0), new THREE.MeshStandardMaterial({ color: 0xc8f0c0, emissive: 0x9aff9a, emissiveIntensity: 0.9, side: THREE.DoubleSide }));
  const leafGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xc0ffc0, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 })); leafGlow.scale.setScalar(0.9);
  leaf.add(leafGlow);
  leaf.visible = false;
  group.add(leaf);

  // ---------- the Earth in the sky, and soft starlight ----------
  const earth = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 32), new THREE.MeshStandardMaterial({ map: earthTex(), roughness: 0.7, emissive: 0x0a1a40, emissiveIntensity: 0.4 }));
  const atmo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x6aa8ff, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55, fog: false }));
  atmo.scale.setScalar(110);
  const EARTH_DIR = new THREE.Vector3(-0.35, 0.38, -1).normalize();
  earth.position.copy(EARTH_DIR).multiplyScalar(320); atmo.position.copy(earth.position).addScaledVector(EARTH_DIR, 4);
  earth.material.fog = false;
  group.add(earth, atmo);

  return {
    group, planet, boards, hang, hangHit, rabbit, rabbitHit, pestleArm, dance, danceHit, fairies, lotus, cuoi, cuoiG, cuoiHit, leaf, earth, EARTH_DIR,
    walk: 0, pound: 0, spin: 1,
    tick(t, dt) {
      planet.rotation.x = this.walk;
      earth.rotation.y = t * 0.02;
      if (this.pound > 0) { this.pound = Math.max(0, this.pound - dt); pestleArm.rotation.x = -Math.abs(Math.sin(t * 9)) * 0.9; }
      else pestleArm.rotation.x = -Math.abs(Math.sin(t * 2)) * 0.5;
      lotus.rotation.y = t * 0.2;
      fairies.forEach(({ f, pivot, ph }) => {
        pivot.rotation.y += dt * 0.35 * this.spin;
        f.g.position.y = Math.abs(Math.sin(t * 2 + ph)) * 0.08;
        f.arms[0].sh.rotation.z = -0.8 - Math.sin(t * 2 + ph) * 0.6; f.arms[1].sh.rotation.z = 0.8 + Math.sin(t * 2 + ph + 1) * 0.6;
        f.arms[0].sh.rotation.x = -0.4; f.arms[1].sh.rotation.x = -0.4;
        f.body.rotation.y = Math.sin(t * 1.5 + ph) * 0.4;
      });
      this.spin += (1 - this.spin) * Math.min(1, dt * 0.5);
      hang.body.rotation.y = Math.sin(t * 0.5) * 0.1;
      hang.arms[0].sh.rotation.z = -0.5 - Math.sin(t * 0.9) * 0.15;
    },
  };
}
