// Prüft mehrere Veranstaltungen pro Raum, den Lobpreisgottesdienst und das Bekanntheit-Protokoll.
// Starten mit: node tests/veranstaltungen.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { ZWEITER_BESUCH } from '../src/inhalte/veranstaltungen.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel, spielStarten, spielAnlegen } from '../src/kern/spiel.js';
import { zeitVorruecken, veranstaltungEinstellen, terminEinstellen, programmVon, gottesdienstRaeume, termineDerWoche, prognose, naechstesEvent } from '../src/kern/ablauf.js';
import { moebelSetzen, moebelAbreissen } from '../src/kern/moebel.js';
import { versetzen, personHinzufuegen } from '../src/kern/personen.js';
import { besuchChance, kommChance, lobpreisVorliebe } from '../src/kern/besucher.js';
import { TAG_MIN, WOCHE_MIN } from '../src/kern/zeit.js';
import { besucherPositionen } from '../src/kern/bewegung.js';
import { kaffeeZahlen } from '../src/kern/kirchkaffee.js';
import { TEXTE } from '../src/inhalte/texte.js';

const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
const raumBei = z => { const a = aus(z); return a.liste[a.gruppe[G.x + 5 + (G.y + 5) * z.w]]; };
const SO = 6 * TAG_MIN;

// Gottesdienstraum mit 10 Stühlen, Pastor, Kanzel, Altar, Gitarre; 10 Besucher mit Haltung 100.
// Die ersten 5 lieben Lobpreis (100 %), die anderen 5 gar nicht (0 %).
function gemeinde() {
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 15, G.y + 3);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  z.besucher = Array.from({ length: 10 }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X',
    zufriedenheit: 100, kaffeeWert: 0, besuche: 0, lobpreis: i < 5 ? 1 : 0 }));
  z.bekanntheit = 0; z.ortRuhig = true; z.konto = 1000;
  return z;
}
const ausstatten = z => {
  moebelSetzen(z, 'kanzel', G.x + 10, G.y + 6, G.x + 10, G.y + 6);
  moebelSetzen(z, 'altar', G.x + 12, G.y + 6, G.x + 12, G.y + 6);
  moebelSetzen(z, 'gitarre', G.x + 14, G.y + 6, G.x + 14, G.y + 6);
};

// Alte Spielstände: Art als Text + ein Termin für alle → Veranstaltung 1 mit derselben Zeit
{
  const z = gemeinde(), r = raumBei(z);
  for (const c of r.zellen) z.veranstaltung[c] = 'gottesdienst';
  z.plan = { tag: 3, slot: 'nachmittag' };
  assert.deepEqual(programmVon(z, r), [{ art: 'gottesdienst', tag: 3, slot: 'nachmittag' }, { art: null, tag: 6, slot: 'abend' }]);
  // ein laufender alter Termin (z.lauf) wird übernommen
  const alt = gemeinde(); delete alt.laeufe; alt.lauf = { woche: 0, beginn: SO + 600, phase: 'anreise', gaeste: null, start: 0 };
  spielAnlegen(alt);
  assert.equal(alt.laeufe.length, 1); assert.equal('lauf' in alt, false);
}
console.log('Umstellungs-Tests bestanden.');

// Veranstaltung 2: erst mit Kanzel und Altar frei; gleiche Zeit im selben Raum geht nicht
{
  const z = gemeinde(), r = raumBei(z);
  veranstaltungEinstellen(z, r, 'gottesdienst');
  assert.equal(gottesdienstRaeume(z, aus(z))[0].programm[1].frei, false);
  ausstatten(z);
  assert.equal(gottesdienstRaeume(z, aus(z))[0].programm[1].frei, true);
  veranstaltungEinstellen(z, raumBei(z), 'lobpreis', 1);
  assert.equal(terminEinstellen(z, raumBei(z), 1, 6, 'vormittag'), 'belegt');
  assert.equal(terminEinstellen(z, raumBei(z), 1, 6, 'abend'), 'ok');
  assert.deepEqual(termineDerWoche(z, aus(z), 0).map(t => [t.art, t.plan.slot]), [['gottesdienst', 'vormittag'], ['lobpreis', 'abend']]);
}
console.log('Platz-Tests bestanden.');

