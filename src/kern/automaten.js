// Spiellogik der Automaten (Spielprinzip claude/spielprinzip-getraenkeautomat.md, Lukas 26.11.2026). Kennt keine Grafik.
//
// Gilt für jeden Automaten aus inhalte/automaten.js (bisher: Getränkeautomat):
//   • Wer auf dem Kirchengelände ist, kauft mit `chance` etwas – „gewürfelt“ fest aus Besuch und Person,
//     damit sich kein anderer Zufall im Spiel verschiebt (wie beim Toilettenwert). 27.11.: je eine Chance vorher und nachher.
//       – Gäste einer Veranstaltung: vorher auf dem Weg zum Platz, pünktlich zum Beginn (27.11.; geht das nicht, wird der
//         Wunsch nachher erfüllt). Nachher: im Kirchkaffee (während sie dort sind) oder auf dem Heimweg.
//       – Seelsorge (27.11.): auf dem Weg zum Pastor und auf dem Rückweg zum Tor (seelsorge.js).
//       – Kunden des Kirchkaffees zu den Öffnungszeiten: irgendwann während sie dort stehen oder sitzen (kirchkaffee.js).
//   • Der Gang zum Automaten läuft wie ein Toilettengang (toiletten.js → gangZu): hin, evtl. anstehen, kurz am Automaten,
//     zurück an den Platz. Bezahlt wird am Ende der Zeit am Automaten: Ware da → Preis als Einnahme, + Haltung;
//     Automat leer → − Haltung.
//   • Aufgefüllt wird vom Kirchkaffee-Ehrenamtlichen, wenn das Kirchkaffee zu hat (kirchkaffee.js → Einkauf im Laden).
//   • Verbesserungen (stufen) sind vorbereitet: Lager und Wert hängen schon an der Stufe des Automaten (m.stufe).
import { AUTOMATEN, AUTOMAT } from '../inhalte/automaten.js';
import { ABSTAND } from '../inhalte/zeit.js';
import { idx, LEER } from './karte.js';
import { moebelBei, moebelImRaum } from './moebel.js';
import { buchen } from './finanzen.js';
import { zufriedenheitAendern } from './besucher.js';
import { gangZu, gangAufDemWeg } from './toiletten.js';
import { wiesenKarte } from './wege.js';
import { zahlZeigen } from './kirchkaffee.js';

const EPS = 1e-6;
const NACHBARN = [[0, 1], [1, 0], [-1, 0], [0, -1]];

export function automatenAnlegen(z) { if (!z.automaten || !Array.isArray(z.automaten.belegt)) z.automaten = { belegt: [] }; }
function aufraeumen(z) { z.automaten.belegt = z.automaten.belegt.filter(b => b.bis > z.minuten - 60); }

// ---- Steckbrief, Stufe, Lager ----
export const automatTyp = art => AUTOMATEN.find(a => a.id === art) || null;
export const istAutomat = art => !!automatTyp(art);
export function automatStufe(m) { const a = automatTyp(m.art); return a.stufen[Math.min(a.stufen.length, m.stufe || 1) - 1]; }
export function lagerVon(m) { return automatStufe(m).lager; }

// „Würfel“ 0–1, fest aus einem Schlüssel gerechnet (wie startWert in toiletten.js)
function fest(schluessel) {
  let h = 2166136261;
  for (const c of schluessel) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}
// Will diese Person bei diesem Besuch etwas aus diesem Automaten? (besuch: Kennung des Besuchs)
export function willKaufen(a, besuch, personId) { return fest(`${a.id}:${besuch}:${personId}`) < a.chance; }
// Zweite Chance nach der Veranstaltung bzw. dem Gespräch (Lukas, 27.11.): eigener Besuchs-Schlüssel „…:nachher“
export const nachherBesuch = besuch => `${besuch}:nachher`;
const zeitpunktAnteil = (a, besuch, personId) => fest(`${a.id}:${besuch}:${personId}:wann`);

// Alle Automaten dieser Art, an denen verkauft wird (fertiger Raum des richtigen Typs), mit dem Platz davor
function stellplatz(z, raum, m) {
  const zellen = new Set(raum.zellen);
  for (const [dx, dy] of NACHBARN) {
    const x = m.x + dx, y = m.y + dy;
    if (zellen.has(idx(z, x, y)) && z.zellen[idx(z, x, y)] === LEER && !moebelBei(z, x, y) && !z.personen.some(p => p.x === x && p.y === y)) return { x, y };
  }
  return null;
}
export function automatenImBetrieb(z, raeume, art) {
  const a = automatTyp(art);
  if (!a) return [];
  return raeume.liste.filter(r => r.typ && r.typ.id === a.raum && !r.probleme.length)
    .flatMap(r => moebelImRaum(z, r, art).map(m => ({ m, raum: r, platz: stellplatz(z, r, m) })));
}
// Ziele für einen Gang: der Platz vor jedem Automaten (dazu die Lage des Automaten)
function ziele(z, raeume, art) {
  return automatenImBetrieb(z, raeume, art).filter(x => x.platz).map(x => ({ x: x.platz.x, y: x.platz.y, ax: x.m.x, ay: x.m.y }));
}
// Den Platz, an dem der Ehrenamtliche beim Auffüllen steht
export function auffuellPlatz(z, raum, m) { return stellplatz(z, raum, m) || { x: m.x, y: m.y + 1 }; }

