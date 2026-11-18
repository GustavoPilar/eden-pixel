/** @param {number} a semente @returns {() => number} gerador pseudoaleatório */
function mulberry32(a) {
  let s = a | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rampas de 4 tons (escuro → claro) para cada material. */
const RAMPS = Object.freeze({
  leaf: ['#1f4a2a', '#2f6b34', '#4a9040', '#7cc055'],
  leafDry: ['#3a5a2a', '#58792f', '#789a3c', '#a3c456'],
  leafWet: ['#173a2b', '#235a3c', '#357f4a', '#5ba868'],
  jungle: ['#123d2a', '#1a6a3a', '#2c9c4a', '#6fd060'],
  swamp: ['#2a3a1e', '#44592a', '#667a38', '#8c9f4e'],
  birchLeaf: ['#3a6a2a', '#5a8a30', '#86b43c', '#b4d85a'],
  pine: ['#14382f', '#1f5a45', '#2f7f5a', '#58a878'],
  snow: ['#8aa0c4', '#b4c6e0', '#e0ebf7', '#ffffff'],
  wood: ['#2e1e14', '#4a3020', '#6e4a2c', '#96683c'],
  birchBark: ['#6e6a66', '#a9a5a0', '#e0ddd6', '#f6f3ee'],
  deadWood: ['#3a2c22', '#5a463a', '#8a7060', '#b8a28e'],
  sandWood: ['#4a3a2c', '#6e5a44', '#9a8466', '#c4ae8c'],
  cactus: ['#244a2a', '#33703a', '#4f9a4c', '#86c46c'],
  rock: ['#454a54', '#68707c', '#8d95a2', '#b8c0cb'],
  sandstone: ['#7a4a2c', '#a8683c', '#cd8e56', '#e8b27e'],
  mossRock: ['#2f4a34', '#4a6a48', '#6c8f5e', '#94b87c'],
  fern: ['#1c4a2c', '#2c7038', '#43963f', '#74c25a'],
  reed: ['#3a5a2a', '#58822f', '#7ea83c', '#a8cc58'],
  cattail: ['#3a2418', '#5a3a22', '#7e5430', '#a07440'],
  lily: ['#1f5a34', '#2f7e3e', '#48a04c', '#78cc68'],
  kelp: ['#165a44', '#1f7c58', '#34a074', '#5cc89a'],
  beachGrass: ['#6a7a3a', '#8a9a4a', '#aebc62', '#d2dc84'],
  dryGrass: ['#8a6a30', '#a98a44', '#c9ac5c', '#e6cf82'],
  snowGrass: ['#7a8a6a', '#98a888', '#bccab0', '#e0eadc'],
});

/** Cores de contorno por material (tom escuro do próprio material). */
const OUTLINES = Object.freeze({
  leaf: '#14301d', wet: '#0f2a22', wood: '#24160e', snow: '#4a5f86', sand: '#6a4426',
  rock: '#2a2e36', cactus: '#1a3a22', water: '#1d4a40', swamp: '#222e18', dead: '#2e221a',
});

/** Índice de tom (0–3) para uma luz, com tremida determinística que dá textura. */
function toneIdx(l, x, y, jitter) {
  const v = l + (hash2(x * 3 + 7, y * 5 + 11) - 0.5) * jitter;
  return v > 0.8 ? 3 : v > 0.38 ? 2 : v > 0.02 ? 1 : 0;
}

/** Preenche uma elipse sombreada com uma rampa (respeita a escala da grade, se houver). */
function fillBlob(g, cx, cy, rx, ry, ramp, jitter = 0.16, bias = 0) {
  const k = g.s || 1;
  if (k !== 1) { cx *= k; cy *= k; rx = Math.max(0.9, rx * k); ry = Math.max(0.9, ry * k); }
  const put = g.put ? g.put.bind(g) : g.set.bind(g);
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy > 1) continue;
    put(x, y, ramp[toneIdx(lightAt(dx, dy) + bias, x, y, jitter)]);
  }
}

/** Cápsula (segmento com raio) sombreada como cilindro. */
function fillCapsule(g, x0, y0, x1, y1, r, ramp, ribs = false) {
  const k = g.s || 1;
  if (k !== 1) { x0 *= k; y0 *= k; x1 *= k; y1 *= k; r = Math.max(0.8, r * k); }
  const put = g.put ? g.put.bind(g) : g.set.bind(g);
  const minX = Math.floor(Math.min(x0, x1) - r - 1), maxX = Math.ceil(Math.max(x0, x1) + r + 1);
  const minY = Math.floor(Math.min(y0, y1) - r - 1), maxY = Math.ceil(Math.max(y0, y1) + r + 1);
  const vx = x1 - x0, vy = y1 - y0, len2 = vx * vx + vy * vy || 1;
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const px = x + 0.5 - x0, py = y + 0.5 - y0;
    const t = clamp((px * vx + py * vy) / len2, 0, 1);
    const cx = x0 + vx * t, cy = y0 + vy * t;
    const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (dist > r) continue;
    const dx = (x + 0.5 - cx) / r;
    const l = -0.6 * dx + 0.7 * Math.sqrt(Math.max(0, 1 - dx * dx));
    let idx = toneIdx(l, x, y, 0.1);
    if (ribs && Math.abs(dx) < 0.9 && Math.round((dx + 1) * r) % 3 === 1) idx = Math.max(0, idx - 1);
    put(x, y, ramp[idx]);
  }
}

