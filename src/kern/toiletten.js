// Bedürfnis Toilette (Spielprinzip von Lukas, 26.11.: claude/spielprinzip-toiletten.md). Kennt keine Grafik.
//
// Jeder Besucher einer Veranstaltung hat einen Wert 0–100 %, der ab dem Ankommen langsam steigt (TOILETTE in inhalte/toiletten.js).
// Toilettengänge werden zu festen Zeitpunkten geplant, so wie der Rest des Ablaufs (ablauf.js):
//   • vorher:  beim Losschicken – liegt der Wert beim Ankommen über 50 %, geht er erst zur Toilette und dann zum Platz.
//   • sitz:    sitzt er und erreicht vor der Veranstaltung 80 % (oder während der Veranstaltung 100 %), geht er hin und kommt zurück.
//   • heim:    nach der Veranstaltung: wer ohne Kaffee heimgeht und 80 % hat, geht vorher noch zur Toilette.
// Eine Kabine nimmt eine Person gleichzeitig; ist sie besetzt, wartet man davor (Belegung in z.wc).
// Ein Gang: { art, von, kabine, warte (Platz davor), nach, hinAb, anWarte, drinAb, drinBis, zurueckBis, lHin, lZurueck }.
import { TOILETTE } from '../inhalte/toiletten.js';
import { LAUFTEMPO, ABSTAND } from '../inhalte/zeit.js';
import { moebelImRaum, hindernisBei } from './moebel.js';
import { weg, glaetten, wiesenKarte } from './wege.js';

const EPS = 1e-6;
export function wcAnlegen(z) { if (!z.wc || !Array.isArray(z.wc.belegt)) z.wc = { belegt: [] }; }

// Alle Kabinen in fertigen Toiletten-Räumen
export function kabinen(z, raeume) {
  return raeume.liste.filter(r => r.typ && r.typ.id === 'toiletten' && !r.probleme.length)
    .flatMap(r => moebelImRaum(z, r, 'wc').map(m => ({ x: m.x, y: m.y })));
}

