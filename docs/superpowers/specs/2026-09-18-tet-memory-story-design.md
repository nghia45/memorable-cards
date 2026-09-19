# Tết memory story: design

**Goal:** turn the single lì xì card into a ~1.5–2 min interactive 3D story built from 3–4 of the sender's
memories, ending in the existing envelope → card → coins sequence.

## Story

| Act | What happens | Input |
|---|---|---|
| 1. Arrival (river) | Night. Camera glides along a river of floating lotus lanterns (hoa đăng) toward a lit courtyard. Title + recipient name fade in. | Scroll / drag advances; drifts slowly on its own; "Skip" jumps to act 2 |
| 2. The tree (hub) | Courtyard with a potted hoa mai tree. 3–4 glowing buds, one per memory. Blossom density grows with each memory opened. | Tap a glowing bud |
| 3. Memory (pop-up) | Bud blooms; a paper pop-up spread unfolds in front of the camera: themed stand-up layers frame the photo (polaroid), caption + date write in. Closing folds it and hangs a small polaroid on the branch. | Tap to close |
| 4. Dawn | After the last memory: sky shifts to mùng 1 morning, full bloom, a lì xì hangs on a branch. Tap it → it floats down to the stage → existing envelope interaction. | Existing drags / taps |

Pop-up themes (chosen per memory): `home`, `journey`, `celebration`, `together`.

## Content: one folder per card

```
stories/<id>/story.json   # loaded via ?card=<id>, default "demo"
stories/<id>/<photos>
```

```json
{
  "to": "Minh", "from": "Lan",
  "title": "Một năm của chúng mình",
  "message": "…greeting on the final card…",
  "memories": [
    { "photo": "1.jpg", "date": "Tháng 2, 2026", "caption": "…", "theme": "home" }
  ]
}
```

Rules: 1–4 memories used (extras ignored, with a console warning); missing photo → paper placeholder
with the caption; missing theme → cycles through the four. Needs any static HTTP host (fetch).

## Code structure (no build step, ES modules + importmap)

| File | Responsibility |
|---|---|
| `index.html` | Shell, overlay UI, CSS |
| `js/main.js` | Boot, story loading, renderer, act director, camera, input, loop |
| `js/print.js` | Canvas print helpers (foil mask textures, goat, medallion, text) |
| `js/world.js` | Sky (night→dawn), hanging lanterns, petals, glow sprites |
| `js/river.js` | Act 1: reflective water, banks, lotus lanterns, camera path |
| `js/tree.js` | Acts 2/4: pot, procedural mai tree, bloom, buds, hung polaroids, hanging lì xì |
| `js/popup.js` | Act 3: pop-up spread + 4 themes |
| `js/envelope.js` | Act 4 finale: the existing envelope/card/coins, inside a scaled stage group |

One scene, one continuous world: river (+z) → steps → gate → courtyard (tree at origin). The envelope stage
is a group scaled 0.25 whose floor coincides with the courtyard ground, placed near the gate and angled so
the finale shot (wider 54° lens) has the fully bloomed tree and its polaroids in the background.

Also: `js/world.js` also owns the light rig; `js/tween.js` holds the shared tween helpers. Portrait screens
get a taller lens rather than backing the camera out of the courtyard, and the gate is hidden after arrival.

## Out of scope (now)

Builder UI, uploads, music, analytics. Add a builder once the story format settles.

## Verification

Each act checked in the browser (desktop + 375×812): renders, input advances, no console errors;
full run from river to flipped card with the demo story.
