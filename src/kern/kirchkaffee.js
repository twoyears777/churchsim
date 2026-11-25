// Spiellogik des Kirchkaffees (Spielprinzip vom 25.11.2026): Öffnungszeiten, Schlange an der Theke,
// Bedienung Schritt für Schritt und Kaffee-Einkauf im Laden. Kennt keine Grafik – liefert nur Positionen und Zustände.
//
// So läuft es (alle Zeiten in Spielminuten, Laufen mit LAUFTEMPO):
//   • Offen ist ein Kirchkaffee nach jedem Gottesdienst (2 Stunden) und in seinen eigenen Schichten (bis zu 3 pro Woche).
//   • Kunden stellen sich an der Theke an. Steht der vorderste an der Theke, bestellt er: Der Ehrenamtliche geht zur
//     Maschine, sie lädt, er geht zurück und gibt den Kaffee – erst dann gibt es 1 € (grüne Zahl) und +5 Haltung.
//   • Wer beim Schließen noch ansteht, wird fertig bedient.
//   • Danach setzt er sich mit SITZEN.chance auf einen freien Stuhl (sonst Stehplatz) und gibt beim Gehen Trinkgeld.
//   • Hat das Kirchkaffee zu und ist die Maschine nicht voll, geht der Ehrenamtliche in den Laden und kauft nach.
//
// Jede Figur hat eine „Bewegung“ { pfad, laenge, t0 }: Ab Zeit t0 läuft sie den Pfad entlang. Die Spiellogik wartet
// immer, bis sie wirklich angekommen ist – so stimmen Geld und Haltung mit dem überein, was man sieht.
import { LEER, idx } from './karte.js';
import { moebelImRaum, moebelBei, hindernisBei, fassung, stuhlStufe } from './moebel.js';
import { eingesetztIn, daten } from './personen.js';
import { buchen, kannBezahlen } from './finanzen.js';
import { zufriedenheitAendern } from './besucher.js';
import { weg, glaetten } from './wege.js';
import { punktAufWeg, strasse } from './bewegung.js';
import { umherPosition } from './umherlaufen.js';
import { slotBeginn, zeitpunkt } from './zeit.js';
import { LAUFTEMPO, SLOTS, DAUER } from '../inhalte/zeit.js';
import { AENDERUNG } from '../inhalte/besucher.js';
import { PREIS_TASSE, MAX_SCHICHTEN, SCHICHT_ENDE, LADEN_MINUTEN, EINKAUF, STEHEN_PASSANT, SITZEN } from '../inhalte/kirchkaffee.js';
import { GRUNDSTUECK, GEHWEGE, LADEN } from '../inhalte/umgebung.js';

const EPS = 1e-6;
const NACHBARN = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const ZAHL_MERKEN = 60;   // so lange (Spielminuten) bleiben „+1 €“ / „−5 €“ abrufbar; wie lange sie zu sehen sind, entscheidet die Anzeige

export function kaffeeAnlegen(z) {
  if (!z.kaffee) z.kaffee = { ma: {}, kunden: [], zahlen: [], nr: 0, meldung: null, gesperrt: {}, gemeldet: {} };
  if (!z.kaffeeZeiten) z.kaffeeZeiten = {};
}

// ---- Stationen: Kaffeemaschine + Theke + Ehrenamtlicher ----
function thekenGruppen(teile) {
  const rest = new Set(teile), gruppen = [];
  for (const start of teile) {
    if (!rest.has(start)) continue;
    const g = [start], stapel = [start]; rest.delete(start);
    while (stapel.length) {
      const t = stapel.pop();
      for (const n of [...rest]) if (Math.abs(n.x - t.x) + Math.abs(n.y - t.y) === 1) { rest.delete(n); g.push(n); stapel.push(n); }
    }
    gruppen.push(g);
  }
  return gruppen;
}
const frei = (z, zellen, p) => zellen.has(idx(z, p.x, p.y)) && z.zellen[idx(z, p.x, p.y)] === LEER && !moebelBei(z, p.x, p.y);
// Freies Kästchen direkt neben einem Möbel, möglichst nah am Ziel (ausser: dieses Kästchen nur, wenn es kein anderes gibt)
// belegt: Kästchen (idx), auf denen schon ein anderer Kirchkaffee-Mitarbeiter steht
function standplatz(z, raum, m, ziel, ausser = null, belegt = new Set()) {
  const zellen = new Set(raum.zellen);
  let liste = NACHBARN.map(([dx, dy]) => ({ x: m.x + dx, y: m.y + dy })).filter(p => frei(z, zellen, p) && !belegt.has(idx(z, p.x, p.y)));
  if (ausser && liste.some(p => p.x !== ausser.x || p.y !== ausser.y)) liste = liste.filter(p => p.x !== ausser.x || p.y !== ausser.y);
  liste.sort((a, b) => Math.hypot(a.x - ziel.x, a.y - ziel.y) - Math.hypot(b.x - ziel.x, b.y - ziel.y));
  return liste[0] || null;
}

