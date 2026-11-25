// Prüft die Bausteintabelle im Menü „Veranstaltung einstellen“ (Lukas, 25.11.):
// Bausteine pro Eventtyp, „im Raum“, Musiker mit echtem Level, Zeile „Zusammen“ – und die Texte daraus.
// Starten mit: node tests/bausteine.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { TEXTE } from '../src/inhalte/texte.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel } from '../src/kern/spiel.js';
import { gottesdienstRaeume } from '../src/kern/ablauf.js';
import { bausteineVon } from '../src/kern/bausteine.js';
import { moebelSetzen } from '../src/kern/moebel.js';
import { versetzen, personHinzufuegen } from '../src/kern/personen.js';

const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
const raumBei = z => { const a = aus(z); return a.liste[a.gruppe[G.x + 5 + (G.y + 5) * z.w]]; };
const tabelle = (z, arten) => { const r = raumBei(z), info = gottesdienstRaeume(z, aus(z)).find(g => g.raum.nr === r.nr) || null; return bausteineVon(z, r, info, arten); };
const B = TEXTE.bausteine;
const text = b => B.zeilen[b.id](b);

// Beispiel aus der Vorschau: Gottesdienstraum mit Pastor, Kanzel, 2 Blumen, Gitarre, Ehrenamtliche auf Level 2
function gottesdienstraum() {
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 15, G.y + 3);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  moebelSetzen(z, 'kanzel', G.x + 10, G.y + 7, G.x + 10, G.y + 7);
  moebelSetzen(z, 'blumen', G.x + 4, G.y + 7, G.x + 4, G.y + 7); moebelSetzen(z, 'blumen', G.x + 5, G.y + 7, G.x + 5, G.y + 7);
  moebelSetzen(z, 'gitarre', G.x + 12, G.y + 6, G.x + 12, G.y + 6);
  z.personen = z.personen.filter(p => p.id === 'pastor');
  const ea = personHinzufuegen(z, { name: 'Erna Musik', kuerzel: 'E', art: 'ehrenamt' });
  ea.musikErfahrung = 200;   // Level 2 → 7 %
  versetzen(z, ea, G.x + 13, G.y + 6);
  return z;
}

// Gottesdienst: Zeilen, Häkchen, Musiker mit echtem Level, „Zusammen“
{
  const z = gottesdienstraum(), t = tabelle(z, ['gottesdienst', 'lobpreis']);
  const g = t.gottesdienst;
  assert.deepEqual(g.zeilen.map(b => b.id), ['hauptamt', 'moebel', 'moebel', 'moebel', 'moebel', 'fenster', 'besserStuhl', 'instrumentOhne', 'musiker', 'musiker']);
  assert.deepEqual(g.zeilen.map(b => b.imRaum), [true, true, false, true, false, false, false, true, true, false]);
  assert.deepEqual(text(g.zeilen[0]), { name: 'Hauptamtlicher (Pflicht)', besucher: 'normal', haltung: '+5 Gottesdienst, +5 Platz', geld: '1 € je Besucher' });
  assert.equal(text(g.zeilen[3]).name, 'Blumen (2 von 4)');
  assert.equal(text(g.zeilen[4]).geld, 'Kollekte ×1,05 je Stück');
  assert.equal(text(g.zeilen[7]).name, 'Gitarre ohne Ehrenamtlichen');
  assert.deepEqual(text(g.zeilen[8]), { name: '1 Ehrenamtlicher am Instrument (Level 2)', besucher: '×0,5 bis ×1,5 je nach Lobpreis-Vorliebe',
    haltung: '+7 % je nach Lobpreis-Vorliebe', geld: 'Kollekte +7 %' });
  assert.deepEqual(text(g.zeilen[9]), { name: '2. Ehrenamtlicher (braucht 2. Instrument)', besucher: null,
    haltung: 'weitere +5 % oder mehr (je nach Level)', geld: 'weitere +5 % oder mehr' });
  assert.equal(g.summe.bereit, true);
  assert.deepEqual(B.summe(g.summe), { besucher: '×0,5 bis ×1,5 je nach Lobpreis-Vorliebe', haltung: '+14 und +7 % je nach Lobpreis-Vorliebe', geld: '1,07 € je Besucher' });

  // Lobpreisgottesdienst: Gitarre ist Pflicht, Musiker ohne Wirkung auf die Besucher
  const l = t.lobpreis;
  assert.deepEqual(l.zeilen.slice(0, 2).map(b => [b.id, b.pflicht, b.imRaum]), [['hauptamtLobpreis', true, true], ['pflichtMoebel', true, true]]);
  assert.equal(text(l.zeilen[1]).name, 'Gitarre (Pflicht)');
  assert.ok(!l.zeilen.some(b => b.id === 'instrumentOhne'));
  assert.equal(text(l.zeilen.find(b => b.id === 'musiker')).besucher, null);
  assert.deepEqual(B.summe(l.summe), { besucher: '× Lobpreis-Vorliebe', haltung: '+9, dazu 0 bis +10 und +7 % je nach Lobpreis-Vorliebe', geld: '1,07 € je Besucher' });
}
console.log('Bausteintabelle Gottesdienst/Lobpreisgottesdienst bestanden.');

