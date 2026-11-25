// Spiellogik der Seelsorge: Ab und zu bittet eine Person den Pastor um ein Gespräch. Solange die Anfrage offen ist,
// steht die Zeit still. Der Pastor kann ablehnen oder einen von 3 Ratschlägen geben; je nach Rat (und etwas Zufall)
// geht es gut oder schlecht aus. Mit jedem Gespräch sammelt der Pastor Erfahrung (Stufe 1–5).
// Kennt keine Texte: Situationen und Ergebnisse sind Codes, die Oberfläche macht Text daraus.
import { SEELSORGE, SITUATIONEN } from '../inhalte/seelsorge.js';
import { TAG_MIN } from './zeit.js';
import { kannBezahlen, buchen } from './finanzen.js';
import { zufriedenheitAendern, bekanntheitAendern } from './besucher.js';
import { mensch } from './ort.js';

export function seelsorgeAnlegen(z) {
  if (!z.seelsorge) z.seelsorge = { punkte: 0, anfrage: null, tag: -1, pruefungen: [], letzte: null };
}
export function anfrageOffen(z) { return !!(z.seelsorge && z.seelsorge.anfrage); }

// Stufe aus den Erfahrungspunkten
export function stufe(punkte) {
  let s = 1;
  SEELSORGE.stufeAb.forEach((ab, i) => { if (punkte >= ab) s = i + 1; });
  return s;
}
export function stufeInfo(z) {
  const p = z.seelsorge.punkte, s = stufe(p);
  return { stufe: s, punkte: p, von: SEELSORGE.stufeAb[s - 1], bis: s < SEELSORGE.stufeAb.length ? SEELSORGE.stufeAb[s] : null };
}

// Pro Stunde zwischen 8 und 20 Uhr wird einmal geprüft, ob jemand fragt. Die Chance ist so gewählt,
// dass es im Schnitt so viele Anfragen pro Woche gibt, wie für die Stufe festgelegt.
function planen(z, tag, zufall) {
  const S = z.seelsorge;
  S.tag = tag; S.pruefungen = [];
  for (let h = SEELSORGE.von; h < SEELSORGE.bis; h++) {
    const t = tag * TAG_MIN + h * 60 + Math.floor(zufall() * 60);
    if (t >= z.minuten) S.pruefungen.push(t);
  }
}
function pruefen(z, gesperrt, zufall) {
  const S = z.seelsorge;
  if (S.anfrage || gesperrt(z)) return;
  const stunden = 7 * (SEELSORGE.bis - SEELSORGE.von);
  if (zufall() >= SEELSORGE.anfragenProWoche[stufe(S.punkte) - 1] / stunden) return;
  const besucher = z.besucher, ort = z.ort ? z.ort.leute : [];
  if (!besucher.length && !ort.length) return;
  const liste = besucher.length && (!ort.length || zufall() < SEELSORGE.anteilBesucher) ? besucher : ort;
  const p = liste[Math.floor(zufall() * liste.length)];
  const auswahl = SITUATIONEN.filter(s => s.id !== S.letzte);           // nicht zweimal hintereinander dasselbe
  const sit = auswahl[Math.floor(zufall() * auswahl.length)];
  S.letzte = sit.id;
  S.anfrage = { id: p.id, situation: sit.id, phase: 'frage', ergebnis: null };
}

// Nächster Schritt (für das Tick-System). gesperrt(z) sagt, ob gerade keine Anfrage kommen darf (Gottesdienst).
export function seelsorgeSchritt(z, gesperrt, zufall) {
  if (z.ortRuhig) return null;                                           // nur für Tests
  const S = z.seelsorge, tag = Math.floor(z.minuten / TAG_MIN), morgen = (tag + 1) * TAG_MIN;
  if (S.tag < tag) return { zeit: z.minuten, tun: () => planen(z, tag, zufall) };
  if (S.pruefungen.length && S.pruefungen[0] < morgen) return { zeit: S.pruefungen[0], tun: () => { S.pruefungen.shift(); pruefen(z, gesperrt, zufall); } };
  return { zeit: morgen, tun: () => planen(z, tag + 1, zufall) };
}

function situation(z) { const A = z.seelsorge.anfrage; return A && SITUATIONEN.find(s => s.id === A.situation); }

// Befehle → 'ok' | 'keine' (keine passende Anfrage) | 'geld'
export function ablehnen(z) {
  const A = z.seelsorge.anfrage, p = A && mensch(z, A.id);
  if (!A || A.phase !== 'frage') return 'keine';
  if (p) zufriedenheitAendern(p, SEELSORGE.ablehnen);
  A.phase = 'abgelehnt'; A.ergebnis = { haltung: SEELSORGE.ablehnen };
  return 'ok';
}

export function raten(z, nr, zufall = Math.random) {
  const S = z.seelsorge, A = S.anfrage, sit = situation(z), rat = sit && sit.raete[nr];
  if (!A || A.phase !== 'frage' || !rat) return 'keine';
  if (rat.kosten && !kannBezahlen(z, rat.kosten)) return 'geld';
  const p = mensch(z, A.id), vorher = stufe(S.punkte);
  const chance = Math.min(SEELSORGE.hoechsteChance, rat.chance + SEELSORGE.bonusProStufe * (vorher - 1));
  const gut = zufall() < chance;
  const e = {
    rat: nr, gut,
    haltung: gut ? (rat.haltungGut ?? SEELSORGE.gut.haltung) : SEELSORGE.schlecht.haltung,
    bekanntheit: gut ? (rat.bekanntheitGut ?? SEELSORGE.gut.bekanntheit) : 0,
    spende: gut ? rat.spendeGut || 0 : 0, kosten: rat.kosten || 0, neugierig: false, neueStufe: null
  };
  if (p) zufriedenheitAendern(p, e.haltung);
  bekanntheitAendern(z, e.bekanntheit);
  if (e.kosten) buchen(z, 'ausgaben', 'seelsorge', e.kosten);
  if (e.spende) buchen(z, 'einnahmen', 'spende', e.spende);
  // Ein Passant, bei dem das Gespräch gut ausgeht, wird neugierig auf die Gemeinde.
  if (gut && p && z.ort && z.ort.leute.includes(p) && !p.neugierig) { p.neugierig = true; e.neugierig = true; }
  S.punkte += SEELSORGE.erfahrung.gespraech + (gut ? SEELSORGE.erfahrung.gutExtra : 0);
  const nachher = stufe(S.punkte);
  if (nachher > vorher) e.neueStufe = nachher;
  A.phase = 'ergebnis'; A.ergebnis = e;
  return 'ok';
}

// Fenster zu: erst nach Ablehnen oder Ergebnis möglich. Danach läuft die Zeit weiter.
export function schliessen(z) {
  const A = z.seelsorge.anfrage;
  if (!A || A.phase === 'frage') return 'keine';
  z.seelsorge.anfrage = null;
  return 'ok';
}

// Was das Seelsorge-Fenster anzeigen muss (Codes und Zahlen)
export function anfrageInfo(z) {
  const A = z.seelsorge.anfrage;
  if (!A) return null;
  const p = mensch(z, A.id), sit = situation(z);
  if (!p || !sit) { z.seelsorge.anfrage = null; return null; }              // Person gibt es nicht mehr
  return { id: p.id, voll: p.voll, vorname: p.vorname, situation: sit.id, phase: A.phase, ergebnis: A.ergebnis,
    raete: sit.raete.map(r => ({ kosten: r.kosten || 0, leistbar: !r.kosten || kannBezahlen(z, r.kosten) })) };
}
