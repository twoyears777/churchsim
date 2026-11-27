// Inhaltsdatei: Mitarbeiter zu Spielbeginn.
// art: 'hauptamt' oder 'ehrenamt'.
// ausbildung, skill, charakter: vorbereitet für später (Roadmap), noch ohne Wirkung.
export const START_MITARBEITER = [
  { id: 'pastor', name: 'Pastor Harder', kuerzel: 'P', art: 'hauptamt', ausbildung: null, skill: null, charakter: null }
];
// Jugendpastor (Lukas, 27.11.2026: claude/spielprinzip-jugendpastor.md): zweiter Hauptamtlicher, kommt im Spiel dazu.
//   ankunft:  Montag 8:00 der 3. Woche (woche 2 = nach 2 Wochen), gleich nach der Wochenzusammenfassung, mit Pop-up.
//             Alte Spielstände, die schon weiter sind, bekommen ihn am nächsten Montag 8:00.
//   leitet:   nur diese Veranstaltungen darf er leiten (Stelle „Leitung“ im Dienstplan); Feste leitet er nicht.
//             Alle anderen Stellen für Hauptamtliche (Begrüßung, Kirchkaffee, Logistik, Evangelisation) darf er wie Pastor Harder.
//             Später kommt der Jugendkreis dazu (eigenes Spielprinzip).
//   anwesend: nur von … bis … Uhr in der Gemeinde, sonst daheim (außer in einer Schicht).
//   wartet:   ohne Schicht wartet er in diesem Raum (Kirchkaffee); gibt es keinen, am Startplatz wie Pastor Harder.
//   kosten:   erstmal keine.
export const JUGENDPASTOR = {
  daten: { name: 'Jugendpastor Jimmy', kuerzel: 'J', art: 'hauptamt', ausbildung: null, skill: null, charakter: null,
    leitet: ['jugend', 'lobpreis', 'konfi'], anwesend: { von: 7, bis: 23 }, wartet: 'kirchkaffee', jugendpastor: true },
  ankunft: { woche: 2, tag: 0, stunde: 8 }
};

// Ehrenamtliche, mit denen ein neues Spiel zusätzlich startet (Lukas, 25.11.: „Frau des Pastors“).
// Nur bei neuen Spielen – alte Spielstände bekommen niemanden dazu. Sie zählen nicht zum Einzugsgebiet (Lukas, 25.11.).
export const START_EHRENAMTLICHE = [
  // schichten: Schichten pro Woche (Lukas, 27.11.: die Frau des Pastors kann 5, alle anderen DIENST.schichten = 3)
  { name: 'Frau des Pastors', kuerzel: 'F', art: 'ehrenamt', ausbildung: null, skill: null, charakter: null, schichten: 5 }
];

// Platzhalter-Farben der Figuren – Design legt Lukas fest.
export const ART_FARBE = { hauptamt: '#2d69be', ehrenamt: '#d08a1e' };

// Umherlaufen (Wunsch von Lukas, 25.11.): Mitarbeiter stehen nicht starr, sondern gehen ab und zu ein Kästchen
// weiter und wieder zurück – nur in ihrem Raum, nur auf freie Kästchen. Zahlen sind Platzhalter von Claude.
export const UMHERLAUFEN = {
  takt: 15,        // Spielminuten zwischen zwei Schritten (bei x1 ca. 6 Sekunden; 27.11.: vorher 30), je Person etwas verschieden
  tempo: 0.5,      // so schnell wie normales Gehen × tempo (gemütlich schlendern)
  ruhe: 0.3        // Chance, dass jemand einen Schritt auslässt und einfach stehen bleibt
};
