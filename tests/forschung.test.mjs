// Prüft den Forschungsbaum und die Heiligkeit (Spielprinzip von Lukas, 25.11.2026):
// 1 Heiligkeit pro Gottesdienstbesucher am Ende des Gottesdienstes (nicht im Gemeindesaal), „Schulungen 1“ kostet 100 € + 100 Heiligkeit,
// dauert 1 echte Minute bei x1 (an die Spielzeit gekoppelt), nur eine Forschung gleichzeitig, Abbrechen = Bezahltes weg, wird gespeichert.
// Starten mit: node tests/forschung.test.mjs
import assert from 'node:assert';
import { FORSCHUNGEN, HEILIGKEIT, HALTUNG_MULTIPLIKATOR } from '../src/inhalte/forschung.js';
import { neuesSpiel, spielStarten } from '../src/kern/spiel.js';
import { heiligkeitFuerGottesdienst, forschungStarten, forschungAbbrechen, forschungSchritt, forschungListe, istErforscht, dauerMinuten,
  multiplikatorFaktor, mitMultiplikator, multiplikatorKaufen, multiplikatorInfo } from '../src/kern/forschung.js';
import { SEKUNDEN_PRO_STUNDE } from '../src/inhalte/zeit.js';

const S1 = FORSCHUNGEN.find(f => f.id === 'schulungen1');
assert.deepEqual(S1.kosten, { geld: 100, heiligkeit: 100 });
assert.equal(S1.dauer, 60);
assert.equal(FORSCHUNGEN.length, 1);                         // zum Start nur „Schulungen 1“
assert.equal(HEILIGKEIT.proBesucher, 1);
assert.equal(dauerMinuten(S1), 60 * 60 / SEKUNDEN_PRO_STUNDE);  // 1 echte Minute bei x1 = 300 Spielminuten

// Heiligkeit: Gottesdienst, Lobpreisgottesdienst ja; Gemeindesaal nein
{
  const z = neuesSpiel(() => 0.5);
  assert.equal(z.heiligkeit, 0);
  assert.equal(heiligkeitFuerGottesdienst(z, 'gottesdienst', 7), 7);
  assert.equal(heiligkeitFuerGottesdienst(z, 'lobpreis', 3), 3);
  assert.equal(heiligkeitFuerGottesdienst(z, 'senioren', 10), 0);
  assert.equal(heiligkeitFuerGottesdienst(z, 'chorprobe', 10), 0);
  assert.equal(heiligkeitFuerGottesdienst(z, 'gottesdienst', 0), 0);
  assert.equal(z.heiligkeit, 10);
}

// Forschen: Kosten, Dauer, Abschluss
{
  const z = neuesSpiel(() => 0.5);
  z.konto = 150; z.heiligkeit = 99;
  assert.equal(forschungStarten(z, 'schulungen1'), 'heiligkeit');
  z.heiligkeit = 120; z.konto = 99;
  assert.equal(forschungStarten(z, 'schulungen1'), 'geld');
  z.konto = 150;
  assert.equal(forschungStarten(z, 'gibtsnicht'), 'keine');
  const start = z.minuten;
  assert.equal(forschungStarten(z, 'schulungen1'), 'ok');
  assert.equal(z.konto, 50); assert.equal(z.heiligkeit, 20);
  assert.equal(z.wochenbuch.ausgaben.forschung, 100);          // erscheint in den Finanzen unter „Forschung“
  assert.equal(forschungStarten(z, 'schulungen1'), 'laeuft');   // nicht doppelt
  const s = forschungSchritt(z);
  assert.equal(s.zeit, start + 300);
  z.minuten = start + 150;
  const l = forschungListe(z)[0];
  assert.equal(l.zustand, 'laeuft'); assert.equal(l.anteil, 0.5); assert.equal(l.restSekunden, 30);
  z.minuten = s.zeit; s.tun(z);
  assert.ok(istErforscht(z, 'schulungen1'));
  assert.equal(z.forschung.laeuft, null);
  assert.equal(forschungListe(z)[0].zustand, 'erforscht');
  assert.equal(forschungStarten(z, 'schulungen1'), 'erforscht');
  assert.equal(forschungSchritt(z), null);
}

// Abbrechen: Geld und Heiligkeit sind weg, danach kann man neu starten
{
  const z = neuesSpiel(() => 0.5);
  z.konto = 300; z.heiligkeit = 300;
  assert.equal(forschungAbbrechen(z), 'keine');
  forschungStarten(z, 'schulungen1');
  assert.equal(forschungAbbrechen(z), 'ok');
  assert.equal(z.konto, 200); assert.equal(z.heiligkeit, 200);
  assert.equal(z.forschung.laeuft, null); assert.ok(!istErforscht(z, 'schulungen1'));
  assert.equal(forschungStarten(z, 'schulungen1'), 'ok');
}

