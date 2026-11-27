// Wo laufen die Figuren gerade? Wird aus der Spielzeit berechnet – so laufen alle bei x5 schneller
// und stehen bei Pause still. Liefert nur Positionen, zeichnet nichts.
import { GRUNDSTUECK, GEHWEGE } from '../inhalte/umgebung.js';
import { LAUFTEMPO, ABSTAND, DAUER } from '../inhalte/zeit.js';
import { hindernisBei } from './moebel.js';
import { weg, glaetten } from './wege.js';
import { gangBei, gangOrt, losZeit } from './toiletten.js';

// Wegstücke werden einmal berechnet und gemerkt (Schlüssel → Pfad und Länge)
export function strecke(z, speicher, schluessel, von, nach) {
  if (!speicher.has(schluessel)) {
    const blockiert = (x, y) => hindernisBei(z, x, y) || z.personen.some(p => p.x === x && p.y === y);
    const pfad = glaetten(z, weg(z, von, nach, blockiert), blockiert) || [von, nach];
    let laenge = 0;
    for (let i = 0; i < pfad.length - 1; i++) laenge += Math.hypot(pfad[i + 1].x - pfad[i].x, pfad[i + 1].y - pfad[i].y);
    speicher.set(schluessel, { pfad, laenge });
  }
  return speicher.get(schluessel);
}
export function punktAufWeg({ pfad }, d) {
  for (let i = 0; i < pfad.length - 1; i++) {
    const a = pfad[i], c = pfad[i + 1], len = Math.hypot(c.x - a.x, c.y - a.y);
    if (d <= len) { const f = len ? d / len : 1; return { x: a.x + (c.x - a.x) * f, y: a.y + (c.y - a.y) * f, unterwegs: true }; }
    d -= len;
  }
  const e = pfad[pfad.length - 1];
  return { x: e.x, y: e.y, unterwegs: false };
}
// Startpunkt auf dem Gehweg vor dem Tor
export function strasse(i) {
  const g = GRUNDSTUECK, gehweg = GEHWEGE.find(w => w.w > w.h && w.y >= g.y + g.h);
  return { x: g.tor.x + (i % g.tor.breite), y: gehweg ? gehweg.y : g.y + g.h + 1 };
}

// Ein Besucher geht nacheinander Wegstücke: von der Straße zum Stuhl (oder bis zur Tür und wieder heim)
// und am Ende nach Hause. Wer nach dem Gottesdienst Kaffee will, wird ab dann vom Kirchkaffee gezeigt (kirchkaffee.js).
// Bei mehreren Abläufen zählt der jüngste: Wer schon zur nächsten Veranstaltung unterwegs ist, wird nur dort gezeigt.
export function besucherPositionen(z, speicher) {
  const gezeigt = new Set(), alle = [];
  for (const L of (z.laeufe || []).slice().reverse()) {
    for (const b of laufPositionen(z, speicher, L)) if (!gezeigt.has(b.id)) { gezeigt.add(b.id); alle.push(b); }
  }
  return alle;
}
function laufPositionen(z, speicher, L) {
  const t = z.minuten;
  if (!L.gaeste) return [];
  const st = (s, a, b) => strecke(z, speicher, s, a, b);
  return L.gaeste.map((g, i) => {
    const s = `${L.id}:${i}:`, start = strasse(i), t0 = losZeit(L, g, i);
    if (t < t0) return null;
    const hin = st(s + 'hin', start, g.sitz || g.tuer);
    let ort = punktAufWeg(hin, (t - t0) * LAUFTEMPO), sitzt = !!g.sitz && !ort.unterwegs, ziel = g.sitz;
    // Toilettengang (26.11., toiletten.js): solange er läuft, zeigt er, wo die Person ist
    const gang = gangBei(g, t), wc = gg => ({ id: g.id, name: g.name, ...gangOrt(gg, t, st, punktAufWeg, s + 'wc' + g.gaenge.indexOf(gg)), sitzt: false });
    const vorher = (g.gaenge || []).find(x => x.art === 'vorher');
    if (vorher) { if (t < vorher.zurueckBis) return wc(vorher); ort = { x: g.sitz.x, y: g.sitz.y, unterwegs: false }; sitzt = true; }
    if (!g.sitz) {   // kein Stuhl frei: wieder nach Hause
      const t1 = t0 + hin.laenge / LAUFTEMPO;
      if (t >= t1) { ort = punktAufWeg(st(s + 'heim', g.tuer, start), (t - t1) * LAUFTEMPO); if (!ort.unterwegs) return null; }
      return { id: g.id, name: g.name, x: ort.x, y: ort.y, sitzt: false };
    }
    if (g.kaffee && typeof g.kaffee.ab === 'number' && t >= g.kaffee.ab) return null;   // steht jetzt im Kirchkaffee an
    if (gang && (gang.art === 'sitz' || gang.art === 'automat')) return wc(gang);   // Toilette oder Automat (26.11.), danach zurück an den Platz
    const heimGang = (g.gaenge || []).find(x => x.art === 'heim' || x.art === 'automatHeim');   // über Toilette oder Automat (26.11.) nach Hause
    if (heimGang && t >= heimGang.hinAb) return t < heimGang.zurueckBis ? wc(heimGang) : null;   // über die Toilette nach Hause
    // Heimweg: wer keinen Kaffee will, gleich nach dem Gottesdienst; sonst (und bei Ausfall) am Ende.
    // Alte Spielstände ohne gottesdienstEnde: Ende = Beginn + Dauer des Gottesdienstes.
    const ohneKaffee = !L.ausgefallen && !(g.kaffee && typeof g.kaffee.ab === 'number');
    const gdEnde = typeof L.gottesdienstEnde === 'number' ? L.gottesdienstEnde : L.beginn + DAUER.gottesdienst;
    const heimAb = L.phase === 'kirchkaffee' && ohneKaffee ? gdEnde : L.phase === 'ende' ? (ohneKaffee ? gdEnde : L.ende) : null;
    if (heimAb !== null) {
      const t2 = heimAb + i * ABSTAND * 0.5;
      if (t >= t2) {
        const von = L.ausgefallen ? { x: Math.round(ort.x), y: Math.round(ort.y) } : ziel;
        ort = punktAufWeg(st(s + 'ende', von, start), (t - t2) * LAUFTEMPO);
        if (!ort.unterwegs) return null;
        sitzt = false;
      }
    }
    return { id: g.id, name: g.name, x: ort.x, y: ort.y, sitzt };
  }).filter(Boolean);
}
