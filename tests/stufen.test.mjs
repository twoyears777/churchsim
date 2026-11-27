// Prüft die Stufen der Möbel, Snackautomat, Sandwichmaker, Tontechnikrack und das Kirchkaffee-Sitzen (Lukas, 27.11.).
// Starten mit: node tests/stufen.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { MOEBEL, INSTRUMENT_STUFEN, TONRACK, TON } from '../src/inhalte/moebel.js';
import { AUTOMATEN } from '../src/inhalte/automaten.js';
import { SANDWICH, LADEN_MINUTEN, STEHEN_PASSANT, STEHEN_GAST, SITZEN } from '../src/inhalte/kirchkaffee.js';
import { FORSCHUNGEN } from '../src/inhalte/forschung.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel, spielStarten } from './hilfen/ohne-erster.mjs';
import { zeitVorruecken, veranstaltungEinstellen } from '../src/kern/ablauf.js';
import { moebelSetzen, moebelKaufen, moebelBei, stufeVon, naechsteStufeVon, moebelVerbessern, moebelWert, fassungVon, ladenVon,
  istVerbesserbar, alleArtVerbessern, tonImRaum, tonWirkung, raumAusstattung, rackEinbauen, rackVon } from '../src/kern/moebel.js';
import { chanceVon } from '../src/kern/automaten.js';
import { willSandwich } from '../src/kern/kirchkaffee.js';
import { versetzen, personHinzufuegen } from '../src/kern/personen.js';
import { musikBonus } from '../src/kern/skills.js';
import { anfrageOffen, ablehnen, schliessen } from '../src/kern/seelsorge.js';
import { TAG_MIN } from '../src/kern/zeit.js';

const SO = 6 * TAG_MIN;
const nah = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
function aufbau() {
  const z = neuesSpiel(() => 0.9);
  z.ortRuhig = true;
  const aus = () => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
  const raumBei = (x, y) => { const a = aus(); return a.liste[a.gruppe[x + y * z.w]]; };
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 10); tuerUmschalten(z, G.x + 2, G.y + 5);
  wandRechteck(z, G.x + 18, G.y + 2, G.x + 26, G.y + 10); tuerUmschalten(z, G.x + 18, G.y + 5);
  typZuweisen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst'); typZuweisen(z, raumBei(G.x + 20, G.y + 5), 'kirchkaffee');
  veranstaltungEinstellen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 4, G.x + 15, G.y + 4);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  z.konto = 10000;
  const gd = () => raumBei(G.x + 5, G.y + 5), kk = () => raumBei(G.x + 20, G.y + 5);
  return { z, aus, gd, kk };
}
const bis = (z, aus, minute) => { while (z.minuten < minute) { if (anfrageOffen(z)) { ablehnen(z); schliessen(z); } zeitVorruecken(z, aus(), Math.min(1, minute - z.minuten), () => 0); } };

// ---- Zahlen ----
{
  const km = MOEBEL.find(m => m.id === 'kaffeemaschine');
  assert.deepEqual(km.stufen.map(s => [s.fassung, s.laden]), [[30, 2.5], [45, 2], [60, 1.5], [90, 1]]);
  assert.equal(km.stufen[0].fassung, km.fassung); assert.equal(km.stufen[0].laden, LADEN_MINUTEN);
  for (const id of ['gitarre', 'keyboard', 'schlagzeug', 'bass', 'egitarre', 'mikrofon']) assert.equal(MOEBEL.find(m => m.id === id).stufen, INSTRUMENT_STUFEN);
  for (const id of ['kaffeemaschine', 'getraenkeautomat', 'snackautomat', 'lautsprecher', 'subwoofer', 'tonpult', 'gitarre']) assert.ok(istVerbesserbar(id), id);
  assert.ok(!istVerbesserbar('sandwichmaker')); assert.ok(!istVerbesserbar('tonrack')); assert.ok(!istVerbesserbar('kanzel'));
  const g = AUTOMATEN.find(a => a.id === 'getraenkeautomat'), s = AUTOMATEN.find(a => a.id === 'snackautomat');
  for (const k of ['kosten', 'preis', 'einkauf', 'chance', 'auffuellenAb']) assert.equal(s[k], g[k], k);   // „wie der Getränkeautomat“
  assert.equal(MOEBEL.find(m => m.id === 'sandwichmaker').forschung, 'sandwiches');
  assert.equal(MOEBEL.find(m => m.id === 'tonrack').forschung, 'tontechnikrack');
  assert.ok(FORSCHUNGEN.some(f => f.id === 'sandwiches') && FORSCHUNGEN.some(f => f.id === 'tontechnikrack'));
  assert.equal(SANDWICH.preis, 3); assert.equal(SANDWICH.einkauf, 0.5); assert.ok(SANDWICH.laden > LADEN_MINUTEN);   // Lukas, 27.11.
  assert.equal(SITZEN.chance, 0.65); assert.equal(STEHEN_PASSANT, 20); assert.equal(STEHEN_GAST, 20);
}

