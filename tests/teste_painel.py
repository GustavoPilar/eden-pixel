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
        await pg.goto(GAME_URL); await pg.wait_for_function("window.view"); await pg.wait_for_timeout(600)
        await pg.screenshot(path='lay4a.png')
        info = await pg.evaluate("()=>{ const r=document.getElementById('vitals').getBoundingClientRect(); const e=document.getElementById('vitals'); return [Math.round(r.width), Math.round(r.height), e.scrollWidth, e.clientWidth]; }")
        await pg.evaluate("""()=>{ const V=view; V.weather.kind='rain'; V.weather.intensity=0.8; V.weather.target=0.8; V.weather.timer=999; V.weather.announced=true; V.adamS.startAction('drink',99,{}); V.adamS.water=20; V.adamS.temp=34.6; V.adamS.health=100; V.hudT=0; for(let i=0;i<10;i++){V.update(0.05); V.weather.intensity=0.8;} }""")
        await pg.wait_for_timeout(300); await pg.screenshot(path='lay4b.png')
        info2 = await pg.evaluate("()=>{ const r=document.getElementById('vitals').getBoundingClientRect(); const e=document.getElementById('vitals'); return [Math.round(r.width), Math.round(r.height), e.scrollWidth, e.clientWidth]; }")
        print('normal (largura,altura):', info, '| com chuva+ação+frio:', info2)
        print(errs); await b.close()
asyncio.run(main())
