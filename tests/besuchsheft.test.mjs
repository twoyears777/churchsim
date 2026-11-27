// Prüft „Letzte Besuche“ auf der Besucherkarte (Lukas, 27.11.): Jede Person merkt sich ihre letzten 5 Besuche
// (Veranstaltung, Wochentag/Uhrzeit, Haltungsänderung wie im Bericht); Heimgeschickte stehen als eigene Zeile mit „kein Platz“.
// Starten mit: node tests/besuchsheft.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { SPEICHER_VERSION } from '../src/kern/spiel.js';
import { neuesSpiel, spielStarten } from './hilfen/ohne-erster.mjs';
import { zeitVorruecken, veranstaltungEinstellen } from '../src/kern/ablauf.js';
import { moebelSetzen } from '../src/kern/moebel.js';
import { versetzen } from '../src/kern/personen.js';
import { besuchMerken } from '../src/kern/besucher.js';
import { BESUCHSHEFT } from '../src/inhalte/besucher.js';
import { TAG_MIN, WOCHE_MIN } from '../src/kern/zeit.js';
import { AENDERUNG } from '../src/inhalte/besucher.js';

const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
const raumBei = z => { const a = aus(z); return a.liste[a.gruppe[G.x + 5 + (G.y + 5) * z.w]]; };
const SO = 6 * TAG_MIN;
const info = (z, id) => spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0.5).besucherInfo(id);

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

// Vor dem ersten Besuch: leere Liste; alter Spielstand ohne Heft geht auch
{
  const z = gemeinde();
  assert.deepEqual(info(z, 't0').letzteBesuche, []);
}

// Nach dem Gottesdienst: ein Eintrag je Person; Haltung im Heft = Summe im Bericht; Heimgeschickte mit „kein Platz“
{
  const z = gemeinde();
  zeitVorruecken(z, aus(z), SO + 16 * 60 - z.minuten, () => 0);
  const alle = z.besucher.map(b => info(z, b.id).letzteBesuche);
  assert.ok(alle.every(l => l.length === 1), 'jede Person hat genau einen Eintrag');
  const sitzend = alle.filter(l => !l[0].keinPlatz), heim = alle.filter(l => l[0].keinPlatz);
  assert.equal(sitzend.length, 8); assert.equal(heim.length, 2);
  for (const [e] of heim) assert.equal(e.haltung, AENDERUNG.heimgeschickt);
  const e = sitzend[0][0];
  assert.equal(e.artName, 'Gottesdienst'); assert.equal(e.tag, 6, 'Sonntag'); assert.equal(e.festName, null);
  assert.equal(typeof e.stunde, 'number'); assert.equal(typeof e.minute, 'number');
  const summe = alle.reduce((s, l) => s + l[0].haltung, 0);
  const bericht = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0.5).kalenderInfo(0).termine[0].bericht;
  assert.equal(summe, bericht.haltung, 'gleiche Punkte wie im Bericht');
  // Besuchszahl zählt weiter nur echte Besuche
  assert.equal(z.besucher.filter(b => b.besuche === 1).length, 8);
}

// Höchstens 5 Einträge, neueste zuerst; Level-Aufstieg wird gemerkt
{
  const b = { id: 'x' };
  for (let i = 0; i < 7; i++) besuchMerken(b, { art: 'gottesdienst', fest: null, beginn: i * WOCHE_MIN + SO + 600, haltung: i, keinPlatz: false, level: i === 6 ? 3 : null });
  assert.equal(BESUCHSHEFT.eintraege, 5);
  assert.equal(b.besuchsheft.length, 5);
  assert.deepEqual(b.besuchsheft.map(e => e.haltung), [6, 5, 4, 3, 2]);
  assert.equal(b.besuchsheft[0].level, 3);
}

console.log('Besuchsheft: alle Prüfungen bestanden');
