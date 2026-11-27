// Spiellogik des Forschungsbaums und der Heiligkeit (Spielprinzip von Lukas, 25.11.2026). Zahlen in src/inhalte/forschung.js.
// • Heiligkeit: am Ende eines Gottesdienstes 1 pro Besucher, keine Obergrenze, wird beim Forschen verbraucht.
// • Forschung: kostet Geld + Heiligkeit, läuft eine Zeit lang, immer nur eine gleichzeitig, Abbrechen = Bezahltes ist weg.
// Die Dauer wird beim Start in Spielminuten umgerechnet (1 echte Minute bei x1 = 300 Spielminuten). Weil sie an der
// Spielzeit hängt, hält sie bei Pause/geschlossenem Spiel an und läuft bei schnellerem Tempo entsprechend schneller.
// Gespeichert wird: z.heiligkeit, z.forschung = { laeuft: { id, beginn, ende } | null, fertig: [ids] }
import { FORSCHUNGEN, HEILIGKEIT } from '../inhalte/forschung.js';
import { spielMinuten } from './zeit.js';
import { kannBezahlen, buchen } from './finanzen.js';

export function forschungAnlegen(z) {
  if (typeof z.heiligkeit !== 'number') z.heiligkeit = 0;
  if (!z.forschung) z.forschung = { laeuft: null, fertig: [] };
  if (!Array.isArray(z.forschung.fertig)) z.forschung.fertig = [];
  if (z.forschung.laeuft === undefined) z.forschung.laeuft = null;
}

// Gottesdienst zu Ende: Heiligkeit für die anwesenden Besucher
export function heiligkeitFuerGottesdienst(z, art, besucher) {
  if (!HEILIGKEIT.veranstaltungen.includes(art) || besucher <= 0) return 0;
  forschungAnlegen(z);
  const dazu = besucher * HEILIGKEIT.proBesucher;
  z.heiligkeit += dazu;
  return dazu;
}

const forschungVon = id => FORSCHUNGEN.find(f => f.id === id) || null;
export const dauerMinuten = f => spielMinuten(f.dauer, 1);
export const istErforscht = (z, id) => !!(z.forschung && z.forschung.fertig.includes(id));

// Zustand einer Forschung: 'erforscht' | 'laeuft' | 'gesperrt' (Voraussetzung fehlt) | 'besetzt' (eine andere läuft)
//   | 'beides' (zu wenig Geld UND zu wenig Heiligkeit) | 'geld' | 'heiligkeit' | 'bereit'
export function forschungZustand(z, f) {
  forschungAnlegen(z);
  const F = z.forschung;
  if (F.fertig.includes(f.id)) return 'erforscht';
  if (F.laeuft && F.laeuft.id === f.id) return 'laeuft';
  if (f.braucht.some(id => !F.fertig.includes(id))) return 'gesperrt';
  if (F.laeuft) return 'besetzt';
  const geldFehlt = !kannBezahlen(z, f.kosten.geld), heiligkeitFehlt = z.heiligkeit < f.kosten.heiligkeit;
  if (geldFehlt && heiligkeitFehlt) return 'beides';
  if (geldFehlt) return 'geld';
  if (heiligkeitFehlt) return 'heiligkeit';
  return 'bereit';
}

// Forschung starten → 'ok' | 'keine' | Zustand (s. o.), wenn es nicht geht
export function forschungStarten(z, id) {
  const f = forschungVon(id);
  if (!f) return 'keine';
  const s = forschungZustand(z, f);
  if (s !== 'bereit') return s;
  buchen(z, 'ausgaben', 'forschung', f.kosten.geld, { forschung: f.id });
  z.heiligkeit -= f.kosten.heiligkeit;
  z.forschung.laeuft = { id: f.id, beginn: z.minuten, ende: z.minuten + dauerMinuten(f) };
  return 'ok';
}

// Laufende Forschung abbrechen: Geld und Heiligkeit sind weg → 'ok' | 'keine'
export function forschungAbbrechen(z) {
  forschungAnlegen(z);
  if (!z.forschung.laeuft) return 'keine';
  z.forschung.laeuft = null;
  return 'ok';
}

// Nächster Schritt für das Tick-System (ablauf.js): Ende der laufenden Forschung
export function forschungSchritt(z) {
  forschungAnlegen(z);
  const L = z.forschung.laeuft;
  if (!L) return null;
  return { zeit: L.ende, tun: zz => { zz.forschung.fertig.push(L.id); zz.forschung.laeuft = null; } };
}

// Für das Forschungs-Fenster: alle Forschungen mit Zustand, Kosten, Dauer und Fortschritt (Zahlen, keine Texte)
export function forschungListe(z) {
  forschungAnlegen(z);
  const L = z.forschung.laeuft;
  return FORSCHUNGEN.map(f => {
    const laeuft = L && L.id === f.id;
    return { id: f.id, name: f.name, kosten: { ...f.kosten }, dauer: f.dauer, braucht: [...f.braucht], zustand: forschungZustand(z, f),
      anteil: laeuft ? Math.min(1, Math.max(0, (z.minuten - L.beginn) / (L.ende - L.beginn))) : null,
      // Restzeit in echten Sekunden bei x1 (die Oberfläche rechnet nichts selbst)
      restSekunden: laeuft ? Math.max(0, Math.ceil((L.ende - z.minuten) / dauerMinuten(f) * f.dauer)) : null };
  });
}

// Der Haltungs-Multiplikator ist ein Skill des Hauptamtlichen: Regeln seit 26.11. in skills.js
