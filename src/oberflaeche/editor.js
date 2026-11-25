// Bedienung: Spielansicht (Management) und Editor. Nimmt Eingaben entgegen und ruft die Spiellogik auf.
// Die Uhr läuft in Echtzeit: Mehrmals pro Sekunde rückt die Spielzeit vor, die Spiellogik entscheidet,
// was passiert (Anreise, Gottesdienst, Kirchkaffee), und hier wird nur gezeigt und gezeichnet.
import { RAUMTYPEN } from '../inhalte/raumtypen.js';
import { GRUNDSTUECK, GEHWEGE } from '../inhalte/umgebung.js';
import { MOEBEL } from '../inhalte/moebel.js';
import { KEINE_VERANSTALTUNG } from '../inhalte/veranstaltungen.js';
import { TEMPI, SLOTS, DAUER, LAUFTEMPO, ABSTAND } from '../inhalte/zeit.js';
import { NACHKAUFEN } from '../inhalte/kirchkaffee.js';
import { TEXTE } from '../inhalte/texte.js';
import { wandRechteck, abriss, tuerUmschalten, erkenneRaeume, pruefeRaum, raumTypVon, typZuweisen, idx } from '../kern/karte.js';
import { personenPruefen, versetzen, verfuegbarkeit, daten, eingesetztIn } from '../kern/personen.js';
import { moebelPruefen, moebelBei, moebelKaufen, moebelAbreissen, kaffeeNachkaufen, fassung } from '../kern/moebel.js';
import { kannBezahlen, buchen } from '../kern/finanzen.js';
import { neuesSpiel, spielAnlegen, ausRundenSpielstand } from '../kern/spiel.js';
import { zeitVorruecken, gottesdienstRaeume, kirchkaffeeZustand, moeglicheVeranstaltungen, veranstaltungVon,
  veranstaltungEinstellen, prognose, finanzPrognose, terminDieseWoche } from '../kern/ablauf.js';
import { zeitpunkt, uhrzeit, tageBisSonntag, spielMinuten } from '../kern/zeit.js';
import { sonntagDerWoche, kirchenjahrStand } from '../kern/kalender.js';
import { weg, glaetten } from '../kern/wege.js';
import { wandBauen, wandKonflikte, wandAnpassen } from '../kern/bauen.js';
import { zeichne } from '../ansicht/zeichnen.js';
import { aktualisierungStarten } from './aktualisieren.js';

const SPEICHER = 'churchsim-editor';
const VERSION = 3;   // Spielstand-Format (3 = Echtzeit). Ältere Spielstände (2 = Runden) werden übernommen.
const HINWEISE = {
  wand: 'Zieh ein Rechteck, um Wände zu bauen.',
  tuer: 'Tippe auf eine Wand, um eine Tür zu setzen oder zu entfernen.',
  stuhl: 'Tippe um einen Stuhl aufzustellen',
  ...TEXTE.hinweise,
  abriss: 'Zieh über den Bereich, der abgerissen werden soll.',
  raum: 'Tippe in einen Raum, um seine Funktion festzulegen.'
};
const MOEBEL_WERKZEUGE = MOEBEL.map(m => m.id);

let z = laden() || neuesSpiel();
let raeume = auswerten();
let werkzeug = 'wand', ziehen = null, editorOffen = false, tragen = null;
let fenster = null;            // geöffnetes Fenster: { art: 'raumtyp'|'raum'|'maschine'|'besucher'|'person', … }
let stuhlStart = null, schwebe = null, klickStart = null, maus = null;
const verlauf = [];

const $ = id => document.getElementById(id);
const euro = n => `${n.toLocaleString('de-DE')} €`;
const zahl1 = n => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const leinwand = $('karte'), ctx = leinwand.getContext('2d'), flaeche = $('flaeche');
const maske = $('maske');
let ansicht = { k: 16, ox: 0, oy: 0 };

function auswerten() {
  const { raeume: liste, gruppe } = erkenneRaeume(z);
  for (const r of liste) {
    r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ);
    const v = veranstaltungVon(z, r);
    r.veranstaltungText = moeglicheVeranstaltungen(r.typ).length ? (v ? v.name : 'Keine Veranstaltung') : null;
    r.veranstaltungFehlt = !!r.veranstaltungText && !v;   // Warnsymbol auf der Karte
  }
  kirchkaffeeBeschriften({ liste, gruppe });
  return { liste, gruppe };
}
// Kirchkaffee: geöffnet oder warum geschlossen – unter dem Raumnamen
function kirchkaffeeBeschriften(r) {
  for (const k of kirchkaffeeZustand(z, r)) k.raum.veranstaltungText = k.stationen.length ? TEXTE.kirchkaffee.offen : TEXTE.kirchkaffee[k.fehlt];
}
function speichern() {
  try { localStorage.setItem(SPEICHER, JSON.stringify({ version: VERSION, zustand: z })); } catch (e) {}
}
function laden() {
  try {
    const d = JSON.parse(localStorage.getItem(SPEICHER));
    if (d && d.zustand && d.zustand.zellen) {
      if (d.version === VERSION) return spielAnlegen(d.zustand);
      if (d.version === 2) return ausRundenSpielstand(d.zustand);
    }
  } catch (e) {}
  return null;
}

