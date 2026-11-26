// Prüft den Raum „Toiletten“ und das Bedürfnis Toilette (Spielprinzip von Lukas, 26.11.2026).
// Starten mit: node tests/toiletten.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { TOILETTE } from '../src/inhalte/toiletten.js';
import { RAUMTYPEN } from '../src/inhalte/raumtypen.js';
import { MOEBEL } from '../src/inhalte/moebel.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel } from './hilfen/ohne-erster.mjs';   // ohne ersten Gottesdienst (26.11.)
import { zeitVorruecken, veranstaltungEinstellen } from '../src/kern/ablauf.js';
import { moebelSetzen, moebelKaufen } from '../src/kern/moebel.js';
import { versetzen, personHinzufuegen } from '../src/kern/personen.js';
import { kaffeeKundenPositionen } from '../src/kern/kirchkaffee.js';
import { TAG_MIN } from '../src/kern/zeit.js';
import { besucherPositionen } from '../src/kern/bewegung.js';
import { toiletteWert, toiletteAktuell, startWert, kabinen } from '../src/kern/toiletten.js';

const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
const raumBei = (z, x, y) => { const a = aus(z); return a.liste[a.gruppe[x + y * z.w]]; };
const SO = 6 * TAG_MIN, BEGINN = SO + 10 * 60;
const ORIGINAL = { ...TOILETTE };
const zuruecksetzen = () => Object.assign(TOILETTE, ORIGINAL);

// Gottesdienstraum mit 10 Stühlen und Pastor; 10 Besucher, die sicher kommen. Mit toiletten: Toilettenraum mit so vielen Kabinen.
function gemeinde(wcAnzahl = 0) {
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z, G.x + 5, G.y + 5), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 15, G.y + 3);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  veranstaltungEinstellen(z, raumBei(z, G.x + 5, G.y + 5), 'gottesdienst');
  if (wcAnzahl) {
    // unterhalb des Gottesdienstraums, Tür nach unten (Richtung Tor)
    wandRechteck(z, G.x + 2, G.y + 10, G.x + 7, G.y + 14); tuerUmschalten(z, G.x + 4, G.y + 14);
    typZuweisen(z, raumBei(z, G.x + 4, G.y + 12), 'toiletten');
    moebelSetzen(z, 'wc', G.x + 3, G.y + 11, G.x + 2 + wcAnzahl, G.y + 11);
    moebelSetzen(z, 'waschbecken', G.x + 6, G.y + 11, G.x + 6, G.y + 11);
  }
  z.besucher = Array.from({ length: 10 }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X',
    level: 5, zufriedenheit: 100, kaffeeWert: 0, besuche: 0, lobpreis: 0 }));
  z.bekanntheit = 0; z.ortRuhig = true; z.konto = 1000;
  return z;
}
const lauf = z => z.laeufe.find(L => L.gaeste && L.gaeste.length);
const alleGaenge = z => lauf(z).gaeste.flatMap(g => g.gaenge || []);

// Inhalte: Raum und Möbel gibt es
{
  assert.ok(RAUMTYPEN.find(t => t.id === 'toiletten'));
  assert.ok(MOEBEL.find(m => m.id === 'wc' && m.kategorie === 'toiletten'));
  assert.ok(MOEBEL.find(m => m.id === 'waschbecken' && m.kategorie === 'toiletten'));
  // Startwert: fest aus Termin und Person, immer zwischen 0 und 40 %
  for (let i = 0; i < 200; i++) { const w = startWert('0:1:0', 'p' + i); assert.ok(w >= TOILETTE.startMin && w <= TOILETTE.startMax); }
  assert.equal(startWert('a', 'b'), startWert('a', 'b'));
  // Wert steigt 10 % pro Stunde, nach dem Gang wieder ab 0, höchstens 100
  const g = { wc0: { t: 0, w: 20 }, gaenge: [{ drinAb: 300, drinBis: 308 }] };
  assert.equal(toiletteWert(g, 60), 30);
  assert.equal(toiletteWert(g, 304), 0);
  assert.equal(toiletteWert(g, 368), 10);
  assert.equal(toiletteWert({ wc0: { t: 0, w: 90 } }, 6000), 100);
  assert.equal(toiletteWert({ wc0: { t: 100, w: 0 } }, 50), null);
}
console.log('Grund-Tests bestanden.');

