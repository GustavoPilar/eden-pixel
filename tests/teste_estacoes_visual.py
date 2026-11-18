"""Teste automatizado do jogo (Playwright + Chromium). Veja o README, seção "Testes"."""
import os
import pathlib

GAME_URL = (pathlib.Path(__file__).resolve().parent.parent / "index.html").as_uri()
LAUNCH = {"executable_path": os.environ["CHROME_PATH"]} if os.environ.get("CHROME_PATH") else {}

import asyncio
from playwright.async_api import async_playwright
LOCS=[('Floresta',2000,1500),('Campo',1500,1100),('Taiga',1800,1000),('Tundra',1500,700),('Deserto',600,2400),('Selva',3400,2300)]
SP=[0.5,1.5,2.5,3.5]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        pg = await (await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(GAME_URL); await pg.wait_for_function("window.view", timeout=60000); await pg.wait_for_timeout(400)
        info={}
        for li,(name,x,y) in enumerate(LOCS):
            await pg.evaluate(f"(()=>{{ const V=view; V.walker.x={x}; V.walker.y={y}; V.walker.hop=null; V.walker.stop(); V.eva.walker.x={x}+24; V.eva.walker.y={y}+6; V.eva.walker.stop(); }})()")
            for si,sp in enumerate(SP):
                r = await pg.evaluate(f"""()=>{{ const V=view; V.clock=(({sp}-START_SP+4)%4)*SEASON_SECONDS - 0 + 0; V.clock = V.clock - (V.clock % DAY_SECONDS) + 200; document.getElementById('alertToast').hidden=true;
                  for(let i=0;i<30;i++){{ V.world.rebuildBudget=99; V.update(0.05); }} V.world.rebuildBudget=99; V.render(); document.getElementById('alertToast').hidden=true;
                  return {{sp:+V.world.sp.toFixed(2), tFreeze:+V.world.tFreeze.toFixed(2), bioma:BIOME_INFO[V.world.biomeAt(V.walker.x,V.walker.y)].name, ar:Math.round(V.adamS.ambient)}}; }}""")
                info[(name,si)]=r
                await pg.wait_for_timeout(120)
                await pg.screenshot(path=f'se_{li}_{si}.png')
        for k,v in info.items(): print(k,v)
        print(errs); await b.close()
asyncio.run(main())
