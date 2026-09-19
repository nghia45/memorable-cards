// Bản Giốc: the river spills off the plateau over a horseshoe of limestone in two tiers, in dozens of separate
// strands between mossy rock and trees; mist rises off the jade pool where bamboo rafts pole in close.
import * as THREE from 'three';
import { FALLS, WATER_Y, UPPER_Y } from './land.js';
import { rng, fbm, noise, ss } from './noise.js';
import { makePerson } from './figures.js';
import { detail } from './detail.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const { c: C, th: TH } = FALLS;
const onArc = (th, r, y, out = new THREE.Vector3()) => out.set(C.x + Math.sin(th) * r, y, C.y - Math.cos(th) * r);

const NOISE_GLSL = /* glsl */`
  float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y); }`;
const fogMat = (uniforms, vertexShader, fragmentShader) => new THREE.ShaderMaterial({
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, uniforms]), vertexShader, fragmentShader,
  transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
});

// the rock face of one tier: a curved curtain, pitted, mossy where the spray keeps it wet, turning back into the ground at the top
function cliff(R, y0, y1, seed) {
  const U = 150, V = 16, pos = [], col = [], idx = [], c = new THREE.Color(), p = new THREE.Vector3();
  const rock = new THREE.Color(0xa29f90), dark = new THREE.Color(0x7a7a6e), moss = new THREE.Color(0x4f7d33);
  for (let j = 0; j <= V; j++) for (let i = 0; i <= U; i++) {
    const u = i / U, v = j / V, th = (u * 2 - 1) * (TH + 0.18), y = y0 - 1.5 + v * (y1 - y0 + 1.8);
    const bump = fbm(th * 22 + seed, y * 0.25) * 1.1 + noise(th * 70, y * 0.9 + seed) * 0.35; // stays behind the water (see strands)
    const r = R - 0.6 - bump + ss(0.82, 1, v) * 3.5;
    onArc(th, r, y, p); pos.push(p.x, p.y, p.z);
    const m = noise(th * 40 + seed, y * 0.5);
    c.copy(rock).lerp(dark, noise(th * 90, y * 2) * 0.7).lerp(moss, ss(0.45, 0.7, m) * 0.8 + ss(0.75, 1, v) * 0.9);
    col.push(c.r, c.g, c.b);
  }
  for (let j = 0; j < V; j++) for (let i = 0; i < U; i++) { const a = j * (U + 1) + i, b = a + 1, d = a + U + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, detail(new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), 'cliff'));
  m.castShadow = m.receiveShadow = true;
  return m;
}

