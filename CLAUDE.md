# Churchsim – Regeln für dieses Projekt

Ein 2D-Gemeindesimulator, Lukas' erstes Spiel. Der Spieler ist Gemeindemanager und baut eine Gemeinde von null auf.

## Regeln von Lukas
Die vollständigen Regeln stehen im claude.ai-Projekt „Church-Sim“ (projektregeln.md). Kurzfassung:
1. **Feinschliff vor Masse:** Vorhandenes rund machen statt viele neue Funktionen; keine neuen Features von sich aus vorschlagen.
2. **Architektur erklären:** Jede technische Entscheidung kurz so erklären, dass sie auch ohne Programmierkenntnisse verständlich ist.
3. **Inhalte entscheidet Lukas:** Keine inhaltlichen Entscheidungen ohne ihn, auch keine Kleinigkeiten. Vorher fragen. Texte und Design entscheidet immer Lukas.
4. **Erst Spielprinzip, dann bauen.** Ausnahme, von Lukas freigegeben: Version 1 = Raum-Editor.
5. **Veröffentlichen nur auf Ansage:** Änderungen sammeln sich lokal. Push auf main nur, wenn Lukas es sagt – dann direkt auf main, kein eigenmächtiger anderer Zweig. Vorher Liste der Änderungen zeigen und fragen: „Soll ich veröffentlichen?“
6. **Weniger Testbilder:** Browser-Screenshots nur bei größeren Schritten; automatische Tests immer.
7. **PC hat Vorrang** (Ziel ist Steam); iPad als Web-App ist zweitrangig.

## Aufbau
- `src/inhalte/` – Inhaltsdateien (z. B. Raumtypen). Kann Lukas selbst erweitern.
- `src/kern/` – Spiellogik ohne Grafik. Wird mit Tests geprüft.
- `src/ansicht/` – Darstellung (zeichnet nur, ändert nichts).
- `src/oberflaeche/` – Bedienung: Werkzeuge, Eingaben, Speichern.
- `tests/` – automatische Prüfungen: `node tests/karte.test.mjs`

Kein Build-Schritt: reine Browser-Module, läuft direkt über GitHub Pages.

## Beim Veröffentlichen
- Versionsnummer in `version.json` **und** `src/version.js` gleich hochzählen (z. B. `2026-11-25.2`). Daran erkennt die App ein Update und lädt sich selbst neu.
- `sw.js` holt immer zuerst die neueste Version aus dem Netz; offline wird die zuletzt geladene genutzt.
Texte und Farben in Version 1 sind Platzhalter, bis Lukas sie festlegt.
