// The five stalls on Hàng Mã, each a hands-on activity. Every stop is a group placed on the pavement in front
// of its shop (local +z faces the street) with an artisan behind the table, and an async run(ctx) that walks the
// viewer through its steps: ctx.waitTap(targets, { hint, scrub }) waits for a tap (or a drag that scrubs the
// step), ctx.play(dur, fn) animates it. When run() resolves the director shows the stop's fact card.
import { t } from './lang.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex, glowTex } from './print.js';
import { lerp, ease, easeOut } from './tween.js';
import { makePerson } from './figures.js';
import { singleLantern } from './lanterns.js';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const cl = (k, a, b) => THREE.MathUtils.clamp((k - a) / (b - a), 0, 1);
const TABLE_H = 0.74;
const woodMat = std(0x6a3f22, { roughness: 0.7 });

function table(w = 1.3, d = 0.66, h = TABLE_H) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), woodMat); top.position.y = h - 0.02;
  g.add(top);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.045, h - 0.04, 0.045), woodMat); l.position.set(x * (w / 2 - 0.06), (h - 0.04) / 2, z * (d / 2 - 0.06)); g.add(l); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
function artisan(opts, g) {
  const p = makePerson({ outfit: 'shirt', ...opts });
  p.sit(false);
  p.legs.forEach((l) => { l.hp.rotation.x = -1.3; l.kn.rotation.x = 1.8; });
  p.g.position.set(0, p.g.position.y + 0.42, -0.62);
  p.pose('L', -1.1, 0.15, -0.6); p.pose('R', -1.1, 0.15, -0.6);
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.4, 4).rotateY(Math.PI / 4).translate(0, 0.2, -0.62), std(0x2a6ac8, { roughness: 0.4 }));
  stool.castShadow = true;
  g.add(p.g, stool);
  return p;
}
const hitBox = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(x, y, z); return m; };
const pulse = (m, t) => { if (m) m.material.opacity = 0.35 + 0.25 * Math.sin(t * 3); };
function marker() { // a soft glow that says "tap here"
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff0b0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 }));
  s.scale.setScalar(0.35);
  return s;
}

