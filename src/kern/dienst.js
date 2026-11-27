// Dienstplan der Ehrenamtlichen (Spielprinzip von Lukas, 27.11.2026: claude/spielprinzip-ehrenamt-schichten-lager.md).
// Kennt keine Grafik und keine Texte. Zahlen: DIENST in inhalte/dienst.js.
// Hauptamtliche (Lukas, 27.11.2026: claude/spielprinzip-hauptamt-dienstplan.md) stehen im selben Dienstplan:
//   • Jede Stelle sagt, wer sie übernehmen darf (wer: 'hauptamt' | 'ehrenamt' | 'alle'). Neu ist die Stelle „Leitung“
//     (code 'leitungHA') bei jeder Veranstaltung, die einen Hauptamtlichen braucht – nur für Hauptamtliche.
//     Hauptamtliche dürfen außerdem alle Stellen, die nicht ausdrücklich einen Ehrenamtlichen verlangen
//     (Begrüßung, Kirchkaffee, Logistik, Evangelisation, Leitung beim Spielenachmittag).
//   • Pro Woche DIENST.schichtenHauptamt Schichten. Ohne Schicht bleiben sie auf dem Gelände (gehen zu ihrem Startplatz).
//   • Feste (Sonderevents): Wer im Fest-Menü als Leitung gewählt ist, geht zur Festzeit in den Festraum. Das zählt
//     nicht als Schicht und geht vor eine normale Schicht zur selben Zeit.
//
// So läuft es:
//   • Jede Woche gibt es dieselben Termine mit Stellen für Ehrenamtliche:
//       - Veranstaltungen (Musiker je Instrument im Gottesdienstraum, Leitung bzw. Mitarbeit im Gemeindesaal,
//         Begrüßung in jedem Foyer),
//       - Kirchkaffee nach jedem Gottesdienst (je Kirchkaffee so viele Stellen wie Stationen aus Maschine + Theke),
//       - eigene Öffnungszeiten des Kirchkaffees (gleich viele Stellen),
//       - Logistik im Lager zu dessen Logistik-Zeiten (so viele Stellen wie Regale in diesem Lager),
//       - Evangelisation je Zeitblock (so viele Stellen wie Standplätze),
//       - Büro je Zeitblock (je Schreibtisch eine Stelle, höchstens BUERO.plaetze; nur Ehrenamtliche – 27.11.).
//   • Jeder Termin, bei dem ein Ehrenamtlicher eine Stelle hat, ist eine Schicht. Pro Woche höchstens DIENST.schichten
//     (die Frau des Pastors 5). Zwei Schichten derselben Person dürfen sich zeitlich nicht überschneiden.
//   • Ob eine Veranstaltung stattfinden kann, richtet sich nach dem Dienstplan (nicht danach, wer gerade wo steht).
//   • Während seiner Schicht steht der Ehrenamtliche an seiner Stelle (p.x, p.y) – dann gelten alle bisherigen Regeln
//     (Kirchkaffee-Station, Lager, Musiker am Instrument …). Ohne Schicht ist er daheim (p.daheim, nicht auf der Karte).
//     Hin und zurück läuft er sichtbar vom bzw. zum Tor (nur fürs Auge; für die Regeln ist er ab Schichtbeginn da bzw. ab
//     Schichtende weg). Pünktlich (Lukas, 27.11.): Er bricht so früh auf, dass er genau zum Schichtbeginn an seiner Stelle
//     steht – Weglänge geteilt durch LAUFTEMPO. Kommt er gerade aus einer anderen Schicht, läuft er von dort direkt hin.
//   • Wer noch Kunden in der Schlange hat oder gerade etwas einkauft, macht das erst fertig.
//   • Sonntagvormittags kommt jeder Ehrenamtliche, der dann keine Schicht hat, mit DIENST.besuch.chance als Besucher
//     in den Gottesdienst (egal welche Art, nur im Gottesdienstraum).
//
// Der Plan wird gespeichert in z.dienst.plan: { [Termin-Schlüssel]: { [Stelle]: Person-id } } – jede Woche gleich.
// Termin-Schlüssel: v:<Raum>:<Platz> (Veranstaltung), kn:<Kirchkaffee>:<Raum>:<Platz> (Kirchkaffee danach),
// ko:<Kirchkaffee>:<Tag>:<Slot> (Öffnungszeit), lg:<Lager>:<Tag>:<Slot> (Logistik), ev:<Tag>:<Slot> (Evangelisation),
// bu:<Tag>:<Slot> (Büro).
// <Raum> ist wie überall das kleinste Kästchen des Raums – so übersteht der Plan Umbauten.
import { DIENST } from '../inhalte/dienst.js';
import { SLOTS, DAUER, LAUFTEMPO } from '../inhalte/zeit.js';
import { VERANSTALTUNGEN } from '../inhalte/veranstaltungen.js';
import { EVANGELISATION } from '../inhalte/evangelisation.js';
import { BUERO } from '../inhalte/buero.js';
import { MOEBEL } from '../inhalte/moebel.js';
import { GRUNDSTUECK, GEHWEGE } from '../inhalte/umgebung.js';
import { LEER, idx } from './karte.js';
import { moebelImRaum, hindernisBei } from './moebel.js';
import { gemerkt } from './durchgang.js';
import { daten, startPlatz } from './personen.js';
import { WOCHE_MIN, slotBeginn, zeitpunkt } from './zeit.js';
import { programmVon, moeglicheVeranstaltungen, dauerVon, mitKirchkaffee } from './ablauf.js';
import { schichtenVon, schichtZeit, kaffeeBeschaeftigt } from './kirchkaffee.js';
import { lagerZeitenVon } from './lager.js';
import { weg, glaetten } from './wege.js';
import { punktAufWeg } from './bewegung.js';
import { musikLevel } from './skills.js';
import { evangelisationVerlassen } from './evangelisation.js';
import { festPlaeneDerWoche } from './feste.js';

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
// Alle Mitarbeiter im Dienstplan: Ehrenamtliche und Hauptamtliche
const mitarbeiter = z => z.personen.filter(p => { const d = daten(p); return d && (d.art === 'ehrenamt' || d.art === 'hauptamt'); });
const istHA = p => { const d = daten(p); return !!d && d.art === 'hauptamt'; };
const darf = (s, p) => { const d = daten(p); return !!d && (s.wer === 'alle' ? d.art === 'ehrenamt' || d.art === 'hauptamt' : d.art === s.wer); };
// Schichten pro Woche: aus den Daten der Person (Frau des Pastors 5), sonst DIENST.schichten bzw. DIENST.schichtenHauptamt.
// Alte Spielstände: die Frau des Pastors wurde dort ohne `schichten` angelegt – sie erkennt man an `start`.
// Schulungen (27.11.): dazu kommen die Schichten aus Schulungen (p.schichtenDazu, z. B. Worshipkonferenz).
export function schichtenMax(p) {
  const d = daten(p) || {};
  const dazu = p.schichtenDazu || 0;
  if (typeof d.schichten === 'number') return d.schichten + dazu;
  if (d.art === 'hauptamt') return DIENST.schichtenHauptamt + dazu;
  return (d.start && d.name === 'Frau des Pastors' ? 5 : DIENST.schichten) + dazu;
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
    instrumente(z, r).forEach((m, i) => s.push({ id: `musik${i}`, code: 'musik', wer: 'ehrenamt', ding: m.art, ort: { x: m.x, y: m.y }, raum: r.nr }));
  // Leitung durch einen Hauptamtlichen (Gottesdienste, Konfi, Seniorennachmittag): eigene Stelle, steht vorne
  if (!v.leitungOder && [].concat(v.leitung || []).includes('hauptamt')) s.unshift({ id: 'hauptamt', code: 'leitungHA', wer: 'hauptamt', ding: null, ort: null, raum: r.nr });
  const leitet = v.leitungOder || [].concat(v.leitung || []).includes('ehrenamt');
  if (leitet) {
    const klavier = (v.braucht || []).includes('klavier') ? moebelImRaum(z, r, 'klavier')[0] : null;
    s.push({ id: 'leitung', code: klavier ? 'chorleitung' : 'leitung', wer: v.leitungOder ? 'alle' : 'ehrenamt', ding: klavier ? 'klavier' : null, ort: klavier ? { x: klavier.x, y: klavier.y } : null, raum: r.nr });
  }
  if (v.haltungJeEhrenamt) for (let i = 0; i < (v.ehrenamtMax || 1); i++) s.push({ id: `mit${i}`, code: 'mitarbeit', wer: 'ehrenamt', ding: null, ort: null, raum: r.nr });
  for (const f of foyerListe) s.push({ id: `foyer${raumKey(f)}`, code: 'begruessung', wer: 'alle', ding: null, ort: null, raum: f.nr });
  return s;
}
// Stationen eines Kirchkaffees: so viele Maschinen, wie es Thekenteile gibt (je Station eine Maschine und ein Thekenteil)
function kaffeeStellen(z, r) {
  const maschinen = moebelImRaum(z, r, 'kaffeemaschine'), theken = moebelImRaum(z, r, 'theke');
  return maschinen.slice(0, theken.length).map((m, i) => ({ id: `theke${i}`, code: 'theke', wer: 'alle', ding: 'theke', ort: { x: m.x, y: m.y }, raum: r.nr }));
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
  // Logistik (27.11.): je Lager nur zu seinen Logistik-Zeiten (Klick aufs Lager), eine Stelle je Regal in diesem Lager
  for (const r of lager) {
    const regale = moebelImRaum(z, r, 'regal');
    if (!regale.length) continue;
    for (const s of lagerZeitenVon(z, r)) {
      const f = blockZeit(s.tag, s.slot);
      liste.push({ key: `lg:${raumKey(r)}:${s.tag}:${s.slot}`, art: 'logistik', tag: s.tag, slot: s.slot, raum: r.nr, raumKey: raumKey(r), von: f.von, bis: f.bis,
        stellen: regale.map((m, i) => ({ id: `regal${i}`, code: 'regal', wer: 'alle', ding: 'regal', ort: { x: m.x, y: m.y }, raum: r.nr })) });
    }
  }
  // Büro (27.11.): je Schreibtisch eine Stelle, vorerst höchstens BUERO.plaetze im ganzen Spiel
  const tische = raeume.liste.filter(r => fertig(r, 'buero')).flatMap(r => moebelImRaum(z, r, 'schreibtisch').map(m => ({ m, r }))).slice(0, BUERO.plaetze);
  for (let tag = 0; tag < 7; tag++) for (const sl of SLOTS) {
    const f = blockZeit(tag, sl.id);
    if (tische.length) liste.push({ key: `bu:${tag}:${sl.id}`, art: 'buero', tag, slot: sl.id, raum: null, von: f.von, bis: f.bis,
      stellen: tische.map(({ m, r }, i) => ({ id: `tisch${i}`, code: 'schreibtisch', wer: 'ehrenamt', ding: 'schreibtisch', ort: { x: m.x, y: m.y }, raum: r.nr })) });
    liste.push({ key: `ev:${tag}:${sl.id}`, art: 'evangelisation', tag, slot: sl.id, raum: null, von: f.von, bis: f.bis,
      stellen: EVANGELISATION.standplaetze.map((o, i) => ({ id: `platz${i}`, code: 'evangelisation', wer: 'alle', ding: null, ort: { ...o }, raum: null })) });
  }
  liste.sort((a, b) => a.von - b.von);
  if (merker && merker.z === z && merker.raeume === raeume) merker.liste = liste;
  return liste;
}

