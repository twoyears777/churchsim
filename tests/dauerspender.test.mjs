// Prüft die Dauerspender (Spielprinzip von Lukas, 25.11.2026): Montag 8:00, ab Haltung 80, 75 % Chance,
// 5 € sofort, +1 € pro Woche bis 20 €, Prüfung nur montags, Neubeginn bei 5 €, Anzeige über finanzInfo().
// Starten mit: node tests/dauerspender.test.mjs
import assert from 'node:assert';
import { DAUERSPENDE } from '../src/inhalte/finanzen.js';
import { neuesSpiel, spielStarten, SPEICHER_VERSION } from '../src/kern/spiel.js';
import { zeitVorruecken } from '../src/kern/ablauf.js';
import { erkenneRaeume, raumTypVon, pruefeRaum } from '../src/kern/karte.js';
import { dauerspenderSchritt, dauerspenderListe } from '../src/kern/dauerspender.js';
import { WOCHE_MIN, zeitpunkt } from '../src/kern/zeit.js';

assert.deepEqual(DAUERSPENDE, { abHaltung: 80, chance: 0.75, start: 5, steigerung: 1, max: 20, stunde: 8 });

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
    { id: 'a', voll: 'Anna A', zufriedenheit: 80, besuche: 1 },   // genau 80 zählt
    { id: 'b', voll: 'Ben B', zufriedenheit: 79, besuche: 1 },    // zu wenig
    { id: 'c', voll: 'Cora C', zufriedenheit: 95, besuche: 1 }
  ];
  z.ort.leute.push({ id: 'p', voll: 'Paul P', zufriedenheit: 90, besuche: 0 });   // Passanten zählen auch
  const konto = z.konto;
  // Würfel: Anna 0,1 (wird), Cora 0,8 (wird nicht, ≥ 0,75), Paul 0,74 (wird)
  montag(z, folge([0.1, 0.8, 0.74]));
  assert.equal(spende(z, 'a'), 5); assert.equal(spende(z, 'b'), null); assert.equal(spende(z, 'c'), null); assert.equal(spende(z, 'p'), 5);
  assert.equal(z.konto, konto + 10);                                     // erste Spende kommt sofort
  assert.equal(z.wochenbuch.einnahmen.dauerspende, 10);
  assert.equal(z.wochenbuch.buchungen.filter(b => b.kategorie === 'dauerspende').length, 2);

  // Nächste Woche: Anna steigt auf 6 €, Cora bekommt eine neue Chance
  montag(z, folge([0.0]));
  assert.equal(spende(z, 'a'), 6); assert.equal(spende(z, 'p'), 6); assert.equal(spende(z, 'c'), 5);

  // Haltung sinkt unter der Woche kurz, ist montags aber wieder 80 → bleibt (nur montags geprüft)
  z.besucher[0].zufriedenheit = 50; z.besucher[0].zufriedenheit = 80;
  // Paul fällt unter 80 → Dauerspende endet, keine Spende
  z.ort.leute[0].zufriedenheit = 79;
  const vorher = z.konto;
  montag(z, folge([0.9]));                                               // 0,9: Paul würde ohnehin nicht neu würfeln (unter 80)
  assert.equal(spende(z, 'a'), 7); assert.equal(spende(z, 'c'), 6); assert.equal(spende(z, 'p'), null);
  assert.equal(z.konto, vorher + 13);

  // Paul wieder ab 80 → beginnt wieder bei 5 €
  z.ort.leute[0].zufriedenheit = 85;
  montag(z, folge([0.0]));
  assert.equal(spende(z, 'p'), 5); assert.equal(spende(z, 'a'), 8);

  // Höchstens 20 €
  for (let i = 0; i < 20; i++) montag(z, folge([0.0]));
  assert.equal(spende(z, 'a'), 20); assert.equal(spende(z, 'c'), 20);

  // Liste: höchster Betrag zuerst, nächster Betrag, Haltung
  const L = dauerspenderListe(z);
  assert.deepEqual(L.map(d => d.id), ['a', 'c', 'p']);
  assert.equal(L[0].naechster, 20); assert.equal(L[2].naechster, Math.min(20, L[2].betrag + 1)); assert.equal(L[0].haltung, 80);
}

// Wer nicht mehr da ist (z. B. Ehrenamtlich geworden), spendet nicht mehr
{
  const z = neuesSpiel(() => 0.5);
  z.ort.leute = []; z.besucher = [{ id: 'x', voll: 'Xaver X', zufriedenheit: 90, besuche: 3 }];
  montag(z, () => 0);
  assert.equal(spende(z, 'x'), 5);
  z.besucher = [];
  montag(z, () => 0);
  assert.equal(spende(z, 'x'), null);
}

// Im laufenden Spiel: Spende kommt genau Montag 8:00, nicht vorher; Abfrage finanzInfo() liefert Liste und Kassenbuch-Namen
{
  const z = neuesSpiel(() => 0.5);
  z.ortRuhig = true; z.ort.leute = [];
  z.besucher = [{ id: 'k', voll: 'Karla K', zufriedenheit: 100, besuche: 2 }];
  const w = zeitpunkt(z.minuten).woche, montag8 = (w + 1) * WOCHE_MIN + 8 * 60;
  const { raeume: liste, gruppe } = erkenneRaeume(z);
  for (const r of liste) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); }
  const raeume = { liste, gruppe };
  zeitVorruecken(z, raeume, montag8 - 1 - z.minuten, () => 0);
  assert.equal(spende(z, 'k'), null);
  zeitVorruecken(z, raeume, 2, () => 0);
  assert.equal(spende(z, 'k'), 5);
  const spiel = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0);
  const f = spiel.finanzInfo();
  assert.equal(f.dauerspender.length, 1);
  assert.deepEqual([f.dauerspender[0].name, f.dauerspender[0].betrag, f.dauerspender[0].naechster, f.dauerspender[0].seit], ['Karla K', 5, 6, w + 2]);
  const b = f.buchungen.find(x => x.kategorie === 'dauerspende');
  assert.deepEqual([b.spenderName, b.betrag, b.tag, b.stunde], ['Karla K', 5, 0, 8]);
  assert.equal(f.namen.einnahmen.dauerspende, 'Dauerspenden');
  assert.equal(f.dauerspendeRegeln.chance, 75);
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
