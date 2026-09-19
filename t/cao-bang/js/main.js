// "Non Nước Cao Bằng": one valley to explore freely. Drag to turn, pinch or scroll to zoom, tap the ground to glide
// there, tap a landmark's label to fly in and read its note. The sun button (or visiting the then yard) brings dusk.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { stepTweens, animate, ease } from './tween.js';
import { createRig } from './rig.js';
import { createAudio } from './audio.js';
import { FACTS } from './facts.js';
import { createSky, createMist, applyLook } from './sky.js';
import { height, createTerrain, createWater, createKarst, createMatThan, createTrees, bambooClumps, createRanges, FALLS, MATTHAN } from './land.js';
import { createVillage, THEN_AT } from './village.js';
import { createFalls } from './falls.js';
import { createSites } from './sites.js';
import { ss, rng } from './noise.js';

const $ = (id) => document.getElementById(id);
const progress = (v, label) => window.__progress?.(v, label);
const breathe = () => new Promise((r) => setTimeout(r));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// phones get a smaller budget: pixel ratio, MSAA, shadow map, tree count, mist
const phone = matchMedia('(pointer: coarse)').matches;
await document.fonts.load('600 40px "Playfair Display"', 'Cao Bằng').catch(() => {});

// ---------- renderer / scene / post ----------
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, phone ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.setSize(innerWidth || 1, innerHeight || 1, false);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xc6d6e2, 0.0021);
const camera = new THREE.PerspectiveCamera(50, 1, 0.3, 4000);
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: phone ? 2 : 4 }));
composer.renderTarget2.samples = 0;
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.5, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());
// a light grade in display space: a touch more saturation, a soft S-curve, a vignette
composer.addPass(new ShaderPass({
  uniforms: { tDiffuse: { value: null }, vignette: { value: 0.3 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vignette; varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, 1.12);
      c = clamp(c, 0.0, 1.0); c = mix(c, c * c * (3.0 - 2.0 * c), 0.3);
      vec2 d = vUv - 0.5; c *= 1.0 - vignette * smoothstep(0.3, 0.9, dot(d, d) * 2.2);
      gl_FragColor = vec4(c, 1.0);
    }`,
}));

// ---------- light and sky ----------
const sky = createSky();
scene.add(sky.mesh);
const key = new THREE.DirectionalLight(0xffffff, 2.5);
key.castShadow = true;
key.shadow.mapSize.setScalar(phone ? 1024 : 2048);
key.shadow.bias = -0.0005; key.shadow.normalBias = 0.6;
scene.add(key, key.target);
const hemi = new THREE.HemisphereLight(0xbcd4f0, 0x6a6a3a, 1);
scene.add(hemi);
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null;
const refreshEnv = () => { const old = envRT; envRT = pmrem.fromScene(sky.envScene, 0.02); scene.environment = envRT.texture; old?.dispose(); };
scene.environmentIntensity = 0.35;

// ---------- the valley ----------
progress(0.45, 'Raising the mountains');
await breathe();
const ranges = createRanges();
const terrain = createTerrain();
const water = createWater();
const karst = createKarst();
const matThan = createMatThan();
scene.add(ranges.group, terrain, water.group, karst.group, matThan);
progress(0.6, 'Filling the river');
await breathe();
const falls = createFalls();
scene.add(falls.group);
progress(0.72, 'Building the village');
await breathe();
const village = createVillage();
const mist = createMist(phone ? 7 : 12, rng(41)), sites = createSites(phone ? 0.55 : 1, falls.waterMat);
scene.add(sites.group);
scene.add(village.group, createTrees([...karst.treeSpots, ...sites.treeSpots], phone ? 0.55 : 1), bambooClumps(village.bamboo), mist.group);
progress(0.85, 'Planting the trees');
await breathe();

const sunDir = new THREE.Vector3();
const look = { sky, key, hemi, fog: scene.fog, ranges: ranges.layers.map((m) => m.color), falls: falls.light, renderer, sunDir, mist: [...mist.mats, ...sites.cloudMats] };
let tod = 0, todGoal = 0, todTween = null;
applyLook(0, look);
refreshEnv();
function setTod(goal, dur = 3.5) {
  if (goal === todGoal) return;
  todGoal = goal;
  const from = tod, me = {};
  todTween = me;
  $('sun').textContent = goal ? '☀' : '☾';
  $('sun').setAttribute('aria-label', goal ? 'Quay lại buổi chiều · Back to afternoon' : 'Chuyển sang hoàng hôn · Switch to dusk');
  animate(reduceMotion ? 0.01 : dur, (k) => { if (todTween !== me) return; tod = from + (goal - from) * ease(k); applyLook(tod, look); shadowDirty = true; })
    .then(() => { if (todTween === me) { refreshEnv(); todTween = null; } });
}

// ---------- the landmarks: where the label sits and where the camera goes ----------
const raft = falls.rafts[1].position, sp = village.spots, peak = karst.peaks.find((q) => q.x === -52) ?? karst.peaks[2], ss2 = sites.spots;
matThan.updateMatrixWorld();
const hole = matThan.localToWorld(matThan.userData.hole.clone());
const SPOTS = [
  { id: 'banGioc', name: 'Thác Bản Giốc', label: V(FALLS.c.x, FALLS.y2 + 8, FALLS.c.y - FALLS.r2), view: { target: V(FALLS.c.x, 2, FALLS.c.y - FALLS.r1 + 4), yaw: 0, pitch: -0.12, dist: 110 } },
  { id: 'quaySon', name: 'Sông Quây Sơn', label: raft.clone().setY(5), view: { target: raft.clone().setY(1.5), yaw: 0.5, pitch: -0.22, dist: 26 } },
  { id: 'matThan', name: 'Núi Mắt Thần', label: hole.clone().setY(hole.y + 34), view: { target: hole.clone(), yaw: 0.45, pitch: 0.16, dist: 135 } },
  { id: 'karst', name: 'Núi đá vôi', label: V(peak.x, height(peak.x, peak.z) + peak.h + 4, peak.z), view: { target: V(peak.x, peak.h * 0.45, peak.z), yaw: 0.75, pitch: -0.1, dist: 110 } },
  { id: 'house', name: 'Nhà sàn Tày', label: sp.house.clone().setY(sp.house.y + 6), view: { target: sp.house.clone(), yaw: -Math.PI / 2 - 0.35, pitch: -0.18, dist: 20 } },
  { id: 'wheel', name: 'Cọn nước', label: sp.wheel.clone().setY(sp.wheel.y + 7), view: { target: sp.wheel.clone(), yaw: -Math.PI / 2 + 0.5, pitch: -0.12, dist: 19 } },
  { id: 'incense', name: 'Hương Phia Thắp', label: sp.incense.clone().setY(sp.incense.y + 5), view: { target: sp.incense.clone(), yaw: -1.1, pitch: -0.7, dist: 17 } },
  { id: 'chestnut', name: 'Hạt dẻ Trùng Khánh', label: sp.chestnut.clone().setY(sp.chestnut.y + 7), view: { target: sp.chestnut.clone(), yaw: -1.9, pitch: -0.2, dist: 30 } },
  { id: 'nguomNgao', name: 'Động Ngườm Ngao', label: ss2.nguom.clone().setY(ss2.nguom.y + 7), view: { target: ss2.nguom.clone().setY(ss2.nguom.y - 1), yaw: 0.25, pitch: -0.22, dist: 34 } },
  { id: 'pagoda', name: 'Chùa Trúc Lâm Bản Giốc', label: ss2.pagoda.clone().setY(ss2.pagoda.y + 9), view: { target: ss2.pagoda.clone(), yaw: -0.52, pitch: -0.3, dist: 55 } },
  { id: 'khuoiKy', name: 'Làng đá Khuổi Ky', label: ss2.khuoiky.clone().setY(ss2.khuoiky.y + 9), view: { target: ss2.khuoiky.clone(), yaw: -0.5, pitch: -0.35, dist: 52 } },
  { id: 'phongNam', name: 'Thung lũng Phong Nặm', label: V(-40, height(-40, 45) + 14, 45), view: { target: V(-30, 2, 40), yaw: 0.15, pitch: -0.18, dist: 110 } },
  { id: 'thangHen', name: 'Hồ Thang Hen', label: ss2.lake.clone().setY(22), view: { target: ss2.lake.clone(), yaw: 0.6, pitch: -1.05, dist: 120 } },
  { id: 'khauCocCha', name: 'Đèo Khau Cốc Chà', label: ss2.pass.clone().setY(ss2.pass.y + 16), view: { target: ss2.pass.clone(), yaw: 2.5, pitch: -0.45, dist: 135 } },
  { id: 'pacBo', name: 'Pác Bó · suối Lê-nin', label: ss2.pacbo.clone().setY(ss2.pacbo.y + 8), view: { target: ss2.pacbo.clone(), yaw: 0.75, pitch: -0.85, dist: 80 } },
  { id: 'phjaOac', name: 'Phja Oắc – Phja Đén', label: ss2.phja.clone().setY(ss2.phja.y + 10), view: { target: ss2.phja.clone().setY(ss2.phja.y - 25), yaw: Math.PI / 2 + 0.3, pitch: -0.5, dist: 175 } },
  { id: 'meBongCon', name: 'Thác Mẹ Bồng Con', label: ss2.mbc.clone().setY(30), view: { target: ss2.mbc.clone().setY(7), yaw: -Math.PI / 2 - 0.2, pitch: -0.42, dist: 46 } },
  { id: 'hoaSo', name: 'Đồi hoa sở', label: ss2.so.clone().setY(ss2.so.y + 12), view: { target: ss2.so.clone(), yaw: -1.2, pitch: -0.35, dist: 75 } },
  { id: 'tamGiacMach', name: 'Hoa tam giác mạch', label: ss2.tgm.clone().setY(ss2.tgm.y + 12), view: { target: ss2.tgm.clone(), yaw: -2.5, pitch: -0.3, dist: 90 } },
  { id: 'daQuy', name: 'Hoa dã quỳ', label: ss2.dq.clone().setY(ss2.dq.y + 10), view: { target: ss2.dq.clone(), yaw: 0.9, pitch: -0.45, dist: 55 } },
  { id: 'then', name: 'Hát Then', label: sp.then.clone().setY(sp.then.y + 6), view: { target: sp.then.clone().setX(sp.then.x + 1).setY(sp.then.y - 0.6), yaw: -Math.PI / 2 - 0.35, pitch: -0.28, dist: 11 }, dusk: true },
];
const OVER = { target: V(0, 0, -20), yaw: 0.3, pitch: -0.5, dist: 330 };

// ---------- UI: labels, the fact card, buttons ----------
const labelsEl = $('labels'), card = $('fact'), homeBtn = $('home'), hint = $('hint');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
for (const s of SPOTS) {
  const b = document.createElement('button');
  b.className = 'label hide'; b.type = 'button'; b.textContent = s.name;
  b.onclick = () => go(s);
  labelsEl.appendChild(b); s.el = b;
}
let closeCard = null, at = null; // `at`: the landmark we're at (null: free / overview)
function showFact(id) {
  const f = FACTS[id];
  card.innerHTML = `<p class="tag">${esc(f.tag)}</p><h3>${esc(f.title)}</h3><p>${esc(f.vi)}</p><p class="en">${esc(f.en)}</p><button type="button">Khám phá tiếp →</button>`;
  card.classList.add('on'); card.setAttribute('aria-hidden', 'false');
  const btn = card.querySelector('button');
  setTimeout(() => btn.focus({ preventScroll: true }), 50);
  closeCard = () => { card.classList.remove('on'); card.setAttribute('aria-hidden', 'true'); closeCard = null; canvas.focus({ preventScroll: true }); };
  btn.onclick = () => closeCard();
}
async function go(s) {
  closeCard?.();
  hint.style.opacity = 0;
  at = s; homeBtn.hidden = false;
  if (s.dusk) setTod(1);
  await rig.fly(s.view, reduceMotion ? 0.01 : 2.4);
  if (at === s) showFact(s.id);
}
async function home() {
  closeCard?.(); at = null; homeBtn.hidden = true;
  await rig.fly(OVER, reduceMotion ? 0.01 : 2.4);
}
homeBtn.onclick = home;
$('sun').onclick = () => setTod(todGoal ? 0 : 1);
const audio = createAudio(), muteBtn = $('mute');
const showMute = () => { muteBtn.setAttribute('aria-pressed', audio.muted); muteBtn.setAttribute('aria-label', audio.muted ? 'Unmute sound' : 'Mute sound'); };
muteBtn.onclick = () => { audio.setMuted(!audio.muted); showMute(); };
showMute();

// ---------- camera ----------
const rig = createRig(camera);
rig.setLimits({ pitch: [-1.35, 0.35], dist: [5, 440] });
rig.set({ target: OVER.target, yaw: -0.5, pitch: -0.7, dist: 440 });

// ---------- input: drag turns, pinch / wheel zoom, tap the ground to glide there ----------
const pointers = new Map(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let drag = null, pinch0 = 0;
function ground(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObject(terrain, false)[0]?.point || null;
}
canvas.addEventListener('pointerdown', (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { canvas.setPointerCapture(e.pointerId); } catch {}
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); drag = null; return; }
  drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: 0 };
});
canvas.addEventListener('pointermove', (e) => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2 && pinch0) { const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y); rig.zoom(pinch0 / d); pinch0 = d; return; }
  if (!drag) return;
  const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
  drag.lx = e.clientX; drag.ly = e.clientY;
  drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
  if (drag.moved > 6) { rig.rotate(-dx * 0.005, -dy * 0.004); canvas.style.cursor = 'grabbing'; hint.style.opacity = 0; }
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch0 = 0;
  if (!drag) return;
  const d = drag; drag = null; canvas.style.cursor = '';
  if (d.moved > 6 || rig.flying) return;
  if (closeCard) { closeCard(); return; }
  const p = ground(e);
  if (!p) return;
  at = null; homeBtn.hidden = false;
  const t0 = rig.goal.target.clone(), d0 = rig.goal.dist, d1 = Math.min(d0, 140);
  animate(0.9, (k) => { rig.goal.target.lerpVectors(t0, p, ease(k)); rig.goal.dist = d0 + (d1 - d0) * ease(k); });
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); rig.zoom(1 + THREE.MathUtils.clamp(e.deltaY, -100, 100) * 0.0012); }, { passive: false });
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (closeCard) closeCard(); else if (at) home(); return; }
  if (e.target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); rig.rotate(k === 'ArrowLeft' ? 0.12 : -0.12, 0); }
  if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); rig.rotate(0, k === 'ArrowUp' ? -0.08 : 0.08); }
  if (k === '+' || k === '=' || k === '-') rig.zoom(k === '-' ? 1.15 : 0.87);
});

// ---------- layout / loop ----------
function resize() {
  if (!innerWidth || !innerHeight) return;
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(innerWidth, innerHeight);
  bloom.resolution.set(innerWidth / 2, innerHeight / 2);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 0.8 ? 62 : 50; // portrait phones see more of the valley
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

progress(0.92, 'Lighting the fire');
await renderer.compileAsync(scene, camera).catch(() => {});
progress(1, 'Ready');
window.__loaded = true;

const clock = new THREE.Clock(), v = new THREE.Vector3(), p = new THREE.Vector3(), lastT = new THREE.Vector3();
const fallsAt = V(FALLS.c.x, 10, FALLS.c.y - FALLS.r1), yardAt = THEN_AT.clone().setY(height(THEN_AT.x, THEN_AT.z));
let frames = 0, slow = 0, shadowDirty = true, lastHalf = 0, shift = 0;
function labels() {
  const hide = !!closeCard || rig.flying;
  labelsEl.classList.toggle('off', hide);
  if (hide) return;
  const W = innerWidth, H = innerHeight, placed = [];
  for (const s of SPOTS) {
    v.copy(s.label).project(camera);
    let show = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && s !== at;
    if (show) { // hidden behind a hill? march from the camera to the label over the height field
      for (let i = 1; i < 24 && show; i++) { p.lerpVectors(camera.position, s.label, i / 24); if (height(p.x, p.z) > p.y + 1) show = false; }
    }
    const x = ((v.x + 1) / 2) * W, y = ((1 - v.y) / 2) * H - 14, w = (s.w ??= s.el.offsetWidth || 120) / 2 + 4, h = 34;
    // crowded (a far-off village): the earlier landmark in the list keeps its place, zooming in shows the rest
    if (show && placed.some((r) => Math.abs(r.x - x) < r.w + w && Math.abs(r.y - y) < h)) show = false;
    if (show) placed.push({ x, y, w });
    s.el.classList.toggle('hide', !show);
    if (show) s.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  }
}
let lastInput = performance.now(), odd = false;
for (const ev of ['pointerdown', 'pointermove', 'wheel', 'keydown']) addEventListener(ev, () => (lastInput = performance.now()), { passive: true });
function frame() {
  // nothing to follow for a while (water still ripples): half the frame rate saves the battery
  if (performance.now() - lastInput > 8000 && !rig.flying && !todTween && (odd = !odd)) return;
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  stepTweens(dt);
  rig.update(dt);
  // keep the camera above the ground and the target inside the valley
  const gy = height(camera.position.x, camera.position.z) + 1.6;
  if (camera.position.y < gy) { camera.position.y = gy; camera.lookAt(rig.cur.target); }
  rig.goal.target.x = THREE.MathUtils.clamp(rig.goal.target.x, -230, 230); rig.goal.target.z = THREE.MathUtils.clamp(rig.goal.target.z, -230, 230);
  sky.mesh.position.copy(camera.position);
  ranges.group.position.set(camera.position.x, 0, camera.position.z);
  // the sun's shadow covers what the camera looks at, finer the closer it is
  const half = THREE.MathUtils.clamp(rig.cur.dist * 0.75, 30, 280);
  key.target.position.copy(rig.cur.target);
  key.position.copy(sunDir).multiplyScalar(600).add(rig.cur.target);
  if (shadowDirty || Math.abs(lastHalf - half) > half * 0.05 || lastT.distanceTo(rig.cur.target) > half * 0.05 || (half < 60 && frames % 3 === 0)) {
    Object.assign(key.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 100, far: 1200 });
    key.shadow.camera.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true; shadowDirty = false;
    lastT.copy(rig.cur.target); lastHalf = half;
  }
  water.tick(dt);
  mist.tick(dt);
  sites.tick(t, dt);
  sky.u.time.value = t;
  bloom.enabled = tod > 0.25; // only the lamps and fire need it
  falls.tick(t, dt);
  village.tick(t, dt, tod);
  // sound follows where you are: the falls roar near them, the then plays near the yard after dark
  const dF = camera.position.distanceTo(fallsAt), dY = camera.position.distanceTo(yardAt);
  audio.set({ falls: 0.05 + 0.85 * (1 - ss(40, 420, dF)) ** 1.5, birds: (1 - tod) * 0.8, crickets: tod * 0.9, then: ss(0.45, 0.85, tod) * (1 - ss(12, 170, dY)) });
  labels();
  // with the note open, the view slides up so the landmark sits in the space above the card
  const want = closeCard ? card.offsetHeight * 0.45 : 0;
  shift += (want - shift) * Math.min(1, dt * 5);
  if (shift > 0.5) camera.setViewOffset(innerWidth, innerHeight, 0, shift, innerWidth, innerHeight); else if (camera.view?.enabled) camera.clearViewOffset();
  composer.render(dt);
  adaptQuality(dt);
}
function adaptQuality(dt) {
  if (++frames < 90) return;
  slow = slow * 0.95 + (dt > 1 / 40 ? 0.05 : 0);
  const pr = renderer.getPixelRatio();
  if (slow > 0.6 && pr > 1) { renderer.setPixelRatio(Math.max(1, pr - 0.25)); slow = 0; frames = 0; resize(); }
}
renderer.setAnimationLoop(frame);

// ---------- intro: the loader lifts, the camera settles over the valley ----------
$('loading').classList.add('done');
setTimeout(() => $('loading').remove(), 1200);
$('header').classList.add('on');
setTimeout(() => $('header').classList.remove('on'), 6000);
rig.fly(OVER, reduceMotion ? 0.01 : 5).then(() => {
  hint.innerHTML = '<b>Kéo</b> để xoay · <b>chụm</b> hoặc <b>cuộn</b> để phóng to · chạm <b>tên địa danh</b> để khám phá<small>Drag to turn · pinch or scroll to zoom · tap a landmark to explore</small>';
});
window.__dbg = { renderer, scene, camera, rig, SPOTS, go, home, setTod, get tod() { return tod; }, skip: () => stepTweens(60), frame }; // tests: skip() finishes every tween, frame() draws one
