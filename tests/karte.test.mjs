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
