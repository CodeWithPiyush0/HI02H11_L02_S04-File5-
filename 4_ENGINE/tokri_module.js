
/* ==========================================================================================
   [S04] MATRA TOKRI - «मात्रा टोकरी», ported from HI02H11_L02_S01 (File2,
   github.com/khugshalharshvardhan/HI02H11_L02_S01_DEV_HANDOFF-file2-, commit e737324).
   File2's own animation-kit pieces the game uses (nudge, correct-select, wrong-select,
   object-outline, confetti) and the MATRA_TOKRI module, VERBATIM apart from the [S04] notes:
   the rounds/words come from the card, and the four File2 engine helpers this engine does not
   have are supplied here (_mtAudioSrc, _mtSfx). The kit core both engines share is identical.
   ========================================================================================== */
/* ===== FLN ANIMATION KIT: nudge BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion;
  function place(el, o){
    var nh = document.getElementById(o.hand); if(!nh || !el) return;
    var host = document.querySelector(o.host); if(!host) return;
    var r = el.getBoundingClientRect(), sw = host.getBoundingClientRect(), s = M.scale();
    nh.style.left = ((r.left - sw.left)/s + r.width/s/2 + o.dx) + "px";
    nh.style.top  = ((r.top  - sw.top )/s + r.height/s   + o.dy) + "px";
    nh.classList.add("show");
  }
  M.nudge = {
    defaults:{ hand:"nudgeHand", host:".slide-stage", dx:-48, dy:-30, oneHand:true },
    pointAt: function(el, opts){
      var o = Object.assign({}, this.defaults, opts || {});
      M.guard(function(){
        if(M.still()) return;
        if(o.oneHand) document.querySelectorAll(".demo-hand").forEach(function(h){ h.remove(); });
        place(el, o);
      });
    },
    after: function(target, ms, opts){            // returns cancel()
      var o = Object.assign({}, this.defaults, opts || {}), t = null;
      M.guard(function(){
        if(!ms || M.still()) return;
        t = setTimeout(function(){
          var el = (typeof target === "string") ? document.querySelector(target) : target;
          if(el) place(el, o);
        }, ms);
      });
      return function(){ clearTimeout(t); };
    },
    hide: function(opts){
      var o = Object.assign({}, this.defaults, opts || {});
      var nh = document.getElementById(o.hand); if(nh) nh.classList.remove("show");
    }
  };
})();
/* ===== FLN ANIMATION KIT: nudge END ===== */

/* ===== FLN ANIMATION KIT: correct-select BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion;
  function rnd(a, b){ return a + Math.random() * (b - a); }
  function mk(cls){ var i = document.createElement("i"); i.className = cls; return i; }

  /* Every deferred step is parked ON THE TILE so clear() can cancel it. Without this
     a second play inherits the FIRST play's pending timers and they strip the state
     off the new beat part-way through. Owning the timers is what makes these safely
     re-fireable, which the 2-attempt ladder needs. */
  function later(el, fn, ms){ (el._selT = el._selT || []).push(setTimeout(fn, ms)); }

  /* Tempo lives in CSS (--fx-beat / --fx-reward) so the two effects cannot drift
     apart. JS reads it rather than keeping a second copy, and only writes --ckT or
     --wgT when a caller explicitly passes `dur`. Custom properties do not resolve
     calc(), so the two numbers are read and multiplied here rather than reading
     the composed value. */
  function tempo(el){
    var cs = getComputedStyle(el);
    function num(p, d){
      var v = parseFloat(cs.getPropertyValue(p));
      if(!v && v !== 0) return d;
      return v > 20 ? v / 1000 : v;              /* tolerate ms as well as s */
    }
    var beat = num("--fx-beat", 0.4);
    return { beat: beat, reward: beat * (parseFloat(cs.getPropertyValue("--fx-reward")) || 2) };
  }
  /* KIT DEFECT FIX (one line, reported upstream): recipe 20's JS calls tempo()
     but tempo lives in THIS IIFE and is never exported, so wrongSelect.play()
     throws ReferenceError — swallowed by M.guard, leaving the wrong beat
     silently dead. Exporting it is the smallest change that makes both halves
     of the answer-feedback pair read the same one tempo, as documented. */
  M.tempo = tempo;

  M.answer = {
    clear: function(el){
      if(!el) return;
      if(el._selT){ for(var j = 0; j < el._selT.length; j++) clearTimeout(el._selT[j]); }
      el._selT = [];
      el.classList.remove("ck-correct", "wg-wrong", "wg-out", "wg-rel");
      var fx = el.querySelectorAll(".ck-fx,.wg-fx");
      for(var i = 0; i < fx.length; i++) fx[i].remove();
    }
  };

  M.correctSelect = {
    defaults:{ crown:5 },      /* dur comes from CSS unless you pass one */
    play: function(el, opts){
      var o = Object.assign({}, this.defaults, opts || {});
      M.guard(function(){
        if(!el) return;
        M.answer.clear(el);
        void el.offsetWidth;                 /* forced reflow - restarts the pop */
        var dur = o.dur || tempo(el).reward;            /* CSS owns the tempo */
        if(o.dur) el.style.setProperty("--ckT", dur + "s");

        var fx = mk("ck-fx");

        if(o.crown && !M.still()){
          var cr = mk("ck-crown");
          /* clientWidth is layout px INSIDE the scaled stage - design px already.
             getBoundingClientRect() would come back multiplied by --scale (R1). */
          var w = el.clientWidth || 96, h = el.clientHeight || 96;
          var rx = w * 0.46, ry = h * 0.46;               /* the tile's own edge */
          for(var i = 0; i < o.crown; i++){
            var t  = (o.crown === 1) ? 0.5 : i / (o.crown - 1);
            var a  = (-158 + t * 136 + rnd(-7, 7)) * Math.PI / 180;   /* TOP arc */
            var x0 = Math.cos(a) * rx, y0 = Math.sin(a) * ry;
            var out = rnd(.20, .34);
            var s = mk("");
            s.style.cssText =
              "--ss:" + rnd(7, 12).toFixed(1) + "px;" +
              "--x0:" + x0.toFixed(1) + "px;" +
              "--y0:" + y0.toFixed(1) + "px;" +
              "--sx:" + (x0 + Math.cos(a) * w * out).toFixed(1) + "px;" +
              "--sy:" + (y0 + Math.sin(a) * h * out).toFixed(1) + "px;" +
              "--sr:" + Math.round(rnd(-140, 140)) + "deg;";
            cr.appendChild(s);
          }
          fx.appendChild(cr);
        }

        /* class FIRST: the border and the pop are the feedback, and they must not
           wait on ~9 nodes of decoration being built. Measured 45ms of dead time
           before any pixel moved when this ran the other way round. */
        el.classList.add("ck-correct");
        el.appendChild(fx);
        /* Only the TRANSIENT layers are swept. .ck-correct stays: the green outline
           is the correct-mark and it belongs to the tile until the slide advances. */
        later(el, function(){
          var t = fx.querySelectorAll(".ck-crown");
          for(var i = 0; i < t.length; i++) t[i].remove();
        }, dur * 1050);
      });
    }
  };
})();
/* ===== FLN ANIMATION KIT: correct-select END ===== */

