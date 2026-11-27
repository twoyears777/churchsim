// Prüft die Automaten (Spielprinzip claude/spielprinzip-getraenkeautomat.md, Lukas 26.11.2026):
// Kaufen und Lager, Auffüllen durch den Kirchkaffee-Ehrenamtlichen nur bei geschlossenem Kirchkaffee (0,50 € pro Getränk,
// 27.11.: erst ab 10 fehlenden, dann alles bis voll), Kauf durch Gäste auf dem Gelände (50 % je vorher und nachher,
// auch bei der Seelsorge, 3 €, Haltung +5 / leer −10 bei jedem Kauf).
// Starten mit: node tests/automaten.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { AUTOMATEN, AUTOMAT } from '../src/inhalte/automaten.js';
import { MOEBEL } from '../src/inhalte/moebel.js';
import { EINNAHMEN, AUSGABEN } from '../src/inhalte/finanzen.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel } from './hilfen/ohne-erster.mjs';   // erster Gottesdienst schon vorbei (ohne Zeitung, ohne Zusatzleute)
import { zeitVorruecken, veranstaltungEinstellen } from '../src/kern/ablauf.js';
import { moebelSetzen, moebelKaufen, moebelWert } from '../src/kern/moebel.js';
import { versetzen, personHinzufuegen } from '../src/kern/personen.js';
import { schichtHinzufuegen, passantKommt } from '../src/kern/kirchkaffee.js';
import { lagerVon, willKaufen, nachherBesuch, automatenImBetrieb, automatenSchritt } from '../src/kern/automaten.js';
import { seelsorgeSchritt, seelsorgePositionen, ablehnen, schliessen } from '../src/kern/seelsorge.js';
import { toiletteWert } from '../src/kern/toiletten.js';
import { TAG_MIN } from '../src/kern/zeit.js';
import { ANKUNFT_SPIELRAUM } from '../src/inhalte/zeit.js';
import { strasse } from '../src/kern/bewegung.js';

const SO = 6 * TAG_MIN;
const GA = AUTOMATEN.find(a => a.id === 'getraenkeautomat');

// Gottesdienstraum mit Stühlen und Kirchkaffee daneben (1 Station: Maschine + Theke + Ehrenamtlicher) und ein Getränkeautomat
function gemeinde({ stuehle = 20, besucher = 20 } = {}) {
  const z = neuesSpiel(() => 0.9);
  z.ortRuhig = true;
  const aus = () => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
  const raumBei = (x, y) => { const a = aus(); return a.liste[a.gruppe[x + y * z.w]]; };
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 10); tuerUmschalten(z, G.x + 2, G.y + 5);
  wandRechteck(z, G.x + 18, G.y + 2, G.x + 26, G.y + 10); tuerUmschalten(z, G.x + 18, G.y + 5);
  typZuweisen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst'); typZuweisen(z, raumBei(G.x + 20, G.y + 5), 'kirchkaffee');
  veranstaltungEinstellen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst');
  for (let i = 0; i < stuehle; i++) moebelSetzen(z, 'stuhl', G.x + 6 + (i % 10), G.y + 4 + Math.floor(i / 10), G.x + 6 + (i % 10), G.y + 4 + Math.floor(i / 10));
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  z.konto = 1000;
  assert.equal(moebelKaufen(z, 'kaffeemaschine', G.x + 20, G.y + 3), 'ok');
  assert.equal(moebelKaufen(z, 'theke', G.x + 22, G.y + 3), 'ok');
  assert.equal(moebelKaufen(z, 'getraenkeautomat', G.x + 24, G.y + 8), 'ok');
  const ea = personHinzufuegen(z, { name: 'Helfer 1', kuerzel: 'H', art: 'ehrenamt' });
  versetzen(z, ea, G.x + 25, G.y + 4);
  z.moebel.find(m => m.art === 'kaffeemaschine').fuellung = 30;   // Kaffee voll: hier geht es nur um den Automaten
  z.besucher = Array.from({ length: besucher }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X', level: 5, zufriedenheit: 50, kaffeeWert: 0, besuche: 0, lobpreis: 0.5 }));
  const automat = () => z.moebel.find(m => m.art === 'getraenkeautomat');
  const kk = () => raumBei(G.x + 20, G.y + 5);
  return { z, aus, ea, automat, kk };
}
const bis = (z, aus, minute) => { while (z.minuten < minute) zeitVorruecken(z, aus(), Math.min(5, minute - z.minuten), () => 0); };
const automatGaenge = L => L.gaeste.flatMap(g => (g.gaenge || []).filter(s => s.ware && s.art === 'vorher').map(s => ({ g, s })));   // 27.11.: auf dem Weg zum Platz

