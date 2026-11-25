// Spiellogik des Ortes: Wer läuft tagsüber auf dem Gehweg vorbei, und wer wird dabei neugierig?
// Jeden Tag um 0:00 wird geplant, wer an diesem Tag vorbeiläuft. Kommt jemand am Tor vorbei, wird ausgelost,
// ob er neugierig wird – dann bleibt er kurz stehen und kommt wahrscheinlich zum nächsten Gottesdienst.
// Kennt keine Grafik: liefert nur Positionen und Zustände.
import { ORT, NEUGIER, PLAKAT } from '../inhalte/ort.js';
import { GRUNDSTUECK, GEHWEGE, WELT } from '../inhalte/umgebung.js';
import { LAUFTEMPO } from '../inhalte/zeit.js';
import { TAG_MIN } from './zeit.js';
import { neuePerson, kaffeeVorliebe } from './besucher.js';
import { platzImGebiet } from './einzugsgebiet.js';
import { passantKommt, offenesKirchkaffee } from './kirchkaffee.js';
import { feiertagAmTag } from './kalender.js';
import { FEIERTAG_PASSANTEN } from '../inhalte/kirchenjahr.js';
import { gelaende, schaukastenNeugier } from './gelaende.js';
import { erkenneRaeume } from './karte.js';

const G = GRUNDSTUECK;
const TOR_X = G.tor.x + G.tor.breite / 2 - 0.5;                        // Mitte des Tors
const gehwegY = () => (GEHWEGE.find(w => w.w > w.h && w.y >= G.y + G.h) || { y: G.y + G.h + 1 }).y;
const zwischen = ([a, b], zufall) => a + Math.floor(zufall() * (b - a + 1));
export const MELDUNG_DAUER = 120;                                     // so lange (Spielminuten) bleibt eine Meldung stehen

export function ortAnlegen(z) {
  if (!z.ort) z.ort = { leute: [], tag: -1, gaenge: [], meldung: null };
}

// Eine Person anhand der Nummer finden: Besucher oder Passant aus dem Ort
export function mensch(z, id) { return z.besucher.find(b => b.id === id) || (z.ort ? z.ort.leute.find(p => p.id === id) : null) || null; }

// Wer läuft heute vorbei? Ein paar bekannte Besucher, dazu Passanten – zur Hälfte bekannte Gesichter,
// zur Hälfte neue Leute, solange im Einzugsgebiet noch Platz ist.
function tagPlanen(z, tag, zufall) {
  const o = z.ort, heute = new Set();
  let frei = platzImGebiet(z);
  o.tag = tag; o.gaenge = [];
  // An gesetzlichen Feiertagen (bundesweit + Baden-Württemberg) sind doppelt so viele Leute unterwegs (Lukas, 25.11.)
  const n = zwischen(ORT.passantenProTag, zufall) * (feiertagAmTag(tag) ? FEIERTAG_PASSANTEN : 1), k = Math.min(z.besucher.length, zwischen(ORT.bekannteProTag, zufall));
  const nehmen = liste => { const frei = liste.filter(p => !heute.has(p.id)); return frei.length ? frei[Math.floor(zufall() * frei.length)] : null; };
  for (let i = 0; i < n; i++) {
    let p = null;
    if (i < k) p = nehmen(z.besucher);
    else {
      const bekannt = o.leute.length && (frei <= 0 || zufall() < ORT.anteilBekannt);
      if (bekannt) p = nehmen(o.leute);
      if (!p && frei > 0) { p = neuePerson(z, zwischen(ORT.haltung, zufall), zufall); o.leute.push(p); frei--; }
    }
    if (!p) continue;
    heute.add(p.id);
    const richtung = zufall() < 0.5 ? 1 : -1, x0 = richtung > 0 ? -1 : WELT.w;
    const start = tag * TAG_MIN + ORT.von * 60 + Math.floor(zufall() * (ORT.bis - ORT.von) * 60);
    if (start < z.minuten) continue;                                    // Spielstand mitten am Tag geladen: was vorbei ist, entfällt
    o.gaenge.push({ id: p.id, start, richtung, x0, tor: start + Math.abs(TOR_X - x0) / LAUFTEMPO, halt: 0, geprueft: false });
  }
}

