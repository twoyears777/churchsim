// Inhaltsdatei: Mitarbeiter zu Spielbeginn.
// art: 'hauptamt' oder 'ehrenamt'.
// ausbildung, skill, charakter: vorbereitet für später (Roadmap), noch ohne Wirkung.
export const START_MITARBEITER = [
  { id: 'pastor', name: 'Pastor Harder', kuerzel: 'P', art: 'hauptamt', ausbildung: null, skill: null, charakter: null }
];
// Ehrenamtliche, mit denen ein neues Spiel zusätzlich startet (Lukas, 25.11.: „Frau des Pastors“).
// Nur bei neuen Spielen – alte Spielstände bekommen niemanden dazu. Sie zählen nicht zum Einzugsgebiet (Lukas, 25.11.).
export const START_EHRENAMTLICHE = [
  { name: 'Frau des Pastors', kuerzel: 'F', art: 'ehrenamt', ausbildung: null, skill: null, charakter: null }
];

// Platzhalter-Farben der Figuren – Design legt Lukas fest.
export const ART_FARBE = { hauptamt: '#2d69be', ehrenamt: '#d08a1e' };