/** Linha com espessura (pincel quadrado) e cor por função (respeita a escala da grade). */
function thickLine(g, x0, y0, x1, y1, w, colorAt) {
  const k = g.s || 1;
  if (k !== 1) { x0 *= k; y0 *= k; x1 *= k; y1 *= k; }
  const put = g.put ? g.put.bind(g) : g.set.bind(g);
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    const ww = Math.max(k !== 1 ? 1 : 0, (typeof w === 'function' ? w(t) : w) * k);
    const r = ww / 2;
    for (let yy = Math.floor(y - r); yy <= Math.floor(y + r - 0.01); yy++) for (let xx = Math.floor(x - r); xx <= Math.floor(x + r - 0.01); xx++) {
      put(xx, yy, colorAt(t, xx - x, yy - y));
    }
  }
}

/** Contorno externo de 1 px em volta de tudo que foi desenhado. */
function addOutline(g, color) {
  const get = g.pget ? g.pget.bind(g) : g.get.bind(g), put = g.put ? g.put.bind(g) : g.set.bind(g);
  const out = [];
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (get(x, y) === null && (get(x - 1, y) || get(x + 1, y) || get(x, y - 1) || get(x, y + 1))) out.push([x, y]);
  }
  for (const [x, y] of out) put(x, y, color);
}

/** Tronco vertical sombreado (esquerda clara, direita escura) com base alargada. */
function drawTrunk(g, cx, top, base, half, ramp, rnd, flare = 6, lean = 0) {
  for (let y = top; y <= base; y++) {
    const f = y > base - flare ? (y - (base - flare)) * 0.5 : 0;
    const off = Math.sin((y - top) * 0.22 + lean) * 0.6;
    const hw = half + f;
    for (let x = Math.floor(cx + off - hw); x <= Math.ceil(cx + off + hw - 1); x++) {
      const t = (x + 0.5 - (cx + off - hw)) / (2 * hw);
      let idx = t < 0.22 ? 3 : t < 0.55 ? 2 : t < 0.85 ? 1 : 0;
      if (hash2(x * 7 + lean * 13, y * 3) > 0.84) idx = Math.max(0, idx - 1);
      g.set(x, y, ramp[idx]);
    }
  }
}

/** Carvalho/árvore de copa redonda feita de tufos de folhas. */
function makeOak(seed, ramp = RAMPS.leaf, outline = OUTLINES.leaf, wood = RAMPS.wood, moss = false) {
  const rnd = mulberry32(seed);
  const W = 40, H = 46, g = new PixelGrid(W, H), cx = 20;
  drawTrunk(g, cx, 27, H - 1, 2.6, wood, rnd, 6, seed);
  const clumps = [{ x: cx, y: 15, r: 8 }];
  for (let i = 0; i < 9; i++) { const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()); clumps.push({ x: cx + Math.cos(a) * rr * 11, y: 15 + Math.sin(a) * rr * 7, r: 5.5 + rnd() * 3 }); }
  clumps.sort((p, q) => q.y - p.y || q.x - p.x);
  for (const c of clumps) fillBlob(g, c.x, c.y, c.r * 1.12, c.r * 0.92, ramp, 0.2);
  if (moss) for (let i = 0; i < 24; i++) { const x = Math.floor(cx - 8 + rnd() * 16), y = 27 + Math.floor(rnd() * 16); if (g.get(x, y) && ramp !== null) g.set(x, y, RAMPS.mossRock[2]); }
  addOutline(g, outline);
  return g;
}

/** Bétula: tronco claro com marcas escuras e copa fina e amarelada. */
function makeBirch(seed, bare = false, ramp = RAMPS.birchLeaf) {
  const rnd = mulberry32(seed);
  const W = 30, H = 46, g = new PixelGrid(W, H), cx = 15;
  drawTrunk(g, cx, bare ? 8 : 20, H - 1, 1.8, RAMPS.birchBark, rnd, 4, seed);
  for (let y = (bare ? 10 : 22); y < H - 2; y += 2 + Math.floor(rnd() * 3)) { const x = rnd() < 0.5 ? cx - 2 : cx; g.set(x, y, '#3a3632'); if (rnd() < 0.5) g.set(x + 1, y, '#3a3632'); }
  if (bare) {
    const col = () => RAMPS.birchBark[1];
    for (const [sy, a] of [[18, -0.9], [24, 0.8], [13, 0.6], [29, -0.7]]) thickLine(g, cx, sy, cx + Math.sin(a) * 9, sy - Math.cos(a) * 7, 1, col);
  } else {
    const clumps = [];
    for (let i = 0; i < 7; i++) clumps.push({ x: cx + (rnd() - 0.5) * 11, y: 12 + (rnd() - 0.5) * 16, r: 4 + rnd() * 2.6 });
    clumps.sort((p, q) => q.y - p.y);
    for (const c of clumps) fillBlob(g, c.x, c.y, c.r, c.r * 1.15, ramp, 0.22);
  }
  addOutline(g, bare ? OUTLINES.dead : OUTLINES.leaf);
  return g;
}

