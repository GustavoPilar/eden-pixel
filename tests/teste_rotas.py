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
        pg = await (await b.new_context(viewport={'width':390,'height':844})).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(GAME_URL)
        await pg.wait_for_function("window.view")
        res = await pg.evaluate("""()=>{
          const W=view.world; const out=[]; let seed=12345; const rnd=()=>{seed=(seed*1664525+1013904223)%4294967296; return seed/4294967296;};
          const regions=[[2000,1500,'centro'],[600,2300,'deserto'],[3300,2300,'selva'],[2000,500,'gelo'],[1500,1100,'campo/lagos']];
          for (const [rx,ry,name] of regions) {
            let ok=0, partial=0, stuck=0, bad=0, ms=0, n=0;
            for (let k=0;k<14;k++) {
              let sx,sy,tries=0; do { sx=rx+(rnd()-0.5)*500; sy=ry+(rnd()-0.5)*400; tries++; } while(!W.canStand(sx,sy) && tries<80);
              const ang=rnd()*6.28, len=100+rnd()*160;
              const gx=sx+Math.cos(ang)*len, gy=sy+Math.sin(ang)*len;
              const wk=new HopWalker(sx,sy,W); const t0=performance.now(); wk.goTo(gx,gy);
              let sim=0, lastMove=0, px=sx, py=sy, inside=false;
              while(sim<150){ wk.update(0.05); sim+=0.05; if(!W.canStand(wk.x,wk.y)) inside=true; if(Math.hypot(wk.x-px,wk.y-py)>0.5){px=wk.x;py=wk.y;lastMove=sim;} if(!wk.goal && !wk.hop) break; if(sim-lastMove>6) break; }
              ms+=performance.now()-t0; n++;
              const d=Math.hypot(wk.x-gx,wk.y-gy);
              if (inside) bad++;
              if (wk.goal) stuck++; else if (d<10) ok++; else partial++;
            }
            out.push(`${name}: chegou ${ok}/${n}, parou perto (destino inalcançável) ${partial}, travou ${stuck}, entrou em obstáculo ${bad}, ${(ms/n).toFixed(0)} ms por viagem (cpu)`);
          }
          return out;
        }""")
        print('\n'.join(res)); print(errs)
        await b.close()
asyncio.run(main())
