// ---------------------------------------------------------------------
// Animais em pixel art: construtores por "plano corporal" (quadrúpede, ave,
// peixe, réptil...) e uma ficha por espécie, com quadros de andar, comer e
// uma ação própria. Sempre desenhados olhando para a direita.
// ---------------------------------------------------------------------

/** Rampas de pelagem (escuro → claro). */
const AR = Object.freeze({
  rabbit: ['#5a4636', '#8a7258', '#b89c7c', '#e0ccb0'],
  wool: ['#b8b2a6', '#d8d2c6', '#eeeae0', '#ffffff'],
  darkFace: ['#1f1b18', '#2e2824', '#443c36', '#5e544c'],
  deer: ['#5a3a22', '#7e5430', '#a8764a', '#cf9f6c'],
  squirrel: ['#6a3a1c', '#944f26', '#bf7238', '#e29a58'],
  fox: ['#8a3a12', '#b8541c', '#e0762c', '#f4a24c'],
  frog: ['#1f5a2a', '#2f7e36', '#4ea84a', '#8bd267'],
  shell: ['#7a4a22', '#a8683a', '#cf8f58', '#ecb88a'],
  snailBody: ['#8a7e66', '#a89c84', '#c8bca0', '#e4dac4'],
  monkey: ['#3a2418', '#5a3a24', '#7e5434', '#a8743e'],
  skin: ['#8a5a3a', '#b07e58', '#d2a47c', '#ecc8a0'],
  macaw: ['#7a0f12', '#b01c1c', '#e03030', '#ff6a5a'],
  jaguar: ['#b87a1a', '#d9962a', '#efb340', '#fcd878'],
  croc: ['#1f3f22', '#2f5e30', '#488044', '#6ea45a'],
  heron: ['#5a6a7e', '#7e8fa4', '#a5b4c4', '#d4dde6'],
  white: ['#aab4c2', '#d0d8e2', '#f0f4f8', '#ffffff'],
  camel: ['#8a6a3a', '#b08a4c', '#d2ac6a', '#ecca8c'],
  lizard: ['#7a5a2a', '#a08040', '#c8a85a', '#e8d088'],
  scorpion: ['#3a1c0a', '#5e2e12', '#8a4a1e', '#b87038'],
  wolf: ['#3a3e46', '#5a606a', '#868c96', '#b8bec8'],
  reindeer: ['#7a6a58', '#a08c76', '#c8b49c', '#ece0cc'],
  polar: ['#b8c4d4', '#d8e0ec', '#f0f4fa', '#ffffff'],
  seal: ['#5a6272', '#7e8898', '#a8b2c0', '#d4dae4'],
  crab: ['#8a1a10', '#b8301c', '#e0502c', '#f89060'],
  duck: ['#5a4a38', '#8a7458', '#b09c7a', '#d8c8a4'],
  green: ['#143a1e', '#1f5a2c', '#2f7e3c', '#4ea85a'],
  goldfish: ['#a85a1a', '#d27a28', '#f0a040', '#ffd078'],
  silver: ['#4a6a88', '#7a9ab4', '#a8c4d8', '#d8e8f2'],
  dolphin: ['#4a5a72', '#6a7e98', '#8fa2ba', '#b8c8dc'],
});

/** Grade com escala: o código desenha em coordenadas "grandes" e o resultado sai menor, em pixels inteiros. */
class ScaledGrid {
  /** @param {number} w @param {number} h @param {number} s fator de escala (0–1) */
  constructor(w, h, s) {
    this.s = s;
    this.grid = new PixelGrid(Math.max(4, Math.ceil(w * s)), Math.max(4, Math.ceil(h * s)));
    this.w = this.grid.w;
    this.h = this.grid.h;
  }

  set(x, y, c) { this.grid.set(Math.round(x * this.s), Math.round(y * this.s), c); }

  get(x, y) { return this.grid.get(Math.round(x * this.s), Math.round(y * this.s)); }

  /** Escrita direta (já em pixels finais). */
  put(x, y, c) { this.grid.set(x, y, c); }

  pget(x, y) { return this.grid.get(x, y); }

  toCanvas() { return this.grid.toCanvas(); }

  mirrored() { return this.grid.mirrored(); }
}

/** Escala usada pelos construtores durante a montagem de um quadro. */
let CUR_SCALE = 1;

/** @returns {ScaledGrid} grade na escala da espécie em construção */
function newGrid(w, h) { return new ScaledGrid(w, h, CUR_SCALE); }

/** Pinta só onde já existe pixel (barriga, manchas, brilhos). */
function blobOn(g, cx, cy, rx, ry, ramp, bias = 0) {
  const k = g.s || 1;
  if (k !== 1) { cx *= k; cy *= k; rx = Math.max(0.9, rx * k); ry = Math.max(0.9, ry * k); }
  const get = g.pget ? g.pget.bind(g) : g.get.bind(g), put = g.put ? g.put.bind(g) : g.set.bind(g);
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy > 1 || get(x, y) === null) continue;
    put(x, y, ramp[toneIdx(lightAt(dx, dy) + bias, x, y, 0.1)]);
  }
}

/** Pontos soltos só sobre pixels existentes (manchas, pintas). */
function speckle(g, seed, n, color, x0, y0, x1, y1) {
  const rnd = mulberry32(seed), k = g.s || 1;
  const get = g.pget ? g.pget.bind(g) : g.get.bind(g), put = g.put ? g.put.bind(g) : g.set.bind(g);
  const cnt = Math.max(2, Math.round(n * k * k));
  for (let i = 0; i < cnt; i++) { const x = Math.floor((x0 + rnd() * (x1 - x0)) * k), y = Math.floor((y0 + rnd() * (y1 - y0)) * k); if (get(x, y) !== null) put(x, y, color); }
}

