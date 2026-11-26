// Darstellung: malt die Karte auf die Zeichenfläche. Ändert nichts und rechnet keine Spielregeln –
// alles, was gezeichnet wird, kommt fertig vom Spiel (spiel.karte()).
import { FELD } from '../kern/spiel.js';
import { ART_FARBE } from '../inhalte/mitarbeiter.js';
import { TEXTE } from '../inhalte/texte.js';
import { menschZeichnen } from './menschen.js';
import { GRUNDSTUECK, STRASSEN, GEHWEGE, NACHBARN, BAEUME, LADEN } from '../inhalte/umgebung.js';

// Platzhalter-Farben – das Design legt Lukas fest.
export const FARBEN = {
  gruenstreifen: '#9dbb7c', nachbarRasen: '#91b26f', hecke: '#5f8a45', rasen: '#86bf5f', rasenFleck: 'rgba(40,90,20,0.10)',
  asphalt: '#5d6064', markierung: '#e9e6dc', gehweg: '#c9c5ba', gehwegFuge: 'rgba(0,0,0,0.10)',
  zaun: '#f4efe2', zaunPfosten: '#8b7b62', baum: '#4f8a3a', baumHell: '#6aa64f', schatten: 'rgba(0,0,0,0.18)',
  raster: 'rgba(30,70,10,0.10)', stuhlSitz: '#9a6b3f', stuhlLehne: '#6e4a2a', theke: '#8a5a32', thekeHell: '#b98451', tisch: '#8a5a32', tischHell: '#c99a6b', klavier: '#3b2a20', maschine: '#45464b', maschineKaffee: '#7a4a24', besucher: '#5b8a72', jugend: '#2fae3c', veranstaltung: '#5a5470', konflikt: 'rgba(200,40,30,0.75)', boden: '#efe8d8',
  wand: '#3a3935', tuer: '#a8794a', tuerHell: '#d2a878', glas: '#a9d3ea', glasHell: '#dff0f9', garderobe: '#6b4f36', jacke1: '#8a3b3b', jacke2: '#3b5f8a', infotisch: '#7c6a54', infoBlatt: '#f4f0e4', wcWand: '#9fb3bd', wcSchuessel: '#f7f9fa', wcDeckel: '#c9d6dc', becken: '#e9eef0', hahn: '#8c979c',   // Fenster, Garderobe, Infotisch: PLATZHALTER
  // Stuhlstufen 1–4 (Sitz, Lehne) und Ausstattung des Gottesdienstraums – Platzhalter
  stuhlStufen: [['#9a6b3f', '#6e4a2a'], ['#b5473f', '#7d2c26'], ['#3f6fb5', '#284a7d'], ['#c99a2e', '#8a6516']],
  kanzel: '#6b4a2c', kanzelHell: '#a07445', altar: '#efeae0', altarTuch: '#7b3b8c', vase: '#6d7fa3',
  bluete: ['#e0567a', '#f2c94c', '#ffffff'], blatt: '#4f8a3a', blattHell: '#6fae55', topf: '#b5663d',
  gitarre: '#c07a32', gitarreHals: '#4a3220',
  // Weitere Instrumente (25.11.) – PLATZHALTER von Claude, Lukas legt Aussehen fest
  keyTasten: '#f4f1ea', keySchwarz: '#2a2a2e', trommel: '#b8433a', trommelFell: '#ece6da', becken: '#d9b54a',
  bass: '#3d5f8a', egitarre: '#c23b5a', metall: '#8d9096', mikroKopf: '#4a4d52', plakat: '#fff6d6', plakatRand: '#c23b2e', evangelisation: '#fff6d6', evangelisationRand: '#2d69be',
  // Außen (Einzugsgebiet) – Platzhalter
  strasse: '#6a6d72', strasseRand: '#55585c', parkLinie: '#f2efe6', nichtAngeschlossen: 'rgba(200,55,45,0.45)',
  busSchild: '#f2c230', busPfosten: '#5b5e63', busDach: '#4c5f74', busWand: '#8aa0b5', busBank: '#8a5a32', glas: 'rgba(170,215,240,0.55)', glasRahmen: '#d9e3ea',
  // Wege und Außendeko (25.11.) – Platzhalter
  weg: '#d8c8a4', wegFuge: 'rgba(120,95,55,0.25)', busch: '#4e8a3c', buschHell: '#6aa850', heckeDunkel: '#3f7433',
  beet: '#7a5634', bank: '#9a6b3f', bankFuss: '#4a4b50', laterne: '#3d3f45', laterneLicht: '#ffe9a0',
  schaukasten: '#5a5f68', schaukastenGlas: '#e9eef2', aushang: '#fff6d6',
  geisterOk: 'rgba(60,160,80,0.9)', geisterNein: 'rgba(200,55,45,0.9)',
  vorschauWand: 'rgba(45,105,190,0.45)', vorschauAbriss: 'rgba(200,55,45,0.30)',
  auswahl: '#2d69be', text: '#2b2a27', fehler: '#b3261e',
  // Kirchkaffee (25.11., Platzhalter): Ladebalken der Maschine, grüne/rote Zahlen
  ladenBalken: '#f2c94c', plus: '#1f8a3a', minus: '#b3261e'
};

// Beschriftung unter dem Raumnamen: eingestellte Veranstaltung bzw. Zustand des Kirchkaffees
const uhrText = n => n.minute ? `${n.stunde}:${String(n.minute).padStart(2, '0')}` : `${n.stunde}`;
function raumUntertitel(r) {
  const kk = r.kirchkaffee;
  if (kk) return kk.code === 'zu' && kk.naechste ? TEXTE.kirchkaffee.zuBis(TEXTE.tageKurz[kk.naechste.tag], uhrText(kk.naechste)) : TEXTE.kirchkaffee[kk.code];
  if (r.veranstaltungsraum) return r.veranstaltung || 'Keine Veranstaltung';
  return null;
}

