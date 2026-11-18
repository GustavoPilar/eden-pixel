"""Teste automatizado do jogo (Playwright + Chromium). Veja o README, seção "Testes"."""
import os
import pathlib

GAME_URL = (pathlib.Path(__file__).resolve().parent.parent / "index.html").as_uri()
LAUNCH = {"executable_path": os.environ["CHROME_PATH"]} if os.environ.get("CHROME_PATH") else {}

import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        pg = await (await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(GAME_URL); await pg.wait_for_function("window.view"); await pg.wait_for_timeout(500)
        perf = await pg.evaluate("""()=>{ const V=view; V.setScale(3); const out={}; for (const sc of [3,1]) { V.setScale(sc); for(let i=0;i<30;i++){V.update(0.05);V.render();} let tot=0,worst=0; for(let i=0;i<80;i++){ const a=performance.now(); V.update(0.05); V.render(); const d=performance.now()-a; tot+=d; worst=Math.max(worst,d);} out['zoom'+sc]={mediaMs:+(tot/80).toFixed(1), piorMs:+worst.toFixed(1)}; } V.setScale(4); return out; }""")
        print(perf)
        # quadros em tempos diferentes (vento)
        await pg.evaluate("""()=>{ const V=view; V.clock=200; V.weather.intensity=0; V.weather.target=0; V.weather.timer=999; V.walker.x=2000; V.walker.y=1500; V.walker.stop(); for(let i=0;i<40;i++) V.update(0.05); }""")
        for k in range(4):
            await pg.evaluate("()=>{ for(let i=0;i<9;i++) view.update(0.05); view.render(); }")
            await pg.screenshot(path=f'nat_w{k}.png')
        # outono (folhas) e primavera (pétalas)
        for name,sp in [('outono',2.5),('primavera',0.7)]:
            await pg.evaluate(f"""()=>{{ const V=view; V.clock=(({sp}-START_SP+4)%4)*SEASON_SECONDS; V.clock=V.clock-(V.clock%DAY_SECONDS)+200; for(let i=0;i<40;i++){{ V.world.rebuildBudget=99; V.seasonSprites.budget=999; V.update(0.05); }} V.render(); }}""")
            await pg.wait_for_timeout(100); await pg.screenshot(path=f'nat_{name}.png')
        # vento forte (tempestade de areia no deserto)
        await pg.evaluate("""()=>{ const V=view; V.walker.x=600; V.walker.y=2400; V.walker.stop(); V.clock=(((1.5)-START_SP+4)%4)*SEASON_SECONDS; V.clock=V.clock-(V.clock%DAY_SECONDS)+200; V.weather.kind='sand'; V.weather.intensity=1; V.weather.target=1; V.weather.timer=999; V.weather.announced=true; for(let i=0;i<40;i++){ V.world.rebuildBudget=99; V.seasonSprites.budget=999; V.update(0.05); V.weather.intensity=1; } V.render(); return V.wind; }""")
        print('vento na tempestade de areia:', await pg.evaluate("view.wind"))
        print(errs); await b.close()
asyncio.run(main())
