// Dienstplan der Ehrenamtlichen (Spielprinzip von Lukas, 27.11.2026: claude/spielprinzip-ehrenamt-schichten-lager.md).
// Kennt keine Grafik und keine Texte. Zahlen: DIENST in inhalte/dienst.js.
//
// So läuft es:
//   • Jede Woche gibt es dieselben Termine mit Stellen für Ehrenamtliche:
//       - Veranstaltungen (Musiker je Instrument im Gottesdienstraum, Leitung bzw. Mitarbeit im Gemeindesaal,
//         Begrüßung in jedem Foyer),
//       - Kirchkaffee nach jedem Gottesdienst (je Kirchkaffee so viele Stellen wie Stationen aus Maschine + Theke),
//       - eigene Öffnungszeiten des Kirchkaffees (gleich viele Stellen),
//       - Logistik im Lager je Zeitblock (so viele Stellen wie Regale),
//       - Evangelisation je Zeitblock (so viele Stellen wie Standplätze).
//   • Jeder Termin, bei dem ein Ehrenamtlicher eine Stelle hat, ist eine Schicht. Pro Woche höchstens DIENST.schichten
//     (die Frau des Pastors 5). Zwei Schichten derselben Person dürfen sich zeitlich nicht überschneiden.
//   • Ob eine Veranstaltung stattfinden kann, richtet sich nach dem Dienstplan (nicht danach, wer gerade wo steht).
//   • Während seiner Schicht steht der Ehrenamtliche an seiner Stelle (p.x, p.y) – dann gelten alle bisherigen Regeln
//     (Kirchkaffee-Station, Lager, Musiker am Instrument …). Ohne Schicht ist er daheim (p.daheim, nicht auf der Karte).
//     Hin und zurück läuft er sichtbar vom bzw. zum Tor (nur fürs Auge; für die Regeln ist er sofort da bzw. weg).
//   • Wer noch Kunden in der Schlange hat oder gerade etwas einkauft, macht das erst fertig.
//   • Sonntagvormittags kommt jeder Ehrenamtliche, der dann keine Schicht hat, mit DIENST.besuch.chance als Besucher
//     in den Gottesdienst (egal welche Art, nur im Gottesdienstraum).
//
// Der Plan wird gespeichert in z.dienst.plan: { [Termin-Schlüssel]: { [Stelle]: Person-id } } – jede Woche gleich.
// Termin-Schlüssel: v:<Raum>:<Platz> (Veranstaltung), kn:<Kirchkaffee>:<Raum>:<Platz> (Kirchkaffee danach),
// ko:<Kirchkaffee>:<Tag>:<Slot> (Öffnungszeit), lg:<Tag>:<Slot> (Logistik), ev:<Tag>:<Slot> (Evangelisation).
// <Raum> ist wie überall das kleinste Kästchen des Raums – so übersteht der Plan Umbauten.
import { DIENST } from '../inhalte/dienst.js';
import { SLOTS, DAUER, LAUFTEMPO } from '../inhalte/zeit.js';
import { VERANSTALTUNGEN } from '../inhalte/veranstaltungen.js';
import { EVANGELISATION } from '../inhalte/evangelisation.js';
import { MOEBEL } from '../inhalte/moebel.js';
import { GRUNDSTUECK, GEHWEGE } from '../inhalte/umgebung.js';
import { LEER, idx } from './karte.js';
import { moebelImRaum, hindernisBei } from './moebel.js';
import { daten } from './personen.js';
import { WOCHE_MIN, slotBeginn, zeitpunkt } from './zeit.js';
import { programmVon, moeglicheVeranstaltungen, dauerVon, mitKirchkaffee } from './ablauf.js';
import { schichtenVon, schichtZeit, kaffeeBeschaeftigt } from './kirchkaffee.js';
import { weg, glaetten } from './wege.js';
import { punktAufWeg } from './bewegung.js';
import { musikLevel } from './skills.js';
import { evangelisationVerlassen } from './evangelisation.js';