// Ohne Toilette: niemand geht, alles läuft wie bisher
{
  TOILETTE.startMin = TOILETTE.startMax = 70;
  const z = gemeinde(0);
  zeitVorruecken(z, aus(z), BEGINN - 100 - z.minuten, () => 0);
  assert.equal(kabinen(z, aus(z)).length, 0);
  assert.equal(alleGaenge(z).length, 0);
  zeitVorruecken(z, aus(z), BEGINN + 190 - z.minuten, () => 0);
  assert.equal(z.letzterGottesdienst.besucher, 10);
  zuruecksetzen();
}
console.log('Ohne-Toilette-Tests bestanden.');

// Toilettenraum ohne Kabine zählt nicht
{
  const z = gemeinde(0);
  wandRechteck(z, G.x + 18, G.y + 2, G.x + 24, G.y + 6); tuerUmschalten(z, G.x + 18, G.y + 4);
  typZuweisen(z, raumBei(z, G.x + 21, G.y + 4), 'toiletten');
  assert.equal(kabinen(z, aus(z)).length, 0);
}

// Über 50 % beim Ankommen: erst zur Toilette, dann zum Platz. Eine Kabine: immer nur einer drin, die anderen warten.
{
  TOILETTE.startMin = TOILETTE.startMax = 60;
  const z = gemeinde(1);
  zeitVorruecken(z, aus(z), BEGINN - 170 - z.minuten, () => 0);
  const g = alleGaenge(z);
  assert.equal(g.length, 10);
  assert.ok(g.every(s => s.art === 'vorher'));
  const zeiten = g.map(s => [s.drinAb, s.drinBis]).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < zeiten.length; i++) assert.ok(zeiten[i][0] >= zeiten[i - 1][1] - 1e-6, 'Kabine doppelt belegt');
  assert.ok(g.some(s => s.drinAb > s.anWarte + 1), 'jemand muss warten');
  assert.ok(g.every(s => s.drinBis - s.drinAb === TOILETTE.dauer));
  // Wer gerade drin ist, steht auf der Kabine; danach geht es zum Platz
  const s0 = g.sort((a, b) => a.drinAb - b.drinAb)[0], gast = lauf(z).gaeste.find(x => (x.gaenge || []).includes(s0));
  zeitVorruecken(z, aus(z), s0.drinAb + 1 - z.minuten, () => 0);
  const pos = besucherPositionen(z, new Map()).find(b => b.id === gast.id);
  assert.deepEqual([pos.x, pos.y], [s0.kabine.x, s0.kabine.y]);
  assert.equal(toiletteAktuell(z, gast.id), 0);
  assert.ok(s0.zurueckBis < BEGINN + 60);   // der Erste sitzt noch während des Gottesdienstes (langsames Laufen: oft nach Beginn)
  zeitVorruecken(z, aus(z), s0.zurueckBis + 1 - z.minuten, () => 0);
  const da = besucherPositionen(z, new Map()).find(b => b.id === gast.id);
  assert.deepEqual([da.x, da.y, da.sitzt], [gast.sitz.x, gast.sitz.y, true]);
  // Danach steigt der Wert wieder ab 0 (gezählt ab dem Verlassen der Kabine)
  zeitVorruecken(z, aus(z), 30, () => 0);
  assert.equal(toiletteAktuell(z, gast.id), Math.round((z.minuten - s0.drinBis) * TOILETTE.proStunde / 60));
  // Die Veranstaltung läuft normal, alle 10 sind da
  zeitVorruecken(z, aus(z), BEGINN + 190 - z.minuten, () => 0);
  assert.equal(z.letzterGottesdienst.besucher, 10);
  zuruecksetzen();
}
console.log('Vorher-Tests bestanden.');

// Mit zwei Kabinen wird verteilt
{
  TOILETTE.startMin = TOILETTE.startMax = 60;
  const z = gemeinde(2);
  zeitVorruecken(z, aus(z), BEGINN - 170 - z.minuten, () => 0);
  const benutzt = new Set(alleGaenge(z).map(s => `${s.kabine.x},${s.kabine.y}`));
  assert.equal(benutzt.size, 2);
  zuruecksetzen();
}

// Am Platz vor der Veranstaltung: ab 80 % (hier ohne den Gang vorher).
{
  TOILETTE.startMin = TOILETTE.startMax = 0; TOILETTE.proStunde = 30; TOILETTE.vorherAb = 100;   // schneller, damit es vor Beginn 80 % erreicht; ohne „vorher“
  const z = gemeinde(1);
  zeitVorruecken(z, aus(z), BEGINN - 170 - z.minuten, () => 0);
  const L = lauf(z);
  for (const g of L.gaeste) for (const s of g.gaenge) {
    assert.equal(s.art, 'sitz');
    // vor Beginn ab 80 % (wer mit mehr ankommt: gleich), während der Veranstaltung erst ab 100 %
    const w = toiletteWert({ wc0: g.wc0 }, s.hinAb);
    if (s.hinAb < BEGINN) assert.ok(w >= TOILETTE.suchenAb - 1e-6);
    else { assert.ok(w >= TOILETTE.waehrendAb - 1e-6); assert.ok(s.hinAb < BEGINN + 60); }
    assert.deepEqual(s.nach, g.sitz);
  }
  assert.ok(L.gaeste.some(g => g.gaenge.some(s => s.hinAb < BEGINN)));
  zuruecksetzen();
}
console.log('Am-Platz-Tests bestanden.');

