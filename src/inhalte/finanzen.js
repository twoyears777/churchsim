// Inhaltsdatei: Grundwerte der Finanzen. Das Wirtschaftssystem wird später ausgebaut.
import { AUTOMATEN } from './automaten.js';
export const STARTGELD = 1000;              // Kontostand zu Spielbeginn (€) – Lukas, 25.11.: 1.000 € (wegen der Baukosten)
export const KOLLEKTE_PRO_BESUCHER = 1;     // € pro Besucher im Gottesdienst

// Kategorien
export const EINNAHMEN = { kollekte: 'Kollekte', kirchkaffee: 'Kirchkaffee', rueckerstattung: 'Rückerstattung', spende: 'Spende', dauerspende: 'Dauerspenden', mitglied: 'Mitgliedsbeiträge', ausgleich: 'Startgeld-Ausgleich',
  ...Object.fromEntries(AUTOMATEN.map(a => [a.id, a.name])) };   // Automaten (26.11.): Verkauf je Automat eine eigene Zeile (ENTWURF)   // Startgeld-Ausgleich: ENTWURF von Claude
export const AUSGABEN = { moebel: 'Möbel', kaffee: 'Kaffee', seelsorge: 'Seelsorge', plakat: 'Plakat', einzugsgebiet: 'Einzugsgebiet', forschung: 'Forschung', bau: 'Bau',
  ...Object.fromEntries(AUTOMATEN.map(a => [a.id, a.name])) };   // Automaten (26.11.): Einkauf im Laden je Automat eine eigene Zeile (ENTWURF)   // Forschung, Bau: ENTWURF von Claude

// Finanzübersicht (Spielprinzip vom 25.11.2026: Fenster mit dieser Woche, Kassenbuch und Verlauf)
export const VERLAUF_WOCHEN = 8;     // Platzhalter von Claude: so viele vergangene Wochen zeigt der Verlauf
export const KASSENBUCH_MAX = 500;   // Platzhalter von Claude: höchstens so viele Einzelbuchungen pro Woche im Kassenbuch

// Dauerspender (Spielprinzip von Lukas, 25.11.2026): Wer montags mindestens Haltungslevel `abLevel` hat (bis 25.11.: Haltung ab 80), wird mit `chance` Dauerspender.
// Spenden gehen montags um `stunde` Uhr ein: zuerst `start` €, jede Woche `steigerung` € mehr, höchstens `max` €.
// Geprüft wird nur montags; liegt das Level dann unter `abLevel`, endet die Dauerspende (wer wiederkommt, beginnt bei `start` €).
// Lukas, 27.11.: seltener, dafür höhere Beträge (vorher chance 0,75, start 5, max 20); neue Dauerspender werden eingeblendet.
export const DAUERSPENDE = { abLevel: 3, chance: 0.05, start: 20, steigerung: 1, max: 100, stunde: 8 };

// Gemeindemitglieder (Spielprinzip von Lukas, 27.11.2026: claude/spielprinzip-gemeindemitglieder.md)
// Werden: erwachsene Besucher ab Haltungslevel `abLevel` bei jedem Gottesdienstbesuch mit `chance`.
// Kommen öfter: Chance zu kommen + `kommBonus`. Kündigen: Sonntag 24:00 nach Haltungslevel (`kuendigung`; ab Level 3: nie).
// Beitrag: am 1. jedes Monats um `stunde` Uhr je Mitglied; einstellbar `beitragMin`–`beitragMax` in `beitragSchritt`-Schritten, Start `beitragStart`.
// Haltung beim Abbuchen: bei `neutral` € nichts; je Schritt darüber `haltungMehr`, je Schritt darunter `haltungWeniger`.
export const MITGLIED = { abLevel: 3, chance: 0.10, kommBonus: 0.20, kuendigung: { 1: 0.70, 2: 0.30 },
  beitragStart: 10, beitragMin: 0, beitragMax: 50, beitragSchritt: 5, neutral: 10, haltungMehr: -3, haltungWeniger: 2, stunde: 8 };
