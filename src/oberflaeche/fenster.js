// Fenster: Raumfunktion (Editor), Raum-Fenster (Gottesdienstraum), Kaffeemaschine, Besucher-Kärtchen, Mitarbeiter-Karte,
// Menschen im Ort (Liste) und Seelsorge (Dialog, solange er offen ist, steht die Zeit).
// Inhalte kommen als Zahlen und Zustände vom Spiel; hier wird nur HTML daraus. Knöpfe schicken Befehle ans Spiel.
import { KEINE_VERANSTALTUNG } from '../inhalte/veranstaltungen.js';
import { TEXTE } from '../inhalte/texte.js';
import { ui, $, euro, zahl1, esc } from './ui.js';

const maske = () => $('maske');
const ART_TEXT = { hauptamt: 'Hauptamtlich', ehrenamt: 'Ehrenamtlich' };
const faktor = f => f.toLocaleString('de-DE', { maximumFractionDigits: 2 });
let letzterInhalt = '';

export function fensterOeffnen(f) { ui.fenster = f; letzterInhalt = ''; ui.anzeigeErzwingen(); ui.malen(); }
export function fensterSchliessen() {
  if (ui.fenster && ui.fenster.art === 'seelsorge' && ui.spiel.seelsorgeOffen()) return;   // Seelsorge erst beantworten
  ui.fenster = null; maske().hidden = true; letzterInhalt = ''; ui.malen();
}
export function fensterOffen() { return !maske().hidden; }

