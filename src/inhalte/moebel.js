// Inhaltsdatei: Möbel, die man im Editor aufstellen kann. Jedes Möbel belegt 1 Kästchen.
// kosten: Kaufpreis in €, wird sofort vom Konto abgezogen; beim Abriss gibt es einen Teil zurück (siehe ABRISS in bau.js).
// Namen sind Platzhalter – Lukas legt sie fest.
import { AUTOMATEN } from './automaten.js';
// kategorie: unter welchem Reiter der Bauleiste es steht (Namen der Reiter in texte.js → bauleiste).
export const MOEBEL = [
  { id: 'stuhl', name: 'Stuhl', kosten: 5, kategorie: 'gottesdienst', auchIn: ['kirchkaffee', 'gemeindesaal'] },   // auchIn: steht zusätzlich unter diesem Reiter
  { id: 'kaffeemaschine', name: 'Kaffeemaschine', kosten: 50, fassung: 30, startFuellung: 0, kategorie: 'kirchkaffee' },  // für das Kirchkaffee
  { id: 'theke', name: 'Theke', kosten: 20, kategorie: 'kirchkaffee' },  // für das Kirchkaffee; mehrere Thekenteile nebeneinander = eine Theke
  { id: 'tisch', name: 'Tisch', kosten: 15, kategorie: 'kirchkaffee', auchIn: ['gemeindesaal'] },  // Kirchkaffee: Stühle direkt daneben bringen mehr Trinkgeld (SITZEN.tisch)
  // Automaten (26.11.): kommen aus inhalte/automaten.js – dort stehen Preis, Lager und Stufen
  ...AUTOMATEN.map(a => ({ id: a.id, name: a.name, kosten: a.kosten, kategorie: a.kategorie, automat: true })),

  // Ausstattung des Gottesdienstraums (Spielprinzip vom 25.11.). Wirkt nur im Gottesdienstraum.
  // max: höchstens so viele pro Raum (mehr kann man nicht aufstellen).
  // wirkung.haltung: + Haltung für jeden Besucher pro Gottesdienst (pro Stück)
  // wirkung.kollekte: Kollekte × diesen Wert (pro Stück)
  // wirkung.musik: Instrument – ein Ehrenamtlicher im Raum spielt es (pro Instrument ein eigener Ehrenamtlicher)
  { id: 'kanzel', kategorie: 'gottesdienst', name: 'Kanzel', kosten: 30, max: 1, wirkung: { haltung: 2 } },
  { id: 'altar', kategorie: 'gottesdienst', name: 'Altar', kosten: 40, max: 1, wirkung: { kollekte: 1.2 } },
  { id: 'blumen', kategorie: 'deko', name: 'Blumen', kosten: 10, max: 4, wirkung: { haltung: 1 } },
  { id: 'gruenpflanze', kategorie: 'deko', name: 'Grünpflanze', kosten: 10, max: 4, wirkung: { kollekte: 1.05 } },
  // Instrumente (Lukas, 25.11.): jedes 1× pro Raum, jedes braucht einen eigenen Ehrenamtlichen, alle bringen gleich viel.
  // Preise der neuen Instrumente sind PLATZHALTER von Claude (wie die Gitarre 25 €) – Lukas legt sie fest.
  { id: 'gitarre', kategorie: 'gottesdienst', name: 'Gitarre', kosten: 25, max: 1, wirkung: { musik: true } },
  { id: 'keyboard', kategorie: 'gottesdienst', name: 'Keyboard', kosten: 25, max: 1, wirkung: { musik: true } },
  { id: 'schlagzeug', kategorie: 'gottesdienst', name: 'Schlagzeug', kosten: 25, max: 1, wirkung: { musik: true } },
  { id: 'bass', kategorie: 'gottesdienst', name: 'Bass', kosten: 25, max: 1, wirkung: { musik: true } },
  { id: 'egitarre', kategorie: 'gottesdienst', name: 'E-Gitarre', kosten: 25, max: 1, wirkung: { musik: true } },
  { id: 'mikrofon', kategorie: 'gottesdienst', name: 'Mikrofon', kosten: 25, max: 1, wirkung: { musik: true } },

  // Gemeindesaal (Lukas, 25.11.): Klavier für die Kirchenchorprobe, 1× pro Raum. Kein Instrument fürs Lobpreisteam.
  { id: 'klavier', kategorie: 'gemeindesaal', name: 'Klavier', kosten: 100, max: 1 },

  // Foyer (Lukas, 25.11.): wirkt nur im Foyer. foyer.haltung: + Haltung für jeden, der durchs Foyer läuft (pro Stück).
  // Namen sind PLATZHALTER, Preise und Wirkung von Lukas freigegeben.
  { id: 'garderobe', kategorie: 'foyer', name: 'Garderobe', kosten: 30, foyer: { haltung: 2 } },
  { id: 'infotisch', kategorie: 'foyer', name: 'Infotisch', kosten: 40, foyer: { haltung: 2 } },

  // Toiletten (Lukas, 26.11.): Die WC-Kabine ist Pflicht (1 Person gleichzeitig), das Waschbecken gehört dazu, bewirkt aber nichts.
  // Namen und Preise sind PLATZHALTER von Claude – Lukas legt sie fest.
  { id: 'wc', kategorie: 'toiletten', name: 'WC-Kabine', kosten: 30 },
  { id: 'waschbecken', kategorie: 'toiletten', name: 'Waschbecken', kosten: 15 },
  // Lager (Lukas, 27.11.): 1 Regal pro Logistik-Mitarbeiter und Zeitblock
  { id: 'regal', kategorie: 'lager', name: 'Regal', kosten: 50 },

  // Außen (Spielprinzip Einzugsgebiet, 25.11.): nur draußen auf dem Grundstück, nicht in Räumen. Man kann darüber laufen.
  // groesse: [Breite, Länge] in Kästchen (lässt sich drehen). Preise sind PLATZHALTER von Claude.
  { id: 'strasse', kategorie: 'aussen', name: 'Straße', kosten: 2, aussen: true },
  { id: 'parkplatz', kategorie: 'aussen', name: 'Parkplatz', kosten: 15, aussen: true, groesse: [2, 1] },

  // Außendeko (Spielprinzip „Wege und Außendeko“, von Lukas freigegeben 25.11.): nur draußen auf dem Grundstück.
  // gelaende: so viele Punkte bringt ein Stück für den Wert „Gelände“ (siehe inhalte/gelaende.js).
  // abBekanntheit: erst ab dieser Bekanntheit kaufbar. hindernis: Figuren laufen darum herum (über den Weg kann man laufen).
  // Namen sind Platzhalter (ENTWURF), Punkte, Preise und Freischaltung von Lukas freigegeben.
  { id: 'weg', kategorie: 'aussen', name: 'Weg', kosten: 1, aussen: true, gelaende: 0.5 },
  { id: 'busch', kategorie: 'aussen', name: 'Busch', kosten: 5, aussen: true, hindernis: true, gelaende: 2 },
  { id: 'hecke', kategorie: 'aussen', name: 'Hecke', kosten: 3, aussen: true, hindernis: true, gelaende: 1 },
  { id: 'blumenbeet', kategorie: 'aussen', name: 'Blumenbeet', kosten: 8, aussen: true, hindernis: true, gelaende: 3 },
  { id: 'bank', kategorie: 'aussen', name: 'Bank', kosten: 15, aussen: true, hindernis: true, gelaende: 2 },
  { id: 'laterne', kategorie: 'aussen', name: 'Laterne', kosten: 12, aussen: true, hindernis: true, gelaende: 2, abBekanntheit: 10 },
  { id: 'baum', kategorie: 'aussen', name: 'Baum', kosten: 20, aussen: true, hindernis: true, gelaende: 4, abBekanntheit: 10, groesse: [2, 2] },
  { id: 'schaukasten', kategorie: 'aussen', name: 'Schaukasten', kosten: 40, aussen: true, hindernis: true, gelaende: 5, abBekanntheit: 15 }
];