// Standplatz an der Theke: am liebsten einer, bei dem an der Theke noch ein Platz für den Kunden frei bleibt (sonst stünde der Mitarbeiter auf der
// Kundenseite und niemand könnte bestellen). Danach lieber nicht derselbe wie an der Maschine, dann möglichst nah an ihr.
function thekenPlatz(z, raum, t, m, standMaschine, belegt) {
  const zellen = new Set(raum.zellen), gleich = (a, b) => a.x === b.x && a.y === b.y;
  const kundeOk = p => NACHBARN.some(([dx, dy]) => { const g = { x: t.x + dx, y: t.y + dy };
    return frei(z, zellen, g) && !belegt.has(idx(z, g.x, g.y)) && !gleich(g, standMaschine) && !gleich(g, p); });
  const liste = NACHBARN.map(([dx, dy]) => ({ x: t.x + dx, y: t.y + dy }))
    .filter(p => frei(z, zellen, p) && (gleich(p, standMaschine) || !belegt.has(idx(z, p.x, p.y))))
    .map(p => ({ p, wert: (kundeOk(p) ? 0 : 10) + (gleich(p, standMaschine) ? 1 : 0) + Math.hypot(p.x - m.x, p.y - m.y) / 100 }));
  liste.sort((a, b) => a.wert - b.wert);
  return liste.length ? liste[0].p : null;
}

// Alle fertigen Kirchkaffee-Räume mit ihren Stationen. fehlt: null | 'keinEhrenamt' | 'keineMaschine' | 'keineTheke'
export function kirchkaffeeZustand(z, raeume) {
  return raeume.liste.filter(r => r.typ && r.typ.id === 'kirchkaffee' && !r.probleme.length).map(r => {
    const maschinen = moebelImRaum(z, r, 'kaffeemaschine'), theken = thekenGruppen(moebelImRaum(z, r, 'theke'));
    const eas = z.personen.filter(p => eingesetztIn(z, raeume, p) === r);
    // Jede Station bekommt ein eigenes Thekenteil. Berühren sich zwei Theken, können trotzdem zwei Mitarbeiter
    // daran arbeiten (früher zählten sie als eine Theke – dann stand der zweite Mitarbeiter nur herum).
    const genutzt = new Set(), stehen = new Set(), stationen = [];
    for (const m of maschinen) {
      if (stationen.length >= eas.length) break;
      let beste = null;   // nächstgelegenes freies Thekenteil zur Maschine; bei gleicher Entfernung lieber eine eigene Theke
      for (const g of theken) {
        const schonBenutzt = g.some(t => genutzt.has(t));
        for (const t of g) {
          if (genutzt.has(t)) continue;
          const d = Math.abs(t.x - m.x) + Math.abs(t.y - m.y) + (schonBenutzt ? 0.5 : 0);
          if (!beste || d < beste.d) beste = { d, g, t };
        }
      }
      if (!beste) break;
      genutzt.add(beste.t);
      const ea = eas[stationen.length];
      // Zwei verschiedene Standplätze (wo möglich), damit man ihn zwischen Theke und Maschine laufen sieht
      const standMaschine = standplatz(z, r, m, beste.t, null, stehen) || { x: ea.x, y: ea.y };
      stehen.add(idx(z, standMaschine.x, standMaschine.y));
      const standTheke = thekenPlatz(z, r, beste.t, m, standMaschine, stehen) || { x: ea.x, y: ea.y };
      stehen.add(idx(z, standTheke.x, standTheke.y));
      stationen.push({ maschine: m, theke: beste.t, gruppe: beste.g, ea, raum: r, standMaschine, standTheke });
    }
    // Für die Schlange: die Thekenteile der eigenen Theke, die keine andere Station benutzt
    for (const st of stationen) { st.thekeTeile = st.gruppe.filter(t => t === st.theke || !genutzt.has(t)); delete st.gruppe; }
    const fehlt = !eas.length ? 'keinEhrenamt' : !maschinen.length ? 'keineMaschine' : !theken.length ? 'keineTheke' : null;
    return { raum: r, maschinen, stationen, fehlt };
  });
}
export function kirchkaffeeOffen(z, raeume) { return kirchkaffeeZustand(z, raeume).filter(k => k.stationen.length && offenBei(z, k.raum)).map(k => k.raum); }