const EPS = 1e-6;
export const WEG = -99;   // Koordinate für „daheim“: liegt in keinem Raum und auf keinem Kästchen der Karte

export function dienstAnlegen(z) {
  if (!z.dienst) z.dienst = { plan: {}, ma: {} };
  if (!z.dienst.plan) z.dienst.plan = {};
  if (!z.dienst.ma) z.dienst.ma = {};
  // Schichtbetrieb (27.11.): neue und alte Spielstände. Alte Spielstände stellt Lukas selbst um (keine automatische Einteilung).
  if (z.schichtbetrieb === undefined) z.schichtbetrieb = true;
}
export const schichtbetrieb = z => !!z.schichtbetrieb;

const ehrenamtliche = z => z.personen.filter(p => { const d = daten(p); return d && d.art === 'ehrenamt'; });
// Schichten pro Woche: aus den Daten der Person (Frau des Pastors 5), sonst DIENST.schichten.
// Alte Spielstände: die Frau des Pastors wurde dort ohne `schichten` angelegt – sie erkennt man an `start`.
export function schichtenMax(p) {
  const d = daten(p) || {};
  if (typeof d.schichten === 'number') return d.schichten;
  return d.start && d.name === 'Frau des Pastors' ? 5 : DIENST.schichten;
}
const raumKey = r => Math.min(...r.zellen);
const fertig = (r, typ) => r.typ && r.typ.id === typ && !r.probleme.length;

// ---- Stellen ----
// Instrumente eines Raums in fester Reihenfolge (wie instrumenteImRaum: je Art höchstens max)
function instrumente(z, r) {
  return MOEBEL.filter(m => m.wirkung && m.wirkung.musik).flatMap(m => moebelImRaum(z, r, m.id).slice(0, m.max || Infinity));
}
// Stellen einer Veranstaltung v im Raum r. foyerListe: fertige Foyers (je eine Stelle Begrüßung).
function veranstaltungStellen(z, r, v, foyerListe) {
  const s = [];
  if (r.typ.einsatzBraucht && r.typ.einsatzBraucht.ehrenamt === 'instrument')
    instrumente(z, r).forEach((m, i) => s.push({ id: `musik${i}`, code: 'musik', ding: m.art, ort: { x: m.x, y: m.y }, raum: r.nr }));
  const leitet = v.leitungOder || [].concat(v.leitung || []).includes('ehrenamt');
  if (leitet) {
    const klavier = (v.braucht || []).includes('klavier') ? moebelImRaum(z, r, 'klavier')[0] : null;
    s.push({ id: 'leitung', code: klavier ? 'chorleitung' : 'leitung', ding: klavier ? 'klavier' : null, ort: klavier ? { x: klavier.x, y: klavier.y } : null, raum: r.nr });
  }
  if (v.haltungJeEhrenamt) for (let i = 0; i < (v.ehrenamtMax || 1); i++) s.push({ id: `mit${i}`, code: 'mitarbeit', ding: null, ort: null, raum: r.nr });
  for (const f of foyerListe) s.push({ id: `foyer${raumKey(f)}`, code: 'begruessung', ding: null, ort: null, raum: f.nr });
  return s;
}
// Stationen eines Kirchkaffees: so viele Maschinen, wie es Thekenteile gibt (je Station eine Maschine und ein Thekenteil)
function kaffeeStellen(z, r) {
  const maschinen = moebelImRaum(z, r, 'kaffeemaschine'), theken = moebelImRaum(z, r, 'theke');
  return maschinen.slice(0, theken.length).map((m, i) => ({ id: `theke${i}`, code: 'theke', ding: 'theke', ort: { x: m.x, y: m.y }, raum: r.nr }));
}
// Ende eines Zeitblocks (Minuten in der Woche)
const blockZeit = (tag, slot) => schichtZeit({ tag, slot }, 0);