// Stühle verbessern: Stufe 1 ist der gekaufte Stuhl. upgrade = Preis für den Schritt auf diese Stufe.
// haltung: + Haltung pro Gottesdienst für den, der darauf sitzt. kollekte: Kollekte dieser Person × Wert.
// trinkgeld: im Kirchkaffee Trinkgeld × Wert (Lukas, 25.11.)
export const STUHL_STUFEN = [
  { stufe: 1, name: 'Holzstuhl', upgrade: 0, haltung: 0, kollekte: 1, trinkgeld: 1 },
  { stufe: 2, name: 'Polsterstuhl', upgrade: 20, haltung: 2, kollekte: 1.2, trinkgeld: 1.1 },
  { stufe: 3, name: 'Komfortstuhl', upgrade: 60, haltung: 4, kollekte: 1.4, trinkgeld: 1.2 },
  { stufe: 4, name: 'Ehrenstuhl', upgrade: 150, haltung: 6, kollekte: 1.6, trinkgeld: 1.3 }
];

// Lobpreisteam (Spielprinzip vom 25.11., von Lukas festgelegt): Instrumente + Ehrenamtliche, die sie spielen (1 pro Instrument).
// Ein Instrument ohne Spieler bringt nichts. Jeder Musiker bringt seinen Bonus, die Boni werden addiert:
// Kollekte + Summe und Haltung + Summe (vom aktuellen Wert jedes Besuchers). Beispiel: Level 0, 1, 2 → +5 % +6 % +7 % = +18 %.
// start: Bonus bei Musik-Level 0 (0.05 = 5 %); proLevel: dazu je Level; maxLevel: höchstes Level.
// Erfahrung gibt es nur durchs Musikmachen in einer Veranstaltung: erfahrungProAuftritt, erfahrungProLevel → ca. 1 Level je 50 Auftritte.
export const MUSIK = { start: 0.05, proLevel: 0.01, maxLevel: 10, erfahrungProAuftritt: 2, erfahrungProLevel: 100 };
