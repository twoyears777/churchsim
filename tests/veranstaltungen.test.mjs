// Prüft mehrere Veranstaltungen pro Raum, den Lobpreisgottesdienst und das Bekanntheit-Protokoll.
// Starten mit: node tests/veranstaltungen.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { ZWEITER_BESUCH } from '../src/inhalte/veranstaltungen.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel, spielStarten, spielAnlegen } from '../src/kern/spiel.js';
import { zeitVorruecken, veranstaltungEinstellen, terminEinstellen, programmVon, gottesdienstRaeume, termineDerWoche, prognose } from '../src/kern/ablauf.js';
import { moebelSetzen, moebelAbreissen } from '../src/kern/moebel.js';
import { versetzen } from '../src/kern/personen.js';
import { besuchChance, kommChance, lobpreisVorliebe } from '../src/kern/besucher.js';
import { TAG_MIN, WOCHE_MIN } from '../src/kern/zeit.js';
import { besucherPositionen } from '../src/kern/bewegung.js';
import { kaffeeZahlen } from '../src/kern/kirchkaffee.js';

const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
const raumBei = z => { const a = aus(z); return a.liste[a.gruppe[G.x + 5 + (G.y + 5) * z.w]]; };
const SO = 6 * TAG_MIN;

// Gottesdienstraum mit 10 Stühlen, Pastor, Kanzel, Altar, Gitarre; 10 Besucher mit Haltung 100.
// Die ersten 5 lieben Lobpreis (100 %), die anderen 5 gar nicht (0 %).
function gemeinde() {
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 15, G.y + 3);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  z.besucher = Array.from({ length: 10 }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X',
    zufriedenheit: 100, kaffeeWert: 0, besuche: 0, lobpreis: i < 5 ? 1 : 0 }));
  z.bekanntheit = 0; z.ortRuhig = true; z.konto = 1000;
  return z;
}
const ausstatten = z => {
  moebelSetzen(z, 'kanzel', G.x + 10, G.y + 6, G.x + 10, G.y + 6);
  moebelSetzen(z, 'altar', G.x + 12, G.y + 6, G.x + 12, G.y + 6);
  moebelSetzen(z, 'gitarre', G.x + 14, G.y + 6, G.x + 14, G.y + 6);
};

// Alte Spielstände: Art als Text + ein Termin für alle → Veranstaltung 1 mit derselben Zeit
{
  const z = gemeinde(), r = raumBei(z);
  for (const c of r.zellen) z.veranstaltung[c] = 'gottesdienst';
  z.plan = { tag: 3, slot: 'nachmittag' };
  assert.deepEqual(programmVon(z, r), [{ art: 'gottesdienst', tag: 3, slot: 'nachmittag' }, { art: null, tag: 6, slot: 'abend' }]);
  // ein laufender alter Termin (z.lauf) wird übernommen
  const alt = gemeinde(); delete alt.laeufe; alt.lauf = { woche: 0, beginn: SO + 600, phase: 'anreise', gaeste: null, start: 0 };
  spielAnlegen(alt);
  assert.equal(alt.laeufe.length, 1); assert.equal('lauf' in alt, false);
}
console.log('Umstellungs-Tests bestanden.');

// Veranstaltung 2: erst mit Kanzel und Altar frei; gleiche Zeit im selben Raum geht nicht
{
  const z = gemeinde(), r = raumBei(z);
  veranstaltungEinstellen(z, r, 'gottesdienst');
  assert.equal(gottesdienstRaeume(z, aus(z))[0].programm[1].frei, false);
  ausstatten(z);
  assert.equal(gottesdienstRaeume(z, aus(z))[0].programm[1].frei, true);
  veranstaltungEinstellen(z, raumBei(z), 'lobpreis', 1);
  assert.equal(terminEinstellen(z, raumBei(z), 1, 6, 'vormittag'), 'belegt');
  assert.equal(terminEinstellen(z, raumBei(z), 1, 6, 'abend'), 'ok');
  assert.deepEqual(termineDerWoche(z, aus(z), 0).map(t => [t.art, t.plan.slot]), [['gottesdienst', 'vormittag'], ['lobpreis', 'abend']]);
}
console.log('Platz-Tests bestanden.');

