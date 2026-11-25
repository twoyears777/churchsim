// Inhaltsdatei: Kirchenjahr (evangelische Namen der Sonntage).
// Das Spiel beginnt am 1. Advent. Das Jahr wird nicht angezeigt; intern rechnen wir ab 2026,
// weil Ostern und damit viele Sonntage jedes Jahr anders fallen.
export const START = { jahr: 2026, monat: 11, tag: 29 };

// Sonntage, die von Ostern abhängen: Abstand zu Ostern in Wochen
export const UM_OSTERN = {
  '-9': 'Septuagesimä', '-8': 'Sexagesimä', '-7': 'Estomihi', '-6': 'Invokavit', '-5': 'Reminiszere',
  '-4': 'Okuli', '-3': 'Lätare', '-2': 'Judika', '-1': 'Palmsonntag', '0': 'Ostersonntag',
  '1': 'Quasimodogeniti', '2': 'Miserikordias Domini', '3': 'Jubilate', '4': 'Kantate', '5': 'Rogate',
  '6': 'Exaudi', '7': 'Pfingstsonntag', '8': 'Trinitatis'
};

export const NAMEN = {
  advent: n => `${n}. Advent`,
  christfest1: 'Christfest I', christfest2: 'Christfest II',
  nachChristfest: n => `${n}. Sonntag nach dem Christfest`,
  neujahr: 'Neujahr', epiphanias: 'Epiphanias',
  nachEpiphanias: n => `${n}. Sonntag nach Epiphanias`, letzterNachEpiphanias: 'Letzter Sonntag nach Epiphanias',
  nachTrinitatis: n => `${n}. Sonntag nach Trinitatis`,
  drittletzter: 'Drittletzter Sonntag des Kirchenjahres', vorletzter: 'Vorletzter Sonntag des Kirchenjahres',
  ewigkeit: 'Ewigkeitssonntag'
};

// Zeiten des Kirchenjahres für das Kirchenjahr-Rad. Beginn jeweils relativ zu einem Stichtag.
// Farben: Platzhalter nach liturgischen Farben – Design legt Lukas fest.
export const ZEITEN = [
  { id: 'advent', name: 'Adventszeit', farbe: '#7b5ea7' },          // ab 1. Advent
  { id: 'weihnachten', name: 'Weihnachtszeit', farbe: '#efe9d8' },  // ab 25.12.
  { id: 'epiphanias', name: 'Epiphaniaszeit', farbe: '#7fa860' },   // ab 6.1.
  { id: 'vorpassion', name: 'Vorpassionszeit', farbe: '#a9c48f' },  // ab Septuagesimä
  { id: 'passion', name: 'Passionszeit', farbe: '#5b3f86' },        // ab Aschermittwoch
  { id: 'ostern', name: 'Osterzeit', farbe: '#f7f3e8' },            // ab Ostersonntag
  { id: 'trinitatis', name: 'Trinitatiszeit', farbe: '#5f8f45' }    // ab Trinitatis
];

