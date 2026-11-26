// Prüft die Evangelisation vor dem Laden (Spielprinzip 26.11.2026): freie Ehrenamtliche gehen von selbst hin, höchstens 2,
// die mit dem höchsten Musik-Level, rechtzeitig zurück zur eigenen Aufgabe, nur 8–20 Uhr; Passanten am Laden (1,5× wie am Tor);
// angesprochen = neugierig, nur zum nächsten Gottesdienst (Jugendliche von jugendlichen EA nur zum Jugendgottesdienst).
// Starten mit: node tests/evangelisation.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { EVANGELISATION as E } from '../src/inhalte/evangelisation.js';
import { MUSIK } from '../src/inhalte/moebel.js';
import { ORT } from '../src/inhalte/ort.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel } from './hilfen/ohne-erster.mjs';   // ohne ersten Gottesdienst (26.11.)
import { zeitVorruecken, veranstaltungEinstellen, terminEinstellen, termineDerWoche } from '../src/kern/ablauf.js';
import { moebelSetzen } from '../src/kern/moebel.js';
import { versetzen, personHinzufuegen } from '../src/kern/personen.js';
import { skillsVon } from '../src/kern/skills.js';
import { werKommt } from '../src/kern/besucher.js';
import { ortSchritt, passantenPositionen } from '../src/kern/ort.js';
import { evangelisationAktualisieren, evangelisationPosition, vorOrt, ansprechen, freieEhrenamtliche, evangelisationInfo } from '../src/kern/evangelisation.js';
import { TAG_MIN } from '../src/kern/zeit.js';

const aus = z => () => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
// Evangelisation-Level setzen (seit 26.11. abends zählt dieser Skill, nicht mehr das Musik-Level)
const level = (p, l) => { skillsVon(p).evangelisation = l * E.skill.erfahrungProLevel; return p; };
const bis = (z, minute) => { const a = aus(z); while (z.minuten < minute) zeitVorruecken(z, a(), Math.min(5, minute - z.minuten), () => 0.99); };
// Spiel ohne Passanten, nur mit eigenen Ehrenamtlichen (die Frau des Pastors wird weggenommen)
function spiel(n = 0) {
  const z = neuesSpiel(() => 0.9);
  z.ortRuhig = true;
  z.personen = z.personen.filter(p => p.id === 'pastor');
  const eas = Array.from({ length: n }, (_, i) => { const p = personHinzufuegen(z, { name: `EA ${i + 1}`, kuerzel: 'E', art: 'ehrenamt' }); versetzen(z, p, G.x + 2 + i, G.y + G.h - 3); return p; });
  return { z, eas };
}
const amFeld = (z, p) => { const q = evangelisationPosition(z, p); return !!q && E.standplaetze.some(s => Math.abs(s.x - q.x) < 1e-6 && Math.abs(s.y - q.y) < 1e-6); };

// Freie Ehrenamtliche gehen tagsüber von selbst hin – höchstens 2, die mit dem höchsten Musik-Level
{
  const { z, eas } = spiel(3);
  level(eas[0], 1); level(eas[1], 3); level(eas[2], 2);
  z.minuten = TAG_MIN + 9 * 60;                                     // Dienstag 9 Uhr
  bis(z, TAG_MIN + 14 * 60);   // der Weg zum Laden dauert 3–4 Spielstunden
  const da = vorOrt(z).map(p => p.id).sort();
  assert.deepEqual(da, [eas[1].id, eas[2].id].sort());
  assert.ok(amFeld(z, eas[1]) && amFeld(z, eas[2]));
  assert.equal(evangelisationPosition(z, eas[0]), null);           // bleibt an seinem Platz
  assert.equal(eas[1].x, G.x + 3);                                  // sein Platz für die Spielregeln bleibt gleich
  const info = evangelisationInfo(z, aus(z)());
  assert.equal(info.leute.length, 2); assert.equal(info.max, E.plaetze); assert.equal(info.chance, 35);   // (5 + 3 × 5) + (5 + 2 × 5) = 35 %
  assert.deepEqual(info.leute.map(p => p.beitrag).sort(), [15, 20]);
  // Um 20 Uhr ist Schluss: sie gehen zurück und sind danach wieder an ihrem Platz
  bis(z, TAG_MIN + 20 * 60 + 1);
  assert.equal(vorOrt(z).length, 0);
  bis(z, 2 * TAG_MIN + 60);
  assert.equal(vorOrt(z).length, 0);
  assert.ok(eas.every(p => evangelisationPosition(z, p) === null));
  // Nachts geht niemand
  bis(z, 2 * TAG_MIN + 7 * 60);
  assert.equal(Object.keys(z.evangelisation.ma).length, 0);
}

