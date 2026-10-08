# -*- coding: utf-8 -*-
"""Play «मात्रा टोकरी» end to end in a headless browser: arrive from page 16 through the
«अब आपकी बारी!» gate, watch the tutorial, then steer the basket under the right words for both
rounds (and one wrong word on purpose), and follow it into the celebration.

    PYTHONUTF8=1 python 1_SPEC/_drive_tokri.py <url> <shots_dir>
"""
import sys, time, json, os, wave, contextlib
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains

URL, SHOTS = sys.argv[1], sys.argv[2]
o = Options()
for a in ("--headless=new", "--window-size=1400,900", "--autoplay-policy=no-user-gesture-required",
          "--mute-audio", "--hide-scrollbars"):
    o.add_argument(a)
o.set_capability("goog:loggingPrefs", {"browser": "ALL"})
d = webdriver.Chrome(options=o)
d.set_window_size(1400, 900)
d.get(URL); time.sleep(4)
for _ in range(80):
    if not d.execute_script("const b=document.getElementById('sgBtn');return !b||b.disabled;"): break
    time.sleep(0.25)
for _ in range(4):
    ActionChains(d).move_to_element(d.find_element("id", "sgBtn")).click().perform(); time.sleep(3)
    if d.execute_script("return document.getElementById('startGate').classList.contains('hidden');"): break
# clips "play" for their REAL length (read from the files) and are logged
BUNDLE = os.environ.get("BUNDLE", "")
dur = {}
for vid, rel in d.execute_script("return CARD.assets.audio").items():
    try:
        with contextlib.closing(wave.open(os.path.join(BUNDLE, rel))) as w:
            dur[vid] = int(1000 * w.getnframes() / w.getframerate())
    except Exception:
        dur[vid] = 1200
d.execute_script("window.__dur=arguments[0];window.__log=[];window.play=function(s,e){const id=String(s).split('/').pop().split('.')[0];"
                 "__log.push(id);try{isPlaying=true;}catch(x){} setTimeout(function(){try{isPlaying=false;}catch(x){} if(e)e();},__dur[id]||1200);};", dur)
idx = d.execute_script("return CARD.slides.findIndex(s=>s.type==='MATRA_TOKRI')") - 1
d.execute_script("mountSlide(arguments[0])", idx); time.sleep(2)
d.execute_script("window.__log=[]; completeSlide(true);")
# the gate
gate = None
for _ in range(60):
    time.sleep(0.25)
    g = d.execute_script("const t=document.getElementById('phaseGateTitle');const pg=document.getElementById('phaseGate');"
                         "return pg && !pg.hidden && getComputedStyle(pg).display!=='none' ? (t?t.textContent:'?') : null;")
    if g: gate = g; break
time.sleep(2.5); d.save_screenshot(SHOTS + "/t0_gate.png")
for _ in range(80):
    time.sleep(0.25)
    if d.execute_script("return CARD.slides[state.idx].type") == "MATRA_TOKRI" and d.execute_script(
            "return !!document.querySelector('.mt-game')"):
        break
print("gate text:", gate, "| now on:", d.execute_script("return CARD.slides[state.idx].id"))
time.sleep(1.5); d.save_screenshot(SHOTS + "/t1_tutorial.png")

ROUND_MATRA = os.environ.get("MATRAS", "ो,ौ").split(",")


def stage_px(x):
    return d.execute_script("const r=document.querySelector('.stage').getBoundingClientRect();"
                            "const s=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale'))||1;"
                            "return r.left + arguments[0]*s;", x)


def move_to(x):
    d.execute_script("window.dispatchEvent(new PointerEvent('pointermove',{clientX:arguments[0],clientY:500,bubbles:true}));",
                     stage_px(x))


t0 = time.time(); wrong_done = False; shots = set(); rnd = 0; events = []; was_cheer = False
while time.time() - t0 < 240:
    st = d.execute_script("""
      if(CARD.slides[state.idx].type !== 'MATRA_TOKRI') return {left:CARD.slides[state.idx].id};
      const dots=[...document.querySelectorAll('#catch-track .catch-dot.done')].length;
      const cheer=document.getElementById('level-cheer'); const g=document.querySelector('.mt-game');
      const drops=[...document.querySelectorAll('.mt-game .drop')].filter(e=>!e.classList.contains('caught')
              && !e.classList.contains('land') && !e.classList.contains('eject')).map(e=>{
          const m=/translate\\(([-\\d.]+)px,\\s*([-\\d.]+)px/.exec(e.style.transform||'');
          return m?{w:e.textContent.trim(),x:+m[1]+102,y:+m[2]}:null}).filter(Boolean);
      return {dots, cheer: !!(cheer && cheer.classList.contains('show')),
              ended: !!(g && g.classList.contains('mt-ended')), drops};""")
    if "left" in st:
        events.append("left the game -> " + st["left"]); break
    if st["cheer"]:
        if not was_cheer:                          # each cheer = the next round
            rnd = min(rnd + 1, len(ROUND_MATRA) - 1); events.append("round cheer -> round %d" % (rnd + 1))
            if "cheer" not in shots:
                time.sleep(0.6); d.save_screenshot(SHOTS + "/t3_round_cheer.png"); shots.add("cheer")
        was_cheer = True
        time.sleep(0.2); continue
    was_cheer = False
    if st["ended"] and "end" not in shots:
        time.sleep(0.8); d.save_screenshot(SHOTS + "/t5_win.png"); shots.add("end")
    m = ROUND_MATRA[rnd]
    want = [x for x in st["drops"] if m in x["w"]]
    if not wrong_done:
        bad = [x for x in st["drops"] if m not in x["w"] and x["y"] > 250]
        if bad:
            move_to(bad[0]["x"]); events.append("steer under WRONG word " + bad[0]["w"])
            time.sleep(1.6); d.save_screenshot(SHOTS + "/t2_wrong_catch.png"); wrong_done = True
            continue
    if want:
        target = max(want, key=lambda x: x["y"])
        move_to(target["x"])
    if st["dots"] >= 3 and rnd == 1 and "mid2" not in shots:
        d.save_screenshot(SHOTS + "/t4_round2.png"); shots.add("mid2")
    time.sleep(0.12)

time.sleep(3)
log = d.execute_script("return window.__log")
print("events:", events)
print("clips:", " ".join(c for c in log if c.startswith("vo_mt") or c.startswith("vo_cel")))
print("now on:", d.execute_script("return CARD.slides[state.idx].id"))
d.save_screenshot(SHOTS + "/t6_after.png")
errs = [l["message"][:220] for l in d.get_log("browser") if l["level"] == "SEVERE"]
print("severe console:", errs)
d.quit()
