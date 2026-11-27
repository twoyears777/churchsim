// Inhaltsdatei: Schulungen für Ehrenamtliche (Spielprinzip von Lukas, 27.11.2026: claude/spielprinzip-schulungen.md).
// Die Regeln stehen in src/kern/schulungen.js.
//
// So läuft es:
//   • Im Menü „Mitarbeiter“ schickt man einen Ehrenamtlichen auf Schulung – nur, wenn er gar keine Schicht im Dienstplan hat.
//   • Er ist dann die Dauer lang weg (keine Schichten, kein Gottesdienstbesuch). Die Zeit läuft nur, wenn das Spiel läuft.
//   • Am Ende wirkt die Schulung. Abbrechen geht, das Bezahlte ist dann weg.
//   • Jede Schulung hat Stufen. Jede Stufe macht man einmal, der Reihe nach; jede Stufe wird über eine Forschung freigeschaltet.
//
// Neue Schulung oder neue Stufe: einfach hier ergänzen.
//   wirkung: skill = welcher Skill steigt ('musik' | 'evangelisation'), level = um wie viele Level;
//            schichten = so viele Schichten pro Woche dauerhaft mehr
//   stufen:  forschung = Forschung, die diese Stufe freischaltet (src/inhalte/forschung.js)
//            kosten = Geld (€) und Heiligkeit, beides beim Losschicken bezahlt
//            tage = Spieltage, die der Ehrenamtliche weg ist
export const SCHULUNGEN = [
  { id: 'musik', name: 'Musik-Kurs', wirkung: { skill: 'musik', level: 1 }, stufen: [
    { forschung: 'schulungen1', kosten: { geld: 160, heiligkeit: 0 }, tage: 7 },
    { forschung: 'schulungen2', kosten: { geld: 480, heiligkeit: 0 }, tage: 7 }
  ] },
  { id: 'evangelisation', name: 'Evangelisations-Kurs', wirkung: { skill: 'evangelisation', level: 1 }, stufen: [
    { forschung: 'schulungen1', kosten: { geld: 120, heiligkeit: 60 }, tage: 7 },
    { forschung: 'schulungen2', kosten: { geld: 360, heiligkeit: 180 }, tage: 7 }
  ] },
  // Name von Lukas (27.11.)
  { id: 'worship', name: 'Intensive Worshipkonferenz in den USA', wirkung: { skill: 'musik', level: 1, schichten: 1 }, stufen: [
    { forschung: 'schulungen1', kosten: { geld: 600, heiligkeit: 200 }, tage: 14 },
    { forschung: 'schulungen2', kosten: { geld: 1800, heiligkeit: 600 }, tage: 14 }
  ] }
];
