// Inhaltsdatei: Regeln für Besucher, Zufriedenheit, Bekanntheit und den Weg ins Ehrenamt.
// Zahlen von Lukas freigegeben (25.11.), nach dem Testen leicht anpassbar.
export const START_STAMMGAESTE = 4;       // so viele Stammgäste gibt es bei Spielbeginn
export const START_ZUFRIEDENHEIT = 60;    // ... mit dieser Zufriedenheit
export const NEU_ZUFRIEDENHEIT = 50;      // neue Besucher starten mit dieser Zufriedenheit
export const MIN_CHANCE = 0.1;            // Chance zu kommen = Zufriedenheit in %, aber mindestens 10 %
// Kaffee: Jeder Mensch hat einen festen Kaffee-Wert 0–100 % (wie die Lobpreis-Vorliebe). Er ersetzt seit 25.11. das Ja/Nein:
// Nach dem Gottesdienst und beim Vorbeilaufen am offenen Kirchkaffee will er mit dieser Chance einen Kaffee.

// Lobpreis-Vorliebe und Musik (Spielprinzip von Lukas, 25.11.; v = Vorliebe 0–1):
// Normaler Gottesdienst mit Lobpreisteam: Chance zu kommen × (mitMusik + v); ohne Lobpreisteam: × (ohneMusik − v); höchstens 100 %.
// Haltung durch das Lobpreisteam (Gottesdienst und Lobpreisgottesdienst): Bonus × (haltungFaktor × v − 1), kann ins Minus gehen.
export const LOBPREIS_MUSIK = { mitMusik: 0.5, ohneMusik: 1.5, haltungFaktor: 2 };

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

// Jugendliche (Lukas, 25.11.): 20 % aller Menschen (Besucher und Passanten) sind Jugendliche.
// Kommchance = normale (haltungsabhängige) Kommchance × Faktor der Veranstaltung. Nicht aufgeführt: × 1.
// Später (Jugendgottesdienst): dort höher.
export const JUGEND = { anteil: 0.2, faktor: { gottesdienst: 0.5, lobpreis: 0.5, senioren: 0, chorprobe: 0.2, konfi: 0.6 } };
// Konfirmandenunterricht (Lukas, 25.11.): so viele Teilnahmen in einem Jahrgang (von Konfirmation zu Konfirmation) → Konfirmand
export const KONFI = { teilnahmen: 7 };

export const EHRENAMT_AB_BESUCHEN = 3;  // ab so vielen Gottesdienstbesuchen ...
export const EHRENAMT_QUOTE = 0.05;     // ... wird man mit dieser Wahrscheinlichkeit pro Woche Ehrenamtlicher
