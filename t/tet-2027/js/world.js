// Shared atmosphere: sky dome (night → mùng 1 dawn), light rig, silk lanterns, drifting mai petals.
import * as THREE from 'three';
import { glowTex, blossomShape } from './print.js';
import { lerp } from './tween.js';
import { glowScale } from './tex.js';

export function createSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { dawn: { value: 0 }, time: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position.z = gl_Position.w; // pin to the far plane
      }`,
    fragmentShader: /* glsl */`
      uniform float dawn, time;
      varying vec3 vDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -0.2, 1.0);
        // night: deep blue-violet zenith, warm town glow low on the horizon
        vec3 nZen = vec3(0.008, 0.012, 0.035), nMid = vec3(0.03, 0.03, 0.075), nHor = vec3(0.16, 0.06, 0.07);
        vec3 night = mix(nHor, nMid, smoothstep(0.0, 0.18, h));
        night = mix(night, nZen, smoothstep(0.15, 0.7, h));
        // mùng 1 dawn: gold and peach at the horizon, clear soft blue above; sun toward -z / +x
        vec3 dZen = vec3(0.1, 0.24, 0.52), dMid = vec3(0.42, 0.42, 0.55), dHor = vec3(0.9, 0.5, 0.3);
        vec3 day = mix(dHor, dMid, smoothstep(-0.02, 0.2, h));
        day = mix(day, dZen, smoothstep(0.18, 0.75, h));
        vec3 sunDir = normalize(vec3(0.45, 0.1, -1.0));
        float sun = max(dot(d, sunDir), 0.0);
        day += vec3(1.0, 0.58, 0.28) * (pow(sun, 8.0) * 0.35 + pow(sun, 80.0) * 0.5) + vec3(1.0, 0.9, 0.7) * smoothstep(0.9994, 0.9997, sun) * 6.0;
        vec3 col = mix(night, day, dawn);
        // moon, with a soft halo in the haze
        vec3 moonDir = normalize(vec3(-0.32, 0.3, -1.0));
        float md = dot(d, moonDir);
        float disc = smoothstep(0.99955, 0.9997, md);
        vec2 mp = (d - moonDir * md).xy * 900.0;
        vec3 moon = vec3(1.0, 0.95, 0.85) * disc * (3.2 - 1.2 * vnoise(mp * 0.35) - 0.6 * vnoise(mp * 1.1));
        col += (moon + vec3(0.5, 0.55, 0.75) * (pow(max(md, 0.0), 400.0) * 0.35 + pow(max(md, 0.0), 40.0) * 0.06)) * (1.0 - dawn);
        // stars fade out with the dawn and behind cloud
        vec3 cell = floor(d * 260.0);
        float st = step(0.9965, hash(cell)) * smoothstep(0.05, 0.3, h);
        st *= 0.6 + 0.4 * sin(time * 2.0 + hash(cell + 1.0) * 40.0);
        // clouds on a plane overhead, drifting slowly
        vec2 cp = d.xz / (d.y + 0.12) * 0.9 + vec2(time * 0.006, time * 0.002);
        float c = smoothstep(0.48, 0.78, fbm(cp * 1.3)) * smoothstep(0.0, 0.12, h);
        float thin = fbm(cp * 4.0 + 3.0);
        vec3 cloudNight = vec3(0.07, 0.07, 0.11) + vec3(0.3, 0.3, 0.38) * pow(max(md, 0.0), 8.0) + nHor * 0.6 * (1.0 - smoothstep(0.0, 0.3, h));
        vec3 cloudDay = mix(vec3(0.95, 0.55, 0.5), vec3(1.0, 0.8, 0.66), thin) * (0.6 + 0.6 * pow(sun, 3.0));
        col = mix(col + vec3(1.0, 0.92, 0.8) * st * (1.0 - dawn), mix(cloudNight, cloudDay, dawn), c * (0.55 + 0.4 * thin));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return { mesh, set dawn(v) { mat.uniforms.dawn.value = v; }, tick(t) { mat.uniforms.time.value = t; } };
}

