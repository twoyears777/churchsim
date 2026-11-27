// Bauleiste unten im Bau-Modus. Zwei Ebenen (Lukas, 26.11.):
// - Hauptmenü: nur die Kacheln der Menüpunkte (Bauen, Gottesdienstraum, …).
// - Untermenü: nach Klick auf einen Menüpunkt verschwinden die anderen; ganz links steht eine andersfarbige Zurück-Kachel
//   mit dem Bild des Menüpunkts, daneben die Kärtchen mit Bild, Name und Preis.
// Rechts immer: Abriss, Kontostand, Rückgängig und Fertig. Welche Möbel es gibt und was sie kosten, kommt vom Spiel.
import { TEXTE } from '../inhalte/texte.js';
import { ui, $, euro, esc } from './ui.js';
import { symbolZeichnen } from '../ansicht/zeichnen.js';

const T = TEXTE.bauleiste;
const KATEGORIEN = ['bauen', 'gottesdienst', 'kirchkaffee', 'gemeindesaal', 'foyer', 'toiletten', 'lager', 'buero', 'deko', 'aussen'];
const SYMBOL = { bauen: 'wand', gottesdienst: 'kanzel', kirchkaffee: 'kaffeemaschine', gemeindesaal: 'klavier', foyer: 'garderobe', toiletten: 'wc', lager: 'regal', buero: 'schreibtisch', deko: 'blumen', aussen: 'parkplatz' };
const WERKZEUGE = { bauen: ['wand', 'tuer', 'fenster'] };   // Werkzeuge mit Preis (Baukosten); „Raum festlegen“ ist seit 26.11. ein Klick in den Raum
const BAUKOSTEN_KARTEN = ['wand', 'tuer', 'fenster', 'buehne'];
const BODEN = { gottesdienst: ['buehne'] };   // Bodentypen zum Aufziehen (27.11.: Bühne) – stehen vor den Möbeln ihres Menüpunkts
// kategorie: geöffneter Menüpunkt, null = Hauptmenü
let kategorie = null, aufWahl = () => {}, aufBus = () => {}, aufMenue = () => {};

const symbol = id => `<canvas class="symbol" data-symbol="${id}" width="56" height="56"></canvas>`;
function symboleMalen(wurzel) {
  for (const c of wurzel.querySelectorAll('canvas[data-symbol]')) {
    const g = c.width, ctx = c.getContext('2d');
    symbolZeichnen(ctx, c.dataset.symbol, g);
  }
}
// Kategorie eines Werkzeugs (für den passenden Reiter)
function kategorieVon(id) {
  if (WERKZEUGE.bauen.includes(id)) return 'bauen';
  for (const [k, liste] of Object.entries(BODEN)) if (liste.includes(id)) return k;
  const m = ui.spiel.moebelArten().find(x => x.id === id);
  if (m && m.auchIn.includes(kategorie)) return kategorie;   // z. B. Stuhl: steht auch unter „Kirchkaffee“ – Reiter bleibt
  return m ? m.kategorie : null;
}
function eintraege(kat) {
  if (WERKZEUGE[kat]) return WERKZEUGE[kat].map(id => ({ id, name: T.werkzeuge[id], werkzeug: true }));
  const liste = [...(BODEN[kat] || []).map(id => ({ id, name: T.werkzeuge[id], werkzeug: true })),
    ...ui.spiel.moebelArten().filter(m => m.kategorie === kat || m.auchIn.includes(kat))];
  if (kat === 'aussen') liste.push({ id: 'bushaltestelle', name: T.werkzeuge.bushaltestelle, fenster: true });
  return liste;
}

// Hauptmenü: alle Menüpunkte. Untermenü: nur die Zurück-Kachel (Bild des Menüpunkts, ohne Wort).
function reiterBauen() {
  $('bauReiter').innerHTML = kategorie
    ? `<button class="zurueck-kachel" data-zurueck title="${esc(T.kategorien[kategorie])}" aria-label="${esc(T.kategorien[kategorie])}">${symbol(SYMBOL[kategorie])}</button>`
    : KATEGORIEN.map(k => `<button data-kategorie="${k}">${symbol(SYMBOL[k])}<span>${T.kategorien[k]}</span></button>`).join('');
  symboleMalen($('bauReiter'));
  document.querySelector('.bauleiste').classList.toggle('im-untermenue', !!kategorie);
}
function kartenBauen() {
  $('bauKarten').hidden = !kategorie;
  $('bauKarten').innerHTML = !kategorie ? '' : eintraege(kategorie).map(e => `<button class="bau-karte" ${e.fenster ? 'data-bus' : `data-werkzeug="${e.id}"`} aria-pressed="false">
      ${symbol(e.id)}<span class="name">${esc(e.name)}</span><small class="preis" data-preis="${e.id}"></small></button>`).join('');
  symboleMalen($('bauKarten'));
  bauleisteAktualisieren();
}

