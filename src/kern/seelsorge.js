// Spiellogik der Seelsorge: Ab und zu bittet eine Person den Pastor um ein Gespräch. Solange die Anfrage offen ist,
// steht die Zeit still. Der Pastor kann ablehnen oder einen von 3 Ratschlägen geben; je nach Rat (und etwas Zufall)
// geht es gut oder schlecht aus. Mit jedem Gespräch sammelt der Pastor Erfahrung (Stufe 1–20).
// Kennt keine Texte: Situationen und Ergebnisse sind Codes, die Oberfläche macht Text daraus.
import { SEELSORGE, SITUATIONEN } from '../inhalte/seelsorge.js';
import { TAG_MIN } from './zeit.js';
import { kannBezahlen, buchen } from './finanzen.js';
import { zufriedenheitAendern, bekanntheitAendern, kommChance } from './besucher.js';
import { mensch } from './ort.js';
import { LAUFTEMPO } from '../inhalte/zeit.js';
import { hindernisBei } from './moebel.js';
import { weg, glaetten } from './wege.js';
import { strasse, punktAufWeg, strecke } from './bewegung.js';
import { gangOrt } from './toiletten.js';
import { automatGangSeelsorge, nachherBesuch } from './automaten.js';
import { seelsorgeStufe, seelsorgePunkteDazu, seelsorgerVon, alleSeelsorger } from './skills.js';
import { freiFuerGespraech } from './dienst.js';
import { daten } from './personen.js';

// Mehrere Hauptamtliche (Jugendpastor, 27.11.): Jeder hat seine eigene Seelsorge-Stufe. Eine Anfrage geht an einen
// freien Hauptamtlichen (in der Gemeinde und gerade ohne Schicht), bei mehreren freien per Zufall. Ist keiner frei,
// wartet die Anfrage (S.wartet) und wird alle WARTEN Spielminuten neu versucht. Wer gefragt wird, steht in gang.bei
// bzw. anfrage.bei (ältere Spielstände ohne bei: der erste Seelsorger, Pastor Harder).
const WARTEN = 15;
const seelsorgerDer = (z, A) => (A && A.bei && z.personen.find(p => p.id === A.bei)) || seelsorgerVon(z);
// gesperrt(z, p): leitet p gerade eine Veranstaltung (oder gleich)? (aus ablauf.js; in Tests oft () => false)
const freieSeelsorger = (z, raeume, gesperrt) => alleSeelsorger(z).filter(p => freiFuerGespraech(z, raeume, p) && !gesperrt(z, p));

export function seelsorgeAnlegen(z) {
  if (!z.seelsorge) z.seelsorge = { anfrage: null, tag: -1, pruefungen: [], letzte: null };
  const S = z.seelsorge;
  if (typeof S.anzahl !== 'number') S.anzahl = 0;      // so viele Anfragen gab es schon (für den Anfangsschub)
  if (!S.gang) S.gang = null;                           // wer gerade zum Pastor (oder wieder heim) läuft
  if (!S.wartet) S.wartet = null;                       // Anfrage, die wartet, bis ein Hauptamtlicher frei ist (27.11.)
}

// Anfangsschub: die ersten Anfragen kommen öfter; der Schub wird mit jeder Anfrage kleiner.
export function schub(anzahl) {
  const A = SEELSORGE.anfangsSchub;
  return 1 + (A.faktor - 1) * Math.max(0, (A.anfragen - anzahl) / A.anfragen);
}

// Weg vom Tor bis neben den Pastor (null, wenn er nicht erreichbar ist)
function wegZumPastor(z, zufall, pastor = seelsorgerVon(z)) {
  if (!pastor) return null;
  const blockiert = (x, y) => hindernisBei(z, x, y) || z.personen.some(p => p.x === x && p.y === y);
  const start = strasse(Math.floor(zufall() * 4));
  const roh = weg(z, start, { x: pastor.x, y: pastor.y }, blockiert);
  if (!roh || roh.length < 3) return null;
  const pfad = glaetten(z, roh.slice(0, -1), blockiert) || roh.slice(0, -1);   // stehen bleiben direkt neben dem Pastor
  let laenge = 0;
  for (let i = 0; i < pfad.length - 1; i++) laenge += Math.hypot(pfad[i + 1].x - pfad[i].x, pfad[i + 1].y - pfad[i].y);
  return { pfad, laenge };
}
export function anfrageOffen(z) { return !!(z.seelsorge && z.seelsorge.anfrage); }