export function zeichne(ctx, z, ansicht, extra = {}) {
  const { k, ox, oy } = ansicht; // k = Kästchengröße in Pixeln, ox/oy = Versatz
  const liste = z.raeume;        // z = Karte vom Spiel: w, h, zellen, raeume, moebel, personen, besucher
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
  // Straße und Parkplätze liegen auf dem Boden – vor dem Zaun und den Möbeln zeichnen
  for (const m of z.moebel) {
    if (m.art !== 'strasse' && m.art !== 'parkplatz' && m.art !== 'weg') continue;
    const px = ox + m.x * k, py = oy + m.y * k;
    if (m.art === 'weg') { weg(ctx, px, py, k); continue; }
    if (m.art === 'strasse') strasse(ctx, px, py, k); else parkplatz(ctx, px, py, k, m.dreh);
    if (extra.raster && m.angeschlossen === false) {             // im Editor: zählt (noch) nicht – keine Straße bis zum Tor
      ctx.fillStyle = FARBEN.nichtAngeschlossen;
      for (const f of m.felder) ctx.fillRect(ox + f.x * k, oy + f.y * k, k, k);
    }
  }
  zaunZeichnen(ctx, ansicht);
  if (z.plakat) plakat(ctx, ansicht);
  if (z.bus && z.bus.stufe) bushaltestelle(ctx, ansicht, z.bus);

  // Wände und Türen
  for (let y = 0; y < z.h; y++) for (let x = 0; x < z.w; x++) {
    const t = z.zellen[y * z.w + x], px = ox + x * k, py = oy + y * k;
    if (t === FELD.WAND) {
      ctx.fillStyle = FARBEN.wand; ctx.fillRect(px, py, k, k);
    } else if (t === FELD.TUER) {
      ctx.fillStyle = FARBEN.tuer; ctx.fillRect(px, py, k, k);
      ctx.fillStyle = FARBEN.tuerHell; ctx.fillRect(px + k * 0.2, py + k * 0.2, k * 0.6, k * 0.6);
    } else if (t === FELD.FENSTER) {
      // Fenster: Glasstreifen in Richtung der Wand (waagrecht, wenn links/rechts Wand steht)
      const nb = (dx, dy) => { const v = z.zellen[(y + dy) * z.w + x + dx]; return v === FELD.WAND || v === FELD.TUER || v === FELD.FENSTER; };
      fenster(ctx, px, py, k, nb(-1, 0) || nb(1, 0) || !(nb(0, -1) || nb(0, 1)));
    }
  }

  // Kästchen unter der Maus (nur im Editor)
  if (extra.schwebe) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
    ctx.strokeRect(ox + extra.schwebe.x * k + 1, oy + extra.schwebe.y * k + 1, k - 2, k - 2);
  }

  // Auswahl
  if (extra.auswahl != null) {
    const r = liste.find(x => x.nr === extra.auswahl);
    if (r) {
      ctx.strokeStyle = FARBEN.auswahl; ctx.lineWidth = 3;
      const b = r.box;
      ctx.strokeRect(ox + b.minX * k + 1.5, oy + b.minY * k + 1.5, (b.maxX - b.minX + 1) * k - 3, (b.maxY - b.minY + 1) * k - 3);
    }
  }

  // Möbel
  for (const m of z.moebel) {
    const px = ox + m.x * k, py = oy + m.y * k;
    if (m.art === 'strasse' || m.art === 'parkplatz' || m.art === 'weg') continue;
    if (AUSSENDEKO[m.art]) AUSSENDEKO[m.art](ctx, px, py, k, m);
    else if (m.art === 'stuhl') stuhl(ctx, px, py, k, m.stufe || 1);
    else if (m.art === 'theke') theke(ctx, px, py, k);
    else if (m.art === 'tisch') tisch(ctx, px, py, k);
    else if (m.art === 'garderobe') garderobe(ctx, px, py, k);
    else if (m.art === 'infotisch') infotisch(ctx, px, py, k);
    else if (m.art === 'wc') wc(ctx, px, py, k);
    else if (m.art === 'waschbecken') waschbecken(ctx, px, py, k);
    else if (m.art === 'kanzel') kanzel(ctx, px, py, k);
    else if (m.art === 'altar') altar(ctx, px, py, k);
    else if (m.art === 'blumen') blumen(ctx, px, py, k);
    else if (m.art === 'gruenpflanze') gruenpflanze(ctx, px, py, k);
    else if (m.art === 'gitarre') gitarre(ctx, px, py, k);
    else if (INSTRUMENT_BILD[m.art]) INSTRUMENT_BILD[m.art](ctx, px, py, k);
    else if (m.art === 'kaffeemaschine') kaffeemaschine(ctx, px, py, k, m.anteil || 0);
  }
  // Kaffeemaschine lädt: kleiner Balken über der Maschine
  for (const l of z.laden || []) {
    const px = ox + l.x * k, py = oy + l.y * k - k * 0.32, w = k * 0.9, h = Math.max(4, k * 0.18);
    ctx.fillStyle = 'rgba(43,42,39,0.85)'; ctx.fillRect(px + k * 0.05, py, w, h);
    ctx.fillStyle = FARBEN.ladenBalken; ctx.fillRect(px + k * 0.05 + 1, py + 1, (w - 2) * l.anteil, h - 2);
  }

  // Besucher
  // Figuren-Schublade (src/ansicht/menschen.js); Oberteil-Farbe = Bedeutung. Jugendliche: kräftiges Grün (Lukas, 25.11.)
  const besucherHoehe = Math.max(16, k * 0.95);
  for (const b of z.besucher) {
    menschZeichnen(ctx, ox + (b.x + 0.5) * k, oy + (b.y + 0.5) * k, besucherHoehe,
      { kleidung: b.jugend ? FARBEN.jugend : FARBEN.besucher, id: b.id, jugend: b.jugend, rand: b.id === extra.markiert ? FARBEN.auswahl : null });
  }
  // Vornamen klein neben den Besuchern
  ctx.font = `500 11px system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (const b of z.besucher) if (b.name && !b.sitzt) { // beim Hinsetzen verschwindet der Name
    const cx = ox + (b.x + 0.5) * k + besucherHoehe * 0.2 + 3, cy = oy + (b.y + 0.5) * k;
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
    const name = r.typ ? r.typ.name : 'Ohne Funktion', ny = cy - (r.probleme.length ? schrift * 0.7 : 0);
    ctx.fillText(name, cx, ny);
    const untertitel = raumUntertitel(r);
    if (r.veranstaltungsraum && !r.veranstaltung) warnsymbol(ctx, cx + ctx.measureText(name).width / 2 + schrift * 0.75, ny, schrift * 0.9);
    if (r.probleme.length) {
      ctx.font = `400 ${schrift * 0.85}px system-ui, sans-serif`;
      ctx.fillStyle = FARBEN.fehler;
      const t = r.probleme.map(p => p === 'tuer' ? 'Tür fehlt'
        : p === 'verbindung' ? 'Verbindungstür zum Gottesdienstraum fehlt'
        : `zu klein (mind. ${r.typ.minGroesse[0]} × ${r.typ.minGroesse[1]})`).join(' · ');
      ctx.fillText(t, cx, cy + schrift * 0.7);
    } else if (untertitel) {
      // eingestellte Veranstaltung klein unter dem Raumnamen
      ctx.font = `400 ${schrift * 0.8}px system-ui, sans-serif`;
      ctx.fillStyle = FARBEN.veranstaltung;
      ctx.fillText(untertitel, cx, cy + schrift * 0.95);
    }
  }

  // Mitarbeiter-Figuren
  for (const f of z.personen) {
    if (f.id === extra.getragen) continue;
    figur(ctx, ox + (f.x + 0.5) * k, oy + (f.y + 0.5) * k, k, f, false, schrift);
  }
  if (extra.tragen) {
    const t = extra.tragen, f = z.personen.find(p => p.id === extra.getragen);
    const fx = Math.floor((t.px - ox) / k), fy = Math.floor((t.py - oy) / k);
    ctx.strokeStyle = FARBEN.auswahl; ctx.lineWidth = 2; ctx.strokeRect(ox + fx * k + 1, oy + fy * k + 1, k - 2, k - 2);
    if (f) figur(ctx, t.px, t.py, k, f, true, schrift);
  }

  // Umriss des Möbels unter der Maus: grün = passt hier hin, rot = geht hier nicht
  if (extra.geist) {
    ctx.strokeStyle = extra.geist.geht ? FARBEN.geisterOk : FARBEN.geisterNein; ctx.lineWidth = 2.5;
    const fs = extra.geist.felder, minX = Math.min(...fs.map(f => f.x)), minY = Math.min(...fs.map(f => f.y));
    const w = Math.max(...fs.map(f => f.x)) - minX + 1, h = Math.max(...fs.map(f => f.y)) - minY + 1;
    ctx.strokeRect(ox + minX * k + 1.5, oy + minY * k + 1.5, w * k - 3, h * k - 3);
  }

  // „+1 €“ über Kunden, „−5 €“ über dem Ehrenamtlichen: steigen kurz auf und verblassen (anteil 0 → 1)
  for (const e of extra.zahlen || []) {
    const cx = ox + (e.x + 0.5) * k, cy = oy + (e.y - 0.3 - e.anteil * 1.2) * k;
    const betrag = Math.abs(e.betrag).toLocaleString('de-DE', e.art === 'trinkgeld' && !Number.isInteger(e.betrag) ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : {});
    const text = `${e.betrag > 0 ? '+' : '−'}${betrag} €${e.art === 'trinkgeld' ? ' ' + TEXTE.kirchkaffee.trinkgeld : ''}`;
    ctx.globalAlpha = Math.max(0, 1 - e.anteil * e.anteil);
    ctx.font = `700 ${Math.max(12, k * 0.7)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.strokeText(text, cx, cy);
    ctx.fillStyle = e.betrag > 0 ? FARBEN.plus : FARBEN.minus; ctx.fillText(text, cx, cy);
    ctx.globalAlpha = 1;
  }

  // Preis neben dem Mauszeiger beim Bauen (z. B. Stuhl)
  const ps = extra.preisSchild;
  if (ps) {
    ctx.font = `600 12px system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(ps.text).width + 10, x = ps.px + 14, y = ps.py + 14;
    ctx.fillStyle = ps.zuTeuer ? FARBEN.fehler : 'rgba(43,42,39,0.9)'; ctx.fillRect(x, y, w, 20);
    ctx.fillStyle = '#fff'; ctx.fillText(ps.text, x + 5, y + 10);
    ctx.textAlign = 'center';
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
      if (v.stuecke) {   // Baukosten (25.11.): Wandstücke und Preis über dem Rechteck, rot wenn das Geld nicht reicht
        ctx.font = `500 ${schrift}px system-ui, sans-serif`; ctx.fillStyle = v.leistbar ? FARBEN.auswahl : '#c8281e';
        ctx.fillText(TEXTE.bauGeld.vorschau(v.stuecke, `${v.kosten.toLocaleString('de-DE')} €`), ox + (ax + bx + 1) / 2 * k, oy + ay * k - schrift * 0.8);
      }
    } else if (v.art === 'strasse' || v.art === 'weg') {
      ctx.fillStyle = v.art === 'weg' ? 'rgba(216,200,164,0.7)' : 'rgba(90,93,98,0.55)';
      ctx.fillRect(ox + ax * k, oy + ay * k, (bx - ax + 1) * k, (by - ay + 1) * k);
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

function umgebungZeichnen(ctx, z, ansicht) {
  const { k, ox, oy } = ansicht;
  const P = (x, y, w, h) => [ox + x * k, oy + y * k, w * k, h * k];
  ctx.fillStyle = FARBEN.gruenstreifen; ctx.fillRect(...P(0, 0, z.w, z.h));
  flecken(ctx, ox, oy, z.w, z.h, k, 7);

  for (const n of NACHBARN) {
    ctx.fillStyle = FARBEN.nachbarRasen; ctx.fillRect(...P(n.x, n.y, n.w, n.h));
    ctx.strokeStyle = FARBEN.hecke; ctx.lineWidth = Math.max(2, k * 0.25);
    ctx.strokeRect(...P(n.x + 0.12, n.y + 0.12, n.w - 0.24, n.h - 0.24));
    if (n.haus) dach(ctx, ...P(n.haus.x, n.haus.y, n.haus.w, n.haus.h), n.haus.dach);
  }
  // Der Laden: Schild mitten auf dem Dach
  const laden = NACHBARN[LADEN.nachbar] && NACHBARN[LADEN.nachbar].haus;
  if (laden) {
    const cx = ox + (laden.x + laden.w / 2) * k, cy = oy + (laden.y + laden.h / 2) * k;
    ctx.font = `600 ${Math.max(11, k * 0.7)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const b = ctx.measureText(TEXTE.laden).width + 10, h = Math.max(16, k * 0.95);
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillRect(cx - b / 2, cy - h / 2, b, h);
    ctx.fillStyle = FARBEN.text; ctx.fillText(TEXTE.laden, cx, cy + 1);
  }
  // Feld „Evangelisation!“ vor dem Laden (26.11.): kleiner Stand mit Schild – Aussehen ist ein Platzhalter von Claude
  if (z.evangelisation) evangelisationsFeld(ctx, ansicht, z.evangelisation);

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
  // Mitarbeiter als Figur aus der Figuren-Schublade; Oberteil in der Farbe der Art (Hauptamt/Ehrenamt), Kürzel auf dem Oberteil
  const hoehe = Math.max(26, k * 1.35) * (angehoben ? 1.25 : 1);
  const lage = menschZeichnen(ctx, cx, cy, hoehe, { kleidung: ART_FARBE[f.art] || '#666', id: f.id, jugend: false, schattenTiefer: angehoben });
  ctx.fillStyle = '#fff'; ctx.font = `600 ${Math.max(8, lage.koerperHoehe * 0.55)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(f.kuerzel, lage.koerperMitte.x, lage.koerperMitte.y + 1);
  const n = Math.max(11, schrift * 0.8);
  ctx.font = `500 ${n}px system-ui, sans-serif`;
  const b = ctx.measureText(f.name).width + 8;
  ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fillRect(cx - b / 2, lage.fuesse + 3, b, n + 4);
  ctx.fillStyle = FARBEN.text; ctx.fillText(f.name, cx, lage.fuesse + 5 + n / 2);
}

function stuhl(ctx, px, py, k, stufe = 1) {
  const r = k * 0.15, [sitz, lehne] = FARBEN.stuhlStufen[stufe - 1] || FARBEN.stuhlStufen[0];
  ctx.fillStyle = sitz; ctx.fillRect(px + r, py + r * 1.6, k - 2 * r, k - r * 2.6);
  ctx.fillStyle = lehne; ctx.fillRect(px + r, py + r, k - 2 * r, r * 0.9);
}

// ---- Ausstattung des Gottesdienstraums (Platzhalter-Grafik) ----
function kanzel(ctx, px, py, k) {
  ctx.fillStyle = FARBEN.kanzel; ctx.fillRect(px + k * 0.12, py + k * 0.2, k * 0.76, k * 0.68);
  ctx.fillStyle = FARBEN.kanzelHell; ctx.fillRect(px + k * 0.2, py + k * 0.1, k * 0.6, k * 0.22);   // Pult
}
function altar(ctx, px, py, k) {
  ctx.fillStyle = FARBEN.altar; ctx.fillRect(px + k * 0.06, py + k * 0.2, k * 0.88, k * 0.6);
  ctx.fillStyle = FARBEN.altarTuch; ctx.fillRect(px + k * 0.42, py + k * 0.2, k * 0.16, k * 0.6);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(px + k * 0.06, py + k * 0.2, k * 0.88, k * 0.6);
}
function blumen(ctx, px, py, k) {
  ctx.fillStyle = FARBEN.vase; ctx.beginPath(); ctx.arc(px + k / 2, py + k * 0.62, k * 0.2, 0, Math.PI * 2); ctx.fill();
  [[0.32, 0.36], [0.62, 0.32], [0.48, 0.56]].forEach(([x, y], i) => {
    ctx.fillStyle = FARBEN.bluete[i]; ctx.beginPath(); ctx.arc(px + k * x, py + k * y, k * 0.14, 0, Math.PI * 2); ctx.fill();
  });
}
function gruenpflanze(ctx, px, py, k) {
  ctx.fillStyle = FARBEN.topf; ctx.fillRect(px + k * 0.3, py + k * 0.6, k * 0.4, k * 0.3);
  ctx.fillStyle = FARBEN.blatt; ctx.beginPath(); ctx.arc(px + k / 2, py + k * 0.42, k * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = FARBEN.blattHell; ctx.beginPath(); ctx.arc(px + k * 0.4, py + k * 0.34, k * 0.13, 0, Math.PI * 2); ctx.fill();
}
function gitarre(ctx, px, py, k) {
  ctx.fillStyle = FARBEN.gitarreHals; ctx.fillRect(px + k * 0.45, py + k * 0.06, k * 0.1, k * 0.45);
  ctx.fillStyle = FARBEN.gitarre;
  ctx.beginPath(); ctx.arc(px + k / 2, py + k * 0.72, k * 0.22, 0, Math.PI * 2); ctx.arc(px + k / 2, py + k * 0.48, k * 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = FARBEN.gitarreHals; ctx.beginPath(); ctx.arc(px + k / 2, py + k * 0.64, k * 0.06, 0, Math.PI * 2); ctx.fill();
}
// Weitere Instrumente (Platzhalter-Bilder von Claude)
function keyboard(ctx, px, py, k) {
  ctx.fillStyle = FARBEN.keySchwarz; ctx.fillRect(px + k * 0.08, py + k * 0.3, k * 0.84, k * 0.42);
  ctx.fillStyle = FARBEN.keyTasten; ctx.fillRect(px + k * 0.13, py + k * 0.46, k * 0.74, k * 0.22);
  ctx.fillStyle = FARBEN.keySchwarz;
  for (let i = 1; i < 6; i++) ctx.fillRect(px + k * (0.13 + i * 0.123) - k * 0.02, py + k * 0.46, k * 0.04, k * 0.13);
}
function schlagzeug(ctx, px, py, k) {
  ctx.fillStyle = FARBEN.becken; ctx.beginPath(); ctx.ellipse(px + k * 0.22, py + k * 0.24, k * 0.17, k * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = FARBEN.trommel; ctx.beginPath(); ctx.arc(px + k * 0.55, py + k * 0.62, k * 0.27, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = FARBEN.trommelFell; ctx.beginPath(); ctx.arc(px + k * 0.55, py + k * 0.62, k * 0.19, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = FARBEN.trommel; ctx.beginPath(); ctx.arc(px + k * 0.75, py + k * 0.28, k * 0.13, 0, Math.PI * 2); ctx.fill();
}
function saitenInstrument(ctx, px, py, k, farbe) {
  ctx.fillStyle = FARBEN.gitarreHals; ctx.fillRect(px + k * 0.46, py + k * 0.04, k * 0.08, k * 0.5);
  ctx.fillStyle = farbe; ctx.beginPath();
  ctx.moveTo(px + k * 0.3, py + k * 0.5); ctx.lineTo(px + k * 0.7, py + k * 0.46); ctx.lineTo(px + k * 0.74, py + k * 0.86);
  ctx.lineTo(px + k * 0.28, py + k * 0.9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = FARBEN.metall; ctx.fillRect(px + k * 0.4, py + k * 0.68, k * 0.2, k * 0.05);
}
function bass(ctx, px, py, k) { saitenInstrument(ctx, px, py, k, FARBEN.bass); }
function egitarre(ctx, px, py, k) { saitenInstrument(ctx, px, py, k, FARBEN.egitarre); }
function mikrofon(ctx, px, py, k) {
  ctx.fillStyle = FARBEN.metall;
  ctx.fillRect(px + k * 0.47, py + k * 0.32, k * 0.06, k * 0.55); ctx.fillRect(px + k * 0.3, py + k * 0.84, k * 0.4, k * 0.06);
  ctx.fillStyle = FARBEN.mikroKopf; ctx.beginPath(); ctx.arc(px + k / 2, py + k * 0.24, k * 0.13, 0, Math.PI * 2); ctx.fill();
}
// Klavier (Gemeindesaal) – Platzhalter-Bild von Claude
function klavier(ctx, px, py, k) {
  ctx.fillStyle = FARBEN.klavier; ctx.fillRect(px + k * 0.06, py + k * 0.12, k * 0.88, k * 0.62);
  ctx.fillStyle = FARBEN.keyTasten; ctx.fillRect(px + k * 0.1, py + k * 0.6, k * 0.8, k * 0.22);
  ctx.fillStyle = FARBEN.keySchwarz;
  for (let i = 1; i < 7; i++) ctx.fillRect(px + k * (0.1 + i * 0.114) - k * 0.02, py + k * 0.6, k * 0.04, k * 0.12);
}
const INSTRUMENT_BILD = { keyboard, schlagzeug, bass, egitarre, mikrofon, klavier };
// Plakat am Zaun links neben dem Tor (solange es hängt)
function evangelisationsFeld(ctx, { k, ox, oy }, f) {
  const px = ox + f.x * k, py = oy + f.y * k;
  ctx.fillStyle = FARBEN.evangelisation; ctx.fillRect(px + k * 0.08, py + k * 0.08, k * 0.84, k * 0.84);
  ctx.strokeStyle = FARBEN.evangelisationRand; ctx.lineWidth = Math.max(1.5, k * 0.1); ctx.strokeRect(px + k * 0.08, py + k * 0.08, k * 0.84, k * 0.84);
  ctx.font = `600 ${Math.max(9, k * 0.5)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const text = TEXTE.evangelisation.feld, b = ctx.measureText(text).width + 8, h = Math.max(13, k * 0.7);
  const cx = px + k / 2, cy = py - h / 2 - k * 0.1;
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillRect(cx - b / 2, cy - h / 2, b, h);
  ctx.strokeStyle = FARBEN.evangelisationRand; ctx.lineWidth = 1; ctx.strokeRect(cx - b / 2, cy - h / 2, b, h);
  ctx.fillStyle = FARBEN.evangelisationRand; ctx.fillText(text, cx, cy + 1);
}
function plakat(ctx, { k, ox, oy }) {
  const g = GRUNDSTUECK, x = ox + (g.tor.x - 1.6) * k, y = oy + (g.y + g.h - 0.55) * k;
  ctx.fillStyle = FARBEN.schatten; ctx.fillRect(x + 2, y + 2, k * 1.3, k * 0.9);
  ctx.fillStyle = FARBEN.plakat; ctx.fillRect(x, y, k * 1.3, k * 0.9);
  ctx.strokeStyle = FARBEN.plakatRand; ctx.lineWidth = Math.max(1.5, k * 0.1); ctx.strokeRect(x, y, k * 1.3, k * 0.9);
  ctx.fillStyle = FARBEN.plakatRand;
  ctx.fillRect(x + k * 0.15, y + k * 0.2, k * 1.0, k * 0.12); ctx.fillRect(x + k * 0.15, y + k * 0.45, k * 0.7, k * 0.1);
}

// Kleines Warndreieck mit Ausrufezeichen, Mittelpunkt (cx, cy)
function warnsymbol(ctx, cx, cy, g) {
  ctx.save();
  ctx.fillStyle = '#e0a21a'; ctx.strokeStyle = '#5a3d00'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx, cy - g * 0.55); ctx.lineTo(cx + g * 0.6, cy + g * 0.45); ctx.lineTo(cx - g * 0.6, cy + g * 0.45); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3a2a00'; ctx.font = `700 ${g * 0.7}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('!', cx, cy + g * 0.08);
  ctx.restore();
}

