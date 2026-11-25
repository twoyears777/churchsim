// Besucher bekommen Vornamen aus der Namensliste. Möglichst keine doppelten Namen in derselben Woche.
import { VORNAMEN } from '../inhalte/namen.js';

export function namenZiehen(anzahl, zufall = Math.random) {
  const ergebnis = [];
  let topf = [];
  for (let i = 0; i < anzahl; i++) {
    if (!topf.length) topf = [...VORNAMEN];
    ergebnis.push(topf.splice(Math.floor(zufall() * topf.length), 1)[0]);
  }
  return ergebnis;
}