// Stufe, Punkte und Charakter-Karte der Seelsorge: seit 26.11. in skills.js (Punkte im Skill-Fach von Pastor Harder)

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
function pruefen(z, gesperrt, zufall, raeume) {
  const S = z.seelsorge;
  if (S.anfrage || S.gang || S.wartet || gesperrt(z)) return;
  const stunden = 7 * (SEELSORGE.bis - SEELSORGE.von);
  if (zufall() >= SEELSORGE.anfragenProWoche[seelsorgeStufe(z) - 1] * schub(S.anzahl) / stunden) return;
  const besucher = z.besucher, ort = z.ort ? z.ort.leute : [];
  if (!besucher.length && !ort.length) return;
  const liste = besucher.length && (!ort.length || zufall() < SEELSORGE.anteilBesucher) ? besucher : ort;
  const p = liste[Math.floor(zufall() * liste.length)];
  const auswahl = SITUATIONEN.filter(s => s.id !== S.letzte);           // nicht zweimal hintereinander dasselbe
  const sit = auswahl[Math.floor(zufall() * auswahl.length)];
  S.letzte = sit.id; S.anzahl++;
  zuEinemSeelsorger(z, zufall, raeume, p.id, sit.id, gesperrt);
}
// Anfrage an einen freien Hauptamtlichen schicken – ist keiner frei, wartet sie
function zuEinemSeelsorger(z, zufall, raeume, id, situation, gesperrt = () => false) {
  const S = z.seelsorge, frei = freieSeelsorger(z, raeume, gesperrt);
  if (!frei.length) { S.wartet = { id, situation }; return; }
  S.wartet = null;
  const pastor = frei.length > 1 ? frei[Math.floor(zufall() * frei.length)] : frei[0];
  const hin = wegZumPastor(z, zufall, pastor);
  if (hin) {
    S.gang = { id, situation, bei: pastor.id, t0: z.minuten, hin, da: false, zurueck: null };   // erst hinlaufen
    // Getränkeautomat (Lukas, 27.11.): vielleicht erst über den Automaten zum Pastor
    const v = raeume && automatGangSeelsorge(z, raeume, besuchVon(S.gang), id, hin.pfad[0], hin.pfad[hin.pfad.length - 1], z.minuten);
    if (v) S.gang.vor = v;
  }
  else S.anfrage = { id, situation, bei: pastor.id, phase: 'frage', ergebnis: null };              // kein Weg: gleich fragen
}
// Wartende Anfrage: ist jetzt jemand frei? (Person gibt es nicht mehr: Anfrage fällt weg)
function warteVersuch(z, gesperrt, zufall, raeume) {
  const W = z.seelsorge.wartet;
  if (!W) return;
  if (!mensch(z, W.id)) { z.seelsorge.wartet = null; return; }
  if (gesperrt(z)) return;
  zuEinemSeelsorger(z, zufall, raeume, W.id, W.situation, gesperrt);
}
// Kennung des Besuchs (für den Automaten) und wann man beim Pastor ankommt bzw. wieder vom Gelände ist
const besuchVon = G => `ss:${G.t0}:${G.id}`;
const ankunftVon = G => G.vor ? G.vor.zurueckBis : G.t0 + G.hin.laenge / LAUFTEMPO;
const wegVon = G => G.nach ? G.nach.zurueckBis : G.zurueck.t0 + G.hin.laenge / LAUFTEMPO;
// Nach dem Gespräch (Lukas, 27.11.): vielleicht über den Automaten zurück zum Tor
function rueckwegPlanen(z, raeume) {
  const G = z.seelsorge.gang, pfad = G.hin.pfad;
  G.nach = (raeume && automatGangSeelsorge(z, raeume, nachherBesuch(besuchVon(G)), G.id, pfad[pfad.length - 1], pfad[0], G.zurueck.t0)) || null;
}
// Angekommen beim Pastor: jetzt kommt die Anfrage (die Zeit hält an)
function ankommen(z) {
  const G = z.seelsorge.gang;
  G.da = true;
  z.seelsorge.anfrage = { id: G.id, situation: G.situation, bei: G.bei || null, phase: 'frage', ergebnis: null };
}