// Alle Termine einer Woche mit ihren Stellen. von/bis: Minuten ab Montag 0:00 (in jeder Woche gleich).
// Innerhalb eines Durchgangs von zeitVorruecken wird die Liste gemerkt (dienstMerken), sonst jedes Mal neu berechnet.
let merker = null;
export function dienstMerken(z, raeume) { merker = { z, raeume, liste: null }; }
export function dienstVergessen() { merker = null; }
export function dienstTermine(z, raeume) {
  if (merker && merker.z === z && merker.raeume === raeume && merker.liste) return merker.liste;
  const liste = [], foyerListe = raeume.liste.filter(r => fertig(r, 'foyer'));
  const kaffees = raeume.liste.filter(r => fertig(r, 'kirchkaffee'));
  const lager = raeume.liste.filter(r => fertig(r, 'lager'));
  for (const r of raeume.liste.filter(r => r.typ && moeglicheVeranstaltungen(r.typ).length)) {
    const key = raumKey(r);
    programmVon(z, r).forEach((e, i) => {
      const v = e.art && VERANSTALTUNGEN.find(x => x.id === e.art);
      if (!v) return;
      const beginn = slotBeginn(e, 0);
      liste.push({ key: `v:${key}:${i}`, art: 'veranstaltung', tag: e.tag, slot: e.slot, raum: r.nr, raumKey: key, platz: i, veranstaltung: v.id,
        von: beginn - DIENST.vorlauf, bis: beginn + dauerVon(v.id), stellen: veranstaltungStellen(z, r, v, foyerListe) });
      // Kirchkaffee danach: öffnet am Ende der Veranstaltung, schließt 2 Stunden nach dem Ende des Gottesdienstes
      if (mitKirchkaffee(v.id) && r.typ.id === 'gottesdienst') for (const k of kaffees) {
        const stellen = kaffeeStellen(z, k);
        if (!stellen.length) continue;
        liste.push({ key: `kn:${raumKey(k)}:${key}:${i}`, art: 'kaffeeNach', tag: e.tag, slot: e.slot, raum: k.nr, raumKey: raumKey(k), nachRaum: r.nr, platz: i,
          veranstaltung: v.id, von: beginn + dauerVon(v.id), bis: beginn + DAUER.gottesdienst + DAUER.kirchkaffee, stellen });
      }
    });
  }
  for (const k of kaffees) {
    const stellen = kaffeeStellen(z, k);
    if (!stellen.length) continue;
    for (const s of schichtenVon(z, k)) {
      const f = blockZeit(s.tag, s.slot);
      liste.push({ key: `ko:${raumKey(k)}:${s.tag}:${s.slot}`, art: 'kaffee', tag: s.tag, slot: s.slot, raum: k.nr, raumKey: raumKey(k), von: f.von, bis: f.bis, stellen });
    }
  }
  const regale = lager.flatMap(r => moebelImRaum(z, r, 'regal').map(m => ({ m, r })));
  for (let tag = 0; tag < 7; tag++) for (const sl of SLOTS) {
    const f = blockZeit(tag, sl.id);
    if (regale.length) liste.push({ key: `lg:${tag}:${sl.id}`, art: 'logistik', tag, slot: sl.id, raum: null, von: f.von, bis: f.bis,
      stellen: regale.map(({ m, r }, i) => ({ id: `regal${i}`, code: 'regal', ding: 'regal', ort: { x: m.x, y: m.y }, raum: r.nr })) });
    liste.push({ key: `ev:${tag}:${sl.id}`, art: 'evangelisation', tag, slot: sl.id, raum: null, von: f.von, bis: f.bis,
      stellen: EVANGELISATION.standplaetze.map((o, i) => ({ id: `platz${i}`, code: 'evangelisation', ding: null, ort: { ...o }, raum: null })) });
  }
  liste.sort((a, b) => a.von - b.von);
  if (merker && merker.z === z && merker.raeume === raeume) merker.liste = liste;
  return liste;
}

