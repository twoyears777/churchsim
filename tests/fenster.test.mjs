// Prüft, dass sich das Raum-Fenster in der Spielansicht ohne Absturz aufbauen lässt – mit einer Schein-Seite statt Browser.
// Fängt Fehler wie in 0.1.17 („ART_TEXT is not defined“: Gottesdienstraum mit Mitarbeiter ließ sich nicht mehr anklicken),
// die die Logik-Tests nicht sehen. Starten mit: node tests/fenster.test.mjs
import assert from 'node:assert';
const element = () => new Proxy({ hidden: true, style: {}, dataset: {}, classList: { toggle() {}, add() {}, remove() {} },
  querySelector: () => element(), querySelectorAll: () => [], addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) },
  { get: (o, n) => o[n], set: (o, n, v) => { o[n] = v; return true; } });
const elemente = {};
globalThis.document = { getElementById: id => elemente[id] ||= element(), addEventListener() {}, body: element(), documentElement: element() };
globalThis.window = { innerWidth: 1400, innerHeight: 900, addEventListener() {} };

const { GRUNDSTUECK: G } = await import('../src/inhalte/umgebung.js');
const { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } = await import('../src/kern/karte.js');
const { spielStarten, SPEICHER_VERSION } = await import('../src/kern/spiel.js');
const { neuesSpiel } = await import('./hilfen/ohne-erster.mjs');
const { moebelSetzen } = await import('../src/kern/moebel.js');
const { versetzen } = await import('../src/kern/personen.js');
const { ui } = await import('../src/oberflaeche/ui.js');
const { fensterAktualisieren } = await import('../src/oberflaeche/fenster.js');

const raumBei = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return raeume[gruppe[G.x + 5 + (G.y + 5) * z.w]]; };
// Gottesdienstraum bzw. Foyer mit Stühlen und dem Pastor darin
function spielMit(typ) {
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z), typ);
  if (typ === 'gottesdienst') moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 15, G.y + 3);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  return spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0.5);
}
function oeffnen(f, name) {
  ui.fenster = f;
  assert.doesNotThrow(() => fensterAktualisieren(), name);
  assert.ok(ui.fenster, name + ' bleibt offen');
}

