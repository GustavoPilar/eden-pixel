/** Tamanho do mundo (px) e do pedaço gerado sob demanda. */
const WORLD_W = 4000;
const WORLD_H = 3000;
const CHUNK = 64;
/** Nível do mar no campo de elevação (0–1). */
const SEA_LEVEL = 0.4;

/** Identificadores dos biomas. */
const BIOME = Object.freeze({ DEEP: 0, SHALLOW: 1, BEACH: 2, LAKE: 3, ICE: 4, DESERT: 5, SNOW: 6, TUNDRA: 7, MEADOW: 8, FOREST: 9, HUMID: 10, JUNGLE: 11, SWAMP: 12, ICECAP: 13 });

/** Nome e regras de cada bioma (água, se bloqueia o personagem). */
const BIOME_INFO = [
  { name: 'Oceano profundo', water: true, blocked: true },
  { name: 'Oceano raso', water: true, blocked: true },
  { name: 'Praia', water: false, blocked: false },
  { name: 'Lago', water: true, blocked: true },
  { name: 'Lago congelado', water: false, blocked: false },
  { name: 'Deserto', water: false, blocked: false },
  { name: 'Neve', water: false, blocked: false },
  { name: 'Tundra', water: false, blocked: false },
  { name: 'Campo', water: false, blocked: false },
  { name: 'Floresta temperada', water: false, blocked: false },
  { name: 'Floresta úmida', water: false, blocked: false },
  { name: 'Selva', water: false, blocked: false },
  { name: 'Pântano', water: false, blocked: false },
  { name: 'Calota de gelo', water: false, blocked: false },
];

