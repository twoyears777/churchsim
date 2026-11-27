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
    plaetze: [{ braucht: [] }, { braucht: [] }, { braucht: [], forschung: 'slot3saal' }],   // 1 und 2 von Anfang an (25.11.), 3 nach Forschung (26.11.)
    kosten: null,
    moebel: [],
    erweiterungen: []
  },
  {
    // Foyer (Lukas, 25.11.): mind. 4 × 4. Wer hindurchläuft, bekommt Haltung (Begrüßungsdienst, Garderobe, Infotisch – siehe bau.js).
    id: 'foyer',
    name: 'Foyer',
    minGroesse: [4, 4],
    farbe: '#e6dcc6',               // PLATZHALTER-Farbe von Claude – Lukas legt sie fest
    einsatz: ['ehrenamt'],          // Begrüßungsdienst: Ehrenamtliche
    kosten: null,
    moebel: [],
    erweiterungen: []
  },
  {
    // Toiletten (Lukas, 26.11.): Besucher gehen hierher, wenn das Bedürfnis Toilette hoch ist (siehe inhalte/toiletten.js).
    // Braucht eine Tür; zählt erst mit mindestens einer WC-Kabine. Größe und Farbe: PLATZHALTER von Claude – Lukas legt sie fest.
    id: 'toiletten',
    name: 'Toiletten',
    minGroesse: [2, 2],
    farbe: '#d3e3ea',
    einsatz: [],                    // hier arbeitet niemand
    kosten: null,
    moebel: [],
    erweiterungen: []
  },
  {
    // Lager (Lukas, 27.11.): mind. 3 × 2, braucht eine Tür, Farbe braun. Je Regal kann pro Zeitblock ein Ehrenamtlicher
    // für die Logistik eingeteilt werden (Kaffee einkaufen, Automaten auffüllen – siehe kern/dienst.js und kern/kirchkaffee.js).
    id: 'lager',
    name: 'Lager',
    minGroesse: [3, 2],
    farbe: '#c9a77c',               // braun (Lukas); genauer Farbton: Entwurf von Claude
    einsatz: ['ehrenamt'],          // Logistik: Ehrenamtliche
    kosten: null,
    moebel: [],
    erweiterungen: []
  },
  {
    // Büro (Lukas, 27.11.): mind. 2 × 2, braucht eine Tür, Farbe orange. Mit Schreibtisch kann pro Zeitblock ein Ehrenamtlicher
    // eingeteilt werden; jede Schicht bringt ein Orga-Token für Boni (siehe inhalte/buero.js und kern/buero.js).
    id: 'buero',
    name: 'Büro',
    minGroesse: [2, 2],
    farbe: '#f2b46d',               // orange (Lukas); genauer Farbton: Entwurf von Claude
    einsatz: ['ehrenamt'],
    kosten: null,
    moebel: [],
    erweiterungen: []
  }
];
