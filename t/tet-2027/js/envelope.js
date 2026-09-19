// Finale: lì xì envelope → pull card → coins spill → flip card to read the message.
// Everything lives in `group` in stage-local units (envelope 2.8 tall); main.js scales and places it.
import * as THREE from 'three';
import { paint, printMat, redPaper, cloudPattern, medallion, frame, centered, wrap, rrShape, normUV } from './print.js';
import { tween, ease, lerp } from './tween.js';

export const FLOOR_Y = -1.75;
const W = 1.6, H = 2.8, D = 0.02, F = H * 0.36; // D = half pocket thickness, F = flap depth
const REST_Y = -0.2;
const CW = W * 0.86, CH = H * 0.9, CT = 0.012;
const CARD_REST_Y = -H / 2 + CH / 2 + 0.06;
const PRESENT = new THREE.Vector3(0, 0.5, 2.8); // card held up toward the (wide, low) finale camera
const HINTS = ['<span>↑</span>Drag the flap up to open', '<span>↑</span>Pull the card out', '<span>✋</span>Tap the card to pick it up',
  '<span>↻</span>Tap to flip · drag down to put it back'];

// Front of the lì xì. Exported so the tree can hang a matching miniature.
export function envelopeFrontTex() {
  return paint(512, 896, (x, w, h, P) => {
    redPaper(x, w, h, P);
    cloudPattern(x, w, h, P);
    frame(x, w, h, P, 20);
    medallion(x, w / 2, 540, 122, P, P.col('#b80f24'));
    centered(x, 'Xuân Đinh Mùi', 718, '600 46px "Playfair Display"', P.foil);
    centered(x, '2027', 772, '600 34px "Playfair Display"', P.foil, 10);
    centered(x, 'AN KHANG · THỊNH VƯỢNG', 832, '600 17px "Be Vietnam Pro"', P.foil, 4);
  });
}

