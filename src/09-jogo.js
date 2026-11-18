/** Controla posição, rota e pulos do personagem: acha o caminho, contorna obstáculos e olha para o Sul quando para. */
class HopWalker {
  /** @param {number} x @param {number} y @param {World} world */
  constructor(x, y, world) {
    this.x = x;
    this.y = y;
    this.world = world;
    this.dir = 'down';
    /** Destino final pedido pelo jogador. */
    this.goal = null;
    /** Pontos que faltam percorrer (rota suavizada). */
    this.route = [];
    this.needPlan = false;
    this.fail = 0;
    this.replans = 0;
    this.lastPlanDist = Infinity;
    /** @type {{t: number, fx: number, fy: number, tx: number, ty: number}|null} */
    this.hop = null;
    this.idleTime = 0;
    this.nextBlink = 2;
    this.blinkT = -1;
    this.keys = { x: 0, y: 0 };
    /** Ações paradas (beber, colher, dormir): não anda, usa `forcePose`. */
    this.frozen = false;
    this.forcePose = null;
    /** Multiplicador de velocidade do pulo (cansaço) e tremor de frio. */
    this.speedMul = 1;
    this.shiver = false;
    this.hopCount = 0;
  }

  /** Manda o personagem para um ponto (a rota é calculada ao começar). */
  goTo(x, y) {
    this.goal = { x, y };
    this.route = [];
    this.needPlan = true;
    this.fail = 0;
    this.replans = 0;
    this.lastPlanDist = Infinity;
  }

  /** Cancela o destino atual. */
  stop() { this.goal = null; this.route = []; }

  setKeys(dx, dy) { this.keys = { x: dx, y: dy }; }

  /** @returns {{x: number, y: number}|null} onde ele realmente vai parar (fim da rota ou destino) */
  destination() { return this.route.length ? this.route[this.route.length - 1] : this.goal; }

  faceToward(vx, vy) {
    this.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
  }

  /** Se estiver dentro de um obstáculo, vai para o ponto livre mais próximo. */
  unstick() {
    for (let r = 2; r <= 60; r += 2) for (let a = 0; a < 6.28; a += 0.4) {
      const x = this.x + Math.cos(a) * r, y = this.y + Math.sin(a) * r;
      if (this.world.canStand(x, y)) { this.x = x; this.y = y; return; }
    }
  }

  /** Calcula a rota até o destino. */
  plan() {
    const g = this.goal;
    this.needPlan = false;
    this.lastPlanDist = Math.hypot(g.x - this.x, g.y - this.y);
    const res = this.world.pathfinder.find(this.x, this.y, g.x, g.y);
    if (!res.points.length) { this.stop(); return; }
    this.route = res.points;
  }

  /** Escolhe o próximo pulo ao longo da rota. */
  startHop() {
    if (this.needPlan) { this.plan(); if (!this.goal) return; }
    while (this.route.length && Math.hypot(this.route[0].x - this.x, this.route[0].y - this.y) < 3) this.route.shift();
    if (!this.route.length) {
      const d = Math.hypot(this.goal.x - this.x, this.goal.y - this.y);
      // fim de uma rota parcial: tenta de novo se ainda dá para chegar mais perto
      if (d > 6 && this.replans < 8 && d < this.lastPlanDist - 4) { this.replans++; this.needPlan = true; } else this.stop();
      return;
    }
    const wp = this.route[0];
    const vx = wp.x - this.x, vy = wp.y - this.y, dist = Math.hypot(vx, vy);
    this.faceToward(vx, vy);
    const step = Math.min(dist, HOP_DISTANCE);
    for (const f of [1, 0.65, 0.35]) {
      const tx = this.x + (vx / dist) * step * f, ty = this.y + (vy / dist) * step * f;
      if (this.world.canStand(tx, ty)) { this.hop = { t: 0, fx: this.x, fy: this.y, tx, ty }; this.idleTime = 0; this.fail = 0; return; }
    }
    // não deu para pular: refaz a rota; se insistir, desiste
    this.fail++;
    if (this.fail > 3) this.stop(); else this.needPlan = true;
  }

  /** @param {number} dt segundos */
  update(dt) {
    this.idleTime += dt;
    if (this.hop) {
      this.hop.t += (dt * this.speedMul) / HOP_SECONDS;
      const q = clamp((this.hop.t - 0.16) / 0.68, 0, 1);
      const e = q * q * (3 - 2 * q);
      this.x = this.hop.fx + (this.hop.tx - this.hop.fx) * e;
      this.y = this.hop.fy + (this.hop.ty - this.hop.fy) * e;
      if (this.hop.t >= 1) { this.x = this.hop.tx; this.y = this.hop.ty; this.hop = null; this.hopCount++; }
    }
    if (!this.hop && this.frozen) this.dir = 'down';
    if (!this.hop && !this.frozen) {
      if (!this.world.canStand(this.x, this.y)) this.unstick();
      if ((this.keys.x || this.keys.y) && !this.goal) this.goTo(this.x + this.keys.x * 30, this.y + this.keys.y * 30);
      if (this.goal) this.startHop();
      if (!this.goal && !this.hop) this.dir = 'down';
    }
    if (this.blinkT < 0 && this.idleTime > this.nextBlink) this.blinkT = 0;
    if (this.blinkT >= 0) { this.blinkT += dt; if (this.blinkT > 0.14) { this.blinkT = -1; this.nextBlink = this.idleTime + 2 + Math.random() * 3; } }
  }

  /** @returns {{frame: string, lift: number}} quadro e altura do pulo */
  pose() {
    if (this.forcePose && !this.hop) return { frame: this.forcePose, lift: 0 };
    if (this.hop) {
      const t = this.hop.t;
      const q = clamp((t - 0.16) / 0.68, 0, 1);
      return { frame: t < 0.16 ? 'crouch' : t < 0.3 ? 'stretch' : t < 0.7 ? 'air' : t < 0.84 ? 'stretch' : 'land', lift: Math.round(HOP_HEIGHT * Math.sin(Math.PI * q)) };
    }
    if (this.blinkT >= 0) return { frame: 'blink', lift: 0 };
    return { frame: Math.floor(this.idleTime / 0.6) % 2 === 0 ? 'idle0' : 'idle1', lift: 0 };
  }
}

/** Espécies achatadas no chão: desenhadas antes do personagem, sem ordenar por profundidade. */
const FLAT_SPECIES = new Set(['lily', 'kelp', 'tuft', 'tuftDry', 'tuftBeach', 'tuftSnow', 'flowers']);

/** Visão do mapa: câmera que segue o Adão, água animada e plantas ordenadas por profundidade. */
class MapView {
  /** @param {HTMLCanvasElement} canvas @param {HTMLElement} stage @param {World} world */
  constructor(canvas, stage, world) {
    this.canvas = canvas;
    this.stage = stage;
    this.ctx = canvas.getContext('2d');
    this.adam = new SpriteBank();
    this.evaSprites = new SpriteBank(new EvaSpriteFactory());
    this.seasonSprites = new SeasonSprites();
    this.rabbitSprites = new RabbitSprites();
    this.burrowSprite = makeBurrowSprite();
    this.timeScale = 1;
    this.sway = new SwayBank();
    this.wind = 0.5;
    this.leafPlants = [];
    this.species = new SpeciesBank();
    this.scale = 3;
    /** Câmera solta: não acompanha o personagem (canto superior esquerdo em px do mundo). */
    this.free = false;
    this.freeCam = { x: 0, y: 0 };
    this.w = 130;
    this.h = 240;
    this.time = 0;
    this.labelTimer = 0;
    this.clock = 0;
    this.hudT = 0;
    this.setWorld(world);
  }

  /** @param {World} world */
  setWorld(world) {
    this.world = world;
    const sp = world.findSpawn();
    this.walker = new HopWalker(sp.x, sp.y, world);
    this.eva = new Eva(world, this.walker);
    this.adamS = new Survivor('Adão', this.walker, world);
    this.ecology = new Ecology(world, this.walker);
    this.rabbits = new RabbitField(this.ecology);
    this.evaS = this.eva.surv;
    this.intent = null;
    this.weather = new Weather();
    this.harvested = new Map();
    this.fx = [];
    this.plantRects = [];
    this.resize();
  }

