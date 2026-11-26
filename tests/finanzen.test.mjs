// Prüft die Finanzübersicht (Spielprinzip 25.11.2026): Kassenbuch, Kirchkaffee nach Anlass und Einkauf,
// Wochenwechsel in den Verlauf, alte Spielstände und die Abfrage finanzInfo() an der Schalterwand.
// Starten mit: node tests/finanzen.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { PREIS_TASSE, EINKAUF } from '../src/inhalte/kirchkaffee.js';
import { VERLAUF_WOCHEN } from '../src/inhalte/finanzen.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel, spielStarten } from './hilfen/ohne-erster.mjs';   // ohne ersten Gottesdienst (26.11.)
import { zeitVorruecken, veranstaltungEinstellen } from '../src/kern/ablauf.js';
import { moebelSetzen, moebelKaufen } from '../src/kern/moebel.js';
import { versetzen, personHinzufuegen } from '../src/kern/personen.js';
import { schichtHinzufuegen, passantKommt } from '../src/kern/kirchkaffee.js';
import { buchen, wocheWechseln, finanzUebersicht, kaffeeBilanz, finanzenAnlegen } from '../src/kern/finanzen.js';
import { TAG_MIN, WOCHE_MIN } from '../src/kern/zeit.js';

// Einzelne Buchungen: Summen, Kassenbuch, Kirchkaffee nach Anlass
{
  const z = neuesSpiel(() => 0.5);
  z.konto = 100;
  const minuten = z.minuten;
  buchen(z, 'einnahmen', 'kirchkaffee', 1, { tassen: 1, anlass: 'gottesdienst' });
  buchen(z, 'einnahmen', 'kirchkaffee', 1, { tassen: 1, anlass: 'gottesdienst' });
  buchen(z, 'einnahmen', 'kirchkaffee', 1, { tassen: 1, anlass: 'oeffnungszeit' });
  buchen(z, 'ausgaben', 'kaffee', 1.5, { tassen: 3, anlass: 'einkauf' });
  buchen(z, 'ausgaben', 'moebel', 10, { moebel: 'stuhl' });
  assert.equal(z.konto, 91.5);
  const f = finanzUebersicht(z);
  assert.equal(f.woche.summeEinnahmen, 3); assert.equal(f.woche.summeAusgaben, 11.5); assert.equal(f.woche.saldo, -8.5);
  assert.deepEqual(f.woche.kaffee.gottesdienst, { tassen: 2, euro: 2 });
  assert.deepEqual(f.woche.kaffee.oeffnungszeit, { tassen: 1, euro: 1 });
  assert.deepEqual(f.woche.kaffee.verkauft, { tassen: 3, euro: 3 });
  assert.deepEqual(f.woche.kaffee.einkauf, { tassen: 3, euro: 1.5 });
  assert.equal(f.woche.kaffee.gewinn, 1.5);
  assert.equal(f.buchungen.length, 5);
  assert.deepEqual([f.buchungen[0].kategorie, f.buchungen[0].moebel, f.buchungen[0].minuten], ['moebel', 'stuhl', minuten]);   // neueste zuerst
  // Cent-Beträge addieren sich ohne Rundungsfehler
  for (let i = 0; i < 10; i++) buchen(z, 'ausgaben', 'kaffee', 0.1, { tassen: 0, anlass: 'einkauf' });
  assert.equal(z.wochenbuch.ausgaben.kaffee, 2.5);
}
console.log('Buchungs-Tests bestanden.');

// Wochenwechsel: alte Woche kommt in den Verlauf (mit Kontostand am Ende), höchstens VERLAUF_WOCHEN Wochen
{
  const z = neuesSpiel(() => 0.5);
  z.buchWoche = 0;
  buchen(z, 'einnahmen', 'kollekte', 7, { veranstaltung: 'gottesdienst' });
  buchen(z, 'einnahmen', 'kirchkaffee', 1, { tassen: 1, anlass: 'gottesdienst' });
  const konto = z.konto;
  wocheWechseln(z, 1);
  assert.equal(z.buchWoche, 1);
  assert.deepEqual(z.wochenbuch.einnahmen, {}); assert.equal(z.wochenbuch.buchungen.length, 0);
  let f = finanzUebersicht(z);
  assert.equal(f.verlauf.length, 1);
  assert.deepEqual([f.verlauf[0].woche, f.verlauf[0].summeEinnahmen, f.verlauf[0].konto, f.verlauf[0].kaffee.verkauft.tassen], [0, 8, konto, 1]);
  for (let w = 2; w < 20; w++) wocheWechseln(z, w);
  f = finanzUebersicht(z);
  assert.equal(f.verlauf.length, VERLAUF_WOCHEN);
  assert.equal(f.verlauf[0].woche, 18);                               // neueste zuerst
}
// Alter Spielstand (Wochenbuch ohne Kirchkaffee/Kassenbuch, kein Verlauf) wird ergänzt
{
  const z = neuesSpiel(() => 0.5);
  z.wochenbuch = { einnahmen: { kollekte: 5 }, ausgaben: {} }; delete z.finanzVerlauf;
  finanzenAnlegen(z);
  buchen(z, 'einnahmen', 'kirchkaffee', 1, { tassen: 1, anlass: 'oeffnungszeit' });
  const f = finanzUebersicht(z);
  assert.equal(f.woche.summeEinnahmen, 6); assert.deepEqual(f.verlauf, []); assert.equal(f.buchungen.length, 1);
  assert.deepEqual(kaffeeBilanz().verkauft, { tassen: 0, euro: 0 });
}
console.log('Wochenwechsel-Tests bestanden.');

