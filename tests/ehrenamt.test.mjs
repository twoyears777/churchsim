// Prüft das Ehrenamts-Balancing (Lukas, 27.11.2026): Chance ab 2 Besuchen, höchstens 1 neuer Ehrenamtlicher pro Veranstaltung,
// Bremse (höchstens 1 Ehrenamtlicher je 5 Besucher), „sicher“ einer nach 3 Wochen ohne neuen, solange es weniger als 5 sind.
// Dazu: Ehrenamtliche zählen nicht mehr zum Einzugsgebiet; Zeit-Knöpfe Pause/x1/x2/x10/x25/x50, 24 Sekunden pro Spielstunde.
// Starten mit: node tests/ehrenamt.test.mjs
import assert from 'node:assert';
import { EHRENAMT, EHRENAMT_AB_BESUCHEN, EHRENAMT_QUOTE } from '../src/inhalte/besucher.js';
import { TEMPI, SEKUNDEN_PRO_STUNDE, LAUFTEMPO } from '../src/inhalte/zeit.js';
import { TEXTE } from '../src/inhalte/texte.js';
import { ehrenamtWerden, ehrenamtFrei, ehrenamtFaellig } from '../src/kern/besucher.js';
import { erreicht } from '../src/kern/einzugsgebiet.js';
import { zeitAnlegen, WOCHE_MIN } from '../src/kern/zeit.js';

assert.deepEqual(EHRENAMT, { besucherJeEA: 5, proVeranstaltung: 1, sicher: { wochen: 3, bisAnzahl: 5 } });
assert.equal(EHRENAMT_AB_BESUCHEN, 2); assert.equal(EHRENAMT_QUOTE, 0.05);

const leute = (n, besuche = 5) => Array.from({ length: n }, (_, i) => ({ id: 'b' + i, voll: 'B ' + i, besuche }));
const eas = n => Array.from({ length: n }, (_, i) => ({ id: 'e' + i, daten: { art: 'ehrenamt' } }));
const spiel = (besucher, ea, minuten = 0, letzterEA = 0) => ({ besucher: leute(besucher), personen: [{ id: 'pastor', daten: { art: 'hauptamt' } }, ...eas(ea)], minuten, letzterEA });

// Bremse: 1 Ehrenamtlicher je 5 Besucher
assert.equal(ehrenamtFrei(spiel(14, 1)), 1); assert.equal(ehrenamtFrei(spiel(14, 2)), 0); assert.equal(ehrenamtFrei(spiel(4, 0)), 0); assert.equal(ehrenamtFrei(spiel(40, 3)), 5);

// Alle würfeln „ja“ – trotzdem höchstens 1 pro Veranstaltung
{
  const z = spiel(30, 1), da = [...z.besucher];
  const neu = ehrenamtWerden(z, da, () => 0);
  assert.equal(neu.length, 1); assert.equal(z.besucher.length, 29); assert.ok(!z.besucher.includes(neu[0]));
  assert.equal(z.letzterEA, z.minuten);
}
// Bremse erreicht: niemand, auch wenn alle „ja“ würfeln
{
  const z = spiel(10, 6);
  assert.deepEqual(ehrenamtWerden(z, [...z.besucher], () => 0), []); assert.equal(z.besucher.length, 10);
}
// Erst ab 2 Besuchen
{
  const z = spiel(30, 1); z.besucher.forEach(b => { b.besuche = 1; });
  assert.deepEqual(ehrenamtWerden(z, [...z.besucher], () => 0), []);
  z.besucher[7].besuche = 2;
  assert.deepEqual(ehrenamtWerden(z, [...z.besucher], () => 0).map(b => b.id), ['b7']);
}
// Sicher: 3 Wochen kein neuer und weniger als 5 → einer wird es, auch ohne Würfelglück und über die Bremse hinweg
{
  const z = spiel(6, 3, 3 * WOCHE_MIN, 0);
  assert.equal(ehrenamtFaellig(z), true); assert.equal(ehrenamtFrei(z), 0);
  const neu = ehrenamtWerden(z, [...z.besucher], () => 0.99);
  assert.equal(neu.length, 1); assert.equal(z.letzterEA, 3 * WOCHE_MIN);
  z.personen.push(...eas(1)); z.minuten += WOCHE_MIN;
  assert.equal(ehrenamtFaellig(z), false);                                   // erst wieder nach 3 Wochen
  assert.deepEqual(ehrenamtWerden(z, [...z.besucher], () => 0.99), []);
}
// Sicher: am liebsten jemand mit genug Besuchen, sonst irgendein Anwesender; ab 5 Ehrenamtlichen nicht mehr
{
  const z = spiel(6, 2, 3 * WOCHE_MIN, 0); z.besucher.forEach(b => { b.besuche = 0; }); z.besucher[4].besuche = 3;
  assert.deepEqual(ehrenamtWerden(z, [...z.besucher], () => 0.99).map(b => b.id), ['b4']);
  const y = spiel(6, 2, 3 * WOCHE_MIN, 0); y.besucher.forEach(b => { b.besuche = 0; });
  assert.equal(ehrenamtWerden(y, [...y.besucher], () => 0.99).length, 1);
  const x = spiel(6, 5, 9 * WOCHE_MIN, 0);
  assert.equal(ehrenamtFaellig(x), false); assert.deepEqual(ehrenamtWerden(x, [...x.besucher], () => 0.99), []);
  const w = spiel(6, 2, 3 * WOCHE_MIN, 0);
  assert.deepEqual(ehrenamtWerden(w, [], () => 0.99), []);                    // niemand da: niemand wird es
}
// Alter Spielstand ohne Merker: die 3 Wochen zählen ab jetzt
{
  const z = spiel(6, 2, 50 * WOCHE_MIN); delete z.letzterEA;
  assert.equal(ehrenamtFaellig(z), false); assert.equal(z.letzterEA, 50 * WOCHE_MIN);
}
console.log('Ehrenamts-Tests bestanden.');

// Einzugsgebiet: Ehrenamtliche zählen nicht mit
assert.equal(erreicht({ besucher: leute(7), ort: { leute: leute(3) }, personen: eas(9) }), 10);

// Zeit: 24 Sekunden pro Spielstunde, Knöpfe ohne x5 und mit x50; Figuren bei x1 weiter 1,25 Kästchen pro Sekunde
assert.equal(SEKUNDEN_PRO_STUNDE, 24); assert.deepEqual(TEMPI, [0, 1, 2, 10, 25, 50]);
assert.deepEqual(Object.keys(TEXTE.tempo).map(Number).sort((a, b) => a - b), TEMPI);
assert.equal(LAUFTEMPO * 60 / SEKUNDEN_PRO_STUNDE, 1.25);
{ const z = { tempo: 5 }; zeitAnlegen(z); assert.equal(z.tempo, 1); const y = { tempo: 50 }; zeitAnlegen(y); assert.equal(y.tempo, 50); }
console.log('Einzugsgebiet- und Zeit-Tests bestanden.');
