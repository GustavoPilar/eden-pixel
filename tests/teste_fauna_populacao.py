"""Teste automatizado do jogo (Playwright + Chromium). Veja o README, seção "Testes"."""
import asyncio
import json
import os
import pathlib

from playwright.async_api import async_playwright

GAME_URL = (pathlib.Path(__file__).resolve().parent.parent / "index.html").as_uri()
LAUNCH = {"executable_path": os.environ["CHROME_PATH"]} if os.environ.get("CHROME_PATH") else {}


async def main():
    """Simula alguns anos de jogo (só a ecologia) e mostra a população de cada espécie ao longo do tempo."""
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        pg = await (await b.new_context(viewport={"width": 390, "height": 844})).new_page()
        erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)))
        await pg.goto(GAME_URL)
        await pg.wait_for_function("window.view", timeout=60000)
        anos = int(os.environ.get("ANOS", "6"))
        r = await pg.evaluate("""(anos) => { const V = view, E = V.ecology, out = { especies: {} };
          const c0 = E.census(); out.total0 = c0.total; out.grupos0 = c0.groups;
          for (const sp of Object.keys(PREY)) out.especies[sp] = { g0: c0.bySp[sp].groups, n0: c0.bySp[sp].total, serie: [] };
          for (let t = 0; t < 9600 * anos; t += 2) {
            V.clock += 2; V.world.setSeason(seasonPos(V.clock));
            E.update(2, { sp: V.world.sp, clock: V.clock, dark: darkness(hourOf(V.clock)) }); E.events.length = 0;
            if (t % 4800 === 0) { const c = E.census(); for (const sp of Object.keys(PREY)) out.especies[sp].serie.push(c.bySp[sp].total); }
          }
          const c = E.census(); out.fim = c.total; out.stats = E.stats;
          for (const sp of Object.keys(PREY)) { const s = out.especies[sp].serie, ys = s.slice(2); out.especies[sp].min = Math.min(...ys); out.especies[sp].max = Math.max(...ys); out.especies[sp].fim = c.bySp[sp].total; }
          return out; }""", anos)
        print("total inicial", r["total0"], "em", r["grupos0"], "grupos | final", r["fim"])
        print(f"{'espécie':10} {'grupos':>6} {'início':>6} {'mín':>5} {'máx':>5} {'fim':>5}  série (a cada 0,5 ano)")
        for sp, e in r["especies"].items():
            print(f"{sp:10} {e['g0']:6} {e['n0']:6} {e['min']:5} {e['max']:5} {e['fim']:5}  {e['serie']}")
        print(json.dumps(r["stats"]))
        print("erros:", erros)
        await b.close()


asyncio.run(main())
