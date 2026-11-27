// Spiellogik der Schulungen für Ehrenamtliche (Spielprinzip von Lukas, 27.11.2026: claude/spielprinzip-schulungen.md).
// Zahlen in src/inhalte/schulungen.js. Kennt keine Texte.
// Gespeichert an der Person:
//   p.schulung   = { id, stufe (0 = Stufe 1), beginn, ende } solange er auf Schulung ist, sonst nicht vorhanden
//   p.schulungen = { musik: 1, … } wie viele Stufen jeder Schulung er schon abgeschlossen hat
//   p.schichtenDazu = Schichten pro Woche, die er durch Schulungen dazubekommen hat (zählt in schichtenMax, dienst.js)
import { SCHULUNGEN } from '../inhalte/schulungen.js';
import { daten } from './personen.js';
import { istErforscht } from './forschung.js';
import { kannBezahlen, buchen } from './finanzen.js';
import { schichtenBelegt, schichtbetrieb } from './dienst.js';
import { skillLevelDazu, skillAmMax } from './skills.js';
import { TAG_MIN } from './zeit.js';

const schulungVon = id => SCHULUNGEN.find(s => s.id === id) || null;
const istEA = p => { const d = p && daten(p); return !!d && d.art === 'ehrenamt'; };
export const aufSchulung = p => !!(p && p.schulung);
const gemacht = (p, id) => (p.schulungen && p.schulungen[id]) || 0;
// Bringt diese Schulung noch etwas? Nur ein Skill, der schon auf dem höchsten Level steht → nein (Schichten bringen immer etwas)
const bringtNichts = (p, s) => !s.wirkung.schichten && s.wirkung.skill && skillAmMax(p, s.wirkung.skill);

// Zustand einer Schulung für eine Person:
//   'person' (kein Ehrenamtlicher) | 'schichtbetrieb' (ohne Dienstplan) | 'weg' (ist schon auf Schulung) | 'alle' (alle Stufen gemacht)
//   | 'forschung' (Stufe noch nicht erforscht) | 'max' (Skill schon auf dem höchsten Level) | 'schichten' (hat noch Schichten im Plan)
//   | 'beides' | 'geld' | 'heiligkeit' | 'bereit'
export function schulungZustand(z, raeume, p, s) {
  if (!istEA(p)) return 'person';
  if (!schichtbetrieb(z)) return 'schichtbetrieb';
  if (aufSchulung(p)) return 'weg';
  const st = s.stufen[gemacht(p, s.id)];
  if (!st) return 'alle';
  if (!istErforscht(z, st.forschung)) return 'forschung';
  if (bringtNichts(p, s)) return 'max';
  if (schichtenBelegt(z, raeume, p) > 0) return 'schichten';
  const geldFehlt = !kannBezahlen(z, st.kosten.geld), heiligkeitFehlt = (z.heiligkeit || 0) < st.kosten.heiligkeit;
  if (geldFehlt && heiligkeitFehlt) return 'beides';
  if (geldFehlt) return 'geld';
  if (heiligkeitFehlt) return 'heiligkeit';
  return 'bereit';
}

// Losschicken → 'ok' | 'keine' (Schulung/Person gibt es nicht) | Zustand (s. o.), wenn es nicht geht
export function schulungStarten(z, raeume, personId, id) {
  const s = schulungVon(id), p = (z.personen || []).find(x => x.id === personId);
  if (!s || !p) return 'keine';
  const zustand = schulungZustand(z, raeume, p, s);
  if (zustand !== 'bereit') return zustand;
  const stufe = gemacht(p, s.id), st = s.stufen[stufe];
  if (st.kosten.geld > 0) buchen(z, 'ausgaben', 'schulung', st.kosten.geld, { schulung: s.id, stufe: stufe + 1 });
  z.heiligkeit = (z.heiligkeit || 0) - st.kosten.heiligkeit;
  p.schulung = { id: s.id, stufe, beginn: z.minuten, ende: z.minuten + st.tage * TAG_MIN };
  return 'ok';
}

// Abbrechen: er kommt zurück, Geld und Heiligkeit sind weg, die Stufe zählt nicht → 'ok' | 'keine'
export function schulungAbbrechen(z, personId) {
  const p = (z.personen || []).find(x => x.id === personId);
  if (!aufSchulung(p)) return 'keine';
  delete p.schulung;
  return 'ok';
}

// Schulung zu Ende: Wirkung gutschreiben
function abschliessen(p) {
  const L = p.schulung, s = schulungVon(L.id);
  delete p.schulung;
  if (!s) return;
  if (!p.schulungen) p.schulungen = {};
  p.schulungen[s.id] = Math.max(gemacht(p, s.id), L.stufe + 1);
  if (s.wirkung.skill) skillLevelDazu(p, s.wirkung.skill, s.wirkung.level || 0);
  if (s.wirkung.schichten) p.schichtenDazu = (p.schichtenDazu || 0) + s.wirkung.schichten;
}

// Nächster Schritt für das Tick-System (ablauf.js): Ende der frühesten Schulung
export function schulungSchritt(z) {
  const weg = (z.personen || []).filter(aufSchulung);
  if (!weg.length) return null;
  const ende = Math.min(...weg.map(p => p.schulung.ende));
  return { zeit: ende, tun: zz => { for (const p of zz.personen) if (aufSchulung(p) && p.schulung.ende <= zz.minuten + 1e-6) abschliessen(p); } };
}

// Für das Menü „Mitarbeiter“: freigeschaltet?, laufende Schulung und alle Schulungen mit nächster Stufe, Kosten, Dauer, Zustand
export function schulungenInfo(z, raeume, personId) {
  const p = (z.personen || []).find(x => x.id === personId);
  if (!istEA(p)) return null;
  const L = p.schulung, lauf = L && schulungVon(L.id);
  return {
    freigeschaltet: SCHULUNGEN.some(s => s.stufen.some(st => istErforscht(z, st.forschung))),
    laeuft: lauf ? { id: lauf.id, name: lauf.name, stufe: L.stufe + 1, ende: L.ende,
      anteil: Math.min(1, Math.max(0, (z.minuten - L.beginn) / (L.ende - L.beginn))) } : null,
    liste: SCHULUNGEN.map(s => {
      const n = gemacht(p, s.id), st = s.stufen[n] || null;
      return { id: s.id, name: s.name, wirkung: { ...s.wirkung }, stufe: st ? n + 1 : null, maxStufe: s.stufen.length, gemacht: n,
        kosten: st ? { ...st.kosten } : null, tage: st ? st.tage : null, zustand: schulungZustand(z, raeume, p, s) };
    })
  };
}
