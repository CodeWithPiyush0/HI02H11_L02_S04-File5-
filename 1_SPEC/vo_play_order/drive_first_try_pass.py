# -*- coding: utf-8 -*-
"""Play every page of the lesson and log every clip the lesson speaks, in order, with the step it
belongs to. play() is stubbed (logs, then ends after 20 ms) so a page runs through quickly.

Per page:  entry (mount -> idle)
  test pages, pass A (ladder): for every item, wrong x3 (hint 1, 2, 3) then the right answer
  test pages, pass B (first try): every item right first time (the praise lines)
Output: JSON {page: {"entry": [...], "items": [{"item":..., "miss1":[...], ...}], ...}}
"""
import json, sys, time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains

URL, OUT = sys.argv[1], sys.argv[2]
STUB = """
window.__log = [];
window.play = function(src, onEnd){ window.__log.push([state.idx, String(src).split('/').pop().split('.')[0].split('?')[0]]);
                                    if(onEnd) setTimeout(onEnd, 20); };
"""
BUSY = "return !!isPlaying || !!(state && state.revealing) || document.body.classList.contains('vo-lock');"
o = Options()
for a in ("--headless=new", "--window-size=1400,900", "--force-device-scale-factor=1",
          "--autoplay-policy=no-user-gesture-required", "--mute-audio", "--hide-scrollbars"):
    o.add_argument(a)
o.set_capability("goog:loggingPrefs", {"browser": "ALL"})
d = webdriver.Chrome(options=o); d.set_window_size(1400, 900)
J = d.execute_script

def fresh(i):
    d.get(URL + "?nav=1"); time.sleep(6)
    J(STUB)
    J("__log.length=0; const s=document.querySelector('.dev-nav-sel'); s.value=arguments[0]; s.onchange();", i)
    time.sleep(1.0); idle(quiet=3.0)
    return take(i)

def idle(limit=30.0, quiet=3.0):
    """until nothing has been said for `quiet` s and nothing is speaking or revealing"""
    t0 = time.time(); n = -1; since = time.time()
    while time.time() - t0 < limit:
        m = J("return __log.length")
        if m != n or J(BUSY): n = m; since = time.time()
        elif time.time() - since >= quiet: return
        time.sleep(0.15)

def take(i):
    v = J("const v=__log.slice(); __log.length=0; return v;")
    return [n for k, n in v if k == i]

def mount(i, wait=0.0):
    J("__log.length=0; mountSlide(arguments[0]);", i)
    pid = J("const a=CARD.slides[arguments[0]].audio||{}; return a.prompt||null;", i)
    t0 = time.time()
    while pid and time.time() - t0 < 25:
        if any(n == pid for k, n in J("return __log.slice()")): break
        time.sleep(0.2)
    time.sleep(0.5); idle(); time.sleep(wait); idle()
    return take(i)

def drag(tile, zone):
    ActionChains(d).click_and_hold(tile).pause(0.15).move_to_element(zone).pause(0.15) \
        .move_by_offset(1, 1).pause(0.1).release().perform()

def tap(el):
    ActionChains(d).move_to_element(el).click().perform()

def act(i, fn):
    fn(); time.sleep(0.4); idle(quiet=2.0)
    return take(i)

slides = J("return CARD.slides.map(s=>({id:s.id,type:s.type,data:s.data}))") if False else None
d.get(URL + "?nav=1"); time.sleep(5)
slides = J("return CARD.slides.map(s=>({id:s.id,type:s.type,data:s.data}))")
rep = {}
def coach(word):
    return J("""const w=arguments[0];
      const x=[...document.querySelectorAll('#slideHost .train-coach')].find(c=>{ const t=c.querySelector('.tr-word'); return t && ((t.dataset.mhWord||t.textContent).trim()===w); });
      return x || null;""", word)
card_el = lambda w: J("return [...document.querySelectorAll('.tr-tray .tr-card')].find(c=>c.dataset.word===arguments[0] && !c.classList.contains('snapped'));", w)
akshar_el = lambda a: J("return [...document.querySelectorAll('.wb-tray .tr-card')].find(c=>c.dataset.akshar===arguments[0] && !c.classList.contains('snapped'));", a)
blank_el = lambda k: J("return document.querySelector('#slideHost .wb-blank[data-idx=\"'+arguments[0]+'\"]');", k)
opt_el = lambda w: J("return [...document.querySelectorAll('.sc-opt')].find(b=>b.dataset.word===arguments[0]);", w)
body = lambda k: d.find_elements("css selector", "#slideHost .train-coach .coach-body")[k]
for i, s in enumerate(slides):
    t, dd, sid = s["type"], s["data"], s["id"]
    if t not in ("TRAIN_TAP", "TRAIN_SORT", "WORD_BUILD", "SENTENCE_COMPLETE") or dd.get("demo"): continue
    out = {"entry": fresh(i), "right": []}
    try:
        if t == "TRAIN_TAP":
            right = [c["word"] for c in dd["coaches"] if c["correct"]][0]
            out["right"].append({"item": right, "clips": act(i, lambda: tap(coach(right)))})
        elif t == "TRAIN_SORT":
            keys = [b["key"] for b in dd["bins"]]
            for c in dd["cards"]:
                out["right"].append({"item": c["word"], "clips": act(i, lambda c=c: drag(card_el(c["word"]), body(keys.index(c["bin"]))))})
        elif t == "WORD_BUILD":
            for k, sl in enumerate(dd["slots"]):
                out["right"].append({"item": sl["word"], "clips": act(i, lambda k=k, sl=sl: drag(akshar_el(sl["head"]), blank_el(k)))})
        elif t == "SENTENCE_COMPLETE":
            out["right"].append({"item": dd["answer"], "clips": act(i, lambda: drag(opt_el(dd["answer"]), d.find_elements("css selector", ".sc-blank")[0]))})
    except Exception as e:
        out["err"] = repr(e)[:200]
    out["tail"] = take(i)
    rep[str(i + 1)] = out
    print(i + 1, sid, out, flush=True)
json.dump(rep, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
d.quit(); print("done")
