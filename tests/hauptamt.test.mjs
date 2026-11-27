// Prüft Hauptamtliche im Dienstplan (Lukas, 27.11.2026: claude/spielprinzip-hauptamt-dienstplan.md):
// eigene Leitungs-Stelle, 3 Schichten pro Woche, Stellen der Ehrenamtlichen auch für den Pastor (außer Musik/Mitarbeit),
// Veranstaltung nach Dienstplan, Kommen zur Schicht und danach zurück zum Startplatz (nicht heim), Feste zählen nicht als Schicht.
// Starten mit: node tests/hauptamt.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { DIENST } from '../src/inhalte/dienst.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel as neuesSpielOhne } from './hilfen/ohne-erster.mjs';
import { spielStarten, SPEICHER_VERSION } from '../src/kern/spiel.js';
import { zeitVorruecken, veranstaltungEinstellen, gottesdienstRaeume } from '../src/kern/ablauf.js';
import { moebelSetzen, moebelKaufen } from '../src/kern/moebel.js';
import { personHinzufuegen, startPlatz, eingesetztIn } from '../src/kern/personen.js';
import { dienstTermine, stelleSetzen, schichtenMax, schichtenBelegt, aktiveSchicht, dienstplanInfo } from '../src/kern/dienst.js';
import { festPlanSetzen } from '../src/kern/feste.js';
import { vorOrt } from '../src/kern/evangelisation.js';
import { TAG_MIN } from '../src/kern/zeit.js';

const SO = 6 * TAG_MIN;
function gemeinde() {
  const z = neuesSpielOhne(() => 0.9);
  z.schichtbetrieb = true; z.ortRuhig = true;
  const aus = () => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
  const raumBei = (x, y) => { const a = aus(); return a.liste[a.gruppe[x + y * z.w]]; };
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 10); tuerUmschalten(z, G.x + 2, G.y + 5);
  wandRechteck(z, G.x + 18, G.y + 2, G.x + 26, G.y + 10); tuerUmschalten(z, G.x + 18, G.y + 5);
  typZuweisen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst'); typZuweisen(z, raumBei(G.x + 20, G.y + 5), 'kirchkaffee');
  veranstaltungEinstellen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst');
  for (let i = 0; i < 10; i++) moebelSetzen(z, 'stuhl', G.x + 6 + i, G.y + 7, G.x + 6 + i, G.y + 7);
  z.konto = 5000;
  assert.equal(moebelKaufen(z, 'gitarre', G.x + 10, G.y + 3), 'ok');
  assert.equal(moebelKaufen(z, 'kaffeemaschine', G.x + 20, G.y + 3), 'ok');
  assert.equal(moebelKaufen(z, 'theke', G.x + 22, G.y + 3), 'ok');
  const ea = personHinzufuegen(z, { name: 'Helfer', kuerzel: 'H', art: 'ehrenamt' });
  const pastor = z.personen.find(p => p.id === 'pastor');
  const gd = () => raumBei(G.x + 5, G.y + 5), kk = () => raumBei(G.x + 20, G.y + 5);
  const termin = art => dienstTermine(z, aus()).find(t => t.art === art);
  const block = (art, tag, slot) => dienstTermine(z, aus()).find(t => t.art === art && t.tag === tag && t.slot === slot);
  return { z, aus, gd, kk, ea, pastor, termin, block };
}
const bis = (z, aus, minute) => { while (z.minuten < minute) zeitVorruecken(z, aus(), Math.min(5, minute - z.minuten), () => 0.5); };
const imRaum = (z, aus, p, r) => !p.daheim && aus().gruppe[p.x + p.y * z.w] === r.nr;

// Stellen: Leitung nur für Hauptamtliche, Musik nur für Ehrenamtliche, Kirchkaffee/Logistik/Evangelisation/Begrüßung für alle
{
  const { z, aus, ea, pastor, termin, block } = gemeinde();
  assert.equal(schichtenMax(pastor), DIENST.schichtenHauptamt);
  assert.equal(DIENST.schichtenHauptamt, 3);
  const v = termin('veranstaltung');
  assert.equal(v.stellen[0].code, 'leitungHA');
  assert.equal(stelleSetzen(z, aus(), v.key, 'hauptamt', ea.id), 'person');        // Ehrenamtliche leiten keinen Gottesdienst
  assert.equal(stelleSetzen(z, aus(), v.key, 'musik0', pastor.id), 'person');      // der Pastor spielt kein Instrument
  assert.equal(stelleSetzen(z, aus(), v.key, 'hauptamt', pastor.id), 'ok');
  assert.equal(stelleSetzen(z, aus(), termin('kaffeeNach').key, 'theke0', pastor.id), 'ok');
  assert.equal(stelleSetzen(z, aus(), block('evangelisation', 1, 'vormittag').key, 'platz0', pastor.id), 'ok');
  assert.equal(schichtenBelegt(z, aus(), pastor), 3);
  assert.equal(stelleSetzen(z, aus(), block('evangelisation', 2, 'vormittag').key, 'platz0', pastor.id), 'voll');
  // Menü: Pastor mit art 'hauptamt', Stellen mit wer
  const info = dienstplanInfo(z, aus());
  assert.ok(info.personen.some(p => p.id === 'pastor' && p.art === 'hauptamt' && p.max === 3 && p.belegt === 3));
  assert.equal(info.termine.find(t => t.key === v.key).stellen[0].wer, 'hauptamt');
}
console.log('Hauptamt-Stellen-Tests bestanden.');

