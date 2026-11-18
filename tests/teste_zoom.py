"""Teste automatizado do jogo (Playwright + Chromium). Veja o README, seção "Testes"."""
import os
import pathlib

GAME_URL = (pathlib.Path(__file__).resolve().parent.parent / "index.html").as_uri()
LAUNCH = {"executable_path": os.environ["CHROME_PATH"]} if os.environ.get("CHROME_PATH") else {}

import asyncio, time
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        # desktop: roda
        pg = await (await b.new_context(viewport={'width':900,'height':700})).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(GAME_URL); await pg.wait_for_function("window.view"); await pg.wait_for_timeout(400)
        await pg.mouse.move(450,350)
        s0 = await pg.evaluate("view.scale")
        await pg.mouse.wheel(0,-100); await pg.wait_for_timeout(100)
        s1 = await pg.evaluate("view.scale")
        await pg.mouse.wheel(0,200); await pg.wait_for_timeout(100); await pg.mouse.wheel(0,100); await pg.wait_for_timeout(100)
        s2 = await pg.evaluate("view.scale")
        for _ in range(8): await pg.mouse.wheel(0,100); await pg.wait_for_timeout(30)
        s3 = await pg.evaluate("view.scale")
        for _ in range(12): await pg.mouse.wheel(0,-100); await pg.wait_for_timeout(30)
        s4 = await pg.evaluate("view.scale")
        print('roda: inicio',s0,'cima',s1,'baixo x2',s2,'min',s3,'max',s4)
        # desempenho no menor zoom
        await pg.evaluate("view.setScale(1)")
        t = await pg.evaluate("""()=>{ let w=0; for(let k=0;k<20;k++){ view.walker.x+=20; const a=performance.now(); view.update(0.03); view.render(); w=Math.max(w,performance.now()-a);} return w; }""")
        print('pior quadro zoom 1 (ms):', round(t,1))
        await pg.screenshot(path='z_min.png')
        # celular: pinça via CDP
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        m = await ctx.new_page()
        await m.goto(GAME_URL); await m.wait_for_function("window.view"); await m.wait_for_timeout(400)
        cdp = await ctx.new_cdp_session(m)
        box = await m.eval_on_selector('#scene','e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]}')
        cx, cy = box[0]+box[2]/2, box[1]+box[3]/2
        async def touch(t, pts): await cdp.send('Input.dispatchTouchEvent', {'type': t, 'touchPoints': pts})
        sa = await m.evaluate("view.scale")
        # afastar dedos (zoom in)
        await touch('touchStart', [{'x':cx-20,'y':cy,'id':1},{'x':cx+20,'y':cy,'id':2}])
        for k in range(1,16): await touch('touchMove', [{'x':cx-20-k*6,'y':cy,'id':1},{'x':cx+20+k*6,'y':cy,'id':2}])
        await touch('touchEnd', [])
        await m.wait_for_timeout(200)
        sb = await m.evaluate("view.scale")
        st = await m.evaluate("[Math.round(view.walker.x), view.walker.goal]")
        # juntar dedos (zoom out)
        await touch('touchStart', [{'x':cx-110,'y':cy,'id':1},{'x':cx+110,'y':cy,'id':2}])
        for k in range(1,22): await touch('touchMove', [{'x':cx-110+k*4,'y':cy,'id':1},{'x':cx+110-k*4,'y':cy,'id':2}])
        await touch('touchEnd', [])
        await m.wait_for_timeout(200)
        sc = await m.evaluate("view.scale")
        goal = await m.evaluate("view.walker.goal")
        print('pinça: inicio',sa,'abrir',sb,'fechar',sc,'| Adão recebeu destino por engano?', goal)
        await m.screenshot(path='z_pinch.png')
        print(errs)
        await b.close()
asyncio.run(main())