// the strands of one tier: sheets of falling water, each arcing out from the lip; uv.y runs down the fall
function strands(R, y0, y1, seed, mat) {
  const Rn = rng(seed), pos = [], uv = [], idx = [], p = new THREE.Vector3();
  let th = -TH + 0.02, base = 0;
  while (th < TH - 0.03) {
    const w = 0.03 + Rn() * 0.12, th1 = Math.min(TH - 0.02, th + w), reach = 0.7 + Rn() * 0.3, U = 10, V = 18, s = Rn() * 50;
    for (let j = 0; j <= V; j++) for (let i = 0; i <= U; i++) {
      const u = i / U, v = j / V, t = th + (th1 - th) * u;
      const r = R - 2.2 - Math.sin(v * Math.PI * 0.5) ** 0.6 * 2.6 * reach - noise(t * 60, v * 3) * 0.4;
      onArc(t, r, y1 + 0.35 - v * (y1 - y0 + 0.6), p); pos.push(p.x, p.y, p.z); uv.push(u + s, v);
    }
    for (let j = 0; j < V; j++) for (let i = 0; i < U; i++) { const a = base + j * (U + 1) + i, b = a + 1, d = a + U + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
    base += (U + 1) * (V + 1);
    th = th1 + 0.008 + Rn() * 0.05;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.renderOrder = 2;
  return m;
}

function soft() {
  const cv = Object.assign(document.createElement('canvas'), { width: 64, height: 64 }), x = cv.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

function raft(R) {
  const g = new THREE.Group(), bam = new THREE.MeshStandardMaterial({ color: 0xc8b070, roughness: 0.7 });
  const deck = new THREE.Mesh(mergeGeometries(Array.from({ length: 9 }, (_, i) => new THREE.CylinderGeometry(0.11, 0.11, 6.4, 6).rotateX(Math.PI / 2).translate((i - 4) * 0.22, 0, 0))), bam);
  deck.castShadow = true; g.add(deck);
  const man = makePerson({ top: 0x2a3050, bottom: 0x1e2230, hat: 'non', hair: 'short', skin: 0xc98f66, outfit: 'shirt' });
  man.g.position.set(0, 0.1, 2.3); man.g.rotation.y = Math.PI;
  man.pose('L', -0.6, 0.3, -0.9); man.pose('R', -1.2, 0.1, -0.4); man.holding = true;
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 5, 5), bam);
  stick.position.set(0.3, 1.3, 1.6); stick.rotation.x = -0.45; g.add(man.g, stick);
  for (const [x, z] of [[-0.35, -0.8], [0.35, 0.4]]) { // visitors in orange life vests
    const v = makePerson({ top: 0xf07a1a, bottom: 0x2a3550, hair: R() < 0.5 ? 'bob' : 'short', girl: R() < 0.5, skin: 0xe0a982 });
    v.sit(); v.g.position.set(x, v.g.position.y + 0.12, z); v.g.rotation.y = Math.PI; g.add(v.g);
  }
  return g;
}

export function createFalls() {
  const g = new THREE.Group(), R = rng(3);
  g.add(cliff(FALLS.r1, WATER_Y, FALLS.y1, 1), cliff(FALLS.r2, FALLS.y1, UPPER_Y, 2));

  const light = { value: new THREE.Color(1, 1, 1) };
  const waterMat = fogMat({ time: { value: 0 }, tint: light }, /* glsl */`
    varying vec2 vUv;
    #include <fog_pars_vertex>
    void main() {
      vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`,
  /* glsl */`uniform float time; uniform vec3 tint; varying vec2 vUv; ${NOISE_GLSL}
    #include <fog_pars_fragment>
    void main() {
      float s = vn(vec2(vUv.x * 9.0, vUv.y * 3.0 - time * 1.4)) * 0.6 + vn(vec2(vUv.x * 30.0, vUv.y * 9.0 - time * 2.4)) * 0.4;
      float edge = smoothstep(0.0, 0.22, fract(vUv.x)) * smoothstep(1.0, 0.78, fract(vUv.x));
      float a = edge * (0.5 + 0.5 * s) * smoothstep(0.0, 0.05, vUv.y);
      vec3 c = mix(vec3(0.55, 0.74, 0.72), vec3(1.0), smoothstep(0.3, 0.75, s + vUv.y * 0.25));
      gl_FragColor = vec4(c * tint, a * 0.92);
      #include <fog_fragment>
    }`);
  // uv.x is offset per strand, so edge() uses fract(); the strands are built with u in [s, s+1]
  g.add(strands(FALLS.r2, FALLS.y1, UPPER_Y, 7, waterMat), strands(FALLS.r1, WATER_Y, FALLS.y1, 8, waterMat));

  // white water: where each tier lands (the pool, and the ledge between the tiers)
  const foamMat = (r0, r1) => fogMat({ time: { value: 0 }, tint: light, r0: { value: r0 }, r1: { value: r1 } }, /* glsl */`
    varying vec3 vP;
    #include <fog_pars_vertex>
    void main() {
      vP = position; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`,
  /* glsl */`uniform float time, r0, r1; uniform vec3 tint; varying vec3 vP; ${NOISE_GLSL}
    #include <fog_pars_fragment>
    void main() {
      float r = length(vP.xy), a = atan(vP.x, vP.y);
      float s = vn(vec2(a * 160.0, r * 0.6 + time * 1.1)) * 0.6 + vn(vec2(a * 420.0, r * 1.7 + time * 1.9)) * 0.4;
      float k = smoothstep(r0, r1, r);
      float al = smoothstep(0.55 - k * 0.45, 0.9, s) * k;
      gl_FragColor = vec4(vec3(0.95, 0.98, 0.97) * tint, al * 0.95);
      #include <fog_fragment>
    }`);
  const ring = (r0, r1, y, mat) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 120, 2, Math.PI / 2 - TH - 0.1, (TH + 0.1) * 2), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(C.x, y, C.y); m.renderOrder = 1; // local +y turns to -z: north
    return m;
  };
  const poolFoam = foamMat(FALLS.r1 - 18, FALLS.r1 - 2.5), ledgeFoam = foamMat(FALLS.r1 + 0.5, FALLS.r2 - 2.8);
  g.add(ring(FALLS.r1 - 18, FALLS.r1 - 0.8, WATER_Y + 0.06, poolFoam), ring(FALLS.r1 - 0.6, FALLS.r2 - 1.2, FALLS.y1 + 0.55, ledgeFoam));

  // spray
  const tex = soft(), mist = [];
  for (let i = 0; i < 70; i++) {
    const low = i < 50, th = (R() * 2 - 1) * TH * 0.95, r = low ? FALLS.r1 - 4 - R() * 9 : FALLS.r2 - 3 - R() * 3;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
    const base = onArc(th, r, low ? WATER_Y : FALLS.y1 + 0.5);
    s.userData = { base, ph: R(), sp: 0.05 + R() * 0.06, size: low ? 7 + R() * 8 : 4 + R() * 4, rise: low ? 12 : 6 };
    s.renderOrder = 3; mist.push(s); g.add(s);
  }

  const rafts = [-0.32, 0.02, 0.3].map((th, i) => {
    const r = raft(R), at = onArc(th, FALLS.r1 - 22 - i * 3, WATER_Y + 0.1);
    r.position.copy(at); r.rotation.y = Math.atan2(C.x - at.x, C.y - 200 - at.z); /* bow to the falls; a plain yaw, so the bobbing roll stays a roll */ r.userData.at = at.clone(); r.userData.ph = R() * 6;
    g.add(r);
    return r;
  });

  const mats = [waterMat, poolFoam, ledgeFoam];
  return {
    group: g, rafts, light: light.value, waterMat,
    centre: onArc(0, FALLS.r1, FALLS.y1),
    tick(t, dt) {
      for (const m of mats) m.uniforms.time.value = t;
      for (const s of mist) {
        const u = s.userData, k = (t * u.sp + u.ph) % 1;
        s.position.copy(u.base); s.position.y += k * u.rise;
        s.scale.setScalar(u.size * (0.6 + k));
        s.material.opacity = Math.sin(k * Math.PI) * 0.14;
        s.material.color.copy(light.value);
      }
      for (const r of rafts) { const u = r.userData; r.position.y = u.at.y + Math.sin(t * 1.3 + u.ph) * 0.05; r.rotation.z = Math.sin(t * 0.9 + u.ph) * 0.02; }
    },
  };
}
