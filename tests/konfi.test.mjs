// Prüft Jugendliche, Konfirmandenunterricht und Konfirmation (Spielprinzip von Lukas, 25.11.2026:
// claude/spielprinzip-konfirmandenunterricht.md). Logik in src/kern/konfi.js, Zahlen JUGEND/KONFI in src/inhalte/besucher.js.
// Starten mit: node tests/konfi.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { JUGEND, KONFI } from '../src/inhalte/besucher.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel, spielAnlegen, spielStarten } from '../src/kern/spiel.js';
import { zeitVorruecken, veranstaltungEinstellen, terminEinstellen, gottesdienstRaeume, prognose, terminFaktoren } from '../src/kern/ablauf.js';
import { moebelSetzen, stuhlVerbessern, moebelBei } from '../src/kern/moebel.js';
import { versetzen, personHinzufuegen } from '../src/kern/personen.js';
import { besuchChance, neuePerson } from '../src/kern/besucher.js';
import { kommendeFeste, tagAnzeige, faktorAmTag } from '../src/kern/kalender.js';
import { festSchritt, festSchluessel } from '../src/kern/feste.js';
import { istJugend, konfiStand, konfirmandenZahl, jahrgangAm, konfiMeldung } from '../src/kern/konfi.js';
import { dauerspenderSchritt } from '../src/kern/dauerspender.js';
import { bausteineVon } from '../src/kern/bausteine.js';
import { TAG_MIN } from '../src/kern/zeit.js';

const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
const raumBei = (z, x = G.x + 5, y = G.y + 5) => { const a = aus(z); return a.liste[a.gruppe[x + y * z.w]]; };
const saal = z => gottesdienstRaeume(z, aus(z)).find(g => g.typ.id === 'gemeindesaal');
const KONF = kommendeFeste(0, 40).find(f => f.id === 'konfirmation').tagNr;   // 1. Konfirmation im Spiel
const MI = 2 * TAG_MIN;   // Mittwoch der 1. Woche, 0:00

// ---- Kalender: Konfirmation am 2. Sonntag im Mai, Besucher ×5, Kollekte ×3, nur mit Konfirmanden ----
{
  assert.deepEqual(tagAnzeige(KONF), { wochentag: 6, datum: '9.5.' });           // Mai 2027: 1. Sonntag 2.5., 2. Sonntag 9.5.
  const f = kommendeFeste(0, 40).find(x => x.id === 'konfirmation');
  assert.equal(f.besucher, 5); assert.equal(f.kollekte, 3); assert.equal(f.gross, true);
  assert.equal(faktorAmTag(KONF).besucher, 5);                                     // ohne Prüfung: wie jedes Fest
  assert.equal(faktorAmTag(KONF, () => false).besucher, 1);                        // findet nicht statt: keine Faktoren
  assert.equal(jahrgangAm(0), KONF); assert.equal(jahrgangAm(KONF), KONF); assert.ok(jahrgangAm(KONF + 1) > KONF + 300);
}
console.log('Konfirmation-Kalender-Tests bestanden.');

// ---- Jugendliche: 20 % aller neuen Menschen, fest zugeteilt; alte Spielstände bekommen ihre Zuteilung ----
{
  const z = neuesSpiel(() => 0.5);
  const leute = Array.from({ length: 2000 }, () => neuePerson(z, 50, Math.random));
  const anteil = leute.filter(istJugend).length / leute.length;
  assert.ok(Math.abs(anteil - JUGEND.anteil) < 0.04, `Anteil ${anteil}`);
  assert.ok(leute.every(p => typeof p.jugend === 'boolean'));
  // alter Spielstand: Besucher ohne Angabe → jetzt zugeteilt (gleiches Ergebnis bei gleichem Namen)
  const alt = JSON.parse(JSON.stringify(z));
  delete alt.jugendVerteilt;
  alt.besucher = leute.slice(0, 200).map(p => { const q = { ...p }; delete q.jugend; return q; });
  spielAnlegen(alt);
  assert.deepEqual(alt.besucher.map(istJugend), leute.slice(0, 200).map(istJugend));
}
// Kommchance: normale Kommchance × Faktor; Erwachsene nie beim Konfirmandenunterricht
{
  const j = { id: 'j', voll: 'J', level: 5, zufriedenheit: 100, jugend: true }, e = { id: 'e', voll: 'E', level: 5, zufriedenheit: 100, jugend: false };   // Chance 100 %
  assert.equal(besuchChance(j, { art: 'gottesdienst' }), 0.5);
  assert.equal(besuchChance(j, { art: 'senioren' }), 0);
  assert.ok(Math.abs(besuchChance(j, { art: 'chorprobe' }) - 0.2) < 1e-9);
  assert.ok(Math.abs(besuchChance(j, { art: 'konfi' }) - 0.6) < 1e-9);
  assert.ok(Math.abs(besuchChance({ ...j, zufriedenheit: 50 }, { art: 'konfi' }) - 0.585) < 1e-9);   // Faktor auf die Kommchance (97,5 % × 0,6)
  assert.equal(besuchChance(e, { art: 'konfi' }), 0);
  assert.equal(besuchChance(e, { art: 'gottesdienst' }), 1);
  // Konfirmation: Konfirmanden kommen sicher
  assert.equal(besuchChance({ ...j, zufriedenheit: 10, konfirmand: true }, { art: 'gottesdienst', konfirmation: true }), 1);
}
console.log('Jugend-Tests bestanden.');

