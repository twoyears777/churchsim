// Die „Schalterwand“ zwischen Spiellogik und Oberfläche.
//
// Die Oberfläche (Knöpfe, Menüs, 2D-Ansicht) redet NUR über diese Datei mit dem Spiel:
//   • Befehle:   z. B. spiel.moebelKaufen('stuhl', x, y) → 'ok' | 'geld' | 'platz'
//                spiel.tick(sekunden) lässt die Uhr laufen (Tick-System).
//   • Abfragen:  z. B. spiel.lage(), spiel.besucherInfo(id) → fertige Zahlen und Zustände (Codes, keine Texte).
// Den Spielstand selbst bekommt die Oberfläche nie in die Hand – Abfragen liefern Kopien.
// Texte, Farben und Formatierung macht die Oberfläche; Regeln, Zahlen und Berechnungen macht nur der Kern.
import { neuerZustand, LEER, WAND, TUER, idx, erkenneRaeume, pruefeRaum, raumTypVon, typZuweisen,
  abriss, tuerUmschalten as tuerSchalten } from './karte.js';
import { personenAnlegen, personenPruefen, versetzen, verfuegbarkeit, daten, eingesetztIn } from './personen.js';
import { moebelAnlegen, moebelPruefen, moebelBei as moebelAuf, moebelKaufen as kaufen, moebelAbreissen,
  kaffeeNachkaufen as nachkaufen, fassung } from './moebel.js';
import { finanzenAnlegen, kannBezahlen, buchen } from './finanzen.js';
import { besucherAnlegen } from './besucher.js';
import { zeitAnlegen, zeitpunkt, tageBisSonntag, spielMinuten } from './zeit.js';
import { zeitVorruecken, gottesdienstRaeume, kirchkaffeeZustand, moeglicheVeranstaltungen, veranstaltungVon,
  veranstaltungEinstellen, prognose, finanzPrognose, terminDieseWoche } from './ablauf.js';
import { wandBauen as bauen, wandKonflikte, wandAnpassen } from './bauen.js';
import { sonntagDerWoche, kirchenjahrStand } from './kalender.js';
import { besucherPositionen, kaffeePosition } from './bewegung.js';
import { RAUMTYPEN } from '../inhalte/raumtypen.js';
import { MOEBEL } from '../inhalte/moebel.js';
import { NACHKAUFEN } from '../inhalte/kirchkaffee.js';
import { SLOTS, TEMPI } from '../inhalte/zeit.js';

export const FELD = { LEER, WAND, TUER };   // Inhalt eines Kästchens auf der Karte
export const SPEICHER_VERSION = 3;          // Spielstand-Format (3 = Echtzeit, 2 = Runden aus 0.1.1)

// ---- Spielstand anlegen ----
export function spielAnlegen(z, zufall = Math.random) {
  personenAnlegen(z); moebelAnlegen(z); finanzenAnlegen(z); besucherAnlegen(z, zufall); zeitAnlegen(z);
  return z;
}
export function neuesSpiel(zufall = Math.random) { return spielAnlegen(neuerZustand(), zufall); }

// Spielstand aus 0.1.1 (Runden) übernehmen: Gebäude, Möbel, Mitarbeiter und Geld bleiben,
// Besucher und Zeit fangen neu an.
export function ausRundenSpielstand(alt) {
  const z = neuerZustand();
  for (const k of ['zellen', 'raumTyp', 'veranstaltung', 'moebel', 'personen', 'konto', 'naechsteId']) if (k in alt) z[k] = alt[k];
  return spielAnlegen(z);
}
// Gespeicherten Text in einen Spielstand verwandeln (null = nichts Brauchbares)
export function spielstandLesen(text) {
  try {
    const d = JSON.parse(text);
    if (!d || !d.zustand || !d.zustand.zellen) return null;
    if (d.version === SPEICHER_VERSION) return spielAnlegen(d.zustand);
    if (d.version === 2) return ausRundenSpielstand(d.zustand);
  } catch (e) {}
  return null;
}

// Räume erkennen und prüfen (Funktion, Probleme)
export function raeumeAuswerten(z) {
  const { raeume: liste, gruppe } = erkenneRaeume(z);
  for (const r of liste) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); }
  return { liste, gruppe };
}

