// Prüft Haltungslevel, Bedürfnisse am Ende der Woche und den Spielenachmittag
// (Spielprinzip von Lukas, 25.11.2026: claude/spielprinzip-beduerfnisse-wochenende.md).
// Starten mit: node tests/beduerfnisse.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { HALTUNGSLEVEL, KOMMCHANCE, BEDUERFNISSE, JUGEND } from '../src/inhalte/besucher.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel, spielStarten, SPEICHER_VERSION } from '../src/kern/spiel.js';
import { zeitVorruecken, veranstaltungEinstellen, terminEinstellen, programmVon, gottesdienstRaeume, prognose, dauerVon } from '../src/kern/ablauf.js';
import { moebelSetzen } from '../src/kern/moebel.js';
import { versetzen, personHinzufuegen } from '../src/kern/personen.js';
import { zufriedenheitAendern, kommChance, besuchChance, beduerfnisErfuellt, besucherAnlegen, levelVon } from '../src/kern/besucher.js';
import { beduerfnisSchritt, offeneBeduerfnisse } from '../src/kern/beduerfnisse.js';
import { dauerspenderSchritt } from '../src/kern/dauerspender.js';
import { bausteineVon } from '../src/kern/bausteine.js';
import { TAG_MIN, WOCHE_MIN, zeitpunkt } from '../src/kern/zeit.js';

const nah = (a, b) => Math.abs(a - b) < 1e-9;
assert.deepEqual(HALTUNGSLEVEL, { max: 5, aufstiegBei: 100, nachAbstieg: 50, startBesucher: 2 });
assert.deepEqual(BEDUERFNISSE, { liste: ['lobpreis', 'kaffee', 'spass'], lobpreisAb: 0.5, nichtErfuellt: -5 });
assert.equal(JUGEND.faktor.spiele, 0.25);

// ---- Haltungslevel: bei 100 hoch (Haltung 0, ein Bedürfnis dazu), bei 0 runter (Haltung 50, letztes Bedürfnis weg) ----
{
  const b = { id: 'x', voll: 'Xenia X', zufriedenheit: 95, level: 1, beduerfnisse: [], lobpreis: 0.9 };
  zufriedenheitAendern(b, 10);
  assert.equal(b.level, 2); assert.equal(b.zufriedenheit, 0); assert.equal(b.beduerfnisse.length, 1);
  const erstes = b.beduerfnisse[0];
  assert.ok(BEDUERFNISSE.liste.includes(erstes));
  for (let i = 2; i < 5; i++) { b.zufriedenheit = 100; zufriedenheitAendern(b, 1); }
  assert.equal(b.level, 5);
  // Drei Bedürfnisse, vier Aufstiege: beim letzten ist keins mehr übrig (null) – jedes Bedürfnis nur einmal
  assert.deepEqual([...b.beduerfnisse.filter(Boolean)].sort(), ['kaffee', 'lobpreis', 'spass']);
  assert.equal(b.beduerfnisse.length, 4); assert.equal(b.beduerfnisse.filter(x => x === null).length, 1);
  b.zufriedenheit = 80; zufriedenheitAendern(b, 50); assert.equal(b.level, 5); assert.equal(b.zufriedenheit, 100);   // höchstes Level: bleibt bei 100
  // Abstieg: Haltung 50, das zuletzt dazugekommene Bedürfnis geht
  const vorher = [...b.beduerfnisse];
  b.zufriedenheit = 3; zufriedenheitAendern(b, -5);
  assert.equal(b.level, 4); assert.equal(b.zufriedenheit, 50); assert.deepEqual(b.beduerfnisse, vorher.slice(0, 3));
  for (let i = 0; i < 3; i++) { b.zufriedenheit = 2; zufriedenheitAendern(b, -5); }
  assert.equal(b.level, 1); assert.deepEqual(b.beduerfnisse, []);
  b.zufriedenheit = 2; zufriedenheitAendern(b, -5);
  assert.equal(b.level, 1); assert.equal(b.zufriedenheit, 0);                                // Level 1: bleibt bei 0
  // Gleiches Bedürfnis beim erneuten Aufstieg (fest aus Kennung und Level, kein Würfel)
  b.zufriedenheit = 99; zufriedenheitAendern(b, 5);
  assert.equal(b.beduerfnisse[0], erstes);
}
// Lobpreis entsteht nur ab 50 % Lobpreis-Vorliebe
{
  const b = { id: 'm', voll: 'Muffel M', zufriedenheit: 0, level: 1, beduerfnisse: [], lobpreis: 0.2 };
  for (let i = 1; i < 5; i++) { b.zufriedenheit = 100; zufriedenheitAendern(b, 0); }
  assert.equal(b.level, 5);
  assert.deepEqual([...b.beduerfnisse.filter(Boolean)].sort(), ['kaffee', 'spass']);
  assert.equal(b.beduerfnisse.filter(x => x === null).length, 2);
}
console.log('Haltungslevel-Tests bestanden.');