// The star as the Hàng Mã stalls sell it: ten facets of printed paper alternating red and green, each with a
// gold flower scroll, gold strips along the outline and ridges, a round printed medallion at the centre, pink tinsel around
// it and a pink handle. Built in pieces so the stall can assemble it: set(step, k) runs step 0 (sticks from their
// start pose to the frame), 1 (cellophane on, frame wrapped), 2 (tinsel, handle, candle, light) to k in [0, 1].
function facetTex(base, dark) {
  // uv: the facet's rim edge runs along the bottom of the canvas, its apex (the star's centre) is top middle
  return canvasTex(128, 128, (x, w, h) => {
    const gr = x.createRadialGradient(64, 80, 6, 64, 70, 90); gr.addColorStop(0, base); gr.addColorStop(1, dark);
    x.fillStyle = gr; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#f3c84e'; x.fillStyle = '#f3c84e'; x.lineCap = 'round'; x.lineJoin = 'round';
    // hairline border a little inside the triangle's edges
    x.lineWidth = 1.4; x.beginPath(); x.moveTo(64, 14); x.lineTo(12, 120); x.lineTo(116, 120); x.closePath(); x.stroke();
    // a printed flower scroll: stem, curling tendrils, leaves and a bloom
    x.lineWidth = 2;
    x.beginPath(); x.moveTo(64, 116); x.bezierCurveTo(52, 96, 76, 80, 64, 52); x.stroke();
    for (const [y, sd, len] of [[104, -1, 18], [96, 1, 16], [84, -1, 14], [74, 1, 12]]) {
      x.beginPath(); x.moveTo(64, y); x.bezierCurveTo(64 + sd * len * 0.6, y - 12, 64 + sd * len * 1.3, y - 2, 64 + sd * len, y + 6);
      x.arc(64 + sd * len * 0.9, y + 3, 3, 0, Math.PI * 1.5, sd < 0); x.stroke();
      x.beginPath(); x.ellipse(64 + sd * len * 0.45, y - 5, 5, 2.2, sd * -0.7, 0, 7); x.fill();
    }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; x.beginPath(); x.ellipse(64 + Math.cos(a) * 6, 46 + Math.sin(a) * 6, 4.2, 2.2, a, 0, 7); x.fill(); }
    x.fillStyle = dark; x.beginPath(); x.arc(64, 46, 2.6, 0, 7); x.fill();
    x.fillStyle = '#f3c84e';
    for (const [dx, dy] of [[-22, 112], [22, 112], [-10, 64], [12, 62]]) { x.beginPath(); x.arc(64 + dx, dy, 1.8, 0, 7); x.fill(); }
  }, 2);
}
// the round print at the centre: a gold rim with beads, a red field, a gold lotus and a sun in the middle
const medallionTex = () => canvasTex(128, 128, (x) => {
  const c = 64, gold = '#f3c84e';
  x.fillStyle = gold; x.beginPath(); x.arc(c, c, 63, 0, 7); x.fill();
  x.fillStyle = '#9a1016'; x.beginPath(); x.arc(c, c, 55, 0, 7); x.fill();
  x.fillStyle = gold; for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; x.beginPath(); x.arc(c + Math.cos(a) * 50, c + Math.sin(a) * 50, 1.8, 0, 7); x.fill(); }
  x.strokeStyle = gold; x.lineWidth = 2; x.beginPath(); x.arc(c, c, 45, 0, 7); x.stroke();
  for (let i = 0; i < 8; i++) { // lotus petals
    const a = (i / 8) * Math.PI * 2;
    x.save(); x.translate(c, c); x.rotate(a);
    x.beginPath(); x.moveTo(0, -14); x.bezierCurveTo(12, -22, 8, -36, 0, -42); x.bezierCurveTo(-8, -36, -12, -22, 0, -14); x.fill();
    x.fillStyle = '#c0282c'; x.beginPath(); x.moveTo(0, -20); x.bezierCurveTo(5, -25, 3, -32, 0, -35); x.bezierCurveTo(-3, -32, -5, -25, 0, -20); x.fill();
    x.fillStyle = gold; x.restore();
  }
  x.beginPath(); x.arc(c, c, 12, 0, 7); x.fill();
  x.fillStyle = '#c0282c'; x.beginPath(); x.arc(c, c, 6, 0, 7); x.fill();
}, 2);
function buildStar() {
  const R = 0.2, r = 0.082, depth = 0.075;
  const tip = (i) => { const a = Math.PI / 2 + (i / 5) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0); };
  const rim = Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 2 + (i / 10) * Math.PI * 2, rr = i % 2 ? r : R; return new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, 0); });
  const lantern = new THREE.Group();
  // ten sticks, each tip to tip across one face, bowed with the bulge; raw bamboo until wrapped in gold paper
  const RAW = new THREE.Color(0xd4ad6a), GOLD = new THREE.Color(0xf0c030);
  const frameMat = std(0xd4ad6a, { roughness: 0.45 });
  const sticks = [];
  for (const s of [1, -1]) for (let i = 0; i < 5; i++) {
    const a = tip(i), b = tip((i + 2) % 5);
    const lift = (v) => v.clone().setZ(s * depth * (1 - v.length() / R) * 0.9);
    const pts = [0, 0.25, 0.5, 0.75, 1].map((t) => lift(a.clone().lerp(b, t)));
    const mid = pts[2].clone();
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => p.clone().sub(mid))), 12, 0.0045, 4), frameMat);
    m.castShadow = true;
    m.position.copy(mid);
    sticks.push({ m, p1: mid, q1: new THREE.Quaternion(), dir: b.clone().sub(a).normalize(), p0: mid.clone(), q0: new THREE.Quaternion() });
    lantern.add(m);
  }
  // cellophane: facets alternate red and green around the star, so each point is half of each
  const papers = [['#e0302c', '#860e14', 0xff3a18], ['#2fa453', '#0d5227', 0x30d060]].map(([base, dark, glow]) => {
    const map = facetTex(base, dark);
    return new THREE.MeshStandardMaterial({ map, emissive: glow, emissiveMap: map, emissiveIntensity: 0, roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide });
  });
  const facets = [];
  for (const s of [1, -1]) for (let i = 0; i < 10; i++) {
    const a = rim[i], b = rim[(i + 1) % 10], c = new THREE.Vector3(0, 0, s * depth);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const geo = new THREE.BufferGeometry().setFromPoints([c, a, b].map((v) => v.clone().sub(mid)));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0.5, 1, 0, 0, 1, 0], 2));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, papers[i % 2]);
    m.position.copy(mid); m.scale.setScalar(0.001); m.renderOrder = 2;
    facets.push(m); lantern.add(m);
  }
  const strips = [new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim, true, 'catmullrom', 0), 80, 0.0055, 4, true)];
  for (const s of [1, -1]) for (const v of rim) strips.push(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0, 0, s * depth), v), 1, 0.0035, 4));
  const edging = new THREE.Mesh(mergeGeometries(strips), std(0xf0c030, { roughness: 0.3, metalness: 0.35, emissive: 0x8a6010, emissiveIntensity: 0.25 }));
  edging.visible = false; lantern.add(edging);
  const medMat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.2, emissive: 0xffffff, emissiveIntensity: 0 });
  medMat.map = medMat.emissiveMap = medallionTex();
  const medallions = [1, -1].map((s) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.05, 32), medMat);
    m.position.z = s * (depth + 0.003); if (s < 0) m.rotation.y = Math.PI; m.scale.setScalar(0.001); m.renderOrder = 3;
    lantern.add(m); return m;
  });
  // kim tuyến: a ring of pink tinsel around the tips, shreds sticking out every which way
  const tinsel = new THREE.Group();
  const pink = std(0xff3fae, { metalness: 0.7, roughness: 0.28, side: THREE.DoubleSide, emissive: 0x801050, emissiveIntensity: 0.2 });
  tinsel.add(new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.006, 5, 64), pink));
  const N = 420, shreds = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.0035, 0.034).translate(0, 0.014, 0), pink, N);
  const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), at = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + Math.random() * 0.02, out = Math.random() * Math.PI * 2;
    // pointing away from the ring's core, round the full circle of its cross-section, with a random twist
    q.setFromEuler(e.set(Math.sin(out) * 1.2, (Math.random() - 0.5) * 2, a - Math.PI / 2 + Math.cos(out) * 1.2 + (Math.random() - 0.5) * 0.6));
    mm.compose(at.set(Math.cos(a) * 0.225, Math.sin(a) * 0.225, 0), q, sc.setScalar(0.7 + Math.random() * 0.6));
    shreds.setMatrixAt(i, mm);
  }
  tinsel.add(shreds); tinsel.scale.setScalar(0.001);
  lantern.add(tinsel);
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.04, 8), std(0xfff4dc));
  candle.position.y = -0.02; candle.scale.setScalar(0.001);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2, 1.3, 0.6), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  flame.scale.set(0.05, 0.08, 1); flame.position.y = 0.01;
  const light = new THREE.PointLight(0xff5a30, 0, 2.5, 1.5); light.position.z = -0.2; // behind the star, lighting the stall, not washing its face
  lantern.add(candle, flame, light);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.008, 0.62, 6).translate(0, -0.31, 0), std(0xe8338f, { roughness: 0.35 }));
  handle.position.y = -0.225; handle.scale.set(1, 0.001, 1); handle.visible = false;
  lantern.add(handle);

  const glowAll = (v) => { for (const p of papers) p.emissiveIntensity = v; medMat.emissiveIntensity = v * 0.5; };
  function set(step, k) {
    if (step === 0) sticks.forEach((st, i) => {
      const kk = ease(cl(k, i * 0.05, i * 0.05 + 0.5));
      st.m.position.lerpVectors(st.p0, st.p1, kk); st.m.position.y += Math.sin(kk * Math.PI) * 0.12;
      st.m.quaternion.slerpQuaternions(st.q0, st.q1, kk);
    });
    if (step === 1) {
      facets.forEach((f, i) => f.scale.setScalar(Math.max(0.001, easeOut(cl(k, i * 0.035, i * 0.035 + 0.22)))));
      medallions.forEach((m) => m.scale.setScalar(Math.max(0.001, easeOut(cl(k, 0.75, 1)))));
      frameMat.color.lerpColors(RAW, GOLD, cl(k, 0.1, 0.8));
      edging.visible = k > 0.7;
      for (const st of sticks) st.m.visible = k < 0.9; // under the paper now; the gold strips trace the frame
    }
    if (step === 2) {
      tinsel.scale.setScalar(Math.max(0.001, easeOut(cl(k, 0, 0.45))));
      candle.scale.setScalar(Math.max(0.001, cl(k, 0.3, 0.5)));
      handle.scale.set(1, Math.max(0.001, cl(k, 0.2, 0.6)), 1); handle.visible = k > 0.2;
      const lit = cl(k, 0.55, 1);
      flame.material.opacity = lit; glowAll(lit * 1.1); light.intensity = lit * 1.2;
    }
  }
  const flicker = (t) => { const f = 0.9 + Math.sin(t * 13) * 0.06 + Math.sin(t * 7) * 0.04; glowAll(1.1 * f); flame.scale.set(0.05, 0.08 * f, 1); };
  return { lantern, sticks, light, candle, set, flicker };
}
// The finished star, lit, for carrying through the rest of the evening (the carrier brings its own light).
export function finishedStar() {
  const s = buildStar();
  for (let k = 0; k < 3; k++) s.set(k, 1);
  s.lantern.remove(s.light);
  s.lantern.userData.flicker = s.flicker;
  return s.lantern;
}

