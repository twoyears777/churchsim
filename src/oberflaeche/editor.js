// Bedienung: Spielansicht (Management) und Editor. Nimmt Eingaben entgegen und ruft die Spiellogik auf.
import { RAUMTYPEN } from '../inhalte/raumtypen.js';
import { GRUNDSTUECK, GEHWEGE } from '../inhalte/umgebung.js';
import { neuerZustand, wandRechteck, abriss, tuerUmschalten, erkenneRaeume, pruefeRaum, raumTypVon, typZuweisen, idx } from '../kern/karte.js';
import { personenAnlegen, personenPruefen, versetzen, verfuegbarkeit, daten, eingesetztIn } from '../kern/personen.js';
import { moebelAnlegen, moebelSetzen, moebelEntfernen, moebelPruefen, moebelBei } from '../kern/moebel.js';
import { raumBereitschaft, kannWocheBeenden, wocheBeenden } from '../kern/runde.js';
import { sonntagDerWoche } from '../kern/kalender.js';
import { weg } from '../kern/wege.js';
import { wandBauen, wandKonflikte } from '../kern/bauen.js';
import { namenZiehen } from '../kern/besucher.js';
import { zeichne } from '../ansicht/zeichnen.js';

const SPEICHER = 'churchsim-editor';
const VERSION = 2;
const HINWEISE = {
  wand: 'Zieh ein Rechteck, um Wände zu bauen.',
  tuer: 'Tippe auf eine Wand, um eine Tür zu setzen oder zu entfernen.',
  stuhl: 'Tippe um einen Stuhl aufzustellen',
  abriss: 'Zieh über den Bereich, der abgerissen werden soll.',
  raum: 'Tippe in einen Raum, um seine Funktion festzulegen.'
};
const LAUFTEMPO = 7;      // Kästchen pro Sekunde
const ABSTAND_MS = 260;   // Abstand zwischen zwei Besuchern

let z = laden() || neuerZustand();
personenAnlegen(z); moebelAnlegen(z); if (typeof z.woche !== 'number') z.woche = 0;
let raeume = auswerten();
let werkzeug = 'wand', ziehen = null, auswahl = null, editorOffen = false, tragen = null;
let besucher = [], ablauf = null, stuhlStart = null;
const verlauf = [];

const $ = id => document.getElementById(id);
const leinwand = $('karte'), ctx = leinwand.getContext('2d'), flaeche = $('flaeche');
const maske = $('maske'), rueckblick = $('rueckblick');
let ansicht = { k: 16, ox: 0, oy: 0 };

function auswerten() {
  const { raeume: liste, gruppe } = erkenneRaeume(z);
  for (const r of liste) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); }
  return { liste, gruppe };
}
function speichern() {
  try { localStorage.setItem(SPEICHER, JSON.stringify({ version: VERSION, zustand: z })); } catch (e) {}
}
function laden() {
  try {
    const d = JSON.parse(localStorage.getItem(SPEICHER));
    if (d && d.version === VERSION && d.zustand && d.zustand.zellen) return d.zustand;
  } catch (e) {}
  return null;
}
function aendern(fn) {
  verlauf.push(JSON.stringify(z));
  if (verlauf.length > 60) verlauf.shift();
  fn();
  moebelPruefen(z); personenPruefen(z);
  raeume = auswerten(); speichern(); malen();
}

function groesseAnpassen() {
  const dpr = window.devicePixelRatio || 1, b = flaeche.clientWidth, h = flaeche.clientHeight;
  leinwand.width = b * dpr; leinwand.height = h * dpr;
  leinwand.style.width = b + 'px'; leinwand.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const k = Math.max(6, Math.floor(Math.min(b / z.w, h / z.h)));
  ansicht = { k, ox: Math.floor((b - z.w * k) / 2), oy: Math.floor((h - z.h * k) / 2) };
  malen();
}
function figuren() {
  return z.personen.map(p => ({ ...daten(p), x: p.x, y: p.y, getragen: tragen && tragen.person === p })).filter(f => f.art);
}
function malen() {
  ctx.clearRect(0, 0, leinwand.width, leinwand.height);
  const konflikte = ziehen && ziehen.art === 'wand' ? wandKonflikte(z, ziehen.x0, ziehen.y0, ziehen.x1, ziehen.y1) : [];
  zeichne(ctx, z, raeume, ansicht, { vorschau: ziehen, konflikte, auswahl, raster: editorOffen, personen: figuren(), tragen, moebel: z.moebel, besucher });
  anzeigenAktualisieren();
}