  /** Ajusta o tamanho lógico para caber na tela com pixels inteiros. */
  resize() {
    this.w = Math.max(60, Math.floor(this.stage.clientWidth / this.scale));
    this.h = Math.max(80, Math.floor(this.stage.clientHeight / this.scale));
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.canvas.style.width = `${this.w * this.scale}px`;
    this.canvas.style.height = `${this.h * this.scale}px`;
  }

  /** @param {number} v */
  /**
   * Muda o zoom em passos inteiros (pixels nítidos). Com a câmera solta, o ponto sob o dedo/cursor
   * (ax, ay em 0–1 da tela) fica no mesmo lugar; seguindo o Adão, o zoom é centrado nele.
   * @param {number} v novo zoom @param {number} [ax] @param {number} [ay]
   */
  setScale(v, ax = 0.5, ay = 0.5) {
    const next = clamp(Math.round(v), 1, 8);
    if (next === this.scale) return;
    const cam = this.camera(), wx = cam.x + ax * this.w, wy = cam.y + ay * this.h;
    this.scale = next;
    this.resize();
    if (this.free) this.freeCam = { x: wx - ax * this.w, y: wy - ay * this.h };
    if (this.onZoom) this.onZoom(this.scale);
  }

  /** Desloca a câmera (px lógicos), soltando-a do personagem. */
  panBy(dx, dy) {
    if (!this.free) { const c = this.camera(); this.freeCam = { x: c.x, y: c.y }; this.free = true; }
    this.freeCam.x = clamp(this.freeCam.x + dx, 0, WORLD_W - this.w);
    this.freeCam.y = clamp(this.freeCam.y + dy, 0, WORLD_H - this.h);
  }

  /** Volta a câmera a seguir o personagem. */
  follow() { this.free = false; }

  /** Posição da câmera em pixels do mundo (inteira, para o pixel art não tremer). */
  camera() {
    if (this.free) return { x: clamp(Math.round(this.freeCam.x), 0, WORLD_W - this.w), y: clamp(Math.round(this.freeCam.y), 0, WORLD_H - this.h) };
    const cx = clamp(Math.round(this.walker.x - this.w / 2), 0, WORLD_W - this.w);
    const cy = clamp(Math.round(this.walker.y - this.h / 2 - 8), 0, WORLD_H - this.h);
    return { x: cx, y: cy };
  }

  /** Converte um toque da tela em coordenadas do mundo. */
  toWorld(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const cam = this.camera();
    return { x: ((clientX - r.left) / r.width) * this.w + cam.x, y: ((clientY - r.top) / r.height) * this.h + cam.y };
  }

