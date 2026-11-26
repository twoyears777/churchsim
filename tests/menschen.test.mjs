// Prüft Menschen im Ort, Passanten, Neugierige und Seelsorge. Starten mit: node tests/menschen.test.mjs
import assert from 'node:assert';
import { skillsVon, seelsorgePunkte, stufe } from '../src/kern/skills.js';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { ORT, NEUGIER } from '../src/inhalte/ort.js';
import { SEELSORGE } from '../src/inhalte/seelsorge.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel, spielStarten } from '../src/kern/spiel.js';
import { zeitVorruecken, veranstaltungEinstellen, seelsorgeGesperrt, prognose } from '../src/kern/ablauf.js';
import { moebelSetzen } from '../src/kern/moebel.js';
import { versetzen } from '../src/kern/personen.js';
import { werKommt, kommChance } from '../src/kern/besucher.js';
import { EINZUGSGEBIET } from '../src/inhalte/einzugsgebiet.js';
import { ortSchritt, passantenPositionen } from '../src/kern/ort.js';
import { raten, ablehnen, schliessen, anfrageOffen, schub, seelsorgePositionen, anfrageInfo, einschaetzen, chanceVon } from '../src/kern/seelsorge.js';
import { TAG_MIN, WOCHE_MIN } from '../src/kern/zeit.js';

// Wiederholbarer Zufall (immer dieselbe Folge)
const saat = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
// Gemeinde mit Gottesdienstraum, 20 Stühlen und Pastor
function gemeinde(zufall) {
  const z = neuesSpiel(zufall);
  const aus = () => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  const raum = () => { const a = aus(); return a.liste[a.gruppe[G.x + 5 + (G.y + 5) * z.w]]; };
  typZuweisen(z, raum(), 'gottesdienst'); veranstaltungEinstellen(z, raum(), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 15, G.y + 4);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  return { z, aus };
}
// Zeit laufen lassen; Seelsorge-Anfragen beantwortet „antwort“ (Standard: erster Rat)
function laufen(z, aus, minuten, zufall, antwort = () => raten(z, 0, zufall)) {
  const ziel = z.minuten + minuten;
  let anfragen = 0;
  while (z.minuten < ziel) {
    zeitVorruecken(z, aus(), Math.min(60, ziel - z.minuten), zufall);
    if (anfrageOffen(z)) { anfragen++; antwort(); schliessen(z); }
  }
  return anfragen;
}

// Passanten: 6–10 pro Tag, höchstens 40 im Ort, laufen auf dem Gehweg
{
  const zufall = saat(7), { z, aus } = gemeinde(zufall);
  laufen(z, aus, TAG_MIN - z.minuten + 1, zufall);                   // Tag 0 ab 8 Uhr, dann Tag 1 voll geplant
  const amTorGaenge = z.ort.gaenge.filter(g => !g.laden);                 // am Laden laufen zusätzlich welche (evangelisation.test.mjs)
  assert.ok(amTorGaenge.length >= ORT.passantenProTag[0] && amTorGaenge.length <= ORT.passantenProTag[1]);
  const bekannte = amTorGaenge.filter(g => z.besucher.some(b => b.id === g.id)).length;
  assert.ok(bekannte >= 1 && bekannte <= 2);
  laufen(z, aus, 6 * WOCHE_MIN, zufall);
  assert.ok(z.ort.leute.length + z.besucher.length <= EINZUGSGEBIET.start);
  // um 14 Uhr sind Leute unterwegs, alle auf der Gehweg-Zeile
  laufen(z, aus, TAG_MIN - (z.minuten % TAG_MIN) + 14 * 60, zufall);
  const pos = passantenPositionen(z);
  assert.ok(pos.every(p => (p.y === 34 || p.x === 55) && p.passant));   // Gehweg am Tor oder vor dem Laden
}
console.log('Passanten-Tests bestanden.');

