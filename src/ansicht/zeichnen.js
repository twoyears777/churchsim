// Darstellung: malt den Zustand der Karte auf die Zeichenfläche. Ändert selbst nichts.
import { WAND, TUER, idx } from '../kern/karte.js';
import { ART_FARBE } from '../inhalte/mitarbeiter.js';
import { GRUNDSTUECK, STRASSEN, GEHWEGE, NACHBARN, BAEUME } from '../inhalte/umgebung.js';

// Platzhalter-Farben – das Design legt Lukas fest.
export const FARBEN = {
  gruenstreifen: '#9dbb7c', nachbarRasen: '#91b26f', hecke: '#5f8a45', rasen: '#86bf5f', rasenFleck: 'rgba(40,90,20,0.10)',
  asphalt: '#5d6064', markierung: '#e9e6dc', gehweg: '#c9c5ba', gehwegFuge: 'rgba(0,0,0,0.10)',
  zaun: '#f4efe2', zaunPfosten: '#8b7b62', baum: '#4f8a3a', baumHell: '#6aa64f', schatten: 'rgba(0,0,0,0.18)',
  raster: 'rgba(30,70,10,0.10)', stuhlSitz: '#9a6b3f', stuhlLehne: '#6e4a2a', besucher: '#5b8a72', veranstaltung: '#5a5470', konflikt: 'rgba(200,40,30,0.75)', boden: '#efe8d8',
  wand: '#3a3935', tuer: '#a8794a', tuerHell: '#d2a878',
  vorschauWand: 'rgba(45,105,190,0.45)', vorschauAbriss: 'rgba(200,55,45,0.30)',
  auswahl: '#2d69be', text: '#2b2a27', fehler: '#b3261e'
};

