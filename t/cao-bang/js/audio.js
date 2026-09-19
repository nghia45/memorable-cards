// Sound, all synthesized in Web Audio: the roar of the falls (louder as you get close), birds by day, crickets at
// dusk, and the then: a plucked đàn tính on a pentatonic scale with a xóc nhạc shaken on the off-beats.
// main.js sets the four levels every frame; nothing plays until the first tap (browser rule).

const PENTA = [0, 2, 5, 7, 9]; // the then's five notes (relative to D)
const hz = (semi) => 293.66 * 2 ** (semi / 12);

export function createAudio() {
  let ctx = null, master, noise, muted = false, hidden = false;
  const bus = {}, level = { falls: 0, birds: 0, crickets: 0, then: 0 };
  try { muted = localStorage.getItem('keepsake-muted') === '1'; } catch {}

  function start() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const d = noise.getChannelData(0);
    let b = 0;
    for (let i = 0; i < d.length; i++) { b = b * 0.97 + (Math.random() * 2 - 1) * 0.3; d[i] = b; } // brownish: a deep roar, not hiss
    for (const k in level) { bus[k] = ctx.createGain(); bus[k].gain.value = 0; bus[k].connect(master); }
    // the falls: two bands of noise, a low rumble and the bright splash on top
    for (const [type, f, v] of [['lowpass', 500, 1.4], ['bandpass', 1800, 0.5]]) {
      const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; s.loop = true; fl.type = type; fl.frequency.value = f; g.gain.value = v;
      s.connect(fl).connect(g).connect(bus.falls); s.start(0, Math.random() * 2);
    }
    setInterval(schedule, 100);
    sync();
  }

  let nextBird = 0, nextCricket = 0, nextNote = 0, beat = 0;
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (level.birds > 0.02 && nextBird < now + 0.3) { // a short phrase of rising chirps
      if (nextBird < now) nextBird = now + 0.1;
      const f = 2400 + Math.random() * 1800, n = 2 + (Math.random() * 4 | 0);
      for (let i = 0; i < n; i++) chirp(f * (1 + i * 0.04), nextBird + i * 0.11, 0.09, bus.birds, 0.03, true);
      nextBird += 0.9 + Math.random() * 2.6;
    }
    if (level.crickets > 0.02 && nextCricket < now + 0.4) {
      if (nextCricket < now) nextCricket = now + 0.05;
      const f = 4200 + Math.random() * 600;
      for (let i = 0; i < 3 + (Math.random() * 3 | 0); i++) chirp(f, nextCricket + i * 0.055, 0.04, bus.crickets, 0.012);
      nextCricket += 0.5 + Math.random() * 0.9;
    }
    if (level.then > 0.02) {
      if (nextNote < now) nextNote = now + 0.05;
      while (nextNote < now + 0.4) {
        const b = beat % 8;
        if (b % 2 === 0 || Math.random() < 0.35) pluck(hz(PENTA[Math.random() * 5 | 0] + (Math.random() < 0.3 ? 12 : 0)), nextNote, bus.then, 0.14);
        if (b === 0) pluck(hz(-12), nextNote, bus.then, 0.1, 2.4);
        if (b % 2 === 1) jingle(nextNote, bus.then);
        nextNote += 0.3; beat++;
      }
    }
  }
  function chirp(f, t, len, out, vol, sweep = false) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f, t);
    if (sweep) o.frequency.exponentialRampToValueAtTime(f * 1.35, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(out); o.start(t); o.stop(t + len + 0.01);
  }
  // đàn tính: a bright plucked string over a gourd body (triangle + octave, a quick filter closing)
  function pluck(f, t, out, vol, len = 1.4) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(), g2 = ctx.createGain();
    o.type = 'triangle'; o2.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t); o2.frequency.setValueAtTime(f * 2, t); g2.gain.value = 0.12;
    lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(f * 8, t); lp.frequency.exponentialRampToValueAtTime(f * 1.4, t + 0.35);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(out);
    o.start(t); o2.start(t); o.stop(t + len); o2.stop(t + len);
  }
  // xóc nhạc: a handful of small bells shaken once
  function jingle(t, out) {
    const hp = ctx.createBiquadFilter(), g = ctx.createGain(), s = ctx.createBufferSource();
    hp.type = 'highpass'; hp.frequency.value = 6000;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    s.buffer = noise; s.connect(hp).connect(g).connect(out); s.start(t, Math.random()); s.stop(t + 0.2);
    for (let i = 0; i < 3; i++) chirp(5200 + Math.random() * 2400, t + i * 0.015, 0.12, out, 0.012);
  }

  function sync() {
    if (!ctx) return;
    master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.08);
    if (muted || hidden) setTimeout(() => (muted || hidden) && ctx.suspend(), 300);
    else ctx.resume();
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; sync(); });
  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, start, { once: true, capture: true });

  return {
    get muted() { return muted; },
    setMuted(m) { muted = m; try { localStorage.setItem('keepsake-muted', m ? '1' : '0'); } catch {} sync(); },
    // levels 0..1; eased so a jump never clicks
    set(l) {
      Object.assign(level, l);
      if (ctx) for (const k in level) bus[k].gain.setTargetAtTime(level[k] * (k === 'then' ? 1.3 : 1), ctx.currentTime, 0.4);
    },
  };
}
