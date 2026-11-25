// Anzeigen: Leiste oben (Geld, Bekanntheit, Zeit-Knöpfe), Datum mit Kirchenjahr-Rad, Seitenleiste, Hinweis unten rechts.
// Holt sich alles über spiel.lage() und macht daraus nur Text.
import { TEXTE } from '../inhalte/texte.js';
import { ui, $, euro } from './ui.js';
import { VERSION } from '../version.js';
import { fensterAktualisieren, fensterOeffnen } from './fenster.js';

const LISTE = { hauptamt: 'listeHauptamt', ehrenamt: 'listeEhrenamt' };
const LEERTEXT = { hauptamt: 'Noch keine Hauptamtlichen', ehrenamt: 'Noch keine Ehrenamtlichen' };
let letzteListe = '', letzteZeit = 0, letztesRad = '';

export function anzeigenEinrichten() {
  ui.anzeigeErzwingen = () => { letzteZeit = 0; };
  document.querySelector('.seitenleiste').addEventListener('click', e => {
    const li = e.target.closest('li[data-person]');
    if (li) fensterOeffnen({ art: 'person', id: li.dataset.person });
  });
  document.querySelectorAll('[data-tempo]').forEach(b => {
    b.textContent = TEXTE.tempo[b.dataset.tempo];
    b.addEventListener('click', () => { ui.spiel.tempoSetzen(Number(b.dataset.tempo)); ui.speichern(); ui.anzeigeErzwingen(); ui.malen(); });
  });
  for (const m of ui.spiel.moebelArten()) { const el = $('preis-' + m.id); if (el) el.textContent = euro(m.kosten); }
  $('textBekanntheit').textContent = TEXTE.bekanntheit;
  $('textKonto').textContent = TEXTE.kontostand;
  $('textLetzter').textContent = TEXTE.besucherLetzter;
  $('textHeim').textContent = TEXTE.besucherHeim;
  $('textStamm').textContent = TEXTE.besucherStamm;
  $('menschenAuf').textContent = TEXTE.menschen.knopf;
  $('menschenAuf').addEventListener('click', () => fensterOeffnen({ art: 'menschen' }));
  $('versionAuf').textContent = TEXTE.changelog.version(VERSION);
  $('versionAuf').addEventListener('click', () => fensterOeffnen({ art: 'changelog' }));
}