// Steckbrief, Bauleiste, Finanzen: alles kommt aus inhalte/automaten.js
{
  assert.deepEqual([GA.preis, GA.einkauf, GA.chance, GA.stufen[0].lager, GA.haltung.ja, GA.haltung.leer, GA.auffuellenAb], [3, 0.5, 0.5, 30, 5, -10, 10]);
  const typ = MOEBEL.find(m => m.id === 'getraenkeautomat');
  assert.ok(typ && typ.automat && typ.kategorie === 'kirchkaffee' && typ.kosten === GA.kosten);
  assert.equal(EINNAHMEN.getraenkeautomat, GA.name); assert.equal(AUSGABEN.getraenkeautomat, GA.name);
  const { z, automat } = gemeinde();
  assert.equal(automat().fuellung, 0);                     // kommt leer
  assert.equal(lagerVon(automat()), 30);
  assert.equal(moebelWert(automat()), GA.kosten);           // Abriss erstattet den Kaufpreis (später plus Verbesserungen)
  assert.equal(z.wochenbuch.ausgaben.moebel >= GA.kosten, true);
}
console.log('Steckbrief-Tests bestanden.');

// Auffüllen: Kirchkaffee zu → Ehrenamtlicher kauft im Laden, 0,50 € pro Getränk – erst ab 10 fehlenden, dann alles bis 30 (27.11.)
{
  const { z, aus, ea, automat } = gemeinde();
  const konto = z.konto;
  zeitVorruecken(z, aus(), 1, () => 0);
  const a = z.kaffee.ma[ea.id].aufgabe;
  assert.deepEqual([a.art, a.ware, a.menge, a.preis], ['einkauf', 'getraenkeautomat', 30, 15]);   // neu und leer: alles auf einmal
  for (let i = 0; i < 5000 && automat().fuellung < 30; i++) zeitVorruecken(z, aus(), 5, () => 0);
  assert.equal(automat().fuellung, 30);
  assert.equal(z.konto, konto - 15);                        // einmal gelaufen, 30 × 0,50 €
  assert.equal(z.wochenbuch.ausgaben.getraenkeautomat, 15);
  assert.equal(z.wochenbuch.ausgaben.kaffee || 0, 0);
  zeitVorruecken(z, aus(), 300, () => 0);
  assert.equal(z.konto, konto - 15);                        // voll: geht nicht mehr los
  automat().fuellung = 21;                                  // 9 fehlen: noch nicht
  zeitVorruecken(z, aus(), 300, () => 0);
  assert.equal(z.konto, konto - 15);
  assert.equal(automat().fuellung, 21);
  automat().fuellung = 20;                                  // 10 fehlen: jetzt geht er los und füllt alle 10 nach
  zeitVorruecken(z, aus(), 1, () => 0);
  assert.deepEqual([z.kaffee.ma[ea.id].aufgabe.menge, z.kaffee.ma[ea.id].aufgabe.preis], [10, 5]);
  for (let i = 0; i < 5000 && automat().fuellung < 30; i++) zeitVorruecken(z, aus(), 5, () => 0);
  assert.equal(automat().fuellung, 30);
  assert.equal(z.konto, konto - 20);
}
// Während der Öffnungszeit wird nicht aufgefüllt, danach schon
{
  const { z, aus, automat, kk } = gemeinde();
  assert.equal(schichtHinzufuegen(z, kk(), 0, 'vormittag'), 'ok');   // Montag 10–15 Uhr
  automat().fuellung = 30;                                  // voll, damit vor der Öffnung niemand einkaufen geht (27.11.: der Weg ist kürzer, er käme sonst mittendrin zurück)
  bis(z, aus, 10 * 60 + 5);
  automat().fuellung = 0;
  bis(z, aus, 14 * 60 + 50);
  assert.equal(automat().fuellung, 0);
  bis(z, aus, 15 * 60 + 1);
  assert.equal(z.kaffee.ma[Object.keys(z.kaffee.ma)[0]].aufgabe.ware, 'getraenkeautomat');   // nach Schluss geht er los
  bis(z, aus, 3 * TAG_MIN);                                 // (der Weg zum Laden führt hier durch den Gottesdienstraum: lang)
  assert.equal(automat().fuellung, 30);
}
// Zu wenig Geld: Meldung mit dem Automaten
{
  const { z, aus } = gemeinde();
  z.konto = 2;
  zeitVorruecken(z, aus(), 1, () => 0);
  assert.deepEqual([z.kaffee.meldung.code, z.kaffee.meldung.ware], ['keinGeldAutomat', 'getraenkeautomat']);
}
console.log('Auffüll-Tests bestanden.');

