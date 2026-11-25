// Fenster: Raumfunktion (Editor), Raum-Fenster (Gottesdienstraum), Kaffeemaschine, Besucher-Kärtchen, Mitarbeiter-Karte.
// Inhalte kommen als Zahlen und Zustände vom Spiel; hier wird nur HTML daraus. Knöpfe schicken Befehle ans Spiel.
import { KEINE_VERANSTALTUNG } from '../inhalte/veranstaltungen.js';
import { TEXTE } from '../inhalte/texte.js';
import { ui, $, euro, zahl1, esc } from './ui.js';

const maske = () => $('maske');
const ART_TEXT = { hauptamt: 'Hauptamtlich', ehrenamt: 'Ehrenamtlich' };
let letzterInhalt = '';

export function fensterOeffnen(f) { ui.fenster = f; letzterInhalt = ''; ui.anzeigeErzwingen(); ui.malen(); }
export function fensterSchliessen() { ui.fenster = null; maske().hidden = true; letzterInhalt = ''; ui.malen(); }
export function fensterOffen() { return !maske().hidden; }

// Wird bei jeder Anzeige-Aktualisierung aufgerufen; baut das Fenster nur neu, wenn sich der Inhalt geändert hat.
export function fensterAktualisieren() {
  const f = ui.fenster, m = maske();
  if (!f) { m.hidden = true; return; }
  const inhalt = { raumtyp: raumTypFenster, raum: raumFenster, maschine: maschinenFenster, besucher: besucherKarte, person: personenKarte }[f.art](f);
  if (inhalt === null) { ui.fenster = null; m.hidden = true; return; }
  m.classList.toggle('breit', f.art === 'raum');
  if (inhalt !== letzterInhalt) { letzterInhalt = inhalt; m.querySelector('.inhalt').innerHTML = inhalt; }
  m.hidden = false;
}

// Raumfunktion festlegen (Editor)
function raumTypFenster(f) {
  const w = ui.spiel.raumtypWahl(f.nr);
  if (!w) return null;
  const zeilen = w.typen.map(t => {
    const groesse = `${t.minGroesse[0]} × ${t.minGroesse[1]}`;
    return `<button class="typ${t.aktiv ? ' aktiv' : ''}" data-typ="${t.id}" ${t.zuKlein ? 'disabled' : ''}>
      <span class="farbe" style="background:${t.farbe}"></span><span><b>${t.name}</b><small>${t.zuKlein ? `zu klein, mind. ${groesse}` : `mind. ${groesse}`}</small></span></button>`;
  }).join('');
  return `<h2>Raumfunktion</h2>
    ${w.tueren === 0 ? '<p class="warnung">Dieser Raum hat noch keine Tür.</p>' : ''}
    <div class="typen">${zeilen}</div>
    <div class="zeile">${w.hatTyp ? '<button data-typ="">Funktion entfernen</button>' : ''}<button data-zu>Schließen</button></div>`;
}

