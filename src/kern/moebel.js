// Spiellogik der Möbel. Möbel stehen auf freiem Boden des Grundstücks, ein Möbel pro Kästchen.
import { LEER, idx, aufGrundstueck, fensterAnRaum } from './karte.js';
import { FENSTER } from '../inhalte/bau.js';
import { MOEBEL, STUHL_STUFEN, MUSIK, TON, BUEHNE, TONRACK } from '../inhalte/moebel.js';
import { istBuehne, buehneImRaum } from './buehne.js';
import { kannBezahlen, buchen } from './finanzen.js';
import { musikBonus } from './skills.js';
import { AUTOMATEN } from '../inhalte/automaten.js';
import { abrissWert } from './abriss.js';
import { gemerkt } from './durchgang.js';

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
  return gemerkt(z, 'moebelVerzeichnis', () => moebelVerzeichnis(z))(x, y);
}
// Verzeichnis „Kästchen → Möbel“ (Leistung, 27.11.): statt bei jeder Frage alle Möbel durchzugehen, einmal pro Durchgang
// aufschreiben. Ergebnis wie bisher: zuerst ein Möbel, das genau auf dem Kästchen steht, sonst ein großes, das es mit belegt.
const fach = (x, y) => `${x},${y}`;
function moebelVerzeichnis(z) {
  const genau = new Map(), gross = new Map();
  for (const m of z.moebel) {
    const k = fach(m.x, m.y);
    if (!genau.has(k)) genau.set(k, m);
    if (typVon(m.art).groesse) for (const f of felder(m)) { const kf = fach(f.x, f.y); if (!gross.has(kf)) gross.set(kf, m); }
  }
  return (x, y) => { const k = fach(x, y); return genau.get(k) || gross.get(k) || null; };
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
// Was ein Möbel gekostet hat: Kaufpreis plus alle Verbesserungen (Stufen) plus, beim Tontechnikrack, alles darin Eingebaute
export function moebelWert(m) {
  const kauf = (MOEBEL.find(x => x.id === m.art) || {}).kosten || 0;
  const stufen = stufenVon(m.art) || [];
  return kauf + stufen.filter(s => s.stufe <= (m.stufe || 1)).reduce((a, s) => a + s.upgrade, 0) + rackWert(m);
}

// ---- Stufen aller Möbel (27.11.: Stühle, Automaten, Kaffeemaschine, Ton-Technik, Instrumente) ----
// Die Stufen stehen beim Möbel (inhalte/moebel.js → stufen, Automaten in inhalte/automaten.js, Stühle STUHL_STUFEN).
// Gespeichert wird nur m.stufe (fehlt = Stufe 1).
export function stufenVon(art) {
  if (art === 'stuhl') return STUHL_STUFEN;
  const a = AUTOMATEN.find(x => x.id === art);
  if (a) return a.stufen;
  return typVon(art).stufen || null;
}
export const istVerbesserbar = art => (stufenVon(art) || []).length > 1;
export function stufeVon(m) { const s = stufenVon(m.art); return s ? s[Math.min(s.length, m.stufe || 1) - 1] : null; }
export function naechsteStufeVon(m) { const s = stufenVon(m.art); return s && s.length > (m.stufe || 1) ? s[m.stufe || 1] : null; }
// Ein Möbel eine Stufe höher: 'ok', 'max' oder 'geld'
export function moebelVerbessern(z, m) {
  const n = naechsteStufeVon(m);
  if (!n) return 'max';
  if (!kannBezahlen(z, n.upgrade)) return 'geld';
  m.stufe = n.stufe;
  buchen(z, 'ausgaben', 'moebel', n.upgrade, { moebel: m.art, was: 'verbessern' });
  return 'ok';
}
// Alle Möbel dieser Art im Raum, die noch höher können, und was es zusammen kostet
export const verbesserbareImRaum = (z, raum, art) => moebelImRaum(z, raum, art).filter(m => naechsteStufeVon(m));
export const alleVerbessernPreisArt = (z, raum, art) => verbesserbareImRaum(z, raum, art).reduce((a, m) => a + naechsteStufeVon(m).upgrade, 0);
export function alleArtVerbessern(z, raum, art) {
  const liste = verbesserbareImRaum(z, raum, art);
  if (!liste.length) return 'max';
  if (!kannBezahlen(z, alleVerbessernPreisArt(z, raum, art))) return 'geld';
  for (const m of liste) moebelVerbessern(z, m);
  return 'ok';
}
// Fassung einer Maschine (Kaffeemaschine je Stufe, Sandwichmaker fest) und wie lange sie für eine Tasse braucht
export function fassungVon(m) { const st = stufeVon(m); return st && typeof st.fassung === 'number' ? st.fassung : fassung(m.art); }
export function ladenVon(m, grund) { const st = stufeVon(m); return st && typeof st.laden === 'number' ? st.laden : grund; }

// ---- Tontechnikrack (27.11.): m.rack = { inear: Stufe (0 = keins), controller: Stufe, plugins: [ids] } ----
export function rackVon(m) {
  const r = m && m.rack || {};
  return { inear: r.inear || 0, controller: r.controller || 0, plugins: Array.isArray(r.plugins) ? r.plugins.filter(id => TONRACK.plugins.some(p => p.id === id)) : [] };
}
function rackWert(m) {
  if (m.art !== 'tonrack' || !m.rack) return 0;
  const r = rackVon(m);
  return TONRACK.inear.slice(0, r.inear).reduce((a, s) => a + s.preis, 0) + TONRACK.controller.slice(0, r.controller).reduce((a, s) => a + s.preis, 0)
    + TONRACK.plugins.filter(p => r.plugins.includes(p.id)).reduce((a, p) => a + p.preis, 0);
}
// Etwas ins Rack einbauen. modul: 'inear' | 'controller' (nächste Stufe) | 'plugin' (id) → 'ok' | 'max' | 'pult' | 'geld' | 'keine'
// pultStufe: Stufe des Tontechnikpults im Raum (0 = keins)
export function rackEinbauen(z, m, modul, id, pultStufe) {
  if (!m || m.art !== 'tonrack') return 'keine';
  const r = rackVon(m);
  let preis, tun;
  if (modul === 'inear' || modul === 'controller') {
    const n = TONRACK[modul][r[modul]];
    if (!n) return 'max';
    if (n.pult && pultStufe < n.pult) return 'pult';
    preis = n.preis; tun = () => { r[modul] = n.stufe; };
  } else if (modul === 'plugin') {
    const p = TONRACK.plugins.find(x => x.id === id);
    if (!p) return 'keine';
    if (r.plugins.includes(p.id)) return 'max';
    if (pultStufe < TONRACK.pluginsAbPult) return 'pult';
    preis = p.preis; tun = () => { r.plugins.push(p.id); };
  } else return 'keine';
  if (!kannBezahlen(z, preis)) return 'geld';
  tun(); m.rack = r;
  buchen(z, 'ausgaben', 'tonrack', preis, { moebel: 'tonrack', modul, id: id || null });
  return 'ok';
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

// Kästchen eines Raums als schnelle Nachschlage-Liste, einmal je Raum gemerkt (Leistung, 27.11.)
const raumZellen = new WeakMap();
function zellenVon(raum) {
  let s = raumZellen.get(raum.zellen);
  if (!s) raumZellen.set(raum.zellen, s = new Set(raum.zellen));
  return s;
}
export function moebelImRaum(z, raum, art) {
  const zellen = zellenVon(raum);
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
  let haltung = 0, faktor = 1;
  const teile = [];
  for (const typ of MOEBEL.filter(m => m.wirkung && !m.wirkung.musik)) {
    const w = moebelWirkung(z, raum, typ);
    if (!w.anzahl) continue;
    haltung += w.haltung; faktor *= w.kollekte;
    teile.push({ id: typ.id, name: typ.name, anzahl: w.anzahl, max: typ.max || null, aufBuehne: w.aufBuehne,
      haltung: w.haltung, kollekte: typ.wirkung.kollekte ? w.kollekte : null });
  }
  // Fenster (25.11.): + Haltung je Fenster in den Wänden des Raums, ohne Obergrenze
  const fenster = raum && raum.zellen ? fensterAnRaum(z, raum) : 0;
  if (fenster) { haltung += FENSTER.haltung * fenster; teile.push({ id: 'fenster', name: FENSTER.name, anzahl: fenster, max: null, haltung: FENSTER.haltung * fenster, kollekte: null }); }
  // Lobpreisteam: höchstes Musik-Level ans erste Instrument der Reihe (wie musiker.js); steht es auf der Bühne, Bonus × BUEHNE.bonus
  const reihe = instrumenteReihe(z, raum);
  const levels = (musikerLevels === null || musikerLevels === false ? [] : [].concat(musikerLevels)).slice().sort((a, b) => b - a).slice(0, reihe.length);
  const musik = levels.length > 0;
  const bonus = musikerBonusSumme(levels, reihe);
  if (musik) faktor *= 1 + bonus;
  // Bühne (27.11.): + Kollekte pro Besucher je Kachel, fest dazu (nicht × Altar usw.)
  const buehne = buehneImRaum(z, raum);
  return { haltung, faktor, instrument: reihe.length > 0, instrumente: reihe.length, musik, musiker: levels.length, musikBonus: bonus, teile,
    buehne, buehneGeld: Math.round(buehne * BUEHNE.kollekteProKachel * 100) / 100 };
}
// Was ein Möbeltyp in diesem Raum bringt (höchstens typ.max Stück). Auf der Bühne zählt der Bonus × BUEHNE.bonus:
// Haltung +2 → +3, Kollekte ×1,2 → ×1,3. → { anzahl, aufBuehne, haltung (Summe), kollekte (Faktor zusammen) }
export function moebelWirkung(z, raum, typ) {
  const stuecke = moebelImRaum(z, raum, typ.id).slice(0, typ.max || Infinity);
  const auf = stuecke.filter(m => istBuehne(z, m.x, m.y)).length, normal = stuecke.length - auf;
  const h = typ.wirkung.haltung || 0, k = typ.wirkung.kollekte || 1;
  return { anzahl: stuecke.length, aufBuehne: auf,
    haltung: h * normal + h * BUEHNE.bonus * auf,
    kollekte: k ** normal * (1 + (k - 1) * BUEHNE.bonus) ** auf };
}
// Instrumente des Raums in der festen Reihenfolge der Möbelliste (wie musiker.js):
// { buehne: steht auf der Bühne, plus: Bonus aus der Stufe des Instruments (27.11.), art }
export function instrumenteReihe(z, raum) {
  return MOEBEL.filter(m => m.wirkung && m.wirkung.musik).flatMap(m => moebelImRaum(z, raum, m.id).slice(0, m.max || Infinity))
    .map(m => ({ buehne: istBuehne(z, m.x, m.y), plus: (stufeVon(m) || {}).musik || 0, art: m.art }));
}
// Bonus eines Musikers mit diesem Level an diesem Instrument: (Musik-Bonus + Instrument-Stufe) × Bühne
export const musikerBonus = (level, platz) => (musikBonus(level) + (platz ? platz.plus : 0)) * (platz && platz.buehne ? BUEHNE.bonus : 1);
// Summe aller Musiker: höchstes Level ans erste Instrument der Reihe
export const musikerBonusSumme = (levels, reihe) => Math.round(levels.reduce((s, l, i) => s + musikerBonus(l, reihe[i]), 0) * 10000) / 10000;

// ---- Ton-Technik (Lukas, 27.11.; Spielprinzip claude/spielprinzip-tontechnik.md) ----
// Was an Ton-Technik im Raum steht: Lautsprecher (ihre Plätze zählen zusammen, egal wo sie stehen), Subwoofer, Pult, Rack.
// Seit den Stufen (27.11.) zählt jedes Stück mit den Werten seiner Stufe; das Rack kann die Lautsprecher weiter reichen lassen.
const tonStuecke = (z, raum, id) => { const t = typVon(id); return moebelImRaum(z, raum, id).slice(0, t.max || Infinity); };
export function tonImRaum(z, raum) {
  const ls = tonStuecke(z, raum, 'lautsprecher'), sw = tonStuecke(z, raum, 'subwoofer'), pult = tonStuecke(z, raum, 'tonpult')[0] || null;
  const rackM = tonStuecke(z, raum, 'tonrack')[0] || null, rack = rackM ? rackVon(rackM) : null;
  const lsPlaetze = ls.reduce((a, m) => a + stufeVon(m).plaetze, 0);
  const abdeckung = rack && rack.controller ? TONRACK.controller[rack.controller - 1].abdeckung : 1;
  return { lautsprecher: ls.length, lautsprecherPlaetze: lsPlaetze, plaetze: Math.floor(lsPlaetze * abdeckung), abdeckung,
    subwoofer: sw.length, subwooferBonus: Math.round(sw.reduce((a, m) => a + stufeVon(m).bonus, 0) * 1000) / 1000,
    pult: !!pult, pultStufe: pult ? stufeVon(pult).stufe : 0, pultBonus: pult ? stufeVon(pult).bonus : 0,
    rack: !!rackM, rackStufen: rack, mikrofon: moebelImRaum(z, raum, 'mikrofon').length > 0 };
}
// Was das Rack zum Bonus beiträgt, bei so vielen spielenden Musikern → { inear, plugins }
export function rackBonus(t, musiker) {
  const r = t.rackStufen;
  if (!r) return { inear: 0, plugins: 0 };
  const ie = r.inear ? TONRACK.inear[r.inear - 1] : null;
  const inear = ie ? ie.plus * Math.min(ie.musiker, musiker) : 0;
  const plugins = t.pultStufe >= TONRACK.pluginsAbPult ? TONRACK.plugins.filter(p => r.plugins.includes(p.id) && (!p.mikrofon || (t.mikrofon && musiker > 0)))
    .reduce((a, p) => a + p.bonus, 0) : 0;
  return { inear: Math.round(inear * 1000) / 1000, plugins: Math.round(plugins * 1000) / 1000 };
}
// Ton-Technik einer Veranstaltung. techniker = eingeteilter Tontechniker (oder null), level = sein Tontechnik-Level,
// musiker = so viele Musiker spielen (für In-Ear und Auto-Tune im Rack).
// aktiv nur mit Pult + Lautsprecher + Tontechniker. bonus = voller Bonus (0.05 = 5 %), bevor die Abdeckung (plaetze) eingerechnet wird.
// teile: woraus der Bonus besteht (für Rack-Fenster und Bausteintabelle).
export function tonWirkung(z, raum, techniker, level, musiker = 0) {
  const t = tonImRaum(z, raum), aktiv = !!(t.pult && t.lautsprecher && techniker);
  const rb = rackBonus(t, musiker);
  const teile = { grund: TON.start, level: TON.proLevel * (techniker ? level : 0), subwoofer: t.subwooferBonus, pult: t.pultBonus, inear: rb.inear, plugins: rb.plugins };
  const bonus = aktiv ? Math.round(Object.values(teile).reduce((a, b) => a + b, 0) * 1000) / 1000 : 0;
  return { ...t, aktiv, techniker: techniker ? techniker.id : null, level: techniker ? level : null, bonus, teile };
}
// Anteil des Bonus bei so vielen Besuchern: 1, wenn die Lautsprecher alle abdecken, sonst Plätze / Besucher
export const tonAnteil = (ton, besucher) => !ton || !ton.aktiv ? 0 : besucher <= ton.plaetze ? 1 : ton.plaetze / besucher;
