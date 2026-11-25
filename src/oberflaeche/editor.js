// Bedienung: Werkzeuge, Ziehen mit Finger/Maus, Raum-Maske, Rückgängig, Speichern.
import { RAUMTYPEN } from '../inhalte/raumtypen.js';
import { neuerZustand, wandRechteck, abriss, tuerUmschalten, erkenneRaeume, pruefeRaum, raumTypVon, typZuweisen, idx } from '../kern/karte.js';
import { zeichne } from '../ansicht/zeichnen.js';
import { personenAnlegen, personenPruefen, versetzen, verfuegbarkeit, daten } from '../kern/personen.js';

const SPEICHER = 'churchsim-editor';
const VERSION = 2;
const HINWEISE = {
  wand: 'Zieh ein Rechteck, um Wände zu bauen.',
  tuer: 'Tippe auf eine Wand, um eine Tür zu setzen oder zu entfernen.',
  abriss: 'Zieh über den Bereich, der abgerissen werden soll.',
  raum: 'Tippe in einen Raum, um seine Funktion festzulegen.'
};

let z = laden() || neuerZustand();
personenAnlegen(z);
let raeume = auswerten();
let werkzeug = 'wand', ziehen = null, auswahl = null, editorOffen = false, tragen = null;
const verlauf = [];

const leinwand = document.getElementById('karte');
const ctx = leinwand.getContext('2d');
const flaeche = document.getElementById('flaeche');
const hinweis = document.getElementById('hinweis');
const maske = document.getElementById('maske');
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
  personenPruefen(z);
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

function malen() {
  ctx.clearRect(0, 0, leinwand.width, leinwand.height);
  zeichne(ctx, z, raeume, ansicht, { vorschau: ziehen, auswahl, raster: editorOffen, personen: figuren(), tragen });
  anzeigenAktualisieren();
}

function figuren() {
  return z.personen.map(p => ({ ...daten(p), x: p.x, y: p.y, getragen: tragen && tragen.person === p })).filter(f => f.art);
}
function anzeigenAktualisieren() {
  const v = verfuegbarkeit(z, raeume);
  document.getElementById('anzHauptamt').textContent = `${v.hauptamt.frei}/${v.hauptamt.gesamt}`;
  document.getElementById('anzEhrenamt').textContent = `${v.ehrenamt.frei}/${v.ehrenamt.gesamt}`;
}
function punktAus(e) {
  const r = leinwand.getBoundingClientRect();
  return { px: e.clientX - r.left, py: e.clientY - r.top };
}
// Figur unter dem Finger finden (etwas großzügiger als ein Kästchen, damit man sie gut trifft)
function figurBei(e) {
  const { px, py } = punktAus(e), k = ansicht.k, reichweite = Math.max(22, k * 1.1);
  let beste = null, abstand = reichweite;
  for (const p of z.personen) {
    const d = Math.hypot(ansicht.ox + (p.x + 0.5) * k - px, ansicht.oy + (p.y + 0.5) * k - py);
    if (d < abstand) { abstand = d; beste = p; }
  }
  return beste;
}

function feldAus(e) {
  const r = leinwand.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left - ansicht.ox) / ansicht.k);
  const y = Math.floor((e.clientY - r.top - ansicht.oy) / ansicht.k);
  return { x: Math.max(0, Math.min(z.w - 1, x)), y: Math.max(0, Math.min(z.h - 1, y)) };
}

