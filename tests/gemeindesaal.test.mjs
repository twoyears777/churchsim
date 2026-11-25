// Prüft den Gemeindesaal (Lukas, 25.11.): Raum, Voraussetzungen von Seniorennachmittag und Kirchenchorprobe,
// Ablauf (Haltung, spontane Spende, kein Kirchkaffee, keine Kollekte), Ausfall und Prognose.
// Starten mit: node tests/gemeindesaal.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel } from '../src/kern/spiel.js';
import { zeitVorruecken, veranstaltungEinstellen, terminEinstellen, programmVon, gottesdienstRaeume, termineDerWoche, prognose,
  naechsteKaffeeOeffnung } from '../src/kern/ablauf.js';
import { moebelSetzen } from '../src/kern/moebel.js';
import { versetzen, personHinzufuegen, eingesetztIn } from '../src/kern/personen.js';
import { TAG_MIN } from '../src/kern/zeit.js';

const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
const raumBei = z => { const a = aus(z); return a.liste[a.gruppe[G.x + 5 + (G.y + 5) * z.w]]; };
const saal = z => gottesdienstRaeume(z, aus(z)).find(g => g.typ.id === 'gemeindesaal');
const MI = 2 * TAG_MIN;

// Gemeindesaal 10 × 5 (innen) mit Tür; ohne Gottesdienstraum. Pastor und eine Ehrenamtliche stehen draußen.
function gemeinde() {
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 13, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z), 'gemeindesaal');
  z.personen = z.personen.filter(p => p.id === 'pastor');
  z.besucher = Array.from({ length: 4 }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X',
    level: 5, zufriedenheit: 100, kaffeeWert: 1, besuche: 0, lobpreis: 0.5 }));
  z.bekanntheit = 0; z.ortRuhig = true; z.konto = 1000;
  return z;
}
const ea = z => z.personen.find(p => p.daten && p.daten.art === 'ehrenamt') || personHinzufuegen(z, { name: 'Erna', kuerzel: 'E', art: 'ehrenamt' });

// Raum: mindestens 5 × 10, braucht eine Tür, 2 Veranstaltungen von Anfang an frei
{
  const z = gemeinde();
  assert.deepEqual(raumBei(z).probleme, []);
  assert.equal(raumBei(z).typ.name, 'Gemeindesaal');
  assert.deepEqual(saal(z).programm.map(p => p.frei), [true, true]);
  const klein = neuesSpiel(() => 0.5);
  wandRechteck(klein, G.x + 2, G.y + 2, G.x + 12, G.y + 8); tuerUmschalten(klein, G.x + 2, G.y + 5);   // nur 9 × 5
  typZuweisen(klein, raumBei(klein), 'gemeindesaal');
  assert.ok(raumBei(klein).probleme.includes('groesse'));
  const ohneTuer = neuesSpiel(() => 0.5);
  wandRechteck(ohneTuer, G.x + 2, G.y + 2, G.x + 13, G.y + 8);
  typZuweisen(ohneTuer, raumBei(ohneTuer), 'gemeindesaal');
  assert.ok(raumBei(ohneTuer).probleme.length > 0);
  // Ehrenamtliche zählen im Gemeindesaal als eingesetzt (auch ohne Instrument)
  const e = ea(z); versetzen(z, e, G.x + 5, G.y + 4);
  assert.equal(eingesetztIn(z, aus(z), e).typ.id, 'gemeindesaal');
  // Keine Veranstaltung eingestellt: kein Termin im Gemeindesaal (fällt also auch nicht aus)
  assert.ok(termineDerWoche(z, aus(z), 0).every(t => t.raum === null));
}
console.log('Gemeindesaal-Raum-Tests bestanden.');

// Seniorennachmittag: Hauptamtlicher UND Ehrenamtlicher, Tisch, mindestens 2 Stühle
{
  const z = gemeinde(), fehlt = () => saal(z).programm[0].fehlt;
  veranstaltungEinstellen(z, raumBei(z), 'senioren');
  assert.equal(fehlt(), 'leitung');
  versetzen(z, z.personen[0], G.x + 4, G.y + 4);
  assert.equal(fehlt(), 'ehrenamt');
  versetzen(z, ea(z), G.x + 5, G.y + 4);
  assert.equal(fehlt(), 'tisch');
  moebelSetzen(z, 'tisch', G.x + 8, G.y + 5, G.x + 8, G.y + 5);
  assert.equal(fehlt(), 'stuehle');
  moebelSetzen(z, 'stuhl', G.x + 9, G.y + 5, G.x + 9, G.y + 5);
  assert.equal(fehlt(), 'stuehle');
  moebelSetzen(z, 'stuhl', G.x + 7, G.y + 5, G.x + 7, G.y + 5);
  assert.equal(fehlt(), null);
  assert.equal(saal(z).programm[0].leitung.id, 'pastor');
}
console.log('Seniorennachmittag-Voraussetzungen bestanden.');

