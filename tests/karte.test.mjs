// Prüft die Spiellogik. Starten mit: node tests/karte.test.mjs
import assert from 'node:assert';
import { RAUMTYPEN } from '../src/inhalte/raumtypen.js';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { neuerZustand, wandRechteck, abriss, tuerUmschalten, erkenneRaeume, passtGroesse, pruefeRaum, typZuweisen, raumTypVon, aufGrundstueck } from '../src/kern/karte.js';

const T = RAUMTYPEN[0];
let z = neuerZustand();
wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8);                       // innen 15 × 5
let r = erkenneRaeume(z).raeume;
assert.equal(r.length, 1); assert.equal(r[0].zellen.length, 75);
assert.deepEqual(pruefeRaum(z, r[0], T), ['tuer']);
tuerUmschalten(z, G.x + 2, G.y + 5);
r = erkenneRaeume(z).raeume;
assert.deepEqual(pruefeRaum(z, r[0], T), []);
typZuweisen(z, r[0], 'gottesdienst');
assert.equal(raumTypVon(z, r[0]).id, 'gottesdienst');
wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8);                       // erneut bauen: Tür und Funktion bleiben
r = erkenneRaeume(z).raeume;
assert.equal(raumTypVon(z, r[0]).id, 'gottesdienst');

const z2 = neuerZustand(); wandRechteck(z2, G.x + 2, G.y + 2, G.x + 17, G.y + 8); tuerUmschalten(z2, G.x + 2, G.y + 5);
assert.deepEqual(pruefeRaum(z2, erkenneRaeume(z2).raeume[0], T), ['groesse']); // 14 × 5 zu klein

const z3 = neuerZustand(); wandRechteck(z3, G.x + 2, G.y + 2, G.x + 8, G.y + 18);
assert.ok(passtGroesse(z3, erkenneRaeume(z3).raeume[0].zellen, 5, 15));       // hochkant geht auch

abriss(z, 0, 0, 63, 41);
assert.equal(erkenneRaeume(z).raeume.length, 0); assert.deepEqual(z.raumTyp, {});
// Außerhalb des Grundstücks wird nichts gebaut
const z4 = neuerZustand(); wandRechteck(z4, 0, 0, 3, 3);
assert.ok(z4.zellen.every((t, i) => !t || aufGrundstueck(i % z4.w, (i / z4.w) | 0)));
assert.equal(tuerUmschalten(z4, 0, 0), false);
console.log('Alle Tests bestanden.');

// Mitarbeiter
import { personenAnlegen, versetzen, verfuegbarkeit, personenPruefen, startPlatz } from '../src/kern/personen.js';
{
  const z5 = neuerZustand(); personenAnlegen(z5);
  const auswerten = () => { const { raeume, gruppe } = erkenneRaeume(z5); for (const r of raeume) { r.typ = raumTypVon(z5, r); r.probleme = pruefeRaum(z5, r, r.typ); } return { liste: raeume, gruppe }; };
  assert.deepEqual(verfuegbarkeit(z5, auswerten()).hauptamt, { frei: 1, gesamt: 1 });
  assert.deepEqual(verfuegbarkeit(z5, auswerten()).ehrenamt, { frei: 0, gesamt: 0 });
  wandRechteck(z5, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z5, G.x + 2, G.y + 5);
  typZuweisen(z5, erkenneRaeume(z5).raeume[0], 'gottesdienst');
  const pastor = z5.personen[0];
  assert.ok(versetzen(z5, pastor, G.x + 5, G.y + 5));
  assert.deepEqual(verfuegbarkeit(z5, auswerten()).hauptamt, { frei: 0, gesamt: 1 });
  assert.equal(versetzen(z5, pastor, G.x + 2, G.y + 2), false);             // nicht in eine Wand
  assert.equal(versetzen(z5, pastor, 0, 0), false);                         // nicht außerhalb des Grundstücks
  wandRechteck(z5, G.x + 5, G.y + 5, G.x + 6, G.y + 6); personenPruefen(z5); // Wand über die Figur gebaut
  assert.deepEqual({ x: pastor.x, y: pastor.y }, startPlatz());
}
console.log('Mitarbeiter-Tests bestanden.');