// Zwei Veranstaltungen an einem Sonntag: Gottesdienst 10 Uhr, Lobpreisgottesdienst 19 Uhr
{
  const z = gemeinde(), r = raumBei(z);
  ausstatten(z);
  veranstaltungEinstellen(z, r, 'gottesdienst');
  veranstaltungEinstellen(z, raumBei(z), 'lobpreis', 1);
  terminEinstellen(z, raumBei(z), 1, 6, 'abend');
  // Vormittag: alle 10 kommen (Haltung 100, Zufall 0)
  zeitVorruecken(z, aus(z), SO + 10 * 60 + 190 - z.minuten, () => 0);
  assert.equal(z.letzterGottesdienst.besucher, 10);
  const kollekteVormittag = z.wochenbuch.einnahmen.kollekte;
  assert.ok(kollekteVormittag > 0);
  // Abend: Chance = Haltung × Vorliebe × 0,5 (schon da gewesen). Zufall 0,4: Lobpreis-Fans (0,5) kommen, die anderen (0) nicht.
  const b0 = z.besucher[0], b9 = z.besucher[9];
  assert.equal(besuchChance(b0, { art: 'lobpreis', woche: 0 }), kommChance(b0) * 1 * ZWEITER_BESUCH);
  assert.equal(besuchChance(b9, { art: 'lobpreis', woche: 0 }), 0);
  const haltungVorher = z.besucher.map(b => b.zufriedenheit);
  zeitVorruecken(z, aus(z), SO + 19 * 60 + 190 - z.minuten, () => 0.4);
  assert.equal(z.letzterGottesdienst.besucher, 5);
  assert.equal(z.letzterGottesdienst.platz, 1);
  // Am Abend kommt Kollekte dazu (ohne Sonntagvormittag-Bonus)
  assert.ok(z.wochenbuch.einnahmen.kollekte > kollekteVormittag);
  assert.deepEqual(z.besucher.map(b => b.zufriedenheit), haltungVorher);   // Haltung war schon 100 (Obergrenze)
}
console.log('Zwei-Veranstaltungen-Tests bestanden.');

// Haltung nach Lobpreis-Vorliebe: 100 % → +10, 0 % → 0 (statt fest +5)
{
  const z = gemeinde(), r = raumBei(z);
  ausstatten(z);
  veranstaltungEinstellen(z, r, 'lobpreis');
  z.besucher.forEach(b => { b.zufriedenheit = 50; b.lobpreis = 1; });
  z.besucher[9].lobpreis = 0.5;
  zeitVorruecken(z, aus(z), SO + 10 * 60 + 190 - z.minuten, () => 0);
  // Fans: +5 Sitzplatz +10 Lobpreis; Besucher 9 (50 %): +5 +5. (Kanzel/Blumen bringen Haltung über den Stuhl-Bonus.)
  const fan = z.besucher[0].zufriedenheit, halb = z.besucher[9].zufriedenheit;
  assert.equal(fan - halb, 5);
}
console.log('Lobpreis-Haltungs-Tests bestanden.');