// Wer steht auf dieser Stelle? (nur Mitarbeiter, die es noch gibt und die diese Stelle übernehmen dürfen)
function personAuf(z, termin, stelleId) {
  const id = ((z.dienst && z.dienst.plan[termin.key]) || {})[stelleId];
  const p = id && z.personen.find(x => x.id === id);
  const s = p && termin.stellen.find(x => x.id === stelleId);
  return s && darf(s, p) ? p : null;
}
// Termine einer Person (mit ihrer Stelle)
// Leistung (27.11.): im Durchgang je Person nur einmal ausgerechnet (der Plan ändert sich nur über stelleSetzen, nie während die Zeit läuft)
function termineVon(z, raeume, p) {
  const m = merker && merker.z === z && merker.raeume === raeume ? merker : null;
  if (m && m.anzahl !== z.personen.length) { m.vonPerson = new Map(); m.anzahl = z.personen.length; }
  if (m && m.vonPerson.has(p)) return m.vonPerson.get(p);
  const liste = dienstTermine(z, raeume).flatMap(t => t.stellen.filter(s => personAuf(z, t, s.id) === p).map(s => ({ t, s })));
  if (m) m.vonPerson.set(p, liste);
  return liste;
}
export function schichtenBelegt(z, raeume, p) { return new Set(termineVon(z, raeume, p).map(x => x.t.key)).size; }
const ueberschneiden = (a, b) => a.von < b.bis - EPS && b.von < a.bis - EPS;

