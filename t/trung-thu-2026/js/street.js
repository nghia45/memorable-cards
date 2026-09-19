// Shared build helpers for the alley and the courtyard: seeded random, merged per-material street meshes with
// baked lantern light, per-house plaster tint, and tapered tubes (banyan trunk, roots, branches).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { latticeTex } from './print.js';
import { plaster, roofTiles, wood, bakeGlow, withGlow } from './tex.js';

export function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

export function streetMaterials() {
  const tiles = roofTiles(), wd = wood(), pl = plaster();
  return {
    plaster: withGlow(new THREE.MeshStandardMaterial({ ...pl, roughness: 0.93, vertexColors: true })),
    wood: withGlow(new THREE.MeshStandardMaterial({ ...wd, roughness: 0.55 })),
    tiles: withGlow(new THREE.MeshStandardMaterial({ ...tiles, roughness: 0.8 })),
    soffit: withGlow(new THREE.MeshStandardMaterial({ ...wd, roughness: 0.7, side: THREE.BackSide })),
    shutter: withGlow(new THREE.MeshStandardMaterial({ color: 0x2c7a70, roughness: 0.6, normalMap: wd.normalMap })),
    lit: new THREE.MeshBasicMaterial({ map: latticeTex(3, 4), color: new THREE.Color(1.5, 1.3, 1.1) }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1a110c, roughness: 0.35, metalness: 0.2 }),
  };
}

// Merge a bucket per material, bake the lantern light into it, add the meshes to `group`.
export function buildBucket(b, mats, group, extraLights = []) {
  const lights = b.lights.concat(extraLights);
  for (const k of ['plaster', 'wood', 'tiles', 'shutter', 'lit', 'dark']) {
    for (const list of slices(b[k])) {
      const geo = mergeGeometries(list);
      if (k !== 'lit') bakeGlow(geo, lights);
      const mesh = new THREE.Mesh(geo, mats[k]);
      mesh.receiveShadow = k !== 'lit';
      mesh.castShadow = k === 'plaster' || k === 'tiles';
      group.add(mesh);
      if (k === 'tiles') group.add(Object.assign(new THREE.Mesh(geo, mats.soffit), { receiveShadow: true }));
    }
  }
}

// Split geometries into 12 m slices along z: one merged mesh per slice lets the camera and the
// moon's shadow map skip the far end of the street instead of drawing all of it every frame.
export function slices(geos, size = 12) {
  const out = new Map(), c = new THREE.Vector3();
  for (const g of geos) {
    if (!g.boundingBox) g.computeBoundingBox();
    const k = Math.floor(g.boundingBox.getCenter(c).z / size);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(g);
  }
  return out.values();
}

export function tint(geos, c) {
  for (const g of geos) {
    const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  }
}
export const TINTS = [[1, 1, 1], [1, 0.95, 0.85], [1.02, 0.9, 0.72], [0.8, 0.86, 0.8], [1, 0.97, 0.93], [0.86, 0.9, 1]].map((c) => new THREE.Color(...c));

// Tube along a curve whose radius tapers from r0 to r1.
export function taperTube(curve, r0, r1, segs = 10, radial = 7) {
  const frames = curve.computeFrenetFrames(segs, false), len = curve.getLength();
  const pos = [], nor = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, p = curve.getPointAt(t), r = THREE.MathUtils.lerp(r0, r1, t);
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const n = new THREE.Vector3(c * N.x + s * B.x, c * N.y + s * B.y, c * N.z + s * B.z);
      pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
      nor.push(n.x, n.y, n.z);
      uv.push((j / radial) * Math.max(1, Math.round(r0 * 20)), t * len * 3);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
