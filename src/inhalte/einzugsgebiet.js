// Inhaltsdatei: Einzugsgebiet – wie viele Menschen die Gemeinde überhaupt erreichen kann (Spielprinzip vom 25.11.).
// Mitgezählt werden Besucher, Passanten im Ort und Ehrenamtliche, die aus Besuchern geworden sind.
// Ist das Gebiet voll, kommen keine neuen Menschen dazu. Maßnahmen machen es größer.
// Zahlen von Lukas freigegeben (25.11.), nach dem Testen leicht anpassbar.
export const EINZUGSGEBIET = { start: 40 };

// Parkplatz: aus Straße (1×1) und Parkplätzen (2×1) auf dem Grundstück gebaut (Preise siehe moebel.js).
// Ein Parkplatz zählt, wenn er an einer Straße liegt, die bis zum Tor führt.
export const PARKPLATZ = { plus: 3, abBekanntheit: 10 };

// Bushaltestelle am Gehweg neben dem Tor: kaufen, dann in Stufen ausbauen. plus = so viel mehr Einzugsgebiet pro Stufe.
export const BUSHALTESTELLE = [
  { stufe: 1, name: 'Haltestellenschild', plus: 30, preis: 200, abBekanntheit: 25 },
  { stufe: 2, name: 'Wartehäuschen', plus: 30, preis: 300, abBekanntheit: 35 },
  { stufe: 3, name: 'Modernes Wartehäuschen aus Glas', plus: 40, preis: 500, abBekanntheit: 50 }
];
// Wo die Bushaltestelle steht (Kästchen links oben) – auf dem Grünstreifen und Gehweg rechts neben dem Tor
export const BUSHALTESTELLE_ORT = { x: 32, y: 33, w: 3, h: 2 };

// Überregionale Werbekampagne: einmal kaufen, wirkt dauerhaft
export const WERBEKAMPAGNE = { plus: 50, preis: 400, abBekanntheit: 40 };
