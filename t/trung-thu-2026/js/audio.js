// Sound: two music moods (alley: festive, drum-led; moon: quiet) plus effects synthesized in Web Audio.
// Music: drop audio/alley.mp3 and audio/moon.mp3 next to index.html (seamless loops). Until a file exists, a
// generated placeholder plays for that mood: a four-bar pentatonic tune over a moving bass root, with a
// trống lân pattern in the alley and a sáo-like sustained voice on the moon.
// The whole mix runs through a reverb (a generated impulse: the walls of the alley) into a limiter, and
// effects are scattered across the stereo field so the stalls aren't all in the middle of your head.
// Browsers only allow sound after a gesture, so nothing starts until the first tap / key press.

// Tune these by ear: how loud it runs into the limiter, how long the room rings, and how much of the
// music and of the effects get sent into it. The drums want to stay dry or the alley turns to mud.
const VOL = 1.4, TAIL = 1.7, WET_MUSIC = 0.12, WET_FX = 0.3;
const PENTA = [0, 2, 4, 7, 9];           // điệu Bắc, the everyday pentatonic: D E F♯ A B
const hz = (semi) => 293.66 * 2 ** (semi / 12); // relative to D4
const deg = (i) => PENTA[((i % 5) + 5) % 5] + Math.floor(i / 5) * 12; // scale degree → semitones, in any octave
// Four bars that circle home: D · Bm · G · A. The melody lands on a chord tone at the end of each one.
const ROOTS = [0, -3, -7, -5];
const LAND = [0, 4, 1, 3];               // the degree to land on, per bar: D · B · E · A
const MOTIF = [[0, 2, 3, 5], [0, 1, 3, 4, 6], [0, 3, 4, 6]]; // where the notes fall in an eight-step bar
const PHRASE = [0, 1, 0, 2];             // the third bar asks again what the first asked; the fourth answers
const DRUMS = [                          // tùng · tùng cắc tùng · cắc ·   (0.5 = the dry "cắc" on the rim)
  [1, 0, 1, 0.5, 1, 0, 0.5, 0],
  [1, 0, 0.5, 0, 1, 0.5, 1, 0],
  [1, 0, 1, 0.5, 1, 0, 0.5, 0],
  [1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5],      // the fill that closes the cycle
];
// how wide each effect scatters: the small handmade sounds spread, the drums and the bell stay in front
const SPREAD = { paper: 0.55, pop: 0.5, putt: 0.65, knock: 0.4, chime: 0.3, cymbal: 0.35, peel: 0.3, flame: 0.25 };

