// Eingaben: Maus, Finger und Tastatur → Befehle ans Spiel. Rechnet nur aus, welches Kästchen gemeint ist.
import { TEXTE } from '../inhalte/texte.js';
import { ui, $, euro } from './ui.js';
import { fensterOeffnen, fensterSchliessen, fensterOffen } from './fenster.js';

const HINWEISE = {
  wand: 'Zieh ein Rechteck, um Wände zu bauen.',
  tuer: 'Tippe auf eine Wand, um eine Tür zu setzen oder zu entfernen.',
  ...TEXTE.hinweise,
  abriss: 'Zieh über den Bereich, der abgerissen werden soll.',
  raum: 'Tippe in einen Raum, um seine Funktion festzulegen.'
};
const leinwand = $('karte');
const istMoebelWerkzeug = () => ui.spiel.moebelArten().some(m => m.id === ui.werkzeug);

// ---- Pixel → Kästchen, und was liegt dort? ----
function punktAus(e) { const r = leinwand.getBoundingClientRect(); return { px: e.clientX - r.left, py: e.clientY - r.top }; }
function feldAus(e) {
  const { px, py } = punktAus(e), a = ui.ansicht, { w, h } = ui.spiel.karte();
  const x = Math.floor((px - a.ox) / a.k), y = Math.floor((py - a.oy) / a.k);
  return { x: Math.max(0, Math.min(w - 1, x)), y: Math.max(0, Math.min(h - 1, y)) };
}
function naechste(e, liste, radius) {
  const { px, py } = punktAus(e), { k, ox, oy } = ui.ansicht;
  let beste = null, abstand = radius;
  for (const p of liste) {
    const d = Math.hypot(ox + (p.x + 0.5) * k - px, oy + (p.y + 0.5) * k - py);
    if (d < abstand) { abstand = d; beste = p; }
  }
  return beste;
}
const figurBei = e => naechste(e, ui.spiel.karte().personen.map(p => ({ id: p.id, x: p.feldX, y: p.feldY })), Math.max(22, ui.ansicht.k * 1.1));
const besucherBei = e => naechste(e, ui.spiel.karte().besucher, Math.max(24, ui.ansicht.k * 1.2));
const maschineBei = f => { const m = ui.spiel.moebelBei(f.x, f.y); return m && m.art === 'kaffeemaschine' ? m : null; };
const stuhlBei = f => { const m = ui.spiel.moebelBei(f.x, f.y); return m && m.art === 'stuhl' ? m : null; };

// Nach jedem Befehl: speichern, Anzeigen auffrischen, neu zeichnen
function fertig() { ui.speichern(); ui.anzeigeErzwingen(); ui.malen(); }

// Kurzer Hinweis in der Editor-Zeile, danach wieder der normale Werkzeug-Hinweis
let hinweisTimer = null;
function kurzerHinweis(text) {
  const h = $('hinweis'); h.textContent = text; h.classList.add('warnung');
  clearTimeout(hinweisTimer);
  hinweisTimer = setTimeout(() => { h.textContent = HINWEISE[ui.werkzeug]; h.classList.remove('warnung'); }, 3000);
}
function abbrechen() { if (ui.ziehen || ui.tragen) { ui.ziehen = null; ui.tragen = null; ui.malen(); } }

// Mauszeiger zeigt, was man tun kann
function mauszeiger(e) {
  let c = 'default';
  if (ui.tragen) c = 'grabbing';
  else if (!ui.editorOffen) { const f = feldAus(e); c = figurBei(e) ? 'grab' : besucherBei(e) || maschineBei(f) || ui.spiel.veranstaltungsraumBei(f.x, f.y) !== null || ui.spiel.torBei(f.x, f.y) ? 'pointer' : 'default'; }
  else if (ui.werkzeug === 'stuhl' && stuhlBei(feldAus(e))) c = 'pointer';
  else c = ui.werkzeug === 'tuer' || ui.werkzeug === 'raum' ? 'pointer' : 'crosshair';
  if (leinwand.style.cursor !== c) leinwand.style.cursor = c;
}