// Gleichstand beim Level: wer länger frei hat
{
  const { z, eas } = spiel(3);
  for (const p of eas) level(p, 2);
  z.minuten = TAG_MIN + 9 * 60;
  z.evangelisation.freiSeit = { [eas[0].id]: 500, [eas[1].id]: 100, [eas[2].id]: 300 };
  evangelisationAktualisieren(z, aus(z)());
  assert.deepEqual(Object.keys(z.evangelisation.ma).sort(), [eas[1].id, eas[2].id].sort());
}

// Ehrenamtlicher im Gottesdienstraum (mit Instrument): ist zum Beginn wieder an seinem Platz
{
  const { z, eas } = spiel(1);
  const p = level(eas[0], 2);
  // Raum unten rechts mit Tür nach unten (kurzer Weg zum Laden)
  wandRechteck(z, G.x + 20, G.y + 16, G.x + 38, G.y + 24); tuerUmschalten(z, G.x + 32, G.y + 24);
  const raum = () => { const a = aus(z)(); return a.liste[a.gruppe[G.x + 30 + (G.y + 20) * z.w]]; };
  typZuweisen(z, raum(), 'gottesdienst'); veranstaltungEinstellen(z, raum(), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 27, G.y + 17, G.x + 36, G.y + 17);
  moebelSetzen(z, 'gitarre', G.x + 35, G.y + 22, G.x + 35, G.y + 22);
  versetzen(z, z.personen[0], G.x + 30, G.y + 21); versetzen(z, p, G.x + 34, G.y + 22);
  assert.equal(terminEinstellen(z, raum(), 0, 1, 'abend'), 'ok');   // Dienstag abends
  const t = termineDerWoche(z, aus(z)(), 0).find(x => x.art === 'gottesdienst');
  z.minuten = TAG_MIN + 8 * 60;
  bis(z, TAG_MIN + 13 * 60);
  assert.ok(amFeld(z, p), 'vor dem Gottesdienst ist er beim Laden');
  const rueck = z.evangelisation.ma[p.id].rueck;
  bis(z, t.beginn - rueck - 1);
  assert.ok(amFeld(z, p), 'bleibt bis kurz vor dem Rückweg');
  bis(z, t.beginn - rueck + 1);
  assert.ok(!amFeld(z, p), 'bricht rechtzeitig auf');
  bis(z, t.beginn);
  assert.equal(evangelisationPosition(z, p), null, 'zum Beginn wieder an seinem Platz');
  bis(z, t.beginn + 30);
  assert.equal(z.evangelisation.ma[p.id], undefined, 'während des Gottesdienstes geht er nicht');
}

