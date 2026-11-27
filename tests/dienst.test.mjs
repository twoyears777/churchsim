// Prüft den Dienstplan der Ehrenamtlichen (Spielprinzip von Lukas, 27.11.2026: claude/spielprinzip-ehrenamt-schichten-lager.md):
// Stellen je Termin, Schichten pro Woche, keine Überschneidungen, Kommen und Gehen, Veranstaltung nach Dienstplan,
// Kirchkaffee nach dem Gottesdienst, Logistik aus dem Lager, Evangelisation, Gottesdienstbesuch mit 90 %, alte Spielstände.
// Starten mit: node tests/dienst.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { DIENST } from '../src/inhalte/dienst.js';
import { EVANGELISATION } from '../src/inhalte/evangelisation.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel as neuesSpielOhne } from './hilfen/ohne-erster.mjs';
import { neuesSpiel, spielStarten, SPEICHER_VERSION } from '../src/kern/spiel.js';
import { zeitVorruecken, veranstaltungEinstellen, terminEinstellen, terminStand, termineDerWoche } from '../src/kern/ablauf.js';
import { moebelSetzen, moebelKaufen } from '../src/kern/moebel.js';
import { versetzen, personHinzufuegen } from '../src/kern/personen.js';
import { dienstTermine, stelleSetzen, aktiveSchicht, schichtenMax, schichtenBelegt, dienstplanInfo } from '../src/kern/dienst.js';
import { vorOrt } from '../src/kern/evangelisation.js';
import { schichtHinzufuegen, offenBei } from '../src/kern/kirchkaffee.js';
import { evangelisationLevel } from '../src/kern/skills.js';
import { TAG_MIN, WOCHE_MIN } from '../src/kern/zeit.js';

const SO = 6 * TAG_MIN;
// Gemeinde: Gottesdienstraum (Pastor, Stühle, Gitarre + Keyboard), Kirchkaffee daneben (1 Station), Lager mit Regal
function gemeinde({ lager = true, eas = 3, stuehle = 10 } = {}) {
  const z = neuesSpielOhne(() => 0.9);
  z.schichtbetrieb = true; z.ortRuhig = true;
  const aus = () => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
  const raumBei = (x, y) => { const a = aus(); return a.liste[a.gruppe[x + y * z.w]]; };
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 10); tuerUmschalten(z, G.x + 2, G.y + 5);
  wandRechteck(z, G.x + 18, G.y + 2, G.x + 26, G.y + 10); tuerUmschalten(z, G.x + 18, G.y + 5);
  typZuweisen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst'); typZuweisen(z, raumBei(G.x + 20, G.y + 5), 'kirchkaffee');
  if (lager) {
    wandRechteck(z, G.x + 2, G.y + 10, G.x + 6, G.y + 14); tuerUmschalten(z, G.x + 4, G.y + 14);   // innen 3 × 3
    typZuweisen(z, raumBei(G.x + 4, G.y + 12), 'lager');
  }
  veranstaltungEinstellen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst');
  for (let i = 0; i < stuehle; i++) moebelSetzen(z, 'stuhl', G.x + 6 + i, G.y + 7, G.x + 6 + i, G.y + 7);
  z.konto = 5000;
  assert.equal(moebelKaufen(z, 'gitarre', G.x + 10, G.y + 3), 'ok');
  assert.equal(moebelKaufen(z, 'keyboard', G.x + 12, G.y + 3), 'ok');
  assert.equal(moebelKaufen(z, 'kaffeemaschine', G.x + 20, G.y + 3), 'ok');
  assert.equal(moebelKaufen(z, 'theke', G.x + 22, G.y + 3), 'ok');
  if (lager) assert.equal(moebelKaufen(z, 'regal', G.x + 3, G.y + 11), 'ok');
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);   // Pastor in den Gottesdienstraum
  const ea = [];
  for (let i = 0; i < eas; i++) ea.push(personHinzufuegen(z, { name: `Helfer ${i + 1}`, kuerzel: 'H', art: 'ehrenamt' }));
  for (const b of z.besucher) b.kaffeeWert = 1;
  const gd = () => raumBei(G.x + 5, G.y + 5), kk = () => raumBei(G.x + 20, G.y + 5);
  const termin = art => dienstTermine(z, aus()).find(t => t.art === art);
  const block = (art, tag, slot) => dienstTermine(z, aus()).find(t => t.art === art && t.tag === tag && t.slot === slot);
  return { z, aus, gd, kk, ea, termin, block, raumBei };
}
const bis = (z, aus, minute, zufall = () => 0.5) => { while (z.minuten < minute) zeitVorruecken(z, aus(), Math.min(5, minute - z.minuten), zufall); };
const imRaum = (z, aus, p, r) => !p.daheim && aus().gruppe[p.x + p.y * z.w] === r.nr;

