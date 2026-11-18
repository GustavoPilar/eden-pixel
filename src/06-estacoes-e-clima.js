/** Cada estação dura 2 ciclos de dia e noite (40 min); o ano tem 4 estações. */
const SEASON_SECONDS = 2400;
/** Quantos passos visuais cada estação tem (o chão é refeito a cada passo). */
const SEASON_STEPS = 8;
/** Posição inicial no ano (0 = começo da primavera). */
const START_SP = 0.35;
const SEASONS = [
  { name: 'Primavera', icon: '🌸' },
  { name: 'Verão', icon: '☀️' },
  { name: 'Outono', icon: '🍂' },
  { name: 'Inverno', icon: '❄️' },
];

/** @param {number} clock relógio do jogo (s) @returns {number} posição no ano, de 0 a 4 */
function seasonPos(clock) { return ((START_SP + clock / SEASON_SECONDS) % 4 + 4) % 4; }

/** Pulso suave (0–1) centrado em `c` com meia-largura `hw`, circular no ano de 4 estações. */
function bump(sp, c, hw) {
  let d = Math.abs(sp - c);
  d = Math.min(d, 4 - d);
  return d >= hw ? 0 : 0.5 * (1 + Math.cos((Math.PI * d) / hw));
}

/** Quanto as estações são marcadas conforme a latitude: pouco nos trópicos, muito nas regiões temperadas e frias. */
const WARM_AMP = [[0, 1.6], [0.15, 2.2], [0.3, 2.0], [0.41, 1.5], [0.52, 1.0], [0.64, 0.6], [0.8, 0.3], [1, 0.3]];
const COLD_AMP = [[0, 0.8], [0.15, 0.9], [0.3, 1.0], [0.41, 1.15], [0.52, 1.0], [0.64, 0.4], [0.8, 0.15], [1, 0.15]];
/** Variação de temperatura (°C) no meio de cada estação: primavera, verão, outono, inverno. */
const SEASON_KEYS = [-0.5, 7, 1.5, -12];

/** @returns {number} variação sazonal da temperatura (°C) numa latitude, com transição suave entre as estações */
function seasonOffset(t, biome, sp) {
  // os valores-chave valem no meio de cada estação (sp = 0,5; 1,5; 2,5; 3,5)
  const s2 = (sp + 3.5) % 4, i = Math.floor(s2), f = s2 - i;
  const k0 = SEASON_KEYS[i], k1 = SEASON_KEYS[(i + 1) % 4], u = (1 - Math.cos(Math.PI * f)) / 2;
  let v = k0 + (k1 - k0) * u;
  v *= v > 0 ? interp(WARM_AMP, t) : interp(COLD_AMP, t);
  if (biome === BIOME.DESERT) v *= v > 0 ? 1.4 : 0.7;
  return v;
}

/** Temperatura média (°C, sem a variação do dia) de um ambiente numa época do ano. */
function meanTemp(b, t, sp) {
  let base = interp(TEMP_ANCHORS, t);
  if (b === BIOME.DESERT) base += 3;
  else if (b === BIOME.JUNGLE || b === BIOME.SWAMP || b === BIOME.HUMID) base += 1.5;
  return base + seasonOffset(t, b, sp);
}

/** Quanto as árvores de folha caduca estão sem folhas (0–1): caem no fim do outono e voltam na primavera. */
function bareAmount(sp) {
  const x = sp < 0.8 ? sp + 4 : sp;
  if (x < 2.4) return 0;
  if (x < 3.2) return (x - 2.4) / 0.8;
  if (x < 4.3) return 1;
  if (x < 4.8) return 1 - (x - 4.3) / 0.5;
  return 0;
}

/**
 * Aparência sazonal de um ponto (preenche `o`): neve no chão, cor de outono, flores, seca,
 * tom apagado do inverno e queda das folhas. Cada ambiente reage de um jeito.
 */
