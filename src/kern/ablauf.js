// Ablauf in Echtzeit: Die Uhr läuft, und jede Woche finden die Veranstaltungen der Räume (Veranstaltung 1, 2, …)
// zu ihren Zeiten statt, danach jeweils das Kirchkaffee. Kennt keine Grafik – die Oberfläche zeigt nur an, was hier entschieden wird.
// Mehrere Abläufe können gleichzeitig laufen (z. B. Heimweg vom Vormittag, während die Besucher für den Nachmittag kommen): z.laeufe.
//
// Ablauf eines Termins (Zeiten in Spielminuten):
//   Beginn − 180 Anreise: Es wird ausgelost, wer kommt; die Besucher laufen los.
//   Beginn       Veranstaltung beginnt – nur, wenn ein Hauptamtlicher im Raum ist (und was sie sonst braucht). Sonst fällt sie aus.
//   Beginn + 60  Gottesdienst zu Ende: Kollekte (Stuhl, Altar, Grünpflanzen, Musik), Bekanntheit; wer Kaffee will
//                (Chance = Kaffee-Wert), stellt sich im Kirchkaffee an (Bedienung: kirchkaffee.js).
//   Beginn + 180 Ende des Kirchkaffees (2 Stunden): Zufriedenheit ändert sich, manche werden Ehrenamtliche, alle gehen heim.
//                Wer noch beim Kaffee ansteht, wird fertig bedient und geht danach.
import { VERANSTALTUNGEN, SONNTAGVORMITTAG, PLAETZE, ZWEITER_PLATZ_STANDARD } from '../inhalte/veranstaltungen.js';
import { DAUER, ANREISE_VORLAUF, SLOTS, STANDARD_PLAN } from '../inhalte/zeit.js';
import { AENDERUNG, BEKANNTHEIT, EHRENAMT_AB_BESUCHEN, EHRENAMT_QUOTE } from '../inhalte/besucher.js';
import { KOLLEKTE_PRO_BESUCHER } from '../inhalte/finanzen.js';
import { PREIS_TASSE } from '../inhalte/kirchkaffee.js';
import { idx, erkenneRaeume, raumTypVon, pruefeRaum } from './karte.js';
import { moebelImRaum, moebelBei, raumAusstattung, stuhlStufe, musikLevel, musikErfahrungDazu } from './moebel.js';
import { buchen, summe, wocheWechseln } from './finanzen.js';
import { platzImGebiet } from './einzugsgebiet.js';
import { werKommt, kommChance, besuchChance, lobpreisVorliebe, kaffeeVorliebe, zufriedenheitAendern, bekanntheitAendern, ehrenamtWerden } from './besucher.js';
import { eingesetztIn, personHinzufuegen, daten } from './personen.js';
import { zeitpunkt, slotBeginn, WOCHE_MIN } from './zeit.js';
import { NEUGIER } from '../inhalte/ort.js';
import { SEELSORGE } from '../inhalte/seelsorge.js';
import { ortSchritt } from './ort.js';
import { seelsorgeSchritt, anfrageOffen } from './seelsorge.js';
import { kirchkaffeeZustand, kirchkaffeeOffen, gottesdienstKunden, kaffeeAktualisieren, kaffeeSchritt, naechsteSchicht, kaffeeAnlegen } from './kirchkaffee.js';
import { fassung } from './moebel.js';
import { faktorAmTag } from './kalender.js';
import { FESTE, ZEITEN } from '../inhalte/kirchenjahr.js';
import { festSchritt, festPlaeneDerWoche, festeAufraeumen, festAusSchluessel } from './feste.js';
export { kirchkaffeeZustand, kirchkaffeeOffen };

// Kollekte-Faktor für den Termin: Sonntagvormittag doppelt (Gottesdienst und Lobpreisgottesdienst)
export function zeitFaktor(plan) { return plan && plan.tag === SONNTAGVORMITTAG.tag && plan.slot === SONNTAGVORMITTAG.slot ? SONNTAGVORMITTAG.kollekte : 1; }
// Faktoren des Kirchenjahres für einen Termin (Fest an dem Tag oder Zeit im Kirchenjahr): { besucher, kollekte, fest, zeit }
export function terminFaktoren(t) { return faktorAmTag(t.woche * 7 + t.plan.tag); }
export const HEIMWEG = 120;  // so lange (Spielminuten) laufen die Besucher nach dem Ende noch nach Hause