// Neues Spiel: Schichtbetrieb an, Frau des Pastors 5 Schichten, alle anderen 3; ohne Schicht ist man daheim
{
  const z = neuesSpiel(() => 0.5);
  assert.equal(z.schichtbetrieb, true);
  const f = z.personen.find(p => p.daten && p.daten.name === 'Frau des Pastors');
  assert.equal(schichtenMax(f), 5);
  assert.equal(schichtenMax({ id: 'x', daten: { name: 'Jemand', art: 'ehrenamt' } }), DIENST.schichten);
  // Alter Spielstand: die Frau des Pastors ohne `schichten` in den Daten bekommt trotzdem 5
  assert.equal(schichtenMax({ id: 'x', daten: { name: 'Frau des Pastors', art: 'ehrenamt', start: true } }), 5);
  const s = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0.5);
  s.tempoSetzen(1); s.tick(0.25);
  assert.ok(s.karte().personen.every(p => p.art !== 'ehrenamt' || p.daheim));   // sie läuft heim (oder ist schon weg)
}
console.log('Grundeinstellung-Tests bestanden.');

// Stellen: Musiker je Instrument, Kirchkaffee danach je Station, Logistik je Regal, Evangelisation je Standplatz
{
  const { z, aus, termin, block } = gemeinde();
  const v = termin('veranstaltung');
  assert.deepEqual(v.stellen.map(s => s.code), ['musik', 'musik']);
  assert.deepEqual(v.stellen.map(s => s.ding), ['gitarre', 'keyboard']);
  assert.equal(v.von, SO + 10 * 60 - DIENST.vorlauf); assert.equal(v.bis, SO + 11 * 60);
  const kn = termin('kaffeeNach');
  assert.equal(kn.stellen.length, 1); assert.equal(kn.von, SO + 11 * 60); assert.equal(kn.bis, SO + 13 * 60);
  assert.equal(block('logistik', 1, 'nachmittag').stellen.length, 1);
  assert.equal(block('evangelisation', 1, 'nachmittag').stellen.length, EVANGELISATION.standplaetze.length);
  assert.equal(dienstTermine(z, aus()).filter(t => t.art === 'evangelisation').length, 21);   // 7 Tage × 3 Blöcke
  // Zweites Regal = zweite Logistik-Stelle
  moebelKaufen(z, 'regal', G.x + 5, G.y + 11);
  assert.equal(block('logistik', 1, 'nachmittag').stellen.length, 2);
  // Ohne Lager keine Logistik
  const o = gemeinde({ lager: false });
  assert.equal(o.termin('logistik'), undefined);
}
console.log('Stellen-Tests bestanden.');

