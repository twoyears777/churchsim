// Bühne (Spielprinzip von Lukas, 27.11.2026): Bodentyp im Gottesdienstraum. Kennt keine Grafik und keine Texte.
//   • Man zieht eine Fläche auf; jedes freie Kästchen im Inneren eines Gottesdienstraums wird Bühne (BUEHNE.kosten je Kachel).
//   • Auf der Bühne darf alles stehen (Möbel, Stühle, Figuren). Was die Möbel darauf bringen, rechnet moebel.js.
//   • Gespeichert in z.buehne: Kästchen-Nummer → Spielminute, wann es gebaut wurde (für den Abriss-Wert wie bei Möbeln).
//   • Wird eine Wand über eine Bühnenkachel gebaut, verschwindet sie (wie ein Möbel). Ist der Raum (gerade) kein
//     Gottesdienstraum, bleibt die Bühne gespeichert, wirkt und erscheint aber nicht – bis der Raum wieder einer ist.
import { BUEHNE } from '../inhalte/moebel.js';
import { LEER, idx } from './karte.js';
import { kannBezahlen, buchen } from './finanzen.js';
import { abrissWert } from './abriss.js';

export function buehneAnlegen(z) { if (!z.buehne || typeof z.buehne !== 'object') z.buehne = {}; }
const hat = (z, i) => !!z.buehne && Object.prototype.hasOwnProperty.call(z.buehne, i);
export const istBuehne = (z, x, y) => hat(z, idx(z, x, y));
// Wie viele Bühnenkacheln hat dieser Raum?
export function buehneImRaum(z, raum) { return raum && raum.zellen ? raum.zellen.reduce((n, i) => n + (hat(z, i) ? 1 : 0), 0) : 0; }
// Alle Bühnenkacheln, die gerade in einem Gottesdienstraum liegen (für die Karte)
export function sichtbareBuehne(z, raeume) {
  return Object.keys(z.buehne || {}).map(Number).filter(i => { const r = raeume.liste[raeume.gruppe[i]]; return r && r.typ && r.typ.id === BUEHNE.raumtyp; })
    .map(i => ({ x: i % z.w, y: Math.floor(i / z.w) }));
}
const rechteck = (x0, y0, x1, y1) => [Math.min(x0, x1), Math.max(x0, x1), Math.min(y0, y1), Math.max(y0, y1)];

// Fläche bauen → { gebaut, ergebnis: 'ok' | 'geld' (nicht alles bezahlbar) | 'raum' (kein Kästchen im Gottesdienstraum) | 'platz' (schon alles Bühne) }
export function buehneBauen(z, raeume, x0, y0, x1, y1) {
  buehneAnlegen(z);
  const [ax, bx, ay, by] = rechteck(x0, y0, x1, y1);
  let gebaut = 0, imRaum = 0, geld = false;
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
    if (x < 0 || y < 0 || x >= z.w || y >= z.h) continue;
    const i = idx(z, x, y), r = raeume.liste[raeume.gruppe[i]];
    if (!r || !r.typ || r.typ.id !== BUEHNE.raumtyp || z.zellen[i] !== LEER) continue;
    imRaum++;
    if (hat(z, i)) continue;
    if (!kannBezahlen(z, (gebaut + 1) * BUEHNE.kosten)) { geld = true; continue; }
    z.buehne[i] = typeof z.minuten === 'number' ? z.minuten : 0; gebaut++;
  }
  if (gebaut) buchen(z, 'ausgaben', 'bau', gebaut * BUEHNE.kosten, { was: 'buehne', kacheln: gebaut });
  return { gebaut, ergebnis: geld ? 'geld' : gebaut ? 'ok' : imRaum ? 'platz' : 'raum' };
}
// Abriss: Bühnenkacheln im Rechteck weg, zurück gibt es den Abriss-Wert (abriss.js) → Betrag
export function buehneAbreissen(z, x0, y0, x1, y1) {
  if (!z.buehne) return 0;
  const [ax, bx, ay, by] = rechteck(x0, y0, x1, y1);
  let betrag = 0, kacheln = 0;
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
    if (x < 0 || y < 0 || x >= z.w || y >= z.h) continue;
    const i = idx(z, x, y);
    if (!hat(z, i)) continue;
    betrag += abrissWert(z, BUEHNE.kosten, z.buehne[i]); kacheln++;
    delete z.buehne[i];
  }
  betrag = Math.round(betrag * 100) / 100;
  if (betrag) buchen(z, 'einnahmen', 'rueckerstattung', betrag, { was: 'buehne', kacheln });
  return betrag;
}
// Nach dem Bauen: Bühne unter neuen Wänden verschwindet
export function buehnePruefen(z) {
  for (const k of Object.keys(z.buehne || {})) if (z.zellen[k] !== LEER) delete z.buehne[k];
}
