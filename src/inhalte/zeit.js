// Inhaltsdatei: die Zeit im Spiel (Echtzeit statt Runden).
export const SEKUNDEN_PRO_STUNDE = 3;          // 1 Spielstunde dauert bei x1 so viele echte Sekunden
export const TEMPI = [0, 1, 2, 5];             // Zeit-Knöpfe: Pause, x1, x2, x5

// Slots im Wochenplan: Beginn der Veranstaltung (volle Stunde)
export const SLOTS = [
  { id: 'vormittag', stunde: 10 },
  { id: 'nachmittag', stunde: 15 },
  { id: 'abend', stunde: 19 }
];
export const SPIELBEGINN = { tag: 0, stunde: 8 };            // Montag 8:00 der ersten Woche (Tag 0 = Montag … 6 = Sonntag)
export const STANDARD_PLAN = { tag: 6, slot: 'vormittag' };  // bei Spielbeginn: Sonntag vormittags
export const DAUER = { gottesdienst: 60, kirchkaffee: 60 };   // Spielminuten

// Laufen der Besucher (in Spielminuten, damit es mit den Zeit-Knöpfen schneller und langsamer wird)
export const ANREISE_VORLAUF = 90;    // so viele Minuten vor Beginn machen sich die Besucher auf den Weg
export const LAUFTEMPO = 0.5;         // Kästchen pro Spielminute
export const ABSTAND = 2;             // Spielminuten zwischen zwei Besuchern
