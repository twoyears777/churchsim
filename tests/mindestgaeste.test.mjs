// Prüft die Mindestgäste im Kirchkaffee (Lukas, 27.11.): Zu jeder eigenen Öffnungszeit kommt eine Mindestzahl an Gästen,
// je nach Angebot (Grund + Sitzplätze + Tische + Automaten + weitere Theken). Wer von selbst kommt, zählt mit.
// Extra-Gäste kommen durchs Tor – zuerst bekannte Leute, sonst neue (nur mit Platz im Einzugsgebiet).
// Starten mit: node tests/mindestgaeste.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { MINDESTGAESTE } from '../src/inhalte/kirchkaffee.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel } from './hilfen/ohne-erster.mjs';
import { zeitVorruecken } from '../src/kern/ablauf.js';
import { moebelKaufen } from '../src/kern/moebel.js';
import { versetzen, personHinzufuegen } from '../src/kern/personen.js';
import { schichtHinzufuegen, mindestgaesteTeile, passantKommt } from '../src/kern/kirchkaffee.js';
import { TAG_MIN } from '../src/kern/zeit.js';
import { dienstTermine, stelleSetzen } from '../src/kern/dienst.js';

MINDESTGAESTE.an = true;   // die Testhilfe schaltet sie für ältere Tests ab
const DI = 1 * TAG_MIN;
function kirchkaffee() {
  const z = neuesSpiel(() => 0.9);
  z.ortRuhig = true;                                                  // keine Passanten: nur Extra-Gäste kommen
  const aus = () => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
  const raumBei = (x, y) => { const a = aus(); return a.liste[a.gruppe[x + y * z.w]]; };
  // wie in kirchkaffee.test.mjs: Gottesdienstraum links, Kirchkaffee rechts daneben (Inneres x 19–25, y 3–9)
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 10); tuerUmschalten(z, G.x + 2, G.y + 5);
  wandRechteck(z, G.x + 18, G.y + 2, G.x + 26, G.y + 10); tuerUmschalten(z, G.x + 18, G.y + 5);
  typZuweisen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst'); typZuweisen(z, raumBei(G.x + 20, G.y + 5), 'kirchkaffee');
  z.konto = 1000;
  assert.equal(moebelKaufen(z, 'kaffeemaschine', G.x + 20, G.y + 3), 'ok');
  assert.equal(moebelKaufen(z, 'theke', G.x + 22, G.y + 3), 'ok');
  const ea = personHinzufuegen(z, { name: 'Helfer', kuerzel: 'H', art: 'ehrenamt' });
  versetzen(z, ea, G.x + 25, G.y + 4);
  const kk = () => raumBei(G.x + 20, G.y + 5);
  return { z, aus, kk };
}
const bis = (z, aus, minute) => { while (z.minuten < minute) zeitVorruecken(z, aus(), Math.min(1, minute - z.minuten), () => 0.99); };
const stand = z => Object.values(z.kaffee.mindest || {})[0];

// Angebot: Grund 2, je 2 Stühle +1, Tisch mit Stuhl daneben +1, Automat +1, weitere Theke +1
{
  const { z, kk } = kirchkaffee();
  assert.deepEqual(mindestgaesteTeile(z, kk()), { teile: { grund: 2, sitzplaetze: 0, tische: 0, automaten: 0, theken: 0 }, summe: 2 });
  for (let i = 0; i < 5; i++) assert.equal(moebelKaufen(z, 'stuhl', G.x + 19 + i, G.y + 9), 'ok');
  assert.equal(moebelKaufen(z, 'tisch', G.x + 19, G.y + 8), 'ok');         // grenzt an einen Stuhl
  assert.equal(moebelKaufen(z, 'tisch', G.x + 25, G.y + 9), 'ok');         // ohne Stuhl daneben: zählt nicht
  assert.equal(moebelKaufen(z, 'getraenkeautomat', G.x + 25, G.y + 7), 'ok');
  assert.equal(moebelKaufen(z, 'kaffeemaschine', G.x + 20, G.y + 6), 'ok');
  assert.equal(moebelKaufen(z, 'theke', G.x + 22, G.y + 6), 'ok');
  const m = mindestgaesteTeile(z, kk());
  assert.deepEqual(m.teile, { grund: 2, sitzplaetze: 2, tische: 1, automaten: 1, theken: 1 });
  assert.equal(m.summe, 7);
}
console.log('Mindestgäste: Angebot-Tests bestanden.');

