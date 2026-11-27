// Spiellogik der Evangelisation vor dem Laden (Spielprinzip von Lukas, 26.11.2026: claude/spielprinzip-evangelisation.md).
// Kennt keine Grafik und keine Texte. Zahlen: EVANGELISATION in inhalte/evangelisation.js.
//
// So läuft es:
//   • Ehrenamtliche, die gerade frei haben, gehen von selbst zum Feld „Evangelisation!“ vor dem Laden (zwischen 8 und 20 Uhr).
//     Frei = in keinem Raum eingesetzt, oder eingesetzt, aber gerade ohne Dienst (keine Veranstaltung in ihrem Raum,
//     Kirchkaffee zu, Maschine voll, niemand in der Schlange).
//   • Höchstens EVANGELISATION.plaetze gleichzeitig; sind mehr frei, gehen die mit dem höchsten Evangelisation-Level
//     (bei Gleichstand der, der schon länger frei hat).
//   • Sie brechen so rechtzeitig auf, dass sie zu ihrer nächsten Aufgabe zur gleichen Zeit zurück sind wie sonst
//     (Beginn der Veranstaltung in ihrem Raum bzw. nächste Öffnung des Kirchkaffees).
//   • Läuft ein Passant am Feld vorbei, spricht ihn jeder Ehrenamtliche vor Ort mit 5 % + 5 % je Evangelisation-Level an
//     (zusammen höchstens 80 %). Seit 26.11. abends zählt dafür der eigene Skill „Evangelisation“, nicht mehr das Musik-Level.
//     Wer angesprochen wird, wird neugierig und kommt mit 75 % zum nächsten Gottesdienst – nur dorthin (p.eingeladen).
//   • Jugendliche Ehrenamtliche sprechen nur Jugendliche an und laden nur zum Jugendgottesdienst ein – und nur,
//     wenn einer geplant ist. Sonst stehen sie dort, laden aber niemanden ein.
//   • Bei der Evangelisation gibt es keine Musik-Erfahrung, aber Evangelisation-Erfahrung: 1 pro Spielstunde vor Ort
//     (Learning by Doing, Skill im Skill-Fach der Person, Regeln in skills.js).
//
// Der Platz eines Ehrenamtlichen (p.x, p.y) bleibt dabei gleich: Für alle Spielregeln steht er weiter in seinem Raum.
// Der Gang zum Laden ist eine eigene „Bewegung“ { pfad, laenge, t0 } wie beim Kaffee-Einkauf.
import { EVANGELISATION as E } from '../inhalte/evangelisation.js';
import { LAUFTEMPO } from '../inhalte/zeit.js';
import { daten, eingesetztIn } from './personen.js';
import { evangelisationLevel, evangelisationErfahrungDazu, evangelisationStand } from './skills.js';
import { zaehlen, statistik } from './evangelisationStatistik.js';
import { hindernisBei, fassung } from './moebel.js';
import { weg, glaetten } from './wege.js';
import { punktAufWeg } from './bewegung.js';
import { TAG_MIN, zeitpunkt } from './zeit.js';
import { termineDerWoche, naechsteKaffeeOeffnung, dauerVon, gottesdienstRaeume } from './ablauf.js';
import { offenBei, kirchkaffeeZustand } from './kirchkaffee.js';
import { istJugend } from './konfi.js';
import { musikerVorlauf } from './musiker.js';
import { aktiveSchicht, dienstAngekommen, dienstAnkunft } from './dienst.js';

const EPS = 1e-6;
// Beitrag eines Ehrenamtlichen zur Chance pro Passant (0–1): Grund + je Level, ohne Rechenkrümel
export const beitrag = p => Math.round((E.grundChance + evangelisationLevel(p) * E.chanceProLevel) * 1000) / 1000;

export function evangelisationAnlegen(z) {
  if (!z.evangelisation) z.evangelisation = { ma: {}, freiSeit: {} };
}

// Ist dieser Ehrenamtliche jugendlich? (Wer als Jugendlicher Ehrenamtlicher wurde – seit 26.11. gemerkt in herkunft.jugend)
export const istJugendEA = p => { const d = daten(p); return !!(d && d.herkunft && d.herkunft.jugend); };
const ehrenamtliche = z => z.personen.filter(p => { const d = daten(p); return d && d.art === 'ehrenamt'; });
// Schichtbetrieb (27.11.): auch Hauptamtliche können für die Evangelisation eingeteilt werden
const imDienstplan = z => z.personen.filter(p => { const d = daten(p); return d && (d.art === 'ehrenamt' || (z.schichtbetrieb && d.art === 'hauptamt')); });

