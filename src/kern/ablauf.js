// Ablauf in Echtzeit: Die Uhr läuft, und jede Woche findet im eingetragenen Slot der Gottesdienst statt,
// danach das Kirchkaffee. Kennt keine Grafik – die Oberfläche zeigt nur an, was hier entschieden wird.
//
// Ablauf eines Termins (Zeiten in Spielminuten):
//   Beginn − 90  Anreise: Es wird ausgelost, wer kommt; die Besucher laufen los.
//   Beginn       Gottesdienst beginnt – nur, wenn ein Mitarbeiter im Raum ist. Sonst fällt er aus.
//   Beginn + 60  Gottesdienst zu Ende: Kollekte (Stuhl, Altar, Grünpflanzen, Musik), Bekanntheit; Kaffeegäste ins Kirchkaffee.
//   …            Kirchkaffee: Tasse für Tasse wird ausgegeben, je 1 € (wenn die Maschine nicht leer ist).
//   Beginn + 120 Ende: Zufriedenheit ändert sich, manche werden Ehrenamtliche, alle gehen heim.
import { VERANSTALTUNGEN, SONNTAGVORMITTAG } from '../inhalte/veranstaltungen.js';
import { DAUER, ANREISE_VORLAUF } from '../inhalte/zeit.js';
import { AENDERUNG, BEKANNTHEIT, KAFFEE_ANTEIL, EHRENAMT_AB_BESUCHEN, EHRENAMT_QUOTE } from '../inhalte/besucher.js';
import { KOLLEKTE_PRO_BESUCHER } from '../inhalte/finanzen.js';
import { PREIS_TASSE } from '../inhalte/kirchkaffee.js';
import { LEER, idx } from './karte.js';
import { moebelImRaum, moebelBei, raumAusstattung, stuhlStufe } from './moebel.js';
import { buchen, summe } from './finanzen.js';
import { werKommt, kommChance, zufriedenheitAendern, bekanntheitAendern, ehrenamtWerden } from './besucher.js';
import { eingesetztIn, personHinzufuegen, daten } from './personen.js';
import { zeitpunkt, slotBeginn } from './zeit.js';
import { NEUGIER } from '../inhalte/ort.js';
import { SEELSORGE } from '../inhalte/seelsorge.js';
import { ortSchritt } from './ort.js';
import { seelsorgeSchritt, anfrageOffen } from './seelsorge.js';

// Kollekte-Faktor für den Termin: Sonntagvormittag doppelt
export function zeitFaktor(plan) { return plan && plan.tag === SONNTAGVORMITTAG.tag && plan.slot === SONNTAGVORMITTAG.slot ? SONNTAGVORMITTAG.kollekte : 1; }
export const HEIMWEG = 120;  // so lange (Spielminuten) laufen die Besucher nach dem Ende noch nach Hause

// ---- Veranstaltungen in Räumen ----
export function moeglicheVeranstaltungen(typ) { return typ ? VERANSTALTUNGEN.filter(v => v.raumtypen.includes(typ.id)) : []; }
export function veranstaltungVon(z, raum) {
  const id = z.veranstaltung && z.veranstaltung[raum.zellen[0]];
  return VERANSTALTUNGEN.find(v => v.id === id) || null;
}
export function veranstaltungEinstellen(z, raum, id) {
  if (!z.veranstaltung) z.veranstaltung = {};
  for (const c of raum.zellen) { if (id) z.veranstaltung[c] = id; else delete z.veranstaltung[c]; }
}

