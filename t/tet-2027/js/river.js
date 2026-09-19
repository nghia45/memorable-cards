// Act 1: night river through an old Hội An street. Reflective rippled water, shophouses with tile roofs,
// teal shutters and lit shopfronts, strings of silk lanterns across the water, moored boats, drifting paper
// lotus lanterns (hoa đăng), and the camera path that carries the viewer to the courtyard.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTex, latticeTex } from './print.js';
import { createLanternField } from './world.js';
import { bucket, shophouse, boatHull, lanternColor } from './arch.js';
import { plaster, roofTiles, wood, stoneWall, terracotta, bakeGlow, withGlow, repeatMaps } from './tex.js';

export const WATER_Y = -0.6;
const Z0 = 6.5, Z1 = 75; // river runs from the courtyard steps (+z) outward
const HALF = 4.6; // half width of the water channel
const FRONT = HALF + 1.1; // house fronts; the quay walkway sits between them and the water

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

// Shared street materials (the courtyard uses them too).
export function streetMaterials() {
  const tiles = roofTiles(), wd = wood(), pl = plaster();
  return {
    plaster: withGlow(new THREE.MeshStandardMaterial({ ...pl, roughness: 0.93, vertexColors: true })),
    wood: withGlow(new THREE.MeshStandardMaterial({ ...wd, roughness: 0.55 })),
    tiles: withGlow(new THREE.MeshStandardMaterial({ ...tiles, roughness: 0.8 })),
    soffit: withGlow(new THREE.MeshStandardMaterial({ ...wd, roughness: 0.7, side: THREE.BackSide })), // rafters under the eaves
    shutter: withGlow(new THREE.MeshStandardMaterial({ color: 0x2c7a70, roughness: 0.6, normalMap: wd.normalMap })),
    lit: new THREE.MeshBasicMaterial({ map: latticeTex(3, 4), color: new THREE.Color(1.5, 1.3, 1.1) }), // HDR: blooms
    dark: new THREE.MeshStandardMaterial({ color: 0x1a110c, roughness: 0.35, metalness: 0.2 }),
  };
}
// Merge a bucket per material, bake the lantern light into it, and add meshes to `group`.
export function buildBucket(b, mats, group, extraLights = []) {
  const lights = b.lights.concat(extraLights);
  for (const k of ['plaster', 'wood', 'tiles', 'shutter', 'lit', 'dark']) {
    if (!b[k].length) continue;
    const geo = mergeGeometries(b[k]);
    if (k !== 'lit') bakeGlow(geo, lights);
    const mesh = new THREE.Mesh(geo, mats[k]);
    mesh.receiveShadow = k !== 'lit';
    mesh.castShadow = k === 'plaster' || k === 'tiles';
    group.add(mesh);
    if (k === 'tiles') group.add(Object.assign(new THREE.Mesh(geo, mats.soffit), { receiveShadow: true }));
  }
}
// Plaster parts carry a per-house tint as vertex colour.
export function tint(geos, c) {
  for (const g of geos) {
    const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  }
}
const TINTS = [[1, 1, 1], [1, 0.95, 0.85], [1.02, 0.9, 0.72], [0.8, 0.86, 0.8], [1, 0.97, 0.93]].map((c) => new THREE.Color(...c));

