# Renders thumbnails of built pages into src/assets (run after build, with dist served or via file://).
import os,sys
from playwright.sync_api import sync_playwright
D=os.path.join(os.path.dirname(__file__),"..","dist")
T=[("dashboard","dashboard/app.html"),("tui","tui/index.html"),("sim","simulator/index.html")]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args=["--no-sandbox"])
    pg=b.new_page(viewport={"width":1280,"height":800})
    for k,f in T:
        fp=os.path.abspath(os.path.join(D,f))
        if not os.path.exists(fp): print("skip",k); continue
        pg.goto("file://"+fp); pg.wait_for_timeout(12000)
        pg.screenshot(path=os.path.join(os.path.dirname(__file__),"..","src","assets",f"thumb-{k}.png")); print("ok",k)
    b.close()
