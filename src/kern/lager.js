// Lager: Logistik-Zeiten je Lager-Raum (Lukas, 27.11.2026). Wie die Öffnungszeiten des Kirchkaffees:
// Klick aufs Lager → Zeitblöcke festlegen. Nur zu diesen Zeiten gibt es im Dienstplan Logistik-Stellen (eine je Regal in diesem Lager).
// Gespeichert in z.lagerZeiten: für jedes Kästchen des Raums dieselbe Liste [{ tag, slot }] (übersteht Umbauten wie z.kaffeeZeiten).
import { SLOTS } from '../inhalte/zeit.js';
import { moebelImRaum } from './moebel.js';

const slotNr = id => SLOTS.findIndex(s => s.id === id);
const gueltig = s => s && s.tag >= 0 && s.tag <= 6 && slotNr(s.slot) >= 0;

export function lagerZeitenVon(z, raum) {
  const l = z.lagerZeiten && z.lagerZeiten[raum.zellen[0]];
  return Array.isArray(l) ? l.filter(gueltig).map(s => ({ tag: s.tag, slot: s.slot })) : [];
}
function schreiben(z, raum, liste) {
  if (!z.lagerZeiten) z.lagerZeiten = {};
  liste.sort((a, b) => a.tag - b.tag || slotNr(a.slot) - slotNr(b.slot));
  for (const c of raum.zellen) { if (liste.length) z.lagerZeiten[c] = liste.map(s => ({ ...s })); else delete z.lagerZeiten[c]; }
}
// → 'ok' | 'belegt' (diese Zeit gibt es schon) | 'zeit' (ungültiger Tag/Zeitblock)
export function lagerZeitHinzufuegen(z, raum, tag, slot) {
  if (!gueltig({ tag, slot })) return 'zeit';
  const liste = lagerZeitenVon(z, raum);
  if (liste.some(s => s.tag === tag && s.slot === slot)) return 'belegt';
  liste.push({ tag, slot });
  schreiben(z, raum, liste);
  return 'ok';
}
// → 'ok' | 'keine'. Wie beim Kirchkaffee bleibt die Einteilung im Dienstplan gemerkt: Ohne die Zeit gibt es den Termin nicht,
// kommt die Zeit wieder dazu, sind die Leute wieder eingeteilt.
export function lagerZeitEntfernen(z, raum, nr) {
  const liste = lagerZeitenVon(z, raum);
  if (!liste[nr]) return 'keine';
  liste.splice(nr, 1);
  schreiben(z, raum, liste);
  return 'ok';
}

// Alte Spielstände (Lukas, 27.11.: „übernehmen“): Früher gab es Logistik in jedem Zeitblock für alle Lager zusammen
// (Schlüssel lg:<Tag>:<Slot>, Stellen regal0, regal1, … über alle Regale aller Lager). Jeder Zeitblock, in dem schon jemand
// eingeteilt ist, wird zur Logistik-Zeit des Lagers, in dem sein Regal steht – die Einteilung bleibt erhalten.
export function lagerUmstellen(z, raeume) {
  const plan = z.dienst && z.dienst.plan;
  if (!plan) return;
  const alt = Object.keys(plan).filter(k => /^lg:\d:[a-z]+$/.test(k));
  if (!alt.length) return;
  const lager = raeume.liste.filter(r => r.typ && r.typ.id === 'lager' && !r.probleme.length);
  const regale = lager.flatMap(r => moebelImRaum(z, r, 'regal').map((m, j) => ({ r, j })));
  for (const k of alt) {
    const [, tag, slot] = k.split(':');
    for (const [stelle, personId] of Object.entries(plan[k] || {})) {
      const i = Number(stelle.replace('regal', '')), ziel = regale[i];
      if (!ziel || !personId) continue;
      lagerZeitHinzufuegen(z, ziel.r, Number(tag), slot);
      const neu = `lg:${Math.min(...ziel.r.zellen)}:${tag}:${slot}`;
      (plan[neu] = plan[neu] || {})[`regal${ziel.j}`] = personId;
    }
    delete plan[k];
  }
}