// Kirchenchorprobe: Ehrenamtlicher mit Musik-Level ab 1 und Klavier
{
  const z = gemeinde(), fehlt = () => saal(z).programm[1].fehlt;
  veranstaltungEinstellen(z, raumBei(z), 'chorprobe', 1);
  assert.equal(fehlt(), 'ehrenamt');
  versetzen(z, z.personen[0], G.x + 4, G.y + 4);
  assert.equal(fehlt(), 'ehrenamt');            // der Pastor reicht nicht
  const e = ea(z); versetzen(z, e, G.x + 5, G.y + 4);
  assert.equal(fehlt(), 'musikLevel');          // Level 0
  e.musikErfahrung = 300;                        // Level 3
  assert.equal(fehlt(), 'klavier');
  moebelSetzen(z, 'klavier', G.x + 10, G.y + 3, G.x + 10, G.y + 3);
  assert.equal(fehlt(), null);
  assert.equal(saal(z).programm[1].leitung, e);
  assert.equal(saal(z).programm[1].musikBonus, 0.08);   // 5 % + 3 × 1 %
}
console.log('Kirchenchorprobe-Voraussetzungen bestanden.');

// Seniorennachmittag läuft: 2 Stühle → 2 sitzen, 2 müssen heim. Haltung +5 (Platz) +5 (Seniorennachmittag),
// Heimgeschickte −15. Spende: Zufall 0,05 → jeder Sitzende spendet 1 €. Keine Kollekte, kein Kirchkaffee.
{
  const z = gemeinde(), r = raumBei(z);
  versetzen(z, z.personen[0], G.x + 4, G.y + 4); versetzen(z, ea(z), G.x + 5, G.y + 4);
  moebelSetzen(z, 'tisch', G.x + 8, G.y + 5, G.x + 8, G.y + 5);
  moebelSetzen(z, 'stuhl', G.x + 7, G.y + 5, G.x + 7, G.y + 5); moebelSetzen(z, 'stuhl', G.x + 9, G.y + 5, G.x + 9, G.y + 5);
  veranstaltungEinstellen(z, r, 'senioren');
  assert.equal(terminEinstellen(z, raumBei(z), 0, 2, 'nachmittag'), 'ok');
  for (const b of z.besucher) b.zufriedenheit = 50;
  assert.equal(naechsteKaffeeOeffnung(z, aus(z), raumBei(z)), null);   // nach dem Seniorennachmittag öffnet kein Kirchkaffee
  const konto = z.konto, bek = z.bekanntheit;
  zeitVorruecken(z, aus(z), MI + 15 * 60 + 61 - z.minuten, () => 0.05);
  const L = z.laeufe.find(l => l.art === 'senioren');
  assert.equal(L.phase, 'ende'); assert.ok(!L.ausgefallen);
  assert.equal(L.gaeste.filter(g => g.sitz).length, 2);
  const haltungen = z.besucher.map(b => b.zufriedenheit).sort((a, b) => a - b);
  assert.deepEqual(haltungen, [35, 35, 60, 60]);
  assert.equal(z.konto - konto, 2);                          // 2 × 1 € spontane Spende
  assert.equal(z.wochenbuch.einnahmen.spende, 2);
  assert.equal(z.wochenbuch.einnahmen.kollekte, undefined);
  assert.equal(z.bekanntheit - bek, 0.6);
  assert.equal(z.letzterGottesdienst, undefined);            // zählt nicht als Gottesdienst
}
console.log('Seniorennachmittag-Ablauf bestanden.');

// Kirchenchorprobe läuft: Stühle egal – alle kommen hinein. Haltung +5 (Platz) + Musik-Bonus × Haltung; Ehrenamtliche sammelt Erfahrung.
{
  const z = gemeinde(), r = raumBei(z), e = ea(z);
  versetzen(z, e, G.x + 5, G.y + 4); e.musikErfahrung = 100;   // Level 1 → 6 %
  moebelSetzen(z, 'klavier', G.x + 10, G.y + 3, G.x + 10, G.y + 3);
  veranstaltungEinstellen(z, r, 'chorprobe');
  terminEinstellen(z, raumBei(z), 0, 2, 'abend');
  for (const b of z.besucher) b.zufriedenheit = 50;
  const p = prognose(z, aus(z), raumBei(z).nr, 0);
  assert.equal(p.plaetze, null); assert.equal(p.bereit, true);
  assert.ok(Math.abs(p.geld - p.sitzend * 0.1 * 2) < 1e-9);
  zeitVorruecken(z, aus(z), MI + 19 * 60 + 61 - z.minuten, () => 0.3);   // Zufall 0,3: alle kommen, keine Spende
  const L = z.laeufe.find(l => l.art === 'chorprobe');
  assert.ok(!L.ausgefallen);
  assert.ok(L.gaeste.length === 4 && L.gaeste.every(g => g.sitz));
  assert.deepEqual(z.besucher.map(b => b.zufriedenheit), [58, 58, 58, 58]);   // 50 + 5 + round(50 × 0,06)
  assert.equal(e.musikErfahrung, 102);
  assert.equal(z.wochenbuch.einnahmen.spende, undefined);
}
console.log('Kirchenchorprobe-Ablauf bestanden.');

// Ausfall: Seniorennachmittag ohne Mitarbeiter → fällt aus, alle Besucher −5
{
  const z = gemeinde();
  veranstaltungEinstellen(z, raumBei(z), 'senioren');
  terminEinstellen(z, raumBei(z), 0, 2, 'vormittag');
  for (const b of z.besucher) b.zufriedenheit = 50;
  zeitVorruecken(z, aus(z), MI + 10 * 60 + 1 - z.minuten, () => 0.5);
  const L = z.laeufe.find(l => l.art === 'senioren');
  assert.equal(L.ausgefallen, true); assert.equal(L.grund, 'leitung');
  assert.deepEqual(z.besucher.map(b => b.zufriedenheit), [45, 45, 45, 45]);
}
console.log('Gemeindesaal-Ausfall bestanden.');