// ---- Veranstaltungen in Räumen ----
// Jeder Raum hat eine Liste: Platz 0 = „Veranstaltung 1“, Platz 1 = „Veranstaltung 2“ – je { art, tag, slot }.
// Gespeichert in z.veranstaltung, für jedes Kästchen des Raums dieselbe Liste (so übersteht sie Umbauten wie bisher).
// Alte Spielstände hatten dort nur die Art (Text) und einen Termin für alle (z.plan) – das wird hier umgestellt.
export function moeglicheVeranstaltungen(typ) { return typ ? VERANSTALTUNGEN.filter(v => v.raumtypen.includes(typ.id)) : []; }
const standardPlatz = i => i === 0 ? { art: null, ...(STANDARD_PLAN) } : { art: null, ...ZWEITER_PLATZ_STANDARD };
export function programmVon(z, raum) {
  const roh = z.veranstaltung && z.veranstaltung[raum.zellen[0]];
  const liste = Array.isArray(roh) ? roh : typeof roh === 'string' ? [{ art: roh, ...(z.plan || STANDARD_PLAN) }] : [];
  return PLAETZE.map((_, i) => {
    const e = liste[i], d = standardPlatz(i);
    return e ? { art: VERANSTALTUNGEN.some(v => v.id === e.art) ? e.art : null, tag: e.tag ?? d.tag, slot: e.slot ?? d.slot } : d;
  });
}
function programmSchreiben(z, raum, liste) {
  if (!z.veranstaltung) z.veranstaltung = {};
  const leer = liste.every(e => !e.art) && liste.every((e, i) => e.tag === standardPlatz(i).tag && e.slot === standardPlatz(i).slot);
  for (const c of raum.zellen) { if (leer) delete z.veranstaltung[c]; else z.veranstaltung[c] = liste.map(e => ({ ...e })); }
}
export function veranstaltungVon(z, raum, platz = 0) {
  const e = programmVon(z, raum)[platz];
  return (e && VERANSTALTUNGEN.find(v => v.id === e.art)) || null;
}
// Art einer Veranstaltung einstellen (null = keine); die Zeit bleibt
export function veranstaltungEinstellen(z, raum, id, platz = 0) {
  const liste = programmVon(z, raum);
  if (!liste[platz]) return;
  liste[platz].art = id || null;
  programmSchreiben(z, raum, liste);
}
// Zeit einer Veranstaltung einstellen → 'ok' | 'belegt' (im selben Raum ist zu der Zeit schon eine) | 'zeit'
export function terminEinstellen(z, raum, platz, tag, slot) {
  if (!(tag >= 0 && tag <= 6) || !SLOTS.some(s => s.id === slot)) return 'zeit';
  const liste = programmVon(z, raum);
  if (!liste[platz]) return 'zeit';
  if (liste.some((e, i) => i !== platz && e.art && e.tag === tag && e.slot === slot)) return 'belegt';
  Object.assign(liste[platz], { tag, slot });
  programmSchreiben(z, raum, liste);
  return 'ok';
}

// Fertige Räume, in denen Veranstaltungen möglich sind: wer ist im Raum, welche Veranstaltungen können stattfinden?
// programm[i].fehlt: null (kann stattfinden) | 'keine' | 'gesperrt' (Kanzel/Altar fehlen) | 'leitung' | 'gitarre'
export function gottesdienstRaeume(z, raeume) {
  return raeume.liste.filter(r => r.typ && !r.probleme.length && moeglicheVeranstaltungen(r.typ).length).map(r => {
    const zellen = new Set(r.zellen);
    const imRaum = z.personen.filter(p => zellen.has(idx(z, p.x, p.y)) && daten(p));
    const hauptamt = imRaum.filter(p => daten(p).art === 'hauptamt');
    // Musiker: Ehrenamtliche im Raum, die dort eingesetzt sind (das geht nur, wenn eine Gitarre im Raum steht)
    const musiker = imRaum.filter(p => daten(p).art === 'ehrenamt' && eingesetztIn(z, raeume, p) === r);
    // Eine Gitarre = ein Lobpreisteam: Es spielt der Musiker mit dem höchsten Musik-Level.
    const spieler = musiker.reduce((best, p) => !best || musikLevel(p) > musikLevel(best) ? p : best, null);
    const hat = art => moebelImRaum(z, r, art).length > 0;
    const programm = programmVon(z, r).map((e, i) => {
      const v = VERANSTALTUNGEN.find(x => x.id === e.art) || null, frei = PLAETZE[i].braucht.every(hat);
      const leitung = v ? imRaum.find(p => daten(p).art === v.leitung) || null : null;
      const fehlt = !v ? 'keine' : !frei ? 'gesperrt' : !leitung ? 'leitung' : v.braucht.some(a => !hat(a)) ? 'gitarre' : null;
      return { platz: i, art: e.art, tag: e.tag, slot: e.slot, veranstaltung: v, frei, leitung, fehlt, bereit: !fehlt };
    });
    return { raum: r, typ: r.typ, programm, veranstaltung: programm[0].veranstaltung, stuehle: moebelImRaum(z, r, 'stuhl'), imRaum, hauptamt,
      leitung: hauptamt[0] || null, musiker, spieler, ausstattung: raumAusstattung(z, r, spieler ? musikLevel(spieler) : null), bereit: programm.some(p => p.bereit) };
  });
}
// Räume, in denen Veranstaltung 1 als Gottesdienst stattfinden kann (für Tests und Übersichten)
export function gottesdienstBereit(z, raeume) { return gottesdienstRaeume(z, raeume).filter(g => g.programm[0].bereit && g.programm[0].art === 'gottesdienst'); }

