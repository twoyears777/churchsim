// Spiellogik der Mitarbeiter: wo sie stehen und ob sie eingesetzt sind. Kennt keine Grafik.
import { START_MITARBEITER } from '../inhalte/mitarbeiter.js';
import { GRUNDSTUECK } from '../inhalte/umgebung.js';
import { LEER, idx, aufGrundstueck } from './karte.js';

// Startplatz: innen am Tor
export function startPlatz() {
  const g = GRUNDSTUECK;
  return { x: g.tor.x + 1, y: g.y + g.h - 2 };
}

export function personenAnlegen(z) {
  if (!Array.isArray(z.personen)) z.personen = [];
  for (const m of START_MITARBEITER) {
    if (!z.personen.find(p => p.id === m.id)) { const s = startPlatz(); z.personen.push({ id: m.id, x: s.x, y: s.y }); }
  }
}

export function daten(person) { return START_MITARBEITER.find(m => m.id === person.id); }

// Darf eine Figur auf dieses Kästchen? Nur freier Boden auf dem eigenen Grundstück, nicht besetzt.
export function platzFrei(z, x, y, ausser) {
  if (!aufGrundstueck(x, y) || z.zellen[idx(z, x, y)] !== LEER) return false;
  return !z.personen.some(p => p !== ausser && p.x === x && p.y === y);
}

export function versetzen(z, person, x, y) {
  if (!platzFrei(z, x, y, person)) return false;
  person.x = x; person.y = y;
  return true;
}

// Nach dem Bauen: Figuren, die jetzt in einer Wand stehen, zurück zum Startplatz.
export function personenPruefen(z) {
  for (const p of z.personen) {
    if (!platzFrei(z, p.x, p.y, p)) {
      const s = startPlatz();
      p.x = s.x; p.y = s.y;
    }
  }
}

// Eingesetzt = steht in einem fertigen Raum mit Funktion (Tür da, groß genug).
export function eingesetztIn(z, raeume, person) {
  const nr = raeume.gruppe[idx(z, person.x, person.y)];
  const r = nr >= 0 ? raeume.liste[nr] : null;
  return r && r.typ && r.probleme.length === 0 ? r : null;
}

export function verfuegbarkeit(z, raeume) {
  const zahl = { hauptamt: { frei: 0, gesamt: 0 }, ehrenamt: { frei: 0, gesamt: 0 } };
  for (const p of z.personen) {
    const d = daten(p); if (!d) continue;
    zahl[d.art].gesamt++;
    if (!eingesetztIn(z, raeume, p)) zahl[d.art].frei++;
  }
  return zahl;
}
