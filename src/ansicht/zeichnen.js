// Darstellung: malt den Zustand der Karte auf die Zeichenfläche. Ändert selbst nichts.
import { WAND, TUER, idx } from '../kern/karte.js';

// Platzhalter-Farben – das Design legt Lukas fest.
export const FARBEN = {
  aussen: '#dcd8cc', raster: 'rgba(0,0,0,0.07)', boden: '#f3efe6',
  wand: '#3a3935', tuer: '#a8794a', tuerHell: '#d2a878',
  vorschauWand: 'rgba(45,105,190,0.45)', vorschauAbriss: 'rgba(200,55,45,0.30)',
  auswahl: '#2d69be', text: '#2b2a27', fehler: '#b3261e'
};

export function zeichne(ctx, z, raeume, ansicht, extra = {}) {
  const { k, ox, oy } = ansicht; // k = Kästchengröße in Pixeln, ox/oy = Versatz
  const { gruppe, liste } = raeume;
  ctx.fillStyle = FARBEN.aussen;
  ctx.fillRect(ox, oy, z.w * k, z.h * k);

  // Böden der Räume
  for (const r of liste) {
    ctx.fillStyle = r.typ ? r.typ.farbe : FARBEN.boden;
    for (const c of r.zellen) ctx.fillRect(ox + (c % z.w) * k, oy + ((c / z.w) | 0) * k, k, k);
  }

  // Raster
  ctx.strokeStyle = FARBEN.raster; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 0; x <= z.w; x++) { ctx.moveTo(ox + x * k + 0.5, oy); ctx.lineTo(ox + x * k + 0.5, oy + z.h * k); }
  for (let y = 0; y <= z.h; y++) { ctx.moveTo(ox, oy + y * k + 0.5); ctx.lineTo(ox + z.w * k, oy + y * k + 0.5); }
  ctx.stroke();

  // Wände und Türen
  for (let y = 0; y < z.h; y++) for (let x = 0; x < z.w; x++) {
    const t = z.zellen[idx(z, x, y)], px = ox + x * k, py = oy + y * k;
    if (t === WAND) {
      ctx.fillStyle = FARBEN.wand; ctx.fillRect(px, py, k, k);
    } else if (t === TUER) {
      ctx.fillStyle = FARBEN.tuer; ctx.fillRect(px, py, k, k);
      ctx.fillStyle = FARBEN.tuerHell; ctx.fillRect(px + k * 0.2, py + k * 0.2, k * 0.6, k * 0.6);
    }
  }

  // Auswahl
  if (extra.auswahl != null) {
    const r = liste[extra.auswahl];
    if (r) {
      ctx.strokeStyle = FARBEN.auswahl; ctx.lineWidth = 3;
      const b = r.box;
      ctx.strokeRect(ox + b.minX * k + 1.5, oy + b.minY * k + 1.5, (b.maxX - b.minX + 1) * k - 3, (b.maxY - b.minY + 1) * k - 3);
    }
  }

  // Beschriftung der Räume
  const schrift = Math.max(11, Math.min(18, k * 0.75));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const r of liste) {
    const b = r.box, cx = ox + (b.minX + b.maxX + 1) / 2 * k, cy = oy + (b.minY + b.maxY + 1) / 2 * k;
    ctx.font = `500 ${schrift}px system-ui, sans-serif`;
    ctx.fillStyle = FARBEN.text;
    ctx.fillText(r.typ ? r.typ.name : 'Ohne Funktion', cx, cy - (r.probleme.length ? schrift * 0.7 : 0));
    if (r.probleme.length) {
      ctx.font = `400 ${schrift * 0.85}px system-ui, sans-serif`;
      ctx.fillStyle = FARBEN.fehler;
      const t = r.probleme.map(p => p === 'tuer' ? 'Tür fehlt' : `zu klein (mind. ${r.typ.minGroesse[0]} × ${r.typ.minGroesse[1]})`).join(' · ');
      ctx.fillText(t, cx, cy + schrift * 0.7);
    }
  }

  // Vorschau beim Ziehen
  const v = extra.vorschau;
  if (v) {
    const ax = Math.min(v.x0, v.x1), bx = Math.max(v.x0, v.x1), ay = Math.min(v.y0, v.y1), by = Math.max(v.y0, v.y1);
    if (v.art === 'wand') {
      ctx.fillStyle = FARBEN.vorschauWand;
      for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++)
        if (x === ax || x === bx || y === ay || y === by) ctx.fillRect(ox + x * k, oy + y * k, k, k);
      if (bx - ax >= 2 && by - ay >= 2) {
        ctx.font = `500 ${schrift}px system-ui, sans-serif`; ctx.fillStyle = FARBEN.auswahl;
        ctx.fillText(`${bx - ax - 1} × ${by - ay - 1}`, ox + (ax + bx + 1) / 2 * k, oy + (ay + by + 1) / 2 * k);
      }
    } else {
      ctx.fillStyle = FARBEN.vorschauAbriss;
      ctx.fillRect(ox + ax * k, oy + ay * k, (bx - ax + 1) * k, (by - ay + 1) * k);
    }
  }
}
