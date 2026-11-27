// Spiellogik des Kirchkaffees (Spielprinzip vom 25.11.2026): Öffnungszeiten, Schlange an der Theke,
// Bedienung Schritt für Schritt und Kaffee-Einkauf im Laden. Kennt keine Grafik – liefert nur Positionen und Zustände.
//
// So läuft es (alle Zeiten in Spielminuten, Laufen mit LAUFTEMPO):
//   • Offen ist ein Kirchkaffee nach jedem Gottesdienst (2 Stunden) und in seinen eigenen Schichten (bis zu 3 pro Woche).
//   • Kunden stellen sich an der Theke an. Steht der vorderste an der Theke, bestellt er: Der Ehrenamtliche geht zur
//     Maschine, sie lädt, er geht zurück und gibt den Kaffee – erst dann gibt es 2 € (grüne Zahl) und +5 Haltung.
//   • Wer beim Schließen noch ansteht, wird fertig bedient.
//   • Danach setzt er sich mit SITZEN.chance auf einen freien Stuhl (sonst Stehplatz) und gibt beim Gehen Trinkgeld.
//     Wer sitzt, bleibt ab Ankunft am Stuhl mindestens SITZEN.mindestens Minuten (auch nach Schluss).
//   • Hat das Kirchkaffee zu und ist die Maschine nicht voll, geht der Ehrenamtliche in den Laden und kauft nach.
//     Danach füllt er genauso die Automaten in seinem Raum auf (automaten.js, Lukas 26.11.).
//   • Kunden zu den Öffnungszeiten gehen evtl. einmal zum Automaten, während sie stehen oder sitzen (automaten.js).
//   • Sandwiches (27.11.): Steht ein Sandwichmaker im Raum, will ein Kunde mit SANDWICH.chance auch ein Sandwich. Der Mitarbeiter
//     macht erst den Kaffee, geht dann zum Sandwichmaker (lädt SANDWICH.laden), dann zurück – beides wird zusammen übergeben.
//     Aufgefüllt wird der Sandwichmaker wie die Kaffeemaschine (Einkauf im Laden).
//   • Stufen (27.11.): Fassung und Ladezeit der Kaffeemaschine hängen an ihrer Stufe (fassungVon/ladenVon in moebel.js).
//
// Jede Figur hat eine „Bewegung“ { pfad, laenge, t0 }: Ab Zeit t0 läuft sie den Pfad entlang. Die Spiellogik wartet
// immer, bis sie wirklich angekommen ist – so stimmen Geld und Haltung mit dem überein, was man sieht.
import { LEER, idx } from './karte.js';
import { moebelImRaum, moebelBei, hindernisBei, fassung, fassungVon, ladenVon, stuhlStufe } from './moebel.js';
import { eingesetztIn, daten } from './personen.js';
import { buchen, kannBezahlen } from './finanzen.js';
import { zufriedenheitAendern, beduerfnisErfuellt } from './besucher.js';
import { weg, glaetten } from './wege.js';
import { punktAufWeg, strasse, strecke } from './bewegung.js';
import { gibtToiletten, wertMitnehmen, mussZurToilette, wannZurToilette, gangJetzt, gangOrt, naechsteFreieKabine } from './toiletten.js';
import { umherPosition } from './umherlaufen.js';
import { slotBeginn, zeitpunkt } from './zeit.js';
import { LAUFTEMPO, SLOTS, DAUER, MELDUNG_DAUER } from '../inhalte/zeit.js';
import { AENDERUNG } from '../inhalte/besucher.js';
import { PREIS_TASSE, MAX_SCHICHTEN, SCHICHT_ENDE, LADEN_MINUTEN, EINKAUF, STEHEN_PASSANT, STEHEN_GAST, SITZEN, MINDESTGAESTE, SANDWICH } from '../inhalte/kirchkaffee.js';
import { ORT } from '../inhalte/ort.js';
import { neuePerson } from './besucher.js';
import { platzImGebiet } from './einzugsgebiet.js';
import { GRUNDSTUECK, GEHWEGE, LADEN } from '../inhalte/umgebung.js';
import { AUTOMAT, AUTOMATEN } from '../inhalte/automaten.js';
import { aktiveSchicht } from './dienst.js';
import { kaufzeitenImKirchkaffee, gangJetztZumAutomaten, automatZumAuffuellen, auffuellen, auffuellPlatz } from './automaten.js';

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
    // Sandwichmaker (27.11.): jede Station nimmt den nächsten zur Theke; mehrere Stationen dürfen sich einen teilen
    const sandwichmaker = moebelImRaum(z, r, 'sandwichmaker');
    for (const st of stationen) {
      const sw = sandwichmaker.slice().sort((a, b) => Math.hypot(a.x - st.theke.x, a.y - st.theke.y) - Math.hypot(b.x - st.theke.x, b.y - st.theke.y))[0];
      if (sw) { st.sandwich = sw; st.standSandwich = standplatz(z, r, sw, st.standTheke) || { x: st.standMaschine.x, y: st.standMaschine.y }; }
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
// Schichtbetrieb (27.11.): keine Grenze mehr – geöffnet wird, so oft es eingeteilte Ehrenamtliche gibt (jeder Zeitblock der Woche)
const maxOeffnungen = z => z.schichtbetrieb ? 7 * SLOTS.length : MAX_SCHICHTEN;
export function schichtenVon(z, raum) {
  const l = z.kaffeeZeiten && z.kaffeeZeiten[raum.zellen[0]];
  return Array.isArray(l) ? l.filter(s => s.tag >= 0 && s.tag <= 6 && SLOTS.some(x => x.id === s.slot)).slice(0, maxOeffnungen(z)) : [];
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
  if (liste.length >= maxOeffnungen(z)) return 'voll';
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
// An einem Tisch ist ein Stuhl, wenn er direkt daneben steht (oben, unten, links, rechts) – also höchstens so viele je Tisch
export const STUEHLE_JE_TISCH = NACHBARN.length;
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
  // Ab 80 % erst noch zur Toilette, dann heim (Lukas, 26.11.)
  const gang = wcGang(z, k, 'heim', posBei(k.bew, t), k.heimweg, t);
  k.wcEnde = gang ? gang.zurueckBis : t;   // Toilette (27.11.): ab dem Heimweg kein Unfall mehr
  if (gang) { k.bew = { pfad: [{ ...k.heimweg }], laenge: 0, t0: gang.zurueckBis }; return; }
  k.bew = gehen(z, posBei(k.bew, t), k.heimweg, t);
}
// ---- Toilette (Lukas, 26.11. abends): Gottesdienst-Gäste im Kirchkaffee gehen ab 80 % zur Toilette, wie alle Besucher ----
// Die Räume merkt sich kaffeeAktualisieren für die Dauer eines Durchgangs (wird nicht gespeichert).
let raeumeJetzt = null, toilettenJetzt = false;
const wcUnterwegs = (k, t) => !!(k.gang && t < k.gang.zurueckBis - EPS);
// Gang planen, wenn er fällig ist und es eine Toilette gibt → Gang oder null
function wcGang(z, k, art, von, nach, t) {
  if (!toilettenJetzt || !k.wc0 || wcUnterwegs(k, t) || !mussZurToilette(k, t)) return null;
  const gang = gangJetzt(z, raeumeJetzt, art, von, nach, t);
  if (!gang) return null;
  k.gang = gang; (k.gaenge = k.gaenge || []).push(gang);
  return gang;
}
// Wege der Toilettengänge für die Anzeige (einmal berechnet, gemerkt)
const wcWege = new Map();
// Kein Kaffee (Maschine leer, Station weg): −10 Haltung, geht heim
function ohneKaffee(z, k, t) {
  const m = menschVon(z, k.id);
  if (m) zufriedenheitAendern(m, AENDERUNG.kaffeeNein);
  ergebnisEintragen(z, k, 'leer');
  heimSchicken(z, k, t);
}
// Kaffee übergeben: 2 €, +5 Haltung, dann auf einen Sitz- oder Stehplatz (Gottesdienst-Gäste bis zum Ende, Passanten eine Weile)
function uebergeben(z, stationen, s, k, t, zufall, a = {}) {
  buchen(z, 'einnahmen', 'kirchkaffee', PREIS_TASSE, { tassen: 1, anlass: k.lauf ? 'gottesdienst' : 'oeffnungszeit' });
  const m = menschVon(z, k.id);
  // Sandwich (27.11.): zusammen mit dem Kaffee; die Zahl über dem Kopf zeigt beides zusammen
  if (a.sandwich) {
    buchen(z, 'einnahmen', 'sandwich', SANDWICH.preis, { stueck: 1, anlass: k.lauf ? 'gottesdienst' : 'oeffnungszeit' });
    if (m) zufriedenheitAendern(m, SANDWICH.haltung.ja);
  } else if (a.sandwichLeer && m) zufriedenheitAendern(m, SANDWICH.haltung.leer);
  zahlZeigen(z, posBei(k.bew, t), PREIS_TASSE + (a.sandwich ? SANDWICH.preis : 0));
  if (m) { zufriedenheitAendern(m, AENDERUNG.kaffeeJa); beduerfnisErfuellt(z, m, 'kaffee'); }   // Bedürfnis Kaffee (25.11.)
  ergebnisEintragen(z, k, 'ja');
  const L = k.lauf && (z.laeufe || []).find(l => l.id === k.lauf);
  // Sitzen: Gottesdienst-Gäste bis zum Schluss. Stehen (27.11.): alle nur noch eine kurze Weile (STEHEN_GAST / STEHEN_PASSANT).
  const schluss = k.lauf ? (L && L.phase === 'kirchkaffee' ? L.beginn + DAUER.gottesdienst + DAUER.kirchkaffee : t) : t + STEHEN_PASSANT;
  const bis = schluss, stehenBis = k.lauf ? Math.min(schluss, t + STEHEN_GAST) : schluss;
  // Hinsetzen: ab Ankunft am Stuhl mindestens SITZEN.mindestens Minuten, auch wenn das Kirchkaffee schon zu ist
  const stuhl = freierStuhl(z, s);
  if (stuhl && zufall() < SITZEN.chance) {
    k.phase = 'sitzt'; k.stuhl = { x: stuhl.x, y: stuhl.y }; k.trinkgeld = trinkgeldFuer(z, stuhl);
    k.bew = gehen(z, posBei(k.bew, t), stuhl, t);
    k.stehBis = Math.max(bis, ankunft(k.bew) + SITZEN.mindestens);
    automatEinplanen(z, k);
    return;
  }
  if (stehenBis <= t + EPS) return heimSchicken(z, k, t);
  const platz = stehplatz(z, stationen, s);
  if (!platz) return heimSchicken(z, k, t);
  k.phase = 'steht'; k.stehBis = stehenBis;
  k.bew = gehen(z, posBei(k.bew, t), platz, t);
  automatEinplanen(z, k);
}
// Automaten (26.11.): Kunden zu den Öffnungszeiten (k.besuch) gehen evtl. einmal zum Automaten, während sie am Platz sind.
// Gottesdienst-Gäste haben schon beim Anreisen „gewürfelt“ (automaten.js) – einmal pro Besuch.
function automatEinplanen(z, k) {
  if (!k.besuch || !raeumeJetzt) return;
  k.automatPlan = kaufzeitenImKirchkaffee(z, raeumeJetzt, k.besuch, k.id, ankunft(k.bew), k.stehBis, k.automatArten || null);
}

// Gottesdienst-Gäste mit Kaffeewunsch stellen sich an. gaeste: [{ g (Gast im Ablauf), i (Nummer), sitz }]
// → false, wenn kein Kirchkaffee bereit ist (dann bekommen sie keinen Kaffee)
export function gottesdienstKunden(z, raeume, L, gaeste) {
  kaffeeAnlegen(z);
  const stationen = kirchkaffeeZustand(z, raeume).flatMap(k => k.stationen);
  if (!stationen.length) return false;
  const S = L.beginn + DAUER.gottesdienst;
  gaeste.forEach(({ g, i }) => {
    // Wer gerade noch auf der Toilette ist, kommt erst danach
    const ab = Math.max(S + i * 0.5, ...(g.gaenge || []).map(s => s.zurueckBis));
    if (kundeAnlegen(z, stationen, { id: g.id, name: g.name }, g.sitz, ab, L.id, strasse(i))) {
      g.kaffee.ab = ab;
      const k = z.kaffee.kunden[z.kaffee.kunden.length - 1], wc0 = wertMitnehmen(g, ab);
      if (wc0) { k.wc0 = wc0; k.gaenge = []; k.gang = null; k.unfaelle = 0; }   // Toilettenwert läuft im Kirchkaffee weiter
      if (g.automatOffen && g.automatOffen.length) { k.besuch = L.id; k.automatArten = g.automatOffen; g.automatOffen = []; }   // Automat: hier nachholen
    }
    else g.kaffee.ergebnis = 'keinPlatz';
  });
  return true;
}
// Ein Passant läuft am offenen Kirchkaffee vorbei und will Kaffee: geht vom Tor hinein. → true, wenn er hineingeht
export function passantKommt(z, raeume, wer) {
  kaffeeAnlegen(z);
  const stationen = kirchkaffeeZustand(z, raeume).flatMap(k => k.stationen).filter(s => offenBei(z, s.raum));
  if (!gastHinein(z, stationen, wer)) return false;
  // Mindestgäste (27.11.): wer von selbst kommt, zählt für die eigene Öffnungszeit mit
  for (const r of new Set(stationen.map(s => s.raum))) { const st = mindestStandJetzt(z, r); if (st) st.gekommen++; }
  return true;
}
// Gast geht vom Tor hinein und stellt sich an → true, wenn er sich anstellen konnte
function gastHinein(z, stationen, wer) {
  if (!stationen.length || z.kaffee.kunden.some(k => k.id === wer.id)) return false;
  const tor = TOR();
  if (!kundeAnlegen(z, stationen, wer, tor, z.minuten, null, tor)) return false;
  z.kaffee.kunden[z.kaffee.kunden.length - 1].besuch = `kk:${z.minuten}`;   // für den Automaten: Kennung dieses Besuchs
  return true;
}

// ---- Mindestgäste (Lukas, 27.11.; Zahlen MINDESTGAESTE in inhalte/kirchkaffee.js) ----
// Zu jeder eigenen Öffnungszeit kommt eine Mindestzahl an Gästen, je nach Angebot des Kirchkaffees.
// Die Zahl wird beim Öffnen festgelegt und gleichmäßig auf die Öffnungszeit verteilt („Termine“). Ist zu einem Termin
// noch nicht genug los (von selbst Hereingekommene zählen mit), kommt ein Gast extra durchs Tor – zuerst Leute,
// die die Gemeinde schon kennt, sonst ein neuer Mensch, solange im Einzugsgebiet Platz ist. Extra-Gäste wollen sicher Kaffee.
export function mindestgaesteTeile(z, raum) {
  const M = MINDESTGAESTE, sitz = sitzplaetzeVon(z, raum);
  const tische = moebelImRaum(z, raum, 'tisch').filter(m => NACHBARN.some(([dx, dy]) => { const n = moebelBei(z, m.x + dx, m.y + dy); return !!n && n.art === 'stuhl'; })).length;
  const automaten = AUTOMATEN.reduce((a, t) => a + moebelImRaum(z, raum, t.id).length, 0);
  // Theken: so viele, wie Maschinen und Thekenteile es zulassen (Ausstattung, unabhängig davon, wer gerade da ist)
  const theken = Math.min(moebelImRaum(z, raum, 'kaffeemaschine').length, moebelImRaum(z, raum, 'theke').length);
  const teile = { grund: M.grund, sitzplaetze: Math.floor(sitz.anzahl / M.jeSitzplaetze), tische: tische * M.tisch,
    automaten: automaten * M.automat, theken: Math.max(0, theken - 1) * M.station };
  return { teile, summe: Object.values(teile).reduce((a, b) => a + b, 0) };
}
function aktivesFenster(z, raum, t = z.minuten) { return schichtFenster(z, raum, t).find(f => t >= f.von - EPS && t < f.bis) || null; }
const mindestKey = (r, f) => `${r.zellen[0]}:${f.von}`;
function mindestStandJetzt(z, r) { const f = aktivesFenster(z, r); return f && z.kaffee.mindest ? z.kaffee.mindest[mindestKey(r, f)] || null : null; }
function mindestTermine(f, soll) {
  const span = (f.bis - f.von) * MINDESTGAESTE.verteilen;
  return Array.from({ length: soll }, (_, j) => f.von + span * (j + 0.5) / soll);
}
// Wer kommt extra? Nicht, wer schon im Kirchkaffee, bei einer Veranstaltung oder heute noch auf dem Gehweg unterwegs ist.
function extraGast(z, t, zufall) {
  const o = z.ort, weg = new Set(z.kaffee.kunden.map(k => k.id));
  for (const L of z.laeufe || []) for (const g of L.gaeste || []) weg.add(g.id);
  if (o) for (const g of o.gaenge) if (t < g.tor + 60) weg.add(g.id);
  const bekannt = [...(o ? o.leute : []), ...z.besucher].filter(p => !weg.has(p.id));
  if (bekannt.length) return bekannt[Math.floor(zufall() * bekannt.length)];
  if (o && platzImGebiet(z) > 0) {
    const [a, b] = ORT.haltung, p = neuePerson(z, a + Math.floor(zufall() * (b - a + 1)), zufall);
    o.leute.push(p);
    return p;
  }
  return null;
}
function mindestSchritt(z, raeume, t, zufall) {
  const K = z.kaffee;
  if (!MINDESTGAESTE.an) return;
  if (!K.mindest) K.mindest = {};
  for (const [key, st] of Object.entries(K.mindest)) if (st.bis < t - EPS) delete K.mindest[key];
  for (const k of kirchkaffeeZustand(z, raeume)) {
    if (!k.stationen.length) continue;
    const f = aktivesFenster(z, k.raum, t);
    if (!f) continue;
    const key = mindestKey(k.raum, f);
    if (!K.mindest[key]) K.mindest[key] = { bis: f.bis, soll: mindestgaesteTeile(z, k.raum).summe, gekommen: 0, geprueft: 0 };
    const st = K.mindest[key], termine = mindestTermine(f, st.soll);
    while (st.geprueft < st.soll && termine[st.geprueft] <= t + EPS) {
      const j = st.geprueft++;
      if (st.gekommen > j) continue;
      const wer = extraGast(z, t, zufall);
      if (wer && gastHinein(z, k.stationen, { id: wer.id, name: wer.vorname })) st.gekommen++;
    }
  }
}
function mindestZeiten(z, raeume, t) {
  const zeiten = [];
  for (const r of raeume.liste) {
    if (!r.typ || r.typ.id !== 'kirchkaffee') continue;
    const f = aktivesFenster(z, r, t), st = f && z.kaffee.mindest && z.kaffee.mindest[mindestKey(r, f)];
    if (st && st.geprueft < st.soll) zeiten.push(mindestTermine(f, st.soll)[st.geprueft]);
  }
  return zeiten;
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
    const sw = a.sandwich && moebelBei(z, a.sandwich.x, a.sandwich.y);   // reserviertes Sandwich zurück (27.11.)
    if (sw && sw.art === 'sandwichmaker') sw.fuellung = (sw.fuellung || 0) + 1;
    const k = K.kunden.find(x => x.id === a.kunde);
    if (k && k.phase === 'bestellt') k.phase = 'schlange';
  }
  if (a.art === 'einkauf' && a.phase === 'zurueck' && a.automat) auffuellen(z, a.automat, a.menge);   // schon bezahlt: Ware kommt trotzdem an
  else if (a.art === 'einkauf' && a.phase === 'zurueck' && maschine && istMaschine(maschine))   // schon bezahlt: Kaffee/Sandwiches kommen trotzdem an
    maschine.fuellung = Math.min(fassungVon(maschine), (maschine.fuellung || 0) + a.menge);
}

