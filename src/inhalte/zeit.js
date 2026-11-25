// Inhaltsdatei: die Zeit im Spiel (Echtzeit statt Runden).
export const SEKUNDEN_PRO_STUNDE = 12;         // 1 Spielstunde dauert bei x1 so viele echte Sekunden (Lukas, 25.11.: vorher 3)
export const TEMPI = [0, 1, 2, 5, 10, 25];     // Zeit-Knöpfe: Pause, x1, x2, x5, x10, x25 (x10/x25 seit 25.11.)

// Slots im Wochenplan: Beginn der Veranstaltung (volle Stunde)
export const SLOTS = [
  { id: 'vormittag', stunde: 10 },
  { id: 'nachmittag', stunde: 15 },
  { id: 'abend', stunde: 19 }
];
export const SPIELBEGINN = { tag: 0, stunde: 8 };            // Montag 8:00 der ersten Woche (Tag 0 = Montag … 6 = Sonntag)
export const STANDARD_PLAN = { tag: 6, slot: 'vormittag' };  // bei Spielbeginn: Sonntag vormittags
export const DAUER = { gottesdienst: 60, kirchkaffee: 120 };  // Spielminuten; Kirchkaffee nach dem Gottesdienst 2 Stunden (Lukas, 25.11.)

// Laufen der Besucher (in Spielminuten, damit es mit den Zeit-Knöpfen schneller und langsamer wird)
export const ANREISE_VORLAUF = 180;   // so viele Minuten vor Beginn machen sich die Besucher auf den Weg
export const LAUFTEMPO = 0.25;        // Kästchen pro Spielminute (25.11.: halbiert, damit man Figuren besser anklicken kann)
export const ABSTAND = 2;             // Spielminuten zwischen zwei Besuchern
