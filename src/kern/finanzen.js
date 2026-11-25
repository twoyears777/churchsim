// Spiellogik der Finanzen: Kontostand und Wochenbuch (was in der laufenden Woche ein- und ausgegeben wurde).
import { STARTGELD, KOLLEKTE_PRO_BESUCHER } from '../inhalte/finanzen.js';

export function finanzenAnlegen(z) {
  if (typeof z.konto !== 'number') z.konto = STARTGELD;
  if (!z.wochenbuch) z.wochenbuch = { einnahmen: {}, ausgaben: {} };
}
export function kannBezahlen(z, betrag) { return z.konto >= betrag; }

export function buchen(z, seite, kategorie, betrag) {
  z.konto += seite === 'einnahmen' ? betrag : -betrag;
  z.wochenbuch[seite][kategorie] = (z.wochenbuch[seite][kategorie] || 0) + betrag;
}

export function kollekte(besucher) { return besucher * KOLLEKTE_PRO_BESUCHER; }

// Wochenabschluss: Wochenbuch ausgeben und für die neue Woche leeren
export function wocheAbschliessen(z) {
  const buch = z.wochenbuch;
  z.wochenbuch = { einnahmen: {}, ausgaben: {} };
  return buch;
}
export function summe(teil) { return Object.values(teil).reduce((a, b) => a + b, 0); }
