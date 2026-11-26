// Prüft, dass Musiker zu ihrem Instrument gehen (Wunsch von Lukas, 26.11.2026): rechtzeitig vor Beginn, feste Reihenfolge
// (höchstes Musik-Level → Gitarre, dann Keyboard …), danach zurück an den Platz; Chorprobe: Leitung ans Klavier.
// Nur fürs Auge – der Platz für die Spielregeln bleibt gleich. Starten mit: node tests/musiker.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { MUSIK } from '../src/inhalte/moebel.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel } from './hilfen/ohne-erster.mjs';   // ohne ersten Gottesdienst (26.11.)
import { zeitVorruecken, veranstaltungEinstellen, terminEinstellen, termineDerWoche, dauerVon } from '../src/kern/ablauf.js';
import { moebelSetzen } from '../src/kern/moebel.js';
import { versetzen, personHinzufuegen } from '../src/kern/personen.js';
import { skillsVon } from '../src/kern/skills.js';
import { musikerGaenge, musikerPosition, REIHENFOLGE } from '../src/kern/musiker.js';
import { TAG_MIN } from '../src/kern/zeit.js';

const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
const raumBei = z => { const a = aus(z); return a.liste[a.gruppe[G.x + 5 + (G.y + 5) * z.w]]; };
const bis = (z, minute) => { while (z.minuten < minute) zeitVorruecken(z, aus(z), Math.min(5, minute - z.minuten), () => 0.3); };
const wo = (z, p) => musikerPosition(musikerGaenge(z, aus(z)), p, z.minuten);
const neben = (q, m) => !!q && Number.isInteger(q.x) && Number.isInteger(q.y) && Math.max(Math.abs(q.x - m.x), Math.abs(q.y - m.y)) === 1;
const musik = (p, l) => { skillsVon(p).musik = l * MUSIK.erfahrungProLevel; return p; };

function gemeinde(typ) {
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 10); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z), typ);
  z.personen = z.personen.filter(p => p.id === 'pastor');
  z.besucher = Array.from({ length: 4 }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X',
    level: 5, zufriedenheit: 100, kaffeeWert: 1, besuche: 0, lobpreis: 1 }));
  z.bekanntheit = 0; z.ortRuhig = true; z.konto = 1000;
  return z;
}

// Feste Reihenfolge der Instrumente wie in der Möbelliste, Klavier zuletzt
assert.deepEqual(REIHENFOLGE, ['gitarre', 'keyboard', 'schlagzeug', 'bass', 'egitarre', 'mikrofon', 'klavier']);

// Gottesdienst mit Gitarre und Keyboard: höchstes Musik-Level an die Gitarre, rechtzeitig hin, danach zurück
{
  const z = gemeinde('gottesdienst'), r = raumBei(z);
  veranstaltungEinstellen(z, r, 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 12, G.y + 3);
  const gitarre = { x: G.x + 16, y: G.y + 8 }, keyboard = { x: G.x + 13, y: G.y + 8 };
  moebelSetzen(z, 'keyboard', keyboard.x, keyboard.y, keyboard.x, keyboard.y);
  moebelSetzen(z, 'gitarre', gitarre.x, gitarre.y, gitarre.x, gitarre.y);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  const a = musik(personHinzufuegen(z, { name: 'Anna', kuerzel: 'A', art: 'ehrenamt' }), 1);
  const b = musik(personHinzufuegen(z, { name: 'Ben', kuerzel: 'B', art: 'ehrenamt' }), 3);
  versetzen(z, a, G.x + 4, G.y + 8); versetzen(z, b, G.x + 5, G.y + 8);
  assert.equal(terminEinstellen(z, raumBei(z), 0, 1, 'abend'), 'ok');   // Dienstag abends
  const t = termineDerWoche(z, aus(z), 0).find(x => x.art === 'gottesdienst');
  z.minuten = TAG_MIN + 12 * 60;
  bis(z, t.beginn - 60);
  assert.equal(wo(z, a), null, 'eine Stunde vorher: noch an seinem Platz');
  assert.equal(wo(z, b), null);
  bis(z, t.beginn - 5);
  assert.ok(wo(z, b), 'kurz vorher: unterwegs');
  bis(z, t.beginn);
  assert.ok(neben(wo(z, b), gitarre), 'zum Beginn steht Ben (Level 3) an der Gitarre');
  assert.ok(neben(wo(z, a), keyboard), 'Anna (Level 1) am Keyboard');
  bis(z, t.beginn + 30);
  assert.ok(neben(wo(z, b), gitarre) && neben(wo(z, a), keyboard), 'bleiben während des Gottesdienstes dort');
  assert.deepEqual([a.x, a.y, b.x, b.y], [G.x + 4, G.y + 8, G.x + 5, G.y + 8], 'Platz für die Spielregeln bleibt gleich');
  const L = z.laeufe.find(l => l.id === t.id);
  bis(z, t.beginn + dauerVon('gottesdienst'));
  assert.equal(L.gottesdienstEnde, t.beginn + dauerVon('gottesdienst'));
  bis(z, z.minuten + 1);
  assert.ok(wo(z, b) && !neben(wo(z, b), gitarre), 'nach dem Ende auf dem Rückweg');
  bis(z, z.minuten + 60);
  assert.equal(wo(z, a), null, 'wieder an seinem Platz');
  assert.equal(wo(z, b), null);
}

