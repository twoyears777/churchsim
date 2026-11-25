// Inhaltsdatei: Wert „Gelände“ – wie schön das Grundstück draußen gestaltet ist (Spielprinzip „Wege und Außendeko“, 25.11.).
// Jedes Stück Außendeko bringt Punkte (stehen in moebel.js bei „gelaende“). Zahlen von Lukas freigegeben (25.11.).
// Wirkung: Passanten werden am Tor um Gelände ÷ 10 Prozentpunkte öfter neugierig (Gelände 100 → +10 %),
// danach wirkt das Plakat wie bisher (×3), höchstens 100 %.
export const GELAENDE = { max: 100, neugierProPunkt: 0.001 };

// Schaukasten: Man wählt eine regelmäßige Veranstaltung (Veranstaltung 1 oder 2 eines Raums), für die er wirbt.
// Der Aushang bleibt hängen, bis man ihn ändert. Solange die Veranstaltung eingestellt ist: Passanten +10 Prozentpunkte neugieriger.
// Mehrere Schaukästen dürfen für verschiedene Veranstaltungen werben; für dieselbe Veranstaltung zählt der Bonus nur einmal.
// Der Aushang ist kostenlos (Lukas, 25.11.).
export const SCHAUKASTEN = { neugier: 0.10 };
