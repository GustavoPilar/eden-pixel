/** Duração de um dia (s de jogo = s reais) e hora em que o jogo começa. */
const DAY_SECONDS = 1200;
const START_HOUR = 8;

/** @param {number} clock relógio do jogo (s) @returns {number} hora do dia (0–24) */
function hourOf(clock) { return (START_HOUR + (clock / DAY_SECONDS) * 24) % 24; }

/**
 * Escuridão do céu por hora: 0 = dia, 1 = noite. O ciclo de 20 min tem 10 min de dia (6h–18h) e 10 min
 * de noite (18h–6h), com transições suaves de 4 h de jogo (≈3 min 20 s): tarde → noite e noite → amanhecer.
 * @param {number} hour hora (0–24) @returns {number}
 */
function darkness(hour) {
  const s = (x) => x * x * (3 - 2 * x);
  if (hour >= 20 || hour < 4) return 1;
  if (hour >= 16) return s((hour - 16) / 4);
  if (hour < 8) return 1 - s((hour - 4) / 4);
  return 0;
}

/** @param {number} h hora (0–24) @returns {string} "HH:MM" */
function fmtHour(h) { const m = Math.floor((h % 1) * 60); return `${String(Math.floor(h)).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }

/** Temperatura média do ar (°C) conforme a "latitude" (0 = polo Norte, 1 = Sul). */
const TEMP_ANCHORS = [[0, -28], [0.2, -14], [0.31, -4], [0.41, 3], [0.52, 15], [0.64, 24], [0.8, 28], [1, 31]];

/** Interpolação linear numa tabela [[x, y], ...]. */
function interp(table, x) {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) if (x <= table[i][0]) { const [x0, y0] = table[i - 1], [x1, y1] = table[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); }
  return table[table.length - 1][1];
}

/** Temperatura do ar (°C) num ponto do mundo, numa certa hora: clima da região + variação do dia. */
function ambientTemp(world, x, y, hour) {
  const b = world.biomeAt(x, y), t = world.tmp.t;
  let base = interp(TEMP_ANCHORS, t) + seasonOffset(t, b, world.sp), swing = 6;
  if (b === BIOME.DESERT) { base += 3; swing = 11; }
  else if (b === BIOME.JUNGLE || b === BIOME.SWAMP || b === BIOME.HUMID) { base += 1.5; swing = 3.5; }
  else if (b === BIOME.ICECAP) swing = 4;
  else if (BIOME_INFO[b].water || b === BIOME.BEACH) swing = 3.5;
  return base + swing * Math.sin(((hour - 9) / 24) * Math.PI * 2);
}

/** Árvores que fazem sombra. */
const SHADE_TREES = new Set(['oak', 'oakWet', 'birch', 'palm', 'jungleTree', 'cypress', 'spruce', 'spruceSnow']);

/** @returns {boolean} se há uma árvore de sombra bem perto do ponto */
function inShade(world, x, y) {
  const sz = LAYERS.L.size, cx = Math.floor(x / sz), cy = Math.floor(y / sz);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const p = world.plantAt('L', cx + dx, cy + dy);
    if (p && SHADE_TREES.has(p.id) && Math.hypot(p.x - x, (p.y - y) * 1.3) < 18) return true;
  }
  return false;
}

/** @returns {number} bioma de água (lago, gelo, mar) a até r px do ponto, ou -1 */
function waterBiomeNear(world, x, y, r) {
  let found = -1;
  for (let a = 0; a < 8; a++) for (const rr of [r * 0.5, r]) {
    const b = world.biomeAt(x + Math.cos(a * 0.785) * rr, y + Math.sin(a * 0.785) * rr);
    if (b === BIOME.LAKE) return b;
    if (BIOME_INFO[b].water && found < 0) found = b;
  }
  return found;
}

/** Procura água doce (lago) ao redor, em anéis; devolve um ponto dentro da água ou null. */
function findLake(world, x, y, maxR) {
  for (let r = 12; r <= maxR; r += 10) for (let a = 0; a < 16; a++) {
    const px = x + Math.cos(a * 0.3927) * r, py = y + Math.sin(a * 0.3927) * r;
    if (world.biomeAt(px, py) === BIOME.LAKE) return { x: px, y: py };
  }
  return null;
}

/**
 * O que dá para comer ou beber nas plantas: nome, comida e água que dão e quanto demora a renascer (s).
 * `v` = variantes que realmente têm fruto/cogumelo comestível.
 */
const EDIBLES = {
  bush: { name: 'Frutinhas', food: 11, water: 3, regrow: 300, v: [1] },
  bushWet: { name: 'Frutinhas silvestres', food: 11, water: 4, regrow: 300, v: [1] },
  mushroom: { name: 'Cogumelo marrom', food: 7, water: 0, regrow: 400, v: [1] },
  bigLeaf: { name: 'Bananas', food: 20, water: 2, regrow: 420 },
  palm: { name: 'Coco', food: 9, water: 32, regrow: 420 },
  barrel: { name: 'Cacto-barril (água)', food: 2, water: 26, regrow: 480 },
  saguaro: { name: 'Frutos de cacto', food: 10, water: 10, regrow: 420 },
  oak: { name: 'Bolotas', food: 6, water: 0, regrow: 360 },
  oakWet: { name: 'Bolotas', food: 6, water: 0, regrow: 360 },
  jungleTree: { name: 'Frutas da selva', food: 16, water: 6, regrow: 420 },
};

/** @returns {object|null} a ficha comestível da planta (ou null se não dá para comer) */
function edibleOf(p) { const e = EDIBLES[p.id]; return e && (!e.v || e.v.includes(p.v)) ? e : null; }

/** @returns {boolean} se é um cogumelo vermelho (venenoso) */
function isPoison(p) { return p.id === 'mushroom' && p.v !== 1; }

/** Chave única de uma planta (para marcar as já colhidas). */
function plantKey(p) { return `${p.id}:${p.x},${p.y}`; }

/** @returns {boolean} se há uma cama no ponto (por enquanto não existem camas: só se dorme desmaiando de sono) */
function hasBed(world, x, y) { return false; }

/** Uma pessoa (Adão ou Eva) com suas necessidades e a ação em andamento (beber, colher, dormir, desmaiar). */
class Survivor {
  /** @param {string} name @param {HopWalker} walker @param {World} world */
  constructor(name, walker, world) {
    this.name = name;
    this.walker = walker;
    this.world = world;
    this.food = 85;
    this.water = 85;
    this.energy = 95;
    this.temp = 36.5;
    this.health = 100;
    this.ambient = 20;
    this.action = null;
    this.lastHops = 0;
    this.quiet = false;
    this.warnAt = {};
    this.fxT = 0;
  }

  get sleeping() { return !!this.action && this.action.type === 'sleep'; }

  /** Começa uma ação parada (o personagem agacha e não anda até terminar). */
  startAction(type, dur, data = {}) {
    this.action = { type, t: 0, dur, data };
    this.walker.stop();
    this.walker.frozen = true;
    this.walker.forcePose = 'crouch';
  }

  /** Termina a ação atual. */
  endAction() {
    this.action = null;
    this.walker.frozen = false;
    this.walker.forcePose = null;
  }

  /** Aplica comida e água (limitadas a 100). */
  consume(food, water) {
    this.food = clamp(this.food + food, 0, 100);
    this.water = clamp(this.water + water, 0, 100);
  }

  /** Avisa uma vez a cada `gap` segundos (só o Adão fala, a menos que seja grave). */
  warn(env, key, text, gap = 30, urgent = false) {
    if (this.quiet && !urgent) return;
    if (env.clock - (this.warnAt[key] ?? -1e9) < gap) return;
    this.warnAt[key] = env.clock;
    env.notify(`${this.name}: ${text}`, 'warn');
  }

  /** @param {number} dt @param {{clock: number, hour: number, partner: HopWalker, notify: Function, harvest: Function, fx: Array}} env */
  update(dt, env) {
    const w = this.walker;
    // custo dos pulos
    const hops = w.hopCount - this.lastHops;
    this.lastHops = w.hopCount;
    this.energy -= hops * 0.35;
    // clima e temperatura do corpo
    const hour = env.hour, Ta = ambientTemp(this.world, w.x, w.y, hour);
    this.ambient = Ta;
    let eff = Ta;
    if (Ta > 24 && inShade(this.world, w.x, w.y)) eff -= 5;
    if (Ta > 26 && waterBiomeNear(this.world, w.x, w.y, 20) >= 0) eff -= 3;
    if (Ta < 20 && Math.hypot(env.partner.x - w.x, env.partner.y - w.y) < 28) eff += 3;
    if (w.goal || w.hop) eff += 2;
    if (this.sleeping) eff += 1.5;
    const wk = env.weather && env.weather.intensity > 0.05 ? env.weather : null;
    if (wk) eff -= WEATHER_COLD[wk.kind] * wk.intensity;
    const target = clamp(36.5 + 0.2 * (eff - 17), 24, 42);
    this.temp += ((target - this.temp) * dt) / 90;
    // fome, sede e energia
    const asleep = this.sleeping || (this.action && this.action.type === 'faint');
    const cold = this.temp < 35.3;
    this.food -= dt * (asleep ? 0.06 : 0.165) * (cold ? 1.5 : 1);
    this.water -= dt * (asleep ? 0.16 : 0.32) * (Ta > 30 ? 1 + Math.min(1.2, (Ta - 30) * 0.06) : 1) * (cold ? 0.85 : 1) * (wk && wk.kind === 'sand' ? 1 + 0.8 * wk.intensity : 1);
    if (this.sleeping) this.energy += dt * (this.action.data.bed ? 0.9 : 0.6);
    else if (!asleep) this.energy -= dt * ((w.goal || w.hop) ? 0.12 : 0.07);
    this.food = clamp(this.food, 0, 100);
    this.water = clamp(this.water, 0, 100);
    this.energy = clamp(this.energy, 0, 100);
    // andar mais devagar quando cansado; tremer de frio
    w.speedMul = (this.energy < 20 ? 0.65 : 1) * (wk ? 1 - (1 - WEATHER_SLOW[wk.kind]) * wk.intensity : 1);
    w.shiver = this.temp < 35.3 && !asleep;
    // ação em andamento
    const a = this.action;
    this.fxT -= dt;
    if (a) {
      a.t += dt;
      if (a.type === 'drink') {
        this.water = clamp(this.water + dt * (a.data.ice ? 5 : 14), 0, 100);
        if (a.data.ice) this.temp -= dt * 0.02;
        if (this.fxT <= 0) { this.fxT = 0.22; env.fx.push({ type: 'drop', x: w.x + 5, y: w.y - 3, t: 0 }); }
        if (a.t >= a.dur) this.endAction();
      } else if (a.type === 'gather') {
        if (a.t >= a.dur) {
          const p = a.data.p, e = edibleOf(p);
          if (e) { this.consume(e.food, e.water); env.harvest(p, e); for (let i = 0; i < 5; i++) env.fx.push({ type: 'spark', x: w.x + (i - 2) * 2, y: w.y - 16, t: -i * 0.06 }); if (!this.quiet) env.notify(`${this.name}: ${e.name} (+${e.food} comida${e.water ? `, +${e.water} água` : ''})`, 'good'); }
          this.endAction();
        }
      } else if (a.type === 'sleep') {
        if (this.fxT <= 0) { this.fxT = 1.1; env.fx.push({ type: 'zzz', x: w.x + 4, y: w.y - 24, t: 0 }); }
        const wake = a.data.bed ? 100 : 40;
        if (this.energy >= wake) { this.endAction(); if (!this.quiet) env.notify(a.data.bed ? `${this.name} acordou descansado` : `${this.name} acordou, ainda cansado`, a.data.bed ? 'good' : 'info'); }
      } else if (a.type === 'faint') {
        if (a.t >= a.dur) {
          this.endAction();
          this.health = 30; this.food = Math.max(this.food, 30); this.water = Math.max(this.water, 30); this.energy = Math.max(this.energy, 40);
          this.temp = clamp(this.temp, 35.4, 38);
          env.notify(`${this.name} acordou fraco, mas vivo`);
        }
      }
    } else if (this.energy <= 0) {
      this.startAction('sleep', null, { forced: true });
      this.warn(env, 'exausto', 'desmaiou de sono!', 20, true);
    }
    // dano e recuperação
    let dmg = 0;
    if (this.water <= 0) dmg += 0.6;
    if (this.food <= 0) dmg += 0.25;
    if (this.temp < 34.5) dmg += Math.min(2, (34.5 - this.temp) * 0.25);
    if (this.temp > 39.5) dmg += Math.min(2, (this.temp - 39.5) * 0.4);
    if (dmg > 0) this.health -= dmg * dt;
    else if (this.food > 40 && this.water > 40 && this.temp > 35.5 && this.temp < 38) this.health += 0.3 * dt;
    this.health = clamp(this.health, 0, 100);
    if (this.health <= 0 && !(this.action && this.action.type === 'faint')) {
      this.startAction('faint', 8);
      this.warn(env, 'desmaio', 'desmaiou!', 10, true);
    }
    // avisos
    if (this.water < 25) this.warn(env, 'sede', 'está com sede!');
    if (this.food < 25) this.warn(env, 'fome', 'está com fome!');
    if (this.temp < 35) this.warn(env, 'frio', 'está com frio!');
    if (this.temp > 38.3) this.warn(env, 'calor', 'está com calor demais!');
    if (this.energy < 20 && !asleep) this.warn(env, 'cansaco', 'muito cansado: vai desmaiar de sono');
    if (this.health < 30) this.warn(env, 'saude', 'está com a saúde baixa!', 25, true);
  }

  /** @returns {string} descrição curta da temperatura do corpo */
  tempLabel() {
    const t = this.temp;
    return t < 32 ? 'congelando' : t < 34.5 ? 'hipotermia' : t < 35.5 ? 'com frio' : t <= 37.6 ? 'normal' : t <= 38.5 ? 'quente' : t < 39.5 ? 'febre' : 'hipertermia';
  }
}

/** Ícone de cada ambiente (o nome não aparece mais no painel). */
const BIOME_ICON = ['🌊', '🌊', '🏖️', '🏞️', '🧊', '🏜️', '❄️', '🏔️', '🌿', '🌲', '🌳', '🌴', '🪷', '🧊'];

/** Painel de uma linha só, com ícones e números: ambiente, hora, temperatura do ar e as necessidades do Adão. */
class VitalsHud {
  constructor() {
    this.root = document.getElementById('vitals');
    this.rows = {};
    for (const k of ['food', 'water', 'temp', 'energy', 'health']) {
      const row = this.root.querySelector(`[data-k="${k}"]`);
      this.rows[k] = { row, num: row.querySelector('b') };
    }
    this.clock = document.getElementById('clockRow');
    this.wicon = document.getElementById('weatherIcon');
    this.season = document.getElementById('seasonRow');
    this.amb = document.getElementById('ambRow');
    this.actEl = document.getElementById('actRow');
  }

  /** @param {Survivor} s Adão @param {Survivor} e Eva (não aparece no painel) @param {number} hour @param {number} sp @param {Weather} weather */
  update(s, e, hour, sp, weather) {
    const set = (k, text, low, color = '') => {
      const r = this.rows[k];
      r.num.textContent = text;
      r.num.style.color = color;
      r.row.classList.toggle('low', low);
    };
    set('food', Math.round(s.food), s.food < 25);
    set('water', Math.round(s.water), s.water < 25);
    set('energy', Math.round(s.energy), s.energy < 25);
    set('health', Math.round(s.health), s.health < 25);
    const t = s.temp;
    set('temp', t.toFixed(1), t < 35 || t > 38.5, t < 35.8 ? '#2f78c4' : t > 38.2 ? '#d0541c' : '');
    this.rows.temp.row.title = `Temperatura do corpo: ${s.tempLabel()}`;
    const d = darkness(hour), si = Math.floor(sp) % 4;
    this.wicon.textContent = weather && weather.intensity > 0.12 ? WEATHER_ICON[weather.kind] : '';
    this.season.textContent = SEASONS[si].icon;
    this.season.title = `${SEASONS[si].name} (${Math.round((sp - Math.floor(sp)) * 100)}%)`;
    this.clock.textContent = `${d > 0.75 ? '🌙' : d > 0.04 ? (hour < 12 ? '🌅' : '🌇') : '☀️'}${fmtHour(hour)}`;
    this.amb.textContent = `${s.ambient <= 0 ? '🥶' : s.ambient >= 32 ? '🥵' : '🌤️'}${Math.round(s.ambient)}°`;
    this.amb.title = 'Temperatura do ar';
    this.actEl.textContent = s.action ? { sleep: '😴', drink: '💧', gather: '🧺', faint: '😵' }[s.action.type] : '';
  }
}

/** @returns {boolean} se há um bioma específico no ponto ou a até r px dele */
function biomeNear(world, x, y, r, id) {
  if (world.biomeAt(x, y) === id) return true;
  for (let a = 0; a < 8; a++) if (world.biomeAt(x + Math.cos(a * 0.785) * r, y + Math.sin(a * 0.785) * r) === id) return true;
  return false;
}

/**
 * Tenta começar a ação pedida (beber ou colher) quando a pessoa chegou ao destino.
 * @param {{world: World, isHarvested: Function, notify: Function}} ctx @param {Survivor} surv @param {{type: string, p?: object}} it @param {boolean} say se avisa quando falha
 * @returns {boolean}
 */
function tryStartIntent(ctx, surv, it, say) {
  const w = surv.walker, world = ctx.world;
  if (it.type === 'drink') {
    if (waterBiomeNear(world, w.x, w.y, 14) === BIOME.LAKE) { surv.startAction('drink', 3.4, { ice: false }); return true; }
    if (biomeNear(world, w.x, w.y, 10, BIOME.ICE)) { surv.startAction('drink', 3.4, { ice: true }); if (say) ctx.notify('Comendo gelo: mata a sede, mas esfria o corpo.'); return true; }
    if (say) ctx.notify('Não consegui chegar até a água.');
    return false;
  }
  if (it.type === 'gather') {
    const p = it.p;
    if (!edibleNow(p, ctx.season)) { if (say) ctx.notify('Ainda não é a época desta comida.'); return false; }
    if (ctx.isHarvested(p)) { if (say) ctx.notify('Já foi colhido. Vai demorar para crescer de novo.'); return false; }
    if (Math.hypot(p.x - w.x, (p.y - w.y) * 1.2) > 26) { if (say) ctx.notify('Não consegui chegar perto.'); return false; }
    surv.startAction('gather', 1.4, { p });
    return true;
  }
  return false;
}
// ---------------------------------------------------------------------
// Personagem pulador (com colisão na água), mapa, catálogo e interface
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Estações do ano: clima, cores do chão e das plantas, gelo nos lagos,
// comida de época e tempo (chuva e neve), cada ambiente do seu jeito.
// ---------------------------------------------------------------------

