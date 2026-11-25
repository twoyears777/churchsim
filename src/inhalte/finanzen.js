// Inhaltsdatei: Grundwerte der Finanzen. Das Wirtschaftssystem wird später ausgebaut.
export const STARTGELD = 1000;              // Kontostand zu Spielbeginn (€) – Lukas, 25.11.: 1.000 € (wegen der Baukosten)
export const KOLLEKTE_PRO_BESUCHER = 1;     // € pro Besucher im Gottesdienst

// Kategorien
export const EINNAHMEN = { kollekte: 'Kollekte', kirchkaffee: 'Kirchkaffee', rueckerstattung: 'Rückerstattung', spende: 'Spende', dauerspende: 'Dauerspenden', ausgleich: 'Startgeld-Ausgleich' };   // Startgeld-Ausgleich: ENTWURF von Claude
export const AUSGABEN = { moebel: 'Möbel', kaffee: 'Kaffee', seelsorge: 'Seelsorge', plakat: 'Plakat', einzugsgebiet: 'Einzugsgebiet', forschung: 'Forschung', bau: 'Bau' };   // Forschung, Bau: ENTWURF von Claude

// Finanzübersicht (Spielprinzip vom 25.11.2026: Fenster mit dieser Woche, Kassenbuch und Verlauf)
export const VERLAUF_WOCHEN = 8;     // Platzhalter von Claude: so viele vergangene Wochen zeigt der Verlauf
export const KASSENBUCH_MAX = 500;   // Platzhalter von Claude: höchstens so viele Einzelbuchungen pro Woche im Kassenbuch

// Dauerspender (Spielprinzip von Lukas, 25.11.2026): Wer montags mindestens Haltungslevel `abLevel` hat (bis 25.11.: Haltung ab 80), wird mit `chance` Dauerspender.
// Spenden gehen montags um `stunde` Uhr ein: zuerst `start` €, jede Woche `steigerung` € mehr, höchstens `max` €.
// Geprüft wird nur montags; liegt das Level dann unter `abLevel`, endet die Dauerspende (wer wiederkommt, beginnt bei `start` €).
export const DAUERSPENDE = { abLevel: 3, chance: 0.75, start: 5, steigerung: 1, max: 20, stunde: 8 };
