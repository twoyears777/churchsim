// Spiellogik der Möbel. Möbel stehen auf freiem Boden des Grundstücks, ein Möbel pro Kästchen.
import { LEER, idx, aufGrundstueck, fensterAnRaum } from './karte.js';
import { FENSTER } from '../inhalte/bau.js';
import { MOEBEL, STUHL_STUFEN, MUSIK } from '../inhalte/moebel.js';
import { kannBezahlen, buchen } from './finanzen.js';
import { musikBonus } from './skills.js';
import { AUTOMATEN } from '../inhalte/automaten.js';
import { abrissWert } from './abriss.js';

export function moebelAnlegen(z) { if (!Array.isArray(z.moebel)) z.moebel = []; }
const typVon = art => MOEBEL.find(t => t.id === art) || {};
// Welche Kästchen ein Möbel belegt: meist 1, der Parkplatz 2 (dreh = längs statt quer)
export function felderVon(art, x, y, dreh = false) {
  const [a, b] = typVon(art).groesse || [1, 1], [w, h] = dreh ? [b, a] : [a, b], f = [];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) f.push({ x: x + dx, y: y + dy });
  return f;
}
export const felder = m => felderVon(m.art, m.x, m.y, !!m.dreh);
export function moebelBei(z, x, y) {
  return z.moebel.find(m => m.x === x && m.y === y) || z.moebel.find(m => typVon(m.art).groesse && felder(m).some(f => f.x === x && f.y === y)) || null;
}
// Steht hier etwas, um das Figuren herumlaufen müssen? (Über Straße und Parkplatz kann man laufen.)
// Außendeko wie Busch, Baum oder Bank ist ein Hindernis (hindernis: true); über Straße, Parkplatz und Weg läuft man.
export const istHindernis = art => { const t = typVon(art); return !t.aussen || !!t.hindernis; };
export function hindernisBei(z, x, y) { const m = moebelBei(z, x, y); return !!m && istHindernis(m.art); }

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
  const weg = z.moebel.filter(m => felder(m).some(f => !(f.x < ax || f.x > bx || f.y < ay || f.y > by)));
  z.moebel = z.moebel.filter(m => !weg.includes(m));
  return weg;
}

// Kaufen mit Geld: 'ok', 'geld' (zu wenig Geld) oder 'platz' (dort geht nichts hin)
export function moebelKaufen(z, art, x, y, istBesetzt = () => false, dreh = false) {
  const typ = MOEBEL.find(m => m.id === art) || {}, preis = typ.kosten || 0;
  if (!felderVon(art, x, y, dreh).every(f => aufGrundstueck(f.x, f.y) && z.zellen[idx(z, f.x, f.y)] === LEER && !moebelBei(z, f.x, f.y) && !istBesetzt(f.x, f.y))) return 'platz';
  if (!kannBezahlen(z, preis)) return 'geld';
  const m = { art, x, y };
  if (typeof z.minuten === 'number') m.gebaut = z.minuten;   // Bauzeit: daraus wird der Abriss-Wert berechnet (abriss.js)
  if (typ.groesse && dreh) m.dreh = true;
  if (typeof typ.fassung === 'number') m.fuellung = typ.startFuellung || 0;   // Kaffeemaschine: Füllstand in Tassen
  if (typ.automat) m.fuellung = 0;                                           // Automat: kommt leer, der Ehrenamtliche füllt ihn auf
  z.moebel.push(m);
  if (preis) buchen(z, 'ausgaben', 'moebel', preis, { moebel: art });
  return 'ok';
}
// Was ein Möbel gekostet hat: Kaufpreis, bei Stühlen plus alle Verbesserungen
export function moebelWert(m) {
  const kauf = (MOEBEL.find(x => x.id === m.art) || {}).kosten || 0;
  const automat = AUTOMATEN.find(a => a.id === m.art);   // Automaten: später verbesserbar wie Stühle
  if (automat) return kauf + automat.stufen.filter(s => s.stufe <= (m.stufe || 1)).reduce((a, s) => a + s.upgrade, 0);
  if (m.art !== 'stuhl') return kauf;
  return kauf + STUHL_STUFEN.filter(s => s.stufe <= (m.stufe || 1)).reduce((a, s) => a + s.upgrade, 0);
}
// Abriss (27.11.): zurück gibt es den Abriss-Wert von Kauf + Verbesserungen – anfangs die Hälfte, jede Woche weniger (abriss.js).
// Verbesserungen zählen mit dem Alter des Möbels.
export function moebelAbreissen(z, x0, y0, x1, y1) {
  const weg = moebelEntfernen(z, x0, y0, x1, y1);
  const betrag = Math.round(weg.reduce((s, m) => s + abrissWert(z, moebelWert(m), m.gebaut), 0) * 100) / 100;
  if (betrag) buchen(z, 'einnahmen', 'rueckerstattung', betrag, { was: 'abriss' });
  return betrag;
}
// Nach dem Bauen: Möbel, über die eine Wand gebaut wurde, verschwinden.
export function moebelPruefen(z) { z.moebel = z.moebel.filter(m => felder(m).every(f => z.zellen[idx(z, f.x, f.y)] === LEER)); }