// Fenster in der Wand (Platzhalter-Aussehen von Claude, Lukas entscheidet); waagrecht: Wand läuft von links nach rechts
function fenster(ctx, px, py, k, waagrecht) {
  ctx.fillStyle = FARBEN.wand; ctx.fillRect(px, py, k, k);
  ctx.fillStyle = FARBEN.glas;
  if (waagrecht) ctx.fillRect(px, py + k * 0.3, k, k * 0.4); else ctx.fillRect(px + k * 0.3, py, k * 0.4, k);
  ctx.fillStyle = FARBEN.glasHell;
  if (waagrecht) ctx.fillRect(px, py + k * 0.42, k, k * 0.1); else ctx.fillRect(px + k * 0.42, py, k * 0.1, k);
}
// Garderobe und Infotisch im Foyer (Platzhalter-Aussehen von Claude)
function garderobe(ctx, px, py, k) {
  ctx.fillStyle = FARBEN.garderobe; ctx.fillRect(px + k * 0.1, py + k * 0.15, k * 0.8, k * 0.1);
  ctx.fillStyle = FARBEN.jacke1; ctx.fillRect(px + k * 0.18, py + k * 0.25, k * 0.25, k * 0.5);
  ctx.fillStyle = FARBEN.jacke2; ctx.fillRect(px + k * 0.55, py + k * 0.25, k * 0.25, k * 0.45);
}
function infotisch(ctx, px, py, k) {
  ctx.fillStyle = FARBEN.infotisch; ctx.fillRect(px + k * 0.08, py + k * 0.2, k * 0.84, k * 0.6);
  ctx.fillStyle = FARBEN.infoBlatt; ctx.fillRect(px + k * 0.18, py + k * 0.3, k * 0.22, k * 0.28); ctx.fillRect(px + k * 0.5, py + k * 0.34, k * 0.3, k * 0.2);
}