// Nächster Schritt (für das Tick-System). gesperrt(z) sagt, ob gerade keine Anfrage kommen darf (Gottesdienst).
// raeume (27.11.): für den Weg über den Getränkeautomaten (ohne raeume: direkt)
export function seelsorgeSchritt(z, gesperrt, zufall, raeume = null) {
  if (z.ortRuhig) return null;                                           // nur für Tests
  const S = z.seelsorge, tag = Math.floor(z.minuten / TAG_MIN), morgen = (tag + 1) * TAG_MIN, G = S.gang;
  if (S.tag < tag) return { zeit: z.minuten, tun: () => planen(z, tag, zufall) };
  if (G && !G.da) return { zeit: Math.max(z.minuten, ankunftVon(G)), tun: () => ankommen(z) };
  if (G && G.zurueck && !('nach' in G)) return { zeit: z.minuten, tun: () => rueckwegPlanen(z, raeume) };
  if (G && G.zurueck) {                                                   // wieder heim: am Tor verschwinden
    const weg = wegVon(G);
    if (weg < morgen) return { zeit: Math.max(z.minuten, weg), tun: () => { S.gang = null; } };
  }
  if (S.wartet && !G && !S.anfrage) return { zeit: z.minuten + WARTEN, tun: () => warteVersuch(z, gesperrt, zufall, raeume) };
  if (S.pruefungen.length && S.pruefungen[0] < morgen) return { zeit: S.pruefungen[0], tun: () => { S.pruefungen.shift(); pruefen(z, gesperrt, zufall, raeume); } };
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
  const p = mensch(z, A.id), wer = seelsorgerDer(z, A), vorher = seelsorgeStufe(z, wer);
  const gut = zufall() < chanceVon(rat, vorher);
  const e = {
    rat: nr, gut, haltungVorher: p ? p.zufriedenheit : null, haltungNachher: null, kommChance: null,
    haltung: gut ? (rat.haltungGut ?? SEELSORGE.gut.haltung) : SEELSORGE.schlecht.haltung,
    bekanntheit: gut ? (rat.bekanntheitGut ?? SEELSORGE.gut.bekanntheit) : 0,
    spende: gut ? rat.spendeGut || 0 : 0, kosten: rat.kosten || 0, neugierig: false, neueStufe: null
  };
  if (p) zufriedenheitAendern(p, e.haltung);
  bekanntheitAendern(z, e.bekanntheit, 'seelsorge');
  if (e.kosten) buchen(z, 'ausgaben', 'seelsorge', e.kosten);
  if (e.spende) buchen(z, 'einnahmen', 'spende', e.spende);
  // Ein Passant, bei dem das Gespräch gut ausgeht, wird neugierig auf die Gemeinde.
  const passant = !!(p && z.ort && z.ort.leute.includes(p));
  if (gut && passant && !p.neugierig) { p.neugierig = true; e.neugierig = true; }
  // Vorher → nachher, und bei Besuchern: mit welcher Chance sie jetzt zur nächsten Veranstaltung kommen
  if (p) { e.haltungNachher = p.zufriedenheit; if (!passant) e.kommChance = Math.round(kommChance(p) * 100); }
  seelsorgePunkteDazu(z, SEELSORGE.erfahrung.gespraech + (gut ? SEELSORGE.erfahrung.gutExtra : 0), wer);
  const nachher = seelsorgeStufe(z, wer);
  if (nachher > vorher) {
    e.neueStufe = nachher;
    e.stufeBonus = Math.round(SEELSORGE.bonusProStufe * (nachher - vorher) * 1000) / 10;   // so viel % mehr Erfolgschance
    e.freischaltung = SEELSORGE.freischaltungen.includes(nachher) ? nachher : null;          // neu freigeschaltet auf dieser Stufe
  }
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
  const wer = seelsorgerDer(z, A), st = seelsorgeStufe(z, wer), E = SEELSORGE.einschaetzung, wd = wer && daten(wer);
  const chancen = sit.raete.map(r => chanceVon(r, st)), beste = chancen.indexOf(Math.max(...chancen));
  return { id: p.id, voll: p.voll, vorname: p.vorname, situation: sit.id, phase: A.phase, ergebnis: A.ergebnis,
    besuche: p.besuche || 0, haltung: p.zufriedenheit,
    seelsorger: wd ? { id: wer.id, name: wd.name } : null,   // mit wem die Person spricht (27.11.)
    raete: sit.raete.map((r, i) => ({ kosten: r.kosten || 0, leistbar: !r.kosten || kannBezahlen(z, r.kosten),
      // Was der Pastor auf seiner Stufe erkennt: beste (Stufe 5–9), Einschätzung (ab 10), genaue Chance in % (ab 15)
      beste: st >= E.besteAb && st < E.alleAb && i === beste,
      einschaetzung: st >= E.alleAb ? einschaetzen(chancen[i]) : null,
      prozent: st >= E.prozentAb ? Math.round(chancen[i] * 100) : null })) };
}

