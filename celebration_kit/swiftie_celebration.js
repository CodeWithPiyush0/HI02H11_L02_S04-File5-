/* ============================================================================================
   SWIFTIE CELEBRATION KIT — player (framework-free, no dependencies)
   ============================================================================================
   Plays the three celebration sheets (cel_shabaash / cel_talk / cel_idle) lip-synced to a voice-over.

     SwiftieCelebration.play({
       host:     <element>,                 // where Swiftie goes (she fills its height)
       meta:     <cel_meta.json object>,    // frame size, grid, open-mouth frames, roles
       base:     "assets/UI/celebration/",  // folder the three .webp sheets are served from
       bits:     "0001111...",              // lip-sync track from make_lipsync.py (25 ms per char)
       step_ms:  25,
       // THE CLOCK — give ONE of these:
       audio:    <HTMLAudioElement>,        // best: time = audio.currentTime
       isSounding: ()=> bool                // or: true while the VO is sounding (timer starts then)
     })  -> { stop() }

   Timeline (all from the VO clock):
     before the first sound   shabaash 0-5    standing, mouth shut
     first word («शाबाश!»)    shabaash 6-29   the jump, mouth open — stretched to that word
     the pause after it       shabaash 30-35  lands, mouth shut
     rest of the line         talk sheet: a cursor walks the sheet forward (so the body keeps moving)
                              but only lands on frames whose mouth matches the track at that instant
     after the VO             idle sheet, mouth-shut frames only, looping
   Measured on MTG2A04_L01_S01: mouth = VO in 99.6-100 % of samples; every miss within one paint.
   ============================================================================================ */
(function(global){
  "use strict";
  function play(o){
    const M = o.meta, base = (o.base || "").replace(/\/?$/, "/");
    const bits = o.bits || "", step = o.step_ms || 25;
    const S = M.shabaash, T = M.talk, I = M.idle, COLS = M.cols || 6, N = M.frames || 36;
    const OPEN = new Set(T.open);
    let stopped = false;

    const sp = document.createElement("div");
    sp.className = "swc-sprite";
    sp.innerHTML = '<div class="swc-art"></div>';
    o.host.appendChild(sp);
    const art = sp.firstChild;
    art.style.aspectRatio = M.fw + " / " + M.fh;
    [S, T, I].forEach(s => { const i = new Image(); i.src = base + s.src; });   /* warm all three */

    let cur = "";
    const show = (sheet, i)=>{
      const url = base + sheet.src;
      if(url !== cur){ art.style.backgroundImage = 'url("' + url + '")'; cur = url; }
      const c = i % COLS, r = Math.floor(i / COLS);
      art.style.backgroundPosition = (c * 100 / (COLS - 1)) + "% " + (r * 100 / (COLS - 1)) + "%";
      sp.dataset.sheet = sheet === S ? "shabaash" : (sheet === I ? "idle" : "talk"); sp.dataset.f = i;
    };
    show(S, S.pre[0]);

    const loud = (t)=> bits.charAt(Math.floor(t / step)) === "1";
    const GAP = Math.round(200 / step);                       /* a 200 ms silence ends the first word */
    let s0 = bits.indexOf("1"), e0 = s0, gap = 0;
    for(let k = s0; k >= 0 && k < bits.length; k++){ if(bits[k] === "1"){ e0 = k; gap = 0; } else if(++gap >= GAP) break; }
    const speechStart = Math.max(0, s0) * step, wordEnd = (e0 + 1) * step;
    const ns = bits.indexOf("1", e0 + GAP), nextStart = ns < 0 ? wordEnd : ns * step;
    const lenMs = bits.length * step;
    const seg = (list, t, a, b)=> list[Math.min(list.length - 1, Math.max(0, Math.floor((t - a) / Math.max(1, b - a) * list.length)))];

    const idle = ()=>{ let j = 0; (function tick(){ if(stopped || !sp.isConnected) return;
      show(I, I.loop[j % I.loop.length]); j++; setTimeout(tick, 110); })(); };

    /* the clock */
    let t0 = 0, started = false;
    /* audio.currentTime advances in coarse steps in some browsers, so it only ANCHORS a smooth clock:
       t0 is set once from it when the clip starts; after that time is performance.now() - t0 */
    const t_now = ()=> performance.now() - t0;
    const sounding = ()=> o.audio ? (!o.audio.paused && !o.audio.ended) : !!(o.isSounding && o.isSounding());
    const waitStart = performance.now();
    let cursor = 0, curOpen = null, lastStep = 0;
    (function frame(){
      if(stopped || !sp.isConnected) return;
      const now = performance.now();
      if(!started){
        if(sounding() && (!o.audio || o.audio.currentTime > 0)){ started = true; t0 = now - (o.audio ? o.audio.currentTime * 1000 : 0); }
        else if(now - waitStart > 1800){ idle(); return; }            /* the VO never started */
        else { requestAnimationFrame(frame); return; }
      }
      const t = t_now(); sp.dataset.t = Math.round(t);
      if(!sounding() || t > lenMs + 400){ idle(); return; }
      if(t < speechStart) show(S, seg(S.pre, t, 0, speechStart));
      else if(t < wordEnd) show(S, seg(S.word, t, speechStart, wordEnd));
      else if(t < nextStart) show(S, seg(S.post, t, wordEnd, nextStart));
      else {
        const want = loud(t + 16);                        /* one paint ahead: the frame shows on the NEXT paint */
        if(want !== curOpen || now - lastStep > 80){      /* at once on a mouth change, else every 80 ms */
          let k = 1;
          while(k < N && OPEN.has((cursor + k) % N) !== want) k++;
          cursor = (cursor + k) % N; show(T, cursor); curOpen = want; lastStep = now;
        }
      }
      requestAnimationFrame(frame);
    })();
    return { el: sp, stop(){ stopped = true; } };
  }
  global.SwiftieCelebration = { play };
})(window);
