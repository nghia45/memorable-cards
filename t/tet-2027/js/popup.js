// Act 3: a pop-up book spread for one memory. The photo is a taped polaroid on the back page; cut-paper
// layers stand up around it (never over it), themed per memory; the caption writes itself on a place card.
// `open` 0..1 drives the whole unfold (back page → layers staggered → caption card); `write` 0..1 types the caption.
import * as THREE from 'three';
import { canvasTex, wrap, glowTex } from './print.js';
import { lerp } from './tween.js';

export const SW = 2.2, BD = 1.3, BH = 1.5; // spread width, base depth, back page height
export const THEMES = ['home', 'journey', 'celebration', 'together'];
const PAPER_T = 0.006;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const backOut = (k) => { const c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; }; // pop with overshoot

// ---------- 2D cut-out shape helpers (x across, y up from the base) ----------
function poly(pts) { const s = new THREE.Shape(); s.moveTo(...pts[0]); pts.slice(1).forEach((p) => s.lineTo(...p)); s.closePath(); return s; }
const rect = (x, y, w, h) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
const circle = (x, y, r) => new THREE.Shape().absarc(x, y, r, 0, Math.PI * 2, false);
function ellipse(x, y, rx, ry) { const s = new THREE.Shape(); s.absellipse(x, y, rx, ry, 0, Math.PI * 2, false, 0); return s; }
function hole(shape, x, y, w, h) { // clockwise path = hole
  const p = new THREE.Path(); p.moveTo(x, y); p.lineTo(x, y + h); p.lineTo(x + w, y + h); p.lineTo(x + w, y); p.closePath();
  shape.holes.push(p);
  return shape;
}
function heart(x, y, s) {
  const h = new THREE.Shape();
  h.moveTo(x, y);
  h.bezierCurveTo(x - s * 0.1, y + s * 0.25, x - s * 0.62, y + s * 0.45, x - s * 0.5, y + s * 0.78);
  h.bezierCurveTo(x - s * 0.4, y + s * 1.02, x - s * 0.08, y + s * 1.0, x, y + s * 0.78);
  h.bezierCurveTo(x + s * 0.08, y + s * 1.0, x + s * 0.4, y + s * 1.02, x + s * 0.5, y + s * 0.78);
  h.bezierCurveTo(x + s * 0.62, y + s * 0.45, x + s * 0.1, y + s * 0.25, x, y);
  return h;
}
function burst(cx, cy, r, rays) { // firework: ring of thin tapered rays around a core
  const out = [circle(cx, cy, r * 0.12)];
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2, a1 = a - 0.05, a2 = a + 0.05, r0 = r * 0.22;
    out.push(poly([[cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0], [cx + Math.cos(a) * r, cy + Math.sin(a) * r], [cx + Math.cos(a2) * r0, cy + Math.sin(a2) * r0]]));
    out.push(circle(cx + Math.cos(a) * r * 1.08, cy + Math.sin(a) * r * 1.08, r * 0.045));
  }
  return out;
}
function ridge(x0, x1, peaks) { // mountain range silhouette from base line through peak points
  return poly([[x0, 0], ...peaks, [x1, 0]]);
}
function roofHouse(x, w, h) { // wall with door + window holes, returned separately from its roof
  const wall = rect(x - w / 2, 0, w, h);
  hole(wall, x - w * 0.12, 0.0001, w * 0.24, h * 0.5);
  hole(wall, x - w * 0.38, h * 0.52, w * 0.18, h * 0.22);
  hole(wall, x + w * 0.2, h * 0.52, w * 0.18, h * 0.22);
  const roof = poly([[x - w * 0.66, h - 0.02], [x - w * 0.42, h + w * 0.42], [x + w * 0.42, h + w * 0.42], [x + w * 0.66, h - 0.02]]);
  return { wall, roof };
}
function lanternCut(x, y, r) { // silk lantern silhouette hanging below (x, y)
  return [ellipse(x, y - r * 1.1, r, r * 0.8), rect(x - r * 0.5, y - r * 0.35, r, r * 0.12), rect(x - r * 0.5, y - r * 1.95, r, r * 0.12), rect(x - r * 0.08, y - r * 2.6, r * 0.16, r * 0.62)];
}
function figure(x, s, lean = 0) { // seated person silhouette
  return [circle(x + lean * s, s * 0.95, s * 0.16), poly([[x - s * 0.2, s * 0.3], [x + s * 0.2, s * 0.3], [x + s * 0.14 + lean * s, s * 0.78], [x - s * 0.14 + lean * s, s * 0.78]])];
}