// Startwert beim Ankommen: „zufällig“, aber fest aus Termin und Person gerechnet – so verschiebt sich kein anderer Zufall im Spiel.
export function startWert(laufId, personId) {
  let h = 2166136261;
  for (const c of `${laufId}:${personId}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const f = ((h >>> 0) % 10000) / 10000;
  return TOILETTE.startMin + f * (TOILETTE.startMax - TOILETTE.startMin);
}

// Wert eines Gastes zur Zeit t (0–100). In der Kabine: 0. Nach einem Gang beginnt er wieder bei 0.
export function toiletteWert(g, t) {
  if (!g || !g.wc0 || t < g.wc0.t) return null;
  let basis = g.wc0;
  for (const s of g.gaenge || []) {
    if (t >= s.drinBis) basis = { t: s.drinBis, w: 0 };
    else if (t >= s.drinAb) return 0;
  }
  return Math.min(100, Math.max(0, basis.w + TOILETTE.proStunde * (t - basis.t) / 60));
}
// Wann erreicht der Wert die Schwelle? (ab der Basis zur Zeit ab)
function zeitBis(g, ab, schwelle) {
  const w = toiletteWert(g, ab);
  if (w === null) return Infinity;
  return w >= schwelle ? ab : ab + (schwelle - w) / TOILETTE.proStunde * 60;
}

// Weglänge in Kästchen (wie die Figuren laufen) und das Kästchen direkt vor dem Ziel
function wegInfo(z, von, nach, wiese) {
  const blockiert = (x, y) => hindernisBei(z, x, y) || z.personen.some(p => p.x === x && p.y === y);
  const roh = weg(z, von, nach, blockiert, wiese);
  if (!roh) return null;
  const pfad = glaetten(z, roh, blockiert, wiese);
  let laenge = 0;
  for (let i = 0; i < pfad.length - 1; i++) laenge += Math.hypot(pfad[i + 1].x - pfad[i].x, pfad[i + 1].y - pfad[i].y);
  return { laenge, vorZiel: roh.length >= 2 ? roh[roh.length - 2] : roh[0] };
}

// Frühester Zeitpunkt ab t, zu dem die Kabine frei ist (für die Dauer eines Gangs)
function freiAb(z, k, t) {
  const liste = z.wc.belegt.filter(b => b.x === k.x && b.y === k.y).sort((a, b) => a.von - b.von);
  for (const b of liste) if (t + TOILETTE.dauer > b.von + EPS && t < b.bis - EPS) t = b.bis;
  return t;
}

// Einen Gang planen: die Kabine, in die man am frühesten hinein kann (bei Gleichstand die nähere). → Gang oder null
function gangPlanen(z, liste, art, von, nach, hinAb, wiese) {
  let best = null;
  for (const k of liste) {
    const hin = wegInfo(z, von, k, wiese);
    if (!hin) continue;
    const lWarte = Math.hypot(hin.vorZiel.x - k.x, hin.vorZiel.y - k.y), lHin = Math.max(0, hin.laenge - lWarte);
    const anWarte = hinAb + lHin / LAUFTEMPO, drinAb = freiAb(z, k, anWarte + lWarte / LAUFTEMPO);
    if (!best || drinAb < best.drinAb - EPS || (Math.abs(drinAb - best.drinAb) < EPS && lHin < best.lHin))
      best = { k, warte: { x: hin.vorZiel.x, y: hin.vorZiel.y }, lHin, anWarte, drinAb };
  }
  if (!best) return null;
  const zurueck = wegInfo(z, best.k, nach, wiese);
  if (!zurueck) return null;
  const drinBis = best.drinAb + TOILETTE.dauer;
  const gang = { art, von: { ...von }, kabine: { ...best.k }, warte: best.warte, nach: { ...nach }, hinAb, anWarte: best.anWarte,
    drinAb: best.drinAb, drinBis, zurueckBis: drinBis + zurueck.laenge / LAUFTEMPO, lHin: best.lHin, lZurueck: zurueck.laenge };
  z.wc.belegt.push({ x: best.k.x, y: best.k.y, von: best.drinAb, bis: drinBis });
  return gang;
}
const gangDazu = (L, g, gang) => { if (!gang) return; (g.gaenge = g.gaenge || []).push(gang); L.wcBis = Math.max(L.wcBis || 0, gang.zurueckBis); };
// Alte Belegungen vergessen
function aufraeumen(z) { z.wc.belegt = z.wc.belegt.filter(b => b.bis > z.minuten - 60); }

// Beim Losschicken der Besucher (ablauf.js → gaesteAuslosen): Startwerte, Gang vorher, Gang am Platz.
// start(i): wo Gast i losläuft; beginn/ende: Zeiten der Veranstaltung.
export function gaengeBeimAnreisen(z, raeume, L, start, beginn, ende) {
  wcAnlegen(z); aufraeumen(z);
  const liste = kabinen(z, raeume);
  const wiese = liste.length ? wiesenKarte(z) : null;
  const plaene = [];
  L.gaeste.forEach((g, i) => {
    const t0 = L.ankunft + i * ABSTAND;
    g.wc0 = { t: t0, w: startWert(L.id, g.id) };
    g.gaenge = [];
    if (!g.sitz || !liste.length) return;
    const direkt = wegInfo(z, start(i), g.sitz, wiese);
    plaene.push({ g, i, t0, amPlatz: t0 + (direkt ? direkt.laenge : 0) / LAUFTEMPO });
  });
  // Wer zuerst ankommt, kommt zuerst dran
  for (const p of plaene.sort((a, b) => a.amPlatz - b.amPlatz)) {
    const { g, i, t0 } = p;
    let sitztAb = p.amPlatz;
    if (toiletteWert(g, p.amPlatz) > TOILETTE.vorherAb) {
      const gang = gangPlanen(z, liste, 'vorher', start(i), g.sitz, t0, wiese);
      gangDazu(L, g, gang);
      if (gang) sitztAb = gang.zurueckBis;
    }
    // Am Platz: vor der Veranstaltung ab 80 %, während der Veranstaltung erst ab 100 %
    const t80 = zeitBis(g, sitztAb, TOILETTE.suchenAb);
    let ab = null;
    if (t80 < beginn) ab = t80;
    else { const t100 = zeitBis(g, Math.max(sitztAb, beginn), TOILETTE.waehrendAb); if (t100 < ende) ab = t100; }
    if (ab !== null) gangDazu(L, g, gangPlanen(z, liste, 'sitz', g.sitz, g.sitz, ab, wiese));
  }
}

// Nach der Veranstaltung (ablauf.js → gottesdienstEnde/saalEnde): Wer ohne Kaffee heimgeht und 80 % hat, geht vorher zur Toilette.
// Kaffeegäste: noch nicht (offener Punkt im Spielprinzip).
export function gaengeBeimHeimgehen(z, raeume, L, start) {
  wcAnlegen(z);
  const liste = kabinen(z, raeume);
  if (!liste.length || !L.gaeste) return;
  const wiese = wiesenKarte(z), ende = L.gottesdienstEnde;
  L.gaeste.forEach((g, i) => {
    if (!g.sitz || (g.kaffee && typeof g.kaffee.ab === 'number')) return;
    const ab = ende + i * ABSTAND * 0.5;
    if ((g.gaenge || []).some(s => s.zurueckBis > ab)) return;   // ist gerade unterwegs zur Toilette
    if (toiletteWert(g, ab) >= TOILETTE.suchenAb) gangDazu(L, g, gangPlanen(z, liste, 'heim', g.sitz, start(i), ab, wiese));
  });
}

// Fällt die Veranstaltung aus, gehen alle heim: noch nicht begonnene Gänge am Platz und ihre Belegung fallen weg.
export function gaengeAbsagen(z, L) {
  if (!L.gaeste || !z.wc) return;
  for (const g of L.gaeste) {
    const weg = (g.gaenge || []).filter(s => s.art !== 'vorher' && s.hinAb >= z.minuten);
    if (!weg.length) continue;
    g.gaenge = g.gaenge.filter(s => !weg.includes(s));
    z.wc.belegt = z.wc.belegt.filter(b => !weg.some(s => s.kabine.x === b.x && s.kabine.y === b.y && s.drinAb === b.von));
  }
}

// Der Gang, der zur Zeit t läuft (oder null)
export function gangBei(g, t) { return (g.gaenge || []).find(s => t >= s.hinAb && t < s.zurueckBis) || null; }
// Wo ist die Person in diesem Gang zur Zeit t? strecke(schluessel, von, nach) liefert den Weg wie bei bewegung.js.
// → { x, y, wartet, drin } – das Laufen wird so gestreckt, dass die geplanten Zeiten genau stimmen.
export function gangOrt(s, t, strecke, punktAufWeg, schluessel) {
  if (t < s.anWarte) {
    const w = strecke(schluessel + 'h', s.von, s.warte), f = s.anWarte > s.hinAb ? (t - s.hinAb) / (s.anWarte - s.hinAb) : 1;
    return { ...punktAufWeg(w, f * w.laenge), wartet: false, drin: false };
  }
  if (t < s.drinAb) return { x: s.warte.x, y: s.warte.y, wartet: true, drin: false };
  if (t < s.drinBis) return { x: s.kabine.x, y: s.kabine.y, wartet: false, drin: true };
  const w = strecke(schluessel + 'z', s.kabine, s.nach), f = s.zurueckBis > s.drinBis ? (t - s.drinBis) / (s.zurueckBis - s.drinBis) : 1;
  return { ...punktAufWeg(w, f * w.laenge), wartet: false, drin: false };
}

// Für das Besucher-Kärtchen: aktueller Wert (0–100, ganze Zahl) oder null, wenn die Person gerade nicht bei der Gemeinde ist
export function toiletteAktuell(z, id) {
  for (const L of (z.laeufe || []).slice().reverse()) {
    const g = L.gaeste && L.gaeste.find(x => x.id === id);
    if (!g || !g.wc0) continue;
    if (L.phase === 'ende' && !(g.gaenge || []).some(s => s.zurueckBis > z.minuten)) return null;   // schon auf dem Heimweg
    const w = toiletteWert(g, z.minuten);
    return w === null ? null : Math.round(w);
  }
  return null;
}
