// Fenster: Raumfunktion (Editor), Raum-Fenster (Gottesdienstraum), Kaffeemaschine, Besucher-Kärtchen, Mitarbeiter-Karte,
// Menschen im Ort (Liste) und Seelsorge (Dialog, solange er offen ist, steht die Zeit).
// Inhalte kommen als Zahlen und Zustände vom Spiel; hier wird nur HTML daraus. Knöpfe schicken Befehle ans Spiel.
import { KEINE_VERANSTALTUNG } from '../inhalte/veranstaltungen.js';
import { TEXTE } from '../inhalte/texte.js';
import { ui, $, euro, zahl1, esc } from './ui.js';
import { changelogHolen } from './changelog.js';
import { HILFE } from '../inhalte/hilfe.js';
import { VERSION } from '../version.js';

const maske = () => $('maske');
const ART_TEXT = { hauptamt: 'Hauptamtlich', ehrenamt: 'Ehrenamtlich' };
const faktor = f => f.toLocaleString('de-DE', { maximumFractionDigits: 2 });
let letzterInhalt = '';

export function fensterOeffnen(f) { ui.fenster = f; letzterInhalt = ''; ui.anzeigeErzwingen(); ui.malen(); }
export function fensterSchliessen() {
  if (ui.fenster && ui.fenster.art === 'seelsorge' && ui.spiel.seelsorgeOffen()) return;   // Seelsorge erst beantworten
  if (ui.fenster && ui.fenster.art === 'fest' && ui.spiel.lage().festAnfrage === ui.fenster.schluessel) return;   // Fest-Menü erst beantworten
  ui.fenster = null; maske().hidden = true; letzterInhalt = ''; ui.malen();
}
export function fensterOffen() { return !maske().hidden; }