// Einteilen: ok, doppelt, voll (3 Schichten), Überschneidung, Pastor geht nicht; Gottesdienst + Kirchkaffee danach passt
{
  const { z, aus, ea, termin, block } = gemeinde();
  const v = termin('veranstaltung'), kn = termin('kaffeeNach'), [a, b] = ea;
  assert.equal(stelleSetzen(z, aus(), v.key, 'musik0', a.id), 'ok');
  assert.equal(stelleSetzen(z, aus(), v.key, 'musik1', a.id), 'doppelt');
  assert.equal(stelleSetzen(z, aus(), kn.key, 'theke0', a.id), 'ok');                     // 10–11 Uhr und ab 11 Uhr: keine Überschneidung
  assert.equal(stelleSetzen(z, aus(), block('evangelisation', 6, 'vormittag').key, 'platz0', a.id), 'zeit');   // So 10–15 Uhr überschneidet sich
  assert.equal(stelleSetzen(z, aus(), block('logistik', 1, 'abend').key, 'regal0', a.id), 'ok');
  assert.equal(schichtenBelegt(z, aus(), a), 3);
  assert.equal(stelleSetzen(z, aus(), block('evangelisation', 2, 'abend').key, 'platz0', a.id), 'voll');
  assert.equal(stelleSetzen(z, aus(), v.key, 'musik1', 'pastor'), 'person');
  assert.equal(stelleSetzen(z, aus(), v.key, 'gibtsnicht', b.id), 'keine');
  // Besetzte Stelle mit jemand anderem belegen: ersetzt ihn
  assert.equal(stelleSetzen(z, aus(), v.key, 'musik0', b.id), 'ok');
  assert.equal(schichtenBelegt(z, aus(), a), 2);
  assert.equal(stelleSetzen(z, aus(), v.key, 'musik0', null), 'ok');
  assert.equal(schichtenBelegt(z, aus(), b), 0);
  // Abfrage fürs Menü
  const info = dienstplanInfo(z, aus());
  assert.equal(info.personen.length, 3 + 1);   // drei Helfer und die Frau des Pastors
  assert.ok(info.termine.some(t => t.art === 'kaffeeNach' && t.stellen[0].person && t.stellen[0].person.id === a.id));
}
console.log('Einteilen-Tests bestanden.');

// Kommen und gehen: vor der Schicht daheim, während der Schicht im Raum, danach wieder daheim
{
  const { z, aus, gd, kk, ea, termin } = gemeinde();
  const [a] = ea, v = termin('veranstaltung'), kn = termin('kaffeeNach');
  stelleSetzen(z, aus(), v.key, 'musik0', a.id); stelleSetzen(z, aus(), kn.key, 'theke0', a.id);
  bis(z, aus, SO + 9 * 60);
  assert.equal(a.daheim, true);
  bis(z, aus, SO + 10 * 60 - DIENST.vorlauf + 1);
  assert.ok(imRaum(z, aus, a, gd()), 'Musiker steht vor Beginn im Gottesdienstraum');
  assert.equal(aktiveSchicht(z, aus(), a).t.key, v.key);
  bis(z, aus, SO + 11 * 60 + 2);
  assert.ok(imRaum(z, aus, a, kk()), 'nach dem Gottesdienst ins Kirchkaffee');
  bis(z, aus, SO + 14 * 60);
  assert.equal(a.daheim, true);
}
console.log('Kommen-und-Gehen-Tests bestanden.');

// Veranstaltung nach Dienstplan: Jugendgottesdienst braucht 2 Musiker – zählt, auch wenn sie noch daheim sind
{
  const { z, aus, gd, ea, termin } = gemeinde();
  veranstaltungEinstellen(z, gd(), 'jugend');
  const t = () => termineDerWoche(z, aus(), 0).find(x => x.art === 'jugend');
  assert.equal(terminStand(z, aus(), t()).zustand, 'faelltAus');
  const v = termin('veranstaltung');
  stelleSetzen(z, aus(), v.key, 'musik0', ea[0].id); stelleSetzen(z, aus(), v.key, 'musik1', ea[1].id);
  assert.ok(ea[0].daheim || !imRaum(z, aus, ea[0], gd()));
  assert.equal(terminStand(z, aus(), t()).zustand, 'geplant');
  bis(z, aus, SO + 12 * 60);
  const L = z.laeufe.find(x => x.art === 'jugend') || { ausgefallen: true };
  assert.ok(!L.ausgefallen, 'der Jugendgottesdienst findet statt');
}
console.log('Veranstaltung-nach-Dienstplan-Tests bestanden.');