// Räume selbst erkennen (wenn der Aufrufer sie nicht mitgibt)
function raeumeVon(z) {
  const { raeume: liste, gruppe } = erkenneRaeume(z);
  for (const r of liste) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); }
  return { liste, gruppe };
}
const raumSchluessel = r => Math.min(...r.zellen);
function raumZu(raeume, schluessel) { const nr = raeume.gruppe[schluessel]; return nr === undefined || nr < 0 ? null : raeume.liste[nr] || null; }

// Alle Termine einer Woche, nach Beginn sortiert. Veranstaltung 1 jedes Gottesdienstraums ist immer ein Termin
// (ist dort „Keine“ eingestellt, fällt er aus – wie bisher). Weitere nur, wenn eine Art eingestellt ist.
// Gibt es gar keinen Gottesdienstraum, bleibt wie bisher der Standardtermin (Sonntag vormittags), der ausfällt.
export function termineDerWoche(z, raeume, woche) {
  const t = [];
  for (const r of raeume.liste.filter(r => r.typ && moeglicheVeranstaltungen(r.typ).length)) {
    const key = raumSchluessel(r);
    programmVon(z, r).forEach((e, i) => {
      if (i > 0 && !e.art) return;
      t.push({ id: `${woche}:${key}:${i}`, woche, raum: key, platz: i, art: e.art, plan: { tag: e.tag, slot: e.slot }, beginn: slotBeginn(e, woche) });
    });
  }
  // Sonderevents (Fest-Menü): eigener Termin im gewählten Raum
  for (const f of festPlaeneDerWoche(z, woche)) {
    if (!raumZu(raeume, f.plan.raum)) continue;   // Raum gibt es nicht mehr: das Fest findet nicht statt
    const plan = { tag: f.tag, slot: f.plan.slot };
    t.push({ id: `${woche}:fest:${f.schluessel}`, woche, raum: f.plan.raum, platz: 'fest', fest: f.schluessel, art: f.plan.art, plan, beginn: slotBeginn(plan, woche) });
  }
  if (!t.length) t.push({ id: `${woche}:-:0`, woche, raum: null, platz: 0, art: null, plan: { ...STANDARD_PLAN }, beginn: slotBeginn(STANDARD_PLAN, woche) });
  return t.sort((a, b) => a.beginn - b.beginn || (a.fest ? -1 : b.fest ? 1 : a.platz - b.platz));
}
// Der nächste anstehende Termin (noch nicht begonnen, noch nicht ausgelost)
export function naechsterTermin(z, raeume = raeumeVon(z)) {
  const w = zeitpunkt(z.minuten).woche, laufend = new Set((z.laeufe || []).map(L => L.id)), erledigt = new Set(z.termineErledigt || []);
  for (const woche of [w, w + 1]) {
    if (woche <= z.letzterLauf) continue;   // alte Spielstände: diese Woche war schon
    for (const t of termineDerWoche(z, raeume, woche)) if (z.minuten < t.beginn && !laufend.has(t.id) && !erledigt.has(t.id)) return t;
  }
  return null;
}

// Sitzplätze der bereiten Gottesdiensträume, beste Plätze zuerst (höchste Stuhlstufe, dann meiste Kollekte).
// wert: Kollekte der Person auf diesem Platz (1 € × Stuhl × Raum); haltung: + Haltung für sie.
export function sitzplaetze(liste) {
  const plaetze = liste.flatMap(g => g.stuehle.map(s => {
    const st = stuhlStufe(s);
    return { x: s.x, y: s.y, stufe: st.stufe, wert: KOLLEKTE_PRO_BESUCHER * st.kollekte * g.ausstattung.faktor, haltung: st.haltung + g.ausstattung.haltung };
  }));
  return plaetze.sort((a, b) => b.stufe - a.stufe || b.wert - a.wert);
}
// Kollekte und Haltung für einen besetzten Platz, so wie der Raum jetzt eingerichtet ist
function platzWirkung(z, raeume, sitz, liste) {
  const nr = raeume.gruppe[idx(z, sitz.x, sitz.y)], g = liste.find(x => x.raum.nr === nr);
  const m = moebelBei(z, sitz.x, sitz.y), st = m && m.art === 'stuhl' ? stuhlStufe(m) : stuhlStufe(null);
  const a = g ? g.ausstattung : { faktor: 1, haltung: 0, musikBonus: 0 };
  return { kollekte: KOLLEKTE_PRO_BESUCHER * st.kollekte * a.faktor, haltung: st.haltung + a.haltung, musikHaltung: a.musikBonus || 0 };
}

