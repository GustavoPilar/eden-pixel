"""Teste automatizado do jogo (Playwright + Chromium). Veja o README, seção "Testes"."""
import os
import pathlib

GAME_URL = (pathlib.Path(__file__).resolve().parent.parent / "index.html").as_uri()
LAUNCH = {"executable_path": os.environ["CHROME_PATH"]} if os.environ.get("CHROME_PATH") else {}

import asyncio
from playwright.async_api import async_playwright
CASES=[('Chuva',2000,1500,0.5,'rain',0.9),('Neve',1800,1000,3.5,'snow',0.8),('Nevasca',1500,700,3.5,'blizzard',1.0),('Chuva de areia',600,2400,1.5,'sand',1.0)]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        pg = await (await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(GAME_URL); await pg.wait_for_function("window.view"); await pg.wait_for_timeout(500)
        for i,(name,x,y,sp,kind,inten) in enumerate(CASES):
            r = await pg.evaluate(f"""()=>{{ const V=view; V.setScale(4); V.walker.x={x}; V.walker.y={y}; V.walker.hop=null; V.walker.stop(); V.eva.walker.x={x}+24; V.eva.walker.y={y}+6; V.eva.walker.stop();
              V.clock=(({sp}-START_SP+4)%4)*SEASON_SECONDS; V.clock=V.clock-(V.clock%DAY_SECONDS)+200;
              V.weather.kind='{kind}'; V.weather.intensity={inten}; V.weather.target={inten}; V.weather.timer=999; V.weather.announced=true;
              for(let i=0;i<40;i++){{ V.world.rebuildBudget=99; V.seasonSprites.budget=999; V.update(0.05); V.weather.intensity={inten}; V.weather.target={inten}; V.weather.timer=999; }}
              V.render(); const A=V.adamS; return {{bioma:BIOME_INFO[V.world.biomeAt(V.walker.x,V.walker.y)].name, ar:Math.round(A.ambient), vel:+V.walker.speedMul.toFixed(2), icone:document.getElementById('weatherIcon').textContent}}; }}""")
            print(name, r)
            await pg.wait_for_timeout(150); await pg.screenshot(path=f'wx{i}.png')
        print(errs); await b.close()
asyncio.run(main())