// ---- Kaffeemaschine verbessern: Fassung, Ladezeit, Kosten, Abriss-Wert ----
{
  const { z } = aufbau();
  assert.equal(moebelKaufen(z, 'kaffeemaschine', G.x + 20, G.y + 3), 'ok');
  const m = moebelBei(z, G.x + 20, G.y + 3);
  assert.equal(stufeVon(m).stufe, 1); assert.equal(fassungVon(m), 30); assert.equal(ladenVon(m, LADEN_MINUTEN), 2.5);
  const konto = z.konto;
  assert.equal(moebelVerbessern(z, m), 'ok');
  assert.equal(z.konto, konto - 80); assert.equal(fassungVon(m), 45); assert.equal(ladenVon(m, LADEN_MINUTEN), 2);
  assert.equal(moebelWert(m), 50 + 80);
  moebelVerbessern(z, m); moebelVerbessern(z, m);
  assert.equal(moebelVerbessern(z, m), 'max'); assert.equal(naechsteStufeVon(m), null);
  assert.equal(fassungVon(m), 90);
  z.konto = 10; m.stufe = 1;
  assert.equal(moebelVerbessern(z, m), 'geld');
}

// ---- Automaten: Kaufchance des besten Automaten ----
{
  const { z, aus, kk } = aufbau();
  assert.equal(moebelKaufen(z, 'snackautomat', G.x + 24, G.y + 8), 'ok');
  assert.equal(moebelKaufen(z, 'snackautomat', G.x + 22, G.y + 8), 'ok');
  const a = AUTOMATEN.find(x => x.id === 'snackautomat');
  assert.equal(chanceVon(z, aus(), a), 0.5);
  const m = moebelBei(z, G.x + 24, G.y + 8);
  moebelVerbessern(z, m); moebelVerbessern(z, m);
  assert.equal(chanceVon(z, aus(), a), 0.6);
  assert.equal(alleArtVerbessern(z, kk(), 'snackautomat'), 'ok');   // nur der zweite kann noch höher
  assert.equal(stufeVon(moebelBei(z, G.x + 22, G.y + 8)).stufe, 2);
}