// ======================= 1. đèn ông sao: tie the frame, paste the cellophane, light the candle =======================
function starStop(audio) {
  const g = new THREE.Group();
  g.add(table());
  const maker = artisan({ elder: true, glasses: true, top: 0xe8e0cc, bottom: 0x3a3a40, hair: 'short' }, g);
  // finished lanterns hanging behind him, and bundles of split bamboo on the table
  const bundle = new THREE.Mesh(mergeGeometries(Array.from({ length: 24 }, (_, i) => new THREE.CylinderGeometry(0.004, 0.004, 0.5, 3).rotateZ(Math.PI / 2 + (Math.random() - 0.5) * 0.08).translate(0, i * 0.0015, (i % 6) * 0.01))), std(0xd8b070));
  bundle.position.set(-0.45, TABLE_H + 0.01, -0.12);
  g.add(bundle);
  const sheets = [];
  for (let i = 0; i < 3; i++) { // cellophane sheets
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22).rotateX(-Math.PI / 2), std([0xff2418, 0xffc000, 0x2f9f60][i], { transparent: true, opacity: 0.7, roughness: 0.15, emissive: [0xff2418, 0xffc000, 0x2f9f60][i], emissiveIntensity: 0.08 }));
    sheet.position.set(0.42 + i * 0.03, TABLE_H + 0.003 + i * 0.002, -0.1 + i * 0.05); sheet.rotation.y = i * 0.3;
    g.add(sheet); sheets.push(sheet);
  }

  const C = new THREE.Vector3(0, TABLE_H + 0.3, 0.08); // where the lantern takes shape, upright, facing the street
  const star = buildStar();
  const { lantern, sticks, light } = star;
  lantern.position.copy(C);
  g.add(lantern);
  // the ten sticks come out of the bundle: each starts lying inside it, along its length, hidden until drawn out
  const X = new THREE.Vector3(1, 0, 0), from = bundle.position.clone().sub(C);
  sticks.forEach((st, i) => {
    st.p0 = from.clone().add(new THREE.Vector3(0, 0.004 + (i % 3) * 0.0015, (i % 6) * 0.01));
    st.q0 = new THREE.Quaternion().setFromUnitVectors(st.dir, X);
    st.m.visible = false;
  });
  const spare = new THREE.Mesh(star.candle.geometry.clone().scale(1.6, 1.6, 1.6), star.candle.material); // a candle to carry over, lying on the table
  spare.rotation.z = Math.PI / 2; spare.position.set(0.3, TABLE_H + 0.015, 0.2); g.add(spare);
  const hit = hitBox(0.7, 0.6, 0.5, 0, TABLE_H + 0.25, 0.05);
  g.add(hit);
  const set = (step, k) => { if (step === 0) sticks.forEach((st) => (st.m.visible = true)); star.set(step, k); };

  const HINTS = ['star1', 'star2', 'star3'];
  const STUFF = [[bundle], [sheets[0], sheets[2]], [spare]];
  const DUR = [2.4, 2.6, 2.0];
  return {
    id: 'star', group: g, lantern, maker,
    pose: { target: new THREE.Vector3(0, TABLE_H + 0.2, 0.05), pitch: -0.4, dist: 1.3 }, // the bamboo and cellophane in view
    async run(ctx) {
      for (let s = 0; s < 3; s++) {
        const { k0 } = await ctx.waitTap([hit], { hint: t(HINTS[s]), carry: STUFF[s], back: true });
        if (s === 1) sheets[0].visible = sheets[2].visible = false; // they went on the lantern
        if (s === 2) spare.visible = false;
        let done = 0;
        await ctx.play(DUR[s] * (1 - k0), (k) => {
          const kk = lerp(k0, 1, k); set(s, kk);
          if (s === 0 && done < 10 && kk > done * 0.05 + 0.45) { done++; audio.play('pop', 0.6); }
          if (s === 1 && done < 20 && kk > done * 0.04 + 0.1) { done++; if (done % 3 === 1) audio.play('paper'); }
          if (s === 2 && !done && kk > 0.55) { done = 1; audio.play('flame'); }
        });
      }
      audio.play('chime');
    },
    tick(t, dt) {
      maker.arms[0].el.rotation.x = -0.6 + Math.sin(t * 2.2) * 0.1; maker.arms[1].el.rotation.x = -0.6 + Math.sin(t * 2.6 + 1) * 0.1;
      if (light.intensity > 0) star.flicker(t);
    },
    reset() {}, // (the finished lantern leaves with the viewer)
  };
}

