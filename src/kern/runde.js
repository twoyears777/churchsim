// Rundenablauf: wann die Woche beendet werden kann und was dann passiert.
import { RAUMTYPEN } from '../inhalte/raumtypen.js';
import { moebelImRaum } from './moebel.js';
import { idx } from './karte.js';

// Prüft jeden Raum mit Funktion: ist die Mindestbesetzung erfüllt?
export function raumBereitschaft(z, raeume) {
  const ergebnis = [];
  for (const r of raeume.liste) {
    if (!r.typ || r.probleme.length) continue;
    const zellen = new Set(r.zellen);
    const leitung = z.personen.filter(p => (r.typ.leitung || []).includes(p.id) && zellen.has(idx(z, p.x, p.y)));
    const stuehle = moebelImRaum(z, r, 'stuhl');
    const fehlt = [];
    if (r.typ.leitung && !leitung.length) fehlt.push('leitung');
    if ((r.typ.minStuehle || 0) > stuehle.length) fehlt.push('stuehle');
    ergebnis.push({ raum: r, typ: r.typ, stuehle, fehlt, bereit: fehlt.length === 0 });
  }
  return ergebnis;
}

// Woche beenden ist möglich, sobald mindestens ein Gottesdienstraum bereit ist.
export function kannWocheBeenden(z, raeume) {
  return raumBereitschaft(z, raeume).some(b => b.typ.id === 'gottesdienst' && b.bereit);
}

// Führt die Woche aus und liefert den Wochenrückblick. Regeln für Besucherzahl,
// Finanzen und neue Ehrenamtliche folgen später; im Moment: Besucher = Stühle.
export function wocheBeenden(z, raeume) {
  const bereit = raumBereitschaft(z, raeume).filter(b => b.bereit);
  const angebote = RAUMTYPEN.map(t => {
    const plaetze = bereit.filter(b => b.typ.id === t.id).flatMap(b => b.stuehle.map(s => ({ x: s.x, y: s.y })));
    return { typ: t.id, name: t.name, besucher: plaetze.length, plaetze };
  }).filter(a => a.besucher > 0);
  const rueckblick = {
    woche: z.woche,
    finanzen: { einnahmen: 0, ausgaben: 0 },
    angebote,
    neueEhrenamtliche: 0
  };
  z.woche++;
  return rueckblick;
}

// Voraussichtliche Finanzen der laufenden Woche. Regeln folgen später – bis dahin 0.
export function finanzPrognose(z, raeume) {
  return { einnahmen: 0, ausgaben: 0 };
}
