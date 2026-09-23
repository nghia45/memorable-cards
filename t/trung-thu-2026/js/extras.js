// Two small jokes for the people who know them, off the stalls' path in Hàng Mã: a man in a wheelchair watching TV inside his shop, star lanterns in tinsel rings tied up behind
//   him (the "Faker on the wheel" meme, from the game Tiệm Phở của anh Hai); further on, a trà đá stall on the
//   pavement where an uncle takes a pull on his điếu cày. Tap either as you pass: the walk doesn't stop for them.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson } from './figures.js';
import { singleLantern } from './lanterns.js';
import { canvasTex, glowTex } from './print.js';
import { animate, wait, ease, lerp } from './tween.js';
import { t } from './lang.js';

const paint = (geo, hex) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
  const c = new THREE.Color(hex), a = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < a.length; i += 3) a.set([c.r, c.g, c.b], i);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
};
const solid = (parts, extra = {}) => {
  const m = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, ...extra }));
  m.castShadow = m.receiveShadow = true;
  return m;
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
function tube(a, b, r = 0.012, seg = 6) {
  const d = b.clone().sub(a), g = new THREE.CylinderGeometry(r, r, d.length(), seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize()));
  return g.translate(...a.clone().addScaledVector(d, 0.5).toArray());
}
const hitBox = (w, h, d, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false })); m.position.y = y; return m; };
const glow = (color, size, opacity) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, opacity })); s.scale.setScalar(size); return s; };
// adult figure, seated: hips on a seat `seat` metres up
const HEAD_Y = 0.82 + 0.56 + 0.125 * 1.05, H = 0.125;
function seated(p, seat, thigh = -1.5, knee = 1.5) {
  p.sit(false);
  p.g.position.y += seat - 0.12;
  p.legs.forEach((l) => { l.hp.rotation.x = thigh; l.kn.rotation.x = knee; });
  return p;
}
// a seated figure's upper body on a pivot at the hips, so it can lean and turn while the legs stay put
function waist(p) {
  const torso = new THREE.Group();
  torso.position.y = p.B.hip;
  for (const m of [p.body, ...p.arms.map((a) => a.sh)]) { m.position.y -= p.B.hip; torso.add(m); }
  p.g.add(torso);
  return torso;
}
// a point in the figure's own space → its torso's (where the shoulders are)
const _q = new THREE.Quaternion();
const toTorso = (torso, v) => v.sub(torso.position).applyQuaternion(_q.copy(torso.quaternion).invert());
// two-bone arm: put hand i on `target` (torso space), the elbow swung out to that side and down
const _v = V(0, 0, 0), _el = V(0, 0, 0), _fo = V(0, 0, 0), _x = V(0, 0, 0), _y = V(0, 0, 0), _z = V(0, 0, 0), _m = new THREE.Matrix4();
function reach(p, i, target) {
  const a = p.arms[i], A = p.B.arm, F = p.B.fore + 0.03, clamp = THREE.MathUtils.clamp;
  const v = _v.copy(target).sub(a.sh.position);
  const d = clamp(v.length(), A - F + 0.02, A + F - 0.005);
  v.setLength(d);
  const c = clamp((A * A + d * d - F * F) / (2 * A * d), -1, 1); // the angle at the shoulder, off the straight line to the hand
  const dir = _x.copy(v).normalize();
  const pole = _y.set(Math.sign(a.sh.position.x) * 0.5, -1, -0.3);
  pole.addScaledVector(dir, -pole.dot(dir)).normalize();
  const elbow = _el.copy(dir).multiplyScalar(A * c).addScaledVector(pole, A * Math.sqrt(1 - c * c));
  const fore = _fo.copy(v).sub(elbow);
  // the upper arm hangs down its own -y and the forearm folds forward toward +z: build that frame
  _y.copy(elbow).normalize().negate();
  _z.copy(fore).addScaledVector(_y, -fore.dot(_y)).normalize();
  _x.crossVectors(_y, _z);
  a.sh.quaternion.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
  a.el.rotation.set(-Math.acos(clamp(-fore.dot(_y) / F, -1, 1)), 0, 0);
}
const wrap = (a) => THREE.MathUtils.euclideanModulo(a + Math.PI, Math.PI * 2) - Math.PI;

