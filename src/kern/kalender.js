// Rechnet zu jeder Runde (Woche) den Sonntag und seinen Namen im Kirchenjahr aus.
import { START, UM_OSTERN, NAMEN } from '../inhalte/kirchenjahr.js';

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
