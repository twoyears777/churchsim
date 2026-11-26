// Spiellogik: Jugendliche, Konfirmandenunterricht und Konfirmation (Spielprinzip von Lukas, 25.11.2026:
// claude/spielprinzip-konfirmandenunterricht.md). Kennt keine Grafik und keine Texte. Zahlen: JUGEND, KONFI in inhalte/besucher.js.
//
// - Jugendlich ist ein Mensch, wenn b.jugend === true. Neue Menschen bekommen das beim Anlegen fest zugeteilt (20 %),
//   aus Kennung und Name abgeleitet – wie Lobpreis-Vorliebe und Kaffee-Wert, ohne Würfel. Alte Spielstände: jugendAnlegen.
// - Jede Teilnahme am Konfirmandenunterricht zählt für den Jahrgang: von einer Konfirmation bis zur nächsten.
//   Wer im Jahrgang 7-mal da war, ist Konfirmand (b.konfirmand) und kommt sicher zur nächsten Konfirmation.
//   Wer keine 7 schafft, fängt im neuen Jahrgang bei 0 an.
// - Am Ende des Konfirmations-Gottesdienstes (Sonderevent aus dem Fest-Menü) werden alle Konfirmanden erwachsen.
//   Findet er nicht statt, bleiben sie Konfirmanden bis zur nächsten Konfirmation.
// - Gibt es keine Konfirmanden, findet die Konfirmation nicht statt: kein Fest-Menü, keine Faktoren (festAktiv).
// Meldungen (z.konfiMeldung): 'konfirmand' (Name), 'konfirmiert' (Anzahl), 'keineKonfirmanden'.
import { JUGEND, KONFI } from '../inhalte/besucher.js';
import { kommendeFeste } from './kalender.js';
import { TAG_MIN } from './zeit.js';
import { MELDUNG_DAUER } from '../inhalte/zeit.js';


// Fester „Würfel“ aus Kennung und Name: 0 … 1
function wurf(b) {
  let h = 2166136261;
  for (const c of `jugend|${b.id}|${b.voll}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  return (h % 1000) / 1000;
}
export const istJugend = b => !!b && b.jugend === true;
// Neuer Mensch: jugendlich ja/nein festlegen (falls noch nicht festgelegt)
export function jugendZuteilen(b) { if (typeof b.jugend !== 'boolean') b.jugend = wurf(b) < JUGEND.anteil; return b; }
// Alte Spielstände: alle Besucher und Passanten bekommen jetzt ihre Zuteilung (20 %)
export function jugendAnlegen(z) {
  if (z.jugendVerteilt) return;
  for (const b of [...(z.besucher || []), ...(z.ort ? z.ort.leute : [])]) jugendZuteilen(b);
  z.jugendVerteilt = true;
}
// Faktor auf die Kommchance für eine Veranstaltung: Jugendliche nach JUGEND.faktor, Erwachsene × 0, wenn nur Jugendliche kommen
export function jugendFaktor(b, art, nurJugend = false) {
  if (istJugend(b)) { const f = JUGEND.faktor[art]; return typeof f === 'number' ? f : 1; }
  return nurJugend ? 0 : 1;
}

// Spieltag der nächsten Konfirmation ab diesem Tag (heute eingeschlossen) = Kennung des Jahrgangs
export function jahrgangAm(tagNr) {
  const f = kommendeFeste(tagNr, 40).find(x => x.id === 'konfirmation');
  return f ? f.tagNr : null;
}
const heute = z => Math.floor(z.minuten / TAG_MIN);
function melden(z, code, name = '') { z.konfiMeldung = { code, name, zeit: z.minuten }; }

// Stand eines Jugendlichen im laufenden Jahrgang → { anzahl, von, konfirmand }
export function konfiStand(z, b) {
  const jg = jahrgangAm(heute(z)), anzahl = b.konfi && b.konfi.jahrgang === jg ? b.konfi.anzahl : 0;
  return { anzahl, von: KONFI.teilnahmen, konfirmand: !!b.konfirmand };
}
// Ein Jugendlicher war beim Konfirmandenunterricht
export function konfiTeilnahme(z, b) {
  if (!istJugend(b)) return;
  const jg = jahrgangAm(heute(z));
  if (!b.konfi || b.konfi.jahrgang !== jg) b.konfi = { jahrgang: jg, anzahl: 0 };
  b.konfi.anzahl++;
  if (!b.konfirmand && b.konfi.anzahl >= KONFI.teilnahmen) { b.konfirmand = true; melden(z, 'konfirmand', b.voll); }
}
// Alle Konfirmanden (unter den Besuchern)
export const konfirmanden = z => (z.besucher || []).filter(b => b.konfirmand && istJugend(b));
export const konfirmandenZahl = z => konfirmanden(z).length;
// Findet dieses Fest statt? Die Konfirmation nur mit Konfirmanden.
export const festAktiv = (z, fest) => !fest || fest.braucht !== 'konfirmanden' || konfirmandenZahl(z) > 0;
// Am Ende des Konfirmations-Gottesdienstes: alle Konfirmanden werden erwachsen (und können damit Dauerspender werden)
export function konfirmieren(z) {
  const liste = konfirmanden(z);
  for (const b of liste) { b.jugend = false; delete b.konfirmand; delete b.konfi; }
  if (liste.length) melden(z, 'konfirmiert', liste.length);
  return liste.length;
}
// Konfirmation fällt aus, weil es keine Konfirmanden gibt (feste.js, zur Zeit des Fest-Menüs)
export const keineKonfirmandenMelden = z => melden(z, 'keineKonfirmanden');
// Meldung noch aktuell? → { code, name, zeit } oder null
export function konfiMeldung(z) {
  const m = z.konfiMeldung;
  return m && z.minuten - m.zeit < MELDUNG_DAUER ? m : null;
}