// Gottesdienst-Gäste: je 50 % vorher und nachher (fest „gewürfelt“, 27.11.), 3 €, +5 Haltung je Kauf.
// 27.11.: Vorher gehen sie auf dem Weg vom Tor zum Platz über den Automaten und sitzen trotzdem genau zum Beginn (höchstens
// ANKUNFT_SPIELRAUM zu früh) – geht das nicht, wird der Wunsch nachher erfüllt (Heimweg über den Automaten).
// Wer vorher und nachher will, kauft zwei Getränke; wer vorher keine Zeit hatte, nachher aber auch will, kauft eins.
const erwartet = (L, g) => {
  const v = willKaufen(GA, L.id, g.id), n = willKaufen(GA, nachherBesuch(L.id), g.id);
  const vorherGekauft = (g.gaenge || []).some(s => s.ware && s.art === 'vorher');
  return (vorherGekauft ? 1 : 0) + ((v && !vorherGekauft) || n ? 1 : 0);
};
{
  const { z, aus, automat } = gemeinde();
  bis(z, aus, SO + 600 - 200);
  assert.equal(automat().fuellung, 30);
  bis(z, aus, SO + 600 - 179);                              // Gäste machen sich auf den Weg
  const L = z.laeufe.find(l => l.gaeste);
  const wollen = L.gaeste.filter(g => willKaufen(GA, L.id, g.id));
  assert.ok(wollen.length > 3 && wollen.length < L.gaeste.length - 3, `etwa die Hälfte will vorher etwas (${wollen.length} von ${L.gaeste.length})`);
  const nachher = L.gaeste.filter(g => willKaufen(GA, nachherBesuch(L.id), g.id));
  assert.ok(nachher.length > 3 && nachher.length < L.gaeste.length - 3, `etwa die Hälfte will nachher etwas (${nachher.length})`);
  assert.ok(L.gaeste.some(g => wollen.includes(g) && nachher.includes(g)) && L.gaeste.some(g => wollen.includes(g) !== nachher.includes(g)));   // unabhängig
  const vorherGaenge = automatGaenge(L);
  assert.ok(vorherGaenge.length > 3, `einige kaufen auf dem Weg (${vorherGaenge.length})`);
  assert.ok(vorherGaenge.every(({ g, s }) => s.zurueckBis <= L.beginn + 1e-6 && s.zurueckBis >= L.beginn - ANKUNFT_SPIELRAUM - 1e-6
    && s.nach.x === g.sitz.x && s.nach.y === g.sitz.y && s.von.y === strasse(0).y && g.los === s.hinAb), 'auf dem Weg, pünktlich zum Beginn');
  assert.ok(vorherGaenge.every(({ s }) => s.drinAb - s.anWarte < 1.5), 'niemand steht am Automaten an');
  assert.ok(vorherGaenge.every(({ g }) => wollen.includes(g)));
  assert.ok(wollen.every(g => (g.gaenge || []).some(s => s.ware) || (g.automatOffen || []).includes('getraenkeautomat')));   // vorher – oder danach
  assert.ok(nachher.every(g => (g.automatOffen || []).includes('getraenkeautomat')));
  const soll = Object.fromEntries(L.gaeste.map(g => [g.id, erwartet(L, g)]));
  const vorher = Object.fromEntries(L.gaeste.map(x => [x.id, z.besucher.find(b => b.id === x.id).zufriedenheit]));
  bis(z, aus, SO + 600 + 60 + 1);                           // Gottesdienst vorbei: der Rest geht über den Automaten heim
  const heim = L.gaeste.flatMap(g => (g.gaenge || []).filter(s => s.art === 'automatHeim'));
  assert.ok(heim.every(s => s.hinAb >= L.gottesdienstEnde));
  bis(z, aus, SO + 600 + 600);
  const alle = L.gaeste.flatMap(g => (g.gaenge || []).filter(s => s.ware).map(s => ({ g, s })));
  const anzahl = g => alle.filter(x => x.g === g).length;
  assert.ok(L.gaeste.every(g => anzahl(g) === soll[g.id]), 'jeder kauft so oft, wie er vorher und nachher will');
  assert.ok(alle.every(({ s }) => s.ergebnis === 'ja'));
  // Nie zwei gleichzeitig am Automaten
  const zeiten = alle.map(({ s }) => [s.drinAb, s.drinBis]).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < zeiten.length; i++) assert.ok(zeiten[i][0] >= zeiten[i - 1][1] - 1e-6);
  assert.equal(z.wochenbuch.einnahmen.getraenkeautomat, 3 * alle.length);
  // Haltung: +5 je Kauf mehr als Nicht-Käufer (der Gottesdienst selbst wirkt bei allen gleich), auch beim zweiten
  const kaeufer = L.gaeste.find(g => anzahl(g) === 1), doppelt = L.gaeste.find(g => anzahl(g) === 2), anderer = L.gaeste.find(g => anzahl(g) === 0);
  const plus = id => z.besucher.find(b => b.id === id).zufriedenheit - vorher[id];
  assert.equal(plus(kaeufer.id) - plus(anderer.id), 5);
  if (doppelt) assert.equal(plus(doppelt.id) - plus(anderer.id), 10);   // (hier hat vorher kaum jemand Zeit; zweimal prüft der Seelsorge-Test)
  // Der Gang zum Automaten ist kein Toilettengang
  const { g, s } = alle[0];
  assert.ok(toiletteWert(g, s.drinBis + 1) > 0);
}
// Automat leer (kein Geld zum Auffüllen): wer will, bekommt nichts und verliert 10 Haltung
{
  const { z, aus, automat } = gemeinde();
  z.konto = 0;
  bis(z, aus, SO + 600 - 179);
  const L = z.laeufe.find(l => l.gaeste);
  const soll = Object.fromEntries(L.gaeste.map(g => [g.id, erwartet(L, g)]));
  const vorher = Object.fromEntries(L.gaeste.map(x => [x.id, z.besucher.find(b => b.id === x.id).zufriedenheit]));
  z.konto = 0;
  bis(z, aus, SO + 600 + 600);
  const anzahl = g => (g.gaenge || []).filter(s => s.ware).length;
  assert.ok(L.gaeste.every(g => anzahl(g) === soll[g.id]));
  assert.ok(L.gaeste.flatMap(g => (g.gaenge || []).filter(s => s.ware)).every(s => s.ergebnis === 'leer'));
  const kaeufer = L.gaeste.find(g => anzahl(g) === 1), doppelt = L.gaeste.find(g => anzahl(g) === 2), anderer = L.gaeste.find(g => anzahl(g) === 0);
  const plus = id => z.besucher.find(b => b.id === id).zufriedenheit - vorher[id];
  assert.equal(plus(kaeufer.id) - plus(anderer.id), -10);
  if (doppelt) assert.equal(plus(doppelt.id) - plus(anderer.id), -20);
}
// Ohne Automat: niemand geht hin
{
  const { z, aus } = gemeinde();
  z.moebel = z.moebel.filter(m => m.art !== 'getraenkeautomat');
  bis(z, aus, SO + 600 - 179);
  assert.equal(automatGaenge(z.laeufe.find(l => l.gaeste)).length, 0);
  assert.equal(automatenImBetrieb(z, aus(), 'getraenkeautomat').length, 0);
}
console.log('Gottesdienst-Gäste-Tests bestanden.');

