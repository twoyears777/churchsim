// Musiker gehen zu ihrem Instrument (Wunsch von Lukas, 26.11.2026). Kennt keine Grafik und keine Texte.
//
// So läuft es (von Lukas so festgelegt):
//   • Bei jeder Veranstaltung, bei der Ehrenamtliche ein Instrument spielen, laufen sie rechtzeitig zu ihrem Instrument:
//     Sie brechen so auf, dass sie genau zum Beginn dort stehen.
//   • Feste Reihenfolge: Wer das höchste Musik-Level hat, nimmt das erste Instrument der Reihe
//     Gitarre, Keyboard, Schlagzeug, Bass, E-Gitarre, Mikrofon (Reihenfolge der Möbelliste), der nächste das nächste usw.
//   • Kirchenchorprobe: Wer sie leitet (ein Ehrenamtlicher), geht ans Klavier.
//   • Ist die Veranstaltung vorbei, laufen sie gleich zurück an ihren eigenen Platz.
//
// Das ist nur fürs Auge, wie das Umherlaufen: Der eigentliche Platz (p.x, p.y) bleibt gleich, alle Spielregeln rechnen
// weiter damit. Alles wird aus der Uhrzeit ausgerechnet – der Spielstand braucht nichts Neues, alte Spielstände passen sofort.
import { MOEBEL } from '../inhalte/moebel.js';
import { VERANSTALTUNGEN } from '../inhalte/veranstaltungen.js';
import { LAUFTEMPO } from '../inhalte/zeit.js';
import { LEER, idx } from './karte.js';
import { moebelImRaum, moebelBei } from './moebel.js';
import { daten } from './personen.js';
import { strecke, punktAufWeg } from './bewegung.js';
import { gottesdienstRaeume, terminInfo } from './ablauf.js';

const EPS = 1e-6;
// Feste Reihenfolge der Instrumente: wie in der Möbelliste, das Klavier (Chorprobe) zuletzt
export const REIHENFOLGE = [...MOEBEL.filter(m => m.wirkung && m.wirkung.musik).map(m => m.id), 'klavier'];

// Wer spielt welches Instrument? g: Eintrag aus gottesdienstRaeume, leitung: wer die Veranstaltung leitet
// → [{ p, instrument }] (instrument = Möbelstück auf der Karte)
function belegung(z, g, art, leitung) {
  const v = VERANSTALTUNGEN.find(x => x.id === art);
  if (!v) return [];
  // Chorprobe: Leitung (Ehrenamtlicher) ans Klavier
  if ((v.braucht || []).includes('klavier')) {
    const d = leitung && daten(leitung), klavier = moebelImRaum(z, g.raum, 'klavier')[0];
    return d && d.art === 'ehrenamt' && klavier ? [{ p: leitung, instrument: klavier }] : [];
  }
  // Lobpreisteam: g.spieler ist schon nach Musik-Level sortiert (höchstes zuerst)
  const instrumente = REIHENFOLGE.flatMap(id => moebelImRaum(z, g.raum, id));
  return g.spieler.slice(0, instrumente.length).map((p, i) => ({ p, instrument: instrumente[i] }));
}

// Freies Kästchen direkt am Instrument (gerade daneben vor schräg, dann am nächsten zum eigenen Platz).
// Steht er schon direkt daneben, bleibt er, wo er ist. → { x, y } | null (kein Platz frei: bleibt stehen)
function standplatz(z, raum, instrument, p, belegt) {
  const zellen = new Set(raum.zellen);
  if (Math.abs(p.x - instrument.x) <= 1 && Math.abs(p.y - instrument.y) <= 1) return { x: p.x, y: p.y };
  const frei = (x, y) => zellen.has(idx(z, x, y)) && z.zellen[idx(z, x, y)] === LEER && !moebelBei(z, x, y)
    && !belegt.has(`${x},${y}`) && !z.personen.some(q => q !== p && q.x === x && q.y === y);
  const liste = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if ((dx || dy) && frei(instrument.x + dx, instrument.y + dy)) liste.push({ x: instrument.x + dx, y: instrument.y + dy, schraeg: dx && dy ? 1 : 0 });
  }
  liste.sort((a, b) => a.schraeg - b.schraeg || Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
  return liste.length ? { x: liste[0].x, y: liste[0].y } : null;
}

