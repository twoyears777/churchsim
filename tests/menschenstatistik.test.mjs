// Prüft die gesammelten Statistiken im Fenster „Menschen im Ort“. Starten mit: node tests/menschenstatistik.test.mjs
import assert from 'node:assert';
import { menschenStatistik, GRUPPEN } from '../src/kern/menschenStatistik.js';

const m = (status, x = {}) => ({ status, haltung: null, level: null, besuche: null, zuletzt: null, kaffee: null, jugend: false, konfirmand: false, ...x });
const zeilen = [
  m('stammgast', { haltung: 80, level: 2, besuche: 10, zuletzt: 4, kaffee: 0.5 }),
  m('stammgast', { haltung: 60, level: 1, besuche: 6, zuletzt: 3, kaffee: 1, jugend: true, konfirmand: true }),
  m('besucher', { haltung: 40, level: 1, besuche: 1, zuletzt: 4, kaffee: null }),
  m('passant', { haltung: 20, level: 1, besuche: 0 }),
  m('ehrenamtlich')   // ohne Herkunft: alles unbekannt
];
const s = menschenStatistik(zeilen, 4);
assert.deepStrictEqual(s.gruppen.map(g => g.status), GRUPPEN, 'feste Reihenfolge der Gruppen');
const st = s.gruppen.find(g => g.status === 'stammgast');
assert.strictEqual(st.anzahl, 2); assert.strictEqual(st.haltung, 70); assert.strictEqual(st.besuche, 8); assert.strictEqual(st.kaffee, 0.75);
assert.strictEqual(st.dieseWoche, 1, 'nur wer in der aktuellen Woche da war');
assert.deepStrictEqual([st.jugend, st.erwachsene, st.konfirmanden], [1, 1, 1]);
assert.deepStrictEqual(st.level, [1, 1, 0, 0, 0]);
const ea = s.gruppen.find(g => g.status === 'ehrenamtlich');
assert.strictEqual(ea.anzahl, 1); assert.strictEqual(ea.haltung, null, 'unbekannte Werte zählen nicht in den Schnitt');
assert.strictEqual(s.gruppen.find(g => g.status === 'neugierig').anzahl, 0);
assert.strictEqual(s.alle.anzahl, 5); assert.strictEqual(s.alle.haltung, 50); assert.strictEqual(s.alle.dieseWoche, 2);
assert.deepStrictEqual(s.alle.level, [3, 1, 0, 0, 0]);
assert.deepStrictEqual(menschenStatistik([], 1).alle, { anzahl: 0, haltung: null, level: [0, 0, 0, 0, 0], jugend: 0, erwachsene: 0, konfirmanden: 0, besuche: null, kaffee: null, dieseWoche: 0 });
console.log('Menschen-Statistik: alle Prüfungen bestanden.');