function druecken(e) {
  if (e.button === 2) { abbrechen(); return; }        // Rechtsklick bricht Ziehen ab
  if (!ui.editorOffen) {
    const p = figurBei(e);
    if (p) { leinwand.setPointerCapture(e.pointerId); const a = punktAus(e); ui.tragen = { id: p.id, ...a, start: a, bewegt: false }; ui.malen(); }
    else ui.klickStart = { feld: feldAus(e), besucher: besucherBei(e) };
    return;
  }
  const f = feldAus(e);
  ui.moebelStart = f;
  if (ui.werkzeug === 'wand' || ui.werkzeug === 'abriss') {
    leinwand.setPointerCapture(e.pointerId);
    ui.ziehen = { x0: f.x, y0: f.y, x1: f.x, y1: f.y, art: ui.werkzeug };
    ui.malen();
  }
}
function bewegen(e) {
  if (e.buttons & 2) { abbrechen(); return; }
  mauszeiger(e);
  ui.maus = punktAus(e);
  if (ui.editorOffen && istMoebelWerkzeug()) ui.malen();
  if (ui.editorOffen && !ui.ziehen) { const f = feldAus(e), s = ui.schwebe; if (!s || f.x !== s.x || f.y !== s.y) { ui.schwebe = f; ui.malen(); } }
  if (ui.tragen) {
    const a = punktAus(e), t = ui.tragen;
    if (Math.hypot(a.px - t.start.px, a.py - t.start.py) > 6) t.bewegt = true;
    Object.assign(t, a); ui.malen(); return;
  }
  if (!ui.ziehen) return;
  const f = feldAus(e);
  if (f.x !== ui.ziehen.x1 || f.y !== ui.ziehen.y1) { ui.ziehen.x1 = f.x; ui.ziehen.y1 = f.y; ui.malen(); }
}
function loslassen(e) {
  const spiel = ui.spiel;
  if (ui.tragen) {
    const f = feldAus(e), { id, bewegt } = ui.tragen; ui.tragen = null;
    if (!bewegt) return fensterOeffnen({ art: 'person', id });   // nur angetippt: Charakter-Karte
    spiel.personVersetzen(id, f.x, f.y); return fertig();
  }
  if (!ui.editorOffen) {
    // Spielansicht: Besucher → Kärtchen, Kaffeemaschine → Menü, Raum mit Veranstaltungen → Raum-Fenster, Tor → Pforte (Plakat)
    const f = feldAus(e), s = ui.klickStart; ui.klickStart = null;
    if (!s || s.feld.x !== f.x || s.feld.y !== f.y) return;
    if (s.besucher) return fensterOeffnen({ art: 'besucher', id: s.besucher.id });
    const m = maschineBei(f);
    if (m) return fensterOeffnen({ art: 'maschine', x: m.x, y: m.y });
    const nr = spiel.veranstaltungsraumBei(f.x, f.y);
    if (nr !== null) return fensterOeffnen({ art: 'raum', nr });
    if (spiel.torBei(f.x, f.y)) fensterOeffnen({ art: 'tor' });
    return;
  }
  const f = feldAus(e);
  if (ui.ziehen) {
    const v = ui.ziehen; ui.ziehen = null;
    if (v.art === 'wand') spiel.wandBauen(v.x0, v.y0, v.x1, v.y1);   // bei Möbeln im Weg baut das Spiel nicht
    else spiel.abreissen(v.x0, v.y0, v.x1, v.y1);
    return fertig();
  }
  if (istMoebelWerkzeug()) {
    const s = ui.moebelStart;
    if (!s || s.x !== f.x || s.y !== f.y) return;                    // nur Tippen, kein Ziehen
    if (ui.werkzeug === 'stuhl' && stuhlBei(f)) return fensterOeffnen({ art: 'stuhl', x: f.x, y: f.y });   // Stuhl verbessern
    const ergebnis = spiel.moebelKaufen(ui.werkzeug, f.x, f.y);      // entfernen nur per Abriss
    if (ergebnis === 'geld') {
      const typ = spiel.moebelArten().find(m => m.id === ui.werkzeug);
      kurzerHinweis(typ.id === 'stuhl' ? `Nicht genug Geld für einen Stuhl (${euro(typ.kosten)}).` : TEXTE.nichtGenugGeld(typ.name, euro(typ.kosten)));
    } else if (ergebnis === 'grenze') kurzerHinweis(TEXTE.grenze[ui.werkzeug]);
    return fertig();
  }
  if (ui.werkzeug === 'tuer') { spiel.tuerUmschalten(f.x, f.y); return fertig(); }
  if (ui.werkzeug === 'raum') {
    const nr = spiel.raumNrBei(f.x, f.y);
    if (nr >= 0) fensterOeffnen({ art: 'raumtyp', nr }); else fensterSchliessen();
  }
}