// Wer steht auf dieser Stelle? (nur Ehrenamtliche, die es noch gibt)
function personAuf(z, termin, stelleId) {
  const id = ((z.dienst && z.dienst.plan[termin.key]) || {})[stelleId];
  const p = id && z.personen.find(x => x.id === id);
  const d = p && daten(p);
  return d && d.art === 'ehrenamt' ? p : null;
}
// Termine einer Person (mit ihrer Stelle)
function termineVon(z, raeume, p) {
  return dienstTermine(z, raeume).flatMap(t => t.stellen.filter(s => personAuf(z, t, s.id) === p).map(s => ({ t, s })));
}
export function schichtenBelegt(z, raeume, p) { return new Set(termineVon(z, raeume, p).map(x => x.t.key)).size; }
const ueberschneiden = (a, b) => a.von < b.bis - EPS && b.von < a.bis - EPS;

// ---- Befehl: Stelle besetzen oder frei machen ----
// → 'ok' | 'keine' (Termin/Stelle gibt es nicht) | 'person' (kein Ehrenamtlicher) | 'doppelt' (hat bei diesem Termin
//   schon eine Stelle) | 'voll' (alle Schichten der Woche vergeben) | 'zeit' (überschneidet sich mit einer anderen Schicht)
export function stelleSetzen(z, raeume, key, stelleId, personId) {
  dienstAnlegen(z);
  const t = dienstTermine(z, raeume).find(x => x.key === key), s = t && t.stellen.find(x => x.id === stelleId);
  if (!s) return 'keine';
  const plan = z.dienst.plan;
  if (!personId) {
    if (plan[key]) { delete plan[key][stelleId]; if (!Object.keys(plan[key]).length) delete plan[key]; }
    return 'ok';
  }
  const p = z.personen.find(x => x.id === personId), d = p && daten(p);
  if (!d || d.art !== 'ehrenamt') return 'person';
  if (personAuf(z, t, stelleId) === p) return 'ok';
  const eigene = termineVon(z, raeume, p);
  if (eigene.some(x => x.t.key === key)) return 'doppelt';
  if (new Set(eigene.map(x => x.t.key)).size >= schichtenMax(p)) return 'voll';
  if (eigene.some(x => ueberschneiden(x.t, t))) return 'zeit';
  (plan[key] = plan[key] || {})[stelleId] = p.id;
  return 'ok';
}

// ---- Für die Spielregeln ----
// Eingeteilte Ehrenamtliche einer Veranstaltung (Raum r, Platz i): { alle (ohne Begrüßung im Foyer), musik }
export function veranstaltungDienst(z, raeume, r, platz) {
  const t = dienstTermine(z, raeume).find(x => x.key === `v:${raumKey(r)}:${platz}`);
  if (!t) return { alle: [], musik: [] };
  const besetzt = t.stellen.map(s => ({ s, p: personAuf(z, t, s.id) })).filter(x => x.p);
  return { alle: besetzt.filter(x => x.s.code !== 'begruessung').map(x => x.p), musik: besetzt.filter(x => x.s.code === 'musik').map(x => x.p) };
}
// Foyers mit eingeteiltem Begrüßungsdienst für einen Termin (Raum-Nummern)
export function begruessungDienst(z, raeume, raumSchluessel, platz) {
  const t = dienstTermine(z, raeume).find(x => x.key === `v:${raumSchluessel}:${platz}`);
  return new Set(t ? t.stellen.filter(s => s.code === 'begruessung' && personAuf(z, t, s.id)).map(s => s.raum) : []);
}
// Wie viele Stellen im Kirchkaffee nach dieser Veranstaltung besetzt sind (für die Prognose)
export function kaffeeNachBesetzt(z, raeume, raumSchluessel, platz) {
  return dienstTermine(z, raeume).filter(t => t.art === 'kaffeeNach' && t.key.endsWith(`:${raumSchluessel}:${platz}`))
    .reduce((n, t) => n + t.stellen.filter(s => personAuf(z, t, s.id)).length, 0);
}
// Nächste Öffnung eines Kirchkaffees laut Dienstplan (mit mindestens einer besetzten Stelle) – Minuten oder null
export function naechsteKaffeeSchicht(z, raeume, raum, t = z.minuten) {
  const w = zeitpunkt(t).woche, werte = [];
  for (const x of dienstTermine(z, raeume)) {
    if (x.raum !== raum.nr || (x.art !== 'kaffee' && x.art !== 'kaffeeNach') || !x.stellen.some(s => personAuf(z, x, s.id))) continue;
    for (const woche of [w, w + 1]) { const von = woche * WOCHE_MIN + x.von; if (von > t) werte.push(von); }
  }
  return werte.length ? Math.min(...werte) : null;
}
// Hat dieses Kirchkaffee überhaupt jemanden im Dienstplan?
export function kaffeeGeplant(z, raeume, raum) {
  return dienstTermine(z, raeume).some(x => x.raum === raum.nr && (x.art === 'kaffee' || x.art === 'kaffeeNach') && x.stellen.some(s => personAuf(z, x, s.id)));
}

