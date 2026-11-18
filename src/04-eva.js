/** Cabelo de Eva (castanho-avermelhado) e flor de enfeite. */
const EVA_HAIR = ['#4a2216', '#7a3a20', '#a85a30'];
const EVA_FLOWER = { petal: '#ffffff', petal2: '#ffd1dc', core: '#f5b83d' };

/** @param {number} l luz @returns {string} tom do cabelo de Eva */
function evaHairTone(l) { return EVA_HAIR[l > 0.8 ? 2 : l > 0.22 ? 1 : 0]; }

/** Gera os quadros de Eva: cabelo comprido até a cintura, sem barba, com flor no cabelo. */
class EvaSpriteFactory extends AdamSpriteFactory {
  /** Pinta um pixel de cabelo e o marca como parte da cabeça (para o contorno). */
  hair(g, isHead, x, y, l) {
    if (x < 0 || y < 0 || x >= SPRITE_W || y >= SPRITE_H) return;
    if (this.strand(x, y) && l > 0.1) l -= 0.3;
    else if ((x + y * 2) % 5 === 0 && l > 0.2) l += 0.3;
    g.set(x, y, evaHairTone(l));
    isHead[y * SPRITE_W + x] = 1;
  }

  /** Mecha mais escura em colunas alternadas, dá textura ao cabelo comprido. */
  strand(x) { return x % 3 === 0; }

  /** Pequena flor no cabelo (cruz de 5 pixels). */
  flower(g, x, y) {
    g.set(x, y, EVA_FLOWER.core);
    for (const [dx, dy, c] of [[-1, 0, EVA_FLOWER.petal], [1, 0, EVA_FLOWER.petal2], [0, -1, EVA_FLOWER.petal], [0, 1, EVA_FLOWER.petal2]]) g.set(x + dx, y + dy, c);
  }

  /** Cortina de cabelo atrás/ao lado, até a cintura, afinando nas pontas. */
  curtain(g, isHead, xMin, xMax, y0, y1) {
    for (let y = y0; y <= y1; y++) {
      const taper = y > y1 - 2 ? (y - (y1 - 2)) : 0;
      for (let x = xMin + taper; x <= xMax - taper; x++) {
        const edge = Math.min(x - xMin, xMax - x);
        this.hair(g, isHead, x, y, edge === 0 ? 0.05 : 0.4);
      }
    }
  }

  drawFront(g, isHead, N, eyeY, headCy, headRy, state) {
    const cx = CENTER_X;
    for (let y = 0; y < SPRITE_H; y++) for (let x = 0; x < SPRITE_W; x++) {
      if (!isHead[y * SPRITE_W + x]) continue;
      const n = N(x, y), e = Math.abs(n.dx);
      // franja repartida e laterais que descem
      if (n.dy < -0.4 + 0.5 * e * e + (n.dx > 0 ? 0.08 : 0) || (e > 0.8 && n.dy < 0.8)) this.hair(g, isHead, x, y, lightAt(n.dx, n.dy));
    }
    const endY = Math.round(headCy + headRy + 5);
    this.curtain(g, isHead, 4, 6, Math.round(headCy + 1), endY);
    this.curtain(g, isHead, 15, 17, Math.round(headCy + 1), endY);
    // rosto: olhos com cílios, bochechas, nariz e sorriso
    g.set(7, eyeY + 2, PAL.blush); g.set(14, eyeY + 2, PAL.blush);
    g.set(8, eyeY - 2, EVA_HAIR[1]); g.set(9, eyeY - 2, EVA_HAIR[1]); g.set(12, eyeY - 2, EVA_HAIR[1]); g.set(13, eyeY - 2, EVA_HAIR[1]);
    for (const x of [8, 13]) { if (!state.blink) g.set(x, eyeY, PAL.eye); g.set(x, eyeY + 1, PAL.eye); }
    g.set(7, eyeY - 1, EVA_HAIR[0]); g.set(14, eyeY - 1, EVA_HAIR[0]);
    g.set(10, eyeY + 2, PAL.skin[1]); g.set(11, eyeY + 2, PAL.skin[1]);
    g.set(9, eyeY + 3, PAL.mouth); g.set(10, eyeY + 4, PAL.mouth); g.set(11, eyeY + 4, PAL.mouth); g.set(12, eyeY + 3, PAL.mouth);
    this.flower(g, 15, eyeY - 4);
  }

