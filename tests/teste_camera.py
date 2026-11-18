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
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)
        pg = await ctx.new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(GAME_URL)
        await pg.wait_for_function("window.view")
        await pg.wait_for_timeout(500)
        st = lambda: pg.evaluate("[Math.round(view.walker.x),Math.round(view.walker.y), view.free, view.camera().x, view.camera().y, !!view.walker.target, document.getElementById('follow').hidden]")
        print('inicio', await st())
        box = await pg.eval_on_selector('#scene','e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]}')
        cx, cy = box[0]+box[2]/2, box[1]+box[3]/2
        # arrastar
        await pg.mouse.move(cx, cy); await pg.mouse.down(); 
        for k in range(1,13): await pg.mouse.move(cx+k*10, cy+k*14)
        await pg.mouse.up()
        await pg.wait_for_timeout(400)
        print('depois de arrastar', await st())
        await pg.screenshot(path='pan1.png')
        # toque curto: manda o Adão
        await pg.mouse.click(cx-60, cy+60)
        await pg.wait_for_timeout(1500)
        print('depois do toque', await st())
        await pg.screenshot(path='pan2.png')
        # arrasta bastante para ele sair da tela
        await pg.mouse.move(cx, cy); await pg.mouse.down()
        for k in range(1,40): await pg.mouse.move(cx+k*8, cy)
        await pg.mouse.up(); await pg.wait_for_timeout(400)
        await pg.screenshot(path='pan3.png')
        print('longe', await st())
        await pg.click('#follow'); await pg.wait_for_timeout(400)
        print('seguindo', await st())
        await pg.screenshot(path='pan4.png')
        print(errs)
        await b.close()
asyncio.run(main())