// ---- Ton-Technik: Stufen von Lautsprecher, Subwoofer, Pult ----
{
  const { z, gd } = aufbau();
  for (const [art, x] of [['lautsprecher', 16], ['lautsprecher', 17], ['subwoofer', 3], ['tonpult', 15]]) assert.equal(moebelKaufen(z, art, G.x + x, G.y + 9), 'ok');
  let t = tonImRaum(z, gd());
  assert.equal(t.plaetze, 30); assert.equal(t.subwooferBonus, 0.02); assert.equal(t.pultBonus, 0); assert.equal(t.pultStufe, 1);
  moebelVerbessern(z, moebelBei(z, G.x + 16, G.y + 9));                     // eine Box: Aktive PA-Box (25)
  moebelVerbessern(z, moebelBei(z, G.x + 3, G.y + 9));                      // 15-Zoll (3 %)
  moebelVerbessern(z, moebelBei(z, G.x + 15, G.y + 9));                     // Digitalpult (+2 %)
  t = tonImRaum(z, gd());
  assert.equal(t.plaetze, 40); assert.equal(t.subwooferBonus, 0.03); assert.equal(t.pultBonus, 0.02); assert.equal(t.pultStufe, 2);
  const ea = personHinzufuegen(z, { name: 'Toni', kuerzel: 'T', art: 'ehrenamt' });
  nah(tonWirkung(z, gd(), ea, 0).bonus, TON.start + 0.03 + 0.02);

  // Tontechnikrack: In-Ear, Controller, Plugins
  assert.equal(moebelKaufen(z, 'tonrack', G.x + 14, G.y + 9), 'ok');
  const rack = moebelBei(z, G.x + 14, G.y + 9);
  assert.equal(rackEinbauen(z, rack, 'inear', null, 2), 'ok');
  assert.equal(rackEinbauen(z, rack, 'inear', null, 2), 'ok');
  assert.equal(rackEinbauen(z, rack, 'inear', null, 2), 'pult');            // Personal-Mixer brauchen die Stagebox (Pult-Stufe 3)
  assert.equal(rackEinbauen(z, rack, 'controller', null, 2), 'ok');
  assert.equal(rackEinbauen(z, rack, 'plugin', 'kompressor', 2), 'ok');
  assert.equal(rackEinbauen(z, rack, 'plugin', 'kompressor', 2), 'max');
  assert.equal(rackEinbauen(z, rack, 'plugin', 'autotune', 2), 'ok');
  assert.equal(rackEinbauen(z, rack, 'plugin', 'eq', 1), 'pult');           // Analogpult: keine Plugins
  assert.deepEqual(rackVon(rack), { inear: 2, controller: 1, plugins: ['kompressor', 'autotune'] });
  assert.equal(moebelWert(rack), 150 + 100 + 250 + 150 + 80 + 150);
  t = tonImRaum(z, gd());
  assert.equal(t.plaetze, Math.floor(40 * 1.2));
  // 3 Musiker: In-Ear 3 × 1,5 %; Kompressor 1 %; Auto-Tune nur mit Mikrofon → noch nicht
  let w = tonWirkung(z, gd(), ea, 0, 3);
  nah(w.teile.inear, 0.045); nah(w.teile.plugins, 0.01);
  nah(w.bonus, TON.start + 0.03 + 0.02 + 0.045 + 0.01);
  assert.equal(moebelKaufen(z, 'mikrofon', G.x + 13, G.y + 9), 'ok');
  w = tonWirkung(z, gd(), ea, 0, 3);
  nah(w.teile.plugins, 0.03);
  nah(tonWirkung(z, gd(), ea, 0, 6).teile.inear, 0.06);                     // Funk-In-Ear: höchstens 4 Musiker
  assert.equal(tonWirkung(z, gd(), null, 0, 3).bonus, 0);                   // ohne Tontechniker nichts
}

// ---- Instrumente: Stufe bringt dem Musiker mehr ----
{
  const { z, gd } = aufbau();
  assert.equal(moebelKaufen(z, 'gitarre', G.x + 8, G.y + 8), 'ok');
  nah(raumAusstattung(z, gd(), [0]).musikBonus, musikBonus(0));
  moebelVerbessern(z, moebelBei(z, G.x + 8, G.y + 8));
  nah(raumAusstattung(z, gd(), [0]).musikBonus, musikBonus(0) + 0.01);
  moebelVerbessern(z, moebelBei(z, G.x + 8, G.y + 8));
  nah(raumAusstattung(z, gd(), [2]).musikBonus, musikBonus(2) + 0.02);
}

