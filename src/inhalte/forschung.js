// Inhaltsdatei: Forschungsbaum und Heiligkeit (Spielprinzip von Lukas, 25.11.2026: claude/spielprinzip-forschungsbaum.md).

// Heiligkeit: kommt nur aus Gottesdiensten, nur die Besucherzahl zählt. Gutschrift am Ende des Gottesdienstes.
// veranstaltungen: welche Veranstaltungen als Gottesdienst zählen (Feste aus dem Kirchenjahr laufen als eine davon).
export const HEILIGKEIT = { proBesucher: 1, veranstaltungen: ['gottesdienst', 'lobpreis', 'jugend'] };

// Forschungen. Neue einfach hier ergänzen.
//   kosten:     Geld (€) und Heiligkeit, beides wird beim Start bezahlt (beim Abbrechen ist es weg)
//   dauer:      echte Sekunden bei normaler Geschwindigkeit (x1); läuft nur, wenn die Spielzeit läuft
//   braucht:    ids von Forschungen, die vorher fertig sein müssen (für den späteren Baum)
//   schaltetFrei: was die Forschung später freischaltet (noch ohne Wirkung, bis das Feature gebaut ist)
export const FORSCHUNGEN = [
  { id: 'schulungen1', name: 'Schulungen 1', kosten: { geld: 100, heiligkeit: 100 }, dauer: 60, braucht: [], schaltetFrei: 'schulungen' },
  // Schulungen 2 (Lukas, 27.11.): schaltet Stufe 2 aller Schulungen frei (src/inhalte/schulungen.js), braucht Schulungen 1
  { id: 'schulungen2', name: 'Schulungen 2', kosten: { geld: 500, heiligkeit: 300 }, dauer: 180, braucht: ['schulungen1'], schaltetFrei: 'schulungen' },
  // 3. Veranstaltungsslot (Lukas, 26.11.): je Raumtyp eine eigene Forschung, Kosten und Dauer wie Schulungen 1, noch ohne Voraussetzung.
  // Freigeschaltet wird der Platz mit „forschung: …“ in PLAETZE (veranstaltungen.js) bzw. plaetze (raumtypen.js).
  { id: 'slot3gottesdienst', name: '3. Veranstaltung im Gottesdienstraum', kosten: { geld: 100, heiligkeit: 100 }, dauer: 60, braucht: [], schaltetFrei: 'platz' },
  // Lukas, 27.11.: Sandwichmaker und Tontechnikrack brauchen je eine Forschung. Kosten und Dauer PLATZHALTER von Claude.
  { id: 'sandwiches', name: 'Sandwiches', kosten: { geld: 200, heiligkeit: 100 }, dauer: 120, braucht: [], schaltetFrei: 'moebel' },
  { id: 'tontechnikrack', name: 'Tontechnikrack', kosten: { geld: 400, heiligkeit: 250 }, dauer: 180, braucht: [], schaltetFrei: 'moebel' },
  { id: 'slot3saal', name: '3. Veranstaltung im Gemeindesaal', kosten: { geld: 100, heiligkeit: 100 }, dauer: 60, braucht: [], schaltetFrei: 'platz' }
];

// Haltungs-Multiplikator (Lukas, 25.11. abends; seit 26.11. ein Skill des Hauptamtlichen): vervielfacht die Haltung, die ein
// Besucher am Ende eines Gottesdienstes bekommt – auf die Summe nach allen Boni (Platz, Gottesdienst, Möbel, Fenster, Musik,
// Foyer). Wirkt nur bei Gottesdiensten, die dieser Hauptamtliche leitet. Startet auf Stufe 0 (×1). Minuswerte werden nicht vervielfacht.
// Jeder geleitete Gottesdienst/Lobpreisgottesdienst (auch Feste) gibt +1 Erfahrung. Ist genug Erfahrung da, wird die nächste
// Stufe auf seiner Charakter-Karte mit Heiligkeit gekauft – sofort, eine nach der anderen.
//   stufen:          Faktor, Preis (Heiligkeit) und nötige geleitete Gottesdienste für Stufe 1, 2, 3, …
//   veranstaltungen: wo er wirkt (wie bei der Heiligkeit: Gottesdienst und Lobpreisgottesdienst, Feste laufen als einer davon)
export const HALTUNG_MULTIPLIKATOR = {
  stufen: [
    { faktor: 1.3, preis: 100, gottesdienste: 4 },
    { faktor: 1.6, preis: 250, gottesdienste: 10 },
    { faktor: 2.0, preis: 500, gottesdienste: 20 },
    { faktor: 2.5, preis: 1000, gottesdienste: 35 },
    { faktor: 3.0, preis: 2000, gottesdienste: 55 }
  ],
  veranstaltungen: ['gottesdienst', 'lobpreis', 'jugend']
};