/** Conífera em camadas; com neve nas pontas quando `snow`. */
function makeSpruce(seed, tiers = 5, snow = false, ramp = RAMPS.pine) {
  const rnd = mulberry32(seed);
  const W = tiers > 3 ? 28 : 20, H = tiers > 3 ? 48 : 30, g = new PixelGrid(W, H), cx = W / 2;
  const th = tiers > 3 ? 12 : 9, step = tiers > 3 ? 8 : 6, maxHw = tiers > 3 ? 13 : 8.6;
  const bottom = H - 5;
  drawTrunk(g, cx, bottom - 2, H - 1, 1.6, RAMPS.wood, rnd, 0, seed);
  for (let i = tiers - 1; i >= 0; i--) {
    const top = 2 + i * step;
    const hwMax = 3.5 + (maxHw - 3.5) * ((i + 1) / tiers);
    for (let r = 0; r < th; r++) {
      const hw = Math.max(1, (r / (th - 1)) * hwMax + (r > 2 ? (rnd() - 0.5) * 1.2 : 0));
      for (let x = Math.floor(cx - hw); x < Math.ceil(cx + hw); x++) {
        const y = top + r;
        const t = (x + 0.5 - (cx - hw)) / (2 * hw);
        if (r > th - 3 && (x + r) % 2 === 0 && hash2(x, y + seed) > 0.4) continue;
        let idx = t < 0.28 ? 3 : t < 0.6 ? 2 : t < 0.86 ? 1 : 0;
        if (r >= th - 2) idx = Math.max(0, idx - 1);
        if (hash2(x * 5 + seed, y * 3) > 0.9) idx = Math.max(0, idx - 1);
        let col = ramp[idx];
        if (snow && (r < 2 || (t < 0.45 && r < th * 0.5 && hash2(x, y) > 0.25))) col = RAMPS.snow[t < 0.4 ? 3 : t < 0.75 ? 2 : 1];
        g.set(x, y, col);
      }
    }
  }
  addOutline(g, snow ? '#1d3a44' : OUTLINES.leaf);
  return g;
}

/** Palmeira com tronco curvo e folhas em leque. */
function makePalm(seed, ramp = RAMPS.leaf) {
  const rnd = mulberry32(seed);
  const W = 46, H = 52, g = new PixelGrid(W, H);
  const lean = (rnd() < 0.5 ? -1 : 1) * (4 + rnd() * 6);
  const bx = 23, by = H - 1, topY = 15;
  let tx = bx, ty = topY;
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const x = bx + lean * t * t * 1.4, y = by - t * (by - topY);
    const w = 3.8 - t * 1.4;
    tx = x; ty = y;
    for (let yy = Math.floor(y - w / 2); yy < Math.ceil(y + w / 2); yy++) for (let xx = Math.floor(x - w / 2); xx < Math.ceil(x + w / 2); xx++) {
      const rel = (xx + 0.5 - (x - w / 2)) / w;
      let idx = rel < 0.3 ? 3 : rel < 0.62 ? 2 : 1;
      if (Math.floor(y) % 3 === 0) idx = Math.max(0, idx - 1);
      g.set(xx, yy, RAMPS.sandWood[idx]);
    }
  }
  const angles = [200, 232, 262, 296, 328, 160, 20];
  for (const deg of angles) {
    const a = (deg + (rnd() - 0.5) * 14) * Math.PI / 180;
    const L = 13 + rnd() * 5;
    const droop = deg > 100 && deg < 180 || deg < 60 ? 0.9 : 0.55;
    const pts = [];
    for (let s = 0; s <= 1.001; s += 0.05) pts.push([tx + Math.cos(a) * L * s, ty + Math.sin(a) * L * s + droop * L * s * s * 0.7]);
    const lightSide = Math.cos(a) < -0.2;
    for (let i = 1; i < pts.length; i++) {
      const s = i / pts.length;
      thickLine(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], s < 0.5 ? 2 : 1, () => ramp[lightSide ? (s > 0.5 ? 3 : 2) : (s > 0.5 ? 2 : 1)]);
      if (i % 2 === 0 && s > 0.15) {
        const nx = -Math.sin(a), ny = Math.cos(a);
        g.set(Math.round(pts[i][0] + nx * 2), Math.round(pts[i][1] + ny * 2 + 1), ramp[lightSide ? 2 : 1]);
        g.set(Math.round(pts[i][0] - nx * 2), Math.round(pts[i][1] - ny * 2 + 1), ramp[lightSide ? 3 : 0]);
      }
    }
  }
  fillBlob(g, tx - 1, ty + 2.2, 1.7, 1.7, RAMPS.wood, 0.1);
  fillBlob(g, tx + 2, ty + 3, 1.7, 1.7, RAMPS.wood, 0.1);
  addOutline(g, OUTLINES.leaf);
  return g;
}

