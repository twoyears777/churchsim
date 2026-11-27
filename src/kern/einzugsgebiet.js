// Spiellogik des Einzugsgebiets: Wie viele Menschen kann die Gemeinde erreichen, und wie viele kennt sie schon?
// Grenze = Start + angeschlossene Parkplätze + Bushaltestelle (Stufen) + Werbekampagne.
// Kennt keine Grafik: liefert nur Zahlen und Zustände.
import { EINZUGSGEBIET, PARKPLATZ, BUSHALTESTELLE, WERBEKAMPAGNE } from '../inhalte/einzugsgebiet.js';
import { GRUNDSTUECK } from '../inhalte/umgebung.js';
import { erkenneRaeume } from './karte.js';
import { felder } from './moebel.js';
import { kannBezahlen, buchen } from './finanzen.js';

export function einzugsgebietAnlegen(z) {
  if (typeof z.bus !== 'number') z.bus = 0;               // Stufe der Bushaltestelle (0 = keine)
  if (typeof z.werbekampagne !== 'boolean') z.werbekampagne = false;
}

// Liegt ein Kästchen draußen, also in keinem Raum? (gruppe aus erkenneRaeume; Räume haben Nummern ≥ 0)
const draussen = (z, gruppe, x, y) => gruppe[y * z.w + x] < 0;

// Parkplätze: Eine Straße, die (über andere Straßenstücke) bis ins Tor führt, ist angeschlossen.
// Ein Parkplatz zählt, wenn er direkt an einem angeschlossenen Straßenstück liegt. Beides nur draußen, nicht in Räumen.
// Rückgabe: Kennungen "x,y" der angeschlossenen Straßen- und Parkplatz-Stücke.
export function parkplaetzeAuswerten(z, gruppe = erkenneRaeume(z).gruppe) {
  const g = GRUNDSTUECK, torY = g.y + g.h - 1, key = (x, y) => `${x},${y}`;
  const strassen = new Map(), angeschlossen = new Set(), parkplaetze = [];
  for (const m of z.moebel) {
    if (m.art === 'strasse' && draussen(z, gruppe, m.x, m.y)) strassen.set(key(m.x, m.y), m);
    if (m.art === 'parkplatz' && felder(m).every(f => draussen(z, gruppe, f.x, f.y))) parkplaetze.push(m);
  }
  const stapel = [...strassen.values()].filter(m => m.y === torY && m.x >= g.tor.x && m.x < g.tor.x + g.tor.breite);
  for (const m of stapel) angeschlossen.add(key(m.x, m.y));
  while (stapel.length) {
    const m = stapel.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = key(m.x + dx, m.y + dy), n = strassen.get(k);
      if (n && !angeschlossen.has(k)) { angeschlossen.add(k); stapel.push(n); }
    }
  }
  let verbunden = 0;
  for (const p of parkplaetze) {
    const an = felder(p).some(f => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => angeschlossen.has(key(f.x + dx, f.y + dy))));
    if (an) { verbunden++; angeschlossen.add(key(p.x, p.y)); }
  }
  return { angeschlossen, parkplaetze: z.moebel.filter(m => m.art === 'parkplatz').length, verbunden };
}

// Wie viele Menschen die Gemeinde schon kennt: Besucher + Passanten im Ort.
// Ehrenamtliche zählen seit 27.11. nicht mehr mit (Lukas): Wer Ehrenamtlicher wird, macht im Einzugsgebiet Platz für neue Menschen.
export function erreicht(z) {
  return (z.besucher || []).length + (z.ort ? z.ort.leute.length : 0);
}

// Die Grenze und woraus sie sich zusammensetzt
export function einzugsgebiet(z, gruppe) {
  const park = parkplaetzeAuswerten(z, gruppe);
  const bus = BUSHALTESTELLE.filter(s => s.stufe <= (z.bus || 0)).reduce((a, s) => a + s.plus, 0);
  const teile = { start: EINZUGSGEBIET.start, parkplatz: park.verbunden * PARKPLATZ.plus, bus, werbekampagne: z.werbekampagne ? WERBEKAMPAGNE.plus : 0 };
  const grenze = teile.start + teile.parkplatz + teile.bus + teile.werbekampagne, schon = erreicht(z);
  return { grenze, erreicht: schon, frei: Math.max(0, grenze - schon), teile, parkplaetze: park.parkplaetze, verbunden: park.verbunden };
}
// Wie viele neue Menschen dürfen noch dazukommen?
export function platzImGebiet(z) { return einzugsgebiet(z).frei; }

// Bushaltestelle kaufen bzw. eine Stufe ausbauen → 'ok' | 'max' | 'bekanntheit' | 'geld'
export function busAusbauen(z) {
  const n = BUSHALTESTELLE[z.bus || 0];
  if (!n) return 'max';
  if (z.bekanntheit < n.abBekanntheit) return 'bekanntheit';
  if (!kannBezahlen(z, n.preis)) return 'geld';
  z.bus = n.stufe;
  buchen(z, 'ausgaben', 'einzugsgebiet', n.preis, { was: 'bus' });
  return 'ok';
}
// Überregionale Werbekampagne → 'ok' | 'gekauft' | 'bekanntheit' | 'geld'
export function werbekampagneKaufen(z) {
  if (z.werbekampagne) return 'gekauft';
  if (z.bekanntheit < WERBEKAMPAGNE.abBekanntheit) return 'bekanntheit';
  if (!kannBezahlen(z, WERBEKAMPAGNE.preis)) return 'geld';
  z.werbekampagne = true;
  buchen(z, 'ausgaben', 'einzugsgebiet', WERBEKAMPAGNE.preis, { was: 'werbekampagne' });
  return 'ok';
}
