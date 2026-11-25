// Rundenablauf: wann die Woche beendet werden kann und was dann passiert.
import { VERANSTALTUNGEN } from '../inhalte/veranstaltungen.js';
import { moebelImRaum } from './moebel.js';
import { idx } from './karte.js';
import { kollekte, buchen, wocheAbschliessen } from './finanzen.js';
import { moebelBei } from './moebel.js';
import { besucherDerWoche, ehrenamtWerden } from './besucher.js';
import { eingesetztIn, personHinzufuegen } from './personen.js';
import { KIRCHKAFFEE_QUOTE, KIRCHKAFFEE_ANGEBOT } from '../inhalte/kirchkaffee.js';

// Veranstaltungen, die in einem Raumtyp möglich sind, und die im Raum eingestellte
export function moeglicheVeranstaltungen(typ) { return typ ? VERANSTALTUNGEN.filter(v => v.raumtypen.includes(typ.id)) : []; }
export function veranstaltungVon(z, raum) {
  const id = z.veranstaltung && z.veranstaltung[raum.zellen[0]];
  return VERANSTALTUNGEN.find(v => v.id === id) || null;
}
export function veranstaltungEinstellen(z, raum, id) {
  if (!z.veranstaltung) z.veranstaltung = {};
  for (const c of raum.zellen) { if (id) z.veranstaltung[c] = id; else delete z.veranstaltung[c]; }
}

// Prüft jeden fertigen Raum, in dem Veranstaltungen möglich sind: ist die Mindestbesetzung erfüllt?
export function raumBereitschaft(z, raeume) {
  const ergebnis = [];
  for (const r of raeume.liste) {
    if (!r.typ || r.probleme.length || !moeglicheVeranstaltungen(r.typ).length) continue;
    const v = veranstaltungVon(z, r), zellen = new Set(r.zellen), stuehle = moebelImRaum(z, r, 'stuhl'), fehlt = [];
    if (!v) fehlt.push('veranstaltung');
    else {
      if (v.leitung && !z.personen.some(p => v.leitung.includes(p.id) && zellen.has(idx(z, p.x, p.y)))) fehlt.push('leitung');
      if ((v.minStuehle || 0) > stuehle.length) fehlt.push('stuehle');
    }
    ergebnis.push({ raum: r, typ: r.typ, veranstaltung: v, stuehle, fehlt, bereit: fehlt.length === 0 });
  }
  return ergebnis;
}

// Woche beenden ist möglich, wenn jede Pflicht-Veranstaltung (Gottesdienst) mindestens einmal stattfinden kann.
export function kannWocheBeenden(z, raeume) {
  const bereit = raumBereitschaft(z, raeume).filter(b => b.bereit);
  return VERANSTALTUNGEN.filter(v => v.proWochePflicht).every(v => bereit.some(b => b.veranstaltung.id === v.id));
}

// Kirchkaffee: fertige Räume (mit Verbindungstür) mit genug eingesetzten Ehrenamtlichen.
export function kirchkaffeeOffen(z, raeume) {
  return raeume.liste.filter(r => r.typ && r.typ.id === 'kirchkaffee' && !r.probleme.length &&
    z.personen.filter(p => eingesetztIn(z, raeume, p) === r).length >= (r.typ.minBesetzung || 1));
}
// Freie Stehplätze im Kirchkaffee (kein Möbel, keine Person)
function kaffeePlaetze(z, raeume) {
  return kirchkaffeeOffen(z, raeume).flatMap(r => r.zellen)
    .map(c => ({ x: c % z.w, y: (c / z.w) | 0 }))
    .filter(f => !moebelBei(z, f.x, f.y) && !z.personen.some(p => p.x === f.x && p.y === f.y));
}

// Führt die Woche aus und liefert den Wochenrückblick.
// Ablauf: Gottesdienst (Stammbesucher + neue auf die Stühle) → mit KIRCHKAFFEE_QUOTE ins Kirchkaffee →
// Kollekte und Kirchkaffee-Einnahmen buchen → manche Besucher werden Ehrenamtliche.
export function wocheBeenden(z, raeume, zufall = Math.random) {
  const bereit = raumBereitschaft(z, raeume).filter(b => b.bereit);
  const sitze = bereit.filter(b => b.veranstaltung.id === 'gottesdienst').flatMap(b => b.stuehle.map(s => ({ x: s.x, y: s.y })));
  const anwesende = besucherDerWoche(z, sitze.length, zufall);

  // Wer geht danach ins Kirchkaffee?
  const frei = kaffeePlaetze(z, raeume);
  const weg = anwesende.map((b, i) => {
    let kaffee = null;
    if (frei.length && zufall() < KIRCHKAFFEE_QUOTE) kaffee = frei.splice(Math.floor(zufall() * frei.length), 1)[0];
    return { name: b.vorname, voll: b.voll, besuche: b.besuche, sitz: sitze[i], kaffee };
  });
  const gaeste = weg.filter(w => w.kaffee).length;

  if (anwesende.length) buchen(z, 'einnahmen', 'kollekte', kollekte(anwesende.length));
  const kaffeeEinnahmen = gaeste * KIRCHKAFFEE_ANGEBOT.reduce((s, a) => s + a.preis, 0);
  if (kaffeeEinnahmen) buchen(z, 'einnahmen', 'kirchkaffee', kaffeeEinnahmen);

  const neueEA = ehrenamtWerden(z, anwesende, zufall).map(b =>
    personHinzufuegen(z, { name: b.voll, kuerzel: b.vorname[0], art: 'ehrenamt', ausbildung: null, skill: null, charakter: null }));

  const angebote = [{ veranstaltung: 'gottesdienst', name: 'Gottesdienst', besucher: anwesende.length }];
  if (gaeste) angebote.push({ veranstaltung: 'kirchkaffee', name: 'Kirchkaffee', besucher: gaeste });
  const rueckblick = {
    woche: z.woche,
    finanzen: wocheAbschliessen(z),          // { einnahmen: {kategorie: €}, ausgaben: {kategorie: €} }
    kontostand: z.konto,
    angebote: angebote.filter(a => a.besucher > 0),
    weg,                                       // für die Animation: wer sitzt wo, wer geht danach wohin
    neueEhrenamtliche: neueEA.map(p => p.daten.name)
  };
  z.letzteWoche = { besucher: anwesende.length };   // für die Anzeige „Besucher letzte Woche“
  z.woche++;
  return rueckblick;
}

// Voraussichtliche Finanzen der laufenden Woche. Regeln folgen später – bis dahin 0.
// Einnahmen: was schon gebucht ist plus Kollekte, falls die Woche jetzt beendet würde. Ausgaben: bisher in dieser Woche.
// Kirchkaffee wird mit der erwarteten Gästezahl geschätzt (Besucher × Quote, höchstens so viele Stehplätze).
export function finanzPrognose(z, raeume) {
  const plaetze = raumBereitschaft(z, raeume).filter(b => b.bereit && b.veranstaltung.id === 'gottesdienst').reduce((s, b) => s + b.stuehle.length, 0);
  const gaeste = Math.min(Math.round(plaetze * KIRCHKAFFEE_QUOTE), kaffeePlaetze(z, raeume).length);
  const schon = Object.values(z.wochenbuch.einnahmen).reduce((a, b) => a + b, 0);
  return {
    einnahmen: schon + kollekte(plaetze) + gaeste * KIRCHKAFFEE_ANGEBOT.reduce((s, a) => s + a.preis, 0),
    ausgaben: Object.values(z.wochenbuch.ausgaben).reduce((a, b) => a + b, 0)
  };
}