// Welche Schicht hat p gerade? → { t, s } oder null. Zeit t in Minuten seit Spielbeginn.
export function aktiveSchicht(z, raeume, p, t = z.minuten) {
  const w = zeitpunkt(t).woche;
  for (const x of termineVon(z, raeume, p)) for (const woche of [w - 1, w]) {
    const von = woche * WOCHE_MIN + x.t.von, bis = woche * WOCHE_MIN + x.t.bis;
    if (t >= von - EPS && t < bis - EPS) return x;
  }
  return null;
}
// Hat p eine Schicht, die sich mit [von, bis) überschneidet? (absolute Minuten)
function schichtImZeitraum(z, raeume, p, von, bis) {
  const w = zeitpunkt(von).woche;
  return termineVon(z, raeume, p).some(x => [w - 1, w, w + 1].some(woche => ueberschneiden({ von: woche * WOCHE_MIN + x.t.von, bis: woche * WOCHE_MIN + x.t.bis }, { von, bis })));
}

// Gottesdienstbesuch ohne Schicht (Lukas, 27.11.): Ehrenamtliche, die sonntagvormittags in einen Gottesdienst kommen.
// L: Ablauf des Termins, g: Raum-Eintrag aus gottesdienstRaeume → [{ id, vorname, voll, ea: true }]
export function besuchendeEhrenamtliche(z, raeume, L, g, zufall = Math.random) {
  if (!schichtbetrieb(z) || !g || g.typ.id !== 'gottesdienst' || L.plan.tag !== DIENST.besuch.tag || L.plan.slot !== DIENST.besuch.slot) return [];
  const bis = L.beginn + dauerVon(L.art), kommen = [];
  for (const p of ehrenamtliche(z)) {
    if (schichtImZeitraum(z, raeume, p, L.beginn, bis)) continue;
    if (zufall() >= DIENST.besuch.chance) continue;
    const name = daten(p).name || '';
    kommen.push({ id: p.id, vorname: name.split(' ')[0], voll: name, ea: true });
  }
  return kommen;
}

