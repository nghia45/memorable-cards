// Shared atmosphere: the night sky with a big full moon (Chị Hằng and Chú Cuội can fade in on its face),
// with a sky whose dusk / space / bright uniforms each act sets.
import * as THREE from 'three';
import { fbm } from './tex.js';

export const MOON_DIR = new THREE.Vector3(0.2, 0.44, -1).normalize(); // over the house roof, clear of the banyan

export function createSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { time: { value: 0 }, moonDir: { value: MOON_DIR }, bright: { value: 1 }, dusk: { value: 0 }, space: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position.z = gl_Position.w;
      }`,
    fragmentShader: /* glsl */`
      uniform float time, bright, dusk, space; uniform vec3 moonDir;
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
        // mid-autumn night: deep indigo overhead, a moonlit blue around the moon, warm street glow at the horizon
        vec3 zen = vec3(0.006, 0.012, 0.04), mid = vec3(0.03, 0.045, 0.1), hor = vec3(0.14, 0.07, 0.08);
        // blue hour: cobalt overhead, a lighter band, the city's warm glow low down
        zen = mix(zen, vec3(0.02, 0.05, 0.17), dusk); mid = mix(mid, vec3(0.06, 0.11, 0.28), dusk); hor = mix(hor, vec3(0.55, 0.3, 0.3), dusk);
        // space (on the moon): black with a faint blue haze low down
        zen = mix(zen, vec3(0.002, 0.003, 0.01), space); mid = mix(mid, vec3(0.004, 0.006, 0.02), space); hor = mix(hor, vec3(0.02, 0.03, 0.07), space);
        vec3 col = mix(hor, mid, smoothstep(0.0, 0.2, h));
        col = mix(col, zen, smoothstep(0.2, 0.75, h));
        float md = max(dot(d, moonDir), 0.0);
        col += vec3(0.35, 0.42, 0.62) * (pow(md, 30.0) * 0.45 + pow(md, 6.0) * 0.12) * bright;
        vec3 cell = floor(d * 240.0);
        float st = step(0.9962 - space * 0.004, hash(cell)) * smoothstep(0.05 - space * 0.3, 0.35 - space * 0.3, h) * (1.0 - pow(md, 12.0)) * (1.0 - dusk * 0.7);
        st *= 0.55 + 0.45 * sin(time * 2.0 + hash(cell + 1.0) * 40.0);
        // kept off zero: at d.y = -0.12 (in view on the moon) it gave NaN, which the bloom spread into black blocks
        vec2 cp = d.xz / max(d.y + 0.12, 0.02) * 0.8 + vec2(time * 0.008, time * 0.003);
        float c = smoothstep(0.5, 0.8, fbm(cp * 1.2)) * smoothstep(0.02, 0.15, h) * (1.0 - space);
        float thin = fbm(cp * 4.0 + 3.0);
        vec3 cloud = vec3(0.05, 0.055, 0.09) + vec3(0.55, 0.55, 0.62) * pow(md, 10.0) * bright + hor * 0.5 * (1.0 - smoothstep(0.0, 0.3, h));
        col = mix(col + vec3(1.0, 0.95, 0.85) * st, cloud, c * (0.5 + 0.4 * thin));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -2;
  return { mesh, tick(t) { mat.uniforms.time.value = t; }, set bright(v) { mat.uniforms.bright.value = v; }, set dusk(v) { mat.uniforms.dusk.value = v; }, set space(v) { mat.uniforms.space.value = v; } };
}

