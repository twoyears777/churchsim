import { RAUMTYPEN } from '../inhalte/raumtypen.js';
import { WELT, GRUNDSTUECK } from '../inhalte/umgebung.js';
import { STARTGELD } from '../inhalte/finanzen.js';

// Spiellogik der Karte. Kennt keine Grafik und keine Bedienung.
// FENSTER: ein Wandstück mit Fenster – zählt überall als Wand (man kann nicht hindurchgehen, es schließt Räume ab).
export const LEER = 0, WAND = 1, TUER = 2, FENSTER = 3;
export const istWandStueck = t => t === WAND || t === TUER || t === FENSTER;

export function neuerZustand() {
  return { version: 2, w: WELT.w, h: WELT.h, zellen: new Array(WELT.w * WELT.h).fill(LEER), raumTyp: {}, veranstaltung: {}, moebel: [], personen: [], woche: 0, konto: STARTGELD, wochenbuch: { einnahmen: {}, ausgaben: {} }, baukosten: true, tuerkosten: true };   // baukosten/tuerkosten: Spielstand kennt die Baukosten bzw. den Türpreis schon
}
export function idx(z, x, y) { return y * z.w + x; }
function imFeld(z, x, y) { return x >= 0 && y >= 0 && x < z.w && y < z.h; }
// Nur auf dem eigenen Grundstück darf gebaut werden.
export function aufGrundstueck(x, y) {
  const g = GRUNDSTUECK;
  return x >= g.x && y >= g.y && x < g.x + g.w && y < g.y + g.h;
}
function begrenzen(x0, y0, x1, y1) {
  const g = GRUNDSTUECK, kx = v => Math.max(g.x, Math.min(g.x + g.w - 1, v)), ky = v => Math.max(g.y, Math.min(g.y + g.h - 1, v));
  return [kx(x0), ky(y0), kx(x1), ky(y1)];
}

// Wie viele Wandstücke kämen neu dazu? (Kästchen am Rand des Rechtecks, auf denen noch keine Wand steht – fürs Bezahlen)
export function neueWandStuecke(z, x0, y0, x1, y1) {
  [x0, y0, x1, y1] = begrenzen(x0, y0, x1, y1);
  const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)], [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
  let n = 0;
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++)
    if ((x === ax || x === bx || y === ay || y === by) && z.zellen[idx(z, x, y)] === LEER) n++;
  return n;
}
// Baut die Wände; Türen und Fenster bleiben, wie sie sind. → Anzahl der neuen Wandstücke
export function wandRechteck(z, x0, y0, x1, y1) {
  [x0, y0, x1, y1] = begrenzen(x0, y0, x1, y1);
  const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)], [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
  let neu = 0;
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
    if (x === ax || x === bx || y === ay || y === by) {
      const i = idx(z, x, y);
      if (z.zellen[i] === LEER) { z.zellen[i] = WAND; neu++; }
    }
  }
  abgleichen(z);
  return neu;
}
// Reißt alles im Rechteck ab. → was weg ist (fürs Erstatten): { waende: Wandstücke inkl. Türen/Fenster, fenster, tueren, gratis }
// gratis: Wandstücke aus alten Spielständen, die nichts gekostet haben (z.gratisWaende) – dafür gibt es kein Geld zurück.
// Genauso Türen aus Spielständen vor dem Türpreis (z.gratisTueren): für sie gibt es den Türpreis nicht zurück.
export function abriss(z, x0, y0, x1, y1) {
  [x0, y0, x1, y1] = begrenzen(x0, y0, x1, y1);
  const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)], [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
  const gratis = new Set(z.gratisWaende || []), gratisTueren = new Set(z.gratisTueren || []), weg = { waende: 0, fenster: 0, tueren: 0, gratis: 0 };
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
    const i = idx(z, x, y), t = z.zellen[i];
    if (istWandStueck(t)) { if (gratis.delete(i)) weg.gratis++; else weg.waende++; }
    if (t === FENSTER) weg.fenster++;
    if (t === TUER && !gratisTueren.delete(i)) weg.tueren++;
    z.zellen[i] = LEER;
  }
  if (z.gratisWaende) z.gratisWaende = [...gratis];
  if (z.gratisTueren) z.gratisTueren = [...gratisTueren];
  abgleichen(z);
  return weg;
}
// Fenster setzen (auf eine Wand) oder wieder zur Wand machen. → 'gesetzt' | 'entfernt' | false
export function fensterUmschalten(z, x, y) {
  if (!aufGrundstueck(x, y)) return false;
  const i = idx(z, x, y);
  if (z.zellen[i] === WAND) z.zellen[i] = FENSTER;
  else if (z.zellen[i] === FENSTER) z.zellen[i] = WAND;
  else return false;
  return z.zellen[i] === FENSTER ? 'gesetzt' : 'entfernt';
}
// Fenster in den Wänden rund um einen Raum (jedes Fenster, das direkt an ein Kästchen des Raums grenzt)
export function fensterAnRaum(z, raum) {
  const gesehen = new Set();
  for (const c of raum.zellen) {
    const x = c % z.w, y = (c / z.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!imFeld(z, x + dx, y + dy)) continue;
      const j = idx(z, x + dx, y + dy);
      if (z.zellen[j] === FENSTER) gesehen.add(j);
    }
  }
  return gesehen.size;
}
// Tür setzen (auf eine Wand) oder wieder zur Wand machen. → 'gesetzt' | 'entfernt' | false
export function tuerUmschalten(z, x, y) {
  if (!aufGrundstueck(x, y)) return false;
  const i = idx(z, x, y);
  if (z.zellen[i] === WAND) z.zellen[i] = TUER;
  else if (z.zellen[i] === TUER) z.zellen[i] = WAND;
  else return false;
  abgleichen(z);
  return z.zellen[i] === TUER ? 'gesetzt' : 'entfernt';
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
  if (typ && typ.verbindungZu && !hatVerbindungZu(z, raum, typ.verbindungZu)) probleme.push('verbindung');
  return probleme;
}