// ======================= 2. tò he: shape a rooster from coloured rice dough, on a bamboo stick =======================
function toheStop(audio) {
  const g = new THREE.Group();
  const stand = new THREE.Group();
  // the artisan's box-stand: a wooden box on legs with dough in little compartments, and a tall post of finished figures
  const bx = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 0.36), woodMat); bx.position.y = 0.62;
  stand.add(bx);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.54, 0.035), woodMat); l.position.set(x * 0.24, 0.27, z * 0.14); stand.add(l); }
  const DOUGH = [0xffd23a, 0xe8322a, 0x2e8a3e, 0x2a5ad8, 0xffffff, 0x222222, 0xff8a2a, 0xe86aa8];
  const lumps = DOUGH.map((c, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8).scale(1.2, 0.7, 1.2), std(c, { roughness: 0.5 })); d.position.set(-0.19 + (i % 4) * 0.125, 0.72, -0.07 + Math.floor(i / 4) * 0.13); stand.add(d); return d; });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.7, 10), std(0x8a9a4a, { roughness: 0.8 })); // a banana trunk to stick figures in
  post.position.set(0.2, 1.05, -0.08);
  stand.add(post);
  const figColors = [[0xe8322a, 0xffd23a], [0x2a5ad8, 0xffffff], [0xff8a2a, 0x2e8a3e], [0xe86aa8, 0xffd23a], [0xffffff, 0xe8322a], [0x2e8a3e, 0xffd23a]];
  figColors.forEach(([a, b2], i) => {
    const ang = (i / figColors.length) * Math.PI * 2, y = 0.85 + (i % 3) * 0.18;
    const stk = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 3).translate(0, 0.1, 0), std(0xd8b070));
    const f = new THREE.Group();
    f.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8).scale(1, 1.2, 1).translate(0, 0.22, 0), std(a, { roughness: 0.45 })), new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6).translate(0, 0.27, 0), std(b2, { roughness: 0.45 })), stk);
    f.position.set(0.2 + Math.cos(ang) * 0.04, y, -0.08 + Math.sin(ang) * 0.04);
    f.rotation.set(Math.sin(ang) * 0.7, 0, -Math.cos(ang) * 0.7);
    stand.add(f);
  });
  stand.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.add(stand);
  const maker = artisan({ elder: true, top: 0x5a4a6a, bottom: 0x2a2a30, hair: 'khan', khan: 0x2a2030, girl: true }, g);
  maker.g.position.z = -0.55;

  // the rooster, built on a stick held up in front
  const rooster = new THREE.Group();
  rooster.position.set(-0.05, 0.95, 0.12);
  g.add(rooster);
  const stk = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 4).translate(0, -0.15, 0), std(0xd8b070));
  rooster.add(stk);
  const dough = (c) => std(c, { roughness: 0.42 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), dough(0xffd23a));
  body.position.y = 0.04;
  const head = new THREE.Group(); head.position.set(0, 0.1, 0.045);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), dough(0xff8a2a)));
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), dough(0xe8322a)); c.position.set(0, 0.03 - i * 0.004, 0.012 - i * 0.012); head.add(c); }
  const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6).scale(0.8, 1.4, 0.8), dough(0xe8322a)); wattle.position.set(0, -0.022, 0.02); head.add(wattle);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.024, 6).rotateX(Math.PI / 2), dough(0xffd23a)); beak.position.set(0, 0, 0.03); head.add(beak);
  const eyes = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 6, 4), dough(0x111111)); e.position.set(s * 0.02, 0.008, 0.02); head.add(e); return e; });
  const tail = [0x2e8a3e, 0x2a5ad8, 0x222222, 0xe8322a, 0xff8a2a].map((c, i) => {
    const f = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.009, 6, 12, Math.PI * 0.8).scale(1, 1, 0.5), dough(c));
    const p = new THREE.Group(); p.position.set(0, 0.06, -0.04);
    f.rotation.set(0, Math.PI / 2, 0); f.position.set(0, 0.0, -0.05);
    p.add(f); p.rotation.set(-0.3 + i * 0.05, 0, (i - 2) * 0.28);
    rooster.add(p); return p;
  });
  const wings = [-1, 1].map((s) => { const w = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8).scale(0.35, 0.8, 1.3), dough(0xe8322a)); w.position.set(s * 0.048, 0.045, -0.005); w.rotation.z = s * 0.2; rooster.add(w); return w; });
  rooster.add(body, head);
  const parts = [[body], [head], tail, [...wings, ...eyes]];
  parts.flat().forEach((p) => p.scale.setScalar(0.001));
  const hit = hitBox(0.6, 0.5, 0.5, -0.05, 0.95, 0.1);
  g.add(hit);
  function set(step, k) {
    if (step === 0) { const e = easeOut(k); body.scale.set(Math.max(0.001, e * (1 + Math.sin(k * 9) * 0.1 * (1 - k))), Math.max(0.001, e * 0.9), Math.max(0.001, e * 1.3)); }
    if (step === 1) head.scale.setScalar(Math.max(0.001, easeOut(k)));
    if (step === 2) tail.forEach((p, i) => p.scale.setScalar(Math.max(0.001, easeOut(cl(k, i * 0.12, i * 0.12 + 0.45)))));
    if (step === 3) { wings.forEach((w) => w.scale.setScalar(Math.max(0.001, easeOut(cl(k, 0, 0.6))))); eyes.forEach((e) => e.scale.setScalar(Math.max(0.001, easeOut(cl(k, 0.5, 1))))); }
  }
  const HINTS = ['tohe1', 'tohe2', 'tohe3', 'tohe4'];
  const LUMP = [0, 6, 2, 1]; // which compartment each step takes from
  let working = 0;
  return {
    id: 'tohe', group: g, maker,
    pose: { target: new THREE.Vector3(-0.02, 0.86, 0.05), pitch: -0.42, dist: 1.0 }, // the dough box in view below the figure
    async run(ctx) {
      for (let s = 0; s < 4; s++) {
        const { k0 } = await ctx.waitTap([hit], { hint: t(HINTS[s]), carry: [lumps[LUMP[s]]], back: true });
        working = 1;
        await ctx.play(1.6 * (1 - k0), (k) => set(s, lerp(k0, 1, k)));
        audio.play('pop');
        working = 0;
      }
      audio.play('chime');
      await ctx.play(1.2, (k) => { rooster.rotation.y = ease(k) * Math.PI * 2; });
    },
    tick(t) {
      const w = working ? 1 : 0.25;
      maker.arms[0].el.rotation.x = -0.7 + Math.sin(t * 6) * 0.25 * w; maker.arms[1].el.rotation.x = -0.7 + Math.sin(t * 5 + 2) * 0.25 * w;
      rooster.rotation.z = Math.sin(t * 1.3) * 0.04;
    },
  };
}

