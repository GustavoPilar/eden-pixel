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
        r = await pg.evaluate("""()=>{ const V=view, out={}; V.setScale(3);
          for(let i=0;i<60;i++){ V.update(0.05); V.render(); }
          // pior quadro ao cruzar um passo visual da estação
          const k0=V.world.skey; V.clock += (SEASON_SECONDS/SEASON_STEPS); let worst=0, frames=0, tot=0;
          for(let i=0;i<60;i++){ const a=performance.now(); V.update(0.05); V.render(); const d=performance.now()-a; worst=Math.max(worst,d); tot+=d; frames++; }
          out.passoMudou = V.world.skey!==k0; out.piorQuadroMs=+worst.toFixed(1); out.mediaMs=+(tot/frames).toFixed(1);
          // 4 estações: botão de pular
          const seen=[]; for(let i=0;i<4;i++){ V.clock += SEASON_SECONDS; V.update(0.05); seen.push(SEASONS[Math.floor(V.world.sp)%4].name); }
          out.pulos=seen; out.hora=+hourOf(V.clock).toFixed(1);
          // chuva e neve: força
          V.weather.kind='rain'; V.weather.intensity=0.8; V.weather.target=0.8; V.weather.timer=99; V.render(); out.chuvaOk=true;
          V.weather.kind='snow'; V.render(); out.neveOk=true;
          // comida de época: bolota só no outono
          out.bolota=[0,1,2,3].map(s=>!!edibleNow({id:'oak',v:0},s));
          return out; }""")
        print(r); print(errs); await b.close()
asyncio.run(main())