/** Itens pequenos que aparecem na boca quando o bicho come (cada um com poucos pixels). */
const ITEM_PIXELS = {
  grass: [['#4ea84a', 0, 0], ['#6fc85a', 1, -1], ['#3a8a3a', -1, 0], ['#6fc85a', 0, -1]],
  berry: [['#c43a4a', 0, 0], ['#e0586a', 1, 0], ['#7a1a28', 0, 1], ['#4a8a3a', 0, -1]],
  nut: [['#8a5a2a', 0, 0], ['#b07a3a', 1, 0], ['#5a3a1a', 0, 1], ['#b07a3a', 1, -1]],
  fish: [['#a8c4d8', 0, 0], ['#d8e8f2', 1, 0], ['#7a9ab4', 2, 0], ['#4a6a88', 3, -1], ['#4a6a88', 3, 1], ['#a8c4d8', -1, 0]],
  banana: [['#f0d040', 0, 0], ['#f8e870', 1, -1], ['#d8b020', 2, -1], ['#8a6a1a', 3, -2]],
  leaf: [['#4ea84a', 0, 0], ['#8bd267', 1, -1], ['#2f7e36', 2, 0]],
  moss: [['#8aa05a', 0, 0], ['#aac070', 1, 0], ['#6a8a42', 0, 1]],
  fly: [['#1f1b18', 0, 0], ['#dce8f0', -1, -1], ['#dce8f0', 1, -1]],
  carrot: [['#f08a2a', 0, 0], ['#d86a1a', 1, 0], ['#4ea84a', -1, -1], ['#6fc85a', -2, -1]],
  meat: [['#c43a4a', 0, 0], ['#e0586a', 1, 0], ['#8a1a28', 0, 1], ['#f0d0c0', 1, 1]],
  seed: [['#e8d098', 0, 0], ['#c8a868', 1, 0], ['#f4e4b8', 0, 1]],
  insect: [['#3a2418', 0, 0], ['#6a4a2a', 1, 0], ['#3a2418', 2, 0]],
};

/** Opções de pose de um quadro de quadrúpede. */
function quadPose(p, frame) {
  const sit = !!p.sitter;
  switch (frame) {
    case 'w0': return { walk: 1 };
    case 'w1': return { walk: 2, bob: -1 };
    case 'eat0': return sit ? { sit: true, paws: true } : { head: 'down' };
    case 'eat1': return sit ? { sit: true, paws: true, mouth: true } : { head: 'down', mouth: true };
    case 'act0': case 'act1': {
      const b = frame === 'act1';
      switch (p.act) {
        case 'howl': return { head: 'up', mouth: b };
        case 'yawn': return { mouth: b, eyesClosed: true, head: b ? 'up' : 'level' };
        case 'lie': return { lie: true, head: b ? 'down' : 'level', eyesClosed: b };
        case 'sit': return { sit: true, tall: b };
        case 'alert': return { sit: true, tall: true, earsUp: b };
        default: return {};
      }
    }
    default: return {};
  }
}

