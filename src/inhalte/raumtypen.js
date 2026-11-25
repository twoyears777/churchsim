// Inhaltsdatei: alle Raumtypen. Neue Typen einfach als weiteren Eintrag ergänzen.
// minGroesse: [Breite, Länge] in Kästchen, gilt in beiden Richtungen.
// kosten, moebel, erweiterungen: vorbereitet für später, noch ohne Funktion.
export const RAUMTYPEN = [
  {
    id: 'gottesdienst',
    name: 'Gottesdienstraum',
    minGroesse: [5, 15],
    farbe: '#d8cdea',
    // Welche Veranstaltungen hier eingestellt werden können: siehe veranstaltungen.js
    kosten: null,
    moebel: [],
    erweiterungen: []
  }
];