// WC-Kabine und Waschbecken (Toiletten, 26.11.) – PLATZHALTER-Aussehen von Claude, Lukas entscheidet
function wc(ctx, px, py, k) {
  ctx.fillStyle = FARBEN.wcWand; ctx.fillRect(px + k * 0.05, py + k * 0.05, k * 0.9, k * 0.12);
  ctx.fillRect(px + k * 0.05, py + k * 0.05, k * 0.1, k * 0.9); ctx.fillRect(px + k * 0.85, py + k * 0.05, k * 0.1, k * 0.9);
  ctx.fillStyle = FARBEN.wcDeckel; ctx.fillRect(px + k * 0.32, py + k * 0.2, k * 0.36, k * 0.16);
  ctx.fillStyle = FARBEN.wcSchuessel; ctx.beginPath(); ctx.ellipse(px + k * 0.5, py + k * 0.56, k * 0.17, k * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = FARBEN.wcDeckel; ctx.lineWidth = Math.max(1, k * 0.04); ctx.stroke();
}
function waschbecken(ctx, px, py, k) {
  ctx.fillStyle = FARBEN.becken; ctx.fillRect(px + k * 0.15, py + k * 0.12, k * 0.7, k * 0.5);
  ctx.fillStyle = FARBEN.wcDeckel; ctx.beginPath(); ctx.ellipse(px + k * 0.5, py + k * 0.4, k * 0.24, k * 0.15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = FARBEN.hahn; ctx.fillRect(px + k * 0.46, py + k * 0.12, k * 0.08, k * 0.16);
}

function theke(ctx, px, py, k) {
  ctx.fillStyle = FARBEN.theke; ctx.fillRect(px, py, k, k);
  ctx.fillStyle = FARBEN.thekeHell; ctx.fillRect(px, py + k * 0.15, k, k * 0.35);
}

// Tisch im Kirchkaffee: runde Tischplatte (Platzhalter-Aussehen, Lukas entscheidet)
function tisch(ctx, px, py, k) {
  const cx = px + k / 2, cy = py + k / 2;
  ctx.fillStyle = FARBEN.tisch; ctx.beginPath(); ctx.arc(cx, cy, k * 0.42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = FARBEN.tischHell; ctx.beginPath(); ctx.arc(cx, cy, k * 0.34, 0, Math.PI * 2); ctx.fill();
}

// Kaffeemaschine mit kleinem Füllstand-Streifen (braun = Kaffee drin, rot = leer); anteil = 0 … 1
function kaffeemaschine(ctx, px, py, k, anteil) {
  const r = k * 0.12;
  ctx.fillStyle = FARBEN.maschine; ctx.fillRect(px + r, py + r, k - 2 * r, k - 2 * r);
  ctx.fillStyle = '#d9d9d9'; ctx.fillRect(px + k * 0.3, py + k * 0.25, k * 0.4, k * 0.25);
  ctx.fillStyle = anteil > 0 ? FARBEN.maschineKaffee : '#b3261e';
  ctx.fillRect(px + k * 0.3, py + k * 0.6, k * 0.4 * (anteil > 0 ? Math.min(1, anteil) : 1), k * 0.14);
}

// ---- Außen: Straße, Parkplatz, Bushaltestelle (Platzhalter-Grafik) ----
function strasse(ctx, px, py, k) {
  ctx.fillStyle = FARBEN.strasse; ctx.fillRect(px, py, k, k);
  ctx.strokeStyle = FARBEN.strasseRand; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, k - 1, k - 1);
}
// Parkplatz 2×1 (quer) bzw. 1×2 (dreh): Asphalt mit weißer Markierung und einem kleinen „P“
function parkplatz(ctx, px, py, k, dreh) {
  const w = dreh ? k : 2 * k, h = dreh ? 2 * k : k, l = Math.max(1.5, k * 0.08);
  ctx.fillStyle = FARBEN.strasse; ctx.fillRect(px, py, w, h);
  ctx.fillStyle = FARBEN.parkLinie;
  if (dreh) { ctx.fillRect(px + k * 0.08, py, l, h); ctx.fillRect(px + k * 0.92 - l, py, l, h); }
  else { ctx.fillRect(px, py + k * 0.08, w, l); ctx.fillRect(px, py + k * 0.92 - l, w, l); }
  ctx.font = `700 ${Math.max(9, k * 0.6)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('P', px + w / 2, py + h / 2 + 1);
}
// Bushaltestelle neben dem Tor: Stufe 1 Schild, Stufe 2 Wartehäuschen, Stufe 3 modernes Wartehäuschen aus Glas
function bushaltestelle(ctx, { k, ox, oy }, b) {
  const x = ox + b.x * k, y = oy + b.y * k;
  if (b.stufe >= 3) {
    ctx.fillStyle = FARBEN.schatten; ctx.fillRect(x + 3, y + k * 0.15 + 3, k * 2.6, k * 0.75);
    ctx.fillStyle = FARBEN.glas; ctx.fillRect(x, y + k * 0.15, k * 2.6, k * 0.75);
    ctx.strokeStyle = FARBEN.glasRahmen; ctx.lineWidth = Math.max(1.5, k * 0.08); ctx.strokeRect(x, y + k * 0.15, k * 2.6, k * 0.75);
    ctx.beginPath(); ctx.moveTo(x + k * 1.3, y + k * 0.15); ctx.lineTo(x + k * 1.3, y + k * 0.9); ctx.stroke();
    ctx.fillStyle = FARBEN.busBank; ctx.fillRect(x + k * 0.3, y + k * 0.3, k * 2, k * 0.18);
  } else if (b.stufe >= 2) {
    ctx.fillStyle = FARBEN.schatten; ctx.fillRect(x + 3, y + k * 0.2 + 3, k * 1.8, k * 0.7);
    ctx.fillStyle = FARBEN.busWand; ctx.fillRect(x, y + k * 0.2, k * 1.8, k * 0.7);
    ctx.fillStyle = FARBEN.busDach; ctx.fillRect(x - k * 0.08, y + k * 0.1, k * 1.96, k * 0.25);
    ctx.fillStyle = FARBEN.busBank; ctx.fillRect(x + k * 0.25, y + k * 0.45, k * 1.3, k * 0.18);
  }
  // Haltestellenschild am Gehweg (jede Stufe)
  const sx = x + k * (b.stufe >= 3 ? 2.85 : b.stufe >= 2 ? 2.2 : 0.5), sy = y + k * 1.1;
  ctx.fillStyle = FARBEN.busPfosten; ctx.fillRect(sx - k * 0.05, sy - k * 0.2, k * 0.1, k * 0.6);
  ctx.fillStyle = FARBEN.busSchild; ctx.beginPath(); ctx.arc(sx, sy - k * 0.3, k * 0.32, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2f6b3a'; ctx.lineWidth = Math.max(1, k * 0.06); ctx.stroke();
  ctx.fillStyle = '#2f6b3a'; ctx.font = `700 ${Math.max(8, k * 0.38)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('H', sx, sy - k * 0.28);
}

// ---- Wege und Außendeko (Platzhalter-Grafik, 25.11.) ----
function weg(ctx, px, py, k) {
  ctx.fillStyle = FARBEN.weg; ctx.fillRect(px, py, k, k);
  ctx.strokeStyle = FARBEN.wegFuge; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(px, py + k / 2); ctx.lineTo(px + k, py + k / 2); ctx.moveTo(px + k / 2, py); ctx.lineTo(px + k / 2, py + k / 2);
  ctx.moveTo(px + k * 0.25, py + k / 2); ctx.lineTo(px + k * 0.25, py + k); ctx.moveTo(px + k * 0.75, py + k / 2); ctx.lineTo(px + k * 0.75, py + k); ctx.stroke();
}
function rund(ctx, cx, cy, r, farbe) { ctx.fillStyle = farbe; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
const AUSSENDEKO = {
  busch(ctx, px, py, k) {
    rund(ctx, px + k * 0.55, py + k * 0.58, k * 0.38, FARBEN.schatten);
    rund(ctx, px + k * 0.5, py + k * 0.52, k * 0.38, FARBEN.busch);
    rund(ctx, px + k * 0.38, py + k * 0.42, k * 0.16, FARBEN.buschHell); rund(ctx, px + k * 0.62, py + k * 0.5, k * 0.12, FARBEN.buschHell);
  },
  hecke(ctx, px, py, k) {
    ctx.fillStyle = FARBEN.heckeDunkel; ctx.fillRect(px + k * 0.04, py + k * 0.12, k * 0.92, k * 0.76);
    ctx.fillStyle = FARBEN.busch; ctx.fillRect(px + k * 0.1, py + k * 0.18, k * 0.8, k * 0.6);
    rund(ctx, px + k * 0.32, py + k * 0.4, k * 0.1, FARBEN.buschHell); rund(ctx, px + k * 0.66, py + k * 0.55, k * 0.1, FARBEN.buschHell);
  },
  blumenbeet(ctx, px, py, k) {
    ctx.fillStyle = FARBEN.beet; ctx.fillRect(px + k * 0.08, py + k * 0.08, k * 0.84, k * 0.84);
    const b = FARBEN.bluete;
    [[0.28, 0.3, 0], [0.7, 0.28, 1], [0.5, 0.52, 2], [0.26, 0.72, 1], [0.72, 0.72, 0]].forEach(([x, y, f]) => {
      rund(ctx, px + k * x, py + k * y, k * 0.11, FARBEN.blattHell); rund(ctx, px + k * x, py + k * y, k * 0.07, b[f]);
    });
  },
  bank(ctx, px, py, k) {
    ctx.fillStyle = FARBEN.bankFuss; ctx.fillRect(px + k * 0.14, py + k * 0.62, k * 0.08, k * 0.22); ctx.fillRect(px + k * 0.78, py + k * 0.62, k * 0.08, k * 0.22);
    ctx.fillStyle = FARBEN.bank; ctx.fillRect(px + k * 0.08, py + k * 0.44, k * 0.84, k * 0.2);
    ctx.fillStyle = FARBEN.stuhlLehne; ctx.fillRect(px + k * 0.08, py + k * 0.2, k * 0.84, k * 0.14);
  },
  laterne(ctx, px, py, k) {
    rund(ctx, px + k * 0.5, py + k * 0.3, k * 0.3, 'rgba(255,233,160,0.35)');
    ctx.fillStyle = FARBEN.laterne; ctx.fillRect(px + k * 0.45, py + k * 0.3, k * 0.1, k * 0.6); ctx.fillRect(px + k * 0.3, py + k * 0.84, k * 0.4, k * 0.08);
    rund(ctx, px + k * 0.5, py + k * 0.28, k * 0.14, FARBEN.laterneLicht);
    ctx.strokeStyle = FARBEN.laterne; ctx.lineWidth = Math.max(1, k * 0.05); ctx.stroke();
  },
  baum(ctx, px, py, k) {   // 2 × 2 Kästchen
    rund(ctx, px + k * 1.1, py + k * 1.15, k * 0.9, FARBEN.schatten);
    rund(ctx, px + k, py + k, k * 0.9, FARBEN.baum);
    rund(ctx, px + k * 0.75, py + k * 0.78, k * 0.4, FARBEN.baumHell); rund(ctx, px + k * 1.3, py + k * 1.1, k * 0.3, FARBEN.baumHell);
  },
  schaukasten(ctx, px, py, k, m) {
    ctx.fillStyle = FARBEN.bankFuss; ctx.fillRect(px + k * 0.2, py + k * 0.72, k * 0.08, k * 0.2); ctx.fillRect(px + k * 0.72, py + k * 0.72, k * 0.08, k * 0.2);
    ctx.fillStyle = FARBEN.schaukasten; ctx.fillRect(px + k * 0.06, py + k * 0.12, k * 0.88, k * 0.62);
    ctx.fillStyle = FARBEN.schaukastenGlas; ctx.fillRect(px + k * 0.13, py + k * 0.19, k * 0.74, k * 0.48);
    if (m && m.aushang !== false) {   // mit Aushang (in der Bauleiste immer gefüllt)
      ctx.fillStyle = FARBEN.aushang; ctx.fillRect(px + k * 0.22, py + k * 0.24, k * 0.3, k * 0.38);
      ctx.fillStyle = FARBEN.plakatRand; ctx.fillRect(px + k * 0.26, py + k * 0.3, k * 0.22, k * 0.05); ctx.fillRect(px + k * 0.58, py + k * 0.26, k * 0.22, k * 0.16);
    }
  }
};

// ---- Symbolbilder für die Bauleiste: zeichnet ein Werkzeug oder Möbel in ein Quadrat der Größe g ----
export function symbolZeichnen(ctx, id, g) {
  ctx.clearRect(0, 0, g, g);
  const k = g * 0.72, p = (g - k) / 2;
  const moebel = { stuhl: () => stuhl(ctx, p, p, k, 2), theke, tisch, garderobe, infotisch, wc, waschbecken, kanzel, altar, blumen, gruenpflanze, gitarre, ...INSTRUMENT_BILD,
    kaffeemaschine: () => kaffeemaschine(ctx, p, p, k, 0.7), strasse };
  if (id === 'parkplatz') { const kk = g * 0.44; parkplatz(ctx, (g - 2 * kk) / 2, (g - kk) / 2, kk, false); return; }
  if (id === 'stuhl' || id === 'kaffeemaschine') return moebel[id]();
  if (id === 'weg') return weg(ctx, p, p, k);
  if (id === 'baum') return AUSSENDEKO.baum(ctx, p, p, k / 2);
  if (AUSSENDEKO[id]) return AUSSENDEKO[id](ctx, p, p, k);
  if (moebel[id]) return moebel[id](ctx, p, p, k);
  if (id === 'wand') {
    ctx.fillStyle = FARBEN.boden; ctx.fillRect(p, p, k, k);
    ctx.strokeStyle = FARBEN.wand; ctx.lineWidth = k * 0.2; ctx.strokeRect(p + k * 0.1, p + k * 0.1, k * 0.8, k * 0.8);
  } else if (id === 'fenster') {
    ctx.fillStyle = FARBEN.boden; ctx.fillRect(p, p, k, k);
    fenster(ctx, p, p, k, true);
  } else if (id === 'tuer') {
    ctx.fillStyle = FARBEN.wand; ctx.fillRect(p, p + k * 0.35, k, k * 0.3);
    ctx.fillStyle = FARBEN.tuer; ctx.fillRect(p + k * 0.3, p + k * 0.3, k * 0.4, k * 0.4);
    ctx.fillStyle = FARBEN.tuerHell; ctx.fillRect(p + k * 0.38, p + k * 0.38, k * 0.24, k * 0.24);
  } else if (id === 'raum') {
    ctx.fillStyle = '#d8cdea'; ctx.fillRect(p, p, k, k);
    ctx.strokeStyle = FARBEN.auswahl; ctx.lineWidth = 2; ctx.setLineDash([3, 2]); ctx.strokeRect(p + 1, p + 1, k - 2, k - 2); ctx.setLineDash([]);
  } else if (id === 'abriss') {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = g * 0.12; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(p + k * 0.15, p + k * 0.15); ctx.lineTo(p + k * 0.85, p + k * 0.85); ctx.moveTo(p + k * 0.85, p + k * 0.15); ctx.lineTo(p + k * 0.15, p + k * 0.85); ctx.stroke();
    ctx.lineCap = 'butt';
  } else if (id === 'bushaltestelle') {
    const cx = g / 2, r = g * 0.2;
    ctx.fillStyle = FARBEN.busPfosten; ctx.fillRect(cx - g * 0.03, g * 0.4, g * 0.06, g * 0.45);
    ctx.fillStyle = FARBEN.busSchild; ctx.beginPath(); ctx.arc(cx, g * 0.36, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2f6b3a'; ctx.lineWidth = Math.max(1.5, g * 0.04); ctx.stroke();
    ctx.fillStyle = '#2f6b3a'; ctx.font = `700 ${g * 0.24}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('H', cx, g * 0.37);
  }
}
