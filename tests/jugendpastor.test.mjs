// Prüft den Jugendpastor (Lukas, 27.11.2026: claude/spielprinzip-jugendpastor.md):
// kommt am Montag 8:00 der 3. Woche mit Pop-up (Zeit steht), alte Spielstände am nächsten Montag 8:00; leitet nur
// Jugendgottesdienst, Lobpreisgottesdienst und Konfirmandenunterricht, übernimmt sonst die Stellen wie Pastor Harder;
// 3 Schichten; 7–23 Uhr in der Gemeinde, ohne Schicht im Kirchkaffee, sonst daheim; Seelsorge mit eigener Stufe,
// Anfrage an einen freien Hauptamtlichen (bei mehreren per Zufall), ohne freien wartet sie.
// Starten mit: node tests/jugendpastor.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { JUGENDPASTOR } from '../src/inhalte/mitarbeiter.js';
import { DIENST } from '../src/inhalte/dienst.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel as neuesSpielOhne } from './hilfen/ohne-erster.mjs';
import { zeitVorruecken, veranstaltungEinstellen, gottesdienstRaeume } from '../src/kern/ablauf.js';
import { moebelSetzen, moebelKaufen } from '../src/kern/moebel.js';
import { startPlatz } from '../src/kern/personen.js';
import { dienstTermine, stelleSetzen, schichtenMax, dienstplanInfo } from '../src/kern/dienst.js';
import { jugendpastorAnlegen, jugendpastorSchliessen, jugendpastorOffen, ankunftZeit, JUGENDPASTOR_ID } from '../src/kern/jugendpastor.js';
import { raten, schliessen, anfrageInfo, seelsorgeSchritt } from '../src/kern/seelsorge.js';
import { seelsorgePunkte, hatSkill } from '../src/kern/skills.js';
import { neuerBesucher } from '../src/kern/besucher.js';
import { TAG_MIN, WOCHE_MIN } from '../src/kern/zeit.js';

const ANKUNFT = 2 * WOCHE_MIN + 8 * 60;
function gemeinde() {
  const z = neuesSpielOhne(() => 0.9);
  z.schichtbetrieb = true; z.ortRuhig = true;
  delete z.jugendpastor; jugendpastorAnlegen(z);   // in den älteren Tests kommt er nicht – hier schon
  const aus = () => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
  const raumBei = (x, y) => { const a = aus(); return a.liste[a.gruppe[x + y * z.w]]; };
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 10); tuerUmschalten(z, G.x + 2, G.y + 5);
  wandRechteck(z, G.x + 18, G.y + 2, G.x + 26, G.y + 10); tuerUmschalten(z, G.x + 18, G.y + 5);
  typZuweisen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst'); typZuweisen(z, raumBei(G.x + 20, G.y + 5), 'kirchkaffee');
  for (let i = 0; i < 10; i++) moebelSetzen(z, 'stuhl', G.x + 6 + i, G.y + 7, G.x + 6 + i, G.y + 7);
  z.konto = 5000;
  assert.equal(moebelKaufen(z, 'gitarre', G.x + 10, G.y + 3), 'ok');
  const gd = () => raumBei(G.x + 5, G.y + 5), kk = () => raumBei(G.x + 20, G.y + 5);
  const pastor = z.personen.find(p => p.id === 'pastor');
  return { z, aus, gd, kk, pastor };
}
const bis = (z, aus, minute) => { for (let i = 0; i < 100000 && z.minuten < minute - 1e-9; i++) { zeitVorruecken(z, aus(), Math.min(5, minute - z.minuten), () => 0.5); if (jugendpastorOffen(z)) jugendpastorSchliessen(z); } };
const jimmy = z => z.personen.find(p => p.id === JUGENDPASTOR_ID);

