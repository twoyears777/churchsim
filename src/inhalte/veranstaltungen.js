// Inhaltsdatei: Veranstaltungen, die man in einem Raum einstellen kann.
// raumtypen: in welchen Räumen sie stattfinden können.
// leitung: welche Mitarbeiter-Art sie leiten muss (25.11.: jede Veranstaltung braucht einen Hauptamtlichen im Raum).
// braucht: Möbel, die im Raum stehen müssen. Stühle begrenzen nur die Plätze.
// haltungNachVorliebe: statt der festen Haltung für den Gottesdienst bekommt jeder Besucher Vorliebe × diesen Wert.
export const VERANSTALTUNGEN = [
  { id: 'gottesdienst', name: 'Gottesdienst', raumtypen: ['gottesdienst'], leitung: 'hauptamt', braucht: [] },
  { id: 'lobpreis', name: 'Lobpreisgottesdienst', raumtypen: ['gottesdienst'], leitung: 'hauptamt', braucht: ['gitarre'],
    haltungNachVorliebe: 10 }   // Lobpreis-Vorliebe 100 % → +10, 50 % → +5, 0 % → 0
];
export const KEINE_VERANSTALTUNG = 'Keine';

// Plätze für Veranstaltungen pro Raum (Lukas, 25.11.): am Anfang 1; Kanzel und Altar im Raum schalten den 2. frei.
// Fehlt später Kanzel oder Altar, bleibt Veranstaltung 2 eingestellt, fällt aber aus.
export const PLAETZE = [
  { braucht: [] },
  { braucht: ['kanzel', 'altar'] }
];
export const ZWEITER_PLATZ_STANDARD = { tag: 6, slot: 'abend' };   // vorgeschlagene Zeit für Veranstaltung 2, bis man sie ändert

// War ein Besucher in dieser Woche schon bei einer Veranstaltung, kommt er mit dieser Chance × normal (Lukas, 25.11.)
export const ZWEITER_BESUCH = 0.5;

// Gottesdienst und Lobpreisgottesdienst am Sonntagvormittag (Lukas, 25.11.): Kollekte × diesen Wert
export const SONNTAGVORMITTAG = { tag: 6, slot: 'vormittag', kollekte: 2 };
