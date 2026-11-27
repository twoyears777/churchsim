// Prüft die Wochenzusammenfassung (Spielprinzip von Lukas, 27.11.2026): Montag 8:00 direkt nach den Dauerspenden, Spiel pausiert
// bis zum Schließen, Kennzahlen mit Vorwoche, Geld (inkl. Dauerspenden von heute früh), Veranstaltungen aus den Berichten,
// Gemeinde (Mitglieder, Dauerspender, Level), Bekanntheit & Heiligkeit, Monatsblick nach einem Monatsersten.
// Starten mit: node tests/wochenbericht.test.mjs
import assert from 'node:assert';
import { neuesSpiel, spielStarten } from './hilfen/ohne-erster.mjs';
import { WOCHENBERICHT } from '../src/inhalte/zeit.js';
import { SPEICHER_VERSION } from '../src/kern/spiel.js';
import { zeitVorruecken } from '../src/kern/ablauf.js';
import { erkenneRaeume } from '../src/kern/karte.js';
import { wochenberichtOffen, wochenberichtSchliessen, wochenberichtAnlegen } from '../src/kern/wochenbericht.js';
import { berichtAblegen } from '../src/kern/berichte.js';
import { buchen } from '../src/kern/finanzen.js';
import { WOCHE_MIN, TAG_MIN, zeitpunkt } from '../src/kern/zeit.js';

WOCHENBERICHT.pause = true;   // die Testhilfe schaltet die Pause für ältere Tests ab – hier wird sie geprüft
assert.equal(WOCHENBERICHT.stunde, 8);

const montag8 = w => w * WOCHE_MIN + 8 * 60;
const raeumeVon = z => { const { raeume, gruppe } = erkenneRaeume(z); return { liste: raeume, gruppe }; };
// Bis zur Zielzeit (bleibt stehen, wenn die Zusammenfassung aufgeht)
const bis = (z, ziel, zufall = () => 0.99) => { while (z.minuten < ziel) { const vor = z.minuten; zeitVorruecken(z, raeumeVon(z), Math.min(60, ziel - z.minuten), zufall); if (z.minuten === vor || wochenberichtOffen(z)) break; } };
const ruhig = z => { z.ort.leute = []; z.ortRuhig = true; return z; };

// 1) Neues Spiel (Montag 8:00): erste Zusammenfassung nach der ersten vollen Woche, ohne Vergleich; Zeit steht bis zum Schließen
{
  const z = ruhig(neuesSpiel(() => 0.99));
  assert.equal(z.minuten, montag8(0));
  assert.equal(z.wochenbericht.stand.voll, true);
  z.besucher = [
    { id: 'a', voll: 'Anna A', level: 3, zufriedenheit: 60, besuche: 2 },
    { id: 'b', voll: 'Ben B', level: 2, zufriedenheit: 90, besuche: 2 },
    { id: 'c', voll: 'Cora C', level: 3, zufriedenheit: 60, besuche: 2, mitglied: { seit: 0 } }
  ];
  delete z.wochenbericht; wochenberichtAnlegen(z);   // neues Foto mit diesen Leuten (immer noch Montag 8:00)
  // Unter der Woche: eine Veranstaltung mit Bericht, Geld, Bekanntheit, Heiligkeit, Ben steigt auf, Cora kündigt, Anna wird Mitglied
  bis(z, 2 * TAG_MIN);
  berichtAblegen(z, { id: '0:x:0', woche: 0, raum: null, platz: 0, art: 'gottesdienst', plan: { tag: 6, slot: 'vormittag' },
    bericht: { besucher: 12, kollekte: 24, haltung: 30, heiligkeit: 12, bekanntheit: 1.5 } });
  berichtAblegen(z, { id: '0:y:0', woche: 0, raum: null, platz: 1, art: 'lobpreis', plan: { tag: 3, slot: 'abend' }, ausgefallen: true, grund: 'musiker' });
  buchen(z, 'einnahmen', 'kollekte', 24); buchen(z, 'ausgaben', 'moebel', 10);
  z.bekanntheit += 1.5; z.heiligkeit += 12;
  z.besucher[1].level = 3; delete z.besucher[2].mitglied; z.besucher[0].mitglied = { seit: 0 };
  // Montag 8:00: Dauerspender zuerst (Würfel 0 → Anna und Ben werden Spender), dann die Zusammenfassung
  bis(z, montag8(1) + 60, () => 0);
  assert.equal(wochenberichtOffen(z), true);
  assert.equal(z.minuten, montag8(1));                         // genau Montag 8:00 angehalten
  const b = z.wochenbericht.bericht;
  assert.equal(b.woche, 0); assert.equal(b.vergleich, null);
  assert.deepEqual(b.kennzahlen, { ergebnis: 14, besucher: 12, bekanntheit: 1.5, heiligkeit: 12 });
  assert.equal(b.geld.summeEinnahmen, 24); assert.equal(b.geld.summeAusgaben, 10); assert.equal(b.geld.vorher, null);
  assert.equal(b.geld.heuteDauerspende, z.wochenbuch.einnahmen.dauerspende);   // die Spenden von heute früh sind schon drin
  assert.ok(b.geld.heuteDauerspende >= 40);
  // nach Tag und Tageszeit sortiert; der geplante Sonntagsgottesdienst ohne Raum steht als ausgefallen dabei (wie im Kalender)
  assert.deepEqual(b.veranstaltungen.map(v => [v.tag, v.art]), [[3, 'lobpreis'], [6, 'gottesdienst'], [6, null]]);
  assert.equal(b.veranstaltungen[2].ausgefallen, true);
  assert.equal(b.veranstaltungen[0].ausgefallen, true); assert.equal(b.veranstaltungen[0].grund, 'musiker');
  const G = b.gemeinde;
  assert.deepEqual(G.neueMitglieder.map(m => m.id), ['a']); assert.deepEqual(G.ehemaligeMitglieder.map(m => m.id), ['c']);
  assert.ok(G.neueSpender.some(s => s.id === 'a') && G.neueSpender.some(s => s.id === 'b'));
  assert.deepEqual(G.aufgestiegen.map(m => [m.id, m.vorher, m.jetzt]), [['b', 2, 3]]);
  assert.deepEqual(b.bekanntheit, { start: b.bekanntheit.start, ende: b.bekanntheit.start + 1.5 });
  // Zeit steht, solange sie offen ist
  const jetzt = z.minuten;
  zeitVorruecken(z, raeumeVon(z), 120); assert.equal(z.minuten, jetzt);
  wochenberichtSchliessen(z);
  zeitVorruecken(z, raeumeVon(z), 120); assert.equal(z.minuten, jetzt + 120);
  // 2) Nächster Montag: Vergleich mit der Vorwoche, keine neuen Leute
  bis(z, montag8(2) + 60, () => 0.99);
  assert.equal(wochenberichtOffen(z), true);
  const b2 = z.wochenbericht.bericht;
  assert.equal(b2.woche, 1);
  assert.deepEqual(b2.vergleich, b.kennzahlen);
  assert.equal(b2.gemeinde.neueMitglieder.length, 0); assert.equal(b2.gemeinde.neueSpender.length, 0);
  assert.equal(b2.geld.vorher.saldo, 14);
  wochenberichtSchliessen(z);
}
console.log('Wochenzusammenfassung: Zeitpunkt, Pause, Kennzahlen, Geld, Veranstaltungen, Gemeinde, Vergleich bestanden.');