// Fertige Räume, in denen Veranstaltungen möglich sind: wer ist im Raum, findet sie statt?
export function gottesdienstRaeume(z, raeume) {
  return raeume.liste.filter(r => r.typ && !r.probleme.length && moeglicheVeranstaltungen(r.typ).length).map(r => {
    const v = veranstaltungVon(z, r), zellen = new Set(r.zellen);
    const imRaum = z.personen.filter(p => zellen.has(idx(z, p.x, p.y)) && daten(p));
    const leitung = v ? (v.leitung ? imRaum.find(p => v.leitung.includes(p.id)) : imRaum[0]) || null : null;
    // Musiker: Ehrenamtliche im Raum, die dort eingesetzt sind (das geht nur, wenn eine Gitarre im Raum steht)
    const musiker = imRaum.filter(p => daten(p).art === 'ehrenamt' && eingesetztIn(z, raeume, p) === r);
    return { raum: r, typ: r.typ, veranstaltung: v, stuehle: moebelImRaum(z, r, 'stuhl'), imRaum, leitung, musiker,
      ausstattung: raumAusstattung(z, r, musiker.length > 0), bereit: !!(v && leitung) };
  });
}
export function gottesdienstBereit(z, raeume) { return gottesdienstRaeume(z, raeume).filter(g => g.bereit && g.veranstaltung.id === 'gottesdienst'); }

// Sitzplätze der bereiten Gottesdiensträume, beste Plätze zuerst (höchste Stuhlstufe, dann meiste Kollekte).
// wert: Kollekte der Person auf diesem Platz (1 € × Stuhl × Raum); haltung: + Haltung für sie.
export function sitzplaetze(liste) {
  const plaetze = liste.flatMap(g => g.stuehle.map(s => {
    const st = stuhlStufe(s);
    return { x: s.x, y: s.y, stufe: st.stufe, wert: KOLLEKTE_PRO_BESUCHER * st.kollekte * g.ausstattung.faktor, haltung: st.haltung + g.ausstattung.haltung };
  }));
  return plaetze.sort((a, b) => b.stufe - a.stufe || b.wert - a.wert);
}
// Kollekte und Haltung für einen besetzten Platz, so wie der Raum jetzt eingerichtet ist
function platzWirkung(z, raeume, sitz, liste) {
  const nr = raeume.gruppe[idx(z, sitz.x, sitz.y)], g = liste.find(x => x.raum.nr === nr);
  const m = moebelBei(z, sitz.x, sitz.y), st = m && m.art === 'stuhl' ? stuhlStufe(m) : stuhlStufe(null);
  const a = g ? g.ausstattung : { faktor: 1, haltung: 0 };
  return { kollekte: KOLLEKTE_PRO_BESUCHER * st.kollekte * a.faktor, haltung: st.haltung + a.haltung };
}

