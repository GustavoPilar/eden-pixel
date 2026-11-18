// ---------------------------------------------------------------------
// Ecologia das presas: população do mundo todo (nascimentos, mortes, dispersão, novos grupos)
// e os animais em cena perto da câmera (só de dia; à noite e na tempestade se recolhem).
// ---------------------------------------------------------------------

let CREATURE_SEQ = 1;

/** Um animal (dados que existem o tempo todo, mesmo longe da câmera). */
class Creature {
  /** @param {string} sp espécie @param {'M'|'F'} sex @param {number} age */
  constructor(sp, sex, age) {
    const L = PREY[sp].life;
    this.id = CREATURE_SEQ++;
    this.sp = sp;
    this.sex = sex;
    this.age = age;
    this.life = L.lifeMin + Math.random() * (L.lifeMax - L.lifeMin);
    this.food = 70 + Math.random() * 25;
    this.health = 100;
    this.preg = 0;
    this.cool = Math.random() * L.cool * 0.3;
    this.mated = -1e9;
    this.checked = false;
    this.dead = false;
    this.actor = null;
  }

  /** @returns {number} fase: 0 filhote, 1 jovem, 2 adulto, 3 idoso */
  get stage() {
    const L = PREY[this.sp].life;
    return this.age < L.kit ? 0 : this.age < L.young ? 1 : this.age < this.life - L.old ? 2 : 3;
  }
}

/** Um grupo (família, bando ou rebanho) com seu abrigo/território e o alimento disponível ao redor ("pasto"). */
class Group {
  constructor(id, sp, x, y) {
    this.id = id;
    this.sp = sp;
    this.x = x;
    this.y = y;
    /** @type {Creature[]} */
    this.members = [];
    this.pool = 60 + Math.random() * 30;
    this.snow = 0;
    this.skey = -1;
    this.near = false;
    this.acc = 0;
    this.rect = null;
  }
}

/** Simula as presas do mundo todo: cada espécie em seus biomas, com ciclo de vida e repovoamento. */
class Ecology {
  /** @param {World} world @param {{x: number, y: number}} spawn */
  constructor(world, spawn) {
    this.world = world;
    /** @type {Group[]} */
    this.groups = [];
    this.stats = { births: 0, deaths: { idade: 0, fome: 0, acidente: 0, frio: 0, lotacao: 0 }, dispersed: 0, colonized: 0, immigrated: 0 };
    /** Contagens por espécie: grupos e população iniciais, nascimentos e mortes. */
    this.bySp = {};
    /** @type {Array<object>} */
    this.events = [];
    this.nextId = 1;
    this.immT = 0;
    let si = 0;
    for (const sp of Object.keys(PREY)) {
      si++;
      this.bySp[sp] = { births: 0, deaths: 0, initialTotal: 0, initialGroups: 0, maxGroups: 0 };
      const S = PREY[sp], C = S.cell;
      for (let cy = 0; cy * C < world.h; cy++) for (let cx = 0; cx * C < world.w; cx++) {
        const x = (cx + 0.15 + 0.7 * hash2(cx * 3 + si, cy * 5 + 2)) * C, y = (cy + 0.15 + 0.7 * hash2(cx * 7 + 3, cy * 11 + si)) * C;
        const b = world.biomeAt(x, y), p = S.spawn[b];
        if (!p || hash2(cx * 13 + si * 101 + 5, cy * 17 + 6) > p || !this.validSpot(sp, x, y, S.minDist)) continue;
        this.addGroup(sp, x, y, true);
      }
      // todas as espécies de um ambiente próximo do início: pelo menos o coelho
      if (sp === 'rabbit' && !this.groups.some((g) => g.sp === sp && Math.hypot(g.x - spawn.x, g.y - spawn.y) < 240)) {
        for (let r = 110; r < 220; r += 15) for (let a = 0; a < 6.28; a += 0.5) {
          const x = spawn.x + Math.cos(a) * r, y = spawn.y + Math.sin(a) * r;
          if (this.validSpot(sp, x, y, 80)) { this.addGroup(sp, x, y, true); r = 999; break; }
        }
      }
      const gs = this.groups.filter((g) => g.sp === sp);
      this.bySp[sp].initialGroups = gs.length;
      this.bySp[sp].initialTotal = gs.reduce((s, g) => s + g.members.length, 0);
      this.bySp[sp].maxGroups = Math.round(gs.length * 1.5) + 2;
    }
  }