// Möbel und Wände
import { moebelSetzen, moebelKaufen, moebelAbreissen } from '../src/kern/moebel.js';
import { weg } from '../src/kern/wege.js';
import { wandKonflikte, wandBauen, wandAnpassen } from '../src/kern/bauen.js';
import { namenZiehen, neueBesucherZahl } from '../src/kern/besucher.js';
import { NAMEN_WORTSPIEL } from '../src/inhalte/namen.js';
import { sonntagDerWoche } from '../src/kern/kalender.js';
{
  const z6 = neuerZustand(); personenAnlegen(z6);
  wandRechteck(z6, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z6, G.x + 2, G.y + 5);
  assert.equal(moebelSetzen(z6, 'stuhl', G.x + 8, G.y + 4, G.x + 10, G.y + 4), 3);
  moebelSetzen(z6, 'stuhl', 0, 0, 2, 2);                            // außerhalb: nichts
  assert.equal(z6.moebel.length, 3);
  assert.equal(sonntagDerWoche(0).name, '1. Advent'); assert.equal(sonntagDerWoche(1).name, '2. Advent');
  const pfad = weg(z6, { x: G.tor.x, y: G.y + G.h + 1 }, { x: G.x + 8, y: G.y + 5 }, (x, y) => z6.moebel.some(m => m.x === x && m.y === y));
  assert.ok(pfad.some(p => p.x === G.x + 2 && p.y === G.y + 5));    // läuft durch die Tür
  const raus = pfad.findIndex(p => aufGrundstueck(p.x, p.y));        // betritt das Grundstück nur durchs Tor
  assert.ok(pfad[raus].y === G.y + G.h - 1 && pfad[raus].x >= G.tor.x && pfad[raus].x < G.tor.x + G.tor.breite);
  // Wand über einen Stuhl wird nicht gebaut
  assert.equal(wandKonflikte(z6, G.x + 7, G.y + 3, G.x + 12, G.y + 4).length, 3);
  assert.equal(wandBauen(z6, G.x + 7, G.y + 3, G.x + 12, G.y + 4), false);
  assert.ok(wandBauen(z6, G.x + 25, G.y + 10, G.x + 30, G.y + 15));
}
// Gemeinsame Wand: direkt neben einen Raum gebaut → teilt sich die Wand
{
  const z = neuerZustand();
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8);
  assert.deepEqual(wandAnpassen(z, G.x + 19, G.y + 2, G.x + 25, G.y + 8), [G.x + 18, G.y + 2, G.x + 25, G.y + 8]);
  assert.deepEqual(wandAnpassen(z, G.x + 25, G.y + 8, G.x + 19, G.y + 2), [G.x + 18, G.y + 2, G.x + 25, G.y + 8]);   // andere Zieh-Richtung
  wandBauen(z, G.x + 19, G.y + 2, G.x + 25, G.y + 8);
  assert.equal(z.zellen[(G.y + 5) * z.w + G.x + 19], 0);              // keine zweite Wand
  assert.equal(erkenneRaeume(z).raeume.length, 2);
  assert.equal(erkenneRaeume(z).raeume.find(r => r.zellen.includes((G.y + 5) * z.w + G.x + 19)).zellen.length, 6 * 5);
  // auch oben/unten, und auch wenn der neue Raum länger ist
  assert.deepEqual(wandAnpassen(z, G.x + 2, G.y + 9, G.x + 30, G.y + 14), [G.x + 2, G.y + 8, G.x + 30, G.y + 14]);
  // mit Abstand: keine Änderung
  assert.deepEqual(wandAnpassen(z, G.x + 20, G.y + 2, G.x + 26, G.y + 8), [G.x + 20, G.y + 2, G.x + 26, G.y + 8]);
}
{
  const n = namenZiehen(300);
  assert.ok(n.every(x => x.vorname && x.nachname && x.voll === `${x.vorname} ${x.nachname}`));
  const wortspiel = n.filter(x => NAMEN_WORTSPIEL.includes(x.voll)).length / n.length;
  assert.ok(wortspiel > 0.2 && wortspiel < 0.47, 'Mischung etwa ein Drittel Wortspiel');
  assert.equal(new Set(namenZiehen(10).map(x => x.voll)).size, 10);
}
console.log('Möbel- und Wand-Tests bestanden.');