// ---- Wo steht ein Ehrenamtlicher in seiner Schicht? ----
const TOR = () => {
  const g = GRUNDSTUECK, gw = GEHWEGE.find(w => w.w > w.h && w.y >= g.y + g.h);
  return { x: g.tor.x + Math.floor(g.tor.breite / 2), y: gw ? gw.y : g.y + g.h + 1 };
};
function laenge(pfad) { let l = 0; for (let i = 0; i < pfad.length - 1; i++) l += Math.hypot(pfad[i + 1].x - pfad[i].x, pfad[i + 1].y - pfad[i].y); return l; }
function gehen(z, von, nach, t) {
  const a = { x: Math.round(von.x), y: Math.round(von.y) }, blockiert = (x, y) => hindernisBei(z, x, y);
  let pfad = glaetten(z, weg(z, a, nach, blockiert), blockiert) || [a, { x: nach.x, y: nach.y }];
  if (pfad[0].x !== von.x || pfad[0].y !== von.y) pfad = [{ x: von.x, y: von.y }, ...pfad];
  return { pfad, laenge: laenge(pfad), t0: t };
}
const ankunft = b => b.t0 + b.laenge / LAUFTEMPO;
// Freies Kästchen im Raum, möglichst nah an ort (sonst nah an der Mitte)
function platzImRaum(z, raum, ort, p) {
  const ziel = ort || { x: (raum.box.minX + raum.box.maxX) / 2, y: (raum.box.minY + raum.box.maxY) / 2 };
  let beste = null;
  for (const c of raum.zellen) {
    const x = c % z.w, y = (c / z.w) | 0;
    if (z.zellen[c] !== LEER || hindernisBei(z, x, y) || z.personen.some(q => q !== p && !q.daheim && q.x === x && q.y === y)) continue;
    const d = Math.hypot(x - ziel.x, y - ziel.y);
    if (!beste || d < beste.d) beste = { x, y, d };
  }
  return beste ? { x: beste.x, y: beste.y } : null;
}
// Ist p schon dort, wo seine Stelle ist?
function amPlatz(z, raeume, p, s) {
  if (p.daheim) return false;
  if (s.raum === null) return !!s.ort && p.x === s.ort.x && p.y === s.ort.y;   // Evangelisation: am Standplatz
  return raeume.gruppe[idx(z, p.x, p.y)] === s.raum;
}
function zielVon(z, raeume, p, s) {
  if (s.raum === null) return s.ort ? { ...s.ort } : null;
  const r = raeume.liste[s.raum];
  return r ? platzImRaum(z, r, s.ort, p) : null;
}

// ---- Alles bis jetzt Fällige: Ehrenamtliche kommen zu ihrer Schicht oder gehen heim ----
export function dienstAktualisieren(z, raeume) {
  if (!schichtbetrieb(z)) return false;
  dienstAnlegen(z);
  const t = z.minuten, M = z.dienst.ma;
  let geaendert = false;
  for (const p of ehrenamtliche(z)) {
    const jetzt = aktiveSchicht(z, raeume, p, t), m = M[p.id] || (M[p.id] = { bew: null });
    if (jetzt) {
      if (amPlatz(z, raeume, p, jetzt.s)) continue;
      if (!p.daheim && kaffeeBeschaeftigt(z, p.id)) continue;   // erst die Schlange fertig bedienen
      const ziel = zielVon(z, raeume, p, jetzt.s);
      if (!ziel) continue;
      let start;
      if (p.daheim) start = m.bew && t < ankunft(m.bew) - EPS ? punktAufWeg(m.bew, Math.max(0, t - m.bew.t0) * LAUFTEMPO) : TOR();   // war gerade auf dem Heimweg: kehrt um
      else { start = { x: p.x, y: p.y }; evangelisationVerlassen(z, p); }
      m.bew = gehen(z, start, ziel, t);
      p.x = ziel.x; p.y = ziel.y; p.daheim = false;
      geaendert = true;
    } else if (!p.daheim) {
      if (kaffeeBeschaeftigt(z, p.id)) continue;   // Schlange fertig bedienen bzw. Einkauf zu Ende bringen
      evangelisationVerlassen(z, p);
      m.bew = gehen(z, { x: p.x, y: p.y }, TOR(), t);
      p.x = WEG; p.y = WEG; p.daheim = true;
      geaendert = true;
    }
  }
  for (const id of Object.keys(M)) if (!z.personen.some(p => p.id === id)) delete M[id];
  return geaendert;
}
// Nächster Zeitpunkt, zu dem jemand kommt oder geht (für das Tick-System)
export function dienstSchritt(z, raeume) {
  if (!schichtbetrieb(z) || !z.dienst) return null;
  const t = z.minuten, w = zeitpunkt(t).woche, zeiten = [];
  const benutzt = new Set(Object.values(z.dienst.plan).flatMap(o => Object.values(o)));
  if (!benutzt.size && ehrenamtliche(z).every(p => p.daheim)) return null;
  for (const x of dienstTermine(z, raeume)) {
    if (!x.stellen.some(s => personAuf(z, x, s.id))) continue;
    for (const woche of [w, w + 1]) for (const g of [x.von, x.bis]) { const a = woche * WOCHE_MIN + g; if (a > t + EPS) zeiten.push(a); }
  }
  // Wer ohne Schicht noch da ist (z. B. Schlange bedient), wird beim nächsten Schritt des Kirchkaffees heimgeschickt
  if (ehrenamtliche(z).some(p => !p.daheim && !aktiveSchicht(z, raeume, p, t) && !kaffeeBeschaeftigt(z, p.id))) zeiten.push(t + 1);
  const n = Math.min(...zeiten);
  return Number.isFinite(n) ? { zeit: n, tun: (zz, rr) => dienstAktualisieren(zz, rr) } : null;
}