// Gibt es eine Tür, die diesen Raum direkt mit einem Raum des gesuchten Typs verbindet?
export function hatVerbindungZu(z, raum, typId) {
  const eigene = new Set(raum.zellen), nachbarn = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const c of raum.zellen) {
    const x = c % z.w, y = (c / z.w) | 0;
    for (const [dx, dy] of nachbarn) {
      const tx = x + dx, ty = y + dy;
      if (!imFeld(z, tx, ty) || z.zellen[idx(z, tx, ty)] !== TUER) continue;
      for (const [ex, ey] of nachbarn) {
        const ax = tx + ex, ay = ty + ey;
        if (!imFeld(z, ax, ay)) continue;
        const a = idx(z, ax, ay);
        if (!eigene.has(a) && z.zellen[a] === LEER && z.raumTyp[a] === typId) return true;
      }
    }
  }
  return false;
}

// Nach jeder Baumaßnahme: Raumfunktionen den neu erkannten Räumen zuordnen.
// Gilt für Raumfunktion, eingestellte Veranstaltungen und Kirchkaffee-Öffnungszeiten gleichermaßen.
// Die Werte können Listen sein (z. B. Veranstaltung 1 und 2 mit Tag und Uhrzeit): Sie werden darum als Text
// verglichen und unverändert übernommen – nicht in Text umgewandelt (sonst gingen die Einstellungen verloren).
function abgleichen(z) {
  const { raeume } = erkenneRaeume(z);
  for (const feld of ['raumTyp', 'veranstaltung', 'kaffeeZeiten']) {
    if (!z[feld]) { if (feld === 'kaffeeZeiten') continue; z[feld] = {}; }
    const neu = {};
    for (const r of raeume) {
      const zaehler = new Map();
      for (const c of r.zellen) {
        const t = z[feld][c];
        if (!t) continue;
        const k = JSON.stringify(t), e = zaehler.get(k);
        if (e) e.n++; else zaehler.set(k, { n: 1, wert: t });
      }
      const best = [...zaehler.values()].sort((p, q) => q.n - p.n)[0];
      if (best) for (const c of r.zellen) neu[c] = typeof best.wert === 'object' ? JSON.parse(JSON.stringify(best.wert)) : best.wert;
    }
    z[feld] = neu;
  }
}
export function raumTypVon(z, raum) { return RAUMTYPEN.find(t => t.id === z.raumTyp[raum.zellen[0]]) || null; }
export function typZuweisen(z, raum, typId) {
  const alt = z.raumTyp[raum.zellen[0]];
  for (const c of raum.zellen) { if (typId) z.raumTyp[c] = typId; else delete z.raumTyp[c]; }
  if (alt !== typId && z.veranstaltung) for (const c of raum.zellen) delete z.veranstaltung[c];   // neue Funktion: Veranstaltung zurücksetzen
}