/** Corpo de quadrúpede: pernas, corpo, pescoço, cabeça, orelhas, chifres e cauda. */
function drawQuad(p, frame) {
  const g = newGrid(p.W, p.H);
  const ps = quadPose(p, frame);
  const R = p.fur, HR = p.headRamp || p.fur, gy = p.H - 3;
  const brx = p.brx, bry = p.bry;
  let bx = p.bx, by = gy - p.legLen - bry * 0.55 + (ps.bob || 0);
  if (ps.lie) by = gy - bry * 0.85;
  if (ps.sit) { by = gy - bry * (ps.tall ? 1.15 : 0.95); }
  const hipY = by + bry * 0.55;
  const legR = p.legs || R;
  const sw = p.swing || 3;
  // pernas
  const legsDef = [
    { x: bx - brx * 0.55, far: true, ph: ps.walk === 1 ? -1 : 1 },
    { x: bx + brx * 0.58, far: true, ph: ps.walk === 1 ? -1 : 1 },
    { x: bx - brx * 0.4, far: false, ph: ps.walk === 1 ? -1 : 1 },
    { x: bx + brx * 0.7, far: false, ph: ps.walk === 1 ? 1 : -1 },
  ];
  // pernas do mesmo lado alternam: ajuste para marcha diagonal
  legsDef[0].ph = ps.walk === 1 ? 1 : -1; legsDef[1].ph = ps.walk === 1 ? -1 : 1;
  if (!ps.lie && !ps.sit) {
    for (const l of legsDef) {
      const off = ps.walk ? l.ph * sw : 0;
      thickLine(g, l.x, hipY, l.x + off, gy, p.legW, (t, dx) => legR[l.far ? (dx < 0 ? 1 : 0) : (dx < 0 ? 2 : 1)]);
      g.set(Math.round(l.x + off), gy, legR[0]);
    }
  } else if (ps.lie) {
    fillBlob(g, bx + brx * 0.6, gy - 1.3, p.legW + 1.2, 1.5, legR, 0.1);
    fillBlob(g, bx - brx * 0.5, gy - 1.5, p.legW + 2, 1.8, legR, 0.1);
  } else {
    fillBlob(g, bx - brx * 0.35, gy - bry * 0.6, brx * 0.5, bry * 0.7, R, 0.12);
    thickLine(g, bx + brx * 0.55, by + bry * 0.4, bx + brx * 0.8, gy, p.legW, () => legR[1]);
  }
  // corpo
  if (p.wool) {
    for (const [dx, dy, r] of [[-0.55, 0.05, 4.2], [0, -0.35, 4.6], [0.5, 0.0, 4.2], [-0.2, 0.35, 4], [0.3, 0.4, 3.8], [-0.7, 0.4, 3.4], [0.75, 0.35, 3.2]]) fillBlob(g, bx + dx * brx, by + dy * bry, r, r * 0.9, R, 0.2);
  } else {
    fillBlob(g, bx, by, brx, bry, R, 0.14);
    if (p.belly) blobOn(g, bx + brx * 0.1, by + bry * 0.62, brx * 0.85, bry * 0.42, p.belly, 0.1);
  }
  if (p.hump) fillBlob(g, bx - brx * 0.1, by - bry - 1.5, 4.2, 3.8, R, 0.14);
  // cabeça e pescoço
  const hr = p.headR * (p.cute === false ? 1 : 1.2);
  let hx, hy, ang;
  if (ps.sit) { hx = bx + brx * 0.55; hy = by - bry - hr * 0.45; ang = ps.paws ? 0.5 : 0.25; }
  else if (ps.head === 'down') { hx = bx + brx + p.neck * 0.45 + 1; hy = gy - hr * 0.8; ang = 1.15; }
  else if (ps.head === 'up') { hx = bx + brx * 0.85 + p.neck * 0.45; hy = by - bry - p.neck - hr * 0.1; ang = -0.5; }
  else { hx = bx + brx + p.neck * 0.55; hy = by - bry * 0.5 - p.neck * 0.55 - hr * 0.05; ang = 0.2; }
  if (ps.lie && ps.head !== 'down') { hy += 1; }
  const nb = { x: bx + brx * 0.7, y: by - bry * 0.35 };
  const nsteps = Math.max(6, Math.ceil(Math.hypot(hx - nb.x, hy - nb.y) / 0.9));
  for (let i = 0; i <= nsteps; i++) { const t = i / nsteps; fillBlob(g, nb.x + (hx - nb.x) * t, nb.y + (hy - nb.y) * t, p.neckR + (hr * 0.8 - p.neckR) * t, (p.neckR + (hr * 0.8 - p.neckR) * t) * 0.95, HR, 0.12); }
  fillBlob(g, hx, hy, hr, hr * 0.92, HR, 0.12);
  const sx = hx + Math.cos(ang) * hr * 0.85, sy = hy + Math.sin(ang) * hr * 0.85;
  fillBlob(g, sx, sy, p.snoutR, p.snoutR * 0.82, p.snout || HR, 0.1);
  const tipX = sx + Math.cos(ang) * p.snoutR * 0.8, tipY = sy + Math.sin(ang) * p.snoutR * 0.8;
  g.set(Math.round(tipX), Math.round(tipY), '#1f1410');
  let mouth = { x: Math.round(tipX), y: Math.round(tipY + 1) };
  if (ps.mouth) { for (let k = -1; k <= 1; k++) g.set(Math.round(sx + k), Math.round(sy + p.snoutR * 0.75), '#7a2a30'); mouth = { x: Math.round(sx + 1), y: Math.round(sy + p.snoutR * 0.9) }; }
  // olho
  {
    const k = g.s || 1, ex = Math.round((hx + hr * 0.32) * k), ey = Math.round((hy - hr * 0.2) * k);
    const big = hr * k >= 2.3;
    if (ps.eyesClosed) { g.put(ex, ey, R[0]); if (big) g.put(ex + 1, ey, R[0]); }
    else if (big) { for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) g.put(ex + dx, ey + dy, '#1a0f0a'); g.put(ex, ey, '#ffffff'); }
    else g.put(ex, ey, '#1a0f0a');
    if (big) g.put(ex - 1, ey + 2, '#eea0a4');
  }
  // orelhas
  if (p.ear === 'long') {
    const up = ps.earsUp || ps.tall ? 1 : 0;
    for (const [dx, k] of [[-0.45, 0], [-0.1, 1]]) {
      fillCapsule(g, hx + dx * hr, hy - hr * 0.7, hx + dx * hr - 1.2 + (up ? 0 : -2.2), hy - hr * 0.7 - p.earLen * (up ? 1 : 0.78), 1.35, k ? R : p.earIn || R);
    }
  } else if (p.ear === 'pointy') {
    for (const dx of [-0.45, 0.0]) { const bx2 = hx + dx * hr, by2 = hy - hr * 0.7; for (let r = 0; r < 4; r++) for (let x = -(3 - r) / 2; x <= (3 - r) / 2; x++) g.set(Math.round(bx2 + x), by2 - r, R[dx < -0.2 ? 1 : 2]); g.set(Math.round(bx2), by2 - 1, p.earIn || '#2a1c14'); }
  } else if (p.ear === 'short') {
    fillBlob(g, hx - hr * 0.4, hy - hr * 0.78, 1.8, 1.6, HR, 0.1);
    fillBlob(g, hx - hr * 0.05, hy - hr * 0.85, 1.6, 1.5, HR, 0.1);
  }
  if (p.antlers) {
    const c = p.antlerColor || '#e0d0a8', ox = hx - hr * 0.3, oy = hy - hr * 0.8;
    thickLine(g, ox, oy, ox - 2, oy - 5, 1, () => c); thickLine(g, ox - 2, oy - 5, ox - 5, oy - 9, 1, () => c); thickLine(g, ox - 2, oy - 5, ox + 1, oy - 9, 1, () => c); thickLine(g, ox - 1, oy - 2, ox + 2, oy - 4, 1, () => c);
    thickLine(g, ox + 2, oy, ox + 1, oy - 4, 1, () => c); thickLine(g, ox + 1, oy - 4, ox + 4, oy - 8, 1, () => c);
  }
  // cauda
  const ty = by - bry * 0.3;
  if (p.tail === 'puff') fillBlob(g, bx - brx - 0.5, ty + 1, 2.2, 2.2, p.tailRamp || AR.white, 0.1);
  else if (p.tail === 'short') fillBlob(g, bx - brx - 0.5, ty + 1, 1.8, 1.6, R, 0.1);
  else if (p.tail === 'bushy') { for (let i = 0; i < 6; i++) fillBlob(g, bx - brx - 1 - i * 1.5, ty + 1.5 + i * 0.5, 2.6 - i * 0.12, 2.2, i > 3 ? (p.tailTip || R) : R, 0.12); }
  else if (p.tail === 'long') thickLine(g, bx - brx, ty, bx - brx - 8, ty + 4 + (ps.walk ? 1 : 0), 1.6, (t) => R[t > 0.7 ? 1 : 2]);
  else if (p.tail === 'curl') { thickLine(g, bx - brx, ty + 1, bx - brx - 4, ty + 5, 1.6, () => R[1]); thickLine(g, bx - brx - 4, ty + 5, bx - brx - 8, ty + 2, 1.6, () => R[2]); thickLine(g, bx - brx - 8, ty + 2, bx - brx - 7, ty - 3, 1.6, () => R[1]); }
  if (p.spots) speckle(g, 9, p.spots, p.spotColor || '#3a2410', bx - brx, by - bry, bx + brx, by + bry);
  // patas dianteiras na posição "mãos à boca"
  if (ps.paws) { fillBlob(g, hx + 1.5, hy + hr * 0.9, 1.6, 1.3, p.snout || R, 0.1); fillBlob(g, hx - 0.5, hy + hr * 0.95, 1.4, 1.2, p.snout || R, 0.1); mouth = { x: Math.round(hx + 3), y: Math.round(hy + hr * 0.6) }; }
  addOutline(g, p.outline || '#2a1a10');
  return { g, mouth };
}

