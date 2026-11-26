// Prüft, dass die Karte ohne Absturz gezeichnet werden kann – mit einer Schein-Zeichenfläche, die alles schluckt.
// Fängt Fehler wie in 0.1.14 („ansicht is not defined“), die die Logik-Tests nicht sehen.
// Starten mit: node tests/zeichnen.test.mjs
import assert from 'node:assert';
import { spielStarten } from './hilfen/ohne-erster.mjs';   // ohne ersten Gottesdienst (26.11.)
import { zeichne } from '../src/ansicht/zeichnen.js';

// Schein-Zeichenfläche: jede Methode tut nichts, measureText liefert eine Breite, Farbverläufe geben sich selbst zurück
function scheinCtx() {
  const ziel = { measureText: t => ({ width: String(t).length * 7 }) };
  const ctx = new Proxy(ziel, {
    get(o, n) { if (n in o) return o[n]; return (...a) => (n.startsWith('create') ? { addColorStop() {} } : undefined); },
    set(o, n, v) { o[n] = v; return true; }
  });
  return ctx;
}

const spiel = spielStarten(null, () => 0.5);
const karte = spiel.karte();
const ansicht = { k: 12, ox: 5, oy: 7 };
assert.doesNotThrow(() => zeichne(scheinCtx(), karte, ansicht, {}), 'Karte lässt sich zeichnen');
// Alles anschalten, was die Umgebung extra malt (Evangelisation, Plakat, Bushaltestelle), auch wenn das Spiel es noch nicht hat
const voll = { ...karte, evangelisation: karte.evangelisation || { x: 1, y: 1, w: 2, h: 1, leute: [] }, plakat: karte.plakat || true, bus: karte.bus || { stufe: 1 } };
assert.doesNotThrow(() => zeichne(scheinCtx(), voll, ansicht, { raster: true }), 'Karte mit Evangelisation, Plakat und Bus lässt sich zeichnen');
console.log('zeichnen: alles ok');