  /** @returns {boolean} se a espécie pode viver ali (bioma, clima, água por perto) e não há outro grupo dela muito perto */
  validSpot(sp, x, y, minDist) {
    const S = PREY[sp], w = this.world, b = w.biomeAt(x, y), t = w.tmp.t;
    if (!S.roamSet.has(b)) return false;
    if ((S.minT !== undefined && t < S.minT) || (S.maxT !== undefined && t > S.maxT)) return false;
    if (!S.water && !w.canStand(x, y)) return false;
    if (S.nearWater && waterBiomeNear(w, x, y, 40) < 0) return false;
    if (S.den === 'burrow' && b === BIOME.BEACH) return false;
    return !this.groups.some((g) => g.sp === sp && Math.hypot(g.x - x, g.y - y) < minDist);
  }

  /** Cria um grupo (com a família inicial, se `populate`). */
  addGroup(sp, x, y, populate) {
    const S = PREY[sp], L = S.life, g = new Group(this.nextId++, sp, x, y);
    if (populate) {
      const n = S.group[0] + Math.floor(Math.random() * (S.group[1] - S.group[0] + 1));
      for (let i = 0; i < n; i++) g.members.push(new Creature(sp, i % 2 ? 'M' : 'F', L.young + 60 + Math.random() * L.lifeMin * 0.4));
      for (let i = 0; i < Math.floor(Math.random() * 3); i++) g.members.push(new Creature(sp, Math.random() < 0.5 ? 'M' : 'F', L.kit + Math.random() * (L.young - L.kit)));
    }
    this.groups.push(g);
    return g;
  }

  /** Remove um animal do grupo e registra a causa da morte. */
  kill(g, m, cause) {
    const i = g.members.indexOf(m);
    if (i >= 0) g.members.splice(i, 1);
    m.dead = true;
    this.stats.deaths[cause]++;
    this.bySp[g.sp].deaths++;
    this.events.push({ type: 'death', sp: g.sp, x: g.x, y: g.y, cause, stage: m.stage });
  }

  /** Jovem que cresceu: se o grupo está cheio (ou por instinto), vai para outro grupo ou funda um novo. */
  disperse(g, m) {
    const S = PREY[g.sp], L = S.life, reach = S.cell * 3;
    const targets = this.groups.filter((o) => o !== g && o.sp === g.sp && o.members.length < L.cap * 0.55 && Math.hypot(o.x - g.x, o.y - g.y) < reach)
      .sort((a, b) => a.members.length - b.members.length || Math.hypot(a.x - g.x, a.y - g.y) - Math.hypot(b.x - g.x, b.y - g.y));
    const move = (to, list) => { for (const r of list) { g.members.splice(g.members.indexOf(r), 1); r.actor = null; to.members.push(r); } };
    if (targets.length && Math.random() < 0.85) { move(targets[0], [m]); this.stats.dispersed++; return; }
    const count = this.groups.reduce((n, o) => n + (o.sp === g.sp ? 1 : 0), 0);
    for (let k = 0; k < 8 && count < this.bySp[g.sp].maxGroups; k++) {
      const a = Math.random() * 6.28, r = S.cell * (1 + Math.random() * 0.8), x = g.x + Math.cos(a) * r, y = g.y + Math.sin(a) * r;
      if (!this.validSpot(g.sp, x, y, S.minDist)) continue;
      const ng = this.addGroup(g.sp, x, y, false);
      const mate = g.members.find((o) => o !== m && o.stage === 1 && o.sex !== m.sex);
      move(ng, mate ? [m, mate] : [m]);
      this.stats.colonized++;
      this.events.push({ type: 'colonize', sp: g.sp, x: ng.x, y: ng.y });
      return;
    }
  }

  /** @returns {boolean} se há um macho adulto no grupo ou num grupo vizinho da espécie */
  maleNear(g) {
    const R = PREY[g.sp].life.mateRange;
    for (const o of this.groups) {
      if (o.sp !== g.sp || (o !== g && Math.hypot(o.x - g.x, o.y - g.y) > R)) continue;
      if (o.members.some((m) => m.sex === 'M' && m.stage >= 2)) return true;
    }
    return false;
  }