/** Ave em pé: corpo, pescoço, bico, asa e pernas; bica o chão ao comer. */
function drawBird(p, frame) {
  const g = newGrid(p.W, p.H);
  const gy = p.H - 2, R = p.fur;
  const walk = frame === 'w0' ? 1 : frame === 'w1' ? 2 : 0;
  const peck = frame === 'eat0' || frame === 'eat1';
  const flap = p.act === 'flap' && (frame === 'act0' || frame === 'act1');
  const bx = p.bx, by = gy - p.legLen - p.bry - (walk === 2 ? 0 : 0) + (frame === 'w1' ? -1 : 0);
  // pernas
  if (p.legLen > 0) for (const [dx, ph] of [[-2.4, walk === 1 ? 1 : -1], [2.4, walk === 1 ? -1 : 1]]) thickLine(g, bx + dx, by + p.bry * 0.6, bx + dx + (walk ? ph * 2.5 : 0), gy, 1, () => p.legColor || '#e08a2a');
  // cauda
  fillBlob(g, bx - p.brx - 1.5, by + 0.5, p.tailLen, p.bry * 0.55, p.tailRamp || R, 0.12);
  fillBlob(g, bx, by, p.brx, p.bry, R, 0.14);
  if (p.belly) blobOn(g, bx + 0.5, by + p.bry * 0.55, p.brx * 0.85, p.bry * 0.45, p.belly, 0.1);
  // pescoço e cabeça
  const nb = { x: bx + p.brx * 0.55, y: by - p.bry * 0.5 };
  let hx = bx + p.brx * 0.7 + 1, hy = by - p.bry - p.neck - p.headR * 0.4;
  let ang = 0;
  if (peck) { hx = bx + p.brx + p.neck * 0.7 + 1; hy = gy - p.headR * 0.7 - (p.legLen > 4 ? 0 : 0); ang = 1.1; }
  else if (p.act === 'preen' && (frame === 'act0' || frame === 'act1')) { hx = bx - 1; hy = by - p.bry * 0.2; ang = frame === 'act1' ? 2.6 : 3.0; }
  const neckR = p.neckR || p.headR * 0.55;
  const bsteps = Math.max(5, Math.ceil(Math.hypot(hx - nb.x, hy - nb.y) / 0.8));
  for (let i = 0; i <= bsteps; i++) { const t = i / bsteps; fillBlob(g, nb.x + (hx - nb.x) * t, nb.y + (hy - nb.y) * t, neckR, neckR, p.neckRamp || R, 0.1); }
  fillBlob(g, hx, hy, p.headR, p.headR, p.headRamp || R, 0.1);
  if (p.crest) fillBlob(g, hx - 1, hy - p.headR - 0.5, 1.6, 2.2, p.crest, 0.1);
  const bl = p.beak, bc = p.beakColor || '#f0c040';
  const bxp = hx + Math.cos(ang) * p.headR * 0.8, byp = hy + Math.sin(ang) * p.headR * 0.8;
  const open = frame === 'eat1' || (frame === 'act1' && p.act === 'call');
  thickLine(g, bxp, byp, bxp + Math.cos(ang) * bl, byp + Math.sin(ang) * bl + (p.beakCurve || 0), p.beakW || 1.6, () => bc);
  if (open) g.set(Math.round(bxp + Math.cos(ang) * bl * 0.6), Math.round(byp + Math.sin(ang) * bl * 0.6 + 1), '#7a2a30');
  {
    const k = g.s || 1, ex = Math.round((hx + Math.cos(ang - 0.7) * p.headR * 0.55) * k), ey = Math.round((hy + Math.sin(ang - 0.7) * p.headR * 0.55) * k);
    if (p.headR * k >= 1.8) { g.put(ex, ey, '#1a0f0a'); g.put(ex + 1, ey, '#1a0f0a'); g.put(ex, ey + 1, '#1a0f0a'); g.put(ex + 1, ey + 1, '#1a0f0a'); g.put(ex, ey, '#ffffff'); }
    else g.put(ex, ey, '#1a0f0a');
  }
  // asa
  if (flap) {
    const up = frame === 'act1';
    for (let i = 0; i < 5; i++) fillBlob(g, bx - 1 - i * 1.4, by - p.bry * (0.4 + i * 0.35) - (up ? 2 : 0), 2.4, 3.2, p.wing || R, 0.12);
    for (let i = 0; i < 3; i++) fillBlob(g, bx - 2 - i * 1.6, by + (up ? -3 : 1) - i * 0.5, 2.8, 2.2, p.wing || R, 0.12);
  } else fillBlob(g, bx - 0.5, by + 0.5, p.brx * 0.75, p.bry * 0.62, p.wing || R, 0.12);
  if (p.speckle) speckle(g, 5, p.speckle[0], p.speckle[1], bx - p.brx, by - p.bry, bx + p.brx, by + p.bry);
  const mouth = { x: Math.round(bxp + Math.cos(ang) * bl), y: Math.round(byp + Math.sin(ang) * bl + 1) };
  addOutline(g, p.outline || '#2a1a10');
  if (p.waterline) { for (let y = Math.floor(by + p.bry * 0.35); y < p.H; y++) for (let x = 0; x < p.W; x++) g.set(x, y, null); addOutline(g, p.outline || '#2a1a10'); }
  return { g, mouth };
}

