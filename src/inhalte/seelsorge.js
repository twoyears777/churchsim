// Inhaltsdatei: Seelsorge – Zahlen und Situationen. Die Texte dazu stehen in texte.js (TEXTE.seelsorge).
// Zahlen von Lukas freigegeben (25.11.), nach dem Testen leicht anpassbar.
export const SEELSORGE = {
  stufeAb: [0, 3, 8, 15, 25],              // Erfahrungspunkte für Stufe 1, 2, 3, 4, 5
  anfragenProWoche: [0.5, 1, 1.5, 2, 3],   // so oft im Schnitt fragt jemand, je nach Stufe 1–5
  von: 8, bis: 20,                          // Anfragen kommen nur zwischen diesen Uhrzeiten
  sperreVorGottesdienst: 180,               // nicht in den 3 Stunden (Minuten) vor dem Gottesdienst, nicht währenddessen
  anteilBesucher: 2 / 3,                    // so oft fragt ein Besucher, sonst ein bekannter Passant
  bonusProStufe: 0.05,                      // höhere Stufe: pro Stufe über 1 geht ein Rat um 5 Prozentpunkte öfter gut aus
  hoechsteChance: 0.95,
  ablehnen: -5,                             // Haltung, wenn der Pastor ablehnt
  gut: { haltung: 10, bekanntheit: 1 },     // Standard, wenn ein Rat gut ausgeht
  schlecht: { haltung: -10 },               // Standard, wenn er schlecht ausgeht
  erfahrung: { gespraech: 1, gutExtra: 1 }  // +1 pro angenommenem Gespräch, +1 extra, wenn es gut ausgeht
};

// Situationen: je 3 Ratschläge mit der Chance (Stufe 1), dass sie gut ausgehen.
// Sonderfälle: kosten (immer, €), spendeGut (€ wenn gut), haltungGut / bekanntheitGut (statt Standard).
export const SITUATIONEN = [
  { id: 'nachbar', raete: [{ chance: 0.7 }, { chance: 0.5 }, { chance: 0.3 }] },
  { id: 'job', raete: [{ chance: 0.7 }, { chance: 0.8, kosten: 20 }, { chance: 0.35 }] },
  { id: 'zweifel', raete: [{ chance: 0.75 }, { chance: 0.55 }, { chance: 0.2 }] },
  { id: 'trauer', raete: [{ chance: 0.8 }, { chance: 0.6, spendeGut: 30 }, { chance: 0.25 }] },
  { id: 'sohn', raete: [{ chance: 0.65 }, { chance: 0.45 }, { chance: 0.35 }] },
  { id: 'einsam', raete: [{ chance: 0.75 }, { chance: 0.65 }, { chance: 0.5, haltungGut: 5, bekanntheitGut: 0 }] }
];