// ---------- printed pages (canvas) ----------
function paperFill(x, w, h, base = '#f4ecd8') {
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { // paper fibre speckle
    x.fillStyle = `rgba(90,60,30,${Math.random() * 0.05})`;
    x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1);
  }
}
const BACKDROPS = {
  home(x, w, h) {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f7b58c'); g.addColorStop(0.7, '#f7d9a8'); g.addColorStop(1, '#f4ecd8');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,240,200,.8)'; x.beginPath(); x.arc(w * 0.78, h * 0.3, 70, 0, 7); x.fill();
    x.fillStyle = 'rgba(200,120,90,.35)'; x.beginPath(); x.moveTo(0, h); x.bezierCurveTo(w * 0.3, h * 0.62, w * 0.6, h * 0.8, w, h * 0.66); x.lineTo(w, h); x.fill();
  },
  journey(x, w, h) {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8fb7de'); g.addColorStop(0.65, '#f6cfa6'); g.addColorStop(1, '#f4ecd8');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#fbe3a0'; x.beginPath(); x.arc(w * 0.22, h * 0.36, 58, 0, 7); x.fill();
    x.strokeStyle = 'rgba(60,60,80,.55)'; x.lineWidth = 3;
    for (const [bx, by] of [[0.62, 0.2], [0.68, 0.16], [0.72, 0.23]]) { x.beginPath(); x.moveTo(w * bx - 14, h * by); x.quadraticCurveTo(w * bx - 7, h * by - 8, w * bx, h * by); x.quadraticCurveTo(w * bx + 7, h * by - 8, w * bx + 14, h * by); x.stroke(); }
  },
  celebration(x, w, h) {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#141a45'); g.addColorStop(1, '#3a1d52');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) { x.fillStyle = `rgba(255,240,210,${0.3 + Math.random() * 0.6})`; x.fillRect(Math.random() * w, Math.random() * h * 0.8, 2, 2); }
    x.strokeStyle = 'rgba(255,200,120,.35)'; x.lineWidth = 2;
    for (const [cx, cy, r] of [[0.5, 0.12, 80], [0.12, 0.55, 60], [0.9, 0.5, 70]]) for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2; x.beginPath(); x.moveTo(w * cx + Math.cos(a) * r * 0.3, h * cy + Math.sin(a) * r * 0.3); x.lineTo(w * cx + Math.cos(a) * r, h * cy + Math.sin(a) * r); x.stroke();
    }
  },
  together(x, w, h) {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b1f4a'); g.addColorStop(1, '#5a3e6e');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(255,245,220,${0.25 + Math.random() * 0.7})`; x.fillRect(Math.random() * w, Math.random() * h * 0.85, 2, 2); }
    const mg = x.createRadialGradient(w * 0.82, h * 0.22, 10, w * 0.82, h * 0.22, 120); mg.addColorStop(0, 'rgba(255,245,210,1)'); mg.addColorStop(0.45, 'rgba(255,240,200,.9)'); mg.addColorStop(0.5, 'rgba(255,230,190,.15)'); mg.addColorStop(1, 'rgba(255,230,190,0)');
    x.fillStyle = mg; x.fillRect(0, 0, w, h);
  },
};
const FLOORS = {
  home(x, w, h) { paperFill(x, w, h, '#ead7b8'); x.strokeStyle = 'rgba(140,90,50,.25)'; x.lineWidth = 3; for (let i = 0; i < w; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } },
  journey(x, w, h) {
    paperFill(x, w, h, '#cfe0a8');
    x.fillStyle = '#9a8a74'; x.beginPath(); // road winding from the front toward the valley
    x.moveTo(w * 0.36, h); x.bezierCurveTo(w * 0.3, h * 0.6, w * 0.62, h * 0.45, w * 0.47, 0); x.lineTo(w * 0.53, 0); x.bezierCurveTo(w * 0.7, h * 0.45, w * 0.44, h * 0.6, w * 0.64, h); x.fill();
    x.strokeStyle = '#f4ecd8'; x.setLineDash([18, 16]); x.lineWidth = 4; x.beginPath(); x.moveTo(w * 0.5, h); x.bezierCurveTo(w * 0.37, h * 0.6, w * 0.66, h * 0.45, w * 0.5, 0); x.stroke(); x.setLineDash([]);
  },
  celebration(x, w, h) { paperFill(x, w, h, '#f1e2c8'); for (let i = 0; i < 160; i++) { x.fillStyle = ['#e3413f', '#f2b134', '#3a8fd8', '#e56aa8'][i % 4]; x.save(); x.translate(Math.random() * w, Math.random() * h); x.rotate(Math.random() * 6); x.fillRect(-6, -3, 12, 6); x.restore(); } },
  together(x, w, h) { paperFill(x, w, h, '#b9cf9a'); for (let i = 0; i < 70; i++) { x.fillStyle = ['#fff4d6', '#ffd1dc', '#ffe07a'][i % 3]; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 4, 0, 7); x.fill(); } },
};