// Plätze vor einer Theke für die Schlange: Platz 0 gegenüber dem Mitarbeiter, dann die nächsten freien Kästchen.
function schlangenPlaetze(z, s, belegt) {
  const zellen = new Set(s.raum.zellen), schon = new Set(belegt);
  const ok = p => frei(z, zellen, p) && !schon.has(idx(z, p.x, p.y));
  const gegenueber = { x: 2 * s.theke.x - s.standTheke.x, y: 2 * s.theke.y - s.standTheke.y };
  let vorne = ok(gegenueber) ? gegenueber : null;
  if (!vorne) {
    const um = s.thekeTeile.flatMap(t => NACHBARN.map(([dx, dy]) => ({ x: t.x + dx, y: t.y + dy }))).filter(ok);
    um.sort((a, b) => Math.hypot(b.x - s.standTheke.x, b.y - s.standTheke.y) - Math.hypot(a.x - s.standTheke.x, a.y - s.standTheke.y));
    vorne = um[0] || null;
  }
  if (!vorne) return [];
  const rest = s.raum.zellen.map(c => ({ x: c % z.w, y: (c / z.w) | 0 })).filter(p => ok(p) && (p.x !== vorne.x || p.y !== vorne.y));
  rest.sort((a, b) => Math.hypot(a.x - vorne.x, a.y - vorne.y) - Math.hypot(b.x - vorne.x, b.y - vorne.y));
  return [vorne, ...rest];
}

// ---- Öffnungszeiten ----
// Gespeichert in z.kaffeeZeiten: für jedes Kästchen des Raums dieselbe Liste [{ tag, slot }] (übersteht Umbauten).
export function schichtenVon(z, raum) {
  const l = z.kaffeeZeiten && z.kaffeeZeiten[raum.zellen[0]];
  return Array.isArray(l) ? l.filter(s => s.tag >= 0 && s.tag <= 6 && SLOTS.some(x => x.id === s.slot)).slice(0, MAX_SCHICHTEN) : [];
}
function schichtenSchreiben(z, raum, liste) {
  if (!z.kaffeeZeiten) z.kaffeeZeiten = {};
  for (const c of raum.zellen) { if (liste.length) z.kaffeeZeiten[c] = liste.map(s => ({ ...s })); else delete z.kaffeeZeiten[c]; }
}
// → 'ok' | 'voll' (schon 3) | 'belegt' (diese Zeit gibt es schon) | 'zeit'
export function schichtHinzufuegen(z, raum, tag, slot) {
  if (!(tag >= 0 && tag <= 6) || !SLOTS.some(s => s.id === slot)) return 'zeit';
  const liste = schichtenVon(z, raum);
  if (liste.some(s => s.tag === tag && s.slot === slot)) return 'belegt';
  if (liste.length >= MAX_SCHICHTEN) return 'voll';
  liste.push({ tag, slot });
  liste.sort((a, b) => a.tag - b.tag || SLOTS.findIndex(s => s.id === a.slot) - SLOTS.findIndex(s => s.id === b.slot));
  schichtenSchreiben(z, raum, liste);
  return 'ok';
}
export function schichtEntfernen(z, raum, nr) {
  const liste = schichtenVon(z, raum);
  if (!liste[nr]) return 'keine';
  liste.splice(nr, 1);
  schichtenSchreiben(z, raum, liste);
  return 'ok';
}
// Beginn und Ende einer Schicht in einer bestimmten Woche
export function schichtZeit(s, woche) {
  const von = slotBeginn(s, woche), stunde = SLOTS.find(x => x.id === s.slot).stunde;
  return { von, bis: von + (SCHICHT_ENDE[s.slot] - stunde) * 60 };
}
function schichtFenster(z, raum, t) {
  const w = zeitpunkt(t).woche;
  return schichtenVon(z, raum).flatMap(s => [w - 1, w, w + 1].map(x => schichtZeit(s, x)));
}
// Hat das Kirchkaffee gerade offen? Nach einem Gottesdienst (alle Kirchkaffees) oder in einer eigenen Schicht.
export function nachGottesdienstOffen(z) { return (z.laeufe || []).some(L => L.phase === 'kirchkaffee' && !L.ausgefallen); }
export function offenBei(z, raum, t = z.minuten) {
  return nachGottesdienstOffen(z) || schichtFenster(z, raum, t).some(f => t >= f.von && t < f.bis);
}
// Nächster Beginn einer eigenen Schicht (oder null)
export function naechsteSchicht(z, raum, t = z.minuten) {
  const v = schichtFenster(z, raum, t).map(f => f.von).filter(v => v > t);
  return v.length ? Math.min(...v) : null;
}