// ---- Für die Anzeige ----
// Wo läuft ein Ehrenamtlicher gerade? (auf dem Weg zur Schicht oder nach Hause) → { x, y } | null
export function dienstPosition(z, p) {
  const m = z.dienst && z.dienst.ma[p.id];
  if (!m || !m.bew || z.minuten >= ankunft(m.bew) - EPS) return null;
  return punktAufWeg(m.bew, Math.max(0, z.minuten - m.bew.t0) * LAUFTEMPO);
}
// Ist er an seiner Stelle angekommen? (Evangelisation: erst dann spricht er Leute an)
export function dienstAngekommen(z, p, t = z.minuten) {
  const m = z.dienst && z.dienst.ma[p.id];
  return !p.daheim && (!m || !m.bew || t >= ankunft(m.bew) - EPS);
}
export function dienstAnkunft(z, p) {
  const m = z.dienst && z.dienst.ma[p.id];
  return m && m.bew ? ankunft(m.bew) : -Infinity;
}

// Menü „Mitarbeiter“: alle Ehrenamtlichen mit ihren Schichten und alle Termine der Woche mit ihren Stellen.
// Namen der Räume und Veranstaltungen macht die Oberfläche aus den Kennungen.
export function dienstplanInfo(z, raeume) {
  dienstAnlegen(z);
  const termine = dienstTermine(z, raeume);
  const nummer = nr => {   // Raum-Nummer, wenn es mehrere Räume dieser Art gibt (wie im Gemeindekalender)
    const r = raeume.liste[nr]; if (!r || !r.typ) return null;
    const gleiche = raeume.liste.filter(x => x.typ && x.typ.id === r.typ.id);
    return gleiche.length > 1 ? gleiche.indexOf(r) + 1 : null;
  };
  const raumInfo = nr => { const r = nr === null || nr === undefined ? null : raeume.liste[nr]; return r && r.typ ? { nr, typ: r.typ.id, name: r.typ.name, nummer: nummer(nr) } : null; };
  return {
    personen: ehrenamtliche(z).map(p => { const d = daten(p); return { id: p.id, name: d.name, kuerzel: d.kuerzel, belegt: schichtenBelegt(z, raeume, p), max: schichtenMax(p),
      jugend: !!(d.herkunft && d.herkunft.jugend), daheim: !!p.daheim }; }),
    termine: termine.map(x => ({ key: x.key, art: x.art, tag: x.tag, slot: x.slot, veranstaltung: x.veranstaltung || null,
      veranstaltungName: ((x.veranstaltung && VERANSTALTUNGEN.find(v => v.id === x.veranstaltung)) || {}).name || null,
      raum: raumInfo(x.raum), nachRaum: raumInfo(x.nachRaum),
      stellen: x.stellen.map(s => { const p = personAuf(z, x, s.id), d = p && daten(p);
        return { id: s.id, code: s.code, ding: s.ding, dingName: ((s.ding && MOEBEL.find(m => m.id === s.ding)) || {}).name || null,
          raum: raumInfo(s.raum), person: p ? { id: p.id, name: d.name, kuerzel: d.kuerzel } : null }; }) }))
  };
}
