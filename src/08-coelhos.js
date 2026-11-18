/** Grade com escala: desenha em coordenadas "grandes" e entrega o sprite menor, em pixels inteiros. */
class ScaledGrid {
  /** @param {number} w @param {number} h @param {number} s */
  constructor(w, h, s) {
    this.s = s;
    this.grid = new PixelGrid(Math.max(4, Math.ceil(w * s)), Math.max(4, Math.ceil(h * s)));
    this.w = this.grid.w;
    this.h = this.grid.h;
  }

  set(x, y, c) { this.grid.set(Math.round(x * this.s), Math.round(y * this.s), c); }

  get(x, y) { return this.grid.get(Math.round(x * this.s), Math.round(y * this.s)); }

  put(x, y, c) { this.grid.set(x, y, c); }

  pget(x, y) { return this.grid.get(x, y); }

  toCanvas() { return this.grid.toCanvas(); }

  mirrored() { return this.grid.mirrored(); }
}

const RB_F = ['#5e4230', '#8a6444', '#b48a5c', '#d4ae80'];
const RB_CR = ['#d2b48c', '#e4cba6', '#f0dcc0', '#fbf0dc'];
const RB_WH = ['#c8ccd8', '#e0e4ec', '#f4f6fa', '#ffffff'];
const RB_OLD = ['#6a5a50', '#8e8070', '#b4a898', '#d4ccc0'];
const RB_OLD_CR = ['#c4baae', '#d6cec2', '#e6e0d6', '#f4f0e8'];

/**
 * Desenha um quadro do coelho (olhando para a direita) em escala `s`.
 * Filhote: menor, cabeça grande; idoso: pelo grisalho.
 * @param {string} frame idle | w0 | w1 | eat0 | eat1 | act0 | act1 @param {number} s @param {boolean} kit @param {boolean} old
 */