// Ausfälle: Lobpreis ohne Gitarre; Veranstaltung 2 ohne Kanzel/Altar bleibt eingestellt, fällt aber aus
{
  const z = gemeinde(), r = raumBei(z);
  veranstaltungEinstellen(z, r, 'lobpreis');
  assert.equal(gottesdienstRaeume(z, aus(z))[0].programm[0].fehlt, 'gitarre');
  ausstatten(z);
  veranstaltungEinstellen(z, raumBei(z), 'gottesdienst');
  veranstaltungEinstellen(z, raumBei(z), 'gottesdienst', 1);
  terminEinstellen(z, raumBei(z), 1, 6, 'abend');
  moebelAbreissen(z, G.x + 10, G.y + 6, G.x + 10, G.y + 6);   // Kanzel weg
  const p = gottesdienstRaeume(z, aus(z))[0].programm;
  assert.equal(p[0].bereit, true); assert.equal(p[1].art, 'gottesdienst'); assert.equal(p[1].fehlt, 'gesperrt');
  const spiel = spielStarten(JSON.stringify({ version: 3, zustand: z }), () => 0);
  zeitVorruecken(z, aus(z), SO + 19 * 60 + 1 - z.minuten, () => 0);
  assert.equal(z.letzterGottesdienst.ausgefallen, true); assert.equal(z.letzterGottesdienst.grund, 'gesperrt');
  assert.ok(spiel.raumInfo(spiel.raumNrBei(G.x + 5, G.y + 5)).programm[1].nutzbar, 'bleibt einstellbar');
}
console.log('Ausfall-Tests bestanden.');

// Prognose je Veranstaltung; Lobpreis-Vorliebe ist fest und liegt zwischen 0 und 1
{
  const z = gemeinde(), r = raumBei(z);
  ausstatten(z);
  veranstaltungEinstellen(z, r, 'gottesdienst');
  veranstaltungEinstellen(z, raumBei(z), 'lobpreis', 1);
  terminEinstellen(z, raumBei(z), 1, 6, 'abend');
  const nr = raumBei(z).nr;
  assert.equal(prognose(z, aus(z), nr, 0).erwartet, 10);
  assert.equal(prognose(z, aus(z), nr, 1).erwartet, 5);   // nur die Lobpreis-Fans
  const p = { id: 'b77', voll: 'Erna Muster' };
  assert.equal(lobpreisVorliebe(p), lobpreisVorliebe({ ...p }));
  assert.ok(lobpreisVorliebe(p) >= 0 && lobpreisVorliebe(p) <= 1);
}
console.log('Prognose-Tests bestanden.');

// Bekanntheit: langsam (Gottesdienst +0,6) und mit Protokoll; Wochenverlauf
{
  const z = gemeinde();
  veranstaltungEinstellen(z, raumBei(z), 'gottesdienst');
  zeitVorruecken(z, aus(z), WOCHE_MIN + 60 - z.minuten, () => 0);
  // 10 Besucher mit Haltung 100: +0,6 Gottesdienst + 10 × 0,2 sehr zufrieden
  assert.equal(z.bekanntheit, 2.6);
  assert.deepEqual(z.bekanntheitLog.map(e => [e.quelle, e.wert, e.anzahl]), [['zufrieden', 2, 10], ['gottesdienst', 0.6, null]]);
  assert.deepEqual(z.bekanntheitVerlauf, [{ woche: 0, wert: 2.6 }]);
  const info = spielStarten(JSON.stringify({ version: 3, zustand: z }), () => 0).bekanntheitInfo();
  assert.equal(info.verlauf.length, 2); assert.equal(info.protokoll[0].quelle, 'zufrieden');
}
console.log('Bekanntheit-Tests bestanden.');

// Neues Spiel: Pastor und Frau des Pastors (Ehrenamtliche); alte Spielstände bekommen niemanden dazu
{
  const z = neuesSpiel(() => 0.3);
  const ea = z.personen.filter(p => p.daten && p.daten.art === 'ehrenamt');
  assert.equal(z.personen.length, 2); assert.equal(ea.length, 1);
  assert.deepEqual([ea[0].daten.name, ea[0].daten.kuerzel, ea[0].daten.start], ['Frau des Pastors', 'F', true]);
  assert.ok(!(ea[0].x === z.personen[0].x && ea[0].y === z.personen[0].y)); // steht nicht auf dem Pastor
  z.personen = z.personen.filter(p => p.id === 'pastor');
  const neu = spielStarten(JSON.stringify({ version: 3, zustand: z }), () => 0);
  assert.equal(neu.lage().personen.length, 1);
}
console.log('Frau-des-Pastors-Tests bestanden.');