/** Cacto saguaro com dois braços. */
function makeSaguaro(seed) {
  const rnd = mulberry32(seed);
  const W = 24, H = 40, g = new PixelGrid(W, H), cx = 12;
  const flip = rnd() < 0.5 ? 1 : -1;
  fillCapsule(g, cx, 8, cx, H - 1, 3.4, RAMPS.cactus, true);
  const a1 = 22 + Math.floor(rnd() * 4), a2 = 14 + Math.floor(rnd() * 4);
  fillCapsule(g, cx - 3 * flip, a1, cx - 8.5 * flip, a1, 2.2, RAMPS.cactus, false);
  fillCapsule(g, cx - 8.5 * flip, a1, cx - 8.5 * flip, a1 - 9, 2.2, RAMPS.cactus, true);
  fillCapsule(g, cx + 3 * flip, a2 + 6, cx + 8 * flip, a2 + 6, 2.1, RAMPS.cactus, false);
  fillCapsule(g, cx + 8 * flip, a2 + 6, cx + 8 * flip, a2 - 2, 2.1, RAMPS.cactus, true);
  for (let i = 0; i < 18; i++) { const x = 6 + Math.floor(rnd() * 12), y = 6 + Math.floor(rnd() * 32); if (g.get(x, y) && g.get(x, y) !== RAMPS.cactus[0]) g.set(x, y, '#e8e2a8'); }
  g.set(cx, 4, '#f08aa8'); g.set(cx - 1, 5, '#e46a92'); g.set(cx + 1, 5, '#f4a6bc');
  addOutline(g, OUTLINES.cactus);
  return g;
}

/** Cacto-barril com flor. */
function makeBarrel(seed) {
  const g = new PixelGrid(16, 16);
  fillBlob(g, 8, 9, 6.4, 5.8, RAMPS.cactus, 0.1);
  for (const k of [-4, -2, 0, 2, 4]) for (let y = 4; y < 15; y++) { const e = (y + 0.5 - 9) / 5.8; if (Math.abs(e) > 0.95) continue; const x = Math.round(8 + (k * Math.sqrt(1 - e * e)) * 0.95); if (g.get(x, y)) g.set(x, y, RAMPS.cactus[0]); }
  for (let i = 0; i < 12; i++) { const x = 3 + Math.floor(hash2(i, seed) * 10), y = 5 + Math.floor(hash2(i, seed + 9) * 9); if (g.get(x, y) && g.get(x, y) !== RAMPS.cactus[0]) g.set(x, y, '#efe6b0'); }
  g.set(7, 3, '#f08aa8'); g.set(8, 3, '#f4a6bc'); g.set(8, 2, '#e46a92');
  addOutline(g, OUTLINES.cactus);
  return g;
}

/** Arbusto seco de gravetos. */
function makeDryBush(seed) {
  const rnd = mulberry32(seed);
  const g = new PixelGrid(20, 14);
  const cols = ['#6a4a2a', '#8a6a3c', '#b8905a', '#d8b87a'];
  for (let i = 0; i < 9; i++) {
    const a = (-160 + rnd() * 140) * Math.PI / 180, L = 5 + rnd() * 6;
    const x1 = 10 + Math.cos(a) * L, y1 = 13 + Math.sin(a) * L;
    thickLine(g, 10, 13, x1, y1, 1, (t) => cols[t < 0.4 ? 1 : 2]);
    const b = a + (rnd() - 0.5) * 1.6;
    thickLine(g, (10 + x1) / 2, (13 + y1) / 2, x1 + Math.cos(b) * 2, y1 + Math.sin(b) * 2, 1, () => cols[3]);
  }
  for (let i = 0; i < 14; i++) { const x = 4 + Math.floor(rnd() * 12), y = 2 + Math.floor(rnd() * 11); if (g.get(x, y)) g.set(x, y, '#9ab04a'); }
  return g;
}