// Ankunft: Montag 8:00 der 3. Woche, Zeit steht bis „Weiter“
{
  const { z, aus } = gemeinde();
  z.minuten = ANKUNFT - 30;
  zeitVorruecken(z, aus(), 60, () => 0.5);
  assert.equal(z.minuten, ANKUNFT);                       // genau hier steht die Zeit
  assert.ok(jugendpastorOffen(z));
  const j = jimmy(z);
  assert.ok(j && j.daten.name === 'Jugendpastor Jimmy' && j.daten.art === 'hauptamt');
  zeitVorruecken(z, aus(), 30, () => 0.5);
  assert.equal(z.minuten, ANKUNFT);                       // weiter Stillstand
  jugendpastorSchliessen(z);
  zeitVorruecken(z, aus(), 30, () => 0.5);
  assert.equal(z.minuten, ANKUNFT + 30);
  assert.equal(z.personen.filter(p => p.id === JUGENDPASTOR_ID).length, 1);   // kommt nur einmal
  assert.equal(schichtenMax(j), DIENST.schichtenHauptamt);
  assert.ok(hatSkill(j, 'seelsorge') && hatSkill(j, 'multiplikator'));
  assert.equal(seelsorgePunkte(z, j), 0);                 // eigene Seelsorge-Stufe, startet bei Stufe 1
}
// Alte Spielstände: am nächsten Montag 8:00
{
  const { z } = gemeinde();
  z.minuten = 4 * WOCHE_MIN + TAG_MIN + 5 * 60;           // Dienstag in Woche 5
  assert.equal(ankunftZeit(z), 5 * WOCHE_MIN + 8 * 60);
  z.minuten = 10;
  assert.equal(ankunftZeit(z), ANKUNFT);
  assert.equal(JUGENDPASTOR.ankunft.woche, 2);
}
console.log('Jugendpastor-Ankunft-Tests bestanden.');

// Leitung nur bei seinen Veranstaltungen; andere Stellen wie Pastor Harder
{
  const { z, aus, gd, pastor } = gemeinde();
  z.minuten = ANKUNFT - 1; bis(z, aus, ANKUNFT + 1);
  const j = jimmy(z);
  veranstaltungEinstellen(z, gd(), 'gottesdienst');
  let v = dienstTermine(z, aus()).find(t => t.art === 'veranstaltung');
  assert.equal(stelleSetzen(z, aus(), v.key, 'hauptamt', j.id), 'leitet');
  for (const art of ['lobpreis', 'jugend']) {
    veranstaltungEinstellen(z, gd(), art);
    v = dienstTermine(z, aus()).find(t => t.art === 'veranstaltung');
    assert.equal(stelleSetzen(z, aus(), v.key, 'hauptamt', j.id), 'ok', art);
    stelleSetzen(z, aus(), v.key, 'hauptamt', null);
  }
  assert.deepEqual(JUGENDPASTOR.daten.leitet, ['jugend', 'lobpreis', 'konfi']);
  // Ohne Schichtbetrieb (wer im Raum steht): kein Gottesdienst mit Jimmy als einziger Leitung
  veranstaltungEinstellen(z, gd(), 'gottesdienst');
  z.schichtbetrieb = false;
  const r = gd(), c = r.zellen.find(c => { const x = c % z.w, y = (c / z.w) | 0; return x > G.x + 3 && y === G.y + 5; });
  j.daheim = false; j.x = c % z.w; j.y = (c / z.w) | 0; pastor.x = startPlatz().x; pastor.y = startPlatz().y;
  const g = gottesdienstRaeume(z, aus()).find(x => x.raum.nr === gd().nr);
  assert.equal(g.programm[0].fehlt, 'leitung');
  z.schichtbetrieb = true;
  // Kirchkaffee und Evangelisation: wie Pastor Harder
  const ev = dienstTermine(z, aus()).find(t => t.art === 'evangelisation' && t.tag === 1 && t.slot === 'vormittag');
  assert.equal(stelleSetzen(z, aus(), ev.key, 'platz0', j.id), 'ok');
  const info = dienstplanInfo(z, aus());
  assert.deepEqual(info.personen.find(p => p.id === j.id).leitet, ['jugend', 'lobpreis', 'konfi']);
  assert.equal(info.personen.find(p => p.id === 'pastor').leitet, null);
}
console.log('Jugendpastor-Leitung-Tests bestanden.');

// Anwesenheit: 7–23 Uhr, ohne Schicht im Kirchkaffee; nachts daheim
{
  const { z, aus, kk } = gemeinde();
  z.minuten = ANKUNFT - 1; bis(z, aus, ANKUNFT + 60);
  const j = jimmy(z);
  assert.ok(!j.daheim && aus().gruppe[j.x + j.y * z.w] === kk().nr, 'wartet im Kirchkaffee');
  bis(z, aus, 2 * WOCHE_MIN + 23 * 60 + 5);
  assert.ok(j.daheim, 'nach 23 Uhr daheim');
  bis(z, aus, 2 * WOCHE_MIN + TAG_MIN + 6 * 60 + 30);
  assert.ok(j.daheim, 'vor 7 Uhr daheim');
  bis(z, aus, 2 * WOCHE_MIN + TAG_MIN + 7 * 60 + 5);
  assert.ok(!j.daheim && aus().gruppe[j.x + j.y * z.w] === kk().nr, 'ab 7 Uhr wieder im Kirchkaffee');
}
console.log('Jugendpastor-Anwesenheit-Tests bestanden.');

