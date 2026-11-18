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
        r = await pg.evaluate("""()=>{ const V=view, A=V.adamS, E=V.evaS, out={}; V.setScale(4);
          const snap=(s)=>({comida:+s.food.toFixed(1),agua:+s.water.toFixed(1),temp:+s.temp.toFixed(2),energia:+s.energy.toFixed(1),saude:+s.health.toFixed(1)});
          out.inicio=snap(A);
          // 60 s parado, sem fazer nada
          for(let i=0;i<1200;i++) V.update(0.05);
          out.apos60s=snap(A); out.hora=+hourOf(V.clock).toFixed(1); out.ar=Math.round(A.ambient);
          // beber: acha um lago perto e manda o Adão
          const lake=findLake(V.world,V.walker.x,V.walker.y,400);
          out.lago=!!lake;
          if(lake){ V.intent={type:'drink'}; V.walker.goTo(lake.x,lake.y); let t=0; while(t<60 && !(A.action&&A.action.type==='drink')){ V.update(0.05); t+=0.05; } out.chegouParaBeber=+t.toFixed(1); const w0=A.water; for(let i=0;i<80;i++) V.update(0.05); out.aguaAntes=+w0.toFixed(1); out.aguaDepois=+A.water.toFixed(1); }
          return out; }""")
        print(r)
        r2 = await pg.evaluate("""()=>{ const V=view, A=V.adamS, out={}; 
          // colher: acha planta comestível por perto
          let tgt=null; for (const [x,y] of [[2000,1500],[2300,1450],[1800,1300],[2100,1700]]) { V.walker.x=x; V.walker.y=y; V.walker.stop(); for(let i=0;i<40;i++) V.update(0.05); const ps=V.world.plantsIn(x-150,y-150,x+150,y+150).filter(p=>edibleOf(p)&&!isPoison(p)); if(ps.length){ tgt=ps[0]; break; } }
          out.planta=tgt?tgt.id:null;
          if(tgt){ A.food=40; V.intent={type:'gather',p:tgt}; V.walker.goTo(tgt.x,tgt.y+(SOLID[tgt.id]?4:0)); let t=0; while(t<60 && !(A.action&&A.action.type==='gather')){ V.update(0.05); t+=0.05; } out.chegouParaColher=+t.toFixed(1); const f0=A.food; for(let i=0;i<40;i++) V.update(0.05); out.comida=[+f0.toFixed(1),+A.food.toFixed(1)]; out.colhida=V.isHarvested(tgt); }
          // dormir
          A.energy=30; A.startAction('sleep',null); for(let i=0;i<200;i++) V.update(0.05); out.dormiu10s=+A.energy.toFixed(1); A.endAction();
          return out; }""")
        print(r2)
        r3 = await pg.evaluate("""()=>{ const V=view, A=V.adamS, E=V.evaS, out={};
          // Eva sozinha por 3 minutos de jogo com sede/fome: ela deve cuidar de si
          E.water=30; E.food=35; let drank=false, ate=false, lastW=E.water, lastF=E.food;
          for(let i=0;i<3600;i++){ V.update(0.05); if(E.water>lastW+3) drank=true; if(E.food>lastF+3) ate=true; lastW=E.water; lastF=E.food; }
          out.evaBebeu=drank; out.evaComeu=ate; out.eva={agua:+E.water.toFixed(0),comida:+E.food.toFixed(0),saude:+E.health.toFixed(0)};
          out.hora=+hourOf(V.clock).toFixed(1); return out; }""")
        print(r3)
        print(errs); await b.close()
asyncio.run(main())
