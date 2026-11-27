// Prüft die Ausstattung des Gottesdienstraums: Stuhlstufen, Kanzel, Altar, Blumen, Grünpflanze, Gitarre/Musiker, Plakat.
// Starten mit: node tests/ausstattung.test.mjs
import assert from 'node:assert';
import { skillsVon, musikLevel, musikBonus, musikErfahrungDazu, musikStand } from '../src/kern/skills.js';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { NEUGIER, PLAKAT } from '../src/inhalte/ort.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel, spielStarten } from './hilfen/ohne-erster.mjs';   // ohne ersten Gottesdienst (26.11.)
import { zeitVorruecken, veranstaltungEinstellen, terminEinstellen, prognose, gottesdienstRaeume } from '../src/kern/ablauf.js';
import { moebelSetzen, moebelBei, moebelAbreissen, stuhlVerbessern, raumAusstattung, instrumenteImRaum, grenzeErreicht } from '../src/kern/moebel.js';
import { MUSIK } from '../src/inhalte/moebel.js';
import { STARTGELD } from '../src/inhalte/finanzen.js';
import { versetzen, personHinzufuegen, eingesetztIn } from '../src/kern/personen.js';
import { neugierChance } from '../src/kern/ort.js';
import { raten, schliessen, anfrageOffen } from '../src/kern/seelsorge.js';
import { WOCHE_MIN } from '../src/kern/zeit.js';

const saat = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
const raumBei = (z, x, y) => { const a = aus(z); return a.liste[a.gruppe[x + y * z.w]]; };

// Gottesdienstraum mit 10 Stühlen, Pastor; genau 10 sichere Besucher, keine Neuen
function gemeinde(zufall) {
  const z = neuesSpiel(zufall);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z, G.x + 5, G.y + 5), 'gottesdienst'); veranstaltungEinstellen(z, raumBei(z, G.x + 5, G.y + 5), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 15, G.y + 3);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  z.besucher = Array.from({ length: 10 }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X', level: 5, zufriedenheit: 100, kaffeeWert: 0, besuche: 0, lobpreis: 0.5 }));   // (Lobpreis-Vorliebe 50 %: Musik ändert hier nichts; eigene Tests in veranstaltungen.test.mjs)
  z.bekanntheit = 0;
  z.ortRuhig = true;                                 // Test-Schalter: keine Passanten, keine Seelsorge-Anfragen
  return z;
}
// Bis nach dem nächsten Gottesdienst laufen lassen (Seelsorge-Anfragen ablehnen wir nicht, sondern raten Nr. 0)
function bisNachGottesdienst(z, zufall) {
  const vorher = z.letzterGottesdienst;
  for (let i = 0; i < 2 * WOCHE_MIN / 60 && z.letzterGottesdienst === vorher; i++) {
    z.ort.leute = [];                                // keine Neugierigen – die Besucherzahl bleibt genau 10
    zeitVorruecken(z, aus(z), 60, zufall);
    if (anfrageOffen(z)) { raten(z, 0, zufall); schliessen(z); }
  }
}
const kollekte = z => z.wochenbuch.einnahmen.kollekte || 0;