// ---- Zeit vorrücken ----
// Prüft, welcher Schritt als Nächstes ansteht (Veranstaltungen, Passanten im Ort, Seelsorge-Anfrage),
// und führt alle Schritte bis zur Zielzeit aus. Kommt eine Seelsorge-Anfrage, bleibt die Zeit genau dort stehen.
export function zeitVorruecken(z, raeume, minuten, zufall = Math.random) {
  ablaufAnlegen(z); kaffeeAnlegen(z);
  if (anfrageOffen(z)) return;
  const ziel = z.minuten + minuten, gesperrt = zz => seelsorgeGesperrt(zz, raeume);
  kaffeeAktualisieren(z, raeume);
  for (let sicherung = 0; sicherung < 20000; sicherung++) {
    wochenbuchPruefen(z);
    let s = null;
    for (const k of [naechsterSchritt(z, raeume), ortSchritt(z, zufall), seelsorgeSchritt(z, gesperrt, zufall), kaffeeSchritt(z, raeume), festSchritt(z)])
      if (k && (!s || k.zeit < s.zeit)) s = k;
    if (!s || s.zeit > ziel) break;
    z.minuten = Math.max(z.minuten, s.zeit);
    s.tun(z, raeume, zufall);
    kaffeeAktualisieren(z, raeume);   // z. B. nach dem Gottesdienst: Kaffeegäste stellen sich an
    if (anfrageOffen(z)) { wochenbuchPruefen(z); return; }
  }
  z.minuten = ziel;
  kaffeeAktualisieren(z, raeume);
  wochenbuchPruefen(z);
}
// Alte Spielstände: ein einzelner laufender Termin (z.lauf) wird zum ersten Eintrag in z.laeufe
export function ablaufAnlegen(z) {
  if (!Array.isArray(z.laeufe)) {
    z.laeufe = [];
    if (z.lauf) z.laeufe.push({ ...z.lauf, id: `${z.lauf.woche}:alt:0`, raum: null, platz: 0, art: 'gottesdienst', plan: { ...(z.plan || STANDARD_PLAN) } });
  }
  delete z.lauf;
  if (!Array.isArray(z.termineErledigt)) z.termineErledigt = [];
}
// Seelsorge (Lukas, 25.11.): Anfragen kommen immer, wenn der Pastor gerade keine Veranstaltung leitet – auch während
// des Kirchkaffees. Gesperrt nur während einer Veranstaltung, die der Pastor leitet, und in den 3 Stunden davor.
function leitetPastor(z, raeume, termin) {
  const info = terminInfo(z, raeume, termin);
  return !!(info && info.p.leitung && info.p.leitung.id === 'pastor');
}
export function seelsorgeGesperrt(z, raeume = raeumeVon(z)) {
  if ((z.laeufe || []).some(L => (L.phase === 'anreise' || L.phase === 'gottesdienst') && !L.ausgefallen && leitetPastor(z, raeume, L))) return true;
  const t = naechsterTermin(z, raeume);
  return !!t && z.minuten >= t.beginn - SEELSORGE.sperreVorGottesdienst && leitetPastor(z, raeume, t);
}
// Neue Woche (Montag 0:00): alte Woche in den Finanz-Verlauf, Wochenbuch leeren
function wochenbuchPruefen(z) {
  const w = zeitpunkt(z.minuten).woche;
  if (z.buchWoche !== w) wocheWechseln(z, w);
  // Bekanntheit am Ende jeder Woche merken (Kurve im Bekanntheit-Fenster); alte Spielstände beginnen ab jetzt
  if (!Array.isArray(z.bekanntheitVerlauf)) z.bekanntheitVerlauf = [];
  const V = z.bekanntheitVerlauf;
  if (w > 0 && !V.some(p => p.woche === w - 1)) V.push({ woche: w - 1, wert: z.bekanntheit });
  // Erledigte Termine nur für diese und letzte Woche merken
  if (z.termineErledigt) z.termineErledigt = z.termineErledigt.filter(id => Number(id.split(':')[0]) >= w - 1);
  festeAufraeumen(z);
}

// Der jüngste Ablauf, in dem diese Person gerade dabei ist (oder null)
export function laufVon(z, id) {
  const L = (z.laeufe || []).slice().reverse();
  return L.find(l => l.gaeste && l.gaeste.some(g => g.id === id)) || null;
}

function naechsterSchritt(z, raeume) {
  let s = null;
  const nimm = k => { if (k && (!s || k.zeit < s.zeit)) s = k; };
  const t = naechsterTermin(z, raeume);
  if (t) nimm({ zeit: Math.max(t.beginn - ANREISE_VORLAUF, z.minuten), tun: (z, r, zf) => anreise(z, r, zf, t) });
  for (const L of z.laeufe) nimm(laufSchritt(z, L));
  return s;
}
function laufSchritt(z, L) {
  const ende = L.beginn + DAUER.gottesdienst + DAUER.kirchkaffee;
  if (L.phase === 'anreise') return { zeit: L.beginn, tun: (z, r, zf) => beginnen(z, r, zf, L) };
  if (L.phase === 'gottesdienst') return { zeit: L.beginn + DAUER.gottesdienst, tun: (z, r, zf) => gottesdienstEnde(z, r, L, zf) };
  if (L.phase === 'kirchkaffee') return { zeit: ende, tun: (z, r, zf) => abschliessen(z, r, zf, L) };
  if (L.phase === 'ende') return { zeit: L.ende + HEIMWEG, tun: z => { z.laeufe = z.laeufe.filter(x => x !== L); } };
  return null;
}

