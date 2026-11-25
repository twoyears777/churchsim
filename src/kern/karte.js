import { RAUMTYPEN } from '../inhalte/raumtypen.js';

// Spiellogik der Karte. Kennt keine Grafik und keine Bedienung.
export const LEER = 0, WAND = 1, TUER = 2;
export const BREITE = 48, HOEHE = 32;

export function neuerZustand() {
  return { version: 1, w: BREITE, h: HOEHE, zellen: new Array(BREITE * HOEHE).fill(LEER), raumTyp: {} };
}
export function idx(z, x, y) { return y * z.w + x; }
function imFeld(z, x, y) { return x >= 0 && y >= 0 && x < z.w && y < z.h; }

export function wandRechteck(z, x0, y0, x1, y1) {
  const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)], [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
    if (x === ax || x === bx || y === ay || y === by) {
      const i = idx(z, x, y);
      if (z.zellen[i] !== TUER) z.zellen[i] = WAND;
    }
  }
  abgleichen(z);
}
export function abriss(z, x0, y0, x1, y1) {
  const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)], [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) z.zellen[idx(z, x, y)] = LEER;
  abgleichen(z);
}
export function tuerUmschalten(z, x, y) {
  const i = idx(z, x, y);
  if (z.zellen[i] === WAND) z.zellen[i] = TUER;
  else if (z.zellen[i] === TUER) z.zellen[i] = WAND;
  else return false;
  abgleichen(z);
  return true;
}

// Raumerkennung: Fläche von außen "fluten"; was nicht erreicht wird, ist umschlossen.
export function erkenneRaeume(z) {
  const n = z.w * z.h, gruppe = new Int32Array(n).fill(-1), frei = i => z.zellen[i] === LEER;
  const flute = (start, g) => {
    const stapel = [start], zellen = []; gruppe[start] = g;
    while (stapel.length) {
      const i = stapel.pop(); zellen.push(i);
      const x = i % z.w, y = (i / z.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!imFeld(z, nx, ny)) continue;
        const j = idx(z, nx, ny);
        if (gruppe[j] === -1 && frei(j)) { gruppe[j] = g; stapel.push(j); }
      }
    }
    return zellen;
  };
  for (let x = 0; x < z.w; x++) for (const y of [0, z.h - 1]) { const i = idx(z, x, y); if (frei(i) && gruppe[i] === -1) flute(i, -2); }
  for (let y = 0; y < z.h; y++) for (const x of [0, z.w - 1]) { const i = idx(z, x, y); if (frei(i) && gruppe[i] === -1) flute(i, -2); }
  const raeume = [];
  for (let i = 0; i < n; i++) {
    if (!frei(i) || gruppe[i] !== -1) continue;
    const zellen = flute(i, raeume.length);
    let tueren = 0;
    const gezaehlt = new Set();
    for (const c of zellen) {
      const x = c % z.w, y = (c / z.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = idx(z, x + dx, y + dy);
        if (z.zellen[j] === TUER && !gezaehlt.has(j)) { gezaehlt.add(j); tueren++; }
      }
    }
    let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
    for (const c of zellen) { const x = c % z.w, y = (c / z.w) | 0; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    raeume.push({ nr: raeume.length, zellen, tueren, box: { minX, minY, maxX, maxY } });
  }
  return { raeume, gruppe };
}

// Passt ein Rechteck a×b (in beiden Richtungen) vollständig in die Fläche?
export function passtGroesse(z, zellen, a, b) {
  const W = z.w, H = z.h, s = new Int32Array((W + 1) * (H + 1)), drin = new Uint8Array(W * H);
  for (const c of zellen) drin[c] = 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    s[(y + 1) * (W + 1) + x + 1] = drin[y * W + x] + s[y * (W + 1) + x + 1] + s[(y + 1) * (W + 1) + x] - s[y * (W + 1) + x];
  const summe = (x, y, w, h) => s[(y + h) * (W + 1) + x + w] - s[y * (W + 1) + x + w] - s[(y + h) * (W + 1) + x] + s[y * (W + 1) + x];
  for (const [w, h] of [[a, b], [b, a]])
    for (let y = 0; y + h <= H; y++) for (let x = 0; x + w <= W; x++) if (summe(x, y, w, h) === w * h) return true;
  return false;
}

export function pruefeRaum(z, raum, typ) {
  const probleme = [];
  if (raum.tueren === 0) probleme.push('tuer');
  if (typ && !passtGroesse(z, raum.zellen, typ.minGroesse[0], typ.minGroesse[1])) probleme.push('groesse');
  return probleme;
}

// Nach jeder Baumaßnahme: Raumfunktionen den neu erkannten Räumen zuordnen.
function abgleichen(z) {
  const { raeume } = erkenneRaeume(z), neu = {};
  for (const r of raeume) {
    const zaehler = {};
    for (const c of r.zellen) { const t = z.raumTyp[c]; if (t) zaehler[t] = (zaehler[t] || 0) + 1; }
    const typ = Object.keys(zaehler).sort((p, q) => zaehler[q] - zaehler[p])[0];
    if (typ) for (const c of r.zellen) neu[c] = typ;
  }
  z.raumTyp = neu;
}
export function raumTypVon(z, raum) { return RAUMTYPEN.find(t => t.id === z.raumTyp[raum.zellen[0]]) || null; }
export function typZuweisen(z, raum, typId) {
  for (const c of raum.zellen) { if (typId) z.raumTyp[c] = typId; else delete z.raumTyp[c]; }
}