function seasonLookInto(o, b, t, sp) {
  const water = b === BIOME.DEEP || b === BIOME.SHALLOW || b === BIOME.LAKE;
  const Tm = meanTemp(b, t, sp);
  let snow = water ? 0 : clamp((7 - Tm) / 6, 0, 1);
  if (b === BIOME.ICECAP) snow = Math.max(snow, 0.9);
  // 1 nas regiões temperadas e boreais, 0 nos trópicos e polos
  const temperate = clamp(Math.min((t - 0.18) / 0.14, (0.8 - t) / 0.2), 0, 1);
  o.snow = snow;
  o.autumn = bump(sp, 2.45, 0.85) * temperate;
  o.bare = bareAmount(sp) * temperate;
  o.bloom = clamp((b === BIOME.DESERT ? bump(sp, 0.6, 1.1) * 0.9 : bump(sp, 0.7, 1.3) * temperate) + (b === BIOME.JUNGLE ? bump(sp, 1, 1.2) * 0.5 : 0), 0, 1);
  let dry = bump(sp, 1.3, 1) * (b === BIOME.MEADOW ? 0.45 : b === BIOME.DESERT ? 0.25 : temperate * 0.12);
  if (b === BIOME.JUNGLE || b === BIOME.HUMID) dry = Math.max(dry, bump(sp, 3.5, 0.9) * 0.35);
  o.dry = dry;
  o.dull = bump(sp, 3.5, 1) * temperate * (1 - snow);
  return o;
}

/** @returns {object} aparência sazonal (objeto novo) */
function seasonLookAt(b, t, sp) { return seasonLookInto({}, b, t, sp); }

// ---------- cores ----------
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d > 0) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

function hsl2rgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
}

const SNOW_COLS = [[244, 248, 253], [228, 238, 248], [214, 226, 242], [255, 255, 255]];
/** Chão que aparece quando a neve derrete nos ambientes frios. */
const THAW = {
  [BIOME.SNOW]: [[62, 90, 52], [79, 110, 63], [94, 122, 71], [107, 90, 66]],
  [BIOME.TUNDRA]: [[122, 138, 74], [140, 154, 88], [106, 120, 64], [154, 138, 90]],
  [BIOME.ICECAP]: [[158, 196, 224], [180, 212, 236], [214, 230, 244], [244, 248, 253]],
};
const FLOWER_COLS = [[255, 190, 210], [255, 255, 255], [255, 224, 110], [200, 150, 230]];
const DESERT_FLOWER_COLS = [[250, 160, 60], [250, 220, 90], [230, 110, 150]];

/**
 * Aplica a estação a um pixel de chão: cor de outono, seca, flores e neve (em manchas).
 * Nos ambientes frios a neve já é o chão: o degelo é que aparece no verão.
 */