// Zeit
import { zeitpunkt, tageBisSonntag, slotBeginn, startMinuten, spielMinuten, TAG_MIN } from '../src/kern/zeit.js';
{
  assert.deepEqual([zeitpunkt(startMinuten()).tag, zeitpunkt(startMinuten()).stunde], [0, 8]);  // Montag 8:00
  assert.equal(tageBisSonntag(1 * TAG_MIN + 14 * 60), 4);           // Dienstag 14:00 → in 4 Tagen
  assert.equal(tageBisSonntag(5 * TAG_MIN + 10 * 60), 0);           // Samstag → morgen
  assert.equal(tageBisSonntag(6 * TAG_MIN + 9 * 60), null);         // Sonntag → heute
  assert.equal(slotBeginn({ tag: 6, slot: 'vormittag' }, 0), 6 * TAG_MIN + 600);
  assert.equal(slotBeginn({ tag: 2, slot: 'abend' }, 1), 7 * TAG_MIN + 2 * TAG_MIN + 19 * 60);
  assert.equal(spielMinuten(12, 1), 60);                             // 12 Sekunden = 1 Spielstunde (seit 25.11.)
  assert.equal(spielMinuten(12, 5), 300);
  assert.equal(spielMinuten(1, 1), 5);                               // 1 Sekunde = 5 Spielminuten
}
console.log('Zeit-Tests bestanden.');

