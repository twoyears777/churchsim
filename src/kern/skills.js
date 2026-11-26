// Spiellogik aller Skills der Mitarbeiter an einem Ort (26.11.2026, technisches Aufräumen – im Spiel ändert sich nichts).
// Jede Person trägt ihr Skill-Fach: person.skills = { seelsorge: Punkte, musik: Erfahrung, multiplikator: { stufe, geleitet } }
// – aber nur die Skills, die zu ihr gehören (welche das sind, steht in src/inhalte/skills.js).
// Zahlen: Seelsorge in src/inhalte/seelsorge.js, Musik (MUSIK) in src/inhalte/moebel.js, Multiplikator in src/inhalte/forschung.js.
// Kennt keine Texte.
import { SKILLS } from '../inhalte/skills.js';
import { START_MITARBEITER } from '../inhalte/mitarbeiter.js';
import { SEELSORGE } from '../inhalte/seelsorge.js';
import { MUSIK } from '../inhalte/moebel.js';
import { HALTUNG_MULTIPLIKATOR } from '../inhalte/forschung.js';

// Daten einer Person (wie daten() in personen.js – hier ohne Import, damit keine Kreis-Abhängigkeit entsteht)
const datenVon = p => (p && (START_MITARBEITER.find(m => m.id === p.id) || p.daten)) || null;
const startwert = s => (s.start && typeof s.start === 'object' ? { ...s.start } : s.start);

// Gehört dieser Skill zu dieser Person? (fuer: { id } = nur diese Person, { art } = alle dieser Art)
export function hatSkill(p, id) {
  const s = SKILLS[id], d = datenVon(p);
  if (!s || !d) return false;
  return s.fuer.id ? p.id === s.fuer.id : d.art === s.fuer.art;
}
// Das Skill-Fach der Person – fehlende eigene Skills werden mit dem Startwert angelegt
export function skillsVon(p) {
  if (!p) return {};
  if (!p.skills || typeof p.skills !== 'object') p.skills = {};
  for (const id of Object.keys(SKILLS)) if (hatSkill(p, id) && p.skills[id] === undefined) p.skills[id] = startwert(SKILLS[id]);
  return p.skills;
}

// Beim Laden: Skill-Fächer anlegen und alte Spielstände umziehen
//   bis 0.1.12: Seelsorge-Punkte bei der Gemeinde (z.seelsorge.punkte) → Pastor Harder
//   bis 0.1.12: person.musikErfahrung → skills.musik; person.multiplikator/geleitet → skills.multiplikator
//   0.1.11:     Multiplikator der ganzen Gemeinde (z.multiplikator) → Pastor Harder
export function skillsAnlegen(z) {
  if (!Array.isArray(z.personen)) return;
  const pastor = z.personen.find(p => p.id === 'pastor');
  for (const p of z.personen) {
    const s = skillsVon(p);
    if (typeof p.musikErfahrung === 'number') { if (hatSkill(p, 'musik')) s.musik = p.musikErfahrung; delete p.musikErfahrung; }
    if (typeof p.multiplikator === 'number' || typeof p.geleitet === 'number') {
      if (hatSkill(p, 'multiplikator')) s.multiplikator = { stufe: p.multiplikator || 0, geleitet: p.geleitet || 0 };
      delete p.multiplikator; delete p.geleitet;
    }
  }
  if (pastor) {
    const s = skillsVon(pastor);
    if (z.seelsorge && typeof z.seelsorge.punkte === 'number') { s.seelsorge = z.seelsorge.punkte; delete z.seelsorge.punkte; }
    if (typeof z.multiplikator === 'number') {
      if (s.multiplikator) s.multiplikator.stufe = Math.max(s.multiplikator.stufe, z.multiplikator);
      delete z.multiplikator;
    }
  }
}

// ── Seelsorge (Pastor Harder): Erfahrungspunkte → Stufe 1–20 ──
const pastorVon = z => (z.personen || []).find(p => p.id === 'pastor') || null;
export function seelsorgePunkte(z) { const p = pastorVon(z); return p ? skillsVon(p).seelsorge || 0 : 0; }
export function seelsorgePunkteDazu(z, n) { const p = pastorVon(z); if (p) skillsVon(p).seelsorge = seelsorgePunkte(z) + n; }
// Stufe aus den Erfahrungspunkten
export function stufe(punkte) {
  let s = 1;
  SEELSORGE.stufeAb.forEach((ab, i) => { if (punkte >= ab) s = i + 1; });
  return s;
}
export const seelsorgeStufe = z => stufe(seelsorgePunkte(z));
// Bonus auf die Erfolgschance in Prozentpunkten (z. B. Stufe 3 → 3)
export const bonusProzent = st => Math.round(SEELSORGE.bonusProStufe * (st - 1) * 1000) / 10;
// Für die Charakter-Karte: Stufe, Punkte, Bonus auf die Erfolgschance (in %), letzte und nächste Freischaltung
export function stufeInfo(z) {
  const p = seelsorgePunkte(z), s = stufe(p), F = SEELSORGE.freischaltungen;
  return { stufe: s, maxStufe: SEELSORGE.stufeAb.length, punkte: p, von: SEELSORGE.stufeAb[s - 1],
    bis: s < SEELSORGE.stufeAb.length ? SEELSORGE.stufeAb[s] : null, bonus: bonusProzent(s),
    freigeschaltet: [...F].reverse().find(n => n <= s) || null, naechsteFreischaltung: F.find(n => n > s) || null };
}