// Bauen mit Rückgängig. Gemerkt wird nur das Gebaute (Wände, Räume, Möbel, wo Mitarbeiter stehen) und das Geld dafür –
// die Zeit, die Besucher und das Kaffeegeld laufen beim Rückgängigmachen nicht zurück.
const BAU = ['zellen', 'raumTyp', 'veranstaltung', 'moebel', 'personen'];
function aendern(fn) {
  const vorher = JSON.stringify(BAU.map(k => z[k])), kontoVor = z.konto;
  fn();
  moebelPruefen(z); personenPruefen(z);
  verlauf.push({ bau: vorher, geld: z.konto - kontoVor });
  if (verlauf.length > 60) verlauf.shift();
  nachAenderung();
}
function nachAenderung() { raeume = auswerten(); speichern(); anzeigeErzwingen(); malen(); }
function rueckgaengig() {
  const e = verlauf.pop();
  if (!e) return;
  const [zellen, raumTyp, veranstaltung, moebel, personen] = JSON.parse(e.bau);
  for (const m of moebel) { const jetzt = moebelBei(z, m.x, m.y); if (jetzt && jetzt.art === m.art && 'fuellung' in jetzt) m.fuellung = jetzt.fuellung; }
  Object.assign(z, { zellen, raumTyp, veranstaltung, moebel });
  for (const p of z.personen) { const alt = personen.find(a => a.id === p.id); if (alt) { p.x = alt.x; p.y = alt.y; } }
  if (e.geld < 0) buchen(z, 'einnahmen', 'rueckerstattung', -e.geld);
  if (e.geld > 0) buchen(z, 'ausgaben', 'moebel', e.geld);
  personenPruefen(z); fenster = null; maske.hidden = true;
  nachAenderung();
}

function groesseAnpassen() {
  const dpr = window.devicePixelRatio || 1, b = flaeche.clientWidth, h = flaeche.clientHeight;
  leinwand.width = b * dpr; leinwand.height = h * dpr;
  leinwand.style.width = b + 'px'; leinwand.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const k = Math.max(6, Math.floor(Math.min(b / z.w, h / z.h)));
  ansicht = { k, ox: Math.floor((b - z.w * k) / 2), oy: Math.floor((h - z.h * k) / 2) };
  malen();
}

// ---- Figuren in Bewegung: Besucher und Ehrenamtliche im Kirchkaffee ----
// Wo jemand gerade ist, wird aus der Spielzeit berechnet. So laufen alle bei x5 schneller und stehen bei Pause still.
const wegSpeicher = new Map();
function strecke(schluessel, von, nach) {
  if (!wegSpeicher.has(schluessel)) {
    const blockiert = (x, y) => !!moebelBei(z, x, y) || z.personen.some(p => p.x === x && p.y === y);
    const pfad = glaetten(z, weg(z, von, nach, blockiert), blockiert) || [von, nach];
    let laenge = 0;
    for (let i = 0; i < pfad.length - 1; i++) laenge += Math.hypot(pfad[i + 1].x - pfad[i].x, pfad[i + 1].y - pfad[i].y);
    wegSpeicher.set(schluessel, { pfad, laenge });
  }
  return wegSpeicher.get(schluessel);
}
function punktAufWeg({ pfad }, d) {
  for (let i = 0; i < pfad.length - 1; i++) {
    const a = pfad[i], c = pfad[i + 1], len = Math.hypot(c.x - a.x, c.y - a.y);
    if (d <= len) { const f = len ? d / len : 1; return { x: a.x + (c.x - a.x) * f, y: a.y + (c.y - a.y) * f, unterwegs: true }; }
    d -= len;
  }
  const e = pfad[pfad.length - 1];
  return { x: e.x, y: e.y, unterwegs: false };
}
function strasse(i) {
  const g = GRUNDSTUECK, gehweg = GEHWEGE.find(w => w.w > w.h && w.y >= g.y + g.h);
  return { x: g.tor.x + (i % g.tor.breite), y: gehweg ? gehweg.y : g.y + g.h + 1 };
}
// Ein Besucher geht nacheinander Wegstücke: von der Straße zum Stuhl (oder bis zur Tür und wieder heim),
// nach dem Gottesdienst zum Stehplatz im Kirchkaffee und am Ende nach Hause.
function besucherFiguren() {
  const L = z.lauf, t = z.minuten;
  if (!L || !L.gaeste) return [];
  return L.gaeste.map((g, i) => {
    const s = `${L.woche}:${i}:`, start = strasse(i), t0 = L.ankunft + i * ABSTAND;
    if (t < t0) return null;
    const hin = strecke(s + 'hin', start, g.sitz || g.tuer);
    let ort = punktAufWeg(hin, (t - t0) * LAUFTEMPO), sitzt = !!g.sitz && !ort.unterwegs, ziel = g.sitz;
    if (!g.sitz) {   // kein Stuhl frei: wieder nach Hause
      const t1 = t0 + hin.laenge / LAUFTEMPO;
      if (t >= t1) { const zurueck = strecke(s + 'heim', g.tuer, start); ort = punktAufWeg(zurueck, (t - t1) * LAUFTEMPO); if (!ort.unterwegs) return null; }
      return { id: g.id, name: g.name, ...ort, sitzt: false, sichtbar: true };
    }
    const kaffeeBeginn = L.beginn + DAUER.gottesdienst + i * 0.5;
    if (g.kaffee && g.kaffee.platz && t >= kaffeeBeginn && !L.ausgefallen) {
      ort = punktAufWeg(strecke(s + 'kaffee', g.sitz, g.kaffee.platz), (t - kaffeeBeginn) * LAUFTEMPO);
      sitzt = false; ziel = g.kaffee.platz;
    }
    if (L.phase === 'ende') {
      const t2 = L.ende + i * ABSTAND * 0.5;
      if (t >= t2) {
        const von = L.ausgefallen ? { x: Math.round(ort.x), y: Math.round(ort.y) } : ziel;
        ort = punktAufWeg(strecke(s + 'ende', von, start), (t - t2) * LAUFTEMPO);
        if (!ort.unterwegs) return null;
        sitzt = false;
      }
    }
    return { id: g.id, name: g.name, ...ort, sitzt, sichtbar: true };
  }).filter(Boolean);
}
// Ehrenamtlicher an der Kaffeemaschine: holt Tasse für Tasse an der Maschine und bringt sie zur Theke.
function eaPosition(p) {
  const L = z.lauf;
  if (!L || L.phase !== 'kirchkaffee' || !L.stationen) return null;
  const si = L.stationen.findIndex(s => s.ea === p.id);
  if (si < 0) return null;
  const st = L.stationen[si], t = z.minuten;
  const zeiten = L.gaeste.filter(g => g.kaffee && g.kaffee.station === si).map(g => g.kaffee.zeit).sort((a, b) => a - b);
  const zwischen = (a, b, f) => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
  const start = L.beginn + DAUER.gottesdienst;
  if (!zeiten.length || t >= zeiten[zeiten.length - 1]) return t - start < 5 ? zwischen(p, st.standTheke, (t - start) / 5) : st.standTheke;
  const takt = zeiten.length > 1 ? zeiten[1] - zeiten[0] : 5;
  const j = zeiten.findIndex(h => t <= h), anfang = zeiten[j] - takt;
  if (t < anfang) return t - start < 5 ? zwischen(p, st.standTheke, (t - start) / 5) : st.standTheke;
  const f = (t - anfang) / takt;
  if (f < 0.35) return zwischen(st.standTheke, st.standMaschine, f / 0.35);
  if (f < 0.65) return st.standMaschine;
  return zwischen(st.standMaschine, st.standTheke, (f - 0.65) / 0.35);
}
function figuren() {
  return z.personen.map(p => {
    const d = daten(p); if (!d) return null;
    const pos = tragen && tragen.person === p ? null : eaPosition(p);
    return { ...d, x: pos ? pos.x : p.x, y: pos ? pos.y : p.y, getragen: tragen && tragen.person === p };
  }).filter(Boolean);
}

