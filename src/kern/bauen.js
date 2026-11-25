// Bauen mit Rücksicht auf Möbel: Wände werden nicht über Möbel gebaut (nichts wird aus Versehen ersetzt).
import { GRUNDSTUECK } from '../inhalte/umgebung.js';
import { wandRechteck } from './karte.js';
import { moebelBei } from './moebel.js';

// Welche Kästchen der geplanten Wand sind von Möbeln belegt?
export function wandKonflikte(z, x0, y0, x1, y1) {
  const g = GRUNDSTUECK, k = (v, a, b) => Math.max(a, Math.min(b, v));
  x0 = k(x0, g.x, g.x + g.w - 1); x1 = k(x1, g.x, g.x + g.w - 1); y0 = k(y0, g.y, g.y + g.h - 1); y1 = k(y1, g.y, g.y + g.h - 1);
  const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)], [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
  const konflikte = [];
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++)
    if ((x === ax || x === bx || y === ay || y === by) && moebelBei(z, x, y)) konflikte.push({ x, y });
  return konflikte;
}
export function wandBauen(z, x0, y0, x1, y1) {
  if (wandKonflikte(z, x0, y0, x1, y1).length) return false;
  wandRechteck(z, x0, y0, x1, y1);
  return true;
}
