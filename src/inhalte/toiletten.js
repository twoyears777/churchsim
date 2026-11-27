// Inhaltsdatei: Bedürfnis Toilette (Spielprinzip claude/spielprinzip-toiletten.md, von Lukas am 26.11. mit „passt“ freigegeben).
// Werte in Prozent (0–100). Zahlen nach dem Testen leicht anpassbar.
export const TOILETTE = {
  startMin: 0, startMax: 40,   // beim Ankommen steht der Wert zufällig zwischen diesen beiden
  proStunde: 10,               // so viel steigt er pro Spielstunde
  vorherAb: 50,                // vor der Veranstaltung: über diesem Wert geht man vorher, wenn es eine Toilette gibt
  suchenAb: 80,                // ab hier sucht man sich eine Toilette – aber nicht während einer Veranstaltung
  waehrendAb: 100,             // ab hier auch während einer Veranstaltung
  dauer: 4                     // (27.11.: vorher 8, bei x1 weiter 1,6 Sekunden) so viele Spielminuten dauert der Toilettengang (in der Kabine), danach steht der Wert bei 0
};
