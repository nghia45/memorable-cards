// Festival lanterns as the Hàng Mã stalls sell them: đèn ông sao (bamboo star frame under cellophane),
// đèn cá chép (carp with ribbed body, fins and tail) and round paper lanterns. Every geometry carries a `shade`
// attribute: 0 = bamboo frame (brown, unlit), >0 = cellophane lit from inside (brighter near the candle).
// All of them draw with one instanced material, so a whole street of lanterns is a few draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTex } from './print.js';

export const lanternGlow = { value: 1 };   // global brightness (the scene dims it)
const time = { value: 0 };

const withShade = (g, shade) => {
  const n = g.toNonIndexed();
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
  const a = new Float32Array(n.attributes.position.count);
  a.fill(shade);
  n.setAttribute('shade', new THREE.BufferAttribute(a, 1));
  return n;
};
// A bamboo stick from a to b.
function stick(a, b, r = 0.0045) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const g = new THREE.CylinderGeometry(r, r, len, 4, 1).translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  return withShade(g.translate(a.x, a.y, a.z), 0);
}

// ---------- đèn ông sao: two pentagram frames pushed apart at the centre, cellophane over the ten facets ----------
export function starGeo({ R = 0.2, r = 0.082, depth = 0.075, tassels = true } = {}) {
  const tip = (i) => { const a = Math.PI / 2 + (i / 5) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0); };
  const rim = Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 2 + (i / 10) * Math.PI * 2, rr = i % 2 ? r : R; return new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, 0); });
  const parts = [];
  // facets: each rim edge to the bulged centre, both sides; shade falls off toward the rim (candle in the middle)
  const pos = [], sh = [];
  for (const s of [1, -1]) for (let i = 0; i < 10; i++) {
    const a = rim[i], b = rim[(i + 1) % 10], c = new THREE.Vector3(0, 0, s * depth);
    const tri = s > 0 ? [c, a, b] : [c, b, a];
    for (const v of tri) { pos.push(v.x, v.y, v.z); sh.push(v === c ? 1.35 : v.length() > R * 0.9 ? 0.55 : 0.95); }
  }
  const facets = new THREE.BufferGeometry();
  facets.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  facets.setAttribute('shade', new THREE.Float32BufferAttribute(sh, 1));
  facets.computeVertexNormals();
  parts.push(facets);
  // frame: the two pentagrams (each stick runs tip to tip across the face) and the rim where they're tied
  for (const s of [1, -1]) for (let i = 0; i < 5; i++) {
    const a = tip(i), b = tip((i + 2) % 5);
    const lift = (v) => v.clone().setZ(s * depth * (1 - v.length() / R) * 0.9);
    const mid1 = a.clone().lerp(b, 0.38), mid2 = a.clone().lerp(b, 0.62);
    parts.push(stick(lift(a), lift(mid1)), stick(lift(mid1), lift(mid2)), stick(lift(mid2), lift(b)));
  }
  for (let i = 0; i < 10; i++) parts.push(stick(rim[i], rim[(i + 1) % 10], 0.004));
  if (tassels) for (const i of [2, 3]) { // paper fringes from the two lower points
    const t = tip(i);
    for (let k = -1; k <= 1; k++) {
      const g = new THREE.PlaneGeometry(0.012, 0.11).translate(0, -0.055, 0).rotateZ(k * 0.12).translate(t.x + k * 0.008, t.y - 0.005, 0);
      parts.push(withShade(g, 0.8));
    }
  }
  const m = mergeGeometries(parts);
  m.computeBoundingSphere();
  return m;
}

// ---------- đèn cá chép: plump ribbed body, split tail, fins; head toward +z ----------
export function carpGeo() {
  const prof = Array.from({ length: 14 }, (_, i) => { const t = i / 13; return new THREE.Vector2(Math.sin(t * Math.PI) ** 0.65 * 0.11 * (1 - t * 0.3) + 0.002, (t - 0.5) * 0.44); });
  const body = withShade(new THREE.LatheGeometry(prof, 14).rotateX(Math.PI / 2), 1.1);
  const parts = [body];
  for (let i = 2; i <= 11; i += 3) { // ribs
    const p = prof[i];
    parts.push(withShade(new THREE.TorusGeometry(p.x + 0.002, 0.003, 3, 16).translate(0, 0, 0).rotateX(0).translate(0, 0, -p.y), 0));
  }
  const tail = new THREE.Shape(); tail.moveTo(0, 0); tail.quadraticCurveTo(0.08, 0.04, 0.16, 0.13); tail.quadraticCurveTo(0.1, 0.02, 0.17, -0.11); tail.quadraticCurveTo(0.07, -0.03, 0, 0);
  parts.push(withShade(new THREE.ShapeGeometry(tail, 6).rotateY(Math.PI / 2).translate(0, 0, -0.2), 0.8));
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.quadraticCurveTo(0.03, 0.1, 0.13, 0.07); fin.lineTo(0.11, 0); fin.closePath();
  parts.push(withShade(new THREE.ShapeGeometry(fin, 4).rotateY(Math.PI / 2).translate(0, 0.075, -0.03), 0.8));
  for (const s of [-1, 1]) {
    const pf = new THREE.Shape(); pf.moveTo(0, 0); pf.quadraticCurveTo(0.05, -0.02, 0.07, -0.06); pf.lineTo(0, -0.03); pf.closePath();
    parts.push(withShade(new THREE.ShapeGeometry(pf, 3).rotateY(s * 0.5).translate(s * 0.07, -0.04, 0.07), 0.7));
    parts.push(withShade(new THREE.SphereGeometry(0.012, 6, 4).translate(s * 0.05, 0.03, 0.17), 0)); // eyes
  }
  return mergeGeometries(parts);
}

