// Bedürfnis Toilette (Spielprinzip von Lukas, 26.11.: claude/spielprinzip-toiletten.md). Kennt keine Grafik.
//
// Jeder Besucher einer Veranstaltung hat einen Wert 0–100 %, der ab dem Ankommen langsam steigt (TOILETTE in inhalte/toiletten.js).
// Toilettengänge werden zu festen Zeitpunkten geplant, so wie der Rest des Ablaufs (ablauf.js):
//   • vorher:  beim Losschicken – liegt der Wert beim Ankommen über 50 % und ist eine Kabine in der Nähe frei, geht er erst
//              zur Toilette und dann zum Platz; sonst direkt zum Platz.
//   • sitz:    sitzt er und hat 80 % (vor oder während der Veranstaltung), geht er los, sobald eine Kabine in der Nähe frei ist.
//   • heim:    nach der Veranstaltung: wer ohne Kaffee heimgeht und 80 % hat, geht vorher noch zur Toilette, wenn eine frei ist.
// Neu 27.11. (Lukas): Man geht so los, dass man ankommt, wenn die Kabine frei ist – keine Schlange mehr. „In der Nähe“ heißt
// höchstens TOILETTE.umkreis Kästchen Laufweg. Erreicht jemand 100 %, ohne unterwegs zu sein: −10 Haltung, der Wert springt
// auf 50 % und steigt weiter (unfallSchritt). Ab 80 % zeigt die Figur ein rotes WC-Symbol (spiel.js → karte).
// Ein Gang: { art, von, kabine, warte (Platz davor), nach, hinAb, anWarte, drinAb, drinBis, zurueckBis, lHin, lZurueck }.
import { TOILETTE } from '../inhalte/toiletten.js';
import { LAUFTEMPO, ABSTAND } from '../inhalte/zeit.js';
import { moebelImRaum, hindernisBei } from './moebel.js';
import { weg, glaetten, wiesenKarte } from './wege.js';
import { zufriedenheitAendern } from './besucher.js';

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

// Verlauf des Werts bis zur Zeit t: { w (0–100), unfaelle (wie oft bis t die 100 % erreicht wurden, ohne unterwegs zu sein) }.
// In der Kabine: 0. Nach einem Gang beginnt er wieder bei 0. Unterwegs zur Kabine bleibt er höchstens bei 100 (kein Unfall).
function verlauf(g, t) {
  if (!g || !g.wc0 || t < g.wc0.t) return null;
  const U = TOILETTE.unfall, R = TOILETTE.proStunde;
  let b = { t: g.wc0.t, w: g.wc0.w }, n = 0;
  const zeiten = [];
  const bei = x => b.w + R * (x - b.t) / 60;
  const steigen = bis => {   // ohne Gang von b bis „bis“: bei jedem Erreichen von 100 % ein Unfall, danach 50 %
    if (R <= 0 || U.danach >= U.ab) return;
    for (let i = 0; i < 10000; i++) {
      const hit = b.t + Math.max(0, U.ab - b.w) / R * 60;
      if (hit > bis + EPS) return;
      n++; zeiten.push(hit); b = { t: hit, w: U.danach };
    }
  };
  const los = s => s.hinAb ?? s.drinAb;
  const gaenge = (g.gaenge || []).filter(s => !s.ware).sort((a, c) => los(a) - los(c));   // Automaten-Gänge zählen nicht
  for (const s of gaenge) {
    if (t < los(s)) break;
    steigen(los(s));
    if (t < s.drinAb) return { w: Math.min(100, Math.max(0, bei(t))), unfaelle: n, zeiten };
    if (t < s.drinBis) return { w: 0, unfaelle: n, zeiten };
    b = { t: s.drinBis, w: 0 };
  }
  steigen(t);
  return { w: Math.min(100, Math.max(0, bei(t))), unfaelle: n, zeiten };
}
// Wert eines Gastes zur Zeit t (0–100) oder null
export function toiletteWert(g, t) { const v = verlauf(g, t); return v ? v.w : null; }
// Wann erreicht der Wert die Schwelle? (ab der Basis zur Zeit ab; gilt bis zum nächsten Unfall, also für Schwellen bis 100 %)
function zeitBis(g, ab, schwelle) {
  const w = toiletteWert(g, ab);
  if (w === null) return Infinity;
  return w >= schwelle ? ab : ab + (schwelle - w) / TOILETTE.proStunde * 60;
}