  /** Um passo de tempo (`d` s) para um grupo. */
  stepGroup(g, d, env, si, asleep) {
    const S = PREY[g.sp], L = S.life, F = S.forage;
    if (g.skey !== this.world.skey) {
      const b = this.world.biomeAt(g.x, g.y);
      g.snow = seasonLookAt(b, this.world.tmp.t, this.world.spq).snow;
      g.skey = this.world.skey;
    }
    // alimento do local: renasce conforme a estação (menos sob a neve)
    g.pool += Math.max(F.rate[si] * (1 - F.snow * g.snow), F.floor) * F.area * (1 - g.pool / 100) * d;
    g.pool = clamp(g.pool, 0, 100);
    for (const m of g.members.slice()) {
      m.age += d;
      const st = m.stage;
      if (st === 0 && m.age < L.kit * 0.8) m.food = Math.max(m.food, 70);
      else {
        m.food -= 0.12 * d * (asleep ? 0.45 : 1) * (si === 3 ? F.winterDrain : 1);
        // longe da câmera os animais comem "por conta"; perto, eles comem de verdade (ver CreatureActor)
        if (!g.near && !asleep && m.food < 60 && g.pool > 3) { const eat = Math.min(60 - m.food, 0.2 * d); m.food += eat; g.pool -= eat * F.use; }
      }
      if (m.food <= 0) { m.food = 0; m.health -= 0.25 * d; } else m.health = Math.min(100, m.health + 0.08 * d);
      if (m.health <= 0) { this.kill(g, m, 'fome'); continue; }
      if (m.age >= m.life) { this.kill(g, m, 'idade'); continue; }
      if (Math.random() < 3e-5 * (S.risk ?? 1) * d) { this.kill(g, m, 'acidente'); continue; }
      if (st === 0 && si === 3 && g.snow > 0.3 && Math.random() < 0.0025 * d) { this.kill(g, m, 'frio'); continue; }
      if (st === 1 && !m.checked && m.age > L.young - 8) {
        m.checked = true;
        if (g.members.length > L.cap * 0.6 || Math.random() < 0.45) { this.disperse(g, m); continue; }
      }
      if (m.sex === 'F' && st >= 2) {
        m.cool -= d;
        if (m.preg > 0) {
          m.preg -= d;
          if (m.preg <= 0) this.birth(g, m);
        } else if (m.cool <= 0 && env.sp < L.breed && m.food > 55 && g.pool > L.poolMin && g.members.length < L.cap && Math.random() < L.mateP * d && this.maleNear(g)) {
          m.preg = L.gest;
          m.mated = env.clock;
        }
      }
    }
  }

  /** Nasce uma ninhada (menor se a mãe estiver mal alimentada; no grupo lotado, parte não sobrevive). */
  birth(g, mother) {
    const L = PREY[g.sp].life;
    const n = clamp(Math.round(L.litter[0] + (mother.food - 60) / 30 + Math.random() * (L.litter[1] - L.litter[0] + 0.5)), L.litter[0], L.litter[1]);
    let born = 0;
    for (let i = 0; i < n; i++) {
      if (g.members.length >= L.cap && Math.random() < 0.5) { this.stats.deaths.lotacao++; this.bySp[g.sp].deaths++; continue; }
      g.members.push(new Creature(g.sp, Math.random() < 0.5 ? 'M' : 'F', 0));
      born++;
    }
    mother.cool = L.cool;
    this.stats.births += born;
    this.bySp[g.sp].births += born;
    this.events.push({ type: 'birth', sp: g.sp, x: g.x, y: g.y, n: born });
  }

  /** Um passo de tempo para todos os grupos (os longe da câmera são calculados a cada 2 s). @param {number} dt @param {{sp: number, clock: number, dark: number}} env */
  update(dt, env) {
    const si = Math.floor(env.sp) % 4, asleep = env.dark > 0.55;
    for (const g of this.groups) {
      g.acc += dt;
      if (!g.near && g.acc < 2) continue;
      const d = g.acc;
      g.acc = 0;
      this.stepGroup(g, d, env, si, asleep);
    }
    // rede de segurança: se uma espécie quase some, um casal chega de fora do mapa a um grupo vazio
    this.immT += dt;
    if (this.immT > 1200) {
      this.immT = 0;
      for (const sp of Object.keys(PREY)) {
        const B = this.bySp[sp];
        if (!B.initialTotal) continue;
        const gs = this.groups.filter((g) => g.sp === sp), total = gs.reduce((s, g) => s + g.members.length, 0);
        if (total >= B.initialTotal * 0.2) continue;
        const empty = gs.filter((g) => g.members.length < 2);
        if (!empty.length) continue;
        const g = empty[Math.floor(Math.random() * empty.length)], age = PREY[sp].life.young + 100;
        g.members.push(new Creature(sp, 'M', age), new Creature(sp, 'F', age));
        this.stats.immigrated++;
        this.events.push({ type: 'colonize', sp, x: g.x, y: g.y });
      }
    }
    if (this.events.length > 80) this.events.splice(0, this.events.length - 80);
  }

  /** @returns {Group|null} grupo com toca visível perto do ponto */
  burrowAt(x, y) { return this.groups.find((g) => PREY[g.sp].den === 'burrow' && Math.hypot(g.x - x, g.y - y) < 9) || null; }