// Zu einem Termin: Raum-Infos und die eingestellte Veranstaltung (oder null, wenn es den Raum nicht mehr gibt)
function terminInfo(z, raeume, L) {
  const r = L.raum === null ? null : raumZu(raeume, L.raum);
  const g = r && gottesdienstRaeume(z, raeume).find(x => x.raum === r);
  if (L.raum === null && L.id.includes(':alt:')) {   // alter Spielstand: der erste Gottesdienstraum
    const g0 = gottesdienstRaeume(z, raeume)[0];
    return g0 ? { g: g0, p: g0.programm[0] } : null;
  }
  if (g && L.fest) return { g, p: festProgramm(z, g, L) };
  return g ? { g, p: g.programm[L.platz] } : null;
}
// Sonderevent: wie ein Eintrag im Programm des Raums, aber mit der im Fest-Menü gewählten Leitung
function festProgramm(z, g, L) {
  const plan = z.feste && z.feste.plaene[L.fest], v = VERANSTALTUNGEN.find(x => x.id === (plan ? plan.art : L.art)) || null;
  const leitung = plan ? g.imRaum.find(p => p.id === plan.leitung && daten(p).art === 'hauptamt') || null : null;
  const fehlt = !v || !plan ? 'keine' : !leitung ? 'leitung' : v.braucht.some(a => !moebelImRaum(z, g.raum, a).length) ? 'gitarre' : null;
  return { platz: 'fest', art: v ? v.id : null, tag: L.plan.tag, slot: L.plan.slot, veranstaltung: v, frei: true, leitung, fehlt, bereit: !fehlt };
}
// Wird dieser (normale) Termin von einem Sonderevent verdrängt? Gleiche Zeit und gleicher Raum oder dieselbe Leitung.
// → Schlüssel des Fests oder null
export function verdraengtVon(z, raeume, t) {
  if (t.fest) return null;
  for (const f of festPlaeneDerWoche(z, t.woche)) {
    if (f.tag !== t.plan.tag || f.plan.slot !== t.plan.slot || !raumZu(raeume, f.plan.raum)) continue;
    if (t.raum === f.plan.raum) return f.schluessel;
    const info = terminInfo(z, raeume, t);
    if (info && info.p.leitung && info.p.leitung.id === f.plan.leitung) return f.schluessel;
  }
  return null;
}

function anreise(z, raeume, zufall, termin) {
  const L = { id: termin.id, woche: termin.woche, raum: termin.raum, platz: termin.platz, art: termin.art, plan: { ...termin.plan },
    beginn: termin.beginn, phase: 'anreise', gaeste: null, start: z.minuten };
  if (termin.fest) L.fest = termin.fest;
  z.laeufe.push(L);
  z.termineErledigt.push(L.id);
  if (verdraengtVon(z, raeume, L)) return;   // fällt wegen eines Fests aus: niemand macht sich auf den Weg
  const info = terminInfo(z, raeume, L);
  if (info && info.p.bereit) gaesteAuslosen(z, raeume, zufall, L, info);
}

// Wer kommt, wer sitzt wo, wer muss wieder heim?
function gaesteAuslosen(z, raeume, zufall, L, info) {
  const sitze = sitzplaetze([info.g]).map(s => ({ x: s.x, y: s.y }));   // beste Plätze werden zuerst besetzt
  // Wer gerade bei einer anderen Veranstaltung ist (nicht schon auf dem Heimweg), kann nicht kommen.
  const woanders = new Set(z.laeufe.filter(x => x !== L && x.phase !== 'ende' && x.gaeste).flatMap(x => x.gaeste.map(g => g.id)));
  const anzahl = termineDerWoche(z, raeume, L.woche).filter(t => t.art).length || 1;
  const kommen = werKommt(z, zufall, { art: L.art, woche: L.woche, ausschluss: woanders, neuAnteil: 1 / anzahl, faktor: terminFaktoren(L).besucher });
  for (let i = kommen.length - 1; i > 0; i--) { const j = Math.floor(zufall() * (i + 1)); [kommen[i], kommen[j]] = [kommen[j], kommen[i]]; }
  const tuer = raumTuer(z, info.g.raum);
  L.ankunft = z.minuten;
  L.gaeste = kommen.map((b, i) => ({ id: b.id, name: b.vorname, voll: b.voll, sitz: i < sitze.length ? sitze[i] : null, tuer, kaffee: null }));
}
const NACHBARN = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Eine Tür des Raums (für die Heimgeschickten: bis dorthin und wieder zurück)
function raumTuer(z, raum) {
  for (const c of raum.zellen) {
    const x = c % z.w, y = (c / z.w) | 0;
    for (const [dx, dy] of NACHBARN) if (z.zellen[idx(z, x + dx, y + dy)] === 2) return { x: x + dx, y: y + dy };
  }
  return { x: raum.box.minX, y: raum.box.maxY };
}

