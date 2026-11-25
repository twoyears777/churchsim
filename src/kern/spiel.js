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
import { personenAnlegen, personHinzufuegen, personenPruefen, versetzen, verfuegbarkeit, daten, eingesetztIn } from './personen.js';
import { moebelAnlegen, moebelPruefen, moebelBei as moebelAuf, moebelKaufen as kaufen, moebelAbreissen,
  fassung, grenzeErreicht, stuhlStufe, naechsteStufe, stuhlVerbessern as verbessern,
  alleVerbessern, alleVerbessernPreis, stuehleImRaum, moebelImRaum, felder, felderVon, musikStand, instrumenteImRaum } from './moebel.js';
import { einzugsgebietAnlegen, einzugsgebiet, parkplaetzeAuswerten, busAusbauen, werbekampagneKaufen } from './einzugsgebiet.js';
import { PARKPLATZ, BUSHALTESTELLE, BUSHALTESTELLE_ORT, WERBEKAMPAGNE } from '../inhalte/einzugsgebiet.js';
import { finanzenAnlegen, kannBezahlen, buchen, finanzUebersicht } from './finanzen.js';
import { EINNAHMEN, AUSGABEN, VERLAUF_WOCHEN } from '../inhalte/finanzen.js';
import { besucherAnlegen } from './besucher.js';
import { zeitAnlegen, zeitpunkt, tageBisSonntag, spielMinuten, TAG_MIN } from './zeit.js';
import { zeitVorruecken, gottesdienstRaeume, kirchkaffeeZustand, moeglicheVeranstaltungen, programmVon,
  veranstaltungEinstellen, terminEinstellen, prognose, finanzPrognose, terminDieseWoche, ablaufAnlegen, laufVon,
  naechsteKaffeeOeffnung, termineDerWoche, verdraengtVon } from './ablauf.js';
import { kaffeeAnlegen, kaffeeKundenPositionen, sitzplaetzeVon, kaffeeMitarbeiterPosition, kaffeeLaden, kaffeeZahlen, kaffeeMeldung, schichtenVon,
  schichtHinzufuegen, schichtEntfernen, offenBei } from './kirchkaffee.js';
import { PLAETZE, VERANSTALTUNGEN } from '../inhalte/veranstaltungen.js';
import { lobpreisVorliebe, kaffeeVorliebe } from './besucher.js';
import { START_EHRENAMTLICHE } from '../inhalte/mitarbeiter.js';
import { wandBauen as bauen, wandKonflikte, wandAnpassen } from './bauen.js';
import { sonntagDerWoche, kirchenjahrStand, kommendeFeste, tagAnzeige, zeitAmTag, festAmTag, feiertagAmTag, faktorAmTag } from './kalender.js';
import { dauerspenderAnlegen, dauerspenderListe } from './dauerspender.js';
import { DAUERSPENDE } from '../inhalte/finanzen.js';
import { festeAnlegen, festAnfrageOffen, festAusSchluessel, festSchluessel, festPlanSetzen, festAbsagen } from './feste.js';
import { ZEITEN, ZEIT_FAKTOREN, FESTE_GESPERRT, FEST_MENUE } from '../inhalte/kirchenjahr.js';
import { besucherPositionen } from './bewegung.js';
import { ortAnlegen, passantenPositionen, ortMeldung, mensch, neugierChance } from './ort.js';
import { seelsorgeAnlegen, anfrageOffen, anfrageInfo, ablehnen as seelsorgeAblehnen, raten as seelsorgeRaten,
  schliessen as seelsorgeZu, stufeInfo, seelsorgePositionen, seelsorgeUnterwegs } from './seelsorge.js';
import { STAMMGAST_AB_BESUCHEN, PLAKAT, NEUGIER } from '../inhalte/ort.js';
import { BEKANNTHEIT } from '../inhalte/besucher.js';
import { SEELSORGE } from '../inhalte/seelsorge.js';
import { GRUNDSTUECK } from '../inhalte/umgebung.js';
import { RAUMTYPEN } from '../inhalte/raumtypen.js';
import { MOEBEL, STUHL_STUFEN } from '../inhalte/moebel.js';
import { EINKAUF, MAX_SCHICHTEN, SCHICHT_ENDE, SITZEN } from '../inhalte/kirchkaffee.js';
import { SLOTS, TEMPI } from '../inhalte/zeit.js';

export const FELD = { LEER, WAND, TUER };   // Inhalt eines Kästchens auf der Karte
export const SPEICHER_VERSION = 3;          // Spielstand-Format (3 = Echtzeit, 2 = Runden aus 0.1.1)

// ---- Spielstand anlegen ----
export function spielAnlegen(z, zufall = Math.random) {
  personenAnlegen(z); moebelAnlegen(z); finanzenAnlegen(z); besucherAnlegen(z, zufall); zeitAnlegen(z);
  ortAnlegen(z); seelsorgeAnlegen(z); ablaufAnlegen(z); einzugsgebietAnlegen(z); kaffeeAnlegen(z); festeAnlegen(z); dauerspenderAnlegen(z);
  return z;
}
// Neues Spiel: Pastor (aus der Inhaltsdatei) und die Start-Ehrenamtlichen (z. B. Frau des Pastors); sie stehen am Tor.
// start: true – gehört von Anfang an dazu, zählt nicht zum Einzugsgebiet.
export function neuesSpiel(zufall = Math.random) {
  const z = spielAnlegen(neuerZustand(), zufall);
  for (const d of START_EHRENAMTLICHE) personHinzufuegen(z, { ...d, start: true });
  return z;
}

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