// ---- Befehl: Stelle besetzen oder frei machen ----
// → 'ok' | 'keine' (Termin/Stelle gibt es nicht) | 'person' (darf diese Stelle nicht übernehmen) | 'doppelt' (hat bei diesem Termin
//   schon eine Stelle) | 'voll' (alle Schichten der Woche vergeben) | 'zeit' (überschneidet sich mit einer anderen Schicht)
//   | 'schulung' (ist gerade auf Schulung, 27.11.)
export function stelleSetzen(z, raeume, key, stelleId, personId) {
  dienstAnlegen(z);
  const t = dienstTermine(z, raeume).find(x => x.key === key), s = t && t.stellen.find(x => x.id === stelleId);
  if (!s) return 'keine';
  const plan = z.dienst.plan;
  if (!personId) {
    if (plan[key]) { delete plan[key][stelleId]; if (!Object.keys(plan[key]).length) delete plan[key]; }
    return 'ok';
  }
  const p = z.personen.find(x => x.id === personId);
  if (!p || !darf(s, p)) return 'person';
  if (personAuf(z, t, stelleId) === p) return 'ok';
  if (p.schulung) return 'schulung';   // Schulungen (27.11.): während der Schulung keine Schichten
  const eigene = termineVon(z, raeume, p);
  if (eigene.some(x => x.t.key === key)) return 'doppelt';
  if (new Set(eigene.map(x => x.t.key)).size >= schichtenMax(p)) return 'voll';
  if (eigene.some(x => ueberschneiden(x.t, t))) return 'zeit';
  (plan[key] = plan[key] || {})[stelleId] = p.id;
  return 'ok';
}

