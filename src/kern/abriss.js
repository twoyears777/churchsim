// Abriss-Wert (Lukas, 27.11.2026): Beim Abriss gibt es nicht mehr alles zurück, sondern anfangs nur einen Anteil
// (ABRISS.anteil, die Hälfte). Mit jeder vollen Woche seit dem Bauen sinkt er um gleich viel, nach ABRISS.wochen Wochen
// gibt es nichts mehr: 50 %, 45 %, 40 % … 0 %. Gilt für Wände, Türen, Fenster und Möbel samt Verbesserungen.
// „Rückgängig“ ist davon nicht betroffen (dort wird der Bau-Schritt ganz zurückgenommen).
// Wann etwas gebaut wurde: Möbel merken es selbst (m.gebaut), Wandstücke stehen in z.bauzeit (Kästchen → Spielminute),
// Türen und Fenster in z.zusatzzeit. Fehlt die Angabe, zählt es wie gerade gebaut.
import { ABRISS } from '../inhalte/bau.js';
import { WOCHE_MIN } from './zeit.js';
import { TUER, FENSTER, istWandStueck } from './karte.js';

const cent = x => Math.round(x * 100) / 100;
const jetzt = z => (typeof z.minuten === 'number' ? z.minuten : 0);

// Volle Wochen seit dem Bauen
export function alterWochen(z, gebaut) {
  return typeof gebaut === 'number' ? Math.max(0, Math.floor((jetzt(z) - gebaut) / WOCHE_MIN)) : 0;
}
// Anteil des Preises, den es beim Abriss zurückgibt (0 … ABRISS.anteil)
export function abrissAnteil(z, gebaut) {
  return Math.max(0, ABRISS.anteil * (1 - alterWochen(z, gebaut) / ABRISS.wochen));
}
export const abrissWert = (z, preis, gebaut) => cent(preis * abrissAnteil(z, gebaut));

// Spielstände vor dieser Regel (und neue Spiele): alles schon Gebaute zählt wie heute gebaut (Lukas, 27.11.).
export function abrissAnlegen(z) {
  if (!z.bauzeit || !z.zusatzzeit) {
    z.bauzeit = {}; z.zusatzzeit = {};
    z.zellen.forEach((t, i) => {
      if (istWandStueck(t)) z.bauzeit[i] = jetzt(z);
      if (t === TUER || t === FENSTER) z.zusatzzeit[i] = jetzt(z);
    });
  }
  for (const m of z.moebel || []) if (typeof m.gebaut !== 'number') m.gebaut = jetzt(z);
}
