// Prüft die Gemeindemitglieder (Spielprinzip von Lukas, 27.11.2026): Mitglied werden nach dem Gottesdienst ab Level 3 (10 %),
// höhere Chance zu kommen (+20 %), Beitrag am 1. des Monats um 8:00, Haltung je nach Beitragshöhe,
// Kündigen Sonntag 24:00 (Level 2: 30 %, Level 1: 70 %), Anzeige über mitgliederInfo() (Menü „Mitglieder“, 27.11.)/besucherInfo()/menschen().
// Starten mit: node tests/mitglieder.test.mjs
import assert from 'node:assert';
import { MITGLIED } from '../src/inhalte/finanzen.js';
import { SPEICHER_VERSION } from '../src/kern/spiel.js';
import { neuesSpiel, spielStarten } from './hilfen/ohne-erster.mjs';
import { mitgliedWerden, mitgliederSchritt, beitragHaltung, beitragSetzen, mitgliederListe } from '../src/kern/mitglieder.js';
import { kommChance } from '../src/kern/besucher.js';
import { tagDatum } from '../src/kern/kalender.js';
import { TAG_MIN, zeitpunkt } from '../src/kern/zeit.js';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { zeitVorruecken, veranstaltungEinstellen, terminEinstellen, termineDerWoche } from '../src/kern/ablauf.js';
import { moebelSetzen } from '../src/kern/moebel.js';
import { versetzen } from '../src/kern/personen.js';

assert.deepEqual(MITGLIED, { abLevel: 3, chance: 0.10, kommBonus: 0.20, kuendigung: { 1: 0.70, 2: 0.30 },
  beitragStart: 10, beitragMin: 0, beitragMax: 50, beitragSchritt: 5, neutral: 10, haltungMehr: -3, haltungWeniger: 2, stunde: 8, verlaufWochen: 8 });

const folge = werte => { let i = 0; return () => werte[i++ % werte.length]; };
// Nächsten Schritt der Mitglieder ausführen und zurückgeben, wann er war
function schritt(z, zufall = () => 0.99) { const s = mitgliederSchritt(z, zufall); z.minuten = s.zeit; s.tun(z); return zeitpunkt(s.zeit); }

// Mitglied werden: nur Erwachsene ab Level 3, 10 % Chance; wer schon Mitglied ist, würfelt nicht
{
  const z = neuesSpiel(() => 0.5);
  const a = { id: 'a', voll: 'Anna A', level: 3, zufriedenheit: 0 }, b = { id: 'b', voll: 'Ben B', level: 2, zufriedenheit: 99 },
    c = { id: 'c', voll: 'Cora C', level: 5, zufriedenheit: 50 }, j = { id: 'j', voll: 'Jan J', level: 4, zufriedenheit: 50, jugend: true };
  const neu = mitgliedWerden(z, [a, b, c, j], 3, folge([0.09, 0.10]));   // Anna 0,09 (wird), Cora 0,10 (wird nicht)
  assert.deepEqual(neu.map(x => x.id), ['a']);
  assert.deepEqual(a.mitglied, { seit: 3 }); assert.equal(b.mitglied, undefined); assert.equal(c.mitglied, undefined); assert.equal(j.mitglied, undefined);
  mitgliedWerden(z, [a], 4, () => 0); assert.deepEqual(a.mitglied, { seit: 3 });   // bleibt
  // Mitglieder kommen öfter: +20 Prozentpunkte
  const ohne = kommChance({ level: 3, zufriedenheit: 50 }), mit = kommChance({ level: 3, zufriedenheit: 50, mitglied: { seit: 0 } });
  assert.ok(Math.abs(mit - ohne - 0.2) < 1e-9);
}

// Beitragshöhe → Haltung je Abbuchung
assert.equal(beitragHaltung(10), 0); assert.equal(beitragHaltung(15), -3); assert.equal(beitragHaltung(50), -24);
assert.equal(beitragHaltung(5), 2); assert.equal(beitragHaltung(0), 4);

