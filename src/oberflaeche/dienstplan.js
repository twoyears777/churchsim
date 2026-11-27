// Menü „Mitarbeiter“: Dienstplan der Ehrenamtlichen als Wochenkalender (Lukas, 27.11.2026 – Aufbau freigegeben).
// Oben die Ehrenamtlichen mit ihren Schichten (Punkte), darunter die Wochentage. Ein Klick auf einen Tag öffnet ihn:
// drei Zeitblöcke mit allen Terminen und ihren Stellen. Einteilen per Ziehen (gedrückte Maustaste) oder per Klick
// (erst Ehrenamtlichen, dann Stelle). Klick auf eine besetzte Stelle nimmt ihn wieder heraus.
// Die Regeln (Schichten, Überschneidungen) prüft das Spiel – hier wird nur angezeigt und der Befehl geschickt.
// Zwei Tabs (Lukas, 27.11.): „Ehrenamt“ und „Hauptamt“ – gleicher Aufbau, oben die Leute dieser Art, unten nur die Stellen,
// die sie übernehmen dürfen (s.wer aus dienst.js). f.tab merkt sich den offenen Tab.
import { TEXTE } from '../inhalte/texte.js';
import { ui, esc } from './ui.js';

const ZAEHLT = ['veranstaltung', 'kaffeeNach', 'kaffee'];   // Wochenleiste „x frei“: nur Stellen, die ein Termin braucht
const raumText = r => r ? (r.nummer ? `${r.name} ${r.nummer}` : r.name) : '';
const terminName = t => t.art === 'veranstaltung' ? t.veranstaltungName || '' : TEXTE.dienstplan.termin[t.art];
const terminOrt = t => t.art === 'kaffeeNach' ? `${raumText(t.raum)} · ${raumText(t.nachRaum)}` : raumText(t.raum);
function stelleName(s, stellen) {
  const f = TEXTE.dienstplan.stelle[s.code];
  const n = stellen.filter(x => x.code === s.code).indexOf(s) + 1;
  return f ? f(s.dingName || '', n, s.code === 'begruessung' ? raumText(s.raum) : null) : s.code;
}

// Skills der ausgewählten Person (Lukas, 27.11.): im Kasten „Dienste von …“, damit man beim Einteilen sieht, wer was kann.
// Daten aus derselben Abfrage wie die Charakter-Karte (personInfo), Texte ebenfalls von dort – keine neuen Texte.
const balken = anteil => `<span class="balken mini"><span style="width:${Math.round(Math.max(0, Math.min(1, anteil)) * 100)}%"></span></span>`;
function skillsZeile(id) {
  const p = ui.spiel.personInfo(id);
  if (!p) return '';
  const chips = [];
  if (p.musik) chips.push([TEXTE.ausstattung.musikLevel(p.musik.level), p.musik.fortschritt]);
  if (p.evangelisation) chips.push([TEXTE.evangelisation.karte(p.evangelisation.level), p.evangelisation.fortschritt]);
  if (p.seelsorge) { const s = p.seelsorge;
    chips.push([TEXTE.seelsorge.karte.titel(s.stufe, s.maxStufe), s.bis === null ? 1 : (s.punkte - s.von) / (s.bis - s.von)]); }
  if (p.multiplikator) { const m = p.multiplikator, n = m.naechste;
    chips.push([TEXTE.multiplikatorKarte.titel(m.stufe, m.maxStufe, m.faktor), !n ? 1 : n.ab ? m.geleitet / n.ab : 0]); }
  return `<div class="dp-skills"><b>${TEXTE.personKarte.skills}</b>${chips.length
    ? chips.map(([text, anteil]) => `<span class="dp-skill"><span>${esc(text)}</span>${balken(anteil)}</span>`).join('')
    : `<span class="unter">${TEXTE.personKarte.skillsSpaeter}</span>`}</div>`;
}

