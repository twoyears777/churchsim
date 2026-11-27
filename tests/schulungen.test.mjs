// Prüft die Schulungen für Ehrenamtliche (Spielprinzip von Lukas, 27.11.2026: claude/spielprinzip-schulungen.md):
// freigeschaltet über „Schulungen 1“, Stufe 2 über „Schulungen 2“; nur ohne Schicht im Dienstplan; kostet Geld (+ Heiligkeit);
// weg für die Dauer (keine Schicht, kein Gottesdienstbesuch); Wirkung am Ende (+1 Level bzw. +1 Schicht und Musik +1);
// Stufen der Reihe nach; Abbrechen = Bezahltes weg, keine Wirkung; wird gespeichert.
// Starten mit: node tests/schulungen.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { SCHULUNGEN } from '../src/inhalte/schulungen.js';
import { FORSCHUNGEN } from '../src/inhalte/forschung.js';
import { MUSIK } from '../src/inhalte/moebel.js';
import { EVANGELISATION } from '../src/inhalte/evangelisation.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel } from './hilfen/ohne-erster.mjs';
import { zeitVorruecken, veranstaltungEinstellen } from '../src/kern/ablauf.js';
import { moebelSetzen, moebelKaufen } from '../src/kern/moebel.js';
import { versetzen, personHinzufuegen } from '../src/kern/personen.js';
import { dienstTermine, stelleSetzen, schichtenMax, besuchendeEhrenamtliche } from '../src/kern/dienst.js';
import { schulungStarten, schulungAbbrechen, schulungSchritt, schulungenInfo, schulungZustand } from '../src/kern/schulungen.js';
import { musikLevel, evangelisationLevel, skillsVon } from '../src/kern/skills.js';
import { TAG_MIN } from '../src/kern/zeit.js';

// Zahlen von Lukas (27.11.)
const K = id => SCHULUNGEN.find(s => s.id === id);
assert.deepEqual(SCHULUNGEN.map(s => s.id), ['musik', 'evangelisation', 'worship']);
assert.equal(K('worship').name, 'Intensive Worshipkonferenz in den USA');
assert.deepEqual(K('musik').stufen.map(s => [s.kosten.geld, s.kosten.heiligkeit, s.tage]), [[160, 0, 7], [480, 0, 7]]);
assert.deepEqual(K('evangelisation').stufen.map(s => [s.kosten.geld, s.kosten.heiligkeit, s.tage]), [[120, 60, 7], [360, 180, 7]]);
assert.deepEqual(K('worship').stufen.map(s => [s.kosten.geld, s.kosten.heiligkeit, s.tage]), [[600, 200, 14], [1800, 600, 14]]);
assert.deepEqual(K('worship').wirkung, { skill: 'musik', level: 1, schichten: 1 });
const S2 = FORSCHUNGEN.find(f => f.id === 'schulungen2');
assert.deepEqual([S2.kosten.geld, S2.kosten.heiligkeit, S2.dauer, S2.braucht], [500, 300, 180, ['schulungen1']]);

function gemeinde() {
  const z = neuesSpiel(() => 0.9);
  z.schichtbetrieb = true; z.ortRuhig = true;
  const aus = () => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
  const raumBei = (x, y) => { const a = aus(); return a.liste[a.gruppe[x + y * z.w]]; };
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 10); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst');
  veranstaltungEinstellen(z, raumBei(G.x + 5, G.y + 5), 'gottesdienst');
  for (let i = 0; i < 6; i++) moebelSetzen(z, 'stuhl', G.x + 6 + i, G.y + 7, G.x + 6 + i, G.y + 7);
  z.konto = 10000; z.heiligkeit = 5000;
  assert.equal(moebelKaufen(z, 'gitarre', G.x + 10, G.y + 3), 'ok');
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  const ea = personHinzufuegen(z, { name: 'Helfer 1', kuerzel: 'H', art: 'ehrenamt' });
  const gd = dienstTermine(z, aus()).find(t => t.art === 'veranstaltung');
  return { z, aus, ea, gd };
}
const bis = (z, aus, minute) => { while (z.minuten < minute) zeitVorruecken(z, aus(), Math.min(60, minute - z.minuten), () => 0.5); };