function beginnen(z, raeume, zufall, L) {
  // Das Plakat hängt bis zur nächsten Veranstaltung (auch wenn sie ausfällt). Erst während der Anreise gekauft: bleibt bis zur nächsten.
  if (z.plakat && !(z.plakat.gekauft > L.start)) delete z.plakat;
  const fest = verdraengtVon(z, raeume, L);
  if (fest) {
    // Ein Sonderevent findet zur gleichen Zeit im selben Raum oder mit derselben Leitung statt: dieser Termin fällt aus
    // (ohne Abzug bei der Haltung – die Besucher können ja zum Fest kommen).
    Object.assign(L, { phase: 'ende', ausgefallen: true, grund: 'fest', wegenFest: fest, ende: z.minuten });
    return;
  }
  const info = terminInfo(z, raeume, L);
  if (!info || !info.p.bereit) {
    // Kein Hauptamtlicher im Raum, nichts eingestellt, Gitarre oder Kanzel/Altar fehlen: Die Veranstaltung fällt aus.
    for (const b of z.besucher) zufriedenheitAendern(b, AENDERUNG.ausfall);
    const grund = info ? info.p.fehlt : 'raum';
    Object.assign(L, { phase: 'ende', ausgefallen: true, grund, ende: z.minuten });
    z.letzterGottesdienst = { woche: L.woche, platz: L.platz, ausgefallen: true, grund, besucher: 0, heim: 0 };
    return;
  }
  if (!L.gaeste) gaesteAuslosen(z, raeume, zufall, L, info);   // Hauptamtlicher erst kurz vor Beginn gekommen
  L.phase = 'gottesdienst';
}

function gottesdienstEnde(z, raeume, L, zufall = Math.random) {
  const sitzend = L.gaeste.filter(g => g.sitz);
  // Kollekte: pro Besucher 1 € × Stuhl, × Altar, Grünpflanzen und Musik des Raums, × 2 am Sonntagvormittag,
  // × Kollekte-Faktor des Kirchenjahres (z. B. Heiligabend ×2); auf ganze Euro gerundet.
  // Dazu merkt sich jeder Gast, wie viel Haltung ihm Stuhl, Kanzel und Blumen bringen (wird am Ende gutgeschrieben).
  const liste = gottesdienstRaeume(z, raeume);
  let summeKollekte = 0;
  for (const g of sitzend) { const w = platzWirkung(z, raeume, g.sitz, liste); summeKollekte += w.kollekte; g.bonus = w.haltung; g.musikHaltung = w.musikHaltung; }
  // Lobpreisteam: Wer die Gitarre gespielt hat, bekommt etwas Musik-Erfahrung.
  const info = terminInfo(z, raeume, L);
  if (info && info.g.ausstattung.musik && info.g.spieler) musikErfahrungDazu(info.g.spieler);
  const betrag = Math.round(summeKollekte * zeitFaktor(L.plan) * terminFaktoren(L).kollekte);
  if (betrag > 0) buchen(z, 'einnahmen', 'kollekte', betrag, { veranstaltung: L.art || 'gottesdienst' });
  bekanntheitAendern(z, BEKANNTHEIT.proGottesdienst, 'gottesdienst');
  // Wer will Kaffee? Chance = Kaffee-Wert. Die stellen sich im Kirchkaffee an (ohne Kirchkaffee: kein Kaffee, −10 am Ende).
  const wollen = [];
  L.gaeste.forEach((g, i) => {
    g.kaffee = null;
    const b = g.sitz && z.besucher.find(x => x.id === g.id);
    if (b && zufall() < kaffeeVorliebe(b)) { g.kaffee = { ergebnis: null }; wollen.push({ g, i }); }
  });
  if (!gottesdienstKunden(z, raeume, L, wollen)) for (const { g } of wollen) g.kaffee.ergebnis = 'keinPlatz';
  L.phase = 'kirchkaffee';
}

// Haltung für die Veranstaltung selbst: Gottesdienst fest, Lobpreisgottesdienst nach Lobpreis-Vorliebe
function haltungFuer(art, b) {
  const v = VERANSTALTUNGEN.find(x => x.id === art);
  return v && v.haltungNachVorliebe ? Math.round(lobpreisVorliebe(b) * v.haltungNachVorliebe) : AENDERUNG.gottesdienst;
}

