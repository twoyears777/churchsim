// Spiellogik der Besucher: feste Personen mit Haltung zur Gemeinde (intern „zufriedenheit“) und Kaffeewunsch.
// Passanten aus dem Ort (z.ort.leute) haben dieselbe Form; kommen sie zum Gottesdienst, wechseln sie in z.besucher.
import { NAMEN_ALLTAEGLICH, NAMEN_WORTSPIEL, ANTEIL_WORTSPIEL } from '../inhalte/namen.js';
import { NEUGIER } from '../inhalte/ort.js';
import { ZWEITER_BESUCH, VERANSTALTUNGEN } from '../inhalte/veranstaltungen.js';
import { istJugend, jugendFaktor, jugendZuteilen } from './konfi.js';
import { platzImGebiet } from './einzugsgebiet.js';
import { START_STAMMGAESTE, START_ZUFRIEDENHEIT, NEU_ZUFRIEDENHEIT, BEKANNTHEIT,
  EHRENAMT_AB_BESUCHEN, EHRENAMT_QUOTE, LOBPREIS_MUSIK, HALTUNGSLEVEL, KOMMCHANCE, BEDUERFNISSE } from '../inhalte/besucher.js';
import { zeitpunkt } from './zeit.js';

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
    for (let i = 0; i < START_STAMMGAESTE; i++) {
      const b = neuerBesucher(z, START_ZUFRIEDENHEIT, zufall);
      b.stamm = true; delete b.level;   // Level (2) und Bedürfnis bekommen sie gleich unten – wie Besucher aus alten Spielständen
    }
  }
  // ältere Spielstände: die ersten vier sind die Start-Stammgäste
  for (const b of z.besucher) if (b.stamm === undefined) b.stamm = ['b1', 'b2', 'b3', 'b4'].includes(b.id);
  // Haltungslevel (25.11.): Start-Stammgäste und alle Besucher aus alten Spielständen beginnen auf Level 2 (mit einem Bedürfnis)
  // und behalten ihre Haltung; Passanten aus alten Spielständen auf Level 1. Neue Menschen bekommen Level 1 in neuePerson.
  for (const b of z.besucher) if (b.level === undefined) {
    b.level = 1; b.beduerfnisse = [];
    while (b.level < HALTUNGSLEVEL.startBesucher) { b.level++; beduerfnisDazu(b); }
  }
  for (const p of z.ort ? z.ort.leute : []) if (p.level === undefined) { p.level = 1; p.beduerfnisse = []; }
}