  /** Gera, aos poucos, os pedaços logo além da tela para não haver engasgos ao andar. */
  prefetch(budget) {
    const cam = this.camera(), world = this.world, m = 1;
    const c0x = Math.floor(cam.x / CHUNK) - m, c1x = Math.floor((cam.x + this.w) / CHUNK) + m, c0y = Math.floor(cam.y / CHUNK) - m, c1y = Math.floor((cam.y + this.h) / CHUNK) + m;
    for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) {
      if (budget <= 0) return;
      if (cx < 0 || cy < 0 || cx * CHUNK >= world.w || cy * CHUNK >= world.h || world.hasChunk(cx, cy)) continue;
      world.getChunk(cx, cy);
      budget--;
    }
  }

  /** Contexto compartilhado das necessidades (relógio, avisos, colheita, efeitos). */
  env() {
    if (!this._env) {
      this._env = {
        clock: 0, hour: START_HOUR, partner: this.eva.walker, fx: this.fx,
        notify: (t) => this.notify(t), weather: this.weather,
        harvest: (p, e) => this.harvested.set(plantKey(p), this.clock + e.regrow),
        isHarvested: (p) => (this.harvested.get(plantKey(p)) ?? 0) > this.clock,
      };
    }
    this._env.clock = this.clock; this._env.hour = hourOf(this.clock); this._env.fx = this.fx; this._env.season = this.season; this._env.weather = this.weather;
    return this._env;
  }

  /** @returns {number} índice da estação atual (0 primavera … 3 inverno) */
  get season() { return Math.floor(this.world.sp) % 4; }

  /**
   * Mostra um aviso pequeno (mini-pop) no canto inferior esquerdo: no máximo 3 ao mesmo tempo.
   * @param {string} text @param {'info'|'warn'|'good'} [kind] @param {string} [key] mesma chave = troca o aviso em vez de empilhar @param {number} [ms]
   */
  notify(text, kind = 'info', key = '', ms = 3300) {
    const box = document.getElementById('pops');
    if (!box) return;
    let el = key ? box.querySelector(`[data-key="${key}"]`) : null;
    if (!el) {
      el = document.createElement('div');
      if (key) el.dataset.key = key;
      box.appendChild(el);
      while (box.children.length > 3) box.firstChild.remove();
    }
    el.className = `pop ${kind}`;
    el.textContent = text;
    clearTimeout(el._t); clearTimeout(el._t2);
    el._t = setTimeout(() => el.classList.add('out'), ms - 400);
    el._t2 = setTimeout(() => el.remove(), ms);
  }

  /** @returns {boolean} se a planta já foi colhida e ainda não renasceu */
  isHarvested(p) { return (this.harvested.get(plantKey(p)) ?? 0) > this.clock; }

  /** Quando o Adão chega ao destino de um pedido (beber/colher), começa a ação. */
  runIntent() {
    const it = this.intent, w = this.walker;
    if (!it || w.goal || w.hop || this.adamS.action) return;
    this.intent = null;
    tryStartIntent(this, this.adamS, it, true);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.clock += dt;
    this.rebuildTick = 0;
    // vento: sopra em rajadas suaves e fica forte nas tempestades
    { const wt = this.weather, boost = wt.intensity * ({ rain: 0.5, snow: 0.2, blizzard: 1.6, sand: 1.8 }[wt.kind] || 0); this.wind = clamp(0.75 + 0.32 * Math.sin(this.time * 0.21) + 0.16 * Math.sin(this.time * 0.57 + 1) + boost, 0.2, 2.8); }
    this.world.rebuildBudget = 4;
    this.seasonSprites.budget = 12;
    if (this.world.setSeason(seasonPos(this.clock)) && window.minimap) setTimeout(() => window.minimap.build(), 0);
    if (this.weather.intensity > 0.3 && !this.weather.announced) { this.weather.announced = true; this.notify(`${WEATHER_ICON[this.weather.kind]} ${WEATHER_NAME[this.weather.kind].replace(/^./, (c) => c.toUpperCase())}`, this.weather.kind === 'blizzard' || this.weather.kind === 'sand' ? 'warn' : 'info', 'tempo', 3500); }
    this.weather.update(dt, { sp: this.world.sp, biome: this.world.biomeAt(this.walker.x, this.walker.y), ambient: this.adamS ? this.adamS.ambient : 15 });
    const env = this.env();
    this.walker.update(dt);
    this.adamS.update(dt, env);
    this.eva.update(dt, this.walker, env);
    this.runIntent();
    {
      // coelhos: população do mundo todo + os que estão perto da câmera (só de dia; à noite e na tempestade ficam na toca)
      const cam1 = this.camera(), dark = darkness(env.hour), storm = this.weather.intensity > 0.5 && this.weather.kind !== 'snow';
      this.ecology.update(dt, { sp: this.world.sp, clock: this.clock, dark });
      this.rabbits.update(dt, { cx: cam1.x + this.w / 2, cy: cam1.y + this.h / 2, radius: Math.hypot(this.w, this.h) / 2 + 120, people: [this.walker, this.eva.walker], shelter: dark > 0.55 || storm, clock: this.clock, fx: this.fx, world: this.world });
      for (const ev of this.ecology.events.splice(0)) {
        if (Math.hypot(ev.x - this.walker.x, ev.y - this.walker.y) > 240) continue;
        if (ev.type === 'birth' && ev.n) this.notify(`🐇🍼 +${ev.n}`, 'good', 'coelho', 3000);
        else if (ev.type === 'death') this.notify(`🐇✝ ${DEATH_ICON[ev.cause]}`, 'info', 'coelho', 3000);
        else if (ev.type === 'colonize') this.notify('🕳️ 🐇 nova toca', 'good', 'coelho', 3000);
      }
    }
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < 1.6);
    { const d = Math.floor((START_HOUR + (this.clock / DAY_SECONDS) * 24) / 24); if (env.hour >= 19 && env.hour < 22 && this.tipDay !== d) { this.tipDay = d; this.notify('Anoiteceu e esfria: fique perto da Eva para se aquecer.', 'info', 'noite', 5000); } }
    this.hudT -= dt;
    if (this.hudT <= 0 && this.hud) { this.hudT = 0.2; this.hud.update(this.adamS, this.evaS, env.hour, this.world.sp, this.weather); }
    this.prefetch(3);
    const fb = document.getElementById('follow');
    if (fb && fb.hidden === this.free) fb.hidden = !this.free;
    this.labelTimer -= dt;
    if (this.labelTimer <= 0) {
      this.labelTimer = 0.25;
      const el = document.getElementById('biomeLabel');
      if (el) { const bi = this.world.biomeAt(this.walker.x, this.walker.y); el.textContent = BIOME_ICON[bi]; el.title = BIOME_INFO[bi].name; }
    }
  }

  /** Desenha uma planta apoiada no chão (base no centro). */
  drawPlant(p, cam) {
    const w = this.world;
    if (p._lk !== w.skey) { const b = w.biomeAt(p.x, p.y); p._look = makeLook(b, w.tmp.t, w.spq); p._lk = w.skey; }
    if (p.id === 'flowers' && p._look.bloom === 0) return null;
    let c = this.seasonSprites.get(p.id, p.v, p._look, this.species);
    // vento: as ondas de balanço percorrem o terreno; o topo da planta se move mais que a base
    const sw = SWAY[p.id];
    if (sw) {
      const s = Math.sin(this.time * 1.7 - (p.x * 0.045 + p.y * 0.02)) * 0.75 + Math.sin(this.time * 3.3 + p.x * 0.7) * 0.25;
      const lvl = clamp(Math.round(sw[0] * this.wind * (s * 0.9 + 0.35)), -3, 3);
      if (lvl !== 0) c = this.sway.get(c, lvl, sw[1]);
    }
    const bob = p.id === 'lily' ? Math.round(Math.sin(this.time * 1.3 + p.x) * 0.6) : 0;
    const x = Math.round(p.x - cam.x - c.width / 2);
    const y = bob + Math.round(p.y - cam.y - (FLAT_SPECIES.has(p.id) && (p.id === 'lily' || p.id === 'kelp') ? c.height / 2 : c.height - 1));
    if (x > this.w || y > this.h || x + c.width < 0 || y + c.height < 0) return null;
    this.ctx.drawImage(c, x, y);
    return { c, x, y };
  }

  /** @returns {boolean} se a Eva está sob o ponto do mundo */
  evaAt(wx, wy) {
    const cam = this.camera(), r = this.evaRect, sx = wx - cam.x, sy = wy - cam.y;
    return !!r && sx >= r.x - 2 && sx <= r.x + r.w + 2 && sy >= r.y - 2 && sy <= r.y + r.h + 2;
  }

  /** Folhas de outono e pétalas de primavera caindo das árvores, levadas pelo vento. */
  drawLeaves(ctx, cam) {
    const t = this.time, wind = this.wind;
    let n = 0;
    for (const { p, r } of this.leafPlants) {
      const lk = p._look;
      const autumn = lk.autumn >= 0.5 && lk.bare < 0.9, petals = lk.bloom >= 0.67 && lk.autumn < 0.3;
      if (!autumn && !petals) continue;
      if (++n > 28) break;
      for (let k = 0; k < 4; k++) {
        const ph = hash2(p.x * 3 + k, p.y * 5 + 1), u = (t / (autumn ? 5 : 4) + ph + k * 0.25) % 1;
        const x0 = r.x + r.c.width * (0.25 + 0.5 * hash2(p.x + k, p.y)), y0 = r.y + r.c.height * 0.25, yEnd = p.y - cam.y;
        const x = x0 + Math.sin(t * 1.3 + ph * 9 + k) * 6 + u * wind * 20, y = y0 + (yEnd - y0) * u;
        const cols = autumn ? LEAF_COLS : PETAL_COLS;
        ctx.globalAlpha = u > 0.85 ? (1 - u) / 0.15 : 1;
        ctx.fillStyle = cols[Math.floor(hash2(p.x + 7 * k, p.y + 3) * cols.length)];
        ctx.fillRect(Math.round(x), Math.round(y), 2, autumn ? 2 : 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Sombras de nuvens que passam devagar pelo terreno, empurradas pelo vento (mais nuvens quando chove). */
  drawClouds(ctx, cam) {
    const S = 260, wt = this.weather, cover = 0.26 + 0.34 * (wt.kind === 'rain' || wt.kind === 'snow' ? wt.intensity : 0);
    const day = 1 - darkness(hourOf(this.clock));
    if (day < 0.05) return;
    const drift = this.time * (4 + this.wind * 5);
    const c0 = Math.floor((cam.x - 180 - drift) / S), c1 = Math.floor((cam.x + this.w + 180 - drift) / S), r0 = Math.floor((cam.y - 120) / S), r1 = Math.floor((cam.y + this.h + 120) / S);
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      if (hash2(cx * 7 + 3, cy * 13 + 1) > cover) continue;
      const wx = (cx + 0.2 + 0.6 * hash2(cx + 9, cy + 4)) * S + drift, wy = (cy + 0.3 + 0.4 * hash2(cx + 2, cy + 8)) * S;
      const rx = 50 + hash2(cx + 5, cy + 6) * 60, ry = rx * 0.38, sx = wx - cam.x, sy = wy - cam.y;
      for (const [k, a] of [[1, 0.06], [0.7, 0.06]]) {
        ctx.fillStyle = `rgba(10,20,40,${(a * day).toFixed(3)})`;
        for (let dy = -ry * k; dy <= ry * k; dy += 2) { const half = rx * k * Math.sqrt(1 - (dy / (ry * k)) ** 2); ctx.fillRect(Math.round(sx - half), Math.round(sy + dy), Math.round(half * 2), 2); }
      }
    }
  }

  /** Desenha as tocas (entradas na terra) visíveis na tela. */
  drawBurrows(ctx, cam) {
    for (const w of this.ecology.warrens) {
      const x = Math.round(w.x - cam.x - 7), y = Math.round(w.y - cam.y - 4);
      if (x < -20 || y < -20 || x > this.w + 20 || y > this.h + 20) { w.rect = null; continue; }
      ctx.drawImage(this.burrowSprite, x, y);
      w.rect = { x, y, w: 14, h: 8 };
    }
  }

  /** Desenha um coelho (sombra, sprite da fase e capim na boca quando come). */
  drawRabbit(a, cam) {
    const ctx = this.ctx, e = this.rabbitSprites.get(a.frame, a.d.stage, a.dir < 0), c = e.canvas;
    const x = Math.round(a.x - cam.x - c.width / 2), y = Math.round(a.y - cam.y - c.height + 1 - a.lift);
    const gx = Math.round(a.x - cam.x), gy = Math.round(a.y - cam.y);
    ctx.fillStyle = 'rgba(20,30,20,0.28)';
    const half = Math.max(2, Math.round(c.width * 0.36 * (1 - a.lift / 20)));
    for (let dy = -1; dy <= 1; dy++) { const hw = Math.round(half * Math.sqrt(1 - (dy / 2) * (dy / 2))); ctx.fillRect(gx - hw, gy + dy, hw * 2, 1); }
    ctx.drawImage(c, x, y);
    if (a.state === 'act' && a.act === 'eat') {
      const fl = a.dir < 0;
      ctx.fillStyle = '#6fc85a'; ctx.fillRect(x + e.mouth.x + (fl ? -1 : 0), y + e.mouth.y - 1, 1, 2);
      ctx.fillStyle = '#4ea84a'; ctx.fillRect(x + e.mouth.x + (fl ? -2 : 1), y + e.mouth.y, 1, 1);
    }
    a.rect = { x, y, w: c.width, h: c.height };
    return { c, x, y };
  }

  /** Efeitos pequenos: gotas ao beber, brilhos ao colher e "z" ao dormir. */
  drawFx(cam) {
    const ctx = this.ctx;
    for (const f of this.fx) {
      if (f.t < 0) continue;
      const x = Math.round(f.x - cam.x), y = Math.round(f.y - cam.y);
      if (f.type === 'drop') { ctx.fillStyle = `rgba(120,200,255,${(1 - f.t / 0.6).toFixed(2)})`; ctx.fillRect(x, y + Math.round(f.t * 10), 1, 2); }
      else if (f.type === 'spark') { const a = clamp(1 - f.t / 0.9, 0, 1); ctx.fillStyle = `rgba(255,236,120,${a.toFixed(2)})`; ctx.fillRect(x, y - Math.round(f.t * 9), 2, 2); }
      else if (f.type === 'heart') {
        const a = clamp(1 - f.t / 1.4, 0, 1), yy = y - Math.round(f.t * 7);
        ctx.fillStyle = `rgba(232,70,100,${a.toFixed(2)})`;
        ctx.fillRect(x + 1, yy, 1, 1); ctx.fillRect(x + 3, yy, 1, 1); ctx.fillRect(x, yy + 1, 5, 1); ctx.fillRect(x + 1, yy + 2, 3, 1); ctx.fillRect(x + 2, yy + 3, 1, 1);
      } else if (f.type === 'puff') {
        const a = clamp(1 - f.t / 0.7, 0, 1), r = 1 + Math.round(f.t * 5);
        ctx.fillStyle = `rgba(210,190,160,${(a * 0.8).toFixed(2)})`;
        ctx.fillRect(x - r, y - 1, 2, 2); ctx.fillRect(x + r, y - 1, 2, 2); ctx.fillRect(x, y - 2 - Math.round(f.t * 4), 2, 2);
      } else if (f.type === 'zzz') {
        const a = clamp(1 - f.t / 1.6, 0, 1), yy = y - Math.round(f.t * 8), xx = x + Math.round(Math.sin(f.t * 3) * 1.5);
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
        ctx.fillRect(xx, yy, 4, 1); ctx.fillRect(xx + 3, yy + 1, 1, 1); ctx.fillRect(xx + 2, yy + 2, 1, 1); ctx.fillRect(xx + 1, yy + 3, 1, 1); ctx.fillRect(xx, yy + 4, 4, 1);
      }
    }
  }

  /** Chuva, neve, nevasca ou chuva de areia: partículas, véu de cor e rajadas de vento. */
  drawWeather(ctx) {
    const wt = this.weather, I = wt.intensity;
    if (I < 0.03) return;
    const t = this.time, W = this.w, H = this.h, frac = (v) => v - Math.floor(v);
    const gust = 0.88 + 0.22 * Math.sin(t * 0.9) + 0.1 * Math.sin(t * 2.3);
    if (wt.kind === 'rain') {
      ctx.fillStyle = `rgba(40,60,90,${(0.24 * I).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
      // duas camadas: gotas distantes (curtas, lentas) e próximas (longas, rápidas)
      for (const [n0, len, spd, a] of [[80, 2, 60, 0.45], [60, 4, 115, 0.8]]) {
        ctx.fillStyle = `rgba(190,215,255,${a})`;
        const n = Math.round(n0 * I * 1.4);
        for (let i = 0; i < n; i++) ctx.fillRect(Math.floor((frac(i * 0.618034 + len * 0.13) * W + t * 24) % W), Math.floor(frac(i * 0.754878 + (t * spd) / H) * H), 1, len);
      }
      // respingos no chão
      ctx.fillStyle = 'rgba(225,238,255,0.6)';
      const ns = Math.round(26 * I);
      for (let i = 0; i < ns; i++) {
        const c = t * 1.6 + i * 0.37, ph = frac(c);
        if (ph > 0.34) continue;
        const k = Math.floor(c), x = Math.floor(frac(i * 0.31 + k * 0.173) * W), y = Math.floor(H * 0.2 + frac(i * 0.77 + k * 0.291) * H * 0.8), r = ph < 0.17 ? 1 : 2;
        ctx.fillRect(x - r, y, 2 * r + 1, 1);
      }
      if (I > 0.75) { const c = t % 31; if (c < 0.1 || (c > 0.22 && c < 0.3)) { ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.fillRect(0, 0, W, H); } }
    } else if (wt.kind === 'snow') {
      ctx.fillStyle = `rgba(220,230,245,${(0.1 * I).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      const n = Math.round(130 * I);
      for (let i = 0; i < n; i++) {
        const x = (frac(i * 0.618034) * W + Math.sin(t * 0.9 + i) * 5 + t * 5 + W) % W, y = (frac(i * 0.754878) * H + t * (16 + (i % 4) * 6)) % H;
        ctx.fillRect(Math.floor(x), Math.floor(y), i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
      }
    } else if (wt.kind === 'blizzard') {
      // nevasca: quase tudo branco, rajadas de vento e riscos de neve na horizontal
      ctx.fillStyle = `rgba(236,243,252,${(0.42 * I * gust).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(170,190,215,${(0.1 * I).toFixed(3)})`;
      for (let b = 0; b < 4; b++) ctx.fillRect(0, Math.floor(frac(b * 0.37 + t * 0.05) * H), W, 14 + b * 3);
      const n = Math.round(230 * I);
      for (let i = 0; i < n; i++) {
        const sp = (150 + (i % 5) * 28) * gust, x = (frac(i * 0.618034) * W + t * sp) % W, y = (frac(i * 0.754878) * H + t * 46 + Math.sin(t * 2 + i) * 3 + H) % H;
        ctx.fillStyle = i % 4 === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)';
        ctx.fillRect(Math.floor(x), Math.floor(y), i % 4 === 0 ? 2 : 5 + (i % 3) * 2, i % 4 === 0 ? 2 : 1);
      }
    } else if (wt.kind === 'sand') {
      // chuva de areia: véu cor de areia, faixas de poeira e grãos levados pelo vento
      ctx.fillStyle = `rgba(206,160,92,${(0.44 * I * gust).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(150,105,55,${(0.1 * I).toFixed(3)})`;
      for (let b = 0; b < 5; b++) ctx.fillRect(0, Math.floor(frac(b * 0.29 + t * 0.04) * H), W, 16 + b * 4);
      const n = Math.round(260 * I), cols = ['#e6c07a', '#c49a55', '#f0d49a'];
      for (let i = 0; i < n; i++) {
        const sp = (170 + (i % 5) * 30) * gust, x = (frac(i * 0.618034) * W + t * sp) % W, y = (frac(i * 0.754878) * H + t * 24 + Math.sin(t * 3 + i * 1.7) * 4 + H) % H;
        ctx.fillStyle = cols[i % 3];
        ctx.fillRect(Math.floor(x), Math.floor(y), 1 + (i % 3 === 0 ? 1 : 0), 1);
      }
    }
  }

  /** Escurece a tela com gradiente: tarde → entardecer → noite e noite → amanhecer. */
  drawDayNight(ctx) {
    const d = darkness(hourOf(this.clock));
    // brilho alaranjado no meio das transições (pôr do sol e nascer do sol)
    const warm = clamp(4 * d * (1 - d), 0, 1);
    if (warm > 0.01) { ctx.fillStyle = `rgba(255,140,60,${(0.22 * warm).toFixed(3)})`; ctx.fillRect(0, 0, this.w, this.h); }
    if (d > 0.01) { ctx.fillStyle = `rgba(14,24,70,${(0.58 * d).toFixed(3)})`; ctx.fillRect(0, 0, this.w, this.h); }
  }

  /** Marcador do destino ("ping") com anéis que se expandem e trilha pontilhada da rota. */
  drawPing(cam) {
    const w = this.walker, d = w.destination();
    if (!d) return;
    const ctx = this.ctx, t = this.time;
    // trilha pontilhada do personagem até o destino
    ctx.fillStyle = 'rgba(255,243,196,0.75)';
    let px = w.x, py = w.y, carry = 0;
    for (const p of w.route) {
      const seg = Math.hypot(p.x - px, p.y - py);
      for (let s = 6 - carry; s < seg; s += 6) { const k = s / seg; ctx.fillRect(Math.round(px + (p.x - px) * k - cam.x), Math.round(py + (p.y - py) * k - cam.y), 1, 1); }
      carry = (carry + seg) % 6; px = p.x; py = p.y;
    }
    const x = Math.round(d.x - cam.x), y = Math.round(d.y - cam.y);
    if (x < -14 || x > this.w + 14 || y < -14 || y > this.h + 14) return;
    for (const off of [0, 0.5]) {
      const ph = (t * 1.1 + off) % 1, r = 2 + ph * 10;
      ctx.fillStyle = `rgba(255,226,122,${(0.95 * (1 - ph)).toFixed(2)})`;
      for (let k = 0; k < 72; k++) { const a = (k / 72) * Math.PI * 2; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.55), 1, 1); }
    }
    ctx.fillStyle = 'rgba(20,30,20,0.35)';
    ctx.fillRect(x - 2, y, 5, 1);
    const by = y - 6 + Math.round(Math.sin(t * 6));
    for (const [r, col] of [[3, '#2b1a12'], [2, Math.floor(t * 3) % 2 === 0 ? '#ffd23f' : '#ffb03f']]) {
      ctx.fillStyle = col;
      for (let dy = -r; dy <= r; dy++) { const half = r - Math.abs(dy); ctx.fillRect(x - half, by + dy, half * 2 + 1, 1); }
    }
    ctx.fillStyle = '#2b1a12';
    ctx.fillRect(x, by + 4, 1, 3);
  }

  /** Versão do sprite pintada de uma cor só (guardada em cache). */
  tinted(key, sprite, color) {
    const k = `${key}:${color}`;
    if (!this.tintCache) this.tintCache = {};
    if (!this.tintCache[k]) {
      const c = document.createElement('canvas');
      c.width = sprite.width; c.height = sprite.height;
      const t = c.getContext('2d');
      t.drawImage(sprite, 0, 0);
      t.globalCompositeOperation = 'source-in';
      t.fillStyle = color;
      t.fillRect(0, 0, c.width, c.height);
      this.tintCache[k] = c;
    }
    return this.tintCache[k];
  }

  /**
   * Silhueta do personagem por cima do que o esconde: só aparece nos pixels
   * onde uma planta à frente cobre o sprite, com contorno escuro.
   */
  drawSilhouette(key, sprite, sx, sy, fronts) {
    const w = sprite.width + 2, h = sprite.height + 2;
    if (!this.silA) {
      this.silA = document.createElement('canvas');
      this.silB = document.createElement('canvas');
    }
    for (const c of [this.silA, this.silB]) { if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } }
    const M = this.silA.getContext('2d'), G = this.silB.getContext('2d');
    M.globalCompositeOperation = 'source-over';
    M.clearRect(0, 0, w, h);
    for (const r of fronts) M.drawImage(r.c, r.x - (sx - 1), r.y - (sy - 1));
    G.globalCompositeOperation = 'source-over';
    G.clearRect(0, 0, w, h);
    const dark = this.tinted(key, sprite, '#2b1408'), light = this.tinted(key, sprite, '#ffc94d');
    for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) G.drawImage(dark, dx, dy);
    G.drawImage(light, 1, 1);
    G.globalCompositeOperation = 'destination-in';
    G.drawImage(this.silA, 0, 0);
    G.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 0.9;
    this.ctx.drawImage(this.silB, sx - 1, sy - 1);
    this.ctx.globalAlpha = 1;
  }

  render() {
    const ctx = this.ctx, world = this.world, cam = this.camera(), t = this.time;
    ctx.fillStyle = '#13222c';
    ctx.fillRect(0, 0, this.w, this.h);
    const c0x = Math.floor(cam.x / CHUNK), c1x = Math.floor((cam.x + this.w) / CHUNK), c0y = Math.floor(cam.y / CHUNK), c1y = Math.floor((cam.y + this.h) / CHUNK);
    const chunks = [];
    for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) {
      if (cx < 0 || cy < 0 || cx * CHUNK >= world.w || cy * CHUNK >= world.h) continue;
      const ch = world.getChunk(cx, cy);
      chunks.push(ch);
      ctx.drawImage(ch.canvas, cx * CHUNK - cam.x, cy * CHUNK - cam.y);
    }
    // brilhos e espuma da água
    ctx.fillStyle = 'rgba(210,244,250,0.85)';
    for (const ch of chunks) for (let i = 0; i < ch.shimmer.length; i += 3) {
      const ph = ch.shimmer[i + 2], wv = Math.sin(t * 0.9 + ph * 20);
      if (wv > 0.5) ctx.fillRect(ch.shimmer[i] - cam.x + Math.round(Math.sin(t * 0.5 + ph * 7) * 2), ch.shimmer[i + 1] - cam.y, wv > 0.85 ? 4 : 3, 1);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const ch of chunks) for (let i = 0; i < ch.foam.length; i += 3) {
      if ((Math.floor(t * 2 + ch.foam[i + 2] * 6)) % 3 !== 0) ctx.fillRect(ch.foam[i] - cam.x, ch.foam[i + 1] - cam.y, 1, 1);
    }
    this.plantRects = [];
    this.leafPlants = [];
    const wy = this.walker.y;
    const plants = world.plantsIn(cam.x - 40, cam.y, cam.x + this.w + 40, cam.y + this.h + 90);
    for (const p of plants) if (FLAT_SPECIES.has(p.id)) this.drawPlant(p, cam);
    this.drawBurrows(ctx, cam);
    for (const a of this.rabbits.actors) a.rect = null;
    // personagem
    const { frame, lift } = this.walker.pose();
    const px = Math.round(this.walker.x - cam.x), py = Math.round(this.walker.y - cam.y);
    const sprite = this.adam.get(this.walker.dir, frame);
    const shk = this.walker.shiver && Math.floor(this.time * 14) % 2 === 0 ? 1 : 0;
    const sx = px - CENTER_X + shk, sy = py - 27 - lift;
    const items = [{ y: wy, k: 1, kind: 'adam' }, { y: this.eva.walker.y, k: 1, kind: 'eva' }];
    for (const p of plants) if (!FLAT_SPECIES.has(p.id)) items.push({ y: p.y, k: 0, kind: 'plant', p });
    for (const a of this.rabbits.actors) if (!a.inside && a.x > cam.x - 30 && a.x < cam.x + this.w + 30 && a.y > cam.y - 10 && a.y < cam.y + this.h + 50) items.push({ y: a.y, k: 0, kind: 'rabbit', a });
    items.sort((u, v) => u.y - v.y || u.k - v.k);
    const fronts = [];
    let adamDrawn = false;
    for (const it of items) {
      let r = null;
      if (it.kind === 'adam') {
        ctx.fillStyle = 'rgba(20,30,20,0.32)';
        const rx = 8 - Math.min(3, lift * 0.6);
        for (let dy = -1; dy <= 1; dy++) { const half = Math.round(rx * Math.sqrt(1 - (dy / 2) * (dy / 2))); ctx.fillRect(px - half, py + dy, half * 2, 1); }
        ctx.drawImage(sprite, sx, sy);
        adamDrawn = true;
        continue;
      }
      if (it.kind === 'eva') {
        const ew = this.eva.walker, pe = ew.pose();
        const epx = Math.round(ew.x - cam.x), epy = Math.round(ew.y - cam.y);
        const es = this.evaSprites.get(ew.dir, pe.frame), esx = epx - CENTER_X + (ew.shiver && Math.floor(this.time * 14) % 2 === 0 ? 1 : 0), esy = epy - 27 - pe.lift;
        if (esx < this.w + 20 && esx > -40 && esy < this.h + 20 && esy > -40) {
          ctx.fillStyle = 'rgba(20,30,20,0.32)';
          const rx = 8 - Math.min(3, pe.lift * 0.6);
          for (let dy = -1; dy <= 1; dy++) { const half = Math.round(rx * Math.sqrt(1 - (dy / 2) * (dy / 2))); ctx.fillRect(epx - half, epy + dy, half * 2, 1); }
          ctx.drawImage(es, esx, esy);
          this.evaRect = { x: esx, y: esy, w: es.width, h: es.height };
          if (adamDrawn && esx < sx + sprite.width && esx + es.width > sx && esy < sy + sprite.height && esy + es.height > sy) fronts.push({ c: es, x: esx, y: esy });
        } else this.evaRect = null;
        continue;
      }
      if (it.kind === 'rabbit') {
        r = this.drawRabbit(it.a, cam);
        if (adamDrawn && r && r.x < sx + sprite.width && r.x + r.c.width > sx && r.y < sy + sprite.height && r.y + r.c.height > sy) fronts.push(r);
        continue;
      }
      r = this.drawPlant(it.p, cam);
      if (it.kind === 'plant' && r) {
        if (it.p.id === 'oak' || it.p.id === 'oakWet' || it.p.id === 'birch') this.leafPlants.push({ p: it.p, r });
        const ed = edibleNow(it.p, this.season), poison = isPoison(it.p);
        if (ed || poison || edibleOf(it.p)) {
          this.plantRects.push({ p: it.p, x: r.x, y: r.y, w: r.c.width, h: r.c.height });
          if (ed && !this.isHarvested(it.p) && Math.hypot(it.p.x - this.walker.x, it.p.y - this.walker.y) < 110 && Math.floor(t * 2 + ((it.p.x * 7 + it.p.y * 3) % 5)) % 5 === 0) {
            const tx = Math.round(r.x + r.c.width * 0.5), ty = Math.round(r.y + r.c.height * 0.35);
            ctx.fillStyle = '#fff6b0';
            ctx.fillRect(tx, ty - 1, 1, 3); ctx.fillRect(tx - 1, ty, 3, 1);
          }
        }
      }
      if (adamDrawn && r && r.x < sx + sprite.width && r.x + r.c.width > sx && r.y < sy + sprite.height && r.y + r.c.height > sy) fronts.push(r);
    }
    if (fronts.length) this.drawSilhouette(`${this.walker.dir}:${frame}`, sprite, sx, sy, fronts);
    this.drawClouds(ctx, cam);
    this.drawLeaves(ctx, cam);
    this.drawFx(cam);
    this.drawWeather(ctx);
    this.drawDayNight(ctx);
    this.drawPing(cam);
    // seta dourada na borda quando o Adão está fora da tela (câmera solta)
    if (this.free && (px < -6 || px > this.w + 6 || py < 0 || py > this.h + 14)) {
      const cxm = this.w / 2, cym = this.h / 2;
      const vx = px - cxm, vy = py - 14 - cym;
      const k = Math.min((cxm - 9) / Math.max(1, Math.abs(vx)), (cym - 9) / Math.max(1, Math.abs(vy)));
      const mx = Math.round(cxm + vx * k), my = Math.round(cym + vy * k);
      const ang = Math.atan2(vy, vx);
      for (const [r, col] of [[5, '#2b1a12'], [4, Math.floor(this.time * 2.5) % 2 === 0 ? '#ffd23f' : '#ff9a3f']]) {
        ctx.fillStyle = col;
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const along = dx * Math.cos(ang) + dy * Math.sin(ang), across = -dx * Math.sin(ang) + dy * Math.cos(ang);
          if (along <= r && along >= -r * 0.6 && Math.abs(across) <= (r - along) * 0.7 + 0.4) ctx.fillRect(mx + dx, my + dy, 1, 1);
        }
      }
    }
  }
}