// ---------- round paper lantern with ribs and dark caps ----------
export function ballGeo() {
  const body = withShade(new THREE.SphereGeometry(0.13, 16, 12).scale(1, 0.85, 1), 1.1);
  const parts = [body];
  for (let i = 0; i < 8; i++) parts.push(withShade(new THREE.TorusGeometry(0.131, 0.0025, 3, 20, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.85, 1).rotateY((i / 8) * Math.PI), 0));
  for (const y of [0.105, -0.105]) parts.push(withShade(new THREE.CylinderGeometry(0.05, 0.055, 0.02, 12).translate(0, y, 0), 0));
  parts.push(withShade(new THREE.CylinderGeometry(0.004, 0.012, 0.12, 5).translate(0, -0.17, 0), 0.6));
  return mergeGeometries(parts);
}

// One material for all lanterns: base colour and cellophane glow from the instance colour, frame from `shade`.
export const lanternMat = (() => {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, roughness: 0.35, side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => {
    s.uniforms.lanternGlow = lanternGlow; s.uniforms.lTime = time;
    s.vertexShader = 'attribute float shade;\nvarying float vShade;\nvarying float vFlick;\nuniform float lTime;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vShade = shade;
      #ifdef USE_INSTANCING
        float seed = instanceMatrix[3].x * 3.1 + instanceMatrix[3].z * 1.7;
      #else
        float seed = 0.0;
      #endif
      vFlick = 0.92 + 0.05 * sin(lTime * 11.0 + seed) + 0.03 * sin(lTime * 23.0 + seed * 2.0);`);
    s.fragmentShader = 'uniform float lanternGlow;\nvarying float vShade;\nvarying float vFlick;\n' + s.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 lcol = vec3(1.0);
        #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
          lcol = vColor.rgb;
        #endif
        diffuseColor.rgb = mix(vec3(0.36, 0.25, 0.13), lcol * 0.5, step(0.01, vShade));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance = lcol * vShade * vFlick * lanternGlow * 1.25;`);
  };
  m.customProgramCacheKey = () => 'lantern2';
  return m;
})();
export const tickLanterns = (t) => (time.value = t);

export const GEO = { star: starGeo(), carp: carpGeo(), ball: ballGeo() };
export const COLORS = { star: [0xff2418, 0xff2418, 0xff2418, 0xffb000, 0xff5a1a, 0x2fbf60, 0x3a8cff, 0xe0339a], carp: [0xff4a14, 0xff2a18, 0xffa010], ball: [0xff2a18, 0xffb21a, 0xff6a20, 0xe83a8a, 0x40b060] };
export const pickColor = (kind, r) => new THREE.Color(COLORS[kind][Math.floor(r * COLORS[kind].length)]);

// Many hanging lanterns of one kind, one draw call, with soft halos. items: [{ p, c, s, ry, drop }]
export function lanternField(kind, items, { halo = 0.8, haloOpacity = 0.3 } = {}) {
  const g = new THREE.Group(), n = items.length;
  const mesh = new THREE.InstancedMesh(GEO[kind], lanternMat, n);
  items.forEach((it, i) => mesh.setColorAt(i, it.c));
  const glow = new THREE.Points(new THREE.BufferGeometry().setFromPoints(items.map((it) => it.p.clone().setY(it.p.y - (it.drop ?? 0.12) - 0.05))),
    new THREE.PointsMaterial({ map: glowTex, size: halo, color: 0xffa860, transparent: true, opacity: haloOpacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  g.add(mesh, glow);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), off = new THREE.Vector3();
  const pose = (t) => {
    items.forEach((it, i) => {
      const sw = Math.sin(t * 0.9 + i * 1.7) * 0.06, tw = Math.sin(t * 0.5 + i) * 0.25;
      q.setFromEuler(e.set(Math.sin(t * 0.7 + i) * 0.04, (it.ry || 0) + tw, sw));
      off.set(0, -(it.drop ?? 0.12), 0).applyQuaternion(q);
      m.compose(p.copy(it.p).add(off), q, s.setScalar(it.s));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  pose(0);
  mesh.computeBoundingSphere();
  g.userData.tick = pose;
  g.userData.glow = glow.material;
  return g;
}

// A single lantern (e.g. carried on a stick): an InstancedMesh of one, so it shares the material.
export function singleLantern(kind, color) {
  const m = new THREE.InstancedMesh(GEO[kind], lanternMat, 1);
  m.setMatrixAt(0, new THREE.Matrix4());
  m.setColorAt(0, color);
  m.frustumCulled = false;
  return m;
}
