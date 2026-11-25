// Spiellogik der Möbel. Möbel stehen auf freiem Boden des Grundstücks, ein Möbel pro Kästchen.
import { LEER, idx, aufGrundstueck } from './karte.js';
import { MOEBEL } from '../inhalte/moebel.js';
import { kannBezahlen, buchen } from './finanzen.js';
import { NACHKAUFEN } from '../inhalte/kirchkaffee.js';

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
  const weg = z.moebel.filter(m => !(m.x < ax || m.x > bx || m.y < ay || m.y > by));
  z.moebel = z.moebel.filter(m => !weg.includes(m));
  return weg;
}

// Kaufen mit Geld: 'ok', 'geld' (zu wenig Geld) oder 'platz' (dort geht nichts hin)
export function moebelKaufen(z, art, x, y, istBesetzt = () => false) {
  const typ = MOEBEL.find(m => m.id === art) || {}, preis = typ.kosten || 0;
  if (!aufGrundstueck(x, y) || z.zellen[idx(z, x, y)] !== LEER || moebelBei(z, x, y) || istBesetzt(x, y)) return 'platz';
  if (!kannBezahlen(z, preis)) return 'geld';
  const m = { art, x, y };
  if (typeof typ.fassung === 'number') m.fuellung = typ.startFuellung || 0;   // Kaffeemaschine: Füllstand in Tassen
  z.moebel.push(m);
  if (preis) buchen(z, 'ausgaben', 'moebel', preis);
  return 'ok';
}
// Abriss mit voller Rückerstattung
export function moebelAbreissen(z, x0, y0, x1, y1) {
  const weg = moebelEntfernen(z, x0, y0, x1, y1);
  const betrag = weg.reduce((s, m) => s + ((MOEBEL.find(x => x.id === m.art) || {}).kosten || 0), 0);
  if (betrag) buchen(z, 'einnahmen', 'rueckerstattung', betrag);
  return betrag;
}
// Nach dem Bauen: Möbel, über die eine Wand gebaut wurde, verschwinden.
export function moebelPruefen(z) { z.moebel = z.moebel.filter(m => z.zellen[idx(z, m.x, m.y)] === LEER); }

export function moebelImRaum(z, raum, art) {
  const zellen = new Set(raum.zellen);
  return z.moebel.filter(m => m.art === art && zellen.has(idx(z, m.x, m.y)));
}

// Kaffeemaschine nachfüllen: 'ok', 'voll' (passt nicht mehr hinein) oder 'geld'
export function kaffeeNachkaufen(z, maschine) {
  const typ = MOEBEL.find(m => m.id === maschine.art);
  if ((maschine.fuellung || 0) + NACHKAUFEN.tassen > typ.fassung) return 'voll';
  if (!kannBezahlen(z, NACHKAUFEN.preis)) return 'geld';
  maschine.fuellung = (maschine.fuellung || 0) + NACHKAUFEN.tassen;
  buchen(z, 'ausgaben', 'kaffee', NACHKAUFEN.preis);
  return 'ok';
}
export function fassung(art) { return (MOEBEL.find(m => m.id === art) || {}).fassung || 0; }
