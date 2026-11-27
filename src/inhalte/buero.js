// Inhaltsdatei: Büro, Orga-Tokens und Boni (Spielprinzip von Lukas, 27.11.2026: claude/spielprinzip-buero-orga-tokens.md).
// Zahlen zum Drehen – die Regeln stehen in src/kern/buero.js.
//
// So läuft es:
//   • Im Raum „Büro“ (mind. 2 × 2, mit Tür) steht ein Schreibtisch. Dafür gibt es im Menü „Mitarbeiter“ in jedem Zeitblock
//     eine Stelle „Büro“ für einen Ehrenamtlichen (vorerst höchstens `plaetze` Stellen insgesamt).
//   • Am Ende jeder Büro-Schicht gibt es `tokensProSchicht` Orga-Token – nur, wenn der Ehrenamtliche wirklich im Büro war.
//     Tokens haben keine Obergrenze und bleiben auch beim Abriss des Büros erhalten.
//   • Mit Tokens schaltet man im Büro-Fenster Boni frei (BONI). Neue Boni = weiterer Eintrag; die Wirkung steht in kern/buero.js.
export const BUERO = {
  plaetze: 1,            // Lukas, 27.11.: vorerst höchstens 1 Ehrenamtlicher im Büro
  tokensProSchicht: 1    // Lukas, 27.11.
};

// Boni, die man mit Orga-Tokens freischaltet
//   preis:       Orga-Tokens
//   gilt:        'jahrgang' = bis zur nächsten Konfirmation, danach neu freischaltbar
//   proWoche:    so viele neue Jugendliche kommen jeden Montag um `stunde` Uhr in die Gemeinde (zählen zum Einzugsgebiet)
//   ersterKonfi: Chance, dass ein so gekommener Jugendlicher zum nächsten Konfirmandenunterricht kommt (danach normal)
export const BONI = [
  { id: 'einladungKonfi', preis: 3, gilt: 'jahrgang', proWoche: 2, stunde: 8, ersterKonfi: 0.75 }   // alles Lukas, 27.11. (Stunde: Claude)
];
