// Inhaltsdatei: alle Raumtypen. Neue Typen einfach als weiteren Eintrag ergänzen.
// minGroesse: [Breite, Länge] in Kästchen, gilt in beiden Richtungen.
// kosten, moebel, erweiterungen: vorbereitet für später, noch ohne Funktion.
export const RAUMTYPEN = [
  {
    id: 'gottesdienst',
    name: 'Gottesdienstraum',
    minGroesse: [5, 15],
    farbe: '#d8cdea',
    ersterTerminPflicht: true,   // Veranstaltung 1 ist immer ein Termin – steht dort „Keine“, fällt er aus (Stammgäste werden unzufrieden)
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
  },
  {
    // Gemeindesaal (Lukas, 25.11.): braucht eine Tür, mind. 5 × 10, Veranstaltungen wie im Gottesdienstraum
    id: 'gemeindesaal',
    name: 'Gemeindesaal',
    minGroesse: [5, 10],
    farbe: '#cfe0c8',               // PLATZHALTER-Farbe von Claude – Lukas legt sie fest
    einsatz: ['hauptamt', 'ehrenamt'],
    plaetze: [{ braucht: [] }, { braucht: [] }],   // Veranstaltung 1 und 2 von Anfang an (Lukas, 25.11.)
    kosten: null,
    moebel: [],
    erweiterungen: []
  }
];