// ---------- the moon: a disc that rides with the camera (at infinity), plus a layer of figures ----------
function moonCanvas(figures) {
  const S = 1024, c = Object.assign(document.createElement('canvas'), { width: S, height: S }), x = c.getContext('2d');
  const R = S * 0.46, cx = S / 2, cy = S / 2;
  x.save(); x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.clip();
  if (!figures) {
    const g = x.createRadialGradient(cx - R * 0.2, cy - R * 0.2, R * 0.1, cx, cy, R);
    g.addColorStop(0, '#fffaf0'); g.addColorStop(0.7, '#f6ecd4'); g.addColorStop(1, '#d8c7a4');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    fbm(x, S, S, { cells: 3, octaves: 5, op: 'multiply', alpha: 0.28 });
    x.fillStyle = 'rgba(150,140,125,.13)'; // maria, faint
    for (const [mx, my, r] of [[0.38, 0.4, 0.2], [0.6, 0.34, 0.14], [0.55, 0.6, 0.18], [0.35, 0.66, 0.1], [0.7, 0.55, 0.08]]) {
      x.beginPath(); x.ellipse(S * mx, S * my, S * r, S * r * 0.8, mx * 3, 0, 7); x.fill();
    }
    for (let i = 0; i < 40; i++) { // small craters
      const px = cx + (Math.random() - 0.5) * R * 1.8, py = cy + (Math.random() - 0.5) * R * 1.8, r = 4 + Math.random() * 16;
      x.strokeStyle = 'rgba(120,110,95,.25)'; x.lineWidth = 2; x.beginPath(); x.arc(px, py, r, 0, 7); x.stroke();
    }
  } else {
    // Folk reading of the moon's shadows: Chú Cuội under his banyan (lower left), Chị Hằng with trailing sleeves
    // and the jade rabbit (right). Soft, warm and faint, like the maria themselves.
    x.filter = 'blur(3px)';
    x.fillStyle = 'rgba(165,130,88,.7)'; x.strokeStyle = 'rgba(165,130,88,.7)'; x.lineCap = 'round';
    x.lineWidth = 16; x.beginPath(); x.moveTo(300, 800); x.bezierCurveTo(305, 700, 290, 640, 310, 560); x.stroke();
    x.lineWidth = 7; for (const [a, b2] of [[250, 560], [370, 548], [220, 600]]) { x.beginPath(); x.moveTo(305, 600); x.quadraticCurveTo((305 + a) / 2, 585, a, b2); x.stroke(); }
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI, r = 95 + (i % 3) * 18; x.beginPath(); x.arc(305 + Math.cos(a) * r * 1.25, 545 - Math.sin(a) * r * 0.75, 34 + (i % 4) * 6, 0, 7); x.fill(); }
    x.lineWidth = 3; for (let i = 0; i < 10; i++) { x.beginPath(); x.moveTo(210 + i * 22, 560); x.lineTo(212 + i * 22, 640 + (i % 3) * 25); x.stroke(); }
    x.beginPath(); x.arc(380, 718, 18, 0, 7); x.fill(); // Cuội, sitting with his knees up
    x.beginPath(); x.moveTo(366, 736); x.quadraticCurveTo(356, 772, 372, 800); x.lineTo(430, 800); x.quadraticCurveTo(436, 770, 414, 758); x.lineTo(396, 736); x.fill();
    x.beginPath(); x.arc(668, 360, 17, 0, 7); x.fill(); // Chị Hằng
    x.beginPath(); x.moveTo(658, 376); x.quadraticCurveTo(640, 460, 660, 540); x.quadraticCurveTo(695, 556, 716, 536); x.quadraticCurveTo(696, 452, 680, 376); x.fill();
    x.lineWidth = 6; x.beginPath(); x.moveTo(654, 402); x.bezierCurveTo(600, 430, 596, 500, 630, 570); x.stroke();
    x.beginPath(); x.moveTo(684, 402); x.bezierCurveTo(750, 396, 780, 460, 752, 540); x.stroke();
    x.beginPath(); x.ellipse(732, 610, 26, 18, 0, 0, 7); x.fill(); x.beginPath(); x.arc(756, 594, 12, 0, 7); x.fill(); // rabbit
    x.beginPath(); x.ellipse(758, 570, 4, 14, 0.2, 0, 7); x.fill(); x.beginPath(); x.ellipse(767, 572, 4, 13, 0.5, 0, 7); x.fill();
    x.filter = 'none';
  }
  x.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const moonGlowTex = (() => {
  const c = Object.assign(document.createElement('canvas'), { width: 256, height: 256 }), x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 30, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,245,215,.8)'); g.addColorStop(0.3, 'rgba(210,215,255,.2)'); g.addColorStop(1, 'rgba(160,170,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
})();

export function createMoon() {
  const g = new THREE.Group();
  const DIST = 250, R = DIST * Math.tan(THREE.MathUtils.degToRad(4.2));
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(R * 2.17, R * 2.17), new THREE.MeshBasicMaterial({ map: moonCanvas(false), color: new THREE.Color(2.5, 2.35, 2.05), transparent: true, fog: false, depthWrite: false }));
  const figs = new THREE.Mesh(disc.geometry, new THREE.MeshBasicMaterial({ map: moonCanvas(true), transparent: true, opacity: 0, fog: false, depthWrite: false }));
  figs.position.z = 0.1;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(R * 9, R * 9), new THREE.MeshBasicMaterial({ map: moonGlowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.55 }));
  halo.position.z = -0.1;
  g.add(halo, disc, figs);
  g.renderOrder = -1;
  g.traverse((o) => (o.renderOrder = -1));
  return {
    group: g, DIST, disc,
    set figures(v) { figs.material.opacity = v; },
    set glow(v) { halo.material.opacity = v; },
    tint(r, g2, b) { disc.material.color.setRGB(r, g2, b); },
    follow(cam) { g.position.copy(cam.position).addScaledVector(MOON_DIR, DIST); g.lookAt(cam.position); },
  };
}