// ---------- the wheelchair: faces +z, big wheels at the back ----------
function wheelchair() {
  const M = 0x9aa0a8, K = 0x151515, S = 0x23252b, p = [];
  p.push(paint(new THREE.BoxGeometry(0.44, 0.04, 0.42).translate(0, 0.5, 0.02), S)); // seat sling
  p.push(paint(new THREE.BoxGeometry(0.44, 0.42, 0.03).rotateX(-0.12).translate(0, 0.74, -0.2), S)); // back sling
  for (const s of [-1, 1]) {
    const x = s * 0.23;
    p.push(paint(tube(V(x, 0.5, 0.23), V(x, 0.5, -0.19)), M)); // seat rail
    p.push(paint(tube(V(x, 0.3, -0.19), V(x, 0.97, -0.26)), M)); // back post
    p.push(paint(tube(V(x, 0.97, -0.26), V(x, 0.96, -0.38), 0.017), K)); // push handle
    p.push(paint(tube(V(x, 0.3, -0.19), V(x, 0.3, 0.22)), M)); // lower rail
    p.push(paint(tube(V(x, 0.5, 0.22), V(x, 0.13, 0.33)), M)); // front post down to the footrest
    p.push(paint(tube(V(x, 0.3, 0.22), V(x, 0.08, 0.25)), M)); // caster fork
    p.push(paint(tube(V(x, 0.5, 0.14), V(x, 0.67, 0.14)), M), paint(tube(V(x, 0.5, -0.15), V(x, 0.67, -0.15)), M));
    p.push(paint(new THREE.BoxGeometry(0.05, 0.03, 0.34).translate(x, 0.68, 0), K)); // armrest pad
    const wx = s * 0.29, wy = 0.3, wz = -0.08; // the big wheel: tyre, push rim, spokes, hub
    p.push(paint(new THREE.TorusGeometry(0.29, 0.02, 6, 28).rotateY(Math.PI / 2).translate(wx, wy, wz), K));
    p.push(paint(new THREE.TorusGeometry(0.262, 0.008, 4, 28).rotateY(Math.PI / 2).translate(wx + s * 0.035, wy, wz), M));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.push(paint(tube(V(wx, wy, wz), V(wx, wy + Math.sin(a) * 0.275, wz + Math.cos(a) * 0.275), 0.003, 3), 0xc8ccd2)); }
    p.push(paint(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8).rotateZ(Math.PI / 2).translate(wx, wy, wz), M));
    p.push(paint(new THREE.TorusGeometry(0.06, 0.018, 5, 12).rotateY(Math.PI / 2).translate(x, 0.075, 0.26), K)); // caster
  }
  p.push(paint(new THREE.BoxGeometry(0.4, 0.02, 0.14).translate(0, 0.13, 0.34), M)); // footrest
  p.push(paint(tube(V(-0.23, 0.3, 0), V(0.23, 0.3, 0)), M)); // cross brace
  return solid(p, { metalness: 0.45, roughness: 0.4 });
}

