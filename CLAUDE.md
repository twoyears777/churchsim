# Churchsim – Regeln für dieses Projekt

Ein 2D-Gemeindesimulator, Lukas' erstes Spiel. Der Spieler ist Gemeindemanager und baut eine Gemeinde von null auf.

## Regeln von Lukas
1. **Architektur erklären:** Jede technische Entscheidung kurz so erklären, dass sie auch ohne Programmierkenntnisse verständlich ist.
2. **Inhalte entscheidet Lukas:** Keine inhaltlichen Entscheidungen ohne ihn, auch keine Kleinigkeiten (z. B. was eine Runde ist). Vorher fragen. Texte und Design entscheidet immer Lukas.
3. **Erst Spielprinzip, dann bauen.** Ausnahme, von Lukas freigegeben: Version 1 = Raum-Editor.
4. **Veröffentlichen nur auf Ansage:** Wenn Lukas sagt, etwas soll ins Repo oder veröffentlicht werden, wird genau das gemacht (direkt auf main, kein eigenmächtiger anderer Zweig). Ist es unklar, fragen: „Soll ich veröffentlichen?“ – und nichts anderes stattdessen starten.

## Aufbau
- `src/inhalte/` – Inhaltsdateien (z. B. Raumtypen). Kann Lukas selbst erweitern.
- `src/kern/` – Spiellogik ohne Grafik. Wird mit Tests geprüft.
- `src/ansicht/` – Darstellung (zeichnet nur, ändert nichts).
- `src/oberflaeche/` – Bedienung: Werkzeuge, Eingaben, Speichern.
- `tests/` – automatische Prüfungen: `node tests/karte.test.mjs`

Kein Build-Schritt: reine Browser-Module, läuft direkt über GitHub Pages.
Texte und Farben in Version 1 sind Platzhalter, bis Lukas sie festlegt.