// ---- Kirchkaffee: Stationen aus Kaffeemaschine + Theke + Ehrenamtlichem ----
const NACHBARN = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function thekenGruppen(z, teile) {
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
// Freies Kästchen direkt neben einem Möbel, auf dem der Ehrenamtliche steht
function standplatz(z, raum, m, ziel) {
  const zellen = new Set(raum.zellen);
  const frei = NACHBARN.map(([dx, dy]) => ({ x: m.x + dx, y: m.y + dy }))
    .filter(p => zellen.has(idx(z, p.x, p.y)) && z.zellen[idx(z, p.x, p.y)] === LEER && !moebelBei(z, p.x, p.y));
  frei.sort((a, b) => Math.hypot(a.x - ziel.x, a.y - ziel.y) - Math.hypot(b.x - ziel.x, b.y - ziel.y));
  return frei[0] || null;
}

export function kirchkaffeeZustand(z, raeume) {
  return raeume.liste.filter(r => r.typ && r.typ.id === 'kirchkaffee' && !r.probleme.length).map(r => {
    const maschinen = moebelImRaum(z, r, 'kaffeemaschine'), theken = thekenGruppen(z, moebelImRaum(z, r, 'theke'));
    const eas = z.personen.filter(p => eingesetztIn(z, raeume, p) === r);
    const frei = [...theken], stationen = [];
    for (const m of maschinen) {
      if (stationen.length >= eas.length || !frei.length) break;
      // nächstgelegene freie Theke zur Maschine
      let beste = null;
      for (const g of frei) for (const t of g) {
        const d = Math.abs(t.x - m.x) + Math.abs(t.y - m.y);
        if (!beste || d < beste.d) beste = { d, g, t };
      }
      frei.splice(frei.indexOf(beste.g), 1);
      const ea = eas[stationen.length];
      stationen.push({ maschine: m, theke: beste.t, ea,
        standMaschine: standplatz(z, r, m, beste.t) || { x: ea.x, y: ea.y }, standTheke: standplatz(z, r, beste.t, m) || { x: ea.x, y: ea.y } });
    }
    const fehlt = !eas.length ? 'keinEhrenamt' : !maschinen.length ? 'keineMaschine' : !theken.length ? 'keineTheke' : null;
    return { raum: r, maschinen, stationen, fehlt };
  });
}
export function kirchkaffeeOffen(z, raeume) { return kirchkaffeeZustand(z, raeume).filter(k => k.stationen.length).map(k => k.raum); }

// Freie Stehplätze im Kirchkaffee (kein Möbel, keine Person, nicht der Platz eines Ehrenamtlichen)
function stehplaetze(z, zustand) {
  const belegt = new Set();
  for (const k of zustand) for (const s of k.stationen) for (const p of [s.standMaschine, s.standTheke]) belegt.add(idx(z, p.x, p.y));
  return zustand.filter(k => k.stationen.length).flatMap(k => k.raum.zellen)
    .filter(c => !belegt.has(c)).map(c => ({ x: c % z.w, y: (c / z.w) | 0 }))
    .filter(f => !moebelBei(z, f.x, f.y) && !z.personen.some(p => p.x === f.x && p.y === f.y));
}

// ---- Zeit vorrücken ----
// Prüft, welcher Schritt als Nächstes ansteht (Gottesdienst, Passanten im Ort, Seelsorge-Anfrage),
// und führt alle Schritte bis zur Zielzeit aus. Kommt eine Seelsorge-Anfrage, bleibt die Zeit genau dort stehen.
export function zeitVorruecken(z, raeume, minuten, zufall = Math.random) {
  if (anfrageOffen(z)) return;
  const ziel = z.minuten + minuten;
  for (let sicherung = 0; sicherung < 20000; sicherung++) {
    wochenbuchPruefen(z);
    let s = null;
    for (const k of [naechsterSchritt(z), ortSchritt(z, zufall), seelsorgeSchritt(z, seelsorgeGesperrt, zufall)]) if (k && (!s || k.zeit < s.zeit)) s = k;
    if (!s || s.zeit > ziel) break;
    z.minuten = Math.max(z.minuten, s.zeit);
    s.tun(z, raeume, zufall);
    if (anfrageOffen(z)) { wochenbuchPruefen(z); return; }
  }
  z.minuten = ziel;
  wochenbuchPruefen(z);
}
// Keine Seelsorge-Anfrage in den 3 Stunden vor dem Gottesdienst und nicht während Gottesdienst/Kirchkaffee
export function seelsorgeGesperrt(z) {
  if (z.lauf && z.lauf.phase !== 'ende') return true;
  const t = naechsterTermin(z);
  return !!t && z.minuten >= t.beginn - SEELSORGE.sperreVorGottesdienst;
}
// Neue Woche (Montag 0:00): Wochenbuch für die Seitenleiste leeren
function wochenbuchPruefen(z) {
  const w = zeitpunkt(z.minuten).woche;
  if (z.buchWoche !== w) { z.buchWoche = w; z.wochenbuch = { einnahmen: {}, ausgaben: {} }; }
  // Bekanntheit am Ende jeder Woche merken (Kurve im Bekanntheit-Fenster); alte Spielstände beginnen ab jetzt
  if (!Array.isArray(z.bekanntheitVerlauf)) z.bekanntheitVerlauf = [];
  const V = z.bekanntheitVerlauf;
  if (w > 0 && !V.some(p => p.woche === w - 1)) V.push({ woche: w - 1, wert: z.bekanntheit });
}

// Der nächste anstehende Termin (noch nicht begonnen)
export function naechsterTermin(z) {
  const w = zeitpunkt(z.minuten).woche;
  for (const woche of [w, w + 1]) {
    if (woche <= z.letzterLauf) continue;
    const beginn = slotBeginn(z.plan, woche);
    if (z.minuten >= beginn) continue;   // schon vorbei (z. B. Termin auf früher verschoben)
    return { woche, beginn };
  }
  return null;
}

function naechsterSchritt(z) {
  const L = z.lauf;
  if (!L) {
    const t = naechsterTermin(z);
    return t && { zeit: Math.max(t.beginn - ANREISE_VORLAUF, z.minuten), tun: (z, r, zf) => anreise(z, r, zf, t) };
  }
  const ende = L.beginn + DAUER.gottesdienst + DAUER.kirchkaffee;
  if (L.phase === 'anreise') return { zeit: L.beginn, tun: beginnen };
  if (L.phase === 'gottesdienst') return { zeit: L.beginn + DAUER.gottesdienst, tun: gottesdienstEnde };
  if (L.phase === 'kirchkaffee') {
    const g = L.gaeste.filter(g => g.kaffee && g.kaffee.zeit !== null && !g.kaffee.ergebnis).sort((a, b) => a.kaffee.zeit - b.kaffee.zeit)[0];
    if (g && g.kaffee.zeit <= ende) return { zeit: g.kaffee.zeit, tun: z => ausgeben(z, g) };
    return { zeit: ende, tun: abschliessen };
  }
  if (L.phase === 'ende') return { zeit: L.ende + HEIMWEG, tun: z => { z.lauf = null; } };
  return null;
}

function anreise(z, raeume, zufall, termin) {
  z.lauf = { woche: termin.woche, beginn: termin.beginn, phase: 'anreise', gaeste: null, start: z.minuten };
  if (gottesdienstBereit(z, raeume).length) gaesteAuslosen(z, raeume, zufall);
}

// Wer kommt, wer sitzt wo, wer muss wieder heim?
function gaesteAuslosen(z, raeume, zufall) {
  const L = z.lauf, raeumeBereit = gottesdienstBereit(z, raeume);
  const sitze = sitzplaetze(raeumeBereit).map(s => ({ x: s.x, y: s.y }));   // beste Plätze werden zuerst besetzt
  const kommen = werKommt(z, zufall);
  for (let i = kommen.length - 1; i > 0; i--) { const j = Math.floor(zufall() * (i + 1)); [kommen[i], kommen[j]] = [kommen[j], kommen[i]]; }
  const tuer = raumTuer(z, raeumeBereit[0].raum);
  L.ankunft = z.minuten;
  L.gaeste = kommen.map((b, i) => ({ id: b.id, name: b.vorname, voll: b.voll, sitz: i < sitze.length ? sitze[i] : null, tuer, kaffee: null }));
}
// Eine Tür des Raums (für die Heimgeschickten: bis dorthin und wieder zurück)
function raumTuer(z, raum) {
  for (const c of raum.zellen) {
    const x = c % z.w, y = (c / z.w) | 0;
    for (const [dx, dy] of NACHBARN) if (z.zellen[idx(z, x + dx, y + dy)] === 2) return { x: x + dx, y: y + dy };
  }
  return { x: raum.box.minX, y: raum.box.maxY };
}

function beginnen(z, raeume, zufall) {
  const L = z.lauf;
  // Das Plakat hängt bis zu diesem Gottesdienst (auch wenn er ausfällt). Erst während der Anreise gekauft: bleibt bis zum nächsten.
  if (z.plakat && !(z.plakat.gekauft > L.start)) delete z.plakat;
  if (!gottesdienstBereit(z, raeume).length) {
    // Kein Mitarbeiter im Raum (oder kein Gottesdienst eingestellt): Gottesdienst fällt aus.
    for (const b of z.besucher) zufriedenheitAendern(b, AENDERUNG.ausfall);
    Object.assign(L, { phase: 'ende', ausgefallen: true, ende: z.minuten });
    z.letzterLauf = L.woche;
    z.letzterGottesdienst = { woche: L.woche, ausgefallen: true, besucher: 0, heim: 0 };
    return;
  }
  if (!L.gaeste) gaesteAuslosen(z, raeume, zufall);   // Mitarbeiter erst kurz vor Beginn gekommen
  L.phase = 'gottesdienst';
}

function gottesdienstEnde(z, raeume) {
  const L = z.lauf, sitzend = L.gaeste.filter(g => g.sitz), S = L.beginn + DAUER.gottesdienst;
  // Kollekte: pro Besucher 1 € × Stuhl, × Altar, Grünpflanzen und Musik des Raums; am Ende auf ganze Euro gerundet.
  // Dazu merkt sich jeder Gast, wie viel Haltung ihm Stuhl, Kanzel und Blumen bringen (wird am Ende gutgeschrieben).
  const liste = gottesdienstRaeume(z, raeume);
  let summeKollekte = 0;
  for (const g of sitzend) { const w = platzWirkung(z, raeume, g.sitz, liste); summeKollekte += w.kollekte; g.bonus = w.haltung; }
  const betrag = Math.round(summeKollekte * zeitFaktor(z.plan));
  if (betrag > 0) buchen(z, 'einnahmen', 'kollekte', betrag);
  bekanntheitAendern(z, BEKANNTHEIT.proGottesdienst, 'gottesdienst');
  // Kaffeegäste auf die Stationen verteilen; jeder bekommt einen Stehplatz möglichst nah an seiner Theke.
  const zustand = kirchkaffeeZustand(z, raeume), stationen = zustand.flatMap(k => k.stationen);
  const plaetze = stehplaetze(z, zustand), wollen = sitzend.filter(g => (z.besucher.find(b => b.id === g.id) || {}).kaffee);
  const proStation = stationen.map(() => []);
  wollen.forEach((g, i) => {
    if (!stationen.length || !plaetze.length) { g.kaffee = { station: null, platz: null, zeit: null, ergebnis: 'keinPlatz' }; return; }
    const si = i % stationen.length, t = stationen[si].theke;
    plaetze.sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y));
    g.kaffee = { station: si, platz: plaetze.shift(), zeit: null, ergebnis: null };
    proStation[si].push(g);
  });
  // Ausgabezeiten: erst laufen alle hin, dann kommt Tasse für Tasse – so verteilt, dass alle in die Stunde passen.
  proStation.forEach(liste => {
    const takt = Math.min(5, (DAUER.kirchkaffee - 25) / Math.max(1, liste.length));
    liste.forEach((g, j) => { g.kaffee.zeit = S + 20 + (j + 1) * takt; });
  });
  L.stationen = stationen.map(s => ({ maschine: { x: s.maschine.x, y: s.maschine.y }, theke: s.theke, ea: s.ea.id, standMaschine: s.standMaschine, standTheke: s.standTheke }));
  L.phase = 'kirchkaffee';
}

