// Đèn kéo quân: a hexagonal paper lantern whose candle drives a little paper turbine; the figures hung from its
// axle turn in the candlelight and their shadows run round the courtyard walls. The shadows are real: a point
// light with a cube shadow map sits at the candle. Until the lantern is lit the light's range is ~0, so its six
// shadow passes cull everything and cost next to nothing.
import * as THREE from 'three';
import { glowTex, canvasTex } from './print.js';

const R = 0.27, H = 0.5;          // lantern radius and height
const FIG_R = 0.2, FIG_H = 0.07;  // figures ride here, just above the candle
const CANDLE_Y = 0.2;

// Silhouettes, ~FIG_H tall, built on y = 0..1 then scaled. Each returns an array of THREE.Shape.
const C = (x, y, r) => new THREE.Shape().absarc(x, y, r, 0, Math.PI * 2, false);
const E = (x, y, rx, ry, rot = 0) => { const s = new THREE.Shape(); s.absellipse(x, y, rx, ry, 0, Math.PI * 2, false, rot); return s; };
const P = (pts) => { const s = new THREE.Shape(); s.moveTo(...pts[0]); pts.slice(1).forEach((p) => s.lineTo(...p)); s.closePath(); return s; };
const star = (cx, cy, r) => P(Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; }));
export const FIGURES = {
  kid: () => [C(0, 0.62, 0.1), P([[-0.1, 0.5], [0.1, 0.5], [0.12, 0.22], [-0.12, 0.22]]), P([[-0.1, 0.22], [-0.02, 0.22], [-0.14, 0], [-0.22, 0]]), P([[0.02, 0.22], [0.1, 0.22], [0.2, 0], [0.12, 0]]),
    P([[0.08, 0.45], [0.12, 0.47], [0.36, 0.86], [0.33, 0.88]]), star(0.4, 0.93, 0.1)],
  lion: () => [C(0.26, 0.62, 0.2), C(0.38, 0.8, 0.06), E(-0.1, 0.52, 0.36, 0.16), P([[-0.4, 0.5], [-0.5, 0.62], [-0.46, 0.4]]),
    P([[0.2, 0.4], [0.28, 0.4], [0.28, 0], [0.2, 0]]), P([[0.05, 0.4], [0.13, 0.4], [0.1, 0], [0.02, 0]]), P([[-0.3, 0.4], [-0.22, 0.4], [-0.24, 0], [-0.32, 0]]), P([[0.4, 0.5], [0.52, 0.46], [0.42, 0.42]])],
  rabbit: () => [E(0, 0.3, 0.26, 0.2), C(0.24, 0.5, 0.12), E(0.22, 0.78, 0.04, 0.16, 0.2), E(0.3, 0.76, 0.04, 0.15, -0.3), C(-0.26, 0.32, 0.07), P([[0.1, 0.12], [0.2, 0.12], [0.24, 0], [0.12, 0]])],
  carp: () => [E(0, 0.5, 0.34, 0.16, 0.15), P([[-0.3, 0.46], [-0.52, 0.72], [-0.44, 0.48], [-0.52, 0.22]]), P([[-0.02, 0.62], [0.1, 0.8], [0.14, 0.62]]), P([[0, 0.38], [0.08, 0.24], [0.12, 0.38]])],
  moon: () => [C(0.3, 0.72, 0.24), P([[-0.36, 0], [-0.3, 0], [-0.3, 0.5], [-0.34, 0.5]]), C(-0.34, 0.62, 0.2), C(-0.18, 0.56, 0.14), C(-0.5, 0.56, 0.14), C(-0.04, 0.16, 0.07), P([[-0.12, 0.1], [0.04, 0.1], [0.06, 0], [-0.14, 0]])],
  dog: () => [E(0, 0.42, 0.28, 0.13), C(0.3, 0.6, 0.12), E(0.27, 0.72, 0.04, 0.1, 0.4), E(0.36, 0.72, 0.04, 0.1, -0.3), P([[-0.2, 0.34], [-0.12, 0.34], [-0.14, 0], [-0.2, 0]]), P([[0.12, 0.34], [0.2, 0.34], [0.2, 0], [0.14, 0]]),
    P([[-0.26, 0.48], [-0.4, 0.66], [-0.36, 0.7], [-0.24, 0.52]])],
  hang: () => [C(0, 0.8, 0.09), P([[-0.08, 0.72], [0.08, 0.72], [0.22, 0.05], [0.28, 0], [-0.3, 0], [-0.22, 0.05]]), P([[0.06, 0.66], [0.1, 0.62], [0.42, 0.78], [0.44, 0.84]]), P([[-0.06, 0.66], [-0.1, 0.62], [-0.38, 0.4], [-0.4, 0.46]])],
  star: () => [star(0, 0.6, 0.36), P([[-0.015, 0.25], [0.015, 0.25], [0.015, 0], [-0.015, 0]])],
};