// ---------- an old CRT on a cabinet, showing the final ----------
function tvTex() {
  return canvasTex(256, 200, (x, w, h) => {
    x.fillStyle = '#1e3a22'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#6a8a4a'; x.lineWidth = 9; // three lanes and a river across the map
    x.beginPath(); x.moveTo(20, 30); x.lineTo(20, 180); x.lineTo(236, 180); x.moveTo(20, 180); x.lineTo(236, 30); x.moveTo(20, 30); x.lineTo(236, 30); x.lineTo(236, 180); x.stroke();
    x.strokeStyle = '#2a6aa8'; x.lineWidth = 12; x.beginPath(); x.moveTo(20, 30); x.lineTo(236, 180); x.stroke();
    x.fillStyle = '#3a8aff'; x.beginPath(); x.arc(28, 172, 16, 0, 7); x.fill();
    x.fillStyle = '#ff3a3a'; x.beginPath(); x.arc(228, 38, 16, 0, 7); x.fill();
    for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#8ac0ff' : '#ff8a8a'; x.beginPath(); x.arc(110 + Math.sin(i * 2.3) * 40, 100 + Math.cos(i * 1.7) * 30, 4, 0, 7); x.fill(); } // the teamfight
    x.fillStyle = 'rgba(0,0,0,.65)'; x.fillRect(0, 0, w, 26);
    x.font = '700 15px "Be Vietnam Pro"'; x.textBaseline = 'middle';
    x.fillStyle = '#ffd24a'; x.fillText('CHUNG KẾT', 10, 13);
    x.fillStyle = '#fff'; x.textAlign = 'right'; x.fillText('12 : 11', w - 10, 13);
    x.fillStyle = '#e8141e'; x.fillRect(w - 64, h - 26, 56, 18); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '700 11px "Be Vietnam Pro"'; x.fillText('TRỰC TIẾP', w - 36, h - 17);
    x.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < h; y += 3) x.fillRect(0, y, w, 1); // scanlines
  });
}
function crt() {
  const g = new THREE.Group(), wood = 0x6a3f22;
  const p = [
    paint(new THREE.BoxGeometry(0.62, 0.5, 0.42).translate(0, 0.25, 0), wood), // cabinet
    paint(new THREE.BoxGeometry(0.56, 0.012, 0.01).translate(0, 0.3, 0.212), 0x3a2212), // drawer line
    paint(new THREE.BoxGeometry(0.52, 0.42, 0.42).translate(0, 0.71, 0), 0x3a3430), // TV shell
    paint(new THREE.BoxGeometry(0.36, 0.3, 0.2).translate(0, 0.71, -0.3), 0x2e2a26), // the tube's bulge
    paint(new THREE.BoxGeometry(0.1, 0.34, 0.02).translate(0.2, 0.71, 0.21), 0x24201c), // knob panel
    paint(tube(V(0, 0.92, -0.05), V(-0.2, 1.3, -0.1), 0.004, 4), 0xb8bcc2), paint(tube(V(0, 0.92, -0.05), V(0.18, 1.32, -0.12), 0.004, 4), 0xb8bcc2), // rabbit ears
  ];
  for (const y of [0.64, 0.76]) p.push(paint(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 10).rotateX(Math.PI / 2).translate(0.2, y, 0.225), 0x9a948a));
  g.add(solid(p, { roughness: 0.55 }));
  const tex = tvTex();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.28), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.1, roughness: 0.25 }));
  screen.position.set(-0.05, 0.71, 0.212);
  const light = glow(0x7ab0ff, 1.4, 0.3); light.position.set(-0.05, 0.71, 0.45);
  g.add(screen, light);
  return { g, screen, light };
}

