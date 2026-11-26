// Prüft die Wegfindung: Figuren laufen über Wege, wann immer es möglich ist (Spielprinzip „Wegfindung“, 26.11.).
// Starten mit: node tests/wegfindung.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { neuerZustand, wandRechteck, tuerUmschalten, idx } from '../src/kern/karte.js';
import { weg, glaetten, wiesenKarte } from '../src/kern/wege.js';
import { strasse } from '../src/kern/bewegung.js';

const wegBauen = (z, art, x0, y0, x1, y1) => {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) z.moebel.push({ art, x, y });
};
const wiesenZahl = (z, pfad) => { const w = wiesenKarte(z); return pfad.slice(1).filter(p => w[idx(z, p.x, p.y)]).length; };
// Alle Punkte eines geglätteten Wegs fein abtasten: über wie viele Wiesen-Kästchen läuft die Figur wirklich?
const wiesenUnterwegs = (z, pfad) => {
  const w = wiesenKarte(z), gras = new Set();
  for (let i = 0; i < pfad.length - 1; i++) {
    const a = pfad[i], b = pfad[i + 1], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4);
    for (let k = 1; k <= n; k++) { const x = Math.round(a.x + (b.x - a.x) * k / n), y = Math.round(a.y + (b.y - a.y) * k / n); if (w[idx(z, x, y)]) gras.add(idx(z, x, y)); }
  }
  return gras.size;
};

// Was als Weg zählt: Weg, Straße, Parkplatz, Gehweg, Tür, Boden im Raum – sonst Wiese
{
  const z = neuerZustand(), x = G.x + 3, y = G.y + 3;
  wegBauen(z, 'weg', x, y, x, y); wegBauen(z, 'strasse', x + 1, y, x + 1, y); wegBauen(z, 'parkplatz', x + 2, y, x + 2, y);
  wandRechteck(z, x + 6, y, x + 10, y + 4); tuerUmschalten(z, x + 8, y + 4);
  const w = wiesenKarte(z), ist = (a, b) => w[idx(z, a, b)];
  assert.equal(ist(x, y), 0); assert.equal(ist(x + 1, y), 0); assert.equal(ist(x + 2, y), 0);
  assert.equal(ist(x + 3, y), 0); assert.equal(ist(x + 4, y), 1);   // Parkplatz ist 2 Kästchen breit, daneben Wiese
  assert.equal(ist(x + 8, y + 2), 0); assert.equal(ist(x + 8, y + 4), 0);   // Boden im Raum, Tür
  const s = strasse(0); assert.equal(ist(s.x, s.y), 0);             // Gehweg vor dem Tor
}

// Umweg über den Weg statt quer über die Wiese – auch nach dem Glätten
{
  const z = neuerZustand(), a = { x: G.x + 2, y: G.y + 2 }, b = { x: G.x + 12, y: G.y + 2 };
  assert.equal(wiesenZahl(z, weg(z, a, b)), 10);                    // ohne Weg: gerade über die Wiese
  // Weg als „U“: runter, rüber, wieder hoch (6 Kästchen Umweg)
  wegBauen(z, 'weg', a.x, a.y, a.x, a.y + 3); wegBauen(z, 'weg', a.x, a.y + 3, b.x, a.y + 3); wegBauen(z, 'weg', b.x, a.y + 3, b.x, b.y);
  const p = weg(z, a, b);
  assert.equal(wiesenZahl(z, p), 0);
  assert.equal(p.length, 1 + 3 + 10 + 3);
  assert.equal(wiesenUnterwegs(z, glaetten(z, p)), 0);              // niemand schneidet die Ecken übers Gras
}

// Weg hört vor dem Ziel auf: so weit wie möglich auf dem Weg, dann nur so viel Wiese wie nötig
{
  const z = neuerZustand(), a = { x: G.x + 2, y: G.y + 10 }, b = { x: G.x + 15, y: G.y + 10 };
  wegBauen(z, 'weg', a.x, a.y, a.x + 10, a.y);
  const p = weg(z, a, b);
  assert.equal(wiesenZahl(z, p), 3);
  assert.ok(wiesenUnterwegs(z, glaetten(z, p)) <= 3);
}

// Auf freier Wiese (kein Weg in der Nähe) gehen Figuren weiter direkt schräg
{
  const z = neuerZustand(), p = weg(z, { x: G.x + 2, y: G.y + 2 }, { x: G.x + 12, y: G.y + 9 });
  assert.equal(glaetten(z, p).length, 2);
}

// Vom Gehweg durchs Tor zur Kirchentür: liegt ein Weg, bleibt man darauf
{
  const z = neuerZustand(), tor = G.tor.x + 1, unten = G.y + G.h - 1;
  wandRechteck(z, tor - 3, G.y + 5, tor + 3, G.y + 11); tuerUmschalten(z, tor, G.y + 11);
  wegBauen(z, 'weg', tor, G.y + 12, tor, unten);
  const start = strasse(1), p = weg(z, start, { x: tor, y: G.y + 8 });
  assert.ok(wiesenZahl(z, p) <= 1, `Wiese: ${wiesenZahl(z, p)}`);  // höchstens das Stück zwischen Zaun und Gehweg
  assert.ok(wiesenUnterwegs(z, glaetten(z, p)) <= wiesenZahl(z, p));
}

// Schnell genug: viele Wegsuchen über die ganze Karte
{
  const z = neuerZustand(), t = Date.now();
  for (let i = 0; i < 200; i++) weg(z, strasse(i % 4), { x: G.x + 1 + (i % 30), y: G.y + 1 });
  assert.ok(Date.now() - t < 2000, `zu langsam: ${Date.now() - t} ms`);
}
console.log('Wegfindung: alle Tests bestanden.');
