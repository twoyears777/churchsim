// Inhaltsdatei: Baukosten, Fenster und Foyer (Spielprinzip von Lukas, 25.11.2026 – claude/spielprinzip-baukosten-fenster-foyer.md).

// Baukosten: jedes neue Wandstück kostet `wand` €. Eine Tür kostet `tuer` € zusätzlich zur Wand (Lukas, 26.11.: 10 €),
// ein Fenster `fenster` € zusätzlich zur Wand.
export const BAUKOSTEN = { wand: 5, tuer: 10, fenster: 10 };

// Abriss (Lukas, 27.11.2026): Beim Abriss (oder Tür/Fenster wieder zur Wand) gibt es anfangs nur `anteil` des Preises zurück
// (0.5 = die Hälfte). Mit jeder vollen Woche seit dem Bauen wird es gleichmäßig weniger, nach `wochen` Wochen gibt es nichts mehr
// (bei 0.5 und 10: jede Woche 5 % weniger). Gilt auch für Möbel samt Verbesserungen. „Rückgängig“ gibt weiter alles zurück.
export const ABRISS = { anteil: 0.5, wochen: 10 };

// Alte Spielstände (vor den Baukosten): einmalig so viel Geld dazu (neues Startgeld 1.000 € statt 50 €).
// Ihre schon gebauten Wände bleiben kostenlos – beim Abriss gibt es für sie darum auch kein Geld zurück.
export const STARTGELD_AUSGLEICH = 950;

// Fenster: + `haltung` für jeden Besucher einer Veranstaltung im Raum, pro Fenster, ohne Obergrenze (wirkt wie Blumen).
// Gezählt wird jedes Fenster in einer Wand, die an den Raum grenzt (auch Innenwände).
export const FENSTER = { name: 'Fenster', haltung: 1 };   // Name: PLATZHALTER

// Foyer: Wer auf dem Weg zu seinem Platz durchs Foyer läuft, bekommt am Ende der Veranstaltung Haltung dazu
// (nie Zufriedenheit). Begrüßungsdienst = mindestens ein Ehrenamtlicher steht im Foyer (+`begruessung`).
// Die Möbel (Garderobe, Infotisch) stehen in moebel.js bei „foyer“; jedes Stück zählt.
export const FOYER = { begruessung: 3 };