// Eine Tasse ausgeben: nur, wenn die Maschine (noch) da ist und Kaffee drin ist.
function ausgeben(z, g) {
  const st = z.lauf.stationen[g.kaffee.station], m = st && moebelBei(z, st.maschine.x, st.maschine.y);
  if (!m || m.art !== 'kaffeemaschine' || !(m.fuellung > 0)) { g.kaffee.ergebnis = 'leer'; return; }
  m.fuellung--;
  buchen(z, 'einnahmen', 'kirchkaffee', PREIS_TASSE);
  g.kaffee.ergebnis = 'ja';
}

function abschliessen(z, raeume, zufall = Math.random) {
  const L = z.lauf, anwesend = [];
  for (const g of L.gaeste) {
    const b = z.besucher.find(x => x.id === g.id);
    if (!b) continue;
    if (!g.sitz) { zufriedenheitAendern(b, AENDERUNG.heimgeschickt); continue; }
    anwesend.push(b); b.besuche++; b.zuletzt = L.woche;
    zufriedenheitAendern(b, AENDERUNG.sitzplatz + AENDERUNG.gottesdienst + (g.bonus || 0));   // bonus: Stuhl, Kanzel, Blumen
    if (b.kaffee) zufriedenheitAendern(b, g.kaffee && g.kaffee.ergebnis === 'ja' ? AENDERUNG.kaffeeJa : AENDERUNG.kaffeeNein);
    g.zufriedenheit = b.zufriedenheit;
  }
  const sehr = anwesend.filter(b => b.zufriedenheit >= BEKANNTHEIT.sehrZufrieden).length;
  bekanntheitAendern(z, sehr * BEKANNTHEIT.proSehrZufriedenem, 'zufrieden', sehr);
  const neueEA = ehrenamtWerden(z, anwesend, zufall).map(b =>
    personHinzufuegen(z, { name: b.voll, kuerzel: b.vorname[0], art: 'ehrenamt', ausbildung: null, skill: null, charakter: null,
      herkunft: { besuche: b.besuche, zufriedenheit: b.zufriedenheit, kaffee: b.kaffee, zuletzt: b.zuletzt } }));
  Object.assign(L, { phase: 'ende', ende: z.minuten, neueEhrenamtliche: neueEA.map(p => p.daten.name) });
  z.letzterLauf = L.woche;
  z.letzterGottesdienst = { woche: L.woche, ausgefallen: false, besucher: anwesend.length, heim: L.gaeste.filter(g => !g.sitz).length };
}