// Zwei Veranstaltungen an einem Sonntag: Gottesdienst 10 Uhr, Lobpreisgottesdienst 19 Uhr
{
  const z = gemeinde(), r = raumBei(z);
  ausstatten(z);
  veranstaltungEinstellen(z, r, 'gottesdienst');
  veranstaltungEinstellen(z, raumBei(z), 'lobpreis', 1);
  terminEinstellen(z, raumBei(z), 1, 6, 'abend');
  // Vormittag: alle 10 kommen (Haltung 100, Zufall 0)
  zeitVorruecken(z, aus(z), SO + 10 * 60 + 190 - z.minuten, () => 0);
  assert.equal(z.letzterGottesdienst.besucher, 10);
  assert.equal(z.heiligkeit, 10);   // Forschungsbaum: 1 Heiligkeit pro Gottesdienstbesucher
  const kollekteVormittag = z.wochenbuch.einnahmen.kollekte;
  assert.ok(kollekteVormittag > 0);
  // Abend: Chance = Haltung × Vorliebe × 0,5 (schon da gewesen). Zufall 0,4: Lobpreis-Fans (0,5) kommen, die anderen (0) nicht.
  const b0 = z.besucher[0], b9 = z.besucher[9];
  assert.equal(besuchChance(b0, { art: 'lobpreis', woche: 0 }), kommChance(b0) * 1 * ZWEITER_BESUCH);
  assert.equal(besuchChance(b9, { art: 'lobpreis', woche: 0 }), 0);
  const haltungVorher = z.besucher.map(b => b.zufriedenheit);
  zeitVorruecken(z, aus(z), SO + 19 * 60 + 190 - z.minuten, () => 0.4);
  assert.equal(z.letzterGottesdienst.besucher, 5);
  assert.equal(z.letzterGottesdienst.platz, 1);
  assert.equal(z.heiligkeit, 15);   // Lobpreisgottesdienst zählt genauso
  // Am Abend kommt Kollekte dazu (ohne Sonntagvormittag-Bonus)
  assert.ok(z.wochenbuch.einnahmen.kollekte > kollekteVormittag);
  assert.deepEqual(z.besucher.map(b => b.zufriedenheit), haltungVorher);   // Haltung war schon 100 (Obergrenze)
}
console.log('Zwei-Veranstaltungen-Tests bestanden.');

// Haltung nach Lobpreis-Vorliebe: 100 % → +10, 0 % → 0 (statt fest +5)
{
  const z = gemeinde(), r = raumBei(z);
  ausstatten(z);
  veranstaltungEinstellen(z, r, 'lobpreis');
  z.besucher.forEach(b => { b.zufriedenheit = 50; b.lobpreis = 1; });
  z.besucher[9].lobpreis = 0.5;
  zeitVorruecken(z, aus(z), SO + 10 * 60 + 190 - z.minuten, () => 0);
  // Fans: +5 Sitzplatz +10 Lobpreis; Besucher 9 (50 %): +5 +5. (Kanzel/Blumen bringen Haltung über den Stuhl-Bonus.)
  const fan = z.besucher[0].zufriedenheit, halb = z.besucher[9].zufriedenheit;
  assert.equal(fan - halb, 5);
}
// Haltungs-Multiplikator (25.11. abends): vervielfacht die Summe nach allen Boni; Stufe 3 = ×2
{
  const lauf = stufe => {
    const z = gemeinde(), r = raumBei(z);
    ausstatten(z); z.multiplikator = stufe;
    veranstaltungEinstellen(z, r, 'lobpreis');
    z.besucher.forEach(b => { b.zufriedenheit = 30; b.lobpreis = 1; });
    z.besucher[9].lobpreis = 0.5;
    zeitVorruecken(z, aus(z), SO + 10 * 60 + 190 - z.minuten, () => 0);
    return z.besucher.map(b => b.zufriedenheit - 30);
  };
  const ohne = lauf(0), mit = lauf(3);
  assert.ok(ohne[0] > 0);
  assert.deepEqual(mit, ohne.map(x => Math.round(x * 2)));
}
console.log('Multiplikator-Gottesdienst-Tests bestanden.');
console.log('Lobpreis-Haltungs-Tests bestanden.');

