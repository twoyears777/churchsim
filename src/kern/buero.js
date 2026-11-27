// Spiellogik: Büro, Orga-Tokens und Boni (Spielprinzip von Lukas, 27.11.2026: claude/spielprinzip-buero-orga-tokens.md).
// Kennt keine Grafik und keine Texte. Zahlen: BUERO und BONI in inhalte/buero.js.
//
// - Die Büro-Stelle steht im Dienstplan (kern/dienst.js, Termin-Schlüssel bu:<Tag>:<Slot>).
// - Kurz vor dem Ende jeder besetzten Büro-Schicht wird geprüft, ob der Ehrenamtliche wirklich im Büro ist.
//   Dann gibt es BUERO.tokensProSchicht Orga-Token. Tokens: z.buero.tokens, ohne Obergrenze, bleiben beim Abriss erhalten.
// - Boni kauft man mit Tokens (bonusFreischalten). Aktive Boni: z.buero.boni[id] = { bis } (Spielminuten).
// - „Einladungsbrief für Konfis“: gilt bis zur nächsten Konfirmation. Solange er gilt, kommen jeden Montag um 8 Uhr
//   proWoche neue Jugendliche als Besucher dazu – zuerst bekannte jugendliche Passanten, sonst ganz neue Leute,
//   aber nur, solange im Einzugsgebiet Platz ist. Sie tragen die Marke b.konfiBrief: Zum nächsten Konfirmandenunterricht
//   kommen sie mit ersterKonfi (75 %), danach gilt ihre normale Kommchance.
// Meldung (z.buero.meldung): 'konfiBrief' beim Freischalten.
import { BUERO, BONI } from '../inhalte/buero.js';
import { MELDUNG_DAUER } from '../inhalte/zeit.js';
import { idx } from './karte.js';
import { WOCHE_MIN, TAG_MIN, zeitpunkt } from './zeit.js';
import { bueroSchichten, schichtbetrieb } from './dienst.js';
import { jahrgangAm, istJugend } from './konfi.js';
import { neuePerson, ausDemOrt } from './besucher.js';
import { platzImGebiet } from './einzugsgebiet.js';
import { NEU_ZUFRIEDENHEIT } from '../inhalte/besucher.js';

const EPS = 1e-6;
const PRUEFEN_VOR_ENDE = 1;   // so viele Spielminuten vor Schichtende wird geprüft (danach geht der Ehrenamtliche heim)
const bonus = id => BONI.find(b => b.id === id);
const montag = (woche, stunde) => woche * WOCHE_MIN + stunde * 60;

export function bueroAnlegen(z) {
  if (!z.buero) z.buero = {};
  const B = z.buero;
  if (typeof B.tokens !== 'number') B.tokens = 0;
  if (!B.boni) B.boni = {};
  if (typeof B.gutgeschrieben !== 'number') B.gutgeschrieben = typeof z.minuten === 'number' ? z.minuten : 0;   // bis hier sind Schichten abgerechnet
  if (typeof B.jugendWoche !== 'number') {   // Montag, an dem zuletzt neue Jugendliche kamen (Spielbeginn nach Montag 8:00: diese Woche ist vorbei)
    const w = typeof z.minuten === 'number' ? zeitpunkt(z.minuten).woche : 0;
    B.jugendWoche = (z.minuten || 0) >= montag(w, bonus('einladungKonfi').stunde) ? w : w - 1;
  }
}

// ---- Boni ----
export function bonusAktiv(z, id, t = z.minuten) {
  const b = z.buero && z.buero.boni[id];
  return !!b && t < b.bis - EPS;
}
// Bis wann gilt ein Bonus, wenn man ihn jetzt freischaltet? (Spielminuten)
function gueltigBis(z, b) {
  if (b.gilt === 'jahrgang') {
    const heute = Math.floor(z.minuten / TAG_MIN), tag = jahrgangAm(heute + 1);   // am Tag der Konfirmation gilt schon der nächste Jahrgang
    return tag === null ? z.minuten + 52 * WOCHE_MIN : tag * TAG_MIN;
  }
  return Infinity;
}
// Befehl: Bonus mit Orga-Tokens freischalten → 'ok' | 'keine' | 'aktiv' (gilt noch) | 'tokens' (zu wenige)
export function bonusFreischalten(z, id) {
  bueroAnlegen(z);
  const b = bonus(id);
  if (!b) return 'keine';
  if (bonusAktiv(z, id)) return 'aktiv';
  if (z.buero.tokens < b.preis) return 'tokens';
  z.buero.tokens -= b.preis;
  z.buero.boni[id] = { bis: gueltigBis(z, b), seit: z.minuten };
  z.buero.meldung = { code: id === 'einladungKonfi' ? 'konfiBrief' : id, zeit: z.minuten };
  return 'ok';
}