// ---- Bewegung ----
function laenge(pfad) { let l = 0; for (let i = 0; i < pfad.length - 1; i++) l += Math.hypot(pfad[i + 1].x - pfad[i].x, pfad[i + 1].y - pfad[i].y); return l; }
function gehen(z, von, nach, t) {
  const a = { x: Math.round(von.x), y: Math.round(von.y) }, blockiert = (x, y) => hindernisBei(z, x, y);
  let pfad = glaetten(z, weg(z, a, nach, blockiert), blockiert) || [a, { x: nach.x, y: nach.y }];
  if (pfad[0].x !== von.x || pfad[0].y !== von.y) pfad = [{ x: von.x, y: von.y }, ...pfad];
  return { pfad, laenge: laenge(pfad), t0: t };
}
const posBei = (b, t) => punktAufWeg(b, Math.max(0, t - b.t0) * LAUFTEMPO);
const ankunft = b => b.t0 + b.laenge / LAUFTEMPO;
const dauer = b => b.laenge / LAUFTEMPO;

// ---- Wann hat ein Ehrenamtlicher Dienst? ----
// → { jetzt: true } (gerade im Dienst) oder { jetzt: false, ab } (nächste Aufgabe beginnt um ab, Infinity = keine)
// termine: Termine dieser und nächster Woche (einmal pro Durchgang berechnet)
function dienst(z, raeume, p, termine) {
  const r = eingesetztIn(z, raeume, p);
  if (!r) return { jetzt: false, ab: Infinity };
  const t = z.minuten;
  if (r.typ.id === 'kirchkaffee') {
    const K = z.kaffee, m = K && K.ma[p.id];
    if (offenBei(z, r) || (m && m.aufgabe) || (K && K.kunden.some(k => k.ea === p.id))) return { jetzt: true };
    const s = kirchkaffeeZustand(z, raeume).flatMap(k => k.stationen).find(x => x.ea.id === p.id);
    if (s && (s.maschine.fuellung || 0) < fassung('kaffeemaschine')) return { jetzt: true };   // muss gleich einkaufen
    const n = s ? naechsteKaffeeOeffnung(z, raeume, r) : null;
    return { jetzt: false, ab: n === null ? Infinity : n };
  }
  // Veranstaltungsraum: jede Veranstaltung in seinem Raum (vom Beginn bis zum Ende).
  // Musiker (26.11.): schon ab dem Aufbruch zum Instrument im Dienst, damit sie rechtzeitig zurück sind (musiker.js).
  const key = Math.min(...r.zellen);
  let ab = Infinity, liste = null;
  const vorlauf = art => musikerVorlauf(z, raeume, p, r, art, liste || (liste = gottesdienstRaeume(z, raeume)));
  const pruefe = (beginn, art) => {
    const ende = beginn + dauerVon(art);
    if (t >= ende) return false;
    const los = beginn - vorlauf(art);
    if (t >= los - EPS) return true;
    ab = Math.min(ab, los); return false;
  };
  for (const L of z.laeufe || []) if (L.raum === key && !L.ausgefallen && (L.phase === 'anreise' || L.phase === 'gottesdienst') && pruefe(L.beginn, L.art)) return { jetzt: true };
  for (const x of termine) if (x.raum === key && x.art && pruefe(x.beginn, x.art)) return { jetzt: true };
  return { jetzt: false, ab };
}
function termineJetzt(z, raeume) {
  const w = zeitpunkt(z.minuten).woche, erledigt = new Set(z.termineErledigt || []);
  return [w, w + 1].flatMap(x => termineDerWoche(z, raeume, x)).filter(x => !erledigt.has(x.id));
}
// Tageszeit, in der evangelisiert wird: [von, bis) heute
function fenster(t) {
  const tag = Math.floor(t / TAG_MIN) * TAG_MIN;
  return { von: tag + E.von * 60, bis: tag + E.bis * 60, morgen: tag + TAG_MIN + E.von * 60 };
}
// Ist ein Jugendgottesdienst geplant (diese oder nächste Woche, noch nicht vorbei)?
export function jugendgottesdienstGeplant(z, raeume, termine = termineJetzt(z, raeume)) {
  return termine.some(x => E.einladung.jugend.includes(x.art) && x.beginn > z.minuten);
}

