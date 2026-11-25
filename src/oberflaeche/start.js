// Start der Oberfläche: Spiel laden, Uhr antreiben, Karte zeichnen.
// Die Uhr hier sagt dem Spiel nur „so viele echte Sekunden sind vergangen“ – was dabei passiert, entscheidet der Kern.
import { spielStarten } from '../kern/spiel.js';
import { ui, $, euro } from './ui.js';
import { ladenText, speichern } from './speicher.js';
import { anzeigenEinrichten, anzeigenAktualisieren } from './anzeigen.js';
import { fensterEinrichten } from './fenster.js';
import { eingabenEinrichten } from './eingaben.js';
import { aktualisierungStarten } from './aktualisieren.js';
import { zeichne } from '../ansicht/zeichnen.js';
import { bauleisteAktualisieren } from './bauleiste.js';

ui.spiel = spielStarten(ladenText());
const leinwand = $('karte'), ctx = leinwand.getContext('2d'), flaeche = $('flaeche');

// Grüne/rote Zahlen im Kirchkaffee: Das Spiel meldet sie; wie lange sie zu sehen sind (in echter Zeit), entscheidet die Anzeige.
const ZAHL_SICHTBAR = 1500;   // Millisekunden
const zahlenGesehen = new Map();
function zahlenAnzeigen(liste) {
  const jetzt = performance.now();
  const schluessel = e => `${e.nr}|${e.x}|${e.y}|${e.betrag}`;   // nach „Zurücksetzen“ fängt die Nummer wieder bei 1 an
  for (const e of liste) if (!zahlenGesehen.has(schluessel(e))) zahlenGesehen.set(schluessel(e), { ...e, start: jetzt });
  const sichtbar = [];
  for (const [s, e] of zahlenGesehen) {
    const anteil = (jetzt - e.start) / ZAHL_SICHTBAR;
    if (anteil >= 1) { if (!liste.some(x => schluessel(x) === s)) zahlenGesehen.delete(s); continue; }
    sichtbar.push({ ...e, anteil });
  }
  return sichtbar;
}

function malen() {
  const spiel = ui.spiel, karte = spiel.karte();
  ctx.clearRect(0, 0, leinwand.width, leinwand.height);
  const z = ui.ziehen;
  const vorschau = z && z.art === 'wand' ? { art: 'wand', ...spiel.wandVorschau(z.x0, z.y0, z.x1, z.y1) } : z;
  const moebelTyp = spiel.moebelArten().find(m => m.id === ui.werkzeug);
  const preisSchild = ui.editorOffen && moebelTyp && ui.maus ? { ...ui.maus, text: euro(moebelTyp.kosten), zuTeuer: !moebelTyp.leistbar } : null;
  // Umriss unter der Maus beim Aufstellen (grün/rot), z. B. der 2 Kästchen lange Parkplatz
  const geist = ui.editorOffen && moebelTyp && ui.werkzeug !== 'strasse' && ui.schwebe && !z ? spiel.moebelVorschau(ui.werkzeug, ui.schwebe.x, ui.schwebe.y, ui.dreh) : null;
  const f = ui.fenster, auswahl = f && (f.art === 'raum' || f.art === 'raumtyp' || f.art === 'kaffee') ? f.nr : null;
  zeichne(ctx, karte, ui.ansicht, {
    vorschau, konflikte: vorschau && vorschau.konflikte || [], auswahl, preisSchild, geist, raster: ui.editorOffen,
    schwebe: ui.editorOffen && !z ? ui.schwebe : null, tragen: ui.tragen, getragen: ui.tragen ? ui.tragen.id : null,
    markiert: f && f.art === 'besucher' ? f.id : null, zahlen: zahlenAnzeigen(karte.zahlen)
  });
  anzeigenAktualisieren();
  if (ui.editorOffen) bauleisteAktualisieren();
}
ui.malen = malen;

function groesseAnpassen() {
  const dpr = window.devicePixelRatio || 1, b = flaeche.clientWidth, h = flaeche.clientHeight, karte = ui.spiel.karte();
  leinwand.width = b * dpr; leinwand.height = h * dpr;
  leinwand.style.width = b + 'px'; leinwand.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const k = Math.max(6, Math.floor(Math.min(b / karte.w, h / karte.h)));
  ui.ansicht = { k, ox: Math.floor((b - karte.w * k) / 2), oy: Math.floor((h - karte.h * k) / 2) };
  malen();
}

// Uhr: bei jedem Bild dem Spiel die vergangene Zeit melden; neu zeichnen, wenn die Zeit gelaufen ist.
let letzteZeit = performance.now(), letztesSpeichern = 0;
function schleife(t) {
  const sekunden = (t - letzteZeit) / 1000;
  letzteZeit = t;
  const hilfeOffen = !!ui.fenster && ui.fenster.art === 'hilfe';   // Hilfe offen: dem Spiel keine Zeit melden → Zeit steht
  if (ui.menueOffen) { requestAnimationFrame(schleife); return; }   // Hauptmenü offen: Zeit steht, keine Dialoge
  if (!hilfeOffen && ui.spiel.tick(sekunden)) {
    malen();
    if (t - letztesSpeichern > 2000) { letztesSpeichern = t; speichern(ui.spiel); }
  } else if (ui.spiel.seelsorgeOffen() && (!ui.fenster || ui.fenster.art !== 'seelsorge')) {
    ui.anzeigeErzwingen(); malen();   // Seelsorge-Anfrage ist gekommen: Dialog zeigen
  } else if (ui.spiel.festOffen() && (!ui.fenster || ui.fenster.art !== 'fest')) {
    ui.anzeigeErzwingen(); malen();   // Fest-Menü steht an: Fenster zeigen
  }
  requestAnimationFrame(schleife);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') speichern(ui.spiel); });
ui.speichern = () => speichern(ui.spiel);

anzeigenEinrichten();
fensterEinrichten();
eingabenEinrichten();
new ResizeObserver(groesseAnpassen).observe(flaeche);
aktualisierungStarten(() => ui.spiel.lage().beschaeftigt || !!ui.ziehen || !!ui.tragen);
requestAnimationFrame(schleife);