export function createEnvelopeStage({ to, from, message, setHint, frontTex, camera, sfx = () => {} }) {
  const group = new THREE.Group();
  const envelope = new THREE.Group();
  group.add(envelope);

  const paperRed = new THREE.MeshPhysicalMaterial({ color: 0xb50f24, roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.35, side: THREE.DoubleSide, fog: false });
  const paperInner = new THREE.MeshStandardMaterial({ color: 0x7a0915, roughness: 0.85, side: THREE.DoubleSide, fog: false });

  const front = new THREE.Mesh(new THREE.PlaneGeometry(W, H), printMat(frontTex));
  front.position.z = D;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), paperInner);
  back.position.z = -D;
  const sideGeo = new THREE.BoxGeometry(0.006, H, D * 2);
  const left = new THREE.Mesh(sideGeo, paperRed); left.position.x = -W / 2;
  const right = new THREE.Mesh(sideGeo, paperRed); right.position.x = W / 2;
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(W, 0.006, D * 2), paperRed); bottom.position.y = -H / 2;
  envelope.add(front, back, left, right, bottom);

  // Flap shape, hinge at y = 0 hanging down. Shared by geometry and its printed texture.
  function traceFlap(t, m) {
    t.moveTo(...m(-W / 2, 0)); t.lineTo(...m(-W / 2, -F * 0.3));
    t.quadraticCurveTo(...m(-W * 0.12, -F * 0.82), ...m(-W * 0.07, -F * 0.96));
    t.quadraticCurveTo(...m(0, -F * 1.03), ...m(W * 0.07, -F * 0.96));
    t.quadraticCurveTo(...m(W * 0.12, -F * 0.82), ...m(W / 2, -F * 0.3));
    t.lineTo(...m(W / 2, 0)); t.closePath();
  }
  const flapShape = new THREE.Shape();
  traceFlap(flapShape, (a, b) => [a, b]);
  const flapTex = paint(512, 344, (x, w, h, P) => {
    const m = (a, b) => [((a + W / 2) / W) * w, (-b / (F * 1.0015)) * h];
    x.beginPath(); traceFlap(x, m); x.save(); x.clip();
    redPaper(x, w, h, P);
    cloudPattern(x, w, h, P, 0.12);
    x.strokeStyle = P.foil; x.lineWidth = 16; x.beginPath(); traceFlap(x, m); x.stroke();
    x.restore();
    const cy = h * 0.72;
    x.fillStyle = P.foil; x.beginPath(); x.arc(w / 2, cy, 50, 0, Math.PI * 2); x.fill();
    x.strokeStyle = P.col('#b80f24'); x.lineWidth = 2.5; x.beginPath(); x.arc(w / 2, cy, 42, 0, Math.PI * 2); x.stroke();
    centered(x, '福', cy + 3, '600 50px "Noto Serif SC", "Microsoft YaHei", "SimSun", serif', P.col('#b80f24'));
  });
  const flapGeo = normUV(new THREE.ShapeGeometry(flapShape, 24));
  const flapFront = new THREE.Mesh(flapGeo, printMat(flapTex, { side: THREE.FrontSide }));
  flapFront.position.z = 2 * D + 0.004;
  const flapInner = new THREE.Mesh(flapGeo.clone().rotateY(Math.PI), paperInner);
  flapInner.position.z = 2 * D + 0.002;
  // Hinge on the back panel's top edge so the open flap folds behind the pocket and clears the card.
  const flapPivot = new THREE.Group();
  flapPivot.position.set(0, H / 2, -D);
  flapPivot.add(flapFront, flapInner);
  envelope.add(flapPivot);

  // ---------- card: two printed faces on a thin gold-edged board ----------
  const cardShape = rrShape(CW, CH, 0.07);
  const ornateTex = paint(512, 938, (x, w, h, P) => {
    const g = x.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, h * 0.6);
    g.addColorStop(0, '#9c1020'); g.addColorStop(1, '#5a0712');
    x.fillStyle = P.col(g); x.fillRect(0, 0, w, h);
    x.save(); x.globalAlpha = 0.18; x.strokeStyle = P.foil; x.lineWidth = 1.5; // diamond lattice
    for (let i = -h; i < w + h; i += 38) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i + h, h); x.stroke();
      x.beginPath(); x.moveTo(i, h); x.lineTo(i + h, 0); x.stroke();
    }
    x.restore();
    frame(x, w, h, P, 22, 5);
    x.fillStyle = P.foil;
    for (const [cx, cy, a] of [[34, 34, 0], [w - 34, 34, 1], [w - 34, h - 34, 2], [34, h - 34, 3]]) {
      x.save(); x.translate(cx, cy); x.rotate(a * Math.PI / 2);
      x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 58, 0, Math.PI / 2); x.closePath(); x.globalAlpha = 0.9; x.fill();
      x.fillStyle = P.col('#6a0914'); x.beginPath(); x.arc(0, 0, 44, 0, Math.PI / 2); x.lineTo(0, 0); x.fill();
      x.restore();
    }
    centered(x, 'MMXXVII', 150, '600 26px "Playfair Display"', P.foil, 12);
    medallion(x, w / 2, h / 2, 150, P, P.col('#8a0d1c'));
    x.fillStyle = P.foil;
    for (const yy of [h / 2 - 210, h / 2 + 210]) {
      x.save(); x.translate(w / 2, yy); x.rotate(Math.PI / 4); x.fillRect(-9, -9, 18, 18); x.restore();
    }
    centered(x, 'Tết Đinh Mùi', h - 150, 'italic 500 40px "Playfair Display"', P.foil);
  });
  const greetTex = paint(512, 938, (x, w, h, P) => {
    const ink = P.col('#a3101f');
    x.fillStyle = P.col('#f4ecd8'); x.fillRect(0, 0, w, h);
    frame(x, w, h, P, 22, 4);
    medallion(x, w / 2, 150, 72, P, P.col('#f4ecd8'));
    centered(x, 'Chúc Mừng', 282, 'italic 500 50px "Playfair Display"', ink);
    centered(x, 'Năm Mới', 340, 'italic 500 50px "Playfair Display"', ink);
    centered(x, 'HAPPY LUNAR NEW YEAR', 392, '600 15px "Be Vietnam Pro"', P.foil, 4);
    x.fillStyle = P.foil; x.fillRect(w / 2 - 60, 420, 120, 2);
    centered(x, `Gửi ${to},`, 474, '600 24px "Be Vietnam Pro"', ink);
    x.font = '400 26px "Be Vietnam Pro"';
    const lines = wrap(x, message, w - 110).slice(0, 7);
    const top = 530 + Math.max(0, 250 - lines.length * 40) / 2; // center the block between greeting and signature
    lines.forEach((l, i) => centered(x, l, top + i * 40, '400 26px "Be Vietnam Pro"', P.col('#4a2a22')));
    centered(x, `— ${from}`, h - 110, 'italic 500 30px "Playfair Display"', ink);
  });
  const card = new THREE.Group();
  const cardEdge = new THREE.Mesh(
    new THREE.ExtrudeGeometry(cardShape, { depth: CT, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, -CT / 2),
    [new THREE.MeshStandardMaterial({ color: 0xf4ecd8, roughness: 0.8, fog: false }), new THREE.MeshStandardMaterial({ color: 0xd9a843, metalness: 1, roughness: 0.3, fog: false })],
  );
  const cardFront = new THREE.Mesh(normUV(new THREE.ShapeGeometry(cardShape, 8)), printMat(ornateTex));
  cardFront.position.z = CT / 2 + 0.0008;
  const cardBack = new THREE.Mesh(normUV(new THREE.ShapeGeometry(cardShape, 8)).rotateY(Math.PI), printMat(greetTex, { clearcoat: 0.2 }));
  cardBack.position.z = -CT / 2 - 0.0008;
  card.add(cardEdge, cardFront, cardBack);

  for (const o of [front, back, left, right, flapFront, cardEdge]) o.castShadow = true;

  // ---------- coins: Vietnamese cash coins with a square hole ----------
  const coinShape = new THREE.Shape().absarc(0, 0, 0.11, 0, Math.PI * 2);
  const hole = new THREE.Path(); hole.moveTo(-0.022, -0.022); hole.lineTo(0.022, -0.022); hole.lineTo(0.022, 0.022); hole.lineTo(-0.022, 0.022); hole.closePath();
  coinShape.holes.push(hole);
  const coinGeo = new THREE.ExtrudeGeometry(coinShape, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.005, bevelSegments: 2, curveSegments: 28 }).center();
  const N_COINS = 42;
  const coinMesh = new THREE.InstancedMesh(coinGeo, new THREE.MeshStandardMaterial({ color: 0xe3b54a, metalness: 1, roughness: 0.28 }), N_COINS);
  coinMesh.castShadow = true;
  coinMesh.frustumCulled = false;
  group.add(coinMesh);
  const coins = Array.from({ length: N_COINS }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), w: new THREE.Vector3(), flat: new THREE.Quaternion(), on: false, rest: false, delay: 0 }));
  const _m = new THREE.Matrix4(), _s0 = new THREE.Vector3(0, 0, 0), _s1 = new THREE.Vector3(1, 1, 1), _dq = new THREE.Quaternion(), _e = new THREE.Euler(), _axis = new THREE.Vector3();
  function spillCoins(origin) {
    coins.forEach((c, i) => {
      c.p.copy(origin).add(new THREE.Vector3((Math.random() - 0.5) * W * 0.7, Math.random() * 0.1, (Math.random() - 0.5) * 0.05));
      c.v.set((Math.random() - 0.5) * 3.2, 1.6 + Math.random() * 2.6, 0.8 + Math.random() * 2.2);
      c.q.setFromEuler(_e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6));
      c.w.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18);
      c.flat.setFromEuler(_e.set(-Math.PI / 2 + (Math.random() < 0.5 ? 0 : Math.PI), 0, Math.random() * 6));
      c.on = true; c.rest = false; c.delay = i * 0.018;
    });
  }
  let clinks = [];
  function stepCoins(dt) {
    clinks = [];
    coins.forEach((c, i) => {
      if (!c.on || c.delay > 0) { c.delay -= dt; _m.compose(c.p, c.q, _s0); coinMesh.setMatrixAt(i, _m); return; }
      if (!c.rest) {
        c.v.y -= 7.5 * dt;
        c.p.addScaledVector(c.v, dt);
        const wl = c.w.length();
        if (wl > 1e-4) { _dq.setFromAxisAngle(_axis.copy(c.w).divideScalar(wl), wl * dt); c.q.premultiply(_dq); }
        const floorY = FLOOR_Y + 0.012;
        if (c.p.y < floorY) {
          c.p.y = floorY;
          if (c.v.y < -0.6) clinks.push(Math.min(1, -c.v.y / 4)); // each real bounce rings
          if (c.v.y < 0) c.v.y *= -0.32;
          c.v.x *= 0.55; c.v.z *= 0.55; c.w.multiplyScalar(0.5);
          if (Math.abs(c.v.y) < 0.35) c.rest = true;
        }
      } else {
        c.q.slerp(c.flat, Math.min(1, dt * 10)); // ponytail: settle-to-flat instead of rigid-body contact
      }
      _m.compose(c.p, c.q, _s1); coinMesh.setMatrixAt(i, _m);
    });
    coinMesh.instanceMatrix.needsUpdate = true;
    clinks.slice(0, 3).forEach((v) => sfx('clink', v)); // ponytail: cap per frame so a shower doesn't clip
  }

  // ---------- state machine: -1 arriving, 0 closed, 1 open, 2 card presented, 3 card held up to the camera ----------
  let stage = -1, flapT = 0, slide = 0, flip = 0, busy = false, dragStart = 0;

  function reset() {
    stage = 0; flapT = 0; slide = 0; flip = 0; busy = false; baseQ.identity(); tiltX = tiltY = 0;
    envelope.add(card);
    card.position.set(0, CARD_REST_Y, 0); card.rotation.set(0, 0, 0);
    envelope.position.set(0, REST_Y, 0); envelope.rotation.set(0, 0, 0); envelope.scale.setScalar(1);
    coins.forEach((c) => (c.on = false));
    setHint(HINTS[0]);
  }
  // Fly in from a stage-local pose (where the hanging miniature was) to the rest pose.
  function arrive(fromPos, fromScale) {
    reset();
    stage = -1; busy = true; setHint('');
    envelope.position.copy(fromPos); envelope.scale.setScalar(fromScale);
    const p0 = fromPos.clone();
    tween(2.2, (k) => {
      const e = ease(k);
      envelope.position.lerpVectors(p0, new THREE.Vector3(0, REST_Y, 0), e);
      envelope.position.y += Math.sin(e * Math.PI) * 0.8;
      envelope.scale.setScalar(lerp(fromScale, 1, e));
      envelope.rotation.set(0, (1 - e) * Math.PI * 2, Math.sin(e * Math.PI * 3) * 0.08 * (1 - e));
    }, () => { stage = 0; busy = false; setHint(HINTS[0]); });
  }
  function openFlap() {
    sfx('paper');
    busy = true; const f0 = flapT;
    tween(0.7, (k) => (flapT = lerp(f0, 1, ease(k))), () => { stage = 1; busy = false; setHint(HINTS[1]); });
  }
  function releaseCard() {
    sfx('paper');
    busy = true; setHint('');
    const s0 = slide, exitY = CARD_REST_Y + CH + 0.1 - H * 0.02;
    let spilled = false, p0, r0;
    tween(1.9, (k) => {
      envelope.position.set(0, lerp(REST_Y, -0.62, ease(k)), lerp(0, -1.8, ease(k)));
      envelope.scale.setScalar(lerp(1, 0.78, ease(k)));
      if (k < 0.4) {
        slide = lerp(s0, 1, ease(k / 0.4));
        card.position.y = lerp(CARD_REST_Y + s0 * 1.5, exitY, ease(k / 0.4));
        return;
      }
      if (!spilled) {
        spilled = true;
        group.attach(card); // keep transform, then fly free of the pocket
        p0 = card.position.clone(); r0 = card.rotation.clone();
        spillCoins(group.worldToLocal(envelope.localToWorld(new THREE.Vector3(0, H / 2, 0))));
      }
      const e = ease((k - 0.4) / 0.6);
      card.position.lerpVectors(p0, PRESENT, e);
      card.position.y += Math.sin(e * Math.PI) * 0.6;
      card.rotation.set(lerp(r0.x, 0, e), e * Math.PI * 2, lerp(r0.z, 0, e));
    }, () => { stage = 2; busy = false; baseQ.identity(); tiltX = tiltY = 0; orientCard(); setHint(HINTS[2]); });
  }
  // Held pose: card square to the camera, as large as the screen allows (group-local).
  const holdPos = new THREE.Vector3(), holdQ = new THREE.Quaternion(), _v = new THREE.Vector3(), _q = new THREE.Quaternion();
  function holdPose() {
    const s = group.getWorldScale(_v).x, tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const d = Math.max((CH * s) / (0.8 * 2 * tan), (CW * s) / (0.88 * 2 * tan * camera.aspect));
    holdPos.copy(camera.getWorldDirection(_v)).multiplyScalar(d).add(camera.position);
    group.worldToLocal(holdPos);
    holdQ.copy(group.getWorldQuaternion(_q).invert()).multiply(camera.quaternion);
  }
  // Card orientation = base (presented: identity, held: facing the camera) · pointer tilt · flip about Y.
  const baseQ = new THREE.Quaternion(), _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion(), _p0 = new THREE.Vector3(), _p1 = new THREE.Vector3();
  let tiltX = 0, tiltY = 0, pullDy = 0;
  function orientCard() { card.quaternion.copy(baseQ).multiply(_q.setFromEuler(_e.set(tiltX, flip * Math.PI + tiltY, 0))); }
  function moveCard(toHeld) {
    sfx('paper');
    busy = true; setHint('');
    holdPose();
    _p0.copy(card.position); _q0.copy(baseQ);
    if (toHeld) { _p1.copy(holdPos); _q1.copy(holdQ); } else { _p1.copy(PRESENT); _q1.identity(); }
    const f0 = flip, f1 = toHeld ? 1 : flip; // picking it up turns it to the message
    tween(1.1, (k) => {
      const e = ease(k);
      card.position.lerpVectors(_p0, _p1, e);
      card.position.y += Math.sin(e * Math.PI) * (toHeld ? 0.15 : 0.3);
      baseQ.slerpQuaternions(_q0, _q1, e);
      flip = lerp(f0, f1, e);
      orientCard();
    }, () => { stage = toHeld ? 3 : 2; busy = false; setHint(HINTS[stage]); });
  }
  function doFlip() {
    sfx('paper');
    busy = true; const f0 = flip, f1 = flip > 0.5 ? 0 : 1;
    tween(0.9, (k) => { flip = lerp(f0, f1, ease(k)); orientCard(); }, () => (busy = false));
  }

  return {
    group, W, H,
    reset, arrive,
    activate() { // tap / Enter
      if (busy || stage < 0) return;
      if (stage === 0) openFlap();
      else if (stage === 1) releaseCard();
      else if (stage === 2) moveCard(true);
      else doFlip();
    },
    dragStart() { dragStart = stage === 0 ? flapT : slide; pullDy = 0; },
    drag(dy) { // dy = upward drag as a fraction of screen height
      if (busy) return;
      if (stage === 0) flapT = THREE.MathUtils.clamp(dragStart + dy * 2.4, 0, 1);
      else if (stage === 1) slide = THREE.MathUtils.clamp(dragStart + dy * 1.8, 0, 1);
      else pullDy = dy;
    },
    dragEnd() {
      if (busy) return;
      if (stage === 0) {
        if (flapT > 0.4) openFlap();
        else { const f0 = flapT; tween(0.4, (k) => (flapT = lerp(f0, 0, ease(k)))); }
      } else if (stage === 1) {
        if (slide > 0.45) releaseCard();
        else { const s0 = slide; tween(0.4, (k) => (slide = lerp(s0, 0, ease(k)))); }
      } else if (stage === 3 && pullDy < -0.08) moveCard(false); // drag down: put the card back
      else if (stage === 2 && pullDy > 0.08) moveCard(true);     // drag up: pick it up
    },
    update(dt, t, pointer, ambient) {
      flapPivot.rotation.x = -flapT * Math.PI * 1.04;
      if (stage === 0 || stage === 1) {
        if (!busy) card.position.y = CARD_REST_Y + slide * 1.5;
        const bob = Math.sin(t * 1.3) * 0.04 * ambient;
        envelope.rotation.x = lerp(envelope.rotation.x, -pointer.y * 0.12, 0.06);
        envelope.rotation.y = lerp(envelope.rotation.y, pointer.x * 0.25, 0.06);
        if (!busy) envelope.position.y = REST_Y + bob;
      } else if (stage >= 2) {
        // presented or held card: tilt toward the pointer (less when close, so the text stays square), gentle float
        const k = stage === 3 ? 0.35 : 1;
        tiltX = lerp(tiltX, -pointer.y * 0.22 * k, 0.08);
        tiltY = lerp(tiltY, pointer.x * 0.35 * k, 0.08);
        if (!busy) {
          orientCard();
          card.position.y = (stage === 3 ? holdPos.y : PRESENT.y) + Math.sin(t * 1.2) * (stage === 3 ? 0.012 : 0.04) * ambient;
        }
      }
      stepCoins(dt);
    },
  };
}
