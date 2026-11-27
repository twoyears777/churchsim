// Merkzettel für einen Rechendurchgang (Leistung, 27.11.2026).
// Während die Zeit läuft (ein Bild = ein Durchgang von zeitVorruecken) und während einer Abfrage wie lage() oder karte()
// kann niemand bauen: Wände, Türen und Möbel stehen fest. Was nur davon abhängt (Möbel-Verzeichnis, Wiesen-Karte,
// Wege der Mitarbeiter), wird deshalb pro Durchgang nur einmal ausgerechnet und danach weggeworfen.
// Außerhalb eines Durchgangs (z. B. beim Bauen) wird wie bisher jedes Mal frisch gerechnet.
let aktiv = null;

// fn in einem Durchgang ausführen. Läuft schon einer (z. B. lage() ruft intern weitere Abfragen auf), wird er mitbenutzt.
export function imDurchgang(fn) {
  if (aktiv) return fn();
  aktiv = new Map();
  try { return fn(); } finally { aktiv = null; }
}

// Wert für (z, name) im laufenden Durchgang merken bzw. wiederholen; ohne Durchgang einfach ausrechnen.
export function gemerkt(z, name, rechnen) {
  if (!aktiv) return rechnen();
  let fach = aktiv.get(z);
  if (!fach) aktiv.set(z, fach = new Map());
  if (!fach.has(name)) fach.set(name, rechnen());
  return fach.get(name);
}