function abschliessen(z, raeume, zufall = Math.random, L) {
  const anwesend = [];
  for (const g of L.gaeste) {
    const b = z.besucher.find(x => x.id === g.id);
    if (!b) continue;
    if (!g.sitz) { zufriedenheitAendern(b, AENDERUNG.heimgeschickt); continue; }
    anwesend.push(b); b.besuche++; b.zuletzt = L.woche; b.besuchtWoche = L.woche;
    // bonus: Stuhl, Kanzel, Blumen; Lobpreisteam: + musikHaltung (z. B. 5 %) der aktuellen Haltung
    const musik = Math.round(b.zufriedenheit * (g.musikHaltung || 0));
    zufriedenheitAendern(b, AENDERUNG.sitzplatz + haltungFuer(L.art, b) + (g.bonus || 0) + musik);
    if (g.kaffee && g.kaffee.ergebnis === 'keinPlatz') zufriedenheitAendern(b, AENDERUNG.kaffeeNein);   // sonst: beim Bedienen (kirchkaffee.js)
    g.zufriedenheit = b.zufriedenheit;
  }
  const sehr = anwesend.filter(b => b.zufriedenheit >= BEKANNTHEIT.sehrZufrieden).length;
  bekanntheitAendern(z, sehr * BEKANNTHEIT.proSehrZufriedenem, 'zufrieden', sehr);
  const neueEA = ehrenamtWerden(z, anwesend, zufall).map(b =>
    personHinzufuegen(z, { name: b.voll, kuerzel: b.vorname[0], art: 'ehrenamt', ausbildung: null, skill: null, charakter: null,
      herkunft: { besuche: b.besuche, zufriedenheit: b.zufriedenheit, kaffee: kaffeeVorliebe(b), zuletzt: b.zuletzt } }));
  Object.assign(L, { phase: 'ende', ende: z.minuten, neueEhrenamtliche: neueEA.map(p => p.daten.name) });
  z.letzterGottesdienst = { woche: L.woche, platz: L.platz, ausgefallen: false, besucher: anwesend.length, heim: L.gaeste.filter(g => !g.sitz).length };
}