export function dienstplanFenster(f) {
  const T = TEXTE.dienstplan, alles = ui.spiel.dienstplan(), l = ui.spiel.lage();
  if (f.tag === undefined) f.tag = l.tag;
  if (f.tab !== 'hauptamt') f.tab = 'ehrenamt';
  const ha = f.tab === 'hauptamt', passt = s => s.wer === 'alle' || s.wer === f.tab;
  const d = { personen: alles.personen.filter(p => p.art === f.tab),
    termine: alles.termine.map(t => ({ ...t, stellen: t.stellen.filter(passt) })).filter(t => t.stellen.length) };
  if (f.auswahl && !d.personen.some(p => p.id === f.auswahl)) delete f.auswahl;
  if (!f.auswahl && d.personen.length) f.auswahl = d.personen[0].id;
  const punkte = p => Array.from({ length: p.max }, (_, i) => `<span class="dp-punkt${i < p.belegt ? ' an' : ''}"></span>`).join('');
  const leute = d.personen.length
    ? d.personen.map(p => `<button class="dp-ea${p.id === f.auswahl ? ' gewaehlt' : ''}${p.jugend ? ' jugend' : ''}" draggable="true" data-dp-ea="${esc(p.id)}">
        <span class="dp-griff" aria-hidden="true">⋮⋮</span><b>${esc(p.name)}</b><span class="dp-punkte">${punkte(p)}</span><small>${T.schichten(p.belegt, p.max)}</small></button>`).join('')
    : `<p class="unter">${ha ? T.keineHA : T.keineEA}</p>`;
  const tage = TEXTE.tageKurz.map((name, tag) => {
    const st = d.termine.filter(t => t.tag === tag && ZAEHLT.includes(t.art)).flatMap(t => t.stellen);
    const frei = st.filter(s => !s.person).length;
    const unter = !st.length ? '–' : frei ? T.frei(frei) : T.voll;
    const zustand = !st.length ? '' : frei ? 'frei' : 'voll';   // rot = unbesetzte Stellen, grün = alles besetzt
    return `<button class="dp-tag${tag === f.tag ? ' offen' : ''}${tag === l.tag ? ' heute' : ''}${zustand ? ' ' + zustand : ''}" data-dp-tag="${tag}"><b>${name}</b><small class="${zustand}">${unter}</small></button>`;
  }).join('');
  // Alle Dienste der ausgewählten Person auf einen Blick, nach Tag und Zeitblock sortiert; Klick öffnet den Tag
  const slots = Object.keys(TEXTE.kaffeeFenster.slot), gewaehlt = d.personen.find(p => p.id === f.auswahl);
  const dienste = gewaehlt ? d.termine.flatMap(t => t.stellen.filter(s => s.person && s.person.id === gewaehlt.id).map(s => ({ t, s })))
    .sort((a, b) => a.t.tag - b.t.tag || slots.indexOf(a.t.slot) - slots.indexOf(b.t.slot)) : [];
  const meine = !gewaehlt ? '' : `<div class="dp-meine"><b>${esc(T.meineDienste(gewaehlt.name))}</b>${dienste.length
    ? dienste.map(({ t, s }) => `<button class="dp-dienst${t.tag === f.tag ? ' offen' : ''}" data-dp-tag="${t.tag}">
        <small>${TEXTE.tageKurz[t.tag]} · ${TEXTE.kaffeeFenster.slot[t.slot]}</small><b>${esc(terminName(t))}</b><span>${esc(stelleName(s, t.stellen))}</span></button>`).join('')
    : `<span class="unter">${esc(T.keineDienste(gewaehlt.name))}</span>`}${skillsZeile(gewaehlt.id)}</div>`;
  const bloecke = Object.keys(TEXTE.kaffeeFenster.slot).map(slot => {
    const hier = d.termine.filter(t => t.tag === f.tag && t.slot === slot);
    const termine = hier.length ? hier.map(t => `<div class="dp-termin ${t.art}"><b>${esc(terminName(t))}</b>
        ${terminOrt(t) ? `<small>${esc(terminOrt(t))}</small>` : ''}
        ${t.stellen.map(s => s.person
          ? `<button class="dp-stelle besetzt" data-dp-weg="${esc(t.key)}|${esc(s.id)}" title="${esc(s.person.name)}"><b>${esc(s.person.name)}</b><span>${esc(stelleName(s, t.stellen))}</span><span aria-hidden="true">✕</span></button>`
          : `<button class="dp-stelle frei" data-dp-stelle="${esc(t.key)}|${esc(s.id)}"><span aria-hidden="true">+</span> ${esc(stelleName(s, t.stellen))}</button>`).join('')}
      </div>`).join('') : `<p class="unter">${T.keinTermin}</p>`;
    return `<div class="dp-block"><div class="dp-block-kopf">${TEXTE.tage[f.tag]} · ${TEXTE.kaffeeFenster.slot[slot]}</div>${termine}</div>`;
  }).join('');
  const tabs = ['ehrenamt', 'hauptamt'].map(t => `<button class="tab${t === f.tab ? ' an' : ''}" data-dp-tab="${t}">${T.tab[t]}</button>`).join('');
  return `<h2>${T.titel}</h2>
    <div class="tabs dp-tabs">${tabs}</div>
    <p class="unter">${ha ? T.schritt1HA : T.schritt1}</p>
    <div class="dp-leute">${leute}</div>
    ${meine}
    <div class="dp-tage">${tage}</div>
    <p class="unter">${T.schritt2}</p>
    <div class="dp-bloecke">${bloecke}</div>
    <p class="warnung dp-fehler">${f.fehler ? esc(f.fehler) : ''}</p>
    <p class="unter">${ha ? T.infoHA : T.info}</p>`;
}