// ── Musik-Level (Ehrenamtliche): Level 0 … MUSIK.maxLevel ──
const musikErfahrung = p => (hatSkill(p, 'musik') && skillsVon(p).musik) || 0;
export function musikLevel(person) {
  return Math.min(MUSIK.maxLevel, Math.floor(musikErfahrung(person) / MUSIK.erfahrungProLevel));
}
// Bonus des Lobpreisteams bei diesem Level (0.05 = 5 %), auf ganze Prozent gerundet
export function musikBonus(level) { return Math.round((MUSIK.start + MUSIK.proLevel * level) * 100) / 100; }
// Nach einem Auftritt: etwas Erfahrung dazu (beim höchsten Level bleibt es stehen)
export function musikErfahrungDazu(person) {
  if (!hatSkill(person, 'musik')) return;
  const max = MUSIK.maxLevel * MUSIK.erfahrungProLevel;
  skillsVon(person).musik = Math.min(max, musikErfahrung(person) + MUSIK.erfahrungProAuftritt);
}
// Stand fürs Anzeigen (Karte des Ehrenamtlichen): Level und Fortschritt bis zum nächsten Level (0 … 1)
export function musikStand(person) {
  const level = musikLevel(person), e = musikErfahrung(person);
  const fortschritt = level >= MUSIK.maxLevel ? 1 : (e - level * MUSIK.erfahrungProLevel) / MUSIK.erfahrungProLevel;
  return { level, maxLevel: MUSIK.maxLevel, fortschritt };
}

// ── Haltungs-Multiplikator (Hauptamtliche): Erfahrung = geleitete Gottesdienste, Stufen mit Heiligkeit gekauft ──
const MS = HALTUNG_MULTIPLIKATOR.stufen;
const mult = p => (hatSkill(p, 'multiplikator') ? skillsVon(p).multiplikator : null);
// Faktor dieser Leitung bei dieser Veranstaltung (1, wenn keine Leitung, kein Hauptamtlicher oder nicht Gottesdienst/Lobpreis)
export function multiplikatorFaktor(leitung, art) {
  const m = mult(leitung), st = m ? m.stufe : 0;
  return st > 0 && HALTUNG_MULTIPLIKATOR.veranstaltungen.includes(art) ? MS[st - 1].faktor : 1;
}
// Haltung nach dem Multiplikator: nur Pluswerte werden vervielfacht, gerundet auf ganze Punkte
export function mitMultiplikator(leitung, art, haltung) {
  return haltung > 0 ? Math.round(haltung * multiplikatorFaktor(leitung, art)) : haltung;
}
// Ein Gottesdienst/Lobpreisgottesdienst ist zu Ende: die Leitung bekommt +1 Erfahrung
export function multiplikatorErfahrung(leitung, art) {
  const m = mult(leitung);
  if (m && HALTUNG_MULTIPLIKATOR.veranstaltungen.includes(art)) m.geleitet++;
}
// Nächste Stufe kaufen → 'ok' | 'person' (kein Hauptamtlicher) | 'max' | 'erfahrung' (zu wenig geleitet) | 'heiligkeit'
export function multiplikatorKaufen(z, personId) {
  const m = mult((z.personen || []).find(x => x.id === personId));
  if (!m) return 'person';
  const n = MS[m.stufe];
  if (!n) return 'max';
  if (m.geleitet < n.gottesdienste) return 'erfahrung';
  if ((z.heiligkeit || 0) < n.preis) return 'heiligkeit';
  z.heiligkeit -= n.preis;
  m.stufe++;
  return 'ok';
}
// Für die Charakter-Karte: Stufe/Faktor, geleitete Gottesdienste, nächste Stufe (null, wenn alles gekauft)
export function multiplikatorInfo(z, p) {
  const m = mult(p);
  if (!m) return null;
  const st = m.stufe, n = MS[st], geleitet = m.geleitet, heiligkeit = z.heiligkeit || 0;
  return { stufe: st, maxStufe: MS.length, faktor: st ? MS[st - 1].faktor : 1, geleitet,
    naechste: n ? { stufe: st + 1, faktor: n.faktor, preis: n.preis, ab: n.gottesdienste, fehlen: Math.max(0, n.gottesdienste - geleitet),
      freigeschaltet: geleitet >= n.gottesdienste, leistbar: geleitet >= n.gottesdienste && heiligkeit >= n.preis } : null };
}