// Wirkung: Passant wird angesprochen → neugierig, nur zum Gottesdienst eingeladen
{
  const { z, eas } = spiel(1);
  level(eas[0], 3);
  z.minuten = TAG_MIN + 9 * 60;
  bis(z, TAG_MIN + 14 * 60);   // der Weg zum Laden dauert 3–4 Spielstunden
  assert.equal(vorOrt(z).length, 1);
  const r = aus(z)();
  z.ort.leute = [{ id: 'q1', vorname: 'Quirin', nachname: 'X', voll: 'Quirin X', zufriedenheit: 40, jugend: false },
    { id: 'q2', vorname: 'Rita', nachname: 'X', voll: 'Rita X', zufriedenheit: 40, jugend: false }];
  const [a, b] = z.ort.leute;
  assert.equal(ansprechen(z, r, a, () => 0.19), 'gottesdienst');      // Level 3 → 5 % + 15 % = 20 %
  assert.equal(a.neugierig, true); assert.equal(a.eingeladen, 'gottesdienst');
  assert.equal(ansprechen(z, r, b, () => 0.2), null);                  // 0,2 ≥ 20 % → nicht
  assert.equal(ansprechen(z, r, z.besucher[0], () => 0), null);        // Besucher werden nicht angesprochen
  // Kommt nur zum Gottesdienst, nicht zu anderen Veranstaltungen
  werKommt(z, () => 0.5, { art: 'senioren', keineNeuen: true });
  assert.equal(a.neugierig, true, 'bleibt neugierig für den Gottesdienst');
  assert.ok(werKommt(z, () => 0.5, { art: 'gottesdienst', keineNeuen: true }).includes(a));
  // Level 10 → 5 % + 50 % = 55 %
  level(eas[0], 10);
  const c = { id: 'q3', vorname: 'Sepp', nachname: 'X', voll: 'Sepp X', zufriedenheit: 40, jugend: false };
  z.ort.leute.push(c);
  assert.equal(ansprechen(z, r, c, () => 0.55), null);
  assert.equal(ansprechen(z, r, c, () => 0.549), 'gottesdienst');
  // Zähler: 4-mal vorbeigelaufen (Sepp zweimal, der Besucher zählt nicht), 2 angesprochen; ein Eingeladener ist gekommen
  const st = evangelisationInfo(z, r).statistik;
  assert.deepEqual(st.heute, { vorbei: 4, angesprochen: 2, gekommen: 1 });
  assert.deepEqual(st.dieseWoche, st.heute);
  z.minuten += TAG_MIN;                                                 // neuer Tag: „heute“ beginnt bei 0, die Woche zählt weiter
  const st2 = evangelisationInfo(z, r).statistik;
  assert.deepEqual(st2.heute, { vorbei: 0, angesprochen: 0, gekommen: 0 });
  assert.deepEqual(st2.dieseWoche, st.dieseWoche);
}

// Jugendliche Ehrenamtliche: nur Jugendliche, nur zum Jugendgottesdienst, nur wenn einer geplant ist
{
  const { z } = spiel(0);
  const j = personHinzufuegen(z, { name: 'Jana', kuerzel: 'J', art: 'ehrenamt', herkunft: { jugend: true } });
  versetzen(z, j, G.x + 2, G.y + G.h - 3); level(j, 5);
  z.minuten = TAG_MIN + 9 * 60;
  bis(z, TAG_MIN + 14 * 60);   // der Weg zum Laden dauert 3–4 Spielstunden
  assert.equal(vorOrt(z).length, 1, 'steht trotzdem dort');
  const r = aus(z)();
  const jung = { id: 'j1', vorname: 'Tim', nachname: 'X', voll: 'Tim X', zufriedenheit: 40, jugend: true };
  const alt = { id: 'j2', vorname: 'Ute', nachname: 'X', voll: 'Ute X', zufriedenheit: 40, jugend: false };
  z.ort.leute = [jung, alt];
  assert.equal(ansprechen(z, r, jung, () => 0), null, 'ohne Jugendgottesdienst lädt sie niemanden ein');
  assert.equal(evangelisationInfo(z, r).leute[0].laedtEin, false);
  // Jugendgottesdienst planen (braucht nur die Einstellung; ob er stattfinden kann, ist hier egal)
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  const raum = () => { const a = aus(z)(); return a.liste[a.gruppe[G.x + 5 + (G.y + 5) * z.w]]; };
  typZuweisen(z, raum(), 'gottesdienst'); veranstaltungEinstellen(z, raum(), 'jugend');
  const r2 = aus(z)();
  assert.equal(ansprechen(z, r2, alt, () => 0), null, 'Erwachsene spricht sie nicht an');
  assert.equal(ansprechen(z, r2, jung, () => 0.29), 'jugend');   // Level 5 → 5 % + 25 % = 30 %
  assert.equal(jung.eingeladen, 'jugend');
  werKommt(z, () => 0.5, { art: 'gottesdienst', keineNeuen: true });
  assert.ok(z.ort.leute.includes(jung), 'kommt nicht zum normalen Gottesdienst');
  assert.ok(werKommt(z, () => 0.7, { art: 'jugend', keineNeuen: true }).includes(jung), 'aber mit 75 % zum Jugendgottesdienst');
}

