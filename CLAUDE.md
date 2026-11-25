# Churchsim – Regeln für dieses Projekt

Ein 2D-Gemeindesimulator, Lukas' erstes Spiel. Der Spieler ist Gemeindemanager und baut eine Gemeinde von null auf.

## Regeln von Lukas
Die vollständigen Regeln stehen im claude.ai-Projekt „Church-Sim“ (projektregeln.md). Kurzfassung:
1. **Feinschliff vor Masse:** Vorhandenes rund machen statt viele neue Funktionen; keine neuen Features von sich aus vorschlagen.
2. **Architektur erklären:** Jede technische Entscheidung kurz so erklären, dass sie auch ohne Programmierkenntnisse verständlich ist.
3. **Inhalte entscheidet Lukas:** Keine inhaltlichen Entscheidungen ohne ihn, auch keine Kleinigkeiten. Vorher fragen. Texte und Design entscheidet immer Lukas.
4. **Erst Spielprinzip, dann bauen.** Ausnahme, von Lukas freigegeben: Version 1 = Raum-Editor.
5. **Veröffentlichen nur auf Ansage:** Fertige Änderungen sammeln sich auf dem Zweig `naechstes-update` und in der Liste `claude/naechstes-update.md` im claude.ai-Projekt (chatunabhängig). Neue Arbeit baut auf diesem Zweig auf. Auf main kommt alles gesammelt erst, wenn Lukas es sagt. Vorher Liste der Änderungen zeigen und fragen: „Soll ich veröffentlichen?“
6. **Weniger Testbilder:** Browser-Screenshots nur bei größeren Schritten; automatische Tests immer.
7. **PC hat Vorrang** (Ziel ist Steam); iPad als Web-App ist zweitrangig.

## Aufbau
- `src/inhalte/` – Inhaltsdateien (z. B. Raumtypen, Zahlen, Texte in `texte.js`). Kann Lukas selbst erweitern.
- `src/kern/` – Spiellogik ohne Grafik: Zahlen, Berechnungen, Tick-System. Wird mit Tests geprüft.
- `src/kern/spiel.js` – die **Schalterwand**: einziger Zugang der Oberfläche zur Spiellogik (Befehle + Abfragen).
- `src/ansicht/` – Darstellung (zeichnet nur, ändert nichts).
- `src/oberflaeche/` – Bedienung: `start.js` (Uhr, Zeichnen), `eingaben.js`, `anzeigen.js`, `fenster.js`, `speicher.js`.
- `tests/` – automatische Prüfungen: `node tests/karte.test.mjs`, `node tests/menschen.test.mjs` (Passanten, Seelsorge) , `node tests/ausstattung.test.mjs` (Stuhlstufen, Möbel im Gottesdienstraum, Musiker, Plakat) und `node tests/veranstaltungen.test.mjs` (Veranstaltung 1/2, Lobpreisgottesdienst, Bekanntheit-Protokoll). Der Changelog im Spiel (`src/oberflaeche/changelog.js`) liest CHANGELOG.md – deshalb dort das Format beibehalten: `## 0.1.x` als Versionsüberschrift, Bereiche als `**Fett**`-Zeile, Punkte mit `- `.

## Trennung Spiellogik / Oberfläche (strikt)
- Oberfläche und Ansicht importieren aus `src/kern/` **nur** `spiel.js` und aus `src/inhalte/` nur Texte, Farben, Stadt.
- Die Oberfläche rechnet keine Spielregeln und verändert den Spielstand nie direkt – sie gibt Befehle
  (Antwort: Code wie 'ok'/'geld'/'platz') und stellt Abfragen (Antwort: Kopien mit Zahlen und Zustands-Codes).
- Texte macht die Oberfläche aus den Codes; der Kern liefert keine Texte.
- Der Trennungs-Test in `tests/karte.test.mjs` schlägt Alarm, wenn eine Datei an der Schalterwand vorbeigreift.

Kein Build-Schritt: reine Browser-Module, läuft direkt über GitHub Pages.

## Beim Veröffentlichen
- Versionsnummer in `version.json` **und** `src/version.js` gleich hochzählen. Schema `0.1.x`: jede Veröffentlichung zählt die letzte Stelle hoch (0.1.1, 0.1.2, …). Daran erkennt die App ein Update und lädt sich selbst neu.
- `CHANGELOG.md` um einen Abschnitt für die neue Version ergänzen (neueste oben, kurz und nach Bereichen gegliedert).
- `sw.js` holt immer zuerst die neueste Version aus dem Netz; offline wird die zuletzt geladene genutzt.
Texte und Farben in Version 1 sind Platzhalter, bis Lukas sie festlegt.
