// ---------------------------------------------------------------------
// Fauna: nascimento por bioma, comportamento (andar, comer, agir, fugir) e desenho
// ---------------------------------------------------------------------

/** Lê um item da lista de itens e desenha seus pixels perto da boca. */
function drawItem(ctx, kind, x, y, flip) {
  const px = ITEM_PIXELS[kind];
  if (!px) return;
  for (const [c, dx, dy] of px) { ctx.fillStyle = c; ctx.fillRect(x + (flip ? -dx : dx), y + dy, 1, 1); }
}

/** Um animal vivo: posição, estado e ação atual. */
class Animal {
  /** @param {string} id @param {number} x @param {number} y @param {() => number} rnd */
  constructor(id, x, y, rnd) {
    this.id = id;
    this.def = ANIMALS[id];
    this.x = x; this.y = y;
    this.hx = x; this.hy = y;
    this.dir = rnd() < 0.5 ? 1 : -1;
    this.state = 'idle';
    this.timer = rnd() * 2;
    this.t = rnd() * 10;
    this.act = null;
    this.target = null;
    this.actT = 0;
    this.jumping = false;
    this.lift = 0;
    this.frame = 'idle';
    this.rect = null;
  }

  /** Texto do que está fazendo (para o rótulo ao tocar). */
  doing() {
    if (this.state === 'fly') return 'voando';
    if (this.state === 'flee') return 'fugindo';
    if (this.state === 'act' && this.act) return this.act.label;
    if (this.state === 'walk') return this.def.water ? 'nadando' : 'andando';
    return this.def.water ? 'nadando devagar' : 'parado';
  }

  /** Escolhe o que fazer em seguida: andar, comer ou uma ação. */
  chooseNext(fauna) {
    const def = this.def;
    const acts = def.actions.filter((a) => !a.needs || fauna.waterNear(this.x, this.y, 34));
    const walkP = def.water ? 0.75 : 0.5;
    if (def.fly && !def.hover && Math.random() < 0.3 && this.startFlight(fauna, false)) return;
    if (Math.random() > walkP && acts.length) {
      const total = acts.reduce((s, a) => s + a.w, 0);
      let r = Math.random() * total, pick = acts[0];
      for (const a of acts) { r -= a.w; if (r <= 0) { pick = a; break; } }
      this.state = 'act';
      this.act = pick;
      this.actT = 0;
      this.timer = pick.dur[0] + Math.random() * (pick.dur[1] - pick.dur[0]);
      this.jumping = !!(pick.kind === 'act' && def.jump);
      return;
    }
    this.startWalk(fauna);
  }

  /** Decola para um ponto de pouso próximo (ou longe do Adão, se estiver fugindo). */
  startFlight(fauna, away, adam) {
    const def = this.def;
    for (let k = 0; k < 10; k++) {
      const d = 50 + Math.random() * 80;
      let ang = Math.random() * Math.PI * 2;
      if (away && adam) ang = Math.atan2(this.y - adam.y, this.x - adam.x) + (Math.random() - 0.5) * 1.2;
      else if (Math.hypot(this.x - this.hx, this.y - this.hy) > def.range * 1.4) ang = Math.atan2(this.hy - this.y, this.hx - this.x) + (Math.random() - 0.5);
      const tx = this.x + Math.cos(ang) * d, ty = this.y + Math.sin(ang) * d;
      if (fauna.allowed(this, tx, ty)) {
        this.flight = { sx: this.x, sy: this.y, tx, ty, t: 0, dur: d / def.flySpeed };
        this.state = 'fly';
        this.dir = tx >= this.x ? 1 : -1;
        return true;
      }
    }
    return false;
  }

  /** Sorteia um destino próximo (de preferência perto de casa). */
  startWalk(fauna) {
    const def = this.def;
    for (let k = 0; k < 8; k++) {
      let ang = Math.random() * Math.PI * 2;
      const away = Math.hypot(this.x - this.hx, this.y - this.hy) > def.range;
      if (away) ang = Math.atan2(this.hy - this.y, this.hx - this.x) + (Math.random() - 0.5);
      else if (def.sideways) ang = Math.random() < 0.5 ? 0 : Math.PI;
      const d = 14 + Math.random() * 28;
      const tx = this.x + Math.cos(ang) * d, ty = this.y + Math.sin(ang) * d;
      if (fauna.allowed(this, tx, ty) && fauna.allowed(this, (tx + this.x) / 2, (ty + this.y) / 2)) {
        this.target = { x: tx, y: ty };
        this.state = 'walk';
        this.timer = d / def.speed + 1.5;
        return;
      }
    }
    this.state = 'idle';
    this.timer = 1 + Math.random() * 2;
  }