// Weglänge in Kästchen (wie die Figuren laufen) und das Kästchen direkt vor dem Ziel
export function wegInfo(z, von, nach, wiese) {
  const blockiert = (x, y) => hindernisBei(z, x, y) || z.personen.some(p => p.x === x && p.y === y);
  const roh = weg(z, von, nach, blockiert, wiese);
  if (!roh) return null;
  const pfad = glaetten(z, roh, blockiert, wiese);
  let laenge = 0;
  for (let i = 0; i < pfad.length - 1; i++) laenge += Math.hypot(pfad[i + 1].x - pfad[i].x, pfad[i + 1].y - pfad[i].y);
  return { laenge, vorZiel: roh.length >= 2 ? roh[roh.length - 2] : roh[0] };
}

// Frühester Zeitpunkt ab t, zu dem das Ziel frei ist (für die Dauer eines Gangs). belegt: Liste der Belegungen dieses Zielorts.
function freiAb(belegt, k, t, dauer) {
  const liste = belegt.filter(b => b.x === k.x && b.y === k.y).sort((a, b) => a.von - b.von);
  for (const b of liste) if (t + dauer > b.von + EPS && t < b.bis - EPS) t = b.bis;
  return t;
}

// Einen Gang planen: das Ziel, an das man am frühesten herankommt (bei Gleichstand das nähere). → Gang oder null
// Allgemein für alle Gänge „hin – kurz dort – zurück“: Toilette (Standard) und Automaten (automaten.js, eigene belegt/dauer).
// merken = false: Belegung noch nicht eintragen (dann belegungMerken aufrufen, wenn der Gang wirklich genommen wird).
// Toilette (27.11.): mit reserv – nur Kabinen höchstens TOILETTE.umkreis Kästchen Laufweg von nah (Standard: von) zählen,
// man kommt an, wenn die Kabine frei ist, und losgegangen wird frühestens hinAb, spätestens bis (sonst null).
function gangPlanen(z, liste, art, von, nach, hinAb, wiese, belegt = z.wc.belegt, dauer = TOILETTE.dauer, merken = true, reserv = null) {
  if (reserv) return toilettenGang(z, liste, art, von, nach, hinAb, wiese, reserv);
  let best = null;
  for (const k of liste) {
    const hin = wegInfo(z, von, k, wiese);
    if (!hin) continue;
    const lWarte = Math.hypot(hin.vorZiel.x - k.x, hin.vorZiel.y - k.y), lHin = Math.max(0, hin.laenge - lWarte);
    const anWarte = hinAb + lHin / LAUFTEMPO, drinAb = freiAb(belegt, k, anWarte + lWarte / LAUFTEMPO, dauer);
    if (!best || drinAb < best.drinAb - EPS || (Math.abs(drinAb - best.drinAb) < EPS && lHin < best.lHin))
      best = { k, warte: { x: hin.vorZiel.x, y: hin.vorZiel.y }, lHin, anWarte, drinAb };
  }
  if (!best) return null;
  const zurueck = wegInfo(z, best.k, nach, wiese);
  if (!zurueck) return null;
  const drinBis = best.drinAb + dauer;
  const gang = { art, von: { ...von }, kabine: { ...best.k }, warte: best.warte, nach: { ...nach }, hinAb, anWarte: best.anWarte,
    drinAb: best.drinAb, drinBis, zurueckBis: drinBis + zurueck.laenge / LAUFTEMPO, lHin: best.lHin, lZurueck: zurueck.laenge };
  if (merken) belegungMerken(belegt, gang);
  return gang;
}
export function belegungMerken(belegt, gang) { belegt.push({ x: gang.kabine.x, y: gang.kabine.y, von: gang.drinAb, bis: gang.drinBis }); }

