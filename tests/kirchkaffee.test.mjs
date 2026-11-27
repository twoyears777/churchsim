// Prüft das Kirchkaffee (Spielprinzip 25.11.2026): Öffnungszeiten, Schlange und Bedienung Schritt für Schritt,
// Kaffee-Einkauf im Laden, Passanten, Kaffee-Wert und Seelsorge während des Kirchkaffees.
// Starten mit: node tests/kirchkaffee.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G, LADEN } from '../src/inhalte/umgebung.js';
import { PREIS_TASSE, EINKAUF, LADEN_MINUTEN, MAX_SCHICHTEN, STEHEN_PASSANT, SITZEN } from '../src/inhalte/kirchkaffee.js';
import { AENDERUNG } from '../src/inhalte/besucher.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel, spielStarten } from './hilfen/ohne-erster.mjs';   // ohne ersten Gottesdienst (26.11.)
import { zeitVorruecken, veranstaltungEinstellen, seelsorgeGesperrt, prognose } from '../src/kern/ablauf.js';
import { moebelSetzen, moebelKaufen } from '../src/kern/moebel.js';
import { versetzen, personHinzufuegen } from '../src/kern/personen.js';
import { kaffeeVorliebe } from '../src/kern/besucher.js';
import { schichtHinzufuegen, schichtEntfernen, schichtenVon, offenBei, naechsteSchicht, passantKommt, kirchkaffeeOffen, amTisch, trinkgeldFuer, sitzplaetzeVon, kaffeeKundenPositionen, kaffeeZahlen } from '../src/kern/kirchkaffee.js';
import { TAG_MIN } from '../src/kern/zeit.js';
import { LAUFTEMPO, DAUER } from '../src/inhalte/zeit.js';

