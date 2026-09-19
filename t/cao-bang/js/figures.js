// People: villagers and the then singer, from one builder (copied from the Trung Thu card, lantern kids removed).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const SKIN = [0xeab893, 0xe0a982, 0xd89c74];
const HAIR = 0x17110d, GREY = 0xd9d5cc;
const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72 });
const col = (geo, hex) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
};
const merge = (parts) => { const g = mergeGeometries(parts); g.computeBoundingSphere(); return g; };
const lathe = (pts, seg = 14) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

// Proportions per age (metres). Kids have bigger heads for their height.
const BUILD = {
  kid: { hip: 0.5, torso: 0.36, head: 0.135, sh: 0.13, arm: 0.2, fore: 0.18, leg: 0.24, shin: 0.24, w: 0.12 },
  adult: { hip: 0.82, torso: 0.56, head: 0.125, sh: 0.19, arm: 0.28, fore: 0.26, leg: 0.4, shin: 0.4, w: 0.16 },
};

// opts: age 'kid'|'adult', girl, elder, top, bottom, skin, hair 'short'|'bun'|'long'|'bald'|'cap',
// outfit 'tee'|'shirt'|'aobaba'|'gown'|'robe', beard, glasses, smile
export function makePerson(opts = {}) {
  const o = { age: 'adult', top: 0xd84a3a, bottom: 0x2a3550, skin: SKIN[0], hair: 'short', outfit: 'tee', smile: true, ...opts };
  const B = BUILD[o.age === 'kid' ? 'kid' : 'adult'];
  const hairCol = o.elder ? GREY : o.hairCol ?? HAIR;
  const g = new THREE.Group();
  const long = o.outfit === 'gown' || o.outfit === 'robe';
  const neckY = B.hip + B.torso, headY = neckY + B.head * 1.05;

  // ---------- body: hips, torso (a lathe that follows the outfit), neck, head, hair, face ----------
  const parts = [];
  const w = B.w * (o.girl ? 0.92 : 1) * (o.stout ? 1.15 : 1);
  if (long) {
    const hem = o.outfit === 'gown' ? 0.34 : 0.24;
    parts.push(col(lathe([[hem, 0.02], [hem * 0.8, B.hip * 0.35], [w * 1.1, B.hip], [w * 1.05, B.hip + B.torso * 0.45], [w * 1.15, B.hip + B.torso * 0.8], [w * 0.6, neckY], [0.001, neckY + 0.01]]), o.top));
    if (o.sash) parts.push(col(new THREE.TorusGeometry(w * 1.07, 0.018, 4, 16).rotateX(Math.PI / 2).translate(0, B.hip + 0.02, 0), o.sash));
  } else {
    const shirtLen = o.outfit === 'aobaba' ? B.hip - 0.12 : B.hip - 0.03;
    parts.push(col(lathe([[0.001, B.hip - 0.02], [w * 0.95, B.hip - 0.02], [w * 1.02, B.hip + 0.04]]), o.bottom)); // seat
    parts.push(col(lathe([[w * (o.outfit === 'aobaba' ? 1.12 : 1.02), shirtLen], [w * 1.0, B.hip + B.torso * 0.35], [w * 1.08, B.hip + B.torso * 0.78], [w * 0.62, neckY], [0.001, neckY + 0.01]]), o.top));
    if (o.outfit === 'shirt') parts.push(col(new THREE.BoxGeometry(0.012, B.torso * 0.8, 0.01).translate(0, B.hip + B.torso * 0.45, w * 1.02), 0xf2efe6)); // placket
  }
  parts.push(col(new THREE.CylinderGeometry(B.head * 0.32, B.head * 0.36, B.head * 0.5, 8).translate(0, neckY + B.head * 0.12, 0), o.skin));
  const H = B.head;
  parts.push(col(new THREE.SphereGeometry(H, 20, 14).scale(0.95, 1.02, 0.98).translate(0, headY, 0), o.skin));
  for (const s of [-1, 1]) parts.push(col(new THREE.SphereGeometry(H * 0.2, 8, 6).scale(0.5, 1, 0.8).translate(s * H * 0.94, headY - H * 0.05, 0), o.skin)); // ears
  parts.push(col(new THREE.SphereGeometry(H * 0.12, 8, 6).scale(1, 0.9, 1).translate(0, headY - H * 0.1, H * 0.97), o.skin)); // nose
  // face: eyes, brows, cheeks, mouth
  for (const s of [-1, 1]) {
    if (o.closedEyes) parts.push(col(new THREE.TorusGeometry(H * 0.1, H * 0.025, 3, 8, Math.PI).rotateX(-0.2).translate(s * H * 0.34, headY + H * 0.05, H * 0.9), 0x2a1a12));
    else parts.push(col(new THREE.SphereGeometry(H * 0.1, 10, 8).scale(0.85, 1, 0.5).translate(s * H * 0.34, headY + H * 0.06, H * 0.9), 0x1a110c));
    parts.push(col(new THREE.BoxGeometry(H * 0.26, H * 0.045, H * 0.05).rotateZ(s * -0.12).translate(s * H * 0.34, headY + H * 0.3, H * 0.87), o.elder ? GREY : 0x2a1c14));
    parts.push(col(new THREE.SphereGeometry(H * 0.15, 8, 6).scale(1.2, 0.7, 0.3).translate(s * H * 0.52, headY - H * 0.2, H * 0.8), o.age === 'kid' ? 0xf29a86 : 0xe9a08a));
  }
  if (o.smile) parts.push(col(new THREE.TorusGeometry(H * 0.2, H * 0.035, 3, 10, Math.PI).rotateZ(Math.PI).translate(0, headY - H * 0.28, H * 0.9), 0x7a2a20));
  if (o.glasses) for (const s of [-1, 1]) parts.push(col(new THREE.TorusGeometry(H * 0.16, H * 0.02, 4, 12).translate(s * H * 0.34, headY + H * 0.06, H * 0.95), 0x3a2a20));
  if (o.beard) parts.push(col(new THREE.ConeGeometry(H * 0.32, H * 0.9, 8).rotateX(Math.PI).translate(0, headY - H * 0.95, H * 0.55), GREY));
  // hair
  // hair caps: built at the origin, tilted back (rx < 0 lifts the front edge above the brows), then moved onto the head
  const cap = (phi, rx = 0, sc = 1.06, dz = 0) => new THREE.SphereGeometry(H * sc, 18, 10, 0, Math.PI * 2, 0, phi).rotateX(rx).translate(0, headY + H * 0.02, H * dz);
  if (o.hair === 'short') parts.push(col(cap(Math.PI * 0.52, -0.4), hairCol));
  if (o.hair === 'bob' || o.hair === 'long' || o.hair === 'bun') {
    parts.push(col(cap(Math.PI * 0.52, -0.36), hairCol));
    if (o.hair === 'bob') parts.push(col(lathe([[H * 1.02, headY - H * 0.55], [H * 1.1, headY - H * 0.1], [H * 1.0, headY + H * 0.4]]).scale(1, 1, 0.95).translate(0, 0, -H * 0.12), hairCol));
    if (o.hair === 'long') parts.push(col(new THREE.BoxGeometry(H * 1.7, H * 2.4, H * 0.4).translate(0, headY - H * 0.8, -H * 0.72), hairCol));
    if (o.hair === 'bun') parts.push(col(new THREE.SphereGeometry(H * 0.42, 12, 8).translate(0, headY + H * 0.45, -H * 0.8), hairCol));
  }
  if (o.hair === 'bald') parts.push(col(new THREE.SphereGeometry(H * 1.03, 18, 8, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.2).translate(0, headY, -H * 0.05), hairCol)); // a fringe round the back
  if (o.hair === 'khan') { // grandma's head scarf, wrapped
    parts.push(col(cap(Math.PI * 0.5, -0.3, 1.1), o.khan ?? 0x3a2a4a));
    parts.push(col(new THREE.TorusGeometry(H * 1.02, H * 0.14, 6, 18).rotateX(Math.PI / 2 - 0.25).translate(0, headY + H * 0.32, -H * 0.05), o.khan ?? 0x3a2a4a));
  }
  if (o.hair === 'topknot') { // Cuội: a peasant's wrapped knot
    parts.push(col(cap(Math.PI * 0.52, -0.36), hairCol));
    parts.push(col(new THREE.SphereGeometry(H * 0.3, 10, 8).translate(0, headY + H * 1.0, -H * 0.2), hairCol));
  }
  if (o.hair === 'hang') { // Hằng Nga: high double bun with a gold pin
    parts.push(col(cap(Math.PI * 0.52, -0.36), hairCol));
    for (const s of [-1, 1]) parts.push(col(new THREE.SphereGeometry(H * 0.36, 12, 8).scale(1, 1.2, 1).translate(s * H * 0.45, headY + H * 1.0, -H * 0.1), hairCol));
    parts.push(col(new THREE.CylinderGeometry(0.004, 0.004, H * 1.8, 4).rotateZ(Math.PI / 2).translate(0, headY + H * 1.05, 0), 0xf2c24a));
  }
  if (o.hat === 'khanxep') parts.push(col(new THREE.CylinderGeometry(H * 1.08, H * 1.1, H * 0.5, 16).translate(0, headY + H * 0.5, -H * 0.05), 0x1a1a1a)); // grandpa's khăn xếp
  if (o.hat === 'non') parts.push(col(new THREE.ConeGeometry(H * 2.6, H * 1.3, 18, 1, true).translate(0, headY + H * 1.0, 0), 0xe8d9a8));
  if (o.extraBody) parts.push(...o.extraBody.map(([geo, c]) => col(geo, c)));
  const body = new THREE.Mesh(merge(parts), mat);
  body.castShadow = true;
  g.add(body);

  // ---------- arms: shoulder pivot → upper arm, elbow pivot → forearm and hand ----------
  const sleeve = o.sleeve ?? (o.outfit === 'tee' ? 'short' : 'long');
  const arms = [-1, 1].map((s) => {
    const sh = new THREE.Group();
    sh.position.set(s * B.sh, neckY - 0.04, 0);
    const ug = [col(new THREE.CapsuleGeometry(B.w * 0.3, B.arm - B.w * 0.3, 3, 8).translate(0, -B.arm / 2, 0), sleeve === 'short' ? o.top : o.top)];
    if (sleeve === 'short') ug.push(col(new THREE.CapsuleGeometry(B.w * 0.24, B.arm * 0.4, 3, 8).translate(0, -B.arm * 0.78, 0), o.skin));
    if (o.outfit === 'gown') ug.push(col(new THREE.CylinderGeometry(B.w * 0.35, B.w * 0.5, B.arm * 0.9, 8, 1, true).translate(0, -B.arm * 0.5, 0), o.top));
    sh.add(new THREE.Mesh(merge(ug), mat));
    const el = new THREE.Group();
    el.position.y = -B.arm;
    const fg = [col(new THREE.CapsuleGeometry(B.w * 0.24, B.fore - B.w * 0.24, 3, 8).translate(0, -B.fore / 2, 0), sleeve === 'short' ? o.skin : o.top),
      col(new THREE.SphereGeometry(B.w * 0.3, 10, 8).scale(0.9, 1.1, 0.7).translate(0, -B.fore - 0.02, 0), o.skin)];
    if (o.outfit === 'gown') fg.push(col(new THREE.CylinderGeometry(B.w * 0.5, B.w * 1.4, B.fore * 1.4, 10, 1, true).translate(0, -B.fore * 0.8, 0), o.sleeveCol ?? o.top)); // long flowing sleeves
    el.add(new THREE.Mesh(merge(fg), mat));
    sh.add(el);
    sh.rotation.z = s * 0.12;
    g.add(sh);
    sh.traverse((m) => m.isMesh && (m.castShadow = true));
    return { sh, el, hand: new THREE.Vector3(0, -B.fore - 0.03, 0) };
  });

  // ---------- legs: hip pivot → thigh, knee pivot → shin and foot (hidden under long robes) ----------
  const legs = [-1, 1].map((s) => {
    const hp = new THREE.Group();
    hp.position.set(s * B.w * 0.48, B.hip, 0);
    const shorts = o.outfit === 'tee' && o.age === 'kid' && !o.girl;
    hp.add(new THREE.Mesh(merge([col(new THREE.CapsuleGeometry(B.w * 0.4, B.leg - B.w * 0.4, 3, 8).translate(0, -B.leg / 2, 0), o.bottom)]), mat));
    const kn = new THREE.Group();
    kn.position.y = -B.leg;
    kn.add(new THREE.Mesh(merge([
      col(new THREE.CapsuleGeometry(B.w * 0.32, B.shin - B.w * 0.3, 3, 8).translate(0, -B.shin / 2, 0), shorts ? o.skin : o.bottom),
      col(new THREE.SphereGeometry(B.w * 0.36, 10, 6).scale(0.9, 0.5, 1.6).translate(0, -B.shin - 0.01, B.w * 0.2), o.shoes ?? 0x2a2420),
    ]), mat));
    hp.add(kn);
    hp.visible = !long;
    hp.traverse((m) => m.isMesh && (m.castShadow = true));
    g.add(hp);
    return { hp, kn };
  });

  const person = {
    g, body, arms, legs, B, opts: o,
    // walking gait (phase w, strength k)
    walk(w, k = 1) {
      legs[0].hp.rotation.x = Math.sin(w) * 0.5 * k; legs[1].hp.rotation.x = -Math.sin(w) * 0.5 * k;
      legs[0].kn.rotation.x = Math.max(0, -Math.cos(w)) * 0.6 * k; legs[1].kn.rotation.x = Math.max(0, Math.cos(w)) * 0.6 * k;
      body.position.y = Math.abs(Math.sin(w)) * 0.02 * k;
      if (!person.holding) { arms[0].sh.rotation.x = -Math.sin(w) * 0.4 * k; arms[1].sh.rotation.x = Math.sin(w) * 0.4 * k; }
    },
    // cross-legged on a mat (or kneeling): hips at floor height
    sit(cross = true) {
      g.position.y = -B.hip + (cross ? 0.1 : 0.12) * (o.age === 'kid' ? 0.7 : 1);
      legs.forEach((l, i) => {
        if (cross) { l.hp.rotation.set(-1.45, 0, (i ? -1 : 1) * 0.75); l.kn.rotation.set(2.3, 0, 0); }
        else { l.hp.rotation.set(-1.5, 0, 0); l.kn.rotation.set(1.5, 0, 0); }
      });
    },
    pose(side, x, z = 0, elbow = 0) { const a = arms[side === 'L' ? 0 : 1]; a.sh.rotation.x = x; a.sh.rotation.z = (side === 'L' ? -1 : 1) * z; a.el.rotation.x = elbow; },
    holding: false,
  };
  return person;
}
