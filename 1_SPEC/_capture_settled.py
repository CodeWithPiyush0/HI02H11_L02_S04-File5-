# -*- coding: utf-8 -*-
"""Capture every screen in its INITIAL state, with staged reveals settled.

capture_pages.py strips only the bare `.seq-hidden`; this lesson's modules use `mb-seq-hidden` and
`tr-seq-hidden`, and with 61 clips still unrecorded the audio-driven reveal chain cannot finish
inside the harness's wait (say() falls back to a 9-second timer per clip). Both together mean the
teach screens photograph half-painted. This strips every *seq-hidden variant and applies the
settled classes, so each page is shot as the child sees it once the screen has finished arriving —
and before anything has been answered.
"""
import sys, time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def _click_start(d):
    """Press शुरू करें and wait until the landing is really gone.

    ActionChains, not element.click(): the latter delivers only pointerdown under Chrome 153
    headless, so the handler never runs. Verified against the sibling build — same driver, same
    behaviour there, so it is the driver and not either lesson.

    Then poll `startGate.hidden` instead of sleeping: the handler awaits an audio warm-up (capped
    at 3s) and the phase gate holds its peek for ~2s, so any fixed sleep is a race. Polling also
    asserts the gate DID open, which is the thing every later screenshot depends on.
    """
    import time as _t
    from selenium.webdriver.common.action_chains import ActionChains as _AC
    for _ in range(80):                       # 20s: above the engine's 12s stranding backstop
        if not d.execute_script("const b=document.getElementById('sgBtn');return !b||b.disabled;"):
            break
        _t.sleep(0.25)
    else:
        raise RuntimeError("start button never became enabled - the 12s backstop did not fire")
    # THE FIRST PRESS IS NOT RELIABLE under this driver: it can deliver pointerdown alone, with
    # no mousedown and no click, so the handler never runs. A second press goes through. The
    # sibling build behaves the same, and removing the star layer / the burst handler / the new
    # disabled state each changed nothing - it is the driver. So press, watch, press again.
    for attempt in range(4):
        _AC(d).move_to_element(d.find_element("id", "sgBtn")).click().perform()
        for _ in range(24):                   # 6s per attempt
            if d.execute_script(
                    "return document.getElementById('startGate').classList.contains('hidden');"):
                return
            _t.sleep(0.25)
    raise RuntimeError("landing gate never opened after 4 presses of the start button")



URL, SHOTS = sys.argv[1], sys.argv[2]
FREEZE = ("window.play=function(s,e){ if(e) setTimeout(e,15); };"
          "var s=document.createElement('style');s.id='__cap';"
          "s.textContent='*{animation:none !important;transition:none !important;"
          "caret-color:transparent !important;}';document.head.appendChild(s);")