const SO = 6 * TAG_MIN, MI = 2 * TAG_MIN;
const saat = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
// Gottesdienstraum (Pastor, 3 Stühle) und Kirchkaffee daneben; theken: wie viele Stationen (Maschine + Theke + Ehrenamtlicher)
function gemeinde({ stationen = 1, stuehle = 3 } = {}) {
  const z = neuesSpiel(() => 0.9);
  z.ortRuhig = true;                                                  // ohne Passanten und Seelsorge, wenn nicht gewollt
  const aus = () => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
  const raumBei = (x, y) => { const a = aus(); return a.liste[a.gruppe[x + y * z.w]]; };
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 10); tuerUmschalten(z, G.x + 2, G.y + 5);
  wandRechteck(z, G.x + 18, G.y + 2, G.x + 26, G.y + 10); tuerUmschalten(z, G.x + 18, G.y + 5);
  typZuweisen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst'); typZuweisen(z, raumBei(G.x + 20, G.y + 5), 'kirchkaffee');
  veranstaltungEinstellen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst');
  for (let i = 0; i < stuehle; i++) moebelSetzen(z, 'stuhl', G.x + 6 + (i % 10), G.y + 4 + Math.floor(i / 10), G.x + 6 + (i % 10), G.y + 4 + Math.floor(i / 10));
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  z.konto = 1000;
  const eas = [];
  for (let i = 0; i < stationen; i++) {
    const y = G.y + 3 + i * 4;
    assert.equal(moebelKaufen(z, 'kaffeemaschine', G.x + 20, y), 'ok');
    assert.equal(moebelKaufen(z, 'theke', G.x + 22, y), 'ok');
    const ea = personHinzufuegen(z, { name: `Helfer ${i + 1}`, kuerzel: 'H', art: 'ehrenamt' });
    versetzen(z, ea, G.x + 25, y + 1);
    eas.push(ea);
  }
  for (const b of z.besucher) b.kaffeeWert = 0;
  const kk = () => raumBei(G.x + 20, G.y + 5);
  const maschinen = () => z.moebel.filter(m => m.art === 'kaffeemaschine');
  return { z, aus, kk, eas, maschinen };
}
const bis = (z, aus, minute, zufall = () => 0) => { while (z.minuten < minute) zeitVorruecken(z, aus(), Math.min(1, minute - z.minuten), zufall); };
const besucherMitKaffee = (z, n, wert = 1) => {
  z.besucher = Array.from({ length: n }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X', level: 5, zufriedenheit: 100, kaffeeWert: wert, besuche: 0, lobpreis: 0.5 }));   // (Lobpreis-Vorliebe 50 %: Musik ändert hier nichts; eigene Tests in veranstaltungen.test.mjs)
};

// Kaffee-Wert: fest, 0–1, ersetzt das Ja/Nein
{
  const p = { id: 'b9', voll: 'Erna Muster', kaffee: true };
  assert.equal(kaffeeVorliebe(p), kaffeeVorliebe({ id: 'b9', voll: 'Erna Muster', kaffee: false }));   // altes Ja/Nein zählt nicht mehr
  assert.ok(kaffeeVorliebe(p) >= 0 && kaffeeVorliebe(p) <= 1);
  assert.equal(kaffeeVorliebe({ ...p, kaffeeWert: 0.3 }), 0.3);
  const z = neuesSpiel(() => 0.5);
  assert.ok(z.besucher.every(b => !('kaffee' in b)));
}
console.log('Kaffee-Wert-Tests bestanden.');

// Öffnungszeiten: höchstens 3, nicht doppelt, Slot geht bis zum nächsten (Abend bis 23 Uhr)
{
  const { z, kk } = gemeinde();
  assert.equal(schichtHinzufuegen(z, kk(), 2, 'nachmittag'), 'ok');
  assert.equal(schichtHinzufuegen(z, kk(), 2, 'nachmittag'), 'belegt');
  assert.equal(schichtHinzufuegen(z, kk(), 9, 'nachmittag'), 'zeit');
  assert.equal(schichtHinzufuegen(z, kk(), 4, 'abend'), 'ok');
  assert.equal(schichtHinzufuegen(z, kk(), 0, 'vormittag'), 'ok');
  assert.equal(schichtHinzufuegen(z, kk(), 1, 'vormittag'), 'voll');
  assert.equal(schichtenVon(z, kk()).length, MAX_SCHICHTEN);
  assert.deepEqual(schichtenVon(z, kk())[0], { tag: 0, slot: 'vormittag' });   // nach Zeit sortiert
  assert.equal(offenBei(z, kk(), MI + 15 * 60), true); assert.equal(offenBei(z, kk(), MI + 19 * 60 - 1), true);
  assert.equal(offenBei(z, kk(), MI + 19 * 60), false); assert.equal(offenBei(z, kk(), MI + 14 * 60 + 59), false);
  assert.equal(offenBei(z, kk(), 4 * TAG_MIN + 22 * 60 + 59), true); assert.equal(offenBei(z, kk(), 4 * TAG_MIN + 23 * 60), false);
  assert.equal(offenBei(z, kk(), 10 * 60 + 30), true);    // Montag vormittags 10–15 Uhr
  assert.equal(naechsteSchicht(z, kk(), 9 * 60), 10 * 60);
  assert.equal(schichtEntfernen(z, kk(), 0), 'ok'); assert.equal(schichtenVon(z, kk()).length, 2);
}
console.log('Öffnungszeiten-Tests bestanden.');

// Einkauf: Kirchkaffee zu, Maschine leer → der Ehrenamtliche geht in den Laden, zahlt 0,50 € pro Tasse, trägt höchstens 10
{
  const { z, aus, eas, maschinen } = gemeinde();
  const m = maschinen()[0], konto = z.konto;
  zeitVorruecken(z, aus(), 1, () => 0);
  const a = z.kaffee.ma[eas[0].id].aufgabe;
  assert.deepEqual([a.art, a.phase, a.menge, a.preis], ['einkauf', 'hin', 10, 5]);
  assert.deepEqual(z.kaffee.ma[eas[0].id].bew.pfad.at(-1), LADEN.eingang);
  assert.equal(z.konto, konto);                                       // bezahlt wird erst im Laden
  for (let i = 0; i < 2000 && z.konto === konto; i++) zeitVorruecken(z, aus(), 1, () => 0);
  assert.equal(z.konto, konto - 5); assert.equal(m.fuellung, 0);
  assert.deepEqual(z.kaffee.zahlen.map(e => e.betrag), [-5]);          // „−5 €“ über dem Ehrenamtlichen
  for (let i = 0; i < 2000 && m.fuellung === 0; i++) zeitVorruecken(z, aus(), 1, () => 0);
  assert.equal(m.fuellung, 10);                                       // erst an der Maschine ist der Kaffee drin
  for (let i = 0; i < 5000 && m.fuellung < 30; i++) zeitVorruecken(z, aus(), 5, () => 0);
  assert.equal(m.fuellung, 30); assert.equal(z.konto, konto - 15);    // dreimal gelaufen
  zeitVorruecken(z, aus(), 600, () => 0);
  assert.equal(z.konto, konto - 15); assert.equal(z.kaffee.ma[eas[0].id].aufgabe, null);   // voll: geht nicht mehr
  // Nur so viel, wie fehlt
  m.fuellung = 27; zeitVorruecken(z, aus(), 1, () => 0);
  assert.deepEqual([z.kaffee.ma[eas[0].id].aufgabe.menge, z.kaffee.ma[eas[0].id].aufgabe.preis], [3, 1.5]);
}
// Zu wenig Geld: Meldung, er kauft nichts und geht auch nicht los
{
  const { z, aus, eas, maschinen } = gemeinde();
  z.konto = 2;
  zeitVorruecken(z, aus(), 1, () => 0);
  assert.equal(z.kaffee.ma[eas[0].id].aufgabe && z.kaffee.ma[eas[0].id].aufgabe.art, undefined);
  const s = spielStarten(JSON.stringify({ version: 3, zustand: z }), () => 0);
  assert.deepEqual(s.lage().meldung, { code: 'keinGeldKaffee', name: 'Helfer 1' });
  zeitVorruecken(z, aus(), 30, () => 0);
  assert.equal(z.konto, 2); assert.equal(maschinen()[0].fuellung, 0);
  z.konto = 100; zeitVorruecken(z, aus(), 60, () => 0);               // später nochmal versucht
  assert.equal(z.kaffee.ma[eas[0].id].aufgabe.art, 'einkauf');
}
console.log('Einkaufs-Tests bestanden.');

// Nach dem Gottesdienst: Schlange, Bedienung Schritt für Schritt, Geld erst bei der Übergabe
{
  const { z, aus, eas, maschinen } = gemeinde({ stuehle: 3 });
  besucherMitKaffee(z, 3);
  maschinen()[0].fuellung = 30;
  bis(z, aus, SO + 600 + 60);                                          // Gottesdienst vorbei
  const L = z.laeufe[0];
  assert.equal(L.phase, 'kirchkaffee');
  assert.equal(z.kaffee.kunden.length, 3);
  assert.deepEqual(z.kaffee.kunden.map(k => k.nr), [0, 1, 2]);
  const konto = z.konto, vorher = z.besucher.map(b => b.zufriedenheit);
  // Ablauf der Ehrenamtlichen-Aufgabe mitschreiben
  const schritte = [];
  for (let t = 0; t < 400 && z.kaffee.kunden.some(k => k.phase === 'schlange' || k.phase === 'bestellt'); t++) {
    zeitVorruecken(z, aus(), 1, () => 0);
    const a = z.kaffee.ma[eas[0].id].aufgabe, s = a && a.art === 'bedienen' ? a.phase : null;
    if (s && s !== schritte.at(-1)) schritte.push(s);
    if (s === 'laden') assert.equal(z.konto, konto + PREIS_TASSE * z.kaffee.zahlen.filter(e => e.betrag === PREIS_TASSE && e.zeit > SO + 660).length);   // die Tasse in Arbeit ist noch nicht bezahlt (27.11.: ohne die Kollekte-Zahlen vom Gottesdienst, die jetzt noch zu sehen sind)
  }
  assert.deepEqual(schritte.slice(0, 3), ['hin', 'laden', 'zurueck']);
  assert.equal(z.konto, konto + 3 * PREIS_TASSE); assert.equal(maschinen()[0].fuellung, 27);
  assert.equal(z.kaffee.zahlen.filter(e => e.betrag === PREIS_TASSE && e.zeit > SO + 660).length, 3);   // „+2 €“ über jedem Kunden
  assert.ok(z.kaffee.kunden.every(k => k.phase === 'steht' || (k.phase === 'heim' && z.minuten >= SO + 600 + 180)));   // bleiben stehen (bis das Kirchkaffee zu ist)
  assert.deepEqual(L.gaeste.map(g => g.kaffee.ergebnis), ['ja', 'ja', 'ja']);
  assert.ok(z.besucher.every(b => b.erfuellt && b.erfuellt.ids.includes('kaffee')));   // Bedürfnis Kaffee diese Woche erfüllt (25.11.)
  bis(z, aus, SO + 600 + 181);
  // +5 Sitzplatz, +5 Gottesdienst (bei Haltung 100 begrenzt) – hier nur: Kaffee hat nichts abgezogen
  assert.deepEqual(z.besucher.map(b => b.zufriedenheit), vorher);
  assert.ok(z.kaffee.kunden.every(k => k.phase === 'heim'));         // nach 2 Stunden gehen alle
  bis(z, aus, SO + 600 + 181 + 300);                                  // Heimweg (durch den Gottesdienstraum, ca. 50 Kästchen)
  assert.equal(z.kaffee.kunden.length, 0);
}
// Maschine lädt so lange wie eingestellt (1 Sekunde bei x1 = 5 Spielminuten); Ladeanzeige in der Karte
{
  const { z, aus, eas, maschinen } = gemeinde();
  besucherMitKaffee(z, 1);
  maschinen()[0].fuellung = 30;
  bis(z, aus, SO + 600 + 60);
  let start = null;
  for (let i = 0; i < 200; i++) {
    zeitVorruecken(z, aus(), 0.5, () => 0);
    const a = z.kaffee.ma[eas[0].id].aufgabe;
    if (a && a.phase === 'laden' && start === null) {
      start = z.minuten;
      const s = spielStarten(JSON.stringify({ version: 3, zustand: z }), () => 0);
      assert.equal(s.karte().laden.length, 1);
    }
    if (start !== null && (!a || a.phase !== 'laden')) { assert.ok(Math.abs(z.minuten - start - LADEN_MINUTEN) <= 0.5); break; }
  }
  assert.notEqual(start, null);
}
// Maschine leer: wer vorne steht, bekommt keinen Kaffee (−10) und geht
{
  const { z, aus, maschinen } = gemeinde();
  besucherMitKaffee(z, 2, 1);
  z.besucher.forEach(b => { b.zufriedenheit = 50; });
  maschinen()[0].fuellung = 1; z.konto = 0;                           // ohne Geld kann er vorher nicht nachkaufen
  bis(z, aus, SO + 600 + 181);
  const L = z.laeufe[0];
  assert.deepEqual(L.gaeste.map(g => g.kaffee.ergebnis).sort(), ['ja', 'leer']);
  const h = z.besucher.map(b => b.zufriedenheit).sort((a, b) => a - b);
  assert.equal(h[1] - h[0], AENDERUNG.kaffeeJa - AENDERUNG.kaffeeNein);   // +5 gegenüber −10
}
// Ohne fertiges Kirchkaffee: kein Kaffee, −10 am Ende
{
  const { z, aus, eas } = gemeinde();
  besucherMitKaffee(z, 1);
  z.besucher[0].zufriedenheit = 50;
  versetzen(z, eas[0], G.x + 12, G.y + 8);                            // Ehrenamtlicher steht nicht im Kirchkaffee
  bis(z, aus, SO + 600 + 181);
  assert.equal(z.laeufe[0].gaeste[0].kaffee.ergebnis, 'keinPlatz');
  assert.equal(z.besucher[0].zufriedenheit, 50 + 5 + 5 + AENDERUNG.kaffeeNein);
}
console.log('Bedienungs-Tests bestanden.');

// Zwei Theken bringen deutlich etwas: dieselbe Schlange ist viel schneller abgearbeitet
{
  const dauer = stationen => {
    const { z, aus, maschinen } = gemeinde({ stationen, stuehle: 10 });
    besucherMitKaffee(z, 10);
    for (const m of maschinen()) m.fuellung = 30;
    bis(z, aus, SO + 600 + 60);
    const start = z.minuten;
    while (z.kaffee.kunden.some(k => k.phase === 'schlange' || k.phase === 'bestellt') && z.minuten < start + 600) zeitVorruecken(z, aus(), 1, () => 0);
    return { minuten: z.minuten - start, geld: z.wochenbuch.einnahmen.kirchkaffee };
  };
  const eine = dauer(1), zwei = dauer(2);
  assert.equal(eine.geld, 10 * PREIS_TASSE); assert.equal(zwei.geld, 10 * PREIS_TASSE);
  assert.ok(zwei.minuten < eine.minuten * 0.75, `1 Theke ${eine.minuten} min, 2 Theken ${zwei.minuten} min`);
}
// Wer beim Schließen noch ansteht, wird fertig bedient
{
  const { z, aus, kk, maschinen } = gemeinde();
  maschinen()[0].fuellung = 30;
  assert.equal(schichtHinzufuegen(z, kk(), 0, 'nachmittag'), 'ok');   // Montag 15–19 Uhr
  bis(z, aus, 19 * 60 - 3);
  z.ort.leute = Array.from({ length: 4 }, (_, i) => ({ id: 'p' + i, vorname: 'P' + i, voll: 'P' + i, zufriedenheit: 40, besuche: 0 }));
  for (const p of z.ort.leute) assert.ok(passantKommt(z, aus(), { id: p.id, name: p.vorname }));
  bis(z, aus, 19 * 60 + 1);
  assert.equal(kirchkaffeeOffen(z, aus()).length, 0);                // geschlossen …
  bis(z, aus, 26 * 60);                                               // (Weg vom Tor durch den Gottesdienstraum: fast 4 Stunden)
  assert.equal(z.wochenbuch.einnahmen.kirchkaffee, 4 * PREIS_TASSE);                // … aber alle 4 bekommen ihren Kaffee
  assert.ok(z.ort.leute.every(p => p.zufriedenheit === 40 + AENDERUNG.kaffeeJa));
}
console.log('Theken- und Schließ-Tests bestanden.');

// Passanten: Kirchkaffee offen → wer vorbeiläuft, geht mit Chance = Kaffee-Wert hinein; zu → niemand
{
  const lauf = (schicht, wert) => {
    const { z, aus, kk, maschinen } = gemeinde();
    z.ortRuhig = false;
    maschinen()[0].fuellung = 30;
    if (schicht) schichtHinzufuegen(z, kk(), 1, 'vormittag');        // Dienstag 10–15 Uhr
    z.bekanntheit = 0;
    const zufall = saat(3);
    bis(z, aus, TAG_MIN + 1, zufall);                                 // Dienstag geplant: wer läuft wann vorbei
    for (const p of z.ort.leute) p.kaffeeWert = wert;
    for (const b of z.besucher) b.kaffeeWert = wert;
    bis(z, aus, TAG_MIN + 15 * 60, zufall);
    bis(z, aus, TAG_MIN + 21 * 60, zufall);                           // wer drin ist, wird noch bedient
    return z;
  };
  const offen = lauf(true, 1), zu = lauf(false, 1), mag = lauf(true, 0);
  const tor = z => z.ort.gaenge.filter(g => g.tor >= TAG_MIN + 10 * 60 && g.tor < TAG_MIN + 15 * 60).length;
  assert.ok(tor(offen) > 0, 'jemand kommt vorbei');
  assert.ok(offen.ort.gaenge.some(g => g.imKaffee));
  assert.ok((offen.wochenbuch.einnahmen.kirchkaffee || 0) > 0);
  assert.equal(zu.ort.gaenge.filter(g => g.imKaffee).length, 0);
  assert.equal(mag.ort.gaenge.filter(g => g.imKaffee).length, 0);      // Kaffee-Wert 0: geht nicht hinein
}
console.log('Passanten-Tests bestanden.');

// Seelsorge: während des Kirchkaffees möglich, während des Gottesdienstes (Pastor leitet) und 3 Stunden vorher nicht
{
  const { z, aus } = gemeinde();
  bis(z, aus, SO + 600 - 181);
  assert.equal(seelsorgeGesperrt(z, aus()), false);
  bis(z, aus, SO + 600 - 179);
  assert.equal(seelsorgeGesperrt(z, aus()), true);                   // 3 Stunden vorher
  bis(z, aus, SO + 630);
  assert.equal(seelsorgeGesperrt(z, aus()), true);                   // Pastor leitet den Gottesdienst
  bis(z, aus, SO + 600 + 61);
  assert.equal(z.laeufe[0].phase, 'kirchkaffee');
  assert.equal(seelsorgeGesperrt(z, aus()), false);                  // Kirchkaffee: der Pastor ist frei
}
// Ohne Pastor im Raum: die Veranstaltung fällt aus, die Sperre gilt nicht
{
  const { z, aus } = gemeinde();
  versetzen(z, z.personen[0], G.x + 30, G.y + 20);
  bis(z, aus, SO + 600 - 60);
  assert.equal(seelsorgeGesperrt(z, aus()), false);
}
console.log('Seelsorge-Sperre-Tests bestanden.');

// Prognose: erwartete Tassen = Besucher × Kaffee-Wert
{
  const { z, aus } = gemeinde({ stuehle: 10 });
  besucherMitKaffee(z, 4, 0.5);
  const p = prognose(z, aus());
  assert.ok(Math.abs(p.tassen - 2) < 1e-9);                           // 4 kommen sicher (Haltung 100), je 50 %
}
console.log('Prognose-Tests bestanden.');

// Schalterwand: Kirchkaffee-Fenster, Öffnungszeiten, Maschine, Kärtchen
{
  const { z } = gemeinde();
  const spiel = spielStarten(JSON.stringify({ version: 3, zustand: z }), () => 0.9);
  const nr = spiel.kirchkaffeeBei(G.x + 20, G.y + 5);
  assert.notEqual(nr, null); assert.equal(spiel.kirchkaffeeBei(G.x + 5, G.y + 5), null);
  let info = spiel.kaffeeRaumInfo(nr);
  assert.equal(info.zustand, 'zu'); assert.deepEqual(info.naechste, { tag: 6, stunde: 11, minute: 0 });   // nach dem Gottesdienst
  assert.equal(spiel.schichtHinzufuegen(nr, 1, 'abend'), 'ok');
  info = spiel.kaffeeRaumInfo(nr);
  assert.deepEqual(info.schichten, [{ tag: 1, slot: 'abend' }]); assert.deepEqual(info.naechste, { tag: 1, stunde: 19, minute: 0 });
  assert.deepEqual(info.slots.find(s => s.id === 'abend'), { id: 'abend', stunde: 19, ende: 23 });
  const raum = spiel.karte().raeume.find(r => r.nr === nr);
  assert.deepEqual(raum.kirchkaffee, { code: 'zu', naechste: { tag: 1, stunde: 19, minute: 0 } });
  assert.ok(spiel.rueckgaengig()); assert.equal(spiel.kaffeeRaumInfo(nr).schichten.length, 0);   // Rückgängig geht auch hier
  assert.equal(spiel.schichtEntfernen(nr, 0), 'keine');
  const m = spiel.maschineInfo(G.x + 20, G.y + 3);
  assert.deepEqual(Object.keys(m).sort(), ['einkaufPreis', 'fassung', 'fuellung', 'imKirchkaffee']);
  assert.equal(m.einkaufPreis, EINKAUF.preisTasse);
  assert.equal(typeof spiel.kaffeeNachkaufen, 'undefined');           // der Spieler kauft nicht mehr selbst
  assert.equal(typeof spiel.besucherInfo(spiel.menschen()[0].id).kaffee, 'number');
  assert.equal(typeof spiel.menschen()[0].kaffee, 'number');
}
console.log('Kirchkaffee-Schnittstellen-Tests bestanden.');

// Sitzplätze (Spielprinzip 25.11.): Stühle + Tische im Kirchkaffee, 50 % setzen sich, Trinkgeld beim Gehen
{
  assert.equal(STEHEN_PASSANT, 60); assert.equal(SITZEN.chance, 0.5); assert.equal(SITZEN.trinkgeld, 1); assert.equal(SITZEN.tisch, 1.2);
  const aufbau = () => {
    const g = gemeinde();
    const { z } = g;
    assert.equal(moebelKaufen(z, 'stuhl', G.x + 20, G.y + 8), 'ok');
    assert.equal(moebelKaufen(z, 'stuhl', G.x + 22, G.y + 8), 'ok');
    assert.equal(moebelKaufen(z, 'tisch', G.x + 23, G.y + 8), 'ok');
    z.moebel.find(m => m.art === 'stuhl' && m.x === G.x + 20 && m.y === G.y + 8).stufe = 4;   // Ehrenstuhl ×1,3
    g.maschinen()[0].fuellung = 30;
    besucherMitKaffee(z, 4, 1);
    return g;
  };
  // Tisch daneben und Stufe
  {
    const { z, kk } = aufbau();
    const s1 = z.moebel.find(m => m.art === 'stuhl' && m.x === G.x + 20 && m.y === G.y + 8);
    const s2 = z.moebel.find(m => m.art === 'stuhl' && m.x === G.x + 22 && m.y === G.y + 8);
    assert.equal(amTisch(z, s1), false); assert.equal(amTisch(z, s2), true);
    assert.equal(trinkgeldFuer(z, s1), 1.3); assert.equal(trinkgeldFuer(z, s2), 1.2);
    s2.stufe = 4; assert.equal(trinkgeldFuer(z, s2), 1.56);                     // Ehrenstuhl am Tisch
    moebelKaufen(z, 'tisch', G.x + 22, G.y + 7);                                // zweiter Tisch daneben zählt nicht nochmal
    assert.equal(trinkgeldFuer(z, s2), 1.56);
    assert.deepEqual(sitzplaetzeVon(z, kk()), { anzahl: 2, amTisch: 1 });
  }
  // Nach dem Gottesdienst: wer bedient ist und einen freien Stuhl findet, setzt sich; Trinkgeld erst beim Gehen
  {
    const { z, aus } = aufbau();
    const sassen = new Map(), zahlen = new Set();
    let geprueft = false, saehtSitzen = false;
    for (let t = SO + 600; t < SO + 600 + 300; t++) {
      bis(z, aus, t);
      for (const e of kaffeeZahlen(z)) if (e.art === 'trinkgeld') zahlen.add(e.nr);
      if (kaffeeKundenPositionen(z).some(p => p.sitzt)) saehtSitzen = true;
      for (const k of z.kaffee.kunden) if (k.phase === 'sitzt') {
        sassen.set(k.id, k.trinkgeld);
        if (!geprueft) {                                                        // beim Sitzen noch kein Trinkgeld gebucht
          const tassen = z.kaffee.zahlen.filter(e => e.betrag === PREIS_TASSE && !e.art && e.zeit > SO + 660).length;   // ohne die Kollekte-Zahlen (27.11.)
          assert.equal(z.wochenbuch.einnahmen.kirchkaffee, tassen * PREIS_TASSE);
          geprueft = true;
        }
      }
    }
    assert.ok(sassen.size >= 1, 'mindestens einer setzt sich');
    assert.ok([...sassen.values()].every(v => v === 1.3 || v === 1.2));
    const trinkgeld = [...sassen.values()].reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(z.wochenbuch.einnahmen.kirchkaffee - (3 * PREIS_TASSE + trinkgeld)) < 1e-9);   // 3 Gäste (3 Plätze im Gottesdienst)
    assert.equal(zahlen.size, sassen.size);                                     // grüne Zahl beim Gehen
    assert.ok(saehtSitzen);                                                     // Anzeige: sitzt (Name verschwindet)
  }
  // Würfel über 50 %: niemand setzt sich, kein Trinkgeld
  {
    const { z, aus } = aufbau();
    bis(z, aus, SO + 600 + 300, () => 0.9);
    assert.equal(z.wochenbuch.einnahmen.kirchkaffee, 3 * PREIS_TASSE);
  }
  // Passant zu Öffnungszeiten: bleibt 60 Spielminuten sitzen, dann Trinkgeld
  {
    const { z, aus, kk, maschinen } = gemeinde();
    assert.equal(moebelKaufen(z, 'stuhl', G.x + 20, G.y + 8), 'ok');
    maschinen()[0].fuellung = 30;
    schichtHinzufuegen(z, kk(), 1, 'vormittag');
    bis(z, aus, TAG_MIN + 10 * 60);
    assert.ok(passantKommt(z, aus(), { id: 'p1', name: 'Paula' }));
    let k;
    for (let i = 0; i < 600 && !(k = z.kaffee.kunden.find(x => x.id === 'p1' && x.phase === 'sitzt')); i++) bis(z, aus, z.minuten + 1);
    assert.ok(k, 'Passant setzt sich');
    const amStuhl = k.bew.t0 + k.bew.laenge / LAUFTEMPO;                        // 60 Minuten ab Ankunft am Stuhl (SITZEN.mindestens)
    assert.ok(Math.abs(k.stehBis - (amStuhl + SITZEN.mindestens)) < 1e-9);
    const vorher = z.wochenbuch.einnahmen.kirchkaffee;
    bis(z, aus, k.stehBis + 1);
    assert.equal(z.wochenbuch.einnahmen.kirchkaffee, vorher + 1);              // Holzstuhl ohne Tisch: 1 €
  }
  // Spät bedient (25.11.): wer sich setzt, bleibt ab Ankunft am Stuhl mindestens 60 Minuten – auch nach Schluss –
  // und ist vorher wirklich sitzend zu sehen (Fehler: brach auf, bevor er den Stuhl erreichte)
  {
    const { z, aus } = aufbau();
    const ende = SO + 600 + DAUER.gottesdienst + DAUER.kirchkaffee;
    let gesehen = false;
    const geprueft = new Set();
    for (let t = SO + 600; t < ende + 200; t++) {
      bis(z, aus, t);
      if (kaffeeKundenPositionen(z).some(p => p.sitzt)) gesehen = true;
      for (const k of z.kaffee.kunden) if (k.phase === 'sitzt' && !geprueft.has(k.id)) {
        geprueft.add(k.id);
        const amStuhl = k.bew.t0 + k.bew.laenge / LAUFTEMPO;
        assert.ok(k.stehBis >= amStuhl + SITZEN.mindestens - 1e-9);
        assert.ok(k.stehBis >= ende - 1e-9 || k.stehBis === amStuhl + SITZEN.mindestens);
      }
    }
    assert.ok(geprueft.size >= 1 && gesehen);
  }
  assert.equal(SITZEN.mindestens, 60);
  // Schalterwand
  {
    const { z } = aufbau();
    const spiel = spielStarten(JSON.stringify({ version: 3, zustand: z }), () => 0.9);
    const info = spiel.kaffeeRaumInfo(spiel.kirchkaffeeBei(G.x + 20, G.y + 5));
    assert.deepEqual(info.sitzplaetze, { anzahl: 2, amTisch: 1 }); assert.equal(info.sitzChance, 50);
    assert.equal(spiel.stuhlInfo(G.x + 20, G.y + 8).trinkgeld, 1.3);
    assert.equal(spiel.stuhlInfo(G.x + 22, G.y + 8).naechste.trinkgeld, 1.1);
    const arten = spiel.moebelArten();
    assert.equal(arten.find(m => m.id === 'tisch').kategorie, 'kirchkaffee');
    assert.deepEqual(arten.find(m => m.id === 'stuhl').auchIn, ['kirchkaffee', 'gemeindesaal']);   // Gemeindesaal: Stuhl auch dort (25.11.)
  }
}
console.log('Sitzplatz- und Trinkgeld-Tests bestanden.');

