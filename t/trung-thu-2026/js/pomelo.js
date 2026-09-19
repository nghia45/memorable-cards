// Làm chó bưởi, the way it is really made: a sour pomelo (bưởi chua: firm, dry juice sacs) on a cutting board.
// Three steps, each driven by `k` 0..1 (tap plays it, a drag scrubs it): 1) the knife scores the peel and it
// opens like a flower, 2) the segments lift out, are pulled open so the juice sacs (tép) fan out like fur, and
// are pinned with toothpicks onto a frame already on the board (a chunk of winter melon for the body, a potato
// for the head): body, head, two floppy ears, a tail; 3) longan-seed eyes and a melon nose, and the dog wags.
import * as THREE from 'three';
import { canvasTex } from './print.js';
import { lerp, easeOut } from './tween.js';

const R = 0.135, H = 0.25, BASE = 0.03;         // pomelo radius, height, board top
const P0 = new THREE.Vector3(0, BASE + H / 2, 0);
const DOG = new THREE.Vector3(0.36, BASE, 0.04), DOG_RY = -0.5; // where the dog is assembled
const NPEEL = 6, PITH = 0.024;                  // peel pieces; the white pith is ~2 cm thick on a real pomelo
const prof = (t) => Math.sin(Math.PI * Math.min(1, t * 0.97 + 0.02)) ** 0.55 * (1 - 0.08 * t); // round, a touch narrower at the stem