// Moonlight + lantern warmth at night; low golden sun at dawn. `dawn` blends every value.
export function createLights(scene) {
  const key = new THREE.DirectionalLight();
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 });
  scene.add(key, key.target);
  const hemi = new THREE.HemisphereLight();
  scene.add(hemi);
  const night = { key: new THREE.Color(0x8fa2ff), keyI: 0.9, keyPos: new THREE.Vector3(-6, 12, 4), sky: new THREE.Color(0x3a3a70), ground: new THREE.Color(0x3a140a), hemiI: 0.85, env: 0.22, fog: new THREE.Color(0x1a0710) };
  const day = { key: new THREE.Color(0xffd2a0), keyI: 2.6, keyPos: new THREE.Vector3(5, 6, -9), sky: new THREE.Color(0xdfe8ff), ground: new THREE.Color(0x7a5040), hemiI: 0.9, env: 0.6, fog: new THREE.Color(0xb88f80) };
  const warm = [];
  for (const [x, y, z] of [[-2.4, 2.6, 1.5], [2.4, 2.6, 1.5], [0, 3.2, -2.5]]) {
    const p = new THREE.PointLight(0xff7a33, 9, 12, 1.6);
    p.position.set(x, y, z);
    scene.add(p); warm.push(p);
  }
  return {
    key, warm,
    set(dawn, focus = new THREE.Vector3()) {
      key.color.copy(night.key).lerp(day.key, dawn);
      key.intensity = lerp(night.keyI, day.keyI, dawn);
      key.position.copy(night.keyPos).lerp(day.keyPos, dawn).add(focus);
      key.target.position.copy(focus);
      hemi.color.copy(night.sky).lerp(day.sky, dawn);
      hemi.groundColor.copy(night.ground).lerp(day.ground, dawn);
      hemi.intensity = lerp(night.hemiI, day.hemiI, dawn);
      scene.environmentIntensity = lerp(night.env, day.env, dawn);
      scene.fog.color.copy(night.fog).lerp(day.fog, dawn);
      for (const p of warm) p.intensity = 9 * (1 - dawn * 0.85);
    },
  };
}

// ---------- silk lanterns (đèn lồng) ----------
const ribTex = (() => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 8;
  const x = c.getContext('2d');
  for (let i = 0; i < 256; i++) { const k = 0.45 + 0.55 * Math.sin((i / 256) * Math.PI * 24) ** 2; x.fillStyle = `rgb(${255 * k},${64 * k},${28 * k})`; x.fillRect(i, 0, 1, 8); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
// Same ribbing in grey, so instanced lanterns can take any silk colour.
const ribGray = (() => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 8;
  const x = c.getContext('2d');
  for (let i = 0; i < 256; i++) { const k = 0.35 + 0.65 * Math.sin((i / 256) * Math.PI * 24) ** 2; x.fillStyle = `rgb(${255 * k},${255 * k},${255 * k})`; x.fillRect(i, 0, 1, 8); }
  return new THREE.CanvasTexture(c);
})();
const lanternBodyGeo = new THREE.LatheGeometry(
  Array.from({ length: 11 }, (_, i) => { const t = i / 10; return new THREE.Vector2(0.07 + Math.sin(Math.PI * t) * 0.3, (t - 0.5) * 0.52); }), 20); // ribs live in the texture, so few segments
export const lanternMat = new THREE.MeshStandardMaterial({ color: 0x8a0d18, emissive: 0xffffff, emissiveMap: ribTex, emissiveIntensity: 1.6, roughness: 0.7 });
// Instanced silk lanterns: the per-instance colour tints the glow as well as the silk.
const fieldMat = new THREE.MeshStandardMaterial({ color: 0x777777, emissive: 0xffffff, emissiveMap: ribGray, emissiveIntensity: 1.25, roughness: 0.7 });
fieldMat.onBeforeCompile = (sh) => {
  sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
    #ifdef USE_COLOR
      totalEmissiveRadiance *= vColor;
    #endif`);
};
fieldMat.customProgramCacheKey = () => 'lanternField';
export const goldMat = new THREE.MeshStandardMaterial({ color: 0xd9a843, metalness: 1, roughness: 0.35 });
const capGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.05, 20);
const tasselGeo = new THREE.ConeGeometry(0.035, 0.28, 8);
const tasselMat = new THREE.MeshStandardMaterial({ color: 0xc41628, roughness: 0.9 });
const glowMats = [];