// Seelsorge: eigene Stufe, Anfrage an einen freien Hauptamtlichen, ohne freien wartet sie
{
  const { z, aus, pastor } = gemeinde();
  z.minuten = ANKUNFT - 1; bis(z, aus, ANKUNFT + 60);
  const j = jimmy(z), b = neuerBesucher(z, undefined, () => 0.3);
  z.besucher = [b];
  // Gespräch mit Jimmy: Punkte gehen an Jimmy, nicht an Pastor Harder
  z.seelsorge.anfrage = { id: b.id, situation: 'nachbar', bei: j.id, phase: 'frage', ergebnis: null };
  assert.equal(anfrageInfo(z).seelsorger.name, 'Jugendpastor Jimmy');
  raten(z, 0, () => 0); schliessen(z); z.seelsorge.gang = null;
  assert.ok(seelsorgePunkte(z, j) > 0);
  assert.equal(seelsorgePunkte(z, pastor), 0);
  // Ohne bei (ältere Spielstände): Pastor Harder
  z.seelsorge.anfrage = { id: b.id, situation: 'nachbar', phase: 'frage', ergebnis: null };
  assert.equal(anfrageInfo(z).seelsorger.name, 'Pastor Harder');
  z.seelsorge.anfrage = null;
  // Beide frei: Zufall entscheidet (erster Wurf < 0,5 → Pastor Harder, sonst Jimmy)
  const S = z.seelsorge, frage = wurf => {
    S.gang = null; S.anfrage = null; S.wartet = null; S.pruefungen = [z.minuten]; S.tag = Math.floor(z.minuten / TAG_MIN);
    if (z.ort) z.ort.leute = [];   // Würfe: Anfrage ja, Person, Situation, dann wer gefragt wird
    const werte = [0, 0, 0, wurf, 0.5, 0.5, 0.5, 0.5]; let i = 0;
    z.ortRuhig = false;
    const s = seelsorgeSchritt(z, () => false, () => werte[Math.min(i++, werte.length - 1)], aus());
    z.ortRuhig = true;
    s.tun();
    return (S.gang || S.anfrage || S.wartet);
  };
  assert.equal(frage(0.2).bei, 'pastor');
  assert.equal(frage(0.8).bei, j.id);
  // Beide in einer Schicht (Evangelisation jetzt): die Anfrage wartet
  S.gang = null; S.anfrage = null; bis(z, aus, ANKUNFT + 3 * 60);   // Montag 11 Uhr
  const w = Math.floor(z.minuten / WOCHE_MIN), jetzt = z.minuten - w * WOCHE_MIN;
  const ev = dienstTermine(z, aus()).find(t => t.art === 'evangelisation' && t.von <= jetzt && t.bis > jetzt);
  assert.equal(stelleSetzen(z, aus(), ev.key, 'platz0', pastor.id), 'ok');
  assert.equal(stelleSetzen(z, aus(), ev.key, 'platz1', j.id), 'ok');
  zeitVorruecken(z, aus(), 1, () => 0.5);
  const x = frage(0.2);
  assert.ok(S.wartet && !S.gang && !S.anfrage && !x.bei, 'Anfrage wartet');
  // Schicht vorbei: jetzt geht sie an einen freien Hauptamtlichen
  stelleSetzen(z, aus(), ev.key, 'platz1', null);
  zeitVorruecken(z, aus(), 1, () => 0.5);
  z.ortRuhig = false;
  const s = seelsorgeSchritt(z, () => false, () => 0.5, aus());
  z.ortRuhig = true;
  assert.ok(s.zeit <= z.minuten + 15);
  z.minuten = s.zeit; s.tun();
  assert.ok(!S.wartet && (S.gang || S.anfrage));
  assert.equal((S.gang || S.anfrage).bei, j.id);
}
console.log('Jugendpastor-Seelsorge-Tests bestanden.');
