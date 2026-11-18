// ---------------------------------------------------------------------
// Presas selvagens: ficha de cada espécie (aparência, onde vive, vida, alimento e movimento),
// todas ativas só de dia. Os predadores ainda não existem.
// ---------------------------------------------------------------------

/** Tamanho de cada fase da vida em relação ao adulto: filhote, jovem, adulto e idoso. */
const STAGE_MUL = [0.6, 0.85, 1, 1];
const STAGE_ICON = ['🍼', '🌱', '💪', '👴'];
/** Ícones das causas de morte (para os avisos). */
const DEATH_ICON = { idade: '⏳', fome: '🥕', acidente: '⚠️', frio: '🥶', lotacao: '🏘️' };

const LIGHT_BELLY = ['#b89c7c', '#d0b898', '#e8d8c0', '#f6eee0'];

/**
 * Ciclo de vida (tempos em segundos de jogo; um ano de jogo = 9600 s):
 * filhote até `kit`, jovem até `young` (maturidade), idoso nos últimos `old` s de vida;
 * gestação `gest`, intervalo `cool` entre ninhadas, ninhada `litter`, lotação `cap` por grupo.
 */
function life(kit, young, old, lifeMin, lifeMax, gest, cool, litMin, litMax, cap, mateP = 0.01) {
  return { kit, young, old, lifeMin, lifeMax, gest, cool, litter: [litMin, litMax], cap, mateP, poolMin: 30, breed: 2.2, mateRange: 220 };
}

/** Alimento do local: renascimento por estação, efeito da neve, tamanho da área e quanto cada refeição gasta. */
function graze(area, use, snow = 0.85) { return { rate: [0.5, 0.6, 0.35, 0.12], snow, floor: 0.09, area, use, winterDrain: 0.6 }; }

/** Insetos e pequenos bichos: muitos no calor, quase nenhum no frio. */
const BUGS = { rate: [0.5, 0.7, 0.4, 0.05], snow: 0.9, floor: 0.03, area: 1, use: 0.4, winterDrain: 0.3 };

/**
 * Espécies. `spawn` = chance de uma célula do mapa ter um grupo, por bioma; `roam` = onde andam;
 * `move` = velocidade (px/s) por fase, raio de passeio ao redor do abrigo, medo das pessoas (`shy`) e pulos.
 */
