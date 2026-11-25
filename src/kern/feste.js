// Spiellogik der Feste im Kirchenjahr: Fest-Menü vor großen Festen und das geplante Sonderevent.
// Kennt keine Grafik und keine Texte.
//
// - Vor jedem großen Fest (FESTE mit gross: true) öffnet sich einmal das Fest-Menü (FEST_MENUE.tageVorher Tage vorher, 8:00).
//   Solange es offen ist, steht die Zeit (spiel.tick), wie bei einer Seelsorge-Anfrage.
// - Im Menü plant man das Sonderevent: Zeit (vormittags/nachmittags/abends), Raum, Leitung (Hauptamtlicher), Art, Ehrenamtliche.
//   Ehrenamtliche haben noch keine Wirkung (vorbereitet, Lukas legt sie später fest).
// - Das Sonderevent ist ein eigener Termin (ablauf.js). Zur gleichen Zeit fallen Termine im selben Raum
//   und Termine, die derselbe Hauptamtliche leiten würde, aus („fällt aus wegen …“).
// Gespeichert in z.feste: { gefragt: [schlüssel], anfrage: schlüssel | null, plaene: { schlüssel: plan } }.
// Schlüssel eines Fests: `${id}:${tagNr}` (tagNr = Spieltag, siehe kalender.js).
import { FESTE, FEST_MENUE } from '../inhalte/kirchenjahr.js';
import { SLOTS } from '../inhalte/zeit.js';
import { TAG_MIN } from './zeit.js';
import { kommendeFeste } from './kalender.js';
import { festAktiv, keineKonfirmandenMelden } from './konfi.js';

export function festeAnlegen(z) {
  if (!z.feste) z.feste = { gefragt: [], anfrage: null, plaene: {} };
}
export const festSchluessel = (id, tagNr) => `${id}:${tagNr}`;
export function festAusSchluessel(schluessel) {
  const [id, nr] = String(schluessel).split(':'), fest = FESTE.find(f => f.id === id), tagNr = Number(nr);
  return fest && Number.isInteger(tagNr) ? { fest, tagNr } : null;
}
export const festAnfrageOffen = z => !!(z.feste && z.feste.anfrage);

// Wann öffnet sich das Menü für das nächste noch nicht gefragte große Fest? → Schritt fürs Tick-System (oder null)
export function festSchritt(z) {
  festeAnlegen(z);
  if (z.feste.anfrage) return null;
  const heute = Math.floor(z.minuten / TAG_MIN);
  const f = kommendeFeste(heute + 1, 30).find(x => x.gross && !z.feste.gefragt.includes(festSchluessel(x.id, x.tagNr)));
  if (!f) return null;
  const zeit = (f.tagNr - FEST_MENUE.tageVorher) * TAG_MIN + FEST_MENUE.stunde * 60;
  const k = festSchluessel(f.id, f.tagNr), fest = FESTE.find(x => x.id === f.id);
  // Konfirmation ohne Konfirmanden: kein Menü, nur eine Meldung (die Konfirmation fällt aus)
  return { zeit: Math.max(zeit, z.minuten), tun: zz => {
    zz.feste.gefragt.push(k);
    if (festAktiv(zz, fest)) zz.feste.anfrage = k; else keineKonfirmandenMelden(zz);
  } };
}

// Sonderevent planen. a: { slot, raum (Raum-Schlüssel), leitung (Person-id), art, ehrenamt: [Person-ids] }
// Die Prüfung, ob Raum/Leitung/Art passen, macht spiel.js (kennt die Räume); hier wird nur gespeichert.
export function festPlanSetzen(z, schluessel, a) {
  festeAnlegen(z);
  const f = festAusSchluessel(schluessel);
  if (!f || !SLOTS.some(s => s.id === a.slot)) return 'zeit';
  if (Math.floor(z.minuten / TAG_MIN) > f.tagNr) return 'vorbei';
  z.feste.plaene[schluessel] = { slot: a.slot, raum: a.raum, leitung: a.leitung, art: a.art, ehrenamt: [...(a.ehrenamt || [])] };
  if (z.feste.anfrage === schluessel) z.feste.anfrage = null;
  return 'ok';
}
// „Diesmal nicht“: kein Sonderevent (ein schon geplantes wird abgesagt)
export function festAbsagen(z, schluessel) {
  festeAnlegen(z);
  delete z.feste.plaene[schluessel];
  if (z.feste.anfrage === schluessel) z.feste.anfrage = null;
  return 'ok';
}
// Geplante Sonderevents einer Woche: [{ schluessel, fest, tagNr, tag (0 = Montag), plan }]
export function festPlaeneDerWoche(z, woche) {
  if (!z.feste) return [];
  return Object.entries(z.feste.plaene).map(([schluessel, plan]) => ({ schluessel, plan, ...festAusSchluessel(schluessel) }))
    .filter(e => e.fest && Math.floor(e.tagNr / 7) === woche).map(e => ({ ...e, tag: e.tagNr - woche * 7 }));
}
// Alte Pläne (lange vorbei) aufräumen
export function festeAufraeumen(z) {
  if (!z.feste) return;
  const heute = Math.floor(z.minuten / TAG_MIN);
  for (const k of Object.keys(z.feste.plaene)) { const f = festAusSchluessel(k); if (!f || f.tagNr < heute - 14) delete z.feste.plaene[k]; }
  z.feste.gefragt = z.feste.gefragt.filter(k => { const f = festAusSchluessel(k); return f && f.tagNr >= heute - 14; });
}