  /** Contagens da população, no total e por espécie. */
  census() {
    const c = { total: 0, groups: this.groups.length, bySp: {} };
    for (const sp of Object.keys(PREY)) c.bySp[sp] = { total: 0, stages: [0, 0, 0, 0], males: 0, females: 0, pregnant: 0, groups: 0, empty: 0, pool: 0 };
    for (const g of this.groups) {
      const e = c.bySp[g.sp];
      e.groups++; e.pool += g.pool;
      if (!g.members.length) e.empty++;
      for (const m of g.members) { c.total++; e.total++; e.stages[m.stage]++; if (m.sex === 'M') e.males++; else e.females++; if (m.preg > 0) e.pregnant++; }
    }
    for (const e of Object.values(c.bySp)) e.pool = e.groups ? e.pool / e.groups : 0;
    return c;
  }
}

// ---------- animais em cena ----------
/** Um animal visível: anda, come, fica alerta, foge e se recolhe no abrigo (dados em `d`). */
class CreatureActor {
  /** @param {Creature} d @param {Group} g */
  constructor(d, g) {
    this.d = d;
    this.g = g;
    this.S = PREY[d.sp];
    this.x = g.x;
    this.y = g.y;
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
  get speed() { return this.S.move.speed[this.d.stage]; }

  /** @returns {boolean} se pode pisar no ponto (bioma da espécie e, em terra, sem obstáculos) */
  ok(world, x, y) { return this.S.roamSet.has(world.biomeAt(x, y)) && (this.S.water || !world.solidAt(x, y)) && x > 8 && y > 8; }

  /** @param {number} dt @param {object} ctx */
  update(dt, ctx) {
    const d = this.d, g = this.g, S = this.S, M = S.move, st = d.stage, world = ctx.world;
    this.t += dt;
    const shelter = ctx.shelter || (S.coldShelter && g.snow > 0.4);
    if (this.inside) {
      this.hide = Math.max(0, this.hide - dt);
      if (!shelter && this.hide <= 0 && (st > 0 || d.age > S.life.kit * 0.4)) {
        this.emerge -= dt;
        if (this.emerge <= 0) { this.inside = false; this.state = 'idle'; this.timer = 0.6; this.x = g.x + (Math.random() - 0.5) * 6; this.y = g.y + 3; if (S.den === 'burrow') ctx.fx.push({ type: 'puff', x: g.x, y: g.y, t: 0 }); }
      }
      return;
    }
    if (d.mated !== this.lastMated) { this.lastMated = d.mated; ctx.fx.push({ type: 'heart', x: this.x, y: this.y - 14, t: 0 }); }
    const range = M.range[Math.min(st, 2)];
    const toHomeDist = Math.hypot(g.x - this.x, g.y - this.y);
    // abrigo: à noite, na tempestade ou no frio todos se recolhem
    if (shelter && this.state !== 'toHome') { this.state = 'toHome'; this.hide = 0; }
    // medo das pessoas: corre para o abrigo se estiver perto, senão foge
    if (M.shy && this.state !== 'toHome' && this.state !== 'flee') {
      for (const o of ctx.people) {
        if (Math.hypot(o.x - this.x, o.y - this.y) < (st === 0 ? M.shy * 0.55 : M.shy)) {
          if (toHomeDist < 90) { this.state = 'toHome'; this.hide = 5 + Math.random() * 6; }
          else { this.state = 'flee'; this.timer = 1.2 + Math.random() * 0.8; this.fleeAng = Math.atan2(this.y - o.y, this.x - o.x) + (Math.random() - 0.5) * 0.8; }
          break;
        }
      }
    }
    const hopT = M.hopT || 0.2, hop = M.hops ? Math.floor(this.t / hopT) % 2 === 1 : true;
    const gait = (v) => (M.hops ? v * (hop ? 2.2 : 0) : v);
    const move = (vx, vy, sp) => {
      if (Math.abs(vx) > 0.2) this.dir = vx > 0 ? 1 : -1;
      const len = Math.hypot(vx, vy) || 1, step = sp * dt, nx = this.x + (vx / len) * step, ny = this.y + (vy / len) * step;
      if (this.ok(world, nx, ny)) { this.x = nx; this.y = ny; return true; }
      if (this.ok(world, nx, this.y)) { this.x = nx; return true; }
      if (this.ok(world, this.x, ny)) { this.y = ny; return true; }
      return false;
    };
    const stepFrame = (fast) => (M.hops ? (hop ? 'w1' : 'w0') : (Math.floor(this.t / (fast ? 0.14 : 0.3)) % 2 === 0 ? 'w0' : 'w1'));
    if (this.state === 'toHome') {
      if (toHomeDist < 3) { this.inside = true; this.state = 'idle'; this.emerge = 2 + Math.random() * 20; if (S.den === 'burrow') ctx.fx.push({ type: 'puff', x: g.x, y: g.y, t: 0 }); return; }
      move(g.x - this.x, g.y - this.y, M.hops ? this.speed * 2.3 * (hop ? 1.6 : 0.4) : this.speed * 1.8);
      this.frame = stepFrame(true);
    } else if (this.state === 'flee') {
      if (!move(Math.cos(this.fleeAng), Math.sin(this.fleeAng), this.speed * 2.3)) this.fleeAng += 1.2;
      this.frame = M.hops ? (Math.floor(this.t / 0.1) % 2 === 0 ? 'w0' : 'w1') : stepFrame(true);
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'idle'; this.timer = 1; }
    } else if (this.state === 'walk' && this.target) {
      const vx = this.target.x - this.x, vy = this.target.y - this.y, dist = Math.hypot(vx, vy);
      if (dist < 2 || !move(vx, vy, gait(this.speed))) { this.state = 'idle'; this.timer = 0.5 + Math.random() * 2; }
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'idle'; this.timer = 0.5; }
      this.frame = stepFrame(false);
    } else if (this.state === 'act') {
      this.actT += dt;
      this.frame = (this.act === 'eat' ? 'eat' : 'act') + (Math.floor(this.actT / 0.4) % 2);
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.act === 'eat' && g.pool > 5) { d.food = Math.min(100, d.food + 10); g.pool -= 10 * S.forage.use; ctx.fx.push({ type: 'spark', x: this.x, y: this.y - 8, t: 0 }); }
        this.state = 'idle'; this.timer = 0.5 + Math.random();
      }
    } else {
      this.frame = 'idle';
      this.timer -= dt;
      if (this.timer <= 0) {
        const hungry = d.food < 75 && g.pool > 5 && st > 0;
        const r = Math.random();
        if (hungry && r < 0.55) { this.state = 'act'; this.act = 'eat'; this.actT = 0; this.timer = 3 + Math.random() * 3; }
        else if (r < 0.75) { this.state = 'act'; this.act = 'alert'; this.actT = 0; this.timer = 2 + Math.random() * 2; }
        else {
          const away = toHomeDist > range;
          for (let k = 0; k < 6; k++) {
            let ang = away ? Math.atan2(g.y - this.y, g.x - this.x) + (Math.random() - 0.5) : Math.random() * 6.28;
            if (M.sideways && !away) ang = Math.random() < 0.5 ? 0 : Math.PI;
            const dist = 10 + Math.random() * 26, tx = this.x + Math.cos(ang) * dist, ty = this.y + Math.sin(ang) * dist;
            if (this.ok(world, tx, ty)) { this.target = { x: tx, y: ty }; this.state = 'walk'; this.timer = dist / this.speed + 1.5; break; }
          }
          if (this.state !== 'walk') this.timer = 1;
        }
      }
    }
    this.lift = (M.hopLift && (this.frame === 'w1') && (this.state === 'walk' || this.state === 'flee' || this.state === 'toHome')) ? M.hopLift : 0;
  }
}

