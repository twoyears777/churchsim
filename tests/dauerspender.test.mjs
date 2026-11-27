// Prüft die Dauerspender (Spielprinzip von Lukas, 25.11.2026, Zahlen 27.11.): Montag 8:00, ab Haltungslevel 3, 5 % Chance,
// 20 € sofort, +1 € pro Woche bis 100 €, Einblendung bei neuem Dauerspender, Prüfung nur montags, Neubeginn bei 5 €, Anzeige über finanzInfo().
// Starten mit: node tests/dauerspender.test.mjs
import assert from 'node:assert';
import { DAUERSPENDE } from '../src/inhalte/finanzen.js';
import { SPEICHER_VERSION } from '../src/kern/spiel.js';
import { neuesSpiel, spielStarten } from './hilfen/ohne-erster.mjs';   // ohne ersten Gottesdienst (26.11.)
import { zeitVorruecken } from '../src/kern/ablauf.js';
import { erkenneRaeume, raumTypVon, pruefeRaum } from '../src/kern/karte.js';
import { dauerspenderSchritt, dauerspenderListe } from '../src/kern/dauerspender.js';
import { WOCHE_MIN, zeitpunkt } from '../src/kern/zeit.js';

assert.deepEqual(DAUERSPENDE, { abLevel: 3, chance: 0.05, start: 20, steigerung: 1, max: 100, stunde: 8 });

// Hilfen: Zufall aus einer Liste; nächster Montag 8:00 ausführen
const folge = werte => { let i = 0; return () => werte[i++ % werte.length]; };
function montag(z, zufall) {
  const s = dauerspenderSchritt(z, zufall);
  assert.equal(zeitpunkt(s.zeit).tag, 0); assert.equal(zeitpunkt(s.zeit).stunde, 8); assert.equal(zeitpunkt(s.zeit).minute, 0);
  z.minuten = s.zeit; s.tun(z);
}
const spende = (z, id) => (z.dauerspende.spender[id] || {}).betrag ?? null;

{
  const z = neuesSpiel(() => 0.5);
  z.ort.leute = [];
  z.besucher = [
    { id: 'a', voll: 'Anna A', level: 3, zufriedenheit: 0, besuche: 1 },    // genau Level 3 zählt
    { id: 'b', voll: 'Ben B', level: 2, zufriedenheit: 99, besuche: 1 },    // zu wenig
    { id: 'c', voll: 'Cora C', level: 4, zufriedenheit: 50, besuche: 1 }
  ];
  z.ort.leute.push({ id: 'p', voll: 'Paul P', level: 3, zufriedenheit: 40, besuche: 0 });   // Passanten zählen auch
  const konto = z.konto;
  // Würfel: Anna 0,01 (wird), Cora 0,06 (wird nicht, ≥ 0,05), Paul 0,049 (wird)
  montag(z, folge([0.01, 0.06, 0.049]));
  assert.equal(spende(z, 'a'), 20); assert.equal(spende(z, 'b'), null); assert.equal(spende(z, 'c'), null); assert.equal(spende(z, 'p'), 20);
  assert.equal(z.konto, konto + 40);                                     // erste Spende kommt sofort
  assert.equal(z.wochenbuch.einnahmen.dauerspende, 40);
  assert.equal(z.dauerspende.meldung.code, 'neuerDauerspender');        // Einblendung (27.11.)
  assert.equal(z.wochenbuch.buchungen.filter(b => b.kategorie === 'dauerspende').length, 2);

  // Nächste Woche: Anna steigt auf 21 €, Cora bekommt eine neue Chance
  montag(z, folge([0.0]));
  assert.equal(spende(z, 'a'), 21); assert.equal(spende(z, 'p'), 21); assert.equal(spende(z, 'c'), 20);

  // Level sinkt unter der Woche kurz, ist montags aber wieder 3 → bleibt (nur montags geprüft)
  z.besucher[0].level = 2; z.besucher[0].level = 3;
  // Paul fällt unter Level 3 → Dauerspende endet, keine Spende
  z.ort.leute[0].level = 2;
  const vorher = z.konto;
  montag(z, folge([0.9]));                                               // 0,9: Paul würde ohnehin nicht neu würfeln (unter Level 3)
  assert.equal(spende(z, 'a'), 22); assert.equal(spende(z, 'c'), 21); assert.equal(spende(z, 'p'), null);
  assert.equal(z.konto, vorher + 43);

  // Paul wieder auf Level 3 → beginnt wieder bei 20 €
  z.ort.leute[0].level = 3;
  montag(z, folge([0.0]));
  assert.equal(spende(z, 'p'), 20); assert.equal(spende(z, 'a'), 23);

  // Höchstens 100 €
  for (let i = 0; i < 100; i++) montag(z, folge([0.0]));
  assert.equal(spende(z, 'a'), 100); assert.equal(spende(z, 'c'), 100);

  // Liste: höchster Betrag zuerst, nächster Betrag, Haltung und Level
  const L = dauerspenderListe(z);
  assert.deepEqual(L.map(d => d.id), ['a', 'c', 'p']);
  assert.equal(L[0].naechster, 100); assert.equal(L[2].naechster, Math.min(100, L[2].betrag + 1)); assert.equal(L[0].haltung, 0); assert.equal(L[0].level, 3);
}