// Was gerade läuft bzw. was für den Gottesdienst fehlt (als Code; den Text macht die Oberfläche)
export function spielStatus(z, raeume) {
  const L = z.lauf;
  if (L && L.phase !== 'ende') return { phase: L.phase, heim: L.gaeste && L.phase !== 'anreise' ? L.gaeste.filter(g => !g.sitz).length : 0 };
  if (L && L.ausgefallen) return { phase: 'ausgefallen' };
  if (L && z.letzterGottesdienst && z.letzterGottesdienst.heim) return { phase: 'vorbei', heim: z.letzterGottesdienst.heim };
  const gd = gottesdienstRaeume(z, raeume).filter(b => b.typ.id === 'gottesdienst');
  if (!gd.length) return { fehlt: 'raum' };
  const mit = gd.filter(b => b.veranstaltung && b.veranstaltung.id === 'gottesdienst');
  if (!mit.length) return { fehlt: 'veranstaltung' };
  if (!mit.some(b => b.bereit)) return { fehlt: 'leitung' };
  return {};
}

// Bedürfnisse eines Besuchers beim aktuellen Termin: true = erfüllt, false = nicht erfüllt, null = offen
export function beduerfnisse(z, b) {
  const L = z.lauf, g = L && L.gaeste ? L.gaeste.find(x => x.id === b.id) : null;
  let sitzplatz = null, kaffee = null, gottesdienst = null;
  if (g) {
    sitzplatz = !!g.sitz;
    gottesdienst = L.ausgefallen || !g.sitz ? false : L.phase !== 'anreise' ? true : null;
    if (g.kaffee && g.kaffee.ergebnis) kaffee = g.kaffee.ergebnis === 'ja';
    else if (!g.sitz || L.ausgefallen || (L.phase === 'ende' && !g.kaffee)) kaffee = false;
  }
  return { sitzplatz, kaffee: b.kaffee ? kaffee : 'keinWunsch', gottesdienst };
}