/** Seções do catálogo: solos e espécies de cada ambiente. */
const CATALOG = [
  { title: 'Oceano e praia', grounds: [BIOME.DEEP, BIOME.SHALLOW, BIOME.BEACH], species: ['kelp', 'palm', 'tuftBeach', 'rock'] },
  { title: 'Lagos', grounds: [BIOME.LAKE, BIOME.ICE], species: ['lily', 'reeds'] },
  { title: 'Campo', grounds: [BIOME.MEADOW], species: ['tuft', 'flowers', 'bush', 'oak', 'birch', 'rock'] },
  { title: 'Floresta temperada', grounds: [BIOME.FOREST], species: ['oak', 'birch', 'bush', 'mushroom', 'rockBig'] },
  { title: 'Floresta úmida', grounds: [BIOME.HUMID], species: ['oakWet', 'fern', 'bushWet', 'mushroom', 'rockMoss'] },
  { title: 'Selva', grounds: [BIOME.JUNGLE], species: ['jungleTree', 'palm', 'bigLeaf', 'fern'] },
  { title: 'Pântano', grounds: [BIOME.SWAMP], species: ['cypress', 'reeds', 'deadTree', 'mushroom', 'lily'] },
  { title: 'Deserto e oásis', grounds: [BIOME.DESERT], species: ['saguaro', 'barrel', 'dryBush', 'tuftDry', 'deadTree', 'rockSand', 'palm'] },
  { title: 'Neve, tundra e gelo', grounds: [BIOME.SNOW, BIOME.TUNDRA, BIOME.ICECAP], species: ['spruceSnow', 'spruce', 'spruceSmall', 'snowBush', 'birchBare', 'tuftSnow', 'rockSnow'] },
];

