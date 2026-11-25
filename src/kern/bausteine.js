// Bausteintabelle im Menü „Veranstaltung einstellen“ (Spielprinzip von Lukas, 25.11.):
// Für jeden Eventtyp eine Liste der Bausteine (Möbel, Mitarbeiter) mit „im Raum ja/nein“ und den Regelwerten,
// dazu eine Zeile „Zusammen“ für das, was gerade im Raum ist.
// Liefert nur Zahlen und Kennungen – die Texte macht die Oberfläche (texte.js → bausteine).
// Alle Zahlen kommen aus den Inhaltsdateien; ändert sich dort etwas, stimmt die Tabelle automatisch.
import { VERANSTALTUNGEN, SPONTANE_SPENDE } from '../inhalte/veranstaltungen.js';
import { AENDERUNG, LOBPREIS_MUSIK, JUGEND } from '../inhalte/besucher.js';
import { KOLLEKTE_PRO_BESUCHER } from '../inhalte/finanzen.js';
import { MOEBEL } from '../inhalte/moebel.js';
import { moebelImRaum, stuhlStufe, musikLevel, musikBonus, instrumenteImRaum } from './moebel.js';
import { daten } from './personen.js';
import { fensterAnRaum } from './karte.js';
import { FENSTER } from '../inhalte/bau.js';

const MAX_MUSIKER = MOEBEL.filter(m => m.wirkung && m.wirkung.musik).length;   // so viele Instrumente gibt es
const prozent = b => Math.round(b * 100);
const DEKO = ['kanzel', 'altar', 'blumen', 'gruenpflanze'];   // Ausstattung des Gottesdienstraums, Reihenfolge der Tabelle
// Erwartete spontane Spende pro Besucher (Gemeindesaal): Chance × durchschnittlicher Betrag
const spendeJeBesucher = () => SPONTANE_SPENDE.chance * (SPONTANE_SPENDE.min + SPONTANE_SPENDE.max) / 2;

// Bausteine für alle Eventtypen dieses Raums → { [art]: { zeilen, summe } }
// info: Eintrag aus gottesdienstRaeume (null, wenn der Raum Probleme hat – dann ist keiner der Mitarbeiter eingesetzt)
export function bausteineVon(z, raum, info, arten) {
  const aus = {};
  for (const art of arten) {
    const v = VERANSTALTUNGEN.find(x => x.id === art);
    if (v) aus[art] = v.raumtypen.includes('gottesdienst') ? gottesdienstraum(z, raum, info, v) : gemeindesaal(z, raum, info, v);
  }
  return aus;
}

