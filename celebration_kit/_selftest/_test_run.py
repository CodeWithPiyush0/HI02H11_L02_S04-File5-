import os, sys, time, threading, http.server, socketserver, functools
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # kit root
class TS(socketserver.ThreadingMixIn, socketserver.TCPServer): daemon_threads = True; allow_reuse_address = True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = TS(("127.0.0.1", 0), functools.partial(Q, directory=ROOT)); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
o = Options(); o.add_argument("--headless=new"); o.add_argument("--window-size=800,600"); o.add_argument("--autoplay-policy=no-user-gesture-required")
d = webdriver.Chrome(options=o); d.get("http://127.0.0.1:%d/_selftest/_test.html" % port); time.sleep(2)
js = d.execute_script
js("""window.__log=[]; __go(); (function rec(){ const sp=document.querySelector('.swc-sprite'); if(sp && sp.dataset.f)
  window.__log.push([+(sp.dataset.t||0), sp.dataset.sheet, +sp.dataset.f, (!__au.paused && !__au.ended)?1:0]); requestAnimationFrame(rec); })();""")
time.sleep(0.8); d.save_screenshot(sys.argv[1] + "_jump.png"); time.sleep(8)
log = js("return __log"); M = js("return __meta"); bits = js("return __bits")
OPEN = set(M["talk"]["open"]); vo = [x for x in log if x[3] == 1]
tk = [(t, f) for t, s, f, p in vo if s == "talk"]
ok = sum(1 for t, f in tk if (f in OPEN) == (bits[min(len(bits) - 1, (t + 16) // 25)] == "1"))   # the player leads by 16 ms
near = lambda t: len({bits[max(0, min(len(bits) - 1, (t + w) // 25))] for w in (-25, 0, 25)}) > 1
bad = [(t, f) for t, f in tk if (f in OPEN) != (bits[min(len(bits) - 1, t // 25)] == "1")]
print("sheets:", [k for i, k in enumerate(x[1] for x in log) if i == 0 or k != log[i - 1][1]])
print("TALK %d samples, mouth = VO %.1f%%, misses not at a syllable edge: %s" % (len(tk), 100.0 * ok / max(1, len(tk)), [x for x in bad if not near(x[0])]))
print("errors:", [l["message"] for l in d.get_log("browser") if l["level"] == "SEVERE"])
d.quit(); srv.shutdown()