// ---- Chance zu kommen: Grund + Level + Haltung, höchstens 100 % ----
{
  assert.deepEqual(KOMMCHANCE, { grund: 0.3, jeLevel: 0.15, haltung: 0.15 });
  assert.ok(nah(kommChance({ level: 1, zufriedenheit: 0 }), 0.3));
  assert.ok(nah(kommChance({ level: 1, zufriedenheit: 50 }), 0.375));
  assert.ok(nah(kommChance({ zufriedenheit: 100 }), 0.45));                 // ohne Angabe: Level 1
  assert.ok(nah(kommChance({ level: 2, zufriedenheit: 0 }), 0.45));          // kein Sprung beim Aufstieg
  assert.ok(nah(kommChance({ level: 3, zufriedenheit: 50 }), 0.675));
  assert.equal(kommChance({ level: 5, zufriedenheit: 100 }), 1);
}
// Start-Stammgäste und alte Spielstände: Level 2 mit einem Bedürfnis, Haltung bleibt; Passanten Level 1
{
  const z = neuesSpiel(() => 0.5);
  assert.ok(z.besucher.every(b => b.level === 2 && b.zufriedenheit === 60 && b.beduerfnisse.filter(Boolean).length === 1));
  assert.ok(z.ort.leute.every(p => p.level === 1));
  const alt = { besucher: [{ id: 'b9', voll: 'Alt A', zufriedenheit: 85, besuche: 7 }], ort: { leute: [{ id: 'p9', voll: 'Pass P', zufriedenheit: 40 }] } };
  besucherAnlegen(alt);
  assert.equal(alt.besucher[0].level, 2); assert.equal(alt.besucher[0].zufriedenheit, 85); assert.equal(alt.besucher[0].beduerfnisse.length, 1);
  assert.equal(alt.ort.leute[0].level, 1); assert.deepEqual(alt.ort.leute[0].beduerfnisse, []);
}
console.log('Kommchance-Tests bestanden.');

// ---- Ende der Woche: Sonntag 24:00, −5 je nicht erfülltem Bedürfnis, vor den Dauerspendern ----
{
  const z = neuesSpiel(() => 0.5);
  z.ort.leute = [{ id: 'p', voll: 'Pia P', level: 1, zufriedenheit: 50, beduerfnisse: ['kaffee'] }];   // Passanten: keine Prüfung
  z.besucher = [
    { id: 'a', voll: 'Anna A', level: 3, zufriedenheit: 40, beduerfnisse: ['kaffee', 'spass'] },   // beide erfüllt
    { id: 'b', voll: 'Ben B', level: 3, zufriedenheit: 40, beduerfnisse: ['kaffee', 'spass'] },    // eins erfüllt
    { id: 'c', voll: 'Cora C', level: 3, zufriedenheit: 8, beduerfnisse: ['kaffee', 'spass'] },    // nicht da gewesen → −10, Abstieg
    { id: 'd', voll: 'Dora D', level: 1, zufriedenheit: 40, beduerfnisse: [] }                     // noch keine Bedürfnisse
  ];
  const [a, b, c, d] = z.besucher;
  beduerfnisErfuellt(z, a, 'kaffee'); beduerfnisErfuellt(z, a, 'spass'); beduerfnisErfuellt(z, b, 'spass');
  assert.deepEqual(offeneBeduerfnisse(b, 0), ['kaffee']);
  const s = beduerfnisSchritt(z), d8 = dauerspenderSchritt(z, () => 0);
  assert.equal(s.zeit, WOCHE_MIN); assert.equal(zeitpunkt(s.zeit).tag, 0); assert.equal(zeitpunkt(s.zeit).stunde, 0);   // Montag 0:00
  assert.ok(s.zeit < d8.zeit);                                                                         // vor den Dauerspendern (8:00)
  z.minuten = s.zeit; s.tun(z);
  assert.equal(a.zufriedenheit, 40); assert.equal(b.zufriedenheit, 35); assert.equal(d.zufriedenheit, 40);
  assert.equal(c.level, 2); assert.equal(c.zufriedenheit, 50); assert.deepEqual(c.beduerfnisse, ['kaffee']);
  assert.equal(z.ort.leute[0].zufriedenheit, 50);
  assert.deepEqual(b.wochenErgebnis, { woche: 0, offen: ['kaffee'], haltung: -5, levelVorher: 3 });
  // Was letzte Woche erfüllt war, zählt nicht für diese Woche
  assert.equal(beduerfnisSchritt(z).zeit, 2 * WOCHE_MIN);
  assert.deepEqual(offeneBeduerfnisse(a, 1), ['kaffee', 'spass']);
  // Dauerspender jetzt ab Level 3: Cora ist auf Level 2 gefallen
  z.minuten = d8.zeit; dauerspenderSchritt(z, () => 0).tun(z);
  assert.deepEqual(Object.keys(z.dauerspende.spender).sort(), ['a', 'b']);
}
// Alter Spielstand mitten in der Woche: erste Prüfung erst Ende der nächsten Woche
{
  const z = neuesSpiel(() => 0.5);
  delete z.beduerfnisWoche; z.minuten = 3 * TAG_MIN + 600;
  assert.equal(beduerfnisSchritt(z).zeit, 2 * WOCHE_MIN);
}
console.log('Wochenende-Tests bestanden.');