// Gottesdienst und Lobpreisgottesdienst
function gottesdienstraum(z, raum, info, v) {
  const lobpreis = !!v.haltungNachVorliebe;
  const imRaum = info ? info.imRaum : [];
  const hauptamt = imRaum.some(p => daten(p).art === 'hauptamt');
  const hat = art => moebelImRaum(z, raum, art).length > 0;
  const stuehle = moebelImRaum(z, raum, 'stuhl');
  const spieler = info ? info.spieler : [];
  const levels = spieler.map(musikLevel);
  const instrumente = instrumenteImRaum(z, raum);
  const zeilen = [];

  // Pflicht: Hauptamtlicher (beim Lobpreisgottesdienst auch die Gitarre)
  zeilen.push(lobpreis
    ? { id: 'hauptamtLobpreis', pflicht: true, imRaum: hauptamt, haltungMax: v.haltungNachVorliebe, platz: AENDERUNG.sitzplatz, kollekte: KOLLEKTE_PRO_BESUCHER }
    : { id: 'hauptamt', pflicht: true, imRaum: hauptamt, gottesdienst: AENDERUNG.gottesdienst, platz: AENDERUNG.sitzplatz, kollekte: KOLLEKTE_PRO_BESUCHER });
  for (const art of v.braucht) zeilen.push({ id: 'pflichtMoebel', moebel: art, name: MOEBEL.find(m => m.id === art).name, pflicht: true, imRaum: hat(art) });

  // Ausstattung: Kanzel, Altar, Blumen, Grünpflanze
  let haltungFest = 0, faktor = 1;
  for (const id of DEKO) {
    const m = MOEBEL.find(x => x.id === id);
    const anzahl = Math.min(m.max || Infinity, moebelImRaum(z, raum, id).length);
    haltungFest += (m.wirkung.haltung || 0) * anzahl;
    faktor *= (m.wirkung.kollekte || 1) ** anzahl;
    zeilen.push({ id: 'moebel', moebel: id, name: m.name, imRaum: anzahl > 0, anzahl, max: m.max || null,
      haltung: m.wirkung.haltung || 0, kollekte: m.wirkung.kollekte || null });
  }
  // Fenster (25.11.): + Haltung je Fenster, ohne Obergrenze
  const fenster = fensterAnRaum(z, raum);
  haltungFest += FENSTER.haltung * fenster;
  zeilen.push({ id: 'fenster', imRaum: fenster > 0, anzahl: fenster, haltung: FENSTER.haltung });
  zeilen.push({ id: 'besserStuhl', imRaum: stuehle.some(s => stuhlStufe(s).stufe > 1), kollekte: true });

  // Instrument ohne Spieler (nur beim normalen Gottesdienst; beim Lobpreisgottesdienst ist die Gitarre Pflicht)
  if (!lobpreis) {
    const erstes = MOEBEL.find(m => m.wirkung && m.wirkung.musik && hat(m.id)) || MOEBEL.find(m => m.id === 'gitarre');
    zeilen.push({ id: 'instrumentOhne', name: erstes.name, imRaum: instrumente > 0 });
  }

  // Musiker: jeder spielende Ehrenamtliche eine Zeile, dazu eine Zeile für den nächsten
  const musikWirktAufBesucher = !lobpreis;
  for (let nr = 1; nr <= Math.min(MAX_MUSIKER, levels.length + 1); nr++) {
    const da = nr <= levels.length, level = da ? levels[nr - 1] : null;
    zeilen.push({ id: 'musiker', nr, imRaum: da, level, bonus: da ? prozent(musikBonus(level)) : null, bonusMin: prozent(musikBonus(0)),
      brauchtInstrument: !da && instrumente < nr,
      besucher: nr === 1 && musikWirktAufBesucher ? { min: LOBPREIS_MUSIK.mitMusik, max: LOBPREIS_MUSIK.mitMusik + 1 } : null });
  }

  // Zusammen: so wie der Raum jetzt ist
  const bonus = Math.round(levels.reduce((s, l) => s + musikBonus(l), 0) * 100) / 100;
  const pflichtDa = zeilen.filter(x => x.pflicht).every(x => x.imRaum);
  const summe = {
    art: lobpreis ? 'lobpreis' : 'gottesdienst', bereit: pflichtDa,
    besucher: lobpreis ? { art: 'vorliebe' } : levels.length ? { art: 'musik', min: LOBPREIS_MUSIK.mitMusik, max: LOBPREIS_MUSIK.mitMusik + 1 } : { art: 'normal' },
    haltung: { fest: AENDERUNG.sitzplatz + (lobpreis ? 0 : AENDERUNG.gottesdienst) + haltungFest, vorliebeMax: lobpreis ? v.haltungNachVorliebe : null,
      prozent: prozent(bonus) },
    geld: { jeBesucher: Math.round(KOLLEKTE_PRO_BESUCHER * faktor * (levels.length ? 1 + bonus : 1) * 100) / 100, spende: false }
  };
  return { zeilen, summe };
}