function malen() {
  ctx.clearRect(0, 0, leinwand.width, leinwand.height);
  const vorschau = ziehen && ziehen.art === 'wand' ? (([x0, y0, x1, y1]) => ({ ...ziehen, x0, y0, x1, y1 }))(wandAnpassen(z, ziehen.x0, ziehen.y0, ziehen.x1, ziehen.y1)) : ziehen;
  const konflikte = vorschau && vorschau.art === 'wand' ? wandKonflikte(z, vorschau.x0, vorschau.y0, vorschau.x1, vorschau.y1) : [];
  const moebelTyp = MOEBEL.find(m => m.id === werkzeug);
  const preisSchild = editorOffen && moebelTyp && maus ? { ...maus, text: euro(moebelTyp.kosten), zuTeuer: !kannBezahlen(z, moebelTyp.kosten) } : null;
  const auswahl = fenster && (fenster.art === 'raum' || fenster.art === 'raumtyp') ? fenster.nr : null;
  zeichne(ctx, z, raeume, ansicht, { vorschau, konflikte, auswahl, schwebe: editorOffen && !ziehen ? schwebe : null, preisSchild,
    raster: editorOffen, personen: figuren(), tragen, moebel: z.moebel, besucher: besucherFiguren(),
    markiert: fenster && fenster.art === 'besucher' ? fenster.id : null });
  anzeigenAktualisieren();
}

