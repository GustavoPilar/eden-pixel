// ---------------------------------------------------------------------
// Fichas das espécies: aparência, onde vivem, como se movem e o que fazem
// ---------------------------------------------------------------------

const B = BIOME;
const LIGHT_BELLY = ['#b89c7c', '#d0b898', '#e8d8c0', '#f6eee0'];
const WHITE_BELLY = ['#c8d0dc', '#dde3ec', '#eef2f8', '#ffffff'];

/**
 * Cada espécie: `plan` (como é desenhada), `p` (medidas e cores), `spawn` (peso por bioma),
 * `roam` (biomas onde anda), `speed` (px/s), `shy` (distância em que foge do Adão),
 * `group` (quantos nascem juntos) e `actions` (comer e outras ações).
 */
const ANIMALS = {
  rabbit: { name: 'Coelho', plan: 'bunny', p: {},
    spawn: { [B.MEADOW]: 3, [B.FOREST]: 1.5 }, roam: [B.MEADOW, B.FOREST], speed: 40, shy: 60, group: [1, 3], range: 90, hops: true, hopT: 0.17, hopLift: 3,
    actions: [{ kind: 'eat', label: 'mordiscando capim', item: 'grass', w: 4, dur: [3, 6] }, { kind: 'act', label: 'de pé, alerta', w: 1.5, dur: [2, 4] }] },
  sheep: { name: 'Ovelha', plan: 'quad', scale: 0.6, p: { W: 36, H: 28, bx: 17, brx: 9, bry: 5.5, legLen: 5.5, legW: 2.2, swing: 2.5, neck: 2.5, neckR: 2.6, headR: 3.4, snoutR: 2.2, fur: AR.wool, wool: true, legs: AR.darkFace, headRamp: AR.darkFace, ear: 'short', tail: 'short', act: 'lie', outline: '#2a2622' },
    spawn: { [B.MEADOW]: 3 }, roam: [B.MEADOW, B.FOREST], speed: 14, shy: 26, group: [2, 4], range: 50,
    actions: [{ kind: 'eat', label: 'pastando', item: 'grass', w: 5, dur: [4, 8] }, { kind: 'act', label: 'deitada, descansando', w: 1, dur: [4, 8] }] },
  sparrow: { name: 'Pardal', plan: 'songbird', p: { fur: ['#5a4030', '#85603f', '#aa8458', '#c8a878'], wing: ['#4a3020', '#6a4a2c', '#8a6438', '#a8804e'], belly: ['#bca88a', '#d4c4a8', '#e6dac4', '#f2eadc'], headRamp: ['#6a4a32', '#8a6444', '#a47c52', '#bc9468'], beakColor: '#4a3a2a', beakLen: 1.6, speckle: [6, '#3a2818'] },
    spawn: { [B.MEADOW]: 2.5, [B.FOREST]: 1.5, [B.BEACH]: 0.5 }, roam: [B.MEADOW, B.FOREST, B.BEACH], speed: 26, shy: 42, group: [1, 3], range: 70, hops: true, hopT: 0.14, hopLift: 1, fly: true, flySpeed: 62, alt: 14,
    actions: [{ kind: 'eat', label: 'bicando sementes', item: 'seed', w: 4, dur: [3, 5] }, { kind: 'act', label: 'cantando', w: 2, dur: [2, 4] }] },
  cardinal: { name: 'Cardeal', plan: 'songbird', p: { fur: ['#7a1418', '#b02024', '#d83a3a', '#f06a5a'], wing: ['#6a1014', '#9a1a1c', '#c02a2c', '#d84a44'], belly: ['#b02024', '#d83a3a', '#f05a50', '#ff8a78'], beakColor: '#f08a4a', beakLen: 1.8, crest: '#c02a2c', mask: '#2a1414', tailW: 2 },
    spawn: { [B.FOREST]: 1.5, [B.HUMID]: 1 }, roam: [B.FOREST, B.HUMID, B.MEADOW], speed: 24, shy: 42, group: [1, 2], range: 70, hops: true, hopT: 0.15, hopLift: 1, fly: true, flySpeed: 62, alt: 16,
    actions: [{ kind: 'eat', label: 'comendo frutinhas', item: 'berry', w: 4, dur: [3, 5] }, { kind: 'act', label: 'cantando', w: 2, dur: [2, 4] }] },
  hummingbird: { name: 'Beija-flor', plan: 'songbird', p: { hover: true, fur: ['#1f5a3a', '#2f8a54', '#48b870', '#7fe0a0'], wing: ['#a8c4d0', '#c8dce4', '#e4f0f4', '#ffffff'], belly: ['#d8e0d0', '#e8f0e0', '#f4f8ee', '#ffffff'], beakColor: '#2a2a2a', beakLen: 4, tailW: 1.2, mask: '#c02a4a' },
    spawn: { [B.JUNGLE]: 2, [B.HUMID]: 1, [B.MEADOW]: 0.6 }, roam: [B.JUNGLE, B.HUMID, B.MEADOW, B.FOREST], speed: 38, shy: 26, group: [1, 2], range: 70, fly: true, hover: true, flySpeed: 74, alt: 12,
    actions: [{ kind: 'eat', label: 'bebendo néctar, pairando', w: 4, dur: [3, 5] }, { kind: 'act', label: 'pairando no ar', w: 2, dur: [2, 4] }] },
  snowfinch: { name: 'Pardal-da-neve', plan: 'songbird', p: { fur: AR.white, wing: ['#2a2e38', '#3e4450', '#5a6270', '#7a8494'], belly: ['#dde3ec', '#eef2f8', '#f8faff', '#ffffff'], beakColor: '#e8b84a', beakLen: 1.6 },
    spawn: { [B.SNOW]: 1.5, [B.TUNDRA]: 1.5, [B.ICECAP]: 0.3 }, roam: [B.SNOW, B.TUNDRA, B.ICECAP, B.BEACH], speed: 26, shy: 42, group: [1, 3], range: 70, hops: true, hopT: 0.14, hopLift: 1, fly: true, flySpeed: 60, alt: 14,
    actions: [{ kind: 'eat', label: 'bicando sementes', item: 'seed', w: 4, dur: [3, 5] }, { kind: 'act', label: 'cantando', w: 2, dur: [2, 4] }] },
  deer: { name: 'Cervo', plan: 'quad', scale: 0.6, p: { W: 46, H: 42, bx: 18, brx: 9.5, bry: 5, legLen: 13, legW: 1.8, swing: 4, neck: 9, neckR: 2.5, headR: 3, snoutR: 1.9, fur: AR.deer, belly: ['#c8a07a', '#dcba98', '#ecd4b8', '#f6e8d4'], ear: 'short', tail: 'short', antlers: true, act: 'howl', outline: '#2a1a10' },
    spawn: { [B.FOREST]: 2, [B.HUMID]: 1 }, roam: [B.FOREST, B.HUMID, B.MEADOW], speed: 26, shy: 60, group: [1, 3], range: 90,
    actions: [{ kind: 'eat', label: 'comendo folhas', item: 'leaf', w: 4, dur: [3, 6] }, { kind: 'act', label: 'cabeça erguida, atento', w: 1.5, dur: [2, 4] }] },
  squirrel: { name: 'Esquilo', plan: 'quad', scale: 0.5, p: { W: 28, H: 24, bx: 11, brx: 5, bry: 3.6, legLen: 2.6, legW: 1.8, swing: 2, neck: 1, neckR: 2.2, headR: 2.8, snoutR: 1.4, fur: AR.squirrel, belly: LIGHT_BELLY, ear: 'short', tail: 'curl', sitter: true, act: 'alert', outline: '#3a1c0a' },
    spawn: { [B.FOREST]: 2.5 }, roam: [B.FOREST, B.MEADOW], hops: true, hopT: 0.2, hopLift: 2, speed: 40, shy: 44, group: [1, 1], range: 60,
    actions: [{ kind: 'eat', label: 'roendo uma noz', item: 'nut', w: 4, dur: [3, 6] }, { kind: 'act', label: 'de pé, vigiando', w: 1.5, dur: [2, 4] }] },
  fox: { name: 'Raposa', plan: 'quad', scale: 0.55, p: { W: 40, H: 26, bx: 17, brx: 8.5, bry: 4, legLen: 6.5, legW: 1.8, swing: 3.5, neck: 2.5, neckR: 2.4, headR: 3.2, snoutR: 2.3, fur: AR.fox, legs: ['#1a110c', '#241810', '#33241a', '#44342a'], belly: WHITE_BELLY, snout: ['#e0762c', '#f4a24c', '#f8c888', '#fff4e4'], ear: 'pointy', tail: 'bushy', tailTip: AR.white, act: 'sit', outline: '#2a1208' },
    spawn: { [B.FOREST]: 1, [B.MEADOW]: 0.6 }, roam: [B.FOREST, B.MEADOW, B.HUMID], speed: 32, shy: 56, group: [1, 1], range: 90,
    actions: [{ kind: 'eat', label: 'comendo frutinhas', item: 'berry', w: 3, dur: [3, 5] }, { kind: 'act', label: 'sentada, observando', w: 2, dur: [3, 6] }] },
  frog: { name: 'Sapo', plan: 'frog', scale: 0.65, p: {}, spawn: { [B.HUMID]: 2.5, [B.SWAMP]: 2 }, roam: [B.HUMID, B.SWAMP], speed: 30, shy: 30, group: [1, 2], range: 50, hops: true, hopT: 0.22, hopLift: 2,
    actions: [{ kind: 'eat', label: 'pegando uma mosca', item: 'fly', w: 3, dur: [3, 5] }, { kind: 'act', label: 'coaxando', w: 2, dur: [3, 5] }] },
  snail: { name: 'Caracol', plan: 'snail', scale: 0.6, p: {}, spawn: { [B.HUMID]: 2, [B.FOREST]: 0.5, [B.SWAMP]: 1 }, roam: [B.HUMID, B.FOREST, B.SWAMP], speed: 4, shy: 0, group: [1, 1], range: 30,
    actions: [{ kind: 'eat', label: 'mastigando uma folha', item: 'leaf', w: 4, dur: [4, 8] }, { kind: 'act', label: 'escondido na casca', w: 1.5, dur: [4, 8] }] },
  monkey: { name: 'Macaco', plan: 'quad', scale: 0.55, p: { W: 40, H: 34, bx: 19, brx: 6.5, bry: 5.5, legLen: 6, legW: 2.1, swing: 3, neck: 2, neckR: 3, headR: 3.8, snoutR: 2.2, fur: AR.monkey, snout: AR.skin, belly: ['#7e5434', '#a8743e', '#c8985e', '#dcb078'], ear: 'short', tail: 'curl', sitter: true, act: 'alert', outline: '#1f120a' },
    spawn: { [B.JUNGLE]: 3 }, roam: [B.JUNGLE, B.HUMID], speed: 30, shy: 40, group: [1, 3], range: 70,
    actions: [{ kind: 'eat', label: 'comendo uma banana', item: 'banana', w: 4, dur: [4, 7] }, { kind: 'act', label: 'sentado, observando', w: 1.5, dur: [3, 5] }] },
  macaw: { name: 'Arara', plan: 'bird', scale: 0.55, p: { W: 28, H: 36, bx: 12, brx: 4, bry: 6, legLen: 4, neck: 1.5, headR: 3, beak: 3.6, beakColor: '#e8e0d0', beakCurve: 1.2, beakW: 2, fur: AR.macaw, wing: ['#1a3a8a', '#2a58c0', '#3a7ae0', '#6aa6ff'], tailLen: 6, tailRamp: ['#1a3a8a', '#2a58c0', '#e0c030', '#f0e060'], legColor: '#6a5a4a', act: 'flap', outline: '#2a0a0a' },
    spawn: { [B.JUNGLE]: 2.5 }, roam: [B.JUNGLE, B.HUMID], speed: 22, shy: 44, group: [1, 2], range: 60, fly: true, flySpeed: 50, alt: 15,
    actions: [{ kind: 'eat', label: 'bicando frutinhas', item: 'berry', w: 4, dur: [3, 6] }, { kind: 'act', label: 'batendo as asas', w: 2, dur: [2, 4] }] },
  jaguar: { name: 'Onça', plan: 'quad', scale: 0.58, p: { W: 46, H: 28, bx: 20, brx: 10.5, bry: 4.8, legLen: 6.5, legW: 2.4, swing: 3.5, neck: 3, neckR: 3, headR: 3.8, snoutR: 2.4, fur: AR.jaguar, belly: ['#d9b070', '#e8c690', '#f4dcb0', '#fff0d4'], ear: 'short', tail: 'long', spots: 30, act: 'yawn', outline: '#2a1a08' },
    spawn: { [B.JUNGLE]: 1.2 }, roam: [B.JUNGLE, B.HUMID], speed: 28, shy: 0, group: [1, 1], range: 100,
    actions: [{ kind: 'eat', label: 'devorando carne', item: 'meat', w: 3, dur: [4, 7] }, { kind: 'act', label: 'bocejando', w: 2, dur: [2, 4] }] },
  croc: { name: 'Jacaré', plan: 'croc', scale: 0.6, p: {}, spawn: { [B.SWAMP]: 1.5, [B.BEACH]: 0.5 }, roam: [B.SWAMP, B.BEACH, B.LAKE], minT: 0.55, speed: 14, shy: 0, group: [1, 1], range: 60,
    actions: [{ kind: 'eat', label: 'abocanhando um peixe', item: 'fish', w: 3, dur: [3, 5], needs: 'water' }, { kind: 'act', label: 'tomando sol, de boca aberta', w: 3, dur: [4, 8] }] },
  heron: { name: 'Garça', plan: 'bird', scale: 0.55, p: { W: 34, H: 48, bx: 14, brx: 5, bry: 3.6, legLen: 16, neck: 13, headR: 2.3, beak: 8, beakColor: '#e6b84a', beakW: 1.4, fur: AR.heron, neckRamp: AR.white, belly: AR.white, tailLen: 4, legColor: '#7a6a4a', crest: '#2a3040', act: 'preen', outline: '#1f2a38' },
    spawn: { [B.SWAMP]: 1.5, [B.BEACH]: 0.6 }, roam: [B.LAKE, B.BEACH, B.SWAMP], minT: 0.35, speed: 14, shy: 40, group: [1, 1], range: 60,
    actions: [{ kind: 'eat', label: 'pescando', item: 'fish', w: 4, dur: [3, 6], needs: 'water' }, { kind: 'act', label: 'ajeitando as penas', w: 2, dur: [3, 5] }] },
  camel: { name: 'Camelo', plan: 'quad', scale: 0.55, p: { W: 58, H: 54, bx: 23, brx: 12, bry: 5.5, legLen: 17, legW: 2.4, swing: 4, neck: 12, neckR: 2.8, headR: 3.2, snoutR: 2.4, fur: AR.camel, hump: true, ear: 'short', tail: 'short', act: 'lie', outline: '#3a2610' },
    spawn: { [B.DESERT]: 1.6 }, roam: [B.DESERT], speed: 17, shy: 0, group: [1, 2], range: 110,
    actions: [{ kind: 'eat', label: 'mastigando arbustos secos', item: 'leaf', w: 4, dur: [4, 7] }, { kind: 'act', label: 'deitado, descansando', w: 2, dur: [5, 9] }] },
  lizard: { name: 'Lagarto', plan: 'lizard', scale: 0.6, p: {}, spawn: { [B.DESERT]: 3 }, roam: [B.DESERT, B.BEACH], speed: 38, shy: 40, group: [1, 1], range: 60,
    actions: [{ kind: 'eat', label: 'comendo um inseto', item: 'insect', w: 3, dur: [2, 4] }, { kind: 'act', label: 'fazendo flexões ao sol', w: 3, dur: [3, 6] }] },
  scorpion: { name: 'Escorpião', plan: 'scorpion', scale: 0.6, p: {}, spawn: { [B.DESERT]: 2 }, roam: [B.DESERT], speed: 20, shy: 28, group: [1, 1], range: 50,
    actions: [{ kind: 'eat', label: 'segurando um inseto', item: 'insect', w: 3, dur: [3, 5] }, { kind: 'act', label: 'erguendo o ferrão', w: 2, dur: [2, 4] }] },
  wolf: { name: 'Lobo', plan: 'quad', scale: 0.58, p: { W: 46, H: 30, bx: 20, brx: 10, bry: 4.6, legLen: 8, legW: 2, swing: 4, neck: 3.5, neckR: 2.8, headR: 3.6, snoutR: 2.6, fur: AR.wolf, belly: ['#868c96', '#a0a6b0', '#c0c6d0', '#e0e4ea'], ear: 'pointy', earIn: '#2a2c34', tail: 'bushy', act: 'howl', outline: '#1a1c22' },
    spawn: { [B.SNOW]: 1.5, [B.TUNDRA]: 1 }, roam: [B.SNOW, B.TUNDRA], speed: 32, shy: 0, group: [1, 3], range: 100,
    actions: [{ kind: 'eat', label: 'comendo carne', item: 'meat', w: 3, dur: [4, 6] }, { kind: 'act', label: 'uivando', w: 2, dur: [3, 5] }] },
  reindeer: { name: 'Rena', plan: 'quad', scale: 0.58, p: { W: 46, H: 40, bx: 18, brx: 9.5, bry: 5, legLen: 12, legW: 2, swing: 4, neck: 7, neckR: 2.7, headR: 3.1, snoutR: 2, fur: AR.reindeer, belly: AR.white, ear: 'short', tail: 'short', antlers: true, antlerColor: '#ece0c0', act: 'lie', outline: '#3a3028' },
    spawn: { [B.TUNDRA]: 2, [B.SNOW]: 1 }, roam: [B.TUNDRA, B.SNOW], speed: 24, shy: 56, group: [2, 4], range: 90,
    actions: [{ kind: 'eat', label: 'comendo musgo', item: 'moss', w: 4, dur: [4, 7] }, { kind: 'act', label: 'deitada, descansando', w: 1.5, dur: [5, 9] }] },
  polar: { name: 'Urso-polar', plan: 'quad', scale: 0.5, p: { W: 62, H: 40, bx: 27, brx: 14, bry: 7.5, legLen: 8, legW: 3.8, swing: 3.5, neck: 3.5, neckR: 4, headR: 4.8, snoutR: 3, fur: AR.polar, snout: AR.polar, ear: 'short', tail: 'short', act: 'yawn', outline: '#4a5870' },
    spawn: { [B.ICECAP]: 1, [B.TUNDRA]: 0.3 }, roam: [B.ICECAP, B.TUNDRA, B.BEACH], maxT: 0.33, speed: 18, shy: 0, group: [1, 1], range: 120,
    actions: [{ kind: 'eat', label: 'comendo peixe', item: 'fish', w: 3, dur: [4, 7], needs: 'water' }, { kind: 'act', label: 'bocejando', w: 2, dur: [2, 4] }] },
  arcticFox: { name: 'Raposa-do-ártico', plan: 'quad', scale: 0.55, p: { W: 38, H: 26, bx: 16, brx: 8, bry: 4, legLen: 6, legW: 2, swing: 3.5, neck: 2.5, neckR: 2.4, headR: 3.2, snoutR: 2.2, fur: AR.polar, ear: 'short', tail: 'bushy', act: 'sit', outline: '#4a5870' },
    spawn: { [B.TUNDRA]: 1.5, [B.SNOW]: 0.6, [B.ICECAP]: 0.5 }, roam: [B.TUNDRA, B.SNOW, B.ICECAP], speed: 34, shy: 56, group: [1, 1], range: 90,
    actions: [{ kind: 'eat', label: 'comendo carne', item: 'meat', w: 3, dur: [3, 5] }, { kind: 'act', label: 'sentada, atenta', w: 2, dur: [3, 6] }] },
  seal: { name: 'Foca', plan: 'seal', scale: 0.6, p: {}, spawn: { [B.ICECAP]: 1.2, [B.BEACH]: 0.6 }, roam: [B.ICECAP, B.BEACH], maxT: 0.33, speed: 11, shy: 0, group: [1, 2], range: 40, nearWater: true,
    actions: [{ kind: 'eat', label: 'comendo um peixe', item: 'fish', w: 3, dur: [3, 5] }, { kind: 'act', label: 'erguendo a cabeça', w: 2, dur: [3, 5] }] },
  crab: { name: 'Caranguejo', plan: 'crab', scale: 0.6, p: {}, spawn: { [B.BEACH]: 3 }, roam: [B.BEACH], speed: 24, shy: 30, group: [1, 2], range: 40, sideways: true,
    actions: [{ kind: 'eat', label: 'comendo algas', item: 'moss', w: 3, dur: [3, 5] }, { kind: 'act', label: 'acenando com a garra', w: 2, dur: [2, 4] }] },
  gull: { name: 'Gaivota', plan: 'bird', scale: 0.55, p: { W: 28, H: 24, bx: 12, brx: 6, bry: 3.6, legLen: 5, neck: 1.5, headR: 2.8, beak: 4, beakColor: '#f0c040', beakW: 1.6, fur: AR.white, wing: ['#6a7686', '#8a96a8', '#aab4c4', '#c8d0dc'], tailLen: 4, legColor: '#e8903a', act: 'flap', outline: '#3a4252' },
    spawn: { [B.BEACH]: 2.5 }, roam: [B.BEACH], speed: 26, shy: 36, group: [1, 3], range: 70, fly: true, flySpeed: 56, alt: 18,
    actions: [{ kind: 'eat', label: 'bicando migalhas', item: 'seed', w: 4, dur: [3, 5] }, { kind: 'act', label: 'batendo as asas', w: 2, dur: [2, 3] }] },
  duck: { name: 'Pato', plan: 'bird', scale: 0.55, p: { W: 26, H: 20, bx: 11, brx: 6, bry: 3.8, legLen: 0, neck: 2, headR: 2.8, beak: 3.6, beakColor: '#e8c030', beakW: 1.8, fur: AR.duck, headRamp: AR.green, wing: ['#4a3c2c', '#6a5a44', '#8a7a60', '#aa9a7c'], tailLen: 3, waterline: true, act: 'preen', outline: '#2a2218' },
    spawn: { [B.LAKE]: 1.5 }, roam: [B.LAKE], minT: 0.35, speed: 14, shy: 36, group: [1, 3], range: 50, water: true,
    actions: [{ kind: 'eat', label: 'comendo plantas aquáticas', item: 'leaf', w: 4, dur: [3, 6] }, { kind: 'act', label: 'ajeitando as penas', w: 2, dur: [3, 5] }] },
  fish: { name: 'Peixe', plan: 'fish', scale: 0.8, p: { W: 16, H: 9, fur: AR.silver, belly: ['#a8c4d8', '#c8dce8', '#e0ecf4', '#f6fafc'] }, spawn: { [B.LAKE]: 2.5, [B.SHALLOW]: 1.5 }, roam: [B.LAKE, B.SHALLOW], speed: 16, shy: 0, group: [2, 4], range: 40, water: true, flat: true, jump: 9,
    actions: [{ kind: 'eat', label: 'beliscando algas', item: 'moss', w: 3, dur: [2, 4] }, { kind: 'act', label: 'saltando', w: 1.5, dur: [0.8, 0.8] }] },
  dolphin: { name: 'Golfinho', plan: 'fish', scale: 0.6, p: { W: 38, H: 18, fur: AR.dolphin, belly: ['#d8dee8', '#e4eaf2', '#f0f4f8', '#ffffff'], dorsal: 4, snoutLen: 5 }, spawn: { [B.DEEP]: 0.5 }, roam: [B.DEEP, B.SHALLOW], speed: 26, shy: 0, group: [1, 3], range: 80, water: true, flat: true, jump: 16,
    actions: [{ kind: 'eat', label: 'pegando um peixe', item: 'fish', w: 2, dur: [2, 3] }, { kind: 'act', label: 'saltando', w: 3, dur: [1, 1] }] },
};

