// Spiellogik des Werts „Gelände“ und des Schaukastens (Spielprinzip „Wege und Außendeko“, 25.11.).
// Gelände = Summe der Punkte aller Außendeko, die draußen (in keinem Raum) steht, höchstens GELAENDE.max.
// Kennt keine Grafik: liefert nur Zahlen und Zustände.
import { GELAENDE, SCHAUKASTEN } from '../inhalte/gelaende.js';
import { MOEBEL } from '../inhalte/moebel.js';
import { erkenneRaeume } from './karte.js';
import { felder } from './moebel.js';

const typVon = art => MOEBEL.find(t => t.id === art) || {};
const draussen = (z, gruppe, m) => felder(m).every(f => gruppe[f.y * z.w + f.x] < 0);

// Wert „Gelände“ und woraus er besteht: teile = [{ art, name, anzahl, punkte }]
export function gelaende(z, gruppe = erkenneRaeume(z).gruppe) {
  const teile = new Map();
  let summe = 0;
  for (const m of z.moebel || []) {
    const typ = typVon(m.art);
    if (!typ.gelaende || !draussen(z, gruppe, m)) continue;
    const t = teile.get(m.art) || { art: m.art, name: typ.name, anzahl: 0, punkte: 0 };
    t.anzahl++; t.punkte += typ.gelaende; summe += typ.gelaende;
    teile.set(m.art, t);
  }
  const wert = Math.min(GELAENDE.max, Math.round(summe * 10) / 10);
  return { wert, summe: Math.round(summe * 10) / 10, max: GELAENDE.max, neugier: wert * GELAENDE.neugierProPunkt, teile: [...teile.values()] };
}

// ---- Schaukasten ----
// Ein Aushang merkt sich ein Kästchen des Raums (zelle) und welche Veranstaltung (platz 0 = Veranstaltung 1).
// Die Einstellungen der Räume stehen in z.veranstaltung für jedes Kästchen des Raums – so übersteht der Aushang Umbauten.
// Er gilt, solange dort eine Veranstaltung eingestellt ist (wird sie auf „Keine“ gestellt oder der Raum abgerissen, gilt er nicht mehr).
export function aushangGilt(z, aushang) {
  if (!aushang) return false;
  const liste = z.veranstaltung && z.veranstaltung[aushang.zelle];
  return Array.isArray(liste) && !!(liste[aushang.platz] && liste[aushang.platz].art);
}
// Welche Veranstaltungen gerade aushängen (jede nur einmal): Schlüssel „Raumnummer:Platz“
export function aushaenge(z, gruppe = erkenneRaeume(z).gruppe) {
  const gesehen = new Map();
  for (const m of z.moebel || []) {
    if (m.art !== 'schaukasten' || !draussen(z, gruppe, m) || !aushangGilt(z, m.aushang)) continue;
    const nr = gruppe[m.aushang.zelle];
    if (nr < 0) continue;
    const k = `${nr}:${m.aushang.platz}`;
    if (!gesehen.has(k)) gesehen.set(k, { raumNr: nr, platz: m.aushang.platz, art: z.veranstaltung[m.aushang.zelle][m.aushang.platz].art });
  }
  return [...gesehen.values()];
}
// Zusätzliche Neugier durch Schaukästen: +10 Prozentpunkte je beworbener Veranstaltung
export function schaukastenNeugier(z, gruppe) { return aushaenge(z, gruppe).length * SCHAUKASTEN.neugier; }

// Aushang setzen (raumZelle = ein Kästchen des Raums, platz = Veranstaltung) oder abnehmen (raumZelle = null)
export function aushangSetzen(z, m, raumZelle, platz) {
  if (!m || m.art !== 'schaukasten') return 'keine';
  if (raumZelle === null) { delete m.aushang; return 'ok'; }
  const a = { zelle: raumZelle, platz };
  if (!aushangGilt(z, a)) return 'keine';
  m.aushang = a;
  return 'ok';
}
