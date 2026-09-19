// Canvas "printing" helpers: every printed surface gets a color map plus a foil mask
// (G = roughness, B = metalness) so gold foil reads as metal and paper stays satin.
import * as THREE from 'three';

// `ss` supersamples: draw code keeps its logical w×h, the canvas is ss× larger so print text stays crisp up close.
export function paint(w, h, draw, ss = 2) {
  const out = {};
  for (const mode of ['color', 'mask']) {
    const c = document.createElement('canvas');
    c.width = w * ss; c.height = h * ss;
    const x = c.getContext('2d');
    x.scale(ss, ss);
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#fbe6a2'); g.addColorStop(0.35, '#c8922c');
    g.addColorStop(0.62, '#f5d77f'); g.addColorStop(1, '#a8741f');
    const mask = mode === 'mask';
    draw(x, w, h, {
      foil: mask ? 'rgb(0,70,255)' : g,
      col: (c) => (mask ? 'rgb(0,150,0)' : c), // paper + ink are non-metal, satin
    });
    out[mode] = c;
  }
  const map = new THREE.CanvasTexture(out.color);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const mr = new THREE.CanvasTexture(out.mask);
  mr.anisotropy = 8;
  return { map, mr };
}

export const printMat = ({ map, mr }, extra = {}) => new THREE.MeshPhysicalMaterial({
  map, metalnessMap: mr, roughnessMap: mr, metalness: 1, roughness: 1,
  clearcoat: 0.6, clearcoatRoughness: 0.28, fog: false, ...extra,
});

