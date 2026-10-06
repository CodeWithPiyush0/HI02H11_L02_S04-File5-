# Art rules — HI02H11_L02_S03

Two asset classes in this bundle, and they must **not** be generated the same way.

| class | keys | pipeline |
|---|---|---|
| `obj_*` (8) | cut-out objects on transparency | `gen_objects.py` — magenta chroma key + keep-largest + autocrop |
| `scn_*` (4) | full illustrated scenes for `SENTENCE_COMPLETE` | `gen_art.py --no-key` — the background is the point, **never** key these |

## The rules that came from actual failures

Every one of these cost a regeneration on this lesson or the sibling.

1. **ONE SINGLE CONNECTED SHAPE.** `keep_largest` throws away everything but the biggest blob, so
   a subject with detached parts (a sun's rays, a crown's points) ships with the parts missing.
   Say "FUSED ONTO … so the whole X is one connected silhouette" in the prompt.
2. **Saturated colour. Never white, never pale.** A white subject keys out with the background and
   the PNG comes back blank — or, worse, 82% opaque and *looks* fine to a checker while being a
   solid block on screen.
3. **No white panels behind the subject.**
4. **The background must be flat magenta edge to edge**, stated in those words.
5. **Nothing pink.** A pink object fights the magenta key. (Which is why the sunflower, not a rose.)

## NEW, from this lesson: the decorative splash

`obj_seb` came back **three times** with a painterly pink cloud behind the apple. It was not a
keying failure — the model was *painting a decorative splash* as part of the illustration, and
`keep_largest` kept it because it touches the apple's stem.

It survived every automated check: 57% opaque, 29 colour buckets, and my own magenta test counted
only 0.46% of the object, because the splash is **pink (hue 340), not magenta**, and the test wants
`g <= b - 40`.

Prompting against it failed twice, including an explicit "NO paint splash, NO halo, NO decorative
shape". The fix that worked is a post-process: flood-fill inward **from the top border through
pinkish pixels only** (hue 300-348, sat ≥ 0.55), which stops dead at the apple because the apple
sits at hue 350-360. Measured before committing to the thresholds:

| region | hue | sat |
|---|---|---|
| splash | 340 | 0.90 |
| apple body | 350-360 | 0.80 |

26,545 px cleared; leaf, stem, outline and highlights all intact.

**If you regenerate `obj_seb`, look at it.** The detector will pass the splash again.

## Scenes — what to keep an eye on

Both known issues are cosmetic and were left as-is, not missed:

- `scn_pair_dard` has alphabet blocks reading **"A B"** in the background — Latin letters in a
  Hindi reading lesson.
- `scn_likhna`'s notebook page carries **squiggles** rather than the blank page the prompt asked
  for. They are not letters of any script, so they do not compete with the lesson's own text.

Both are small background props. Re-roll only if the SME wants them gone.

## NEW, from ओ/औ: the fused prop becomes the subject

`obj_nauka` asked for a boat with "one upright oar FUSED to the hull". The model fused it into an
**arch across the hull**, and the result reads as a basket with a handle. `keep_largest` kept it
because it is one connected shape — which is exactly what the rule asks for.

**A prop that must rise above the subject will be fused INTO the subject's silhouette.** So either
leave the prop out, or accept that it changes the shape. Here the fix was to drop the oar and
describe the hull itself: pointed bow, pointed stern, curving up at both tips.

Also new, and cheap to state: **say what it must NOT be.** "NO handle, NO arch, NO basket" fixed in
one pass what three shape adjectives had not.

## NEW: a scene must show the same object as its card

`scn_khel` came back with the child playing with a toy TRAIN while `obj_khilona` is a red duck. On
a `SENTENCE_COMPLETE` screen the picture is the only route a child who cannot yet read has, so a
scene that shows a different object than the option card does not just look untidy — it removes
the route. Name the object in the scene prompt exactly as the object prompt names it.

## The automated checks did not catch any of this

Corner alpha, opacity, colour spread and the pink test all passed on all three. Render a contact
sheet and look at it. Every art bug on this lesson family has been found that way.