function coverCrop(x, img, dx, dy, dw, dh) {
  const s = Math.max(dw / img.width, dh / img.height);
  const sw = dw / s, sh = dh / s;
  x.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, dx, dy, dw, dh);
}
// Polaroid print: square photo (cover-cropped) with the date handwritten in the thick bottom margin.
export function polaroidTex(img, date, caption) {
  return canvasTex(640, 760, (x, w, h) => {
    paperFill(x, w, h, '#fbf7ee');
    if (img) coverCrop(x, img, 40, 40, 560, 560);
    else { // no photo: a soft paper plate with the caption as the picture
      x.fillStyle = '#e9dcc3'; x.fillRect(40, 40, 560, 560);
      x.fillStyle = '#8a5a3a'; x.font = 'italic 500 40px "Playfair Display"'; x.textAlign = 'center'; x.textBaseline = 'middle';
      wrap(x, caption || '♥', 460).slice(0, 5).forEach((l, i, a) => x.fillText(l, 320, 320 + (i - (a.length - 1) / 2) * 52));
    }
    x.fillStyle = '#3a2a4a'; x.font = '600 50px "Dancing Script", cursive'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(date || '', w / 2, 682);
  }, 1.6);
}

// ---------- the spread ----------
export function createPopup({ theme, caption, date, photo }) {
  if (!THEMES.includes(theme)) theme = 'home';
  const group = new THREE.Group();
  const mats = [];
  const paper = (color, extra = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.92, fog: false, ...extra }); mats.push(m); return m; };
  const cut = (shapes, color, extra) => {
    const g = new THREE.ExtrudeGeometry(shapes, { depth: PAPER_T, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, -PAPER_T / 2);
    const mesh = new THREE.Mesh(g, typeof color === 'object' ? color : paper(color, extra));
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  };

  // Book: cloth-covered boards + printed pages.
  const cloth = paper(0x7d1420, { roughness: 0.85 });
  const baseCover = new THREE.Mesh(new THREE.BoxGeometry(SW + 0.1, 0.035, BD + 0.06), cloth);
  baseCover.position.set(0, -0.019, BD / 2 + 0.01);
  baseCover.receiveShadow = true;
  const floorTex = canvasTex(1024, 606, (x, w, h) => FLOORS[theme](x, w, h));
  const basePage = new THREE.Mesh(new THREE.PlaneGeometry(SW, BD), paper(0xffffff, { map: floorTex }));
  basePage.rotation.x = -Math.PI / 2;
  basePage.position.set(0, 0.001, BD / 2);
  basePage.receiveShadow = true;
  group.add(baseCover, basePage);

  const back = new THREE.Group(); // hinged at the spine (y = 0, z = 0)
  const backCover = new THREE.Mesh(new THREE.BoxGeometry(SW + 0.1, BH + 0.05, 0.035), cloth);
  backCover.position.set(0, BH / 2 + 0.01, -0.019);
  const backTex = canvasTex(1024, 698, (x, w, h) => { BACKDROPS[theme](x, w, h); });
  const backPage = new THREE.Mesh(new THREE.PlaneGeometry(SW, BH), paper(0xffffff, { map: backTex }));
  backPage.position.set(0, BH / 2, 0.001);
  backPage.receiveShadow = true;
  back.add(backCover, backPage);
  // Polaroid, taped to the back page. Slight tilt so it reads as placed by hand.
  const pol = new THREE.Group();
  const polTex = polaroidTex(photo, date, caption);
  const polMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.95), paper(0xffffff, { map: polTex, roughness: 0.7 }));
  polMesh.castShadow = true;
  pol.add(polMesh);
  const tapeMat = paper(0xf2c6c6, { transparent: true, opacity: 0.75 });
  for (const s of [-1, 1]) {
    const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.08), tapeMat);
    tape.position.set(s * 0.36, 0.46, 0.004); tape.rotation.z = s * -0.6;
    pol.add(tape);
  }
  pol.position.set(0, 0.84, 0.012);
  pol.rotation.z = -0.03;
  back.add(pol);
  group.add(back);

  // Layers standing on the base: { mesh, z, delay }. Each hinges at its bottom edge.
  const layers = [];
  const stand = (mesh, x, z, delay) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0, z);
    pivot.add(mesh);
    group.add(pivot);
    layers.push({ pivot, delay });
    return pivot;
  };
  const onBack = []; // cut-outs glued to the back page that pop out with a scale
  const glue = (mesh, delay) => { back.add(mesh); onBack.push({ mesh, delay }); return mesh; };
  const extras = []; // per-theme living details: fn(t, dt, open)

  if (theme === 'home') {
    for (const [hx, s] of [[-0.8, 1], [0.84, 0.9]]) {
      const { wall, roof } = roofHouse(0, 0.5 * s, 0.5 * s);
      const p = stand(cut(wall, 0xd9b27a), hx, 0.16, 0.3);
      p.add(cut(roof, 0x8a2e1f).translateZ(0.004));
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.46 * s, 0.4 * s), new THREE.MeshBasicMaterial({ color: 0xffc070, fog: false }));
      glow.position.set(0, 0.25 * s, -0.006);
      p.add(glow);
      extras.push((t) => glow.material.color.setHSL(0.09, 1, 0.68 + Math.sin(t * 7 + hx * 9) * 0.02));
    }
    // mai branch in a vase (front left) and a table with bánh chưng (front right)
    const vase = poly([[-0.07, 0], [0.07, 0], [0.1, 0.12], [0.05, 0.22], [-0.05, 0.22], [-0.1, 0.12]]);
    const stem = poly([[-0.012, 0.2], [0.012, 0.2], [0.06, 0.45], [0.16, 0.6], [0.14, 0.62], [0.04, 0.5], [-0.03, 0.62], [-0.05, 0.6], [-0.01, 0.45]]);
    const pv = stand(cut(vase, 0x2a4fa0), -0.86, 0.78, 0.5);
    pv.add(cut(stem, 0x4a2e22).translateZ(0.003));
    const flowers = [];
    for (const [fx, fy] of [[0.16, 0.6], [0.1, 0.55], [0.05, 0.5], [-0.04, 0.61], [-0.02, 0.52], [0.13, 0.64], [0.0, 0.45]]) flowers.push(circle(fx, fy, 0.028));
    pv.add(cut(flowers, 0xffc53a, { emissive: 0x553300 }).translateZ(0.006));
    const table = [rect(-0.2, 0.18, 0.4, 0.035), rect(-0.17, 0, 0.03, 0.18), rect(0.14, 0, 0.03, 0.18)];
    const pt = stand(cut(table, 0x5a3322), 0.84, 0.8, 0.55);
    pt.add(cut(rect(-0.1, 0.215, 0.2, 0.17), 0x3f7a3a).translateZ(0.003)); // bánh chưng
    pt.add(cut([rect(-0.1, 0.285, 0.2, 0.012), rect(-0.006, 0.215, 0.012, 0.17)], 0xefe2b8).translateZ(0.006)); // lạt tie
    // two lanterns hanging from the top edge of the back page
    for (const lx of [-0.58, 0.58]) {
      const l = glue(cut(lanternCut(0, 0, 0.07), 0xc8202e, { emissive: 0x551008 }), 0.25);
      l.position.set(lx, BH - 0.02, 0.03);
      const string = new THREE.Mesh(new THREE.PlaneGeometry(0.006, 0.12), paper(0x2a1a10));
      string.position.set(0, 0.04, 0); l.add(string);
      extras.push((t) => (l.rotation.z = Math.sin(t * 1.3 + lx * 3) * 0.08));
    }
  }

  if (theme === 'journey') {
    stand(cut(ridge(-1.1, -0.1, [[-0.95, 0.72], [-0.7, 1.05], [-0.48, 0.8], [-0.3, 0.6], [-0.16, 0.34]]), 0x8497bd), 0, 0.06, 0.28);
    stand(cut(ridge(0.1, 1.1, [[0.18, 0.38], [0.35, 0.7], [0.55, 0.95], [0.78, 0.74], [0.98, 0.88]]), 0x8497bd), 0, 0.07, 0.3);
    stand(cut(ridge(-1.1, -0.28, [[-1.0, 0.45], [-0.78, 0.62], [-0.55, 0.42], [-0.36, 0.22]]), 0x566f86), 0, 0.3, 0.38);
    stand(cut(ridge(0.3, 1.1, [[0.38, 0.25], [0.6, 0.55], [0.82, 0.4], [1.02, 0.5]]), 0x566f86), 0, 0.32, 0.4);
    stand(cut(ridge(-1.1, -0.45, [[-0.95, 0.24], [-0.7, 0.3], [-0.52, 0.12]]), 0x3f6b45), 0, 0.66, 0.46);
    stand(cut(ridge(0.5, 1.1, [[0.56, 0.14], [0.8, 0.3], [1.0, 0.22]]), 0x3f6b45), 0, 0.7, 0.48);
    // motorbike with two riders, rolling along the front of the road
    const bike = [circle(-0.1, 0.05, 0.05), circle(0.1, 0.05, 0.05)];
    const body = [poly([[-0.1, 0.07], [0.1, 0.07], [0.12, 0.12], [0.02, 0.14], [-0.06, 0.13], [-0.12, 0.11]]), rect(0.08, 0.1, 0.015, 0.09),
      ...figure(-0.02, 0.2, 0.05), ...figure(-0.09, 0.19, 0.03)];
    const bikePivot = stand(cut(bike, 0x222222), 0, 0.8, 0.55);
    bikePivot.add(cut(body, 0xb3202a).translateZ(0.004));
    extras.push((t, dt, open) => {
      const u = (t * 0.09) % 2, dir = u < 1 ? 1 : -1, x = u < 1 ? -0.8 + u * 1.6 : 0.8 - (u - 1) * 1.6;
      bikePivot.children.forEach((c) => (c.position.x = x));
      bikePivot.children.forEach((c) => (c.scale.x = dir));
    });
    for (const [cx, cy, s] of [[-0.55, 1.28, 1], [0.62, 1.2, 0.8]]) {
      const cloud = glue(cut([circle(-0.1 * s, 0, 0.07 * s), circle(0, 0.03 * s, 0.09 * s), circle(0.11 * s, 0, 0.065 * s), rect(-0.16 * s, -0.05 * s, 0.33 * s, 0.05 * s)], 0xfdf8ee), 0.3);
      cloud.position.set(cx, cy, 0.03);
      extras.push((t) => (cloud.position.x = cx + Math.sin(t * 0.25 + cx) * 0.06));
    }
  }

  if (theme === 'celebration') {
    const foil = (c) => paper(c, { metalness: 0.9, roughness: 0.3, emissive: c, emissiveIntensity: 0.15 });
    const sparks = [];
    for (const [x, h, r, c, z] of [[-0.82, 1.1, 0.26, 0xf2c14e, 0.08], [0.84, 1.18, 0.24, 0xe8457a, 0.1], [-0.55, 0.78, 0.16, 0x7ec8ff, 0.24], [0.6, 0.8, 0.17, 0xf2c14e, 0.26]]) {
      const p = stand(cut([rect(-0.006, 0, 0.012, h - r * 0.2), ...burst(0, h, r, 14)], foil(c)), x, z, 0.3 + z);
      sparks.push({ p, h, r });
    }
    // lantern posts in the foreground corners
    for (const x of [-0.8, 0.8]) {
      const post = stand(cut([rect(-0.01, 0, 0.02, 0.42), rect(-0.08, 0.42, 0.16, 0.015), ...lanternCut(-0.06, 0.42, 0.045), ...lanternCut(0.06, 0.42, 0.045)], 0xc8202e, { emissive: 0x440a06 }), x, 0.82, 0.55);
      extras.push((t) => (post.children[0].rotation.z = Math.sin(t * 1.5 + x) * 0.02));
    }
    // twinkles on the bursts + confetti falling once the page is open
    const tw = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: glowTex, size: 0.12, color: 0xfff0c0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    const twPts = new Float32Array(sparks.length * 6 * 3);
    tw.geometry.setAttribute('position', new THREE.BufferAttribute(twPts, 3));
    group.add(tw);
    const N = 70;
    const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.03, 0.018), paper(0xffffff, { side: THREE.DoubleSide, roughness: 0.6 }), N);
    const cs = Array.from({ length: N }, (_, i) => ({ p: new THREE.Vector3((Math.random() - 0.5) * SW, 1.2 + Math.random() * 1.2, Math.random() * BD), r: Math.random() * 6, v: 0.15 + Math.random() * 0.2 }));
    cs.forEach((c, i) => confetti.setColorAt(i, new THREE.Color([0xe3413f, 0xf2b134, 0x3a8fd8, 0xe56aa8, 0x6fcf97][i % 5])));
    group.add(confetti);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3(), wp = new THREE.Vector3();
    extras.push((t, dt, open) => {
      let k = 0;
      sparks.forEach((s, i) => {
        for (let j = 0; j < 6; j++) {
          const a = t * 0.6 + j * 1.05 + i;
          wp.set(Math.cos(a) * s.r * 0.85, s.h + Math.sin(a) * s.r * 0.85, 0.02);
          s.p.localToWorld(wp); group.worldToLocal(wp);
          twPts[k++] = wp.x; twPts[k++] = wp.y + (open > 0.9 ? 0 : -99); twPts[k++] = wp.z;
        }
      });
      tw.geometry.attributes.position.needsUpdate = true;
      tw.material.size = 0.1 + Math.sin(t * 9) * 0.03;
      cs.forEach((c, i) => {
        if (open > 0.95) { c.p.y -= c.v * dt; c.r += dt * 3; if (c.p.y < 0.02) c.p.y = 1.6 + Math.random() * 0.6; }
        m.compose(c.p, q.setFromEuler(e.set(c.r, c.r * 0.7, 0)), sv.setScalar(open > 0.95 ? 1 : 0));
        confetti.setMatrixAt(i, m);
      });
      confetti.instanceMatrix.needsUpdate = true;
    });
  }

  if (theme === 'together') {
    const trunk = poly([[-0.03, 0], [0.03, 0], [0.025, 0.4], [0.12, 0.55], [0.1, 0.57], [0.01, 0.46], [-0.08, 0.6], [-0.1, 0.58], [-0.02, 0.42]]);
    const pTree = stand(cut(trunk, 0x3b2a20), -0.82, 0.3, 0.3);
    pTree.add(cut([circle(0, 0.72, 0.2), circle(-0.14, 0.6, 0.14), circle(0.15, 0.62, 0.15), circle(0.02, 0.9, 0.13)], 0x2f5a3a).translateZ(0.004));
    // lamp post with a real glow
    const pLamp = stand(cut([rect(-0.012, 0, 0.024, 0.78), poly([[-0.06, 0.78], [0.06, 0.78], [0.04, 0.88], [-0.04, 0.88]])], 0x2a2a35), 0.92, 0.22, 0.36);
    const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd08a, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    lampGlow.scale.setScalar(0.5); lampGlow.position.y = 0.83;
    pLamp.add(lampGlow);
    // bench with two people leaning together, front right
    const bench = [rect(-0.26, 0.13, 0.52, 0.03), rect(-0.26, 0.2, 0.52, 0.025), rect(-0.24, 0, 0.025, 0.13), rect(0.215, 0, 0.025, 0.13), rect(-0.26, 0.27, 0.52, 0.02)];
    const pBench = stand(cut(bench, 0x6b4630), 0.56, 0.8, 0.5);
    pBench.add(cut([...figure(-0.07, 0.3, 0.06), ...figure(0.08, 0.28, -0.06)], 0x2e2a3a).translateY(0.1).translateZ(0.006));
    // hearts drifting up from the bench
    const hearts = [0, 1, 2].map((i) => {
      const hm = cut(heart(0, 0, 0.07), 0xe8457a, { emissive: 0x551020, transparent: true });
      pBench.add(hm);
      return { hm, ph: i / 3 };
    });
    extras.push((t, dt, open) => hearts.forEach((h) => {
      const u = (t * 0.22 + h.ph) % 1;
      h.hm.position.set(Math.sin(u * 6 + h.ph * 5) * 0.06, 0.45 + u * 0.6, 0.02);
      h.hm.material.opacity = open > 0.9 ? Math.sin(u * Math.PI) : 0;
    }));
  }

  // Caption place card, standing at the front of the base.
  const capCanvas = document.createElement('canvas');
  capCanvas.width = 1200; capCanvas.height = 240;
  const capTex = new THREE.CanvasTexture(capCanvas);
  capTex.colorSpace = THREE.SRGBColorSpace; capTex.anisotropy = 8;
  const cx = capCanvas.getContext('2d');
  cx.font = 'italic 500 46px "Playfair Display"';
  const capLines = wrap(cx, caption || '', 1090).slice(0, 3);
  let written = -1;
  function drawCaption(k) {
    const n = Math.floor(capLines.join('').length * k);
    if (n === written) return;
    written = n;
    paperFill(cx, 1200, 240, '#fbf7ee');
    cx.strokeStyle = '#c9a24a'; cx.lineWidth = 4; cx.strokeRect(14, 14, 1172, 212);
    cx.fillStyle = '#5a2a22'; cx.font = 'italic 500 46px "Playfair Display"'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    let left = n;
    capLines.forEach((l, i) => {
      const s = l.slice(0, Math.max(0, left)); left -= l.length;
      cx.fillText(s, 600, 120 + (i - (capLines.length - 1) / 2) * 56);
    });
    capTex.needsUpdate = true;
  }
  drawCaption(0);
  // Low and narrow so the props behind it stay visible over and beside it.
  const capCard = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.26), paper(0xffffff, { map: capTex, side: THREE.DoubleSide }));
  capCard.position.y = 0.13;
  capCard.castShadow = true;
  const capPivot = new THREE.Group();
  capPivot.position.set(0, 0, BD - 0.08);
  capPivot.add(capCard);
  group.add(capPivot);

  let openK = 0;
  function applyOpen(k) {
    openK = k;
    back.rotation.x = (1 - clamp01(k / 0.4)) * Math.PI / 2 * 0.985;
    for (const l of layers) l.pivot.rotation.x = -(1 - backOut(clamp01((k - l.delay) / 0.3))) * Math.PI / 2 * 0.97;
    for (const b of onBack) b.mesh.scale.setScalar(Math.max(0.001, backOut(clamp01((k - b.delay) / 0.3))));
    capPivot.rotation.x = lerp(-Math.PI / 2 * 0.97, -0.45, backOut(clamp01((k - 0.62) / 0.3)));
  }
  applyOpen(0);

  return {
    group, polaroid: polTex,
    set open(k) { applyOpen(k); },
    set write(k) { drawCaption(k); },
    tick(t, dt) { extras.forEach((f) => f(t, dt, openK)); },
    dispose() {
      group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      mats.forEach((m) => { m.map && m.map !== polTex && m.map.dispose(); m.dispose(); });
      group.removeFromParent();
    },
  };
}
