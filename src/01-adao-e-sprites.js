'use strict';
/** Largura e altura de cada quadro (px). */
const SPRITE_W = 22;
const SPRITE_H = 28;
/** Posição horizontal do centro do personagem (entre os pixels 10 e 11). */
const CENTER_X = 11;
/** Duração de um pulo (s), distância horizontal máxima por pulo e altura (px). */
const HOP_SECONDS = 0.54;
const HOP_DISTANCE = 18;
const HOP_HEIGHT = 5;

/** Paleta fixa (poucas cores, como em pixel art de verdade). */
const PAL = Object.freeze({
  outline: '#2b1a12',
  skin: ['#b57f61', '#d6a07c', '#f1c7a3', '#fbdfc6'],
  hair: ['#46291a', '#6a4222', '#8d5b30'],
  beard: ['#3a2113', '#58361d', '#74482a'],
  eye: '#1f130d',
  mouth: '#9a5545',
  blush: '#e8a08f',
  leaf: ['#2f6026', '#4f8a3a', '#86bf55'],
});

/** @param {number} v @param {number} lo @param {number} hi @returns {number} */
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/** Hash simples de 2 inteiros → [0,1). */
function hash2(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Grade de pixels coloridos (cor CSS ou null para transparente). */
class PixelGrid {
  /** @param {number} w @param {number} h */
  constructor(w, h) {
    this.w = w;
    this.h = h;
    /** @type {Array<string|null>} */
    this.cells = new Array(w * h).fill(null);
  }

  /** @param {number} x @param {number} y @param {string|null} c */
  set(x, y, c) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.cells[y * this.w + x] = c; }

  /** @returns {string|null} */
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.cells[y * this.w + x] : null; }

  /** @returns {PixelGrid} cópia espelhada na horizontal */
  mirrored() {
    const g = new PixelGrid(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) g.set(this.w - 1 - x, y, this.get(x, y));
    return g;
  }

  /** @returns {HTMLCanvasElement} */
  toCanvas() {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    const ctx = c.getContext('2d');
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const col = this.get(x, y);
      if (col) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); }
    }
    return c;
  }
}

/** Luz vinda de cima à esquerda sobre uma elipse; (dx, dy) em [-1, 1]. */
function lightAt(dx, dy) {
  const nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
  return -0.42 * dx - 0.58 * dy + 0.7 * nz;
}

/** @param {number} l luz @returns {string} cor de pele */
function skinTone(l) { return PAL.skin[l > 0.78 ? 3 : l > 0.38 ? 2 : l > 0.05 ? 1 : 0]; }

/** @param {number} l luz @returns {string} cor de cabelo */
function hairTone(l) { return PAL.hair[l > 0.8 ? 2 : l > 0.22 ? 1 : 0]; }

/** @param {number} l luz @returns {string} cor de barba */
function beardTone(l) { return PAL.beard[l > 0.8 ? 2 : l > 0.25 ? 1 : 0]; }

/** Folha de figo em pixels (7×5): pecíolo em cima e lóbulos pontudos embaixo. */
const LEAF_STAMP = [
  '...G...',
  '..GgG..',
  '.GgLgG.',
  'GgGgLgG',
  'G.GgG.G',
];

