// Spiellogik „Erster Gottesdienst“ (Lukas, 26.11.): Kennt keine Grafik und keine Texte.
// - Am Tag vor dem ersten normalen Gottesdienst (8:00) erscheint einmal ein Zeitungsartikel. Solange er offen ist, steht die Zeit.
// - Beim ersten normalen Gottesdienst, der wirklich stattfindet, kommen ERSTER_GOTTESDIENST.neueLeute zusätzlich.
// - Danach werden mindestens ERSTER_GOTTESDIENST.ehrenamt Anwesende Ehrenamtliche.
// Fällt der Gottesdienst aus, gilt der nächste normale Gottesdienst als „erster“ (die Zeitung kommt aber nur einmal).
// Gespeichert in z.erster: { erledigt, zeitung (schon gezeigt), offen (Zeitung gerade offen) }.
import { ERSTER_GOTTESDIENST } from '../inhalte/besucher.js';
import { ausDemOrt, neuerBesucher } from './besucher.js';
import { TAG_MIN } from './zeit.js';

// Alte Spielstände, in denen schon jemand bei einer Veranstaltung war: kein Bonus und keine Zeitung mehr.
export function ersterAnlegen(z) {
  if (z.erster) return;
  const schonBesuche = (z.besucher || []).some(b => b.besuche > 0);
  z.erster = { erledigt: schonBesuche, zeitung: schonBesuche, offen: false };
}
export const zeitungOffen = z => !!(z.erster && z.erster.offen);
export function zeitungSchliessen(z) { if (z.erster) z.erster.offen = false; return 'ok'; }
// Steht der erste Gottesdienst noch aus?
export const ersterOffen = z => !!(z.erster && !z.erster.erledigt);

// Wann erscheint die Zeitung? termin: der nächste normale Gottesdienst (oder null) → Schritt fürs Tick-System (oder null)
export function zeitungSchritt(z, termin) {
  ersterAnlegen(z);
  if (!termin || z.erster.zeitung || z.erster.erledigt) return null;
  const E = ERSTER_GOTTESDIENST, tag = Math.floor(termin.beginn / TAG_MIN);
  const zeit = (tag - E.zeitungTageVorher) * TAG_MIN + E.zeitungStunde * 60;
  return { zeit: Math.max(zeit, z.minuten), tun: zz => { zz.erster.zeitung = true; zz.erster.offen = true; } };
}

// Die zusätzlichen Leute: zuerst Passanten aus dem Ort (die gerade nicht neugierig sind), sonst ganz neue Menschen.
// Fest – ohne Würfel, ob sie kommen, und auch, wenn das Einzugsgebiet schon voll ist.
export function zusatzLeute(z, zufall = Math.random, anzahl = ERSTER_GOTTESDIENST.neueLeute) {
  const neue = [];
  for (let i = 0; i < anzahl; i++) {
    const frei = z.ort ? z.ort.leute.filter(p => !p.neugierig) : [];
    neue.push(frei.length ? ausDemOrt(z, frei[Math.floor(zufall() * frei.length)]) : neuerBesucher(z, undefined, zufall));
  }
  return neue;
}

// Mindestens so viele neue Ehrenamtliche: fehlen welche, werden zufällige Anwesende genommen (aus den Besuchern entfernt).
export function ehrenamtSicher(z, anwesende, schon, zufall = Math.random, mindestens = ERSTER_GOTTESDIENST.ehrenamt) {
  const pool = anwesende.filter(b => !schon.includes(b) && z.besucher.includes(b)), dazu = [];
  while (schon.length + dazu.length < mindestens && pool.length) dazu.push(pool.splice(Math.floor(zufall() * pool.length), 1)[0]);
  z.besucher = z.besucher.filter(b => !dazu.includes(b));
  return dazu;
}
