// Ablauf in Echtzeit: Die Uhr läuft, und jede Woche finden die Veranstaltungen der Räume (Veranstaltung 1, 2, …)
// zu ihren Zeiten statt, danach jeweils das Kirchkaffee. Kennt keine Grafik – die Oberfläche zeigt nur an, was hier entschieden wird.
// Mehrere Abläufe können gleichzeitig laufen (z. B. Heimweg vom Vormittag, während die Besucher für den Nachmittag kommen): z.laeufe.
//
// Ablauf eines Termins (Zeiten in Spielminuten):
//   Beginn − 180 Anreise: Es wird ausgelost, wer kommt; die Besucher laufen los.
//   Beginn       Veranstaltung beginnt – nur, wenn ein Hauptamtlicher im Raum ist (und was sie sonst braucht). Sonst fällt sie aus.
//   Beginn + 60  Gottesdienst zu Ende: Kollekte (Stuhl, Altar, Grünpflanzen, Musik), Bekanntheit; wer Kaffee will
//                (Chance = Kaffee-Wert), stellt sich im Kirchkaffee an (Bedienung: kirchkaffee.js).
//                Wer keinen Kaffee will (oder keinen Platz in der Schlange bekommt), geht gleich nach dem Gottesdienst heim.
//   Beginn + 180 Ende des Kirchkaffees (2 Stunden): Zufriedenheit ändert sich, manche werden Ehrenamtliche.
//                Wer noch beim Kaffee ansteht, wird fertig bedient und geht danach.
import { VERANSTALTUNGEN, SONNTAG, PLAETZE, ZWEITER_PLATZ_STANDARD, DRITTER_PLATZ_STANDARD, SPONTANE_SPENDE } from '../inhalte/veranstaltungen.js';
import { DAUER, ANREISE_VORLAUF, SLOTS, STANDARD_PLAN, HEIMWEG, WOCHENBERICHT } from '../inhalte/zeit.js';
import { AENDERUNG, BEKANNTHEIT, EHRENAMT_AB_BESUCHEN, EHRENAMT_QUOTE, EHRENAMT } from '../inhalte/besucher.js';
import { KOLLEKTE_PRO_BESUCHER } from '../inhalte/finanzen.js';
import { PREIS_TASSE } from '../inhalte/kirchkaffee.js';
import { idx, erkenneRaeume, raumTypVon, pruefeRaum } from './karte.js';
import { imDurchgang } from './durchgang.js';
import { moebelImRaum, moebelBei, raumAusstattung, stuhlStufe, instrumenteImRaum, hindernisBei } from './moebel.js';
import { musikLevel, musikBonus, musikErfahrungDazu, mitMultiplikator, multiplikatorErfahrung, hatSkill } from './skills.js';
import { buchen, summe, wocheWechseln } from './finanzen.js';
import { platzImGebiet } from './einzugsgebiet.js';
import { einladungPasst, werKommt, kommChance, besuchChance, artFaktor, lobpreisVorliebe, kaffeeVorliebe, musikWirkung, zufriedenheitAendern, bekanntheitAendern, ehrenamtWerden, ehrenamtFrei, ehrenamtFaellig, ehrenamtGemerkt, beduerfnisErfuellt, besuchMerken, levelVon } from './besucher.js';
import { beduerfnisSchritt } from './beduerfnisse.js';
import { eingesetztIn, personHinzufuegen, daten } from './personen.js';
import { zeitpunkt, slotBeginn, WOCHE_MIN } from './zeit.js';
import { NEUGIER } from '../inhalte/ort.js';
import { SEELSORGE } from '../inhalte/seelsorge.js';
import { ortSchritt } from './ort.js';
import { seelsorgeSchritt, anfrageOffen } from './seelsorge.js';
import { kirchkaffeeZustand, kirchkaffeeOffen, gottesdienstKunden, kaffeeAktualisieren, kaffeeSchritt, naechsteSchicht, kaffeeAnlegen, zahlZeigen, amTisch } from './kirchkaffee.js';
import { fassung } from './moebel.js';
import { dauerspenderSchritt } from './dauerspender.js';
import { mitgliederSchritt, mitgliedWerden } from './mitglieder.js';
import { wochenberichtSchritt, wochenberichtOffen } from './wochenbericht.js';
import { forschungSchritt, heiligkeitFuerGottesdienst, istErforscht } from './forschung.js';
import { faktorAmTag } from './kalender.js';
import { berichtDazu, berichtAblegen, berichteAufraeumen } from './berichte.js';
import { FESTE, ZEITEN } from '../inhalte/kirchenjahr.js';
import { festSchritt, festPlaeneDerWoche, festeAufraeumen, festAusSchluessel } from './feste.js';
import { festAktiv, konfiTeilnahme, konfirmieren, istJugend } from './konfi.js';
import { foyers, foyerBonus } from './foyer.js';
import { strasse } from './bewegung.js';
import { evangelisationSchritt } from './evangelisation.js';
import { gaengeBeimAnreisen, gaengeBeimHeimgehen, gaengeAbsagen, unfallSchritt } from './toiletten.js';
import { ERSTER_GOTTESDIENST } from '../inhalte/besucher.js';
import { ersterAnlegen, ersterOffen, zeitungOffen, zeitungSchritt, zusatzLeute, ehrenamtSicher } from './erster.js';
import { automatenBeimAnreisen, automatenBeimHeimgehen, automatenSchritt } from './automaten.js';
import { dienstAnlegen, dienstMerken, dienstVergessen, dienstAktualisieren, dienstSchritt, veranstaltungDienst, begruessungDienst, kaffeeNachBesetzt, naechsteKaffeeSchicht, besuchendeEhrenamtliche } from './dienst.js';
export { kirchkaffeeZustand, kirchkaffeeOffen };

// Kollekte-Faktor für den Termin: am Sonntag doppelt, egal ob vormittags, nachmittags oder abends (Lukas, 26.11.)
export function zeitFaktor(plan) { return plan && plan.tag === SONNTAG.tag ? SONNTAG.kollekte : 1; }
// Faktoren des Kirchenjahres für einen Termin (Fest an dem Tag oder Zeit im Kirchenjahr): { besucher, kollekte, fest, zeit }
// Mit Spielstand z: die Konfirmation zählt nur, wenn es Konfirmanden gibt (konfi.js).
export function terminFaktoren(t, z = null) { return faktorAmTag(t.woche * 7 + t.plan.tag, z ? f => festAktiv(z, f) : undefined); }
// Zählt dieser Termin beim Verteilen der neuen Besucher der Woche mit? (Konfirmandenunterricht: nein)
const zaehltFuerNeue = art => { const v = VERANSTALTUNGEN.find(x => x.id === art); return !!art && !(v && v.neueBesucher === false); };
// Ist dieser Termin der Konfirmations-Gottesdienst (Sonderevent)?
const istKonfirmation = L => !!(L.fest && (festAusSchluessel(L.fest) || {}).fest && festAusSchluessel(L.fest).fest.id === 'konfirmation');
// Dauer einer Veranstaltung in Spielminuten (Spielenachmittag: 2 Stunden, sonst 1 Stunde)
export const dauerVon = art => { const v = VERANSTALTUNGEN.find(x => x.id === art); return (v && v.dauer) || DAUER.gottesdienst; };
// Spielenachmittag (Lukas, 25.11.): nur Stühle direkt an einem Tisch sind Plätze (bis zu 4 je Tisch, an jeder Seite einer)
// Die Kaffee-Vorliebe ist gleichmäßig zwischen 0 und 100 % verteilt (kaffeeVorliebe in besucher.js) – neue Besucher
// zählen in der Prognose deshalb mit dem Durchschnitt. Keine Stellschraube, sondern folgt aus der Verteilung.
const VORLIEBE_SCHNITT = 0.5;
export const stuehleAmTisch = (z, stuehle) => stuehle.filter(s => amTisch(z, s));
// Darf die Veranstaltung zu diesem Slot stattfinden? (Spielenachmittag: nur nachmittags oder abends)
export const slotErlaubt = (art, slot) => { const v = VERANSTALTUNGEN.find(x => x.id === art); return !v || !v.slots || v.slots.includes(slot); };

