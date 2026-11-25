// Inhaltsdatei: Veranstaltungen, die man in einem Raum einstellen kann.
// raumtypen: in welchen Räumen sie stattfinden können.
// leitung: wer sie leiten kann (später: Ausbildung statt fester Personen). Ohne Leitung im Raum findet sie nicht statt.
// Stühle begrenzen nur die Plätze.
export const VERANSTALTUNGEN = [
  { id: 'gottesdienst', name: 'Gottesdienst', raumtypen: ['gottesdienst'], leitung: ['pastor'] }
];
export const KEINE_VERANSTALTUNG = 'Keine';

// Gottesdienst am Sonntagvormittag (Lukas, 25.11.): Kollekte × diesen Wert
export const SONNTAGVORMITTAG = { tag: 6, slot: 'vormittag', kollekte: 2 };