// Chance, dass ein Rat gut ausgeht: Grundchance + Bonus je Stufe über 1, höchstens 95 % (auf 0,1 % gerundet)
export function chanceVon(rat, st) {
  return Math.min(SEELSORGE.hoechsteChance, Math.round((rat.chance + SEELSORGE.bonusProStufe * (st - 1)) * 1000) / 1000);
}
// 'gut' | 'unsicher' | 'riskant'
export function einschaetzen(chance) {
  const E = SEELSORGE.einschaetzung;
  return chance >= E.gutAb - 1e-9 ? 'gut' : chance >= E.unsicherAb - 1e-9 ? 'unsicher' : 'riskant';
}

// Wo läuft die Person gerade, die zum Pastor will (oder wieder heim)? Aus der Spielzeit berechnet.
const automatWege = new Map();   // Wege über den Automaten (nur für die Anzeige, wird nicht gespeichert)
export function seelsorgePositionen(z) {
  const G = z.seelsorge && z.seelsorge.gang, p = G && mensch(z, G.id);
  if (!p) return [];
  const L = G.hin.laenge, t = z.minuten, figur = pos => [{ id: p.id, name: p.vorname, x: pos.x, y: pos.y, sitzt: false, seelsorge: true }];
  // Über den Getränkeautomaten (27.11.): hin (G.vor) bzw. zurück (G.nach)
  if (automatWege.size > 40) automatWege.clear();
  const st = (k, a, b) => strecke(z, automatWege, k, a, b), schl = besuchVon(G);
  if (G.vor && !G.da) return figur(gangOrt(G.vor, t, st, punktAufWeg, schl + ':v'));
  if (G.zurueck && G.nach) return t < G.nach.zurueckBis ? figur(gangOrt(G.nach, t, st, punktAufWeg, schl + ':n')) : [];
  if (G.zurueck && !('nach' in G)) return figur(G.hin.pfad[G.hin.pfad.length - 1]);
  let d = G.zurueck ? L + (z.minuten - G.zurueck.t0) * LAUFTEMPO : G.da ? L : (z.minuten - G.t0) * LAUFTEMPO;
  if (d > 2 * L) return [];
  const pos = d <= L ? punktAufWeg(G.hin, d) : punktAufWeg({ pfad: [...G.hin.pfad].reverse() }, d - L);
  return [{ id: p.id, name: p.vorname, x: pos.x, y: pos.y, sitzt: false, seelsorge: true }];
}
export function seelsorgeUnterwegs(z) { const G = z.seelsorge && z.seelsorge.gang; return G ? G.id : null; }