// Kirchkaffee-Ehrenamtlicher: während der Öffnung im Dienst, sonst frei; Zähler „Gerade frei“
{
  const { z, eas } = spiel(2);
  // wie in kirchkaffee.test.mjs: Gottesdienstraum mit Verbindungstür zum Kirchkaffee
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 10); tuerUmschalten(z, G.x + 2, G.y + 5);
  wandRechteck(z, G.x + 18, G.y + 2, G.x + 26, G.y + 10); tuerUmschalten(z, G.x + 18, G.y + 5);
  const bei = (x, y) => { const a = aus(z)(); return a.liste[a.gruppe[x + y * z.w]]; }, kk = () => bei(G.x + 20, G.y + 5);
  typZuweisen(z, bei(G.x + 5, G.y + 5), 'gottesdienst'); typZuweisen(z, kk(), 'kirchkaffee');
  moebelSetzen(z, 'kaffeemaschine', G.x + 20, G.y + 3, G.x + 20, G.y + 3);
  moebelSetzen(z, 'theke', G.x + 22, G.y + 3, G.x + 22, G.y + 3);
  z.moebel.find(m => m.art === 'kaffeemaschine').fuellung = 1e6;
  versetzen(z, eas[0], G.x + 25, G.y + 4);
  z.minuten = TAG_MIN + 9 * 60;
  assert.equal(freieEhrenamtliche(z, aus(z)()), 2);
  z.kaffeeZeiten = {};
  z.laeufe.push({ id: 'x', phase: 'kirchkaffee', beginn: z.minuten - 60, art: 'gottesdienst', raum: null });   // Kirchkaffee hat offen
  assert.equal(freieEhrenamtliche(z, aus(z)()), 1);
  evangelisationAktualisieren(z, aus(z)());
  assert.equal(z.evangelisation.ma[eas[0].id], undefined);
}

// Passanten am Laden: zusätzlich 1,5-mal so viele wie am Tor, auf dem Gehweg vor dem Laden
{
  const z = neuesSpiel(() => 0.5);
  z.minuten = TAG_MIN; z.ort.tag = 0;
  ortSchritt(z, () => 0.5).tun();
  const tor = z.ort.gaenge.filter(g => !g.laden).length, laden = z.ort.gaenge.filter(g => g.laden).length;
  assert.ok(tor >= ORT.passantenProTag[0]);
  assert.equal(laden, Math.round(tor * E.ladenPassanten));
  const g = z.ort.gaenge.find(x => x.laden);
  z.minuten = g.tor;
  const pos = passantenPositionen(z).find(x => x.id === g.id);
  assert.equal(pos.x, E.feld.x - 1); assert.ok(Math.abs(pos.y - E.feld.y) < 1e-6);
}

// Skill „Evangelisation“ (26.11. abends): Level 0 bringt schon 5 %, Erfahrung 1 pro Stunde vor Ort, 50 pro Level, höchstens 80 % zusammen
{
  const { z, eas } = spiel(2);
  z.minuten = TAG_MIN + 9 * 60;
  bis(z, TAG_MIN + 14 * 60);
  const r = aus(z)(), info = evangelisationInfo(z, r);
  assert.equal(info.leute.length, 2);
  assert.equal(info.chance, 10, 'zwei Anfänger: 5 % + 5 %');
  const vorher = eas.map(p => skillsVon(p).evangelisation);
  bis(z, TAG_MIN + 18 * 60);                                         // 4 Stunden später
  eas.forEach((p, i) => assert.ok(Math.abs(skillsVon(p).evangelisation - vorher[i] - 4) < 0.01, 'eine Erfahrung pro Stunde vor Ort'));
  bis(z, TAG_MIN + 22 * 60);                                         // um 20 Uhr Schluss: danach keine Erfahrung mehr
  const abends = eas.map(p => skillsVon(p).evangelisation);
  bis(z, TAG_MIN + 23 * 60);
  eas.forEach((p, i) => assert.equal(skillsVon(p).evangelisation, abends[i]));
  assert.equal(skillsVon(eas[0]).musik, 0, 'keine Musik-Erfahrung');
  // Höchstens 80 %: zwei mit Level 10 hätten 110 %
  const { z: z2, eas: e2 } = spiel(2);
  e2.forEach(p => level(p, 10));
  z2.minuten = TAG_MIN + 9 * 60;
  bis(z2, TAG_MIN + 14 * 60);
  const i2 = evangelisationInfo(z2, aus(z2)());
  assert.equal(i2.chance, 80); assert.equal(i2.gedeckelt, true);
  assert.equal(i2.leute[0].evangelisation.level, 10); assert.equal(i2.leute[0].evangelisation.stundenBisNaechstes, null);
}

console.log('Evangelisation-Tests bestanden.');