// Vom Spieler versetzt (27.11.): Aufgabe sofort abbrechen (wie sonst bei der nächsten Kontrolle), damit die Figur
// gleich am neuen Platz steht – auch bei Pause.
export function kaffeeVersetzt(z, id) {
  if (!z.kaffee || !z.kaffee.ma[id]) return;
  abbrechen(z, id);
  delete z.kaffee.ma[id];
}

// Maschinen, die im Laden nachgekauft werden: Kaffeemaschine (Tassen) und Sandwichmaker (Sandwiches, 27.11.)
const istMaschine = m => m.art === 'kaffeemaschine' || m.art === 'sandwichmaker';
const einkaufPreis = m => m.art === 'sandwichmaker' ? SANDWICH.einkauf : EINKAUF.preisTasse;
const tragenVon = m => m.art === 'sandwichmaker' ? SANDWICH.tragen : EINKAUF.tragen;
function einkaufBuchen(z, a) {
  if (a.automat) buchen(z, 'ausgaben', a.ware, a.preis, { automat: a.ware, stueck: a.menge, was: 'einkauf' });
  else if (a.ware === 'sandwich') buchen(z, 'ausgaben', 'sandwich', a.preis, { stueck: a.menge, anlass: 'einkauf' });
  else buchen(z, 'ausgaben', 'kaffee', a.preis, { tassen: a.menge, anlass: 'einkauf' });
}
function maschineFuellen(z, pos, menge) {
  const mm = moebelBei(z, pos.x, pos.y);
  if (mm && istMaschine(mm)) mm.fuellung = Math.min(fassungVon(mm), (mm.fuellung || 0) + menge);
}
// „Würfel“ 0–1, fest aus einem Schlüssel gerechnet (wie beim Automaten) – will dieser Kunde ein Sandwich? (27.11.)
function fest(schluessel) {
  let h = 2166136261;
  for (const c of schluessel) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}
