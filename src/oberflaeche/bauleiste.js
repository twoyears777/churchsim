// Bauleiste unten im Bau-Modus: Reiter (Kategorien) links, Kärtchen mit Bild, Name und Preis in der Mitte,
// Abriss, Kontostand, Rückgängig und Fertig rechts. Welche Möbel es gibt und was sie kosten, kommt vom Spiel.
import { TEXTE } from '../inhalte/texte.js';
import { ui, $, euro, esc } from './ui.js';
import { symbolZeichnen } from '../ansicht/zeichnen.js';

const T = TEXTE.bauleiste;
const KATEGORIEN = ['bauen', 'gottesdienst', 'kirchkaffee', 'deko', 'aussen'];
const SYMBOL = { bauen: 'wand', gottesdienst: 'kanzel', kirchkaffee: 'kaffeemaschine', deko: 'blumen', aussen: 'parkplatz' };
const WERKZEUGE = { bauen: ['wand', 'tuer', 'raum'] };          // Werkzeuge ohne Preis
let kategorie = 'bauen', aufWahl = () => {}, aufBus = () => {};

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
  const m = ui.spiel.moebelArten().find(x => x.id === id);
  if (m && m.auchIn.includes(kategorie)) return kategorie;   // z. B. Stuhl: steht auch unter „Kirchkaffee“ – Reiter bleibt
  return m ? m.kategorie : null;
}
function eintraege(kat) {
  if (WERKZEUGE[kat]) return WERKZEUGE[kat].map(id => ({ id, name: T.werkzeuge[id], werkzeug: true }));
  const liste = ui.spiel.moebelArten().filter(m => m.kategorie === kat || m.auchIn.includes(kat));
  if (kat === 'aussen') liste.push({ id: 'bushaltestelle', name: T.werkzeuge.bushaltestelle, fenster: true });
  return liste;
}

function reiterBauen() {
  $('bauReiter').innerHTML = KATEGORIEN.map(k => `<button role="tab" data-kategorie="${k}" aria-selected="${k === kategorie}">
    ${symbol(SYMBOL[k])}<span>${T.kategorien[k]}</span></button>`).join('');
  symboleMalen($('bauReiter'));
}
function kartenBauen() {
  $('bauKarten').innerHTML = eintraege(kategorie).map(e => `<button class="bau-karte" ${e.fenster ? 'data-bus' : `data-werkzeug="${e.id}"`} aria-pressed="false">
      ${symbol(e.id)}<span class="name">${esc(e.name)}</span><small class="preis" data-preis="${e.id}"></small></button>`).join('');
  symboleMalen($('bauKarten'));
  bauleisteAktualisieren();
}

// Werkzeug wählen (auch von außen, z. B. beim Start)
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
  const arten = ui.spiel.moebelArten(), stand = JSON.stringify([kategorie, ui.werkzeug, arten.map(m => [m.leistbar, m.gesperrt])]);
  if (stand === letzterStand) return;
  letzterStand = stand;
  for (const el of document.querySelectorAll('.bauleiste [data-preis]')) {
    const m = arten.find(x => x.id === el.dataset.preis), karte = el.closest('button');
    if (!m) { el.textContent = ''; continue; }
    el.textContent = m.gesperrt ? T.abBekanntheit(m.abBekanntheit) : euro(m.kosten);
    karte.classList.toggle('zu-teuer', !m.leistbar);
    karte.classList.toggle('gesperrt', !!m.gesperrt);
  }
  for (const b of document.querySelectorAll('.bauleiste [data-werkzeug]')) b.setAttribute('aria-pressed', b.dataset.werkzeug === ui.werkzeug);
}

export function bauleisteEinrichten({ beiWahl, beiBus }) {
  aufWahl = beiWahl; aufBus = beiBus;
  $('textAbriss').textContent = T.werkzeuge.abriss;
  symboleMalen(document.querySelector('.bau-rechts'));
  reiterBauen(); kartenBauen();
  document.querySelector('.bauleiste').addEventListener('click', e => {
    const r = e.target.closest('[data-kategorie]');
    if (r) {
      kategorie = r.dataset.kategorie; reiterBauen(); kartenBauen();
      const erstes = eintraege(kategorie).find(x => !x.fenster);
      if (erstes) werkzeugWaehlen(erstes.id);
      return;
    }
    if (e.target.closest('[data-bus]')) return aufBus();
    const w = e.target.closest('[data-werkzeug]');
    if (w) werkzeugWaehlen(w.dataset.werkzeug);
  });
}
