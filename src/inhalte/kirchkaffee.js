// Inhaltsdatei: Kirchkaffee. Spielprinzip vom 25.11.2026 (claude/spielprinzip-kirchkaffee-oeffnungszeiten.md).
// Je Kaffeemaschine braucht es 1 Ehrenamtlichen und 1 Theke. Ohne Maschine kein Kaffee.
// Nach jedem Gottesdienst hat das Kirchkaffee automatisch offen (Dauer: DAUER.kirchkaffee in zeit.js, 2 Stunden).
export const PREIS_TASSE = 2;                        // € pro verkaufter Tasse

// Eigene Öffnungszeiten („Schichten“): höchstens 3 pro Woche, ein Slot geht bis zum nächsten Slot.
export const MAX_SCHICHTEN = 3;
export const SCHICHT_ENDE = { vormittag: 15, nachmittag: 19, abend: 23 };   // Uhrzeit, zu der die Schicht endet

// Bedienung: Kunde bestellt an der Theke → Mitarbeiter geht zur Maschine → Maschine lädt → zurück → Kaffee.
export const LADEN_MINUTEN = 2.5;                    // so lange lädt die Maschine (bei x1 = 1 Sekunde; 27.11.: vorher 5, weil die Spielstunde doppelt so lange dauert)

// Einkauf im Laden: wenn das Kirchkaffee zu hat und die Maschine nicht voll ist
export const EINKAUF = {
  preisTasse: 0.5,       // € pro Tasse
  tragen: 10,            // so viele Tassen trägt der Ehrenamtliche auf einmal
  wiederholen: 60        // Platzhalter von Claude: war zu wenig Geld da, versucht er es nach so vielen Spielminuten wieder
};

// So lange (Spielminuten) bleibt ein Kunde nach dem Kaffee im Kirchkaffee – stehend oder sitzend (Lukas, 25.11.: 60).
// Gottesdienst-Gäste bleiben stattdessen, bis das Kirchkaffee nach dem Gottesdienst schließt.
// Lukas, 27.11.: „besucher die sich nicht hinsetzen deutlich schneller auch ganz gehen“ – 60 → 20 (PLATZHALTER von Claude).
export const STEHEN_PASSANT = 20;
// Gottesdienst-Gäste, die stehen (27.11.): gehen nach so vielen Minuten – spätestens, wenn das Kirchkaffee nach dem Gottesdienst schließt.
// Wer sitzt, bleibt weiter bis zum Schluss (mindestens SITZEN.mindestens). PLATZHALTER von Claude.
export const STEHEN_GAST = 20;

// Sitzplätze (Spielprinzip vom 25.11., claude/spielprinzip-kirchkaffee-sitzplaetze.md):
// Nach dem Kaffee setzt sich ein Kunde mit chance auf einen freien Stuhl im Kirchkaffee und gibt beim Gehen Trinkgeld.
// Trinkgeld = trinkgeld × Stufe des Stuhls (STUHL_STUFEN in moebel.js) × tisch (wenn ein Tisch direkt angrenzt).
export const SITZEN = {
  chance: 0.65,      // 65 % setzen sich hin, wenn ein Stuhl frei ist (Lukas, 27.11.: „etwas“ öfter – vorher 50 %; 65 % PLATZHALTER von Claude)
  trinkgeld: 1,      // € Grundwert
  tisch: 1.2,        // Stuhl grenzt an einen Tisch (links/rechts/oben/unten); mehrere Tische zählen einmal
  mindestens: 60     // Spielminuten: so lange bleibt ein Gast mindestens sitzen, ab Ankunft am Stuhl – auch nach Schluss (Lukas, 25.11.)
};

// Mindestgäste (Lukas, 27.11.: „Das Kirchkaffee sollte ein Minimum an Besuchern anlocken, die extra dafür zusätzlich
// auf die Karte kommen. Am Besten je nach Angebot.“). Gilt nur für die eigenen Öffnungszeiten, nicht nach dem Gottesdienst.
// Mindestzahl je Öffnungszeit = grund + Angebot. Wer von selbst vom Gehweg hereinkommt, zählt mit; fehlt bis zu einem
// Zeitpunkt noch jemand, kommt ein Gast extra durchs Tor. Alle Zahlen: Vorschlag von Claude, Lukas legt sie fest.
export const MINDESTGAESTE = {
  an: true,            // im Spiel immer an; nur ältere Tests schalten es über tests/hilfen/ohne-erster.mjs ab
  grund: 2,            // so viele kommen immer
  jeSitzplaetze: 2,    // +1 Gast je so viele Stühle im Kirchkaffee
  tisch: 1,            // +1 je Tisch, an dem mindestens ein Stuhl steht
  automat: 1,          // +1 je Automat (z. B. Getränkeautomat) im Kirchkaffee
  station: 1,          // +1 je weitere bediente Theke (2. Station, 3. Station …)
  verteilen: 0.75      // die Gäste kommen gleichmäßig verteilt in den ersten 75 % der Öffnungszeit (damit sie noch bedient werden)
};

// Sandwiches (Lukas, 27.11.: „funktionieren im Prinzip wie Kaffee, längere Produktionszeit, Einkauf 0,50 €, Verkauf 3 €“).
// Wer Kaffee bestellt, will mit chance auch ein Sandwich – wenn im Kirchkaffee ein Sandwichmaker steht. Der Ehrenamtliche macht
// erst den Kaffee, dann am Sandwichmaker das Sandwich (laden Spielminuten), dann gibt es beides.
// Ist der Sandwichmaker leer, gibt es nur den Kaffee und haltung.leer. Eingekauft wird wie Kaffee (je Gang höchstens tragen).
// chance, laden, haltung, tragen: PLATZHALTER von Claude.
export const SANDWICH = { preis: 3, einkauf: 0.5, chance: 0.4, laden: 7.5, haltung: { ja: 5, leer: -5 }, tragen: 10 };