// Gemeindesaal 10 × 5 (innen) mit Tür, links daneben ein Gottesdienstraum. 2 Jugendliche, 1 Erwachsener (Haltung 100).
function gemeinde() {
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 13, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z), 'gemeindesaal');
  z.personen = z.personen.filter(p => p.id === 'pastor');
  const mensch = (i, jugend) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X', level: 5, zufriedenheit: 50, kaffeeWert: 0,
    besuche: 0, lobpreis: 0.5, jugend });
  z.besucher = [mensch(0, true), mensch(1, true), mensch(2, false)];
  z.bekanntheit = 10; z.ortRuhig = true; z.konto = 1000;
  return z;
}
const ea = (z, n) => personHinzufuegen(z, { name: 'Erna ' + n, kuerzel: 'E', art: 'ehrenamt' });

// ---- Voraussetzungen: Hauptamtlicher und mindestens 1 Stuhl ----
{
  const z = gemeinde(), fehlt = () => saal(z).programm[0].fehlt;
  veranstaltungEinstellen(z, raumBei(z), 'konfi');
  assert.equal(fehlt(), 'leitung');
  versetzen(z, z.personen[0], G.x + 4, G.y + 4);
  assert.equal(fehlt(), 'stuehle');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 5, G.x + 6, G.y + 5);
  assert.equal(fehlt(), null);
  assert.equal(saal(z).programm[0].ehrenamtBonus, 0);
  for (let i = 0; i < 4; i++) versetzen(z, ea(z, i), G.x + 4 + i, G.y + 7);
  assert.equal(saal(z).programm[0].ehrenamtBonus, 6);   // 4 Ehrenamtliche, aber höchstens 3 zählen: 3 × 2
}
console.log('Konfirmandenunterricht-Voraussetzungen-Tests bestanden.');

// ---- Ablauf: nur Jugendliche, Haltung +5 +2 je Ehrenamtlichem + Stuhlstufe, kein Sitzplatz-Plus, keine Bekanntheit, kein Geld ----
{
  const z = gemeinde(), r = raumBei(z);
  veranstaltungEinstellen(z, r, 'konfi'); terminEinstellen(z, r, 0, 2, 'nachmittag');   // Mittwoch nachmittags
  versetzen(z, z.personen[0], G.x + 4, G.y + 4);
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 5, G.x + 7, G.y + 5);
  stuhlVerbessern(z, moebelBei(z, G.x + 6, G.y + 5));                      // Polsterstuhl: + 2 Haltung
  versetzen(z, ea(z, 1), G.x + 4, G.y + 7); versetzen(z, ea(z, 2), G.x + 5, G.y + 7);
  const v = prognose(z, aus(z), saal(z).raum.nr, 0);
  assert.ok(Math.abs(v.erwartet - 1.17) < 1e-9);              // 2 Jugendliche × 97,5 % (Level 5, Haltung 50) × 0,6; Erwachsener 0; keine neuen
  assert.equal(v.geld, 0);
  zeitVorruecken(z, aus(z), MI + 15 * 60 + 61 - z.minuten, () => 0);
  const L = z.laeufe.find(x => x.art === 'konfi');
  assert.deepEqual(L.gaeste.map(g => g.id).sort(), ['t0', 't1']);   // keine neuen Besucher trotz Bekanntheit 10
  const [a, b, c] = z.besucher;
  assert.deepEqual([a.zufriedenheit, b.zufriedenheit].sort(), [59, 61]);   // +5 +4 (2 EA), einer auf dem Polsterstuhl +2
  assert.equal(c.zufriedenheit, 50);
  assert.equal(z.bekanntheit, 10); assert.equal(z.konto, 1000 - 20);   // kein Geld eingenommen, nur das Upgrade bezahlt
  assert.deepEqual(konfiStand(z, a), { anzahl: 1, von: KONFI.teilnahmen, konfirmand: false });
}
console.log('Konfirmandenunterricht-Ablauf-Tests bestanden.');

