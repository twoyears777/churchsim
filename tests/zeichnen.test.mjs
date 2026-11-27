// Prüft, dass die Karte ohne Absturz gezeichnet werden kann – mit einer Schein-Zeichenfläche, die alles schluckt.
// Fängt Fehler wie in 0.1.14 („ansicht is not defined“), die die Logik-Tests nicht sehen.
// Starten mit: node tests/zeichnen.test.mjs
import assert from 'node:assert';
import { spielStarten } from './hilfen/ohne-erster.mjs';   // ohne ersten Gottesdienst (26.11.)
import { zeichne, evangelisationsStandTrifft, symbolZeichnen } from '../src/ansicht/zeichnen.js';

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
// WC-Symbol über dem Kopf (27.11.): Erwachsene und Jugendliche mit wc: true
assert.doesNotThrow(() => zeichne(scheinCtx(), { ...karte, besucher: [{ id: 'a', x: 3, y: 3, wc: true, jugend: false, name: 'A' }, { id: 'b', x: 4, y: 3, wc: true, jugend: true, sitzt: true }] }, ansicht, {}), 'WC-Symbol lässt sich zeichnen');
// Bühne (27.11.): Kacheln, Vorschau beim Ziehen und Bild in der Bauleiste
assert.doesNotThrow(() => zeichne(scheinCtx(), { ...karte, buehne: [{ x: 3, y: 3 }, { x: 4, y: 3 }] }, ansicht, { vorschau: { art: 'buehne', x0: 1, y0: 1, x1: 3, y1: 2 } }), 'Bühne lässt sich zeichnen');
assert.doesNotThrow(() => symbolZeichnen(scheinCtx(), 'buehne', 56), 'Bühnen-Bild lässt sich zeichnen');
// Klick-Box des Stands „Evangelisation!“ (27.11.): deutlich größer als ein Kästchen, das Schild gehört dazu
{ const f = karte.evangelisation, { k, ox, oy } = ansicht, P = (x, y) => evangelisationsStandTrifft(ox + x * k, oy + y * k, ansicht, f);
  assert.ok(P(f.x + 0.5, f.y + 0.5), 'Mitte des Felds trifft');
  assert.ok(P(f.x - 0.4, f.y - 0.6) && P(f.x + 1.4, f.y + 1.2), 'auch Markise und Rand um den Stand treffen');
  assert.ok(P(f.x + 3, f.y + 0.25), 'das Schild trifft');
  assert.ok(!P(f.x - 2, f.y) && !P(f.x, f.y + 3) && !P(f.x, f.y - 2), 'weiter weg trifft nicht'); }
console.log('zeichnen: alles ok');