{
  ui.spiel = spielMit('gottesdienst');
  const nr = ui.spiel.veranstaltungsraumBei(G.x + 5, G.y + 5);
  assert.notStrictEqual(nr, null, 'Gottesdienstraum wird beim Klick gefunden');
  oeffnen({ art: 'raum', nr }, 'Raum-Fenster ohne Veranstaltung, Pastor im Raum');
  oeffnen({ art: 'raum', nr, platz: 0 }, 'Menü „Veranstaltung 1 einstellen“');
  ui.spiel.veranstaltungSetzen(nr, 0, 'gottesdienst');
  oeffnen({ art: 'raum', nr }, 'Raum-Fenster mit Gottesdienst');
}
{
  ui.spiel = spielMit('foyer');
  const nr = ui.spiel.foyerBei(G.x + 5, G.y + 5);
  assert.notStrictEqual(nr, null, 'Foyer wird beim Klick gefunden');
  oeffnen({ art: 'foyer', nr }, 'Foyer-Fenster mit Mitarbeiter');
}
// Kirchkaffee-Fenster mit Zeile „Gäste pro Öffnungszeit“ (Mindestgäste, 27.11.)
{
  ui.spiel = spielMit('kirchkaffee');
  const nr = ui.spiel.kirchkaffeeBei(G.x + 5, G.y + 5);
  assert.notStrictEqual(nr, null, 'Kirchkaffee wird beim Klick gefunden');
  assert.equal(ui.spiel.kaffeeRaumInfo(nr).mindestgaeste.summe, 2);
  oeffnen({ art: 'kaffee', nr }, 'Kirchkaffee-Fenster mit Mindestgästen');
}
// Menü „Mitglieder“ (27.11.): leer, mit Mitgliedern (eins mit Kündigungsgefahr) und Verlauf; Finanz-Fenster mit Dauerspender-Zeile zu und auf
{
  const z = neuesSpiel(() => 0.5);
  z.besucher = [{ id: 'm', voll: 'Mia M', vorname: 'Mia', level: 4, zufriedenheit: 30, besuche: 5, mitglied: { seit: 2 } },
    { id: 'n', voll: 'Nils N', vorname: 'Nils', level: 2, zufriedenheit: 10, besuche: 5, mitglied: { seit: 3 } }];
  ui.spiel = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0.5);
  const { mitgliederFenster } = await import('../src/oberflaeche/mitglieder.js');
  let html = mitgliederFenster();
  assert.ok(html.includes('mitglied-gefahr') && html.includes('30 %'), 'Kündigungsgefahr markiert');
  assert.ok(!html.includes('<svg'), 'ohne Verlauf noch kein Diagramm');
  z.mitglieder.verlauf = [{ woche: 0, anzahl: 1 }, { woche: 1, anzahl: 2 }];
  ui.spiel = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0.5);
  html = mitgliederFenster();
  assert.ok(html.includes('<svg') && html.includes('polyline'), 'Diagramm da');
  oeffnen({ art: 'mitglieder' }, 'Mitglieder-Menü');
  oeffnen({ art: 'finanzen' }, 'Finanz-Fenster, Dauerspender zugeklappt');
  oeffnen({ art: 'finanzen', offen: ['dauerspender'] }, 'Finanz-Fenster, Dauerspender aufgeklappt');
}
// Gemeindekalender mit Bericht (27.11.): vergangene Veranstaltung, aufgeklappter Bericht und „Vorherige Woche“
{
  const { zeitVorruecken, veranstaltungEinstellen } = await import('../src/kern/ablauf.js');
  const { TAG_MIN, WOCHE_MIN } = await import('../src/kern/zeit.js');
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 15, G.y + 3);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  z.besucher = Array.from({ length: 5 }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X', level: 5, zufriedenheit: 50, kaffeeWert: 0, besuche: 0, lobpreis: 0 }));
  z.ortRuhig = true;
  veranstaltungEinstellen(z, raumBei(z), 'gottesdienst', 0);
  const raeume = () => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
  zeitVorruecken(z, raeume(), 6 * TAG_MIN + 16 * 60 - z.minuten, () => 0);
  ui.spiel = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0.5);
  const id = ui.spiel.kalenderInfo(0).termine[0].id;
  assert.ok(ui.spiel.kalenderInfo(0).termine[0].bericht, 'Bericht ist da');
  oeffnen({ art: 'kalender', versatz: 0 }, 'Kalender mit vergangener Veranstaltung');
  oeffnen({ art: 'kalender', versatz: 0, bericht: id }, 'Kalender mit aufgeklapptem Bericht');
  zeitVorruecken(z, raeume(), WOCHE_MIN + 60 - z.minuten, () => 0);
  ui.spiel = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0.5);
  oeffnen({ art: 'kalender', versatz: -1, bericht: id }, 'Kalender „Vorherige Woche“ mit Bericht');
  oeffnen({ art: 'kalender', versatz: 1 }, 'Kalender „Nächste Woche“');
}
// Wochenzusammenfassung (27.11.): zugeklappt und mit allen Bereichen offen, mit echter Veranstaltung und Vergleich zur Vorwoche
{
  const { zeitVorruecken } = await import('../src/kern/ablauf.js');
  const { WOCHE_MIN } = await import('../src/kern/zeit.js');
  const { WOCHENBERICHT } = await import('../src/inhalte/zeit.js');
  const { wochenberichtOffen, wochenberichtSchliessen } = await import('../src/kern/wochenbericht.js');
  WOCHENBERICHT.pause = true;
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 15, G.y + 3);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  z.besucher = Array.from({ length: 5 }, (_, i) => ({ id: 'w' + i, vorname: 'W' + i, nachname: 'X', voll: 'W' + i + ' X', level: 5, zufriedenheit: 50, kaffeeWert: 0, besuche: 0, lobpreis: 0, mitglied: i ? undefined : { seit: 0 } }));
  z.ortRuhig = true;
  const raeume = () => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
  for (let i = 0; i < 5000 && z.minuten < 6 * WOCHE_MIN; i++) { if (wochenberichtOffen(z)) wochenberichtSchliessen(z); zeitVorruecken(z, raeume(), 60, () => 0); }
  for (let i = 0; i < 500 && !wochenberichtOffen(z); i++) zeitVorruecken(z, raeume(), 60, () => 0);
  assert.ok(wochenberichtOffen(z), 'Wochenzusammenfassung ist offen');
  ui.spiel = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0.5);
  const info = ui.spiel.wochenberichtInfo();
  assert.ok(info.vergleich && info.veranstaltungen.length, 'mit Vorwoche und Veranstaltungen');
  oeffnen({ art: 'wochenbericht', offen: [] }, 'Wochenzusammenfassung zugeklappt');
  oeffnen({ art: 'wochenbericht', offen: ['geld', 'veranstaltungen', 'gemeinde', 'werte', 'monat'] }, 'Wochenzusammenfassung aufgeklappt');
  WOCHENBERICHT.pause = false;
}
// Menü „Mitarbeiter“ / Dienstplan (27.11.): Fenster baut sich auf, Klick auf Ehrenamtlichen und freie Stelle teilt ein,
// Klick auf die besetzte Stelle nimmt ihn heraus, Fehler (keine Schichten mehr) erscheint als Hinweis
{
  const { dienstplanFenster, dienstplanKlick } = await import('../src/oberflaeche/dienstplan.js');
  const { moebelKaufen } = await import('../src/kern/moebel.js');
  const { personHinzufuegen } = await import('../src/kern/personen.js');
  const z = neuesSpiel(() => 0.5);
  z.schichtbetrieb = true;
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z), 'gottesdienst');
  z.konto = 500; moebelKaufen(z, 'gitarre', G.x + 10, G.y + 3);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  const ea = personHinzufuegen(z, { name: 'Anna Test', kuerzel: 'A', art: 'ehrenamt' });
  ui.spiel = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0.5);
  ui.spiel.veranstaltungSetzen(ui.spiel.veranstaltungsraumBei(G.x + 5, G.y + 5), 0, 'gottesdienst');
  oeffnen({ art: 'dienstplan' }, 'Dienstplan-Fenster');
  const f = { art: 'dienstplan', tag: 6 };
  const html = dienstplanFenster(f);
  assert.ok(html.includes('Anna Test') && html.includes('Gitarre') && html.includes('Gottesdienst'), 'Ehrenamtliche, Stelle und Termin stehen drin');
  const knopf = ds => ({ dataset: ds });
  const stelle = /data-dp-stelle="([^"]+)"/.exec(html.replace(/&#39;|&quot;/g, ''))[1];
  assert.ok(dienstplanKlick(knopf({ dpEa: ea.id }), f));
  assert.ok(dienstplanKlick(knopf({ dpStelle: stelle }), f));
  assert.equal(f.fehler, '');
  assert.ok(dienstplanFenster(f).includes('dp-stelle besetzt'), 'Stelle ist besetzt');
  assert.ok(dienstplanKlick(knopf({ dpWeg: stelle }), f));
  assert.ok(!dienstplanFenster(f).includes('dp-stelle besetzt'), 'wieder frei');
  // Drei Evangelisation-Blöcke + Gottesdienst = 4 > 3 Schichten → Hinweis
  const ev = [0, 1, 2].map(tag => ui.spiel.dienstplan().termine.find(t => t.art === 'evangelisation' && t.tag === tag && t.slot === 'abend').key);
  for (const k of ev) ui.spiel.stelleSetzen(k, 'platz0', ea.id);
  dienstplanKlick(knopf({ dpStelle: stelle }), f);
  assert.ok(f.fehler && f.fehler.includes('Anna Test'), 'Hinweis: keine Schichten mehr');
  assert.ok(!dienstplanKlick(knopf({ dpEa: ea.id }), { art: 'raum' }), 'andere Fenster bleiben unberührt');
}
// Sicherung: Stürzt ein Fenster beim Aufbau ab, geht es nur zu – kein Fehler nach außen (sonst bleibt die Uhr stehen)
{
  const echt = console.error; console.error = () => {};
  ui.spiel = { raumInfo() { throw new Error('Testfehler'); } };
  ui.fenster = { art: 'raum', nr: 0 };
  assert.doesNotThrow(() => fensterAktualisieren(), 'Fehler im Fenster reißt das Spiel nicht mit');
  assert.strictEqual(ui.fenster, null, 'kaputtes Fenster wird geschlossen');
  console.error = echt;
}
console.log('fenster: alles ok');