function drawBunnyS(frame, s, kit, old) {
  const W = 16, H = 19, gy = 17, g = new ScaledGrid(W, H, s);
  const F = old ? RB_OLD : RB_F, CR = old ? RB_OLD_CR : RB_CR, WH = RB_WH;
  const PINK = '#f09aa0', INNER = '#f4b4b4', EYE = '#2a1818';
  const P = (v) => Math.round(v * s), hs = kit ? 1.2 : 1, bs = kit ? 0.85 : 1;
  const ear = (bx, by, tx, ty) => {
    fillCapsule(g, bx, by, tx, ty, 1.25, F);
    thickLine(g, bx + (tx - bx) * 0.12, by + (ty - by) * 0.12, bx + (tx - bx) * 0.5, by + (ty - by) * 0.5, 1, () => INNER);
  };
  const face = (hx, hy, puff) => {
    fillBlob(g, hx, hy, 3.5 * hs, 3.1 * hs, F, 0.1);
    if (puff) fillBlob(g, hx + 0.4, hy + 1.6, 2.9 * hs, 2.1 * hs, F, 0.1);
    fillBlob(g, hx + 2.3 * hs, hy + 1.3 * hs, 1.5, 1.2, CR, 0.1);
    g.put(P(hx + 3.7 * hs), P(hy + 0.6 * hs), PINK);
    const ex = P(hx + 0.9 * hs), ey = P(hy - 1.4 * hs);
    const eye = s >= 0.85 ? [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]] : [[0, 0], [1, 0], [0, 1], [1, 1]];
    for (const [dx, dy] of eye) g.put(ex + dx, ey + dy, EYE);
    g.put(ex, ey, '#ffffff');
    if (s >= 0.7) g.put(P(hx - 0.4), P(hy + 1.9 * hs), INNER);
  };
  const tail = (x, y) => fillBlob(g, x, y, 1.6, 1.6, WH, 0.1);
  let head;
  if (frame === 'w0') {
    thickLine(g, 5, gy - 3.4, 2.2, gy - 0.5, 2, () => CR[1]);
    fillBlob(g, 5.4, gy - 3.8, 3.2 * bs, 3 * bs, F, 0.1);
    fillBlob(g, 8.8, gy - 3.4, 3.8 * bs, 2.6 * bs, F, 0.1);
    thickLine(g, 12, gy - 2.2, 14.2, gy - 0.6, 1.6, () => CR[1]);
    tail(2.4, gy - 5.4);
    head = [12.2, gy - 5.2];
    ear(head[0] - 1.2, head[1] - 2, head[0] - 5.4, head[1] - 4.6); ear(head[0] + 0.3, head[1] - 2.3, head[0] - 3.6, head[1] - 5.2);
    face(head[0], head[1], false);
  } else if (frame === 'w1') {
    thickLine(g, 4, gy - 8, 0.8, gy - 5.8, 1.8, () => CR[1]);
    thickLine(g, 11.5, gy - 7, 15.2, gy - 5.4, 1.6, () => CR[1]);
    fillBlob(g, 5.6, gy - 8.4, 3.4 * bs, 2.8 * bs, F, 0.1);
    fillBlob(g, 9.6, gy - 8.6, 3.4 * bs, 2.6 * bs, F, 0.1);
    tail(2.2, gy - 9.6);
    head = [12.6, gy - 9.6];
    ear(head[0] - 1.2, head[1] - 2, head[0] - 6, head[1] - 3.2); ear(head[0] + 0.3, head[1] - 2.3, head[0] - 4.4, head[1] - 3.8);
    face(head[0], head[1], false);
  } else if (frame === 'act0' || frame === 'act1') {
    fillBlob(g, 6.4, gy - 3.4, 3.4 * bs, 3.2 * bs, F, 0.1);
    fillBlob(g, 8, gy - 6.6, 2.7 * bs, 3.6 * bs, F, 0.1);
    fillBlob(g, 7.2, gy - 0.8, 2.8, 0.9, CR, 0.1);
    tail(3.2, gy - 4.4);
    head = [8.8, gy - 10.6];
    ear(head[0] - 1.1, head[1] - 2, head[0] - 1.6, head[1] - 6.6);
    ear(head[0] + 0.8, head[1] - 2.2, head[0] + (frame === 'act1' ? 2.6 : 0.9), head[1] - (frame === 'act1' ? 5.8 : 6.8));
    face(head[0], head[1], false);
    fillBlob(g, head[0] + 1.4, head[1] + 3.6, 1.3, 1.0, CR, 0.1); fillBlob(g, head[0] - 0.2, head[1] + 3.8, 1.2, 0.9, CR, 0.1);
  } else {
    const eating = frame === 'eat0' || frame === 'eat1';
    fillBlob(g, 5.4, gy - 2.8, 3.2 * bs, 2.7 * bs, F, 0.1);
    fillBlob(g, 7.8, gy - 3.0, 2.5 * bs, 2.5 * bs, F, 0.1);
    fillBlob(g, 7, gy - 0.6, 2.2, 0.8, CR, 0.1);
    tail(2.2, gy - 3.4);
    head = eating ? [10.6, gy - 3.6] : [9.8, gy - 6.2];
    if (eating) { ear(head[0] - 1.2, head[1] - 2, head[0] - 4.2, head[1] - 5.6); ear(head[0] + 0.3, head[1] - 2.3, head[0] - 1.8, head[1] - 6); }
    else { ear(9, gy - 8.2, 7.9, gy - 12.6); ear(10.8, gy - 8.4, 10.9, gy - 12.8); }
    face(head[0], head[1], frame === 'eat1');
    fillBlob(g, head[0] + 1.6, gy - 1.2, 1.2, 0.9, CR, 0.1);
  }
  addOutline(g, '#4a3220');
  return { g, mouth: { x: P(head[0] + 3.6), y: P(head[1] + 1.6) } };
}

/** Escala de cada fase da vida: filhote, jovem, adulto e idoso. */
const STAGE_SCALE = [0.55, 0.8, 1, 1];
const STAGE_ICON = ['🍼', '🌱', '💪', '👴'];

/** Guarda os quadros do coelho de cada fase (e espelhados, para olhar à esquerda). */
class RabbitSprites {
  constructor() { this.cache = {}; }

  /** @returns {{canvas: HTMLCanvasElement, mouth: {x: number, y: number}}} */
  get(frame, stage, left = false) {
    const key = `${frame}:${stage}`;
    let e = this.cache[key];
    if (!e) {
      const r = drawBunnyS(frame, STAGE_SCALE[stage], stage === 0, stage === 3);
      e = { canvas: r.g.toCanvas(), mirror: null, g: r.g, mouth: r.mouth };
      this.cache[key] = e;
    }
    if (left) {
      if (!e.mirror) e.mirror = e.g.mirrored().toCanvas();
      return { canvas: e.mirror, mouth: { x: e.g.w - 1 - e.mouth.x, y: e.mouth.y } };
    }
    return { canvas: e.canvas, mouth: e.mouth };
  }
}