// ---- Die Uhr ----
let letzteZeit = performance.now(), letztesSpeichern = 0;
function schleife(t) {
  const sekunden = Math.min(0.25, (t - letzteZeit) / 1000);   // nach langer Abwesenheit nicht sprunghaft weiter
  letzteZeit = t;
  if (z.tempo > 0) {
    const vorher = z.personen.length;
    zeitVorruecken(z, raeume, spielMinuten(sekunden, z.tempo));
    if (z.personen.length !== vorher) raeume = auswerten();   // neue Ehrenamtliche
    else kirchkaffeeBeschriften(raeume);
    if (!z.lauf) wegSpeicher.clear();
    malen();
    if (t - letztesSpeichern > 2000) { letztesSpeichern = t; speichern(); }
  }
  requestAnimationFrame(schleife);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') speichern(); });

// ---- Anzeigen: Leiste oben, Seitenleiste, Datum mit Kirchenjahr-Rad, Hinweis, offenes Fenster ----
const ART_TEXT_MEHRZAHL = { hauptamt: 'listeHauptamt', ehrenamt: 'listeEhrenamt' };
const LEERTEXT = { hauptamt: 'Noch keine Hauptamtlichen', ehrenamt: 'Noch keine Ehrenamtlichen' };
let letzteAnzeige = '', letzteAnzeigeZeit = 0;
function anzeigeErzwingen() { letzteAnzeigeZeit = 0; }
function anzeigenAktualisieren() {
  const jetzt = performance.now();
  if (jetzt - letzteAnzeigeZeit < 100) return;   // höchstens 10-mal pro Sekunde
  letzteAnzeigeZeit = jetzt;
  const v = verfuegbarkeit(z, raeume);
  $('anzHauptamt').textContent = `${v.hauptamt.frei}/${v.hauptamt.gesamt}`;
  $('anzEhrenamt').textContent = `${v.ehrenamt.frei}/${v.ehrenamt.gesamt}`;
  // Personenlisten nur neu aufbauen, wenn sich etwas geändert hat (sonst flackert die Maus-Hervorhebung)
  const zeilen = z.personen.map(p => { const d = daten(p), r = eingesetztIn(z, raeume, p); return d && { id: p.id, art: d.art, name: d.name, ort: r ? r.typ.name : 'verfügbar' }; }).filter(Boolean);
  const schluessel = JSON.stringify(zeilen);
  if (schluessel !== letzteAnzeige) {
    letzteAnzeige = schluessel;
    for (const art of ['hauptamt', 'ehrenamt']) {
      const ul = $(ART_TEXT_MEHRZAHL[art]); ul.replaceChildren();
      const eigene = zeilen.filter(x => x.art === art);
      if (!eigene.length) { const li = document.createElement('li'); li.className = 'leer'; li.textContent = LEERTEXT[art]; ul.append(li); }
      for (const x of eigene) {
        const li = document.createElement('li'), n = document.createElement('span'), o = document.createElement('small');
        n.textContent = x.name; o.textContent = x.ort; li.append(n, o); li.dataset.person = x.id;
        ul.append(li);
      }
    }
  }
  for (const id of ['kontostand', 'kontoEditor', 'kontoKurz', 'kontoOben']) $(id).textContent = euro(z.konto);
  $('bekanntheit').textContent = z.bekanntheit;
  const lg = z.letzterGottesdienst;
  $('besucherLetzter').textContent = lg ? lg.besucher : '–';
  $('besucherKurz').textContent = lg ? lg.besucher : '–';
  $('besucherHeim').textContent = lg ? lg.heim : '–';
  $('besucherStamm').textContent = z.besucher.length;
  const f = finanzPrognose(z, raeume);
  $('progEinnahmen').textContent = euro(f.einnahmen);
  $('progAusgaben').textContent = euro(f.ausgaben);
  // Zeit
  const zp = zeitpunkt(z.minuten), s = sonntagDerWoche(zp.woche), stand = kirchenjahrStand(zp.woche);
  $('uhr').textContent = TEXTE.zeitAnzeige(zp.woche + 1, TEXTE.tage[zp.tag], uhrzeit(z.minuten));
  $('countdown').textContent = TEXTE.countdown(tageBisSonntag(z.minuten));
  $('sonntag').textContent = `${s.name} · ${s.datum} · ${stand.aktuell.name}`;
  radZeichnen(stand);
  document.querySelectorAll('[data-tempo]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.tempo) === z.tempo)));
  $('spielHinweis').textContent = hinweisText();
  fensterAktualisieren();
}
document.querySelector('.seitenleiste').addEventListener('click', e => {
  const li = e.target.closest('li[data-person]');
  if (li) fensterOeffnen({ art: 'person', id: li.dataset.person });
});

// Kirchenjahr-Rad: Abschnitte wie Tortenstücke, Zeiger wie bei einer Uhr (oben = 1. Advent, im Uhrzeigersinn)
let letztesRad = '';
function radZeichnen(stand) {
  const schluessel = stand.fortschritt.toFixed(4);
  if (schluessel === letztesRad) return;
  letztesRad = schluessel;
  const punkt = (a, r) => [Math.sin(a * 2 * Math.PI) * r, -Math.cos(a * 2 * Math.PI) * r].map(n => n.toFixed(2)).join(' ');
  const stuecke = stand.zeiten.map(zt => {
    const gross = zt.bis - zt.von > 0.5 ? 1 : 0;
    return `<path d="M0 0 L${punkt(zt.von, 46)} A46 46 0 ${gross} 1 ${punkt(zt.bis, 46)} Z" fill="${zt.farbe}" stroke="#2b2a27" stroke-width="1.5"><title>${zt.name}</title></path>`;
  }).join('');
  const spitze = punkt(stand.fortschritt, 40);
  $('rad').innerHTML = `${stuecke}<circle r="46" fill="none" stroke="#2b2a27" stroke-width="2"/>
    <line x1="0" y1="0" x2="${spitze.split(' ')[0]}" y2="${spitze.split(' ')[1]}" stroke="#d6362b" stroke-width="4" stroke-linecap="round"/>
    <circle r="5" fill="#d6362b"/>`;
}

// Hinweis unten rechts: was gerade läuft, wer heimgehen musste, oder was für den Gottesdienst fehlt
function hinweisText() {
  const L = z.lauf;
  if (L && L.phase !== 'ende') {
    const heim = L.gaeste && L.phase !== 'anreise' ? L.gaeste.filter(g => !g.sitz).length : 0;
    return TEXTE.laeuft[L.phase] + (heim ? ' ' + TEXTE.heimgeschickt(heim) : '');
  }
  if (L && L.ausgefallen) return TEXTE.ausgefallen;
  if (L && z.letzterGottesdienst && z.letzterGottesdienst.heim) return TEXTE.heimgeschickt(z.letzterGottesdienst.heim);
  const gd = gottesdienstRaeume(z, raeume).filter(b => b.typ.id === 'gottesdienst');
  if (!gd.length) return TEXTE.fehltRaum;
  const mit = gd.filter(b => b.veranstaltung && b.veranstaltung.id === 'gottesdienst');
  if (!mit.length) return TEXTE.fehltVeranstaltung;
  if (!mit.some(b => b.bereit)) return TEXTE.fehltLeitung;
  return '';
}

// ---- Eingaben auf der Karte ----
function punktAus(e) { const r = leinwand.getBoundingClientRect(); return { px: e.clientX - r.left, py: e.clientY - r.top }; }
function feldAus(e) {
  const { px, py } = punktAus(e);
  const x = Math.floor((px - ansicht.ox) / ansicht.k), y = Math.floor((py - ansicht.oy) / ansicht.k);
  return { x: Math.max(0, Math.min(z.w - 1, x)), y: Math.max(0, Math.min(z.h - 1, y)) };
}
function naechste(e, liste, radius) {
  const { px, py } = punktAus(e), k = ansicht.k;
  let beste = null, abstand = radius;
  for (const p of liste) {
    const d = Math.hypot(ansicht.ox + (p.x + 0.5) * k - px, ansicht.oy + (p.y + 0.5) * k - py);
    if (d < abstand) { abstand = d; beste = p; }
  }
  return beste;
}
const figurBei = e => naechste(e, z.personen, Math.max(22, ansicht.k * 1.1));
const besucherBei = e => naechste(e, besucherFiguren(), Math.max(12, ansicht.k * 0.6));
const personAuf = (x, y) => z.personen.some(p => p.x === x && p.y === y);
const maschineBei = f => { const m = moebelBei(z, f.x, f.y); return m && m.art === 'kaffeemaschine' ? m : null; };

leinwand.addEventListener('contextmenu', e => e.preventDefault());
leinwand.addEventListener('mousedown', e => { if (e.button === 2) abbrechen(); });   // Rechtsklick während gedrückter linker Taste
leinwand.addEventListener('pointerdown', e => {
  if (e.button === 2) { abbrechen(); return; }        // Rechtsklick bricht Ziehen ab
  if (!editorOffen) {
    const p = figurBei(e);
    if (p) { leinwand.setPointerCapture(e.pointerId); const a = punktAus(e); tragen = { person: p, ...a, start: a, bewegt: false }; malen(); }
    else klickStart = { feld: feldAus(e), besucher: besucherBei(e) };
    return;
  }
  const f = feldAus(e);
  stuhlStart = f;
  if (werkzeug === 'wand' || werkzeug === 'abriss') {
    leinwand.setPointerCapture(e.pointerId);
    ziehen = { x0: f.x, y0: f.y, x1: f.x, y1: f.y, art: werkzeug };
    malen();
  }
});
leinwand.addEventListener('pointermove', e => {
  if (e.buttons & 2) { abbrechen(); return; }
  mauszeiger(e);
  maus = punktAus(e);
  if (editorOffen && MOEBEL_WERKZEUGE.includes(werkzeug)) malen();
  if (editorOffen && !ziehen) { const f = feldAus(e); if (!schwebe || f.x !== schwebe.x || f.y !== schwebe.y) { schwebe = f; malen(); } }
  if (tragen) {
    const a = punktAus(e);
    if (Math.hypot(a.px - tragen.start.px, a.py - tragen.start.py) > 6) tragen.bewegt = true;
    Object.assign(tragen, a); malen(); return;
  }
  if (!ziehen) return;
  const f = feldAus(e);
  if (f.x !== ziehen.x1 || f.y !== ziehen.y1) { ziehen.x1 = f.x; ziehen.y1 = f.y; malen(); }
});
leinwand.addEventListener('pointerup', e => {
  if (tragen) {
    const f = feldAus(e), p = tragen.person, bewegt = tragen.bewegt; tragen = null;
    if (!bewegt) { fensterOeffnen({ art: 'person', id: p.id }); return; }   // nur angetippt: Charakter-Karte
    if (p.x !== f.x || p.y !== f.y) aendern(() => versetzen(z, p, f.x, f.y)); else malen();
    return;
  }
  if (!editorOffen) {
    // Spielansicht: Besucher → Kärtchen, Kaffeemaschine → Menü, Raum mit Veranstaltungen → Raum-Fenster
    const f = feldAus(e), s = klickStart; klickStart = null;
    if (!s || s.feld.x !== f.x || s.feld.y !== f.y) return;
    if (s.besucher) return fensterOeffnen({ art: 'besucher', id: s.besucher.id });
    const m = maschineBei(f);
    if (m) return fensterOeffnen({ art: 'maschine', x: m.x, y: m.y });
    const r = raumMitVeranstaltung(f);
    if (r) fensterOeffnen({ art: 'raum', nr: r.nr });
    return;
  }
  const f = feldAus(e);
  if (ziehen) {
    const v = ziehen; ziehen = null;
    if (v.art === 'wand') {
      const [x0, y0, x1, y1] = wandAnpassen(z, v.x0, v.y0, v.x1, v.y1);
      if (!wandKonflikte(z, x0, y0, x1, y1).length) aendern(() => wandBauen(z, x0, y0, x1, y1)); else malen();
    } else aendern(() => { abriss(z, v.x0, v.y0, v.x1, v.y1); moebelAbreissen(z, v.x0, v.y0, v.x1, v.y1); });
    return;
  }
  if (MOEBEL_WERKZEUGE.includes(werkzeug)) {
    if (!stuhlStart || stuhlStart.x !== f.x || stuhlStart.y !== f.y) return;   // nur Tippen, kein Ziehen
    if (moebelBei(z, f.x, f.y)) return;                               // entfernen nur per Abriss
    const typ = MOEBEL.find(m => m.id === werkzeug);
    if (!kannBezahlen(z, typ.kosten)) { kurzerHinweis(werkzeug === 'stuhl' ? `Nicht genug Geld für einen Stuhl (${euro(typ.kosten)}).` : TEXTE.nichtGenugGeld(typ.name, euro(typ.kosten))); return; }
    aendern(() => moebelKaufen(z, werkzeug, f.x, f.y, personAuf));
  } else if (werkzeug === 'tuer') {
    if (z.zellen[idx(z, f.x, f.y)]) aendern(() => tuerUmschalten(z, f.x, f.y));
  } else if (werkzeug === 'raum') {
    const nr = raeume.gruppe[idx(z, f.x, f.y)];
    if (nr >= 0) fensterOeffnen({ art: 'raumtyp', nr }); else fensterSchliessen();
  }
});
leinwand.addEventListener('pointercancel', abbrechen);
leinwand.addEventListener('pointerleave', () => { maus = null; if (schwebe) schwebe = null; malen(); });
function abbrechen() { if (ziehen || tragen) { ziehen = null; tragen = null; malen(); } }

// Mauszeiger zeigt, was man tun kann
function mauszeiger(e) {
  let c = 'default';
  if (tragen) c = 'grabbing';
  else if (!editorOffen) { const f = feldAus(e); c = figurBei(e) ? 'grab' : besucherBei(e) || maschineBei(f) || raumMitVeranstaltung(f) ? 'pointer' : 'default'; }
  else c = werkzeug === 'tuer' || werkzeug === 'raum' ? 'pointer' : 'crosshair';
  if (leinwand.style.cursor !== c) leinwand.style.cursor = c;
}

// Escape: erst Ziehen abbrechen, dann Fenster schließen, dann Editor schließen
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (ziehen || tragen) return abbrechen();
  if (!maske.hidden) return fensterSchliessen();
  if (editorOffen) editorUmschalten(false);
});