// Ohne Ausstattung: 10 Besucher = 10 €, am Sonntag (Standard-Termin: vormittags) doppelt = 20 €
{
  const zufall = saat(3), z = gemeinde(zufall);
  bisNachGottesdienst(z, zufall);
  assert.strictEqual(z.letzterGottesdienst.besucher, 10);
  assert.strictEqual(kollekte(z), 20);
}
// Sonntag abends (Lukas, 26.11.: der Bonus gilt den ganzen Sonntag): ebenfalls doppelt, 20 €
{
  const zufall = saat(3), z = gemeinde(zufall);
  assert.strictEqual(terminEinstellen(z, raumBei(z, G.x + 5, G.y + 5), 0, 6, 'abend'), 'ok');
  assert.strictEqual(prognose(z, aus(z)).sonntag, true);
  bisNachGottesdienst(z, zufall);
  assert.strictEqual(z.letzterGottesdienst.besucher, 10);
  assert.strictEqual(kollekte(z), 20);
}
// Anderer Tag (Mittwoch abends): einfache Kollekte, 10 €
{
  const zufall = saat(3), z = gemeinde(zufall);
  assert.strictEqual(terminEinstellen(z, raumBei(z, G.x + 5, G.y + 5), 0, 2, 'abend'), 'ok');
  assert.strictEqual(prognose(z, aus(z)).sonntag, false);
  bisNachGottesdienst(z, zufall);
  assert.strictEqual(z.letzterGottesdienst.besucher, 10);
  assert.strictEqual(kollekte(z), 10);
}
// Beispiel aus dem Spielprinzip: Polsterstühle, Altar, Lobpreisteam Level 0 → 10 × 1,2 × 1,2 × 1,05 = 15,12, am Sonntag × 2 = 30,24 → 30 €
{
  const zufall = saat(3), z = gemeinde(zufall);
  z.konto = 1000;
  for (const m of z.moebel) assert.strictEqual(stuhlVerbessern(z, m), 'ok');
  moebelSetzen(z, 'altar', G.x + 10, G.y + 6, G.x + 10, G.y + 6);
  moebelSetzen(z, 'gitarre', G.x + 12, G.y + 6, G.x + 12, G.y + 6);
  const ea = personHinzufuegen(z, { name: 'Erna Musik', kuerzel: 'E', art: 'ehrenamt' });
  versetzen(z, ea, G.x + 13, G.y + 6);
  assert.ok(eingesetztIn(z, aus(z), ea), 'Ehrenamtlicher mit Gitarre ist im Gottesdienstraum eingesetzt');
  const p = prognose(z, aus(z));
  assert.ok(Math.abs(p.kollekte - 30.24) < 1e-9, 'Prognose rechnet Stuhl, Altar und Lobpreisteam mit');
  bisNachGottesdienst(z, zufall);
  assert.strictEqual(kollekte(z), 30);
  assert.strictEqual(skillsVon(ea).musik, MUSIK.erfahrungProAuftritt, 'Der Musiker bekommt nach dem Auftritt etwas Erfahrung');
  // Polsterstuhl +2 Haltung: 100 bleibt 100 (Obergrenze) – Haltung testen wir unten mit niedrigerem Wert
}
// Ohne Gitarre ist der Ehrenamtliche im Gottesdienstraum nicht eingesetzt und es gibt keine Musik
{
  const z = gemeinde(saat(5));
  const ea = personHinzufuegen(z, { name: 'Erna Musik', kuerzel: 'E', art: 'ehrenamt' });
  versetzen(z, ea, G.x + 13, G.y + 6);
  assert.strictEqual(eingesetztIn(z, aus(z), ea), null);
  const r = raumBei(z, G.x + 5, G.y + 5);
  assert.strictEqual(raumAusstattung(z, r, 0).musik, false);
  moebelSetzen(z, 'gitarre', G.x + 12, G.y + 6, G.x + 12, G.y + 6);
  assert.strictEqual(raumAusstattung(z, r).musik, false, 'Gitarre ohne Ehrenamtlichen bringt nichts');
  assert.strictEqual(raumAusstattung(z, r).instrument, true);
  assert.strictEqual(raumAusstattung(z, r, 0).musik, true);
  assert.ok(Math.abs(raumAusstattung(z, r, 0).faktor - 1.05) < 1e-9, 'Level 0: +5 %');
  assert.ok(Math.abs(raumAusstattung(z, r, 5).faktor - 1.10) < 1e-9, 'Level 5: +10 %');
}
// Mehrere Instrumente (Lukas, 25.11.): pro Instrument ein eigener Ehrenamtlicher; die mit dem höchsten Level spielen; Boni addieren sich
{
  const zufall = saat(11), z = gemeinde(zufall);
  z.konto = 1000;
  const r = () => raumBei(z, G.x + 5, G.y + 5);
  for (const [art, dx] of [['gitarre', 12], ['schlagzeug', 14], ['keyboard', 16]]) assert.strictEqual(moebelSetzen(z, art, G.x + dx, G.y + 6, G.x + dx, G.y + 6), 1);
  assert.strictEqual(instrumenteImRaum(z, r()), 3);
  assert.ok(grenzeErreicht(z, r(), 'schlagzeug') && !grenzeErreicht(z, r(), 'bass'), 'Jedes Instrument nur 1× pro Raum');
  const eas = [0, 1, 2, 5].map((lv, i) => {
    const p = personHinzufuegen(z, { name: 'Musiker ' + i, kuerzel: 'M', art: 'ehrenamt' });
    skillsVon(p).musik = lv * MUSIK.erfahrungProLevel; versetzen(z, p, G.x + 12 + i, G.y + 7); return p;
  });
  const g = gottesdienstRaeume(z, aus(z))[0];
  assert.deepStrictEqual(g.spieler.map(musikLevel), [5, 2, 1], 'Drei Instrumente: die drei mit dem höchsten Level spielen');
  assert.strictEqual(g.ausstattung.musiker, 3);
  assert.ok(Math.abs(g.ausstattung.musikBonus - (0.10 + 0.07 + 0.06)) < 1e-9, 'Boni werden addiert: +23 %');
  assert.ok(Math.abs(raumAusstattung(z, r(), [0, 1, 2]).musikBonus - 0.18) < 1e-9, 'Beispiel: Level 0, 1, 2 → +18 %');
  assert.strictEqual(raumAusstattung(z, r(), [0, 0, 0, 0, 0]).musiker, 3, 'Mehr Musiker als Instrumente zählen nicht');
  bisNachGottesdienst(z, zufall);
  assert.strictEqual(skillsVon(eas[0]).musik, 0, 'Wer kein Instrument hat, bekommt keine Erfahrung');
  for (const p of eas.slice(1)) assert.ok(skillsVon(p).musik > 0 && skillsVon(p).musik % MUSIK.erfahrungProLevel === MUSIK.erfahrungProAuftritt, 'Alle Spieler bekommen Erfahrung');
}
// Ein Instrument ohne eigenen Spieler zählt nicht: 2 Instrumente, 1 Ehrenamtlicher → 1 Musiker
{
  const z = gemeinde(saat(12));
  moebelSetzen(z, 'bass', G.x + 12, G.y + 6, G.x + 12, G.y + 6);
  moebelSetzen(z, 'mikrofon', G.x + 14, G.y + 6, G.x + 14, G.y + 6);
  const ea = personHinzufuegen(z, { name: 'Erna Musik', kuerzel: 'E', art: 'ehrenamt' });
  versetzen(z, ea, G.x + 13, G.y + 7);
  assert.ok(eingesetztIn(z, aus(z), ea), 'Auch ohne Gitarre: mit einem anderen Instrument ist der Ehrenamtliche eingesetzt');
  const a = gottesdienstRaeume(z, aus(z))[0].ausstattung;
  assert.strictEqual(a.musiker, 1);
  assert.ok(Math.abs(a.musikBonus - 0.05) < 1e-9);
}
// Musik-Level: startet bei 0, ca. 50 Auftritte je Level, höchstens Level 10 (+15 %)
{
  const p = { id: 'ea-test', daten: { name: 'Test', art: 'ehrenamt' } };
  assert.strictEqual(musikLevel(p), 0);
  musikErfahrungDazu({ id: 'pastor' }); assert.strictEqual(musikLevel({ id: 'pastor' }), 0, 'Musik-Level nur für Ehrenamtliche');
  for (let i = 0; i < 49; i++) musikErfahrungDazu(p);
  assert.strictEqual(musikLevel(p), 0);
  musikErfahrungDazu(p);
  assert.strictEqual(musikLevel(p), 1, 'nach 50 Auftritten Level 1');
  assert.ok(Math.abs(musikStand(p).fortschritt) < 1e-9);
  for (let i = 0; i < 1000; i++) musikErfahrungDazu(p);
  assert.strictEqual(musikLevel(p), 10);
  assert.strictEqual(musikStand(p).fortschritt, 1);
  assert.strictEqual(musikBonus(10), 0.15);
  assert.strictEqual(musikBonus(0), 0.05);
}
// Lobpreisteam: Haltung + 5 % der aktuellen Haltung bei 100 % Lobpreis-Vorliebe (bei 50: +3, gerundet), zusätzlich zu Sitzplatz und Gottesdienst
{
  const zufall = saat(9), z = gemeinde(zufall);
  z.besucher = z.besucher.slice(0, 1);
  z.besucher[0].lobpreis = 1;   // liebt Lobpreis: voller Bonus (bei 50 % gäbe es 0, siehe veranstaltungen.test.mjs)
  moebelSetzen(z, 'gitarre', G.x + 12, G.y + 6, G.x + 12, G.y + 6);
  const ea = personHinzufuegen(z, { name: 'Erna Musik', kuerzel: 'E', art: 'ehrenamt' });
  versetzen(z, ea, G.x + 13, G.y + 6);
  for (let w = 0; w < 20 && !z.besucher[0].besuche; w++) { z.besucher[0].zufriedenheit = 50; bisNachGottesdienst(z, zufall); }
  assert.strictEqual(z.besucher[0].besuche, 1);
  assert.strictEqual(z.besucher[0].zufriedenheit, 50 + 5 + 5 + Math.round(50 * 0.05));
}
// Haltung: Kanzel +2, Blumen +1 je Stück (höchstens 4 zählen), Stuhlstufe 3 +4; dazu die üblichen +5 Sitzplatz, +5 Gottesdienst
{
  const zufall = saat(9), z = gemeinde(zufall);
  z.konto = 1000;
  for (const b of z.besucher) b.zufriedenheit = 50;
  z.besucher = z.besucher.slice(0, 1);
  const r = () => raumBei(z, G.x + 5, G.y + 5);
  moebelSetzen(z, 'kanzel', G.x + 10, G.y + 7, G.x + 10, G.y + 7);
  moebelSetzen(z, 'blumen', G.x + 3, G.y + 7, G.x + 7, G.y + 7);           // 5 Stück direkt gesetzt – nur 4 zählen
  assert.strictEqual(raumAusstattung(z, r()).haltung, 2 + 4);
  for (const m of z.moebel.filter(m => m.art === 'stuhl')) { stuhlVerbessern(z, m); stuhlVerbessern(z, m); }   // alle auf Stufe 3
  // Bei Haltung 50 kommt er nur mit 50 % – so lange Wochen laufen lassen, bis er da war
  for (let w = 0; w < 20 && !z.besucher[0].besuche; w++) { z.besucher[0].zufriedenheit = 50; bisNachGottesdienst(z, zufall); }
  assert.strictEqual(z.besucher[0].besuche, 1);
  assert.strictEqual(z.besucher[0].zufriedenheit, 50 + 5 + 5 + 4 + 6);
}
// Grünpflanzen: × 1,05 je Stück, bis 4
{
  const z = gemeinde(saat(1)), r = () => raumBei(z, G.x + 5, G.y + 5);
  moebelSetzen(z, 'gruenpflanze', G.x + 3, G.y + 7, G.x + 4, G.y + 7);
  assert.ok(Math.abs(raumAusstattung(z, r()).faktor - 1.05 ** 2) < 1e-9);
}
// Stühle: Stufen, Kosten, Erstattung beim Abriss
{
  const z = gemeinde(saat(2)), m = z.moebel[0];
  z.konto = 229;
  assert.strictEqual(stuhlVerbessern(z, m), 'ok'); assert.strictEqual(z.konto, 209);
  assert.strictEqual(stuhlVerbessern(z, m), 'ok'); assert.strictEqual(z.konto, 149);
  assert.strictEqual(stuhlVerbessern(z, m), 'geld');                       // Ehrenstuhl kostet 150 €
}
{
  const z = gemeinde(saat(2)), m = z.moebel[0];
  z.konto = 1000;
  stuhlVerbessern(z, m); stuhlVerbessern(z, m); stuhlVerbessern(z, m);
  assert.strictEqual(m.stufe, 4);
  assert.strictEqual(stuhlVerbessern(z, m), 'max');
  assert.strictEqual(z.konto, 1000 - 20 - 60 - 150);
  const erstattet = moebelAbreissen(z, m.x, m.y, m.x, m.y);
  assert.strictEqual(erstattet, (5 + 20 + 60 + 150) / 2);   // Abriss-Wert (27.11.): anfangs die Hälfte von Kauf + Verbesserungen
}
console.log('Stuhl- und Möbel-Tests bestanden.');