// ---- Schalterwand: Forschung nötig, Verbessern-Menü, Rack-Fenster ----
{
  const { z } = aufbau();
  assert.equal(moebelKaufen(z, 'kaffeemaschine', G.x + 20, G.y + 3), 'ok');
  const spiel = spielStarten(JSON.stringify({ version: 3, zustand: z }), () => 0.9);
  assert.equal(spiel.moebelKaufen('sandwichmaker', G.x + 20, G.y + 7), 'forschung');
  assert.equal(spiel.moebelKaufen('tonrack', G.x + 14, G.y + 9), 'forschung');
  const sw = spiel.moebelArten().find(m => m.id === 'sandwichmaker');
  assert.ok(sw.gesperrt); assert.equal(sw.forschung, 'Sandwiches');
  const v = spiel.moebelStufeInfo(G.x + 20, G.y + 3);
  assert.equal(v.stufe, 1); assert.equal(v.maxStufe, 4); assert.deepEqual(v.werte, { fassung: 30, laden: 2.5 });
  assert.equal(v.naechste.preis, 80); assert.equal(v.alle, null);
  assert.equal(spiel.moebelVerbessern(G.x + 20, G.y + 3), 'ok');
  assert.equal(spiel.maschineInfo(G.x + 20, G.y + 3).fassung, 45);
  assert.equal(spiel.stuhlInfo(G.x + 6, G.y + 4).stufe, 1);               // Stühle laufen weiter über ihr eigenes Menü
  assert.equal(spiel.moebelStufeInfo(G.x + 6, G.y + 4), null);
}
{
  const { z } = aufbau();
  z.forschung = { laeuft: null, fertig: ['sandwiches', 'tontechnikrack'] };
  const spiel = spielStarten(JSON.stringify({ version: 3, zustand: z }), () => 0.9);
  assert.equal(spiel.moebelKaufen('tonrack', G.x + 14, G.y + 9), 'ok');
  assert.equal(spiel.moebelKaufen('tonrack', G.x + 13, G.y + 9), 'grenze');
  const r = spiel.rackInfo(G.x + 14, G.y + 9);
  assert.ok(r.imRaum); assert.equal(r.leistung.fehlt, 'pult'); assert.equal(r.module.inear.stufe, 0);
  assert.ok(r.leistung.maxBonus > 0.3); assert.equal(r.module.plugins.length, TONRACK.plugins.length);
  assert.equal(spiel.rackEinbauen(G.x + 14, G.y + 9, 'plugin', 'eq'), 'pult');
  assert.equal(spiel.rackEinbauen(G.x + 14, G.y + 9, 'inear'), 'ok');
  assert.equal(spiel.rackInfo(G.x + 14, G.y + 9).module.inear.stufe, 1);
  assert.equal(spiel.moebelKaufen('sandwichmaker', G.x + 20, G.y + 7), 'ok');
}

// ---- Sandwiches im Kirchkaffee: nach dem Gottesdienst, mit Kaffee zusammen ----
{
  const { z, aus } = aufbau();
  assert.equal(moebelKaufen(z, 'kaffeemaschine', G.x + 20, G.y + 3), 'ok');
  assert.equal(moebelKaufen(z, 'theke', G.x + 22, G.y + 3), 'ok');
  assert.equal(moebelKaufen(z, 'sandwichmaker', G.x + 20, G.y + 7), 'ok');
  const ea = personHinzufuegen(z, { name: 'Helfer', kuerzel: 'H', art: 'ehrenamt' });
  versetzen(z, ea, G.x + 25, G.y + 4);
  z.besucher = Array.from({ length: 10 }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X', level: 5, zufriedenheit: 50, kaffeeWert: 1, besuche: 0, lobpreis: 0.5 }));
  z.moebel.find(m => m.art === 'kaffeemaschine').fuellung = 30;
  z.moebel.find(m => m.art === 'sandwichmaker').fuellung = 20;
  let sahLaden = false;
  while (z.minuten < SO + 600 + 300) {   // bis alle bedient sind
    zeitVorruecken(z, aus(), 1, () => 0);
    if (anfrageOffen(z)) { ablehnen(z); schliessen(z); }
    const a = z.kaffee && z.kaffee.ma[ea.id] && z.kaffee.ma[ea.id].aufgabe;
    if (a && a.phase === 'sandwichLaden') { sahLaden = true; assert.equal(a.dauer, SANDWICH.laden); }
  }
  const B = z.wochenbuch.buchungen;
  const verkauft = B.filter(b => b.kategorie === 'sandwich' && b.seite === 'einnahmen').length;
  const tassen = B.filter(b => b.kategorie === 'kirchkaffee' && b.tassen === 1).length;
  assert.ok(tassen > 0, 'Kaffee verkauft');
  assert.ok(verkauft > 0 && verkauft < tassen, `Sandwiches ${verkauft} von ${tassen} Kunden`);
  assert.ok(sahLaden, 'Sandwichmaker hat geladen');
  assert.equal(z.wochenbuch.einnahmen.sandwich, verkauft * SANDWICH.preis);
  assert.ok(B.some(b => b.kategorie === 'sandwich' && b.seite === 'ausgaben') || z.moebel.find(m => m.art === 'sandwichmaker').fuellung === 20 - verkauft);   // danach evtl. nachgekauft
  // Wer kein Sandwich wollte, hat keins: willSandwich ist fest aus Besuch und Person
  assert.equal(typeof willSandwich({ id: 't1', lauf: 'x' }), 'boolean');
}

console.log('Stufen, Snackautomat, Sandwichmaker, Tontechnikrack: alle Prüfungen bestanden');