// Steht der Musiker schon am Instrument, bleibt er dort; mehr Ehrenamtliche als Instrumente: die anderen bleiben stehen
{
  const z = gemeinde('gottesdienst'), r = raumBei(z);
  veranstaltungEinstellen(z, r, 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 12, G.y + 3);
  moebelSetzen(z, 'gitarre', G.x + 16, G.y + 8, G.x + 16, G.y + 8);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  const a = musik(personHinzufuegen(z, { name: 'Anna', kuerzel: 'A', art: 'ehrenamt' }), 1);
  const b = musik(personHinzufuegen(z, { name: 'Ben', kuerzel: 'B', art: 'ehrenamt' }), 3);
  versetzen(z, a, G.x + 4, G.y + 8); versetzen(z, b, G.x + 15, G.y + 8);
  terminEinstellen(z, raumBei(z), 0, 1, 'abend');
  const t = termineDerWoche(z, aus(z), 0).find(x => x.art === 'gottesdienst');
  z.minuten = TAG_MIN + 12 * 60;
  bis(z, t.beginn + 10);
  assert.equal(wo(z, b), null, 'Ben steht schon an der Gitarre');
  assert.equal(wo(z, a), null, 'Anna spielt nicht (nur ein Instrument)');
}

// Kirchenchorprobe: Wer sie leitet, geht ans Klavier
{
  const z = gemeinde('gemeindesaal'), r = raumBei(z);
  const e = musik(personHinzufuegen(z, { name: 'Erna', kuerzel: 'E', art: 'ehrenamt' }), 1);
  versetzen(z, e, G.x + 4, G.y + 4);
  const klavier = { x: G.x + 16, y: G.y + 3 };
  moebelSetzen(z, 'klavier', klavier.x, klavier.y, klavier.x, klavier.y);
  veranstaltungEinstellen(z, r, 'chorprobe');
  terminEinstellen(z, raumBei(z), 0, 2, 'abend');   // Mittwoch abends
  const t = termineDerWoche(z, aus(z), 0).find(x => x.art === 'chorprobe');
  z.minuten = 2 * TAG_MIN + 12 * 60;
  bis(z, t.beginn - 60);
  assert.equal(wo(z, e), null);
  bis(z, t.beginn);
  assert.ok(neben(wo(z, e), klavier), 'zum Beginn am Klavier');
  const L = z.laeufe.find(l => l.id === t.id);
  assert.ok(!L.gaeste.some(g => g.sitz && wo(z, e) && g.sitz.x === wo(z, e).x && g.sitz.y === wo(z, e).y), 'nicht auf dem Platz eines Chormitglieds');
  bis(z, (L.gottesdienstEnde ?? t.beginn + 120) + 60);
  assert.equal(wo(z, e), null, 'danach wieder an seinem Platz');
}

console.log('Musiker-Tests bestanden.');