// Kurzer Hinweis in der Editor-Zeile, danach wieder der normale Werkzeug-Hinweis
let hinweisTimer = null;
function kurzerHinweis(text) {
  const h = $('hinweis'); h.textContent = text; h.classList.add('warnung');
  clearTimeout(hinweisTimer);
  hinweisTimer = setTimeout(() => { h.textContent = HINWEISE[werkzeug]; h.classList.remove('warnung'); }, 3000);
}

// ---- Fenster ----
// Ein Fenster wird bei Änderungen neu aufgebaut (z. B. Füllstand, Prognose), aber nur, wenn sich der Inhalt geändert hat.
let letzterFensterInhalt = '';
function fensterOeffnen(f) { fenster = f; letzterFensterInhalt = ''; anzeigeErzwingen(); malen(); }
function fensterSchliessen() { fenster = null; maske.hidden = true; letzterFensterInhalt = ''; malen(); }
function fensterAktualisieren() {
  if (!fenster) { maske.hidden = true; return; }
  const inhalt = { raumtyp: raumTypFenster, raum: raumFenster, maschine: maschinenFenster, besucher: besucherKarte, person: personenKarte }[fenster.art]();
  if (inhalt === null) { fenster = null; maske.hidden = true; return; }
  maske.classList.toggle('breit', fenster.art === 'raum');
  if (inhalt !== letzterFensterInhalt) { letzterFensterInhalt = inhalt; maske.querySelector('.inhalt').innerHTML = inhalt; }
  maske.hidden = false;
}
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Raumfunktion festlegen (Editor)
function raumTypFenster() {
  const r = raeume.liste[fenster.nr];
  if (!r) return null;
  const zeilen = RAUMTYPEN.map(t => {
    const p = pruefeRaum(z, r, t), aktiv = r.typ && r.typ.id === t.id;
    const status = p.includes('groesse') ? `zu klein, mind. ${t.minGroesse[0]} × ${t.minGroesse[1]}` : `mind. ${t.minGroesse[0]} × ${t.minGroesse[1]}`;
    return `<button class="typ${aktiv ? ' aktiv' : ''}" data-typ="${t.id}" ${p.includes('groesse') ? 'disabled' : ''}>
      <span class="farbe" style="background:${t.farbe}"></span><span><b>${t.name}</b><small>${status}</small></span></button>`;
  }).join('');
  return `<h2>Raumfunktion</h2>
    ${r.tueren === 0 ? '<p class="warnung">Dieser Raum hat noch keine Tür.</p>' : ''}
    <div class="typen">${zeilen}</div>
    <div class="zeile">${r.typ ? '<button data-typ="">Funktion entfernen</button>' : ''}<button data-zu>Schließen</button></div>`;
}