// ---- Gang planen ----
// Einen Gang zum Automaten planen: von → Automat → nach, ab Zeit ab. merken=false: noch nicht reservieren. → Gang oder null
function gangPlanen(z, raeume, art, von, nach, ab, merken = true) {
  automatenAnlegen(z); aufraeumen(z);
  const gang = gangZu(z, ziele(z, raeume, art), 'automat', von, nach, ab, { belegt: z.automaten.belegt, dauer: AUTOMAT.kaufMinuten, merken });
  if (gang) { gang.ware = art; gang.automat = { x: gang.kabine.ax, y: gang.kabine.ay }; }
  return gang;
}

// Gäste einer Veranstaltung (ablauf.js → gaesteAuslosen, nach den Toilettengängen). Lukas, 27.11.: Wer kauft, geht auf dem Weg
// zum Platz über den Automaten und läuft so viel früher los, dass er trotzdem genau zum Beginn sitzt (g.los).
// Nur ein Automat auf dem Weg; wer schon über die Toilette geht oder keinen passenden Moment findet, kauft nachher.
export function automatenBeimAnreisen(z, raeume, L, start, beginn) {
  const arten = AUTOMATEN.filter(a => ziele(z, raeume, a.id).length);
  if (!arten.length || !L.gaeste) return;
  automatenAnlegen(z); aufraeumen(z);
  const wiese = wiesenKarte(z);
  L.gaeste.forEach((g, i) => {
    if (!g.sitz) return;
    let unterwegs = (g.gaenge || []).some(s => s.art === 'vorher');   // geht schon über die Toilette
    for (const a of arten) {
      if (!willKaufen(a, L.id, g.id)) continue;
      const gang = unterwegs ? null : gangAufDemWeg(z, ziele(z, raeume, a.id), 'vorher', start(i), g.sitz, beginn, L.ankunft,
        { belegt: z.automaten.belegt, dauer: AUTOMAT.kaufMinuten, wiese });
      if (!gang) { (g.automatOffen = g.automatOffen || []).push(a.id); continue; }   // danach (Kirchkaffee oder Heimweg)
      gang.ware = a.id; gang.automat = { x: gang.kabine.ax, y: gang.kabine.ay };
      (g.gaenge = g.gaenge || []).push(gang);
      g.los = gang.hinAb;
      unterwegs = true;
    }
    // Zweite Chance nachher (Lukas, 27.11.): wer nachher will, kauft im Kirchkaffee oder auf dem Heimweg (einmal je Automat)
    for (const a of arten) {
      if (willKaufen(a, nachherBesuch(L.id), g.id) && !(g.automatOffen || []).includes(a.id)) (g.automatOffen = g.automatOffen || []).push(a.id);
    }
  });
}
// Nach der Veranstaltung (ablauf.js, nach den Toilettengängen): Wer noch etwas will und gleich heimgeht, geht über den Automaten.
// Wer ins Kirchkaffee geht, kauft dort (kirchkaffee.js übernimmt g.automatOffen). Wer über die Toilette heimgeht, kauft nichts mehr.
export function automatenBeimHeimgehen(z, raeume, L, start) {
  if (!L.gaeste || L.ausgefallen) return;
  const ende = L.gottesdienstEnde;
  L.gaeste.forEach((g, i) => {
    if (!g.sitz || !g.automatOffen || !g.automatOffen.length || (g.kaffee && typeof g.kaffee.ab === 'number')) return;
    if ((g.gaenge || []).some(s => s.art === 'heim')) { g.automatOffen = []; return; }
    const art = g.automatOffen.shift();   // auf dem Heimweg nur ein Automat
    g.automatOffen = [];
    const ab = ende + i * ABSTAND * 0.5;
    if ((g.gaenge || []).some(s => s.zurueckBis > ab)) return;   // ist gerade unterwegs
    const gang = gangPlanen(z, raeume, art, g.sitz, start(i), ab);
    if (!gang) return;
    gang.art = 'automatHeim';
    (g.gaenge = g.gaenge || []).push(gang);
    L.wcBis = Math.max(L.wcBis || 0, gang.zurueckBis);   // der Ablauf bleibt, bis er vom Gelände ist
  });
}

