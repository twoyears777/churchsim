// Spiellogik: Bedürfnisse am Ende der Woche (Spielprinzip von Lukas, 25.11.2026: claude/spielprinzip-beduerfnisse-wochenende.md).
// Sonntag 24:00 (= Montag 0:00 der nächsten Woche, also vor den Dauerspendern um 8:00):
// Für jeden Besucher (nicht Passanten, nicht Ehrenamtliche) zählt jedes Bedürfnis, das er hat und das diese Woche nicht erfüllt
// wurde, BEDUERFNISSE.nichtErfuellt (−5). Wer gar nicht da war, hat seine Bedürfnisse auch nicht erfüllt. Erfüllt: kein Plus.
// Gespeichert wird nur, welche Woche zuletzt geprüft wurde (z.beduerfnisWoche); was erfüllt ist, steht beim Menschen (b.erfuellt).
import { BEDUERFNISSE as B } from '../inhalte/besucher.js';
import { WOCHE_MIN, zeitpunkt } from './zeit.js';
import { beduerfnisseVon, erfuelltInWoche, zufriedenheitAendern, levelVon } from './besucher.js';
import { SPIELBEGINN } from '../inhalte/zeit.js';

export function beduerfnisseAnlegen(z) {
  if (typeof z.beduerfnisWoche === 'number') return;
  const w = typeof z.minuten === 'number' ? zeitpunkt(z.minuten).woche : 0;
  // Neues Spiel: die erste Woche wird schon geprüft. Alter Spielstand mitten in der Woche: Was vorher in dieser Woche war,
  // wurde noch nicht gemerkt – deshalb geht es erst mit der nächsten Woche los (Claude, 25.11.).
  const beginn = w * WOCHE_MIN + SPIELBEGINN.tag * 24 * 60 + SPIELBEGINN.stunde * 60;
  z.beduerfnisWoche = z.minuten > beginn ? w : w - 1;
}

// Welche Bedürfnisse von b sind in dieser Woche (noch) nicht erfüllt?
export const offeneBeduerfnisse = (b, woche) => beduerfnisseVon(b).filter(id => !erfuelltInWoche(b, id, woche));

function wocheAbrechnen(z, woche) {
  for (const b of z.besucher || []) {
    const offen = offeneBeduerfnisse(b, woche);
    b.wochenErgebnis = { woche, offen, haltung: offen.length * B.nichtErfuellt, levelVorher: levelVon(b) };
    if (offen.length) zufriedenheitAendern(b, offen.length * B.nichtErfuellt);
  }
  z.beduerfnisWoche = woche;
}

// Nächster Schritt für das Tick-System (ablauf.js): Ende der nächsten noch nicht geprüften Woche
export function beduerfnisSchritt(z) {
  beduerfnisseAnlegen(z);
  const woche = z.beduerfnisWoche + 1;
  return { zeit: Math.max((woche + 1) * WOCHE_MIN, z.minuten), tun: zz => wocheAbrechnen(zz, woche) };
}

// Abfrage fürs Kärtchen: Bedürfnisse dieser Woche mit erfüllt ja/nein (Kopie, nur Kennungen)
export function wochenBeduerfnisse(z, b) {
  const w = zeitpunkt(z.minuten).woche;
  return beduerfnisseVon(b).map(id => ({ id, erfuellt: erfuelltInWoche(b, id, w) }));
}