export function anzeigenAktualisieren() {
  const jetzt = performance.now();
  if (jetzt - letzteZeit < 100) return;   // höchstens 10-mal pro Sekunde
  letzteZeit = jetzt;
  const l = ui.spiel.lage();
  $('anzHauptamt').textContent = `${l.verfuegbarkeit.hauptamt.frei}/${l.verfuegbarkeit.hauptamt.gesamt}`;
  $('anzEhrenamt').textContent = `${l.verfuegbarkeit.ehrenamt.frei}/${l.verfuegbarkeit.ehrenamt.gesamt}`;
  personenListen(l.personen);
  for (const id of ['kontostand', 'kontoEditor', 'kontoKurz', 'kontoOben']) $(id).textContent = euro(l.konto);
  $('bekanntheit').textContent = l.bekanntheit;
  const lg = l.letzterGottesdienst;
  $('besucherLetzter').textContent = lg ? lg.besucher : '–';
  $('besucherKurz').textContent = lg ? lg.besucher : '–';
  $('besucherHeim').textContent = lg ? lg.heim : '–';
  $('besucherStamm').textContent = l.bekannteBesucher;
  $('progEinnahmen').textContent = euro(l.finanzen.einnahmen);
  $('progAusgaben').textContent = euro(l.finanzen.ausgaben);
  const uhr = `${String(l.stunde).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}`;
  $('uhr').textContent = TEXTE.zeitAnzeige(l.woche, TEXTE.tage[l.tag], uhr);
  $('countdown').textContent = TEXTE.countdown(l.tageBisSonntag);
  $('sonntag').textContent = `${l.sonntag.name} · ${l.sonntag.datum} · ${l.kirchenjahr.aktuell.name}`;
  radZeichnen(l.kirchenjahr);
  document.querySelectorAll('[data-tempo]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.tempo) === l.tempo)));
  $('spielHinweis').textContent = hinweisText(l.status);
  $('meldung').textContent = l.meldung ? TEXTE.meldung[l.meldung.code](l.meldung.name) : '';
  // Offene Seelsorge-Anfrage: Dialog nach vorn holen (die Zeit steht, bis er beantwortet ist)
  if (l.seelsorge && (!ui.fenster || ui.fenster.art !== 'seelsorge')) ui.fenster = { art: 'seelsorge', angenommen: false };
  fensterAktualisieren();
}

// Personenlisten nur neu aufbauen, wenn sich etwas geändert hat (sonst flackert die Maus-Hervorhebung)
function personenListen(personen) {
  const schluessel = JSON.stringify(personen);
  if (schluessel === letzteListe) return;
  letzteListe = schluessel;
  for (const art of ['hauptamt', 'ehrenamt']) {
    const ul = $(LISTE[art]); ul.replaceChildren();
    const eigene = personen.filter(x => x.art === art);
    if (!eigene.length) { const li = document.createElement('li'); li.className = 'leer'; li.textContent = LEERTEXT[art]; ul.append(li); }
    for (const x of eigene) {
      const li = document.createElement('li'), n = document.createElement('span'), o = document.createElement('small');
      n.textContent = x.name; o.textContent = x.einsatz || 'verfügbar'; li.append(n, o); li.dataset.person = x.id;
      ul.append(li);
    }
  }
}

// Hinweis unten rechts: Das Spiel meldet einen Zustand, hier wird der passende Text gewählt.
function hinweisText(s) {
  if (s.phase === 'anreise' || s.phase === 'gottesdienst' || s.phase === 'kirchkaffee') return TEXTE.laeuft[s.phase] + (s.heim ? ' ' + TEXTE.heimgeschickt(s.heim) : '');
  if (s.phase === 'ausgefallen') return TEXTE.ausgefallen;
  if (s.phase === 'vorbei') return TEXTE.heimgeschickt(s.heim);
  if (s.fehlt === 'raum') return TEXTE.fehltRaum;
  if (s.fehlt === 'veranstaltung') return TEXTE.fehltVeranstaltung;
  if (s.fehlt === 'leitung') return TEXTE.fehltLeitung;
  return '';
}

// Kirchenjahr-Rad: Abschnitte wie Tortenstücke, Zeiger wie bei einer Uhr (oben = 1. Advent, im Uhrzeigersinn)
function radZeichnen(stand) {
  const schluessel = stand.fortschritt.toFixed(4);
  if (schluessel === letztesRad) return;
  letztesRad = schluessel;
  const punkt = (a, r) => [Math.sin(a * 2 * Math.PI) * r, -Math.cos(a * 2 * Math.PI) * r].map(n => n.toFixed(2)).join(' ');
  const stuecke = stand.zeiten.map(zt => {
    const gross = zt.bis - zt.von > 0.5 ? 1 : 0;
    return `<path d="M0 0 L${punkt(zt.von, 46)} A46 46 0 ${gross} 1 ${punkt(zt.bis, 46)} Z" fill="${zt.farbe}" stroke="#2b2a27" stroke-width="1.5"><title>${zt.name}</title></path>`;
  }).join('');
  const [sx, sy] = punkt(stand.fortschritt, 40).split(' ');
  $('rad').innerHTML = `${stuecke}<circle r="46" fill="none" stroke="#2b2a27" stroke-width="2"/>
    <line x1="0" y1="0" x2="${sx}" y2="${sy}" stroke="#d6362b" stroke-width="4" stroke-linecap="round"/>
    <circle r="5" fill="#d6362b"/>`;
}
