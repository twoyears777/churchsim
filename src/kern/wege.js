// Wegsuche auf dem Raster: kürzester Weg um Wände und Möbel herum (Türen sind offen).
import { WAND, idx, aufGrundstueck } from './karte.js';
import { GRUNDSTUECK } from '../inhalte/umgebung.js';

// Der Zaun: zwischen Grundstück und draußen kommt man nur durch das Tor (unten).
function durchZaun(x, y, nx, ny) {
  if (aufGrundstueck(x, y) === aufGrundstueck(nx, ny)) return true;
  const g = GRUNDSTUECK, unten = g.y + g.h - 1;
  return x === nx && x >= g.tor.x && x < g.tor.x + g.tor.breite && Math.min(y, ny) === unten;
}

export function weg(z, start, ziel, blockiert = () => false) {
  const n = z.w * z.h, vorher = new Int32Array(n).fill(-1), s = idx(z, start.x, start.y), e = idx(z, ziel.x, ziel.y);
  const schlange = [s]; vorher[s] = s;
  for (let k = 0; k < schlange.length; k++) {
    const i = schlange[k];
    if (i === e) break;
    const x = i % z.w, y = (i / z.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= z.w || ny >= z.h) continue;
      const j = idx(z, nx, ny);
      if (vorher[j] !== -1 || z.zellen[j] === WAND || !durchZaun(x, y, nx, ny) || (j !== e && blockiert(nx, ny))) continue;
      vorher[j] = i; schlange.push(j);
    }
  }
  if (vorher[e] === -1) return null;
  const pfad = [];
  for (let i = e; i !== s; i = vorher[i]) pfad.push({ x: i % z.w, y: (i / z.w) | 0 });
  pfad.push({ x: start.x, y: start.y });
  return pfad.reverse();
}
