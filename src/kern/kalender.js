// Rechnet zu jeder Runde (Woche) den Sonntag und seinen Namen im Kirchenjahr aus.
import { START, UM_OSTERN, NAMEN, ZEITEN, FESTE, FEIERTAGE, ZEIT_FAKTOREN } from '../inhalte/kirchenjahr.js';

const TAG = 86400000;
const datum = (j, m, t) => Date.UTC(j, m - 1, t);

// Ostersonntag (gregorianischer Kalender)
export function ostern(j) {
  const a = j % 19, b = Math.floor(j / 100), c = j % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31), tag = ((h + l - 7 * m + 114) % 31) + 1;
  return datum(j, monat, tag);
}
function ersterAdvent(j) {
  const heiligabend = datum(j, 12, 24), wt = new Date(heiligabend).getUTCDay();
  return heiligabend - wt * TAG - 21 * TAG;
}

export function sonntagName(t) {
  const d = new Date(t), j = d.getUTCFullYear(), m = d.getUTCMonth() + 1, tag = d.getUTCDate();
  const adv = ersterAdvent(j);
  if (t >= adv) {
    if (m < 12 || tag <= 24) return NAMEN.advent(Math.round((t - adv) / (7 * TAG)) + 1);
    if (m === 12 && tag === 25) return NAMEN.christfest1;
    if (m === 12 && tag === 26) return NAMEN.christfest2;
    return NAMEN.nachChristfest(1);
  }
  const vorAdvent = Math.round((adv - t) / (7 * TAG));
  if (vorAdvent === 1) return NAMEN.ewigkeit;
  if (vorAdvent === 2) return NAMEN.vorletzter;
  if (vorAdvent === 3) return NAMEN.drittletzter;
  if (m === 1 && tag === 1) return NAMEN.neujahr;
  if (m === 1 && tag <= 5) return NAMEN.nachChristfest(2);
  if (m === 1 && tag === 6) return NAMEN.epiphanias;
  const w = Math.round((t - ostern(j)) / (7 * TAG));
  if (UM_OSTERN[w]) return UM_OSTERN[w];
  if (w > 8) return NAMEN.nachTrinitatis(w - 8);
  if (w === -10) return NAMEN.letzterNachEpiphanias;
  return NAMEN.nachEpiphanias(Math.ceil((t - datum(j, 1, 6)) / (7 * TAG)));
}

export function sonntagDerWoche(woche) {
  const t = datum(START.jahr, START.monat, START.tag) + woche * 7 * TAG, d = new Date(t);
  return { name: sonntagName(t), datum: `${d.getUTCDate()}.${d.getUTCMonth() + 1}.` };
}

// Für das Kirchenjahr-Rad: Abschnitte des laufenden Kirchenjahres (Anteile 0–1) und wie weit es fortgeschritten ist.
export function kirchenjahrStand(woche) {
  const t = datum(START.jahr, START.monat, START.tag) + woche * 7 * TAG, j = new Date(t).getUTCFullYear();
  const beginn = t >= ersterAdvent(j) ? ersterAdvent(j) : ersterAdvent(j - 1);
  const ende = ersterAdvent(new Date(beginn).getUTCFullYear() + 1), jn = new Date(ende).getUTCFullYear(), o = ostern(jn);
  const starts = {
    advent: beginn, weihnachten: datum(jn - 1, 12, 25), epiphanias: datum(jn, 1, 6), vorpassion: o - 63 * TAG,
    passion: o - 46 * TAG, ostern: o, trinitatis: o + 56 * TAG
  };
  const laenge = ende - beginn, anteil = v => (v - beginn) / laenge;
  const zeiten = ZEITEN.map((z, i) => ({ ...z, von: anteil(starts[z.id]), bis: i + 1 < ZEITEN.length ? anteil(starts[ZEITEN[i + 1].id]) : 1 }));
  const fortschritt = anteil(t);
  return { fortschritt, zeiten, aktuell: zeiten.find(z => fortschritt >= z.von && fortschritt < z.bis) || zeiten[0] };
}

// ---- Feste und Feiertage ----
// Spieltag-Nummer: 0 = Montag der ersten Woche (die Woche, die mit dem 1. Advent endet), 1 = Dienstag …
export function tagDatum(tagNr) { return datum(START.jahr, START.monat, START.tag) + (tagNr - 6) * TAG; }
export function tagNrVon(t) { return Math.round((t - datum(START.jahr, START.monat, START.tag)) / TAG) + 6; }