// Ausfälle: Lobpreis ohne Gitarre; Veranstaltung 2 ohne Kanzel/Altar bleibt eingestellt, fällt aber aus
{
  const z = gemeinde(), r = raumBei(z);
  veranstaltungEinstellen(z, r, 'lobpreis');
  assert.equal(gottesdienstRaeume(z, aus(z))[0].programm[0].fehlt, 'gitarre');
  ausstatten(z);
  veranstaltungEinstellen(z, raumBei(z), 'gottesdienst');
  veranstaltungEinstellen(z, raumBei(z), 'gottesdienst', 1);
  terminEinstellen(z, raumBei(z), 1, 6, 'abend');
  moebelAbreissen(z, G.x + 10, G.y + 6, G.x + 10, G.y + 6);   // Kanzel weg
  const p = gottesdienstRaeume(z, aus(z))[0].programm;
  assert.equal(p[0].bereit, true); assert.equal(p[1].art, 'gottesdienst'); assert.equal(p[1].fehlt, 'gesperrt');
  const spiel = spielStarten(JSON.stringify({ version: 3, zustand: z }), () => 0);
  zeitVorruecken(z, aus(z), SO + 19 * 60 + 1 - z.minuten, () => 0);
  assert.equal(z.letzterGottesdienst.ausgefallen, true); assert.equal(z.letzterGottesdienst.grund, 'gesperrt');
  assert.ok(spiel.raumInfo(spiel.raumNrBei(G.x + 5, G.y + 5)).programm[1].nutzbar, 'bleibt einstellbar');
}
console.log('Ausfall-Tests bestanden.');

// Prognose je Veranstaltung; Lobpreis-Vorliebe ist fest und liegt zwischen 0 und 1
{
  const z = gemeinde(), r = raumBei(z);
  ausstatten(z);
  veranstaltungEinstellen(z, r, 'gottesdienst');
  veranstaltungEinstellen(z, raumBei(z), 'lobpreis', 1);
  terminEinstellen(z, raumBei(z), 1, 6, 'abend');
  const nr = raumBei(z).nr;
  // Normaler Gottesdienst ohne Lobpreisteam (Gitarre, aber kein Musiker): Fans × 0,5 → 50 %, × 1,2 Adventszeit = 60 %;
  // die anderen × 1,5 → höchstens 100 %. 5 × 0,6 + 5 × 1 = 8
  assert.ok(Math.abs(prognose(z, aus(z), nr, 0).erwartet - 8) < 1e-9);
  assert.equal(prognose(z, aus(z), nr, 1).erwartet, 5);   // nur die Lobpreis-Fans
  const p = { id: 'b77', voll: 'Erna Muster' };
  assert.equal(lobpreisVorliebe(p), lobpreisVorliebe({ ...p }));
  assert.ok(lobpreisVorliebe(p) >= 0 && lobpreisVorliebe(p) <= 1);
}
console.log('Prognose-Tests bestanden.');

