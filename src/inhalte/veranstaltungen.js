// Inhaltsdatei: Veranstaltungen, die man in einem Raum einstellen kann.
// raumtypen: in welchen Räumen sie stattfinden können.
// leitung: welche Mitarbeiter-Art sie leiten muss (25.11.: jede Veranstaltung braucht einen Hauptamtlichen im Raum).
// braucht: Möbel, die im Raum stehen müssen. Stühle begrenzen nur die Plätze.
// haltungNachVorliebe: statt der festen Haltung für den Gottesdienst bekommt jeder Besucher Vorliebe × diesen Wert.
export const VERANSTALTUNGEN = [
  { id: 'gottesdienst', name: 'Gottesdienst', raumtypen: ['gottesdienst'], leitung: 'hauptamt', braucht: [] },
  { id: 'lobpreis', name: 'Lobpreisgottesdienst', raumtypen: ['gottesdienst'], leitung: 'hauptamt', braucht: ['gitarre'],
    haltungNachVorliebe: 10 },  // Lobpreis-Vorliebe 100 % → +10, 50 % → +5, 0 % → 0

  // ---- Gemeindesaal (Lukas, 25.11.) ----
  // Besucher kommen, bekommen Haltung, manchmal spontane Spende (SPONTANE_SPENDE); keine Kollekte, kein Kirchkaffee.
  // leitung als Liste: alle diese Mitarbeiter-Arten müssen im Raum sein. stuehleMin: so viele Stühle müssen im Raum stehen.
  // haltung: feste Haltung für die Veranstaltung. stuehleBegrenzen: false = jeder Besucher passt hinein, Stühle egal.
  // musikLevelMin: ein eingesetzter Ehrenamtlicher braucht mindestens dieses Musik-Level.
  // haltungNachMusik: Haltung + Musik-Bonus des besten Ehrenamtlichen × aktuelle Haltung (wie Lobpreisteam, ohne Lobpreis-Vorliebe)
  { id: 'senioren', name: 'Seniorennachmittag', raumtypen: ['gemeindesaal'], leitung: ['hauptamt', 'ehrenamt'], braucht: ['tisch'],
    stuehleMin: 2, haltung: 5, kollekte: false, kirchkaffee: false, spende: true },
  { id: 'chorprobe', name: 'Kirchenchorprobe', raumtypen: ['gemeindesaal'], leitung: ['ehrenamt'], braucht: ['klavier'],
    musikLevelMin: 1, haltungNachMusik: true, stuehleBegrenzen: false, kollekte: false, kirchkaffee: false, spende: true },
  // Konfirmandenunterricht (Lukas, 25.11.: claude/spielprinzip-konfirmandenunterricht.md): bringt nur Haltung.
  // haltungJeEhrenamt / ehrenamtMax: jeder eingesetzte Ehrenamtliche + so viel Haltung, höchstens so viele zählen.
  // sitzplatzHaltung: false = der Sitzplatz ist nur Bedingung, kein Haltungs-Plus. nurJugend: nur Jugendliche kommen.
  // bekanntheit: false = keine Bekanntheit. neueBesucher: false = keine neuen Besucher über die Bekanntheit.
  // konfiTeilnahme: zählt für die Konfirmation (KONFI in besucher.js).
  { id: 'konfi', name: 'Konfirmandenunterricht', raumtypen: ['gemeindesaal'], leitung: 'hauptamt', braucht: [],
    stuehleMin: 1, haltung: 5, haltungJeEhrenamt: 2, ehrenamtMax: 3, sitzplatzHaltung: false, nurJugend: true,
    bekanntheit: false, neueBesucher: false, konfiTeilnahme: true, kollekte: false, kirchkaffee: false, spende: false }
];
// Spontane Spende im Gemeindesaal (Lukas, 25.11.): jeder anwesende Besucher mit dieser Chance zufällig min … max € (ganze Euro)
export const SPONTANE_SPENDE = { chance: 0.1, min: 1, max: 3 };
export const KEINE_VERANSTALTUNG = 'Keine';

// Plätze für Veranstaltungen pro Raum (Lukas, 25.11.): am Anfang 1; Kanzel und Altar im Raum schalten den 2. frei.
// Gilt für den Gottesdienstraum; andere Raumtypen können eigene Plätze haben (raumtypen.js → plaetze).
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