SETTLE = """
document.querySelectorAll('[class]').forEach(function(e){
  [...e.classList].forEach(function(c){ if(/seq-hidden$/.test(c)) e.classList.remove(c); });
});
/* [r11] MATRA_BUILD's staging is `.mb-hidden` now, not a *seq-hidden class, so the strip above
   no longer reveals it — a capture would photograph panel 1 alone and the review deck would show
   «पल» with no transformation at all. Settle it the way finish() does: every panel shown, the
   consonant lit, the slot filled, the syllable written, and the matra painted in both places.
   The `.mb-in` line it replaces targeted the previous module's DOM, which no longer exists. */
document.querySelectorAll('.mb-panel,.mb-arrow').forEach(function(e){ e.classList.remove('mb-hidden'); });
(function(){
  var row = document.querySelector('.mb-row'); if(!row) return;
  var eq = row.querySelector('.mb-eq'); if(!eq) return;
  var cons = row.querySelector('.mb-eq-line .mb-cons');
  var c = cons ? cons.textContent.trim() : '';
  var lit = row.querySelector('.mb-p1 .mb-c[data-ch="' + c + '"]');
  if(lit) lit.classList.add('lit');
  var slot = row.querySelector('.mb-slot');
  if(slot && !slot.innerHTML.trim()){
    var mk = (typeof CARD !== 'undefined' && CARD.slides[state.idx].data.matra) || '';
    slot.textContent = '\\u25cc' + mk;
  }
  if(slot){ slot.classList.remove('mb-slot-wait'); slot.classList.add('mb-slot-in'); }
  /* [S04] ो / ौ: the chip is navy and only its strokes light (matraHL mask path) */
  if(slot && typeof CARD !== 'undefined' && CARD.chip_strokes && typeof matraHLSoon === 'function' && !/[\\u0941\\u0942\\u0943]/.test(slot.textContent)
     && !slot.querySelector('.mh-ov')){
    matraHLSoon(slot, (typeof CARD !== 'undefined' && CARD.slides[state.idx].data.matra) || '', { glow:true });
  }
  var syl = row.querySelector('.mb-syl');
  if(syl && !syl.textContent.trim()){
    syl.textContent = (typeof CARD !== 'undefined' && CARD.slides[state.idx].data.syllable) || '';
  }
  if(typeof matraHLSoon === 'function'){
    var m = (typeof CARD !== 'undefined' && CARD.slides[state.idx].data.matra) || '';
    if(syl) matraHLSoon(syl, m, { glow:true });
    var res = row.querySelector('.mb-result');
    if(res) matraHLSoon(res, m, { glow:true });
  }
})();
/* [r11] आगे is ACTIVE in the state these shots are meant to show. Every teach screen unlocks it
   once its chain finishes, and that is the moment being photographed - so a greyed button in the
   review deck describes a screen the child never sees. Only the teach screens: a test screen's
   button is genuinely dead until the child answers, and forcing it there would be the same lie
   in the other direction. */
if(typeof CARD !== 'undefined' && CARD.slides[state.idx].phase === 'tutorial'
   && typeof setNavActive === 'function') setNavActive(true);
document.querySelectorAll('.mp-card,.mp-pic,.mp-callout').forEach(function(e){ e.classList.add('mp-in'); });
/* [r13] MEET_PAIR now mounts STAGED - word visible, picture held - so the settler has to finish
   it, exactly as the chain would: release the picture and light the matra. Previously the module
   faked a settled end state at mount and the chain then undid it, which is the same capture
   problem in reverse. */
document.querySelectorAll('.mp-wait').forEach(function(e){ e.classList.remove('mp-wait'); });
(function(){
  var w = document.querySelector('.mp-word');
  if(!w || w.querySelector('.mh-ov')) return;
  var ex = (typeof CARD !== 'undefined' && (CARD.slides[state.idx].data.examples || [])[0]);
  if(ex && typeof matraHLSoon === 'function') matraHLSoon(w, ex.matra, { glow:true });
})();
document.querySelectorAll('.mi-pair').forEach(function(e){ e.classList.remove('is-dim'); });
/* Page 1's pairs are held by opacity in .mp-pair and revealed by .active/.shown - NOT by a
   *seq-hidden class, so the strip above never touched them. Settle them the way the chain would
   have: every pair visible, the LAST one still lit and the earlier ones faded, which is the end
   state the deck asks for. Without this the shot catches the chain part-way and shows one pair
   where the child sees two. */
(function(){
  var ps = [...document.querySelectorAll('.mp-pair')];
  ps.forEach(function(e, k){
    /* [S04] File3 r97: at the end of the sequence BOTH pairs stay lit */
    e.classList.add('active'); e.classList.remove('shown');
    var mm = e.querySelector('.mp-matra.mp-strokes');
    if(mm && !mm.querySelector('.mh-ov') && typeof matraHLSoon === 'function')
      matraHLSoon(mm, CARD.slides[state.idx].data.pairs[k].matra, { glow:true });
    e.querySelectorAll('.mp-arrow, .mp-matra').forEach(function(x){ x.classList.add('mp-in'); });
  });
})();
"""
o = Options()
for a in ("--headless=new", "--window-size=1400,900", "--force-device-scale-factor=2",
          "--autoplay-policy=no-user-gesture-required", "--mute-audio", "--hide-scrollbars"):
    o.add_argument(a)
d = webdriver.Chrome(options=o)
d.set_window_size(1400, 900)
d.get(URL); time.sleep(2.5)
# the cover train takes 3.4s to pull in and its matras land after that; shooting
# earlier photographs an empty train, which is what the first round-3b deck did.
time.sleep(5.0)
d.execute_script(FREEZE); time.sleep(0.4)
d.save_screenshot("%s/01_landing.png" % SHOTS); print("  shot 01_landing.png")
_click_start(d); time.sleep(3.5)
d.execute_script(FREEZE)
n = d.execute_script("return CARD.slides.length")
for i in range(n):
    d.execute_script("mountSlide(arguments[0]);", i); time.sleep(6.0)   # the train takes 3.4s to pull in and park
    d.execute_script(SETTLE); time.sleep(0.35)
    t = d.execute_script("return CARD.slides[arguments[0]].type;", i)
    name = "%02d_%s.png" % (i + 2, t)
    d.save_screenshot("%s/%s" % (SHOTS, name)); print("  shot", name)
d.quit()
print("done — %d pages" % (n + 1))
