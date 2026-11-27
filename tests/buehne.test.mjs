// Prüft die Bühne im Gottesdienstraum (Spielprinzip von Lukas, 27.11.2026, claude/spielprinzip-buehne.md):
// 25 € je Kachel, nur im Gottesdienstraum, Möbel darauf mit Bonus ×1,5 (nur der Bonus-Anteil), Stühle zählen nicht,
// +0,05 € Kollekte pro Besucher und Kachel (Sonntag ×2 gilt mit), Abriss-Wert, Rückgängig, Wand darüber.
// Starten mit: node tests/buehne.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { BUEHNE } from '../src/inhalte/moebel.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel, spielStarten } from './hilfen/ohne-erster.mjs';
import { zeitVorruecken, veranstaltungEinstellen, prognose } from '../src/kern/ablauf.js';
import { moebelSetzen, raumAusstattung, stuhlVerbessern } from '../src/kern/moebel.js';
import { buehneBauen, buehneAbreissen, buehneImRaum, buehnePruefen, istBuehne } from '../src/kern/buehne.js';
import { bausteineVon } from '../src/kern/bausteine.js';
import { versetzen } from '../src/kern/personen.js';
import { raten, schliessen, anfrageOffen } from '../src/kern/seelsorge.js';
import { WOCHE_MIN } from '../src/kern/zeit.js';
import { SPEICHER_VERSION } from '../src/kern/spiel.js';

const saat = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
const raumBei = (z, x, y) => { const a = aus(z); return a.liste[a.gruppe[x + y * z.w]]; };
const nahe = (a, b, text) => assert.ok(Math.abs(a - b) < 1e-9, `${text}: ${a} statt ${b}`);