// Plain canvas texture (no foil), for photos, captions, paper prints.
export function canvasTex(w, h, draw, ss = 1) {
  const c = document.createElement('canvas');
  c.width = w * ss; c.height = h * ss;
  const x = c.getContext('2d');
  x.scale(ss, ss);
  draw(x, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function redPaper(x, w, h, P) {
  const g = x.createLinearGradient(0, 0, w * 0.3, h);
  g.addColorStop(0, '#d8142c'); g.addColorStop(1, '#a00c1f');
  x.fillStyle = P.col(g);
  x.fillRect(0, 0, w, h);
}

export function cloudPattern(x, w, h, P, alpha = 0.16) {
  x.save();
  x.globalAlpha = alpha;
  x.strokeStyle = P.foil;
  x.lineWidth = 2;
  for (let yy = 0; yy < h + 40; yy += 46) {
    for (let xx = (yy / 46) % 2 ? 23 : 0; xx < w + 40; xx += 46) {
      x.beginPath(); x.arc(xx, yy, 14, Math.PI, 0); x.arc(xx + 8, yy, 6, Math.PI, 0); x.stroke();
    }
  }
  x.restore();
}

// Stylized goat head, front view: curled horns, leaf ears, tapering face, beard.
export function goat(x, cx, cy, r, P, bg) {
  x.save();
  x.translate(cx, cy); x.scale(r / 100, r / 100);
  x.fillStyle = P.foil; x.strokeStyle = P.foil; x.lineCap = 'round'; x.lineJoin = 'round';
  x.lineWidth = 12;
  for (const s of [-1, 1]) {
    x.beginPath(); x.moveTo(s * 14, -36);
    x.bezierCurveTo(s * 26, -84, s * 82, -80, s * 78, -36);
    x.bezierCurveTo(s * 75, -8, s * 48, -10, s * 52, -32);
    x.stroke();
    x.beginPath(); x.moveTo(s * 22, -18);
    x.quadraticCurveTo(s * 60, -26, s * 70, -6); x.quadraticCurveTo(s * 44, 2, s * 22, -4);
    x.fill();
  }
  x.beginPath(); x.moveTo(-27, -40);
  x.quadraticCurveTo(0, -54, 27, -40); x.quadraticCurveTo(32, 2, 14, 40);
  x.quadraticCurveTo(0, 52, -14, 40); x.quadraticCurveTo(-32, 2, -27, -40);
  x.fill();
  x.beginPath(); x.moveTo(-10, 42); x.quadraticCurveTo(-4, 76, 2, 88); x.quadraticCurveTo(6, 64, 10, 42); x.fill();
  x.fillStyle = bg;
  for (const s of [-1, 1]) {
    x.beginPath(); x.ellipse(s * 12, -10, 6, 3.2, s * 0.45, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(s * 5, 32, 2.6, 3.6, 0, 0, Math.PI * 2); x.fill();
  }
  x.restore();
}

export function medallion(x, cx, cy, r, P, bg) {
  x.strokeStyle = P.foil; x.fillStyle = P.foil;
  x.lineWidth = r * 0.05; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
  x.lineWidth = r * 0.015; x.beginPath(); x.arc(cx, cy, r * 0.86, 0, Math.PI * 2); x.stroke();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    x.beginPath(); x.arc(cx + Math.cos(a) * r * 0.93, cy + Math.sin(a) * r * 0.93, r * 0.022, 0, Math.PI * 2); x.fill();
  }
  goat(x, cx, cy + r * 0.06, r * 0.72, P, bg);
}

export function frame(x, w, h, P, inset, lw = 4) {
  x.strokeStyle = P.foil;
  x.lineWidth = lw; x.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  x.lineWidth = lw * 0.4; x.strokeRect(inset + 10, inset + 10, w - inset * 2 - 20, h - inset * 2 - 20);
}

export function centered(x, text, y, font, fill, spacing = 0) {
  x.font = font; x.fillStyle = fill; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.letterSpacing = spacing + 'px';
  x.fillText(text, x.canvas.width / 2 / x.getTransform().a, y); // logical centre when supersampled
  x.letterSpacing = '0px';
}

export function wrap(x, text, maxW) {
  const lines = []; let line = '';
  for (const word of String(text).split(/\s+/)) {
    const t = line ? line + ' ' + word : word;
    if (x.measureText(t).width > maxW && line) { lines.push(line); line = word; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export function rrShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// ShapeGeometry UVs are raw x/y; remap to 0..1 over the bounding box so canvas prints fit.
export function normUV(g) {
  g.computeBoundingBox();
  const b = g.boundingBox, p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    uv.setXY(i, (p.getX(i) - b.min.x) / (b.max.x - b.min.x), (p.getY(i) - b.min.y) / (b.max.y - b.min.y));
  }
  return g;
}

// Warm latticed paper window/door, lit from inside.
export function latticeTex(cols = 3, rows = 4) {
  return canvasTex(64 * cols / 3, 96 * rows / 4, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, h * 0.7);
    g.addColorStop(0, '#ffb45a'); g.addColorStop(1, '#c2561c');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#3a1a0e'; x.lineWidth = 3;
    for (let i = 1; i < cols; i++) { x.beginPath(); x.moveTo((w * i) / cols, 0); x.lineTo((w * i) / cols, h); x.stroke(); }
    for (let i = 1; i < rows; i++) { x.beginPath(); x.moveTo(0, (h * i) / rows); x.lineTo(w, (h * i) / rows); x.stroke(); }
    x.lineWidth = 8; x.strokeRect(0, 0, w, h);
  });
}

export const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,170,90,.9)'); g.addColorStop(0.35, 'rgba(255,90,40,.28)'); g.addColorStop(1, 'rgba(255,60,20,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

// Five rounded petals of the yellow apricot blossom (hoa mai), radius ~0.09.
export function blossomShape(r = 0.09) {
  const s = new THREE.Shape(), k = r / 0.09;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2, b = a + Math.PI / 5;
    if (!i) s.moveTo(0, 0);
    s.quadraticCurveTo(Math.cos(a - 0.5) * 0.09 * k, Math.sin(a - 0.5) * 0.09 * k, Math.cos(a) * 0.08 * k, Math.sin(a) * 0.08 * k);
    s.quadraticCurveTo(Math.cos(a + 0.5) * 0.09 * k, Math.sin(a + 0.5) * 0.09 * k, Math.cos(b) * 0.012 * k, Math.sin(b) * 0.012 * k);
  }
  return s;
}