// Zeit vor Ort seit der letzten Gutschrift als Evangelisation-Erfahrung gutschreiben (bis höchstens „bis“)
function gutschreiben(m, p, bisT) {
  const von = Math.max(m.gezaehlt ?? 0, ankunft(m.bew)), ende = Math.min(bisT, m.bis);
  if (ende > von) { evangelisationErfahrungDazu(p, ende - von); m.gezaehlt = ende; }
}

// Vom Spieler versetzt (27.11.): Gang zur Evangelisation sofort beenden, damit die Figur gleich am neuen Platz steht.
// Die Zeit vor Ort wird vorher noch gutgeschrieben – wie sonst bei der nächsten Kontrolle auch.
export function evangelisationVersetzt(z, p) {
  const A = z.evangelisation, m = A && A.ma[p.id];
  if (!m) return;
  if (m.phase !== 'zurueck') gutschreiben(m, p, z.minuten);
  delete A.ma[p.id];
}

// ---- Schichtbetrieb (Lukas, 27.11.: claude/spielprinzip-ehrenamt-schichten-lager.md) ----
// Zur Evangelisation geht nur, wer im Dienstplan für diesen Zeitblock eingeteilt ist. Es gelten die 2 Standplätze,
// aber keine Uhrzeit mehr (der Zeitblock bestimmt sie). Hingehen und Zurückgehen steuert der Dienstplan (dienst.js):
// Für die Regeln steht der Ehrenamtliche während der Schicht am Standplatz (p.x, p.y).
// Evangelisation-Erfahrung: für die Zeit vor Ort, gutgeschrieben bei jeder Kontrolle und wenn er geht.
const imEvangelisationDienst = (z, raeume, p) => { const s = raeume ? aktiveSchicht(z, raeume, p) : null; return !!s && s.t.art === 'evangelisation'; };
function standplatzDienst(p) { return E.standplaetze.some(o => o.x === p.x && o.y === p.y); }
function dienstGutschreiben(z, p, bisT) {
  const A = z.evangelisation;
  if (!A.gezaehlt) A.gezaehlt = {};
  const von = Math.max(A.gezaehlt[p.id] ?? -Infinity, dienstAnkunft(z, p));
  if (Number.isFinite(von) && bisT > von) evangelisationErfahrungDazu(p, bisT - von);
  A.gezaehlt[p.id] = Math.max(bisT, A.gezaehlt[p.id] ?? -Infinity);
}
// Geht ein Ehrenamtlicher (Schicht vorbei oder woanders hin): Zeit vor Ort gutschreiben (dienst.js)
export function evangelisationVerlassen(z, p) {
  if (!z.schichtbetrieb || !z.evangelisation || p.daheim || !standplatzDienst(p)) return;
  dienstGutschreiben(z, p, z.minuten);
  delete z.evangelisation.gezaehlt[p.id];
}
function vorOrtDienst(z) {
  return imDienstplan(z).filter(p => !p.daheim && standplatzDienst(p) && dienstAngekommen(z, p));
}