// ---- Bewegung ----
function laenge(pfad) { let l = 0; for (let i = 0; i < pfad.length - 1; i++) l += Math.hypot(pfad[i + 1].x - pfad[i].x, pfad[i + 1].y - pfad[i].y); return l; }
const stehen = (p, t) => ({ pfad: [{ x: p.x, y: p.y }], laenge: 0, t0: t });
const posBei = (b, t) => punktAufWeg(b, Math.max(0, t - b.t0) * LAUFTEMPO);
const ankunft = b => b.t0 + b.laenge / LAUFTEMPO;
const angekommen = (b, t) => t >= ankunft(b) - EPS;
const istBei = (b, p, t) => { const e = b.pfad[b.pfad.length - 1]; return angekommen(b, t) && e.x === p.x && e.y === p.y; };
// Weg von a nach b ab Zeit t. gerade: direkt (z. B. Theke ↔ Maschine), sonst um Wände und Möbel herum.
function gehen(z, von, nach, t, gerade = false) {
  const a = { x: Math.round(von.x), y: Math.round(von.y) }, ziel = { x: nach.x, y: nach.y };
  let pfad;
  if (gerade) pfad = [{ x: von.x, y: von.y }, ziel];
  else {
    const blockiert = (x, y) => hindernisBei(z, x, y);
    pfad = glaetten(z, weg(z, a, ziel, blockiert), blockiert) || [a, ziel];
    if (pfad[0].x !== von.x || pfad[0].y !== von.y) pfad = [{ x: von.x, y: von.y }, ...pfad];
  }
  return { pfad, laenge: laenge(pfad), t0: t };
}
const TOR = () => {
  const g = GRUNDSTUECK, gw = GEHWEGE.find(w => w.w > w.h && w.y >= g.y + g.h);
  return { x: g.tor.x + Math.floor(g.tor.breite / 2), y: gw ? gw.y : g.y + g.h + 1 };
};

// ---- Menschen finden, Geld und Haltung ----
const menschVon = (z, id) => z.besucher.find(b => b.id === id) || (z.ort ? z.ort.leute.find(p => p.id === id) : null) || null;
// Geld-Zahl über einem Kopf (Kaffee, Einkauf, Kollekte nach dem Gottesdienst)
export function zahlZeigen(z, ort, betrag, art = null) {
  kaffeeAnlegen(z);
  const K = z.kaffee;
  K.zahlen.push({ nr: ++K.nr, x: ort.x, y: ort.y, betrag, art, zeit: z.minuten });
}
// Ergebnis beim Gottesdienst-Gast eintragen (für das Besucher-Kärtchen)
function ergebnisEintragen(z, k, ergebnis) {
  const L = k.lauf && (z.laeufe || []).find(l => l.id === k.lauf);
  const g = L && L.gaeste && L.gaeste.find(x => x.id === k.id);
  if (g && g.kaffee) g.kaffee.ergebnis = ergebnis;
}