// Kirchkaffee nach dem Gottesdienst: nur mit eingeteiltem Ehrenamtlichen gibt es Kaffee
{
  const mit = gemeinde(), ohne = gemeinde();
  for (const g of [mit, ohne]) g.z.moebel.find(m => m.art === 'kaffeemaschine').fuellung = 30;
  stelleSetzen(mit.z, mit.aus(), mit.termin('kaffeeNach').key, 'theke0', mit.ea[0].id);
  const kaffee = g => g.z.wochenbuch.buchungen.filter(b => b.kategorie === 'kirchkaffee' && b.seite === 'einnahmen').length;
  for (const g of [mit, ohne]) bis(g.z, g.aus, SO + 14 * 60, () => 0.3);
  assert.ok(kaffee(mit) > 0, 'mit Dienst wird Kaffee verkauft');
  assert.equal(kaffee(ohne), 0, 'ohne Dienst kein Kaffee');
}
console.log('Kirchkaffee-nach-dem-Gottesdienst-Tests bestanden.');

// Eigene Öffnungszeiten: keine Grenze von 3 mehr, Stellen je Öffnungszeit
{
  const { z, aus, kk } = gemeinde();
  for (let tag = 0; tag < 5; tag++) assert.equal(schichtHinzufuegen(z, kk(), tag, 'nachmittag'), 'ok');
  assert.equal(dienstTermine(z, aus()).filter(t => t.art === 'kaffee').length, 5);
}
console.log('Öffnungszeiten-Tests bestanden.');

// Logistik: im Lager eingeteilt → kauft Kaffee ein und füllt die Maschine auf; ohne Logistik füllt niemand auf
{
  const mit = gemeinde(), ohne = gemeinde();
  for (const g of [mit, ohne]) g.z.moebel.find(m => m.art === 'kaffeemaschine').fuellung = 0;
  stelleSetzen(mit.z, mit.aus(), mit.block('logistik', 0, 'nachmittag').key, 'regal0', mit.ea[0].id);
  // Nach der Schicht (19 Uhr) bringt er die gekaufte Ware noch hin, kauft aber nichts Neues, dann geht er heim
  for (const g of [mit, ohne]) bis(g.z, g.aus, 23 * 60 + 30);
  const voll = g => g.z.moebel.find(m => m.art === 'kaffeemaschine').fuellung || 0;
  assert.ok(voll(mit) >= 10, 'Logistik füllt die Maschine auf (je Gang höchstens 10)');
  const einkaeufe = mit.z.wochenbuch.buchungen.filter(b => b.kategorie === 'kaffee' && b.seite === 'ausgaben');
  assert.ok(einkaeufe.length >= 1 && einkaeufe.every(b => b.minuten < 19 * 60), 'eingekauft nur während der Schicht');
  assert.equal(voll(ohne), 0, 'ohne Logistik bleibt sie leer');
  assert.equal(mit.ea[0].daheim, true);
  assert.ok(!mit.z.kaffee.ma[mit.ea[0].id]);
}
console.log('Logistik-Tests bestanden.');

// Evangelisation: eingeteilt für einen Block, ohne Uhrzeit-Grenze (auch abends), sammelt Erfahrung
{
  const { z, aus, ea, block } = gemeinde();
  const [a] = ea;
  stelleSetzen(z, aus(), block('evangelisation', 0, 'abend').key, 'platz0', a.id);
  bis(z, aus, 21 * 60);
  assert.ok(vorOrt(z).includes(a), 'steht um 21 Uhr vor dem Laden');
  bis(z, aus, 23 * 60 + 30);
  assert.ok(!vorOrt(z).includes(a));
  assert.ok(((a.skills || {}).evangelisation || 0) > 2, 'Erfahrung für die Zeit vor Ort (1 pro Stunde)');
  assert.ok(evangelisationLevel(a) >= 0);
}
console.log('Evangelisation-Tests bestanden.');

