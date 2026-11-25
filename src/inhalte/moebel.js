// Inhaltsdatei: Möbel, die man im Editor aufstellen kann. Jedes Möbel belegt 1 Kästchen.
// kosten: Kaufpreis in €, wird sofort vom Konto abgezogen; beim Abriss volle Rückerstattung.
// Namen sind Platzhalter – Lukas legt sie fest.
export const MOEBEL = [
  { id: 'stuhl', name: 'Stuhl', kosten: 5 },
  { id: 'kaffeemaschine', name: 'Kaffeemaschine', kosten: 50, fassung: 30, startFuellung: 0 },  // für das Kirchkaffee
  { id: 'theke', name: 'Theke', kosten: 20 },  // für das Kirchkaffee; mehrere Thekenteile nebeneinander = eine Theke

  // Ausstattung des Gottesdienstraums (Spielprinzip vom 25.11.). Wirkt nur im Gottesdienstraum.
  // max: höchstens so viele pro Raum (mehr kann man nicht aufstellen).
  // wirkung.haltung: + Haltung für jeden Besucher pro Gottesdienst (pro Stück)
  // wirkung.kollekte: Kollekte × diesen Wert (pro Stück)
  // wirkung.musik: Bedingung, damit ein Ehrenamtlicher im Raum Musik macht
  { id: 'kanzel', name: 'Kanzel', kosten: 30, max: 1, wirkung: { haltung: 2 } },
  { id: 'altar', name: 'Altar', kosten: 40, max: 1, wirkung: { kollekte: 1.2 } },
  { id: 'blumen', name: 'Blumen', kosten: 10, max: 4, wirkung: { haltung: 1 } },
  { id: 'gruenpflanze', name: 'Grünpflanze', kosten: 10, max: 4, wirkung: { kollekte: 1.05 } },
  { id: 'gitarre', name: 'Gitarre', kosten: 25, max: 1, wirkung: { musik: true } }
];

// Stühle verbessern: Stufe 1 ist der gekaufte Stuhl. upgrade = Preis für den Schritt auf diese Stufe.
// haltung: + Haltung pro Gottesdienst für den, der darauf sitzt. kollekte: Kollekte dieser Person × Wert.
export const STUHL_STUFEN = [
  { stufe: 1, name: 'Holzstuhl', upgrade: 0, haltung: 0, kollekte: 1 },
  { stufe: 2, name: 'Polsterstuhl', upgrade: 20, haltung: 2, kollekte: 1.2 },
  { stufe: 3, name: 'Komfortstuhl', upgrade: 60, haltung: 4, kollekte: 1.4 },
  { stufe: 4, name: 'Ehrenstuhl', upgrade: 150, haltung: 6, kollekte: 1.6 }
];

// Ein Ehrenamtlicher im Gottesdienstraum spielt Musik, wenn eine Gitarre im Raum steht (ohne Musik-Skill).
export const MUSIK = { kollekte: 1.1 };