/** Desenha a entrada de uma toca (terra amassada com um buraco escuro). */
function makeBurrowSprite() {
  const c = document.createElement('canvas');
  c.width = 14; c.height = 8;
  const x = c.getContext('2d');
  const px = (cx, cy, col) => { x.fillStyle = col; x.fillRect(cx, cy, 1, 1); };
  for (let y = 0; y < 8; y++) for (let xx = 0; xx < 14; xx++) {
    const dx = (xx + 0.5 - 7) / 6.6, dy = (y + 0.5 - 4.2) / 3.4, d = dx * dx + dy * dy;
    if (d > 1) continue;
    const ix = (xx + 0.5 - 7) / 4.2, iy = (y + 0.5 - 4.6) / 2.1;
    if (ix * ix + iy * iy < 1) px(xx, y, iy < -0.3 ? '#2a1a10' : '#3c2818');
    else px(xx, y, d > 0.8 ? '#6e5236' : dy < -0.1 ? '#b8946a' : '#9a7650');
  }
  for (const [a, b] of [[2, 1], [11, 6], [12, 2]]) px(a, b, '#cdb089');
  return c;
}

// ---------- dados do ciclo de vida ----------
/**
 * Tempos em segundos de jogo: filhote até 150, jovem até 420 (maturidade), adulto até 30 min antes do fim da vida, depois idoso; vida de 100 a 160 min (1 a 1,7 anos de jogo).
 * Gestação de 120 s e intervalo de 700 s entre ninhadas; ninhada de 2 a 4; lotação de 7 por toca; só nascem filhotes se houver pasto.
 */
const RABBIT = { kit: 150, young: 420, adult: 2400, gest: 120, cool: 700, lifeMin: 6000, lifeMax: 9600, cap: 7, cell: 140 };
let RABBIT_SEQ = 1;

/** Um coelho (dados que existem o tempo todo, mesmo longe da câmera). */
class Rabbit {
  /** @param {'M'|'F'} sex @param {number} age */
  constructor(sex, age) {
    this.id = RABBIT_SEQ++;
    this.sex = sex;
    this.age = age;
    this.life = RABBIT.lifeMin + Math.random() * (RABBIT.lifeMax - RABBIT.lifeMin);
    this.food = 70 + Math.random() * 25;
    this.health = 100;
    this.preg = 0;
    this.cool = Math.random() * 240;
    this.mated = -1e9;
    this.checked = false;
    this.dead = false;
    this.actor = null;
  }

  /** @returns {number} fase: 0 filhote, 1 jovem, 2 adulto, 3 idoso */
  get stage() { return this.age < RABBIT.kit ? 0 : this.age < RABBIT.young ? 1 : this.age < this.life - 1800 ? 2 : 3; }
}

/** Uma toca com a família que mora nela e o capim disponível ao redor ("pasto"). */
class Warren {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    /** @type {Rabbit[]} */
    this.members = [];
    this.pool = 60 + Math.random() * 30;
    this.snow = 0;
    this.skey = -1;
    this.near = false;
    this.rect = null;
  }
}

const RABBIT_BIOMES = new Set([BIOME.MEADOW, BIOME.FOREST, BIOME.HUMID, BIOME.BEACH]);

/** Simula a população de coelhos do mundo todo: nascimentos, mortes, dispersão e novas tocas. */
class Ecology {
  /** @param {World} world @param {{x: number, y: number}} spawn */
  constructor(world, spawn) {
    this.world = world;
    /** @type {Warren[]} */
    this.warrens = [];
    this.stats = { births: 0, deaths: { idade: 0, fome: 0, acidente: 0, frio: 0, lotacao: 0 }, dispersed: 0, colonized: 0 };
    /** @type {Array<object>} */
    this.events = [];
    this.nextId = 1;
    this.immT = 0;
    this.stats.immigrated = 0;
    const S = RABBIT.cell;
    for (let cy = 0; cy * S < world.h; cy++) for (let cx = 0; cx * S < world.w; cx++) {
      const x = (cx + 0.15 + 0.7 * hash2(cx * 3 + 1, cy * 5 + 2)) * S, y = (cy + 0.15 + 0.7 * hash2(cx * 7 + 3, cy * 11 + 4)) * S;
      const b = world.biomeAt(x, y), p = b === BIOME.MEADOW ? 0.3 : b === BIOME.FOREST ? 0.18 : 0;
      if (!p || hash2(cx * 13 + 5, cy * 17 + 6) > p || !world.canStand(x, y)) continue;
      this.addWarren(x, y, true);
    }
    this.initialWarrens = this.warrens.length;
    this.maxWarrens = Math.round(this.warrens.length * 1.5) + 2;
    this.initialTotal = this.warrens.reduce((s, w) => s + w.members.length, 0);
    // garante uma toca perto de onde o jogo começa
    if (!this.warrens.some((w) => Math.hypot(w.x - spawn.x, w.y - spawn.y) < 240)) {
      for (let r = 110; r < 220; r += 15) for (let a = 0; a < 6.28; a += 0.5) {
        const x = spawn.x + Math.cos(a) * r, y = spawn.y + Math.sin(a) * r;
        if (this.validSpot(x, y, 80)) { this.addWarren(x, y, true); r = 999; break; }
      }
    }
  }