// A thick curved piece between angles a0..a0+da: outer surface at radius ro(t), inner at ri(t), cut walls on
// both sides, t = 0..1 up the height h. Groups: 0 the outer surface, 1 the inner surface and the cut walls.
// ri = 0 gives a solid wedge (a segment). Materials are double-sided, so winding needn't be consistent.
function shellGeo(ro, ri, h, a0, da, NT = 16, NU = 6) {
  const pos = [], uv = [], idx = [], geo = new THREE.BufferGeometry();
  const P = (r, a, t) => [r * Math.sin(a), t * h, r * Math.cos(a)];
  const grid = (f, nu) => { // (nu+1) x (NT+1) vertices from f(i, j), two triangles per cell
    const b = pos.length / 3;
    for (let i = 0; i <= NT; i++) for (let j = 0; j <= nu; j++) { pos.push(...f(i / NT, j / nu)); uv.push((a0 + da * j / nu) / (Math.PI * 2), i / NT); }
    for (let i = 0; i < NT; i++) for (let j = 0; j < nu; j++) { const a = b + i * (nu + 1) + j, c = a + nu + 1; idx.push(a, a + 1, c, a + 1, c + 1, c); }
  };
  grid((t, u) => P(ro(t), a0 + da * u, t), NU);
  const n0 = idx.length;
  grid((t, u) => P(ri(t), a0 + da * u, t), NU);
  for (const a of [a0, a0 + da]) grid((t, u) => P(lerp(ri(t), ro(t), u), a, t), 1);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.addGroup(0, n0, 0); geo.addGroup(n0, idx.length - n0, 1);
  geo.computeVertexNormals();
  return geo;
}
function peelTex() {
  return canvasTex(512, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9ab83a'); g.addColorStop(0.5, '#7aa22a'); g.addColorStop(1, '#5a8a22');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(40,70,10,.35)' : 'rgba(210,230,120,.35)'; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.5, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(230,210,80,.25)'; x.beginPath(); x.ellipse(w * 0.3, h * 0.4, 90, 60, 0, 0, 7); x.fill(); // sun-yellowed patch
  });
}
// One segment pulled open: juice sacs rooted in a band along a spine (local x, band width W across local z),
// fanned out toward +y and leaning with their place in the band. f = 0 is the closed segment (sacs packed
// upright on the spine), 1 is full fluff. Sacs are shorter toward both ends.
const sacGeo = new THREE.SphereGeometry(1, 6, 4).translate(0, 1, 0).scale(0.0052, 0.5, 0.0052);
const sacMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, emissive: 0x5a3a10, emissiveIntensity: 0.22 });
const SAC_COLORS = [0xf5e2a0, 0xf0d27a, 0xf4cfa8, 0xf8ecc4].map((c) => new THREE.Color(c));
function furSegment(L, W, len, rand) {
  const n = Math.round(L * W * 80000);
  const mesh = new THREE.InstancedMesh(sacGeo, sacMat, n);
  mesh.castShadow = true;
  const sacs = Array.from({ length: n }, (_, i) => {
    const s = rand() * 2 - 1;
    mesh.setColorAt(i, SAC_COLORS[Math.floor(rand() * SAC_COLORS.length)]);
    const b = rand() * 2 - 1;
    return { s, b, phi: b * 0.9 + (rand() - 0.5) * 0.5, tilt: (rand() - 0.5) * 0.5, len: len * (0.75 + rand() * 0.5) * (0.35 + 0.65 * Math.sqrt(Math.cos(s * Math.PI / 2))) };
  });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  let last = -1;
  const fan = (f) => {
    if (Math.abs(f - last) < 1e-3) return;
    last = f;
    sacs.forEach((c, i) => {
      p.set(c.s * L / 2, 0, c.b * W / 2 * f);
      q.setFromEuler(e.set(c.phi * f, 0, c.tilt * f));
      m.compose(p, q, sc.set(1, c.len * lerp(0.55, 1, f), 1));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  return { mesh, fan };
}
// quaternion whose local x runs along `spine` and local +y along `out` (orthogonalised)
function frame(spine, out) {
  const x = spine.clone().normalize(), y = out.clone().addScaledVector(x, -out.dot(x)).normalize(), z = x.clone().cross(y);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
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

  // ---------- peel: six thick petals, green skin outside, white spongy pith inside, hinged at the bottom ----------
  const skin = new THREE.MeshStandardMaterial({ map: peelTex(), roughness: 0.55, side: THREE.DoubleSide });
  const pith = new THREE.MeshStandardMaterial({ color: 0xf4ecd8, roughness: 0.95, side: THREE.DoubleSide });
  const petals = [];
  const ro = (t) => Math.max(0.002, R * prof(t)), ri = (t) => Math.max(0.001, R * prof(t) - PITH);
  for (let i = 0; i < NPEEL; i++) {
    const phi = (i / NPEEL) * Math.PI * 2, d = (Math.PI * 2) / NPEEL;
    const pivot = new THREE.Group(); pivot.position.set(0, BASE + 0.004, 0);
    const mesh = new THREE.Mesh(shellGeo(ro, ri, H, phi - d / 2 + 0.002, d - 0.004), [skin, pith]); // hairline gaps: scored, not cut
    mesh.castShadow = true;
    pivot.add(mesh);
    pivot.userData.axis = new THREE.Vector3(Math.cos(phi), 0, -Math.sin(phi)); // tangent at the petal's middle
    pivot.userData.dir = new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi));
    board.add(pivot);
    petals.push(pivot);
  }
  // inside the peel: the ball of segments (múi), each in its pale membrane; pulled out one by one in step 2
  const HIN = H - 2 * PITH * 0.8, rm = (t) => Math.max(0.001, (R * prof(t) - PITH) * 0.99);
  const membrane = new THREE.MeshStandardMaterial({ color: 0xf2e2bc, roughness: 0.6, side: THREE.DoubleSide });
  const flesh = new THREE.MeshStandardMaterial({ color: 0xf3d894, roughness: 0.45, side: THREE.DoubleSide });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.03, 6), new THREE.MeshStandardMaterial({ color: 0x4a3a1a }));
  stem.position.set(0, BASE + H + 0.01, 0);
  petals[0].add(stem); // rides on a petal as it opens

  // ---------- knife ----------
  const knife = new THREE.Group();
  knife.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.004).translate(0.08, 0, 0), new THREE.MeshStandardMaterial({ color: 0xd8dde2, metalness: 1, roughness: 0.2 })));
  knife.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.1, 8).rotateZ(Math.PI / 2).translate(-0.05, 0, 0), new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.6 })));
  const KNIFE_REST = new THREE.Vector3(-0.08, BASE + 0.01, 0.2);
  knife.position.copy(KNIFE_REST); knife.rotation.set(Math.PI / 2, 0, 0.3);
  board.add(knife);
  knife.children.forEach((m) => { m.userData.carryRoot = knife; });
  // a dish with two longan seeds and a melon nose, a cup of toothpicks
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.015, 20), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.2 }));
  const DISH = new THREE.Vector3(-0.3, 0.008, 0.08);
  dish.position.copy(DISH);
  board.add(dish);
  const pickMat = new THREE.MeshStandardMaterial({ color: 0xe8d4a8, roughness: 0.7 });
  const pickGeo = new THREE.CylinderGeometry(0.0012, 0.0012, 0.05, 5);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.016, 0.05, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0x3a6a8a, roughness: 0.4, side: THREE.DoubleSide }));
  cup.position.set(-0.26, 0.025, -0.1); board.add(cup);
  for (let i = 0; i < 9; i++) { const t = new THREE.Mesh(pickGeo, pickMat); t.position.set(-0.26 + Math.cos(i * 2.4) * 0.009, 0.045, -0.1 + Math.sin(i * 2.4) * 0.009); t.rotation.set(Math.sin(i) * 0.15, 0, Math.cos(i) * 0.15); board.add(t); }
  const seedMat = new THREE.MeshStandardMaterial({ color: 0x1c0f08, roughness: 0.15 });
  const seedGeo = new THREE.SphereGeometry(0.0075, 12, 8).scale(1, 0.85, 0.9);
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.008, 3).rotateX(Math.PI / 2), [new THREE.MeshStandardMaterial({ color: 0xdfe8c8, roughness: 0.6 }), new THREE.MeshStandardMaterial({ color: 0x2f5a22, roughness: 0.45 })]); // a triangle of melon, green skin out, point down
  const face = [new THREE.Mesh(seedGeo, seedMat), new THREE.Mesh(seedGeo, seedMat), nose].map((o, i) => {
    o.position.set(DISH.x + (i - 1) * 0.022, DISH.y + 0.014, DISH.z); o.castShadow = true; board.add(o);
    return { o, p0: o.position.clone() };
  });
  dish.userData.carryRoot = face[0].o; // the seeds are tiny: grabbing the dish lifts a seed out of it

  // ---------- the frame (khung) where the dog is built: a chunk of winter melon for the body, a potato head ----------
  const dog = new THREE.Group(); dog.position.copy(DOG); dog.rotation.y = DOG_RY;
  board.add(dog);
  const BODY = new THREE.Vector3(0, 0.042, -0.01), BODY_R = 0.034, HEAD = new THREE.Vector3(0, 0.09, 0.085), HEAD_R = 0.036;
  const cut = new THREE.MeshStandardMaterial({ color: 0xe6eed2, roughness: 0.8 });
  const melon = new THREE.Mesh(new THREE.CylinderGeometry(BODY_R, BODY_R, 0.13, 18).rotateX(Math.PI / 2).translate(0, 0, -0.012), [new THREE.MeshStandardMaterial({ color: 0x4f7a34, roughness: 0.5 }), cut, cut]);
  melon.position.copy(BODY);
  const potato = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 16, 12).scale(1, 0.95, 1.08), new THREE.MeshStandardMaterial({ color: 0xb8885a, roughness: 0.85 }));
  potato.position.copy(HEAD);
  melon.castShadow = potato.castShadow = true;
  dog.add(melon, potato);
  board.updateMatrixWorld(true); // start/eye positions below are computed through the dog's transform

  // ---------- thirteen segments and where each is pinned (dog faces +z, lying down) ----------
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const on = (c, r, n) => c.clone().addScaledVector(n.clone().normalize(), r);
  const PLAN = [
    ...[-1.7, -1.02, -0.34, 0.34, 1.02, 1.7].map((t) => { const n = V(Math.sin(t), Math.cos(t), 0); return { p: on(BODY, BODY_R, n), spine: V(0, 0, 1), out: n, L: 0.15, W: 0.026, len: 0.03, sc: 1 }; }),
    ...[V(0, 0.8, 0.5), V(-0.85, 0.45, 0.2), V(0.85, 0.45, 0.2)].map((n) => ({ p: on(HEAD, HEAD_R, n), spine: n.clone().cross(V(0, 0, 1)), out: n, L: 0.075, W: 0.04, len: 0.026, sc: 1 })),
    { p: on(HEAD, HEAD_R, V(0, 0.1, 1)), spine: V(1, 0, 0), out: V(0, 0.1, 1), L: 0.06, W: 0.035, len: 0.012, sc: 1 }, // short fur on the face
    ...[-1, 1].map((sx) => ({ p: HEAD.clone().add(V(sx * 0.052, 0.004, -0.004)), spine: V(0, -1, 0.25), out: V(sx, -0.1, 0.3), L: 0.075, W: 0.03, len: 0.026, sc: 0.95 })), // floppy ears
    { p: BODY.clone().add(V(0, 0.028, -0.085)), spine: V(0, 1, -0.3), out: V(0, 0.3, -1), L: 0.06, W: 0.025, len: 0.03, sc: 0.8 }, // tail
  ];
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const qDogInv = dog.quaternion.clone().invert();
  const segs = PLAN.map((pl, i) => {
    const fur = furSegment(pl.L, pl.W, pl.len, rand);
    const g = new THREE.Group(); g.add(fur.mesh);
    const pick = new THREE.Mesh(pickGeo, pickMat); pick.visible = false; g.add(pick);
    dog.add(g);
    const da = (Math.PI * 2) / PLAN.length, a0 = (i / PLAN.length) * Math.PI * 2;
    const wedge = new THREE.Mesh(shellGeo(rm, () => 0.001, HIN, a0 + 0.004, da - 0.008, 12, 3), [membrane, flesh]);
    wedge.position.set(0, BASE + PITH * 0.8, 0); wedge.castShadow = true; board.add(wedge);
    wedge.userData.out = new THREE.Vector3(Math.sin(a0 + da / 2), 0, Math.cos(a0 + da / 2));
    // start: standing inside the fruit, spine vertical, sacs facing out, stretched to the fruit's height
    const a = (i / PLAN.length) * Math.PI * 2, outB = V(Math.cos(a), 0, Math.sin(a));
    const p0 = dog.worldToLocal(board.localToWorld(P0.clone().addScaledVector(outB, R * 0.45))); // (board has no parent transform at build time)
    const q0 = qDogInv.clone().multiply(frame(V(0, 1, 0), outB));
    return { g, fur, pick, wedge, p0, q0, s0: V(0.17 / pl.L, 1, 1), p1: pl.p, q1: frame(pl.spine, pl.out), s1: V(pl.sc, pl.sc, pl.sc) };
  });
  const TAIL = segs[segs.length - 1];
  const FACE_AT = [V(-0.016, 0.1, HEAD.z + HEAD_R + 0.008), V(0.016, 0.1, HEAD.z + HEAD_R + 0.008), V(0, 0.084, HEAD.z + HEAD_R + 0.022)];
  const faceWorld = FACE_AT.map((v) => board.worldToLocal(dog.localToWorld(v.clone())));
  const EYES = FACE_AT.slice(0, 2);

  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0.1, 0.15, 0.03); hit.userData.pomelo = true;
  board.add(hit);
  // drop targets for drag and drop: the fruit, the frame, the potato head
  const ball = (r, at, parent) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), hit.material); m.position.copy(at); parent.add(m); return m; };
  const drops = [ball(R + 0.03, P0, board), ball(0.11, V(0, 0.06, 0.02), dog), ball(0.06, HEAD, dog)];

  // ---------- step poses ----------
  const v = new THREE.Vector3();
  const steps = [0, 0, 0];
  function score(k) { // knife circles the fruit, then the petals open
    const kk = THREE.MathUtils.clamp(k / 0.45, 0, 1), open = easeOut(THREE.MathUtils.clamp((k - 0.4) / 0.6, 0, 1));
    if (kk > 0 && kk < 1) {
      const a = kk * Math.PI * 2;
      knife.position.set(Math.sin(a) * (R + 0.05), BASE + H * (0.25 + 0.5 * Math.abs(Math.sin(kk * Math.PI * 3))), Math.cos(a) * (R + 0.05));
      knife.rotation.set(0, a + Math.PI / 2, -0.4);
    } else { knife.position.copy(KNIFE_REST); knife.rotation.set(Math.PI / 2, 0, 0.3); }
    for (const p of petals) { // fold outward, white pith up; the hinge slides out and up so the petals rest on the fruit's base, not in the board
      p.quaternion.setFromAxisAngle(p.userData.axis, open * 0.8);
      p.position.copy(p.userData.dir).multiplyScalar(open * 0.03).setY(BASE + 0.004 + open * 0.042);
    }
  }
  function assemble(k) { // lift out, pull open into fluff, then fly one by one onto the frame and get pinned
    const lift = easeOut(THREE.MathUtils.clamp(k / 0.2, 0, 1));
    const f = k > 0 ? lerp(0.12, 1, easeOut(THREE.MathUtils.clamp((k - 0.1) / 0.25, 0, 1))) : 0.12;
    segs.forEach((s, i) => {
      const t = easeOut(THREE.MathUtils.clamp((k - 0.3 - i * 0.0375) / 0.25, 0, 1));
      if (s.from) v.copy(s.from); else { v.copy(s.p0); v.y += lift * 0.14; } // the dropped one starts where it was let go
      s.g.position.lerpVectors(v, s.p1, t);
      s.g.position.y += Math.sin(t * Math.PI) * 0.1;
      s.g.quaternion.slerpQuaternions(s.q0, s.q1, t);
      s.g.scale.lerpVectors(s.s0, s.s1, t);
      s.fur.fan(f);
      const pin = THREE.MathUtils.clamp((t - 0.6) / 0.4, 0, 1); // the toothpick slides in as the segment lands
      s.pick.visible = pin > 0;
      s.pick.position.y = lerp(0.07, -0.022, easeOut(pin));
      // the segment is pulled out of the ball and its membrane peeled off; then the sacs fluff out
      const pull = easeOut(THREE.MathUtils.clamp((k - i * 0.008) / 0.12, 0, 1));
      s.wedge.position.set(0, BASE + PITH * 0.8 + pull * 0.1, 0).addScaledVector(s.wedge.userData.out, pull * 0.05);
      s.wedge.visible = !s.from && pull < 1;
      s.g.visible = !!s.from || pull >= 1;
    });
  }
  function finish(k) { // longan-seed eyes, then the melon nose
    face.forEach((c, i) => {
      const f = easeOut(THREE.MathUtils.clamp((k - i * 0.2) / 0.5, 0, 1));
      c.o.position.lerpVectors(c.p0, faceWorld[i], f); c.o.position.y += Math.sin(f * Math.PI) * 0.1;
      c.o.rotation.set(0, lerp(0, DOG_RY, f), 0);
    });
  }
  const apply = [score, assemble, finish];
  assemble(0);
  const up = new THREE.Vector3(0, 1, 0), wag = new THREE.Quaternion();

  return {
    group: board, dog, hit, EYES, drops,
    tools: [knife.children, segs.map((s) => s.wedge), [dish, ...face.map((c) => c.o)]], // what the viewer drags at each step
    dropped(o) { // start the step's animation from where the dragged piece was let go
      const s = segs.find((s) => s.wedge === o), c = face.find((c) => c.o === o);
      if (s) s.from = dog.worldToLocal(board.localToWorld(o.position.clone()));
      if (c) c.p0.copy(o.position);
    },
    get steps() { return steps; },
    set(step, k) { steps[step] = k; apply[step](k); if (step === 0) assemble(steps[1]); }, // the flesh shows once the peel is open
    // Once the dog is done, the eyes and nose ride along: parent them to the dog so it can walk away.
    adoptEyes() { face.forEach((c) => dog.attach(c.o)); },
    tick(t, done) { if (steps[2] > 0.5) TAIL.g.quaternion.copy(TAIL.q1).premultiply(wag.setFromAxisAngle(up, Math.sin(t * (done ? 9 : 5)) * 0.5)); },
  };
}
