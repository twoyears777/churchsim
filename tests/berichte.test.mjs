// Prüft die Berichte vergangener Veranstaltungen im Gemeindekalender (27.11.) und „Vorherige Woche“.
// Starten mit: node tests/berichte.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { SPEICHER_VERSION } from '../src/kern/spiel.js';
import { neuesSpiel, spielStarten } from './hilfen/ohne-erster.mjs';
import { zeitVorruecken, veranstaltungEinstellen } from '../src/kern/ablauf.js';
import { moebelSetzen } from '../src/kern/moebel.js';
import { versetzen } from '../src/kern/personen.js';
import { TAG_MIN, WOCHE_MIN } from '../src/kern/zeit.js';

const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
const raumBei = z => { const a = aus(z); return a.liste[a.gruppe[G.x + 5 + (G.y + 5) * z.w]]; };
const SO = 6 * TAG_MIN;
const kalender = (z, versatz) => spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0.5).kalenderInfo(versatz);

// Gottesdienstraum mit 8 Stühlen und Pastor; 10 Besucher, die sicher kommen → 8 sitzen, 2 finden keinen Platz
function gemeinde() {
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 13, G.y + 3);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  z.besucher = Array.from({ length: 10 }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X',
    level: 5, zufriedenheit: 50, kaffeeWert: 0, besuche: 0, lobpreis: 0 }));
  z.bekanntheit = 0; z.ortRuhig = true; z.konto = 1000;
  veranstaltungEinstellen(z, raumBei(z), 'gottesdienst', 0);
  return z;
}

{
  const z = gemeinde();
  // Vor dem Gottesdienst: kein Bericht
  assert.deepEqual(kalender(z, 0).termine.map(t => [t.zustand, t.bericht]), [['geplant', null]]);
  assert.deepEqual(kalender(z, -1).termine, [], 'vorherige Woche ist am Anfang leer');
  const konto = z.konto, heiligkeit = z.heiligkeit || 0;
  zeitVorruecken(z, aus(z), SO + 16 * 60 - z.minuten, () => 0);   // Sonntag 16:00: Gottesdienst und Kirchkaffee sind vorbei
  const t = kalender(z, 0).termine[0], b = t.bericht;
  assert.equal(t.zustand, 'vorbei');
  assert.ok(b, 'vergangene Veranstaltung hat einen Bericht');
  assert.equal(b.besucher, 8);
  assert.equal(b.keinPlatz, 2);
  assert.ok(b.kollekte > 0 && b.spende === 0 && b.geld === b.kollekte);
  assert.equal(b.kollekte, z.wochenbuch.einnahmen.kollekte, 'Kollekte im Bericht = gebuchte Kollekte');
  assert.equal(b.heiligkeit, z.heiligkeit - heiligkeit);
  assert.equal(b.bekanntheit, z.bekanntheit, 'Bekanntheit im Bericht = wirkliche Änderung');
  assert.ok(b.haltung !== 0);
  assert.ok(z.konto >= konto + b.kollekte);

  // Nächste Woche Montag: der Bericht steht unter „Vorherige Woche“, auch wenn der Plan inzwischen geändert wurde
  zeitVorruecken(z, aus(z), WOCHE_MIN + 60 - z.minuten, () => 0);
  veranstaltungEinstellen(z, raumBei(z), 'lobpreis', 0);
  const v = kalender(z, -1);
  assert.equal(v.versatz, -1);
  assert.deepEqual(v.termine.map(x => [x.art, x.tag, x.slot, x.name, x.zustand, x.bericht.besucher, x.bericht.geld]),
    [['gottesdienst', 6, 'vormittag', 'Gottesdienstraum', 'vorbei', 8, b.kollekte]]);
  assert.equal(v.kaffee.length, 0);

  // Noch eine Woche später: der alte Bericht ist weg, der neue rückt nach
  zeitVorruecken(z, aus(z), 2 * WOCHE_MIN + 60 - z.minuten, () => 0);
  assert.ok(Object.values(z.berichte).every(x => x.woche >= 1), 'Berichte älter als die vorherige Woche werden gelöscht');
}

// Ausgefallene Veranstaltung: steht in der vorherigen Woche als ausgefallen, ohne Bericht
{
  const z = gemeinde();
  assert.ok(versetzen(z, z.personen[0], G.x + 4, G.y + 12), 'Pastor steht draußen');   // Pastor nicht im Raum
  zeitVorruecken(z, aus(z), WOCHE_MIN + 60 - z.minuten, () => 0);
  assert.deepEqual(kalender(z, -1).termine.map(x => [x.zustand, x.fehlt, x.bericht]), [['ausgefallen', 'leitung', null]]);
}

// Alter Spielstand ohne Berichte: nichts stürzt ab
{
  const z = gemeinde();
  zeitVorruecken(z, aus(z), SO + 16 * 60 - z.minuten, () => 0);
  delete z.berichte;
  assert.deepEqual(kalender(z, 0).termine.map(t => [t.zustand, t.bericht]), [['vorbei', null]]);
  assert.deepEqual(kalender(z, -1).termine, []);
}
console.log('Berichte im Gemeindekalender: alle Prüfungen bestanden');