// Neugierig am Tor: Zufall 0 → wird neugierig, bleibt stehen, Meldung
{
  const z = neuesSpiel(() => 0.5);
  const s = ortSchritt(z, () => 0.5); s.tun();                       // Tag planen
  const g = z.ort.gaenge.find(x => !x.laden && z.ort.leute.some(p => p.id === x.id));
  for (const x of z.ort.gaenge) if (x !== g) x.geprueft = true;
  z.minuten = g.tor;
  const amTor = ortSchritt(z, () => 0);
  assert.equal(amTor.zeit, g.tor);
  ortSchritt(z, () => 0).tun();
  const p = z.ort.leute.find(x => x.id === g.id);
  assert.equal(p.neugierig, true); assert.equal(g.halt, NEUGIER.haltMinuten);
  assert.equal(z.ort.meldung.code, 'neugierig');
  z.minuten = g.tor + 5;
  assert.equal(passantenPositionen(z).find(x => x.id === g.id).steht, true);
  // Kommt der Neugierige? 0.5 < 75 % → ja, behält seine Haltung
  const haltung = p.zufriedenheit;
  const kommen = werKommt(z, () => 0.5);
  assert.ok(kommen.includes(p)); assert.ok(z.besucher.includes(p)); assert.ok(!z.ort.leute.includes(p));
  assert.equal(p.zufriedenheit, haltung); assert.equal(p.neugierig, undefined);
  // Neugieriger, der nicht kommt (0.9 ≥ 75 %), wird wieder Passant
  const q = z.ort.leute[0]; q.neugierig = true;
  werKommt(z, () => 0.9);
  assert.equal(q.neugierig, false); assert.ok(z.ort.leute.includes(q));
  // Neue über die Bekanntheit kommen zuerst aus dem Ort
  const vorher = z.ort.leute.length; z.bekanntheit = 20;
  werKommt(z, () => 0.95);
  assert.equal(z.ort.leute.length, vorher - 2);
  // Prognose zählt Neugierige mit (75 %)
  z.ort.leute[0].neugierig = true;
  const mit = prognose(z, { liste: [], gruppe: [] }).erwartet; z.ort.leute[0].neugierig = false;
  assert.ok(Math.abs(mit - prognose(z, { liste: [], gruppe: [] }).erwartet - NEUGIER.kommChance) < 1e-9);
}
console.log('Neugier-Tests bestanden.');

