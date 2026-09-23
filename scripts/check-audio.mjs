// Checks the Trung Thu sound against a stubbed Web Audio API: run with `node scripts/check-audio.mjs`.
import assert from 'node:assert';

const nodes = [], notes = [], pans = [];
let now = 0, tick = null;

const param = (name, owner) => ({
  _v: 0,
  get value() { return this._v; },
  set value(v) { this._v = v; if (name === 'pan') pans.push(v); },
  setValueAtTime(v, t) { rec(name, owner, v, t); return this; },
  linearRampToValueAtTime(v, t) { rec(name, owner, v, t); return this; },
  exponentialRampToValueAtTime(v, t) { rec(name, owner, v, t); return this; },
  setTargetAtTime(v, t) { rec(name, owner, v, t); return this; },
});
function rec(name, owner, v, t) {
  assert.ok(Number.isFinite(v) && Number.isFinite(t), `${owner}.${name} got a non-finite value/time: ${v} @ ${t}`);
  assert.ok(t >= now - 1e-6, `${owner}.${name} scheduled in the past: ${t} < ${now}`);
  if (name === 'frequency' && owner === 'osc') notes.push({ f: v, t });
}
const node = (kind) => {
  const n = {
    kind, frequency: param('frequency', kind), gain: param('gain', kind), pan: param('pan', kind),
    Q: param('Q', kind), threshold: param('threshold', kind), knee: param('knee', kind),
    ratio: param('ratio', kind), attack: param('attack', kind), release: param('release', kind),
    type: '', buffer: null, loop: false,
    connect: (t) => t, start() {}, stop() {},
  };
  nodes.push(n);
  return n;
};
class Ctx {
  constructor() { this.sampleRate = 44100; this.state = 'running'; this.destination = node('dest'); }
  get currentTime() { return now; }
  createGain() { return node('gain'); }
  createOscillator() { return node('osc'); }
  createBiquadFilter() { return node('filter'); }
  createBufferSource() { return node('src'); }
  createStereoPanner() { return node('pan'); }
  createConvolver() { return node('conv'); }
  createDynamicsCompressor() { return node('comp'); }
  createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len), length: len }; }
  resume() {} suspend() {}
}

globalThis.window = { AudioContext: Ctx };
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.document = { addEventListener() {}, hidden: false };
globalThis.addEventListener = (ev, fn) => { if (ev === 'pointerdown') globalThis.__gesture = fn; };
globalThis.fetch = async () => ({ ok: false });
globalThis.setInterval = (fn) => { tick = fn; return 0; };
globalThis.setTimeout = (fn) => { fn(); return 0; };

const { createAudio } = await import(new URL('../t/trung-thu-2026/js/audio.js', import.meta.url).href);
const audio = createAudio();
globalThis.__gesture();                       // the first tap builds the graph

assert.ok(nodes.some((n) => n.kind === 'conv'), 'no reverb in the chain');
assert.ok(nodes.some((n) => n.kind === 'comp'), 'no limiter in the chain');

// twenty seconds of each chapter's music
const run = (label, secs) => {
  const before = notes.length;
  for (let i = 0; i < secs * 10; i++) { now += 0.1; tick(); }
  const n = notes.length - before;
  console.log(`${label}: ${n} notes over ${secs}s`);
  assert.ok(n > secs * 1.5, `${label} is too sparse: ${n} notes in ${secs}s`);
  return n;
};
for (const m of ['street', 'roof', 'parade', 'moon']) { audio.setMood(m, m === 'roof'); run(m.padEnd(6), 20); }
for (const name of ['chime', 'bell', 'drum', 'cymbal', 'paper', 'peel', 'pop', 'thung', 'knock', 'putt', 'flame', 'whoosh']) audio.play(name);

const f = notes.map((n) => n.f).filter((v) => v > 0);
const lo = Math.min(...f), hi = Math.max(...f);
console.log(`pitch range ${lo.toFixed(1)}–${hi.toFixed(1)} Hz · ${pans.length} panned sources, ${Math.min(...pans).toFixed(2)}..${Math.max(...pans).toFixed(2)}`);
assert.ok(lo > 40 && hi < 8000, `pitches out of range: ${lo}–${hi}`);
assert.ok(pans.length > 20, 'nothing is being panned');
assert.ok(Math.min(...pans) >= -1 && Math.max(...pans) <= 1, 'pan out of the legal -1..1');
assert.ok(Math.max(...pans) - Math.min(...pans) > 0.5, 'the stereo field is too narrow to hear');
console.log('ok');