// Charakter-Karte eines Mitarbeiters
function personenKarte(f) {
  const p = ui.spiel.personInfo(f.id);
  if (!p) return null;
  return `<h2>${esc(p.name)}</h2>
    <p class="unter">${ART_TEXT[p.art]} · ${p.einsatz ? 'Im Einsatz: ' + p.einsatz : 'Verfügbar'}</p>
    <h3>Skills</h3><p class="leer">Skills folgen später</p>
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Raum-Fenster in der Spielansicht (Gottesdienstraum): Veranstaltung, Wochenplan, Mitarbeiter, Prognose
function raumFenster(f) {
  const r = ui.spiel.raumInfo(f.nr);
  if (!r) return null;
  const T = TEXTE.raum;
  // Bedingung mit Prüfung: grün/rot, je nachdem, was das Spiel meldet
  const bedingung = t => typeof t === 'string' ? `<li>${t}</li>` : `<li class="${r.bedingungen[t.bedingung] ? 'ok' : 'fehlt'}">${t.text}</li>`;
  const kachel = (id, name, k) => `<button class="kachel${(r.veranstaltung || '') === id ? ' aktiv' : ''}" data-veranstaltung="${id}">
      <b>${name}</b>
      <span class="klein">${TEXTE.bringt}</span><ul>${k.bringt.map(t => `<li>${t}</li>`).join('')}</ul>
      <span class="klein">${TEXTE.bedingungen}</span><ul>${k.bedingungen.map(bedingung).join('')}</ul></button>`;
  const kacheln = r.moeglich.map(v => kachel(v.id, v.name, TEXTE.veranstaltungKacheln[v.id])).join('')
    + kachel('', KEINE_VERANSTALTUNG, TEXTE.veranstaltungKacheln.keine);
  let plan = '';
  if (r.veranstaltung) {
    const kopf = TEXTE.tageKurz.map(t => `<th>${t}</th>`).join('');
    const reihen = r.slots.map(s => `<tr><th class="slot">${T.slots[s.id]}<small>${String(s.stunde).padStart(2, '0')}:00</small></th>${
      TEXTE.tageKurz.map((t, tag) => `<td><button class="planfeld${r.plan.tag === tag && r.plan.slot === s.id ? ' aktiv' : ''}" data-plan="${tag}:${s.id}" aria-label="${TEXTE.tage[tag]} ${T.slots[s.id]}"></button></td>`).join('')}</tr>`).join('');
    plan = `<h3>${T.wochenplan}</h3><p class="unter">${T.wochenplanInfo}</p><table class="wochenplan"><tr><th></th>${kopf}</tr>${reihen}</table>`;
  }
  const mitarbeiter = r.imRaum.length
    ? r.imRaum.map(p => `<div class="kachel klein-kachel"><b>${esc(p.name)}</b><small>${ART_TEXT[p.art]} · ${T.skillsSpaeter}</small></div>`).join('')
    : `<p class="warnung">${T.keinMitarbeiter}</p>`;
  let vorschau = '';
  if (r.prognose) {
    const p = r.prognose;
    vorschau = `<h3>${p.dieseWoche ? T.prognose : T.prognoseNaechste}</h3>
      ${p.bereit ? '' : `<p class="warnung">${T.prognoseFaelltAus}</p>`}
      <table class="finanzen hell">
        <tr><td>${T.prognoseBesucher}</td><td class="zahl">${T.ca(zahl1(p.erwartet))}</td></tr>
        <tr><td>${T.prognosePlaetze}</td><td class="zahl">${p.plaetze}</td></tr>
        <tr><td>${T.prognoseGeld}</td><td class="zahl">${T.ca(euro(Math.round(p.geld)))}</td></tr>
        <tr><td>${T.prognoseEhrenamt}</td><td class="zahl">${T.ca(zahl1(p.ehrenamt))}</td></tr></table>`;
  }
  return `<h2>${r.typName}</h2>
    <h3>${T.veranstaltung}</h3><div class="kacheln">${kacheln}</div>
    ${plan}
    <h3>${T.mitarbeiter}</h3>${mitarbeiter}
    ${vorschau}
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Kaffeemaschine: Füllstand und Kaffee nachkaufen
function maschinenFenster(f) {
  const m = ui.spiel.maschineInfo(f.x, f.y);
  if (!m) return null;
  const T = TEXTE.maschine;
  return `<h2>${T.titel}</h2>
    <div class="balken"><span style="width:${Math.round(m.fuellung / m.fassung * 100)}%"></span></div>
    <p class="unter">${T.fuellstand(m.fuellung, m.fassung)}</p>
    ${m.fuellung === 0 ? `<p class="warnung">${T.leer}</p>` : ''}
    ${m.imKirchkaffee ? '' : `<p class="warnung">${T.nichtImKaffee}</p>`}
    <div class="typen"><button data-nachkaufen ${m.zuVoll || m.keinGeld ? 'disabled' : ''}>${T.nachkaufen(m.nachkaufen.preis, m.nachkaufen.tassen)}</button></div>
    ${m.zuVoll ? `<p class="unter">${T.voll}</p>` : m.keinGeld ? `<p class="unter">${T.keinGeld}</p>` : ''}
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Besucher-Kärtchen: Bedürfnisse und Zufriedenheit
function besucherKarte(f) {
  const b = ui.spiel.besucherInfo(f.id);
  if (!b) return null;
  const T = TEXTE.karte, n = b.beduerfnisse;
  const status = s => `<td class="zahl ${s === true ? 'ok' : s === false ? 'fehlt' : ''}">${s === true ? T.erfuellt : s === false ? T.nichtErfuellt : T.offen}</td>`;
  return `<h2>${esc(b.voll)}</h2>
    <p class="unter">${b.besuche ? T.besuche(b.besuche) : T.neu}</p>
    <h3>${T.zufriedenheit}</h3>
    <div class="balken"><span style="width:${b.zufriedenheit}%"></span></div><p class="unter">${b.zufriedenheit} / 100</p>
    <h3>${T.beduerfnisse}</h3>
    <table class="finanzen hell">
      <tr><td>${T.sitzplatz}</td>${status(n.sitzplatz)}</tr>
      <tr><td>${T.kaffee}</td>${n.kaffee === 'keinWunsch' ? `<td class="zahl">${T.keinKaffee}</td>` : status(n.kaffee)}</tr>
      <tr><td>${T.gottesdienst}</td>${status(n.gottesdienst)}</tr>
    </table>
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Knöpfe in den Fenstern → Befehle ans Spiel
export function fensterEinrichten() {
  maske().addEventListener('click', e => {
    const b = e.target.closest('button'), f = ui.fenster, spiel = ui.spiel;
    if (!b || b.disabled || !f) return;
    if (b.hasAttribute('data-zu')) return fensterSchliessen();
    if (b.dataset.veranstaltung !== undefined) spiel.veranstaltungSetzen(f.nr, b.dataset.veranstaltung);   // Fenster bleibt offen
    else if (b.dataset.plan) { const [tag, slot] = b.dataset.plan.split(':'); spiel.planSetzen(Number(tag), slot); }
    else if (b.hasAttribute('data-nachkaufen')) spiel.kaffeeNachkaufen(f.x, f.y);
    else if (b.dataset.typ !== undefined) { spiel.raumTypSetzen(f.nr, b.dataset.typ); fensterSchliessen(); }
    ui.speichern(); ui.anzeigeErzwingen(); ui.malen();
  });
}
