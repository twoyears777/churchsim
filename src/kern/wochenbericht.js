// Spiellogik der Wochenzusammenfassung (Spielprinzip von Lukas, 27.11.2026). Kennt keine Grafik und keine Texte.
// Jeden Montag um WOCHENBERICHT.stunde (8:00) – direkt nach den Dauerspenden (und am 1. des Monats nach den Mitgliedsbeiträgen):
//   1. Aus dem Finanz-Verlauf der vergangenen Woche, den Berichten ihrer Veranstaltungen und dem „Foto“ vom letzten Montag
//      wird ein Bericht gebaut: Kennzahlen (mit Vorwoche), Geld, Veranstaltungen, Gemeinde, Bekanntheit & Heiligkeit,
//      und – wenn seit dem letzten Bericht ein Monatserster war – der Monatsblick mit den Mitgliedsbeiträgen.
//   2. Das Spiel pausiert, bis der Bericht geschlossen wird (wie bei der Zeitung).
//   3. Ein neues „Foto“ wird gemacht: Bekanntheit, Heiligkeit, Mitglieder, Dauerspender und das Haltungslevel aller Menschen.
// Der erste Bericht kommt erst, wenn das Foto vom letzten Montag 8:00 stammt (neues Spiel: nach der ersten vollen Woche;
// alter Spielstand: nach dem übernächsten Montag). Den Vergleich mit der Vorwoche gibt es ab dem zweiten Bericht.
// Gespeichert in z.wochenbericht: { woche, stand, offen, bericht, vorher }.
import { WOCHENBERICHT as W } from '../inhalte/zeit.js';
import { WOCHE_MIN, zeitpunkt } from './zeit.js';
import { summe, kaffeeBilanz } from './finanzen.js';
import { berichteDerWoche } from './berichte.js';
import { mitgliederVon } from './mitglieder.js';
import { levelVon } from './besucher.js';

const montag = woche => woche * WOCHE_MIN + W.stunde * 60;   // Montag 8:00 dieser Woche (Spielminuten)
const rund1 = n => Math.round(n * 10) / 10;
const cent = n => Math.round(n * 100) / 100;
const alleMenschen = z => [...(z.besucher || []), ...(z.ort ? z.ort.leute : [])];
const SLOT_FOLGE = { vormittag: 0, nachmittag: 1, abend: 2 };

// „Foto“ vom Stand der Gemeinde
function foto(z, woche) {
  const level = {};
  for (const p of alleMenschen(z)) level[p.id] = levelVon(p);
  return {
    woche, voll: z.minuten === montag(woche),   // nur ein Foto genau von Montag 8:00 umfasst eine ganze Woche
    bekanntheit: z.bekanntheit || 0, heiligkeit: z.heiligkeit || 0,
    mitglieder: mitgliederVon(z).map(b => b.id),
    spender: Object.keys((z.dauerspende && z.dauerspende.spender) || {}),
    monat: z.mitglieder ? z.mitglieder.monat : null,
    level
  };
}

export function wochenberichtAnlegen(z) {
  if (z.wochenbericht) return;
  const w = typeof z.minuten === 'number' ? zeitpunkt(z.minuten).woche : 0;
  const durch = z.minuten >= montag(w);   // diese Woche ist der Montag 8:00 schon vorbei (oder gerade jetzt)
  z.wochenbericht = { woche: durch ? w : w - 1, stand: foto(z, durch ? w : w - 1), offen: false, bericht: null, vorher: null };
}

export const wochenberichtOffen = z => !!(z.wochenbericht && z.wochenbericht.offen);
export function wochenberichtSchliessen(z) { if (z.wochenbericht) z.wochenbericht.offen = false; return 'ok'; }

// Geld einer Woche aus dem Finanz-Verlauf (oder null, wenn es sie dort nicht gibt)
function geldVon(eintrag) {
  if (!eintrag) return null;
  const ein = summe(eintrag.einnahmen), aus = summe(eintrag.ausgaben), k = kaffeeBilanz(eintrag.kaffee);
  return { einnahmen: { ...eintrag.einnahmen }, ausgaben: { ...eintrag.ausgaben }, summeEinnahmen: ein, summeAusgaben: aus, saldo: cent(ein - aus),
    kaffee: { tassen: k.verkauft.tassen, verkauft: k.verkauft.euro, einkauf: k.einkauf.euro, gewinn: k.gewinn }, konto: eintrag.konto };
}