// ---- Kunden ----
function schlangeVon(K, eaId) { return K.kunden.filter(k => k.ea === eaId && (k.phase === 'schlange' || k.phase === 'bestellt')).sort((a, b) => a.nr - b.nr); }
function plaetzeFuer(z, stationen, s) {
  // Vordere Plätze der anderen Stationen nicht mitbenutzen
  const andere = stationen.filter(x => x !== s).flatMap(x => [x.standTheke, x.standMaschine]);
  return schlangenPlaetze(z, s, [s.standTheke, s.standMaschine, ...andere].map(p => idx(z, p.x, p.y)));
}
// Kunden der Station neu durchzählen und zu ihrem Platz in der Schlange schicken
function nachruecken(z, stationen, s, t) {
  const K = z.kaffee, plaetze = plaetzeFuer(z, stationen, s);
  schlangeVon(K, s.ea.id).forEach((k, i) => {
    k.nr = i;
    if (k.phase !== 'schlange' || !plaetze.length) return;
    const ziel = plaetze[Math.min(i, plaetze.length - 1)], e = k.bew.pfad[k.bew.pfad.length - 1];
    if (e.x === ziel.x && e.y === ziel.y) return;                                  // steht schon dort oder läuft hin
    if (k.bew.t0 > t) k.bew = gehen(z, k.bew.pfad[0], ziel, k.bew.t0);            // noch nicht losgegangen
    else k.bew = gehen(z, posBei(k.bew, t), ziel, t);
  });
}
// Station mit der kürzesten Schlange (bei gleich langer die erste)
function kuerzeste(K, stationen) {
  let beste = null;
  for (const s of stationen) { const n = schlangeVon(K, s.ea.id).length; if (!beste || n < beste.n) beste = { s, n }; }
  return beste ? beste.s : null;
}
// Ein Kunde kommt: stellt sich an der kürzesten Schlange an. ab = ab wann er losgeht; start = wo er losgeht.
// lauf: Kennung des Gottesdienst-Ablaufs (oder null bei Passanten). → true, wenn er sich anstellen konnte
function kundeAnlegen(z, stationen, wer, start, ab, lauf, heimweg) {
  const K = z.kaffee, s = kuerzeste(K, stationen.filter(x => plaetzeFuer(z, stationen, x).length));   // nur Stationen, an denen man anstehen kann
  if (!s) return false;
  const plaetze = plaetzeFuer(z, stationen, s);
  const nr = schlangeVon(K, s.ea.id).length, ziel = plaetze[Math.min(nr, plaetze.length - 1)];
  K.kunden.push({ id: wer.id, name: wer.name, ea: s.ea.id, lauf, nr, phase: 'schlange', ab, heimweg,
    bew: gehen(z, start, ziel, ab), stehBis: null });
  return true;
}
// Freier Stehplatz für einen bedienten Kunden: nicht in den vorderen Schlangenplätzen, nicht da, wo schon jemand steht
function stehplatz(z, stationen, s) {
  const K = z.kaffee, schon = new Set();
  for (const x of stationen) {
    for (const p of [x.standTheke, x.standMaschine]) schon.add(idx(z, p.x, p.y));
    plaetzeFuer(z, stationen, x).slice(0, schlangeVon(K, x.ea.id).length + 2).forEach(p => schon.add(idx(z, p.x, p.y)));
  }
  for (const k of K.kunden) if (k.phase === 'steht' || k.phase === 'sitzt' || k.phase === 'schlange') { const e = k.bew.pfad[k.bew.pfad.length - 1]; schon.add(idx(z, e.x, e.y)); }
  const zellen = new Set(s.raum.zellen);
  const liste = s.raum.zellen.map(c => ({ x: c % z.w, y: (c / z.w) | 0 })).filter(p => frei(z, zellen, p) && !schon.has(idx(z, p.x, p.y))
    && !z.personen.some(q => q.x === p.x && q.y === p.y));
  liste.sort((a, b) => Math.hypot(a.x - s.theke.x, a.y - s.theke.y) - Math.hypot(b.x - s.theke.x, b.y - s.theke.y));
  return liste[0] || null;
}
// ---- Sitzplätze ----
// Grenzt ein Tisch direkt an diesen Stuhl (links, rechts, oben, unten)?
export function amTisch(z, m) { return NACHBARN.some(([dx, dy]) => { const n = moebelBei(z, m.x + dx, m.y + dy); return !!n && n.art === 'tisch'; }); }
// Trinkgeld, das ein Kunde auf diesem Stuhl beim Gehen gibt (auf Cent gerundet)
export function trinkgeldFuer(z, m) {
  return Math.round(SITZEN.trinkgeld * stuhlStufe(m).trinkgeld * (amTisch(z, m) ? SITZEN.tisch : 1) * 100) / 100;
}
// Sitzplätze eines Kirchkaffees: alle Stühle im Raum, davon wie viele am Tisch
export function sitzplaetzeVon(z, raum) {
  const stuehle = moebelImRaum(z, raum, 'stuhl');
  return { anzahl: stuehle.length, amTisch: stuehle.filter(m => amTisch(z, m)).length };
}
// Freier Stuhl im Raum der Station (der nächste zur Theke) – oder null
function freierStuhl(z, s) {
  const belegt = new Set(z.kaffee.kunden.filter(k => k.phase === 'sitzt' && k.stuhl).map(k => idx(z, k.stuhl.x, k.stuhl.y)));
  const liste = moebelImRaum(z, s.raum, 'stuhl').filter(m => !belegt.has(idx(z, m.x, m.y)) && !z.personen.some(q => q.x === m.x && q.y === m.y));
  liste.sort((a, b) => Math.hypot(a.x - s.theke.x, a.y - s.theke.y) - Math.hypot(b.x - s.theke.x, b.y - s.theke.y));
  return liste[0] || null;
}