/** Árvore morta com galhos tortos. */
function makeDeadTree(seed, ramp = RAMPS.deadWood) {
  const rnd = mulberry32(seed);
  const g = new PixelGrid(32, 40);
  drawTrunk(g, 16, 18, 39, 2.2, ramp, rnd, 5, seed);
  const branch = (x, y, a, L, w, depth) => {
    const x1 = x + Math.cos(a) * L, y1 = y + Math.sin(a) * L;
    thickLine(g, x, y, x1, y1, w, (t, dx) => ramp[dx < 0 ? 2 : 1]);
    if (depth > 0) { branch(x1, y1, a - 0.6 - rnd() * 0.4, L * 0.65, Math.max(1, w - 1), depth - 1); branch(x1, y1, a + 0.5 + rnd() * 0.4, L * 0.6, Math.max(1, w - 1), depth - 1); }
  };
  branch(16, 21, -2.2, 9, 2, 1); branch(16, 24, -0.9, 9, 2, 1); branch(16, 17, -1.57, 8, 2, 1);
  addOutline(g, OUTLINES.dead);
  return g;
}

/** Rocha com sombreado; musgo ou neve opcionais. */
function makeRock(seed, w, h, ramp = RAMPS.rock, cover = null) {
  const rnd = mulberry32(seed);
  const g = new PixelGrid(w + 4, h + 4);
  const cx = (w + 4) / 2, cy = h + 1 - h / 2, ph = rnd() * 6;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const dx = (x + 0.5 - cx) / (w / 2), dy = (y + 0.5 - cy) / (h / 2);
    const ang = Math.atan2(dy, dx);
    const rr = 1 + 0.12 * Math.sin(ang * 3 + ph) + 0.07 * Math.sin(ang * 5 + ph * 2);
    if (dx * dx + dy * dy > rr * rr || y > h + 1) continue;
    let idx = toneIdx(lightAt(dx / rr, dy / rr), x, y, 0.2);
    let col = ramp[idx];
    if (cover === 'moss' && dy < -0.15 && hash2(x, y) > 0.3) col = RAMPS.mossRock[Math.max(1, idx)];
    if (cover === 'snow' && dy < -0.1 && hash2(x, y) > 0.15) col = RAMPS.snow[Math.min(3, idx + 1)];
    g.set(x, y, col);
  }
  for (let i = 0; i < 3; i++) { const x = Math.floor(cx - w * 0.2 + rnd() * w * 0.4), y = Math.floor(cy + rnd() * h * 0.3); if (g.get(x, y)) { g.set(x, y, ramp[0]); g.set(x + 1, y + 1, ramp[0]); } }
  addOutline(g, cover === 'snow' ? '#2f3f5a' : OUTLINES.rock);
  return g;
}

/** Samambaia. */
function makeFern(seed) {
  const rnd = mulberry32(seed);
  const g = new PixelGrid(22, 16);
  for (let i = 0; i < 7; i++) {
    const a = (-170 + i * 22 + (rnd() - 0.5) * 10) * Math.PI / 180, L = 8 + rnd() * 4;
    const pts = [];
    for (let s = 0; s <= 1.001; s += 0.08) pts.push([11 + Math.cos(a) * L * s, 15 + Math.sin(a) * L * s + 3.2 * s * s]);
    for (let j = 1; j < pts.length; j++) {
      const lightSide = Math.cos(a) < 0;
      thickLine(g, pts[j - 1][0], pts[j - 1][1], pts[j][0], pts[j][1], 1, () => RAMPS.fern[lightSide ? 2 : 1]);
      if (j % 1 === 0 && j > 1) { g.set(Math.round(pts[j][0] - 1), Math.round(pts[j][1] + 1), RAMPS.fern[lightSide ? 3 : 2]); g.set(Math.round(pts[j][0] + 1), Math.round(pts[j][1] - 1), RAMPS.fern[lightSide ? 2 : 0]); }
    }
  }
  addOutline(g, OUTLINES.wet);
  return g;
}

/** Cogumelo vermelho com pintas ou marrom. */
function makeMushroom(seed) {
  const g = new PixelGrid(12, 11);
  const red = seed % 2 === 0;
  fillCapsule(g, 6, 6, 6, 9.5, 1.6, ['#a89a7e', '#c8bca0', '#e6dcc2', '#f6f0de']);
  fillBlob(g, 6, 5, 4.6, 3.2, red ? ['#7a1a1a', '#b02a28', '#d8403a', '#f06a58'] : ['#4a2e1a', '#6e4a2c', '#8e6438', '#b08650'], 0.1);
  if (red) { g.set(4, 4, '#fff4e0'); g.set(7, 3, '#fff4e0'); g.set(8, 5, '#fff4e0'); }
  addOutline(g, '#2a1812');
  return g;
}