// Ohne Passanten kommen zur Öffnungszeit genau so viele Gäste extra, über die Zeit verteilt; nach dem Gottesdienst nicht
{
  const { z, aus, kk } = kirchkaffee();
  const vorher = z.besucher.length + (z.ort ? z.ort.leute.length : 0);
  assert.equal(schichtHinzufuegen(z, kk(), 1, 'vormittag'), 'ok');        // Dienstag 10–15 Uhr
  bis(z, aus, DI + 10 * 60 + 30);
  assert.equal(stand(z).soll, MINDESTGAESTE.grund);
  assert.equal(stand(z).gekommen, 0);                                      // der 1. Termin liegt bei ca. 11:00
  bis(z, aus, DI + 12 * 60);
  assert.equal(stand(z).gekommen, 1);
  bis(z, aus, DI + 14 * 60);
  assert.equal(stand(z).gekommen, 2);
  const ids = new Set(z.kaffee.kunden.map(k => k.id));
  assert.ok(ids.size >= 1);
  assert.ok([...ids].every(id => z.besucher.some(b => b.id === id) || z.ort.leute.some(p => p.id === id)));
  assert.equal(z.besucher.length + z.ort.leute.length, vorher);           // zuerst bekannte Leute, keine neuen nötig
  bis(z, aus, DI + 16 * 60);
  assert.equal(Object.keys(z.kaffee.mindest).length, 0);                   // nach der Öffnungszeit aufgeräumt
}
console.log('Mindestgäste: Extra-Gäste-Tests bestanden.');

// Wer von selbst kommt, zählt mit – dann kommt niemand extra
{
  const { z, aus, kk } = kirchkaffee();
  schichtHinzufuegen(z, kk(), 1, 'vormittag');
  bis(z, aus, DI + 10 * 60 + 5);
  const a = z.besucher[0], b = z.besucher[1];
  assert.ok(passantKommt(z, aus(), { id: a.id, name: a.vorname }));
  assert.ok(passantKommt(z, aus(), { id: b.id, name: b.vorname }));
  assert.equal(stand(z).gekommen, 2);
  bis(z, aus, DI + 14 * 60);
  assert.equal(stand(z).gekommen, 2);
  assert.ok(z.kaffee.kunden.every(k => k.id === a.id || k.id === b.id));
}
console.log('Mindestgäste: Selbst-gekommen-Tests bestanden.');

// Keine bekannten Leute frei: neue Menschen, aber nur mit Platz im Einzugsgebiet
{
  const { z, aus, kk } = kirchkaffee();
  z.besucher = []; z.ort.leute = [];
  schichtHinzufuegen(z, kk(), 1, 'vormittag');
  bis(z, aus, DI + 14 * 60);
  assert.equal(stand(z).gekommen, 2);
  assert.equal(z.ort.leute.length, 2);
}
console.log('Mindestgäste: Einzugsgebiet-Tests bestanden.');
// Mit Dienstplan (Schichtbetrieb, 27.11.): Mindestgäste kommen erst, wenn der eingeteilte Ehrenamtliche da ist;
// ohne Einteilung hat das Kirchkaffee zu und niemand kommt extra
{
  const lauf = einteilen => {
    const { z, aus, kk } = kirchkaffee();
    z.schichtbetrieb = true;
    schichtHinzufuegen(z, kk(), 1, 'vormittag');
    const t = dienstTermine(z, aus()).find(x => x.art === 'kaffee' && x.tag === 1 && x.slot === 'vormittag');
    if (einteilen) assert.equal(stelleSetzen(z, aus(), t.key, t.stellen[0].id, z.personen.find(p => p.daten && p.daten.name === 'Helfer').id), 'ok');
    bis(z, aus, DI + 14 * 60);
    return z;
  };
  assert.equal(stand(lauf(true)).gekommen, MINDESTGAESTE.grund);
  const ohne = lauf(false);
  assert.ok(!stand(ohne));
  assert.equal(ohne.kaffee.kunden.length, 0);
}
console.log('Mindestgäste: Dienstplan-Tests bestanden.');
console.log('Alle Mindestgäste-Tests bestanden.');
