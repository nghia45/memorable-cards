// Checks the Trung Thu language table: run with `node scripts/check-lang.mjs`.
// t() falls back to Vietnamese when an English string is missing, which is kind at runtime and hides the
// mistake from you, so the gap gets caught here instead.
import assert from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';

globalThis.location = { search: '' };
globalThis.localStorage = { getItem: () => null, setItem() {} };
Object.defineProperty(globalThis, 'navigator', { value: { language: 'en-GB' }, configurable: true }); // node 22 has its own
globalThis.document = { documentElement: {} };

const dir = new URL('../t/trung-thu-2026/js/', import.meta.url);
const { t, setLang, LANGS, verse } = await import(new URL('lang.js', dir));
const src = readFileSync(new URL('lang.js', dir), 'utf8');

// every key carries both languages, and the two agree on how many things they interpolate
const keys = [...src.matchAll(/^ {2}([a-zA-Z0-9]+): \{/gm)].map((m) => m[1]);
assert.ok(keys.length > 50, `only found ${keys.length} keys — the table scrape is wrong`);
for (const k of keys) {
  for (const l of Object.keys(LANGS)) {
    setLang(l);
    const v = t(k, 1, 2, 3);
    assert.ok(v !== '' && v != null, `${k}: no ${l} string`);
    assert.ok(!/undefined|NaN|\[object/.test(v), `${k} (${l}) interpolated badly: ${v}`);
  }
}
// a string that takes arguments must take them in every language, or one of them drops the count
for (const k of keys) {
  const has = Object.keys(LANGS).map((l) => { setLang(l); return /1|2/.test(String(t(k, 1, 2))); });
  assert.ok(has.every((v) => v === has[0]), `${k}: some languages interpolate the arguments and others drop them`);
}
// "both" carries the Vietnamese and adds the English. Only the auto-composed entries can be checked this
// way: the handful with a hand-written `both` are deliberate rewordings, and only a person can judge those.
const handmade = new Set(src.split(/^ {2}(?=[a-zA-Z0-9]+: \{)/m).slice(1) // split into entries: a value can hold ${…}
  .filter((e) => /\bboth:/.test(e)).map((e) => e.match(/^([a-zA-Z0-9]+):/)[1]));
const firstRun = (x) => (x.split(/<[^>]*>/).map((v) => v.trim()).find((v) => v.length > 3) || '');
for (const k of keys) {
  setLang('vi'); const vi = String(t(k, 1, 2));
  setLang('en'); const en = String(t(k, 1, 2));
  setLang('both'); const b = String(t(k, 1, 2));
  if (vi === en) continue;
  assert.ok(b, `${k}: no "both" string`);
  if (handmade.has(k)) continue;
  assert.ok(b !== vi && b !== en, `${k}: "both" collapsed to one language — ${b}`);
  assert.ok(b.includes(firstRun(vi)), `${k}: "both" lost the Vietnamese — ${b}`);
  assert.ok(b.length > Math.max(vi.length, en.length), `${k}: "both" is no fuller than one language — ${b}`);
}
assert.ok(handmade.size > 3 && handmade.size < 15, `${handmade.size} hand-written "both" strings — the scrape is off`);

// every t('literal') in the card resolves
const missing = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'lang.js')) { // lang.js's own comment shows t('key')
  const code = readFileSync(new URL(f, dir), 'utf8');
  for (const m of code.matchAll(/(?<![A-Za-z_.$])t\('([a-zA-Z0-9]+)'/g)) if (!keys.includes(m[1])) missing.push(`${f}: ${m[1]}`);
}
assert.deepStrictEqual(missing, [], `t() called with keys that aren't in the table:\n  ${missing.join('\n  ')}`);

// the keys held in data rather than written at the call site
const held = new Set();
for (const f of ['main.js', 'stops.js', 'roof.js']) {
  const code = readFileSync(new URL(f, dir), 'utf8');
  for (const m of code.matchAll(/(?:line|key): '([a-zA-Z0-9]+)'/g)) held.add(m[1]);
  for (const m of code.matchAll(/const (?:HINTS|POM_HINTS) = \[([^\]]*)\]/g)) for (const q of m[1].matchAll(/'([a-zA-Z0-9]+)'/g)) held.add(q[1]);
  for (const m of code.matchAll(/\[\s*'(?:street|roof|parade|moon)', act\w+, '([a-zA-Z0-9]+)'\s*\]/g)) { held.add(m[1]); held.add(m[1] + 'What'); }
}
assert.ok(held.size > 20, `only ${held.size} indirect keys found — the scrape is wrong`);
for (const k of held) assert.ok(keys.includes(k), `held in data but not in the table: ${k}`);

// the sung verse keeps its Vietnamese and only subtitles it in English
setLang('vi'); assert.strictEqual(verse('câu hát', 'a line'), 'câu hát');
for (const l of ['en', 'both']) { setLang(l); assert.strictEqual(verse('câu hát', 'a line'), 'câu hát<br><small class="en">a line</small>'); }

// the fact cards are written out in both languages, not summarised in one
const facts = (await import(new URL('facts.js', dir))).FACTS;
for (const [id, f] of Object.entries(facts)) {
  for (const k of ['tag', 'tagEn', 'title', 'titleEn', 'vi', 'en']) assert.ok(f[k], `fact ${id}: no ${k}`);
  const ratio = f.en.length / f.vi.length;
  assert.ok(ratio > 0.7, `fact ${id}: the English reads thin next to the Vietnamese (${Math.round(ratio * 100)}%)`);
}
console.log(`ok · ${keys.length} strings × ${Object.keys(LANGS).length} languages · ${held.size} held in data · ${Object.keys(facts).length} facts`);