function heimSchicken(z, k, t) {
  if (k.phase === 'sitzt' && k.trinkgeld) {   // Trinkgeld beim Gehen
    buchen(z, 'einnahmen', 'kirchkaffee', k.trinkgeld, { tassen: 0, anlass: k.lauf ? 'gottesdienst' : 'oeffnungszeit', trinkgeld: true });
    zahlZeigen(z, posBei(k.bew, t), k.trinkgeld, 'trinkgeld');
  }
  k.phase = 'heim';
  k.bew = gehen(z, posBei(k.bew, t), k.heimweg, t);
}
// Kein Kaffee (Maschine leer, Station weg): −10 Haltung, geht heim
function ohneKaffee(z, k, t) {
  const m = menschVon(z, k.id);
  if (m) zufriedenheitAendern(m, AENDERUNG.kaffeeNein);
  ergebnisEintragen(z, k, 'leer');
  heimSchicken(z, k, t);
}
// Kaffee übergeben: 1 €, +5 Haltung, dann auf einen Sitz- oder Stehplatz (Gottesdienst-Gäste bis zum Ende, Passanten eine Weile)
function uebergeben(z, stationen, s, k, t, zufall) {
  buchen(z, 'einnahmen', 'kirchkaffee', PREIS_TASSE, { tassen: 1, anlass: k.lauf ? 'gottesdienst' : 'oeffnungszeit' });
  zahlZeigen(z, posBei(k.bew, t), PREIS_TASSE);
  const m = menschVon(z, k.id);
  if (m) zufriedenheitAendern(m, AENDERUNG.kaffeeJa);
  ergebnisEintragen(z, k, 'ja');
  const L = k.lauf && (z.laeufe || []).find(l => l.id === k.lauf);
  const bis = k.lauf ? (L && L.phase === 'kirchkaffee' ? L.beginn + DAUER.gottesdienst + DAUER.kirchkaffee : t) : t + STEHEN_PASSANT;
  if (bis <= t + EPS) return heimSchicken(z, k, t);
  const stuhl = freierStuhl(z, s);
  if (stuhl && zufall() < SITZEN.chance) {
    k.phase = 'sitzt'; k.stehBis = bis; k.stuhl = { x: stuhl.x, y: stuhl.y }; k.trinkgeld = trinkgeldFuer(z, stuhl);
    k.bew = gehen(z, posBei(k.bew, t), stuhl, t);
    return;
  }
  const platz = stehplatz(z, stationen, s);
  if (!platz) return heimSchicken(z, k, t);
  k.phase = 'steht'; k.stehBis = bis;
  k.bew = gehen(z, posBei(k.bew, t), platz, t);
}

// Gottesdienst-Gäste mit Kaffeewunsch stellen sich an. gaeste: [{ g (Gast im Ablauf), i (Nummer), sitz }]
// → false, wenn kein Kirchkaffee bereit ist (dann bekommen sie keinen Kaffee)
export function gottesdienstKunden(z, raeume, L, gaeste) {
  kaffeeAnlegen(z);
  const stationen = kirchkaffeeZustand(z, raeume).flatMap(k => k.stationen);
  if (!stationen.length) return false;
  const S = L.beginn + DAUER.gottesdienst;
  gaeste.forEach(({ g, i }) => {
    const ab = S + i * 0.5;
    if (kundeAnlegen(z, stationen, { id: g.id, name: g.name }, g.sitz, ab, L.id, strasse(i))) g.kaffee.ab = ab;
    else g.kaffee.ergebnis = 'keinPlatz';
  });
  return true;
}
// Ein Passant läuft am offenen Kirchkaffee vorbei und will Kaffee: geht vom Tor hinein. → true, wenn er hineingeht
export function passantKommt(z, raeume, wer) {
  kaffeeAnlegen(z);
  const stationen = kirchkaffeeZustand(z, raeume).flatMap(k => k.stationen).filter(s => offenBei(z, s.raum));
  if (!stationen.length || z.kaffee.kunden.some(k => k.id === wer.id)) return false;
  const tor = TOR();
  return kundeAnlegen(z, stationen, wer, tor, z.minuten, null, tor);
}
export function offenesKirchkaffee(z, raeume) {
  return kirchkaffeeZustand(z, raeume).some(k => k.stationen.length && offenBei(z, k.raum));
}

// ---- Mitarbeiter ----
// Bricht ab, was der Ehrenamtliche gerade tut (versetzt, Station weg): reservierte Tasse zurück, Kunde wieder in die Schlange
function abbrechen(z, id) {
  const K = z.kaffee, m = K.ma[id], a = m && m.aufgabe;
  if (!a) return;
  const maschine = a.maschine && moebelBei(z, a.maschine.x, a.maschine.y);
  if (a.art === 'bedienen') {
    if (maschine && maschine.art === 'kaffeemaschine') maschine.fuellung = (maschine.fuellung || 0) + 1;
    const k = K.kunden.find(x => x.id === a.kunde);
    if (k && k.phase === 'bestellt') k.phase = 'schlange';
  }
  if (a.art === 'einkauf' && a.phase === 'zurueck' && maschine && maschine.art === 'kaffeemaschine')   // schon bezahlt: Kaffee kommt trotzdem an
    maschine.fuellung = Math.min(fassung('kaffeemaschine'), (maschine.fuellung || 0) + a.menge);
}