// Charakter-Karte eines Mitarbeiters
const ART_TEXT = { hauptamt: 'Hauptamtlich', ehrenamt: 'Ehrenamtlich' };
function personenKarte() {
  const p = z.personen.find(x => x.id === fenster.id), d = p && daten(p);
  if (!d) return null;
  const raum = eingesetztIn(z, raeume, p);
  return `<h2>${esc(d.name)}</h2>
    <p class="unter">${ART_TEXT[d.art]} · ${raum ? 'Im Einsatz: ' + raum.typ.name : 'Verfügbar'}</p>
    <h3>Skills</h3><p class="leer">Skills folgen später</p>
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Raum-Fenster in der Spielansicht (Gottesdienstraum): Veranstaltung, Wochenplan, Mitarbeiter, Prognose
function raumMitVeranstaltung(f) {
  const nr = raeume.gruppe[idx(z, f.x, f.y)], r = nr >= 0 ? raeume.liste[nr] : null;
  return r && moeglicheVeranstaltungen(r.typ).length ? r : null;
}
function raumFenster() {
  const r = raeume.liste[fenster.nr];
  if (!r || !moeglicheVeranstaltungen(r.typ).length) return null;
  const T = TEXTE.raum, aktuell = veranstaltungVon(z, r), info = gottesdienstRaeume(z, raeume).find(g => g.raum === r);
  const erfuellt = { 'Pastor im Raum': !!(info && info.leitung) };
  const kachel = (id, name, k) => `<button class="kachel${(aktuell ? aktuell.id : '') === id ? ' aktiv' : ''}" data-veranstaltung="${id}">
      <b>${name}</b>
      <span class="klein">${TEXTE.bringt}</span><ul>${k.bringt.map(t => `<li>${t}</li>`).join('')}</ul>
      <span class="klein">${TEXTE.bedingungen}</span><ul>${k.bedingungen.map(t => `<li class="${t in erfuellt ? (erfuellt[t] ? 'ok' : 'fehlt') : ''}">${t}</li>`).join('')}</ul></button>`;
  const kacheln = moeglicheVeranstaltungen(r.typ).map(v => kachel(v.id, v.name, TEXTE.veranstaltungKacheln[v.id])).join('')
    + kachel('', KEINE_VERANSTALTUNG, TEXTE.veranstaltungKacheln.keine);
  let plan = '';
  if (aktuell) {
    const kopf = TEXTE.tageKurz.map(t => `<th>${t}</th>`).join('');
    const reihen = SLOTS.map(s => `<tr><th class="slot">${T.slots[s.id]}<small>${String(s.stunde).padStart(2, '0')}:00</small></th>${
      TEXTE.tageKurz.map((t, tag) => `<td><button class="planfeld${z.plan.tag === tag && z.plan.slot === s.id ? ' aktiv' : ''}" data-plan="${tag}:${s.id}" aria-label="${TEXTE.tage[tag]} ${T.slots[s.id]}"></button></td>`).join('')}</tr>`).join('');
    plan = `<h3>${T.wochenplan}</h3><p class="unter">${T.wochenplanInfo}</p><table class="wochenplan"><tr><th></th>${kopf}</tr>${reihen}</table>`;
  }
  const leute = info ? info.imRaum : [];
  const mitarbeiter = leute.length
    ? leute.map(p => { const d = daten(p); return `<div class="kachel klein-kachel"><b>${esc(d.name)}</b><small>${ART_TEXT[d.art]} · ${T.skillsSpaeter}</small></div>`; }).join('')
    : `<p class="warnung">${T.keinMitarbeiter}</p>`;
  let vorschau = '';
  if (aktuell) {
    const p = prognose(z, raeume);
    vorschau = `<h3>${terminDieseWoche(z) ? T.prognose : T.prognoseNaechste}</h3>
      ${p.bereit ? '' : `<p class="warnung">${T.prognoseFaelltAus}</p>`}
      <table class="finanzen hell">
        <tr><td>${T.prognoseBesucher}</td><td class="zahl">${T.ca(zahl1(p.erwartet))}</td></tr>
        <tr><td>${T.prognosePlaetze}</td><td class="zahl">${p.plaetze}</td></tr>
        <tr><td>${T.prognoseGeld}</td><td class="zahl">${T.ca(euro(Math.round(p.geld)))}</td></tr>
        <tr><td>${T.prognoseEhrenamt}</td><td class="zahl">${T.ca(zahl1(p.ehrenamt))}</td></tr></table>`;
  }
  return `<h2>${r.typ.name}</h2>
    <h3>${T.veranstaltung}</h3><div class="kacheln">${kacheln}</div>
    ${plan}
    <h3>${T.mitarbeiter}</h3>${mitarbeiter}
    ${vorschau}
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Kaffeemaschine: Füllstand und Kaffee nachkaufen
function maschinenFenster() {
  const m = maschineBei(fenster);
  if (!m) return null;
  const T = TEXTE.maschine, max = fassung(m.art), n = m.fuellung || 0;
  const nr = raeume.gruppe[idx(z, m.x, m.y)], raum = nr >= 0 ? raeume.liste[nr] : null, imKaffee = raum && raum.typ && raum.typ.id === 'kirchkaffee';
  const zuVoll = n + NACHKAUFEN.tassen > max, keinGeld = !kannBezahlen(z, NACHKAUFEN.preis);
  return `<h2>${T.titel}</h2>
    <div class="balken"><span style="width:${Math.round(n / max * 100)}%"></span></div>
    <p class="unter">${T.fuellstand(n, max)}</p>
    ${n === 0 ? `<p class="warnung">${T.leer}</p>` : ''}
    ${imKaffee ? '' : `<p class="warnung">${T.nichtImKaffee}</p>`}
    <div class="typen"><button data-nachkaufen ${zuVoll || keinGeld ? 'disabled' : ''}>${T.nachkaufen(NACHKAUFEN.preis, NACHKAUFEN.tassen)}</button></div>
    ${zuVoll ? `<p class="unter">${T.voll}</p>` : keinGeld ? `<p class="unter">${T.keinGeld}</p>` : ''}
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Besucher-Kärtchen: Bedürfnisse und Zufriedenheit
function besucherKarte() {
  const b = z.besucher.find(x => x.id === fenster.id);
  if (!b) return null;
  const T = TEXTE.karte, L = z.lauf, g = L && L.gaeste ? L.gaeste.find(x => x.id === b.id) : null;
  const status = s => `<td class="zahl ${s === true ? 'ok' : s === false ? 'fehlt' : ''}">${s === true ? T.erfuellt : s === false ? T.nichtErfuellt : T.offen}</td>`;
  let sitz = null, kaffee = null, gd = null;
  if (g) {
    sitz = !!g.sitz;
    gd = L.ausgefallen || !g.sitz ? false : L.phase !== 'anreise' ? true : null;
    if (g.kaffee && g.kaffee.ergebnis) kaffee = g.kaffee.ergebnis === 'ja';
    else if (!g.sitz || L.ausgefallen || (L.phase === 'ende' && !g.kaffee)) kaffee = false;
  }
  return `<h2>${esc(b.voll)}</h2>
    <p class="unter">${b.besuche ? T.besuche(b.besuche) : T.neu}</p>
    <h3>${T.zufriedenheit}</h3>
    <div class="balken"><span style="width:${b.zufriedenheit}%"></span></div><p class="unter">${b.zufriedenheit} / 100</p>
    <h3>${T.beduerfnisse}</h3>
    <table class="finanzen hell">
      <tr><td>${T.sitzplatz}</td>${status(sitz)}</tr>
      <tr><td>${T.kaffee}</td>${b.kaffee ? status(kaffee) : `<td class="zahl">${T.keinKaffee}</td>`}</tr>
      <tr><td>${T.gottesdienst}</td>${status(gd)}</tr>
    </table>
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

maske.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  if (b.hasAttribute('data-zu')) return fensterSchliessen();
  if (b.dataset.veranstaltung !== undefined) {           // Fenster bleibt offen
    const r = raeume.liste[fenster.nr];
    return aendern(() => veranstaltungEinstellen(z, r, b.dataset.veranstaltung || null));
  }
  if (b.dataset.plan) {
    const [tag, slot] = b.dataset.plan.split(':');
    z.plan = { tag: Number(tag), slot };
    return nachAenderung();
  }
  if (b.hasAttribute('data-nachkaufen')) {
    const m = maschineBei(fenster);
    if (m) kaffeeNachkaufen(z, m);
    return nachAenderung();
  }
  if (b.dataset.typ !== undefined) {
    const r = raeume.liste[fenster.nr];
    aendern(() => typZuweisen(z, r, b.dataset.typ || null));
    fensterSchliessen();
  }
});

