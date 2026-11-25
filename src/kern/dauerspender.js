// Spiellogik der Dauerspender (Spielprinzip von Lukas, 25.11.2026). Zahlen in src/inhalte/finanzen.js (DAUERSPENDE).
// Jeden Montag um 8:00 Uhr:
//   1. Bisherige Dauerspender: Haltung noch ab 80? → Spende steigt um 1 € (höchstens 20 €) und geht ein. Sonst endet die Dauerspende.
//   2. Alle anderen mit Haltung ab 80 (Besucher und Passanten): 75 % Chance, Dauerspender zu werden – die erste Spende (5 €) kommt sofort.
// Gespeichert wird nur: welche Woche zuletzt dran war und pro Spender der aktuelle Betrag und seit welcher Woche er spendet.
import { DAUERSPENDE as D } from '../inhalte/finanzen.js';
import { WOCHE_MIN, zeitpunkt } from './zeit.js';
import { buchen } from './finanzen.js';

const montag = woche => woche * WOCHE_MIN + D.stunde * 60;   // Montag 8:00 dieser Woche (Spielminuten)

export function dauerspenderAnlegen(z) {
  if (z.dauerspende) return;
  const w = typeof z.minuten === 'number' ? zeitpunkt(z.minuten).woche : 0;
  // Spielstand/Spielbeginn nach Montag 8:00: diese Woche ist schon vorbei, es geht nächsten Montag los
  z.dauerspende = { woche: z.minuten >= montag(w) ? w : w - 1, spender: {} };
}

// Alle Menschen mit Haltung (Besucher und Passanten im Ort)
const alleMenschen = z => [...(z.besucher || []), ...(z.ort ? z.ort.leute : [])];

function montagsAbrechnen(z, woche, zufall) {
  const S = z.dauerspende.spender, menschen = new Map(alleMenschen(z).map(p => [p.id, p]));
  const zahlen = (id, betrag) => buchen(z, 'einnahmen', 'dauerspende', betrag, { spender: id });
  for (const id of Object.keys(S)) {
    const p = menschen.get(id);
    if (!p || p.zufriedenheit < D.abHaltung) { delete S[id]; continue; }
    S[id].betrag = Math.min(D.max, S[id].betrag + D.steigerung);
    zahlen(id, S[id].betrag);
  }
  for (const p of menschen.values()) {
    if (S[p.id] || p.zufriedenheit < D.abHaltung || zufall() >= D.chance) continue;
    S[p.id] = { betrag: D.start, seit: woche };
    zahlen(p.id, D.start);
  }
  z.dauerspende.woche = woche;
}

// Nächster Schritt für das Tick-System (ablauf.js): Montag 8:00 der nächsten noch nicht abgerechneten Woche
export function dauerspenderSchritt(z, zufall) {
  dauerspenderAnlegen(z);
  const woche = z.dauerspende.woche + 1;
  return { zeit: Math.max(montag(woche), z.minuten), tun: zz => montagsAbrechnen(zz, woche, zufall) };
}

// Abfrage: Liste der Dauerspender (Kopien, nur Zahlen). Höchster Betrag zuerst.
export function dauerspenderListe(z) {
  dauerspenderAnlegen(z);
  const menschen = new Map(alleMenschen(z).map(p => [p.id, p]));
  return Object.entries(z.dauerspende.spender).map(([id, s]) => {
    const p = menschen.get(id);
    return { id, name: p ? p.voll : null, betrag: s.betrag, naechster: Math.min(D.max, s.betrag + D.steigerung), seit: s.seit, haltung: p ? p.zufriedenheit : null };
  }).sort((a, b) => b.betrag - a.betrag || a.seit - b.seit);
}