// Kunden zu den Öffnungszeiten (Passanten): kaufen evtl. einmal, während sie im Kirchkaffee stehen oder sitzen
{
  const { z, aus, automat, kk } = gemeinde();
  assert.equal(schichtHinzufuegen(z, kk(), 1, 'nachmittag'), 'ok');   // Dienstag 15–19 Uhr
  automat().fuellung = 30;                                  // schon voll (Auffüllen prüfen die Tests oben)
  bis(z, aus, TAG_MIN + 15 * 60 + 1);
  assert.equal(automat().fuellung, 30);
  const leute = Array.from({ length: 12 }, (_, i) => ({ id: 'p' + i, name: 'P' + i }));
  for (const p of leute) { z.ort = z.ort || { leute: [] }; assert.equal(passantKommt(z, aus(), p), true); }
  const wollen = z.kaffee.kunden.filter(k => willKaufen(GA, k.besuch, k.id)).length;
  assert.ok(wollen > 0);
  bis(z, aus, TAG_MIN + 26 * 60);                          // (wer spät bedient wird, bleibt noch eine Stunde)
  const verkauft = 30 - automat().fuellung;
  assert.equal(verkauft, wollen);
  assert.equal(z.wochenbuch.einnahmen.getraenkeautomat, 3 * verkauft);
}
console.log('Kirchkaffee-Kunden-Tests bestanden.');

