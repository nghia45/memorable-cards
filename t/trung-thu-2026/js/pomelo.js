// Làm chó bưởi: a whole pomelo on a cutting board. Three steps, each driven by `k` 0..1 (tap plays it, a drag
// scrubs it): 1) the knife scores the peel and it opens like a flower, 2) the pink segments lift out and fly
// into a little dog, 3) clove eyes, a curl of peel for the tail, and the dog wags. The board group is local space.
import * as THREE from 'three';
import { canvasTex } from './print.js';
import { lerp, easeOut } from './tween.js';

const R = 0.135, H = 0.25, BASE = 0.03;         // pomelo radius, height, board top
const P0 = new THREE.Vector3(0, BASE + H / 2, 0);
const DOG = new THREE.Vector3(0.36, BASE, 0.04), DOG_RY = -0.5; // where the dog is assembled
const NSEG = 10, NPEEL = 6;
const prof = (t) => Math.sin(Math.PI * Math.min(1, t * 0.97 + 0.02)) ** 0.55 * (1 - 0.08 * t); // round, a touch narrower at the stem

function peelTex() {
  return canvasTex(512, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9ab83a'); g.addColorStop(0.5, '#7aa22a'); g.addColorStop(1, '#5a8a22');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(40,70,10,.35)' : 'rgba(210,230,120,.35)'; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.5, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(230,210,80,.25)'; x.beginPath(); x.ellipse(w * 0.3, h * 0.4, 90, 60, 0, 0, 7); x.fill(); // sun-yellowed patch
  });
}
const vesicleTex = canvasTex(128, 128, (x, w, h) => {
  x.fillStyle = '#f7b3a8'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(255,${200 + Math.random() * 40},${190 + Math.random() * 40},.6)`; x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, 2, 6, 0.2, 0, 7); x.fill(); }
});

// A solid pomelo segment: the wedge of the flesh ball between angles ±d/2, long axis y (height ~H*0.8), back toward +z.
function segmentGeo(r = R * 0.82, h = H * 0.78, d = (Math.PI * 2) / NSEG) {
  const rows = 10, cols = 6, pos = [], uv = [], idx = [];
  const ring = (t) => r * Math.sin(Math.PI * t) ** 0.8;
  // outer skin
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    const t = i / rows, a = -d / 2 + (j / cols) * d, rr = ring(t);
    pos.push(Math.sin(a) * rr, (t - 0.5) * h, Math.cos(a) * rr); uv.push(j / cols, t);
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const a = i * (cols + 1) + j, b = a + cols + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  // the two flat faces toward the core
  for (const s of [-1, 1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= rows; i++) {
      const t = i / rows, rr = ring(t), y = (t - 0.5) * h, a = s * d / 2;
      pos.push(0, y, 0.004, Math.sin(a) * rr, y, Math.cos(a) * rr); uv.push(0, t, 1, t);
    }
    for (let i = 0; i < rows; i++) { const a = base + i * 2, b = a + 2; if (s > 0) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function createPomelo() {
  const board = new THREE.Group();
  // thớt: a round wooden board with end-grain rings
  const woodTex = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#c8955a'; x.fillRect(0, 0, w, h);
    for (let r = 6; r < 128; r += 6 + Math.random() * 4) { x.strokeStyle = `rgba(120,70,30,${0.2 + Math.random() * 0.2})`; x.lineWidth = 2; x.beginPath(); x.arc(128 + Math.random() * 4, 128, r, 0, 7); x.stroke(); }
  });
  const boardMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, BASE, 40), [new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.7 }), new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: 0x9a6a3a })]);
  boardMesh.position.y = BASE / 2;
  boardMesh.castShadow = boardMesh.receiveShadow = true;
  board.add(boardMesh);

  // ---------- peel: six petals, green skin outside, white pith inside, hinged at the bottom ----------
  const skin = new THREE.MeshStandardMaterial({ map: peelTex(), roughness: 0.55, side: THREE.FrontSide });
  const pith = new THREE.MeshStandardMaterial({ color: 0xf6eedc, roughness: 0.9, side: THREE.BackSide });
  const petals = [];
  const pts = Array.from({ length: 18 }, (_, i) => { const t = i / 17; return new THREE.Vector2(Math.max(0.002, R * prof(t)), t * H); });
  for (let i = 0; i < NPEEL; i++) {
    const phi = (i / NPEEL) * Math.PI * 2, d = (Math.PI * 2) / NPEEL;
    const geo = new THREE.LatheGeometry(pts, 8, phi - d / 2 + 0.002, d - 0.004); // hairline gaps: scored, not cut
    const pivot = new THREE.Group(); pivot.position.set(0, BASE + 0.004, 0);
    const outer = new THREE.Mesh(geo, skin), inner = new THREE.Mesh(geo, pith);
    outer.castShadow = true;
    pivot.add(outer, inner);
    pivot.userData.axis = new THREE.Vector3(Math.cos(phi), 0, -Math.sin(phi)); // tangent at the petal's middle
    board.add(pivot);
    petals.push(pivot);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.03, 6), new THREE.MeshStandardMaterial({ color: 0x4a3a1a }));
  stem.position.set(0, BASE + H + 0.01, 0);
  petals[0].add(stem); // rides on a petal as it opens

  // ---------- knife and a dish of cloves ----------
  const knife = new THREE.Group();
  knife.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.004).translate(0.08, 0, 0), new THREE.MeshStandardMaterial({ color: 0xd8dde2, metalness: 1, roughness: 0.2 })));
  knife.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.1, 8).rotateZ(Math.PI / 2).translate(-0.05, 0, 0), new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.6 })));
  const KNIFE_REST = new THREE.Vector3(-0.08, BASE + 0.01, 0.2);
  knife.position.copy(KNIFE_REST); knife.rotation.set(Math.PI / 2, 0, 0.3);
  board.add(knife);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.015, 20), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.2 }));
  const DISH = new THREE.Vector3(-0.3, 0.008, 0.08);
  dish.position.copy(DISH);
  board.add(dish);
  const cloveGeo = new THREE.CylinderGeometry(0.003, 0.002, 0.022, 5).translate(0, -0.011, 0);
  const cloveHead = new THREE.SphereGeometry(0.0075, 8, 6);
  const cloveMat = new THREE.MeshStandardMaterial({ color: 0x2a140a, roughness: 0.5 });
  const cloves = Array.from({ length: 6 }, (_, i) => {
    const c = new THREE.Group(); c.add(new THREE.Mesh(cloveGeo, cloveMat), new THREE.Mesh(cloveHead, cloveMat));
    c.position.set(DISH.x + Math.cos(i * 2.3) * 0.025, DISH.y + 0.012, DISH.z + Math.sin(i * 2.3) * 0.025); c.rotation.set(Math.PI / 2, 0, i);
    board.add(c);
    return { c, p0: c.position.clone(), r0: c.rotation.clone() };
  });

  // ---------- the flesh: ten segments, and where each one goes in the dog ----------
  const flesh = new THREE.MeshStandardMaterial({ map: vesicleTex, color: 0xffffff, roughness: 0.4, emissive: 0x4a1410, emissiveIntensity: 0.35 });
  const sgeo = segmentGeo();
  const dog = new THREE.Group(); dog.position.copy(DOG); dog.rotation.y = DOG_RY;
  board.add(dog);
  board.updateMatrixWorld(true); // start/eye positions below are computed through the dog's transform
  const e = (x, y, z, order = 'ZYX') => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, order));
  const V = (x, y = x, z = x) => new THREE.Vector3(x, y, z);
  const LIE = -Math.PI / 2; // long axis along z, back up
  // [position, rotation, scale] in dog space (dog faces +z, feet on y = 0)
  const TARGETS = [
    [[0, 0.075, -0.005], e(LIE, 0, 0), V(1)],                           // body: a loaf of three segments
    [[-0.022, 0.07, -0.005], e(LIE, 0, 0.6), V(1)],
    [[0.022, 0.07, -0.005], e(LIE, 0, -0.6), V(1)],
    ...[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) =>             // stubby legs, backs facing out
      [[sx * 0.042, 0.04, sz * 0.062], e(0, Math.atan2(sx, sz), 0, 'YXZ'), V(0.62, 0.36, 0.62)]),
    [[0, 0.17, 0.125], e(LIE + 0.3, 0, 0), V(0.58)],                     // head, nose a little down
    [[-0.036, 0.2, 0.095], e(0.3, 0, 2.5, 'XYZ'), V(0.3)],               // floppy ears
    [[0.036, 0.2, 0.095], e(0.3, 0, -2.5, 'XYZ'), V(0.3)],
  ];
  const segs = TARGETS.map(([p, q, s], i) => {
    const m = new THREE.Mesh(sgeo, flesh);
    m.castShadow = true;
    dog.add(m);
    const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (i / NSEG) * Math.PI * 2, 0));
    const p0 = dog.worldToLocal(board.localToWorld(P0.clone())); // (board has no parent transform at build time)
    return { m, p0, q0: dog.quaternion.clone().invert().multiply(q0), p1: new THREE.Vector3(...p), q1: q, s1: s };
  });
  // tail: a curl of peel, green outside
  const curl = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => { const a = i * 0.8; return new THREE.Vector3(0, Math.sin(a) * 0.02 * (1 + i * 0.1), -Math.cos(a) * 0.02 * (1 + i * 0.1) - i * 0.008); }));
  const tail = new THREE.Mesh(new THREE.TubeGeometry(curl, 24, 0.007, 6), new THREE.MeshStandardMaterial({ color: 0x8ab02a, roughness: 0.6 }));
  const tailPivot = new THREE.Group(); tailPivot.position.set(0, 0.13, -0.1); tailPivot.add(tail); tailPivot.scale.setScalar(0.001);
  dog.add(tailPivot);
  const EYES = [new THREE.Vector3(-0.02, 0.212, 0.168), new THREE.Vector3(0.02, 0.212, 0.168)];
  const eyeWorld = EYES.map((v) => board.worldToLocal(dog.localToWorld(v.clone())));

  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0.1, 0.15, 0.03); hit.userData.pomelo = true;
  board.add(hit);

  // ---------- step poses ----------
  const v = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
  const steps = [0, 0, 0];
  function score(k) { // knife circles the fruit, then the petals open
    const kk = THREE.MathUtils.clamp(k / 0.45, 0, 1), open = easeOut(THREE.MathUtils.clamp((k - 0.4) / 0.6, 0, 1));
    if (kk > 0 && kk < 1) {
      const a = kk * Math.PI * 2;
      knife.position.set(Math.sin(a) * (R + 0.05), BASE + H * (0.25 + 0.5 * Math.abs(Math.sin(kk * Math.PI * 3))), Math.cos(a) * (R + 0.05));
      knife.rotation.set(0, a + Math.PI / 2, -0.4);
    } else { knife.position.copy(KNIFE_REST); knife.rotation.set(Math.PI / 2, 0, 0.3); }
    for (const p of petals) p.quaternion.setFromAxisAngle(p.userData.axis, -open * 1.25);
  }
  function assemble(k) { // segments rise out of the open peel, then fly one by one into the dog
    segs.forEach((s, i) => {
      const lift = THREE.MathUtils.clamp(k / 0.25, 0, 1);
      const f = easeOut(THREE.MathUtils.clamp((k - 0.2 - i * 0.05) / 0.35, 0, 1));
      v.copy(s.p0); v.y += lift * 0.12;
      s.m.position.lerpVectors(v, s.p1, f);
      s.m.position.y += Math.sin(f * Math.PI) * 0.12;
      s.m.quaternion.slerpQuaternions(s.q0, s.q1, f);
      s.m.scale.lerpVectors(ONE, s.s1, f);
      s.m.visible = steps[0] > 0.6 || k > 0;
    });
  }
  function finish(k) { // clove eyes, peel tail, a little wag
    cloves.slice(0, 2).forEach((c, i) => {
      const f = easeOut(THREE.MathUtils.clamp((k - i * 0.15) / 0.5, 0, 1));
      c.c.position.lerpVectors(c.p0, eyeWorld[i], f); c.c.position.y += Math.sin(f * Math.PI) * 0.1;
      c.c.rotation.set(lerp(c.r0.x, Math.PI / 2, f), lerp(c.r0.y, DOG_RY, f), lerp(c.r0.z, 0, f), 'YXZ'); // stem into the head
    });
    tailPivot.scale.setScalar(Math.max(0.001, easeOut(THREE.MathUtils.clamp((k - 0.4) / 0.4, 0, 1))));
  }
  const apply = [score, assemble, finish];
  segs.forEach((s) => { s.m.position.copy(s.p0); s.m.quaternion.copy(s.q0); s.m.visible = false; });

  return {
    group: board, dog, hit, EYES,
    get steps() { return steps; },
    set(step, k) { steps[step] = k; apply[step](k); if (step === 0) assemble(steps[1]); }, // the flesh shows once the peel is open
    // Once the dog is done, cloves ride along: parent them to the dog so it can walk away.
    adoptEyes() { cloves.slice(0, 2).forEach((c) => dog.attach(c.c)); },
    tick(t, done) { if (steps[2] > 0.5) tailPivot.rotation.y = Math.sin(t * (done ? 9 : 5)) * 0.5; },
  };
}
