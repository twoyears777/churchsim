// Inhaltsdatei: Automaten (Spielprinzip claude/spielprinzip-getraenkeautomat.md, Wunsch von Lukas 26.11.2026).
//
// Jeder Eintrag ist ein Automat. Ein weiterer Automat (z. B. Snacks) = ein weiterer Eintrag hier – Bauleiste, Kaufen,
// Leerwerden, Auffüllen durch den Ehrenamtlichen und die Finanz-Kategorie gelten dann automatisch auch für ihn.
//
//   id, name      Kennung und Name (Name erscheint in Bauleiste und Finanzen)
//   kosten        Baupreis in € (Abriss erstattet einen Teil wie bei allen Möbeln)
//   kategorie     Reiter der Bauleiste
//   raum          nur in einem fertigen Raum dieses Typs wird verkauft und aufgefüllt
//   preis         € pro verkaufter Ware
//   einkauf       € pro Ware beim Einkauf im Laden
//   chance        Chance, dass ein Besucher etwas kauft (0,5 = 50 %) – 27.11.: je einmal vorher und einmal nachher
//                 (Veranstaltung, Seelsorge), Kunden des Kirchkaffees zu den Öffnungszeiten einmal während ihres Aufenthalts
//   auffuellenAb  der Ehrenamtliche füllt erst auf, wenn so viele Waren fehlen – dann alles bis voll
//   haltung       ja: Haltung beim Kauf, leer: Haltung, wenn er etwas wollte, der Automat aber leer war
//   stufen        Verbesserungen wie bei Stühlen (STUHL_STUFEN in moebel.js), seit 27.11. im Spiel (Klick auf den Automaten).
//                 lager = so viele Waren passen hinein; chance (falls angegeben) = Kaufchance statt der Grundchance –
//                 es zählt der beste Automat dieser Art, der verkauft. Stufen 2 und 3: PLATZHALTER von Claude (27.11.).
export const AUTOMATEN = [
  {
    id: 'getraenkeautomat', name: 'Getränkeautomat',   // Name: Entwurf von Claude
    kosten: 50,                                        // PLATZHALTER von Claude (wie die Kaffeemaschine) – Lukas legt ihn fest
    kategorie: 'kirchkaffee', raum: 'kirchkaffee',
    preis: 3, einkauf: 0.5,                            // Lukas, 26.11.
    chance: 0.5,                                       // Lukas, 26.11.: fester Wert 50 % (später: Bedürfnis Durst)
    haltung: { ja: 5, leer: -10 },                     // Lukas, 26.11.: wie beim Kaffee (27.11.: auch beim zweiten Kauf)
    auffuellenAb: 10,                                  // Lukas, 27.11.: erst ab 10 fehlenden, dann alles bis voll
    stufen: [
      { stufe: 1, name: 'Getränkeautomat', upgrade: 0, lager: 30 },   // Lukas, 26.11.: Platz für 30 Getränke
      { stufe: 2, name: 'Großer Getränkeautomat', upgrade: 80, lager: 45, chance: 0.55 },
      { stufe: 3, name: 'Getränkeautomat mit Kartenzahlung', upgrade: 200, lager: 60, chance: 0.6 }
    ]
  },
  // Snackautomat (Lukas, 27.11.: „wie der Getränkeautomat, nur mit Snacks“) – alle Werte wie beim Getränkeautomaten
  {
    id: 'snackautomat', name: 'Snackautomat',
    kosten: 50, kategorie: 'kirchkaffee', raum: 'kirchkaffee',
    preis: 3, einkauf: 0.5, chance: 0.5, haltung: { ja: 5, leer: -10 }, auffuellenAb: 10,
    stufen: [
      { stufe: 1, name: 'Snackautomat', upgrade: 0, lager: 30 },
      { stufe: 2, name: 'Großer Snackautomat', upgrade: 80, lager: 45, chance: 0.55 },
      { stufe: 3, name: 'Snackautomat mit Kartenzahlung', upgrade: 200, lager: 60, chance: 0.6 }
    ]
  }
];

// Für alle Automaten gleich
export const AUTOMAT = {
  kaufMinuten: 2.5  // PLATZHALTER von Claude: so lange steht ein Kunde am Automaten (wie die Kaffeemaschine lädt; bei x1 = 1 Sekunde; 27.11.: vorher 5)
  // (27.11.: „vorlauf“ entfällt – Gäste gehen jetzt auf dem Weg zum Platz zum Automaten und sitzen genau zum Beginn)
};
