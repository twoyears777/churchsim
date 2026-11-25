// Prüft das Umherlaufen der Mitarbeiter (Wunsch von Lukas, 25.11.2026): Wer frei ist, geht ab und zu ein Kästchen
// weiter und wieder zurück – nur im eigenen Raum, nie auf Möbel oder Wände, und sein eigentlicher Platz bleibt.
// Starten mit: node tests/umherlaufen.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen, idx, LEER } from '../src/kern/karte.js';
import { neuesSpiel, spielStarten } from '../src/kern/spiel.js';
import { moebelSetzen, moebelBei } from '../src/kern/moebel.js';
import { versetzen } from '../src/kern/personen.js';
import { umherPosition } from '../src/kern/umherlaufen.js';

const z = neuesSpiel(() => 0.5);
const aus = () => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 10); tuerUmschalten(z, G.x + 2, G.y + 5);
const raum = () => { const a = aus(); return a.liste[a.gruppe[idx(z, G.x + 5, G.y + 5)]]; };
typZuweisen(z, raum(), 'gottesdienst');
const p = z.personen[0];
versetzen(z, p, G.x + 5, G.y + 5);
moebelSetzen(z, 'stuhl', G.x + 6, G.y + 5, G.x + 6, G.y + 5);   // rechts daneben steht ein Stuhl

// Bleibt nah am Platz, geht nie auf Möbel/Wände/aus dem Raum, bewegt sich aber wirklich
{
  const zellen = new Set(raum().zellen), orte = new Set();
  for (let t = 0; t < 3000; t += 1) {
    const q = umherPosition(z, raum(), p, t);
    assert.ok(Math.hypot(q.x - p.x, q.y - p.y) <= Math.SQRT2 + 1e-9);
    if (Number.isInteger(q.x) && Number.isInteger(q.y)) {
      orte.add(`${q.x},${q.y}`);
      assert.ok(zellen.has(idx(z, q.x, q.y)) && z.zellen[idx(z, q.x, q.y)] === LEER);
      assert.ok(!moebelBei(z, q.x, q.y) || (q.x === p.x && q.y === p.y));
    }
  }
  assert.ok(orte.size >= 3, 'läuft zu verschiedenen Kästchen');
  assert.ok(!orte.has(`${G.x + 6},${G.y + 5}`), 'nicht auf den Stuhl');
  // Nicht ständig unterwegs: die meiste Zeit steht er
  let steht = 0;
  for (let t = 0; t < 3000; t++) { const q = umherPosition(z, raum(), p, t); if (Number.isInteger(q.x) && Number.isInteger(q.y)) steht++; }
  assert.ok(steht > 1800);
}
// Ohne Raum oder ohne freies Nachbarkästchen: bleibt stehen
{
  assert.deepEqual(umherPosition(z, null, p, 100), { x: p.x, y: p.y });
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) moebelSetzen(z, 'stuhl', p.x + dx, p.y + dy, p.x + dx, p.y + dy);
  for (let t = 0; t < 500; t += 7) assert.deepEqual(umherPosition(z, raum(), p, t), { x: p.x, y: p.y });
}
// Die Ansicht bekommt die umherlaufende Position, der eigentliche Platz (feldX/feldY) bleibt
{
  const z2 = neuesSpiel(() => 0.5);
  wandRechteck(z2, G.x + 2, G.y + 2, G.x + 18, G.y + 10); tuerUmschalten(z2, G.x + 2, G.y + 5);
  versetzen(z2, z2.personen[0], G.x + 5, G.y + 5);
  const s = spielStarten(JSON.stringify({ version: 3, zustand: z2 }), () => 0.5);
  s.tempoSetzen(1);
  const positionen = new Set();
  for (let i = 0; i < 400; i++) {
    s.tick(0.25);
    const f = s.karte().personen.find(x => x.id === 'pastor');
    assert.equal(f.feldX, G.x + 5); assert.equal(f.feldY, G.y + 5);   // eigentlicher Platz bleibt
    assert.ok(Math.hypot(f.x - f.feldX, f.y - f.feldY) <= Math.SQRT2 + 1e-9);
    positionen.add(`${f.x},${f.y}`);
  }
  assert.ok(positionen.size > 1, 'Figur bewegt sich in der Ansicht');
}
console.log('Umherlaufen-Tests bestanden.');
