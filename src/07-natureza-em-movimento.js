/** Quanto cada planta balança: [px no topo com vento 1, expoente (maior = só a copa se move)]. */
const SWAY = {
  tuft: [2, 1.1], tuftDry: [2, 1.1], tuftSnow: [1.5, 1.1], tuftBeach: [2, 1.1], flowers: [2, 1.1], reeds: [2.5, 1.2], fern: [1.8, 1.2], bigLeaf: [1.8, 1.3],
  bush: [1, 1.4], bushWet: [1, 1.4], snowBush: [1, 1.4], dryBush: [1.2, 1.4], oak: [1.1, 2.6], oakWet: [1.1, 2.6], birch: [1.5, 2.2], birchBare: [1.4, 2.2],
  palm: [2.6, 2.0], jungleTree: [1, 2.8], cypress: [1, 2.6], spruce: [1, 2.4], spruceSnow: [0.8, 2.4], spruceSmall: [1.2, 1.8], deadTree: [0.6, 2.8],
};

/** Variações de um sprite "entortadas" pelo vento (a base fica parada e o topo se move), guardadas em cache. */
class SwayBank {
  constructor() { /** @type {WeakMap<HTMLCanvasElement, Map<number, HTMLCanvasElement>>} */ this.map = new WeakMap(); }

  /** @returns {HTMLCanvasElement} o sprite deslocado `level` px no topo (−3 a 3) */
  get(src, level, pow) {
    let m = this.map.get(src);
    if (!m) { m = new Map(); this.map.set(src, m); }
    let c = m.get(level);
    if (!c) {
      const w = src.width, h = src.height;
      c = document.createElement('canvas');
      c.width = w + 6; c.height = h;
      const cx = c.getContext('2d');
      for (let y = 0; y < h; y++) cx.drawImage(src, 0, y, w, 1, 3 + Math.round(level * Math.pow((h - 1 - y) / Math.max(1, h - 1), pow)), y, w, 1);
      m.set(level, c);
    }
    return c;
  }
}

/** Cores das folhas que caem no outono e das pétalas da primavera. */
const LEAF_COLS = ['#d9772b', '#e8a23a', '#b8442a', '#f0c04a'];
const PETAL_COLS = ['#ffffff', '#ffd1e0', '#ffc0d4'];

// ---------------------------------------------------------------------
// Coelhos: apenas diurnos, com ciclo de vida (filhote → jovem → adulto → idoso),
// reprodução, mortes e repovoamento entre tocas ("warrens") do mundo todo.
// ---------------------------------------------------------------------