export function zeichne(ctx, z, raeume, ansicht, extra = {}) {
  const { k, ox, oy } = ansicht; // k = Kästchengröße in Pixeln, ox/oy = Versatz
  const { gruppe, liste } = raeume;
  umgebungZeichnen(ctx, z, ansicht);

  // Böden der Räume
  for (const r of liste) {
    ctx.fillStyle = r.typ ? r.typ.farbe : FARBEN.boden;
    for (const c of r.zellen) ctx.fillRect(ox + (c % z.w) * k, oy + ((c / z.w) | 0) * k, k, k);
  }

  // Feine Bauhilfe, nur auf dem eigenen Grundstück
  const g = GRUNDSTUECK;
  if (extra.raster) {
  ctx.strokeStyle = FARBEN.raster; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = g.x + 1; x < g.x + g.w; x++) { ctx.moveTo(ox + x * k + 0.5, oy + g.y * k); ctx.lineTo(ox + x * k + 0.5, oy + (g.y + g.h) * k); }
  for (let y = g.y + 1; y < g.y + g.h; y++) { ctx.moveTo(ox + g.x * k, oy + y * k + 0.5); ctx.lineTo(ox + (g.x + g.w) * k, oy + y * k + 0.5); }
  ctx.stroke();
  }
  zaunZeichnen(ctx, ansicht);

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

  // Kästchen unter der Maus (nur im Editor)
  if (extra.schwebe) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
    ctx.strokeRect(ox + extra.schwebe.x * k + 1, oy + extra.schwebe.y * k + 1, k - 2, k - 2);
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

  // Möbel
  for (const m of extra.moebel || []) if (m.art === 'stuhl') stuhl(ctx, ox + m.x * k, oy + m.y * k, k);

  // Besucher
  for (const b of extra.besucher || []) if (b.sichtbar) {
    const cx = ox + (b.x + 0.5) * k, cy = oy + (b.y + 0.5) * k, r = Math.max(5, k * 0.32);
    ctx.fillStyle = FARBEN.schatten; ctx.beginPath(); ctx.arc(cx + r * 0.2, cy + r * 0.3, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = FARBEN.besucher; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // Vornamen klein neben den Besuchern
  ctx.font = `500 11px system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (const b of extra.besucher || []) if (b.sichtbar && b.name && !b.sitzt) { // beim Hinsetzen verschwindet der Name
    const cx = ox + (b.x + 0.5) * k + Math.max(5, k * 0.32) + 2, cy = oy + (b.y + 0.5) * k;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.strokeText(b.name, cx, cy);
    ctx.fillStyle = FARBEN.text; ctx.fillText(b.name, cx, cy);
  }
  ctx.textAlign = 'center';

  // Beschriftung der Räume
  const schrift = Math.max(11, Math.min(18, k * 0.75));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const r of liste) {
    const b = r.box, cx = ox + (b.minX + b.maxX + 1) / 2 * k, cy = oy + b.minY * k + Math.max(schrift * 1.2, k * 1.1); // oben im Raum, damit Figuren frei bleiben
    ctx.font = `500 ${schrift}px system-ui, sans-serif`;
    ctx.fillStyle = FARBEN.text;
    ctx.fillText(r.typ ? r.typ.name : 'Ohne Funktion', cx, cy - (r.probleme.length ? schrift * 0.7 : 0));
    if (r.probleme.length) {
      ctx.font = `400 ${schrift * 0.85}px system-ui, sans-serif`;
      ctx.fillStyle = FARBEN.fehler;
      const t = r.probleme.map(p => p === 'tuer' ? 'Tür fehlt' : `zu klein (mind. ${r.typ.minGroesse[0]} × ${r.typ.minGroesse[1]})`).join(' · ');
      ctx.fillText(t, cx, cy + schrift * 0.7);
    } else if (r.veranstaltungText) {
      // eingestellte Veranstaltung klein unter dem Raumnamen
      ctx.font = `400 ${schrift * 0.8}px system-ui, sans-serif`;
      ctx.fillStyle = FARBEN.veranstaltung;
      ctx.fillText(r.veranstaltungText, cx, cy + schrift * 0.95);
    }
  }

  // Mitarbeiter-Figuren
  for (const f of extra.personen || []) {
    if (f.getragen) continue;
    figur(ctx, ox + (f.x + 0.5) * k, oy + (f.y + 0.5) * k, k, f, false, schrift);
  }
  if (extra.tragen) {
    const t = extra.tragen, f = (extra.personen || []).find(p => p.getragen);
    const fx = Math.floor((t.px - ox) / k), fy = Math.floor((t.py - oy) / k);
    ctx.strokeStyle = FARBEN.auswahl; ctx.lineWidth = 2; ctx.strokeRect(ox + fx * k + 1, oy + fy * k + 1, k - 2, k - 2);
    if (f) figur(ctx, t.px, t.py, k, f, true, schrift);
  }

  // Vorschau beim Ziehen
  const v = extra.vorschau;
  if (v) {
    const ax = Math.min(v.x0, v.x1), bx = Math.max(v.x0, v.x1), ay = Math.min(v.y0, v.y1), by = Math.max(v.y0, v.y1);
    if (v.art === 'wand') {
      ctx.fillStyle = FARBEN.vorschauWand;
      for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++)
        if (x === ax || x === bx || y === ay || y === by) ctx.fillRect(ox + x * k, oy + y * k, k, k);
      ctx.fillStyle = FARBEN.konflikt;
      for (const c of extra.konflikte || []) ctx.fillRect(ox + c.x * k, oy + c.y * k, k, k);
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

// ---- Stadt rund um das Grundstück ----
function zufall(start) { let a = start; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }

function flecken(ctx, x, y, w, h, k, start) {
  const r = zufall(start); ctx.fillStyle = FARBEN.rasenFleck;
  const n = Math.round(w * h * 0.9);
  for (let i = 0; i < n; i++) ctx.fillRect(x + r() * w * k, y + r() * h * k, Math.max(1, k * 0.12), Math.max(1, k * 0.12));
}

function dach(ctx, px, py, pw, ph, farbe) {
  ctx.fillStyle = FARBEN.schatten; ctx.fillRect(px + pw * 0.06, py + ph * 0.08, pw, ph);
  ctx.fillStyle = farbe; ctx.fillRect(px, py, pw, ph);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';                 // eine Dachhälfte im Schatten
  if (pw >= ph) ctx.fillRect(px, py + ph / 2, pw, ph / 2); else ctx.fillRect(px + pw / 2, py, pw / 2, ph);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath();   // First
  if (pw >= ph) { ctx.moveTo(px, py + ph / 2); ctx.lineTo(px + pw, py + ph / 2); } else { ctx.moveTo(px + pw / 2, py); ctx.lineTo(px + pw / 2, py + ph); }
  ctx.stroke();
}

function umgebungZeichnen(ctx, z, { k, ox, oy }) {
  const P = (x, y, w, h) => [ox + x * k, oy + y * k, w * k, h * k];
  ctx.fillStyle = FARBEN.gruenstreifen; ctx.fillRect(...P(0, 0, z.w, z.h));
  flecken(ctx, ox, oy, z.w, z.h, k, 7);

  for (const n of NACHBARN) {
    ctx.fillStyle = FARBEN.nachbarRasen; ctx.fillRect(...P(n.x, n.y, n.w, n.h));
    ctx.strokeStyle = FARBEN.hecke; ctx.lineWidth = Math.max(2, k * 0.25);
    ctx.strokeRect(...P(n.x + 0.12, n.y + 0.12, n.w - 0.24, n.h - 0.24));
    if (n.haus) dach(ctx, ...P(n.haus.x, n.haus.y, n.haus.w, n.haus.h), n.haus.dach);
  }

  for (const g of GEHWEGE) {
    ctx.fillStyle = FARBEN.gehweg; ctx.fillRect(...P(g.x, g.y, g.w, g.h));
    ctx.strokeStyle = FARBEN.gehwegFuge; ctx.lineWidth = 1; ctx.beginPath();
    if (g.w > g.h) for (let x = g.x; x <= g.x + g.w; x++) { ctx.moveTo(ox + x * k + 0.5, oy + g.y * k); ctx.lineTo(ox + x * k + 0.5, oy + (g.y + g.h) * k); }
    else for (let y = g.y; y <= g.y + g.h; y++) { ctx.moveTo(ox + g.x * k, oy + y * k + 0.5); ctx.lineTo(ox + (g.x + g.w) * k, oy + y * k + 0.5); }
    ctx.stroke();
  }

  for (const s of STRASSEN) { ctx.fillStyle = FARBEN.asphalt; ctx.fillRect(...P(s.x, s.y, s.w, s.h)); }
  ctx.strokeStyle = FARBEN.markierung; ctx.lineWidth = Math.max(1, k * 0.12); ctx.setLineDash([k * 1.2, k * 0.9]);
  for (const s of STRASSEN) {
    ctx.beginPath();
    if (s.richtung === 'waagrecht') { ctx.moveTo(ox + s.x * k, oy + (s.y + s.h / 2) * k); ctx.lineTo(ox + (s.x + s.w) * k, oy + (s.y + s.h / 2) * k); }
    else { ctx.moveTo(ox + (s.x + s.w / 2) * k, oy + s.y * k); ctx.lineTo(ox + (s.x + s.w / 2) * k, oy + (s.y + s.h) * k); }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // Kreuzungen ohne Markierung
  for (const a of STRASSEN) for (const b of STRASSEN) {
    if (a === b || a.richtung !== 'waagrecht' || b.richtung !== 'senkrecht') continue;
    ctx.fillStyle = FARBEN.asphalt; ctx.fillRect(...P(b.x, a.y, b.w, a.h));
  }

  // Eigenes Grundstück: Rasen und Einfahrt zum Tor
  const g = GRUNDSTUECK;
  ctx.fillStyle = FARBEN.rasen; ctx.fillRect(...P(g.x, g.y, g.w, g.h));
  flecken(ctx, ox + g.x * k, oy + g.y * k, g.w, g.h, k, 42);
  ctx.fillStyle = FARBEN.gehweg;
  const unten = g.y + g.h, gehweg = GEHWEGE.find(w => w.w > w.h && w.y >= unten);
  if (gehweg) ctx.fillRect(...P(g.tor.x, unten, g.tor.breite, gehweg.y - unten));

  for (const b of BAEUME) {
    ctx.fillStyle = FARBEN.schatten; ctx.beginPath(); ctx.arc(ox + (b.x + 0.25) * k, oy + (b.y + 0.3) * k, b.r * k, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = FARBEN.baum; ctx.beginPath(); ctx.arc(ox + b.x * k, oy + b.y * k, b.r * k, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = FARBEN.baumHell; ctx.beginPath(); ctx.arc(ox + (b.x - b.r * 0.3) * k, oy + (b.y - b.r * 0.3) * k, b.r * 0.5 * k, 0, Math.PI * 2); ctx.fill();
  }
}

function zaunZeichnen(ctx, { k, ox, oy }) {
  const g = GRUNDSTUECK, x0 = ox + g.x * k, y0 = oy + g.y * k, x1 = ox + (g.x + g.w) * k, y1 = oy + (g.y + g.h) * k;
  const tl = ox + g.tor.x * k, tr = ox + (g.tor.x + g.tor.breite) * k;
  ctx.strokeStyle = FARBEN.zaun; ctx.lineWidth = Math.max(2, k * 0.14); ctx.beginPath();
  ctx.moveTo(tl, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y1); ctx.lineTo(tr, y1);
  ctx.stroke();
  ctx.fillStyle = FARBEN.zaunPfosten; const p = Math.max(3, k * 0.3);
  const pfosten = (x, y) => ctx.fillRect(x - p / 2, y - p / 2, p, p);
  for (let x = g.x; x <= g.x + g.w; x += 2) { pfosten(ox + x * k, y0); if (x <= g.tor.x || x >= g.tor.x + g.tor.breite) pfosten(ox + x * k, y1); }
  for (let y = g.y; y <= g.y + g.h; y += 2) { pfosten(x0, oy + y * k); pfosten(x1, oy + y * k); }
  pfosten(tl, y1); pfosten(tr, y1);
}

function figur(ctx, cx, cy, k, f, angehoben, schrift) {
  const r = Math.max(9, k * 0.48) * (angehoben ? 1.25 : 1);
  ctx.fillStyle = FARBEN.schatten; ctx.beginPath(); ctx.arc(cx + r * 0.2, cy + r * (angehoben ? 0.6 : 0.25), r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ART_FARBE[f.art] || '#666'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = `600 ${r * 1.05}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(f.kuerzel, cx, cy + 1);
  const n = Math.max(11, schrift * 0.8);
  ctx.font = `500 ${n}px system-ui, sans-serif`;
  const b = ctx.measureText(f.name).width + 8;
  ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fillRect(cx - b / 2, cy + r + 3, b, n + 4);
  ctx.fillStyle = FARBEN.text; ctx.fillText(f.name, cx, cy + r + 5 + n / 2);
}

function stuhl(ctx, px, py, k) {
  const r = k * 0.15;
  ctx.fillStyle = FARBEN.stuhlSitz; ctx.fillRect(px + r, py + r * 1.6, k - 2 * r, k - r * 2.6);
  ctx.fillStyle = FARBEN.stuhlLehne; ctx.fillRect(px + r, py + r, k - 2 * r, r * 0.9);
}