// Während der Veranstaltung erst bei 100 %; bei 80 % während der Veranstaltung wartet man bis zum Ende
{
  TOILETTE.startMin = TOILETTE.startMax = 0; TOILETTE.vorherAb = 100; TOILETTE.suchenAb = 200; TOILETTE.waehrendAb = 200;
  const z0 = gemeinde(1);
  zeitVorruecken(z0, aus(z0), BEGINN - 170 - z0.minuten, () => 0);
  assert.equal(alleGaenge(z0).length, 0);
  zuruecksetzen();

  // Wert so, dass 100 % mitten in der Veranstaltung erreicht wird
  TOILETTE.vorherAb = 100; TOILETTE.suchenAb = 100; TOILETTE.proStunde = 25; TOILETTE.startMin = TOILETTE.startMax = 10;
  const z = gemeinde(1);
  zeitVorruecken(z, aus(z), BEGINN - 170 - z.minuten, () => 0);
  const g = alleGaenge(z);
  assert.ok(g.length > 0);
  for (const s of g) { assert.equal(s.art, 'sitz'); assert.ok(s.hinAb >= BEGINN && s.hinAb < BEGINN + 60); }
  zuruecksetzen();
}
console.log('Während-Tests bestanden.');

// Nach der Veranstaltung: wer ohne Kaffee heimgeht und 80 % hat, geht vorher zur Toilette und dann heim
{
  TOILETTE.startMin = TOILETTE.startMax = 40; TOILETTE.vorherAb = 100; TOILETTE.suchenAb = 80; TOILETTE.waehrendAb = 100; TOILETTE.proStunde = 12;
  const z = gemeinde(1);
  zeitVorruecken(z, aus(z), BEGINN + 61 - z.minuten, () => 0);
  const heim = alleGaenge(z).filter(s => s.art === 'heim');
  assert.ok(heim.length > 0);
  for (const s of heim) assert.ok(s.hinAb >= BEGINN + 60);
  // bis alle zu Hause sind, bleibt der Ablauf bestehen
  const L = lauf(z), bis = Math.max(...heim.map(s => s.zurueckBis));
  zeitVorruecken(z, aus(z), bis - 1 - z.minuten, () => 0);
  assert.ok(z.laeufe.includes(L));
  zeitVorruecken(z, aus(z), 500, () => 0);
  assert.ok(!z.laeufe.includes(L));
  zuruecksetzen();
}
console.log('Heimweg-Tests bestanden.');

