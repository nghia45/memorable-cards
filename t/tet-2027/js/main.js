// Director: loads stories/<card>/story.json, builds the world, and runs the four acts:
// river (arrival) → hub (mai tree) ⇄ memory (pop-up) → dawn → finale (lì xì envelope).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { stepTweens, animate, wait, ease, easeOut, lerp } from './tween.js';
import { createSky, createLights, createPetals, setLanternGlow } from './world.js';
import { createRiver, streetMaterials } from './river.js';
import { createCourtyard } from './tree.js';
import { createPopup, THEMES } from './popup.js';
import { createEnvelopeStage, envelopeFrontTex, FLOOR_Y } from './envelope.js';
import { createAudio } from './audio.js';

const $ = (id) => document.getElementById(id);
const progress = (v, label) => window.__progress?.(v, label);
const breathe = () => new Promise((r) => setTimeout(r)); // let the progress bar paint between build steps
const hintEl = $('hint'), titleEl = $('title'), headerEl = $('header'), skipBtn = $('skip'), replayBtn = $('replay');
const setHint = (html) => { hintEl.innerHTML = html || ''; };

// ---------- sound (starts on the first tap; the mute button is live from the start) ----------
const audio = createAudio();
const muteBtn = $('mute');
const showMute = () => { muteBtn.setAttribute('aria-pressed', audio.muted); muteBtn.setAttribute('aria-label', audio.muted ? 'Unmute sound' : 'Mute sound'); };
muteBtn.onclick = () => { audio.setMuted(!audio.muted); showMute(); };
showMute();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ambient = reduceMotion ? 0.15 : 1; // scales ambient drift only; interactions stay intact

// ---------- story ----------
async function loadStory() {
  const id = new URLSearchParams(location.search).get('card') || 'demo';
  if (!/^[\w-]{1,64}$/.test(id)) throw new Error(`Invalid card id "${id}"`);
  const base = `stories/${id}/`;
  const res = await (window.__storyReq || fetch(base + 'story.json', { cache: 'no-cache' })); // started early by the inline loader
  if (!res.ok) throw new Error(`Card "${id}" not found (${res.status})`);
  const raw = await res.json();
  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const mems = Array.isArray(raw.memories) ? raw.memories : [];
  if (mems.length > 4) console.warn(`story.json has ${mems.length} memories; only the first 4 are used.`);
  const memories = mems.slice(0, 4).map((m, i) => ({
    photo: str(m.photo, 200), date: str(m.date, 40), caption: str(m.caption, 160),
    theme: THEMES.includes(m.theme) ? m.theme : THEMES[i % THEMES.length],
  }));
  if (!memories.length) throw new Error('story.json needs at least one memory');
  const img = (src) => new Promise((resolve) => {
    if (!src) return resolve(null);
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => { console.warn('Photo failed to load:', src); resolve(null); };
    im.src = new URL(src, new URL(base, location.href)).href;
  });
  progress(0.5, 'Loading photos');
  let done = 0;
  const photos = await Promise.all(memories.map((m) => img(m.photo).then((im) => (progress(0.5 + (0.15 * ++done) / memories.length), im))));
  memories.forEach((m, i) => (m.img = photos[i]));
  return {
    to: str(raw.to, 40) || 'Bạn thân mến', from: str(raw.from, 40) || 'Người thương gửi',
    title: str(raw.title, 80) || 'Một năm của chúng mình',
    message: str(raw.message, 180) || 'Chúc bạn một năm mới an khang thịnh vượng, vạn sự như ý!',
    memories,
  };
}

let story;
try {
  [story] = await Promise.all([
    loadStory(),
    Promise.all(['600 40px "Playfair Display"', 'italic 500 40px "Playfair Display"', '400 20px "Be Vietnam Pro"', '600 20px "Be Vietnam Pro"', '600 40px "Dancing Script"']
      .map((f) => document.fonts.load(f, 'ChúcMừng'))).catch(() => {}),
  ]);
} catch (err) {
  $('loading').textContent = err.message;
  throw err;
}
performance.mark('story');
progress(0.68, 'Building the river');
await breathe();

// ---------- renderer / scene ----------
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(innerWidth || 1, innerHeight || 1, false);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a0710, 0.035);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(42, 1, 0.03, 400);

