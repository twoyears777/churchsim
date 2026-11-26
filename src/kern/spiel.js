// Die „Schalterwand“ zwischen Spiellogik und Oberfläche.
//
// Die Oberfläche (Knöpfe, Menüs, 2D-Ansicht) redet NUR über diese Datei mit dem Spiel:
//   • Befehle:   z. B. spiel.moebelKaufen('stuhl', x, y) → 'ok' | 'geld' | 'platz'
//                spiel.tick(sekunden) lässt die Uhr laufen (Tick-System).
//   • Abfragen:  z. B. spiel.lage(), spiel.besucherInfo(id) → fertige Zahlen und Zustände (Codes, keine Texte).
// Den Spielstand selbst bekommt die Oberfläche nie in die Hand – Abfragen liefern Kopien.
// Texte, Farben und Formatierung macht die Oberfläche; Regeln, Zahlen und Berechnungen macht nur der Kern.
import { neuerZustand, LEER, WAND, TUER, FENSTER, idx, erkenneRaeume, pruefeRaum, raumTypVon, typZuweisen,
  abriss, tuerUmschalten as tuerSchalten, fensterUmschalten as fensterSchalten, neueWandStuecke, istWandStueck } from './karte.js';
import { BAUKOSTEN, STARTGELD_AUSGLEICH, FENSTER as FENSTER_WERT, FOYER } from '../inhalte/bau.js';
import { foyerWert } from './foyer.js';
import { personenAnlegen, personHinzufuegen, personenPruefen, versetzen, verfuegbarkeit, daten, eingesetztIn } from './personen.js';
import { moebelAnlegen, moebelPruefen, moebelBei as moebelAuf, moebelKaufen as kaufen, moebelAbreissen,
  fassung, grenzeErreicht, stuhlStufe, naechsteStufe, stuhlVerbessern as verbessern,
  alleVerbessern, alleVerbessernPreis, stuehleImRaum, moebelImRaum, felder, felderVon, instrumenteImRaum, istHindernis } from './moebel.js';
import { einzugsgebietAnlegen, einzugsgebiet, parkplaetzeAuswerten, busAusbauen, werbekampagneKaufen } from './einzugsgebiet.js';
import { PARKPLATZ, BUSHALTESTELLE, BUSHALTESTELLE_ORT, WERBEKAMPAGNE } from '../inhalte/einzugsgebiet.js';
import { finanzenAnlegen, kannBezahlen, buchen, finanzUebersicht, stornieren } from './finanzen.js';
import { EINNAHMEN, AUSGABEN, VERLAUF_WOCHEN } from '../inhalte/finanzen.js';
import { besucherAnlegen, levelVon } from './besucher.js';
import { beduerfnisseAnlegen, wochenBeduerfnisse } from './beduerfnisse.js';
import { HALTUNGSLEVEL } from '../inhalte/besucher.js';
import { zeitAnlegen, zeitpunkt, tageBisSonntag, spielMinuten, TAG_MIN } from './zeit.js';
import { zeitVorruecken, gottesdienstRaeume, kirchkaffeeZustand, moeglicheVeranstaltungen, programmVon,
  veranstaltungEinstellen, terminEinstellen, prognose, finanzPrognose, terminDieseWoche, ablaufAnlegen, laufVon,
  naechsteKaffeeOeffnung, termineDerWoche, verdraengtVon, naechstesEvent, plaetzeVon, platzSperre, terminStand } from './ablauf.js';
import { kaffeeAnlegen, kaffeeKundenPositionen, sitzplaetzeVon, kaffeeMitarbeiterPosition, kaffeeLaden, kaffeeZahlen, kaffeeMeldung, schichtenVon,
  schichtHinzufuegen, schichtEntfernen, offenBei } from './kirchkaffee.js';
import { VERANSTALTUNGEN } from '../inhalte/veranstaltungen.js';
import { bausteineVon } from './bausteine.js';
import { lobpreisVorliebe, kaffeeVorliebe } from './besucher.js';
import { jugendAnlegen, istJugend, konfiStand, konfiMeldung, konfirmandenZahl, festAktiv } from './konfi.js';
import { FESTE } from '../inhalte/kirchenjahr.js';
import { START_EHRENAMTLICHE } from '../inhalte/mitarbeiter.js';
import { wandBauen as bauen, wandKonflikte, wandAnpassen } from './bauen.js';
import { sonntagDerWoche, kirchenjahrStand, kommendeFeste, tagAnzeige, zeitAmTag, festAmTag, feiertagAmTag, faktorAmTag } from './kalender.js';
import { dauerspenderAnlegen, dauerspenderListe } from './dauerspender.js';
import { forschungAnlegen, forschungStarten, forschungAbbrechen, forschungListe } from './forschung.js';
import { skillsAnlegen, musikStand, musikLevel, evangelisationStand, stufeInfo, multiplikatorKaufen, multiplikatorInfo, hatSkill } from './skills.js';
import { HEILIGKEIT, FORSCHUNGEN } from '../inhalte/forschung.js';
import { DAUERSPENDE } from '../inhalte/finanzen.js';
import { zeitungOffen, zeitungSchliessen } from './erster.js';
import { festeAnlegen, festAnfrageOffen, festAusSchluessel, festSchluessel, festPlanSetzen, festAbsagen } from './feste.js';
import { ZEITEN, ZEIT_FAKTOREN, FESTE_GESPERRT, FEST_MENUE } from '../inhalte/kirchenjahr.js';
import { besucherPositionen } from './bewegung.js';
import { menschenStatistik } from './menschenStatistik.js';
import { toiletteAktuell } from './toiletten.js';
import { umherPosition } from './umherlaufen.js';
import { musikerGaenge, musikerPosition } from './musiker.js';
import { evangelisationAnlegen, evangelisationPosition, evangelisationInfo, freieEhrenamtliche } from './evangelisation.js';
import { EVANGELISATION } from '../inhalte/evangelisation.js';
import { ortAnlegen, passantenPositionen, ortMeldung, mensch, neugierChance, neugierTeile } from './ort.js';
import { gelaende, aushaenge, aushangGilt, aushangSetzen } from './gelaende.js';
import { GELAENDE, SCHAUKASTEN } from '../inhalte/gelaende.js';
import { seelsorgeAnlegen, anfrageOffen, anfrageInfo, ablehnen as seelsorgeAblehnen, raten as seelsorgeRaten,
  schliessen as seelsorgeZu, seelsorgePositionen, seelsorgeUnterwegs } from './seelsorge.js';
