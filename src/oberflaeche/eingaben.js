// Eingaben: Maus, Finger und Tastatur → Befehle ans Spiel. Rechnet nur aus, welches Kästchen gemeint ist.
import { TEXTE } from '../inhalte/texte.js';
import { ui, $, euro } from './ui.js';
import { evangelisationsStandTrifft } from '../ansicht/zeichnen.js';
import { fensterOeffnen, fensterSchliessen, fensterOffen } from './fenster.js';
import { bauleisteEinrichten, werkzeugWaehlen, imUntermenue, hauptmenueZeigen } from './bauleiste.js';
import { hauptmenueEinrichten, menueOeffnen, menueEscape } from './hauptmenue.js';

const HINWEISE = {
  ...TEXTE.hinweise,
  ...TEXTE.hinweiseAussen
};
const hinweisFuer = id => HINWEISE[id || 'keinWerkzeug'];   // ohne gewähltes Werkzeug: eigener Hinweis
const leinwand = $('karte');
const ZIEH_WERKZEUGE = ['wand', 'abriss', 'strasse', 'weg'];   // Rechteck ziehen
const istMoebelWerkzeug = () => !ZIEH_WERKZEUGE.includes(ui.werkzeug) && ui.spiel.moebelArten().some(m => m.id === ui.werkzeug);

// ---- Pixel → Kästchen, und was liegt dort? ----
function punktAus(e) { const r = leinwand.getBoundingClientRect(); return { px: e.clientX - r.left, py: e.clientY - r.top }; }
function feldAus(e) {
  const { px, py } = punktAus(e), a = ui.ansicht, { w, h } = ui.spiel.karte();
  const x = Math.floor((px - a.ox) / a.k), y = Math.floor((py - a.oy) / a.k);
  return { x: Math.max(0, Math.min(w - 1, x)), y: Math.max(0, Math.min(h - 1, y)) };
}
// Auf dem Stand „Evangelisation!“ gewinnt immer der Stand – sonst schnappt sich ein Ehrenamtlicher, der direkt daneben steht,
// oder ein vorbeilaufender Passant den Klick und das Menü lässt sich nicht öffnen (Fehler, Lukas 26.11.).
// Klick-Box = der ganze gezeichnete Stand mit Rand und Schild, nicht mehr nur ein Kästchen (Lukas, 27.11.).
const aufEvangelisationsFeld = e => { const { px, py } = punktAus(e); return evangelisationsStandTrifft(px, py, ui.ansicht, ui.spiel.karte().evangelisation); };
// Klickfläche je nach Zustand (Lukas, 27.11.: seit die Figuren 1,7-mal so schnell laufen): wer läuft, ist größer anklickbar,
// wer sitzt, kleiner – sonst schnappt sich der Nachbar in der Stuhlreihe den Klick. Faktoren und Mindestgrößen: Entwurf von Claude.
const KLICK = {
  mitarbeiter: { steht: [22, 1.1], laeuft: [37, 1.9], sitzt: [12, 0.6] },   // [mindestens Pixel, sonst × Kästchengröße]
  besucher: { steht: [24, 1.2], laeuft: [41, 2.0], sitzt: [12, 0.6] },
  laeuftNoch: 400                                                          // so lange (echte Millisekunden) nach der letzten Bewegung gilt er als laufend
};
// Wer hat sich zuletzt wann bewegt? Wird bei jedem Bild aufgefrischt (figurenMerken, aus start.js) – reine Anzeige, kein Spielwert.
const bewegt = new Map();
export function figurenMerken(karte) {
  const jetzt = performance.now(), gesehen = new Set();
  for (const p of [...karte.personen, ...karte.besucher]) {
    const key = (p.feldX !== undefined ? 'p:' : 'b:') + p.id, alt = bewegt.get(key);
    gesehen.add(key);
    if (!alt) bewegt.set(key, { x: p.x, y: p.y, am: -Infinity });
    else if (alt.x !== p.x || alt.y !== p.y) bewegt.set(key, { x: p.x, y: p.y, am: jetzt });
  }
  for (const key of bewegt.keys()) if (!gesehen.has(key)) bewegt.delete(key);
}
function zustand(key, f) {
  if (f.sitzt) return 'sitzt';
  const b = bewegt.get(key);
  return b && performance.now() - b.am < KLICK.laeuftNoch ? 'laeuft' : 'steht';
}
// Nächste Figur unter dem Mauszeiger, jede mit ihrer eigenen Klickfläche; bei mehreren gewinnt die, deren Mitte am nächsten ist
function naechsteFigur(e, liste, art) {
  const { px, py } = punktAus(e), { k, ox, oy } = ui.ansicht;
  let beste = null, abstand = Infinity;
  for (const f of liste) {
    const [min, faktor] = KLICK[art][zustand((art === 'mitarbeiter' ? 'p:' : 'b:') + f.id, f)];
    const d = Math.hypot(ox + (f.x + 0.5) * k - px, oy + (f.y + 0.5) * k - py);
    if (d < Math.max(min, k * faktor) && d < abstand) { abstand = d; beste = f; }
  }
  return beste;
}
const figurBei = e => aufEvangelisationsFeld(e) ? null : naechsteFigur(e, ui.spiel.karte().personen.filter(p => !p.daheim).map(p => ({ id: p.id, x: p.x, y: p.y, art: p.art })),   // dort, wo man die Figur sieht (sie läuft etwas umher)
  'mitarbeiter');