// Ohne Forschung gesperrt; mit Schicht gesperrt; Hauptamtliche nicht
{
  const { z, aus, ea, gd } = gemeinde();
  assert.equal(schulungenInfo(z, aus(), ea.id).freigeschaltet, false);
  assert.equal(schulungStarten(z, aus(), ea.id, 'musik'), 'forschung');
  z.forschung.fertig.push('schulungen1');
  assert.equal(schulungenInfo(z, aus(), ea.id).freigeschaltet, true);
  assert.equal(stelleSetzen(z, aus(), gd.key, 'musik0', ea.id), 'ok');
  assert.equal(schulungStarten(z, aus(), ea.id, 'musik'), 'schichten');
  assert.equal(stelleSetzen(z, aus(), gd.key, 'musik0', null), 'ok');
  assert.equal(schulungStarten(z, aus(), z.personen[0].id, 'musik'), 'person');
  assert.equal(schulungenInfo(z, aus(), z.personen[0].id), null);
  assert.equal(schulungStarten(z, aus(), ea.id, 'gibtsnicht'), 'keine');
  z.konto = 100;
  assert.equal(schulungStarten(z, aus(), ea.id, 'musik'), 'geld');
  z.konto = 10000; z.heiligkeit = 10;
  assert.equal(schulungStarten(z, aus(), ea.id, 'evangelisation'), 'heiligkeit');
  z.konto = 50;
  assert.equal(schulungStarten(z, aus(), ea.id, 'evangelisation'), 'beides');
}

// Musik-Kurs: bezahlen, 1 Woche weg, danach Musik +1 Level (Fortschritt bleibt), Stufe 2 erst mit „Schulungen 2“
{
  const { z, aus, ea, gd } = gemeinde();
  z.forschung.fertig.push('schulungen1');
  skillsVon(ea).musik = 30;   // angefangenes Level 0
  const konto = z.konto, heilig = z.heiligkeit, start = z.minuten;
  assert.equal(schulungStarten(z, aus(), ea.id, 'musik'), 'ok');
  assert.equal(z.konto, konto - 160);
  assert.equal(z.heiligkeit, heilig);
  assert.equal(schulungStarten(z, aus(), ea.id, 'evangelisation'), 'weg');
  assert.equal(stelleSetzen(z, aus(), gd.key, 'musik0', ea.id), 'schulung');
  // Gottesdienstbesuch sonntagvormittags: nicht, solange er weg ist
  assert.deepEqual(besuchendeEhrenamtliche(z, aus(), { plan: { tag: 6, slot: 'vormittag' }, beginn: 6 * TAG_MIN + 600, art: 'gottesdienst' },
    { typ: { id: 'gottesdienst' } }, () => 0).some(x => x.id === ea.id), false);
  assert.equal(schulungSchritt(z).zeit, start + 7 * TAG_MIN);
  const info = schulungenInfo(z, aus(), ea.id);
  assert.equal(info.laeuft.id, 'musik'); assert.equal(info.laeuft.stufe, 1);
  bis(z, aus, start + 7 * TAG_MIN - 1);
  assert.ok(ea.schulung, 'noch unterwegs');
  assert.equal(musikLevel(ea), 0);
  bis(z, aus, start + 7 * TAG_MIN + 1);
  assert.equal(ea.schulung, undefined);
  assert.equal(musikLevel(ea), 1);
  assert.equal(skillsVon(ea).musik, 30 + MUSIK.erfahrungProLevel);
  assert.equal(ea.schulungen.musik, 1);
  const k = schulungenInfo(z, aus(), ea.id).liste.find(x => x.id === 'musik');
  assert.equal(k.stufe, 2); assert.equal(k.zustand, 'forschung');
  z.forschung.fertig.push('schulungen2');
  assert.equal(schulungStarten(z, aus(), ea.id, 'musik'), 'ok');
  assert.equal(z.konto, konto - 160 - 480);
  bis(z, aus, z.minuten + 7 * TAG_MIN + 1);
  assert.equal(musikLevel(ea), 2);
  assert.equal(schulungStarten(z, aus(), ea.id, 'musik'), 'alle');
  // Danach wieder einteilbar
  assert.equal(stelleSetzen(z, aus(), gd.key, 'musik0', ea.id), 'ok');
}