// ---- Anzeigen in der Spiel-Leiste ----
function anzeigenAktualisieren() {
  const v = verfuegbarkeit(z, raeume);
  $('anzHauptamt').textContent = `${v.hauptamt.frei}/${v.hauptamt.gesamt}`;
  $('anzEhrenamt').textContent = `${v.ehrenamt.frei}/${v.ehrenamt.gesamt}`;
  const s = ablauf ? ablauf.beendet : sonntagDerWoche(z.woche); // während des Gottesdienstes noch der laufende Sonntag
  $('sonntag').textContent = `${s.name} · ${s.datum}`;
  const kann = kannWocheBeenden(z, raeume);
  $('wocheBeenden').disabled = !kann || !!ablauf;
  $('spielHinweis').textContent = kann || ablauf ? '' : wasFehlt();
}
function wasFehlt() {
  const gd = raumBereitschaft(z, raeume).filter(b => b.typ.id === 'gottesdienst');
  if (!gd.length) return 'Für den Gottesdienst fehlt ein fertiger Gottesdienstraum.';
  const b = gd[0], typ = b.typ, teile = [];
  if (b.fehlt.includes('leitung')) teile.push('der Pastor im Gottesdienstraum');
  if (b.fehlt.includes('stuehle')) teile.push(`mindestens ${typ.minStuehle} Stühle (bisher ${b.stuehle.length})`);
  return `Für den Gottesdienst fehlt: ${teile.join(' und ')}.`;
}

// ---- Eingaben auf der Karte ----
function punktAus(e) { const r = leinwand.getBoundingClientRect(); return { px: e.clientX - r.left, py: e.clientY - r.top }; }
function feldAus(e) {
  const { px, py } = punktAus(e);
  const x = Math.floor((px - ansicht.ox) / ansicht.k), y = Math.floor((py - ansicht.oy) / ansicht.k);
  return { x: Math.max(0, Math.min(z.w - 1, x)), y: Math.max(0, Math.min(z.h - 1, y)) };
}
function figurBei(e) {
  const { px, py } = punktAus(e), k = ansicht.k;
  let beste = null, abstand = Math.max(22, k * 1.1);
  for (const p of z.personen) {
    const d = Math.hypot(ansicht.ox + (p.x + 0.5) * k - px, ansicht.oy + (p.y + 0.5) * k - py);
    if (d < abstand) { abstand = d; beste = p; }
  }
  return beste;
}
const personAuf = (x, y) => z.personen.some(p => p.x === x && p.y === y);

leinwand.addEventListener('pointerdown', e => {
  if (ablauf) return;
  if (!editorOffen) {
    const p = figurBei(e);
    if (p) { leinwand.setPointerCapture(e.pointerId); const a = punktAus(e); tragen = { person: p, ...a, start: a, bewegt: false }; malen(); }
    return;
  }
  const f = feldAus(e);
  stuhlStart = f;
  if (werkzeug === 'wand' || werkzeug === 'abriss') {
    leinwand.setPointerCapture(e.pointerId);
    ziehen = { x0: f.x, y0: f.y, x1: f.x, y1: f.y, art: werkzeug };
    malen();
  }
});
leinwand.addEventListener('pointermove', e => {
  if (tragen) {
    const a = punktAus(e);
    if (Math.hypot(a.px - tragen.start.px, a.py - tragen.start.py) > 6) tragen.bewegt = true;
    Object.assign(tragen, a); malen(); return;
  }
  if (!ziehen) return;
  const f = feldAus(e);
  if (f.x !== ziehen.x1 || f.y !== ziehen.y1) { ziehen.x1 = f.x; ziehen.y1 = f.y; malen(); }
});
leinwand.addEventListener('pointerup', e => {
  if (tragen) {
    const f = feldAus(e), p = tragen.person, bewegt = tragen.bewegt; tragen = null;
    if (!bewegt) { karteOeffnen(p); return; }   // nur angetippt: Charakter-Karte
    if (p.x !== f.x || p.y !== f.y) aendern(() => versetzen(z, p, f.x, f.y)); else malen();
    return;
  }
  if (!editorOffen) return;
  const f = feldAus(e);
  if (ziehen) {
    const v = ziehen; ziehen = null;
    if (v.art === 'wand') { if (!wandKonflikte(z, v.x0, v.y0, v.x1, v.y1).length) aendern(() => wandBauen(z, v.x0, v.y0, v.x1, v.y1)); else malen(); }
    else aendern(() => { abriss(z, v.x0, v.y0, v.x1, v.y1); moebelEntfernen(z, v.x0, v.y0, v.x1, v.y1); });
    return;
  }
  if (werkzeug === 'stuhl') {
    if (!stuhlStart || stuhlStart.x !== f.x || stuhlStart.y !== f.y) return;   // nur Tippen, kein Ziehen
    if (!moebelBei(z, f.x, f.y)) aendern(() => moebelSetzen(z, 'stuhl', f.x, f.y, f.x, f.y, personAuf)); // entfernen nur per Abriss
  } else if (werkzeug === 'tuer') {
    if (z.zellen[idx(z, f.x, f.y)]) aendern(() => tuerUmschalten(z, f.x, f.y));
  } else if (werkzeug === 'raum') {
    const nr = raeume.gruppe[idx(z, f.x, f.y)];
    if (nr >= 0) { auswahl = nr; maskeOeffnen(); } else maskeSchliessen();
  }
});
leinwand.addEventListener('pointercancel', () => { ziehen = null; tragen = null; malen(); });