  /** @returns {boolean} se dá para cavar uma toca ali (terreno livre e longe de outras tocas) */
  validSpot(x, y, minDist) {
    const w = this.world;
    if (!RABBIT_BIOMES.has(w.biomeAt(x, y)) || !w.canStand(x, y) || w.biomeAt(x, y) === BIOME.BEACH) return false;
    return !this.warrens.some((o) => Math.hypot(o.x - x, o.y - y) < minDist);
  }

  /** Cria uma toca (com uma família inicial, se `populate`). */
  addWarren(x, y, populate) {
    const w = new Warren(this.nextId++, x, y);
    if (populate) {
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) w.members.push(new Rabbit(i % 2 ? 'M' : 'F', 500 + Math.random() * 1900));
      for (let i = 0; i < Math.floor(Math.random() * 3); i++) w.members.push(new Rabbit(Math.random() < 0.5 ? 'M' : 'F', 160 + Math.random() * 250));
    }
    this.warrens.push(w);
    return w;
  }

  /** Remove um coelho da toca e registra a causa da morte. */
  kill(w, m, cause) {
    const i = w.members.indexOf(m);
    if (i >= 0) w.members.splice(i, 1);
    m.dead = true;
    this.stats.deaths[cause]++;
    this.events.push({ type: 'death', x: w.x, y: w.y, cause, stage: m.stage });
  }

  /** Jovem que cresceu: se a toca está cheia (ou por instinto), vai morar em outra ou funda uma nova. */
  disperse(w, m) {
    const targets = this.warrens.filter((o) => o !== w && o.members.length < 4 && Math.hypot(o.x - w.x, o.y - w.y) < 520).sort((a, b) => a.members.length - b.members.length || Math.hypot(a.x - w.x, a.y - w.y) - Math.hypot(b.x - w.x, b.y - w.y));
    const move = (to, list) => {
      for (const r of list) { w.members.splice(w.members.indexOf(r), 1); r.actor = null; to.members.push(r); }
    };
    if (targets.length && Math.random() < 0.85) {
      move(targets[0], [m]);
      this.stats.dispersed++;
      this.events.push({ type: 'move', x: w.x, y: w.y });
      return;
    }
    for (let k = 0; k < 8 && this.warrens.length < this.maxWarrens; k++) {
      const a = Math.random() * 6.28, r = 150 + Math.random() * 110, x = w.x + Math.cos(a) * r, y = w.y + Math.sin(a) * r;
      if (!this.validSpot(x, y, 100)) continue;
      const nw = this.addWarren(x, y, false);
      const mate = w.members.find((o) => o !== m && o.stage === 1 && o.sex !== m.sex);
      move(nw, mate ? [m, mate] : [m]);
      this.stats.colonized++;
      this.events.push({ type: 'colonize', x: nw.x, y: nw.y });
      return;
    }
  }

  /** Um passo de tempo para todas as tocas. @param {number} dt @param {{sp: number, clock: number, dark: number}} env */
  update(dt, env) {
    const si = Math.floor(env.sp) % 4, asleep = env.dark > 0.55;
    for (const w of this.warrens) {
      if (w.skey !== this.world.skey) {
        const b = this.world.biomeAt(w.x, w.y);
        w.snow = seasonLookAt(b, this.world.tmp.t, this.world.spq).snow;
        w.skey = this.world.skey;
      }
      // pasto: renasce conforme a estação (quase nada sob a neve)
      w.pool += Math.max([0.5, 0.6, 0.35, 0.12][si] * (1 - 0.85 * w.snow), 0.09) * (1 - w.pool / 100) * dt;
      w.pool = clamp(w.pool, 0, 100);
      for (const m of w.members.slice()) {
        m.age += dt;
        const st = m.stage;
        if (st === 0 && m.age < 120) m.food = Math.max(m.food, 70);
        else {
          m.food -= 0.12 * dt * (asleep ? 0.45 : 1) * (si === 3 ? 0.6 : 1);
          // longe da câmera os coelhos comem "por conta"; perto, eles comem de verdade (ver RabbitActor)
          if (!w.near && !asleep && m.food < 60 && w.pool > 3) { const eat = Math.min(60 - m.food, 0.2 * dt); m.food += eat; w.pool -= eat * 0.5; }
        }
        if (m.food <= 0) { m.food = 0; m.health -= 0.25 * dt; } else m.health = Math.min(100, m.health + 0.08 * dt);
        if (m.health <= 0) { this.kill(w, m, 'fome'); continue; }
        if (m.age >= m.life) { this.kill(w, m, 'idade'); continue; }
        if (Math.random() < 3e-5 * dt) { this.kill(w, m, 'acidente'); continue; }
        if (st === 0 && si === 3 && Math.random() < 0.0025 * dt) { this.kill(w, m, 'frio'); continue; }
        if (st === 1 && !m.checked && m.age > RABBIT.young - 8) {
          m.checked = true;
          if (w.members.length > 4 || Math.random() < 0.45) { this.disperse(w, m); continue; }
        }
        if (m.sex === 'F' && st >= 2) {
          m.cool -= dt;
          if (m.preg > 0) {
            m.preg -= dt;
            if (m.preg <= 0) this.birth(w, m);
          } else if (m.cool <= 0 && env.sp < 2.2 && m.food > 55 && w.pool > 30 && Math.random() < 0.012 * dt && this.maleNear(w)) {
            m.preg = RABBIT.gest;
            m.mated = env.clock;
            this.events.push({ type: 'mate', x: w.x, y: w.y });
          }
        }
      }
    }
    // rede de segurança: se quase não restam coelhos, um casal chega de fora do mapa a uma toca vazia
    this.immT += dt;
    if (this.immT > 1200) {
      this.immT = 0;
      const total = this.warrens.reduce((s, w) => s + w.members.length, 0);
      if (total < this.initialTotal * 0.2) {
        const empty = this.warrens.filter((w) => w.members.length < 2);
        if (empty.length) {
          const w = empty[Math.floor(Math.random() * empty.length)];
          w.members.push(new Rabbit('M', 600), new Rabbit('F', 600));
          this.stats.immigrated++;
          this.events.push({ type: 'colonize', x: w.x, y: w.y });
        }
      }
    }
    if (this.events.length > 60) this.events.splice(0, this.events.length - 60);
  }

  /** @returns {boolean} se há um macho adulto na toca ou numa toca vizinha (até 220 px) */
  maleNear(w) {
    for (const o of this.warrens) {
      if (o !== w && Math.hypot(o.x - w.x, o.y - w.y) > 220) continue;
      if (o.members.some((m) => m.sex === 'M' && m.stage >= 2)) return true;
    }
    return false;
  }

  /** Nasce uma ninhada (menor se a mãe estiver mal alimentada; na toca lotada, parte dos filhotes não sobrevive). */
  birth(w, mother) {
    const n = clamp(Math.round(2 + (mother.food - 60) / 30 + Math.random() * 1.5), 2, 4);
    let born = 0;
    for (let i = 0; i < n; i++) {
      if (w.members.length >= RABBIT.cap && Math.random() < 0.5) { this.stats.deaths.lotacao++; continue; }
      w.members.push(new Rabbit(Math.random() < 0.5 ? 'M' : 'F', 0));
      born++;
    }
    mother.cool = RABBIT.cool;
    this.stats.births += born;
    this.events.push({ type: 'birth', x: w.x, y: w.y, n: born });
  }

  /** @returns {Warren|null} toca perto do ponto */
  burrowAt(x, y) { return this.warrens.find((w) => Math.hypot(w.x - x, w.y - y) < 9) || null; }

  /** Contagens da população (para o painel de ecologia). */
  census() {
    const c = { total: 0, stages: [0, 0, 0, 0], males: 0, females: 0, pregnant: 0, warrens: this.warrens.length, empty: 0, pool: 0 };
    for (const w of this.warrens) {
      if (!w.members.length) c.empty++;
      c.pool += w.pool;
      for (const m of w.members) { c.total++; c.stages[m.stage]++; if (m.sex === 'M') c.males++; else c.females++; if (m.preg > 0) c.pregnant++; }
    }
    c.pool = this.warrens.length ? c.pool / this.warrens.length : 0;
    return c;
  }
}