// ---- Alles bis jetzt Fällige ausführen ----
export function evangelisationAktualisieren(z, raeume) {
  evangelisationAnlegen(z);
  if (z.schichtbetrieb) {
    z.evangelisation.ma = {};
    for (const p of vorOrtDienst(z)) dienstGutschreiben(z, p, z.minuten);
    return;
  }
  const A = z.evangelisation, t = z.minuten, f = fenster(t), termine = termineJetzt(z, raeume);
  const eas = ehrenamtliche(z), infos = new Map(eas.map(p => [p.id, dienst(z, raeume, p, termine)]));
  // Wer gerade frei hat, seit wann (für den Gleichstand beim Auswählen)
  for (const p of eas) { if (infos.get(p.id).jetzt) delete A.freiSeit[p.id]; else if (A.freiSeit[p.id] === undefined) A.freiSeit[p.id] = t; }
  for (const id of Object.keys(A.freiSeit)) if (!infos.has(id)) delete A.freiSeit[id];
  // Laufende Gänge
  for (const id of Object.keys(A.ma)) {
    const m = A.ma[id], p = eas.find(x => x.id === id), info = infos.get(id);
    if (p && m.phase !== 'zurueck') gutschreiben(m, p, t);   // Erfahrung für die Zeit vor Ort
    if (!p || p.x !== m.heim.x || p.y !== m.heim.y || info.jetzt) { delete A.ma[id]; continue; }   // versetzt oder plötzlich im Dienst: gleich wieder an seinem Platz
    if (m.phase === 'zurueck') { if (t >= ankunft(m.bew) - EPS) delete A.ma[id]; continue; }
    // Rechtzeitig zurück: spätestens so aufbrechen, dass er zum Beginn seiner Aufgabe wieder da ist; um 20 Uhr ist Schluss
    m.bis = Math.min(m.bis, info.ab - m.rueck, f.bis);
    if (m.phase === 'hin' && t >= ankunft(m.bew) - EPS) m.phase = 'da';
    if (t >= m.bis - EPS) { const hier = posBei(m.bew, t); m.phase = 'zurueck'; m.bew = gehen(z, hier, m.heim, t); m.rueck = dauer(m.bew); }
  }
  // Neue schicken, solange Plätze frei sind
  if (t < f.von - EPS || t >= f.bis - EPS) return;
  const belegt = Object.values(A.ma).filter(m => m.phase !== 'zurueck');
  if (belegt.length >= E.plaetze) return;
  const kandidaten = eas.filter(p => !A.ma[p.id] && !infos.get(p.id).jetzt)
    .sort((a, b) => evangelisationLevel(b) - evangelisationLevel(a) || (A.freiSeit[a.id] ?? t) - (A.freiSeit[b.id] ?? t));
  for (const p of kandidaten) {
    if (belegt.length >= E.plaetze) break;
    const frei = E.standplaetze.find(s => !belegt.some(m => m.platz.x === s.x && m.platz.y === s.y));
    if (!frei) break;
    const heim = { x: p.x, y: p.y }, hin = gehen(z, heim, frei, t), rueck = dauer(hin), ab = infos.get(p.id).ab;
    const bis = Math.min(ab - rueck, f.bis);
    if (bis - ankunft(hin) < E.mindestens) continue;   // lohnt sich nicht: wäre kaum dort
    const m = { heim, platz: { ...frei }, bew: hin, phase: 'hin', rueck, bis };
    A.ma[p.id] = m; belegt.push(m);
  }
}

// Nächster Zeitpunkt, zu dem bei der Evangelisation etwas passiert (für das Tick-System)
export function evangelisationSchritt(z) {
  if (!z.evangelisation || !imDienstplan(z).length) return null;
  if (z.schichtbetrieb) {   // nur zum Gutschreiben der Erfahrung, solange jemand vor Ort ist
    if (!imDienstplan(z).some(p => !p.daheim && standplatzDienst(p))) return null;
    return { zeit: (Math.floor(z.minuten / E.pruefen + EPS) + 1) * E.pruefen, tun: (zz, rr) => evangelisationAktualisieren(zz, rr) };
  }
  const A = z.evangelisation, t = z.minuten, f = fenster(t), zeiten = [];
  for (const m of Object.values(A.ma)) {
    if (m.phase === 'da') zeiten.push(m.bis); else zeiten.push(ankunft(m.bew));
    if (m.phase === 'hin') zeiten.push(m.bis);
  }
  // Regelmäßig schauen, ob jemand frei hat (nur tagsüber); nachts erst wieder morgens
  if (t < f.von) zeiten.push(f.von);
  else if (t < f.bis) zeiten.push(Math.min(f.bis, (Math.floor(t / E.pruefen + EPS) + 1) * E.pruefen));   // feste Uhrzeiten (:00, :30)
  else zeiten.push(f.morgen);
  const naechste = Math.min(...zeiten.filter(x => x > t + EPS));
  return Number.isFinite(naechste) ? { zeit: naechste, tun: (zz, rr) => evangelisationAktualisieren(zz, rr) } : null;
}