// Gottesdienstraum (Innen G.x+3 … G.x+17, G.y+3 … G.y+7) mit 10 Stühlen in Reihe 3, Pastor; 10 sichere Besucher
function gemeinde(zufall) {
  const z = neuesSpiel(zufall);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z, G.x + 5, G.y + 5), 'gottesdienst'); veranstaltungEinstellen(z, raumBei(z, G.x + 5, G.y + 5), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 15, G.y + 3);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  z.besucher = Array.from({ length: 10 }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X', level: 5, zufriedenheit: 100, kaffeeWert: 0, besuche: 0, lobpreis: 0.5 }));
  z.bekanntheit = 0; z.ortRuhig = true;
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
const raum = z => raumBei(z, G.x + 5, G.y + 5);

// Bauen: nur Kästchen im Gottesdienstraum, 25 € je Kachel, schon vorhandene Bühne kostet nichts
{
  const z = gemeinde(saat(3)); z.konto = 1000;
  const vor = z.konto;
  const r = buehneBauen(z, aus(z), G.x + 1, G.y + 6, G.x + 4, G.y + 7);   // ragt über die Wand hinaus: nur 2 × 2 innen
  assert.deepStrictEqual(r, { gebaut: 4, ergebnis: 'ok' });
  assert.strictEqual(vor - z.konto, 4 * BUEHNE.kosten);
  assert.strictEqual(buehneImRaum(z, raum(z)), 4);
  assert.strictEqual(buehneBauen(z, aus(z), G.x + 3, G.y + 6, G.x + 4, G.y + 7).ergebnis, 'platz', 'schon alles Bühne');
  assert.strictEqual(buehneBauen(z, aus(z), G.x + 25, G.y + 12, G.x + 26, G.y + 13).ergebnis, 'raum', 'draußen geht keine Bühne');
  // Anderer Raumtyp: geht nicht
  const z2 = gemeinde(saat(3)); typZuweisen(z2, raum(z2), 'gemeindesaal');
  assert.strictEqual(buehneBauen(z2, aus(z2), G.x + 3, G.y + 6, G.x + 4, G.y + 7).ergebnis, 'raum');
  // Zu wenig Geld: so viel wie bezahlbar
  const z3 = gemeinde(saat(3)); z3.konto = 60;
  assert.deepStrictEqual(buehneBauen(z3, aus(z3), G.x + 3, G.y + 6, G.x + 6, G.y + 6), { gebaut: 2, ergebnis: 'geld' });
}
// Möbel auf der Bühne: Bonus ×1,5 (nur der Bonus-Anteil)
{
  const z = gemeinde(saat(3)); z.konto = 1000;
  buehneBauen(z, aus(z), G.x + 3, G.y + 6, G.x + 9, G.y + 7);
  moebelSetzen(z, 'altar', G.x + 3, G.y + 6, G.x + 3, G.y + 6);
  moebelSetzen(z, 'kanzel', G.x + 4, G.y + 6, G.x + 4, G.y + 6);
  moebelSetzen(z, 'blumen', G.x + 5, G.y + 6, G.x + 5, G.y + 6);
  moebelSetzen(z, 'blumen', G.x + 15, G.y + 6, G.x + 15, G.y + 6);     // nicht auf der Bühne
  moebelSetzen(z, 'gruenpflanze', G.x + 6, G.y + 6, G.x + 6, G.y + 6);
  moebelSetzen(z, 'gitarre', G.x + 7, G.y + 6, G.x + 7, G.y + 6);
  moebelSetzen(z, 'keyboard', G.x + 16, G.y + 6, G.x + 16, G.y + 6);   // nicht auf der Bühne
  const a = raumAusstattung(z, raum(z), [0, 2]);
  nahe(a.haltung, 3 + 1.5 + 1, 'Kanzel +3, Blumen +1,5 und +1');
  // Musiker: Level 2 an die Gitarre (Bühne) 0,07 × 1,5 = 0,105, Level 0 ans Keyboard 0,05 → 0,155
  nahe(a.musikBonus, 0.155, 'Musik-Bonus');
  nahe(a.faktor, 1.3 * 1.075 * 1.155, 'Kollekte: Altar ×1,3, Grünpflanze ×1,075, Lobpreisteam');
  assert.strictEqual(a.buehne, 14); nahe(a.buehneGeld, 0.7, '14 Kacheln × 0,05 €');
  // Bausteintabelle zeigt, was auf der Bühne steht
  const t = bausteineVon(z, raum(z), null, ['gottesdienst']).gottesdienst;
  assert.strictEqual(t.zeilen.find(x => x.moebel === 'altar').aufBuehne, 1);
  assert.strictEqual(t.zeilen.find(x => x.moebel === 'blumen').aufBuehne, 1);
  const b = t.zeilen.find(x => x.id === 'buehne');
  assert.strictEqual(b.anzahl, 14); assert.strictEqual(b.imRaum, true);
}
// Stühle auf der Bühne zählen nicht extra; Kollekte: 10 Besucher × (1 € + 4 × 0,05 €) = 12 €, Sonntag ×2 = 24 €
{
  const zufall = saat(3), z = gemeinde(zufall); z.konto = 1000;
  buehneBauen(z, aus(z), G.x + 6, G.y + 3, G.x + 9, G.y + 3);   // vier Kacheln unter Stühlen
  const st = z.moebel.find(m => m.art === 'stuhl' && m.x === G.x + 6);
  assert.ok(istBuehne(z, st.x, st.y));
  const a = raumAusstattung(z, raum(z));
  nahe(a.faktor, 1, 'Stühle auf der Bühne ändern den Faktor nicht'); assert.strictEqual(a.haltung, 0);
  nahe(prognose(z, aus(z)).kollekte, 24, 'Prognose rechnet die Bühne mit');
  bisNachGottesdienst(z, zufall);
  assert.strictEqual(z.letzterGottesdienst.besucher, 10);
  assert.strictEqual(z.wochenbuch.einnahmen.kollekte, 24);
}
// Abriss-Wert (die Hälfte), Wand über der Bühne, Abriss nur der Bühne
{
  const z = gemeinde(saat(3)); z.konto = 1000;
  buehneBauen(z, aus(z), G.x + 3, G.y + 6, G.x + 4, G.y + 7);
  const vor = z.konto;
  assert.strictEqual(buehneAbreissen(z, G.x + 3, G.y + 6, G.x + 3, G.y + 7), BUEHNE.kosten);   // 2 Kacheln × 25 € × 50 %
  assert.strictEqual(z.konto - vor, BUEHNE.kosten);
  assert.strictEqual(buehneImRaum(z, raum(z)), 2);
  z.zellen[(G.y + 6) * z.w + G.x + 4] = 1; buehnePruefen(z);   // Wand drüber
  assert.strictEqual(Object.keys(z.buehne).length, 1);
}
// Über die Schalterwand: bauen, Rückgängig, Abriss; Karte zeigt die Bühne nur im Gottesdienstraum; Speichern/Laden
{
  const z = gemeinde(saat(3)); z.konto = 1000;
  const spiel = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), saat(3));
  const k0 = spiel.baukosten().konto;
  assert.strictEqual(spiel.buehneBauen(G.x + 3, G.y + 6, G.x + 5, G.y + 7).ergebnis, 'ok');
  assert.strictEqual(spiel.karte().buehne.length, 6);
  assert.strictEqual(k0 - spiel.baukosten().konto, 6 * BUEHNE.kosten);
  assert.strictEqual(spiel.buehneBauen(G.x + 3, G.y + 6, G.x + 5, G.y + 7).ergebnis, 'platz');
  assert.ok(spiel.rueckgaengig());
  assert.strictEqual(spiel.karte().buehne.length, 0);
  assert.strictEqual(spiel.baukosten().konto, k0, 'Rückgängig gibt alles zurück');
  spiel.buehneBauen(G.x + 3, G.y + 6, G.x + 5, G.y + 7);
  spiel.abreissen(G.x + 3, G.y + 6, G.x + 3, G.y + 7);
  assert.strictEqual(spiel.karte().buehne.length, 4);
  const geladen = spielStarten(spiel.speicherText(), saat(3));
  assert.strictEqual(geladen.karte().buehne.length, 4, 'Bühne bleibt beim Speichern erhalten');
}
console.log('buehne.test: alles ok');
