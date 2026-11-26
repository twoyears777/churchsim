// Inhaltsdatei: Veranstaltungen, die man in einem Raum einstellen kann.
// raumtypen: in welchen Räumen sie stattfinden können.
// leitung: welche Mitarbeiter-Art sie leiten muss (25.11.: jede Veranstaltung braucht einen Hauptamtlichen im Raum).
// braucht: Möbel, die im Raum stehen müssen. Stühle begrenzen nur die Plätze.
// haltungNachVorliebe: statt der festen Haltung für den Gottesdienst bekommt jeder Besucher Vorliebe × diesen Wert.
export const VERANSTALTUNGEN = [
  { id: 'gottesdienst', name: 'Gottesdienst', raumtypen: ['gottesdienst'], leitung: 'hauptamt', braucht: [] },
  { id: 'lobpreis', name: 'Lobpreisgottesdienst', raumtypen: ['gottesdienst'], leitung: 'hauptamt', braucht: ['gitarre'],
    haltungNachVorliebe: 10 },  // Lobpreis-Vorliebe 100 % → +10, 50 % → +5, 0 % → 0
  // Jugendgottesdienst (Lukas, 26.11.: claude/spielprinzip-jugendgottesdienst-dritter-slot.md): Haltung wie beim Gottesdienst.
  // musikerMin: so viele Ehrenamtliche müssen spielen (jeder an einem eigenen Instrument). kollekteFaktor: Kollekte × diesen Wert.
  // erwachsene: Faktor auf die Chance zu kommen für Erwachsene (Jugendliche: JUGEND.faktor in besucher.js).
  // musikFaktor: false = die Lobpreis-Vorliebe wirkt nicht darauf, ob jemand kommt (auf die Haltung schon, wie beim Gottesdienst).
  // spass: 'jugend' = erfüllt das Bedürfnis Spaß nur für Jugendliche. fest: false = nicht als Fest im Kirchenjahr wählbar.
  { id: 'jugend', name: 'Jugendgottesdienst', raumtypen: ['gottesdienst'], leitung: 'hauptamt', braucht: [],
    musikerMin: 2, kollekteFaktor: 0.5, erwachsene: 0.1, musikFaktor: false, spass: 'jugend', fest: false },

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
    bekanntheit: false, neueBesucher: false, konfiTeilnahme: true, kollekte: false, kirchkaffee: false, spende: false },
  // Spielenachmittag (Lukas, 25.11.: claude/spielprinzip-beduerfnisse-wochenende.md): erfüllt das Bedürfnis Spaß.
  // leitungOder: ein Hauptamtlicher ODER ein Ehrenamtlicher reicht. amTisch: nur Stühle direkt an einem Tisch sind Plätze
  // (bis zu 4 je Tisch), mindestens stuehleMin davon. slots: nur nachmittags oder abends. dauer: 2 Stunden.
  // haltung: +7 je Teilnehmer, kein Extra-Plus für den Sitzplatz (bessere Stühle wirken wie bei den anderen Veranstaltungen im Saal).
  // spendeImmer: jeder Teilnehmer gibt beim Gehen zufällig min … max € (ganze Euro, auch 0). Basisversion kostet nichts.
  { id: 'spiele', name: 'Spielenachmittag', raumtypen: ['gemeindesaal'], leitung: ['hauptamt', 'ehrenamt'], leitungOder: true, braucht: ['tisch'],
    amTisch: true, stuehleMin: 2, slots: ['nachmittag', 'abend'], dauer: 120, haltung: 7, sitzplatzHaltung: false, spass: true,
    kollekte: false, kirchkaffee: false, spende: true, spendeImmer: { min: 0, max: 3 } }
];
// Spontane Spende im Gemeindesaal (Lukas, 25.11.): jeder anwesende Besucher mit dieser Chance zufällig min … max € (ganze Euro)
export const SPONTANE_SPENDE = { chance: 0.1, min: 1, max: 3 };
export const KEINE_VERANSTALTUNG = 'Keine';

// Plätze für Veranstaltungen pro Raum (Lukas, 25.11.): am Anfang 1; Kanzel und Altar im Raum schalten den 2. frei.
// Gilt für den Gottesdienstraum; andere Raumtypen können eigene Plätze haben (raumtypen.js → plaetze).
// Fehlt später Kanzel oder Altar, bleibt Veranstaltung 2 eingestellt, fällt aber aus.
export const PLAETZE = [
  { braucht: [] },
  { braucht: ['kanzel', 'altar'] },
  { braucht: [], forschung: 'slot3gottesdienst' }   // Veranstaltung 3: erst nach der Forschung (Lukas, 26.11.)
];
export const ZWEITER_PLATZ_STANDARD = { tag: 6, slot: 'abend' };   // vorgeschlagene Zeit für Veranstaltung 2, bis man sie ändert
export const DRITTER_PLATZ_STANDARD = { tag: 4, slot: 'abend' };   // Veranstaltung 3: Freitagabend (VORSCHLAG von Claude)

// War ein Besucher in dieser Woche schon bei einer Veranstaltung, kommt er mit dieser Chance × normal (Lukas, 25.11.)
export const ZWEITER_BESUCH = 0.5;

// Sonntagsbonus (Lukas, 25.11.; seit 26.11. den ganzen Sonntag): Kollekte aller Gottesdienstarten × diesen Wert.
// Spenden im Gemeindesaal und Einnahmen des Kirchkaffees bekommen ihn nicht (Lukas, 26.11.).
export const SONNTAG = { tag: 6, kollekte: 2 };
