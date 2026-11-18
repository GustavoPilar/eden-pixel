"""Teste automatizado do jogo (Playwright + Chromium). Veja o README, seção "Testes"."""
import asyncio
import os
import pathlib

from playwright.async_api import async_playwright

GAME_URL = (pathlib.Path(__file__).resolve().parent.parent / "index.html").as_uri()
LAUNCH = {"executable_path": os.environ["CHROME_PATH"]} if os.environ.get("CHROME_PATH") else {}


async def main():
    """Confere que os botões de tempo e de novo mundo sumiram e que o minimapa abre o mapa completo."""
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        pg = await ctx.new_page()
        erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)))
        await pg.goto(GAME_URL)
        await pg.wait_for_function("window.view", timeout=60000)
        await pg.wait_for_timeout(500)
        botoes = await pg.evaluate("[...document.querySelectorAll('#tools button')].map(b => b.id)")
        print("botões na barra:", botoes, "| speedBtn/seasonBtn/newWorld existem?", await pg.evaluate("['speedBtn','seasonBtn','newWorld'].map(i => !!document.getElementById(i))"))
        print("mapa aberto no início?", await pg.evaluate("window.fullMap.open"))
        await pg.tap("#mini")
        await pg.wait_for_timeout(700)
        info = await pg.evaluate("""() => { const c = document.getElementById('fullMapCanvas'), r = c.getBoundingClientRect(), x = c.getContext('2d');
          const d = x.getImageData(0, 0, c.width, c.height).data; let colorido = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 60) colorido++;
          return { aberto: window.fullMap.open, visivel: getComputedStyle(document.getElementById('fullMap')).display !== 'none', largura: Math.round(r.width), altura: Math.round(r.height), pixelsColoridos: colorido, legenda: document.querySelectorAll('#mapLegend span').length }; }""")
        print("depois de tocar no minimapa:", info)
        await pg.screenshot(path="mapa_completo.png")
        await pg.tap("#mapClose")
        await pg.wait_for_timeout(300)
        print("depois do ✕, mapa aberto?", await pg.evaluate("window.fullMap.open"))
        await pg.keyboard.press("m")
        await pg.wait_for_timeout(200)
        print("tecla M abre?", await pg.evaluate("window.fullMap.open"))
        await pg.keyboard.press("Escape")
        print("Esc fecha?", not await pg.evaluate("window.fullMap.open"))
        print("erros:", erros)
        await b.close()


asyncio.run(main())