/** Sapo: pula; ao comer, lança a língua; ao "cantar", infla a garganta. */
function drawFrog(p, frame) {
  const g = newGrid(20, 16);
  const air = frame === 'w1', crouch = frame !== 'w1';
  const by = air ? 7 : 10;
  fillBlob(g, 9, by, 5.5, air ? 3.6 : 4.2, AR.frog, 0.14);
  blobOn(g, 9.5, by + 2, 4.4, 2, [AR.frog[3], AR.frog[3], '#d8e8a8', '#e8f0c0'], 0.1);
  if (air) { thickLine(g, 5, by + 1, 1, by + 4, 2, () => AR.frog[1]); thickLine(g, 13, by + 1, 17, by + 4, 2, () => AR.frog[2]); }
  else { fillBlob(g, 5.5, 12.5, 3.2, 2.2, AR.frog, 0.1); fillBlob(g, 13, 13, 2.2, 1.6, AR.frog, 0.1); }
  fillBlob(g, 14.5, by - 1, 3.2, 2.8, AR.frog, 0.12);
  fillBlob(g, 13.5, by - 4, 1.8, 1.8, AR.frog, 0.1); fillBlob(g, 16.5, by - 3.6, 1.6, 1.6, AR.frog, 0.1);
  g.set(14, by - 4, '#1a0f0a'); g.set(17, by - 4, '#1a0f0a');
  let mouth = { x: 18, y: by };
  if (frame === 'eat1') { for (let k = 0; k < 7; k++) g.set(18 + k, by, '#e0707a'); mouth = { x: 25, y: by }; }
  if (frame === 'act1') fillBlob(g, 16, by + 2.2, 2.6, 2.2, ['#a8742a', '#d0a040', '#e8c860', '#f4e090'], 0.1);
  g.set(15, by, '#2a3a1a');
  addOutline(g, '#10301a');
  return { g, mouth, over: frame === 'eat1' };
}

/** Caracol: casca em espiral; come folha; ao se esconder, recolhe a cabeça. */
function drawSnail(p, frame) {
  const g = newGrid(22, 16);
  const hide = frame === 'act0' || frame === 'act1';
  const down = frame === 'eat0' || frame === 'eat1';
  const move = frame === 'w1' ? 1 : 0;
  thickLine(g, 3 + move, 13, hide ? 11 : 16, 13, 3, (t, dx, dy) => AR.snailBody[dy < 0 ? 2 : 1]);
  if (!hide) { fillBlob(g, 16.5, down ? 12 : 10.5, 2.6, 2.4, AR.snailBody, 0.1); thickLine(g, 17, 9, 17, 6, 1, () => AR.snailBody[1]); thickLine(g, 19, 10, 20, 7, 1, () => AR.snailBody[1]); g.set(17, 5, '#1a0f0a'); g.set(20, 6, '#1a0f0a'); }
  fillBlob(g, 8.5, 8, 5.6, 5.6, AR.shell, 0.12);
  blobOn(g, 8.5, 8, 3.2, 3.2, [AR.shell[1], AR.shell[0], AR.shell[1], AR.shell[2]], 0.0);
  g.set(8, 8, AR.shell[3]); g.set(9, 7, AR.shell[0]); g.set(8, 6, AR.shell[0]); g.set(7, 7, AR.shell[0]);
  addOutline(g, '#3a2414');
  return { g, mouth: { x: 18, y: 13 } };
}

/** Caranguejo: anda de lado; ao comer, leva as garras à boca; ao "acenar", ergue uma garra. */
function drawCrab(p, frame) {
  const g = newGrid(22, 14);
  const w = frame === 'w1' ? 1 : 0;
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) thickLine(g, 11 + s * 3, 9, 11 + s * (6 + i * 1.5) + (w ? s : 0), 12 - (i % 2 ? 0 : 1), 1, () => AR.crab[1]);
  fillBlob(g, 11, 8, 6.4, 3.8, AR.crab, 0.14);
  const wave = frame === 'act1';
  for (const s of [-1, 1]) {
    const up = (wave && s === 1) || frame === 'eat0' || frame === 'eat1';
    const cx = 11 + s * 7.5, cy = up ? 3 : 6.5;
    thickLine(g, 11 + s * 5, 7, cx, cy + 1.5, 1.6, () => AR.crab[2]);
    fillBlob(g, cx, cy, 2.4, 2.2, AR.crab, 0.1);
    g.set(Math.round(cx), Math.round(cy - 1), AR.crab[0]);
  }
  g.set(9, 4, '#1a0f0a'); g.set(13, 4, '#1a0f0a'); g.set(9, 3, AR.crab[2]); g.set(13, 3, AR.crab[2]);
  addOutline(g, '#3a0e08');
  return { g, mouth: { x: 11, y: 6 } };
}

/** Lagarto: corpo comprido; ao "tomar sol", faz flexões. */
function drawLizard(p, frame) {
  const g = newGrid(30, 14);
  const w = frame === 'w1' ? 1 : frame === 'w0' ? -1 : 0;
  const up = frame === 'act1';
  const by = up ? 6 : 8;
  thickLine(g, 3, by + 2, 11, by + 1, 3.4, (t, dx, dy) => AR.lizard[dy < 0 ? 2 : 1]);
  thickLine(g, 11, by + 1, 21, by, 4, (t, dx, dy) => AR.lizard[dy < 0 ? 3 : 2]);
  thickLine(g, 3, by + 2, 0, by + 4, 1.4, () => AR.lizard[1]);
  fillBlob(g, 23.5, by - (up ? 1.5 : 0), 3.4, 2.6, AR.lizard, 0.12);
  fillBlob(g, 26, by + 0.5 - (up ? 1.5 : 0), 2, 1.6, AR.lizard, 0.1);
  g.set(24, by - 1 - (up ? 1 : 0), '#1a0f0a');
  for (const [lx, far] of [[18, true], [20, false], [7, true], [9, false]]) {
    const off = (lx > 14 ? w : -w);
    thickLine(g, lx, by + 2, lx + 2 + off, up && lx > 14 ? 12 : 12, 1.2, () => AR.lizard[far ? 0 : 1]);
  }
  speckle(g, 3, 10, AR.lizard[0], 4, by - 2, 20, by + 3);
  let mouth = { x: 28, y: by + 1 };
  if (frame === 'eat0' || frame === 'eat1') { fillBlob(g, 26.5, by + 2.5, 2, 1.6, AR.lizard, 0.1); mouth = { x: 28, y: by + 4 }; }
  if (frame === 'eat1') g.set(28, by + 2, '#7a2a30');
  addOutline(g, '#3a2a10');
  return { g, mouth };
}

