// Director for "Đêm Rằm": loads stories/<card>/story.json, builds the world and runs the acts.
//   1. Hàng Mã at dusk: walk the lantern street; five stalls stop you for a hands-on craft and a note on it.
//   2. The rooftop: make the pomelo dog, set the moon-watching tray, read the moon, the đèn kéo quân turns
//      your photos; then phá cỗ.
//   3. The parade to the village communal house: lanterns, the lion dance (you beat the drum), the old
//      storyteller whose staff becomes a bridge of moonlight.
//   4. The moon: walk round Cuội's banyan and his story, Hằng Nga, the jade rabbit, the Nghê Thường dancers.
//   5. A banyan leaf falls home with your message.
// Every act lets the viewer drag to turn a full circle (orbit what's in front, or look around while walking).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { stepTweens, animate, wait, ease, easeOut, lerp } from './tween.js';
import { createSky, createMoon, MOON_DIR } from './world.js';
import { streetMaterials } from './street.js';
import { createHangMa, STOPS, FACADE, EYE } from './hangma.js';
import { createStops } from './stops.js';
import { createRooftop } from './roof.js';
import { createPomelo } from './pomelo.js';
import { createMemoryLantern } from './keoquan.js';
import { createDinh, LION_AT } from './dinh.js';
import { createMoonWorld, R as MR, EYE as MEYE, SPOTS, END } from './moonworld.js';
import { TABLE_TOP } from './roof.js';
import { singleLantern, tickLanterns, lanternGlow } from './lanterns.js';
import { createAudio } from './audio.js';
import { createRig } from './rig.js';
import { createUI } from './ui.js';
import { glowScale } from './tex.js';
import { glowTex } from './print.js';

const $ = (id) => document.getElementById(id);
const progress = (v, label) => window.__progress?.(v, label);
const breathe = () => new Promise((r) => setTimeout(r));
const MAX_MEMORIES = 6;
const ui = createUI();
const headerEl = $('header'), nextBtn = $('next'), replayBtn = $('replay');

// ---------- sound ----------
const audio = createAudio();
const muteBtn = $('mute');
const showMute = () => { muteBtn.setAttribute('aria-pressed', audio.muted); muteBtn.setAttribute('aria-label', audio.muted ? 'Unmute sound' : 'Mute sound'); };
muteBtn.onclick = () => { audio.setMuted(!audio.muted); showMute(); };
showMute();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ambient = reduceMotion ? 0.15 : 1;

// ---------- story ----------
async function loadStory() {
  const id = new URLSearchParams(location.search).get('card') || 'demo';
  if (!/^[\w-]{1,64}$/.test(id)) throw new Error(`Invalid card id "${id}"`);
  const base = `stories/${id}/`;
  const res = await (window.__storyReq || fetch(base + 'story.json', { cache: 'no-cache' }));
  if (!res.ok) throw new Error(`Card "${id}" not found (${res.status})`);
  const raw = await res.json();
  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const mems = Array.isArray(raw.memories) ? raw.memories : [];
  if (mems.length > MAX_MEMORIES) console.warn(`story.json has ${mems.length} memories; only the first ${MAX_MEMORIES} are used.`);
  const memories = mems.slice(0, MAX_MEMORIES).map((m) => ({ photo: str(m.photo, 200), date: str(m.date, 40), caption: str(m.caption, 160) }));
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
    title: str(raw.title, 80) || 'Trung Thu năm ấy',
    message: str(raw.message, 220) || 'Chúc bạn một mùa Trung Thu đoàn viên, ấm áp và tròn đầy như trăng rằm!',
    memories,
  };
}

let story;
try {
  [story] = await Promise.all([
    loadStory(),
    Promise.all(['600 40px "Playfair Display"', 'italic 500 40px "Playfair Display"', '400 20px "Be Vietnam Pro"', '700 20px "Be Vietnam Pro"', '600 40px "Dancing Script"']
      .map((f) => document.fonts.load(f, 'TrungThu Đèn'))).catch(() => {}),
  ]);
} catch (err) {
  $('loading').textContent = err.message;
  throw err;
}
progress(0.68, 'Opening the shops');
await breathe();

