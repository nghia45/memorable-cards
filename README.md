# Keepsake: interactive 3D greeting cards

`index.html` is the landing page: search, category filters, and a video preview when you hover a template
(or scroll it to the centre on a phone). It never loads three.js. Each template is a separate page under
`t/<id>/` with its own ES modules, so a template's code only downloads when it's opened.

## Add a template

1. Put it in `t/<id>/` (self-contained: its own `index.html`, `js/`, assets).
2. Add a 4:3 poster (`previews/<id>.jpg`, 800×600) and a short muted loop (`previews/<id>.webm`, 6–10 s, ≤2 MB).
3. Add an entry to `templates.json`. `"soon": true` with an `art` gradient shows a "Coming soon" tile instead.

---

# Template: Lì Xì Tết 2027 (`t/tet-2027/`)

A Lunar New Year card told in four acts (about 1.5–2 minutes):

1. **Arrival.** Drift down a night river of lotus lanterns (hoa đăng) to a courtyard gate.
2. **The tree.** A hoa mai tree with 3–4 glowing buds, one per memory.
3. **Memories.** Each bud blooms into a pop-up paper book: your photo, date and caption, framed by a themed cut-paper scene. Closing it hangs the memory on the tree as a polaroid, and the tree blooms a little more.
4. **Dawn.** At mùng 1 morning the tree is in full bloom and a lì xì hangs on it. Open the envelope, pull out the card, and flip it for the message.

Plain ES modules + Three.js from a CDN. No build step.

## Run locally

