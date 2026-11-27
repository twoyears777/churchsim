// Prüft das Versetzen von Mitarbeitern (27.11., Hinweis von Lukas: „springen erst 1–2 Sekunden später an den Ort“):
// Wer gerade zur Evangelisation oder für das Kirchkaffee unterwegs ist, steht nach dem Versetzen sofort am neuen Platz –
// auch bei Pause.
// Starten mit: node tests/versetzen.test.mjs
import assert from 'node:assert';
import { spielStarten } from './hilfen/ohne-erster.mjs';
import { neuesSpiel } from './hilfen/ohne-erster.mjs';
import { kaffeeVersetzt } from '../src/kern/kirchkaffee.js';

const nah = (e, x, y) => Math.hypot(e.x - x, e.y - y) < 1e-6;

// Ehrenamtlicher bei der Evangelisation: laufen lassen, bis er weit weg von seinem Platz ist
for (const pause of [false, true]) {
  const s = spielStarten(null, () => 0.5);
  s.tempoSetzen(1);
  const ea = () => s.karte().personen.find(p => p.art === 'ehrenamt');
  let n = 0;
  while (n++ < 20000) { s.tick(0.25); const e = ea(); if (Math.hypot(e.x - e.feldX, e.y - e.feldY) > 5) break; }
  const e = ea();
  assert.ok(Math.hypot(e.x - e.feldX, e.y - e.feldY) > 5, 'ist zur Evangelisation unterwegs');
  if (pause) s.tempoSetzen(0);
  const ziel = { x: e.feldX + 3, y: e.feldY };
  assert.ok(s.personVersetzen(e.id, ziel.x, ziel.y));
  const danach = ea();
  assert.ok(nah(danach, ziel.x, ziel.y), `steht sofort am neuen Platz${pause ? ' (Pause)' : ''}`);
  // Im nächsten Bild bleibt er dort (nicht wieder zurück an den alten Ort)
  s.tick(0.01);
  assert.ok(Math.hypot(ea().x - ziel.x, ea().y - ziel.y) <= Math.SQRT2 + 1e-9);
}

// Kirchkaffee: laufende Aufgabe wird beim Versetzen sofort beendet
{
  const z = neuesSpiel(() => 0.5), p = z.personen[0];
  z.kaffee = { ma: { [p.id]: { heim: { x: p.x, y: p.y }, aufgabe: null } }, kunden: [] };
  kaffeeVersetzt(z, p.id);
  assert.equal(z.kaffee.ma[p.id], undefined);
  kaffeeVersetzt(z, 'gibt-es-nicht');   // nichts zu tun: kein Fehler
}

console.log('versetzen.test: alles ok');