// ---- Zeit-Knöpfe und Zurücksetzen ----
document.querySelectorAll('[data-tempo]').forEach(b => {
  b.textContent = TEXTE.tempo[b.dataset.tempo];
  b.addEventListener('click', () => { z.tempo = Number(b.dataset.tempo); speichern(); anzeigeErzwingen(); malen(); });
});
function zuruecksetzen() {
  z = neuesSpiel(); verlauf.length = 0; wegSpeicher.clear(); fenster = null;
  nachAenderung();
}
// Zweimal klicken zum Bestätigen (wie beim Knopf „Neu“)
function sicherKnopf(knopf, text, sicherText, aktion) {
  let timer = null;
  knopf.textContent = text;
  knopf.addEventListener('click', () => {
    if (knopf.dataset.sicher) { clearTimeout(timer); delete knopf.dataset.sicher; knopf.textContent = text; aktion(); return; }
    knopf.dataset.sicher = '1'; knopf.textContent = sicherText;
    timer = setTimeout(() => { delete knopf.dataset.sicher; knopf.textContent = text; }, 3000);
  });
}
sicherKnopf($('zuruecksetzen'), TEXTE.zuruecksetzen, TEXTE.zuruecksetzenSicher, zuruecksetzen);
sicherKnopf($('neu'), 'Neu', 'Wirklich leeren?', zuruecksetzen);