/** Folha grande de bananeira/palmeira de selva: folhas longas e arqueadas. */
function makeBigLeaf(seed) {
  const rnd = mulberry32(seed);
  const g = new PixelGrid(36, 32);
  const angles = [-158, -125, -92, -58, -24];
  for (const deg of angles) {
    const a = (deg + (rnd() - 0.5) * 10) * Math.PI / 180, L = 13 + rnd() * 5;
    const left = Math.cos(a) < -0.1;
    const pts = [];
    for (let s = 0; s <= 1.001; s += 0.04) pts.push([18 + Math.cos(a) * L * s, 30 + Math.sin(a) * L * s + 6 * s * s]);
    for (let j = 1; j < pts.length; j++) {
      const s = j / pts.length, w = 0.8 + Math.sin(Math.PI * Math.min(1, s * 1.05)) * 3.2;
      thickLine(g, pts[j - 1][0], pts[j - 1][1], pts[j][0], pts[j][1], w, (t, dx, dy) => RAMPS.jungle[dy < -0.6 ? (left ? 3 : 2) : dy > 0.7 ? 0 : (left ? 2 : 1)]);
    }
    for (let j = 2; j < pts.length - 1; j++) g.set(Math.round(pts[j][0]), Math.round(pts[j][1]), RAMPS.jungle[3]);
  }
  addOutline(g, OUTLINES.wet);
  return g;
}

/** Árvore de selva: tronco alto com raízes, copa larga em camadas e cipós. */
function makeJungleTree(seed) {
  const rnd = mulberry32(seed);
  const W = 58, H = 70, g = new PixelGrid(W, H), cx = 29;
  drawTrunk(g, cx, 30, H - 1, 3, RAMPS.wood, rnd, 12, seed);
  for (const s of [-1, 1]) thickLine(g, cx + s * 3, H - 14, cx + s * 8, H - 1, 2, (t) => RAMPS.wood[s < 0 ? 3 : 1]);
  const clumps = [{ x: cx, y: 14, rx: 20, ry: 10 }, { x: cx - 14, y: 24, rx: 12, ry: 7 }, { x: cx + 14, y: 24, rx: 12, ry: 7 }, { x: cx - 6, y: 8, rx: 10, ry: 6 }, { x: cx + 8, y: 10, rx: 9, ry: 6 }];
  for (let i = 0; i < 5; i++) clumps.push({ x: cx + (rnd() - 0.5) * 34, y: 12 + rnd() * 12, rx: 6 + rnd() * 3, ry: 4 + rnd() * 2 });
  clumps.sort((p, q) => q.y - p.y);
  for (const c of clumps) fillBlob(g, c.x, c.y, c.rx, c.ry, RAMPS.jungle, 0.22);
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(cx - 20 + rnd() * 40), len = 10 + Math.floor(rnd() * 14);
    for (let y = 26; y < 26 + len; y++) { g.set(x + Math.round(Math.sin(y * 0.6 + i)), y, y % 5 === 0 ? RAMPS.jungle[3] : RAMPS.jungle[1]); }
  }
  for (let i = 0; i < 8; i++) { const x = Math.floor(cx - 16 + rnd() * 32), y = 6 + Math.floor(rnd() * 20); if (g.get(x, y)) { g.set(x, y, '#f0587a'); g.set(x + 1, y, '#ff9aae'); } }
  addOutline(g, OUTLINES.wet);
  return g;
}

/** Cipreste de pântano: base alargada, joelhos de raiz, copa achatada e musgo pendente. */
function makeCypress(seed) {
  const rnd = mulberry32(seed);
  const W = 48, H = 56, g = new PixelGrid(W, H), cx = 24;
  drawTrunk(g, cx, 22, H - 1, 3, RAMPS.wood, rnd, 14, seed);
  for (const dx of [-11, -7, 7, 12]) { const h = 4 + Math.floor(rnd() * 3); for (let k = 0; k < h; k++) g.set(cx + dx, H - 1 - k, RAMPS.wood[dx < 0 ? 2 : 1]); g.set(cx + dx + 1, H - 1, RAMPS.wood[1]); }
  const clumps = [];
  for (let i = 0; i < 9; i++) clumps.push({ x: cx + (rnd() - 0.5) * 30, y: 16 + (rnd() - 0.5) * 8, rx: 6 + rnd() * 4, ry: 3.5 + rnd() * 2 });
  clumps.sort((p, q) => q.y - p.y);
  for (const c of clumps) fillBlob(g, c.x, c.y, c.rx, c.ry, RAMPS.swamp, 0.22);
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(cx - 16 + rnd() * 32), len = 5 + Math.floor(rnd() * 8);
    if (!g.get(x, 18)) continue;
    for (let y = 19; y < 19 + len; y++) g.set(x + Math.round(Math.sin(y * 0.7 + i) * 0.8), y, y % 3 === 0 ? '#a8b48a' : '#7b8a5e');
  }
  addOutline(g, OUTLINES.swamp);
  return g;
}

