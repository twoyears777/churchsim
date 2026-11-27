// Foyer (Spielprinzip von Lukas, 25.11.2026): Wer auf dem Weg zu seinem Platz durchs Foyer läuft, bekommt Haltung
// (nie Zufriedenheit) – für den Begrüßungsdienst (ein Ehrenamtlicher steht im Foyer) und für jede Garderobe/jeden Infotisch.
// Zahlen in src/inhalte/bau.js (FOYER) und src/inhalte/moebel.js (foyer.haltung).
import { FOYER } from '../inhalte/bau.js';
import { MOEBEL } from '../inhalte/moebel.js';
import { idx } from './karte.js';
import { moebelImRaum, hindernisBei } from './moebel.js';
import { eingesetztIn, daten } from './personen.js';
import { weg } from './wege.js';

// Was ein fertiges Foyer bringt → { haltung, begruessung (ja/nein), teile: [{ id, name, anzahl, haltung }] }
// dienst: im Schichtbetrieb (27.11.) die Foyers (Raum-Nummern), für die laut Dienstplan jemand begrüßt; sonst null = wer dort steht
export function foyerWert(z, raeume, raum, dienst = null) {
  if (!raum || !raum.typ || raum.typ.id !== 'foyer' || raum.probleme.length) return { haltung: 0, begruessung: false, teile: [] };
  const begruessung = dienst ? dienst.has(raum.nr) : z.personen.some(p => daten(p) && daten(p).art === 'ehrenamt' && eingesetztIn(z, raeume, p) === raum);
  let haltung = begruessung ? FOYER.begruessung : 0;
  const teile = [];
  for (const typ of MOEBEL.filter(m => m.foyer)) {
    const anzahl = moebelImRaum(z, raum, typ.id).length;
    haltung += anzahl * typ.foyer.haltung;
    teile.push({ id: typ.id, name: typ.name, anzahl, haltung: typ.foyer.haltung });
  }
  return { haltung, begruessung, teile };
}

// Fertige Foyers mit ihrem Wert (nur die, die etwas bringen)
export function foyers(z, raeume, dienst = null) {
  return raeume.liste.filter(r => r.typ && r.typ.id === 'foyer').map(r => ({ raum: r, ...foyerWert(z, raeume, r, dienst) })).filter(f => f.haltung > 0);
}

// Haltung für einen Besucher, der von `start` zu `ziel` läuft: jedes Foyer auf dem Weg zählt einmal.
// Der Weg ist derselbe kürzeste Weg um Wände und Möbel herum, den die Figuren gehen.
export function foyerBonus(z, raeume, start, ziel, liste = foyers(z, raeume)) {
  if (!liste.length || !start || !ziel) return 0;
  const blockiert = (x, y) => hindernisBei(z, x, y) || z.personen.some(p => p.x === x && p.y === y);
  const pfad = weg(z, start, ziel, blockiert);
  if (!pfad) return 0;
  const durch = new Set(pfad.map(p => raeume.gruppe[idx(z, p.x, p.y)]));
  return liste.filter(f => durch.has(f.raum.nr)).reduce((s, f) => s + f.haltung, 0);
}
