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
hiểu** card explains the custom in Vietnamese, with one line of English. Everything turns a full 360°:
drag to look around, scroll or pinch to zoom, and use the arrow keys. To walk, swipe up or scroll. If you
stop for a few seconds, the walk carries on by itself.

1. **Hàng Mã at dusk.** A street of tube houses with five stalls:
   - build a star lantern (đèn ông sao) stick by stick, then carry it for the rest of the night;
   - watch a tò he rooster being shaped;
   - try on a paper mask (Ông Địa, Tôn Ngộ Không, Trư Bát Giới, Thỏ Ngọc);
   - press a mooncake in its wooden mould;
   - light the tin pop-pop boat and watch it chug.
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

## Music

Drop two tracks into `t/trung-thu-2026/audio/`:
- `alley.mp3`: festive and drum-led, for the street and the parade;
- `moon.mp3`: quiet, for the rooftop and the moon.

Until then a generated placeholder plays. Effects are synthesized, among them the lion drum, the trống quân rope, knocks, the
boat's putt-putt, the flame, chimes and crickets.

## Files

| File | What it does |
|---|---|
| `js/main.js` | Story loading, the build, post-processing, per-act looks, the walker, the five acts, input |
| `js/rig.js` | Camera rig: orbit or first-person around a target, unbounded yaw, eased `fly()` shots |
| `js/hangma.js` | Act 1 street: tube houses, shop interiors, strung lanterns, scooters, passers-by |
| `js/stops.js` | The five hands-on stalls (star lantern, tò he, masks, mooncake mould, tin boat) |
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
