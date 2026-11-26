// Gesammelte Statistiken für das Fenster „Menschen im Ort“ (Lukas, 26.11.).
// Reine Auswertung der Zeilen aus spiel.menschen() – verändert nichts am Spielstand.
// Gruppen = Status: Ehrenamtliche, Stammgäste, Besucher, Neugierige, Passanten.

export const GRUPPEN = ['ehrenamtlich', 'stammgast', 'besucher', 'neugierig', 'passant'];
export const LEVEL_MAX = 5;

const schnitt = werte => werte.length ? werte.reduce((s, x) => s + x, 0) / werte.length : null;
const bekannt = (liste, feld) => liste.map(m => m[feld]).filter(x => typeof x === 'number');

// Zahlen für eine Menge von Menschen. woche = aktuelle Woche in derselben Zählung wie m.zuletzt.
function auswerten(liste, woche) {
  const level = Array(LEVEL_MAX).fill(0);
  for (const m of liste) if (typeof m.level === 'number' && m.level >= 1) level[Math.min(m.level, LEVEL_MAX) - 1]++;
  const jugend = liste.filter(m => m.jugend).length;
  return {
    anzahl: liste.length,
    haltung: schnitt(bekannt(liste, 'haltung')),   // Ø Haltung (0–100) der Menschen mit bekannter Haltung
    level,                                          // wie viele auf Haltungslevel 1 … 5
    jugend, erwachsene: liste.length - jugend,
    konfirmanden: liste.filter(m => m.konfirmand).length,
    besuche: schnitt(bekannt(liste, 'besuche')),
    kaffee: schnitt(bekannt(liste, 'kaffee')),      // Ø Kaffee-Vorliebe 0–1
    dieseWoche: liste.filter(m => m.zuletzt === woche).length
  };
}

export function menschenStatistik(zeilen, woche) {
  return {
    gruppen: GRUPPEN.map(status => ({ status, ...auswerten(zeilen.filter(m => m.status === status), woche) })),
    alle: auswerten(zeilen, woche)
  };
}