function seasonalGround(col, b, x, y, L) {
  if (b === BIOME.DEEP || b === BIOME.SHALLOW) return col;
  if (b === BIOME.SNOW || b === BIOME.TUNDRA || b === BIOME.ICECAP) {
    if (L.snow >= 0.995) return col;
    const n = valueNoise(x / 7, y / 7, 83) * 0.6 + hash2(x, y) * 0.4;
    if (n < L.snow * 1.05 - 0.02) return col;
    const pal = THAW[b];
    return pal[Math.floor(hash2(x + 5, y + 9) * pal.length)];
  }
  if (b === BIOME.LAKE || b === BIOME.ICE) return col;
  let out = col;
  if (L.autumn > 0.01 || L.dry > 0.01 || L.dull > 0.01) {
    const [hh, s, l] = rgb2hsl(col[0], col[1], col[2]);
    if (hh > 55 && hh < 175 && s > 0.1) {
      const tgt = b === BIOME.FOREST || b === BIOME.HUMID ? 24 : b === BIOME.MEADOW ? 40 : 34;
      let nh = hh + (tgt + (hash2(x, y) - 0.5) * 20 - hh) * L.autumn * 0.85, ns = s * (1 - 0.1 * L.autumn), nl = l * (1 - 0.02 * L.autumn);
      if (L.dry > 0) { nh += (50 - nh) * L.dry * 0.75; ns *= 1 - 0.25 * L.dry; nl *= 1 + 0.05 * L.dry; }
      if (L.dull > 0) { nh += (60 - nh) * L.dull * 0.3; ns *= 1 - 0.35 * L.dull; nl *= 1 - 0.04 * L.dull; }
      out = hsl2rgb(nh, ns, nl);
    }
  }
  if (L.bloom > 0.05 && hash2(x * 3 + 1, y * 7 + 2) < L.bloom * 0.012 && (b === BIOME.MEADOW || b === BIOME.FOREST || b === BIOME.HUMID || b === BIOME.DESERT || b === BIOME.JUNGLE)) {
    const pal = b === BIOME.DESERT ? DESERT_FLOWER_COLS : FLOWER_COLS;
    out = pal[Math.floor(hash2(x + 11, y + 4) * pal.length)];
  }
  if (L.snow > 0.01) {
    const n = valueNoise(x / 6, y / 6, 77) * 0.55 + hash2(x + 13, y + 2) * 0.45, th = L.snow * 1.12 - 0.04;
    if (n < th) out = SNOW_COLS[Math.floor(hash2(x + 7, y + 3) * 4)];
    else if (n < th + 0.08) out = [Math.round((out[0] + 250) / 2), Math.round((out[1] + 252) / 2), Math.round((out[2] + 255) / 2)];
  }
  return out;
}

// ---------- plantas ----------
const DECIDUOUS = new Set(['oak', 'oakWet', 'birch']);
const SHRUBS = new Set(['bush', 'bushWet', 'fern']);
const GRASS = new Set(['tuft', 'flowers', 'tuftBeach', 'tuftDry']);
const AUTUMN_HUE = { oak: 24, oakWet: 30, birch: 48, bush: 10, bushWet: 18, fern: 34, tuft: 44, flowers: 44, tuftBeach: 50 };
/** Quando a neve derrete, as plantas "nevadas" viram as versões normais. */
const THAW_SWAP = { spruceSnow: 'spruce', tuftSnow: 'tuft', rockSnow: 'rock', snowBush: 'bush' };

/** @returns {number} valor arredondado em `n` níveis (para guardar sprites em cache) */
function quant(v, n) { return Math.round(clamp(v, 0, 1) * n) / n; }

/** @returns {object} aparência sazonal de uma planta, em níveis discretos */
function makeLook(b, t, sp) {
  const L = seasonLookAt(b, t, sp);
  const look = { snow: quant(L.snow, 4), autumn: quant(L.autumn, 4), bare: quant(L.bare, 4), bloom: quant(L.bloom, 3), dry: quant(L.dry, 3), dull: quant(L.dull, 2) };
  look.thaw = L.snow < 0.35;
  look.key = `${look.snow}|${look.autumn}|${look.bare}|${look.bloom}|${look.dry}|${look.dull}`;
  return look;
}

