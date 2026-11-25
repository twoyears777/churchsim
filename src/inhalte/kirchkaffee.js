// Inhaltsdatei: Kirchkaffee. Spielprinzip vom 25.11.2026 (claude/spielprinzip-kirchkaffee-oeffnungszeiten.md).
// Je Kaffeemaschine braucht es 1 Ehrenamtlichen und 1 Theke. Ohne Maschine kein Kaffee.
// Nach jedem Gottesdienst hat das Kirchkaffee automatisch offen (Dauer: DAUER.kirchkaffee in zeit.js, 2 Stunden).
export const PREIS_TASSE = 1;                        // € pro verkaufter Tasse

// Eigene Öffnungszeiten („Schichten“): höchstens 3 pro Woche, ein Slot geht bis zum nächsten Slot.
export const MAX_SCHICHTEN = 3;
export const SCHICHT_ENDE = { vormittag: 15, nachmittag: 19, abend: 23 };   // Uhrzeit, zu der die Schicht endet

// Bedienung: Kunde bestellt an der Theke → Mitarbeiter geht zur Maschine → Maschine lädt → zurück → Kaffee.
export const LADEN_MINUTEN = 5;                      // so lange lädt die Maschine (bei x1 = 1 Sekunde)

// Einkauf im Laden: wenn das Kirchkaffee zu hat und die Maschine nicht voll ist
export const EINKAUF = {
  preisTasse: 0.5,       // € pro Tasse
  tragen: 10,            // so viele Tassen trägt der Ehrenamtliche auf einmal
  wiederholen: 60        // Platzhalter von Claude: war zu wenig Geld da, versucht er es nach so vielen Spielminuten wieder
};

// Platzhalter von Claude: so lange (Spielminuten) bleibt ein Passant nach dem Kaffee im Kirchkaffee stehen
export const STEHEN_PASSANT = 30;
