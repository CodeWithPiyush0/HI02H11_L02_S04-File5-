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

# ---- the start screen and the first transition, with the real play() logged
d.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {"source": """
  window.__real=[]; addEventListener('DOMContentLoaded', ()=>{ const P=window.play;
    window.play=function(src,cb){ window.__real.push(String(src).split('/').pop().split('.')[0].split('?')[0]); return P.apply(this, arguments); }; });"""})
d.get(URL); time.sleep(3)
ActionChains(d).move_by_offset(30, 30).click().perform()          # first tap: the greeting
for _ in range(300):
    if J("return !!document.querySelector('.lt-play-shown')"): break
    time.sleep(0.1)
start_clips = J("return __real.slice()")
J("__real.length=0")
# [S04] the first press is not always delivered under headless Chrome - press until the gate opens
for _ in range(20):
    try: ActionChains(d).move_to_element(d.find_element("id", "sgBtn")).click().perform()
    except Exception: pass
    for _ in range(20):
        if J("return document.getElementById('startGate').classList.contains('hidden')"): break
        time.sleep(0.1)
    if J("return document.getElementById('startGate').classList.contains('hidden')"): break
if not J("return document.getElementById('startGate').classList.contains('hidden')"):
    raise SystemExit("start gate never opened")
gate1 = J("return __real.slice()")
time.sleep(2)
J(STUB)

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

def fresh(i):
    """[S04] a question page on a freshly loaded lesson (the dev menu's jump), as the first-try pass
    does: mounted one after another in one session, the tap / word-build pages lost their coaches"""
    d.get(URL + "?nav=1"); time.sleep(6)
    J(STUB)
    J("__log.length=0; const s=document.querySelector('.dev-nav-sel'); s.value=arguments[0]; s.onchange();", i)
    time.sleep(1.0); idle(quiet=3.0)
    return take(i)

def drag(tile, zone):
    ActionChains(d).click_and_hold(tile).pause(0.15).move_to_element(zone).pause(0.15) \
        .move_by_offset(1, 1).pause(0.1).release().perform()

def tap(el):
    ActionChains(d).move_to_element(el).click().perform()

def act(i, fn):
    fn(); time.sleep(0.4); idle(quiet=2.0)
    return take(i)

slides = J("return CARD.slides.map(s=>({id:s.id,type:s.type,data:s.data}))")
rep = {"start": start_clips, "gate_tutorial": gate1, "pages": {}, "errors": []}

def coach(word):
    return J("""const w=arguments[0];
      const x=[...document.querySelectorAll('#slideHost .train-coach')].find(c=>{ const t=c.querySelector('.tr-word'); return t && ((t.dataset.mhWord||t.textContent).trim()===w); });
      return x || null;""", word)
card_el = lambda w: J("return [...document.querySelectorAll('.tr-tray .tr-card')].find(c=>c.dataset.word===arguments[0]);", w)
akshar_el = lambda a: J("return [...document.querySelectorAll('.wb-tray .tr-card')].find(c=>c.dataset.akshar===arguments[0] && !c.classList.contains('snapped'));", a)
blank_el = lambda k: J("return document.querySelector('#slideHost .wb-blank[data-idx=\"'+arguments[0]+'\"]');", k)
opt_el = lambda w: J("return [...document.querySelectorAll('.sc-opt')].find(b=>b.dataset.word===arguments[0]);", w)
body = lambda k: d.find_elements("css selector", "#slideHost .train-coach .coach-body")[k]