const PREY = {
  rabbit: { name: 'Coelho', icon: '🐇', plan: 'bunny', scale: 1, pal: 'brown', den: 'burrow', cell: 140, group: [2, 4], minDist: 100,
    spawn: { [BIOME.MEADOW]: 0.3, [BIOME.FOREST]: 0.18 }, roam: [BIOME.MEADOW, BIOME.FOREST, BIOME.HUMID, BIOME.BEACH],
    life: life(150, 420, 1800, 6000, 9600, 120, 700, 2, 4, 7, 0.012), forage: graze(1, 0.5),
    move: { speed: [30, 36, 40, 28], range: [20, 50, 90], shy: 55, hops: true, hopT: 0.17, hopLift: 3 }, item: 'grass' },
  hare: { name: 'Lebre-da-neve', icon: '🐇', plan: 'bunny', scale: 1, pal: 'white', cell: 150, group: [2, 3], minDist: 110,
    spawn: { [BIOME.SNOW]: 0.2, [BIOME.TUNDRA]: 0.2 }, roam: [BIOME.SNOW, BIOME.TUNDRA],
    life: life(150, 420, 1500, 5000, 8000, 130, 800, 2, 3, 6, 0.012), forage: { rate: [0.45, 0.55, 0.4, 0.2], snow: 0.5, floor: 0.1, area: 1.2, use: 0.5, winterDrain: 0.6 },
    move: { speed: [32, 40, 46, 30], range: [25, 60, 100], shy: 60, hops: true, hopT: 0.15, hopLift: 3 }, item: 'moss' },
  sheep: { name: 'Ovelha-selvagem', icon: '🐑', plan: 'quad', scale: 0.6, cell: 170, group: [3, 6], minDist: 170, risk: 0.5,
    p: { W: 36, H: 28, bx: 17, brx: 9, bry: 5.5, legLen: 5.5, legW: 2.2, swing: 2.5, neck: 2.5, neckR: 2.6, headR: 3.4, snoutR: 2.2, fur: AR.wool, wool: true, legs: AR.darkFace, headRamp: AR.darkFace, ear: 'short', tail: 'short', act: 'lie', outline: '#2a2622' },
    spawn: { [BIOME.MEADOW]: 0.2 }, roam: [BIOME.MEADOW, BIOME.FOREST],
    life: life(400, 1400, 3000, 16000, 26000, 300, 3600, 1, 2, 10, 0.006), forage: graze(2, 0.45),
    move: { speed: [10, 12, 14, 9], range: [30, 70, 110], shy: 30 }, item: 'grass' },
  deer: { name: 'Cervo', icon: '🦌', plan: 'quad', scale: 0.6, cell: 160, group: [2, 4], minDist: 150, risk: 0.4,
    p: { W: 46, H: 42, bx: 18, brx: 9.5, bry: 5, legLen: 13, legW: 1.8, swing: 4, neck: 9, neckR: 2.5, headR: 3, snoutR: 1.9, fur: AR.deer, belly: ['#c8a07a', '#dcba98', '#ecd4b8', '#f6e8d4'], ear: 'short', tail: 'short', antlers: true, act: 'howl', outline: '#2a1a10' },
    spawn: { [BIOME.FOREST]: 0.35, [BIOME.HUMID]: 0.25 }, roam: [BIOME.FOREST, BIOME.HUMID, BIOME.MEADOW],
    life: life(450, 1600, 3000, 18000, 30000, 350, 4200, 1, 2, 8, 0.005), forage: graze(2.2, 0.55),
    move: { speed: [18, 22, 26, 17], range: [40, 90, 130], shy: 60 }, item: 'leaf' },
  squirrel: { name: 'Esquilo', icon: '🐿️', plan: 'quad', scale: 0.5, cell: 140, group: [1, 2], minDist: 120,
    p: { W: 28, H: 24, bx: 11, brx: 5, bry: 3.6, legLen: 2.6, legW: 1.8, swing: 2, neck: 1, neckR: 2.2, headR: 2.8, snoutR: 1.4, fur: AR.squirrel, belly: LIGHT_BELLY, ear: 'short', tail: 'curl', sitter: true, act: 'alert', outline: '#3a1c0a' },
    spawn: { [BIOME.FOREST]: 0.2 }, roam: [BIOME.FOREST, BIOME.MEADOW],
    life: life(250, 700, 2000, 8000, 14000, 150, 1500, 2, 4, 4, 0.01), forage: { rate: [0.3, 0.4, 0.9, 0.15], snow: 0.6, floor: 0.08, area: 1.2, use: 0.5, winterDrain: 0.6 },
    move: { speed: [28, 34, 40, 26], range: [20, 50, 80], shy: 44, hops: true, hopT: 0.2, hopLift: 2 }, item: 'nut' },
  frog: { name: 'Sapo', icon: '🐸', plan: 'frog', scale: 0.65, cell: 120, group: [2, 4], minDist: 90, coldShelter: true,
    spawn: { [BIOME.HUMID]: 0.2, [BIOME.SWAMP]: 0.25 }, roam: [BIOME.HUMID, BIOME.SWAMP],
    life: life(120, 360, 1500, 5000, 8000, 90, 1100, 2, 4, 10, 0.012), forage: BUGS,
    move: { speed: [20, 24, 30, 18], range: [15, 35, 60], shy: 30, hops: true, hopT: 0.22, hopLift: 2 }, item: 'fly' },
  monkey: { name: 'Macaco', icon: '🐒', plan: 'quad', scale: 0.55, cell: 140, group: [3, 6], minDist: 120, risk: 0.4,
    p: { W: 40, H: 34, bx: 19, brx: 6.5, bry: 5.5, legLen: 6, legW: 2.1, swing: 3, neck: 2, neckR: 3, headR: 3.8, snoutR: 2.2, fur: AR.monkey, snout: AR.skin, belly: ['#7e5434', '#a8743e', '#c8985e', '#dcb078'], ear: 'short', tail: 'curl', sitter: true, act: 'alert', outline: '#1f120a' },
    spawn: { [BIOME.JUNGLE]: 0.6 }, roam: [BIOME.JUNGLE, BIOME.HUMID],
    life: life(600, 2200, 4000, 20000, 32000, 400, 5000, 1, 1, 10, 0.005), forage: graze(2, 0.5, 0.1),
    move: { speed: [20, 26, 30, 20], range: [30, 70, 110], shy: 40 }, item: 'banana' },
  capybara: { name: 'Capivara', icon: '🦫', plan: 'quad', scale: 0.55, cell: 150, group: [3, 6], minDist: 140, risk: 0.5,
    p: { W: 44, H: 30, bx: 20, brx: 11, bry: 6.2, legLen: 4.2, legW: 2.4, swing: 2.2, neck: 2.2, neckR: 3.4, headR: 3.4, snoutR: 2.8, fur: ['#4a3224', '#6a4a34', '#8a6444', '#aa8260'], belly: ['#8a6a4a', '#a8845e', '#c8a47a', '#e0c49a'], ear: 'short', tail: 'short', act: 'lie', outline: '#2a1a10' },
    spawn: { [BIOME.SWAMP]: 0.35, [BIOME.JUNGLE]: 0.12, [BIOME.HUMID]: 0.12 }, roam: [BIOME.SWAMP, BIOME.JUNGLE, BIOME.HUMID, BIOME.BEACH],
    life: life(350, 1300, 3000, 14000, 22000, 300, 3000, 2, 4, 9, 0.007), forage: graze(1.6, 0.45, 0.1),
    move: { speed: [10, 13, 16, 9], range: [30, 60, 100], shy: 35 }, item: 'grass' },
  gazelle: { name: 'Gazela', icon: '🦌', plan: 'quad', scale: 0.58, cell: 160, group: [3, 6], minDist: 150, risk: 0.5,
    p: { W: 46, H: 40, bx: 19, brx: 8.6, bry: 4.4, legLen: 13, legW: 1.7, swing: 4.2, neck: 8, neckR: 2.2, headR: 2.8, snoutR: 1.8, fur: ['#7a5a34', '#a47c48', '#c8a066', '#e2c28a'], belly: ['#e8d8bc', '#f2e6d0', '#f8f0e0', '#fffaf0'], ear: 'short', tail: 'short', horns: true, act: 'howl', outline: '#3a2610' },
    spawn: { [BIOME.DESERT]: 0.3, [BIOME.MEADOW]: 0.05 }, roam: [BIOME.DESERT, BIOME.MEADOW],
    life: life(380, 1400, 3000, 14000, 24000, 300, 3600, 1, 2, 9, 0.006), forage: { rate: [0.5, 0.25, 0.25, 0.3], snow: 0, floor: 0.1, area: 2.4, use: 0.45, winterDrain: 0.7 },
    move: { speed: [22, 28, 34, 20], range: [40, 90, 140], shy: 65 }, item: 'leaf' },
  lizard: { name: 'Lagarto', icon: '🦎', plan: 'lizard', scale: 0.6, cell: 130, group: [2, 4], minDist: 80,
    spawn: { [BIOME.DESERT]: 0.22 }, roam: [BIOME.DESERT, BIOME.BEACH],
    life: life(150, 500, 2000, 7000, 12000, 100, 1000, 2, 5, 8, 0.01), forage: { rate: [0.5, 0.7, 0.4, 0.3], snow: 0.9, floor: 0.05, area: 1, use: 0.35, winterDrain: 0.5 },
    move: { speed: [26, 32, 38, 24], range: [15, 40, 70], shy: 40 }, item: 'insect' },
  reindeer: { name: 'Rena', icon: '🦌', plan: 'quad', scale: 0.58, cell: 170, group: [3, 6], minDist: 160, risk: 0.5,
    p: { W: 46, H: 40, bx: 18, brx: 9.5, bry: 5, legLen: 12, legW: 2, swing: 4, neck: 7, neckR: 2.7, headR: 3.1, snoutR: 2, fur: AR.reindeer, belly: AR.white, ear: 'short', tail: 'short', antlers: true, antlerColor: '#ece0c0', act: 'lie', outline: '#3a3028' },
    spawn: { [BIOME.TUNDRA]: 0.2, [BIOME.SNOW]: 0.1 }, roam: [BIOME.TUNDRA, BIOME.SNOW],
    life: life(450, 1500, 3000, 18000, 30000, 350, 4200, 1, 2, 10, 0.005), forage: { rate: [0.4, 0.5, 0.35, 0.2], snow: 0.4, floor: 0.12, area: 2.6, use: 0.5, winterDrain: 0.6 },
    move: { speed: [16, 20, 24, 16], range: [40, 90, 140], shy: 55 }, item: 'moss' },
  seal: { name: 'Foca', icon: '🦭', plan: 'seal', scale: 0.6, cell: 110, group: [2, 3], minDist: 80, maxT: 0.33, nearWater: true, risk: 0.4,
    spawn: { [BIOME.ICECAP]: 0.4, [BIOME.BEACH]: 0.3 }, roam: [BIOME.ICECAP, BIOME.BEACH],
    life: life(500, 1800, 4000, 22000, 36000, 400, 5200, 1, 1, 8, 0.005), forage: { rate: [0.45, 0.45, 0.45, 0.35], snow: 0, floor: 0.3, area: 1.5, use: 0.4, winterDrain: 0.7 },
    move: { speed: [8, 10, 12, 7], range: [20, 40, 60], shy: 35 }, item: 'fish' },
  crab: { name: 'Caranguejo', icon: '🦀', plan: 'crab', scale: 0.6, cell: 110, group: [2, 4], minDist: 70,
    spawn: { [BIOME.BEACH]: 0.3 }, roam: [BIOME.BEACH],
    life: life(120, 350, 1500, 5000, 8000, 90, 1000, 2, 4, 10, 0.012), forage: { rate: [0.5, 0.5, 0.5, 0.35], snow: 0.3, floor: 0.2, area: 1, use: 0.3, winterDrain: 0.6 },
    move: { speed: [18, 22, 26, 16], range: [12, 30, 50], shy: 30, sideways: true }, item: 'moss' },
  duck: { name: 'Pato', icon: '🦆', plan: 'bird', scale: 0.55, cell: 100, group: [2, 4], minDist: 70, water: true, coldShelter: true, minT: 0.35,
    p: { W: 26, H: 20, bx: 11, brx: 6, bry: 3.8, legLen: 0, neck: 2, headR: 2.8, beak: 3.6, beakColor: '#e8c030', beakW: 1.8, fur: AR.duck, headRamp: AR.green, wing: ['#4a3c2c', '#6a5a44', '#8a7a60', '#aa9a7c'], tailLen: 3, waterline: true, act: 'preen', outline: '#2a2218' },
    spawn: { [BIOME.LAKE]: 0.3 }, roam: [BIOME.LAKE],
    life: life(200, 600, 2400, 8000, 14000, 120, 1500, 3, 6, 8, 0.01), forage: { rate: [0.5, 0.6, 0.45, 0.2], snow: 0.5, floor: 0.05, area: 1.4, use: 0.35, winterDrain: 0.6 },
    move: { speed: [9, 11, 13, 8], range: [20, 40, 60], shy: 36 }, item: 'leaf' },
};
for (const s of Object.values(PREY)) s.roamSet = new Set(s.roam);

