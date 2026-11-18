"""Teste automatizado do jogo (Playwright + Chromium). Veja o README, seção "Testes"."""
import asyncio
import os
import pathlib

from playwright.async_api import async_playwright

GAME_URL = (pathlib.Path(__file__).resolve().parent.parent / "index.html").as_uri()
LAUNCH = {"executable_path": os.environ["CHROME_PATH"]} if os.environ.get("CHROME_PATH") else {}


async def main():
    """Leva a câmera até um grupo de cada espécie, ao meio-dia, e confere que os animais aparecem e se comportam."""
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        pg = await (await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True, is_mobile=True)).new_page()
        erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)))
        await pg.goto(GAME_URL)
        await pg.wait_for_function("window.view", timeout=60000)
        especies = await pg.evaluate("Object.keys(PREY)")
        for i, sp in enumerate(especies):
            r = await pg.evaluate("""(sp) => { const V = view, E = V.ecology; V.setScale(4);
              const gs = E.groups.filter(g => g.sp === sp && g.members.length >= 3).sort((a, b) => b.members.length - a.members.length);
              if (!gs.length) return { sp, erro: 'sem grupo' };
              const g = gs[0];
              const base = ((0.6 - START_SP + 4) % 4) * SEASON_SECONDS;   // primavera
              V.clock = base - (base % DAY_SECONDS) + 200;                // meio-dia
              V.walker.x = g.x + 220; V.walker.y = g.y + 220; V.walker.stop(); V.eva.walker.x = g.x + 240; V.eva.walker.y = g.y + 220; V.eva.walker.stop();
              for (const m of g.members) { m.food = 70; }
              V.free = true; V.freeCam = { x: g.x - V.w / 2, y: g.y - V.h / 2 + 8 };
              for (let k = 0; k < 40; k++) { V.world.rebuildBudget = 99; V.seasonSprites.budget = 999; V.update(0.05); }
              for (const a of V.fauna.actors) a.emerge = 0;
              for (let k = 0; k < 160; k++) V.update(0.05);
              V.render();
              const vis = V.fauna.actors.filter(a => a.g === g && !a.inside && a.rect);
              return { sp, membros: g.members.length, visiveis: vis.length, estados: vis.map(a => a.state + '/' + a.frame).slice(0, 4), bioma: BIOME_INFO[V.world.biomeAt(g.x, g.y)].name }; }""", sp)
            print(r)
            await pg.wait_for_timeout(120)
            await pg.screenshot(path=f"fauna_{i:02d}_{sp}.png")
        print("erros:", erros)
        await b.close()


asyncio.run(main())