  drawBack(g, isHead, N) {
    let headBottom = 0;
    for (let y = 0; y < SPRITE_H; y++) for (let x = 0; x < SPRITE_W; x++) if (isHead[y * SPRITE_W + x]) headBottom = Math.max(headBottom, y);
    for (let y = 0; y < SPRITE_H; y++) for (let x = 0; x < SPRITE_W; x++) {
      if (!isHead[y * SPRITE_W + x]) continue;
      const n = N(x, y);
      if (n.dy < 0.9) this.hair(g, isHead, x, y, lightAt(n.dx, n.dy));
    }
    // cortina de cabelo cobrindo as costas até a cintura
    this.curtain(g, isHead, 5, 16, headBottom - 2, headBottom + 6);
    this.curtain(g, isHead, 4, 17, headBottom - 5, headBottom - 3);
    this.flower(g, 15, headBottom - 7);
  }

  drawSide(g, isHead, N, eyeY, headCy, headRy, state) {
    const cx = CENTER_X;
    for (let y = 0; y < SPRITE_H; y++) for (let x = 0; x < SPRITE_W; x++) {
      if (!isHead[y * SPRITE_W + x]) continue;
      const n = N(x, y);
      const hair = n.dx < 0.12 ? n.dy < 0.9 : n.dy < -0.34 + 0.1 * n.dx;
      if (hair) this.hair(g, isHead, x, y, lightAt(n.dx, n.dy));
    }
    // cabelo comprido caindo pelas costas
    this.curtain(g, isHead, cx - 8, cx - 1, Math.round(headCy + 1), Math.round(headCy + headRy + 5));
    const ex = cx + 3;
    if (!state.blink) g.set(ex, eyeY, PAL.eye);
    g.set(ex, eyeY + 1, PAL.eye);
    g.set(ex + 1, eyeY - 1, EVA_HAIR[0]);
    g.set(ex, eyeY - 2, EVA_HAIR[1]); g.set(ex + 1, eyeY - 2, EVA_HAIR[1]);
    g.set(cx + 6, eyeY + 1, PAL.skin[2]); g.set(cx + 6, eyeY + 2, PAL.skin[1]);
    g.set(cx + 4, eyeY + 2, PAL.blush);
    g.set(cx + 4, eyeY + 4, PAL.mouth); g.set(cx + 5, eyeY + 4, PAL.mouth);
    this.flower(g, cx - 1, Math.round(headCy - headRy + 1));
  }
}

/**
 * Eva: companheira do Adão, com as mesmas necessidades dele. Sem casa, fica por perto dele
 * (passeia à vontade num raio curto e volta se se afastar muito); quando houver uma casa
 * (`setHome`), anda livre por ela. Quando precisa, sai sozinha para beber, comer ou dormir.
 */
class Eva {
  /** @param {World} world @param {{x: number, y: number}} adam */
  constructor(world, adam) {
    this.world = world;
    let sx = adam.x + 26, sy = adam.y + 6;
    for (let r = 0; r < 60 && !world.canStand(sx, sy); r += 4) { const a = r * 0.9; sx = adam.x + Math.cos(a) * (26 + r); sy = adam.y + Math.sin(a) * (14 + r); }
    this.walker = new HopWalker(sx, sy, world);
    this.surv = new Survivor('Eva', this.walker, world);
    this.surv.quiet = true;
    /** @type {{x: number, y: number}|null} */
    this.home = null;
    this.idleT = 2 + Math.random() * 2;
    this.callBack = 0;
    this.intent = null;
    this.cool = 0;
  }