// ---- Feste und Feiertage (Spielprinzip von Lukas, 25.11.2026: claude/vorschlag-kirchenjahr-feste.md) ----
// besucher: Kommchance der bekannten Besucher × Faktor (höchstens 100 %) und neue Besucher × Faktor.
// kollekte: Kollekte × Faktor (wird mit dem ×2 am Sonntagvormittag multipliziert).
// gross: vor diesem Fest öffnet sich das Fest-Menü (Sonderevent planen). slot: Vorbelegung im Fest-Menü.
// wann: wie das Datum berechnet wird – fest (Tag/Monat), um Ostern (Tage Abstand), vor dem 1. Advent (Tage), 1. Sonntag im Oktober.
export const FESTE = [
  { id: 'heiligabend', name: 'Heiligabend', wann: { tag: 24, monat: 12 }, besucher: 3, kollekte: 2, gross: true, slot: 'nachmittag' },
  { id: 'christfest1', name: 'Christfest I', wann: { tag: 25, monat: 12 }, besucher: 1.5, kollekte: 1.5, gross: true, slot: 'vormittag' },
  { id: 'christfest2', name: 'Christfest II', wann: { tag: 26, monat: 12 }, besucher: 1.5, kollekte: 1.5 },
  { id: 'altjahresabend', name: 'Altjahresabend', wann: { tag: 31, monat: 12 }, besucher: 1.3, kollekte: 1 },
  { id: 'epiphanias', name: 'Epiphanias', wann: { tag: 6, monat: 1 }, besucher: 1.2, kollekte: 1 },
  { id: 'gruendonnerstag', name: 'Gründonnerstag', wann: { ostern: -3 }, besucher: 1.3, kollekte: 1 },
  { id: 'karfreitag', name: 'Karfreitag', wann: { ostern: -2 }, besucher: 1.5, kollekte: 1, gross: true, slot: 'vormittag' },
  { id: 'ostersonntag', name: 'Ostersonntag', wann: { ostern: 0 }, besucher: 2, kollekte: 1.5, gross: true, slot: 'vormittag' },
  { id: 'ostermontag', name: 'Ostermontag', wann: { ostern: 1 }, besucher: 1.3, kollekte: 1 },
  { id: 'himmelfahrt', name: 'Himmelfahrt', wann: { ostern: 39 }, besucher: 1.3, kollekte: 1 },
  { id: 'pfingstsonntag', name: 'Pfingstsonntag', wann: { ostern: 49 }, besucher: 1.3, kollekte: 1, gross: true, slot: 'vormittag' },
  { id: 'pfingstmontag', name: 'Pfingstmontag', wann: { ostern: 50 }, besucher: 1.2, kollekte: 1 },
  { id: 'erntedank', name: 'Erntedank', wann: { ersterSonntagIm: 10 }, besucher: 1.5, kollekte: 1.5, gross: true, slot: 'vormittag' },
  { id: 'reformationstag', name: 'Reformationstag', wann: { tag: 31, monat: 10 }, besucher: 1.3, kollekte: 1 },
  { id: 'bussbettag', name: 'Buß- und Bettag', wann: { vorAdvent: 11 }, besucher: 1.2, kollekte: 1 },
  { id: 'ewigkeitssonntag', name: 'Ewigkeitssonntag', wann: { vorAdvent: 7 }, besucher: 1.3, kollekte: 1 }
];
// Gesperrte Feste: werden im Kirchenjahr-Fenster ausgegraut gezeigt (Konfirmation: später mit Konfirmandenunterricht)
export const FESTE_GESPERRT = [{ id: 'konfirmation', name: 'Konfirmation', braucht: 'konfirmandenunterricht' }];

// Zeiten im Kirchenjahr mit eigenem Besucher-Faktor (gilt die ganze Zeit). Fest und Zeit gleichzeitig: der höhere zählt.
export const ZEIT_FAKTOREN = { advent: { besucher: 1.2, kollekte: 1 } };

// So viele Tage vor einem großen Fest öffnet sich das Fest-Menü (um 8:00 Uhr), das Spiel pausiert.
export const FEST_MENUE = { tageVorher: 7, stunde: 8 };

// Gesetzliche Feiertage bundesweit + Baden-Württemberg (Lukas, 25.11.): doppelt so viele Passanten.
export const FEIERTAGE = [
  { tag: 1, monat: 1 }, { tag: 6, monat: 1 }, { ostern: -2 }, { ostern: 1 }, { tag: 1, monat: 5 }, { ostern: 39 },
  { ostern: 50 }, { ostern: 60 }, { tag: 3, monat: 10 }, { tag: 1, monat: 11 }, { tag: 25, monat: 12 }, { tag: 26, monat: 12 }
];
export const FEIERTAG_PASSANTEN = 2;