export const willSandwich = k => fest(`sandwich:${k.lauf || k.besuch || ''}:${k.id}`) < SANDWICH.chance;

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
    if (a.phase === 'hin' && da) { a.phase = 'laden'; a.dauer = ladenVon(maschine, LADEN_MINUTEN); a.bis = t + a.dauer; return true; }
    if (a.phase === 'laden' && t >= a.bis - EPS) {
      if (a.sandwich && s.standSandwich) { a.phase = 'zumSandwich'; geh(s.standSandwich); return true; }   // Sandwich (27.11.)
      a.phase = 'zurueck'; geh(s.standTheke, true); return true;
    }
    if (a.phase === 'zumSandwich' && da) { a.phase = 'sandwichLaden'; a.dauer = SANDWICH.laden; a.bis = t + a.dauer; return true; }
    if (a.phase === 'sandwichLaden' && t >= a.bis - EPS) { a.phase = 'zurueck'; geh(s.standTheke); return true; }
    if (a.phase === 'zurueck' && da) {
      m.aufgabe = null;
      if (k) { uebergeben(z, stationen, s, k, t, zufall, a); nachruecken(z, stationen, s, t); }
      return true;
    }
    return false;
  }
  if (a && a.art === 'einkauf') {
    if (a.phase === 'hin' && da) {
      if (kannBezahlen(z, a.preis)) {
        einkaufBuchen(z, a);
        zahlZeigen(z, hier, -a.preis); delete K.gemeldet[id];
      }
      else { a.menge = 0; keinGeld(z, p, t, a.automat ? a.ware : a.ware === 'sandwich' ? 'sandwich' : null); }
      a.phase = 'zurueck'; geh(a.automat ? a.platz : a.ware === 'sandwich' ? s.standSandwich || s.standMaschine : s.standMaschine); return true;
    }
    if (a.phase === 'zurueck' && da) {
      if (a.automat) auffuellen(z, a.automat, a.menge);
      else maschineFuellen(z, a.maschine, a.menge);
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
        // Sandwich (27.11.): nur, wenn ein Sandwichmaker da ist und er eins will; ist er leer, gibt es nur den Kaffee
        if (s.sandwich && willSandwich(vorne)) {
          if ((s.sandwich.fuellung || 0) > 0) { s.sandwich.fuellung--; m.aufgabe.sandwich = { x: s.sandwich.x, y: s.sandwich.y }; }
          else m.aufgabe.sandwichLeer = true;
        }
        geh(s.standMaschine, true);
      } else { ohneKaffee(z, vorne, t); nachruecken(z, stationen, s, t); }
      return true;
    }
    return false;
  }
  // Schichtbetrieb (27.11.): Einkaufen und Auffüllen macht nur noch die Logistik aus dem Lager (logistikSchritt)
  // Erst Kaffee, dann Sandwiches (27.11.) – der Sandwichmaker gehört der Station, die am nächsten ist; geteilt füllt ihn der erste
  const schonSw = new Set(Object.values(K.ma).filter(x => x !== m && x.aufgabe && x.aufgabe.ware === 'sandwich').map(x => idx(z, x.aufgabe.maschine.x, x.aufgabe.maschine.y)));
  for (const ma of [maschine, s.sandwich].filter(Boolean)) {
    if (z.schichtbetrieb || K.gesperrt[id] > t) break;
    const fehlt = fassungVon(ma) - (ma.fuellung || 0);
    if (fehlt <= 0 || (ma !== maschine && schonSw.has(idx(z, ma.x, ma.y)))) continue;
    const menge = Math.min(tragenVon(ma), fehlt), preis = Math.round(menge * einkaufPreis(ma) * 100) / 100;
    const sw = ma.art === 'sandwichmaker';
    if (!kannBezahlen(z, preis)) { keinGeld(z, p, t, sw ? 'sandwich' : null); return true; }
    m.aufgabe = { art: 'einkauf', phase: 'hin', menge, preis, maschine: { x: ma.x, y: ma.y }, ware: sw ? 'sandwich' : null };
    geh(LADEN.eingang); return true;
  }
  // Automaten im Raum auffüllen (26.11.): wie beim Kaffee. 27.11.: erst ab auffuellenAb fehlenden, dann alles bis voll
  const reserviert = new Set(Object.values(K.ma).filter(x => x !== m && x.aufgabe && x.aufgabe.automat).map(x => idx(z, x.aufgabe.automat.x, x.aufgabe.automat.y)));
  const au = !z.schichtbetrieb && !(K.gesperrt[id] > t) && automatZumAuffuellen(z, s.raum, reserviert);
  if (au) {
    const menge = au.fehlt, preis = Math.round(menge * au.typ.einkauf * 100) / 100;
    if (!kannBezahlen(z, preis)) { keinGeld(z, p, t, au.typ.id); return true; }
    m.aufgabe = { art: 'einkauf', phase: 'hin', menge, preis, ware: au.typ.id, automat: { x: au.m.x, y: au.m.y }, platz: auffuellPlatz(z, s.raum, au.m) };
    geh(LADEN.eingang); return true;
  }
  if (!istBei(m.bew, m.heim, t)) { m.aufgabe = { art: 'gehen' }; geh(m.heim); return true; }
  return false;
}
// ---- Logistik (Lukas, 27.11.: claude/spielprinzip-ehrenamt-schichten-lager.md) ----
// Ehrenamtliche mit einer Logistik-Schicht stehen im Lager. Solange ihre Schicht läuft, kaufen sie im Laden ein, was fehlt –
// auch wenn das Kirchkaffee offen ist: erst Kaffee für jede Kaffeemaschine, dann Ware für jeden Automaten (je Gang höchstens
// EINKAUF.tragen; Automaten ab auffuellenAb fehlenden, dann alles bis voll). Ohne Logistik füllt niemand auf.
// Wer gerade mit Ware unterwegs ist, bringt sie noch hin, auch wenn die Schicht inzwischen zu Ende ist (kaffeeBeschaeftigt).
function lagerVonPerson(z, raeume, p) {
  if (p.daheim) return null;
  const r = eingesetztIn(z, raeume, p);
  return r && r.typ.id === 'lager' && moebelImRaum(z, r, 'regal').length ? r : null;
}
export function logistikMitarbeiter(z, raeume) {
  if (!z.schichtbetrieb) return [];
  // aktiv: Logistik-Schicht läuft noch (sonst bringt er nur noch hin, was er schon gekauft hat, und kauft nichts Neues)
  return z.personen.map(p => ({ p, raum: lagerVonPerson(z, raeume, p) })).filter(x => x.raum)
    .map(x => { const s = aktiveSchicht(z, raeume, x.p); return { ...x, aktiv: !!s && s.t.art === 'logistik' }; });
}
function logistikSchritt(z, raeume, p, raum, t, aktiv = true) {
  const K = z.kaffee, id = p.id;
  const m = K.ma[id] || (K.ma[id] = { heim: { x: p.x, y: p.y }, bew: stehen(p, t), aufgabe: null, logistik: true });
  const a = m.aufgabe, da = angekommen(m.bew, t);
  const hier = !a && istBei(m.bew, m.heim, t) ? umherPosition(z, raum, p, t) : posBei(m.bew, t);
  const geh = ziel => { m.bew = gehen(z, hier, ziel, t); };
  if (a && a.art === 'einkauf') {
    if (a.phase === 'hin' && da) {
      if (kannBezahlen(z, a.preis)) {
        einkaufBuchen(z, a);
        zahlZeigen(z, hier, -a.preis); delete K.gemeldet[id];
      }
      else { a.menge = 0; keinGeld(z, p, t, a.automat ? a.ware : a.ware === 'sandwich' ? 'sandwich' : null); }
      a.phase = 'zurueck'; geh(a.platz); return true;
    }
    if (a.phase === 'zurueck' && da) {
      if (a.automat) auffuellen(z, a.automat, a.menge);
      else maschineFuellen(z, a.maschine, a.menge);
      m.aufgabe = null; return true;
    }
    return false;
  }
  if (a && a.art === 'gehen') { if (!da) return false; m.aufgabe = null; return true; }
  if (aktiv && !(K.gesperrt[id] > t)) {
    // Was andere Logistiker gerade schon holen, holt er nicht auch noch
    const andere = Object.values(K.ma).filter(x => x !== m && x.aufgabe && x.aufgabe.art === 'einkauf');
    const schonMaschine = new Set(andere.filter(x => x.aufgabe.maschine && !x.aufgabe.automat).map(x => idx(z, x.aufgabe.maschine.x, x.aufgabe.maschine.y)));
    const schonAutomat = new Set(andere.filter(x => x.aufgabe.automat).map(x => idx(z, x.aufgabe.automat.x, x.aufgabe.automat.y)));
    for (const kr of raeume.liste.filter(r => r.typ && r.typ.id === 'kirchkaffee' && !r.probleme.length)) {
      // erst alle Kaffeemaschinen, dann die Sandwichmaker (27.11.)
      for (const ma of [...moebelImRaum(z, kr, 'kaffeemaschine'), ...moebelImRaum(z, kr, 'sandwichmaker')]) {
        const fehlt = fassungVon(ma) - (ma.fuellung || 0);
        if (fehlt <= 0 || schonMaschine.has(idx(z, ma.x, ma.y))) continue;
        const menge = Math.min(tragenVon(ma), fehlt), preis = Math.round(menge * einkaufPreis(ma) * 100) / 100;
        const sw = ma.art === 'sandwichmaker';
        if (!kannBezahlen(z, preis)) { keinGeld(z, p, t, sw ? 'sandwich' : null); return true; }
        const platz = standplatz(z, kr, ma, ma) || { x: ma.x, y: ma.y + 1 };
        m.aufgabe = { art: 'einkauf', phase: 'hin', menge, preis, maschine: { x: ma.x, y: ma.y }, platz, ware: sw ? 'sandwich' : null };
        geh(LADEN.eingang); return true;
      }
    }
    for (const r of raeume.liste.filter(r => r.typ && !r.probleme.length)) {
      const au = automatZumAuffuellen(z, r, schonAutomat);
      if (!au) continue;
      // Lukas, 27.11.: alles bis voll (keine Grenze je Gang mehr – AUTOMAT.tragen gibt es nicht mehr, sonst wäre der Preis NaN)
      const menge = au.fehlt, preis = Math.round(menge * au.typ.einkauf * 100) / 100;
      if (!kannBezahlen(z, preis)) { keinGeld(z, p, t, au.typ.id); return true; }
      m.aufgabe = { art: 'einkauf', phase: 'hin', menge, preis, ware: au.typ.id, automat: { x: au.m.x, y: au.m.y }, platz: auffuellPlatz(z, r, au.m) };
      geh(LADEN.eingang); return true;
    }
  }
  if (!istBei(m.bew, m.heim, t)) { m.aufgabe = { art: 'gehen' }; geh(m.heim); return true; }
  return false;
}
// Ist dieser Ehrenamtliche im Kirchkaffee oder in der Logistik noch beschäftigt? (Schlange bedienen, Ware hinbringen)
// Dann geht er erst danach heim bzw. zu seiner nächsten Schicht (dienst.js).
export function kaffeeBeschaeftigt(z, id) {
  const K = z.kaffee;
  if (!K) return false;
  const a = K.ma[id] && K.ma[id].aufgabe;
  if (a && a.art !== 'gehen') return true;
  return K.kunden.some(k => k.ea === id && (k.phase === 'schlange' || k.phase === 'bestellt'));
}