// ---- 7 Teilnahmen → Konfirmand; Fest-Menü nur mit Konfirmanden; Konfirmation macht erwachsen; neuer Jahrgang fängt bei 0 an ----
{
  const z = gemeinde(), r = raumBei(z);
  veranstaltungEinstellen(z, r, 'konfi'); terminEinstellen(z, r, 0, 2, 'nachmittag');
  versetzen(z, z.personen[0], G.x + 4, G.y + 4);
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 5, G.x + 7, G.y + 5);
  z.besucher[0].zufriedenheit = 100;                            // T0 kommt: 100 % × 0,6 = 60 % → bei Zufall 0,5 immer
  z.besucher[1].zufriedenheit = 0; z.besucher[1].level = 1;    // T1 kommt nie: 30 % × 0,6 = 18 %
  zeitVorruecken(z, aus(z), 6 * 7 * TAG_MIN + MI + 15 * 60 + 61 - z.minuten, () => 0.5);   // 7 Mittwoche
  const [a, b] = z.besucher;
  assert.equal(konfiStand(z, a).anzahl, 7); assert.equal(a.konfirmand, true);
  assert.equal(konfiStand(z, b).anzahl, 0); assert.equal(konfirmandenZahl(z), 1);
  assert.equal(konfiMeldung(z).code, 'konfirmand'); assert.equal(konfiMeldung(z).name, 'T0 X');
  // Faktoren am Konfirmationstag: mit Konfirmanden ja, ohne nein
  const t = { woche: Math.floor(KONF / 7), plan: { tag: KONF % 7, slot: 'vormittag' } };
  assert.equal(terminFaktoren(t, z).besucher, 5);
  assert.equal(terminFaktoren(t, gemeinde()).besucher, 1);
  // Fest-Menü 7 Tage vorher: mit Konfirmanden öffnet es sich ...
  const k = festSchluessel('konfirmation', KONF);
  z.minuten = (KONF - 8) * TAG_MIN; z.feste.anfrage = null;   // (Heiligabend-Menü der ersten Wochen schließen)
  z.feste.gefragt = kommendeFeste(0, 40).filter(f => f.gross && f.id !== 'konfirmation').map(f => festSchluessel(f.id, f.tagNr));
  const s = festSchritt(z); s.tun(z);
  assert.equal(z.feste.anfrage, k);
  // ... ohne Konfirmanden nicht – stattdessen die Meldung
  const leer = gemeinde();
  leer.minuten = z.minuten; leer.feste.gefragt = [...z.feste.gefragt].filter(x => x !== k);
  // Kirchenjahr-Fenster vor der Prüfung: 0 Konfirmanden, aber noch kein „fällt aus“ (es kann noch jemand 7-mal kommen); planen geht nicht
  const vorher = spielStarten(JSON.stringify({ version: 3, zustand: leer }), () => 0.5).kirchenjahrInfo().feste.find(f => f.id === 'konfirmation');
  assert.equal(vorher.konfirmanden, 0); assert.equal(vorher.faelltAus, false); assert.equal(vorher.planbar, false);
  festSchritt(leer).tun(leer);
  assert.equal(leer.feste.anfrage, null); assert.ok(leer.feste.gefragt.includes(k));
  assert.equal(konfiMeldung(leer).code, 'keineKonfirmanden');
  // nach der Prüfung: fällt aus
  assert.equal(spielStarten(JSON.stringify({ version: 3, zustand: leer }), () => 0.5).kirchenjahrInfo().feste.find(f => f.id === 'konfirmation').faelltAus, true);
  // Konfirmation im Gottesdienstraum planen (über die Schalterwand) und ablaufen lassen
  wandRechteck(z, G.x + 15, G.y + 2, G.x + 31, G.y + 8); tuerUmschalten(z, G.x + 15, G.y + 5);
  typZuweisen(z, raumBei(z, G.x + 20, G.y + 5), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 20, G.y + 3, G.x + 24, G.y + 3);
  const spiel = spielStarten(JSON.stringify({ version: 3, zustand: z }), () => 0.5);
  const m = spiel.festMenueInfo(k);
  assert.equal(m.konfirmanden, 1);
  assert.equal(spiel.kirchenjahrInfo().feste.find(f => f.id === 'konfirmation').konfirmanden, 1);
  const z2 = JSON.parse(spiel.speicherText()).zustand;
  z2.feste.anfrage = null;
  const gd = aus(z2).liste.find(x => x.typ && x.typ.id === 'gottesdienst');
  z2.feste.plaene[k] = { slot: 'vormittag', raum: Math.min(...gd.zellen), leitung: 'pastor', art: 'gottesdienst', ehrenamt: [] };
  versetzen(z2, z2.personen[0], G.x + 18, G.y + 5);
  z2.besucher[0].zufriedenheit = 0;                             // kommt trotzdem: Konfirmanden kommen sicher
  zeitVorruecken(z2, aus(z2), KONF * TAG_MIN + 10 * 60 + 181 - z2.minuten, () => 0.99);
  const fest = z2.laeufe.find(x => x.fest === k);
  assert.ok(fest && !fest.ausgefallen); assert.ok(fest.gaeste.some(g => g.id === 't0'));
  const a2 = z2.besucher.find(x => x.id === 't0');
  assert.equal(istJugend(a2), false); assert.equal(a2.konfirmand, undefined);
  assert.equal(konfiMeldung(z2).code, 'konfirmiert'); assert.equal(konfiMeldung(z2).name, 1);
  // neuer Jahrgang: T1 hatte 0, alle anderen Zähler fangen neu an
  assert.equal(konfiStand(z2, z2.besucher.find(x => x.id === 't1')).anzahl, 0);
}
console.log('Konfirmation-Tests bestanden.');