// Zwei Theken, die sich berühren (nebeneinander oder untereinander): trotzdem arbeiten beide Ehrenamtlichen
for (const lage of ['untereinander', 'nebeneinander']) {
  const { z, aus, eas, maschinen } = gemeinde({ stationen: 0, stuehle: 12 });
  for (let i = 0; i < 2; i++) {
    const [mx, my, tx, ty] = lage === 'untereinander' ? [G.x + 20, G.y + 3 + i, G.x + 22, G.y + 3 + i] : [G.x + 20 + i, G.y + 3, G.x + 20 + i, G.y + 5];
    assert.equal(moebelKaufen(z, 'kaffeemaschine', mx, my), 'ok');
    assert.equal(moebelKaufen(z, 'theke', tx, ty), 'ok');
    const ea = personHinzufuegen(z, { name: `Helfer ${i + 1}`, kuerzel: 'H', art: 'ehrenamt' });
    versetzen(z, ea, G.x + 24 + i, G.y + 8);
    eas.push(ea);
  }
  besucherMitKaffee(z, 12);
  for (const m of maschinen()) m.fuellung = 30;
  const bedient = new Set();
  while (z.minuten < SO + 14 * 60) {
    zeitVorruecken(z, aus(), 1, () => 0);
    for (const [id, m] of Object.entries(z.kaffee.ma)) if (m.aufgabe && m.aufgabe.art === 'bedienen') bedient.add(id);
  }
  assert.deepEqual([...bedient].sort(), eas.map(e => e.id).sort(), lage);
}
console.log('Tests zu zwei Theken, die sich berühren, bestanden.');
