// Sound: two music moods (alley: festive, drum-led; moon: quiet) plus effects synthesized in Web Audio.
// Music: drop audio/alley.mp3 and audio/moon.mp3 next to index.html (seamless loops). Until a file exists, a
// generated placeholder plays for that mood: a plucked pentatonic tune, with a soft trống lân pattern in the alley.
// Browsers only allow sound after a gesture, so nothing starts until the first tap / key press.

const PENTA = [0, 2, 4, 7, 9];
const hz = (semi) => 293.66 * 2 ** (semi / 12); // relative to D4
const DRUM_PATTERN = [1, 0, 1, 0.5, 1, 0, 0.5, 0]; // tùng · tùng cắc tùng · cắc ·  (0.5 = rim "cắc")

export function createAudio() {
  let ctx = null, master, buses = {}, noise, mood = 'alley', crickets, cricketsOn = false, muted = false, hidden = false;
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
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (const m of ['alley', 'moon']) {
      const g = ctx.createGain();
      g.gain.value = m === mood ? 0.5 : 0;
      g.connect(master);
      buses[m] = { gain: g, file: false };
      loadTrack(m);
    }
    crickets = ctx.createGain();
    crickets.gain.value = cricketsOn ? 1 : 0;
    crickets.connect(master);
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

  // ---------- placeholder music + the cricket bed ----------
  let next = 0, beat = 0, nextChirp = 0;
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (cricketsOn && nextChirp < now + 0.4) { // crickets: bursts of short high chirps, two voices
      if (nextChirp < now) nextChirp = now + 0.05;
      const f = 4200 + Math.random() * 600;
      for (let i = 0; i < 3 + (Math.random() * 3 | 0); i++) chirp(f, nextChirp + i * 0.055);
      nextChirp += 0.5 + Math.random() * 0.9;
    }
    const bus = buses[mood];
    if (bus.file) return;
    const alley = mood === 'alley', step = alley ? 0.3 : 0.6;
    if (next < now) next = now + 0.05;
    while (next < now + 0.4) {
      if (alley) { const hit = DRUM_PATTERN[beat % 8]; if (hit) drum(next, hit === 1 ? 0.22 : 0.1, hit !== 1, bus.gain); }
      if (Math.random() < (alley ? (beat % 2 ? 0.25 : 0.7) : 0.5)) {
        const oct = alley ? [0, 12][Math.random() * 2 | 0] : [-12, 0][Math.random() * 2 | 0];
        pluck(hz(PENTA[Math.random() * 5 | 0] + oct), next, bus.gain, alley ? 0.1 : 0.14, Math.random() < 0.25);
      }
      if (!alley && Math.random() < 0.1) pluck(hz(-24), next, bus.gain, 0.12, false, 3.5);
      next += step; beat++;
    }
  }
  function pluck(f, t, out, vol, bend, len = 1.8) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o2.type = 'sine';
    if (bend) { o.frequency.setValueAtTime(f * 0.944, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12); }
    else o.frequency.setValueAtTime(f, t);
    o2.frequency.setValueAtTime(f * 2, t);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + len * 0.5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(out);
    o.start(t); o2.start(t); o.stop(t + len); o2.stop(t + len);
  }
  function chirp(f, t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.012, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.connect(g).connect(crickets); o.start(t); o.stop(t + 0.05);
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
  // Trống lân: a pitched thump (sine falling ~130 → 55 Hz) with a stick click; `rim` is the dry "cắc" on the rim.
  function drum(t, vol, rim, out = master) {
    if (rim) {
      const bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 3;
      env(g, t, 0.002, vol * 2.5, 0.06);
      noiseSrc(t, 0.08).connect(bp).connect(g).connect(out);
      return;
    }
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.25);
    env(g, t, 0.004, vol * 2.2, 0.5);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.55);
    const lp = ctx.createBiquadFilter(), gn = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    env(gn, t, 0.002, vol * 1.2, 0.08);
    noiseSrc(t, 0.1).connect(lp).connect(gn).connect(out);
  }
  const FX = {
    chime(t) { [0, 2, 4].forEach((k, i) => bell(hz(12 + PENTA[k]), t + i * 0.09, 0.07, 2.2)); },
    bell(t) { bell(hz(-12), t, 0.16, 5, [1, 2.4, 3.9, 5.4]); },
    drum(t, v = 1) { drum(t, 0.28 * v, false); },
    cymbal(t) { // chập chả: bright noise, a metallic ring on top
      const hp = ctx.createBiquadFilter(), g = ctx.createGain();
      hp.type = 'highpass'; hp.frequency.value = 5000;
      env(g, t, 0.003, 0.28, 0.7);
      noiseSrc(t, 0.8).connect(hp).connect(g).connect(master);
      bell(3100, t, 0.03, 0.6, [1, 1.47, 2.09, 2.56]);
    },
    paper(t) {
      for (let i = 0; i < 5; i++) {
        const tt = t + i * 0.05 + Math.random() * 0.04, bp = ctx.createBiquadFilter(), g = ctx.createGain();
        bp.type = 'bandpass'; bp.frequency.value = 2500 + Math.random() * 3000; bp.Q.value = 0.8;
        env(g, tt, 0.01, 0.2, 0.09 + Math.random() * 0.08);
        noiseSrc(tt, 0.2).connect(bp).connect(g).connect(master);
      }
    },
    peel(t) { // a wet tear: low noise sweeping up
      const bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = 'bandpass'; bp.Q.value = 2;
      bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(1800, t + 0.35);
      env(g, t, 0.03, 0.35, 0.45);
      noiseSrc(t, 0.5).connect(bp).connect(g).connect(master);
    },
    pop(t) { // soft wooden "tok": a dog segment or clove landing
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(700 + Math.random() * 200, t); o.frequency.exponentialRampToValueAtTime(300, t + 0.08);
      env(g, t, 0.003, 0.12, 0.12);
      o.connect(g).connect(master); o.start(t); o.stop(t + 0.14);
    },
    knock(t) { // wooden mould on the table: a dull "cộc"
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.06);
      env(g, t, 0.002, 0.35, 0.12);
      o.connect(g).connect(master); o.start(t); o.stop(t + 0.14);
      const bp = ctx.createBiquadFilter(), gn = ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = 1200;
      env(gn, t, 0.001, 0.2, 0.04); noiseSrc(t, 0.05).connect(bp).connect(gn).connect(master);
    },
    putt(t) { // the tin boat's tạch tạch: a short metallic tick
      const bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = 3200 + Math.random() * 400; bp.Q.value = 6;
      env(g, t, 0.001, 0.25, 0.03); noiseSrc(t, 0.04).connect(bp).connect(g).connect(master);
    },
    flame(t) { // a match catching: a soft airy whump
      const bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = 'bandpass'; bp.Q.value = 0.7;
      bp.frequency.setValueAtTime(600, t); bp.frequency.exponentialRampToValueAtTime(1600, t + 0.2);
      env(g, t, 0.02, 0.25, 0.4); noiseSrc(t, 0.45).connect(bp).connect(g).connect(master);
    },
    whoosh(t) {
      const bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(1800, t + 0.5); bp.frequency.exponentialRampToValueAtTime(400, t + 1.2);
      env(g, t, 0.4, 0.3, 1.3);
      noiseSrc(t, 1.4).connect(bp).connect(g).connect(master);
    },
  };

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
    setMuted(m) {
      muted = m;
      try { localStorage.setItem('keepsake-muted', m ? '1' : '0'); } catch {}
      sync();
    },
    play(name, v) { if (ctx && !muted && ctx.state === 'running') FX[name](ctx.currentTime + 0.01, v); },
    // mood: 'alley' | 'moon'; crickets adds the courtyard's night insects
    setMood(m, withCrickets = false) {
      mood = m; cricketsOn = withCrickets;
      if (!ctx) return;
      for (const k in buses) buses[k].gain.gain.setTargetAtTime(k === m ? 0.5 : 0, ctx.currentTime, 1.2);
      crickets.gain.setTargetAtTime(withCrickets ? 1 : 0, ctx.currentTime, 1.5);
    },
  };
}