// ---- Neue Jugendliche über den Einladungsbrief ----
export function jugendlicheEinladen(z, anzahl, zufall = Math.random) {
  const neu = [];
  for (let i = 0; i < anzahl; i++) {
    const bekannt = (z.ort ? z.ort.leute : []).filter(p => istJugend(p));
    if (bekannt.length) { const p = ausDemOrt(z, bekannt[Math.floor(zufall() * bekannt.length)]); p.konfiBrief = true; neu.push(p); continue; }
    if (platzImGebiet(z) <= 0) break;   // Einzugsgebiet voll: keine ganz neuen Leute
    const p = neuePerson(z, NEU_ZUFRIEDENHEIT, zufall);
    p.jugend = true; p.konfiBrief = true;
    z.besucher.push(p); neu.push(p);
  }
  return neu;
}
// Nach jedem Konfirmandenunterricht: Wer über den Brief kam und kommen konnte, hat seine 75-%-Chance gehabt.
// ausschluss: Kennungen, die gerade woanders waren (die behalten die Marke)
export function konfiBriefVerbraucht(z, ausschluss = new Set()) {
  for (const b of z.besucher || []) if (b.konfiBrief && !ausschluss.has(b.id)) delete b.konfiBrief;
}

// ---- Tick-System ----
// Nächste Büro-Schicht, deren Prüfung nach `nach` fällig ist → { zeit, s } | null
function naechstePruefung(z, raeume, nach) {
  const w = zeitpunkt(nach).woche;
  let beste = null;
  for (const s of bueroSchichten(z, raeume)) for (const woche of [w - 1, w, w + 1]) {
    const zeit = woche * WOCHE_MIN + s.bis - PRUEFEN_VOR_ENDE;
    if (zeit > nach + EPS && (!beste || zeit < beste.zeit)) beste = { zeit, s };
  }
  return beste;
}
function abrechnen(z, raeume) {
  const B = z.buero, t = z.minuten;
  for (;;) {
    const n = naechstePruefung(z, raeume, B.gutgeschrieben);
    if (!n || n.zeit > t + EPS) break;
    B.gutgeschrieben = n.zeit;
    const p = n.s.person;
    // Nur, wer wirklich im Büro sitzt (nicht daheim, nicht unterwegs zu einer anderen Stelle)
    if (Math.abs(n.zeit - t) < EPS && !p.daheim && raeume.gruppe[idx(z, p.x, p.y)] === n.s.raum) B.tokens += BUERO.tokensProSchicht;
  }
  if (B.gutgeschrieben < t) B.gutgeschrieben = t;
}
function montagsJugendliche(z, zufall) {
  const B = z.buero, b = bonus('einladungKonfi');
  B.jugendWoche++;
  if (bonusAktiv(z, b.id)) jugendlicheEinladen(z, b.proWoche, zufall);
}
export function bueroSchritt(z, raeume) {
  bueroAnlegen(z);
  const B = z.buero, zeiten = [];
  if (schichtbetrieb(z)) { const n = naechstePruefung(z, raeume, Math.max(B.gutgeschrieben, z.minuten - EPS)); if (n) zeiten.push(n.zeit); }
  const b = bonus('einladungKonfi');
  zeiten.push(Math.max(z.minuten, montag(B.jugendWoche + 1, b.stunde)));
  const zeit = Math.min(...zeiten);
  return { zeit, tun: (zz, rr, zufall) => {
    if (zz.minuten >= montag(zz.buero.jugendWoche + 1, b.stunde) - EPS) montagsJugendliche(zz, zufall || Math.random);
    abrechnen(zz, rr);
  } };
}

// ---- Für die Anzeige ----
export function bueroMeldung(z) {
  const m = z.buero && z.buero.meldung;
  return m && z.minuten - m.zeit < MELDUNG_DAUER ? { code: m.code, name: '', zeit: m.zeit } : null;
}
export const bueroTokens = z => (z.buero ? z.buero.tokens : 0);
export function boniListe(z) {
  return BONI.map(b => ({ id: b.id, preis: b.preis, gilt: b.gilt, proWoche: b.proWoche, ersterKonfi: b.ersterKonfi,
    aktiv: bonusAktiv(z, b.id), bis: bonusAktiv(z, b.id) ? z.buero.boni[b.id].bis : null, leistbar: bueroTokens(z) >= b.preis }));
}