const besucherBei = e => aufEvangelisationsFeld(e) ? null : naechsteFigur(e, ui.spiel.karte().besucher, 'besucher');
const maschineBei = f => { const m = ui.spiel.moebelBei(f.x, f.y); return m && m.art === 'kaffeemaschine' ? m : null; };
const automatBei = f => { const m = ui.spiel.moebelBei(f.x, f.y); return m && ui.spiel.automatInfo(m.x, m.y) ? m : null; };   // Automaten (26.11.)
const stuhlBei = f => { const m = ui.spiel.moebelBei(f.x, f.y); return m && m.art === 'stuhl' ? m : null; };
const schaukastenBei = f => { const m = ui.spiel.moebelBei(f.x, f.y); return m && m.art === 'schaukasten' ? m : null; };

// Nach jedem Befehl: speichern, Anzeigen auffrischen, neu zeichnen
function fertig() { ui.speichern(); ui.anzeigeErzwingen(); ui.malen(); }

// Kurzer Hinweis in der Editor-Zeile, danach wieder der normale Werkzeug-Hinweis
let hinweisTimer = null;
function kurzerHinweis(text) {
  const h = $('hinweis'); h.textContent = text; h.classList.add('warnung');
  clearTimeout(hinweisTimer);
  hinweisTimer = setTimeout(() => { h.textContent = hinweisFuer(ui.werkzeug); h.classList.remove('warnung'); }, 3000);
}
function abbrechen() { if (ui.ziehen || ui.tragen) { ui.ziehen = null; ui.tragen = null; ui.malen(); } }
// Rechtsklick im Editor, der Reihe nach: laufendes Ziehen abbrechen → Raummenü am Mauszeiger schließen →
// Bauauswahl aufheben (dann baut ein Klick nichts) → aus dem Untermenü zurück ins Hauptmenü der Bauleiste
const raumMenueOffen = () => !!(ui.fenster && ui.fenster.art === 'raumtyp');
function rechtsklick() {
  if (ui.ziehen || ui.tragen) return abbrechen();
  if (!ui.editorOffen) return;
  if (raumMenueOffen()) return fensterSchliessen();
  if (ui.werkzeug) return werkzeugWaehlen(null);
  if (imUntermenue()) hauptmenueZeigen();
}

