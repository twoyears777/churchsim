// Prüft die Spiellogik. Starten mit: node tests/karte.test.mjs
import assert from 'node:assert';
import { RAUMTYPEN } from '../src/inhalte/raumtypen.js';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { neuerZustand, wandRechteck, abriss, tuerUmschalten, erkenneRaeume, passtGroesse, pruefeRaum, typZuweisen, raumTypVon, aufGrundstueck } from '../src/kern/karte.js';

const T = RAUMTYPEN[0];
let z = neuerZustand();
wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8);                       // innen 15 × 5
let r = erkenneRaeume(z).raeume;
assert.equal(r.length, 1); assert.equal(r[0].zellen.length, 75);
assert.deepEqual(pruefeRaum(z, r[0], T), ['tuer']);
tuerUmschalten(z, G.x + 2, G.y + 5);
r = erkenneRaeume(z).raeume;
assert.deepEqual(pruefeRaum(z, r[0], T), []);
typZuweisen(z, r[0], 'gottesdienst');
assert.equal(raumTypVon(z, r[0]).id, 'gottesdienst');
wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8);                       // erneut bauen: Tür und Funktion bleiben
r = erkenneRaeume(z).raeume;
assert.equal(raumTypVon(z, r[0]).id, 'gottesdienst');

const z2 = neuerZustand(); wandRechteck(z2, G.x + 2, G.y + 2, G.x + 17, G.y + 8); tuerUmschalten(z2, G.x + 2, G.y + 5);
assert.deepEqual(pruefeRaum(z2, erkenneRaeume(z2).raeume[0], T), ['groesse']); // 14 × 5 zu klein

const z3 = neuerZustand(); wandRechteck(z3, G.x + 2, G.y + 2, G.x + 8, G.y + 18);
assert.ok(passtGroesse(z3, erkenneRaeume(z3).raeume[0].zellen, 5, 15));       // hochkant geht auch

abriss(z, 0, 0, 63, 41);
assert.equal(erkenneRaeume(z).raeume.length, 0); assert.deepEqual(z.raumTyp, {});
// Außerhalb des Grundstücks wird nichts gebaut
const z4 = neuerZustand(); wandRechteck(z4, 0, 0, 3, 3);
assert.ok(z4.zellen.every((t, i) => !t || aufGrundstueck(i % z4.w, (i / z4.w) | 0)));
assert.equal(tuerUmschalten(z4, 0, 0), false);
console.log('Alle Tests bestanden.');

// Mitarbeiter
import { personenAnlegen, versetzen, verfuegbarkeit, personenPruefen, startPlatz } from '../src/kern/personen.js';
{
  const z5 = neuerZustand(); personenAnlegen(z5);
  const auswerten = () => { const { raeume, gruppe } = erkenneRaeume(z5); for (const r of raeume) { r.typ = raumTypVon(z5, r); r.probleme = pruefeRaum(z5, r, r.typ); } return { liste: raeume, gruppe }; };
  assert.deepEqual(verfuegbarkeit(z5, auswerten()).hauptamt, { frei: 1, gesamt: 1 });
  assert.deepEqual(verfuegbarkeit(z5, auswerten()).ehrenamt, { frei: 0, gesamt: 0 });
  wandRechteck(z5, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z5, G.x + 2, G.y + 5);
  typZuweisen(z5, erkenneRaeume(z5).raeume[0], 'gottesdienst');
  const pastor = z5.personen[0];
  assert.ok(versetzen(z5, pastor, G.x + 5, G.y + 5));
  assert.deepEqual(verfuegbarkeit(z5, auswerten()).hauptamt, { frei: 0, gesamt: 1 });
  assert.equal(versetzen(z5, pastor, G.x + 2, G.y + 2), false);             // nicht in eine Wand
  assert.equal(versetzen(z5, pastor, 0, 0), false);                         // nicht außerhalb des Grundstücks
  wandRechteck(z5, G.x + 5, G.y + 5, G.x + 6, G.y + 6); personenPruefen(z5); // Wand über die Figur gebaut
  assert.deepEqual({ x: pastor.x, y: pastor.y }, startPlatz());
}
console.log('Mitarbeiter-Tests bestanden.');