// Wird bei jeder Anzeige-Aktualisierung aufgerufen; baut das Fenster nur neu, wenn sich der Inhalt geändert hat.
export function fensterAktualisieren() {
  const f = ui.fenster, m = maske();
  if (!f) { m.hidden = true; return; }
  const inhalt = { raumtyp: raumTypFenster, raum: raumFenster, kaffee: kaffeeFenster, maschine: maschinenFenster, besucher: besucherKarte, person: personenKarte,
    menschen: menschenFenster, seelsorge: seelsorgeFenster, stuhl: stuhlFenster, tor: torFenster, changelog: changelogFenster, bekanntheit: bekanntheitFenster, bus: busFenster, schaukasten: schaukastenFenster, hilfe: hilfeFenster, finanzen: finanzFenster,
    kirchenjahr: kirchenjahrFenster, fest: festFenster, forschung: forschungFenster, foyer: foyerFenster }[f.art](f);
  if (inhalt === null) { ui.fenster = null; m.hidden = true; return; }
  m.classList.toggle('sehr-breit', f.art === 'finanzen');
  m.classList.toggle('mittel', f.art === 'raum' && f.platz !== undefined);   // Bausteintabelle braucht mehr Platz (640 px)
  m.classList.toggle('breit', f.art === 'finanzen' || f.art === 'raum' || f.art === 'kaffee' || f.art === 'menschen' || f.art === 'changelog' || f.art === 'bekanntheit' || f.art === 'hilfe' || f.art === 'kirchenjahr' || f.art === 'fest');
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
  if (p.musik) {
    // Musik-Level des Ehrenamtlichen mit Fortschrittsbalken bis zum nächsten Level
    skills = `<p class="unter staerker">${TEXTE.ausstattung.musikLevel(p.musik.level)}</p>
      <div class="balken"><span style="width:${Math.round(p.musik.fortschritt * 100)}%"></span></div>`;
  }
  if (p.seelsorge) {
    const s = p.seelsorge, T = TEXTE.seelsorge.karte;
    skills = `<p class="unter staerker">${T.titel(s.stufe, s.maxStufe)}</p>
      <div class="balken"><span style="width:${s.bis === null ? 100 : Math.round((s.punkte - s.von) / (s.bis - s.von) * 100)}%"></span></div>
      <p class="unter">${s.bis === null ? T.hoechste : T.fortschritt(s.punkte, s.bis, s.stufe + 1)}</p>
      ${s.bonus > 0 ? `<p class="unter">${T.bonus(s.bonus)}</p>` : ''}
      ${s.freigeschaltet && T.kann[s.freigeschaltet] ? `<p class="unter">${T.jetzt(T.kann[s.freigeschaltet])}</p>` : ''}
      ${s.naechsteFreischaltung && T.kann[s.naechsteFreischaltung] ? `<p class="unter">${T.ab(s.naechsteFreischaltung, T.kann[s.naechsteFreischaltung])}</p>` : ''}`;
  }
  return `<h2>${esc(p.name)}</h2>
    <p class="unter">${ART_TEXT[p.art]} · ${p.einsatz ? 'Im Einsatz: ' + p.einsatz : 'Verfügbar'}</p>
    <h3>Skills</h3>${skills}
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Raum-Fenster in der Spielansicht (Gottesdienstraum): Veranstaltung 1, 2, Mitarbeiter, Prognosen.
// f.platz gesetzt → Menü „Veranstaltung n einstellen“ mit Art (Kacheln) und Zeit (Wochenplan).
function raumFenster(f) {
  const r = ui.spiel.raumInfo(f.nr);
  if (!r) return null;
  const T = TEXTE.raum, A = TEXTE.ausstattung, au = r.ausstattung;
  const p = f.platz !== undefined ? r.programm[f.platz] : null;
  if (p && !p.nutzbar) { delete f.platz; return raumFenster(f); }
  const uhr = slot => `${String(r.slots.find(s => s.id === slot).stunde).padStart(2, '0')}:00`;
  const terminText = e => T.termin(TEXTE.tage[e.tag], T.slots[e.slot], uhr(e.slot));
  const artName = id => id ? (r.moeglich.find(v => v.id === id) || {}).name : KEINE_VERANSTALTUNG;
  const saal = r.typId === 'gemeindesaal';

  if (p) {
    // ---- Menü: Art und Zeit einer Veranstaltung ----
    // Eventtyp als Knöpfe, darunter die Bausteintabelle (Spielprinzip vom 25.11.): bei jedem Event gleich aufgebaut
    const knoepfe = [...r.moeglich, { id: '', name: KEINE_VERANSTALTUNG }].map(v =>
      `<button class="${(p.art || '') === v.id ? 'aktiv' : ''}" data-veranstaltung="${v.id}">${esc(v.name)}</button>`).join('');
    const tabelle = p.art && r.bausteine[p.art] ? bausteinTabelle(r.bausteine[p.art]) : keineInfo(TEXTE.veranstaltungKacheln[saal ? 'keineSaal' : 'keine']);
    // Zeiten, zu denen im Raum schon eine andere Veranstaltung ist, sind gesperrt
    const belegt = (tag, slot) => r.programm.some(e => e.platz !== p.platz && e.art && e.tag === tag && e.slot === slot);
    const kopf = TEXTE.tageKurz.map(t => `<th>${t}</th>`).join('');
    const reihen = r.slots.map(s => `<tr><th class="slot">${T.slots[s.id]}<small>${uhr(s.id)}</small></th>${
      TEXTE.tageKurz.map((t, tag) => `<td><button class="planfeld${p.tag === tag && p.slot === s.id ? ' aktiv' : ''}" data-plan="${tag}:${s.id}" ${belegt(tag, s.id) ? 'disabled' : ''} aria-label="${TEXTE.tage[tag]} ${T.slots[s.id]}"></button></td>`).join('')}</tr>`).join('');
    return `<h2>${T.platzEinstellen(p.platz + 1)}</h2><p class="unter">${r.typName}</p>
      <h3>${T.art}</h3><div class="eventtypen">${knoepfe}</div>${tabelle}
      <h3>${T.zeit}</h3><p class="unter">${saal ? T.wochenplanInfoSaal : T.wochenplanInfo}</p><table class="wochenplan"><tr><th></th>${kopf}</tr>${reihen}</table>
      <div class="zeile"><button data-zurueck>${T.zurueck}</button><button data-zu>Schließen</button></div>`;
  }

  // ---- Übersicht: Veranstaltung 1, 2 ----
  const warnung = e => saal ? (e.art && e.fehlt && ((TEXTE.fehltArt[e.art] || {})[e.fehlt] || TEXTE.fehltSaal[e.fehlt])) || ''
    : e.fehlt === 'gesperrt' && e.art ? TEXTE.fehltGesperrt(e.platz + 1)
    : e.art && e.fehlt === 'gitarre' ? TEXTE.fehltGitarre : e.art && e.fehlt === 'leitung' ? T.keinMitarbeiter : '';
  const plaetze = r.programm.map(e => {
    if (!e.nutzbar) return `<button class="kachel" disabled><b>${T.platz(e.platz + 1)}</b><small class="unter">${T.gesperrt}</small></button>`;
    const w = warnung(e);
    return `<button class="kachel${e.art ? ' aktiv' : ''}" data-platz="${e.platz}"><b>${T.platz(e.platz + 1)}</b>
      <span class="klein">${artName(e.art)}</span>${e.art ? `<span>${terminText(e)}</span>` : ''}
      ${w ? `<p class="fehlt">${w}</p>` : ''}</button>`;
  }).join('');
  const mitarbeiter = r.imRaum.length
    ? r.imRaum.map(m => `<div class="kachel klein-kachel"><b>${esc(m.name)}</b><small>${ART_TEXT[m.art]} · ${
      m.art === 'ehrenamt' ? (saal ? A.musikLevel(m.musikLevel) : m.musiker ? A.musiker : A.ohneGitarre) : T.skillsSpaeter}</small></div>`).join('')
    : `<p class="warnung">${saal ? T.keinMitarbeiterSaal : T.keinMitarbeiter}</p>`;
  const vorschau = r.programm.filter(e => e.prognose && (e.art || e.platz === 0)).map(e => {
    const v = e.prognose;
    return `<h3>${T.platz(e.platz + 1)} · ${v.dieseWoche ? T.prognose : T.prognoseNaechste}</h3>
      ${v.bereit ? '' : `<p class="warnung">${v.wegenFest ? TEXTE.faelltAusWegen(e.platz, esc(v.wegenFest)) : warnung(e) || T.prognoseFaelltAus}</p>`}
      <table class="finanzen hell">
        <tr><td>${T.prognoseBesucher}</td><td class="zahl">${T.ca(zahl1(v.erwartet))}</td></tr>
        <tr><td>${T.prognosePlaetze}</td><td class="zahl">${v.plaetze === null ? T.plaetzeEgal : v.plaetze}</td></tr>
        <tr><td>${T.prognoseGeld}</td><td class="zahl">${T.ca(euro(Math.round(v.geld)))}</td></tr>
        <tr><td>${T.prognoseEhrenamt}</td><td class="zahl">${T.ca(zahl1(v.ehrenamt))}</td></tr>
        ${v.sonntagvormittag ? `<tr><td colspan="2">${T.prognoseSonntagvormittag}</td></tr>` : ''}
        ${kirchenjahrZeile(v.kirchenjahr)}
        <tr><td>${T.prognosePlakat}</td><td class="zahl">${v.plakat ? T.plakatJa : T.plakatNein}</td></tr></table>`;
  }).join('');
  return `<h2>${r.typName}</h2>
    <h3>${T.veranstaltung}</h3><div class="kacheln">${plaetze}</div>
    <h3>${T.mitarbeiter}</h3>${mitarbeiter}
    ${vorschau}
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Bausteintabelle: eine Zeile pro Baustein (Pflicht grau hinterlegt), unten „Zusammen“. Spalte Ehrenamt: bisher nur beim Konfirmandenunterricht.
function bausteinTabelle({ zeilen, summe }) {
  const B = TEXTE.bausteine, S = B.spalten;
  const zelle = t => t ? `<td>${t}</td>` : '<td class="strich">–</td>';
  const reihen = zeilen.map(b => {
    const t = B.zeilen[b.id](b);
    return `<tr class="${b.pflicht ? 'pflicht' : ''}"><td>${t.name}</td><td class="mitte">${b.imRaum ? '<span class="haken">✓</span>' : '<span class="nein">–</span>'}</td>
      ${zelle(t.besucher)}${zelle(t.haltung)}${zelle(t.geld)}${zelle(t.ehrenamt)}</tr>`;
  }).join('');
  const s = B.summe(summe);
  const zusammen = summe.bereit
    ? `<tr class="summe"><td>${B.zusammen}</td><td></td>${zelle(s.besucher)}${zelle(s.haltung)}${zelle(s.geld)}${zelle(s.ehrenamt)}</tr>`
    : `<tr class="summe"><td>${B.zusammen}</td><td></td><td colspan="4" class="fehlt">${B.faelltAus}</td></tr>`;
  return `<table class="baustein"><colgroup><col style="width:27%"><col style="width:8%"><col style="width:18%"><col style="width:19%"><col style="width:16%"><col style="width:12%"></colgroup>
    <tr><th>${S.baustein}</th><th>${S.imRaum}</th><th>${S.besucher}</th><th>${S.haltung}</th><th>${S.geld}</th><th>${S.ehrenamt}</th></tr>${reihen}${zusammen}</table>`;
}
// „Keine“ gewählt: was das bedeutet (z. B. Stammgäste werden unzufrieden)
function keineInfo(k) {
  const liste = [...k.bringt, ...k.bedingungen.map(b => typeof b === 'string' ? b : b.text)];
  return `<ul class="keine-info">${liste.map(t => `<li>${t}</li>`).join('')}</ul>`;
}

// Prognose: Zeile für Fest oder Zeit im Kirchenjahr (z. B. „Heiligabend: sehr viele Besucher, sehr hohe Kollekte“)
function kirchenjahrZeile(k) {
  if (!k) return '';
  const wort = faktorWorte(k.besucher, k.kollekte);
  return wort ? `<tr><td colspan="2">${TEXTE.festPrognose(esc(k.festName || k.zeitName), wort)}</td></tr>` : '';
}
const faktorWorte = (b, k) => [TEXTE.besucherWort(b), TEXTE.kollekteWort(k)].filter(Boolean).join(', ');

// Kaffeemaschine: Füllstand (aufgefüllt wird vom Ehrenamtlichen im Laden)
function maschinenFenster(f) {
  const m = ui.spiel.maschineInfo(f.x, f.y);
  if (!m) return null;
  const T = TEXTE.maschine;
  return `<h2>${T.titel}</h2>
    <div class="balken"><span style="width:${Math.round(m.fuellung / m.fassung * 100)}%"></span></div>
    <p class="unter">${T.fuellstand(m.fuellung, m.fassung)}</p>
    ${m.fuellung === 0 ? `<p class="warnung">${T.leer}</p>` : ''}
    ${m.imKirchkaffee ? `<p class="unter">${T.auffuellen}</p>` : `<p class="warnung">${T.nichtImKaffee}</p>`}
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Kirchkaffee: Zustand und eigene Öffnungszeiten (höchstens 3 Schichten pro Woche).
// f.waehlen gesetzt → Wochenplan, in dem man eine Öffnungszeit hinzufügt.
const uhrText = (stunde, minute = 0) => minute ? `${stunde}:${String(minute).padStart(2, '0')}` : `${stunde}`;
export function kaffeeZustandText(zustand, naechste) {
  const K = TEXTE.kirchkaffee;
  if (zustand === 'zu') return naechste ? K.zuBis(TEXTE.tageKurz[naechste.tag], uhrText(naechste.stunde, naechste.minute)) : K.zu;
  return K[zustand] || '';
}
function kaffeeFenster(f) {
  const r = ui.spiel.kaffeeRaumInfo(f.nr);
  if (!r) return null;
  const T = TEXTE.kaffeeFenster, voll = r.schichten.length >= r.max;
  const zustand = `<p class="unter staerker">${kaffeeZustandText(r.zustand, r.naechste)}</p>`;
  if (f.waehlen && !voll) {
    const kopf = TEXTE.tageKurz.map(t => `<th>${t}</th>`).join('');
    const gesetzt = (tag, slot) => r.schichten.some(s => s.tag === tag && s.slot === slot);
    const reihen = r.slots.map(s => `<tr><th class="slot">${T.slot[s.id]}</th>${
      TEXTE.tageKurz.map((t, tag) => `<td><button class="planfeld${gesetzt(tag, s.id) ? ' aktiv' : ''}" data-schicht="${tag}:${s.id}" ${gesetzt(tag, s.id) ? 'disabled' : ''} aria-label="${TEXTE.tage[tag]} ${T.slot[s.id]}"></button></td>`).join('')}</tr>`).join('');
    return `<h2>${T.hinzufuegen}</h2><p class="unter">${r.typName}</p>
      <p class="unter">${T.info}</p><table class="wochenplan"><tr><th></th>${kopf}</tr>${reihen}</table>
      <div class="zeile"><button data-zurueck>${TEXTE.raum.zurueck}</button><button data-zu>Schließen</button></div>`;
  }
  const liste = r.schichten.map((s, i) => `<div class="kachel klein-kachel schicht"><b>${TEXTE.tage[s.tag]}</b><small>${T.slot[s.slot]}</small>
      <button class="klein-knopf" data-schicht-weg="${i}">${T.entfernen}</button></div>`).join('');
  return `<h2>${r.typName}</h2>${zustand}
    <h3>${T.oeffnungszeiten}</h3><p class="unter">${T.info}</p>
    ${liste ? `<div class="kacheln">${liste}</div>` : ''}
    <div class="typen"><button data-schicht-neu ${voll ? 'disabled' : ''}>${T.hinzufuegen}</button></div>
    ${voll ? `<p class="unter">${T.voll}</p>` : ''}
    <p class="unter staerker">${T.sitzplaetze(r.sitzplaetze.anzahl, r.sitzplaetze.amTisch)}</p>
    <p class="unter">${T.sitzInfo(r.sitzChance)}</p>
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Foyer (25.11.): was es jedem bringt, der hindurchläuft, und wer dort steht
function foyerFenster(f) {
  const r = ui.spiel.foyerInfo(f.nr);
  if (!r) return null;
  const T = TEXTE.foyerFenster;
  const zeilen = [T.begruessung(r.begruessung.da, r.begruessung.haltung), ...r.teile.map(t => T.teil(esc(t.name), t.anzahl, t.haltung))];
  const leute = r.imRaum.length
    ? r.imRaum.map(m => `<div class="kachel klein-kachel"><b>${esc(m.name)}</b><small>${ART_TEXT[m.art]}</small></div>`).join('')
    : `<p class="warnung">${T.keiner}</p>`;
  return `<h2>${esc(r.typName)}</h2>
    <p class="unter">${T.info}</p>
    ${r.fertig ? '' : `<p class="warnung">${T.nichtFertig}</p>`}
    <p class="unter staerker">${T.zusammen(r.haltung)}</p>
    <ul class="quellen">${zeilen.map(z => `<li>${z}</li>`).join('')}</ul>
    <h3>${T.mitarbeiter}</h3>${leute}
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Stuhl verbessern (Editor): Stufe, Wirkung, nächste Stufe, alle Stühle im Raum
function stuhlFenster(f) {
  const s = ui.spiel.stuhlInfo(f.x, f.y);
  if (!s) return null;
  const T = TEXTE.stuhl, n = s.naechste, a = s.alle;
  const naechste = n
    ? `<h3>${T.naechste(n.name)}</h3><p class="unter">${T.wirkung(n.haltung, faktor(n.kollekte))}</p><p class="unter">${T.trinkgeld(faktor(n.trinkgeld))}</p>
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
    <p class="unter">${T.trinkgeld(faktor(s.trinkgeld))}</p>
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
    <p class="unter">${b.jugend ? `${T.jugendlich} · ` : ''}${b.status === 'passant' ? T.passant : b.status === 'neugierig' ? T.neugierig : b.besuche ? T.besuche(b.besuche) : T.neu}</p>
    ${b.konfi ? `<p class="unter">${T.konfi(b.konfi.anzahl, b.konfi.von)}</p>` : ''}
    <h3>${T.zufriedenheit}</h3>
    <div class="balken"><span style="width:${b.zufriedenheit}%"></span></div><p class="unter">${b.zufriedenheit} / 100</p>
    <p class="unter">${T.lobpreis(Math.round(b.lobpreis * 100))}</p>
    <p class="unter">${T.kaffeeWert(Math.round(b.kaffee * 100))}</p>`;
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
  const wert = (m, sp) => sp === 'name' ? m.voll : sp === 'status' ? STATUS_REIHE.indexOf(m.status) : sp === 'kaffee' ? (m.kaffee === null ? -1 : m.kaffee) : m[sp] ?? -1;
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
      <td>${m.kaffee === null ? T.unbekannt : T.prozent(Math.round(m.kaffee * 100))}</td>
      <td>${T.status[m.status]}</td></tr>`).join('');
  return `<h2>${T.titel}</h2>
    ${liste.length ? `<table class="menschen"><tr>${kopf}</tr>${zeilen}</table>` : `<p class="leer">${T.leer}</p>`}
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Finanzen: diese Woche nach Kategorien, Kirchkaffee im Detail, Verlauf früherer Wochen, Kassenbuch. Alle Zahlen kommen vom Spiel.
const geld = n => `${n.toLocaleString('de-DE', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} €`;
const mitVorzeichen = n => (n > 0 ? '+' : n < 0 ? '−' : '') + geld(Math.abs(n));
const vorzeichenKlasse = n => n > 0 ? 'ok' : n < 0 ? 'fehlt' : '';
const plus = n => (n ? '+' : '') + geld(n), minus = n => (n ? '−' : '') + geld(n);   // bei 0 ohne Vorzeichen
function finanzFenster() {
  const T = TEXTE.finanzFenster, f = ui.spiel.finanzInfo(), w = f.woche, k = w.kaffee, { einnahmen: EINNAHMEN, ausgaben: AUSGABEN } = f.namen;
  const teil = (posten, namen, vz) => {
    const ids = Object.keys(posten).filter(id => posten[id]);
    return ids.length ? ids.map(id => `<tr><td>${namen[id] || id}</td><td class="zahl">${vz(posten[id])}</td></tr>`).join('')
      : `<tr><td colspan="2" class="leer">${T.keine}</td></tr>`;
  };
  const woche = `<div class="spalten">
      <div><h4>${T.einnahmen}</h4><table class="finanzen hell">${teil(w.einnahmen, EINNAHMEN, plus)}
        <tr class="summe"><td>${T.summe}</td><td class="zahl">${plus(w.summeEinnahmen)}</td></tr></table></div>
      <div><h4>${T.ausgaben}</h4><table class="finanzen hell">${teil(w.ausgaben, AUSGABEN, minus)}
        <tr class="summe"><td>${T.summe}</td><td class="zahl">${minus(w.summeAusgaben)}</td></tr></table></div>
    </div>
    <table class="finanzen hell abstand"><tr class="summe"><td>${T.saldo}</td><td class="zahl ${vorzeichenKlasse(w.saldo)}">${mitVorzeichen(w.saldo)}</td></tr></table>
    <p class="unter">${T.voraussichtlich(euro(f.prognose.einnahmen), euro(f.prognose.ausgaben))}</p>`;
  const kz = (text, x, vz) => `<tr><td>${text}</td><td class="zahl">${T.tassen(x.tassen)}</td><td class="zahl">${vz(x.euro)}</td></tr>`;
  const kaffee = `<table class="finanzen hell drei">
      ${kz(T.kaffeeGottesdienst, k.gottesdienst, plus)}${kz(T.kaffeeOeffnungszeit, k.oeffnungszeit, plus)}
      <tr class="summe">${kz(T.kaffeeVerkauft, k.verkauft, plus).slice(4)}
      ${kz(T.kaffeeEinkauf, k.einkauf, minus)}
      <tr class="summe"><td>${T.kaffeeGewinn}</td><td></td><td class="zahl ${vorzeichenKlasse(k.gewinn)}">${mitVorzeichen(k.gewinn)}</td></tr></table>
    <p class="unter">${T.kaffeeGewinnInfo}</p>`;
  const S = T.spalten;
  const zeile = (x, jetzt) => `<tr${jetzt ? ' class="jetzt"' : ''}><td>${x.woche}${jetzt ? ` <small>(${T.laeuft})</small>` : ''}</td>
    <td class="zahl">${plus(x.summeEinnahmen)}</td><td class="zahl">${minus(x.summeAusgaben)}</td>
    <td class="zahl ${vorzeichenKlasse(x.saldo)}">${mitVorzeichen(x.saldo)}</td>
    <td class="zahl">${T.tassen(x.kaffee.verkauft.tassen)}</td><td class="zahl ${vorzeichenKlasse(x.kaffee.gewinn)}">${mitVorzeichen(x.kaffee.gewinn)}</td>
    <td class="zahl">${geld(x.konto)}</td></tr>`;
  const verlauf = `<table class="finanzen hell verlauf"><tr><th>${S.woche}</th><th>${S.einnahmen}</th><th>${S.ausgaben}</th><th>${S.saldo}</th><th>${S.kaffee}</th><th>${S.kaffeeGewinn}</th><th>${S.konto}</th></tr>
      ${zeile({ ...w, konto: f.konto }, true)}${f.verlauf.map(x => zeile(x, false)).join('')}</table>
    ${f.verlauf.length ? '' : `<p class="leer">${T.verlaufLeer}</p>`}`;
  const DS = T.dauerspenderSpalten, ds = f.dauerspender;
  const dauerspender = `<p class="unter">${T.dauerspenderInfo(f.dauerspendeRegeln)}</p>` + (ds.length
    ? `<table class="finanzen hell verlauf"><tr><th>${DS.name}</th><th>${DS.betrag}</th><th>${DS.naechster}</th><th>${DS.seit}</th><th>${DS.haltung}</th></tr>
        ${ds.map(d => `<tr><td>${esc(d.name || '–')}</td><td class="zahl">${plus(d.betrag)}</td><td class="zahl">${plus(d.naechster)}</td><td class="zahl">${d.seit}</td><td class="zahl">${d.haltung ?? '–'}</td></tr>`).join('')}
        <tr class="summe"><td>${T.dauerspenderSumme}</td><td class="zahl">${plus(ds.reduce((a, d) => a + d.betrag, 0))}</td><td class="zahl">${plus(ds.reduce((a, d) => a + d.naechster, 0))}</td><td></td><td></td></tr></table>`
    : `<p class="leer">${T.dauerspenderLeer}</p>`);
  const zusatz = b => b.spenderName ? esc(b.spenderName) : b.anlass ? T.anlass[b.anlass] : b.moebelName ? b.moebelName + (b.was === 'verbessern' ? ' ' + T.was.verbessern : '')
    : b.veranstaltungName || (b.was ? T.was[b.was] : '');
  const uhr = b => b.tag === null ? '' : `${TEXTE.tageKurz[b.tag]} ${String(b.stunde).padStart(2, '0')}:${String(b.minute).padStart(2, '0')} · `;
  const kassenbuch = f.buchungen.length
    ? `<ul class="protokoll kassenbuch">${f.buchungen.map(b => {
        const name = (b.seite === 'einnahmen' ? EINNAHMEN : AUSGABEN)[b.kategorie] || b.kategorie, z = zusatz(b);
        const tassen = b.tassen && b.anlass === 'einkauf' ? ` (${T.tassen(b.tassen)})` : '';
        return `<li><span>${uhr(b)}${name}${z ? ' · ' + z : ''}${tassen}</span><b class="${b.seite === 'einnahmen' ? 'ok' : 'fehlt'}">${b.seite === 'einnahmen' ? '+' : '−'}${geld(b.betrag)}</b></li>`;
      }).join('')}</ul>`
    : `<p class="leer">${T.kassenbuchLeer}</p>`;
  return `<h2>${T.titel}</h2><p class="unter staerker">${T.kontostand(geld(f.konto))}</p>
    <h3>${T.dieseWoche(w.woche)}</h3>${woche}
    <h3>${T.kaffee}</h3>${kaffee}
    <h3>${T.dauerspender}</h3>${dauerspender}
    <h3>${T.verlauf}</h3><p class="unter">${T.verlaufInfo(f.verlaufWochen)}</p>${verlauf}
    <h3>${T.kassenbuch}</h3>${kassenbuch}
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Bekanntheit: woher, Verlauf (Kurve + letzte Änderungen), was sie bewirkt. Alle Zahlen kommen vom Spiel.
const dez = n => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
const prozent = n => (Math.round(n * 1000) / 10).toLocaleString('de-DE') + ' %';
function bekanntheitFenster() {
  const T = TEXTE.bekanntheitFenster, b = ui.spiel.bekanntheitInfo(), q = b.quellen, w = b.wirkung;
  // Kurve: x = Woche, y = Bekanntheit; die y-Achse passt sich an (mindestens bis 10), damit kleine Werte sichtbar sind
  const V = b.verlauf, W = 300, H = 110, oben = Math.max(10, Math.ceil(Math.max(...V.map(p => p.wert)) / 5) * 5);
  const px = i => V.length < 2 ? W / 2 : 24 + i * (W - 34) / (V.length - 1), py = v => 8 + (H - 26) * (1 - v / oben);
  const linie = V.map((p, i) => `${px(i).toFixed(1)},${py(p.wert).toFixed(1)}`).join(' ');
  const schritt = Math.max(1, Math.ceil(V.length / 8));
  const kurve = `<svg class="kurve" viewBox="0 0 ${W} ${H}" role="img" aria-label="${T.verlaufInfo}">
    <line x1="24" y1="${py(0)}" x2="${W - 10}" y2="${py(0)}" stroke="#cfc9bb"/><line x1="24" y1="${py(oben)}" x2="${W - 10}" y2="${py(oben)}" stroke="#e2dccf"/>
    <text x="20" y="${py(0) + 4}" font-size="10" text-anchor="end" fill="#6b665b">0</text><text x="20" y="${py(oben) + 4}" font-size="10" text-anchor="end" fill="#6b665b">${oben}</text>
    <polyline points="${linie}" fill="none" stroke="#2d69be" stroke-width="2"/>
    ${V.map((p, i) => `<circle cx="${px(i).toFixed(1)}" cy="${py(p.wert).toFixed(1)}" r="${p.jetzt ? 4 : 2.5}" fill="#2d69be"><title>${T.woche(p.woche)}: ${dez(p.wert)}</title></circle>`).join('')}
    ${V.map((p, i) => i % schritt && i !== V.length - 1 ? '' : `<text x="${px(i).toFixed(1)}" y="${H - 4}" font-size="10" text-anchor="middle" fill="#6b665b">${p.woche}</text>`).join('')}
  </svg>`;
  const protokoll = b.protokoll.length
    ? `<ul class="protokoll">${b.protokoll.map(e => `<li><span>${T.woche(e.woche)} · ${TEXTE.tageKurz[e.tag]} · ${T.eintrag[e.quelle](e.anzahl)}</span><b>${e.wert > 0 ? '+' : '−'}${dez(Math.abs(e.wert))}</b></li>`).join('')}</ul>`
    : `<p class="leer">${T.keine}</p>`;
  return `<h2>${T.titel}</h2><p class="unter staerker">${T.stand(dez(b.wert), b.max)}</p>
    <h3>${T.woher}</h3><ul class="quellen"><li>${T.quellen.gottesdienst(dez(q.gottesdienst))}</li><li>${T.quellen.zufrieden(dez(q.zufrieden), q.zufriedenAb)}</li><li>${T.quellen.seelsorge(dez(q.seelsorge))}</li></ul>
    <h3>${T.verlauf}</h3><p class="unter">${T.verlaufInfo}</p>${kurve}
    <h3>${T.letzte}</h3>${protokoll}
    <h3>${T.wirkung}</h3><ul class="quellen"><li>${T.neue(w.teiler, dez(w.neueProWoche))}</li>
      <li>${T.neugier(prozent(w.neugierGrund), prozent(w.neugier), w.plakatFaktor)}</li>
      ${w.teile.gelaende || w.teile.schaukasten ? `<li>${T.neugierDazu(prozent(w.teile.gelaende), prozent(w.teile.schaukasten))}</li>` : ''}</ul>
    ${gelaendeAbschnitt()}
    ${einzugsgebietAbschnitt()}
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Gelände: Wert, woraus er besteht, Wirkung auf die Neugier, Aushänge der Schaukästen (ENTWURF 25.11.)
const terminKurz = (tag, slot, slots) => TEXTE.raum.termin(TEXTE.tage[tag], TEXTE.raum.slots[slot], `${String(slots.find(x => x.id === slot).stunde).padStart(2, '0')}:00`);
function gelaendeAbschnitt() {
  const G = TEXTE.gelaende, g = ui.spiel.gelaendeInfo();
  const teile = g.teile.length ? `<ul class="quellen">${g.teile.map(t => `<li>${G.teil(t.anzahl, esc(t.name), dez(t.punkte))}</li>`).join('')}</ul>
      ${g.summe > g.max ? `<p class="unter">${G.gekappt(dez(g.summe), g.max)}</p>` : ''}` : `<p class="leer">${G.keine}</p>`;
  const aushaenge = g.aushaenge.length
    ? `<ul class="quellen">${g.aushaenge.map(a => `<li>${G.aushang(esc(a.artName || ''), esc(a.raumName || ''), terminKurz(a.tag, a.slot, g.slots), prozent(g.schaukastenNeugier))}</li>`).join('')}</ul>`
    : `<p class="leer">${G.keinAushang}</p>`;
  return `<h3>${G.titel}</h3>
    <p class="unter staerker">${G.stand(dez(g.wert), g.max)}</p>
    <div class="balken"><span style="width:${Math.min(100, Math.round(g.wert / g.max * 100))}%"></span></div>
    <p class="unter">${G.info}</p>${teile}
    <p class="unter">${G.wirkung(prozent(g.neugier))}</p>
    ${g.schaukaesten ? `<h3>${G.schaukasten}</h3>${aushaenge}` : ''}`;
}

// Schaukasten: regelmäßige Veranstaltung wählen, für die er wirbt (ENTWURF 25.11.)
function schaukastenFenster(f) {
  const S = TEXTE.schaukasten, s = ui.spiel.schaukastenInfo(f.x, f.y);
  if (!s) return null;
  const liste = s.auswahl.length
    ? `<div class="typen">${s.auswahl.map(a => `<button class="typ${a.aktiv ? ' aktiv' : ''}" data-aushang="${a.raumNr}:${a.platz}">
        <span><b>${esc(a.artName || '')}</b><small>${esc(a.raumName)} · ${terminKurz(a.tag, a.slot, s.slots)}${a.aktiv ? ` · ${S.jetzt}` : ''}</small></span></button>`).join('')}</div>`
    : `<p class="leer">${S.keine}</p>`;
  return `<h2>${S.titel}</h2><p>${S.info(prozent(s.neugier))}</p>
    ${s.aushang ? '' : `<p class="unter">${S.leer}</p>`}
    ${liste}
    <p class="unter">${S.doppelt}</p>
    <div class="zeile">${s.aushang ? `<button data-aushang-weg>${S.abnehmen}</button>` : ''}<button data-zu>Schließen</button></div>`;
}

// Einzugsgebiet: Stand, woraus die Grenze besteht, Maßnahmen (Parkplatz, Bushaltestelle, Werbekampagne)
function einzugsgebietAbschnitt() {
  const E = TEXTE.einzugsgebiet, e = ui.spiel.einzugsgebietInfo(), t = e.teile;
  const teile = [E.teile.start(t.start), t.parkplatz || e.parkplatz.anzahl ? E.teile.parkplatz(t.parkplatz, e.parkplatz.verbunden) : null,
    e.bus.stufe ? E.teile.bus(t.bus, e.bus.name) : null, t.werbekampagne ? E.teile.werbekampagne(t.werbekampagne) : null].filter(Boolean);
  const frei = (ok, ab) => ok ? '' : `<p class="fehlt">${E.frei(ab)}</p>`;
  const n = e.bus.naechste, k = e.werbekampagne;
  const busKachel = `<div class="kachel"><b>${E.bushaltestelle}</b>
      ${e.bus.stufe ? `<span>${TEXTE.bus.stufe(e.bus.stufe, e.bus.maxStufe, esc(e.bus.name))}</span>` : ''}
      ${n ? `<span>${n.stufe > 1 ? TEXTE.bus.naechste(esc(n.name)) + ' · ' : ''}${E.plusPreis(n.plus, euro(n.preis))}</span>${frei(n.frei, n.abBekanntheit)}
        <div class="zeile links"><button data-bus-ausbauen ${n.frei && n.leistbar ? '' : 'disabled'}>${n.stufe === 1 ? E.kaufen : E.ausbauen(esc(n.name))}</button></div>
        ${n.frei && !n.leistbar ? `<p class="unter">${E.keinGeld}</p>` : ''}` : `<span>${TEXTE.bus.hoechste}</span>`}</div>`;
  const kampagne = `<div class="kachel"><b>${E.werbekampagne}</b>
      ${k.gekauft ? `<span class="ok">${E.gekauft}</span>` : `<span>${E.plusPreis(k.plus, euro(k.preis))}</span>${frei(k.frei, k.abBekanntheit)}
        <div class="zeile links"><button data-werbekampagne ${k.frei && k.leistbar ? '' : 'disabled'}>${E.kaufen}</button></div>
        ${k.frei && !k.leistbar ? `<p class="unter">${E.keinGeld}</p>` : ''}`}</div>`;
  return `<h3>${E.titel}</h3>
    <p class="unter staerker">${E.stand(e.erreicht, e.grenze)}</p>
    <div class="balken"><span style="width:${Math.min(100, Math.round(e.erreicht / e.grenze * 100))}%"></span></div>
    ${e.voll ? `<p class="warnung">${E.voll}</p>` : ''}
    <p class="unter">${E.info}</p>
    <ul class="quellen">${teile.map(x => `<li>${x}</li>`).join('')}</ul>
    <h3>${E.massnahmen}</h3>
    <div class="kacheln">
      <div class="kachel"><b>${E.parkplatz}</b><span>${E.parkplatzInfo(e.parkplatz.plus, euro(ui.spiel.moebelArten().find(m => m.id === 'parkplatz').kosten))}</span>${frei(e.parkplatz.frei, e.parkplatz.abBekanntheit)}</div>
      ${busKachel}${kampagne}
    </div>`;
}

// Bushaltestelle: Stufe, was sie bringt, nächste Stufe kaufen
function busFenster() {
  const E = TEXTE.einzugsgebiet, B = TEXTE.bus, b = ui.spiel.einzugsgebietInfo().bus, n = b.naechste;
  const jetzt = b.stufe ? `<p class="unter staerker">${B.stufe(b.stufe, b.maxStufe, esc(b.name))}</p><p class="unter">${B.bringt(b.plus)}</p>` : `<p>${B.keine}</p>`;
  const weiter = n ? `<h3>${n.stufe > 1 ? B.naechste(esc(n.name)) : esc(n.name)}</h3><p class="unter">${E.plusPreis(n.plus, euro(n.preis))}</p>
      ${n.frei ? '' : `<p class="fehlt">${E.frei(n.abBekanntheit)}</p>`}
      <div class="typen"><button data-bus-ausbauen ${n.frei && n.leistbar ? '' : 'disabled'}>${n.stufe === 1 ? E.kaufen : E.ausbauen(esc(n.name))}</button></div>
      ${n.frei && !n.leistbar ? `<p class="unter">${E.keinGeld}</p>` : ''}` : `<p class="ok">${B.hoechste}</p>`;
  return `<h2>${B.titel}</h2>${jetzt}${weiter}<div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Changelog: Änderungen der aktuellen Version (aus CHANGELOG.md)
function changelogFenster() {
  const T = TEXTE.changelog, c = changelogHolen(() => { letzterInhalt = ''; ui.anzeigeErzwingen(); ui.malen(); });
  let inhalt = '';
  if (c.fehler) inhalt = `<p class="leer">${T.fehler}</p>`;
  else if (c.bereiche) inhalt = c.bereiche.map(b => `${b.titel ? `<h3>${esc(b.titel)}</h3>` : ''}<ul class="changelog">${b.punkte.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`).join('');
  return `<h2>${T.titel}</h2><p class="unter">${T.version(VERSION)}</p>${inhalt}
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Hilfe: Themenliste → ein Thema (Texte aus inhalte/hilfe.js). Solange sie offen ist, steht die Zeit (start.js).
const fett = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
function hilfeFenster(f) {
  const H = HILFE, thema = f.thema !== undefined ? H.themen.find(t => t.id === f.thema) : null;
  if (!thema) {
    const liste = H.themen.map(t => `<button class="hilfe-thema" data-hilfe="${t.id}">${esc(t.titel)}</button>`).join('');
    return `<h2>${H.titel}</h2><p class="unter">${H.info}</p><div class="hilfe-themen">${liste}</div>
      <div class="zeile"><button data-zu>Schließen</button></div>`;
  }
  const inhalt = thema.inhalt.map(b => typeof b === 'string' ? `<p class="hilfe-text">${fett(b)}</p>`
    : `<ul class="hilfe-punkte">${b.punkte.map(pk => `<li>${fett(pk)}</li>`).join('')}</ul>`).join('');
  return `<h2>${esc(thema.titel)}</h2>${inhalt}
    <div class="zeile"><button data-hilfe-zurueck>${H.zurueck}</button><button data-zu>Schließen</button></div>`;
}

// Kirchenjahr: jetzt (Zeit, Farbe, Erklärung, nächster Sonntag), kommende Feste in Worten, alle Zeiten. Alles vom Spiel.
function kirchenjahrFenster() {
  const K = TEXTE.kirchenjahr, k = ui.spiel.kirchenjahrInfo(), jetzt = k.zeiten.find(t => t.aktuell) || k.zeiten[0];
  const farbe = t => `<span class="farbe" style="background:${t.farbe}"></span>`;
  const feste = k.feste.map(f => {
    const wort = faktorWorte(f.besucher, f.kollekte), p = f.plan;
    const art = p ? (ui.spiel.festMenueInfo(f.schluessel).arten.find(a => a.id === p.art) || {}).name : '';
    // Konfirmation ohne Konfirmanden: kein Planen-Knopf; „fällt aus“ erst nach der Prüfung 7 Tage vorher
    const knopf = f.gross && f.planbar ? `<div class="zeile links"><button data-kj-planen="${f.schluessel}">${p ? K.aendern : K.planen}</button></div>` : '';
    const konfi = f.konfirmanden === null ? '' : `<small class="unter">${K.konfirmation}</small>${f.faelltAus ? `<span class="fehlt">${K.keineKonfirmanden}</span>` : ''}`;
    return `<div class="kachel"><b>${esc(f.konfirmanden !== null ? TEXTE.festMenue.konfirmanden(f.name, f.konfirmanden) : f.name)}</b>
      <span class="klein">${TEXTE.tage[f.wochentag]}, ${f.datum} · ${K.inTagen(f.tageBis)}</span>
      ${wort ? `<span>${wort}</span>` : ''}${f.feiertag ? `<span class="feiertag">${K.feiertag}</span>` : ''}${konfi}
      ${p ? `<span class="ok">${K.geplant(esc(art || ''), esc(p.raumName || '–'), esc(p.leitung || '–'))}</span>` : ''}${knopf}</div>`;
  }).join('');
  const gesperrt = k.gesperrt.map(f => `<button class="kachel" disabled><b>${esc(f.name)}</b><small class="unter">${K.gesperrt}</small></button>`).join('');
  const zeiten = k.zeiten.map(t => `<li${t.aktuell ? ' class="staerker"' : ''}>${farbe(t)} <b>${esc(t.name)}</b> (${K.farben[t.id]}) · ${faktorWorte(t.besucher, t.kollekte) || K.normal}<br><small>${K.erklaerung[t.id]}</small></li>`).join('');
  const heute = [k.heute.fest && K.heute(esc(k.heute.fest)), k.heute.feiertag && K.feiertag].filter(Boolean).join(' · ');
  return `<h2>${K.titel}</h2>
    <h3>${K.jetzt}</h3>
    <p class="unter staerker">${farbe(jetzt)} ${esc(jetzt.name)} (${K.farben[jetzt.id]})${faktorWorte(jetzt.besucher, jetzt.kollekte) ? ' · ' + faktorWorte(jetzt.besucher, jetzt.kollekte) : ''}</p>
    <p class="unter">${K.erklaerung[jetzt.id]}</p>
    <p class="unter">${K.naechsterSonntag(esc(k.sonntag.name), k.sonntag.datum)}${heute ? ' · ' + heute : ''}</p>
    <h3>${K.kommend}</h3><div class="kacheln">${feste}${gesperrt}</div>
    <h3>${K.zeiten}</h3><ul class="quellen kirchenjahr-zeiten">${zeiten}</ul>
    <div class="zeile"><button data-zu>Schließen</button></div>`;
}

// Fest-Menü: Zeit, Raum, Leitung, Art, Ehrenamtliche wählen → „Fest planen“ oder „Diesmal nicht“.
// Die Auswahl merkt sich das Fenster (f.auswahl), bis „Fest planen“ sie ans Spiel schickt.
function festFenster(f) {
  const M = TEXTE.festMenue, m = ui.spiel.festMenueInfo(f.schluessel);
  if (!m) return null;
  if (!f.auswahl) f.auswahl = m.auswahl;
  const a = f.auswahl, R = TEXTE.raum;
  const wahl = (feld, wert, aktiv, text, aus = false) => `<button class="kachel klein-kachel${aktiv ? ' aktiv' : ''}" data-fest-feld="${feld}" data-fest-wert="${esc(wert)}" ${aus ? 'disabled' : ''}><b>${text}</b></button>`;
  const uhr = s => `${String(s.stunde).padStart(2, '0')}:00`;
  const gleich = m.raeume.filter(r => m.raeume.filter(x => x.name === r.name).length > 1);
  const raumName = r => gleich.includes(r) ? `${esc(r.name)} ${gleich.filter(x => x.name === r.name).indexOf(r) + 1}` : esc(r.name);
  const wort = faktorWorte(m.besucher, m.kollekte);
  const faellt = m.faellt.map(x => `<li>${M.faellt(x.platz, x.raumName ? esc(x.raumName) : '')}</li>`).join('');
  const ea = m.ehrenamtliche.length
    ? m.ehrenamtliche.map(p => wahl('ehrenamt', p.id, a.ehrenamt.includes(p.id), esc(p.name))).join('')
    : `<p class="leer">${M.keineEA}</p>`;
  const kannPlanen = a.raumNr !== null && a.leitung && a.art;
  const unten = m.offen
    ? `<button data-fest-nicht>${M.nicht}</button><button class="haupt" data-fest-planen ${kannPlanen ? '' : 'disabled'}>${M.planen}</button>`
    : `${m.geplant ? `<button data-fest-nicht>${M.absagen}</button>` : ''}${f.vonKirchenjahr ? `<button data-fest-zurueck>${M.zurueck}</button>` : '<button data-zu>Schließen</button>'}<button class="haupt" data-fest-planen ${kannPlanen ? '' : 'disabled'}>${M.planen}</button>`;
  return `<h2>${M.titel}</h2>
    <p class="unter staerker">${M.zeile(m.konfirmanden !== null ? M.konfirmanden(esc(m.name), m.konfirmanden) : esc(m.name), TEXTE.tage[m.wochentag], m.datum, TEXTE.kirchenjahr.inTagen(m.tageBis))}</p>
    ${wort ? `<p class="unter">${M.erwartet(wort)}</p>` : ''}
    <h3>${M.zeit}</h3><div class="kacheln">${m.slots.map(s => wahl('slot', s.id, a.slot === s.id, `${R.slots[s.id]} · ${uhr(s)}`)).join('')}</div>
    <h3>${M.raum}</h3>${m.raeume.length ? `<div class="kacheln">${m.raeume.map(r => wahl('raumNr', r.nr, a.raumNr === r.nr, raumName(r))).join('')}</div>` : `<p class="warnung">${M.keinRaum}</p>`}
    <h3>${M.leitung}</h3><div class="kacheln">${m.hauptamtliche.map(p => wahl('leitung', p.id, a.leitung === p.id, esc(p.name))).join('')}</div>
    <p class="unter">${M.imRaum}</p>
    <h3>${M.art}</h3><div class="kacheln">${m.arten.map(x => wahl('art', x.id, a.art === x.id, esc(x.name))).join('')}</div>
    <h3>${M.ehrenamtliche}</h3><div class="kacheln">${ea}</div><p class="unter">${M.eaSpaeter}</p>
    <p class="unter">${M.hinweis}</p>${faellt ? `<ul class="quellen">${faellt}</ul>` : ''}
    <div class="zeile">${unten}</div>`;
}

// Seelsorge: Anfrage → annehmen (3 Ratschläge) oder ablehnen → Ergebnis
function seelsorgeFenster(f) {
  const a = ui.spiel.lage().seelsorge;
  if (!a) return null;
  const T = TEXTE.seelsorge, sit = T.situationen[a.situation], name = esc(a.vorname);
  const wer = `<p class="unter">${T.person(TEXTE.menschen.status[a.status] || '', a.besuche, a.haltung)}</p>`;
  // Einschätzung des Pastors zu einem Rat (je nach Stufe: nichts, „passt“-Markierung, Einschätzung, Prozent)
  const urteil = k => {
    const teile = [k.beste && T.beste, k.einschaetzung && T.einschaetzung[k.einschaetzung], k.prozent !== null && T.prozent(k.prozent)].filter(Boolean);
    return teile.length ? `<em class="urteil ${k.einschaetzung || (k.beste ? 'gut' : '')}">${teile.join(' · ')}</em>` : '';
  };
  let inhalt;
  if (a.phase === 'frage' && !f.angenommen) {
    inhalt = `<p class="unter staerker">${T.anfrage(esc(a.voll))}</p>${wer}<p>${sit.anfrage(name)}</p>
      <div class="zeile"><button data-ablehnen>${T.ablehnen}</button><button class="haupt" data-annehmen>${T.annehmen}</button></div>`;
  } else if (a.phase === 'frage') {
    inhalt = `${wer}<p>${sit.anfrage(name)}</p><div class="typen">${sit.raete.map((r, i) => {
      const k = a.raete[i];
      return `<button class="typ rat" data-rat="${i}" ${k.leistbar ? '' : 'disabled'}><span>„${r.text}“${urteil(k)}${k.kosten ? `<small>${T.folgen.kosten(euro(k.kosten))}${k.leistbar ? '' : ' · ' + T.keinGeld}</small>` : ''}</span></button>`;
    }).join('')}</div>`;
  } else if (a.phase === 'abgelehnt') {
    inhalt = `<p>${T.abgelehnt(name)}</p><div class="zeile"><button data-seelsorge-zu>${T.schliessen}</button></div>`;
  } else {
    const e = a.ergebnis, F = T.folgen, rat = sit.raete[e.rat];
    const haltung = e.haltungVorher !== null && e.haltungVorher !== undefined ? T.haltungVorherNachher(e.haltungVorher, e.haltungNachher) : e.haltung && F.haltung(e.haltung);
    const folgen = [haltung, e.kommChance !== null && e.kommChance !== undefined && T.kommt(e.kommChance), e.bekanntheit && F.bekanntheit(e.bekanntheit),
      e.spende && F.spende(euro(e.spende)), e.kosten && F.kosten(euro(e.kosten)), e.neugierig && F.neugierig].filter(Boolean);
    inhalt = `<p class="unter">„${rat.text}“</p>
      <p class="${e.gut ? 'ok' : 'fehlt'}">${(e.gut ? rat.gut : rat.schlecht)(name)}</p>
      <p class="unter">${folgen.join(' · ')}</p>
      ${e.neueStufe ? `<p class="unter staerker">${T.neueStufe(e.neueStufe)}</p>
        <p class="unter">${T.stufeBonus(e.stufeBonus)}${e.freischaltung && T.karte.kann[e.freischaltung] ? ' ' + T.neuFreigeschaltet(T.karte.kann[e.freischaltung]) : ''}</p>` : ''}
      <div class="zeile"><button class="haupt" data-seelsorge-zu>${T.weiter}</button></div>`;
  }
  return `<h2>${T.titel}</h2>${inhalt}`;
}

// Forschung: vorerst ein schlichter Platzhalter-Baum (eine Reihe Knoten). Das Design im Stil eines mittelalterlichen
// Lebensbaums legt Lukas später fest. Abbrechen fragt im Fenster nach (keine Browser-Dialoge).
function forschungFenster(f) {
  const T = TEXTE.forschung, info = ui.spiel.forschungInfo();
  const knoten = info.forschungen.map(fo => {
    let unten;
    if (fo.zustand === 'erforscht') unten = `<p class="ok">${T.erforscht}</p>`;
    else if (fo.zustand === 'laeuft') {
      unten = `<div class="balken"><span style="width:${Math.round(fo.anteil * 100)}%"></span></div><p class="unter">${T.rest(fo.restSekunden)}</p>`
        + (f.abbrechenFragen
          ? `<p class="warnung">${T.abbrechenFrage}</p><div class="zeile"><button data-forschung-abbrechen-ja>${T.abbrechenJa}</button><button data-forschung-abbrechen-nein>${T.abbrechenNein}</button></div>`
          : `<div class="zeile"><button data-forschung-abbrechen>${T.abbrechen}</button></div>`);
    } else {
      const grund = T.zustand[fo.zustand];
      unten = `${grund ? `<p class="fehlt">${grund}</p>` : ''}<div class="zeile"><button class="haupt" data-forschung="${esc(fo.id)}" ${fo.zustand === 'bereit' ? '' : 'disabled'}>${T.starten}</button></div>`;
    }
    return `<div class="forschung-knoten ${fo.zustand}">
      <b>${esc(fo.name)}</b>
      ${T.beschreibung[fo.id] ? `<p class="unter">${T.beschreibung[fo.id]}</p>` : ''}
      <p class="unter">${T.kosten(euro(fo.kosten.geld), fo.kosten.heiligkeit)}</p>
      <p class="unter" title="${T.dauerInfo}">${T.dauer(fo.dauer)}</p>
      ${unten}</div>`;
  }).join('');
  return `<h2>${T.titel}</h2>
    <p class="unter">${T.vorrat(Math.floor(info.heiligkeit), euro(info.konto))}</p>
    <div class="forschung-baum">${knoten}</div>
    ${multiplikatorAbschnitt(info.multiplikator)}
    <div class="zeile"><button data-zu>${T.schliessen}</button></div>`;
}
// Haltungs-Multiplikator: eigener Abschnitt unter dem Baum, sofort mit Heiligkeit kaufen
function multiplikatorAbschnitt(m) {
  const T = TEXTE.forschung.multiplikator, n = m.naechste;
  return `<div class="forschung-knoten multiplikator">
    <b>${T.titel}</b>
    <p class="unter">${T.erklaerung}</p>
    <p class="unter staerker">${T.stufe(m.stufe, m.maxStufe, m.faktor)}</p>
    ${n ? `<p class="unter">${T.naechste(n.faktor, n.preis)}</p>${n.leistbar ? '' : `<p class="fehlt">${T.zuWenig}</p>`}
      <div class="zeile"><button class="haupt" data-multiplikator ${n.leistbar ? '' : 'disabled'}>${T.kaufen}</button></div>`
      : `<p class="ok">${T.fertig}</p>`}
  </div>`;
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
    else if (b.dataset.kjPlanen) return fensterOeffnen({ art: 'fest', schluessel: b.dataset.kjPlanen, vonKirchenjahr: true });   // aus dem Kirchenjahr-Fenster
    else if (b.dataset.festFeld) {   // Fest-Menü: Auswahl merken (noch nicht ans Spiel)
      const feld = b.dataset.festFeld, w = b.dataset.festWert;
      if (feld === 'ehrenamt') f.auswahl.ehrenamt = f.auswahl.ehrenamt.includes(w) ? f.auswahl.ehrenamt.filter(x => x !== w) : [...f.auswahl.ehrenamt, w];
      else f.auswahl[feld] = feld === 'raumNr' ? Number(w) : w;
    }
    else if (b.hasAttribute('data-fest-planen')) {
      if (spiel.festPlanen(f.schluessel, f.auswahl) === 'ok') { ui.speichern(); return f.vonKirchenjahr ? fensterOeffnen({ art: 'kirchenjahr' }) : fensterSchliessen(); }
    }
    else if (b.hasAttribute('data-fest-nicht')) { spiel.festAbsagen(f.schluessel); ui.speichern(); return f.vonKirchenjahr ? fensterOeffnen({ art: 'kirchenjahr' }) : fensterSchliessen(); }
    else if (b.hasAttribute('data-fest-zurueck')) return fensterOeffnen({ art: 'kirchenjahr' });
    else if (b.dataset.platz !== undefined) f.platz = Number(b.dataset.platz);   // Menü „Veranstaltung n einstellen“
    else if (b.hasAttribute('data-zurueck')) { delete f.platz; delete f.waehlen; }
    else if (b.dataset.hilfe) f.thema = b.dataset.hilfe;               // Hilfe: Thema öffnen
    else if (b.hasAttribute('data-hilfe-zurueck')) delete f.thema;     // Hilfe: zurück zur Themenliste
    else if (b.hasAttribute('data-schicht-neu')) f.waehlen = true;
    else if (b.dataset.schichtWeg !== undefined) spiel.schichtEntfernen(f.nr, Number(b.dataset.schichtWeg));
    else if (b.dataset.schicht) { const [tag, slot] = b.dataset.schicht.split(':'); if (spiel.schichtHinzufuegen(f.nr, Number(tag), slot) === 'ok') delete f.waehlen; }
    else if (b.dataset.veranstaltung !== undefined) spiel.veranstaltungSetzen(f.nr, f.platz ?? 0, b.dataset.veranstaltung);   // Fenster bleibt offen
    else if (b.dataset.plan) { const [tag, slot] = b.dataset.plan.split(':'); spiel.terminSetzen(f.nr, f.platz ?? 0, Number(tag), slot); }
    else if (b.hasAttribute('data-verbessern')) spiel.stuhlVerbessern(f.x, f.y);
    else if (b.hasAttribute('data-alle-verbessern')) spiel.alleStuehleVerbessern(f.x, f.y);
    else if (b.hasAttribute('data-plakat')) spiel.plakatKaufen();
    else if (b.dataset.aushang) { const [nr, platz] = b.dataset.aushang.split(':').map(Number); spiel.aushangSetzen(f.x, f.y, nr, platz); }
    else if (b.hasAttribute('data-aushang-weg')) spiel.aushangSetzen(f.x, f.y, null);
    else if (b.dataset.forschung) { spiel.forschungStarten(b.dataset.forschung); delete f.abbrechenFragen; }
    else if (b.hasAttribute('data-forschung-abbrechen')) f.abbrechenFragen = true;
    else if (b.hasAttribute('data-multiplikator')) spiel.multiplikatorKaufen();
    else if (b.hasAttribute('data-forschung-abbrechen-nein')) delete f.abbrechenFragen;
    else if (b.hasAttribute('data-forschung-abbrechen-ja')) { spiel.forschungAbbrechen(); delete f.abbrechenFragen; }
    else if (b.hasAttribute('data-bus-ausbauen')) spiel.busAusbauen();
    else if (b.hasAttribute('data-werbekampagne')) spiel.werbekampagneKaufen();
    else if (b.dataset.typ !== undefined) { spiel.raumTypSetzen(f.nr, b.dataset.typ); fensterSchliessen(); }
    ui.speichern(); ui.anzeigeErzwingen(); ui.malen();
  });
}
