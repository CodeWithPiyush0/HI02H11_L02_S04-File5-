
/* ============================================================================================
   «मात्राओं की रेल» — TRAIN MODULE SET                        [local to HI02H11_L02_S03]
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

   THE LADDER IS 3-ATTEMPT HERE, per the SME on all nine test screens, and it now lives in
   exactly ONE place - makeHints(). See its header for what had drifted and for the idle cue,
   which reads scaffold_rules.nudge_timeout_ms (declared by every card, read by nothing until now).
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
  function say(src, next){
    let done = false;
    const go = () => { if(done) return; done = true; if(next) next(); };
    try { play(clip(src) || null, go); } catch(e){ go(); return; }
    setTimeout(go, 9000);
  }
  function sayAll(list, next){
    let i = 0;
    (function step(){ if(i >= list.length){ if(next) next(); return; } say(list[i++], step); })();
  }

  /* ---------------------------------------------------------------- procedural SFX */
  /* The SME asks for a train arrival sound, a soft pop as each matra lands and a sparkle when
     one is highlighted. The engine already synthesises its SFX with _tone() rather than
     shipping audio files, so these are built the same way — no new assets, nothing to 404. */
  const _t = (f, w, d, v) => { if(typeof _tone === "function") _tone(f, w, d, v); };
  const sfxWhistle = ()=> _t([430, 660, 560], "sine", 0.55, 0.075);   // two-tone arrival toot
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

  /* How far `txt` PAINTS above its baseline, in the same computed font as `ref`.
     Canvas reports the real ink box (actualBoundingBoxAscent), which the DOM will not give us.
     The units match the element's own px font size, so this is directly comparable to the
     baseline offset measured with the strut in matraHL(). Used to tell an above-base mark
     (े, ै) from a below-base one (ु, ू) — both have zero advance, so width cannot separate
     them, but the ink rise can. */
  let _inkCv = null;
  function _inkAscent(txt, ref){
    if(!txt) return 0;
    const cs = getComputedStyle(ref);
    _inkCv = _inkCv || document.createElement("canvas").getContext("2d");
    _inkCv.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
    const m = _inkCv.measureText(txt);
    return isFinite(m.actualBoundingBoxAscent) ? m.actualBoundingBoxAscent : 0;
  }

  /* THE MARK'S ACTUAL INK BOX, measured by rendering the cluster twice and diffing.

     The three heuristic modes (right / above / below) each guessed a BAND, and a band is always
     too generous in one axis. Caught in the review capture of सेब: clipping the full cluster
     WIDTH above the headline turned the whole shirorekha red under the hook, so the word read as
     "red bar + navy letters" instead of "navy letters + red mark".

     Rendering `से` and `स` at the same origin and taking the bounding box of the CHANGED pixels
     gives the mark's real extent in both axes — no guessing, no per-matra list, and it degrades
     gracefully: where the mark overlaps the consonant (the ए hook meets the shirorekha) both
     renders are ink, so those pixels do not differ and the box stays tight on the part that is
     actually distinct.

     Returns offsets relative to the drawing origin — x from the cluster's left edge, y from the
     BASELINE (negative = above it) — so the caller can place it against its own measurements. */
  let _mbCv = null, _mbCx = null;
  let _mkCv = null, _mkCx = null;
  /* ------------------------------------------------------------------ the mark's own pixels
     Returns a CANVAS whose opaque pixels are exactly the ink the matra adds to its consonant,
     drawn with the text origin at (ox, oy) — so the caller blits it at (clusterLeft, baseline).

     WHY A MASK AND NOT A BOX. ो is a hook above the consonant AND a bar to its right; ौ is the
     same with two hooks. Any single rectangle containing both parts also contains the consonant
     sitting between them, and the overlay paints every bit of ink inside its clip. Measured on
     this font at 100px: a bounding-box clip reddens 37% of म under ो and 42% under ौ, against
     0% for े and ै. Two boxes would fix ो and break on the next mark that is not two pieces.
     The diff is per-pixel already; using it directly is both exact and matra-agnostic.

     The mask is DILATED by one pixel. The diff's edge pixels are antialiased and partially
     transparent, so an undilated mask leaves a pale fringe of the original navy showing through
     around every red stroke — visible when magnified, which is how the band version's bugs were
     caught in the first place. */
  function _markMask(cluster, base, ref){
    if(!cluster || !base || cluster === base) return null;
    const cs = getComputedStyle(ref);
    const fpx = parseFloat(cs.fontSize) || 0;
    if(!fpx) return null;
    const W = Math.ceil(fpx * 3), H = Math.ceil(fpx * 3);
    if(!_mkCv){ _mkCv = document.createElement("canvas");
      _mkCx = _mkCv.getContext("2d", { willReadFrequently:true }); }
    if(_mkCv.width < W || _mkCv.height < H){ _mkCv.width = W; _mkCv.height = H; }
    const font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
    const ox = Math.round(fpx * 0.6), oy = Math.round(fpx * 2.0);
    function alpha(txt){
      _mkCx.clearRect(0, 0, _mkCv.width, _mkCv.height);
      _mkCx.font = font; _mkCx.textBaseline = "alphabetic"; _mkCx.fillStyle = "#000";
      _mkCx.fillText(txt, ox, oy);
      return _mkCx.getImageData(0, 0, W, H).data;
    }
    let A, B;
    try { A = alpha(cluster); B = alpha(base); } catch(e){ return null; }

    const on = new Uint8Array(W * H);
    let any = false;
    for(let i = 0, p = 3; i < W * H; i++, p += 4){
      if(Math.abs(A[p] - B[p]) > 40){ on[i] = 1; any = true; }
    }
    if(!any) return null;

    const out = document.createElement("canvas");
    out.width = W; out.height = H;
    const octx = out.getContext("2d");
    const img = octx.createImageData(W, H);
    const d = img.data;
    for(let y = 0; y < H; y++){
      for(let x = 0; x < W; x++){
        const i = y * W + x;
        let hit = on[i];
        if(!hit){                                   // 1px dilation, 4-neighbourhood
          if(x > 0     && on[i - 1]) hit = 1;
          else if(x < W - 1 && on[i + 1]) hit = 1;
          else if(y > 0     && on[i - W]) hit = 1;
          else if(y < H - 1 && on[i + W]) hit = 1;
        }
        if(hit){ const q = i * 4; d[q] = d[q+1] = d[q+2] = 255; d[q+3] = 255; }
      }
    }
    octx.putImageData(img, 0, 0);
    return { canvas: out, ox: ox, oy: oy, w: W, h: H };
  }

  function _markBox(cluster, base, ref){
    if(!cluster || !base || cluster === base) return null;
    const cs = getComputedStyle(ref);
    const fpx = parseFloat(cs.fontSize) || 0;
    if(!fpx) return null;
    const W = Math.ceil(fpx * 3), H = Math.ceil(fpx * 3);
    if(!_mbCv){ _mbCv = document.createElement("canvas"); _mbCx = _mbCv.getContext("2d", { willReadFrequently:true }); }
    if(_mbCv.width < W || _mbCv.height < H){ _mbCv.width = W; _mbCv.height = H; }
    const font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
    const ox = Math.round(fpx * 0.6), oy = Math.round(fpx * 2.0);   // origin: pen x, baseline y
    function alpha(txt){
      _mbCx.clearRect(0, 0, _mbCv.width, _mbCv.height);
      _mbCx.font = font; _mbCx.textBaseline = "alphabetic"; _mbCx.fillStyle = "#000";
      _mbCx.fillText(txt, ox, oy);
      return _mbCx.getImageData(0, 0, W, H).data;
    }
    let A, B;
    try { A = alpha(cluster); B = alpha(base); } catch(e){ return null; }   // tainted canvas etc.
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for(let y = 0; y < H; y++){
      const row = y * W * 4;
      for(let x = 0; x < W; x++){
        const i = row + x * 4 + 3;
        if(Math.abs(A[i] - B[i]) > 40){
          if(x < x0) x0 = x; if(x > x1) x1 = x;
          if(y < y0) y0 = y; if(y > y1) y1 = y;
        }
      }
    }
    if(x1 < 0) return null;
    return { dx0: x0 - ox, dx1: x1 - ox + 1, dy0: y0 - oy, dy1: y1 - oy + 1 };
  }

  /* el: an element whose ONLY child is the word text. Rewrites it as .mh + clipped overlays. */
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

    /* baseline, via a zero-size inline-block strut: its top edge sits on the baseline */
    const strut = document.createElement("span");
    strut.style.cssText = "display:inline-block;width:0;height:0";
    el.appendChild(strut);
    const baseline = strut.getBoundingClientRect().top - rect.top;
    strut.remove();

    const tn = el.firstChild;
    if(!tn || tn.nodeType !== 3) return false;

    /* ONE mask canvas for the whole word, at device resolution. Every marked cluster stamps its
       own pixels into it, so a word carrying the matra twice needs one overlay, not two. */
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    let maskCv = null, maskCx = null;
    function maskCanvas(){
      if(maskCv) return maskCv;
      maskCv = document.createElement("canvas");
      maskCv.width  = Math.max(1, Math.round(rect.width  * dpr));
      maskCv.height = Math.max(1, Math.round(rect.height * dpr));
      maskCx = maskCv.getContext("2d");
      maskCx.scale(dpr, dpr);
      return maskCv;
    }

    let off = 0, made = 0;
    const ringAt = [];
    clusters.forEach(cl => {
      if(cl.indexOf(matra) >= 0){
        const r = document.createRange();
        r.setStart(tn, off); r.setEnd(tn, off + cl.length);
        const cb = r.getBoundingClientRect();
        let x0 = cb.left - rect.left, x1 = cb.right - rect.left, y0 = baseline, y1 = rect.height;

        /* WHICH BAND OF THE CLUSTER IS THE MARK? Three answers, and the code MEASURES rather
           than consulting a hard-coded list of matras, so a new matra needs no new branch.

             right-spacing (ा, ी)  — the mark owns its own ADVANCE to the right of the
                                     consonant, so it is the slice beyond the base's width,
                                     at full height.
             above-base   (े, ै)   — zero advance, but the cluster's ink rises ABOVE the
                                     consonant's. The mark is everything above the base's
                                     ink top (which in Devanagari IS the shirorekha).
             below-base   (ु, ू)   — zero advance, no extra rise: the mark hangs under the
                                     baseline and shares the consonant's columns.

           Measured on this font at 100px: े rises 27px and ै rises 31px above their base,
           while advance growth is 0 for both — which is exactly why the engine's own
           column-clip cannot touch them and why ु/ू and े/ै need opposite bands.
           Verified by rendering बेल / बैल / केला / पैसा at 150px: one red stroke for े, two
           for ै, consonant and shirorekha untouched. */
        const base = cl.split(matra).join("");

        /* EXACT PATH: stamp the mark's own pixels into the word-wide mask. */
        const mk = base ? _markMask(cl, base, el) : null;
        if(mk){
          maskCanvas();
          maskCx.drawImage(mk.canvas, x0 - mk.ox, baseline - mk.oy);
          const bb = _markBox(cl, base, el);
          if(bb) ringAt.push({ cx: x0 + (bb.dx0 + bb.dx1) / 2,
                               cy: baseline + (bb.dy0 + bb.dy1) / 2,
                               w: bb.dx1 - bb.dx0, h: bb.dy1 - bb.dy0 });
          made++;
          off += cl.length;
          return;
        }

        const mb = base ? _markBox(cl, base, el) : null;
        if(mb){
          /* exact: the mark's own ink box, 1px of padding so antialiasing is not shaved */
          const clusterLeft = x0;
          x0 = clusterLeft + mb.dx0 - 1;
          x1 = clusterLeft + mb.dx1 + 1;
          y0 = baseline + mb.dy0 - 1;
          y1 = baseline + mb.dy1 + 1;
        } else if(base){
          /* FALLBACK — only if the canvas diff is unavailable (tainted canvas, no 2d context).
             Coarser: a whole band in one axis, which is what shipped first and what turned the
             shirorekha red under an ए hook. */
          const grow = _advance(cl, el) - _advance(base, el);
          if(grow > 3){
            x0 = x0 + (x1 - x0) - grow; y0 = 0;                    // right-spacing
          } else {
            const fpx = parseFloat(getComputedStyle(el).fontSize) || 0;
            const rise = _inkAscent(cl, el) - _inkAscent(base, el);
            if(fpx && rise > fpx * 0.08){
              y0 = 0; y1 = Math.max(0, baseline - _inkAscent(base, el));   // above-base
            }
            /* else: leave y0 = baseline, y1 = rect.height — below-base */
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
        ov.style.clipPath = "polygon(" + x0 + "px " + y0 + "px," + x1 + "px " + y0 + "px," +
                            x1 + "px " + y1 + "px," + x0 + "px " + y1 + "px)";
        el.appendChild(ov);
        made++;
      }
      off += cl.length;
    });
    /* ---------------------------------------------------------------- the marker ring
       अं is a DOT. Measured on this font: the anusvara's ink is 17x16px at a 100px font, against
       105px tall for ो. At the sizes this engine actually renders labels — .tr-cardlbl is 21px,
       .sc-optlbl 24px — that is a red speck **3 to 4 pixels across**. A child cannot see it, and
       seeing it is the entire skill.

       So a small ring is drawn around the mark. Two things about it matter:

       1. IT IS PER LESSON, NOT PER MARK. Ringing only the marks that happen to be small would
          hand the child a shortcut: on a screen asking अं or अः, a ring around one and not the
          other IS the answer, and they would learn the ring instead of the mark. The card turns
          it on for the whole lesson (scaffold_rules.mark_ring) so every mark carries one.
       2. It is an ADDITION to "highlight only the matra strokes in red", which the SME wrote for
          marks you can see unaided. Flagged to them rather than assumed. */
    const wantRing = !!(CARD.scaffold_rules && CARD.scaffold_rules.mark_ring);
    if(maskCv && wantRing && ringAt.length){
      /* An ELLIPSE around the mark's own box, not a circle around its longest side. The visarga
         is two stacked dots — 12x25px on a tap coach — and a circle big enough to clear that is
         wider than the letter it belongs to. Padding is the same on both axes, so a round mark
         still gets a round ring. */
      const fpx = parseFloat(getComputedStyle(el).fontSize) || 0;
      const pad = Math.max(10, fpx * 0.12);
      ringAt.forEach(r => {
        const w = r.w + pad, h = r.h + pad;
        const ring = document.createElement("span");
        ring.className = "mh-ring";
        ring.setAttribute("aria-hidden", "true");
        ring.style.left   = (r.cx - w / 2) + "px";
        ring.style.top    = (r.cy - h / 2) + "px";
        ring.style.width  = w + "px";
        ring.style.height = h + "px";
        el.appendChild(ring);
      });
    }

    /* the single mask overlay, if the exact path produced anything */
    if(maskCv){
      const ov = document.createElement("span");
      ov.className = "mh-ov" + (opts && opts.glow ? " mh-glow" : "");
      ov.setAttribute("aria-hidden", "true");
      ov.setAttribute("data-w", word);
      let url = null;
      try { url = maskCv.toDataURL("image/png"); } catch(e){ url = null; }
      if(url){
        const u = "url(" + url + ")";
        ov.style.webkitMaskImage = u;   ov.style.maskImage = u;
        ov.style.webkitMaskSize  = "100% 100%"; ov.style.maskSize = "100% 100%";
        ov.style.webkitMaskRepeat = "no-repeat"; ov.style.maskRepeat = "no-repeat";
        el.appendChild(ov);
      } else {
        /* toDataURL threw (tainted canvas). Better a coarse mark than none: fall back to the
           mask's bounding box, which is what the box path would have produced anyway. */
        made = 0;
      }
    }

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
    /* A HIDDEN PAGE REPORTS ZERO RECTS. Chromium returns width 0 from getBoundingClientRect
       (and from a Range rect) while document.hidden is true — offsetWidth still reports the
       real box, but matraHL needs the Range rects, which do not survive it. So a lesson that
       mounts in a backgrounded tab would come back with the matra UNCOLOURED and no error,
       and the retry loop above would just burn its ten attempts against zeros.
       Caught on the bench: docHidden true, offsetWidth 80, rect width 0.
       Re-apply once the tab is actually looked at. */
    if(typeof document.hidden === "boolean"){
      const onShow = ()=>{
        if(document.hidden) return;
        document.removeEventListener("visibilitychange", onShow);
        if(el && el.isConnected && !el.querySelector(".mh-ov")) matraHLSoon(el, matra, opts);
      };
      if(document.hidden) document.addEventListener("visibilitychange", onShow);
    }
  }

  /* ---------------------------------------------------------------- the train shell */
  /* One locomotive + N coaches. Pure SVG/CSS: the train is UI chrome, and chrome is never
     generated art (house rule) — it also has to recolour per coach and animate, which a PNG
     cannot. Returns handles so each module can drive the coach states itself. */
  function buildTrain(host, opts){
    const n = opts.coaches;
    const wrap = document.createElement("div");
    wrap.className = "tr-wrap";
    const rail = document.createElement("div");
    rail.className = "tr-rail";

    const loco = document.createElement("div");
    loco.className = "tr-loco";
    loco.innerHTML =
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
      '</svg>' +
      '<span class="tr-steam" aria-hidden="true"><i></i><i></i><i></i></span>';
    rail.appendChild(loco);

    const coaches = [];
    const PALETTE = ["c-rose", "c-green", "c-amber", "c-violet"];
    for(let i = 0; i < n; i++){
      const c = document.createElement("div");
      c.className = "tr-coach " + PALETTE[i % PALETTE.length];
      c.dataset.idx = String(i);
      const lbl = document.createElement("div");
      lbl.className = "tr-label";
      lbl.innerHTML = (opts.labels && opts.labels[i] != null) ? opts.labels[i] : "";
      const body = document.createElement("div");
      body.className = "tr-body" + (opts.dropZone ? " dd-zone" : "");
      if(opts.dropZone) body.dataset.idx = String(i);
      if(opts.bodies && opts.bodies[i] != null) body.innerHTML = opts.bodies[i];
      const car = document.createElement("div");
      car.className = "tr-car";
      car.appendChild(body);
      c.appendChild(lbl); c.appendChild(car);
      rail.appendChild(c);
      coaches.push({ el: c, body: body, label: lbl });
    }

    const track = document.createElement("div");
    track.className = "tr-track";
    wrap.appendChild(rail); wrap.appendChild(track);
    host.appendChild(wrap);

    /* ENTRY. The settled state is the DEFAULT (see engine fact 1); this class animates it in
       from the right. With animation disabled the train is simply already there.
       SME: "Add a soft train arrival / whistle SFX when the train enters." */
    requestAnimationFrame(()=>{ wrap.classList.add("tr-enter"); sfxWhistle(); });

    return {
      wrap, loco, coaches,
      /* soft pulse + the guiding hand, used only at the 2nd wrong attempt */
      /* [28f] THE GUIDING HAND IS PHASE-GATED and the engine enforces it in ONE place:
         guided -> hand only after 2 failed attempts; practice/independent/mastery -> NO HAND,
         "regardless of whatever name we save it by". The engine's own note is explicit that a
         new mechanic must call handOnAnswer(), not pointNudgeAt() — ~25 direct callers bypassed
         the gate once already and a hand turned up in round 3.
         The coach GLOW is ours and is not phase-gated: it marks the answer in every phase, so a
         practice slide still escalates visually without breaking the ruling.
         NOTE this narrows the SME's "show hand nudge on the correct answer", which they asked
         for on every test screen — on practice screens the hand is withheld by the older ruling.
         Flagged for them rather than silently overridden. */
      nudge(i, slide){ const c = coaches[i]; if(!c) return;
        c.el.classList.add("is-nudge");
        revealHand(c.el, slide);
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
      /* SME, on every sort screen: "all coaches glow, train gives a small whistle/steam
         animation, Next button becomes active". The steam puffs are CSS on .tr-done. */
      finish(){ coaches.forEach(c => c.el.classList.add("is-correct"));
        wrap.classList.add("tr-done"); sfxWhistle(); }
    };
  }

  /* ==========================================================================================
     THE HINT ENGINE — one implementation, used by every test module in this lesson.

     The SME's ladder used to be hand-copied into five more modules and had drifted in all five:
       * `hint_shown` fired only from TRAIN_TAP. It is in signals_expected, so the dashboard
         reported zero hints on 8 of the 11 test screens — the help was given, never recorded.
       * state.scaffoldLevel was never raised outside TRAIN_TAP.
       * MATRA_FILL forgot Swiftee's `tryagain` face, so the child got audio but no character.
       * NOTHING anywhere read scaffold_rules.nudge_timeout_ms. The card declares 6s/8s and no
         code had ever looked at it: a child who simply sat still got nothing, for ever, on all
         eleven test screens. That is the real gap this block closes.

     THE LADDER (SME, every test screen):
       miss 1   -> shake + hint1 VO, explicitly NO hand
       miss 2   -> shake + hint2 VO, then the nudge on the CORRECT target
       miss 3+  -> hint2 and the nudge again; `hint_shown` is emitted ONCE, not per miss, or the
                   mastery signal ends up counting keystrokes instead of children
       solved on the last allowed attempt -> celebrate visually, SILENT (see finishSlide)

     ESCALATION IS PER SCREEN, NOT PER CARD. On sort/fill/build the counter used to be per card,
     so a child who missed card A once and card B once heard hint1 twice and never reached
     hint2 — never earning the help that [28f] says two failures have paid for. Level is now
     max(this card's misses, 2 once the SCREEN has seen 2), so the second miss anywhere escalates.

     THE IDLE HINT IS ONE EVENT, AND IT SITS BEHIND THE ENGINE'S OWN.
     The engine already replays the PROMPT after 7s of silence, exactly once per slide, on every
     test phase ([27b]/[27d]/[27f]) — a first cut of this block replayed the prompt too, at 6s,
     which simply talked over it. So this fires only AFTER the engine's one reminder has been
     spent, and it says something NEW: hint1, the thing a child who has already heard the
     question again still does not have. One event, then silence — [27f] is explicit that a
     reminder on a loop is nagging ("an unattended tab heard the prompt again every 7s forever").

     It never points at the answer. It is un-earned help — a timer, not two failed attempts — and
     [28i] bans the un-earned hand outside tutorial for exactly that reason. It pulses the whole
     tray, which says "your turn", not "this one".

     Its knob is scaffold_rules.idle_hint_ms, NOT nudge_timeout_ms. nudge_timeout_ms is the
     engine's HAND timer, and [28i] makes the engine refuse it outside tutorial, so the
     guided:6000/practice:8000 this card declares has never done anything and still does not.
     ========================================================================================== */
  let lastPointer = 0;
  document.addEventListener("pointerdown", ()=>{ lastPointer = Date.now(); }, true);

  /* which of the lesson's matras a cluster carries — used to mark a dragged अक्षर at Hint 2 */
  const ALL_MATRAS = "ािीुूृेैोौ";
  function matraIn(txt){
    for(const ch of (txt || "")) if(ALL_MATRAS.indexOf(ch) >= 0) return ch;
    return null;
  }

  /* ------------------------------------------------------------------ the Hint-3 hand
     ONE place decides whether the guiding hand appears, and it asks the SLIDE, not the phase.

     The SME's S03 review (2026-09-30) moved the «अब आपकी बारी!» gate to AFTER the last sentence
     screen, which makes word-build, the picture sort and all three sentences GUIDED. The engine's
     [28f] rule allows the hand in guided — but those five screens' own notes still say, in as
     many words: "Practice-Round Hand Nudge: Confirm with Ankita whether Hint 3 should include a
     hand drag nudge. Pending confirmation, use glow and lock without a hand."

     So the phase can no longer answer the question on its own. A slide carrying
     `data.hint3_hand: false` gets the glow and the lock and NO hand, in any phase; every other
     slide falls through to handOnAnswer(), which still enforces [28f] (never a hand in round 3).
     When Ankita rules, the change is one boolean per slide in the builder — no engine edit. */
  function revealHand(el, slide){
    if(!el || !slide) return;
    if(slide.data && slide.data.hint3_hand === false) return;
    if(typeof handOnAnswer === "function") handOnAnswer(el, slide);
  }

  /* "Disable all answer taps and drags while ANY VO is playing" — the SME's Developer Notes say
     ANY, and the per-item praise is a VO like any other. A child who drags the next card while
     «शाबाश! शेर शब्द में ए की मात्रा है» is still playing would talk over their own feedback. */
  function sayLocked(host, src, cb){
    if(!src){ if(cb) cb(); return; }
    lockInput(host, true);
    let done = false;
    const release = ()=>{ if(done) return; done = true; lockInput(host, false); if(cb) cb(); };
    say(src, release);
    setTimeout(release, 12000);                 // a clip that never ends must not freeze the tray
  }

  function pulseIdle(el){
    if(!el) return;
    el.classList.remove("tr-idlecue"); void el.offsetWidth; el.classList.add("tr-idlecue");
    setTimeout(()=> el.classList.remove("tr-idlecue"), 2000);
  }

  /* ------------------------------------------------------------------ input lock during VO
     "Disable all answer taps and drags while any VO is playing" appears in the Developer Notes
     of EVERY screen in the SME's review. Taps already check isPlaying; drags do not, because
     makeDraggable is shared engine code and gating it there would change every other lesson.
     state.revealing is the flag makeDraggable already refuses a grab on, so the lock rides on
     that plus pointer-events, and is always released in a finally-style callback — a lock left
     on is a dead screen, which is worse than the double-tap it prevents. */
  function lockInput(host, on){
    if(!host) return;
    host.classList.toggle("hint-locked", !!on);
    state.revealing = !!on;
  }

  /* ==========================================================================================
     THE HINT ENGINE — three rungs, one implementation, every test module.

     The SME's page-by-page review replaced the two-rung ladder with three:

       Hint 1  1st wrong  shake the chosen item and return it. NOTHING else — no matra
                          highlight, no glow, no hand. VO re-asks the question.
       Hint 2  2nd wrong  shake and return, then COMPARE. What is compared differs per screen
                          and the difference is deliberate, so it is a hook:
                            TRAIN_TAP  read all options L->R, highlight each one's matra, and
                                       LEAVE the highlights up so the child can compare.
                            SORT/BUILD read only the wrongly dropped item, highlight its matra.
                            SENTENCE   read the whole sentence with each option previewed in the
                                       blank, and highlight the matching detail in the scene.
                          Still no glow on the answer, still no hand.
       Hint 3  3rd wrong  REVEAL: glow the correct answer, lock the distractors, say what the
                          answer is — and then WAIT. The child still performs the action.
                          Nothing is ever placed or advanced automatically.

     After a Hint-3 completion the item celebrates in SILENCE: Hint 3 already said it. Note this
     is not the old `silent_on_late_correct`, which keyed on the attempt COUNT — this keys on
     whether the reveal was given, which is the thing the SME actually described.

     `hint_shown` is emitted once per RUNG reached, never per miss, or the mastery signal counts
     keystrokes instead of children.

     COUNTER SCOPE IS PER SCREEN, not universal — the notes are explicit and they differ:
       TRAIN_TAP, SENTENCE_COMPLETE  one counter for the screen. "Switching from पैर to बैल must
                                     not reset the counter."
       TRAIN_SORT                    one per card; a new card starts at zero; unfinished cards
                                     keep their counters when the child switches.
       WORD_BUILD                    one per correct अक्षर, plus one per BLANK for distractor
                                     drops, which must survive swapping one distractor for
                                     another.
     The module passes `scope(key)` to say which. A name-only tap, and a release outside any
     drop zone, are not attempts anywhere.
     ========================================================================================== */
  function makeHints(slide, hooks){
    hooks = hooks || {};
    const misses = new Map();
    let seen = 0, idleStep = 0, idleTimer = null, spentAt = 0;
    const announced = {};                       // one hint_shown per rung, not per miss
    /* A timer armed on this slide must not fire on the next one. mountSlide has no teardown
       hook to hang this on, so every tick re-checks that we are still the slide on screen. */
    const myIdx = (state && typeof state.idx === "number") ? state.idx : null;
    const stale = ()=> state.locked ||
                       (myIdx !== null && state.idx !== myIdx) ||
                       (hooks.host && !hooks.host.isConnected);

    const scope = (key)=> (hooks.scope ? hooks.scope(key) : "_");
    const at = (key)=> misses.get(scope(key)) || 0;
    /* Hint 3 has been given for this item — the caller celebrates it without a praise clip. */
    const revealed = (key)=> at(key) >= 3;

    /* Wrap a rung so the screen is inert while it speaks and live again the instant it stops,
       whatever happens in between. */
    function rung(fn){
      lockInput(hooks.host, true);
      let done = false;
      const release = ()=>{ if(done) return; done = true; lockInput(hooks.host, false); arm(); };
      try { fn(release); } catch(e){ release(); throw e; }
      setTimeout(release, 20000);              // a clip that never ends must not freeze the screen
    }

    function wrong(key, target){
      const k = scope(key);
      const n = (misses.get(k) || 0) + 1;
      misses.set(k, n); seen++;
      state.attempts = seen;
      stopIdle();
      if(typeof sfxWrongSoft === "function") sfxWrongSoft();
      if(typeof setSwMood === "function") setSwMood("tryagain");
      if(hooks.shake) hooks.shake(key, target);
      SwiftPAL.emit("answer_wrong",
        { slide_id: slide.id, phase: slide.phase, attempts: seen, item: String(k), item_misses: n });

      const rungNo = Math.min(n, 3);
      if(rungNo >= 2){
        state.scaffoldLevel = rungNo; state.hintUsed = true;
        if(!announced[rungNo]){ announced[rungNo] = true;
          SwiftPAL.emit("hint_shown",
            { slide_id: slide.id, phase: slide.phase, level: rungNo, item: String(k) }); }
      }

      if(rungNo === 1){
        /* "Do not highlight any word or matra. Do not show a hand nudge." */
        /* THE PICTURE ROUND puts the picture's NAME inside the rung: «फिर से सुनिए।» — "Play the
           current picture's name, then:" — «चित्र को सही मात्रा वाले डिब्बे में डालिए।». The S03
           build played the two lines as one clip with no name between them. `hint1Name(key)`
           supplies the item's name clip; `hint1_tail` is the line after it. Still played HERE,
           so the ladder is not forked into a module. */
        const nm = hooks.hint1Name ? hooks.hint1Name(key) : null;
        if(nm && A(slide, "hint1_tail"))
          rung(done => sayAll([A(slide, "hint1"), nm, A(slide, "hint1_tail")], done));
        else
          rung(done => say(A(slide, "hint1") || A(slide, "try_again"), done));
      } else if(rungNo === 2){
        rung(done => {
          if(hooks.hint2) hooks.hint2(key, target, done);
          else say(A(slide, "hint2") || A(slide, "hint"), done);
        });
      } else {
        /* "Wait for the child. Do not select the answer or advance automatically." */
        rung(done => {
          if(hooks.reveal) hooks.reveal(key, target, done);
          else say(A(slide, "hint3") || A(slide, "hint2"), done);
        });
      }
      return n;
    }

    /* Has the engine's own 7s prompt replay been spent? `_idleVoFired` is a plain `let` in the
       monolith's top-level scope, which this injected IIFE can read — but only if the injector
       put us in the same <script>, so the read is guarded. Unknown reads as "spent", which makes
       this cue LATER rather than earlier: the failure mode is silence, not two voices at once. */
    function engineReminderSpent(){
      try { return !!_idleVoFired; } catch(e){ return true; }
    }
    const idleMs = ()=> (CARD.scaffold_rules && CARD.scaffold_rules.idle_hint_ms) || 9000;
    function stopIdle(){ clearTimeout(idleTimer); idleTimer = null; }
    function arm(){
      stopIdle();
      const ms = idleMs();
      if(!ms || idleStep >= 1 || stale()) return;      // ONE idle hint per slide, ever
      idleTimer = setTimeout(()=>{
        if(stale()) return;
        /* Hold, do not fire, while anything is speaking, while a rung is running, before the
           engine has had its turn, or while the child is actually touching the screen — a drag
           does not go through touch(), so the pointer clock is what keeps this off a busy child. */
        if(isPlaying || state.revealing || state.demoRunning){ arm(); return; }
        /* the clock starts when the ENGINE's reminder is spent, not at mount, or the two land
           back to back and the child hears the question and a hint in one breath */
        if(!engineReminderSpent()){ arm(); return; }
        if(!spentAt) spentAt = Date.now();
        if((Date.now() - spentAt) < ms || (Date.now() - lastPointer) < ms){ arm(); return; }
        idleStep++;
        if(hooks.idle) hooks.idle();
        SwiftPAL.emit("idle_cue", { slide_id: slide.id, phase: slide.phase, step: idleStep });
        say(A(slide, "hint1") || A(slide, "hint"), ()=>{});
      }, Math.min(ms, 1500));                           // re-check often; fire on the real clock
    }

    return { wrong, revealed, at, arm, touch: arm, stop: stopIdle,
             lock: (on)=> lockInput(hooks.host, on),
             total: ()=> seen };
  }

  /* Play a list of clips in order, each gated on the previous ENDING, running `before` for each.
     Hint 2 is a read-through on every screen, and a fixed timer between lines truncates them —
     the trap [32b nocut] recorded when fixed 1400ms advances cut 27-35% off every reveal line. */
  function sequence(items, before, done){
    let i = 0;
    /* The "speaking now" lift is cleared when the NEXT item starts, never on a timer: a fixed
       timer cannot know a clip's length, so with real audio it goes dark mid-sentence while the
       voice is still reading that option. Cleared once more at the end. */
    const unlit = ()=> document.querySelectorAll(".is-reading")
                               .forEach(n => n.classList.remove("is-reading"));
    (function step(){
      unlit();
      if(i >= items.length){ if(done) done(); return; }
      const it = items[i++];
      if(before) before(it);
      say(it.clip, ()=> setTimeout(step, 220));
    })();
  }

  /* Finish a test slide. `silent` = solved on the final attempt -> celebrate visually only,
     which is the SME's "Correct Answer on 3rd Attempt … No VO." */
  function finishSlide(slide, train, silent, signal){
    state.locked = true;
    if(typeof stopNudge === "function") stopNudge();
    if(typeof sfxCorrect === "function") sfxCorrect();
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
      const correctIdx = d.coaches.findIndex(c => c.correct);
      const train = buildTrain(host, {
        coaches: d.coaches.length,
        labels: d.coaches.map(()=> ""),
        bodies: d.coaches.map(c => '<span class="tr-word ink-glyph">' + c.word + "</span>"),
        dropZone: false
      });
      state.ownsAudio = true;
      state.replayAudio = ()=> say(A(slide, "prompt"), ()=>{});
      setNavActive(false);
      const wordOf = (i)=> train.coaches[i].body.querySelector(".tr-word");

      const hints = makeHints(slide, {
        host:  host,
        /* SME: "Count wrong taps across BOTH incorrect options. Switching from पैर to बैल must
           not reset the counter." One counter for the screen. */
        scope: ()=> "_",
        shake: (k, i)=> { if(i != null) train.shake(i); },

        /* HINT 2 — "Read all three words, one by one, from left to right... Retain the matra
           highlights in all three words so the child can compare." The comparison IS the hint
           on this screen, which is why nothing glows and no hand appears. */
        hint2: (k, t, done)=> {
          sequence(d.coaches.map((c, i) => ({ clip: clip(c.audio), i: i })),
            (it)=>{
              const w = wordOf(it.i);
              const m = d.coaches[it.i].matra;
              if(w && m) matraHLSoon(w, m, {});          // stays up — deliberately not cleared
              train.coaches[it.i].el.classList.add("is-reading");
            },
            ()=> say(A(slide, "hint2"), done));
        },

        /* HINT 3 — "Give the सेब coach a soft glow. Lock पैर and बैल. After the VO finishes,
           allow only सेब to be selected. Wait for the child to tap it. Do not select the answer
           or advance automatically." */
        reveal: (k, t, done)=> {
          train.coaches.forEach((c, i) => { if(i !== correctIdx) train.lock(i); });
          const w = wordOf(correctIdx);
          if(w && d.coaches[correctIdx].matra) matraHLSoon(w, d.coaches[correctIdx].matra, {});
          train.nudge(correctIdx, slide);   // glow always; the HAND is phase-gated by [28f]
          say(A(slide, "hint3") || A(slide, "hint2"), done);
        },
        idle: ()=> pulseIdle(train.wrap)
      });

      train.coaches.forEach((c, i) => {
        c.el.classList.add("is-tappable");
        c.el.onclick = ()=>{
          /* state.revealing is the input lock a rung holds while it speaks */
          if(state.locked || isPlaying || state.revealing) return;
          if(i !== correctIdx && hints.revealed()){ train.shake(i); return; }   // locked by Hint 3
          hints.touch();
          if(typeof sfxTap === "function") sfxTap();
          if(i === correctIdx){
            /* "No additional VO is needed because Hint 3 has already explained the answer." */
            const silent = hints.revealed();
            train.correct(i);
            const w = wordOf(i);
            const m = d.coaches[i].matra;
            if(w && m) matraHLSoon(w, m, { glow:true, pulse:true });
            finishSlide(slide, train, silent, "train_tap_first_try");
          } else {
            hints.wrong("_", i);
          }
        };
      });
      /* instruction is VOICE only — the SME asks for no on-screen text on every test screen */
      say(A(slide, "prompt"), ()=> hints.arm());
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
      const train = buildTrain(host, {
        coaches: d.bins.length,
        labels: d.bins.map(b => b.label),
        bodies: d.bins.map(()=> ""),
        dropZone: true
      });
      const tray = document.createElement("div");
      tray.className = "tr-tray";
      /* The SME fixes the order when it matters — "Use these four picture options in this order:
         शेर, पेड़, गैस, पैर" — and a random shuffle would silently overrule them and make every
         review screenshot different from the one they signed off. `shuffle:false` keeps the
         authored order; anything else shuffles, as every earlier card expects. */
      const cards = d.shuffle === false ? d.cards.slice()
                                        : d.cards.slice().sort(()=> Math.random() - 0.5);
      cards.forEach(c => {
        const t = document.createElement("div");
        t.className = "tr-card k-" + d.kind;
        t.dataset.bin = c.bin;
        t.dataset.word = c.word || "";
        /* THIS CARD's praise line — "Correct Response VO — Play Only the Matching Line" */
        if(c.correct) t.dataset.correct = c.correct;
        if(c.audio) t.dataset.audio = c.audio;
        /* THIS CARD's reveal line. The SME writes "Play Only the Matching Line" on every
           multi-item screen — a screen-wide Hint 3 would name the wrong word to a child who is
           holding a different card, which is worse than saying nothing. */
        if(c.reveal) t.dataset.reveal = c.reveal;
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
      const binIdx = k => d.bins.findIndex(b => b.key === k);
      const lbl = (tile)=> tile.querySelector(".tr-cardlbl");
      let revealFor = null;              // the card Hint 3 is currently guiding, if any

      const hints = makeHints(slide, {
        host:  host,
        /* SME: "Maintain a SEPARATE wrong-attempt counter for each card. Each new card starts at
           zero. If the child switches cards, preserve each unfinished card's counter." */
        scope: (tile)=> tile,
        shake: (k, t)=> train.shake(t.shake),
        /* Hint 1 on the picture round names the picture (see makeHints) */
        hint1Name: (k)=> d.kind === "picture" ? clip(k.dataset.audio) : null,

        /* HINT 2 — "Read ONLY the wrongly dropped word" and mark its matra. Not the whole tray:
           on a sort screen the child already knows which card they are holding. */
        hint2: (k, t, done)=> {
          /* THE MATRA ROUND: "Do not announce the matra's name." Naming it IS the answer on a
             screen whose only content is the mark — so this rung is the shape cue alone. */
          if(d.kind === "matra"){
            k.classList.add("is-reading");
            say(A(slide, "hint2"), ()=>{ k.classList.remove("is-reading"); done(); });
            return;
          }
          let L = lbl(k);
          /* THE PICTURE ROUND: "During Hint 2, temporarily show the wrongly dropped picture's name
             and highlight its matra." The name stays until this card is placed correctly — the
             SME: "Remove temporary word support when its picture is correctly placed." It is the
             ONLY place a word appears on the pictures-only screen, and only for the card the
             child has already missed twice. */
          if(!L && d.kind === "picture" && k.dataset.word){
            L = document.createElement("span");
            L.className = "tr-cardlbl tr-templbl ink-glyph";
            L.textContent = k.dataset.word;
            k.appendChild(L);
          }
          if(L) matraHLSoon(L, k.dataset.bin, {});
          else k.classList.add("is-reading");
          say(clip(k.dataset.audio), ()=> say(A(slide, "hint2"), done));
        },

        /* HINT 3 — glow the card and its coach, lock the wrong coach FOR THIS CARD, freeze the
           other unfinished cards, and wait. "Do not place the card automatically." */
        reveal: (k, t, done)=> {
          revealFor = k;
          [...tray.children].forEach(x => x.classList.toggle("is-frozen", x !== k && !x.classList.contains("snapped")));
          k.classList.add("is-nudge");
          train.nudge(t.nudge, slide);
          say(clip(k.dataset.reveal) || A(slide, "hint3") || A(slide, "hint2"), done);
        },
        idle:  ()=> pulseIdle(tray)
      });

      [...tray.children].forEach(tile => {
        tile.onclick = ()=>{ hints.touch(); if(tile.dataset.audio && !isPlaying && !state.revealing)
          say(clip(tile.dataset.audio), ()=>{}); };
        makeDraggable(tile, (zone)=>{
          const body = zone.closest(".tr-body"); if(!body) return;
          const ci = parseInt(body.dataset.idx, 10);
          if(d.bins[ci].key === tile.dataset.bin){
            tile.classList.add("snapped");
            body.appendChild(tile);
            /* On the WORD round the card still shows its word once it is in the coach, so mark
               the matra the child just sorted on. Not on the picture round — the SME is
               explicit there that "the word should not be displayed at any point". */
            if(d.kind === "word"){
              const lbl = tile.querySelector(".tr-cardlbl");
              if(lbl) matraHLSoon(lbl, tile.dataset.bin, { glow:true });
            }
            placed++;
            train.correct(ci);
            if(typeof sfxTap === "function") sfxTap();
            SwiftPAL.emit("matra_sort_item", { slide_id: slide.id, bin: tile.dataset.bin });
            const wasRevealed = hints.revealed(tile);
            if(revealFor === tile){ revealFor = null;
              [...tray.children].forEach(x => x.classList.remove("is-frozen")); }
            const tmp = tile.querySelector(".tr-templbl");
            if(tmp) tmp.remove();                 // the picture round's temporary name, now done
            /* Per-card praise, then — if that was the last card — the finish, which is SILENT:
               "Completion: No extra completion VO is required." And nothing at all after a
               reveal: "No additional VO is needed because Hint 3 has already explained it."
               A card with no praise clip (older cards) falls back to speaking its name. */
            const line = wasRevealed ? null
                       : clip(tile.dataset.correct) || clip(tile.dataset.audio);
            sayLocked(host, line, ()=>{
              if(placed >= need)
                finishSlide(slide, train, !A(slide, "correct"), "matra_sort_first_try");
            });
          } else {
            tile.style.transform = "";
            /* once Hint 3 has named this card's coach, the wrong coach simply refuses it */
            if(revealFor === tile){ train.shake(ci); return; }
            hints.wrong(tile, { shake: ci, nudge: binIdx(tile.dataset.bin) });
          }
        });
      });

      /* prompt first, then each card speaks itself, then the tray unlocks — the same
         listen-before-you-act contract sortSeqReveal gives the stock sort. */
      state.revealing = true;
      [...tray.children].forEach(t => t.classList.add("tr-seq-hidden"));
      say(A(slide, "prompt"), ()=>{
        const tiles = [...tray.children];
        let i = 0;
        (function step(){
          if(i >= tiles.length){ state.revealing = false; hints.arm(); return; }
          const t = tiles[i++]; t.classList.remove("tr-seq-hidden");
          say(clip(t.dataset.audio),
              ()=> setTimeout(step, 160));
        })();
      });
      setTimeout(()=>{ state.revealing = false;
        [...tray.children].forEach(t => t.classList.remove("tr-seq-hidden"));
        hints.arm(); }, 16000);
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
      d.options.forEach(m => {
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
      const hints = makeHints(slide, {
        host:  host,
        scope: (t)=> t,
        shake: (k, t)=> train.shake(t.shake),
        reveal: (k, t, done)=> { train.nudge(t.nudge, slide);
          say(A(slide, "hint3") || A(slide, "hint2"), done); },
        idle:  ()=> pulseIdle(tray)
      });

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
            if(typeof sfxCorrect === "function") sfxCorrect();
            SwiftPAL.emit("matra_fill_item", { slide_id: slide.id, word: slot.word });
            if(filled >= d.slots.length){
              finishSlide(slide, train, false, "matra_fill_first_try");
            } else {
              say(clip(slot.audio), ()=>{});
            }
          } else {
            tile.style.transform = "";
            hints.wrong(tile, { shake: i, nudge: i });
          }
        });
      });
      say(A(slide, "prompt"), ()=> hints.arm());
    }
  };

  /* ================================================================ 4 · MATRA_BUILD */
  /* The transformation teach: base word -> consonant highlighted -> matra travels in ->
     syllable -> full word. Autonomous, zero taps, आगे locked until the chain ends.
     Every step is gated on the previous CLIP ENDING, never a timer: [32b nocut] records fixed
     1400ms advances truncating 27-35% of every reveal line.
     data: { base_word, consonant, matra, syllable, result_word, result_img, result_emoji,
             travel: "down"|"left"|"right" } */
  SlideModules.MATRA_BUILD = {
    mount(host, slide){
      const d = slide.data;
      const wrap = document.createElement("div");
      wrap.className = "mb-stage";
      /* Laid out to the SME's own mockup (_SME_MOCKUPS/slide05_image5.png): each of the three
         panels is word → picture → caption, and the middle panel carries the equation with its
         own one-line explanation under it. The captions and the base picture were both missing
         from the first build. The base word has no picture of its own by design (पल / फल are
         the forms BEFORE the matra, not vocabulary), so that slot simply stays empty. */
      const cap = t => t ? '<span class="mb-cap">' + t + "</span>" : "";
      wrap.innerHTML =
        '<div class="mb-panel mb-p1">' +
          '<span class="ink-box"><span class="mb-word ink-glyph">' + d.base_word + "</span></span>" +
          /* `base_img_from`: the base picture is an ACTION, shown happening — S04 p.5 «खिलना»:
             "Show the opening action clearly through a short animation, rather than only a fully
             open flower." The bud sits on top of the open flower and dissolves into it while the
             base line plays. Without it the slot is one still picture, as before. */
          (d.base_img_from
            ? '<span class="mb-pic mb-bloom">' +
                imgOrEmoji(d.base_img, d.base_emoji, "mb-img mb-bloom-to", "mb-emoji") +
                imgOrEmoji(d.base_img_from, d.base_emoji, "mb-img mb-bloom-from", "mb-emoji") + "</span>"
            : (d.base_img || d.base_emoji
            ? '<span class="mb-pic">' + imgOrEmoji(d.base_img, d.base_emoji, "mb-img", "mb-emoji") + "</span>"
            : "")) +
          cap(d.cap_base) +
        "</div>" +
        '<div class="mb-arrow">→</div>' +
        '<div class="mb-panel mb-p2">' +
          '<span class="mb-eqrow">' +
            '<span class="mb-cons ink-glyph">' + d.consonant + "</span>" +
            '<span class="mb-plus">+</span>' +
            '<span class="mb-matra ink-glyph mb-travel-' + (d.travel || "down") + '">◌' + d.matra + "</span>" +
            '<span class="mb-eq">=</span>' +
            '<span class="mb-syl ink-glyph">' + d.syllable + "</span>" +
          "</span>" +
          cap(d.cap_mid) +
        "</div>" +
        '<div class="mb-arrow">→</div>' +
        '<div class="mb-panel mb-p3">' +
          '<span class="ink-box"><span class="mb-word mb-result ink-glyph">' + d.result_word + "</span></span>" +
          '<span class="mb-pic">' + imgOrEmoji(d.result_img, d.result_emoji, "mb-img", "mb-emoji") + "</span>" +
          cap(d.cap_result) +
        "</div>";
      host.appendChild(wrap);

      const p1 = wrap.querySelector(".mb-p1"), p2 = wrap.querySelector(".mb-p2"), p3 = wrap.querySelector(".mb-p3");
      const cons = wrap.querySelector(".mb-cons"), mat = wrap.querySelector(".mb-matra");
      const syl = wrap.querySelector(".mb-syl"), res = wrap.querySelector(".mb-result");
      const arrows = [...wrap.querySelectorAll(".mb-arrow")];
      [p2, p3, ...arrows].forEach(e => e.classList.add("mb-seq-hidden"));
      [cons, mat, syl].forEach(e => e.classList.add("mb-seq-hidden"));

      /* PAINT THE MATRA HIGHLIGHT AT MOUNT AS WELL AS IN THE CHAIN.
         Live, panels 2 and 3 are `mb-seq-hidden` (opacity 0) until the audio reveals them, so
         the child never sees the red mark early — the teaching beat is unchanged. But the
         review capture STRIPS seq-hidden and freezes before any audio runs, so a highlight
         applied only in a play() callback photographs missing: the SME's deck showed «पुल»
         with no red ु even though the running game colours it. Painting here fixes the
         capture; matraHL is idempotent, so the chain re-applying it later is a no-op. */
      matraHLSoon(syl, d.matra, { glow:true });
      matraHLSoon(res, d.matra, { glow:true });

      state.ownsAudio = true; state.demoRunning = true; setNavActive(false);
      if(typeof setSwMood === "function") setSwMood("teach");
      state.replayAudio = null;

      const done = ()=>{
        state.demoRunning = false;
        state.replayAudio = ()=> sayAll([A(slide,"base"), A(slide,"onset"), A(slide,"result")], ()=>{});
        $("navBtn").onclick = ()=> completeSlide(true);
        setNavActive(true);
      };

      sayAll([A(slide, "prompt")], ()=>{
        p1.classList.add("mb-in");
        /* SME p.3/p.5: "Highlight the whole group when the VO says «ये सब बच्चे हैं»" and
           "Highlight the book's position when the VO says «मेज़ पर किताब रखी है»" — the base
           picture glows for exactly as long as the line that explains it is being spoken. */
        const basePic = p1.querySelector(".mb-pic");
        if(basePic) basePic.classList.add("mb-picglow");
        if(basePic && d.base_img_from) setTimeout(()=> basePic.classList.add("is-bloomed"), 500);
        say(A(slide, "base"), ()=>{                       // "यह शब्द है, पल।"
          if(basePic) basePic.classList.remove("mb-picglow");
          cons.classList.remove("mb-seq-hidden"); cons.classList.add("mb-in", "mb-hot");
          arrows[0].classList.remove("mb-seq-hidden"); p2.classList.remove("mb-seq-hidden");
          setTimeout(()=>{
            mat.classList.remove("mb-seq-hidden"); mat.classList.add("mb-in", "mb-fly");
            if(typeof sfxTap === "function") sfxTap();
            say(A(slide, "matra_name"), ()=>{             // "छोटी उ की मात्रा"
              syl.classList.remove("mb-seq-hidden"); syl.classList.add("mb-in", "mb-pop");
              /* the mockup shows «जा» with its ा already red — the syllable is the first place
                 the child sees the mark attached to a letter, so mark it here too */
              matraHLSoon(syl, d.matra, { glow:true });
              say(A(slide, "onset"), ()=>{                // "प के नीचे … तो बना पु।"
                arrows[1].classList.remove("mb-seq-hidden"); p3.classList.remove("mb-seq-hidden");
                res.classList.add("mb-in", "mb-pop");
                if(typeof sfxCorrect === "function") sfxCorrect();
                /* SME: "Highlight ा inside जाल" — the last step of every build screen, and the
                   one this lesson could not do before. Now it can (see matraHL). */
                matraHLSoon(res, d.matra, { glow:true, pulse:true });
                sayAll([A(slide, "result"), A(slide, "explain")], done);
              });
            });
          }, 260);
        });
      });
      setTimeout(()=>{ if(state.demoRunning) done(); }, 34000);   // never strand the slide
    }
  };

  /* ================================================================ 5 · MEET_PAIR */
  /* Two example words, one at a time, each with its picture and its matra called out.
     A separate module rather than a change to MEET_LETTER, so the 11 shipped MEET_LETTER
     games keep rendering byte-identically.
     data: { examples:[{word, matra, img, emoji, audio}] } */
  SlideModules.MEET_PAIR = {
    mount(host, slide){
      const d = slide.data;
      const wrap = document.createElement("div");
      wrap.className = "mp-stage";
      host.appendChild(wrap);
      state.ownsAudio = true; state.demoRunning = true; setNavActive(false);
      if(typeof setSwMood === "function") setSwMood("teach");

      const paint = (ex)=>{
        wrap.innerHTML =
          '<div class="mp-card">' +
            '<span class="ink-box"><span class="mp-word ink-glyph">' + ex.word + "</span></span>" +
            '<span class="mp-pic">' + imgOrEmoji(ex.img, ex.emoji, "mp-img", "mp-emoji") + "</span>" +
          "</div>" +
          '<div class="mp-callout">इस शब्द की मात्रा — ' +
            '<span class="mp-matra ink-glyph">◌' + ex.matra + "</span></div>";
        /* settled by default — `mp-in` only drives the fade, so a capture with animation
           disabled still shows a fully painted card and callout */
        wrap.querySelector(".mp-card").classList.add("mp-in");
        return { card: wrap.querySelector(".mp-card"),
                 word: wrap.querySelector(".mp-word"),
                 pic:  wrap.querySelector(".mp-pic"),
                 call: wrap.querySelector(".mp-callout") };
      };
      const show = (ex, after)=>{
        const { word, pic, call } = paint(ex);
        /* SME: "Word should appear first, then image should appear." The first build painted
           both at once, which loses the beat the note is asking for — the child should read
           the word before the picture tells them the answer. The picture is held back one
           clip; .mp-pic starts transparent and `mp-in` reveals it. */
        sfxPopSoft();
        say(clip(ex.audio_line), ()=>{                       // "पुल में छोटी उ की मात्रा है।"
          pic.classList.add("mp-in");
          sfxPopSoft();
          call.classList.add("mp-in");
          /* SME: "When the VO says the matra part, the ा should glow/highlight." Now real —
             the mark inside the word turns red and pulses. See matraHL(). */
          matraHLSoon(word, ex.matra, { glow:true, pulse:true });
          if(typeof handOnAnswer === "function") handOnAnswer(call, slide);
          say(clip(ex.matra_audio), ()=>{ if(typeof stopNudge === "function") stopNudge();
            setTimeout(after, 420); });
        });
      };
      /* PAINT EXAMPLE 1 SYNCHRONOUSLY, FULLY SETTLED. Everything after it is audio-driven, but
         the first example must exist in the DOM the instant the slide mounts — otherwise a
         frozen capture (and a reader on a slow connection) sees an empty card. Found in the
         review deck: all three MEET_PAIR pages photographed blank.
         It must also be COMPLETE, not half-painted: the picture and the matra highlight are
         normally held back a clip, and both are plain opacity rather than animation, so a
         capture would freeze them invisible. Reveal them here; show() repaints from scratch
         when the audio actually reaches this example, so the live beat is unaffected. */
      {
        const first = paint(d.examples[0]);
        first.pic.classList.add("mp-in");
        first.call.classList.add("mp-in");
        matraHLSoon(first.word, d.examples[0].matra, { glow:true });
      }
      let i = 0;
      const next = ()=>{
        if(i >= d.examples.length){
          state.demoRunning = false;
          state.replayAudio = ()=> say(A(slide, "prompt"), ()=>{});
          $("navBtn").onclick = ()=> completeSlide(true);
          setNavActive(true);
          return;
        }
        show(d.examples[i++], next);
      };
      say(A(slide, "prompt"), next);
      setTimeout(()=>{ if(state.demoRunning){ state.demoRunning = false; setNavActive(true);
        $("navBtn").onclick = ()=> completeSlide(true); } }, 40000);
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
      const wrap = document.createElement("div");
      wrap.className = "mi-stage";
      wrap.innerHTML = d.pairs.map((p, i) =>
        '<div class="mi-pair" data-i="' + i + '">' +
          '<span class="ink-box"><span class="mi-letter ink-glyph">' + p.letter + "</span></span>" +
          '<span class="mi-arrow">→</span>' +
          '<span class="ink-box"><span class="mi-matra ink-glyph">◌' + p.matra + "</span></span>" +
        "</div>").join("");
      host.appendChild(wrap);
      const pairs = [...wrap.querySelectorAll(".mi-pair")];

      state.ownsAudio = true; state.demoRunning = true; setNavActive(false);
      if(typeof setSwMood === "function") setSwMood("teach");

      /* SETTLED BY DEFAULT: every pair is painted and visible from the start, and `is-on` only
         adds the highlight. A capture with animation frozen therefore shows the whole screen,
         not one pair — the failure mode that shipped three blank teach pages last round. */
      const done = ()=>{
        state.demoRunning = false;
        pairs.forEach(p => p.classList.remove("is-dim"));
        state.replayAudio = ()=> sayAll(d.pairs.map(p => clip(p.audio)), ()=>{});
        $("navBtn").onclick = ()=> completeSlide(true);
        setNavActive(true);
      };
      let i = 0;
      const step = ()=>{
        if(i >= pairs.length){ done(); return; }
        const k = i++;
        pairs.forEach((p, n) => p.classList.toggle("is-dim", n !== k));
        pairs[k].classList.add("is-on");
        sfxPopSoft();
        say(clip(d.pairs[k].audio), ()=> setTimeout(step, 320));
      };
      say(A(slide, "prompt"), ()=> say(A(slide, "instruction"), step));
      setTimeout(()=>{ if(state.demoRunning) done(); }, 30000);
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
      const hints = makeHints(slide, {
        host: host,
        /* ---- SME-GHOST 6: 1st wrong. "Ghost briefly appears with a thinking expression.
           No hand nudge." ---- */
        scope: (w)=> w,
        shake: (k, w)=>{
          w.classList.remove("ps-mag"); w.classList.add("ps-miss");
          setTimeout(()=> w.classList.remove("ps-miss"), 520);
          ghost.classList.remove("gh-dim");
          ghostFace("think"); ghostToEl(w, -44);
          setTimeout(()=>{ ghostFace("idle"); ghost.classList.add("gh-dim"); }, 1600);
        },
        /* ---- SME-GHOST 7: 2nd wrong. "Ghost floats toward one correct target word. It gently
           points/pulses near that word. This acts as the hint instead of adding extra text."
           The ghost is OURS and is not phase-gated, so it still guides on this practice screen;
           the engine's HAND stays withheld here under [28f], enforced by handOnAnswer(). ---- */
        reveal: (k, t, done)=>{
          const r2 = d.rounds[round];
          const tgt = words.find(x => r2.targets.indexOf(x.dataset.w) >= 0
                                      && !x.classList.contains("ps-hit"));
          if(!tgt) return;
          ghost.classList.remove("gh-dim");
          ghostFace("idle"); ghostToEl(tgt, -46);
          ghost.classList.remove("gh-bounce"); void ghost.offsetWidth;
          ghost.classList.add("gh-bounce");
          sparkleAt(tgt);
          revealHand(tgt, slide);
          say(A(slide, "hint3") || A(slide, "hint2"), done);
        }
      });

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
              if(typeof sfxCorrect === "function") sfxCorrect();
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
            /* The ghost IS this screen's ladder feedback — SME-GHOST 6 and 7 replace the shake
               and the coach glow. So the ghost moves are passed in as makeHints' shake/nudge
               hooks rather than hand-rolled here: same behaviour the SME signed off, one ladder.
               No `idle` hook and no arm(): this module runs its OWN idle ghost (SME-GHOST 2),
               and two idle cues on one screen would talk over each other. */
            hints.wrong(w, w);
          }
        };
      });

      paintDots();
      say(A(slide, "prompt"), startRound);
      requestAnimationFrame(()=>{ magnify(); ghostEntry(); });
    }
  };

  /* ================================================================ 9 · WORD_BUILD */
  /* «चित्र देखकर सही अक्षर से शब्द पूरा कीजिए» — the SME's rewrite of MATRA_FILL.

     THE DIFFERENCE FROM MATRA_FILL, which matters: the child no longer drags a bare MATRA into
     a gap between two consonants. They drag a whole AKSHARA — the consonant with its matra
     already attached (से, पै, के). That is a deliberate move up a level: by this screen the
     child should be reading `से` as one unit, not assembling स + े. It is the consolidated-
     alphabetic step, and it is also why the blank sits FIRST in the coach (`_ब`, `_र`, `_ला`)
     rather than in the middle.

     Distractors are required: options carry 1-2 aksharas that match no picture, so a child who
     guesses by elimination still has to read.

     data: { slots:[{word, post, answer, img, emoji, audio}], options:[akshara,…] }
       `post` is what stays visible in the coach after the blank; `answer` is the akshara card
       that completes it. word === answer + post, and the builder asserts exactly that. */
  SlideModules.WORD_BUILD = {
    mount(host, slide){
      const d = slide.data;
      const train = buildTrain(host, {
        coaches: d.slots.length,
        labels: d.slots.map(s => imgOrEmoji(s.img, s.emoji, "tr-slotpic", "tr-emoji")),
        bodies: d.slots.map((s, i) =>
          '<span class="wb-word" data-i="' + i + '">' +
            '<span class="wb-blank dd-zone" data-idx="' + i + '"></span>' +
            '<span class="ink-glyph wb-post">' + s.post + "</span>" +
          "</span>"),
        dropZone: false
      });

      const tray = document.createElement("div");
      tray.className = "tr-tray";
      /* shuffled, or the answers sit in coach order and the screen tests nothing */
      (d.shuffle === false ? d.options.slice()
                           : d.options.slice().sort(()=> Math.random() - 0.5)).forEach(a => {
        const t = document.createElement("div");
        t.className = "tr-card k-akshara";
        t.dataset.akshara = a;
        t.innerHTML = '<span class="wb-akshara ink-glyph">' + a + "</span>";
        tray.appendChild(t);
      });
      host.appendChild(tray);

      state.ownsAudio = true;
      state.replayAudio = ()=> say(A(slide, "prompt"), ()=>{});
      setNavActive(false);
      let filled = 0;
      const answers = d.slots.map(s => s.answer);
      let revealSlot = -1;               // the blank Hint 3 is currently guiding, if any

      const hints = makeHints(slide, {
        host:  host,
        /* SME: a counter per CORRECT अक्षर (से, पै, मे), preserved when the child switches — and
           a SEPARATE one per BLANK for the distractors, which "must not reset" when the child
           swaps one distractor for another. So the key is the akshara when it is an answer, and
           the blank index when it is not. */
        scope: (t)=> (answers.indexOf(t.akshara) >= 0 ? "a:" + t.akshara : "b:" + t.slot),
        shake: (k, t)=> train.shake(t.slot),

        /* HINT 2 — "Read ONLY the wrongly dropped अक्षर", enlarge it and mark its matra. */
        hint2: (k, t, done)=> {
          const el = t.tile;
          el.classList.add("is-reading");
          const g = el.querySelector(".wb-akshara");
          if(g && t.matra) matraHLSoon(g, t.matra, {});
          say(clip(d.option_audio && d.option_audio[t.akshara]), ()=> {
            el.classList.remove("is-reading");
            say(A(slide, "hint2"), done);
          });
        },

        /* HINT 3 — glow the correct अक्षर and its blank, lock everything else, and wait.
           "Do not complete the word automatically." */
        reveal: (k, t, done)=> {
          revealSlot = t.slot;
          const want = d.slots[t.slot].answer;
          [...tray.children].forEach(x =>
            x.classList.toggle("is-frozen", x.dataset.akshara !== want && !x.classList.contains("tr-seq-hidden")));
          const right = [...tray.children].find(x => x.dataset.akshara === want);
          if(right) right.classList.add("is-nudge");
          train.nudge(t.slot, slide);
          say(clip(d.slots[t.slot].reveal) || A(slide, "hint3") || A(slide, "hint2"), done);
        },
        idle:  ()=> pulseIdle(tray)
      });

      [...tray.children].forEach(tile => {
        /* tapping an option speaks it — the SME's "optional word support VO", and the only way
           a child who cannot yet read `पै` can tell the cards apart.
           "A sound-only tap does not count as an answer attempt." */
        tile.onclick = ()=>{ hints.touch();
          if(!isPlaying && !state.revealing && d.option_audio && d.option_audio[tile.dataset.akshara])
            say(clip(d.option_audio[tile.dataset.akshara]), ()=>{}); };

        makeDraggable(tile, (zone)=>{
          const blank = zone.closest(".wb-blank"); if(!blank) return;
          if(blank.classList.contains("filled")) return;
          const i = parseInt(blank.dataset.idx, 10);
          const slot = d.slots[i];

          if(tile.dataset.akshara === slot.answer){
            blank.classList.add("filled");
            tile.style.transform = "";
            tile.classList.add("tr-seq-hidden");        // spent, but keeps the tray from reflowing
            filled++;
            train.correct(i);
            if(typeof sfxCorrect === "function") sfxCorrect();
            /* the split form is replaced by the WHOLE word, so the child reads it complete —
               and the matra is marked inside it, which is the point of the lesson */
            const holder = blank.closest(".wb-word");
            holder.innerHTML = '<span class="ink-glyph wb-done">' + slot.word + "</span>";
            matraHLSoon(holder.querySelector(".wb-done"), slot.matra, { glow:true });
            SwiftPAL.emit("word_build_item", { slide_id: slide.id, word: slot.word });
            const wasRevealed = revealSlot === i;
            if(wasRevealed){ revealSlot = -1;
              [...tray.children].forEach(x => x.classList.remove("is-frozen", "is-nudge")); }
            /* «शाबाश! सेब बन गया।» / «शाबाश! मेज़ बन गई।» — per word, gender and all; silent
               after a reveal; and no completion VO once the third word is made. */
            const line = wasRevealed ? null : clip(slot.correct) || clip(slot.audio);
            sayLocked(host, line, ()=>{
              if(filled >= d.slots.length)
                finishSlide(slide, train, !A(slide, "correct"), "word_build_first_try");
            });
          } else {
            tile.style.transform = "";
            if(revealSlot === i && tile.dataset.akshara !== slot.answer){ train.shake(i); return; }
            hints.wrong({ akshara: tile.dataset.akshara, slot: i },
                        { tile: tile, slot: i, akshara: tile.dataset.akshara,
                          matra: matraIn(tile.dataset.akshara) });
          }
        });
      });
      say(A(slide, "prompt"), ()=> hints.arm());
    }
  };

  /* ================================================================ 10 · SENTENCE_COMPLETE */
  /* «सही शब्द चुनकर वाक्य पूरा कीजिए» — the screen that turns decoding into MEANING.

     This is the only screen in the lesson where the right answer cannot be found from the matra
     alone: all three options are real words the child can read, and only the SENTENCE says which
     one belongs. That is the whole point — it is the step NIPUN's Grade 2 goal actually names
     (read *with comprehension*), and it is why the distractors are deliberately readable rather
     than nonsense.

     Layout follows the SME's mockup: scene illustration on the left, sentence with a dashed
     blank on the right, three picture options underneath.

     data: { scene_img, scene_emoji, sentence_pre, sentence_post, answer,
             options:[{word, img, emoji, audio}] } */
  SlideModules.SENTENCE_COMPLETE = {
    mount(host, slide){
      const d = slide.data;
      const wrap = document.createElement("div");
      wrap.className = "sc-stage";
      wrap.innerHTML =
        '<div class="sc-scene">' + imgOrEmoji(d.scene_img, d.scene_emoji, "sc-img", "sc-emoji") + "</div>" +
        '<div class="sc-right">' +
          '<div class="sc-card">' +
            '<span class="ink-glyph sc-pre">' + d.sentence_pre + "</span>" +
            '<span class="sc-blank dd-zone"></span>' +
            '<span class="ink-glyph sc-post">' + d.sentence_post + "</span>" +
          "</div>" +
          '<div class="sc-opts"></div>' +
        "</div>";
      host.appendChild(wrap);

      const optRow = wrap.querySelector(".sc-opts");
      const blank = wrap.querySelector(".sc-blank");
      const card = wrap.querySelector(".sc-card");
      const scene = wrap.querySelector(".sc-scene");

      d.options.forEach(o => {
        const b = document.createElement("div");
        b.className = "sc-opt";
        b.dataset.word = o.word;
        if(o.audio) b.dataset.audio = o.audio;
        /* the WHOLE SENTENCE with this option in the blank. Hint 2 on this screen reads all
           three — the SME's stated exception, because this screen tests meaning, not the matra.
           Without it the rung plays three nulls and the child hears silence where the compare is. */
        if(o.sent) b.dataset.sent = o.sent;
        /* .ink-box, not a bare .ink-glyph. The engine centres every ink-glyph inside its PARENT,
           and the parent here is the whole option card — picture above, label below. Measured:
           the label was stamped translateY(-41px), straight onto the picture. Same trap as the
           MATRA_BUILD result word. Any word in a column needs this wrapper. */
        b.innerHTML = imgOrEmoji(o.img, o.emoji, "sc-optpic", "sc-optemoji") +
                      '<span class="ink-box"><span class="sc-optlbl ink-glyph">' +
                      o.word + "</span></span>";
        optRow.appendChild(b);
      });

      state.ownsAudio = true;
      state.replayAudio = ()=> say(A(slide, "prompt"), ()=>{});
      setNavActive(false);
      const rightOpt = ()=> [...optRow.children].find(x => x.dataset.word === d.answer);
      const hints = makeHints(slide, {
        host:  host,
        /* SME: "Use ONE wrong-attempt counter for this sentence blank. Switching between बैल and
           पैन must not reset the counter." */
        scope: ()=> "_",
        shake: (k, el)=>{ if(!el) return;
          el.classList.remove("sc-shake"); void el.offsetWidth; el.classList.add("sc-shake");
          setTimeout(()=> el.classList.remove("sc-shake"), 520); },

        /* HINT 2 — the sentence-completion EXCEPTION, and the notes say why: this screen tests
           meaning, so the hint reads the whole sentence with each option PREVIEWED in the blank,
           and highlights the matching detail in the scene. The preview is neutral — no success
           feedback — and the blank is emptied again afterwards. */
        hint2: (k, t, done)=> {
          scene.classList.add("sc-scenehl");
          sequence([...optRow.children].map(el => ({ clip: clip(el.dataset.sent), el: el })),
            (it)=>{
              blank.innerHTML = '<span class="ink-glyph sc-preview">' + it.el.dataset.word + "</span>";
              it.el.classList.add("is-reading");
            },
            ()=>{
              blank.innerHTML = "";                       // "restore the empty blank"
              scene.classList.remove("sc-scenehl");
              say(A(slide, "hint2"), done);
            });
        },

        /* HINT 3 — glow the answer and the blank, lock the other two, and wait.
           "Do not fill the blank automatically." */
        reveal: (k, t, done)=> {
          const r = rightOpt();
          [...optRow.children].forEach(x => x.classList.toggle("is-frozen", x !== r));
          if(r) r.classList.add("is-nudge");
          blank.classList.add("is-nudge");
          if(r) revealHand(r, slide);
          say(A(slide, "hint3") || A(slide, "hint2"), done);
        },
        idle:  ()=> pulseIdle(optRow)
      });

      const settle = (el)=>{
        state.locked = true;
        blank.classList.add("filled");
        blank.innerHTML = '<span class="ink-glyph sc-fill">' + d.answer + "</span>";
        matraHLSoon(blank.querySelector(".sc-fill"), d.matra, { glow:true });
        el.classList.add("is-correct");
        card.classList.add("sc-done");
        if(typeof sfxCorrect === "function") sfxCorrect();
        if(typeof confettiCannon === "function") confettiCannon();
        if(typeof setSwMood === "function") setSwMood("celebrate");
        if(typeof stopNudge === "function") stopNudge();
        SwiftPAL.emit("sentence_complete", {
          slide_id: slide.id, phase: slide.phase, value: true,
          first_try: hints.total() === 0, attempts: hints.total() + 1,
          latency_ms: Date.now() - state.slideStart
        });
        hints.stop();
        const unlock = ()=>{ setNavActive(true);
          $("navBtn").onclick = ()=> completeSlide(hints.total() === 0); };
        /* 3rd-attempt win celebrates but says nothing — the lesson-wide rule */
        if(hints.revealed()) setTimeout(unlock, 900);
        else say(A(slide, "correct"), unlock);
      };

      /* DRAG, NOT TAP. The SME's note is explicit in two places — «the option card SNAPS INTO
         the blank space» and, on a miss, «option RETURNS TO ITS ORIGINAL POSITION». Neither
         sentence means anything for a tap. It also keeps the gesture consistent with every
         other card in the lesson. Tapping a card still SPEAKS it, which is how a child who
         cannot yet read `पैन` tells the options apart. */
      [...optRow.children].forEach(el => {
        el.onclick = ()=>{ hints.touch();
          if(!state.locked && !isPlaying && !state.revealing && el.dataset.audio)
            say(clip(el.dataset.audio), ()=>{}); };

        makeDraggable(el, (zone)=>{
          if(state.locked || state.revealing) return;
          if(!zone.classList.contains("sc-blank")) return;
          if(typeof sfxTap === "function") sfxTap();
          el.style.transform = "";
          if(el.dataset.word === d.answer){ settle(el); return; }
          if(hints.revealed()) return;                   // locked by Hint 3

          hints.wrong("_", el);
        });
      });

      say(A(slide, "prompt"), ()=> hints.arm());
    }
  };

  /* ================================================================ the train LANDING
     SME, landing note, every round since round 3: "Show only two matra boxes/cards … The matras can
     be shown inside two train bogies so that the lesson visually continues as a «मात्राओं की रेल»
     journey. Bring the train onto the screen with a smooth right-to-left animation. The two
     bogies can appear one by one with a soft pop." The engine's landing only knows concept tiles,
     and its boot() renders nothing for a kind it does not know — so `landing_hero.kind: "train"`
     is drawn here, with the SAME train shell the tap and sort screens use, rather than as new art.
     Chrome is never generated art (house rule), and a painted train would not match the one the
     child meets thirty seconds later. */
  function renderTrainLanding(){
    const hero = CARD.landing_hero, el = document.getElementById("sgHero");
    if(!hero || hero.kind !== "train" || !el || el.dataset.train) return;
    el.dataset.train = "1";
    el.innerHTML = "";
    const cells = hero.cells || [];
    const train = buildTrain(el, {
      coaches: cells.length,
      labels: cells.map(()=> ""),
      bodies: cells.map(c => '<span class="tr-landmatra ink-glyph">' + c.letter + "</span>"),
      dropZone: false
    });
    train.wrap.classList.add("tr-landing");
    /* one bogie at a time — the SME's "soft pop" — after the train has pulled in */
    train.coaches.forEach((c, i) => {
      c.el.classList.add("tr-landpop");
      c.el.style.animationDelay = (0.9 + i * 0.45) + "s";
    });
    el.classList.add("show");
    const box = el.closest && el.closest(".sg-content");
    if(box) box.classList.add("has-hero", "has-train");
    const t = document.getElementById("sgTitle"); if(t) t.classList.add("compact");
  }
  if(document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", ()=> setTimeout(renderTrainLanding, 0));
  else setTimeout(renderTrainLanding, 0);
  window.addEventListener("load", renderTrainLanding);

  /* QA SEAM. matraHL is the one piece of this file whose output cannot be judged by reading it —
     every bug it has had (the reddened shirorekha, the 37%-reddened consonant under ो) was found
     by rendering a word and measuring pixels. Exposing it lets that be done against the shipped
     build without mounting a slide and without a debug build. Read-only; nothing here calls it. */
  if(typeof SwiftPAL === "object" && SwiftPAL) SwiftPAL.matraHL = matraHL;

})();