// Neue Person: Name möglichst nicht doppelt. Wird noch nirgends eingetragen. (Kaffee-Wert: siehe kaffeeVorliebe)
export function neuePerson(z, zufriedenheit = NEU_ZUFRIEDENHEIT, zufall = Math.random) {
  const vergeben = new Set([...z.besucher.map(b => b.voll), ...(z.ort ? z.ort.leute : []).map(b => b.voll),
    ...(z.personen || []).map(p => p.daten && p.daten.name)]);
  let name = null;
  for (const n of namenZiehen(30, zufall)) if (!vergeben.has(n.voll)) { name = n; break; }
  if (!name) [name] = namenZiehen(1, zufall);
  // Jugendlich ja/nein wird gleich fest zugeteilt (20 %, aus Kennung und Name – kein Würfel, siehe konfi.js)
  return jugendZuteilen({ id: `b${(z.naechsterBesucher = (z.naechsterBesucher || 0) + 1)}`, ...name, zufriedenheit, besuche: 0, level: 1, beduerfnisse: [] });
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

// Chance, dass jemand zu einer Veranstaltung kommt (25.11.): Grundwahrscheinlichkeit + Level + Haltung im Level, höchstens 100 %
export function kommChance(b) {
  const K = KOMMCHANCE;
  return Math.min(1, K.grund + K.jeLevel * (levelVon(b) - 1) + K.haltung * b.zufriedenheit / 100);
}

// ---- Haltungslevel und Bedürfnisse (Lukas, 25.11.: claude/spielprinzip-beduerfnisse-wochenende.md) ----
export const levelVon = b => b.level || 1;
// b.beduerfnisse: Liste in der Reihenfolge der Aufstiege – Eintrag 0 kam mit Level 2, Eintrag 1 mit Level 3 …
// null = bei diesem Aufstieg war kein Bedürfnis mehr übrig. So geht beim Abstieg genau das zuletzt dazugekommene wieder.
export const beduerfnisseVon = b => (b.beduerfnisse || []).filter(Boolean);
// Ein zufälliges, noch nicht vorhandenes Bedürfnis dazu. „Zufällig“ wie die Lobpreis-Vorliebe: fest aus Kennung, Name und Level
// gerechnet (kein Würfel), damit Tests und Spielstände immer gleich ausgehen.
function beduerfnisDazu(b) {
  const habe = new Set(beduerfnisseVon(b));
  const moeglich = BEDUERFNISSE.liste.filter(id => !habe.has(id) && (id !== 'lobpreis' || lobpreisVorliebe(b) >= BEDUERFNISSE.lobpreisAb));
  let h = 2166136261;
  for (const c of `beduerfnis|${b.id}|${b.voll}|${b.level}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  if (!Array.isArray(b.beduerfnisse)) b.beduerfnisse = [];
  b.beduerfnisse.push(moeglich.length ? moeglich[h % moeglich.length] : null);
}
// Bedürfnis in dieser Woche erfüllt (Lukas: Lobpreis = bei einer Veranstaltung mit Lobpreis, Kaffee = Kaffee bekommen,
// Spaß = beim Spielenachmittag). Gemerkt wird es auch, wenn jemand das Bedürfnis (noch) nicht hat – zählt nur in derselben Woche.
export function beduerfnisErfuellt(z, b, id, woche = zeitpunkt(z.minuten).woche) {
  if (!b) return;
  if (!b.erfuellt || b.erfuellt.woche !== woche) b.erfuellt = { woche, ids: [] };
  if (!b.erfuellt.ids.includes(id)) b.erfuellt.ids.push(id);
}
export const erfuelltInWoche = (b, id, woche) => !!(b.erfuellt && b.erfuellt.woche === woche && b.erfuellt.ids.includes(id));

// Lobpreis-Vorliebe 0–1: für jeden Menschen zufällig, aber fest (aus Kennung und Name abgeleitet).
// So bekommt auch jeder aus alten Spielständen gleich seine eigene Vorliebe, ohne dass etwas gespeichert werden muss.
export function lobpreisVorliebe(b) {
  if (typeof b.lobpreis === 'number') return b.lobpreis;
  let h = 2166136261;
  for (const c of `${b.id}|${b.voll}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return Math.round((h % 1001) / 10) / 100;   // 0,00 … 1,00
}
// Kaffee-Wert 0–1 (Lukas, 25.11.): wie die Lobpreis-Vorliebe für jeden fest, aber aus einer anderen Rechnung.
// Ersetzt das frühere Ja/Nein (b.kaffee) – auch in alten Spielständen bekommt jeder gleich seinen Wert.
export function kaffeeVorliebe(b) {
  if (typeof b.kaffeeWert === 'number') return b.kaffeeWert;
  let h = 2166136261;
  for (const c of `kaffee|${b.voll}|${b.id}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  return Math.round((h % 1001) / 10) / 100;   // 0,00 … 1,00
}
// Chance für eine bestimmte Veranstaltung: × Lobpreis-Vorliebe beim Lobpreisgottesdienst, × Musik-Faktor beim normalen
// Gottesdienst (o.musik: true = Lobpreisteam spielt, false = keine Musik, nicht angegeben = ohne Wirkung),
// × 0,5 beim 2. Besuch derselben Woche, × Besucher-Faktor des Kirchenjahres (o.faktor, z. B. Heiligabend ×3), höchstens 100 %.
// Jugendliche: × Faktor der Veranstaltung (JUGEND); Erwachsene kommen nicht, wenn nur Jugendliche kommen (Konfirmandenunterricht).
// o.konfirmation: Konfirmations-Gottesdienst – Konfirmanden kommen sicher.
export function besuchChance(b, o = {}) {
  if (o.konfirmation && b.konfirmand && istJugend(b)) return 1;
  const v = o.art ? VERANSTALTUNGEN.find(x => x.id === o.art) : null;
  let c = Math.min(1, kommChance(b) * artFaktor(b, o.art));   // Jugendgottesdienst: Jugendliche × 2,5 (höchstens 100 %)
  if (o.art === 'lobpreis') c *= lobpreisVorliebe(b);
  else if (typeof o.musik === 'boolean' && !(v && v.musikFaktor === false)) c = Math.min(1, c * musikFaktor(b, o.musik));
  if (o.woche !== undefined && b.besuchtWoche === o.woche) c *= ZWEITER_BESUCH;
  if (o.faktor) c = Math.min(1, c * o.faktor);   // Feste und Zeiten im Kirchenjahr (höchstens 100 %)
  return c;
}

// Jugendliche/Erwachsene: Faktor für diese Veranstaltung (1 = wie bisher)
export function artFaktor(b, art) {
  const v = art ? VERANSTALTUNGEN.find(x => x.id === art) : null;
  if (v && typeof v.erwachsene === 'number' && !istJugend(b)) return v.erwachsene;   // Jugendgottesdienst: Erwachsene × 0,1
  return jugendFaktor(b, art, !!(v && v.nurJugend));
}

// Wie gern jemand zum normalen Gottesdienst mit (musik = true) oder ohne Musik kommt: 0 % Vorliebe mit Musik × 0,5, 100 % × 1,5
export function musikFaktor(b, musik) {
  const v = lobpreisVorliebe(b);
  return musik ? LOBPREIS_MUSIK.mitMusik + v : LOBPREIS_MUSIK.ohneMusik - v;
}
// Wie das Lobpreisteam bei jemandem ankommt: −1 (0 % Vorliebe) … 0 (50 %) … +1 (100 %); mal den Bonus des Teams
export function musikWirkung(b) { return LOBPREIS_MUSIK.haltungFaktor * lobpreisVorliebe(b) - 1; }

// Neue Besucher pro Woche: Bekanntheit ÷ 10, der Rest als Chance (15 → 1 sicher + 50 % auf einen zweiten)
export function neueBesucherZahl(bekanntheit, zufall = Math.random) {
  const s = bekanntheit / BEKANNTHEIT.teiler, n = Math.floor(s);
  return n + (zufall() < s - n ? 1 : 0);
}

// Wer kommt diesmal? Bekannte Besucher nach ihrer Chance, dazu Neugierige aus dem Ort und die neuen Besucher
// über die Bekanntheit – diese zuerst aus den bekannten Passanten, sonst ganz neue Leute (nur, solange im Einzugsgebiet Platz ist).
// o: { art, woche, ausschluss (Kennungen, die gerade woanders sind), neuAnteil (Anteil der Wochen-Neuen für diesen Termin),
//      faktor (Besucher-Faktor des Kirchenjahres: auch die neuen Besucher × faktor) }
export function werKommt(z, zufall = Math.random, o = {}) {
  const aus = o.ausschluss || new Set();
  const bekannte = z.besucher.filter(b => !aus.has(b.id) && zufall() < besuchChance(b, o));
  const neue = [], ort = z.ort ? z.ort.leute : [];
  // Jugendliche/Erwachsene (JUGEND): passt diese Veranstaltung? Faktor 1 = sicher, 0 = nie, dazwischen mit dieser Chance.
  const passt = p => { const f = artFaktor(p, o.art); return f >= 1 || (f > 0 && zufall() < f); };
  for (const p of ort.filter(p => p.neugierig)) {
    const f = artFaktor(p, o.art);
    if (f <= 0) continue;                                  // z. B. Erwachsene beim Konfirmandenunterricht: bleiben neugierig
    if (zufall() < NEUGIER.kommChance * f) neue.push(ausDemOrt(z, p)); else p.neugierig = false;
  }
  let frei = null;
  const anzahlNeu = o.keineNeuen ? 0 : neueBesucherZahl(z.bekanntheit * (o.neuAnteil ?? 1) * (o.faktor || 1), zufall);
  for (let i = anzahlNeu; i > 0; i--) {
    const rest = z.ort ? z.ort.leute : [];
    if (rest.length) { const p = rest[Math.floor(zufall() * rest.length)]; if (passt(p)) neue.push(ausDemOrt(z, p)); continue; }
    if (frei === null) frei = platzImGebiet(z);
    if (frei <= 0) break;                                  // Einzugsgebiet voll: keine ganz neuen Leute
    const p = neuePerson(z, NEU_ZUFRIEDENHEIT, zufall);
    if (passt(p)) { z.besucher.push(p); neue.push(p); frei--; }
  }
  return [...bekannte, ...neue];
}

// Haltung ändern (intern „zufriedenheit“). Haltungslevel (25.11.): Erreicht sie 100, geht es ein Level hoch, die Haltung beginnt bei 0
// und ein Bedürfnis kommt dazu (im höchsten Level bleibt sie bei 100). Fällt sie auf 0, geht es ein Level runter, die Haltung steht
// bei 50 und das zuletzt dazugekommene Bedürfnis geht wieder (in Level 1 bleibt sie bei 0).
export function zufriedenheitAendern(b, wert) {
  const H = HALTUNGSLEVEL, level = levelVon(b);
  let h = b.zufriedenheit + wert;
  if (h >= H.aufstiegBei && level < H.max) { b.level = level + 1; h = 0; beduerfnisDazu(b); }
  else if (h <= 0 && wert < 0 && level > 1) { b.level = level - 1; h = H.nachAbstieg; if (Array.isArray(b.beduerfnisse)) b.beduerfnisse.pop(); }
  b.zufriedenheit = Math.max(0, Math.min(100, h));
}
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
