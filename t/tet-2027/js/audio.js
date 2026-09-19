// Sound: two music moods (night, dawn) plus effects synthesized in Web Audio, so nothing downloads but the music.
// Music: drop audio/night.mp3 and audio/dawn.mp3 next to index.html (seamless loops). If a file is missing,
// a generated đàn tranh-style placeholder plays for that mood instead.
// Browsers only allow sound after a gesture, so nothing starts until the first tap / key press.

const PENTA = [0, 2, 4, 7, 9]; // major pentatonic, the usual Tết folk colour
const hz = (semi) => 293.66 * 2 ** (semi / 12); // relative to D4

export function createAudio() {
  let ctx = null, master, buses = {}, noise, mood = 'night', water, riverOn = true, muted = false, hidden = false;
  try { muted = localStorage.getItem('keepsake-muted') === '1'; } catch {}

  function start() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0, b = 0; i < d.length; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); d[i] = b * 6; } // soft brown-ish noise
    for (const m of ['night', 'dawn']) {
      const g = ctx.createGain();
      g.gain.value = m === mood ? 0.5 : 0;
      g.connect(master);
      buses[m] = { gain: g, file: false };
      loadTrack(m);
    }
    water = makeWater();
    water.gain.value = riverOn ? 0.22 : 0;
    setInterval(schedule, 100);
    sync();
  }

  async function loadTrack(m) {
    try {
      const res = await fetch(`audio/${m}.mp3`);
      if (!res.ok) return; // no file yet: the placeholder keeps playing
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.connect(buses[m].gain);
      src.start();
      buses[m].file = true;
    } catch { /* keep the placeholder */ }
  }

  // ---------- placeholder music: plucked, bending pentatonic notes with a low root now and then ----------
  let next = 0;
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    const night = mood === 'night';
    const bus = buses[mood];
    if (bus.file) return;
    if (next < ctx.currentTime) next = ctx.currentTime + 0.05;
    while (next < ctx.currentTime + 0.4) {
      const beat = night ? 0.75 : 0.5;
      if (Math.random() < (night ? 0.55 : 0.7)) {
        const oct = night ? [-12, 0][Math.random() * 2 | 0] : [0, 12][Math.random() * 2 | 0];
        pluck(hz(PENTA[Math.random() * 5 | 0] + oct), next, bus.gain, night ? 0.16 : 0.13, Math.random() < 0.25);
      }
      if (Math.random() < 0.08) pluck(hz(night ? -24 : -12), next, bus.gain, 0.12, false, 3.5); // low root, now and then
      next += beat * (Math.random() < 0.2 ? 1.5 : 1);
    }
  }
  function pluck(f, t, out, vol, bend, len = 1.8) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o2.type = 'sine';
    if (bend) { o.frequency.setValueAtTime(f * 0.944, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12); } // đàn tranh slide into the note
    else o.frequency.setValueAtTime(f, t);
    o2.frequency.setValueAtTime(f * 2, t);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + len * 0.5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(out);
    o.start(t); o2.start(t); o.stop(t + len); o2.stop(t + len);
  }

  // ---------- effects ----------
  function noiseSrc(t, dur) {
    const s = ctx.createBufferSource();
    s.buffer = noise; s.loop = true;
    s.start(t, Math.random() * 1.5); s.stop(t + dur);
    return s;
  }
  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function bell(f, t, vol, dur, partials = [1, 2.01, 3.02, 4.2]) {
    partials.forEach((p, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f * p;
      env(g, t, 0.004, vol / (i + 1), dur / (1 + i * 0.6));
      o.connect(g).connect(master); o.start(t); o.stop(t + dur);
    });
  }
  function makeWater() { // gentle lapping: lowpassed noise with a slow swell
    const lp = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.4;
    g.gain.value = 0;
    const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
    lfo.frequency.value = 0.18; depth.gain.value = 260;
    lfo.connect(depth).connect(lp.frequency);
    s.connect(lp).connect(g).connect(master);
    s.start(); lfo.start();
    return g;
  }
  const FX = {
    chime(t) { [0, 2, 4].forEach((k, i) => bell(hz(12 + PENTA[k]), t + i * 0.09, 0.07, 2.2)); },
    bell(t) { bell(hz(-12), t, 0.16, 5, [1, 2.4, 3.9, 5.4]); },
    paper(t) {
      for (let i = 0; i < 5; i++) {
        const tt = t + i * 0.05 + Math.random() * 0.04, bp = ctx.createBiquadFilter(), g = ctx.createGain();
        bp.type = 'bandpass'; bp.frequency.value = 2500 + Math.random() * 3000; bp.Q.value = 0.8;
        env(g, tt, 0.01, 0.35, 0.09 + Math.random() * 0.08);
        noiseSrc(tt, 0.2).connect(bp).connect(g).connect(master);
      }
    },
    clink(t, v = 1) { bell(2600 + Math.random() * 1200, t, 0.05 * v, 0.25, [1, 2.76, 5.4]); },
    whoosh(t) {
      const bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(1800, t + 0.5); bp.frequency.exponentialRampToValueAtTime(400, t + 1.2);
      env(g, t, 0.4, 0.5, 1.3);
      noiseSrc(t, 1.4).connect(bp).connect(g).connect(master);
    },
  };

  function sync() { // master level follows mute; suspend when silent or hidden to save battery
    if (!ctx) return;
    master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.08);
    if (muted || hidden) setTimeout(() => (muted || hidden) && ctx.suspend(), 300);
    else ctx.resume();
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; sync(); });
  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, start, { once: true, capture: true });

  return {
    get muted() { return muted; },
    setMuted(m) {
      muted = m;
      try { localStorage.setItem('keepsake-muted', m ? '1' : '0'); } catch {}
      sync();
    },
    play(name, v) { if (ctx && !muted && ctx.state === 'running') FX[name](ctx.currentTime + 0.01, v); },
    // mood: 'night' | 'dawn'; river adds the water bed
    setMood(m, river = false) {
      mood = m; riverOn = river;
      if (!ctx) return;
      for (const k in buses) buses[k].gain.gain.setTargetAtTime(k === m ? 0.5 : 0, ctx.currentTime, 1.2);
      water.gain.setTargetAtTime(river ? 0.22 : 0, ctx.currentTime, 1.5);
    },
  };
}