function berichtBauen(z, woche) {
  const R = z.wochenbericht, alt = R.stand, vergangen = woche - 1;
  const verlauf = z.finanzVerlauf || [];
  const geld = geldVon(verlauf.find(v => v.woche === vergangen)) || geldVon({ einnahmen: {}, ausgaben: {}, kaffee: undefined, konto: z.konto });
  const geldVorher = geldVon(verlauf.find(v => v.woche === vergangen - 1));
  const heute = (z.wochenbuch && z.wochenbuch.einnahmen) || {};

  // Veranstaltungen der vergangenen Woche (aus den Berichten im Gemeindekalender), nach Tag und Tageszeit
  const veranstaltungen = berichteDerWoche(z, vergangen)
    .sort((a, b) => a.tag - b.tag || (SLOT_FOLGE[a.slot] ?? 9) - (SLOT_FOLGE[b.slot] ?? 9) || (a.raum ?? 0) - (b.raum ?? 0))
    .map(b => ({ ...b }));
  const stattgefunden = veranstaltungen.filter(v => !v.ausgefallen);

  // Gemeinde: Vergleich mit dem Foto vom letzten Montag
  const menschen = new Map(alleMenschen(z).map(p => [p.id, p]));
  const name = id => { const p = menschen.get(id); return p ? p.voll : null; };
  const mitgliederJetzt = mitgliederVon(z).map(b => b.id), spenderJetzt = Object.keys((z.dauerspende && z.dauerspende.spender) || {});
  const neu = (jetzt, vorher) => jetzt.filter(id => !vorher.includes(id)).map(id => ({ id, name: name(id) }));
  const weg = (jetzt, vorher) => vorher.filter(id => !jetzt.includes(id)).map(id => ({ id, name: name(id) }));
  const auf = [], ab = [];
  for (const [id, p] of menschen) {
    const vorher = alt.level[id], jetzt = levelVon(p);
    if (vorher === undefined || vorher === jetzt) continue;
    (jetzt > vorher ? auf : ab).push({ id, name: p.voll, vorher, jetzt });
  }
  const nachName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'de');

  // Monatsblick: seit dem letzten Bericht wurden Mitgliedsbeiträge abgebucht
  const M = z.mitglieder || {};
  const monat = M.letzte && M.monat !== alt.monat && M.letzte.key === M.monat
    ? { ...M.letzte, vorher: M.vorletzte ? { ...M.vorletzte } : null } : null;

  const kennzahlen = {
    ergebnis: geld.saldo,
    besucher: stattgefunden.reduce((s, v) => s + (v.besucher || 0), 0),
    bekanntheit: rund1((z.bekanntheit || 0) - alt.bekanntheit),
    heiligkeit: rund1((z.heiligkeit || 0) - alt.heiligkeit)
  };
  return {
    woche: vergangen,
    kennzahlen, vergleich: R.vorher ? { ...R.vorher } : null,
    geld: { ...geld, konto: z.konto, vorher: geldVorher, heuteDauerspende: heute.dauerspende || 0, heuteMitglied: heute.mitglied || 0 },
    veranstaltungen,
    gemeinde: {
      mitglieder: mitgliederJetzt.length, mitgliederVorher: alt.mitglieder.length,
      neueMitglieder: neu(mitgliederJetzt, alt.mitglieder).sort(nachName), ehemaligeMitglieder: weg(mitgliederJetzt, alt.mitglieder).sort(nachName),
      spender: spenderJetzt.length, spenderVorher: alt.spender.length,
      neueSpender: neu(spenderJetzt, alt.spender).sort(nachName), ehemaligeSpender: weg(spenderJetzt, alt.spender).sort(nachName),
      aufgestiegen: auf.sort(nachName), abgestiegen: ab.sort(nachName)
    },
    bekanntheit: { start: alt.bekanntheit, ende: z.bekanntheit || 0 },
    heiligkeit: { start: rund1(alt.heiligkeit), ende: rund1(z.heiligkeit || 0) },
    monat
  };
}

function montagsBericht(z, woche) {
  const R = z.wochenbericht;
  if (R.stand && R.stand.voll && R.stand.woche === woche - 1) {
    R.bericht = berichtBauen(z, woche);
    R.vorher = { ...R.bericht.kennzahlen };
    R.offen = true;
  }
  R.stand = foto(z, woche);
  R.woche = woche;
}

// Nächster Schritt für das Tick-System (ablauf.js steht in der Liste direkt hinter den Dauerspendern: bei gleicher Zeit kommen diese zuerst)
export function wochenberichtSchritt(z) {
  wochenberichtAnlegen(z);
  const woche = z.wochenbericht.woche + 1;
  return { zeit: Math.max(montag(woche), z.minuten), tun: zz => montagsBericht(zz, woche) };
}

// Abfrage: der zuletzt gebaute Bericht (Kopie; Wochen wie gespeichert, ab 0) oder null
export function wochenberichtVon(z) {
  return z.wochenbericht && z.wochenbericht.bericht ? JSON.parse(JSON.stringify(z.wochenbericht.bericht)) : null;
}