// Seelsorge (27.11.): je 50 % auf dem Weg zum Pastor und auf dem Rückweg zum Tor über den Automaten, 3 €, +5 Haltung
{
  const { z, aus, automat } = gemeinde();
  automat().fuellung = 30;
  z.ortRuhig = false; z.ort = { leute: [] };
  const gesehen = [];
  for (let n = 0; n < 20000 && (gesehen.length < 16 || z.seelsorge.gang); n++) {
    const a = seelsorgeSchritt(z, () => false, () => 0, aus()), b = automatenSchritt(z);
    const s = !b || a.zeit <= b.zeit ? a : b;
    z.minuten = Math.max(z.minuten, s.zeit); s.tun(z);
    const G = z.seelsorge.gang;
    if (G && G.vor && !G.da && z.minuten < G.vor.drinBis) {   // unterwegs zum Automaten: wird gezeigt
      const pos = seelsorgePositionen(z);
      assert.equal(pos.length, 1);
    }
    if (z.seelsorge.anfrage) {
      if (G && !gesehen.includes(G) && gesehen.length < 16) gesehen.push(G);
      assert.equal(ablehnen(z), 'ok'); assert.equal(schliessen(z), 'ok');
    }
  }
  assert.equal(gesehen.length, 16);
  const besuch = G => `ss:${G.t0}:${G.id}`;
  for (const G of gesehen) {
    assert.equal(!!G.vor, willKaufen(GA, besuch(G), G.id));
    assert.equal(!!G.nach, willKaufen(GA, nachherBesuch(besuch(G)), G.id));
    const ende = G.hin.pfad[G.hin.pfad.length - 1], tor = G.hin.pfad[0];
    if (G.vor) assert.deepEqual([G.vor.nach.x, G.vor.nach.y, G.vor.ergebnis], [ende.x, ende.y, 'ja']);   // dann weiter zum Pastor
    if (G.nach) assert.deepEqual([G.nach.nach.x, G.nach.nach.y, G.nach.ergebnis], [tor.x, tor.y, 'ja']);   // dann zum Tor
  }
  const kaeufe = gesehen.reduce((n, G) => n + !!G.vor + !!G.nach, 0);
  assert.ok(gesehen.some(G => G.vor && G.nach) && gesehen.some(G => !G.vor !== !G.nach) && gesehen.some(G => !G.vor && !G.nach));
  // Haltung beim zweiten Kauf ebenfalls +5: Person mit Hin- und Rückweg über den Automaten
  const beide = gesehen.find(G => G.vor && G.nach);
  assert.ok(beide.vor.ergebnis === 'ja' && beide.nach.ergebnis === 'ja');
  assert.equal(30 - automat().fuellung, kaeufe);
  assert.equal(z.wochenbuch.einnahmen.getraenkeautomat, 3 * kaeufe);
}
console.log('Seelsorge-Tests bestanden.');
console.log('Automaten: alle Tests bestanden');