// Über die Schalterwand: Pause hält die Forschung an, x1 braucht 60 echte Sekunden, Spielstand speichert alles
{
  const spiel = spielStarten(null, () => 0.5);
  spiel.testGeld(1000);
  // Heiligkeit gibt es nur im Spiel; zum Testen über einen gespeicherten Stand setzen
  const d = JSON.parse(spiel.speicherText()); d.zustand.heiligkeit = 150;
  const sp = spielStarten(JSON.stringify(d), () => 0.5);
  assert.equal(sp.lage().heiligkeit, 150);
  assert.equal(sp.forschungStarten('schulungen1'), 'ok');
  assert.equal(sp.lage().heiligkeit, 50);
  sp.tempoSetzen(0);
  for (let i = 0; i < 400; i++) sp.tick(0.25);                // Pause: nichts passiert
  assert.equal(sp.forschungInfo().forschungen[0].zustand, 'laeuft');
  sp.tempoSetzen(1);
  for (let i = 0; i < 4 * 59; i++) sp.tick(0.25);             // 59 Sekunden bei x1
  assert.equal(sp.forschungInfo().forschungen[0].zustand, 'laeuft');
  const zwischen = spielStarten(sp.speicherText(), () => 0.5);   // speichern und laden mitten in der Forschung
  for (let i = 0; i < 8; i++) { sp.tick(0.25); zwischen.tick(0.25); }
  assert.equal(sp.forschungInfo().forschungen[0].zustand, 'erforscht');
  assert.equal(zwischen.forschungInfo().forschungen[0].zustand, 'erforscht');
  assert.equal(JSON.parse(sp.speicherText()).zustand.forschung.fertig[0], 'schulungen1');
}

// Alter Spielstand ohne Heiligkeit/Forschung lädt mit 0 und leerem Baum
{
  const d = JSON.parse(spielStarten(null, () => 0.5).speicherText());
  delete d.zustand.heiligkeit; delete d.zustand.forschung;
  d.zustand.konto = 0;   // seit dem Startgeld von 1.000 € (25.11.): ohne Geld bleibt die Forschung „geld“
  const sp = spielStarten(JSON.stringify(d), () => 0.5);
  assert.equal(sp.lage().heiligkeit, 0);
  assert.equal(sp.forschungInfo().forschungen[0].zustand, 'geld');
}

// Haltungs-Multiplikator (Lukas, 25.11. abends): Stufe 0 = ×1, dann ×1,3 / 1,6 / 2,0 / 2,5 / 3,0 für 100 / 250 / 500 / 1000 / 2000 Heiligkeit
{
  assert.deepEqual(HALTUNG_MULTIPLIKATOR.stufen.map(x => [x.faktor, x.preis]), [[1.3, 100], [1.6, 250], [2.0, 500], [2.5, 1000], [3.0, 2000]]);
  const z = neuesSpiel(() => 0.5);
  assert.equal(z.multiplikator, 0);
  assert.equal(multiplikatorFaktor(z, 'gottesdienst'), 1);
  assert.deepEqual(multiplikatorInfo(z), { stufe: 0, maxStufe: 5, faktor: 1, naechste: { stufe: 1, faktor: 1.3, preis: 100, leistbar: false } });
  z.heiligkeit = 99; assert.equal(multiplikatorKaufen(z), 'heiligkeit'); assert.equal(z.heiligkeit, 99);
  z.heiligkeit = 120; assert.equal(multiplikatorKaufen(z), 'ok'); assert.equal(z.heiligkeit, 20); assert.equal(z.multiplikator, 1);
  // wirkt bei Gottesdienst und Lobpreisgottesdienst, nicht im Gemeindesaal; nur Pluswerte, gerundet
  assert.equal(mitMultiplikator(z, 'gottesdienst', 15), 20);   // 19,5 → 20
  assert.equal(mitMultiplikator(z, 'lobpreis', 10), 13);
  assert.equal(mitMultiplikator(z, 'senioren', 10), 10);
  assert.equal(mitMultiplikator(z, 'gottesdienst', -10), -10);
  assert.equal(mitMultiplikator(z, 'gottesdienst', 0), 0);
  z.heiligkeit = 10000;
  ['ok', 'ok', 'ok', 'ok', 'max'].forEach(e => assert.equal(multiplikatorKaufen(z), e));
  assert.equal(z.heiligkeit, 10000 - 250 - 500 - 1000 - 2000);
  assert.equal(multiplikatorFaktor(z, 'gottesdienst'), 3);
  assert.equal(multiplikatorInfo(z).naechste, null);
  // Schalterwand + Speichern; alter Spielstand ohne Multiplikator → Stufe 0
  const spiel = spielStarten(null, () => 0.5);
  const d = JSON.parse(spiel.speicherText()); d.zustand.heiligkeit = 300;
  const sp = spielStarten(JSON.stringify(d), () => 0.5);
  assert.equal(sp.multiplikatorKaufen(), 'ok');
  assert.equal(sp.forschungInfo().multiplikator.stufe, 1);
  const sp2 = spielStarten(sp.speicherText(), () => 0.5);
  assert.equal(sp2.forschungInfo().multiplikator.faktor, 1.3); assert.equal(sp2.lage().heiligkeit, 200);
  const alt = JSON.parse(spiel.speicherText()); delete alt.zustand.multiplikator;
  assert.equal(spielStarten(JSON.stringify(alt), () => 0.5).forschungInfo().multiplikator.stufe, 0);
}

console.log('Forschung: alle Tests bestanden');