// Gänge aller Musiker für einen Termin: [{ p, ziel, weg, dauer }]
function gaengeFuer(z, raeume, speicher, g, art, leitung, gaeste = []) {
  const belegt = new Set(gaeste.filter(x => x.sitz).map(x => `${x.sitz.x},${x.sitz.y}`)), liste = [];
  for (const { p, instrument } of belegung(z, g, art, leitung)) {
    const ziel = standplatz(z, g.raum, instrument, p, belegt);
    if (!ziel || (ziel.x === p.x && ziel.y === p.y)) continue;   // schon dort oder kein Platz frei
    belegt.add(`${ziel.x},${ziel.y}`);
    const weg = strecke(z, speicher, `instrument:${p.id}:${p.x},${p.y}:${ziel.x},${ziel.y}:${z.moebel.length}`, { x: p.x, y: p.y }, ziel);
    liste.push({ p, ziel, weg, dauer: weg.laenge / LAUFTEMPO });
  }
  return liste;
}

// Alle laufenden Gänge zu den Instrumenten zur Zeit t → Map Person-Kennung → { weg, los, ende, dauer }
// los: Aufbruch am eigenen Platz, ende: Ende der Veranstaltung (Infinity = läuft noch)
export function musikerGaenge(z, raeume, speicher = new Map(), t = z.minuten) {
  const aktiv = new Map();
  for (const L of (z.laeufe || []).slice().reverse()) {   // jüngster Termin zuerst
    if (L.ausgefallen || !L.gaeste) continue;
    const ende = typeof L.gottesdienstEnde === 'number' ? L.gottesdienstEnde : Infinity;
    if (t >= ende + 60 * 24) continue;   // längst vorbei
    const info = terminInfo(z, raeume, L);
    if (!info || !info.p) continue;
    for (const gang of gaengeFuer(z, raeume, speicher, info.g, L.art, info.p.leitung, L.gaeste)) {
      if (aktiv.has(gang.p.id)) continue;
      const los = Math.max(L.start ?? -Infinity, L.beginn - gang.dauer);
      if (t < los - EPS || t >= ende + gang.dauer - EPS) continue;   // noch nicht los oder schon wieder zurück
      aktiv.set(gang.p.id, { weg: gang.weg, los, ende, dauer: gang.dauer });
    }
  }
  return aktiv;
}

// Wo ist dieser Musiker gerade? → { x, y } | null (nicht unterwegs zum Instrument: an seinem Platz)
export function musikerPosition(gaenge, p, t) {
  const g = gaenge.get(p.id);
  if (!g) return null;
  // Strecke ab dem eigenen Platz; angekommen = genau auf dem Kästchen (ohne Rechenkrümel)
  const d = t < g.ende ? (t - g.los) * LAUFTEMPO : g.weg.laenge - (t - g.ende) * LAUFTEMPO;   // zurück: denselben Weg
  const q = punktAufWeg(g.weg, d >= g.weg.laenge - EPS ? g.weg.laenge + 1 : Math.max(0, d));
  return { x: q.x, y: q.y };
}

// Wie viele Minuten vor Beginn muss dieser Ehrenamtliche zu einer Veranstaltung art in seinem Raum aufbrechen?
// (Für die Evangelisation: Wer dort steht, kommt so rechtzeitig zurück, dass er noch zum Instrument laufen kann.)
// raum: der Raum, in dem er eingesetzt ist; liste: gottesdienstRaeume (wird sonst berechnet)
export function musikerVorlauf(z, raeume, p, raum, art, liste = null) {
  const g = (liste || gottesdienstRaeume(z, raeume)).find(x => x.raum === raum);
  if (!g) return 0;
  const platz = g.programm.find(e => e.art === art), leitung = platz ? platz.leitung : null;
  const gang = gaengeFuer(z, raeume, new Map(), g, art, leitung).find(x => x.p === p);
  return gang ? gang.dauer : 0;
}
