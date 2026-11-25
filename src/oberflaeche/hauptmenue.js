// Hauptmenü: erscheint beim Öffnen der App und über Escape bzw. den Knopf „Hauptmenü“ unten links.
// Solange es offen ist, steht die Zeit (start.js meldet dem Spiel dann keine Zeit).
// „Neues Spiel“ setzt über die Schalterwand (spiel.zuruecksetzen) neu auf – die Oberfläche ändert den Spielstand nicht selbst.
import { ui, $ } from './ui.js';
import { TEXTE } from '../inhalte/texte.js';
import { hatSpielstand } from './speicher.js';

const T = TEXTE.hauptmenue;
let rueckfrage = false;

function zeigen() {
  const m = $('hauptmenue');
  m.hidden = !ui.menueOffen;
  document.body.classList.toggle('menue-offen', ui.menueOffen);
  $('menueKnoepfe').hidden = rueckfrage;
  $('menueRueckfrage').hidden = !rueckfrage;
  $('menueWeiter').disabled = !hatSpielstand();
  if (ui.menueOffen) (rueckfrage ? $('menueAbbrechen') : ($('menueWeiter').disabled ? $('menueNeu') : $('menueWeiter'))).focus();
}

export function menueOeffnen(schliessenVorher) {
  if (schliessenVorher) schliessenVorher();
  ui.menueOffen = true; rueckfrage = false; zeigen(); ui.malen();
}
export function menueSchliessen() { ui.menueOffen = false; rueckfrage = false; zeigen(); }

// Escape im Menü: Rückfrage abbrechen, sonst weiterspielen (wenn es einen Spielstand gibt)
export function menueEscape() {
  if (rueckfrage) { rueckfrage = false; zeigen(); return; }
  if (hatSpielstand()) menueSchliessen();
}

export function hauptmenueEinrichten(neuesSpiel) {
  $('menueTitel').textContent = T.titel;
  $('menueWeiter').textContent = T.weiterspielen;
  $('menueNeu').textContent = T.neuesSpiel;
  $('menueFrage').textContent = T.rueckfrage;
  $('menueJa').textContent = T.neuStarten;
  $('menueAbbrechen').textContent = T.abbrechen;
  $('hauptmenueAuf').textContent = T.knopf;

  $('menueWeiter').addEventListener('click', menueSchliessen);
  $('menueNeu').addEventListener('click', () => {
    if (!hatSpielstand()) { neuesSpiel(); menueSchliessen(); return; }   // noch nichts gespeichert: nichts zu überschreiben
    rueckfrage = true; zeigen();
  });
  $('menueJa').addEventListener('click', () => { neuesSpiel(); menueSchliessen(); });
  $('menueAbbrechen').addEventListener('click', () => { rueckfrage = false; zeigen(); });

  ui.menueOffen = true;   // beim Öffnen der App startet man im Hauptmenü
  zeigen();
}
