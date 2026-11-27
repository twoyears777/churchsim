// Abriss-Wert (Lukas, 27.11.2026): anfangs die Hälfte zurück, jede volle Woche seit dem Bauen 5 % weniger, nach 10 Wochen nichts.
// Gilt für Wände, Türen, Fenster und Möbel samt Verbesserungen. Rückgängig gibt weiter alles zurück.
// Alte Spielstände: schon Gebautes zählt wie heute gebaut.
import assert from 'node:assert/strict';
import { spielStarten } from '../src/kern/spiel.js';
import { abrissAnteil, abrissWert, alterWochen } from '../src/kern/abriss.js';
import { WOCHE_MIN } from '../src/kern/zeit.js';
import { ABRISS } from '../src/inhalte/bau.js';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';

assert.deepEqual(ABRISS, { anteil: 0.5, wochen: 10 });
// Verlauf: 50 %, 45 %, … 5 %, 0 % – wechselt genau nach vollen Wochen
{
  const z = { minuten: 1000 };
  const nach = w => Math.round(abrissAnteil({ minuten: 1000 + w * WOCHE_MIN }, 1000) * 100);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 40].map(nach), [50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0, 0, 0]);
  assert.equal(alterWochen({ minuten: 1000 + WOCHE_MIN - 1 }, 1000), 0);
  assert.equal(alterWochen({ minuten: 1000 + WOCHE_MIN }, 1000), 1);
  assert.equal(abrissWert(z, 5, 1000), 2.5);
  assert.equal(abrissWert(z, 5, undefined), 2.5);        // ohne Bauzeit: wie gerade gebaut
}
// Spielzeit vorstellen: Spielstand speichern, Uhr weiterdrehen, wieder laden
const spaeter = (s, wochen) => {
  const d = JSON.parse(s.speicherText());
  d.zustand.minuten += wochen * WOCHE_MIN;
  return spielStarten(JSON.stringify(d), () => 0.5);
};
// Wände, Tür, Fenster: nach 4 Wochen 30 %, nach 10 Wochen nichts
{
  const s = spielStarten(null, () => 0.5);
  s.wandBauen(G.x + 2, G.y + 2, G.x + 8, G.y + 8);                        // 24 Wandstücke = 120 €
  s.tuerUmschalten(G.x + 2, G.y + 5); s.fensterUmschalten(G.x + 5, G.y + 2);   // + 10 € + 10 €
  assert.equal(s.lage().konto, 860);
  const s4 = spaeter(s, 4);
  s4.abreissen(G.x + 2, G.y + 2, G.x + 8, G.y + 8);
  assert.equal(s4.lage().konto, 860 + 0.3 * 140);
  assert.ok(s4.rueckgaengig()); assert.equal(s4.lage().konto, 860);        // Abriss rückgängig: Wände stehen wieder, Geld wieder weg
  s4.abreissen(G.x + 2, G.y + 2, G.x + 8, G.y + 8); assert.equal(s4.lage().konto, 902);   // … und ihr Alter ist dasselbe
  const s10 = spaeter(s, 10);
  s10.abreissen(G.x + 2, G.y + 2, G.x + 8, G.y + 8);
  assert.equal(s10.lage().konto, 860);
  assert.ok(!s10.finanzInfo().buchungen.some(b => b.kategorie === 'rueckerstattung'));   // 0 €: keine leere Buchung
}
// Tür und Fenster haben ihr eigenes Alter: alte Wand, neue Tür
{
  const s = spielStarten(null, () => 0.5);
  s.wandBauen(G.x + 2, G.y + 2, G.x + 8, G.y + 8);
  const s10 = spaeter(s, 10);
  s10.tuerUmschalten(G.x + 2, G.y + 5); assert.equal(s10.lage().konto, 870);
  s10.tuerUmschalten(G.x + 2, G.y + 5); assert.equal(s10.lage().konto, 875);   // neue Tür wieder zur Wand: Hälfte
  s10.fensterUmschalten(G.x + 5, G.y + 2);
  const s13 = spaeter(s10, 3);
  s13.fensterUmschalten(G.x + 5, G.y + 2); assert.equal(s13.lage().konto, 865 + 3.5);   // Fenster nach 3 Wochen: 35 %
  // neues Wandstück an alter Wand: nur das neue bringt noch etwas
  s13.wandBauen(G.x + 8, G.y + 2, G.x + 12, G.y + 8);
  const vor = s13.lage().konto;
  s13.abreissen(G.x + 2, G.y + 2, G.x + 12, G.y + 8);
  assert.ok(s13.lage().konto > vor); assert.ok(s13.lage().konto < vor + 0.5 * 5 * 30);
}
// Möbel: Hälfte, sinkt mit dem Alter; Rückgängig direkt nach dem Kauf gibt alles zurück
{
  const s = spielStarten(null, () => 0.5);
  const preis = s.moebelArten().find(m => m.id === 'stuhl').kosten;
  assert.equal(s.moebelKaufen('stuhl', G.x + 3, G.y + 3), 'ok'); assert.equal(s.lage().konto, 1000 - preis);
  assert.ok(s.rueckgaengig()); assert.equal(s.lage().konto, 1000);
  s.moebelKaufen('stuhl', G.x + 3, G.y + 3);
  s.abreissen(G.x + 3, G.y + 3, G.x + 3, G.y + 3); assert.equal(s.lage().konto, 1000 - preis / 2);
  s.moebelKaufen('stuhl', G.x + 3, G.y + 3);
  const s6 = spaeter(s, 6), vor = s6.lage().konto;
  s6.abreissen(G.x + 3, G.y + 3, G.x + 3, G.y + 3); assert.equal(s6.lage().konto, vor + preis * 0.2);
}
// Alter Spielstand ohne Bauzeiten: alles zählt wie beim Laden gebaut – auch wenn das Spiel schon lange läuft
{
  const s = spielStarten(null, () => 0.5);
  s.wandBauen(G.x + 2, G.y + 2, G.x + 8, G.y + 8); s.moebelKaufen('stuhl', G.x + 4, G.y + 4);
  const d = JSON.parse(s.speicherText());
  delete d.zustand.bauzeit; delete d.zustand.zusatzzeit; d.zustand.moebel.forEach(m => delete m.gebaut);
  d.zustand.minuten += 30 * WOCHE_MIN;
  const alt = spielStarten(JSON.stringify(d), () => 0.5), vor = alt.lage().konto;
  const preis = alt.moebelArten().find(m => m.id === 'stuhl').kosten;
  alt.abreissen(G.x + 2, G.y + 2, G.x + 8, G.y + 8);
  assert.equal(alt.lage().konto, vor + 60 + preis / 2);
}
console.log('Abriss-Tests bestanden.');
