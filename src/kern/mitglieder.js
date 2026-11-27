// Spiellogik der Gemeindemitglieder (Spielprinzip von Lukas, 27.11.2026). Zahlen: MITGLIED in src/inhalte/finanzen.js.
// • Mitglied werden: am Ende jedes Gottesdienstes (Gottesdienst, Lobpreis-, Jugendgottesdienst) würfelt jeder anwesende
//   Erwachsene ab Haltungslevel 3, der noch kein Mitglied ist: 10 % Chance. Gemerkt an der Person: b.mitglied = { seit: Woche }.
// • Mitglieder kommen öfter: kommChance in besucher.js zählt den Bonus dazu.
// • Kündigen: Sonntag 24:00 (gleich nach der Bedürfnis-Prüfung): Level 2 → 30 %, Level 1 → 70 % Chance; ab Level 3 nie.
//   Wer kündigt, ist wieder normaler Besucher und kann später wieder Mitglied werden.
// • Beitrag: am 1. jedes Monats um 8:00 je Mitglied (Kassenbuch: eine Buchung pro Mitglied, Kategorie 'mitglied').
//   Dabei wirkt die Höhe auf die Haltung jedes Mitglieds.
// Gespeichert in z.mitglieder: { beitrag, monat (zuletzt abgerechneter Monat 'JJJJ-MM'), woche (zuletzt geprüfte Woche) }.
import { MITGLIED as M } from '../inhalte/finanzen.js';
import { TAG_MIN, WOCHE_MIN, zeitpunkt } from './zeit.js';
import { tagDatum } from './kalender.js';
import { buchen } from './finanzen.js';
import { istJugend } from './konfi.js';
import { levelVon, zufriedenheitAendern } from './besucher.js';

const monatVon = tagNr => { const d = new Date(tagDatum(tagNr)); return { key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, tag: d.getUTCDate() }; };
const abbuchZeit = tagNr => tagNr * TAG_MIN + M.stunde * 60;

export function mitgliederAnlegen(z) {
  if (z.mitglieder) return;
  const m = typeof z.minuten === 'number' ? z.minuten : 0, heute = Math.floor(m / TAG_MIN), mo = monatVon(heute);
  // Neues Spiel / alter Spielstand: der laufende Monat gilt als abgerechnet, außer es ist der 1. vor 8:00 – los geht es mit dem nächsten 1.
  const schonDurch = !(mo.tag === 1 && m < abbuchZeit(heute));
  z.mitglieder = { beitrag: M.beitragStart, monat: schonDurch ? mo.key : null, woche: zeitpunkt(m).woche - 1 };   // geprüft wird ab Ende dieser Woche
}

export const istMitglied = b => !!(b && b.mitglied);
const alle = z => [...(z.besucher || []), ...(z.ort ? z.ort.leute : [])];
export const mitgliederVon = z => alle(z).filter(istMitglied);

// Am Ende eines Gottesdienstes (ablauf.js): anwesende Erwachsene ab Level 3 können Mitglied werden
export function mitgliedWerden(z, anwesend, woche, zufall = Math.random) {
  const neu = [];
  for (const b of anwesend) {
    if (istMitglied(b) || istJugend(b) || levelVon(b) < M.abLevel) continue;
    if (zufall() < M.chance) { b.mitglied = { seit: woche }; neu.push(b); }
  }
  return neu;
}

// Haltung durch die Beitragshöhe (je Abbuchung): 10 € → 0, je 5 € mehr −3, je 5 € weniger +2
export function beitragHaltung(beitrag) {
  const schritte = (beitrag - M.neutral) / M.beitragSchritt;
  return Math.round(schritte > 0 ? schritte * M.haltungMehr : -schritte * M.haltungWeniger);
}

export function beitragSetzen(z, betrag) {
  mitgliederAnlegen(z);
  if (typeof betrag !== 'number' || betrag < M.beitragMin || betrag > M.beitragMax || betrag % M.beitragSchritt) return 'ungueltig';
  z.mitglieder.beitrag = betrag;
  return 'ok';
}

function monatAbrechnen(z, key) {
  const beitrag = z.mitglieder.beitrag, h = beitragHaltung(beitrag);
  for (const b of mitgliederVon(z)) {
    if (beitrag > 0) buchen(z, 'einnahmen', 'mitglied', beitrag, { spender: b.id });
    if (h) zufriedenheitAendern(b, h);
  }
  z.mitglieder.monat = key;
}

function wocheKuendigen(z, woche, zufall) {
  for (const b of mitgliederVon(z)) {
    const c = M.kuendigung[levelVon(b)] || 0;
    if (c && zufall() < c) delete b.mitglied;
  }
  z.mitglieder.woche = woche;
}

// Nächster 1. eines Monats (ab heute), der noch nicht abgerechnet ist
function naechsteAbbuchung(z) {
  const heute = Math.floor(z.minuten / TAG_MIN);
  for (let t = heute; t < heute + 63; t++) {
    const mo = monatVon(t);
    if (mo.tag === 1 && mo.key !== z.mitglieder.monat) return { zeit: Math.max(abbuchZeit(t), z.minuten), key: mo.key };
  }
  return null;
}

// Schritte für das Tick-System (ablauf.js): Kündigungen Sonntag 24:00 (nach den Bedürfnissen) und Beitrag am 1. um 8:00
export function mitgliederSchritt(z, zufall) {
  mitgliederAnlegen(z);
  const woche = z.mitglieder.woche + 1, k = { zeit: Math.max((woche + 1) * WOCHE_MIN, z.minuten), tun: zz => wocheKuendigen(zz, woche, zufall) };
  const a = naechsteAbbuchung(z);
  return a && a.zeit < k.zeit ? { zeit: a.zeit, tun: zz => monatAbrechnen(zz, a.key) } : k;
}

// Abfrage: Liste der Mitglieder (Kopien, nur Zahlen), am längsten dabei zuerst
export function mitgliederListe(z) {
  mitgliederAnlegen(z);
  return mitgliederVon(z).map(b => ({ id: b.id, name: b.voll, seit: b.mitglied.seit, haltung: b.zufriedenheit, level: levelVon(b) }))
    .sort((a, b) => a.seit - b.seit || a.name.localeCompare(b.name, 'de'));
}