// The family's đèn kéo quân for the rooftop: bigger, with the card's photos riding on the rotor inside the
// translucent paper, and the silhouette parade above them throwing its shadows round the terrace walls.
// present(i, camPos) turns the rotor so photo i faces the viewer; spin() gives it a push.
function photoTex(m) {
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#fbf6ea'; x.fillRect(0, 0, w, h);
    if (m.img) {
      const s = Math.min(m.img.width, m.img.height);
      x.drawImage(m.img, (m.img.width - s) / 2, (m.img.height - s) / 2, s, s, 12, 12, w - 24, h - 24);
    } else {
      x.fillStyle = '#7a1a10'; x.font = '600 26px "Dancing Script"'; x.textAlign = 'center';
      const words = m.caption.split(' '); let line = '', y = 90;
      for (const wd of words) { if (x.measureText(line + wd).width > 200) { x.fillText(line, 128, y); line = ''; y += 30; } line += wd + ' '; }
      x.fillText(line, 128, y);
    }
  });
}
export function createMemoryLantern(memories) {
  const S = 1.5; // scale over the table-top lantern
  const group = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(S);
  group.add(inner);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x7a4a22, roughness: 0.7 });
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xff9a40, emissiveIntensity: 0, roughness: 0.9, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xb3141f, roughness: 0.5 });
  const HH = 0.62;
  const corners = Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R); });
  for (let i = 0; i < 6; i++) {
    const a = corners[i], b = corners[(i + 1) % 6], mid = a.clone().add(b).multiplyScalar(0.5), len = a.distanceTo(b), ang = Math.atan2(b.x - a.x, b.z - a.z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, HH, 5), frameMat); post.position.copy(a).setY(HH / 2); post.castShadow = true;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(len, HH * 0.84), paperMat); panel.position.copy(mid).setY(HH / 2); panel.rotation.y = ang + Math.PI / 2; panel.renderOrder = 3;
    inner.add(post, panel);
    for (const y of [0.02, HH - 0.02]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.03, len), redMat); rail.position.copy(mid).setY(y); rail.rotation.y = ang; rail.castShadow = y < 0.1; inner.add(rail); }
  }
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.5, R * 1.08, 0.06, 6), redMat); roof.position.y = HH + 0.03; roof.castShadow = true;
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshStandardMaterial({ color: 0xd9a843, metalness: 1, roughness: 0.3 })); finial.position.y = HH + 0.08;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.05, R * 1.1, 0.03, 6), redMat); base.position.y = 0.015;
  inner.add(roof, finial, base);
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.14, 10), new THREE.MeshStandardMaterial({ color: 0xf2e6c8, roughness: 0.6 }));
  candle.position.y = 0.1;
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2, 1.4, 0.7), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  flame.scale.set(0.05, 0.09, 1); flame.position.y = 0.2;
  inner.add(candle, flame);
  const rotor = new THREE.Group();
  rotor.add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, HH * 0.85, 5).translate(0, HH * 0.5, 0), frameMat));
  for (let i = 0; i < 8; i++) {
    const vane = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.035).translate(0.055, 0, 0), new THREE.MeshStandardMaterial({ color: 0xfff0d0, side: THREE.DoubleSide }));
    vane.position.y = HH * 0.9; vane.rotation.set(0.6, (i / 8) * Math.PI * 2, 0, 'YXZ');
    rotor.add(vane);
  }
  // photos: square frames on arms, facing out, lit by the candle
  const N = memories.length;
  const photos = memories.map((m, i) => {
    const a = (i / N) * Math.PI * 2;
    const mat = new THREE.MeshBasicMaterial({ map: photoTex(m), color: 0x000000, side: THREE.DoubleSide });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), mat);
    p.position.set(Math.sin(a) * 0.19, 0.33, Math.cos(a) * 0.19); p.rotation.y = a;
    rotor.add(p);
    return { mesh: p, a, mat };
  });
  // the silhouette parade above the photos: their shadows run round the terrace walls
  const figMat = new THREE.MeshBasicMaterial({ color: 0x140a06, side: THREE.DoubleSide });
  ['hang', 'kid', 'lion', 'carp', 'rabbit', 'dog', 'star', 'moon'].forEach((name, i) => {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const fig = new THREE.Mesh(new THREE.ShapeGeometry(FIGURES[name](), 6), figMat);
    fig.scale.setScalar(0.06);
    fig.position.set(Math.sin(a) * 0.22, 0.46, Math.cos(a) * 0.22); fig.rotation.y = a; fig.castShadow = true;
    rotor.add(fig);
  });
  inner.add(rotor);
  const light = new THREE.PointLight(0xffa850, 0, 0.02, 1);
  light.position.y = 0.26 * S;
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.003;
  light.shadow.camera.near = 0.08;
  group.add(light);
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(R * S * 1.3, R * S * 1.3, (HH + 0.2) * S, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = HH * S / 2;
  group.add(hit);
  let lit = 0, speed = 0, boost = 0, target = null;
  return {
    group, light, hit, photos,
    set lit(v) { lit = v; light.distance = v > 0.01 ? 16 : 0.02; },
    get lit() { return lit; },
    spin() { boost = 2.5; target = null; },
    // turn so photo i faces camPos; resolves when it settles
    present(i, camPos) {
      const local = group.worldToLocal(camPos.clone());
      const want = Math.atan2(local.x, local.z) - photos[i].a;
      let d = THREE.MathUtils.euclideanModulo(want - rotor.rotation.y, Math.PI * 2);
      d += Math.PI * 2; // at least one full turn, for the show
      target = { from: rotor.rotation.y, to: rotor.rotation.y + d, t: 0 };
      return new Promise((r) => (target.done = r));
    },
    tick(t, dt) {
      const flick = 0.9 + Math.sin(t * 13) * 0.05 + Math.sin(t * 7.3) * 0.05;
      light.intensity = lit * 5 * flick;
      paperMat.emissiveIntensity = lit * 0.5 * flick;
      flame.material.opacity = lit;
      for (const p of photos) p.mat.color.setScalar(lit * 0.95 * flick);
      if (target) {
        target.t += dt / 2.2;
        const k = Math.min(1, target.t), e = 1 - (1 - k) ** 3;
        rotor.rotation.y = target.from + (target.to - target.from) * e;
        speed = 0;
        if (k >= 1) { const d = target.done; target = null; d(); }
        return;
      }
      boost = Math.max(0, boost - dt * 0.5);
      speed += (lit * (0.4 + boost) - speed) * Math.min(1, dt * 0.8);
      rotor.rotation.y += speed * dt;
    },
  };
}