// Fällt die Veranstaltung aus (Pastor nicht im Raum), fallen noch nicht begonnene Gänge am Platz weg
{
  TOILETTE.startMin = TOILETTE.startMax = 0; TOILETTE.vorherAb = 100; TOILETTE.suchenAb = 100; TOILETTE.proStunde = 25; TOILETTE.startMin = TOILETTE.startMax = 10;
  const z = gemeinde(1);
  zeitVorruecken(z, aus(z), BEGINN - 170 - z.minuten, () => 0);
  assert.ok(alleGaenge(z).length > 0);
  versetzen(z, z.personen[0], G.x + 10, G.y + 12);   // Pastor geht raus
  zeitVorruecken(z, aus(z), BEGINN + 1 - z.minuten, () => 0);
  assert.equal(alleGaenge(z).length, 0);
  assert.equal(z.wc.belegt.length, 0);
  zuruecksetzen();
}
console.log('Ausfall-Tests bestanden.');
// Kirchkaffee (Lukas, 26.11. abends): Gäste im Kirchkaffee gehen auch zur Toilette – gleiches Bedürfnis, ab 80 %
function kaffeeGemeinde(mitWc = true) {
  const z = neuesSpiel(() => 0.9);
  z.ortRuhig = true; z.konto = 1000; z.bekanntheit = 0;
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 10); tuerUmschalten(z, G.x + 2, G.y + 5);
  wandRechteck(z, G.x + 18, G.y + 2, G.x + 26, G.y + 10); tuerUmschalten(z, G.x + 18, G.y + 5);
  typZuweisen(z, raumBei(z, G.x + 5, G.y + 5), 'gottesdienst'); typZuweisen(z, raumBei(z, G.x + 20, G.y + 5), 'kirchkaffee');
  veranstaltungEinstellen(z, raumBei(z, G.x + 5, G.y + 5), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 4, G.x + 10, G.y + 4);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  assert.equal(moebelKaufen(z, 'kaffeemaschine', G.x + 20, G.y + 3), 'ok');
  assert.equal(moebelKaufen(z, 'theke', G.x + 22, G.y + 3), 'ok');
  versetzen(z, personHinzufuegen(z, { name: 'Helfer', kuerzel: 'H', art: 'ehrenamt' }), G.x + 25, G.y + 4);
  if (mitWc) {
    wandRechteck(z, G.x + 2, G.y + 12, G.x + 7, G.y + 16); tuerUmschalten(z, G.x + 4, G.y + 12);
    typZuweisen(z, raumBei(z, G.x + 4, G.y + 14), 'toiletten');
    moebelSetzen(z, 'wc', G.x + 3, G.y + 15, G.x + 3, G.y + 15);
  }
  z.besucher = Array.from({ length: 5 }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X',
    level: 5, zufriedenheit: 100, kaffeeWert: 1, besuche: 0, lobpreis: 0.5 }));
  return z;
}
const schritte = (z, bis, jedesMal = () => {}) => { while (z.minuten < bis) { zeitVorruecken(z, aus(z), 1, () => 0); jedesMal(); } };
{
  // vorher und während der Veranstaltung nie, damit alle mit hohem Wert ins Kirchkaffee kommen
  TOILETTE.vorherAb = 100; TOILETTE.waehrendAb = 200; TOILETTE.startMin = TOILETTE.startMax = 0; TOILETTE.proStunde = 25;
  const z = kaffeeGemeinde();
  const gesehen = new Map();   // id → Kunde (mit seinen Gängen), auch nachdem er heimgegangen ist
  let inKabine = false;
  schritte(z, BEGINN + 900, () => {
    for (const k of z.kaffee ? z.kaffee.kunden : []) gesehen.set(k.id, k);
    for (const k of z.kaffee ? z.kaffee.kunden : []) {
      if (!k.gang || z.minuten < k.gang.drinAb || z.minuten >= k.gang.drinBis) continue;
      const p = kaffeeKundenPositionen(z).find(x => x.id === k.id);
      assert.deepEqual([p.x, p.y], [k.gang.kabine.x, k.gang.kabine.y]);   // in der Kabine zu sehen
      assert.equal(toiletteAktuell(z, k.id), 0);
      inKabine = true;
    }
  });
  assert.ok(inKabine);
  assert.equal(gesehen.size, 5);
  const gaenge = [...gesehen.values()].flatMap(k => (k.gaenge || []).map(s => ({ k, s })));
  assert.ok(gaenge.length >= 5);
  for (const { k, s } of gaenge) {
    assert.ok(['kaffee', 'heim'].includes(s.art));
    assert.ok(toiletteWert({ wc0: k.wc0, gaenge: k.gaenge.filter(x => x !== s && x.drinBis <= s.hinAb) }, s.hinAb) >= TOILETTE.suchenAb - 1e-6);
    if (s.art === 'kaffee') assert.deepEqual(s.nach, s.von);           // zurück an denselben Platz
    else assert.deepEqual(s.nach, k.heimweg);                           // über die Toilette heim
  }
  // Wert lief vom Gottesdienst weiter (startet im Kirchkaffee nicht neu bei 0)
  for (const k of gesehen.values()) assert.ok(k.wc0.w > 0);
  // Am Ende sind alle zu Hause
  assert.equal(z.kaffee.kunden.length, 0);
  zuruecksetzen();
}
{
  // Ohne Toilette: kein Gang, das Kirchkaffee läuft wie bisher
  TOILETTE.vorherAb = 100; TOILETTE.waehrendAb = 200; TOILETTE.startMin = TOILETTE.startMax = 0; TOILETTE.proStunde = 25;
  const z = kaffeeGemeinde(false);
  const gesehen = new Map();
  schritte(z, BEGINN + 900, () => { for (const k of z.kaffee ? z.kaffee.kunden : []) gesehen.set(k.id, k); });
  assert.ok(gesehen.size > 0);
  for (const k of gesehen.values()) assert.equal((k.gaenge || []).length, 0);
  assert.equal(z.kaffee.kunden.length, 0);
  zuruecksetzen();
}
console.log('Kirchkaffee-Tests bestanden.');
console.log('Alle Toiletten-Tests bestanden.');