// The wheelchair corner, inside a shop on the left. `at` is where he sits, `tvAt` where the TV stands, `face` the
// world direction the lanterns show their faces to (out to the street), `room` the shop's floor to tile.
export function createFakerCorner({ at, tvAt, face, room, audio, say }) {
  const group = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(room.depth, room.w).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xa8684e, roughness: 0.85 }));
  floor.position.set(room.x, at.y, room.z); floor.receiveShadow = true;
  group.add(floor);
  const tv = crt();
  tv.g.position.copy(tvAt);
  tv.g.rotation.y = Math.atan2(at.x - tvAt.x, at.z - tvAt.z);
  group.add(tv.g);
  const chair = new THREE.Group();
  chair.position.copy(at);
  chair.add(wheelchair());
  // black jacket with red down the sides, a black cap with a red badge, the way the meme has him
  const cap = [
    [new THREE.SphereGeometry(H * 1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.46).rotateX(-0.15).translate(0, HEAD_Y + 0.02, 0), 0x121214],
    [new THREE.CylinderGeometry(H * 0.95, H * 0.95, 0.012, 16, 1, false, -Math.PI / 2, Math.PI).translate(0, HEAD_Y + H * 0.42, H * 0.6), 0x121214],
    [new THREE.BoxGeometry(0.05, 0.035, 0.01).translate(0, HEAD_Y + H * 0.72, H * 1.02), 0xd8202a],
    ...[-1, 1].map((s) => [new THREE.BoxGeometry(0.03, 0.4, 0.2).translate(s * 0.165, 0.82 + 0.26, 0), 0xb81a24]),
  ];
  const man = seated(makePerson({ top: 0x17171b, bottom: 0x1c1c22, hair: 'short', outfit: 'tee', sleeve: 'long', shoes: 0x1a1a1a, extraBody: cap }), 0.5);
  man.g.position.z = -0.1;
  const rest = () => { man.pose('L', 0.05, 0.12, -1.35); man.pose('R', 0.05, 0.12, -1.35); };
  rest();
  chair.add(man.g);
  // the lanterns: six big stars on sticks tied to the push handles, each inside a ring of green tinsel (he sells them)
  const lanterns = [];
  const tinsel = new THREE.MeshStandardMaterial({ color: 0x8ad03a, emissive: 0x3a7a10, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.3, flatShading: true });
  const stickMat = new THREE.MeshStandardMaterial({ color: 0xc8a060, roughness: 0.7 });
  [[-0.42, 0.52, 0xff2a1a], [-0.2, 0.86, 0xff3a5a], [0.12, 0.98, 0xff2a1a], [0.42, 0.7, 0xff5a2a], [0.3, 0.36, 0xff3a5a], [-0.12, 0.42, 0xff2a1a]].forEach(([x, y, c], i) => {
    const pivot = new THREE.Group();
    pivot.position.set(Math.sign(x || 1) * 0.23, 0.96, -0.36);
    const top = V(x - pivot.position.x, y, -0.06);
    pivot.add(new THREE.Mesh(tube(V(0, 0, 0), top, 0.007, 5), stickMat));
    const star = new THREE.Group();
    star.position.copy(top);
    const lan = singleLantern('star', new THREE.Color(c));
    lan.scale.setScalar(1.35);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 5, 22), tinsel);
    star.add(lan, ring, glow(new THREE.Color(c).lerp(new THREE.Color(0xffc080), 0.5), 1.1, 0.4));
    pivot.add(star);
    chair.add(pivot);
    lanterns.push({ pivot, star, ph: i * 1.7 });
  });
  const hit = hitBox(1.2, 2.1, 1.2, 1.0);
  chair.add(hit);
  group.add(chair);
  const home = Math.atan2(tvAt.x - at.x, tvAt.z - at.z); // parked facing the TV
  chair.rotation.y = home;

  let busy = false, bounce = 0;
  const who = () => `<b>${t('fakerWho')}:</b> `;
  const turn = (to, dur) => { const from = chair.rotation.y, d = wrap(to - from); audio.play('squeak'); return animate(dur, (k) => (chair.rotation.y = from + d * ease(k))); };
  async function play(cam) {
    if (busy) return; busy = true;
    await turn(Math.atan2(cam.x - at.x, cam.z - at.z), 0.8);
    man.pose('R', -2.6, 0.45, -0.8); bounce = 1; // a thumb up over his shoulder at the stock
    say(who() + t('faker1'));
    await wait(3.2);
    rest();
    await turn(home, 0.8); // back to the match
    say(null); busy = false;
  }
  hit.userData.gag = play;
  return {
    group, hit, where: at, get busy() { return busy; },
    tick(time, dt) {
      tv.screen.material.emissiveIntensity = 1 + Math.sin(time * 23) * 0.08 + Math.sin(time * 3.1) * 0.1;
      tv.light.material.opacity = 0.25 + Math.sin(time * 17) * 0.03;
      bounce = Math.max(0, bounce - dt * 0.6);
      for (const l of lanterns) l.star.rotation.y = face - chair.rotation.y; // whichever way he turns, his stock faces the street
      for (const l of lanterns) l.pivot.rotation.set(Math.sin(time * 1.3 + l.ph) * 0.05 + Math.sin(time * 9) * 0.15 * bounce, 0, Math.sin(time * 1.1 + l.ph) * 0.06 + Math.sin(time * 11 + l.ph) * 0.12 * bounce);
      if (!busy) man.body.rotation.y = Math.sin(time * 0.4) * 0.04;
    },
  };
}