// Ein Schritt für eine Station → true, wenn sich etwas geändert hat
function stationSchritt(z, stationen, s, t, zufall) {
  const K = z.kaffee, p = s.ea, id = p.id;
  const m = K.ma[id] || (K.ma[id] = { heim: { x: p.x, y: p.y }, bew: stehen(p, t), aufgabe: null });
  const a = m.aufgabe, da = angekommen(m.bew, t);
  // Steht er frei an seinem Platz, läuft er ein wenig umher (umherlaufen.js) – dann geht er von dort aus los
  const hier = !a && istBei(m.bew, m.heim, t) ? umherPosition(z, s.raum, p, t) : posBei(m.bew, t);
  const maschine = s.maschine, geh = (ziel, gerade) => { m.bew = gehen(z, hier, ziel, t, gerade); };

  if (a && a.art === 'bedienen') {
    const k = K.kunden.find(x => x.id === a.kunde);
    if (a.phase === 'hin' && da) { a.phase = 'laden'; a.bis = t + LADEN_MINUTEN; return true; }
    if (a.phase === 'laden' && t >= a.bis - EPS) { a.phase = 'zurueck'; geh(s.standTheke, true); return true; }
    if (a.phase === 'zurueck' && da) {
      m.aufgabe = null;
      if (k) { uebergeben(z, stationen, s, k, t, zufall); nachruecken(z, stationen, s, t); }
      return true;
    }
    return false;
  }
  if (a && a.art === 'einkauf') {
    if (a.phase === 'hin' && da) {
      if (kannBezahlen(z, a.preis)) { buchen(z, 'ausgaben', 'kaffee', a.preis, { tassen: a.menge, anlass: 'einkauf' }); zahlZeigen(z, hier, -a.preis); delete K.gemeldet[id]; }
      else { a.menge = 0; keinGeld(z, p, t); }
      a.phase = 'zurueck'; geh(s.standMaschine); return true;
    }
    if (a.phase === 'zurueck' && da) {
      maschine.fuellung = Math.min(fassung('kaffeemaschine'), (maschine.fuellung || 0) + a.menge);
      m.aufgabe = null; return true;
    }
    return false;
  }
  if (a && a.art === 'gehen') { if (!da) return false; m.aufgabe = null; return true; }

  // Frei: erst die Schlange (auch nach dem Schließen), dann an der Theke warten, sonst einkaufen oder zurück an den Platz
  const schlange = schlangeVon(K, id), offen = offenBei(z, s.raum, t);
  if (schlange.length || offen) {
    if (!istBei(m.bew, s.standTheke, t)) { m.aufgabe = { art: 'gehen' }; geh(s.standTheke); return true; }
    const vorne = schlange[0];
    if (vorne && vorne.phase === 'schlange' && vorne.nr === 0 && t >= vorne.ab && angekommen(vorne.bew, t)) {
      const ziel = plaetzeFuer(z, stationen, s)[0];
      if (ziel && !istBei(vorne.bew, ziel, t)) { nachruecken(z, stationen, s, t); return true; }
      if ((maschine.fuellung || 0) > 0) {
        maschine.fuellung--;   // die Tasse ist für ihn reserviert
        vorne.phase = 'bestellt';
        m.aufgabe = { art: 'bedienen', phase: 'hin', kunde: vorne.id, maschine: { x: maschine.x, y: maschine.y } };
        geh(s.standMaschine, true);
      } else { ohneKaffee(z, vorne, t); nachruecken(z, stationen, s, t); }
      return true;
    }
    return false;
  }
  const fehlt = fassung('kaffeemaschine') - (maschine.fuellung || 0);
  if (fehlt > 0 && !(K.gesperrt[id] > t)) {
    const menge = Math.min(EINKAUF.tragen, fehlt), preis = Math.round(menge * EINKAUF.preisTasse * 100) / 100;
    if (!kannBezahlen(z, preis)) { keinGeld(z, p, t); return true; }
    m.aufgabe = { art: 'einkauf', phase: 'hin', menge, preis, maschine: { x: maschine.x, y: maschine.y } };
    geh(LADEN.eingang); return true;
  }
  if (!istBei(m.bew, m.heim, t)) { m.aufgabe = { art: 'gehen' }; geh(m.heim); return true; }
  return false;
}
// Zu wenig Geld für den Einkauf: Meldung (nur einmal, bis es wieder klappt), später nochmal versuchen
function keinGeld(z, p, t) {
  const K = z.kaffee;
  K.gesperrt[p.id] = t + EINKAUF.wiederholen;
  if (!K.gemeldet[p.id]) { K.gemeldet[p.id] = true; K.meldung = { code: 'keinGeldKaffee', name: (daten(p) || {}).name || '', zeit: t }; }
}

function kundeSchritt(z, k, t) {
  const K = z.kaffee;
  if ((k.phase === 'steht' || k.phase === 'sitzt') && t >= k.stehBis - EPS) { heimSchicken(z, k, t); return true; }
  if (k.phase === 'heim' && angekommen(k.bew, t)) { K.kunden = K.kunden.filter(x => x !== k); return true; }
  return false;
}

