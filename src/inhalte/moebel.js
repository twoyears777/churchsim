// Inhaltsdatei: Möbel, die man im Editor aufstellen kann. Jedes Möbel belegt 1 Kästchen.
// kosten: Kaufpreis in €, wird sofort vom Konto abgezogen; beim Abriss gibt es einen Teil zurück (siehe ABRISS in bau.js).
// Namen sind Platzhalter – Lukas legt sie fest.
import { AUTOMATEN } from './automaten.js';
// kategorie: unter welchem Reiter der Bauleiste es steht (Namen der Reiter in texte.js → bauleiste).
// stufen (27.11.): Verbesserungen wie bei den Stühlen – Stufe 1 ist das gekaufte Möbel, upgrade = Preis für den Schritt auf diese Stufe.
// forschung (27.11.): erst kaufbar, wenn diese Forschung fertig ist (inhalte/forschung.js).

// Instrumente (Lukas, 27.11.): alle mit denselben Stufen. musik = so viel mehr Bonus bringt der Musiker an diesem Instrument
// (0.01 = +1 %, zählt zu seinem Musik-Bonus, auf der Bühne × 1,5). Namen, Preise, Werte PLATZHALTER von Claude.
export const INSTRUMENT_STUFEN = [
  { stufe: 1, name: 'Einsteiger', upgrade: 0, musik: 0 },
  { stufe: 2, name: 'Mittelklasse', upgrade: 40, musik: 0.01 },
  { stufe: 3, name: 'Profi', upgrade: 120, musik: 0.02 }
];
export const MOEBEL = [
  { id: 'stuhl', name: 'Stuhl', kosten: 5, kategorie: 'gottesdienst', auchIn: ['kirchkaffee', 'gemeindesaal'] },   // auchIn: steht zusätzlich unter diesem Reiter
  // Stufen (Lukas, 27.11.: „wie die Stühle“) – Namen, Preise und Werte PLATZHALTER von Claude. fassung: Tassen, laden: Spielminuten je Tasse.
  { id: 'kaffeemaschine', name: 'Kaffeemaschine', kosten: 50, fassung: 30, startFuellung: 0, kategorie: 'kirchkaffee',
    stufen: [
      { stufe: 1, name: 'Filterkaffeemaschine', upgrade: 0, fassung: 30, laden: 2.5 },
      { stufe: 2, name: 'Siebträgermaschine', upgrade: 80, fassung: 45, laden: 2 },
      { stufe: 3, name: 'Kaffeevollautomat', upgrade: 200, fassung: 60, laden: 1.5 },
      { stufe: 4, name: 'Gastro-Vollautomat', upgrade: 400, fassung: 90, laden: 1 }
    ] },
  // Sandwichmaker (Lukas, 27.11.): wie die Kaffeemaschine, braucht die Forschung „Sandwiches“. Zahlen zum Verkauf in SANDWICH (kirchkaffee.js).
  // fassung: so viele Sandwiches hat er vorrätig (PLATZHALTER von Claude), Preis PLATZHALTER von Claude.
  { id: 'sandwichmaker', name: 'Sandwichmaker', kosten: 60, fassung: 20, startFuellung: 0, kategorie: 'kirchkaffee', forschung: 'sandwiches' },  // für das Kirchkaffee
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
  // Stufen (27.11.): INSTRUMENT_STUFEN unten – der Musiker an diesem Instrument bringt + musik mehr.
  { id: 'gitarre', kategorie: 'gottesdienst', name: 'Gitarre', kosten: 25, max: 1, wirkung: { musik: true }, stufen: INSTRUMENT_STUFEN },
  { id: 'keyboard', kategorie: 'gottesdienst', name: 'Keyboard', kosten: 25, max: 1, wirkung: { musik: true }, stufen: INSTRUMENT_STUFEN },
  { id: 'schlagzeug', kategorie: 'gottesdienst', name: 'Schlagzeug', kosten: 25, max: 1, wirkung: { musik: true }, stufen: INSTRUMENT_STUFEN },
  { id: 'bass', kategorie: 'gottesdienst', name: 'Bass', kosten: 25, max: 1, wirkung: { musik: true }, stufen: INSTRUMENT_STUFEN },
  { id: 'egitarre', kategorie: 'gottesdienst', name: 'E-Gitarre', kosten: 25, max: 1, wirkung: { musik: true }, stufen: INSTRUMENT_STUFEN },
  { id: 'mikrofon', kategorie: 'gottesdienst', name: 'Mikrofon', kosten: 25, max: 1, wirkung: { musik: true }, stufen: INSTRUMENT_STUFEN },
  // Ton-Technik (Lukas, 27.11.; Spielprinzip claude/spielprinzip-tontechnik.md). Wirkt nur im Gottesdienstraum, Zahlen in TON unten.
  // ton.plaetze: so viele Personen deckt ein Lautsprecher ab – alle Lautsprecher im Raum zählen zusammen, egal wo sie stehen.
  // ton.subwoofer: Extra-Bonus je Subwoofer. ton.pult: Platz des Tontechnikers. Preise/Grenzen von Lukas freigegeben, Namen von Claude.
  // Stufen (Lukas, 27.11.) – Namen, Preise und Werte PLATZHALTER von Claude: plaetze je Lautsprecher, bonus je Subwoofer bzw. vom Pult.
  { id: 'lautsprecher', kategorie: 'gottesdienst', name: 'Lautsprecher', kosten: 40, max: 8, ton: { plaetze: 15 },
    stufen: [
      { stufe: 1, name: 'Passivbox', upgrade: 0, plaetze: 15 },
      { stufe: 2, name: 'Aktive PA-Box', upgrade: 60, plaetze: 25 },
      { stufe: 3, name: 'Line-Array-Element', upgrade: 150, plaetze: 40 }
    ] },
  { id: 'subwoofer', kategorie: 'gottesdienst', name: 'Subwoofer', kosten: 60, max: 2, ton: { subwoofer: 0.02 },
    stufen: [
      { stufe: 1, name: '12-Zoll-Subwoofer', upgrade: 0, bonus: 0.02 },
      { stufe: 2, name: '15-Zoll-Subwoofer', upgrade: 80, bonus: 0.03 },
      { stufe: 3, name: 'Doppel-18-Zoll-Subwoofer', upgrade: 180, bonus: 0.04 }
    ] },
  { id: 'tonpult', kategorie: 'gottesdienst', name: 'Tontechnikpult', kosten: 80, max: 1, ton: { pult: true },
    stufen: [
      { stufe: 1, name: 'Analogpult (12 Kanäle)', upgrade: 0, bonus: 0 },
      { stufe: 2, name: 'Digitalpult (16 Kanäle)', upgrade: 150, bonus: 0.02 },
      { stufe: 3, name: 'Digitalpult mit Stagebox (32 Kanäle)', upgrade: 400, bonus: 0.04 }
    ] },
  // Tontechnikrack (Lukas, 27.11.): 1 pro Gottesdienstraum, braucht die Forschung „Tontechnikrack“. Ausbau im Fenster des Racks (TONRACK unten).
  { id: 'tonrack', kategorie: 'gottesdienst', name: 'Tontechnikrack', kosten: 150, max: 1, forschung: 'tontechnikrack', ton: { rack: true } },

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
  // Büro (Lukas, 27.11.): ein Schreibtisch = Platz für einen Ehrenamtlichen im Büro (vorerst höchstens 1, siehe inhalte/buero.js)
  { id: 'schreibtisch', kategorie: 'buero', name: 'Schreibtisch', kosten: 50 },

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
// Bühne (Lukas, 27.11.): Bodentyp nur im Gottesdienstraum, als Fläche aufgezogen. kosten: € pro Kachel.
// bonus: Möbel auf der Bühne (Kanzel, Altar, Blumen, Grünpflanze, Instrumente) bringen ihren Bonus × diesen Wert –
// nur der Bonus-Anteil (Altar ×1,2 → ×1,3; Kanzel +2 → +3; Musiker +5 % → +7,5 %). Stühle zählen nicht.
// kollekteProKachel: + € Kollekte pro Besucher und Kachel; Sonntag, Kirchenjahr und Jugendgottesdienst vervielfachen sie mit.
export const BUEHNE = { kosten: 25, bonus: 1.5, kollekteProKachel: 0.05, raumtyp: 'gottesdienst' };

export const MUSIK = { start: 0.05, proLevel: 0.01, maxLevel: 10, erfahrungProAuftritt: 2, erfahrungProLevel: 100 };

// Ton-Technik (Lukas, 27.11.): Bonus nur mit Tontechnikpult + mind. einem Lautsprecher + eingeteiltem Tontechniker (Ehrenamtlicher).
// Bonus = start + proLevel × Tontechnik-Level + Subwoofer-Bonus; gilt für Kollekte (×(1 + Bonus)) und Haltung (+ Bonus × aktuelle Haltung).
// Decken die Lautsprecher weniger Personen ab, als Besucher sitzen, gibt es den Bonus anteilig (z. B. 30 von 40 → 75 %).
// Skill „Tontechnik“ wie Musik: Erfahrung nur durch Einsätze am Pult → ca. 1 Level je 50 Einsätze.
export const TON = { start: 0.05, proLevel: 0.01, maxLevel: 10, erfahrungProEinsatz: 2, erfahrungProLevel: 100 };

// Tontechnikrack (Lukas, 27.11.: „Zugang zu größerem Ausbau der Technik“). Alles wirkt nur, wenn die Ton-Technik läuft
// (Pult + Lautsprecher + Tontechniker) und das Rack im selben Gottesdienstraum steht. Namen, Preise, Werte PLATZHALTER von Claude.
//   inear:      In-Ear-Monitoring in Stufen. musiker: so viele Musiker hören sich darüber; plus: + Ton-Bonus je Musiker, der spielt
//               (höchstens musiker). pult: braucht mindestens diese Pult-Stufe.
//   controller: Systemcontroller / Einmessung. abdeckung: die Lautsprecher reichen für × so viele Personen.
//   plugins:    Effekt-Plugins, je einmal kaufbar. bonus: + Ton-Bonus. Alle brauchen mindestens die Pult-Stufe pluginsAbPult (Digitalpult).
//               mikrofon: wirkt nur, wenn ein Mikrofon im Raum steht und jemand spielt (Auto-Tune).
export const TONRACK = {
  inear: [
    { stufe: 1, name: 'Kabel-In-Ear (2 Wege)', preis: 100, musiker: 2, plus: 0.01 },
    { stufe: 2, name: 'Funk-In-Ear (4 Strecken)', preis: 250, musiker: 4, plus: 0.015 },
    { stufe: 3, name: 'Funk-In-Ear mit Personal-Mixern (6 Strecken)', preis: 500, musiker: 6, plus: 0.02, pult: 3 }
  ],
  controller: [
    { stufe: 1, name: 'Systemcontroller', preis: 150, abdeckung: 1.2 },
    { stufe: 2, name: 'Einmessung mit Messmikrofon', preis: 300, abdeckung: 1.4 }
  ],
  plugins: [
    { id: 'eq', name: 'Parametrischer EQ', preis: 60, bonus: 0.01 },
    { id: 'kompressor', name: 'Kompressor', preis: 80, bonus: 0.01 },
    { id: 'deesser', name: 'De-Esser', preis: 50, bonus: 0.005 },
    { id: 'hall', name: 'Hall (Reverb)', preis: 90, bonus: 0.01 },
    { id: 'delay', name: 'Delay', preis: 70, bonus: 0.005 },
    { id: 'autotune', name: 'Auto-Tune', preis: 150, bonus: 0.02, mikrofon: true }
  ],
  pluginsAbPult: 2
};
