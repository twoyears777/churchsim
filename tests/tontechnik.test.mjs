// Prüft die Ton-Technik im Gottesdienstraum (Lukas, 27.11.; Spielprinzip claude/spielprinzip-tontechnik.md):
// Lautsprecher (Plätze addieren sich, egal wo), Subwoofer, Tontechnikpult, Tontechniker (Ehrenamtlicher), Skill „Tontechnik“.
// Starten mit: node tests/tontechnik.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { MOEBEL, TON } from '../src/inhalte/moebel.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel } from './hilfen/ohne-erster.mjs';
import { zeitVorruecken, veranstaltungEinstellen, prognose, gottesdienstRaeume } from '../src/kern/ablauf.js';
import { moebelSetzen, tonImRaum, tonAnteil, grenzeErreicht } from '../src/kern/moebel.js';
import { versetzen, personHinzufuegen, eingesetztIn } from '../src/kern/personen.js';
import { skillsVon, tontechnikLevel, tontechnikStand, skillLevelDazu } from '../src/kern/skills.js';
import { dienstTermine, stelleSetzen } from '../src/kern/dienst.js';
import { bausteineVon } from '../src/kern/bausteine.js';
import { anfrageOffen, raten, schliessen } from '../src/kern/seelsorge.js';
import { WOCHE_MIN } from '../src/kern/zeit.js';

const saat = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
const raumBei = (z, x, y) => { const a = aus(z); return a.liste[a.gruppe[x + y * z.w]]; };
const R = z => raumBei(z, G.x + 5, G.y + 5);
const setze = (z, art, x, y) => assert.strictEqual(moebelSetzen(z, art, G.x + x, G.y + y, G.x + x, G.y + y), 1, art);

// Gottesdienstraum mit 10 Stühlen, Pastor; genau 10 sichere Besucher (Haltung 40), keine Neuen
function gemeinde(zufall) {
  const z = neuesSpiel(zufall);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, R(z), 'gottesdienst'); veranstaltungEinstellen(z, R(z), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 15, G.y + 3);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  z.besucher = Array.from({ length: 10 }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X', level: 5, zufriedenheit: 40, kaffeeWert: 0, besuche: 0, lobpreis: 0.5 }));
  z.bekanntheit = 0; z.ortRuhig = true; z.konto = 5000;
  return z;
}
function bisNachGottesdienst(z, zufall) {
  const vorher = z.letzterGottesdienst;
  for (let i = 0; i < 2 * WOCHE_MIN / 60 && z.letzterGottesdienst === vorher; i++) {
    z.ort.leute = [];
    zeitVorruecken(z, aus(z), 60, zufall);
    if (anfrageOffen(z)) { raten(z, 0, zufall); schliessen(z); }
  }
}
const kollekte = z => z.wochenbuch.einnahmen.kollekte || 0;
const haltungen = z => z.besucher.map(b => b.zufriedenheit + 100 * (b.level - 5));
// Ton-Technik aufbauen: Pult + Lautsprecher (+ Subwoofer); Tontechniker mit Level lv am Pult (ohne Schichtbetrieb: steht im Raum)
function ton(z, { lautsprecher = 1, subwoofer = 0, techniker = true, lv = 0 } = {}) {
  setze(z, 'tonpult', 16, 7);
  for (let i = 0; i < lautsprecher; i++) setze(z, 'lautsprecher', 17, 7 - i);   // alle in einer Ecke
  for (let i = 0; i < subwoofer; i++) setze(z, 'subwoofer', 3 + i, 7);
  if (!techniker) return null;
  const ea = personHinzufuegen(z, { name: 'Toni Ton', kuerzel: 'T', art: 'ehrenamt' });
  skillLevelDazu(ea, 'tontechnik', lv);
  versetzen(z, ea, G.x + 15, G.y + 7);
  return ea;
}

// Ohne Ton-Technik: 10 Besucher am Sonntag = 20 € (Bezugswert)
const ohne = (() => { const zf = saat(3), z = gemeinde(zf); bisNachGottesdienst(z, zf); assert.strictEqual(z.letzterGottesdienst.besucher, 10); assert.strictEqual(kollekte(z), 20); return haltungen(z); })();