// ---- Alles, was bis jetzt fällig ist, ausführen ----
export function kaffeeAktualisieren(z, raeume, zufall = Math.random) {
  kaffeeAnlegen(z);
  const K = z.kaffee, t = z.minuten;
  const stationen = kirchkaffeeZustand(z, raeume).flatMap(k => k.stationen);
  const vonEa = new Map(stationen.map(s => [s.ea.id, s]));
  // Mitarbeiter, die keine Station mehr haben oder versetzt wurden: Aufgabe abbrechen, wieder an ihrem Platz
  for (const id of Object.keys(K.ma)) {
    const p = z.personen.find(x => x.id === id), m = K.ma[id];
    if (!p || !vonEa.has(id) || m.heim.x !== p.x || m.heim.y !== p.y) { abbrechen(z, id); delete K.ma[id]; }
  }
  // Kunden, deren Station es nicht mehr gibt: an eine andere Schlange, sonst ohne Kaffee heim
  for (const k of K.kunden) {
    if ((k.phase !== 'schlange' && k.phase !== 'bestellt') || vonEa.has(k.ea)) continue;
    const s = kuerzeste(K, stationen);
    if (s) { k.ea = s.ea.id; k.phase = 'schlange'; k.nr = 1e9; } else ohneKaffee(z, k, Math.max(t, k.ab));
  }
  for (const s of stationen) nachruecken(z, stationen, s, t);
  for (let runde = 0; runde < 200; runde++) {
    let geaendert = false;
    for (const s of stationen) if (stationSchritt(z, stationen, s, t, zufall)) geaendert = true;
    for (const k of [...K.kunden]) if (kundeSchritt(z, k, t)) geaendert = true;
    if (!geaendert) break;
  }
  K.zahlen = K.zahlen.filter(e => t - e.zeit < ZAHL_MERKEN);
}

// Nächster Zeitpunkt, zu dem im Kirchkaffee etwas passiert (für das Tick-System) – oder null
export function kaffeeSchritt(z, raeume) {
  if (!z.kaffee) return null;
  const K = z.kaffee, t = z.minuten, zeiten = [];
  for (const m of Object.values(K.ma)) {
    zeiten.push(ankunft(m.bew));
    if (m.aufgabe && m.aufgabe.bis) zeiten.push(m.aufgabe.bis);
  }
  for (const v of Object.values(K.gesperrt)) zeiten.push(v);
  for (const k of K.kunden) { zeiten.push(ankunft(k.bew), k.ab); if (k.stehBis !== null) zeiten.push(k.stehBis); }
  for (const r of raeume.liste) if (r.typ && r.typ.id === 'kirchkaffee') for (const f of schichtFenster(z, r, t)) zeiten.push(f.von, f.bis);
  const naechste = Math.min(...zeiten.filter(x => x > t + EPS));
  return Number.isFinite(naechste) ? { zeit: naechste, tun: (zz, rr, zf) => kaffeeAktualisieren(zz, rr, zf) } : null;
}

// ---- Abfragen für die Anzeige ----
// Kunden im Kirchkaffee (wie Besucher gezeichnet)
export function kaffeeKundenPositionen(z) {
  if (!z.kaffee) return [];
  const t = z.minuten;
  return z.kaffee.kunden.filter(k => t >= k.ab).map(k => {
    const p = posBei(k.bew, t);
    if (k.phase === 'heim' && !p.unterwegs) return null;
    return { id: k.id, name: k.name, x: p.x, y: p.y, sitzt: k.phase === 'sitzt' && !p.unterwegs };
  }).filter(Boolean);
}
// Wo ist ein Ehrenamtlicher gerade? (null = frei an seinem Platz)
export function kaffeeMitarbeiterPosition(z, p) {
  const m = z.kaffee && z.kaffee.ma[p.id];
  if (!m || (!m.aufgabe && istBei(m.bew, m.heim, z.minuten))) return null;   // frei an seinem Platz: läuft umher wie alle
  const q = posBei(m.bew, z.minuten);
  return { x: q.x, y: q.y };
}
// Maschinen, die gerade laden: Position und Fortschritt 0–1
export function kaffeeLaden(z) {
  if (!z.kaffee) return [];
  return Object.values(z.kaffee.ma).filter(m => m.aufgabe && m.aufgabe.art === 'bedienen' && m.aufgabe.phase === 'laden')
    .map(m => ({ x: m.aufgabe.maschine.x, y: m.aufgabe.maschine.y, anteil: Math.max(0, Math.min(1, 1 - (m.aufgabe.bis - z.minuten) / LADEN_MINUTEN)) }));
}
export function kaffeeZahlen(z) { return z.kaffee ? z.kaffee.zahlen.map(e => ({ nr: e.nr, x: e.x, y: e.y, betrag: e.betrag, art: e.art || null })) : []; }
export const MELDUNG_KAFFEE = 120;
export function kaffeeMeldung(z) {
  const m = z.kaffee && z.kaffee.meldung;
  return m && z.minuten - m.zeit < MELDUNG_KAFFEE ? m : null;
}
export function imKirchkaffee(z, id) { return !!(z.kaffee && z.kaffee.kunden.some(k => k.id === id)); }
