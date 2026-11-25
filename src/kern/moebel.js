// Spiellogik der Möbel. Möbel stehen auf freiem Boden des Grundstücks, ein Möbel pro Kästchen.
import { LEER, idx, aufGrundstueck } from './karte.js';
import { MOEBEL, STUHL_STUFEN, MUSIK } from '../inhalte/moebel.js';
import { kannBezahlen, buchen } from './finanzen.js';

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
export function hindernisBei(z, x, y) { const m = moebelBei(z, x, y); return !!m && !typVon(m.art).aussen; }

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
  if (typ.groesse && dreh) m.dreh = true;
  if (typeof typ.fassung === 'number') m.fuellung = typ.startFuellung || 0;   // Kaffeemaschine: Füllstand in Tassen
  z.moebel.push(m);
  if (preis) buchen(z, 'ausgaben', 'moebel', preis, { moebel: art });
  return 'ok';
}
// Was ein Möbel gekostet hat: Kaufpreis, bei Stühlen plus alle Verbesserungen
export function moebelWert(m) {
  const kauf = (MOEBEL.find(x => x.id === m.art) || {}).kosten || 0;
  if (m.art !== 'stuhl') return kauf;
  return kauf + STUHL_STUFEN.filter(s => s.stufe <= (m.stufe || 1)).reduce((a, s) => a + s.upgrade, 0);
}
// Abriss mit voller Rückerstattung (Kauf + Verbesserungen)
export function moebelAbreissen(z, x0, y0, x1, y1) {
  const weg = moebelEntfernen(z, x0, y0, x1, y1);
  const betrag = weg.reduce((s, m) => s + moebelWert(m), 0);
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
// ---- Musik-Level der Ehrenamtlichen ----
// Erfahrung steht an der Person (person.musikErfahrung). Level 0 … MUSIK.maxLevel.
export function musikLevel(person) {
  return Math.min(MUSIK.maxLevel, Math.floor(((person && person.musikErfahrung) || 0) / MUSIK.erfahrungProLevel));
}
// Bonus des Lobpreisteams bei diesem Level (0.05 = 5 %), auf ganze Prozent gerundet
export function musikBonus(level) { return Math.round((MUSIK.start + MUSIK.proLevel * level) * 100) / 100; }
// Nach einem Auftritt: etwas Erfahrung dazu (beim höchsten Level bleibt es stehen)
export function musikErfahrungDazu(person) {
  const max = MUSIK.maxLevel * MUSIK.erfahrungProLevel;
  person.musikErfahrung = Math.min(max, (person.musikErfahrung || 0) + MUSIK.erfahrungProAuftritt);
}
// Stand fürs Anzeigen (Karte des Ehrenamtlichen): Level und Fortschritt bis zum nächsten Level (0 … 1)
export function musikStand(person) {
  const level = musikLevel(person), e = (person && person.musikErfahrung) || 0;
  const fortschritt = level >= MUSIK.maxLevel ? 1 : (e - level * MUSIK.erfahrungProLevel) / MUSIK.erfahrungProLevel;
  return { level, maxLevel: MUSIK.maxLevel, fortschritt };
}

// Was die Möbel eines Raums bewirken. musikerLevel = Musik-Level des Ehrenamtlichen, der die Gitarre spielt (null = keiner).
// haltung: + pro Besucher und Gottesdienst; faktor: Kollekte × (Altar, Grünpflanzen, Lobpreisteam)
// musikBonus: Lobpreisteam bringt Kollekte × (1 + musikBonus) und Haltung + musikBonus × aktuelle Haltung
export function raumAusstattung(z, raum, musikerLevel = null) {
  let haltung = 0, faktor = 1, gitarre = false;
  const teile = [];
  for (const typ of MOEBEL.filter(m => m.wirkung)) {
    const anzahl = Math.min(typ.max || Infinity, moebelImRaum(z, raum, typ.id).length);
    if (!anzahl) continue;
    if (typ.wirkung.haltung) haltung += typ.wirkung.haltung * anzahl;
    if (typ.wirkung.kollekte) faktor *= typ.wirkung.kollekte ** anzahl;
    if (typ.wirkung.musik) gitarre = true;
    teile.push({ id: typ.id, name: typ.name, anzahl, max: typ.max || null,
      haltung: (typ.wirkung.haltung || 0) * anzahl, kollekte: typ.wirkung.kollekte ? typ.wirkung.kollekte ** anzahl : null });
  }
  const musik = gitarre && musikerLevel !== null && musikerLevel !== false;
  const bonus = musik ? musikBonus(musikerLevel) : 0;
  if (musik) faktor *= 1 + bonus;
  return { haltung, faktor, gitarre, musik, musikLevel: musik ? musikerLevel : null, musikBonus: bonus, teile };
}