/* ===== FLN ANIMATION KIT: wrong-select BEGIN ===== */
/* needs the `later`, `tempo` and `M.answer.clear` helpers from recipe 19 */
(function(){ "use strict";
  var M = window.FLNMotion;
  function mk(cls){ var i = document.createElement("i"); i.className = cls; return i; }
  function later(el, fn, ms){ (el._selT = el._selT || []).push(setTimeout(fn, ms)); }
  var tempo = M.tempo;      /* exported by recipe 19 — see the KIT DEFECT FIX note */

  M.wrongSelect = {
    defaults:{},               /* dur comes from CSS unless you pass one */

    /* transient: shakes, holds red, then RELEASES */
    play: function(el, opts){
      var o = Object.assign({}, this.defaults, opts || {});
      M.guard(function(){
        if(!el) return;
        M.answer.clear(el);
        void el.offsetWidth;
        var dur = o.dur || tempo(el).beat;              /* CSS owns the tempo */
        if(o.dur) el.style.setProperty("--wgT", dur + "s");
        el.classList.add("wg-wrong");          /* class first - see recipe 19 */
        var fx = mk("wg-fx"); fx.appendChild(mk("wg-pulse"));
        el.appendChild(fx);
        /* RELEASE on a timeout, never on animationend: under the reduced-motion kill
           switch animationend never fires and the tile would stay red forever - on
           exactly the devices least able to recover from it. (R5, second half.)
           .wg-rel goes on BEFORE .wg-wrong comes off so the border has something to
           transition with. */
        later(el, function(){
          el.classList.add("wg-rel");
          el.classList.remove("wg-wrong");
          var f = el.querySelector(".wg-fx"); if(f) f.remove();
          later(el, function(){
            el.classList.remove("wg-rel");
            if(o.then) o.then();
          }, 260);
        }, dur * 1500 + 40);
      });
    },

    /* elimination: shakes once, recedes, and STAYS recessed. No auto-clear. */
    out: function(el, opts){
      var o = Object.assign({}, this.defaults, opts || {});
      M.guard(function(){
        if(!el) return;
        M.answer.clear(el);
        void el.offsetWidth;
        var dur = o.dur || tempo(el).beat;
        if(o.dur) el.style.setProperty("--wgT", dur + "s");
        el.classList.add("wg-out");
        var fx = mk("wg-fx"); fx.appendChild(mk("wg-pulse"));
        el.appendChild(fx);
      });
    }
  };
})();
/* ===== FLN ANIMATION KIT: wrong-select END ===== */

/* ===== FLN ANIMATION KIT: object-outline BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion;
  var ST = ["is-correct", "is-wrong", "is-muted"];

  M.objectOutline = {
    /* state is just a class - both engines read the same ones */
    set: function(el, state){
      M.guard(function(){
        if(!el) return;
        for(var i = 0; i < ST.length; i++) el.classList.remove(ST[i]);
        void el.offsetWidth;                  /* restart - as in recipe 19 */
        if(state) el.classList.add("is-" + state);
      });
    },
    correct: function(el){ this.set(el, "correct"); },
    muted:   function(el){ this.set(el, "muted"); },
    reset:   function(el){ if(el && el._olT) clearTimeout(el._olT); this.set(el, ""); },

    /* wrong RELEASES back to idle white - the child has another attempt, exactly
       as the tile does in recipe 20. Timeout, never animationend: under the
       reduced-motion kill-switch animationend never fires. */
    wrong: function(el, opts){
      var o = opts || {}, self = this;
      M.guard(function(){
        if(!el) return;
        self.set(el, "wrong");
        var v = parseFloat(getComputedStyle(el).getPropertyValue("--olT")) || 0.4;
        if(v > 20) v = v / 1000;
        if(el._olT) clearTimeout(el._olT);
        el._olT = setTimeout(function(){
          el.classList.remove("is-wrong");
          if(o.then) o.then();
        }, v * 1500 + 40);
      });
    },

    /* OPTIONAL, and read the caveat. A rectangular hit box over an irregular sprite
       steals taps meant for whatever is behind it - two overlapping characters and
       the child taps the wrong one. This tests the tap against the sprite's ALPHA.
       It FAILS OPEN: reading pixels back taints the canvas on file://, which is how
       the activities ship, so there it always returns true and you are back to the
       bounding box. Treat it as a dev-server nicety, not a guarantee - the reliable
       fix is z-order and not overlapping the tappable parts in the first place. */
    alphaHit: function(img, clientX, clientY){
      var r = img.getBoundingClientRect();
      if(clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom)
        return false;
      if(img._olA === undefined){
        try{
          var w = Math.min(img.naturalWidth, 256);
          var h = Math.round(img.naturalHeight * w / img.naturalWidth);
          var c = document.createElement("canvas"); c.width = w; c.height = h;
          var x = c.getContext("2d"); x.drawImage(img, 0, 0, w, h);
          img._olA = x.getImageData(0, 0, w, h);
        }catch(e){ img._olA = null; }         /* tainted - fail OPEN */
      }
      if(!img._olA) return true;
      var d = img._olA;
      var px = Math.floor((clientX - r.left) / r.width  * d.width);
      var py = Math.floor((clientY - r.top)  / r.height * d.height);
      return d.data[(py * d.width + px) * 4 + 3] > 24;
    }
  };
})();
/* ===== FLN ANIMATION KIT: object-outline END ===== */

