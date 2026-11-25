// Zustand der Bedienung – nur, was die Oberfläche selbst betrifft (welches Werkzeug, was gerade gezogen wird,
// welches Fenster offen ist). Der Spielstand selbst liegt im Kern und wird nur über `ui.spiel` angesprochen.
export const ui = {
  spiel: null,                       // die Schalterwand zum Spiel (kern/spiel.js)
  werkzeug: 'wand',
  editorOffen: false,
  ziehen: null,                      // Rechteck, das gerade gezogen wird (Wand/Abriss)
  tragen: null,                      // Mitarbeiter, der gerade getragen wird
  fenster: null,                     // offenes Fenster: { art: 'raumtyp'|'raum'|'maschine'|'besucher'|'person', … }
  schwebe: null, maus: null, klickStart: null, moebelStart: null,
  ansicht: { k: 16, ox: 0, oy: 0 },  // Kästchengröße und Versatz der Karte in Pixeln
  malen: () => {},                   // wird in start.js gesetzt
  anzeigeErzwingen: () => {},        // wird in anzeigen.js gesetzt
  speichern: () => {}                // wird in start.js gesetzt
};
export const $ = id => document.getElementById(id);
export const euro = n => `${n.toLocaleString('de-DE')} €`;
export const zahl1 = n => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
