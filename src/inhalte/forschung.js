// Inhaltsdatei: Forschungsbaum und Heiligkeit (Spielprinzip von Lukas, 25.11.2026: claude/spielprinzip-forschungsbaum.md).

// Heiligkeit: kommt nur aus Gottesdiensten, nur die Besucherzahl zählt. Gutschrift am Ende des Gottesdienstes.
// veranstaltungen: welche Veranstaltungen als Gottesdienst zählen (Feste aus dem Kirchenjahr laufen als eine davon).
export const HEILIGKEIT = { proBesucher: 1, veranstaltungen: ['gottesdienst', 'lobpreis'] };

// Forschungen. Neue einfach hier ergänzen.
//   kosten:     Geld (€) und Heiligkeit, beides wird beim Start bezahlt (beim Abbrechen ist es weg)
//   dauer:      echte Sekunden bei normaler Geschwindigkeit (x1); läuft nur, wenn die Spielzeit läuft
//   braucht:    ids von Forschungen, die vorher fertig sein müssen (für den späteren Baum)
//   schaltetFrei: was die Forschung später freischaltet (noch ohne Wirkung, bis das Feature gebaut ist)
export const FORSCHUNGEN = [
  { id: 'schulungen1', name: 'Schulungen 1', kosten: { geld: 100, heiligkeit: 100 }, dauer: 60, braucht: [], schaltetFrei: 'schulungen' }
];

// Haltungs-Multiplikator (Lukas, 25.11. abends): vervielfacht die Haltung, die ein Besucher am Ende eines Gottesdienstes
// bekommt – auf die Summe nach allen Boni (Platz, Gottesdienst, Möbel, Fenster, Musik, Foyer). Startet auf Stufe 0 (×1).
// Wird sofort mit Heiligkeit gekauft, eine Stufe nach der anderen. Minuswerte werden nicht vervielfacht.
//   stufen:          Faktor und Preis (Heiligkeit) für Stufe 1, 2, 3, …
//   veranstaltungen: wo er wirkt (wie bei der Heiligkeit: Gottesdienst und Lobpreisgottesdienst, Feste laufen als einer davon)
export const HALTUNG_MULTIPLIKATOR = {
  stufen: [
    { faktor: 1.3, preis: 100 },
    { faktor: 1.6, preis: 250 },
    { faktor: 2.0, preis: 500 },
    { faktor: 2.5, preis: 1000 },
    { faktor: 3.0, preis: 2000 }
  ],
  veranstaltungen: ['gottesdienst', 'lobpreis']
};