/* ===== FLN ANIMATION KIT: confetti BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion;
  function rnd(a, b){ return a + Math.random() * (b - a); }

  M.confetti = {
    defaults: {
      host:".stage-inner", count:80, stagger:0.35,
      fall:[1.1,1.8], drift:45, sway:[10,34], bob:[3,7],
      rockT:[0.6,1.2], tumbleT:[0.75,1.5], tumbleShare:0.22,
      amp:[28,52], yaw:30, depth:[0.75,1.15], tilt:25,
      /* weighted: star 40%, rectangle 20%, line 20%, square 20%.
         Repeat an entry to weight it - the array is sampled uniformly. */
      shapes:["st","st","st","st","rc","rc","ln","ln","sq","sq"],
      /* VIBGYOR. Front/back pairs - the back is the SAME hue darkened, never a
         different hue, or it reads as two pieces flickering instead of one turning. */
      colors:[["#8B2FC9","#5E1C8C"],   /* violet */
              ["#3F51B5","#27358A"],   /* indigo */
              ["#1E88E5","#135FA6"],   /* blue   */
              ["#22B24C","#157A34"],   /* green  */
              ["#FFD21E","#D9A800"],   /* yellow */
              ["#FF8A1E","#C75F00"],   /* orange */
              ["#E5322D","#A81F1B"]],  /* red    */
      phases:["guided","practice","mastery"]   /* [] disables phase gating */
    },
    burst: function(opts){
      var o = Object.assign({}, this.defaults, opts || {});
      M.guard(function(){
        if(M.still()) return;
        /* confetti ONLY on activity phases - never tutorials, demos, landing, transitions */
        if(o.phases.length && o.phase && o.phases.indexOf(o.phase) < 0) return;
        var host = document.querySelector(o.host); if(!host) return;

        var dist = host.clientHeight + 60, maxLife = 0;
        var wrap = document.createElement("div");
        wrap.className = "fx-confetti";

        for(var i = 0; i < o.count; i++){
          var z     = rnd(o.depth[0], o.depth[1]);        /* depth */
          var fall  = rnd(o.fall[0], o.fall[1]) / z;      /* nearer = bigger = faster */
          var delay = rnd(0, o.stagger);
          if(fall + delay > maxLife) maxLife = fall + delay;
          var pair = o.colors[i % o.colors.length];
          /* most pieces flutter (face stays visible); a minority go end-over-end */
          /* Two regimes, and a real plate moves DIFFERENTLY in each:
             flutter = zigzags hard, almost no net sideways drift;
             tumble  = autorotation gives a steady lateral force, so it barely
                       zigzags but drifts consistently to one side. */
          var flutter = Math.random() > o.tumbleShare;
          var rockT   = flutter ? rnd(o.rockT[0], o.rockT[1])
                                : rnd(o.tumbleT[0], o.tumbleT[1]);
          var sway    = flutter ? rnd(o.sway[0], o.sway[1]) : rnd(2, 8);
          var drift   = flutter ? rnd(-o.drift/2.5, o.drift/2.5) : rnd(-o.drift, o.drift);
          var bob     = flutter ? rnd(o.bob[0], o.bob[1]) : rnd(2, 4);

          /* set every property once - they inherit down to .w and .f */
          var p = document.createElement("i"); p.className = "p";
          p.style.cssText =
            "--x:"     + rnd(-2, 98).toFixed(1) + "%;" +
            "--dist:"  + dist + "px;" +
            "--fall:"  + fall.toFixed(2) + "s;" +
            "--delay:" + delay.toFixed(2) + "s;" +
            "--drift:" + drift.toFixed(0) + "px;" +
            "--sway:"  + sway.toFixed(0) + "px;" +
            "--bob:"   + bob.toFixed(1) + "px;" +
            "--rockT:" + rockT.toFixed(2) + "s;" +
            /* capped short of 90deg: even at max tilt the face still reads */
            "--amp:"   + Math.round(rnd(o.amp[0], o.amp[1])) + "deg;" +
            "--yaw:"   + Math.round(rnd(-o.yaw, o.yaw)) + "deg;" +
            "--tilt:"  + Math.round(rnd(-o.tilt, o.tilt)) + "deg;" +
            "--z:"     + z.toFixed(2) + ";" +
            "--dim:"   + (0.72 + (z - o.depth[0]) /
                          (o.depth[1] - o.depth[0]) * 0.28).toFixed(2) + ";" +
            /* shapes stay legible by ASPECT RATIO, not size - see the shape table */
            "--c:"     + pair[0] + ";--c2:" + pair[1] + ";";

          var w = document.createElement("i"); w.className = "w";
          var f = document.createElement("i");
          f.className = "f " + o.shapes[Math.floor(Math.random() * o.shapes.length)] +
                        (flutter ? "" : " tum");
          w.appendChild(f); p.appendChild(w); wrap.appendChild(p);
        }
        host.appendChild(wrap);
        /* lifetime is computed, not hard-coded - a longer fall cannot be cut off */
        setTimeout(function(){ wrap.remove(); }, (maxLife + 0.3) * 1000);
      });
    },
    /* stops a slide advancing mid-celebration. 8s safety cap. */
    after: function(fn){
      var started = Date.now();
      (function check(){
        if(!document.querySelector(".fx-confetti") || Date.now() - started > 8000){ fn(); return; }
        setTimeout(check, 200);
      })();
    }
  };
})();
/* ===== FLN ANIMATION KIT: confetti END ===== */

const _mtAudioSrc = (id)=> ((CARD.assets && CARD.assets.audio && CARD.assets.audio[id]) ||
                            ("assets/Audio/" + id + "." + AUDIO_EXT));