  /** Move um passo se o destino for permitido (desliza em um eixo se bloquear). */
  step(dx, dy, fauna) {
    if (fauna.allowed(this, this.x + dx, this.y + dy)) { this.x += dx; this.y += dy; return true; }
    if (dx && fauna.allowed(this, this.x + dx, this.y)) { this.x += dx; return true; }
    if (dy && fauna.allowed(this, this.x, this.y + dy)) { this.y += dy; return true; }
    return false;
  }

  /** @param {number} dt @param {Fauna} fauna @param {{x: number, y: number}} adam */
  update(dt, fauna, adam) {
    const def = this.def;
    this.t += dt;
    this.timer -= dt;
    // voo: sobe, desliza até o ponto de pouso e desce
    if (this.state === 'fly') {
      const fl = this.flight;
      fl.t += dt;
      const q = clamp(fl.t / fl.dur, 0, 1);
      this.x = fl.sx + (fl.tx - fl.sx) * q;
      this.y = fl.sy + (fl.ty - fl.sy) * q;
      this.lift = (def.alt || 14) * Math.pow(Math.sin(Math.PI * q), 0.6);
      const per = def.hover ? 0.05 : 0.09;
      const up = Math.floor(this.t / per) % 2 === 0;
      this.frame = def.plan === 'songbird' ? (up ? 'fly0' : 'fly1') : (up ? 'act0' : 'act1');
      if (q >= 1) { this.state = 'idle'; this.lift = 0; this.timer = 0.6 + Math.random() * 1.5; }
      return;
    }
    // medo: foge do Adão quando ele chega perto
    if (def.shy && this.state !== 'flee' && !this.jumping) {
      let d = Math.hypot(adam.x - this.x, adam.y - this.y);
      for (const o of fauna.others || []) d = Math.min(d, Math.hypot(o.x - this.x, o.y - this.y));
      if (d < def.shy && def.fly && !def.hover && this.startFlight(fauna, true, adam)) return;
      if (d < def.shy) { this.state = 'flee'; this.timer = 1.4 + Math.random() * 0.8; this.fleeAng = Math.atan2(this.y - adam.y, this.x - adam.x) + (Math.random() - 0.5) * 0.8; }
    }
    if (this.state === 'flee') {
      const v = def.speed * 2.3 * dt;
      const dx = Math.cos(this.fleeAng) * v, dy = Math.sin(this.fleeAng) * v;
      if (Math.abs(dx) > 0.01) this.dir = dx > 0 ? 1 : -1;
      if (!this.step(dx, dy, fauna)) this.fleeAng += 1.2;
      if (this.timer <= 0) { this.state = 'idle'; this.timer = 1 + Math.random(); }
    } else if (this.state === 'walk' && this.target) {
      const vx = this.target.x - this.x, vy = this.target.y - this.y, dist = Math.hypot(vx, vy);
      const hopPhase = def.hops ? (Math.floor(this.t / (def.hopT || 0.28)) % 2 === 1 ? 2.2 : 0) : 1;
      const v = Math.min(dist, def.speed * hopPhase * dt);
      if (Math.abs(vx) > 0.3 && !def.sideways) this.dir = vx > 0 ? 1 : -1;
      else if (def.sideways && Math.abs(vx) > 0.3) this.dir = vx > 0 ? 1 : -1;
      if (dist < 1.5 || !this.step((vx / dist) * v, (vy / dist) * v, fauna)) { this.state = 'idle'; this.timer = 0.6 + Math.random() * 2.2; }
      else if (this.timer <= 0) { this.state = 'idle'; this.timer = 0.5 + Math.random(); }
    } else if (this.state === 'act') {
      this.actT += dt;
      if (this.jumping) {
        const p = clamp(this.actT / this.act.dur[0], 0, 1);
        this.lift = Math.sin(Math.PI * p) * def.jump;
        this.step(this.dir * def.speed * 1.6 * dt, 0, fauna);
        if (p >= 1) { this.jumping = false; this.lift = 0; this.state = 'idle'; this.timer = 0.4; }
      } else if (this.timer <= 0) { this.state = 'idle'; this.timer = 0.6 + Math.random() * 1.5; }
    } else if (this.timer <= 0) this.chooseNext(fauna);
    // quadro de animação
    if (this.state === 'flee' || this.state === 'walk') {
      const per = clamp(0.55 / Math.max(0.8, (this.state === 'flee' ? def.speed * 2.3 : def.speed) / 14), 0.1, 0.5);
      this.frame = Math.floor(this.t / per) % 2 === 0 ? 'w0' : 'w1';
    } else if (this.state === 'act') {
      if (this.jumping) this.frame = this.actT / this.act.dur[0] < 0.5 ? 'act0' : 'act1';
      else this.frame = (this.act.kind === 'eat' ? 'eat' : 'act') + (Math.floor(this.actT / 0.4) % 2);
    } else this.frame = def.water ? (Math.floor(this.t / 0.5) % 2 === 0 ? 'w0' : 'w1') : 'idle';
    if (def.hops && (this.state === 'walk' || this.state === 'flee')) this.frame = Math.floor(this.t / (def.hopT || 0.28)) % 2 === 0 ? 'w0' : 'w1';
    if (def.hover) { this.lift = 9 + Math.sin(this.t * 3) * 1.2; this.frame = Math.floor(this.t / 0.05) % 2 === 0 ? 'fly0' : 'fly1'; }
    else if (!this.jumping) this.lift = def.hopLift && def.hops && (this.state === 'walk' || this.state === 'flee') && this.frame === 'w1' ? def.hopLift : 0;
  }
}