// Wer nicht mehr da ist (z. B. Ehrenamtlich geworden), spendet nicht mehr
{
  const z = neuesSpiel(() => 0.5);
  z.ort.leute = []; z.besucher = [{ id: 'x', voll: 'Xaver X', level: 3, zufriedenheit: 90, besuche: 3 }];
  montag(z, () => 0);
  assert.equal(spende(z, 'x'), 20);
  z.besucher = [];
  montag(z, () => 0);
  assert.equal(spende(z, 'x'), null);
}

// Im laufenden Spiel: Spende kommt genau Montag 8:00, nicht vorher; Abfrage finanzInfo() liefert Liste und Kassenbuch-Namen
{
  const z = neuesSpiel(() => 0.5);
  z.ortRuhig = true; z.ort.leute = [];
  z.besucher = [{ id: 'k', voll: 'Karla K', level: 5, zufriedenheit: 100, besuche: 2 }];
  const w = zeitpunkt(z.minuten).woche, montag8 = (w + 1) * WOCHE_MIN + 8 * 60;
  const { raeume: liste, gruppe } = erkenneRaeume(z);
  for (const r of liste) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); }
  const raeume = { liste, gruppe };
  zeitVorruecken(z, raeume, montag8 - 1 - z.minuten, () => 0);
  assert.equal(spende(z, 'k'), null);
  zeitVorruecken(z, raeume, 2, () => 0);
  assert.equal(spende(z, 'k'), 20);
  const spiel = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0);
  const f = spiel.finanzInfo();
  assert.equal(f.dauerspender.length, 1);
  assert.deepEqual([f.dauerspender[0].name, f.dauerspender[0].betrag, f.dauerspender[0].naechster, f.dauerspender[0].seit], ['Karla K', 20, 21, w + 2]);
  const b = f.buchungen.find(x => x.kategorie === 'dauerspende');
  assert.deepEqual([b.spenderName, b.betrag, b.tag, b.stunde], ['Karla K', 20, 0, 8]);
  assert.equal(f.namen.einnahmen.dauerspende, 'Dauerspenden');
  assert.equal(f.dauerspendeRegeln.chance, 5);
  assert.equal(spiel.lage().meldung.code, 'neuerDauerspender');   // Einblendung unten rechts
}

// Alte Spielstände ohne Dauerspender: legen sich an, erster Montag ist der nächste
{
  const z = neuesSpiel(() => 0.5);
  delete z.dauerspende;
  const s = dauerspenderSchritt(z, () => 0);
  assert.ok(s.zeit >= z.minuten);
  assert.equal(zeitpunkt(s.zeit).tag, 0);
}

console.log('Dauerspender: alle Tests bestanden');