function _mtSfx(id, fallback){
  try{
    const a = new Audio(typeof _av === "function" ? _av(_mtAudioSrc(id)) : _mtAudioSrc(id));
    a.volume = 0.55;
    if(window.__lessonBgm) window.__lessonBgm.track(a);     /* the music steps back, as for every sfx */
    a.play().catch(()=>{ if(fallback) fallback(); });
  }catch(e){ if(fallback) fallback(); }
}
SlideModules.MATRA_TOKRI = {
  mount(host, slide){
    /* The game is authored against the FULL 1333x750 stage (HEADER_H 96, PLAY_H 654) and its
       physics read those numbers directly, so it mounts to the stage rather than into the
       padded .slide-stage box that ordinary modules use. clearHost() calls __slideCleanup on
       the way out, which is where the rAF loop and the window listeners are released. */
    const stage = $("stage");
    stage.classList.add("mt-play");
    document.body.classList.add("mt-page");

    /* EVERY TIMER THIS SLIDE STARTS, TRACKED. The game schedules a lot of deferred work - round
       banners, the level cheer, VO callbacks, the tutorial hand - and a child can tap आगे in the
       middle of any of it. Cancelling the rAF loop was not enough: a pending setTimeout would
       still fire against elements the teardown had already removed, which threw
       "Cannot set properties of null (setting 'textContent')" on the way out. Shadowing
       setTimeout for the whole module scope catches all of them without touching ~30 call
       sites, and clearing them is one line in __slideCleanup. */
    const _mtTimers = [];
    const setTimeout = (fn, ms) => { const id = window.setTimeout(fn, ms); _mtTimers.push(id); return id; };

    /* THE LETTERBOX IS THE PLATE'S EDGE COLUMN, CONTINUED. Sampled as the mean of the plate's
       left and right edge columns (they agree to within ~1%), as fraction-of-height -> colour;
       the dark stop at .6636 is the horizon's own outline. The stops are then positioned in
       VIEWPORT pixels from the stage's measured box, so the horizon in the margin is by
       construction at the same y as the horizon in the scene - which is exactly what `cover`
       could not guarantee. Outside the stage the end stops clamp flat, which is what a
       top/bottom margin wants. */
    const MT_EDGE = [[0,"#7FC2FE"],[.0801,"#84C7FD"],[.1736,"#90D0FC"],[.2670,"#9CDCFD"],
      [.3605,"#AAEAFC"],[.4539,"#B8F4FD"],[.5340,"#C4FAFC"],[.6008,"#CCFAFD"],[.6342,"#CEFBFC"],
      [.6515,"#D0FCFE"],[.6569,"#D0F8FA"],[.6582,"#D4FDFF"],[.6595,"#B8E6F6"],
      /* the horizon's outline is a 4px BAND in the plate (rows 495-498), not a line. Sampling it
         with one stop let CSS interpolate straight through it, so the margin drew a thin pale
         line where the scene has a thick dark one - measured at the seam: luminance 184 against
         the scene's 153, with the row position already correct. These six stops are those rows
         one for one, so the band has the same weight on both sides of the edge. */
      [.6609,"#3E6E82"],[.6622,"#104158"],[.6636,"#174651"],[.6649,"#386556"],[.6662,"#ACD4AC"],
      [.6676,"#CCF2AE"],[.6689,"#C5EC97"],[.6702,"#C7ED91"],[.6782,"#C2F78A"],[.6943,"#8ED257"],
      [.7477,"#86CE50"],[.8545,"#78C648"],[1,"#78C44A"]];
    const paintPageEdge = ()=>{
      const r = stage.getBoundingClientRect();
      if(!r.height) return;
      const at = (f)=> (r.top + f * r.height).toFixed(1) + "px";
      const mid = MT_EDGE.map(s => s[1] + " " + at(s[0])).join(",");
      document.body.style.backgroundImage =
        "linear-gradient(180deg," + MT_EDGE[0][1] + " 0px," + mid + "," +
        MT_EDGE[MT_EDGE.length - 1][1] + " 100%)";
    };
    paintPageEdge();
    window.addEventListener("resize", paintPageEdge);
    const root = document.createElement("div");
    root.className = "mt-game";
    host.setAttribute("data-mt", "1");
      root.innerHTML =
        '<div class="game-header"><div class="stats">' +
          '<div class="catch-track" id="catch-track">' +
            '<div class="catch-dot"></div><div class="catch-dot"></div><div class="catch-dot"></div>' +
            '<div class="catch-dot"></div><div class="catch-dot"></div>' +
          '</div>' +
          '<div class="stat-chip score" style="display:none"><span id="score-val">0</span></div>' +
        '</div></div>' +
        '<div class="play-area" id="play-area">' +
          '<div class="catch-line"></div>' +
          '<div class="basket" id="basket"><span class="basket-lift" id="basket-lift">' +
            '<div class="ol ol-alpha" id="basket-art"><img src="assets/UI/mt_basket.webp" alt="" aria-hidden="true"></div>' +
          '</span></div>' +
          '<div class="basket-front" id="basket-front" aria-hidden="true"><span class="basket-lift" id="basket-front-lift">' +
            '<div class="bf-art" id="basket-front-art"><img src="assets/UI/mt_basket_front.webp" alt=""></div>' +
          '</span></div>' +
          '<div id="mtNudgeHand">' +
            '<span class="nh-tapfx"><i class="fx-ro"></i><i class="fx-ri"></i><i class="fx-sp"></i></span>' +
            '<img src="assets/UI/nudge_hand_new.svg" alt="">' +
          '</div>' +
        '</div>' +
        '<div class="level-cheer" id="level-cheer" aria-hidden="true">' +
          '<div class="lc-fx" id="lc-fx"></div>' +
          '<div class="lc-mascot"><img src="assets/UI/mt_mascot_swifty.webp" alt=""></div>' +
        '</div>' +
        '<div class="feedback-pop" id="feedback"></div>';
    stage.appendChild(root);
    /* The between-rounds wash must cover the letterbox too, and a fixed layer created inside
       .stage is captured by its transform. So the cheer overlay is lifted out to <body>; it is
       tracked separately because it no longer goes away when `root` does. */
    const cheerEl = root.querySelector(".level-cheer");
    document.body.appendChild(cheerEl);

      /* ---- host shims -------------------------------------------------------------------
         The game was written against the single-game shell (SwiftPalAudio / SFX / Bgm /
         SwiftPalSound / SwiftPalGame). Rather than rewrite ~30 call sites, give it those
         five names implemented on THIS engine. That is also what keeps it from being a
         second project living inside the first: one audio path, one SFX bed, one shuffle. */
      var VOMAP = { 'vo-tutorial':'vo_mt_intro' };     /* [S04] rounds name their own clips */
      function voId(id){
        if (VOMAP[id]) return VOMAP[id];
        return id.indexOf('s-') === 0 ? 'vo_mt_w_' + id.slice(2) : id;   // word clips
      }
      var SwiftPalAudio = {
        play: function (id, onEnd) { play(_mtAudioSrc(voId(id)), onEnd || function () {}); },
        stop: function () { stopAudio(); }
      };
      /* the lesson's OWN feedback bed, not the game's duplicates - a child should not hear
         two different "correct" sounds in one lesson depending on which screen they are on */
      /* [S04] this lesson's feedback bed is sfx_fb_correct / sfx_fb_incorrect (File3 r73) - the
         same thing File2's comment above asks for: one "correct" sound across the whole lesson */
      var SFX = { play: function (n) {
        if (n === 'correct.ogg') _mtSfx('sfx_fb_correct', sfxCorrect);
        else if (n === 'wrong.ogg') _mtSfx('sfx_fb_incorrect', sfxWrongSoft);
        else if (n === 'burst.ogg') _mtSfx('sfx_mt_burst', function () { _mtSfx('sfx_chime', null); });
      } };
      var Bgm = { start: function () {}, duck: function () {}, rise: function () {} };
      var SwiftPalSound = { unlock: function () {}, win: function () {} };
      /* the engine has no global shuffle (its modules take it as an option), so the game gets
         its own Fisher-Yates rather than a sort(()=>Math.random()-0.5), which is biased */
      function mtShuffle(a) {
        var r = a.slice();
        for (var i = r.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1)); var t = r[i]; r[i] = r[j]; r[j] = t;
        }
        return r;
      }
      var SwiftPalGame = { shuffle: mtShuffle, setScore: function () {}, setStars: function () {} };

      /* ---- the game, verbatim apart from the host couplings above ---- */
      // ====================================================================
      // मात्रा टोकरी (Matra Tokri) — catch-the-matra-word arcade.
      //
      // Words drift down out of the sky. The child slides the basket along the
      // grass and collects only the words carrying the matra being asked for.
      // Three rounds, five words each:
      //     1.  ा   आ की मात्रा
      //     2.  ि   इ की मात्रा
      //     3.  ी   बड़ी ई की मात्रा
      // A wrong word in the basket costs nothing — the basket turns red and
      // wiggles (kit recipe 21) and the word is tossed back out. Positive
      // reinforcement only, exactly as अक्षर वर्षा does with consonants.
      // ====================================================================

      /* [S04] THE ROUNDS ARE CARD DATA - one per matra this lesson teaches, in File2's exact
         shape ({matra, vo, cheer, words:[{w,id}], other:[...]}). Everything else below is File2's
         game, verbatim. */
      var ROUNDS = (slide.data && slide.data.rounds) || [];

      /* There is ONE cloud raster and it is pink — measured at hue 339 for both the
         fill and the darker outline. These are rotations FROM that pink, so one asset
         serves every word: rotating the whole image keeps fill, outline and gloss in
         their painted relationship, and the gloss is unsaturated so it stays white.
         WHAT IS NOT IN THIS LIST MATTERS MORE THAN WHAT IS. The chosen rotations land
         the cloud's own outline on gold 45, cyan 180, blue 215, violet 270 and
         magenta 298. Nothing green and nothing red, because the correct/wrong ring is
         drawn just outside that outline in exactly those two colours — a green cloud
         wearing a green "correct" ring says nothing at all, which is what the first
         pass through this palette actually did. */
      var CLOUD_HUES = [67, 202, 237, 292, 320];

      /* The chip is a fixed box — see .drop-tile for why a painted cloud cannot be
         stretched per word. Physics reads these two rather than measuring offsetWidth. */
      var TILE_W = 204;
      var TILE_H = 128;

      // ---- Tunable settings ----
      var STAGE_W  = 1333;
      var STAGE_H  = 750;
      var HEADER_H = 96;
      var PLAY_H   = STAGE_H - HEADER_H;          // 654

      /* A Grade 1 child has to READ each word before deciding, and the decision is
         the whole activity — so the fall is paced for reading, not for reflexes.
         ~8-10s from the top of the screen to the rim, against ~5-7s before.
         SPAWN_INTERVAL goes up with it: slower words linger, and at the old 1.45s
         there would be six on screen at once, which is a crowded sky to read. */
      var SPAWN_INTERVAL = 2.1;     // seconds between words
      var SPEED_MIN      = 45;      // px / sec
      var SPEED_MAX      = 70;
      var GRAVITY        = 8;       // gentle acceleration
      var TARGET_RATIO   = 0.55;    // probability a spawn is a target-matra word

      var BASKET_W          = 206;
      /* Both measured off the painted basket by assets/_finish_art.py, not guessed:
         its widest opaque row spans 99.6% of the art's width (the old inline SVG's
         rim was rx 90 of a 200-wide viewBox, i.e. 90%) and sits 19.1% down the frame
         (the SVG's was 24.7%). A wider, higher rim than the drawing it replaced — so
         both numbers move, or the catch box drifts off what the child can see. */
      var BASKET_CATCH_HALF = 103;  // the rim IS the art's full width, so BASKET_W / 2
      var CATCH_Y           = 517;  // play-area px: basket top 473 + 28.5% of 155
      var CATCH_DEPTH       = 52;   // how far past the rim a word still counts as caught
      var PER_ROUND         = 5;

      /* vo-good-1/2/3 are no longer played: the between-rounds praise is now the
         first half of each vo-level-* celebration clip, so it cannot be cut off by
         the instruction that follows it. The files stay for reuse. */
      var IDLE_NUDGE_MS = 5000;     // hesitation before the nudge hand appears (recipe 3)

      /* The hand touches the basket's RIGHT FLANK — a finger on the thing it is
         telling you to drag. Two constraints fix these numbers, and they are the
         reason the obvious values are wrong:
           - Pointing at the RIM drops the hand's body into the bowl. #nudgeHand is
             z-index 40 against the basket's 4, so it does not go behind — it covers
             the opening, which is the wrong picture for a game about putting words IN.
           - The hand hangs DOWNWARD from its fingertip and .play-area clips at 654.
             The painted hand fills its 86x108 box vertically (162x285 contained fits
             by height), so a fingertip lower than ~546 loses the wrist off the bottom.
         place() positions the box at (basket centre + dx, basket bottom 628 + dy) and
         the fingertip sits at (13.8, 12.0) inside it, so these put the tip at
         (centre + 60, 558) — on the woven body, BELOW the bowl's mouth (which ends at
         ~547) so the hand never covers the opening words drop into, and high enough
         that the wrist clears .play-area's 654 cut. This hand points up-LEFT, so the
         body trails down-right of the tip. */
      /* [r25] dx is shifted by the fingertip delta measured in the CSS note above
         (+20 right): 46 - 19.2 = 26.8, so the lesson's hand points at the same spot on the
         basket flank the game's own hand did.
         dy STAYS -82. Correcting it to -77 for the 4px-higher tip pushed the 108px box down
         to 659 against the play area's 654 cut and shaved the wrist - measured, 6px clipped.
         The box bottom is the binding constraint here, not the tip, so the box keeps its
         tuned position and the finger simply points 5px higher up the same flank. */
      var NUDGE_OPTS = { hand: 'mtNudgeHand', host: '.mt-game .play-area', dx: 26.8, dy: -82 };

      // ---- State ----
      var playArea = null, basketEl = null, basketLift = null, basketArt = null;
      var basketFrontEl = null, basketFrontLift = null, basketFrontArt = null;
      var drops = [], basketX = 0, basketTargetX = STAGE_W / 2;
      /* Words that have landed in the basket and must RIDE it until they are gone.
         The catch captures a position, but the player's finger does not stop — pinned
         to that captured x, a word sinks where the basket USED to be, so dragging
         straight after a catch walked the basket out from under the word and left it
         falling in open air. Re-pointed every frame in tick(). */
      var carried = [];
      var score = 0, roundIdx = 0, caught = 0;
      var pending = [];             // target words for this round not yet collected
      var spawnTimer = 0, lastTime = 0, running = false, paused = true;
      /* roundDone latches the moment the fifth word lands in the basket. Words already
         in the air keep falling — they just stop being catchable — so a straggler
         cannot fire finishRound() a second time and skip the next round entirely. */
      var roundDone = false, ended = false;
      /* roundDone latches at the CATCH so nothing else can be collected; `finishing`
         latches when finishRound actually runs, which is now later — it waits for the
         fifth word to finish saying itself. Two flags, because they no longer happen
         on the same tick. */
      var finishing = false;
      var lastMoveAt = 0, nudgeShown = false;
      var STAGE_SCALE = 1;

      /* (the game's own <audio> SFX bus is removed - the shim above maps its three cues
         onto the lesson's sfxCorrect / sfxWrongSoft / sfx_mt_burst instead, so a child
         hears one feedback bed across all 17 slides rather than two.) */

      /* The stage's on-screen box, cached. clientToStage() runs on every single
         pointermove, and getBoundingClientRect() forces a layout flush — doing that
         per move, while the rAF loop is writing transforms, is half of why dragging
         the basket felt like it was catching. The box only changes on resize. */
      var stageRect = null;
      /* ---- Background music. -----------------------------------------------------
         Starts on the play button: a browser will not autoplay audio before a user
         gesture, and the title screen has none.

         It DUCKS under every voice clip. The VO here IS the instruction — one that is
         not heard did not happen — so the music is mixed as furniture and nothing
         else: cut into the file well below the speech (-30 LUFS against the VO's -16),
         held low at playback, and pulled lower still whenever anyone is talking.
         ?nomusic=1 turns it off, next to the kit's ?still=1. ---- */
      /* (background music removed: bgm.ogg is not shipped - no other slide in this lesson
         has music and a bed under one screen only reads as a bug.) */


      function readStageScale() {
        var v = getComputedStyle(document.documentElement).getPropertyValue('--scale');
        var n = parseFloat(v);
        STAGE_SCALE = (isFinite(n) && n > 0) ? n : 1;
        var st = document.querySelector('.stage');
        if (st) stageRect = st.getBoundingClientRect();
      }

      /* Count aksharas, not code units — "मछली" is 5 JS chars but 4 aksharas, and the
         tile font size should follow what the eye sees. */
      function aksharaCount(w) {
        return w.replace(/[ऀ-ःऺ-ॏ॑-ॗॢॣ‍]/g, '').length;
      }

      // ============ Spawn ============
      function spawn() {
        var R = ROUNDS[roundIdx];
        // Never put a second copy of a word on screen while the first is still
        // falling — two identical chips make the round look longer than it is, and
        // one of the two would always be a duplicate by the time it lands.
        var airborne = drops.filter(function (d) { return d.alive; }).map(function (d) { return d.word; });
        var free = pending.filter(function (p) { return airborne.indexOf(p.w) < 0; });
        var isTarget = free.length > 0 && Math.random() < TARGET_RATIO;
        var word, id = null;

        if (isTarget) {
          var pick = free[Math.floor(Math.random() * free.length)];
          word = pick.w; id = pick.id;
        } else {
          var others = R.other.filter(function (w) { return airborne.indexOf(w) < 0; });
          if (!others.length) others = R.other;
          word = others[Math.floor(Math.random() * others.length)];
        }

        var el = document.createElement('div');
        el.className = 'drop';
        var tile = document.createElement('div');
        tile.className = 'drop-tile' + (aksharaCount(word) >= 4 ? ' long' : '');
        tile.style.setProperty('--cloud-hue',
          CLOUD_HUES[Math.floor(Math.random() * CLOUD_HUES.length)] + 'deg');
        /* The cloud is its OWN element behind the word, never a background on the
           tile: the answer outline and the recolour are both filters, and a filter on
           the tile would drag the word through them too. */
        var art = document.createElement('div');
        art.className = 'dt-cloud';
        var lab = document.createElement('span');
        lab.className = 'dt-word';
        lab.textContent = word;
        tile.appendChild(art);
        tile.appendChild(lab);
        el.appendChild(tile);
        playArea.appendChild(el);

        var w = TILE_W;                         // fixed box — see .drop-tile
        // Keep clear of anything still near the top: two chips overlapping at the same
        // height is unreadable, and a word a child cannot read is a word they cannot
        // sort. Ten tries, then take the best-separated candidate rather than loop.
        var lo = w / 2 + 26, span = STAGE_W - w - 52;
        var near = drops.filter(function (d) { return d.alive && d.y < 170; });
        var x = lo + Math.random() * span, best = -1;
        for (var k = 0; k < 10; k++) {
          var cand = lo + Math.random() * span, gap = Infinity;
          for (var n = 0; n < near.length; n++) {
            gap = Math.min(gap, Math.abs(cand - near[n].x) - (w + near[n].w) / 2);
          }
          if (gap > best) { best = gap; x = cand; }
          if (gap > 40) break;                  // 40px of clear air is enough
        }
        var d = {
          el: el, tile: tile, word: word, id: id, isTarget: isTarget,
          x: x, y: -100, w: w, speed: SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
          alive: true
        };
        drops.push(d);
        positionDrop(d);
      }

      function positionDrop(d) {
        d.el.style.transform = 'translate(' + (d.x - d.w / 2) + 'px,' + d.y + 'px)';
      }

      function clearDrops() {
        for (var i = 0; i < drops.length; i++) { if (drops[i].el.parentNode) drops[i].el.remove(); }
        drops = [];
        carried = [];
      }

      // ============ Basket ============
      function clientToStage(clientX, clientY) {
        if (!stageRect) readStageScale();
        return { x: (clientX - stageRect.left) / STAGE_SCALE,
                 y: (clientY - stageRect.top)  / STAGE_SCALE };
      }

      function onPointerMove(e) {
        if (!running) return;
        var p = clientToStage(e.clientX, e.clientY);
        basketTargetX = Math.max(BASKET_W / 2, Math.min(STAGE_W - BASKET_W / 2, p.x));
        lastMoveAt = performance.now();
        if (nudgeShown) { FLNMotion.nudge.hide(NUDGE_OPTS); nudgeShown = false; }
      }
      function onPointerDown(e) { onPointerMove(e); }

      /* Time constant of the follow, in seconds. The old base-0.0005 form closed only
         ~12% of the remaining distance per frame at 60Hz, so the basket trailed the
         finger by a visible margin the whole way across — that is the "laggy" feel,
         and it is a tuning value, not a frame-rate problem. At 28ms the basket closes
         ~45% per frame: it still eases rather than snapping, but it arrives with the
         finger instead of behind it. */
      var FOLLOW_TAU = 0.028;

      function moveBasket(dt) {
        var lerp = 1 - Math.exp(-dt / FOLLOW_TAU);   // dt-aware, frame-rate independent
        basketX += (basketTargetX - basketX) * lerp;
        if (Math.abs(basketTargetX - basketX) < 0.25) basketX = basketTargetX;  // stop sub-pixel crawl
        setBasketX(basketX);
      }

      /* The basket is two elements that must never drift apart by even a pixel — the
         front half is a copy of the same art laid over the back one. Anything that
         moves the basket goes through here.
         Only the horizontal move needs mirroring. The catch bounce (.basket-lift, 420ms
         from the catch) and recipe 21's olYes pop (540ms) are both finished by the time
         the sink starts at 420ms, so the word is never between two halves that are
         doing different things. */
      function setBasketX(x) {
        /* ROUNDED on purpose. The two halves are separately composited layers (both
           carry will-change, and the back one carries a filter), so at a fractional
           offset they can rasterise half a pixel apart and the cut arc shows up as a
           hairline. On integer px they land identically. A 206px basket moving in
           whole pixels is not something anyone can see. */
        var t = 'translateX(' + Math.round(x - BASKET_W / 2) + 'px)';
        basketEl.style.transform = t;
        if (basketFrontEl) basketFrontEl.style.transform = t;
      }

      /* The catch bounce, on BOTH halves. This is the one that gave the game away:
         basketBounce lifts its element 15px, and it runs at the exact moment a word
         is dropping in. */
      function bounceBasket() {
        [basketLift, basketFrontLift].forEach(function (el) {
          if (!el) return;
          el.classList.remove('bounce');
          void el.offsetWidth;                       // forced reflow — restart it
          el.classList.add('bounce');
          setTimeout(function () { el.classList.remove('bounce'); }, 420);
        });
      }

      /* Recipe 21's answer beat. The back half gets the real thing (outline + motion);
         the front half gets the same state class, which under the CSS above gives it
         the matching olYes/olNo motion and no outline of its own. */
      function answerBasket(kind) {
        FLNMotion.objectOutline[kind](basketArt);
        var el = basketFrontArt;
        if (!el) return;
        el.classList.remove('is-correct', 'is-wrong');
        void el.offsetWidth;
        el.classList.add('is-' + kind);
        if (kind === 'wrong') {
          // Mirrors objectOutline.wrong's own release (--olT * 1500 + 40).
          var v = parseFloat(getComputedStyle(el).getPropertyValue('--olT')) || 0.4;
          if (v > 20) v = v / 1000;
          setTimeout(function () { el.classList.remove('is-wrong'); }, v * 1500 + 40);
        }
      }

      // ============ Catch / miss ============
      function catchDrop(d) {
        d.alive = false;
        /* Synchronously, ahead of every feedback timer: the word is in the basket from
           this instant, so it has to be drawn in front of the basket's back half from
           this instant too. See .drop.caught. */
        d.el.classList.add('caught');
        d.el.style.setProperty('--catch-x', (basketX - d.w / 2) + 'px');
        d.el.style.setProperty('--catch-y', d.y + 'px');
        /* positionDrop has been writing an INLINE transform every frame, and an inline
           declaration beats the .drop.caught rule — so it has to go, or the word stays
           pinned where it fell. (The sink animation needs no such help: animations
           outrank inline styles in the cascade.) */
        d.el.style.transform = '';
        carried.push(d);

        if (d.isTarget) {
          // Is this word still outstanding, or a second copy of one already collected?
          // A duplicate still gets the confirm — it IS a correct word and a red buzz
          // would teach the opposite — but it must not score or fill a slot twice.
          var slot = -1;
          for (var i = 0; i < pending.length; i++) {
            if (pending[i].w === d.word) { slot = i; break; }
          }
          var fresh = (slot >= 0);

          // --- the tile-level confirm (recipe 19) ---
          FLNMotion.correctSelect.play(d.tile);
          // --- the object-level confirm on the basket (recipe 21, engine A) ---
          answerBasket('correct');
          bounceBasket();

          /* Sparks at the rim, timed to the word arriving rather than to the catch:
             the sink takes ~260ms to carry it down to the rim, and sparks thrown
             before it gets there read as belonging to nothing. */
          setTimeout(function () { sparkleBurst(basketX, CATCH_Y + 6); }, 180 + 340);

          SFX.play('correct.ogg');

          if (fresh) {
            pending.splice(slot, 1);
            score += 10;
            SwiftPalGame.setScore(score);
            showScorePop(basketX, CATCH_Y - 90, '+10');
            caught++;
            markDots();
          }

          /* THE FIFTH WORD SAYS ITS NAME TOO. Scored BEFORE the audio so we know here
             whether this was the last one, because the round has to close on the end
             of this clip rather than alongside it: SwiftPalAudio.play() stops whatever
             is playing, so finishRound() firing on the same tick cut the fifth word's
             pronunciation off the instant it began — every word was spoken except the
             one that completed the round.
             roundDone latches now so nothing else can be caught during the wait. */
          var lastOfRound = fresh && caught >= PER_ROUND;
          if (lastOfRound) { roundDone = true; paused = true; }

          if (d.id) {
            SwiftPalAudio.play('s-' + d.id, lastOfRound ? finishRound : null);
            // Floor, in case the mp3 is missing: onEnd still fires, but not if the
            // element never loads at all on some webview.
            if (lastOfRound) setTimeout(finishRound, 2600);
          } else if (lastOfRound) {
            finishRound();
          }

          /* 180ms, not 420. The word should start going IN almost at once — holding
             it on the rim for most of half a second is what made the catch feel
             detached from the basket. The confirm beat is not cut short by this:
             ckPop runs on .drop-tile and the sink runs on .drop, different elements
             by design, so the green pop simply plays while the word descends. */
          setTimeout(function () { d.el.classList.add('sink'); }, 180);
          // 180 + the 620ms sink, plus a little. Removing earlier would cut the drop
          // short — and since nothing fades any more, an early cut is a word vanishing.
          setTimeout(function () { d.el.remove(); }, 860);


        } else {
          // --- the tile-level correction (recipe 20): red border, decaying buzz,
          //     then it RELEASES. No red flood, no cross, the word stays readable. ---
          FLNMotion.wrongSelect.play(d.tile);
          // --- the basket turns red and wiggles (recipe 21). Same tempo token, so
          //     the two halves of the "no" land together. ---
          answerBasket('wrong');
          SFX.play('wrong.ogg');

          d.el.style.setProperty('--eject-dx', ((Math.random() < 0.5 ? -1 : 1) * (110 + Math.random() * 90)).toFixed(0) + 'px');
          d.el.style.setProperty('--eject-r', ((Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 22)).toFixed(0) + 'deg');
          /* Stops riding the basket the instant it is thrown out — from there it is
             airborne and must not be dragged around by the basket underneath it. */
          setTimeout(function () { d.stopCarry = true; d.el.classList.add('eject'); }, 430);
          setTimeout(function () { d.el.remove(); }, 1080);
        }
      }

      function missDrop(d) {
        d.alive = false;
        d.el.style.setProperty('--start-x', (d.x - d.w / 2) + 'px');
        d.el.style.setProperty('--start-y', d.y + 'px');
        d.el.classList.add('land');
        setTimeout(function () { d.el.remove(); }, 470);
      }

      /* Sparks thrown up out of the basket as a word lands in it. Deliberately NOT
         recipe 7's confetti: that is the end-of-activity register and firing it five
         times a round would spend it. This is small, local, and over in half a
         second — the visual half of "that one went in". */
      var SPARK_COLORS = ['#FFD93C', '#FFF3B0', '#FFFFFF', '#FFC93C', '#FFE9A3'];

      function sparkleBurst(x, y) {
        if (FLNMotion.still && FLNMotion.still()) return;   // R5 — decoration only
        var host = document.createElement('div');
        host.className = 'sparkle';
        host.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        for (var i = 0; i < 18; i++) {
          // Upper half only: sparks belong over the rim, not buried in the basket.
          var a = (-172 + Math.random() * 164) * Math.PI / 180;
          var dist = 40 + Math.random() * 78;
          var s = document.createElement('i');
          s.style.cssText =
            '--sz:' + (11 + Math.random() * 15).toFixed(1) + 'px;' +
            '--sc:' + SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)] + ';' +
            '--dx:' + (Math.cos(a) * dist).toFixed(1) + 'px;' +
            '--dy:' + (Math.sin(a) * dist - 12).toFixed(1) + 'px;' +
            '--s2:' + (0.7 + Math.random() * 0.6).toFixed(2) + ';' +
            '--r:'  + Math.round(-180 + Math.random() * 360) + 'deg;' +
            '--t:'  + (0.5 + Math.random() * 0.34).toFixed(2) + 's;';
          host.appendChild(s);
        }
        playArea.appendChild(host);
        setTimeout(function () { host.remove(); }, 1000);
      }

      function showScorePop(x, y, text) {
        var el = document.createElement('div');
        el.className = 'score-popup';
        el.textContent = text;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        playArea.appendChild(el);
        el.animate([
          { transform: 'translate(-50%, 0) scale(0.7)', opacity: 0 },
          { transform: 'translate(-50%, -10px) scale(1.15)', opacity: 1, offset: 0.2 },
          { transform: 'translate(-50%, -52px) scale(1)', opacity: 0 }
        ], { duration: 850, easing: 'ease-out', fill: 'forwards' });
        setTimeout(function () { el.remove(); }, 900);
      }

      // ============ Round bookkeeping ============
      function markDots() {
        var dots = document.querySelectorAll('#catch-track .catch-dot');
        for (var i = 0; i < dots.length; i++) {
          var on = i < caught;
          var was = dots[i].classList.contains('done');
          dots[i].classList.toggle('done', on);
          if (on && !was) {
            dots[i].classList.add('just-done');
            (function (el) { setTimeout(function () { el.classList.remove('just-done'); }, 500); })(dots[i]);
          }
        }
      }

      function resetDots() {
        var dots = document.querySelectorAll('#catch-track .catch-dot');
        for (var i = 0; i < dots.length; i++) dots[i].classList.remove('done', 'just-done');
      }

      function startRound(i, skipVo) {
        roundIdx = i;
        caught = 0;
        roundDone = false;
        finishing = false;
        pending = SwiftPalGame.shuffle(ROUNDS[i].words);
        resetDots();
        clearDrops();

        var R = ROUNDS[i];
        /* [r25 · SME] The round banner is gone. It flashed the bare matra in a white disc,
           and a bare matra is an orphan combining mark, so the font drew it as ◌ा - a
           dotted placeholder the child was being asked to read. The VO still names the
           round's matra and the header chip still carries it, so nothing is lost but the
           disc. Kept null-safe rather than chasing every reference, so putting the element
           back is the only change needed to restore it. */
        var banner = document.getElementById('round-banner');
        if (banner) {
          var rb = document.getElementById('rb-matra');
          if (rb) rb.textContent = R.matra;
          banner.classList.remove('show');
          void banner.offsetWidth;
          banner.classList.add('show');
        }

        // THE VO IS THE INSTRUCTION. Nothing on screen says it — the matra chip in
        // the header and the banner glyph are the only written cues, and both are
        // the matra itself, not a sentence. Words start falling once the clip is
        // out of the way, with a floor so a missing mp3 cannot stall the round.
        var released = false;
        function release() {
          if (released) return;
          released = true;
          paused = false;
        }
        paused = true;
        spawnTimer = 0;
        if (skipVo) {
          release();                               // the celebration clip just said it
        } else {
          SwiftPalAudio.play(R.vo, function () { setTimeout(release, 300); });
          setTimeout(release, 6000);               // hard floor if the clip is missing
        }
      }

      function levelCheer(show) {
        var el = document.getElementById('level-cheer');
        if (!el) return;
        el.classList.toggle('show', !!show);
        /* [r26 · SME] "when one matra level is done then the bird comes on the screen - don't
           show cloud and the tokri in that celebration screen." The flag rides levelCheer
           itself rather than the call sites, so the playfield is hidden for exactly as long
           as Swifty is up and comes back with the next round - including the 9s fallback
           path, which returns through levelCheer(false) too. */
        root.classList.toggle('mt-cheering', !!show);
        if (show) FLNMotion.confetti.burst({ host: '#lc-fx', count: 55, phases: [] });
      }

      function finishRound() {
        if (finishing) return;        // the fifth word's clip can end twice over
        finishing = true;
        roundDone = true;             // already true if the catch latched it
        paused = true;
        SFX.play('burst.ogg');        // the round is full — a small lift before the next one

        var more = roundIdx + 1 < ROUNDS.length;
        var went = false;
        function next() {
          if (went) return;
          went = true;
          clearDrops();
          levelCheer(false);
          // skipVo: the celebration clip has ALREADY given this round's instruction,
          // and startRound would otherwise say it a second time.
          if (more) startRound(roundIdx + 1, true);
          else endGame();
        }

        if (!more) { setTimeout(next, 700); return; }   // the win screen is its own celebration

        /* Swifty comes on and delivers one clip that both praises the round just
           finished and names the next matra. The screen stays up for exactly as long
           as the voice — which is the reason that is one clip and not two. */
        levelCheer(true);
        SwiftPalAudio.play(ROUNDS[roundIdx + 1].cheer, function () { setTimeout(next, 800); });
        setTimeout(next, 9000);                    // hard floor if the mp3 is missing
      }

      // ============ Main loop ============
      function tick(ts) {
        if (!running) return;
        if (!lastTime) lastTime = ts;
        var dt = Math.min((ts - lastTime) / 1000, 0.05);
        lastTime = ts;

        if (!paused) {
          spawnTimer += dt;
          if (spawnTimer >= SPAWN_INTERVAL) { spawnTimer = 0; spawn(); }
        }

        moveBasket(dt);

        /* Re-point everything the basket is carrying, AFTER moveBasket so it uses this
           frame's position. --catch-x is read by both .drop.caught's static transform
           and dropSink's keyframes; rewriting the custom property re-resolves the
           running animation's endpoints without restarting it, so the word keeps
           descending while tracking the basket sideways. */
        for (var c = carried.length - 1; c >= 0; c--) {
          var cd = carried[c];
          if (cd.stopCarry || !cd.el.parentNode) { carried.splice(c, 1); continue; }
          cd.el.style.setProperty('--catch-x', (basketX - cd.w / 2) + 'px');
        }

        for (var i = drops.length - 1; i >= 0; i--) {
          var d = drops[i];
          if (!d.alive) { drops.splice(i, 1); continue; }

          d.speed += GRAVITY * dt;
          d.y += d.speed * dt;

          var bottom = d.y + TILE_H;
          if (!roundDone && bottom >= CATCH_Y && bottom <= CATCH_Y + CATCH_DEPTH &&
              Math.abs(d.x - basketX) <= BASKET_CATCH_HALF) {
            catchDrop(d);
            continue;
          }
          if (bottom > CATCH_Y + CATCH_DEPTH + 6) { missDrop(d); continue; }

          positionDrop(d);
        }

        // Hesitation hint — recipe 3 is a hesitation hint before it is anything else.
        // Re-placed every frame while it is up, for two reasons: the basket is a
        // moving target, and pointAt() measures with getBoundingClientRect, so a
        // single placement taken while the stage is still settling (a resize, an
        // orientation change, the first frames after load) sticks at a stale spot
        // forever. The player is idle by definition whenever this is showing, so the
        // per-frame measure costs nothing that matters.
        if (!paused && ts - lastMoveAt > IDLE_NUDGE_MS) {
          FLNMotion.nudge.pointAt(basketEl, NUDGE_OPTS);
          nudgeShown = true;
        }

        rafId = requestAnimationFrame(tick);
      }
      var rafId = null;

      // ============ End ============
      function endGame() {
        if (ended) return;
        ended = true;
        running = false;
        clearDrops();
        FLNMotion.nudge.hide(NUDGE_OPTS);
        /* The win overlay that used to live here is GONE - it was the game's own last page, and
           this lesson already has one (the CELEBRATION slide).
           [r25 · SME] "in the celebration screen of the game we don't need bucket or any word
           cloud." clearDrops() took the falling words, but the basket, its front plate and the
           dashed catch line stayed on screen behind the confetti - and the आगे pill was drawn
           straight across the basket. Once the last word is caught this is a celebration, not a
           playfield, so .mt-ended takes the whole playfield away. */
        root.classList.add("mt-ended");
        $("stage").classList.remove("mt-play");   // hand the chrome back
        confettiCannon();
        burstStars();
        setSwMood("celebrate");
        /* [r25 · SME] "remove the next button - when the game is complete it should automatically
           go to the next page." The same contract the object-hunt screens use: the pill is hidden
           for good and the slide walks on when the cheer ends, with a hard cap so a clip that
           never fires its ended event cannot strand the child on a screen with no way out. */
        $("navBtn").style.display = "none";
        setNavActive(false);
        var moved = false;
        var go = function () {
          if (moved) return; moved = true;
          if (CARD.slides[state.idx] === slide) completeSlide(true);
        };
        play(_mtAudioSrc("vo_mt_done"), function () { setTimeout(go, 700); });
        setTimeout(go, 9000);
      }

      // ============ Title screen → Start ============
      function startGame() {
        readStageScale();
        window.addEventListener('resize', readStageScale);

        playArea   = document.getElementById('play-area');
        basketEl   = document.getElementById('basket');
        basketLift = document.getElementById('basket-lift');
        basketArt  = document.getElementById('basket-art');
        basketFrontEl   = document.getElementById('basket-front');
        basketFrontLift = document.getElementById('basket-front-lift');
        basketFrontArt  = document.getElementById('basket-front-art');

        basketX = basketTargetX = STAGE_W / 2;
        setBasketX(basketX);

        // --- Tutorial: the nudge hand rides the basket side to side, so the child
        //     sees both the gesture and the thing it moves before any word falls. ---
        var tutorialActive = true;
        var tutorialStart = performance.now();
        FLNMotion.nudge.pointAt(basketEl, NUDGE_OPTS);
        nudgeShown = true;
        SwiftPalAudio.play('vo-tutorial');   // "टोकरी को उँगली से इधर-उधर ले जाओ।"

        function tutorialAnim(now) {
          if (!tutorialActive) return;
          var elapsed = (now - tutorialStart) / 1000;
          var x = STAGE_W / 2 + 200 * Math.sin(elapsed * 2 * Math.PI / 2.2);
          basketX = basketTargetX = x;
          setBasketX(x);
          FLNMotion.nudge.pointAt(basketEl, NUDGE_OPTS);
          requestAnimationFrame(tutorialAnim);
        }
        requestAnimationFrame(tutorialAnim);

        setTimeout(function () {
          tutorialActive = false;
          FLNMotion.nudge.hide(NUDGE_OPTS);
          nudgeShown = false;

          basketX = basketTargetX = STAGE_W / 2;
          setBasketX(basketX);

          // R6 — touch listeners must be {passive:false}.
          /* On the WINDOW, not on .play-area. The basket only ever reads the pointer's
             X, but a listener scoped to the play area stopped receiving moves the
             moment the pointer crossed into the 96px header or left the stage — the
             basket froze until you wandered back, which is the "it gets stuck" feel.
             onPointerMove already clamps X to the stage, so tracking everywhere is
             safe and the basket simply keeps following. */
          window.addEventListener('pointermove', onPointerMove, { passive: false });
          window.addEventListener('pointerdown', onPointerDown, { passive: false });

          running = true;
          lastTime = 0;
          lastMoveAt = performance.now();
          rafId = requestAnimationFrame(tick);

          startRound(0);
        }, 3400);
      }


      /* the slide mount is the play button */
      FLNMotion.guard(function () { startGame(); });

      /* QA hook, same pattern as the landing's __landingTrainEnter: three rounds of five words
         is a long way to click through by hand every time the completion path is touched. */
      window.__mtFinish = function () { FLNMotion.guard(endGame); };

      window.__slideCleanup = function () {
        running = false;
        try { cancelAnimationFrame(rafId); } catch (e) {}
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('resize', readStageScale);
        _mtTimers.forEach(window.clearTimeout);
        _mtTimers.length = 0;
        if (cheerEl && cheerEl.parentNode) cheerEl.remove();   // lives on <body>, not in root
        stage.classList.remove("mt-play");
        document.body.classList.remove("mt-page");
        document.body.style.backgroundImage = "";
        window.removeEventListener("resize", paintPageEdge);
        if (root.parentNode) root.remove();
      };
  }
};