/** Gerencia os animais perto da câmera: nascem por células e somem quando ficam longe. */
class Fauna {
  /** @param {World} world */
  constructor(world) {
    this.world = world;
    this.size = 96;
    /** @type {Map<string, Animal[]>} */
    this.cells = new Map();
    /** @type {Animal[]} */
    this.list = [];
    this.bank = new AnimalBank();
    this.ids = Object.keys(ANIMALS);
  }

  /** @returns {boolean} se há água perto do ponto (8 direções) */
  waterNear(x, y, r) {
    for (let a = 0; a < 8; a++) { if (BIOME_INFO[this.world.biomeAt(x + Math.cos(a * 0.785) * r, y + Math.sin(a * 0.785) * r)].water) return true; }
    return false;
  }

  /** @returns {boolean} se o animal pode estar nesse ponto */
  allowed(a, x, y) {
    if (x < 8 || y < 8 || x > this.world.w - 8 || y > this.world.h - 8) return false;
    const b = this.world.biomeAt(x, y);
    if (!a.def.roam.includes(b)) return false;
    if (!a.def.water && this.world.solidAt(x, y)) return false;
    return true;
  }

  /** Cria (de forma determinística) o grupo de animais de uma célula, se houver. */
  spawnCell(cx, cy) {
    const w = this.world, out = [];
    const rnd = mulberry32(Math.floor(hashS(cx, cy, w.seed * 7 + 999) * 4294967296));
    for (let attempt = 0; attempt < 3 && !out.length; attempt++) {
      const x = (cx + rnd()) * this.size, y = (cy + rnd()) * this.size;
      if (x < 24 || y < 24 || x > w.w - 24 || y > w.h - 24) continue;
      const b = w.biomeAt(x, y), t = w.tmp.t;
      const cands = [];
      for (const id of this.ids) {
        const d = ANIMALS[id], wt = d.spawn[b];
        if (!wt || (d.minT !== undefined && t < d.minT) || (d.maxT !== undefined && t > d.maxT)) continue;
        if (d.nearWater && !this.waterNear(x, y, 40)) continue;
        cands.push([id, wt]);
      }
      if (!cands.length) continue;
      const total = cands.reduce((s, c) => s + c[1], 0);
      if (rnd() > Math.min(0.8, 0.16 * total)) continue;
      let r = rnd() * total, id = cands[0][0];
      for (const c of cands) { r -= c[1]; if (r <= 0) { id = c[0]; break; } }
      const d = ANIMALS[id], n = d.group[0] + Math.floor(rnd() * (d.group[1] - d.group[0] + 1));
      for (let i = 0; i < n; i++) {
        const ax = x + (rnd() - 0.5) * 30, ay = y + (rnd() - 0.5) * 24;
        const probe = new Animal(id, ax, ay, rnd);
        if (this.allowed(probe, ax, ay)) { probe.hx = x; probe.hy = y; out.push(probe); }
      }
    }
    return out;
  }

  /**
   * Cria e remove células ao redor do centro e atualiza todos os animais.
   * @param {number} dt @param {{x: number, y: number}} center @param {number} radius @param {{x: number, y: number}} adam
   */
  update(dt, center, radius, adam) {
    const s = this.size;
    let dirty = false;
    for (let cy = Math.floor((center.y - radius) / s); cy <= Math.floor((center.y + radius) / s); cy++) for (let cx = Math.floor((center.x - radius) / s); cx <= Math.floor((center.x + radius) / s); cx++) {
      const key = cx + ',' + cy;
      if (!this.cells.has(key)) { this.cells.set(key, this.spawnCell(cx, cy)); dirty = true; }
    }
    for (const [key, arr] of this.cells) {
      const [cx, cy] = key.split(',').map(Number);
      if (Math.hypot((cx + 0.5) * s - center.x, (cy + 0.5) * s - center.y) > radius + 160) { this.cells.delete(key); dirty = true; }
    }
    if (dirty) this.list = [...this.cells.values()].flat();
    for (const a of this.list) a.update(dt, this, adam);
  }

  /** @returns {Animal|null} animal cujo desenho contém o ponto da tela */
  at(sx, sy) {
    let best = null;
    for (const a of this.list) {
      const r = a.rect;
      if (r && sx >= r.x - 2 && sx <= r.x + r.w + 2 && sy >= r.y - 2 && sy <= r.y + r.h + 2 && (!best || a.y > best.y)) best = a;
    }
    return best;
  }
}
