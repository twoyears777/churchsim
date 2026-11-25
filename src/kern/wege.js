// Wegsuche auf dem Raster: kürzester Weg um Wände und Möbel herum (Türen sind offen).
import { WAND, FENSTER, idx, aufGrundstueck } from './karte.js';
import { GRUNDSTUECK } from '../inhalte/umgebung.js';

// Der Zaun: zwischen Grundstück und draußen kommt man nur durch das Tor (unten).
function durchZaun(x, y, nx, ny) {
  if (aufGrundstueck(x, y) === aufGrundstueck(nx, ny)) return true;
  if (x !== nx && y !== ny) return false;          // schräg über den Zaun geht nicht
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
      if (vorher[j] !== -1 || z.zellen[j] === WAND || z.zellen[j] === FENSTER || !durchZaun(x, y, nx, ny) || (j !== e && blockiert(nx, ny))) continue;
      vorher[j] = i; schlange.push(j);
    }
  }
  if (vorher[e] === -1) return null;
  const pfad = [];
  for (let i = e; i !== s; i = vorher[i]) pfad.push({ x: i % z.w, y: (i / z.w) | 0 });
  pfad.push({ x: start.x, y: start.y });
  return pfad.reverse();
}

// Weg glätten: Statt Kästchen für Kästchen (eckig) gehen Figuren direkt auf den am weitesten
// entfernten Punkt zu, den sie ohne Hindernis erreichen – das wirkt natürlich und schräg.
export function glaetten(z, pfad, blockiert = () => false) {
  if (!pfad || pfad.length < 3) return pfad;
  const ziel = pfad[pfad.length - 1];
  const frei = (a, b) => {
    const schritte = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4);
    let vx = a.x, vy = a.y;
    for (let i = 1; i <= schritte; i++) {
      const t = i / schritte, px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t;
      // etwas „Körperbreite“ prüfen, damit niemand durch Wandecken schlüpft
      for (const [ox, oy] of [[0, 0], [0.3, 0.3], [-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3]]) {
        const cx = Math.round(px + ox), cy = Math.round(py + oy);
        if (cx < 0 || cy < 0 || cx >= z.w || cy >= z.h) return false;
        if (z.zellen[idx(z, cx, cy)] === WAND || z.zellen[idx(z, cx, cy)] === FENSTER) return false;
        const amEnde = (cx === b.x && cy === b.y) || (cx === a.x && cy === a.y);
        if (!amEnde && blockiert(cx, cy)) return false;
      }
      const nx = Math.round(px), ny = Math.round(py);
      if ((nx !== vx || ny !== vy) && !durchZaun(vx, vy, nx, ny)) return false;
      vx = nx; vy = ny;
    }
    return true;
  };
  const ergebnis = [pfad[0]];
  let i = 0;
  while (i < pfad.length - 1) {
    let j = pfad.length - 1;
    while (j > i + 1 && !frei(pfad[i], pfad[j])) j--;
    ergebnis.push(pfad[j]); i = j;
  }
  if (ergebnis[ergebnis.length - 1] !== ziel) ergebnis.push(ziel);
  return ergebnis;
}