// ---- Für die Spielregeln ----
// Eingeteilte Mitarbeiter einer Veranstaltung (Raum r, Platz i):
// { alle: Ehrenamtliche (ohne Begrüßung im Foyer), musik, hauptamt: Hauptamtliche mit einer Leitungs-Stelle }
export function veranstaltungDienst(z, raeume, r, platz) {
  const t = dienstTermine(z, raeume).find(x => x.key === `v:${raumKey(r)}:${platz}`);
  if (!t) return { alle: [], musik: [], hauptamt: [] };
  const besetzt = t.stellen.map(s => ({ s, p: personAuf(z, t, s.id) })).filter(x => x.p);
  return { alle: besetzt.filter(x => x.s.code !== 'begruessung' && !istHA(x.p)).map(x => x.p), musik: besetzt.filter(x => x.s.code === 'musik').map(x => x.p),
    hauptamt: besetzt.filter(x => istHA(x.p) && (x.s.code === 'leitungHA' || x.s.code === 'leitung')).map(x => x.p) };
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

// Büro (27.11.): alle besetzten Büro-Schichten der Woche → [{ key, von, bis, raum, person }] (von/bis: Minuten ab Montag 0:00)
export function bueroSchichten(z, raeume) {
  return dienstTermine(z, raeume).filter(t => t.art === 'buero').flatMap(t => t.stellen.map(s => ({ s, p: personAuf(z, t, s.id) })).filter(x => x.p)
    .map(x => ({ key: t.key, von: t.von, bis: t.bis, raum: x.s.raum, person: x.p })));
}

// Feste, die p leitet (nur Hauptamtliche), in den Wochen w-1 bis w+1 – absolute Minuten. Zählen nicht als Schicht.
function festeVon(z, raeume, p, w) {
  if (!istHA(p)) return [];
  const aus = [];
  for (const woche of [w - 1, w, w + 1]) for (const f of festPlaeneDerWoche(z, woche)) {
    if (f.plan.leitung !== p.id) continue;
    const nr = raeume.gruppe[f.plan.raum], r = nr >= 0 ? raeume.liste[nr] : null;
    if (!r || !r.typ) continue;
    const von = slotBeginn({ tag: f.tag, slot: f.plan.slot }, woche);
    aus.push({ t: { key: `fest:${f.schluessel}`, art: 'fest', von, bis: von + dauerVon(f.plan.art) }, s: { id: 'fest', code: 'leitungHA', ort: null, raum: r.nr }, von, bis: von + dauerVon(f.plan.art) });
  }
  return aus;
}
// Welche Schicht hat p gerade? → { t, s } oder null. Zeit t in Minuten seit Spielbeginn. Ein Fest geht vor.
export function aktiveSchicht(z, raeume, p, t = z.minuten) {
  const w = zeitpunkt(t).woche;
  for (const f of festeVon(z, raeume, p, w)) if (t >= f.von - EPS && t < f.bis - EPS) return f;
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
    if (p.schulung) continue;   // Schulungen (27.11., Lukas): wer auf Schulung ist, kommt nicht in den Gottesdienst
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
// Leistung (27.11.): Der Weg hängt nur von Wänden und Möbeln ab – innerhalb eines Durchgangs wird er je Start und Ziel
// nur einmal gesucht (vorher bei jedem Ereignis neu, bis zu 6 Stunden vor jeder Schicht).
function gehen(z, von, nach, t) {
  const a = { x: Math.round(von.x), y: Math.round(von.y) }, blockiert = (x, y) => hindernisBei(z, x, y);
  const gefunden = gemerkt(z, `dienstWeg:${a.x},${a.y}>${nach.x},${nach.y}`, () => glaetten(z, weg(z, a, nach, blockiert), blockiert) || [a, { x: nach.x, y: nach.y }]);
  let pfad = gefunden.map(q => ({ ...q }));
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

// Ist das Kästchen frei (keine andere Person, die gerade da ist)?
const frei = (z, o, p) => !hindernisBei(z, o.x, o.y) && !z.personen.some(q => q !== p && !q.daheim && q.x === o.x && q.y === o.y);
// Wo ist er gerade auf seinem Weg? (null: steht nicht auf einem Weg)
const unterwegsPunkt = (m, t) => m.bew && t < ankunft(m.bew) - EPS ? punktAufWeg(m.bew, Math.max(0, t - m.bew.t0) * LAUFTEMPO) : null;

// ---- Pünktlich zur Schicht (Lukas, 27.11.) ----
// So weit im Voraus wird der Weg zur nächsten Schicht ausgerechnet (Spielminuten; länger dauert kein Weg über das Gelände)
const VORAUS = 6 * 60;
// Nächste Schicht von p nach t (absolute Minuten) → { t, s, von } | null
function naechsteSchicht(z, raeume, p, t) {
  const w = zeitpunkt(t).woche;
  let beste = null;
  for (const x of termineVon(z, raeume, p)) for (const woche of [w, w + 1]) {
    const von = woche * WOCHE_MIN + x.t.von;
    if (von > t + EPS && (!beste || von < beste.von)) beste = { ...x, von };
  }
  for (const f of festeVon(z, raeume, p, w)) if (f.von > t + EPS && (!beste || f.von < beste.von)) beste = f;
  return beste;
}
// Daheim (oder auf dem Heimweg) und bald Schicht: Weg ausrechnen und genau so früh loslaufen, dass er zum Beginn da ist.
// Merkt sich in m.vor, wann er los muss (für dienstSchritt), und in m.hin, wohin er gerade unterwegs ist.
// Für die Regeln bleibt er bis zum Schichtbeginn daheim. → true, wenn er gerade losgelaufen ist
function aufbrechen(z, raeume, p, m, t) {
  if (m.hin) return false;
  const n = naechsteSchicht(z, raeume, p, t);
  if (!n || n.von - t > VORAUS) { m.vor = null; return false; }
  const ziel = zielVon(z, raeume, p, n.s);
  if (!ziel) { m.vor = null; return false; }
  const start = unterwegsPunkt(m, t) || (p.daheim ? TOR() : { x: p.x, y: p.y });   // Hauptamtliche: von dort, wo sie gerade sind
  const b = gehen(z, start, ziel, t), los = n.von - b.laenge / LAUFTEMPO;
  if (t < los - EPS) { m.vor = { key: n.t.key, los }; return false; }
  b.t0 = los;   // genau zum Schichtbeginn am Ziel
  if (los < t - EPS) {   // zu spät dran (z. B. direkt aus der vorigen Schicht): so schnell es geht hin
    b.t0 = t;
  }
  m.bew = b; m.hin = { key: n.t.key, ziel }; m.vor = null;
  return true;
}

// ---- Alles bis jetzt Fällige: Ehrenamtliche kommen zu ihrer Schicht oder gehen heim ----
export function dienstAktualisieren(z, raeume) {
  if (!schichtbetrieb(z)) return false;
  dienstAnlegen(z);
  const t = z.minuten, M = z.dienst.ma;
  let geaendert = false;
  for (const p of mitarbeiter(z)) {
    const jetzt = aktiveSchicht(z, raeume, p, t), m = M[p.id] || (M[p.id] = { bew: null }), ha = istHA(p);
    if (jetzt) {
      if (amPlatz(z, raeume, p, jetzt.s)) { if (ha) m.ruhe = null; continue; }
      if (!p.daheim && kaffeeBeschaeftigt(z, p.id)) continue;   // erst die Schlange fertig bedienen
      const ziel = zielVon(z, raeume, p, jetzt.s);
      if (!ziel) continue;
      m.ruhe = null;
      // Schon unterwegs hierher (pünktlich losgelaufen) und der Platz ist noch frei: einfach weiterlaufen
      const hin = (p.daheim || ha) && m.hin && m.hin.key === jetzt.t.key && m.bew ? m.hin.ziel : null;
      if (hin && frei(z, hin, p)) { if (!p.daheim) evangelisationVerlassen(z, p); p.x = hin.x; p.y = hin.y; p.daheim = false; m.hin = null; geaendert = true; continue; }
      let start;
      if (p.daheim) start = unterwegsPunkt(m, t) || TOR();   // war gerade auf dem Heimweg (oder auf dem Hinweg zu einem besetzten Platz)
      else { start = { x: p.x, y: p.y }; evangelisationVerlassen(z, p); }
      m.bew = gehen(z, start, ziel, t); m.hin = null;
      p.x = ziel.x; p.y = ziel.y; p.daheim = false;
      geaendert = true;
    } else if (ha) {
      // Hauptamtliche gehen nicht heim (Lukas, 27.11.): nach der Schicht zurück zu ihrem Startplatz auf dem Gelände
      if (p.daheim) { const s = startPlatz(); p.x = s.x; p.y = s.y; p.daheim = false; m.bew = null; geaendert = true; }
      else if (m.ruhe === undefined || m.ruhe === null) {
        if (kaffeeBeschaeftigt(z, p.id)) continue;
        const s = startPlatz();
        if (p.x !== s.x || p.y !== s.y) { evangelisationVerlassen(z, p); m.bew = gehen(z, { x: p.x, y: p.y }, s, t); p.x = s.x; p.y = s.y; geaendert = true; }
        m.ruhe = true;
      }
    } else if (!p.daheim) {
      if (kaffeeBeschaeftigt(z, p.id)) continue;   // Schlange fertig bedienen bzw. Einkauf zu Ende bringen
      evangelisationVerlassen(z, p);
      m.bew = gehen(z, { x: p.x, y: p.y }, TOR(), t);
      p.x = WEG; p.y = WEG; p.daheim = true;
      geaendert = true;
    }
    if ((p.daheim || ha) && !jetzt && aufbrechen(z, raeume, p, m, t)) geaendert = true;
  }
  for (const id of Object.keys(M)) if (!z.personen.some(p => p.id === id)) delete M[id];
  return geaendert;
}
// Nächster Zeitpunkt, zu dem jemand kommt oder geht (für das Tick-System)
export function dienstSchritt(z, raeume) {
  if (!schichtbetrieb(z) || !z.dienst) return null;
  const t = z.minuten, w = zeitpunkt(t).woche, zeiten = [];
  const benutzt = new Set(Object.values(z.dienst.plan).flatMap(o => Object.values(o)));
  const feste = mitarbeiter(z).filter(istHA).flatMap(p => festeVon(z, raeume, p, w));
  if (!benutzt.size && !feste.length && ehrenamtliche(z).every(p => p.daheim) && mitarbeiter(z).filter(istHA).every(p => { const m = z.dienst.ma[p.id]; return m && m.ruhe; })) return null;
  for (const x of dienstTermine(z, raeume)) {
    if (!x.stellen.some(s => personAuf(z, x, s.id))) continue;
    for (const woche of [w, w + 1]) for (const g of [x.von, x.bis]) { const a = woche * WOCHE_MIN + g; if (a > t + EPS) zeiten.push(a); }
  }
  for (const f of feste) for (const a of [f.von, f.bis]) if (a > t + EPS) zeiten.push(a);
  // Pünktlich zur Schicht: Weg rechtzeitig ausrechnen (VORAUS vor Beginn) und genau dann loslaufen
  for (const p of mitarbeiter(z)) {
    const m = z.dienst.ma[p.id];
    if (m && m.vor && m.vor.los > t + EPS) zeiten.push(m.vor.los);
    else if ((p.daheim || istHA(p)) && !(m && m.hin)) { const n = naechsteSchicht(z, raeume, p, t); if (n && n.von - VORAUS > t + EPS) zeiten.push(n.von - VORAUS); }
  }
  // Wer ohne Schicht noch da ist (z. B. Schlange bedient), wird beim nächsten Schritt heimgeschickt (Hauptamtliche: zum Startplatz)
  if (mitarbeiter(z).some(p => !aktiveSchicht(z, raeume, p, t) && !kaffeeBeschaeftigt(z, p.id) && (istHA(p) ? !(z.dienst.ma[p.id] && z.dienst.ma[p.id].ruhe) : !p.daheim))) zeiten.push(t + 1);
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

// Menü „Mitarbeiter“: alle Ehren- und Hauptamtlichen (art) mit ihren Schichten und alle Termine der Woche mit ihren Stellen
// (wer: wer die Stelle übernehmen darf). Tab „Ehrenamt“ bzw. „Hauptamt“ wählt die Oberfläche.
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
    personen: mitarbeiter(z).map(p => { const d = daten(p); return { id: p.id, art: d.art, name: d.name, kuerzel: d.kuerzel, belegt: schichtenBelegt(z, raeume, p), max: schichtenMax(p),
      jugend: !!(d.herkunft && d.herkunft.jugend), daheim: !!p.daheim, schulung: !!p.schulung }; }),
    termine: termine.map(x => ({ key: x.key, art: x.art, tag: x.tag, slot: x.slot, veranstaltung: x.veranstaltung || null,
      veranstaltungName: ((x.veranstaltung && VERANSTALTUNGEN.find(v => v.id === x.veranstaltung)) || {}).name || null,
      raum: raumInfo(x.raum), nachRaum: raumInfo(x.nachRaum),
      stellen: x.stellen.map(s => { const p = personAuf(z, x, s.id), d = p && daten(p);
        return { id: s.id, code: s.code, wer: s.wer, ding: s.ding, dingName: ((s.ding && MOEBEL.find(m => m.id === s.ding)) || {}).name || null,
          raum: raumInfo(s.raum), person: p ? { id: p.id, name: d.name, kuerzel: d.kuerzel } : null }; }) }))
  };
}
