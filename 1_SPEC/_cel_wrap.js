
/* [r85] THE CELEBRATION SWIFTIE - the kit's README wrapper, verbatim in intent. The engine's
   CELEBRATION module is wrapped, not edited: it still does everything it did (sfx, sunburst, stars,
   the arrow), then the stock .end-mascot is hidden and a 300x358 host takes its place - the mascot's
   own 358 px layout height, so the arrow below it keeps its exact size and position.
   The clock is the clip's own - see THE CLOCK below. */
(function(){
  if(typeof SlideModules === "undefined" || !SlideModules.CELEBRATION || typeof CARD === "undefined"
     || !CARD.end_anim || typeof SwiftieCelebration === "undefined") return;
  const EA = CARD.end_anim;
  /* the three sheets (~2 MB) are fetched quietly 12 s after the lesson loads, so on a first visit
     they are in the cache long before the last page: the kit only starts loading them when the
     celebration mounts, and on a slow connection the jump (350 ms in) would play before its sheet
     had arrived. Kept referenced so the cached copies are not dropped. */
  const _warm = [];
  const warm = ()=> [EA.meta.shabaash, EA.meta.talk, EA.meta.idle].forEach(s => {
    const i = new Image(); i.decoding = "async"; i.src = EA.base + s.src; _warm.push(i); });
  const arm = ()=> setTimeout(warm, 12000);
  if(document.readyState === "complete") arm(); else window.addEventListener("load", arm);
  /* THE CLOCK. The kit takes `audio` - anything with paused / ended / currentTime - and anchors
     itself as  t0 = now - currentTime  the first time it sees the clip sounding. Measured here: the
     celebration mounts in a burst of work (sunburst, stars, sound), the page's main thread stalls
     150-330 ms right as the clip starts, and a yes/no "sounding" signal is only noticed on the first
     frame AFTER the stall - which put the whole lip-sync 170-1470 ms late when opened as a file.
     So the clock below reports how long the clip has really been audible, from the moment it
     became so, however late the next frame runs:
       · Web Audio (served): when the engine started the source, + the context's output latency
       · <audio> (opened as a file): the element's own "playing" event timestamp */
  const _st = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function(when){
    try{ const c = this.context;
      this.__swcAt = performance.now() + ((when && when > c.currentTime) ? (when - c.currentTime) * 1000 : 0)
                     + ((c.baseLatency || 0) + (c.outputLatency || 0)) * 1000; }catch(e){}
    return _st.apply(this, arguments);
  };
  const heardAt = ()=>{
    const a = currentAudio;
    if(a){
      if(!a.__swc){ a.__swc = true;
        a.addEventListener("playing", (e)=>{ a.__swcAt = e.timeStamp - a.currentTime * 1000; }); }
      return a.paused ? null : (a.__swcAt != null ? a.__swcAt
                               : (a.currentTime > 0 ? performance.now() - a.currentTime * 1000 : null));
    }
    return currentVoiceSource && currentVoiceSource.__swcAt != null ? currentVoiceSource.__swcAt : null;
  };
  const clock = {
    get paused(){ return !isPlaying || heardAt() == null; },
    get ended(){ return !isPlaying; },
    get currentTime(){ const t = heardAt(); return t == null ? 0 : Math.max(0, performance.now() - t) / 1000; }
  };
  const _cel = SlideModules.CELEBRATION.mount;
  SlideModules.CELEBRATION.mount = function(host, slide){
    const r = _cel.apply(this, arguments);
    const img = document.querySelector("#endScreen .end-mascot");
    let box = document.getElementById("celBox");
    if(!box && img){ box = document.createElement("div"); box.id = "celBox";
      /* the stock mascot's OWN layout height, measured before it is hidden: 330 px wide at its
         516x476 art is 357.72 px, not the kit's 358 - and 0.28 px is a whole screen pixel of arrow
         movement at 1920x1080. Falls back to the kit's 358 if the stock art never loaded. */
      const h = (img.naturalWidth && img.offsetWidth) ? img.offsetWidth * img.naturalHeight / img.naturalWidth : 358;
      box.style.cssText = "width:300px;height:" + h + "px;position:relative;z-index:2";
      img.parentNode.insertBefore(box, img); }
    if(!box) return r;
    if(img) img.style.display = "none";
    box.innerHTML = "";
    /* [r106] SHE JUMPS AND CELEBRATES FIRST, THEN SPEAKS. Yasir: "in the last celebration screen Swifty
       jumps and celebrates, then starts speaking - the VO should only play when she starts speaking".
       So the line is NOT played by the page on arrival (ownsAudio): the jump - the kit's own शाबाश
       sheet, its standing frames and its jump frames - plays first, silent but for the celebration
       sound; then the line starts and the kit's player takes over, with a track arranged so that it
       finishes the landing over the clip's lead-in and then lip-syncs the WHOLE line on the talk
       sheet (a 25 ms stand-in "first word" stops the kit spending the real first words on a jump). */
    state.ownsAudio = true;
    const M = EA.meta, S = M.shabaash, COLS = M.cols || 6;
    const sp = document.createElement("div"); sp.className = "swc-sprite";
    sp.innerHTML = '<div class="swc-art"></div>'; box.appendChild(sp);
    const art = sp.firstChild; art.style.aspectRatio = M.fw + " / " + M.fh;
    art.style.backgroundImage = 'url("' + EA.base + S.src + '")';
    const showF = (i)=>{ const c = i % COLS, rr = Math.floor(i / COLS);
      art.style.backgroundPosition = (c * 100 / (COLS - 1)) + "% " + (rr * 100 / (COLS - 1)) + "%";
      sp.dataset.sheet = "shabaash"; sp.dataset.f = i; };
    const frames = S.pre.concat(S.word), FMS = 45;          /* ~22 fps: 30 frames, 1.35 s */
    showF(frames[0]);
    const bits = EA.track.bits, lead = Math.max(0, bits.indexOf("1"));
    const step = EA.track.step_ms || 25;
    const bits2 = "1" + "00000000" + bits.slice(lead);      /* stand-in word, 200 ms gap, the line */
    const shift = (9 - lead) * step / 1000;                 /* keeps the line on the clip's clock */
    const clock2 = {
      get paused(){ return clock.paused; }, get ended(){ return clock.ended; },
      get currentTime(){ const t = clock.currentTime; return t > 0 ? Math.max(0.001, t + shift) : 0; }
    };
    const t0 = performance.now();
    (function jump(){
      if(!sp.isConnected || CARD.slides[state.idx] !== slide) return;
      const k = Math.floor((performance.now() - t0) / FMS);
      if(k < frames.length){ showF(frames[k]); requestAnimationFrame(jump); return; }
      /* the jump is over: the line starts, and the kit takes over the moment it is sounding */
      const src = (typeof audioFor === "function") ? audioFor(slide, "prompt") : null;
      if(src) play(src, ()=>{});
      const h = SwiftieCelebration.play({ host: box, meta: M, base: EA.base, bits: bits2, step_ms: step, audio: clock2 });
      h.el.style.animation = "none"; h.el.style.position = "absolute"; h.el.style.inset = "0";
      h.el.style.visibility = "hidden";
      (function swap(){
        if(!h.el.isConnected) return;
        if(h.el.dataset.t !== undefined || h.el.dataset.sheet === "idle"){ h.el.style.visibility = ""; sp.remove(); return; }
        requestAnimationFrame(swap);
      })();
    })();
    return r;
  };
})();