import { STAMMGAST_AB_BESUCHEN, PLAKAT, NEUGIER } from '../inhalte/ort.js';
import { BEKANNTHEIT } from '../inhalte/besucher.js';
import { SEELSORGE } from '../inhalte/seelsorge.js';
import { GRUNDSTUECK } from '../inhalte/umgebung.js';
import { RAUMTYPEN } from '../inhalte/raumtypen.js';
import { MOEBEL, STUHL_STUFEN } from '../inhalte/moebel.js';
import { istAutomat, lagerVon, automatInfo } from './automaten.js';
import { EINKAUF, MAX_SCHICHTEN, SCHICHT_ENDE, SITZEN } from '../inhalte/kirchkaffee.js';
import { SLOTS, TEMPI } from '../inhalte/zeit.js';
const forschungName = id => (FORSCHUNGEN.find(f => f.id === id) || {}).name || null;

export const FELD = { LEER, WAND, TUER, FENSTER };   // Inhalt eines Kästchens auf der Karte
export const SPEICHER_VERSION = 3;          // Spielstand-Format (3 = Echtzeit, 2 = Runden aus 0.1.1)

// ---- Spielstand anlegen ----
export function spielAnlegen(z, zufall = Math.random) {
  personenAnlegen(z); moebelAnlegen(z); finanzenAnlegen(z); besucherAnlegen(z, zufall); zeitAnlegen(z);
  ortAnlegen(z); seelsorgeAnlegen(z); ablaufAnlegen(z); einzugsgebietAnlegen(z); kaffeeAnlegen(z); festeAnlegen(z); dauerspenderAnlegen(z); beduerfnisseAnlegen(z); forschungAnlegen(z);
  jugendAnlegen(z);   // alte Spielstände: 20 % der Besucher und Passanten werden Jugendliche
  baukostenAnlegen(z);
  tuerkostenAnlegen(z);   // Türpreis (26.11.): schon gebaute Türen bleiben kostenlos
  skillsAnlegen(z);   // Skill-Fächer der Mitarbeiter (26.11.); zieht alte Spielstände um
  evangelisationAnlegen(z);   // Evangelisation vor dem Laden (26.11.)
  return z;
}
// Alte Spielstände (vor den Baukosten, 25.11.): einmalig der Startgeld-Ausgleich; ihre schon gebauten Wände bleiben kostenlos
// (sie werden in z.gratisWaende gemerkt – beim Abriss gibt es für sie kein Geld zurück).
function baukostenAnlegen(z) {
  if (z.baukosten) return;
  z.gratisWaende = [];
  z.zellen.forEach((t, i) => { if (istWandStueck(t)) z.gratisWaende.push(i); });
  buchen(z, 'einnahmen', 'ausgleich', STARTGELD_AUSGLEICH, { was: 'ausgleich' });
  z.baukosten = true;
}
// Spielstände vor dem Türpreis (26.11.): Türen, die schon stehen, haben nichts gekostet – sie werden in z.gratisTueren gemerkt,
// damit es für sie beim Abriss oder beim Zurückmachen zur Wand keinen Türpreis „zurück“ gibt.
function tuerkostenAnlegen(z) {
  if (z.tuerkosten) return;
  z.gratisTueren = [];
  z.zellen.forEach((t, i) => { if (t === TUER) z.gratisTueren.push(i); });
  z.tuerkosten = true;
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
  delete z.baukosten;   // ganz alter Spielstand: bekommt den Startgeld-Ausgleich
  delete z.tuerkosten;  // … und seine Türen bleiben kostenlos
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

const artName = id => (VERANSTALTUNGEN.find(v => v.id === id) || {}).name || null;
// Was gerade läuft bzw. was für die Veranstaltungen fehlt (als Code; den Text macht die Oberfläche)
// fehlt: 'raum' | 'veranstaltung' | 'leitung' | 'gitarre' | 'gesperrt' (Kanzel/Altar für Veranstaltung 2)
export function spielStatus(z, raeume) {
  const L = z.laeufe || [];
  const aktiv = L.filter(l => l.phase !== 'ende').sort((a, b) => a.beginn - b.beginn)[0];
  if (aktiv) return { phase: aktiv.phase, platz: aktiv.platz, art: aktiv.art, artName: artName(aktiv.art), heim: aktiv.gaeste && aktiv.phase !== 'anreise' ? aktiv.gaeste.filter(g => !g.sitz).length : 0 };
  // Kirchkaffee hat in einer eigenen Schicht geöffnet
  if (kirchkaffeeZustand(z, raeume).some(k => k.stationen.length && offenBei(z, k.raum))) return { phase: 'kaffeeOffen' };
  const zuletzt = L.filter(l => l.phase === 'ende').sort((a, b) => b.ende - a.ende)[0];
  if (zuletzt && zuletzt.ausgefallen) {
    const f = zuletzt.wegenFest && festAusSchluessel(zuletzt.wegenFest);   // fällt wegen eines Sonderevents aus
    return { phase: 'ausgefallen', grund: zuletzt.grund, platz: zuletzt.platz, fest: f ? f.fest.name : null, art: zuletzt.art, artName: artName(zuletzt.art) };
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

// Neueste Meldung: jemand neugierig am Tor, zu wenig Geld für den Kaffee-Einkauf, Konfirmand/Konfirmation
function neuesteMeldung(z) {
  const o = ortMeldung(z), oz = z.ort && z.ort.meldung ? z.ort.meldung.zeit : -Infinity;
  const liste = [o && { ...o, zeit: oz }, kaffeeMeldung(z), konfiMeldung(z)].filter(Boolean).sort((a, b) => b.zeit - a.zeit);
  if (!liste.length) return null;
  const m = { code: liste[0].code, name: liste[0].name };
  if (liste[0].ware) m.ware = liste[0].ware;   // Automat, der nicht aufgefüllt werden konnte (26.11.)
  return m;
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
  // Ab welcher Bekanntheit ein Möbel kaufbar ist (Parkplatz aus einzugsgebiet.js, Außendeko aus moebel.js), sonst null
  const abBekanntheit = typ => typ.id === 'parkplatz' ? PARKPLATZ.abBekanntheit : typ.abBekanntheit || null;
  // Vor dem Tor (unterste Reihe des Grundstücks im Tor) darf nichts stehen, um das man herumlaufen müsste – sonst kommt niemand herein
  const vorDemTor = (x, y) => y === GRUNDSTUECK.y + GRUNDSTUECK.h - 1 && x >= GRUNDSTUECK.tor.x && x < GRUNDSTUECK.tor.x + GRUNDSTUECK.tor.breite;

  // Bauen mit Rückgängig. Gemerkt wird nur das Gebaute (Wände, Räume, Möbel, wo Mitarbeiter stehen) und das Geld dafür –
  // die Zeit, die Besucher und das Kaffeegeld laufen beim Rückgängigmachen nicht zurück.
  const BAU = ['zellen', 'raumTyp', 'veranstaltung', 'moebel', 'personen', 'kaffeeZeiten', 'gratisWaende', 'gratisTueren'];
  function aendern(fn) {
    const vorher = JSON.stringify(BAU.map(k => z[k])), kontoVor = z.konto;
    const alteBuchungen = new Set(z.wochenbuch ? z.wochenbuch.buchungen : []);
    const ergebnis = fn();
    moebelPruefen(z); personenPruefen(z);
    // Gemerkt werden auch die Buchungen dieses Schritts, damit „Rückgängig“ sie wieder herausnimmt (finanzen.js → stornieren)
    const buchungen = (z.wochenbuch ? z.wochenbuch.buchungen : []).filter(b => !alteBuchungen.has(b));
    verlauf.push({ bau: vorher, geld: z.konto - kontoVor, buchungen, woche: z.buchWoche });
    if (verlauf.length > 60) verlauf.shift();
    raeume = raeumeAuswerten(z);
    return ergebnis;
  }

  function flaecheBauen(art, x0, y0, x1, y1) {
    const typ = MOEBEL.find(m => m.id === art);
    const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)], [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
    let gebaut = 0, geld = false;
    aendern(() => {
      for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
        if (moebelAuf(z, x, y) || raumNr(x, y) >= 0) continue;
        if (!kannBezahlen(z, typ.kosten)) { geld = true; continue; }
        if (kaufen(z, art, x, y) === 'ok') gebaut++;
      }
    });
    if (!gebaut) verlauf.pop();                              // nichts gebaut: kein leerer Rückgängig-Schritt
    return { gebaut, ergebnis: geld ? 'geld' : gebaut ? 'ok' : 'platz' };
  }

  const spiel = {
    // ---------- Befehle ----------
    // Tick-System: echte Sekunden seit dem letzten Bild → Spielzeit rückt vor. Im Editor und bei Pause steht die Zeit.
    tick(sekunden) {
      if (z.tempo <= 0 || bauModus || anfrageOffen(z) || festAnfrageOffen(z) || zeitungOffen(z)) return false;   // offene Seelsorge-Anfrage / Fest-Menü / Zeitung: Zeit steht
      const vorher = z.personen.length;
      zeitVorruecken(z, raeume, spielMinuten(Math.min(0.25, sekunden), z.tempo), zufall);
      if (z.personen.length !== vorher) raeume = raeumeAuswerten(z);   // neue Ehrenamtliche
      if (!z.laeufe.length) wegSpeicher.clear();
      return true;
    },
    // Zeitungsartikel vor dem ersten Gottesdienst weggeklickt: die Zeit läuft weiter
    zeitungWeiter() { return zeitungSchliessen(z); },
    tempoSetzen(t) { if (TEMPI.includes(t)) z.tempo = t; },
    bauModus(an) { bauModus = !!an; },
    zuruecksetzen() { z = neuesSpiel(zufall); raeume = raeumeAuswerten(z); verlauf.length = 0; wegSpeicher.clear(); },

    // Bauen: Wand-Rechteck (rückt an bestehende Wände heran) → 'ok' | 'konflikt' (Möbel im Weg) | 'geld' (Baukosten nicht bezahlbar)
    // Jedes neue Wandstück kostet BAUKOSTEN.wand (25.11.); schon stehende Wände kosten nichts.
    wandBauen(x0, y0, x1, y1) {
      [x0, y0, x1, y1] = wandAnpassen(z, x0, y0, x1, y1);
      if (wandKonflikte(z, x0, y0, x1, y1).length) return 'konflikt';
      const stuecke = neueWandStuecke(z, x0, y0, x1, y1), kosten = stuecke * BAUKOSTEN.wand;
      if (!kannBezahlen(z, kosten)) return 'geld';
      aendern(() => { bauen(z, x0, y0, x1, y1); if (kosten) buchen(z, 'ausgaben', 'bau', kosten, { was: 'wand', stuecke }); });
      return 'ok';
    },
    // Abriss: Möbel und Wände (inkl. Türen und Fenster) gibt es voll zurück – außer Wände, die in alten Spielständen nichts gekostet haben
    abreissen(x0, y0, x1, y1) {
      aendern(() => {
        const weg = abriss(z, x0, y0, x1, y1);
        const betrag = weg.waende * BAUKOSTEN.wand + weg.fenster * BAUKOSTEN.fenster + weg.tueren * BAUKOSTEN.tuer;
        if (betrag) buchen(z, 'einnahmen', 'rueckerstattung', betrag, { was: 'abriss', stuecke: weg.waende, fenster: weg.fenster, tueren: weg.tueren });
        moebelAbreissen(z, x0, y0, x1, y1);
      });
    },
    // Tür (26.11.): auf eine Wand setzen (kostet BAUKOSTEN.tuer) oder wieder zur Wand machen (Geld zurück,
    // außer bei Türen aus Spielständen vor dem Türpreis) → 'ok' | 'geld' | 'keine' (keine Wand bzw. Tür an der Stelle, z. B. ein Fenster)
    tuerUmschalten(x, y) {
      if (x < 0 || y < 0 || x >= z.w || y >= z.h) return 'keine';
      const i = idx(z, x, y), t = z.zellen[i];
      if (t !== WAND && t !== TUER) return 'keine';
      if (t === WAND && !kannBezahlen(z, BAUKOSTEN.tuer)) return 'geld';
      const e = aendern(() => {
        const r = tuerSchalten(z, x, y);
        if (r === 'gesetzt') buchen(z, 'ausgaben', 'bau', BAUKOSTEN.tuer, { was: 'tuer' });
        if (r === 'entfernt') {
          const gratis = z.gratisTueren ? z.gratisTueren.indexOf(i) : -1;
          if (gratis >= 0) z.gratisTueren.splice(gratis, 1);
          else buchen(z, 'einnahmen', 'rueckerstattung', BAUKOSTEN.tuer, { was: 'tuer' });
        }
        return r;
      });
      return e ? 'ok' : 'keine';
    },
    // Fenster (25.11.): auf eine Wand setzen (kostet BAUKOSTEN.fenster) oder wieder zur Wand machen (Geld zurück)
    // → 'ok' | 'geld' | 'keine' (keine Wand bzw. kein Fenster an der Stelle, z. B. eine Tür)
    fensterUmschalten(x, y) {
      if (x < 0 || y < 0 || x >= z.w || y >= z.h) return 'keine';
      const t = z.zellen[idx(z, x, y)];
      if (t !== WAND && t !== FENSTER) return 'keine';
      if (t === WAND && !kannBezahlen(z, BAUKOSTEN.fenster)) return 'geld';
      const e = aendern(() => {
        const r = fensterSchalten(z, x, y);
        if (r === 'gesetzt') buchen(z, 'ausgaben', 'bau', BAUKOSTEN.fenster, { was: 'fenster' });
        if (r === 'entfernt') buchen(z, 'einnahmen', 'rueckerstattung', BAUKOSTEN.fenster, { was: 'fenster' });
        return r;
      });
      return e ? 'ok' : 'keine';
    },
    // → 'ok' | 'geld' | 'platz' | 'belegt' | 'grenze' (z. B. schon eine Kanzel im Raum)
    //   | 'innen' (Straße/Parkplatz/Außendeko nur draußen) | 'bekanntheit' (Parkplatz, Laterne … erst ab Bekanntheit …)
    //   | 'tor' (Außendeko, um die man herumlaufen muss, nicht direkt im Tor)
    // dreh: Parkplatz längs statt quer
    moebelKaufen(art, x, y, dreh = false) {
      const typ = MOEBEL.find(m => m.id === art);
      if (!typ) return 'platz';
      const f = felderVon(art, x, y, dreh);
      if (f.some(c => moebelAuf(z, c.x, c.y))) return 'belegt';
      if (typ.aussen && f.some(c => raumNr(c.x, c.y) >= 0)) return 'innen';
      if (abBekanntheit(typ) && z.bekanntheit < abBekanntheit(typ)) return 'bekanntheit';
      if (istHindernis(art) && typ.aussen && f.some(c => vorDemTor(c.x, c.y))) return 'tor';
      if (grenzeErreicht(z, raeume.liste[raumNr(x, y)], art)) return 'grenze';
      if (!kannBezahlen(z, typ.kosten)) return 'geld';
      return aendern(() => kaufen(z, art, x, y, istHindernis(art) ? personAuf : () => false, dreh));   // auf Straße/Parkplatz/Weg darf jemand stehen
    },
    // Straße oder Weg als Rechteck ziehen: jedes freie Kästchen draußen bekommt ein Stück, solange das Geld reicht.
    // → { gebaut, ergebnis: 'ok' | 'geld' (nicht alles bezahlbar) | 'platz' (nichts frei) }
    strasseBauen(x0, y0, x1, y1) { return flaecheBauen('strasse', x0, y0, x1, y1); },
    wegBauen(x0, y0, x1, y1) { return flaecheBauen('weg', x0, y0, x1, y1); },
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
      if (!r || !moeglicheVeranstaltungen(r.typ).length || !plaetzeVon(r.typ)[platz]) return 'keine';
      if (id && !moeglicheVeranstaltungen(r.typ).some(v => v.id === id)) return 'keine';
      const e = programmVon(z, r)[platz];
      if (!e.art && id && platzSperre(z, r, platz)) return 'gesperrt';
      aendern(() => veranstaltungEinstellen(z, r, id || null, platz));
      return 'ok';
    },
    // Zeit einer Veranstaltung → 'ok' | 'belegt' (im Raum ist dann schon eine) | 'zeit' | 'keine'
    terminSetzen(nr, platz, tag, slot) {
      const r = raeume.liste[nr];
      if (!r || !moeglicheVeranstaltungen(r.typ).length || !plaetzeVon(r.typ)[platz]) return 'keine';
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
    // Schaukasten: für eine regelmäßige Veranstaltung werben (raumNummer + platz) oder Aushang abnehmen (raumNummer = null).
    // Kostenlos. → 'ok' | 'keine' (kein Schaukasten oder dort keine Veranstaltung eingestellt)
    aushangSetzen(x, y, nr, platz = 0) {
      const m = moebelAuf(z, x, y);
      if (nr === null) return aushangSetzen(z, m, null);
      const r = raeume.liste[nr];
      if (!r) return 'keine';
      return aushangSetzen(z, m, Math.min(...r.zellen), platz);
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
      const [zellen, raumTyp, veranstaltung, moebel, personen, kaffeeZeiten, gratisWaende, gratisTueren] = JSON.parse(e.bau);
      for (const m of moebel) { const jetzt = moebelAuf(z, m.x, m.y); if (jetzt && jetzt.art === m.art && 'fuellung' in jetzt) m.fuellung = jetzt.fuellung; }
      Object.assign(z, { zellen, raumTyp, veranstaltung, moebel, kaffeeZeiten: kaffeeZeiten || {} });
      if (gratisWaende) z.gratisWaende = gratisWaende; else delete z.gratisWaende;
      if (gratisTueren) z.gratisTueren = gratisTueren; else delete z.gratisTueren;
      for (const p of z.personen) { const alt = personen.find(a => a.id === p.id); if (alt) { p.x = alt.x; p.y = alt.y; } }
      stornieren(z, e.buchungen, e.woche);   // Buchungen des Schritts zurücknehmen (dieselbe Woche: ganz weg, sonst Gegenbuchung)
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
    // Forschungsbaum: starten → 'ok' | 'keine' | 'erforscht' | 'laeuft' | 'gesperrt' | 'besetzt' | 'geld' | 'heiligkeit'
    forschungStarten(id) { return forschungStarten(z, id); },
    // Laufende Forschung abbrechen (Geld und Heiligkeit sind weg) → 'ok' | 'keine'
    forschungAbbrechen() { return forschungAbbrechen(z); },
    // Haltungs-Multiplikator (Skill des Hauptamtlichen): nächste Stufe sofort mit Heiligkeit kaufen
    // → 'ok' | 'person' | 'max' | 'erfahrung' | 'heiligkeit'
    multiplikatorKaufen(personId) { return multiplikatorKaufen(z, personId); },
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
        moebel: z.moebel.map(m => ({ art: m.art, x: m.x, y: m.y, fuellung: m.fuellung, anteil: m.art === 'kaffeemaschine' ? (m.fuellung || 0) / fassung(m.art) : istAutomat(m.art) ? (m.fuellung || 0) / lagerVon(m) : null,
          automat: istAutomat(m.art),   // Automaten (26.11.): Füllstand-Streifen wie bei der Kaffeemaschine
          stufe: m.art === 'stuhl' ? stuhlStufe(m).stufe : null, dreh: !!m.dreh, felder: felder(m),
          // Straße/Parkplatz: führt es bis zum Tor? (sonst zählt der Parkplatz nicht)
          angeschlossen: m.art === 'strasse' || m.art === 'parkplatz' ? park.angeschlossen.has(`${m.x},${m.y}`) : null,
          aushang: m.art === 'schaukasten' ? aushangGilt(z, m.aushang) : null })),   // Schaukasten: hängt ein Aushang?
        plakat: !!z.plakat,
        evangelisation: { ...EVANGELISATION.feld },   // das Feld „Evangelisation!“ vor dem Laden
        bus: { stufe: z.bus || 0, ...BUSHALTESTELLE_ORT },
        personen: (() => { const mg = musikerGaenge(z, raeume, wegSpeicher); return z.personen.map(p => {
          const d = daten(p); if (!d) return null;
          // Im Kirchkaffee beschäftigt → dort; Pastor im Seelsorge-Gespräch → an seinem Platz; sonst ein wenig umherlaufen
          const nr = typeof p.x === 'number' ? raeume.gruppe[idx(z, p.x, p.y)] : -1;
          // Unterwegs zur Evangelisation vor dem Laden → dort
          // Musiker auf dem Weg zum Instrument, dort beim Spielen oder auf dem Rückweg (26.11., musiker.js)
          const pos = kaffeeMitarbeiterPosition(z, p) || evangelisationPosition(z, p) || musikerPosition(mg, p, z.minuten)
            || (hatSkill(p, 'seelsorge') && z.seelsorge && z.seelsorge.gang ? p : umherPosition(z, nr >= 0 ? raeume.liste[nr] : null, p));
          return { id: p.id, name: d.name, kuerzel: d.kuerzel, art: d.art, x: pos.x, y: pos.y, feldX: p.x, feldY: p.y };
        }).filter(Boolean); })(),
        // Gottesdienst-Besucher, Passanten (ohne den, der gerade zum Pastor geht) und wer zur Seelsorge läuft
        // jugend: Jugendliche werden in einem anderen Farbton gezeichnet
        besucher: [...besucherPositionen(z, wegSpeicher), ...passantenPositionen(z).filter(b => b.id !== seelsorgeUnterwegs(z)), ...seelsorgePositionen(z),
          ...kaffeeKundenPositionen(z)].map(b => ({ ...b, jugend: istJugend(mensch(z, b.id)) })),
        laden: kaffeeLaden(z),     // Kaffeemaschinen, die gerade laden (Fortschritt 0–1)
        zahlen: kaffeeZahlen(z)    // „+1 €“ über Kunden, „−x €“ über dem Ehrenamtlichen nach dem Einkauf (nr: zum Wiedererkennen)
      };
    },
    // Anzeigen oben und in der Seitenleiste
    lage() {
      const zp = zeitpunkt(z.minuten), lg = z.letzterGottesdienst;
      const personen = z.personen.map(p => { const d = daten(p), r = eingesetztIn(z, raeume, p); return d && { id: p.id, art: d.art, name: d.name, einsatz: r ? r.typ.name : null }; }).filter(Boolean);
      return {
        woche: zp.woche + 1, tag: zp.tag, datum: tagAnzeige(Math.floor(z.minuten / TAG_MIN)).datum, stunde: zp.stunde, minute: zp.minute, tageBisSonntag: tageBisSonntag(z.minuten),
        naechstesEvent: naechstesEvent(z, raeume),   // läuft gerade eins / das nächste mit Minuten bis Beginn / null
        sonntag: sonntagDerWoche(zp.woche), kirchenjahr: kirchenjahrStand(zp.woche),
        tempo: z.tempo, konto: z.konto, bekanntheit: z.bekanntheit, heiligkeit: z.heiligkeit, heiligkeitProBesucher: HEILIGKEIT.proBesucher,
        finanzen: finanzPrognose(z, raeume),
        letzterGottesdienst: lg ? { besucher: lg.besucher, heim: lg.heim, ausgefallen: lg.ausgefallen } : null,
        bekannteBesucher: z.besucher.length,
        verfuegbarkeit: verfuegbarkeit(z, raeume), personen,
        ehrenamtFrei: freieEhrenamtliche(z, raeume),   // Ehrenamtliche, die gerade frei haben (ohne Dienst/Schicht) – live

        status: spielStatus(z, raeume),
        beschaeftigt: z.laeufe.some(L => L.phase !== 'ende') || anfrageOffen(z) || z.kaffee.kunden.length > 0,
        seelsorge: seelsorgeLage(z),   // offene Seelsorge-Anfrage mit Status der Person (sonst null)
        festAnfrage: z.feste ? z.feste.anfrage : null,   // Fest-Menü steht an (Schlüssel des Fests; Zeit steht, bis beantwortet)
        zeitung: zeitungOffen(z),   // Zeitungsartikel vor dem ersten Gottesdienst ist offen (Zeit steht, bis weitergeklickt)
        meldung: neuesteMeldung(z)   // z. B. jemand ist neugierig am Tor stehen geblieben, zu wenig Geld für den Kaffee-Einkauf
      };
    },
    // Forschungs-Fenster: Heiligkeit, Kontostand und alle Forschungen mit Zustand, Kosten, Dauer (echte Sekunden bei x1) und Fortschritt
    forschungInfo() { return { heiligkeit: z.heiligkeit, konto: z.konto, forschungen: forschungListe(z) }; },
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
          neugier: neugierChance(z, false, raeume.gruppe), neugierPlakat: neugierChance(z, true, raeume.gruppe), neugierGrund: NEUGIER.grund, proBekanntheit: NEUGIER.proBekanntheit,
          plakatFaktor: PLAKAT.faktor, plakat: !!z.plakat, teile: neugierTeile(z, raeume.gruppe) }
      };
    },
    // Fenster „Kirchenjahr“: aktuelle Zeit, heute (Fest/Feiertag), kommende Feste mit Faktoren und Plänen, alle Zeiten
    kirchenjahrInfo() {
      const heute = Math.floor(z.minuten / TAG_MIN), zp = zeitpunkt(z.minuten), stand = kirchenjahrStand(zp.woche);
      const fh = festAmTag(heute), plaene = z.feste ? z.feste.plaene : {};
      return {
        zeit: zeitAmTag(heute), fortschritt: stand.fortschritt, sonntag: sonntagDerWoche(zp.woche),
        heute: { fest: fh && festAktiv(z, fh) ? fh.name : null, feiertag: feiertagAmTag(heute), faktor: faktorAmTag(heute, f => festAktiv(z, f)) },
        zeiten: ZEITEN.map(t => ({ id: t.id, name: t.name, farbe: t.farbe, besucher: (ZEIT_FAKTOREN[t.id] || {}).besucher || 1,
          kollekte: (ZEIT_FAKTOREN[t.id] || {}).kollekte || 1, aktuell: t.id === zeitAmTag(heute) })),
        feste: kommendeFeste(heute, 8).map(f => {
          const k = festSchluessel(f.id, f.tagNr), plan = plaene[k], a = tagAnzeige(f.tagNr);
          const nr = plan ? raeume.gruppe[plan.raum] : undefined, lp = plan && z.personen.find(p => p.id === plan.leitung);
          // Konfirmation: Zahl der Konfirmanden. Ob sie ausfällt, steht erst nach der Prüfung beim Fest-Menü fest (7 Tage vorher) –
          // vorher kann noch jemand seine 7 Teilnahmen schaffen (faelltAus erst dann; geplant werden kann sie nur mit Konfirmanden).
          const fest = FESTE.find(x => x.id === f.id), konfi = fest.braucht === 'konfirmanden';
          const geprueft = !!(z.feste && z.feste.gefragt.includes(k)), aktiv = festAktiv(z, fest);
          return { ...f, schluessel: k, tageBis: f.tagNr - heute, wochentag: a.wochentag, datum: a.datum,
            konfirmanden: konfi ? konfirmandenZahl(z) : null, faelltAus: !aktiv && geprueft, planbar: aktiv,
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
      const orte = raeume.liste.filter(r => r.typ && r.typ.id === 'gottesdienst' && !r.probleme.length);   // Feste nur im Gottesdienstraum
      const leute = art => z.personen.map(p => ({ p, d: daten(p) })).filter(x => x.d && x.d.art === art).map(x => ({ id: x.p.id, name: x.d.name }));
      const haupt = leute('hauptamt'), arten = VERANSTALTUNGEN.filter(v => v.raumtypen.includes('gottesdienst') && v.fest !== false).map(v => ({ id: v.id, name: v.name }));
      const planNr = plan ? raeume.gruppe[plan.raum] : undefined;
      const auswahl = plan ? { slot: plan.slot, raumNr: planNr >= 0 ? planNr : (orte[0] ? orte[0].nr : null), leitung: plan.leitung, art: plan.art, ehrenamt: [...plan.ehrenamt] }
        : { slot: f.fest.slot || 'vormittag', raumNr: orte[0] ? orte[0].nr : null, leitung: haupt[0] ? haupt[0].id : null, art: arten[0] ? arten[0].id : null, ehrenamt: [] };
      // Welche normalen Termine fallen mit dem gespeicherten Plan aus?
      const woche = Math.floor(f.tagNr / 7);
      const faellt = plan ? termineDerWoche(z, raeume, woche).filter(t => !t.fest && t.art && verdraengtVon(z, raeume, t) === schluessel)
        .map(t => { const nr = raeume.gruppe[t.raum]; return { platz: t.platz, raumName: raeume.liste[nr] && raeume.liste[nr].typ ? raeume.liste[nr].typ.name : null }; }) : [];
      return { schluessel, id: f.fest.id, name: f.fest.name, besucher: f.fest.besucher, kollekte: f.fest.kollekte,
        konfirmanden: f.fest.braucht === 'konfirmanden' ? konfirmandenZahl(z) : null,
        wochentag: a.wochentag, datum: a.datum, tageBis: f.tagNr - heute, offen: !!(z.feste && z.feste.anfrage === schluessel), geplant: !!plan,
        auswahl, raeume: orte.map(r => ({ nr: r.nr, name: r.typ.name })), hauptamtliche: haupt, ehrenamtliche: leute('ehrenamt'), arten,
        slots: SLOTS.map(x => ({ ...x })), faellt };
    },
    festOffen() { return festAnfrageOffen(z); },
    zelle(x, y) { const t = x >= 0 && y >= 0 && x < z.w && y < z.h ? z.zellen[idx(z, x, y)] : null; return t === WAND ? 'wand' : t === TUER ? 'tuer' : t === FENSTER ? 'fenster' : t === LEER ? 'leer' : null; },
    raumNrBei: raumNr,
    foyerBei(x, y) { const nr = raumNr(x, y), r = raeume.liste[nr]; return r && r.typ && r.typ.id === 'foyer' ? nr : null; },
    // Baukosten für die Bauleiste und die Vorschau (25.11.)
    baukosten() { return { wand: BAUKOSTEN.wand, tuer: BAUKOSTEN.tuer, fenster: BAUKOSTEN.fenster, konto: z.konto,
      wandLeistbar: kannBezahlen(z, BAUKOSTEN.wand), tuerLeistbar: kannBezahlen(z, BAUKOSTEN.tuer), fensterLeistbar: kannBezahlen(z, BAUKOSTEN.fenster) }; },
    // Foyer-Fenster in der Spielansicht: was das Foyer jedem bringt, der hindurchläuft
    foyerInfo(nr) {
      const r = raeume.liste[nr];
      if (!r || !r.typ || r.typ.id !== 'foyer') return null;
      const w = foyerWert(z, raeume, r);
      return { nr, typName: r.typ.name, fertig: !r.probleme.length, probleme: [...r.probleme], haltung: w.haltung,
        begruessung: { da: w.begruessung, haltung: FOYER.begruessung }, teile: w.teile.map(t => ({ ...t })),
        imRaum: z.personen.filter(p => raeume.gruppe[idx(z, p.x, p.y)] === nr && daten(p)).map(p => ({ name: daten(p).name, art: daten(p).art })) };
    },
    kirchkaffeeBei(x, y) { const nr = raumNr(x, y), r = raeume.liste[nr]; return r && r.typ && r.typ.id === 'kirchkaffee' ? nr : null; },
    veranstaltungsraumBei(x, y) { const nr = raumNr(x, y), r = raeume.liste[nr]; return r && moeglicheVeranstaltungen(r.typ).length ? nr : null; },
    moebelBei(x, y) { const m = moebelAuf(z, x, y); return m ? { art: m.art, x: m.x, y: m.y, dreh: !!m.dreh } : null; },
    moebelArten() {
      return MOEBEL.map(m => ({ id: m.id, name: m.name, kosten: m.kosten, max: m.max || null, leistbar: kannBezahlen(z, m.kosten),
        kategorie: m.kategorie || null, auchIn: m.auchIn ? [...m.auchIn] : [], groesse: m.groesse ? [...m.groesse] : null, aussen: !!m.aussen,
        drehbar: !!(m.groesse && m.groesse[0] !== m.groesse[1]), gelaende: m.gelaende || null,
        abBekanntheit: abBekanntheit(m), gesperrt: !!abBekanntheit(m) && z.bekanntheit < abBekanntheit(m) }));
    },
    // Welche Kästchen würde dieses Möbel hier belegen, und ginge das? (Vorschau beim Bauen)
    moebelVorschau(art, x, y, dreh = false) {
      const typ = MOEBEL.find(m => m.id === art);
      if (!typ) return null;
      const f = felderVon(art, x, y, dreh);
      const hin = istHindernis(art);
      const geht = f.every(c => c.x >= 0 && c.y >= 0 && c.x < z.w && c.y < z.h && z.zellen[idx(z, c.x, c.y)] === LEER && !moebelAuf(z, c.x, c.y) && (!hin || !personAuf(c.x, c.y))
        && (!typ.aussen || raumNr(c.x, c.y) < 0) && !(hin && typ.aussen && vorDemTor(c.x, c.y))) && f.every(c => c.x >= GRUNDSTUECK.x && c.y >= GRUNDSTUECK.y && c.x < GRUNDSTUECK.x + GRUNDSTUECK.w && c.y < GRUNDSTUECK.y + GRUNDSTUECK.h);
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
    // Liegt dieses Kästchen auf dem Feld „Evangelisation!“? Dort öffnet sich sein Menü.
    evangelisationBei(x, y) { const f = EVANGELISATION.feld; return x === f.x && y === f.y; },
    // Menü der Evangelisation: wer vor Ort ist, Plätze, Chance pro Passant (Prozent)
    evangelisationInfo() { return evangelisationInfo(z, raeume); },
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
    // Bekanntheit-Fenster, Abschnitt „Gelände“: Wert, Teile, Wirkung auf die Neugier, was in den Schaukästen hängt
    gelaendeInfo() {
      const g = gelaende(z, raeume.gruppe);
      const name = (nr, platz) => { const r = raeume.liste[nr], e = r ? programmVon(z, r)[platz] : null;
        return { raumName: r && r.typ ? r.typ.name : null, art: e ? e.art : null, artName: e ? (VERANSTALTUNGEN.find(v => v.id === e.art) || {}).name || null : null, tag: e ? e.tag : null, slot: e ? e.slot : null }; };
      return { ...g, teile: g.teile.map(t => ({ ...t })), proPunkt: GELAENDE.neugierProPunkt, schaukastenNeugier: SCHAUKASTEN.neugier,
        schaukaesten: z.moebel.filter(m => m.art === 'schaukasten').length,
        aushaenge: aushaenge(z, raeume.gruppe).map(a => ({ platz: a.platz, ...name(a.raumNr, a.platz) })), slots: SLOTS.map(s => ({ ...s })) };
    },
    // Menü eines Schaukastens: aktueller Aushang und welche regelmäßigen Veranstaltungen man wählen kann
    schaukastenInfo(x, y) {
      const m = moebelAuf(z, x, y);
      if (!m || m.art !== 'schaukasten') return null;
      const gilt = aushangGilt(z, m.aushang), nrJetzt = gilt ? raeume.gruppe[m.aushang.zelle] : null;
      const auswahl = [];
      for (const r of raeume.liste.filter(r => r.typ && moeglicheVeranstaltungen(r.typ).length)) programmVon(z, r).forEach((e, platz) => {
        if (!e.art) return;
        auswahl.push({ raumNr: r.nr, raumName: r.typ.name, platz, art: e.art, artName: (VERANSTALTUNGEN.find(v => v.id === e.art) || {}).name, tag: e.tag, slot: e.slot,
          aktiv: gilt && nrJetzt === r.nr && m.aushang.platz === platz });
      });
      return { x: m.x, y: m.y, aushang: gilt, neugier: SCHAUKASTEN.neugier, auswahl, slots: SLOTS.map(s => ({ ...s })) };
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
      const stuecke = neueWandStuecke(z, x0, y0, x1, y1), kosten = stuecke * BAUKOSTEN.wand;   // Baukosten (25.11.)
      return { x0, y0, x1, y1, konflikte: wandKonflikte(z, x0, y0, x1, y1), stuecke, kosten, leistbar: kannBezahlen(z, kosten) };
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
      const eaImRaum = info ? info.imRaum.filter(p => daten(p).art === 'ehrenamt' && eingesetztIn(z, raeume, p) === r) : [];
      // Raum mit Problemen (z. B. ohne Tür): Veranstaltungen sind eingestellt, können aber nicht stattfinden
      const programm = info ? info.programm : programmVon(z, r).map((e, i) => ({ platz: i, art: e.art, tag: e.tag, slot: e.slot,
        frei: !platzSperre(z, r, i), sperre: platzSperre(z, r, i), fehlt: e.art ? 'raum' : 'keine', bereit: false }));
      return {
        nr, typName: r.typ.name, typId: r.typ.id,
        moeglich: moeglicheVeranstaltungen(r.typ).map(x => ({ id: x.id, name: x.name, slots: x.slots ? [...x.slots] : null })),
        bedingungen: { leitung: !!(info && info.hauptamt.length), gitarre: hat('gitarre'), instrument: instrumenteImRaum(z, r) > 0,
          // Gemeindesaal: Ehrenamtlicher im Raum, Ehrenamtlicher mit Musik-Level ab 1, Tisch, mind. 2 Stühle, Klavier
          ehrenamt: eaImRaum.length > 0, musikLevel: eaImRaum.some(p => musikLevel(p) >= 1), tisch: hat('tisch'), klavier: hat('klavier'),
          stuehle: moebelImRaum(z, r, 'stuhl').length >= 2 },
        // Was die Möbel im Raum bringen (Kanzel, Altar, Blumen, Grünpflanzen, Instrumente) und ob Musik gemacht wird
        ausstattung: a ? { teile: a.teile, instrument: a.instrument, musik: a.musik, musiker: a.musiker, musikBonus: a.musikBonus } : null,
        slots: SLOTS.map(s => ({ ...s })),
        // Veranstaltung 1, 2: Art, Zeit, ob der Platz frei ist, was fehlt, Prognose. nutzbar: lässt sich einstellen.
        // sperre: null | 'moebel' (Kanzel/Altar fehlen) | 'forschung' (3. Veranstaltung noch nicht erforscht); forschung: deren Name
        programm: programm.map(p => ({ platz: p.platz, art: p.art, tag: p.tag, slot: p.slot, frei: p.frei, fehlt: p.fehlt, bereit: p.bereit,
          sperre: p.sperre || null, forschung: p.sperre === 'forschung' ? forschungName(plaetzeVon(r.typ)[p.platz].forschung) : null,
          nutzbar: p.frei || !!p.art,
          prognose: p.platz === 0 || p.art ? { ...prognose(z, raeume, nr, p.platz), dieseWoche: terminDieseWoche(z, raeume, r, p.platz) } : null })),
        imRaum: (info ? info.imRaum : []).map(p => { const d = daten(p); return { name: d.name, art: d.art, musiker: musiker.has(p), musikLevel: d.art === 'ehrenamt' ? musikLevel(p) : null }; }),
        // Bausteintabelle (25.11.): pro Eventtyp die Bausteine mit „im Raum“ und Regelwerten, dazu „Zusammen“
        bausteine: bausteineVon(z, r, info, moeglicheVeranstaltungen(r.typ).map(x => x.id))
      };
    },
    // Gemeindekalender (Lukas, 26.11.): Wochenüberblick über alle Veranstaltungen in allen Räumen, Feste aus dem Kirchenjahr
    // und die Öffnungszeiten des Kirchkaffees. versatz: 0 = diese Woche, 1 = nächste Woche.
    // termine[].zustand: 'geplant' | 'faelltAus' | 'laeuft' | 'vorbei' | 'ausgefallen'; fehlt: Code wie im Raum-Fenster
    kalenderInfo(versatz = 0) {
      const woche = zeitpunkt(z.minuten).woche + (versatz === 1 ? 1 : 0), heute = Math.floor(z.minuten / TAG_MIN);
      // Raum-Namen: gibt es einen Raumtyp mehrmals, bekommt er eine Nummer („Gemeindesaal 2“)
      const schluessel = r => Math.min(...r.zellen), nr = new Map(), zaehler = {};
      for (const r of raeume.liste.filter(r => r.typ)) { zaehler[r.typ.id] = (zaehler[r.typ.id] || 0) + 1; nr.set(schluessel(r), zaehler[r.typ.id]); }
      const raumName = r => r ? { name: r.typ.name, nummer: zaehler[r.typ.id] > 1 ? nr.get(schluessel(r)) : null } : { name: null, nummer: null };
      const raumAus = k => { const i = raeume.gruppe[k]; return i === undefined || i < 0 ? null : raeume.liste[i] || null; };
      const tage = Array.from({ length: 7 }, (_, tag) => {
        const tagNr = woche * 7 + tag, f = festAmTag(tagNr), a = tagAnzeige(tagNr);
        return { tag, datum: a.datum, heute: tagNr === heute, fest: f && festAktiv(z, f) ? f.name : null, feiertag: feiertagAmTag(tagNr) };
      });
      const termine = termineDerWoche(z, raeume, woche).filter(t => t.raum !== null).map(t => {
        const st = terminStand(z, raeume, t), r = raumAus(t.raum);
        const festName = t.fest ? (festAusSchluessel(t.fest) || { fest: {} }).fest.name || null : null;
        return { tag: t.plan.tag, slot: t.plan.slot, platz: t.platz, art: t.art, artName: artName(t.art), festName, ...raumName(r), ...st };
      });
      const kaffee = raeume.liste.filter(r => r.typ && r.typ.id === 'kirchkaffee')
        .flatMap(r => schichtenVon(z, r).map(s => ({ tag: s.tag, slot: s.slot, ende: SCHICHT_ENDE[s.slot], ...raumName(r) })));
      return { versatz: versatz === 1 ? 1 : 0, woche: woche + 1, tage, termine, kaffee, slots: SLOTS.map(s => ({ ...s })) };
    },
    // Menü der Kaffeemaschine (nachgefüllt wird vom Ehrenamtlichen im Laden)
    maschineInfo(x, y) {
      const m = moebelAuf(z, x, y);
      if (!m || m.art !== 'kaffeemaschine') return null;
      const r = raeume.liste[raumNr(x, y)];
      return { fuellung: m.fuellung || 0, fassung: fassung(m.art), imKirchkaffee: !!(r && r.typ && r.typ.id === 'kirchkaffee'), einkaufPreis: EINKAUF.preisTasse };
    },
    // Menü eines Automaten (26.11.): Füllstand, Lager, Preise; aufgefüllt wird vom Kirchkaffee-Ehrenamtlichen
    automatInfo(x, y) {
      const m = moebelAuf(z, x, y);
      if (!m || !istAutomat(m.art)) return null;
      return automatInfo(z, raeume, m, raeume.liste[raumNr(x, y)]);
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
      return { id: b.id, voll: b.voll, besuche: b.besuche, zufriedenheit: b.zufriedenheit, level: levelVon(b), levelMax: HALTUNGSLEVEL.max,
        wochenBeduerfnisse: besucher ? wochenBeduerfnisse(z, b) : null, status: statusVon(z, b), lobpreis: lobpreisVorliebe(b),
        kaffee: kaffeeVorliebe(b), jugend: istJugend(b), konfi: istJugend(b) ? konfiStand(z, b) : null,
        beduerfnisse: besucher ? beduerfnisse(z, b) : null, toilette: toiletteAktuell(z, b.id) };
    },
    seelsorgeOffen() { return anfrageOffen(z); },
    // Fenster „Menschen im Ort“: alle, die die Gemeinde kennt
    menschen() {
      const zeile = b => ({ id: b.id, art: 'besucher', voll: b.voll, haltung: b.zufriedenheit, level: levelVon(b), besuche: b.besuche,
        zuletzt: typeof b.zuletzt === 'number' ? b.zuletzt + 1 : null, kaffee: b.besuche || b.stamm ? kaffeeVorliebe(b) : null, status: statusVon(z, b),
        jugend: istJugend(b), konfirmand: !!b.konfirmand });
      const ea = z.personen.map(p => ({ p, d: daten(p) })).filter(x => x.d && x.d.art === 'ehrenamt').map(({ p, d }) => {
        const h = d.herkunft || {};
        return { id: p.id, art: 'person', voll: d.name, haltung: h.zufriedenheit ?? null, level: h.level ?? null, besuche: h.besuche ?? null,
          zuletzt: typeof h.zuletzt === 'number' ? h.zuletzt + 1 : null, kaffee: typeof h.kaffee === 'number' ? h.kaffee : null, status: 'ehrenamtlich', jugend: !!h.jugend, konfirmand: false };
      });
      return [...z.besucher.map(zeile), ...ea, ...z.ort.leute.map(zeile)];
    },
    // Gesammelte Statistiken je Gruppe (Status) für dasselbe Fenster
    menschenStatistik() { return menschenStatistik(spiel.menschen(), zeitpunkt(z.minuten).woche + 1); },
    // Charakter-Karte eines Mitarbeiters
    personInfo(id) {
      const p = z.personen.find(x => x.id === id), d = p && daten(p);
      if (!d) return null;
      const r = eingesetztIn(z, raeume, p);
      return { id, name: d.name, art: d.art, einsatz: r ? r.typ.name : null, seelsorge: hatSkill(p, 'seelsorge') ? stufeInfo(z) : null,
        musik: d.art === 'ehrenamt' ? musikStand(p) : null, evangelisation: d.art === 'ehrenamt' ? evangelisationStand(p) : null, multiplikator: multiplikatorInfo(z, p), heiligkeit: Math.floor(z.heiligkeit || 0) };
    }
  };
  // Abfragen liefern Kopien – die Oberfläche kann den Spielstand nicht aus Versehen verändern.
  for (const name of ['lage', 'kalenderInfo', 'kirchenjahrInfo', 'festMenueInfo', 'raumtypWahl', 'raumInfo', 'kaffeeRaumInfo', 'maschineInfo', 'automatInfo', 'besucherInfo', 'personInfo', 'evangelisationInfo', 'moebelArten', 'menschen', 'menschenStatistik', 'torInfo', 'stuhlInfo', 'einzugsgebietInfo', 'moebelVorschau']) {
    const f = spiel[name]; spiel[name] = (...a) => { const e = f(...a); return e == null ? e : kopie(e); };
  }
  return Object.freeze(spiel);
}