// Zweites Instrument und zweiter Ehrenamtlicher: zwei Musiker-Zeilen mit Häkchen, dazu die dritte; Summe der Boni
{
  const z = gottesdienstraum();
  moebelSetzen(z, 'keyboard', G.x + 14, G.y + 6, G.x + 14, G.y + 6);
  const ea2 = personHinzufuegen(z, { name: 'Kurt Keys', kuerzel: 'K', art: 'ehrenamt' });   // Level 0 → 5 %
  versetzen(z, ea2, G.x + 15, G.y + 6);
  const g = tabelle(z, ['gottesdienst']).gottesdienst, m = g.zeilen.filter(b => b.id === 'musiker');
  assert.deepEqual(m.map(b => [b.nr, b.imRaum, b.level]), [[1, true, 2], [2, true, 0], [3, false, null]]);
  assert.equal(text(m[1]).name, '2. Ehrenamtlicher am Instrument (Level 0)');
  assert.equal(text(m[1]).haltung, 'weitere +5 %');
  assert.equal(text(m[2]).name, '3. Ehrenamtlicher (braucht 3. Instrument)');
  assert.equal(B.summe(g.summe).haltung, '+14 und +12 % je nach Lobpreis-Vorliebe');
  assert.equal(B.summe(g.summe).geld, '1,12 € je Besucher');
}
console.log('Bausteintabelle mehrere Musiker bestanden.');

// Ohne Pastor: Pflicht fehlt → „Zusammen“ meldet, dass das Event ausfällt; ohne Musiker: Besucher „normal“
{
  const z = gottesdienstraum();
  z.personen = z.personen.filter(p => p.id !== 'pastor');
  z.personen.find(p => p.daten && p.daten.art === 'ehrenamt').x = 0;   // Ehrenamtliche verlässt den Raum
  const g = tabelle(z, ['gottesdienst']).gottesdienst;
  assert.equal(g.zeilen[0].imRaum, false);
  assert.equal(g.summe.bereit, false);
  assert.equal(B.summe(g.summe).besucher, 'normal');
  const m = g.zeilen.filter(b => b.id === 'musiker');
  assert.equal(m.length, 1);
  assert.equal(text(m[0]).name, '1 Ehrenamtlicher am Instrument');
  assert.equal(text(m[0]).haltung, '+5 % oder mehr je nach Lobpreis-Vorliebe');
}
console.log('Bausteintabelle Pflicht fehlt bestanden.');

// Gemeindesaal: Seniorennachmittag und Kirchenchorprobe
{
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 13, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z), 'gemeindesaal');
  z.personen = z.personen.filter(p => p.id === 'pastor');
  versetzen(z, z.personen[0], G.x + 4, G.y + 4);
  const ea = personHinzufuegen(z, { name: 'Erna', kuerzel: 'E', art: 'ehrenamt' }); ea.musikErfahrung = 100;   // Level 1 → 6 %
  versetzen(z, ea, G.x + 5, G.y + 4);
  moebelSetzen(z, 'tisch', G.x + 8, G.y + 5, G.x + 8, G.y + 5);
  for (const dx of [7, 9, 10]) moebelSetzen(z, 'stuhl', G.x + dx, G.y + 5, G.x + dx, G.y + 5);
  const t = tabelle(z, ['senioren', 'chorprobe']);
  const s = t.senioren;
  assert.deepEqual(s.zeilen.map(b => [b.id, !!b.pflicht, b.imRaum]),
    [['leitungSenioren', true, true], ['tischStuehle', true, true], ['weitererStuhl', false, true], ['besserStuhl', false, false]]);
  assert.deepEqual(text(s.zeilen[0]), { name: 'Hauptamtlicher + Ehrenamtlicher (Pflicht)', besucher: 'normal', haltung: '+5 Event, +5 Platz', geld: 'Spende ca. 0,20 € je Besucher' });
  assert.equal(text(s.zeilen[3]).geld, null);   // Kollekte gibt es im Gemeindesaal nicht
  assert.deepEqual(B.summe(s.summe), { besucher: 'normal, 3 Plätze', haltung: '+10', geld: 'Spende ca. 0,20 € je Besucher' });

  const c = t.chorprobe;
  assert.deepEqual(c.zeilen.map(b => [b.id, b.imRaum]), [['leitungChor', true], ['pflichtMoebel', false], ['chorLevel', false]]);
  assert.equal(text(c.zeilen[0]).name, 'Ehrenamtlicher ab Musik-Level 1 (Pflicht) (Level 1)');
  assert.equal(text(c.zeilen[0]).haltung, '+5 Platz, +6 %');
  assert.equal(text(c.zeilen[1]).name, 'Klavier (Pflicht)');
  assert.equal(c.summe.bereit, false);           // Klavier fehlt
  moebelSetzen(z, 'klavier', G.x + 11, G.y + 3, G.x + 11, G.y + 3);
  ea.musikErfahrung = 300;                       // Level 3 → 8 %
  const c2 = tabelle(z, ['chorprobe']).chorprobe;
  assert.equal(c2.summe.bereit, true);
  assert.equal(c2.zeilen[2].imRaum, true);
  assert.deepEqual(B.summe(c2.summe), { besucher: 'normal, Stühle egal', haltung: '+5 und +8 %', geld: 'Spende ca. 0,20 € je Besucher' });
}
console.log('Bausteintabelle Gemeindesaal bestanden.');
