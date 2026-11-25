# Changelog

Alle Änderungen am Churchsim. Neueste Version oben.
Versionsschema: 0.1.x – jede Veröffentlichung zählt die letzte Stelle hoch.

## 0.1.2

**Echtzeit**
- Keine Runden mehr: Die Zeit läuft durch (1 Spielstunde = 3 Sekunden), Knöpfe Pause, x1, x2, x5
- Oben: Woche, Tag, Uhrzeit und Countdown bis Sonntag; Kontostand und Bekanntheit
- Gottesdienst findet jede Woche automatisch im eingetragenen Slot statt (1 Stunde), danach 1 Stunde Kirchkaffee
- Einnahmen werden sofort gutgeschrieben; „Woche beenden“ und Wochenrückblick entfallen
- Test-Knopf „Spiel auf Start zurücksetzen“

**Besucher**
- Besucher sind feste Personen mit Zufriedenheit und Kaffeewunsch; Start mit 4 Stammgästen
- Wie viele kommen, hängt von Zufriedenheit und Bekanntheit ab; ohne Mitarbeiter im Raum kein Gottesdienst
- Stühle begrenzen nur die Plätze – wer keinen bekommt, geht wieder heim (wird angezeigt)
- Besucher anklicken: Kärtchen mit Bedürfnissen und Zufriedenheit

**Gottesdienstraum**
- Raum-Fenster bleibt nach der Auswahl offen
- Veranstaltungen als Kacheln (was sie bringen, welche Bedingungen), Wochenplan, Mitarbeiter im Raum, Wochen-Prognose

**Kirchkaffee**
- Neue Möbel Kaffeemaschine (50 €) und Theke (20 €); je Maschine 1 Ehrenamtlicher und 1 Theke
- Ehrenamtlicher macht Tasse für Tasse Kaffee, je 1 €; Maschine anklicken: Füllstand, Kaffee nachkaufen (3 € für 10 Tassen)
- Der automatische 1 € pro Gast entfällt

**Editor**
- Baut man direkt neben einen Raum, teilen sich die Räume eine Wand

## 0.1.1

**Management**
- Seitenleiste: Kontostand bleibt sichtbar, wenn „Finanzen“ zugeklappt ist
- Neuer Bereich „Besucher“ mit der Besucherzahl der letzten Woche

**Veranstaltungen**
- Gottesdienstraum anklicken (außerhalb des Editors): Veranstaltung „Gottesdienst“ oder „Keine“ einstellen; bleibt von Woche zu Woche eingestellt
- Pro Woche muss mindestens ein Gottesdienst stattfinden, sonst lässt sich die Woche nicht beenden
- Warnsymbol am Raumnamen, solange kein Gottesdienst eingestellt ist

**Kirchkaffee**
- Neuer Raum „Kirchkaffee“ (mind. 4 × 5), braucht eine Verbindungstür zum Gottesdienstraum
- Geöffnet, sobald mindestens ein Ehrenamtlicher darin eingesetzt ist
- Nach dem Gottesdienst gehen etwa 20 % der Besucher ins Kirchkaffee und kaufen einen Kaffee (1 €)

**Besucher und Ehrenamt**
- Stammbesucher: Besucher werden mit Namen und Anzahl der Besuche gemerkt und kommen mit 50 % wieder
- Ab 3 Besuchen wird ein Besucher mit 5 % pro Woche Ehrenamtlicher
- Wochenrückblick zeigt neue Ehrenamtliche mit Namen

**Editor**
- Stuhlpreis am Werkzeug und neben dem Mauszeiger (rot, wenn das Geld nicht reicht)

**Feinschliff**
- Besucher laufen auf natürlicheren, schrägen Wegen
- Seitenleiste springt erst nach dem Wochenrückblick auf die neuen Werte

## Vor 0.1.1

Raum-Editor, Stadtansicht, Pastor und Mitarbeiter-Anzeige, Runden im Kirchenjahr, Wochenrückblick, Stühle, Namenslisten, Charakter-Karte, automatische Aktualisierung, neues HUD mit Kirchenjahr-Rad, minimale Finanzen.