export function createAudio() {
  let ctx = null, master, rev, fx, buses = {}, noise, mood = 'alley', crickets, cricketsOn = false, muted = false, hidden = false;
  try { muted = localStorage.getItem('keepsake-muted') === '1'; } catch {}

  function start() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    // master → limiter → out, with a tap into the reverb so the sounds have somewhere to ring
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -8; lim.knee.value = 0; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.25;
    lim.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = muted ? 0 : VOL;
    master.connect(lim);
    rev = ctx.createConvolver();
    rev.buffer = impulse(TAIL, 2.4);
    rev.connect(lim);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (const m of ['alley', 'moon']) {
      const g = ctx.createGain();
      g.gain.value = m === mood ? 0.5 : 0;
      g.connect(master); sendRev(g, WET_MUSIC);
      buses[m] = { gain: g, file: false };
      loadTrack(m);
    }
    crickets = ctx.createGain();
    crickets.gain.value = cricketsOn ? 1 : 0;
    crickets.connect(master); sendRev(crickets, WET_FX);
    setInterval(schedule, 100);
    sync();
  }

  // a room to ring in: noise that decays and darkens as it goes, after a short gap for the walls
  function impulse(sec, decay) {
    const n = Math.floor(ctx.sampleRate * sec), gap = Math.floor(ctx.sampleRate * 0.018);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = gap; i < n; i++) {
        const t = i / n;
        lp += ((Math.random() * 2 - 1) - lp) * (0.5 - t * 0.38);
        d[i] = lp * (1 - t) ** decay;
      }
    }
    return buf;
  }
  const sendRev = (node, amt) => { const g = ctx.createGain(); g.gain.value = amt; node.connect(g).connect(rev); };
  const panner = (p) => { const n = ctx.createStereoPanner?.(); if (!n) return ctx.createGain(); n.pan.value = p; return n; };

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

  // ---------- generated music + the cricket bed ----------
  let nextBar = 0, bar = 0, nextChirp = 0, mDeg = 2;
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (cricketsOn && nextChirp < now + 0.4) { // crickets: bursts of short high chirps, somewhere out there
      if (nextChirp < now) nextChirp = now + 0.05;
      const f = 4200 + Math.random() * 600, p = Math.random() * 1.6 - 0.8;
      for (let i = 0; i < 3 + (Math.random() * 3 | 0); i++) chirp(f, nextChirp + i * 0.055, p);
      nextChirp += 0.5 + Math.random() * 0.9;
    }
    const bus = buses[mood];
    if (bus.file) return;
    const alley = mood === 'alley', step = alley ? 0.3 : 0.62;
    if (nextBar < now) nextBar = now + 0.1;
    while (nextBar < now + 0.5) { playBar(nextBar, step, bar++, bus.gain, alley); nextBar += step * 8; }
  }
  // the melody wanders by step, mostly, and comes to rest on a note of the bar's chord
  const spot = (d) => Math.max(-0.55, Math.min(0.55, (d - 3) * 0.13)); // higher notes sit further right
  function playBar(t0, step, b, out, alley) {
    const m = MOTIF[PHRASE[b % 4]], root = ROOTS[b % 4];
    pluck(hz(root - 12), t0, out, alley ? 0.16 : 0.12, false, alley ? 2.6 : 4.5);
    if (alley) pluck(hz(root - 5), t0 + step * 4, out, 0.09, false, 2.2);
    else if (b % 4 === 0) flute(hz(root - 12), t0, step * 8, 0.04, out, 0); // a drone under the quiet bars
    m.forEach((s, i) => {
      if (i === m.length - 1) mDeg = LAND[b % 4] + (mDeg > 4 ? 5 : 0);
      else mDeg += (mDeg > 5 ? -1 : mDeg < 1 ? 1 : Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.25 ? 2 : 1);
      const t = t0 + s * step;
      if (alley) pluck(hz(deg(mDeg)), t, out, 0.11, Math.random() < 0.2, 1.8, spot(mDeg));
      else if (i % 2 === 0) flute(hz(deg(mDeg)), t, step * 2.2, 0.07, out, spot(mDeg));
    });
    if (!alley) return;
    const pat = DRUMS[b % 4];
    for (let i = 0; i < 8; i++) if (pat[i]) drum(t0 + i * step, pat[i] === 1 ? 0.2 : 0.09, pat[i] !== 1, out);
  }
  function pluck(f, t, out, vol, bend, len = 1.8, p = 0) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o2.type = 'sine';
    if (bend) { o.frequency.setValueAtTime(f * 0.944, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12); }
    else o.frequency.setValueAtTime(f, t);
    o2.frequency.setValueAtTime(f * 2, t);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + len * 0.5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(panner(p)).connect(out);
    o.start(t); o2.start(t); o.stop(t + len); o2.stop(t + len);
  }
  // sáo trúc: a breathy sine that leans into the note and wavers as it holds
  function flute(f, t, dur, vol, out, p = 0) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), pn = panner(p);
    o.type = 'sine'; o2.type = 'sine';
    o.frequency.setValueAtTime(f * 0.993, t); o.frequency.linearRampToValueAtTime(f, t + 0.2);
    o2.frequency.value = f * 2;
    const vib = ctx.createOscillator(), vg = ctx.createGain();
    vib.frequency.value = 5.2; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.007, t + dur * 0.5);
    vib.connect(vg).connect(o.frequency); vib.start(t); vib.stop(t + dur);
    const g2 = ctx.createGain(); g2.gain.value = 0.12;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.22);
    g.gain.setValueAtTime(vol, t + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); o2.connect(g2).connect(g); g.connect(pn).connect(out);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
    const bp = ctx.createBiquadFilter(), bg = ctx.createGain(); // the breath across the mouthpiece
    bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 1.2;
    bg.gain.setValueAtTime(0.0001, t); bg.gain.exponentialRampToValueAtTime(vol * 0.3, t + 0.2); bg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    noiseSrc(t, dur).connect(bp).connect(bg).connect(pn);
  }
  function chirp(f, t, p = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.012, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.connect(g).connect(panner(p)).connect(crickets); o.start(t); o.stop(t + 0.05);
  }

  // ---------- effects ----------
  // Each effect is played through `fx`, a panner set fresh for it, so repeated taps and pops scatter.
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
      o.connect(g).connect(fx); o.start(t); o.stop(t + dur);
    });
  }
  // Trống lân: a pitched thump (sine falling ~130 → 55 Hz) with a stick click; `rim` is the dry "cắc" on the rim.
  function drum(t, vol, rim, out = fx) {
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
      noiseSrc(t, 0.8).connect(hp).connect(g).connect(fx);
      bell(3100, t, 0.03, 0.6, [1, 1.47, 2.09, 2.56]);
    },
    paper(t) {
      for (let i = 0; i < 5; i++) {
        const tt = t + i * 0.05 + Math.random() * 0.04, bp = ctx.createBiquadFilter(), g = ctx.createGain();
        bp.type = 'bandpass'; bp.frequency.value = 2500 + Math.random() * 3000; bp.Q.value = 0.8;
        env(g, tt, 0.01, 0.2, 0.09 + Math.random() * 0.08);
        noiseSrc(tt, 0.2).connect(bp).connect(g).connect(fx);
      }
    },
    peel(t) { // a wet tear: low noise sweeping up
      const bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = 'bandpass'; bp.Q.value = 2;
      bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(1800, t + 0.35);
      env(g, t, 0.03, 0.35, 0.45);
      noiseSrc(t, 0.5).connect(bp).connect(g).connect(fx);
    },
    pop(t) { // soft wooden "tok": a dog segment or clove landing
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(700 + Math.random() * 200, t); o.frequency.exponentialRampToValueAtTime(300, t + 0.08);
      env(g, t, 0.003, 0.12, 0.12);
      o.connect(g).connect(fx); o.start(t); o.stop(t + 0.14);
    },
    thung(t, v = 1) { // trống quân: a stick on the stretched rope, the barrel booming under it: "thình"
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(95 * v, t); o.frequency.exponentialRampToValueAtTime(62 * v, t + 0.35);
      env(g, t, 0.004, 0.32, 0.55);
      o.connect(g).connect(fx); o.start(t); o.stop(t + 0.6);
      const bp = ctx.createBiquadFilter(), g2 = ctx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 2;
      env(g2, t, 0.002, 0.25, 0.08);
      noiseSrc(t, 0.1).connect(bp).connect(g2).connect(fx);
    },
    knock(t) { // wooden mould on the table: a dull "cộc"
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.06);
      env(g, t, 0.002, 0.35, 0.12);
      o.connect(g).connect(fx); o.start(t); o.stop(t + 0.14);
      const bp = ctx.createBiquadFilter(), gn = ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = 1200;
      env(gn, t, 0.001, 0.2, 0.04); noiseSrc(t, 0.05).connect(bp).connect(gn).connect(fx);
    },
    putt(t) { // the tin boat's tạch tạch: a short metallic tick
      const bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = 3200 + Math.random() * 400; bp.Q.value = 6;
      env(g, t, 0.001, 0.25, 0.03); noiseSrc(t, 0.04).connect(bp).connect(g).connect(fx);
    },
    flame(t) { // a match catching: a soft airy whump
      const bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = 'bandpass'; bp.Q.value = 0.7;
      bp.frequency.setValueAtTime(600, t); bp.frequency.exponentialRampToValueAtTime(1600, t + 0.2);
      env(g, t, 0.02, 0.25, 0.4); noiseSrc(t, 0.45).connect(bp).connect(g).connect(fx);
    },
    whoosh(t) {
      const bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(1800, t + 0.5); bp.frequency.exponentialRampToValueAtTime(400, t + 1.2);
      env(g, t, 0.4, 0.3, 1.3);
      noiseSrc(t, 1.4).connect(bp).connect(g).connect(fx);
    },
  };

  function sync() {
    if (!ctx) return;
    master.gain.setTargetAtTime(muted ? 0 : VOL, ctx.currentTime, 0.08);
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
    // play('pop') · play('drum', 0.6) · play('paper', 1, -0.4) to place it yourself
    play(name, v, p) {
      if (!ctx || muted || ctx.state !== 'running') return;
      fx = panner(p ?? (Math.random() * 2 - 1) * (SPREAD[name] || 0));
      fx.connect(master); sendRev(fx, WET_FX);
      FX[name](ctx.currentTime + 0.01, v);
    },
    // mood: 'alley' | 'moon'; crickets adds the courtyard's night insects
    setMood(m, withCrickets = false) {
      mood = m; cricketsOn = withCrickets;
      if (!ctx) return;
      nextBar = 0; // the new mood starts on a bar of its own
      for (const k in buses) buses[k].gain.gain.setTargetAtTime(k === m ? 0.5 : 0, ctx.currentTime, 1.2);
      crickets.gain.setTargetAtTime(withCrickets ? 1 : 0, ctx.currentTime, 1.5);
    },
  };
}