// Menüpunkt öffnen (k) bzw. zurück ins Hauptmenü (null). Dabei ist nichts mehr zum Bauen gewählt.
function menueWechseln(k) {
  kategorie = k; reiterBauen(); kartenBauen();
  if (ui.werkzeug) werkzeugWaehlen(null); else aufMenue();
}
export const imUntermenue = () => !!kategorie;
export const hauptmenueZeigen = () => menueWechseln(null);

// Werkzeug wählen (auch von außen); null = nichts gewählt (Menü bleibt, wo es ist)
export function werkzeugWaehlen(id) {
  ui.werkzeug = id;
  const k = kategorieVon(id);
  if (k && k !== kategorie) { kategorie = k; reiterBauen(); kartenBauen(); }
  for (const b of document.querySelectorAll('.bauleiste [data-werkzeug]')) b.setAttribute('aria-pressed', b.dataset.werkzeug === id);
  aufWahl(id);
}

// Preise, „zu teuer“ und „gesperrt“ auffrischen (nach jedem Kauf und wenn sich das Geld ändert)
let letzterStand = '';
export function bauleisteAktualisieren() {
  const arten = ui.spiel.moebelArten(), bk = ui.spiel.baukosten();
  const stand = JSON.stringify([kategorie, ui.werkzeug, arten.map(m => [m.leistbar, m.gesperrt, m.forschung]), bk.wandLeistbar, bk.tuerLeistbar, bk.fensterLeistbar, bk.buehneLeistbar]);
  if (stand === letzterStand) return;
  letzterStand = stand;
  for (const el of document.querySelectorAll('.bauleiste [data-preis]')) {
    const m = arten.find(x => x.id === el.dataset.preis), karte = el.closest('button');
    if (BAUKOSTEN_KARTEN.includes(el.dataset.preis)) {   // Baukosten: Wand je Stück, Tür (26.11.) und Fenster zusätzlich zur Wand
      const id = el.dataset.preis;
      el.textContent = id === 'wand' ? T.jeStueck(euro(bk.wand)) : euro(bk[id]);
      karte.classList.toggle('zu-teuer', !bk[id + 'Leistbar']);
      continue;
    }
    if (!m) { el.textContent = ''; continue; }
    el.textContent = m.gesperrt ? (m.forschung ? T.forschung(m.forschung) : T.abBekanntheit(m.abBekanntheit)) : euro(m.kosten) + (m.gelaende ? ' · ' + TEXTE.gelaendeKarte(m.gelaende) : '');   // Außendeko: + Gelände-Punkte
    karte.classList.toggle('zu-teuer', !m.leistbar);
    karte.classList.toggle('gesperrt', !!m.gesperrt);
  }
  for (const b of document.querySelectorAll('.bauleiste [data-werkzeug]')) b.setAttribute('aria-pressed', b.dataset.werkzeug === ui.werkzeug);
}

// Spicker am rechten Rand (Lukas, 27.11.): welcher Raum wie groß sein muss – man sieht es, bevor man die Wände zieht.
// Nur im Bau-Modus sichtbar (Klasse „editor“); Klicks gehen hindurch auf die Karte.
function spickerBauen() {
  const S = TEXTE.raumSpicker;
  $('raumSpicker').innerHTML = `<b>${esc(S.titel)}</b>` + ui.spiel.raumtypen().map(t =>
    `<span class="zeile"><i style="background:${t.farbe}"></i><span class="name">${esc(t.name)}</span><span class="mass">${esc(S.groesse(t.minGroesse[0], t.minGroesse[1]))}</span></span>`).join('');
}

export function bauleisteEinrichten({ beiWahl, beiBus, beiMenue }) {
  aufWahl = beiWahl; aufBus = beiBus; aufMenue = beiMenue || (() => {});
  spickerBauen();
  $('textAbriss').textContent = T.werkzeuge.abriss;
  symboleMalen(document.querySelector('.bau-rechts'));
  reiterBauen(); kartenBauen();
  document.querySelector('.bauleiste').addEventListener('click', e => {
    const r = e.target.closest('[data-kategorie]');
    if (r) return menueWechseln(r.dataset.kategorie);      // Untermenü öffnen – noch nichts gewählt
    if (e.target.closest('[data-zurueck]')) return menueWechseln(null);   // Zurück-Kachel: ins Hauptmenü
    if (e.target.closest('[data-bus]')) return aufBus();
    const w = e.target.closest('[data-werkzeug]');
    if (w) werkzeugWaehlen(w.dataset.werkzeug);
  });
}
