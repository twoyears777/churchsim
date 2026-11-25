// Inhaltsdatei: Regeln für Besucher, Zufriedenheit, Bekanntheit und den Weg ins Ehrenamt.
// Zahlen von Lukas freigegeben (25.11.), nach dem Testen leicht anpassbar.
export const START_STAMMGAESTE = 4;       // so viele Stammgäste gibt es bei Spielbeginn
export const START_ZUFRIEDENHEIT = 60;    // ... mit dieser Zufriedenheit
export const NEU_ZUFRIEDENHEIT = 50;      // neue Besucher starten mit dieser Zufriedenheit
export const MIN_CHANCE = 0.1;            // Chance zu kommen = Zufriedenheit in %, aber mindestens 10 %
export const KAFFEE_ANTEIL = 0.5;         // etwa die Hälfte will Kaffee (einmal ausgelost, bleibt fest)

// Änderung der Zufriedenheit nach jedem Gottesdienst
export const AENDERUNG = {
  sitzplatz: 5,          // Sitzplatz bekommen
  heimgeschickt: -15,    // kein Stuhl frei
  gottesdienst: 5,       // Mitarbeiter hat Gottesdienst gehalten
  kaffeeJa: 5,           // wollte Kaffee und bekommen
  kaffeeNein: -10,       // wollte Kaffee, keinen bekommen
  ausfall: -5            // kein Gottesdienst (kein Mitarbeiter): jeder Stammgast
};

// Bekanntheit der Gemeinde (0–100)
export const BEKANNTHEIT = {
  // 25.11.: alle Werte ÷ 5, damit die Bekanntheit sehr langsam wächst (vorher 3 / 1)
  proGottesdienst: 0.6,    // pro stattfindendem Gottesdienst
  sehrZufrieden: 80,       // ab dieser Zufriedenheit ...
  proSehrZufriedenem: 0.2, // ... gibt es pro anwesendem Besucher so viel Bekanntheit
  protokoll: 10,           // so viele letzte Änderungen merkt sich das Spiel fürs Bekanntheit-Fenster
  teiler: 10             // neue Besucher pro Woche im Schnitt = Bekanntheit ÷ 10
};

export const EHRENAMT_AB_BESUCHEN = 3;  // ab so vielen Gottesdienstbesuchen ...
export const EHRENAMT_QUOTE = 0.05;     // ... wird man mit dieser Wahrscheinlichkeit pro Woche Ehrenamtlicher