// ---------- renderer / scene / post ----------
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(innerWidth || 1, innerHeight || 1, false);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x2a3050, 0.018);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.3;
const camera = new THREE.PerspectiveCamera(50, 1, 0.03, 600);
scene.add(camera);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.55, 0.82);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vignette: { value: 0.38 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float time, vignette; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 d = vUv - 0.5;
      c *= 1.0 - vignette * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
      c += (hash(vUv * 1000.0) - 0.5) * 0.024;
      gl_FragColor = vec4(c, 1.0);
    }`,
});
composer.addPass(grade);

// ---------- sky, moon, light ----------
const sky = createSky();
const moon = createMoon();
scene.add(sky.mesh, moon.group);
const key = new THREE.DirectionalLight(0xb4c4ff, 0.9);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 60 });
scene.add(key, key.target);
const hemi = new THREE.HemisphereLight(0x6a78c8, 0x3a2a24, 1.0);
scene.add(hemi);
// the look of each act: sky, moon placement, light levels, fog
const LOOKS = {
  street: { dusk: 1, moon: [0.06, 0.2, -1], moonTint: [2.6, 2.1, 1.5], key: 0.55, hemi: 1.25, hemiSky: 0x7a88d0, fog: [0x3a3a60, 0.016], exposure: 1.15 },
  dinh: { dusk: 0.12, moon: [0.12, 0.5, -1], moonTint: [2.6, 2.4, 2.0], key: 0.8, hemi: 0.8, hemiSky: 0x4a5aa8, fog: [0x1a2044, 0.012], exposure: 1.1 },
  moon: { dusk: 0, space: 1, bright: 0, moon: [0.55, 0.7, 0.35], moonTint: [2.5, 2.35, 2.05], key: 1.5, hemi: 0.55, hemiSky: 0x7a8ad0, fog: [0x04050c, 0.004], exposure: 1.15 },
  roof: { dusk: 0.3, moon: [-0.3, 0.05, -1], moonTint: [2.5, 2.35, 2.05], key: 0.8, hemi: 0.75, hemiSky: 0x4a5aa8, fog: [0x1c2244, 0.011], exposure: 1.1 },
};
function setLook(name) {
  const L = LOOKS[name];
  sky.dusk = L.dusk; sky.space = L.space || 0; sky.bright = L.bright ?? 1;
  moon.group.visible = !L.space;
  MOON_DIR.set(...L.moon).normalize();
  moon.tint(...L.moonTint);
  key.intensity = L.key; hemi.intensity = L.hemi; hemi.color.set(L.hemiSky);
  scene.fog.color.set(L.fog[0]); scene.fog.density = L.fog[1];
  renderer.toneMappingExposure = L.exposure;
}

// ---------- act 1 set ----------
const mats = streetMaterials();
const street = createHangMa(mats);
scene.add(street.group);
progress(0.8, 'Hanging the lanterns');
await breathe();
const stops = createStops(STOPS, FACADE, audio);
stops.forEach((s) => street.group.add(s.group));

// ---------- act 2 set: the rooftop, far from the street (only one set is visible at a time) ----------
const ROOF_AT = new THREE.Vector3(300, 0, 0);
const roof = createRooftop(mats);
roof.group.position.copy(ROOF_AT);
scene.add(roof.group);
const pomelo = createPomelo();
pomelo.group.position.copy(roof.board);
pomelo.group.rotation.y = -0.4;
roof.group.add(pomelo.group);
const keo = createMemoryLantern(story.memories);
keo.group.position.copy(roof.keoAt);
roof.group.add(keo.group);
const roofW = (x, y, z) => new THREE.Vector3(x, y, z).add(ROOF_AT);
// ---------- act 3 set: the village yard; act 4: the moon (its top surface sits at y = 0) ----------
const DINH_AT = new THREE.Vector3(600, 0, 0);
const dinh = createDinh(mats);
dinh.group.position.copy(DINH_AT);
scene.add(dinh.group);
const carpHit = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
scene.add(carpHit);
progress(0.89, 'Opening the village gate');
await breathe();
const MOON_C = new THREE.Vector3(-600, -MR, 0);
const moonW = createMoonWorld();
moonW.group.position.copy(MOON_C);
scene.add(moonW.group);
progress(0.86, 'Setting out the tray');
await breathe();

// The star lantern you made, carried on its stick for the rest of the evening (it rides with the camera).
const held = new THREE.Group();
{
  const lan = singleLantern('star', new THREE.Color(0xff2418));
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.007, 0.8, 5).translate(0, -0.4, 0), new THREE.MeshStandardMaterial({ color: 0xd4ad6a, roughness: 0.55 }));
  stick.position.y = -0.16;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff7040, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 }));
  halo.scale.setScalar(0.9);
  const light = new THREE.PointLight(0xff5a30, 0, 5, 1.6);
  held.add(lan, stick, halo, light);
  held.userData = { light, lan };
  held.scale.setScalar(0.42);
  held.visible = false;
  camera.add(held);
}
const HELD_AT = new THREE.Vector3(0.3, -0.24, -0.72);

// ---------- camera ----------
const rig = createRig(camera);
const baseFov = () => (camera.aspect >= 1 ? 52 : 52 + (1 - camera.aspect) * 30);
function fitDist(base, width) {
  const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
  return Math.max(base, (width / 2) / halfW);
}
const wrapAngle = (a) => THREE.MathUtils.euclideanModulo(a + Math.PI, Math.PI * 2) - Math.PI;

// ---------- interaction plumbing shared by every act ----------
// waitTap(targets, { hint, scrub, next }) resolves { hit, k0 } on a tap on one of `targets` (any tap if null),
// Enter, a drag on a target that scrubs past halfway, or the Continue button (hit = null) when `next` is set.
let pending = null, mode = 'look', idle = 0;
function waitTap(targets, { hint, scrub, next } = {}) {
  if (hint != null) ui.hint(hint);
  nextBtn.hidden = !next;
  document.body.classList.toggle('nav', !!next);
  return new Promise((res) => { pending = { targets, scrub, res }; });
}
function resolvePending(v) {
  if (!pending) return;
  const p = pending; pending = null;
  nextBtn.hidden = true; document.body.classList.remove('nav');
  p.res({ hit: null, k0: 0, ...v });
}
nextBtn.onclick = () => resolvePending({ next: true });
const ctx = { camera, rig, ui, audio, waitTap, play: animate, get held() { return held; } };

// ---------- walking (the street, the parade lane, the moon) ----------
// walk({ point(u), heading(u), stops: [{ u, run }], speed, tick(u, dt) }) resolves at the end of the path.
// The walk pauses at each stop until its run() resolves, then the viewer is set back on the path.
const WALK = { u: 0, uTarget: 0, next: 0, active: false, cfg: null };
function walkHint() { ui.hint('<span>↑</span>Swipe up or scroll to walk · drag sideways to look around'); }
function walk(cfg) {
  Object.assign(WALK, { u: 0, uTarget: 0, next: 0, cfg, active: true });
  mode = 'walk';
  rig.setLimits({ pitch: [-0.5, 0.9], dist: [0.01, 0.01] });
  walkHint();
  return new Promise((res) => (WALK.onEnd = res));
}
async function resumeWalk() {
  const c = WALK.cfg, u = WALK.u;
  rig.setLimits({ pitch: [-0.5, 0.9], dist: [0.01, 0.01] });
  await rig.fly({ target: c.point(u), yaw: c.heading(u), pitch: 0.06, dist: 0.01 }, 1.5);
  mode = 'walk'; idle = 0; walkHint();
  WALK.active = true;
}
function tickWalk(dt) {
  const c = WALK.cfg;
  if (c?.tick) c.tick(WALK.u, dt);
  if (!WALK.active) return;
  const cap = WALK.next < c.stops.length ? c.stops[WALK.next].u : 1;
  if (idle > 2.5) WALK.uTarget += dt * (c.speed || 0.016);
  WALK.uTarget = THREE.MathUtils.clamp(WALK.uTarget, 0, cap);
  WALK.u += (WALK.uTarget - WALK.u) * Math.min(1, dt * 1.6);
  rig.goal.target.copy(c.point(Math.min(WALK.u, 1)));
  if (idle > 3) {
    rig.goal.yaw += wrapAngle(c.heading(WALK.u) - rig.goal.yaw) * Math.min(1, dt * 0.8);
    rig.goal.pitch += ((c.pitch ?? 0.06) - rig.goal.pitch) * Math.min(1, dt * 0.8);
  }
  if (WALK.next < c.stops.length && WALK.u >= cap - 0.002) {
    WALK.active = false;
    const st = c.stops[WALK.next++];
    st.run().then(resumeWalk);
  } else if (WALK.next >= c.stops.length && WALK.u > 0.995) { WALK.active = false; WALK.onEnd?.(); }
}

// ---------- act 1: Hàng Mã ----------
function stopPose(st) {
  const p = st.pose, target = st.group.localToWorld(p.target.clone());
  return { target, yaw: st.group.rotation.y, pitch: p.pitch, dist: fitDist(p.dist, 0.9) };
}
async function visitStop(st) {
  mode = 'orbit';
  ui.title(null, false);
  await rig.fly(stopPose(st), 1.8);
  rig.setLimits({ pitch: [-1.1, 0.5], dist: [0.5, 3.2] });
  audio.play('chime');
  await st.run(ctx);
  if (st.id === 'star') await takeLantern(st);
  ui.hint('');
  await ui.fact(st.id);
}
async function takeLantern(st) {
  // the finished lantern floats up to your hand
  const lan = st.lantern, from = lan.getWorldPosition(new THREE.Vector3()), q0 = lan.getWorldQuaternion(new THREE.Quaternion());
  scene.attach(lan);
  audio.play('whoosh');
  await animate(1.2, (k) => {
    const e = ease(k), to = camera.localToWorld(HELD_AT.clone());
    lan.position.lerpVectors(from, to, e);
    lan.quaternion.slerpQuaternions(q0, camera.quaternion, e);
    lan.scale.setScalar(lerp(1, 0.42, e));
  });
  lan.visible = false;
  held.visible = true;
  held.userData.light.intensity = 1.6;
}
async function actStreet() {
  setOnly('street'); setLook('street');
  rig.set({ target: street.path.getPointAt(0), yaw: street.heading(0), pitch: 0.08, dist: 0.01 });
  ui.title(`<p>Gửi ${esc(story.to)}</p><h2>${esc(story.title)}</h2>`, true);
  setTimeout(() => ui.title(null, false), 7000);
  await walk({
    point: (u) => street.path.getPointAt(u), heading: street.heading,
    stops: stops.map((st) => ({ u: street.zToU(st.z + 1.2), run: () => visitStop(st) })),
  });
}

// ---------- act 2: the rooftop ----------
const roofPose = (yaw = 0) => ({ target: roofW(0, 0.55, 0.05), yaw, pitch: -0.42, dist: fitDist(3.0, 2.8) });
function setOnly(set) { street.group.visible = set === 'street'; roof.group.visible = set === 'roof'; dinh.group.visible = set === 'dinh'; moonW.group.visible = set === 'moon'; }
let dim = 0;
async function actRoof() {
  mode = 'none'; ui.hint('');
  await ui.fade(true, 900);
  setOnly('roof'); setLook('roof');
  held.visible = false; held.userData.light.intensity = 0;
  rig.setLimits({ pitch: [-1.15, 0.35], dist: [1.0, 6.5] });
  rig.set(roofPose(0.5));
  audio.setMood('alley', true);
  mode = 'orbit';
  ui.title('<p>Sân thượng nhà mình</p><h2>Rằm tháng Tám</h2>', true);
  await ui.fade(false, 1100);
  rig.fly(roofPose(0.15), 3);
  ui.hint('<b>Bà:</b> “Cháu làm con chó bưởi cho bà nhé!”');
  await wait(3.2);
  ui.title(null, false);
  await makeDog();
  await setTray();
  await watchMoon();
  await memoryLantern();
  await phaCo();
}
const POM_HINTS = ['<span>✋</span>Tap the pomelo to score the peel<br><small>or drag it up · drag elsewhere to look around</small>', '<span>✋</span>Tap to lift out the segments', '<span>✋</span>Tap to give the dog its eyes and tail'];
async function makeDog() {
  const bw = pomelo.group.getWorldPosition(new THREE.Vector3());
  await rig.fly({ target: bw.clone().add(new THREE.Vector3(0.12, 0.14, 0)), yaw: 0.2, pitch: -0.55, dist: fitDist(1.3, 1.1) }, 2.2);
  for (let step = 0; step < 3; step++) {
    const { k0 } = await waitTap([pomelo.hit], { hint: POM_HINTS[step], scrub: (k) => pomelo.set(step, k) });
    ui.hint('');
    const dur = [2.2, 3.0, 1.8][step];
    let popped = 0;
    await animate(dur * (1 - k0), (k) => {
      const kk = lerp(k0, 1, k);
      pomelo.set(step, kk);
      if (step === 0 && popped === 0 && kk > 0.35) { popped = 1; audio.play('peel'); }
      if (step === 1) { const n = Math.floor(Math.max(0, kk - 0.35) / 0.065); while (popped < Math.min(10, n)) { popped++; audio.play('pop'); } }
      if (step === 2 && popped < 2 && kk > 0.3 + popped * 0.2) { popped++; audio.play('pop'); }
    });
  }
  audio.play('chime');
  await wait(1);
  // the dog hops onto the table
  pomelo.adoptEyes();
  const dog = pomelo.dog;
  scene.attach(dog);
  const p0 = dog.position.clone(), p1 = roof.group.localToWorld(roof.DOG_AT.clone()), r0 = dog.rotation.y;
  rig.fly(roofPose(0.1), 3);
  await animate(2.4, (k) => {
    const e = ease(k);
    dog.position.lerpVectors(p0, p1, e);
    dog.position.y += Math.abs(Math.sin(k * Math.PI * 4)) * 0.1 * (1 - k * 0.3) + Math.sin(e * Math.PI) * 0.15;
    dog.rotation.y = lerp(r0, 0.4, Math.min(1, k * 2));
    if (Math.floor(k * 4) !== Math.floor((k - 0.01) * 4)) audio.play('pop');
  });
  roof.group.attach(dog);
  await animate(0.8, (k) => pomelo.group.scale.setScalar(Math.max(0.001, 1 - ease(k))));
  pomelo.group.visible = false;
  await ui.fact('dog');
}
async function setTray() {
  const left = roof.slots.slice();
  left.forEach((s) => (s.spark.userData.on = true));
  while (left.length) {
    const { hit } = await waitTap(left.map((s) => s.hit), { hint: `<span>✋</span>Tap a glowing spot to set the tray · ${roof.slots.length - left.length} / ${roof.slots.length}<br><small>Drag to walk round the family</small>` });
    const s = hit ? left.find((x) => x.hit === hit) : left[0];
    left.splice(left.indexOf(s), 1);
    s.set = true; s.spark.material.opacity = 0;
    s.item.visible = true;
    const y0 = s.item.position.y;
    audio.play('pop');
    await animate(0.7, (k) => { s.item.position.y = y0 + (1 - easeOutBounce(k)) * 0.4; });
    ui.hint(s.line);
    if (s.id === 'tiensi') await ui.fact('tiensi');
    else await wait(0.9);
  }
  audio.play('chime');
  await ui.fact('tray');
}
const easeOutBounce = (k) => { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375; return n * (k -= 2.625 / d) * k + 0.984375; };
async function watchMoon() {
  // sit at the edge of the mat and watch it come up over the neighbours' roofs
  const from = new THREE.Vector3(-0.3, 0.05, -1).normalize(), to = new THREE.Vector3(-0.22, 0.36, -1).normalize();
  const yawOf = (d) => Math.atan2(-d.x, -d.z), pitchOf = (d) => Math.asin(d.y);
  ui.hint('<b>Ông:</b> “Trăng lên rồi kìa!”');
  rig.setLimits({ pitch: [-0.6, 1.2], dist: [0.01, 0.01] });
  await rig.fly({ target: roofW(0.1, 0.95, 1.4), yaw: yawOf(from), pitch: pitchOf(from) + 0.05, dist: 0.01 }, 2.4);
  mode = 'look';
  audio.play('bell');
  await animate(6, (k) => {
    MOON_DIR.copy(from).lerp(to, ease(k)).normalize();
    rig.goal.pitch = rig.cur.pitch = pitchOf(MOON_DIR) * 0.85 + 0.02;
    rig.goal.yaw = rig.cur.yaw = yawOf(MOON_DIR);
  });
  await waitTap([moon.disc], { hint: '<span>✋</span>Tap the moon to read its colour, as farmers did<br><small>Drag to look around the rooftops</small>' });
  const c0 = new THREE.Color(2.5, 2.35, 2.05), c1 = new THREE.Color(2.7, 2.2, 1.35);
  await animate(1.6, (k) => moon.tint(...c0.clone().lerp(c1, ease(k)).toArray()));
  ui.hint('<b>Trăng vàng!</b> Năm nay được mùa tằm tơ.');
  await ui.fact('moon');
  mode = 'orbit';
  rig.setLimits({ pitch: [-1.15, 0.35], dist: [1.0, 6.5] });
}
async function memoryLantern() {
  const kw = keo.group.getWorldPosition(new THREE.Vector3());
  await rig.fly({ target: kw.clone().add(new THREE.Vector3(0, 0.45, 0)), yaw: 0.9, pitch: -0.15, dist: fitDist(2.2, 1.6) }, 2.4);
  ui.hint('<b>Ông</b> thắp chiếc đèn kéo quân…');
  audio.play('flame');
  await animate(2.5, (k) => { keo.lit = ease(k); dim = ease(k); });
  audio.setMood('moon', true);
  const N = story.memories.length;
  for (let i = 0; i < N; i++) {
    await waitTap([keo.hit], { hint: `<span>✋</span>Tap the lantern: it turns to a memory · ${i} / ${N}<br><small>Drag to turn round: the shadows run along the walls</small>` });
    ui.hint('');
    audio.play('paper');
    await keo.present(i, camera.position);
    audio.play('chime');
    await ui.memory(story.memories[i], { index: i, total: N });
  }
  keo.spin();
  await ui.fact('keoquan');
  await animate(2, (k) => (dim = 1 - ease(k) * 0.6));
}
async function phaCo() {
  await rig.fly(roofPose(-0.2), 2.2);
  const trayHit = roof.slots.map((s) => s.item);
  await waitTap(null, { hint: '<span>✋</span>Tap anywhere: <b>phá cỗ!</b><br><small>Eight o’clock, the moon is up</small>' });
  audio.play('cymbal'); audio.play('drum');
  // everyone reaches in; the kids by the railing come running with their lanterns
  roof.family.forEach((p, i) => { const a0 = p.arms[1].sh.rotation.x; animate(0.8, (k) => (p.arms[1].sh.rotation.x = lerp(a0, -1.3, Math.sin(k * Math.PI)))); });
  const k0 = roof.kids.map((k) => k.g.position.clone());
  await animate(2.2, (k) => roof.kids.forEach((kid, i) => {
    const e = ease(k), to = new THREE.Vector3(0.6 + i * 0.5, 0, -1.4);
    kid.g.position.lerpVectors(k0[i], to, e);
    kid.g.rotation.y = Math.atan2(to.x - k0[i].x, to.z - k0[i].z);
    kid.tick(performance.now() / 1000, 1 - Math.abs(k - 0.5) * 0.4);
  }));
  ui.hint('<b>Chị:</b> “Đi rước đèn thôi!”');
  await ui.fact('letter', { button: 'Đi rước đèn' });
}

// yaw/pitch that look from the camera at a world point
function lookAtPose(p) {
  const d = p.clone().sub(camera.position);
  return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.asin(THREE.MathUtils.clamp(d.y / d.length(), -1, 1)) };
}
async function lookAt(p, dur = 1.2) { const lp = lookAtPose(p); await rig.fly({ target: rig.cur.target.clone(), ...lp, dist: 0.01 }, dur); }

// ---------- act 3: the lantern parade and the village yard ----------
const DP = (u) => dinh.path.getPointAt(THREE.MathUtils.clamp(u, 0, 1)).add(DINH_AT);
const DH = (u) => { const t = dinh.path.getTangentAt(THREE.MathUtils.clamp(u, 0.001, 0.999)); return Math.atan2(-t.x, -t.z); };
async function actParade() {
  mode = 'none'; ui.hint('');
  await ui.fade(true, 900);
  setOnly('dinh'); setLook('dinh');
  held.visible = true; held.userData.light.intensity = 1.6;
  rig.set({ target: DP(0), yaw: DH(0), pitch: 0.06, dist: 0.01 });
  audio.setMood('alley');
  ui.title('<p>Rước đèn</p><h2>Tết của thiếu nhi</h2>', true);
  setTimeout(() => ui.title(null, false), 5000);
  await ui.fade(false, 1100);
  await walk({
    point: DP, heading: DH, speed: 0.028,
    tick: (u) => dinh.tickParade(u, now, WALK.active && Math.abs(WALK.uTarget - WALK.u) > 0.002 ? 1 : 0.15),
    stops: [{ u: 0.3, run: carpStop }],
  });
  await lionDance();
  await storyteller();
}
async function carpStop() {
  mode = 'look';
  const hang = dinh.carpKid.k.lantern.hang;
  await lookAt(hang.getWorldPosition(new THREE.Vector3()), 1.2);
  carpHit.position.copy(hang.getWorldPosition(new THREE.Vector3()));
  await waitTap([carpHit], { hint: '<span>✋</span>Tap the carp lantern<br><small>Drag to look around the parade</small>' });
  audio.play('chime');
  await ui.fact('carp');
}
// the drum: each beat is one move of the lion; eight beats, then it reaches for the lộc
const MOVES = [
  (s, k) => (s.bow = Math.sin(k * Math.PI) * 0.8),                              // bow low, sniff
  (s, k) => (s.lift = Math.sin(k * Math.PI) * 0.8),                             // rear up
  (s, k) => (s.turn = Math.sin(k * Math.PI * 2) * 0.55),                        // shake the head
  (s, k) => (s.hop = Math.sin(k * Math.PI) * 0.35),                             // hop
  (s, k) => (s.clack = Math.max(0, Math.sin(k * Math.PI * 4))),                  // snap the jaw
  (s, k) => { s.tilt = Math.sin(k * Math.PI) * 0.35; s.turn = Math.sin(k * Math.PI) * -0.4; }, // cock the head
];
async function lionDance() {
  mode = 'orbit';
  const L = dinh.lion, s = L.state;
  rig.setLimits({ pitch: [-0.9, 0.5], dist: [2.2, 9] });
  await rig.fly({ target: DINH_AT.clone().add(LION_AT).add(new THREE.Vector3(0.2, 1.1, -0.6)), yaw: 0.1, pitch: -0.1, dist: fitDist(5.2, 4.2) }, 2.2);
  audio.play('cymbal');
  const BEATS = 8;
  for (let i = 0; i < BEATS; i++) {
    await waitTap([dinh.drumHit, L.hit], { hint: `<span>🥁</span>Tap the drum: the lion dances to your beat · ${i} / ${BEATS}<br><small>Drag to walk round the lion</small>` });
    audio.play('drum'); if (i % 4 === 3) audio.play('cymbal');
    s.drum = 1; s.dancing = true;
    const move = MOVES[i % MOVES.length];
    await animate(0.6, (k) => { move(s, k); s.step += 0.06; });
    s.dancing = false;
  }
  // the finale: lân ăn lộc, the lion reaches up for the red envelope and the lettuce
  ui.hint('<b>Lân ăn lộc!</b>');
  const lionG = L.lion, p0 = lionG.position.clone(), r0 = lionG.rotation.y;
  const locLocal = dinh.loc.position.clone().sub(LION_AT); locLocal.y = 0;
  const reach = locLocal.clone().multiplyScalar(0.55);
  s.walk = 1;
  await animate(1.6, (k) => { const e = ease(k); lionG.position.lerpVectors(p0, reach, e); lionG.rotation.y = lerp(r0, Math.atan2(locLocal.x, locLocal.z) - 0.15, e); if (Math.floor(k * 6) !== Math.floor((k - 0.02) * 6)) audio.play('drum', 0.6); });
  s.walk = 0; s.dancing = true;
  await animate(1.4, (k) => { s.lift = Math.sin(Math.min(1, k * 1.4) * Math.PI / 2) * 1.0; s.clack = k > 0.6 ? Math.max(0, Math.sin(k * 30)) : 0; });
  audio.play('cymbal'); audio.play('drum');
  await animate(0.4, (k) => { const sc = Math.max(0.001, 1 - k); dinh.env.scale.setScalar(sc); dinh.lettuce.scale.setScalar(sc); });
  await animate(1.6, (k) => { s.lift = 1 - ease(k); s.bow = Math.sin(k * Math.PI) * 0.9; s.step += 0.05; });
  s.dancing = false;
  await ui.fact('lion');
}
async function storyteller() {
  const tw = dinh.teller.g.getWorldPosition(new THREE.Vector3());
  await rig.fly({ target: tw.clone().add(new THREE.Vector3(0.3, 0.8, 0)), yaw: 1.3, pitch: -0.12, dist: fitDist(2.8, 2.2) }, 2.4);
  await waitTap([dinh.tellerHit], { hint: '<span>✋</span>Sit with the children: tap the old storyteller<br><small>Drag to look round the yard</small>' });
  await ui.fact('ruocden', { button: 'Nghe tiếp' });
  ui.hint('<b>Ông:</b> “Pháp sư ném cây gậy lên trời, gậy hóa thành một chiếc cầu bạc…”');
  // the staff flies up and becomes a bridge of moonlight
  const staff = dinh.staff, from = staff.getWorldPosition(new THREE.Vector3());
  scene.attach(staff);
  const start = tw.clone().add(new THREE.Vector3(1.6, 0.05, 0.4));
  const dirH = new THREE.Vector3(MOON_DIR.x, 0, MOON_DIR.z).normalize();
  const curve = new THREE.CatmullRomCurve3([start, start.clone().addScaledVector(dirH, 4).add(new THREE.Vector3(0, 1.2, 0)), start.clone().addScaledVector(MOON_DIR, 40), start.clone().addScaledVector(MOON_DIR, 160), start.clone().addScaledVector(MOON_DIR, 420)]);
  dinh.buildBridge(curve);
  audio.play('whoosh');
  await lookAt(start.clone().addScaledVector(MOON_DIR, 20), 0.1);
  await animate(1.6, (k) => {
    staff.position.copy(from).addScaledVector(MOON_DIR, ease(k) * 30).y += Math.sin(k * Math.PI) * 3;
    staff.rotation.z = k * 14; staff.rotation.x = k * 5;
    staff.scale.setScalar(1 - k * 0.7);
  });
  staff.visible = false;
  audio.play('bell');
  await animate(1.8, (k) => (dinh.bridgeMat.opacity = ease(k)));
  // walk up it; the moon grows as you climb, the town falls away
  rig.set({ target: curve.getPointAt(0).add(new THREE.Vector3(0, EYE, 0)), yaw: rig.cur.yaw, pitch: 0.2, dist: 0.01 });
  const BU = 0.7;
  const P = (u) => curve.getPointAt(u * BU).add(new THREE.Vector3(0, EYE, 0));
  const H = (u) => { const t = curve.getTangentAt(Math.min(0.999, u * BU)); return Math.atan2(-t.x, -t.z); };
  ui.hint('');
  await walk({
    point: P, heading: H, speed: 0.07, pitch: 0.3,
    tick: (u) => { moon.group.scale.setScalar(1 + u * u * 7); sky.dusk = LOOKS.dinh.dusk * (1 - u); sky.space = u * 0.8; scene.fog.density = LOOKS.dinh.fog[1] * (1 - u * 0.8); },
    stops: [],
  });
  ui.hint('<span>↑</span>Keep climbing the bridge of moonlight…');
  WALK.cfg = null;
  await ui.fade(true, 1400, '#fffdf4');
}

// ---------- act 4: the moon ----------
const MTOP = MOON_C.clone().add(new THREE.Vector3(0, MR + MEYE, 0));
const mStop = (id) => (SPOTS[id] - 0.1) / END;
async function actMoon() {
  setOnly('moon'); setLook('moon');
  moon.group.scale.setScalar(1); moon.group.visible = false;
  held.visible = true;
  rig.set({ target: MTOP, yaw: 0, pitch: 0.05, dist: 0.01 });
  audio.setMood('moon');
  ui.title('<p>Cung trăng</p><h2>Nơi chú Cuội ngồi gốc cây đa</h2>', true);
  await ui.fade(false, 1600, '#fffdf4');
  setTimeout(() => ui.title(null, false), 5000);
  await walk({
    point: () => MTOP, heading: () => 0, speed: 0.022, pitch: 0.02,
    tick: (u) => (moonW.walk = u * END),
    stops: [
      ...['cuoi1', 'cuoi2', 'cuoi3'].map((id) => ({ u: mStop(id), run: () => boardStop(id) })),
      { u: mStop('hang'), run: hangStop },
      { u: mStop('dancers'), run: danceStop },
      { u: mStop('cuoi4'), run: cuoiStop },
    ],
  });
}
async function boardStop(id) {
  mode = 'look';
  const bd = moonW.boards[id];
  await lookAt(bd.art.getWorldPosition(new THREE.Vector3()), 1.4);
  await waitTap([bd.hit], { hint: '<span>✋</span>Tap the painting to hear this part of the story<br><small>Drag to look around the moon</small>' });
  audio.play('paper');
  const m = bd.art.material;
  await animate(0.8, (k) => (m.emissiveIntensity = 0.35 + Math.sin(k * Math.PI) * 0.5));
  await ui.fact(id);
}
async function hangStop() {
  mode = 'look';
  await lookAt(moonW.hang.g.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0.6, 1.1, 0)), 1.4);
  await waitTap([moonW.rabbitHit], { hint: '<span>✋</span>Tap the jade rabbit<br><small>Drag to look at the palace</small>' });
  moonW.pound = 2.4;
  for (let i = 0; i < 6; i++) setTimeout(() => audio.play('knock'), i * 350);
  ui.hint('<b>Thỏ Ngọc</b> giã thuốc trường sinh: cộc, cộc, cộc…');
  await wait(2.4);
  await waitTap([moonW.hangHit], { hint: '<span>✋</span>Tap chị Hằng' });
  audio.play('chime');
  await ui.fact('hang');
}
async function danceStop() {
  mode = 'look';
  await lookAt(moonW.dance.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.9, 0)), 1.4);
  await waitTap([moonW.danceHit], { hint: '<span>✋</span>Tap the dancers<br><small>Drag to look around</small>' });
  moonW.spin = 5; audio.play('chime'); audio.play('bell');
  ui.hint('<b>Khúc Nghê Thường</b>: the fairies whirl faster…');
  await wait(1.5);
  await ui.fact('nghethuong');
}
async function cuoiStop() {
  mode = 'look';
  await lookAt(moonW.cuoiG.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.8, 0)), 1.6);
  await waitTap([moonW.cuoiHit], { hint: '<span>✋</span>Tap chú Cuội, sitting under his banyan<br><small>Drag to look up at the tree</small>' });
  audio.play('chime');
  await ui.fact('cuoi4', { button: 'Chào chú Cuội' });
}

// ---------- act 5: a leaf falls home ----------
async function ending() {
  mode = 'none';
  const leaf = moonW.leaf;
  const cw = moonW.cuoiG.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.1, 0));
  leaf.position.copy(cw); leaf.visible = true;
  ui.hint('<b>Chú Cuội:</b> “Mỗi năm cây đa rụng một chiếc lá. Chiếc lá năm nay, chú gửi về nhà cháu.”');
  audio.play('chime');
  const hover = camera.position.clone().addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 1.3).add(new THREE.Vector3(0, 0.1, 0));
  await animate(2.2, (k) => { const e = ease(k); leaf.position.lerpVectors(cw, hover, e); leaf.rotation.set(Math.sin(k * 6) * 0.4, k * 3, Math.sin(k * 4) * 0.3); });
  await wait(1.2);
  // it drifts off toward the Earth, and we follow it down
  const earthAt = moonW.earth.getWorldPosition(new THREE.Vector3());
  audio.play('whoosh');
  const lp = lookAtPose(earthAt);
  rig.fly({ target: rig.cur.target.clone(), ...lp, dist: 0.01 }, 2.5);
  await animate(3, (k) => { leaf.position.lerpVectors(hover, earthAt, ease(k) * 0.15); leaf.rotation.y += 0.05; });
  await ui.fade(true, 1400, '#fffdf4');
  leaf.visible = false;
  // home: the rooftop, the family looking up; the moon now shows Cuội under his tree
  setOnly('roof'); setLook('roof');
  MOON_DIR.set(-0.22, 0.36, -1).normalize();
  moon.group.visible = true; moon.figures = 0.6;
  moon.tint(2.7, 2.3, 1.6);
  held.visible = false; held.userData.light.intensity = 0;
  keo.lit = 0.6; dim = 0.2;
  roof.family.forEach((p) => (p.body.rotation.x = -0.25));
  const trayLeaf = leaf.clone(); trayLeaf.visible = true;
  roof.group.add(trayLeaf);
  const land = new THREE.Vector3(0.12, TABLE_TOP + 0.03, 0.12);
  rig.setLimits({ pitch: [-1.1, 0.6], dist: [1.2, 6.5] });
  rig.set({ target: roofW(0, 0.9, 0), yaw: 0.05, pitch: 0.12, dist: fitDist(3.2, 2.8) });
  mode = 'orbit';
  await ui.fade(false, 1600, '#fffdf4');
  audio.play('bell');
  await animate(3.5, (k) => { const e = ease(k); trayLeaf.position.set(land.x + Math.sin(k * 7) * 0.3 * (1 - k), lerp(2.6, land.y, e), land.z); trayLeaf.rotation.set(-Math.PI / 2 * e + Math.sin(k * 9) * 0.5 * (1 - k), k * 4, 0); });
  audio.play('chime');
  ui.hint('<small>Drag to look around · the moon is up</small>');
  await ui.message({ to: story.to, from: story.from, message: story.message });
  replayBtn.hidden = false;
  document.body.classList.add('nav');
}

// ---------- the story, act by act ----------
function escapeHtmlLocal(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
const esc = escapeHtmlLocal;
const START = new URLSearchParams(location.search).get('act'); // ?act=street|roof|parade|moon skips the start screen
const ACTS = [
  ['street', actStreet, '🏮', 'Phố Hàng Mã', 'Làm đèn ông sao, nặn tò he, chọn mặt nạ'],
  ['roof', actRoof, '🥮', 'Sân thượng', 'Chó bưởi, mâm cỗ, ngắm trăng, đèn kéo quân'],
  ['parade', actParade, '🥁', 'Rước đèn về sân đình', 'Đèn cá chép, múa lân, nghe kể chuyện'],
  ['moon', actMoon, '🌕', 'Cung trăng', 'Chú Cuội, chị Hằng, Thỏ Ngọc'],
];
// Start screen: begin from the start, or open the chain of chapter cards and pick one. Resolves the chapter index.
function chooseStart() {
  const el = $('start');
  el.innerHTML = `<div class="pane home"><p class="sub">Gửi ${esc(story.to)}</p><h2>${esc(story.title)}</h2>
      <button type="button" class="big primary" data-act="0">Bắt đầu từ đầu</button>
      <button type="button" class="big" data-go="map">Chọn chương →</button></div>
    <div class="pane map"><p class="sub">Chọn chương</p>
      <ol class="chain">${ACTS.map(([, , ic, name, what], i) => `<li><button type="button" data-act="${i}"><span class="n">${i + 1}</span><span class="ic" aria-hidden="true">${ic}</span><span><b>${name}</b><small>${what}</small></span></button></li>`).join('')}</ol>
      <button type="button" data-go="home">← Quay lại</button></div>`;
  el.hidden = false;
  setTimeout(() => el.querySelector('.primary').focus({ preventScroll: true }), 50);
  return new Promise((res) => {
    el.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.go) { el.classList.toggle('map', b.dataset.go === 'map'); el.querySelector(b.dataset.go === 'map' ? '.chain button' : '.primary').focus({ preventScroll: true }); return; }
      el.classList.add('done');
      setTimeout(() => el.remove(), 800);
      res(+b.dataset.act);
    };
  });
}
async function run() {
  const from = START ? Math.max(0, ACTS.findIndex(([id]) => id === START)) : await chooseStart();
  for (let i = from; i < ACTS.length; i++) await ACTS[i][1]();
  await ending();
}
replayBtn.onclick = () => location.reload();

// ---------- input: tap to act, drag to turn (360°), wheel/pinch to zoom or walk, arrows too ----------
const ndc = new THREE.Vector2(), ray = new THREE.Raycaster();
const pointers = new Map();
let drag = null, pinch0 = 0;
function pick(e, targets) {
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height || !targets?.length) return null;
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObjects(targets, false)[0]?.object || null;
}
function tap(e) {
  idle = 0;
  if (ui.cardOpen) return;
  if (pending) {
    if (!pending.targets) return resolvePending({});
    const hit = pick(e, pending.targets);
    if (hit) resolvePending({ hit });
    return;
  }
  if (mode === 'walk') WALK.uTarget += 0.03;
}
canvas.addEventListener('pointerdown', (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic or already-released pointer */ }
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); drag = null; return; }
  let dm = 'cam', hit = null;
  if (pending?.scrub && (hit = pick(e, pending.targets))) dm = 'scrub';
  drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, u: WALK.uTarget, moved: 0, mode: dm, hit, k: 0 };
  idle = 0;
});
canvas.addEventListener('pointermove', (e) => {
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return;
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2 && pinch0) { const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (mode !== 'walk') rig.zoom(pinch0 / d); pinch0 = d; return; }
  if (!drag) { canvas.style.cursor = pending?.targets && pick(e, pending.targets) ? 'pointer' : 'grab'; return; }
  const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
  drag.lx = e.clientX; drag.ly = e.clientY;
  drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
  idle = 0;
  const up = (drag.y - e.clientY) / r.height;
  if (drag.mode === 'scrub') { if (pending?.scrub) { drag.k = THREE.MathUtils.clamp(up * 2.4, 0, 1); pending.scrub(drag.k); } return; }
  canvas.style.cursor = 'grabbing';
  const first = rig.cur.dist < 0.2, sgn = first ? 1 : -1;
  if (mode === 'walk') {
    WALK.uTarget = drag.u + up * 0.25;
    rig.rotate(dx * 0.005, 0);
  } else rig.rotate(sgn * dx * 0.006, sgn * dy * 0.005);
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch0 = 0;
  if (!drag) return;
  const d = drag; drag = null;
  canvas.style.cursor = '';
  if (d.moved < 8) { tap(e); return; }
  if (d.mode === 'scrub' && pending?.scrub) {
    if (d.k > 0.5) resolvePending({ hit: d.hit, k0: d.k });
    else { const sc = pending.scrub, k = d.k; animate(0.3, (t) => sc(lerp(k, 0, t))); }
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  idle = 0;
  if (mode === 'walk') WALK.uTarget += e.deltaY * 0.0004;
  else rig.zoom(1 + THREE.MathUtils.clamp(e.deltaY, -100, 100) * 0.0012);
}, { passive: false });
canvas.addEventListener('keydown', (e) => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); const first = rig.cur.dist < 0.2; rig.rotate((k === 'ArrowLeft' ? 1 : -1) * (first ? 0.15 : -0.15), 0); idle = 0; return; }
  if (k === 'ArrowUp' || k === 'ArrowDown') {
    e.preventDefault(); idle = 0;
    if (mode === 'walk') WALK.uTarget += k === 'ArrowUp' ? 0.03 : -0.03;
    else rig.rotate(0, k === 'ArrowUp' ? 0.1 : -0.1);
    return;
  }
  if (k === '+' || k === '=' || k === '-') { rig.zoom(k === '-' ? 1.12 : 0.9); return; }
  if (k !== 'Enter' && k !== ' ') return;
  e.preventDefault(); idle = 0;
  if (pending) resolvePending({ hit: pending.targets?.[0] || null });
  else if (mode === 'walk') WALK.uTarget += 0.05;
});

// ---------- layout / loop ----------
function resize() {
  if (!innerWidth || !innerHeight) return;
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(innerWidth, innerHeight);
  bloomPass.resolution.set(innerWidth / 2, innerHeight / 2);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = baseFov();
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

setLook('street');
setOnly(START ? 'none' : 'street');
rig.set({ target: street.path.getPointAt(0), yaw: street.heading(0), pitch: 0.08, dist: 0.01 });
progress(0.92, 'Lighting the candles');
held.visible = true; roof.group.visible = dinh.group.visible = moonW.group.visible = true; moonW.leaf.visible = true; keo.lit = 1; roof.slots.forEach((sl) => (sl.item.visible = true));
await renderer.compileAsync(scene, camera).catch(() => {});
roof.group.visible = dinh.group.visible = moonW.group.visible = false; moonW.leaf.visible = false; keo.lit = 0; roof.slots.forEach((sl) => (sl.item.visible = false));
scene.traverse((o) => { for (const m of [].concat(o.material || [])) for (const k in m) if (m[k]?.isTexture) renderer.initTexture(m[k]); });
held.visible = false;
performance.mark('compiled');
progress(1, 'Ready');
window.__loaded = true;

const clock = new THREE.Clock();
const focus = new THREE.Vector3(), lastQ = new THREE.Quaternion(), sway = new THREE.Vector2();
let frames = 0, revealed = false, slow = 0;
let now = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  now = t;
  stepTweens(dt);
  idle += dt;
  tickWalk(dt);
  rig.update(dt);
  sky.mesh.position.copy(camera.position);
  moon.follow(camera);
  focus.copy(rig.cur.target); focus.y = 0;
  key.position.copy(MOON_DIR).multiplyScalar(30).add(focus);
  key.target.position.copy(focus);
  sky.tick(t);
  tickLanterns(t);
  if (street.group.visible) { street.tick(t, dt, ambient, camera.position); for (const s of stops) s.tick(t, dt); }
  if (dinh.group.visible) { dinh.tick(t, dt, ambient); dinh.lion.update(t, dt, ambient); }
  if (moonW.group.visible) moonW.tick(t, dt);
  if (roof.group.visible) {
    roof.tick(t, dt, ambient);
    pomelo.tick(t, !pomelo.group.visible);
    keo.tick(t, dt);
    // the kéo quân scene: everything else dims so its shadows can play on the walls
    hemi.intensity = LOOKS.roof.hemi * (1 - dim * 0.7); key.intensity = LOOKS.roof.key * (1 - dim * 0.8);
    roof.lamp.intensity *= 1 - dim * 0.85; glowScale.value = 1 - dim * 0.7; lanternGlow.value = 1 - dim * 0.5;
  }
  // the carried lantern lags a little behind the turn of the head and bobs with the steps
  if (held.visible) {
    const q = camera.quaternion, dq = lastQ.clone().invert().multiply(q), e = new THREE.Euler().setFromQuaternion(dq);
    sway.x += (-e.y * 6 - sway.x) * Math.min(1, dt * 5); sway.y += (e.x * 6 - sway.y) * Math.min(1, dt * 5);
    const bob = WALK.active ? Math.sin(t * 6) * 0.01 : 0;
    held.position.set(HELD_AT.x + sway.x * 0.05, HELD_AT.y + bob + sway.y * 0.03, HELD_AT.z);
    held.rotation.set(Math.sin(t * 1.3) * 0.06, Math.sin(t * 0.8) * 0.3 + sway.x * 0.6, Math.sin(t * 1.7) * 0.08 - sway.x * 0.4);
    held.userData.light.intensity = 1.6 * (0.9 + Math.sin(t * 11) * 0.06 + Math.sin(t * 5) * 0.04);
  }
  lastQ.copy(camera.quaternion);
  renderer.shadowMap.autoUpdate = frames % 2 === 0;
  keo.light.shadow.autoUpdate = keo.lit > 0 && roof.group.visible;
  grade.uniforms.time.value = t % 10;
  composer.render(dt);
  if (!revealed) reveal();
  adaptQuality(dt);
}
function adaptQuality(dt) {
  if (++frames < 90) return;
  slow = slow * 0.95 + (dt > 1 / 40 ? 0.05 : 0);
  const pr = renderer.getPixelRatio();
  if (slow > 0.6 && pr > 1) { renderer.setPixelRatio(Math.max(1, pr - 0.25)); slow = 0; frames = 0; resize(); }
}
function reveal() {
  revealed = true;
  $('loading').classList.add('done');
  setTimeout(() => $('loading').remove(), 1200);
}
renderer.setAnimationLoop(frame);
run();
window.__dbg = { WALK, rig, stops, roof, keo, pomelo, dinh, moonW, resolvePending, get pending() { return pending; }, ui, camera, scene };
