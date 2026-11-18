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
        await pg.goto(GAME_URL); await pg.wait_for_function("window.view"); await pg.wait_for_timeout(400)
        r = await pg.evaluate("""()=>{ view.setScale(4); const A=view.walker, E=view.eva.walker; const out={};
          const dist=()=>Math.hypot(A.x-E.x,A.y-E.y);
          let sum=0,max=0,n=0,moved=0,lx=E.x,ly=E.y;
          for(let i=0;i<1200;i++){ view.update(0.05); const d=dist(); sum+=d; max=Math.max(max,d); n++; moved+=Math.hypot(E.x-lx,E.y-ly); lx=E.x; ly=E.y; }
          out.parada={media:Math.round(sum/n),maxima:Math.round(max),andouPx:Math.round(moved)};
          // Adão vai para longe: Eva deve alcançar
          A.x+=400; A.y+=80; A.hop=null; A.stop(); const d0=dist(); let t=0;
          for(let i=0;i<1200;i++){ view.update(0.05); t+=0.05; if(dist()<70) break; }
          out.alcance={distInicial:Math.round(d0),segundos:+t.toFixed(1),distFinal:Math.round(dist())};
          // com casa: livre, não segue
          view.eva.setHome(E.x,E.y); A.x+=500; let far=0; for(let i=0;i<800;i++){ view.update(0.05); far=Math.max(far,Math.hypot(E.x-view.eva.home.x,E.y-view.eva.home.y)); }
          out.comCasa={afastouDaCasaMax:Math.round(far), distAdao:Math.round(dist())};
          view.eva.home=null; return out; }""")
        print(r)
        await pg.evaluate("""()=>{ const A=view.walker,E=view.eva.walker; E.x=A.x+22; E.y=A.y+4; E.stop(); E.hop=null; for(let i=0;i<6;i++) view.update(0.05); }""")
        await pg.wait_for_timeout(300); await pg.screenshot(path='eva_game.png')
        pos = await pg.evaluate("""()=>{ const r=view.canvas.getBoundingClientRect(), q=view.evaRect; return [r.left+(q.x+q.w/2)*view.scale, r.top+(q.y+q.h/2)*view.scale]; }""")
        await pg.mouse.click(pos[0],pos[1]); await pg.wait_for_timeout(250)
        print('rótulo:', await pg.evaluate("[...document.querySelectorAll('#pops .pop')].map(e => e.textContent).pop()"), '| Adão recebeu destino?', await pg.evaluate("view.walker.goal"))
        await pg.screenshot(path='eva_game2.png')
        print(errs); await b.close()
asyncio.run(main())