// Was gerade läuft bzw. was für die Veranstaltungen fehlt (als Code; den Text macht die Oberfläche)
// fehlt: 'raum' | 'veranstaltung' | 'leitung' | 'gitarre' | 'gesperrt' (Kanzel/Altar für Veranstaltung 2)
export function spielStatus(z, raeume) {
  const L = z.laeufe || [];
  const aktiv = L.filter(l => l.phase !== 'ende').sort((a, b) => a.beginn - b.beginn)[0];
  if (aktiv) return { phase: aktiv.phase, platz: aktiv.platz, heim: aktiv.gaeste && aktiv.phase !== 'anreise' ? aktiv.gaeste.filter(g => !g.sitz).length : 0 };
  // Kirchkaffee hat in einer eigenen Schicht geöffnet
  if (kirchkaffeeZustand(z, raeume).some(k => k.stationen.length && offenBei(z, k.raum))) return { phase: 'kaffeeOffen' };
  const zuletzt = L.filter(l => l.phase === 'ende').sort((a, b) => b.ende - a.ende)[0];
  if (zuletzt && zuletzt.ausgefallen) {
    const f = zuletzt.wegenFest && festAusSchluessel(zuletzt.wegenFest);   // fällt wegen eines Sonderevents aus
    return { phase: 'ausgefallen', grund: zuletzt.grund, platz: zuletzt.platz, fest: f ? f.fest.name : null };
  }
  if (zuletzt && z.letzterGottesdienst && z.letzterGottesdienst.heim) return { phase: 'vorbei', heim: z.letzterGottesdienst.heim };
  const gd = gottesdienstRaeume(z, raeume).filter(b => b.typ.id === 'gottesdienst');
  if (!gd.length) return { fehlt: 'raum' };
  const mit = gd.flatMap(b => b.programm).filter(p => p.art);
  if (!mit.length) return { fehlt: 'veranstaltung' };
  if (!mit.some(p => p.bereit)) return { fehlt: mit[0].fehlt, platz: mit[0].platz };
  const gesperrt = mit.find(p => p.fehlt === 'gesperrt');
  if (gesperrt) return { fehlt: 'gesperrt', platz: gesperrt.platz };
  return {};
}

// Bedürfnisse eines Besuchers beim aktuellen Termin: true = erfüllt, false = nicht erfüllt, null = offen.
// Kaffee: ob jemand Kaffee will, entscheidet sich nach dem Gottesdienst (Chance = Kaffee-Wert); vorher offen.
export function beduerfnisse(z, b) {
  const L = laufVon(z, b.id), g = L ? L.gaeste.find(x => x.id === b.id) : null;
  let sitzplatz = null, kaffee = null, gottesdienst = null;
  if (g) {
    sitzplatz = !!g.sitz;
    gottesdienst = L.ausgefallen || !g.sitz ? false : L.phase !== 'anreise' ? true : null;
    if (g.kaffee) kaffee = g.kaffee.ergebnis ? g.kaffee.ergebnis === 'ja' : null;
    else if (g.sitz && !L.ausgefallen && (L.phase === 'anreise' || L.phase === 'gottesdienst')) kaffee = null;
    else kaffee = 'keinWunsch';
  }
  return { sitzplatz, kaffee, gottesdienst };
}

// Status einer Person für Liste und Kärtchen
function statusVon(z, b) {
  if (z.ort.leute.includes(b)) return b.neugierig ? 'neugierig' : 'passant';
  return b.stamm || b.besuche >= STAMMGAST_AB_BESUCHEN ? 'stammgast' : 'besucher';
}

// Neueste Meldung: jemand neugierig am Tor, oder zu wenig Geld für den Kaffee-Einkauf
function neuesteMeldung(z) {
  const o = ortMeldung(z), k = kaffeeMeldung(z);
  if (!k) return o;
  const oz = z.ort && z.ort.meldung ? z.ort.meldung.zeit : -Infinity;
  return !o || k.zeit >= oz ? { code: k.code, name: k.name } : o;
}

