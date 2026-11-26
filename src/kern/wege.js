// Wegsuche auf dem Raster: günstigster Weg um Wände und Möbel herum (Türen sind offen).
// Jedes Kästchen hat einen „Preis“: Weg kostet 1, Wiese sehr viel (WEGFINDUNG.wiese). So laufen Figuren über Wege,
// wann immer es möglich ist, und über so wenig Wiese wie nötig; bei gleich viel Wiese nehmen sie den kürzesten Weg.
import { WAND, FENSTER, TUER, idx, aufGrundstueck, erkenneRaeume } from './karte.js';
import { felder } from './moebel.js';
import { GRUNDSTUECK, GEHWEGE } from '../inhalte/umgebung.js';
import { WEGFINDUNG } from '../inhalte/gelaende.js';

// Welche Kästchen sind Wiese? (1 = Wiese, 0 = Weg) – Weg sind Wegteile, Gehweg, Türen und Boden in Räumen.
export function wiesenKarte(z) {
  const wiese = new Uint8Array(z.w * z.h).fill(1), gruppe = erkenneRaeume(z).gruppe;
  for (let i = 0; i < wiese.length; i++) if (gruppe[i] >= 0 || z.zellen[i] === TUER) wiese[i] = 0;
  const frei = (x, y) => { if (x >= 0 && y >= 0 && x < z.w && y < z.h) wiese[idx(z, x, y)] = 0; };
  for (const g of GEHWEGE) for (let y = g.y; y < g.y + g.h; y++) for (let x = g.x; x < g.x + g.w; x++) frei(x, y);
  for (const m of z.moebel || []) if (WEGFINDUNG.wegTeile.includes(m.art)) for (const f of felder(m)) frei(f.x, f.y);
  return wiese;
}

// Kleiner Haufen (Prioritätsschlange): holt immer das Kästchen mit den niedrigsten Kosten zuerst.
function haufen() {
  const k = [], v = [];
  return {
    get leer() { return !k.length; },
    rein(kosten, wert) {
      let i = k.length; k.push(kosten); v.push(wert);
      while (i > 0) { const e = (i - 1) >> 1; if (k[e] <= k[i]) break; [k[e], k[i]] = [k[i], k[e]]; [v[e], v[i]] = [v[i], v[e]]; i = e; }
    },
    raus() {
      const wert = v[0], lk = k.pop(), lv = v.pop();
      if (k.length) {
        k[0] = lk; v[0] = lv;
        for (let i = 0; ;) {
          const a = 2 * i + 1, b = a + 1; let m = i;
          if (a < k.length && k[a] < k[m]) m = a;
          if (b < k.length && k[b] < k[m]) m = b;
          if (m === i) break;
          [k[m], k[i]] = [k[i], k[m]]; [v[m], v[i]] = [v[i], v[m]]; i = m;
        }
      }
      return wert;
    }
  };
}

// Der Zaun: zwischen Grundstück und draußen kommt man nur durch das Tor (unten).
function durchZaun(x, y, nx, ny) {
  if (aufGrundstueck(x, y) === aufGrundstueck(nx, ny)) return true;
  if (x !== nx && y !== ny) return false;          // schräg über den Zaun geht nicht
  const g = GRUNDSTUECK, unten = g.y + g.h - 1;
  return x === nx && x >= g.tor.x && x < g.tor.x + g.tor.breite && Math.min(y, ny) === unten;
}

export function weg(z, start, ziel, blockiert = () => false, wiese = wiesenKarte(z)) {
  const n = z.w * z.h, vorher = new Int32Array(n).fill(-1), kosten = new Float64Array(n).fill(Infinity);
  const s = idx(z, start.x, start.y), e = idx(z, ziel.x, ziel.y), fertig = new Uint8Array(n);
  const h = haufen(); kosten[s] = 0; vorher[s] = s; h.rein(0, s);
  while (!h.leer) {
    const i = h.raus();
    if (fertig[i]) continue;
    fertig[i] = 1;
    if (i === e) break;
    const x = i % z.w, y = (i / z.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= z.w || ny >= z.h) continue;
      const j = idx(z, nx, ny);
      if (fertig[j] || z.zellen[j] === WAND || z.zellen[j] === FENSTER || !durchZaun(x, y, nx, ny) || (j !== e && blockiert(nx, ny))) continue;
      const k = kosten[i] + (wiese[j] ? WEGFINDUNG.wiese : 1);
      if (k < kosten[j]) { kosten[j] = k; vorher[j] = i; h.rein(k, j); }
    }
  }
  if (vorher[e] === -1) return null;
  const pfad = [];
  for (let i = e; i !== s; i = vorher[i]) pfad.push({ x: i % z.w, y: (i / z.w) | 0 });
  pfad.push({ x: start.x, y: start.y });
  return pfad.reverse();
}

// Weg glätten: Statt Kästchen für Kästchen (eckig) gehen Figuren direkt auf den am weitesten
// entfernten Punkt zu, den sie ohne Hindernis erreichen – das wirkt natürlich und schräg.
// Eine Abkürzung ist nur erlaubt, wenn sie über nicht mehr Wiesen-Kästchen führt als der Weg selbst an dieser Stelle:
// auf freier Wiese geht man weiter schräg, vom Weg aus schneidet aber niemand übers Gras.
export function glaetten(z, pfad, blockiert = () => false, wiese = wiesenKarte(z)) {
  if (!pfad || pfad.length < 3) return pfad;
  const ziel = pfad[pfad.length - 1];
  const bisher = [0];   // bisher[i] = Wiesen-Kästchen des Wegs bis Punkt i
  for (let i = 1; i < pfad.length; i++) bisher.push(bisher[i - 1] + wiese[idx(z, pfad[i].x, pfad[i].y)]);
  const frei = (a, b, erlaubt) => {
    const gras = new Set();
    const schritte = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4);
    let vx = a.x, vy = a.y;
    for (let i = 1; i <= schritte; i++) {
      const t = i / schritte, px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t;
      // etwas „Körperbreite“ prüfen, damit niemand durch Wandecken schlüpft
      for (const [ox, oy] of [[0, 0], [0.3, 0.3], [-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3]]) {
        const cx = Math.round(px + ox), cy = Math.round(py + oy);
        if (cx < 0 || cy < 0 || cx >= z.w || cy >= z.h) return false;
        const c = idx(z, cx, cy);
        if (z.zellen[c] === WAND || z.zellen[c] === FENSTER) return false;
        const amEnde = (cx === b.x && cy === b.y) || (cx === a.x && cy === a.y);
        if (!amEnde && blockiert(cx, cy)) return false;
      }
      const nx = Math.round(px), ny = Math.round(py);
      if (wiese[idx(z, nx, ny)] && !(nx === a.x && ny === a.y)) { gras.add(idx(z, nx, ny)); if (gras.size > erlaubt) return false; }
      if ((nx !== vx || ny !== vy) && !durchZaun(vx, vy, nx, ny)) return false;
      vx = nx; vy = ny;
    }
    return true;
  };
  const ergebnis = [pfad[0]];
  let i = 0;
  while (i < pfad.length - 1) {
    let j = pfad.length - 1;
    while (j > i + 1 && !frei(pfad[i], pfad[j], bisher[j] - bisher[i])) j--;
    ergebnis.push(pfad[j]); i = j;
  }
  if (ergebnis[ergebnis.length - 1] !== ziel) ergebnis.push(ziel);
  return ergebnis;
}