// Veranstaltung nach Dienstplan: ohne eingeteilten Hauptamtlichen fällt der Gottesdienst aus, mit findet er statt
{
  const { z, aus, gd, pastor, termin } = gemeinde();
  const g = () => gottesdienstRaeume(z, aus()).find(x => x.raum.nr === gd().nr);
  assert.equal(g().programm[0].fehlt, 'leitung');
  stelleSetzen(z, aus(), termin('veranstaltung').key, 'hauptamt', pastor.id);
  assert.equal(g().programm[0].fehlt, null);                                         // zählt schon, bevor er da ist
  assert.equal(g().programm[0].leitung, pastor);
}
console.log('Hauptamt-Veranstaltung-Tests bestanden.');

// Kommen und bleiben: zur Schicht im Raum, danach zurück zum Startplatz – nie daheim
{
  const { z, aus, gd, kk, pastor, termin } = gemeinde();
  stelleSetzen(z, aus(), termin('veranstaltung').key, 'hauptamt', pastor.id);
  stelleSetzen(z, aus(), termin('kaffeeNach').key, 'theke0', pastor.id);
  bis(z, aus, SO + 9 * 60);
  assert.ok(!pastor.daheim);
  const s = startPlatz();
  assert.deepEqual({ x: pastor.x, y: pastor.y }, s);                                  // wartet auf dem Gelände
  bis(z, aus, SO + 10 * 60 + 5);
  assert.ok(imRaum(z, aus, pastor, gd()), 'leitet den Gottesdienst');
  assert.equal(aktiveSchicht(z, aus(), pastor).s.code, 'leitungHA');
  bis(z, aus, SO + 11 * 60 + 5);
  assert.ok(imRaum(z, aus, pastor, kk()), 'danach an der Theke');
  assert.equal((eingesetztIn(z, aus(), pastor) || {}).nr, kk().nr);                  // zählt dort wie ein Ehrenamtlicher
  bis(z, aus, SO + 15 * 60);
  assert.ok(!pastor.daheim);
  assert.deepEqual({ x: pastor.x, y: pastor.y }, s);                                  // wieder am Startplatz
  assert.equal(eingesetztIn(z, aus(), pastor), null);
}
console.log('Hauptamt-Kommen-und-Bleiben-Tests bestanden.');

// Evangelisation: der Pastor steht am Standplatz und zählt dort mit
{
  const { z, aus, pastor, block } = gemeinde();
  stelleSetzen(z, aus(), block('evangelisation', 1, 'nachmittag').key, 'platz0', pastor.id);
  bis(z, aus, TAG_MIN + 16 * 60);
  assert.ok(vorOrt(z).includes(pastor));
  bis(z, aus, TAG_MIN + 20 * 60);
  assert.ok(!vorOrt(z).includes(pastor));
}
console.log('Hauptamt-Evangelisation-Tests bestanden.');

// Feste: die Leitung im Fest-Menü kostet keine Schicht, der Pastor geht zur Festzeit in den Festraum
{
  const { z, aus, gd, pastor } = gemeinde();
  const raum = Math.min(...gd().zellen), tagNr = 31, w = Math.floor(tagNr / 7);
  assert.equal(festPlanSetzen(z, `heiligabend:${tagNr}`, { slot: 'nachmittag', raum, leitung: pastor.id, art: 'gottesdienst' }), 'ok');
  assert.equal(schichtenBelegt(z, aus(), pastor), 0);
  bis(z, aus, tagNr * TAG_MIN + 15 * 60 + 5);
  assert.ok(imRaum(z, aus, pastor, gd()), 'leitet das Fest');
  assert.equal(aktiveSchicht(z, aus(), pastor).t.art, 'fest');
  assert.ok(w >= 0);
}
console.log('Hauptamt-Fest-Tests bestanden.');

// Schalterwand: Pastor nicht ziehbar, Seitenleiste mit Schichten
{
  const { z } = gemeinde();
  const s = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0.5);
  assert.equal(s.personVersetzen('pastor', G.x + 6, G.y + 5), false);
  const p = s.lage().personen.find(x => x.id === 'pastor');
  assert.deepEqual(p.schichten, { belegt: 0, max: 3 });
  assert.equal(p.daheim, false);
}
console.log('Alle Hauptamt-Tests bestanden.');
