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

// Umherlaufen (Wunsch von Lukas, 25.11.): Mitarbeiter stehen nicht starr, sondern gehen ab und zu ein Kästchen
// weiter und wieder zurück – nur in ihrem Raum, nur auf freie Kästchen. Zahlen sind Platzhalter von Claude.
export const UMHERLAUFEN = {
  takt: 30,        // Spielminuten zwischen zwei Schritten (bei x1 ca. 6 Sekunden), je Person etwas verschieden
  tempo: 0.5,      // so schnell wie normales Gehen × tempo (gemütlich schlendern)
  ruhe: 0.3        // Chance, dass jemand einen Schritt auslässt und einfach stehen bleibt
};
