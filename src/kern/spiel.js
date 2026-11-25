// Ein Spielstand: alles anlegen, was fehlt (neues Spiel oder älterer Spielstand).
import { neuerZustand } from './karte.js';
import { personenAnlegen } from './personen.js';
import { moebelAnlegen } from './moebel.js';
import { finanzenAnlegen } from './finanzen.js';
import { besucherAnlegen } from './besucher.js';
import { zeitAnlegen } from './zeit.js';

export function spielAnlegen(z, zufall = Math.random) {
  personenAnlegen(z); moebelAnlegen(z); finanzenAnlegen(z); besucherAnlegen(z, zufall); zeitAnlegen(z);
  return z;
}
export function neuesSpiel(zufall = Math.random) { return spielAnlegen(neuerZustand(), zufall); }

// Spielstand aus 0.1.1 (Runden) übernehmen: Gebäude, Möbel, Mitarbeiter und Geld bleiben,
// Besucher und Zeit fangen neu an.
export function ausRundenSpielstand(alt) {
  const z = neuerZustand();
  for (const k of ['zellen', 'raumTyp', 'veranstaltung', 'moebel', 'personen', 'konto', 'naechsteId']) if (k in alt) z[k] = alt[k];
  return spielAnlegen(z);
}