/** Monta o catálogo (solos e espécies em escala ampliada). */
function buildCatalog(speciesBank) {
  const root = document.getElementById('catalog');
  root.innerHTML = '';
  for (const sec of CATALOG) {
    const box = document.createElement('section');
    const h = document.createElement('h2');
    h.textContent = sec.title;
    box.appendChild(h);
    const gr = document.createElement('div');
    gr.className = 'row';
    for (const b of sec.grounds) {
      const cell = document.createElement('figure');
      const c = document.createElement('canvas');
      c.width = 40; c.height = 28;
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(40, 28);
      for (let y = 0; y < 28; y++) for (let x = 0; x < 40; x++) {
        const col = groundPixel(b, 200 + x, 140 + y, (y / 28) * (b === BIOME.SHALLOW ? 1 : 0.8));
        const i = (y * 40 + x) * 4;
        img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      c.style.width = '120px'; c.style.height = '84px';
      cell.appendChild(c);
      const cap = document.createElement('figcaption');
      cap.textContent = BIOME_INFO[b].name;
      cell.appendChild(cap);
      gr.appendChild(cell);
    }
    box.appendChild(gr);
    const pl = document.createElement('div');
    pl.className = 'row plants';
    for (const id of sec.species) {
      const cell = document.createElement('figure');
      const src = speciesBank.get(id, 0);
      const c = document.createElement('canvas');
      c.width = src.width; c.height = src.height;
      c.getContext('2d').drawImage(src, 0, 0);
      c.style.width = `${src.width * 5}px`; c.style.height = `${src.height * 5}px`;
      cell.appendChild(c);
      const cap = document.createElement('figcaption');
      cap.textContent = SPECIES[id].name;
      cell.appendChild(cap);
      pl.appendChild(cell);
    }
    box.appendChild(pl);
    root.appendChild(box);
  }
}

/** Cores do mini-mapa por bioma. */
const MINI_COLORS = ['#2a68a8', '#58c0d0', '#efdca4', '#3d90bc', '#cfe6f6', '#ecc98c', '#f4f8fd', '#adad86', '#6fa84a', '#3f7a3a', '#3a7a52', '#2c7a3a', '#6a7c42', '#dcecf8'].map(rgbOf);

/** Mini-mapa redondo: mostra o mundo, a posição do Adão e o Norte (sempre para cima). */
class Minimap {
  /** @param {HTMLCanvasElement} canvas @param {MapView} view */
  constructor(canvas, view) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.view = view;
    this.size = 64;
    this.step = 12;
    this.far = false;
    canvas.width = canvas.height = this.size;
    this.build();
  }

  /** Pinta uma versão reduzida do mundo (1 pixel a cada `step` pixels). */
  build() {
    const w = this.view.world, s = this.step;
    const mw = Math.ceil(w.w / s), mh = Math.ceil(w.h / s);
    this.base = document.createElement('canvas');
    this.base.width = mw; this.base.height = mh;
    const ctx = this.base.getContext('2d');
    const img = ctx.createImageData(mw, mh);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      const c = MINI_COLORS[w.biomeAt(x * s + s / 2, y * s + s / 2)];
      const i = (y * mw + x) * 4;
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  /** Alterna entre a vista das redondezas e a do mundo todo. */
  toggle() { this.far = !this.far; }

  /** @param {number} t tempo (s) */
  render(t) {
    const ctx = this.ctx, w = this.view.world, p = this.view.walker, n = this.size, s = this.step;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#13222c';
    ctx.fillRect(0, 0, n, n);
    const span = this.far ? w.w * 1.02 : 480;
    const f = n / (span / s);
    const cx = this.far ? w.w / 2 : p.x, cy = this.far ? w.h / 2 : p.y;
    ctx.drawImage(this.base, n / 2 - (cx / s) * f, n / 2 - (cy / s) * f, this.base.width * f, this.base.height * f);
    // retângulo do que a câmera está mostrando
    const cam = this.view.camera();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(n / 2 + ((cam.x - cx) / span) * n) + 0.5, Math.round(n / 2 + ((cam.y - cy) / span) * n) + 0.5, Math.max(2, Math.round((this.view.w / span) * n)), Math.max(2, Math.round((this.view.h / span) * n)));
    // marcador da Eva (rosa)
    {
      const e = this.view.eva.walker;
      let ex = n / 2 + ((e.x - cx) / span) * n, ey = n / 2 + ((e.y - cy) / span) * n;
      const edx = ex - n / 2, edy = ey - n / 2, er = Math.hypot(edx, edy);
      if (er > 28) { ex = n / 2 + (edx / er) * 28; ey = n / 2 + (edy / er) * 28; }
      ex = Math.round(ex); ey = Math.round(ey);
      ctx.fillStyle = '#2b1a12'; ctx.fillRect(ex - 2, ey - 2, 5, 5);
      ctx.fillStyle = '#ff8fb8'; ctx.fillRect(ex - 1, ey - 1, 3, 3);
    }
    // marcador do personagem (pisca devagar)
    let mx = n / 2 + ((p.x - cx) / span) * n, my = n / 2 + ((p.y - cy) / span) * n;
    const dx = mx - n / 2, dy = my - n / 2, r = Math.hypot(dx, dy);
    if (r > 28) { mx = n / 2 + (dx / r) * 28; my = n / 2 + (dy / r) * 28; }
    mx = Math.round(mx); my = Math.round(my);
    ctx.fillStyle = '#2b1a12';
    ctx.fillRect(mx - 2, my - 2, 5, 5);
    ctx.fillStyle = Math.floor(t * 2.5) % 2 === 0 ? '#ffd23f' : '#ff7a3f';
    ctx.fillRect(mx - 1, my - 1, 3, 3);
  }
}

