// Per-pixel surface detail for the landscape, from one small tileable noise texture (cheap: a few mipmapped lookups,
// no procedural noise in the shader). Channels: R coarse blobs, G medium, B fine, A vertical-ish streaks.
//   rock   – karst, Mắt Thần, the falls' cliffs: forest canopy on gentle slopes, streaked limestone on steep ones
//   canopy – tree crowns: leafy clumps and bumps
//   ground – terrain: breaks up flat colour, turns steep banks to rock
// Colours are linear. Bumps come from screen-space derivatives of a detail height and fade out with distance.
import * as THREE from 'three';
import { rng } from './noise.js';

function makeNoise(S = 256) {
  const R = rng(99), data = new Uint8Array(S * S * 4);
  const layer = (cells, cy = cells) => { // tileable value noise at a given cell count
    const g = Array.from({ length: cells * cy }, R);
    return (x, y) => {
      const fx = (x / S) * cells, fy = (y / S) * cy, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty), at = (i, j) => g[((j % cy) + cy) % cy * cells + ((i % cells) + cells) % cells];
      return (at(x0, y0) * (1 - u) + at(x0 + 1, y0) * u) * (1 - v) + (at(x0, y0 + 1) * (1 - u) + at(x0 + 1, y0 + 1) * u) * v;
    };
  };
  const L = [4, 8, 16, 32, 64].map((c) => layer(c)), st = [layer(48, 3), layer(96, 6)];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const o = (y * S + x) * 4;
    data[o] = (L[0](x, y) * 0.55 + L[1](x, y) * 0.3 + L[2](x, y) * 0.15) * 255;
    data[o + 1] = (L[1](x, y) * 0.5 + L[2](x, y) * 0.3 + L[3](x, y) * 0.2) * 255;
    data[o + 2] = (L[3](x, y) * 0.5 + L[4](x, y) * 0.5) * 255;
    data[o + 3] = (st[0](x, y) * 0.6 + st[1](x, y) * 0.4) * 255;
  }
  const t = new THREE.DataTexture(data, S, S);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
  return t;
}
export const noiseTex = makeNoise();

const PARS_V = /* glsl */`varying vec3 vCbW; varying vec3 vCbN;`;
const MAIN_V = /* glsl */`
  vec4 cbW4 = vec4(transformed, 1.0); vec3 cbN3 = objectNormal;
  #ifdef USE_INSTANCING
    cbW4 = instanceMatrix * cbW4;
    mat3 cbIm = mat3(instanceMatrix);
    cbN3 = cbIm * (cbN3 / vec3(dot(cbIm[0], cbIm[0]), dot(cbIm[1], cbIm[1]), dot(cbIm[2], cbIm[2])));
  #endif
  vCbW = (modelMatrix * cbW4).xyz; vCbN = normalize(mat3(modelMatrix) * cbN3);`;
const PARS_F = /* glsl */`
  varying vec3 vCbW; varying vec3 vCbN; uniform sampler2D cbNoise;
  const vec3 FOREST_D = vec3(0.022, 0.05, 0.016), FOREST_L = vec3(0.085, 0.17, 0.04), FOREST_Y = vec3(0.16, 0.19, 0.05);
  const vec3 ROCK_D = vec3(0.085, 0.085, 0.07), ROCK_L = vec3(0.29, 0.28, 0.24);
  vec4 cbTri(vec3 p, vec3 w) { return texture2D(cbNoise, p.zy) * w.x + texture2D(cbNoise, p.xz) * w.y + texture2D(cbNoise, p.xy) * w.z; }
  vec3 cbBump(vec3 pos, vec3 n, float h, float k) {
    vec3 sx = dFdx(pos), sy = dFdy(pos), r1 = cross(sy, n), r2 = cross(n, sx);
    float det = dot(sx, r1);
    vec3 g = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2) * k;
    return normalize(abs(det) * n - g);
  }`;
