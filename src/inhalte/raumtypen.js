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
    einsatz: ['hauptamt', 'ehrenamt'], // wer hier als eingesetzt zählt
    einsatzBraucht: { ehrenamt: 'instrument' },   // Ehrenamtliche nur als Musiker: wenn mindestens ein Instrument im Raum steht
    kosten: null,
    moebel: [],
    erweiterungen: []
  },
  {
    id: 'kirchkaffee',
    name: 'Kirchkaffee',
    minGroesse: [4, 5],
    farbe: '#ecd9bd',
    verbindungZu: 'gottesdienst',   // braucht eine Verbindungstür zu einem Gottesdienstraum
    einsatz: ['ehrenamt'],          // nur Ehrenamtliche
    minBesetzung: 1,                // geöffnet ab so vielen Eingesetzten
    kosten: null,
    moebel: [],
    erweiterungen: []
  }
];
