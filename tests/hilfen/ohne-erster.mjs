// Testhilfe (26.11.): Neues Spiel, in dem der erste Gottesdienst schon war – ohne Zeitung und ohne die 10 zusätzlichen Leute.
// Für alle Tests, die älter sind als diese Funktion; den ersten Gottesdienst selbst prüft tests/erster.test.mjs.
import { EHRENAMT } from '../../src/inhalte/besucher.js';
import { neuesSpiel as neuesSpielEcht, spielStarten as spielStartenEcht, SPEICHER_VERSION } from '../../src/kern/spiel.js';
// Ältere Tests rechnen ohne den „sicheren“ Ehrenamtlichen alle 3 Wochen (27.11.) – den prüft tests/ehrenamt.test.mjs.
EHRENAMT.sicher.bisAnzahl = 0;
const erledigt = z => { z.erster = { erledigt: true, zeitung: true, offen: false }; return z; };
export const neuesSpiel = (...a) => erledigt(neuesSpielEcht(...a));
export function spielStarten(gespeichert = null, zufall = Math.random) {
  if (gespeichert) return spielStartenEcht(gespeichert, zufall);
  return spielStartenEcht(JSON.stringify({ version: SPEICHER_VERSION, zustand: neuesSpiel(zufall) }), zufall);
}