// ---- Werkzeugleiste und Modi ----
document.querySelectorAll('[data-werkzeug]').forEach(b => b.addEventListener('click', () => {
  werkzeug = b.dataset.werkzeug;
  document.querySelectorAll('[data-werkzeug]').forEach(x => x.setAttribute('aria-pressed', x === b));
  $('hinweis').textContent = HINWEISE[werkzeug];
  fensterSchliessen();
}));
$('zurueck').addEventListener('click', rueckgaengig);
function editorUmschalten(offen) {
  editorOffen = offen; ziehen = null; tragen = null;
  document.body.classList.toggle('modus-editor', offen);
  document.body.classList.toggle('modus-spiel', !offen);
  fensterSchliessen();
}
$('editorAuf').addEventListener('click', () => editorUmschalten(true));
$('editorZu').addEventListener('click', () => editorUmschalten(false));

for (const m of MOEBEL) { const el = $('preis-' + m.id); if (el) el.textContent = euro(m.kosten); }
$('textBekanntheit').textContent = TEXTE.bekanntheit;
$('textKonto').textContent = TEXTE.kontostand;
$('textLetzter').textContent = TEXTE.besucherLetzter;
$('textHeim').textContent = TEXTE.besucherHeim;
$('textStamm').textContent = TEXTE.besucherStamm;
new ResizeObserver(groesseAnpassen).observe(flaeche);
$('hinweis').textContent = HINWEISE[werkzeug];
aktualisierungStarten(() => !!(z.lauf && z.lauf.phase !== 'ende') || !!ziehen || !!tragen);
requestAnimationFrame(schleife);