// Mauszeiger zeigt, was man tun kann
function mauszeiger(e) {
  let c = 'default';
  if (ui.tragen) c = 'grabbing';
  else if (!ui.editorOffen) { const f = feldAus(e); c = figurBei(e) ? 'grab' : besucherBei(e) || maschineBei(f) || automatBei(f) || stuhlBei(f) || schaukastenBei(f) || ui.spiel.veranstaltungsraumBei(f.x, f.y) !== null
      || ui.spiel.kirchkaffeeBei(f.x, f.y) !== null || ui.spiel.torBei(f.x, f.y) || ui.spiel.busBei(f.x, f.y) || aufEvangelisationsFeld(e) ? 'pointer' : 'default'; }
  else if (!ui.werkzeug) { const f = feldAus(e); c = ui.spiel.raumNrBei(f.x, f.y) >= 0 ? 'pointer' : 'default'; }   // nichts gewählt: Raum anklickbar (Raumfunktion)
  else if (ui.werkzeug === 'stuhl' && stuhlBei(feldAus(e))) c = 'pointer';
  else if (istMoebelWerkzeug()) c = 'crosshair';
  else c = ui.werkzeug === 'tuer' || ui.werkzeug === 'fenster' ? 'pointer' : 'crosshair';
  if (leinwand.style.cursor !== c) leinwand.style.cursor = c;
}