// ---- Wirkung: ein Passant läuft am Feld vorbei ----
// Wer steht gerade dort (angekommen, noch nicht auf dem Rückweg)?
export function vorOrt(z) {
  if (z.schichtbetrieb) return vorOrtDienst(z);
  if (!z.evangelisation) return [];
  const t = z.minuten;
  return Object.entries(z.evangelisation.ma).filter(([, m]) => m.phase !== 'zurueck' && t >= ankunft(m.bew) - EPS && t < m.bis - EPS)
    .map(([id]) => z.personen.find(p => p.id === id)).filter(Boolean);
}
// Chancen der Ehrenamtlichen vor Ort für diesen Menschen: { gottesdienst, jugend } (0–1, noch ohne Obergrenze)
function chancenFuer(z, raeume, wer, leute, jugoGeplant) {
  let gd = 0, jg = 0;
  for (const p of leute) {
    const c = beitrag(p);
    if (istJugendEA(p)) { if (jugoGeplant && istJugend(wer)) jg += c; }
    else gd += c;
  }
  return { gottesdienst: gd, jugend: jg };
}
// Spricht jemand vor Ort diesen Passanten an? → 'gottesdienst' | 'jugend' (eingeladen wohin) | null
export function ansprechen(z, raeume, wer, zufall = Math.random) {
  if (!wer || wer.neugierig || !z.ort || !z.ort.leute.includes(wer)) return null;   // nur Passanten, die noch nicht neugierig sind
  const leute = vorOrt(z);
  if (!leute.length) return null;
  const c = chancenFuer(z, raeume, wer, leute, leute.some(istJugendEA) && jugendgottesdienstGeplant(z, raeume));
  const summe = c.gottesdienst + c.jugend, gesamt = Math.min(E.maxChance, summe), r = zufall();
  zaehlen(z, 'vorbei');                                    // Zähler fürs Menü: vorbeigelaufen, während jemand vor Ort war
  if (!summe || r >= gesamt) return null;
  const ziel = r < gesamt * c.jugend / summe ? 'jugend' : 'gottesdienst';
  wer.neugierig = true; wer.eingeladen = ziel;
  zaehlen(z, 'angesprochen');
  return ziel;
}
export { einladungPasst, eingeladenChance } from './besucher.js';

// ---- Abfragen für die Anzeige ----
// Wo ist ein Ehrenamtlicher gerade? (null = nicht unterwegs zur Evangelisation)
export function evangelisationPosition(z, p) {
  const m = z.evangelisation && z.evangelisation.ma[p.id];
  if (!m || (m.phase === 'zurueck' && z.minuten >= ankunft(m.bew) - EPS)) return null;   // wieder an seinem Platz
  const q = posBei(m.bew, z.minuten);
  return { x: q.x, y: q.y };
}
// Wie viele Ehrenamtliche haben gerade frei (keinem Dienst zugewiesen oder gerade ohne Schicht/Dienst)?
export function freieEhrenamtliche(z, raeume) {
  if (z.schichtbetrieb) return ehrenamtliche(z).filter(p => p.daheim).length;   // ohne Schicht = daheim
  const termine = termineJetzt(z, raeume);
  return ehrenamtliche(z).filter(p => !dienst(z, raeume, p, termine).jetzt).length;
}
// Menü des Felds (26.11. abends ausführlicher): wer vor Ort ist – je Person Evangelisation-Level mit Fortschritt,
// Beitrag zur Chance und wohin sie einlädt –, die Chance pro Passant, wie viele gerade frei haben und die Zähler heute/diese Woche.
export function evangelisationInfo(z, raeume) {
  const leute = vorOrt(z), jugo = jugendgottesdienstGeplant(z, raeume), t = z.minuten, f = fenster(t);
  const gd = leute.filter(p => !istJugendEA(p)).reduce((s, p) => s + beitrag(p), 0);
  const jg = jugo ? leute.filter(istJugendEA).reduce((s, p) => s + beitrag(p), 0) : 0;
  const prozent = x => Math.round(Math.min(E.maxChance, x) * 100);
  return {
    max: E.plaetze, jugendgottesdienst: jugo, maxChance: Math.round(E.maxChance * 100),
    // Schichtbetrieb (27.11.): keine feste Uhrzeit mehr – es zählt der Dienstplan (zeiten: null)
    zeiten: z.schichtbetrieb ? null : { von: E.von, bis: E.bis, jetzt: t >= f.von && t < f.bis },
    unterwegs: z.schichtbetrieb ? imDienstplan(z).filter(p => !p.daheim && imEvangelisationDienst(z, raeume, p) && !dienstAngekommen(z, p)).length
      : Object.values(z.evangelisation ? z.evangelisation.ma : {}).filter(m => m.phase === 'hin' && t < ankunft(m.bew) - EPS).length,
    frei: freieEhrenamtliche(z, raeume),
    leute: leute.map(p => {
      const jugend = istJugendEA(p), laedtEin = !jugend || jugo;
      return { id: p.id, name: daten(p).name, jugend, laedtEin, wohin: jugend ? 'jugend' : 'gottesdienst',
        evangelisation: evangelisationStand(p), beitrag: laedtEin ? Math.round(beitrag(p) * 100) : 0 };
    }),
    // Chance pro Passant in Prozent: für alle Passanten (erwachsene EA) und für jugendliche Passanten (dazu die jugendlichen EA)
    chance: prozent(gd), chanceJugend: prozent(gd + jg), gedeckelt: gd + jg > E.maxChance + EPS,
    statistik: statistik(z)
  };
}
