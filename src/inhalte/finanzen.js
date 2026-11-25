// Inhaltsdatei: Grundwerte der Finanzen. Das Wirtschaftssystem wird später ausgebaut.
export const STARTGELD = 50;                // Kontostand zu Spielbeginn (€)
export const KOLLEKTE_PRO_BESUCHER = 1;     // € pro Besucher im Gottesdienst

// Kategorien
export const EINNAHMEN = { kollekte: 'Kollekte', kirchkaffee: 'Kirchkaffee', rueckerstattung: 'Rückerstattung', spende: 'Spende' };
export const AUSGABEN = { moebel: 'Möbel', kaffee: 'Kaffee', seelsorge: 'Seelsorge', plakat: 'Plakat', einzugsgebiet: 'Einzugsgebiet' };

// Finanzübersicht (Spielprinzip vom 25.11.2026: Fenster mit dieser Woche, Kassenbuch und Verlauf)
export const VERLAUF_WOCHEN = 8;     // Platzhalter von Claude: so viele vergangene Wochen zeigt der Verlauf
export const KASSENBUCH_MAX = 500;   // Platzhalter von Claude: höchstens so viele Einzelbuchungen pro Woche im Kassenbuch