// ---- Dauerspender: nur Erwachsene ----
{
  const z = neuesSpiel(() => 0.5);
  z.besucher = [{ id: 'j', voll: 'J', level: 3, zufriedenheit: 90, jugend: true, besuche: 0 }, { id: 'e', voll: 'E', level: 3, zufriedenheit: 90, jugend: false, besuche: 0 }];
  z.ort.leute = [];
  dauerspenderSchritt(z, () => 0).tun(z);
  assert.deepEqual(Object.keys(z.dauerspende.spender), ['e']);
  z.besucher[0].jugend = false;                                // nach der Konfirmation
  dauerspenderSchritt(z, () => 0).tun(z);
  assert.deepEqual(Object.keys(z.dauerspende.spender).sort(), ['e', 'j']);
}
console.log('Dauerspender-Jugend-Tests bestanden.');

// ---- Bausteintabelle: Zeilen des Konfirmandenunterrichts, Ehrenamt-Spalte ----
{
  const z = gemeinde(), r = raumBei(z);
  versetzen(z, z.personen[0], G.x + 4, G.y + 4);
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 5, G.x + 8, G.y + 5);
  versetzen(z, ea(z, 1), G.x + 4, G.y + 7); versetzen(z, ea(z, 2), G.x + 5, G.y + 7);
  const t = bausteineVon(z, r, saal(z), ['konfi']).konfi;
  assert.deepEqual(t.zeilen.map(x => x.id), ['hauptamtKonfi', 'stuehlePflicht', 'besserStuhl', 'ehrenamtKonfi']);
  assert.equal(t.zeilen[0].jugendProzent, 60); assert.equal(t.zeilen[0].veranstaltung, 5);
  assert.deepEqual([t.zeilen[3].anzahl, t.zeilen[3].max, t.zeilen[3].jeEhrenamt], [2, 3, 2]);
  assert.equal(t.summe.bereit, true); assert.equal(t.summe.ehrenamt, 4); assert.equal(t.summe.haltung.fest, 5);
  assert.deepEqual(t.summe.besucher, { art: 'plaetze', plaetze: 3 });
}
console.log('Konfirmandenunterricht-Bausteintabelle-Tests bestanden.');