// ======================= 3. mặt nạ giấy bồi: try one on =======================
// Faces painted on 512² canvases; eyes = normalised eye-hole centres for the full-screen overlay.
const MASKS = [
  { id: 'ongdia', name: 'Ông Địa', key: 'maskOngdia', eyes: [[0.36, 0.44], [0.64, 0.44]], paint(x, S) {
    x.fillStyle = '#f5c89c'; x.beginPath(); x.ellipse(S / 2, S / 2, S * 0.46, S * 0.48, 0, 0, 7); x.fill();
    x.fillStyle = 'rgba(240,110,110,.6)'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(S / 2 + s * 150, S * 0.6, 55, 36, 0, 0, 7); x.fill(); }
    x.strokeStyle = '#3a2210'; x.lineWidth = 12; x.lineCap = 'round';
    for (const s of [-1, 1]) { x.beginPath(); x.arc(S / 2 + s * 72, S * 0.4, 38, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); }
    x.fillStyle = '#7a1a1a'; x.beginPath(); x.moveTo(S / 2 - 150, S * 0.64); x.quadraticCurveTo(S / 2, S * 1.02, S / 2 + 150, S * 0.64); x.closePath(); x.fill();
    x.fillStyle = '#fff'; x.fillRect(S / 2 - 110, S * 0.64, 220, 22);
    x.fillStyle = '#e8a07a'; x.beginPath(); x.ellipse(S / 2, S * 0.55, 40, 30, 0, 0, 7); x.fill();
  } },
  { id: 'khi', name: 'Tôn Ngộ Không', key: 'maskKhi', eyes: [[0.36, 0.45], [0.64, 0.45]], paint(x, S) {
    x.fillStyle = '#c8322a'; x.beginPath(); x.ellipse(S / 2, S / 2, S * 0.45, S * 0.48, 0, 0, 7); x.fill();
    x.fillStyle = '#f7d7a8'; x.beginPath(); x.moveTo(S / 2, S * 0.3); x.bezierCurveTo(S * 0.05, S * 0.15, S * 0.1, S * 0.85, S / 2, S * 0.92); x.bezierCurveTo(S * 0.9, S * 0.85, S * 0.95, S * 0.15, S / 2, S * 0.3); x.fill();
    x.fillStyle = '#e8b030'; x.fillRect(S * 0.1, S * 0.14, S * 0.8, 36); x.strokeStyle = '#8a5a10'; x.lineWidth = 4; x.strokeRect(S * 0.1, S * 0.14, S * 0.8, 36);
    x.fillStyle = '#e8322a'; x.beginPath(); x.arc(S / 2, S * 0.17, 18, 0, 7); x.fill();
    x.strokeStyle = '#1a1010'; x.lineWidth = 14; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(S / 2 + s * 30, S * 0.36); x.quadraticCurveTo(S / 2 + s * 110, S * 0.26, S / 2 + s * 170, S * 0.36); x.stroke(); }
    x.fillStyle = '#3a1a10'; x.beginPath(); x.ellipse(S / 2 - 18, S * 0.62, 10, 7, 0, 0, 7); x.ellipse(S / 2 + 18, S * 0.62, 10, 7, 0, 0, 7); x.fill();
    x.strokeStyle = '#7a1a1a'; x.lineWidth = 10; x.beginPath(); x.arc(S / 2, S * 0.68, 60, 0.3, Math.PI - 0.3); x.stroke();
  } },
  { id: 'heo', name: 'Trư Bát Giới', key: 'maskHeo', eyes: [[0.35, 0.4], [0.65, 0.4]], paint(x, S) {
    x.fillStyle = '#f2a8b0'; x.beginPath(); x.ellipse(S / 2, S / 2, S * 0.47, S * 0.46, 0, 0, 7); x.fill();
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(S / 2 + s * 120, S * 0.14); x.lineTo(S / 2 + s * 230, S * 0.02); x.lineTo(S / 2 + s * 210, S * 0.28); x.fill(); }
    x.fillStyle = '#e88a98'; x.beginPath(); x.ellipse(S / 2, S * 0.62, 90, 66, 0, 0, 7); x.fill();
    x.fillStyle = '#7a3a44'; x.beginPath(); x.ellipse(S / 2 - 34, S * 0.62, 16, 24, 0, 0, 7); x.ellipse(S / 2 + 34, S * 0.62, 16, 24, 0, 0, 7); x.fill();
    x.strokeStyle = '#3a1a1a'; x.lineWidth = 10; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(S / 2 + s * 40, S * 0.28); x.lineTo(S / 2 + s * 150, S * 0.3); x.stroke(); }
    x.strokeStyle = '#7a1a1a'; x.lineWidth = 9; x.beginPath(); x.arc(S / 2, S * 0.76, 70, 0.4, Math.PI - 0.4); x.stroke();
  } },
  { id: 'tho', name: 'Thỏ Ngọc', key: 'maskTho', eyes: [[0.37, 0.52], [0.63, 0.52]], paint(x, S) {
    x.fillStyle = '#fbf6ee';
    for (const s of [-1, 1]) { x.beginPath(); x.ellipse(S / 2 + s * 80, S * 0.16, 44, 120, s * 0.15, 0, 7); x.fill(); }
    x.beginPath(); x.ellipse(S / 2, S * 0.58, S * 0.42, S * 0.4, 0, 0, 7); x.fill();
    x.fillStyle = '#f4a8b8'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(S / 2 + s * 80, S * 0.16, 20, 90, s * 0.15, 0, 7); x.fill(); x.beginPath(); x.ellipse(S / 2 + s * 150, S * 0.7, 40, 26, 0, 0, 7); x.fill(); }
    x.fillStyle = '#e86a8a'; x.beginPath(); x.moveTo(S / 2 - 20, S * 0.66); x.lineTo(S / 2 + 20, S * 0.66); x.lineTo(S / 2, S * 0.7); x.fill();
    x.strokeStyle = '#6a3a3a'; x.lineWidth = 6; x.beginPath(); x.moveTo(S / 2, S * 0.7); x.lineTo(S / 2, S * 0.75); x.arc(S / 2 - 22, S * 0.75, 22, 0, Math.PI * 0.8); x.moveTo(S / 2, S * 0.75); x.arc(S / 2 + 22, S * 0.75, 22, Math.PI, Math.PI * 0.2, true); x.stroke();
    x.strokeStyle = '#c8a8a8'; x.lineWidth = 3; for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(S / 2 + s * 50, S * 0.7 + i * 12); x.lineTo(S / 2 + s * 170, S * 0.68 + i * 26); x.stroke(); }
  } },
];
function maskCanvas(m) {
  const S = 512, c = Object.assign(document.createElement('canvas'), { width: S, height: S }), x = c.getContext('2d');
  m.paint(x, S);
  // eye holes, cut out (they show black on the 3D mask, and see-through in the overlay)
  x.globalCompositeOperation = 'destination-out';
  for (const [ex, ey] of m.eyes) { x.beginPath(); x.ellipse(ex * S, ey * S, 34, 24, 0, 0, 7); x.fill(); }
  x.globalCompositeOperation = 'source-over';
  return c;
}
function maskStop(audio) {
  const g = new THREE.Group();
  g.add(table(1.3, 0.5));
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 0.04), std(0x8a5a32, { roughness: 0.8 }));
  board.position.set(0, 1.5, -0.35); board.castShadow = true;
  g.add(board);
  const seller = artisan({ girl: true, top: 0xc8505a, bottom: 0x2a2a30, hair: 'bun' }, g);
  seller.g.position.set(0.8, seller.g.position.y, -0.5); seller.g.rotation.y = -0.5;
  const masks = MASKS.map((m, i) => {
    const canvas = maskCanvas(m);
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const geo = new THREE.SphereGeometry(0.16, 32, 24, Math.PI / 2 - 0.95, 1.9, 0.35, 2.2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, roughness: 0.55, side: THREE.DoubleSide }));
    mesh.position.set(-0.54 + i * 0.36, 1.52, -0.24);
    mesh.castShadow = true;
    mesh.userData.mask = i;
    g.add(mesh);
    return { ...m, canvas, mesh };
  });
  // more masks for sale on the board and on the table
  // every one can be tried on
  const all = masks.map((m) => m.mesh);
  const more = (i, sc, x, y, z, rx = 0) => { const src = masks[i].mesh, d = new THREE.Mesh(src.geometry, src.material); d.scale.setScalar(sc); d.rotation.x = rx; d.position.set(x, y, z); d.userData.mask = i; d.castShadow = true; g.add(d); all.push(d); };
  for (let i = 0; i < 8; i++) more(i % 4, 0.7, -0.6 + (i % 4) * 0.4, i < 4 ? 1.95 : 1.1, -0.28);
  for (let i = 0; i < 4; i++) more(3 - i, 0.8, -0.45 + i * 0.3, TABLE_H + 0.08, 0.02, -1.2);
  const glowM = marker(); glowM.position.set(0, 1.52, -0.18); glowM.scale.set(1.6, 0.5, 1); g.add(glowM);
  return {
    id: 'mask', group: g, maker: seller, masks,
    pose: { target: new THREE.Vector3(0, 1.45, 0), pitch: 0.02, dist: 1.5 },
    async run(ctx) {
      let tried = 0;
      for (;;) {
        const { hit } = await ctx.waitTap(all, { hint: t(tried ? 'maskMore' : 'maskFirst'), next: tried > 0 });
        if (!hit) break; // Continue
        const m = masks[hit.userData.mask], mesh = hit, home = mesh.position.clone(), s0 = mesh.scale.x;
        glowM.visible = false;
        audio.play('paper');
        const cam = ctx.camera, from = home, q0 = mesh.quaternion.clone();
        const toLocal = (v) => g.worldToLocal(v.clone());
        await ctx.play(0.7, (k) => {
          const e = ease(k), dst = toLocal(cam.localToWorld(new THREE.Vector3(0, 0, -0.25)));
          mesh.position.lerpVectors(from, dst, e);
          const qc = g.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(cam.quaternion);
          mesh.quaternion.slerpQuaternions(q0, qc, e);
          mesh.scale.setScalar(lerp(s0, 1, e));
        });
        mesh.visible = false;
        ctx.ui.mask(m.canvas, m.eyes);
        ctx.ui.hint(t('maskWorn', m.name, t(m.key)));
        await ctx.waitTap(null, {});
        ctx.ui.mask(null);
        mesh.visible = true;
        audio.play('paper');
        const p1 = mesh.position.clone(), q1 = mesh.quaternion.clone();
        await ctx.play(0.6, (k) => { const e = ease(k); mesh.position.lerpVectors(p1, home, e); mesh.quaternion.slerpQuaternions(q1, q0, e); mesh.scale.setScalar(lerp(1, s0, e)); });
        tried++;
      }
    },
    tick(t) { pulse(glowM, t); seller.arms[1].sh.rotation.x = -0.3 + Math.sin(t * 0.8) * 0.1; },
  };
}

