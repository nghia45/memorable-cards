// Sky dome and the time of day. tod 0 is a clear late afternoon, 1 is dusk with the last light on the peaks.
// Every light, the fog and the far ranges are mixed from the two looks, so one number sets the mood.
import * as THREE from 'three';
import { noiseTex } from './detail.js';

const col = (h) => new THREE.Color(h);
const DAY = {
  top: col(0x5a98de), horizon: col(0xd4e4ec), sun: col(0xfff0d2), el: 0.62,
  key: [col(0xfff0da), 2.8], hemi: [col(0xbcd4f0), col(0x5a5a30), 0.75], fog: [col(0xbfd0dc), 0.0011],
  near: col(0x86a0ab), far: col(0xabc0ca), falls: 1, exposure: 0.92,
};
const DUSK = {
  top: col(0x1f2c60), horizon: col(0xe08a5e), sun: col(0xff7438), el: 0.035,
  key: [col(0xff9a58), 0.95], hemi: [col(0x7080b0), col(0x3c3c2e), 0.85], fog: [col(0x5e5470), 0.0015],
  near: col(0x4a4466), far: col(0x6c5a7a), falls: 0.22, exposure: 1.25,
};

export function createSky() {
  const u = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, dusk: { value: 0 }, time: { value: 0 }, cbNoise: { value: noiseTex } };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform vec3 top, horizon, sunCol, sunDir; uniform float dusk, time; uniform sampler2D cbNoise; varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = max(d.y, 0.0), sd = max(dot(d, sunDir), 0.0);
        vec3 c = mix(horizon, top, pow(h, 0.5));
        c = mix(c, horizon * 0.85, smoothstep(0.0, -0.1, d.y));
        // the glow round the sun spreads wide at dusk
        c += sunCol * (pow(sd, 1200.0) * 8.0 + pow(sd, 18.0) * (0.25 + dusk * 0.5) + pow(sd, 4.0) * dusk * 0.35 * (1.0 - h));
        // a layer of fair-weather cumulus, lit from the sun's side, thinning toward the zenith and the horizon
        vec2 cuv = d.xz / (d.y + 0.12) * 0.3 + vec2(time * 0.004, time * 0.0015);
        float cl = texture2D(cbNoise, cuv).r * 0.6 + texture2D(cbNoise, cuv * 2.7 + 0.3).g * 0.4;
        cl = smoothstep(0.5, 0.78, cl) * smoothstep(0.02, 0.14, d.y) * (1.0 - smoothstep(0.5, 0.9, d.y));
        vec3 cc = mix(horizon * 0.95 + 0.08, sunCol * 0.8 + horizon * 0.4, pow(sd, 3.0));
        cc = mix(cc, vec3(1.0, 0.98, 0.95), 0.4 * (1.0 - dusk));
        c = mix(c, cc, cl * 0.85);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), mat);
  mesh.renderOrder = -2; mesh.frustumCulled = false;
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), mat));
  return { mesh, u, envScene };
}

// Low mist lying between the peaks: a few big soft sprites, tinted with the fog so they sit in the air.
export function createMist(count, R) {
  const cv = Object.assign(document.createElement('canvas'), { width: 64, height: 64 }), x = cv.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); // fades to nothing inside the square; the sprite's scale stretches it g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.45, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv), group = new THREE.Group(), mats = [];
  for (let i = 0; i < count; i++) {
    const a = R() * Math.PI * 2, e = 0.55 + R() * 0.4, m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.12 + R() * 0.1 });
    const s = new THREE.Sprite(m);
    s.position.set(Math.sin(a) * 210 * e, 22 + R() * 30, 10 + Math.cos(a) * 240 * e);
    s.scale.set(110 + R() * 90, 26 + R() * 18, 1);
    s.userData.drift = (R() - 0.5) * 1.2; s.renderOrder = 4;
    group.add(s); mats.push(m);
  }
  return { group, mats, tick(dt) { for (const s of group.children) s.position.x += s.userData.drift * dt; } };
}

// Apply tod to everything that depends on it. `t` holds the scene's lights and materials.
const tmp = new THREE.Color();
export function applyLook(tod, t) {
  const k = tod, mix = (a, b) => tmp.copy(a).lerp(b, k);
  const el = DAY.el + (DUSK.el - DAY.el) * k, az = 0.95 + k * 0.25; // sun low in the west-south-west
  t.sunDir.set(-Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
  const s = t.sky.u;
  s.top.value.copy(mix(DAY.top, DUSK.top)); s.horizon.value.copy(mix(DAY.horizon, DUSK.horizon));
  s.sunCol.value.copy(mix(DAY.sun, DUSK.sun)); s.sunDir.value.copy(t.sunDir); s.dusk.value = k;
  t.key.color.copy(mix(DAY.key[0], DUSK.key[0])); t.key.intensity = DAY.key[1] + (DUSK.key[1] - DAY.key[1]) * k;
  t.hemi.color.copy(mix(DAY.hemi[0], DUSK.hemi[0])); t.hemi.groundColor.copy(mix(DAY.hemi[1], DUSK.hemi[1]));
  t.hemi.intensity = DAY.hemi[2] + (DUSK.hemi[2] - DAY.hemi[2]) * k;
  t.fog.color.copy(mix(DAY.fog[0], DUSK.fog[0])); t.fog.density = DAY.fog[1] + (DUSK.fog[1] - DAY.fog[1]) * k;
  t.ranges[0].copy(mix(DAY.near, DUSK.near)); t.ranges[1].copy(mix(DAY.far, DUSK.far));
  t.falls.setScalar(DAY.falls + (DUSK.falls - DAY.falls) * k);
  for (const m of t.mist) m.color.copy(t.fog.color).lerp(tmp.setRGB(1, 1, 1), 0.5 - k * 0.3);
  t.renderer.toneMappingExposure = DAY.exposure + (DUSK.exposure - DAY.exposure) * k;
}