// Seelsorge: Stufen, Ablehnen, Rat, Kosten, Spende, Passant wird neugierig
{
  assert.deepEqual([0, 1, 2, 3, 7, 8, 11, 23, 43, 67, 68, 99].map(stufe), [1, 1, 2, 2, 4, 5, 6, 10, 15, 19, 20, 20]);
  const z = neuesSpiel(() => 0.5), b = z.besucher[0];
  z.seelsorge.anfrage = { id: b.id, situation: 'nachbar', phase: 'frage', ergebnis: null };
  assert.equal(schliessen(z), 'keine');                              // erst antworten
  assert.equal(ablehnen(z), 'ok'); assert.equal(b.zufriedenheit, 60 + SEELSORGE.ablehnen);
  assert.equal(seelsorgePunkte(z), 0);                              // Ablehnen: keine Erfahrung
  assert.equal(schliessen(z), 'ok'); assert.equal(anfrageOffen(z), false);
  // guter Ausgang: Haltung +10, Bekanntheit +1, 2 Punkte
  z.seelsorge.anfrage = { id: b.id, situation: 'nachbar', phase: 'frage', ergebnis: null };
  assert.equal(raten(z, 0, () => 0.69), 'ok');                       // 0,69 < 70 %
  let e0 = z.seelsorge.anfrage.ergebnis;
  assert.equal(e0.gut, true);
  assert.equal(b.zufriedenheit, 65); assert.equal(z.bekanntheit, 0.2); assert.equal(seelsorgePunkte(z), 2);
  // 2 Punkte → Stufe 2: +1,5 % Erfolgschance, noch keine Freischaltung
  assert.equal(e0.neueStufe, 2); assert.equal(e0.stufeBonus, 1.5); assert.equal(e0.freischaltung, null);
  schliessen(z);
  // schlechter Ausgang: −10, 1 Punkt, keine neue Stufe
  z.seelsorge.anfrage = { id: b.id, situation: 'nachbar', phase: 'frage', ergebnis: null };
  raten(z, 0, () => 0.715);
  assert.equal(b.zufriedenheit, 55); assert.equal(seelsorgePunkte(z), 3); assert.equal(z.seelsorge.anfrage.ergebnis.neueStufe, null);
  schliessen(z);
  // Stufe 2: derselbe Rat gelingt jetzt bis 71,5 %
  z.seelsorge.anfrage = { id: b.id, situation: 'nachbar', phase: 'frage', ergebnis: null };
  raten(z, 0, () => 0.714); assert.equal(z.seelsorge.anfrage.ergebnis.gut, true); schliessen(z);
  // Aufstieg auf Stufe 5: Freischaltung „bester Rat“
  skillsVon(z.personen.find(p => p.id === 'pastor')).seelsorge = 7;
  z.seelsorge.anfrage = { id: b.id, situation: 'nachbar', phase: 'frage', ergebnis: null };
  raten(z, 0, () => 0.99); e0 = z.seelsorge.anfrage.ergebnis;
  assert.equal(e0.neueStufe, 5); assert.equal(e0.freischaltung, 5); schliessen(z);
  // Gutschein kostet 20 €, geht nicht ohne Geld
  z.konto = 10;
  z.seelsorge.anfrage = { id: b.id, situation: 'job', phase: 'frage', ergebnis: null };
  assert.equal(raten(z, 1, () => 0), 'geld'); assert.equal(z.seelsorge.anfrage.phase, 'frage');
  z.konto = 50; raten(z, 1, () => 0.99); assert.equal(z.konto, 30); schliessen(z);
  // Trauerfeier gut: Spende 30 €
  z.seelsorge.anfrage = { id: b.id, situation: 'trauer', phase: 'frage', ergebnis: null };
  raten(z, 1, () => 0); assert.equal(z.konto, 60); schliessen(z);
  // Sportverein gut: nur Haltung +5, keine Bekanntheit
  const bek = z.bekanntheit, h = b.zufriedenheit;
  z.seelsorge.anfrage = { id: b.id, situation: 'einsam', phase: 'frage', ergebnis: null };
  raten(z, 2, () => 0); assert.equal(b.zufriedenheit, h + 5); assert.equal(z.bekanntheit, bek); schliessen(z);
  // Passant, gutes Gespräch → neugierig
  ortSchritt(z, () => 0.5).tun();
  const p = z.ort.leute[0];
  z.seelsorge.anfrage = { id: p.id, situation: 'zweifel', phase: 'frage', ergebnis: null };
  raten(z, 0, () => 0); assert.equal(p.neugierig, true); assert.equal(z.seelsorge.anfrage.ergebnis.neugierig, true);
}
// Einschätzung je Stufe, Angaben zur Person, Haltung vorher → nachher
{
  assert.deepEqual([0.65, 0.64, 0.4, 0.39].map(einschaetzen), ['gut', 'unsicher', 'unsicher', 'riskant']);
  assert.equal(chanceVon({ chance: 0.8 }, 11), 0.95);                // höchstens 95 %
  assert.equal(chanceVon({ chance: 0.8 }, 10), 0.935);               // Stufe 10: +13,5 %
  const z = neuesSpiel(() => 0.5), b = z.besucher[0];
  const frage = () => { z.seelsorge.anfrage = { id: b.id, situation: 'nachbar', phase: 'frage', ergebnis: null }; return anfrageInfo(z); };
  // Stufe 1: nichts zu sehen
  let a = frage();
  assert.equal(a.haltung, b.zufriedenheit); assert.equal(a.besuche, b.besuche || 0);
  assert.deepEqual(a.raete.map(r => [r.beste, r.einschaetzung, r.prozent]), [[false, null, null], [false, null, null], [false, null, null]]);
  // Stufe 4: noch nichts zu sehen
  skillsVon(z.personen.find(p => p.id === 'pastor')).seelsorge = 6; a = frage();
  assert.deepEqual(a.raete.map(r => [r.beste, r.einschaetzung, r.prozent]), [[false, null, null], [false, null, null], [false, null, null]]);
  // Stufe 5–9: nur der passendste Rat ist markiert
  skillsVon(z.personen.find(p => p.id === 'pastor')).seelsorge = 8; a = frage();
  assert.deepEqual(a.raete.map(r => [r.beste, r.einschaetzung, r.prozent]), [[true, null, null], [false, null, null], [false, null, null]]);
  // Stufe 10: Einschätzung für jeden Rat (Nachbar: 70 %, 50 %, 30 % + 13,5), keine Markierung, keine Prozent
  skillsVon(z.personen.find(p => p.id === 'pastor')).seelsorge = 23; a = frage();
  assert.deepEqual(a.raete.map(r => [r.beste, r.einschaetzung, r.prozent]), [[false, 'gut', null], [false, 'unsicher', null], [false, 'unsicher', null]]);
  // Stufe 15: dazu die genaue Chance (Bonus +21)
  skillsVon(z.personen.find(p => p.id === 'pastor')).seelsorge = 43; a = frage();
  assert.deepEqual(a.raete.map(r => r.prozent), [91, 71, 51]);
  assert.deepEqual(a.raete.map(r => r.einschaetzung), ['gut', 'gut', 'unsicher']);
  // Ergebnis: Haltung vorher → nachher und Chance zu kommen (nur bei Besuchern)
  const vorher = b.zufriedenheit;
  raten(z, 0, () => 0);
  const e = z.seelsorge.anfrage.ergebnis;
  assert.equal(e.haltungVorher, vorher); assert.equal(e.haltungNachher, vorher + 10); assert.equal(e.kommChance, Math.round(kommChance(b) * 100));
  schliessen(z);
  // Passant: keine Chance zu kommen angezeigt
  ortSchritt(z, () => 0.5).tun();
  const p = z.ort.leute[0];
  z.seelsorge.anfrage = { id: p.id, situation: 'zweifel', phase: 'frage', ergebnis: null };
  raten(z, 0, () => 0.99); assert.equal(z.seelsorge.anfrage.ergebnis.kommChance, null);
  // Über die Schalterwand kommt auch der Status der Person mit
  const s = spielStarten(null, () => 0.5), l0 = s.lage();
  assert.equal(l0.seelsorge, null);
}
console.log('Seelsorge-Tests bestanden.');

