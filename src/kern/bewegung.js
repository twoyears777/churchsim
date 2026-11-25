// Wo laufen die Figuren gerade? Wird aus der Spielzeit berechnet – so laufen alle bei x5 schneller
// und stehen bei Pause still. Liefert nur Positionen, zeichnet nichts.
import { GRUNDSTUECK, GEHWEGE } from '../inhalte/umgebung.js';
import { DAUER, LAUFTEMPO, ABSTAND } from '../inhalte/zeit.js';
import { moebelBei } from './moebel.js';
import { weg, glaetten } from './wege.js';

// Wegstücke werden einmal berechnet und gemerkt (Schlüssel → Pfad und Länge)
export function strecke(z, speicher, schluessel, von, nach) {
  if (!speicher.has(schluessel)) {
    const blockiert = (x, y) => !!moebelBei(z, x, y) || z.personen.some(p => p.x === x && p.y === y);
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

// Ein Besucher geht nacheinander Wegstücke: von der Straße zum Stuhl (oder bis zur Tür und wieder heim),
// nach dem Gottesdienst zum Stehplatz im Kirchkaffee und am Ende nach Hause.
export function besucherPositionen(z, speicher) {
  const L = z.lauf, t = z.minuten;
  if (!L || !L.gaeste) return [];
  const st = (s, a, b) => strecke(z, speicher, s, a, b);
  return L.gaeste.map((g, i) => {
    const s = `${L.woche}:${i}:`, start = strasse(i), t0 = L.ankunft + i * ABSTAND;
    if (t < t0) return null;
    const hin = st(s + 'hin', start, g.sitz || g.tuer);
    let ort = punktAufWeg(hin, (t - t0) * LAUFTEMPO), sitzt = !!g.sitz && !ort.unterwegs, ziel = g.sitz;
    if (!g.sitz) {   // kein Stuhl frei: wieder nach Hause
      const t1 = t0 + hin.laenge / LAUFTEMPO;
      if (t >= t1) { ort = punktAufWeg(st(s + 'heim', g.tuer, start), (t - t1) * LAUFTEMPO); if (!ort.unterwegs) return null; }
      return { id: g.id, name: g.name, x: ort.x, y: ort.y, sitzt: false };
    }
    const kaffeeBeginn = L.beginn + DAUER.gottesdienst + i * 0.5;
    if (g.kaffee && g.kaffee.platz && t >= kaffeeBeginn && !L.ausgefallen) {
      ort = punktAufWeg(st(s + 'kaffee', g.sitz, g.kaffee.platz), (t - kaffeeBeginn) * LAUFTEMPO);
      sitzt = false; ziel = g.kaffee.platz;
    }
    if (L.phase === 'ende') {
      const t2 = L.ende + i * ABSTAND * 0.5;
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

// Ehrenamtlicher an der Kaffeemaschine: holt Tasse für Tasse an der Maschine und bringt sie zur Theke.
// Liefert null, wenn die Person gerade nicht im Kirchkaffee arbeitet (dann steht sie an ihrem Platz).
export function kaffeePosition(z, p) {
  const L = z.lauf;
  if (!L || L.phase !== 'kirchkaffee' || !L.stationen) return null;
  const si = L.stationen.findIndex(s => s.ea === p.id);
  if (si < 0) return null;
  const st = L.stationen[si], t = z.minuten;
  const zeiten = L.gaeste.filter(g => g.kaffee && g.kaffee.station === si).map(g => g.kaffee.zeit).sort((a, b) => a - b);
  const zwischen = (a, b, f) => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
  const start = L.beginn + DAUER.gottesdienst;
  const anfangs = () => t - start < 5 ? zwischen(p, st.standTheke, (t - start) / 5) : st.standTheke;
  if (!zeiten.length || t >= zeiten[zeiten.length - 1]) return anfangs();
  const takt = zeiten.length > 1 ? zeiten[1] - zeiten[0] : 5;
  const j = zeiten.findIndex(h => t <= h), anfang = zeiten[j] - takt;
  if (t < anfang) return anfangs();
  const f = (t - anfang) / takt;
  if (f < 0.35) return zwischen(st.standTheke, st.standMaschine, f / 0.35);
  if (f < 0.65) return st.standMaschine;
  return zwischen(st.standMaschine, st.standTheke, (f - 0.65) / 0.35);
}