// Wird bei jeder Anzeige-Aktualisierung aufgerufen; baut das Fenster nur neu, wenn sich der Inhalt geändert hat.
export function fensterAktualisieren() {
  const f = ui.fenster, m = maske();
  if (!f) { m.hidden = true; return; }
  const inhalt = { raumtyp: raumTypFenster, raum: raumFenster, maschine: maschinenFenster, besucher: besucherKarte, person: personenKarte,
    menschen: menschenFenster, seelsorge: seelsorgeFenster, stuhl: stuhlFenster, tor: torFenster }[f.art](f);
  if (inhalt === null) { ui.fenster = null; m.hidden = true; return; }
  m.classList.toggle('breit', f.art === 'raum' || f.art === 'menschen');
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
  let skills = '<p class="leer">Skills folgen später</p>';
  if (p.seelsorge) {
    const s = p.seelsorge, T = TEXTE.seelsorge.karte;
    skills = `<p class="unter staerker">${T.titel(s.stufe)}</p>
      <div class="balken"><span style="width:${s.bis === null ? 100 : Math.round((s.punkte - s.von) / (s.bis - s.von) * 100)}%"></span></div>
      <p class="unter">${s.bis === null ? T.hoechste : T.fortschritt(s.punkte, s.bis, s.stufe + 1)}</p>`;
  }
  return `<h2>${esc(p.name)}</h2>
    <p class="unter">${ART_TEXT[p.art]} · ${p.einsatz ? 'Im Einsatz: ' + p.einsatz : 'Verfügbar'}</p>
    <h3>Skills</h3>${skills}
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Raum-Fenster in der Spielansicht (Gottesdienstraum): Veranstaltung, Wochenplan, Mitarbeiter, Prognose
function raumFenster(f) {
  const r = ui.spiel.raumInfo(f.nr);
  if (!r) return null;
  const T = TEXTE.raum;
  // Bedingung mit Prüfung: grün/rot, je nachdem, was das Spiel meldet
  const bedingung = t => typeof t === 'string' ? `<li>${t}</li>` : `<li class="${r.bedingungen[t.bedingung] ? 'ok' : 'fehlt'}">${t.text}</li>`;
  // Was die Möbel im Raum zusätzlich bringen (nur beim Gottesdienst)
  const A = TEXTE.ausstattung, au = r.ausstattung;
  const extra = id => id !== 'gottesdienst' || !au ? [] : [
    ...au.teile.filter(t => t.haltung || t.kollekte).map(t => `${t.name}${t.max > 1 ? ' ' + A.anzahl(t.anzahl, t.max) : ''}: ${
      [t.haltung && A.haltung(t.haltung), t.kollekte && A.kollekte(faktor(t.kollekte))].filter(Boolean).join(' · ')}`),
    ...(au.musik ? [A.musik(faktor(au.musikFaktor))] : [])];
  const kachel = (id, name, k) => `<button class="kachel${(r.veranstaltung || '') === id ? ' aktiv' : ''}" data-veranstaltung="${id}">
      <b>${name}</b>
      <span class="klein">${TEXTE.bringt}</span><ul>${[...k.bringt, ...extra(id)].map(t => `<li>${t}</li>`).join('')}</ul>
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
    ? r.imRaum.map(p => `<div class="kachel klein-kachel"><b>${esc(p.name)}</b><small>${ART_TEXT[p.art]} · ${
      p.art === 'ehrenamt' ? (p.musiker ? A.musiker : A.ohneGitarre) : T.skillsSpaeter}</small></div>`).join('')
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
        <tr><td>${T.prognoseEhrenamt}</td><td class="zahl">${T.ca(zahl1(p.ehrenamt))}</td></tr>
        <tr><td>${T.prognosePlakat}</td><td class="zahl">${p.plakat ? T.plakatJa : T.plakatNein}</td></tr></table>`;
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

// Stuhl verbessern (Editor): Stufe, Wirkung, nächste Stufe, alle Stühle im Raum
function stuhlFenster(f) {
  const s = ui.spiel.stuhlInfo(f.x, f.y);
  if (!s) return null;
  const T = TEXTE.stuhl, n = s.naechste, a = s.alle;
  const naechste = n
    ? `<h3>${T.naechste(n.name)}</h3><p class="unter">${T.wirkung(n.haltung, faktor(n.kollekte))}</p>
       <div class="typen"><button data-verbessern ${n.leistbar ? '' : 'disabled'}>${T.verbessern(euro(n.preis))}</button></div>
       ${n.leistbar ? '' : `<p class="unter">${T.keinGeld}</p>`}`
    : `<p class="unter">${T.hoechste}</p>`;
  const alle = !a ? '' : a.anzahl
    ? `<div class="typen"><button data-alle-verbessern ${a.leistbar ? '' : 'disabled'}>${T.alle(a.anzahl, euro(a.preis))}</button></div>
       <p class="unter">${T.alleInfo}${a.leistbar ? '' : ' ' + T.keinGeld}</p>`
    : `<p class="unter">${T.alleHoechste}</p>`;
  return `<h2>${s.name}</h2>
    <p class="unter staerker">${T.stufe(s.stufe, s.maxStufe)}</p>
    <p class="unter">${T.wirkung(s.haltung, faktor(s.kollekte))}</p>
    ${naechste}${alle}
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Pforte (Tor): Plakat aufhängen
function torFenster() {
  const t = ui.spiel.torInfo(), T = TEXTE.tor;
  const inhalt = t.plakat
    ? `<p class="ok">${T.haengt(t.chance)}</p>`
    : `<p class="unter">${T.chance(t.chanceOhne, t.chanceMit)}</p>
       <div class="typen"><button data-plakat ${t.leistbar ? '' : 'disabled'}>${T.kaufen(euro(t.preis))}</button></div>
       ${t.leistbar ? '' : `<p class="unter">${T.keinGeld}</p>`}`;
  return `<h2>${T.titel}</h2><h3>${T.plakat}</h3><p>${T.info}</p>${inhalt}
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Besucher-Kärtchen: Bedürfnisse und Zufriedenheit
function besucherKarte(f) {
  const b = ui.spiel.besucherInfo(f.id);
  if (!b) return null;
  const T = TEXTE.karte, n = b.beduerfnisse;
  const status = s => `<td class="zahl ${s === true ? 'ok' : s === false ? 'fehlt' : ''}">${s === true ? T.erfuellt : s === false ? T.nichtErfuellt : T.offen}</td>`;
  const kopf = `<h2>${esc(b.voll)}</h2>
    <p class="unter">${b.status === 'passant' ? T.passant : b.status === 'neugierig' ? T.neugierig : b.besuche ? T.besuche(b.besuche) : T.neu}</p>
    <h3>${T.zufriedenheit}</h3>
    <div class="balken"><span style="width:${b.zufriedenheit}%"></span></div><p class="unter">${b.zufriedenheit} / 100</p>`;
  if (!n) return `${kopf}<div class="zeile"><button data-zu>Schließen</button></div>`;   // Passant: keine Bedürfnisse
  return `${kopf}
    <h3>${T.beduerfnisse}</h3>
    <table class="finanzen hell">
      <tr><td>${T.sitzplatz}</td>${status(n.sitzplatz)}</tr>
      <tr><td>${T.kaffee}</td>${n.kaffee === 'keinWunsch' ? `<td class="zahl">${T.keinKaffee}</td>` : status(n.kaffee)}</tr>
      <tr><td>${T.gottesdienst}</td>${status(n.gottesdienst)}</tr>
    </table>
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Menschen im Ort: sortierbare Liste. Sortieren ist nur Anzeige, keine Spielregel.
const STATUS_REIHE = ['passant', 'neugierig', 'besucher', 'stammgast', 'ehrenamtlich'];
function menschenFenster(f) {
  const T = TEXTE.menschen, liste = ui.spiel.menschen(), sort = f.sort || { spalte: 'status', ab: true };
  const wert = (m, sp) => sp === 'name' ? m.voll : sp === 'status' ? STATUS_REIHE.indexOf(m.status) : sp === 'kaffee' ? (m.kaffee === null ? -1 : +m.kaffee) : m[sp] ?? -1;
  liste.sort((a, b) => {
    const x = wert(a, sort.spalte), y = wert(b, sort.spalte);
    const v = typeof x === 'string' ? x.localeCompare(y, 'de') : x - y;
    return (sort.ab ? -v : v) || a.voll.localeCompare(b.voll, 'de');
  });
  const kopf = Object.entries(T.spalten).map(([id, name]) =>
    `<th><button class="sortieren${sort.spalte === id ? ' aktiv' : ''}" data-sort="${id}">${name}${sort.spalte === id ? (sort.ab ? ' ▼' : ' ▲') : ''}</button></th>`).join('');
  const zeilen = liste.map(m => `<tr data-mensch="${m.id}" data-mart="${m.art}">
      <td>${esc(m.voll)}</td>
      <td>${m.haltung === null ? T.unbekannt : `<div class="balken mini"><span style="width:${m.haltung}%"></span></div>`}</td>
      <td class="zahl">${m.besuche ?? T.unbekannt}</td>
      <td>${m.zuletzt === null ? T.unbekannt : T.woche(m.zuletzt)}</td>
      <td>${m.kaffee === null ? T.unbekannt : m.kaffee ? T.ja : T.nein}</td>
      <td>${T.status[m.status]}</td></tr>`).join('');
  return `<h2>${T.titel}</h2>
    ${liste.length ? `<table class="menschen"><tr>${kopf}</tr>${zeilen}</table>` : `<p class="leer">${T.leer}</p>`}
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Seelsorge: Anfrage → annehmen (3 Ratschläge) oder ablehnen → Ergebnis
function seelsorgeFenster(f) {
  const a = ui.spiel.lage().seelsorge;
  if (!a) return null;
  const T = TEXTE.seelsorge, sit = T.situationen[a.situation], name = esc(a.vorname);
  let inhalt;
  if (a.phase === 'frage' && !f.angenommen) {
    inhalt = `<p class="unter staerker">${T.anfrage(esc(a.voll))}</p><p>${sit.anfrage(name)}</p>
      <div class="zeile"><button data-ablehnen>${T.ablehnen}</button><button class="haupt" data-annehmen>${T.annehmen}</button></div>`;
  } else if (a.phase === 'frage') {
    inhalt = `<p>${sit.anfrage(name)}</p><div class="typen">${sit.raete.map((r, i) => {
      const k = a.raete[i];
      return `<button class="typ rat" data-rat="${i}" ${k.leistbar ? '' : 'disabled'}><span>„${r.text}“${k.kosten ? `<small>${T.folgen.kosten(euro(k.kosten))}${k.leistbar ? '' : ' · ' + T.keinGeld}</small>` : ''}</span></button>`;
    }).join('')}</div>`;
  } else if (a.phase === 'abgelehnt') {
    inhalt = `<p>${T.abgelehnt(name)}</p><div class="zeile"><button data-seelsorge-zu>${T.schliessen}</button></div>`;
  } else {
    const e = a.ergebnis, F = T.folgen, rat = sit.raete[e.rat];
    const folgen = [e.haltung && F.haltung(e.haltung), e.bekanntheit && F.bekanntheit(e.bekanntheit),
      e.spende && F.spende(euro(e.spende)), e.kosten && F.kosten(euro(e.kosten)), e.neugierig && F.neugierig].filter(Boolean);
    inhalt = `<p class="unter">„${rat.text}“</p>
      <p class="${e.gut ? 'ok' : 'fehlt'}">${(e.gut ? rat.gut : rat.schlecht)(name)}</p>
      <p class="unter">${folgen.join(' · ')}</p>
      ${e.neueStufe ? `<p class="unter staerker">${T.neueStufe(e.neueStufe)}</p>` : ''}
      <div class="zeile"><button class="haupt" data-seelsorge-zu>${T.weiter}</button></div>`;
  }
  return `<h2>${T.titel}</h2>${inhalt}`;
}

// Knöpfe in den Fenstern → Befehle ans Spiel
export function fensterEinrichten() {
  maske().addEventListener('click', e => {
    // Zeile in der Menschen-Liste → Kärtchen der Person
    const zeile = e.target.closest('tr[data-mensch]');
    if (zeile) return fensterOeffnen(zeile.dataset.mart === 'person' ? { art: 'person', id: zeile.dataset.mensch } : { art: 'besucher', id: zeile.dataset.mensch });
    const b = e.target.closest('button'), f = ui.fenster, spiel = ui.spiel;
    if (!b || b.disabled || !f) return;
    if (b.hasAttribute('data-zu')) return fensterSchliessen();
    if (b.dataset.sort) { const s = f.sort || { spalte: 'status', ab: true }; f.sort = { spalte: b.dataset.sort, ab: s.spalte === b.dataset.sort ? !s.ab : true }; }
    else if (b.hasAttribute('data-annehmen')) f.angenommen = true;
    else if (b.hasAttribute('data-ablehnen')) spiel.seelsorgeAblehnen();
    else if (b.dataset.rat !== undefined) spiel.seelsorgeRat(Number(b.dataset.rat));
    else if (b.hasAttribute('data-seelsorge-zu')) { spiel.seelsorgeSchliessen(); ui.speichern(); return fensterSchliessen(); }
    else if (b.dataset.veranstaltung !== undefined) spiel.veranstaltungSetzen(f.nr, b.dataset.veranstaltung);   // Fenster bleibt offen
    else if (b.dataset.plan) { const [tag, slot] = b.dataset.plan.split(':'); spiel.planSetzen(Number(tag), slot); }
    else if (b.hasAttribute('data-nachkaufen')) spiel.kaffeeNachkaufen(f.x, f.y);
    else if (b.hasAttribute('data-verbessern')) spiel.stuhlVerbessern(f.x, f.y);
    else if (b.hasAttribute('data-alle-verbessern')) spiel.alleStuehleVerbessern(f.x, f.y);
    else if (b.hasAttribute('data-plakat')) spiel.plakatKaufen();
    else if (b.dataset.typ !== undefined) { spiel.raumTypSetzen(f.nr, b.dataset.typ); fensterSchliessen(); }
    ui.speichern(); ui.anzeigeErzwingen(); ui.malen();
  });
}
