// Cây đa: the banyan of the village yard, and (silvered) Cuội's tree on the moon. Fused stems twisting up,
// buttress roots, spreading limbs, curtains of aerial roots, and a dense crown of leaf-shaped instances.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { taperTube } from './street.js';
import { bark } from './tex.js';

// opts: rand, lean (Vector3 the crown leans toward), leaves per tip, hue/sat/light for the leaves, bark colour
export function makeBanyan({ rand, lean = new THREE.Vector3(), per = 380, hue = 0.26, sat = 0.45, light = 0.12, barkColor = 0x9a9080, glow = 0, roots = true }) {
  const group = new THREE.Group();
  const barkGeos = [], tips = [], hangs = [];
  const limb = (start, dir, len, r0, depth) => {
    const pts = [start.clone()], d = dir.clone().normalize();
    for (let i = 1; i <= 3; i++) {
      d.x += (rand() - 0.5) * 0.4; d.z += (rand() - 0.5) * 0.4; d.y += (rand() - 0.5) * 0.2; d.normalize();
      pts.push(pts[i - 1].clone().addScaledVector(d, len / 3));
    }
    const curve = new THREE.CatmullRomCurve3(pts), r1 = r0 * 0.6;
    barkGeos.push(taperTube(curve, r0, r1, 10, depth < 1 ? 12 : 7));
    for (let i = 0; i < (depth < 2 ? 3 : 1); i++) if (rand() < 0.8) hangs.push(curve.getPointAt(0.3 + rand() * 0.7));
    if (depth >= 2) { tips.push(pts[3]); return; }
    const n = depth === 0 ? 3 : 2 + (rand() < 0.5 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2;
      limb(pts[3], d.clone().multiplyScalar(0.6).add(new THREE.Vector3(Math.cos(a) * 0.8, 0.35 + rand() * 0.3, Math.sin(a) * 0.8)), len * 0.72, r1, depth + 1);
    }
  };
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2, base = new THREE.Vector3(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32);
    const top = new THREE.Vector3(Math.cos(a + 1.2) * 0.5, 3.2 + rand() * 0.6, Math.sin(a + 1.2) * 0.5);
    const curve = new THREE.CatmullRomCurve3([base, base.clone().lerp(top, 0.35).add(new THREE.Vector3(Math.cos(a + 0.6) * 0.15, 0, Math.sin(a + 0.6) * 0.15)), top]);
    barkGeos.push(taperTube(curve, 0.32, 0.2, 14, 12));
    const out = new THREE.Vector3(Math.cos(a + 0.3), 0, Math.sin(a + 0.3));
    barkGeos.push(taperTube(new THREE.CatmullRomCurve3([base.clone().setY(0.7), base.clone().addScaledVector(out, 0.5).setY(0.2), base.clone().addScaledVector(out, 1.3).setY(0.02)]), 0.2, 0.05, 8, 7));
    limb(top, new THREE.Vector3(Math.cos(a) * 0.9, 0.6, Math.sin(a) * 0.9).add(lean.clone().multiplyScalar(0.7)), 2.6, 0.2, 0);
  }
  const bk = bark();
  const barkMat = new THREE.MeshStandardMaterial({ ...bk, color: barkColor, roughness: 0.95, normalScale: new THREE.Vector2(1.5, 1.5), emissive: barkColor, emissiveIntensity: glow * 0.5 });
  const barkMesh = new THREE.Mesh(mergeGeometries(barkGeos), barkMat);
  barkMesh.castShadow = barkMesh.receiveShadow = true;
  group.add(barkMesh);
  if (roots) {
  const rootGeos = hangs.map((p) => { const len = Math.min(p.y - 0.05, 1.2 + rand() * 3); return new THREE.CylinderGeometry(0.008, 0.012, len, 4, 1, true).translate(p.x + (rand() - 0.5) * 0.1, p.y - len / 2, p.z); });
  group.add(new THREE.Mesh(mergeGeometries(rootGeos), new THREE.MeshStandardMaterial({ color: barkColor, roughness: 1 })));
  }
  const leaf = new THREE.Shape();
  leaf.moveTo(0, 0); leaf.quadraticCurveTo(0.05, 0.05, 0.13, 0.012); leaf.lineTo(0.16, 0); leaf.lineTo(0.13, -0.012); leaf.quadraticCurveTo(0.05, -0.05, 0, 0);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, side: THREE.DoubleSide, emissive: glow ? 0xffffff : 0x000000, emissiveIntensity: glow });
  if (glow) leafMat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\ntotalEmissiveRadiance *= vColor;\n#endif'); };
  const NL = tips.length * per;
  const leaves = new THREE.InstancedMesh(new THREE.ShapeGeometry(leaf, 3), leafMat, NL);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3(), c = new THREE.Color();
  let li = 0;
  for (const t of tips) for (let k = 0; k < per; k++) {
    const u = rand(), a = rand() * Math.PI * 2, r = Math.cbrt(u) * (0.75 + rand() * 0.35);
    const p = t.clone().add(new THREE.Vector3(Math.cos(a) * r * 1.15, (rand() - 0.4) * r * 0.7, Math.sin(a) * r * 1.15));
    leaves.setMatrixAt(li, m4.compose(p, q.setFromEuler(e.set((rand() - 0.5) * 1.6, rand() * 6.28, (rand() - 0.5) * 1.6)), sv.setScalar(0.8 + rand() * 0.5)));
    leaves.setColorAt(li++, c.setHSL(hue + rand() * 0.07, sat + rand() * 0.2, light + Math.cbrt(u) * 0.1 + rand() * 0.05));
  }
  leaves.castShadow = true; leaves.receiveShadow = true;
  group.add(leaves);
  group.userData.tips = tips;
  return group;
}
