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
        r = await pg.evaluate("""()=>{ const out={};
          // dura quanto o dia e a noite? (clock em passos de 1 s)
          let day=0,night=0,tr=0; for(let t=0;t<1200;t++){ const d=darkness(hourOf(t)); if(d<0.5) day++; else night++; if(d>0.02&&d<0.98) tr++; }
          out.diaSeg=day; out.noiteSeg=night; out.transicaoSeg=tr;
          out.animaisNoCodigo = typeof Fauna!=='undefined' || typeof ANIMALS!=='undefined' || !!view.fauna;
          out.horaInicial=+hourOf(view.clock).toFixed(1);
          return out; }""")
        print(r)
        hours=[12,16.5,17.5,18.5,19.5,22,5,6,7]
        for k,hh in enumerate(hours):
            await pg.evaluate(f"""()=>{{ view.setScale(4); view.clock=(({hh}-START_HOUR+24)%24)/24*DAY_SECONDS; view.update(0.05); }}""")
            await pg.wait_for_timeout(120); await pg.screenshot(path=f'dn{k}.png')
        # relógio avança sozinho?
        t0 = await pg.evaluate("view.clock")
        await pg.wait_for_timeout(1500)
        t1 = await pg.evaluate("view.clock")
        print('relógio avançou (s):', round(t1-t0,2))
        print(errs); await b.close()
asyncio.run(main())