function editorUmschalten(offen) {
  ui.editorOffen = offen; ui.ziehen = null; ui.tragen = null;
  ui.spiel.bauModus(offen);                                  // im Editor steht die Zeit still
  document.body.classList.toggle('modus-editor', offen);
  document.body.classList.toggle('modus-spiel', !offen);
  fensterSchliessen();
}

// Zweimal klicken zum Bestätigen
function sicherKnopf(knopf, text, sicherText, aktion) {
  let timer = null;
  knopf.textContent = text;
  knopf.addEventListener('click', () => {
    if (knopf.dataset.sicher) { clearTimeout(timer); delete knopf.dataset.sicher; knopf.textContent = text; aktion(); return; }
    knopf.dataset.sicher = '1'; knopf.textContent = sicherText;
    timer = setTimeout(() => { delete knopf.dataset.sicher; knopf.textContent = text; }, 3000);
  });
}
function zuruecksetzen() { ui.spiel.zuruecksetzen(); ui.fenster = null; fensterSchliessen(); fertig(); }

export function eingabenEinrichten() {
  leinwand.addEventListener('contextmenu', e => e.preventDefault());
  leinwand.addEventListener('mousedown', e => { if (e.button === 2) abbrechen(); });   // Rechtsklick während gedrückter linker Taste
  leinwand.addEventListener('pointerdown', druecken);
  leinwand.addEventListener('pointermove', bewegen);
  leinwand.addEventListener('pointerup', loslassen);
  leinwand.addEventListener('pointercancel', abbrechen);
  leinwand.addEventListener('pointerleave', () => { ui.maus = null; ui.schwebe = null; ui.malen(); });

  // Escape: erst Ziehen abbrechen, dann Fenster schließen, dann Editor schließen
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (ui.ziehen || ui.tragen) return abbrechen();
    if (fensterOffen()) return fensterSchliessen();
    if (ui.editorOffen) editorUmschalten(false);
  });

  document.querySelectorAll('[data-werkzeug]').forEach(b => b.addEventListener('click', () => {
    ui.werkzeug = b.dataset.werkzeug;
    document.querySelectorAll('[data-werkzeug]').forEach(x => x.setAttribute('aria-pressed', x === b));
    $('hinweis').textContent = HINWEISE[ui.werkzeug];
    fensterSchliessen();
  }));
  $('zurueck').addEventListener('click', () => { if (ui.spiel.rueckgaengig()) { ui.fenster = null; fensterSchliessen(); fertig(); } });
  sicherKnopf($('zuruecksetzen'), TEXTE.zuruecksetzen, TEXTE.zuruecksetzenSicher, zuruecksetzen);
  $('testGeld').textContent = TEXTE.testGeld;
  $('testGeldBetrag').setAttribute('aria-label', TEXTE.testGeldFeld);
  $('testGeld').addEventListener('click', () => { if (ui.spiel.testGeld($('testGeldBetrag').value) === 'ok') fertig(); });
  sicherKnopf($('neu'), 'Neu', 'Wirklich leeren?', zuruecksetzen);
  $('editorAuf').addEventListener('click', () => editorUmschalten(true));
  $('editorZu').addEventListener('click', () => editorUmschalten(false));
  $('hinweis').textContent = HINWEISE[ui.werkzeug];
}
