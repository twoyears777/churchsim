// Spiellogik der Finanzen: Kontostand, Wochenbuch (was in der laufenden Woche ein- und ausgegeben wurde),
// Kassenbuch (jede einzelne Buchung dieser Woche) und Verlauf (frühere Wochen, Spielprinzip vom 25.11.2026).
import { STARTGELD, KOLLEKTE_PRO_BESUCHER, VERLAUF_WOCHEN, KASSENBUCH_MAX } from '../inhalte/finanzen.js';

// Kirchkaffee im Wochenbuch: verkaufte Tassen nach Anlass und Einkauf im Laden (je Tassen und Euro)
const leererKaffee = () => ({ gottesdienst: { tassen: 0, euro: 0 }, oeffnungszeit: { tassen: 0, euro: 0 }, einkauf: { tassen: 0, euro: 0 } });
const leeresBuch = () => ({ einnahmen: {}, ausgaben: {}, kaffee: leererKaffee(), buchungen: [] });
const cent = n => Math.round(n * 100) / 100;

// Alte Spielstände: fehlende Teile ergänzen
function buchVon(z) {
  if (!z.wochenbuch) z.wochenbuch = leeresBuch();
  const B = z.wochenbuch;
  if (!B.einnahmen) B.einnahmen = {};
  if (!B.ausgaben) B.ausgaben = {};
  if (!B.kaffee) B.kaffee = leererKaffee();
  if (!Array.isArray(B.buchungen)) B.buchungen = [];
  return B;
}

export function finanzenAnlegen(z) {
  if (typeof z.konto !== 'number') z.konto = STARTGELD;
  buchVon(z);
  if (!Array.isArray(z.finanzVerlauf)) z.finanzVerlauf = [];
}
export function kannBezahlen(z, betrag) { return z.konto >= betrag; }

// Eine Buchung. info (freiwillig) sagt, wofür genau – fürs Kassenbuch und die Kirchkaffee-Aufstellung:
//   { tassen, anlass: 'gottesdienst' | 'oeffnungszeit' | 'einkauf' }  (Kirchkaffee)
//   { moebel: 'stuhl' }, { veranstaltung: 'lobpreis' }, { was: 'bus' } usw.
export function buchen(z, seite, kategorie, betrag, info = {}) {
  const B = buchVon(z);
  z.konto = cent(z.konto + (seite === 'einnahmen' ? betrag : -betrag));
  B[seite][kategorie] = cent((B[seite][kategorie] || 0) + betrag);
  if (info.anlass && B.kaffee[info.anlass]) {
    const k = B.kaffee[info.anlass];
    k.tassen += info.tassen || 0; k.euro = cent(k.euro + betrag);
  }
  B.buchungen.push({ minuten: typeof z.minuten === 'number' ? z.minuten : null, seite, kategorie, betrag, ...info });
  if (B.buchungen.length > KASSENBUCH_MAX) B.buchungen.shift();
}

// Rückgängig beim Bauen (25.11.): die Buchungen dieses Schritts werden zurückgenommen.
// Noch dieselbe Woche: die Buchungen verschwinden ganz aus Wochenbuch und Kassenbuch (als wäre nichts passiert).
// Woche schon gewechselt: das Geld wird in der richtigen Kategorie gegengebucht (Bau-/Möbel-Ausgabe ↔ Rückerstattung).
export function stornieren(z, liste, woche) {
  const B = buchVon(z);
  for (const b of liste) {
    if (woche === z.buchWoche) {
      z.konto = cent(z.konto + (b.seite === 'einnahmen' ? -b.betrag : b.betrag));
      const rest = cent((B[b.seite][b.kategorie] || 0) - b.betrag);
      if (rest) B[b.seite][b.kategorie] = rest; else delete B[b.seite][b.kategorie];
      const i = B.buchungen.indexOf(b);
      if (i >= 0) B.buchungen.splice(i, 1);
    } else if (b.seite === 'ausgaben') buchen(z, 'einnahmen', 'rueckerstattung', b.betrag, { was: 'rueckgaengig' });
    else {
      const bau = b.was === 'fenster' || 'stuecke' in b;   // Wände/Fenster (spiel.js) – sonst Möbel
      buchen(z, 'ausgaben', b.kategorie === 'rueckerstattung' ? (bau ? 'bau' : 'moebel') : b.kategorie, b.betrag, { was: 'rueckgaengig' });
    }
  }
}

export function kollekte(besucher) { return besucher * KOLLEKTE_PRO_BESUCHER; }

// Wochenwechsel (Montag 0:00): die abgelaufene Woche kommt mit ihren Summen in den Verlauf, das Wochenbuch beginnt leer.
// Der Verlauf hält die letzten VERLAUF_WOCHEN Wochen (ohne Einzelbuchungen).
export function wocheWechseln(z, neueWoche) {
  const B = buchVon(z);
  if (!Array.isArray(z.finanzVerlauf)) z.finanzVerlauf = [];
  if (typeof z.buchWoche === 'number' && z.buchWoche < neueWoche) {
    z.finanzVerlauf.push({ woche: z.buchWoche, einnahmen: { ...B.einnahmen }, ausgaben: { ...B.ausgaben }, kaffee: B.kaffee, konto: z.konto });
    while (z.finanzVerlauf.length > VERLAUF_WOCHEN) z.finanzVerlauf.shift();
  }
  z.buchWoche = neueWoche;
  z.wochenbuch = leeresBuch();
}

export function summe(teil) { return cent(Object.values(teil).reduce((a, b) => a + b, 0)); }

// Kirchkaffee-Aufstellung einer Woche: verkauft (nach Anlass), Einkauf, Gewinn
export function kaffeeBilanz(kaffee = leererKaffee()) {
  const g = kaffee.gottesdienst, o = kaffee.oeffnungszeit, e = kaffee.einkauf;
  const verkauft = { tassen: g.tassen + o.tassen, euro: cent(g.euro + o.euro) };
  return { gottesdienst: { ...g }, oeffnungszeit: { ...o }, verkauft, einkauf: { ...e }, gewinn: cent(verkauft.euro - e.euro) };
}
// Summen einer Woche fürs Fenster
function wochenSumme(w) {
  const ein = summe(w.einnahmen), aus = summe(w.ausgaben);
  return { einnahmen: { ...w.einnahmen }, ausgaben: { ...w.ausgaben }, summeEinnahmen: ein, summeAusgaben: aus, saldo: cent(ein - aus), kaffee: kaffeeBilanz(w.kaffee) };
}
// Abfrage für die Finanzübersicht (Kopien, nur Zahlen und Codes)
export function finanzUebersicht(z) {
  const B = buchVon(z);
  return {
    konto: z.konto,
    woche: { woche: z.buchWoche, ...wochenSumme(B) },
    buchungen: B.buchungen.map(b => ({ ...b })).reverse(),   // neueste zuerst
    verlauf: (z.finanzVerlauf || []).map(w => ({ woche: w.woche, konto: w.konto, ...wochenSumme(w) })).reverse()
  };
}