// Evangelisations-Kurs: Geld + Heiligkeit, Evangelisation +1; Stufe 2 nur nach Stufe 1 (auch mit „Schulungen 2“)
{
  const { z, aus, ea } = gemeinde();
  z.forschung.fertig.push('schulungen1', 'schulungen2');
  const info = schulungenInfo(z, aus(), ea.id).liste.find(x => x.id === 'evangelisation');
  assert.equal(info.stufe, 1); assert.deepEqual(info.kosten, { geld: 120, heiligkeit: 60 });
  const h = z.heiligkeit;
  assert.equal(schulungStarten(z, aus(), ea.id, 'evangelisation'), 'ok');
  assert.equal(z.heiligkeit, h - 60);
  bis(z, aus, z.minuten + 7 * TAG_MIN + 1);
  assert.equal(evangelisationLevel(ea), 1);
  assert.equal(skillsVon(ea).evangelisation, EVANGELISATION.skill.erfahrungProLevel);
}

// Worshipkonferenz: 2 Wochen, danach +1 Schicht pro Woche und Musik +1
{
  const { z, aus, ea } = gemeinde();
  z.forschung.fertig.push('schulungen1');
  assert.equal(schichtenMax(ea), 3);
  const start = z.minuten;
  assert.equal(schulungStarten(z, aus(), ea.id, 'worship'), 'ok');
  assert.equal(schulungSchritt(z).zeit, start + 14 * TAG_MIN);
  bis(z, aus, start + 14 * TAG_MIN + 1);
  assert.equal(schichtenMax(ea), 4);
  assert.equal(musikLevel(ea), 1);
}

// Abbrechen: Bezahltes weg, keine Wirkung, Stufe zählt nicht; Musik auf Level 10 → Musik-Kurs geht nicht, Worshipkonferenz schon
{
  const { z, aus, ea } = gemeinde();
  z.forschung.fertig.push('schulungen1');
  const konto = z.konto;
  assert.equal(schulungStarten(z, aus(), ea.id, 'musik'), 'ok');
  assert.equal(schulungAbbrechen(z, ea.id), 'ok');
  assert.equal(schulungAbbrechen(z, ea.id), 'keine');
  assert.equal(z.konto, konto - 160);
  assert.equal(musikLevel(ea), 0);
  assert.equal(schulungSchritt(z), null);
  assert.equal(schulungenInfo(z, aus(), ea.id).liste.find(x => x.id === 'musik').stufe, 1);
  skillsVon(ea).musik = MUSIK.maxLevel * MUSIK.erfahrungProLevel;
  assert.equal(schulungZustand(z, aus(), ea, K('musik')), 'max');
  assert.equal(schulungZustand(z, aus(), ea, K('worship')), 'bereit');
  // Ohne Dienstplan keine Schulung
  z.schichtbetrieb = false;
  assert.equal(schulungZustand(z, aus(), ea, K('worship')), 'schichtbetrieb');
}

// Speichern: laufende Schulung übersteht JSON
{
  const { z, aus, ea } = gemeinde();
  z.forschung.fertig.push('schulungen1');
  assert.equal(schulungStarten(z, aus(), ea.id, 'musik'), 'ok');
  const z2 = JSON.parse(JSON.stringify(z));
  const p2 = z2.personen.find(p => p.id === ea.id);
  assert.equal(p2.schulung.id, 'musik');
  assert.equal(schulungSchritt(z2).zeit, ea.schulung.ende);
}

console.log('Schulungen: alles in Ordnung');