// Konfirmandenunterricht (Lukas, 25.11.): Hauptamtlicher und Stühle Pflicht, nur Jugendliche, + Haltung je Ehrenamtlichem.
// Das Plus der Ehrenamtlichen steht in der Spalte „Ehrenamt“ (erste Veranstaltung, die sie nutzt).
function konfi(z, raum, info, v) {
  const imRaum = info ? info.imRaum : [];
  const hauptamt = imRaum.some(p => daten(p).art === 'hauptamt');
  const stuehle = moebelImRaum(z, raum, 'stuhl');
  const ea = info ? (info.ehrenamtliche || []).length : 0, zaehlen = Math.min(v.ehrenamtMax || Infinity, ea);
  const zeilen = [
    { id: 'hauptamtKonfi', pflicht: true, imRaum: hauptamt, jugendProzent: prozent(JUGEND.faktor[v.id] ?? 1), veranstaltung: v.haltung || 0 },
    { id: 'stuehlePflicht', pflicht: true, imRaum: stuehle.length >= (v.stuehleMin || 1), plaetze: 1 },
    { id: 'besserStuhl', imRaum: stuehle.some(s => stuhlStufe(s).stufe > 1), kollekte: false },
    { id: 'ehrenamtKonfi', imRaum: zaehlen > 0, anzahl: zaehlen, max: v.ehrenamtMax || null, jeEhrenamt: v.haltungJeEhrenamt }
  ];
  const summe = { art: 'konfi', besucher: { art: 'plaetze', plaetze: stuehle.length },
    haltung: { fest: v.haltung || 0, vorliebeMax: null, prozent: 0 }, geld: { keins: true }, ehrenamt: zaehlen * v.haltungJeEhrenamt,
    bereit: zeilen.filter(x => x.pflicht).every(x => x.imRaum) };
  return { zeilen, summe };
}

// Seniorennachmittag und Kirchenchorprobe
function gemeindesaal(z, raum, info, v) {
  if (v.haltungJeEhrenamt) return konfi(z, raum, info, v);
  const imRaum = info ? info.imRaum : [];
  const ea = imRaum.filter(p => daten(p).art === 'ehrenamt');
  const hauptamt = imRaum.some(p => daten(p).art === 'hauptamt');
  const hat = art => moebelImRaum(z, raum, art).length > 0;
  const stuehle = moebelImRaum(z, raum, 'stuhl');
  const spende = v.spende ? Math.round(spendeJeBesucher() * 100) / 100 : 0;
  const zeilen = [];
  let summe;
  if (v.haltungNachMusik) {
    // Kirchenchorprobe: bester Ehrenamtlicher mit genug Musik-Level leitet
    const bester = ea.map(musikLevel).sort((a, b) => b - a)[0];
    const leitet = bester !== undefined && bester >= (v.musikLevelMin || 0);
    const level = bester === undefined ? null : bester;
    zeilen.push({ id: 'leitungChor', pflicht: true, imRaum: leitet, levelMin: v.musikLevelMin, level, platz: AENDERUNG.sitzplatz,
      bonus: leitet ? prozent(musikBonus(level)) : null, bonusMin: prozent(musikBonus(v.musikLevelMin || 0)), spende });
    for (const art of v.braucht) zeilen.push({ id: 'pflichtMoebel', moebel: art, name: MOEBEL.find(m => m.id === art).name, pflicht: true, imRaum: hat(art) });
    zeilen.push({ id: 'chorLevel', imRaum: leitet && level > (v.musikLevelMin || 0), proLevel: prozent(musikBonus(1) - musikBonus(0)) });
    summe = { art: 'chorprobe', besucher: { art: 'egal' },
      haltung: { fest: AENDERUNG.sitzplatz, vorliebeMax: null, prozent: leitet ? prozent(musikBonus(level)) : 0 }, geld: { jeBesucher: spende, spende: true } };
  } else {
    // Seniorennachmittag
    zeilen.push({ id: 'leitungSenioren', pflicht: true, imRaum: hauptamt && ea.length > 0, veranstaltung: v.haltung || 0, platz: AENDERUNG.sitzplatz, spende });
    zeilen.push({ id: 'tischStuehle', pflicht: true, imRaum: hat('tisch') && stuehle.length >= (v.stuehleMin || 0), stuehleMin: v.stuehleMin || 0 });
    zeilen.push({ id: 'weitererStuhl', imRaum: stuehle.length > (v.stuehleMin || 0), plaetze: 1 });
    zeilen.push({ id: 'besserStuhl', imRaum: stuehle.some(s => stuhlStufe(s).stufe > 1), kollekte: false });
    summe = { art: 'senioren', besucher: { art: 'plaetze', plaetze: stuehle.length },
      haltung: { fest: AENDERUNG.sitzplatz + (v.haltung || 0), vorliebeMax: null, prozent: 0 }, geld: { jeBesucher: spende, spende: true } };
  }
  summe.bereit = zeilen.filter(x => x.pflicht).every(x => x.imRaum);
  return { zeilen, summe };
}