/** Taboas (juncos com espiga marrom). */
function makeReeds(seed) {
  const rnd = mulberry32(seed);
  const g = new PixelGrid(18, 28);
  for (let i = 0; i < 5; i++) {
    const x0 = 3 + i * 3 + (rnd() - 0.5), h = 14 + rnd() * 11, lean = (rnd() - 0.5) * 5;
    thickLine(g, x0, 27, x0 + lean, 27 - h, 1, (t) => RAMPS.reed[t > 0.7 ? 3 : t > 0.3 ? 2 : 1]);
    if (i % 2 === 1) { const hx = Math.round(x0 + lean); for (let k = 0; k < 4; k++) { g.set(hx, Math.round(27 - h) - k, RAMPS.cattail[k % 3 === 0 ? 2 : 1]); g.set(hx + 1, Math.round(27 - h) - k, RAMPS.cattail[0]); } }
  }
  return g;
}

/** Vitória-régia com flor opcional. */
function makeLily(seed) {
  const g = new PixelGrid(16, 10);
  fillBlob(g, 8, 6, 6.4, 3, RAMPS.lily, 0.12);
  for (let k = 0; k < 4; k++) { g.set(9 + k, 6 + Math.floor(k / 2), null); g.set(9 + k, 5 + Math.floor(k / 2), null); }
  if (seed % 2 === 0) { g.set(5, 4, '#f6a4c0'); g.set(6, 3, '#ffd0e0'); g.set(4, 5, '#e47a9c'); g.set(6, 4, '#fff0a0'); }
  addOutline(g, OUTLINES.water);
  return g;
}

/** Algas de águas rasas. */
function makeKelp(seed) {
  const rnd = mulberry32(seed);
  const g = new PixelGrid(12, 20);
  for (let i = 0; i < 4; i++) {
    const x0 = 2 + i * 2.4, h = 9 + rnd() * 9;
    for (let y = 0; y < h; y++) g.set(Math.round(x0 + Math.sin(y * 0.55 + i * 1.7) * 1.4), 19 - y, RAMPS.kelp[y > h * 0.7 ? 3 : y > h * 0.3 ? 2 : 1]);
  }
  return g;
}

/** Tufo de capim (cores por rampa). */
function makeTuft(seed, ramp = RAMPS.leaf) {
  const rnd = mulberry32(seed);
  const g = new PixelGrid(11, 9);
  for (let i = 0; i < 5; i++) { const x0 = 2 + i * 1.6, lean = (i - 2) * 0.9 + (rnd() - 0.5), h = 4 + rnd() * 3.6; thickLine(g, x0, 8, x0 + lean, 8 - h, 1, (t) => ramp[t > 0.6 ? 3 : t > 0.25 ? 2 : 1]); }
  return g;
}

/** Florzinhas coloridas. */
function makeFlowers(seed) {
  const rnd = mulberry32(seed);
  const g = new PixelGrid(12, 10);
  const heads = [['#fff4f4', '#f0f0e0'], ['#ffd94a', '#f4b82a'], ['#f08ab4', '#d85a90'], ['#9ab8ff', '#6a8ae0']];
  const set = heads[seed % 4];
  for (let i = 0; i < 4; i++) {
    const x = 2 + i * 2.5 + (rnd() - 0.5), h = 3 + rnd() * 3;
    g.set(Math.round(x), 9, RAMPS.leaf[1]); g.set(Math.round(x), 8, RAMPS.leaf[2]); if (h > 4) g.set(Math.round(x), 7, RAMPS.leaf[2]);
    const hy = Math.round(9 - h - 1);
    g.set(Math.round(x), hy, set[0]); g.set(Math.round(x) - 1, hy, set[1]); g.set(Math.round(x) + 1, hy, set[1]); g.set(Math.round(x), hy - 1, set[1]); g.set(Math.round(x), hy + 1, set[1]);
    g.set(Math.round(x), hy, '#f8e070');
  }
  return g;
}

/** Arbusto redondo, com frutinhas opcionais. */
function makeBush(seed, ramp = RAMPS.leaf, outline = OUTLINES.leaf, berry = null) {
  const rnd = mulberry32(seed);
  const g = new PixelGrid(22, 14);
  const cl = [{ x: 7, y: 8, r: 4.6 }, { x: 15, y: 8, r: 4.8 }, { x: 11, y: 6, r: 5.4 }];
  cl.sort((p, q) => q.y - p.y);
  for (const c of cl) fillBlob(g, c.x, c.y, c.r * 1.1, c.r * 0.95, ramp, 0.2);
  if (berry) for (let i = 0; i < 6; i++) { const x = 5 + Math.floor(rnd() * 12), y = 4 + Math.floor(rnd() * 8); if (g.get(x, y)) g.set(x, y, berry); }
  addOutline(g, outline);
  return g;
}

/** Montinho de neve com folhinhas. */
function makeSnowBush(seed) {
  const rnd = mulberry32(seed);
  const g = new PixelGrid(22, 13);
  for (let i = 0; i < 6; i++) {
    const x0 = 4 + i * 2.6, a = -1.57 + (rnd() - 0.5) * 1.3, L = 4 + rnd() * 3;
    thickLine(g, x0, 10, x0 + Math.cos(a) * L, 10 + Math.sin(a) * L, 1, () => RAMPS.pine[1]);
  }
  fillBlob(g, 11, 9, 8.2, 3.6, RAMPS.snow, 0.1);
  fillBlob(g, 6.5, 9.4, 4, 2.6, RAMPS.snow, 0.1);
  addOutline(g, '#3a4f78');
  return g;
}