// Many hanging lanterns in three draw calls. items: [{ p: hang point, c: Color, s: scale, drop }].
export function createLanternField(items) {
  const n = items.length, g = new THREE.Group();
  const caps = new THREE.BufferGeometry().copy(capGeo).translate(0, 0.28, 0);
  const capsGeo = mergeCaps(caps);
  const body = new THREE.InstancedMesh(lanternBodyGeo, fieldMat, n);
  const cap = new THREE.InstancedMesh(capsGeo, goldMat, n);
  const tas = new THREE.InstancedMesh(tasselGeo.clone().rotateX(Math.PI).translate(0, -0.46, 0), tasselMat, n);
  items.forEach((it, i) => body.setColorAt(i, it.c));
  const m = new THREE.Matrix4(), hang = new THREE.Matrix4(), rot = new THREE.Matrix4(), off = new THREE.Matrix4(), sc = new THREE.Matrix4();
  const halo = new THREE.Points(new THREE.BufferGeometry().setFromPoints(items.map((it) => it.p.clone().setY(it.p.y - (it.drop ?? 0.2) - 0.26 * it.s))),
    new THREE.PointsMaterial({ map: glowTex, size: 1.3, color: 0xffb070, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glowMats.push(halo.material);
  g.add(body, cap, tas, halo);
  const ph = items.map((_, i) => i * 1.7), eu = new THREE.Euler();
  const pose = (t) => {
    items.forEach((it, i) => {
      hang.makeTranslation(it.p.x, it.p.y, it.p.z);
      rot.makeRotationFromEuler(eu.set(Math.sin(t * 0.7 + ph[i]) * 0.04, 0, Math.sin(t * 0.9 + ph[i]) * 0.06));
      off.makeTranslation(0, -(it.drop ?? 0.2) - 0.3 * it.s, 0);
      sc.makeScale(it.s, it.s, it.s);
      m.copy(hang).multiply(rot).multiply(off).multiply(sc);
      body.setMatrixAt(i, m); cap.setMatrixAt(i, m); tas.setMatrixAt(i, m);
    });
    body.instanceMatrix.needsUpdate = cap.instanceMatrix.needsUpdate = tas.instanceMatrix.needsUpdate = true;
  };
  pose(0);
  for (const im of [body, cap, tas]) im.computeBoundingSphere();
  g.userData.tick = pose;
  return g;
}
function mergeCaps(top) { // top and bottom caps as one geometry
  const bot = top.clone().rotateX(Math.PI);
  const pos = [...top.attributes.position.array, ...bot.attributes.position.array];
  const nor = [...top.attributes.normal.array, ...bot.attributes.normal.array];
  const n0 = top.attributes.position.count, idx = [...top.index.array, ...bot.index.array.map((i) => i + n0)];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

export function makeLantern(glowScale = 1.5) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(capGeo, goldMat); top.position.y = 0.28;
  const bot = new THREE.Mesh(capGeo, goldMat); bot.position.y = -0.28; bot.rotation.x = Math.PI;
  const tassel = new THREE.Mesh(tasselGeo, tasselMat); tassel.position.y = -0.46; tassel.rotation.x = Math.PI;
  const gm = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.45 });
  glowMats.push(gm);
  const glow = new THREE.Sprite(gm);
  glow.scale.setScalar(glowScale);
  g.add(new THREE.Mesh(lanternBodyGeo, lanternMat), top, bot, tassel, glow);
  return g;
}
// Lantern glow is a night thing: dim emissive and halos as the dawn comes up.
export function setLanternGlow(dawn) {
  lanternMat.emissiveIntensity = lerp(1.6, 0.35, dawn);
  fieldMat.emissiveIntensity = lerp(1.25, 0.35, dawn);
  glowScale.value = lerp(2, 0.2, dawn);
  for (const m of glowMats) m.opacity = lerp(0.45, 0.05, dawn);
}

// A sagging string of lanterns between two posts: catenary-ish parabola.
export function lanternString(a, b, count, sag = 0.5) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    pts.push(p);
  }
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2a1a10 })));
  const swing = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= Math.sin(t * Math.PI) * sag + 0.42;
    const l = makeLantern(1.3);
    l.scale.setScalar(0.62);
    l.position.copy(p);
    g.add(l); swing.push(l);
  }
  g.userData.tick = (t) => swing.forEach((l, i) => (l.rotation.z = Math.sin(t * 0.9 + i * 1.7) * 0.05));
  return g;
}

// ---------- drifting mai petals around a focus point ----------
export function createPetals(count = 90) {
  const mesh = new THREE.InstancedMesh(new THREE.ShapeGeometry(blossomShape(0.07), 6),
    new THREE.MeshStandardMaterial({ color: 0xffc53a, emissive: 0x6a3a00, roughness: 0.6, side: THREE.DoubleSide }), count);
  mesh.frustumCulled = false;
  const st = Array.from({ length: count }, () => ({
    p: new THREE.Vector3((Math.random() - 0.5) * 9, Math.random() * 5, (Math.random() - 0.5) * 9),
    r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), s: 0.5 + Math.random() * 0.8, f: 0.15 + Math.random() * 0.25,
  }));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), s = new THREE.Vector3();
  const burst = [];
  return {
    mesh,
    density: 0.35, // fraction of petals visible; grows as the tree blooms
    center: new THREE.Vector3(),
    // Swirl a handful of petals out from a point (bud bloom, envelope release).
    burst(at, n = 30) {
      for (let i = 0; i < n; i++) {
        const k = Math.floor(Math.random() * count);
        st[k].p.copy(at).sub(this.center);
        burst[k] = new THREE.Vector3((Math.random() - 0.5) * 2.5, Math.random() * 2, (Math.random() - 0.3) * 2.5);
      }
    },
    tick(dt, t, ambient) {
      st.forEach((p, i) => {
        const v = burst[i];
        if (v) { p.p.addScaledVector(v, dt); v.multiplyScalar(1 - dt * 1.6); if (v.lengthSq() < 0.01) burst[i] = null; }
        p.p.y -= p.f * dt * ambient;
        p.p.x += Math.sin(t * 0.7 + i) * 0.18 * dt * ambient;
        if (p.p.y < 0) { p.p.y = 5; p.p.x = (Math.random() - 0.5) * 9; p.p.z = (Math.random() - 0.5) * 9; }
        p.r.x += dt * 0.8 * ambient; p.r.y += dt * 0.5 * ambient;
        const on = i < count * this.density || v;
        m.compose(pos.copy(p.p).add(this.center), q.setFromEuler(p.r), s.setScalar(on ? p.s : 0));
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