// ---- Spielenachmittag im Gemeindesaal ----
const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
const raumBei = z => { const a = aus(z); return a.liste[a.gruppe[G.x + 5 + (G.y + 5) * z.w]]; };
const saal = z => gottesdienstRaeume(z, aus(z)).find(g => g.typ.id === 'gemeindesaal');
const MI = 2 * TAG_MIN;
function gemeinde() {
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 13, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z), 'gemeindesaal');
  z.personen = z.personen.filter(p => p.id === 'pastor');
  z.besucher = Array.from({ length: 4 }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X',
    level: 5, zufriedenheit: 100, kaffeeWert: 0, besuche: 0, lobpreis: 0.5, jugend: false, beduerfnisse: [] }));
  z.bekanntheit = 0; z.ortRuhig = true; z.konto = 1000;
  return z;
}
{
  const z = gemeinde(), r = raumBei(z), fehlt = () => saal(z).programm[0].fehlt;
  veranstaltungEinstellen(z, r, 'spiele');
  // Zeit: Veranstaltung 1 stand auf Sonntag vormittags → automatisch nachmittags; vormittags nicht erlaubt
  assert.equal(programmVon(z, r)[0].slot, 'nachmittag');
  assert.equal(terminEinstellen(z, r, 0, 2, 'vormittag'), 'zeit');
  assert.equal(terminEinstellen(z, r, 0, 2, 'abend'), 'ok');
  assert.equal(terminEinstellen(z, r, 0, 2, 'nachmittag'), 'ok');
  assert.equal(dauerVon('spiele'), 120); assert.equal(dauerVon('senioren'), 60);
  // Voraussetzungen: Haupt- ODER Ehrenamtlicher, Tisch, mindestens 2 Stühle direkt am Tisch
  assert.equal(fehlt(), 'mitarbeiter');
  const e = personHinzufuegen(z, { name: 'Erna', kuerzel: 'E', art: 'ehrenamt' });
  versetzen(z, e, G.x + 4, G.y + 4);
  assert.equal(fehlt(), 'tisch');                                     // Ehrenamtliche allein reicht
  moebelSetzen(z, 'tisch', G.x + 8, G.y + 5, G.x + 8, G.y + 5);
  moebelSetzen(z, 'stuhl', G.x + 4, G.y + 7, G.x + 5, G.y + 7);       // zwei Stühle, aber nicht am Tisch
  assert.equal(fehlt(), 'stuehleTisch');
  moebelSetzen(z, 'stuhl', G.x + 7, G.y + 5, G.x + 7, G.y + 5);
  assert.equal(fehlt(), 'stuehleTisch');
  moebelSetzen(z, 'stuhl', G.x + 9, G.y + 5, G.x + 9, G.y + 5);
  assert.equal(fehlt(), null);
  z.personen = z.personen.filter(p => p !== e);
  assert.equal(fehlt(), 'mitarbeiter');
  versetzen(z, z.personen[0], G.x + 4, G.y + 4);
  assert.equal(fehlt(), null);                                        // Hauptamtlicher allein reicht auch
  moebelSetzen(z, 'stuhl', G.x + 8, G.y + 4, G.x + 8, G.y + 4); moebelSetzen(z, 'stuhl', G.x + 8, G.y + 6, G.x + 8, G.y + 6);
  // Plätze: nur die 4 Stühle am Tisch (die 2 anderen zählen nicht)
  const v = prognose(z, aus(z), saal(z).raum.nr, 0);
  assert.equal(v.plaetze, 4); assert.ok(v.bereit);
  assert.ok(nah(v.geld, 4 * 1.5));                                    // 4 Besucher × durchschnittlich 1,50 €
  const bt = bausteineVon(z, r, saal(z), ['spiele']).spiele;
  assert.equal(bt.summe.bereit, true); assert.equal(bt.summe.besucher.plaetze, 4); assert.equal(bt.summe.haltung.fest, 7);
  assert.deepEqual(bt.zeilen.map(x => x.id), ['leitungSpiele', 'tischStuehleSpiele', 'stuhlAmTisch', 'besserStuhl']);
  // Jugendliche: Chance × 0,25
  assert.ok(nah(besuchChance({ level: 5, zufriedenheit: 100, jugend: true }, { art: 'spiele' }), 0.25));

  // Ablauf Mittwoch 15–17 Uhr: +7 Haltung, Spaß erfüllt, Spende beim Gehen
  const [t0, t1, t2, t3] = z.besucher;
  t0.beduerfnisse = ['spass']; t1.beduerfnisse = ['spass', 'kaffee'];
  t3.level = 2; t3.zufriedenheit = 50;                                // Chance 52,5 % → kommt bei Zufall 0,5
  zeitVorruecken(z, aus(z), MI + 15 * 60 + 61 - z.minuten, () => 0.5);
  const L = z.laeufe.find(x => x.art === 'spiele');
  assert.equal(L.phase, 'gottesdienst');                              // nach 1 Stunde läuft er noch
  assert.equal(L.gaeste.filter(g => g.sitz).length, 4);
  assert.ok(L.gaeste.every(g => g.sitz && Math.abs(g.sitz.x - (G.x + 8)) + Math.abs(g.sitz.y - (G.y + 5)) === 1));   // alle am Tisch
  zeitVorruecken(z, aus(z), 60, () => 0.5);
  assert.notEqual(L.phase, 'gottesdienst');
  assert.equal(t3.zufriedenheit, 57);                                 // +7, kein Extra für den Sitzplatz (Holzstuhl: +0)
  assert.equal(t0.zufriedenheit, 100);
  assert.equal(z.wochenbuch.einnahmen.spende, 8);                    // Zufall 0,5 → je 2 €
  assert.equal(z.wochenbuch.einnahmen.kollekte || 0, 0);
  assert.ok(z.besucher.every(b => b.erfuellt && b.erfuellt.ids.includes('spass')));
  // Sonntag 24:00: t0 alles erfüllt, t1 Kaffee fehlt (dazu für alle −5: der Sonntagsgottesdienst fällt aus, es gibt keinen Gottesdienstraum)
  zeitVorruecken(z, aus(z), WOCHE_MIN + 1 - z.minuten, () => 0.99);
  assert.equal(t0.zufriedenheit, 95); assert.equal(t1.zufriedenheit, 90); assert.equal(t3.zufriedenheit, 52);
  // Kärtchen über die Schalterwand: Level und Bedürfnisse dieser Woche
  const spiel = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0.99);
  const k = spiel.besucherInfo('t1');
  assert.equal(k.level, 5); assert.equal(k.levelMax, 5);
  assert.deepEqual(k.wochenBeduerfnisse, [{ id: 'spass', erfuellt: false }, { id: 'kaffee', erfuellt: false }]);
  assert.equal(spiel.menschen().find(m => m.id === 't3').level, 2);
  assert.deepEqual(spiel.raumInfo(raumBei(z).nr).moeglich.find(m => m.id === 'spiele').slots, ['nachmittag', 'abend']);
  assert.equal(levelVon(t3), 2);
}
console.log('Spielenachmittag-Tests bestanden.');