  /** Define a casa: com ela, Eva deixa de acompanhar o Adão e anda livre ao redor. */
  setHome(x, y) { this.home = { x, y }; }

  /** @returns {string} o que ela está fazendo (para o rótulo) */
  doing() {
    const a = this.surv.action;
    if (a) return { sleep: 'desmaiada de sono', drink: 'bebendo água', gather: 'colhendo comida', faint: 'desmaiada' }[a.type];
    return this.walker.goal || this.walker.hop ? 'andando' : 'parada';
  }

  /** @returns {string} ícone do que ela está fazendo */
  doingIcon() {
    const a = this.surv.action;
    if (a) return { sleep: '😴', drink: '💧', gather: '🧺', faint: '😵' }[a.type];
    return this.walker.goal || this.walker.hop ? '🚶' : '🧍';
  }

  /** Planta comestível e segura mais próxima (ainda não colhida), ou null. */
  findFood(env) {
    const w = this.walker;
    let best = null, bd = 1e9;
    for (const p of this.world.plantsIn(w.x - 160, w.y - 160, w.x + 160, w.y + 160)) {
      if (!edibleNow(p, env.season) || isPoison(p) || env.isHarvested(p)) continue;
      const d = Math.hypot(p.x - w.x, p.y - w.y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  /** @param {number} dt @param {{x: number, y: number}} adam @param {object} env contexto das necessidades */
  update(dt, adam, env) {
    const w = this.walker, s = this.surv;
    w.update(dt);
    s.update(dt, { ...env, partner: adam });
    this.callBack -= dt;
    this.cool -= dt;
    const ctx = { world: this.world, isHarvested: env.isHarvested, notify: env.notify, season: env.season };
    // ações paradas: dormir até descansar (ou até o dia, se já deu para recuperar)
    if (s.action) return;
    // chegou ao destino de um pedido: beber ou colher
    if (this.intent && !w.goal && !w.hop) { const it = this.intent; this.intent = null; tryStartIntent(ctx, s, it, false); return; }
    if (!this.intent && this.cool <= 0) {
      const night = darkness(env.hour) > 0.85;
      if (hasBed(this.world, w.x, w.y) && (s.energy < 45 || (night && s.energy < 80))) { s.startAction('sleep', null, { bed: true }); return; }
      if (s.water < 22 || (s.water < 45 && s.energy > 30)) {
        const lake = findLake(this.world, w.x, w.y, 200);
        if (lake) { this.intent = { type: 'drink' }; w.goTo(lake.x, lake.y); return; }
        this.cool = 12;
      }
      if (s.food < 45) {
        const p = this.findFood(env);
        if (p) { this.intent = { type: 'gather', p }; w.goTo(p.x, p.y + (SOLID[p.id] ? 4 : 0)); return; }
        this.cool = 12;
      }
    }
    if (this.intent) return;
    const ref = this.home || adam;
    const dRef = Math.hypot(w.x - ref.x, w.y - ref.y);
    // sem casa: se ficar longe demais do Adão, vai até ele
    if (!this.home && dRef > 120 && this.callBack <= 0) {
      this.callBack = 2.5;
      const ang = Math.random() * Math.PI * 2;
      w.goTo(adam.x + Math.cos(ang) * 30, adam.y + Math.sin(ang) * 22);
      return;
    }
    if (w.goal || w.hop) return;
    this.idleT -= dt;
    if (this.idleT > 0) return;
    this.idleT = 2.5 + Math.random() * 6;
    const maxR = this.home ? 160 : 60;
    const ang = Math.random() * Math.PI * 2, r = 18 + Math.random() * (maxR - 18);
    w.goTo(ref.x + Math.cos(ang) * r, ref.y + Math.sin(ang) * r * 0.8);
  }
}
// ---------------------------------------------------------------------
// Necessidades do ser humano: fome, sede, temperatura do corpo, energia e saúde,
// ciclo de dia e noite, clima por região e formas de saciar cada necessidade.
// ---------------------------------------------------------------------