/** Escorpião: cauda curva com ferrão e garras; ao "ameaçar", ergue a cauda. */
function drawScorpion(p, frame) {
  const g = newGrid(26, 18);
  const w = frame === 'w1' ? 1 : 0;
  const strike = frame === 'act1';
  for (let i = 0; i < 4; i++) { const x = 9 + i * 2; thickLine(g, x, 12, x + (w ? (i % 2 ? 1 : -1) : 0) - 1, 16, 1, () => AR.scorpion[1]); }
  for (let i = 0; i < 5; i++) fillBlob(g, 12 - i * 2.2, 12, 3 - i * 0.2, 2.6 - i * 0.1, AR.scorpion, 0.12);
  const tail = strike ? [[2, 9], [0, 6], [1, 3], [4, 2], [7, 4]] : [[3, 10], [1, 7], [2, 4], [5, 3], [8, 5]];
  let px = 3, py = 12;
  for (const [x, y] of tail) { thickLine(g, px, py, x, y, 2, () => AR.scorpion[2]); px = x; py = y; }
  g.set(px + 1, py + 1, '#d8c870'); g.set(px + 2, py + 2, '#d8c870');
  fillBlob(g, 17, 11.5, 3.2, 2.8, AR.scorpion, 0.12);
  const eatf = frame === 'eat0' || frame === 'eat1';
  for (const dy of [-1, 1]) { thickLine(g, 18, 11 + dy, 21, (eatf ? 9 : 9 + dy * 1.5) + (frame === 'eat1' ? 1 : 0), 1.6, () => AR.scorpion[2]); fillBlob(g, 22.5, (eatf ? 9 : 9 + dy * 1.5), 2, 1.6, AR.scorpion, 0.1); }
  g.set(18, 10, '#f4d080'); g.set(19, 10, '#f4d080');
  addOutline(g, '#1f0e04');
  return { g, mouth: { x: 21, y: 10 } };
}

/** Jacaré: corpo longo e baixo com focinho; abre a boca ao comer e ao "tomar sol". */
function drawCroc(p, frame) {
  const g = newGrid(56, 24);
  const w = frame === 'w1' ? 1 : frame === 'w0' ? -1 : 0;
  const open = frame === 'eat1' || frame === 'act1';
  for (const [lx, far] of [[34, true], [38, false], [14, true], [18, false]]) thickLine(g, lx, 14, lx + 1 + (lx > 25 ? w : -w), 21, 2.2, () => AR.croc[far ? 0 : 1]);
  thickLine(g, 3, 15, 16, 13, 4, (t, dx, dy) => AR.croc[dy < 0 ? 1 : 0]);
  thickLine(g, 14, 13, 38, 12, 8, (t, dx, dy) => AR.croc[dy < -1.5 ? 3 : dy < 0.5 ? 2 : 1]);
  blobOn(g, 26, 15, 12, 2.4, ['#a8b878', '#c8d29a', '#d8e0b0', '#e8eec8'], 0.1);
  fillBlob(g, 40, 11, 5.2, 4.2, AR.croc, 0.12);
  thickLine(g, 42, 11.5, 52, 12 + (open ? -1 : 0), 4, (t, dx, dy) => AR.croc[dy < 0 ? 2 : 1]);
  if (open) { thickLine(g, 43, 14.5, 52, 16.5, 2.6, () => AR.croc[0]); for (let i = 0; i < 5; i++) { g.set(44 + i * 2, 14, '#f4f0e0'); g.set(44 + i * 2, 13, '#7a2a30'); } }
  else for (let i = 0; i < 5; i++) g.set(44 + i * 2, 14, '#f4f0e0');
  fillBlob(g, 39, 7, 1.8, 1.6, AR.croc, 0.1); g.set(39, 7, '#e8c850'); g.set(40, 7, '#1a0f0a');
  for (let i = 0; i < 9; i++) g.set(10 + i * 3, 8 + (i % 2) - Math.floor(i / 4), AR.croc[0]);
  addOutline(g, '#0e2412');
  return { g, mouth: { x: 51, y: open ? 15 : 13 } };
}

/** Foca: corpo roliço que desliza; ao comer, ergue a cabeça com um peixe. */
function drawSeal(p, frame) {
  const g = newGrid(40, 18);
  const w = frame === 'w1' ? 1 : 0;
  const up = frame === 'eat0' || frame === 'eat1' || frame === 'act1';
  fillBlob(g, 18, 12 - w, 13, 4.8, AR.seal, 0.14);
  thickLine(g, 4, 13 - w, 0, 11 - w, 3, () => AR.seal[1]);
  thickLine(g, 1, 11 - w, 0, 8 - w, 1.6, () => AR.seal[1]);
  fillBlob(g, 29, up ? 6 : 9, 3.8, 3.6, AR.seal, 0.12);
  fillBlob(g, 32.5, up ? 7 : 10, 2.2, 1.7, ['#8a94a4', '#a8b2c0', '#c4ccd8', '#dde3ea'], 0.1);
  g.set(33, up ? 6 : 9, '#1a0f0a'); g.set(30, up ? 4 : 7, '#1a0f0a'); g.set(32, up ? 4 : 7, '#1a0f0a');
  fillBlob(g, 25, 15, 2.6, 1.4, AR.seal, 0.1);
  speckle(g, 11, 14, AR.seal[0], 6, 8, 26, 15);
  if (frame === 'act0') for (const [x, y] of [[19, 7], [20, 6]]) g.set(x, y, AR.seal[3]);
  addOutline(g, '#262c38');
  return { g, mouth: { x: 34, y: up ? 8 : 11 } };
}

/** Peixe (e golfinho): nada balançando a cauda; ao comer, abre a boca; salta como "ação". */
function drawFish(p, frame) {
  const W = p.W, H = p.H, g = newGrid(W, H);
  const sw = frame === 'w1' || frame === 'act1' ? 1 : -1;
  const cy = H / 2, bx = W * 0.5, rx = W * 0.34, ry = H * 0.28;
  const tilt = frame === 'act0' ? -2 : frame === 'act1' ? 2 : 0;
  fillBlob(g, bx, cy + tilt * 0.4, rx, ry, p.fur, 0.12);
  blobOn(g, bx + 0.5, cy + tilt * 0.4 + ry * 0.6, rx * 0.85, ry * 0.4, p.belly || p.fur, 0.1);
  const tx = bx - rx;
  for (let i = 0; i < 4; i++) { thickLine(g, tx, cy + tilt * 0.4, tx - 3 - i * 0.2, cy + sw * (1 + i) * (H > 10 ? 1.4 : 0.8) + tilt, 1.2, () => p.fur[i % 2 ? 1 : 2]); }
  thickLine(g, tx - 1, cy + tilt * 0.4, tx - 5, cy - sw * (H > 10 ? 3.5 : 2) + tilt, 1.2, () => p.fur[1]);
  if (p.dorsal) thickLine(g, bx - 1, cy - ry + tilt * 0.4, bx - 3, cy - ry - p.dorsal, 1.5, () => p.fur[1]);
  g.set(Math.round(bx + rx * 0.55), Math.round(cy - ry * 0.25 + tilt * 0.4), '#10141a');
  if (p.snoutLen) thickLine(g, bx + rx - 1, cy + 1, bx + rx + p.snoutLen, cy + 1 + (frame === 'eat1' ? 1 : 0), 1.8, () => p.fur[2]);
  const mouth = { x: Math.round(bx + rx + (p.snoutLen || 1)), y: Math.round(cy + 1) };
  addOutline(g, p.outline || '#16222e');
  return { g, mouth };
}

