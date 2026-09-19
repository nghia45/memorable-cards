// Overlay UI: the hint line, the "Góc tìm hiểu" fact card, the memory card (photo + caption), the act title,
// full-screen fades, and the mask the viewer puts on at the mask stall. Everything here is plain DOM.
import { FACTS } from './facts.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function createUI() {
  const hint = $('hint'), card = $('fact'), title = $('title'), fade = $('fade'), mem = $('memory'), maskC = $('maskview');
  let closeCard = null;
  const ui = {
    hint(html) { hint.innerHTML = html || ''; },
    get cardOpen() { return !!closeCard; },
    // Show a fact card; resolves when the viewer taps "Tiếp tục" (or presses Enter).
    fact(id, { button = 'Tiếp tục', extra = '' } = {}) {
      const f = FACTS[id];
      card.innerHTML = `<p class="tag">Góc tìm hiểu · ${esc(f.tag)}</p><h3>${esc(f.title)}</h3><p>${esc(f.vi)}</p><p class="en">${esc(f.en)}</p>${extra}<button type="button">${esc(button)} →</button>`;
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
      mem.innerHTML = `<div class="paper">${img}<p class="date">${esc(m.date)}</p><p class="cap">${esc(m.caption)}</p><p class="count">${index + 1} / ${total}</p></div><button type="button">Quay tiếp đèn →</button>`;
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
      el.innerHTML = `<p class="to">Gửi ${esc(to)}</p><p class="msg">${esc(message)}</p><p class="from">${esc(from)}</p>`;
      el.classList.add('on');
      return new Promise((r) => setTimeout(r, 1200));
    },
    // Mask overlay: the painted mask fills the screen with its eye holes around the centre.
    mask(canvas, eyes) {
      if (!canvas) { maskC.classList.remove('on'); return; }
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
      maskC.classList.add('on');
    },
  };
  addEventListener('keydown', (e) => { if (closeCard && (e.key === 'Escape')) closeCard(); });
  return ui;
}