// 3) Monatsblick: nach einem Monatsersten stehen die Mitgliedsbeiträge in der nächsten Zusammenfassung
{
  const z = ruhig(neuesSpiel(() => 0.99));
  z.besucher = [{ id: 'm', voll: 'Mia M', level: 4, zufriedenheit: 10, besuche: 3, mitglied: { seit: 0 } },
    { id: 'n', voll: 'Nils N', level: 4, zufriedenheit: 10, besuche: 3, mitglied: { seit: 0 } }];
  let gesehen = 0, ohne = 0;
  for (let w = 1; w <= 10; w++) {
    bis(z, montag8(w) + 1, () => 0.99);
    assert.equal(wochenberichtOffen(z), true, `Woche ${w}`);
    const m = z.wochenbericht.bericht.monat;
    if (m) {
      gesehen++;
      assert.equal(m.anzahl, 2); assert.equal(m.beitrag, 10); assert.equal(m.summe, 20);
      if (gesehen > 1) assert.deepEqual({ ...m.vorher, key: undefined }, { key: undefined, anzahl: 2, beitrag: 10, summe: 20 });
    } else ohne++;
    wochenberichtSchliessen(z);
  }
  assert.ok(gesehen >= 2 && ohne >= 5, `${gesehen} mit, ${ohne} ohne Monatsblick`);   // in 10 Wochen liegen 2–3 Monatserste
}
console.log('Monatsblick bestanden.');

// 4) Alter Spielstand mitten in der Woche: am nächsten Montag nur ein Foto, die erste Zusammenfassung eine Woche später
{
  const z = ruhig(neuesSpiel(() => 0.99));
  delete z.wochenbericht;
  z.minuten = 3 * WOCHE_MIN + 3 * TAG_MIN;   // Donnerstag der 4. Woche
  wochenberichtAnlegen(z);
  assert.equal(z.wochenbericht.stand.voll, false);
  bis(z, montag8(4) + 60);
  assert.equal(wochenberichtOffen(z), false); assert.equal(z.minuten, montag8(4) + 60);
  bis(z, montag8(5) + 60);
  assert.equal(wochenberichtOffen(z), true); assert.equal(z.wochenbericht.bericht.woche, 4);
}
console.log('Alte Spielstände bestanden.');

// 5) Schalterwand: lage().wochenbericht, wochenberichtInfo() (Wochen ab 1, Namen), tick steht, wochenberichtWeiter()
{
  const zustand = ruhig(neuesSpiel(() => 0.99));
  const spiel = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand }), () => 0.99);
  assert.equal(spiel.wochenberichtInfo(), null);
  spiel.tempoSetzen(50);
  for (let i = 0; i < 5000 && !spiel.lage().wochenbericht; i++) spiel.tick(0.25);
  assert.equal(spiel.lage().wochenbericht, true);
  assert.equal(spiel.lage().tag, 0); assert.equal(spiel.lage().stunde, 8);
  const info = spiel.wochenberichtInfo();
  assert.equal(info.woche, 1); assert.equal(info.offen, true);
  assert.ok(info.namen.einnahmen.dauerspende && info.namen.ausgaben.moebel);
  assert.equal(spiel.tick(1), false);                            // Zeit steht
  assert.equal(spiel.wochenberichtWeiter(), 'ok');
  assert.equal(spiel.lage().wochenbericht, false);
  assert.equal(spiel.tick(1), true);
  assert.equal(spiel.wochenberichtInfo().woche, 1);              // der letzte Bericht bleibt gespeichert
  assert.equal(zeitpunkt(0).woche, 0);
}
console.log('Schalterwand bestanden.');