// Über die Schalterwand: Obergrenze, Stuhl-Menü, alle verbessern, Rückgängig
// Seit den Baukosten (25.11.) startet man mit 1.000 €: Nach dem Bauen wird der Kontostand für diese Tests auf 50 € gesetzt.
const aufKonto = (sp, betrag) => { const d = JSON.parse(sp.speicherText()); d.zustand.konto = betrag; return spielStarten(JSON.stringify(d), saat(4)); };
{
  let spiel = spielStarten(null, saat(4));
  spiel.wandBauen(G.x + 2, G.y + 2, G.x + 18, G.y + 8); spiel.tuerUmschalten(G.x + 2, G.y + 5);
  spiel = aufKonto(spiel, 50);
  const nr = spiel.raumNrBei(G.x + 5, G.y + 5);
  spiel.raumTypSetzen(nr, 'gottesdienst');
  assert.strictEqual(spiel.moebelKaufen('kanzel', G.x + 5, G.y + 5), 'ok');
  assert.strictEqual(spiel.moebelKaufen('kanzel', G.x + 6, G.y + 5), 'grenze');
  assert.strictEqual(spiel.lage().konto, 50 - 30);
  assert.strictEqual(spiel.moebelKaufen('stuhl', G.x + 7, G.y + 5), 'ok');
  assert.strictEqual(spiel.moebelKaufen('stuhl', G.x + 8, G.y + 5), 'ok');
  const info = spiel.stuhlInfo(G.x + 7, G.y + 5);
  assert.strictEqual(info.stufe, 1); assert.strictEqual(info.naechste.preis, 20);
  assert.strictEqual(info.alle.anzahl, 2); assert.strictEqual(info.alle.preis, 40); assert.strictEqual(info.alle.leistbar, false);
  assert.strictEqual(spiel.alleStuehleVerbessern(G.x + 7, G.y + 5), 'geld');
  assert.strictEqual(spiel.stuhlVerbessern(G.x + 7, G.y + 5), 'geld');        // 10 € übrig
  // Blumen: 4 gehen, die 5. nicht
  let s2 = spielStarten(null, saat(4));
  s2.wandBauen(G.x + 2, G.y + 2, G.x + 18, G.y + 8); s2.tuerUmschalten(G.x + 2, G.y + 5);
  s2 = aufKonto(s2, 50);
  s2.raumTypSetzen(s2.raumNrBei(G.x + 5, G.y + 5), 'gottesdienst');
  for (let i = 0; i < 4; i++) assert.strictEqual(s2.moebelKaufen('blumen', G.x + 4 + i, G.y + 4), 'ok');
  assert.strictEqual(s2.moebelKaufen('blumen', G.x + 9, G.y + 4), 'grenze');
  assert.strictEqual(s2.lage().konto, 10);
  assert.ok(s2.rueckgaengig());
  assert.strictEqual(s2.lage().konto, 20);
  assert.ok(s2.rueckgaengig());
  assert.strictEqual(s2.lage().konto, 30);
  assert.strictEqual(s2.moebelKaufen('stuhl', G.x + 9, G.y + 4), 'ok');
  assert.strictEqual(s2.stuhlVerbessern(G.x + 9, G.y + 4), 'ok');
  assert.strictEqual(s2.stuhlInfo(G.x + 9, G.y + 4).stufe, 2);
  assert.strictEqual(s2.karte().moebel.find(m => m.art === 'stuhl').stufe, 2);
  assert.ok(s2.rueckgaengig());                                               // Verbessern rückgängig: Geld zurück
  assert.strictEqual(s2.stuhlInfo(G.x + 9, G.y + 4).stufe, 1);
  assert.strictEqual(s2.lage().konto, 25);
}
console.log('Ausstattungs-Schnittstellen-Tests bestanden.');