// ======================= 4. bánh nướng: press the dough in the mould, knock it out, bake it =======================
function patternCanvas() {
  const S = 256, c = Object.assign(document.createElement('canvas'), { width: S, height: S }), x = c.getContext('2d');
  x.fillStyle = '#808080'; x.fillRect(0, 0, S, S);
  x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineWidth = 7;
  x.beginPath(); x.arc(S / 2, S / 2, S * 0.44, 0, 7); x.stroke();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; x.beginPath(); x.arc(S / 2 + Math.cos(a) * S * 0.39, S / 2 + Math.sin(a) * S * 0.39, 7, 0, 7); x.fill(); }
  for (let i = 0; i < 8; i++) { // petals
    const a = (i / 8) * Math.PI * 2;
    x.beginPath(); x.ellipse(S / 2 + Math.cos(a) * S * 0.2, S / 2 + Math.sin(a) * S * 0.2, S * 0.1, S * 0.045, a, 0, 7); x.stroke();
  }
  x.beginPath(); x.arc(S / 2, S / 2, S * 0.08, 0, 7); x.fill();
  return c;
}
function cakeStop(audio) {
  const g = new THREE.Group();
  g.add(table(1.3, 0.66));
  const baker = artisan({ top: 0xf2f0ea, bottom: 0x3a3a40, hair: 'short', girl: true }, g);
  const pc = patternCanvas();
  const bump = new THREE.CanvasTexture(pc);
  const cakeMat = std(0xe8c890, { roughness: 0.55, bumpMap: bump, bumpScale: 6 });
  const side = std(0xe8c890, { roughness: 0.6 });
  const cakeGeo = new THREE.CylinderGeometry(0.06, 0.062, 0.04, 32);
  const cake = new THREE.Mesh(cakeGeo, [side, cakeMat, side]);
  cake.castShadow = true;
  cake.visible = false;
  const Y = TABLE_H; // the tabletop
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), std(0xe8c890, { roughness: 0.6 }));
  ball.position.set(-0.25, Y + 0.045, 0.12); ball.castShadow = true;
  // wooden mould: a block with a carved round cavity and a handle
  const mould = new THREE.Group();
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.2), std(0x8a5a2a, { roughness: 0.65 }));
  const cavity = new THREE.Mesh(new THREE.CircleGeometry(0.062, 32).rotateX(-Math.PI / 2), std(0x5a3616, { roughness: 0.8, bumpMap: bump, bumpScale: -5 }));
  cavity.position.y = 0.031;
  const handleM = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.22, 10).rotateZ(Math.PI / 2).translate(0.21, 0, 0), std(0x8a5a2a, { roughness: 0.65 }));
  mould.add(block, cavity, handleM);
  block.userData.carryRoot = mould;
  mould.position.set(0, Y + 0.03, 0.08);
  mould.traverse((o) => o.isMesh && (o.castShadow = true));
  // charcoal stove with a grill, glowing
  const stove = new THREE.Group();
  stove.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.16, 16, 1, true), std(0x8a4a2a, { roughness: 0.9, side: THREE.DoubleSide })));
  const coals = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16).rotateX(-Math.PI / 2), std(0x2a1008, { emissive: 0xff4a10, emissiveIntensity: 0.6 }));
  coals.position.y = 0.04; stove.add(coals);
  const grill = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.004, 4, 20).rotateX(Math.PI / 2), std(0x333333, { metalness: 0.8 })); grill.position.y = 0.085; stove.add(grill);
  const stoveLight = new THREE.PointLight(0xff6a20, 0.4, 1.2, 1.5); stoveLight.position.y = 0.2; stove.add(stoveLight);
  stove.position.set(0.4, Y + 0.08, 0.02);
  // finished cakes: baked (golden) and bánh dẻo (white)
  const baked = std(0xb8702a, { roughness: 0.35, bumpMap: bump, bumpScale: 6 }), sideB = std(0xa8621e, { roughness: 0.45 });
  const deo = std(0xf7f3ea, { roughness: 0.75, bumpMap: bump, bumpScale: 4 });
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 24), std(0xb3141f, { roughness: 0.35 }));
  tray.position.set(-0.36, Y + 0.006, -0.14); g.add(tray);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2, d = i < 3;
    const c = new THREE.Mesh(cakeGeo, d ? [sideB, baked, sideB] : [deo, deo, deo]);
    c.position.set(-0.36 + Math.cos(a) * 0.11, Y + 0.032, -0.14 + Math.sin(a) * 0.11); c.castShadow = true; g.add(c);
  }
  const boxes = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), std(0xb3141f, { roughness: 0.4 }));
  boxes.position.set(0.1, Y + 0.05, -0.22); g.add(boxes);
  g.add(cake, ball, mould, stove);
  const hit = hitBox(0.9, 0.4, 0.5, 0, Y + 0.1, 0.05), mouldHit = hitBox(0.26, 0.2, 0.26, 0, Y + 0.08, 0.08), stoveHit = hitBox(0.32, 0.3, 0.32, 0.4, Y + 0.12, 0.02);
  g.add(hit, mouldHit, stoveHit);
  const raw = new THREE.Color(0xe8c890), gold = new THREE.Color(0xb8702a);
  let knocks = 0;
  // the knock: mould heights (its centre) at rest, lifted, and at the bottom of a knock, where the stuck cake meets the
  // table; the two knocks land at these k, and the second one lets the cake go
  const REST = Y + 0.03, HIGH = Y + 0.2, LOW = Y + 0.04, BOUNCE = 0.06, KNOCK = [0.3 + 0.45 * 0.25, 0.3 + 0.45 * 0.75];
  const PARK = new THREE.Vector3(-0.22, REST, 0.2); // clear of the cake, the tray and the boxes, handle included
  const ballFrom = ball.position.clone(), cakeFrom = new THREE.Vector3(0, Y + 0.02, 0.08); // where the viewer let go
  function set(step, k) {
    if (step === 0) { // the ball rolls into the cavity and the palm presses it flat
      const e = ease(cl(k, 0, 0.5));
      ball.position.set(lerp(ballFrom.x, 0, e), lerp(ballFrom.y, Y + 0.065, e) + Math.sin(e * Math.PI) * 0.08, lerp(ballFrom.z, 0.08, e));
      const p = ease(cl(k, 0.5, 1));
      ball.scale.set(1 + p * 0.35, 1 - p * 0.55, 1 + p * 0.35);
      ball.position.y -= p * 0.02;
    }
    if (step === 1) { // lift and flip it with the cake stuck inside, knock it twice on the table, set it down
      const lift = ease(cl(k, 0, 0.3)), flip = ease(cl(k, 0.05, 0.3)), kn = cl(k, 0.3, 0.75), home = ease(cl(k, 0.75, 1));
      let y = lerp(REST, HIGH, lift);
      if (k > 0.3) y = LOW + (kn < 0.25 ? HIGH - LOW : BOUNCE) * Math.abs(Math.cos(kn * Math.PI * 2));
      if (k > 0.75) y = lerp(LOW + BOUNCE, REST, home) + Math.sin(home * Math.PI) * 0.1;
      mould.position.set(lerp(0, PARK.x, home), y, lerp(0.08, PARK.z, home));
      mould.rotation.z = Math.PI * (flip - home); // back over the way it came, so the handle never swings down through the table
      ball.visible = false; cake.visible = true; // the pressed dough is the cake now, pattern down in the cavity
      if (k < KNOCK[1]) { if (cake.parent !== mould) mould.add(cake); cake.position.set(0, 0.02, 0); cake.rotation.set(0, 0, Math.PI); }
      else { if (cake.parent !== g) g.attach(cake); cake.position.set(0, Y + 0.02, 0.08); cake.rotation.set(0, 0, 0); }
    }
    if (step === 2) { // onto the grill, turn golden, back to the front
      const go = ease(cl(k, 0, 0.25)), back = ease(cl(k, 0.8, 1));
      cake.position.set(lerp(cakeFrom.x, 0.4, go) - back * 0.36, lerp(cakeFrom.y, Y + 0.185, go) - back * 0.165 + Math.sin(go * Math.PI) * 0.06, lerp(cakeFrom.z, 0.02, go) + back * 0.1);
      const b = cl(k, 0.25, 0.75);
      cakeMat.color.lerpColors(raw, gold, b); side.color.lerpColors(raw, gold, b * 0.9);
      cakeMat.roughness = lerp(0.55, 0.32, b);
      coals.material.emissiveIntensity = 0.6 + Math.sin(b * Math.PI) * 1.2;
      stoveLight.intensity = 0.4 + Math.sin(b * Math.PI) * 1.2;
    }
  }
  const HINTS = ['cake1', 'cake2', 'cake3'];
  return {
    id: 'cake', group: g, maker: baker,
    pose: { target: new THREE.Vector3(0.05, Y + 0.05, 0.05), pitch: -0.6, dist: 1.0 },
    async run(ctx) {
      const D = [1.8, 2.4, 3.2];
      for (let s = 0; s < 3; s++) {
        const { k0 } = await ctx.waitTap([[mouldHit, hit, stoveHit][s]], { hint: t(HINTS[s]), carry: [[ball, block, cake][s]], });
        knocks = 0;
        if (s === 0) ballFrom.copy(ball.position);
        if (s === 2) cakeFrom.copy(cake.position);
        if (s === 1) { const p0 = mould.position.clone(), h = new THREE.Vector3(0, REST, 0.08); await ctx.play(0.25, (k) => mould.position.lerpVectors(p0, h, ease(k))); }
        await ctx.play(D[s] * (1 - k0), (k) => {
          const kk = lerp(k0, 1, k); set(s, kk);
          if (s === 0 && !knocks && kk > 0.6) { knocks = 1; audio.play('pop'); }
          if (s === 1) while (knocks < 2 && kk >= KNOCK[knocks]) { knocks++; audio.play('knock'); }
          if (s === 2 && !knocks && kk > 0.2) { knocks = 1; audio.play('flame'); }
        });
        if (s === 0) mould.attach(ball); // the pressed dough rides along when you pick the mould up
      }
      audio.play('chime');
    },
    tick(t) {
      baker.arms[0].el.rotation.x = -0.6 + Math.sin(t * 1.5) * 0.1;
      coals.material.emissiveIntensity *= 1; stoveLight.intensity = Math.max(stoveLight.intensity, 0.35 + Math.sin(t * 5) * 0.05);
    },
  };
}

