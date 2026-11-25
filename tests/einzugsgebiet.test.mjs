// Prüft das Einzugsgebiet: Grenze, Zählung, Parkplätze (Straße bis zum Tor), Bushaltestelle, Werbekampagne.
// Starten mit: node tests/einzugsgebiet.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { EINZUGSGEBIET, PARKPLATZ, BUSHALTESTELLE, WERBEKAMPAGNE } from '../src/inhalte/einzugsgebiet.js';
import { neuesSpiel, spielStarten } from '../src/kern/spiel.js';
import { einzugsgebiet, erreicht, busAusbauen, werbekampagneKaufen } from '../src/kern/einzugsgebiet.js';
import { werKommt } from '../src/kern/besucher.js';
import { moebelKaufen, moebelBei, hindernisBei } from '../src/kern/moebel.js';
import { ortSchritt } from '../src/kern/ort.js';
import { wandRechteck } from '../src/kern/karte.js';

const saat = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const torY = G.y + G.h - 1, torX = G.tor.x;

// Start: Grenze 40, gezählt werden die 4 Start-Stammgäste
{
  const z = neuesSpiel(saat(1));
  const e = einzugsgebiet(z);
  assert.equal(e.grenze, EINZUGSGEBIET.start);
  assert.equal(e.erreicht, 4);
  // Ehrenamtliche aus Besuchern zählen mit, der Pastor nicht
  z.personen.push({ id: 'ea1', x: 0, y: 0, daten: { name: 'X', art: 'ehrenamt' } });
  assert.equal(erreicht(z), 5);
}
// Voll: keine neuen Passanten im Ort und keine ganz neuen Besucher über die Bekanntheit
{
  const z = neuesSpiel(saat(2));
  z.besucher = Array.from({ length: 40 }, (_, i) => ({ id: 't' + i, voll: 'T' + i, zufriedenheit: 0, kaffee: false, besuche: 0 }));
  z.ort.leute = [];
  ortSchritt(z, saat(3)).tun();                                       // Tag planen: niemand Neues
  assert.equal(z.ort.leute.length, 0);
  z.bekanntheit = 100;
  const vorher = z.besucher.length;
  werKommt(z, () => 0.99);                                           // 10 Neue wären fällig
  assert.equal(z.besucher.length, vorher);
  // Ein Platz frei → genau einer kommt dazu
  z.besucher.pop();
  werKommt(z, () => 0.99);
  assert.equal(z.besucher.length, 40);
}
// Unter der Grenze: der Ort füllt sich nur bis zur Grenze
{
  const z = neuesSpiel(saat(4));
  for (let t = 0; t < 30; t++) { z.ort.tag = t - 1; z.minuten = t * 1440; ortSchritt(z, saat(10 + t)).tun(); }
  assert.ok(erreicht(z) <= EINZUGSGEBIET.start);
  assert.equal(erreicht(z), EINZUGSGEBIET.start);
}
// Parkplätze: zählen nur an einer Straße, die bis ins Tor führt
{
  const z = neuesSpiel(saat(5)); z.konto = 1000; z.bekanntheit = 50;
  assert.equal(moebelKaufen(z, 'parkplatz', torX + 1, torY - 3), 'ok');      // ohne Straße
  assert.equal(einzugsgebiet(z).teile.parkplatz, 0);
  for (let y = torY; y >= torY - 2; y--) assert.equal(moebelKaufen(z, 'strasse', torX, y), 'ok');
  assert.equal(einzugsgebiet(z).verbunden, 0);                              // Straße reicht noch nicht bis neben den Parkplatz
  assert.equal(moebelKaufen(z, 'strasse', torX, torY - 3), 'ok');           // jetzt direkt daneben
  assert.equal(einzugsgebiet(z).teile.parkplatz, PARKPLATZ.plus);
  // Parkplatz belegt 2 Kästchen, gedreht 2 übereinander
  assert.ok(moebelBei(z, torX + 2, torY - 3));
  assert.equal(moebelKaufen(z, 'parkplatz', torX + 1, torY - 1, () => false, true), 'ok');
  assert.ok(moebelBei(z, torX + 1, torY));
  assert.equal(einzugsgebiet(z).teile.parkplatz, 2 * PARKPLATZ.plus);
  // Über Straße und Parkplatz kann man laufen
  assert.equal(hindernisBei(z, torX, torY), false);
  assert.equal(hindernisBei(z, torX + 2, torY - 3), false);
  // Straße, die nicht im Tor beginnt, schließt nichts an
  const z2 = neuesSpiel(saat(6)); z2.konto = 1000;
  moebelKaufen(z2, 'strasse', torX, torY - 1); moebelKaufen(z2, 'parkplatz', torX + 1, torY - 1);
  assert.equal(einzugsgebiet(z2).verbunden, 0);
}
// Über die Schalterwand: Parkplatz erst ab Bekanntheit 10, nicht in Räumen, Straße ziehen, Rückgängig
{
  const z = neuesSpiel(saat(7)); z.konto = 1000;
  const spiel = spielStarten(JSON.stringify({ version: 3, zustand: z }), saat(7));
  assert.equal(spiel.moebelKaufen('parkplatz', torX + 1, torY - 3), 'bekanntheit');
  const r = spiel.strasseBauen(torX, torY, torX, torY - 3);
  assert.deepEqual(r, { gebaut: 4, ergebnis: 'ok' });
  assert.equal(spiel.einzugsgebietInfo().teile.parkplatz, 0);
  assert.equal(spiel.rueckgaengig(), true);
  assert.equal(spiel.karte().moebel.filter(m => m.art === 'strasse').length, 0);
  // in einem Raum geht es nicht
  spiel.wandBauen(G.x + 2, G.y + 2, G.x + 8, G.y + 8);
  assert.equal(spiel.moebelKaufen('strasse', G.x + 4, G.y + 4), 'innen');
  const info = spiel.einzugsgebietInfo();
  assert.equal(info.grenze, 40); assert.equal(info.voll, false);
  assert.ok(spiel.karte().bus.stufe === 0);
}
// Bushaltestelle: drei Stufen, Bekanntheit und Geld nötig
{
  const z = neuesSpiel(saat(8)); z.konto = 10000;
  assert.equal(busAusbauen(z), 'bekanntheit');
  z.bekanntheit = 100;
  for (const s of BUSHALTESTELLE) assert.equal(busAusbauen(z), 'ok');
  assert.equal(busAusbauen(z), 'max');
  assert.equal(einzugsgebiet(z).teile.bus, BUSHALTESTELLE.reduce((a, s) => a + s.plus, 0));
  assert.equal(z.konto, 10000 - BUSHALTESTELLE.reduce((a, s) => a + s.preis, 0));
  const z2 = neuesSpiel(saat(9)); z2.bekanntheit = 100; z2.konto = 10;
  assert.equal(busAusbauen(z2), 'geld');
}
// Werbekampagne: einmalig, dauerhaft
{
  const z = neuesSpiel(saat(10)); z.konto = 1000; z.bekanntheit = WERBEKAMPAGNE.abBekanntheit - 1;
  assert.equal(werbekampagneKaufen(z), 'bekanntheit');
  z.bekanntheit = WERBEKAMPAGNE.abBekanntheit;
  assert.equal(werbekampagneKaufen(z), 'ok');
  assert.equal(werbekampagneKaufen(z), 'gekauft');
  assert.equal(einzugsgebiet(z).grenze, EINZUGSGEBIET.start + WERBEKAMPAGNE.plus);
  assert.equal(z.wochenbuch.ausgaben.einzugsgebiet, WERBEKAMPAGNE.preis);
}
console.log('Einzugsgebiet-Tests bestanden.');