export function createRiver(renderer, mats) {
  const group = new THREE.Group();
  const rand = rng(7);

  // ---------- water: planar reflection, ripple normals, fresnel ----------
  const size = new THREE.Vector2();
  renderer.getDrawingBufferSize(size);
  const water = new Reflector(new THREE.PlaneGeometry(HALF * 2 + 1, Z1 - Z0 + 4), {
    clipBias: 0.003,
    textureWidth: Math.max(512, size.x * 0.5), textureHeight: Math.max(512, size.y * 0.5),
    color: 0x07060c,
    shader: {
      name: 'RippleReflector',
      uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, time: { value: 0 } },
      vertexShader: /* glsl */`
        uniform mat4 textureMatrix;
        varying vec4 vUv;
        varying vec3 vWorld;
        void main() {
          vUv = textureMatrix * vec4(position, 1.0);
          vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 color;
        uniform sampler2D tDiffuse;
        uniform float time;
        varying vec4 vUv;
        varying vec3 vWorld;
        // slope of a sum of small travelling waves (analytic gradient)
        vec2 wave(vec2 p, vec2 d, float f, float s, float a) { return d * f * a * cos(dot(p, d) * f + time * s); }
        void main() {
          vec2 p = vWorld.xz;
          vec2 g = wave(p, normalize(vec2(0.3, 1.0)), 2.3, 0.9, 0.009)
                 + wave(p, normalize(vec2(-0.7, 0.8)), 3.7, 1.3, 0.005)
                 + wave(p, normalize(vec2(0.9, 0.35)), 6.1, 1.8, 0.0025)
                 + wave(p, normalize(vec2(-0.2, -1.0)), 11.0, 2.5, 0.0012)
                 + wave(p, normalize(vec2(0.6, -0.5)), 17.0, 3.1, 0.0007);
          vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
          vec3 V = normalize(cameraPosition - vWorld);
          float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
          vec4 uv = vUv;
          uv.x += N.x * 0.12 * uv.w;
          uv.y += N.z * 0.7 * uv.w;   // reflections smear along the view, like real water
          vec3 refl = texture2DProj(tDiffuse, uv).rgb;
          vec3 col = mix(color, refl, 0.55 + 0.45 * fres);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    },
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, WATER_Y, (Z0 + Z1) / 2);
  group.add(water);

  // ---------- banks: stone embankment, paved quay, a continuous row of shophouses ----------
  const len = Z1 - Z0 + 6, midZ = (Z0 + Z1) / 2;
  const st = repeatMaps(stoneWall(), [len / 2, 1]);
  const pv = repeatMaps(terracotta(4), [1, len / 1.6]);
  const quayWall = new THREE.MeshStandardMaterial({ ...st, roughness: 0.85 });
  const quayTop = new THREE.MeshStandardMaterial({ ...pv, color: 0x9a8a80 });
  const b = bucket();
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.8), quayWall);
    wall.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    wall.position.set(side * HALF, WATER_Y + 0.35, midZ);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(FRONT - HALF + 0.2, len), quayTop);
    top.rotation.x = -Math.PI / 2;
    top.position.set(side * (HALF + FRONT) / 2, WATER_Y + 0.75, midZ);
    wall.receiveShadow = top.receiveShadow = true;
    group.add(wall, top);
    const m = new THREE.Matrix4(), r = new THREE.Matrix4().makeRotationY(side < 0 ? Math.PI / 2 : -Math.PI / 2);
    for (let z = Z0 + 1.6; z < Z1; ) {
      const w = 2.2 + rand() * 1.3, before = b.plaster.length;
      m.makeTranslation(side * FRONT, WATER_Y + 0.75, z + w / 2).multiply(r);
      shophouse(b, m, { w, storeys: rand() < 0.78 ? 2 : 1, rand, balcony: rand() < 0.3 });
      tint(b.plaster.slice(before), TINTS[Math.floor(rand() * TINTS.length)]);
      z += w + 0.02;
    }
  }

  // ---------- lanterns: under the eaves, and strings of silk lanterns across the river ----------
  const items = b.lanterns, lines = [];
  for (let z = 13; z < Z1 - 4; z += 8.5 + rand() * 2) {
    const a = new THREE.Vector3(-FRONT + 0.2, 3.35, z + (rand() - 0.5)), c = new THREE.Vector3(FRONT - 0.2, 3.35, z + (rand() - 0.5));
    const sag = 0.55 + rand() * 0.3, pt = (k) => new THREE.Vector3().lerpVectors(a, c, k).setY(a.y - Math.sin(k * Math.PI) * sag);
    for (let i = 0; i < 24; i++) lines.push(pt(i / 24), pt((i + 1) / 24));
    const n = 7 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const p = pt((i + 0.7) / (n + 0.4)), col = lanternColor(rand());
      items.push({ p, c: col, s: 0.42 + rand() * 0.14, drop: 0.05 + rand() * 0.1 });
      b.lights.push({ p: p.clone().setY(p.y - 0.3), c: col.clone().lerp(new THREE.Color(0xffa060), 0.4), r: 3.5, i: 0.9 });
    }
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines), new THREE.LineBasicMaterial({ color: 0x1a120c })));

  // ---------- boats moored along the quays, bobbing ----------
  const hullTex = (() => {
    const c = Object.assign(document.createElement('canvas'), { width: 512, height: 128 }), x = c.getContext('2d');
    x.fillStyle = '#3a2418'; x.fillRect(0, 0, 512, 128);
    for (const [v0, col] of [[0, '#8a1c14'], [14, '#1f4f7a'], [114, '#1f4f7a'], [118, '#8a1c14']]) { x.fillStyle = col; x.fillRect(0, v0, 512, 10); }
    for (const v of [34, 94]) { // painted eyes near the bow ward off river spirits
      x.fillStyle = '#f2ead8'; x.beginPath(); x.ellipse(452, v, 18, 11, 0, 0, 7); x.fill();
      x.fillStyle = '#111'; x.beginPath(); x.arc(456, v, 7, 0, 7); x.fill();
      x.strokeStyle = '#8a1c14'; x.lineWidth = 3; x.beginPath(); x.ellipse(452, v, 20, 13, 0, 0, 7); x.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const hullMat = new THREE.MeshStandardMaterial({ map: hullTex, roughness: 0.6, side: THREE.DoubleSide });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.8 });
  const mui = new THREE.MeshStandardMaterial({ color: 0x6b5030, roughness: 0.95, side: THREE.DoubleSide });
  const boats = [];
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1, g = new THREE.Group();
    const hull = new THREE.Mesh(boatHull(), hullMat);
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.1).rotateX(-Math.PI / 2).translate(0, -0.08, 0), deckMat);
    g.add(hull, deck);
    if (rand() < 0.6) { // bamboo canopy (mui thuyền)
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.8, 12, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), mui);
      roof.position.set(0, 0.02, -0.15); roof.castShadow = true;
      g.add(roof);
    }
    const p = new THREE.Vector3(side * (HALF - 0.55), WATER_Y + 0.14, 16 + i * 8.5 + rand() * 3);
    g.position.copy(p); g.rotation.y = (rand() - 0.5) * 0.25 + (rand() < 0.5 ? Math.PI : 0);
    hull.castShadow = true;
    group.add(g);
    const lp = p.clone().add(new THREE.Vector3(0, 0.7, 0.9 * (Math.cos(g.rotation.y) > 0 ? -1 : 1)));
    items.push({ p: lp, c: lanternColor(rand() * 0.3), s: 0.3, drop: 0.02 });
    b.lights.push({ p: lp, c: new THREE.Color(0xff8040), r: 2.5, i: 0.8 });
    boats.push({ g, y: p.y, ph: rand() * 6 });
  }
  const lanterns = createLanternField(items);
  group.add(lanterns);
  buildBucket(b, mats, group);

  // ---------- hoa đăng: paper lotus lanterns with a candle inside ----------
  const petal = (len, wid, tilt, cup) => {
    const g = new THREE.PlaneGeometry(wid, len, 3, 5);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = Math.max(0, p.getY(i) + len / 2); // base at y = 0 (clamp float error: negative ** 1.6 is NaN)
      const taper = 1 - (y / len) ** 1.6 * 0.85; // pointed tip
      p.setXYZ(i, x * taper, y, -(x * x) * cup - y * y * 0.6);
    }
    g.rotateX(tilt); // lean the tip outward (+z) from the upright
    return g;
  };
  const lotusParts = [];
  for (let i = 0; i < 8; i++) lotusParts.push(petal(0.19, 0.11, 1.0, 9).translate(0, 0, 0.05).rotateY((i / 8) * Math.PI * 2));
  for (let i = 0; i < 6; i++) lotusParts.push(petal(0.15, 0.09, 0.45, 12).translate(0, 0.01, 0.03).rotateY((i / 6) * Math.PI * 2 + 0.3));
  lotusParts.push(new THREE.CylinderGeometry(0.12, 0.11, 0.025, 16).translate(0, -0.01, 0)); // paper base float
  const lotusGeo = mergeGeometries(lotusParts.map((g) => g.toNonIndexed()));
  lotusGeo.computeVertexNormals();
  const N_LOTUS = 46;
  const lotus = new THREE.InstancedMesh(lotusGeo, new THREE.MeshStandardMaterial({
    color: 0xffd6e0, emissive: 0xff7a4a, emissiveIntensity: 0.7, roughness: 0.8, side: THREE.DoubleSide,
  }), N_LOTUS);
  lotus.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N_LOTUS * 3), 3);
  const tints = [0xffc2d1, 0xfff0d8, 0xffb08a, 0xf7d36b, 0xff8fa8];
  const lotusState = [];
  const flamePts = new Float32Array(N_LOTUS * 3);
  for (let i = 0; i < N_LOTUS; i++) {
    lotus.setColorAt(i, new THREE.Color(tints[i % tints.length]));
    lotusState.push({ x: (rand() - 0.5) * (HALF * 2 - 1.8), z: Z0 + 3 + rand() * (Z1 - Z0 - 3), rot: rand() * 6, spd: 0.12 + rand() * 0.15, ph: rand() * 6, s: 0.8 + rand() * 0.5 });
  }
  group.add(lotus);
  const flameGeo = new THREE.BufferGeometry();
  flameGeo.setAttribute('position', new THREE.BufferAttribute(flamePts, 3));
  const flames = new THREE.Points(flameGeo, new THREE.PointsMaterial({ map: glowTex, size: 0.7, color: new THREE.Color(1.6, 1.1, 0.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  flames.frustumCulled = false;
  group.add(flames);

  // ---------- camera path: low over the water, rising over the steps to face the tree ----------
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.45, 64), new THREE.Vector3(0.9, 0.5, 48), new THREE.Vector3(-0.7, 0.6, 32),
    new THREE.Vector3(0.2, 0.8, 19), new THREE.Vector3(0, 1.4, 11.5), new THREE.Vector3(0, 1.85, 7.8), new THREE.Vector3(0, 2.0, 5.75),
  ], false, 'centripetal');
  const FOCUS = new THREE.Vector3(0, 2.05, 0);
  const tmp = new THREE.Vector3();

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
  return {
    group, path, water,
    cameraAt(u, cam) {
      cam.position.copy(path.getPointAt(u));
      const ahead = path.getPointAt(Math.min(u + 0.05, 1));
      ahead.y -= 0.15;
      const k = THREE.MathUtils.smoothstep(u, 0.62, 0.97);
      cam.lookAt(tmp.copy(ahead).lerp(FOCUS, k));
    },
    tick(t, dt, ambient) {
      water.material.uniforms.time.value = t;
      lanterns.userData.tick(t * ambient);
      for (const bt of boats) { bt.g.position.y = bt.y + Math.sin(t * 1.1 + bt.ph) * 0.02; bt.g.rotation.z = Math.sin(t * 0.9 + bt.ph) * 0.03 * ambient; }
      lotusState.forEach((s, i) => {
        s.z -= s.spd * dt * ambient; // drift toward the courtyard steps
        if (s.z < Z0 + 1.5) { s.z = Z1 - 2; s.x = (rand() - 0.5) * (HALF * 2 - 1.8); }
        s.rot += dt * 0.1 * ambient;
        const y = WATER_Y + 0.02 + Math.sin(t * 1.4 + s.ph) * 0.012;
        pos.set(s.x + Math.sin(t * 0.3 + s.ph) * 0.15, y, s.z);
        q.setFromEuler(e.set(Math.sin(t + s.ph) * 0.04, s.rot, Math.cos(t * 0.8 + s.ph) * 0.04));
        lotus.setMatrixAt(i, m.compose(pos, q, scl.setScalar(s.s)));
        flamePts[i * 3] = pos.x; flamePts[i * 3 + 1] = y + 0.1 * s.s; flamePts[i * 3 + 2] = pos.z;
      });
      lotus.instanceMatrix.needsUpdate = true;
      flameGeo.attributes.position.needsUpdate = true;
    },
  };
}