/** Mantém os animais em cena só perto da câmera (os dados continuam existindo no mundo todo). */
class CreatureField {
  /** @param {Ecology} eco */
  constructor(eco) {
    this.eco = eco;
    /** @type {CreatureActor[]} */
    this.actors = [];
  }

  /** @param {number} dt @param {{cx: number, cy: number, radius: number, people: Array<{x: number, y: number}>, shelter: boolean, clock: number, fx: Array<object>, world: World}} ctx */
  update(dt, ctx) {
    const keep = [];
    for (const g of this.eco.groups) {
      g.near = Math.hypot(g.x - ctx.cx, g.y - ctx.cy) < ctx.radius + 70;
      for (const m of g.members) {
        if (!g.near) { m.actor = null; continue; }
        if (!m.actor || m.actor.g !== g) m.actor = new CreatureActor(m, g);
        keep.push(m.actor);
      }
    }
    this.actors = keep;
    for (const a of keep) a.update(dt, ctx);
  }

  /** @returns {CreatureActor|null} animal cujo desenho contém o ponto da tela */
  at(sx, sy) {
    let best = null;
    for (const a of this.actors) {
      const r = a.rect;
      if (!a.inside && r && sx >= r.x - 2 && sx <= r.x + r.w + 2 && sy >= r.y - 2 && sy <= r.y + r.h + 2 && (!best || a.y > best.y)) best = a;
    }
    return best;
  }
}