It loads `story.json` with `fetch`, so it needs an HTTP server (opening the file directly won't work):

```bash
python .claude/serve.py 5174
```

Then open http://localhost:5174/ (landing page), http://localhost:5174/t/tet-2027/ (demo card) or `…/t/tet-2027/?card=<id>`.

## Make a card

1. Copy `t/tet-2027/stories/demo/` to `t/tet-2027/stories/<id>/` (letters, digits, `-`, `_`).
2. Put 1–4 photos in it (JPG/PNG/WebP/SVG). They're cropped to a square from the centre.
3. Edit `story.json`:

```json
{
  "to": "Minh",
  "from": "Lan",
  "title": "Một năm của chúng mình",
  "message": "Shown on the final card (max 180 characters).",
  "memories": [
    { "photo": "photos/1.jpg", "date": "Tháng 2, 2026", "caption": "Max 160 characters.", "theme": "home" }
  ]
}
```

| `theme` | Pop-up scene around the photo |
|---|---|
| `home` | Houses with lit windows, a mai branch in a vase, bánh chưng on a table, hanging lanterns |
| `journey` | Layered mountain ridges, a winding road, a motorbike riding across, drifting clouds |
| `celebration` | Foil fireworks on stalks with twinkles, lantern posts, falling confetti |
| `together` | A tree, a glowing street lamp, two people on a bench, hearts floating up |

A missing or invalid theme cycles through the four. A missing photo becomes a paper plate showing the caption. Memories beyond four are ignored (with a console warning).

4. Deploy the whole folder to any static host and share `…/t/tet-2027/?card=<id>`.

## Music

Drop two seamless loops into `t/tet-2027/audio/`:

| File | Plays during |
|---|---|
| `night.mp3` | the river and the courtyard at night |
| `dawn.mp3` | dawn and the lì xì finale |

They crossfade between acts and load only after the viewer's first tap (browsers block sound before that). Until a file exists, a generated đàn tranh-style placeholder plays for that mood. Keep each around 1–2 MB (for example, 96 kbps and 60–120 s). Sound effects need no files: coins, paper, chimes, whoosh, dawn bell and river water are synthesized in `js/audio.js`.

## Files

| File | What it does |
|---|---|
| `t/tet-2027/index.html` | Page shell, overlay text and buttons (all `js/` paths below are inside `t/tet-2027/`) |
| `js/main.js` | Loads the story, builds the world in stages behind the loader, post-processing (bloom, vignette, grain, adaptive resolution), acts, camera and input |
| `js/river.js` | Act 1: rippled reflective water, Hội An shophouse street, silk-lantern strings, boats, lotus lanterns, camera path |
| `js/tree.js` | Courtyard (gate, house, walls, pavers), blue-and-white pot, procedural mai tree, memory buds, polaroids and lì xì |
| `js/arch.js` | Architecture kit: curved tile roofs with swept-up corners, shophouses, boat hulls |
| `js/tex.js` | Procedural textures (plaster, roof tiles, terracotta, stone, wood, bark) and baked lantern glow |
| `js/audio.js` | Music moods (night / dawn) and sound effects synthesized in Web Audio; mute state is remembered |
| `js/popup.js` | The pop-up book and its four themes |
| `js/envelope.js` | Finale: envelope, card, coins |
| `js/world.js` | Sky (moon, clouds, night → dawn), lights, silk lanterns (single and instanced), drifting petals |
| `js/print.js` | Canvas "printing" helpers (gold-foil masks, goat medallion, text) |
| `js/tween.js` | Tiny tween/await helpers |

---

# Template: Trung Thu 2026 (`t/trung-thu-2026/`)

"Đêm Rằm": one Mid-Autumn night of a Hanoi childhood, in five acts (about 6–8 minutes). You walk at a
child's eye height and stop at each stand to make or play with something. After each stop a **Góc tìm
hiểu** card explains the custom in the language you chose (see Language). Everything turns a full 360°:
drag to look around, scroll or pinch to zoom, and use the arrow keys. To walk, swipe up or scroll. If you
stop for a few seconds, the walk carries on by itself, unless you've turned to look off to the side: then it
waits until you walk again.

1. **Hàng Mã at dusk.** A street of tube houses with five stalls:
   - build a star lantern (đèn ông sao) stick by stick, then carry it for the rest of the night;
   - watch a tò he rooster being shaped;
   - try on a paper mask (Ông Địa, Tôn Ngộ Không, Trư Bát Giới, Thỏ Ngọc);
   - press a mooncake in its wooden mould;
   - light the tin pop-pop boat and watch it chug.

   Two jokes sit between the stalls. You tap them as you pass, and the walk doesn't stop for them. Inside a shop
   just past the masks, a man in a wheelchair watches the final on an old CRT, with big star lanterns in green
   tinsel rings tied behind him (the "Faker on the wheel" meme from the game *Tiệm Phở của anh Hai*). Tap him and
   he spins round to sell you one: "Mua đèn không? tôi có 6 cái". He is
   only there for those who look: his hint shows, and a tap on him works, once you turn toward his shop. Near the
   end of the street is a trà đá stall on the pavement ("Một quán trà đá lề đường bình thường"). It works the
   same way: turn to it and tap. An uncle presses the tobacco into the bowl of his điếu cày, flicks a lighter,
   leans down into the tube while the ember flares and the water gurgles, then sits back, holds it, and lets a
   long plume out into the lanterns. Meanwhile the young man beside him turns to you, wags a finger, then waves
   you over to the tea glasses: "Trẻ con không được hút thuốc lào đâu. Uống trà đá đi, chú mời!"
2. **The rooftop (sân thượng).** The family sits on a chiếu mat:
   - make the pomelo dog the real way: sour-pomelo segments pulled open into fluff, pinned with toothpicks
     onto a winter-melon and potato frame, longan-seed eyes;
   - set the mâm cỗ: ông tiến sĩ giấy, the fruit, cakes, the pig and fish cakes, tea;
   - tap the rising moon to read its colour for the harvest;
   - grandpa lights the đèn kéo quân, and the card's photos ride on its rotor, one memory per turn;
   - phá cỗ.
3. **The parade to the sân đình.** The kids march with their lanterns to the village yard:
   - a carp lantern;
   - a lion dance you drive with drum taps, ending in "lân ăn lộc";
   - hát trống quân: strike the rope over the upside-down barrel, and a young man and woman trade a
     courting ca dao, line by line;
   - a storyteller tells how Đường Minh Hoàng visited the moon and throws his staff, which becomes a
     bridge of moonlight.
4. **The moon.** A small world you walk around:
   - three Đông Hồ-style boards tell Cuội's story;
   - the Quảng Hàn palace, with Chị Hằng and the jade rabbit at its mortar;
   - the Nghê Thường dancers;
   - Cuội under his banyan, with his buffalo.
5. **Home.** Cuội sends a banyan leaf. It falls back to the rooftop tray, and the card's message appears in
   the moonlight. There are no sky lanterns: they are not a Vietnamese custom.

## Make a card

Same as the Tết card: copy `t/trung-thu-2026/stories/demo/` to `stories/<id>/`, add photos, and edit
`story.json`:
- `to`, `from`, `title`;
- `message`, up to 180 characters;
- 1–6 `memories`, each `{photo, date, caption}`.

The memories are the pictures on the đèn kéo quân. Share `…/t/trung-thu-2026/?card=<id>`.
The card opens on a start screen: **Bắt đầu từ đầu** plays from the beginning, **Chọn chương** shows the four chapters as a linked chain of cards to jump into. `?act=street|roof|parade|moon` skips the start screen and opens that chapter.

## Language

The card plays in **Tiếng Việt**, **English**, or **Cả hai · Both** — Vietnamese in full, with the English under it
in italic. The viewer picks on the start screen, next to **Chọn chương**, and the choice is remembered; `?lang=vi`,
`?lang=en` or `?lang=both` opens straight into one, which is what the `?act=` links need since they skip that
screen. Failing both, it follows the browser.

"Both" is composed automatically: a short plain label sits on one line (`Chương 1 · Chapter 1`), and anything longer
or with markup gets the English underneath. A hint made of an instruction and a `<small>` aside pairs up line for
line, so it reads instruction · instruction · aside · aside instead of burying one language under the other. Seven
strings are composed by hand instead, where that rule reads badly — the act titles, the aria-labels a screen reader
speaks (no markup allowed there), and the mask line, whose text arrives already translated and must not be doubled.
Those carry a `both:` of their own, and `check-lang.mjs` leaves their wording to you.

Every string the viewer reads lives in `js/lang.js` as a `vi`/`en` pair — add a string there, not at the call site.
What stays Vietnamese in both: the signs and boards painted into the scene, because a Hàng Mã shopfront is in
Vietnamese, and anything the sender wrote in `story.json`. Sung verse keeps its Vietnamese original and carries the
English underneath as a subtitle. The Góc tìm hiểu cards are written out in full in both languages and show one.

`node scripts/check-lang.mjs` checks that no string exists in only one language, that every key a call site asks
for is really in the table, and that no fact card is a thin summary in one language next to a paragraph in the other.

## Music

Each chapter has its own music. Drop a seamless loop per chapter into `t/trung-thu-2026/audio/`:
- `street.mp3`: Hàng Mã, festive and busy;
- `roof.mp3`: the rooftop with the family, quiet, under crickets;
- `parade.mp3`: the lantern parade behind the lion, drum-led and fast;
- `moon.mp3`: the moon, still and airy.

They crossfade as the chapter changes. Until a file exists, a generated placeholder plays, all four on one four-bar
pentatonic tune (điệu Bắc) over a moving bass root: plucked over a light trống lân pattern in the street, a đàn tranh
rolling up each chord and bending into the notes on the rooftop, the lion dance's drum and chập chả driving it in the
parade, and a breathy sáo over a drone on the moon. Effects are synthesized, among them the lion drum, the trống
quân rope, knocks, the boat's putt-putt, the flame, chimes and crickets.

The whole mix runs into a reverb built from a generated impulse and then a limiter, and effects are scattered across the
stereo field so repeated pops and rustles don't stack up in the middle. The music is sent to the reverb more dryly than
the effects, or the drums turn the alley to mud. The four knobs are at the top of `js/audio.js`: `VOL`, `TAIL`,
`WET_MUSIC`, `WET_FX`. `node scripts/check-audio.mjs` runs the scheduler against a stubbed Web Audio API and checks that
the notes land in time, in range, and across the stereo field.

## Files

| File | What it does |
|---|---|
| `js/main.js` | Story loading, the build, post-processing, per-act looks, the walker, the five acts, input |
| `js/rig.js` | Camera rig: orbit or first-person around a target, unbounded yaw, eased `fly()` shots |
| `js/hangma.js` | Act 1 street: tube houses, shop interiors, strung lanterns, scooters, passers-by |
| `js/stops.js` | The five hands-on stalls (star lantern, tò he, masks, mooncake mould, tin boat) |
| `js/extras.js` | The street jokes: the man in the wheelchair watching TV, and the trà đá stall |
| `js/roof.js` | Act 2 rooftop: terrace, neighbours, bulbs, mat and table, family, tray slots |
| `js/pomelo.js` | The pomelo, peel petals, fluffed segments pinned onto the melon/potato frame, eyes, nose |
| `js/keoquan.js` | The memory lantern: photo panels on the rotor, silhouettes with real candle shadows |
| `js/dinh.js` | Act 3 village yard and đình, trống quân, storyteller, parade, lộc pole, moonlight bridge |
| `js/lion.js` | Lion (blinking eyes, clacking jaw, cloth body along a spine), Ông Địa, drum |
| `js/moonworld.js` | Act 4: the walkable moon, painted boards, palace, Hằng Nga, rabbit, dancers, Cuội, Earth |
| `js/figures.js` | Jointed people and kids (walk, sit, pose), hair, clothes and hats |
| `js/lanterns.js` | Star, carp and ball lanterns sharing one flickering material |
| `js/trees.js` | Banyan builder |
| `js/facts.js` | The Góc tìm hiểu texts |
| `js/ui.js` | Hint line, fact and memory cards, titles, fades, mask view, final message |
| `js/world.js` | Sky (dusk / space / bright) and the moon disc |
| `js/street.js` | Shared materials and builders (merged buckets, tint, tapered tubes) |
| `js/audio.js` | Music moods and synthesized effects |
| `js/lang.js` | Every string the viewer reads, in Vietnamese and English |
| `js/arch.js`, `js/tex.js`, `js/print.js`, `js/tween.js` | Same helpers as the Tết card |

## Sources

The cultural notes were checked against these pages:
- Nhân Dân, *Tết Trung thu truyền thống*: special.nhandan.vn/Tettrungthu_truyenthong_lich_su
- Hànộimới, *Mâm cỗ Trung thu của Hà Nội xưa*: hanoimoi.vn/mam-co-trung-thu-cua-ha-noi-xua-co-nhung-gi-589923.html
- Wikipedia, *Tết Trung Thu*: en.wikipedia.org/wiki/Tết_Trung_Thu
- Wikipedia, *Cuội (cung trăng)*: vi.wikipedia.org/wiki/Cuội_(cung_trăng)
- truyencotich.vn, *Sự tích chú Cuội cung trăng*
- VietnamPlus on the lantern and toy craft villages (Báo Đáp, Ông Hảo)
- Wiki HNUE, *Đèn kéo quân*
- xinchaovietnam.vn and bachhoaxanh.com on mặt nạ giấy bồi
- eggyolk.vn on why children parade with lanterns
- VnExpress and Dân Việt on how chó bưởi are made (sour pomelo, toothpicks, melon frame, longan-seed eyes)
- dsvh.gov.vn, *Hát Trống quân*; VietNamNet on its Trung Thu custom and Phan Kế Bính's account; Công Luận on
  the instrument
- Hoavouu and Chánh Kiến on the Nghê Thường / Đường Minh Hoàng legend (Chinese, marked as such on the cards)

Legend cards carry an origin line: *Truyện cổ Việt Nam* (Cuội) or *Truyền thuyết Trung Hoa* (Hằng Nga and
the jade rabbit, Đường Minh Hoàng, Nghê Thường).

---

# Template: Non Nước Cao Bằng (`t/cao-bang/`)

A travel showcase, not a greeting: one continuous 3D valley of Cao Bằng to explore freely. Drag to turn, pinch
or scroll to zoom, tap the ground to glide there, tap a landmark's label to fly in and read its note
(Vietnamese, one line of English). **← Toàn cảnh** returns to the overview; the ☾/☀ button switches between
afternoon and dusk. Visiting the then yard brings dusk by itself.

From north to south along the Quây Sơn:

- **Bản Giốc falls**: two tiers of separate strands over a horseshoe cliff, foam and spray in a jade pool,
  bamboo rafts with visitors in orange life vests.
- **The valley floor**: rice fields (ripe, green, flooded), haystack karst peaks, **Mắt Thần** mountain with
  the sky showing through its hole.
- **A Tày village** on terraces: stilt houses with yin-yang tile roofs, a bamboo water wheel (cọn nước)
  lifting water into a trough, the Phia Thắp incense yard, Trùng Khánh chestnut trees.
- **Round the rim** (squeezed in closer than they really are): Trúc Lâm Bản Giốc pagoda on the hill above the
  falls; Ngườm Ngao cave in a karst tower, stepping stones up to its mouth; Khuổi Ky, the Tày village of stone
  houses and fences; Thang Hen lake in its bowl of peaks; the 14 hairpins of the Khau Cốc Chà pass; Pác Bó with
  the jade Lênin stream, Karl Marx mountain, Cốc Bó cave and the stone table; Phja Oắc's pine massif above a
  sea of cloud. The Phong Nặm valley is the rice fields along the river.
- **Seasons of flowers and more water**: Thác Mẹ Bồng Con (a broad fall beside a slim one) in the eastern hills;
  a hillside of white sở (tea-oil) blossom; terraced tam giác mạch slopes in pink and violet; dã quỳ gold in
  the foothills by Thang Hen; boulders along the river banks. (Different months in reality, shown together.)
- **The then yard**: at dusk the fire is lit and a then singer plays the đàn tính, with two women shaking
  xóc nhạc and the neighbours round the fire.

Sound is synthesized (no files): the falls get louder as you get close, birds by day, crickets at dusk, and the
đàn tính with bells near the yard after dark. No URL parameters.

## Files

- `js/land.js`: the height function everything sits on, terrain + rice-field texture, river water, karst
  peaks, Mắt Thần, trees, far ranges
- `js/falls.js`: cliffs, water strands and foam (shaders), spray, rafts
- `js/sites.js`: the pagoda, caves, Khuổi Ky, the pass road, Pác Bó's details, Phja Oắc's pines and clouds
- `js/village.js`: stilt houses, water wheel, incense yard, chestnuts, the then yard, farmers
- `js/detail.js`: per-pixel surface detail from one small noise texture (forested karst with bare limestone on the
  sheer faces, mossy cliffs at the falls, leafy crowns, ground variation, small bumps that fade with distance)
- `js/sky.js`: sky dome with drifting clouds, low mist between the peaks, and the afternoon → dusk look
- `js/main.js`: renderer, landmarks and labels, camera and input, sound levels
- `js/audio.js`, `js/facts.js`; `rig.js`, `tween.js`, `figures.js` are copied from Trung Thu

## Performance

- On phones (coarse pointer): pixel ratio capped at 1.5, 2× MSAA, a 1024 shadow map, 55% of the trees and fewer
  mist sprites. Everywhere the pixel ratio also drops step by step if frames run slow.
- Far trees (hills, karst) use a 120-triangle crown and have no trunk; the richer crown is only for trees you
  can fly close to. About 0.9 M triangles and ~380 draw calls on desktop, about 4 ms a frame on a laptop GPU.
- The sun's shadow map re-renders only when the view or the time of day changes. Bloom runs only at dusk.
  After 8 s without input the card draws every other frame.

## Background

The notes were written from general knowledge; check them against these before sharing widely:

- UNESCO, *Practices of Then by Tày, Nùng and Thái ethnic groups in Viet Nam* (Representative List, 2019)
- UNESCO Global Geoparks, *Non nuoc Cao Bang* (2018)
- Wikipedia, *Ban Gioc–Detian Falls*; *Quây Sơn River*; *Pác Bó*; *Phia Oắc – Phia Đén National Park*