// Offene Seelsorge-Anfrage, dazu der Status der fragenden Person (Passant, Stammgast …)
function seelsorgeLage(z) {
  const a = anfrageInfo(z), p = a && mensch(z, a.id);
  return a && p ? { ...a, status: statusVon(z, p) } : a;
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
  const BAU = ['zellen', 'raumTyp', 'veranstaltung', 'moebel', 'personen', 'kaffeeZeiten'];
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
      if (z.tempo <= 0 || bauModus || anfrageOffen(z) || festAnfrageOffen(z)) return false;   // offene Seelsorge-Anfrage / Fest-Menü: Zeit steht
      const vorher = z.personen.length;
      zeitVorruecken(z, raeume, spielMinuten(Math.min(0.25, sekunden), z.tempo), zufall);
      if (z.personen.length !== vorher) raeume = raeumeAuswerten(z);   // neue Ehrenamtliche
      if (!z.laeufe.length) wegSpeicher.clear();
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
    // → 'ok' | 'geld' | 'platz' | 'belegt' | 'grenze' (z. B. schon eine Kanzel im Raum)
    //   | 'innen' (Straße/Parkplatz nur draußen) | 'bekanntheit' (Parkplatz erst ab Bekanntheit …)
    // dreh: Parkplatz längs statt quer
    moebelKaufen(art, x, y, dreh = false) {
      const typ = MOEBEL.find(m => m.id === art);
      if (!typ) return 'platz';
      const f = felderVon(art, x, y, dreh);
      if (f.some(c => moebelAuf(z, c.x, c.y))) return 'belegt';
      if (typ.aussen && f.some(c => raumNr(c.x, c.y) >= 0)) return 'innen';
      if (art === 'parkplatz' && z.bekanntheit < PARKPLATZ.abBekanntheit) return 'bekanntheit';
      if (grenzeErreicht(z, raeume.liste[raumNr(x, y)], art)) return 'grenze';
      if (!kannBezahlen(z, typ.kosten)) return 'geld';
      return aendern(() => kaufen(z, art, x, y, typ.aussen ? () => false : personAuf, dreh));   // auf Straße/Parkplatz darf jemand stehen
    },
    // Straße als Rechteck ziehen: jedes freie Kästchen draußen bekommt ein Straßenstück, solange das Geld reicht.
    // → { gebaut, ergebnis: 'ok' | 'geld' (nicht alles bezahlbar) | 'platz' (nichts frei) }
    strasseBauen(x0, y0, x1, y1) {
      const typ = MOEBEL.find(m => m.id === 'strasse');
      const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)], [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
      let gebaut = 0, geld = false;
      aendern(() => {
        for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
          if (moebelAuf(z, x, y) || raumNr(x, y) >= 0) continue;
          if (!kannBezahlen(z, typ.kosten)) { geld = true; continue; }
          if (kaufen(z, 'strasse', x, y) === 'ok') gebaut++;
        }
      });
      if (!gebaut) verlauf.pop();                              // nichts gebaut: kein leerer Rückgängig-Schritt
      return { gebaut, ergebnis: geld ? 'geld' : gebaut ? 'ok' : 'platz' };
    },
    // Bushaltestelle kaufen bzw. ausbauen → 'ok' | 'max' | 'bekanntheit' | 'geld'
    busAusbauen() { return busAusbauen(z); },
    // Überregionale Werbekampagne → 'ok' | 'gekauft' | 'bekanntheit' | 'geld'
    werbekampagneKaufen() { return werbekampagneKaufen(z); },
    personVersetzen(id, x, y) {
      const p = z.personen.find(q => q.id === id);
      if (!p || (p.x === x && p.y === y)) return false;
      return aendern(() => versetzen(z, p, x, y));
    },
    raumTypSetzen(nr, typId) { const r = raeume.liste[nr]; if (r) aendern(() => typZuweisen(z, r, typId || null)); },
    // Art einer Veranstaltung (platz 0 = Veranstaltung 1) → 'ok' | 'gesperrt' (Platz noch nicht frei) | 'keine'
    veranstaltungSetzen(nr, platz, id) {
      const r = raeume.liste[nr];
      if (!r || !moeglicheVeranstaltungen(r.typ).length || !PLAETZE[platz]) return 'keine';
      if (id && !moeglicheVeranstaltungen(r.typ).some(v => v.id === id)) return 'keine';
      const e = programmVon(z, r)[platz];
      if (!e.art && id && !PLAETZE[platz].braucht.every(a => moebelImRaum(z, r, a).length)) return 'gesperrt';
      aendern(() => veranstaltungEinstellen(z, r, id || null, platz));
      return 'ok';
    },
    // Zeit einer Veranstaltung → 'ok' | 'belegt' (im Raum ist dann schon eine) | 'zeit' | 'keine'
    terminSetzen(nr, platz, tag, slot) {
      const r = raeume.liste[nr];
      if (!r || !moeglicheVeranstaltungen(r.typ).length || !PLAETZE[platz]) return 'keine';
      let e = 'zeit';
      aendern(() => { e = terminEinstellen(z, r, platz, tag, slot); });
      return e;
    },
    // → 'ok' | 'voll' | 'geld' | 'keine'
    // Stuhl verbessern (eine Stufe höher) → 'ok' | 'max' | 'geld' | 'keine'
    stuhlVerbessern(x, y) {
      const m = moebelAuf(z, x, y);
      if (!m || m.art !== 'stuhl') return 'keine';
      const n = naechsteStufe(m);
      if (!n) return 'max';
      if (!kannBezahlen(z, n.upgrade)) return 'geld';
      return aendern(() => verbessern(z, m));
    },
    // Alle Stühle im Raum dieses Stuhls je eine Stufe höher → 'ok' | 'max' | 'geld' | 'keine'
    alleStuehleVerbessern(x, y) {
      const m = moebelAuf(z, x, y), r = raeume.liste[raumNr(x, y)];
      if (!m || m.art !== 'stuhl' || !r) return 'keine';
      if (!stuehleImRaum(z, r).length) return 'max';
      if (!kannBezahlen(z, alleVerbessernPreis(z, r))) return 'geld';
      return aendern(() => alleVerbessern(z, r));
    },
    // Plakat an der Pforte aufhängen → 'ok' | 'haengt' (hängt schon) | 'geld'
    plakatKaufen() {
      if (z.plakat) return 'haengt';
      if (!kannBezahlen(z, PLAKAT.preis)) return 'geld';
      z.plakat = { gekauft: z.minuten };
      buchen(z, 'ausgaben', 'plakat', PLAKAT.preis);
      return 'ok';
    },
    // Öffnungszeiten des Kirchkaffees: hinzufügen → 'ok' | 'voll' | 'belegt' | 'zeit' | 'keine'; entfernen → 'ok' | 'keine'
    schichtHinzufuegen(nr, tag, slot) {
      const r = raeume.liste[nr];
      if (!r || !r.typ || r.typ.id !== 'kirchkaffee') return 'keine';
      let e = 'zeit';
      aendern(() => { e = schichtHinzufuegen(z, r, tag, slot); });
      return e;
    },
    schichtEntfernen(nr, i) {
      const r = raeume.liste[nr];
      if (!r || !r.typ || r.typ.id !== 'kirchkaffee') return 'keine';
      let e = 'keine';
      aendern(() => { e = schichtEntfernen(z, r, i); });
      return e;
    },
    rueckgaengig() {
      const e = verlauf.pop();
      if (!e) return false;
      const [zellen, raumTyp, veranstaltung, moebel, personen, kaffeeZeiten] = JSON.parse(e.bau);
      for (const m of moebel) { const jetzt = moebelAuf(z, m.x, m.y); if (jetzt && jetzt.art === m.art && 'fuellung' in jetzt) m.fuellung = jetzt.fuellung; }
      Object.assign(z, { zellen, raumTyp, veranstaltung, moebel, kaffeeZeiten: kaffeeZeiten || {} });
      for (const p of z.personen) { const alt = personen.find(a => a.id === p.id); if (alt) { p.x = alt.x; p.y = alt.y; } }
      if (e.geld < 0) buchen(z, 'einnahmen', 'rueckerstattung', -e.geld, { was: 'rueckgaengig' });
      if (e.geld > 0) buchen(z, 'ausgaben', 'moebel', e.geld, { was: 'rueckgaengig' });
      personenPruefen(z); raeume = raeumeAuswerten(z);
      return true;
    },
    // Fest-Menü: Sonderevent planen → 'ok' | 'raum' | 'art' | 'leitung' | 'zeit' | 'vorbei'
    // a: { slot, raumNr, leitung (Person-id), art, ehrenamt: [Person-ids] }. Ehrenamtliche haben noch keine Wirkung.
    festPlanen(schluessel, a = {}) {
      const r = raeume.liste[a.raumNr];
      if (!r || !moeglicheVeranstaltungen(r.typ).length) return 'raum';
      if (!moeglicheVeranstaltungen(r.typ).some(v => v.id === a.art)) return 'art';
      const p = z.personen.find(x => x.id === a.leitung), d = p && daten(p);
      if (!d || d.art !== 'hauptamt') return 'leitung';
      const ea = (a.ehrenamt || []).filter(id => { const q = z.personen.find(x => x.id === id); return q && daten(q) && daten(q).art === 'ehrenamt'; });
      return festPlanSetzen(z, schluessel, { slot: a.slot, raum: Math.min(...r.zellen), leitung: p.id, art: a.art, ehrenamt: ea });
    },
    // Fest-Menü „Diesmal nicht“ (oder geplantes Sonderevent absagen) → 'ok'
    festAbsagen(schluessel) { return festAbsagen(z, schluessel); },
    // Seelsorge-Fenster → 'ok' | 'keine' | 'geld'
    seelsorgeAblehnen() { return seelsorgeAblehnen(z); },
    seelsorgeRat(nr) { return seelsorgeRaten(z, nr, zufall); },
    seelsorgeSchliessen() { return seelsorgeZu(z); },
    // Test-Werkzeug: beliebig viel Geld aufs Konto (ganze Euro, > 0). Zählt nicht in Finanzen/Prognose. → 'ok' | 'betrag'
    testGeld(betrag) {
      const b = Math.floor(Number(betrag));
      if (!Number.isFinite(b) || b <= 0 || b > 1e9) return 'betrag';
      z.konto += b;
      return 'ok';
    },
    speicherText() { return JSON.stringify({ version: SPEICHER_VERSION, zustand: z }); },

    // ---------- Abfragen ----------
    // Alles, was die 2D-Ansicht zum Zeichnen braucht
    karte() {
      const park = parkplaetzeAuswerten(z, raeume.gruppe);
      // Kirchkaffee unter dem Raumnamen: 'offen' | 'zu' (mit nächster Öffnung) | was fehlt
      const kk = new Map(kirchkaffeeZustand(z, raeume).map(k => {
        if (!k.stationen.length) return [k.raum, { code: k.fehlt }];
        if (offenBei(z, k.raum)) return [k.raum, { code: 'offen' }];
        const n = naechsteKaffeeOeffnung(z, raeume, k.raum), zp = n === null ? null : zeitpunkt(n);
        return [k.raum, { code: 'zu', naechste: zp ? { tag: zp.tag, stunde: zp.stunde, minute: zp.minute } : null }];
      }));
      return {
        w: z.w, h: z.h, zellen: z.zellen.slice(),
        raeume: raeume.liste.map(r => {
          const moeglich = moeglicheVeranstaltungen(r.typ).length > 0;
          const namen = moeglich ? programmVon(z, r).map(e => (VERANSTALTUNGEN.find(v => v.id === e.art) || {}).name).filter(Boolean) : [];
          return { nr: r.nr, zellen: r.zellen.slice(), box: { ...r.box }, probleme: [...r.probleme],
            typ: r.typ ? { id: r.typ.id, name: r.typ.name, farbe: r.typ.farbe, minGroesse: [...r.typ.minGroesse] } : null,
            veranstaltungsraum: moeglich, veranstaltung: namen.length ? namen.join(' · ') : null, kirchkaffee: kk.get(r) || null };
        }),
        moebel: z.moebel.map(m => ({ art: m.art, x: m.x, y: m.y, fuellung: m.fuellung, anteil: m.art === 'kaffeemaschine' ? (m.fuellung || 0) / fassung(m.art) : null,
          stufe: m.art === 'stuhl' ? stuhlStufe(m).stufe : null, dreh: !!m.dreh, felder: felder(m),
          // Straße/Parkplatz: führt es bis zum Tor? (sonst zählt der Parkplatz nicht)
          angeschlossen: m.art === 'strasse' || m.art === 'parkplatz' ? park.angeschlossen.has(`${m.x},${m.y}`) : null })),
        plakat: !!z.plakat,
        bus: { stufe: z.bus || 0, ...BUSHALTESTELLE_ORT },
        personen: z.personen.map(p => {
          const d = daten(p); if (!d) return null;
          const pos = kaffeeMitarbeiterPosition(z, p) || p;
          return { id: p.id, name: d.name, kuerzel: d.kuerzel, art: d.art, x: pos.x, y: pos.y, feldX: p.x, feldY: p.y };
        }).filter(Boolean),
        // Gottesdienst-Besucher, Passanten (ohne den, der gerade zum Pastor geht) und wer zur Seelsorge läuft
        besucher: [...besucherPositionen(z, wegSpeicher), ...passantenPositionen(z).filter(b => b.id !== seelsorgeUnterwegs(z)), ...seelsorgePositionen(z),
          ...kaffeeKundenPositionen(z)],
        laden: kaffeeLaden(z),     // Kaffeemaschinen, die gerade laden (Fortschritt 0–1)
        zahlen: kaffeeZahlen(z)    // „+1 €“ über Kunden, „−x €“ über dem Ehrenamtlichen nach dem Einkauf (nr: zum Wiedererkennen)
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
        beschaeftigt: z.laeufe.some(L => L.phase !== 'ende') || anfrageOffen(z) || z.kaffee.kunden.length > 0,
        seelsorge: seelsorgeLage(z),   // offene Seelsorge-Anfrage mit Status der Person (sonst null)
        festAnfrage: z.feste ? z.feste.anfrage : null,   // Fest-Menü steht an (Schlüssel des Fests; Zeit steht, bis beantwortet)
        meldung: neuesteMeldung(z)   // z. B. jemand ist neugierig am Tor stehen geblieben, zu wenig Geld für den Kaffee-Einkauf
      };
    },
    // Finanz-Fenster: diese Woche (nach Kategorien, Kirchkaffee im Detail), Kassenbuch der Woche, Verlauf früherer Wochen.
    // Wochen und Zeiten wie überall in der Anzeige: Woche ab 1, Tag 0 = Montag. Namen von Möbeln/Veranstaltungen kommen aus den Inhaltsdateien.
    finanzInfo() {
      const f = finanzUebersicht(z), prog = finanzPrognose(z, raeume);
      const name = (liste, id) => ((liste.find(x => x.id === id) || {}).name) || null;
      return {
        konto: f.konto, prognose: prog, namen: { einnahmen: EINNAHMEN, ausgaben: AUSGABEN }, verlaufWochen: VERLAUF_WOCHEN,
        woche: { ...f.woche, woche: (f.woche.woche ?? zeitpunkt(z.minuten).woche) + 1 },
        buchungen: f.buchungen.map(b => {
          const t = b.minuten === null ? null : zeitpunkt(b.minuten);
          return { ...b, tag: t ? t.tag : null, stunde: t ? t.stunde : null, minute: t ? t.minute : null,
            moebelName: b.moebel ? name(MOEBEL, b.moebel) : null, veranstaltungName: b.veranstaltung ? name(VERANSTALTUNGEN, b.veranstaltung) : null,
            spenderName: b.spender ? ((mensch(z, b.spender) || {}).voll || null) : null };
        }),
        // Dauerspender: wer spendet wie viel (diesen Montag), was nächsten Montag kommt, seit welcher Woche (ab 1); Regeln zum Anzeigen
        dauerspender: dauerspenderListe(z).map(d => ({ ...d, seit: d.seit + 1 })),
        dauerspendeRegeln: { ...DAUERSPENDE, chance: Math.round(DAUERSPENDE.chance * 100) },
        verlauf: f.verlauf.map(w => ({ ...w, woche: w.woche + 1 }))
      };
    },
    // Bekanntheit-Fenster: woher sie kommt, wie sie sich entwickelt hat und was sie bewirkt
    bekanntheitInfo() {
      const zp = zeitpunkt(z.minuten);
      return {
        wert: z.bekanntheit, max: 100,
        quellen: { gottesdienst: BEKANNTHEIT.proGottesdienst, zufrieden: BEKANNTHEIT.proSehrZufriedenem, zufriedenAb: BEKANNTHEIT.sehrZufrieden,
          seelsorge: SEELSORGE.gut.bekanntheit },
        verlauf: [...(z.bekanntheitVerlauf || []).map(p => ({ woche: p.woche + 1, wert: p.wert })), { woche: zp.woche + 1, wert: z.bekanntheit, jetzt: true }],
        protokoll: (z.bekanntheitLog || []).map(e => { const t = zeitpunkt(e.minuten); return { woche: t.woche + 1, tag: t.tag, quelle: e.quelle, wert: e.wert, anzahl: e.anzahl }; }),
        wirkung: { neueProWoche: z.bekanntheit / BEKANNTHEIT.teiler, teiler: BEKANNTHEIT.teiler,
          neugier: neugierChance(z, false), neugierPlakat: neugierChance(z, true), neugierGrund: NEUGIER.grund, proBekanntheit: NEUGIER.proBekanntheit,
          plakatFaktor: PLAKAT.faktor, plakat: !!z.plakat }
      };
    },
    // Fenster „Kirchenjahr“: aktuelle Zeit, heute (Fest/Feiertag), kommende Feste mit Faktoren und Plänen, alle Zeiten
    kirchenjahrInfo() {
      const heute = Math.floor(z.minuten / TAG_MIN), zp = zeitpunkt(z.minuten), stand = kirchenjahrStand(zp.woche);
      const fh = festAmTag(heute), plaene = z.feste ? z.feste.plaene : {};
      return {
        zeit: zeitAmTag(heute), fortschritt: stand.fortschritt, sonntag: sonntagDerWoche(zp.woche),
        heute: { fest: fh ? fh.name : null, feiertag: feiertagAmTag(heute), faktor: faktorAmTag(heute) },
        zeiten: ZEITEN.map(t => ({ id: t.id, name: t.name, farbe: t.farbe, besucher: (ZEIT_FAKTOREN[t.id] || {}).besucher || 1,
          kollekte: (ZEIT_FAKTOREN[t.id] || {}).kollekte || 1, aktuell: t.id === zeitAmTag(heute) })),
        feste: kommendeFeste(heute, 8).map(f => {
          const k = festSchluessel(f.id, f.tagNr), plan = plaene[k], a = tagAnzeige(f.tagNr);
          const nr = plan ? raeume.gruppe[plan.raum] : undefined, lp = plan && z.personen.find(p => p.id === plan.leitung);
          return { ...f, schluessel: k, tageBis: f.tagNr - heute, wochentag: a.wochentag, datum: a.datum,
            menueAb: f.gross ? Math.max(0, f.tagNr - heute - FEST_MENUE.tageVorher) : null,
            plan: plan ? { art: plan.art, slot: plan.slot, raumNr: nr === undefined || nr < 0 ? null : nr,
              raumName: nr >= 0 && raeume.liste[nr] && raeume.liste[nr].typ ? raeume.liste[nr].typ.name : null,
              leitung: lp && daten(lp) ? daten(lp).name : null } : null };
        }),
        gesperrt: FESTE_GESPERRT.map(f => ({ id: f.id, name: f.name, braucht: f.braucht }))
      };
    },
    // Fest-Menü: was ansteht, was man wählen kann, die aktuelle Auswahl (gespeicherter Plan oder Vorbelegung)
    festMenueInfo(schluessel) {
      const f = festAusSchluessel(schluessel);
      if (!f) return null;
      const heute = Math.floor(z.minuten / TAG_MIN), a = tagAnzeige(f.tagNr), plan = z.feste && z.feste.plaene[schluessel];
      const orte = raeume.liste.filter(r => moeglicheVeranstaltungen(r.typ).length && !r.probleme.length);
      const leute = art => z.personen.map(p => ({ p, d: daten(p) })).filter(x => x.d && x.d.art === art).map(x => ({ id: x.p.id, name: x.d.name }));
      const haupt = leute('hauptamt'), arten = VERANSTALTUNGEN.filter(v => v.raumtypen.includes('gottesdienst')).map(v => ({ id: v.id, name: v.name }));
      const planNr = plan ? raeume.gruppe[plan.raum] : undefined;
      const auswahl = plan ? { slot: plan.slot, raumNr: planNr >= 0 ? planNr : (orte[0] ? orte[0].nr : null), leitung: plan.leitung, art: plan.art, ehrenamt: [...plan.ehrenamt] }
        : { slot: f.fest.slot || 'vormittag', raumNr: orte[0] ? orte[0].nr : null, leitung: haupt[0] ? haupt[0].id : null, art: arten[0] ? arten[0].id : null, ehrenamt: [] };
      // Welche normalen Termine fallen mit dem gespeicherten Plan aus?
      const woche = Math.floor(f.tagNr / 7);
      const faellt = plan ? termineDerWoche(z, raeume, woche).filter(t => !t.fest && t.art && verdraengtVon(z, raeume, t) === schluessel)
        .map(t => { const nr = raeume.gruppe[t.raum]; return { platz: t.platz, raumName: raeume.liste[nr] && raeume.liste[nr].typ ? raeume.liste[nr].typ.name : null }; }) : [];
      return { schluessel, id: f.fest.id, name: f.fest.name, besucher: f.fest.besucher, kollekte: f.fest.kollekte,
        wochentag: a.wochentag, datum: a.datum, tageBis: f.tagNr - heute, offen: !!(z.feste && z.feste.anfrage === schluessel), geplant: !!plan,
        auswahl, raeume: orte.map(r => ({ nr: r.nr, name: r.typ.name })), hauptamtliche: haupt, ehrenamtliche: leute('ehrenamt'), arten,
        slots: SLOTS.map(x => ({ ...x })), faellt };
    },
    festOffen() { return festAnfrageOffen(z); },
    zelle(x, y) { const t = x >= 0 && y >= 0 && x < z.w && y < z.h ? z.zellen[idx(z, x, y)] : null; return t === WAND ? 'wand' : t === TUER ? 'tuer' : t === LEER ? 'leer' : null; },
    raumNrBei: raumNr,
    kirchkaffeeBei(x, y) { const nr = raumNr(x, y), r = raeume.liste[nr]; return r && r.typ && r.typ.id === 'kirchkaffee' ? nr : null; },
    veranstaltungsraumBei(x, y) { const nr = raumNr(x, y), r = raeume.liste[nr]; return r && moeglicheVeranstaltungen(r.typ).length ? nr : null; },
    moebelBei(x, y) { const m = moebelAuf(z, x, y); return m ? { art: m.art, x: m.x, y: m.y, dreh: !!m.dreh } : null; },
    moebelArten() {
      return MOEBEL.map(m => ({ id: m.id, name: m.name, kosten: m.kosten, max: m.max || null, leistbar: kannBezahlen(z, m.kosten),
        kategorie: m.kategorie || null, auchIn: m.auchIn ? [...m.auchIn] : [], groesse: m.groesse ? [...m.groesse] : null, aussen: !!m.aussen,
        abBekanntheit: m.id === 'parkplatz' ? PARKPLATZ.abBekanntheit : null,
        gesperrt: m.id === 'parkplatz' && z.bekanntheit < PARKPLATZ.abBekanntheit }));
    },
    // Welche Kästchen würde dieses Möbel hier belegen, und ginge das? (Vorschau beim Bauen)
    moebelVorschau(art, x, y, dreh = false) {
      const typ = MOEBEL.find(m => m.id === art);
      if (!typ) return null;
      const f = felderVon(art, x, y, dreh);
      const geht = f.every(c => c.x >= 0 && c.y >= 0 && c.x < z.w && c.y < z.h && z.zellen[idx(z, c.x, c.y)] === LEER && !moebelAuf(z, c.x, c.y) && (typ.aussen || !personAuf(c.x, c.y))
        && (!typ.aussen || raumNr(c.x, c.y) < 0)) && f.every(c => c.x >= GRUNDSTUECK.x && c.y >= GRUNDSTUECK.y && c.x < GRUNDSTUECK.x + GRUNDSTUECK.w && c.y < GRUNDSTUECK.y + GRUNDSTUECK.h);
      return { felder: f, geht };
    },
    // Einzugsgebiet (Bekanntheit-Fenster, Bushaltestelle): Stand, woraus die Grenze besteht, Maßnahmen
    einzugsgebietInfo() {
      const e = einzugsgebiet(z, raeume.gruppe), st = z.bus || 0, n = BUSHALTESTELLE[st] || null, B = z.bekanntheit;
      return { ...e, voll: e.frei <= 0, teile: { ...e.teile },
        parkplatz: { plus: PARKPLATZ.plus, abBekanntheit: PARKPLATZ.abBekanntheit, frei: B >= PARKPLATZ.abBekanntheit, anzahl: e.parkplaetze, verbunden: e.verbunden },
        bus: { stufe: st, maxStufe: BUSHALTESTELLE.length, name: st ? BUSHALTESTELLE[st - 1].name : null, plus: e.teile.bus,
          naechste: n ? { ...n, frei: B >= n.abBekanntheit, leistbar: kannBezahlen(z, n.preis) } : null },
        werbekampagne: { ...WERBEKAMPAGNE, gekauft: !!z.werbekampagne, frei: B >= WERBEKAMPAGNE.abBekanntheit, leistbar: kannBezahlen(z, WERBEKAMPAGNE.preis) } };
    },
    // Liegt dieses Kästchen an der Bushaltestelle? (nur wenn eine steht)
    busBei(x, y) {
      const o = BUSHALTESTELLE_ORT;
      return (z.bus || 0) > 0 && x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h;
    },
    // Liegt dieses Kästchen am Tor (Einfahrt)? Dort öffnet sich das Menü der Pforte.
    torBei(x, y) {
      const g = GRUNDSTUECK;
      return x >= g.tor.x && x < g.tor.x + g.tor.breite && (y === g.y + g.h - 1 || y === g.y + g.h);
    },
    // Menü der Pforte: Plakat. chance/chanceMit in Prozent.
    torInfo() {
      return { plakat: !!z.plakat, preis: PLAKAT.preis, faktor: PLAKAT.faktor, leistbar: kannBezahlen(z, PLAKAT.preis),
        chance: Math.round(neugierChance(z) * 100), chanceOhne: Math.round(neugierChance(z, false) * 100), chanceMit: Math.round(neugierChance(z, true) * 100) };
    },
    // Menü eines Stuhls im Editor: Stufe, Wirkung, nächste Stufe, alle im Raum verbessern
    stuhlInfo(x, y) {
      const m = moebelAuf(z, x, y);
      if (!m || m.art !== 'stuhl') return null;
      const st = stuhlStufe(m), n = naechsteStufe(m), r = raeume.liste[raumNr(x, y)];
      const alle = r ? stuehleImRaum(z, r) : [], preisAlle = r ? alleVerbessernPreis(z, r) : 0;
      return { x, y, stufe: st.stufe, maxStufe: STUHL_STUFEN.length, name: st.name, haltung: st.haltung, kollekte: st.kollekte, trinkgeld: st.trinkgeld,
        naechste: n ? { stufe: n.stufe, name: n.name, preis: n.upgrade, haltung: n.haltung, kollekte: n.kollekte, trinkgeld: n.trinkgeld, leistbar: kannBezahlen(z, n.upgrade) } : null,
        alle: r ? { anzahl: alle.length, preis: preisAlle, leistbar: kannBezahlen(z, preisAlle) } : null };
    },
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
      const info = gottesdienstRaeume(z, raeume).find(g => g.raum === r);
      const a = info ? info.ausstattung : null, musiker = new Set(info ? info.musiker : []);
      const hat = art => moebelImRaum(z, r, art).length > 0;
      // Raum mit Problemen (z. B. ohne Tür): Veranstaltungen sind eingestellt, können aber nicht stattfinden
      const programm = info ? info.programm : programmVon(z, r).map((e, i) => ({ platz: i, art: e.art, tag: e.tag, slot: e.slot,
        frei: PLAETZE[i].braucht.every(hat), fehlt: e.art ? 'raum' : 'keine', bereit: false }));
      return {
        nr, typName: r.typ.name,
        moeglich: moeglicheVeranstaltungen(r.typ).map(x => ({ id: x.id, name: x.name })),
        bedingungen: { leitung: !!(info && info.hauptamt.length), gitarre: hat('gitarre'), instrument: instrumenteImRaum(z, r) > 0 },
        // Was die Möbel im Raum bringen (Kanzel, Altar, Blumen, Grünpflanzen, Instrumente) und ob Musik gemacht wird
        ausstattung: a ? { teile: a.teile, instrument: a.instrument, musik: a.musik, musiker: a.musiker, musikBonus: a.musikBonus } : null,
        slots: SLOTS.map(s => ({ ...s })),
        // Veranstaltung 1, 2: Art, Zeit, ob der Platz frei ist, was fehlt, Prognose. nutzbar: lässt sich einstellen.
        programm: programm.map(p => ({ platz: p.platz, art: p.art, tag: p.tag, slot: p.slot, frei: p.frei, fehlt: p.fehlt, bereit: p.bereit,
          nutzbar: p.frei || !!p.art,
          prognose: p.platz === 0 || p.art ? { ...prognose(z, raeume, nr, p.platz), dieseWoche: terminDieseWoche(z, raeume, r, p.platz) } : null })),
        imRaum: (info ? info.imRaum : []).map(p => { const d = daten(p); return { name: d.name, art: d.art, musiker: musiker.has(p) }; })
      };
    },
    // Menü der Kaffeemaschine (nachgefüllt wird vom Ehrenamtlichen im Laden)
    maschineInfo(x, y) {
      const m = moebelAuf(z, x, y);
      if (!m || m.art !== 'kaffeemaschine') return null;
      const r = raeume.liste[raumNr(x, y)];
      return { fuellung: m.fuellung || 0, fassung: fassung(m.art), imKirchkaffee: !!(r && r.typ && r.typ.id === 'kirchkaffee'), einkaufPreis: EINKAUF.preisTasse };
    },
    // Fenster des Kirchkaffees: Zustand, nächste Öffnung, eigene Öffnungszeiten (Schichten)
    kaffeeRaumInfo(nr) {
      const r = raeume.liste[nr];
      if (!r || !r.typ || r.typ.id !== 'kirchkaffee') return null;
      const k = kirchkaffeeZustand(z, raeume).find(x => x.raum === r);
      const n = naechsteKaffeeOeffnung(z, raeume, r), zp = n === null ? null : zeitpunkt(n);
      const zustand = !k ? 'raum' : !k.stationen.length ? k.fehlt : offenBei(z, r) ? 'offen' : 'zu';
      return { nr, typName: r.typ.name, zustand, naechste: zp ? { tag: zp.tag, stunde: zp.stunde, minute: zp.minute } : null,
        schichten: schichtenVon(z, r), max: MAX_SCHICHTEN, stationen: k ? k.stationen.length : 0,
        sitzplaetze: sitzplaetzeVon(z, r), sitzChance: Math.round(SITZEN.chance * 100),
        slots: SLOTS.map(s => ({ id: s.id, stunde: s.stunde, ende: SCHICHT_ENDE[s.id] })) };
    },
    // Besucher-Kärtchen (auch für Passanten). zufriedenheit = Haltung zur Gemeinde.
    besucherInfo(id) {
      const b = mensch(z, id);
      if (!b) return null;
      const besucher = z.besucher.includes(b);
      return { id: b.id, voll: b.voll, besuche: b.besuche, zufriedenheit: b.zufriedenheit, status: statusVon(z, b), lobpreis: lobpreisVorliebe(b),
        kaffee: kaffeeVorliebe(b),
        beduerfnisse: besucher ? beduerfnisse(z, b) : null };
    },
    seelsorgeOffen() { return anfrageOffen(z); },
    // Fenster „Menschen im Ort“: alle, die die Gemeinde kennt
    menschen() {
      const zeile = b => ({ id: b.id, art: 'besucher', voll: b.voll, haltung: b.zufriedenheit, besuche: b.besuche,
        zuletzt: typeof b.zuletzt === 'number' ? b.zuletzt + 1 : null, kaffee: b.besuche || b.stamm ? kaffeeVorliebe(b) : null, status: statusVon(z, b) });
      const ea = z.personen.map(p => ({ p, d: daten(p) })).filter(x => x.d && x.d.art === 'ehrenamt').map(({ p, d }) => {
        const h = d.herkunft || {};
        return { id: p.id, art: 'person', voll: d.name, haltung: h.zufriedenheit ?? null, besuche: h.besuche ?? null,
          zuletzt: typeof h.zuletzt === 'number' ? h.zuletzt + 1 : null, kaffee: typeof h.kaffee === 'number' ? h.kaffee : null, status: 'ehrenamtlich' };
      });
      return [...z.besucher.map(zeile), ...ea, ...z.ort.leute.map(zeile)];
    },
    // Charakter-Karte eines Mitarbeiters
    personInfo(id) {
      const p = z.personen.find(x => x.id === id), d = p && daten(p);
      if (!d) return null;
      const r = eingesetztIn(z, raeume, p);
      return { id, name: d.name, art: d.art, einsatz: r ? r.typ.name : null, seelsorge: id === 'pastor' ? stufeInfo(z) : null,
        musik: d.art === 'ehrenamt' ? musikStand(p) : null };
    }
  };
  // Abfragen liefern Kopien – die Oberfläche kann den Spielstand nicht aus Versehen verändern.
  for (const name of ['lage', 'kirchenjahrInfo', 'festMenueInfo', 'raumtypWahl', 'raumInfo', 'kaffeeRaumInfo', 'maschineInfo', 'besucherInfo', 'personInfo', 'moebelArten', 'menschen', 'torInfo', 'stuhlInfo', 'einzugsgebietInfo', 'moebelVorschau']) {
    const f = spiel[name]; spiel[name] = (...a) => { const e = f(...a); return e == null ? e : kopie(e); };
  }
  return Object.freeze(spiel);
}
