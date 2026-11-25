// Prüft die Spiellogik. Starten mit: node tests/karte.test.mjs
import assert from 'node:assert';
import { RAUMTYPEN } from '../src/inhalte/raumtypen.js';
import { neuerZustand, wandRechteck, abriss, tuerUmschalten, erkenneRaeume, passtGroesse, pruefeRaum, typZuweisen, raumTypVon } from '../src/kern/karte.js';

const T = RAUMTYPEN[0];
let z = neuerZustand();
wandRechteck(z, 2, 2, 18, 8);                       // innen 15 × 5
let r = erkenneRaeume(z).raeume;
assert.equal(r.length, 1); assert.equal(r[0].zellen.length, 75);
assert.deepEqual(pruefeRaum(z, r[0], T), ['tuer']);
tuerUmschalten(z, 2, 5);
r = erkenneRaeume(z).raeume;
assert.deepEqual(pruefeRaum(z, r[0], T), []);
typZuweisen(z, r[0], 'gottesdienst');
assert.equal(raumTypVon(z, r[0]).id, 'gottesdienst');
wandRechteck(z, 2, 2, 18, 8);                       // erneut bauen: Tür und Funktion bleiben
r = erkenneRaeume(z).raeume;
assert.equal(raumTypVon(z, r[0]).id, 'gottesdienst');

const z2 = neuerZustand(); wandRechteck(z2, 2, 2, 17, 8); tuerUmschalten(z2, 2, 5);
assert.deepEqual(pruefeRaum(z2, erkenneRaeume(z2).raeume[0], T), ['groesse']); // 14 × 5 zu klein

const z3 = neuerZustand(); wandRechteck(z3, 2, 2, 8, 18);
assert.ok(passtGroesse(z3, erkenneRaeume(z3).raeume[0].zellen, 5, 15));       // hochkant geht auch

abriss(z, 0, 0, 47, 31);
assert.equal(erkenneRaeume(z).raeume.length, 0); assert.deepEqual(z.raumTyp, {});
console.log('Alle Tests bestanden.');
