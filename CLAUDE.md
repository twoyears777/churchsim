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
- `src/kern/` – Spiellogik ohne Grafik: Zahlen, Berechnungen, Tick-System. Wird mit Tests geprüft. Das Kirchkaffee (Öffnungszeiten, Bedienung, Einkauf) steht in `src/kern/kirchkaffee.js`, Kassenbuch und Wochen-Verlauf der Finanzen in `src/kern/finanzen.js`.
- `src/kern/spiel.js` – die **Schalterwand**: einziger Zugang der Oberfläche zur Spiellogik (Befehle + Abfragen).
- `src/ansicht/` – Darstellung (zeichnet nur, ändert nichts).
- `src/oberflaeche/` – Bedienung: `start.js` (Uhr, Zeichnen), `eingaben.js`, `bauleiste.js` (Bauleiste unten: Reiter + Kärtchen), `anzeigen.js`, `fenster.js`, `speicher.js`, `hauptmenue.js` (Startmenü: Weiterspielen/Neues Spiel, Escape und Knopf „Hauptmenü“; Zeit steht, solange es offen ist).
- `tests/` – automatische Prüfungen: `node tests/karte.test.mjs`, `node tests/menschen.test.mjs` (Passanten, Seelsorge) , `node tests/ausstattung.test.mjs` (Stuhlstufen, Möbel im Gottesdienstraum, Musiker, Plakat) `node tests/veranstaltungen.test.mjs` (Veranstaltung 1/2, Lobpreisgottesdienst, Bekanntheit-Protokoll) und `node tests/einzugsgebiet.test.mjs` (Einzugsgebiet, Parkplatz/Straße, Bushaltestelle, Werbekampagne) und `node tests/kirchkaffee.test.mjs` (Öffnungszeiten, Schlange und Bedienung, Einkauf im Laden, Kaffee-Wert, Sitzplätze und Trinkgeld) und `node tests/finanzen.test.mjs` (Kassenbuch, Kirchkaffee nach Anlass, Wochen-Verlauf) und `node tests/dauerspender.test.mjs` (Dauerspender montags 8:00, ab Haltungslevel 3, 5 € bis 20 €; Logik in `src/kern/dauerspender.js`, Zahlen `DAUERSPENDE` in `src/inhalte/finanzen.js`) und `node tests/feste.test.mjs` (Feste und Zeiten im Kirchenjahr, Feiertage, Fest-Menü, Sonderevent; Feste, Faktoren und Feiertage in `src/inhalte/kirchenjahr.js`, Logik in `src/kern/kalender.js` und `src/kern/feste.js`). Dazu `node tests/gelaende.test.mjs` (Wege und Außendeko, Wert „Gelände“, Neugier am Tor, Schaukasten; Zahlen in `src/inhalte/gelaende.js` und bei der Außendeko in `src/inhalte/moebel.js`, Logik in `src/kern/gelaende.js`). Dazu `node tests/forschung.test.mjs` (Forschungsbaum und Heiligkeit: 1 Heiligkeit pro Gottesdienstbesucher, Kosten, Dauer an die Spielzeit gekoppelt, nur eine Forschung gleichzeitig, Abbrechen; Haltungs-Multiplikator ×1,3 bis ×3,0 für Heiligkeit; Zahlen in `src/inhalte/forschung.js`, Logik in `src/kern/forschung.js`). Dazu `node tests/umherlaufen.test.mjs` (Mitarbeiter laufen frei ein wenig umher – nur fürs Auge, ihr Platz bleibt; Zahlen `UMHERLAUFEN` in `src/inhalte/mitarbeiter.js`, Logik in `src/kern/umherlaufen.js`). Dazu `node tests/bausteine.test.mjs` (Bausteintabelle im Menü „Veranstaltung einstellen“: Bausteine pro Eventtyp, Zeile „Zusammen“; Logik in `src/kern/bausteine.js`, Texte in `TEXTE.bausteine`). Dazu `node tests/konfi.test.mjs` (Jugendliche 20 %, Kommchance × Faktor je Veranstaltung, Konfirmandenunterricht im Gemeindesaal, 7 Teilnahmen im Jahrgang → Konfirmand, Konfirmation am 2. Sonntag im Mai nur mit Konfirmanden, danach erwachsen; Zahlen `JUGEND`/`KONFI` in `src/inhalte/besucher.js`, Logik in `src/kern/konfi.js`). Dazu `node tests/baukosten.test.mjs` (Baukosten 5 € je neues Wandstück, Tür gratis, Abriss erstattet; Fenster 10 €, +1 Haltung je Fenster im Raum; Foyer: Haltung für alle, die auf dem Weg zum Platz hindurchlaufen; alte Spielstände +950 €, ihre alten Wände bleiben kostenlos; Zahlen in `src/inhalte/bau.js`, Foyer-Möbel in `src/inhalte/moebel.js`, Logik in `src/kern/karte.js`, `src/kern/foyer.js` und `src/kern/spiel.js`). Dazu `node tests/beduerfnisse.test.mjs` (Haltungslevel 1–5: bei 100 ein Level hoch und Haltung 0, bei 0 eins runter und Haltung 50; Chance zu kommen = Grund + Level + Haltung; Bedürfnisse Lobpreis/Kaffee/Spaß kommen mit dem Level, Prüfung Sonntag 24:00 mit −5 je nicht erfülltem; Dauerspender ab Level 3; Spielenachmittag im Gemeindesaal; Zahlen `HALTUNGSLEVEL`/`KOMMCHANCE`/`BEDUERFNISSE` in `src/inhalte/besucher.js`, Logik in `src/kern/besucher.js` und `src/kern/beduerfnisse.js`). Der Changelog im Spiel (`src/oberflaeche/changelog.js`) liest CHANGELOG.md – deshalb dort das Format beibehalten: `## 0.1.x` als Versionsüberschrift, Bereiche als `**Fett**`-Zeile, Punkte mit `- `.

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
