// Inhaltsdatei: Veranstaltungen, die man in einem Raum einstellen kann.
// raumtypen: in welchen Räumen sie stattfinden können.
// leitung: wer sie leiten kann (später: Ausbildung statt fester Personen); minStuehle: Mindestzahl an Stühlen.
// proWochePflicht: davon muss jede Woche mindestens eine stattfinden, sonst kann die Woche nicht beendet werden.
export const VERANSTALTUNGEN = [
  { id: 'gottesdienst', name: 'Gottesdienst', raumtypen: ['gottesdienst'], leitung: ['pastor'], minStuehle: 3, proWochePflicht: true }
];
export const KEINE_VERANSTALTUNG = 'Keine';
