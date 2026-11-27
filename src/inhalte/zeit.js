// Inhaltsdatei: die Zeit im Spiel (Echtzeit statt Runden).
export const SEKUNDEN_PRO_STUNDE = 24;         // 1 Spielstunde dauert bei x1 so viele echte Sekunden (Lukas, 27.11.: vorher 12, davor 3)
export const TEMPI = [0, 1, 2, 10, 25, 50];    // Zeit-Knöpfe: Pause, x1, x2, x10, x25, x50 (Lukas, 27.11.: x50 dazu, x5 raus)

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
// Lukas, 27.11.: Die Spielstunde dauert doppelt so lange, die Figuren bleiben auf dem Bildschirm so schnell wie bisher –
// deshalb sind alle Figuren-Zeiten in Spielminuten halbiert (Laufen, Abstand, Kaffeemaschine, Automat, Toilette, Halt am Tor, Umherlaufen).
export const LAUFTEMPO = 0.85;        // Kästchen pro Spielminute (27.11.: verdoppelt, siehe oben; danach Lukas, 27.11.: alle Figuren 1,7-mal so schnell)
export const ABSTAND = 1;             // Spielminuten zwischen zwei Besuchern (27.11.: vorher 2)
export const HEIMWEG = 120;           // so lange (Spielminuten) laufen die Besucher nach dem Ende noch nach Hause (stand bis 26.11. in kern/ablauf.js)

// Meldungen unten rechts (Ort, Kirchkaffee, Konfi): so lange (Spielminuten) bleiben sie stehen.
// Stand bis 26.11. dreimal einzeln im Code (ort.js, kirchkaffee.js, konfi.js) – jetzt nur noch hier.
export const MELDUNG_DAUER = 120;

// Wochenzusammenfassung (Lukas, 27.11.): jeden Montag um diese Stunde – gleich nach den Dauerspenden; das Spiel pausiert, bis man sie schließt.
// pause: nur für die automatischen Tests abschaltbar (tests/hilfen/ohne-erster.mjs), im Spiel immer an.
export const WOCHENBERICHT = { stunde: 8, pause: true };