/** Mostra Adão e Eva no catálogo (de frente, de lado e de costas). */
function buildPeopleCatalog() {
  const root = document.getElementById('catalog');
  const head = document.createElement('h1');
  head.textContent = 'Adão e Eva';
  head.className = 'cat-title';
  root.appendChild(head);
  const box = document.createElement('section');
  for (const [name, bank] of [['Adão', new SpriteBank()], ['Eva', new SpriteBank(new EvaSpriteFactory())]]) {
    const card = document.createElement('div');
    card.className = 'animal';
    const t = document.createElement('div');
    t.className = 'aname';
    t.textContent = name;
    card.appendChild(t);
    const row = document.createElement('div');
    row.className = 'row';
    for (const [dir, fr, lab] of [['down', 'idle0', 'de frente'], ['right', 'idle0', 'de lado'], ['up', 'idle0', 'de costas'], ['down', 'air', 'pulando']]) {
      const src = bank.get(dir, fr), fig = document.createElement('figure'), c = document.createElement('canvas');
      c.width = src.width; c.height = src.height;
      c.getContext('2d').drawImage(src, 0, 0);
      c.style.width = `${src.width * 4}px`; c.style.height = `${src.height * 4}px`;
      fig.appendChild(c);
      const cap = document.createElement('figcaption');
      cap.textContent = lab;
      fig.appendChild(cap);
      row.appendChild(fig);
    }
    card.appendChild(row);
    box.appendChild(card);
  }
  root.appendChild(box);
}

