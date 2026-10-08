
/* ==========================================================================================
   [S04] CORRECT-ANSWER CONFETTI from MTG2A04_L02_S01 (app.js "FLN ANIMATION KIT: confetti
   (call site)"), as the developer asked: "extract the same confetti effect (animation)".
   The kit's recipe 7 (FLNMotion.confetti, byte-identical in both lessons) with MTG2A04's own
   settings: stars / rectangles / lines / squares, ~100 pieces over the WHOLE window (#fxLayer,
   body-level), 1.5x size, the slower fall [1.6, 2.6], on every correct answer (phases:[]).
   It replaces this engine's side-cannon confettiCannon(); every call site is unchanged.
   (MTG2A04 also plays sfx_confetti here - left out: the ask was the animation only.)
   ========================================================================================== */
confettiCannon = function(){
  var sl = CARD.slides[state.idx] || {};
  if(window.FLNMotion && FLNMotion.confetti)
    FLNMotion.confetti.burst({ host: "#fxLayer", phase: sl.phase, phases: [], count: 100, fall: [1.6, 2.6] });
};