// Gottesdienstbesuch: sonntagvormittags kommen Ehrenamtliche ohne Schicht mit 90 % – wer Dienst hat, nicht als Besucher
{
  const kommt = gemeinde(), kommtNicht = gemeinde();
  stelleSetzen(kommt.z, kommt.aus(), kommt.termin('veranstaltung').key, 'musik0', kommt.ea[0].id);
  bis(kommt.z, kommt.aus, SO + 7 * 60 + 5, () => 0.5);
  bis(kommtNicht.z, kommtNicht.aus, SO + 7 * 60 + 5, () => 0.95);
  const gaeste = g => (g.z.laeufe.find(L => L.art === 'gottesdienst') || { gaeste: [] }).gaeste || [];
  const ids = gaeste(kommt).map(x => x.id);
  assert.ok(!ids.includes(kommt.ea[0].id), 'Musiker kommt nicht als Besucher');
  assert.ok(ids.includes(kommt.ea[1].id) && ids.includes(kommt.ea[2].id));
  assert.ok(!gaeste(kommtNicht).some(x => kommtNicht.ea.some(p => p.id === x.id)));
  // Sie zahlen Kollekte wie alle anderen (Sitzplatz)
  assert.ok(gaeste(kommt).filter(x => kommt.ea.some(p => p.id === x.id)).every(x => x.sitz));
  bis(kommt.z, kommt.aus, SO + 14 * 60, () => 0.5);
  // Abends wäre kein Besuch: nur sonntagvormittags
  const abends = gemeinde();
  terminEinstellen(abends.z, abends.gd(), 0, 6, 'abend');
  bis(abends.z, abends.aus, SO + 16 * 60 + 5, () => 0.1);
  assert.ok(!((abends.z.laeufe.find(L => L.art === 'gottesdienst') || {}).gaeste || []).some(x => abends.ea.some(p => p.id === x.id)));
}
console.log('Gottesdienstbesuch-Tests bestanden.');

// Ehrenamtliche lassen sich im Schichtbetrieb nicht mehr in Räume ziehen; der Pastor schon
{
  const { z } = gemeinde();
  const s = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0.5);
  s.tempoSetzen(1); s.tick(0.25);
  assert.ok(s.karte().personen.every(p => p.art !== 'ehrenamt' || p.daheim), 'ohne Schicht: auf dem Heimweg oder schon weg');
  const eaId = z.personen.find(p => p.daten && p.daten.art === 'ehrenamt').id;
  assert.equal(s.personVersetzen(eaId, G.x + 5, G.y + 5), false);
  assert.ok(s.personVersetzen('pastor', G.x + 6, G.y + 5));
  assert.equal(s.lage().schichtbetrieb, true);
  assert.ok(s.dienstplan().termine.length > 0);
  // Befehl über die Schalterwand
  const t = s.dienstplan().termine.find(x => x.art === 'veranstaltung');
  assert.equal(s.stelleSetzen(t.key, 'musik0', eaId), 'ok');
  assert.equal(s.dienstplan().termine.find(x => x.key === t.key).stellen[0].person.id, eaId);
}
console.log('Schalterwand-Tests bestanden.');

// Wochen später: der Plan gilt jede Woche gleich
{
  const { z, aus, gd, ea, termin } = gemeinde();
  stelleSetzen(z, aus(), termin('veranstaltung').key, 'musik0', ea[0].id);
  bis(z, aus, WOCHE_MIN + SO + 10 * 60);
  assert.ok(imRaum(z, aus, ea[0], gd()), 'auch in Woche 2 da');
}
console.log('Alle Dienstplan-Tests bestanden.');