/** Seção "Coelhos" do catálogo: as 4 fases da vida e as estatísticas da população (atualizadas ao vivo). */
function buildRabbitCatalog() {
  const root = document.getElementById('catalog');
  const head = document.createElement('h1');
  head.textContent = 'Coelhos';
  head.className = 'cat-title';
  root.appendChild(head);
  const box = document.createElement('section');
  const card = document.createElement('div');
  card.className = 'animal';
  const row = document.createElement('div');
  row.className = 'row';
  const bank = new RabbitSprites();
  const labels = ['🍼 0–2,5 min', '🌱 até 7 min', '💪 adulto', '👴 últimos 30 min'];
  for (let st = 0; st < 4; st++) {
    const src = bank.get('idle', st).canvas, fig = document.createElement('figure'), c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0);
    c.style.width = `${src.width * 5}px`; c.style.height = `${src.height * 5}px`;
    fig.appendChild(c);
    const cap = document.createElement('figcaption');
    cap.textContent = labels[st];
    fig.appendChild(cap);
    row.appendChild(fig);
  }
  card.appendChild(row);
  const note = document.createElement('div');
  note.className = 'adesc';
  note.textContent = 'Só saem de dia; à noite e na tempestade ficam na toca. Gestação de 2 min, ninhadas de 2 a 5, filhotes viram adultos aos 7 min e vivem de 1h40 a 2h40. Quando a toca lota, os jovens se mudam ou fundam tocas novas.';
  card.appendChild(note);
  const stats = document.createElement('div');
  stats.id = 'ecoStats';
  stats.className = 'adesc';
  stats.style.cssText = 'margin-top:8px; line-height:1.7; font-size:14px;';
  card.appendChild(stats);
  box.appendChild(card);
  root.appendChild(box);
}

/** Atualiza os números da população de coelhos no catálogo (só quando a aba está aberta). */
function refreshEcology(view) {
  const el = document.getElementById('ecoStats');
  if (!el || el.offsetParent === null || !view.ecology) return;
  const c = view.ecology.census(), s = view.ecology.stats, d = s.deaths;
  el.innerHTML = `🐇 <b>${c.total}</b> &nbsp; 🍼${c.stages[0]} 🌱${c.stages[1]} 💪${c.stages[2]} 👴${c.stages[3]}<br>♂${c.males} ♀${c.females} 🤰${c.pregnant}<br>🕳️ ${c.warrens} tocas (vazias: ${c.empty}) · 🌱 pasto ${Math.round(c.pool)}<br>🍼 nascimentos <b>${s.births}</b> · ✝ mortes ⏳${d.idade} 🥕${d.fome} ⚠️${d.acidente} 🥶${d.frio} 🏘️${d.lotacao}<br>🚶 mudanças ${s.dispersed} · 🕳️ novas tocas ${s.colonized} · 🛬 chegadas ${s.immigrated || 0}`;
}