function druecken(e) {
  if (e.button === 2) { rechtsklick(); return; }      // Rechtsklick bricht Ziehen bzw. Bauauswahl ab
  if (!ui.editorOffen) {
    const p = figurBei(e);
    // Schichtbetrieb (27.11.): Ehrenamtliche werden im Menü „Mitarbeiter“ eingeteilt – antippen öffnet nur die Charakter-Karte
    if (p && p.art === 'ehrenamt' && ui.spiel.lage().schichtbetrieb) ui.klickStart = { person: p.id };
    else if (p) { leinwand.setPointerCapture(e.pointerId); const a = punktAus(e); ui.tragen = { id: p.id, ...a, start: a, bewegt: false }; ui.malen(); }
    else ui.klickStart = { feld: feldAus(e), besucher: besucherBei(e), stand: aufEvangelisationsFeld(e) };
    return;
  }
  const f = feldAus(e);
  ui.moebelStart = f;
  ui.klickStart = { feld: f };
  if (ZIEH_WERKZEUGE.includes(ui.werkzeug)) {
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
    // Spielansicht: Besucher → Kärtchen, Kaffeemaschine → Menü, Stuhl → Verbessern, Raum mit Veranstaltungen → Raum-Fenster,
    // Kirchkaffee → Öffnungszeiten, Tor → Pforte (Plakat), Feld vor dem Laden → Evangelisation
    const f = feldAus(e), s = ui.klickStart; ui.klickStart = null;
    if (s && s.person) return fensterOeffnen({ art: 'person', id: s.person });
    if (s && s.stand && aufEvangelisationsFeld(e)) return fensterOeffnen({ art: 'evangelisation' });   // Stand vor dem Laden → Menü (große Klick-Box)
    if (!s || s.feld.x !== f.x || s.feld.y !== f.y) return;
    if (s.besucher) return fensterOeffnen({ art: 'besucher', id: s.besucher.id });
    const m = maschineBei(f);
    if (m) return fensterOeffnen({ art: 'maschine', x: m.x, y: m.y });
    const au = automatBei(f);                                        // Automat → Füllstand
    if (au) return fensterOeffnen({ art: 'automat', x: au.x, y: au.y });
    const st = stuhlBei(f);                                          // Stuhl → Verbessern-Menü (statt Raum-Fenster)
    if (st) return fensterOeffnen({ art: 'stuhl', x: st.x, y: st.y });
    const sk = schaukastenBei(f);                                    // Schaukasten → Aushang wählen
    if (sk) return fensterOeffnen({ art: 'schaukasten', x: sk.x, y: sk.y });
    const nr = spiel.veranstaltungsraumBei(f.x, f.y);
    if (nr !== null) return fensterOeffnen({ art: 'raum', nr });
    const fy = spiel.foyerBei(f.x, f.y);
    if (fy !== null) return fensterOeffnen({ art: 'foyer', nr: fy });   // Foyer → was es bringt
    const kk = spiel.kirchkaffeeBei(f.x, f.y);
    if (kk !== null) return fensterOeffnen({ art: 'kaffee', nr: kk });   // Kirchkaffee → Öffnungszeiten
    const bu = spiel.bueroBei(f.x, f.y);
    if (bu !== null) return fensterOeffnen({ art: 'buero', nr: bu });   // Büro → Orga-Tokens und Boni (27.11.)
    const lg = spiel.lagerBei(f.x, f.y);
    if (lg !== null) return fensterOeffnen({ art: 'lager', nr: lg });   // Lager → Logistik-Zeiten (27.11.)
    if (spiel.torBei(f.x, f.y)) return fensterOeffnen({ art: 'tor' });
    if (spiel.busBei(f.x, f.y)) fensterOeffnen({ art: 'bus' });
    return;
  }
  const f = feldAus(e);
  if (ui.ziehen) {
    const v = ui.ziehen; ui.ziehen = null;
    if (v.art === 'wand') {   // bei Möbeln im Weg baut das Spiel nicht; ohne genug Geld auch nicht (Baukosten)
      const pv = spiel.wandVorschau(v.x0, v.y0, v.x1, v.y1);
      if (spiel.wandBauen(v.x0, v.y0, v.x1, v.y1) === 'geld') kurzerHinweis(TEXTE.bauGeld.wand(euro(pv.kosten), pv.stuecke));
    }
    else if (v.art === 'strasse') {
      const r = spiel.strasseBauen(v.x0, v.y0, v.x1, v.y1);
      if (r.ergebnis === 'geld') kurzerHinweis(r.gebaut ? TEXTE.aussenMeldung.strasseGeld : TEXTE.nichtGenugGeld(TEXTE.aussenMeldung.strasse, euro(spiel.moebelArten().find(m => m.id === 'strasse').kosten)));
      else if (r.ergebnis === 'platz' && spiel.raumNrBei(v.x0, v.y0) >= 0) kurzerHinweis(TEXTE.aussenMeldung.innen);
    }
    else if (v.art === 'weg') {
      const r = spiel.wegBauen(v.x0, v.y0, v.x1, v.y1), typ = spiel.moebelArten().find(m => m.id === 'weg');
      if (r.ergebnis === 'geld') kurzerHinweis(r.gebaut ? TEXTE.aussenMeldung.wegGeld : TEXTE.nichtGenugGeld(typ.name, euro(typ.kosten)));
      else if (r.ergebnis === 'platz' && spiel.raumNrBei(v.x0, v.y0) >= 0) kurzerHinweis(TEXTE.aussenMeldung.innenDeko);
    }
    else spiel.abreissen(v.x0, v.y0, v.x1, v.y1);
    return fertig();
  }
  if (istMoebelWerkzeug()) {
    const s = ui.moebelStart;
    if (!s || s.x !== f.x || s.y !== f.y) return;                    // nur Tippen, kein Ziehen
    if (ui.werkzeug === 'stuhl' && stuhlBei(f)) return fensterOeffnen({ art: 'stuhl', x: f.x, y: f.y });   // Stuhl verbessern
    const ergebnis = spiel.moebelKaufen(ui.werkzeug, f.x, f.y, ui.dreh);      // entfernen nur per Abriss
    const typ = spiel.moebelArten().find(m => m.id === ui.werkzeug);
    if (ergebnis === 'geld') {
      kurzerHinweis(typ.id === 'stuhl' ? TEXTE.stuhl.nichtGenugGeld(euro(typ.kosten)) : TEXTE.nichtGenugGeld(typ.name, euro(typ.kosten)));
    } else if (ergebnis === 'grenze') kurzerHinweis(TEXTE.grenze[ui.werkzeug]);
    else if (ergebnis === 'innen') kurzerHinweis(typ.gelaende ? TEXTE.aussenMeldung.innenDeko : TEXTE.aussenMeldung.innen);
    else if (ergebnis === 'bekanntheit') kurzerHinweis(typ.id === 'parkplatz' ? TEXTE.aussenMeldung.bekanntheit(typ.abBekanntheit) : TEXTE.aussenMeldung.bekanntheitTeil(typ.name, typ.abBekanntheit));
    else if (ergebnis === 'tor') kurzerHinweis(TEXTE.aussenMeldung.tor);
    return fertig();
  }
  if (ui.werkzeug === 'tuer') {
    if (spiel.tuerUmschalten(f.x, f.y) === 'geld') kurzerHinweis(TEXTE.bauGeld.tuer(euro(spiel.baukosten().tuer)));
    return fertig();
  }
  if (ui.werkzeug === 'fenster') {
    if (spiel.fensterUmschalten(f.x, f.y) === 'geld') kurzerHinweis(TEXTE.bauGeld.fenster(euro(spiel.baukosten().fenster)));
    return fertig();
  }
  // Nichts zum Bauen gewählt (26.11.): Klick in einen Raum → Raumfunktion wählen, das Menü erscheint neben dem Mauszeiger.
  // Klick daneben (kein Raum) schließt es; dort, wo kein Raum ist, passiert sonst nichts.
  if (!ui.werkzeug) {
    const s = ui.klickStart; ui.klickStart = null;
    if (!s || s.feld.x !== f.x || s.feld.y !== f.y) return;     // nur Tippen, kein Ziehen
    const nr = spiel.raumNrBei(f.x, f.y);
    if (nr >= 0) fensterOeffnen({ art: 'raumtyp', nr, zeiger: { x: e.clientX, y: e.clientY } }); else fensterSchliessen();
  }
}