/** Coelho fofo e pequeno: cabeça grande, olhos grandes e brilhantes, orelhas com o interior rosa. */
function drawBunny(p, frame) {
  const W = 16, H = 19, gy = 17, g = new PixelGrid(W, H);
  const F = ['#5e4230', '#8a6444', '#b48a5c', '#d4ae80'];
  const CR = ['#d2b48c', '#e4cba6', '#f0dcc0', '#fbf0dc'];
  const WH = ['#c8ccd8', '#e0e4ec', '#f4f6fa', '#ffffff'];
  const PINK = '#f09aa0', INNER = '#f4b4b4', EYE = '#2a1818';
  const ear = (bx, by, tx, ty) => {
    fillCapsule(g, bx, by, tx, ty, 1.25, F);
    const k = 0.42;
    thickLine(g, bx + (tx - bx) * 0.12, by + (ty - by) * 0.12, bx + (tx - bx) * 0.5, by + (ty - by) * 0.5, 1, () => INNER);
  };
  const face = (hx, hy, puff) => {
    fillBlob(g, hx, hy, 3.5, 3.1, F, 0.1);
    if (puff) fillBlob(g, hx + 0.4, hy + 1.6, 2.9, 2.1, F, 0.1);
    fillBlob(g, hx + 2.3, hy + 1.3, 1.5, 1.2, CR, 0.1);
    g.set(Math.round(hx + 3.7), Math.round(hy + 0.6), PINK);
    const ex = Math.round(hx + 0.9), ey = Math.round(hy - 1.4);
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]]) g.set(ex + dx, ey + dy, EYE);
    g.set(ex, ey, '#ffffff'); g.set(ex + 1, ey + 2, '#5a3a3a');
    g.set(Math.round(hx - 0.4), Math.round(hy + 1.9), INNER); g.set(Math.round(hx + 0.6), Math.round(hy + 2.1), INNER);
  };
  const tail = (x, y) => fillBlob(g, x, y, 1.6, 1.6, WH, 0.1);
  let head;
  if (frame === 'w0') {
    // impulso: corpo baixo e esticado, pata traseira para trás
    thickLine(g, 5, gy - 3.4, 2.2, gy - 0.5, 2, () => CR[1]);
    fillBlob(g, 5.4, gy - 3.8, 3.2, 3, F, 0.1);
    fillBlob(g, 8.8, gy - 3.4, 3.8, 2.6, F, 0.1);
    thickLine(g, 12, gy - 2.2, 14.2, gy - 0.6, 1.6, () => CR[1]);
    tail(2.4, gy - 5.4);
    head = [12.2, gy - 5.2];
    ear(head[0] - 1.2, head[1] - 2, head[0] - 5.4, head[1] - 4.6); ear(head[0] + 0.3, head[1] - 2.3, head[0] - 3.6, head[1] - 5.2);
    face(head[0], head[1], false);
  } else if (frame === 'w1') {
    // no ar: corpo esticado, orelhas coladas para trás, pernas abertas
    thickLine(g, 4, gy - 8, 0.8, gy - 5.8, 1.8, () => CR[1]);
    thickLine(g, 11.5, gy - 7, 15.2, gy - 5.4, 1.6, () => CR[1]);
    fillBlob(g, 5.6, gy - 8.4, 3.4, 2.8, F, 0.1);
    fillBlob(g, 9.6, gy - 8.6, 3.4, 2.6, F, 0.1);
    tail(2.2, gy - 9.6);
    head = [12.6, gy - 9.6];
    ear(head[0] - 1.2, head[1] - 2, head[0] - 6, head[1] - 3.2); ear(head[0] + 0.3, head[1] - 2.3, head[0] - 4.4, head[1] - 3.8);
    face(head[0], head[1], false);
  } else if (frame === 'act0' || frame === 'act1') {
    // de pé, alerta: corpo vertical, orelhas esticadas
    fillBlob(g, 6.4, gy - 3.4, 3.4, 3.2, F, 0.1);
    fillBlob(g, 8, gy - 6.6, 2.7, 3.6, F, 0.1);
    fillBlob(g, 7.2, gy - 0.8, 2.8, 0.9, CR, 0.1);
    tail(3.2, gy - 4.4);
    head = [8.8, gy - 10.6];
    ear(head[0] - 1.1, head[1] - 2, head[0] - 1.6, head[1] - 6.6);
    ear(head[0] + 0.8, head[1] - 2.2, head[0] + (frame === 'act1' ? 2.6 : 0.9), head[1] - (frame === 'act1' ? 5.8 : 6.8));
    face(head[0], head[1], false);
    fillBlob(g, head[0] + 1.4, head[1] + 3.6, 1.3, 1.0, CR, 0.1); fillBlob(g, head[0] - 0.2, head[1] + 3.8, 1.2, 0.9, CR, 0.1);
  } else {
    // sentado (parado e comendo)
    const eating = frame === 'eat0' || frame === 'eat1';
    fillBlob(g, 5.4, gy - 2.8, 3.2, 2.7, F, 0.1);
    fillBlob(g, 7.8, gy - 3.0, 2.5, 2.5, F, 0.1);
    fillBlob(g, 7, gy - 0.6, 2.2, 0.8, CR, 0.1);
    tail(2.2, gy - 3.4);
    head = eating ? [10.6, gy - 3.6] : [9.8, gy - 6.2];
    if (eating) { ear(head[0] - 1.2, head[1] - 2, head[0] - 4.2, head[1] - 5.6); ear(head[0] + 0.3, head[1] - 2.3, head[0] - 1.8, head[1] - 6); }
    else { ear(9, gy - 8.2, 7.9, gy - 12.6); ear(10.8, gy - 8.4, 10.9, gy - 12.8); }
    face(head[0], head[1], frame === 'eat1');
    fillBlob(g, head[0] + 1.6, gy - 1.2, 1.2, 0.9, CR, 0.1);
  }
  addOutline(g, '#4a3220');
  return { g, mouth: { x: Math.round(head[0] + 3.6), y: Math.round(head[1] + 1.6) } };
}

