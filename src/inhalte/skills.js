// Inhaltsdatei: welche Skills es gibt und zu wem sie gehören (26.11.2026).
// Gespeichert wird jeder Skill im Skill-Fach der Person (person.skills), die Regeln stehen in src/kern/skills.js.
//   fuer:  { id: 'pastor' } = nur diese Person, { art: 'hauptamt' | 'ehrenamt' } = alle Mitarbeiter dieser Art
//   start: Startwert im Skill-Fach
export const SKILLS = {
  seelsorge: { fuer: { art: 'hauptamt' }, start: 0 },                          // Erfahrungspunkte → Stufe 1–20 (Zahlen: seelsorge.js); 27.11.: alle Hauptamtlichen, jeder eigene Stufe
  musik: { fuer: { art: 'ehrenamt' }, start: 0 },                               // Erfahrung → Musik-Level (Zahlen: MUSIK in moebel.js)
  multiplikator: { fuer: { art: 'hauptamt' }, start: { stufe: 0, geleitet: 0 } }, // Haltungs-Multiplikator (Zahlen: forschung.js)
  evangelisation: { fuer: { art: 'ehrenamt' }, start: 0 }                       // Erfahrung → Evangelisation-Level (Zahlen: EVANGELISATION.skill in evangelisation.js)
};