/** Monta um quadro de uma espécie numa fase da vida. @returns {{g: ScaledGrid|PixelGrid, mouth: {x: number, y: number}}} */
function buildCreatureFrame(sp, frame, stage) {
  const S = PREY[sp], sc = S.scale * STAGE_MUL[stage];
  if (S.plan === 'bunny') return drawBunnyS(frame, sc, stage === 0, stage === 3, S.pal);
  CUR_SCALE = sc;
  let r;
  switch (S.plan) {
    case 'frog': r = drawFrog(S.p || {}, frame); break;
    case 'lizard': r = drawLizard(S.p || {}, frame); break;
    case 'seal': r = drawSeal(S.p || {}, frame); break;
    case 'crab': r = drawCrab(S.p || {}, frame); break;
    case 'bird': r = drawBird(S.p, frame); break;
    default: r = drawQuad(S.p, frame);
  }
  if (r.mouth) r.mouth = { x: Math.round(r.mouth.x * sc), y: Math.round(r.mouth.y * sc) };
  CUR_SCALE = 1;
  return r;
}

/** Guarda os quadros de cada espécie e fase (e espelhados, para olhar à esquerda). */
class CreatureSprites {
  constructor() { this.cache = {}; }

  /** @returns {{canvas: HTMLCanvasElement, mouth: {x: number, y: number}}} */
  get(sp, frame, stage, left = false) {
    const key = `${sp}:${frame}:${stage}`;
    let e = this.cache[key];
    if (!e) {
      const r = buildCreatureFrame(sp, frame, stage);
      e = { canvas: r.g.toCanvas(), mirror: null, g: r.g, mouth: r.mouth || { x: r.g.w - 2, y: 3 } };
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