// Beitrag am 1. des Monats um 8:00, Kassenbuch, Haltung; Beitrag einstellen
{
  const z = neuesSpiel(() => 0.5);
  z.ort.leute = [];
  z.besucher = [{ id: 'm', voll: 'Mia M', level: 3, zufriedenheit: 50, mitglied: { seit: 0 } }, { id: 'n', voll: 'Nils N', level: 3, zufriedenheit: 50 }];
  assert.equal(z.mitglieder.beitrag, 10);
  assert.equal(beitragSetzen(z, 7), 'ungueltig'); assert.equal(beitragSetzen(z, 55), 'ungueltig'); assert.equal(beitragSetzen(z, -5), 'ungueltig');
  assert.equal(beitragSetzen(z, 20), 'ok');
  // Kündigungs-Schritte (Sonntag 24:00) überspringen, bis die Abbuchung kommt
  const konto = z.konto;
  let t;
  for (let i = 0; i < 10; i++) { t = schritt(z); if (z.konto !== konto) break; }
  const d = new Date(tagDatum(Math.floor(z.minuten / TAG_MIN)));
  assert.equal(d.getUTCDate(), 1); assert.equal(t.stunde, 8); assert.equal(t.minute, 0);
  assert.equal(z.konto, konto + 20);                      // nur Mia ist Mitglied
  assert.equal(z.wochenbuch.einnahmen.mitglied, 20);
  assert.equal(z.besucher[0].zufriedenheit, 44);          // 20 € = 2 Schritte über 10 € → −6
  assert.equal(z.besucher[1].zufriedenheit, 50);
  // Im selben Monat keine zweite Abbuchung
  const k2 = z.konto;
  for (let i = 0; i < 3; i++) schritt(z);
  assert.equal(z.konto, k2);
  // Beitrag 0 €: keine Buchung, aber +4 Haltung
  beitragSetzen(z, 0);
  const monat = z.mitglieder.monat;
  for (let i = 0; i < 10 && z.mitglieder.monat === monat; i++) schritt(z);
  assert.notEqual(z.mitglieder.monat, monat);
  assert.equal(z.konto, k2);
  assert.equal(z.besucher[0].zufriedenheit, 48);
}

// Kündigen: Sonntag 24:00 nach Level – Level 3 nie, Level 2 mit 30 %, Level 1 mit 70 %
{
  const z = neuesSpiel(() => 0.5);
  z.ort.leute = [];
  const L3 = { id: 'x', voll: 'X', level: 3, zufriedenheit: 1, mitglied: { seit: 0 } }, L2a = { id: 'y', voll: 'Y', level: 2, zufriedenheit: 99, mitglied: { seit: 0 } },
    L2b = { id: 'v', voll: 'V', level: 2, zufriedenheit: 0, mitglied: { seit: 0 } }, L1 = { id: 'w', voll: 'W', level: 1, zufriedenheit: 99, mitglied: { seit: 0 } };
  z.besucher = [L3, L2a, L2b, L1];
  // Abbuchung ggf. vorher abwarten, dann genau den Wochen-Schritt ausführen
  let t;
  do { t = schritt(z, folge([0.29, 0.31, 0.69])); } while (!(t.tag === 0 && t.stunde === 0 && t.minute === 0));
  assert.ok(L3.mitglied);                  // Level 3: nie (wird nicht einmal gewürfelt)
  assert.equal(L2a.mitglied, undefined);   // 0,29 < 0,30 → kündigt (Haltung im Level egal)
  assert.ok(L2b.mitglied);                 // 0,31 → bleibt
  assert.equal(L1.mitglied, undefined);    // 0,69 < 0,70 → kündigt
}
{
  const z = neuesSpiel(() => 0.5);
  z.ort.leute = [];
  const L1 = { id: 'w', voll: 'W', level: 1, zufriedenheit: 99, mitglied: { seit: 0 } };
  z.besucher = [L1];
  let t;
  do { t = schritt(z, () => 0.69); } while (!(t.tag === 0 && t.stunde === 0 && t.minute === 0));
  assert.equal(L1.mitglied, undefined);    // Level 1: 70 %
  // Wer gekündigt hat, ist normaler Besucher und kann wieder Mitglied werden
  L1.level = 3; mitgliedWerden(z, [L1], 9, () => 0); assert.deepEqual(L1.mitglied, { seit: 9 });
}