// Möbel, Runden, Wege
import { moebelSetzen, moebelPruefen } from '../src/kern/moebel.js';
import { kannWocheBeenden, wocheBeenden } from '../src/kern/runde.js';
import { weg } from '../src/kern/wege.js';
import { wandKonflikte, wandBauen } from '../src/kern/bauen.js';
import { namenZiehen } from '../src/kern/besucher.js';
import { NAMEN_ALLTAEGLICH, NAMEN_WORTSPIEL } from '../src/inhalte/namen.js';
import { sonntagDerWoche } from '../src/kern/kalender.js';
{
  const z6 = neuerZustand(); personenAnlegen(z6);
  const aus = () => { const { raeume, gruppe } = erkenneRaeume(z6); for (const r of raeume) { r.typ = raumTypVon(z6, r); r.probleme = pruefeRaum(z6, r, r.typ); } return { liste: raeume, gruppe }; };
  wandRechteck(z6, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z6, G.x + 2, G.y + 5);
  typZuweisen(z6, erkenneRaeume(z6).raeume[0], 'gottesdienst');
  assert.equal(kannWocheBeenden(z6, aus()), false);
  versetzen(z6, z6.personen[0], G.x + 4, G.y + 5);
  assert.equal(kannWocheBeenden(z6, aus()), false);                 // Pastor da, aber keine Stühle
  assert.equal(moebelSetzen(z6, 'stuhl', G.x + 8, G.y + 4, G.x + 9, G.y + 4), 2);
  assert.equal(kannWocheBeenden(z6, aus()), false);                 // nur 2 Stühle
  moebelSetzen(z6, 'stuhl', G.x + 10, G.y + 4, G.x + 10, G.y + 4);
  moebelSetzen(z6, 'stuhl', 0, 0, 2, 2);                            // außerhalb: nichts
  moebelSetzen(z6, 'stuhl', G.x + 30, G.y + 20, G.x + 30, G.y + 20); // draußen auf der Wiese: erlaubt, zählt aber nicht
  assert.equal(z6.moebel.length, 4);
  assert.equal(kannWocheBeenden(z6, aus()), true);
  const rb = wocheBeenden(z6, aus());
  assert.equal(rb.angebote[0].besucher, 3); assert.equal(z6.woche, 1);
  assert.equal(sonntagDerWoche(0).name, '1. Advent'); assert.equal(sonntagDerWoche(1).name, '2. Advent');
  const pfad = weg(z6, { x: G.tor.x, y: G.y + G.h + 1 }, rb.angebote[0].plaetze[0], (x, y) => z6.moebel.some(m => m.x === x && m.y === y));
  assert.ok(pfad && pfad.length > 5);
  assert.ok(pfad.some(p => p.x === G.x + 2 && p.y === G.y + 5));    // läuft durch die Tür
  const raus = pfad.findIndex(p => aufGrundstueck(p.x, p.y));        // betritt das Grundstück nur durchs Tor
  assert.ok(pfad[raus].y === G.y + G.h - 1 && pfad[raus].x >= G.tor.x && pfad[raus].x < G.tor.x + G.tor.breite);
  // Wand über einen Stuhl wird nicht gebaut
  assert.equal(wandKonflikte(z6, G.x + 7, G.y + 3, G.x + 12, G.y + 4).length, 3);
  assert.equal(wandBauen(z6, G.x + 7, G.y + 3, G.x + 12, G.y + 4), false);
  assert.equal(z6.moebel.length, 4);
  assert.ok(wandBauen(z6, G.x + 25, G.y + 10, G.x + 30, G.y + 15));
}
{
  const n = namenZiehen(300);
  assert.equal(n.length, 300);
  assert.ok(n.every(x => x.vorname && x.nachname && x.voll === `${x.vorname} ${x.nachname}`));
  const wortspiel = n.filter(x => NAMEN_WORTSPIEL.includes(x.voll)).length / n.length;
  assert.ok(wortspiel > 0.2 && wortspiel < 0.47, 'Mischung etwa ein Drittel Wortspiel');
  const kurz = namenZiehen(10);
  assert.equal(new Set(kurz.map(x => x.voll)).size, 10);       // in kleiner Woche keine Doppelten
}
console.log('Runden-Tests bestanden.');