// Lobpreis-Vorliebe beim normalen Gottesdienst (Spielprinzip 25.11.): mit Musik × (0,5 + v), ohne × (1,5 − v), höchstens 100 %
{
  const b = v => ({ id: 'x', voll: 'X Y', zufriedenheit: 60, lobpreis: v });
  const nah = (a, c) => Math.abs(a - c) < 1e-9;
  assert.ok(nah(besuchChance(b(0.9), { art: 'gottesdienst', musik: true }), 0.84));    // Beispiel aus dem Spielprinzip
  assert.ok(nah(besuchChance(b(0.9), { art: 'gottesdienst', musik: false }), 0.36));
  assert.ok(nah(besuchChance(b(0), { art: 'gottesdienst', musik: true }), 0.3));
  assert.ok(nah(besuchChance(b(0), { art: 'gottesdienst', musik: false }), 0.9));
  assert.ok(nah(besuchChance(b(0.5), { art: 'gottesdienst', musik: true }), 0.6));     // 50 %: keine Änderung
  assert.ok(nah(besuchChance(b(0.5), { art: 'gottesdienst', musik: false }), 0.6));
  assert.equal(besuchChance({ ...b(1), zufriedenheit: 90 }, { art: 'gottesdienst', musik: true }), 1);   // höchstens 100 %
  assert.ok(nah(besuchChance(b(0.9), { art: 'gottesdienst' }), 0.6));                  // ohne Angabe: keine Wirkung
  // Lobpreisgottesdienst: wie bisher nur × Vorliebe, kein zusätzlicher Musik-Faktor
  assert.ok(nah(besuchChance(b(0.5), { art: 'lobpreis', musik: true }), 0.3));
}
// Im Spiel: Mit Lobpreisteam kommen beim normalen Gottesdienst die Fans sicher, ohne Lobpreisteam die anderen
{
  const z = gemeinde(), r = raumBei(z);
  ausstatten(z);
  veranstaltungEinstellen(z, r, 'gottesdienst');
  z.besucher.forEach(x => { x.zufriedenheit = 60; });
  const nr = raumBei(z).nr;
  // ohne Musiker: Fans 60 % × 0,5 = 30 %, × 1,2 Advent = 36 %; die anderen 60 % × 1,5 = 90 %, × 1,2 → höchstens 100 %
  // → 5 × 0,36 + 5 × 1 = 6,8
  assert.ok(Math.abs(prognose(z, aus(z), nr, 0).erwartet - 6.8) < 1e-9);
  const ea = personHinzufuegen(z, { name: 'Erna Musik', kuerzel: 'E', art: 'ehrenamt' });
  versetzen(z, ea, G.x + 15, G.y + 6);
  assert.equal(gottesdienstRaeume(z, aus(z))[0].ausstattung.musik, true, 'Lobpreisteam spielt');
  // mit Musiker: genau andersherum (Fans 100 %, die anderen 36 %) → wieder 6,8
  assert.ok(Math.abs(prognose(z, aus(z), nr, 0).erwartet - 6.8) < 1e-9);
  zeitVorruecken(z, aus(z), SO + 10 * 60 + 1 - z.minuten, () => 0.5);   // Zufall 0,5: kommt, wer über 50 % liegt
  const L = z.laeufe.find(x => x.gaeste);
  assert.deepEqual(L.gaeste.map(g => g.id).sort(), ['t0', 't1', 't2', 't3', 't4']);
}
// Haltung durch das Lobpreisteam nach Vorliebe: 100 % → +5 %, 50 % → 0, 0 % → −5 % der aktuellen Haltung
{
  const z = gemeinde(), r = raumBei(z);
  ausstatten(z);
  veranstaltungEinstellen(z, r, 'gottesdienst');
  const ea = personHinzufuegen(z, { name: 'Erna Musik', kuerzel: 'E', art: 'ehrenamt' });
  versetzen(z, ea, G.x + 15, G.y + 6);
  z.besucher = z.besucher.slice(0, 3);
  [1, 0.5, 0].forEach((v, i) => { z.besucher[i].lobpreis = v; z.besucher[i].zufriedenheit = 60; });
  zeitVorruecken(z, aus(z), SO + 10 * 60 + 190 - z.minuten, () => 0);
  const [fan, halb, muffel] = z.besucher.map(x => x.zufriedenheit);
  assert.equal(fan - halb, 3);      // 60 × 5 % = 3
  assert.equal(halb - muffel, 3);   // −3
}
console.log('Lobpreis-Musik-Tests bestanden.');

