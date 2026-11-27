// Spiellogik „Jugendpastor kommt“ (Lukas, 27.11.2026: claude/spielprinzip-jugendpastor.md). Kennt keine Grafik und keine Texte.
// - Am Montag 8:00 der 3. Woche (JUGENDPASTOR.ankunft) kommt der Jugendpastor als zweiter Hauptamtlicher dazu.
//   Im Tick-System steht dieser Schritt hinter der Wochenzusammenfassung: erst kommt die Zusammenfassung, nach „Weiter“
//   das Pop-up. Solange das Pop-up offen ist, steht die Zeit.
// - Alte Spielstände, die schon weiter sind, bekommen ihn am nächsten Montag 8:00.
// - Er kostet erstmal nichts. Seine Regeln (was er leitet, Anwesenheit 7–23 Uhr, Warten im Kirchkaffee) stehen
//   in seinen Daten (JUGENDPASTOR.daten in src/inhalte/mitarbeiter.js) und gelten in dienst.js.
// Gespeichert in z.jugendpastor: { da (ist gekommen), offen (Pop-up gerade offen) }.
import { JUGENDPASTOR } from '../inhalte/mitarbeiter.js';
import { WOCHE_MIN, TAG_MIN } from './zeit.js';
import { personHinzufuegen } from './personen.js';
import { WEG } from './dienst.js';

export const JUGENDPASTOR_ID = 'jugendpastor';

export function jugendpastorAnlegen(z) {
  if (z.jugendpastor) return;
  z.jugendpastor = { da: (z.personen || []).some(p => p.id === JUGENDPASTOR_ID), offen: false };
}
export const jugendpastorOffen = z => !!(z.jugendpastor && z.jugendpastor.offen);
export function jugendpastorSchliessen(z) { if (z.jugendpastor) z.jugendpastor.offen = false; return 'ok'; }

// Wann er kommt: der festgelegte Zeitpunkt, für spätere Spielstände der nächste gleiche Wochentag mit gleicher Uhrzeit
export function ankunftZeit(z) {
  const A = JUGENDPASTOR.ankunft, imWoche = A.tag * TAG_MIN + A.stunde * 60;
  let t = A.woche * WOCHE_MIN + imWoche;
  if (t < z.minuten) t = Math.ceil((z.minuten - imWoche) / WOCHE_MIN) * WOCHE_MIN + imWoche;
  return t;
}

function ankommen(z) {
  z.jugendpastor.da = true; z.jugendpastor.offen = true;
  const p = personHinzufuegen(z, { ...JUGENDPASTOR.daten, leitet: [...JUGENDPASTOR.daten.leitet], anwesend: { ...JUGENDPASTOR.daten.anwesend } }, JUGENDPASTOR_ID);
  // Im Schichtbetrieb kommt er sichtbar durchs Tor zu seinem Wartplatz (dienstAktualisieren holt ihn von „daheim“ ab)
  if (z.schichtbetrieb) { p.x = WEG; p.y = WEG; p.daheim = true; }
}

// Schritt fürs Tick-System (oder null, wenn er schon da ist)
export function jugendpastorSchritt(z) {
  jugendpastorAnlegen(z);
  if (z.jugendpastor.da) return null;
  return { zeit: Math.max(ankunftZeit(z), z.minuten), tun: zz => ankommen(zz) };
}
