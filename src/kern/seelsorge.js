// Spiellogik der Seelsorge: Ab und zu bittet eine Person den Pastor um ein Gespräch. Solange die Anfrage offen ist,
// steht die Zeit still. Der Pastor kann ablehnen oder einen von 3 Ratschlägen geben; je nach Rat (und etwas Zufall)
// geht es gut oder schlecht aus. Mit jedem Gespräch sammelt der Pastor Erfahrung (Stufe 1–5).
// Kennt keine Texte: Situationen und Ergebnisse sind Codes, die Oberfläche macht Text daraus.
import { SEELSORGE, SITUATIONEN } from '../inhalte/seelsorge.js';
import { TAG_MIN } from './zeit.js';
import { kannBezahlen, buchen } from './finanzen.js';
import { zufriedenheitAendern, bekanntheitAendern } from './besucher.js';
import { mensch } from './ort.js';
import { LAUFTEMPO } from '../inhalte/zeit.js';
import { moebelBei } from './moebel.js';
import { weg, glaetten } from './wege.js';
import { strasse, punktAufWeg } from './bewegung.js';

export function seelsorgeAnlegen(z) {
  if (!z.seelsorge) z.seelsorge = { punkte: 0, anfrage: null, tag: -1, pruefungen: [], letzte: null };
  const S = z.seelsorge;
  if (typeof S.anzahl !== 'number') S.anzahl = 0;      // so viele Anfragen gab es schon (für den Anfangsschub)
  if (!S.gang) S.gang = null;                           // wer gerade zum Pastor (oder wieder heim) läuft
}

// Anfangsschub: die ersten Anfragen kommen öfter; der Schub wird mit jeder Anfrage kleiner.
export function schub(anzahl) {
  const A = SEELSORGE.anfangsSchub;
  return 1 + (A.faktor - 1) * Math.max(0, (A.anfragen - anzahl) / A.anfragen);
}

// Weg vom Tor bis neben den Pastor (null, wenn er nicht erreichbar ist)
function wegZumPastor(z, zufall) {
  const pastor = z.personen.find(p => p.id === 'pastor');
  if (!pastor) return null;
  const blockiert = (x, y) => !!moebelBei(z, x, y) || z.personen.some(p => p.x === x && p.y === y);
  const start = strasse(Math.floor(zufall() * 4));
  const roh = weg(z, start, { x: pastor.x, y: pastor.y }, blockiert);
  if (!roh || roh.length < 3) return null;
  const pfad = glaetten(z, roh.slice(0, -1), blockiert) || roh.slice(0, -1);   // stehen bleiben direkt neben dem Pastor
  let laenge = 0;
  for (let i = 0; i < pfad.length - 1; i++) laenge += Math.hypot(pfad[i + 1].x - pfad[i].x, pfad[i + 1].y - pfad[i].y);
  return { pfad, laenge };
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
  if (S.anfrage || S.gang || gesperrt(z)) return;
  const stunden = 7 * (SEELSORGE.bis - SEELSORGE.von);
  if (zufall() >= SEELSORGE.anfragenProWoche[stufe(S.punkte) - 1] * schub(S.anzahl) / stunden) return;
  const besucher = z.besucher, ort = z.ort ? z.ort.leute : [];
  if (!besucher.length && !ort.length) return;
  const liste = besucher.length && (!ort.length || zufall() < SEELSORGE.anteilBesucher) ? besucher : ort;
  const p = liste[Math.floor(zufall() * liste.length)];
  const auswahl = SITUATIONEN.filter(s => s.id !== S.letzte);           // nicht zweimal hintereinander dasselbe
  const sit = auswahl[Math.floor(zufall() * auswahl.length)];
  S.letzte = sit.id; S.anzahl++;
  const hin = wegZumPastor(z, zufall);
  if (hin) S.gang = { id: p.id, situation: sit.id, t0: z.minuten, hin, da: false, zurueck: null };   // erst hinlaufen
  else S.anfrage = { id: p.id, situation: sit.id, phase: 'frage', ergebnis: null };              // kein Weg: gleich fragen
}
// Angekommen beim Pastor: jetzt kommt die Anfrage (die Zeit hält an)
function ankommen(z) {
  const G = z.seelsorge.gang;
  G.da = true;
  z.seelsorge.anfrage = { id: G.id, situation: G.situation, phase: 'frage', ergebnis: null };
}

// Nächster Schritt (für das Tick-System). gesperrt(z) sagt, ob gerade keine Anfrage kommen darf (Gottesdienst).
export function seelsorgeSchritt(z, gesperrt, zufall) {
  if (z.ortRuhig) return null;                                           // nur für Tests
  const S = z.seelsorge, tag = Math.floor(z.minuten / TAG_MIN), morgen = (tag + 1) * TAG_MIN, G = S.gang;
  if (S.tag < tag) return { zeit: z.minuten, tun: () => planen(z, tag, zufall) };
  if (G && !G.da) return { zeit: Math.max(z.minuten, G.t0 + G.hin.laenge / LAUFTEMPO), tun: () => ankommen(z) };
  if (G && G.zurueck) {                                                   // wieder heim: am Tor verschwinden
    const weg = G.zurueck.t0 + G.hin.laenge / LAUFTEMPO;
    if (weg < morgen) return { zeit: Math.max(z.minuten, weg), tun: () => { S.gang = null; } };
  }
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
  const G = z.seelsorge.gang;
  if (G) G.zurueck = { t0: z.minuten };                                   // denselben Weg zurück zum Tor
  return 'ok';
}

// Was das Seelsorge-Fenster anzeigen muss (Codes und Zahlen)
export function anfrageInfo(z) {
  const A = z.seelsorge.anfrage;
  if (!A) return null;
  const p = mensch(z, A.id), sit = situation(z);
  if (!p || !sit) { z.seelsorge.anfrage = null; z.seelsorge.gang = null; return null; }              // Person gibt es nicht mehr
  return { id: p.id, voll: p.voll, vorname: p.vorname, situation: sit.id, phase: A.phase, ergebnis: A.ergebnis,
    raete: sit.raete.map(r => ({ kosten: r.kosten || 0, leistbar: !r.kosten || kannBezahlen(z, r.kosten) })) };
}

// Wo läuft die Person gerade, die zum Pastor will (oder wieder heim)? Aus der Spielzeit berechnet.
export function seelsorgePositionen(z) {
  const G = z.seelsorge && z.seelsorge.gang, p = G && mensch(z, G.id);
  if (!p) return [];
  const L = G.hin.laenge;
  let d = G.zurueck ? L + (z.minuten - G.zurueck.t0) * LAUFTEMPO : G.da ? L : (z.minuten - G.t0) * LAUFTEMPO;
  if (d > 2 * L) return [];
  const pos = d <= L ? punktAufWeg(G.hin, d) : punktAufWeg({ pfad: [...G.hin.pfad].reverse() }, d - L);
  return [{ id: p.id, name: p.vorname, x: pos.x, y: pos.y, sitzt: false, seelsorge: true }];
}
export function seelsorgeUnterwegs(z) { const G = z.seelsorge && z.seelsorge.gang; return G ? G.id : null; }