// Bekanntheit: langsam (Gottesdienst +0,6) und mit Protokoll; Wochenverlauf
{
  const z = gemeinde();
  veranstaltungEinstellen(z, raumBei(z), 'gottesdienst');
  zeitVorruecken(z, aus(z), WOCHE_MIN + 60 - z.minuten, () => 0);
  // 10 Besucher mit Haltung 100: +0,6 Gottesdienst + 10 × 0,2 sehr zufrieden
  assert.equal(z.bekanntheit, 2.6);
  assert.deepEqual(z.bekanntheitLog.map(e => [e.quelle, e.wert, e.anzahl]), [['zufrieden', 2, 10], ['gottesdienst', 0.6, null]]);
  assert.deepEqual(z.bekanntheitVerlauf, [{ woche: 0, wert: 2.6 }]);
  const info = spielStarten(JSON.stringify({ version: 3, zustand: z }), () => 0).bekanntheitInfo();
  assert.equal(info.verlauf.length, 2); assert.equal(info.protokoll[0].quelle, 'zufrieden');
}
console.log('Bekanntheit-Tests bestanden.');

// Neues Spiel: Pastor und Frau des Pastors (Ehrenamtliche); alte Spielstände bekommen niemanden dazu
{
  const z = neuesSpiel(() => 0.3);
  const ea = z.personen.filter(p => p.daten && p.daten.art === 'ehrenamt');
  assert.equal(z.personen.length, 2); assert.equal(ea.length, 1);
  assert.deepEqual([ea[0].daten.name, ea[0].daten.kuerzel, ea[0].daten.start], ['Frau des Pastors', 'F', true]);
  assert.ok(!(ea[0].x === z.personen[0].x && ea[0].y === z.personen[0].y)); // steht nicht auf dem Pastor
  z.personen = z.personen.filter(p => p.id === 'pastor');
  const neu = spielStarten(JSON.stringify({ version: 3, zustand: z }), () => 0);
  assert.equal(neu.lage().personen.length, 1);
}
console.log('Frau-des-Pastors-Tests bestanden.');

// Nach dem Gottesdienst: Wer keinen Kaffee will, geht gleich heim (nicht erst nach dem Kirchkaffee);
// über jedem Kopf erscheint kurz seine Kollekte (zusammen = gebuchte Kollekte).
{
  const z = gemeinde(), r = raumBei(z);
  veranstaltungEinstellen(z, r, 'gottesdienst');
  const speicher = new Map(), sitzen = () => besucherPositionen(z, speicher).filter(b => b.sitzt).length;
  while (z.minuten < SO + 10 * 60 + 59) zeitVorruecken(z, aus(z), 1, () => 0);
  assert.equal(sitzen(), 10);
  assert.equal(kaffeeZahlen(z).length, 0);
  zeitVorruecken(z, aus(z), 2, () => 0);                                  // 11:01: Gottesdienst zu Ende
  const zahlen = kaffeeZahlen(z);
  assert.equal(zahlen.length, 10);
  const L = z.laeufe[0];
  assert.deepEqual(zahlen.map(e => `${e.x},${e.y}`).sort(), L.gaeste.map(g => `${g.sitz.x},${g.sitz.y}`).sort());
  assert.equal(Math.round(zahlen.reduce((s, e) => s + e.betrag, 0)), z.wochenbuch.einnahmen.kollekte);
  zeitVorruecken(z, aus(z), 30, () => 0);
  assert.equal(sitzen(), 0);                                              // alle auf dem Heimweg
  assert.equal(L.phase, 'kirchkaffee');                                    // Abschluss (Zufriedenheit) bleibt bei +180
  while (z.minuten < SO + 14 * 60 + 30) zeitVorruecken(z, aus(z), 1, () => 0);
  assert.equal(z.laeufe.length, 1);                                       // der Ablauf läuft noch (Heimweg-Frist bis 15:00) ...
  assert.equal(besucherPositionen(z, speicher).length, 0);                // ... aber alle sind schon zu Hause
}
console.log('Heimweg- und Kollekte-Zahlen-Tests bestanden.');