// Toilettengang mit Reservierung (Lukas, 27.11.): Man geht ab 80 % los – so getimt, dass man genau ankommt, wenn die Kabine frei
// wird (Lukas: „Pass die Losgeh-Zeit an“). Keine Schlange; die Kabine ist für einen reserviert, belegt aber nur, solange er drin ist.
// Gewählt wird die Kabine, zu der man am frühesten losgehen kann (bei Gleichstand die nähere).
// reserv: { nah (Ort, von dem aus „in der Nähe“ gemessen wird), bis (spätestens losgehen) }
function toilettenGang(z, liste, art, von, nach, hinAb, wiese, { nah = von, bis = hinAb }) {
  const belegt = z.wc.belegt;
  let best = null;
  for (const k of liste) {
    const naehe = nah === von ? null : wegInfo(z, nah, k, wiese);
    if (nah !== von && !naehe) continue;
    const hin = wegInfo(z, von, k, wiese);
    if (!hin) continue;
    if ((naehe ? naehe.laenge : hin.laenge) > TOILETTE.umkreis + EPS) continue;   // zu weit weg
    const lWarte = Math.hypot(hin.vorZiel.x - k.x, hin.vorZiel.y - k.y), lHin = Math.max(0, hin.laenge - lWarte);
    const weg = hin.laenge / LAUFTEMPO;
    const los = freiAb(belegt, k, hinAb + weg, TOILETTE.dauer) - weg;   // ankommen, wenn sie frei wird
    if (los > bis + EPS) continue;   // nicht rechtzeitig frei
    if (!best || los < best.los - EPS || (Math.abs(los - best.los) < EPS && lHin < best.lHin))
      best = { k, warte: { x: hin.vorZiel.x, y: hin.vorZiel.y }, lHin, lWarte, los };
  }
  if (!best) return null;
  const zurueck = wegInfo(z, best.k, nach, wiese);
  if (!zurueck) return null;
  const anWarte = best.los + best.lHin / LAUFTEMPO, drinAb = anWarte + best.lWarte / LAUFTEMPO, drinBis = drinAb + TOILETTE.dauer;
  const gang = { art, von: { ...von }, kabine: { ...best.k }, warte: best.warte, nach: { ...nach }, hinAb: best.los, anWarte,
    drinAb, drinBis, zurueckBis: drinBis + zurueck.laenge / LAUFTEMPO, lHin: best.lHin, lZurueck: zurueck.laenge };
  belegungMerken(belegt, gang);
  return gang;
}
// Allgemeiner Gang zu einem von mehreren Zielen (z. B. Platz vor einem Automaten). ziele: [{ x, y, … }] – weitere Felder
// (etwa die Lage des Automaten) landen im Gang unter „kabine“. → Gang oder null
export function gangZu(z, ziele, art, von, nach, hinAb, { belegt, dauer, merken = true }) {
  if (!ziele.length) return null;
  return gangPlanen(z, ziele, art, { x: Math.round(von.x), y: Math.round(von.y) }, nach, hinAb, wiesenKarte(z), belegt, dauer, merken);
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
    g.gaenge = []; g.unfaelle = 0;
    if (!g.sitz) g.wcEnde = t0;   // kein Platz frei: geht gleich wieder heim
    if (!g.sitz || !liste.length) return;
    const direkt = wegInfo(z, start(i), g.sitz, wiese);
    plaene.push({ g, i, t0, amPlatz: t0 + (direkt ? direkt.laenge : 0) / LAUFTEMPO });
  });
  // Wer zuerst ankommt, kommt zuerst dran
  for (const p of plaene.sort((a, b) => a.amPlatz - b.amPlatz)) {
    const { g, i, t0 } = p;
    let sitztAb = p.amPlatz;
    if (toiletteWert(g, p.amPlatz) > TOILETTE.vorherAb) {
      // nur, wenn beim Losgehen eine Kabine in der Nähe des Platzes frei ist – sonst direkt zum Platz
      const gang = gangPlanen(z, liste, 'vorher', start(i), g.sitz, t0, wiese, undefined, undefined, true, { nah: g.sitz, bis: t0 });
      gangDazu(L, g, gang);
      if (gang) sitztAb = gang.zurueckBis;
    }
    // Am Platz (27.11.): ab 80 % losgehen, sobald eine Kabine in der Nähe frei ist – vor und während der Veranstaltung.
    // Wird bis 100 % keine frei: Unfall (−10 Haltung, 50 %), danach wieder ab 80 %.
    let ab = sitztAb;
    for (let n = 0; n < 50; n++) {
      const t80 = zeitBis(g, ab, TOILETTE.suchenAb);
      if (t80 >= ende) break;
      const t100 = zeitBis(g, t80, TOILETTE.unfall.ab);
      const gang = gangPlanen(z, liste, 'sitz', g.sitz, g.sitz, t80, wiese, undefined, undefined, true, { bis: Math.min(t100, ende) - EPS });
      if (gang) { gangDazu(L, g, gang); ab = gang.zurueckBis; continue; }
      if (t100 >= ende) break;
      ab = t100 + EPS;   // keine Kabine rechtzeitig frei: Unfall bei 100 %, dann geht es bei 50 % weiter
    }
  }
}

