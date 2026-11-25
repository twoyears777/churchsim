// Spiellogik der Besucher: feste Personen mit Zufriedenheit und Kaffeewunsch.
import { NAMEN_ALLTAEGLICH, NAMEN_WORTSPIEL, ANTEIL_WORTSPIEL } from '../inhalte/namen.js';
import { START_STAMMGAESTE, START_ZUFRIEDENHEIT, NEU_ZUFRIEDENHEIT, MIN_CHANCE, KAFFEE_ANTEIL, BEKANNTHEIT,
  EHRENAMT_AB_BESUCHEN, EHRENAMT_QUOTE } from '../inhalte/besucher.js';

export function namenZiehen(anzahl, zufall = Math.random) {
  const toepfe = { a: [], w: [] }, ergebnis = [];
  const ziehe = art => {
    if (!toepfe[art].length) toepfe[art] = [...(art === 'w' ? NAMEN_WORTSPIEL : NAMEN_ALLTAEGLICH)];
    return toepfe[art].splice(Math.floor(zufall() * toepfe[art].length), 1)[0];
  };
  for (let i = 0; i < anzahl; i++) {
    const voll = ziehe(zufall() < ANTEIL_WORTSPIEL ? 'w' : 'a');
    const leer = voll.indexOf(' ');
    ergebnis.push({ vorname: voll.slice(0, leer), nachname: voll.slice(leer + 1), voll });
  }
  return ergebnis;
}

export function besucherAnlegen(z, zufall = Math.random) {
  if (typeof z.bekanntheit !== 'number') z.bekanntheit = 0;
  if (!Array.isArray(z.besucher)) {
    z.besucher = [];
    for (let i = 0; i < START_STAMMGAESTE; i++) neuerBesucher(z, START_ZUFRIEDENHEIT, zufall);
  }
}

// Neue Person: Name möglichst nicht doppelt, Kaffeewunsch einmal ausgelost.
export function neuerBesucher(z, zufriedenheit = NEU_ZUFRIEDENHEIT, zufall = Math.random) {
  const vergeben = new Set([...z.besucher.map(b => b.voll), ...(z.personen || []).map(p => p.daten && p.daten.name)]);
  let name = null;
  for (const n of namenZiehen(30, zufall)) if (!vergeben.has(n.voll)) { name = n; break; }
  if (!name) [name] = namenZiehen(1, zufall);
  const b = { id: `b${(z.naechsterBesucher = (z.naechsterBesucher || 0) + 1)}`, ...name, zufriedenheit, kaffee: zufall() < KAFFEE_ANTEIL, besuche: 0 };
  z.besucher.push(b);
  return b;
}

// Chance, dass jemand zum Gottesdienst kommt
export function kommChance(b) { return Math.max(MIN_CHANCE, b.zufriedenheit / 100); }

// Neue Besucher pro Woche: Bekanntheit ÷ 10, der Rest als Chance (15 → 1 sicher + 50 % auf einen zweiten)
export function neueBesucherZahl(bekanntheit, zufall = Math.random) {
  const s = bekanntheit / BEKANNTHEIT.teiler, n = Math.floor(s);
  return n + (zufall() < s - n ? 1 : 0);
}

// Wer kommt diesmal? Bekannte Besucher nach ihrer Chance, dazu die neuen Besucher.
export function werKommt(z, zufall = Math.random) {
  const bekannte = z.besucher.filter(b => zufall() < kommChance(b));
  const neue = [];
  for (let i = neueBesucherZahl(z.bekanntheit, zufall); i > 0; i--) neue.push(neuerBesucher(z, NEU_ZUFRIEDENHEIT, zufall));
  return [...bekannte, ...neue];
}

export function zufriedenheitAendern(b, wert) { b.zufriedenheit = Math.max(0, Math.min(100, b.zufriedenheit + wert)); }
export function bekanntheitAendern(z, wert) { z.bekanntheit = Math.max(0, Math.min(100, z.bekanntheit + wert)); }

// Wer aus den Anwesenden wird Ehrenamtlicher? Wird aus den Besuchern genommen und zurückgegeben.
export function ehrenamtWerden(z, anwesende, zufall = Math.random) {
  const werden = anwesende.filter(b => b.besuche >= EHRENAMT_AB_BESUCHEN && zufall() < EHRENAMT_QUOTE);
  z.besucher = z.besucher.filter(b => !werden.includes(b));
  return werden;
}