// Möbel: Preise, Grenzen, Skill gehört zu Ehrenamtlichen
{
  const typ = id => MOEBEL.find(m => m.id === id);
  assert.deepStrictEqual([typ('lautsprecher').kosten, typ('subwoofer').kosten, typ('tonpult').kosten], [40, 60, 80]);
  assert.deepStrictEqual([typ('lautsprecher').max, typ('subwoofer').max, typ('tonpult').max], [8, 2, 1]);
  const z = gemeinde(saat(1));
  setze(z, 'tonpult', 16, 7);
  assert.ok(grenzeErreicht(z, R(z), 'tonpult'), 'Nur 1 Tontechnikpult pro Raum');
  const ea = personHinzufuegen(z, { name: 'Neu', kuerzel: 'N', art: 'ehrenamt' });
  assert.strictEqual(skillsVon(ea).tontechnik, 0, 'Ehrenamtliche haben den Skill „Tontechnik“, Start 0');
  assert.strictEqual(skillsVon(z.personen[0]).tontechnik, undefined, 'Hauptamtliche nicht');
  assert.deepStrictEqual(tontechnikStand(ea), { level: 0, maxLevel: 10, fortschritt: 0 });
}
// Lautsprecher addieren sich, egal wo sie stehen
{
  const z = gemeinde(saat(1));
  setze(z, 'lautsprecher', 17, 7); setze(z, 'lautsprecher', 17, 6);
  assert.strictEqual(tonImRaum(z, R(z)).plaetze, 30, 'Zwei Lautsprecher in einer Ecke: 2 × 15 Personen');
  assert.strictEqual(tonAnteil({ aktiv: true, plaetze: 30 }, 40), 0.75, '30 Plätze, 40 Besucher → 75 % des Bonus');
  assert.strictEqual(tonAnteil({ aktiv: true, plaetze: 30 }, 20), 1);
  assert.strictEqual(tonAnteil({ aktiv: false, plaetze: 30 }, 20), 0);
}
// Pult + Lautsprecher, aber kein Tontechniker → kein Bonus
{
  const zf = saat(3), z = gemeinde(zf);
  ton(z, { techniker: false });
  assert.strictEqual(gottesdienstRaeume(z, aus(z))[0].ton.aktiv, false);
  bisNachGottesdienst(z, zf);
  assert.strictEqual(kollekte(z), 20);
}
// Tontechniker + Lautsprecher, aber kein Pult → kein Bonus, er ist auch nicht eingesetzt
{
  const z = gemeinde(saat(3));
  setze(z, 'lautsprecher', 17, 7);
  const ea = personHinzufuegen(z, { name: 'Toni Ton', kuerzel: 'T', art: 'ehrenamt' }); versetzen(z, ea, G.x + 15, G.y + 7);
  assert.strictEqual(eingesetztIn(z, aus(z), ea), null);
  assert.strictEqual(gottesdienstRaeume(z, aus(z))[0].ton.aktiv, false);
}
// Alles da, Level 0: Kollekte +5 % (10 × 1,05 × 2 = 21 €), Haltung +5 % (40 → +2), Prognose rechnet es mit, Erfahrung +2
{
  const zf = saat(3), z = gemeinde(zf);
  const ea = ton(z);
  const g = gottesdienstRaeume(z, aus(z))[0];
  assert.strictEqual(g.ton.aktiv, true); assert.strictEqual(g.ton.bonus, 0.05);
  assert.ok(Math.abs(prognose(z, aus(z)).kollekte - 21) < 1e-9, 'Prognose: +5 %');
  bisNachGottesdienst(z, zf);
  assert.strictEqual(kollekte(z), 21);
  haltungen(z).forEach((h, i) => assert.strictEqual(h - ohne[i], 2, 'Haltung +5 % von 40 = +2'));
  assert.strictEqual(skillsVon(ea).tontechnik, TON.erfahrungProEinsatz, 'Der Tontechniker bekommt Erfahrung');
}
// Level 10 + 2 Subwoofer: +15 % + 2 × 2 % = +19 % → 10 × 1,19 × 2 = 23,8 → 24 €
{
  const zf = saat(3), z = gemeinde(zf);
  const ea = ton(z, { subwoofer: 2, lv: 10 });
  assert.strictEqual(tontechnikLevel(ea), 10);
  assert.strictEqual(gottesdienstRaeume(z, aus(z))[0].ton.bonus, 0.19);
  bisNachGottesdienst(z, zf);
  assert.strictEqual(kollekte(z), 24);
}
// Anteilig: Lautsprecher reichen nur für 5 von 10 → halber Bonus: +9,5 % → 21,9 → 22 €
{
  const typ = MOEBEL.find(m => m.id === 'lautsprecher'), alt = typ.ton.plaetze;
  typ.ton.plaetze = 5;
  try {
    const zf = saat(3), z = gemeinde(zf);
    ton(z, { subwoofer: 2, lv: 10 });
    bisNachGottesdienst(z, zf);
    assert.strictEqual(kollekte(z), 22);
  } finally { typ.ton.plaetze = alt; }
}
// Bausteintabelle: Zeilen für Lautsprecher, Pult, Tontechniker, Subwoofer; „Zusammen“ mit Ton-Bonus
{
  const z = gemeinde(saat(3));
  ton(z, { subwoofer: 1 });
  const g = gottesdienstRaeume(z, aus(z))[0];
  const t = bausteineVon(z, g.raum, g, ['gottesdienst']).gottesdienst;
  const zeile = id => t.zeilen.find(b => b.id === id);
  assert.strictEqual(zeile('lautsprecher').plaetze, 15);
  assert.strictEqual(zeile('tonpult').imRaum, true);
  assert.strictEqual(zeile('tontechniker').aktiv, true);
  assert.strictEqual(zeile('subwoofer').anzahl, 1);
  assert.strictEqual(t.summe.haltung.ton, 7, '5 % + 2 % Subwoofer');
}
// Schichtbetrieb: Stelle „Tontechnik“ am Pult, nur Ehrenamtliche; zählt laut Dienstplan
{
  const zf = saat(3), z = gemeinde(zf);
  z.schichtbetrieb = true;
  setze(z, 'tonpult', 16, 7); setze(z, 'lautsprecher', 17, 7);
  const ea = personHinzufuegen(z, { name: 'Toni Ton', kuerzel: 'T', art: 'ehrenamt' });
  const v0 = dienstTermine(z, aus(z)).find(t => t.art === 'veranstaltung');
  const s = v0.stellen.find(x => x.code === 'ton');
  assert.ok(s, 'Mit Pult gibt es die Stelle „Tontechnik“');
  assert.strictEqual(s.wer, 'ehrenamt');
  assert.strictEqual(stelleSetzen(z, aus(z), v0.key, 'hauptamt', z.personen[0].id), 'ok');
  assert.notStrictEqual(stelleSetzen(z, aus(z), v0.key, 'ton', z.personen[0].id), 'ok', 'Hauptamtliche nicht am Pult');
  assert.strictEqual(stelleSetzen(z, aus(z), v0.key, 'ton', ea.id), 'ok');
  const g = gottesdienstRaeume(z, aus(z))[0];
  assert.strictEqual(g.techniker, ea); assert.strictEqual(g.ton.aktiv, true);
}
console.log('Ton-Technik: alle Prüfungen bestanden');
