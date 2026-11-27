// Inhaltsdatei: Bedürfnis Toilette (Spielprinzip claude/spielprinzip-toiletten.md, von Lukas am 26.11. mit „passt“ freigegeben).
// Werte in Prozent (0–100). Zahlen nach dem Testen leicht anpassbar.
export const TOILETTE = {
  startMin: 0, startMax: 40,   // beim Ankommen steht der Wert zufällig zwischen diesen beiden
  proStunde: 10,               // so viel steigt er pro Spielstunde
  vorherAb: 50,                // vor der Veranstaltung: über diesem Wert geht man vorher, wenn es eine Toilette gibt
  suchenAb: 80,                // ab hier geht man los, sobald eine Kabine in der Nähe frei ist – auch während einer Veranstaltung (27.11.)
                               // und ab hier zeigt die Figur ein rotes WC-Symbol über dem Kopf
  umkreis: 30,                 // (27.11.) „in der Nähe“: höchstens so viele Kästchen Laufweg bis zur Kabine; weiter weg zählt nicht
  unfall: { ab: 100, haltung: -10, danach: 50 },   // (27.11.) erreicht man 100 %, ohne unterwegs zu sein: −10 Haltung, Wert springt auf 50 %
  dauer: 4                     // (27.11.: vorher 8, bei x1 weiter 1,6 Sekunden) so viele Spielminuten dauert der Toilettengang (in der Kabine), danach steht der Wert bei 0
};