/** Animais por ambiente, para o catálogo. */
const ANIMAL_GROUPS = [
  { title: 'Oceano e praia', ids: ['dolphin', 'crab', 'gull'] },
  { title: 'Lagos', ids: ['fish', 'duck'] },
  { title: 'Campo', ids: ['rabbit', 'sheep', 'sparrow'] },
  { title: 'Floresta temperada', ids: ['deer', 'squirrel', 'fox', 'cardinal'] },
  { title: 'Floresta úmida', ids: ['frog', 'snail'] },
  { title: 'Selva', ids: ['monkey', 'macaw', 'jaguar', 'hummingbird'] },
  { title: 'Pântano', ids: ['croc', 'heron'] },
  { title: 'Deserto', ids: ['camel', 'lizard', 'scorpion'] },
  { title: 'Neve, tundra e gelo', ids: ['wolf', 'reindeer', 'arcticFox', 'polar', 'seal', 'snowfinch'] },
];

/** Cache dos quadros desenhados (direita) e espelhados (esquerda). */
class AnimalBank {
  constructor() {
    /** @type {Object<string, {canvas: HTMLCanvasElement, mirror: HTMLCanvasElement|null, mouth: {x: number, y: number}, grid: PixelGrid}>} */
    this.cache = {};
  }

  /** @returns {{canvas: HTMLCanvasElement, mouth: {x: number, y: number}}} */
  get(id, frame, left = false) {
    if (frame.startsWith('fly') && ANIMALS[id].plan !== 'songbird') frame = frame === 'fly0' ? 'act0' : 'act1';
    const key = `${id}:${frame}`;
    let e = this.cache[key];
    if (!e) {
      const def = ANIMALS[id];
      const r = buildAnimalFrame(def, frame);
      e = { canvas: r.g.toCanvas(), mirror: null, mouth: r.mouth || { x: r.g.w - 2, y: 4 }, grid: r.g };
      this.cache[key] = e;
    }
    if (left) {
      if (!e.mirror) e.mirror = e.grid.mirrored().toCanvas();
      return { canvas: e.mirror, mouth: { x: e.grid.w - 1 - e.mouth.x, y: e.mouth.y } };
    }
    return { canvas: e.canvas, mouth: e.mouth };
  }
}