// ---- Prognose für eine Veranstaltung (erwartete Werte = Summe der Einzelchancen) ----
// raumNr/platz: welche Veranstaltung; ohne Angabe Veranstaltung 1 im ersten Gottesdienstraum.
export function prognose(z, raeume, raumNr = null, platz = 0) {
  const alle = gottesdienstRaeume(z, raeume);
  const g = raumNr === null ? alle[0] : alle.find(x => x.raum.nr === raumNr);
  const p = g ? g.programm[platz] : null, art = p ? p.art : null;
  const plan = p ? { tag: p.tag, slot: p.slot } : STANDARD_PLAN, faktor = zeitFaktor(plan);
  const termin = g && dieserTermin(z, raeume, g.raum, platz);
  const woche = termin ? termin.woche : zeitpunkt(z.minuten).woche;
  const bereit = !!(p && p.bereit), plaetze = g ? g.stuehle.length : 0;
  const plakat = !!z.plakat;
  // Neugierige vom Tor kommen zur nächsten Veranstaltung; neue Besucher über die Bekanntheit verteilen sich auf die Termine der Woche
  const naechster = naechsterTermin(z, raeume), istNaechster = !!(termin && naechster && naechster.id === termin.id);
  const neugierige = (istNaechster || !termin) && z.ort ? z.ort.leute.filter(p => p.neugierig) : [];
  const anzahl = termineDerWoche(z, raeume, woche).filter(t => t.art).length || 1;
  // ... aber höchstens so viele, wie es im Ort und im Einzugsgebiet noch gibt
  const moeglich = (z.ort ? z.ort.leute.filter(p => !p.neugierig).length : 0) + platzImGebiet(z);
  // Kirchenjahr: Fest an dem Tag oder Zeit (z. B. Adventszeit) – Besucher und Kollekte × Faktor
  const kj = terminFaktoren({ woche, plan });
  const neu = Math.min(z.bekanntheit / BEKANNTHEIT.teiler / anzahl * kj.besucher, moeglich);
  const chance = b => besuchChance(b, { art, woche, faktor: kj.besucher });
  const erwartet = z.besucher.reduce((s, b) => s + chance(b), 0) + neu + neugierige.length * NEUGIER.kommChance;
  const anteil = erwartet ? Math.min(1, plaetze / erwartet) : 0, sitzend = erwartet * anteil;
  // Fällt der Termin wegen eines geplanten Sonderevents aus?
  const wegenFest = g && verdraengtVon(z, raeume, { woche, plan, raum: raumSchluessel(g.raum), platz });
  const kirchenjahr = { besucher: kj.besucher, kollekte: kj.kollekte, fest: kj.fest, zeit: kj.zeit,
    festName: kj.fest ? FESTE.find(f => f.id === kj.fest).name : null, zeitName: (ZEITEN.find(t => t.id === kj.zeit) || {}).name || null };
  const grund = { bereit: bereit && !wegenFest, erwartet, plaetze, plakat, sonntagvormittag: faktor > 1, fehlt: wegenFest ? 'fest' : p ? p.fehlt : 'raum',
    kirchenjahr, wegenFest: wegenFest ? festAusSchluessel(wegenFest).fest.name : null };
  if (wegenFest) return { ...grund, sitzend: 0, geld: 0, kollekte: 0, ehrenamt: 0, tassen: 0 };
  if (!bereit) return { ...grund, sitzend: 0, geld: 0, kollekte: 0, ehrenamt: 0, tassen: 0 };
  // Erwartete Kollekte: die erwarteten Besucher sitzen auf den besten Plätzen des Raums
  const sitze = sitzplaetze([g]);
  let kollekteSumme = 0;
  for (let i = 0, rest = Math.min(sitzend, sitze.length); rest > 0; i++, rest--) kollekteSumme += sitze[i].wert * Math.min(1, rest);
  kollekteSumme *= faktor * kj.kollekte;
  // Kaffee: erwartete Gäste × Kaffee-Wert (neue im Schnitt 50 %); höchstens so viele Tassen, wie in die Maschinen passen
  // (die Ehrenamtlichen füllen sie auf, wenn das Kirchkaffee zu hat)
  const kaffeeWunsch = (z.besucher.reduce((s, b) => s + chance(b) * kaffeeVorliebe(b), 0) + neu * 0.5
    + neugierige.reduce((s, p) => s + kaffeeVorliebe(p), 0) * NEUGIER.kommChance) * anteil;
  const stationen = kirchkaffeeZustand(z, raeume).flatMap(k => k.stationen);
  const tassen = Math.min(kaffeeWunsch, stationen.length * fassung('kaffeemaschine'));
  const ehrenamt = z.besucher.filter(b => b.besuche + 1 >= EHRENAMT_AB_BESUCHEN).reduce((s, b) => s + chance(b) * anteil * EHRENAMT_QUOTE, 0);
  return { ...grund, sitzend, geld: kollekteSumme + tassen * PREIS_TASSE, kollekte: kollekteSumme, ehrenamt, tassen };
}
// Der anstehende (oder gerade in der Anreise befindliche) Termin dieser Veranstaltung, sonst null
function dieserTermin(z, raeume, raum, platz) {
  const w = zeitpunkt(z.minuten).woche, key = raumSchluessel(raum), id = woche => `${woche}:${key}:${platz}`;
  const anreise = (z.laeufe || []).find(L => L.phase === 'anreise' && L.raum === key && L.platz === platz);
  if (anreise) return { id: anreise.id, woche: anreise.woche };
  const erledigt = new Set(z.termineErledigt || []);
  for (const woche of [w, w + 1]) {
    if (woche <= z.letzterLauf) continue;
    const t = termineDerWoche(z, raeume, woche).find(t => t.id === id(woche));
    if (t && z.minuten < t.beginn && !erledigt.has(t.id)) return t;
  }
  return null;
}
// Steht diese Veranstaltung diese Woche noch aus? (sonst zeigt die Prognose die nächste Woche)
export function terminDieseWoche(z, raeume, raum = null, platz = 0) {
  const g = raum || (gottesdienstRaeume(z, raeume)[0] || {}).raum;
  if (!g) return false;
  const t = dieserTermin(z, raeume, g, platz);
  return !!t && t.woche === zeitpunkt(z.minuten).woche;
}
// Seitenleiste: was diese Woche schon gebucht ist plus die Prognosen der Veranstaltungen, die diese Woche noch ausstehen.
export function finanzPrognose(z, raeume) {
  let offen = 0;
  for (const g of gottesdienstRaeume(z, raeume)) g.programm.forEach((p, i) => {
    if ((i === 0 || p.art) && terminDieseWoche(z, raeume, g.raum, i)) offen += prognose(z, raeume, g.raum.nr, i).geld;
  });
  return { einnahmen: Math.round(summe(z.wochenbuch.einnahmen) + offen), ausgaben: summe(z.wochenbuch.ausgaben) };
}

// Wann öffnet dieses Kirchkaffee als Nächstes? Nächste eigene Schicht oder Ende des nächsten Gottesdienstes (Minuten oder null)
export function naechsteKaffeeOeffnung(z, raeume, raum) {
  const t = z.minuten, w = zeitpunkt(t).woche, werte = [];
  const s = naechsteSchicht(z, raum, t);
  if (s !== null) werte.push(s);
  for (const L of z.laeufe || []) if ((L.phase === 'anreise' || L.phase === 'gottesdienst') && !L.ausgefallen) werte.push(L.beginn + DAUER.gottesdienst);
  const erledigt = new Set(z.termineErledigt || []);
  for (const woche of [w, w + 1]) for (const termin of termineDerWoche(z, raeume, woche))
    if (termin.art && termin.beginn > t && !erledigt.has(termin.id)) werte.push(termin.beginn + DAUER.gottesdienst);
  return werte.length ? Math.min(...werte) : null;
}
