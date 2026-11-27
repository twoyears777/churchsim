// Inhaltsdatei: Regeln für Besucher, Zufriedenheit, Bekanntheit und den Weg ins Ehrenamt.
// Zahlen von Lukas freigegeben (25.11.), nach dem Testen leicht anpassbar.
export const START_STAMMGAESTE = 4;       // so viele Stammgäste gibt es bei Spielbeginn
export const START_ZUFRIEDENHEIT = 60;    // ... mit dieser Zufriedenheit
export const NEU_ZUFRIEDENHEIT = 50;      // neue Besucher starten mit dieser Zufriedenheit
// Haltungslevel (Lukas, 25.11.: claude/spielprinzip-beduerfnisse-wochenende.md): Haltung 0–100 je Level.
// Bei 100 ein Level höher und die Haltung beginnt wieder bei 0; bei 0 ein Level tiefer, die Haltung steht dann bei nachAbstieg.
// startBesucher: so starten die Start-Stammgäste und alle Besucher aus alten Spielständen (neue Menschen: Level 1).
export const HALTUNGSLEVEL = { max: 5, aufstiegBei: 100, nachAbstieg: 50, startBesucher: 2 };
// Chance zu kommen (Lukas: Grundwahrscheinlichkeit + Level + Haltung). Zahlen: VORSCHLAG von Claude, Lukas justiert.
// Chance = grund + jeLevel × (Level − 1) + haltung × Haltung/100, höchstens 100 %. Level 1, Haltung 50 → 37,5 %; Level 3, Haltung 50 → 67,5 %.
export const KOMMCHANCE = { grund: 0.3, jeLevel: 0.15, haltung: 0.15 };
// Bedürfnisse (Lukas, 25.11.): bei jedem Level-Aufstieg ein zufälliges dazu, beim Abstieg geht das zuletzt dazugekommene wieder.
// Geprüft Sonntag 24:00: jedes nicht erfüllte Bedürfnis → nichtErfuellt Haltung; erfüllt → kein Plus.
// Lobpreis entsteht nur bei einer Lobpreis-Vorliebe ab lobpreisAb.
export const BEDUERFNISSE = { liste: ['lobpreis', 'kaffee', 'spass'], lobpreisAb: 0.5, nichtErfuellt: -5 };
// Kaffee: Jeder Mensch hat einen festen Kaffee-Wert 0–100 % (wie die Lobpreis-Vorliebe). Er ersetzt seit 25.11. das Ja/Nein:
// Nach dem Gottesdienst und beim Vorbeilaufen am offenen Kirchkaffee will er mit dieser Chance einen Kaffee.

// Lobpreis-Vorliebe und Musik (Spielprinzip von Lukas, 25.11.; v = Vorliebe 0–1):
// Normaler Gottesdienst mit Lobpreisteam: Chance zu kommen × (mitMusik + v); ohne Lobpreisteam: × (ohneMusik − v); höchstens 100 %.
// Haltung durch das Lobpreisteam (Gottesdienst und Lobpreisgottesdienst): Bonus × (haltungFaktor × v − 1), kann ins Minus gehen.
export const LOBPREIS_MUSIK = { mitMusik: 0.5, ohneMusik: 1.5, haltungFaktor: 2 };

// Änderung der Zufriedenheit nach jedem Gottesdienst
export const AENDERUNG = {
  sitzplatz: 5,          // Sitzplatz bekommen
  heimgeschickt: -15,    // kein Stuhl frei
  gottesdienst: 5,       // Mitarbeiter hat Gottesdienst gehalten
  kaffeeJa: 5,           // wollte Kaffee und bekommen
  kaffeeNein: -10,       // wollte Kaffee, keinen bekommen
  ausfall: -5            // kein Gottesdienst (kein Mitarbeiter): jeder Stammgast
};

// Bekanntheit der Gemeinde (0–100)
export const BEKANNTHEIT = {
  // 25.11.: alle Werte ÷ 5, damit die Bekanntheit sehr langsam wächst (vorher 3 / 1)
  proGottesdienst: 0.6,    // pro stattfindendem Gottesdienst
  sehrZufrieden: 80,       // ab dieser Zufriedenheit ...
  proSehrZufriedenem: 0.2, // ... gibt es pro anwesendem Besucher so viel Bekanntheit
  protokoll: 10,           // so viele letzte Änderungen merkt sich das Spiel fürs Bekanntheit-Fenster
  teiler: 10             // neue Besucher pro Woche im Schnitt = Bekanntheit ÷ 10
};

// Jugendliche (Lukas, 25.11.): 20 % aller Menschen (Besucher und Passanten) sind Jugendliche.
// Kommchance = normale (haltungsabhängige) Kommchance × Faktor der Veranstaltung. Nicht aufgeführt: × 1.
// Später (Jugendgottesdienst): dort höher.
export const JUGEND = { anteil: 0.2, faktor: { gottesdienst: 0.5, lobpreis: 0.5, senioren: 0, chorprobe: 0.2, konfi: 0.6, spiele: 0.25, jugend: 2.5 } };
// Konfirmandenunterricht (Lukas, 25.11.): so viele Teilnahmen in einem Jahrgang (von Konfirmation zu Konfirmation) → Konfirmand
export const KONFI = { teilnahmen: 7 };

export const EHRENAMT_AB_BESUCHEN = 2;  // ab so vielen Besuchen ... (Lukas, 27.11.: vorher 3)
export const EHRENAMT_QUOTE = 0.05;     // ... wird man mit dieser Wahrscheinlichkeit pro Besuch Ehrenamtlicher
// Balancing (Lukas, 27.11.), damit Ehrenamtliche gleichmäßiger kommen und nicht alle Besucher zu Ehrenamtlichen werden:
//   besucherJeEA      Bremse: höchstens 1 Ehrenamtlicher je so viele Besucher (alle Ehrenamtlichen zählen, auch die vom Spielstart).
//                     Ist die Grenze erreicht, wird über den Würfel niemand mehr Ehrenamtlicher.
//   proVeranstaltung  höchstens so viele neue Ehrenamtliche pro Veranstaltung
//   sicher            Solange es weniger als bisAnzahl Ehrenamtliche gibt: War seit wochen Wochen kein neuer dabei,
//                     wird bei der nächsten Veranstaltung sicher ein Anwesender Ehrenamtlicher (auch über die Bremse hinweg).
export const EHRENAMT = { besucherJeEA: 5, proVeranstaltung: 1, sicher: { wochen: 3, bisAnzahl: 5 } };

// Erster Gottesdienst (Lukas, 26.11.): Beim ersten normalen Gottesdienst, der wirklich stattfindet, kommen neueLeute zusätzlich
// (fest, aus dem Ort bzw. ganz neue Menschen), und danach werden mindestens ehrenamt Anwesende Ehrenamtliche
// (mit der Frau des Pastors sind es dann 2). Zeitungsartikel: zeitungTageVorher Tage vorher um zeitungStunde Uhr, die Zeit steht, bis man weiterklickt.
export const ERSTER_GOTTESDIENST = { neueLeute: 10, ehrenamt: 1, zeitungTageVorher: 1, zeitungStunde: 8 };
