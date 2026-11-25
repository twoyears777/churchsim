// Spiellogik der Mitarbeiter: wo sie stehen und ob sie eingesetzt sind. Kennt keine Grafik.
import { START_MITARBEITER } from '../inhalte/mitarbeiter.js';
import { GRUNDSTUECK } from '../inhalte/umgebung.js';
import { LEER, idx, aufGrundstueck } from './karte.js';
import { hindernisBei, moebelImRaum } from './moebel.js';

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

// Daten einer Person: Startmitarbeiter aus der Inhaltsdatei, im Spiel dazugekommene (z. B. Ehrenamtliche) tragen sie selbst.
export function daten(person) { return START_MITARBEITER.find(m => m.id === person.id) || person.daten; }

// Neue Person (z. B. Ehrenamtlicher aus einem Besucher) am Tor aufstellen, auf dem nächsten freien Platz.
export function personHinzufuegen(z, daten) {
  const s = startPlatz(), id = `ea${(z.naechsteId = (z.naechsteId || 0) + 1)}`;
  let platz = s;
  for (let r = 0; r < 12 && !platzFrei(z, platz.x, platz.y); r++) {
    const kandidaten = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) kandidaten.push({ x: s.x + dx, y: s.y + dy });
    platz = kandidaten.find(k => platzFrei(z, k.x, k.y)) || platz;
  }
  const p = { id, x: platz.x, y: platz.y, daten };
  z.personen.push(p);
  return p;
}

// Darf eine Figur auf dieses Kästchen? Nur freier Boden auf dem eigenen Grundstück, nicht besetzt.
export function platzFrei(z, x, y, ausser) {
  if (!aufGrundstueck(x, y) || z.zellen[idx(z, x, y)] !== LEER) return false;
  if (z.moebel && hindernisBei(z, x, y)) return false;   // auf Straße und Parkplatz darf man stehen
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

// Eingesetzt = steht in einem fertigen Raum mit Funktion, in dem diese Art Mitarbeiter arbeiten kann
// (z. B. Hauptamtliche im Gottesdienstraum, Ehrenamtliche im Kirchkaffee).
export function eingesetztIn(z, raeume, person) {
  const nr = raeume.gruppe[idx(z, person.x, person.y)];
  const r = nr >= 0 ? raeume.liste[nr] : null, d = daten(person);
  if (!r || !r.typ || r.probleme.length || !d) return null;
  if (r.typ.einsatz && !r.typ.einsatz.includes(d.art)) return null;
  const braucht = r.typ.einsatzBraucht && r.typ.einsatzBraucht[d.art];   // z. B. Ehrenamtliche im Gottesdienstraum: nur mit Gitarre
  return !braucht || moebelImRaum(z, r, braucht).length ? r : null;
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