// Parkplatz drehen (quer ↔ längs)
const drehbar = () => { const m = ui.spiel.moebelArten().find(x => x.id === ui.werkzeug); return !!(m && m.drehbar); };   // Baum 2×2: nicht drehbar
function drehen() { if (drehbar()) { ui.dreh = !ui.dreh; ui.malen(); } }

function editorUmschalten(offen) {
  ui.editorOffen = offen; ui.ziehen = null; ui.tragen = null;
  if (offen) hauptmenueZeigen();                             // Bauleiste startet im Hauptmenü, nichts gewählt
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

  // Escape: erst Ziehen abbrechen, dann Fenster schließen (auch das Raummenü), dann Untermenü der Bauleiste, dann Editor schließen, dann Hauptmenü öffnen
  document.addEventListener('keydown', e => {
    if ((e.key === 'r' || e.key === 'R') && ui.editorOffen && !e.target.closest('input')) { drehen(); return; }
    if (e.key !== 'Escape') return;
    if (ui.menueOffen) return menueEscape();
    if (ui.ziehen || ui.tragen) return abbrechen();
    if (fensterOffen()) return fensterSchliessen();
    if (ui.editorOffen && imUntermenue()) return hauptmenueZeigen();   // Bauleiste: aus dem Untermenü zurück (26.11.)
    if (ui.editorOffen) return editorUmschalten(false);
    menueOeffnen();   // nichts mehr offen: Hauptmenü
  });

  bauleisteEinrichten({
    beiWahl: id => { $('hinweis').textContent = hinweisFuer(id); $('hinweis').classList.remove('warnung'); $('drehen').hidden = !drehbar(); fensterSchliessen(); ui.malen(); },
    beiMenue: () => { $('hinweis').textContent = hinweisFuer(null); $('hinweis').classList.remove('warnung'); fensterSchliessen(); },
    beiBus: () => { $('hinweis').textContent = HINWEISE.bushaltestelle; fensterOeffnen({ art: 'bus' }); }
  });
  $('drehen').textContent = TEXTE.bauleiste.drehen;
  $('drehen').addEventListener('click', drehen);
  werkzeugWaehlen(ui.werkzeug);
  $('zurueck').addEventListener('click', () => { if (ui.spiel.rueckgaengig()) { ui.fenster = null; fensterSchliessen(); fertig(); } });
  hauptmenueEinrichten(zuruecksetzen, () => ui.speichern());
  $('hauptmenueAuf').addEventListener('click', () => menueOeffnen(() => { ui.fenster = null; fensterSchliessen(); }));
  $('testGeld').textContent = TEXTE.testGeld;
  $('testGeldBetrag').setAttribute('aria-label', TEXTE.testGeldFeld);
  $('testGeld').addEventListener('click', () => { if (ui.spiel.testGeld($('testGeldBetrag').value) === 'ok') fertig(); });
  sicherKnopf($('neu'), TEXTE.seite.neu, TEXTE.seite.neuSicher, zuruecksetzen);
  $('editorAuf').addEventListener('click', () => editorUmschalten(true));
  $('editorZu').addEventListener('click', () => editorUmschalten(false));
  $('hinweis').textContent = hinweisFuer(ui.werkzeug);
}
