// Inhaltsdatei: alle Raumtypen. Neue Typen einfach als weiteren Eintrag ergänzen.
// minGroesse: [Breite, Länge] in Kästchen, gilt in beiden Richtungen.
// kosten, moebel, erweiterungen: vorbereitet für später, noch ohne Funktion.
export const RAUMTYPEN = [
  {
    id: 'gottesdienst',
    name: 'Gottesdienstraum',
    minGroesse: [5, 15],
    farbe: '#d8cdea',
    // Mindestbesetzung, damit die Woche beendet werden kann:
    // wer den Raum leiten kann (später: Ausbildung statt fester Personen) und wie viele Stühle mindestens stehen.
    leitung: ['pastor'],
    minStuehle: 3,
    kosten: null,
    moebel: [],
    erweiterungen: []
  }
];
