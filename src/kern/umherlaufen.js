// Umherlaufen der Mitarbeiter: Wer gerade nichts zu tun hat, geht ab und zu ein Kästchen weiter und wieder zurück.
// Das ist nur fürs Auge – der eigentliche Platz des Mitarbeiters (p.x, p.y) bleibt gleich, alle Spielregeln
// (eingesetzt in welchem Raum, Seelsorge, Wege der Besucher) rechnen weiter mit diesem Platz.
//
// So funktioniert es ohne Speicher: Aus der Uhrzeit und der Kennung des Mitarbeiters wird ausgerechnet, wo er gerade
// steht. Abwechselnd ein Takt „zu einem Nachbarkästchen“ und ein Takt „zurück an den Platz“. Dadurch braucht der
// Spielstand nichts Neues, und beim Laden eines Spielstands ist alles sofort wieder richtig.
import { LEER, idx } from './karte.js';
import { moebelBei } from './moebel.js';
import { LAUFTEMPO } from '../inhalte/zeit.js';
import { UMHERLAUFEN } from '../inhalte/mitarbeiter.js';

// Feste „Zufallszahl“ 0–1 aus Kennung und Nummer (immer dieselbe für dieselben Werte)
function wuerfel(id, n) {
  let h = 2166136261;
  const s = `${id}:${n}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 2246822507); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Freie Nachbarkästchen im eigenen Raum (schräg nur, wenn man nicht an einer Ecke vorbeischrammt)
function nachbarn(z, raum, p) {
  const zellen = new Set(raum.zellen);
  const frei = (x, y) => zellen.has(idx(z, x, y)) && z.zellen[idx(z, x, y)] === LEER && !moebelBei(z, x, y)
    && !z.personen.some(q => q !== p && q.x === x && q.y === y);
  const liste = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    if (!frei(p.x + dx, p.y + dy)) continue;
    if (dx && dy && !(frei(p.x + dx, p.y) && frei(p.x, p.y + dy))) continue;
    liste.push({ x: p.x + dx, y: p.y + dy });
  }
  return liste;
}

// Wo steht der Mitarbeiter p (Platz im Raum raum) zur Zeit t? → { x, y } (Kommazahlen beim Gehen)
export function umherPosition(z, raum, p, t = z.minuten) {
  const platz = { x: p.x, y: p.y };
  if (!raum || typeof p.x !== 'number') return platz;
  const ziele = nachbarn(z, raum, p);
  if (!ziele.length) return platz;
  const U = UMHERLAUFEN, takt = U.takt * (0.8 + 0.4 * wuerfel(p.id, 'takt'));
  const zeit = t + wuerfel(p.id, 'versatz') * 2 * takt, nr = Math.floor(zeit / takt), seit = zeit - nr * takt;
  // Ziel eines Takts: ungerade = Nachbarkästchen (oder stehen bleiben), gerade = zurück an den Platz
  const ziel = n => (n % 2 && wuerfel(p.id, 'ruhe' + n) >= U.ruhe) ? ziele[Math.floor(wuerfel(p.id, n) * ziele.length)] : platz;
  const von = ziel(nr - 1), nach = ziel(nr), weg = Math.hypot(nach.x - von.x, nach.y - von.y);
  const f = weg ? Math.min(1, seit * LAUFTEMPO * U.tempo / weg) : 1;
  return { x: von.x + (nach.x - von.x) * f, y: von.y + (nach.y - von.y) * f };
}
