// Inhaltsdatei: die Stadt rund um das eigene Grundstück.
// Alle Angaben in Kästchen. x/y = linke obere Ecke, w/h = Breite/Höhe.
// Lage, Größen und Farben sind Platzhalter, die Lukas anpassen kann.

export const WELT = { w: 64, h: 42 };

// Das eigene Grundstück: nur hier darf gebaut werden.
export const GRUNDSTUECK = { x: 8, y: 6, w: 40, h: 27, tor: { x: 26, breite: 4 } }; // Tor unten, Richtung Straße

export const STRASSEN = [
  { x: 0, y: 35, w: 64, h: 4, richtung: 'waagrecht' },
  { x: 51, y: 0, w: 4, h: 42, richtung: 'senkrecht' }
];

export const GEHWEGE = [
  { x: 0, y: 34, w: 64, h: 1 }, { x: 0, y: 39, w: 64, h: 1 },
  { x: 50, y: 0, w: 1, h: 42 }, { x: 55, y: 0, w: 1, h: 42 }
];

export const NACHBARN = [
  { x: 0, y: 0, w: 7, h: 15, haus: { x: 1, y: 3, w: 5, h: 7, dach: '#b0644a' } },
  { x: 0, y: 16, w: 7, h: 17, haus: { x: 1, y: 20, w: 5, h: 8, dach: '#7c7f86' } },
  { x: 8, y: 0, w: 19, h: 5, haus: { x: 11, y: 0, w: 10, h: 3, dach: '#8c5a42' } },
  { x: 28, y: 0, w: 21, h: 5, haus: { x: 32, y: 0, w: 12, h: 3, dach: '#a36b5a' } },
  { x: 56, y: 0, w: 8, h: 16, haus: { x: 57, y: 4, w: 6, h: 8, dach: '#6f7378' } },
  { x: 56, y: 17, w: 8, h: 17, haus: { x: 57, y: 21, w: 6, h: 9, dach: '#b0644a' } },
  { x: 0, y: 40, w: 24, h: 2, haus: { x: 4, y: 40, w: 10, h: 2, dach: '#8c5a42' } },
  { x: 25, y: 40, w: 25, h: 2, haus: { x: 30, y: 40, w: 12, h: 2, dach: '#7c7f86' } },
  { x: 56, y: 40, w: 8, h: 2, haus: null }
];

// Bäume: Mittelpunkt (in Kästchen) und Radius.
export const BAEUME = [
  { x: 5.5, y: 12.5, r: 1.6 }, { x: 2, y: 30.5, r: 1.4 }, { x: 24.5, y: 2.5, r: 1.6 },
  { x: 47, y: 2.5, r: 1.3 }, { x: 60.5, y: 14, r: 1.5 }, { x: 58, y: 32, r: 1.3 },
  { x: 49.2, y: 10, r: 1.1 }, { x: 49.2, y: 22, r: 1.1 }, { x: 18, y: 41, r: 1.2 }, { x: 47, y: 41, r: 1.2 }
];

// Der Laden, in dem die Ehrenamtlichen Kaffee kaufen (Lukas, 25.11.): das untere Nachbarhaus ganz rechts.
// nachbar = Nummer in NACHBARN (0 = erstes), eingang = Kästchen, bis zu dem der Ehrenamtliche läuft.
export const LADEN = { nachbar: 5, eingang: { x: 56, y: 25 } };