for i, s in enumerate(slides):
    t, dd, sid = s["type"], s["data"], s["id"]
    pg = {"id": sid, "type": t, "entry": [], "items": [], "first_try": []}
    try:
        if t == "TRAIN_SORT" and dd.get("demo"):
            J("__log.length=0; mountSlide(arguments[0]);", i)
            t0 = time.time()
            while time.time() - t0 < 40 and J("return state.idx") == i: time.sleep(0.2)
            time.sleep(0.5)
            pg["entry"] = [n for k, n in J("return __log.slice()") if k == i]
            pg["note"] = "watch-only; moved on to page %d by itself" % (J("return state.idx") + 1)
        elif t == "MINI_GAME":
            J("__log.length=0; mountSlide(arguments[0]);", i); time.sleep(6)
            pg["entry"] = take(i)
        elif t in ("TRAIN_TAP", "TRAIN_SORT", "WORD_BUILD", "SENTENCE_COMPLETE"):
            pg["entry"] = fresh(i)
        else:
            pg["entry"] = mount(i, 1.0 if t in ("MATRA_PAIRS", "MATRA_BUILD", "MEET_PAIR", "CELEBRATION") else 0)
        if t == "TRAIN_TAP":
            wrong = [c["word"] for c in dd["coaches"] if not c["correct"]]
            right = [c["word"] for c in dd["coaches"] if c["correct"]][0]
            seq = [wrong[0], wrong[-1], wrong[0]]
            it = {"item": right}
            for k, w in enumerate(seq): it["miss%d" % (k + 1)] = act(i, lambda w=w: tap(coach(w)))
            it["right_after_hints"] = act(i, lambda: tap(coach(right)))
            pg["items"].append(it)
            fresh(i)
            pg["first_try"].append({"item": right, "right": act(i, lambda: tap(coach(right)))})
        elif t == "TRAIN_SORT" and not dd.get("demo"):
            keys = [b["key"] for b in dd["bins"]]
            for c in dd["cards"]:
                it = {"item": c["word"]}
                wi = 1 - keys.index(c["bin"])
                for k in range(3): it["miss%d" % (k + 1)] = act(i, lambda c=c: drag(card_el(c["word"]), body(wi)))
                it["right_after_hints"] = act(i, lambda c=c: drag(card_el(c["word"]), body(keys.index(c["bin"]))))
                pg["items"].append(it)
            pg["after_last"] = take(i)
            fresh(i)
            for c in dd["cards"]:
                pg["first_try"].append({"item": c["word"], "right": act(i, lambda c=c: drag(card_el(c["word"]), body(keys.index(c["bin"]))))})
        elif t == "WORD_BUILD":
            heads = [sl["head"] for sl in dd["slots"]]
            for k, sl in enumerate(dd["slots"]):
                it = {"item": sl["word"]}
                wrong = [o_["akshar"] for o_ in dd["options"] if o_["akshar"] != sl["head"] and
                         J("return !!arguments[0]", akshar_el(o_["akshar"]))]
                if wrong:
                    for m in range(3): it["miss%d" % (m + 1)] = act(i, lambda k=k, w=wrong[0]: drag(akshar_el(w), blank_el(k)))
                it["right_after_hints"] = act(i, lambda k=k, sl=sl: drag(akshar_el(sl["head"]), blank_el(k)))
                pg["items"].append(it)
            pg["after_last"] = take(i)
            fresh(i)
            for k, sl in enumerate(dd["slots"]):
                pg["first_try"].append({"item": sl["word"], "right": act(i, lambda k=k, sl=sl: drag(akshar_el(sl["head"]), blank_el(k)))})
        elif t == "SENTENCE_COMPLETE":
            wrong = [o_["word"] for o_ in dd["options"] if o_["word"] != dd["answer"]]
            seq = [wrong[0], wrong[-1], wrong[0]]
            it = {"item": dd["answer"]}
            for k, w in enumerate(seq): it["miss%d" % (k + 1)] = act(i, lambda w=w: drag(opt_el(w), d.find_elements("css selector", ".sc-blank")[0]))
            it["right_after_hints"] = act(i, lambda: drag(opt_el(dd["answer"]), d.find_elements("css selector", ".sc-blank")[0]))
            pg["items"].append(it)
            fresh(i)
            pg["first_try"].append({"item": dd["answer"], "right": act(i, lambda: drag(opt_el(dd["answer"]), d.find_elements("css selector", ".sc-blank")[0]))})
    except Exception as e:
        rep["errors"].append("%s: %r" % (sid, e)); print(sid, "ERR", repr(e)[:200])
    rep["pages"][str(i + 1)] = pg
    print(i + 1, sid, "entry", pg["entry"])

# ---- the other two transitions, real play() order
for ph in ("guided", "practice"):
    J("__log.length=0; phaseBlurTransition(()=>{}, arguments[0]);", ph); time.sleep(3); idle()
    rep["gate_" + ph] = [n for k, n in J("return __log.slice()")]
rep["console"] = [l["message"][:200] for l in d.get_log("browser") if l["level"] == "SEVERE"]
json.dump(rep, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
d.quit(); print("done")