// Anbauen (Nachbarraum mit Tür zum Gottesdienstraum) darf die Einstellungen nicht zurücksetzen
{
  const z = gemeinde();
  veranstaltungEinstellen(z, raumBei(z), 'gottesdienst', 0);
  assert.equal(terminEinstellen(z, raumBei(z), 0, 5, 'abend'), 'ok');
  veranstaltungEinstellen(z, raumBei(z), 'lobpreis', 1);
  const vorher = JSON.stringify(programmVon(z, raumBei(z)));
  z.kaffeeZeiten = {}; for (const c of raumBei(z).zellen) z.kaffeeZeiten[c] = [{ tag: 6, slot: 'mittag' }];
  wandRechteck(z, G.x + 18, G.y + 2, G.x + 26, G.y + 8);        // Nachbarraum an der rechten Wand
  tuerUmschalten(z, G.x + 18, G.y + 5);                          // Tür zwischen beiden Räumen
  tuerUmschalten(z, G.x + 22, G.y + 8);                          // Außentür des Nachbarraums
  assert.equal(raumTypVon(z, raumBei(z)).id, 'gottesdienst');
  assert.equal(JSON.stringify(programmVon(z, raumBei(z))), vorher);
  assert.deepEqual(z.kaffeeZeiten[raumBei(z).zellen[0]], [{ tag: 6, slot: 'mittag' }]);
  tuerUmschalten(z, G.x + 18, G.y + 5);                          // Tür wieder zu Wand: bleibt auch
  assert.equal(JSON.stringify(programmVon(z, raumBei(z))), vorher);
}
console.log('Anbau-Test bestanden.');

// Anzeige oben: nächstes Event mit Name und Zeit, laufendes Event, kein Event
{
  const z = gemeinde(); ausstatten(z);
  veranstaltungEinstellen(z, raumBei(z), 'gottesdienst', 0);
  veranstaltungEinstellen(z, raumBei(z), 'lobpreis', 1);
  assert.equal(terminEinstellen(z, raumBei(z), 1, 2, 'abend'), 'ok');          // Lobpreis am Mittwochabend
  const t = termineDerWoche(z, aus(z), 0).find(t => t.art === 'lobpreis');
  let ne = naechstesEvent(z, aus(z));
  assert.equal(ne.laeuft, false); assert.equal(ne.name, 'Lobpreisgottesdienst'); assert.equal(ne.minuten, t.beginn - z.minuten);
  z.minuten = t.beginn + 1; z.termineErledigt.push(t.id);                      // Lobpreis vorbei → als Nächstes der Gottesdienst
  assert.equal(naechstesEvent(z, aus(z)).name, 'Gottesdienst');
  z.laeufe.push({ id: 'x', phase: 'gottesdienst', art: 'gottesdienst' });
  assert.deepEqual(naechstesEvent(z, aus(z)), { laeuft: true, name: 'Gottesdienst' });
  // Ohne Gottesdienstraum gibt es kein Event (der Standardtermin hat keine Art)
  assert.equal(naechstesEvent(neuesSpiel(() => 0.5)), null);
  assert.equal(TEXTE.naechstesEvent('Gottesdienst', 3 * 1440 + 5), 'Nächstes Event „Gottesdienst“ in 3 Tagen');
  assert.equal(TEXTE.naechstesEvent('Gottesdienst', 1440), 'Nächstes Event „Gottesdienst“ in 1 Tag');
  assert.equal(TEXTE.naechstesEvent('Gottesdienst', 23 * 60 + 59), 'Nächstes Event „Gottesdienst“ in 23 Stunden');
  assert.equal(TEXTE.naechstesEvent('Gottesdienst', 60), 'Nächstes Event „Gottesdienst“ in 1 Stunde');
  assert.equal(TEXTE.naechstesEvent('Gottesdienst', 59), 'Nächstes Event „Gottesdienst“ in unter 1 Stunde');
}
console.log('Nächstes-Event-Test bestanden.');