/**
 * Catálogo de espécies. `make(variante)` devolve a grade de pixels.
 * `base` = deslocamento (px) da base do sprite para cima, para apoiar no chão.
 */
const SPECIES = {
  oak: { name: 'Carvalho', make: (v) => makeOak(11 + v) },
  oakWet: { name: 'Carvalho com musgo', make: (v) => makeOak(31 + v, RAMPS.leafWet, OUTLINES.wet, RAMPS.wood, true) },
  birch: { name: 'Bétula', make: (v) => makeBirch(5 + v) },
  birchBare: { name: 'Bétula sem folhas', make: (v) => makeBirch(15 + v, true) },
  bush: { name: 'Arbusto', make: (v) => makeBush(3 + v, RAMPS.leaf, OUTLINES.leaf, v % 2 ? '#d8403a' : null) },
  bushWet: { name: 'Arbusto úmido', make: (v) => makeBush(23 + v, RAMPS.leafWet, OUTLINES.wet, '#5a4ab0') },
  tuft: { name: 'Capim', make: (v) => makeTuft(2 + v) },
  tuftDry: { name: 'Capim seco', make: (v) => makeTuft(7 + v, RAMPS.dryGrass) },
  tuftBeach: { name: 'Capim de duna', make: (v) => makeTuft(9 + v, RAMPS.beachGrass) },
  tuftSnow: { name: 'Capim gelado', make: (v) => makeTuft(4 + v, RAMPS.snowGrass) },
  flowers: { name: 'Flores', make: (v) => makeFlowers(v) },
  fern: { name: 'Samambaia', make: (v) => makeFern(2 + v) },
  mushroom: { name: 'Cogumelo', make: (v) => makeMushroom(v) },
  rock: { name: 'Pedra', make: (v) => makeRock(40 + v, 14 + (v % 2) * 4, 10 + (v % 2) * 2) },
  rockBig: { name: 'Pedra grande', make: (v) => makeRock(50 + v, 24, 16) },
  rockMoss: { name: 'Pedra com musgo', make: (v) => makeRock(60 + v, 18, 12, RAMPS.rock, 'moss') },
  rockSand: { name: 'Pedra do deserto', make: (v) => makeRock(70 + v, 18, 12, RAMPS.sandstone) },
  rockSnow: { name: 'Pedra com neve', make: (v) => makeRock(80 + v, 18, 12, RAMPS.rock, 'snow') },
  jungleTree: { name: 'Árvore de selva', make: (v) => makeJungleTree(9 + v) },
  bigLeaf: { name: 'Bananeira', make: (v) => makeBigLeaf(4 + v) },
  palm: { name: 'Palmeira', make: (v) => makePalm(6 + v) },
  cypress: { name: 'Cipreste do pântano', make: (v) => makeCypress(8 + v) },
  reeds: { name: 'Taboa', make: (v) => makeReeds(3 + v) },
  lily: { name: 'Vitória-régia', make: (v) => makeLily(v) },
  kelp: { name: 'Alga', make: (v) => makeKelp(2 + v) },
  deadTree: { name: 'Árvore seca', make: (v) => makeDeadTree(13 + v) },
  saguaro: { name: 'Cacto saguaro', make: (v) => makeSaguaro(3 + v) },
  barrel: { name: 'Cacto-barril', make: (v) => makeBarrel(5 + v) },
  dryBush: { name: 'Arbusto seco', make: (v) => makeDryBush(7 + v) },
  spruce: { name: 'Abeto', make: (v) => makeSpruce(21 + v, 5, false) },
  spruceSnow: { name: 'Abeto nevado', make: (v) => makeSpruce(25 + v, 5, true) },
  spruceSmall: { name: 'Abeto jovem nevado', make: (v) => makeSpruce(29 + v, 3, true) },
  snowBush: { name: 'Arbusto nevado', make: (v) => makeSnowBush(3 + v) },
};

/** Cache de sprites já desenhados (3 variantes por espécie). */
class SpeciesBank {
  constructor() {
    /** @type {Object<string, HTMLCanvasElement[]>} */
    this.cache = {};
  }

  /** @param {string} id @param {number} v variante @returns {HTMLCanvasElement} */
  get(id, v) {
    if (!this.cache[id]) this.cache[id] = [0, 1, 2].map((k) => SPECIES[id].make(k).toCanvas());
    return this.cache[id][((v % 3) + 3) % 3];
  }
}

// ---------------------------------------------------------------------
// Mundo: ruído, clima, biomas, solos pintados pixel a pixel e vegetação
// ---------------------------------------------------------------------