// ---- Veranstaltungen in Räumen ----
// Jeder Raum hat eine Liste: Platz 0 = „Veranstaltung 1“, Platz 1 = „Veranstaltung 2“ – je { art, tag, slot }.
// Gespeichert in z.veranstaltung, für jedes Kästchen des Raums dieselbe Liste (so übersteht sie Umbauten wie bisher).
// Alte Spielstände hatten dort nur die Art (Text) und einen Termin für alle (z.plan) – das wird hier umgestellt.
export function moeglicheVeranstaltungen(typ) { return typ ? VERANSTALTUNGEN.filter(v => v.raumtypen.includes(typ.id)) : []; }
// Plätze für Veranstaltungen: eigene des Raumtyps (z. B. Gemeindesaal: 2 frei) oder die des Gottesdienstraums
export function plaetzeVon(typ) { return (typ && typ.plaetze) || PLAETZE; }
// Ist dieser Platz frei? → null (ja) | 'moebel' (z. B. Kanzel/Altar fehlen) | 'forschung' (Forschung noch nicht fertig, 26.11.)
export function platzSperre(z, raum, i) {
  const pl = plaetzeVon(raum.typ)[i];
  if (!pl) return 'moebel';
  if (pl.forschung && !istErforscht(z, pl.forschung)) return 'forschung';
  return pl.braucht.every(a => moebelImRaum(z, raum, a).length > 0) ? null : 'moebel';
}
// Findet nach dieser Veranstaltung ein Kirchkaffee statt? (Gemeindesaal: nein)
export const mitKirchkaffee = art => { const v = VERANSTALTUNGEN.find(x => x.id === art); return !v || v.kirchkaffee !== false; };
const standardPlatz = i => ({ art: null, ...(i === 0 ? STANDARD_PLAN : i === 1 ? ZWEITER_PLATZ_STANDARD : DRITTER_PLATZ_STANDARD) });
export function programmVon(z, raum) {
  const roh = z.veranstaltung && z.veranstaltung[raum.zellen[0]];
  const liste = Array.isArray(roh) ? roh : typeof roh === 'string' ? [{ art: roh, ...(z.plan || STANDARD_PLAN) }] : [];
  return plaetzeVon(raum.typ).map((_, i) => {
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
  // Passt die eingestellte Zeit nicht zur Veranstaltung (Spielenachmittag am Vormittag), auf den ersten freien erlaubten Slot setzen
  const v = id && VERANSTALTUNGEN.find(x => x.id === id), e = liste[platz];
  if (v && v.slots && !v.slots.includes(e.slot)) {
    const frei = v.slots.find(sl => !liste.some((x, i) => i !== platz && x.art && x.tag === e.tag && x.slot === sl));
    if (frei) e.slot = frei;
  }
  programmSchreiben(z, raum, liste);
}
// Zeit einer Veranstaltung einstellen → 'ok' | 'belegt' (im selben Raum ist zu der Zeit schon eine) | 'zeit'
export function terminEinstellen(z, raum, platz, tag, slot) {
  if (!(tag >= 0 && tag <= 6) || !SLOTS.some(s => s.id === slot)) return 'zeit';
  const liste = programmVon(z, raum);
  if (!liste[platz]) return 'zeit';
  if (liste[platz].art && !slotErlaubt(liste[platz].art, slot)) return 'zeit';
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
    // Ehrenamtliche im Raum, die dort eingesetzt sind (das geht nur, wenn mindestens ein Instrument im Raum steht)
    // Pro Instrument spielt ein Ehrenamtlicher. Sind es mehr Ehrenamtliche als Instrumente, spielen die mit dem höchsten Musik-Level.
    const spielerAus = liste => liste.map((p, i) => ({ p, i })).sort((a, b) => musikLevel(b.p) - musikLevel(a.p) || a.i - b.i)
      .slice(0, instrumenteImRaum(z, r)).map(x => x.p);
    // Ehrenamtliche der Veranstaltung: bisher wer im Raum steht (das geht nur, wenn mindestens ein Instrument im Raum steht);
    // im Schichtbetrieb (27.11.) wer im Dienstplan für diese Veranstaltung eingeteilt ist – egal, wo er gerade ist.
    const vorOrt = imRaum.filter(p => daten(p).art === 'ehrenamt' && eingesetztIn(z, raeume, p) === r), spielerVorOrt = spielerAus(vorOrt);
    // Hauptamtliche (27.11.): im Schichtbetrieb wer im Dienstplan als Leitung eingeteilt ist, sonst wer im Raum steht
    const ehrenamtFuer = i => {
      if (!z.schichtbetrieb) return { ehrenamtliche: vorOrt, spieler: spielerVorOrt, haupt: hauptamt };
      const d = veranstaltungDienst(z, raeume, r, i);
      return { ehrenamtliche: d.alle, spieler: spielerAus(d.musik), haupt: d.hauptamt };
    };
    const programm = programmVon(z, r).map((e, i) => {
      const v = VERANSTALTUNGEN.find(x => x.id === e.art) || null, sperre = platzSperre(z, r, i), frei = !sperre;
      const { ehrenamtliche, spieler, haupt } = ehrenamtFuer(i);
      const pruefung = v ? voraussetzungen(z, r, v, haupt, ehrenamtliche, spieler) : { leitung: null, fehlt: null };
      const fehlt = !v ? 'keine' : !frei ? 'gesperrt' : pruefung.fehlt;
      return { platz: i, art: e.art, tag: e.tag, slot: e.slot, veranstaltung: v, frei, sperre, leitung: pruefung.leitung, fehlt, bereit: !fehlt,
        musikBonus: pruefung.musikBonus || 0, ehrenamtBonus: v ? ehrenamtBonus(v, ehrenamtliche) : 0,
        dienst: { ehrenamtliche, spieler, musiker: spieler, ausstattung: raumAusstattung(z, r, spieler.map(musikLevel)), hauptamt: haupt, leitung: haupt[0] || null } };
    });
    // Für den Raum als Ganzes (Raum-Fenster, Übersichten) gelten die Ehrenamtlichen von Veranstaltung 1
    const d0 = programm[0].dienst;
    return { raum: r, typ: r.typ, programm, veranstaltung: programm[0].veranstaltung, stuehle: moebelImRaum(z, r, 'stuhl'), imRaum, hauptamt: d0.hauptamt, ehrenamtliche: d0.ehrenamtliche,
      leitung: d0.leitung, musiker: d0.musiker, spieler: d0.spieler, ausstattung: d0.ausstattung, bereit: programm.some(p => p.bereit) };
  });
}
// Raum-Eintrag mit den Ehrenamtlichen genau dieser Veranstaltung (Musiker, Ausstattung mit Lobpreisteam …)
export const mitDienst = (g, p) => p && p.dienst ? { ...g, ...p.dienst } : g;
// Kann diese Veranstaltung im Raum stattfinden? → { leitung, fehlt, musikBonus }
// fehlt: null | 'leitung' (Hauptamtlicher fehlt) | 'ehrenamt' (Ehrenamtlicher fehlt) | 'musikLevel' (kein Ehrenamtlicher mit genug
// Musik-Level) | Kennung des fehlenden Möbels (z. B. 'gitarre', 'tisch', 'klavier') | 'stuehle' (zu wenige Stühle)
// | 'musiker' (Jugendgottesdienst: zu wenige Ehrenamtliche spielen ein Instrument)
// | 'gitarrist' (Lobpreisgottesdienst: kein Ehrenamtlicher spielt die Gitarre)
// leitung: wer die Veranstaltung leitet (der erste der verlangten Mitarbeiter, z. B. der Hauptamtliche beim Seniorennachmittag).
// hauptamt: Hauptamtliche dieser Veranstaltung (im Raum bzw. im Schichtbetrieb laut Dienstplan)
function voraussetzungen(z, r, v, hauptamt, ehrenamtliche, spieler = []) {
  let leitung = null, musik = 0;
  if (v.leitungOder) {   // Spielenachmittag: ein Hauptamtlicher ODER ein (eingesetzter) Ehrenamtlicher reicht
    leitung = hauptamt[0] || ehrenamtliche[0] || null;
    if (!leitung) return { leitung: null, fehlt: 'mitarbeiter' };
  } else for (const art of [].concat(v.leitung)) {
    let kandidaten = art === 'ehrenamt' ? ehrenamtliche : art === 'hauptamt' ? hauptamt : [];
    if (art === 'ehrenamt' && v.musikLevelMin) {
      kandidaten = kandidaten.filter(p => musikLevel(p) >= v.musikLevelMin).sort((a, b) => musikLevel(b) - musikLevel(a));
      if (!kandidaten.length) return { leitung: null, fehlt: ehrenamtliche.length ? 'musikLevel' : 'ehrenamt' };
      musik = musikBonus(musikLevel(kandidaten[0]));
    }
    if (!kandidaten.length) return { leitung: null, fehlt: art === 'ehrenamt' ? 'ehrenamt' : 'leitung' };
    leitung = leitung || kandidaten[0];
  }
  const fehltMoebel = v.braucht.find(a => !moebelImRaum(z, r, a).length);
  if (fehltMoebel) return { leitung, fehlt: fehltMoebel };
  if (v.gitarrist && !spieler.length) return { leitung, fehlt: 'gitarrist' };   // Lobpreisgottesdienst: einer spielt die Gitarre (27.11.)
  if (v.musikerMin && spieler.length < v.musikerMin) return { leitung, fehlt: 'musiker' };   // Jugendgottesdienst: mind. 2 an Instrumenten
  if (v.amTisch && stuehleAmTisch(z, moebelImRaum(z, r, 'stuhl')).length < v.stuehleMin) return { leitung, fehlt: 'stuehleTisch' };
  if (!v.amTisch && v.stuehleMin && moebelImRaum(z, r, 'stuhl').length < v.stuehleMin) return { leitung, fehlt: 'stuehle' };
  return { leitung, fehlt: null, musikBonus: v.haltungNachMusik ? musik : 0 };
}
// Konfirmandenunterricht (Lukas, 25.11.): jeder eingesetzte Ehrenamtliche + haltungJeEhrenamt, höchstens ehrenamtMax zählen
export function ehrenamtBonus(v, ehrenamtliche) {
  return v.haltungJeEhrenamt ? Math.min(v.ehrenamtMax || Infinity, ehrenamtliche.length) * v.haltungJeEhrenamt : 0;
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
  let pflicht = false;
  for (const r of raeume.liste.filter(r => r.typ && moeglicheVeranstaltungen(r.typ).length)) {
    const key = raumSchluessel(r);
    programmVon(z, r).forEach((e, i) => {
      if ((i > 0 || !r.typ.ersterTerminPflicht) && !e.art) return;   // Gemeindesaal: nur eingestellte Veranstaltungen sind Termine
      if (i === 0 && r.typ.ersterTerminPflicht) pflicht = true;
      t.push({ id: `${woche}:${key}:${i}`, woche, raum: key, platz: i, art: e.art, plan: { tag: e.tag, slot: e.slot }, beginn: slotBeginn(e, woche) });
    });
  }
  // Sonderevents (Fest-Menü): eigener Termin im gewählten Raum
  for (const f of festPlaeneDerWoche(z, woche)) {
    if (!raumZu(raeume, f.plan.raum)) continue;   // Raum gibt es nicht mehr: das Fest findet nicht statt
    const plan = { tag: f.tag, slot: f.plan.slot };
    t.push({ id: `${woche}:fest:${f.schluessel}`, woche, raum: f.plan.raum, platz: 'fest', fest: f.schluessel, art: f.plan.art, plan, beginn: slotBeginn(plan, woche) });
  }
  if (!pflicht && !t.some(x => x.fest)) t.push({ id: `${woche}:-:0`, woche, raum: null, platz: 0, art: null, plan: { ...STANDARD_PLAN }, beginn: slotBeginn(STANDARD_PLAN, woche) });
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
// Der nächste normale Gottesdienst (Art „Gottesdienst“, kein Sonderevent, nicht von einem Fest verdrängt) – für den ersten Gottesdienst
export function naechsterGottesdienst(z, raeume = raeumeVon(z)) {
  const w = zeitpunkt(z.minuten).woche, laufend = new Set((z.laeufe || []).map(L => L.id)), erledigt = new Set(z.termineErledigt || []);
  for (const woche of [w, w + 1]) {
    if (woche <= z.letzterLauf) continue;
    for (const t of termineDerWoche(z, raeume, woche))
      if (t.art === 'gottesdienst' && !t.fest && z.minuten < t.beginn && !laufend.has(t.id) && !erledigt.has(t.id) && !verdraengtVon(z, raeume, t)) return t;
  }
  return null;
}
// Ist dieser Termin der erste Gottesdienst? (nur einer gleichzeitig, falls zwei Räume zur selben Zeit einen haben)
const istErster = (z, L) => L.art === 'gottesdienst' && !L.fest && ersterOffen(z) && !z.laeufe.some(x => x !== L && x.erster && !x.ausgefallen && x.phase !== 'ende');

// Anzeige oben: läuft gerade eine Veranstaltung (oder ein Fest)? Sonst die nächste mit Name und Minuten bis zum Beginn.
// Zählt nur Termine mit eingestellter Art, die nicht von einem Fest verdrängt werden. Kirchkaffee-Schichten zählen nicht.
export function naechstesEvent(z, raeume = raeumeVon(z)) {
  const name = t => t.fest ? ((festAusSchluessel(t.fest) || {}).fest || {}).name : (VERANSTALTUNGEN.find(v => v.id === t.art) || {}).name;
  const laeuft = (z.laeufe || []).find(L => L.phase === 'gottesdienst' && !L.ausgefallen);
  if (laeuft) return { laeuft: true, name: name(laeuft) || null };
  const w = zeitpunkt(z.minuten).woche, laufend = new Set((z.laeufe || []).map(L => L.id)), erledigt = new Set(z.termineErledigt || []);
  for (const woche of [w, w + 1, w + 2]) {
    if (woche <= z.letzterLauf) continue;
    for (const t of termineDerWoche(z, raeume, woche)) {
      if (!t.art || z.minuten >= t.beginn || laufend.has(t.id) || erledigt.has(t.id) || verdraengtVon(z, raeume, t)) continue;
      const n = name(t);
      if (n) return { laeuft: false, name: n, minuten: t.beginn - z.minuten };
    }
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

// Wochenzusammenfassung offen (27.11.): Zeit steht, bis sie geschlossen ist (in Tests abschaltbar, siehe WOCHENBERICHT.pause)
export const berichtPause = z => WOCHENBERICHT.pause && wochenberichtOffen(z);

// ---- Zeit vorrücken ----
// Prüft, welcher Schritt als Nächstes ansteht (Veranstaltungen, Passanten im Ort, Seelsorge-Anfrage),
// und führt alle Schritte bis zur Zielzeit aus. Kommt eine Seelsorge-Anfrage, bleibt die Zeit genau dort stehen.
// Leistung (27.11.): Ein Aufruf ist ein Durchgang (durchgang.js) – solange die Zeit läuft, wird nicht gebaut.
export function zeitVorruecken(z, raeume, minuten, zufall = Math.random) { imDurchgang(() => zeitVorrueckenInnen(z, raeume, minuten, zufall)); }
function zeitVorrueckenInnen(z, raeume, minuten, zufall) {
  ablaufAnlegen(z); kaffeeAnlegen(z); ersterAnlegen(z); dienstAnlegen(z);
  if (anfrageOffen(z) || zeitungOffen(z) || berichtPause(z)) return;
  dienstMerken(z, raeume);   // Dienstplan-Termine für diesen Durchgang nur einmal ausrechnen
  try {
  const ziel = z.minuten + minuten, gesperrt = zz => seelsorgeGesperrt(zz, raeume);
  // Dienstplan (27.11.): vor jedem Schritt kommen bzw. gehen die Ehrenamtlichen, deren Schicht gerade beginnt bzw. endet
  const aktuell = () => { dienstAktualisieren(z, raeume); kaffeeAktualisieren(z, raeume, zufall); };
  aktuell();
  for (let sicherung = 0; sicherung < 20000; sicherung++) {
    wochenbuchPruefen(z);
    let s = null;
    for (const k of [naechsterSchritt(z, raeume), dienstSchritt(z, raeume), ortSchritt(z, zufall), seelsorgeSchritt(z, gesperrt, zufall, raeume), kaffeeSchritt(z, raeume), festSchritt(z), beduerfnisSchritt(z), mitgliederSchritt(z, zufall), dauerspenderSchritt(z, zufall), wochenberichtSchritt(z), forschungSchritt(z), evangelisationSchritt(z), zeitungSchritt(z, naechsterGottesdienst(z, raeume)), automatenSchritt(z), unfallSchritt(z)])
      if (k && (!s || k.zeit < s.zeit)) s = k;
    if (!s || s.zeit > ziel) break;
    z.minuten = Math.max(z.minuten, s.zeit);
    if (z.schichtbetrieb) dienstAktualisieren(z, raeume);   // z. B. Kirchkaffee-Schicht beginnt genau am Ende des Gottesdienstes
    s.tun(z, raeume, zufall);
    aktuell();   // z. B. nach dem Gottesdienst: Kaffeegäste stellen sich an
    if (anfrageOffen(z) || zeitungOffen(z) || berichtPause(z)) { wochenbuchPruefen(z); return; }   // Seelsorge-Anfrage / Zeitung / Wochenzusammenfassung: Zeit steht genau hier
  }
  z.minuten = ziel;
  aktuell();
  wochenbuchPruefen(z);
  } finally { dienstVergessen(); }
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
  return !!(info && info.p.leitung && hatSkill(info.p.leitung, 'seelsorge'));
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
  berichteAufraeumen(z, w);   // Berichte der Veranstaltungen: diese und vorherige Woche
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
  if (L.phase === 'gottesdienst') return { zeit: L.beginn + dauerVon(L.art), tun: (z, r, zf) => gottesdienstEnde(z, r, L, zf) };
  if (L.phase === 'kirchkaffee') return { zeit: ende, tun: (z, r, zf) => abschliessen(z, r, zf, L) };
  if (L.phase === 'ende') return { zeit: Math.max(L.ende + HEIMWEG, L.wcBis || 0), tun: z => { z.laeufe = z.laeufe.filter(x => x !== L); } };
  return null;
}

// Zu einem Termin: Raum-Infos und die eingestellte Veranstaltung (oder null, wenn es den Raum nicht mehr gibt)
export function terminInfo(z, raeume, L) {
  const r = L.raum === null ? null : raumZu(raeume, L.raum);
  const g = r && gottesdienstRaeume(z, raeume).find(x => x.raum === r);
  if (L.raum === null && L.id.includes(':alt:')) {   // alter Spielstand: der erste Gottesdienstraum
    const g0 = gottesdienstRaeume(z, raeume)[0];
    return g0 ? { g: g0, p: g0.programm[0] } : null;
  }
  if (g && L.fest) {
    // Sonderevent: es spielen die Ehrenamtlichen, die zu dieser Zeit im selben Raum eingeteilt sind (sonst niemand)
    const gleich = g.programm.find(e => e.art && e.tag === L.plan.tag && e.slot === L.plan.slot);
    const ohne = z.schichtbetrieb ? { ehrenamtliche: [], spieler: [], musiker: [], ausstattung: raumAusstattung(z, g.raum, []) } : null;
    return { g: gleich ? mitDienst(g, gleich) : ohne ? { ...g, ...ohne } : g, p: festProgramm(z, g, L) };
  }
  return g ? { g: mitDienst(g, g.programm[L.platz]), p: g.programm[L.platz] } : null;
}
// Gemeindekalender (Lukas, 26.11.): Stand eines Termins aus termineDerWoche, ohne etwas zu verändern.
// → { zustand: 'geplant' | 'faelltAus' | 'laeuft' | 'vorbei' | 'ausgefallen', fehlt (Code, wenn er ausfällt/ausfiel) }
export function terminStand(z, raeume, t) {
  const L = (z.laeufe || []).find(x => x.id === t.id);
  if (L) return L.phase === 'ende' ? (L.ausgefallen ? { zustand: 'ausgefallen', fehlt: L.grund || null } : { zustand: 'vorbei', fehlt: null })
    : { zustand: 'laeuft', fehlt: null };
  if ((z.termineErledigt || []).includes(t.id)) return { zustand: 'vorbei', fehlt: null };
  if (verdraengtVon(z, raeume, t)) return { zustand: 'faelltAus', fehlt: 'fest' };
  const info = terminInfo(z, raeume, t);
  if (!info) return { zustand: 'faelltAus', fehlt: 'raum' };
  return info.p.bereit ? { zustand: 'geplant', fehlt: null } : { zustand: 'faelltAus', fehlt: info.p.fehlt };
}
// Sonderevent: wie ein Eintrag im Programm des Raums, aber mit der im Fest-Menü gewählten Leitung
function festProgramm(z, g, L) {
  const plan = z.feste && z.feste.plaene[L.fest], v = VERANSTALTUNGEN.find(x => x.id === (plan ? plan.art : L.art)) || null;
  // Schichtbetrieb (27.11.): die im Fest-Menü gewählte Leitung kommt zur Festzeit von selbst (dienst.js) – zählt schon vorher
  const leitung = !plan ? null : z.schichtbetrieb ? z.personen.find(p => p.id === plan.leitung && daten(p) && daten(p).art === 'hauptamt') || null
    : g.imRaum.find(p => p.id === plan.leitung && daten(p).art === 'hauptamt') || null;
  const fehlt = !v || !plan || v.fest === false ? 'keine' : !leitung ? 'leitung' : v.braucht.some(a => !moebelImRaum(z, g.raum, a).length) ? 'gitarre'
    : v.gitarrist && !g.spieler.length ? 'gitarrist' : null;
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
  const v = info.p.veranstaltung, frei = v && v.stuehleBegrenzen === false;
  // Stühle egal (Chorprobe): jeder passt hinein und stellt sich auf ein freies Kästchen im Raum
  const g0 = v && v.amTisch ? { ...info.g, stuehle: stuehleAmTisch(z, info.g.stuehle) } : info.g;   // Spielenachmittag: nur am Tisch
  const sitze = frei ? freieFelder(z, info.g.raum) : sitzplaetze([g0]).map(s => ({ x: s.x, y: s.y }));   // beste Plätze werden zuerst besetzt
  // Wer gerade bei einer anderen Veranstaltung ist (nicht schon auf dem Heimweg), kann nicht kommen.
  const woanders = new Set(z.laeufe.filter(x => x !== L && x.phase !== 'ende' && x.gaeste).flatMap(x => x.gaeste.map(g => g.id)));
  const anzahl = termineDerWoche(z, raeume, L.woche).filter(t => zaehltFuerNeue(t.art)).length || 1;
  // Spielt im Raum gerade ein Lobpreisteam? Das wissen die Leute, wenn sie sich auf den Weg machen (wirkt beim normalen Gottesdienst).
  // Konfirmandenunterricht: keine neuen Besucher über die Bekanntheit. Konfirmation: Konfirmanden kommen sicher.
  const kommen = werKommt(z, zufall, { art: L.art, woche: L.woche, ausschluss: woanders, neuAnteil: 1 / anzahl, faktor: terminFaktoren(L, z).besucher,
    musik: info.g.typ.id === 'gottesdienst' ? info.g.ausstattung.musik : undefined, keineNeuen: !zaehltFuerNeue(L.art), konfirmation: istKonfirmation(L) });
  // Erster Gottesdienst (26.11.): zusätzlich fest ERSTER_GOTTESDIENST.neueLeute Menschen
  if (istErster(z, L)) { L.erster = true; kommen.push(...zusatzLeute(z, zufall)); }
  // Schichtbetrieb (27.11.): Ehrenamtliche ohne Schicht kommen sonntagvormittags mit 90 % in den Gottesdienst – wie Besucher
  kommen.push(...besuchendeEhrenamtliche(z, raeume, L, info.g, zufall));
  for (let i = kommen.length - 1; i > 0; i--) { const j = Math.floor(zufall() * (i + 1)); [kommen[i], kommen[j]] = [kommen[j], kommen[i]]; }
  const tuer = raumTuer(z, info.g.raum);
  L.ankunft = z.minuten;
  const platz = i => frei ? (sitze.length ? { ...sitze[i % sitze.length] } : { ...tuer }) : i < sitze.length ? sitze[i] : null;
  L.gaeste = kommen.map((b, i) => ({ id: b.id, name: b.vorname, voll: b.voll, sitz: platz(i), tuer, kaffee: null }));
  // Bedürfnis Toilette (26.11.): Startwerte und geplante Toilettengänge (toiletten.js)
  gaengeBeimAnreisen(z, raeume, L, strasse, L.beginn, L.beginn + dauerVon(L.art));
  // Automaten (26.11.): Wer etwas kauft, geht vor Beginn einmal hin und zurück an seinen Platz (automaten.js)
  automatenBeimAnreisen(z, raeume, L, strasse, L.beginn);
}
// Freie Kästchen im Raum (ohne Möbel)
function freieFelder(z, raum) {
  return raum.zellen.map(c => ({ x: c % z.w, y: (c / z.w) | 0 })).filter(f => !hindernisBei(z, f.x, f.y) && !moebelBei(z, f.x, f.y));
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
    gaengeAbsagen(z, L);
    Object.assign(L, { phase: 'ende', ausgefallen: true, grund: 'fest', wegenFest: fest, ende: z.minuten });
    berichtAblegen(z, L);
    return;
  }
  const info = terminInfo(z, raeume, L);
  if (!info || !info.p.bereit) {
    // Kein Hauptamtlicher im Raum, nichts eingestellt, Gitarre oder Kanzel/Altar fehlen: Die Veranstaltung fällt aus.
    for (const b of z.besucher) zufriedenheitAendern(b, AENDERUNG.ausfall);
    const grund = info ? info.p.fehlt : 'raum';
    gaengeAbsagen(z, L);   // Toilettengänge am Platz fallen weg, alle gehen heim
    Object.assign(L, { phase: 'ende', ausgefallen: true, grund, ende: z.minuten });
    berichtAblegen(z, L);
    if (mitKirchkaffee(L.art)) z.letzterGottesdienst = { woche: L.woche, platz: L.platz, ausgefallen: true, grund, besucher: 0, heim: 0 };
    return;
  }
  if (!L.gaeste) gaesteAuslosen(z, raeume, zufall, L, info);   // Hauptamtlicher erst kurz vor Beginn gekommen
  L.phase = 'gottesdienst';
}

function gottesdienstEnde(z, raeume, L, zufall = Math.random) {
  const v = VERANSTALTUNGEN.find(x => x.id === L.art);
  if (v && v.kollekte === false) return saalEnde(z, raeume, L, v, zufall);
  const sitzend = L.gaeste.filter(g => g.sitz);
  // Kollekte: pro Besucher 1 € × Stuhl, × Altar, Grünpflanzen und Musik des Raums, × 2 am Sonntag,
  // × Kollekte-Faktor des Kirchenjahres (z. B. Heiligabend ×2); auf ganze Euro gerundet.
  // Dazu merkt sich jeder Gast, wie viel Haltung ihm Stuhl, Kanzel und Blumen bringen (wird am Ende gutgeschrieben).
  const info = terminInfo(z, raeume, L);
  // Ausstattung genau dieser Veranstaltung (im Schichtbetrieb spielt bei Veranstaltung 2 evtl. ein anderes Lobpreisteam)
  const liste = gottesdienstRaeume(z, raeume).map(x => info && x.raum === info.g.raum ? info.g : x);
  let summeKollekte = 0;
  const faktor = zeitFaktor(L.plan) * terminFaktoren(L, z).kollekte * ((v && v.kollekteFaktor) || 1);   // Jugendgottesdienst: × 0,5
  // Über jedem Kopf erscheint kurz, was er gegeben hat (wie „+1 €“ beim Kaffee; auf Cent gerundet, gebucht wird die Summe auf ganze Euro).
  for (const g of sitzend) {
    const w = platzWirkung(z, raeume, g.sitz, liste); summeKollekte += w.kollekte; g.bonus = w.haltung; g.musikHaltung = w.musikHaltung;
    const gabe = Math.round(w.kollekte * faktor * 100) / 100;
    if (gabe > 0) zahlZeigen(z, g.sitz, gabe);
  }
  // Lobpreisteam: Jeder, der ein Instrument gespielt hat, bekommt etwas Musik-Erfahrung.
  if (info && info.g.ausstattung.musik) for (const p of info.g.spieler) musikErfahrungDazu(p);
  // Haltungs-Multiplikator (Skill des Hauptamtlichen, 26.11.): wer leitet, merken – wirkt beim Abschluss; +1 geleiteter Gottesdienst
  L.leitung = info && info.p && info.p.leitung ? info.p.leitung.id : null;
  if (info && info.p) multiplikatorErfahrung(info.p.leitung, L.art);
  // Bedürfnis Lobpreis (25.11.): erfüllt beim Lobpreisgottesdienst und bei jedem Gottesdienst, bei dem ein Lobpreisteam spielt
  L.lobpreis = L.art === 'lobpreis' || !!(info && info.g.ausstattung.musik);
  const betrag = Math.round(summeKollekte * faktor);
  if (betrag > 0) { buchen(z, 'einnahmen', 'kollekte', betrag, { veranstaltung: L.art || 'gottesdienst' }); berichtDazu(L, 'kollekte', betrag); }
  bekanntheitMitBericht(z, L, BEKANNTHEIT.proGottesdienst, 'gottesdienst');
  // Wer will Kaffee? Chance = Kaffee-Wert. Die stellen sich im Kirchkaffee an (ohne Kirchkaffee: kein Kaffee, −10 am Ende).
  const wollen = [];
  L.gaeste.forEach((g, i) => {
    g.kaffee = null;
    const b = g.sitz && z.besucher.find(x => x.id === g.id);
    if (b && zufall() < kaffeeVorliebe(b)) { g.kaffee = { ergebnis: null }; wollen.push({ g, i }); }
  });
  if (!gottesdienstKunden(z, raeume, L, wollen)) for (const { g } of wollen) g.kaffee.ergebnis = 'keinPlatz';
  L.gottesdienstEnde = z.minuten;   // wer keinen Kaffee will, geht ab jetzt nach Hause (bewegung.js)
  gaengeBeimHeimgehen(z, raeume, L, strasse);   // ab 80 % vorher noch zur Toilette
  automatenBeimHeimgehen(z, raeume, L, strasse);   // wer vorher keine Zeit hatte: über den Automaten nach Hause (26.11.)
  L.phase = 'kirchkaffee';
}

// Ende einer Veranstaltung im Gemeindesaal (Lukas, 25.11.): keine Kollekte, kein Kirchkaffee, manchmal eine spontane Spende.
// Bekanntheit wie beim Gottesdienst; der Ehrenamtliche der Chorprobe sammelt Musik-Erfahrung. Danach gehen alle heim.
function saalEnde(z, raeume, L, v, zufall) {
  const info = terminInfo(z, raeume, L);
  L.musikBonus = info ? info.p.musikBonus : 0;   // Chorprobe: Bonus des besten Ehrenamtlichen (vor der neuen Erfahrung)
  L.ehrenamtBonus = info ? info.p.ehrenamtBonus || 0 : 0;   // Konfirmandenunterricht: + Haltung je Ehrenamtlichem
  let spende = 0;
  for (const g of L.gaeste.filter(g => g.sitz)) {
    g.kaffee = null;
    // Seniorennachmittag: wer auf einem Stuhl sitzt, bekommt dessen Haltung (Polsterstuhl usw.) wie im Gottesdienst
    const m = moebelBei(z, g.sitz.x, g.sitz.y);
    g.bonus = m && m.art === 'stuhl' ? stuhlStufe(m).haltung : 0;
    if (v.spendeImmer) {   // Spielenachmittag (25.11.): jeder Besucher gibt zufällig min … max € (auch 0), sichtbar beim Gehen
      const S = v.spendeImmer, betrag = S.min + Math.floor(zufall() * (S.max - S.min + 1));
      if (betrag > 0) { spende += betrag; zahlZeigen(z, g.sitz, betrag); }
    } else if (v.spende && zufall() < SPONTANE_SPENDE.chance) {
      const betrag = SPONTANE_SPENDE.min + Math.floor(zufall() * (SPONTANE_SPENDE.max - SPONTANE_SPENDE.min + 1));
      spende += betrag; zahlZeigen(z, g.sitz, betrag);
    }
  }
  if (spende > 0) { buchen(z, 'einnahmen', 'spende', spende, { veranstaltung: L.art }); berichtDazu(L, 'spende', spende); }
  if (info && v.musikLevelMin && info.p.leitung) musikErfahrungDazu(info.p.leitung);
  if (v.bekanntheit !== false) bekanntheitMitBericht(z, L, BEKANNTHEIT.proGottesdienst, 'gottesdienst');   // Konfirmandenunterricht: nur Haltung
  L.gottesdienstEnde = z.minuten;
  gaengeBeimHeimgehen(z, raeume, L, strasse);   // ab 80 % vorher noch zur Toilette
  automatenBeimHeimgehen(z, raeume, L, strasse);   // wer vorher keine Zeit hatte: über den Automaten nach Hause (26.11.)
  abschliessen(z, raeume, zufall, L);
}

// Haltung für die Veranstaltung selbst: Gottesdienst fest, Lobpreisgottesdienst nach Lobpreis-Vorliebe,
// Seniorennachmittag fest (haltung), Konfirmandenunterricht fest + je Ehrenamtlichem, Chorprobe: Musik-Bonus × aktuelle Haltung
function haltungFuer(art, b, L = {}) {
  const v = VERANSTALTUNGEN.find(x => x.id === art);
  if (v && typeof v.haltung === 'number') return v.haltung + (L.ehrenamtBonus || 0);
  if (v && v.haltungNachMusik) return Math.round(b.zufriedenheit * (L.musikBonus || 0));
  return v && v.haltungNachVorliebe ? Math.round(lobpreisVorliebe(b) * v.haltungNachVorliebe) : AENDERUNG.gottesdienst;
}

// Bekanntheit ändern und die wirkliche Änderung im Bericht der Veranstaltung mitzählen
function bekanntheitMitBericht(z, L, wert, quelle, anzahl = null) {
  const vorher = z.bekanntheit;
  bekanntheitAendern(z, wert, quelle, anzahl);
  berichtDazu(L, 'bekanntheit', z.bekanntheit - vorher);
}

function abschliessen(z, raeume, zufall = Math.random, L) {
  const anwesend = [], v = VERANSTALTUNGEN.find(x => x.id === L.art) || {};
  const sitzplatz = v.sitzplatzHaltung === false ? 0 : AENDERUNG.sitzplatz;   // Konfirmandenunterricht: Sitzplatz ist nur Bedingung
  const leitung = L.leitung ? z.personen.find(p => p.id === L.leitung) || null : null;   // für den Haltungs-Multiplikator
  // Foyer (25.11.): wer auf dem Weg hindurchgelaufen ist, bekommt Haltung. Begrüßungsdienst im Schichtbetrieb: laut Dienstplan (27.11.)
  const foyerListe = foyers(z, raeume, z.schichtbetrieb && !L.fest && L.raum !== null ? begruessungDienst(z, raeume, L.raum, L.platz) : z.schichtbetrieb ? new Set() : null);
  L.gaeste.forEach((g, i) => { if (g.sitz) g.foyer = foyerBonus(z, raeume, strasse(i), g.sitz, foyerListe); });
  for (const g of L.gaeste) {
    const b = z.besucher.find(x => x.id === g.id);
    if (!b) continue;
    const besuch = { art: L.art, fest: L.fest || null, beginn: L.beginn };   // Besuchsheft für die Besucherkarte (27.11.)
    if (!g.sitz) {
      zufriedenheitAendern(b, AENDERUNG.heimgeschickt); berichtDazu(L, 'haltung', AENDERUNG.heimgeschickt); berichtDazu(L, 'keinPlatz', 1);
      besuchMerken(b, { ...besuch, haltung: AENDERUNG.heimgeschickt, keinPlatz: true });
      continue;
    }
    anwesend.push(b); b.besuche++; b.zuletzt = L.woche; b.besuchtWoche = L.woche;
    // bonus: Stuhl, Kanzel, Blumen; Lobpreisteam: musikHaltung (z. B. 5 %) der aktuellen Haltung × Wirkung nach Lobpreis-Vorliebe
    // (100 % Vorliebe → +5 %, 50 % → 0, 0 % → −5 %)
    const musik = Math.round(b.zufriedenheit * (g.musikHaltung || 0) * musikWirkung(b));
    // Haltungs-Multiplikator der Leitung (Gottesdienst, Lobpreisgottesdienst): vervielfacht die Summe nach allen Boni, nur Pluswerte
    const haltung = mitMultiplikator(leitung, L.art, sitzplatz + haltungFuer(L.art, b, L) + (g.bonus || 0) + musik + (g.foyer || 0));
    const levelVorher = levelVon(b);
    zufriedenheitAendern(b, haltung); berichtDazu(L, 'haltung', haltung);   // Bericht: Summe der Haltungspunkte aller Besucher
    // Haltung im Heft = dieselben Punkte wie im Bericht der Veranstaltung (ohne Kirchkaffee); Level nur, wenn es hoch ging
    besuchMerken(b, { ...besuch, haltung, keinPlatz: false, level: levelVon(b) > levelVorher ? levelVon(b) : null });
    if (v.konfiTeilnahme) konfiTeilnahme(z, b);   // zählt für die Konfirmation
    if (L.lobpreis) beduerfnisErfuellt(z, b, 'lobpreis', L.woche);   // Bedürfnisse am Ende der Woche (25.11.)
    if (v.spass && (v.spass !== 'jugend' || istJugend(b))) beduerfnisErfuellt(z, b, 'spass', L.woche);   // Jugendgottesdienst: nur Jugendliche
    if (g.kaffee && g.kaffee.ergebnis === 'keinPlatz') zufriedenheitAendern(b, AENDERUNG.kaffeeNein);   // sonst: beim Bedienen (kirchkaffee.js)
    g.zufriedenheit = b.zufriedenheit;
  }
  berichtDazu(L, 'besucher', anwesend.length);
  berichtDazu(L, 'heiligkeit', heiligkeitFuerGottesdienst(z, L.art, anwesend.length));   // Forschungsbaum: 1 Heiligkeit pro Gottesdienstbesucher
  const sehr = v.bekanntheit === false ? 0 : anwesend.filter(b => b.zufriedenheit >= BEKANNTHEIT.sehrZufrieden).length;
  bekanntheitMitBericht(z, L, sehr * BEKANNTHEIT.proSehrZufriedenem, 'zufrieden', sehr);
  if (istKonfirmation(L)) konfirmieren(z);   // Ende des Konfirmations-Gottesdienstes: alle Konfirmanden werden erwachsen
  // Gemeindemitglieder (27.11.): nach jedem Gottesdienst (Gottesdienstraum) können Anwesende ab Level 3 Mitglied werden
  if ((v.raumtypen || []).includes('gottesdienst')) mitgliedWerden(z, anwesend, L.woche, zufall);
  const werden = ehrenamtWerden(z, anwesend, zufall);
  // Erster Gottesdienst (26.11.): mindestens ERSTER_GOTTESDIENST.ehrenamt neue Ehrenamtliche, danach ist er erledigt
  if (L.erster) { const dazu = ehrenamtSicher(z, anwesend, werden, zufall); werden.push(...dazu); ehrenamtGemerkt(z, dazu.length); z.erster.erledigt = true; }
  const neueEA = werden.map(b =>
    personHinzufuegen(z, { name: b.voll, kuerzel: b.vorname[0], art: 'ehrenamt', ausbildung: null, skill: null, charakter: null,
      herkunft: { jugend: istJugend(b), besuche: b.besuche, zufriedenheit: b.zufriedenheit, level: b.level || 1, kaffee: kaffeeVorliebe(b), zuletzt: b.zuletzt } }));
  Object.assign(L, { phase: 'ende', ende: z.minuten, neueEhrenamtliche: neueEA.map(p => p.daten.name) });
  berichtAblegen(z, L);
  if (mitKirchkaffee(L.art)) z.letzterGottesdienst = { woche: L.woche, platz: L.platz, ausgefallen: false, besucher: anwesend.length, heim: L.gaeste.filter(g => !g.sitz).length };
}

// ---- Prognose für eine Veranstaltung (erwartete Werte = Summe der Einzelchancen) ----
// raumNr/platz: welche Veranstaltung; ohne Angabe Veranstaltung 1 im ersten Gottesdienstraum.
export function prognose(z, raeume, raumNr = null, platz = 0) {
  const alle = gottesdienstRaeume(z, raeume);
  const g = raumNr === null ? alle[0] : alle.find(x => x.raum.nr === raumNr);
  const p = g ? g.programm[platz] : null;
  const termin = g && dieserTermin(z, raeume, g.raum, platz);
  return prognoseFuer(z, raeume, g, p, termin, platz);
}
// Prognose für ein geplantes Sonderevent (Fest-Menü): gleiche Rechnung wie bei jedem anderen Termin,
// nur mit der im Fest-Menü gewählten Leitung und Art. t: Termin aus termineDerWoche (platz 'fest').
function festPrognose(z, raeume, t) {
  const r = raumZu(raeume, t.raum), g = r && gottesdienstRaeume(z, raeume).find(x => x.raum === r);
  if (!g) return null;
  return prognoseFuer(z, raeume, g, festProgramm(z, g, t), t, 'fest');
}
function prognoseFuer(z, raeume, g0, p, termin, platz) {
  const g = g0 && p ? mitDienst(g0, p) : g0;   // Lobpreisteam und Ausstattung genau dieser Veranstaltung
  const art = p ? p.art : null;
  const plan = p ? { tag: p.tag, slot: p.slot } : STANDARD_PLAN, faktor = zeitFaktor(plan);
  const woche = termin ? termin.woche : zeitpunkt(z.minuten).woche;
  const v = p ? p.veranstaltung : null, saal = !!(v && v.kollekte === false), unbegrenzt = !!(v && v.stuehleBegrenzen === false);
  const bereit = !!(p && p.bereit), plaetze = unbegrenzt ? null : g ? (v && v.amTisch ? stuehleAmTisch(z, g.stuehle) : g.stuehle).length : 0;
  const plakat = !!z.plakat;
  // Neugierige vom Tor kommen zur nächsten Veranstaltung; neue Besucher über die Bekanntheit verteilen sich auf die Termine der Woche
  const naechster = naechsterTermin(z, raeume), istNaechster = !!(termin && naechster && naechster.id === termin.id);
  const neugierige = (istNaechster || !termin) && z.ort ? z.ort.leute.filter(p => p.neugierig && einladungPasst(p, art)) : [];   // Eingeladene (Evangelisation) nur zu ihrer Veranstaltung
  const anzahl = termineDerWoche(z, raeume, woche).filter(t => zaehltFuerNeue(t.art)).length || 1;
  // ... aber höchstens so viele, wie es im Ort und im Einzugsgebiet noch gibt
  const moeglich = (z.ort ? z.ort.leute.filter(p => !p.neugierig).length : 0) + platzImGebiet(z);
  // Kirchenjahr: Fest an dem Tag oder Zeit (z. B. Adventszeit) – Besucher und Kollekte × Faktor
  const kj = terminFaktoren({ woche, plan }, z);
  const neu = zaehltFuerNeue(art) ? Math.min(z.bekanntheit / BEKANNTHEIT.teiler / anzahl * kj.besucher, moeglich) : 0;
  const chance = b => besuchChance(b, { art, woche, faktor: kj.besucher, musik: g && g.typ.id === 'gottesdienst' ? g.ausstattung.musik : undefined });
  const nf = p => p.eingeladen ? Math.min(1, artFaktor(p, art)) : artFaktor(p, art);   // Eingeladene: höchstens 75 %
  const neugierErwartet = neugierige.reduce((s, p) => s + nf(p), 0) * NEUGIER.kommChance;   // Jugendliche/Erwachsene
  // Erster Gottesdienst (26.11.): die zusätzlichen Leute kommen sicher
  const ersterG = ersterOffen(z) && termin && !termin.fest && art === 'gottesdienst' && (naechsterGottesdienst(z, raeume) || {}).id === termin.id;
  const erwartet = z.besucher.reduce((s, b) => s + chance(b), 0) + neu + neugierErwartet + (ersterG ? ERSTER_GOTTESDIENST.neueLeute : 0);
  const anteil = unbegrenzt ? 1 : erwartet ? Math.min(1, plaetze / erwartet) : 0, sitzend = erwartet * anteil;
  // Fällt der Termin wegen eines geplanten Sonderevents aus?
  const wegenFest = g && platz !== 'fest' && verdraengtVon(z, raeume, { woche, plan, raum: raumSchluessel(g.raum), platz });
  const kirchenjahr = { besucher: kj.besucher, kollekte: kj.kollekte, fest: kj.fest, zeit: kj.zeit,
    festName: kj.fest ? FESTE.find(f => f.id === kj.fest).name : null, zeitName: (ZEITEN.find(t => t.id === kj.zeit) || {}).name || null };
  const grund = { bereit: bereit && !wegenFest, erwartet, plaetze, plakat, saal, sonntag: !saal && faktor > 1, fehlt: wegenFest ? 'fest' : p ? p.fehlt : 'raum',
    kirchenjahr, wegenFest: wegenFest ? festAusSchluessel(wegenFest).fest.name : null };
  if (wegenFest) return { ...grund, sitzend: 0, geld: 0, kollekte: 0, ehrenamt: 0, tassen: 0 };
  if (!bereit) return { ...grund, sitzend: 0, geld: 0, kollekte: 0, ehrenamt: 0, tassen: 0 };
  // Erwartete neue Ehrenamtliche (27.11.): höchstens proVeranstaltung und nur, solange die Bremse es zulässt; ist einer fällig, kommt er sicher
  const eaWuerfel = z.besucher.filter(b => b.besuche + 1 >= EHRENAMT_AB_BESUCHEN).reduce((s, b) => s + chance(b) * anteil * EHRENAMT_QUOTE, 0);
  const ehrenamt = ehrenamtFaellig(z) && sitzend > 0 ? 1 : Math.min(eaWuerfel, EHRENAMT.proVeranstaltung, ehrenamtFrei(z));
  if (saal) {   // Gemeindesaal: statt Kollekte und Kaffee nur die erwartete spontane Spende
    const spende = v.spendeImmer ? sitzend * (v.spendeImmer.min + v.spendeImmer.max) / 2
      : v.spende ? sitzend * SPONTANE_SPENDE.chance * (SPONTANE_SPENDE.min + SPONTANE_SPENDE.max) / 2 : 0;
    return { ...grund, sitzend, geld: spende, kollekte: 0, spende, ehrenamt, tassen: 0 };
  }
  // Erwartete Kollekte: die erwarteten Besucher sitzen auf den besten Plätzen des Raums
  const sitze = sitzplaetze([g]);
  let kollekteSumme = 0;
  for (let i = 0, rest = Math.min(sitzend, sitze.length); rest > 0; i++, rest--) kollekteSumme += sitze[i].wert * Math.min(1, rest);
  kollekteSumme *= faktor * kj.kollekte * ((v && v.kollekteFaktor) || 1);   // Jugendgottesdienst: × 0,5
  // Kaffee: erwartete Gäste × Kaffee-Wert (neue im Schnitt 50 %); höchstens so viele Tassen, wie in die Maschinen passen
  // (die Ehrenamtlichen füllen sie auf, wenn das Kirchkaffee zu hat)
  const kaffeeWunsch = (z.besucher.reduce((s, b) => s + chance(b) * kaffeeVorliebe(b), 0) + neu * VORLIEBE_SCHNITT
    + neugierige.reduce((s, p) => s + kaffeeVorliebe(p) * nf(p), 0) * NEUGIER.kommChance) * anteil;
  // Schichtbetrieb (27.11.): so viele Stationen, wie im Kirchkaffee nach dieser Veranstaltung Ehrenamtliche eingeteilt sind
  const stationen = z.schichtbetrieb ? (platz === 'fest' ? 0 : kaffeeNachBesetzt(z, raeume, raumSchluessel(g.raum), platz))
    : kirchkaffeeZustand(z, raeume).flatMap(k => k.stationen).length;
  const tassen = Math.min(kaffeeWunsch, stationen * fassung('kaffeemaschine'));
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
// Sonderevents dieser Woche, deren Geld noch nicht gebucht ist: noch nicht begonnen oder gerade in der Anreise
function festTermineOffen(z, raeume) {
  const w = zeitpunkt(z.minuten).woche;
  if (w <= z.letzterLauf) return [];
  const anreise = new Set((z.laeufe || []).filter(L => L.phase === 'anreise').map(L => L.id));
  const begonnen = new Set([...(z.laeufe || []).map(L => L.id), ...(z.termineErledigt || [])]);
  return termineDerWoche(z, raeume, w).filter(t => t.fest && (anreise.has(t.id) || (z.minuten < t.beginn && !begonnen.has(t.id))));
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
  // Geplante Sonderevents dieser Woche, die noch nicht begonnen haben (oder gerade in der Anreise sind)
  for (const t of festTermineOffen(z, raeume)) { const f = festPrognose(z, raeume, t); if (f) offen += f.geld; }
  return { einnahmen: Math.round(summe(z.wochenbuch.einnahmen) + offen), ausgaben: summe(z.wochenbuch.ausgaben) };
}

// Wann öffnet dieses Kirchkaffee als Nächstes? Nächste eigene Schicht oder Ende des nächsten Gottesdienstes (Minuten oder null)
export function naechsteKaffeeOeffnung(z, raeume, raum) {
  if (z.schichtbetrieb) return naechsteKaffeeSchicht(z, raeume, raum);   // 27.11.: nur Öffnungen, für die jemand eingeteilt ist
  const t = z.minuten, w = zeitpunkt(t).woche, werte = [];
  const s = naechsteSchicht(z, raum, t);
  if (s !== null) werte.push(s);
  for (const L of z.laeufe || []) if ((L.phase === 'anreise' || L.phase === 'gottesdienst') && !L.ausgefallen && mitKirchkaffee(L.art)) werte.push(L.beginn + DAUER.gottesdienst);
  const erledigt = new Set(z.termineErledigt || []);
  for (const woche of [w, w + 1]) for (const termin of termineDerWoche(z, raeume, woche))
    if (termin.art && mitKirchkaffee(termin.art) && termin.beginn > t && !erledigt.has(termin.id)) werte.push(termin.beginn + DAUER.gottesdienst);
  return werte.length ? Math.min(...werte) : null;
}