// ---------- post: HDR render (MSAA) → bloom → tone map → vignette + grain ----------
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.6, 0.82); // strength, radius, threshold (linear HDR)
composer.addPass(bloomPass);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vignette: { value: 0.42 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float time, vignette; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 d = vUv - 0.5;
      c *= 1.0 - vignette * smoothstep(0.25, 0.85, dot(d, d) * 2.2); // lens falloff
      c += (hash(vUv * 1000.0) - 0.5) * 0.028;                     // film grain (also hides banding)
      gl_FragColor = vec4(c, 1.0);
    }`,
});
composer.addPass(grade);

const sky = createSky();
scene.add(sky.mesh);
const lights = createLights(scene);
const mats = streetMaterials();
const river = createRiver(renderer, mats);
scene.add(river.group);
progress(0.78, 'Planting the mai tree');
await breathe();
const envTex = envelopeFrontTex();
const yard = createCourtyard({ memoryCount: story.memories.length, envelopeTex: envTex, mats });
scene.add(yard.group);
// The courtyard (thousands of blossoms) sits behind the gate: keep it out of the river's reflection render.
const reflect = river.water.onBeforeRender;
river.water.onBeforeRender = (...a) => {
  const hidden = yard.group.children.filter((o) => o !== yard.gate && o.visible);
  hidden.forEach((o) => (o.visible = false));
  reflect(...a);
  hidden.forEach((o) => (o.visible = true));
};
const petals = createPetals(110);
scene.add(petals.mesh);
progress(0.86, 'Folding the lì xì');
await breathe();

// Envelope finale stage: stage-local floor (FLOOR_Y) sits on the courtyard ground.
const STAGE_SCALE = 0.25;
const stage = createEnvelopeStage({ to: story.to, from: story.from, message: story.message, setHint, frontTex: envTex, camera, sfx: audio.play });
stage.group.scale.setScalar(STAGE_SCALE);
stage.group.position.set(-1.2, -FLOOR_Y * STAGE_SCALE, 4.6);
stage.group.rotation.y = 0.3; // camera looks past the envelope toward the tree
stage.group.visible = false;
scene.add(stage.group);
const stageFloor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.25 }));
stageFloor.rotation.x = -Math.PI / 2;
stageFloor.position.set(-1.2, 0.002, 4.6);
stageFloor.receiveShadow = true;
scene.add(stageFloor);

// Reading light for the pop-up book.
const bookLight = new THREE.SpotLight(0xffe2b8, 0, 9, 0.62, 0.55, 1.2);
const BOOK_LIGHT = 4.5;
bookLight.castShadow = true;
bookLight.shadow.mapSize.set(1024, 1024);
bookLight.shadow.bias = -0.0005;
scene.add(bookLight, bookLight.target);

// ---------- state ----------
const N = story.memories.length;
let act = 'river', busy = false, uTarget = 0, u = 0, idle = 0, opened = 0, dawn = 0, bloom = 0.3, popup = null;
const hubHint = () => `<span>✿</span>Tap a glowing bud to open a memory · ${opened} / ${N}`;
const HUB_LOOK = new THREE.Vector3(0, 2.05, 0);
const camLook = new THREE.Vector3(); // current look target (lerped for smooth shots)
const SPREAD_POS = new THREE.Vector3(0, 1.0, 2.6);

titleEl.innerHTML = `<p>Gửi ${escapeHtml(story.to)}</p><h2>${escapeHtml(story.title)}</h2>`;
function escapeHtml(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

// Portrait screens get a taller lens instead of backing the camera out of the courtyard.
const baseFov = () => (camera.aspect >= 1 ? 42 : 42 + (1 - camera.aspect) * 34);
// Fit a shot: pull the camera back along its view line so `width` world units fit on narrow screens.
function fitDistance(base, width) {
  const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
  return Math.max(base, (width / 2) / halfW);
}
function hubPose() {
  const d = fitDistance(5.75, 3.0); // inside the gate; pulls back on narrow screens to fit the canopy
  return { pos: new THREE.Vector3(0, 2.0 + (d - 5.75) * 0.1, d), look: HUB_LOOK.clone() };
}
function memoryPose() {
  const look = SPREAD_POS.clone().add(new THREE.Vector3(0, 0.62, 0.45));
  const dir = new THREE.Vector3(0, 0.5, 2.45).normalize();
  return { pos: look.clone().addScaledVector(dir, fitDistance(2.95, 2.5)), look };
}
function stagePose() {
  const kz = Math.max(1, 0.62 / camera.aspect);
  // low and tilted up: the envelope in the lower half, the blooming tree and its polaroids above it
  const local = new THREE.Vector3(0, 0.3, 7.6 * kz), look = new THREE.Vector3(0, 0.75, 0);
  return { pos: stage.group.localToWorld(local), look: stage.group.localToWorld(look), fov: Math.max(54, baseFov()) }; // wider lens fits the tree behind
}
function flyTo(pose, dur) {
  const p0 = camera.position.clone(), l0 = camLook.clone(), f0 = camera.fov, f1 = pose.fov ?? f0;
  return animate(dur, (k) => {
    const e = ease(k);
    camera.position.lerpVectors(p0, pose.pos, e);
    camLook.lerpVectors(l0, pose.look, e);
    if (f1 !== f0) { camera.fov = lerp(f0, f1, e); camera.updateProjectionMatrix(); }
  });
}

// ---------- act 1: river ----------
setHint('<span>↓</span>Scroll or drag to sail the river');
skipBtn.hidden = false;
document.body.classList.add('nav');
function enterHub() {
  act = 'hub';
  audio.setMood('night');
  river.group.visible = false; // behind the camera from here on; skip the reflection pass
  yard.gate.visible = false; // likewise, and narrow-screen shots can sit just outside it
  skipBtn.hidden = true;
  document.body.classList.remove('nav');
  titleEl.classList.remove('on');
  camLook.copy(HUB_LOOK); // the river path already ends looking at the tree
  busy = true;
  flyTo(hubPose(), 0.9).then(() => { busy = false; setHint(hubHint()); });
}
skipBtn.onclick = () => { if (act === 'river') { uTarget = 1; u = 1; enterHub(); } };

// ---------- act 3: memory pop-up ----------
async function openMemory(i) {
  if (busy) return;
  busy = true; act = 'memory'; setHint('');
  const mem = story.memories[i];
  const budPos = yard.budWorld(i);
  // 1) camera leans toward the bud while it unfurls
  const mp = memoryPose();
  audio.play('chime');
  flyTo({ pos: camera.position.clone().lerp(budPos, 0.25), look: budPos }, 1.1);
  await animate(1.1, (k) => yard.setBudOpen(i, easeOut(k)));
  petals.burst(budPos, 40);
  // 2) the book flies out of the blossom and opens in front of the tree
  popup = createPopup({ theme: mem.theme, caption: mem.caption, date: mem.date, photo: mem.img });
  scene.add(popup.group);
  popup.group.position.copy(budPos);
  popup.group.scale.setScalar(0.05);
  bookLight.position.copy(SPREAD_POS).add(new THREE.Vector3(0.8, 2.6, 2.2));
  bookLight.target.position.copy(SPREAD_POS).add(new THREE.Vector3(0, 0.4, 0.5));
  flyTo(mp, 1.3);
  audio.play('whoosh');
  await animate(1.2, (k) => {
    const e = ease(k);
    popup.group.position.lerpVectors(budPos, SPREAD_POS, e);
    popup.group.position.y += Math.sin(e * Math.PI) * 0.4;
    popup.group.scale.setScalar(lerp(0.05, 1, e));
    popup.group.rotation.set(0, (1 - e) * Math.PI * 1.5, 0);
    bookLight.intensity = e * BOOK_LIGHT;
  });
  audio.play('paper');
  await animate(2.4, (k) => (popup.open = k));
  await animate(Math.max(1, mem.caption.length * 0.035), (k) => (popup.write = k));
  setHint('<span>✓</span>Tap to keep this memory on the tree');
  busy = false;
}
async function closeMemory() {
  if (busy || !popup) return;
  busy = true; setHint('');
  const i = yard.memoryBuds.findIndex((b) => b.opened && !b.polaroid);
  const budPos = yard.budWorld(i);
  audio.play('paper');
  await animate(1.3, (k) => (popup.open = 1 - k));
  flyTo(hubPose(), 1.4);
  await animate(1.0, (k) => {
    const e = ease(k);
    popup.group.position.lerpVectors(SPREAD_POS, budPos, e);
    popup.group.scale.setScalar(lerp(1, 0.04, e));
    popup.group.rotation.y = e * Math.PI;
    bookLight.intensity = (1 - e) * BOOK_LIGHT;
  });
  const pol = yard.hangPolaroid(i, popup.polaroid);
  popup.dispose(); popup = null;
  petals.burst(budPos, 25);
  opened++;
  const b0 = bloom, b1 = 0.3 + (0.55 * opened) / N;
  await animate(0.8, (k) => { pol.scale.setScalar(Math.max(0.001, easeOut(k))); bloom = lerp(b0, b1, k); });
  petals.density = 0.35 + (0.4 * opened) / N;
  busy = false;
  if (opened === N) startDawn();
  else { act = 'hub'; setHint(hubHint()); }
}

// ---------- act 4: dawn → finale ----------
async function startDawn() {
  act = 'dawn'; busy = true; setHint('');
  const b0 = bloom;
  await wait(0.6);
  audio.setMood('dawn');
  audio.play('bell');
  titleEl.innerHTML = '<p>Mùng 1 Tết</p><h2>Năm Đinh Mùi 2027</h2>';
  titleEl.classList.add('on');
  await animate(4.5, (k) => {
    const e = ease(k);
    dawn = e;
    bloom = lerp(b0, 1, e);
    petals.density = lerp(petals.density, 1, e * 0.05);
    scene.fog.density = lerp(0.03, 0.012, e);
  });
  const lixi = yard.showLixi();
  audio.play('chime');
  await animate(0.9, (k) => lixi.scale.setScalar(Math.max(0.001, easeOut(k))));
  titleEl.classList.remove('on');
  // lean in toward the envelope so it reads as the next thing to touch
  const lp = yard.lixiPose().pos;
  await flyTo({ pos: camera.position.clone().lerp(lp, 0.28), look: HUB_LOOK.clone().lerp(lp, 0.7) }, 1.6);
  setHint('<span>🧧</span>A lì xì is waiting on the branch. Tap it');
  busy = false;
}
async function takeLixi() {
  if (busy) return;
  busy = true; act = 'finale'; setHint('');
  const { pos, scale } = yard.lixiPose();
  yard.hideLixi();
  petals.burst(pos, 40);
  audio.play('whoosh');
  stage.group.visible = true;
  stage.arrive(stage.group.worldToLocal(pos.clone()), scale / STAGE_SCALE);
  await flyTo(stagePose(), 2.2);
  headerEl.classList.add('on');
  replayBtn.hidden = false;
  document.body.classList.add('nav');
  busy = false;
}
replayBtn.onclick = () => location.reload();

// ---------- input ----------
const pointer = new THREE.Vector2(), ndc = new THREE.Vector2(), ray = new THREE.Raycaster();
let drag = null;
function pick(e) {
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObjects(yard.hitTargets(), false)[0]?.object || null;
}
function activate(target) { // tap or Enter
  if (act === 'river') { uTarget = Math.min(1, uTarget + 0.12); idle = 0; return; }
  if (busy) return;
  if (act === 'hub') {
    const i = target ? target.userData.memory : yard.memoryBuds.findIndex((b) => !b.opened);
    if (i != null && i >= 0) openMemory(i);
  } else if (act === 'memory') closeMemory();
  else if (act === 'dawn') { if (!target || target.userData.lixi) takeLixi(); }
  else if (act === 'finale') stage.activate();
}
canvas.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, u: uTarget, moved: 0 };
  canvas.setPointerCapture(e.pointerId);
  if (act === 'finale') stage.dragStart();
});
canvas.addEventListener('pointermove', (e) => {
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return; // hidden/collapsed frame reports 0x0
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  if (act === 'hub' || act === 'dawn') canvas.style.cursor = pick(e) ? 'pointer' : '';
  if (!drag) return;
  drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
  const dy = (drag.y - e.clientY) / r.height;
  if (act === 'river') { uTarget = THREE.MathUtils.clamp(drag.u + dy * 0.35, 0, 1); idle = 0; }
  else if (act === 'finale') stage.drag(dy);
});
canvas.addEventListener('pointerup', (e) => {
  if (!drag) return;
  const tap = drag.moved < 8; drag = null;
  if (tap) activate(act === 'hub' || act === 'dawn' ? pick(e) : null);
  else if (act === 'finale') stage.dragEnd();
});
canvas.addEventListener('wheel', (e) => {
  if (act !== 'river') return;
  e.preventDefault();
  uTarget = THREE.MathUtils.clamp(uTarget + e.deltaY * 0.0005, 0, 1);
  idle = 0;
}, { passive: false });
canvas.addEventListener('keydown', (e) => {
  if (act === 'river' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { // keyboard sailing, both ways
    e.preventDefault();
    uTarget = THREE.MathUtils.clamp(uTarget + (e.key === 'ArrowDown' ? 0.06 : -0.06), 0, 1); idle = 0;
    return;
  }
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  if (act === 'river') skipBtn.onclick(); else activate(null);
});

// ---------- layout / loop ----------
function resize() {
  if (!innerWidth || !innerHeight) return;
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(innerWidth, innerHeight);
  bloomPass.resolution.set(innerWidth / 2, innerHeight / 2); // ponytail: half-res bloom; its blur hides the difference
  camera.aspect = innerWidth / innerHeight;
  camera.fov = act === 'finale' ? Math.max(54, baseFov()) : baseFov();
  camera.updateProjectionMatrix();
  if (!busy && act === 'hub') { const p = hubPose(); camera.position.copy(p.pos); }
}
addEventListener('resize', resize);
resize();
river.cameraAt(0, camera);

// Compile every shader before the reveal (hidden parts too), so the first frames and later acts don't hitch.
progress(0.92, 'Lighting the lanterns');
performance.mark('built');
stage.group.visible = true;
await renderer.compileAsync(scene, camera).catch(() => {});
scene.traverse((o) => { // upload textures now too, instead of during the first visible frame
  for (const m of [].concat(o.material || [])) for (const k in m) if (m[k]?.isTexture) renderer.initTexture(m[k]);
});
stage.group.visible = false;
performance.mark('compiled');
progress(1, 'Ready');

const clock = new THREE.Clock();
const look = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  stepTweens(dt);

  // Nothing near the key light's shadow box moves during the river: refresh shadows every 6th frame.
  renderer.shadowMap.autoUpdate = act !== 'river';
  if (act === 'river' && frames % 6 === 0) renderer.shadowMap.needsUpdate = true;
  if (act === 'river') {
    // Drifts downstream on its own (~22s); the viewer can sail back and forth, and the drift waits while they steer.
    if ((idle += dt) > 2.5) uTarget = Math.min(1, uTarget + dt * 0.045);
    u += (uTarget - u) * Math.min(1, dt * 1.6);
    river.cameraAt(Math.min(u, 1), camera);
    titleEl.classList.toggle('on', u > 0.04 && u < 0.55);
    if (u > 0.997) enterHub();
  } else {
    // hub/dawn: a little parallax toward the pointer; other acts are fully directed
    look.copy(camLook);
    if ((act === 'hub' || act === 'dawn') && !busy) { look.x += pointer.x * 0.25; look.y += pointer.y * 0.12; }
    camera.lookAt(look);
  }

  sky.dawn = dawn; sky.tick(t);
  lights.set(dawn);
  setLanternGlow(dawn);
  yard.bloom = bloom;
  yard.tick(t, dt, ambient);
  if (river.group.visible) river.tick(t, dt, ambient);
  petals.tick(dt, t, ambient);
  if (popup) popup.tick(t, dt);
  if (stage.group.visible) stage.update(dt, t, pointer, ambient);

  grade.uniforms.time.value = t % 10;
  // Bloom is for lights in the dark: ease it off for daylight and for paper held close to the camera.
  const bt = lerp(0.82, 1.7, dawn) + (popup || act === 'finale' ? 0.6 : 0);
  bloomPass.threshold += (bt - bloomPass.threshold) * Math.min(1, dt * 3);
  bloomPass.strength = lerp(0.55, 0.3, dawn);
  composer.render(dt);
  if (!revealed) reveal();
  adaptQuality(dt);
}
let revealed = false;
// Adaptive resolution: if frames run long, step the pixel ratio down (never up) until it holds.
let slow = 0, frames = 0;
function adaptQuality(dt) {
  if (++frames < 90) return; // skip warm-up
  slow = slow * 0.95 + (dt > 1 / 40 ? 0.05 : 0);
  const pr = renderer.getPixelRatio();
  if (slow > 0.6 && pr > 1) {
    renderer.setPixelRatio(Math.max(1, pr - 0.25));
    slow = 0; frames = 0;
    resize();
  }
}
function reveal() { // first frame is on screen: fade the loader out over it
  revealed = true;
  performance.mark('first-frame');
  $('loading').classList.add('done');
  setTimeout(() => $('loading').remove(), 1200);
}
renderer.setAnimationLoop(frame);