/** Ponto de entrada. */
(function main() {
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('scene');
  const loading = document.getElementById('loading');
  const speciesBank = new SpeciesBank();
  buildCatalog(speciesBank);
  buildPeopleCatalog();
  buildRabbitCatalog();
  const start = (seed) => new Promise((resolve) => {
    loading.hidden = false;
    setTimeout(() => { const w = generateWorld(seed); loading.hidden = true; resolve(w); }, 30);
  });
  start(1).then((world) => {
    const view = new MapView(canvas, stage, world);
    window.view = view;
    view.hud = new VitalsHud();
    view.notify('Toque: andar, beber, colher · Arraste: câmera · Pinça: zoom', 'info', 'hint', 7000);
    const speeds = [1, 4, 12];
    let speedI = 0;
    document.getElementById('speedBtn').addEventListener('click', () => {
      speedI = (speedI + 1) % speeds.length;
      view.timeScale = speeds[speedI];
      document.getElementById('speedBtn').textContent = speedI ? `⏩${speeds[speedI]}×` : '⏩';
      view.notify(`⏩ Tempo ${speeds[speedI]}×`, 'info', 'tempo2', 1500);
    });
    document.getElementById('seasonBtn').addEventListener('click', () => {
      // vai para o meio da próxima estação, mantendo a hora do dia
      const next = (Math.floor(view.world.sp) + 1) % 4;
      let sp0 = view.world.sp, target = view.clock + (((next + 0.45) - sp0 + 4) % 4) * SEASON_SECONDS;
      target = target - (target % DAY_SECONDS) + (view.clock % DAY_SECONDS);
      view.clock = target;
      view.notify(`${SEASONS[next].icon} ${SEASONS[next].name}`);
    });
    const minimap = new Minimap(document.getElementById('miniCanvas'), view);
    window.minimap = minimap;
    document.getElementById('mini').addEventListener('click', () => minimap.toggle());
    const showLabel = (text) => view.notify(text, 'info', 'label', 3000);
    const tap = (e) => {
      const p = view.toWorld(e.clientX, e.clientY);
      const S = view.adamS;
      if (S.action) { if (S.action.type === 'faint' || S.action.type === 'sleep') return; S.endAction(); }
      if (view.evaAt(p.x, p.y)) {
        const s = view.eva.surv;
        showLabel(`👩 ${view.eva.doingIcon()} 🍖${Math.round(s.food)} 💧${Math.round(s.water)} 🌡${s.temp.toFixed(1)}° ⚡${Math.round(s.energy)} ❤${Math.round(s.health)}`);
        return;
      }
      // planta comestível sob o toque
      const cam = view.camera(), sx = p.x - cam.x, sy = p.y - cam.y;
      const ra = view.rabbits.at(sx, sy);
      if (ra) {
        const d = ra.d;
        showLabel(`🐇${d.sex === 'F' ? '♀' : '♂'} ${STAGE_ICON[d.stage]} ⏳${Math.floor(d.age / 60)}m 🥕${Math.round(d.food)} ❤${Math.round(d.health)}${d.preg > 0 ? ' 🤰' : ''}`);
        return;
      }
      const bw = view.ecology.burrowAt(p.x, p.y);
      if (bw) { showLabel(`🕳️ 🐇${bw.members.length} 🌱${Math.round(bw.pool)}`); return; }
      const pr = view.plantRects.filter((r) => sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h).sort((u, v) => v.p.y - u.p.y)[0];
      if (pr) {
        if (isPoison(pr.p)) { view.notify('Cogumelo vermelho: venenoso. Melhor não comer!'); return; }
        const ed = edibleOf(pr.p);
        if (!edibleNow(pr.p, view.season)) { view.notify(`${ed.name}: ainda não é a época.`); return; }
        if (view.isHarvested(pr.p)) { view.notify(`${ed.name}: já colhido, vai demorar a renascer.`); return; }
        view.intent = { type: 'gather', p: pr.p };
        view.walker.goTo(pr.p.x, pr.p.y + (SOLID[pr.p.id] ? 4 : 0));
        return;
      }
      // água: lago (bebe), gelo (come) ou mar (salgada)
      const bio = view.world.biomeAt(p.x, p.y);
      if (bio === BIOME.LAKE || bio === BIOME.ICE) { view.intent = { type: 'drink' }; view.walker.goTo(p.x, p.y); return; }
      if (bio === BIOME.SHALLOW || bio === BIOME.DEEP) view.notify('A água do mar é salgada: não dá para beber.');
      view.intent = null;
      view.walker.goTo(p.x, p.y);
    };
    // toque rápido = mandar o Adão; arrastar = mover a câmera; pinça ou roda = zoom
    let down = null, pinch = null;
    const pts = new Map();
    const fracOf = (x, y) => { const r = canvas.getBoundingClientRect(); return [(x - r.left) / r.width, (y - r.top) / r.height]; };
    const hideHint = () => { const hint = document.getElementById('hint'); if (hint) hint.style.display = 'none'; };
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const [p, q] = [...pts.values()];
        pinch = { d: Math.max(1, Math.hypot(p.x - q.x, p.y - q.y)) };
        down = null;
        canvas.classList.remove('panning');
        hideHint();
      } else if (pts.size === 1) {
        down = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false };
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size >= 2) {
        const [p, q] = [...pts.values()];
        const d = Math.hypot(p.x - q.x, p.y - q.y), ratio = d / pinch.d;
        const [ax, ay] = fracOf((p.x + q.x) / 2, (p.y + q.y) / 2);
        if (ratio > 1.28) { view.setScale(view.scale + 1, ax, ay); pinch.d = d; }
        else if (ratio < 0.78) { view.setScale(view.scale - 1, ax, ay); pinch.d = d; }
        return;
      }
      if (!down || down.id !== e.pointerId) return;
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8) return;
      down.moved = true;
      canvas.classList.add('panning');
      view.panBy(-(e.clientX - down.lx) / view.scale, -(e.clientY - down.ly) / view.scale);
      down.lx = e.clientX; down.ly = e.clientY;
      hideHint();
    });
    const endPointer = (e) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (!down || down.id !== e.pointerId) return;
      if (!down.moved && e.type === 'pointerup') { tap(e); hideHint(); }
      down = null;
      canvas.classList.remove('panning');
    };
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    let wheelAcc = 0;
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      wheelAcc += e.deltaY * (e.deltaMode === 1 ? 33 : 1);
      if (Math.abs(wheelAcc) < 60) return;
      const [ax, ay] = fracOf(e.clientX, e.clientY);
      view.setScale(view.scale + (wheelAcc < 0 ? 1 : -1), ax, ay);
      wheelAcc = 0;
      hideHint();
    }, { passive: false });
    view.onZoom = (s) => view.notify(`Zoom ${s}×`, 'info', 'zoom', 1200);
    document.getElementById('follow').addEventListener('click', () => view.follow());
    window.addEventListener('resize', () => view.resize());
    document.getElementById('zoomIn').addEventListener('click', () => view.setScale(view.scale + 1));
    document.getElementById('zoomOut').addEventListener('click', () => view.setScale(view.scale - 1));
    document.getElementById('newWorld').addEventListener('click', () => start(Math.floor(Math.random() * 9000) + 2).then((w) => { view.setWorld(w); minimap.build(); }));
    document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
      const cat = t.dataset.tab === 'catalog';
      document.getElementById('catalogView').hidden = !cat;
      canvas.style.visibility = cat ? 'hidden' : 'visible';
      document.getElementById('tools').style.display = cat ? 'none' : 'flex';
      document.getElementById('vitals').style.display = cat ? 'none' : 'block';
      document.getElementById('pops').style.display = cat ? 'none' : 'flex';
    }));
    const keyMap = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
    const held = new Set();
    const applyKeys = () => {
      let dx = 0, dy = 0;
      for (const k of held) { dx += keyMap[k][0]; dy += keyMap[k][1]; }
      view.walker.setKeys(clamp(dx, -1, 1), clamp(dy, -1, 1));
      if (!dx && !dy) view.walker.stop();
    };
    window.addEventListener('keydown', (e) => { if (e.key === '+' || e.key === '=') view.setScale(view.scale + 1); else if (e.key === '-') view.setScale(view.scale - 1); if (keyMap[e.key]) { held.add(e.key); applyKeys(); e.preventDefault(); } });
    window.addEventListener('keyup', (e) => { if (keyMap[e.key]) { held.delete(e.key); applyKeys(); } });
    let last = performance.now(), ecoT = 0;
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (let i = 0, k = view.timeScale || 1; i < k; i++) view.update(dt);
      ecoT -= dt;
      if (ecoT <= 0) { ecoT = 0.5; refreshEcology(view); }
      view.render();
      minimap.render(view.time);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
})();
