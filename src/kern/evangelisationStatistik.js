// Zähler der Evangelisation (26.11. abends, Wunsch von Lukas: „damit man nachvollziehen kann, was das gerade bringt“).
// Eigene kleine Datei, weil sowohl evangelisation.js (vorbeigelaufen, angesprochen) als auch besucher.js (Eingeladene gekommen)
// hineinzählen – so hängen die beiden Dateien nicht im Kreis voneinander ab. Kennt keine Texte.
//   heute / dieseWoche: { vorbei, angesprochen, gekommen }
//   vorbei       = Passanten, die am Feld vorbeiliefen, während jemand vor Ort war
//   angesprochen = davon eingeladen (neugierig geworden)
//   gekommen     = Eingeladene, die tatsächlich zu ihrem Gottesdienst gekommen sind (gezählt am Tag, an dem sie kommen)
import { zeitpunkt } from './zeit.js';

const leer = () => ({ vorbei: 0, angesprochen: 0, gekommen: 0 });
function stand(z) {
  if (!z.evangelisation) z.evangelisation = { ma: {}, freiSeit: {} };
  const A = z.evangelisation, { woche, tag } = zeitpunkt(z.minuten), heute = woche * 7 + tag;
  if (!A.statistik) A.statistik = { tag: heute, woche, heute: leer(), dieseWoche: leer() };
  const S = A.statistik;
  if (S.woche !== woche) { S.woche = woche; S.dieseWoche = leer(); }
  if (S.tag !== heute) { S.tag = heute; S.heute = leer(); }
  return S;
}
export function zaehlen(z, was) { const S = stand(z); S.heute[was]++; S.dieseWoche[was]++; }
export function statistik(z) { const S = stand(z); return { heute: { ...S.heute }, dieseWoche: { ...S.dieseWoche } }; }