// Chance, am Tor neugierig zu werden: 5 % + halbe Bekanntheit + Gelände ÷ 10 + 10 je Schaukasten-Aushang (Prozentpunkte);
// mit Plakat 3×, höchstens 100 %
export function neugierTeile(z, gruppe = erkenneRaeume(z).gruppe) {
  return { grund: NEUGIER.grund, bekanntheit: z.bekanntheit * NEUGIER.proBekanntheit, gelaende: gelaende(z, gruppe).neugier, schaukasten: schaukastenNeugier(z, gruppe) };
}
export function neugierChance(z, mitPlakat = !!z.plakat, gruppe) {
  const t = neugierTeile(z, gruppe), c = t.grund + t.bekanntheit + t.gelaende + t.schaukasten;
  return Math.min(1, c * (mitPlakat ? PLAKAT.faktor : 1));
}
// Am Tor: Passanten (noch nie da gewesen) werden nach neugierChance neugierig.
// Hat das Kirchkaffee offen, geht wer Kaffee mag (Chance = Kaffee-Wert) hinein – Passanten wie bekannte Besucher (25.11.).
function amTor(z, g, zufall, raeume) {
  g.geprueft = true;
  const p = z.ort.leute.find(x => x.id === g.id);
  if (p && !p.neugierig && zufall() < neugierChance(z)) {
    p.neugierig = true; g.halt = NEUGIER.haltMinuten;
    z.ort.meldung = { code: 'neugierig', id: p.id, name: p.vorname, zeit: z.minuten };
    return;
  }
  const wer = mensch(z, g.id);
  if (!raeume || !wer || !offenesKirchkaffee(z, raeume)) return;
  if (zufall() < kaffeeVorliebe(wer) && passantKommt(z, raeume, { id: wer.id, name: wer.vorname })) g.imKaffee = true;
}

// Nächster Schritt im Ort (für das Tick-System in ablauf.js)
export function ortSchritt(z, zufall) {
  if (z.ortRuhig) return null;                                           // nur für Tests: ruhiger Ort ohne Passanten
  const o = z.ort, tag = Math.floor(z.minuten / TAG_MIN), morgen = (tag + 1) * TAG_MIN;
  if (o.tag < tag) return { zeit: z.minuten, tun: () => tagPlanen(z, tag, zufall) };
  let g = null;
  for (const x of o.gaenge) if (!x.geprueft && (!g || x.tor < g.tor)) g = x;
  if (g && g.tor < morgen) return { zeit: g.tor, tun: (zz, raeume) => amTor(z, g, zufall, raeume) };
  return { zeit: morgen, tun: () => tagPlanen(z, tag + 1, zufall) };
}

// Wo laufen die Passanten gerade? Wer gerade zum Gottesdienst unterwegs ist, wird hier nicht doppelt gezeigt.
export function passantenPositionen(z) {
  if (!z.ort) return [];
  const t = z.minuten, y = gehwegY(), imGottesdienst = new Set((z.laeufe || []).filter(L => L.gaeste).flatMap(L => L.gaeste.map(g => g.id)));
  return z.ort.gaenge.map(g => {
    if (t < g.start || imGottesdienst.has(g.id)) return null;
    if (g.imKaffee && t >= g.tor) return null;                      // ist ins Kirchkaffee gegangen
    const p = mensch(z, g.id);
    if (!p) return null;
    const dTor = Math.abs(TOR_X - g.x0);
    let d = (t - g.start) * LAUFTEMPO;
    const steht = d >= dTor && d < dTor + g.halt * LAUFTEMPO;
    if (d > dTor) d = Math.max(dTor, d - g.halt * LAUFTEMPO);
    const x = g.x0 + g.richtung * d;
    if (x < -1 || x > WELT.w) return null;
    return { id: g.id, name: p.vorname, x, y, sitzt: false, passant: true, steht };
  }).filter(Boolean);
}

// Meldung „… ist am Tor stehen geblieben“: noch aktuell?
export function ortMeldung(z) {
  const m = z.ort && z.ort.meldung;
  return m && z.minuten - m.zeit < MELDUNG_DAUER ? { code: m.code, name: m.name } : null;
}
