// Overlay UI: the hint line, the "Góc tìm hiểu" fact card, the memory card (photo + caption), the act title,
// full-screen fades, and the mask the viewer puts on at the mask stall. Everything here is plain DOM.
import { FACTS } from './facts.js';
import { t, label, lang } from './lang.js';

// Where a legend comes from: Vietnamese Trung Thu mixes its own tales with ones borrowed from China.
const ORIGIN = { vn: 'originVn', cn: 'originCn' };
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function createUI() {
  const hint = $('hint'), card = $('fact'), title = $('title'), fade = $('fade'), mem = $('memory'), maskC = $('maskview');
  let closeCard = null;
  const ui = {
    hint(html) { hint.innerHTML = html || ''; },
    get cardOpen() { return !!closeCard; },
    // Show a fact card in the chosen language; resolves when the viewer taps the button (or presses Enter).
    fact(id, { button = label('btnContinue'), extra = '' } = {}) {
      const f = FACTS[id], en = lang === 'en', both = lang === 'both';
      const tag = en ? f.tagEn : f.tag;
      const head = en ? f.titleEn : f.title;
      // in "both" the Vietnamese name is the heading, and the English gloss goes under it without repeating it
      const cut = f.titleEn.startsWith(f.title) ? f.titleEn.slice(f.title.length).replace(/^\s*—\s*/, '') : f.titleEn;
      const gloss = cut.charAt(0).toUpperCase() + cut.slice(1);
      const body = `<p>${esc(en ? f.en : f.vi)}</p>${both ? `<p class="en">${esc(f.en)}</p>` : ''}`;
      card.innerHTML = `<p class="tag">${t('factTag')} · ${esc(tag)}</p><h3>${esc(head)}</h3>${both ? `<p class="gloss">${esc(gloss)}</p>` : ''}${f.origin ? `<p class="origin">${t(ORIGIN[f.origin])}</p>` : ''}${body}${extra}<button type="button">${button} →</button>`;
      card.classList.add('on');
      card.setAttribute('aria-hidden', 'false');
      const btn = card.querySelector('button');
      setTimeout(() => btn.focus({ preventScroll: true }), 50);
      return new Promise((resolve) => {
        closeCard = () => { card.classList.remove('on'); card.setAttribute('aria-hidden', 'true'); closeCard = null; document.getElementById('scene').focus({ preventScroll: true }); resolve(); };
        btn.onclick = () => closeCard();
      });
    },
    closeCard() { closeCard?.(); },
    // A memory from story.json: photo, date, caption. Resolves on close.
    memory(m, { index, total }) {
      const img = m.img ? `<img alt="" src="${esc(m.img.src)}">` : '';
      mem.innerHTML = `<div class="paper">${img}<p class="date">${esc(m.date)}</p><p class="cap">${esc(m.caption)}</p><p class="count">${index + 1} / ${total}</p></div><button type="button">${label('keoNext')}</button>`;
      mem.classList.add('on');
      const btn = mem.querySelector('button');
      setTimeout(() => btn.focus({ preventScroll: true }), 50);
      return new Promise((resolve) => {
        closeCard = () => { mem.classList.remove('on'); closeCard = null; document.getElementById('scene').focus({ preventScroll: true }); resolve(); };
        btn.onclick = () => closeCard();
      });
    },
    title(html, on = true) { if (html != null) title.innerHTML = html; title.classList.toggle('on', on); },
    fade(on, ms = 700, color = '#05060f') { fade.style.transitionDuration = ms + 'ms'; if (on) fade.style.background = color; fade.classList.toggle('on', on); return new Promise((r) => setTimeout(r, ms)); },
    // The ending: the message, written in moonlight over the scene.
    message({ to, from, message }) {
      const el = document.getElementById('final');
      el.innerHTML = `<p class="to">${t('startTo', esc(to))}</p><p class="msg">${esc(message)}</p><p class="from">${esc(from)}</p>`;
      el.classList.add('on');
      return new Promise((r) => setTimeout(r, 1200));
    },
    // Mask overlay, seen from behind as the wearer does: the bare papier-mâché inside (mirrored) fills the screen
    // around the eye holes, and a hand mirror in the corner shows the painted face.
    mask(canvas, eyes) {
      document.body.classList.toggle('masked', !!canvas);
      if (!canvas) { maskC.classList.remove('on'); return; }
      const face = canvas, S = face.width;
      canvas = Object.assign(document.createElement('canvas'), { width: S, height: S });
      const ic = canvas.getContext('2d');
      ic.setTransform(-1, 0, 0, 1, S, 0); ic.drawImage(face, 0, 0); ic.setTransform(1, 0, 0, 1, 0, 0);
      ic.globalCompositeOperation = 'source-in';
      const pg = ic.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S * 0.55);
      pg.addColorStop(0, '#d8cbb0'); pg.addColorStop(1, '#9c8c6e');
      ic.fillStyle = pg; ic.fillRect(0, 0, S, S);
      ic.globalCompositeOperation = 'source-atop'; // torn newspaper layers, the way giấy bồi is built up
      ic.fillStyle = 'rgba(60,50,40,.13)';
      for (let i = 0; i < 90; i++) ic.fillRect(((i * 97) % S), ((i * 53) % S), 20 + (i % 5) * 9, 3);
      eyes = eyes.map(([ex, ey]) => [1 - ex, ey]).reverse();
      const W = innerWidth, H = innerHeight, dpr = Math.min(2, devicePixelRatio);
      maskC.width = W * dpr; maskC.height = H * dpr;
      const x = maskC.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      // scale so the eyes sit a comfortable distance apart on screen
      const eyeGap = Math.abs(eyes[1][0] - eyes[0][0]) * canvas.width, want = Math.min(W * 0.46, H * 0.5);
      const s = want / eyeGap, cx = ((eyes[0][0] + eyes[1][0]) / 2) * canvas.width, cy = eyes[0][1] * canvas.height;
      x.clearRect(0, 0, W, H);
      x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
      x.drawImage(canvas, W / 2 - cx * s, H * 0.46 - cy * s, canvas.width * s, canvas.height * s);
      x.globalCompositeOperation = 'destination-out';
      for (const [ex, ey] of eyes) {
        const px = W / 2 + (ex * canvas.width - cx) * s, py = H * 0.46 + (ey * canvas.height - cy) * s, r = want * 0.42;
        const g = x.createRadialGradient(px, py, r * 0.55, px, py, r);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.beginPath(); x.ellipse(px, py, r * 1.1, r * 0.85, 0, 0, 7); x.fill();
      }
      x.globalCompositeOperation = 'source-over';
      // the hand mirror: a mirror flips left and right
      const mr = Math.min(W, H) * 0.15, mx = W - mr - 20, my = H - mr - 24;
      x.fillStyle = '#6a3f22'; x.beginPath(); x.arc(mx, my, mr + 7, 0, 7); x.fill();
      x.save(); x.beginPath(); x.arc(mx, my, mr, 0, 7); x.clip();
      x.fillStyle = '#2a2622'; x.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
      x.translate(mx, my); x.scale(-1, 1); x.drawImage(face, -mr * 0.95, -mr * 0.95, mr * 1.9, mr * 1.9);
      x.restore();
      maskC.classList.add('on');
    },
  };
  addEventListener('keydown', (e) => { if (closeCard && (e.key === 'Escape')) closeCard(); });
  return ui;
}