// Datum einer Regel (siehe FESTE/FEIERTAGE in der Inhaltsdatei) im Kalenderjahr j
function regelDatum(w, j) {
  if (w.ostern !== undefined) return ostern(j) + w.ostern * TAG;
  if (w.vorAdvent !== undefined) return ersterAdvent(j) - w.vorAdvent * TAG;
  if (w.ersterSonntagIm !== undefined) { const t = datum(j, w.ersterSonntagIm, 1), wt = new Date(t).getUTCDay(); return t + ((7 - wt) % 7) * TAG; }
  return datum(j, w.monat, w.tag);
}
const festeCache = new Map();
function festeImJahr(j) {
  if (!festeCache.has(j)) festeCache.set(j, FESTE.map(f => ({ fest: f, t: regelDatum(f.wann, j) })));
  return festeCache.get(j);
}
// Fest an diesem Spieltag (Eintrag aus FESTE) oder null
export function festAmTag(tagNr) {
  const t = tagDatum(tagNr), j = new Date(t).getUTCFullYear();
  const e = festeImJahr(j).find(x => x.t === t);
  return e ? e.fest : null;
}
// Gesetzlicher Feiertag (bundesweit + Baden-Württemberg)?
export function feiertagAmTag(tagNr) {
  const t = tagDatum(tagNr), j = new Date(t).getUTCFullYear();
  return FEIERTAGE.some(w => regelDatum(w, j) === t);
}
// Zeit im Kirchenjahr an diesem Spieltag (id aus ZEITEN)
export function zeitAmTag(tagNr) {
  const t = tagDatum(tagNr), j = new Date(t).getUTCFullYear();
  const beginn = t >= ersterAdvent(j) ? ersterAdvent(j) : ersterAdvent(j - 1), jn = new Date(beginn).getUTCFullYear() + 1, o = ostern(jn);
  if (t >= o + 56 * TAG) return 'trinitatis';
  if (t >= o) return 'ostern';
  if (t >= o - 46 * TAG) return 'passion';
  if (t >= o - 63 * TAG) return 'vorpassion';
  if (t >= datum(jn, 1, 6)) return 'epiphanias';
  if (t >= datum(jn - 1, 12, 25)) return 'weihnachten';
  return 'advent';
}
// Faktoren für eine Veranstaltung an diesem Spieltag. Fest und Zeit gleichzeitig: jeweils der höhere Wert.
// → { besucher, kollekte, fest: id | null, zeit: id }
export function faktorAmTag(tagNr) {
  const f = festAmTag(tagNr), zeit = zeitAmTag(tagNr), zf = ZEIT_FAKTOREN[zeit] || { besucher: 1, kollekte: 1 };
  return { besucher: Math.max(f ? f.besucher : 1, zf.besucher), kollekte: Math.max(f ? f.kollekte : 1, zf.kollekte), fest: f ? f.id : null, zeit };
}
// Die nächsten n Feste ab diesem Spieltag (heute eingeschlossen): { id, name, tagNr, besucher, kollekte, gross, feiertag }
export function kommendeFeste(tagNr, n = 8) {
  const t0 = tagDatum(tagNr), j = new Date(t0).getUTCFullYear(), liste = [];
  for (const jj of [j, j + 1, j + 2]) for (const e of festeImJahr(jj)) if (e.t >= t0) liste.push(e);
  return liste.sort((a, b) => a.t - b.t).slice(0, n).map(e => {
    const nr = tagNrVon(e.t);
    return { id: e.fest.id, name: e.fest.name, tagNr: nr, besucher: e.fest.besucher, kollekte: e.fest.kollekte, gross: !!e.fest.gross, feiertag: feiertagAmTag(nr) };
  });
}
// Datum eines Spieltags zum Anzeigen: Wochentag (0 = Montag) und „24.12.“
export function tagAnzeige(tagNr) {
  const d = new Date(tagDatum(tagNr));
  return { wochentag: (d.getUTCDay() + 6) % 7, datum: `${d.getUTCDate()}.${d.getUTCMonth() + 1}.` };
}
