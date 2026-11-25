// Inhaltsdatei: Grundwerte der Finanzen. Das Wirtschaftssystem wird später ausgebaut.
export const STARTGELD = 50;                // Kontostand zu Spielbeginn (€)
export const KOLLEKTE_PRO_BESUCHER = 1;     // € pro Besucher im Gottesdienst

// Kategorien
export const EINNAHMEN = { kollekte: 'Kollekte', kirchkaffee: 'Kirchkaffee', rueckerstattung: 'Rückerstattung', spende: 'Spende', dauerspende: 'Dauerspenden' };
export const AUSGABEN = { moebel: 'Möbel', kaffee: 'Kaffee', seelsorge: 'Seelsorge', plakat: 'Plakat', einzugsgebiet: 'Einzugsgebiet' };

// Finanzübersicht (Spielprinzip vom 25.11.2026: Fenster mit dieser Woche, Kassenbuch und Verlauf)
export const VERLAUF_WOCHEN = 8;     // Platzhalter von Claude: so viele vergangene Wochen zeigt der Verlauf
export const KASSENBUCH_MAX = 500;   // Platzhalter von Claude: höchstens so viele Einzelbuchungen pro Woche im Kassenbuch

// Dauerspender (Spielprinzip von Lukas, 25.11.2026): Wer montags eine Haltung ab `abHaltung` hat, wird mit `chance` Dauerspender.
// Spenden gehen montags um `stunde` Uhr ein: zuerst `start` €, jede Woche `steigerung` € mehr, höchstens `max` €.
// Geprüft wird nur montags; liegt die Haltung dann unter `abHaltung`, endet die Dauerspende (wer wiederkommt, beginnt bei `start` €).
export const DAUERSPENDE = { abHaltung: 80, chance: 0.75, start: 5, steigerung: 1, max: 20, stunde: 8 };