// ---- Das Spiel als Ganzes: Befehle und Abfragen ----
export function spielStarten(gespeichert = null, zufall = Math.random) {
  let z = (gespeichert && spielstandLesen(gespeichert)) || neuesSpiel(zufall);
  let raeume = raeumeAuswerten(z), bauModus = false;
  const wegSpeicher = new Map(), verlauf = [];
  const kopie = x => JSON.parse(JSON.stringify(x));
  const raumNr = (x, y) => (x >= 0 && y >= 0 && x < z.w && y < z.h ? raeume.gruppe[idx(z, x, y)] : -1);
  const personAuf = (x, y) => z.personen.some(p => p.x === x && p.y === y);

  // Bauen mit Rückgängig. Gemerkt wird nur das Gebaute (Wände, Räume, Möbel, wo Mitarbeiter stehen) und das Geld dafür –
  // die Zeit, die Besucher und das Kaffeegeld laufen beim Rückgängigmachen nicht zurück.
  const BAU = ['zellen', 'raumTyp', 'veranstaltung', 'moebel', 'personen'];
  function aendern(fn) {
    const vorher = JSON.stringify(BAU.map(k => z[k])), kontoVor = z.konto;
    const ergebnis = fn();
    moebelPruefen(z); personenPruefen(z);
    verlauf.push({ bau: vorher, geld: z.konto - kontoVor });
    if (verlauf.length > 60) verlauf.shift();
    raeume = raeumeAuswerten(z);
    return ergebnis;
  }

  const spiel = {
    // ---------- Befehle ----------
    // Tick-System: echte Sekunden seit dem letzten Bild → Spielzeit rückt vor. Im Editor und bei Pause steht die Zeit.
    tick(sekunden) {
      if (z.tempo <= 0 || bauModus) return false;
      const vorher = z.personen.length;
      zeitVorruecken(z, raeume, spielMinuten(Math.min(0.25, sekunden), z.tempo), zufall);
      if (z.personen.length !== vorher) raeume = raeumeAuswerten(z);   // neue Ehrenamtliche
      if (!z.lauf) wegSpeicher.clear();
      return true;
    },
    tempoSetzen(t) { if (TEMPI.includes(t)) z.tempo = t; },
    bauModus(an) { bauModus = !!an; },
    zuruecksetzen() { z = neuesSpiel(zufall); raeume = raeumeAuswerten(z); verlauf.length = 0; wegSpeicher.clear(); },

    // Bauen: Wand-Rechteck (rückt an bestehende Wände heran) → 'ok' | 'konflikt' (Möbel im Weg)
    wandBauen(x0, y0, x1, y1) {
      [x0, y0, x1, y1] = wandAnpassen(z, x0, y0, x1, y1);
      if (wandKonflikte(z, x0, y0, x1, y1).length) return 'konflikt';
      aendern(() => bauen(z, x0, y0, x1, y1));
      return 'ok';
    },
    abreissen(x0, y0, x1, y1) { aendern(() => { abriss(z, x0, y0, x1, y1); moebelAbreissen(z, x0, y0, x1, y1); }); },
    tuerUmschalten(x, y) { return z.zellen[idx(z, x, y)] ? aendern(() => tuerSchalten(z, x, y)) : false; },
    // → 'ok' | 'geld' | 'platz' | 'belegt'
    moebelKaufen(art, x, y) {
      if (moebelAuf(z, x, y)) return 'belegt';
      const typ = MOEBEL.find(m => m.id === art);
      if (!typ) return 'platz';
      if (!kannBezahlen(z, typ.kosten)) return 'geld';
      return aendern(() => kaufen(z, art, x, y, personAuf));
    },
    personVersetzen(id, x, y) {
      const p = z.personen.find(q => q.id === id);
      if (!p || (p.x === x && p.y === y)) return false;
      return aendern(() => versetzen(z, p, x, y));
    },
    raumTypSetzen(nr, typId) { const r = raeume.liste[nr]; if (r) aendern(() => typZuweisen(z, r, typId || null)); },
    veranstaltungSetzen(nr, id) { const r = raeume.liste[nr]; if (r) aendern(() => veranstaltungEinstellen(z, r, id || null)); },
    planSetzen(tag, slot) { if (tag >= 0 && tag <= 6 && SLOTS.some(s => s.id === slot)) z.plan = { tag, slot }; },
    // → 'ok' | 'voll' | 'geld' | 'keine'
    kaffeeNachkaufen(x, y) { const m = moebelAuf(z, x, y); return m && m.art === 'kaffeemaschine' ? nachkaufen(z, m) : 'keine'; },
    rueckgaengig() {
      const e = verlauf.pop();
      if (!e) return false;
      const [zellen, raumTyp, veranstaltung, moebel, personen] = JSON.parse(e.bau);
      for (const m of moebel) { const jetzt = moebelAuf(z, m.x, m.y); if (jetzt && jetzt.art === m.art && 'fuellung' in jetzt) m.fuellung = jetzt.fuellung; }
      Object.assign(z, { zellen, raumTyp, veranstaltung, moebel });
      for (const p of z.personen) { const alt = personen.find(a => a.id === p.id); if (alt) { p.x = alt.x; p.y = alt.y; } }
      if (e.geld < 0) buchen(z, 'einnahmen', 'rueckerstattung', -e.geld);
      if (e.geld > 0) buchen(z, 'ausgaben', 'moebel', e.geld);
      personenPruefen(z); raeume = raeumeAuswerten(z);
      return true;
    },
    speicherText() { return JSON.stringify({ version: SPEICHER_VERSION, zustand: z }); },

    // ---------- Abfragen ----------
    // Alles, was die 2D-Ansicht zum Zeichnen braucht
    karte() {
      const kk = new Map(kirchkaffeeZustand(z, raeume).map(k => [k.raum, k.stationen.length ? 'offen' : k.fehlt]));
      return {
        w: z.w, h: z.h, zellen: z.zellen.slice(),
        raeume: raeume.liste.map(r => {
          const v = veranstaltungVon(z, r), moeglich = moeglicheVeranstaltungen(r.typ).length > 0;
          return { nr: r.nr, zellen: r.zellen.slice(), box: { ...r.box }, probleme: [...r.probleme],
            typ: r.typ ? { id: r.typ.id, name: r.typ.name, farbe: r.typ.farbe, minGroesse: [...r.typ.minGroesse] } : null,
            veranstaltungsraum: moeglich, veranstaltung: moeglich && v ? v.name : null, kirchkaffee: kk.get(r) || null };
        }),
        moebel: z.moebel.map(m => ({ art: m.art, x: m.x, y: m.y, fuellung: m.fuellung, anteil: m.art === 'kaffeemaschine' ? (m.fuellung || 0) / fassung(m.art) : null })),
        personen: z.personen.map(p => {
          const d = daten(p); if (!d) return null;
          const pos = kaffeePosition(z, p) || p;
          return { id: p.id, name: d.name, kuerzel: d.kuerzel, art: d.art, x: pos.x, y: pos.y, feldX: p.x, feldY: p.y };
        }).filter(Boolean),
        besucher: besucherPositionen(z, wegSpeicher)
      };
    },
    // Anzeigen oben und in der Seitenleiste
    lage() {
      const zp = zeitpunkt(z.minuten), lg = z.letzterGottesdienst;
      const personen = z.personen.map(p => { const d = daten(p), r = eingesetztIn(z, raeume, p); return d && { id: p.id, art: d.art, name: d.name, einsatz: r ? r.typ.name : null }; }).filter(Boolean);
      return {
        woche: zp.woche + 1, tag: zp.tag, stunde: zp.stunde, minute: zp.minute, tageBisSonntag: tageBisSonntag(z.minuten),
        sonntag: sonntagDerWoche(zp.woche), kirchenjahr: kirchenjahrStand(zp.woche),
        tempo: z.tempo, konto: z.konto, bekanntheit: z.bekanntheit,
        finanzen: finanzPrognose(z, raeume),
        letzterGottesdienst: lg ? { besucher: lg.besucher, heim: lg.heim, ausgefallen: lg.ausgefallen } : null,
        bekannteBesucher: z.besucher.length,
        verfuegbarkeit: verfuegbarkeit(z, raeume), personen,
        status: spielStatus(z, raeume),
        beschaeftigt: !!(z.lauf && z.lauf.phase !== 'ende')
      };
    },
    zelle(x, y) { const t = x >= 0 && y >= 0 && x < z.w && y < z.h ? z.zellen[idx(z, x, y)] : null; return t === WAND ? 'wand' : t === TUER ? 'tuer' : t === LEER ? 'leer' : null; },
    raumNrBei: raumNr,
    veranstaltungsraumBei(x, y) { const nr = raumNr(x, y), r = raeume.liste[nr]; return r && moeglicheVeranstaltungen(r.typ).length ? nr : null; },
    moebelBei(x, y) { const m = moebelAuf(z, x, y); return m ? { art: m.art, x: m.x, y: m.y } : null; },
    moebelArten() { return MOEBEL.map(m => ({ id: m.id, name: m.name, kosten: m.kosten, leistbar: kannBezahlen(z, m.kosten) })); },
    // Vorschau beim Ziehen einer Wand: angepasstes Rechteck und Kästchen, auf denen Möbel im Weg stehen
    wandVorschau(x0, y0, x1, y1) {
      [x0, y0, x1, y1] = wandAnpassen(z, x0, y0, x1, y1);
      return { x0, y0, x1, y1, konflikte: wandKonflikte(z, x0, y0, x1, y1) };
    },
    // Fenster „Raumfunktion“ im Editor
    raumtypWahl(nr) {
      const r = raeume.liste[nr];
      if (!r) return null;
      return { tueren: r.tueren, hatTyp: !!r.typ,
        typen: RAUMTYPEN.map(t => ({ id: t.id, name: t.name, farbe: t.farbe, minGroesse: [...t.minGroesse],
          zuKlein: pruefeRaum(z, r, t).includes('groesse'), aktiv: !!r.typ && r.typ.id === t.id })) };
    },
    // Raum-Fenster in der Spielansicht (Gottesdienstraum)
    raumInfo(nr) {
      const r = raeume.liste[nr];
      if (!r || !moeglicheVeranstaltungen(r.typ).length) return null;
      const v = veranstaltungVon(z, r), info = gottesdienstRaeume(z, raeume).find(g => g.raum === r);
      return {
        nr, typName: r.typ.name, veranstaltung: v ? v.id : null,
        moeglich: moeglicheVeranstaltungen(r.typ).map(x => ({ id: x.id, name: x.name })),
        bedingungen: { leitung: !!(info && info.leitung) },
        plan: { ...z.plan }, slots: SLOTS.map(s => ({ ...s })),
        imRaum: (info ? info.imRaum : []).map(p => { const d = daten(p); return { name: d.name, art: d.art }; }),
        prognose: v ? { ...prognose(z, raeume), dieseWoche: terminDieseWoche(z) } : null
      };
    },
    // Menü der Kaffeemaschine
    maschineInfo(x, y) {
      const m = moebelAuf(z, x, y);
      if (!m || m.art !== 'kaffeemaschine') return null;
      const max = fassung(m.art), n = m.fuellung || 0, r = raeume.liste[raumNr(x, y)];
      return { fuellung: n, fassung: max, nachkaufen: { ...NACHKAUFEN }, imKirchkaffee: !!(r && r.typ && r.typ.id === 'kirchkaffee'),
        zuVoll: n + NACHKAUFEN.tassen > max, keinGeld: !kannBezahlen(z, NACHKAUFEN.preis) };
    },
    // Besucher-Kärtchen
    besucherInfo(id) {
      const b = z.besucher.find(x => x.id === id);
      return b ? { id: b.id, voll: b.voll, besuche: b.besuche, zufriedenheit: b.zufriedenheit, beduerfnisse: beduerfnisse(z, b) } : null;
    },
    // Charakter-Karte eines Mitarbeiters
    personInfo(id) {
      const p = z.personen.find(x => x.id === id), d = p && daten(p);
      if (!d) return null;
      const r = eingesetztIn(z, raeume, p);
      return { id, name: d.name, art: d.art, einsatz: r ? r.typ.name : null };
    }
  };
  // Abfragen liefern Kopien – die Oberfläche kann den Spielstand nicht aus Versehen verändern.
  for (const name of ['lage', 'raumtypWahl', 'raumInfo', 'maschineInfo', 'besucherInfo', 'personInfo', 'moebelArten']) {
    const f = spiel[name]; spiel[name] = (...a) => { const e = f(...a); return e == null ? e : kopie(e); };
  }
  return Object.freeze(spiel);
}