/** Gera os quadros do personagem. */
class AdamSpriteFactory {
  /**
   * Desenha um quadro.
   * @param {'down'|'up'|'right'} dir direção em que o personagem olha
   * @param {{sq: number, breath: number, blink: boolean}} state sq>0 agacha, sq<0 estica; breath sobe a cabeça 1 px
   * @returns {PixelGrid}
   */
  build(dir, state) {
    const g = new PixelGrid(SPRITE_W, SPRITE_H);
    const cx = CENTER_X;
    const sq = state.sq;
    const bodyRy = 6.6 * (sq > 0 ? 1 - 0.16 * sq : 1 + 0.14 * -sq);
    const bodyRx = 8 * (sq > 0 ? 1 + 0.05 * sq : 1 - 0.05 * -sq);
    const bodyBottom = 25.5;
    const bodyCy = bodyBottom - bodyRy;
    const headRx = dir === 'right' ? 5.6 : 6;
    const headRy = 5.4;
    const headCy = bodyCy - bodyRy + 2.4 - headRy - state.breath;
    const isHead = new Uint8Array(SPRITE_W * SPRITE_H);

    // pezinhos (a base do boneco de neve fica no chão)
    const foot = PAL.skin[1];
    if (dir === 'right') {
      for (let x = cx - 3; x <= cx + 2; x++) { g.set(x, 25, foot); g.set(x, 26, PAL.skin[0]); }
    } else {
      for (const x0 of [6, 13]) for (let x = x0; x < x0 + 3; x++) { g.set(x, 25, foot); g.set(x, 26, PAL.skin[0]); }
    }

    // corpo
    for (let y = 0; y < SPRITE_H; y++) for (let x = 0; x < SPRITE_W; x++) {
      const dx = (x + 0.5 - cx) / bodyRx, dy = (y + 0.5 - bodyCy) / bodyRy;
      if (dx * dx + dy * dy <= 1) g.set(x, y, skinTone(lightAt(dx, dy)));
    }

    // umbigo e folha de figo na frente do corpo
    if (dir === 'down') {
      g.set(cx - 1, Math.round(bodyCy - 0.5), PAL.skin[0]);
      const top = Math.floor(bodyBottom) - 6;
      LEAF_STAMP.forEach((row, ry) => [...row].forEach((ch, rx) => {
        if (ch === '.') return;
        g.set(cx - 3 + rx, top + ry, ch === 'G' ? PAL.leaf[0] : ch === 'g' ? PAL.leaf[1] : PAL.leaf[2]);
      }));
    } else if (dir === 'right') {
      const x0 = Math.round(cx + bodyRx * 0.8) - 1;
      const top = Math.floor(bodyBottom) - 6;
      [[PAL.leaf[0], PAL.leaf[2]], [PAL.leaf[1], PAL.leaf[1]], [PAL.leaf[1], PAL.leaf[2]], [PAL.leaf[0], PAL.leaf[1]]].forEach((pair, ry) => { g.set(x0, top + ry, pair[0]); g.set(x0 + 1, top + ry, pair[1]); });
    }

    // cabeça (pele)
    const hcx = cx;
    for (let y = 0; y < SPRITE_H; y++) for (let x = 0; x < SPRITE_W; x++) {
      const dx = (x + 0.5 - hcx) / headRx, dy = (y + 0.5 - headCy) / headRy;
      if (dx * dx + dy * dy <= 1) { g.set(x, y, skinTone(lightAt(dx, dy))); isHead[y * SPRITE_W + x] = 1; }
    }
    const headNorm = (x, y) => ({ dx: (x + 0.5 - hcx) / headRx, dy: (y + 0.5 - headCy) / headRy });
    const eyeY = Math.round(headCy);

    // barba, cabelo e rosto, conforme a direção
    if (dir === 'down') this.drawFront(g, isHead, headNorm, eyeY, headCy, headRy, state);
    else if (dir === 'up') this.drawBack(g, isHead, headNorm);
    else this.drawSide(g, isHead, headNorm, eyeY, headCy, headRy, state);

    // contorno externo e linha que separa a cabeça do corpo
    const W = SPRITE_W, H = SPRITE_H;
    const outline = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = g.get(x, y);
      if (c === null) {
        if (g.get(x - 1, y) || g.get(x + 1, y) || g.get(x, y - 1) || g.get(x, y + 1)) outline.push([x, y]);
      } else if (!isHead[y * W + x] && y > headCy && (isHead[y * W + x - 1] || isHead[y * W + x + 1] || (y > 0 && isHead[(y - 1) * W + x]))) {
        outline.push([x, y]);
      }
    }
    for (const [x, y] of outline) g.set(x, y, PAL.outline);
    return g;
  }

  /** Vista de frente: olhos, nariz, bochechas, bigode e barba curta. */
  drawFront(g, isHead, N, eyeY, headCy, headRy, state) {
    const cx = CENTER_X;
    const beardTopDy = 0.46;
    // barba (inclui um pouco abaixo do queixo)
    const goateeCy = headCy + headRy - 0.4;
    const inBeard = (x, y) => {
      const n = N(x, y);
      if (isHead[y * SPRITE_W + x] && (n.dy > beardTopDy || (Math.abs(n.dx) > 0.8 && n.dy > 0.05))) return true;
      const gx = (x + 0.5 - cx) / 3.6, gy = (y + 0.5 - goateeCy) / 2.2;
      return gx * gx + gy * gy <= 1 && y > headCy;
    };
    for (let y = 0; y < SPRITE_H; y++) for (let x = 0; x < SPRITE_W; x++) {
      if (!inBeard(x, y)) continue;
      const n = N(x, y);
      g.set(x, y, beardTone(lightAt(n.dx, n.dy) + ((x + y) % 3 === 0 ? 0.12 : 0)));
    }
    // cabelo
    for (let y = 0; y < SPRITE_H; y++) for (let x = 0; x < SPRITE_W; x++) {
      if (!isHead[y * SPRITE_W + x]) continue;
      const n = N(x, y);
      const e = Math.abs(n.dx);
      if (n.dy < -0.34 + 0.44 * e * e || (e > 0.82 && n.dy < 0.22)) {
        let l = lightAt(n.dx, n.dy);
        if ((x + y) % 4 === 0 && l > 0.2) l += 0.35;
        g.set(x, y, hairTone(l));
      }
    }
    // rosto
    g.set(7, eyeY + 2, PAL.blush); g.set(14, eyeY + 2, PAL.blush);
    g.set(8, eyeY - 2, PAL.hair[0]); g.set(9, eyeY - 2, PAL.hair[0]); g.set(12, eyeY - 2, PAL.hair[0]); g.set(13, eyeY - 2, PAL.hair[0]);
    for (const x of [8, 13]) { if (!state.blink) g.set(x, eyeY, PAL.eye); g.set(x, eyeY + 1, PAL.eye); }
    g.set(10, eyeY + 2, PAL.skin[1]); g.set(11, eyeY + 2, PAL.skin[1]);
    g.set(10, eyeY + 4, PAL.mouth); g.set(11, eyeY + 4, PAL.mouth);
  }

  /** Vista de costas: cabelo cobre quase toda a cabeça. */
  drawBack(g, isHead, N) {
    for (let y = 0; y < SPRITE_H; y++) for (let x = 0; x < SPRITE_W; x++) {
      if (!isHead[y * SPRITE_W + x]) continue;
      const n = N(x, y);
      if (n.dy < 0.55 || (Math.abs(n.dx) > 0.7 && n.dy < 0.75)) {
        let l = lightAt(n.dx, n.dy);
        if (x % 3 === 0 && l > 0.1) l -= 0.3;
        else if ((x + y * 2) % 5 === 0 && l > 0.2) l += 0.3;
        g.set(x, y, hairTone(l));
      }
    }
    // pescoço sombreado sob o cabelo
    for (let x = 8; x <= 13; x++) { const y = Math.round(Math.max(...[...Array(SPRITE_H).keys()].filter((yy) => isHead[yy * SPRITE_W + x]))); if (g.get(x, y) === PAL.skin[2] || g.get(x, y) === PAL.skin[3]) g.set(x, y, PAL.skin[1]); }
  }

  /** Perfil olhando para a direita: nariz, olho, orelha, barba e cabelo na nuca. */
  drawSide(g, isHead, N, eyeY, headCy, headRy, state) {
    const cx = CENTER_X;
    const goateeCy = headCy + headRy - 0.4;
    for (let y = 0; y < SPRITE_H; y++) for (let x = 0; x < SPRITE_W; x++) {
      const n = N(x, y);
      const head = isHead[y * SPRITE_W + x];
      const gx = (x + 0.5 - (cx + 2)) / 3.4, gy = (y + 0.5 - goateeCy) / 2.2;
      const goatee = gx * gx + gy * gy <= 1 && y > headCy;
      if ((head && n.dy > 0.3 && n.dx > -0.05) || goatee) {
        g.set(x, y, beardTone(lightAt(n.dx, n.dy) + ((x + y) % 3 === 0 ? 0.12 : 0)));
      }
    }
    for (let y = 0; y < SPRITE_H; y++) for (let x = 0; x < SPRITE_W; x++) {
      if (!isHead[y * SPRITE_W + x]) continue;
      const n = N(x, y);
      const hair = n.dx < 0.0 ? n.dy < 0.62 : n.dy < -0.36 + 0.1 * n.dx;
      if (hair) {
        let l = lightAt(n.dx, n.dy);
        if ((x + y) % 4 === 0 && l > 0.2) l += 0.35;
        g.set(x, y, hairTone(l));
      }
    }
    // orelha, olho, sobrancelha, nariz, boca e bochecha
    g.set(cx - 2, eyeY + 1, PAL.skin[1]); g.set(cx - 1, eyeY + 1, PAL.skin[1]); g.set(cx - 2, eyeY + 2, PAL.skin[0]); g.set(cx - 1, eyeY + 2, PAL.skin[1]);
    const ex = cx + 3;
    if (!state.blink) g.set(ex, eyeY, PAL.eye);
    g.set(ex, eyeY + 1, PAL.eye);
    g.set(ex, eyeY - 2, PAL.hair[0]); g.set(ex + 1, eyeY - 2, PAL.hair[0]);
    g.set(cx + 6, eyeY + 1, PAL.skin[2]); g.set(cx + 6, eyeY + 2, PAL.skin[1]);
    g.set(cx + 4, eyeY + 2, PAL.blush);
    g.set(cx + 5, eyeY + 4, PAL.mouth);
  }
}