// Versionsnummer in version.js und version.json müssen übereinstimmen (sonst lädt die App endlos neu)
import { VERSION } from '../src/version.js';
import { readFileSync } from 'node:fs';
assert.equal(JSON.parse(readFileSync(new URL('../version.json', import.meta.url))).version, VERSION);
console.log('Versions-Test bestanden.');

// Kirchenjahr-Rad
import { kirchenjahrStand } from '../src/kern/kalender.js';
{
  const a = kirchenjahrStand(0);
  assert.equal(a.fortschritt, 0); assert.equal(a.aktuell.id, 'advent');
  assert.equal(kirchenjahrStand(4).aktuell.id, 'weihnachten');     // 27.12.
  assert.equal(kirchenjahrStand(17).aktuell.id, 'ostern');         // Ostersonntag 2027
  assert.equal(kirchenjahrStand(15).aktuell.id, 'passion');        // Judika
  assert.equal(kirchenjahrStand(51).aktuell.id, 'trinitatis');     // Ewigkeitssonntag
  assert.equal(kirchenjahrStand(52).fortschritt, 0);               // neues Kirchenjahr
  for (const z of a.zeiten) assert.ok(z.von < z.bis);
  assert.equal(a.zeiten.at(-1).bis, 1);
}
console.log('Kirchenjahr-Tests bestanden.');

// Finanzen
import { moebelKaufen, moebelAbreissen } from '../src/kern/moebel.js';
import { finanzPrognose } from '../src/kern/runde.js';
{
  const z7 = neuerZustand(); personenAnlegen(z7);
  const aus = () => { const { raeume, gruppe } = erkenneRaeume(z7); for (const r of raeume) { r.typ = raumTypVon(z7, r); r.probleme = pruefeRaum(z7, r, r.typ); } return { liste: raeume, gruppe }; };
  assert.equal(z7.konto, 50);
  wandRechteck(z7, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z7, G.x + 2, G.y + 5);
  typZuweisen(z7, erkenneRaeume(z7).raeume[0], 'gottesdienst');
  versetzen(z7, z7.personen[0], G.x + 4, G.y + 5);
  for (let i = 0; i < 10; i++) assert.equal(moebelKaufen(z7, 'stuhl', G.x + 6 + i, G.y + 4), 'ok');
  assert.equal(z7.konto, 0);
  assert.equal(moebelKaufen(z7, 'stuhl', G.x + 6, G.y + 6), 'geld');            // kein Geld mehr
  assert.equal(moebelKaufen(z7, 'stuhl', G.x + 6, G.y + 4), 'platz');           // schon belegt
  assert.equal(moebelAbreissen(z7, G.x + 15, G.y + 4, G.x + 15, G.y + 4), 5);   // volle Rückerstattung
  assert.equal(z7.konto, 5);
  assert.deepEqual(finanzPrognose(z7, aus()), { einnahmen: 5 + 9, ausgaben: 50 });
  const rb = wocheBeenden(z7, aus());
  assert.deepEqual(rb.finanzen, { einnahmen: { rueckerstattung: 5, kollekte: 9 }, ausgaben: { moebel: 50 } });
  assert.equal(z7.konto, 14); assert.equal(rb.kontostand, 14);
  assert.deepEqual(z7.wochenbuch, { einnahmen: {}, ausgaben: {} });              // neue Woche, leeres Buch
}
console.log('Finanz-Tests bestanden.');
