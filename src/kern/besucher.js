// Besucher bekommen Namen aus den Namenslisten (gemischt, möglichst ohne Doppelte in derselben Woche).
import { NAMEN_ALLTAEGLICH, NAMEN_WORTSPIEL, ANTEIL_WORTSPIEL } from '../inhalte/namen.js';

export function namenZiehen(anzahl, zufall = Math.random) {
  const toepfe = { a: [], w: [] }, ergebnis = [];
  const ziehe = art => {
    if (!toepfe[art].length) toepfe[art] = [...(art === 'w' ? NAMEN_WORTSPIEL : NAMEN_ALLTAEGLICH)];
    return toepfe[art].splice(Math.floor(zufall() * toepfe[art].length), 1)[0];
  };
  for (let i = 0; i < anzahl; i++) {
    const voll = ziehe(zufall() < ANTEIL_WORTSPIEL ? 'w' : 'a');
    const leer = voll.indexOf(' ');
    ergebnis.push({ vorname: voll.slice(0, leer), nachname: voll.slice(leer + 1), voll });
  }
  return ergebnis;
}