/** Recolore um sprite para a estação: folhas de outono, queda das folhas, flores, seca e neve nas partes de cima. */
function seasonize(src, id, look) {
  const w = src.width, h = src.height, cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const cx = cv.getContext('2d');
  cx.drawImage(src, 0, 0);
  const img = cx.getImageData(0, 0, w, h), d = img.data;
  const deciduous = DECIDUOUS.has(id), shrub = SHRUBS.has(id), grass = GRASS.has(id), hue0 = AUTUMN_HUE[id];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (!d[i + 3] || !(deciduous || shrub || grass)) continue;
    const [hh, s, l] = rgb2hsl(d[i], d[i + 1], d[i + 2]);
    if (!(hh > 55 && hh < 175 && s > 0.12 && l > 0.13)) continue;
    const hs = hash2(x * 5 + id.length, y * 3 + 7);
    if ((deciduous || shrub) && look.bare > 0 && hs < look.bare * (deciduous ? 0.82 : 0.55)) { d[i + 3] = 0; continue; }
    let nh = hh, ns = s, nl = l;
    if (hue0 !== undefined && look.autumn > 0) { nh = hh + (hue0 + (hash2(x, y) - 0.5) * 22 - hh) * look.autumn; ns = Math.min(1, s * (1 + 0.1 * look.autumn)); nl = l * (1 - 0.04 * look.autumn); }
    if (look.dry > 0) { nh += (52 - nh) * look.dry * (grass ? 0.8 : 0.4); ns *= 1 - 0.25 * look.dry; }
    if (look.dull > 0 && grass) { nh += (48 - nh) * look.dull * 0.5; ns *= 1 - 0.4 * look.dull; }
    if (look.bloom > 0 && (deciduous || shrub) && hs < look.bloom * 0.1) {
      const bc = [[255, 220, 232], [255, 255, 255], [255, 190, 214]][Math.floor(hash2(x + 3, y + 1) * 3)];
      d[i] = bc[0]; d[i + 1] = bc[1]; d[i + 2] = bc[2];
      continue;
    }
    if (look.bloom > 0) nl = Math.min(0.9, nl * (1 + 0.06 * look.bloom));
    const [nr, ng, nb] = hsl2rgb(nh, ns, nl);
    d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
  }
  if (look.snow > 0) {
    const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
    const mark = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!a(x, y)) continue;
      const hs = hash2(x * 11 + 3, y * 13 + 5), top = !a(x, y - 1), top2 = !a(x, y - 2);
      if (top && hs < 0.25 + 0.75 * look.snow) mark.push([x, y, 0]);
      else if (top2 && hs < look.snow * 0.55) mark.push([x, y, 1]);
      else if (grass && hs < look.snow * 0.7) mark.push([x, y, 2]);
    }
    for (const [x, y, k] of mark) {
      const i = (y * w + x) * 4, c = SNOW_COLS[k === 1 ? 1 : Math.floor(hash2(x + 9, y + 1) * 4)];
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
    }
  }
  cx.putImageData(img, 0, 0);
  return cv;
}

/** Guarda os sprites já recoloridos para cada aparência. */
class SeasonSprites {
  constructor() {
    /** @type {Map<string, HTMLCanvasElement>} */
    this.cache = new Map();
    /** Último sprite de cada planta (mostrado enquanto o novo não fica pronto) e limite de novos por quadro. */
    this.last = new Map();
    this.budget = 12;
  }

  /** @returns {HTMLCanvasElement} sprite da planta na aparência sazonal dada */
  get(id, v, look, species) {
    const id2 = look.thaw && THAW_SWAP[id] ? THAW_SWAP[id] : id;
    const base = species.get(id2, v);
    if (!look.snow && !look.autumn && !look.bare && !look.bloom && !look.dry && !look.dull) return base;
    const key = `${id2}:${v}:${look.key}`;
    let c = this.cache.get(key);
    const lk = `${id2}:${v}`;
    if (!c) {
      const prev = this.last.get(lk);
      if (this.budget <= 0 && prev) return prev;
      this.budget--;
      c = seasonize(base, id2, look);
      this.cache.set(key, c);
    }
    this.last.set(lk, c);
    return c;
  }
}

// ---------- comida de época ----------
/** Em quais estações (0 primavera, 1 verão, 2 outono, 3 inverno) cada planta dá comida; as ausentes dão o ano todo. */
const EDIBLE_SEASONS = { bush: [1, 2], bushWet: [1, 2], mushroom: [0, 2], saguaro: [1], oak: [2], oakWet: [2], jungleTree: [0, 1] };

/** @returns {object|null} a ficha comestível da planta, só se estiver na época */
function edibleNow(p, seasonIdx) {
  const e = edibleOf(p);
  if (!e) return null;
  const s = EDIBLE_SEASONS[p.id];
  return s && !s.includes(seasonIdx) ? null : e;
}

