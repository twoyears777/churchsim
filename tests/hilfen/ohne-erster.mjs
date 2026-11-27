// Testhilfe (26.11.): Neues Spiel, in dem der erste Gottesdienst schon war – ohne Zeitung und ohne die 10 zusätzlichen Leute.
// Für alle Tests, die älter sind als diese Funktion; den ersten Gottesdienst selbst prüft tests/erster.test.mjs.
import { EHRENAMT } from '../../src/inhalte/besucher.js';
import { WOCHENBERICHT } from '../../src/inhalte/zeit.js';
import { MINDESTGAESTE } from '../../src/inhalte/kirchkaffee.js';
import { neuesSpiel as neuesSpielEcht, spielStarten as spielStartenEcht, SPEICHER_VERSION } from '../../src/kern/spiel.js';
// Ältere Tests rechnen ohne den „sicheren“ Ehrenamtlichen alle 3 Wochen (27.11.) – den prüft tests/ehrenamt.test.mjs.
EHRENAMT.sicher.bisAnzahl = 0;
// Ältere Tests spielen viele Wochen am Stück – die Wochenzusammenfassung (27.11.) soll sie nicht jeden Montag anhalten; sie prüft tests/wochenbericht.test.mjs.
WOCHENBERICHT.pause = false;
// Ältere Tests zählen die Kunden zu den Öffnungszeiten genau – die Mindestgäste (27.11.) prüft tests/mindestgaeste.test.mjs.
MINDESTGAESTE.an = false;
// Ältere Tests stellen Ehrenamtliche direkt in Räume (27.11.: vor dem Dienstplan) – sie laufen ohne Schichtbetrieb.
// Den Schichtbetrieb prüft tests/dienst.test.mjs.
const erledigt = z => { z.erster = { erledigt: true, zeitung: true, offen: false }; z.schichtbetrieb = false; return z; };
export const neuesSpiel = (...a) => erledigt(neuesSpielEcht(...a));
export function spielStarten(gespeichert = null, zufall = Math.random) {
  if (gespeichert) return spielStartenEcht(gespeichert, zufall);
  return spielStartenEcht(JSON.stringify({ version: SPEICHER_VERSION, zustand: neuesSpiel(zufall) }), zufall);
}