// Seelsorge im Zeitablauf: Zeit steht bei offener Anfrage, Sperre vor/während Gottesdienst, Häufigkeit
{
  const zufall = saat(11), { z, aus } = gemeinde(zufall);
  // gesperrt: 3 Stunden vor Sonntag 10 Uhr
  z.minuten = 6 * TAG_MIN + 7 * 60 + 1; assert.equal(seelsorgeGesperrt(z), true);
  z.minuten = 6 * TAG_MIN + 6 * 60; assert.equal(seelsorgeGesperrt(z), false);
  z.minuten = 8 * 60;
  // Anfrage offen → Zeit steht
  for (let i = 0; i < 2000 && !anfrageOffen(z); i++) zeitVorruecken(z, aus(), 60, zufall);
  assert.ok(anfrageOffen(z));
  const t = z.minuten, stunde = (t % TAG_MIN) / 60;
  assert.ok(stunde >= SEELSORGE.von && stunde < SEELSORGE.bis);
  zeitVorruecken(z, aus(), 600, zufall); assert.equal(z.minuten, t);
  ablehnen(z); schliessen(z);
  // Über viele Wochen: Stufe 1 (immer ablehnen) etwa 1 Anfrage pro Woche (plus Anfangsschub)
  const wochen = 60, n = laufen(z, aus, wochen * WOCHE_MIN, zufall, () => ablehnen(z));
  assert.ok(n / wochen > 0.8 && n / wochen < 1.4, `Anfragen pro Woche: ${n / wochen}`);
}
{
  // Stufe 20 (immer guter Rat) etwa 3 pro Woche
  const zufall = saat(5), { z, aus } = gemeinde(zufall);
  skillsVon(z.personen.find(p => p.id === 'pastor')).seelsorge = 68;
  const n = laufen(z, aus, 30 * WOCHE_MIN, zufall);
  assert.ok(n / 30 > 2.3 && n / 30 < 3.8, `Anfragen pro Woche: ${n / 30}`);   // 3 + Anfangsschub; Zufall streut (12 Läufe: 2,4–3,7)
}
{
  // Anfangsschub: 1. Anfrage doppelt so oft, wird kleiner, ab der 11. normal
  assert.equal(schub(0), 2); assert.ok(schub(5) > 1 && schub(5) < 2); assert.equal(schub(10), 1); assert.equal(schub(30), 1);
}
{
  // Hinlaufen: erst läuft jemand vom Tor zum Pastor, dann kommt die Anfrage; danach geht er wieder heim
  const zufall = saat(21), { z, aus } = gemeinde(zufall);
  for (let i = 0; i < 5000 && !z.seelsorge.gang && !anfrageOffen(z); i++) zeitVorruecken(z, aus(), 10, zufall);
  const G = z.seelsorge.gang;
  assert.ok(G && !G.da && !anfrageOffen(z), 'jemand ist unterwegs zum Pastor');
  const p0 = seelsorgePositionen(z)[0];
  assert.ok(p0 && p0.y >= 30, 'startet unten am Tor');
  for (let i = 0; i < 500 && !anfrageOffen(z); i++) zeitVorruecken(z, aus(), 1, zufall);
  assert.ok(anfrageOffen(z), 'Anfrage kommt bei der Ankunft');
  const pastor = z.personen.find(p => p.id === 'pastor'), da = seelsorgePositionen(z)[0];
  assert.ok(Math.hypot(da.x - pastor.x, da.y - pastor.y) <= 1.5, 'steht neben dem Pastor');
  ablehnen(z); schliessen(z);
  zeitVorruecken(z, aus(), 5, zufall);
  assert.ok(seelsorgePositionen(z).length === 1, 'geht wieder heim');
  zeitVorruecken(z, aus(), 300, zufall);
  assert.equal(z.seelsorge.gang, null); assert.deepEqual(seelsorgePositionen(z), []);
}
console.log('Seelsorge-Zeitablauf-Tests bestanden.');

