// Minimal frame-driven tweens shared by every act. fn(k) receives linear progress 0..1.
const list = [];
export const tween = (dur, fn, done) => { const t = { t: 0, dur, fn, done }; list.push(t); return t; };
export const wait = (dur) => new Promise((r) => tween(dur, () => {}, r));
export const animate = (dur, fn) => new Promise((r) => tween(dur, fn, r));
export function stepTweens(dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const tw = list[i]; tw.t += dt;
    const k = Math.min(tw.t / tw.dur, 1);
    tw.fn(k);
    if (k === 1) { list.splice(i, 1); tw.done && tw.done(); }
  }
}
export const clearTweens = () => (list.length = 0);
export const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
export const easeOut = (k) => 1 - (1 - k) ** 3;
export const lerp = (a, b, k) => a + (b - a) * k;
