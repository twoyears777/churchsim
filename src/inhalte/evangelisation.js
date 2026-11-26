// Inhaltsdatei: Evangelisation vor dem Laden (Spielprinzip von Lukas, 26.11.2026: claude/spielprinzip-evangelisation.md).
// Zahlen von Lukas freigegeben, nach dem Testen leicht anpassbar.
export const EVANGELISATION = {
  feld: { x: 56, y: 27 },                            // das Feld „Evangelisation!“: 1 Kästchen vor dem Laden (unteres Nachbarhaus ganz rechts)
  standplaetze: [{ x: 56, y: 26 }, { x: 56, y: 28 }], // hier stehen die Ehrenamtlichen (neben dem Feld)
  plaetze: 2,                                        // so viele Ehrenamtliche gleichzeitig (später mehr über Verbesserungen)
  von: 8, bis: 20,                                   // nur zwischen diesen Uhrzeiten
  reichweite: 3,                                     // Passanten, die so nah (Kästchen) am Feld vorbeilaufen, werden angesprochen
  // Chance pro Passant je Ehrenamtlichem vor Ort: 5 % Grund + 5 % je Evangelisation-Level (Lukas, 26.11. abends; vorher 10 % je Musik-Level)
  grundChance: 0.05,
  chanceProLevel: 0.05,
  maxChance: 0.80,                                   // mehrere Ehrenamtliche zusammen, höchstens 80 %
  // Skill „Evangelisation“ (Lukas, 26.11. abends): Learning by Doing wie bei Musik – 1 Erfahrung pro Spielstunde vor Ort,
  // 50 Erfahrung pro Level (so langsam wie Musik: 50 Auftritte pro Level), höchstens Level 10. Später zusätzlich über Schulungen.
  skill: { erfahrungProStunde: 1, erfahrungProLevel: 50, maxLevel: 10 },
  ladenPassanten: 1.5,                               // am Laden laufen täglich 1,5-mal so viele vorbei wie unten am Tor (zusätzlich)
  // Wohin laden sie ein? Erwachsene Ehrenamtliche zum Gottesdienst (auch Lobpreisgottesdienst),
  // jugendliche Ehrenamtliche nur Jugendliche, nur zum Jugendgottesdienst.
  einladung: { gottesdienst: ['gottesdienst', 'lobpreis'], jugend: ['jugend'] },
  // Technische Werte (Platzhalter von Claude): Es lohnt sich erst hinzugehen, wenn man mindestens so lange (Spielminuten)
  // dort bleiben kann; so oft wird geschaut, ob jemand Neues frei hat.
  mindestens: 30,
  pruefen: 30
};
