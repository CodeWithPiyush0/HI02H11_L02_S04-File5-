Add the lip-synced Swiftie celebration to this lesson's final celebration screen, using the kit at:

    F:\CG Game\FLN\File4 (Math)\MTG204_L01_S01\celebration_kit

Read `celebration_kit/README.md` first and follow it exactly.

Rules:
1. Use the kit's three sheets (`sheets/cel_shabaash.webp`, `cel_talk.webp`, `cel_idle.webp`) and
   `sheets/cel_meta.json` UNCHANGED — they are already size-matched and their open-mouth frame lists
   are measured. Copy the sheets into this lesson's assets (e.g. `assets/UI/celebration/`).
2. Make the lip-sync track from THIS lesson's own celebration voice-over with
   `python celebration_kit/make_lipsync.py <celebration VO file> --json <out>`. If the lesson has a
   build script, have the build script run this so a re-recorded VO re-syncs on the next build.
3. Play it with `SwiftieCelebration.play(...)` from `swiftie_celebration.js` / `.css`, started together
   with the celebration VO. If this lesson uses the SwiftPAL engine (lesson_template.html), wrap
   `SlideModules.CELEBRATION.mount` as shown in the README — do not edit the engine file — hide the
   stock `.end-mascot`, and keep the celebration arrow button in its existing size and position.
4. The celebration line should start with «शाबाश!» (the jump is fitted to the first word). If it does
   not, tell me before changing any wording.
5. Nothing else in the lesson changes.

Verify before telling me it's done:
- play the celebration with the REAL audio in a browser and log the sprite's `data-sheet` / `data-f` /
  `data-t`; the talk-phase mouth must match the track at `t + 16 ms` in ≥ 99 % of samples, with no
  mismatch away from a syllable edge; no open-mouth frame after the VO ends;
- screenshot the jump, the talking and the idle phases and look at them;
- no console errors or 404s; if the lesson has a size cap, it still fits.
Report the measured match %, and anything you could not verify.