// ---------- tempo: chuva, neve, nevasca e chuva de areia ----------
/** Frio extra (°C) que cada tempo causa no corpo, por intensidade. */
const WEATHER_COLD = { rain: 3, snow: 2, blizzard: 7, sand: 2 };
/** Quanto cada tempo atrapalha o andar (multiplicador de velocidade). */
const WEATHER_SLOW = { rain: 1, snow: 0.95, blizzard: 0.8, sand: 0.85 };
const WEATHER_ICON = { rain: '🌧️', snow: '🌨️', blizzard: '🌬️', sand: '🌪️' };
const WEATHER_NAME = { rain: 'chuva', snow: 'neve', blizzard: 'nevasca', sand: 'chuva de areia' };

/**
 * Tempo que aparece e some sozinho conforme a estação e o ambiente:
 * chuva (úmido), neve e nevasca (frio; a nevasca é bem forte nas terras geladas),
 * chuva de areia (só no deserto, mais no verão e na primavera).
 */
class Weather {
  constructor() {
    this.kind = 'rain';
    this.intensity = 0;
    this.target = 0;
    this.timer = 25 + Math.random() * 40;
    this.announced = false;
  }

  /** @param {number} dt @param {{sp: number, biome: number, ambient: number}} c */
  update(dt, c) {
    this.timer -= dt;
    const cold = c.ambient < 1.5, snowy = this.kind === 'snow' || this.kind === 'blizzard';
    // tempo que não combina com o lugar vai se acalmando
    const wrong = (this.kind === 'sand' && c.biome !== BIOME.DESERT) || (snowy && c.ambient > 3) || (this.kind === 'rain' && c.ambient < -1);
    if (wrong && this.target > 0) { this.target = 0; this.timer = Math.min(this.timer, 15 + Math.random() * 15); }
    if (this.timer <= 0) {
      const si = Math.floor(c.sp) % 4;
      const polar = c.biome === BIOME.SNOW || c.biome === BIOME.TUNDRA || c.biome === BIOME.ICECAP;
      if (c.biome === BIOME.DESERT && Math.random() < [0.3, 0.38, 0.25, 0.12][si]) {
        this.kind = 'sand'; this.target = 0.5 + Math.random() * 0.5; this.timer = 55 + Math.random() * 60; this.announced = false;
      } else if (cold && Math.random() < [0.3, 0.12, 0.38, 0.5][si]) {
        const storm = (polar || c.ambient < -5) && Math.random() < 0.5;
        this.kind = storm ? 'blizzard' : 'snow';
        this.target = storm ? 0.65 + Math.random() * 0.35 : 0.4 + Math.random() * 0.5;
        this.timer = 60 + Math.random() * 90; this.announced = false;
      } else if (!cold && c.biome !== BIOME.DESERT) {
        let mul = 1;
        if (c.biome === BIOME.JUNGLE) mul = [1.3, 1.7, 0.8, 0.3][si] * 1.3;
        else if (c.biome === BIOME.HUMID || c.biome === BIOME.SWAMP) mul = 1.25;
        else if (c.biome === BIOME.MEADOW) mul = 0.8;
        if (Math.random() < [0.35, 0.18, 0.35, 0.32][si] * mul) { this.kind = 'rain'; this.target = 0.4 + Math.random() * 0.6; this.timer = 60 + Math.random() * 90; this.announced = false; }
        else { this.target = 0; this.timer = 50 + Math.random() * 100; }
      } else { this.target = 0; this.timer = 40 + Math.random() * 80; }
    }
    this.intensity += clamp(this.target - this.intensity, -dt * 0.12, dt * 0.12);
  }
}

// ---------------------------------------------------------------------
// Movimentos da natureza: vento balançando as plantas, folhas e pétalas caindo,
// sombras de nuvens e ondulações na água.
// ---------------------------------------------------------------------