// Im echten Ablauf: Einkauf im Laden, Kaffee nach dem Gottesdienst und in der eigenen Öffnungszeit, dann neue Woche
{
  const z = neuesSpiel(() => 0.9);
  z.ortRuhig = true;
  const aus = () => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
  const raumBei = (x, y) => { const a = aus(); return a.liste[a.gruppe[x + y * z.w]]; };
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 10); tuerUmschalten(z, G.x + 2, G.y + 5);
  wandRechteck(z, G.x + 18, G.y + 2, G.x + 26, G.y + 10); tuerUmschalten(z, G.x + 18, G.y + 5);
  typZuweisen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst'); typZuweisen(z, raumBei(G.x + 20, G.y + 5), 'kirchkaffee');
  veranstaltungEinstellen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst');
  for (let i = 0; i < 3; i++) moebelSetzen(z, 'stuhl', G.x + 6 + i, G.y + 4, G.x + 6 + i, G.y + 4);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  z.konto = 1000;
  assert.equal(moebelKaufen(z, 'kaffeemaschine', G.x + 20, G.y + 3), 'ok');
  assert.equal(moebelKaufen(z, 'theke', G.x + 22, G.y + 3), 'ok');
  const ea = personHinzufuegen(z, { name: 'Helfer', kuerzel: 'H', art: 'ehrenamt' });
  versetzen(z, ea, G.x + 25, G.y + 4);
  z.besucher = Array.from({ length: 3 }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X', level: 5, zufriedenheit: 100, kaffeeWert: 1, besuche: 0 }));
  assert.equal(schichtHinzufuegen(z, raumBei(G.x + 20, G.y + 5), 0, 'nachmittag'), 'ok');   // Montag 15–19 Uhr
  const bis = minute => { while (z.minuten < minute) zeitVorruecken(z, aus(), Math.min(5, minute - z.minuten), () => 0); };

  bis(15 * 60 - 1);                                                   // Montag: Maschine ist inzwischen aufgefüllt
  const vorher = finanzUebersicht(z).woche.kaffee.einkauf;
  assert.ok(vorher.tassen > 0 && vorher.euro === vorher.tassen * EINKAUF.preisTasse);
  bis(15 * 60 + 5);                                                   // Öffnungszeit hat begonnen
  z.ort.leute = [{ id: 'p0', vorname: 'P', voll: 'P', zufriedenheit: 40, besuche: 0 }];
  assert.ok(passantKommt(z, aus(), { id: 'p0', name: 'P' }));
  bis(23 * 60);
  bis(6 * TAG_MIN + 15 * 60);                                         // Sonntag nach dem Gottesdienst und Kirchkaffee
  const k = finanzUebersicht(z).woche.kaffee;
  assert.deepEqual(k.oeffnungszeit, { tassen: 1, euro: PREIS_TASSE });
  assert.deepEqual(k.gottesdienst, { tassen: 3, euro: 3 * PREIS_TASSE });
  assert.equal(k.gewinn, k.verkauft.euro - k.einkauf.euro);
  const kassenbuch = finanzUebersicht(z).buchungen;
  assert.ok(kassenbuch.some(b => b.kategorie === 'kollekte' && b.veranstaltung === 'gottesdienst'));
  assert.ok(kassenbuch.some(b => b.kategorie === 'moebel' && b.moebel === 'kaffeemaschine'));

  // Über die Schalterwand: Woche ab 1, Tag/Uhrzeit je Buchung, Namen aus den Inhaltsdateien
  const s = spielStarten(JSON.stringify({ version: 3, zustand: z }), () => 0);
  let info = s.finanzInfo();
  assert.equal(info.woche.woche, 1); assert.equal(info.verlauf.length, 0);
  const kauf = info.buchungen.find(b => b.moebel === 'kaffeemaschine');
  assert.ok(kauf.moebelName && kauf.tag === 0);
  assert.ok(info.buchungen.find(b => b.veranstaltung === 'gottesdienst').veranstaltungName);
  s.testGeld(50);                                                     // Test-Werkzeug zählt nicht als Buchung
  assert.equal(s.finanzInfo().buchungen.length, info.buchungen.length);
  // Neue Woche: Woche 1 kommt in den Verlauf
  bis(WOCHE_MIN + 1);
  info = finanzUebersicht(z);
  assert.equal(info.verlauf.length, 1);
  assert.deepEqual(info.verlauf[0].kaffee.gottesdienst, { tassen: 3, euro: 3 });
  assert.equal(info.verlauf[0].konto, z.konto);                       // seit Montag 0:00 nichts mehr gebucht
}
console.log('Ablauf-Tests bestanden.');
console.log('Alle Finanz-Tests bestanden.');
