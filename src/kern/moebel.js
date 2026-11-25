// Spiellogik der Möbel. Möbel stehen auf freiem Boden des Grundstücks, ein Möbel pro Kästchen.
import { LEER, idx, aufGrundstueck } from './karte.js';

export function moebelAnlegen(z) { if (!Array.isArray(z.moebel)) z.moebel = []; }
export function moebelBei(z, x, y) { return z.moebel.find(m => m.x === x && m.y === y) || null; }

export function moebelSetzen(z, art, x0, y0, x1, y1, istBesetzt = () => false) {
  const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)], [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
  let gesetzt = 0;
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
    if (!aufGrundstueck(x, y) || z.zellen[idx(z, x, y)] !== LEER || moebelBei(z, x, y) || istBesetzt(x, y)) continue;
    z.moebel.push({ art, x, y }); gesetzt++;
  }
  return gesetzt;
}
export function moebelEntfernen(z, x0, y0, x1, y1) {
  const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)], [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
  z.moebel = z.moebel.filter(m => m.x < ax || m.x > bx || m.y < ay || m.y > by);
}
// Nach dem Bauen: Möbel, über die eine Wand gebaut wurde, verschwinden.
export function moebelPruefen(z) { z.moebel = z.moebel.filter(m => z.zellen[idx(z, m.x, m.y)] === LEER); }

export function moebelImRaum(z, raum, art) {
  const zellen = new Set(raum.zellen);
  return z.moebel.filter(m => m.art === art && zellen.has(idx(z, m.x, m.y)));
}