/** Estados de desenho de cada momento do pulo. */
const FRAME_STATES = {
  idle0: { sq: 0, breath: 0, blink: false },
  idle1: { sq: 0, breath: 1, blink: false },
  blink: { sq: 0, breath: 0, blink: true },
  crouch: { sq: 1, breath: 0, blink: false },
  stretch: { sq: -1, breath: 0, blink: false },
  air: { sq: -0.5, breath: 0, blink: false },
  land: { sq: 0.8, breath: 0, blink: false },
};
const FRAME_LABELS = { idle0: 'Parado', idle1: 'Respira', blink: 'Pisca', crouch: 'Agacha', stretch: 'Impulso', air: 'No ar', land: 'Pousa' };

/** Guarda os quadros já desenhados (e os espelhados para a esquerda). */
class SpriteBank {
  /** @param {AdamSpriteFactory} [factory] fábrica de quadros (padrão: Adão) */
  constructor(factory = new AdamSpriteFactory()) {
    /** @type {Object<string, HTMLCanvasElement>} */
    this.canvases = {};
    for (const [name, state] of Object.entries(FRAME_STATES)) {
      for (const dir of ['down', 'up', 'right']) {
        const grid = factory.build(dir, state);
        this.canvases[`${dir}:${name}`] = grid.toCanvas();
        if (dir === 'right') this.canvases[`left:${name}`] = grid.mirrored().toCanvas();
      }
    }
  }

  /** @param {string} dir @param {string} name @returns {HTMLCanvasElement} */
  get(dir, name) { return this.canvases[`${dir}:${name}`]; }
}

// ---------------------------------------------------------------------
// Vegetação e rochas em pixel art: cada espécie é desenhada por código,
// com luz vinda de cima à esquerda e variações sorteadas por semente.
// ---------------------------------------------------------------------