// ---------- the trà đá stall: a low table, plastic stools, the big cooler of iced tea ----------
function traSign() {
  return canvasTex(256, 128, (x, w, h) => {
    x.fillStyle = '#c9a26a'; x.fillRect(0, 0, w, h); // a flap of carton
    x.fillStyle = 'rgba(80,50,20,.15)'; for (let i = 0; i < 40; i++) x.fillRect(Math.random() * w, Math.random() * h, 30, 2);
    x.fillStyle = '#1a1a1a'; x.font = '700 58px "Be Vietnam Pro"'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.save(); x.translate(w / 2, h / 2 - 8); x.rotate(-0.05); x.fillText('TRÀ ĐÁ', 0, 0); x.restore();
    x.font = '600 22px "Be Vietnam Pro"'; x.fillStyle = '#b3141f'; x.fillText('3K · kẹo lạc', w / 2, h - 18);
  });
}
const PIPE_L = 0.72, NO = V(0, 0.318, 0.12); // the tube's length, and the bowl's mouth in the pipe's frame
function dieuCay() { // the bamboo water pipe: a thick tube open at the top, bound near the mouth, a bowl (nõ) near the bottom
  const g = new THREE.Group(), cane = 0xc9a55a, node = 0x8a6a30, p = [];
  p.push(paint(new THREE.CylinderGeometry(0.04, 0.044, PIPE_L, 12).translate(0, PIPE_L / 2, 0), cane));
  p.push(paint(new THREE.CircleGeometry(0.033, 12).rotateX(-Math.PI / 2).translate(0, PIPE_L + 0.001, 0), 0x1a120a)); // the dark mouth of the tube
  for (const y of [0.1, 0.33, 0.56]) p.push(paint(new THREE.TorusGeometry(0.043, 0.006, 4, 14).rotateX(Math.PI / 2).translate(0, y, 0), node));
  for (const y of [0.64, 0.655, 0.67]) p.push(paint(new THREE.TorusGeometry(0.041, 0.004, 4, 14).rotateX(Math.PI / 2).translate(0, y, 0), 0x5a3a1a)); // rattan binding
  p.push(paint(tube(V(0, 0.2, 0.02), V(0, 0.29, 0.11), 0.009, 6), 0x8a6a30));
  p.push(paint(new THREE.CylinderGeometry(0.02, 0.012, 0.03, 8).translate(0, 0.3, 0.12), 0x3a2a1a));
  g.add(solid(p, { roughness: 0.55 }));
  const ember = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshStandardMaterial({ color: 0x3a1a0a, emissive: 0xff5a10, emissiveIntensity: 0 }));
  ember.position.copy(NO);
  const spark = glow(0xff6a20, 0.18, 0);
  spark.position.copy(NO);
  const flame = glow(0xffb040, 0.09, 0); // the lighter's flame, drawn down into the bowl
  flame.position.copy(NO).add(V(0, 0.035, 0));
  g.add(ember, spark, flame);
  return { g, ember, spark, flame };
}
// a puff of smoke: a few soft lumps, white, fading out to nothing (the lantern glow is orange and too tight for it)
const SMOKE = canvasTex(128, 128, (x, w) => {
  for (const [cx, cy, r, a] of [[64, 64, 52, 0.55], [48, 56, 30, 0.5], [80, 60, 28, 0.45], [62, 78, 26, 0.4], [70, 44, 22, 0.35]]) {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, w);
  }
});