/** Passarinho pequeno (pardal, cardeal, beija-flor...): em pé, saltitando, bicando, cantando e voando. */
function drawSongbird(p, frame) {
  const W = 16, H = 14, gy = 12, g = new PixelGrid(W, H);
  const R = p.fur, WG = p.wing || R, BL = p.belly || R;
  const flyUp = frame === 'fly0', flyDn = frame === 'fly1';
  const fly = flyUp || flyDn;
  const peck = frame === 'eat0' || frame === 'eat1';
  const sing = frame === 'act0' || frame === 'act1';
  const hop = frame === 'w1' ? -1 : 0;
  let by = gy - 3.6 + hop - (fly ? 1 : 0);
  if (fly) by = 6.6;
  let hx = 10.4, hy = by - 2.6;
  if (peck) { hx = 11.4; hy = by + 0.4; }
  if (sing) { hx = 10.2; hy = by - 3.2 - (frame === 'act1' ? 0.6 : 0); }
  if (p.hover && fly) { hx = 10.6; hy = by - 1.8; }
  // pernas
  if (!fly) { const sp = frame === 'w0' ? 1 : frame === 'w1' ? -1 : 0; for (const dx of [0, 1.6]) thickLine(g, 6.6 + dx, by + 2, 6.6 + dx + (sp * (dx ? 1 : -1)), gy + 1, 1, () => p.legColor || '#c8884a'); }
  // cauda e corpo
  thickLine(g, 4.4, by + 0.4, 0.6, by + (fly ? 0.6 : 1.4), p.tailW || 1.8, (t) => R[t > 0.6 ? 0 : 1]);
  fillBlob(g, 7.4, by, p.hover ? 2.6 : 3.6, p.hover ? 1.9 : 2.7, R, 0.1);
  blobOn(g, 8, by + 1.4, 2.8, 1.3, BL, 0.1);
  // cabeça, bico e olho
  fillBlob(g, hx, hy, p.hover ? 1.9 : 2.4, p.hover ? 1.8 : 2.3, p.headRamp || R, 0.1);
  if (p.crest) { thickLine(g, hx - 0.6, hy - 1.8, hx - 2.2, hy - 4.2, 1.6, () => p.crest); }
  if (p.mask) fillBlob(g, hx + 1.6, hy + 0.6, 1.1, 1.1, [p.mask, p.mask, p.mask, p.mask], 0.0);
  const bl = p.beakLen || 2, bc = p.beakColor || '#f0b040';
  const open = frame === 'eat1' || frame === 'act1';
  const ba = peck ? 0.95 : p.hover && fly ? 0.15 : 0.1;
  const bx0 = hx + Math.cos(ba) * 2.0, by0 = hy + Math.sin(ba) * 2.0;
  thickLine(g, bx0, by0, bx0 + Math.cos(ba) * bl, by0 + Math.sin(ba) * bl, 1, () => bc);
  if (open) g.set(Math.round(bx0 + Math.cos(ba) * bl * 0.7), Math.round(by0 + Math.sin(ba) * bl * 0.7 + 1), '#c0505a');
  const ex = Math.round(hx + 0.4), ey = Math.round(hy - 0.9);
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) g.set(ex + dx, ey + dy, '#1a0f0a');
  g.set(ex, ey, '#ffffff');
  // asa
  if (flyUp) { fillBlob(g, 6.4, by - 3.4, 2.1, 3.3, WG, 0.1); fillBlob(g, 4.4, by - 2.6, 1.6, 2.6, WG, 0.1); }
  else if (flyDn) { fillBlob(g, 6.2, by + 2.6, 2.1, 3, WG, 0.1); fillBlob(g, 4.2, by + 2, 1.6, 2.4, WG, 0.1); }
  else fillBlob(g, 6.6, by - 0.2, 2.5, 1.6, WG, 0.1);
  if (p.speckle) speckle(g, 7, p.speckle[0], p.speckle[1], 4, by - 2, 10, by + 1);
  addOutline(g, p.outline || '#2a1a10');
  return { g, mouth: { x: Math.round(bx0 + Math.cos(ba) * bl), y: Math.round(by0 + Math.sin(ba) * bl) } };
}

/** Constrói um quadro; devolve a grade e o ponto da boca. */
function buildAnimalFrame(def, frame) {
  CUR_SCALE = def.scale || 1;
  let r;
  switch (def.plan) {
    case 'bunny': r = drawBunny(def.p, frame); break;
    case 'songbird': r = drawSongbird(def.p, frame); break;
    case 'bird': r = drawBird(def.p, frame); break;
    case 'frog': r = drawFrog(def.p, frame); break;
    case 'snail': r = drawSnail(def.p, frame); break;
    case 'crab': r = drawCrab(def.p, frame); break;
    case 'lizard': r = drawLizard(def.p, frame); break;
    case 'scorpion': r = drawScorpion(def.p, frame); break;
    case 'croc': r = drawCroc(def.p, frame); break;
    case 'seal': r = drawSeal(def.p, frame); break;
    case 'fish': r = drawFish(def.p, frame); break;
    default: r = drawQuad(def.p, frame);
  }
  const k = r.g.s || 1;
  if (r.mouth && k !== 1) r.mouth = { x: Math.round(r.mouth.x * k), y: Math.round(r.mouth.y * k) };
  CUR_SCALE = 1;
  return r;
}

const ANIMAL_FRAMES = ['idle', 'w0', 'w1', 'eat0', 'eat1', 'act0', 'act1', 'fly0', 'fly1'];