// Nach der Veranstaltung (ablauf.js → gottesdienstEnde/saalEnde): Wer ohne Kaffee heimgeht und 80 % hat, geht vorher zur Toilette.
// Kaffeegäste: übernimmt das Kirchkaffee (siehe unten, kirchkaffee.js).
export function gaengeBeimHeimgehen(z, raeume, L, start) {
  wcAnlegen(z);
  if (!L.gaeste) return;
  const liste = kabinen(z, raeume);
  const wiese = liste.length ? wiesenKarte(z) : null, ende = L.gottesdienstEnde;
  L.gaeste.forEach((g, i) => {
    if (!g.sitz || (g.kaffee && typeof g.kaffee.ab === 'number')) return;
    const ab = ende + i * ABSTAND * 0.5;
    const unterwegs = (g.gaenge || []).find(s => s.zurueckBis > ab);
    if (unterwegs) { g.wcEnde = unterwegs.zurueckBis; return; }   // ist gerade unterwegs zur Toilette, geht danach heim
    if (liste.length && toiletteWert(g, ab) >= TOILETTE.suchenAb - EPS)
      gangDazu(L, g, gangPlanen(z, liste, 'heim', g.sitz, start(i), ab, wiese, undefined, undefined, true, { nah: g.sitz, bis: ab }));
    // Bis wann zählt der Wert? Bis er heimgeht (oder von der Toilette aus heim) – danach kein Unfall mehr
    const heim = (g.gaenge || []).find(s => s.art === 'heim');
    g.wcEnde = heim ? heim.zurueckBis : ab;
  });
}

// ── Kirchkaffee (Lukas, 26.11. abends: „gehen auch zur Toilette, gleiches Bedürfnis“) ──
// Wer nach dem Gottesdienst ins Kirchkaffee geht, nimmt seinen Wert mit: Der Kunde bekommt ein eigenes wc0 (Wert beim Wechsel)
// und eigene gaenge – so rechnet toiletteWert() mit ihm genauso wie mit einem Gast der Veranstaltung.
// Das Kirchkaffee plant die Gänge nicht vorab, sondern im Moment, in dem es so weit ist (kirchkaffee.js).
export function gibtToiletten(z, raeume) { return kabinen(z, raeume).length > 0; }
// Wert des Gastes zur Zeit ab als Startpunkt für das Kirchkaffee (oder null, wenn er noch keinen Wert hat)
export function wertMitnehmen(g, ab) { const w = toiletteWert(g, ab); return w === null ? null : { t: ab, w }; }
// Muss er jetzt zur Toilette? (ab 80 % – im Kirchkaffee läuft keine Veranstaltung)
export function mussZurToilette(g, t) { const w = toiletteWert(g, t); return w !== null && w >= TOILETTE.suchenAb - EPS; }
// Wann wird die nächste Kabine wieder frei? (für das Kirchkaffee: wer wartet, schaut dann wieder) – oder null
export function naechsteFreieKabine(z, t) { const l = ((z.wc && z.wc.belegt) || []).map(b => b.bis).filter(x => x > t + EPS); return l.length ? Math.min(...l) : null; }
// Wann erreicht er die 80 %? (ab Zeit ab)
export function wannZurToilette(g, ab) { return zeitBis(g, ab, TOILETTE.suchenAb); }
// Einen Gang jetzt planen: von → Kabine → nach, Start ab. → Gang oder null (keine Toilette, kein Weg)
export function gangJetzt(z, raeume, art, von, nach, ab) {
  wcAnlegen(z); aufraeumen(z);
  const liste = kabinen(z, raeume);
  if (!liste.length) return null;
  const v = { x: Math.round(von.x), y: Math.round(von.y) };
  return gangPlanen(z, liste, art, v, nach, ab, wiesenKarte(z), undefined, undefined, true, { bis: ab });   // nur, wenn jetzt eine frei ist
}