// Anzeige: mitgliederInfo (Menü „Mitglieder“, 27.11.), besucherInfo, menschen; Befehl mitgliedsbeitragSetzen; alter Spielstand legt sich an.
// Die Finanzen bekommen keine Mitglieder-Daten mehr – nur die Kategorie „Mitgliedsbeiträge“.
{
  const z = neuesSpiel(() => 0.5);
  z.ort.leute = [];
  z.besucher = [{ id: 'm', voll: 'Mia M', vorname: 'Mia', level: 4, zufriedenheit: 30, besuche: 5, mitglied: { seit: 2 } },
    { id: 'n', voll: 'Nils N', vorname: 'Nils', level: 2, zufriedenheit: 10, besuche: 5, mitglied: { seit: 3 } }];
  delete z.mitglieder;
  const spiel = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0);
  let m = spiel.mitgliederInfo();
  assert.deepEqual(m.liste.map(x => [x.name, x.seit, x.level, x.haltung, x.kuendigung]), [['Mia M', 3, 4, 30, 0], ['Nils N', 4, 2, 10, 30]]);
  assert.equal(m.anzahl, 2); assert.equal(m.proMonat, 20);
  assert.equal(m.beitrag.betrag, 10); assert.equal(m.beitrag.haltung, 0);
  assert.equal(m.regeln.kuendigung[1], 70); assert.equal(m.regeln.chance, 10);
  assert.equal(m.verlauf.length, 1); assert.ok(m.verlauf[0].jetzt); assert.equal(m.verlauf[0].anzahl, 2);
  const f = spiel.finanzInfo();
  assert.equal(f.namen.einnahmen.mitglied, 'Mitgliedsbeiträge');
  assert.equal(f.mitglieder, undefined); assert.equal(f.mitgliedsbeitrag, undefined);
  assert.equal(spiel.mitgliedsbeitragSetzen(25), 'ok');
  m = spiel.mitgliederInfo(); assert.equal(m.beitrag.betrag, 25); assert.equal(m.beitrag.haltung, -9); assert.equal(m.proMonat, 50);
  assert.equal(spiel.besucherInfo('m').mitglied, 3);
  assert.equal(spiel.menschen().find(x => x.id === 'm').mitglied, true);
}

// Verlauf (27.11.): am Ende jeder Woche (nach den Kündigungen) wird die Mitgliederzahl gemerkt, höchstens 8 Wochen
{
  const z = neuesSpiel(() => 0.5);
  z.ort.leute = [];
  z.besucher = [{ id: 'a', voll: 'A', level: 3, zufriedenheit: 50, mitglied: { seit: 0 } }, { id: 'b', voll: 'B', level: 1, zufriedenheit: 50, mitglied: { seit: 0 } }];
  let t;
  do { t = schritt(z, () => 0.5); } while (!(t.tag === 0 && t.stunde === 0 && t.minute === 0));   // B (Level 1, 0,5 < 0,7) kündigt
  assert.deepEqual(z.mitglieder.verlauf.map(p => p.anzahl), [1]);
  for (let i = 0; i < 40; i++) schritt(z, () => 0.99);
  assert.equal(z.mitglieder.verlauf.length, 8);
  const ws = z.mitglieder.verlauf.map(p => p.woche);
  assert.deepEqual(ws, ws.map((_, i) => ws[0] + i), 'Wochen lückenlos');
}

// Im echten Ablauf: nach einem Gottesdienst werden Anwesende ab Level 3 Mitglied (Würfel 0,05 < 10 %), Level 2 nicht
{
  const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
  const raumBei = z => { const a = aus(z); return a.liste[a.gruppe[G.x + 5 + (G.y + 5) * z.w]]; };
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 10); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z), 'gottesdienst');
  z.personen = z.personen.filter(p => p.id === 'pastor');
  z.besucher = Array.from({ length: 4 }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X',
    level: i ? 4 : 2, zufriedenheit: 50, kaffeeWert: 0, besuche: 0, lobpreis: 0.5 }));
  z.bekanntheit = 0; z.ortRuhig = true; z.konto = 1000;
  veranstaltungEinstellen(z, raumBei(z), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 12, G.y + 3);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  assert.equal(terminEinstellen(z, raumBei(z), 0, 1, 'abend'), 'ok');
  const t = termineDerWoche(z, aus(z), 0).find(x => x.art === 'gottesdienst');
  z.minuten = TAG_MIN + 12 * 60;
  while (z.minuten < t.beginn + 3 * 60) zeitVorruecken(z, aus(z), 5, () => 0.05);
  const da = z.besucher.filter(b => b.besuche > 0);
  assert.ok(da.length >= 2, 'Gottesdienst hat stattgefunden');
  for (const b of da) assert.equal(!!b.mitglied, (b.level || 1) >= 3, b.voll);
}

console.log('Gemeindemitglieder: alle Tests bestanden');