// Schneller Anfang: in den ersten Wochen etwa 2–3 neue Besucher pro Woche (ohne Bekanntheits-Zuwachs gerechnet)
{
  let neue = 0;
  const durchgaenge = 20;
  for (let d = 0; d < durchgaenge; d++) {
    const zufall = saat(100 + d), { z, aus } = gemeinde(zufall);
    laufen(z, aus, WOCHE_MIN - z.minuten + 7 * 60, zufall, () => ablehnen(z));   // bis Montag der 2. Woche
    neue += z.besucher.filter(b => !b.stamm).length + z.personen.length - 1;
  }
  const schnitt = neue / durchgaenge;
  // 25.11.: Untergrenze 1,5 → 1,2. Über 200 Durchgänge liegt der Schnitt vor und nach dem Kirchkaffee-Umbau bei ~1,5;
  // die 20 festen Zufallsfolgen hier schwanken nur anders, weil beim Anlegen einer Person kein Kaffee-Würfel mehr fällt.
  assert.ok(schnitt >= 1.2 && schnitt <= 4, `neue Besucher in Woche 1: ${schnitt}`);
}
console.log('Spielanfang-Test bestanden.');

// Schalterwand: Menschen-Liste, Kärtchen für Passanten, Seelsorge-Befehle, Pastor-Karte
{
  const spiel = spielStarten(null, () => 0.5);
  spiel.tick(0.01);
  const liste = spiel.menschen();
  assert.equal(liste.filter(m => m.status === 'stammgast').length, 4);
  const passant = liste.find(m => m.status === 'passant');
  assert.ok(passant && passant.kaffee === null && passant.zuletzt === null);
  const info = spiel.besucherInfo(passant.id);
  assert.equal(info.status, 'passant'); assert.equal(info.beduerfnisse, null);
  assert.deepEqual(spiel.personInfo('pastor').seelsorge, { stufe: 1, maxStufe: 20, punkte: 0, von: 0, bis: 2, bonus: 0, freigeschaltet: null, naechsteFreischaltung: 5 });
  assert.equal(spiel.lage().seelsorge, null); assert.equal(spiel.seelsorgeOffen(), false);
  assert.equal(spiel.seelsorgeRat(0), 'keine');
  // Spielstand mit Ort und Seelsorge speichern und laden
  const kopie = spielStarten(spiel.speicherText());
  assert.equal(kopie.menschen().length, liste.length);
}
console.log('Menschen-Schnittstellen-Tests bestanden.');

// Test-Werkzeug „Geld geben“: nur gültige Beträge, zählt nicht in die Finanzen der Woche
{
  const { spielStarten: starten } = await import('../src/kern/spiel.js');
  const sp = starten();
  const vor = sp.lage().konto;
  assert.equal(sp.testGeld(5000), 'ok'); assert.equal(sp.lage().konto, vor + 5000);
  assert.equal(sp.testGeld(0), 'betrag'); assert.equal(sp.testGeld(-10), 'betrag'); assert.equal(sp.testGeld('abc'), 'betrag');
  assert.equal(sp.lage().konto, vor + 5000);
}