const COLOR = {
  rock: /* glsl */`
    vec3 cbN = normalize(vCbN), cbA = pow(abs(cbN), vec3(4.0)); cbA /= cbA.x + cbA.y + cbA.z;
    vec4 cA = cbTri(vCbW * 0.004, cbA), cB = cbTri(vCbW * 0.03, cbA), cC = cbTri(vCbW * 0.16, cbA);
    float veg = smoothstep(0.02, 0.36, cbN.y + (cB.r - 0.5) * 0.7 + (cC.g - 0.5) * 0.2); // karst here is wooded to the top; only the sheerest faces are bare
    vec3 green = mix(FOREST_D, FOREST_L, smoothstep(0.25, 0.75, cB.g * 0.5 + cC.b * 0.5));
    green = mix(green, FOREST_Y, smoothstep(0.55, 0.8, cA.r) * 0.55);
    green *= 0.7 + 0.6 * cC.r;
    vec3 rock = mix(ROCK_D, ROCK_L, smoothstep(0.2, 0.8, cB.g * 0.6 + cC.a * 0.4));
    rock *= mix(0.7, 1.05, cB.a);
    rock = mix(rock, FOREST_D * 1.6, smoothstep(0.55, 0.8, cB.r) * 0.45);  // moss and old stains
    diffuseColor.rgb = mix(rock, green, veg);
    float cbH = mix(cC.a * 0.6 + cB.g * 0.4, cC.r, veg), cbK = mix(1.0, 1.8, veg);`,
  cliff: /* glsl */`
    vec3 cbN = normalize(vCbN), cbA = pow(abs(cbN), vec3(4.0)); cbA /= cbA.x + cbA.y + cbA.z;
    vec4 cB = cbTri(vCbW * 0.05, cbA), cC = cbTri(vCbW * 0.22, cbA);
    // the spray keeps the falls' rock green: moss and ferns in patches, wet dark stone between
    float veg = smoothstep(0.3, 0.48, cB.r * 0.55 + cC.g * 0.3 + max(cbN.y, 0.0) * 0.5);
    vec3 green = mix(FOREST_D, FOREST_L * 1.15, cC.b) * (0.7 + 0.6 * cC.r);
    vec3 rock = mix(ROCK_D * 0.8, ROCK_L * 0.75, smoothstep(0.2, 0.8, cB.g * 0.5 + cC.a * 0.5));
    diffuseColor.rgb = mix(rock, green, veg);
    float cbH = mix(cC.a, cC.r, veg), cbK = 1.4;`,
  canopy: /* glsl */`
    vec3 cbN = normalize(vCbN), cbA = pow(abs(cbN), vec3(4.0)); cbA /= cbA.x + cbA.y + cbA.z;
    vec4 cC = cbTri(vCbW * 0.7, cbA), cB = cbTri(vCbW * 0.15, cbA);
    diffuseColor.rgb *= (0.72 + 0.5 * cC.r) * (0.85 + 0.3 * cB.g);
    float cbH = cC.r, cbK = 1.2;`,
  ground: /* glsl */`
    vec3 cbN = normalize(vCbN);
    vec4 gB = texture2D(cbNoise, vCbW.xz * 0.02), gC = texture2D(cbNoise, vCbW.xz * 0.13);
    diffuseColor.rgb *= 0.8 + 0.4 * (gB.g * 0.5 + gC.r * 0.5);
    float steep = 1.0 - smoothstep(0.3, 0.6, cbN.y);
    vec3 cbA = pow(abs(cbN), vec3(4.0)); cbA /= cbA.x + cbA.y + cbA.z;
    vec4 tC = cbTri(vCbW * 0.1, cbA);
    vec3 cbRock = mix(ROCK_D, ROCK_L, tC.b) * mix(0.6, 1.1, tC.a);
    diffuseColor.rgb = mix(diffuseColor.rgb, cbRock, steep * 0.7);
    float cbH = mix(gC.r * 0.5, tC.a, steep), cbK = mix(0.5, 1.5, steep);`,
};
// Adds detail to a standard material (keeps any onBeforeCompile it already has).
export function detail(mat, kind) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (s, r) => {
    prev?.call(mat, s, r);
    s.uniforms.cbNoise = { value: noiseTex };
    s.vertexShader = s.vertexShader.replace('#include <common>', `#include <common>\n${PARS_V}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${MAIN_V}`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\n${PARS_F}`)
      .replace('#include <roughnessmap_fragment>', `${COLOR[kind]}\n#include <roughnessmap_fragment>`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = cbBump(-vViewPosition, normal, cbH, cbK * (1.0 - smoothstep(40.0, 260.0, length(vViewPosition))));`);
  };
  mat.customProgramCacheKey = () => 'cb-' + kind + (prev ? '+' : '');
  return mat;
}