// Fällt die Veranstaltung aus, gehen alle heim: noch nicht begonnene Gänge am Platz und ihre Belegung fallen weg.
export function gaengeAbsagen(z, L) {
  if (!L.gaeste) return;
  for (const g of L.gaeste) if (g.wc0 && g.wcEnde === undefined) g.wcEnde = z.minuten;   // alle gehen heim: kein Unfall mehr
  if (!z.wc) return;
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
  // Im Kirchkaffee: der eigene Wert des Kunden
  const k = z.kaffee && z.kaffee.kunden.find(x => x.id === id && x.wc0);
  if (k && z.minuten >= k.wc0.t) {
    if (k.phase === 'heim' && !(k.gang && k.gang.zurueckBis > z.minuten)) return null;   // schon auf dem Heimweg
    return Math.round(toiletteWert(k, z.minuten));
  }
  for (const L of (z.laeufe || []).slice().reverse()) {
    const g = L.gaeste && L.gaeste.find(x => x.id === id);
    if (!g || !g.wc0) continue;
    if (L.phase === 'ende' && !(g.gaenge || []).some(s => s.zurueckBis > z.minuten)) return null;   // schon auf dem Heimweg
    const w = toiletteWert(g, z.minuten);
    return w === null ? null : Math.round(w);
  }
  return null;
}

// ── Unfall bei 100 % (Lukas, 27.11.) ──
// Wer 100 % erreicht, ohne unterwegs zur Toilette zu sein, verliert Haltung (TOILETTE.unfall). Der Wert springt im Verlauf selbst
// auf 50 % (verlauf); hier wird nur die Haltung abgezogen – für jeden Unfall genau einmal (gezählt in g.unfaelle).
const menschVon = (z, id) => z.besucher.find(b => b.id === id) || (z.ort ? z.ort.leute.find(p => p.id === id) : null) || null;
// Alle, deren Wert gerade zählt: Gäste der Veranstaltungen und Kunden im Kirchkaffee → [{ g, bis }]
function wcPersonen(z) {
  const liste = [];
  for (const L of z.laeufe || []) for (const g of L.gaeste || []) {
    if (!g.wc0) continue;
    const bis = Math.min(g.wcEnde ?? Infinity, g.kaffee && typeof g.kaffee.ab === 'number' ? g.kaffee.ab : Infinity);
    liste.push({ g, bis });
  }
  for (const k of (z.kaffee && z.kaffee.kunden) || []) if (k.wc0) liste.push({ g: k, bis: k.wcEnde ?? Infinity });
  return liste;
}
// Nächster Unfall (für das Tick-System) – oder null
export function unfallSchritt(z) {
  const t = z.minuten;
  let naechste = Infinity, faellig = false;
  for (const { g, bis } of wcPersonen(z)) {
    const v = verlauf(g, Math.min(t, bis));
    if (!v) continue;
    if (g.unfaelle === undefined) g.unfaelle = v.unfaelle;   // alte Spielstände: Vergangenes nicht nachträglich abziehen
    if (v.unfaelle > g.unfaelle) { faellig = true; continue; }
    if (t >= bis) continue;
    // Wann wäre der nächste? (mit den Gängen, die bis jetzt geplant sind; höchstens einen Tag voraus)
    const vor = verlauf(g, Math.min(bis, t + 24 * 60));
    const hit = vor && vor.zeiten.find(x => x > t + EPS && x <= bis);
    if (hit !== undefined && hit !== null) naechste = Math.min(naechste, hit);
  }
  if (faellig) naechste = t;
  return Number.isFinite(naechste) ? { zeit: naechste, tun: zz => unfaelleAbziehen(zz) } : null;
}
export function unfaelleAbziehen(z) {
  for (const { g, bis } of wcPersonen(z)) {
    const v = verlauf(g, Math.min(z.minuten + EPS, bis));
    if (!v) continue;
    if (g.unfaelle === undefined) { g.unfaelle = v.unfaelle; continue; }
    if (v.unfaelle <= g.unfaelle) continue;
    const m = menschVon(z, g.id);
    if (m) zufriedenheitAendern(m, (v.unfaelle - g.unfaelle) * TOILETTE.unfall.haltung);
    g.unfaelle = v.unfaelle;
  }
}