// Plakat: 5 €, Neugier 3× (höchstens 100 %), hängt bis zum nächsten Gottesdienst
{
  const zufall = saat(6), z = gemeinde(zufall);
  assert.ok(Math.abs(neugierChance(z) - NEUGIER.grund) < 1e-9);
  z.plakat = { gekauft: z.minuten };
  assert.ok(Math.abs(neugierChance(z) - NEUGIER.grund * PLAKAT.faktor) < 1e-9);
  z.bekanntheit = 100;
  assert.strictEqual(neugierChance(z), 1);
  z.bekanntheit = 0;
  bisNachGottesdienst(z, zufall);
  assert.strictEqual(z.plakat, undefined, 'Plakat ist nach dem Gottesdienst weg');
}
{
  const spiel = spielStarten(null, saat(8));
  assert.strictEqual(spiel.torBei(G.tor.x, G.y + G.h), true);
  assert.strictEqual(spiel.torBei(G.tor.x - 1, G.y + G.h), false);
  const t = spiel.torInfo();
  assert.strictEqual(t.plakat, false); assert.strictEqual(t.chanceOhne, 5); assert.strictEqual(t.chanceMit, 15);
  assert.strictEqual(spiel.plakatKaufen(), 'ok');
  assert.strictEqual(spiel.plakatKaufen(), 'haengt');
  assert.strictEqual(spiel.lage().konto, STARTGELD - 5);
  assert.strictEqual(spiel.torInfo().chance, 15);
  assert.strictEqual(spiel.karte().plakat, true);
}
console.log('Plakat-Tests bestanden.');