// the blue plastic stool of every pavement: a rounded seat with a hole in it, over four sides that splay out
// to the floor, each cut through with an arch so what's left at the corners are the legs
const STOOL = (() => {
  const top = new THREE.Shape(), r = 0.04, w = 0.16;
  top.moveTo(-w + r, -w);
  for (const [cx, cy, a] of [[w - r, -w + r, -Math.PI / 2], [w - r, w - r, 0], [-w + r, w - r, Math.PI / 2], [-w + r, -w + r, Math.PI]]) top.absarc(cx, cy, r, a, a + Math.PI / 2);
  top.holes.push(new THREE.Path().absarc(0, 0, 0.018, 0, Math.PI * 2, true));
  const seat = new THREE.ExtrudeGeometry(top, { depth: 0.025, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2).translate(0, 0.27, 0);
  const side = new THREE.Shape(), h = 0.27, bw = 0.18, tw = 0.15;
  side.moveTo(-bw, 0); side.lineTo(-0.1, 0); side.lineTo(-0.1, 0.12);
  side.absarc(0, 0.12, 0.1, Math.PI, 0, true);
  side.lineTo(0.1, 0); side.lineTo(bw, 0); side.lineTo(tw, h); side.lineTo(-tw, h); side.closePath();
  const t = 0.012, lean = Math.atan((bw - tw) / h);
  const panel = new THREE.ExtrudeGeometry(side, { depth: t, bevelEnabled: false, curveSegments: 8 }).rotateX(-lean).translate(0, 0, bw - t);
  return mergeGeometries([seat, ...[0, 1, 2, 3].map((k) => panel.clone().rotateY(k * Math.PI / 2))]);
})();

export function createTraDa({ at: at0, turn, audio, say }) {
  const group = new THREE.Group();
  group.position.copy(at0); group.rotation.y = turn;
  const stool = (hex, x, z) => paint(STOOL.clone().translate(x, 0, z), hex);
  const p = [
    paint(new THREE.BoxGeometry(0.62, 0.025, 0.42).translate(0, 0.42, 0.12), 0x2a6ac8), // low plastic table
    ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => paint(new THREE.BoxGeometry(0.03, 0.41, 0.03).translate(a * 0.28, 0.205, 0.12 + b * 0.18), 0x2a6ac8)),
    // everyone sits on the far side, so the street side stays open: you see them as you come down the street
    stool(0xc8202a, -0.55, 0.12), stool(0x2a6ac8, -0.35, -0.42), stool(0xc8202a, 0.3, -0.45),
    paint(new THREE.CylinderGeometry(0.14, 0.14, 0.34, 16).translate(0.72, 0.47, -0.3), 0xd8282a), // the cooler, on a stool of its own
    stool(0x2a6ac8, 0.72, -0.3),
    paint(new THREE.CylinderGeometry(0.145, 0.145, 0.05, 16).translate(0.72, 0.66, -0.3), 0xf2f0ea),
    paint(new THREE.BoxGeometry(0.03, 0.03, 0.06).translate(0.72, 0.38, -0.15), 0xf2f0ea), // its tap
    paint(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 12).translate(-0.18, 0.505, 0.05), 0xe8e0c0), // a jar of kẹo lạc
    paint(new THREE.CylinderGeometry(0.072, 0.072, 0.02, 12).translate(-0.18, 0.585, 0.05), 0xc8202a),
    paint(new THREE.SphereGeometry(0.08, 12, 8).scale(1, 0.8, 1).translate(0.14, 0.495, 0.02), 0xe8e4da), // teapot
    paint(tube(V(0.2, 0.49, 0.02), V(0.28, 0.54, 0.02), 0.012, 5), 0xe8e4da),
  ];
  group.add(solid(p, { roughness: 0.45 }));
  const tea = new THREE.MeshStandardMaterial({ color: 0xd8902a, transparent: true, opacity: 0.75, roughness: 0.1 });
  const glass = new THREE.CylinderGeometry(0.032, 0.026, 0.09, 10);
  for (const [x, z] of [[0.0, 0.22], [-0.2, 0.24], [0.24, 0.2]]) { const m = new THREE.Mesh(glass, tea); m.position.set(x, 0.477, z); group.add(m); }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.22), new THREE.MeshStandardMaterial({ map: traSign(), roughness: 0.9 }));
  sign.position.set(0.72, 0.52, -0.15); sign.rotation.x = -0.1;
  group.add(sign);

  // the uncle with the pipe, a young man with his glass, and the lady who runs it
  const uncle = seated(makePerson({ top: 0xf0ece0, bottom: 0x4a5a6a, hair: 'short', hairCol: 0x3a3430, outfit: 'tee', skin: 0xd89c74 }), 0.3, -1.8, 1.8);
  uncle.g.position.set(-0.55, uncle.g.position.y, 0.12); uncle.g.rotation.y = Math.PI / 2 + 0.25;
  uncle.legs.forEach((l, i) => (l.hp.rotation.z = (i ? 1 : -1) * 0.3)); // knees apart, the pipe stood between them
  const torso = waist(uncle); // he leans from the hips: down into the pipe, back to breathe out
  const GROUND = -uncle.g.position.y, mouthT = V(0, HEAD_Y - H * 0.28 - uncle.B.hip, H * 0.95);
  const pipe = dieuCay();
  uncle.g.add(pipe.g);
  const lighter = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.05, 0.014), new THREE.MeshStandardMaterial({ color: 0xd8202a, roughness: 0.3 }));
  lighter.position.copy(uncle.arms[1].hand).add(V(0, 0.01, 0.02)); lighter.visible = false;
  uncle.arms[1].el.add(lighter);

  // Everything he does is a handful of numbers, eased by play() and turned into a pose every frame: the lean,
  // where the pipe is (resting on the ground or up at his mouth), and where his free hand goes.
  const s = { lean: 0.1, sway: 0, mouth: 0, bowl: 0, tap: 0, flame: 0 };
  const REST = V(0, GROUND, 0.34), KNEE = V(0.17, GROUND + 0.45, 0.36);
  const base = V(), toMouth = V();
  const onPipe = (h, out = V()) => out.set(0, h, 0).applyEuler(pipe.g.rotation).add(pipe.g.position);
  function pose(time) {
    torso.rotation.set(s.lean, Math.sin(time * 0.5 + 1) * 0.05, s.sway);
    torso.updateMatrix();
    // the pipe: stood on the ground leaning in to him, or tilted so its mouth meets his (lifted if it must be)
    const m = mouthT.clone().applyMatrix4(torso.matrix);
    toMouth.set(0, m.y - REST.y, m.z - REST.z).normalize();
    const up = V(0, m.y, m.z).addScaledVector(toMouth, -PIPE_L);
    up.y = Math.max(up.y, GROUND);
    base.lerpVectors(REST, up, s.mouth);
    pipe.g.position.copy(base);
    pipe.g.rotation.set(lerp(-0.15, Math.atan2(toMouth.z, toMouth.y), s.mouth), 2.68, 0); // the bowl faces him, a little to his left
    pipe.g.updateMatrix();
    reach(uncle, 0, toTorso(torso, onPipe(0.5).add(V(0, 0, -0.045)))); // one hand always on the pipe
    reach(uncle, 1, toTorso(torso, KNEE.clone().lerp(onPipe(NO.y).add(V(0.035, 0.07 - 0.03 * s.tap, -0.07)), s.bowl)));
  }
  const easeTo = (o, dur, to) => { const from = {}; for (const k in to) from[k] = o[k]; return animate(dur, (k) => { const e = ease(k); for (const n in to) o[n] = lerp(from[n], to[n], e); }); };
  const ease2 = (dur, to) => easeTo(s, dur, to);

  // the young man is the one who tells you off: he turns to you, wags a finger, then waves you to the glasses
  const lad = seated(makePerson({ top: 0x3a7a5a, bottom: 0x2a3550, hair: 'short', outfit: 'tee' }), 0.3, -1.8, 1.8);
  lad.g.position.set(-0.35, lad.g.position.y, -0.42); lad.g.rotation.y = 0.6; // turned to the table
  const ladT = waist(lad);
  lad.pose('R', -0.5, 0, -1.2); // his free hand, on the open side (the street sees it past the uncle)
  const la = lad.arms[1]; la.sh.updateMatrix(); la.el.updateMatrix();
  const L_REST = la.hand.clone().applyMatrix4(la.el.matrix).applyMatrix4(la.sh.matrix), L_WAG = V(0.32, 0.66, 0.3);
  const L_GLASS = V(0, 0.6, 0.22).sub(lad.g.position).applyAxisAngle(UP, -lad.g.rotation.y); // the glasses on the table, in his space
  const ls = { turn: 0, wag: 0, palm: 0 };
  function poseLad(time) {
    ladT.rotation.y = ls.turn;
    const r = L_REST.clone().lerp(V(Math.sin(time * 13) * 0.05, 0, 0).add(L_WAG), ls.wag);
    reach(lad, 1, r.lerp(toTorso(ladT, L_GLASS.clone()), ls.palm));
  }
  const cup = new THREE.Mesh(glass, tea); cup.position.copy(lad.arms[0].hand).add(V(0, -0.02, 0.03)); lad.arms[0].el.add(cup);
  const lady = seated(makePerson({ girl: true, top: 0x9a6aa8, bottom: 0x2a2a30, hair: 'bun', outfit: 'shirt' }), 0.3, -1.8, 1.8);
  lady.g.position.set(0.3, lady.g.position.y, -0.45); lady.g.rotation.y = -0.3;
  lady.pose('L', -0.6, 0, -1.0); lady.pose('R', -0.5, 0, -1.1);
  group.add(uncle.g, lad.g, lady.g);
  const hit = hitBox(1.8, 1.6, 1.4, 0.8);
  group.add(hit);

  // smoke: soft grey puffs from a small pool, each let go with a direction and a size
  const puffMat = new THREE.SpriteMaterial({ map: SMOKE, color: 0xc4c8ce, transparent: true, depthWrite: false, opacity: 0 });
  const puffs = Array.from({ length: 20 }, () => { const p = new THREE.Sprite(puffMat.clone()); p.visible = false; group.add(p); return { s: p, t: 9, dir: V(), size: 1, life: 2.4 }; });
  let next = 0;
  function puff(fromL, dir, size = 1, life = 2.4) { const p = puffs[next++ % puffs.length]; p.t = 0; p.s.position.copy(fromL); p.dir.copy(dir); p.size = size; p.life = life; }
  const inGroup = (v) => v.applyAxisAngle(UP, uncle.g.rotation.y).add(uncle.g.position); // his space → the stall's
  const facing = () => uncle.g.rotation.y + torso.rotation.y;

  let busy = false, draw = 0;
  async function play(cam) {
    if (busy) return; busy = true;
    const c = cam ? group.worldToLocal(cam.clone()).sub(lad.g.position).applyAxisAngle(UP, -lad.g.rotation.y) : V(0, 0, 1); // where you are, in the lad's space
    say(`<b>${t('traWho')}:</b> ${t('tra1')}`);
    const talk = (async () => {
      await easeTo(ls, 0.5, { turn: THREE.MathUtils.clamp(Math.atan2(c.x, c.z), -0.9, 0.9), wag: 1 });
      await wait(1.6);
      await easeTo(ls, 0.5, { wag: 0, palm: 1 }); // “have a tea instead”: the open hand, over to the glasses
      await wait(1.8);
      say(null);
      await easeTo(ls, 0.6, { palm: 0, turn: 0 });
    })();
    await smoke();
    await talk;
    busy = false;
  }
  async function smoke() {
    await ease2(0.5, { bowl: 1 }); // presses the tobacco down into the bowl
    for (let i = 0; i < 2; i++) { await ease2(0.12, { tap: 1 }); await ease2(0.12, { tap: 0 }); }
    lighter.visible = true; audio.play('flame');
    await ease2(0.25, { flame: 1 });
    await ease2(0.7, { lean: 0.55, mouth: 1 }); // down into the tube, mouth over its mouth
    audio.play('gurgle'); draw = 1;
    await wait(1.8);
    draw = 0;
    await ease2(0.2, { flame: 0 }); lighter.visible = false;
    for (let i = 0; i < 3; i++) puff(inGroup(NO.clone().applyMatrix4(pipe.g.matrix)), V(0, 0.2, 0), 0.4, 1.8); // a wisp left curling from the bowl
    await ease2(0.7, { lean: -0.2, mouth: 0, bowl: 0 }); // sits back, head up, and holds it
    await wait(0.6);
    audio.play('exhale');
    for (let i = 0; i < 14; i++) { // one long breath out, up into the lanterns
      const dir = V((Math.random() - 0.5) * 0.2, 0.45 + Math.random() * 0.2, 0.45 + Math.random() * 0.15).applyAxisAngle(UP, facing());
      puff(inGroup(mouthT.clone().add(V(0, 0, 0.04)).applyMatrix4(torso.matrix)), dir, 1.25 - i * 0.04);
      await wait(0.1);
    }
    await animate(1.8, (k) => { s.sway = Math.sin(k * Math.PI * 3) * 0.07 * (1 - k); s.lean = lerp(-0.2, 0.1, ease(k)); }); // that swimmy head of a good pull
  }
  hit.userData.gag = play;
  return {
    group, hit, where: at0, get busy() { return busy; },
    tick(time, dt) {
      pose(time); poseLad(time);
      const e = pipe.ember.material;
      e.emissiveIntensity += ((draw ? 3.4 + Math.sin(time * 14) * 1.2 : 0.15) - e.emissiveIntensity) * Math.min(1, dt * 8);
      pipe.spark.material.opacity = Math.min(0.9, e.emissiveIntensity * 0.25);
      pipe.flame.material.opacity = s.flame * (0.8 + Math.sin(time * 31) * 0.15);
      pipe.flame.scale.set(0.07, (draw ? 0.06 : 0.1) + Math.sin(time * 23) * 0.01, 1).multiplyScalar(s.flame + 0.001); // pulled low while he draws
      for (const p of puffs) {
        p.t += dt;
        const k = p.t / p.life;
        p.s.visible = k > 0 && k < 1;
        if (!p.s.visible) continue;
        p.s.position.addScaledVector(p.dir, dt * (1 - k) * 0.9);
        p.s.position.y += dt * 0.06; // and it rises
        p.s.scale.setScalar((0.1 + k * 0.7) * p.size);
        p.s.material.opacity = Math.sin(k * Math.PI) * 0.75;
      }
      const sip = busy ? 0 : Math.max(0, Math.sin(time * 0.7) - 0.8) * 5; // the lad drinks now and then
      lad.pose('L', lerp(-0.7, -1.9, sip), 0.1, lerp(-1.0, -2.1, sip));
      lady.body.rotation.y = Math.sin(time * 0.3) * 0.12;
    },
  };
}
