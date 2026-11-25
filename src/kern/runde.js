// Rundenablauf: wann die Woche beendet werden kann und was dann passiert.
import { VERANSTALTUNGEN } from '../inhalte/veranstaltungen.js';
import { moebelImRaum } from './moebel.js';
import { idx } from './karte.js';
import { kollekte, buchen, wocheAbschliessen } from './finanzen.js';

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

// Führt die Woche aus und liefert den Wochenrückblick. Regeln für Besucherzahl,
// Finanzen und neue Ehrenamtliche folgen später; im Moment: Besucher = Stühle.
export function wocheBeenden(z, raeume) {
  const bereit = raumBereitschaft(z, raeume).filter(b => b.bereit);
  const angebote = VERANSTALTUNGEN.map(v => {
    const plaetze = bereit.filter(b => b.veranstaltung.id === v.id).flatMap(b => b.stuehle.map(s => ({ x: s.x, y: s.y })));
    return { veranstaltung: v.id, name: v.name, besucher: plaetze.length, plaetze };
  }).filter(a => a.besucher > 0);
  const besucherGesamt = angebote.reduce((s, a) => s + a.besucher, 0);
  if (besucherGesamt) buchen(z, 'einnahmen', 'kollekte', kollekte(besucherGesamt));
  const rueckblick = {
    woche: z.woche,
    finanzen: wocheAbschliessen(z),          // { einnahmen: {kategorie: €}, ausgaben: {kategorie: €} }
    kontostand: z.konto,
    angebote,
    neueEhrenamtliche: 0
  };
  z.letzteWoche = { besucher: besucherGesamt };   // für die Anzeige „Besucher letzte Woche“
  z.woche++;
  return rueckblick;
}

// Voraussichtliche Finanzen der laufenden Woche. Regeln folgen später – bis dahin 0.
// Einnahmen: was schon gebucht ist plus Kollekte, falls die Woche jetzt beendet würde. Ausgaben: bisher in dieser Woche.
export function finanzPrognose(z, raeume) {
  const plaetze = raumBereitschaft(z, raeume).filter(b => b.bereit).reduce((s, b) => s + b.stuehle.length, 0);
  const schon = Object.values(z.wochenbuch.einnahmen).reduce((a, b) => a + b, 0);
  return { einnahmen: schon + kollekte(plaetze), ausgaben: Object.values(z.wochenbuch.ausgaben).reduce((a, b) => a + b, 0) };
}