// ---- Prognose für den Gottesdienstraum (erwartete Werte = Summe der Einzelchancen) ----
export function prognose(z, raeume) {
  const gd = gottesdienstRaeume(z, raeume).filter(g => g.veranstaltung && g.veranstaltung.id === 'gottesdienst');
  const bereit = gd.some(g => g.bereit), plaetze = gd.reduce((s, g) => s + g.stuehle.length, 0);
  const plakat = !!z.plakat;
  const neugierige = z.ort ? z.ort.leute.filter(p => p.neugierig) : [];
  const neu = z.bekanntheit / BEKANNTHEIT.teiler;
  const erwartet = z.besucher.reduce((s, b) => s + kommChance(b), 0) + neu + neugierige.length * NEUGIER.kommChance;
  const anteil = erwartet ? Math.min(1, plaetze / erwartet) : 0, sitzend = erwartet * anteil;
  if (!bereit) return { bereit, erwartet, plaetze, sitzend: 0, geld: 0, kollekte: 0, ehrenamt: 0, tassen: 0, plakat, sonntagvormittag: zeitFaktor(z.plan) > 1 };
  // Erwartete Kollekte: die erwarteten Besucher sitzen auf den besten Plätzen der bereiten Räume
  const sitze = sitzplaetze(gd.filter(g => g.bereit));
  let kollekteSumme = 0;
  for (let i = 0, rest = Math.min(sitzend, sitze.length); rest > 0; i++, rest--) kollekteSumme += sitze[i].wert * Math.min(1, rest);
  kollekteSumme *= zeitFaktor(z.plan);
  const kaffeeWunsch = (z.besucher.filter(b => b.kaffee).reduce((s, b) => s + kommChance(b), 0) + neu * KAFFEE_ANTEIL
    + neugierige.filter(p => p.kaffee).length * NEUGIER.kommChance) * anteil;
  const zustand = kirchkaffeeZustand(z, raeume);
  const vorrat = zustand.flatMap(k => k.stationen).reduce((s, st) => s + (st.maschine.fuellung || 0), 0);
  const tassen = Math.min(kaffeeWunsch, vorrat, stehplaetze(z, zustand).length);
  const ehrenamt = z.besucher.filter(b => b.besuche + 1 >= EHRENAMT_AB_BESUCHEN).reduce((s, b) => s + kommChance(b) * anteil * EHRENAMT_QUOTE, 0);
  return { bereit, erwartet, plaetze, sitzend, geld: kollekteSumme + tassen * PREIS_TASSE, kollekte: kollekteSumme, ehrenamt, tassen, plakat, sonntagvormittag: zeitFaktor(z.plan) > 1 };
}
// Steht der Gottesdienst dieser Woche noch aus?
export function terminDieseWoche(z) {
  const t = naechsterTermin(z);
  return (!!t && t.woche === zeitpunkt(z.minuten).woche) || (!!z.lauf && z.lauf.phase === 'anreise');
}
// Seitenleiste: was diese Woche schon gebucht ist plus, falls der Gottesdienst noch aussteht, die Prognose.
export function finanzPrognose(z, raeume) {
  const offen = terminDieseWoche(z) ? prognose(z, raeume).geld : 0;
  return { einnahmen: Math.round(summe(z.wochenbuch.einnahmen) + offen), ausgaben: summe(z.wochenbuch.ausgaben) };
}