leinwand.addEventListener('pointerdown', e => {
  if (!editorOffen) {
    const p = figurBei(e);
    if (p) { leinwand.setPointerCapture(e.pointerId); tragen = { person: p, ...punktAus(e) }; malen(); }
    return;
  }
  const f = feldAus(e);
  if (werkzeug === 'wand' || werkzeug === 'abriss') {
    leinwand.setPointerCapture(e.pointerId);
    ziehen = { x0: f.x, y0: f.y, x1: f.x, y1: f.y, art: werkzeug };
    malen();
  }
});
leinwand.addEventListener('pointermove', e => {
  if (tragen) { Object.assign(tragen, punktAus(e)); malen(); return; }
  if (!ziehen) return;
  const f = feldAus(e);
  if (f.x !== ziehen.x1 || f.y !== ziehen.y1) { ziehen.x1 = f.x; ziehen.y1 = f.y; malen(); }
});
leinwand.addEventListener('pointerup', e => {
  if (tragen) {
    const f = feldAus(e), p = tragen.person; tragen = null;
    if (p.x !== f.x || p.y !== f.y) aendern(() => versetzen(z, p, f.x, f.y)); else malen();
    return;
  }
  if (!editorOffen) return;
  const f = feldAus(e);
  if (ziehen) {
    const v = ziehen; ziehen = null;
    aendern(() => v.art === 'wand' ? wandRechteck(z, v.x0, v.y0, v.x1, v.y1) : abriss(z, v.x0, v.y0, v.x1, v.y1));
    return;
  }
  if (werkzeug === 'tuer') {
    const t = z.zellen[idx(z, f.x, f.y)];
    if (t) aendern(() => tuerUmschalten(z, f.x, f.y));
  } else if (werkzeug === 'raum') {
    const nr = raeume.gruppe[idx(z, f.x, f.y)];
    if (nr >= 0) { auswahl = nr; maskeOeffnen(); } else maskeSchliessen();
  }
});
leinwand.addEventListener('pointercancel', () => { ziehen = null; tragen = null; malen(); });

// Raum-Maske
function maskeOeffnen() {
  const r = raeume.liste[auswahl];
  const innen = maske.querySelector('.inhalt');
  const zeilen = RAUMTYPEN.map(t => {
    const p = pruefeRaum(z, r, t), aktiv = r.typ && r.typ.id === t.id;
    const status = p.includes('groesse') ? `zu klein, mind. ${t.minGroesse[0]} × ${t.minGroesse[1]}` : `mind. ${t.minGroesse[0]} × ${t.minGroesse[1]}`;
    return `<button class="typ${aktiv ? ' aktiv' : ''}" data-typ="${t.id}" ${p.includes('groesse') ? 'disabled' : ''}>
      <span class="farbe" style="background:${t.farbe}"></span><span><b>${t.name}</b><small>${status}</small></span></button>`;
  }).join('');
  innen.innerHTML = `<h2>Raumfunktion</h2>
    ${r.tueren === 0 ? '<p class="warnung">Dieser Raum hat noch keine Tür.</p>' : ''}
    <div class="typen">${zeilen}</div>
    <div class="zeile">${r.typ ? '<button data-typ="">Funktion entfernen</button>' : ''}<button data-zu>Schließen</button></div>`;
  maske.hidden = false; malen();
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

// Werkzeugleiste
document.querySelectorAll('[data-werkzeug]').forEach(b => b.addEventListener('click', () => {
  werkzeug = b.dataset.werkzeug;
  document.querySelectorAll('[data-werkzeug]').forEach(x => x.setAttribute('aria-pressed', x === b));
  hinweis.textContent = HINWEISE[werkzeug];
  maskeSchliessen();
}));
document.getElementById('zurueck').addEventListener('click', () => {
  if (!verlauf.length) return;
  z = JSON.parse(verlauf.pop()); raeume = auswerten(); speichern(); maskeSchliessen();
});
const neuKnopf = document.getElementById('neu');
let neuTimer = null;
neuKnopf.addEventListener('click', () => {
  if (neuKnopf.dataset.sicher) {
    clearTimeout(neuTimer); delete neuKnopf.dataset.sicher; neuKnopf.textContent = 'Neu';
    aendern(() => { z = neuerZustand(); }); maskeSchliessen();
  } else {
    neuKnopf.dataset.sicher = '1'; neuKnopf.textContent = 'Wirklich leeren?';
    neuTimer = setTimeout(() => { delete neuKnopf.dataset.sicher; neuKnopf.textContent = 'Neu'; }, 3000);
  }
});

// Editor öffnen und schließen: die normale Leiste (HUD) und die Bauwerkzeuge wechseln sich ab.
function editorUmschalten(offen) {
  editorOffen = offen; ziehen = null; tragen = null;
  document.body.classList.toggle('modus-editor', offen);
  document.body.classList.toggle('modus-spiel', !offen);
  maskeSchliessen();
}
document.getElementById('editorAuf').addEventListener('click', () => editorUmschalten(true));
document.getElementById('editorZu').addEventListener('click', () => editorUmschalten(false));

new ResizeObserver(groesseAnpassen).observe(flaeche);
hinweis.textContent = HINWEISE[werkzeug];
