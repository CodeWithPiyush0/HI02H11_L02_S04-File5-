
/* ============================================================================================
   «मात्राओं की रेल» — TRAIN MODULE SET                        [local to HI02H11_L02_S02]
   ============================================================================================
   Built to the SME's recommendations recorded verbatim in
   ../HI02H11_L02_S01/_SME_RECOMMENDATIONS.md (16 screens, deck of 2026-09-16).

   Everything here is ADDITIVE: new entries on SlideModules plus one CSS block. No existing
   module, helper or style is modified, so every other lesson on this engine line renders
   byte-identically. This is the kit's documented per-game route (engine_local/), not an edit
   to the shared engine.

   THREE ENGINE FACTS THIS CODE IS BUILT AROUND — change them at your peril:

   1. capture_pages.py injects `*{animation:none!important;transition:none!important}` to settle
      the renderer for review captures. So every element here is authored in its FINAL position
      with the entry motion applied as an added class. Kill the animation and you get the settled
      slide, not an empty one. (Four attempts were lost to this on the landing glow.)
   2. makeDraggable(tile, onDrop) hit-tests `.dd-zone` and calls onDrop(zone, tile). Coaches that
      accept a drop therefore carry `.dd-zone`; coaches that are only tap targets must NOT, or a
      stray drag would highlight them.
   3. A module that drives its own audio MUST set state.ownsAudio = true, or mountSlide's
      autoPlayChain fires the prompt concurrently and truncates the module's own chain.

   THE LADDER IS 3-ATTEMPT HERE, per the SME on all nine test screens:
      wrong 1 -> shake + hint1 VO, explicitly NO hand
      wrong 2 -> shake + hint2 VO + hand on the CORRECT target
      3rd try correct -> confetti + glow, and SILENT (no praise for a twice-missed item)
   Implemented inside these modules rather than by changing the shared scaffold, so the blast
   radius stays inside this game. Reads scaffold_rules.max_attempts, default 3.
   ============================================================================================ */
(function(){
  "use strict";

  const A = (slide, key) => (typeof audioFor === "function" ? audioFor(slide, key) : null);
  const maxTries = () => ((CARD.scaffold_rules && CARD.scaffold_rules.max_attempts) || 3);
  /* [h2] REVIEW-1 LADDER. `hint_levels` is 3 on this card; with anything less every module falls
     back to the two-rung behaviour it shipped with, so the engine stays usable by a card that
     has not been re-authored. */
  const hintLevels  = () => ((CARD.scaffold_rules && CARD.scaffold_rules.hint_levels) || 2);
  const handOnHint3 = () => !!(CARD.scaffold_rules && CARD.scaffold_rules.hand_on_hint3);

  /* Run `steps` one after another; each is called with the continuation. Every rung-2
     demonstration is a chain of clips with something lit while each one sounds, and a chain
     written by hand three times over is a chain with three different bugs in it. */
  /* THE SCREEN IS HELD FOR A WHOLE DEMONSTRATION, NOT FOR EACH OF ITS CLIPS.
     `state.revealing` is the flag makeDraggable already honours, so raising it stops a drag from
     even starting; `hintBusy` covers the tap paths, which go through their own handlers. Both are
     cleared together when the chain ends, and `newVoEpoch()` clears hintBusy on every mount so a
     screen left mid-demonstration cannot arrive stuck. */
  let hintBusy = false;
  function hintHold(run, after){
    hintBusy = true;
    state.revealing = true;
    run(function(){
      hintBusy = false;
      state.revealing = false;
      if(after) after();
    });
  }

  function hintSeq(steps, done){
    let i = 0;
    (function step(){
      if(i >= steps.length){ if(done) done(); return; }
      steps[i++](step);
    })();
  }

  /* Take a matra highlight back off. matraHL() replaces the element's text and lays overlays on
     top of it, keeping the original in dataset.mhWord - so undoing it is: drop the overlays,
     drop the class, put the text back. Rung 2 lights each word only WHILE it is being read
     ("हर शब्द पढ़ते समय उसकी मात्रा highlight करें"), so it has to come off again. */
  function matraClear(el){
    if(!el) return;
    el.querySelectorAll(".mh-ov").forEach(o => o.remove());
    el.classList.remove("mh");
    if(el.dataset.mhWord) el.textContent = el.dataset.mhWord;
  }

  /* THE HAND, ON RUNG 3, ON EVERY SCREEN.
     [28f]/[28j]: the hand is allowed in tutorial and guided and never in practice, and the rule
     is enforced inside pointNudgeAt because ~25 call sites reach it directly - gating the call
     sites is what produced three rounds of "fixed" that were not. Review-1 asks for a rung-3
     hand on screens 6-11, all of which are practice.
     So the rule is not edited: the phase set is widened around this ONE call and restored in a
     finally. Everything inside pointNudgeAt / travelNudge runs synchronously (the animation is
     started, not awaited), so nothing else can observe the widened set. Set
     scaffold_rules.hand_on_hint3 to false and [28f] applies exactly as before. */
  function withHand3(fn){
    /* [S04] THE HAND IS ALSO DECIDED PER SCREEN. The S04 deck moves word-build, the picture sort
       and the three sentences into GUIDED (where the hand is normally allowed) and then says, on
       each of those five screens, "Pending confirmation, use glow and lock without a hand". So a
       slide whose card says `hint3_hand:false` takes its own phase OUT of the set for this one
       synchronous call - the glow, the lock and the line all still happen, only the hand does not. */
    const _cur = (typeof CARD !== "undefined" && CARD.slides && CARD.slides[state.idx]) || null;
    if(_cur && _cur.data && _cur.data.hint3_hand === false && typeof HAND_PHASES !== "undefined"){
      const ph = _cur.phase, had = HAND_PHASES.has(ph);
      if(had) HAND_PHASES.delete(ph);
      try { fn(); } finally { if(had) HAND_PHASES.add(ph); }
      return;
    }
    if(!handOnHint3() || typeof HAND_PHASES === "undefined"){ fn(); return; }
    const had = HAND_PHASES.has("practice");
    if(!had) HAND_PHASES.add("practice");
    try { fn(); } finally { if(!had) HAND_PHASES.delete("practice"); }
  }

  /* [S04] WHEN IS A WIN SILENT. File3 went quiet after TWO misses. The S04 deck writes the
     silence only for the win AFTER HINT 3 ("No additional VO is needed because Hint 3 has already
     explained the answer") and says a correct answer at any earlier stage is accepted as usual -
     so the threshold is a card rule: `silent_from_attempt` misses (3 here), default File3's. */
  const silentFrom = () => ((CARD.scaffold_rules && CARD.scaffold_rules.silent_from_attempt)
                            || (maxTries() - 1));
  /* [S04] the SME authors the option order on every S04 screen ("Keep the options in this order:
     मोर, दौड़, चौक"). `shuffle:false` keeps it; anything else deals fresh as File3 does. */
  const dealt = (d, list, key) => (d && d.shuffle === false) ? (list || []).slice() : shuffledFresh(list, key);

  /* Turn a bare clip ID into a playable path. `audioFor()` does this for ids that live in
     slide.audio, but several modules carry ids INSIDE slide.data (a MEET_PAIR example's line, a
     MATRA_INTRO pair's name, a MATRA_FILL slot's word) and those never pass through it.

     THIS EXISTS BECAUSE THE BUG SHIPPED. MEET_PAIR called `say(ex.audio_line)` with the raw id
     "vo_meet_pul", so the browser requested `/vo_meet_pul` — 404 — and the child heard SILENCE on
     the line that teaches the word, on all three example screens. It was invisible to every check
     we had: the clip exists on disk, the preloader fetches it correctly by id, the asset sweep
     found it, and say()'s 9s fallback timer meant the chain still advanced and the slide still
     completed. Only the browser's own network log showed the 404.
     Found by reading the network log of the packaged handoff copy. */
  function clip(idOrPath){
    if(!idOrPath) return null;
    if(idOrPath.indexOf("/") >= 0 || idOrPath.indexOf(".") >= 0) return idOrPath;  // already a path
    return "assets/Audio/" + idOrPath + "." + AUDIO_EXT;
  }

  /* Speak `src`, run `next` when it ENDS. Per-clip fallback timer so one missing or slow clip
     can never stall a chain — the same belt-and-braces sortSeqReveal uses.
     `src` may be a path OR a bare clip id; clip() normalises it, so no caller can reintroduce
     the 404-on-a-bare-id bug described above. */
  /* ONE CHAIN AT A TIME, EVER.
     Every module here drives a chain of clips that call each other's callbacks, and a chain has
     no idea the screen under it has changed. Mount a slide while a previous chain is still in
     flight — a re-mount, a replay, a fast आगे — and the two talk over each other. Measured on
     this bundle: two concurrent MATRA_INTRO mounts put `vo_pair_u` on top of itself for 2.1s.
     So every chain carries the epoch it started in, and a callback whose epoch has moved on is
     simply dropped. Nothing else has to know about it. */
  let _voGen = 0;
  function newVoEpoch(){
    hintBusy = false;                 /* a screen left mid-demonstration must not arrive stuck */
    /* the no-heading opt-out is per SLIDE, so it is cleared on every mount and re-applied only by
       a module whose card asks for it. Round 2 hid the band GLOBALLY and shipped 14 screens with
       a mascot sitting next to nothing; this cannot do that. */
    const st = document.getElementById("stage");
    if(st){ st.classList.remove("no-band"); st.classList.remove("mp-center"); }
    return ++_voGen;
  }
  function say(src, next){
    const gen = _voGen;
    let done = false;
    const go = () => { if(done) return; done = true;
      if(gen !== _voGen) return;                 // the screen moved on; this chain is stale
      if(next) next(); };
    try { play(clip(src) || null, go); } catch(e){ go(); return; }
    setTimeout(go, 9000);
  }
  /* say() for an OPTIONAL clip: a null/absent id runs `next` immediately instead of handing
     play() a null source and then sitting out the 9-second fallback timer. Round 3 has
     several rungs the SME deliberately SILENCES — the 3rd-attempt win on every test screen,
     the completion line on every sort screen — and each of those is an absent clip, not a
     pause the child should sit through. */
  function sayOpt(src, next){ if(!src){ if(next) next(); return; } say(src, next); }

  function sayAll(list, next){
    let i = 0;
    (function step(){ if(i >= list.length){ if(next) next(); return; } say(list[i++], step); })();
  }

  /* ---------------------------------------------------------------- procedural SFX */
  /* The SME asks for a train arrival sound, a soft pop as each matra lands and a sparkle when
     one is highlighted. The engine already synthesises its SFX with _tone() rather than
     shipping audio files, so these are built the same way — no new assets, nothing to 404. */
  const _t = (f, w, d, v) => { if(typeof _tone === "function") _tone(f, w, d, v); };
  /* REAL RECORDED SFX, brought over from the sibling lesson. The SME asks for "a soft train
     arrival / whistle SFX when the train enters" on the landing and on every train screen; round
     3 first synthesised those with the engine's own _tone(), which gives a two-note beep rather
     than a train. These play the actual files and fall back to the synthesised tone if one is
     ever missing, so a stripped bundle still makes a noise rather than going silent. */
  /* [r77] every sound started here is remembered until it ends, so arriving on a new page can stop
     them - they are fire-and-forget <audio> elements, and nothing else ever did */
  const _sfxLive = new Set();
  window.__stopLessonSfx = function(){
    _sfxLive.forEach(a => { try{ a.pause(); a.currentTime = 0; }catch(e){} }); _sfxLive.clear();
  };
  function sfxFile(name, fallback){
    try{
      /* [r17] versioned like every other clip - see _av() in the engine */
      const a = new Audio(typeof _av === "function"
        ? _av("assets/Audio/" + name + "." + AUDIO_EXT)
        : "assets/Audio/" + name + "." + AUDIO_EXT);
      a.volume = 0.55;
      _sfxLive.add(a); a.addEventListener("ended", ()=> _sfxLive.delete(a), { once:true });
      if(window.__lessonBgm) window.__lessonBgm.track(a);      /* [r99] the music steps back */
      a.play().catch(()=> fallback && fallback());
    }catch(e){ if(fallback) fallback(); }
  }
  const _toneWhistle = ()=> _t([430, 660, 560], "sine", 0.55, 0.075);
  const sfxWhistle      = ()=> sfxFile("sfx_whistle",      _toneWhistle);  // the toot
  /* [r73] Yasir's feedback sounds for a right and a wrong answer, on every screen of this lesson.
     The engine's sfxCorrect() / sfxWrongSoft() are synthesised tones; they stay as the fallback
     if a file cannot play. Levelled to -15 LUFS (prepare step in CHANGES_HINTS r73). */
  const fbCorrect = ()=> sfxFile("sfx_fb_correct",
                                 ()=>{ if(typeof sfxCorrect === "function") sfxCorrect(); });
  const fbWrong   = ()=> sfxFile("sfx_fb_incorrect",
                                 ()=>{ if(typeof sfxWrongSoft === "function") sfxWrongSoft(); });
  const sfxTrainMove    = ()=> sfxFile("sfx_train_move",   null);          // the chug bed
  const sfxPopSoft = ()=> _t([720], "sine", 0.10, 0.07);
  const sfxSparkle = ()=> _t([1180, 1560], "sine", 0.22, 0.055);

  /* ================================================================ matra highlight */
  /* Colour ONLY the matra inside a rendered word — the SME's most repeated teach-screen note
     («Highlight only the ा matra in the word»), and the one thing the first build could not do
     for this skill.

     WHY THE ENGINE'S OWN METHOD CANNOT DO IT. RIGHT_SPACING_MATRAS + _matraClipCols clip a
     vertical PIXEL COLUMN range out of a duplicate of the word. That works for ा and ी, which
     occupy their own advance width to the right of the consonant. ु and ू are BELOW-BASE marks
     with ZERO advance: they sit under their consonant and share its columns. A column clip
     therefore selects the consonant and whatever follows. Forced on and measured, «पुल» put
     11,342 red pixels on the ल and «फूल» produced a 13-pixel sliver. Both are silently wrong,
     which is worse than no highlight, so the builder hard-fails if either matra is added to
     RIGHT_SPACING_MATRAS.

     WHAT WORKS: clip in TWO dimensions instead of one.
       1. Segment the word into grapheme clusters (Intl.Segmenter, 'hi'), so «पुल» → ["पु","ल"]
          and the mark is never separated from its base.
       2. For each cluster containing the target mark, take that cluster's x-range with a Range
          rect — exact, and it costs nothing that guessing at character widths would save.
       3. Intersect with the band BELOW the baseline (found with a zero-size inline-block strut,
          which sits exactly on it). Nothing else in these words descends, so the intersection
          contains the mark and only the mark.
     For a right-spacing matra the below-baseline band is empty, so mode "right" clips the
     cluster's x-range at FULL height minus the base's advance — measured the same way, by
     rendering the cluster without its mark. Both modes are exercised; भाग 2 (ए/ऐ) will need the
     third, "above", for े/ै, and the hook is here.

     Verified at 150px on पुल, फूल and मुकुट — the last of which correctly reddens BOTH marks.
     The overlay duplicates the whole word and is clipped, so it can never drift out of register
     with the original, at any size or weight. aria-hidden keeps the word read once. */
  const _segmenter = (typeof Intl !== "undefined" && Intl.Segmenter)
    ? new Intl.Segmenter("hi", { granularity: "grapheme" }) : null;

  function clustersOf(word){
    if(_segmenter) return [..._segmenter.segment(word)].map(s => s.segment);
    return [...word];                                   // never hit in Chromium; safe fallback
  }

  /* Measure the advance width of `txt` in the same computed font as `ref`. */
  function _advance(txt, ref){
    const m = document.createElement("span");
    const cs = getComputedStyle(ref);
    m.style.cssText = "position:absolute;visibility:hidden;white-space:pre;left:-9999px;" +
      "font:" + cs.font + ";font-family:" + cs.fontFamily + ";font-size:" + cs.fontSize +
      ";font-weight:" + cs.fontWeight + ";letter-spacing:" + cs.letterSpacing;
    m.textContent = txt;
    document.body.appendChild(m);
    const w = m.getBoundingClientRect().width;
    m.remove();
    return w;
  }

  /* el: an element whose ONLY child is the word text. Rewrites it as .mh + clipped overlays. */
  /* ---------------------------------------------------------------- matra ink mask
     THE MATRA'S PIXELS, FOUND BY SUBTRACTION RATHER THAN BY GEOMETRY.

     Yasir, round 13: "when we highlight the matra then highlight only the matra, currently many
     place some matra is half highlighted, some are highlighted with the letter as well."

     Both symptoms come from the same thing: every previous version drew a RECTANGLE around where
     the matra was calculated to be, and then painted whatever ink fell inside it.
       · too small  -> the mark's tail or its lower curl sits outside the box and stays navy
                       ("half highlighted"),
       · too large  -> it catches the consonant's foot or the next letter's stem
                       ("highlighted with the letter as well").
     Every fix moved the edges and traded one symptom for the other, because a below-base matra is
     not rectangular and no rectangle can contain it exactly.

     So stop guessing the box. Raster the word TWICE at the same origin - once as written, once
     with the matra deleted - and take the difference. Those pixels are the matra and nothing else,
     by construction, whatever the font does with the cluster. The result is used as a MASK on the
     orange overlay, so the highlight is the mark's own silhouette.

     WHY THIS IS SAFE FOR ु / ू AND NOT FOR EVERY MATRA: ु and ू are non-spacing - they add no
     advance, so deleting one leaves every other glyph exactly where it was and the difference is
     purely the mark. A spacing matra (ा, ी) shifts the letters after it, and ि reorders, so the
     difference would include half the word. Those keep the advance-based path below, which is
     what the sibling lesson uses and what works for them. */
  const _MI_CACHE = new Map();
  function _matraInkMask(word, matra, fontPx, dpr){
    const key = word + "|" + matra + "|" + fontPx + "|" + dpr;
    if(_MI_CACHE.has(key)) return _MI_CACHE.get(key);

    const base = word.split(matra).join("");
    if(!base || base === word) return null;

    const S = Math.max(1, Math.round(fontPx * dpr));
    const font = '800 ' + S + 'px "Baloo 2","Noto Sans Devanagari",sans-serif';
    const cv = document.createElement("canvas");
    const cx = cv.getContext("2d", { willReadFrequently: true });
    cx.font = font;
    const w = Math.ceil(cx.measureText(word).width) + Math.ceil(S * 0.4);
    /* generous vertical room: ु / ू hang well under the baseline and the shirorekha sits high */
    const asc = Math.round(S * 1.05), desc = Math.round(S * 0.75);
    const h = asc + desc;
    cv.width = w; cv.height = h;

    const raster = (txt)=>{
      cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.clearRect(0, 0, w, h);
      cx.font = font; cx.textBaseline = "alphabetic"; cx.fillStyle = "#000";
      cx.fillText(txt, Math.round(S * 0.2), asc);
      return cx.getImageData(0, 0, w, h).data;
    };
    const A = raster(word), B = raster(base);

    /* A pixel belongs to the matra when the full word inks it and the stripped word does not.
       The 26/40 split is deliberate: a pixel only just touched in A but solidly absent from B is
       still the mark's anti-aliased edge, and dropping those left a navy fringe around the
       orange - which read as "half highlighted" at 3x. */
    const out = cx.createImageData(w, h);
    const o = out.data;
    let any = false, minX = w, maxX = -1, minY = h, maxY = -1;
    for(let i = 0, p = 0; i < A.length; i += 4, p++){
      if(A[i + 3] > 26 && B[i + 3] <= 40){
        o[i] = o[i + 1] = o[i + 2] = 255;
        o[i + 3] = A[i + 3];
        any = true;
        const x = p % w, y = (p / w) | 0;
        if(x < minX) minX = x; if(x > maxX) maxX = x;
        if(y < minY) minY = y; if(y > maxY) maxY = y;
      }
    }
    if(!any){ _MI_CACHE.set(key, null); return null; }

    cx.putImageData(out, 0, 0);
    const res = { url: cv.toDataURL("image/png"), w: w, h: h, asc: asc,
                  padX: Math.round(S * 0.2), dpr: dpr,
                  box: [minX, minY, maxX, maxY] };
    _MI_CACHE.set(key, res);
    return res;
  }

  /* [r83] HOW FAR A BELOW-BASE MARK REALLY REACHES, measured, not guessed.
     Yasir (कबूतर, दूध): the right-hand end of the ू's curl was left navy. The band below the
     baseline reached a fixed 18 % past the consonant - enough for most letters, but ू under
     ब or द curls further than that. So the cluster is drawn twice off-screen, with and without
     the mark, in the element's OWN computed font at 4x, and the columns where only the mark has
     ink give its true left and right edges relative to the cluster's start. Only the EXTENT is
     taken from the canvas - the orange is still the page's own text, so it cannot be out of
     register - and it is still confined to the band under the baseline. */
  const _MR_CACHE = new Map();
  function _markReach(cl, matra, el){
    const base = cl.split(matra).join("");
    if(!base || base === cl) return null;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize) || 0;
    if(!fs) return null;
    const K = 4, S = fs * K;
    const font = (cs.fontStyle || "normal") + " " + (cs.fontWeight || "400") + " " + S + "px " + cs.fontFamily;
    const key = cl + "|" + matra + "|" + font;
    if(_MR_CACHE.has(key)) return _MR_CACHE.get(key);
    const cv = document.createElement("canvas");
    const cx = cv.getContext("2d", { willReadFrequently: true });
    cx.font = font;
    const pad = Math.ceil(S * 0.6);
    const w = Math.ceil(cx.measureText(cl).width) + pad * 2, asc = Math.ceil(S * 1.1), h = asc + Math.ceil(S * 0.8);
    cv.width = w; cv.height = h;
    const raster = (t)=>{ cx.clearRect(0, 0, w, h); cx.font = font; cx.textBaseline = "alphabetic";
      cx.fillStyle = "#000"; cx.fillText(t, pad, asc); return cx.getImageData(0, 0, w, h).data; };
    const A = raster(cl), B = raster(base);
    let minX = w, maxX = -1;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
      const i = (y * w + x) * 4 + 3;
      if(A[i] > 26 && B[i] <= 40){ if(x < minX) minX = x; if(x > maxX) maxX = x; }
    }
    const res = maxX < 0 ? null : { left: (minX - pad) / K, right: (maxX + 1 - pad) / K };
    _MR_CACHE.set(key, res);
    return res;
  }

  /* [S04] THE MARK'S OWN PIXELS, for ो / ौ (ported from the S04 draft's _markMask, Change 12).
     ो is a hook ABOVE the consonant plus the bar to its RIGHT; ौ the same with two hooks. Any
     rectangle holding both parts also holds the consonant between them - measured on the draft,
     a box clip reddened 37% of म under ो and 42% under ौ. The band paths below were written for
     ु / ू and cannot do it. So the cluster is rastered with and without the mark, at the SAME
     origin and in the element's own font, and the changed pixels (dilated 1px so antialiasing
     is not shaved) become a CSS mask on the overlay. The overlay is still the page's own text,
     so it cannot be out of register; the mask only decides which of its pixels show.
     Returns a canvas at `k` x CSS px with the text origin at (ox, oy). */
  let _mkCv = null, _mkCx = null;
  function _markMaskK(cluster, base, ref, k){
    if(!cluster || !base || cluster === base) return null;
    const cs = getComputedStyle(ref);
    const fpx = parseFloat(cs.fontSize) || 0;
    if(!fpx) return null;
    const F = fpx * k;
    const W = Math.ceil(F * 3), H = Math.ceil(F * 3.2);
    if(!_mkCv){ _mkCv = document.createElement("canvas");
      _mkCx = _mkCv.getContext("2d", { willReadFrequently:true }); }
    if(_mkCv.width < W || _mkCv.height < H){ _mkCv.width = W; _mkCv.height = H; }
    const font = (cs.fontStyle || "normal") + " " + cs.fontWeight + " " + F + "px " + cs.fontFamily;
    const ox = Math.round(F * 0.6), oy = Math.round(F * 2.1);
    function alpha(txt){
      _mkCx.clearRect(0, 0, _mkCv.width, _mkCv.height);
      _mkCx.font = font; _mkCx.textBaseline = "alphabetic"; _mkCx.fillStyle = "#000";
      _mkCx.fillText(txt, ox, oy);
      return _mkCx.getImageData(0, 0, W, H).data;
    }
    let A, B;
    try { A = alpha(cluster); B = alpha(base); } catch(e){ return null; }
    const on = new Uint8Array(W * H);
    let any = false, x0 = W, x1 = -1, y0 = H, y1 = -1;
    for(let i = 0, p = 3; i < W * H; i++, p += 4){
      if(A[p] > 26 && A[p] - B[p] > 40){ on[i] = 1; any = true;
        const x = i % W, y = (i / W) | 0;
        if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
    }
    if(!any) return null;
    const out = document.createElement("canvas");
    out.width = W; out.height = H;
    const octx = out.getContext("2d");
    const img = octx.createImageData(W, H);
    const dd = img.data;
    const R = Math.max(1, Math.round(k));             /* dilation radius in device px */
    for(let y = Math.max(0, y0 - R); y <= Math.min(H - 1, y1 + R); y++){
      for(let x = Math.max(0, x0 - R); x <= Math.min(W - 1, x1 + R); x++){
        let hit = on[y * W + x];
        for(let dy = -R; !hit && dy <= R; dy++){
          const yy = y + dy; if(yy < 0 || yy >= H) continue;
          for(let dx = -R; dx <= R; dx++){
            const xx = x + dx; if(xx < 0 || xx >= W) continue;
            if(on[yy * W + xx]){ hit = 1; break; }
          }
        }
        if(hit){ const q = (y * W + x) * 4; dd[q] = dd[q+1] = dd[q+2] = 255; dd[q+3] = 255; }
      }
    }
    octx.putImageData(img, 0, 0);
    return { canvas: out, ox: ox, oy: oy };
  }
  /* below-base marks keep File3's own (verified) band path; every other mark takes the mask */
  const _BELOW_MARKS = new Set(["ु", "ू", "ृ", "्"]);

  function matraHL(el, matra, opts){
    if(!el || !matra) return false;
    const word = (el.dataset.mhWord || el.textContent || "").trim();
    if(!word || word.indexOf(matra) < 0) return false;
    el.dataset.mhWord = word;
    el.textContent = word;                              // reset if we are re-highlighting
    el.classList.add("mh");

    const clusters = clustersOf(word);
    const rect = el.getBoundingClientRect();
    if(!rect.width || !rect.height) return false;       // not laid out yet — caller retries

    /* [S04] ो / ौ (and any other above/right mark): the exact per-pixel path, see _markMaskK */
    if(!_BELOW_MARKS.has(matra)){
      const _cssW0 = el.offsetWidth || 0, _cssH0 = el.offsetHeight || 0;
      const sc0 = (_cssW0 > 0) ? rect.width / _cssW0 : 1;
      const st0 = document.createElement("span");
      st0.style.cssText = "display:inline-block;width:0;height:0";
      el.appendChild(st0);
      const base0 = (st0.getBoundingClientRect().top - rect.top) / sc0;
      st0.remove();
      const tn0 = el.firstChild;
      if(tn0 && tn0.nodeType === 3 && _cssW0 && _cssH0){
        const fs0 = parseFloat(getComputedStyle(el).fontSize) || 0;
        const P = Math.ceil(fs0 * 0.6);               /* room for the hooks above a line-height:1 box */
        const k = Math.min(3, Math.max(1, (window.devicePixelRatio || 1) * sc0));
        /* ANCHOR ON THE TEXT, NOT ON THE ELEMENT. A chip slot is a centred flex box, so its text
           does not start at the element's top-left - and an overlay laid at (0,0) painted the
           orange a few px beside the real stroke. The overlay is placed over the text's own box. */
        const fr = document.createRange(); fr.setStart(tn0, 0); fr.setEnd(tn0, tn0.length);
        const tb0 = fr.getBoundingClientRect();
        const tX = (tb0.left - rect.left) / sc0, tY = (tb0.top - rect.top) / sc0;
        const tW = tb0.width / sc0, tH = tb0.height / sc0;
        /* IN A FLEX / GRID BOX THE STRUT IS ITS OWN ITEM, centred like any other, so its top is
           not the baseline (measured on the equation chip: 38px off). There the baseline is the
           text box's top plus the font's own ascent, which is exactly how the content box is built. */
        let baseY = base0;
        const _disp = getComputedStyle(el).display || "";
        if(/flex|grid/.test(_disp)){
          const cs1 = getComputedStyle(el);
          const mcx = document.createElement("canvas").getContext("2d");
          mcx.font = (cs1.fontStyle || "normal") + " " + cs1.fontWeight + " " + cs1.fontSize + " " + cs1.fontFamily;
          const mt = mcx.measureText(word);
          if(mt.fontBoundingBoxAscent) baseY = tY + mt.fontBoundingBoxAscent;
        }
        const mc = document.createElement("canvas");
        mc.width = Math.ceil((tW + 2 * P) * k); mc.height = Math.ceil((tH + 2 * P) * k);
        const mx = mc.getContext("2d");
        let off0 = 0, made0 = 0;
        clusters.forEach(cl => {
          if(cl.indexOf(matra) >= 0){
            const base = cl.split(matra).join("");
            const mk = base ? _markMaskK(cl, base, el, k) : null;
            if(mk){
              const r = document.createRange();
              r.setStart(tn0, off0); r.setEnd(tn0, off0 + cl.length);
              const cb = r.getBoundingClientRect();
              const cx = (cb.left - rect.left) / sc0;
              mx.drawImage(mk.canvas, Math.round((cx - tX + P) * k - mk.ox),
                           Math.round((baseY - tY + P) * k - mk.oy));
              made0++;
            }
          }
          off0 += cl.length;
        });
        let url = null;
        if(made0){ try { url = mc.toDataURL("image/png"); } catch(e){ url = null; } }
        if(url){
          const ov = document.createElement("span");
          ov.className = "mh-ov mh-mask" + (opts && opts.glow ? " mh-glow" : "");
          ov.setAttribute("aria-hidden", "true");
          ov.setAttribute("data-w", word);
          ov.style.boxSizing = "content-box";
          ov.style.left = (tX - P) + "px"; ov.style.top = (tY - P) + "px";
          ov.style.padding = P + "px";
          ov.style.width = tW + "px"; ov.style.height = tH + "px";
          /* the overlay's line box = the text's content box, so its glyphs land where the range was */
          ov.style.lineHeight = tH + "px";
          const u = "url(" + url + ")";
          ov.style.webkitMaskImage = u; ov.style.maskImage = u;
          ov.style.webkitMaskSize = "100% 100%"; ov.style.maskSize = "100% 100%";
          ov.style.webkitMaskRepeat = "no-repeat"; ov.style.maskRepeat = "no-repeat";
          el.appendChild(ov);
          if(opts && opts.pulse) el.classList.add("mh-pulse");
          if(typeof sfxSparkle === "function") sfxSparkle();
          return true;
        }
      }
      /* no mask (tainted canvas, no metrics): fall through to File3's band path */
    }

    /* baseline, via an inline-block strut: its top edge sits on the baseline.
       [r14] The strut is 100 CSS px wide so it ALSO measures the local scale. Everything below
       comes from getBoundingClientRect(), which is in SCREEN pixels - the stage's --scale has
       already been applied - while style.left/top are written in CSS pixels and get scaled again.
       Dividing by _mhScale converts one to the other. Without it the overlay lands at
       `offset x scale`, which at a real window size (--scale 0.54-0.81) is a whole second matra
       sitting beside the first. */
    /* [r65] A ZERO-WIDTH STRUT. [r14]'s 100px strut measured the scale as a bonus - and inside a
       card label that is 22px wide and width-locked by its flex parent, a 100px inline-block
       WRAPS onto a second line, so its top edge reported the second line's baseline. That is
       what put the orange a whole line off on every snapped card (measured: सुई's band 33px
       under its label; आलू's 20px above it, from the label growing to fit). The strut takes no
       width now, and the scale comes from the element's own two measurements of itself -
       screen px over CSS px - which needs no room at all. */
    const strut = document.createElement("span");
    strut.style.cssText = "display:inline-block;width:0;height:0";
    el.appendChild(strut);
    const _sr = strut.getBoundingClientRect();
    const _cssW = el.offsetWidth || 0;
    const _mhScale = (_cssW > 0 && rect.width > 0) ? rect.width / _cssW : 1;
    const baseline = (_sr.top - rect.top) / _mhScale;
    strut.remove();

    const tn = el.firstChild;
    if(!tn || tn.nodeType !== 3) return false;

    /* [r13] NON-SPACING MARKS GO THROUGH THE INK MASK. ु and ू add no advance, so the word can
       be rastered with and without the mark and the difference IS the mark - no rectangle, no
       edges to tune, nothing of the consonant caught. One overlay for the whole word, because the
       mask already contains every occurrence of the matra in it. */
    /* [r65] THE INK MASK IS RETIRED. Yasir: "you are making another matra with highlighted
       colour and placing it on top of the existing and this is where the misalignment is
       happening". Exactly so: the mask was cut on a canvas with its own font string and its own
       hinting, and landed a few px off the page's own glyph in every coach and on every card.
       The geometric path below draws the page's OWN text again, in orange, clipped to the band
       under the baseline - and a word cannot be out of register with itself. Kept behind a
       constant rather than deleted, so the measurement that led here is still in the file. */
    const USE_INK_MASK = false;
    if(USE_INK_MASK && !RIGHT_SPACING_MATRAS.has(matra)){
      const fs = parseFloat(getComputedStyle(el).fontSize) || 0;
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const m = fs ? _matraInkMask(word, matra, fs, dpr) : null;
      if(m){
        const full = document.createRange();
        full.setStart(tn, 0); full.setEnd(tn, word.length);
        const tb = full.getBoundingClientRect();
        const ov = document.createElement("span");
        ov.className = "mh-ov mh-ink" + (opts && opts.glow ? " mh-glow" : "");
        ov.setAttribute("aria-hidden", "true");
        const W = m.w / m.dpr, H = m.h / m.dpr;
        ov.style.left   = ((tb.left - rect.left) / _mhScale - m.padX / m.dpr) + "px";
        ov.style.top    = (baseline - m.asc / m.dpr) + "px";
        ov.style.width  = W + "px";
        ov.style.height = H + "px";
        ov.style.webkitMaskImage = ov.style.maskImage = 'url("' + m.url + '")';
        ov.style.webkitMaskSize  = ov.style.maskSize  = W + "px " + H + "px";
        el.appendChild(ov);
        if(opts && opts.pulse) el.classList.add("mh-pulse");
        if(typeof sfxSparkle === "function") sfxSparkle();
        return true;
      }
      /* no mask (missing font metrics, or the mark left no difference) -> fall through to the
         geometric path rather than silently painting nothing */
    }

    let off = 0, made = 0;
    clusters.forEach(cl => {
      if(cl.indexOf(matra) >= 0){
        const r = document.createRange();
        r.setStart(tn, off); r.setEnd(tn, off + cl.length);
        const cb = r.getBoundingClientRect();
        let x0 = (cb.left - rect.left) / _mhScale, x1 = (cb.right - rect.left) / _mhScale,
            y0 = baseline, y1 = rect.height / _mhScale;

        /* right-spacing marks (ा, ी) carry their own advance, so the mark is the slice of the
           cluster BEYOND the base's width, and it runs the full height rather than below the
           baseline. Detected by measuring, not by a hard-coded list of matras. */
        const base = cl.split(matra).join("");
        let below = true, xin0 = null, xin1 = null, ystep = null;
        if(base){
          const grow = (_advance(cl, el) - _advance(base, el)) / _mhScale;
          if(grow > 3){ x0 = x0 + (x1 - x0) - grow; y0 = 0; below = false; }
        }
        /* [r12] BELOW-BASE MARKS CURL PAST THEIR CLUSTER. ु and ू add no advance, so x1 is the
           base consonant's right edge - and the mark's tail sweeps a few px beyond it and was
           being clipped off, left navy against an orange body. Reach further, but ONLY in the
           below-baseline band this branch already restricts us to: down there the next letter
           has no ink to catch, so nothing else can be painted by the extra room. */
        if(below){
          x1 = Math.min(rect.width / _mhScale, x1 + Math.max(3, (x1 - x0) * 0.18));
          /* [r12] AND THE FLOOR HAS TO DROP. y1 was rect.height, but these panels set
             line-height:1 and the mark descends below the content box - so the bottom of
             every ु / ू was left navy under an orange body, which is what made the
             highlight look like a band rather than a mark. Nothing else is down there. */
          const _fs = parseFloat(getComputedStyle(el).fontSize) || 0;
          y1 = rect.height + _fs * 0.34;
          /* [r83] ...and reach as far as the mark's own ink does, on both sides (+1.5 px of
             anti-aliased edge), measured per cluster - see _markReach */
          const _mr = _markReach(cl, matra, el);
          if(_mr){
            const cx0 = (cb.left - rect.left) / _mhScale;
            xin0 = x0; xin1 = x1;              /* the band as it was: full height from the baseline */
            x1 = Math.max(x1, Math.min(rect.width / _mhScale + _fs * 0.4, cx0 + _mr.right + 1.5));
            x0 = Math.min(x0, Math.max(-_fs * 0.4, cx0 + _mr.left - 1.5));
            /* the widened part starts a hair lower: the letters either side dip a pixel under the
               baseline (त's bowl in कबूतर), and the curl's end hangs well below it anyway */
            ystep = y0 + _fs * 0.04;
          }
        }

        const ov = document.createElement("span");
        ov.className = "mh-ov" + (opts && opts.glow ? " mh-glow" : "");
        ov.setAttribute("aria-hidden", "true");
        /* THE OVERLAY'S TEXT LIVES IN AN ATTRIBUTE, NOT IN A TEXT NODE, and is painted by
           .mh-ov::before{content:attr(data-w)}. This is not a style preference — the engine's
           centerInkGlyph() measures a glyph with `span.textContent`, which CONCATENATES
           descendants. A plain text-node overlay would make «पुल» measure as «पुलपुल», so the
           engine would compute a double-width ink box and shrink the real word to fit it.
           A pseudo-element is invisible to textContent, so the two systems stop fighting. */
        ov.setAttribute("data-w", word);
        const P2 = (x, y)=> x + "px " + y + "px";
        ov.style.clipPath = (xin0 !== null && ystep !== null)
          ? "polygon(" + [P2(xin0, y0), P2(xin1, y0), P2(xin1, ystep), P2(x1, ystep), P2(x1, y1),
                          P2(x0, y1), P2(x0, ystep), P2(xin0, ystep)].join(",") + ")"
          : "polygon(" + x0 + "px " + y0 + "px," + x1 + "px " + y0 + "px," +
                         x1 + "px " + y1 + "px," + x0 + "px " + y1 + "px)";
        el.appendChild(ov);
        made++;
      }
      off += cl.length;
    });
    if(made && opts && opts.pulse) el.classList.add("mh-pulse");
    if(made && typeof sfxSparkle === "function") sfxSparkle();
    return made > 0;
  }

  /* Retry until the element is actually laid out.

     matraHL needs a real getBoundingClientRect, and there are three ways it can be zero at the
     moment a module mounts: the slide is still mid slide-in, the webfont has not resolved so
     the glyph has no metrics yet, or the engine's own centerInkGlyph is mid-measure. A single
     rAF retry was NOT enough — verified on the built page, where a MEET_PAIR word came back
     with zero overlays and no error, which is exactly the silent-failure mode this lesson has
     been bitten by before. So: retry across several frames, then give up quietly.
     Also re-run after document.fonts.ready, because a font swap changes every measurement. */
  function matraHLSoon(el, matra, opts){
    let tries = 0;
    (function attempt(){
      if(!el || !el.isConnected) return;
      if(matraHL(el, matra, opts)) return;
      if(++tries > 10) return;
      (tries < 4 ? requestAnimationFrame : (f)=> setTimeout(f, 60))(attempt);
    })();
    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(()=>{
        if(el && el.isConnected && !el.querySelector(".mh-ov")) matraHL(el, matra, opts);
      });
    }
  }

  /* The locomotive, shared. Round 3 puts a train on the landing and on MATRA_INTRO too
     («the matras can be shown inside two train bogies … so the lesson visually continues as
     a «मात्राओं की रेल» journey»), so the drawing is lifted out of buildTrain rather than
     copied three times. */
  const LOCO_SVG =
      '<svg viewBox="0 0 190 130" width="190" height="130" aria-hidden="true">' +
      '<rect x="8" y="46" width="104" height="52" rx="12" fill="#E8453C" stroke="#7A1F1A" stroke-width="5"/>' +
      '<rect x="104" y="20" width="62" height="78" rx="12" fill="#E8453C" stroke="#7A1F1A" stroke-width="5"/>' +
      '<rect x="116" y="34" width="38" height="30" rx="7" fill="#BFE3FF" stroke="#7A1F1A" stroke-width="5"/>' +
      '<rect x="20" y="26" width="26" height="26" rx="5" fill="#F7C948" stroke="#7A1F1A" stroke-width="5"/>' +
      '<rect x="2" y="92" width="176" height="12" rx="6" fill="#7A1F1A"/>' +
      '<circle cx="36" cy="110" r="17" fill="#3B3B4F" stroke="#1C1C2A" stroke-width="5"/>' +
      '<circle cx="36" cy="110" r="6" fill="#F7C948"/>' +
      '<circle cx="100" cy="110" r="17" fill="#3B3B4F" stroke="#1C1C2A" stroke-width="5"/>' +
      '<circle cx="100" cy="110" r="6" fill="#F7C948"/>' +
      '<circle cx="150" cy="110" r="14" fill="#3B3B4F" stroke="#1C1C2A" stroke-width="5"/>' +
      '</svg>';


  /* ==========================================================================================
     TRAIN CHROME — ported verbatim from HI02H11_L02_S01, whose [r7] note describes the exact
     defect this bundle had: "The cover ran the painted train while pages 8-14 drew a DIFFERENT
     locomotive next to CSS-drawn boxes. Same lesson, two trains."

     It slices the painted artwork at its couplings — measured columns in BOTH the hi-res parked
     png and the 36-cell sprite sheet, which agree to within 0.3% of the train's width — so every
     coach is a positioned DIV with a background-position rather than a flat image. That is what
     lets a painted coach still glow, shake, lock and accept a drop.

     THIS LESSON HAS TWO MATRAS AND THE ARTWORK HAS THREE COACHES, and slicing is what makes that
     a non-problem: a two-coach train is parts 0..2 and part 3 is simply never drawn. The earlier
     cropped sheet (train2_spritesheet.webp) is therefore gone, along with the script that made
     it — the original artwork is used unmodified.
     ========================================================================================== */
  /* [r7] Sampled from the painted train itself (assets/Images/train.png), so a coach's label
     plate is bordered in its OWN coach's colour. The old palette was a guess and put a pink
     plate over the yellow coach. Darkened a little from the raw fill so the border reads as a
     border against a cream plate. */
  const TRAIN_COACH_COLORS = ["#E9B400", "#37C425", "#F0559A", "#4EA3F0"];

  /* A BARE MATRA IS AN ORPHAN COMBINING MARK. Rendered alone it is font-dependent: a dotted
     placeholder on some platforms, a floating stroke on others. U+25CC is the standard carrier
     and is already the engine's own convention in the matra callout, so every bare matra goes
     through here and reads identically everywhere — and it shows the child WHERE the matra sits
     relative to a letter, which is the whole point of the lesson. */
  const _BARE_MATRA = /^[ा-ौॢॣ]$/;
  function matraGlyph(m){ return _BARE_MATRA.test(String(m || "")) ? "◌" + m : m; }

  /* a coach label / body cell may be plain text, a picture, or an emoji */
  function _coachCell(spec){
    if(spec == null) return "";
    if(typeof spec === "string") return spec;
    if(spec.img || spec.emoji) return imgOrEmoji(spec.img, spec.emoji, "cl-img", "cl-emoji");
    if(spec.html) return spec.html;
    return spec.text || "";
  }

  /* ==========================================================================================
     THE TRAIN ITSELF — one artwork for the cover and for every interactive train screen.
     [r7] The cover ran the painted train (a locomotive and three coaches with cream panels,
     wheels turning through 36 frames) while pages 8-14 drew a DIFFERENT locomotive next to
     CSS-drawn boxes. Same lesson, two trains. These screens now use the cover's train and the
     cover's sounds, and its wheels turn as it pulls in.

     Two files, one drawing, measured off both so they can be laid out interchangeably:
       · assets/Images/train.png ........ 2171x724, the parked pose at full resolution. What is
                                          on screen once the train has stopped, so a word sits on
                                          a crisp panel rather than an upscaled sprite cell.
       · assets/UI/train_spritesheet.webp 6x6 cells of 634x182 — the same drawing animated. Runs
                                          ONLY while the train is travelling, where its lower
                                          resolution is invisible because the thing is moving.
     Both are cut at the couplings, found by scanning for the columns where the ink is thin
     enough to be coupling-and-wheels only: art px 17/650/1151/1642/2155, sheet px 2/188/336/
     481/632. The two agree to within 0.3% of the train's width, which is why one geometry can
     drive both layers — they are aligned on their INK boxes, not their canvases, because the
     png carries more transparent padding than a sheet cell does. */
  const TRAIN_ART = {
    /* the lossless WebP re-encode of assets/Images/train.png (1184KB -> 814KB, pixel-exact when
       composited). Lossy was measured and rejected: at q90 4.6% of pixels moved, peak delta 112 —
       the same damage flat vector art with hard edges took when the cover's GIF was re-encoded. */
    src: "assets/UI/train_still.webp", W: 2171, H: 724,
    ink: { x: 17, y: 48, w: 2138, h: 592 },
    cut: [17, 650, 1151, 1642, 2155],
    /* [r24] THE CREAM PANEL, MEASURED OFF THE ARTWORK - not estimated.
       These said h:417/418/417. The painted panels are 228/222/226 art px tall: the declared
       height was very nearly DOUBLE the real one, so the drop rectangle hung far below the cream
       and down into the wheels, which is exactly what Yasir's screenshot shows. The widths were
       out too, by 7-16px.
       Found by scanning each coach's x-range for rows carrying a long unbroken run of the cream
       colour and taking that region's bounds, then checked by drawing the result back over the
       art - the boxes land on the panels with nothing to spare. */
    panel: [null, { cx: 898, cy: 330, w: 402, h: 228 },
                  { cx: 1394, cy: 327, w: 392, h: 222 },
                  { cx: 1898, cy: 330, w: 409, h: 226 }]
  };
  const TRAIN_SPR = {
    src: "assets/UI/train_spritesheet.webp", cw: 634, ch: 182, cols: 6, rows: 6,
    ink: { x: 2, y: 3, w: 630, h: 175 },
    cut: [2, 188, 336, 481, 632],
    /* REST and SPIN are the cover's, and must stay the cover's: SPIN is the cells advanced over
       the whole travel and is congruent to REST mod 36 (71 % 36 = 35), so the last frame lands
       exactly on the parked pose instead of jumping to it. */
    spin: 71, rest: 35
  };
  const TRAIN_TRAVEL_MS = 3400;        /* the cover's travel, shared so the two feel like one train */

  /* The cover's easing, solved for y given x (Newton, then clamped). The frame advance rides
     the SAME curve as the movement, so the chug is a function of distance covered rather than of
     the clock and cannot drift out of sympathy with the loco. */
  function _trainEase(){
    const p1x = .40, p1y = .20, p2x = .45, p2y = 1;
    const cx = 3*p1x, bx = 3*(p2x-p1x)-cx, ax = 1-cx-bx;
    const cy = 3*p1y, by = 3*(p2y-p1y)-cy, ay = 1-cy-by;
    const fx = t=> ((ax*t + bx)*t + cx)*t, fy = t=> ((ay*t + by)*t + cy)*t;
    const dfx = t=> (3*ax*t + 2*bx)*t + cx;
    return (x)=>{ let t = x;
      for(let i = 0; i < 8; i++){ const e = fx(t) - x;
        if(Math.abs(e) < 1e-5) break;
        const d = dfx(t); if(Math.abs(d) < 1e-6) break; t -= e/d; }
      return fy(Math.min(1, Math.max(0, t))); };
  }

  const TrainChrome = {
    /* cfg: { coaches, coach_label[], coach_body[], drop_zone, multi, entry, on_enter } */
    mount(host, cfg){
      cfg = cfg || {};
      const n = cfg.coaches || (cfg.coach_label || []).length || 3;
      const A = TRAIN_ART, S = TRAIN_SPR;
      /* part i of the drawing: 0 is the locomotive, 1..3 the coaches. More than three coaches
         reuses the three that exist, which is what the artwork has. */
      const artPart = (i)=> ({ x0: A.cut[i], w: A.cut[i+1] - A.cut[i] });
      const sprPart = (i)=> ({ x0: S.cut[i], w: S.cut[i+1] - S.cut[i] });
      const idx = (i)=> i === 0 ? 0 : ((i - 1) % 3) + 1;

      let artW = artPart(0).w;
      for(let i = 0; i < n; i++) artW += artPart(idx(i + 1)).w;
      /* Fit to BOTH axes. The artwork is 3.6:1, so sizing on width alone made a 1160px train
         321px tall — which pushed TRAIN_SORT's coach labels off the top of the stage and left the
         tray sitting on the आगे button. A screen that also carries labels and a tray passes a
         smaller maxH. 0.56 is the cap that stops the png being upscaled past its own pixels.
         [r9] The width budget is 86% of the room available, not a fixed number: the track has to be
         visibly LONGER than the train, and a train filling its container left no line to arrive
         along. Measured before: train and track were both exactly the host width. */
      const avail = host.clientWidth || 1160;
      const k = Math.min(0.56, (cfg.maxW || avail * 0.86) / artW, (cfg.maxH || 300) / A.ink.h);
      const partH = A.ink.h * k;

      const shell = document.createElement("div"); shell.className = "train-shell";
      const rail  = document.createElement("div"); rail.className  = "train-rail";
      rail.style.setProperty("--tc-h", partH + "px");
      rail.style.setProperty("--tc-rail-h", Math.max(14, Math.round(partH * 0.07)) + "px");
      rail.style.setProperty("--lt-travel", TRAIN_TRAVEL_MS + "ms");

      /* The track is laid on the SHELL, not on the rail. The rail is the thing that translates
         in from the right, so a track parented to it slid in with the train — rails that arrive
         with the locomotive. The shell never moves, so the line is already there and the train
         runs along it. */
      const track = document.createElement("div"); track.className = "train-track";

      const sprEls = [];
      /* One part: the parked artwork underneath, the animated sheet on top. The sheet layer is
         what moves; it is faded out and dropped the moment the train stops, which is also the
         moment the resolution difference would first be visible. */
      const paint = (el, i)=>{
        const a = artPart(idx(i)), s = sprPart(idx(i));
        el.style.width = (a.w * k) + "px";
        el.style.height = partH + "px";
        const art = document.createElement("div"); art.className = "tc-art";
        art.style.backgroundImage = 'url("' + A.src + '")';
        art.style.backgroundSize = (A.W * k) + "px " + (A.H * k) + "px";
        art.style.backgroundPosition = (-a.x0 * k) + "px " + (-A.ink.y * k) + "px";
        el.appendChild(art);

        const sk = (A.ink.w * k) / S.ink.w;            /* sheet scale that matches the png's ink box */
        const spr = document.createElement("div"); spr.className = "tc-spr";
        spr.style.backgroundImage = 'url("' + S.src + '")';
        spr.style.backgroundSize = (S.cw * S.cols * sk) + "px " + (S.ch * S.rows * sk) + "px";
        spr.dataset.x0 = String(s.x0); spr.dataset.sk = String(sk);
        el.appendChild(spr);
        sprEls.push(spr);
        return { a, s };
      };
      const setCell = (cellIn)=>{
        const CELLS = S.cols * S.rows;
        const cell = ((cellIn % CELLS) + CELLS) % CELLS;
        const c = cell % S.cols, r = (cell / S.cols) | 0;
        sprEls.forEach(spr=>{
          const sk = parseFloat(spr.dataset.sk), x0 = parseFloat(spr.dataset.x0);
          spr.style.backgroundPosition =
            (-(c * S.cw + x0) * sk) + "px " + (-(r * S.ch + S.ink.y) * sk) + "px";
        });
      };

      const loco = document.createElement("div"); loco.className = "train-loco tc-part";
      paint(loco, 0);
      /* appendChild, never `innerHTML +=` — that serialises and RE-PARSES the whole subtree, which
         silently replaces the .tc-spr node paint() just handed to setCell. Measured: the loco's
         wheels stopped turning while the coaches' kept going, because its sprite element was a
         detached orphan. */
      /* the funnel mouth, measured off this artwork (see the CSS note): 28.4% across the
         locomotive part, 11.8% down the ink band. The puff size and the drift scale with the
         train so a small train does not get cover-sized smoke. */
      const steam = document.createElement("div"); steam.className = "train-steam";
      steam.style.left = (artPart(0).w * k * 0.284) + "px";
      steam.style.top  = (partH * 0.118) + "px";
      /* the cover sizes its puff at 4.6% of the rendered train width and its plume at about
         0.57x the train's height; kept proportional here so a short train gets short smoke. */
      const IW = A.ink.w * k;
      steam.style.setProperty("--tc-puff",       Math.round(IW * 0.040) + "px");
      steam.style.setProperty("--tc-rise",       Math.round(-partH * 0.62) + "px");
      steam.style.setProperty("--tc-drift",      Math.round(IW * 0.012) + "px");
      steam.style.setProperty("--tc-drift-move", Math.round(IW * 0.046) + "px");
      const PUFFS = 7;
      for(let i = 0; i < PUFFS; i++){
        const p = document.createElement("span");
        p.style.animationDelay = (i * (1610 / PUFFS) - 1610) + "ms";
        steam.appendChild(p);
      }
      loco.appendChild(steam);
      rail.appendChild(loco);

      const coachEls = [], faceEls = [], labelEls = [];
      for(let i = 0; i < n; i++){
        const pi = idx(i + 1), a = artPart(pi), pan = A.panel[pi];
        const c = document.createElement("div"); c.className = "train-coach";
        c.style.setProperty("--coach-c", TRAIN_COACH_COLORS[i % TRAIN_COACH_COLORS.length]);

        const lab = document.createElement("div"); lab.className = "coach-label";
        const labSpec = (cfg.coach_label || [])[i];
        if(labSpec == null) lab.style.display = "none";   /* not `visibility` — that still reserves 50px */
        lab.innerHTML = _coachCell(labSpec);

        const body = document.createElement("div"); body.className = "coach-body tc-part";
        paint(body, pi);
        if(cfg.drop_zone) body.classList.add("dropzone", "dd-zone");

        /* the word/card sits ON the coach's painted cream panel, placed from the measurement
           above rather than from padding — the panel is not centred in the coach slice */
        const face = document.createElement("div"); face.className = "coach-face" + (cfg.multi ? " multi" : "");
        face.style.left   = ((pan.cx - a.x0) * k) + "px";
        face.style.top    = ((pan.cy - A.ink.y) * k) + "px";
        /* [r24] EXACTLY the panel. The 0.94/0.90 shrink was compensating for a panel table
           that was too big - a fudge on top of a wrong number, which still left the box the
           wrong shape. With the table measured, the face IS the rectangle painted on the cart:
           "the drop area should be exactly same as the rectangle made in the coach". */
        face.style.width  = (pan.w * k) + "px";
        face.style.height = (pan.h * k) + "px";
        face.innerHTML = _coachCell((cfg.coach_body || [])[i]);
        body.appendChild(face);

        c.appendChild(lab); c.appendChild(body);
        c.dataset.coach = String(i);
        rail.appendChild(c);
        coachEls.push(c); faceEls.push(body.querySelector(".coach-face")); labelEls.push(lab);
      }
      shell.appendChild(track);        /* behind the rail in DOM order, so the train paints over it */
      shell.appendChild(rail);
      host.appendChild(shell);

      /* If the painted train cannot be fetched, fall back to the structured locomotive exactly as
         the old <img> onerror did — a background-image has no error event, so probe separately. */
      (function(){ const probe = new Image();
        probe.onerror = ()=>{ shell.classList.add("tc-noart"); };
        probe.src = TRAIN_ART.src; })();

      setCell(S.rest);

      /* "Train comes through animation from right to left. Train stops at the centre of the
         screen." (rows #8, #95, #107, #116, #124, #144, #175)
         The cover's entrance, beat for beat: whistle as it appears, the chug bed under the
         travel, the wheels turning on the travel's own easing curve, and the arrival sound as it
         settles. Rows X4/#95: "Soft train arrival sound." */
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      let _raf = 0;
      /* "Train comes through animation ... Train stops at the centre. On screen: no instruction
         text, only VO should play." The VO waits for the train: mountSlide's auto chain is held
         here and released once the arrival sound has had a beat to clear. */
      let _promptGo = null, _parked = false;
      const _afterPrompt = ()=>{ if(typeof cfg.on_prompt_done === "function") cfg.on_prompt_done(); };
      const _release = (go)=> go(_afterPrompt);
      /* the sibling's engine reads state.promptGate to hold its auto prompt chain until the train
       parks. THIS engine has no such hook — it is set and never read — and the modules here gate
       their own prompts through buildTrain's whenParked() instead. Left assigned (harmless, and
       it keeps the ported block diffable against the sibling) but nothing depends on it. */
    state.promptGate = (go)=>{ if(_parked) _release(go); else _promptGo = go; };
      const settle = ()=>{
        rail.classList.remove("tr-entering");
        shell.classList.add("tc-parked");               /* drops the sprite layer, reveals the png */
        _parked = true;
        if(_promptGo){ const g = _promptGo; _promptGo = null; setTimeout(()=> _release(g), 320); }
        if(typeof cfg.on_enter === "function") cfg.on_enter();
      };
      if(cfg.entry !== false && !reduce){
        rail.classList.add("tr-entering");
        sfxWhistle(); sfxTrainMove();
        const ease = _trainEase(), t0 = performance.now();
        const tick = ()=>{
          if(!rail.isConnected) return;                 /* navigated away mid-run */
          const p = Math.min(1, (performance.now() - t0) / TRAIN_TRAVEL_MS);
          setCell(Math.floor(ease(p) * S.spin));
          if(p < 1) _raf = requestAnimationFrame(tick);
          else setCell(S.rest);                         /* exact landing, no rounding drift */
        };
        _raf = requestAnimationFrame(tick);
        /* [r65] Yasir: "Don't use sfx_train_arrive.ogg in any pages." The clip stays on disk
           (COPY_AUDIO still carries it); nothing calls for it. */
        setTimeout(()=>{ settle(); }, TRAIN_TRAVEL_MS);
      } else {
        setTimeout(settle, 0);
      }

      return {
        shell, rail, coachEls, faceEls, labelEls,
        body: (i)=> coachEls[i].querySelector(".coach-body"),
        /* "Coach labels आ (ा), इ (ि), ई (ी) appear one by one." (row #175) */
        popLabels(gapMs){
          labelEls.forEach((l, i)=>{
            l.classList.remove("cl-pop"); void l.offsetWidth;
            /* sfxSparkle removed: train chrome sounds like a train and nothing else. The pop is
               still visual; the answer-feedback effects in the slide modules are untouched. */
            setTimeout(()=>{ l.classList.add("cl-pop"); }, i * (gapMs || 260));
          });
        },
        /* "all three coaches glow · train gives a small whistle/steam animation"
           (rows #136, #143, #160, #174) */
        complete(){ shell.classList.add("complete"); sfxWhistle(); },
        /* [r26] THE TRAIN LEAVES THE WAY IT CAME.
           Yasir: "after completing one page the train will animation again and move ahead and
           get out of the screen (to the left side) and from the right side the train will come
           for the next page and its instruction of next page will appear."
           The arrival already exists - .tr-entering slides the rail in from +86% over
           TRAIN_TRAVEL_MS while the sprite sheet rolls the wheels, then `settle` swaps the
           sprite for the still. Leaving is that in reverse: put the rolling sprite back (drop
           .tc-parked), run the same eased cell advance, and carry the rail off to the left.
           `done` fires when it is gone, whether or not the animation was allowed to run - a
           child on reduced motion must still get to the next screen. */
        depart(done){
          const finish = ()=>{ if(done){ const f = done; done = null; f(); } };
          if(reduce){ setTimeout(finish, 120); return; }
          shell.classList.remove("tc-parked");     /* the rolling wheels come back */
          rail.classList.remove("tr-entering");
          void rail.offsetWidth;
          rail.classList.add("tr-leaving");
          sfxWhistle(); sfxTrainMove();
          const ease = _trainEase(), t0 = performance.now();
          const tick = ()=>{
            if(!rail.isConnected){ finish(); return; }
            const p = Math.min(1, (performance.now() - t0) / TRAIN_TRAVEL_MS);
            setCell(Math.floor(ease(p) * S.spin));
            if(p < 1) _raf = requestAnimationFrame(tick);
          };
          _raf = requestAnimationFrame(tick);
          setTimeout(finish, TRAIN_TRAVEL_MS);
        }
      };
    },

    /* Structured SVG locomotive — kept as the last-resort drawing if the painted train is
       missing. Deliberately simple and flat-vector, matching the mockup's silhouette. */
    locoSVG(){
      const w = document.createElement("div");
      w.innerHTML =
        '<svg viewBox="0 0 206 150" width="206" height="150" role="img" aria-label="रेलगाड़ी">' +
        '<rect x="4" y="112" width="198" height="10" rx="3" fill="#5A6672"/>' +
        '<rect x="96" y="34" width="86" height="78" rx="12" fill="#E4453C"/>' +
        '<rect x="112" y="48" width="48" height="36" rx="8" fill="#BFE4FF" stroke="#FFFFFF" stroke-width="4"/>' +
        '<rect x="88" y="24" width="102" height="16" rx="8" fill="#2F7BE0"/>' +
        '<rect x="30" y="62" width="74" height="50" rx="12" fill="#E4453C"/>' +
        '<rect x="24" y="74" width="12" height="26" rx="4" fill="#F2A33C"/>' +
        '<path d="M46 62 L46 34 L70 34 L70 62 Z" fill="#2F3A44"/>' +
        '<path d="M40 34 L76 34 L70 22 L46 22 Z" fill="#F2A33C"/>' +
        '<circle cx="62" cy="122" r="16" fill="#2F3A44"/><circle cx="62" cy="122" r="6" fill="#F2A33C"/>' +
        '<circle cx="126" cy="122" r="20" fill="#2F3A44"/><circle cx="126" cy="122" r="8" fill="#F2A33C"/>' +
        '<circle cx="172" cy="122" r="20" fill="#2F3A44"/><circle cx="172" cy="122" r="8" fill="#F2A33C"/>' +
        '</svg>';
      const svg = w.firstChild; svg.classList.add("train-loco-svg");
      return svg;
    }
  };


  /* ---------------------------------------------------------------- the train shell */
  /* ADAPTER, not a second train. Every module in this bundle was written against buildTrain()'s
     shape — `coaches[i].el / .body / .label` plus nudge/shake/correct/lock/finish — so rather
     than rewrite seven modules, buildTrain now mounts TrainChrome and presents that same shape
     over it. The payoff is that TRAIN_TAP, TRAIN_SORT, WORD_BUILD and MATRA_INTRO all get the
     painted train, its 36-frame roll-in and its real SFX without any of them knowing.

     TWO COMPATIBILITY DETAILS, both deliberate:
       · `.coach-body` also carries this bundle's old `.tr-body` class and its `data-idx`, because
         makeDraggable's drop handlers hit-test `zone.closest(".tr-body")`. One extra class keeps
         every drop path working unchanged.
       · `coaches[i].body` is the `.coach-face` — the painted cream panel — NOT the coach body.
         That is where a word, a blank or a snapped card belongs; the body is the coach's
         painted slice and is the drop target. */
  function buildTrain(host, opts){
    const n = opts.coaches;
    /* THE PROMPT MUST NOT TALK OVER THE TRAIN. The train takes 3.4s to pull in, with a whistle
       and a chug bed under it, and every module used to fire its prompt VO at mount — so the
       child heard the instruction under a moving train on all seven train screens. The SME's own
       ordering is explicit: "Train comes through animation from right to left. Train stops at the
       centre of the screen." and only then "VO: जिस डिब्बे में …". `whenParked` is the gate; the
       sibling does the same thing through state.promptGate. */
    let parked = false, waiting = [];
    /* THE EPOCH HAS TO BE CAPTURED HERE, NOT INSIDE say(). A deferred callback — whenParked, a
       setTimeout, anything that runs later — calls say() fresh, and say() reads the epoch at CALL
       time, which by then is the NEW screen's. So the previous slide's held prompt sailed through
       the guard and spoke over the next screen: measured, T1's pair chain landing on top of T3.
       Capturing the mount's epoch and checking it before running the callback closes that. */
    const myGen = _voGen;
    state.trainDepart = null;          /* [r26] cleared per mount; set once the train exists */
    const tc = TrainChrome.mount(host, {
      coaches: n,
      coach_label: (opts.labels || []).map(h => (h == null || h === "") ? null : { html: h }),
      coach_body:  (opts.bodies || []).map(h => ({ html: h || "" })),
      drop_zone:   !!opts.dropZone,
      multi:       !!opts.multi,
      maxH:        opts.maxH || 270,
      on_enter:    ()=>{ parked = true;
                         const q = waiting; waiting = [];
                         q.forEach(fn => fn());
                         if(typeof opts.on_enter === "function") opts.on_enter(); }
    });
    const coaches = tc.coachEls.map((el, i) => {
      const body = tc.body(i);
      body.classList.add("tr-body");          /* makeDraggable hit-tests this */
      body.dataset.idx = String(i);
      return { el, body: tc.faceEls[i], zone: body, label: tc.labelEls[i] };
    });
    /* [r26] the engine drives the departure through this, without knowing about trains */
    state.trainDepart = (done)=> tc.depart(done);
    return {
      wrap: tc.shell, rail: tc.rail, coaches, chrome: tc,
      /* run `fn` once the train has stopped — immediately if it already has, and never at all
         if the screen has moved on in the meantime */
      whenParked(fn){ const run = ()=>{ if(myGen !== _voGen) return; fn(); };
                      if(parked) run(); else waiting.push(run); },
      /* [28f] THE GUIDING HAND IS PHASE-GATED and handOnAnswer() is the one place that can
         enforce it: tutorial and guided get the hand, practice gets the coach glow only. */
      nudge(i, slide){ const c = coaches[i]; if(!c) return;
        c.el.classList.add("is-nudge");
        if(typeof handOnAnswer === "function") handOnAnswer(c.el, slide);
      },
      /* [r25] THE HAND SHOWS THE MOVE, not just the destination.
         Yasir: "in case of 2nd wrong attempt you are showing hand nudge but I want to show the
         animation how to drag and drop using hand nudge." A hand parked on the right cart says
         WHICH one but never says that the card has to be carried there - which, on a drag screen,
         is the whole gesture the child is being asked to make.
         travelNudge already exists in the engine for exactly this ([28o], written for the
         matching mechanics) and loops the hand from the tile to its target; the train screens
         simply never called it. `dest` lets WORD_BUILD point at its blank rather than the whole
         panel. Falls back to the static point wherever the hand cannot travel. */
      nudgeTo(i, fromEl, slide, dest){ const c = coaches[i]; if(!c) return;
        c.el.classList.add("is-nudge");
        const to = dest || c.body.querySelector(".coach-face") || c.body;
        if(fromEl && typeof travelNudge === "function") travelNudge(fromEl, to, slide);
        else if(typeof handOnAnswer === "function") handOnAnswer(c.el, slide);
      },
      shake(i){ const c = coaches[i]; if(!c) return;
        c.el.classList.remove("is-shake"); void c.el.offsetWidth; c.el.classList.add("is-shake");
        setTimeout(()=> c.el.classList.remove("is-shake"), 520);
      },
      correct(i){ const c = coaches[i]; if(!c) return;
        c.el.classList.add("is-correct");
        if(typeof confettiCannon === "function") confettiCannon();
      },
      lock(i){ const c = coaches[i]; if(c) c.el.classList.add("is-locked"); },
      popLabels(gap){ tc.popLabels(gap); },
      /* [r26] Registered here rather than in each mechanic: buildTrain is the one place every
         train screen passes through, so TRAIN_TAP, TRAIN_SORT and WORD_BUILD all get the
         departure without knowing it exists - the same reasoning that put the painted train
         behind this adapter. A screen with no train simply never sets it, and the engine falls
         back to advancing without one. */
      depart(done){ tc.depart(done); },
      /* SME, on every sort screen: "all coaches glow, train gives a small whistle/steam
         animation, Next button becomes active". */
      finish(){ coaches.forEach(c => c.el.classList.add("is-correct")); tc.complete(); }
    };
  }

  /* Shared 3-attempt ladder. Returns a `wrong()` you call on each miss. */
  /* [r29] ORDER IS NOT PART OF THE QUESTION.
     Yasir: "in all the pages if we have multiple options then reshuffle all the options each
     time." Every screen authored its options in a fixed order, and on most of them the ANSWER
     was written first - so a child who noticed that could clear the tap screens without reading
     a word, and a second run through the lesson is the same shape as the first.
     Fisher-Yates on a COPY: the card's own data is never reordered, so `answer`, `bin` and the
     correct-coach lookups keep pointing at the same items. Each module works out what is correct
     from the item itself, never from its position, which is what makes this safe to do at all. */
  function shuffled(list){
    const a = (list || []).slice();
    for(let i = a.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  /* [r83] Yasir: "options will be shuffle each time we visit the page". They were - but a fair
     shuffle deals the SAME order again by chance, and on a two-card screen that is every other
     visit, which looks exactly like no shuffle at all. So each screen remembers the order it
     dealt last time (for this session) and deals again if it would repeat it. */
  const _lastDeal = new Map();
  function shuffledFresh(list, key){
    const src = list || [];
    const sig = arr => arr.map(x => src.indexOf(x)).join(",");
    let a = shuffled(src);
    if(key && src.length > 1){
      for(let n = 0; n < 16 && sig(a) === _lastDeal.get(key); n++) a = shuffled(src);
      _lastDeal.set(key, sig(a));
    }
    return a;
  }

  function makeLadder(slide, train, correctIdx, opts){
    opts = opts || {};
    let tries = 0;
    return function wrong(coachIdx){
      tries++;
      state.attempts = tries;
      fbWrong();
      if(typeof setSwMood === "function") setSwMood("tryagain");
      if(coachIdx != null) train.shake(coachIdx);
      SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: tries });
      if(tries === 1){
        /* RUNG 1 - refocus. "गलत शब्द वाले डिब्बे पर soft shake। कोई सही उत्तर highlight नहीं
           होगा।" The shake above is the whole of the UI; nothing is marked and no hand appears. */
        say(A(slide, "hint1") || A(slide, "try_again"), ()=>{});
      } else if(tries === 2 && hintLevels() >= 3){
        /* RUNG 2 - demonstrate. The screen reads the three words out and lights each word's own
           matra as it does, THEN says the line. Support first, instruction after: the line tells
           the child what to do with what they have just been shown. Still no hand. */
        state.scaffoldLevel = 2; state.hintUsed = true;
        SwiftPAL.emit("hint_shown", { slide_id: slide.id, level: 2 });
        const line = ()=> say(A(slide, "hint2") || A(slide, "hint") || A(slide, "try_again"), ()=>{});
        if(opts.demo) opts.demo(line); else line();
      } else {
        /* RUNG 3 - guide. The answer glows, the hand goes to it and everything else locks, and
           only THEN is the line spoken, so the child is looking at the thing being named rather
           than hearing about something that is not lit yet. */
        state.scaffoldLevel = 3; state.hintUsed = true;
        SwiftPAL.emit("hint_shown", { slide_id: slide.id, level: 3 });
        if(opts.lock) opts.lock();
        if(opts.guide) opts.guide();
        else if(correctIdx != null) withHand3(()=> train.nudge(correctIdx, slide));
        say(A(slide, "hint3") || A(slide, "hint2") || A(slide, "hint") || A(slide, "try_again"),
            ()=>{});
      }
      return tries;
    };
  }

  /* Finish a test slide. `silent` = solved on the final attempt -> celebrate visually only,
     which is the SME's "Correct Answer on 3rd Attempt … No VO." */
  /* [r96] A USED CARD LEAVES NO EMPTY BOX - THE ROW CLOSES UP. Yasir: "in all the screens where we
     drag the elements into the coach / drop zone, the dragged element's dashed border should be
     removed and the next element will move". So the slot a card leaves (sort trays: the shadow
     box; page 12: the dimmed tile; the sentence pages: the emptied option) folds away: its width
     and the row's gap shrink to nothing over 320 ms, so the cards after it slide across smoothly
     instead of jumping. */
  function closeGap(el){
    if(!el || !el.isConnected || el._closing) return;
    el._closing = true;
    const row = el.parentElement;
    const gap = row ? (parseFloat(getComputedStyle(row).columnGap) || 0) : 0;
    const w = el.offsetWidth;
    el.style.boxSizing = "border-box";
    el.style.width = w + "px"; el.style.minWidth = "0"; el.style.flex = "0 0 auto";
    el.style.overflow = "hidden"; el.style.pointerEvents = "none";
    el.style.border = "0"; el.style.background = "transparent"; el.style.boxShadow = "none";
    void el.offsetWidth;
    el.style.transition = "width .32s ease, margin .32s ease, opacity .2s ease, padding .32s ease";
    el.style.width = "0px"; el.style.paddingLeft = el.style.paddingRight = "0";
    el.style.marginRight = (-gap) + "px"; el.style.opacity = "0";
    setTimeout(()=>{ if(el.isConnected) el.style.display = "none"; }, 360);
  }

  function finishSlide(slide, train, silent, signal){
    state.locked = true;
    if(typeof stopNudge === "function") stopNudge();
    fbCorrect();
    if(typeof setSwMood === "function") setSwMood("celebrate");
    train.finish();
    SwiftPAL.emit(signal || "train_first_try", {
      slide_id: slide.id, phase: slide.phase, value: true,
      first_try: state.attempts === 0, attempts: state.attempts + 1,
      latency_ms: Date.now() - state.slideStart
    });
    const unlock = ()=>{ setNavActive(true); $("navBtn").onclick = ()=> completeSlide(state.attempts === 0); };
    if(silent) setTimeout(unlock, 900); else say(A(slide, "correct"), unlock);
  }

  /* ================================================================ 1 · TRAIN_TAP */
  /* Tap the coach whose word carries the target matra.
     data: { coaches:[{word, correct?}], target } */
  SlideModules.TRAIN_TAP = {
    mount(host, slide){
      const d = slide.data;
      newVoEpoch();          /* any chain still running from a previous mount is now stale */
      /* [r29] the carts are dealt in a fresh order every time; `correct` travels with the cart */
      const coachList = dealt(d, d.coaches, slide.id + ":coaches");
      const correctIdx = coachList.findIndex(c => c.correct);
      /* SME, on all three tap screens: "Train comes through animation from right to left. Train
         stops at the centre of the screen. **After the train stops**, the three coaches पुल, दूध,
         सूरज appear clearly." So the words are held back until the train has parked — they are
         not part of the arriving picture, they are what the child is then asked to read. */
      const train = buildTrain(host, {
        coaches: coachList.length,
        labels: coachList.map(()=> ""),
        bodies: coachList.map(c => '<span class="tr-word ink-glyph tt-hold">' + c.word + "</span>"),
        dropZone: false,
        on_enter: ()=> [...host.querySelectorAll(".tt-hold")].forEach((w, i)=>
          setTimeout(()=> w.classList.add("tt-in"), i * 180))
      });
      state.ownsAudio = true;
      state.replayAudio = ()=> say(A(slide, "prompt"), ()=>{});
      setNavActive(false);

      /* RUNG 2, screens 1-3: "तीनों शब्दों को एक-एक करके read out करें ... हर शब्द पढ़ते समय उसकी
         मात्रा highlight/glow करें"। The word is lit while its clip sounds and goes dark again
         after it, because the mark is a reading aid for that moment - leaving all three lit
         would turn the demonstration into a permanent answer key.
         Each coach carries its OWN matra, not the screen's: on screen 2 the child hears गुड़ and
         मुकुट with their ु lit against फूल's ू, which is the contrast the screen is asking about.
         मुकुट has two, and the ink mask marks both - which is what the doc asks for by name. */
      const tapDemo = (done)=> hintHold((fin)=> hintSeq(train.coaches.map((c, i)=> (next)=>{
        const w = c.body.querySelector(".tr-word");
        const src = coachList[i];
        if(w && src.matra) matraHLSoon(w, src.matra, { glow:true, pulse:true });
        if(w) c.el.classList.add("is-read");
        say(clip(src.audio), ()=> setTimeout(()=>{
          c.el.classList.remove("is-read");
          /* [S04] «Retain the matra highlights in all three words so the child can compare.» */
          if(!d.h2_keep_marks) matraClear(w);
          next();
        }, 260));
      }), fin), done);

      /* RUNG 3: "'सूरज' और 'दूध' वाले डिब्बे lock हो जाएँगे (टैप नहीं होंगे)।" */
      const tapLock = ()=> train.coaches.forEach((c, i)=>{
        if(i === correctIdx) return;
        c.el.classList.remove("is-press", "is-tappable");
        c.el.classList.add("is-out");
        c.el.onclick = null;
      });

      const wrong = makeLadder(slide, train, correctIdx, { demo: tapDemo, lock: tapLock });
      let armed = false;                 /* see train.whenParked at the foot of this module */

      /* [r19/r20] "if user tap on incorrect cart then that cart will wiggle and if he does
         mistake 2 times then hand nudge appears on the correct option and that particular cart
         will be disabled." The hand was already here; the wiggle was here in name only (see
         [r20] in the stylesheet); the disable is below, and applies to that cart alone. */
      train.coaches.forEach((c, i) => {
        c.el.classList.add("is-tappable");
        /* the press colour, mirrored onto a class because :active does not survive a finger */
        c.el.addEventListener("pointerdown", ()=>{
          if(!armed || hintBusy || state.locked || isPlaying) return;
          c.el.classList.add("is-press");
        });
        ["pointerup", "pointercancel", "pointerleave"].forEach(ev =>
          c.el.addEventListener(ev, ()=> c.el.classList.remove("is-press")));
        c.el.onclick = ()=>{
          c.el.classList.remove("is-press");
          /* `armed` closes the window between the carts mounting and the prompt being spoken -
             see the note on whenParked below. `hintBusy` closes the gaps INSIDE a rung-2 chain. */
          if(!armed || hintBusy || state.locked || isPlaying) return;
          if(typeof sfxTap === "function") sfxTap();
          if(i === correctIdx){
            const silent = state.attempts >= silentFrom();
            train.correct(i);
            /* Mark the matra in the word they just chose. The SME's correct-answer VO is
               «शाबाश! पुल शब्द में छोटी उ की मात्रा है» — this is that sentence made visible,
               and on a silent 3rd-attempt win it is the ONLY feedback the child gets. */
            const w = train.coaches[i].body.querySelector(".tr-word");
            if(w && d.matra) matraHLSoon(w, d.matra, { glow:true, pulse:true });
            finishSlide(slide, train, silent, "train_tap_first_try");
          } else {
            /* [r20 / h2] WHICH CART GETS RETIRED, AND WHEN.
               r19 retired every cart tried so far, which on a three-cart screen left the answer
               as the only thing still alive - it removed the choice instead of narrowing it.
               Yasir: "do not disable both the cart, disable only the cart on which we tap on
               last." That was written when the 2nd wrong was the LAST rung.
               Review-1 adds a third, and makes the 2nd a demonstration: "तीनों शब्दों को एक-एक
               करके read out करें ... हर शब्द पढ़ते समय उसकी मात्रा highlight करें"। Retiring a
               cart there greys out one of the three words the screen is about to read aloud -
               it argues with the very thing rung 2 exists to do. Measured on G2: गुड़ sat at
               grayscale(.5) opacity(.45) while its own clip played.
               So the retirement moves to rung 3, where the doc asks for it anyway and asks for
               ALL of it ("'सूरज' और 'दूध' वाले डिब्बे lock हो जाएँगे") - see tapLock. r20's
               concern, that the child must still have a choice to make, is what rungs 1 and 2
               now protect: nothing is taken away until the answer is being named outright. */
            wrong(i);
          }
        };
      });
      /* instruction is VOICE only — the SME asks for no on-screen text on every test screen,
         and it waits for the train to stop so it is never spoken under the arrival.
         THE CARTS ARM HERE, not at mount. They were tappable for the whole of the train's
         arrival, while their words were still held at opacity 0 - so a tap in that window fed a
         hint clip to a child who had not been asked the question yet, AND the prompt then
         started on top of the hint. Measured: 2.5-3.2s of two voices at once on all three tap
         screens. `armed` flips in the same tick that say() raises isPlaying, so it leaves no
         window of its own. */
      train.whenParked(()=>{ armed = true; say(A(slide, "prompt"), ()=>{}); });
    }
  };

  /* ================================================================ 2 · TRAIN_SORT */
  /* Drag cards into coaches. Three shapes, all one module:
       kind "word"    — coaches labelled by matra, cards are words (+picture)
       kind "matra"   — coaches labelled by WORD, cards are matras      (the reverse round)
       kind "picture" — coaches labelled by matra, cards are PICTURES ONLY, word still spoken
     data: { kind, bins:[{label, key}], cards:[{bin, word, img, emoji, audio}] } */
  SlideModules.TRAIN_SORT = {
    mount(host, slide){
      const d = slide.data;
      const myGen = newVoEpoch();  /* any chain still running from a previous mount is now stale */
      /* [r83] data.demo: the watch-first copy of the sort screen - nothing to touch; a hand
         carries each card to its coach while the lesson explains why */
      const demo = !!d.demo;
      const alive = ()=> myGen === _voGen && CARD.slides[state.idx] === slide;
      /* SME, word and picture rounds: "More than one word can be placed inside each coach."
         `multi` is what lets the painted coach's cream panel hold two cards side by side instead
         of stacking the second on top of the first. The matra round is `single` — "Only one matra
         card can be placed inside each coach" — and sets `filled` on the body instead. */
      const train = buildTrain(host, {
        coaches: d.bins.length,
        labels: d.bins.map(b => b.label),
        bodies: d.bins.map(()=> ""),
        dropZone: true,
        multi: d.kind !== "matra"
      });
      /* SME round 3, on the picture-sort screen: "Coach labels उ and ऊ appear one by one."
         Settled by default (engine fact 1) — `tr-lblseq` only drives the staggered fade-in, so a
         frozen capture still photographs BOTH labels rather than an empty coach roof. */
      requestAnimationFrame(()=> train.coaches.forEach((c, i) => {
        c.label.style.setProperty("--tr-lbl-delay", (i * 340) + "ms");
        c.label.classList.add("tr-lblseq");
      }));

      const tray = document.createElement("div");
      tray.className = "tr-tray";
      /* [r29] Fisher-Yates, not `sort(()=> Math.random()-0.5)`. That idiom is not a shuffle: the
         comparator is inconsistent, so the result is not a uniform permutation and V8's sort
         leaves short lists near their original order far more often than chance. On a four-card
         tray that is exactly the case that matters. */
      const cards = dealt(d, d.cards, slide.id + ":cards");
      cards.forEach(c => {
        const t = document.createElement("div");
        t.className = "tr-card k-" + d.kind;
        t.dataset.bin = c.bin;
        if(c.audio) t.dataset.audio = c.audio;
        /* Review-1 writes rungs 2 and 3 with the CARD's name in them - «'सूरज' में बड़ी 'ऊ' की
           मात्रा है» - so both lines travel with the card, not with the screen. */
        if(c.word) t.dataset.word = c.word;
        if(c.hint2_audio) t.dataset.h2 = c.hint2_audio;
        if(c.hint3_audio) t.dataset.h3 = c.hint3_audio;
        /* ROUND 3: the praise line is PER CARD now, not one line for the whole screen. The SME
           writes it out card by card — «शाबाश! 'सुई' शब्द में उ की मात्रा है।» — and asks for NO
           completion VO, so the last card's own line is the last thing the child hears. */
        if(c.correct_audio) t.dataset.okaudio = c.correct_audio;
        if(d.kind === "matra"){
          t.innerHTML = '<span class="tr-matra ink-glyph">' + c.word + "</span>";
        } else if(d.kind === "picture"){
          /* SME: pictures only, the word must NEVER be shown — but it must still be SPOKEN,
             which is what keeps this a listening task rather than picture matching. */
          t.innerHTML = imgOrEmoji(c.img, c.emoji, "tr-pic", "tr-emoji");
        } else {
          t.innerHTML = imgOrEmoji(c.img, c.emoji, "tr-pic", "tr-emoji") +
                        '<span class="tr-cardlbl">' + c.word + "</span>";
        }
        tray.appendChild(t);
      });
      host.appendChild(tray);

      state.ownsAudio = true;
      state.replayAudio = ()=> say(A(slide, "prompt"), ()=>{});
      setNavActive(false);

      let placed = 0;
      const need = cards.length;
      const perCard = new Map();
      const binIdx = k => d.bins.findIndex(b => b.key === k);

      /* "दोनों डिब्बों के ऊपर लिखी मात्राएँ एक-एक करके read out करें: 'उ', 'ऊ'।" - screen 4 - and
         on screen 5 the same walk, but "हर अक्षर के साथ उसकी मात्रा कुछ देर के लिए दिखाएँ और glow
         करें: 'उ' के पास 'ु', 'ऊ' के पास 'ू'।" Screen 4's labels already read «उ (ु)», so the
         mark is only conjured on the screen whose labels are bare. */
      function binReadSteps(showMatra){
        return d.bins.map((b, i)=> (next)=>{
          const c = train.coaches[i];
          if(!c || !b.audio) return next();
          c.label.classList.add("tr-lblread");
          let tag = null;
          if(showMatra && b.matra){
            tag = document.createElement("span");
            tag.className = "tr-lblmatra ink-glyph";
            tag.textContent = "\u25CC" + b.matra;      /* dotted circle: the mark, carried */
            c.label.appendChild(tag);
            requestAnimationFrame(()=> tag.classList.add("in"));
          }
          say(clip(b.audio), ()=> setTimeout(()=>{
            c.label.classList.remove("tr-lblread");
            if(tag){ tag.classList.remove("in"); setTimeout(()=> tag.remove(), 320); }
            next();
          }, 300));
        });
      }

      function sortDemo(tile, done){
        hintHold(function(fin){
        const steps = [];
        if(d.kind === "word"){
          /* "जो शब्द गलत डाला गया, उसे read out करें ... शब्द में उसकी मात्रा highlight/glow करें" */
          const lbl = tile.querySelector(".tr-cardlbl");
          steps.push((next)=>{
            if(lbl) matraHLSoon(lbl, tile.dataset.bin, { glow:true, pulse:true });
            say(clip(tile.dataset.audio), ()=> setTimeout(()=>{ matraClear(lbl); next(); }, 260));
          });
          /* [S04] «Read only the wrongly dropped word» - the deck drops the coach-label walk */
          if(d.h2_read_bins !== false) steps.push.apply(steps, binReadSteps(false));
        } else if(d.kind === "picture"){
          /* "चित्र के नीचे कुछ देर के लिए शब्द दिखाएँ और उसकी मात्रा highlight/glow करें"।
             This is the one place the picture round shows its word, and it shows it for this
             beat only - see flag F3. The round-3 note "the word should not be displayed at any
             point" is superseded here by the later document, and nowhere else: the word is
             removed again before the rung ends. */
          steps.push((next)=>{
            /* [S04] «Temporarily display its word underneath the picture … Keep this word support
               visible for the next attempt» - so with `h2_keep_word` it stays until the card is
               placed (settleInto takes it away), and a second Hint 2 does not stack another */
            const keep = !!d.h2_keep_word;
            const had = keep ? tile.querySelector(".tr-revealword") : null;
            const w = had || document.createElement("span");
            w.className = "tr-revealword ink-glyph";
            w.textContent = tile.dataset.word || "";
            if(!had) tile.appendChild(w);
            /* [r65] the picture lifts to make room and the word sits INSIDE the card - it was
               hanging off the bottom edge ("the name is getting out of that option box") */
            tile.classList.add("tr-revealing");
            requestAnimationFrame(()=> w.classList.add("in"));
            matraHLSoon(w, tile.dataset.bin, { glow:true, pulse:true });
            say(clip(tile.dataset.audio), ()=> setTimeout(()=>{
              if(keep){ tile.classList.add("tr-revealkeep"); next(); return; }
              w.classList.remove("in");
              tile.classList.remove("tr-revealing");
              setTimeout(()=> w.remove(), 340);
              next();
            }, keep ? 200 : 900));
          });
        } else if(d.h2_mark_only){
          /* [S04] «Slightly enlarge only the wrongly dropped matra card. Highlight its complete
             matra strokes … Do not announce the matra's name.» The card returns to its size when
             the line has been said (tile._h2undo, called by the drop handler). */
          steps.push((next)=>{
            const mk = tile.querySelector(".tr-matra");
            tile.classList.add("tr-h2big");
            if(mk) matraHLSoon(mk, tile.dataset.bin, { glow:true, pulse:true });
            tile._h2undo = ()=>{ tile.classList.remove("tr-h2big"); if(mk) matraClear(mk); tile._h2undo = null; };
            next();
          });
        } else {
          steps.push.apply(steps, binReadSteps(true));
        }
        hintSeq(steps, fin);
        }, done);
      }

      /* RUNG 3: "दूसरा डिब्बा lock हो जाएगा (शब्द सिर्फ सही डिब्बे में जाएगा)।"
         Scoped to the CARD, not to the screen - the attempt ladder here is per item, and a
         screen-wide lock earned by one card would refuse a different card the coach it actually
         belongs in. The drop handler reads `only` and hands the card back without counting it,
         so a child who keeps trying the wrong coach is not punished for it either. */
      const lockToBin = (tile, want)=>{ tile.dataset.only = String(want); };

      /* [r83] a card that has gone into its RIGHT coach - shared by the child's drop and the
         demonstration's, so the watch-first page shows exactly what a real drop does */
      const settleInto = (tile, body, ci)=>{
        /* [r27] LEAVE A SHADOW WHERE THE CARD WAS - AND MEASURE IT FIRST. Moving the tile
           into the cart takes it out of the tray's flex row, so the cards after it slid left:
           the row reshuffled under the child's finger on every drop and nothing showed which
           had already gone. An empty box of the card's own footprint holds the gap open.
           It has to be measured BEFORE `snapped` is added - that class resizes the card to
           its in-cart size (112x124 -> 86x103), so measuring after leaves a shadow smaller
           than the card that cast it and the row still moves.
           offsetWidth/offsetHeight, not a client rect: the stage carries a --scale transform,
           so a rect would be screen px and the box would be wrong on any non-1:1 display. */
        if(!tile._ghost && tile.parentNode){
          const g = document.createElement("div");
          g.className = "tr-ghost";
          g.style.width  = tile.offsetWidth + "px";
          g.style.height = tile.offsetHeight + "px";
          tile.parentNode.insertBefore(g, tile);
          tile._ghost = g;
          requestAnimationFrame(()=> closeGap(g));         /* [r96] and folds away */
        }
        tile.classList.add("snapped");
        /* the card belongs on the coach's painted CREAM PANEL, not loose in the coach body.
           `body` is the drop target (it is what carries .dd-zone); `.coach-face` is the panel
           the artwork actually draws, and it is what centres and clips the cards. Appending
           to the body instead put them at its top-left and let them spill out of the coach. */
        (body.querySelector(".coach-face") || body).appendChild(tile);
        /* SME, matra round: "Only one matra card can be placed inside each coach."
           `filled` is the flag makeDraggable already hit-tests, so a second drop on a full
           coach springs back instead of counting as a wrong attempt. */
        if(d.single) body.classList.add("filled");
        /* [r23] THE CART IS CARRYING SOMETHING NOW, so the empty-tray chrome comes off it -
           see .coach-body.dropzone.tr-has-card in the stylesheet. */
        body.classList.add("tr-has-card");
        /* On the WORD round the card still shows its word once it is in the coach, so mark
           the matra the child just sorted on. Not on the picture round — the SME is
           explicit there that "the word should not be displayed at any point". */
        if(d.kind === "word"){
          const lbl = tile.querySelector(".tr-cardlbl");
          if(lbl) matraHLSoon(lbl, tile.dataset.bin, { glow:true });
        }
        /* [S04] the mark round: «Highlight only the complete matra strokes in red» on placement */
        if(d.kind === "matra"){
          const mk = tile.querySelector(".tr-matra");
          if(tile._h2undo) tile._h2undo();
          if(mk && CARD.chip_strokes) matraHLSoon(mk, tile.dataset.bin, { glow:true });
        }
        /* [S04] «Remove temporary word support whenever its picture is correctly placed», and
           Hint 3's glow / the other cards' wait end with the guided placement */
        tile.querySelectorAll(".tr-revealword").forEach(w => w.remove());
        tile.classList.remove("tr-revealing", "tr-revealkeep", "tr-glow", "tr-h2big");
        if(tile._guided){ tile._guided = false;
          [...tray.querySelectorAll(".tr-card.tr-wait")].forEach(t => t.classList.remove("tr-wait")); }
        placed++;
        train.correct(ci);
        sfxPopSoft();                      /* the DROP, distinct from the pick-up tap */
        SwiftPAL.emit("matra_sort_item", { slide_id: slide.id, bin: tile.dataset.bin });
      };

      [...tray.children].forEach(tile => {
        if(demo){ tile.style.pointerEvents = "none"; return; }   /* [r83] watch only */
        tile.onclick = ()=>{ if(tile.dataset.audio && !isPlaying && !hintBusy)
          say(clip(tile.dataset.audio), ()=>{}); };
        /* SME lists TWO sounds here, not one: "Light tap / pick-up sound when a card is selected"
           and "Soft drop sound when the card is placed". They were both the same tap. */
        makeDraggable(tile, (zone)=>{
          if(hintBusy) return;                      /* a demonstration is speaking */
          const body = zone.closest(".tr-body"); if(!body) return;
          const ci = parseInt(body.dataset.idx, 10);
          /* rung 3 has already named this card's coach: every other one simply will not take it,
             and refusing is NOT a wrong attempt - the child has run out of ladder. */
          if(tile.dataset.only != null && String(ci) !== tile.dataset.only){
            tile.style.transform = "";
            tile.classList.remove("tr-cshake"); void tile.offsetWidth;
            tile.classList.add("tr-cshake");
            setTimeout(()=> tile.classList.remove("tr-cshake"), 560);
            return;
          }
          if(d.bins[ci].key === tile.dataset.bin){
            /* SME: "Correct Answer on 3rd Attempt … No VO." Counted PER CARD, because on a sort
               screen each card carries its own attempt ladder. */
            const quiet = (perCard.get(tile) || 0) >= silentFrom();
            settleInto(tile, body, ci);
            const okvo = quiet ? null : (tile.dataset.okaudio || tile.dataset.audio);
            if(placed >= need){
              /* SME: "No extra completion VO required." finishSlide's silent branch skips
                 slide.audio.correct, so the per-card line above is the final word. */
              sayOpt(clip(okvo), ()=> finishSlide(slide, train, true, "matra_sort_first_try"));
            } else {
              sayOpt(clip(okvo), ()=>{});
            }
          } else {
            const n = (perCard.get(tile) || 0) + 1;
            perCard.set(tile, n);
            state.attempts++;
            fbWrong();
            if(typeof setSwMood === "function") setSwMood("tryagain");
            train.shake(ci);
            tile.style.transform = "";
            /* "गलत डिब्बे में डाला गया शब्द soft shake करके अपनी जगह वापस आ जाएगा।" The COACH
               shook already; the CARD did not - makeDraggable clears its transform before it
               hands over, so it was simply home a frame later with nothing to see. */
            tile.classList.remove("tr-cshake"); void tile.offsetWidth;
            tile.classList.add("tr-cshake");
            setTimeout(()=> tile.classList.remove("tr-cshake"), 560);
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, attempts: state.attempts });
            const want = binIdx(tile.dataset.bin);
            if(n === 1){
              /* [S04] picture round: «फिर से सुनिए।» → the picture's name → «चित्र को सही …» */
              if(A(slide, "hint1_tail") && tile.dataset.audio){
                hintHold((fin)=> sayAll([A(slide, "hint1"), clip(tile.dataset.audio),
                                         A(slide, "hint1_tail")].filter(Boolean), fin));
              } else {
                say(A(slide, "hint1") || A(slide, "try_again"), ()=>{});
              }
            } else if(n === 2 && hintLevels() >= 3){
              state.hintUsed = true;
              SwiftPAL.emit("hint_shown", { slide_id: slide.id, level: 2 });
              sortDemo(tile, ()=> hintHold((fin)=> say(clip(tile.dataset.h2) || A(slide, "hint2")
                                      || A(slide, "hint") || A(slide, "try_again"),
                                      ()=>{ if(tile._h2undo) tile._h2undo(); fin(); })));
            } else {
              state.hintUsed = true;
              SwiftPAL.emit("hint_shown", { slide_id: slide.id, level: 3 });
              /* [S04] «Give the current card and its correct coach a soft glow … Temporarily
                 disable other unfinished cards until this guided placement is complete» */
              tile.classList.add("tr-glow"); tile._guided = true;
              [...tray.querySelectorAll(".tr-card:not(.snapped)")].forEach(t => {
                if(t !== tile) t.classList.add("tr-wait"); });
              lockToBin(tile, want);
              /* [r25] from the card the child is holding to the cart it belongs in */
              withHand3(()=> train.nudgeTo(want, tile, slide));
              if(train.coaches[want]) train.coaches[want].el.classList.add("is-nudge");
              say(clip(tile.dataset.h3) || A(slide, "hint3") || A(slide, "hint2")
                  || A(slide, "hint") || A(slide, "try_again"), ()=>{});
            }
          }
        }, { onPick: ()=>{ if(typeof sfxTap === "function") sfxTap(); } });
      });

      /* prompt first, then each card speaks itself, then the tray unlocks — the same
         listen-before-you-act contract sortSeqReveal gives the stock sort. */
      state.revealing = true;
      [...tray.children].forEach(t => t.classList.add("tr-seq-hidden"));
      train.whenParked(()=> say(A(slide, "prompt"), ()=>{
        const tiles = [...tray.children];
        let i = 0;
        (function step(){
          if(i >= tiles.length){ state.revealing = false; if(demo) runDemo(); return; }
          const t = tiles[i++]; t.classList.remove("tr-seq-hidden");
          /* [S04] a mark card has no clip - «Do not announce the matra's name» - so it just appears */
          if(!t.dataset.audio){ sfxPopSoft(); setTimeout(step, 320); return; }
          say(clip(t.dataset.audio),
              ()=> setTimeout(step, 160));
        })();
      }));
      /* [r83] THE DEMONSTRATION. Yasir: "a copy of page 9 where we'll teach the kid how to drag
         and drop ... user won't have to do anything, we'll show him". After the cards have been
         read out, the hand goes to each in turn: it lands on the card (its name is said again),
         picks it up, carries it across to the coach it belongs in - the card travels under the
         finger exactly as a dragged card does - and lets go; then the drop is the real one
         (settleInto), and the line says why it went there. The last line hands over, and the page
         finishes like any sort page. */
      function runDemo(){
        if(!alive()) return;
        state.demoRunning = true; setNavActive(false);
        const nh = document.getElementById("nudgeHand");
        const tiles = [...tray.querySelectorAll(".tr-card")];
        let k = 0;
        const next = ()=>{
          if(!alive()) return;
          if(k >= tiles.length){
            if(nh){ nh.classList.remove("show", "hint-glow"); nh.style.animation = ""; }
            return sayOpt(A(slide, "outro"), ()=>{ state.demoRunning = false;
              finishSlide(slide, train, true, "sort_demo_done"); });
          }
          const tile = tiles[k++];
          carry(tile, binIdx(tile.dataset.bin), ()=> sayOpt(clip(tile.dataset.okaudio),
                                                          ()=> setTimeout(next, 450)));
        };
        const carry = (tile, ci, done)=>{
          const c = train.coaches[ci];
          const stageEl = document.querySelector(".slide-stage");
          if(!c || !nh || !stageEl){ done(); return; }
          const body = c.body, face = body.querySelector(".coach-face") || body;
          const sc = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
          const sw = stageEl.getBoundingClientRect();
          const tr = tile.getBoundingClientRect(), fr = face.getBoundingClientRect();
          const tx = tr.left + tr.width / 2, ty = tr.top + tr.height / 2;
          const fx = fr.left + fr.width / 2, fy = fr.top + fr.height / 2;
          /* the hand's fingertip is at the top-middle of its 96px box */
          const at = (x, y)=> ({ l: (x - sw.left) / sc - 48, t: (y - sw.top) / sc - 8 });
          const A0 = at(tx, ty), B0 = at(fx, fy);
          nh.style.animation = "none";
          nh.style.left = A0.l + "px"; nh.style.top = A0.t + "px";
          nh.classList.add("show");
          say(clip(tile.dataset.audio), ()=> setTimeout(()=>{
            if(!alive()) return;
            tile.classList.add("dragging");
            tile.style.transform = "scale(1.08)";
            if(typeof sfxTap === "function") sfxTap();
            const DX = (fx - tx) / sc, DY = (fy - ty) / sc, T = 1400;
            let t0 = 0;
            const step = (now)=>{
              if(!alive()) return;
              if(!t0) t0 = now;
              const p = Math.min(1, (now - t0) / T);
              const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
              tile.style.transform = "translate(" + (DX * e) + "px," + (DY * e) + "px) scale(1.08)";
              nh.style.left = (A0.l + (B0.l - A0.l) * e) + "px";
              nh.style.top  = (A0.t + (B0.t - A0.t) * e) + "px";
              body.classList.toggle("hover", p > 0.7);
              if(p < 1){ requestAnimationFrame(step); return; }
              body.classList.remove("hover");
              tile.classList.remove("dragging");
              tile.style.transform = "";
              settleInto(tile, body, ci);
              setTimeout(()=>{ nh.classList.remove("show"); }, 350);
              setTimeout(done, 300);
            };
            requestAnimationFrame(step);
          }, 350));
        };
        setTimeout(next, 500);
      }

      setTimeout(()=>{ if(!hintBusy) state.revealing = false;   /* never cut a demonstration short */
        [...tray.children].forEach(t => t.classList.remove("tr-seq-hidden")); }, 20000);
    }
  };

  /* ================================================================ 3 · MATRA_FILL */
  /* A word with a BLANK where its matra belongs; drag the right matra in.
     data: { slots:[{word, pre, post, matra, img, emoji, audio}], options:[matra,…] }
     `pre`/`post` are authored as the DRAWN halves of the word, so a reordering matra (ि) can
     never be inserted at the wrong visual position. For उ/ऊ they are simply the two halves. */
  SlideModules.MATRA_FILL = {
    mount(host, slide){
      const d = slide.data;
      newVoEpoch();          /* any chain still running from a previous mount is now stale */
      const train = buildTrain(host, {
        coaches: d.slots.length,
        labels: d.slots.map(s => imgOrEmoji(s.img, s.emoji, "tr-slotpic", "tr-emoji")),
        bodies: d.slots.map((s, i) =>
          '<span class="tr-fill" data-i="' + i + '">' +
            '<span class="ink-glyph">' + s.pre + "</span>" +
            '<span class="tr-blank dd-zone" data-idx="' + i + '"></span>' +
            '<span class="ink-glyph">' + s.post + "</span>" +
          "</span>"),
        dropZone: false
      });
      const tray = document.createElement("div");
      tray.className = "tr-tray";
      shuffledFresh(d.options, slide.id + ":options").forEach(m => {     /* [r29] */
        const t = document.createElement("div");
        t.className = "tr-card k-matra";
        t.dataset.matra = m;
        t.innerHTML = '<span class="tr-matra ink-glyph">◌' + m + "</span>";
        tray.appendChild(t);
      });
      host.appendChild(tray);

      state.ownsAudio = true;
      state.replayAudio = ()=> say(A(slide, "prompt"), ()=>{});
      setNavActive(false);
      let filled = 0;
      const perCard = new Map();

      [...tray.children].forEach(tile => {
        makeDraggable(tile, (zone)=>{
          const blank = zone.closest(".tr-blank"); if(!blank) return;
          if(blank.classList.contains("filled")) return;
          const i = parseInt(blank.dataset.idx, 10);
          const slot = d.slots[i];
          if(tile.dataset.matra === slot.matra){
            blank.classList.add("filled");
            blank.innerHTML = '<span class="ink-glyph tr-inmatra">' + slot.matra + "</span>";
            /* the completed word replaces the split form, so the child reads it whole */
            const holder = blank.closest(".tr-fill");
            setTimeout(()=>{
              holder.innerHTML = '<span class="ink-glyph tr-doneword">' + slot.word + "</span>";
              /* the completed word keeps the matra marked, so the child sees WHICH mark they
                 just supplied rather than only that the word is now whole */
              matraHLSoon(holder.querySelector(".tr-doneword"), slot.matra, { glow:true });
            }, 450);
            tile.style.transform = "";
            filled++;
            train.correct(i);
            fbCorrect();
            SwiftPAL.emit("matra_fill_item", { slide_id: slide.id, word: slot.word });
            if(filled >= d.slots.length){
              finishSlide(slide, train, false, "matra_fill_first_try");
            } else {
              say(clip(slot.audio), ()=>{});
            }
          } else {
            const n = (perCard.get(tile) || 0) + 1; perCard.set(tile, n);
            state.attempts++;
            fbWrong();
            train.shake(i);
            tile.style.transform = "";
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, attempts: state.attempts });
            if(n === 1) say(A(slide, "hint1") || A(slide, "try_again"), ()=>{});
            else { state.hintUsed = true;
              say(A(slide, "hint2") || A(slide, "hint"), ()=> train.nudge(i, slide)); }
          }
        });
      });
      say(A(slide, "prompt"), ()=>{});
    }
  };

  /* ================================================================ 4 · MATRA_BUILD */
  /* «पल → प + ◌ु = पु → पुल» — the transformation teach, ported from HI02H11_L02_S01's page 2.
     Yasir: "page2 of my previous file is exactly same as page2 of my current file (just element,
     images changes rest animation, its flow it same) so try to match exactly with that file."

     So the STAGING is the sibling's, step for step: three panels revealed in turn, the consonant
     lighting inside the base word, the matra FLYING into the equation slot and handing over to
     it with a cross-fade, the syllable dissolving up while the equation gives a small nod, the
     result panel arriving, the matra pulsing inside the finished word, and the three-sound
     contrast pulsing the equation. The previous build did all of this as four nested say()
     callbacks with hard class swaps — same beats, none of the motion.

     TWO THINGS ARE DELIBERATELY NOT THE SIBLING'S, and both are forced by the matra:

     1. THE HIGHLIGHT. The sibling paints its matra with `_matraWordSVG`, which clips by COLUMN —
        an x-range over the full height. That works for ा / ि / ी, which are SPACING marks with
        an advance of their own. ु and ू have NO advance: they hang under the consonant, so the
        consonant's advance and the cluster's advance are the same number and the column comes
        out zero-width. This lesson's `matraHL` exists for exactly that — a 2-D clip, the
        cluster's x-range intersected with the below-baseline band. Using the sibling's helper
        here would silently paint nothing, or paint the next letter.
     2. THE DIRECTION OF TRAVEL. The sibling sends ा / ी in from the RIGHT and ि from the LEFT,
        because that is where those marks live. ु lives UNDERNEATH, and the note says so: "The ु
        मात्रा should softly pop/slide into its correct position below प." `data.travel` carries
        it, so the flight is vertical here and the keyframes take both axes.

     SFX are the note's three, and only those three: a soft pop as the matra arrives, a light
     chime as प becomes पु, a small success sound as पुल completes. The sibling also chimes when
     the consonant lights; the note lists three and asks to "keep SFX subtle so the pronunciation
     remains clear", so that fourth one is left out. */
  SlideModules.MATRA_BUILD = {
    mount(host, slide){
      const d = slide.data || {};
      newVoEpoch();
      if(d.no_heading){ const _st = document.getElementById("stage"); if(_st) _st.classList.add("no-band"); }

      const row = document.createElement("div"); row.className = "mb-row";

      /* --- panel 1: the base word ------------------------------------------------------
         पल / फल are bare consonant pairs with no combining marks, so splitting them per
         character is safe — there is no cluster for the browser to shape. NEVER do this to a
         word that carries a matra; that is what panel 3 is careful about. */
      /* [r18] hidden until the opening line has played — see step 2 */
      const p1 = document.createElement("div"); p1.className = "mb-panel mb-p1 mb-hidden";
      /* [S04] SPLIT BY अक्षर, NOT BY CODE POINT. घड़ा is घ + ड + ़ + ा - a per-character split put
         the nukta and the ा in spans of their own, where each grew a dotted circle. Grapheme
         clusters keep ड़ा whole («Keep ड़ा together») and still give घ / ल a span of their own. */
      const baseChars = clustersOf(d.base_word || "").map(ch =>
        '<span class="mb-c" data-ch="' + ch + '">' + ch + "</span>").join("");
      /* [S04] `base_img_from`: the base picture is an ACTION - «खिलना», a bud opening into the
         flower. Both pictures are stacked; the bud dissolves into the flower while «यह शब्द
         देखिए, खिलना» plays. Settled state (capture, reduced motion) is the open flower. */
      const basePicHTML = (d.base_img || d.base_emoji)
        ? (d.base_img_from
            ? '<span class="mb-bloom">' +
                imgOrEmoji(d.base_img, d.base_emoji, "mb-img mb-bloom-to", "mb-emoji") +
                imgOrEmoji(d.base_img_from, d.base_emoji, "mb-img mb-bloom-from", "mb-emoji") +
              "</span>"
            : imgOrEmoji(d.base_img, d.base_emoji, "mb-img", "mb-emoji"))
        : "";
      p1.innerHTML = '<div class="mb-word">' + baseChars + "</div>" +
                     '<div class="mb-pic">' + basePicHTML + "</div>";
      row.appendChild(p1);

      const a1 = document.createElement("div");
      a1.className = "mb-arrow mb-panel mb-hidden"; a1.textContent = "→";
      row.appendChild(a1);

      /* --- panel 2: the equation  consonant + matra = syllable -------------------------- */
      /* ONE DOTTED CIRCLE, NOT TWO. This was '<span class=mb-dot>◌</span><span
         class=mb-mk>ु</span>' - two spans so the placeholder could be greyed and the matra
         coloured. But ु is a COMBINING mark: alone in its own span it has no base to attach to,
         so the renderer supplies a dotted circle OF ITS OWN. The result was the grey ◌ we asked
         for, followed by a second, orange one carrying the matra.
         One span, one cluster, one circle - and the colouring is done by matraHL, which clips the
         below-baseline band and so paints the matra while leaving the placeholder alone. That is
         also what the note asks for: "highlight only matra not any other letter". */
      const chip = matraGlyph(d.matra || "");
      const p2 = document.createElement("div"); p2.className = "mb-panel mb-p2 mb-hidden";
      p2.innerHTML =
        '<div class="mb-eq"><div class="mb-eq-line">' +
          '<span class="mb-cons ink-glyph">' + (d.consonant || "") + "</span>" +
          '<span class="mb-op">+</span>' +
          '<span class="mb-m mb-slot"></span>' +
          '<span class="mb-op">=</span>' +
          '<span class="mb-syl ink-glyph"></span>' +
        "</div></div>";
      row.appendChild(p2);

      const a2 = document.createElement("div");
      a2.className = "mb-arrow mb-panel mb-hidden"; a2.textContent = "→";
      row.appendChild(a2);

      /* --- panel 3: the finished word + its picture ------------------------------------- */
      const p3 = document.createElement("div"); p3.className = "mb-panel mb-p3 mb-hidden";
      p3.innerHTML = '<div class="mb-word"><span class="mb-result ink-glyph">' +
                       (d.result_word || "") + "</span></div>" +
                     /* [S04] «Show: खि + लौ + ना = खिलौना» - the join, written out under the word */
                     (d.cap_result ? '<div class="mb-capres">' + d.cap_result + "</div>" : "") +
                     '<div class="mb-pic">' +
                       imgOrEmoji(d.result_img, d.result_emoji, "mb-img", "mb-emoji") + "</div>";
      row.appendChild(p3);

      host.appendChild(row);

      const consEl = p1.querySelector('.mb-c[data-ch="' + (d.consonant || "") + '"]');
      const slot   = p2.querySelector(".mb-slot");
      const sylEl  = p2.querySelector(".mb-syl");
      const resEl  = p3.querySelector(".mb-result");
      const basePic = p1.querySelector(".mb-bloom");
      /* [S04] «Highlight only the ो मात्रा … The dotted circle is a display aid» - for a mark
         drawn above/right of its consonant the chip is painted navy and only the strokes are
         lit (matraHL's mask path separates them from the ◌ exactly). ु/ू keep File3's chip. */
      const strokeChip = !!CARD.chip_strokes && !_BELOW_MARKS.has(d.matra || "");   /* File3 look unless asked */
      if(strokeChip) p2.classList.add("mb-strokes");
      const show   = (el)=>{ el.classList.remove("mb-hidden"); el.classList.remove("mb-in");
                             void el.offsetWidth; el.classList.add("mb-in"); };

      state.ownsAudio = true; state.demoRunning = true;
      if(typeof setSwMood === "function") setSwMood("teach");
      setNavActive(false);
      state.replayAudio = null;

      /* PAINT THE SETTLED STATE AT MOUNT TOO. Live, panels 2 and 3 are `mb-hidden` until the
         chain reveals them, so the child never sees the highlight early. But the review capture
         strips the staging classes and freezes before any audio runs, so a highlight applied
         only in a callback photographs missing — which is how the round-3b deck shipped «पुल»
         with no orange ु while the running game coloured it. matraHL is idempotent. */
      matraHLSoon(resEl, d.matra, { glow:true });

      let finished = false;
      const finish = ()=>{
        if(finished) return; finished = true;
        state.demoRunning = false;
        [p1, a1, p2, a2, p3].forEach(e => e.classList.remove("mb-hidden"));
        if(consEl) consEl.classList.add("lit");
        if(basePic) basePic.classList.add("is-bloomed");
        slot.innerHTML = chip;
        slot.classList.remove("mb-slot-wait"); slot.classList.add("mb-slot-in");
        if(strokeChip) matraHLSoon(slot, d.matra, { glow:true });
        sylEl.textContent = d.syllable || "";
        matraHLSoon(sylEl, d.matra, { glow:true });
        matraHLSoon(resEl, d.matra, { glow:true });
        state.replayAudio = ()=> sayAll(
          [A(slide,"base"), A(slide,"onset"), A(slide,"result"), A(slide,"sounds")].filter(Boolean), ()=>{});
        $("navBtn").onclick = ()=> completeSlide(true);
        setNavActive(true);
      };

      /* Each step waits for the PREVIOUS CLIP TO END and then holds a short beat — the note asks
         for "a short pause between each sound so the child can hear how the sound changes". */
      const steps = [
        // 1 · «आइए, देखें कि छोटी उ की मात्रा लगने से शब्द की आवाज़ कैसे बदलती है।»
        (next)=> say(A(slide, "prompt"), ()=> setTimeout(next, 420)),
        // 2 · «यह शब्द देखिए — पल।»
        /* [r18] पल AND ITS PICTURE arrive first, and only then the line that names them.
           They were on screen from mount, so «आइए, देखें कि …» played over a screen with
           nothing left to reveal — the same fault as page 3, and why that line read as absent. */
        (next)=>{ show(p1); sfxPopSoft();
                  /* [S04] «Briefly animate the bud opening into a flower» as the word is named */
                  if(basePic) setTimeout(()=>{ if(myGen === _voGen) basePic.classList.add("is-bloomed"); }, 900);
                  setTimeout(()=> say(A(slide, "base"), ()=> setTimeout(next, 520)), 260); },
        // 3 · the consonant lights inside the base word ("Highlight प")
        (next)=>{ if(consEl) consEl.classList.add("lit"); setTimeout(next, 620); },
        /* 4 · the matra flies to its place BELOW the consonant and hands over to the slot.
           It is parked over the slot's MEASURED centre first and the keyframes then describe
           only the travel, so it lands where the slot actually is. offsetLeft/offsetTop, never
           getBoundingClientRect: the stage carries a --scale transform, so rects come back in
           screen px while style.left is written in CSS px. */
        (next)=>{
          show(a1); show(p2);
          const eq = p2.querySelector(".mb-eq");
          /* fill the slot NOW but hold it invisible, so the equation's layout is already final
             when the flier is parked — otherwise the slot grows as it fills and the matra lands
             a few px off the mark it was aimed at */
          slot.innerHTML = chip;
          slot.classList.add("mb-slot-wait");
          const fly = document.createElement("span");
          fly.className = "mb-fly"; fly.innerHTML = chip;
          eq.appendChild(fly);
          requestAnimationFrame(()=>{
            fly.style.left = (slot.offsetLeft + (slot.offsetWidth  - fly.offsetWidth)  / 2) + "px";
            fly.style.top  = (slot.offsetTop  + (slot.offsetHeight - fly.offsetHeight) / 2) + "px";
            /* ु and ू hang UNDER the consonant, so they arrive from below — the note's own
               words. A side entry is for the spacing matras the sibling teaches. */
            const down = (d.travel || "down") === "down";
            /* [S04] ो / ौ sit ABOVE and to the RIGHT of the consonant, so they come down onto it
               from above-right ("softly slide into its correct position around घ") */
            const up = d.travel === "up";
            fly.style.setProperty("--mb-fx", (down) ? "0px" : (up ? "70px"
              : (RIGHT_SPACING_MATRAS.has(d.matra) ? "118px" : "-118px")));
            fly.style.setProperty("--mb-fy", down ? "96px" : (up ? "-90px" : "-38px"));
            fly.classList.add("mb-fly-go");
            sfxPopSoft();                    // note: "a soft pop when ु appears"
          });
          setTimeout(()=>{                   // cross-fade: the slot fades up as the flier fades out
            slot.classList.remove("mb-slot-wait");
            slot.classList.add("mb-slot-in");
            if(strokeChip) matraHLSoon(slot, d.matra, { glow:true, pulse:true });
            fly.classList.add("mb-fly-done");
            setTimeout(()=> fly.remove(), 300);
            say(A(slide, "matra_name"), ()=> setTimeout(next, 300));
          }, 760);
        },
        /* 5 · प becomes पु. A bare textContent swap made the old glyph vanish and the new one
           appear between two frames; it dissolves up now, and the equation gives a small nod so
           the eye follows the change. */
        (next)=>{
          /* [r18] प BECOMES पु ON THE WORDS THAT SAY SO — the clip starts first and the
             syllable forms at «बनता», instead of being written and then described. */
          const eq = p2.querySelector(".mb-eq");
          const _formSyl = ()=>{
            sylEl.textContent = d.syllable || "";
            sylEl.classList.remove("mb-syl-in"); void sylEl.offsetWidth; sylEl.classList.add("mb-syl-in");
            matraHLSoon(sylEl, d.matra, { glow:true });
            if(eq){ eq.classList.remove("mb-settle"); void eq.offsetWidth; eq.classList.add("mb-settle"); }
          };
          const _t1 = setTimeout(()=>{
            if(CARD.slides[state.idx] !== slide || myGen !== _voGen) return;
            _formSyl();
            sfxSparkle();                    // note: "a light chime when प changes to पु"
          }, Math.max(0, d.syl_ms || 340));
          say(A(slide, "onset"), ()=>{ clearTimeout(_t1);
            if(CARD.slides[state.idx] !== slide || myGen !== _voGen) return;
            _formSyl();                      // never leave the equation half written
            setTimeout(next, 560); });
        },
        // 6 · ल joins, the finished word and its bridge picture arrive
        /* [r18] ल JOINS ON «जुड़ने», inside its own line — the finished word and its picture
           used to arrive a whole step BEFORE the sentence that announces them. */
        (next)=>{
          const _t2 = setTimeout(()=>{
            if(CARD.slides[state.idx] !== slide || myGen !== _voGen) return;
            show(a2); show(p3);
            fbCorrect();   // "a small success sound"
            matraHLSoon(resEl, d.matra, { glow:true, pulse:true });
          }, Math.max(0, d.join_ms || 320));
          say(A(slide, "result"), ()=>{ clearTimeout(_t2);
            if(CARD.slides[state.idx] !== slide || myGen !== _voGen) return;
            [a2, p3].forEach(e => e.classList.remove("mb-hidden"));
            matraHLSoon(resEl, d.matra, { glow:true });
            setTimeout(next, 420); });
        },
        /* 7 · the matra is highlighted inside the finished word while that word is spoken —
           «अब 'ल' जुड़ने पर 'पुल' बनता है।» The note: "In पुल, highlight the ु मात्रा again so
           the child clearly notices where the matra is placed." */

        /* 8 · the three sounds contrasted — «प। पु। पुल।» One clip, because three clips back to
           back lose the deliberate pause the note asks for. */
        (next)=>{ const src = A(slide, "sounds");
                  if(!src){ next(); return; }
                  const eq = p2.querySelector(".mb-eq");
                  /* EACH SOUND LIFTS THE THING IT IS. «प» -> the consonant in पल, «पु» -> the
                     equation's syllable, «पुल» -> the finished word. `sound_ms` is measured at
                     build time from the SILENCE BETWEEN THE SOUNDS in this very clip, so the
                     three cues follow a re-record instead of drifting off it. With no cues
                     (an older card, or a clip that would not segment) the equation glows once,
                     as it used to - a weaker beat, never a wrong one. */
                  const cues = d.sound_ms, marks = [consEl, sylEl, resEl];
                  const timers = [];
                  if(cues && cues.length === 3){
                    cues.forEach((ms, i)=>{
                      const el = marks[i];
                      if(!el) return;
                      timers.push(setTimeout(()=>{
                        if(CARD.slides[state.idx] !== slide || myGen !== _voGen) return;
                        marks.forEach(m => m && m.classList.remove("mb-now"));
                        void el.offsetWidth; el.classList.add("mb-now");
                      }, Math.max(0, ms)));
                    });
                  } else if(eq){ eq.classList.add("mb-say"); }
                  say(src, ()=>{ timers.forEach(clearTimeout);
                                 marks.forEach(m => m && m.classList.remove("mb-now"));
                                 if(eq) eq.classList.remove("mb-say");
                                 setTimeout(next, 300); }); }
      ];

      let si = 0;
      const myGen = _voGen;
      const run = ()=>{
        if(CARD.slides[state.idx] !== slide) return;   // navigated away -> abort
        if(myGen !== _voGen) return;                   // a newer mount owns the audio now
        if(si >= steps.length){ finish(); return; }
        steps[si++](run);
      };
      setTimeout(run, 380);
      /* FAIL-SAFE: आगे never stays dead if a clip blocks or is missing */
      setTimeout(()=>{ if(CARD.slides[state.idx] === slide) finish(); }, 46000);
    }
  };

  /* ================================================================ 5 · MEET_PAIR */
  /* «गुड़» then «धनुष» — two example words, one at a time, ported from the sibling's page 3
     (MEET_EXAMPLES). Yasir: "page3 of my previous file is exactly same as page3 of my current
     file (just element, images changes rest animation, its flow it same)."

     THE ORDER WAS INVERTED BEFORE THIS. The note's sequence is: word appears · image appears ·
     the matra is highlighted — and only around that does the line play. The previous build spoke
     the whole line FIRST and revealed the picture and the highlight on its callback, so the child
     heard «इसमें ग पर छोटी उ की मात्रा लगी है» while nothing on screen had changed yet, and the
     mark lit up after the sentence naming it had finished. Now it is the sibling's staging:
        word + pop → 520ms → picture fades in + pop → 380ms → matra lights + chime, THEN the line.

     The «इस शब्द की मात्रा — ◌ु» callout is gone. It was already display:none from an earlier
     round (the mark is highlighted inside the word now, so the callout was saying twice what the
     word shows once), and the guiding hand that used to point at it went with it — it was
     pointing at an invisible element, and the sibling's page 3 has no hand either.

     data: { examples:[{word, matra, img, emoji, audio_line, matra_audio}] } */
  SlideModules.MEET_PAIR = {
    mount(host, slide){
      const d = slide.data || {};
      const exs = d.examples || [];
      newVoEpoch();
      if(d.no_heading){ const _st = document.getElementById("stage"); if(_st) _st.classList.add("no-band"); }

      /* [r14] THE SIBLING'S OWN MARKUP, not a look-alike. `.meet-col / .meet-stage /
         .meet-letter-box / .meet-pic-box / .pic-img` are SHARED-ENGINE classes and their CSS is
         byte-identical in both builds - so rendering into them reproduces the sibling's page 3
         exactly: 120px navy word in a 300-420x340 cream card, a 320x340 picture card beside it,
         80px apart. The previous `.mp-card` markup was this lesson's own invention and measured
         80px/146px against the sibling's 120px/219px, which is what Yasir was seeing. */
      const col = document.createElement("div"); col.className = "meet-col mex-col";
      const wrap = document.createElement("div"); wrap.className = "meet-stage";
      col.appendChild(wrap);
      host.appendChild(col);

      state.ownsAudio = true; state.demoRunning = true;
      if(typeof setSwMood === "function") setSwMood("teach");
      setNavActive(false);
      state.replayAudio = null;

      /* one example, staged: the word is there, the picture is held back a beat */
      const render = (ex)=>{
        wrap.innerHTML =
          '<div class="meet-letter-box">' +
            '<span class="glyph ink-glyph mp-word" style="font-size:120px">' + ex.word + "</span>" +
          "</div>" +
          '<div class="meet-pic-box mex-pic mp-wait">' +
            imgOrEmoji(ex.img, ex.emoji, "pic-img", "pic-emoji") + "</div>";
        return { card: wrap.querySelector(".meet-letter-box"),
                 word: wrap.querySelector(".mp-word"),
                 pic:  wrap.querySelector(".mex-pic") };
      };

      const myGen = _voGen;
      let i = 0, finished = false;
      const finish = ()=>{
        if(finished) return; finished = true;
        state.demoRunning = false;
        state.replayAudio = ()=> sayAll(
          [A(slide, "prompt")].concat(exs.map(e => clip(e.audio_line))).filter(Boolean), ()=>{});
        $("navBtn").onclick = ()=> completeSlide(true);
        setNavActive(true);
      };

      const runOne = (after)=>{
        const ex = exs[i];
        if(!ex){ after(); return; }
        const { card, word, pic } = render(ex);

        /* [r15] THE VOICE DRIVES THE PICTURE AND THE GLOW, not a pair of fixed delays.
           Before this the word, the picture and the mark all arrived inside ~950ms and THEN the
           3.4s line played over a screen that had already finished moving - measured: pop at
           7060ms, picture at 7588ms, glow and clip together at 8012ms. Nothing on screen
           corresponded to what was being said, which is what "animation must sync with VO" is
           about. The line's three clauses each own their beat now:
               «गुड़,»                -> the word (already up; the clip opens by naming it)
               «बोलकर देखिए।»         -> the picture arrives
               «इसमें ग पर … लगी है।»  -> the mark lights
           `pic_ms` and `matra_ms` are measured off each clip at BUILD time, so they follow a
           re-record rather than drifting away from it. The old fixed delays remain as fallbacks
           for a card that predates them. */
        const alive = ()=> CARD.slides[state.idx] === slide && myGen === _voGen;
        const timers = [];

        /* 1 · the word arrives */
        card.classList.remove("mp-in"); void card.offsetWidth; card.classList.add("mp-in");
        sfxPopSoft();                         // note: "soft pop sound when word/image appears"

        /* 2 · a short beat, then the line starts and carries the rest */
        timers.push(setTimeout(()=>{
          if(!alive()) return;
          timers.push(setTimeout(()=>{        // 3 · «बोलकर देखिए।» -> the picture
            if(!alive()) return;
            pic.classList.remove("mp-wait");
            sfxPopSoft();
          }, Math.max(0, ex.pic_ms || 520)));
          timers.push(setTimeout(()=>{        // 4 · «इसमें … मात्रा लगी है।» -> the mark
            if(!alive()) return;
            pic.classList.remove("mp-wait");   // never strand it if the cue overran the clip
            matraHLSoon(word, ex.matra, { glow:true, pulse:true });
            sfxSparkle();                     // note: "soft highlight chime when matra glows"
          }, Math.max(0, ex.matra_ms || 900)));
          say(clip(ex.audio_line), ()=>{
            timers.forEach(clearTimeout);
            if(!alive()) return;
            /* whatever the cues did, the example ends fully shown */
            pic.classList.remove("mp-wait");
            matraHLSoon(word, ex.matra, { glow:true });
            word.classList.remove("mh-pulse");
            sayOpt(clip(ex.matra_audio), ()=> setTimeout(after, 520));
          });
        }, 260));
      };

      const step = ()=>{
        if(CARD.slides[state.idx] !== slide) return;   // navigated away -> abort
        if(myGen !== _voGen) return;                   // a newer mount owns the audio
        if(i >= exs.length){ finish(); return; }
        runOne(()=>{ i++; step(); });
      };

      /* [r16] THE STAGE STAYS EMPTY WHILE THE OPENING LINE PLAYS. It used to paint example 1
         at mount so a frozen capture would never catch a blank slide - but that put गुड़ on
         screen at 48ms, while «आइए, छोटी उ की मात्रा वाले कुछ शब्द देखें।» was still
         being spoken. The line then had no beat of its own: nothing happened while it played and
         the word was already there when it finished, which is why it read as missing.
         The note's order is explicit - the VO plays, THEN गुड़ appears. The capture is safe
         without the early paint: that harness stubs play() to 15ms, so the chain has rendered the
         first example long before the shot is taken. */

      // «आइए, छोटी उ की मात्रा वाले कुछ शब्द देखें।» then the examples, one by one
      say(A(slide, "prompt"), ()=> setTimeout(step, 320));
      /* FAIL-SAFE: आगे never stays dead if a clip blocks or is missing */
      setTimeout(()=>{ if(CARD.slides[state.idx] === slide) finish(); }, 42000);
    }
  };

  /* ================================================================ 6 · CONTRAST_PAIR */
  /* The minimal pair taught head to head — «फुल / फूल». The curriculum row asks for exactly
     this: «मिलते-जुलते जोड़े (फूल/फल) विपर्यय राउंड में», and names the error it prevents
     («'फूल' को 'फुल' पढ़ता है»). Autonomous teach, zero taps.
     data: { left:{word,matra,label}, right:{word,matra,img,emoji,label} } */
  SlideModules.CONTRAST_PAIR = {
    mount(host, slide){
      const d = slide.data;
      newVoEpoch();          /* any chain still running from a previous mount is now stale */
      const wrap = document.createElement("div");
      wrap.className = "cp-stage";
      const side = (s, cls)=>
        '<div class="cp-side ' + cls + '">' +
          '<span class="ink-box"><span class="cp-word ink-glyph">' + s.word + "</span></span>" +
          '<span class="cp-matra">◌' + s.matra + "</span>" +
          '<span class="cp-lbl">' + (s.label || "") + "</span>" +
        "</div>";
      wrap.innerHTML = side(d.left, "cp-a") + '<div class="cp-vs">≠</div>' + side(d.right, "cp-b");
      host.appendChild(wrap);
      const a = wrap.querySelector(".cp-a"), b = wrap.querySelector(".cp-b"), vs = wrap.querySelector(".cp-vs");
      [a, b, vs].forEach(e => e.classList.add("mb-seq-hidden"));

      state.ownsAudio = true; state.demoRunning = true; setNavActive(false);
      if(typeof setSwMood === "function") setSwMood("teach");
      /* The contrast IS the two marks, so highlighting them is not decoration here — a child
         who cannot see which mark differs cannot learn फुल ≠ फूल. Both are highlighted as
         their side is revealed. */
      const aw = a.querySelector(".cp-word"), bw = b.querySelector(".cp-word");
      /* painted at mount for the capture; both sides are mb-seq-hidden live (see MATRA_BUILD) */
      matraHLSoon(aw, d.left.matra,  { glow:true });
      matraHLSoon(bw, d.right.matra, { glow:true });
      say(A(slide, "prompt"), ()=>{
        a.classList.remove("mb-seq-hidden"); a.classList.add("mb-in");
        matraHLSoon(aw, d.left.matra, { glow:true });
        say(A(slide, "left"), ()=>{
          vs.classList.remove("mb-seq-hidden"); vs.classList.add("mb-in");
          b.classList.remove("mb-seq-hidden"); b.classList.add("mb-in");
          matraHLSoon(bw, d.right.matra, { glow:true, pulse:true });
          say(A(slide, "right"), ()=>{
            say(A(slide, "explain"), ()=>{
              state.demoRunning = false;
              state.replayAudio = ()=> sayAll([A(slide,"left"), A(slide,"right")], ()=>{});
              $("navBtn").onclick = ()=> completeSlide(true);
              setNavActive(true);
            });
          });
        });
      });
      setTimeout(()=>{ if(state.demoRunning){ state.demoRunning = false; setNavActive(true);
        $("navBtn").onclick = ()=> completeSlide(true); } }, 30000);
    }
  };

  /* ================================================================ 8 · MATRA_INTRO */
  /* The SME's screen 1, which the first build did not implement.

     Their note asks for the LETTER AND ITS MATRA SHOWN AS A PAIR, one pair at a time:
        "Show the letter and its corresponding matra symbol as a pair, one by one.
         Each pair should light up/highlight when its VO plays.
         Keep only one pair active at a time.
         Sequence: आ → ा · इ → ि · ई → ी"
     The stock INTRO module draws a row of bare symbols, so the built screen showed «◌ु ◌ू»
     with no letters at all — the child was never told which VOWEL each mark stands for, which
     is the whole point of the screen. For this skill the sequence is उ → ◌ु and ऊ → ◌ू.

     Also per the note: the Next button stays locked "only after all pairs have been shown and
     spoken", and a soft pop plays as each mark appears.
     data: { pairs:[{letter, matra, audio}] } */
  SlideModules.MATRA_INTRO = {
    mount(host, slide){
      const d = slide.data;
      newVoEpoch();          /* any chain still running from a previous mount is now stale */
      /* ROUND 3: the SME asks to "keep the train-theme continuity by showing each pair inside a
         train-style card / bogie / box", and round 3b makes that the SAME painted train the cover
         and every test screen use — one train through the whole lesson, which is the point of the
         note. Each «उ → ◌ु» pair is painted onto its coach's cream panel. */
      const wrapHost = document.createElement("div");
      wrapHost.className = "mi-stage";
      host.appendChild(wrapHost);
      const train = buildTrain(wrapHost, {
        coaches: d.pairs.length,
        labels: d.pairs.map(()=> null),
        bodies: d.pairs.map(p =>
          '<span class="mi-pair-in">' +
            '<span class="mi-letter ink-glyph">' + p.letter + "</span>" +
            '<span class="mi-arrow">\u2192</span>' +
            '<span class="mi-matra ink-glyph">' + matraGlyph(p.matra) + "</span>" +
          "</span>"),
        dropZone: false, maxH: 210
      });
      const wrap = wrapHost;   /* the rest of this module refers to `wrap` */
      train.coaches.forEach((c)=> c.el.classList.add("mi-pair"));
      const pairs = train.coaches.map(c => c.el);

      state.ownsAudio = true; state.demoRunning = true; setNavActive(false);
      if(typeof setSwMood === "function") setSwMood("teach");

      /* WITHIN EACH PAIR THE TWO GLYPHS ARRIVE SEPARATELY. The SME's animation note is explicit:
         "First उ appears, then ु appears beside it with a soft glow. After that, both can fade
         slightly / dim softly. Then ऊ appears, and ू appears beside it." Until now both glyphs
         were painted together and only the PAIR sequenced, so the one thing the screen exists to
         teach — that this letter owns this mark — was never actually shown happening.

         SETTLED BY DEFAULT, held back live. The hold class is named `mi-seq-hidden` on purpose:
         this bundle's capture settler strips anything ending in `seq-hidden`, so a frozen review
         capture still photographs the finished screen instead of two empty coaches. */
      const parts = train.coaches.map(c => ({
        letter: c.body.querySelector(".mi-letter"),
        arrow:  c.body.querySelector(".mi-arrow"),
        matra:  c.body.querySelector(".mi-matra")
      }));
      const reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches);
      const showAll = ()=> parts.forEach(pt => [pt.letter, pt.arrow, pt.matra]
        .forEach(e => e && e.classList.remove("mi-seq-hidden")));
      if(!reduced) parts.forEach(pt => [pt.letter, pt.arrow, pt.matra]
        .forEach(e => e && e.classList.add("mi-seq-hidden")));

      const done = ()=>{
        state.demoRunning = false;
        pairs.forEach(p => p.classList.remove("is-dim"));
        showAll();                       /* nothing may be left invisible once the beat is over */
        state.replayAudio = ()=> sayAll(d.pairs.map(p => clip(p.audio)), ()=>{});
        $("navBtn").onclick = ()=> completeSlide(true);
        setNavActive(true);
      };
      let i = 0;
      const step = ()=>{
        if(i >= pairs.length){ done(); return; }
        const k = i++;
        const pt = parts[k];
        /* "Keep only one pair active at a time" · "Each active pair should light up when its VO
           plays" — the pair before this one dims rather than disappearing. */
        pairs.forEach((p, n) => p.classList.toggle("is-dim", n !== k));
        pairs[k].classList.add("is-on");
        /* the letter lands with «यह है उ», … */
        if(pt.letter){ pt.letter.classList.remove("mi-seq-hidden"); pt.letter.classList.add("mi-pop"); }
        /* … and the matra beside it a beat later, on «इसकी मात्रा है — ु», with the soft glow and
           the chime the note asks for. 1500ms is roughly where that half of the line starts in a
           ~4s clip; it is a beat, not a claim of lip-sync. */
        setTimeout(()=>{
          if(!pt.matra || !pt.matra.isConnected) return;
          if(pt.arrow){ pt.arrow.classList.remove("mi-seq-hidden"); pt.arrow.classList.add("mi-pop"); }
          pt.matra.classList.remove("mi-seq-hidden");
          pt.matra.classList.add("mi-pop", "mi-glow");
          sfxPopSoft();                  /* SME: "a soft pop / chime when each MATRA symbol appears" */
        }, 1500);
        say(clip(d.pairs[k].audio), ()=> setTimeout(step, 320));
      };
      /* `instruction` is optional in round 3 — the SME's VO list for this screen is the intro
         line and then the two pair lines, nothing between them. */
      train.whenParked(()=> say(A(slide, "prompt"), ()=> sayOpt(A(slide, "instruction"), step)));
      /* never strand the slide, and never leave a glyph hidden if the chain stalls */
      setTimeout(()=>{ if(state.demoRunning) done(); else showAll(); }, 30000);
    }
  };


  /* ================================================================ 12 · MATRA_PAIRS */
  /* PORTED FROM HI02H11_L02_S01, which built this exact screen for आ/इ/ई. The SME's page-1 note
     is the same note in both decks, and the sibling's reading of it is the one to match:

       "First उ appears, THEN ु appears beside it with a soft glow."
       "After that, both can fade slightly / dim softly. Then ऊ appears, and ू appears beside it."
       "Use a simple pop / fade animation." · "Do not add extra decorative elements."

     So NOTHING is on screen at mount; a pair arrives only when its turn comes; inside a pair the
     LETTER lands first and the matra follows beside it; and a pair already taught stays FADED
     rather than being restored to full — the note never asks for that.

     NO CARD, NO BOGIE, NO HEADING. The sibling's own comment records why the card chrome went:
     it was "exactly the 'extra decorative element' the note rules out". The train belongs to the
     screens that need coaches to sort into; page 1 is two glyphs and a relationship between them.

     NO `.ink-glyph` ON THESE SPANS, deliberately, and this is the sibling's measurement: the
     engine's centerInkGlyph() squares up the ink BOUNDING BOX, which translated the letter ~2.5px
     but the matra ~13.3px, so the two never shared a baseline. Plain baseline alignment puts the
     letter and its dotted circle on one line. */
  SlideModules.MATRA_PAIRS = {
    mount(host, slide){
      newVoEpoch();
      const d = slide.data || {};
      const pairs = d.pairs || [];
      /* the SME asks for no heading on this screen; the band is hidden per-slide rather than
         globally, so an ACCIDENTALLY empty heading anywhere else still fails the build */
      if(d.no_heading){ const st = document.getElementById("stage");
        if(st){ st.classList.add("no-band");
                /* r7: this screen is two cards and a lot of air, so it centres on the
                   MAIN BOX rather than on the content box the nav-button clearance
                   leaves behind. Scoped to a class this module owns and newVoEpoch
                   drops, so no other screen loses that clearance. */
                st.classList.add("mp-center"); } }

      const row = document.createElement("div"); row.className = "mp-row";
      const els = pairs.map(p => {
        const el = document.createElement("div"); el.className = "mp-pair";
        /* [S04] «Highlight only the matra strokes in red. Keep the dotted circle neutral.» */
        const strokes = !!CARD.chip_strokes && !_BELOW_MARKS.has(p.matra || "");   /* File3 look unless asked */
        el.innerHTML = '<span class="mp-letter">' + p.letter + "</span>" +
                       '<span class="mp-arrow">\u2192</span>' +
                       '<span class="mp-matra' + (strokes ? " mp-strokes" : "") + '">' +
                         matraGlyph(p.matra) + "</span>";
        row.appendChild(el);
        return el;
      });
      host.appendChild(row);

      /* "Keep the Next button disabled during the sequence. Activate it only after both pairs
         have been shown and spoken." */
      state.ownsAudio = true; state.demoRunning = true;
      if(typeof setSwMood === "function") setSwMood("teach");
      setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);

      let i = 0, finished = false;
      /* [r97] Yasir: "when the VO is finished both the letters should be enabled - currently when
         the first letter's VO finishes and the second's starts, the first gets disabled". So at the
         end BOTH pairs are lit (r-earlier: only the last, the first faded to 42 %). */
      const finish = ()=>{
        if(finished) return; finished = true;
        state.demoRunning = false;
        els.forEach((e, k) => {
          e.classList.add("active"); e.classList.remove("shown");
          e.querySelectorAll(".mp-arrow, .mp-matra").forEach(x => x.classList.add("mp-in"));
          const mm = e.querySelector(".mp-matra");
          if(mm) mm.classList.add("mp-hl");
          if(mm && mm.classList.contains("mp-strokes")) matraHLSoon(mm, pairs[k].matra, { glow:true });
        });
        setNavActive(true);
      };

      const step = ()=>{
        if(CARD.slides[state.idx] !== slide) return;      // navigated away -> drop the chain
        if(i >= els.length){ finish(); return; }
        const k = i, el = els[k], p = pairs[k]; i++;
        /* [r97] a pair already taught STAYS lit - it no longer fades when the next one arrives */

        /* 1 · the LETTER arrives on its own */
        el.classList.add("active");
        const arrow = el.querySelector(".mp-arrow"), m = el.querySelector(".mp-matra");

        /* 2 · then the matra lands beside it with the soft glow and a subtle chime */
        setTimeout(()=>{
          if(CARD.slides[state.idx] !== slide) return;
          arrow.classList.add("mp-in");
          m.classList.remove("mp-in"); void m.offsetWidth; m.classList.add("mp-in");
          sfxPopSoft();                                    // kept subtle so the VO stays clear
          /* 3 · the pair is lit, so now its line plays — "light up when its VO plays" */
          say(clip(p.audio), ()=> setTimeout(step, 560));
          /* 4 · AND THE MATRA LIGHTS UP ON THE WORDS THAT NAME IT. The line is «यह है उ। इसकी
             मात्रा है — ु।»: the first half names the LETTER, and lighting the matra there would
             point at the wrong mark while the right one is being spoken. `cue_ms` is where
             «इसकी» starts, measured off the clip itself at build time, so the two clips (4.13s
             and 3.85s) each get their own moment rather than sharing a guess. */
          const cue = Math.max(0, p.cue_ms || 1300);
          setTimeout(()=>{
            if(CARD.slides[state.idx] !== slide) return;   // navigated away mid-line
            if(!el.classList.contains("active")) return;   // a later pair already took the light
            m.classList.add("mp-hl");
            if(m.classList.contains("mp-strokes")) matraHLSoon(m, p.matra, { glow:true, pulse:true });
          }, cue);
        }, 480);
      };

      state.replayAudio = ()=> sayAll(
        [A(slide, "prompt")].concat(pairs.map(p => clip(p.audio))).filter(Boolean), ()=>{});
      say(A(slide, "prompt"), ()=> setTimeout(step, 350));
      /* FAIL-SAFE: आगे never stays dead if a clip blocks or is missing */
      setTimeout(()=>{ if(CARD.slides[state.idx] === slide) finish(); }, 30000);
    }
  };

  /* ================================================================ 7 · POEM_SEARCH */
  /* «मात्रा खोजो» — a poem card, a draggable magnifying glass that magnifies whatever word is
     under it, N sequential rounds over the same poem, and THE GHOST.
     data: { lines:[[word,…],…], rounds:[{matra, targets:[word,…]}] }
     The target list is authored per round and every word carrying an in-scope matra MUST be in
     one — a child who taps a correct word that is not listed would be marked wrong, which is
     how the sibling's poem screen was caught. The builder audits this.

     THE GHOST WAS SPECIFIED IN FULL BY THE SME AND WAS MISSING FROM THE FIRST BUILD. Their
     note is unusually precise about it, and about the fact that it is a GUIDE rather than
     decoration — the same note deletes the old scenic art ("Remove extra decorative elements
     like: Ravi, kite, girl, tree") and keeps only the poem card, the lens, the targets and the
     ghost. All seven behaviours they list are implemented below and labelled SME-GHOST:
        entry flight · idle cue · happy bounce · thinking face · 2nd-attempt drift to a real
        target · round-completion fly-across with a sparkle trail · final spin.
     It is drawn rather than generated art because it has to fly to an arbitrary word position
     and change expression; a PNG can do neither. */
  SlideModules.POEM_SEARCH = {
    mount(host, slide){
      const d = slide.data;
      newVoEpoch();          /* any chain still running from a previous mount is now stale */
      const wrap = document.createElement("div");
      wrap.className = "ps-stage";
      const card = document.createElement("div");
      card.className = "ps-card";
      d.lines.forEach(line => {
        const ln = document.createElement("div"); ln.className = "ps-line";
        line.forEach(w => {
          const sp = document.createElement("span");
          sp.className = "ps-w ink-glyph"; sp.textContent = w; sp.dataset.w = w;
          ln.appendChild(sp);
        });
        card.appendChild(ln);
      });
      wrap.appendChild(card);

      /* round progress: the SME wants no instruction TEXT, but with six words to find over two
         rounds and no counter a child cannot tell a round ended. Dots carry it without words. */
      const dots = document.createElement("div");
      dots.className = "ps-dots";
      card.appendChild(dots);
      const paintDots = ()=>{
        const r = d.rounds[Math.min(round, d.rounds.length - 1)];
        dots.innerHTML = r.targets.map((_, i) =>
          '<span class="ps-dot' + (i < found ? " on" : "") + '"></span>').join("");
      };

      const lens = document.createElement("div");
      lens.className = "ps-lens";
      lens.innerHTML = '<svg viewBox="0 0 90 90" width="90" height="90" aria-hidden="true">' +
        '<circle cx="36" cy="36" r="27" fill="rgba(191,227,255,.42)" stroke="#0B3D8C" stroke-width="6"/>' +
        '<rect x="56" y="56" width="28" height="11" rx="5" transform="rotate(45 56 56)" fill="#0B3D8C"/></svg>';
      wrap.appendChild(lens);

      /* ---- SME-GHOST: the character itself ---- */
      const ghost = document.createElement("div");
      ghost.className = "ps-ghost";
      ghost.innerHTML =
        '<svg viewBox="0 0 74 74" width="74" height="74" aria-hidden="true">' +
          '<path d="M10 40a27 27 0 0 1 54 0v24c0 3-3 4-5 2l-5-5-6 5c-2 2-4 2-6 0l-5-5-6 5c-2 2-4 2-6 0l-5-5-5 5c-2 2-5 1-5-2z" ' +
                'fill="#F3F8FF" stroke="#7FA8E8" stroke-width="3.5" stroke-linejoin="round"/>' +
          '<circle class="gh-eye" cx="28" cy="36" r="5" fill="#0B3D8C"/>' +
          '<circle class="gh-eye" cx="47" cy="36" r="5" fill="#0B3D8C"/>' +
          '<ellipse class="gh-mouth" cx="37" cy="49" rx="6" ry="4.5" fill="#0B3D8C"/>' +
        "</svg>";
      wrap.appendChild(ghost);
      host.appendChild(wrap);

      state.ownsAudio = true;
      setNavActive(false);
      let round = 0, found = 0;
      const words = [...card.querySelectorAll(".ps-w")];

      /* Move the ghost to a point in stage coordinates. The stage is the offset parent, so a
         plain translate is enough and the CSS transition does the flight. */
      const stageBox = ()=> wrap.getBoundingClientRect();
      function ghostTo(clientX, clientY, opts){
        const s = stageBox();
        const x = clientX - s.left - 37, y = clientY - s.top - 37;
        ghost.style.transform = "translate(" + x + "px," + y + "px)";
        ghost.classList.add("gh-on");
        if(opts && opts.dim) ghost.classList.add("gh-dim"); else ghost.classList.remove("gh-dim");
      }
      function ghostToEl(el, dy){
        const b = el.getBoundingClientRect();
        ghostTo(b.left + b.width / 2, b.top + (dy == null ? -14 : dy));
      }
      const ghostFace = (mood)=>{
        ghost.classList.toggle("gh-think", mood === "think");
        const mouth = ghost.querySelector(".gh-mouth");
        if(!mouth) return;
        if(mood === "happy"){ mouth.setAttribute("ry", "6"); mouth.setAttribute("rx", "7"); }
        else if(mood === "think"){ mouth.setAttribute("ry", "2"); mouth.setAttribute("rx", "4"); }
        else { mouth.setAttribute("ry", "4.5"); mouth.setAttribute("rx", "6"); }
      };
      function sparkleAt(el){
        const s = stageBox(), b = el.getBoundingClientRect();
        const sp = document.createElement("span");
        sp.className = "ps-spark"; sp.textContent = "✨";
        sp.style.left = (b.left - s.left + b.width / 2 - 8) + "px";
        sp.style.top  = (b.top  - s.top  - 14) + "px";
        wrap.appendChild(sp);
        setTimeout(()=> sp.remove(), 1400);
      }

      /* ---- SME-GHOST 1: entry. "a small ghost floats in from one side, briefly circles the
         magnifying glass, then fades slightly or moves to a corner." ---- */
      let idleTimer = null, lastAct = Date.now();
      function ghostEntry(){
        const lb = lens.getBoundingClientRect();
        ghostTo(lb.left - 130, lb.top + 10);
        setTimeout(()=> ghostTo(lb.left + lb.width / 2, lb.top - 44), 420);   // circle the lens
        setTimeout(()=> ghostTo(lb.left + lb.width + 6, lb.top + 30), 1180);
        setTimeout(()=>{ ghost.classList.add("gh-dim", "gh-float"); }, 1900);
      }
      /* ---- SME-GHOST 2: idle cue. "If the child is idle for a few seconds, the ghost appears
         near the magnifying glass and gently moves toward the poem." ---- */
      function bumpIdle(){ lastAct = Date.now(); }
      idleTimer = setInterval(()=>{
        if(state.locked) return;
        if(Date.now() - lastAct < 7000) return;
        const tgt = words.find(x => d.rounds[round].targets.indexOf(x.dataset.w) >= 0 &&
                                    !x.classList.contains("ps-hit"));
        ghost.classList.remove("gh-dim");
        if(tgt) ghostToEl(tgt, -40); else ghostToEl(card, -30);
        setTimeout(()=> ghost.classList.add("gh-dim"), 2200);
        bumpIdle();
      }, 2500);

      /* the word under the lens grows — this is HOW the child scans, not decoration */
      const magnify = ()=>{
        const r = lens.getBoundingClientRect();
        const cx = r.left + r.width * 0.40, cy = r.top + r.height * 0.40;
        words.forEach(w => {
          const b = w.getBoundingClientRect();
          const near = Math.hypot(b.left + b.width / 2 - cx, b.top + b.height / 2 - cy) < 78;
          w.classList.toggle("ps-mag", near && !w.classList.contains("ps-hit"));
        });
      };
      let lx = 0, ly = 0, drag = false, sx = 0, sy = 0;
      const sc = ()=> parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
      const down = e => { drag = true; const p = e.touches ? e.touches[0] : e; sx = p.clientX; sy = p.clientY; bumpIdle(); e.preventDefault(); };
      const move = e => { if(!drag) return; const p = e.touches ? e.touches[0] : e;
        lx += (p.clientX - sx) / sc(); ly += (p.clientY - sy) / sc(); sx = p.clientX; sy = p.clientY;
        lens.style.transform = "translate(" + lx + "px," + ly + "px)"; magnify(); bumpIdle(); e.preventDefault(); };
      const up = ()=> { drag = false; };
      lens.addEventListener("mousedown", down); lens.addEventListener("touchstart", down, {passive:false});
      document.addEventListener("mousemove", move); document.addEventListener("touchmove", move, {passive:false});
      document.addEventListener("mouseup", up); document.addEventListener("touchend", up);

      const startRound = ()=>{
        found = 0;
        paintDots();
        say(A(slide, "round" + (round + 1)), ()=>{});
      };
      const wrongCount = new Map();

      words.forEach(w => {
        w.onclick = ()=>{
          if(state.locked) return;
          bumpIdle();
          const r = d.rounds[round];
          if(w.classList.contains("ps-hit")) return;
          if(r.targets.indexOf(w.dataset.w) >= 0){
            w.classList.remove("ps-mag"); w.classList.add("ps-hit");
            /* the found word keeps its matra marked, so the poem becomes a record of the hunt */
            matraHLSoon(w, r.matra, { glow:true });
            if(typeof sfxTap === "function") sfxTap();
            found++;
            paintDots();
            /* ---- SME-GHOST 3: "Ghost pops up happily near the correct word. Small sparkle
               appears. Ghost can do a short happy bounce and disappear." ---- */
            ghost.classList.remove("gh-dim", "gh-float");
            ghostFace("happy"); ghostToEl(w, -46);
            sparkleAt(w); sfxSparkle();
            ghost.classList.remove("gh-bounce"); void ghost.offsetWidth;
            ghost.classList.add("gh-bounce");
            setTimeout(()=>{ ghostFace("idle"); ghost.classList.add("gh-dim", "gh-float"); }, 1300);
            SwiftPAL.emit("poem_word_found", { slide_id: slide.id, word: w.dataset.w, matra: r.matra });
            if(found >= r.targets.length){
              fbCorrect();
              if(typeof confettiCannon === "function") confettiCannon();
              card.classList.add("ps-round-done");
              setTimeout(()=> card.classList.remove("ps-round-done"), 900);
              /* ---- SME-GHOST 4: round completion. "Ghost flies across the selected words
                 with a sparkle trail." ---- */
              const hits = words.filter(x => r.targets.indexOf(x.dataset.w) >= 0);
              ghost.classList.remove("gh-dim");
              hits.forEach((h, k) => setTimeout(()=>{ ghostToEl(h, -44); sparkleAt(h); }, 260 + k * 420));
              round++;
              if(round >= d.rounds.length){
                state.locked = true;
                clearInterval(idleTimer);
                if(typeof setSwMood === "function") setSwMood("celebrate");
                /* ---- SME-GHOST 5: final. "Ghost appears once in the centre, celebrates with
                   a small spin/sparkle. Magnifying glass gives a final glow." ---- */
                setTimeout(()=>{
                  const cb = card.getBoundingClientRect();
                  ghostFace("happy");
                  ghostTo(cb.left + cb.width / 2, cb.top + cb.height / 2);
                  ghost.classList.remove("gh-float"); void ghost.offsetWidth;
                  ghost.classList.add("gh-spin");
                  lens.classList.add("ps-lens-done");
                  sfxSparkle();
                }, 260 + hits.length * 420);
                SwiftPAL.emit("poem_search_complete", { slide_id: slide.id, attempts: state.attempts });
                say(A(slide, "correct"), ()=>{ setNavActive(true);
                  $("navBtn").onclick = ()=> completeSlide(state.attempts === 0); });
              } else {
                setTimeout(startRound, 260 + hits.length * 420 + 400);
              }
            }
          } else {
            const n = (wrongCount.get(w) || 0) + 1; wrongCount.set(w, n);
            state.attempts++;
            fbWrong();
            w.classList.remove("ps-mag"); w.classList.add("ps-miss");
            setTimeout(()=> w.classList.remove("ps-miss"), 520);
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, word: w.dataset.w });
            if(state.attempts === 1){
              /* ---- SME-GHOST 6: 1st wrong. "Ghost briefly appears with a thinking
                 expression. No hand nudge." ---- */
              ghost.classList.remove("gh-dim");
              ghostFace("think"); ghostToEl(w, -44);
              setTimeout(()=>{ ghostFace("idle"); ghost.classList.add("gh-dim"); }, 1600);
              say(A(slide, "hint1"), ()=>{});
            } else {
              state.hintUsed = true;
              say(A(slide, "hint2") || A(slide, "hint"), ()=>{
                const r2 = d.rounds[round];
                const tgt = words.find(x => r2.targets.indexOf(x.dataset.w) >= 0 && !x.classList.contains("ps-hit"));
                /* ---- SME-GHOST 7: 2nd wrong. "Ghost floats toward one correct target word.
                   It gently points/pulses near that word. This acts as the hint instead of
                   adding extra text." The ghost is OURS and is not phase-gated, so it still
                   guides on this practice screen; the engine's HAND stays withheld here under
                   the [28f] ruling, and handOnAnswer() is what enforces that. ---- */
                if(tgt){
                  ghost.classList.remove("gh-dim");
                  ghostFace("idle"); ghostToEl(tgt, -46);
                  ghost.classList.remove("gh-bounce"); void ghost.offsetWidth;
                  ghost.classList.add("gh-bounce");
                  sparkleAt(tgt);
                  if(typeof handOnAnswer === "function") handOnAnswer(tgt, slide);
                }
              });
            }
          }
        };
      });

      paintDots();
      say(A(slide, "prompt"), startRound);
      requestAnimationFrame(()=>{ magnify(); ghostEntry(); });
    }
  };

  /* ================================================================ 9 · WORD_BUILD */
  /* ROUND 3 — this REPLACES the round-2 MATRA_FILL screen, and it is a different task, not a
     re-skin. MATRA_FILL dragged a bare matra (`ु`) into `प_ल`: the child supplied a mark. The
     SME's round-3 note asks for a word-completion train instead —

        "Each coach will contain an incomplete word with the first and last letters visible and a
         blank space in between … The child will look at the picture above the coach, understand
         the word, and drag the correct अक्षर option to complete the word."
        "Keep only the last letter visible inside each coach: _ल · _ल · _ई"

     — so the child now supplies a whole अक्षर (consonant + matra as one cluster), and the blank
     sits FIRST, ahead of the tail. That is a harder and more useful task: it makes them choose
     between पु and फू, which is exactly the ह्रस्व/दीर्घ confusion this skill exists to fix.

     MATRA_FILL is left registered and untouched — nothing else in this bundle mounts it, and the
     sibling lessons on this engine line must keep rendering byte-identically.

     data: { slots:[{word, tail, matra, img, emoji, correct_audio}],
             options:[{akshar, audio}] }
     A drop is judged by RECONSTRUCTING the word — `akshar + slot.tail === slot.word` — rather
     than by an index, so a distractor matches nothing by construction and the two ...ल coaches
     can never both accept the same tile. */
  SlideModules.WORD_BUILD = {
    mount(host, slide){
      const d = slide.data;
      newVoEpoch();          /* any chain still running from a previous mount is now stale */
      const train = buildTrain(host, {
        coaches: d.slots.length,
        /* SME: "Show related pictures above each coach" — the picture IS the question here, so
           it takes the label slot the other screens use for a matra name. */
        labels: d.slots.map(s => imgOrEmoji(s.img, s.emoji, "tr-slotpic", "tr-emoji")),
        bodies: d.slots.map((s, i) =>
          '<span class="tr-fill wb-fill" data-i="' + i + '">' +
            '<span class="tr-blank wb-blank dd-zone" data-idx="' + i + '"></span>' +
            '<span class="ink-glyph wb-tail">' + s.tail + "</span>" +
          "</span>"),
        dropZone: false
      });

      const tray = document.createElement("div");
      tray.className = "tr-tray wb-tray";
      /* SME: "Below the train, show draggable options: पु · फू · सु" plus 1–2 distractors.
         Shuffled, so the answer is never the n-th card two runs running. */
      dealt(d, d.options, slide.id + ":options").forEach(o => {      /* [r29] see the note on the sort tray */
        const t = document.createElement("div");
        t.className = "tr-card k-akshar";
        t.dataset.akshar = o.akshar;
        if(o.audio) t.dataset.audio = o.audio;
        if(o.matra) t.dataset.matra = o.matra;
        t.innerHTML = '<span class="wb-akshar ink-glyph">' + o.akshar + "</span>";
        tray.appendChild(t);
      });
      host.appendChild(tray);

      state.ownsAudio = true;
      state.replayAudio = ()=> say(A(slide, "prompt"), ()=>{});
      setNavActive(false);
      let done = 0;
      const perCard = new Map();
      /* [S04] WHO OWNS A MISS. «Keep a separate wrong-attempt counter for each correct अक्षर card
         … A wrong drop of नौ or कौ also counts as an attempt. Track these errors against the
         unfinished blank where the distractor was dropped. Switching between नौ and कौ must not
         reset that blank's distractor counter.» So a letter that completes some coach counts
         against itself; a letter that completes none counts against the blank it was dropped on. */
      const completesAny = (tile)=> d.slots.some(s => tile.dataset.akshar + s.tail === s.word);
      const wbKey = (tile, i)=> (d.h2_akshar && !completesAny(tile)) ? ("blank:" + i) : tile;

      /* RUNG 2, screen 6: "तीनों चित्रों के नाम एक-एक करके read out करें ... नाम बोलते समय वह
         चित्र glow करे और उसके डिब्बे की खाली जगह blink करे।" A coach whose blank is already
         filled is skipped - its name is no longer a question. */
      const wbDemo = (after)=> hintHold((fin)=> hintSeq(d.slots.map((sl, i)=> (next)=>{
        const c = train.coaches[i];
        const bl = c && c.body.querySelector(".wb-blank");
        if(!c || !bl || bl.classList.contains("filled")) return next();
        c.label.classList.add("wb-read");
        bl.classList.add("wb-blink");
        say(clip(sl.name_audio), ()=> setTimeout(()=>{
          c.label.classList.remove("wb-read");
          bl.classList.remove("wb-blink");
          next();
        }, 240));
      }), fin), after);

      /* Which coach is still waiting. Used for the पा case below - a blank that has been filled
         has had its whole holder replaced by the finished word, so "still has an empty .wb-blank"
         is the same question as "is still a question". */
      const firstEmpty = ()=> d.slots.findIndex((sl, k)=>{
        const c = train.coaches[k];
        const b = c && c.body.querySelector(".wb-blank");
        return !!b && !b.classList.contains("filled");
      });

      [...tray.children].forEach(tile => {
        /* SME: "Optional word support VO when a card is tapped: पु / फू / सु — This will help the
           child connect the picture, sound, and correct word formation." */
        tile.onclick = ()=>{ if(tile.dataset.audio && !isPlaying && !hintBusy
                              && !tile.classList.contains("snapped"))
          say(clip(tile.dataset.audio), ()=>{}); };

        makeDraggable(tile, (zone)=>{
          if(hintBusy) return;                      /* a demonstration is speaking */
          const blank = zone.closest(".wb-blank"); if(!blank) return;
          if(blank.classList.contains("filled")) return;
          const i = parseInt(blank.dataset.idx, 10);
          /* rung 3 has already named this letter's coach - see lockToBin's twin in TRAIN_SORT */
          if(tile.dataset.only != null && String(i) !== tile.dataset.only){
            tile.style.transform = "";
            tile.classList.remove("tr-cshake"); void tile.offsetWidth;
            tile.classList.add("tr-cshake");
            setTimeout(()=> tile.classList.remove("tr-cshake"), 560);
            return;
          }
          const slot = d.slots[i];
          tile.style.transform = "";
          if(tile.dataset.akshar + slot.tail === slot.word){
            /* silent if THIS letter or THIS blank has already been walked through Hint 3 */
            const quiet = Math.max(perCard.get(tile) || 0, perCard.get("blank:" + i) || 0) >= silentFrom();
            blank.classList.add("filled");
            blank.innerHTML = '<span class="ink-glyph wb-inakshar">' + tile.dataset.akshar + "</span>";
            /* the option is consumed — it belongs to exactly one coach */
            tile.classList.add("snapped", "wb-used");
            tile.classList.remove("tr-glow", "wb-callout");
            if(tile._guided){ tile._guided = false;
              [...tray.querySelectorAll(".tr-wait")].forEach(t => t.classList.remove("tr-wait"));
              [...host.querySelectorAll(".wb-pulse")].forEach(b => b.classList.remove("wb-pulse")); }
            closeGap(tile);                                /* [r96] its place folds away */
            /* SME: "Option snaps into the blank space. The complete word appears." The split form
               is replaced by the whole word a beat later so the child reads it as one word, with
               the matra they just supplied still marked. */
            const holder = blank.closest(".wb-fill");
            setTimeout(()=>{
              if(!holder || !holder.isConnected) return;
              holder.innerHTML = '<span class="ink-glyph tr-doneword">' + slot.word + "</span>";
              matraHLSoon(holder.querySelector(".tr-doneword"), slot.matra, { glow:true });
            }, 450);
            done++;
            train.correct(i);
            fbCorrect();
            SwiftPAL.emit("word_build_item", { slide_id: slide.id, word: slot.word });
            /* «शाबाश! पुल बन गया।» / «शाबाश! सुई बन गई।» — per slot, and SILENT if the child
               needed the whole ladder ("Correct Answer on 3rd Attempt … No VO required"). */
            const okvo = quiet ? null : slot.correct_audio;
            if(done >= d.slots.length){
              /* "No extra completion VO required." */
              sayOpt(clip(okvo), ()=> finishSlide(slide, train, true, "word_build_first_try"));
            } else {
              sayOpt(clip(okvo), ()=>{});
            }
          } else {
            const key = wbKey(tile, i);
            const n = (perCard.get(key) || 0) + 1; perCard.set(key, n);
            state.attempts++;
            fbWrong();
            if(typeof setSwMood === "function") setSwMood("tryagain");
            train.shake(i);
            /* "गलत डिब्बे में डाला गया अक्षर soft shake करके अपनी जगह वापस आ जाएगा।" */
            tile.style.transform = "";
            tile.classList.remove("tr-cshake"); void tile.offsetWidth;
            tile.classList.add("tr-cshake");
            setTimeout(()=> tile.classList.remove("tr-cshake"), 560);
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, attempts: state.attempts });
            if(n === 1){
              /* RUNG 1: "No hand nudge. Only VO." */
              say(A(slide, "hint1") || A(slide, "try_again"), ()=>{});
            } else if(n === 2 && hintLevels() >= 3){
              state.hintUsed = true;
              SwiftPAL.emit("hint_shown", { slide_id: slide.id, level: 2 });
              if(d.h2_akshar){
                /* [S04] «Read only the wrongly dropped अक्षर. Slightly enlarge that card and
                   highlight its matra … After the VO finishes, return the card to its normal size» */
                const ak = tile.querySelector(".wb-akshar");
                hintHold((fin)=>{
                  tile.classList.add("tr-h2big");
                  if(ak && tile.dataset.matra) matraHLSoon(ak, tile.dataset.matra, { glow:true, pulse:true });
                  sayAll([clip(tile.dataset.audio), A(slide, "hint2")].filter(Boolean), ()=>{
                    tile.classList.remove("tr-h2big");
                    if(ak) matraClear(ak);
                    fin();
                  });
                });
              } else {
                wbDemo(()=> say(A(slide, "hint2") || A(slide, "hint") || A(slide, "try_again"),
                                ()=>{}));
              }
            } else {
              state.hintUsed = true;
              SwiftPAL.emit("hint_shown", { slide_id: slide.id, level: 3 });
              /* THE HAND CARRIES A LETTER TO THE BLANK IT FILLS. Normally that is the tile the
                 child is holding. For पा there is no such blank - it completes nothing - and
                 Review-1 says what to do instead: "अगर बच्चा 'पा' डालता है, तो Hint 3 में अगले
                 खाली डिब्बे का सही अक्षर nudge होगा।" So the hand leaves the distractor alone and
                 travels from the letter that DOES fill the next empty coach, to that coach.
                 (r63 and earlier withheld the hand here, which left the one child who most needed
                 rung 3 with nothing but a glow.) */
              let want = d.slots.findIndex(s => tile.dataset.akshar + s.tail === s.word);
              let from = tile;
              /* [S04] «After the third distractor error for a blank, reveal the correct अक्षर for
                 that blank» - the blank it was dropped on, not the first empty one */
              if(want < 0 && d.h2_akshar){
                want = i;
                const sl = d.slots[i];
                from = [...tray.children].find(t => !t.classList.contains("snapped")
                              && t.dataset.akshar + sl.tail === sl.word) || null;
              } else if(want < 0){
                want = firstEmpty();
                const sl = want >= 0 ? d.slots[want] : null;
                from = sl ? [...tray.children].find(t => !t.classList.contains("snapped")
                              && t.dataset.akshar + sl.tail === sl.word) : null;
              }
              const at = want >= 0 ? want : i;
              const bl = train.coaches[at].body.querySelector(".wb-blank");
              /* the letter now goes to that blank and nowhere else */
              if(from && want >= 0) from.dataset.only = String(want);
              withHand3(()=> train.nudgeTo(at, (want >= 0 ? from : null), slide,
                                           (want >= 0 ? bl : null)));
              if(bl && want >= 0) bl.classList.add("wb-pulse");
              if(from && from !== tile) from.classList.add("wb-callout");
              /* [S04] «Give the correct अक्षर and its matching blank a soft glow. Temporarily lock
                 all other options and destinations.» */
              if(d.h2_akshar && from){
                from.classList.add("tr-glow"); from._guided = true;
                [...tray.children].forEach(t => { if(t !== from && !t.classList.contains("snapped"))
                  t.classList.add("tr-wait"); });
              }
              const sl3 = want >= 0 ? d.slots[want] : null;
              say(clip(sl3 && sl3.hint3_audio) || A(slide, "hint3") || A(slide, "hint2")
                  || A(slide, "hint") || A(slide, "try_again"), ()=>{});
            }
          }
        }, { onPick: ()=>{ if(typeof sfxTap === "function") sfxTap(); } });
      });

      /* SME's entry order: "Train enters from right to left and stops at the centre. Picture cards
         appear first. Incomplete words appear inside the coaches. Options slide up from the
         bottom." Settled by default (engine fact 1) — these classes only drive the stagger, so a
         frozen capture shows the finished screen. */
      requestAnimationFrame(()=>{
        train.coaches.forEach((c, i) => {
          c.label.style.setProperty("--tr-lbl-delay", (260 + i * 220) + "ms");
          c.label.classList.add("tr-lblseq");
          c.body.style.setProperty("--tr-lbl-delay", (900 + i * 200) + "ms");
          c.body.classList.add("tr-bodyseq");
        });
        tray.classList.add("wb-trayin");
      });
      train.whenParked(()=> say(A(slide, "prompt"), ()=>{}));
    }
  };

  /* ================================================================ 10 · SENTENCE_COMPLETE */
  /* ROUND 3 — a new module, four instances. It REPLACES the round-2 POEM_SEARCH screen (the poem
     was ours, not the SME's) and adds three more beside it. Laid out from the SME's own mockup,
     `2_MOCKUPS/slide15_sentence_complete_ALL_FOUR.png`: heading band, a large scene illustration
     on one side, the sentence with a dashed blank on the other, three picture option cards under
     the sentence, आगे below.

     WHY THIS IS THE RIGHT LAST BEAT. Every other screen in the lesson asks "which matra is in
     this word". This one asks the child to USE such a word in a meaning — the SME's words, "how
     मात्रा वाले शब्द are used in meaningful sentences". It is the only screen where the matra is
     not the visible question, which is what makes it a test of reading rather than of spotting.

     A TAP IS THE ANSWER, and it is also how the child READS the option: the note says "When an
     option is tapped, play the word VO", so the word is spoken first and the judgement follows on
     that clip ending. A pre-reader who cannot decode खुश can still hear it and decide.

     data: { scene_img, scene_emoji, sentence_pre, sentence_post, answer,
             options:[{word, img, emoji, audio}] } */
  /* ================================================================ · MINI_GAME */
  /* [r36] A whole second game, dropped into the lesson as one more screen.
     मात्रा रनर is a complete 16:9 canvas app with its own dark theme, its own HUD, its own
     start and end cards and its own key and pointer handling. It is mounted in an IFRAME rather
     than inlined, and that is a deliberate choice, not the lazy one:

       · its stylesheet opens with `html,body{height:100%;overflow:hidden}` and a [data-theme]
         block. Poured into a document that already carries 2000 lines of lesson CSS, those would
         fight - and the failure would be cosmetic, intermittent and awful to chase.
       · it runs its own requestAnimationFrame loop and binds keydown on the document. An
         iframe is torn down with the slide; inlined, both would have to be unwound by hand on
         every navigation, and anything missed would keep running under the next screen.
       · the lesson stage is 1333x750, which IS 16:9 - so the game fills the slide exactly and
         needs no letterboxing.

     The two talk through postMessage and nothing else. The game keeps working when opened on its
     own, which is what makes it safe to embed: nothing here reaches into it. */
/* ==== MATRA-RUNNER EMBED BEGIN ==== */
  /* GENERATED by 1_SPEC/embed_matra_runner.py - do not hand-edit.
     The whole of मात्रा रनर, folded into the engine: its markup, and its script
     wrapped so the lesson can start and stop it. Re-run that script to refresh. */
  const MATRA_RUNNER_HTML = "<div class=\"rotate\">फ़ोन को घुमाएँ</div>\n<div id=\"mrStage\">\n  <canvas id=\"game\"></canvas>\n\n  <div class=\"pads\">\n    <div class=\"pad\" data-dir=\"-1\"></div>\n    <div class=\"pad\" data-dir=\"1\"></div>\n  </div>\n\n  <div class=\"hud\">\n    <div class=\"hud-top\">\n      <div class=\"pill\" id=\"lvlNum\">1</div>\n      <div class=\"pips\" id=\"pips\"></div>\n      <div class=\"matra u\" id=\"matraChip\"><em>उ</em><span>ु</span></div>\n      <div class=\"hearts\" id=\"hearts\">❤❤❤</div>\n    </div>\n    <div class=\"hud-bottom\">\n      <div class=\"pill\" id=\"score\">0</div>\n    </div>\n  </div>\n\n  <div class=\"arrows\">\n    <button class=\"arrow\" data-dir=\"-1\" aria-label=\"बाएँ जाएँ\">◀</button>\n    <button class=\"arrow\" data-dir=\"1\" aria-label=\"दाएँ जाएँ\">▶</button>\n  </div>\n\n  <!-- no start card: the game begins as the screen arrives -->\n\n  <!-- level done -->\n  <div class=\"screen\" id=\"scLevel\">\n    <div class=\"card\">\n      <h2 id=\"lvlTitle\">स्तर पूरा</h2>\n      <div class=\"stars\" id=\"lvlStars\">★★★</div>\n      <p class=\"nextup\" id=\"lvlNext\"></p>\n    </div>\n  </div>\n\n  <!-- game over -->\n  <div class=\"screen\" id=\"scOver\">\n    <div class=\"card\">\n      <h2>फिर से कोशिश करो</h2>\n      <p id=\"overTip\"></p>\n\n    </div>\n  </div>\n\n  <!-- win -->\n  <div class=\"screen\" id=\"scWin\">\n    <div class=\"card\">\n      <h1>शाबाश!</h1>\n      <p>सारे द्वार पार हो गए।</p>\n    </div>\n  </div>\n</div>\n\n\n\n<!-- ============================ lesson bridge ============================\n     [r36] This file is still a complete, standalone game: open index.html on its own and\n     NOTHING below runs, because it all sits behind `window.parent === window`. It only wakes up\n     when the lesson embeds it, and then it does two things and no more:\n       · gives the child a way onward that is always on screen, so a mini-game with no natural\n         end can never become a dead end inside a lesson that has no आगे button\n       · tells the lesson when the game was won or lost, so the lesson can react\n     Nothing in the game's own code is touched - the bridge only listens to it.\n     ===================================================================== -->";
  function bootMatraRunner(){
    var _dead = false, _ls = [], _raf = 0;
    function MR_ON(t, e, f, o){ t.addEventListener(e, f, o); _ls.push([t, e, f, o]); }
    function MR_RAF(fn){ if(_dead) return 0; _raf = requestAnimationFrame(fn); return _raf; }
    try {

(function(){
"use strict";

/* ======================= शब्द भंडार (word bank) ======================= */
const U  = "\u0941";            // ु  chhoti u
const UU = "\u0942";            // ू  badi uu

const POOL_U = [["पुल","pul"],["गुड़","gud"],["सुख","sukh"],["चुप","chup"],["तुम","tum"],
  ["मधु","madhu"],["सुई","sui"],["कुत्ता","kutta"],["गुलाब","gulab"],["सुबह","subah"],
  ["दुकान","dukan"],["मुकुट","mukut"],["गुड़िया","gudiya"],["जामुन","jamun"],["बुलबुल","bulbul"],
  ["कुर्सी","kursi"],["पुस्तक","pustak"],["चुहिया","chuhiya"],["मुरली","murli"],["बुढ़िया","budhiya"],
  ["सुराही","surahi"],["कुल्हाड़ी","kulhadi"]];

const POOL_UU = [["फूल","phool"],["झूला","jhoola"],["दूध","doodh"],["सूरज","sooraj"],["मूली","mooli"],
  ["चूहा","chooha"],["जूता","joota"],["भालू","bhaloo"],["कबूतर","kabootar"],["आलू","aaloo"],
  ["चाकू","chaakoo"],["धूप","dhoop"],["चूड़ी","choodi"],["झूठ","jhooth"],["पूजा","pooja"],
  ["कूड़ा","kooda"],["भूख","bhookh"],["अंगूर","angoor"],["तरबूज","tarbooj"],["नींबू","neemboo"],
  ["काजू","kaaju"],["तराजू","taraaju"],["लट्टू","lattoo"],["बंदूक","bandook"]];

const hasU  = w => w.indexOf(U)  >= 0;
const hasUU = w => w.indexOf(UU) >= 0;
const ONLY_U  = POOL_U.filter(w=>hasU(w[0])  && !hasUU(w[0]));
const ONLY_UU = POOL_UU.filter(w=>hasUU(w[0]) && !hasU(w[0]));

/* [r80] CACHE-BUST THE GAME'S SOUNDS, as the lesson does its own (__AUDIO_V). The deployment
   serves assets/ as immutable for a year, and a re-recorded clip keeps its filename - so a browser
   that had heard the old goal_u.ogg would go on playing it after every redeploy. The lesson build
   stamps this from the CONTENT of the game's voice, music and feedback files, so it moves exactly
   when one of them changes. Opened on its own the game keeps the placeholder, which is harmless. */
const MR_AV = "__MR_AUDIO_V_STAMP__";
const mrv = u => u + "?v=" + MR_AV;
/* बोली जाने वाली पंक्तियाँ — assets/MatraRunner/voice/<id>.ogg */
/* [r76] the lesson's आप register, as the recordings now speak it (the SME's round-3 rule: the
   lesson build fails any clip with a तुम form, and these only escaped because they had never been
   recorded). This text is what the device's own TTS reads if a recording is ever missing. */
const LINES = {
  goal_u   : "छोटी उ की मात्रा वाले शब्द पकड़िए।",
  goal_uu  : "बड़ी ऊ की मात्रा वाले शब्द पकड़िए।",
  level_next:"वाह! अब इस लेवल को पार कीजिए।",       /* [r77] between levels, with the next goal */
  right    : "शाबाश!",
  wrong    : "फिर से देखिए।",
  correct_is:"सही शब्द है",
  level_up : "बहुत बढ़िया!",
  retry    : "कोई बात नहीं, फिर से कोशिश कीजिए।",
  win      : "शाबाश, सारे द्वार पार हो गए!"
};

/* ======================= स्तर (levels) ======================= */
const LEVELS = [
  /* [r96] names are shown on screen - «छोटी» / «बड़ी» only in the VO */
  {name:"ऊ",  target:UU, gates:6, speed:0.155, easy:true },
  {name:"उ",  target:U,  gates:6, speed:0.170, easy:true }
];

/* ======================= canvas setup ======================= */
const cvs = document.getElementById("game");
const ctx = cvs.getContext("2d");
let W=0,H=0,S=1,DPR=1;
function resize(){
  const r = cvs.getBoundingClientRect();
  DPR = Math.min(2, window.devicePixelRatio||1);
  W = Math.max(280, r.width); H = Math.max(320, r.height);
  cvs.width = Math.round(W*DPR); cvs.height = Math.round(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  S = Math.min(H/700, W/520);              // art unit
  buildBackdrop();
}
MR_ON(window, "resize", resize);

/* perspective */
const K = 3.15;
const horizonY = () => H*0.355;
const groundY  = () => H*0.905;
function proj(z){
  const p = 1/(1+z*K);
  return {p, y: horizonY() + (groundY()-horizonY())*p};
}
const LANES = 2;
const LANE_W = () => W*0.30;                 // gap between the two gates
/* [r68] THE BRIDGE is on when its three parts have loaded. The deck is a little broader than the
   old road (1.22 against 1.08 lane-widths either side of centre) - Yasir asked for a broader path,
   and a parapet needs a hand's width of stone between it and the portals or they look jammed in. */
const bridgeOn = () => !!(window.MR_ART && MR_ART.has("deck") && MR_ART.has("post") && MR_ART.has("wall"));
const roadHalf = () => bridgeOn() ? 1.22 : 1.08;

/* [r47] THE CAMERA. It trails the runner sideways by a third of her lane offset, which is what
   stops a lane change from looking like a sprite sliding across a still picture: the whole
   world swings the other way, and because a world offset is scaled by depth on its way to the
   screen, near things swing a long way and far things hardly move. She still visibly crosses
   the track, because the camera only takes a third of it. */
const CAM_FOLLOW = 0.34;
const camLane = () => (G.laneF - 0.5) * CAM_FOLLOW;
/* laneOff is in LANES from the centre of the track; p is the depth foreshortening. Everything
   that stands in the world goes through here, so the camera exists in exactly one place. */
const worldX = (laneOff, p) => W/2 + (laneOff - camLane())*LANE_W()*p;
const laneX = (lane,p) => worldX(lane-0.5, p);

/* ======================= state ======================= */
const G = {
  mode:"menu", level:0, score:0, hearts:3, hold:false, ramp:1, holdT:0, nextT:0, deadT:0,
  lane:0, laneF:0, targetLane:0,        // 0 = बायाँ द्वार, 1 = दायाँ द्वार
  gates:[], coins:[], decor:[], rails:[], parts:[], pops:[], pips:[], ground:0,
  cleared:0, right:0, wrong:0, missedWords:[], usedWords:[],
  speed:0.3, target:U, shake:0, flash:0, flashCol:"#fff",
  t:0, dashT:0, best:0, banner:null
};

/* storage */
try{ const b = localStorage.getItem("matraRunnerBest"); if(b) G.best = parseInt(b,10)||0; }catch(e){}
function saveBest(){ try{ localStorage.setItem("matraRunnerBest", String(G.best)); }catch(e){} }

/* ======================= आवाज़ (sfx + voiceover) =======================
   मोड: 2 = आवाज़ + शब्द बोलना, 1 = सिर्फ़ आवाज़, 0 = बंद
   हर शब्द पहले assets/MatraRunner/voice/<id>.ogg से बजता है।
   फ़ाइल न मिले तो डिवाइस की हिंदी आवाज़ (Web Speech) से बोला जाता है। */
let AC=null, MASTER=null, MUSBUS=null, SFXBUS=null, NOISE=null;

function audioReady(){
  if(VOICE.mode < 1) return null;
  try{
    if(!AC){
      AC = new (window.AudioContext||window.webkitAudioContext)();
      MASTER = AC.createGain(); MASTER.gain.value = 0.9; MASTER.connect(AC.destination);
      MUSBUS = AC.createGain(); MUSBUS.gain.value = 0.0; MUSBUS.connect(MASTER);
      SFXBUS = AC.createGain(); SFXBUS.gain.value = 1.0; SFXBUS.connect(MASTER);
      /* one second of noise, made once and re-used: the attack transient of every note */
      const n = AC.sampleRate|0;
      NOISE = AC.createBuffer(1, n, AC.sampleRate);
      const d = NOISE.getChannelData(0);
      for(let i=0;i<n;i++) d[i] = Math.random()*2-1;
    }
    if(AC.state === "suspended") AC.resume();
    loadFb();
    return AC;
  }catch(e){ return null; }
}

/* ONE NOTE. Two detuned oscillators through a filter that opens on the attack and closes as it
   decays, with a noise transient on the front. The filter sweep is what separates a plucked
   note from a held tone, and the transient is what makes it sound struck. */
function note(o){
  const ac = audioReady(); if(!ac) return;
  const t0 = ac.currentTime + (o.at||0);
  const dur = o.dur||0.4, f = o.f, bus = o.bus || SFXBUS;
  const g = ac.createGain();
  const lp = ac.createBiquadFilter(); lp.type="lowpass";
  lp.frequency.setValueAtTime(Math.min(12000, f*(o.open||7)), t0);
  lp.frequency.exponentialRampToValueAtTime(Math.max(180, f*1.2), t0+dur*0.9);
  lp.Q.value = o.q || 1;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol||0.18, t0 + (o.atk||0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  lp.connect(g).connect(bus);
  [0, o.detune||6].forEach(function(dt, k){
    const osc = ac.createOscillator();
    osc.type = o.type || "triangle";
    osc.frequency.setValueAtTime(f, t0);
    if(o.glide) osc.frequency.exponentialRampToValueAtTime(o.glide, t0+dur*0.8);
    osc.detune.value = dt;
    const og = ac.createGain(); og.gain.value = k ? 0.5 : 1;
    osc.connect(og).connect(lp);
    osc.start(t0); osc.stop(t0+dur+0.03);
  });
  if(o.tick){
    const src = ac.createBufferSource(); src.buffer = NOISE; src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value = f*3; bp.Q.value=1.2;
    const ng = ac.createGain();
    ng.gain.setValueAtTime((o.vol||0.18)*o.tick, t0);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0+0.05);
    src.connect(bp).connect(ng).connect(bus);
    src.start(t0); src.stop(t0+0.08);
  }
}

/* a swept band of noise - wind, shimmer, a thing breaking open */
function whoosh(o){
  const ac = audioReady(); if(!ac) return;
  const t0 = ac.currentTime + (o.at||0), dur = o.dur||0.5;
  const src = ac.createBufferSource(); src.buffer = NOISE; src.loop = true;
  const bp = ac.createBiquadFilter(); bp.type="bandpass"; bp.Q.value = o.q||2.5;
  bp.frequency.setValueAtTime(o.from||400, t0);
  bp.frequency.exponentialRampToValueAtTime(o.to||3000, t0+dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol||0.12, t0+0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  src.connect(bp).connect(g).connect(o.bus||SFXBUS);
  src.start(t0); src.stop(t0+dur+0.05);
}

/* ---------- the cues ---------- */
const A4=440, sc = n => A4*Math.pow(2,(n-9)/12);       /* semitones from C */
/* [r73] Yasir's feedback sounds, decoded once into buffers and played through the effects bus,
   so they duck the music like every other effect. The synthesised cues stay as the fallback. */
const FB = { correct:null, incorrect:null, asked:false, bad:{}, el:{} };
function loadFb(){
  if(FB.asked || !AC) return; FB.asked = true;
  /* [r78] as a file: one warmed <audio> element each, cloned per play so two can overlap */
  ["correct", "incorrect"].forEach(k => { FB.el[k] = new Audio(mrv("assets/Audio/sfx_fb_" + k + ".ogg"));
    FB.el[k].preload = "auto"; });
  if(LOCAL) return;
  [["correct", mrv("assets/Audio/sfx_fb_correct.ogg")], ["incorrect", mrv("assets/Audio/sfx_fb_incorrect.ogg")]]
    .forEach(([k, u]) => fetch(u).then(r => { if(!r.ok) throw 0; return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => AC.decodeAudioData(ab, res, rej)))
      .then(b => { FB[k] = b; }).catch(()=>{ FB.bad[k] = true; }));
}
function playFb(k, vol){
  const ac = audioReady(); if(!ac) return false;
  loadFb();
  const b = FB[k];
  if(!b){
    if(!(LOCAL || FB.bad[k]) || !FB.el[k]) return false;       /* still loading: the synth cue */
    try{ const a = FB.el[k].cloneNode(); a.volume = Math.min(1, vol * 0.9);
      const p = a.play(); if(p && p.catch) p.catch(()=>{}); }catch(e){ return false; }
    MUSIC.sfxDuck(0.9);
    return true;
  }
  const src = ac.createBufferSource(), g = ac.createGain();
  g.gain.value = vol; src.buffer = b; src.connect(g); g.connect(SFXBUS); src.start();
  MUSIC.sfxDuck(b.duration);
  return true;
}
const sfxRight = ()=>{ if(playFb("correct", 0.85)) return; MUSIC.sfxDuck(0.55);                                  /* up the pentatonic, and a shimmer */
  [0,4,7,12].forEach((n,i)=> note({f:sc(n+12), at:i*0.055, dur:.42, vol:.17, tick:.5, open:9}));
  whoosh({from:1800, to:6500, dur:.5, vol:.055, q:1.4});
};
const sfxWrong = ()=>{ if(playFb("incorrect", 0.85)) return; MUSIC.sfxDuck(0.45);                                  /* a soft thud that falls, not a buzzer */
  note({f:196, glide:132, dur:.34, vol:.16, type:"sine", open:3, tick:.35});
  note({f:98,  glide:66,  dur:.4,  vol:.12, type:"sine", open:2, at:.02});
};
const sfxCoin  = ()=>{ MUSIC.sfxDuck(0.22); note({f:sc(24), dur:.18, vol:.10, tick:.6, open:12});
                       note({f:sc(31), at:.05, dur:.22, vol:.07, open:12}); };
const sfxLevel = ()=>{ MUSIC.sfxDuck(1.00); [0,4,7,12,16].forEach((n,i)=>
                         note({f:sc(n+12), at:i*0.1, dur:.55, vol:.16, tick:.4, open:9}));
                       whoosh({from:900, to:7000, dur:.9, vol:.05, q:1.2}); };
/* the gate coming apart: a bright shatter over a low body hit */
const sfxGate  = (ok)=>{ MUSIC.sfxDuck(0.5);
  if(ok){
    whoosh({from:2600, to:9000, dur:.42, vol:.10, q:1.1});
    [0,7,12,19].forEach((n,i)=> note({f:sc(n+24), at:i*0.03, dur:.3, vol:.09, open:14}));
  }else{
    whoosh({from:900, to:260, dur:.34, vol:.09, q:1.8});
    note({f:110, glide:78, dur:.3, vol:.13, type:"sine", open:2});
  }
};

/* [r71] THE CARTOON PRATFALL. Three sounds every child knows from cartoons, built from raw
   oscillators so they cost no files:
     bonk   - a hollow wooden knock: two partials that drop in pitch as they die, and a click
     whistle- a slide whistle falling two and a half octaves, with a wobble on it
     boing  - a spring: a low tone whose pitch is shaken by a fast wobble that dies away */
function _osc(type, f, t0, dur, vol, bus){
  const ac = AC, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.connect(bus || SFXBUS); o.connect(g);
  o.start(t0); o.stop(t0 + dur + 0.05);
  return { o, g };
}
const sfxBonk = ()=>{
  const ac = audioReady(); if(!ac) return; MUSIC.sfxDuck(0.35);
  const t = ac.currentTime + 0.005;
  [[330, 170, 0.20, 0.34], [820, 520, 0.07, 0.16]].forEach(([f0, f1, d, v])=>{
    const n = _osc("sine", f0, t, d + 0.05, v);
    n.o.frequency.exponentialRampToValueAtTime(f1, t + d);
    n.g.gain.exponentialRampToValueAtTime(v, t + 0.003);
    n.g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.04);
  });
  whoosh({ from:2500, to:4200, dur:.03, vol:.12, q:1.2 });          /* the click of the knock */
};
const sfxSlideWhistle = (at)=>{
  const ac = audioReady(); if(!ac) return;
  const t = ac.currentTime + (at || 0), dur = 0.85; MUSIC.sfxDuck((at || 0) + dur + 0.1);
  const n = _osc("sine", 1650, t, dur, 0.16);
  n.o.frequency.exponentialRampToValueAtTime(260, t + dur);
  const lfo = ac.createOscillator(), lg = ac.createGain();         /* the player's wobbly breath */
  lfo.frequency.value = 7; lg.gain.value = 28; lfo.connect(lg); lg.connect(n.o.detune);
  lfo.start(t); lfo.stop(t + dur + 0.05);
  n.g.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
  n.g.gain.setValueAtTime(0.16, t + dur - 0.12);
  n.g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const h = _osc("triangle", 3300, t, dur, 0.03);                   /* a breath of edge on top */
  h.o.frequency.exponentialRampToValueAtTime(520, t + dur);
  h.g.gain.exponentialRampToValueAtTime(0.03, t + 0.03);
  h.g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
};
const sfxBoing = (at)=>{
  const ac = audioReady(); if(!ac) return;
  const t = ac.currentTime + (at || 0), dur = 0.6; MUSIC.sfxDuck((at || 0) + dur);
  const n = _osc("triangle", 150, t, dur, 0.3);
  n.o.frequency.linearRampToValueAtTime(240, t + dur * 0.5);
  const lfo = ac.createOscillator(), lg = ac.createGain();         /* the spring's shake, dying */
  lfo.frequency.value = 17; lfo.connect(lg); lg.connect(n.o.frequency);
  lg.gain.setValueAtTime(70, t); lg.gain.exponentialRampToValueAtTime(2, t + dur);
  lfo.start(t); lfo.stop(t + dur + 0.05);
  n.g.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
  n.g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
};

/* ---------- the bed ---------- *
   Four bars, C major pentatonic. Scheduled a bar ahead against the audio clock: setTimeout
   drifts with the frame rate and a bed that stutters is worse than no bed at all. */
/* [r70] the rendered track: see the header of this change in CHANGES_HINTS.md (r70) */
/* [r78] OPENED AS A FILE (double-clicked, file://) the browser refuses fetch() of every local file,
   so the decoded-buffer route this game used for its voice, music and feedback sounds got nothing
   at all: the voice fell through to the device's TTS - which on Windows has no Hindi voice, i.e.
   silence - the music to the synthesised bed and the feedback to synthesised tones. The lesson's
   own player has always fallen back to an <audio> element there; the game now does the same. */
const LOCAL = location.protocol === "file:";
const BGM = { url:mrv("assets/MatraRunner/bgm_game.ogg"), buf:null, loading:false, failed:false,
              src:null, gain:null, el:null, sync:0 };
function loadBgm(){
  if(LOCAL){ if(MUSIC.on) MUSIC.playEl(); return; }
  if(BGM.buf || BGM.loading || BGM.failed || !AC) return;
  BGM.loading = true;
  fetch(BGM.url).then(r => { if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(ab => new Promise((res, rej) => AC.decodeAudioData(ab, res, rej)))
    .then(b => { BGM.buf = b; BGM.loading = false; if(MUSIC.on) MUSIC.playFile(); })
    .catch(() => { BGM.loading = false; BGM.failed = true; if(MUSIC.on) MUSIC.playEl(); });
}
const MUSIC = {
  on:false, next:0, bar:0, tmr:0, file:false,
  BPM:96,
  LEVEL:0.16, DUCK:0.045, SFXDUCK:0.08,   /* the synth bed's levels; the file sets its own */
  _claims:{}, _sfxUntil:0, _sfxT:0,
  /* [r71] ONE PLACE DECIDES THE LEVEL. Each voice source claims the duck under its own name, so
     one finishing cannot lift the music while another is still speaking; effects claim it for
     their length. */
  target(){
    if(!AC) return this.LEVEL;
    for(const k in this._claims) if(this._claims[k]) return this.DUCK;
    return AC.currentTime < this._sfxUntil ? this.SFXDUCK : this.LEVEL;
  },
  apply(tc){
    if(!AC || !MUSBUS || !this.on) return;
    const v = this.target(), now = AC.currentTime;
    MUSBUS.gain.cancelScheduledValues(now);
    MUSBUS.gain.setTargetAtTime(v, now, tc || (v < this.LEVEL ? 0.08 : 0.45));
  },
  setDuck(src, on){ this._claims[src] = !!on; this.apply(); },
  sfxDuck(sec){
    if(!AC) return;
    this._sfxUntil = Math.max(this._sfxUntil, AC.currentTime + sec);
    this.apply(0.04);
    clearTimeout(this._sfxT);
    this._sfxT = setTimeout(()=> this.apply(), sec * 1000 + 30);
  },
  pad: [[0,7,16],[ -3,4,12],[ -5,2,9],[ -1,4,11]],       /* one chord a bar */
  fig: [0,7,12,7,4,12,16,12],                             /* eighths over it */
  start(){
    const ac = audioReady(); if(!ac || this.on) return;
    this.on = true; this.bar = 0; this.next = ac.currentTime + 0.12;
    MUSBUS.gain.cancelScheduledValues(ac.currentTime);
    MUSBUS.gain.setValueAtTime(0.0001, ac.currentTime);
    if(BGM.buf){ this.playFile(); return; }
    if(LOCAL || BGM.failed){ this.playEl(); return; }
    MUSBUS.gain.exponentialRampToValueAtTime(Math.max(0.001, this.target()), ac.currentTime + 2.2);
    loadBgm();                                    /* the bed covers the wait */
    this.tick();
    this.tmr = setInterval(()=>this.tick(), 220);
  },
  /* the track, looped on the audio clock through its own gain into the music bus */
  playFile(){
    const ac = AC; if(!ac || !BGM.buf || this.file) return;
    /* Yasir: "60% isn't enough make it 80%"; still a quarter under speech, half under an effect */
    this.file = true; this.LEVEL = 0.80; this.DUCK = 0.20; this.SFXDUCK = 0.40;
    clearInterval(this.tmr); this.tmr = 0;         /* the bed schedules no new bars */
    const t = ac.currentTime;
    BGM.gain = ac.createGain(); BGM.gain.gain.setValueAtTime(0.0001, t);
    BGM.gain.gain.exponentialRampToValueAtTime(1.0, t + 1.2);
    BGM.gain.connect(MUSBUS);
    const src = ac.createBufferSource(); src.buffer = BGM.buf; src.loop = true;
    src.connect(BGM.gain); src.start(t + 0.02); BGM.src = src;
    this.apply(0.4);                               /* whatever is speaking right now still wins */
  },
  /* [r78] the track as an <audio> element (see LOCAL). It cannot go through the music bus - an
     element on a file:// is cross-origin to Web Audio and would play silence - so its volume is
     set from the bus 25 times a second instead: the same 80 %, the same fade-in, the same duck
     under every voice and effect. */
  playEl(){
    if(this.file || !AC || !MUSBUS) return;
    this.file = true; this.LEVEL = 0.80; this.DUCK = 0.20; this.SFXDUCK = 0.40;
    clearInterval(this.tmr); this.tmr = 0;
    if(!BGM.el){ BGM.el = new Audio(BGM.url); BGM.el.loop = true; BGM.el.preload = "auto"; }
    const el = BGM.el; el.volume = 0;
    clearInterval(BGM.sync);
    BGM.sync = setInterval(()=>{
      try{ el.volume = Math.max(0, Math.min(1, MUSBUS.gain.value * MASTER.gain.value)); }catch(e){}
    }, 40);
    try{ const p = el.play(); if(p && p.catch) p.catch(()=>{}); }catch(e){}
    this.apply(0.4);
  },
  stop(){
    this.on = false; clearInterval(this.tmr); this.tmr = 0;
    if(BGM.el){ const el = BGM.el;
      setTimeout(()=>{ if(!MUSIC.on){ clearInterval(BGM.sync); try{ el.pause(); }catch(e){} } }, 450); }
    if(AC && MUSBUS){
      MUSBUS.gain.cancelScheduledValues(AC.currentTime);
      MUSBUS.gain.setTargetAtTime(0.0001, AC.currentTime, 0.25);
    }
    /* the track stops after the fade, and a fresh one starts next time */
    if(BGM.src){ const s0 = BGM.src, g0 = BGM.gain; BGM.src = null; BGM.gain = null;
      try{ s0.stop((AC ? AC.currentTime : 0) + 1.2); }catch(e){}
      setTimeout(()=>{ try{ g0.disconnect(); }catch(e){} }, 1500); }
    this.file = false;
  },
  /* down while a word is being spoken, back up after - the lesson's voice comes first */
  duck(on){ this.setDuck("voice", on); },       /* the game's own voice - see setDuck */
  tick(){
    const ac = AC; if(!ac || !this.on) return;
    const beat = 60/this.BPM, barLen = beat*4;
    while(this.next < ac.currentTime + 1.2){
      const t = this.next - ac.currentTime, ch = this.pad[this.bar % this.pad.length];
      ch.forEach(n => note({ f:sc(n), at:t, dur:barLen*1.05, vol:.035, type:"sine",
                             open:3, detune:9, bus:MUSBUS }));
      for(let i=0;i<8;i++){
        const n = this.fig[(this.bar*3 + i) % this.fig.length];
        note({ f:sc(n+12), at:t + i*beat/2, dur:.5, vol:(i%2?0.028:0.045),
               tick:.4, open:8, bus:MUSBUS });
      }
      for(let i=0;i<4;i++)
        whoosh({ at:t + i*beat + beat*0.5, from:5200, to:7200, dur:.07,
                 vol:.014, q:3, bus:MUSBUS });
      this.next += barLen; this.bar++;
    }
  }
};
window.MR_audioStop = function(){ try{ MUSIC.stop(); if(AC) AC.suspend(); }catch(e){} };
/* [r71] the lesson around the game speaks too - its opening instruction plays while the music is
   already running. It is ducked from the game loop, off the engine's own "a clip is playing"
   flag (body.vo-lock), NOT off a timer: measured, the instruction can start seconds after the
   game mounts, and a timer had already let the music back up by then. */
let _lessonVO = false;
function watchLessonVO(){
  const on = !!(document.body && document.body.classList.contains("vo-lock"));
  if(on !== _lessonVO){ _lessonVO = on; MUSIC.setDuck("lesson", on); }
}

const VOICE = {
  mode: 2,
  /* [r76] real recordings now - Gemini TTS, voice Leda, the lesson's own narrator. They were
     never recorded before, so every line fell through to the device's TTS. Their own folder, and
     the capital-free path matters: the lesson's folder is assets/Audio, and on a case-sensitive
     server assets/audio is a different, empty, folder. */
  dir: "assets/MatraRunner/voice/",
  noFile: {},          // जिन id की mp3 नहीं मिली
  queue: [], busy:false, hindi:null,

  init(){
    try{ const m = localStorage.getItem("matraRunnerVoice"); if(m!==null) this.mode = parseInt(m,10); }catch(e){}
    this.pickVoice();
    if(window.speechSynthesis) speechSynthesis.onvoiceschanged = ()=>this.pickVoice();
  },
  pickVoice(){
    if(!window.speechSynthesis) return;
    const v = speechSynthesis.getVoices();
    this.hindi = v.find(x=>x.lang==="hi-IN") || v.find(x=>/^hi/.test(x.lang)) || null;
  },
  /* [r78] `gate`: the portal pair this word belongs to. It is told when its word has been heard
     to the end (the world waits for that), and if the word is cut off it is asked for again. */
  say(id, text, gate){                 // कतार में जोड़ो
    if(this.mode < 2){ if(gate) gate.heard = true; return; }
    this.queue.push({id, text:text||LINES[id]||id, gate:gate||null});
    this.pump();
  },
  clear(){
    const cut = this.queue.concat(this.cur ? [this.cur] : []);
    cut.forEach(it => { if(it.gate && !it.gate.heard) it.gate.spoken = false; });
    this.queue.length = 0; this.busy = false; this.tok = (this.tok || 0) + 1; this.cur = null;
    this.lastEnd = performance.now();
    MUSIC.duck(false);
    try{ if(window.speechSynthesis) speechSynthesis.cancel(); }catch(e){}
    if(this.src){ try{ this.src.stop(); }catch(e){} this.src = null; }
    if(this.elA){ try{ this.elA.onended = this.elA.onerror = null; this.elA.pause(); }catch(e){} this.elA = null; }
  },
  /* [r76] THE CLIPS ARE DECODED INTO MEMORY AT BOOT and played through the game's own audio
     engine, like the music and the effects. Two measured failures of the <audio> element route:
     a clip created on first use had 700 ms to start or it fell back to the device's robotic TTS
     (five words did, in one run, and were then marked missing for good); and warming 54 <audio>
     elements does not work either - the browser capped them and fetched 33. A decoded buffer
     starts in the same frame it is asked for. */
  bufs: {}, loading: {}, tok: 0, lastEnd: 0,
  /* [r79] ms since the game last said anything (0 while it is speaking or has lines waiting) */
  quietFor(){ return (this.busy || this.queue.length) ? 0 : performance.now() - this.lastEnd; },
  preload(){
    if(this._pre) return;
    const ac = audioReady(); if(!ac) return;
    this._pre = true;
    if(!this.bus){ this.bus = ac.createGain(); this.bus.gain.value = 1.1; this.bus.connect(MASTER); }
    if(LOCAL) return;                     /* [r78] refused as a file: every line plays as an element */
    const ids = Object.keys(LINES).concat(POOL_U.map(w => w[1]), POOL_UU.map(w => w[1]));
    ids.forEach(id => {
      this.loading[id] = fetch(mrv(this.dir + id + ".ogg"))
        .then(r => { if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(ab => new Promise((res, rej) => ac.decodeAudioData(ab, res, rej)))
        .then(buf => { this.bufs[id] = buf; })
        .catch(() => { this.noFile[id] = true; });
    });
  },
  pump(){
    this.preload();
    if(this.busy || !this.queue.length || this.mode < 2) return;
    const it = this.queue.shift(); this.busy = true; this.cur = it;
    const tok = this.tok;
    MUSIC.duck(true);                       /* the spoken word comes first; the bed steps back */
    /* `tok` makes a line that was cut short by clear() unable to start the next one: without it a
       stopped clip's ended event arrives AFTER the new line has begun, and two voices overlap */
    let fired = false;
    const next = ()=>{
      if(fired || tok !== this.tok) return; fired = true;
      if(it.gate) it.gate.heard = true;
      this.busy = false; this.src = null; this.elA = null; this.cur = null; this.lastEnd = performance.now();
      if(!this.queue.length) MUSIC.duck(false);
      setTimeout(()=>this.pump(), 180);
    };
    let started = false;
    const go = ()=>{
      if(started || tok !== this.tok) return; started = true;
      const buf = this.bufs[it.id];
      if(buf && AC){
        const src = AC.createBufferSource(); src.buffer = buf; src.connect(this.bus);
        src.onended = next; this.src = src; src.start();
      } else {
        this.playEl(it, next, tok);         /* [r78] as a file, or the buffer failed: an element */
      }
    };
    if(this.bufs[it.id] || this.noFile[it.id] || !this.loading[it.id]) go();
    else {
      /* still decoding (only possible in the first second after boot): wait for it, briefly */
      this.loading[it.id].then(go, go);
      setTimeout(go, 1500);
    }
  },
  /* [r78] the recording through an <audio> element; the device's voice only if the file is truly
     not there (it has no Hindi voice on most Windows machines, so that is silence) */
  playEl(it, next, tok){
    const a = new Audio(mrv(this.dir + it.id + ".ogg")); a.volume = 1;
    this.elA = a;
    let settled = false;
    const fail = ()=>{
      if(settled || tok !== this.tok) return; settled = true;
      a.onended = a.onerror = null; try{ a.pause(); }catch(e){}
      this.elA = null; this.tts(it.text, next);
    };
    a.onplaying = ()=>{ settled = true; };
    a.onended = next; a.onerror = fail;
    try{ const p = a.play(); if(p && p.catch) p.catch(fail); }catch(e){ fail(); }
    setTimeout(fail, 3000);                 /* never started at all: do not hold the queue */
    /* and a clip that started but never reports its end still lets the next line through */
    a.addEventListener("loadedmetadata", ()=>{
      if(isFinite(a.duration)) setTimeout(()=>{ if(this.elA === a) next(); }, a.duration*1000 + 1500);
    });
  },
  tts(text, cb){
    if(!window.speechSynthesis){ cb(); return; }
    try{
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "hi-IN"; u.rate = 0.85; u.pitch = 1.05;
      if(this.hindi) u.voice = this.hindi;
      u.onend = cb; u.onerror = cb;
      speechSynthesis.speak(u);
      setTimeout(()=>{ if(!speechSynthesis.speaking) cb(); }, 4000);
    }catch(e){ cb(); }
  },
  cycle(){
    this.mode = (this.mode + 2) % 3;   // 2 -> 1 -> 0 -> 2
    if(this.mode < 2) this.clear();
    try{ localStorage.setItem("matraRunnerVoice", String(this.mode)); }catch(e){}
    return this.mode;
  },
  icon(){ return ["\uD83D\uDD07","\uD83D\uDD08","\uD83D\uDDE3\uFE0F"][this.mode]; }
};
VOICE.init();

function pick(arr, avoid){
  const free = arr.filter(w=>avoid.indexOf(w[1])<0);
  const src = free.length ? free : arr;
  return src[Math.floor(Math.random()*src.length)];
}
function makeGateWords(target){
  const r = pick(target===U ? ONLY_U : ONLY_UU, G.usedWords);
  const w = pick(target===U ? ONLY_UU : ONLY_U, G.usedWords);
  G.usedWords.push(r[1], w[1]); while(G.usedWords.length>14) G.usedWords.shift();
  const set = [{t:r[0], id:r[1], ok:true},{t:w[0], id:w[1], ok:false}];
  if(Math.random()<0.5) set.reverse();
  return set;
}

/* ======================= decor / backdrop ======================= */
let backdrop = null;
function buildBackdrop(){
  backdrop = document.createElement("canvas");
  backdrop.width = Math.round(W*DPR); backdrop.height = Math.round(horizonY()*DPR+2*DPR);
  const b = backdrop.getContext("2d");
  b.setTransform(DPR,0,0,DPR,0,0);
  const hy = horizonY();
  const sky = b.createLinearGradient(0,0,0,hy);
  sky.addColorStop(0,"#1b1740"); sky.addColorStop(.42,"#5a2f74");
  sky.addColorStop(.72,"#c9552f"); sky.addColorStop(1,"#ffb45c");
  b.fillStyle=sky; b.fillRect(0,0,W,hy+2);
  // sun
  const sx=W*0.5, sy=hy*0.93, sr=Math.min(W,H)*0.11;
  const gl=b.createRadialGradient(sx,sy,sr*0.2,sx,sy,sr*3);
  gl.addColorStop(0,"rgba(255,220,140,.95)"); gl.addColorStop(.35,"rgba(255,160,70,.45)");
  gl.addColorStop(1,"rgba(255,120,40,0)");
  b.fillStyle=gl; b.fillRect(0,0,W,hy+2);
  b.fillStyle="#ffe6a8"; b.beginPath(); b.arc(sx,sy,sr,0,7); b.fill();
  // stars
  b.fillStyle="rgba(255,255,255,.7)";
  for(let i=0;i<40;i++){ const x=(i*97.3)%W, y=(i*53.7)%(hy*0.4);
    b.globalAlpha=0.25+((i*17)%10)/22; b.beginPath(); b.arc(x,y,1.1,0,7); b.fill(); }
  b.globalAlpha=1;
  // temple silhouette
  function temple(cx,w,h,col){
    b.fillStyle=col; b.beginPath();
    b.moveTo(cx-w/2, hy); b.lineTo(cx-w*0.34, hy-h*0.62);
    b.lineTo(cx-w*0.17, hy-h*0.62); b.lineTo(cx, hy-h);
    b.lineTo(cx+w*0.17, hy-h*0.62); b.lineTo(cx+w*0.34, hy-h*0.62);
    b.lineTo(cx+w/2, hy); b.closePath(); b.fill();
    b.fillRect(cx-w*0.09, hy-h*0.30, w*0.18, h*0.30);
  }
  temple(W*0.5, W*0.36, hy*0.55, "#2a1b46");
  temple(W*0.16, W*0.22, hy*0.34, "#20143a");
  temple(W*0.86, W*0.24, hy*0.38, "#20143a");
  // jungle canopy
  b.fillStyle="#150f2e"; b.beginPath(); b.moveTo(0,hy+2);
  for(let x=0;x<=W;x+=W/26){
    const h = hy*0.10 + Math.abs(Math.sin(x*0.021))*hy*0.13;
    b.lineTo(x, hy-h);
  }
  b.lineTo(W,hy+2); b.closePath(); b.fill();
}
/* [r40] THE ROADSIDE RAILING.
   The reference's path is bounded by a low stone railing on both sides, and that one element is
   what makes the road read as a road rather than as a lighter stripe on the grass. It is not
   decor: decor is scattered at random depths and offsets, while a railing has to be a REGULAR
   run at a FIXED offset, or it reads as a line of loose stones. So it gets its own list, evenly
   spaced in z and recycled the same way, drawn at the edge of the path trapezoid. */
/* 0.06, not 0.135: at the wider spacing the segments stood apart with grass showing between
   them and read as scattered stone benches. Closer together they overlap in screen space near
   the camera, which is what makes a railing look continuous. */
const RAIL_STEP = 0.04;
function seedRails(){
  G.rails = [];
  /* k is the segment's own number and never changes, so "a hedge every third post" keeps
     selecting the same evenly-spaced subset however the array is later reordered */
  let k = 0;
  /* [r68] out to 2.05, not 1.25: the old railing faded out behind the treeline's skirt, but
     the bridge's posts must keep coming out of the distance or the far half of the bridge is a
     bare wall. The old railing still stops at HEDGE_FAR, so this changes nothing without it. */
  for(let z = -0.05; z < 2.05; z += RAIL_STEP) G.rails.push({ z: z, k: k++ });
}
/* The hedge rides the railing's own z list, so the two can never drift apart, and is drawn
   first - the kerb stands in front of the planting, not behind it. Copies overlap by a tenth
   of their width, because the generated section has a faint edge at each end and butting them
   exactly leaves a visible stitch every segment. */
/* one segment every third post, and nothing behind the treeline's skirt */
const HEDGE_EVERY = 3, HEDGE_FAR = 1.05;
function drawHedge(r, i){
  const art = window.MR_hedgeArt && MR_hedgeArt();
  if(!art || r.z <= 0.002 || r.z > HEDGE_FAR || (i % HEDGE_EVERY)) return;
  const {p, y} = proj(r.z);
  const h = 96*S*p, w = h*((art.width/art.height) || 2.4) * 1.65;
  const edge = LANE_W()*p*1.08 + w*0.24;
  for(const sgn of [-1, 1]){
    const x = worldX(0, p) + sgn*edge;
    if(x < -w || x > W+w) continue;
    ctx.drawImage(art, x-w/2, y-h, w, h);
  }
}
function drawRail(r){
  const art = window.MR_railArt && MR_railArt();
  if(!art || r.z <= 0.002 || r.z > HEDGE_FAR) return;   /* past the skirt it is not visible */
  const {p, y} = proj(r.z);
  const h = 52*S*p, w = h*((art.width/art.height) || 2.1);
  /* the same 1.08 half-width the path trapezoid is drawn with, pushed out by half a post so
     the railing sits BESIDE the paving and not on top of it */
  const edge = LANE_W()*p*1.08 + w*0.16;   /* just off the paving, not out in the undergrowth */
  for(const sgn of [-1, 1]){
    const x = worldX(0, p) + sgn*edge;
    if(x < -w || x > W+w) continue;
    ctx.save();
    if(sgn > 0){ ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
    ctx.drawImage(art, x-w/2, y-h, w, h);
    ctx.restore();
  }
}
/* Trees carry the skyline at the edge of frame, so they get the majority; pillars punctuate
   it and bushes fill between. One place, so seeding and recycling cannot disagree - they did
   before, and a recycled verge slowly drifted to a different mix from the one it started with. */
function decorKind(){
  /* weighted harder to trees: they are the only thing tall enough to actually cover the
     ground behind them, which is what "so that the grass is not visible" asks for */
  const r = Math.random();
  return r < 0.72 ? "tree" : r < 0.88 ? "bush" : "pillar";
}
function seedDecor(){
  G.decor = [];
  for(let i=0;i<54;i++){
    G.decor.push({ z: Math.random(), side: Math.random()<0.5?-1:1,
      kind: decorKind(),
      off: 1.30 + Math.random()*2.10, hh: 0.85+Math.random()*0.5, hue: Math.random() });
  }
  G.decor.sort((a,b)=>b.z-a.z);
}

/* ======================= level control ======================= */
function startLevel(i, spoken){
  MUSIC.setDuck("veil", false);
  VOICE.preload();
  const L = LEVELS[i];
  G.level=i; G.speed=L.speed; G.target = L.target || U;
  G.gates=[]; G.coins=[]; G.parts=[]; G.pops=[];
  G.cleared=0; G.right=0; G.wrong=0; G.missedWords=[]; G.usedWords=[]; G.pips=[];
  G.lane=0; G.laneF=0; G.targetLane=0; G.shake=0; G.flash=0;
  G.banner={text:"स्तर "+(i+1), sub:L.name, life:2.9};
  /* Held while the level's card is read, then eased up to speed. It counts ITSELF down: the
     first version was lowered only by the lesson's voice-over callback, which fires once, so
     every level after the first stayed at a fifth speed for ever. Nothing outside this can
     leave it raised now - MR_begin() can only cut it short. */
  G.hold = true; G.ramp = 0; G.holdT = (i === 0 ? 7.0 : (spoken ? 0.8 : 2.4));
  VOICE.clear();
  const goal = G.target===U ? "goal_u" : "goal_uu";
  /* [r77] measured: this line started at boot, in the same instant the lesson spoke its own
     instruction for this page - two voices at once on every entry. The first level's goal now
     waits until the lesson has finished speaking. */
  if(!spoken){
    if(i === 0) whenLessonQuiet(function(){ if(G.level === 0 && G.mode === "play") VOICE.say(goal); }, 12000);
    else VOICE.say(goal);
  }
  seedDecor(); seedRails();
  /* further out than they were: the first choice must not arrive while the instruction is
     still being spoken, or the child is answering a question they have not heard yet */
  /* [r78] after the first level its goal has just been spoken over the veil, so its first pair
     starts nearer: the first word follows the goal by about two seconds, not six */
  const z0 = (i === 0 ? 1.75 : 1.00);
  spawnGate(z0); spawnGate(z0 + GATE_GAP);
  document.getElementById("lvlNum").textContent = i+1;
  setGoal();
  hud();
  hideScreens(); G.mode="play";
  MUSIC.start();
}
function setGoal(){
  const chip = document.getElementById("matraChip");
  const isU = G.target===U;
  chip.className = "matra " + (isU?"u":"uu");
  chip.innerHTML = "<em>"+(isU?"उ":"ऊ")+"</em><span>"+(isU?U:UU)+"</span>";
}

/* [r78] THE SPACE BETWEEN TWO PAIRS OF PORTALS. Yasir: "after we catch one word we need some time
   to listen and catch the other". It was 0.52 of the road - 3.4 s at level 1's speed, and the
   feedback line alone takes one of those. Doubled: about 6.5 s from one pair to the next. */
const GATE_GAP = 1.05;
function spawnGate(z){
  const L = LEVELS[G.level];
  /* [r78] Yasir: both portals look the same - only the words differ */
  const hue = [0, 0];
  if(L.target===null){ G.target = Math.random()<0.5?U:UU; setGoal(); }
  G.gates.push({ z: z, words: makeGateWords(G.target), target:G.target, done:false, reveal:0,
                 okLane:-1, hue: hue });
  const g = G.gates[G.gates.length-1];
  g.okLane = g.words.findIndex(w=>w.ok);
  // coins in the gap ahead of this gate
  const n = 2 + Math.floor(Math.random()*2);
  for(let i=0;i<n;i++){
    G.coins.push({ z: z + 0.16 + i*0.09, lane: Math.floor(Math.random()*LANES), got:false, spin: Math.random()*6 });
  }
}

/* ======================= input ======================= */
function move(dir){
  if(G.mode!=="play") return;
  const n = Math.max(0, Math.min(LANES-1, G.targetLane + dir));
  if(n!==G.targetLane){ G.targetLane=n; whoosh({from:700,to:2200,dur:.13,vol:.05,q:2}); }
}
MR_ON(window, "keydown", e=>{
  if(e.key==="ArrowLeft"||e.key==="a"||e.key==="A"){ move(-1); e.preventDefault(); }
  else if(e.key==="ArrowRight"||e.key==="d"||e.key==="D"){ move(1); e.preventDefault(); }
  else if(e.key===" "||e.key==="Enter"){
    const vis = document.querySelector(".screen.on .btn");
    if(vis){ vis.click(); e.preventDefault(); }
  }
});
document.querySelectorAll(".pad,.arrow").forEach(el=>{
  const dir = parseInt(el.dataset.dir,10);
  const fire = e=>{ e.preventDefault(); move(dir); };
  el.addEventListener("pointerdown", fire);
});
// swipe
let sx0=null;
cvs.addEventListener("pointerdown", e=>{ sx0=e.clientX; });
cvs.addEventListener("pointerup", e=>{
  if(sx0===null) return;
  const dx = e.clientX - sx0; sx0=null;
  if(Math.abs(dx)>40) move(dx>0?1:-1);
});

/* ======================= gameplay update ======================= */
function resolveGate(g){
  g.done = true; g.reveal = 1;
  /* PINNED. Left to carry on it would keep approaching, and the projection turns the last
     tenth of z into several screens' worth of arch sliding at the camera. Stopped here, the
     reaction plays at the place she actually passed through. */
  g.pin = true; g.fx = 0; g.chosenLane = G.lane;
  G.cleared++;
  const chosen = g.words[G.lane];
  G.pips.push(!!(chosen && chosen.ok));
  if(chosen && chosen.ok){
    G.right++; G.score += 100 + G.right*10;
    G.flashCol="rgba(120,255,190,.22)"; G.flash=0.35;
    sparkle(laneX(G.lane,1), groundY()-235*S, 44);
    G.pops.push({text:"शाबाश!", sub:chosen.t, col:"#8ff0c6", life:1.25});
    sfxGate(true); sfxRight(); VOICE.clear(); VOICE.say("right");
  }else{
    G.wrong++; G.hearts--;
    const rightWord = g.words[g.okLane].t;
    G.missedWords.push(rightWord);
    G.shake = 0.30; G.flashCol="rgba(150,130,110,.18)"; G.flash=0.3;
    dust(laneX(G.lane,1), groundY()-95*S, 26);
    G.pops.push({text:"सही शब्द: "+rightWord, sub:(g.target===U?"उ ( ु )":"ऊ ( ू )"), col:"#ffb0a0", life:1.7});
    sfxGate(false); sfxWrong(); sfxBonk(); VOICE.clear(); VOICE.say("wrong");
    VOICE.say("correct_is"); VOICE.say(g.words[g.okLane].id, rightWord); G.afterWrong = true;
    if(G.hearts<=0){ gameOver(); return; }
  }
  hud();
  const L = LEVELS[G.level];
  /* [r79] the level's last "शाबाश!" is heard out before the transition begins - it used to be
     cut off by it, in the same instant the level-up chime and "वाह! ..." started */
  if(G.cleared >= L.gates){ whenVoiceDone(levelDone, 1100, 3000); }
  /* [r78] never more pairs than the level has: the spare one used to arrive at the end of every
     level, and its word could slip in between the last "शाबाश" and "वाह! ..." */
  else if(G.cleared + G.gates.filter(x => !x.done).length < L.gates)
    spawnGate(Math.max(1.0, (G.gates.length?Math.max.apply(null,G.gates.map(x=>x.z)):0) + GATE_GAP));
}

/* gold, rising, slow to fade - the reward for getting through */
function sparkle(x,y,n){
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2, sp=(40+Math.random()*190)*S;
    G.parts.push({x:x+(Math.random()-0.5)*90*S, y:y+(Math.random()-0.5)*70*S,
      vx:Math.cos(a)*sp*0.7, vy:Math.sin(a)*sp*0.5 - (70+Math.random()*90)*S,
      life:.7+Math.random()*.6, grav:-40*S, twinkle:true,
      col: Math.random()<0.5 ? "#ffe07a" : "#fff6d0", r:(2+Math.random()*4.5)*S});
  }
}
/* grey, heavy, gone quickly - a scuff, not a punishment */
function dust(x,y,n){
  for(let i=0;i<n;i++){
    const a = -Math.PI*0.5 + (Math.random()-0.5)*2.2, sp=(40+Math.random()*130)*S;
    G.parts.push({x:x+(Math.random()-0.5)*70*S, y,
      vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*0.6, life:.35+Math.random()*.3, grav:260*S,
      col: Math.random()<0.5 ? "rgba(178,166,150,.75)" : "rgba(146,134,118,.65)",
      r:(4+Math.random()*7)*S});
  }
}
function burst(x,y,col,n){
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2, s=(60+Math.random()*220)*S;
    G.parts.push({x,y, vx:Math.cos(a)*s, vy:Math.sin(a)*s-120*S, life:.5+Math.random()*.5,
      col, r:(2+Math.random()*4)*S});
  }
}

function update(dt){
  if(G.frozen) return;
  G.t += dt;
  if(G.mode!=="play"){ G.dashT += dt*0.3; return; }
  G.dashT += dt*G.speed;

  // lane easing
  /* exponential, so a slow frame moves her the same distance a fast one does - the old
     linear factor made the glide speed depend on how long the last frame happened to take */
  G.laneF += (G.targetLane - G.laneF) * (1 - Math.exp(-dt*9));
  if(Math.abs(G.laneF-G.targetLane)<0.06) G.lane = G.targetLane;
  else G.lane = Math.round(G.laneF);

  /* [r50] THE INTRO. Held, the world drifts at a fifth of speed - she is still running and
     the road is still moving, because a frozen frame under a voice-over reads as a game that
     failed to load. Released, the speed eases in over about a second instead of snapping on. */
  if(G.hold && (G.holdT -= dt) <= 0) G.hold = false;
  if(!G.hold) G.ramp = Math.min(1, G.ramp + dt*0.95);
  /* [r78] AND IT IS HEARD BEFORE THE PAIR ARRIVES. After a wrong answer the feedback ("सही शब्द
     है ...") is three to four seconds long, and the next word queues behind it. If that word has
     not been heard to the end by the time its pair is two-thirds of the way in, the world eases
     to a fifth of its speed - as it does under the level's intro - until it has (at most 7 s). */
  const fg = G.gates.find(x => !x.done);
  let waitWord = false;
  if(fg && !fg.heard && fg.z < 0.55){ fg.waitT = (fg.waitT || 0) + dt; waitWord = fg.waitT < 8; }
  G.waitF = (G.waitF == null ? 1 : G.waitF);
  G.waitF += ((waitWord ? 0.2 : 1) - G.waitF) * (1 - Math.exp(-dt*5));
  const v = G.speed * (G.hold ? 0.20 : 0.20 + 0.80*G.ramp) * dt * G.waitF;
  // gates
  for(const g of G.gates){
    if(g.pin) g.fx += dt; else g.z -= v;
    /* [r78] THE WORD TO CATCH IS SPOKEN FOR THE NEXT PAIR ONLY. It used to be spoken at a fixed
       distance - which, with the pairs this close, was while the pair before was still ahead -
       and passing that pair stopped the voice for its "शाबाश" and cut the new word off. So from
       the second pair on, no target word was ever heard. Now it is asked for once the pair in
       front has been passed, and queues behind that pair's feedback. */
    /* [r79] Yasir: "when we reach near the portal it should play the VO of the word". And it
       waits for 0.7 s of quiet: after a wrong answer the feedback ends on the PREVIOUS pair's
       right word ("सही शब्द है पूजा"), and the new target followed it within 0.3 s - two words
       back to back, which is exactly what "it plays both words" sounds like. */
    if(!g.spoken && !g.done && g.z<=0.62 && G.gates.find(x => !x.done) === g &&
       VOICE.quietFor() >= (G.afterWrong ? 1500 : 700) && !document.body.classList.contains("vo-lock")){
      g.spoken = true; G.afterWrong = false;  /* after "सही शब्द है ..." a longer beat: a new word */
      /* [r77] Yasir: only the TARGET word is spoken - the one to catch - not both portals' */
      const tw = g.words.find(w => w.ok) || g.words[0];
      VOICE.say(tw.id, tw.t, g);
    }
    if(!g.done && g.z<=0.035) resolveGate(g);
  }
  G.gates = G.gates.filter(g => g.pin ? g.fx < 0.36 : g.z > -0.18);
  // coins
  for(const c of G.coins){
    c.z -= v; c.spin += dt*5;
    if(!c.got && c.z<=0.02 && c.lane===G.lane){
      c.got=true; G.score+=25; sfxCoin(); hud();
      burst(laneX(c.lane,1), groundY()-90*S, "#ffcb45", 8);
    }
  }
  G.coins = G.coins.filter(c=>c.z>-0.1 && !c.got);
  /* the ground texture travels with everything else, in z. Kept bounded because it is
     multiplied up into texture pixels every frame and a session should not drift into the
     range where a float stops being able to tell two rows apart. */
  G.ground = (G.ground + v) % 4096;
  // railing recycle - evenly spaced, so a segment is put back exactly one run behind the last
  for(const r of G.rails){ r.z -= v; if(r.z < -0.05) r.z += RAIL_STEP*G.rails.length; }
  /* SORTED BY DEPTH, every frame. A segment that wraps to the back keeps its slot in the
     array, so array order stops meaning depth order within a second of starting - and the
     painter's algorithm then draws far posts over near ones, popping on every wrap. */
  G.rails.sort((a,b)=>b.z-a.z);
  // decor recycle
  for(const d of G.decor){
    d.z -= v;
    if(d.z<-0.06){ d.z += 1.06 + Math.random()*0.2; d.side = Math.random()<0.5?-1:1;
      d.kind = decorKind();
      d.off = 1.30+Math.random()*2.10; d.hh=0.85+Math.random()*0.5; }
  }
  G.decor.sort((a,b)=>b.z-a.z);
  // fx
  for(const p of G.parts){ p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
    p.vy += (p.grav === undefined ? 900*S : p.grav)*dt; }
  G.parts = G.parts.filter(p=>p.life>0);
  for(const p of G.pops) p.life -= dt;
  G.pops = G.pops.filter(p=>p.life>0);
  if(G.banner){ G.banner.life-=dt; if(G.banner.life<=0) G.banner=null; }
  G.shake = Math.max(0, G.shake-dt*1.3);
  G.flash = Math.max(0, G.flash-dt*1.6);


}

/* ======================= drawing ======================= */
function drawGround(){
  /* [r38] tiled art floor when tex_grass/tex_path are present */
  if(window.MR_drawGroundArt && MR_drawGroundArt()) return;
  const hy=horizonY(), gy=groundY();
  // ground base
  const gr = ctx.createLinearGradient(0,hy,0,H);
  gr.addColorStop(0,"#1d3d2e"); gr.addColorStop(.5,"#16482f"); gr.addColorStop(1,"#0f2f21");
  ctx.fillStyle=gr; ctx.fillRect(0,hy,W,H-hy);

  // path trapezoid
  const pFar = proj(26), pNear = proj(0);
  const wFar = LANE_W()*pFar.p*roadHalf(), wNear = LANE_W()*pNear.p*roadHalf();
  ctx.beginPath();
  const cFar = worldX(0, pFar.p), cNear = worldX(0, pNear.p);
  ctx.moveTo(cFar-wFar, pFar.y); ctx.lineTo(cFar+wFar, pFar.y);
  ctx.lineTo(cNear+wNear, H); ctx.lineTo(cNear-wNear, H); ctx.closePath();
  const pg = ctx.createLinearGradient(0,hy,0,H);
  pg.addColorStop(0,"#8a5f34"); pg.addColorStop(1,"#c98f52");
  ctx.fillStyle=pg; ctx.fill();

  // moving bands
  ctx.save(); ctx.clip();
  const sp=0.075, frac=(G.dashT/sp)%1;
  for(let k=0;k<26;k++){
    const z0=(k-frac)*sp, z1=z0+sp*0.5;
    if(z1<0) continue;
    const a=proj(Math.max(0,z0)), b2=proj(Math.max(0,z1));
    const wa=LANE_W()*a.p*1.08, wb=LANE_W()*b2.p*1.08;
    ctx.fillStyle = k%2 ? "rgba(255,255,255,.055)" : "rgba(60,30,10,.075)";
    const ca = worldX(0, a.p), cb = worldX(0, b2.p);
    ctx.beginPath(); ctx.moveTo(cb-wb,b2.y); ctx.lineTo(cb+wb,b2.y);
    ctx.lineTo(ca+wa,a.y); ctx.lineTo(ca-wa,a.y); ctx.closePath(); ctx.fill();
  }
  // lane grooves
  ctx.beginPath();
  ctx.moveTo(cFar, pFar.y); ctx.lineTo(cNear, H);
  ctx.strokeStyle="rgba(90,55,20,.4)"; ctx.lineWidth=2*S; ctx.stroke();
  ctx.restore();

  // path glow edges - only while there is no railing to mark the edge for real
  if(!(window.MR_railArt && MR_railArt())){
    ctx.strokeStyle="rgba(255,203,69,.22)"; ctx.lineWidth=3*S;
    ctx.beginPath(); ctx.moveTo(cFar-wFar,pFar.y); ctx.lineTo(cNear-wNear,H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cFar+wFar,pFar.y); ctx.lineTo(cNear+wNear,H); ctx.stroke();
  }
}

function drawDecor(d){
  if(d.z<=0.001) return;
  const {p,y} = proj(d.z);
  const x = worldX(d.side*d.off, p);
  const h = 150*S*p*d.hh, w = 46*S*p*d.hh;
  ctx.save();
  /* [r38] painted tree/bush/pillar when one is present; the drawn shapes remain */
  const _da = window.MR_decorArt && MR_decorArt(d.kind, (d.off*977)|0);
  if(_da){
    /* [r39] Each kind gets its own scale. h is the height of the SHAPE this function draws
       when there is no art, and the drawn bush is a flat ellipse about a third of it while
       the drawn tree fills it - so one blanket multiplier (it was 1.5) made every bush as
       tall as a tree and every tree half again too big for the path it stands beside. */
    /* [r50] Roughly twice what it was. The old sizes were set against a drawn silhouette
       and left the verge reading as open ground with ornaments on it; the mockup has trees
       taller than the gates crowding both edges of the frame. */
    /* Trees and pillars raised on request. K multiplies the height of the silhouette this
       function would draw without art, and the width follows from each picture's own ratio -
       so these grow taller and proportionally wider, they do not stretch. */
    const K = d.kind==="bush" ? 1.05 : d.kind==="pillar" ? 3.10 : 3.45;
    let dh = h*K, dw = dh*(_da.width/_da.height||0.7);
    /* the clamp has to rise with them: it shrinks BOTH dimensions to fit, so leaving it where
       it was would have quietly cancelled most of the extra height on the widest trees */
    const wmax = LANE_W()*p*2.85;
    if(dw > wmax){ dh *= wmax/dw; dw = wmax; }
    /* [r51] CULLED ON ITS DRAWN WIDTH, which it never was: the old test dropped anything whose
       CENTRE lay more than 120px outside the canvas, and now that a near tree can be two thirds
       of the screen across, that threw away trees the child could still half see - they popped
       out of existence at the edge of frame. It also kept drawing ones entirely off it. */
    if(x + dw/2 < 0 || x - dw/2 > W){ ctx.restore(); return; }
    ctx.drawImage(_da, x-dw/2, y-dh, dw, dh);
    ctx.restore(); return;
  }
  if(d.kind==="pillar"){
    ctx.fillStyle="#6b5b7d"; ctx.fillRect(x-w*0.32,y-h,w*0.64,h);
    ctx.fillStyle="#544567"; ctx.fillRect(x-w*0.46,y-h-h*0.07,w*0.92,h*0.09);
    ctx.fillStyle="rgba(120,255,200,.45)";
    ctx.beginPath(); ctx.arc(x, y-h*0.55, 3.2*S*p, 0, 7); ctx.fill();
  }else if(d.kind==="tree"){
    ctx.fillStyle="#3b2a22"; ctx.fillRect(x-w*0.11,y-h*0.9,w*0.22,h*0.9);
    ctx.fillStyle= d.hue>0.5 ? "#1f6b46":"#175439";
    for(let i=0;i<3;i++){
      ctx.beginPath();
      ctx.ellipse(x, y-h*(0.72+i*0.14), w*(0.85-i*0.16), h*0.19, 0,0,7); ctx.fill();
    }
  }else{
    ctx.fillStyle="#17563a";
    ctx.beginPath(); ctx.ellipse(x,y-h*0.13,w*0.72,h*0.16,0,0,7); ctx.fill();
    ctx.fillStyle="rgba(120,255,210,"+(0.35+0.3*Math.sin(G.t*2+d.off*4))+")";
    ctx.beginPath(); ctx.arc(x-w*0.2,y-h*0.2,2.6*S*p,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(x+w*0.25,y-h*0.26,2.2*S*p,0,7); ctx.fill();
  }
  ctx.restore();
}

function drawCoin(c){
  if(c.z<=0.005) return;
  const {p,y} = proj(c.z);
  const x = laneX(c.lane,p);
  const r = 15*S*p, bob = Math.sin(G.t*4+c.spin)*5*S*p;
  const cy = y - 58*S*p + bob;
  ctx.save();
  ctx.shadowColor="rgba(255,203,69,.8)"; ctx.shadowBlur=16*p;
  const _cf = window.MR_coinFrame && MR_coinFrame();
  if(_cf){
    const s2=r*2;
    ctx.drawImage(_cf.img, _cf.r[0],_cf.r[1],_cf.r[2],_cf.r[3], x-s2/2, cy-r, s2, r*2);
  } else if(IMG.coin){
    const s2 = r*2*Math.max(0.3, Math.abs(Math.cos(c.spin)));
    ctx.drawImage(IMG.coin, x-s2/2, cy-r, s2, r*2);
    ctx.restore(); return;
  }
  const wobble = Math.abs(Math.cos(c.spin));
  ctx.fillStyle="#ffcb45";
  ctx.beginPath(); ctx.ellipse(x,cy, r*Math.max(0.22,wobble), r, 0,0,7); ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle="rgba(255,255,255,.55)";
  ctx.beginPath(); ctx.ellipse(x-r*0.25*wobble, cy-r*0.3, r*0.18*wobble, r*0.3,0,0,7); ctx.fill();
  ctx.restore();
}

var MR_gateWordOnly = false, MR_wordFade = 1;

/* [r59] THE PORTAL'S LIGHT, drawn rather than painted.
   `hue` is 0 for the green portal and 1 for the golden one; `t` is 0..1 through the burst when
   one has been entered. The swirl counter-rotates against the outer glow so the disc reads as
   moving without anything actually travelling - a rotating sprite would need a sheet. */
const PORTAL_HUE = [[120,255,190], [255,214,96]];

/* The golden portal is the SAME ring washed warm. source-atop is bounded by whatever is
   already on the canvas, so doing it on an offscreen that holds only the ring keeps the wash
   inside the leaves instead of painting a square over the scene. Built once, not per frame. */
var _goldRing = null;
function goldRing(img){
  if(_goldRing) return _goldRing;
  var c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  var g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = "rgba(255,196,64,0.46)";
  g.fillRect(0, 0, c.width, c.height);
  _goldRing = c;
  return c;
}
function portalGlow(cx, cy, r, hue, lit, t){
  const c = PORTAL_HUE[hue] || PORTAL_HUE[0];
  const col = (a) => "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  const pulse = 1 + 0.035*Math.sin(G.t*2.2 + hue*2);
  const rr = r * pulse * (1 + 0.55*t);
  const fade = 1 - t*t;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  /* the body of the light */
  const g1 = ctx.createRadialGradient(cx, cy, rr*0.05, cx, cy, rr);
  g1.addColorStop(0,    col(0.95*fade));
  g1.addColorStop(0.55, col(0.55*fade));
  g1.addColorStop(0.85, col(0.22*fade));
  g1.addColorStop(1,    col(0));
  ctx.fillStyle = g1;
  ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr*1.02, 0, 0, 7); ctx.fill();
  /* two slow arcs, turning opposite ways */
  ctx.lineCap = "round";
  for(let k=0;k<2;k++){
    const dir = k ? -1 : 1, a0 = G.t*dir*(0.5+0.22*k) + hue*1.7 + k*2.1;
    ctx.strokeStyle = col((0.30 - 0.08*k) * fade);
    ctx.lineWidth = rr*(0.12 - 0.04*k);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rr*(0.62 - 0.17*k), rr*(0.60 - 0.17*k), a0, 0.4, 4.2);
    ctx.stroke();
  }
  if(lit){                       /* the flare when this is the one she went through */
    ctx.fillStyle = "rgba(255,255,245," + (0.75*(1-t)) + ")";
    ctx.beginPath(); ctx.ellipse(cx, cy, rr*0.52*(1-t*0.4), rr*0.52*(1-t*0.4), 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}

/* the pool of light the portal casts on the path */
function portalPool(cx, y, w, hue, t){
  const c = PORTAL_HUE[hue] || PORTAL_HUE[0];
  const a = (1 - t) * 0.5;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(cx, y, 1, cx, y, w*0.62);
  g.addColorStop(0, "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")");
  g.addColorStop(1, "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(cx, y, w*0.62, w*0.17, 0, 0, 7); ctx.fill();
  ctx.restore();
}

/* leaves drifting off the ring - a path, not a sprite, so they take the portal's colour */
function portalLeaves(cx, cy, r, hue, alpha){
  const c = PORTAL_HUE[hue] || PORTAL_HUE[0];
  ctx.save();
  for(let i=0;i<7;i++){
    const ph = G.t*0.55 + i*0.92 + hue*1.3;
    const a  = ph % 6.283;
    const rad = r*(1.02 + 0.22*((ph*0.31) % 1));
    const x = cx + Math.cos(a)*rad, y = cy + Math.sin(a)*rad*0.98 - ((ph*9) % (r*0.5));
    const sz = r*0.085, rot = ph*1.4;
    ctx.globalAlpha = alpha * (0.35 + 0.45*Math.abs(Math.sin(ph)));
    ctx.fillStyle = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -sz);
    ctx.quadraticCurveTo(sz*0.8, -sz*0.15, 0, sz);
    ctx.quadraticCurveTo(-sz*0.8, -sz*0.15, 0, -sz);
    ctx.fill(); ctx.restore();
  }
  ctx.restore();
}


/* [r56] THE BURST ITSELF. Drawn over the gate as it goes: a ring of light expanding from the
   opening and a flash on the arch. Without it the gate simply vanishes, and vanishing is what
   a bug looks like - the ring is what tells the child something was DONE, not undone. */
function drawGateBurst(g, cx, y, gw, gh, ok){
  const t = Math.min(1, g.fx/0.36);
  if(t >= 1) return;
  const e = 1 - Math.pow(1-t, 3);                  /* fast out, easing off */
  const r = gw*(0.20 + 0.95*e), a = (1-t)*(1-t);
  const col = ok ? "255,225,140" : "190,175,155";
  ctx.save();
  ctx.globalCompositeOperation = ok ? "lighter" : "source-over";
  ctx.strokeStyle = "rgba("+col+","+(a*0.85)+")";
  ctx.lineWidth = Math.max(1, gw*0.055*(1-t));
  ctx.beginPath(); ctx.ellipse(cx, y-gh*0.46, r, r*0.62, 0, 0, 7); ctx.stroke();
  if(ok){
    const gl = ctx.createRadialGradient(cx, y-gh*0.46, 1, cx, y-gh*0.46, r*1.1);
    gl.addColorStop(0, "rgba(255,240,190,"+(a*0.5)+")");
    gl.addColorStop(1, "rgba(255,220,130,0)");
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.ellipse(cx, y-gh*0.46, r*1.1, r*0.7, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function drawGate(g){
  if(g.z<=-0.05) return;
  const {p,y} = proj(Math.max(0.002,g.z));
  const aw = LANE_W()*p*0.84, ah = 210*S*p, top = y-ah;
  const fade = Math.min(1, (1.25-g.z)*2.6);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, fade));

  for(let i=0;i<LANES;i++){
    const cx = laneX(i,p);
    const w = g.words[i];
    let col = "#9a7bff", glow="rgba(154,123,255,.55)";
    if(g.done && g.reveal>0){
      if(w.ok){ col="#4bf0a5"; glow="rgba(75,240,165,.85)"; }
      else    { col="#ff6a4a"; glow="rgba(255,106,74,.8)"; }
    }
    /* [r38] THE PAINTED ARCH, when gate_neutral/correct/wrong are present. The word is still
       drawn by the game below - the art's plaque is deliberately blank - so only the frame and
       the curtain are replaced here. */
    var _ring = window.MR_ringArt && MR_ringArt();
    var _box = null;
    if(_ring){
      /* [r60] THE PORTAL.
         One ring, an empty hole, and everything that varies painted into it: the light, the
         colour, the word. The hole is where the glow and the word go, and its radius is a
         fraction of the ring's own width, so the two stay locked together at any depth. */
      /* 0.78 of the lane spacing, not 0.94: portal centres are LANE_W*p apart, so at 0.94 the
         two rings overlapped and their glows ran into one another - one wide smear of light
         with two words in it rather than a choice between two doors.
         The opening's centre and radius are MEASURED off portal_ring.webp (hole centred at
         0.508 / 0.496 of the image, radius 0.311 of its width) rather than guessed, so the
         light sits in the hole at every depth. */
      var rw = LANE_W()*p*0.78, rh = rw*((_ring.height/_ring.width) || 1);
      var cyR = y - rh*0.504;
      var hole = rw*0.311;
      var t = g.done ? Math.min(1, g.fx/0.36) : 0;
      var gfade = 1 - t*t;
      var hue = (g.hue && g.hue[i]) || 0;
      var chosen = g.done && i === g.chosenLane;

      /* the pool it throws on the path, then the light inside it, then the ring over both */
      portalPool(cx, y - rh*0.02, rw*0.42, hue, t);
      portalGlow(cx, cyR, hole, hue, g.done && w.ok, t);

      var pop = g.done ? (w.ok ? 1 + 0.48*t : 1 + 0.10*t) : 1;
      var jig = (g.done && !w.ok && chosen) ? Math.sin(g.fx*58) * 13*S*p * (1-t) : 0;
      var dw2 = rw*pop, dh2 = rh*pop, cxj = cx + jig;

      ctx.save();
      ctx.globalAlpha *= gfade;
      ctx.drawImage(hue === 1 ? goldRing(_ring) : _ring, cxj-dw2/2, y-dh2, dw2, dh2);
      if(g.done && !w.ok && chosen){
        /* the one she chose wrongly goes dull - multiply is bounded by the art's own alpha,
           so only the ring darkens and not a rectangle of the scene behind it */
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.globalAlpha = 0.5 * Math.min(1, g.fx/0.06) * (1-t);
        ctx.drawImage(_ring, cxj-dw2/2, y-dh2, dw2, dh2);
        ctx.restore();
      }
      ctx.restore();

      portalLeaves(cxj, cyR, hole, hue, gfade * (g.done ? 1-t : 0.85));

      _box = { cx: cxj, cy: cyR, w: hole*1.72, h: hole*0.86 };
      MR_gateWordOnly = true;
      MR_wordFade = gfade;
    } else {
      MR_wordFade = 1;
      MR_gateWordOnly = false;
    }
    // arch
    if(!MR_gateWordOnly){
    ctx.lineWidth = Math.max(1.5, 9*S*p);
    ctx.strokeStyle = col;
    ctx.shadowColor = glow; ctx.shadowBlur = (g.done? 30:18)*p;
    ctx.beginPath();
    ctx.moveTo(cx-aw/2, y);
    ctx.lineTo(cx-aw/2, top+ah*0.30);
    ctx.quadraticCurveTo(cx-aw/2, top, cx, top);
    ctx.quadraticCurveTo(cx+aw/2, top, cx+aw/2, top+ah*0.30);
    ctx.lineTo(cx+aw/2, y);
    ctx.stroke();
    // curtain
    ctx.shadowBlur=0;
    ctx.fillStyle = g.done && g.reveal>0
      ? (w.ok?"rgba(75,240,165,.16)":"rgba(255,106,74,.16)")
      : "rgba(90,60,170,.14)";
    ctx.beginPath();
    ctx.moveTo(cx-aw/2, y); ctx.lineTo(cx-aw/2, top+ah*0.30);
    ctx.quadraticCurveTo(cx-aw/2, top, cx, top);
    ctx.quadraticCurveTo(cx+aw/2, top, cx+aw/2, top+ah*0.30);
    ctx.lineTo(cx+aw/2, y); ctx.closePath(); ctx.fill();
    }   /* end !MR_gateWordOnly */

    // word plate
    let fs, py;
    if(_box){
      /* [r40] SHRINK TO FIT THE PLANK. A fixed 42*S*p was set when the game drew its own
         plaque and sized the plaque to the text; the painted plank is a fixed shape, so the
         text has to give way instead. Start at a size proportional to the plank and step down
         until the word sits inside the cream face with a margin on both sides - a five-letter
         word and a two-letter word then both read, and neither runs over the wooden frame. */
      fs = Math.max(8, _box.h*0.46);
      ctx.font = "700 "+fs+'px "Baloo 2","Noto Sans Devanagari",sans-serif';
      for(let k=0; k<12 && ctx.measureText(w.t).width > _box.w*0.74; k++){
        fs *= 0.92;
        ctx.font = "700 "+fs+'px "Baloo 2","Noto Sans Devanagari",sans-serif';
      }
      py = _box.cy;
    } else {
      fs = Math.max(8, 42*S*p);
      ctx.font = "700 "+fs+'px "Baloo 2","Noto Sans Devanagari",sans-serif';
      const tw = ctx.measureText(w.t).width;
      const pw = Math.max(tw+26*S*p, aw*0.55), ph = fs*1.62;
      py = top + ah*0.42;
      ctx.fillStyle="rgba(14,10,32,.82)";
      roundRect(cx-pw/2, py-ph/2, pw, ph, 12*S*p); ctx.fill();
      ctx.strokeStyle= col; ctx.lineWidth=Math.max(1,2.5*S*p); roundRect(cx-pw/2,py-ph/2,pw,ph,12*S*p); ctx.stroke();
    }
    /* Dark ink on the cream plank; the pale ink below is for the dark plaque the game draws
       for itself when there is no art. */
    ctx.fillStyle = _box ? (g.done ? (w.ok ? "#14532b"
                                    : (i === g.chosenLane ? "#7a2411" : "#4a3f2c")) : "#2e2410")
                         : (g.done&&g.reveal>0 ? (w.ok?"#d8ffee":"#ffd9d0") : "#fff4de");
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.save(); ctx.globalAlpha *= MR_wordFade;
    ctx.fillText(w.t, cx, py+fs*0.06);
    ctx.restore();

    /* [r53] No verdict mark. A gold star and a red cross were stamped over the two signs at
       the exact moment the child should be reading the words on them - the feedback covered
       the thing it was feedback about. The gate's own pop, glow, shake and grey say the same
       and leave the words legible. */
  }
  ctx.restore();
}
function roundRect(x,y,w,h,r){
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

/* ---- अपनी कला (assets/img) — मिले तो वही, वरना बना हुआ शेर ---- */
/* ======================= ART LAYER =======================
   [r38] Painted assets instead of code-drawn ones - and only where a file is actually there.

   Every slot below falls back to the drawing the game already does. That is not timidity: the
   brief says "most of the images" are made, so a half-filled folder is the NORMAL state here,
   not an error case. A missing file must look like today's game, never like a hole.

   Filenames and sizes are exactly the ones in the art spec, so the files can be dropped into
   assets/MatraRunner/ with no renaming:

     swifty_run.webp     1076x420   4 frames of 269x420, back view run cycle
     swifty_lean_left.webp         swifty_lean_right.webp
     swifty_stumble.webp           swifty_cheer.webp
     bg_sky.webp          1920x720   bg_temples.png 1920x500   bg_canopy.png 1920x300
     tex_grass.webp        512x512   tex_path.webp  512x512    (both tile)
     tree_1..3.png         400x600   bush_1..2.png 400x250     pillar_1..2.png 250x600
     gate_neutral.png      600x800   gate_correct.png  gate_wrong.png   plate.png 600x220
     coin_spin.png         768x128   6 frames of 128x128       coin.png
     ui_*.png / heart_*.png / star_*.png / ico_*.png           (the HUD is DOM, see below)

   The HUD is HTML, not canvas, so its art is handed to CSS as custom properties on .mr-root.
   Each rule reads `var(--mr-x, <what it does now>)`, so an absent file leaves today's styling
   untouched - no class toggling, no flash while loading. */
(function(){
  "use strict";
  var DIR = "assets/MatraRunner/";
  var A = {};                       // name -> HTMLImageElement, only once it has really loaded

  /* name: [file, framesAcross] */
  var SHEET = {
    /* [r39] The hero is SWIFTY - the same bird the child has followed for seventeen screens.
       A tiger was specified, but a second mascot appearing once, in the last activity, reads
       as a different game; the run cycle is four frames on a common baseline. */
    run:      ["swifty_run.webp", 16],
    leanL:    ["swifty_lean_left.webp", 1],
    leanR:    ["swifty_lean_right.webp", 1],
    stumble:  ["swifty_stumble.webp", 1],
    cheer:    ["swifty_cheer.webp", 1],
    /* the reference sheet's two end-of-run poses, seen from the FRONT - the run poses are all
       back views, and at the moment the run stops the child should finally see her face */
    fall:     ["swifty_fall.webp", 16],
    hit:      ["swifty_hit.webp", 1],
    happy:    ["swifty_happy.webp", 1],
    sky:      ["bg_sky.webp", 1],
    /* [r68] the valley: its poster frame (shown until the video can play), and the bridge */
    valley:   ["bg_valley.webp", 1],
    deck:     ["bridge_deck.webp", 1],
    post:     ["bridge_post.webp", 1],
    wall:     ["bridge_wall.webp", 1],
    ring:     ["portal_ring.webp", 1],
    mountains:["bg_mountains.webp", 1],
    hills:    ["bg_hills.webp", 1],
    grass:    ["tex_grass.webp", 1],
    path:     ["tex_path.webp", 1],
    tree1:    ["tree_1.webp", 1], tree2: ["tree_2.webp", 1], tree3: ["tree_3.webp", 1],
    bush1:    ["bush_1.webp", 1], bush2: ["bush_2.webp", 1],
    pillar1:  ["pillar_1.webp", 1], pillar2: ["pillar_2.webp", 1],
    gateN:    ["gate_neutral.webp", 1],
    gateC:    ["gate_correct.webp", 1],
    gateW:    ["gate_wrong.webp", 1],
    plate:    ["plate.webp", 1],
    rail:     ["rail.webp", 1],
    hedge:    ["hedge.webp", 1],
    lantern:  ["lantern.webp", 1],
    coinSpin: ["coin.webp", 1],
    heart:    ["heart_full.webp", 1], heartOff: ["heart_empty.webp", 1],
    star:     ["star_full.webp", 1],  starOff:  ["star_empty.webp", 1],
  };
  /* The panel/button/chip art was never drawn, so the HUD keeps its own styling for those.
     Hearts and stars ARE drawn, but they are swapped in from hud() rather than through a CSS
     variable: an <img> only appears once the file has really loaded, so a missing or slow
     file leaves the glyph that is there today instead of an empty box. */
  var UI = {
    "--mr-ui-panel": "ui_banner.webp",   /* the long wooden banner behind the prompt */
    "--mr-ui-badge": "ui_badge.webp",    /* the round wooden medallion the matra sits in */
    "--mr-ui-btn":   "ui_btn.webp"       /* the little wooden key */
    /* --mr-ui-board is gone: it asked for panel.webp, which has never existed in the repo.
       The level cards draw their board through --mr-card-bg, which points at panel2.webp. */
  };


  window.MR_ART = {
    has: function(n){ return !!A[n]; },
    img: function(n){ return A[n] || null; },
    frames: function(n){ return (SHEET[n] && SHEET[n][1]) || 1; },
    /* one frame of a horizontal strip, as source-rect numbers for drawImage */
    rect: function(n, i){
      var im = A[n]; if(!im) return null;
      var f = this.frames(n), w = im.width / f;
      return [Math.floor((i % f) * w), 0, w, im.height];
    },
    /* the src the DOM can use, only for a slot whose file has loaded */
    src: function(n){ return A[n] ? A[n].src : null; }
  };

  Object.keys(SHEET).forEach(function(name){
    var im = new Image();
    im.onload = function(){
      if(im.naturalWidth > 0) A[name] = im;
      /* [r50] REPAINT THE HUD WHEN ITS ART LANDS. hud() writes <img> hearts only if the files
         have already loaded, and it runs once at boot. That was safe while the game booted in
         the voice-over's callback, six seconds in; booting on arrival, hud() now runs BEFORE
         the hearts exist and the child gets the fallback glyph - which renders white, so the
         row looked like three lives already spent. */
      if((name === "heart" || name === "heartOff") && typeof hud === "function") hud();
    };
    im.src = DIR + SHEET[name][0];
  });

  /* the DOM-side art: each property is only set once its file has loaded */
  var root = document.querySelector(".mr-root") || document.documentElement;
  var uiLeft = Object.keys(UI).length;
  Object.keys(UI).forEach(function(prop){
    var im = new Image();
    im.onload = im.onerror = function(){
      if(im.naturalWidth > 0) root.style.setProperty(prop, 'url("' + DIR + UI[prop] + '")');
      /* the wooden look goes on only when EVERY piece of it is there - half a wooden HUD
         beside half a dark one looks like a bug, and a slow file would show it happening */
      if(uiLeft === 1) window.MR_skinReady = true;   /* [r77] every HUD piece has answered: the curtain may lift */
      if(--uiLeft === 0 && root.style.getPropertyValue("--mr-ui-panel")){
        var WOOD = {
          "--mr-wood-line":   "transparent",      /* the dark ring around each pill */
          "--mr-wood-ink":    "#fff3dc",          /* cream, for the banner's brown grain */
          "--mr-wood-shadow": "0 2px 0 rgba(58,34,12,.8)",
          "--mr-wood-ink2":   "#4a3520",          /* dark, for the badge's cream face */
          "--mr-wood-op":     "1",
          "--mr-badge-sz":    "3.3em",            /* the badge art is round: square its box */
          "--mr-badge-em":    "1.32em",           /* and the glyph has to sit inside it */
          "--mr-badge-sp":    "0.92em",
          "--mr-badge-pad":   "0",
          "--mr-badge-align": "center",
          "--mr-bar-bg":      "rgba(74,53,32,.45)",
          "--mr-bar-line":    "rgba(94,62,30,.85)",
          /* Slices are in the SHIPPED image's own pixels. Measured 225/163/88/155 on the
             949x893 source, scaled by the 760px encode: 180/131/70/124. Using the numbers from
             the source would have cut the frame in the wrong places. */
          /* Measured on the SHIPPED panel.webp (760x715) by taking the widest unbroken run of
             cream on any row, then the longest unbroken run down that row's centre. The first
             attempt used one scan line through the middle, which ran off the bottom of the
             board and onto the tan stone base below it - that passes for cream, so the face
             came out 24% too tall and every line of text landed on the posts.
             Face: 16.3%/17.1% in from the sides, 25.2% down, 34.0% up. Padding resolves
             against WIDTH, so the vertical pair is divided by the board's aspect. */
          "--mr-card-bg":     'url("' + DIR + 'panel3.webp") center/100% 100% no-repeat',
          "--mr-card-ar":     "840 / 565",
          /* measured off the shipped panel3.webp: the cream face sits 18.2% down, 14.5%
             up and 14.2%/10.2% in, as fractions of the card's WIDTH (which is what CSS
             padding resolves against). A little extra all round keeps the text off the frame. */
          "--mr-card-pad":    "20% 12% 16.5% 16%",
          "--mr-card-bw":     "0",
          "--mr-card-bc":     "transparent",
          "--mr-card-r":      "0",
          "--mr-card-ink":    "#4a3520",
          "--mr-card-head":   "#a85d12",
          "--mr-card-sh":     "0 1px 0 rgba(255,255,255,.55)",
          "--mr-tally-bg":    "rgba(74,53,32,.10)",
          "--mr-tally-line":  "rgba(74,53,32,.18)"
        };
        Object.keys(WOOD).forEach(function(k){ root.style.setProperty(k, WOOD[k]); });
      }
    };
    im.src = DIR + UI[prop];
  });
})();

const IMG = {};
["character.svg"].forEach(f=>{
  const i = new Image();
  i.onload = ()=>{ if(!IMG.char || f.endsWith(".png")) IMG.char = i; };
  i.src = "assets/MatraRunner/" + f;
});
(function(){ const i=new Image(); i.onload=()=>IMG.coin=i; i.src="assets/MatraRunner/coin.svg"; })();

/* ---- शेर का बच्चा (tiger cub, seen from behind) ---- */
function drawTiger(){
  /* [r38] the painted hero, with a real run cycle, when tiger_run.png is present */
  if(window.MR_drawTigerArt && MR_drawTigerArt()) return;
  if(IMG.char) return drawTigerImage();
  const x = laneX(G.laneF, 1), y = groundY();
  const run = G.mode==="play" ? G.t*13 : G.t*5;
  const bob = Math.abs(Math.sin(run))*6*S;
  const lean = (G.targetLane - G.laneF)*0.55;
  const u = S*1.05;

  // shadow
  ctx.save();
  ctx.fillStyle="rgba(0,0,0,.34)";
  ctx.beginPath(); ctx.ellipse(x, y+4*u, 46*u, 13*u, 0,0,7); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y-bob);
  ctx.rotate(-lean*0.16);

  // tail
  const tw = Math.sin(run*0.7)*0.5;
  ctx.strokeStyle="#f0913c"; ctx.lineWidth=9*u; ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(0,-52*u);
  ctx.quadraticCurveTo(26*u*tw, -92*u, 40*u*tw, -118*u);
  ctx.stroke();
  ctx.strokeStyle="#2a1a12"; ctx.lineWidth=9*u;
  ctx.beginPath(); ctx.moveTo(34*u*tw,-108*u); ctx.lineTo(40*u*tw,-118*u); ctx.stroke();

  // back legs
  for(const side of [-1,1]){
    const ph = Math.sin(run + (side<0?0:Math.PI));
    ctx.fillStyle="#e07f2c";
    ctx.save();
    ctx.translate(side*17*u, -20*u);
    ctx.rotate(ph*0.32);
    roundRect(-9*u, 0, 18*u, 26*u, 8*u); ctx.fill();
    ctx.fillStyle="#3b2418";
    roundRect(-9*u, 18*u, 18*u, 9*u, 5*u); ctx.fill();
    ctx.restore();
  }

  // cape
  const flap = Math.sin(run*0.9)*0.24;
  ctx.fillStyle="rgba(200,44,62,.92)";
  ctx.beginPath();
  ctx.moveTo(-26*u,-74*u);
  ctx.quadraticCurveTo(-46*u+flap*22*u, -42*u, -20*u+flap*18*u, -12*u);
  ctx.quadraticCurveTo(0,-24*u, 20*u+flap*18*u, -12*u);
  ctx.quadraticCurveTo(46*u+flap*22*u, -42*u, 26*u, -74*u);
  ctx.closePath(); ctx.fill();

  // body
  const bg = ctx.createLinearGradient(0,-78*u,0,-16*u);
  bg.addColorStop(0,"#ffa94d"); bg.addColorStop(1,"#e07f2c");
  ctx.fillStyle=bg;
  ctx.beginPath(); ctx.ellipse(0,-46*u, 30*u, 34*u, 0,0,7); ctx.fill();
  // stripes
  ctx.strokeStyle="#33200f"; ctx.lineWidth=5*u; ctx.lineCap="round";
  for(let i=0;i<3;i++){
    const yy = -64*u + i*17*u;
    ctx.beginPath();
    ctx.moveTo(-24*u, yy); ctx.quadraticCurveTo(-12*u, yy+6*u, -6*u, yy+2*u); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(24*u, yy); ctx.quadraticCurveTo(12*u, yy+6*u, 6*u, yy+2*u); ctx.stroke();
  }
  // armour
  ctx.fillStyle="#f3c33f";
  roundRect(-24*u,-62*u,48*u,17*u,7*u); ctx.fill();
  ctx.fillStyle="#c9971d"; roundRect(-24*u,-49*u,48*u,5*u,3*u); ctx.fill();
  ctx.fillStyle="#43b8ff";
  ctx.beginPath(); ctx.arc(0,-54*u, 7*u, 0,7); ctx.fill();
  ctx.fillStyle="rgba(255,255,255,.75)";
  ctx.beginPath(); ctx.arc(-2*u,-56*u, 2.4*u, 0,7); ctx.fill();
  // shoulder pads
  for(const side of [-1,1]){
    ctx.fillStyle="#f3c33f";
    ctx.beginPath(); ctx.ellipse(side*29*u,-64*u, 12*u, 10*u, side*0.3,0,7); ctx.fill();
    ctx.fillStyle="#c9971d";
    ctx.beginPath(); ctx.ellipse(side*29*u,-61*u, 12*u, 4*u, side*0.3,0,7); ctx.fill();
  }

  // head
  const hy2 = -96*u + Math.sin(run*2)*2*u;
  ctx.fillStyle="#ffb055";
  ctx.beginPath(); ctx.ellipse(0,hy2, 25*u, 23*u, 0,0,7); ctx.fill();
  // ears
  for(const side of [-1,1]){
    ctx.fillStyle="#e78a34";
    ctx.beginPath(); ctx.ellipse(side*18*u, hy2-17*u, 9*u, 10*u, side*0.35,0,7); ctx.fill();
    ctx.fillStyle="#f8b8c0";
    ctx.beginPath(); ctx.ellipse(side*18*u, hy2-16*u, 4.6*u, 5.4*u, side*0.35,0,7); ctx.fill();
  }
  // head stripes
  ctx.strokeStyle="#33200f"; ctx.lineWidth=4.2*u;
  ctx.beginPath(); ctx.moveTo(-6*u,hy2-20*u); ctx.lineTo(-8*u,hy2-11*u); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6*u,hy2-20*u);  ctx.lineTo(8*u,hy2-11*u);  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-20*u,hy2-2*u); ctx.lineTo(-12*u,hy2-1*u); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20*u,hy2-2*u);  ctx.lineTo(12*u,hy2-1*u);  ctx.stroke();
  // cheek fluff peeking
  ctx.fillStyle="#fff1dc";
  ctx.beginPath(); ctx.ellipse(-21*u,hy2+9*u, 8*u,6*u, .5,0,7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(21*u,hy2+9*u, 8*u,6*u, -.5,0,7); ctx.fill();
  // helmet band
  ctx.fillStyle="#f3c33f";
  ctx.beginPath(); ctx.ellipse(0,hy2-9*u, 25*u, 9*u, 0, Math.PI*1.04, Math.PI*1.96); ctx.fill();

  ctx.restore();
}

function drawTigerImage(){
  const x = laneX(G.laneF, 1), y = groundY();
  const run = G.mode==="play" ? G.t*13 : G.t*5;
  const bob = Math.abs(Math.sin(run))*6*S;
  const lean = (G.targetLane - G.laneF)*0.55;
  const h = 150*S, w = h * (IMG.char.width/IMG.char.height || 0.8);
  ctx.save();
  ctx.fillStyle="rgba(0,0,0,.34)";
  ctx.beginPath(); ctx.ellipse(x, y+4*S, w*0.42, 13*S, 0,0,7); ctx.fill();
  ctx.translate(x, y-bob); ctx.rotate(-lean*0.16);
  ctx.drawImage(IMG.char, -w/2, -h, w, h);
  ctx.restore();
}

/* ---- the painted versions of each draw, used only when their file is present ----
   Each one WRAPS the existing function rather than replacing it, so the code-drawn game is
   still there underneath and a missing file costs nothing. */
(function(){
  "use strict";
  var ART = window.MR_ART;

  /* --- sky, ridge, treeline: three layers, each shifted by its own share of the pan ---
     The depths are small and they differ by about a factor of two each, which is what reads
     as distance. Every layer is drawn WIDER than the canvas by the most it can ever move, so
     panning can never expose the edge of a backdrop - the alternative, letting it move within
     its own width, means the sky ends somewhere on screen. */
  /* [r58] COVER, NOT STRETCH. The sky band is about 265px tall on a 1382px screen - roughly
     5:1 - and the painting is 2.4:1, so drawing it to fit squashed it to less than half its
     height: the mountains came out squat and the clouds smeared. This takes the slice of the
     picture that has the destination's shape and crops the rest, anchored so the part that
     matters stays (the horizon for the sky, the base for the treeline).
     `squash` allows a little distortion before cropping - at zero the treeline band would keep
     a sliver of its own height and lose the crowns entirely. */
  function layer(img, top, h, depth, anchor, squash){
    var pad = LANE_W() * depth * 0.6;
    var dx  = -camLane() * LANE_W() * depth;
    var dw = W + pad*2, dh = h;
    var ia = img.width/img.height, da = dw/dh;
    var want = Math.min(da, ia*(squash||1));        /* how wide a slice to take */
    var sw = img.width, sh = img.height, sx = 0, sy = 0;
    if(ia > want){ sw = img.height*want; sx = (img.width-sw)*0.5; }
    else          { sh = img.width/want; sy = (img.height-sh)*(anchor===undefined?0.5:anchor); }
    ctx.drawImage(img, sx, sy, sw, sh, dx - pad, top, dw, dh);
  }

  /* [r58] THE CUT-OUT LAYERS CANNOT BE CROPPED. The ridge and the treeline are keyed shapes
     trimmed tight to their own ink, so taking a slice of them to fit a shallow band cuts
     straight through the silhouette and leaves a ruled line across the sky - which is exactly
     what appeared where the mountains met the treeline.
     Scaled to the band's height they come out narrower than the screen, so they are repeated
     across it, every other copy mirrored. A mirrored repeat of a mountain range or a canopy
     reads as more of the same range; a butted repeat reads as a seam. The mirrored pair is
     composed once per size and re-used, not flipped per frame. */
  var tiles = {};
  function mirrorPair(img, h){
    var key = img.src + "|" + Math.round(h);
    if(tiles[key]) return tiles[key];
    var tw = Math.max(2, Math.round(h * (img.width/img.height)));
    var c = document.createElement("canvas");
    c.width = tw*2; c.height = Math.round(h);
    var g = c.getContext("2d");
    g.drawImage(img, 0, 0, tw, c.height);
    g.save(); g.translate(tw*2, 0); g.scale(-1, 1);
    g.drawImage(img, 0, 0, tw, c.height); g.restore();
    tiles = {}; tiles[key] = c;             /* one size is live at a time; drop the rest */
    return c;
  }
  function band(img, top, h, depth){
    var pad = LANE_W() * depth * 0.6;
    var dx  = -camLane() * LANE_W() * depth;
    var pair = mirrorPair(img, h), pw = pair.width;
    var x0 = dx - pad, x1 = W + pad;
    var start = x0 - ((x0 % pw) + pw) % pw;
    for(var x = start; x < x1; x += pw) ctx.drawImage(pair, x, top, pw, h);
  }
  /* [r68] YASIR'S VALLEY. A muted, looping, inline video, drawn into the canvas every frame.
     Only the waterfalls move in it; the loop is 9 s and seamless (prepare_bridge.py cross-fades
     its last second into its first). It is drawn through the canvas rather than laid behind it
     as a DOM element so the screen shake, the vignette and everything else keep working the way
     they always have, with no second layer to keep in step.
     THE ANCHOR: the sun's centre is at 0.525 of the frame's width and its lower edge - the
     horizon - at 0.40 of its height, measured off the first frame. That point is pinned to the
     game's vanishing point, so the bridge runs into the sun. */
  var VALLEY_CX = 0.525, VALLEY_HY = 0.40;
  var vid = document.createElement("video");
  vid.muted = true; vid.defaultMuted = true; vid.loop = true; vid.playsInline = true;
  vid.preload = "auto";
  vid.setAttribute("muted", ""); vid.setAttribute("playsinline", ""); vid.setAttribute("webkit-playsinline", "");
  vid.src = "assets/MatraRunner/bg_valley.mp4";   /* this closure has no DIR; same folder as the art */
  var vidAsked = 0;
  function valleyFrame(){
    /* ask to play at most once a second while paused: play() returns a promise that rejects if
       the browser wants a gesture, and asking every frame would only flood the console */
    if(vid.paused && G.mode !== "over"){
      var now = Date.now();
      if(now - vidAsked > 1000){ vidAsked = now; var pr = vid.play(); if(pr && pr.catch) pr.catch(function(){}); }
    }
    if(vid.readyState >= 2 && vid.videoWidth) return vid;
    return ART.has("valley") ? ART.img("valley") : null;
  }
  /* stop it with the music when the lesson leaves this screen - a looping video in memory keeps
     decoding, and on a tablet that is battery the child is not getting anything for */
  var _audioStop = window.MR_audioStop;
  window.MR_audioStop = function(){ try{ vid.pause(); }catch(e){} if(_audioStop) _audioStop(); };

  window.MR_drawSky = function(){
    var hy = horizonY();
    var vf = bridgeOn() ? valleyFrame() : null;
    if(vf){
      var vw = vf.videoWidth || vf.width, vh = vf.videoHeight || vf.height;
      /* cover the screen with the sun pinned to (W/2, horizon) */
      var sc = Math.max(W / (2 * Math.min(VALLEY_CX, 1 - VALLEY_CX) * vw),
                        hy / (VALLEY_HY * vh), (H - hy) / ((1 - VALLEY_HY) * vh));
      ctx.drawImage(vf, W/2 - VALLEY_CX*vw*sc, hy - VALLEY_HY*vh*sc, vw*sc, vh*sc);
      return true;
    }
    if(!ART.has("sky")) return false;
    layer(ART.img("sky"), 0, hy + 2, 0.045, 0.62, 2.4);
    /* the ridge and the treeline keep their own proportions and repeat across */
    if(ART.has("mountains")) band(ART.img("mountains"), hy - hy*0.52, hy*0.52, 0.10);
    if(ART.has("hills"))     band(ART.img("hills"),     hy - hy*0.30, hy*0.34, 0.20);
    return true;
  };

  /* --- ground: drawn in depth bands, so the floor has perspective ---------------------
     For each band of screen rows we invert the projection to get the world depth z that band
     shows, then set a transform that places texture row V exactly at that screen row and
     scales texels by the depth foreshortening p. A fixed point on the ground therefore keeps
     the same texture coordinate as it approaches, which is what makes it rush past the
     runner's feet and crawl at the horizon.

     No clip per band, and no offscreen strip: each band's fillRect is bounded to that band in
     TEXTURE space, and the pattern is transformed by the CTM, so one fill paints one band
     correctly tiled. That keeps the whole floor at about 160 fills a frame. */
  var grassPat = null, pathPat = null, grassFor = null, pathFor = null;
  var BAND = 4;                       // screen rows per band; below ~5 the stepping is invisible
  var gcv = null, gcx = null;         // the floor's own canvas, at CSS resolution

  /* screen pixels of depth, at the runner's feet, per unit of z. Everything about the floor's
     scale follows from this one number, so the texture cannot drift out of step with the
     projection the gates and the railing are drawn with. */
  function isoZ(){ return (groundY() - horizonY()) * K; }
  function depthAt(y){                       // invert proj(): screen row -> world depth
    var p = (y - horizonY()) / (groundY() - horizonY());
    return { p: p, z: (1/p - 1) / K };
  }

  /* [r69] k = the offscreen's pixel ratio (1 = CSS pixels, as the old road always used), and
     bandH = CSS rows per band. The bridge deck passes DPR and 2: at CSS resolution on a 2x screen
     the deck was painted at half the display's resolution and stretched, and 4-row bands drew each
     diagonal slab joint as a staircase of 8-device-pixel steps. */
  function bands(g2, pat, base, texH, halfLanes, kpx, bandH){
    kpx = kpx || 1; var B = bandH || BAND;   /* kpx, NOT k: k is this function's own tile-wrap offset below */
    var hy = horizonY(), gy = groundY();
    var vz = isoZ() / base;                  // texture rows per unit z: isotropic at the feet
    for(var y = hy; y < H; y += B){
      var lo = depthAt(y + B), hi = depthAt(y);   // lo = nearer/lower, hi = farther/higher
      if(hi.p < 0.012 || lo.p <= 0) continue;        // the last slice into the horizon
      var vLo = (lo.z + G.ground) * vz, vHi = (hi.z + G.ground) * vz;
      var span = vHi - vLo;                          // texture rows this band has to show
      if(!(span > 0) || !isFinite(span)) continue;
      var sx = ((lo.p + hi.p) * 0.5) * base;         // across the track: texels scale with p
      if(sx < 0.04) continue;
      var sy = B / span;                          // along it: with p squared, via the span
      /* wrapped to whole tiles - the pattern is periodic, so this is invisible, and it keeps
         the numbers small enough that a long session stays exact */
      var k = Math.floor(vLo / texH) * texH;
      vLo -= k;
      /* v grows away from the camera while screen y grows toward it, hence the negative sy.
         The offscreen holds only the ground, so hy comes off the vertical placement. */
      g2.setTransform(sx*kpx, 0, 0, -sy*kpx, worldX(0, lo.p)*kpx, ((y + B - hy) + vLo*sy)*kpx);
      g2.fillStyle = pat;
      var half = halfLanes ? LANE_W() * lo.p * halfLanes : W;
      g2.fillRect(-half/sx - 2, vLo, (half*2)/sx + 4, span + 1/sy);
    }
    g2.setTransform(1, 0, 0, 1, 0, 0);
  }

  var deckPat = null, deckFor = null;
  /* [r68] THE DECK. The same projection the road used, with the slab tile, and NOTHING outside
     it: off the bridge the valley shows, so the offscreen is cleared, not filled. The deck's edges
     run straight to the vanishing point all the way to the foot of the screen - the parapet does,
     and a deck that went vertical under it (the old road stopped widening at the runner's line)
     would leave a sliver of valley showing beneath the wall. */
  function drawDeck(){
    var hy = horizonY(), gy = groundY(), gh = Math.max(1, Math.round(H - hy + 2));
    var gw = Math.max(1, Math.round(W));
    if(!gcv){ gcv = document.createElement("canvas"); gcx = gcv.getContext("2d"); }
    /* [r69] at the display's own resolution: see bands() */
    var kd = Math.max(1, Math.min(3, DPR || 1));
    var dw = Math.round(gw * kd), dh = Math.round(gh * kd);
    if(gcv.width !== dw || gcv.height !== dh){
      gcv.width = dw; gcv.height = dh;
      grassPat = pathPat = grassFor = pathFor = null; deckPat = deckFor = null;
    }
    var di = ART.img("deck");
    if(deckFor !== di){ deckPat = gcx.createPattern(di, "repeat"); deckFor = di; }
    gcx.setTransform(1, 0, 0, 1, 0, 0);
    gcx.clearRect(0, 0, dw, dh);
    gcx.setTransform(kd, 0, 0, kd, 0, 0);        /* the clip path below is in CSS pixels */
    /* [r69] 3% wider than the wall's foot line: the deck's clip and the wall's clip are both
       antialiased, and where two soft edges share a line the lake shows through the seam as a
       blue hairline. Tucked under the wall, the deck's edge is hidden and the wall's blends
       onto stone. */
    var RH = roadHalf() * 1.03, pFar = proj(26), pFoot = (H - hy) / (gy - hy);
    var wFar = LANE_W()*pFar.p*RH, wFoot = LANE_W()*pFoot*RH;
    var cFar = worldX(0, pFar.p), cFoot = worldX(0, pFoot);
    gcx.save();
    gcx.beginPath();
    gcx.moveTo(cFar - wFar, pFar.y - hy); gcx.lineTo(cFar + wFar, pFar.y - hy);
    gcx.lineTo(cFoot + wFoot, gh);        gcx.lineTo(cFoot - wFoot, gh);
    gcx.closePath(); gcx.clip();
    /* 0.6: about five slabs across the deck at the runner's line, as in his mockup */
    /* 1-row bands: a band's single across-track scale is off by (offset x rows) / (p x ground
       depth), about 1.2 px at the deck's edge per CSS row - at 2 rows the slab joints zig-zagged */
    bands(gcx, deckPat, 0.6, di.height, RH + 0.1, kd, 1);
    gcx.restore();
    ctx.drawImage(gcv, 0, hy, W, gh);
  }

  /* [r68] THE PARAPET AND THE POSTS.
     The wall's inner face is an upright plane running along the deck's edge. Canvas cannot map a
     picture onto a perspective plane, so it is drawn in thin upright slices - each slice is one
     depth, so its texture column is that depth's, and it is scaled to the wall's height THERE.
     The whole face is clipped to its exact outline first (a straight line to the vanishing point
     along the foot, another along the top), so the slices' square tops never show as steps.
     The texture scrolls with the deck: its column comes from the same travelled distance. */
  var WALL_H = 0.44, POST_H = 0.74, POST_EVERY = 4, SLICE = 5;   /* chunky, as in his mockup;
     [r69] 5px slices, each sheared to the face's mid-height slope: the leftover step at the top
     and foot of the wall is SLICE x the slope difference / 2, under a pixel at 5 */
  function edgeX(side, p){ return worldX(side * roadHalf(), p); }
  /* [r69] pre-shrunk copies of the wall texture: canvas has no mipmaps, so a slice squeezed to a
     few pixels samples the full-size art sparsely and shimmers as it scrolls */
  var wallMips = null, wallMipsFor = null;
  function wallMip(scale){
    var w = ART.img("wall");
    if(wallMipsFor !== w){
      wallMips = [w]; wallMipsFor = w;
      var src = w;
      for(var i = 0; i < 2; i++){
        var c = document.createElement("canvas");
        c.width = Math.max(2, Math.round(src.width / 2)); c.height = Math.max(2, Math.round(src.height / 2));
        var g = c.getContext("2d"); g.imageSmoothingQuality = "high";
        g.drawImage(src, 0, 0, c.width, c.height);
        wallMips.push(c); src = c;
      }
    }
    /* scale = drawn height / full texture height */
    var lvl = scale < 0.25 ? 2 : scale < 0.5 ? 1 : 0;
    return wallMips[lvl];
  }
  var SHOW_POSTS = false;          /* [r69] Yasir: "remove the pillars" */
  function drawParapets(){
    var wall = ART.img("wall"), post = ART.img("post");
    var hy = horizonY(), gy = groundY(), LW = LANE_W();
    var wH = WALL_H * LW;
    var texPerZ = ((gy - hy) * K) * (wall.height / wH);        // full-size texture px per unit depth
    var p0 = 0.012;
    var pTop = (H - hy) / Math.max(1, (gy - hy) - wH);
    var pMax = Math.min(3.0, pTop);
    var footY = function(p){ return hy + (gy - hy) * p; };
    var topY  = function(p){ return footY(p) - wH * p; };
    for(var si = 0; si < 2; si++){
      var side = si ? 1 : -1;
      var x0 = edgeX(side, p0), x1 = edgeX(side, pMax);
      ctx.save();
      /* compose with whatever is current - the DPR scale AND the screen shake - rather than
         replacing it, or the walls would stand still while the rest of the frame shakes */
      var base = ctx.getTransform();
      ctx.beginPath();
      ctx.moveTo(x0, footY(p0)); ctx.lineTo(x1, footY(pMax));
      ctx.lineTo(x1, topY(pMax)); ctx.lineTo(x0, topY(p0));
      ctx.closePath(); ctx.clip();
      var span = Math.abs(roadHalf() * LW - side * camLane() * LW);
      var dp = SLICE / Math.max(1, span);
      for(var pa = p0; pa < pMax; pa += dp){
        var pb = Math.min(pMax, pa + dp);
        var xa = edgeX(side, pa), xb = edgeX(side, pb);
        if(Math.max(xa, xb) < -2 || Math.min(xa, xb) > W + 2) continue;
        var za = (1/pa - 1) / K, zb = (1/pb - 1) / K;
        var hA = wH * pa, hB = wH * pb, hm = (hA + hB) * 0.5;
        var tex = wallMip(hm / wall.height), k = tex.height / wall.height;
        var tw = tex.width;
        var u = ((zb + G.ground) * texPerZ * k) % tw; if(u < 0) u += tw;
        var du = (za - zb) * texPerZ * k;
        if(!(du > 0.01)) continue;
        /* a slice may straddle the texture's wrap point: draw it in two pieces */
        var pieces = u + du <= tw ? [[u, du, 0]] : [[u, tw - u, 0], [0, du - (tw - u), (tw - u) / du]];
        for(var q = 0; q < pieces.length; q++){
          var pu = pieces[q][0], pdu = pieces[q][1], f0 = pieces[q][2], f1 = f0 + pdu / du;
          /* the slice runs from depth pb (texture column u, screen xb) towards pa (u+du, xa);
             this piece covers the fraction f0..f1 of that run */
          var sx0 = xb + (xa - xb) * f0, sx1 = xb + (xa - xb) * f1;
          /* the face's MID-HEIGHT line, not its top: top and foot run to the vanishing point at
             different slopes, and an affine slice can follow only one. Following the top left the
             lowest courses stepping by the whole difference (3.6 px a slice); following the middle
             splits it, half above and half below, and at 5 px slices that is under a pixel. */
          var mB = (topY(pb) + footY(pb)) * 0.5, mA = (topY(pa) + footY(pa)) * 0.5;
          var my0 = mB + (mA - mB) * f0, my1 = mB + (mA - mB) * f1;
          var hh  = hB + (hA - hB) * ((f0 + f1) * 0.5);
          var ax = (sx1 - sx0) / pdu, ay = (my1 - my0) / pdu, dy = hh / tex.height;
          ctx.setTransform(base);
          ctx.transform(ax, ay, 0, dy, sx0 - ax * pu, my0 - ay * pu - hh * 0.5);
          /* half a texel of overlap each side hides the hairline seam between neighbours */
          ctx.drawImage(tex, pu, 0, pdu, tex.height, pu - 0.5, -0.5, pdu + 1, tex.height + 1);
        }
      }
      ctx.setTransform(base);
      ctx.restore();
    }
    if(!SHOW_POSTS) return;
    /* the posts, far to near, both sides - drawn over the walls they stand in */
    var aspect = post.width / post.height;
    for(var i = 0; i < G.rails.length; i++){
      var r = G.rails[i];
      if(r.k % POST_EVERY) continue;
      if(r.z < -0.045) continue;
      var pr = proj(r.z), p = pr.p;
      if(p < 0.05) continue;
      var ph = POST_H * LW * p, pw = ph * aspect;
      for(var sj = 0; sj < 2; sj++){
        var sd = sj ? 1 : -1;
        var cx = edgeX(sd, p) + sd * pw * 0.12;
        if(cx + pw < 0 || cx - pw > W) continue;
        if(sd > 0){
          ctx.save(); ctx.translate(cx, 0); ctx.scale(-1, 1);
          ctx.drawImage(post, -pw/2, pr.y - ph + ph*0.02, pw, ph);
          ctx.restore();
        } else {
          ctx.drawImage(post, cx - pw/2, pr.y - ph + ph*0.02, pw, ph);
        }
      }
    }
  }
  window.MR_drawBridge = function(){
    if(!bridgeOn()) return false;
    drawDeck();
    drawParapets();
    return true;
  };

  window.MR_drawGroundArt = function(){
    if(!ART.has("grass")) return false;
    var hy = horizonY(), gh = Math.max(1, Math.round(H - hy + 2));
    var gw = Math.max(1, Math.round(W));
    if(!gcv){ gcv = document.createElement("canvas"); gcx = gcv.getContext("2d"); }
    if(gcv.width !== gw || gcv.height !== gh){
      gcv.width = gw; gcv.height = gh;
      grassPat = pathPat = grassFor = pathFor = null;   // patterns belong to a context
    }

    var g = ART.img("grass");
    if(grassFor !== g){ grassPat = gcx.createPattern(g, "repeat"); grassFor = g; }
    /* A BACKSTOP under the bands. However far up the bands are taken, the last rows into the
       horizon foreshorten past the point where a band can be drawn at all, and whatever is
       left shows the canvas through - a dark strip along the skyline, exactly where the eye is
       looking. One flat fill of the verge's own colour costs nothing and closes it. */
    gcx.setTransform(1, 0, 0, 1, 0, 0);
    gcx.fillStyle = "#3f6b2c";
    gcx.fillRect(0, 0, gw, gh);
    /* 0.60: at a larger scale one tile covered half the screen near the runner, so by
       mid-distance foreshortening had squeezed its detail away and the verge read as a lawn. */
    bands(gcx, grassPat, 0.60, g.height, null);

    if(ART.has("path")){
      var pi = ART.img("path");
      if(pathFor !== pi){ pathPat = gcx.createPattern(pi, "repeat"); pathFor = pi; }
      var pFar = proj(26), pNear = proj(0);
      var wFar = LANE_W()*pFar.p*1.08, wNear = LANE_W()*pNear.p*1.08;
      var cFar = worldX(0, pFar.p), cNear = worldX(0, pNear.p);
      gcx.save();
      /* ONE clip for the road, not one per band: the bands would otherwise stair-step its
         edges by up to BAND pixels, and the eye reads a ragged kerb immediately. */
      gcx.beginPath();
      gcx.moveTo(cFar - wFar, pFar.y - hy); gcx.lineTo(cFar + wFar, pFar.y - hy);
      gcx.lineTo(cNear + wNear, gh);        gcx.lineTo(cNear - wNear, gh);
      gcx.closePath(); gcx.clip();
      bands(gcx, pathPat, 1.55, pi.height, 1.16);
      gcx.restore();
    }

    ctx.drawImage(gcv, 0, hy, W, gh);
    return true;
  };

  /* --- the hero: a real run cycle when the strip is there --- */
  window.MR_drawTigerArt = function(){
    var name = null;
    if(G.mode === "over"){
      /* [r58] THE FALL, PLAYED ONCE AND THEN HELD CRYING. The sheet runs standing -> tumbling
         -> sitting -> sobbing; the first six frames are the collision and must not repeat, so
         it plays straight through and then loops only the tail, where she is already sitting
         and her shoulders are shaking. Looping the whole thing would have her fall over again
         every second, which is comic in the wrong direction. */
      if(ART.has("fall")){
        var ft = (G.t - (G.deadT||G.t)) * 13;
        var last = ART.frames("fall") - 1;
        var f2 = ft < last ? Math.floor(ft) : 9 + (Math.floor(ft - last) % (last - 9 + 1));
        var im2 = ART.img("fall"), r2 = ART.rect("fall", f2);
        var x2 = laneX(G.laneF, 1), y2 = groundY();
        var h2 = 170*S, w2 = h2*(r2[2]/r2[3]);
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,.30)";
        ctx.beginPath(); ctx.ellipse(x2, y2+4*S, w2*0.36, 12*S, 0, 0, 7); ctx.fill();
        ctx.drawImage(im2, r2[0], r2[1], r2[2], r2[3], x2-w2/2, y2-h2, w2, h2);
        ctx.restore();
        return true;
      }
      name = ART.has("hit")   ? "hit"   : (ART.has("stumble") ? "stumble" : null);
    }
    else if(false) name = null;
    else if(G.mode === "win")  name = ART.has("happy") ? "happy" : (ART.has("cheer")   ? "cheer"   : null);
    if(!name){
      var d = G.targetLane - G.laneF;
      if(d < -0.18 && ART.has("leanL")) name = "leanL";
      else if(d > 0.18 && ART.has("leanR")) name = "leanR";
    }
    var frame = 0;
    if(!name){
      if(!ART.has("run")) return false;
      name = "run";
      /* Timed by the CYCLE, not by a frame rate. 13 fps suited the four stills it replaced;
         the delivered sheet has sixteen, and at 13 fps one stride would take a second and a
         quarter - a stroll. A stride is about 0.62s however many frames describe it. */
      /* 1.05s, not 0.62. The shorter stride was set against four stills; sixteen frames of
         a real cycle at that rate is a sprint, and it reads as wrong against a world moving
         at walking pace. */
      var cyc = G.mode === "play" ? 1.05 : 2.2;
      frame = Math.floor(G.t * (ART.frames("run") / cyc)) % ART.frames("run");
    }
    var im = ART.img(name), r = ART.rect(name, frame);
    if(!im || !r) return false;
    var x = laneX(G.laneF, 1), y = groundY();
    /* No synthetic bob when the art is a real cycle: the animation already rises and falls,
       and adding a sine on top of it gives two bounces at different rates. */
    var bob = (name === "run" && ART.frames("run") > 4) ? 0
            : Math.abs(Math.sin(G.t * 13)) * 5 * S;
    var h = 170 * S, w = h * (r[2] / r[3]);
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.34)";
    ctx.beginPath(); ctx.ellipse(x, y + 4 * S, w * 0.40, 13 * S, 0, 0, 7); ctx.fill();
    ctx.drawImage(im, r[0], r[1], r[2], r[3], x - w / 2, y - h - bob, w, h);
    ctx.restore();
    return true;
  };

  /* --- gates: the arch art, with the word still drawn by the game on the blank plate --- */
  window.MR_gateArt = function(state){
    var n = state === "right" ? "gateC" : state === "wrong" ? "gateW" : "gateN";
    return ART.has(n) ? ART.img(n) : (ART.has("gateN") ? ART.img("gateN") : null);
  };
  window.MR_plateArt = function(){ return ART.has("plate") ? ART.img("plate") : null; };
  window.MR_ringArt  = function(){ return ART.has("ring")  ? ART.img("ring")  : null; };
  window.MR_railArt  = function(){ return ART.has("rail")  ? ART.img("rail")  : null; };
  window.MR_hedgeArt = function(){ return ART.has("hedge") ? ART.img("hedge") : null; };


  /* --- coin: the spin sheet --- */
  window.MR_coinFrame = function(){
    if(!ART.has("coinSpin")) return null;
    var f = Math.floor(G.t * 9) % ART.frames("coinSpin");
    return { img: ART.img("coinSpin"), r: ART.rect("coinSpin", f) };
  };

  /* --- roadside decor --- */
  window.MR_decorArt = function(kind, seed){
    var pick = function(list){
      var have = list.filter(function(n){ return ART.has(n); });
      return have.length ? ART.img(have[Math.abs(seed | 0) % have.length]) : null;
    };
    if(kind === "pillar") return pick(["pillar1", "pillar2"]);
    if(kind === "bush")   return pick(["bush1", "bush2"]);
    return pick(["tree1", "tree2", "tree3"]);
  };
})();

function drawFX(){
  for(const p of G.parts){
    ctx.globalAlpha = Math.max(0, Math.min(1,p.life*1.6));
    ctx.fillStyle=p.col;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7); ctx.fill();
  }
  ctx.globalAlpha=1;

  // popups
  let i=0;
  for(const p of G.pops){
    const a = Math.min(1, p.life*2);
    ctx.globalAlpha=a;
    const fs = 30*S;
    ctx.font = "800 "+fs+'px "Baloo 2","Noto Sans Devanagari",sans-serif';
    ctx.textAlign="center"; ctx.textBaseline="middle";
    /* H*0.30, not H*0.47: the gates resolve around H*0.45, so the toast was printing itself
       across the two words at the exact moment the child looks at them. */
    const yy = H*0.30 - i*46*S + (1-a)*14*S;
    ctx.fillStyle="rgba(10,8,24,.72)";
    const w = Math.max(ctx.measureText(p.text).width, ctx.measureText(p.sub||"").width)+40*S;
    roundRect(W/2-w/2, yy-fs*0.9, w, p.sub? fs*2.3 : fs*1.5, 14*S); ctx.fill();
    ctx.fillStyle=p.col; ctx.fillText(p.text, W/2, yy);
    if(p.sub){
      ctx.font = "600 "+(19*S)+'px "Baloo 2","Noto Sans Devanagari",sans-serif';
      ctx.fillStyle="rgba(255,244,222,.85)";
      ctx.fillText(p.sub, W/2, yy+fs*0.95);
    }
    ctx.globalAlpha=1; i++;
  }

  // level banner
  if(G.banner){
    const a = Math.min(1, G.banner.life*1.4);
    ctx.globalAlpha=a;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.font="800 "+(52*S)+'px "Baloo 2","Noto Sans Devanagari",sans-serif';
    /* [r40] A DARK PLATE BEHIND IT. Gold text with a blur shadow was legible over the old
       night scene; over a sunlit jungle canopy it reads as a dark smudge - the level number
       was the one thing on screen the child could not make out. */
    (function(){
      const tw = Math.max(ctx.measureText(G.banner.text).width,
                          ctx.measureText(G.banner.sub||"").width*0.9) + 64*S;
      ctx.fillStyle="rgba(22,14,8,.55)";
      roundRect(W/2-tw/2, H*0.23-46*S, tw, 112*S, 26*S); ctx.fill();
    })();
    ctx.fillStyle="#ffcb45";
    ctx.shadowColor="rgba(0,0,0,.6)"; ctx.shadowBlur=18;
    ctx.fillText(G.banner.text, W/2, H*0.23);
    ctx.font="700 "+(26*S)+'px "Baloo 2","Noto Sans Devanagari",sans-serif';
    ctx.fillStyle="#fff4de";
    ctx.fillText(G.banner.sub, W/2, H*0.23+46*S);
    ctx.shadowBlur=0; ctx.globalAlpha=1;
  }

  if(G.flash>0){
    ctx.fillStyle=G.flashCol; ctx.globalAlpha=Math.min(.35,G.flash);
    ctx.fillRect(0,0,W,H); ctx.globalAlpha=1;
  }
}

/* [r77] THE FIRST FRAME WAITS FOR ITS ART. Measured on a cold load: for ~0.8 s the game drew its
   code-only fallback - the night backdrop, a flat road, the placeholder tiger, a plain HUD - and
   then the art popped in piece by piece. A curtain in the valley's own colours covers the game
   until the pieces the first frame is made of have arrived (capped, so a slow file cannot hold it),
   then lifts. Inline styles: the embed scopes every stylesheet rule under .mr-root. */
let _curtain = null, _curtainUp = true, _curtainT0 = performance.now();
function firstFrameReady(){
  const A = window.MR_ART;
  if(!A) return false;
  return ["valley", "deck", "wall", "run", "ring"].every(k => A.has(k)) && !!window.MR_skinReady;
}
function curtain(){
  if(!_curtainUp) return;
  if(!_curtain){
    const host = document.querySelector(".mr-root") || document.body;
    _curtain = document.createElement("div");
    _curtain.style.cssText = "position:absolute;inset:0;z-index:50;pointer-events:none;" +
      "background:linear-gradient(180deg,#7c5bb4 0%,#f08a6a 42%,#f6c27a 62%,#4f86b8 100%);" +
      "transition:opacity .45s ease;opacity:1";
    host.appendChild(_curtain);
  }
  if(firstFrameReady() || performance.now() - _curtainT0 > 3500){
    _curtainUp = false;
    MR_RAF(() => { _curtain.style.opacity = "0";
      setTimeout(() => { if(_curtain){ _curtain.remove(); _curtain = null; } }, 600); });
  }
}
function render(){
  curtain();
  ctx.setTransform(DPR,0,0,DPR,0,0);
  /* [r51] NOT turning smoothing off here, although the obvious reasoning says to: bilinear
     filtering looks like the expensive part of a sprite, and leaves at close to their own size
     have nothing to gain from it. Measured, switching it off took the trees from 11 ms to 74
     and the rest of the frame from 32 to 73 - the filtered path is the one this rasteriser has
     optimised, and the "cheap" one falls off it. Left on, deliberately. */
  ctx.clearRect(0,0,W,H);
  ctx.save();
  if(G.shake>0){
    ctx.translate((Math.random()-0.5)*16*G.shake*S,(Math.random()-0.5)*12*G.shake*S);
  }
  // sky
  /* [r38] painted sky if the files are there, else the generated backdrop */
  if(!(window.MR_drawSky && MR_drawSky())){
    if(backdrop) ctx.drawImage(backdrop, 0,0, W, horizonY()+2);
  }
  /* [r68] the bridge replaces the ground, the verge, its decor and its railing in one go */
  const _bridge = !!(window.MR_drawBridge && MR_drawBridge());
  if(!_bridge) drawGround();
  /* [r50] THE TREELINE'S SKIRT. The backdrop's treeline stops exactly at the horizon and the
     ground begins there, which leaves a band of open verge between the far hedge and the
     trees - the same flat green, just narrower and higher up. Drawing the treeline again over
     the top of the ground closes it, and it is what that distance looks like anyway: the road
     runs out of the jungle rather than out of a lawn. */
  if(window.MR_ART && MR_ART.has("canopy")){
    const hy2 = horizonY(), sk = (groundY()-hy2)*0.17;
    ctx.drawImage(MR_ART.img("canopy"), 0, hy2 - sk*0.55, W, sk*1.55);
  }
  // far to near
  if(!_bridge) for(const d of G.decor) drawDecor(d);
  /* after the scattered decor and before the gates: the railing is always nearer the camera
     than anything growing out on the verge, and always further than a gate at the same depth */
  if(!_bridge) for(const r of G.rails){ drawHedge(r, r.k); drawRail(r); }
  const items = G.gates.map(g=>({z:g.z,k:"g",o:g}))
             .concat(G.coins.map(c=>({z:c.z,k:"c",o:c})));
  items.sort((a,b)=>b.z-a.z);
  for(const it of items){ if(it.k==="g") drawGate(it.o); else drawCoin(it.o); }
  /* [r41] HORIZON HAZE. The backdrop's treeline ends on a dark edge and the jungle floor
     starts bright directly underneath it, so the join read as a ruled line across the screen.
     A short warm band over the seam is what that distance actually looks like. */
  (function(){
    /* [r49] Reaching further down the verge than before. The ground plane loses its texture
       to foreshortening long before the horizon, and without haze that stretch reads as a flat
       green field rather than as distance - the depth the bands earn is thrown away in the
       one place the eye checks for it. */
    /* [r68] over the valley, not a band across the whole screen - the video has its own air -
       but a glow where the bridge meets the sun, so its far end melts into the light instead
       of stopping on a hard point */
    if(_bridge){
      const hy2 = horizonY(), R = W * 0.16, cx2 = worldX(0, 0);
      const rg = ctx.createRadialGradient(cx2, hy2, 0, cx2, hy2, R);
      rg.addColorStop(0, "rgba(255,214,140,.70)");
      rg.addColorStop(0.45, "rgba(255,200,130,.28)");
      rg.addColorStop(1, "rgba(255,196,130,0)");
      ctx.fillStyle = rg; ctx.fillRect(cx2 - R, hy2 - R, R * 2, R * 2);
      return;
    }
    const hy = horizonY(), band = (groundY()-hy)*0.38;
    const hz = ctx.createLinearGradient(0, hy-band*0.22, 0, hy+band);
    hz.addColorStop(0,    "rgba(255,196,130,0)");
    hz.addColorStop(0.22, "rgba(255,190,125,.30)");
    hz.addColorStop(0.55, "rgba(252,196,142,.15)");
    hz.addColorStop(1,    "rgba(255,196,130,0)");
    ctx.fillStyle = hz; ctx.fillRect(0, hy-band*0.22, W, band*1.22);
  })();
  drawTiger();
  // vignette
  const vg = ctx.createRadialGradient(W/2,H*0.55,H*0.3,W/2,H*0.55,H*0.85);
  /* [r40] .26 and warm, not .55 and near-black: the old value was set for a night scene and
     it drags the corners of a daylight jungle down into mud. */
  vg.addColorStop(0,"rgba(0,0,0,0)"); vg.addColorStop(1,"rgba(40,22,10,.26)");
  ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  drawFX();
  ctx.restore();
}

/* ======================= screens / hud ======================= */
const $ = id => document.getElementById(id);
/* [r77] NO PANELS IN THE GAME. Between levels, at the fall and at the end the screen is VEILED -
   the world and the HUD blur and dim - and only the voice plays. The .screen elements stay (the
   lesson listens for #scWin to know the game is over) but their cards are never shown. */
function veil(on){
  const f = on ? "blur(7px) brightness(.86) saturate(.9)" : "";
  [cvs, document.querySelector(".hud")].forEach(el => { if(!el) return;
    el.style.transition = "filter .35s ease"; el.style.filter = f; });
}
/* run `cb` once the game's voice has nothing left to say - no sooner than minMs, no later than capMs */
function whenVoiceDone(cb, minMs, capMs){
  const t0 = Date.now();
  (function poll(){
    const idle = !VOICE.busy && !VOICE.queue.length;
    const el = Date.now() - t0;
    if((idle && el >= minMs) || el >= capMs){ cb(); return; }
    setTimeout(poll, 100);
  })();
}
/* ...and the lesson's: its instruction for this page is spoken by the engine outside the game */
function whenLessonQuiet(cb, capMs){
  const t0 = Date.now(); let quietSince = 0;
  (function poll(){
    const busy = !!(document.body && document.body.classList.contains("vo-lock"));
    const now = Date.now();
    if(busy) quietSince = 0; else if(!quietSince) quietSince = now;
    if((quietSince && now - quietSince >= 350) || now - t0 >= capMs){ cb(); return; }
    setTimeout(poll, 100);
  })();
}
function hideScreens(){ document.querySelectorAll(".screen").forEach(s=>s.classList.remove("on")); }
function show(id){ hideScreens(); $(id).classList.add("on");
  const c = $(id).querySelector(".card"); if(c) c.style.display = "none"; }
function hud(){
  $("score").textContent = G.score;
  const _hOn  = window.MR_ART && MR_ART.src("heart");
  const _hOff = window.MR_ART && MR_ART.src("heartOff");
  let h="";
  for(let i=0;i<3;i++){
    const live = i<G.hearts;
    h += (_hOn && _hOff) ? '<img alt="" src="'+(live?_hOn:_hOff)+'">'
                         : (live ? "❤" : '<span class="off">❤</span>');
  }
  $("hearts").innerHTML = h;
  const pw = $("pips"), n = (LEVELS[G.level]||{}).gates || 6;
  if(pw){
    if(pw.children.length !== n){
      pw.innerHTML = "";
      for(let i=0;i<n;i++) pw.appendChild(document.createElement("i"));
    }
    for(let i=0;i<n;i++){
      const p = pw.children[i], got = G.pips[i];
      p.classList.toggle("on", got === true);
      p.classList.toggle("miss", got === false);
    }
  }
  if(G.score>G.best){ G.best=G.score; saveBest(); }

}
function levelDone(){
  /* [r77] Yasir: "We don't need instruction panel in the game, when the level ends the screen get
     blurred and only VO plays: वाह! अब इस लेवल को पार कीजिए। + the next target".
     [r79] ...and the voice has the stage to itself: the screen veils and the level-up chime plays
     FIRST, then after a clear beat the two lines are spoken, and the music stays down for the
     whole transition instead of rising in the gap between them. */
  G.mode = "done"; VOICE.clear();
  veil(true); MUSIC.setDuck("veil", true);
  sfxLevel();
  clearTimeout(G.nextT);
  const N = LEVELS[G.level + 1];
  G.nextT = setTimeout(function(){
    if(N){
      VOICE.say("level_next");
      VOICE.say(N.target === U ? "goal_u" : "goal_uu");
      whenVoiceDone(function(){
        veil(false); MUSIC.setDuck("veil", false);
        G.hearts = Math.min(3, G.hearts + 1);
        startLevel(G.level + 1, true);         /* its goal has just been spoken */
      }, 1600, 10000);
    }else{
      VOICE.say("win");
      whenVoiceDone(function(){
        G.mode = "win";
        if(G.score > G.best){ G.best = G.score; saveBest(); }
        show("scWin");                         /* no card - the lesson listens for this to move on */
      }, 1600, 7000);
    }
  }, 1000);
}
function gameOver(){
  G.mode="over"; G.deadT = G.t; hud();     /* the heart she just lost has to leave the row */
  /* [r71] the pratfall: the hit already bonked; a slide whistle while she tumbles, a boing as she
     lands on her seat - and "try again" waits for them rather than being talked over */
  sfxSlideWhistle(0.10);
  sfxBoing(0.72);
  VOICE.clear();
  setTimeout(function(){ if(G.mode === "over") VOICE.say("retry"); }, 1350);
  if(G.score>G.best){ G.best=G.score; saveBest(); }
  const t = G.target===U ? "उ ( ु )" : "ऊ ( ू )";
  $("overTip").textContent = t;
  /* [r77] no card: once she has landed the screen veils while "try again" is spoken, then the
     level restarts */
  clearTimeout(G.nextT);
  G.nextT = setTimeout(function(){ veil(true); }, 2100);
  setTimeout(function(){ veil(false); G.hearts = 3; hud(); startLevel(G.level); }, 6200);
}
function fullReset(){ G.score=0; G.hearts=3; clearTimeout(G.nextT); hud(); }

/* [r54] No button handlers left to write: the cards advance themselves, and the only thing
   the child controls is which lane she runs in - which is the keys and pads below. */

/* ======================= boot ======================= */
let last=0;
function loop(ts){
  const dt = Math.min(0.05, (ts-last)/1000 || 0.016); last=ts;
  update(dt); render(); watchLessonVO();
  MR_RAF(loop);
}
function boot(){
  resize(); seedDecor(); seedRails(); hud();
  /* [r50] STRAIGHT INTO THE GAME. There is no start card any more: the screen arrives, the
     level card names the matra, and the world is already moving - slowly - under the
     instruction. The card and its button stay in the markup because "शुरू से" on the end
     screens still goes back to them. */
  MR_RAF(loop);
  fullReset(); startLevel(0);
}
/* the lesson releases the hold when its instruction clip ends; standalone, nothing calls this
   and the ten-second backstop below lets the game go by itself */
window.MR_begin = function(){ G.hold = false; G.holdT = 0; };
/* A read-only window onto what is actually moving. G.ground accumulates the SAME v the gates,
   the decor and the railing are advanced by, so sampling it over a known interval measures the
   world's real speed - which pixel matching could not do here: the road repeats often enough
   that a frame-to-frame match keeps locking onto the wrong stone. */
window.MR_DEBUG = function(){
  var sc = document.querySelector(".mr-root .screen.on");
  /* the railing is drawn in array order, so "in depth order" is a property of the array -
     checkable from outside rather than inferred from a screenshot */
  var outOfOrder = 0;
  for(var i=1;i<G.rails.length;i++) if(G.rails[i].z > G.rails[i-1].z) outOfOrder++;
  var hz = G.rails.filter(function(r){ return r.k % HEDGE_EVERY === 0; })
                  .map(function(r){ return r.z; }).sort(function(a,b){ return a-b; });
  var gaps = [];
  for(var j=1;j<hz.length;j++) gaps.push(+(hz[j]-hz[j-1]).toFixed(3));
  return { hold: G.hold, holdT: +G.holdT.toFixed(2), ramp: G.ramp, ground: G.ground,
           level: G.level, mode: G.mode, hearts: G.hearts, cleared: G.cleared,
           levels: LEVELS.length, levelNames: LEVELS.map(function(l){ return l.name; }),
           rails: G.rails.length, railsOutOfOrder: outOfOrder,
           hedgeGaps: gaps.filter(function(v,k,a){ return a.indexOf(v)===k; }),
           audio: AC ? { state: AC.state, music: MUSIC.on, bar: MUSIC.bar,
                   bgm: BGM.buf ? +BGM.buf.duration.toFixed(3) : (BGM.failed ? "failed" : (BGM.loading ? "loading" : "idle")),
                   bgmPlaying: !!BGM.src, bgmChannels: BGM.buf ? BGM.buf.numberOfChannels : 0,
                   busGain: MUSBUS ? +MUSBUS.gain.value.toFixed(3) : null,
                         gain: +MUSBUS.gain.value.toFixed(3) } : null,
           screen: sc ? sc.id : "",
           gates: G.gates.map(function(g){
             return { z: +g.z.toFixed(3), ok: g.okLane, done: !!g.done, pin: !!g.pin,
                      word: (g.words[g.okLane] || {}).id, spoken: !!g.spoken, heard: !!g.heard,
                      hue: g.hue }; }),
           waitF: G.waitF == null ? 1 : +G.waitF.toFixed(3), local: LOCAL,
           bgmEl: BGM.el ? { paused: BGM.el.paused, vol: +BGM.el.volume.toFixed(3),
                             t: +BGM.el.currentTime.toFixed(2) } : null };
};
/* one frame, on demand, so the cost of EVERYTHING can be timed - not just the floor, which is
   the part that is easy to reach and the part least likely to be the problem */
window.MR_DEBUG.render = function(){ render(); };
/* Hold the world still so the SAME picture can be drawn repeatedly. Timing a moving scene
   compares different pictures: the trees, the gates and the hedge are all somewhere else by
   the next sample, and the per-layer differences come out noisy enough to go negative. */
window.MR_DEBUG.freeze = function(on){ G.frozen = !!on; };

if(document.fonts && document.fonts.load){
  Promise.all([
    document.fonts.load('700 40px "Baloo 2"', "पुल फूल"),
    document.fonts.load('800 40px "Baloo 2"', "शाबाश")
  ]).then(boot).catch(boot);
  setTimeout(()=>{ if(!last) boot(); }, 2500);
}else boot();
})();

    } catch(err){ try{ console.error('matra-runner:', err); }catch(e){} }
    return function teardown(){
      _dead = true;
      if(_raf) { try{ cancelAnimationFrame(_raf); }catch(e){} }
      _ls.forEach(function(l){ try{ l[0].removeEventListener(l[1], l[2], l[3]); }catch(e){} });
      _ls.length = 0;
    };
  }
/* ==== MATRA-RUNNER EMBED END ==== */

  SlideModules.MINI_GAME = {
    mount(host, slide){
      const d = slide.data || {};
      newVoEpoch();
      state.ownsAudio = true;
      setNavActive(false);

      /* [r37] THE WHOLE SCREEN IS THE GAME.
         Yasir: "I don't want any other thing on the screen, only game will be played on the
         screen." So the header band goes for the length of this slide - the engine already has
         `.stage.no-band` for screens that own their whole canvas - and the game is built
         straight into the slide host. No frame, no second document: the markup below is the
         game's own, the stylesheet is its own (confined to .mr-root by the embed step), and the
         script is its own, running in this page. */
      const stg = document.querySelector(".stage");
      if(stg) stg.classList.add("no-band", "mg-full");

      const root = document.createElement("div");
      root.className = "mr-root mr-fullscreen";
      root.innerHTML = MATRA_RUNNER_HTML;
      /* [r54] PARENTED TO <body>, not to the slide.
         Yasir: "we don't need any bar on the left, right, top, down ... it should play in the
         entire screen". The lesson's stage is a fixed 1333x750 box scaled to fit, so anything
         inside it is letterboxed by construction - and `position:fixed` cannot escape it
         either, because a transformed ancestor becomes the containing block for fixed
         descendants. Out here the game measures the viewport and fills it. It is removed by
         hand on the way out, since clearHost() can no longer reach it. */
      document.body.appendChild(root);

      /* [r50] THE GAME IS ON SCREEN BEFORE THE INSTRUCTION, not after it.
         Yasir: "we don't need play button, as soon as we enter the page the game starts with a
         small intro." It used to boot in the voice-over's callback, which meant the child spent
         the whole clip looking at an unpainted canvas and then had to find a button. Now it
         boots on arrival and holds itself at a crawl - she runs, the road moves, the level card
         names the matra - and the clip's callback releases it to full speed. */
      let stop = null, done = false, watch = 0;

      /* [r37] TEARDOWN ON THE WAY OUT, not on a timer. The poll below is a backstop for exits
         this screen does not control; the ordinary exit runs it at the exact moment of leaving,
         because a 400ms lag is 400ms of the lesson's header sitting on top of a still-running
         game. */
      const teardownNow = ()=>{
        clearInterval(watch);
        if(stg) stg.classList.remove("no-band", "mg-full");
        /* the music lives in an AudioContext, which outlives the DOM and the rAF loop */
        try{ if(window.MR_audioStop) window.MR_audioStop(); }catch(e){}
        if(stop){ try{ stop(); }catch(e){} stop = null; }
        if(root && root.parentNode) root.parentNode.removeChild(root);
      };

      const finish = (why)=>{
        if(done) return;
        done = true;
        SwiftPAL.emit("mini_game_done", { slide_id: slide.id, phase: slide.phase, value: true,
                                          reason: why, latency_ms: Date.now() - state.slideStart });
        $("navBtn").onclick = ()=>{ teardownNow(); completeSlide(true); };
        setNavActive(true);          /* from page 6 on, this is what carries the lesson onward */
      };

      /* [r37] THE WAY ONWARD, BUILT INTO THE GAME'S OWN HUD.
         While this was an iframe the game posted a message and a little bridge script drew this
         button. Merged, there is no frame and no message to post - and the bridge was gated on
         being embedded, so it would never have run again. It is drawn here instead, styled with
         the game's own `.mute` class so it belongs to the HUD rather than looking like the
         lesson reaching in.
         It is not decoration: a runner has no natural finishing moment, and from page 6 there is
         no आगे button, so without this a child could not leave screen 18 at all. */
      /* [r54] NO BUTTON. There was an आगे key in the game's own HUD, because a runner has no
         natural finishing moment and from page 6 the lesson has no आगे of its own. Yasir wants
         nothing to press, so the game now ends itself - the last level rolls into the win card -
         and this listens for that instead of offering an escape.
         The long timer is not a button in disguise: it is the guarantee that a game which
         somehow never finishes cannot trap a child on the last-but-one screen of a lesson. */
      const addWayOut = ()=>{
        const win = root.querySelector("#scWin");
        if(win) new MutationObserver(()=>{
          if(win.classList.contains("on")) setTimeout(()=> finish("win"), 2600);
        }).observe(win, { attributes:true, attributeFilter:["class"] });
        setTimeout(()=> finish("timeout"), 6*60*1000);
      };

      stop = bootMatraRunner();
      addWayOut();
      const release = ()=>{
        if(CARD.slides[state.idx] !== slide) return;
        try{ if(window.MR_begin) window.MR_begin(); }catch(e){}
      };
      say(A(slide, "prompt"), release);
      setTimeout(release, 7000);    /* a missing or refused clip must not hold the game back */

      /* LEAVING HAS TO TAKE THE GAME WITH IT. Its loop and its window listeners outlive the DOM
         that is thrown away on navigation, so they are handed back deliberately. */
      watch = setInterval(()=>{
        if(CARD.slides[state.idx] === slide) return;
        teardownNow();
      }, 150);
    }
  };

  SlideModules.SENTENCE_COMPLETE = {
    mount(host, slide){
      const d = slide.data;
      newVoEpoch();          /* any chain still running from a previous mount is now stale */
      /* [r33] the pinned copy is parented to <body> so it can sit over the blank in screen
         coordinates - which also puts it out of clearHost()'s reach, so it is swept here. A
         slide left mid-drop (navigated away, or the train carrying the page off) would otherwise
         leave a card floating over the next screen. */
      document.querySelectorAll(".sc-pinned").forEach(e => e.remove());
      const wrap = document.createElement("div");
      wrap.className = "sc-stage";
      wrap.innerHTML =
        '<div class="sc-scene">' +
          imgOrEmoji(d.scene_img, d.scene_emoji, "sc-sceneimg", "sc-sceneemoji") +
        "</div>" +
        '<div class="sc-right">' +
          '<div class="sc-sentence">' +
            '<span class="sc-txt">' + (d.sentence_pre || "") + "</span>" +
            '<span class="sc-blank dd-zone"></span>' +
            '<span class="sc-txt">' + (d.sentence_post || "") + "</span>" +
          "</div>" +
          '<div class="sc-opts"></div>' +
        "</div>";
      host.appendChild(wrap);

      const blank = wrap.querySelector(".sc-blank");
      const sent  = wrap.querySelector(".sc-sentence");
      const optsW = wrap.querySelector(".sc-opts");
      /* SME: "Keep the options visually supported with pictures so the child can independently
         understand the word." Picture AND word on every card, exactly as the mockup draws them. */
      /* [r29] the answer was authored first on all four sentence screens */
      dealt(d, d.options, slide.id + ":options").forEach(o => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "sc-opt";
        b.dataset.word = o.word;
        if(o.audio) b.dataset.audio = o.audio;
        /* the whole sentence with THIS word standing in the blank - rung 2 plays all three */
        if(o.sentence_audio) b.dataset.sentence = o.sentence_audio;
        b.innerHTML = imgOrEmoji(o.img, o.emoji, "sc-optimg", "sc-optemoji") +
                      '<span class="ink-box"><span class="sc-optlbl ink-glyph">' + o.word + "</span></span>";
        optsW.appendChild(b);
      });
      const opts = [...optsW.children];

      state.ownsAudio = true;
      state.replayAudio = ()=> say(A(slide, "prompt"), ()=>{});
      setNavActive(false);
      let tries = 0;

      /* RUNG 2, screens 8-11: "खाली जगह में तीनों शब्द एक-एक करके रखकर पूरा वाक्य read out करें"
         plus a soft glow on the part of the picture that answers the question. The two wrong
         sentences are read as well, on purpose: «सीमा आज बहुत तरबूज है।» is only obviously wrong
         once you have HEARD it, and hearing it is the whole lesson on these four screens.
         The words are tried in the order they are on screen, left to right, because that order
         is shuffled per run and it is the only one the child can follow. */
      function sceneGlow(on){
        const holder = wrap.querySelector(".sc-scene");
        if(!holder) return;
        holder.querySelectorAll(".sc-glow").forEach(e => e.remove());
        const regions = d.scene_glow || [];
        if(!on || !regions.length) return;
        const img = holder.querySelector(".sc-sceneimg");
        if(!img || !img.naturalWidth) return;
        /* the regions are fractions of the ARTWORK and the artwork is drawn object-fit:cover, so
           part of it is off the panel. Undo the cover here rather than baking the crop into the
           numbers, and they stay right if the panel is ever resized. */
        const cw = img.clientWidth, ch = img.clientHeight;
        const sc = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
        const iw = img.naturalWidth * sc, ih = img.naturalHeight * sc;
        const ox = (cw - iw) / 2, oy = (ch - ih) / 2;
        regions.forEach(g => {
          const e = document.createElement("span");
          e.className = "sc-glow";
          e.style.left   = (ox + (g[0] - g[2]) * iw) + "px";
          e.style.top    = (oy + (g[1] - g[3]) * ih) + "px";
          e.style.width  = (g[2] * 2 * iw) + "px";
          e.style.height = (g[3] * 2 * ih) + "px";
          holder.appendChild(e);
        });
      }

      function scDemo(after){
        hintHold(function(fin){
        sceneGlow(true);
        hintSeq(opts.map(b => (next)=>{
          if(b.classList.contains("sc-gone")) return next();
          blank.classList.add("sc-try");
          blank.innerHTML = '<span class="ink-box"><span class="sc-word ink-glyph">'
                          + b.dataset.word + "</span></span>";
          b.classList.add("sc-trying");
          say(clip(b.dataset.sentence) || clip(b.dataset.audio), ()=> setTimeout(()=>{
            b.classList.remove("sc-trying");
            next();
          }, 300));
        }), ()=>{
          /* the blank goes back to being a blank - nothing has been answered yet */
          blank.classList.remove("sc-try");
          if(!blank.classList.contains("filled")) blank.innerHTML = "";
          fin();
        });
        }, after);
      }

      function sparkAt(el){
        const s = wrap.getBoundingClientRect(), b = el.getBoundingClientRect();
        const sp = document.createElement("span");
        sp.className = "sc-spark"; sp.textContent = "✨";
        sp.style.left = (b.left - s.left + b.width / 2 - 9) + "px";
        sp.style.top  = (b.top  - s.top  - 12) + "px";
        wrap.appendChild(sp);
        setTimeout(()=> sp.remove(), 1400);
      }

      function land(b){
        /* "Correct Answer on 3rd Attempt … No additional VO required." */
        const silent = tries >= silentFrom();
        state.locked = true;
        if(typeof stopNudge === "function") stopNudge();
        opts.forEach(x => { x.disabled = true; if(x !== b) x.classList.add("sc-fade"); });
        b.classList.add("sc-won");
        /* "The option card snaps into the blank space" · "When the correct option is selected,
           the word smoothly moves into the blank space" (screens 15 and 16 say it in as many
           words). So the word actually TRAVELS: a clone of the chosen label is placed over the
           option at its real position, then transformed to the blank's position and size. FLIP,
           because the two live in different stacking contexts and animating layout between them
           would reflow the sentence mid-flight. */
        const lbl = b.querySelector(".sc-optlbl");
        const from = lbl && lbl.getBoundingClientRect();
        const to = blank.getBoundingClientRect();
        /* [r34] a DROP has already put the word in the blank and faded the card out - the swap
           belongs to the gesture. Only a TAP arrives here with the blank still empty. */
        const alreadySettled = blank.classList.contains("filled");
        if(!alreadySettled){
          blank.classList.add("filled");
          blank.innerHTML = '<span class="ink-box"><span class="sc-word ink-glyph">' + d.answer + "</span></span>";
          sent.classList.add("sc-done");
        }
        if(alreadySettled){
          /* nothing to animate: it happened when the card landed */
        } else if(pinned){
          /* [r33] DROPPED: the card is already lying on the blank. It fades out there and the
             word fades up underneath it, so the one turns into the other in place. No flight -
             the card has already made the journey, in the child's own hand. */
          const word = blank.querySelector(".sc-word");
          if(word){ word.style.transition = "none"; word.style.opacity = "0"; }
          const gone = pinned; pinned = null;
          requestAnimationFrame(()=>{
            gone.style.opacity = "0";
            if(word){ word.style.transition = "opacity .30s ease"; word.style.opacity = "1"; }
          });
          setTimeout(()=>{ gone.remove(); if(word) word.style.transition = ""; }, 420);
        } else if(from && to.width){
          const fly = document.createElement("span");
          fly.className = "sc-fly"; fly.textContent = d.answer;
          fly.style.left = from.left + "px"; fly.style.top = from.top + "px";
          fly.style.font = getComputedStyle(lbl).font;
          document.body.appendChild(fly);
          const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
          const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
          const word = blank.querySelector(".sc-word");
          if(word) word.style.opacity = "0";
          requestAnimationFrame(()=>{
            fly.style.transform = "translate(" + dx + "px," + dy + "px)";
            fly.style.opacity = "1";
          });
          setTimeout(()=>{
            fly.remove();
            if(word) word.style.opacity = "";
            /* [r31] the card the word came from becomes an empty box, once the word has
               actually landed - do it any earlier and the child watches the card empty out
               before the thing that left it has arrived. */
            b.classList.add("sc-ghost");                       /* [r32] starts the dissolve */
            setTimeout(()=>{ b.classList.add("sc-gone"); closeGap(b); }, 380);   /* [r96] then folds away */
          }, 460);
        } else {
          b.classList.add("sc-ghost", "sc-gone"); closeGap(b);   /* no flight (reduced motion): straight swap */
        }
        blank.classList.remove("sc-blankglow");
        fbCorrect();
        if(typeof confettiCannon === "function") confettiCannon();
        if(typeof setSwMood === "function") setSwMood("celebrate");
        /* [r96] Yasir: no little star left behind on pages 14-17 - the sparkle sound stays */
        sfxSparkle();
        SwiftPAL.emit("sentence_complete_first_try", {
          slide_id: slide.id, phase: slide.phase, value: true,
          first_try: tries === 0, attempts: tries + 1,
          latency_ms: Date.now() - state.slideStart
        });
        const unlock = ()=>{ setNavActive(true);
          $("navBtn").onclick = ()=> completeSlide(tries === 0); };
        if(silent) setTimeout(unlock, 900); else say(A(slide, "correct"), unlock);
      }

      /* [r32] BOUNCE THE CARD HOME FROM THE BLANK. makeDraggable clears the tile's transform
         before it hands over, so by the time we get here the card has already snapped back in a
         single frame - the child sees it vanish from under their finger. The offset is
         reconstructed from the two rects, re-applied without a transition, and then animated
         away, which is the return journey they actually asked to see.
         Measured in CSS px (offsets divided by --scale): the stage is transformed, so a raw
         client-rect delta would overshoot on any display that is not 1:1. */
      function bounceHome(tile, zone){
        if(!tile || !zone) return;
        const sc = parseFloat(getComputedStyle(document.documentElement)
                    .getPropertyValue("--scale")) || 1;
        const t = tile.getBoundingClientRect(), z = zone.getBoundingClientRect();
        const dx = ((z.left + z.width / 2) - (t.left + t.width / 2)) / sc;
        const dy = ((z.top + z.height / 2) - (t.top + t.height / 2)) / sc;
        tile.style.transition = "none";
        tile.style.transform = "translate(" + dx + "px," + dy + "px) scale(1.08)";
        requestAnimationFrame(()=>{
          tile.style.transition = "transform 460ms cubic-bezier(.34,1.35,.6,1)";
          tile.style.transform = "";
          setTimeout(()=>{ tile.style.transition = ""; }, 500);
        });
      }

      /* [r35] THE REFUSAL IS PART OF THE DROP TOO.
         Yasir: "when we drop the incorrect element to the drop zone it should INSTANTLY wiggle
         and move back to its original place."
         Same shape as the fault [r34] fixed on the correct side: the wiggle and the return were
         inside miss(), and miss() runs only after the word clip has finished - so a wrong card
         sat on the blank for the length of that clip before anything said no. The answer to a
         gesture has to arrive with the gesture; the spoken hint can follow at its own pace. */
      function refuseAtZone(tile, zone){
        if(!tile || !zone) return;
        zone.classList.remove("sc-zshake"); void zone.offsetWidth;
        zone.classList.add("sc-zshake");
        setTimeout(()=> zone.classList.remove("sc-zshake"), 600);
        bounceHome(tile, zone);
        tile._refused = true;          /* so miss() does not play it a second time */
      }

      function miss(b, fromZone){
        tries++;
        state.attempts = tries;
        fbWrong();
        if(typeof setSwMood === "function") setSwMood("tryagain");
        if(fromZone){
          /* dropped in: the blank has already refused it on release - see refuseAtZone */
          if(!b._refused){
            fromZone.classList.remove("sc-zshake"); void fromZone.offsetWidth;
            fromZone.classList.add("sc-zshake");
            setTimeout(()=> fromZone.classList.remove("sc-zshake"), 600);
            bounceHome(b, fromZone);
          }
          b._refused = false;
        } else {
          /* tapped: nothing moved, so the card itself is what shakes - the SME's original note */
          b.classList.remove("sc-shake"); void b.offsetWidth; b.classList.add("sc-shake");
          setTimeout(()=> b.classList.remove("sc-shake"), 560);
        }
        SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: tries });
        if(tries === 1){
          /* RUNG 1: shake, no highlight, one line */
          say(A(slide, "hint1") || A(slide, "try_again"), ()=>{});
        } else if(tries === 2 && hintLevels() >= 3){
          /* RUNG 2: the three sentences, then the line that tells the child what to do with them */
          state.scaffoldLevel = 2; state.hintUsed = true;
          SwiftPAL.emit("hint_shown", { slide_id: slide.id, level: 2 });
          scDemo(()=> say(A(slide, "hint2") || A(slide, "hint") || A(slide, "try_again"),
                          ()=> sceneGlow(false)));
        } else {
          /* RUNG 3: "'खुश' वाले शब्द पर soft glow और hand nudge। 'फूल' और 'तरबूज' lock हो जाएँगे।"
             `disabled` already stops the tap and the drop (chooseFrom and the drop handler both
             test it); `sc-locked` takes the card out of pointer-events entirely, so it cannot
             even be picked up - a card that lifts and then silently refuses to land reads as a
             broken card rather than a locked one. */
          state.scaffoldLevel = 3; state.hintUsed = true;
          SwiftPAL.emit("hint_shown", { slide_id: slide.id, level: 3 });
          sceneGlow(false);
          const right = opts.find(x => x.dataset.word === d.answer);
          opts.forEach(x => { if(x !== right){ x.disabled = true; x.classList.add("sc-locked"); } });
          /* [S04] «Give the option and the sentence blank a soft glow» */
          blank.classList.add("sc-blankglow");
          if(right){
            right.classList.add("sc-nudge");
            withHand3(()=>{ if(typeof handOnAnswer === "function") handOnAnswer(right, slide); });
          }
          say(A(slide, "hint3") || A(slide, "hint2") || A(slide, "hint") || A(slide, "try_again"),
              ()=>{});
        }
      }

      /* [r29] THE CARD CAN BE CARRIED TO THE BLANK, not only tapped.
         The SME's note for this screen says "the option card snaps into the blank space", and
         these are the only option cards in the lesson that could not be picked up at all - every
         other screen from page 6 on is a drag. A child arriving here after six drag screens
         tries to drag, and nothing happened.
         TAP STILL WORKS, and is still what the note specifies first ("When an option is tapped,
         play the word VO"). makeDraggable already separates the two: a press that travels less
         than 6px and lands on no zone is delivered to `onTap`, so both gestures reach the same
         decision and neither is a special case. */
      /* [r33] THE CARD STAYS WHERE IT WAS DROPPED.
         Yasir: "when we drop the correct element to the drop zone it should dissolve (or fade
         away) there ... currently the element move back to its original place and then it
         dissolve and text appears at the drop zone."
         Exactly right, and the cause is makeDraggable: it clears the tile's transform before it
         calls back, so the card is already home a frame later - and the word VO plays before
         land() runs, so the child watches it sit in the tray for a second and dissolve THERE.
         A copy of the card is pinned over the blank at the instant of the drop and the original
         is emptied at once, so the tray shows the box it left behind while the card itself is
         still on the blank, waiting to fade. The copy is what dissolves.
         SIZED IN CSS px AND SCALED BACK UP: the stage carries --scale, so a body-level clone
         given raw client-rect dimensions would render its picture and text at the wrong size on
         any display that is not 1:1. */
      let pinned = null;
      /* [r34] THE DISSOLVE IS PART OF THE DROP, NOT OF THE FEEDBACK.
         Yasir: "it should dissolve there INSTANTLY ... currently the element remain near the drop
         zone for few seconds and then it dissolve."
         r33 pinned the card on the blank but left the dissolve inside land(), and land() only
         runs after the word clip has finished - so the card lay on the blank for the length of
         that clip before anything happened to it. The child's action and the screen's answer to
         it were a second and a half apart.
         The exchange now happens in the same gesture: the copy starts fading and the word starts
         appearing the moment the card is let go. The clip still plays and land() still does the
         rest (locking, the celebration, the unlock) - it simply no longer owns the swap. */
      function settleWord(){
        if(blank.classList.contains("filled")) return;
        blank.classList.add("filled");
        blank.innerHTML = '<span class="ink-box"><span class="sc-word ink-glyph">'
                        + d.answer + "</span></span>";
        sent.classList.add("sc-done");
        const word = blank.querySelector(".sc-word");
        if(word){ word.style.transition = "none"; word.style.opacity = "0"; }
        const gone = pinned; pinned = null;
        requestAnimationFrame(()=>{
          if(gone) gone.style.opacity = "0";
          if(word){ word.style.transition = "opacity .26s ease"; word.style.opacity = "1"; }
        });
        if(gone) setTimeout(()=>{ gone.remove(); }, 340);
        setTimeout(()=>{ if(word) word.style.transition = ""; }, 360);
      }

      function pinAtZone(tile, zone){
        const sc = parseFloat(getComputedStyle(document.documentElement)
                    .getPropertyValue("--scale")) || 1;
        const r = tile.getBoundingClientRect(), z = zone.getBoundingClientRect();
        const c = tile.cloneNode(true);
        c.className = "sc-opt sc-pinned";
        c.style.cssText =
          "position:fixed;margin:0;z-index:60;pointer-events:none;transform-origin:top left;" +
          "width:" + (r.width / sc) + "px;height:" + (r.height / sc) + "px;" +
          "transform:scale(" + sc + ");" +
          "left:" + (z.left + z.width / 2 - r.width / 2) + "px;" +
          "top:"  + (z.top + z.height / 2 - r.height / 2) + "px;";
        document.body.appendChild(c);
        pinned = c;
        tile.classList.add("sc-ghost", "sc-gone");   // its slot is emptied immediately
        closeGap(tile);                               // [r96] ...and folds away
      }

      const chooseFrom = (b, fromZone)=>{
        if(hintBusy || state.locked || b.disabled) return;
        sayOpt(clip(b.dataset.audio), ()=>{
          if(state.locked) return;
          if(b.dataset.word === d.answer) land(b); else miss(b, fromZone);
        });
      };
      opts.forEach(b => {
        /* [r65] Yasir: "from page 13 to 16 only dragging & dropping should work, currently even
           if I tap the word goes to the drop zone which should not happen". So a tap reads the
           word out - the SME's "when an option is tapped, play the word VO" - and that is all it
           does. The judgement lives in the drop handler alone now. */
        const tap = ()=>{
          if(hintBusy || state.locked || isPlaying || b.disabled) return;
          if(typeof sfxTap === "function") sfxTap();
          sayOpt(clip(b.dataset.audio), ()=>{});
        };
        b.onclick = tap;
        if(typeof makeDraggable === "function"){
          makeDraggable(b, (zone, tile)=>{
            /* dropped on the blank: the same judgement the tap makes. A wrong card is NOT left
               sitting in the blank - miss() shakes it and it springs back, which is the note's
               "option returns to its original position". */
            if(hintBusy || state.locked || tile.disabled) return;
            if(typeof sfxTap === "function") sfxTap();
            /* [r33] decided here, not after the clip: the judgement is deterministic, and the
               card has to be pinned in the SAME frame it is released or it snaps home first. */
            if(tile.dataset.word === d.answer){
              pinAtZone(tile, zone);
              settleWord();                    /* [r34] straight away, in the same frame */
            } else {
              refuseAtZone(tile, zone);        /* [r35] ...and so does the refusal */
            }
            chooseFrom(tile, zone);            /* [r32] the zone it was dropped on */
          }, { onTap: tap });
        }
      });

      /* SME: "Picture appears first. Sentence box appears with the blank space. Options slide/fade
         in one by one." Settled by default; `sc-enter` only drives the stagger. */
      requestAnimationFrame(()=>{ wrap.classList.add("sc-enter"); sfxPopSoft(); });
      /* [r30] THE ENTRY ANIMATION HAS TO LET GO, OR THE CARD CANNOT BE DRAGGED.
         Yasir: "when we drag and drop it should be visible dragging ... we need to show how the
         elments are going."
         .sc-enter's stagger runs `animation:scIn ... both`, and `both` means the animation keeps
         applying its final frame - `transform:none` - for as long as the class is there. An
         animated property outranks an inline style, so makeDraggable's
         `tile.style.transform = translate(dx,dy)` was being written and then ignored: the drop
         still worked, but the card never moved under the finger. Measured: a sort card travels
         210px while held, a sentence card travelled 0.
         The keyframes end exactly where the settled card sits (opacity:1, transform:none), so
         dropping the class changes nothing on screen - it only hands control back.
         Removed when the last option lands, with a timer as backstop (a cancelled or skipped
         animation may never fire animationend) and on first touch, so an impatient child is
         never the one who finds the gap. */
      const _settleIn = ()=> wrap.classList.remove("sc-enter");
      wrap.addEventListener("animationend", (e)=>{
        if(e.target === opts[opts.length - 1]) _settleIn();
      });
      setTimeout(_settleIn, 2400);
      opts.forEach(b => b.addEventListener("pointerdown", _settleIn, { once:true }));
      /* [S04] «Play the instruction and sentence VO before enabling interaction.» «Read 'पेड़ पर
         एक…', pause at the blank, then say 'बैठा है।' Do not say the missing word.» Two clips with
         the pause between them, the blank blinking through it; the cards stay locked until the
         sentence has been read (state.revealing is what makeDraggable honours). */
      const sa = A(slide, "sent_pre"), sb = A(slide, "sent_post");
      if(sa || sb){
        state.revealing = true; hintBusy = true;
        let entryDone = false;
        const freeUp = ()=>{ if(entryDone) return; entryDone = true; hintBusy = false; state.revealing = false; };
        const myGen = _voGen;
        say(A(slide, "prompt"), ()=> setTimeout(()=>{
          if(myGen !== _voGen) return;
          sayOpt(sa, ()=>{
            blank.classList.remove("sc-ask"); void blank.offsetWidth; blank.classList.add("sc-ask");
            setTimeout(()=>{ if(myGen !== _voGen) return;
              sayOpt(sb, ()=>{ blank.classList.remove("sc-ask"); freeUp(); }); }, 900);
          });
        }, 350));
        setTimeout(()=>{ if(myGen === _voGen) freeUp(); }, 20000);
      } else {
        say(A(slide, "prompt"), ()=>{});
      }
    }
  };

  /* ================================================================ 11 · THE LANDING TRAIN */
  /* THE SAME TRAIN AS EVERY OTHER SCREEN. Round 3b's whole point is that this lesson has one
     train, not a painted cover and a drawn everything-else — so the landing mounts TrainChrome
     exactly as the activity screens do, with the two matras painted onto the coaches' cream
     panels. The earlier landing-only implementation (and the cropped two-coach sprite sheet it
     needed) are gone: slicing gives a two-coach train from the three-coach artwork for free.

     SME: "Show only two matra boxes/cards: 1st box ु, 2nd box ू … The matras can be shown inside
     two train bogies/cards so that the lesson visually continues as a «मात्राओं की रेल» journey",
     with a right-to-left arrival, a whistle on entry, the bogies appearing one by one and a
     sparkle as each matra lands.

     The shared engine's boot() does not know this hero kind, so it leaves #sgHero empty and this
     fills it afterwards. Nothing in the shared engine is touched. */
  /* [r90] THE COVER'S TITLE IS DRESSED AT ONCE, under the loading screen: the bigger title, the
     taller card and the (hidden) cloud and words. Only the MOTION waits for the train. Dressing it
     when the train set off showed the plain old title for a moment and then made the card jump. */
  function ltPrepTitle(){
    /* [r74] the title stays TEXT (Yasir asked for the original back); it is still layered
       above the train, so the steam passes behind it */
    const ttl = document.getElementById("sgTitle");
    if(ttl) ttl.classList.add("lt-title-front");
    /* [r87] and the card grows to hold the title's cloud (see .sg-card.lt-cloud-card) */
    { const _card = ttl && ttl.closest(".sg-card"); if(_card) _card.classList.add("lt-cloud-card"); }
    /* [r88] THE TITLE CLOUD, MADE OF THE TRAIN'S SMOKE (see .lt-tcloud in train_styles.css).
       Built now, invisible; formed by formTitleCloud() when the train parks. Each entry is a puff:
       its centre x, y and diameter in the cloud's own 640x162 box. */
    if(ttl && !ttl.querySelector(".lt-tcloud")){
      const words = ttl.textContent;
      const tcl = document.createElement("div"); tcl.className = "lt-tcloud"; tcl.setAttribute("aria-hidden", "true");
      /* [r93] THE CLOUD ON AN ARCH, like the title on it and like Yasir's mockup: everything - the
         bumps along the top, the soft inside and the underside - follows one curve, highest in the
         middle and lower towards the ends. ARC(x) is that curve in the cloud's own px. */
      const SAG = 40;                                      /* how much lower the ends sit than the middle */
      const ARC = (x)=> SAG * Math.pow((x - 320) / 320, 2) - SAG * 0.38;
      const put = (cls, x, y, w, h)=>{
        const e = document.createElement("i"); if(cls) e.className = cls;
        const yy = y + ARC(x);
        e.style.cssText = "left:" + (x - w / 2) + "px;top:" + (yy - h / 2) + "px;width:" + w + "px;height:" + h + "px";
        e.dataset.cx = x; e.dataset.cy = yy;
        tcl.appendChild(e);
      };
      /* the soft inside: overlapping ovals along the arch (one straight bar cannot bend) */
      [[100, 108], [220, 106], [340, 105], [460, 106], [560, 108]].forEach(([x, y]) => put("lt-tbody", x, y, 210, 86));
      [[34,118,52],[78,104,84],[140,84,104],[222,70,124],[318,64,128],[414,68,124],[500,80,108],
       [574,98,88],[618,116,54],[170,126,62],[270,130,64],[380,130,64],[480,126,60]].forEach(([x, y, dd]) => put("", x, y, dd, dd));
      /* the white core behind the words, on the arch too - last, over the puffs' overlaps */
      [[170, 103], [320, 101], [470, 103]].forEach(([x, y]) => put("lt-tcore", x, y, 250, 118));
      tcl.dataset.sag = SAG;
      /* [r89] the words sit in a sliding window - see .lt-twin in the stylesheet */
      const win = document.createElement("span"); win.className = "lt-twin";
      const tw = document.createElement("span"); tw.className = "lt-tword";
      /* [r93] THE WORDS BENT ALONG A TRUE ARC, as on the mockup, where the headline is one smooth
         curve. The text is cut into GRAPHEME CLUSTERS - whole aksharas, «मा» «त्रा» «ओं» - so no
         conjunct or matra is ever split, and each is lifted and tilted to the curve by ltArcTitle().
         If this browser's segmenter would split a conjunct (an older ICU without the Indic rule: a
         piece ending in a virama), it falls back to whole words. */
      const ws = words.trim().split(/\s+/);
      let pieces = null;
      try{
        if(typeof Intl !== "undefined" && Intl.Segmenter){
          const seg = new Intl.Segmenter("hi", { granularity:"grapheme" });
          pieces = ws.map(w => [...seg.segment(w)].map(x => x.segment));
          if(pieces.some(ps => ps.some(x => x.endsWith("\u094D")))) pieces = null;
        }
      }catch(e){ pieces = null; }
      if(!pieces) pieces = ws.map(w => [w]);
      pieces.forEach((ps, i)=>{
        ps.forEach(x => { const sp = document.createElement("span"); sp.className = "lt-tw"; sp.textContent = x; tw.appendChild(sp); });
        if(i < pieces.length - 1) tw.appendChild(document.createTextNode(" "));
      });
      win.appendChild(tw);
      ttl.textContent = ""; ttl.appendChild(tcl); ttl.appendChild(win);
    }
  }

  /* [r93] lay the title's pieces on the arc: each piece's centre is lifted by the curve and the piece
     is tilted to the curve's slope there, so the headline runs as one smooth arch. Measured from
     the pieces' own layout boxes (transforms do not move those), so it can be run again safely. */
  function ltArcTitle(){
    const tw = document.querySelector("#sgTitle .lt-tword"); if(!tw) return;
    const parts = [...tw.querySelectorAll(".lt-tw")]; if(!parts.length) return;
    const W = tw.offsetWidth, half = W / 2; if(!W) return;
    const SAG = 20;                                       /* the ends sit 20 px lower than the middle */
    parts.forEach(sp => {
      const x = sp.offsetLeft + sp.offsetWidth / 2 - half;
      const y = SAG * Math.pow(x / half, 2) - SAG * 0.45;
      const ang = Math.atan(2 * SAG * x / (half * half)) * 180 / Math.PI;
      sp.style.transform = "translateY(" + y.toFixed(1) + "px) rotate(" + ang.toFixed(2) + "deg)";
    });
  }
  function dressLandingTrain(){
    const hero = (typeof CARD !== "undefined" && CARD.landing_hero) || null;
    if(!hero || hero.kind !== "matra_train") return false;
    const el = document.getElementById("sgHero");
    if(!el) return false;
    if(el.dataset.ltDone) return true;                    // idempotent

    /* r7: THE GREETING WAITS FOR THE TRAIN. It used to start at boot, i.e. under a 3.4s arrival
       with a whistle, a chug bed and two sparkles over it — the same clash this bundle fixed on
       all seven activity screens, still live on the one screen every child sees first.
       `ltReady()` is the single release point, and the backstop below fires it even if the
       arrival never completes, because a cover that never speaks is worse than one that speaks
       over itself.
       [r90] Set up ONCE, at once: the engine asks landingTrainReady() the instant its loading
       screen clears, which is now BEFORE the train is built (below). */
    if(!window.__ltInit){
      window.__ltInit = true;
      window.__ltReady = false;
      window.__ltWaiters = [];
      window.__ltReadyFn = function(){
        if(window.__ltReady) return;
        window.__ltReady = true;
        const q = window.__ltWaiters; window.__ltWaiters = [];
        q.forEach(fn => { try{ fn(); }catch(e){} });
      };
      window.landingTrainReady = (fn)=>{ if(window.__ltReady) fn(); else window.__ltWaiters.push(fn); };
      /* [r88] two things finish the arrival: the matras landing, and the title written on its
         cloud. The greeting waits for both. */
      window.__ltSteps = 0;
      window.__ltStepFn = ()=>{ if(++window.__ltSteps >= 2) window.__ltReadyFn(); };
    }
    const ltReady = window.__ltReadyFn, ltStep = window.__ltStepFn;
    ltPrepTitle();                                        /* [r90] the title, at once */
    ltArcTitle();                                         /* [r93] and on its arc - again once the font is in */
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(ltArcTitle);

    /* [r90] THE TRAIN SETS OFF WHEN THE COVER CAN BE SEEN. This used to run as soon as the page's
       HTML was ready - under the white loading screen, which only clears once everything has
       loaded (min 1.6 s). Measured: on a slow load the train had arrived, and the cloud had begun
       to form, before the cover appeared - so the child saw it start mid-way. It now waits for the
       engine's `body.loaded`, set the moment the loading screen starts to fade. */
    /* ...and once its own pictures are in. They are fetched and decoded NOW, under the loading
       screen, exactly as before - building the train later had them start downloading only as it
       set off, and it arrived invisible (measured: smoke and labels, no train, for ~4 s). A 2 s cap
       after the cover appears means a slow picture can never hold the cover still. */
    if(!window.__ltGo){
      if(!window.__ltArt){
        window.__ltArtImgs = [TRAIN_ART.src, TRAIN_SPR.src].map(u => {
          const im = new Image(); im.decoding = "async"; im.src = u; return im; });
        window.__ltArt = Promise.all(window.__ltArtImgs.map(im => new Promise(r => {
            /* loaded and decoded - or loaded and 400 ms on, whichever is first */
            const fin = ()=> r();
            if(im.decode) im.decode().then(fin, fin);
            const onl = ()=> setTimeout(fin, 400);
            if(im.complete && im.naturalWidth) onl(); else { im.addEventListener("load", onl); im.addEventListener("error", fin); }
          })))
          .then(()=>{ window.__ltArtOk = true; window.__ltKick && window.__ltKick(); });
      }
      const isLoaded = ()=> !document.getElementById("bootLoader") || document.body.classList.contains("loaded");
      window.__ltKick = ()=>{
        if(window.__ltGo || !isLoaded()) return;
        if(!window.__ltCapT) window.__ltCapT = setTimeout(()=>{ window.__ltCap = true; window.__ltKick(); }, 2000);
        if(window.__ltArtOk || window.__ltCap){
          window.__ltGo = true; clearTimeout(window.__ltCapT);
          /* [r92] a beat after the cover appears: the loading screen's fade and removal and the
             cover's own pop-in are a burst of painting (measured: 130-160 ms frames in the first
             quarter-second) - the train sets off once that has passed, not under it */
          setTimeout(dressLandingTrain, 600);
        }
      };
      if(!window.__ltObs){
        window.__ltObs = new MutationObserver(()=> window.__ltKick());
        window.__ltObs.observe(document.body, { attributes:true, attributeFilter:["class"] });
      }
      window.__ltKick();                                  /* dresses it now if it is ready */
      return true;
    }
    if(window.__ltObs){ window.__ltObs.disconnect(); window.__ltObs = null; }
    el.dataset.ltDone = "1";
    const ms = hero.matras || [];
    /* [r90] 12 s from the train setting off: the arrival ends with the title written on its cloud,
       and at 7 s this backstop released the greeting in the middle of the writing */
    setTimeout(ltReady, 12000);       /* never leave the cover silent on a stalled arrival */

    const tc = TrainChrome.mount(el, {
      coaches: ms.length,
      coach_label: ms.map(()=> null),
      /* `lt-pending` holds each matra invisible until the train has parked — the SME asks for
         them "one by one" AFTER the arrival, so they land on a coach that is standing still */
      /* r7: «उ (ु)» — the letter with its matra in brackets, the same form the G4 bins use,
         so the cover names the pair exactly as the sorting screens later will. */
      coach_body: ms.map((m, i) => ({ html: '<span class="lt-matra lt-pending">' +
        ((hero.letters && hero.letters[i]) ? hero.letters[i] + ' <span class="lt-br">(' +
          matraGlyph(m) + ')</span>' : matraGlyph(m)) + "</span>" })),
      drop_zone: false,
      /* the sibling's landing train is 634px wide for a locomotive and THREE coaches, i.e. a
         per-part scale of 634/2155 = 0.294. Matching that scale rather than a width budget is
         what makes the two covers read as the same train: 0.294 * the 592px ink band = 174. */
      maxH: 174,
      on_enter: ()=>{
        if(window.__ltUnclip) window.__ltUnclip();          /* [r91] parked: the clip comes off */
        const last = ms.length - 1;
        /* [r92] the cloud is already collecting - it started with the train (see below) */
        [...el.querySelectorAll(".lt-matra")].forEach((sp, i)=> setTimeout(()=>{
          sp.classList.remove("lt-pending"); sp.classList.add("lt-pop");
          sfxSparkle();                       // SME: "a light sparkle/pop SFX when each matra appears"
          /* r7: the greeting waits for THIS — the last matra has popped and its sparkle has
             sounded, so the arrival is genuinely over and nothing is left to talk over. The pop
             animation is 420ms; the clip starts once it has landed rather than on top of it. */
          if(i === last) setTimeout(ltStep, 460);
        }, 220 + i * 520));
      }
    });
    /* NEVER LEAVE THE COACHES EMPTY. The matras are revealed from on_enter, which fires when the
       train parks 3.4s in — so anything that looks at this screen earlier (a review capture, a
       slow first paint, a stalled arrival) sees two blank coaches, which is exactly what the
       round-3b review deck shipped. This is the backstop: by 5s the matras are up regardless of
       whether the arrival ever completed. */
    setTimeout(()=> [...el.querySelectorAll(".lt-matra.lt-pending")].forEach(sp =>
      sp.classList.remove("lt-pending")), 5000);
    el.classList.add("show");          // boot() only adds this for hero kinds it knows
    /* THE SIBLING'S COVER HAS NO RAIL. On the activity screens the track is the line the train
       arrives along and it reads as railway; on the cover it cut the card in half under a train
       that is really a title illustration. Marked here rather than hidden globally, because the
       activity screens still want it. */
    window.__ltTrainT0 = performance.now();             /* [r92] the run starts now */
    (tc.shell || el).classList.add("lt-cover");
    /* [r91] THE TRAIN ARRIVES INSIDE THE CARD. Yasir: "the train should be inside the main
       rectangular box, not outside of it". It slides in from 86% of its own width to the right -
       past the card's right edge - so for the arrival the train is clipped to the inside of the
       card's frame (9 px border); the clip comes off once it has parked. Swifty and the speaker,
       which overlap the card's corner on purpose, are not part of the train and are not clipped. */
    const _shell = tc.shell || el, _cardEl = _shell.closest(".sg-card");
    if(_cardEl){
      const sc0 = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
      const sr0 = _shell.getBoundingClientRect(), cr0 = _cardEl.getBoundingClientRect(), B = 9;
      const L = (cr0.left - sr0.left) / sc0 + B, Tp = (cr0.top - sr0.top) / sc0 + B;
      const R = (cr0.right - sr0.left) / sc0 - B, Bt = (cr0.bottom - sr0.top) / sc0 - B;
      _shell.style.clipPath = "polygon(" + L + "px " + Tp + "px," + R + "px " + Tp + "px," +
                              R + "px " + Bt + "px," + L + "px " + Bt + "px)";
      window.__ltUnclip = ()=>{ _shell.style.clipPath = ""; };
    }
    /* [r73] the steam stays under the title. The plume rose 0.62 of the
       train's height - on the cover, straight into the title - so here it rises a little over a
       third of that, and the title is layered above the train so any wisp passes behind it. */
    const st = el.querySelector(".train-steam");
    if(st){
      const r = parseFloat(st.style.getPropertyValue("--tc-rise")) || -96;
      /* [r75] OUT OF THE CHIMNEY'S MOUTH. Measured: the puffs were born 6px down inside the yellow
         cap and, with the short rise, sat on it like a blob. They now start at the rim, climb a
         little higher, and lean back-left - away from the title, which starts just right of the
         chimney - so they read as steam leaving the stack rather than something resting on it. */
      const top0 = parseFloat(st.style.top) || 0;
      st.style.top = (top0 - 7) + "px";
      /* [r86] higher again: on the cloud cover the puffs climb into the title cloud and vanish in it */
      st.style.setProperty("--tc-rise", Math.round(r * 0.62) + "px");
      st.style.setProperty("--tc-drift", "-14px");
      const pf = parseFloat(st.style.getPropertyValue("--tc-puff")) || 26;
      /* [r86] fuller again: the puffs now vanish into the title cloud rather than over the words */
      st.style.setProperty("--tc-puff", Math.round(pf * 1.15) + "px");
    }
    /* [r74/r87/r88] the title, its card and its cloud - prepared by ltPrepTitle() (below), which
       already ran under the loading screen; this just picks the pieces up */
    const ttl = document.getElementById("sgTitle");
    ltPrepTitle();
    var tcl = ttl ? ttl.querySelector(".lt-tcloud") : null;
    /* the train has parked: the cloud's puffs leave the chimney - nearest first - and swell into
       place, then the words are written on it, then `done` (the greeting may start) */
    /* [r92] the train's arrival curve - trainIn, cubic-bezier(.40,.20,.45,1) over TRAIN_TRAVEL_MS from
       translateX(86%) - so the cloud knows where the chimney is at every moment of the run */
    function _bez(x1, y1, x2, y2){
      const A = (a1, a2)=> 1 - 3 * a2 + 3 * a1, B = (a1, a2)=> 3 * a2 - 6 * a1, C = (a1)=> 3 * a1;
      const at = (t, a1, a2)=> ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t;
      return (x)=>{ let lo = 0, hi = 1, t = x;
        for(let i = 0; i < 30; i++){ const v = at(t, x1, x2); if(Math.abs(v - x) < 1e-5) break;
          if(v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
        return at(t, y1, y2); };
    }
    const _trainEaseCurve = _bez(.40, .20, .45, 1);
    function formTitleCloud(done){
      if(!tcl || tcl.classList.contains("lt-form")){ if(done) done(); return; }
      tcl.classList.add("lt-form");
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const win = ttl.querySelector(".lt-twin"), word = ttl.querySelector(".lt-tword");
      let _fin = false;
      const finishWords = ()=>{
        if(_fin) return; _fin = true;
        ttl.classList.add("lt-written", "lt-written-done");      /* a marker only - no style change */
        if(done) setTimeout(done, 300);   /* the greeting a beat later, clear of the writing */
      };
      const sc = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
      const stm = el.querySelector(".train-steam"), rail = el.querySelector(".train-rail");
      const cr = tcl.getBoundingClientRect(), sr = stm ? stm.getBoundingClientRect() : null;
      /* where the chimney is NOW, how far the train still has to come, and so where it will park -
         in the cloud's own px. The rail's current offset comes off its live transform. */
      const nowX = sr ? (sr.left - cr.left) / sc : 120;
      let off = 0; try{ off = new DOMMatrixReadOnly(getComputedStyle(rail).transform).m41 / sc * sc; }catch(e){}
      const chxF = nowX - (rail ? off : 0);              /* the chimney's parked x */
      const mouthY = sr ? (sr.top - cr.top) / sc : 200;  /* its mouth */
      const chy = mouthY - 14;
      const D = rail ? rail.offsetWidth * 0.86 : 380;    /* the run, start to park */
      const t0 = window.__ltTrainT0 || performance.now(), TRAVEL = (typeof TRAIN_TRAVEL_MS === "number" ? TRAIN_TRAVEL_MS : 3400);
      const elapsed = performance.now() - t0;
      const xAt = (t)=> chxF + D * (1 - _trainEaseCurve(Math.min(1, Math.max(0, t / TRAVEL))));
      /* when the chimney passes under x (the inverse of xAt, by halving) */
      const tAt = (x)=>{ let lo = 0, hi = TRAVEL; for(let i = 0; i < 28; i++){ const m = (lo + hi) / 2; if(xAt(m) > x) lo = m; else hi = m; } return (lo + hi) / 2; };

      /* THE COLUMN that joins chimney and cloud, as on the mockup: three puffs from just above the
         parked chimney up into the cloud's underside, built once we know where the chimney parks */
      if(!tcl.querySelector(".lt-tcol")){
        const sag = +tcl.dataset.sag || 0;
        const top = 150 + sag * Math.pow((chxF - 320) / 320, 2) - sag * 0.38, n = 3;   /* [r93] the arched underside */
        for(let j = 0; j < n; j++){
          const f = (j + 1) / (n + 1), dd = Math.round(24 + 18 * f);
          const x = chxF - 4 * f, y = mouthY - 10 + (top - (mouthY - 10)) * f;
          const c = document.createElement("i"); c.className = "lt-tcol";
          c.style.cssText = "left:" + (x - dd / 2) + "px;top:" + (y - dd / 2) + "px;width:" + dd + "px;height:" + dd + "px";
          c.dataset.cx = x; c.dataset.cy = y;
          tcl.insertBefore(c, tcl.firstChild);
        }
      }
      if(reduce || typeof tcl.animate !== "function"){
        tcl.classList.add("lt-settled"); ttl.classList.add("lt-static"); finishWords(); return; }

      const RUN = 1300, WR = 1300, EARLIEST = 650;      /* the train is well inside the card by then */
      const all = [...tcl.children].map(k => ({ k, cx:+k.dataset.cx, cy:+k.dataset.cy,
        fill: k.classList.contains("lt-tbody") || k.classList.contains("lt-tcore"),
        col: k.classList.contains("lt-tcol") }));
      /* each puff leaves the chimney as the chimney passes under its place; the column last */
      const puffs = all.filter(p => !p.fill).map(p => {
        let te = p.col ? TRAVEL - 260 + 90 * (p.cy < 160 ? 1 : 0) : tAt(Math.min(chxF + D, Math.max(chxF, p.cx)));
        return Object.assign(p, { te: Math.max(EARLIEST, te) });
      }).sort((p, q) => p.te - q.te);
      for(let i = 1; i < puffs.length; i++) puffs[i].te = Math.max(puffs[i].te, puffs[i - 1].te + 85);
      const lastTe = puffs[puffs.length - 1].te;
      const T = Math.max(1, lastTe + RUN - elapsed);     /* the whole cloud, from now */
      puffs.forEach(p => {
        const startAt = Math.max(0, p.te - elapsed);
        const ex = p.col ? chxF : xAt(p.te);              /* where the chimney is when this one leaves */
        const f = startAt / T, u = Math.min(1 - f, RUN / T);
        const sx = (ex - p.cx).toFixed(1), sy = (chy - p.cy).toFixed(1);
        /* straight up out of the stack, trailing a little behind the train, then into its place */
        const ux = (ex + (p.cx - ex) * 0.25 + 10 - p.cx).toFixed(1), uy = (chy - 42 - p.cy).toFixed(1);
        const start = "translate3d(" + sx + "px," + sy + "px,0) scale(.16)";
        const frames = [];
        if(f > 0) frames.push({ offset:0, opacity:0, transform:start });
        frames.push({ offset:f, opacity:0, transform:start, easing:"cubic-bezier(.25,.6,.4,1)" });
        frames.push({ offset:f + .10 * u, opacity:1 });
        frames.push({ offset:f + .38 * u, opacity:1, transform:"translate3d(" + ux + "px," + uy + "px,0) scale(.42)",
                      easing:"cubic-bezier(.3,.1,.25,1)" });
        frames.push({ offset:f + u, opacity:1, transform:"translate3d(0,0,0) scale(1)" });
        if(f + u < 1) frames.push({ offset:1, opacity:1, transform:"translate3d(0,0,0) scale(1)" });
        p.k.animate(frames, { duration:T, fill:"both" });
      });
      /* the inside thickens as the puffs gather round it */
      all.filter(p => p.fill).forEach(p => {
        p.k.animate([{ offset:0, opacity:0 }, { offset:.4, opacity:0, easing:"ease-in-out" }, { offset:1, opacity:1 }],
                    { duration:T, fill:"both" });
      });
      /* the words: the window and the words slide by the same distance in opposite directions */
      ltArcTitle();
      const tw = win ? Math.round(win.getBoundingClientRect().width / sc) : 600;
      setTimeout(()=>{
        if(!win || !word){ finishWords(); return; }
        const ease = "cubic-bezier(.42,0,.32,1)";
        win.animate([{ transform:"translate3d(" + (-tw) + "px,0,0)" }, { transform:"translate3d(0,0,0)" }],
                    { duration:WR, easing:ease, fill:"forwards" });
        const wa = word.animate([{ transform:"translate3d(" + tw + "px,0,0)" }, { transform:"translate3d(0,0,0)" }],
                    { duration:WR, easing:ease, fill:"forwards" });
        wa.onfinish = finishWords;
        setTimeout(finishWords, WR + 600);
      }, T - 320);                                        /* the words start as the cloud settles */
    }
    window.__ltFormCloud = formTitleCloud;
    /* [r92] Yasir: "as the train moves ahead the smoke will start collecting, and on it the title
       appears". The cloud starts with the train's run - each puff leaves the moving chimney as it
       passes under the puff's place - so the cloud fills in right to left behind the train. */
    requestAnimationFrame(()=> formTitleCloud(ltStep));
    /* never leave the cover without its title: by 9 s it is there, formed or not */
    setTimeout(()=>{ if(tcl && !tcl.classList.contains("lt-form")) formTitleCloud(null);
      setTimeout(()=> ttl && ttl.classList.add("lt-written", "lt-written-done", "lt-static"), 2600); }, 9000);

    void tc;
    return true;
  }
  /* boot() runs after this script and the landing can be re-entered, so poll briefly rather than
     racing a single frame — the same belt-and-braces matraHLSoon uses. */
  /* [r77] THE GAME'S ART ARRIVES BEFORE THE GAME DOES. On a first visit the runner used to start
     fetching everything the moment its page mounted, and drew its code-only first draft until the
     files landed. Ten seconds after this page has loaded, the files the game's first frame is made
     of - plus its music and voice - are fetched quietly, one after another, into the browser cache. */
  (function warmRunner(){
    const D = "assets/MatraRunner/";
    const imgs = ["bg_valley.webp", "bridge_deck.webp", "bridge_wall.webp", "portal_ring.webp",
                  "swifty_run.webp", "swifty_fall.webp", "ui_banner.webp", "ui_badge.webp", "ui_btn.webp",
                  "heart_full.webp", "heart_empty.webp", "coin.webp"];
    const files = ["bg_valley.mp4", "bgm_game.ogg"];
    const start = ()=>{
      imgs.forEach(f => { const im = new Image(); im.decoding = "async"; im.src = D + f; });
      let i = 0;
      (function next(){ if(i >= files.length) return;
        fetch(D + files[i++]).then(r => r.blob()).catch(()=>{}).then(()=> setTimeout(next, 200)); })();
    };
    /* [S04] only a lesson that HAS the runner warms its files - otherwise 14 requests 404 */
    const hasRunner = ()=>{ try{ return CARD.slides.some(s => s.type === "MINI_GAME"); }catch(e){ return false; } };
    const arm = ()=> setTimeout(()=>{ if(hasRunner()) start(); }, 10000);
    if(document.readyState === "complete") arm(); else window.addEventListener("load", arm);
  })();


  /* [r99] THE LESSON'S BACKGROUND MUSIC. Yasir: "a bg music used across the file except the runner
     game, as it already has its music; at 65-70 % volume; when any VO or sfx is playing reduce the
     volume so the VO can be heard".
     One looping <audio> element (bgm_lesson.ogg, cut from his mp3) - not a decoded buffer: four
     minutes of stereo decoded is ~90 MB, too much for a tablet. Its volume is steered every frame:
         nothing else sounding      0.68
         a sound effect sounding    0.32   (train chug / whistle, right / wrong, button sounds ...)
         a voice-over speaking      0.16   (the engine's isPlaying - every VO clip)
     dropping fast (~0.12 s) and coming back slowly (~0.6 s), so a word is never sung over and the
     music does not pump between clips. On the runner game's page it fades out completely - the game
     has its own music - and comes back after it.
     [r100] Yasir: "the bg music should only play when we click on the play button" - so it starts
     with that tap, and nothing else starts it (not the cover, not another touch). */
  const BGM = (function(){
    const BASE = 0.68, SFX = 0.32, VO = 0.16;
    const src = (typeof _av === "function") ? _av("assets/Audio/bgm_lesson.ogg") : "assets/Audio/bgm_lesson.ogg";
    let el = null, vol = 0, started = false, sfxUntil = 0;
    const live = new Set();
    const make = ()=>{
      if(el) return el;
      el = new Audio(src); el.loop = true; el.preload = "auto"; el.volume = 0;
      return el;
    };
    const tryStart = ()=>{
      if(started) return;
      make();
      const p = el.play();
      if(p && p.then) p.then(()=>{ started = true; }, ()=>{});
      else started = true;
    };
    const onGame = ()=>{
      try{ const s = CARD.slides[state.idx]; return !!(s && s.type === "MINI_GAME" &&
                    document.body && !document.body.classList.contains("is-start")); }catch(e){ return false; }
    };
    let last = performance.now();
    const tick = ()=>{
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
      if(el && started){
        let want = BASE;
        if(sfxUntil > now || live.size) want = SFX;
        if(typeof isPlaying !== "undefined" && isPlaying) want = VO;
        if(onGame()) want = 0;
        const tc = want < vol ? 0.12 : 0.6;
        vol += (want - vol) * (1 - Math.exp(-dt / tc));
        if(Math.abs(want - vol) < 0.002) vol = want;
        try{ el.volume = Math.max(0, Math.min(1, vol)); }catch(e){}
        if(want === 0 && vol < 0.003 && !el.paused) el.pause();
        else if(want > 0 && el.paused) el.play().catch(()=>{});
      }
    };
    (function loop(){ tick(); requestAnimationFrame(loop); })();
    setInterval(tick, 250);                       /* keeps steering if frames are throttled */
    /* the play button's tap - the same user gesture lets the browser play it */
    const hookPlay = ()=>{ const b = document.getElementById("sgBtn"); if(!b) return false;
      b.addEventListener("click", ()=>{ if(!b.disabled) tryStart(); }, true); return true; };
    if(!hookPlay()) document.addEventListener("DOMContentLoaded", hookPlay);
    return {
      /* an <audio> sound effect: the music stays down for as long as it plays */
      track(a){ if(!a) return; live.add(a);
        const off = ()=> live.delete(a);
        a.addEventListener("ended", off, { once:true }); a.addEventListener("pause", off, { once:true });
        a.addEventListener("error", off, { once:true }); setTimeout(off, 12000); },
      /* a buffer sound effect of known (or guessed) length */
      duckFor(sec){ sfxUntil = Math.max(sfxUntil, performance.now() + (sec || 1) * 1000 + 150); },
      get volume(){ return vol; }, get element(){ return el; }
    };
  })();
  window.__lessonBgm = BGM;
  /* the engine's buffer sound effects (celebration, play / next button sounds) duck it too */
  if(typeof window.playSfx === "function" && !window.playSfx.__bgm){
    const _ps = window.playSfx;
    window.playSfx = function(id){
      let sec = 1.0;
      try{ const s = "assets/Audio/" + id + "." + AUDIO_EXT;
           const b = (typeof _voiceBuffers !== "undefined") && (_voiceBuffers.get(s) || _voiceBuffers.get(_av(s)));
           if(b) sec = b.duration; }catch(e){}
      BGM.duckFor(sec);
      return _ps.apply(this, arguments);
    };
    window.playSfx.__bgm = true;
  }

  /* [r98] the cover's play button appears the first time it is ready (see .lt-play-shown) */
  (function playButtonAppears(){
    const hook = ()=>{
      const b = document.getElementById("sgBtn"); if(!b) return false;
      /* ready = enabled AFTER having been held for the greeting - the button starts life enabled
         for an instant before the lesson disables it, and that instant must not count */
      let held = false, ob = null;
      const chk = ()=>{
        const waiting = b.disabled || b.classList.contains("sg-waiting");
        if(waiting){ held = true; return; }
        if(!held) return;
        /* once, and the watcher stops: classList.add() rewrites the class attribute even when the
           class is already there, so adding it from inside this observer would re-trigger it forever */
        if(ob){ ob.disconnect(); ob = null; }
        if(!b.classList.contains("lt-play-shown")) b.classList.add("lt-play-shown");
      };
      ob = new MutationObserver(chk);
      ob.observe(b, { attributes:true, attributeFilter:["class", "disabled"] });
      chk();
      return true;
    };
    if(!hook()) document.addEventListener("DOMContentLoaded", hook);
  })();

  (function watchLanding(){
    let n = 0;
    const tick = ()=>{ if(dressLandingTrain()) return; if(++n > 60) return; setTimeout(tick, 120); };
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
    else tick();
  })();


})();


/* ==========================================================================================
   [r5] FLN ANIMATION KIT — ported from HI02H11_L02_S01's install
   github.com/ananya-goswami/fln-animation-toolkit · Recipe 1 (start screen stars, drift) ·
   Recipe 2 (tap to burst). Classic script only, per the kit's R3. Every entry point is wrapped
   so a throw here can never strand the boot loader (R4), and every effect checks the
   reduced-motion guard as well as the CSS kill-switch (R5).
   This is the "animation in the stars and bubble" Yasir found missing on the cover.
   ========================================================================================== */

/* ===== FLN ANIMATION KIT: core BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion = window.FLNMotion || {};
  M.still = function(){
    try{ return document.documentElement.classList.contains("no-anim") ||
      (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
    catch(_){ return false; }
  };
  M.scale = function(){
    try{ return parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue("--scale")) || 1; }catch(_){ return 1; }
  };
  M.guard = function(fn){
    try{ fn(); }catch(e){ try{ console.warn("[animation-kit]", e && e.message); }catch(_){} }
  };
  var _actx = null;
  M.audio = function(){
    try{
      var AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null;
      _actx = _actx || new AC();
      if(_actx.state === "suspended") _actx.resume();
      return _actx;
    }catch(_){ return null; }
  };
  M.ready = function(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  };
})();
/* ===== FLN ANIMATION KIT: core END ===== */

/* ===== FLN ANIMATION KIT: sky-drift BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion;

  function build(o){
    var sky = typeof o.container === "string" ? document.querySelector(o.container) : o.container;
    if(!sky) return null;
    sky.textContent = "";
    var maxSize = 0, frag = document.createDocumentFragment();

    o.layers.forEach(function(L, li){
      for(var i = 0; i < o.lanes; i++){
        var a = ((360 / o.lanes) * i + L.rot) * Math.PI / 180;
        var cos = Math.cos(a), sin = Math.sin(a);
        var size = +((o.size[0] + Math.random() * (o.size[1] - o.size[0])) * L.scale).toFixed(2);
        if(size > maxSize) maxSize = size;
        var dur = +(o.dur[0] + Math.random() * (o.dur[1] - o.dur[0])).toFixed(1);
        var el = document.createElement("i");
        el.className = o.shapes[(i + li) % o.shapes.length];
        el.style.cssText =
          "--s:"  + size + "vmax;" +
          "--x1:" + (o.r0 * cos).toFixed(2) + "vmax;--y1:" + (o.r0 * sin).toFixed(2) + "vmax;" +
          "--x2:" + (o.r1 * cos).toFixed(2) + "vmax;--y2:" + (o.r1 * sin).toFixed(2) + "vmax;" +
          "--t:"  + dur + "s;" +
          "--d:-" + (Math.random() * dur).toFixed(1) + "s;" +     // negative = de-sync
          "--g:"  + (o.glow[0] + Math.random() * (o.glow[1] - o.glow[0])).toFixed(1) + "s;" +
          "--gd:-" + (Math.random() * 4).toFixed(1) + "s;" +
          "--o:"  + (o.opacity[0] + Math.random() * (o.opacity[1] - o.opacity[0])).toFixed(2) + ";";
        frag.appendChild(el);
      }
    });
    sky.appendChild(frag);

    // collision proof: lane arc at the tightest radius must be >= 1.5x the largest element
    var arc = (2 * Math.PI * o.r0) / o.lanes, ok = arc >= maxSize * 1.5;
    if(!ok && o.warn !== false){
      console.warn("[animation-kit] sky lanes too tight: arc " + arc.toFixed(2) +
        "vmax vs element " + maxSize.toFixed(2) + "vmax. Reduce lanes or size.");
    }
    return { arc:arc, maxSize:maxSize, safe:ok, count:sky.children.length };
  }

  M.sky = {
    defaults: {
      container:".sg-sky", lanes:29,
      layers:[{rot:0,scale:1},{rot:6.2,scale:0.62},{rot:-6.2,scale:0.55}],
      r0:22, r1:72, size:[0.8,2.6], dur:[18,34], glow:[3.0,4.8],
      opacity:[0.62,0.92], shapes:["s1","s2","s3","s4","s5"], warn:true
    },
    init: function(opts){
      var o = Object.assign({}, this.defaults, opts || {}), res = null;
      M.guard(function(){ res = build(o); });
      return res;
    }
  };
  M.ready(function(){ M.guard(function(){ if(!window.__skyManual) M.sky.init(); }); });
})();
/* ===== FLN ANIMATION KIT: sky-drift END ===== */

/* ===== FLN ANIMATION KIT: sky-burst BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion;

  function boom(o){                      // sine thud + noise tail + square crackles
    var actx = M.audio(); if(!actx) return;
    try{
      var t = actx.currentTime, out = actx.createGain();
      out.gain.value = o.volume; out.connect(actx.destination);

      var tg = actx.createGain();
      tg.gain.setValueAtTime(0.9, t);
      tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      tg.connect(out);
      var osc = actx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.16);
      osc.connect(tg); osc.start(t); osc.stop(t + 0.18);

      var n = actx.sampleRate * 0.45;
      var buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
      for(var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
      var src = actx.createBufferSource(); src.buffer = buf;

      for(var c = 0; c < o.crackles; c++){
        var cg = actx.createGain(), ct = t + 0.10 + Math.random() * 0.30;
        cg.gain.setValueAtTime(0.0001, ct);
        cg.gain.exponentialRampToValueAtTime(0.18, ct + 0.006);
        cg.gain.exponentialRampToValueAtTime(0.0001, ct + 0.07);
        cg.connect(out);
        var co = actx.createOscillator();
        co.type = "square";
        co.frequency.setValueAtTime(1500 + Math.random() * 2200, ct);
        co.connect(cg); co.start(ct); co.stop(ct + 0.08);
      }
      var bp = actx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 3400; bp.Q.value = 0.8;
      var ng = actx.createGain();
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      src.connect(bp); bp.connect(ng); ng.connect(out); src.start(t + 0.02);
    }catch(_){}
  }

  function pop(el, r, o){
    el.classList.add("popped");
    // respawn on the next FLIGHT lap — the glow cycle is much shorter, so filter by name
    el.addEventListener("animationiteration", function back(e){
      if(e.animationName !== "sgFly") return;
      el.classList.remove("popped");
      el.removeEventListener("animationiteration", back);
    });

    var kind = "k-dot", cls = el.classList;
    for(var ci = 0; ci < cls.length; ci++){ if(o.kind[cls[ci]]) kind = o.kind[cls[ci]]; }

    var bs = Math.max(11, r.width);
    var b = document.createElement("div");
    b.className = "sg-burst " + kind;
    b.style.left = (r.left + r.width / 2) + "px";
    b.style.top  = (r.top  + r.height / 2) + "px";
    b.style.setProperty("--bs", bs + "px");
    b.appendChild(document.createElement("div")).className = "fl";

    var k = 0;
    for(var g = 0; g < o.rings.length; g++){
      var R = o.rings[g], off = Math.random() * Math.PI * 2;
      for(var i = 0; i < R.n; i++, k++){
        var a = off + i / R.n * Math.PI * 2;
        var dist = bs * R.rad * (0.78 + Math.random() * 0.44);
        var p = document.createElement("i");
        p.style.cssText =
          "--ps:"  + (bs * R.size * (0.8 + Math.random() * 0.5)).toFixed(1) + "px;" +
          "--dx:"  + (Math.cos(a) * dist).toFixed(1) + "px;" +
          "--dy:"  + (Math.sin(a) * dist).toFixed(1) + "px;" +
          "--gy:"  + (dist * o.gravity).toFixed(1) + "px;" +
          "--sd:"  + (R.dur + Math.random() * 0.22).toFixed(2) + "s;" +
          "--sdl:" + (Math.random() * 0.06).toFixed(3) + "s;" +
          "color:" + o.hues[k % o.hues.length];
        b.appendChild(p);
      }
    }
    document.body.appendChild(b);
    if(o.sound) boom(o);
    setTimeout(function(){ b.remove(); }, o.life);
  }

  M.skyBurst = {
    defaults: {
      container:".sg-sky", when:["is-start","is-end"],
      rings:[{n:9,rad:3.1,size:.58,dur:.80},{n:7,rad:1.8,size:.78,dur:.62}],
      hues:["#FCB717","#3B7DD8","#21A74A","#E5484D","#7048D6","#F1781D"],
      kind:{s1:"k-star",s2:"k-star",s3:"k-spark",s4:"k-dot",s5:"k-dot"},
      gravity:0.42, pad:12, padRatio:0.7, minAlpha:0.08, life:1200,
      sound:true, volume:0.22, crackles:4
    },
    init: function(opts){
      var o = Object.assign({}, this.defaults, opts || {});
      M.guard(function(){
        var sky = typeof o.container === "string"
          ? document.querySelector(o.container) : o.container;
        if(!sky) return;
        // capture phase: .sg-sky is pointer-events:none, so hit-test by rect (R6)
        document.addEventListener("pointerdown", function(e){
          if(M.still()) return;
          if(!o.when.some(function(c){ return document.body.classList.contains(c); })) return;
          /* INTERACTIVE_TAPS_ARE_NOT_OURS. This handler claims the tap with preventDefault(),
             which kills the CLICK that would have followed — so a star drifting over शुरू करें
             made the button silently ignore the press. Worse, the mask that hides stars behind
             the centre card is visual only: those stars still have a box and a non-zero computed
             opacity, so the kit's minAlpha test cannot tell they are invisible, and the play
             button sits right inside that masked area. A control's tap is never ours to take. */
          if(e.target && e.target.closest &&
             e.target.closest("button,a,input,select,textarea,[role=button],[onclick]")) return;
          var els = sky.querySelectorAll("i:not(.popped)");
          for(var i = 0; i < els.length; i++){
            var el = els[i], r = el.getBoundingClientRect();
            if(r.width < 2) continue;
            var pad = Math.max(o.pad, r.width * o.padRatio);   // ~4px targets need slack
            if(e.clientX < r.left - pad || e.clientX > r.right  + pad ||
               e.clientY < r.top  - pad || e.clientY > r.bottom + pad) continue;
            if(parseFloat(getComputedStyle(el).opacity) < o.minAlpha) continue;
            // claim the tap, or it also fires the button under the star
            e.stopPropagation(); e.preventDefault();
            var op = Object.assign({}, o);
            if(typeof isMuted !== "undefined" && isMuted) op.sound = false;   // honour the dev mute
            pop(el, r, op);
            return;
          }
        }, true);
      });
    }
  };
  M.ready(function(){ M.guard(function(){ M.skyBurst.init(); }); });
})();
/* ===== FLN ANIMATION KIT: sky-burst END ===== */
