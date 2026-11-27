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
console.log('fenster: alles ok');