// ======================= 5. tàu thủy sắt tây: light the lamp, set it on the water, watch it putter round =======================
function boatStop(audio) {
  const g = new THREE.Group();
  const stoolTop = 0.42;
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, stoolTop, 4).rotateY(Math.PI / 4).translate(0, stoolTop / 2, 0), std(0x2a8a4a, { roughness: 0.45 }));
  stool.castShadow = stool.receiveShadow = true;
  g.add(stool);
  const basin = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.3, 0], [0.36, 0.12], [0.38, 0.13], [0.37, 0.14]].map(([a, b]) => new THREE.Vector2(a, b)), 32),
    std(0xc8c8cc, { metalness: 0.85, roughness: 0.35, side: THREE.DoubleSide }));
  basin.position.y = stoolTop; basin.castShadow = true; basin.receiveShadow = true;
  g.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.34, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a4a5a, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.85 }));
  water.position.y = stoolTop + 0.1;
  g.add(water);
  const seller = artisan({ elder: true, top: 0x4a5a3a, bottom: 0x2a2a30, hair: 'short', beard: true }, g);
  seller.g.position.set(0.1, seller.g.position.y - 0.02, -0.7);
  // shelf of tin toys behind
  const shelf = table(1.2, 0.4, 0.95); shelf.position.set(0, 0, -1.15); g.add(shelf);
  // the tin boat: red hull, blue cabin, a yellow funnel; bow toward +z in its own frame
  const boat = new THREE.Group();
  // tin hull: a pointed-bow outline extruded down, bow toward +z
  const outline = new THREE.Shape();
  outline.moveTo(-0.045, -0.11); outline.lineTo(0.045, -0.11); outline.lineTo(0.048, 0.04); outline.quadraticCurveTo(0.04, 0.1, 0, 0.13); outline.quadraticCurveTo(-0.04, 0.1, -0.048, 0.04); outline.closePath();
  const hullGeo = new THREE.ExtrudeGeometry(outline, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2 }).rotateX(Math.PI / 2).translate(0, 0.005, 0);
  const hull = new THREE.Mesh(hullGeo, std(0xc8201a, { metalness: 0.6, roughness: 0.35 }));
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.006, 0.2), std(0xe8e0c8, { metalness: 0.4, roughness: 0.4 })); deck.position.y = 0.002;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.07), std(0x2a5ad8, { metalness: 0.6, roughness: 0.35 })); cabin.position.set(0, 0.025, -0.01);
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.011, 0.05, 10), std(0xffc02a, { metalness: 0.6, roughness: 0.35 })); funnel.position.set(0, 0.065, -0.02);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.02).translate(0.015, 0, 0), std(0xe8201a, { side: THREE.DoubleSide })); flag.position.set(0, 0.07, 0.05);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.06, 3), std(0x333333)); mast.position.set(0, 0.05, 0.05);
  const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2, 1.2, 0.5), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  lamp.scale.setScalar(0.06); lamp.position.set(0, 0.0, -0.07);
  boat.add(hull, deck, cabin, funnel, flag, mast, lamp);
  hull.userData.carryRoot = boat;
  boat.traverse((o) => o.isMesh && (o.castShadow = true));
  const ON_TABLE = new THREE.Vector3(0.45, stoolTop + 0.03, 0.12);
  boat.position.copy(ON_TABLE); boat.rotation.y = -0.6;
  g.add(boat);
  // a candle stub on a tin saucer: it goes under the boiler and its flame makes the steam
  const candle = new THREE.Group();
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.024, 0.006, 16), std(0xb8b8bc, { metalness: 0.8, roughness: 0.35 }));
  const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.035, 10).translate(0, 0.02, 0), std(0xf2ead8, { roughness: 0.6 }));
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2, 1.2, 0.5), blending: THREE.AdditiveBlending, depthWrite: false }));
  flame.scale.setScalar(0.035); flame.position.y = 0.05;
  candle.add(saucer, stub, flame);
  saucer.userData.carryRoot = stub.userData.carryRoot = candle;
  candle.position.set(0.5, stoolTop + 0.03, 0.34); g.add(candle);
  // ripples and smoke puffs
  const ringGeo = new THREE.RingGeometry(0.02, 0.026, 24).rotateX(-Math.PI / 2);
  const rings = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0, depthWrite: false })); m.position.y = stoolTop + 0.102; g.add(m); return { m, t: 9 }; });
  const puffs = Array.from({ length: 8 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x9aa0a8, transparent: true, opacity: 0, depthWrite: false })); g.add(s); return { s, t: 9 }; });
  let running = 0, ang = 0, lastPutt = 0, ri = 0, pi = 0;
  const HINTS = ['boat1', 'boat2'];
  return {
    id: 'boat', group: g, maker: seller,
    pose: { target: new THREE.Vector3(0.1, stoolTop + 0.1, 0.05), pitch: -0.7, dist: 1.25 },
    async run(ctx) {
      await ctx.waitTap([hull], { hint: t(HINTS[0]), carry: [saucer, stub] });
      candle.visible = false;
      audio.play('flame');
      await ctx.play(0.8, (k) => (lamp.material.opacity = k));
      await ctx.waitTap([water], { hint: t(HINTS[1]), carry: [hull] });
      const p0 = boat.position.clone(), r0 = boat.rotation.y;
      const p1 = new THREE.Vector3(0.2, stoolTop + 0.1, 0);
      await ctx.play(1.2, (k) => { const e = ease(k); boat.position.lerpVectors(p0, p1, e); boat.position.y += Math.sin(e * Math.PI) * 0.1; boat.rotation.y = lerp(r0, Math.PI, e); });
      audio.play('pop');
      await ctx.play(1.0, () => {});
      running = 1;
      ctx.ui.hint(t('boatGo'));
      await ctx.play(5, () => {});
    },
    tick(t, dt) {
      seller.arms[0].el.rotation.x = -0.5 + Math.sin(t * 0.7) * 0.08;
      if (running) {
        ang += dt * 0.9;
        const R = 0.2;
        boat.position.set(Math.cos(ang) * R, stoolTop + 0.1 + Math.sin(t * 9) * 0.002, Math.sin(ang) * R);
        boat.rotation.set(Math.sin(t * 7) * 0.03, -ang + Math.PI, Math.sin(t * 5) * 0.03);
        if (t - lastPutt > 0.16) {
          lastPutt = t; audio.play('putt');
          const r = rings[ri++ % rings.length]; r.t = 0; r.m.position.x = boat.position.x; r.m.position.z = boat.position.z;
          if (ri % 3 === 0) { const p = puffs[pi++ % puffs.length]; p.t = 0; p.s.position.copy(boat.position).add(new THREE.Vector3(0, 0.1, 0)); }
        }
      }
      for (const r of rings) { r.t += dt; const k = r.t / 1.4; r.m.material.opacity = k < 1 ? (1 - k) * 0.4 : 0; r.m.scale.setScalar(1 + k * 5); }
      for (const p of puffs) { p.t += dt; const k = p.t / 1.6; p.s.material.opacity = k < 1 ? (1 - k) * 0.35 : 0; p.s.scale.setScalar(0.05 + k * 0.15); p.s.position.y += dt * 0.08; }
      if (lamp.material.opacity > 0) lamp.scale.setScalar(0.06 * (0.9 + Math.sin(t * 17) * 0.1));
    },
  };
}

// ---------- all five, placed on their pavements ----------
export function createStops(stops, facade, audio) {
  const make = { star: starStop, tohe: toheStop, mask: maskStop, cake: cakeStop, boat: boatStop };
  return stops.map((s) => {
    const st = make[s.id](audio);
    st.group.position.set(s.side * (facade - 1.25), 0.15, s.z);
    st.group.rotation.y = -s.side * Math.PI / 2;
    st.side = s.side; st.z = s.z;
    st.group.traverse((o) => { if (o.isMesh && !o.material.transparent) o.receiveShadow = true; });
    return st;
  });
}
export { singleLantern };