// ---------- coelhos em cena ----------
/** Um coelho visível: anda, come, fica alerta, foge e se esconde na toca (dados em `d`). */
class RabbitActor {
  /** @param {Rabbit} d @param {Warren} w */
  constructor(d, w) {
    this.d = d;
    this.w = w;
    this.x = w.x;
    this.y = w.y;
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.state = 'idle';
    this.inside = true;
    this.emerge = Math.random() * 25;
    this.hide = 0;
    this.timer = 1;
    this.t = Math.random() * 10;
    this.frame = 'idle';
    this.lift = 0;
    this.act = null;
    this.actT = 0;
    this.target = null;
    this.fleeAng = 0;
    this.lastMated = d.mated;
    this.rect = null;
  }

  /** @returns {number} velocidade de andar (px/s) conforme a fase */
  get speed() { return [30, 36, 40, 28][this.d.stage]; }

  /** @returns {boolean} se pode pisar no ponto (capim, mata e areia; sem água nem obstáculos) */
  ok(world, x, y) { return RABBIT_BIOMES.has(world.biomeAt(x, y)) && !world.solidAt(x, y) && x > 8 && y > 8; }

  /** @param {number} dt @param {object} ctx */
  update(dt, ctx) {
    const d = this.d, w = this.w, st = d.stage, world = ctx.world;
    this.t += dt;
    if (this.inside) {
      this.hide = Math.max(0, this.hide - dt);
      if (!ctx.shelter && this.hide <= 0 && (st > 0 || d.age > 60)) {
        this.emerge -= dt;
        if (this.emerge <= 0) { this.inside = false; this.state = 'idle'; this.timer = 0.6; this.x = w.x + (Math.random() - 0.5) * 6; this.y = w.y + 3; ctx.fx.push({ type: 'puff', x: w.x, y: w.y, t: 0 }); }
      }
      return;
    }
    if (d.mated !== this.lastMated) { this.lastMated = d.mated; ctx.fx.push({ type: 'heart', x: this.x, y: this.y - 14, t: 0 }); }
    const range = st === 0 ? 20 : st === 1 ? 50 : 90;
    const toBurrow = Math.hypot(w.x - this.x, w.y - this.y);
    // abrigo: à noite ou com tempo ruim todos se recolhem
    if (ctx.shelter && this.state !== 'toHome') { this.state = 'toHome'; this.hide = 0; }
    // medo das pessoas: corre para a toca se ela estiver perto, senão foge
    if (this.state !== 'toHome' && this.state !== 'flee') {
      for (const o of ctx.people) {
        if (Math.hypot(o.x - this.x, o.y - this.y) < (st === 0 ? 30 : 55)) {
          if (toBurrow < 90) { this.state = 'toHome'; this.hide = 5 + Math.random() * 6; } else { this.state = 'flee'; this.timer = 1.2 + Math.random() * 0.8; this.fleeAng = Math.atan2(this.y - o.y, this.x - o.x) + (Math.random() - 0.5) * 0.8; }
          break;
        }
      }
    }
    const hop = Math.floor(this.t / 0.17) % 2 === 1;
    const move = (vx, vy, sp) => {
      if (Math.abs(vx) > 0.2) this.dir = vx > 0 ? 1 : -1;
      const len = Math.hypot(vx, vy) || 1, step = sp * dt, nx = this.x + (vx / len) * step, ny = this.y + (vy / len) * step;
      if (this.ok(world, nx, ny)) { this.x = nx; this.y = ny; return true; }
      if (this.ok(world, nx, this.y)) { this.x = nx; return true; }
      if (this.ok(world, this.x, ny)) { this.y = ny; return true; }
      return false;
    };
    if (this.state === 'toHome') {
      if (toBurrow < 3) { this.inside = true; this.state = 'idle'; this.emerge = 2 + Math.random() * 20; ctx.fx.push({ type: 'puff', x: w.x, y: w.y, t: 0 }); return; }
      move(w.x - this.x, w.y - this.y, this.speed * 2.3 * (hop ? 1.6 : 0.4));
      this.frame = hop ? 'w1' : 'w0';
    } else if (this.state === 'flee') {
      if (!move(Math.cos(this.fleeAng), Math.sin(this.fleeAng), this.speed * 2.3)) this.fleeAng += 1.2;
      this.frame = Math.floor(this.t / 0.1) % 2 === 0 ? 'w0' : 'w1';
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'idle'; this.timer = 1; }
    } else if (this.state === 'walk' && this.target) {
      const vx = this.target.x - this.x, vy = this.target.y - this.y, dist = Math.hypot(vx, vy);
      if (dist < 2 || !move(vx, vy, this.speed * (hop ? 2.2 : 0))) { this.state = 'idle'; this.timer = 0.5 + Math.random() * 2; }
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'idle'; this.timer = 0.5; }
      this.frame = hop ? 'w1' : 'w0';
    } else if (this.state === 'act') {
      this.actT += dt;
      this.frame = (this.act === 'eat' ? 'eat' : 'act') + (Math.floor(this.actT / 0.4) % 2);
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.act === 'eat' && w.pool > 5) { d.food = Math.min(100, d.food + 10); w.pool -= 5; ctx.fx.push({ type: 'spark', x: this.x, y: this.y - 8, t: 0 }); }
        this.state = 'idle'; this.timer = 0.5 + Math.random();
      }
    } else {
      this.frame = 'idle';
      this.timer -= dt;
      if (this.timer <= 0) {
        const hungry = d.food < 75 && w.pool > 5 && st > 0 && !(st === 0);
        const r = Math.random();
        if (hungry && r < 0.55) { this.state = 'act'; this.act = 'eat'; this.actT = 0; this.timer = 3 + Math.random() * 3; }
        else if (r < 0.75) { this.state = 'act'; this.act = 'alert'; this.actT = 0; this.timer = 2 + Math.random() * 2; }
        else {
          const away = toBurrow > range;
          for (let k = 0; k < 6; k++) {
            const ang = away ? Math.atan2(w.y - this.y, w.x - this.x) + (Math.random() - 0.5) : Math.random() * 6.28, dist = 10 + Math.random() * 26;
            const tx = this.x + Math.cos(ang) * dist, ty = this.y + Math.sin(ang) * dist;
            if (this.ok(world, tx, ty)) { this.target = { x: tx, y: ty }; this.state = 'walk'; this.timer = dist / this.speed + 1.5; break; }
          }
          if (this.state !== 'walk') this.timer = 1;
        }
      }
    }
    this.lift = (this.frame === 'w1' && (this.state === 'walk' || this.state === 'flee' || this.state === 'toHome')) ? 3 : 0;
  }
}