// ---- Raum-Maske ----
function maskeOeffnen() {
  const r = raeume.liste[auswahl];
  const zeilen = RAUMTYPEN.map(t => {
    const p = pruefeRaum(z, r, t), aktiv = r.typ && r.typ.id === t.id;
    const status = p.includes('groesse') ? `zu klein, mind. ${t.minGroesse[0]} × ${t.minGroesse[1]}` : `mind. ${t.minGroesse[0]} × ${t.minGroesse[1]}`;
    return `<button class="typ${aktiv ? ' aktiv' : ''}" data-typ="${t.id}" ${p.includes('groesse') ? 'disabled' : ''}>
      <span class="farbe" style="background:${t.farbe}"></span><span><b>${t.name}</b><small>${status}</small></span></button>`;
  }).join('');
  maske.querySelector('.inhalt').innerHTML = `<h2>Raumfunktion</h2>
    ${r.tueren === 0 ? '<p class="warnung">Dieser Raum hat noch keine Tür.</p>' : ''}
    <div class="typen">${zeilen}</div>
    <div class="zeile">${r.typ ? '<button data-typ="">Funktion entfernen</button>' : ''}<button data-zu>Schließen</button></div>`;
  maske.hidden = false; malen();
}
// ---- Charakter-Karte eines Mitarbeiters ----
const ART_TEXT = { hauptamt: 'Hauptamtlich', ehrenamt: 'Ehrenamtlich' };
function karteOeffnen(p) {
  const d = daten(p), raum = eingesetztIn(z, raeume, p);
  maske.querySelector('.inhalt').innerHTML = `<h2>${d.name}</h2>
    <p class="unter">${ART_TEXT[d.art]} · ${raum ? 'Im Einsatz: ' + raum.typ.name : 'Verfügbar'}</p>
    <h3>Skills</h3><p class="leer">Skills folgen später</p>
    <div class="zeile"><button data-zu>Schließen</button></div>`;
  auswahl = null; maske.hidden = false; malen();
}
function maskeSchliessen() { maske.hidden = true; auswahl = null; malen(); }
maske.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.hasAttribute('data-zu')) return maskeSchliessen();
  if (b.dataset.typ !== undefined) {
    const r = raeume.liste[auswahl];
    aendern(() => typZuweisen(z, r, b.dataset.typ || null));
    maskeSchliessen();
  }
});