// Zu wenig Geld für den Einkauf: Meldung (nur einmal, bis es wieder klappt), später nochmal versuchen
// ware: Automat (z. B. 'getraenkeautomat') oder null beim Kaffee
function keinGeld(z, p, t, ware = null) {
  const K = z.kaffee;
  K.gesperrt[p.id] = t + EINKAUF.wiederholen;
  if (!K.gemeldet[p.id]) {
    K.gemeldet[p.id] = true;
    K.meldung = { code: ware ? 'keinGeldAutomat' : 'keinGeldKaffee', name: (daten(p) || {}).name || '', zeit: t };
    if (ware) K.meldung.ware = ware;
  }
}

function kundeSchritt(z, k, t) {
  const K = z.kaffee;
  // Toilettengang: solange er läuft, passiert nichts; danach wieder am Platz (oder auf dem Heimweg schon weg)
  if (k.gang) {
    if (wcUnterwegs(k, t)) return false;
    const nach = k.gang.nach;
    k.gang = null;
    if (k.phase === 'heim') { K.kunden = K.kunden.filter(x => x !== k); return true; }
    k.bew = { pfad: [{ x: nach.x, y: nach.y }], laenge: 0, t0: t };
    return true;
  }
  // Sitzt oder steht er an seinem Platz und hat 80 %: zur Toilette und zurück an denselben Platz
  if ((k.phase === 'steht' || k.phase === 'sitzt') && t < k.stehBis - EPS && angekommen(k.bew, t)) {
    const platz = k.bew.pfad[k.bew.pfad.length - 1];
    const gang = wcGang(z, k, 'kaffee', platz, platz, t);
    if (gang) { k.stehBis = Math.max(k.stehBis, gang.zurueckBis); return true; }
    // Automat (26.11.): zur geplanten Zeit hin und zurück an denselben Platz
    if (k.automatPlan && k.automatPlan.length && t >= k.automatPlan[0].ab - EPS && raeumeJetzt) {
      const { art } = k.automatPlan.shift();
      const g = gangJetztZumAutomaten(z, raeumeJetzt, art, platz, t);
      if (g) { k.gang = g; (k.gaenge = k.gaenge || []).push(g); k.stehBis = Math.max(k.stehBis, g.zurueckBis); }
      return true;
    }
  }
  if ((k.phase === 'steht' || k.phase === 'sitzt') && t >= k.stehBis - EPS) { heimSchicken(z, k, t); return true; }
  if (k.phase === 'heim' && angekommen(k.bew, t)) { K.kunden = K.kunden.filter(x => x !== k); return true; }
  return false;
}