// Nach dem Gottesdienst: Wer keinen Kaffee will, geht gleich heim (nicht erst nach dem Kirchkaffee);
// über jedem Kopf erscheint kurz seine Kollekte (zusammen = gebuchte Kollekte).
{
  const z = gemeinde(), r = raumBei(z);
  veranstaltungEinstellen(z, r, 'gottesdienst');
  const speicher = new Map(), sitzen = () => besucherPositionen(z, speicher).filter(b => b.sitzt).length;
  while (z.minuten < SO + 10 * 60 + 59) zeitVorruecken(z, aus(z), 1, () => 0);
  assert.equal(sitzen(), 10);
  assert.equal(kaffeeZahlen(z).length, 0);
  zeitVorruecken(z, aus(z), 2, () => 0);                                  // 11:01: Gottesdienst zu Ende
  const zahlen = kaffeeZahlen(z);
  assert.equal(zahlen.length, 10);
  const L = z.laeufe[0];
  assert.deepEqual(zahlen.map(e => `${e.x},${e.y}`).sort(), L.gaeste.map(g => `${g.sitz.x},${g.sitz.y}`).sort());
  assert.equal(Math.round(zahlen.reduce((s, e) => s + e.betrag, 0)), z.wochenbuch.einnahmen.kollekte);
  zeitVorruecken(z, aus(z), 30, () => 0);
  assert.equal(sitzen(), 0);                                              // alle auf dem Heimweg
  assert.equal(L.phase, 'kirchkaffee');                                    // Abschluss (Zufriedenheit) bleibt bei +180
  while (z.minuten < SO + 14 * 60 + 30) zeitVorruecken(z, aus(z), 1, () => 0);
  assert.equal(z.laeufe.length, 1);                                       // der Ablauf läuft noch (Heimweg-Frist bis 15:00) ...
  assert.equal(besucherPositionen(z, speicher).length, 0);                // ... aber alle sind schon zu Hause
}
console.log('Heimweg- und Kollekte-Zahlen-Tests bestanden.');

// Anbauen (Nachbarraum mit Tür zum Gottesdienstraum) darf die Einstellungen nicht zurücksetzen
{
  const z = gemeinde();
  veranstaltungEinstellen(z, raumBei(z), 'gottesdienst', 0);
  assert.equal(terminEinstellen(z, raumBei(z), 0, 5, 'abend'), 'ok');
  veranstaltungEinstellen(z, raumBei(z), 'lobpreis', 1);
  const vorher = JSON.stringify(programmVon(z, raumBei(z)));
  z.kaffeeZeiten = {}; for (const c of raumBei(z).zellen) z.kaffeeZeiten[c] = [{ tag: 6, slot: 'mittag' }];
  wandRechteck(z, G.x + 18, G.y + 2, G.x + 26, G.y + 8);        // Nachbarraum an der rechten Wand
  tuerUmschalten(z, G.x + 18, G.y + 5);                          // Tür zwischen beiden Räumen
  tuerUmschalten(z, G.x + 22, G.y + 8);                          // Außentür des Nachbarraums
  assert.equal(raumTypVon(z, raumBei(z)).id, 'gottesdienst');
  assert.equal(JSON.stringify(programmVon(z, raumBei(z))), vorher);
  assert.deepEqual(z.kaffeeZeiten[raumBei(z).zellen[0]], [{ tag: 6, slot: 'mittag' }]);
  tuerUmschalten(z, G.x + 18, G.y + 5);                          // Tür wieder zu Wand: bleibt auch
  assert.equal(JSON.stringify(programmVon(z, raumBei(z))), vorher);
}
console.log('Anbau-Test bestanden.');
