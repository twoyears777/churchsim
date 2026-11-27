// Inhaltsdatei: Dienstplan der Ehrenamtlichen (Spielprinzip von Lukas, 27.11.2026:
// claude/spielprinzip-ehrenamt-schichten-lager.md). Zahlen zum Drehen – die Regeln stehen in src/kern/dienst.js.
//
// So läuft es:
//   • Ehrenamtliche werden im Menü „Mitarbeiter“ für Stellen eingeteilt (statt in einen Raum gezogen).
//   • Eine Schicht = ein Termin (Veranstaltung, Kirchkaffee nach dem Gottesdienst, Kirchkaffee-Öffnungszeit,
//     Logistik-Block, Evangelisation-Block). Überall dieselben Zeitblöcke (SLOTS in zeit.js, Ende SCHICHT_ENDE in kirchkaffee.js).
//   • Ohne Schicht sind sie daheim. Sonntagvormittags kommen sie mit besuch.chance als Besucher in den Gottesdienst.
export const DIENST = {
  schichten: 3,          // Schichten pro Woche je Ehrenamtlichem (Lukas, 27.11.); Ausnahmen über `schichten` in den Daten der Person
  // Bei Veranstaltungen ist der Ehrenamtliche so viele Spielminuten vor Beginn an seiner Stelle (Platzhalter von Claude).
  // Gezählt wird er für die Veranstaltung schon vorher, sobald er im Dienstplan steht.
  vorlauf: 30,
  // Gottesdienstbesuch ohne Schicht (Lukas, 27.11.): nur sonntagvormittags, egal welcher Gottesdienst im Gottesdienstraum
  besuch: { chance: 0.9, tag: 6, slot: 'vormittag' }
};