// Kunde im Kirchkaffee (kirchkaffee.js): Wann geht er zum Automaten? Zwischen Ankunft am Platz (von) und dem Gehen (bis).
// arten: schon entschieden (Gottesdienst-Gast, der vorher keine Zeit hatte) – sonst wird jetzt „gewürfelt“.
// → [{ art, ab }] für jeden Automaten, aus dem er etwas will
export function kaufzeitenImKirchkaffee(z, raeume, besuch, personId, von, bis, arten = null) {
  return AUTOMATEN.filter(a => ziele(z, raeume, a.id).length && (arten ? arten.includes(a.id) : willKaufen(a, besuch, personId)))
    .map(a => ({ art: a.id, ab: von + zeitpunktAnteil(a, besuch, personId) * Math.max(0, bis - von - AUTOMAT.kaufMinuten - 10) }));
}
// Gang jetzt planen (Kunde im Kirchkaffee, steht/sitzt an platz) → Gang oder null
export function gangJetztZumAutomaten(z, raeume, art, platz, t) { return gangPlanen(z, raeume, art, platz, platz, t); }

// Seelsorge (Lukas, 27.11.): Gang über den Automaten – von → Automat → nach, ab Zeit ab – wenn die Person bei diesem
// Besuch etwas will (besuch: Kennung, für nachher mit nachherBesuch). Nur ein Automat pro Gang. → Gang oder null
export function automatGangSeelsorge(z, raeume, besuch, personId, von, nach, ab) {
  for (const a of AUTOMATEN) {
    if (!willKaufen(a, besuch, personId) || !ziele(z, raeume, a.id).length) continue;
    const gang = gangPlanen(z, raeume, a.id, von, nach, ab);
    if (gang) return gang;
  }
  return null;
}

// ---- Bezahlen ----
const menschVon = (z, id) => z.besucher.find(b => b.id === id) || (z.ort ? z.ort.leute.find(p => p.id === id) : null) || null;
function offeneKaeufe(z) {
  const liste = [];
  for (const L of z.laeufe || []) for (const g of L.gaeste || []) for (const s of g.gaenge || []) if (s.ware && !s.ergebnis) liste.push({ s, id: g.id });
  for (const k of (z.kaffee && z.kaffee.kunden) || []) for (const s of k.gaenge || []) if (s.ware && !s.ergebnis) liste.push({ s, id: k.id });
  const G = z.seelsorge && z.seelsorge.gang;   // Seelsorge (27.11.): auf dem Hin- oder Rückweg
  if (G) for (const s of [G.vor, G.nach]) if (s && s.ware && !s.ergebnis) liste.push({ s, id: G.id });
  return liste;
}
// Am Ende der Zeit am Automaten: Ware da → bezahlen, sonst leer
export function automatenAktualisieren(z) {
  const t = z.minuten;
  for (const { s, id } of offeneKaeufe(z).filter(x => x.s.drinBis <= t + EPS).sort((a, b) => a.s.drinBis - b.s.drinBis)) {
    const m = moebelBei(z, s.automat.x, s.automat.y), a = automatTyp(s.ware), mensch = menschVon(z, id);
    if (!m || m.art !== s.ware || !a) { s.ergebnis = 'weg'; continue; }   // Automat inzwischen abgerissen
    if ((m.fuellung || 0) > 0) {
      m.fuellung--;
      buchen(z, 'einnahmen', a.id, a.preis, { automat: a.id, stueck: 1 });
      zahlZeigen(z, s.kabine, a.preis);
      if (mensch) zufriedenheitAendern(mensch, a.haltung.ja);
      s.ergebnis = 'ja';
    } else {
      if (mensch) zufriedenheitAendern(mensch, a.haltung.leer);
      s.ergebnis = 'leer';
    }
  }
}
// Nächster Bezahl-Zeitpunkt (für das Tick-System) – oder null
export function automatenSchritt(z) {
  const l = offeneKaeufe(z);
  if (!l.length) return null;
  return { zeit: Math.max(z.minuten, Math.min(...l.map(x => x.s.drinBis))), tun: zz => automatenAktualisieren(zz) };
}

// ---- Auffüllen (kirchkaffee.js) ----
// Automat im Raum, dem mindestens auffuellenAb Waren fehlen (Lukas, 27.11.) und den gerade kein anderer Ehrenamtlicher
// auffüllt → { m, typ, fehlt } oder null
export function automatZumAuffuellen(z, raum, reserviert) {
  for (const a of AUTOMATEN) {
    if (raum.typ && raum.typ.id !== a.raum) continue;
    for (const m of moebelImRaum(z, raum, a.id)) {
      const fehlt = lagerVon(m) - (m.fuellung || 0);
      if (fehlt >= Math.max(1, a.auffuellenAb || 1) && !reserviert.has(idx(z, m.x, m.y))) return { m, typ: a, fehlt };
    }
  }
  return null;
}
export function auffuellen(z, pos, menge) {
  const m = moebelBei(z, pos.x, pos.y);
  if (m && istAutomat(m.art)) m.fuellung = Math.min(lagerVon(m), (m.fuellung || 0) + menge);
}

// ---- Abfragen für die Anzeige ----
export function automatInfo(z, raeume, m, raum) {
  const a = automatTyp(m.art);
  return { art: a.id, name: a.name, fuellung: m.fuellung || 0, lager: lagerVon(m), stufe: automatStufe(m).stufe, preis: a.preis, einkauf: a.einkauf,
    imRaum: !!(raum && raum.typ && raum.typ.id === a.raum) };
}