// ---- Woche beenden: Besucher laufen ein, dann Wochenrückblick ----
function wocheStarten() {
  if (ablauf || !kannWocheBeenden(z, raeume)) return;
  const beendet = sonntagDerWoche(z.woche);
  const ergebnis = wocheBeenden(z, raeume);
  speichern();
  const g = GRUNDSTUECK, gehweg = GEHWEGE.find(w => w.w > w.h && w.y >= g.y + g.h);
  const plaetze = ergebnis.angebote.flatMap(a => a.plaetze);
  const blockiert = (x, y) => !!moebelBei(z, x, y) || personAuf(x, y);
  const jetzt = performance.now(), namen = namenZiehen(plaetze.length);
  besucher = plaetze.map((ziel, i) => {
    const start = { x: g.tor.x + (i % g.tor.breite), y: gehweg ? gehweg.y : g.y + g.h + 1 };
    return { name: namen[i], pfad: weg(z, start, ziel, blockiert) || [ziel], beginn: jetzt + i * ABSTAND_MS, x: start.x, y: start.y, sichtbar: false };
  });
  ablauf = { beendet, ergebnis };
  document.body.classList.add('laeuft');
  requestAnimationFrame(schritt);
}
function schritt(t) {
  let fertig = true;
  for (const b of besucher) {
    const strecke = (t - b.beginn) / 1000 * LAUFTEMPO, n = b.pfad.length - 1;
    if (strecke < 0) { fertig = false; continue; }
    b.sichtbar = true;
    if (strecke >= n) { b.x = b.pfad[n].x; b.y = b.pfad[n].y; b.sitzt = true; continue; }
    fertig = false;
    const i = Math.floor(strecke), a = b.pfad[i], c = b.pfad[i + 1], f = strecke - i;
    b.x = a.x + (c.x - a.x) * f; b.y = a.y + (c.y - a.y) * f;
  }
  malen();
  if (fertig) setTimeout(rueckblickZeigen, 600); else requestAnimationFrame(schritt);
}
const euro = n => `${n.toLocaleString('de-DE')} €`;
function rueckblickZeigen() {
  const { beendet, ergebnis: e } = ablauf;
  const saldo = e.finanzen.einnahmen - e.finanzen.ausgaben;
  const angebote = e.angebote.length
    ? e.angebote.map(a => `<tr><td>${a.name}</td><td class="zahl">${a.besucher}</td></tr>`).join('')
    : '<tr><td>Keine Besucher</td><td class="zahl">0</td></tr>';
  rueckblick.querySelector('.inhalt').innerHTML = `
    <h2>Wochenrückblick</h2><p class="unter">${beendet.name} · ${beendet.datum}</p>
    <h3>Finanzen</h3>
    <table><tr><td>Einnahmen</td><td class="zahl">${euro(e.finanzen.einnahmen)}</td></tr>
      <tr><td>Ausgaben</td><td class="zahl">${euro(e.finanzen.ausgaben)}</td></tr>
      <tr class="summe"><td>Saldo</td><td class="zahl">${euro(saldo)}</td></tr></table>
    <h3>Besucher</h3><table>${angebote}</table>
    <h3>Neue Ehrenamtliche</h3><table><tr><td>Dazugekommen</td><td class="zahl">${e.neueEhrenamtliche}</td></tr></table>
    <div class="zeile"><button id="weiter" class="haupt">Weiter</button></div>`;
  rueckblick.hidden = false;
  $('weiter').addEventListener('click', () => {
    rueckblick.hidden = true; besucher = []; ablauf = null;
    document.body.classList.remove('laeuft'); malen();
  });
}
$('wocheBeenden').addEventListener('click', wocheStarten);

// ---- Werkzeugleiste und Modi ----
document.querySelectorAll('[data-werkzeug]').forEach(b => b.addEventListener('click', () => {
  werkzeug = b.dataset.werkzeug;
  document.querySelectorAll('[data-werkzeug]').forEach(x => x.setAttribute('aria-pressed', x === b));
  $('hinweis').textContent = HINWEISE[werkzeug];
  maskeSchliessen();
}));
$('zurueck').addEventListener('click', () => {
  if (!verlauf.length) return;
  z = JSON.parse(verlauf.pop()); raeume = auswerten(); speichern(); maskeSchliessen();
});
const neuKnopf = $('neu');
let neuTimer = null;
neuKnopf.addEventListener('click', () => {
  if (neuKnopf.dataset.sicher) {
    clearTimeout(neuTimer); delete neuKnopf.dataset.sicher; neuKnopf.textContent = 'Neu';
    aendern(() => { z = neuerZustand(); personenAnlegen(z); }); maskeSchliessen();
  } else {
    neuKnopf.dataset.sicher = '1'; neuKnopf.textContent = 'Wirklich leeren?';
    neuTimer = setTimeout(() => { delete neuKnopf.dataset.sicher; neuKnopf.textContent = 'Neu'; }, 3000);
  }
});
function editorUmschalten(offen) {
  if (ablauf) return;
  editorOffen = offen; ziehen = null; tragen = null;
  document.body.classList.toggle('modus-editor', offen);
  document.body.classList.toggle('modus-spiel', !offen);
  maskeSchliessen();
}
$('editorAuf').addEventListener('click', () => editorUmschalten(true));
$('editorZu').addEventListener('click', () => editorUmschalten(false));

new ResizeObserver(groesseAnpassen).observe(flaeche);
$('hinweis').textContent = HINWEISE[werkzeug];
