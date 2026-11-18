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
        await pg.goto(GAME_URL); await pg.wait_for_function("window.view", timeout=60000); await pg.wait_for_timeout(500)
        await pg.evaluate("""()=>{ const V=view, E=V.ecology; V.setScale(5);
          const sp=V.walker; const w=[...E.warrens].sort((a,b)=>Math.hypot(a.x-sp.x,a.y-sp.y)-Math.hypot(b.x-sp.x,b.y-sp.y))[0];
          w.members.length=0; w.pool=90; for (const [sex,age,life] of [['F',1500,7000],['M',1200,7000],['F',90,7000],['M',100,7000],['F',300,7000],['M',6000,6500],['F',180,7000]]) { const m=new Rabbit(sex,age); m.life=life; m.food=60; w.members.push(m); }
          V.walker.x=w.x+150; V.walker.y=w.y+150; V.walker.stop(); V.eva.walker.x=w.x+170; V.eva.walker.y=w.y+150; V.eva.walker.stop();
          V.clock=200; V.panBy(0,0); V.free=true; V.freeCam={x:w.x-V.w/2, y:w.y-V.h/2+6};
          for(let i=0;i<40;i++) V.update(0.05);
          for(const a of V.rabbits.actors) a.emerge=0;
          for(let i=0;i<260;i++) V.update(0.05); }""")
        for k in range(3):
            await pg.evaluate("()=>{ for(let i=0;i<14;i++) view.update(0.05); view.render(); }")
            await pg.wait_for_timeout(100); await pg.screenshot(path=f'rabz{k}.png')
        print(await pg.evaluate("view.rabbits.actors.filter(a=>!a.inside).map(a=>a.d.sex+STAGE_ICON[a.d.stage]+':'+a.state+'/'+a.frame)"))
        print(errs); await b.close()
asyncio.run(main())