// Befehl schicken und die Antwort als Hinweis zeigen
function setzen(f, wert, personId) {
  const T = TEXTE.dienstplan, [key, stelle] = wert.split('|');
  if (!personId) { f.fehler = T.fehler.auswahl(f.tab); return; }
  const e = ui.spiel.stelleSetzen(key, stelle, personId);
  const p = ui.spiel.dienstplan().personen.find(x => x.id === personId);
  f.fehler = e === 'ok' ? '' : (T.fehler[e] || T.fehler.keine)(p ? p.name : '', p ? p.art : f.tab);
}
// Klicks im Fenster (aus fensterEinrichten) → true, wenn es ein Knopf des Dienstplans war
export function dienstplanKlick(b, f) {
  if (f.art !== 'dienstplan') return false;
  if (b.dataset.dpTab) { if (f.tab !== b.dataset.dpTab) { f.tab = b.dataset.dpTab; delete f.auswahl; } f.fehler = ''; return true; }
  if (b.dataset.dpEa) { f.auswahl = b.dataset.dpEa; f.fehler = ''; return true; }
  if (b.dataset.dpTag !== undefined) { f.tag = Number(b.dataset.dpTag); f.fehler = ''; return true; }
  if (b.dataset.dpStelle) { setzen(f, b.dataset.dpStelle, f.auswahl); return true; }
  if (b.dataset.dpWeg) { const [key, stelle] = b.dataset.dpWeg.split('|'); ui.spiel.stelleSetzen(key, stelle, null); f.fehler = ''; return true; }
  return false;
}
// Ziehen mit gedrückter Maustaste: Ehrenamtlichen auf eine freie (oder besetzte) Stelle fallen lassen
export function dienstplanEinrichten(maske) {
  let gezogen = null;
  maske.addEventListener('dragstart', e => {
    const ea = e.target.closest && e.target.closest('[data-dp-ea]');
    if (!ea) return;
    gezogen = ea.dataset.dpEa;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', gezogen);
  });
  const ziel = e => e.target.closest && e.target.closest('[data-dp-stelle], [data-dp-weg]');
  maske.addEventListener('dragover', e => {
    const s = ziel(e);
    if (!s || !gezogen) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    maske.querySelectorAll('.dp-stelle.ueber').forEach(x => { if (x !== s) x.classList.remove('ueber'); });
    s.classList.add('ueber');
  });
  maske.addEventListener('dragleave', e => { const s = ziel(e); if (s && !s.contains(e.relatedTarget)) s.classList.remove('ueber'); });
  maske.addEventListener('dragend', () => { gezogen = null; maske.querySelectorAll('.dp-stelle.ueber').forEach(x => x.classList.remove('ueber')); });
  maske.addEventListener('drop', e => {
    const s = ziel(e), f = ui.fenster;
    if (!s || !f || f.art !== 'dienstplan') return;
    e.preventDefault();
    const id = gezogen || e.dataTransfer.getData('text/plain');
    gezogen = null;
    f.auswahl = id;
    setzen(f, s.dataset.dpStelle || s.dataset.dpWeg, id);
    ui.speichern(); ui.anzeigeErzwingen(); ui.malen();
  });
}
