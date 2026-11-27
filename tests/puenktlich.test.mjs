// Pünktlich (Lukas, 27.11.): Besucher kommen nicht mehr viel zu früh, sondern laufen so los, dass sie genau zum Beginn sitzen.
// Wer unterwegs über die Toilette geht, läuft entsprechend früher los und sitzt trotzdem pünktlich (höchstens ANKUNFT_SPIELRAUM zu früh).
// (Automaten auf dem Weg: tests/automaten.test.mjs.) Starten mit: node tests/puenktlich.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { TOILETTE } from '../src/inhalte/toiletten.js';
import { ANKUNFT_SPIELRAUM } from '../src/inhalte/zeit.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel } from './hilfen/ohne-erster.mjs';
import { zeitVorruecken, veranstaltungEinstellen } from '../src/kern/ablauf.js';
import { moebelSetzen } from '../src/kern/moebel.js';
import { versetzen } from '../src/kern/personen.js';
import { besucherPositionen } from '../src/kern/bewegung.js';
import { TAG_MIN } from '../src/kern/zeit.js';

const BEGINN = 6 * TAG_MIN + 10 * 60;
const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
const raumBei = (z, x, y) => { const a = aus(z); return a.liste[a.gruppe[x + y * z.w]]; };
function gemeinde(wc = false) {
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z, G.x + 5, G.y + 5), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 15, G.y + 3);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  veranstaltungEinstellen(z, raumBei(z, G.x + 5, G.y + 5), 'gottesdienst');
  if (wc) {
    wandRechteck(z, G.x + 2, G.y + 10, G.x + 7, G.y + 14); tuerUmschalten(z, G.x + 4, G.y + 14);
    typZuweisen(z, raumBei(z, G.x + 4, G.y + 12), 'toiletten');
    moebelSetzen(z, 'wc', G.x + 3, G.y + 11, G.x + 3, G.y + 11);
    moebelSetzen(z, 'waschbecken', G.x + 6, G.y + 11, G.x + 6, G.y + 11);
  }
  z.besucher = Array.from({ length: 12 }, (_, i) => ({ id: 'p' + i, vorname: 'P' + i, nachname: 'X', voll: 'P' + i + ' X',
    level: 5, zufriedenheit: 100, kaffeeWert: 0, besuche: 0, lobpreis: 0 }));
  z.bekanntheit = 0; z.ortRuhig = true; z.konto = 1000;
  return z;
}
const lauf = z => z.laeufe.find(L => L.gaeste && L.gaeste.length);
const bis = (z, t) => zeitVorruecken(z, aus(z), t - z.minuten, () => 0);

// Ohne Umweg: alle laufen kurz vor Beginn los und sitzen genau zum Beginn (bzw. stehen dann an der Tür, wenn kein Platz frei ist)
{
  const z = gemeinde();
  bis(z, BEGINN - 170);
  const L = lauf(z);
  assert.equal(L.gaeste.length, 12);
  assert.ok(L.gaeste.every(g => g.los > BEGINN - 60 && g.los < BEGINN), 'niemand läuft Stunden vorher los');
  const frueh = Math.min(...L.gaeste.map(g => g.los));
  bis(z, frueh - 1);
  assert.equal(besucherPositionen(z, new Map()).length, 0, 'bis kurz vorher ist noch niemand da');
  bis(z, BEGINN - 0.5);
  const kurzVorher = besucherPositionen(z, new Map());
  assert.ok(kurzVorher.length >= 10 && kurzVorher.every(b => !b.sitzt), 'kurz vor Beginn sind alle noch unterwegs');
  bis(z, BEGINN + 0.5);
  const jetzt = besucherPositionen(z, new Map());
  const sitzen = jetzt.filter(b => b.sitzt);
  assert.equal(sitzen.length, 10, 'zum Beginn sitzen alle, die einen Platz haben');
  const ohne = L.gaeste.filter(g => !g.sitz);
  assert.equal(ohne.length, 2);
}
console.log('Ohne-Umweg-Tests bestanden.');

// Über die Toilette: früher los, trotzdem pünktlich; nie doppelt in der Kabine
{
  const alt = { ...TOILETTE };
  TOILETTE.startMin = TOILETTE.startMax = 60;
  const z = gemeinde(true);
  bis(z, BEGINN - 170);
  const L = lauf(z), mit = L.gaeste.filter(g => (g.gaenge || []).some(s => s.art === 'vorher'));
  assert.ok(mit.length >= 1, `einige gehen vorher (${mit.length})`);
  for (const g of mit) {
    const s = g.gaenge.find(x => x.art === 'vorher');
    assert.equal(g.los, s.hinAb);
    assert.ok(s.zurueckBis <= BEGINN + 1e-6 && s.zurueckBis >= BEGINN - ANKUNFT_SPIELRAUM - 1e-6, `sitzt pünktlich (${s.zurueckBis - BEGINN})`);
    assert.ok(s.drinAb - s.anWarte < 1.5, 'wartet nicht vor der Kabine');
  }
  const kab = mit.map(g => g.gaenge.find(x => x.art === 'vorher')).sort((a, b) => a.drinAb - b.drinAb);
  for (let i = 1; i < kab.length; i++) assert.ok(kab[i].drinAb >= kab[i - 1].drinBis - 1e-6, 'Kabine doppelt belegt');
  bis(z, BEGINN + 0.5);
  assert.equal(besucherPositionen(z, new Map()).filter(b => b.sitzt).length, 10);
  Object.assign(TOILETTE, alt);
}
console.log('Pünktlich: alle Tests bestanden');
