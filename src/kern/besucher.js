// Spiellogik der Besucher: feste Personen mit Haltung zur Gemeinde (intern „zufriedenheit“) und Kaffeewunsch.
// Passanten aus dem Ort (z.ort.leute) haben dieselbe Form; kommen sie zum Gottesdienst, wechseln sie in z.besucher.
import { NAMEN_ALLTAEGLICH, NAMEN_WORTSPIEL, ANTEIL_WORTSPIEL } from '../inhalte/namen.js';
import { NEUGIER } from '../inhalte/ort.js';
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
    for (let i = 0; i < START_STAMMGAESTE; i++) neuerBesucher(z, START_ZUFRIEDENHEIT, zufall).stamm = true;
  }
  // ältere Spielstände: die ersten vier sind die Start-Stammgäste
  for (const b of z.besucher) if (b.stamm === undefined) b.stamm = ['b1', 'b2', 'b3', 'b4'].includes(b.id);
}

// Neue Person: Name möglichst nicht doppelt, Kaffeewunsch einmal ausgelost. Wird noch nirgends eingetragen.
export function neuePerson(z, zufriedenheit = NEU_ZUFRIEDENHEIT, zufall = Math.random) {
  const vergeben = new Set([...z.besucher.map(b => b.voll), ...(z.ort ? z.ort.leute : []).map(b => b.voll),
    ...(z.personen || []).map(p => p.daten && p.daten.name)]);
  let name = null;
  for (const n of namenZiehen(30, zufall)) if (!vergeben.has(n.voll)) { name = n; break; }
  if (!name) [name] = namenZiehen(1, zufall);
  return { id: `b${(z.naechsterBesucher = (z.naechsterBesucher || 0) + 1)}`, ...name, zufriedenheit, kaffee: zufall() < KAFFEE_ANTEIL, besuche: 0 };
}
export function neuerBesucher(z, zufriedenheit = NEU_ZUFRIEDENHEIT, zufall = Math.random) {
  const b = neuePerson(z, zufriedenheit, zufall);
  z.besucher.push(b);
  return b;
}
// Ein Passant kommt zum ersten Mal: wechselt aus dem Ort zu den Besuchern und behält seine Haltung.
export function ausDemOrt(z, p) {
  z.ort.leute = z.ort.leute.filter(x => x !== p);
  delete p.neugierig;
  z.besucher.push(p);
  return p;
}

// Chance, dass jemand zum Gottesdienst kommt
export function kommChance(b) { return Math.max(MIN_CHANCE, b.zufriedenheit / 100); }

// Neue Besucher pro Woche: Bekanntheit ÷ 10, der Rest als Chance (15 → 1 sicher + 50 % auf einen zweiten)
export function neueBesucherZahl(bekanntheit, zufall = Math.random) {
  const s = bekanntheit / BEKANNTHEIT.teiler, n = Math.floor(s);
  return n + (zufall() < s - n ? 1 : 0);
}

// Wer kommt diesmal? Bekannte Besucher nach ihrer Chance, dazu Neugierige aus dem Ort und die neuen Besucher
// über die Bekanntheit – diese zuerst aus den bekannten Passanten, sonst ganz neue Leute.
export function werKommt(z, zufall = Math.random) {
  const bekannte = z.besucher.filter(b => zufall() < kommChance(b));
  const neue = [], ort = z.ort ? z.ort.leute : [];
  for (const p of ort.filter(p => p.neugierig)) {
    if (zufall() < NEUGIER.kommChance) neue.push(ausDemOrt(z, p)); else p.neugierig = false;
  }
  for (let i = neueBesucherZahl(z.bekanntheit, zufall); i > 0; i--) {
    const rest = z.ort ? z.ort.leute : [];
    neue.push(rest.length ? ausDemOrt(z, rest[Math.floor(zufall() * rest.length)]) : neuerBesucher(z, NEU_ZUFRIEDENHEIT, zufall));
  }
  return [...bekannte, ...neue];
}

export function zufriedenheitAendern(b, wert) { b.zufriedenheit = Math.max(0, Math.min(100, b.zufriedenheit + wert)); }
// Bekanntheit ändern und merken, woher es kam (fürs Bekanntheit-Fenster). quelle: 'gottesdienst' | 'zufrieden' | 'seelsorge'.
// Auf eine Nachkommastelle gerundet, damit sich keine Rechenkrümel ansammeln.
export function bekanntheitAendern(z, wert, quelle = null, anzahl = null) {
  const vorher = z.bekanntheit;
  z.bekanntheit = Math.round(Math.max(0, Math.min(100, z.bekanntheit + wert)) * 10) / 10;
  const wirklich = Math.round((z.bekanntheit - vorher) * 10) / 10;
  if (!quelle || !wirklich) return;
  if (!Array.isArray(z.bekanntheitLog)) z.bekanntheitLog = [];
  z.bekanntheitLog.unshift({ minuten: z.minuten, quelle, wert: wirklich, anzahl });
  z.bekanntheitLog.length = Math.min(z.bekanntheitLog.length, BEKANNTHEIT.protokoll);
}

// Wer aus den Anwesenden wird Ehrenamtlicher? Wird aus den Besuchern genommen und zurückgegeben.
export function ehrenamtWerden(z, anwesende, zufall = Math.random) {
  const werden = anwesende.filter(b => b.besuche >= EHRENAMT_AB_BESUCHEN && zufall() < EHRENAMT_QUOTE);
  z.besucher = z.besucher.filter(b => !werden.includes(b));
  return werden;
}