export function moebelImRaum(z, raum, art) {
  const zellen = new Set(raum.zellen);
  return z.moebel.filter(m => m.art === art && zellen.has(idx(z, m.x, m.y)));
}

// Kaffeemaschine: Nachfüllen macht seit 25.11. der Ehrenamtliche (Einkauf im Laden, siehe kirchkaffee.js).
export function fassung(art) { return (MOEBEL.find(m => m.id === art) || {}).fassung || 0; }

// ---- Stühle verbessern ----
export function stuhlStufe(m) { return STUHL_STUFEN[Math.min(STUHL_STUFEN.length, m && m.stufe || 1) - 1]; }
export function naechsteStufe(m) { return STUHL_STUFEN[(m.stufe || 1)] || null; }
// Einen Stuhl eine Stufe höher: 'ok', 'max' (schon höchste Stufe) oder 'geld'
export function stuhlVerbessern(z, m) {
  const n = naechsteStufe(m);
  if (!n) return 'max';
  if (!kannBezahlen(z, n.upgrade)) return 'geld';
  m.stufe = n.stufe;
  buchen(z, 'ausgaben', 'moebel', n.upgrade, { moebel: 'stuhl', was: 'verbessern' });
  return 'ok';
}
// Alle Stühle eines Raums je eine Stufe höher (nur, wenn das Geld für alle reicht)
export function stuehleImRaum(z, raum) { return moebelImRaum(z, raum, 'stuhl').filter(m => naechsteStufe(m)); }
export function alleVerbessernPreis(z, raum) { return stuehleImRaum(z, raum).reduce((a, m) => a + naechsteStufe(m).upgrade, 0); }
export function alleVerbessern(z, raum) {
  const liste = stuehleImRaum(z, raum);
  if (!liste.length) return 'max';
  if (!kannBezahlen(z, alleVerbessernPreis(z, raum))) return 'geld';
  for (const m of liste) stuhlVerbessern(z, m);
  return 'ok';
}

// ---- Ausstattung des Gottesdienstraums ----
// Steht in diesem Raum schon die Höchstzahl dieses Möbels? (z. B. 1 Kanzel, 4 Blumen)
export function grenzeErreicht(z, raum, art) {
  const typ = MOEBEL.find(m => m.id === art);
  return !!(raum && typ && typ.max && moebelImRaum(z, raum, art).length >= typ.max);
}
// Musik-Level der Ehrenamtlichen: steht seit 26.11. mit allen anderen Skills in skills.js

// Instrumente (Möbel mit wirkung.musik), die im Raum stehen – jedes zählt höchstens so oft wie sein max
export function instrumenteImRaum(z, raum) {
  return MOEBEL.filter(m => m.wirkung && m.wirkung.musik).reduce((n, m) => n + Math.min(m.max || Infinity, moebelImRaum(z, raum, m.id).length), 0);
}

// Was die Möbel eines Raums bewirken. musikerLevels = Musik-Level der Ehrenamtlichen, die ein Instrument spielen
// (Liste; eine einzelne Zahl = ein Musiker; null/leer = keiner). Es zählen höchstens so viele Musiker wie Instrumente.
// haltung: + pro Besucher und Gottesdienst; faktor: Kollekte × (Altar, Grünpflanzen, Lobpreisteam)
// musikBonus: Summe der Boni aller Musiker; Lobpreisteam bringt Kollekte × (1 + musikBonus) und Haltung + musikBonus × aktuelle Haltung
export function raumAusstattung(z, raum, musikerLevels = null) {
  let haltung = 0, faktor = 1, instrumente = 0;
  const teile = [];
  for (const typ of MOEBEL.filter(m => m.wirkung)) {
    const anzahl = Math.min(typ.max || Infinity, moebelImRaum(z, raum, typ.id).length);
    if (!anzahl) continue;
    if (typ.wirkung.haltung) haltung += typ.wirkung.haltung * anzahl;
    if (typ.wirkung.kollekte) faktor *= typ.wirkung.kollekte ** anzahl;
    if (typ.wirkung.musik) instrumente += anzahl;
    teile.push({ id: typ.id, name: typ.name, anzahl, max: typ.max || null,
      haltung: (typ.wirkung.haltung || 0) * anzahl, kollekte: typ.wirkung.kollekte ? typ.wirkung.kollekte ** anzahl : null });
  }
  // Fenster (25.11.): + Haltung je Fenster in den Wänden des Raums, ohne Obergrenze
  const fenster = raum && raum.zellen ? fensterAnRaum(z, raum) : 0;
  if (fenster) { haltung += FENSTER.haltung * fenster; teile.push({ id: 'fenster', name: FENSTER.name, anzahl: fenster, max: null, haltung: FENSTER.haltung * fenster, kollekte: null }); }
  const levels = (musikerLevels === null || musikerLevels === false ? [] : [].concat(musikerLevels)).slice(0, instrumente);
  const musik = levels.length > 0;
  const bonus = Math.round(levels.reduce((s, l) => s + musikBonus(l), 0) * 100) / 100;
  if (musik) faktor *= 1 + bonus;
  return { haltung, faktor, instrument: instrumente > 0, instrumente, musik, musiker: levels.length, musikBonus: bonus, teile };
}
