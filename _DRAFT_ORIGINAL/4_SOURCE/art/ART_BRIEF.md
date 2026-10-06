# Art brief — HI02H11_L02_S04 · ओ / औ

**16 images: 13 cut-outs + 3 scenes**, all generated and all looked at on a contact sheet
(`_objects_sheet.jpg`). Updated for the SME's review of 2026-10-05. The prompts are in
`_art_manifest.json` (cut-outs) and `_scene_spec.json` (scenes); the rules that past failures
taught are in [`_ART_RULES.md`](_ART_RULES.md).

## Cut-outs — `gen_objects.py` (magenta key, keep-largest, transparent PNG)

| key | word | matra | screens | what the SME asked for |
|---|---|---|---|---|
| `obj_ghada` | घड़ा | — | p.3 base | an earthen water pot, rounded body, narrow opening |
| `obj_ghoda` | घोड़ा | ो | p.3, 13, 14 | horse, full body, four legs, mane and tail |
| `obj_mor` | मोर | ो | p.4, 12, 14, 15 | **re-rolled** — blue neck, head crest, *clearly visible colourful tail feathers* (now a long trailing tail with eye-spots) |
| `obj_koyal` | कोयल | ो | p.4 | **new** — black koel, slender, long tail, red eye, on a simple branch; distinct from the crow |
| `obj_khilna` | खिलना | — | p.5 base | the open flower |
| `obj_khilna_bud` | — | — | p.5 base | **new** — the closed bud. The SME: "Show the opening action clearly through a short animation". The bud dissolves into the flower while «यह शब्द देखिए, खिलना» plays |
| `obj_khilona` | खिलौना | ौ | p.5, 15 | the pull-along toy duck, "matching the attached screen" — unchanged |
| `obj_kaua` | कौआ | ौ | p.6, 10, 14 | crow, dark feathers, beak, wings, visible feet — unchanged |
| `obj_paudha` | पौधा | ौ | p.6, 10, 12 | **re-rolled** — a young plant *growing in soil* (was a potted plant) |
| `obj_dhol` | ढोल | ो | p.10, 12, 15, 16 | **re-rolled** — "Show it at an angle so its shape is clear": three-quarter view, drumhead and lacing visible |
| `obj_tota` | तोता | ो | p.10, 13, 16 | **re-rolled** — curved red beak and a *long tail* (the old one had a stub) |
| `obj_daud` | दौड़ | ौ | p.13 | **new** — two children running, bent arms, lifted feet, on a strip of running track |
| `obj_hathauda` | हथौड़ा | ौ | p.13, 16 | **new** — a claw hammer, wooden handle, metal head, nothing else |

## Scenes — `gen_art.py --no-key` (background kept)

| key | sentence | shows |
|---|---|---|
| `scn_ped_kaua` | पेड़ पर एक ___ बैठा है। | **new** — one tree, one large crow on a branch, no person, no parrot |
| `scn_khel` | बच्चे के पास एक ___ है। | **re-rolled** — the child with ONE toy duck, *no other toys* (the old scene had blocks on a shelf) |
| `scn_hathauda` | आदमी के हाथ में एक ___ है। | **new** — a man holding a hammer by a workbench, a plank and one nail |

## Two re-rolls this round, both the same rule

"A scene must show the same object as its card" (`_ART_RULES.md`). The first `scn_khel` drew a
**yellow** duck against the **red** card, and the first `scn_hathauda` drew a **mallet** against a
**claw hammer** card. Both were re-rolled naming the card's colours and shape, and NOT-a-mallet.
Every automated check had passed both.

## Superseded

`obj_nauka`, `scn_nadi`, `scn_ped_tota` (no longer used) and the old `obj_mor`, `obj_dhol`,
`obj_tota`, `obj_paudha`, `scn_khel` are in `_quarantine/`, not deleted.
