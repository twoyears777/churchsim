// Prüft den Jugendgottesdienst und die Forschung „3. Veranstaltung“ (Spielprinzip von Lukas, 26.11.:
// claude/spielprinzip-jugendgottesdienst-dritter-slot.md). Starten mit: node tests/jugendgottesdienst.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { VERANSTALTUNGEN } from '../src/inhalte/veranstaltungen.js';
import { JUGEND } from '../src/inhalte/besucher.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { spielAnlegen } from '../src/kern/spiel.js';
import { neuesSpiel, spielStarten } from './hilfen/ohne-erster.mjs';   // ohne ersten Gottesdienst (26.11.)
import { zeitVorruecken, veranstaltungEinstellen, gottesdienstRaeume, platzSperre } from '../src/kern/ablauf.js';
import { moebelSetzen } from '../src/kern/moebel.js';
import { versetzen, personHinzufuegen } from '../src/kern/personen.js';
import { besuchChance, kommChance } from '../src/kern/besucher.js';
import { bausteineVon } from '../src/kern/bausteine.js';
import { TAG_MIN } from '../src/kern/zeit.js';

const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
const raumBei = z => { const a = aus(z); return a.liste[a.gruppe[G.x + 5 + (G.y + 5) * z.w]]; };
const info = z => gottesdienstRaeume(z, aus(z)).find(g => g.raum.zellen[0] === raumBei(z).zellen[0]);

// Gottesdienstraum mit 10 Stühlen und Pastor; 10 Besucher mit Haltung 50, die ersten 5 jugendlich.
function gemeinde() {
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 15, G.y + 3);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  z.besucher = Array.from({ length: 10 }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X',
    level: 2, zufriedenheit: 50, kaffeeWert: 0, besuche: 0, lobpreis: 1, jugend: i < 5 }));
  z.bekanntheit = 0; z.ortRuhig = true; z.konto = 1000;
  return z;
}
const musiker = (z, n) => {
  const instr = ['gitarre', 'keyboard', 'bass'];
  for (let i = 0; i < n; i++) {
    moebelSetzen(z, instr[i], G.x + 10 + i * 2, G.y + 6, G.x + 10 + i * 2, G.y + 6);
    versetzen(z, personHinzufuegen(z, { name: 'Musiker ' + i, kuerzel: 'M', art: 'ehrenamt' }), G.x + 11 + i * 2, G.y + 6);
  }
};

// Inhalt so, wie Lukas es festgelegt hat
{
  const v = VERANSTALTUNGEN.find(x => x.id === 'jugend');
  assert.equal(v.name, 'Jugendgottesdienst');
  assert.equal(v.musikerMin, 2);
  assert.equal(v.kollekteFaktor, 0.5);
  assert.equal(v.erwachsene, 0.1);
  assert.equal(JUGEND.faktor.jugend, 2.5);
}

// Chance zu kommen: Jugendliche × 2,5 (höchstens 100 %), Erwachsene × 0,1; Lobpreis-Vorliebe wirkt nicht darauf
{
  const z = gemeinde(), jung = z.besucher[0], alt = z.besucher[9];
  assert.equal(besuchChance(jung, { art: 'jugend', musik: true }), Math.min(1, kommChance(jung) * 2.5));
  assert.ok(Math.abs(besuchChance(alt, { art: 'jugend', musik: true }) - kommChance(alt) * 0.1) < 1e-12);
  jung.lobpreis = 0;
  assert.equal(besuchChance(jung, { art: 'jugend', musik: true }), Math.min(1, kommChance(jung) * 2.5));
}

