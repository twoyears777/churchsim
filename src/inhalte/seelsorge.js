// Inhaltsdatei: Seelsorge – Zahlen und Situationen. Die Texte dazu stehen in texte.js (TEXTE.seelsorge).
// Zahlen von Lukas freigegeben (25.11.), nach dem Testen leicht anpassbar.
export const SEELSORGE = {
  // 20 Stufen (Lukas, 25.11. abends): neue Freischaltungen nur alle 5 Stufen, dazwischen bringt jede Stufe mehr Erfolgschance.
  // Erfahrungspunkte je Stufe: in jedem 5er-Block 1 Punkt teurer (Stufe 2–5: je 2, 6–10: je 3, 11–15: je 4, 16–20: je 5)
  stufeAb: [0, 2, 4, 6, 8, 11, 14, 17, 20, 23, 27, 31, 35, 39, 43, 48, 53, 58, 63, 68],
  // so oft im Schnitt fragt jemand pro Woche, je nach Stufe: 1 bis Stufe 9, ab 10: 1,5, ab 15: 2, auf Stufe 20: 3
  anfragenProWoche: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1.5, 1.5, 1.5, 1.5, 2, 2, 2, 2, 2, 3],
  anfangsSchub: { anfragen: 10, faktor: 2 }, // die ersten 10 Anfragen: anfangs doppelt so oft, mit jeder Anfrage weniger, ab der 11. normal
  von: 8, bis: 20,                          // Anfragen kommen nur zwischen diesen Uhrzeiten
  sperreVorGottesdienst: 180,               // nicht in den 3 Stunden (Minuten) vor dem Gottesdienst, nicht währenddessen
  anteilBesucher: 2 / 3,                    // so oft fragt ein Besucher, sonst ein bekannter Passant
  bonusProStufe: 0.015,                     // höhere Stufe: pro Stufe über 1 geht ein Rat um 1,5 Prozentpunkte öfter gut aus (vorher 5 bei 5 Stufen)
  hoechsteChance: 0.95,
  ablehnen: -5,                             // Haltung, wenn der Pastor ablehnt
  gut: { haltung: 10, bekanntheit: 0.2 },   // Standard (Bekanntheit am 25.11. ÷ 5, vorher 1), wenn ein Rat gut ausgeht
  schlecht: { haltung: -10 },               // Standard, wenn er schlecht ausgeht
  freischaltungen: [5, 10, 15, 20],         // auf diesen Stufen kommt etwas Neues dazu (Charakter-Karte und Meldung beim Aufstieg)
  erfahrung: { gespraech: 1, gutExtra: 1 }, // +1 pro angenommenem Gespräch, +1 extra, wenn es gut ausgeht
  // Einschätzung der Ratschläge (von Lukas freigegeben 25.11.): mit der Stufe sieht der Pastor mehr.
  // Ab Stufe 5 wird der passendste Rat markiert, ab Stufe 10 jeder Rat eingeschätzt, ab Stufe 15 die genaue Chance gezeigt.
  einschaetzung: { besteAb: 5, alleAb: 10, prozentAb: 15, gutAb: 0.65, unsicherAb: 0.40 }   // „passt gut“ ab 65 %, „unsicher“ 40–64 %, darunter „riskant“
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
