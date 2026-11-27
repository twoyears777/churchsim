// Spiellogik der Zeit. Die Spielzeit wird in Spielminuten seit Montag 0:00 der ersten Woche gezählt.
// Woche 0 endet mit dem 1. Advent (siehe kalender.js).
import { SEKUNDEN_PRO_STUNDE, SLOTS, SPIELBEGINN, STANDARD_PLAN, TEMPI } from '../inhalte/zeit.js';

export const TAG_MIN = 24 * 60, WOCHE_MIN = 7 * TAG_MIN;

export function startMinuten() { return SPIELBEGINN.tag * TAG_MIN + SPIELBEGINN.stunde * 60; }

export function zeitAnlegen(z) {
  if (typeof z.minuten !== 'number') z.minuten = startMinuten();
  if (!z.plan) z.plan = { ...STANDARD_PLAN };
  if (typeof z.letzterLauf !== 'number') z.letzterLauf = -1;   // Woche, in der zuletzt ein Gottesdienst-Termin war
  if (typeof z.tempo !== 'number' || !TEMPI.includes(z.tempo)) z.tempo = 1;   // z. B. alter Spielstand mit x5 (seit 27.11. kein Knopf mehr)
  if (typeof z.buchWoche !== 'number') z.buchWoche = zeitpunkt(z.minuten).woche;   // Woche des Wochenbuchs
}

export function zeitpunkt(m) {
  const woche = Math.floor(m / WOCHE_MIN), rest = m - woche * WOCHE_MIN, tag = Math.floor(rest / TAG_MIN), tm = rest - tag * TAG_MIN;
  return { woche, tag, stunde: Math.floor(tm / 60), minute: Math.floor(tm % 60), tagesMinute: tm };
}
export function uhrzeit(m) {
  const { stunde, minute } = zeitpunkt(m);
  return `${String(stunde).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
// Ganze Tage bis Sonntag 0:00; null = heute ist Sonntag.
export function tageBisSonntag(m) {
  const { tag, tagesMinute } = zeitpunkt(m);
  if (tag === 6) return null;
  return Math.floor(((6 - tag) * TAG_MIN - tagesMinute) / TAG_MIN);
}
export function slotBeginn(plan, woche) {
  const s = SLOTS.find(x => x.id === plan.slot) || SLOTS[0];
  return woche * WOCHE_MIN + plan.tag * TAG_MIN + s.stunde * 60;
}
// Echte Sekunden → Spielminuten beim gewählten Tempo
export function spielMinuten(sekunden, tempo) { return sekunden * tempo * 60 / SEKUNDEN_PRO_STUNDE; }
