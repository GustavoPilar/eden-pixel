"""Teste automatizado do jogo (Playwright + Chromium). Veja o README, seção "Testes"."""
import os
import pathlib

GAME_URL = (pathlib.Path(__file__).resolve().parent.parent / "index.html").as_uri()
LAUNCH = {"executable_path": os.environ["CHROME_PATH"]} if os.environ.get("CHROME_PATH") else {}

import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        pg = await (await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(GAME_URL); await pg.wait_for_function("window.view", timeout=60000); await pg.wait_for_timeout(500)
        r = await pg.evaluate("""()=>{ const V=view, E=V.ecology; const out={};
          const c0=E.census(); out.inicio={tocas:c0.warrens, coelhos:c0.total, fases:c0.stages};
          // ~3 anos de jogo (3 * 9600 s), passo de 1 s, só a ecologia
          const series=[]; let t=0; const total=9600*6;
          for(; t<total; t++){ V.clock+=1; V.world.setSeason(seasonPos(V.clock)); E.update(1,{sp:V.world.sp, clock:V.clock, dark: darkness(hourOf(V.clock))}); E.events.length=0;
            if (t%3200===0){ const c=E.census(); series.push([t, c.total, c.stages.join('/'), c.warrens, c.empty, Math.round(c.pool)]); } }
          out.serie=series; const c=E.census(); out.fim={coelhos:c.total, fases:c.stages, tocas:c.warrens, vazias:c.empty}; out.stats=E.stats;
          return out; }""")
        print(json.dumps(r, ensure_ascii=False))
        print(errs); await b.close()
asyncio.run(main())
