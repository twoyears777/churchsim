// Prüft Wege und Außendeko: Wert „Gelände“, Neugier am Tor, Hindernisse, Freischaltung, Schaukasten.
// Starten mit: node tests/gelaende.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { GELAENDE, SCHAUKASTEN } from '../src/inhalte/gelaende.js';
import { NEUGIER, PLAKAT } from '../src/inhalte/ort.js';
import { neuesSpiel, spielStarten } from './hilfen/ohne-erster.mjs';   // ohne ersten Gottesdienst (26.11.)
import { gelaende, aushaenge } from '../src/kern/gelaende.js';
import { neugierChance } from '../src/kern/ort.js';
import { hindernisBei } from '../src/kern/moebel.js';

const saat = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const nah = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
const x0 = G.x + 2, y0 = G.y + 2;

// Punkte: Weg 0,5, Busch 2, Baum 4 – zusammen 6,5; Neugier + Gelände ÷ 10 Prozentpunkte
{
  const s = spielStarten(null, saat(1));
  s.testGeld(1000);
  assert.equal(s.wegBauen(x0, y0, x0, y0).gebaut, 1);
  assert.equal(s.moebelKaufen('busch', x0 + 1, y0), 'ok');
  assert.equal(s.moebelKaufen('baum', x0 + 3, y0), 'bekanntheit');        // Baum erst ab Bekanntheit 10
  const g = s.gelaendeInfo();
  assert.equal(g.wert, 2.5);
  nah(g.neugier, 0.0025);
  const B = s.bekanntheitInfo().wirkung;
  nah(B.neugier, NEUGIER.grund + 0.0025);
  nah(B.neugierPlakat, (NEUGIER.grund + 0.0025) * PLAKAT.faktor);
  // Bauleiste: Gelände-Punkte und Freischaltung kommen vom Spiel
  const baum = s.moebelArten().find(m => m.id === 'baum');
  assert.equal(baum.gesperrt, true); assert.equal(baum.abBekanntheit, 10); assert.equal(baum.drehbar, false); assert.equal(baum.gelaende, 4);
}
// Obergrenze 100; Außendeko nicht in Räumen; Busch ist ein Hindernis, Weg nicht; nichts direkt ins Tor
{
  const z = neuesSpiel(saat(2));
  for (let i = 0; i < 60; i++) z.moebel.push({ art: 'busch', x: G.x + (i % 30), y: G.y + Math.floor(i / 30) });
  assert.equal(gelaende(z).wert, GELAENDE.max);
  assert.equal(gelaende(z).summe, 120);
  nah(neugierChance(z, false), NEUGIER.grund + z.bekanntheit * NEUGIER.proBekanntheit + 0.1);
  assert.equal(hindernisBei(z, G.x, G.y), true);
  z.moebel.push({ art: 'weg', x: G.x, y: G.y + 5 });
  assert.equal(hindernisBei(z, G.x, G.y + 5), false);

  const s = spielStarten(null, saat(3));
  s.testGeld(1000);
  s.wandBauen(x0, y0, x0 + 6, y0 + 6);
  assert.equal(s.moebelKaufen('busch', x0 + 2, y0 + 2), 'innen');
  assert.equal(s.moebelKaufen('busch', G.tor.x, G.y + G.h - 1), 'tor');
  assert.equal(s.wegBauen(G.tor.x, G.y + G.h - 1, G.tor.x, G.y + G.h - 1).gebaut, 1);   // Weg im Tor geht
}
{
  // Direkt im Kern: zwei Schaukästen für dieselbe Veranstaltung → einmal +10; Veranstaltung auf „Keine“ → kein Bonus
  const z = neuesSpiel(saat(5));
  const raum = Array.from({ length: 3 }, (_, i) => (G.y + 3) * z.w + G.x + 3 + i);
  for (const c of raum) z.veranstaltung[c] = [{ art: 'gottesdienst', tag: 6, slot: 'vormittag' }];
  // Raum aus Wänden um die drei Kästchen, damit die Raumerkennung ihn findet
  for (let x = G.x + 2; x <= G.x + 6; x++) for (const y of [G.y + 2, G.y + 4]) z.zellen[y * z.w + x] = 1;
  for (const x of [G.x + 2, G.x + 6]) z.zellen[(G.y + 3) * z.w + x] = 1;
  z.moebel.push({ art: 'schaukasten', x: G.x + 10, y: G.y + 10, aushang: { zelle: raum[0], platz: 0 } });
  z.moebel.push({ art: 'schaukasten', x: G.x + 12, y: G.y + 10, aushang: { zelle: raum[2], platz: 0 } });
  assert.equal(aushaenge(z).length, 1);
  const ohne = NEUGIER.grund + z.bekanntheit * NEUGIER.proBekanntheit + gelaende(z).neugier;
  nah(neugierChance(z, false), ohne + SCHAUKASTEN.neugier);
  for (const c of raum) z.veranstaltung[c] = [{ art: null, tag: 6, slot: 'vormittag' }];
  assert.equal(aushaenge(z).length, 0);
  nah(neugierChance(z, false), ohne);
}
{
  // Über die Schalterwand: Aushang wählen, ändern, abnehmen; kostenlos; erst ab Bekanntheit 15
  const z = neuesSpiel(saat(6)); z.konto = 2000; z.bekanntheit = 10;
  let s = spielStarten(JSON.stringify({ version: 3, zustand: z }), saat(6));
  const ax = G.x + 2, ay = G.y + 2, bx = ax + 16, by = ay + 6, sx = G.x + 2, sy = G.y + 15;
  s.wandBauen(ax, ay, bx, by); s.tuerUmschalten(ax + 3, by);
  const nr = s.raumNrBei(ax + 2, ay + 2);
  s.raumTypSetzen(nr, 'gottesdienst');
  assert.equal(s.veranstaltungSetzen(nr, 0, 'gottesdienst'), 'ok');
  assert.equal(s.moebelKaufen('schaukasten', sx, sy), 'bekanntheit');
  z.bekanntheit = 15;   // spielStarten liest den Spielstand neu ein – also mit höherer Bekanntheit noch einmal
  s = spielStarten(JSON.stringify({ version: 3, zustand: z }), saat(6));
  s.wandBauen(ax, ay, bx, by); s.tuerUmschalten(ax + 3, by);
  s.raumTypSetzen(nr, 'gottesdienst'); s.veranstaltungSetzen(nr, 0, 'gottesdienst');
  assert.equal(s.moebelKaufen('schaukasten', sx, sy), 'ok');
  let info = s.schaukastenInfo(sx, sy);
  assert.equal(info.aushang, false);
  assert.equal(info.auswahl.length, 1);
  const vorher = s.bekanntheitInfo().wirkung.neugier, konto = s.lage().konto;
  assert.equal(s.aushangSetzen(sx, sy, nr, 0), 'ok');
  assert.equal(s.lage().konto, konto);                                         // kostenlos
  info = s.schaukastenInfo(sx, sy);
  assert.equal(info.aushang, true); assert.equal(info.auswahl[0].aktiv, true);
  nah(s.bekanntheitInfo().wirkung.neugier, vorher + SCHAUKASTEN.neugier);
  assert.equal(s.gelaendeInfo().aushaenge.length, 1);
  assert.equal(s.karte().moebel.find(m => m.art === 'schaukasten').aushang, true);
  assert.equal(s.aushangSetzen(sx, sy, nr, 1), 'keine');                       // Veranstaltung 2 ist nicht eingestellt
  assert.equal(s.aushangSetzen(sx, sy, null), 'ok');
  nah(s.bekanntheitInfo().wirkung.neugier, vorher);
}
console.log('Gelände: alle Tests bestanden.');