// Gottesdienst und Kirchkaffee in Echtzeit
import { neuesSpiel, ausRundenSpielstand } from '../src/kern/spiel.js';
import { zeitVorruecken, veranstaltungEinstellen, terminEinstellen, prognose, kirchkaffeeOffen, gottesdienstBereit } from '../src/kern/ablauf.js';
import { personHinzufuegen } from '../src/kern/personen.js';
{
  const SONNTAG_10 = 6 * TAG_MIN + 600;
  const aufbau = () => {
    const z = neuesSpiel(() => 0.9);
    z.ortRuhig = true;
    for (const b of z.besucher) b.kaffeeWert = 0;                     // niemand will Kaffee (eigene Tests: kirchkaffee.test.mjs)                                                // ohne Passanten und Seelsorge (eigene Tests weiter unten)
    const aus = () => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
    const raumBei = (x, y) => { const a = aus(); return a.liste[a.gruppe[x + y * z.w]]; };
    wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
    wandRechteck(z, G.x + 18, G.y + 2, G.x + 24, G.y + 8); tuerUmschalten(z, G.x + 18, G.y + 5);
    typZuweisen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst');
    typZuweisen(z, raumBei(G.x + 20, G.y + 5), 'kirchkaffee');
    veranstaltungEinstellen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst');
    for (let i = 0; i < 3; i++) moebelSetzen(z, 'stuhl', G.x + 6 + i, G.y + 4, G.x + 6 + i, G.y + 4);
    return { z, aus };
  };
  // Ohne Mitarbeiter: kein Gottesdienst, jeder Stammgast −5
  {
    const { z, aus } = aufbau();
    assert.equal(z.besucher.length, 4); assert.ok(z.besucher.every(b => b.zufriedenheit === 60));
    zeitVorruecken(z, aus(), SONNTAG_10 + 1 - z.minuten, () => 0);
    assert.ok(z.besucher.every(b => b.zufriedenheit === 55));
    assert.equal(z.letzterGottesdienst.ausgefallen, true); assert.equal(z.bekanntheit, 0);
    zeitVorruecken(z, aus(), 7 * TAG_MIN, () => 0);                   // nächste Woche wieder
    assert.ok(z.besucher.every(b => b.zufriedenheit === 50));
  }
  // Mit Pastor: 4 kommen, 3 Stühle → 1 muss heim
  {
    const { z, aus } = aufbau();
    versetzen(z, z.personen[0], G.x + 4, G.y + 5);
    assert.equal(gottesdienstBereit(z, aus()).length, 1);
    assert.deepEqual(prognose(z, aus()).plaetze, 3);
    assert.ok(Math.abs(prognose(z, aus()).erwartet - 2.4) < 1e-9);    // 4 × 60 %
    assert.ok(Math.abs(prognose(z, aus()).geld - 4.8) < 1e-9);       // Sonntagvormittag: Kollekte × 2
    zeitVorruecken(z, aus(), SONNTAG_10 - 180 - z.minuten, () => 0);  // Anreise
    assert.equal(z.laeufe[0].phase, 'anreise'); assert.equal(z.laeufe[0].gaeste.length, 4);
    assert.equal(z.laeufe[0].gaeste.filter(g => !g.sitz).length, 1);
    zeitVorruecken(z, aus(), 180 + 60, () => 0);                       // Gottesdienst vorbei
    assert.equal(z.konto, 50 + 6); assert.equal(z.bekanntheit, 0.6);
    assert.deepEqual(z.bekanntheitLog.map(e => [e.quelle, e.wert]), [['gottesdienst', 0.6]]);   // fürs Bekanntheit-Fenster gemerkt
    zeitVorruecken(z, aus(), 120, () => 0);                           // Kirchkaffee vorbei (2 Stunden)
    const heim = z.besucher.find(b => b.id === z.laeufe[0].gaeste.find(g => !g.sitz).id);
    assert.equal(heim.zufriedenheit, 45);
    assert.equal(z.besucher.filter(b => b.zufriedenheit === 70).length, 3);   // +5 Platz, +5 Gottesdienst
    assert.deepEqual(z.letzterGottesdienst, { woche: 0, platz: 0, ausgefallen: false, besucher: 3, heim: 1 });
    zeitVorruecken(z, aus(), 121, () => 0);                           // Heimweg (2 Stunden) vorbei
    assert.equal(z.laeufe.length, 0);
  }
  // Neue Besucher über die Bekanntheit, neue Ehrenamtliche ab 3 Besuchen
  {
    assert.equal(neueBesucherZahl(15, () => 0.4), 2); assert.equal(neueBesucherZahl(15, () => 0.6), 1);
    assert.equal(neueBesucherZahl(0, () => 0), 0);
    const { z, aus } = aufbau();
    versetzen(z, z.personen[0], G.x + 4, G.y + 5);
    z.bekanntheit = 20; z.besucher.forEach(b => { b.besuche = 2; });
    zeitVorruecken(z, aus(), SONNTAG_10 + 181 - z.minuten, () => 0);
    assert.equal(z.laeufe[0].gaeste.length, 6);                           // 4 bekannte + 2 neue
    assert.equal(z.laeufe[0].neueEhrenamtliche.length, 3);                 // die 3 mit Sitzplatz und 3. Besuch
    assert.equal(z.personen.filter(p => (p.daten || {}).art === 'ehrenamt').length, 3);
    assert.equal(z.besucher.length, 3);
  }
  // Wochenplan: Mittwochabend
  {
    const { z, aus } = aufbau();
    versetzen(z, z.personen[0], G.x + 4, G.y + 5);
    const a = aus(), raum = a.liste[a.gruppe[G.x + 5 + (G.y + 5) * z.w]];
    assert.equal(terminEinstellen(z, raum, 0, 2, 'abend'), 'ok');
    zeitVorruecken(z, aus(), 2 * TAG_MIN + 19 * 60 + 1 - z.minuten, () => 0);
    assert.equal(z.laeufe[0].phase, 'gottesdienst');
    zeitVorruecken(z, aus(), 4 * TAG_MIN, () => 0);                   // Sonntag: nichts Neues
    assert.equal(z.laeufe.length, 0); assert.equal(z.termineErledigt.length, 1);
  }
  // Spielstand aus 0.1.1 übernehmen
  {
    const alt = { zellen: new Array(64 * 42).fill(0), konto: 77, personen: [], moebel: [{ art: 'stuhl', x: 1, y: 1 }], stamm: [1], woche: 5 };
    const z = ausRundenSpielstand(alt);
    assert.equal(z.konto, 77); assert.equal(z.moebel.length, 1); assert.equal(z.besucher.length, 4);
    assert.equal(z.minuten, startMinuten()); assert.equal(z.stamm, undefined);
  }
}
console.log('Gottesdienst- und Kirchkaffee-Tests bestanden.');
// Versionsnummer in version.js und version.json müssen übereinstimmen (sonst lädt die App endlos neu)
import { VERSION } from '../src/version.js';
import { readFileSync } from 'node:fs';
assert.equal(JSON.parse(readFileSync(new URL('../version.json', import.meta.url))).version, VERSION);
// Changelog im Spiel: Abschnitt der Version wird herausgeschnitten, nächste Version gehört nicht dazu
import { abschnittLesen } from '../src/oberflaeche/changelog.js';
{
  const text = '# Changelog\n\n## 0.1.3\n\n**Neu**\n- A\n- B\n\n**Geändert**\n- C\n\n## 0.1.2\n\n**Alt**\n- D\n';
  assert.deepEqual(abschnittLesen(text, '0.1.3'), [{ titel: 'Neu', punkte: ['A', 'B'] }, { titel: 'Geändert', punkte: ['C'] }]);
  assert.equal(abschnittLesen(text, '9.9.9'), null);
  assert.ok(abschnittLesen(readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8'), '0.1.2').length > 0);
}
console.log('Versions-Test bestanden.');

// Kirchenjahr-Rad
import { kirchenjahrStand } from '../src/kern/kalender.js';
{
  const a = kirchenjahrStand(0);
  assert.equal(a.fortschritt, 0); assert.equal(a.aktuell.id, 'advent');
  assert.equal(kirchenjahrStand(4).aktuell.id, 'weihnachten');     // 27.12.
  assert.equal(kirchenjahrStand(17).aktuell.id, 'ostern');         // Ostersonntag 2027
  assert.equal(kirchenjahrStand(15).aktuell.id, 'passion');        // Judika
  assert.equal(kirchenjahrStand(51).aktuell.id, 'trinitatis');     // Ewigkeitssonntag
  assert.equal(kirchenjahrStand(52).fortschritt, 0);               // neues Kirchenjahr
  for (const z of a.zeiten) assert.ok(z.von < z.bis);
  assert.equal(a.zeiten.at(-1).bis, 1);
}
console.log('Kirchenjahr-Tests bestanden.');

// Geglättete Wege
import { glaetten } from '../src/kern/wege.js';
{
  const z11 = neuerZustand();
  const p = weg(z11, { x: G.x + 2, y: G.y + 2 }, { x: G.x + 12, y: G.y + 9 });
  assert.equal(glaetten(z11, p).length, 2);                                  // freie Wiese: direkt schräg
  wandRechteck(z11, G.x + 2, G.y + 4, G.x + 18, G.y + 10); tuerUmschalten(z11, G.x + 10, G.y + 4);
  const q = weg(z11, { x: G.x + 2, y: G.y + 2 }, { x: G.x + 10, y: G.y + 8 });
  const g = glaetten(z11, q);
  assert.ok(g.some(pt => pt.x === G.x + 10 && pt.y <= G.y + 4) || g.length > 2);   // muss um die Wand / durch die Tür
  // kein Teilstück schneidet eine Wand
  for (let i = 0; i < g.length - 1; i++) for (let s = 0; s <= 20; s++) {
    const x = Math.round(g[i].x + (g[i + 1].x - g[i].x) * s / 20), y = Math.round(g[i].y + (g[i + 1].y - g[i].y) * s / 20);
    assert.notEqual(z11.zellen[x + y * z11.w], 1);
  }
  // von der Straße aufs Grundstück nur durchs Tor
  const r = glaetten(z11, weg(z11, { x: G.tor.x, y: G.y + G.h + 1 }, { x: G.x + 3, y: G.y + 3 }));
  const rein = r.findIndex(pt => aufGrundstueck(pt.x, pt.y));
  assert.ok(r[rein].x >= G.tor.x && r[rein].x < G.tor.x + G.tor.breite);
}
console.log('Weg-Tests bestanden.');

// Schalterwand (kern/spiel.js): Befehle und Abfragen, wie die Oberfläche sie benutzt
import { spielStarten } from '../src/kern/spiel.js';
{
  const spiel = spielStarten(null, () => 0.5);   // 0.5: alle kommen (60 %)
  assert.equal(spiel.lage().konto, 50); assert.equal(spiel.lage().tag, 0); assert.equal(spiel.lage().stunde, 8);
  assert.deepEqual(spiel.lage().status, { fehlt: 'raum' });
  // Bauen über Befehle
  assert.equal(spiel.wandBauen(G.x + 2, G.y + 2, G.x + 18, G.y + 8), 'ok');
  spiel.tuerUmschalten(G.x + 2, G.y + 5);
  const nr = spiel.raumNrBei(G.x + 5, G.y + 5);
  spiel.raumTypSetzen(nr, 'gottesdienst');
  assert.equal(spiel.veranstaltungsraumBei(G.x + 5, G.y + 5), nr);
  assert.deepEqual(spiel.lage().status, { fehlt: 'veranstaltung' });
  assert.equal(spiel.veranstaltungSetzen(nr, 0, 'gottesdienst'), 'ok');
  assert.deepEqual(spiel.lage().status, { fehlt: 'leitung', platz: 0 });
  assert.equal(spiel.raumInfo(nr).bedingungen.leitung, false);
  assert.ok(spiel.personVersetzen('pastor', G.x + 4, G.y + 5));
  assert.equal(spiel.raumInfo(nr).bedingungen.leitung, true);
  assert.deepEqual(spiel.lage().status, {});
  // Möbel kaufen: Antwort-Codes
  assert.equal(spiel.moebelKaufen('stuhl', G.x + 7, G.y + 4), 'ok');
  assert.equal(spiel.moebelKaufen('stuhl', G.x + 7, G.y + 4), 'belegt');
  assert.equal(spiel.moebelKaufen('kaffeemaschine', G.x + 8, G.y + 4), 'geld');   // 45 € reichen nicht
  assert.equal(spiel.lage().konto, 45);
  // Rückgängig gibt das Geld zurück
  assert.ok(spiel.rueckgaengig()); assert.equal(spiel.lage().konto, 50); assert.equal(spiel.moebelBei(G.x + 7, G.y + 4), null);
  // Wand-Vorschau rückt an bestehende Wand heran
  assert.equal(spiel.wandVorschau(G.x + 19, G.y + 2, G.x + 25, G.y + 8).x0, G.x + 18);
  // Abfragen liefern Kopien: Ändern an der Antwort ändert das Spiel nicht
  const l = spiel.lage(); l.konto = 9999; l.personen.length = 0;
  assert.equal(spiel.lage().konto, 50); assert.equal(spiel.lage().personen.length, 1);
  const k = spiel.karte(); k.zellen.fill(0);
  assert.equal(spiel.zelle(G.x + 2, G.y + 2), 'wand');
  // Plan und Tempo werden geprüft
  const zeit = () => { const p = spiel.raumInfo(nr).programm[0]; return { tag: p.tag, slot: p.slot }; };
  assert.equal(spiel.terminSetzen(nr, 0, 9, 'nachts'), 'zeit'); assert.deepEqual(zeit(), { tag: 6, slot: 'vormittag' });
  assert.equal(spiel.terminSetzen(nr, 0, 2, 'abend'), 'ok'); assert.deepEqual(zeit(), { tag: 2, slot: 'abend' });
  // Veranstaltung 2: ohne Kanzel und Altar gesperrt
  assert.equal(spiel.raumInfo(nr).programm[1].nutzbar, false);
  assert.equal(spiel.veranstaltungSetzen(nr, 1, 'gottesdienst'), 'gesperrt');
  spiel.tempoSetzen(7); assert.equal(spiel.lage().tempo, 1);
  // Tick-System: Bau-Modus und Pause halten die Zeit an
  spiel.bauModus(true); assert.equal(spiel.tick(0.2), false); assert.equal(spiel.lage().minute, 0);
  spiel.bauModus(false); assert.equal(spiel.tick(0.24), true); assert.equal(spiel.lage().minute, 1);   // 0,24 s = 1,2 Spielminuten
  spiel.tempoSetzen(25); assert.equal(spiel.lage().tempo, 25); spiel.tempoSetzen(10); assert.equal(spiel.lage().tempo, 10); spiel.tempoSetzen(1);
  spiel.tempoSetzen(0); assert.equal(spiel.tick(1), false);
  for (let i = 0; i < 5; i++) assert.equal(spiel.moebelKaufen('stuhl', G.x + 7 + i, G.y + 4), 'ok');
  // Bis Mittwochabend laufen lassen: Besucher sind unterwegs, Kärtchen hat Bedürfnisse
  spiel.tempoSetzen(5);
  for (let i = 0; i < 2000 && spiel.lage().status.phase !== 'gottesdienst'; i++) spiel.tick(0.25);
  assert.equal(spiel.lage().tag, 2); assert.equal(spiel.lage().status.phase, 'gottesdienst');
  const b = spiel.karte().besucher[0];
  assert.ok(b && typeof b.x === 'number');
  const info = spiel.besucherInfo(b.id);
  assert.equal(info.beduerfnisse.sitzplatz, true); assert.equal(info.beduerfnisse.gottesdienst, true);
  assert.equal(info.beduerfnisse.kaffee, null);                                 // ob er Kaffee will, entscheidet sich nach dem Gottesdienst
  // Speichern und wieder laden
  const kopie = spielStarten(spiel.speicherText());
  assert.equal(kopie.lage().tag, 2); assert.equal(kopie.zelle(G.x + 2, G.y + 2), 'wand');
  spiel.zuruecksetzen(); assert.equal(spiel.zelle(G.x + 2, G.y + 2), 'leer'); assert.equal(spiel.lage().stunde, 8);
}
console.log('Schnittstellen-Tests bestanden.');

// Hilfe: jedes Thema hat eine eindeutige id, einen Titel und Inhalt; Zahlen aus den Spielwerten sind eingesetzt
import { HILFE } from '../src/inhalte/hilfe.js';
{
  const ids = HILFE.themen.map(t => t.id);
  assert.equal(new Set(ids).size, ids.length, 'Hilfe: doppelte Themen-id');
  for (const t of HILFE.themen) {
    assert.ok(t.titel && t.inhalt.length > 0, `Hilfe-Thema ${t.id} ist leer`);
    for (const b of t.inhalt) assert.ok(typeof b === 'string' || (Array.isArray(b.punkte) && b.punkte.length), `Hilfe-Thema ${t.id}: unbekannter Eintrag`);
  }
  const raeume = HILFE.themen.find(t => t.id === 'raeume').inhalt[1].punkte[0];
  assert.ok(raeume.includes(RAUMTYPEN[0].minGroesse.join(' × ')), 'Hilfe: Raumgröße kommt aus den Spielwerten');
}
console.log('Hilfe-Test bestanden.');

// Trennung: Oberfläche und Ansicht reden nur über kern/spiel.js mit der Spiellogik
import { readdirSync } from 'node:fs';
{
  for (const ordner of ['oberflaeche', 'ansicht']) {
    const pfad = new URL(`../src/${ordner}/`, import.meta.url);
    for (const datei of readdirSync(pfad)) {
      const text = readFileSync(new URL(datei, pfad), 'utf8');
      for (const [, ziel] of text.matchAll(/from\s+'([^']+)'/g)) {
        if (ziel.includes('/kern/')) assert.equal(ziel, '../kern/spiel.js', `${ordner}/${datei} greift an der Schalterwand vorbei auf ${ziel} zu`);
        // aus den Inhaltsdateien nur Texte, Farben und die Stadt – keine Spielzahlen (hilfe.js: Anleitungstexte, nur zum Lesen)
        if (ziel.includes('/inhalte/')) assert.ok(['texte.js', 'umgebung.js', 'mitarbeiter.js', 'veranstaltungen.js', 'hilfe.js'].some(n => ziel.endsWith('/' + n)), `${ordner}/${datei} liest Spielzahlen aus ${ziel}`);
      }
    }
  }
}
console.log('Trennungs-Test bestanden.');