/** @param {string} h cor #rrggbb @returns {number[]} */
function rgbOf(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

/** Paletas de solo em RGB. */
const GROUND = Object.fromEntries(Object.entries({
  meadow: ['#5f9a40', '#6fa84a', '#7eb957', '#4c8434', '#8bc65f'],
  forest: ['#3f7a3a', '#4a8a42', '#559a4b', '#2f5e2f', '#6e5030'],
  humid: ['#2f6a4a', '#3a7a52', '#478b5d', '#2d5a5a', '#5fa070'],
  jungle: ['#2c7a3a', '#378a44', '#44a050', '#5a4a30', '#5cc060'],
  swamp: ['#5e6e3c', '#6a7c42', '#778c4a', '#4a3f2c', '#44695a'],
  desert: ['#e3bf82', '#ecc98c', '#f4d79c', '#d2a86a', '#b88c58'],
  snow: ['#f0f6fc', '#ffffff', '#f8fbff', '#d8e4f2', '#bccce2'],
  tundra: ['#9a9a76', '#adad86', '#f0f6fc', '#d8e4f2', '#7a7a60'],
  beach: ['#efdca4', '#f6e8b8', '#fbf0c8', '#dcc88c', '#f4c8c8'],
  ice: ['#bfdcf0', '#d3e9f8', '#e6f3fc', '#8fb4d6', '#ffffff'],
  shallow: ['#58c0d0', '#66ccdc', '#7ad8e4', '#bfe6d8', '#4aa8c4'],
  deep: ['#2a68a8', '#2f74b4', '#397fbe', '#245c98', '#2f74b4'],
  lake: ['#3d90bc', '#4a9cc8', '#5aa8d2', '#3584ac', '#4a9cc8'],
  icecap: ['#e4f0fb', '#f2f8fe', '#ffffff', '#b9d4ec', '#8fb4d6'],
}).map(([k, v]) => [k, v.map(rgbOf)]));

/** Hash de 2 inteiros e semente → [0,1). */
function hashS(x, y, s) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Ruído de valor 2D suave. */
function valueNoise(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hashS(ix, iy, s), b = hashS(ix + 1, iy, s), c = hashS(ix, iy + 1, s), d = hashS(ix + 1, iy + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Soma de oitavas de ruído (0–1, centrado em ~0,5). */
function fbm(x, y, s, oct = 3) {
  let amp = 1, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) { sum += amp * valueNoise(x * f, y * f, s + i * 31); norm += amp; amp *= 0.5; f *= 2; }
  return sum / norm;
}

/** @param {number} a @param {number} b @param {number} x @returns {number} */
function smooth(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

/**
 * Cor do solo de um pixel (padrões feitos à mão para cada bioma).
 * @param {number} b bioma @param {number} x @param {number} y @param {number} depth profundidade da água (0–1)
 * @returns {number[]} RGB
 */
function groundPixel(b, x, y, depth) {
  const h = hash2(x, y);
  const tri = (p) => (h < 0.1 ? p[0] : h > 0.93 ? p[2] : p[1]);
  switch (b) {
    case BIOME.DEEP: { const p = GROUND.deep; return depth > 0.5 ? (h < 0.5 ? p[3] : p[0]) : tri(p); }
    case BIOME.SHALLOW: { const p = GROUND.shallow; if (h > 0.985) return p[3]; return depth > 0.55 ? p[4] : depth > 0.25 ? p[0] : tri(p); }
    case BIOME.LAKE: { const p = GROUND.lake; return depth > 0.5 ? (h < 0.3 ? p[3] : p[0]) : tri(p); }
    case BIOME.ICE: { const p = GROUND.ice; const n = valueNoise(x / 6, y / 6, 91); if (Math.abs(n - 0.5) < 0.018) return p[3]; return h > 0.985 ? p[4] : tri(p); }
    case BIOME.BEACH: { const p = GROUND.beach; if (h > 0.996) return p[4]; return h < 0.12 ? p[3] : tri(p); }
    case BIOME.DESERT: {
      const p = GROUND.desert;
      const rip = valueNoise(x / 34, y / 34, 7) * 7 + y * 0.42 + Math.sin(x * 0.07) * 1.4;
      if (rip - Math.floor(rip) < 0.14) return p[3];
      if (h > 0.997) return p[4];
      return h > 0.94 ? p[2] : h < 0.08 ? p[0] : p[1];
    }
    case BIOME.SNOW: {
      const p = GROUND.snow, n = valueNoise(x / 9, y / 9, 17);
      if (n > 0.72) return p[4];
      if (n > 0.58) return p[3];
      return h > 0.994 ? p[4] : p[1];
    }
    case BIOME.TUNDRA: {
      const p = GROUND.tundra, n = valueNoise(x / 8, y / 8, 23);
      if (n > 0.6) return h < 0.3 ? p[4] : p[1];
      if (n > 0.48) return h < 0.4 ? p[0] : p[2];
      return h > 0.9 ? p[3] : p[2];
    }
    case BIOME.MEADOW: {
      const p = GROUND.meadow;
      const cell = hash2(x >> 2, y >> 2);
      if (cell < 0.08 && (x & 3) === 1 && (y & 3) >= 1) return p[3];
      if (h > 0.9985) return [[255, 255, 245], [255, 220, 90], [240, 130, 180]][Math.floor(hash2(x + 5, y + 9) * 3)];
      return tri(p);
    }
    case BIOME.FOREST: {
      const p = GROUND.forest, n = valueNoise(x / 12, y / 12, 29);
      if (h > 0.955) return p[4];
      if (h < 0.035 || n > 0.7) return p[3];
      return tri(p);
    }
    case BIOME.HUMID: {
      const p = GROUND.humid, moss = valueNoise(x / 7, y / 7, 37), pud = valueNoise(x / 11 + 40, y / 11, 41);
      if (pud > 0.76) return h < 0.4 ? [70, 120, 120] : p[3];
      if (moss > 0.62) return h < 0.45 ? p[4] : p[2];
      return tri(p);
    }
    case BIOME.JUNGLE: {
      const p = GROUND.jungle;
      if (h > 0.965) return p[3];
      if ((x * 3 + y * 5 + Math.floor(valueNoise(x / 9, y / 9, 43) * 9)) % 19 === 0) return p[4];
      return tri(p);
    }
    case BIOME.SWAMP: {
      const p = GROUND.swamp, mud = valueNoise(x / 10, y / 10, 47), pud = valueNoise(x / 14 + 70, y / 14, 53);
      if (pud > 0.7) return h > 0.93 ? [120, 160, 140] : p[4];
      if (mud > 0.56) return h < 0.5 ? p[3] : [87, 74, 52];
      return tri(p);
    }
    case BIOME.ICECAP: {
      const p = GROUND.icecap, crack = valueNoise(x / 18, y / 18, 61), plate = valueNoise(x / 14, y / 14, 67);
      if (Math.abs(crack - 0.5) < 0.012) return p[4];
      if (plate > 0.62) return h < 0.3 ? p[4] : p[3];
      return h > 0.996 ? p[4] : h < 0.06 ? p[3] : p[1];
    }
    default: return [255, 0, 255];
  }
}

/**
 * Vegetação por bioma e por camada. Camadas: L (árvores grandes, células de 38 px),
 * M (arbustos, pedras, cactos; 20 px) e S (capim, flores, cogumelos; 11 px).
 * `p` = chance base de uma célula ter planta; `items` = [espécie, peso].
 */
const FLORA = {
  [BIOME.MEADOW]: { lo: 0.1, hi: 0.4, L: { p: 0.12, items: [['oak', 0.6], ['birch', 0.4]] }, M: { p: 0.32, items: [['bush', 1.2], ['rock', 0.3]] }, S: { p: 0.9, items: [['tuft', 5], ['flowers', 4]] } },
  [BIOME.FOREST]: { lo: 0.2, hi: 0.5, L: { p: 0.5, items: [['oak', 5], ['birch', 2.5]] }, M: { p: 0.28, items: [['bush', 1.4], ['rock', 0.4], ['mushroom', 0.6]] }, S: { p: 0.3, items: [['tuft', 1.4], ['mushroom', 0.5]] } },
  [BIOME.HUMID]: { lo: 0.2, hi: 0.5, L: { p: 0.5, items: [['oakWet', 4], ['birch', 0.6]] }, M: { p: 0.4, items: [['fern', 4], ['bushWet', 2], ['rockMoss', 0.7]] }, S: { p: 0.3, items: [['mushroom', 1.5], ['tuft', 1]] } },
  [BIOME.JUNGLE]: { lo: 0.2, hi: 0.5, L: { p: 0.5, items: [['jungleTree', 4], ['palm', 1.2]] }, M: { p: 0.42, items: [['bigLeaf', 3.5], ['fern', 2], ['bushWet', 1]] }, S: { p: 0.25, items: [['mushroom', 0.5], ['tuft', 1]] } },
  [BIOME.SWAMP]: { lo: 0.2, hi: 0.5, L: { p: 0.4, items: [['cypress', 3], ['deadTree', 0.8]] }, M: { p: 0.35, items: [['reeds', 2.5], ['fern', 1]] }, S: { p: 0.3, items: [['mushroom', 1], ['tuft', 1]] } },
  [BIOME.DESERT]: { lo: 0.25, hi: 0.55, L: { p: 0.05, items: [['deadTree', 1]] }, M: { p: 0.4, items: [['saguaro', 1.4], ['barrel', 1.4], ['dryBush', 3], ['rockSand', 1.2]] }, S: { p: 0.4, items: [['tuftDry', 1]] } },
  [BIOME.SNOW]: { lo: 0.2, hi: 0.5, L: { p: 0.5, items: [['spruceSnow', 4], ['spruce', 0.5], ['birchBare', 0.6]] }, M: { p: 0.3, items: [['spruceSmall', 2.5], ['snowBush', 1.5], ['rockSnow', 0.7]] }, S: { p: 0.2, items: [['tuftSnow', 1]] } },
  [BIOME.TUNDRA]: { lo: 0.25, hi: 0.55, L: { p: 0.03, items: [['spruceSmall', 1]] }, M: { p: 0.22, items: [['snowBush', 1], ['rockSnow', 1.2], ['spruceSmall', 0.5]] }, S: { p: 0.45, items: [['tuftSnow', 3]] } },
  [BIOME.ICECAP]: { lo: 0.2, hi: 0.5, M: { p: 0.05, items: [['rockSnow', 1]] } },
  [BIOME.BEACH]: { lo: 0.2, hi: 0.5, L: { p: 0.12, items: [['palm', 0.8]] }, M: { p: 0.08, items: [['rock', 0.5]] }, S: { p: 0.3, items: [['tuftBeach', 3]] } },
  [BIOME.LAKE]: { lo: 0.2, hi: 0.5, M: { p: 0.06, items: [['reeds', 1]], water: true }, S: { p: 0.35, items: [['lily', 3]], water: true } },
  [BIOME.SHALLOW]: { lo: 0.25, hi: 0.55, S: { p: 0.3, items: [['kelp', 3]], water: true } },
};

/** Tamanho da célula e raio mínimo de cada camada. */
const LAYERS = { L: { size: 38 }, M: { size: 20 }, S: { size: 11 } };

/** Raio de espaçamento (px) de cada espécie. */
function spacingOf(id) {
  if (/jungleTree|cypress/.test(id)) return 22;
  if (/oak|palm|spruce|birch|deadTree/.test(id) && !/Small/.test(id)) return 16;
  if (/saguaro|Small|rockBig|bigLeaf/.test(id)) return 11;
  if (/bush|Bush|reeds|barrel|rock|fern/.test(id)) return 8;
  return 5;
}

/** Raio (px) do obstáculo sólido de cada espécie (tronco, pedra, cacto). Plantas baixas não bloqueiam. */
const SOLID = {
  oak: 4, oakWet: 4, birch: 3, birchBare: 3, palm: 3.5, spruce: 3.5, spruceSnow: 3.5, spruceSmall: 3, jungleTree: 7, cypress: 7, deadTree: 3.5,
  saguaro: 4, barrel: 4.5, rock: 8, rockBig: 12, rockMoss: 9, rockSand: 9, rockSnow: 9,
};

/** Fator global de densidade da vegetação (menor = mais espaço livre). */
const DENSITY_SCALE = 0.95;

/**
 * O mundo: um "planeta" gerado sob demanda por pedaços. Geografia:
 * Norte = gelo (calota, tundra, taiga), meio = clima temperado, Sul = quente;
 * Oeste = seco (deserto), Leste = úmido (selva e pântano).
 */
class World {
  /** @param {number} seed */
  constructor(seed) {
    this.seed = seed;
    this.w = WORLD_W;
    this.h = WORLD_H;
    this.s = { e: seed * 3 + 1, t: seed * 5 + 2, m: seed * 7 + 3, lake: seed * 11 + 4, dither: seed * 13 + 5 };
    /** @type {Map<string, object>} */
    this.chunks = new Map();
    this.candCache = new Map();
    this.plantCache = new Map();
    this.tmp = { e: 0, t: 0, m: 0, lake: 0, b: 0, d: 0 };
    this.pathfinder = new PathFinder(this);
    /** Posição contínua no ano, passo visual (quantizado) e limite de latitude abaixo do qual os lagos congelam. */
    this.sp = START_SP;
    this.skey = -1;
    this.spq = START_SP;
    this.tFreeze = 0;
    this.latest = new Map();
    this.rebuildBudget = 99;
    this.setSeason(START_SP);
  }

  /** Atualiza a estação; a cada passo visual o chão e as plantas são refeitos. */
  setSeason(sp) {
    this.sp = sp;
    const k = Math.floor(sp * SEASON_STEPS);
    if (k === this.skey) return false;
    this.skey = k;
    this.spq = (k + 0.5) / SEASON_STEPS;
    this.chunks.clear();
    this.candCache.clear();
    this.plantCache.clear();
    let tf = 0;
    for (let t = 0; t <= 1; t += 0.01) if (interp(TEMP_ANCHORS, t) + seasonOffset(t, BIOME.LAKE, this.spq) < -1) tf = t;
    this.tFreeze = tf;
    return true;
  }

  /** Calcula elevação, temperatura, umidade e "lagos" num ponto. */
  fieldsAt(x, y, o) {
    const u = x / this.w, v = y / this.h;
    const dx = Math.abs(u - 0.5) * 2, dy = Math.abs(v - 0.5) * 2;
    const edge = Math.pow(Math.pow(dx, 3) + Math.pow(dy, 3), 1 / 3);
    o.e = 0.56 + (fbm(x / 600, y / 600, this.s.e, 3) - 0.5) * 0.55 - 0.75 * smooth(0.86, 1.0, edge);
    o.t = clamp(v + (fbm(x / 800, y / 800, this.s.t, 3) - 0.5) * 0.2, 0, 1);
    o.m = clamp(0.2 + 0.62 * u + (fbm(x / 700, y / 700, this.s.m, 3) - 0.5) * 0.8, 0, 1);
    o.lake = fbm(x / 90, y / 90, this.s.lake, 3);
  }

  /** Classifica um ponto a partir dos campos (com transições salpicadas). */
  classify(o, x, y) {
    const dj = (hashS(x, y, this.s.dither) - 0.5) * 0.55 + (valueNoise(x / 3, y / 3, this.s.dither + 1) - 0.5) * 0.9;
    const tj = o.t + dj * 0.01, mj = o.m + dj * 0.014, e = o.e, lake = o.lake;
    o.d = 0;
    if (e < SEA_LEVEL - 0.06) { o.b = BIOME.DEEP; o.d = 200; }
    else if (e < SEA_LEVEL) { o.b = BIOME.SHALLOW; o.d = Math.round(255 * (SEA_LEVEL - e) / 0.06); }
    else if (e < SEA_LEVEL + 0.03) o.b = BIOME.BEACH;
    else if (lake > 0.69 && e > SEA_LEVEL + 0.05) { o.b = o.t + dj * 0.01 < this.tFreeze ? BIOME.ICE : BIOME.LAKE; o.d = Math.round(255 * clamp((lake - 0.69) / 0.07, 0, 1)); }
    else if (lake > 0.655 && e > SEA_LEVEL + 0.05 && tj >= 0.41) o.b = BIOME.BEACH;
    else if (tj < 0.2) o.b = BIOME.ICECAP;
    else if (tj < 0.31) o.b = BIOME.TUNDRA;
    else if (tj < 0.41) o.b = mj < 0.3 ? BIOME.TUNDRA : BIOME.SNOW;
    else if (tj < 0.64) o.b = mj < 0.42 ? BIOME.MEADOW : mj < 0.62 ? BIOME.FOREST : BIOME.HUMID;
    else if (mj < 0.42) o.b = BIOME.DESERT;
    else if (mj < 0.6) o.b = BIOME.MEADOW;
    else o.b = e < SEA_LEVEL + 0.14 ? BIOME.SWAMP : BIOME.JUNGLE;
  }

  /** @returns {number} bioma no ponto (fora do mundo = oceano profundo) */
  biomeAt(x, y) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return BIOME.DEEP;
    const o = this.tmp;
    this.fieldsAt(x, y, o);
    this.classify(o, x, y);
    return o.b;
  }

  /** @returns {boolean} se há um tronco, pedra ou cacto sólido encostando no ponto */
  solidAt(x, y) {
    for (const layer of ['L', 'M']) {
      const sz = LAYERS[layer].size, cx = Math.floor(x / sz), cy = Math.floor(y / sz);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const p = this.plantAt(layer, cx + dx, cy + dy);
        if (p && SOLID[p.id] && Math.hypot(p.x - x, (p.y - y) * 1.2) < SOLID[p.id] + 3) return true;
      }
    }
    return false;
  }

  /** @returns {boolean} se o personagem pode pisar no ponto (sem água nem obstáculos) */
  canStand(x, y) { return !BIOME_INFO[this.biomeAt(x, y)].blocked && x > 4 && y > 4 && x < this.w - 4 && y < this.h - 4 && !this.solidAt(x, y); }

  /** Pedaço de solo (canvas 64×64 + espuma e brilhos) da estação atual; mostra o anterior até o novo ficar pronto. */
  getChunk(cx, cy) {
    const pos = cx + ',' + cy, key = pos + ':' + this.skey;
    let c = this.chunks.get(key);
    if (c) { this.chunks.delete(key); this.chunks.set(key, c); return c; }
    const old = this.latest.get(pos);
    if (old && this.rebuildBudget <= 0) return old;
    c = this.buildChunk(cx, cy);
    this.rebuildBudget--;
    this.chunks.set(key, c);
    this.latest.delete(pos);
    this.latest.set(pos, c);
    if (this.latest.size > 700) this.latest.delete(this.latest.keys().next().value);
    return c;
  }

  /** @returns {boolean} se o pedaço (na estação atual) já está pronto */
  hasChunk(cx, cy) { return this.chunks.has(cx + ',' + cy + ':' + this.skey); }

  /** Pinta um pedaço: campos a cada 4 px, interpolados por pixel. */
  buildChunk(cx, cy) {
    const g = 4, n = CHUNK / g + 3, x0 = cx * CHUNK, y0 = cy * CHUNK;
    const F = [new Float32Array(n * n), new Float32Array(n * n), new Float32Array(n * n), new Float32Array(n * n)];
    const o = {};
    for (let gy = 0; gy < n; gy++) for (let gx = 0; gx < n; gx++) {
      this.fieldsAt(x0 - g + gx * g, y0 - g + gy * g, o);
      const i = gy * n + gx;
      F[0][i] = o.e; F[1][i] = o.t; F[2][i] = o.m; F[3][i] = o.lake;
    }
    const S = CHUNK + 2;
    const bio = new Uint8Array(S * S), dep = new Uint8Array(S * S), tarr = new Float32Array(S * S);
    const q = { e: 0, t: 0, m: 0, lake: 0, b: 0, d: 0 };
    for (let py = -1; py <= CHUNK; py++) for (let px = -1; px <= CHUNK; px++) {
      const fx = (px + g) / g, fy = (py + g) / g;
      const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const i00 = iy * n + ix;
      const mix = (a) => a[i00] * (1 - tx) * (1 - ty) + a[i00 + 1] * tx * (1 - ty) + a[i00 + n] * (1 - tx) * ty + a[i00 + n + 1] * tx * ty;
      q.e = mix(F[0]); q.t = mix(F[1]); q.m = mix(F[2]); q.lake = mix(F[3]);
      const wx = x0 + px, wy = y0 + py;
      if (wx < 0 || wy < 0 || wx >= this.w || wy >= this.h) { q.b = BIOME.DEEP; q.d = 200; } else this.classify(q, wx, wy);
      bio[(py + 1) * S + px + 1] = q.b; dep[(py + 1) * S + px + 1] = q.d; tarr[(py + 1) * S + px + 1] = q.t;
    }
    const canvas = document.createElement('canvas');
    canvas.width = CHUNK; canvas.height = CHUNK;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(CHUNK, CHUNK);
    const foam = [], shimmer = [], L = {};
    for (let py = 0; py < CHUNK; py++) for (let px = 0; px < CHUNK; px++) {
      const i = (py + 1) * S + px + 1, b = bio[i];
      seasonLookInto(L, b, tarr[i], this.spq);
      const col = seasonalGround(groundPixel(b, x0 + px, y0 + py, dep[i] / 255), b, x0 + px, y0 + py, L);
      const k = (py * CHUNK + px) * 4;
      img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255;
      if (BIOME_INFO[b].water) {
        const land = (j) => !BIOME_INFO[bio[j]].water;
        if (land(i - 1) || land(i + 1) || land(i - S) || land(i + S)) foam.push(x0 + px, y0 + py, hash2(x0 + px, y0 + py));
        else if (hash2(x0 + px + 3, y0 + py + 7) < 0.045) shimmer.push(x0 + px, y0 + py, hash2(x0 + px, y0 + py + 1));
      }
    }
    ctx.putImageData(img, 0, 0);
    return { canvas, foam, shimmer };
  }

  /** Candidata a planta numa célula de uma camada (ou null). Determinística. */
  candidate(layer, cx, cy) {
    const key = layer + cx + ',' + cy;
    if (this.candCache.has(key)) return this.candCache.get(key);
    let res = null;
    const size = LAYERS[layer].size, li = layer === 'L' ? 1 : layer === 'M' ? 2 : 3;
    const x = Math.floor((cx + 0.12 + 0.76 * hashS(cx, cy, li * 101 + this.seed)) * size);
    const y = Math.floor((cy + 0.12 + 0.76 * hashS(cx, cy, li * 211 + this.seed)) * size);
    if (x > 8 && y > 12 && x < this.w - 8 && y < this.h - 8) {
      const b = this.biomeAt(x, y);
      const cfg = FLORA[b];
      const lay = cfg && cfg[layer];
      if (lay) {
        const cl = 0.6 * valueNoise(x / 42, y / 42, this.seed * 19 + b) + 0.4 * valueNoise(x / 130, y / 130, this.seed * 29 + b);
        const open = fbm(x / 160, y / 160, this.seed * 23 + 5, 2);
        const clearing = 1 - 0.92 * smooth(0.5, 0.6, open);
        const p = lay.p * DENSITY_SCALE * clearing * (0.2 + 0.8 * smooth(cfg.lo, cfg.hi, cl));
        if (hashS(cx, cy, li * 307 + this.seed) < p) {
          const total = lay.items.reduce((a, it) => a + it[1], 0);
          let r = hashS(cx, cy, li * 401 + this.seed) * total, id = lay.items[0][0];
          for (const it of lay.items) { r -= it[1]; if (r <= 0) { id = it[0]; break; } }
          let ok = true;
          if (lay.water) {
            const around = [[0, 0], [4, 0], [-4, 0], [0, 3], [0, -3]].every(([dx, dy]) => this.biomeAt(x + dx, y + dy) === b);
            if (id === 'reeds') ok = this.biomeAt(x, y) === b && (this.biomeAt(x + 5, y) !== b || this.biomeAt(x - 5, y) !== b || this.biomeAt(x, y + 4) !== b);
            else ok = around;
          } else if (BIOME_INFO[this.biomeAt(x, y + 1)].water) ok = false;
          if (ok) res = { id, x, y, r: spacingOf(id), prio: hashS(cx, cy, li * 503 + this.seed), v: Math.floor(hashS(cx, cy, li * 601 + this.seed) * 3) };
        }
      }
    }
    this.candCache.set(key, res);
    return res;
  }

  /** Planta aceita numa célula: candidata sem vizinhas de maior prioridade encostando e sem árvore em cima. */
  plantAt(layer, cx, cy) {
    const key = layer + cx + ',' + cy;
    if (this.plantCache.has(key)) return this.plantCache.get(key);
    const me = this.candidate(layer, cx, cy);
    let res = me;
    if (me) {
      const rng = layer === 'L' ? 2 : 1;
      for (let dy = -rng; dy <= rng && res; dy++) for (let dx = -rng; dx <= rng; dx++) {
        if (!dx && !dy) continue;
        const o = this.candidate(layer, cx + dx, cy + dy);
        if (o && o.prio > me.prio && Math.hypot(o.x - me.x, (o.y - me.y) * 1.3) < (o.r + me.r) * 0.9) { res = null; break; }
      }
      if (res && layer !== 'L') {
        const lim = layer === 'M' ? 10 : 7;
        const ls = LAYERS.L.size, lx = Math.floor(me.x / ls), ly = Math.floor(me.y / ls);
        for (let dy = -1; dy <= 1 && res; dy++) for (let dx = -1; dx <= 1; dx++) {
          const o = this.plantAt('L', lx + dx, ly + dy);
          if (o && Math.hypot(o.x - me.x, (o.y - me.y) * 1.3) < lim) { res = null; break; }
        }
      }
      if (res && layer === 'S') {
        const ms = LAYERS.M.size, mx = Math.floor(me.x / ms), my = Math.floor(me.y / ms);
        for (let dy = -1; dy <= 1 && res; dy++) for (let dx = -1; dx <= 1; dx++) {
          const o = this.plantAt('M', mx + dx, my + dy);
          if (o && Math.hypot(o.x - me.x, (o.y - me.y) * 1.3) < 6) { res = null; break; }
        }
      }
    }
    this.plantCache.set(key, res);
    if (this.plantCache.size > 60000) { this.plantCache.clear(); this.candCache.clear(); }
    return res;
  }

  /** Plantas cuja base está dentro do retângulo (ordenadas por y). */
  plantsIn(x0, y0, x1, y1) {
    const out = [];
    for (const layer of ['L', 'M', 'S']) {
      const s = LAYERS[layer].size;
      for (let cy = Math.floor(y0 / s); cy <= Math.floor(y1 / s); cy++) for (let cx = Math.floor(x0 / s); cx <= Math.floor(x1 / s); cx++) {
        const p = this.plantAt(layer, cx, cy);
        if (p && p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) out.push(p);
      }
    }
    return out.sort((a, b) => a.y - b.y);
  }

  /** Procura um ponto de partida em campo ou floresta, perto do centro e longe de plantas. */
  findSpawn() {
    const ok = [BIOME.MEADOW, BIOME.FOREST];
    for (let r = 0; r < 600; r += 6) for (let a = 0; a < 6.28; a += 0.35) {
      const x = Math.round(this.w / 2 + Math.cos(a) * r), y = Math.round(this.h / 2 + Math.sin(a) * r);
      if (ok.includes(this.biomeAt(x, y)) && this.plantsIn(x - 14, y - 14, x + 14, y + 14).length === 0) return { x, y };
    }
    return { x: this.w / 2, y: this.h / 2 };
  }
}

/** Cria um mundo (instantâneo: o terreno é gerado por pedaços durante o jogo). */
function generateWorld(seed) { return new World(seed); }


/**
 * Busca de rota (A*) numa grade de 8 px: contorna água, troncos e pedras,
 * prefere afastar-se de obstáculos e suaviza o caminho em linhas retas.
 */
class PathFinder {
  /** @param {World} world */
  constructor(world) {
    this.world = world;
    this.cell = 8;
    /** @type {Map<number, boolean>} */
    this.pass = new Map();
  }

  /** @returns {boolean} se a célula é livre (centro e quatro pontos ao redor) */
  passable(gx, gy) {
    const key = gy * 1024 + gx;
    let v = this.pass.get(key);
    if (v === undefined) {
      const w = this.world, x = gx * this.cell + 4, y = gy * this.cell + 4;
      v = w.canStand(x, y) && w.canStand(x + 3, y) && w.canStand(x - 3, y) && w.canStand(x, y + 3) && w.canStand(x, y - 3);
      this.pass.set(key, v);
      if (this.pass.size > 60000) this.pass.clear();
    }
    return v;
  }

  /** Célula livre mais próxima (em anéis), ou null. */
  nearest(gx, gy, maxR) {
    for (let r = 0; r <= maxR; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) === r && this.passable(gx + dx, gy + dy)) return [gx + dx, gy + dy];
    }
    return null;
  }

  /** @returns {boolean} se o segmento entre dois pontos está livre */
  clearLine(ax, ay, bx, by) {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 3));
    for (let i = 1; i <= n; i++) if (!this.world.canStand(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n)) return false;
    return true;
  }

  /**
   * Procura a rota de (sx,sy) até (tx,ty). Se o destino não puder ser alcançado
   * (água, cercado de pedras), leva ao ponto alcançável mais próximo dele.
   * @returns {{points: Array<{x: number, y: number}>, reached: boolean}}
   */
  find(sx, sy, tx, ty) {
    const c = this.cell;
    const s = this.nearest(Math.floor(sx / c), Math.floor(sy / c), 3);
    if (!s) return { points: [], reached: false };
    const goalCell = [Math.floor(tx / c), Math.floor(ty / c)];
    const key = (gx, gy) => gy * 1024 + gx;
    const hOf = (gx, gy) => { const dx = Math.abs(gx - goalCell[0]), dy = Math.abs(gy - goalCell[1]); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    const g = new Map([[key(s[0], s[1]), 0]]);
    const parent = new Map();
    const closed = new Set();
    const heap = [[hOf(s[0], s[1]), s[0], s[1]]];
    const push = (it) => {
      heap.push(it);
      let i = heap.length - 1;
      while (i > 0) { const q = (i - 1) >> 1; if (heap[q][0] <= heap[i][0]) break; [heap[q], heap[i]] = [heap[i], heap[q]]; i = q; }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1, r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };
    let best = [s[0], s[1]], bestH = hOf(s[0], s[1]), reached = false, expanded = 0;
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    while (heap.length && expanded < 6000) {
      const [, cx, cy] = pop();
      const ck = key(cx, cy);
      if (closed.has(ck)) continue;
      closed.add(ck);
      expanded++;
      const h = hOf(cx, cy);
      if (h < bestH) { bestH = h; best = [cx, cy]; }
      if (cx === goalCell[0] && cy === goalCell[1]) { reached = true; best = [cx, cy]; break; }
      for (const [dx, dy, cost] of dirs) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx > 500 || ny > 400 || !this.passable(nx, ny)) continue;
        if (dx && dy && (!this.passable(cx + dx, cy) || !this.passable(cx, cy + dy))) continue;
        const nk = key(nx, ny);
        if (closed.has(nk)) continue;
        // prefere caminhos afastados de obstáculos
        const near = (this.passable(nx + 1, ny) ? 0 : 1) + (this.passable(nx - 1, ny) ? 0 : 1) + (this.passable(nx, ny + 1) ? 0 : 1) + (this.passable(nx, ny - 1) ? 0 : 1);
        const ng = g.get(ck) + cost + near * 0.5;
        if (ng < (g.has(nk) ? g.get(nk) : Infinity)) { g.set(nk, ng); parent.set(nk, ck); push([ng + hOf(nx, ny), nx, ny]); }
      }
    }
    // reconstrói e suaviza
    const cells = [];
    let k = key(best[0], best[1]);
    while (k !== undefined) { cells.push({ x: (k % 1024) * c + 4, y: Math.floor(k / 1024) * c + 4 }); k = parent.get(k); }
    cells.reverse();
    const pts = [{ x: sx, y: sy }, ...cells.slice(1)];
    if (reached && this.world.canStand(tx, ty)) pts.push({ x: tx, y: ty });
    const out = [];
    let i = 0;
    while (i < pts.length - 1) {
      let j = pts.length - 1;
      while (j > i + 1 && !this.clearLine(pts[i].x, pts[i].y, pts[j].x, pts[j].y)) j--;
      out.push(pts[j]);
      i = j;
    }
    return { points: out, reached };
  }
}
// ---------------------------------------------------------------------
// Eva: sprites (mesmo estilo e proporções do Adão) e comportamento livre
// ---------------------------------------------------------------------