/** Mantém os coelhos em cena só perto da câmera (os dados continuam existindo no mundo todo). */
class RabbitField {
  /** @param {Ecology} eco */
  constructor(eco) {
    this.eco = eco;
    /** @type {RabbitActor[]} */
    this.actors = [];
  }

  /** @param {number} dt @param {{cx: number, cy: number, radius: number, people: Array<{x: number, y: number}>, shelter: boolean, clock: number, fx: Array<object>, world: World}} ctx */
  update(dt, ctx) {
    const keep = [];
    for (const w of this.eco.warrens) {
      w.near = Math.hypot(w.x - ctx.cx, w.y - ctx.cy) < ctx.radius + 70;
      for (const m of w.members) {
        if (!w.near) { m.actor = null; continue; }
        if (!m.actor || m.actor.w !== w) m.actor = new RabbitActor(m, w);
        keep.push(m.actor);
      }
    }
    this.actors = keep;
    for (const a of keep) a.update(dt, ctx);
  }

  /** @returns {RabbitActor|null} coelho cujo desenho contém o ponto da tela */
  at(sx, sy) {
    let best = null;
    for (const a of this.actors) {
      const r = a.rect;
      if (!a.inside && r && sx >= r.x - 2 && sx <= r.x + r.w + 2 && sy >= r.y - 2 && sy <= r.y + r.h + 2 && (!best || a.y > best.y)) best = a;
    }
    return best;
  }
}

/** Ícones das causas de morte (para os avisos). */
const DEATH_ICON = { idade: '⏳', fome: '🥕', acidente: '⚠️', frio: '🥶', lotacao: '🏘️' };