// ---- Alles, was bis jetzt fällig ist, ausführen ----
export function kaffeeAktualisieren(z, raeume, zufall = Math.random) {
  kaffeeAnlegen(z);
  const K = z.kaffee, t = z.minuten;
  raeumeJetzt = raeume; toilettenJetzt = gibtToiletten(z, raeume);
  const stationen = kirchkaffeeZustand(z, raeume).flatMap(k => k.stationen);
  const vonEa = new Map(stationen.map(s => [s.ea.id, s]));
  const lager = logistikMitarbeiter(z, raeume), vonLager = new Map(lager.map(x => [x.p.id, x]));   // Logistik (27.11.)
  // Mitarbeiter, die keine Station mehr haben oder versetzt wurden: Aufgabe abbrechen, wieder an ihrem Platz
  for (const id of Object.keys(K.ma)) {
    const p = z.personen.find(x => x.id === id), m = K.ma[id];
    const passt = m.logistik ? vonLager.has(id) : vonEa.has(id);
    if (!p || !passt || m.heim.x !== p.x || m.heim.y !== p.y) { abbrechen(z, id); delete K.ma[id]; }
  }
  // Kunden, deren Station es nicht mehr gibt: an eine andere Schlange, sonst ohne Kaffee heim
  for (const k of K.kunden) {
    if ((k.phase !== 'schlange' && k.phase !== 'bestellt') || vonEa.has(k.ea)) continue;
    const s = kuerzeste(K, stationen);
    if (s) { k.ea = s.ea.id; k.phase = 'schlange'; k.nr = 1e9; } else ohneKaffee(z, k, Math.max(t, k.ab));
  }
  mindestSchritt(z, raeume, t, zufall);   // Mindestgäste zu den eigenen Öffnungszeiten (27.11.)
  for (const s of stationen) nachruecken(z, stationen, s, t);
  for (let runde = 0; runde < 200; runde++) {
    let geaendert = false;
    for (const s of stationen) if (stationSchritt(z, stationen, s, t, zufall)) geaendert = true;
    for (const x of lager) if (logistikSchritt(z, raeume, x.p, x.raum, t, x.aktiv)) geaendert = true;
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
  const wc = K.kunden.some(k => k.wc0) && gibtToiletten(z, raeume);
  for (const k of K.kunden) {
    zeiten.push(ankunft(k.bew), k.ab);
    if (k.stehBis !== null) zeiten.push(k.stehBis);
    if (k.gang) zeiten.push(k.gang.zurueckBis);
    if (k.automatPlan && k.automatPlan.length) zeiten.push(Math.max(k.automatPlan[0].ab, ankunft(k.bew)));
    else if (wc && k.wc0 && (k.phase === 'steht' || k.phase === 'sitzt')) {
      zeiten.push(wannZurToilette(k, Math.max(t, ankunft(k.bew))));
      // Toilette (27.11.): wer schon 80 % hat und auf eine freie Kabine wartet, schaut wieder, sobald eine frei wird
      if (mussZurToilette(k, t)) { const frei = naechsteFreieKabine(z, t); if (frei !== null) zeiten.push(frei); }
    }
  }
  for (const r of raeume.liste) if (r.typ && r.typ.id === 'kirchkaffee') for (const f of schichtFenster(z, r, t)) zeiten.push(f.von, f.bis);
  zeiten.push(...mindestZeiten(z, raeume, t));
  const naechste = Math.min(...zeiten.filter(x => x > t + EPS));
  return Number.isFinite(naechste) ? { zeit: naechste, tun: (zz, rr, zf) => kaffeeAktualisieren(zz, rr, zf) } : null;
}

// ---- Abfragen für die Anzeige ----
// Kunden im Kirchkaffee (wie Besucher gezeichnet)
export function kaffeeKundenPositionen(z) {
  if (!z.kaffee) return [];
  const t = z.minuten;
  if (wcWege.size > 2000) wcWege.clear();
  return z.kaffee.kunden.filter(k => t >= k.ab).map(k => {
    if (k.gang && t >= k.gang.hinAb && t < k.gang.zurueckBis) {   // auf dem Weg zur Toilette, wartend, drin oder zurück
      const o = gangOrt(k.gang, t, (s, a, b) => strecke(z, wcWege, s, a, b), punktAufWeg, `kk:${k.id}:${k.gang.hinAb}:`);
      return { id: k.id, name: k.name, x: o.x, y: o.y, sitzt: false };
    }
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
  return Object.values(z.kaffee.ma).filter(m => m.aufgabe && m.aufgabe.art === 'bedienen' && (m.aufgabe.phase === 'laden' || m.aufgabe.phase === 'sandwichLaden'))
    .map(m => { const a = m.aufgabe, pos = a.phase === 'sandwichLaden' ? a.sandwich : a.maschine;
      return { x: pos.x, y: pos.y, anteil: Math.max(0, Math.min(1, 1 - (a.bis - z.minuten) / (a.dauer || LADEN_MINUTEN))) }; });
}
export function kaffeeZahlen(z) { return z.kaffee ? z.kaffee.zahlen.map(e => ({ nr: e.nr, x: e.x, y: e.y, betrag: e.betrag, art: e.art || null })) : []; }
export function kaffeeMeldung(z) {
  const m = z.kaffee && z.kaffee.meldung;
  return m && z.minuten - m.zeit < MELDUNG_DAUER ? m : null;
}
export function imKirchkaffee(z, id) { return !!(z.kaffee && z.kaffee.kunden.some(k => k.id === id)); }