// Pflicht: mindestens 2 Ehrenamtliche an je einem Instrument
{
  const z = gemeinde();
  veranstaltungEinstellen(z, raumBei(z), 'jugend', 0);
  assert.equal(info(z).programm[0].fehlt, 'musiker');
  musiker(z, 1);
  assert.equal(info(z).programm[0].fehlt, 'musiker', 'ein Musiker reicht nicht');
  const z2 = gemeinde(); veranstaltungEinstellen(z2, raumBei(z2), 'jugend', 0); musiker(z2, 2);
  assert.equal(info(z2).programm[0].fehlt, null);
  // Bausteintabelle: Hauptamtlicher und die ersten 2 Musiker sind Pflicht
  const b = bausteineVon(z2, raumBei(z2), info(z2), ['jugend']).jugend;
  assert.deepEqual(b.zeilen.filter(x => x.pflicht).map(x => x.id), ['hauptamtJugend', 'musiker', 'musiker']);
  assert.equal(b.summe.art, 'jugend');
  assert.ok(b.summe.bereit);
}

// Ablauf am Sonntagabend: Kollekte halb so hoch, Heiligkeit, Spaß nur für Jugendliche, Lobpreis für alle
{
  const z = gemeinde();
  veranstaltungEinstellen(z, raumBei(z), 'jugend', 0);
  musiker(z, 2);
  spielAnlegen(z);
  // Veranstaltung 1 steht standardmäßig auf Sonntagvormittag (Sonntagsbonus); zufall 0 → alle mit Chance > 0 kommen
  zeitVorruecken(z, aus(z), 6 * TAG_MIN + 14 * 60 - z.minuten, () => 0);
  const da = z.besucher.filter(b => b.besuche > 0);
  assert.equal(da.length, 10);
  assert.equal(z.heiligkeit, 10, 'zählt als Gottesdienst für die Heiligkeit');
  assert.ok(da.filter(b => b.jugend).every(b => b.erfuellt.ids.includes('spass')));
  assert.ok(da.filter(b => !b.jugend).every(b => !b.erfuellt.ids.includes('spass')));
  assert.ok(da.every(b => b.erfuellt.ids.includes('lobpreis')));
  const kollekte = z.wochenbuch.einnahmen.kollekte;
  // Vergleich: normaler Gottesdienst mit denselben Musikern bringt doppelt so viel (gerundet)
  const n = gemeinde();
  veranstaltungEinstellen(n, raumBei(n), 'gottesdienst', 0);
  musiker(n, 2);
  spielAnlegen(n);
  zeitVorruecken(n, aus(n), 6 * TAG_MIN + 14 * 60 - n.minuten, () => 0);
  assert.ok(Math.abs(n.wochenbuch.einnahmen.kollekte / 2 - kollekte) <= 1, `${kollekte} ≈ ${n.wochenbuch.einnahmen.kollekte} / 2`);
}

// 3. Veranstaltung: gesperrt bis zur Forschung, je Raumtyp eine eigene
{
  const z = gemeinde();
  spielAnlegen(z);
  const r = raumBei(z);
  assert.equal(platzSperre(z, r, 2), 'forschung');
  z.forschung.fertig.push('slot3saal');
  assert.equal(platzSperre(z, r, 2), 'forschung', 'die Forschung für den Gemeindesaal gilt nicht im Gottesdienstraum');
  z.forschung.fertig.push('slot3gottesdienst');
  assert.equal(platzSperre(z, r, 2), null);
  assert.equal(platzSperre(z, r, 1), 'moebel', 'Veranstaltung 2 braucht weiter Kanzel und Altar');
}

// Gemeindekalender: alle Termine der Woche mit Raum und Zustand; ohne Musiker „fällt aus“
{
  const z = gemeinde();
  veranstaltungEinstellen(z, raumBei(z), 'jugend', 0);
  const d = JSON.parse(spielStarten(null, () => 0.5).speicherText()); d.zustand = z;
  const k = spielStarten(JSON.stringify(d), () => 0.5).kalenderInfo(0);
  assert.equal(k.tage.length, 7);
  assert.deepEqual(k.termine.map(t => [t.art, t.tag, t.slot, t.name, t.zustand, t.fehlt]),
    [['jugend', 6, 'vormittag', 'Gottesdienstraum', 'faelltAus', 'musiker']]);
  assert.deepEqual(spielStarten(JSON.stringify(d), () => 0.5).kalenderInfo(1).termine.map(t => t.zustand), ['faelltAus']);
}

console.log('Jugendgottesdienst und 3. Veranstaltung: alle Prüfungen bestanden');
