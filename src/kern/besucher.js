// Besucher bekommen Namen aus den Namenslisten (gemischt, möglichst ohne Doppelte in derselben Woche).
import { NAMEN_ALLTAEGLICH, NAMEN_WORTSPIEL, ANTEIL_WORTSPIEL } from '../inhalte/namen.js';
import { WIEDERKOMMEN, EHRENAMT_AB_BESUCHEN, EHRENAMT_QUOTE } from '../inhalte/besucher.js';

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

// Stammbesucher: Die Gemeinde merkt sich jeden Besucher mit Namen und Anzahl der Gottesdienstbesuche.
export function stammAnlegen(z) { if (!Array.isArray(z.stamm)) z.stamm = []; }

// Wer kommt diese Woche? Bekannte Besucher kommen mit WIEDERKOMMEN-Wahrscheinlichkeit wieder,
// freie Plätze füllen neue Besucher. Jeder Anwesende bekommt einen Besuch gutgeschrieben.
export function besucherDerWoche(z, plaetze, zufall = Math.random) {
  stammAnlegen(z);
  let wieder = z.stamm.filter(() => zufall() < WIEDERKOMMEN);
  while (wieder.length > plaetze) wieder.splice(Math.floor(zufall() * wieder.length), 1);
  const vergeben = new Set(z.stamm.map(b => b.voll));
  const neue = [];
  for (const n of namenZiehen(plaetze - wieder.length + 20, zufall)) {
    if (neue.length >= plaetze - wieder.length) break;
    if (vergeben.has(n.voll) && vergeben.size < NAMEN_ALLTAEGLICH.length + NAMEN_WORTSPIEL.length) continue;   // Namen möglichst nicht doppelt
    vergeben.add(n.voll);
    neue.push({ ...n, besuche: 0 });
  }
  while (neue.length < plaetze - wieder.length) { const [n] = namenZiehen(1, zufall); neue.push({ ...n, besuche: 0 }); }
  z.stamm.push(...neue);
  const da = [...wieder, ...neue];
  for (const b of da) b.besuche++;
  return da;
}

// Wer aus den Anwesenden wird Ehrenamtlicher? Wird aus dem Stamm genommen und zurückgegeben.
export function ehrenamtWerden(z, anwesende, zufall = Math.random) {
  const werden = anwesende.filter(b => b.besuche >= EHRENAMT_AB_BESUCHEN && zufall() < EHRENAMT_QUOTE);
  z.stamm = z.stamm.filter(b => !werden.includes(b));
  return werden;
}
